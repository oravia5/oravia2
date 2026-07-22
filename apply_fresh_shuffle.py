import sys

def patch(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if new in content:
        print(f"[skip] {label} already applied")
        return
    if old not in content:
        print(f"[FAIL] {label} - pattern not found, check file manually")
        sys.exit(1)
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[ok] {label}")

old_backend = """export const getReels = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const { cursor } = req.query;

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

    if (cursor) {
      query.randomOrder = { $gt: parseFloat(cursor) };
    }

    const reels = await Post.find(query)
      .sort({ randomOrder: 1 })
      .limit(limit + 1)
      .populate('author', '_id username displayName avatarUrl');

    const hasNextPage = reels.length > limit;
    if (hasNextPage) {
      reels.pop();
    }

    const nextCursor = hasNextPage && reels.length > 0 ? reels[reels.length - 1].randomOrder : null;

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
};"""

new_backend = """export const getReels = async (req, res) => {
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
};"""

patch("backend/controllers/reels.controller.js", old_backend, new_backend, "backend seed-based shuffle")

fr_path = "frontend/src/pages/Reels.jsx"

patch(
    fr_path,
    """  const containerRef = useRef(null);
  const scrollRaf = useRef(null);

  const fetchReels = async () => {
    try {
      const res = await client.get('/reels?limit=5');""",
    """  const containerRef = useRef(null);
  const scrollRaf = useRef(null);
  const seedRef = useRef(Math.random().toString(36).slice(2));

  const fetchReels = async () => {
    try {
      const res = await client.get(`/reels?limit=5&seed=${seedRef.current}`);""",
    "frontend seed on initial fetch"
)

patch(
    fr_path,
    "      const res = await client.get(`/reels?limit=5&cursor=${encodeURIComponent(nextCursor)}`);",
    "      const res = await client.get(`/reels?limit=5&seed=${seedRef.current}&cursor=${encodeURIComponent(nextCursor)}`);",
    "frontend seed on load-more"
)

print("\nAll patches applied successfully.")
