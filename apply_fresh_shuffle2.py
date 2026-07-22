import re

# ---- 1. Backend: replace the whole getReels function between markers ----
path = "backend/controllers/reels.controller.js"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'const { cursor, seed } = req.query' in content:
    print("[skip] backend already has seed support")
else:
    start_marker = "export const getReels = async (req, res) => {"
    end_marker = "export const createReel = async (req, res) => {"

    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)

    if start_idx == -1 or end_idx == -1:
        print("[FAIL] could not find getReels/createReel markers in file")
    else:
        new_function = """export const getReels = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const { cursor, seed } = req.query;

    let query = {
      type: 'reel',
      isArchived: { $ne: true },
      status: { $ne: 'draft' },
    };

    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      if (currentUser) {
        const blockedUsers = currentUser.blockedUsers || [];
        const usersWhoBlockedMeRes = await User.find({ blockedUsers: currentUser._id }, '_id');
        const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
        const allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];
        query.author = { $nin: allBlockedIds };
      }
    }

    let reels;
    let hasNextPage;
    let nextCursor;

    if (seed) {
      const hashOf = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }
        return hash;
      };

      const allReels = await Post.find(query).populate(
        'author',
        '_id username displayName avatarUrl'
      );

      allReels.forEach((r) => {
        r._sortKey = hashOf(seed + r._id.toString());
      });
      allReels.sort((a, b) => a._sortKey - b._sortKey);

      const offset = cursor ? parseInt(cursor, 10) || 0 : 0;
      reels = allReels.slice(offset, offset + limit + 1);

      hasNextPage = reels.length > limit;
      if (hasNextPage) {
        reels.pop();
      }
      nextCursor = hasNextPage ? (offset + limit).toString() : null;
    } else {
      if (cursor) {
        query.randomOrder = { $gt: parseFloat(cursor) };
      }

      reels = await Post.find(query)
        .sort({ randomOrder: 1 })
        .limit(limit + 1)
        .populate('author', '_id username displayName avatarUrl');

      hasNextPage = reels.length > limit;
      if (hasNextPage) {
        reels.pop();
      }
      nextCursor = hasNextPage && reels.length > 0 ? reels[reels.length - 1].randomOrder : null;
    }

    res.json({
      success: true,
      data: reels,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reels',
    });
  }
};

"""
        new_content = content[:start_idx] + new_function + content[end_idx:]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("[ok] backend getReels replaced with seed-based version")

# ---- 2. Frontend: add seedRef and use it in both fetch calls ----
fr_path = "frontend/src/pages/Reels.jsx"
with open(fr_path, 'r', encoding='utf-8') as f:
    fr = f.read()

if 'seedRef' in fr:
    print("[skip] frontend already has seedRef")
else:
    # add seedRef right after containerRef/scrollRaf declarations
    fr = fr.replace(
        "const scrollRaf = useRef(null);",
        "const scrollRaf = useRef(null);\n  const seedRef = useRef(Math.random().toString(36).slice(2));",
        1
    )
    # update initial fetch call
    fr = re.sub(
        r"client\.get\('/reels\?limit=5'\)",
        "client.get(`/reels?limit=5&seed=${seedRef.current}`)",
        fr,
        count=1
    )
    # update load-more fetch call
    fr = re.sub(
        r"client\.get\(`/reels\?limit=5&cursor=\$\{encodeURIComponent\(nextCursor\)\}`\)",
        "client.get(`/reels?limit=5&seed=${seedRef.current}&cursor=${encodeURIComponent(nextCursor)}`)",
        fr,
        count=1
    )
    with open(fr_path, 'w', encoding='utf-8') as f:
        f.write(fr)
    print("[ok] frontend seedRef added and used in both fetch calls")

print("\nDone.")
