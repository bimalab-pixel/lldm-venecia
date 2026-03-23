const CACHE_NAME = 'venecia-stats-v6';

const LOCAL_ASSETS = [
  './index.html',
  './CENSOLLDM.html',
  './manifest.json',
  './logo-venecia-192.png',
  './logo-venecia-512.png',
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js'
];

// 1. Instalación: cachea locales primero (crítico), luego CDN (opcional)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Archivos locales: DEBEN cachearse para que la app funcione offline
      await cache.addAll(LOCAL_ASSETS);
      console.log('[SW] Archivos locales cacheados ✓');

      // CDN: se intenta cachear pero si falla no bloquea la instalación
      await Promise.all(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: 'cors' })
            .then(res => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(err => console.warn(`[SW] CDN no cacheado: ${url}`, err))
        )
      );
      console.log('[SW] Instalación completa ✓');
    })
  );
  self.skipWaiting();
});

// 2. Activación: elimina cachés de versiones anteriores
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Borrando caché antigua:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// 3. Fetch: Cache First con actualización en background
self.addEventListener('fetch', e => {
  // Ignorar peticiones no-GET (Firebase sync, POST, etc.)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Sirve desde caché inmediatamente
        // Actualiza en background si hay red disponible
        fetch(e.request)
          .then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, res));
            }
          })
          .catch(() => {}); // Sin red: silencia el error

        return cached;
      }

      // No está en caché: intenta la red
      return fetch(e.request).catch(() => {
        // Sin red y sin caché: si es navegación, sirve index.html como fallback
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
