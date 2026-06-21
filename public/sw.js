// Dilz service worker — handles Web Push notifications

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.title || 'Dilz — New deal!';
  const options = {
    body:    data.body  || 'A new deal matches your alert.',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    tag:     data.url   || 'dilz-notification',
    renotify: true,
    data:    { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
