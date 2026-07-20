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

fh_path = "frontend/src/components/ProfileHeader/ProfileHeader.jsx"

# 1. Only re-sync on actual profile change (by _id), not every mutation
patch(
    fh_path,
    """  // Sync local state when profile data changes (e.g., after refetch)
  useEffect(() => {
    setIsFollowing(profile.isFollowing || false);
    setFollowerCount(profile.followerCount || 0);
  }, [profile]);""",
    """  // Sync local state ONLY when we're now looking at a different profile
  // (not on every profile object mutation). Previously this re-ran on
  // every profile update — including the one triggered by our own follow
  // click — which could race with the click and snap the button back to
  // "Follow" even though the follow had already succeeded.
  useEffect(() => {
    setIsFollowing(profile.isFollowing || false);
    setFollowerCount(profile.followerCount || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile._id]);""",
    "sync only on profile identity change"
)

# 2. remove refetch after successful follow (redundant + reduces load)
patch(
    fh_path,
    """      await client.post(endpoint);
      if (refetchProfile) await refetchProfile();
    } catch (err) {""",
    """      await client.post(endpoint);
    } catch (err) {""",
    "remove refetch after successful follow"
)

# 3. remove backend debug logging now that root cause is confirmed
users_path = "backend/controllers/users.controller.js"

old_debug = """export const followUser = async (req, res) => {
  console.log('[FOLLOW DEBUG] Request received. targetUserId:', req.params.id, 'currentUser:', req.user?._id);
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself',
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      console.log('[FOLLOW DEBUG] User not found. targetUser:', !!targetUser, 'currentUser:', !!currentUser);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already following
    if (currentUser.following.some((id) => id.toString() === targetUserId)) {
      console.log('[FOLLOW DEBUG] Already following - returning 400');
      return res.status(400).json({
        success: false,
        message: 'You are already following this user',
      });
    }

    // Add to following/followers lists
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();
    console.log('[FOLLOW DEBUG] Saved successfully. Creating notification...');

    await createNotification({
      recipient: targetUserId,
      actor: currentUserId,
      type: 'follow',
    });

    console.log('[FOLLOW DEBUG] Notification created. Sending success response.');
    res.json({
      success: true,
      message: 'Successfully followed user',
    });
  } catch (error) {
    console.error('[FOLLOW DEBUG] FOLLOW ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while following user',
    });
  }
};"""

new_clean = """export const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself',
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already following
    if (currentUser.following.some((id) => id.toString() === targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user',
      });
    }

    // Add to following/followers lists
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    await createNotification({
      recipient: targetUserId,
      actor: currentUserId,
      type: 'follow',
    });

    res.json({
      success: true,
      message: 'Successfully followed user',
    });
  } catch (error) {
    console.error('FOLLOW ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while following user',
    });
  }
};"""

patch(users_path, old_debug, new_clean, "remove debug logging")

print("\nAll patches applied successfully.")
