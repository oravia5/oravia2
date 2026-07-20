import User from '../models/User.js';
import Post from '../models/Post.js';
import StorageService from '../services/storage.service.js';
import { upsertLocation } from './locations.controller.js';
import { createNotification, deleteFollowNotification } from '../services/notification.service.js';

// Helper to escape special regex characters from user input
const escapeRegex = (string) => {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * @desc    Get public profile data by username
 * @route   GET /api/users/:username
 * @access  Public (optional auth for following status)
 */
export const getUserProfile = async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    let dbQuery = User.findOne({ username });
    if (req.user && req.user.username.toLowerCase() === username) {
      dbQuery = dbQuery.populate('blockedUsers', '_id username displayName avatarUrl');
    }
    const user = await dbQuery.select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.user) {
      const loggedInUser = await User.findById(req.user._id);
      if (loggedInUser) {
        // If target user blocked logged in user
        const hasBlockedMe = user.blockedUsers.some(id => id.toString() === req.user._id.toString());
        if (hasBlockedMe) {
          return res.status(403).json({
            success: false,
            message: 'You have been blocked by this user',
            blocked: true,
          });
        }
        // If logged in user blocked target user
        const isBlockedByMe = loggedInUser.blockedUsers.some(id => id.toString() === user._id.toString());
        if (isBlockedByMe) {
          return res.json({
            success: true,
            data: {
              _id: user._id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              bio: 'Blocked User',
              coverUrl: '',
              followerCount: 0,
              followingCount: 0,
              postCount: 0,
              isBlocked: true,
              isFollowing: false,
            }
          });
        }
      }
    }

    const postCount = await Post.countDocuments({ author: user._id, isArchived: { $ne: true }, status: { $ne: 'draft' } });

    let isFollowing = false;
    let isFollowingBack = false;
    if (req.user && req.user._id.toString() !== user._id.toString()) {
      const myIdStr = req.user._id.toString();
      isFollowing = user.followers.some(
        (id) => id.toString() === myIdStr
      );
      isFollowingBack = user.following.some(
        (id) => id.toString() === myIdStr
      );
    }
    const isMutual = isFollowing && isFollowingBack;

    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl || '',
        followerCount: user.followers.length,
        followingCount: user.following.length,
        postCount,
        followers: user.followers,
        following: user.following,
        isFollowing,
        isFollowingBack,
        isMutual,
        website: user.website || '',
        location: user.location || '',
        dob: user.dob || null,
        profession: user.profession || '',
        gender: user.gender || '',
        phone: (user.profileVisibilityControls?.showPhone !== false || (req.user && req.user._id.toString() === user._id.toString())) ? (user.phone || '') : '',
        createdAt: user.createdAt,
        blockedUsers: user.blockedUsers || [],
        profileVisibilityControls: user.profileVisibilityControls || {
          showWebsite: true,
          showLocation: true,
          showJoinedDate: true,
          showDob: true,
          showProfession: true,
          showGender: true,
          showPhone: true,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile',
    });
  }
};

/**
 * @desc    Update own profile
 * @route   PUT /api/users/me
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { 
      username,
      displayName, 
      bio, 
      website, 
      location, 
      dob, 
      profession, 
      gender, 
      phone,
      showWebsite, 
      showLocation, 
      showJoinedDate,
      showDob,
      showProfession,
      showGender,
      showPhone,
      showNSFW
    } = req.body;

    if (username !== undefined && username.toLowerCase() !== user.username.toLowerCase()) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-30 characters long and contain only letters, numbers, or underscores',
        });
      }
      const usernameExists = await User.findOne({ username: username.toLowerCase() });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken',
        });
      }
      user.username = username.toLowerCase();
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (website !== undefined) user.website = website;
    if (location !== undefined) user.location = location;
    if (dob !== undefined) user.dob = dob ? new Date(dob) : null;
    if (profession !== undefined) user.profession = profession;
    if (gender !== undefined) user.gender = gender;
    if (phone !== undefined) user.phone = phone.trim();

    if (!user.profileVisibilityControls) {
      user.profileVisibilityControls = {
        showWebsite: true,
        showLocation: true,
        showJoinedDate: true,
        showDob: true,
        showProfession: true,
        showGender: true,
        showPhone: true,
      };
    }

    if (showWebsite !== undefined) {
      user.profileVisibilityControls.showWebsite = showWebsite === 'true' || showWebsite === true;
    }
    if (showLocation !== undefined) {
      user.profileVisibilityControls.showLocation = showLocation === 'true' || showLocation === true;
    }
    if (showJoinedDate !== undefined) {
      user.profileVisibilityControls.showJoinedDate = showJoinedDate === 'true' || showJoinedDate === true;
    }
    if (showDob !== undefined) {
      user.profileVisibilityControls.showDob = showDob === 'true' || showDob === true;
    }
    if (showProfession !== undefined) {
      user.profileVisibilityControls.showProfession = showProfession === 'true' || showProfession === true;
    }
    if (showGender !== undefined) {
      user.profileVisibilityControls.showGender = showGender === 'true' || showGender === true;
    }
    if (showPhone !== undefined) {
      user.profileVisibilityControls.showPhone = showPhone === 'true' || showPhone === true;
    }

    if (showNSFW !== undefined) {
      user.showNSFW = showNSFW === 'true' || showNSFW === true;
    }

    // Handle profile avatar and cover updates
    const avatarFile = req.files && req.files['avatar'] ? req.files['avatar'][0] : req.file;
    const coverFile = req.files && req.files['cover'] ? req.files['cover'][0] : null;

    if (avatarFile) {
      if (user.avatarUrl) {
        await StorageService.deleteFile(user.avatarUrl);
      }
      user.avatarUrl = await StorageService.uploadFile(avatarFile, 'users/avatars');
    }

    if (coverFile) {
      if (user.coverUrl) {
        await StorageService.deleteFile(user.coverUrl);
      }
      user.coverUrl = await StorageService.uploadFile(coverFile, 'users/covers');
    }

    const updatedUser = await user.save();

    if (location) {
      await upsertLocation(location);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        coverUrl: updatedUser.coverUrl || '',
        website: updatedUser.website || '',
        location: updatedUser.location || '',
        dob: updatedUser.dob || null,
        profession: updatedUser.profession || '',
        gender: updatedUser.gender || '',
        showNSFW: updatedUser.showNSFW || false,
        createdAt: updatedUser.createdAt,
        profileVisibilityControls: updatedUser.profileVisibilityControls || {
          showWebsite: true,
          showLocation: true,
          showJoinedDate: true,
          showDob: true,
          showProfession: true,
          showGender: true,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
};

/**
 * @desc    Follow a user
 * @route   POST /api/users/:id/follow
 * @access  Private
 */
export const followUser = async (req, res) => {
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
};

/**
 * @desc    Unfollow a user
 * @route   POST /api/users/:id/unfollow
 * @access  Private
 */
export const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if not following
    if (!currentUser.following.some((id) => id.toString() === targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user',
      });
    }

    // Remove from following/followers lists
    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== currentUserId.toString()
    );

    await currentUser.save();
    await targetUser.save();

    await deleteFollowNotification(targetUserId, currentUserId);

    res.json({
      success: true,
      message: 'Successfully unfollowed user',
    });
  } catch (error) {
    console.error('UNFOLLOW ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unfollowing user',
    });
  }
};

/**
 * @desc    List user's followers
 * @route   GET /api/users/:id/followers
 * @access  Public
 */
export const getUserFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'followers',
      '_id username displayName avatarUrl'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.user) {
      const loggedInUser = await User.findById(req.user._id);
      if (loggedInUser) {
        if (user.blockedUsers.includes(req.user._id)) {
          return res.status(403).json({ success: false, message: 'You have been blocked by this user', blocked: true });
        }
        if (loggedInUser.blockedUsers.includes(user._id)) {
          return res.status(403).json({ success: false, message: 'You have blocked this user', blocked: true });
        }
      }
    }

    res.json({
      success: true,
      data: user.followers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error listing followers',
    });
  }
};

/**
 * @desc    List user's following
 * @route   GET /api/users/:id/following
 * @access  Public
 */
export const getUserFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'following',
      '_id username displayName avatarUrl'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.user) {
      const loggedInUser = await User.findById(req.user._id);
      if (loggedInUser) {
        if (user.blockedUsers.includes(req.user._id)) {
          return res.status(403).json({ success: false, message: 'You have been blocked by this user', blocked: true });
        }
        if (loggedInUser.blockedUsers.includes(user._id)) {
          return res.status(403).json({ success: false, message: 'You have blocked this user', blocked: true });
        }
      }
    }

    res.json({
      success: true,
      data: user.following,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error listing following',
    });
  }
};

/**
 * @desc    Search users by username or displayName
 * @route   GET /api/users/search
 * @access  Public
 */
export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.json({ success: true, data: [] });
    }

    let blockQuery = {};
    if (req.user) {
      const loggedInUser = await User.findById(req.user._id);
      if (loggedInUser) {
        const blockedByMe = loggedInUser.blockedUsers || [];
        const blockedMeUsers = await User.find({ blockedUsers: req.user._id }).select('_id');
        const blockedMeIds = blockedMeUsers.map(u => u._id);
        const excludeIds = [...blockedByMe, ...blockedMeIds];
        if (excludeIds.length > 0) {
          blockQuery._id = { $nin: excludeIds };
        }
      }
    }

    const escapedQuery = escapeRegex(q.trim());

    const users = await User.find({
      $or: [
        { username: { $regex: escapedQuery, $options: 'i' } },
        { displayName: { $regex: escapedQuery, $options: 'i' } },
      ],
      isVerified: true,
      ...blockQuery,
    });

    const mappedUsers = users.map(userObj => {
      const u = userObj.toObject();
      let isFollowing = false;
      let isFollowingBack = false;
      
      if (req.user) {
        const myIdStr = req.user._id.toString();
        isFollowing = u.followers && u.followers.some(id => id.toString() === myIdStr);
        isFollowingBack = u.following && u.following.some(id => id.toString() === myIdStr);
      }
      
      return {
        _id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        isFollowing,
        isFollowingBack,
        isMutual: isFollowing && isFollowingBack,
      };
    });

    res.json({
      success: true,
      data: mappedUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users',
    });
  }
};

/**
 * @desc    Change user password
 * @route   POST /api/users/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if current password is correct
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password',
      });
    }

    // Set new password (this will trigger pre-save hashing)
    user.passwordHash = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password',
    });
  }
};

/**
 * @desc    Block a user
 * @route   POST /api/users/:id/block
 * @access  Private
 */
export const blockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already blocked
    if (currentUser.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'User already blocked' });
    }

    currentUser.blockedUsers.push(targetUserId);

    // Unfollow both ways if they follow each other
    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
    currentUser.followers = currentUser.followers.filter(id => id.toString() !== targetUserId);
    targetUser.following = targetUser.following.filter(id => id.toString() !== currentUserId.toString());
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId.toString());

    await currentUser.save();
    await targetUser.save();

    // Clean up follow notifications if any
    await deleteFollowNotification(targetUserId, currentUserId);
    await deleteFollowNotification(currentUserId, targetUserId);

    res.json({
      success: true,
      message: 'User blocked successfully',
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, message: 'Server error blocking user' });
  }
};

/**
 * @desc    Unblock a user
 * @route   POST /api/users/:id/unblock
 * @access  Private
 */
export const unblockUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if blocked
    if (!currentUser.blockedUsers.includes(targetUserId)) {
      return res.status(400).json({ success: false, message: 'User is not blocked' });
    }

    currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== targetUserId);
    await currentUser.save();

    res.json({
      success: true,
      message: 'User unblocked successfully',
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, message: 'Server error unblocking user' });
  }
};
