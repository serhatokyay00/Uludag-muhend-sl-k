const CACHE_NAME = 'peyzaj-atolyesi-v3';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Başka bir siteye (ör. Firebase) giden istekler veya GET olmayan
  // istekler bu servis çalışanının işi değil, doğrudan ağa gitsin.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  // HTML sayfasının kendisi (index.html / navigasyon istekleri):
  // HER ZAMAN önce ağdan güncel halini almaya çalış. Sadece tamamen
  // çevrimdışıyken önbellekteki eski sürümü göster.
  const isHTML = event.request.mode === 'navigate' ||
                 (event.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Diğer statik dosyalar (ikonlar, manifest): önce önbellek, yoksa ağ.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
