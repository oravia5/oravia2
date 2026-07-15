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
 * @desc    Get home timeline (posts + reels mixed, prioritizing followed users)
 * @route   GET /api/posts/feed
 * @access  Private
 */
export const getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const followedUsers = user.following || [];
    
    // Find blocked and blocking users
    const blockedUsers = user.blockedUsers || [];
    const usersWhoBlockedMeRes = await User.find({ blockedUsers: userId }, '_id');
    const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
    const allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];

    // 1. Fetch own posts + followed users' posts (excluding blocked ones)
    const primaryAuthors = [userId, ...followedUsers].filter(id => !allBlockedIds.includes(id.toString()));
    let primaryPosts = await Post.find({
      author: { $in: primaryAuthors },
      isArchived: { $ne: true },
      status: { $ne: 'draft' },
    })
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');

    // 2. Backfill with public/discover posts if not enough content
    let discoverPosts = [];
    if (primaryPosts.length < 20) {
      discoverPosts = await Post.find({
        author: { $nin: [...primaryAuthors, ...allBlockedIds] },
        isArchived: { $ne: true },
        status: { $ne: 'draft' },
      })
        .sort({ createdAt: -1 })
        .limit(40 - primaryPosts.length)
        .populate('author', '_id username displayName avatarUrl');
    }

    // Combine posts ensuring no duplicates
    const allPostsCombined = [...primaryPosts, ...discoverPosts];

    // Separate regular posts (photo, video) and reels to structure the mixing
    const regularPosts = allPostsCombined.filter((p) => p.type !== 'reel');
    const reels = allPostsCombined.filter((p) => p.type === 'reel');

    // If we don't have enough reels from primary/discover mix, fetch general public reels
    if (reels.length < 5) {
      const existingReelIds = reels.map((r) => r._id);
      const publicReels = await Post.find({
        type: 'reel',
        author: { $nin: allBlockedIds },
        _id: { $nin: existingReelIds },
        isArchived: { $ne: true },
        status: { $ne: 'draft' },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', '_id username displayName avatarUrl');
      
      reels.push(...publicReels);
    }

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
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    // Attach commentCount to each feed item as a plain object
    const feedWithCounts = mixedFeed.map((p) => {
      const obj = p.toObject();
      obj.commentCount = countMap[p._id.toString()] || 0;
      return obj;
    });

    res.json({
      success: true,
      data: feedWithCounts,
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
      const thumb = url;
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
        prod.fileUrl = await StorageService.uploadFile(productAssetFiles[assetIndex], 'posts/products');
        prod.fileName = productAssetFiles[assetIndex].originalname;
        assetIndex++;
      } else {
        prod.fileUrl = prod.fileUrl || '';
        prod.fileName = prod.fileName || '';
      }
      delete prod.hasDigitalFile;

      prod.originalPrice = prod.originalPrice || '';
      processedProducts.push(prod);
    }

    const parsedTags = parseHashtags(caption);

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
    const posts = await Post.find({ tags: tag })
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
    const posts = await Post.find({ location: { $regex: new RegExp(`^${locationName}$`, 'i') } })
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

    // 1. Search posts matching caption or location string
    const matchingPosts = await Post.find({
      $or: [
        { caption: { $regex: escapedQuery, $options: 'i' } },
        { location: { $regex: escapedQuery, $options: 'i' } },
      ],
      type: { $ne: 'reel' }
    })
      .sort({ createdAt: -1 })
      .populate('author', '_id username displayName avatarUrl');

    // 2. Search unique hashtags matching the keyword query
    const postsWithTags = await Post.find({
      tags: { $regex: escapedQuery, $options: 'i' }
    });

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
          prod.fileUrl = await StorageService.uploadFile(productAssetFiles[assetIndex], 'posts/products');
          prod.fileName = productAssetFiles[assetIndex].originalname;
          assetIndex++;
        } else {
          prod.fileUrl = prod.fileUrl || '';
          prod.fileName = prod.fileName || '';
        }
        delete prod.hasDigitalFile;

        prod.originalPrice = prod.originalPrice || '';
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
