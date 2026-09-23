// sw.js
// Service Worker for Classic Arcade (Allan's 70th Birthday Retro Collection)
// Enables PWA installability and offline asset caching

const CACHE_NAME = 'classic-arcade-v1.5.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/qrcode.min.js',
  './src/main.js',
  './src/version.js',
  './src/utils/Draw.js',
  './src/utils/ProfanityFilter.js',
  './src/systems/AudioManager.js',
  './src/systems/Storage.js',
  './src/systems/NetworkManager.js',
  './src/systems/LeaderboardService.js',
  './src/scenes/Boot.js',
  './src/scenes/Splash.js',
  './src/scenes/GameSelect.js',
  './src/scenes/MultiplayerLobby.js',
  './src/scenes/MultiplayerTanks.js',
  './src/scenes/MultiplayerPong.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache asset fetch failure (harmless in dev):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for app shell assets
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip API or dynamic endpoints
  if (url.pathname.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached, and revalidate in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // If offline and request is HTML, return root
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
