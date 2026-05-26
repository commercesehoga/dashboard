const CACHE_NAME = 'thunderstudy-v12'; // bump this every update
const CACHE_FIRST = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FIRST).catch(function() {});
    })
  );
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
  // ── NOTIFY ALL OPEN TABS that new version is live
  self.clients.matchAll({ type: 'window' }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'TS_UPDATE_READY' });
    });
  });
});

self.addEventListener('fetch', function(e) {
  const url = e.request.url;
  if (
    url.includes('script.google.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com/identitytoolkit') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googletagmanager') ||
    url.includes('gstatic.com/firebasejs')
  ) { return; }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (
          e.request.method === 'GET' &&
          response && response.status === 200 &&
          response.type !== 'opaque'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ══════════════════════════════════════════
   FCM PUSH NOTIFICATIONS
   Firebase Messaging (compat) for background push
══════════════════════════════════════════ */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAoxORpjq2kIED1hBNAQ2MGJEWlwQ3FCJA",
  authDomain: "thunderstudy.firebaseapp.com",
  projectId: "thunderstudy",
  storageBucket: "thunderstudy.firebasestorage.app",
  messagingSenderId: "83506167126",
  appId: "1:83506167126:web:9b3e7017ba871103672af7"
});

const messaging = firebase.messaging();

// ── Background push: app is closed or in background
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Background push received:', payload);

  const title = (payload.notification && payload.notification.title) || 'Thunderstudy';
  const body  = (payload.notification && payload.notification.body)  || 'You have a new notice.';
  const icon  = (payload.notification && payload.notification.icon)  || './favicon.svg';
  const data  = payload.data || {};

  self.registration.showNotification(title, {
    body:    body,
    icon:    icon,
    badge:   './favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag:     'ts-notice-' + (data.noticeId || Date.now()),
    renotify: true,
    data:    data
  });
});

// ── Notification click → open / focus the app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  const targetUrl = 'https://commercesehoga.github.io/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      // If app tab is already open, just focus it
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes('commercesehoga.github.io') && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
