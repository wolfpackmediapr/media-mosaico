
// Service Worker for offline capabilities

const CACHE_NAME = 'app-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip browser extensions and requests with basic auth
  if (
    event.request.url.startsWith('chrome-extension') ||
    event.request.url.includes('extension') ||
    event.request.url.includes('/_/') ||
    event.request.headers.has('range')
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();
        
        // Open the cache
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Add response to cache
            cache.put(event.request, responseClone);
          });
        
        return response;
      })
      .catch(() => caches.match(event.request)
        .then((cachedResponse) => {
          // Return cached response if available
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If the request is for an HTML page, return the offline page
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
        })
      )
  );
});
