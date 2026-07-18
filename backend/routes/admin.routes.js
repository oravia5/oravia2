import express from 'express';
import { protect, admin } from '../middleware/auth.middleware.js';
import {
  getStats,
  getAllUsers,
  toggleUserBan,
  toggleUserVerification,
  getAllPosts,
  deletePost
} from '../controllers/admin.controller.js';

const router = express.Router();

// Secure all admin endpoints with protect (authenticated user) and admin check
router.use(protect, admin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id/ban', toggleUserBan);
router.put('/users/:id/verify', toggleUserVerification);
router.get('/posts', getAllPosts);
router.delete('/posts/:id', deletePost);

export default router;
