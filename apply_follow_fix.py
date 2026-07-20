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
    "frontend/public/sw.js",
    "  // Strategy B: Static Assets & Media (Cache First, Stale-While-Revalidate)",
    """  // Any other /api/ request (users, follow/unfollow, notifications, comments,
  // messages, etc.) is dynamic/personalized data. Never cache-first these —
  // that was causing stale data (e.g. Follow button needing two clicks
  // because the refetch after following was served from a stale cache).
  // Let the browser handle these directly, network-only.
  if (requestUrl.pathname.includes('/api/')) {
    return;
  }

  // Strategy B: Static Assets & Media (Cache First, Stale-While-Revalidate)""",
    "sw.js bypass cache for all /api/ requests"
)

patch(
    "frontend/src/components/ProfileHeader/ProfileHeader.jsx",
    """  const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
  const [followerCount, setFollowerCount] = useState(profile.followerCount || 0);""",
    """  const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
  const [followerCount, setFollowerCount] = useState(profile.followerCount || 0);
  const [followLoading, setFollowLoading] = useState(false);""",
    "followLoading state"
)

patch(
    "frontend/src/components/ProfileHeader/ProfileHeader.jsx",
    """  const handleFollowToggle = async () => {
    const wasFollowing = isFollowing;""",
    """  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;""",
    "guard against concurrent follow clicks"
)

patch(
    "frontend/src/components/ProfileHeader/ProfileHeader.jsx",
    """      const msg = err.response?.data?.message || err.message;
      if (refetchProfile) await refetchProfile();
      if (msg !== 'You are already following this user' && msg !== 'You are not following this user') {
        alert(msg);
      }
    }
  };""",
    """      const msg = err.response?.data?.message || err.message;
      if (refetchProfile) await refetchProfile();
      if (msg !== 'You are already following this user' && msg !== 'You are not following this user') {
        alert(msg);
      }
    } finally {
      setFollowLoading(false);
    }
  };""",
    "release followLoading guard"
)

patch(
    "frontend/src/components/ProfileHeader/ProfileHeader.jsx",
    """                    <button 
                      className={`follow-btn ${isFollowing ? 'following-active' : 'follow-inactive'}`} 
                      onClick={handleFollowToggle}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>""",
    """                    <button 
                      className={`follow-btn ${isFollowing ? 'following-active' : 'follow-inactive'}`} 
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      style={followLoading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>""",
    "disable button while pending"
)

print("\nAll patches applied successfully.")
