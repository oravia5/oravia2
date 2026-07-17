import Post from '../models/Post.js';
import User from '../models/User.js';
import StorageService from '../services/storage.service.js';
import { upsertLocation } from './locations.controller.js';

/**
 * @desc    Get reels feed (dedicated full-screen swipeable list)
 * @route   GET /api/reels
 * @access  Public
 */
export const getReels = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const { cursor } = req.query;

    let query = {
      type: 'reel',
      isArchived: { $ne: true },
      status: { $ne: 'draft' },
    };

    if (req.user) {
      const currentUser = await User.findById(req.user._id);
      if (currentUser) {
        const blockedUsers = currentUser.blockedUsers || [];
        const usersWhoBlockedMeRes = await User.find({ blockedUsers: currentUser._id }, '_id');
        const usersWhoBlockedMe = usersWhoBlockedMeRes.map(u => u._id.toString());
        const allBlockedIds = [...blockedUsers.map(id => id.toString()), ...usersWhoBlockedMe];
        query.author = { $nin: allBlockedIds };
      }
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const reels = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('author', '_id username displayName avatarUrl');

    const hasNextPage = reels.length > limit;
    if (hasNextPage) {
      reels.pop();
    }

    const nextCursor = hasNextPage && reels.length > 0 ? reels[reels.length - 1].createdAt : null;

    res.json({
      success: true,
      data: reels,
      nextCursor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching reels',
    });
  }
};

/**
 * @desc    Upload a new reel
 * @route   POST /api/reels
 * @access  Private
 */
export const createReel = async (req, res) => {
  try {
    const { caption, location, album, status } = req.body;
    const isReal = req.body.isReal === 'true';

    const reelFile = (req.files && req.files['media'] ? req.files['media'][0] : null) || req.file;

    if (!reelFile) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a video file for the reel',
      });
    }

    const type = 'reel';
    const mediaUrl = await StorageService.uploadFile(reelFile, 'reels');
    const thumbnailUrl = mediaUrl;

    const regex = /#(\w+)/g;
    const matches = [...(caption || '').matchAll(regex)];
    const parsedTags = matches.map((m) => m[1].toLowerCase());
    if (isReal && !parsedTags.includes('real')) {
      parsedTags.push('real');
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
      if (prod.hasImageFile && imgIndex < productImgFiles.length) {
        prod.imageUrl = await StorageService.uploadFile(productImgFiles[imgIndex], 'reels/products');
        imgIndex++;
      } else {
        prod.imageUrl = prod.imageUrl || '';
      }
      delete prod.hasImageFile;

      if (prod.hasDigitalFile && assetIndex < productAssetFiles.length) {
        prod.fileUrl = await StorageService.uploadFile(productAssetFiles[assetIndex], 'reels/products');
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

    const reel = await Post.create({
      author: req.user._id,
      type,
      mediaUrl,
      thumbnailUrl,
      caption: caption || '',
      location: location || '',
      products: processedProducts,
      album: album ? album.trim() : '',
      tags: parsedTags,
      status: status || 'published',
      isReal,
    });

    const populatedReel = await Post.findById(reel._id).populate(
      'author',
      '_id username displayName avatarUrl'
    );

    if (location) {
      await upsertLocation(location);
    }

    res.status(201).json({
      success: true,
      message: 'Reel uploaded successfully',
      data: populatedReel,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading reel',
    });
  }
};
