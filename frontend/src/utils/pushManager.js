import client from '../api/client';

// Convert VAPID base64 string to Uint8Array required by browser pushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register Service Worker and Subscribe User to Web Push
 */
export async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    // Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    await registration.update();

    // Check Notification Permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return false;
    }

    // Fetch VAPID Public Key from backend
    const res = await client.get('/notifications/vapid-public-key');
    const vapidPublicKey = res.data.publicKey;

    if (!vapidPublicKey) {
      return false;
    }

    // Subscribe user to Push Manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Send subscription object to backend
    await client.post('/notifications/subscribe-push', { subscription });
    return true;
  } catch (error) {
    console.error('Push notification registration failed:', error);
    return false;
  }
}
