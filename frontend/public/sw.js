/* Oravia Web Push Service Worker */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Oravia';
    const options = {
      body: data.body || 'You have a new update!',
      icon: data.icon || '/oravia_icon.png',
      badge: '/oravia_icon.png',
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
