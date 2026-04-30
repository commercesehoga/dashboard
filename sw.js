const CACHE_NAME = 'thunderstudy-v1';
const CACHE_FIRST = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Install — cache core assets
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_FIRST).catch(function () {
        // Silently fail if some assets can't cache (cross-origin etc)
      });
    })
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first for API calls, cache first for assets
self.addEventListener('fetch', function (e) {
  const url = e.request.url;

  // Always go network for Google APIs, Firebase, Sheet scripts
  if (
    url.includes('script.google.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com/identitytoolkit') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googletagmanager') ||
    url.includes('gstatic.com/firebasejs')
  ) {
    return; // Let browser handle normally
  }

  // Cache first for everything else
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        // Cache successful GET requests
        if (
          e.request.method === 'GET' &&
          response &&
          response.status === 200 &&
          response.type !== 'opaque'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function () {
        // Offline fallback — return cached index.html
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
