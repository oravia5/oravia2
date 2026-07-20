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
    "frontend/src/pages/Profile.jsx",
    """  useEffect(() => {
    setIsBlockedByThem(false);
    fetchProfileData({ showLoader: true });
    setSelectedAlbum(null);
  }, [username, targetUsername]);""",
    """  useEffect(() => {
    setIsBlockedByThem(false);
    fetchProfileData({ showLoader: true });
    setSelectedAlbum(null);
  }, [username, targetUsername]);

  // No setInterval / polling here (avoids extra server load with many
  // concurrent users). Refetch only fires when the user actually returns
  // to this profile tab/page — e.g. after navigating away and back, or
  // switching apps — so things like Follow/Following state stay accurate
  // without needing a manual reload.
  useEffect(() => {
    const silentRefresh = () => {
      fetchProfileData({ showLoader: false });
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') silentRefresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', silentRefresh);
    window.addEventListener('pageshow', silentRefresh);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', silentRefresh);
      window.removeEventListener('pageshow', silentRefresh);
    };
  }, [targetUsername]);""",
    "Profile.jsx refetch on return"
)

print("\nAll patches applied successfully.")
