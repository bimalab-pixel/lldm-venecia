/* Service Worker - Lldm Estadística Venecia
   Para publicar una versión nueva, cambia el número de CACHE (por ejemplo lldm-v1). */
const CACHE = 'lldm-v8';

const PRECACHE = [
  './',
  './index.html',
  './CENSOLLDM.html',
  './manifest-control.json',
  './icons/control-192.png',
  './icons/control-512.png',
  './icons/control-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Cada archivo por separado: si falta uno, los demás se guardan igual
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // Solo borra cachés de esta app (prefijo lldm-), nunca las de otras apps del mismo sitio
      Promise.all(keys.filter((k) => k.startsWith('lldm-') && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas: primero la red (así llegan las actualizaciones); sin internet, la copia guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Archivos propios (iconos, manifest): primero la copia guardada
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      }))
    );
    return;
  }

  // Librerías externas (Firebase, Excel, fuentes): se guardan para poder abrir sin internet.
  // Las llamadas de datos (Firestore, etc.) no se tocan.
  if (['script', 'style', 'font'].includes(req.destination)) {
    event.respondWith(
      caches.match(req).then((guardada) => {
        const red = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
          return res;
        }).catch(() => guardada);
        return guardada || red;
      })
    );
  }
});
