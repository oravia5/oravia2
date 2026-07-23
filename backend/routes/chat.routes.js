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
  getUnreadChatCount,
  markConversationRead,
} from '../controllers/chat.controller.js';

const router = Router();

router.get('/token', protect, issueToken);
router.get('/conversations', protect, getConversations);
router.post('/conversations', protect, startConversation);
router.post('/conversations/update', protect, updateConversation);
router.put('/conversations', protect, updateConversation);
router.get('/unread-count', protect, getUnreadChatCount);
router.put('/mark-read', protect, markConversationRead);
router.get('/users/search', protect, searchUsers);
router.post('/upload', protect, upload.single('media'), uploadChatMedia);
router.get('/stickers', protect, getStickers);

export default router;
