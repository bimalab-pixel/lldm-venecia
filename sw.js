const CACHE_NAME = 'venecia-stats-v2';

// Archivos locales para Venecia
const ASSETS = [
  './',
  './index.html',
  './CENSOLLDM.html',
  './manifest.json',
  './logo-venecia-192.png',
  './logo-venecia-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Instalando Sistema Venecia...');
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});