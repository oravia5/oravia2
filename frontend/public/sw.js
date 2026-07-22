const CACHE_NAME = 'oravia-static-v4';
const API_CACHE_NAME = 'oravia-api-v3';

// Static files to cache immediately on installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.png'
];

// Install Event - Pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Custom caching strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests (Likes, comments, uploads cannot be cached)
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy A: API Feed Requests (Network First, Cache Fallback)
  if (requestUrl.pathname.includes('/api/posts/feed') || 
      requestUrl.pathname.includes('/api/reels') || 
      requestUrl.pathname.includes('/api/posts/near-you')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, clone it and save to API Cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed (offline). Return the cached JSON response.
          console.log('[Service Worker] Serving cached API response offline:', requestUrl.pathname);
          return caches.match(event.request);
        })
    );
    return;
  }

  // Any other /api/ request (users, follow/unfollow, notifications, comments,
  // messages, etc.) is dynamic/personalized data. Never cache-first these —
  // that was causing stale data (e.g. Follow button needing two clicks
  // because the refetch after following was served from a stale cache).
  // Let the browser handle these directly, network-only.
  if (requestUrl.pathname.includes('/api/')) {
    return;
  }

  // Strategy B: Static Assets & Media (Cache First, Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache immediately, fetch updated asset in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Ignore background fetch errors when offline
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network and save to cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache all local static chunks and images
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return networkResponse;
      });
    })
  );
});
