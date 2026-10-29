// Service worker : garde les fichiers de l'app pour qu'elle s'ouvre hors ligne.
const CACHE = "podologiciel-cabinet-v1";
const FICHIERS = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon.svg', './vendor/mdi/css/materialdesignicons.min.css', './vendor/inter/inter.css'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))));
// Seuls les fichiers de l'app passent par le cache ; les appels à l'API du cabinet (/api) vont toujours au réseau.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
