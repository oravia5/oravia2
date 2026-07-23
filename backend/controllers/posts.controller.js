import Post from '../models/Post.js';
import User from '../models/User.js';
import StorageService from '../services/storage.service.js';
import { createNotification } from '../services/notification.service.js';
import { upsertLocation } from './locations.controller.js';

// Helper to escape special regex characters from user input
const escapeRegex = (string) => {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
};

/**
 * @desc    Get home timeline (For You: posts + reels mixed from everyone)
 * @route   GET /api/posts/feed
 * @access  Private
 */
export const getFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { cursor } = req.query;

    let allBlockedIds = [];
    if (req.user) {
      const userId = req.user._id;
      const user = await User.findById(userId);
      if (user) {
        const blockedUsers = user.blockedUsers || [];
        const usersWhoBlockedMeRes = await User.find({ blockedUsers: userId }, '_id');
        const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
        allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];
      }
    }

    // Fetch all posts from everyone except blocked/blocking users
    const query = {
      isArchived: { $ne: true },
      status: { $ne: 'draft' },
    };
    if (allBlockedIds.length > 0) {
      query.author = { $nin: allBlockedIds };
    }

    const showNSFW = req.user ? req.user.showNSFW : false;
    if (req.user && !showNSFW) {
      query.$or = [{ isNSFW: { $ne: true } }, { author: req.user._id }];
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Fetch limit + 1 items to see if there is a next page
    let allPosts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('author', '_id username displayName avatarUrl');

    const hasNextPage = allPosts.length > limit;
    if (hasNextPage) {
      allPosts.pop(); // Remove the extra item
    }

    const nextCursor = hasNextPage && allPosts.length > 0 ? allPosts[allPosts.length - 1].createdAt : null;

    // Compute comment counts for all posts in the feed
    const Comment = (await import('../models/Comment.js')).default;
    const postIds = allPosts.map((p) => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    // Attach commentCount to each feed item as a plain object
    const feedWithCounts = allPosts.map((p) => {
      const obj = p.toObject();
      obj.commentCount = countMap[p._id.toString()] || 0;
      return obj;
    });

    res.json({
      success: true,
      data: feedWithCounts,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching feed',
    });
  }
};

/**
 * @desc    Get following timeline (Following: posts + reels from followed accounts + self)
 * @route   GET /api/posts/following
 * @access  Private
 */
export const getFollowingFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const followedUsers = user.following || [];
    
    // Find blocked and blocking users
    const blockedUsers = user.blockedUsers || [];
    const usersWhoBlockedMeRes = await User.find({ blockedUsers: userId }, '_id');
    const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
    const allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];

    // Combine self and followed users, and exclude blocked/blocking ones
    const allowedAuthors = [userId, ...followedUsers].filter(id => !allBlockedIds.includes(id.toString()));

    // Fetch posts from these authors
    const query = {
      author: { $in: allowedAuthors },
      isArchived: { $ne: true },
      status: { $ne: 'draft' },
    };

    const showNSFW = req.user ? req.user.showNSFW : false;
    if (req.user && !showNSFW) {
      query.$or = [{ isNSFW: { $ne: true } }, { author: req.user._id }];
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');

    // Separate regular posts (photo, video) and reels to structure the mixing
    const regularPosts = posts.filter((p) => p.type !== 'reel');
    const reels = posts.filter((p) => p.type === 'reel');

    // Mix reels into the feed (every 5th item)
    const mixedFeed = [];
    let reelIndex = 0;

    for (let i = 0; i < regularPosts.length; i++) {
      mixedFeed.push(regularPosts[i]);
      
      // Every 4 regular posts (making it the 5th item), insert a reel if available
      if ((mixedFeed.length) % 5 === 4 && reels[reelIndex]) {
        mixedFeed.push(reels[reelIndex]);
        reelIndex++;
      }
    }

    // Append remaining reels at the end (or all reels if no regular posts)
    while (reelIndex < reels.length) {
      mixedFeed.push(reels[reelIndex]);
      reelIndex++;
    }

    // Compute comment counts for all posts in the feed
    const Comment = (await import('../models/Comment.js')).default;
    const postIds = mixedFeed.map((p) => p._id);
    let countMap = {};
    if (postIds.length > 0) {
      const commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: '$post', count: { $sum: 1 } } },
      ]);
      commentCounts.forEach((c) => {
        countMap[c._id.toString()] = c.count;
      });
    }

    // Attach commentCount to each feed item as a plain object
    const feedWithCounts = mixedFeed.map((p) => {
      const obj = p.toObject();
      obj.commentCount = countMap[p._id.toString()] || 0;
      return obj;
    });

    const isEmptyFollowing = followedUsers.length === 0 && posts.length === 0;

    res.json({
      success: true,
      data: feedWithCounts,
      emptyFollowing: isEmptyFollowing,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching following feed',
    });
  }
};

/**
 * @desc    Get near you feed based on user's location
 * @route   GET /api/posts/near-you
 * @access  Private
 */
export const getNearYouFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const { cursor } = req.query;

    let allBlockedIds = [];
    let userLocation = req.query.city ? req.query.city.trim() : '';

    if (req.user) {
      const userId = req.user._id;
      const user = await User.findById(userId);
      if (user) {
        const blockedUsers = user.blockedUsers || [];
        const usersWhoBlockedMeRes = await User.find({ blockedUsers: userId }, '_id');
        const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
        allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];
        if (!userLocation) {
          userLocation = user.location ? user.location.trim() : '';
        }
      }
    }

    if (!userLocation) {
      return res.json({
        success: true,
        data: [],
        locationNotSet: true,
      });
    }

    // Smart Matching: split user location by commas and search for posts whose location matches the city (first part of location string)
    // E.g., "Andheri, Mumbai" -> matches "Mumbai"
    const parts = userLocation.split(',').map(p => p.trim()).filter(Boolean);
    const citySearch = parts[0] || '';

    let posts = [];
    let hasNextPage = false;
    let nextCursor = null;

    if (citySearch) {
      // Find all users whose PROFILE location matches the current user's
      // city (this is the actual "Near You" logic — same city profile,
      // regardless of whether individual posts have a location tag).
      const matchingUsers = await User.find(
        { location: { $regex: citySearch, $options: 'i' } },
        '_id'
      );
      const matchingAuthorIds = matchingUsers.map((u) => u._id.toString());

      const query = {
        isArchived: { $ne: true },
        status: { $ne: 'draft' },
        author: { $in: matchingAuthorIds },
      };
      if (allBlockedIds.length > 0) {
        query.author.$nin = allBlockedIds;
      }

      const showNSFW = req.user ? req.user.showNSFW : false;
      if (!showNSFW) {
        if (req.user) {
          query.$or = [{ isNSFW: { $ne: true } }, { author: req.user._id }];
        } else {
          query.isNSFW = { $ne: true };
        }
        query.moderationStatus = { $ne: 'pending' };
      }

      if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
      }

      posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate('author', '_id username displayName avatarUrl');

      hasNextPage = posts.length > limit;
      if (hasNextPage) {
        posts.pop();
      }
      nextCursor = hasNextPage && posts.length > 0 ? posts[posts.length - 1].createdAt : null;
    }

    const noPostsFound = posts.length === 0 && !cursor;

    // Compute comment counts for all posts in the feed
    const Comment = (await import('../models/Comment.js')).default;
    const postIds = posts.map((p) => p._id);
    let countMap = {};
    if (postIds.length > 0) {
      const commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: '$post', count: { $sum: 1 } } },
      ]);
      commentCounts.forEach((c) => {
        countMap[c._id.toString()] = c.count;
      });
    }

    // Attach commentCount to each feed item as a plain object
    const feedWithCounts = posts.map((p) => {
      const obj = p.toObject();
      obj.commentCount = countMap[p._id.toString()] || 0;
      return obj;
    });

    res.json({
      success: true,
      data: feedWithCounts,
      nextCursor,
      locationNotSet: false,
      noPostsForLocation: noPostsFound,
      userLocation: userLocation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching near you feed',
    });
  }
};


/**
 * Helper function to parse hashtags from caption text.
 * Returns an array of lowercase tag strings.
 */
export const parseHashtags = (text) => {
  if (!text) return [];
  const regex = /#(\w+)/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((m) => m[1].toLowerCase());
};

/**
 * @desc    Create a new post (photo or video)
 * @route   POST /api/posts
 * @access  Private
 */
export const createPost = async (req, res) => {
  try {
    const { caption, location, album, status } = req.body;
    let { type } = req.body; // 'photo' or 'video'
    const isReal = req.body.isReal === 'true';

    const mediaFiles = req.files && req.files['media'] ? req.files['media'] : [];

    if (mediaFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one image or video file',
      });
    }

    const mediaItems = [];
    for (const file of mediaFiles) {
      const isVideo = file.mimetype.startsWith('video/');
      const fileType = isVideo ? 'video' : 'photo';
      const url = await StorageService.uploadFile(file, 'posts');
      let thumb = url;
      if (isVideo) {
        const videoThumb = await StorageService.generateVideoThumbnailFromBuffer(file.buffer, 'posts');
        if (videoThumb) {
          thumb = videoThumb;
        }
      }
      mediaItems.push({
        url,
        type: fileType,
        thumbnailUrl: thumb || '',
      });
    }

    const primaryMedia = mediaItems[0];
    const mediaUrl = primaryMedia.url;
    const thumbnailUrl = primaryMedia.thumbnailUrl;
    if (!type) {
      type = primaryMedia.type;
    }

    // Parse shoppable products list
    let products = [];
    try {
      products = JSON.parse(req.body.products || '[]');
    } catch (e) {
      console.error('Failed to parse products json:', e.message);
    }

    // Map uploaded product cover images
    const productImgFiles = req.files && req.files['productImages'] ? req.files['productImages'] : [];
    // Map uploaded product digital files
    const productAssetFiles = req.files && req.files['productFiles'] ? req.files['productFiles'] : [];

    let imgIndex = 0;
    let assetIndex = 0;

    const processedProducts = [];
    for (const prod of products) {
      // Cover image file mapping
      if (prod.hasImageFile && imgIndex < productImgFiles.length) {
        prod.imageUrl = await StorageService.uploadFile(productImgFiles[imgIndex], 'posts/products');
        imgIndex++;
      } else {
        prod.imageUrl = prod.imageUrl || '';
      }
      delete prod.hasImageFile;

      // Digital asset file mapping
      if (prod.hasDigitalFile && assetIndex < productAssetFiles.length) {
        const fileObj = productAssetFiles[assetIndex];
        prod.fileUrl = await StorageService.uploadFile(fileObj, 'posts/products');
        prod.fileName = fileObj.originalname;
        if (!prod.fileSize) {
          const mb = (fileObj.size / (1024 * 1024)).toFixed(1);
          prod.fileSize = `${mb} MB`;
        }
        if (!prod.fileType) {
          const ext = fileObj.originalname.split('.').pop().toUpperCase();
          prod.fileType = ext;
        }
        assetIndex++;
      } else {
        prod.fileUrl = prod.fileUrl || '';
        prod.fileName = prod.fileName || '';
      }
      delete prod.hasDigitalFile;

      prod.originalPrice = prod.originalPrice || '';
      prod.currency = prod.currency || '₹';
      prod.fileSize = prod.fileSize || '';
      prod.fileType = prod.fileType || '';
      prod.requireFollow = !!prod.requireFollow;
      processedProducts.push(prod);
    }

    const parsedTags = parseHashtags(caption);
    if (isReal && !parsedTags.includes('real')) {
      parsedTags.push('real');
    }

    const post = await Post.create({
      author: req.user._id,
      type,
      mediaUrl,
      thumbnailUrl,
      mediaItems,
      caption: caption || '',
      location: location || '',
      products: processedProducts,
      album: album ? album.trim() : '',
      tags: parsedTags,
      status: status || 'published',
      isReal,
    });

    const populatedPost = await Post.findById(post._id).populate(
      'author',
      '_id username displayName avatarUrl'
    );

    if (location) {
      await upsertLocation(location);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: populatedPost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error creating post',
    });
  }
};

/**
 * @desc    Get single post detail
 * @route   GET /api/posts/:id
 * @access  Public
 */
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'author',
      '_id username displayName avatarUrl'
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving post',
    });
  }
};

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'User not authorized to delete this post',
      });
    }

    // Delete all media files (carousel items + fallback mediaUrl)
    if (post.mediaItems && post.mediaItems.length > 0) {
      for (const item of post.mediaItems) {
        await StorageService.deleteFile(item.url);
        if (item.thumbnailUrl && item.thumbnailUrl !== item.url) {
          await StorageService.deleteFile(item.thumbnailUrl);
        }
      }
    } else {
      await StorageService.deleteFile(post.mediaUrl);
    }

    // Delete product images
    if (post.products && post.products.length > 0) {
      for (const prod of post.products) {
        if (prod.imageUrl) {
          await StorageService.deleteFile(prod.imageUrl);
        }
      }
    }

    // Delete document
    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post removed successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting post',
    });
  }
};

/**
 * @desc    Like a post (removes dislike if present)
 * @route   POST /api/posts/:id/like
 * @access  Private
 */
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // If already liked, remove like (toggle off)
    if (post.likes.some((id) => id.equals(userId))) {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      // Add like and remove dislike (mutually exclusive)
      post.likes.push(userId);
      post.dislikes = post.dislikes.filter((id) => id.toString() !== userId.toString());
    }

    await post.save();

    if (post.likes.some((id) => id.equals(userId))) {
      createNotification({
        recipient: post.author,
        actor: userId,
        type: 'like',
        post: post._id,
      });
    }

    res.json({
      success: true,
      data: {
        likes: post.likes,
        dislikes: post.dislikes,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error liking post',
    });
  }
};

/**
 * @desc    Dislike a post (removes like if present)
 * @route   POST /api/posts/:id/dislike
 * @access  Private
 */
export const dislikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // If already disliked, remove dislike (toggle off)
    if (post.dislikes.some((id) => id.equals(userId))) {
      post.dislikes = post.dislikes.filter((id) => id.toString() !== userId.toString());
    } else {
      // Add dislike and remove like (mutually exclusive)
      post.dislikes.push(userId);
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    }

    await post.save();

    if (post.dislikes.some((id) => id.equals(userId))) {
      createNotification({
        recipient: post.author,
        actor: userId,
        type: 'dislike',
        post: post._id,
      });
    }

    res.json({
      success: true,
      data: {
        likes: post.likes,
        dislikes: post.dislikes,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error disliking post',
    });
  }
};

/**
 * @desc    Get list of users who liked a post (with pagination)
 * @route   GET /api/posts/:id/likes
 * @access  Public
 */
export const getPostLikes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const post = await Post.findById(req.params.id).select('likes');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const total = post.likes.length;
    const pageIds = post.likes.slice().reverse().slice(skip, skip + limit);

    const users = await User.find({ _id: { $in: pageIds } })
      .select('_id username displayName avatarUrl');

    const orderedUsers = pageIds
      .map((id) => users.find((u) => u._id.toString() === id.toString()))
      .filter(Boolean);

    res.json({
      success: true,
      data: orderedUsers,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching likes' });
  }
};

/**
 * @desc    Get list of users who disliked a post (with pagination)
 * @route   GET /api/posts/:id/dislikes
 * @access  Public
 */
export const getPostDislikes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const post = await Post.findById(req.params.id).select('dislikes');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const total = post.dislikes.length;
    const pageIds = post.dislikes.slice().reverse().slice(skip, skip + limit);

    const users = await User.find({ _id: { $in: pageIds } })
      .select('_id username displayName avatarUrl');

    const orderedUsers = pageIds
      .map((id) => users.find((u) => u._id.toString() === id.toString()))
      .filter(Boolean);

    res.json({
      success: true,
      data: orderedUsers,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error fetching dislikes' });
  }
};

/**
 * @desc    Save/bookmark a post
 * @route   POST /api/posts/:id/save
 * @access  Private
 */
export const savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const user = await User.findById(userId);
    if (user.savedPosts.some((id) => id.equals(post._id))) {
      return res.status(400).json({
        success: false,
        message: 'Post already saved',
      });
    }

    user.savedPosts.push(post._id);
    await user.save();

    res.json({
      success: true,
      message: 'Post saved successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error saving post',
    });
  }
};

/**
 * @desc    Remove post from saved bookmarks
 * @route   POST /api/posts/:id/unsave
 * @access  Private
 */
export const unsavePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user._id;

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const user = await User.findById(userId);
    if (!user.savedPosts.some((id) => id.equals(post._id))) {
      return res.status(400).json({
        success: false,
        message: 'Post was not saved',
      });
    }

    user.savedPosts = user.savedPosts.filter(
      (id) => id.toString() !== post._id.toString()
    );
    await user.save();

    res.json({
      success: true,
      message: 'Post removed from saved successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error unsaving post',
    });
  }
};

/**
 * @desc    Batch-increment view counts for multiple posts in one lightweight write.
 * @route   POST /api/posts/views/batch
 * @access  Public
 */
export const batchIncrementViews = async (req, res) => {
  try {
    const { postIds } = req.body;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ success: false, message: 'postIds array is required' });
    }

    const safeIds = postIds.filter((id) => typeof id === 'string').slice(0, 200);

    const bulkOps = safeIds.map((id) => ({
      updateOne: {
        filter: { _id: id },
        update: { $inc: { views: 1 } },
      },
    }));

    if (bulkOps.length > 0) {
      await Post.bulkWrite(bulkOps, { ordered: false });
    }

    res.json({ success: true, counted: bulkOps.length });
  } catch (error) {
    console.error('batchIncrementViews error:', error.message);
    res.json({ success: false });
  }
};

/**
 * @desc    Increment share count & return shareable link
 * @route   POST /api/posts/:id/share
 * @access  Public
 */
export const sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    post.shareCount += 1;
    await post.save();

    if (req.user && post.author.toString() !== req.user._id.toString()) {
      createNotification({
        recipient: post.author,
        actor: req.user._id,
        type: 'share',
        post: post._id,
      });
    }

    // Construct public link
    const host = req.get('host');
    const protocol = req.protocol;
    const shareableUrl = `${protocol}://${host}/post/${post._id}`;

    res.json({
      success: true,
      data: {
        shareableUrl,
        shareCount: post.shareCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error sharing post',
    });
  }
};

/**
 * @desc    Get posts with query filters (author, type, saved)
 * @route   GET /api/posts
 * @access  Public/Private
 */
export const getPosts = async (req, res) => {
  try {
    const { author, type, saved, archived, draft } = req.query;
    let query = {};

    // Exclude posts from blocked or blocking users
    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      if (currentUser) {
        const blockedUsers = currentUser.blockedUsers || [];
        const usersWhoBlockedMeRes = await User.find({ blockedUsers: currentUser._id }, '_id');
        const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
        const allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];

        if (author && allBlockedIds.includes(author.toString())) {
          return res.json({ success: true, data: [] });
        }

        query.author = { $nin: allBlockedIds };
      }
    }

    if (author) {
      query.author = author;
    }

    if (type) {
      query.type = type;
    } else {
      // Exclude reels by default for regular post listings if type is not specified
      query.type = { $ne: 'reel' };
    }

    if (saved === 'true') {
      // Must be authenticated to see saved
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized access to saved posts' });
      }
      const user = await User.findById(req.user._id);
      query = { _id: { $in: user.savedPosts || [] } };
    }

    // Archived filter
    if (archived === 'true') {
      if (!req.user || !author || req.user._id.toString() !== author.toString()) {
        return res.json({ success: true, data: [] });
      }
      query.isArchived = true;
    } else {
      query.isArchived = { $ne: true };
    }

    // Draft filter
    if (draft === 'true') {
      if (!req.user || !author || req.user._id.toString() !== author.toString()) {
        return res.json({ success: true, data: [] });
      }
      query.status = 'draft';
    } else {
      query.status = { $ne: 'draft' };
    }

    const showNSFW = req.user ? req.user.showNSFW : false;
    const isOwnProfile = req.user && author && req.user._id.toString() === author.toString();
    const isProfileFetch = Boolean(author);
    if (req.user && !showNSFW && !isOwnProfile && !isProfileFetch) {
      query.$or = [{ isNSFW: { $ne: true } }, { author: req.user._id }];
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching posts list',
    });
  }
};

/**
 * @desc    Get posts tagged with a specific hashtag
 * @route   GET /api/posts/tag/:tag
 * @access  Public
 */
export const getPostsByHashtag = async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase().trim();
    const showNSFW = req.user ? req.user.showNSFW : false;

    const conditions = [
      { tags: tag },
      { isArchived: { $ne: true } },
      { status: { $ne: 'draft' } },
    ];

    if (req.user && !showNSFW) {
      conditions.push({ $or: [{ isNSFW: { $ne: true } }, { author: req.user._id }] });
    }

    const query = { $and: conditions };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tag feed',
    });
  }
};

/**
 * @desc    Get posts tagged with a specific location string
 * @route   GET /api/posts/location-feed/:location
 * @access  Public
 */
export const getPostsByLocation = async (req, res) => {
  try {
    const locationName = req.params.location.trim();
    const showNSFW = req.user ? req.user.showNSFW : false;

    const conditions = [
      { location: { $regex: new RegExp(`^${locationName}$`, 'i') } },
      { isArchived: { $ne: true } },
      { status: { $ne: 'draft' } },
    ];

    if (req.user && !showNSFW) {
      conditions.push({ $or: [{ isNSFW: { $ne: true } }, { author: req.user._id }] });
    }

    const query = { $and: conditions };

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching location feed',
    });
  }
};

/**
 * @desc    Search posts and hashtags
 * @route   GET /api/posts/search-posts
 * @access  Private
 */
export const searchPosts = async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    if (!query) {
      return res.json({ success: true, data: { posts: [], hashtags: [] } });
    }

    const escapedQuery = escapeRegex(query);

    const showNSFW = req.user ? req.user.showNSFW : false;

    // 1. Search posts matching caption or location string
    const postConditions = [
      {
        $or: [
          { caption: { $regex: escapedQuery, $options: 'i' } },
          { location: { $regex: escapedQuery, $options: 'i' } },
        ],
      },
      { type: { $ne: 'reel' } },
      { isArchived: { $ne: true } },
      { status: { $ne: 'draft' } },
    ];

    if (req.user && !showNSFW) {
      postConditions.push({ $or: [{ isNSFW: { $ne: true } }, { author: req.user._id }] });
    }

    const postQuery = { $and: postConditions };

    const matchingPosts = await Post.find(postQuery)
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');
  
    // 2. Search unique hashtags matching the keyword query
    const tagsConditions = [
      { tags: { $regex: escapedQuery, $options: 'i' } },
      { isArchived: { $ne: true } },
      { status: { $ne: 'draft' } },
    ];

    if (!showNSFW) {
      if (req.user) {
        tagsConditions.push({ $or: [{ isNSFW: { $ne: true } }, { author: req.user._id }] });
      } else {
        tagsConditions.push({ isNSFW: { $ne: true } });
      }
      tagsConditions.push({ moderationStatus: { $ne: 'pending' } });
    }

    const tagsQuery = { $and: tagsConditions };
    const postsWithTags = await Post.find(tagsQuery);

    const tagMap = {};
    postsWithTags.forEach((post) => {
      if (post.tags) {
        post.tags.forEach((t) => {
          if (t.includes(query.toLowerCase())) {
            tagMap[t] = (tagMap[t] || 0) + 1;
          }
        });
      }
    });

    const matchingHashtags = Object.entries(tagMap).map(([name, count]) => ({
      name,
      count
    }));

    res.json({
      success: true,
      data: {
        posts: matchingPosts,
        hashtags: matchingHashtags,
      },
    });
  } catch (error) {
    console.error('Error during posts search:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search',
    });
  }
};

/**
 * @desc    Update a post
 * @route   PUT /api/posts/:id
 * @access  Private
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, location, album, status, isArchived, products } = req.body;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (caption !== undefined) {
      post.caption = caption;
      post.tags = parseHashtags(caption);
    }
    if (location !== undefined) post.location = location;
    if (album !== undefined) post.album = album ? album.trim() : '';
    if (status !== undefined) post.status = status;
    if (isArchived !== undefined) post.isArchived = isArchived;
    
    if (products !== undefined) {
      let parsedProducts = [];
      try {
        parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
      } catch (err) {
        console.error('Failed to parse updated products:', err.message);
      }

      // Map uploaded product cover images and digital files
      const productImgFiles = req.files && req.files['productImages'] ? req.files['productImages'] : [];
      const productAssetFiles = req.files && req.files['productFiles'] ? req.files['productFiles'] : [];

      let imgIndex = 0;
      let assetIndex = 0;

      const processedProducts = [];
      for (const prod of parsedProducts) {
        // Cover image file mapping
        if (prod.hasImageFile && imgIndex < productImgFiles.length) {
          prod.imageUrl = await StorageService.uploadFile(productImgFiles[imgIndex], 'posts/products');
          imgIndex++;
        } else {
          prod.imageUrl = prod.imageUrl || '';
        }
        delete prod.hasImageFile;

        // Digital asset file mapping
        if (prod.hasDigitalFile && assetIndex < productAssetFiles.length) {
          const fileObj = productAssetFiles[assetIndex];
          prod.fileUrl = await StorageService.uploadFile(fileObj, 'posts/products');
          prod.fileName = fileObj.originalname;
          if (!prod.fileSize) {
            const mb = (fileObj.size / (1024 * 1024)).toFixed(1);
            prod.fileSize = `${mb} MB`;
          }
          if (!prod.fileType) {
            const ext = fileObj.originalname.split('.').pop().toUpperCase();
            prod.fileType = ext;
          }
          assetIndex++;
        } else {
          prod.fileUrl = prod.fileUrl || '';
          prod.fileName = prod.fileName || '';
        }
        delete prod.hasDigitalFile;

        prod.originalPrice = prod.originalPrice || '';
        prod.currency = prod.currency || '₹';
        prod.fileSize = prod.fileSize || '';
        prod.fileType = prod.fileType || '';
        prod.requireFollow = !!prod.requireFollow;
        processedProducts.push(prod);
      }
      post.products = processedProducts;
    }

    await post.save();

    if (location) {
      await upsertLocation(location);
    }

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: post,
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, message: 'Server error updating post' });
  }
};

/**
 * @desc    Archive a post
 * @route   POST /api/posts/:id/archive
 * @access  Private
 */
export const archivePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    post.isArchived = true;
    await post.save();

    res.json({
      success: true,
      message: 'Post archived successfully',
      data: post,
    });
  } catch (error) {
    console.error('Archive post error:', error);
    res.status(500).json({ success: false, message: 'Server error archiving post' });
  }
};

/**
 * @desc    Unarchive a post
 * @route   POST /api/posts/:id/unarchive
 * @access  Private
 */
export const unarchivePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    post.isArchived = false;
    await post.save();

    res.json({
      success: true,
      message: 'Post unarchived successfully',
      data: post,
    });
  } catch (error) {
    console.error('Unarchive post error:', error);
    res.status(500).json({ success: false, message: 'Server error unarchiving post' });
  }
};

/**
 * @desc    Increment download count for a product in a post
 * @route   POST /api/posts/:id/products/:productId/download
 * @access  Public
 */
export const trackProductDownload = async (req, res) => {
  try {
    const { id, productId } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const prod = post.products.id(productId);
    if (!prod) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    prod.downloadCount = (prod.downloadCount || 0) + 1;
    await post.save();

    res.json({
      success: true,
      downloadCount: prod.downloadCount,
      fileUrl: prod.fileUrl,
    });
  } catch (error) {
    console.error('Track product download error:', error);
    res.status(500).json({ success: false, message: 'Server error tracking download' });
  }
};
