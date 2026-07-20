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

# ---- 1. PostDetail.jsx : refetch on focus/visibility only, NO polling ----
pd_path = "frontend/src/pages/PostDetail.jsx"

pd_old = """  const postRefs = useRef({});

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      if (passedPosts && passedPosts.length > 0) {
        // We already have all posts from profile — use them directly
        setPosts(passedPosts);
      } else {
        // Fallback: fetch single post (direct URL access / share link)
        const res = await client.get(`/posts/${id}`);
        if (res.data.success) {
          // Try to get more posts from the same author for a feed experience
          const authorId = res.data.data.author?._id;
          if (authorId) {
            try {
              const feedRes = await client.get(`/posts?author=${authorId}`);
              if (feedRes.data.success && feedRes.data.data.length > 0) {
                setPosts(feedRes.data.data);
              } else {
                setPosts([res.data.data]);
              }
            } catch {
              setPosts([res.data.data]);
            }
          } else {
            setPosts([res.data.data]);
          }
        } else {
          throw new Error('Post not found');
        }
      }
    } catch (err) {
      console.error(err);
      setError('The post you are looking for does not exist or has been deleted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [id]);

"""

pd_new = """  const postRefs = useRef({});
  const postsRef = useRef(posts);
  postsRef.current = posts;

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      if (passedPosts && passedPosts.length > 0) {
        // We already have all posts from profile — use them directly
        setPosts(passedPosts);
      } else {
        // Fallback: fetch single post (direct URL access / share link)
        const res = await client.get(`/posts/${id}`);
        if (res.data.success) {
          // Try to get more posts from the same author for a feed experience
          const authorId = res.data.data.author?._id;
          if (authorId) {
            try {
              const feedRes = await client.get(`/posts?author=${authorId}`);
              if (feedRes.data.success && feedRes.data.data.length > 0) {
                setPosts(feedRes.data.data);
              } else {
                setPosts([res.data.data]);
              }
            } catch {
              setPosts([res.data.data]);
            }
          } else {
            setPosts([res.data.data]);
          }
        } else {
          throw new Error('Post not found');
        }
      }
    } catch (err) {
      console.error(err);
      setError('The post you are looking for does not exist or has been deleted.');
    } finally {
      setLoading(false);
    }
  };

  // Silent refresh: updates likes/dislikes/comments/views without showing
  // the loading spinner or disturbing scroll position. No polling loop —
  // this only fires when the user actually comes back to the tab/page,
  // so it adds no continuous server load.
  const silentRefresh = async () => {
    const currentPosts = postsRef.current;
    if (!currentPosts || currentPosts.length === 0) return;
    try {
      const authorId = currentPosts[0]?.author?._id;
      if (authorId) {
        const feedRes = await client.get(`/posts?author=${authorId}`);
        if (feedRes.data.success && feedRes.data.data.length > 0) {
          setPosts(feedRes.data.data);
          return;
        }
      }
      const res = await client.get(`/posts/${id}`);
      if (res.data.success) {
        setPosts((prev) =>
          prev.map((p) => (p._id === res.data.data._id ? res.data.data : p))
        );
      }
    } catch (err) {
      // Silent fail — keep showing last known data
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [id]);

  // No setInterval / polling here on purpose (avoids extra load with many
  // concurrent users). Instead, refetch only when the user returns to this
  // tab/app — a single lightweight request per return, not a background loop.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', silentRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', silentRefresh);
    };
  }, [id]);

"""

patch(pd_path, pd_old, pd_new, "PostDetail.jsx refetch-on-return")

# ---- 2. Notifications.jsx : refetch on focus/visibility only, NO polling ----
nf_path = "frontend/src/pages/Notifications.jsx"

nf_old = """  useEffect(() => {
    loadNotificationsData();
  }, []);

"""

nf_new = """  useEffect(() => {
    loadNotificationsData();
  }, []);

  // No setInterval / polling loop here on purpose (avoids extra server load
  // with many concurrent users). Refetch only fires when the user actually
  // returns to this tab/page — one lightweight request per return.
  useEffect(() => {
    const silentPoll = async () => {
      const data = await fetchNotifications(1);
      if (data && data.notifications) {
        await syncFollowMap(data.notifications);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') silentPoll();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', silentPoll);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', silentPoll);
    };
  }, [fetchNotifications, syncFollowMap]);

"""

patch(nf_path, nf_old, nf_new, "Notifications.jsx refetch-on-return")

print("\nAll patches applied successfully.")
