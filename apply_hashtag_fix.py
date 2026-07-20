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

patch(
    "frontend/src/pages/HashtagFeed.jsx",
    "                    onClick={() => navigate(`/post/${post._id}`)}",
    "                    onClick={() => navigate(`/post/${post._id}`, { state: { posts, scrollToId: post._id } })}",
    "HashtagFeed.jsx pass tag-filtered posts"
)

patch(
    "frontend/src/pages/LocationFeed.jsx",
    "                    onClick={() => navigate(`/post/${post._id}`)}",
    "                    onClick={() => navigate(`/post/${post._id}`, { state: { posts, scrollToId: post._id } })}",
    "LocationFeed.jsx pass location-filtered posts"
)

print("\nAll patches applied successfully.")
