import webpush from 'web-push';
import User from '../models/User.js';

// Lazy VAPID initialization flag — env vars are NOT available at import time
// because dotenv.config() runs AFTER ES module imports in server.js.
let vapidInitialized = false;

function ensureVapidInit() {
  if (vapidInitialized) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@oravia.co.in';
  if (!publicKey || !privateKey) {
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidInitialized = true;
    console.log('Web Push VAPID initialized successfully');
    return true;
  } catch (err) {
    console.error('Failed to initialize web-push VAPID details:', err.message);
    return false;
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
  // Execute asynchronously in background without blocking the main event loop
  setImmediate(async () => {
    try {
      if (!ensureVapidInit()) {
        return;
      }

      const user = await User.findById(userId).select('pushSubscriptions');
      if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return;
      }

      const formatUrl = (url, fallback) => {
        if (!url) return fallback;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/')) return `https://oravia.co.in${url}`;
        return `https://oravia.co.in/${url}`;
      };

      const payload = JSON.stringify({
        title: notificationPayload.title || 'Oravia',
        body: notificationPayload.body || 'You have a new notification!',
        icon: formatUrl(notificationPayload.icon, 'https://oravia.co.in/logo192.png'),
        image: notificationPayload.image ? formatUrl(notificationPayload.image, null) : null,
        url: formatUrl(notificationPayload.url, 'https://oravia.co.in/notifications'),
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

