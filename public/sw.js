const CACHE_NAME = 'fichajes-app-v1';

// Archivos estáticos a pre-cachear
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/favicon.png',
];

// ── Instalación: pre-cachear activos estáticos ──────────────────────
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// ── Activación: limpiar caches viejas ───────────────────────────────
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// ── Fetch: Network-first con fallback a cache ────────────────────────
self.addEventListener('fetch', function (event) {
    // Solo interceptar peticiones GET
    if (event.request.method !== 'GET') return;

    // No interceptar rutas de API
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then(function (response) {
                // Cachear respuesta válida
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(function () {
                // Sin red: servir desde cache
                return caches.match(event.request);
            })
    );
});

// ── Push notifications ───────────────────────────────────────────────
self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/icon-192.png',
            badge: '/favicon.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: '2',
                url: data.url
            }
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// ── Notification click ───────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
    console.log('Notification click received.');
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
