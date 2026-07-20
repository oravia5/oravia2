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

path = "frontend/src/pages/HashtagFeed.jsx"

patch(
    path,
    """  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const fetchTagPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/posts/tag/${tag}`);
      if (res.data.success) {
        setPosts(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load posts with this hashtag.');
    } finally {
      setLoading(false);
    }
  };""",
    """  const [posts, setPosts] = useState([]);
  const [circleImage, setCircleImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const fetchTagPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get(`/posts/tag/${tag}`);
      if (res.data.success) {
        setPosts(res.data.data);

        // Pick a random post's image for the header circle — changes on
        // every visit. Photos use mediaUrl directly; videos/reels use their
        // thumbnailUrl (mediaUrl there is a video file, not an image).
        const candidates = res.data.data
          .map((p) => (p.type === 'photo' ? p.mediaUrl : p.thumbnailUrl))
          .filter(Boolean);
        setCircleImage(
          candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : null
        );
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load posts with this hashtag.');
    } finally {
      setLoading(false);
    }
  };""",
    "circleImage state + random pick"
)

patch(
    path,
    '              <div className="tag-icon-circle">#</div>',
    """              <div className="tag-icon-circle">
                {circleImage ? (
                  <img
                    src={getFullMediaUrl(circleImage)}
                    alt={`#${tag}`}
                    className="tag-icon-circle-img"
                  />
                ) : (
                  '#'
                )}
              </div>""",
    "circle renders random image"
)

patch(
    path,
    """        .tag-icon-circle {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          font-size: 28px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-indigo);
          box-shadow: 0 8px 24px rgba(255, 143, 0, 0.15);
        }""",
    """        .tag-icon-circle {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          font-size: 28px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-indigo);
          box-shadow: 0 8px 24px rgba(255, 143, 0, 0.15);
          overflow: hidden;
        }

        .tag-icon-circle-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }""",
    "circle image CSS"
)

print("\nAll patches applied successfully.")
