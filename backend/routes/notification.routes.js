import express from 'express';
import {
  fetchNotifications,
  fetchUnreadCount,
  readNotification,
  readAllNotifications,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
} from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe-push', protect, subscribePush);
router.post('/unsubscribe-push', protect, unsubscribePush);

router.get('/', protect, fetchNotifications);
router.get('/unread-count', protect, fetchUnreadCount);
router.put('/:id/read', protect, readNotification);
router.put('/read-all', protect, readAllNotifications);

export default router;

