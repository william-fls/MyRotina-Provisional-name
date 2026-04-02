const CACHE_NAME = 'minha-rotina-v2';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './scripts/core/theme.js',
  './scripts/pages/settings.js',
  './scripts/pages/missions.js',
  './scripts/pages/dashboard.js',
  './scripts/pages/tasks.js',
  './scripts/pages/stats.js',
  './scripts/pages/ai.js',
  './scripts/pages/fitness.js',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './icons/app-badge.svg',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => null)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      return cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const targetUrl = new URL('./index.html', self.registration.scope).href;
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
