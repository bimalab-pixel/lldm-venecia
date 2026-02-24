const CACHE_NAME = 'venecia-stats-v4'; // Subimos a v4 para limpiar la versión anterior

const ASSETS = [
  './',
  './index.html',
  './CENSOLLDM.html',
  './manifest.json',
  './logo-venecia-192.png',
  './logo-venecia-512.png'
];

// 1. Instalación Atómica (Uno por uno para evitar fallos totales)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Venecia Stats: Iniciando cacheo...');
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => 
            console.warn(`Fallo al cachear archivo de Venecia: ${url}`, err)
          );
        })
      );
    })
  );
  self.skipWaiting();
});

// 2. Activación: Limpieza de cachés viejas (v3, v2, etc.)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Venecia Stats: Borrando caché antigua...', key);
          return caches.delete(key);
        }
      })
    ))
  );
  return self.clients.claim();
});

// 3. Estrategia: Network First con caída a Caché
// Es mejor para estadísticas, ya que siempre querrás ver los datos más recientes si hay red.
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then(response => {
        if (response) return response;
        
        // Si el usuario intenta entrar a una página interna sin internet
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
