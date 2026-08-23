const CACHE_NAME = 'beatgarden-shell-v5';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icons/beatgarden.svg',
  './icons/beatgarden-192.png', './icons/beatgarden-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })));
    const index = await fetch(new Request('./index.html', { cache: 'reload' }));
    const html = await index.text();
    const entryAssets = extractPrecacheAssets(html)
      .map((value) => new URL(value, self.registration.scope).href)
      .filter((url) => new URL(url).origin === self.location.origin);
    await cache.addAll(entryAssets.map((url) => new Request(url, { cache: 'reload' })));
  })());
  self.skipWaiting();
});

function extractPrecacheAssets(html) {
  const assets = [];
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag = match[0];
    const attributes = Object.fromEntries([...tag.matchAll(/([^\s=]+)\s*=\s*["']([^"']*)["']/g)]
      .map((attribute) => [attribute[1].toLowerCase(), attribute[2]]));
    if (match[1].toLowerCase() === 'script' && attributes.src) assets.push(attributes.src);
    if (match[1].toLowerCase() === 'link' && attributes.rel?.split(/\s+/).includes('modulepreload') && attributes.href) assets.push(attributes.href);
  }
  return [...new Set(assets)];
}

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

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'WARM_RUNNING_CACHE' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((value) => {
    if (typeof value !== 'string') return false;
    const url = new URL(value, self.registration.scope);
    return url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname) && url.pathname.includes('/assets/');
  });
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(urls.map(async (url) => {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    }));
  })());
});
