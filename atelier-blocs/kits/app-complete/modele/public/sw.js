/* sw.js — service worker du kit « App complète ». Changer VERSION à chaque livraison.
   Réseau d'abord (l'app est toujours à jour), cache en secours hors ligne. L'API n'est JAMAIS mise en cache
   (données personnelles). */
const VERSION = 'app-v1.0.1';
const FICHIERS = ['/', '/index.html', '/univers.css', '/charte.css', '/socle.css', '/affichage.js', '/noyau.js', '/app-ecrans.js', '/manifest.webmanifest', '/icone.svg'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('/index.html'))));
});
