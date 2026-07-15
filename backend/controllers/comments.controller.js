import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import StorageService from '../services/storage.service.js';
import { createNotification } from '../services/notification.service.js';

/**
 * @desc    Get comments for a post (top-level + nested replies)
 * @route   GET /api/posts/:id/comments
 * @access  Public
 */
export const getCommentsByPost = async (req, res) => {
  try {
    // Fetch all comments for this post (both top-level and replies)
    const allComments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', '_id username displayName avatarUrl');

    // Build a tree: top-level comments with nested replies
    const topLevel = [];
    const replyMap = {};

    allComments.forEach((c) => {
      const comment = c.toObject();
      comment.replies = [];
      if (!comment.parentComment) {
        topLevel.push(comment);
      } else {
        const parentId = comment.parentComment.toString();
        if (!replyMap[parentId]) replyMap[parentId] = [];
        replyMap[parentId].push(comment);
      }
    });

    // Attach replies to their parents
    topLevel.forEach((c) => {
      c.replies = replyMap[c._id.toString()] || [];
    });

    res.json({
      success: true,
      data: topLevel,
      total: allComments.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving comments',
    });
  }
};

/**
 * @desc    Add a comment (or reply) to a post
 * @route   POST /api/posts/:id/comments
 * @access  Private
 */
export const addComment = async (req, res) => {
  try {
    const { text, parentComment } = req.body;
    const postId = req.params.id;

    // Get uploaded media file if any
    let mediaUrl = '';
    if (req.file) {
      mediaUrl = await StorageService.uploadFile(req.file, 'comments');
    }

    if (!text && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Comment must have text or media',
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // If replying, validate parent comment exists
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found',
        });
      }
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      text: text || '',
      mediaUrl,
      parentComment: parentComment || null,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      '_id username displayName avatarUrl'
    );

    if (post.author.toString() !== req.user._id.toString()) {
      createNotification({
        recipient: post.author,
        actor: req.user._id,
        type: 'comment',
        post: post._id,
        comment: comment._id,
      });
    }

    const result = populatedComment.toObject();
    result.replies = [];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error adding comment',
    });
  }
};

/**
 * @desc    Like a comment (toggle)
 * @route   POST /api/comments/:id/like
 * @access  Private
 */
export const likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = comment.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      // Remove like
      comment.likes = comment.likes.filter((id) => id.toString() !== userId);
    } else {
      // Add like and remove dislike if present
      comment.likes.push(req.user._id);
      comment.dislikes = comment.dislikes.filter((id) => id.toString() !== userId);
    }

    await comment.save();

    if (comment.likes.some((id) => id.toString() === userId)) {
      createNotification({
        recipient: comment.author,
        actor: req.user._id,
        type: 'comment_like',
        post: comment.post,
        comment: comment._id,
      });
    }

    res.json({
      success: true,
      data: { likes: comment.likes, dislikes: comment.dislikes },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error liking comment' });
  }
};

/**
 * @desc    Dislike a comment (toggle)
 * @route   POST /api/comments/:id/dislike
 * @access  Private
 */
export const dislikeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    const alreadyDisliked = comment.dislikes.some((id) => id.toString() === userId);

    if (alreadyDisliked) {
      comment.dislikes = comment.dislikes.filter((id) => id.toString() !== userId);
    } else {
      comment.dislikes.push(req.user._id);
      comment.likes = comment.likes.filter((id) => id.toString() !== userId);
    }

    await comment.save();

    res.json({
      success: true,
      data: { likes: comment.likes, dislikes: comment.dislikes },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error disliking comment' });
  }
};

/**
 * @desc    Delete own comment
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check ownership
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'User not authorized to delete this comment',
      });
    }

    // Also delete all replies to this comment
    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting comment',
    });
  }
};

