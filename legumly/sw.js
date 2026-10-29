/* sw.js — service worker de Legumly. CHANGER LA VERSION À CHAQUE LIVRAISON, sinon les téléphones gardent l'ancienne app. */
const VERSION = 'legumly-v1.0.0';
const FICHIERS = ['./', 'index.html', 'style.css', 'app.js', 'db.js', 'donnees.js', 'meteo.js',
  'ecran-mois.js', 'ecran-legumes.js', 'ecran-potager.js', 'ecran-rappels.js', 'ecran-journal.js', 'ecran-reglages.js',
  'legumes.json', 'manifest.webmanifest', 'icone.svg', 'icone-180.png', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Autres domaines (météo Open-Meteo) : jamais interceptés, jamais en cache
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // API : toujours le réseau (jamais de données en cache : elles peuvent être personnelles)
  if (url.pathname.startsWith('/api/')) return;
  // Fichiers de l'app : le cache d'abord, puis le réseau ; l'app s'ouvre hors ligne
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).catch(() => caches.match('index.html'))));
});
