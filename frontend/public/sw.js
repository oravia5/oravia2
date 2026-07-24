/* Oravia Web Push Service Worker */

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Oravia';
    const options = {
      body: data.body || 'You have a new update!',
      icon: data.icon || 'https://oravia.co.in/logo192.png',
      badge: 'https://oravia.co.in/logo192.png',
      image: data.image || null, // Big photo/video thumbnail preview
      vibrate: [100, 50, 100],
      data: {
        url: data.url || 'https://oravia.co.in/notifications',
      },
      actions: [
        { action: 'open', title: 'Open Oravia' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : 'https://oravia.co.in/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
