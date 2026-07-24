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

        let postMedia = null;
        if (post) {
          try {
            const PostModel = (await import('../models/Post.js')).default;
            const postObj = await PostModel.findById(post).select('mediaUrl thumbnailUrl mediaItems type').lean();
            if (postObj) {
              postMedia = postObj.thumbnailUrl || postObj.mediaUrl || (postObj.mediaItems && postObj.mediaItems[0] ? (postObj.mediaItems[0].thumbnailUrl || postObj.mediaItems[0].url) : null);
            }
          } catch (e) {
            console.error('Error fetching post media for push:', e);
          }
        }

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
        } else if (type === 'suggested_creator') {
          title = '✨ Creator Recommendation';
          body = `Check out ${actorName}'s latest posts & downloadable assets! 👤`;
          targetUrl = `https://oravia.co.in/profile/${actorUser?.username || ''}`;
        }

        sendPushNotification(recipient, {
          title,
          body,
          icon: actorUser?.avatarUrl || 'https://oravia.co.in/logo192.png', // Sender's profile picture
          image: postMedia || null, // Big photo/video preview thumbnail
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

export const checkAndCreateSuggestedCreatorNotification = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (user.lastSuggestedNotifAt && user.lastSuggestedNotifAt > twentyFourHoursAgo) {
      return;
    }

    const excludeIds = [user._id, ...(user.following || []), ...(user.blockedUsers || [])];

    const randomCreators = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $sample: { size: 1 } },
      { $project: { _id: 1, username: 1, displayName: 1, avatarUrl: 1 } }
    ]);

    if (!randomCreators || randomCreators.length === 0) return;

    const suggestedCreator = randomCreators[0];

    await createNotification({
      recipient: user._id,
      actor: suggestedCreator._id,
      type: 'suggested_creator'
    });

    user.lastSuggestedNotifAt = new Date();
    await user.save();
  } catch (err) {
    console.error('Error creating suggested creator notification:', err);
  }
};

