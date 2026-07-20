import re, sys

path = "frontend/src/pages/Notifications.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'previewSrc' in content:
    print("[skip] thumbnail block already applied")
    sys.exit(0)

pattern = re.compile(
    r'\{n\.post\?\.mediaUrl && \(.*?getFullMediaUrl\(n\.post\.mediaUrl\).*?</div>\s*\)\}',
    re.DOTALL
)

new_block = """{n.post?.mediaUrl && (() => {
                    const previewSrc = n.post.type === 'photo'
                      ? n.post.mediaUrl
                      : (n.post.thumbnailUrl || null);

                    if (!previewSrc) return null;

                    return (
                      <div
                        className="post-preview-thumbnail"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${n.post._id || n.post}`);
                        }}
                      >
                        <img src={getFullMediaUrl(previewSrc)} alt="Post preview" />
                      </div>
                    );
                  })()}"""

new_content, count = pattern.subn(new_block, content, count=1)

if count == 0:
    print("[FAIL] regex pattern still not found - need to see the actual file content")
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("[ok] thumbnail block patched via regex")
