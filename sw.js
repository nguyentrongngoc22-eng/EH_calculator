/* EH Calculator service worker — v3.1
   Strategy: network-first for everything, cache only as an offline fallback.
   This is the opposite of a cache-first worker: the app can never get stuck
   on an old build, but it still opens with no network. */

const CACHE = 'eh-calc-v3.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  // Take over immediately instead of waiting for every tab to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .catch(() => {})   // a missing icon must not abort the install
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Delete every cache from earlier versions, whatever it was named.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});

// Lets the page trigger an immediate takeover after an update is found.
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
