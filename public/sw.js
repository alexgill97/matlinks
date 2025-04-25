// Service Worker for MatLinks
const CACHE_NAME = 'matlinks-cache-v1';
const API_CACHE_NAME = 'matlinks-api-cache-v1';

// Assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/profile',
  '/auth/signin',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html' // Fallback page when offline
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Precaching app assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip Supabase API requests (will be handled separately)
  if (event.request.url.includes('supabase.co')) {
    // For API requests, use a network-first strategy
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if available
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If API request fails and no cache, return generic error response
            return new Response(JSON.stringify({ error: 'Network error', is_offline: true }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            });
          });
        })
    );
    return;
  }
  
  // For other assets, use a cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Cache a clone of the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          
          return response;
        })
        .catch(() => {
          // If request is for a page, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          
          // Otherwise just return a generic error
          return new Response('Network error', { status: 503 });
        });
    })
  );
});

// Background sync for offline check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncCheckIns());
  }
});

// Function to sync check-ins from IndexedDB or localStorage
async function syncCheckIns() {
  // This is a placeholder - actual implementation would access stored check-ins
  // and submit them to the server
  console.log('Background syncing check-ins');
  
  const localStorageCheckIns = localStorage.getItem('matlinks_offline_checkins');
  if (localStorageCheckIns) {
    try {
      const checkIns = JSON.parse(localStorageCheckIns);
      console.log('Found pending check-ins:', checkIns.length);
      
      // Process each check-in
      // This would be replaced with actual API calls
      
      // Clear stored check-ins after successful sync
      // localStorage.removeItem('matlinks_offline_checkins');
      
      // Send notification 
      self.registration.showNotification('MatLinks', {
        body: `Successfully synced ${checkIns.length} offline check-ins`,
        icon: '/icon-192x192.png'
      });
      
    } catch (e) {
      console.error('Error syncing check-ins:', e);
    }
  }
} 