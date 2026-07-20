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

old_code = """export const followUser = async (req, res) => {
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

new_code = """export const followUser = async (req, res) => {
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

patch("backend/controllers/users.controller.js", old_code, new_code, "followUser debug logging")

print("\nAll patches applied successfully.")
