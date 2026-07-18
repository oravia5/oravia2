import User from '../models/User.js';
import Post from '../models/Post.js';

/**
 * @desc    Get dashboard metrics & stats
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    
    // Breakdown by type
    const photoCount = await Post.countDocuments({ type: 'photo' });
    const videoCount = await Post.countDocuments({ type: 'video' });
    const reelCount = await Post.countDocuments({ type: 'reel' });

    const verifiedCount = await User.countDocuments({ isVerified: true });
    const bannedCount = await User.countDocuments({ isBanned: true });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPosts,
        breakdown: {
          photo: photoCount,
          video: videoCount,
          reel: reelCount,
        },
        verifiedCount,
        bannedCount,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching stats' });
  }
};

/**
 * @desc    Get all users (searchable, paginated, with post counts)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const searchQuery = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(searchQuery)
      .select('-passwordHash')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(searchQuery);

    const usersWithPostCount = await Promise.all(
      users.map(async (user) => {
        const postCount = await Post.countDocuments({ author: user._id });
        return {
          ...user.toObject(),
          postCount,
        };
      })
    );

    res.json({
      success: true,
      data: usersWithPostCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};

/**
 * @desc    Toggle user ban status
 * @route   PUT /api/admin/users/:id/ban
 * @access  Private/Admin
 */
export const toggleUserBan = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'superadmin') {
      return res.status(400).json({ success: false, message: 'Superadmin cannot be banned' });
    }

    // Toggle ban
    user.isBanned = !user.isBanned;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`,
      data: user,
    });
  } catch (error) {
    console.error('Error toggling user ban:', error);
    res.status(500).json({ success: false, message: 'Server error toggling user ban' });
  }
};

/**
 * @desc    Toggle user verification status (Blue tick)
 * @route   PUT /api/admin/users/:id/verify
 * @access  Private/Admin
 */
export const toggleUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isVerified = !user.isVerified;
    await user.save();

    res.json({
      success: true,
      message: `User verification status set to ${user.isVerified}`,
      data: user,
    });
  } catch (error) {
    console.error('Error toggling user verification:', error);
    res.status(500).json({ success: false, message: 'Server error toggling verification' });
  }
};

/**
 * @desc    Get all posts paginated
 * @route   GET /api/admin/posts
 * @access  Private/Admin
 */
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('author', 'username email displayName avatarUrl')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPosts = await Post.countDocuments();

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
      },
    });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({ success: false, message: 'Server error fetching posts' });
  }
};

/**
 * @desc    Delete any post
 * @route   DELETE /api/admin/posts/:id
 * @access  Private/Admin
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted successfully by administrator',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Server error deleting post' });
  }
};
