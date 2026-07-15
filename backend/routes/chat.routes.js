import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
  issueToken,
  getConversations,
  startConversation,
  updateConversation,
  searchUsers,
  uploadChatMedia,
  getStickers,
} from '../controllers/chat.controller.js';

const router = Router();

router.get('/token', protect, issueToken);
router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, startConversation);
router.put('/conversations', protect, updateConversation);
router.get('/users/search', protect, searchUsers);
router.post('/upload', protect, upload.single('media'), uploadChatMedia);
router.get('/stickers', protect, getStickers);

export default router;
