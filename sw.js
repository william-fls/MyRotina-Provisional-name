const ASSET_VERSION = '2026-04-03-v5';
const CACHE_NAME = `minha-rotina-${ASSET_VERSION}`;
const OFFLINE_FALLBACK = './index.html';
const CORE_ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './scripts/core/theme.js',
  './scripts/pages/settings.js',
  './scripts/pages/dashboard.js',
  './scripts/pages/tasks.js',
  './scripts/pages/stats.js',
  './scripts/pages/ai.js',
  './scripts/pages/fitness.js',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './icons/app-badge.svg',
];
const APP_SHELL = [
  './',
  ...CORE_ASSETS,
  ...CORE_ASSETS.map(asset => `${asset}?v=${ASSET_VERSION}`),
];

function shouldUseNetworkFirst(request) {
  return request.mode === 'navigate'
    || ['document', 'script', 'style', 'manifest'].includes(request.destination);
}

async function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    return cacheResponse(request, response);
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_FALLBACK);
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then(response => cacheResponse(request, response))
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_FALLBACK);
  }

  return Response.error();
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = APP_SHELL.map(asset => new Request(asset, { cache: 'reload' }));
      await cache.addAll(requests);
    } catch {
      return null;
    }
    return null;
  })());
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

  event.respondWith(
    shouldUseNetworkFirst(event.request)
      ? networkFirst(event.request)
      : staleWhileRevalidate(event.request)
  );
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
