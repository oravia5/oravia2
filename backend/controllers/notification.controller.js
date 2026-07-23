import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../services/notification.service.js';

export const fetchNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const data = await getNotifications(req.user._id, page, limit);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

export const fetchUnreadCount = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user._id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Server error fetching unread count' });
  }
};

export const readNotification = async (req, res) => {
  try {
    await markAsRead(req.params.id, req.user._id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
};

export const readAllNotifications = async (req, res) => {
  try {
    await markAllAsRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error marking all notifications as read' });
  }
};

export const getVapidPublicKey = (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || '' });
};

export const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: 'Invalid subscription payload' });
    }

    const user = req.user;
    // Check if subscription already exists
    const existingIndex = user.pushSubscriptions.findIndex(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (existingIndex > -1) {
      user.pushSubscriptions[existingIndex].keys = subscription.keys;
    } else {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      });
    }

    await user.save();
    res.json({ success: true, message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to subscribe to push notifications' });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      req.user.pushSubscriptions = req.user.pushSubscriptions.filter(
        (sub) => sub.endpoint !== endpoint
      );
      await req.user.save();
    }
    res.json({ success: true, message: 'Push subscription removed successfully' });
  } catch (error) {
    console.error('Error unsubscribing push notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to unsubscribe push notifications' });
  }
};

