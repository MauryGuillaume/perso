/* outils/servir.js — petit serveur local pour tester la PWA (le service worker ne marche pas en file://)
   node outils/servir.js [dossier] [port]   puis http://localhost:8080 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const racine = path.resolve(process.argv[2] || '.'), port = Number(process.argv[3]) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  const chemin = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let f = path.join(racine, chemin);
  if (!f.startsWith(racine)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Introuvable'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(d);
  });
}).listen(port, () => console.log(`PWA servie sur http://localhost:${port} (dossier ${racine})`));
