// Simple PWA Service Worker for MoonTV
const CACHE_NAME = 'moontv-v1';
const STATIC_CACHE = 'moontv-static-v1';
const DYNAMIC_CACHE = 'moontv-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('PWA: Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('PWA: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('PWA: Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('PWA: Service Worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('PWA: Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('PWA: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('PWA: Service Worker activated successfully');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('PWA: Service Worker activation failed:', error);
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname === '/' || url.pathname.startsWith('/_next/')) {
    // For app routes, try network first, then cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
  } else if (url.pathname.startsWith('/api/')) {
    // For API requests, try network first, then cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
    // For images, try cache first, then network
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  } else {
    // For other static files, try cache first, then network
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request);
        })
    );
  }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  console.log('PWA: Background sync triggered:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('PWA: Push notification received');
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New content available',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'MoonTV', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('PWA: Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    console.log('PWA: Performing background sync');
    // Add any background sync logic here
    return Promise.resolve();
  } catch (error) {
    console.error('PWA: Background sync failed:', error);
    return Promise.reject(error);
  }
}

// Lock screen cover update function
async function updateLockScreenCover(imageUrl, title) {
  try {
    console.log('PWA: Updating lock screen cover:', title);
    
    // For iOS, we can't directly update the lock screen
    // But we can store the current playing info for potential use
    const currentPlaying = {
      title,
      imageUrl,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB or cache for potential use
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.put('/current-playing', new Response(JSON.stringify(currentPlaying)));
    
    return true;
  } catch (error) {
    console.error('PWA: Failed to update lock screen cover:', error);
    return false;
  }
}

// Expose updateLockScreenCover function to clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_LOCK_SCREEN_COVER') {
    event.waitUntil(
      updateLockScreenCover(event.data.imageUrl, event.data.title)
        .then((success) => {
          event.ports[0].postMessage({ success });
        })
    );
  }
});

console.log('PWA: Service Worker script loaded');
