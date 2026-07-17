import express from 'express';
import {
  getFeed,
  getFollowingFeed,
  getNearYouFeed,
  createPost,
  getPostById,
  deletePost,
  likePost,
  dislikePost,
  savePost,
  unsavePost,
  sharePost,
  getPosts,
  getPostsByHashtag,
  getPostsByLocation,
  searchPosts,
  updatePost,
  archivePost,
  unarchivePost,
} from '../controllers/posts.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { validateUploadLimit, postUpload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/', protect, getPosts);
router.get('/feed', optionalAuth, getFeed);
router.get('/following', protect, getFollowingFeed);
router.get('/near-you', optionalAuth, getNearYouFeed);
router.get('/tag/:tag', getPostsByHashtag);
router.get('/location-feed/:location', getPostsByLocation);
router.get('/search-posts', protect, searchPosts);
router.post('/', protect, postUpload, validateUploadLimit, createPost);
router.get('/:id', getPostById);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/dislike', protect, dislikePost);
router.post('/:id/save', protect, savePost);
router.post('/:id/unsave', protect, unsavePost);
router.put('/:id', protect, postUpload, updatePost);
router.post('/:id/archive', protect, archivePost);
router.post('/:id/unarchive', protect, unarchivePost);
router.post('/:id/share', sharePost);

export default router;
