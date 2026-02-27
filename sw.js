/* Simple service worker for runtime caching
   - HTML: network-first (stale fallback)
   - CSS/JS/Images/Fonts: cache-first with long lifetime
*/
const CACHE_VERSION = 'v2';
const RUNTIME = `edikt-runtime-${CACHE_VERSION}`;
const PRECACHE = `edikt-precache-${CACHE_VERSION}`;
// Keep precache minimal: main CSS + main JS and the hero image
const PRECACHE_URLS = [
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/header.js',
  '/build.js',
  '/assets/js/script.js',
  '/assets/images/orbit_section/Glode image Circle Animation.webp'
];
const IMAGE_CACHE = `edikt-images-${CACHE_VERSION}`;
const IMAGE_CACHE_MAX_ENTRIES = 60; // keep at most 60 images cached

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // On activation: aggressively clear all caches and unregister this SW
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (e) {
      /* ignore */
    }
    try {
      await self.registration.unregister();
    } catch (e) {
      /* ignore */
    }
    try { await self.clients.claim(); } catch (e) { /* ignore */ }
  })());
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
}

self.addEventListener('fetch', event => {
  const req = event.request;

  // Network-first for navigations (HTML)
  if (isNavigationRequest(req)) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Image runtime cache (cache-first, bounded)
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(req).then(cached => {
          if (cached) return cached;
          return fetch(req).then(networkRes => {
            try {
              cache.put(req, networkRes.clone());
              // trim cache to limit entries
              trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX_ENTRIES);
            } catch (e) { /* ignore quota errors */ }
            return networkRes;
          }).catch(() => caches.match('/index.html'));
        })
      )
    );
    return;
  }

  // Cache-first for other static assets (CSS/JS/Fonts)
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(networkRes => {
      if (!networkRes || networkRes.status !== 200) return networkRes;
      const copy = networkRes.clone();
      caches.open(RUNTIME).then(cache => cache.put(req, copy));
      return networkRes;
    }).catch(() => caches.match('/index.html')))
  );
});

// Simple cache trimming helper: delete oldest entries until <= maxItems
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length <= maxItems) return;
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        cache.delete(keys[i]);
      }
    });
  }).catch(() => {});
}
