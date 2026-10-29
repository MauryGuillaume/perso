/* noyau/http.js — serveur HTTP sans dépendance : routes, sécurité, corps JSON, cookies, fichiers du front, erreurs.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier.

   Chaque route : r.get('/api/clients/:id', { role: 'utilisateur' }, async (req, ctx) => objet)
   - role : 'public' (sans compte), 'utilisateur' (connecté, défaut), 'admin', ou un rôle de app/app.js (liste possible).
   - Le gestionnaire reçoit ctx = { params, query, corps, utilisateur, ip, base, journal, env } et renvoie un objet (JSON),
     ou lève une erreur métier : throw ctx.erreur(400, 'Le nom est obligatoire.').
   - Options : limite (taille maximale du corps en octets, 1 Mo par défaut), mdpProvisoire (route permise avec un mot de passe provisoire).
   - Écritures (POST, PUT, PATCH, DELETE) : en-tête X-Appli, jeton « Authorization: Bearer » ou corps JSON (Content-Type: application/json) obligatoire (protection CSRF).
   - Erreurs : { erreur, message } (les deux clés portent le même texte, pour les fronts qui lisent l'une ou l'autre). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const env = require('./env');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; " +
  "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

class ErreurHttp extends Error { constructor(statut, message) { super(message); this.statut = statut; } }
const erreur = (statut, message) => new ErreurHttp(statut, message);

function routeur() {
  const routes = [];
  const ajouter = methode => (chemin, options, fn) => {
    if (typeof options === 'function') { fn = options; options = {}; }
    const noms = [];
    const re = new RegExp('^' + chemin.replace(/\/:(\w+)/g, (_, n) => { noms.push(n); return '/([^/]+)'; }) + '/?$');
    routes.push({ methode, chemin, re, noms, role: options.role || 'utilisateur', fn, limite: options.limite, mdpProvisoire: !!options.mdpProvisoire });
  };
  return { routes, get: ajouter('GET'), post: ajouter('POST'), put: ajouter('PUT'), patch: ajouter('PATCH'), delete: ajouter('DELETE') };
}

function lireCorps(req, max = 1e6) {
  return new Promise((resolve, reject) => {
    let taille = 0; const morceaux = [];
    req.on('data', m => { taille += m.length; if (taille > max) { reject(erreur(413, 'Envoi trop volumineux.')); req.destroy(); } else morceaux.push(m); });
    req.on('end', () => {
      if (!morceaux.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(morceaux).toString('utf8'))); } catch (e) { reject(erreur(400, 'Données illisibles (JSON attendu).')); }
    });
    req.on('error', reject);
  });
}

const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

function entetes(res, enProd) {
  if (enProd) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

function json(res, statut, objet, extra) {
  const corps = JSON.stringify(objet === undefined ? { ok: true } : objet);
  res.writeHead(statut, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}));
  res.end(corps);
}

/** Fichier du front (dossier public/), sans jamais sortir du dossier ; index.html pour les adresses inconnues. */
function fichier(res, racinePublic, chemin) {
  let p = path.normalize(decodeURIComponent(chemin)).replace(/^(\.\.[/\\])+/, '');
  let complet = path.join(racinePublic, p);
  if (!complet.startsWith(racinePublic)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(complet) || fs.statSync(complet).isDirectory()) complet = path.join(racinePublic, 'index.html');
  if (!fs.existsSync(complet)) { res.writeHead(404); return res.end('Introuvable'); }
  const ext = path.extname(complet).toLowerCase();
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' || path.basename(complet) === 'sw.js' ? 'no-cache' : 'public, max-age=3600' });
  fs.createReadStream(complet).pipe(res);
}

/** Crée le serveur. auth(req, route) → { utilisateur, parCle } ou lève 401/403. */
function creerServeur({ routeur: r, auth, contexte, racinePublic }) {
  const enProd = env.get('APP_ENV') === 'production';
  // ORIGINES : adresses https://…, « null » (page sans adresse : aperçu de l'Atelier, fichier ouvert) ou « * » (toutes, hors production)
  const listees = [env.get('APP_URL'), ...env.get('ORIGINES')].filter(Boolean);
  const toutes = listees.includes('*') && !enProd;
  if (listees.includes('*') && enProd) console.warn('[http] ORIGINES=* ignoré en production : liste les adresses autorisées.');
  const origines = new Set(listees.filter(o => o !== '*').map(o => o === 'null' ? 'null' : /^https?:/i.test(o) ? new URL(o).origin : o.replace(/\/+$/, '')));
  const limite = env.get('REQUETES_PAR_MINUTE');
  const compteurs = new Map();
  setInterval(() => { const t = Date.now(); for (const [k, c] of compteurs) if (t - c.debut > 60000) compteurs.delete(k); }, 60000).unref();

  return http.createServer(async (req, res) => {
    const debut = Date.now();
    entetes(res, enProd);
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
    const url = new URL(req.url, 'http://x');
    try {
      // CORS : seulement APP_URL et ORIGINES ; l'Atelier passe par son serveur local (pas de CORS)
      const origine = req.headers.origin;
      if (origine && url.pathname.startsWith('/api/')) {
        const memeSite = req.headers.host && origine.replace(/^https?:\/\//, '') === req.headers.host;
        if (!memeSite && !toutes && !origines.has(origine)) throw erreur(403, 'Origine refusée.');
        res.setHeader('Access-Control-Allow-Origin', origine); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Credentials', 'true');
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Appli, Authorization');
          res.writeHead(204); return res.end();
        }
      }
      // Limite de requêtes par IP
      const c = compteurs.get(ip) || { debut: Date.now(), n: 0 };
      if (Date.now() - c.debut > 60000) { c.debut = Date.now(); c.n = 0; }
      c.n++; compteurs.set(ip, c);
      if (c.n > limite) { res.setHeader('Retry-After', '60'); throw erreur(429, 'Trop de requêtes, réessaie dans une minute.'); }

      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw erreur(405, 'Méthode refusée.');
        return fichier(res, racinePublic, url.pathname === '/' ? 'index.html' : url.pathname);
      }
      const route = r.routes.find(x => x.methode === req.method && x.re.test(url.pathname));
      if (!route) throw erreur(404, 'Adresse inconnue.');
      const ecriture = req.method !== 'GET';
      // CSRF : un formulaire d'un autre site ne peut envoyer ni X-Appli, ni jeton, ni corps JSON (qui impose la vérification CORS)
      if (ecriture && !req.headers['x-appli'] && !/^Bearer /.test(req.headers.authorization || '') && !/^application\/json/i.test(req.headers['content-type'] || '')) throw erreur(403, 'Requête refusée (en-tête X-Appli manquant).');
      const m = route.re.exec(url.pathname);
      const params = Object.fromEntries(route.noms.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const qui = await auth(req, route, ip);
      const corps = ecriture ? await lireCorps(req, route.limite || 1e6) : {};
      const ctx = Object.assign({}, contexte, { params, query: Object.fromEntries(url.searchParams), corps, ip, req, res, cookies: cookies(req),
        utilisateur: qui.utilisateur, parCle: qui.parCle, erreur });
      const resultat = await route.fn(req, ctx);
      if (res.writableEnded || res.headersSent) return;
      json(res, ecriture && req.method === 'POST' ? 201 : 200, resultat);
    } catch (e) {
      const statut = e.statut >= 400 && e.statut < 600 ? e.statut : (e.code === '23505' ? 409 : e.code === '23503' ? 409 : ['23514', '22P02', '23502', '22007', '22008', '22003', '22001'].includes(e.code) ? 400 : 500);
      const message = e.statut ? e.message : e.code === '23505' ? 'Cette valeur existe déjà.' : e.code === '23503' ? 'Lien impossible : la ligne liée n’existe pas ou est encore utilisée.'
        : e.code === '22P02' || e.code === '22007' || e.code === '22008' ? 'Format invalide : un nombre, une date ou un identifiant est attendu.'
        : e.code === '23502' ? `Champ obligatoire manquant${e.column ? ' : ' + e.column : ''}.`
        : e.code === '23514' ? `Valeur refusée par une règle de la base${e.constraint ? ' (' + e.constraint + ')' : ''}.` : 'Erreur serveur.';
      if (statut === 500) console.error(`[http] ${req.method} ${url.pathname} : ${e.stack || e.message}`);
      if (!res.headersSent) json(res, statut, { erreur: message, message });
      else res.end();
    } finally {
      if (!enProd && url.pathname.startsWith('/api/')) console.log(`[http] ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - debut} ms`);
    }
  });
}

module.exports = { routeur, creerServeur, erreur, ErreurHttp, json, cookies, CSP };
