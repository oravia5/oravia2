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

old_block = """    if (citySearch) {
      const query = {
        isArchived: { $ne: true },
        status: { $ne: 'draft' },
        location: { $regex: citySearch, $options: 'i' },
      };
      if (allBlockedIds.length > 0) {
        query.author = { $nin: allBlockedIds };
      }
      if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
      }

      posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('author', '_id username displayName avatarUrl');

      hasNextPage = posts.length > limit;
      if (hasNextPage) {
        posts.pop();
      }
      nextCursor = hasNextPage && posts.length > 0 ? posts[posts.length - 1].createdAt : null;
    }"""

new_block = """    if (citySearch) {
      // Find all users whose PROFILE location matches the current user's
      // city (this is the actual "Near You" logic — same city profile,
      // regardless of whether individual posts have a location tag).
      const matchingUsers = await User.find(
        { location: { $regex: citySearch, $options: 'i' } },
        '_id'
      );
      const matchingAuthorIds = matchingUsers.map((u) => u._id.toString());

      const query = {
        isArchived: { $ne: true },
        status: { $ne: 'draft' },
        author: { $in: matchingAuthorIds },
      };
      if (allBlockedIds.length > 0) {
        query.author.$nin = allBlockedIds;
      }
      if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
      }

      posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('author', '_id username displayName avatarUrl');

      hasNextPage = posts.length > limit;
      if (hasNextPage) {
        posts.pop();
      }
      nextCursor = hasNextPage && posts.length > 0 ? posts[posts.length - 1].createdAt : null;
    }"""

patch("backend/controllers/posts.controller.js", old_block, new_block, "Near You - match by author profile location")

print("\nAll patches applied successfully.")
