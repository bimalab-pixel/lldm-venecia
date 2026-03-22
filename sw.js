const CACHE_NAME = 'venecia-stats-v5'; // Subido a v5 para forzar limpieza y recacheo completo

const ASSETS = [
  // --- Archivos locales ---
  './',
  './index.html',
  './CENSOLLDM.html',
  './manifest.json',
  './logo-venecia-192.png',
  './logo-venecia-512.png',

  // --- CDN: html2pdf (usada en index.html y CENSOLLDM.html) ---
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',

  // --- CDN: xlsx (usada en CENSOLLDM.html) ---
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',

  // --- CDN: jsPDF (usada en CENSOLLDM.html) ---
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',

  // --- Firebase (usada en index.html y CENSOLLDM.html) ---
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js'
];

// 1. Instalación: cachea todos los assets locales y CDN
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Venecia Stats: Iniciando cacheo completo...');
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err =>
            console.warn(`Fallo al cachear: ${url}`, err)
          );
        })
      );
    })
  );
  self.skipWaiting();
});

// 2. Activación: elimina cachés anteriores (v4, v3, etc.)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Venecia Stats: Borrando caché antigua:', key);
          return caches.delete(key);
        }
      })
    ))
  );
  return self.clients.claim();
});

// 3. Estrategia: Cache First (funciona offline; actualiza en segundo plano si hay red)
self.addEventListener('fetch', e => {
  // Ignorar peticiones que no sean GET (Firebase sync, etc.)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Sirve desde caché inmediatamente y actualiza en background si hay red
        const fetchUpdate = fetch(e.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(e.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {}); // Silencia el error si no hay red

        return cached; // Responde con caché sin esperar la red
      }

      // Si no está en caché, intenta la red
      return fetch(e.request).catch(() => {
        // Fallback: si el usuario navega a una página y no hay nada, sirve index.html
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});