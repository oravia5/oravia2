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

path = "frontend/src/components/PostCard/PostCard.jsx"

# 1. preserve line breaks in caption CSS
patch(
    path,
    """        .post-caption {
          font-size: 14px;
          margin-bottom: 6px;
        }""",
    """        .post-caption {
          font-size: 14px;
          margin-bottom: 6px;
          white-space: pre-wrap;
          word-break: break-word;
        }""",
    "post-caption CSS line-break fix"
)

# 2. add expandedCaption state
patch(
    path,
    "  const [currentCaption, setCurrentCaption] = useState(post.caption || '');",
    "  const [currentCaption, setCurrentCaption] = useState(post.caption || '');\n  const [expandedCaption, setExpandedCaption] = useState(false);",
    "expandedCaption state"
)

# 3. See more / See less toggle
patch(
    path,
    """        {currentCaption && (
          <p className="post-caption">
            <Link to={`/profile/${post.author?.username}`} className="caption-username">
              {post.author?.username}
            </Link>{' '}
            {parseCaptionText(currentCaption)}
          </p>
        )}""",
    """        {currentCaption && (() => {
          const CAPTION_LIMIT = 200;
          const isLongCaption = currentCaption.length > CAPTION_LIMIT;
          const displayCaption = isLongCaption && !expandedCaption
            ? currentCaption.slice(0, CAPTION_LIMIT).trimEnd()
            : currentCaption;

          return (
            <p className="post-caption">
              <Link to={`/profile/${post.author?.username}`} className="caption-username">
                {post.author?.username}
              </Link>{' '}
              {parseCaptionText(displayCaption)}
              {isLongCaption && !expandedCaption && '... '}
              {isLongCaption && (
                <span
                  onClick={() => setExpandedCaption(!expandedCaption)}
                  style={{ color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  {expandedCaption ? ' Show less' : 'See more'}
                </span>
              )}
            </p>
          );
        })()}""",
    "See more / See less toggle"
)

print("\nAll patches applied successfully.")
