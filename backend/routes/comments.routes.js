import express from 'express';
import {
  getCommentsByPost,
  addComment,
  deleteComment,
  likeComment,
  dislikeComment,
} from '../controllers/comments.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Get and post comments are nested under posts
router.get('/posts/:id/comments', getCommentsByPost);
router.post('/posts/:id/comments', protect, upload.single('commentMedia'), addComment);

// Comment reactions
router.post('/comments/:id/like', protect, likeComment);
router.post('/comments/:id/dislike', protect, dislikeComment);

// Comment deletion is direct
router.delete('/comments/:id', protect, deleteComment);

export default router;
