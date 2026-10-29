/* exemples/serveur/securite.js — protections communes d'un serveur Node (kit « Cybersécurité renforcée »)
   Sans dépendance. Marche avec http.createServer et avec Express (app.use(securite.express(options))).

   const securite = require('./securite');
   const proteger = securite.creer({ origines: ['https://monapp.fr'], csp: "default-src 'self'" });
   http.createServer((req, res) => { if (proteger(req, res)) return; … })   // true = réponse déjà envoyée */
'use strict';

const CSP_DEFAUT = "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; " +
  "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";

function creer({ origines = [], csp = CSP_DEFAUT, requetesParMinute = 120, hsts = true } = {}) {
  const compteurs = new Map();   // ip → { debut, n }
  setInterval(() => { const t = Date.now(); for (const [ip, c] of compteurs) if (t - c.debut > 60000) compteurs.delete(ip); }, 60000).unref();

  return function proteger(req, res) {
    // 1. En-têtes de sécurité sur toutes les réponses
    if (hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.removeHeader('X-Powered-By');

    // 2. CORS : seulement les origines connues, jamais « * » avec des identifiants
    const origine = req.headers.origin;
    if (origine) {
      if (!origines.includes(origine)) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end('{"erreur":"Origine refusée"}'); return true; }
      res.setHeader('Access-Control-Allow-Origin', origine);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.writeHead(204); res.end(); return true;
      }
    }

    // 3. Limite de requêtes par adresse IP (protège la connexion contre les essais en série)
    const ip = (req.socket && req.socket.remoteAddress) || '?';
    const c = compteurs.get(ip) || { debut: Date.now(), n: 0 };
    if (Date.now() - c.debut > 60000) { c.debut = Date.now(); c.n = 0; }
    c.n++; compteurs.set(ip, c);
    if (c.n > requetesParMinute) { res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' }); res.end('{"erreur":"Trop de requêtes"}'); return true; }
    return false;
  };
}

/** Lit un corps JSON limité en taille (refuse au-delà de max octets). */
function lireJson(req, max = 100000) {
  return new Promise((resolve, reject) => {
    let taille = 0; const morceaux = [];
    req.on('data', m => { taille += m.length; if (taille > max) { reject(Object.assign(new Error('Corps trop volumineux'), { statut: 413 })); req.destroy(); } else morceaux.push(m); });
    req.on('end', () => { try { resolve(morceaux.length ? JSON.parse(Buffer.concat(morceaux).toString('utf8')) : {}); } catch (e) { reject(Object.assign(new Error('JSON invalide'), { statut: 400 })); } });
    req.on('error', reject);
  });
}

/** Réponse d'erreur générique : le détail va dans les journaux, jamais au client. */
function erreur(res, e) {
  const statut = e && e.statut >= 400 && e.statut < 500 ? e.statut : 500;
  if (statut === 500) console.error(e);
  res.writeHead(statut, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ erreur: statut === 500 ? 'Erreur serveur' : e.message }));
}

module.exports = { creer, lireJson, erreur, CSP_DEFAUT, express: opts => { const p = creer(opts); return (req, res, next) => { if (!p(req, res)) next(); }; } };
