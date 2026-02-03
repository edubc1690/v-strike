const CACHE_NAME = 'v-strike-v3.9';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './app.webmanifest',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Rajdhani:wght@500;700&display=swap'
];

// Instalación: Guardar archivos en caché
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[V-STRIKE] Caching core assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activación: Limpiar cachés viejas
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
});

// Intercepción: Servir desde caché o buscar en red
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
