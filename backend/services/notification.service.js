import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendPushNotification } from './pushNotification.service.js';

export const createNotification = async ({ recipient, actor, type, post, comment }) => {
  if (!recipient || !actor || !type) {
    console.error('Notification missing required fields:', { recipient, actor, type });
    return null;
  }

  if (recipient.toString() === actor.toString()) return null;

  try {
    const notification = await Notification.create({ recipient, actor, type, post, comment });

    // ASYNC NON-BLOCKING PUSH NOTIFICATION (0ms impact on main DB response)
    setImmediate(async () => {
      try {
        const actorUser = await User.findById(actor).select('displayName username avatarUrl');
        const actorName = actorUser ? (actorUser.displayName || `@${actorUser.username}`) : 'Someone';

        let title = 'Oravia';
        let body = `${actorName} interacted with you`;
        let targetUrl = 'https://oravia.co.in/notifications';

        if (type === 'like') {
          body = `${actorName} liked your post ❤️`;
        } else if (type === 'comment') {
          body = `${actorName} commented on your post 💬`;
        } else if (type === 'follow') {
          body = `${actorName} started following you 👤`;
          targetUrl = `https://oravia.co.in/profile/${actorUser?.username || ''}`;
        } else if (type === 'comment_like') {
          body = `${actorName} liked your comment 👍`;
        } else if (type === 'share') {
          body = `${actorName} shared your post 🔄`;
        }

        sendPushNotification(recipient, {
          title,
          body,
          icon: actorUser?.avatarUrl || 'https://oravia.co.in/icon-192x192.png',
          url: targetUrl,
        });
      } catch (pushErr) {
        console.error('Error triggering push notification:', pushErr.message);
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const markAsRead = async (notificationId, userId) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

export const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ recipient: userId, read: false });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

export const getNotifications = async (userId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', '_id username displayName avatarUrl')
      .populate('post', '_id mediaUrl thumbnailUrl type')
      .populate('comment', '_id text');

    const total = await Notification.countDocuments({ recipient: userId });
    const unread = await Notification.countDocuments({ recipient: userId, read: false });

    return { notifications, total, unread, page, limit };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [], total: 0, unread: 0, page: 1, limit: 20 };
  }
};

export const deleteFollowNotification = async (recipient, actor) => {
  if (!recipient || !actor) return;
  try {
    await Notification.deleteMany({
      recipient,
      actor,
      type: 'follow',
    });
  } catch (error) {
    console.error('Error deleting follow notification:', error);
  }
};
