/// <reference lib="webworker" />

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) return {};
  try {
    return event.data.json() as PushPayload;
  } catch {
    const t = event.data.text();
    return t ? { body: t } : {};
  }
}

self.addEventListener('push', (event: PushEvent) => {
  const payload = parsePushPayload(event);
  const title = payload.title?.trim() || 'Oasis';
  const body = payload.body?.trim() || '';
  const openPath = payload.url?.startsWith('/') ? payload.url : '/dashboard';
  const tag = payload.tag?.trim() || 'oasis-default';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body || 'You have a new update.',
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      tag,
      renotify: true,
      data: { url: openPath },
      vibrate: [120, 40, 120],
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const raw = event.notification.data?.url;
  const path = typeof raw === 'string' && raw.startsWith('/') ? raw : '/dashboard';
  const urlToOpen = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin)) {
          const w = client as WindowClient;
          if (typeof w.navigate === 'function') {
            try {
              await w.navigate(urlToOpen);
            } catch {
              // ignore navigate failures; focus still helps
            }
          }
          return w.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })(),
  );
});
