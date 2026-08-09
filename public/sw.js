const CACHE_NAME = 'beatgarden-shell-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icons/beatgarden.svg',
  './icons/beatgarden-192.png', './icons/beatgarden-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          const requestCopy = response.clone();
          const canonicalCopy = response.clone();
          const cache = await caches.open(CACHE_NAME);
          // The response promise remains pending until both writes complete,
          // contractually keeping the worker alive for the canonical refresh.
          await Promise.all([
            cache.put(event.request, requestCopy),
            cache.put('./index.html', canonicalCopy),
          ]);
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match('./index.html'))),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
