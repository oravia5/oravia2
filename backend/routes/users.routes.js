import express from 'express';
import {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  changePassword,
  blockUser,
  unblockUser,
} from '../controllers/users.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { validateUploadLimit, profileUpload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/search', searchUsers);
router.post('/change-password', protect, changePassword);
router.get('/:username', optionalAuth, getUserProfile);
router.put('/me', protect, profileUpload, validateUploadLimit, updateProfile);
router.post('/:id/follow', protect, followUser);
router.post('/:id/unfollow', protect, unfollowUser);
router.post('/:id/block', protect, blockUser);
router.post('/:id/unblock', protect, unblockUser);
router.get('/:id/followers', getUserFollowers);
router.get('/:id/following', getUserFollowing);

export default router;
