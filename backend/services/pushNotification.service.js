import webpush from 'web-push';
import User from '../models/User.js';

// Configure Web Push VAPID details
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@oravia.co.in';

if (publicVapidKey && privateVapidKey) {
  try {
    webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
  } catch (err) {
    console.error('Failed to initialize web-push VAPID details:', err.message);
  }
}

/**
 * Sends Web Push Notification to a user across all their active devices asynchronously.
 * ZERO-LOAD & NON-BLOCKING:
 * - Runs in background using setImmediate so calling API does NOT wait.
 * - Automatically removes expired / invalid subscription tokens (HTTP 410 / 404).
 * 
 * @param {string|ObjectId} userId - Recipient User ID
 * @param {object} notificationPayload - { title, body, icon, url, data }
 */
export const sendPushNotification = (userId, notificationPayload) => {
  if (!publicVapidKey || !privateVapidKey) {
    return;
  }

  // Execute asynchronously in background without blocking the main event loop
  setImmediate(async () => {
    try {
      const user = await User.findById(userId).select('pushSubscriptions');
      if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return;
      }

      const payload = JSON.stringify({
        title: notificationPayload.title || 'Oravia',
        body: notificationPayload.body || 'You have a new notification!',
        icon: notificationPayload.icon || 'https://oravia.co.in/icon-192x192.png',
        url: notificationPayload.url || 'https://oravia.co.in/notifications',
        data: notificationPayload.data || {},
      });

      const expiredEndpoints = [];

      // Send to all registered devices of the user
      await Promise.all(
        user.pushSubscriptions.map(async (sub) => {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            };
            await webpush.sendNotification(pushSubscription, payload);
          } catch (err) {
            // Status code 410 (Gone) or 404 (Not Found) means the push token is expired/unsubscribed
            if (err.statusCode === 410 || err.statusCode === 404) {
              expiredEndpoints.push(sub.endpoint);
            }
          }
        })
      );

      // Clean up expired tokens to keep database lean and fast
      if (expiredEndpoints.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } },
        });
      }
    } catch (error) {
      console.error('Error sending push notification:', error.message);
    }
  });
};
