const CACHE_NAME = 'eec-v1';

const FILES = [
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/form.css',
  './css/preview.css',
  './css/components.css',
  './js/app.js',
  './js/config.js',
  './js/generator.js',
  './js/ui.js',
  './js/download.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// ── Install ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .catch(err => console.warn('[SW] Partial cache on install:', err))
  );
  self.skipWaiting();
});

// ── Fetch — cache-first ───────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Activate ──────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter(k => k !== CACHE_NAME);

    await Promise.all(stale.map(k => caches.delete(k)));
    await self.clients.claim();

    if (stale.length > 0) {
      const all = await self.clients.matchAll({ includeUncontrolled: true });
      all.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
    }
  })());
});

// ── Message — handle SKIP_WAITING from client ─────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
