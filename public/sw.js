const CACHE_NAME = 'webtoon-cache-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Skip intercepting API and Supabase calls to avoid "Failed to fetch" errors during auth
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api') || url.pathname.includes('supabase')) {
        return;
    }

    // Cache Strategy: Cache-First for Webtoon Images (R2 or Supabase Storage)
    if (url.pathname.includes('/storage/v1/') || url.hostname.includes('r2.cloudflarestorage') || url.hostname.includes('mytoon.site')) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    // Return cached if exists, otherwise wait for network
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // For all other requests, attempt network first, fallback to cache
    event.respondWith(
        (async () => {
            try {
                return await fetch(event.request);
            } catch (error) {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;
                throw error;
            }
        })()
    );
});
