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

# 1. Post model - add randomOrder field
patch(
    "backend/models/Post.js",
    """    isReal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Post', postSchema);""",
    """    isReal: {
      type: Boolean,
      default: false,
    },
    // A fixed random number assigned once at creation. Sorting by this
    // instead of createdAt gives a shuffled feed order that stays stable
    // across pagination (no duplicates/skips while scrolling).
    randomOrder: {
      type: Number,
      default: () => Math.random(),
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Post', postSchema);""",
    "Post.js randomOrder field"
)

# 2. reels.controller.js - sort/cursor by randomOrder
patch(
    "backend/controllers/reels.controller.js",
    """    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const reels = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('author', '_id username displayName avatarUrl');""",
    """    if (cursor) {
      query.randomOrder = { $gt: parseFloat(cursor) };
    }

    const reels = await Post.find(query)
      .sort({ randomOrder: 1 })
      .limit(limit + 1)
      .populate('author', '_id username displayName avatarUrl');""",
    "reels.controller.js sort by randomOrder"
)

patch(
    "backend/controllers/reels.controller.js",
    "const nextCursor = hasNextPage && reels.length > 0 ? reels[reels.length - 1].createdAt : null;",
    "const nextCursor = hasNextPage && reels.length > 0 ? reels[reels.length - 1].randomOrder : null;",
    "reels.controller.js nextCursor field"
)

print("\nAll patches applied successfully.")
