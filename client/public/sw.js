// LiveLock Service Worker
// Caches the app shell for offline access and fast loading

const CACHE_NAME = 'livelock-shell-v1';

// App shell resources to cache on install
const SHELL_URLS = [
  '/',
  '/manifest.json',
];

// Install: cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always go to network for API, tRPC, OAuth, socket.io, and storage proxy
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/manus-storage/')
  ) {
    return; // Let the browser handle it normally
  }

  // For navigation requests (HTML pages), use network-first with shell fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((cached) => cached || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // For everything else: cache-first, then network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses for static assets
        if (
          event.request.method === 'GET' &&
          response.status === 200 &&
          (url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/) ||
            url.pathname.startsWith('/assets/'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Push notifications (Phase 3 — placeholder)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'LiveLock', {
      body: data.body || 'You have a new verification request.',
      icon: '/manus-storage/icon-192x192_4868ddd0.png',
      badge: '/manus-storage/icon-144x144_ef79dc1d.png',
      tag: 'livelock-verification',
      requireInteraction: true,
      data: { url: data.url || '/app/verify' },
    })
  );
});

// Notification click: open the app to the right screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/app/verify';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
