/* ==========================================================================
   serveur.js — serveur local FACULTATIF de l'Atelier de Blocs
   Node 18+ sans aucune dépendance. Il :
   - sert les fichiers de la plateforme sur http://localhost:8787 ;
   - garde la clé de l'IA (ANTHROPIC_API_KEY) côté serveur et relaie l'assistant
     et les discussions avec Claude (réponses au fil de l'eau) ;
   - collecte les informations d'un site pour l'audit de sécurité (en-têtes,
     certificat, fichiers exposés, HTML et scripts). Le navigateur ne peut pas
     lire ces informations lui-même ; l'analyse se fait dans l'Atelier ;
   - se connecte aux bases de données des apps (PostgreSQL, Supabase) pour les
     voir et les modifier. Les connexions (avec mot de passe) sont enregistrées
     sur cette machine dans ~/.atelier-blocs/connexions.json, jamais dans le
     navigateur, et ces routes ne répondent qu'à l'Atelier ouvert depuis
     http://localhost:8787 (même origine).
   - génère des images par IA pour le Studio design (compagnons, personnages),
     avec la clé OPENAI_API_KEY ou GEMINI_API_KEY gardée ici.
   - récupère les statistiques des apps qui ont le bloc « Statistiques »
     (STATS_<CLE>_URL et STATS_<CLE>_JETON dans .env).
   - gère les apps du kit « App complète » par leur API d'administration (adresse + clé ADMIN_API_KEY gardées
     ici dans ~/.atelier-blocs/gestion-apps.json, jamais dans le navigateur) : données, comptes, journal, RGPD…
   - sert l'émulateur des apps mobiles sur http://localhost:8788 (AB_APERCU_PORT),
     avec les fichiers envoyés par l'Atelier, gardés en mémoire.
   - construit le code source d'une app (Vite, Vue, React…) pour l'aperçu : installation
     des dépendances puis « npm run build » dans ~/.atelier-blocs/constructions/
     (serveur-construire.js). Seulement pour l'Atelier ouvert depuis http://localhost:8787.
   - lance le serveur Node d'une app (kit « App complète »…) pour l'aperçu, avec une base PostgreSQL
     de test fournie par l'Atelier, et relaie /api de l'aperçu vers elle (serveur-lancer.js).
   Les clés ne sont jamais envoyées au navigateur.

   Lancement :  ANTHROPIC_API_KEY=sk-ant-… node serveur.js
   ou mettre la clé dans un fichier .env à côté de ce fichier.
   Variables facultatives : PORT (8787), AB_IA_MODELE (claude-sonnet-5-5).
   Images par IA (facultatif) : OPENAI_API_KEY ou GEMINI_API_KEY ; AB_IMAGE_FOURNISSEUR
   (openai | gemini, choisi d'après la clé présente) ; AB_IMAGE_MODELE.
   ========================================================================== */
const http = require('http');
const tls = require('tls');
const os = require('os');
const pg = require('./serveur-pg');
const fs = require('fs');
const path = require('path');

const DOSSIER = __dirname;

/* ---------- Lecture du fichier .env (format CLE=valeur) ---------- */
function chargerEnv() {
  const fichier = path.join(DOSSIER, '.env');
  if (!fs.existsSync(fichier)) return;
  fs.readFileSync(fichier, 'utf8').split(/\r?\n/).forEach(ligne => {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}
chargerEnv();

const PORT = Number(process.env.PORT) || 8787;
const VERSION = '1.29.1';   // même numéro que A.VERSION (ab-app.js) : l'Atelier signale un serveur d'une autre version
const CLE_IA = process.env.ANTHROPIC_API_KEY || '';
const MODELE = process.env.AB_IA_MODELE || 'claude-sonnet-5-5';

/* ---------- Images par IA : fournisseur choisi d'après la clé présente ---------- */
const IMAGES = (() => {
  const openai = process.env.OPENAI_API_KEY || '', gemini = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const choix = process.env.AB_IMAGE_FOURNISSEUR || (openai ? 'openai' : gemini ? 'gemini' : '');
  if (choix === 'openai' && openai) return { fournisseur: 'openai', cle: openai, modele: process.env.AB_IMAGE_MODELE || 'gpt-image-1', base: process.env.AB_IMAGE_BASE || 'https://api.openai.com' };
  if (choix === 'gemini' && gemini) return { fournisseur: 'gemini', cle: gemini, modele: process.env.AB_IMAGE_MODELE || 'gemini-2.5-flash-image', base: process.env.AB_IMAGE_BASE || 'https://generativelanguage.googleapis.com' };
  return null;
})();

/* ---------- Fichiers servis : seulement ceux de la plateforme ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8',
  '.webp': 'image/webp', '.zip': 'application/zip'
};

function servirFichier(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const nom = path.normalize(url === '/' ? '/index.html' : url).replace(/^([/\\])+/, '');
  const chemin = path.join(DOSSIER, nom);
  // Refuse ce qui sort du dossier, les fichiers cachés (.env) et ce serveur lui-même.
  if (!chemin.startsWith(DOSSIER + path.sep) || nom.split(/[/\\]/).some(p => p.startsWith('.')) || nom === 'serveur.js' || !TYPES[path.extname(nom)]) {
    return repondre(res, 404, { erreur: 'Introuvable' });
  }
  fs.readFile(chemin, (err, data) => {
    if (err) return repondre(res, 404, { erreur: 'Introuvable' });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(nom)], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

/* ---------- Réponses JSON ---------- */
function repondre(res, statut, objet) {
  res.writeHead(statut, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(objet));
}

/** CORS : la plateforme peut aussi être ouverte en double-clic (origine « null ») ou depuis localhost. */
function cors(req, res) {
  const origine = req.headers.origin || '';
  if (origine === 'null' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origine)) {
    res.setHeader('Access-Control-Allow-Origin', origine);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Atelier');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
}

function lireCorps(req, max) {
  return new Promise((resolve, reject) => {
    let taille = 0;
    const morceaux = [];
    req.on('data', c => {
      taille += c.length;
      if (taille > max) { reject(new Error('Requête trop grosse')); req.destroy(); }
      else morceaux.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(morceaux).toString('utf8')));
    req.on('error', reject);
  });
}

/* ---------- Assistant IA : relais vers l'API Anthropic ---------- */
async function assistant(req, res) {
  if (!CLE_IA) return repondre(res, 503, { erreur: 'Aucune clé ANTHROPIC_API_KEY sur le serveur local.' });
  let demande;
  try { demande = JSON.parse(await lireCorps(req, 200000)); }
  catch (e) { return repondre(res, 400, { erreur: 'Demande illisible.' }); }
  if (!demande.message) return repondre(res, 400, { erreur: 'Description vide.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': CLE_IA, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELE, max_tokens: 4000,
        system: String(demande.systeme || ''),
        messages: [{ role: 'user', content: String(demande.message) }]
      })
    });
    const data = await r.json();
    if (!r.ok) return repondre(res, 502, { erreur: (data.error && data.error.message) || `Erreur de l’IA (${r.status})` });
    const texte = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    repondre(res, 200, { texte });
  } catch (e) {
    repondre(res, 502, { erreur: 'IA injoignable : ' + e.message });
  }
}

/* ---------- Discussion avec Claude (menu Discussion et onglet Discussion de chaque app) ----------
   L'Atelier envoie le contexte (fiche de l'app, extraits du code, base, revenus) et l'échange ;
   la réponse revient au fil de l'eau (texte brut, morceau par morceau). Le contexte est mis en cache
   chez Anthropic : les questions suivantes d'une même discussion coûtent moins cher. */
async function discussion(req, res) {
  if (!CLE_IA) return repondre(res, 503, { erreur: 'Aucune clé ANTHROPIC_API_KEY sur le serveur local.' });
  let d;
  try { d = JSON.parse(await lireCorps(req, 3 * 1024 * 1024)); }
  catch (e) { return repondre(res, 400, { erreur: 'Demande illisible ou trop grosse (3 Mo au plus).' }); }
  const messages = (Array.isArray(d.messages) ? d.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .map(m => ({ role: m.role, content: String(m.content) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return repondre(res, 400, { erreur: 'Question vide.' });
  while (messages[0].role !== 'user') messages.shift();
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': CLE_IA, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODELE, max_tokens: 8000, stream: true, messages,
        system: [{ type: 'text', text: String(d.systeme || ''), cache_control: { type: 'ephemeral' } }] })
    });
  } catch (e) { return repondre(res, 502, { erreur: 'IA injoignable : ' + e.message }); }
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return repondre(res, 502, { erreur: (data.error && data.error.message) || `Erreur de l’IA (${r.status})` });
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  const dec = new TextDecoder();
  let tampon = '';
  try {
    for await (const morceau of r.body) {
      tampon += dec.decode(morceau, { stream: true });
      const evts = tampon.split('\n\n');
      tampon = evts.pop();
      for (const evt of evts) {
        const ligne = evt.split('\n').find(l => l.startsWith('data:'));
        if (!ligne) continue;
        let x; try { x = JSON.parse(ligne.slice(5)); } catch (e) { continue; }
        if (x.type === 'content_block_delta' && x.delta && x.delta.type === 'text_delta') res.write(x.delta.text);
        else if (x.type === 'message_delta' && x.delta && x.delta.stop_reason === 'max_tokens') res.write('\n\n_(Réponse coupée : trop longue. Demande « continue ».)_');
        else if (x.type === 'error') res.write('\n\n[Erreur de l’IA : ' + ((x.error && x.error.message) || 'inconnue') + ']');
      }
    }
  } catch (e) { res.write('\n\n[Connexion à l’IA coupée : ' + e.message + ']'); }
  res.end();
}

/* ---------- Images par IA (Studio design) ----------
   Le navigateur envoie un prompt et, au besoin, des images de référence (PNG/WebP en base64) ;
   le serveur appelle le fournisseur avec sa clé et renvoie l'image produite en base64. */
const MAX_REFS = 3;
function refsValides(refs) {
  return (Array.isArray(refs) ? refs : []).slice(0, MAX_REFS).map(r => {
    const m = /^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(r || ''));
    return m ? { type: m[1], donnees: m[2] } : null;
  }).filter(Boolean);
}
async function imageOpenAI(prompt, refs) {
  const entetes = { authorization: 'Bearer ' + IMAGES.cle };
  let r;
  if (refs.length) {
    // Retouche à partir des références : même personnage, redessiné
    const f = new FormData();
    f.append('model', IMAGES.modele); f.append('prompt', prompt); f.append('size', '1024x1024'); f.append('background', 'transparent'); f.append('quality', 'medium');
    refs.forEach((x, i) => f.append('image[]', new Blob([Buffer.from(x.donnees, 'base64')], { type: x.type }), `reference-${i + 1}.${x.type.split('/')[1]}`));
    r = await fetch(IMAGES.base + '/v1/images/edits', { method: 'POST', headers: entetes, body: f });
  } else {
    r = await fetch(IMAGES.base + '/v1/images/generations', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, entetes),
      body: JSON.stringify({ model: IMAGES.modele, prompt, size: '1024x1024', background: 'transparent', quality: 'medium', n: 1 }) });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data.error && data.error.message) || `Erreur du générateur d’images (${r.status})`);
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error('Le générateur n’a pas renvoyé d’image.');
  return 'data:image/png;base64,' + b64;
}
async function imageGemini(prompt, refs) {
  const parts = [{ text: prompt }].concat(refs.map(x => ({ inline_data: { mime_type: x.type, data: x.donnees } })));
  const r = await fetch(`${IMAGES.base}/v1beta/models/${encodeURIComponent(IMAGES.modele)}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': IMAGES.cle },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data.error && data.error.message) || `Erreur du générateur d’images (${r.status})`);
  const morceaux = ((data.candidates || [])[0] || {}).content;
  const im = ((morceaux && morceaux.parts) || []).map(p => p.inlineData || p.inline_data).find(Boolean);
  if (!im) throw new Error('Le générateur n’a pas renvoyé d’image (contenu refusé ?).');
  return `data:${im.mimeType || im.mime_type || 'image/png'};base64,${im.data}`;
}
async function genererImage(req, res) {
  if (!IMAGES) return repondre(res, 503, { erreur: 'Aucune clé OPENAI_API_KEY ou GEMINI_API_KEY sur le serveur local.' });
  // Chaque image est payante : seule une page de l'Atelier (localhost ou fichier local) peut la demander.
  if (req.headers['x-atelier'] !== '1') return repondre(res, 403, { erreur: 'Interdit' });
  let d;
  try { d = JSON.parse(await lireCorps(req, 12 * 1024 * 1024)); } catch (e) { return repondre(res, 400, { erreur: 'Demande illisible.' }); }
  const prompt = String(d.prompt || '').trim().slice(0, 4000);
  if (!prompt) return repondre(res, 400, { erreur: 'Prompt vide.' });
  try {
    const image = await (IMAGES.fournisseur === 'openai' ? imageOpenAI : imageGemini)(prompt, refsValides(d.references));
    repondre(res, 200, { image, fournisseur: IMAGES.fournisseur, modele: IMAGES.modele });
  } catch (e) {
    repondre(res, 502, { erreur: e.message });
  }
}

/* ---------- Audit de sécurité d'un site : collecte ----------
   Uniquement des requêtes GET de lecture (une trentaine au plus), comme un
   navigateur. À n'utiliser que sur des sites dont on est responsable. */
const AGENT = 'AtelierDeBlocs-Audit/1.0 (+audit de securite autorise)';
const MAX_TEXTE = 3 * 1024 * 1024;

async function lireTexte(r, max) {
  const lecteur = r.body && r.body.getReader ? r.body.getReader() : null;
  if (!lecteur) return '';
  const morceaux = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    taille += value.length;
    if (taille > max) { lecteur.cancel().catch(() => {}); break; }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux.map(m => Buffer.from(m))).toString('utf8');
}

function obtenir(url, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  return fetch(url, Object.assign({ headers: { 'User-Agent': AGENT }, signal: ctrl.signal }, options || {})).finally(() => clearTimeout(t));
}

/** Certificat TLS : validité, date d'expiration, protocole. */
function certificat(hote, port) {
  return new Promise(resolve => {
    const s = tls.connect({ host: hote, port: port || 443, servername: hote, rejectUnauthorized: false, timeout: 8000 }, () => {
      const c = s.getPeerCertificate();
      const expire = c && c.valid_to ? new Date(c.valid_to) : null;
      resolve({
        valide: s.authorized, erreur: s.authorized ? null : String(s.authorizationError || ''),
        protocole: s.getProtocol(), emetteur: c && c.issuer ? (c.issuer.O || c.issuer.CN || '') : '',
        expire: expire ? expire.toISOString() : null, jours: expire ? Math.floor((expire - Date.now()) / 86400000) : undefined
      });
      s.end();
    });
    s.on('error', e => resolve({ valide: false, erreur: e.message }));
    s.on('timeout', () => { s.destroy(); resolve({ valide: false, erreur: 'Délai dépassé' }); });
  });
}

/** Fichiers qui ne doivent jamais être publiés, avec la signature qui prouve leur présence. */
const SENSIBLES = [
  ['/.env', /^\s*[A-Z][A-Z0-9_]*\s*=/m, 'critique'], ['/.env.local', /^\s*[A-Z][A-Z0-9_]*\s*=/m, 'critique'],
  ['/.env.production', /^\s*[A-Z][A-Z0-9_]*\s*=/m, 'critique'], ['/.git/config', /\[core\]/, 'critique'],
  ['/.git/HEAD', /^ref: refs\//, 'critique'], ['/.npmrc', /_authToken|registry=/, 'elevee'],
  ['/.htpasswd', /^[\w.-]+:\$/m, 'critique'], ['/.vscode/sftp.json', /"host"|"password"/, 'critique'],
  ['/docker-compose.yml', /^\s*services\s*:/m, 'moyenne'], ['/.DS_Store', /Bud1/, 'faible'],
  ['/phpinfo.php', /phpinfo\(\)|PHP Version/, 'elevee'], ['/server.js', /require\(|createServer|express\(/, 'elevee'],
  ['/backup.sql', /CREATE TABLE|INSERT INTO/i, 'critique'], ['/dump.sql', /CREATE TABLE|INSERT INTO/i, 'critique']
];

async function auditUrl(req, res) {
  let demande;
  try { demande = JSON.parse(await lireCorps(req, 10000)); } catch (e) { return repondre(res, 400, { erreur: 'Demande illisible.' }); }
  if (!demande.autorise) return repondre(res, 400, { erreur: 'Confirme que tu es autorisé à tester ce site.' });
  let cible;
  try { cible = new URL(/^https?:\/\//i.test(demande.url || '') ? demande.url : 'https://' + demande.url); }
  catch (e) { return repondre(res, 400, { erreur: 'Adresse invalide.' }); }
  if (!/^https?:$/.test(cible.protocol)) return repondre(res, 400, { erreur: 'Seules les adresses http et https sont acceptées.' });

  // On teste toujours la version https (sauf un site local en http, pour essayer l'audit)
  const local = /^(localhost|127\.0\.0\.1)$/.test(cible.hostname) && cible.protocol === 'http:';
  const depart = local ? cible.href : 'https://' + cible.host + cible.pathname + cible.search;
  const site = { url: cible.href, hote: cible.host, origine: new URL(depart).origin };

  // 1. Page principale (en suivant les redirections) ; sans https, on analyse quand même la version http
  const pagePrincipale = async adresse => {
    const r = await obtenir(adresse);
    site.final = r.url; site.statut = r.status;
    site.entetes = {};
    r.headers.forEach((v, k) => { site.entetes[k] = v; });
    site.cookies = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : (r.headers.get('set-cookie') ? [r.headers.get('set-cookie')] : []);
    site.html = await lireTexte(r, MAX_TEXTE);
    site.https = { ok: /^https:/.test(r.url) };
    if (!site.https.ok) site.https.erreur = 'le site final est en http://';
  };
  try { await pagePrincipale(depart); }
  catch (e) {
    const erreur = e.cause ? (e.cause.code || e.cause.message) : e.message;
    if (local) return repondre(res, 502, { erreur: 'Site injoignable : ' + erreur });
    try { await pagePrincipale('http://' + cible.host + cible.pathname + cible.search); }
    catch (e2) { return repondre(res, 502, { erreur: 'Site injoignable (https et http) : ' + erreur }); }
    site.https = { ok: false, erreur };
  }
  const origine = site.final ? new URL(site.final).origin : site.origine;
  site.origine = origine;

  // 2. Certificat et redirection http → https
  if (/^https:/.test(origine)) site.tls = await certificat(new URL(origine).hostname, Number(new URL(origine).port) || 443);
  if (site.tls && !site.tls.valide && site.https) { site.https.ok = false; site.https.erreur = 'certificat invalide : ' + site.tls.erreur; }
  if (/^https:/.test(origine)) {
    try {
      const r = await obtenir('http://' + new URL(origine).host + '/', { redirect: 'manual' });
      site.http = { statut: r.status, location: r.headers.get('location') || '' };
    } catch (e) { site.http = { erreur: e.message }; }
  }

  // 3. CORS : l'origine de test est-elle acceptée ?
  try {
    const origineTest = 'https://audit-cors.invalid';
    const r = await obtenir(origine + '/', { headers: { 'User-Agent': AGENT, Origin: origineTest } });
    site.cors = { origineTest, acao: r.headers.get('access-control-allow-origin'), acac: r.headers.get('access-control-allow-credentials') };
    r.body && r.body.cancel && r.body.cancel().catch(() => {});
  } catch (e) { /* ignoré */ }

  // 4. Fichiers sensibles (la signature évite les faux positifs des pages « 200 » de repli)
  site.exposes = [];
  await Promise.all(SENSIBLES.map(async ([chemin, signature, gravite]) => {
    try {
      const r = await obtenir(origine + chemin, { redirect: 'manual' });
      if (r.status !== 200) return r.body && r.body.cancel && r.body.cancel().catch(() => {});
      const texte = await lireTexte(r, 200000);
      if (signature.test(texte) && !/<html/i.test(texte.slice(0, 500))) site.exposes.push({ chemin, statut: r.status, taille: texte.length, gravite, apercu: texte.split('\n').slice(0, 3).map(l => l.replace(/([=:])\s*\S.*$/, '$1 •••')).join(' | ').slice(0, 160) });   // jamais les valeurs
    } catch (e) { /* ignoré */ }
  }));
  try {
    const r = await obtenir(origine + '/.well-known/security.txt', { redirect: 'manual' });
    const t = r.status === 200 ? await lireTexte(r, 20000) : '';
    site.securityTxt = /Contact:/i.test(t);
  } catch (e) { /* ignoré */ }

  // 5. Scripts du même site (là où finissent les variables d'environnement publiques)
  site.scripts = [];
  const srcs = [...(site.html || '').matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  const urls = [...new Set(srcs.map(s => { try { return new URL(s, site.final || origine).href; } catch (e) { return null; } }).filter(u => u && new URL(u).origin === origine))].slice(0, 25);
  let total = 0;
  for (const u of urls) {
    if (total > 15 * 1024 * 1024) break;
    try {
      const r = await obtenir(u);
      if (r.status !== 200) continue;
      const texte = await lireTexte(r, MAX_TEXTE);
      total += texte.length;
      site.scripts.push({ url: u, texte });
    } catch (e) { /* ignoré */ }
  }
  repondre(res, 200, site);
}

/* ---------- Bases de données : connexions et données ---------- */
const DOSSIER_CONNEXIONS = process.env.AB_DOSSIER || path.join(os.homedir(), '.atelier-blocs');
const FICHIER_CONNEXIONS = path.join(DOSSIER_CONNEXIONS, 'connexions.json');

function lireConnexions() {
  try { return JSON.parse(fs.readFileSync(FICHIER_CONNEXIONS, 'utf8')); } catch (e) { return {}; }
}
function ecrireConnexions(c) {
  fs.mkdirSync(DOSSIER_CONNEXIONS, { recursive: true, mode: 0o700 });
  fs.writeFileSync(FICHIER_CONNEXIONS, JSON.stringify(c, null, 2), { mode: 0o600 });
}
/** Ce que le navigateur a le droit de voir d'une connexion : tout sauf le mot de passe. */
const publique = (id, c) => ({ id, nom: c.nom, appId: c.appId, hote: c.hote, port: c.port, base: c.base, utilisateur: c.utilisateur, ssl: c.ssl, verifier: c.verifier, lectureSeule: !!c.lectureSeule, motdepasse: !!c.motdepasse });

/** Les routes /api/db/ ne répondent qu'à l'Atelier servi par ce serveur (pas à une autre page, ni à un fichier local). */
function memeOrigine(req) {
  const soi = [`localhost:${PORT}`, `127.0.0.1:${PORT}`];
  if (!soi.includes(req.headers.host)) return false;
  const o = req.headers.origin;
  if (o && !soi.map(h => 'http://' + h).includes(o)) return false;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  return req.method !== 'POST' || req.headers['x-atelier'] === '1';
}

const qi = n => '"' + String(n).replace(/"/g, '""') + '"';

/** Schéma public d'une base : tables, colonnes, clés, relations, RLS. */
async function lireSchema(c) {
  const [tables, colonnes, cles, relations] = await Promise.all([0, 1, 2, 3].map(() => null)).then(async () => [
    (await c.requete(`select c.relname, c.relrowsecurity, coalesce(obj_description(c.oid, 'pg_class'), ''), greatest(c.reltuples, 0)::bigint
      from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1`)).lignes,
    (await c.requete(`select table_name, column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale,
      coalesce(col_description(format('public.%I', table_name)::regclass, ordinal_position::int), '')
      from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`)).lignes,
    (await c.requete(`select tc.table_name, kcu.column_name, tc.constraint_type from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
      where tc.table_schema = 'public' and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')`)).lignes,
    (await c.requete(`select cl.relname, a.attname, nr.nspname || '.' || r.relname, af.attname, c.confdeltype
      from pg_constraint c join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace
      join pg_class r on r.oid = c.confrelid join pg_namespace nr on nr.oid = r.relnamespace
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
      where c.contype = 'f' and n.nspname = 'public'`)).lignes
  ]);
  const SUPP = { a: 'restrict', r: 'restrict', c: 'cascade', n: 'set null', d: 'set null' };
  const type = l => l[2] === 'character varying' ? `varchar${l[6] ? '(' + l[6] + ')' : ''}` : l[2] === 'numeric' && l[7] ? `numeric(${l[7]},${l[8] || 0})`
    : l[2] === 'ARRAY' ? l[3].replace(/^_/, '').replace(/^int4$/, 'integer').replace(/^varchar$/, 'varchar') + '[]' : l[2] === 'USER-DEFINED' ? l[3]
    : l[2] === 'timestamp with time zone' ? 'timestamptz' : l[2] === 'timestamp without time zone' ? 'timestamp' : l[2] === 'time without time zone' ? 'time' : l[2];
  return tables.map(([nom, rls, description, lignes]) => ({
    nom, rls: rls === 't', description, lignes: Number(lignes),
    colonnes: colonnes.filter(l => l[0] === nom).map(l => {
      const fk = relations.find(r => r[0] === nom && r[1] === l[1]);
      return {
        nom: l[1], type: type(l), requis: l[4] === 'NO', defaut: l[5] || '', description: l[9],
        cle: cles.some(k => k[0] === nom && k[1] === l[1] && k[2] === 'PRIMARY KEY'),
        unique: cles.some(k => k[0] === nom && k[1] === l[1] && k[2] === 'UNIQUE'),
        reference: fk ? (fk[2].replace(/^public\./, '') + '.' + fk[3]) : '', surSuppression: fk ? SUPP[fk[4]] : ''
      };
    })
  }));
}

/** Vérifie qu'une table et ses colonnes existent (aucun nom libre n'entre dans le SQL sans contrôle). */
async function tableConnue(c, table, colonnes) {
  const r = await c.requete(`select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1`, [table]);
  if (!r.lignes.length) throw new Error(`Table inconnue : ${table}`);
  const noms = r.lignes.map(l => l[0]);
  (colonnes || []).forEach(col => { if (!noms.includes(col)) throw new Error(`Colonne inconnue : ${table}.${col}`); });
  const pk = (await c.requete(`select kcu.column_name from information_schema.table_constraints tc join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    where tc.table_schema = 'public' and tc.table_name = $1 and tc.constraint_type = 'PRIMARY KEY' order by kcu.ordinal_position`, [table])).lignes.map(l => l[0]);
  return { noms, types: Object.fromEntries(r.lignes), pk };
}
const enObjets = r => r.lignes.map(l => Object.fromEntries(r.colonnes.map((c, i) => [c.nom, l[i]])));

/* ---------- Aides à la saisie (onglet Données) ----------
   Pour chaque colonne d'une table : les valeurs possibles lues dans la base (type enum, contrainte CHECK
   « in (…) », oui/non), la liste des lignes liées d'une clé étrangère (avec une colonne lisible), les
   valeurs déjà utilisées (petites listes), les règles qu'on ne peut pas lister (ex. role ~ '^[a-z]…').
   Les noms de tables et de colonnes viennent toujours du catalogue PostgreSQL, jamais du navigateur. */
const SENSIBLE = /(mot_?de_?passe|mdp|hash|password|passwd|secret|token|jeton|salt|cle_api|api_?key|carte|iban|cvc)/i;
const AFFICHAGES = ['nom', 'name', 'libelle', 'label', 'titre', 'title', 'intitule', 'raison_sociale', 'nom_complet', 'full_name', 'email', 'prenom', 'code', 'reference', 'numero', 'slug'];
const MAX_OPTIONS = 200;

/** Valeurs d'une contrainte CHECK qui ne fait que lister : x = ANY (ARRAY['a', 'b']), x IN (…), x = 'a' OR x = 'b'. */
function valeursCheck(def) {
  const litteraux = [...def.matchAll(/'((?:[^']|'')*)'/g)].map(m => m[1].replace(/''/g, "'"));
  const squelette = def.replace(/'(?:[^']|'')*'/g, 'L');
  if (!litteraux.length || /( AND |~|<|>|!=|\bNOT\b|\bLIKE\b|\b\w+\()/i.test(squelette.replace(/^CHECK /, ''))) return null;
  if (!/= ANY \(|= L/.test(squelette)) return null;
  return { valeurs: [...new Set(litteraux)], nul: /IS NULL/i.test(squelette) };
}

/** Une table d'un schéma (public ou auth pour Supabase), vérifiée dans le catalogue. */
async function tableDuCatalogue(c, nom) {
  const [schema, table] = nom.includes('.') ? nom.split('.') : ['public', nom];
  if (!['public', 'auth'].includes(schema)) throw new Error(`Schéma non consulté : ${schema}`);
  const r = await c.requete(`select column_name, data_type from information_schema.columns where table_schema = $1 and table_name = $2 order by ordinal_position`, [schema, table]);
  if (!r.lignes.length) throw new Error(`Table inconnue : ${nom}`);
  return { schema, table, sql: `${qi(schema)}.${qi(table)}`, noms: r.lignes.map(l => l[0]), types: Object.fromEntries(r.lignes) };
}

/** Colonnes lisibles d'une table liée : celle déclarée par l'app (app.tables.<t>.affichage), sinon un nom courant
    ou le premier texte ; plus l'email quand il existe (pour reconnaître une personne). */
function colonnesAffichage(t, colonneCle, conseil) {
  const premiere = conseil && t.noms.includes(conseil) ? conseil : AFFICHAGES.find(n => t.noms.includes(n))
    || t.noms.find(n => n !== colonneCle && !SENSIBLE.test(n) && /text|character/.test(t.types[n]));
  if (!premiere) return [];
  return [premiere].concat(premiere !== 'email' && t.noms.includes('email') ? ['email'] : []);
}

/** Lignes d'une table liée : [{ v: valeur de la clé, l: libellé }], cherchées par q (clé ou libellé). */
async function optionsReference(c, reference, colonne, conseil, q) {
  const t = await tableDuCatalogue(c, reference);
  if (!t.noms.includes(colonne)) throw new Error(`Colonne inconnue : ${reference}.${colonne}`);
  const aff = colonnesAffichage(t, colonne, conseil);
  const libelle = aff.length ? `concat_ws(' · ', ${aff.map(n => `cast(${qi(n)} as text)`).join(', ')})` : 'null';
  const vals = q ? ['%' + q + '%'] : [];
  const filtre = q ? ` where cast(${qi(colonne)} as text) ilike $1${aff.length ? ` or ${libelle} ilike $1` : ''}` : '';
  const r = await c.requete(`select cast(${qi(colonne)} as text), ${libelle} from ${t.sql}${filtre} order by 2 nulls last, 1 limit ${MAX_OPTIONS}`, vals);
  const total = q ? r.lignes.length : Number((await c.requete(`select count(*) from ${t.sql}`)).lignes[0][0]);
  return { table: reference, colonne, affichage: aff.join(', '), total, options: r.lignes.map(([v, l]) => ({ v, l })) };
}

async function lireAides(c, table, affichages) {
  affichages = affichages || {};
  const t = await tableConnue(c, table);
  const rel = `format('public.%I', $1::text)::regclass`;
  const [cols, checks, fks, uniques, taille] = [
    (await c.requete(`select a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, coalesce(pg_get_expr(d.adbin, d.adrelid), ''),
      coalesce(col_description(a.attrelid, a.attnum), ''), t.typtype, a.atttypid::int, a.attidentity <> '' or a.attgenerated <> ''
      from pg_attribute a join pg_type t on t.oid = a.atttypid left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = ${rel} and a.attnum > 0 and not a.attisdropped order by a.attnum`, [table])).lignes,
    (await c.requete(`select a.attname, pg_get_constraintdef(c.oid) from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.conrelid = ${rel} and c.contype = 'c' and array_length(c.conkey, 1) = 1`, [table])).lignes,
    (await c.requete(`select a.attname, nr.nspname || '.' || r.relname, af.attname from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1] join pg_class r on r.oid = c.confrelid join pg_namespace nr on nr.oid = r.relnamespace
      join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
      where c.conrelid = ${rel} and c.contype = 'f' and array_length(c.conkey, 1) = 1`, [table])).lignes,
    (await c.requete(`select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
      where i.indrelid = ${rel} and i.indisunique and i.indnatts = 1`, [table])).lignes.map(l => l[0]),
    Number((await c.requete(`select greatest(reltuples, 0)::bigint from pg_class where oid = ${rel}`, [table])).lignes[0][0])
  ];
  const colonnes = [];
  for (const [nom, type, requis, defaut, description, typtype, oid, auto] of cols) {
    const x = { nom, type, requis: requis === 't', defaut, description, cle: t.pk.includes(nom), unique: uniques.includes(nom), auto: auto === 't', sensible: SENSIBLE.test(nom) && type !== 'boolean', regles: [] };
    if (typtype === 'e') {
      x.valeurs = (await c.requete('select enumlabel from pg_enum where enumtypid = $1 order by enumsortorder', [oid])).lignes.map(l => l[0]);
      x.source = 'enum';
    } else if (type === 'boolean') { x.valeurs = ['true', 'false']; x.source = 'booleen'; }
    checks.filter(k => k[0] === nom).forEach(([, def]) => {
      const v = valeursCheck(def);
      if (v && !x.valeurs) { x.valeurs = v.valeurs; x.source = 'check'; }
      else if (!v) x.regles.push(def.replace(/^CHECK \((.*)\)$/, '$1'));
    });
    const fk = fks.find(k => k[0] === nom);
    if (fk) {
      const ref = fk[1].replace(/^public\./, '');
      try { x.reference = await optionsReference(c, ref, fk[2], affichages[ref]); }
      catch (e) { x.reference = { table: ref, colonne: fk[2], erreur: e.message, options: [], total: 0 }; }
    }
    // Valeurs déjà présentes : seulement les petites listes (statuts, rôles, catégories…), jamais une colonne sensible ou unique
    if (!x.valeurs && !fk && !x.cle && !x.unique && !x.sensible && /^(text|character|varchar|char|citext)/.test(type) && taille < 200000) {
      const r = await c.requete(`select cast(${qi(nom)} as text), count(*) from public.${qi(table)} where ${qi(nom)} is not null group by 1 order by 2 desc, 1 limit 31`);
      const repetees = r.lignes.some(l => Number(l[1]) > 1) || /(role|statut|status|etat|type|categ|genre|niveau|plan|offre|langue|pays|source|canal)/i.test(nom);
      if (r.lignes.length && r.lignes.length <= 30 && repetees && r.lignes.every(l => l[0].length <= 80)) x.existantes = r.lignes.map(([v, n]) => ({ v, n: Number(n) }));
    }
    colonnes.push(x);
  }
  // Ce que l'Atelier peut faire en plus : noter dans le journal de l'app, fermer les connexions d'un compte
  const tablesBase = (await c.requete(`select table_name, array_agg(column_name::text) from information_schema.columns where table_schema = 'public' and table_name in ('journal', 'sessions', 'jetons') group by 1`)).lignes;
  const aCols = (n, cs) => { const l = tablesBase.find(x => x[0] === n); return !!l && cs.every(cc => l[1].includes(cc)); };
  return {
    table, pk: t.pk, colonnes,
    journal: table !== 'journal' && aCols('journal', ['acteur', 'action', 'cible', 'detail']),
    motDePasse: table === 'utilisateurs' && t.pk.length === 1 && t.noms.includes('mdp_hash') && t.noms.includes('mdp_a_changer'),
    deconnexion: table === 'utilisateurs' && t.pk.length === 1 ? ['sessions', 'jetons'].filter(n => aCols(n, ['utilisateur_id'])) : []
  };
}

/** Tables de connexions d'un compte (kit « App complète ») : sessions, jetons. */
lireAides.connexions = async c => (await c.requete(`select table_name from information_schema.columns where table_schema = 'public' and table_name in ('sessions', 'jetons') and column_name = 'utilisateur_id'`)).lignes.map(l => l[0]);

/** Empreinte d'un mot de passe au format du kit « App complète » (noyau/comptes.js : scrypt N=16384, r=8, p=1, sel de 16 octets). */
function hacherMdp(mdp) {
  const sel = crypto.randomBytes(16);
  return new Promise((ok, ko) => crypto.scrypt(mdp, sel, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? ko(e) : ok(`scrypt$16384$8$1$${sel.toString('base64')}$${k.toString('base64')}`)));
}
function controlerMdpProvisoire(mdp) {
  if (typeof mdp !== 'string' || mdp.length < 8) throw new Error('Le mot de passe provisoire doit faire au moins 8 caractères.');
  if (mdp.length > 200) throw new Error('Mot de passe trop long.');
  if (/^[a-zA-Z]+$/.test(mdp) || /^\d+$/.test(mdp)) throw new Error('Le mot de passe doit mêler lettres et chiffres ou symboles.');
}

/** Masque les colonnes sensibles avant de les noter dans le journal de l'app (comme noyau/journal.js du kit). */
const pourJournal = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, SENSIBLE.test(k) ? '••••' : (v === null || v === undefined ? null : String(v).slice(0, 300))]));
const faux = v => /^(f|false|0|non|no|off)$/i.test(String(v));

async function routeDb(req, res, action) {
  if (!memeOrigine(req)) return repondre(res, 403, { erreur: 'Accès réservé à l’Atelier ouvert depuis http://localhost:' + PORT });
  const connexions = lireConnexions();
  if (action === 'connexions' && req.method === 'GET') return repondre(res, 200, Object.entries(connexions).map(([id, c]) => publique(id, c)));
  if (req.method !== 'POST') return repondre(res, 405, { erreur: 'Méthode non autorisée' });
  let d;
  try { d = JSON.parse(await lireCorps(req, 2 * 1024 * 1024) || '{}'); } catch (e) { return repondre(res, 400, { erreur: 'Demande illisible.' }); }
  const id = String(d.id || '');
  try {
    if (action === 'enregistrer') {
      if (!/^[\w-]{1,64}$/.test(id)) return repondre(res, 400, { erreur: 'Identifiant de base invalide.' });
      const ancien = connexions[id] || {};
      let c = { nom: d.nom || ancien.nom || id, appId: d.appId || ancien.appId || '' };
      if (d.chaine) Object.assign(c, pg.lireChaine(d.chaine));
      else Object.assign(c, { hote: d.hote, port: Number(d.port) || 5432, base: d.base, utilisateur: d.utilisateur, motdepasse: d.motdepasse || ancien.motdepasse || '', ssl: d.ssl !== false, verifier: d.verifier !== false });
      if (d.chaine && !c.motdepasse) c.motdepasse = ancien.motdepasse || '';
      c.lectureSeule = !!d.lectureSeule;
      if (!c.hote || !c.base || !c.utilisateur) return repondre(res, 400, { erreur: 'Hôte, base et utilisateur sont obligatoires.' });
      connexions[id] = c;
      ecrireConnexions(connexions);
      return repondre(res, 200, publique(id, c));
    }
    const c = connexions[id];
    if (!c) return repondre(res, 404, { erreur: 'Aucune connexion pour cette base : renseigne-la d’abord.' });
    if (action === 'oublier') { delete connexions[id]; ecrireConnexions(connexions); return repondre(res, 200, { ok: true }); }
    if (action === 'creer-base') {
      await pg.avec(Object.assign({}, c, { base: d.maintenance || 'postgres', lectureSeule: false }), cl => cl.simple(`create database ${qi(c.base)}`));
      return repondre(res, 200, { ok: true, base: c.base });
    }
    const resultat = await pg.avec(c, async cl => {
      if (action === 'tester') {
        const r = await cl.requete(`select version(), current_database(), pg_size_pretty(pg_database_size(current_database())), current_user,
          (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r')`);
        const [version, base, taille, utilisateur, tables] = r.lignes[0];
        return { ok: true, version: version.split(' on ')[0], base, taille, utilisateur, tables: Number(tables) };
      }
      if (action === 'schema') return { tables: await lireSchema(cl) };
      if (action === 'lignes') {
        const t = await tableConnue(cl, d.table, [d.tri, d.filtreColonne].filter(Boolean));
        const filtre = d.filtreColonne && d.filtreValeur !== undefined && d.filtreValeur !== '' ? ` where cast(${qi(d.filtreColonne)} as text) ilike $1` : '';
        const vals = filtre ? ['%' + d.filtreValeur + '%'] : [];
        const tri = d.tri ? ` order by ${qi(d.tri)} ${d.sens === 'desc' ? 'desc' : 'asc'} nulls last` : (t.pk.length ? ` order by ${t.pk.map(qi).join(', ')}` : '');
        const limite = Math.min(500, Math.max(1, Number(d.limite) || 50)), decalage = Math.max(0, Number(d.decalage) || 0);
        const r = await cl.requete(`select * from public.${qi(d.table)}${filtre}${tri} limit ${limite} offset ${decalage}`, vals);
        const total = Number((await cl.requete(`select count(*) from public.${qi(d.table)}${filtre}`, vals)).lignes[0][0]);
        return { colonnes: r.colonnes.map(x => Object.assign(x, { type: t.types[x.nom] || x.type })), lignes: r.lignes, total, pk: t.pk };
      }
      if (action === 'aides') return lireAides(cl, d.table, d.affichages);
      if (action === 'options') return optionsReference(cl, String(d.table || ''), String(d.colonne || ''), d.affichage, String(d.q || '').slice(0, 100));
      if (action === 'mot-de-passe') {
        // Mot de passe provisoire d'un compte (kit « App complète ») : haché ici, jamais stocké en clair ; à changer à la connexion suivante
        const t = await tableConnue(cl, 'utilisateurs', ['mdp_hash', 'mdp_a_changer']);
        if (t.pk.length !== 1 || !(t.pk[0] in (d.cle || {}))) throw new Error('Compte introuvable.');
        controlerMdpProvisoire(d.mdp);
        const hash = await hacherMdp(d.mdp);
        await cl.simple('begin');
        try {
          const r = await cl.requete(`update public.utilisateurs set mdp_hash = $1, mdp_a_changer = true where ${qi(t.pk[0])} = $2 returning *`, [hash, d.cle[t.pk[0]]]);
          const u = enObjets(r)[0];
          if (!u) throw new Error('Ce compte n’existe plus : recharge la table.');
          let fermees = 0;
          for (const n of (await lireAides.connexions(cl))) fermees += Number(((await cl.requete(`delete from public.${qi(n)} where utilisateur_id = $1`, [u[t.pk[0]]])).commande.match(/\d+$/) || [0])[0]);
          if (d.journal) await cl.requete(`insert into public.journal (acteur, action, cible, detail) values ('atelier', 'mdp_reinitialise', $1, $2)`,
            [u.email || `utilisateurs:${u[t.pk[0]]}`, JSON.stringify({ via: 'Atelier de Blocs', connexions_fermees: fermees })]);
          await cl.simple('commit');
          return { ok: true, lignes: [u], fermees, journal: !!d.journal };
        } catch (e) { await cl.simple('rollback').catch(() => {}); throw e; }
      }
      if (action === 'modifier' || action === 'inserer' || action === 'supprimer') {
        const valeurs = d.valeurs || {}, cle = d.cle || {};
        const t = await tableConnue(cl, d.table, Object.keys(valeurs).concat(Object.keys(cle)));
        if (d.table === 'utilisateurs' && 'mdp_hash' in valeurs && valeurs.mdp_hash !== null && !/^scrypt\$/.test(String(valeurs.mdp_hash)))
          throw new Error('mdp_hash attend une empreinte, pas un mot de passe : utilise « Mot de passe provisoire » (cadenas de la ligne, onglet Données).');
        if (action !== 'inserer' && (!t.pk.length || t.pk.some(k => !(k in cle)))) throw new Error('Cette table n’a pas de clé primaire : modification ligne par ligne impossible (utilise la console SQL).');
        const params = [];
        const p = v => { params.push(v === '' && d.videEnNull ? null : v); return '$' + params.length; };
        const vide = v => v === '' && d.videEnNull ? null : v;
        const where = () => ' where ' + t.pk.map(k => `${qi(k)} = ${p(cle[k])}`).join(' and ');
        let sql;
        if (action === 'modifier') {
          const cols = Object.keys(valeurs);
          if (!cols.length) throw new Error('Rien à modifier.');
          sql = `update public.${qi(d.table)} set ${cols.map(k => `${qi(k)} = ${p(valeurs[k])}`).join(', ')}${where()} returning *`;
        } else if (action === 'inserer') {
          const cols = Object.keys(valeurs);
          sql = cols.length ? `insert into public.${qi(d.table)} (${cols.map(qi).join(', ')}) values (${cols.map(k => p(valeurs[k])).join(', ')}) returning *`
            : `insert into public.${qi(d.table)} default values returning *`;
        } else sql = `delete from public.${qi(d.table)}${where()} returning *`;
        // Tout dans une transaction : la ligne, le journal de l'app et la fermeture des connexions passent ensemble ou pas du tout
        await cl.simple('begin');
        try {
          let avant = null;
          if (action !== 'inserer') {
            const vals = t.pk.map(k => cle[k]);
            avant = enObjets(await cl.requete(`select * from public.${qi(d.table)} where ${t.pk.map((k, i) => `${qi(k)} = $${i + 1}`).join(' and ')} for update`, vals))[0];
            if (!avant) throw new Error('Cette ligne n’existe plus (supprimée entre-temps ?) : recharge la table.');
          }
          // Règle du kit « App complète » : on ne retire jamais le dernier compte admin actif
          if (d.table === 'utilisateurs' && avant && avant.role === 'admin' && !(t.noms.includes('actif') && faux(avant.actif))) {
            const retire = action === 'supprimer' || ('role' in valeurs && vide(valeurs.role) !== 'admin') || ('actif' in valeurs && faux(valeurs.actif));
            if (retire) {
              const autres = await cl.requete(`select count(*) from public.utilisateurs where role = 'admin'${t.noms.includes('actif') ? ' and actif' : ''} and not (${t.pk.map((k, i) => `${qi(k)} = $${i + 1}`).join(' and ')})`, t.pk.map(k => cle[k]));
              if (Number(autres.lignes[0][0]) === 0) throw new Error('C’est le dernier compte admin actif : donne d’abord le rôle admin à un autre compte.');
            }
          }
          const r = await cl.requete(sql, params);
          const apres = enObjets(r)[0] || null;
          const id = (apres || avant) ? t.pk.map(k => (apres || avant)[k]).join(',') : '';
          let fermees = 0;
          if (d.deconnecter && d.table === 'utilisateurs' && t.pk.length === 1 && action === 'modifier') {
            for (const n of (await lireAides.connexions(cl))) fermees += Number(((await cl.requete(`delete from public.${qi(n)} where utilisateur_id = $1`, [avant[t.pk[0]]])).commande.match(/\d+$/) || [0])[0]);
          }
          if (d.journal && d.table !== 'journal') {
            const changes = action === 'modifier' ? Object.keys(valeurs) : Object.keys(apres || avant || {});
            const detail = action === 'modifier' ? { avant: pourJournal(Object.fromEntries(changes.map(k => [k, avant[k]]))), apres: pourJournal(Object.fromEntries(changes.map(k => [k, apres ? apres[k] : null]))) }
              : action === 'inserer' ? { colonnes: Object.keys(valeurs) } : { avant: pourJournal(avant) };
            if (fermees) detail.connexions_fermees = fermees;
            detail.via = 'Atelier de Blocs';
            await cl.requete(`insert into public.journal (acteur, action, cible, detail) values ('atelier', $1, $2, $3)`,
              [{ modifier: 'donnees_modifiees', inserer: 'donnees_ajoutees', supprimer: 'donnees_supprimees' }[action], `${d.table}:${id}`, JSON.stringify(detail)]);
          }
          await cl.simple('commit');
          return { ok: true, commande: r.commande, lignes: action === 'supprimer' ? [] : enObjets(r), fermees, journal: !!d.journal };
        } catch (e) { await cl.simple('rollback').catch(() => {}); throw e; }
      }
      if (action === 'sql') {
        // Une seule instruction (protocole paramétré) ; plusieurs : utiliser « appliquer »
        const r = await cl.requete(String(d.sql || ''));
        return { commande: r.commande, colonnes: r.colonnes, lignes: r.lignes.slice(0, 1000), total: r.lignes.length };
      }
      if (action === 'appliquer') {
        if (c.lectureSeule) throw new Error('Connexion en lecture seule : modification du schéma refusée.');
        const r = await cl.simple(String(d.sql || ''));
        return { ok: true, instructions: r.length };
      }
      throw new Error('Action inconnue');
    });
    repondre(res, 200, resultat);
  } catch (e) {
    repondre(res, 400, { erreur: e.message, code: e.code });
  }
}

/* ---------- Statistiques des apps (bloc « Statistiques ») ----------
   Pour chaque app, deux variables dans .env : STATS_<CLE>_URL (adresse de sa fonction stats-atelier)
   et STATS_<CLE>_JETON (le même jeton que son secret ATELIER_STATS_JETON). Le navigateur ne donne
   que la clé de l'app : il ne voit ni l'adresse appelée avec le jeton, ni le jeton. */
function appsStats() {
  return Object.keys(process.env).map(k => k.match(/^STATS_([A-Z0-9_]+)_URL$/)).filter(Boolean).map(m => m[1])
    .filter(c => (process.env['STATS_' + c + '_JETON'] || '').length >= 32);
}
const nombre = v => (typeof v === 'number' && isFinite(v) ? v : 0);
async function statsApp(req, res) {
  if (req.headers['x-atelier'] !== '1') return repondre(res, 403, { erreur: 'Interdit' });
  if (req.method === 'GET') return repondre(res, 200, { apps: appsStats() });
  let d;
  try { d = JSON.parse(await lireCorps(req, 2000)); } catch (e) { return repondre(res, 400, { erreur: 'Demande illisible.' }); }
  const cle = String(d.cle || '');
  if (!/^[A-Z0-9_]{1,60}$/.test(cle) || !appsStats().includes(cle)) return repondre(res, 404, { erreur: `Pas de STATS_${cle}_URL et STATS_${cle}_JETON (32 caractères au moins) dans .env.` });
  let cible;
  try { cible = new URL(process.env['STATS_' + cle + '_URL']); } catch (e) { return repondre(res, 400, { erreur: 'STATS_' + cle + '_URL n’est pas une adresse.' }); }
  // Le jeton ne part qu'en HTTPS (ou vers cette machine, pour les essais)
  if (cible.protocol !== 'https:' && !(cible.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(cible.hostname))) return repondre(res, 400, { erreur: 'L’adresse doit être en https.' });
  try {
    const r = await fetch(cible, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'x-atelier-jeton': process.env['STATS_' + cle + '_JETON'] }, body: '{}' });
    const texte = await r.text();
    if (texte.length > 500000) throw new Error('Réponse trop grosse');
    const data = JSON.parse(texte || '{}');
    if (!r.ok) return repondre(res, 502, { erreur: `L’app a répondu ${r.status} : ${String(data.erreur || '').slice(0, 200)}` });
    if (data.format !== 'atelier-stats/1') return repondre(res, 502, { erreur: 'Réponse de l’app dans un format inconnu.' });
    // Seuls des totaux repartent vers le navigateur, vérifiés
    const revenus = (Array.isArray(data.revenus) ? data.revenus : []).slice(0, 120)
      .filter(l => /^\d{4}-\d{2}$/.test(l && l.mois)).map(l => ({ mois: l.mois, montant: Math.round(nombre(l.montant) * 100) / 100, nombre: nombre(l.nombre), source: String(l.source || 'Ventes').slice(0, 40) }));
    const u = data.utilisateurs || {};
    repondre(res, 200, { genere: String(data.genere || new Date().toISOString()).slice(0, 40), devise: String(data.devise || 'EUR').slice(0, 5),
      revenus, utilisateurs: { total: nombre(u.total), actifs30j: nombre(u.actifs30j), nouveauxMois: nombre(u.nouveauxMois) } });
  } catch (e) {
    repondre(res, 502, { erreur: 'App injoignable : ' + e.message });
  }
}

/* ---------- Émulateur des apps mobiles ----------
   L'Atelier envoie les fichiers de l'app (www/ du projet mobile) ; ils sont servis à la RACINE d'un second
   port, comme Capacitor dans l'app native (les chemins /assets/… et /mobile-pont.js marchent tels quels).
   Gardés en mémoire seulement, et toujours sur cette machine (127.0.0.1). */
const PORT_APERCU = Number(process.env.AB_APERCU_PORT) || 8788;
let fichiersApercu = new Map(), serveurApercu = null, relaisApercu = null;   // relais : port d'une app lancée (serveur-lancer.js)
const TYPES_APERCU = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

async function recevoirApercu(req, res) {
  if (req.headers['x-atelier'] !== '1') return repondre(res, 403, { erreur: 'En-tête X-Atelier manquant.' });
  let corps;
  try { corps = JSON.parse(await lireCorps(req, 400 * 1024 * 1024)); }
  catch (e) { return repondre(res, 400, { erreur: 'Aperçu illisible ou trop gros (400 Mo au plus).' }); }
  const nouveaux = new Map();
  for (const [chemin, b64] of Object.entries(corps.fichiers || {})) {
    const propre = path.posix.normalize('/' + String(chemin)).slice(1);
    if (!propre || propre.startsWith('..')) continue;
    nouveaux.set(propre, Buffer.from(String(b64), 'base64'));
  }
  if (!nouveaux.has('index.html')) return repondre(res, 400, { erreur: 'index.html manquant.' });
  fichiersApercu = nouveaux;
  relaisApercu = corps.relais && lancements.portConnu(Number(corps.relais)) ? Number(corps.relais) : null;
  if (!serveurApercu) {
    serveurApercu = http.createServer((rq, rs) => {
      let nom = decodeURIComponent(rq.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      if (nom.endsWith('/')) nom += 'index.html';
      // App avec son serveur : l'interface vient des fichiers envoyés, tout le reste (/api…) va à l'app lancée
      if (relaisApercu && (!['GET', 'HEAD'].includes(rq.method) || !fichiersApercu.has(nom))) return relayer(rq, rs, relaisApercu);
      // Comme Capacitor : une adresse inconnue sans extension renvoie l'app (routes d'une app d'une page)
      if (!fichiersApercu.has(nom) && !path.extname(nom)) nom = 'index.html';
      const data = fichiersApercu.get(nom);
      if (!data) { rs.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return rs.end('Introuvable'); }
      rs.writeHead(200, { 'Content-Type': TYPES_APERCU[path.extname(nom).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      rs.end(data);
    });
    await new Promise((ok, ko) => { serveurApercu.once('error', ko); serveurApercu.listen(PORT_APERCU, '127.0.0.1', ok); })
      .catch(e => { serveurApercu = null; throw e; });
  }
  repondre(res, 200, { url: `http://localhost:${PORT_APERCU}/`, fichiers: fichiersApercu.size, relais: relaisApercu });
}

/** Relaie une requête de l'aperçu vers l'app lancée (même adresse vue du navigateur : cookies et origine inchangés). */
function relayer(rq, rs, port) {
  const p = http.request({ host: '127.0.0.1', port, method: rq.method, path: rq.url, headers: rq.headers }, r => { rs.writeHead(r.statusCode, r.headers); r.pipe(rs); });
  p.on('error', e => { if (rs.headersSent) return rs.end(); rs.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' }); rs.end(JSON.stringify({ erreur: 'L’app ne répond pas (' + e.code + ') : relance-la depuis l’aperçu de l’Atelier.' })); });
  rq.pipe(p);
}

/* ---------- Serveur d'une app lancé pour l'aperçu (serveur-lancer.js) ----------
   Lance npm install et le serveur de l'app sur cette machine : seulement pour l'Atelier ouvert depuis
   http://localhost:8787 (même origine, comme la construction). */
const lancements = require('./serveur-lancer')(path.join(DOSSIER_CONNEXIONS, 'apps-lancees'), `http://localhost:${PORT_APERCU}`);
process.once('exit', () => lancements.arreterTout());
['SIGINT', 'SIGTERM'].forEach(s => process.once(s, () => process.exit(0)));
// Une erreur d'un outil lancé (PostgreSQL, app) ne doit pas arrêter tout le serveur local
process.on('uncaughtException', e => console.error('[atelier] erreur inattendue (le serveur continue) : ' + (e && e.message || e)));
async function routeLancer(req, res, id) {
  if (!memeOrigine(req)) return repondre(res, 403, { erreur: 'Le lancement d’une app ne part que de l’Atelier ouvert sur http://localhost:' + PORT + '.' });
  if (!id && req.method === 'POST') {
    let corps;
    try { corps = JSON.parse(await lireCorps(req, 400 * 1024 * 1024)); }
    catch (e) { return repondre(res, 400, { erreur: 'Projet illisible ou trop gros (400 Mo au plus).' }); }
    return repondre(res, 200, { id: lancements.demarrer(corps) });
  }
  if (id && req.method === 'GET') {
    const e = lancements.etat(id, new URL(req.url, 'http://x').searchParams.get('depuis'));
    return e ? repondre(res, 200, e) : repondre(res, 404, { erreur: 'Lancement introuvable (le serveur local a peut-être redémarré).' });
  }
  repondre(res, 405, { erreur: 'Méthode non autorisée' });
}

/* ---------- Construction du code source d'une app (serveur-construire.js) ----------
   Lance des commandes (npm install, npm run build) sur le code reçu : seulement pour l'Atelier
   ouvert depuis http://localhost:8787 (même origine, comme /api/db/), jamais pour une autre page. */
const constructions = require('./serveur-construire')(path.join(DOSSIER_CONNEXIONS, 'constructions'));
async function routeConstruire(req, res, id, action) {
  if (!memeOrigine(req)) return repondre(res, 403, { erreur: 'La construction ne se lance que depuis l’Atelier ouvert sur http://localhost:' + PORT + '.' });
  if (!id && req.method === 'POST') {
    let corps;
    try { corps = JSON.parse(await lireCorps(req, 400 * 1024 * 1024)); }
    catch (e) { return repondre(res, 400, { erreur: 'Projet illisible ou trop gros (400 Mo au plus).' }); }
    return repondre(res, 200, { id: constructions.demarrer(corps) });
  }
  if (id && req.method === 'GET' && action === 'fichiers') {
    const f = constructions.fichiers(id);
    return f ? repondre(res, 200, { fichiers: f }) : repondre(res, 404, { erreur: 'Construction introuvable ou pas terminée.' });
  }
  if (id && req.method === 'GET') {
    const e = constructions.etat(id, new URL(req.url, 'http://x').searchParams.get('depuis'));
    return e ? repondre(res, 200, e) : repondre(res, 404, { erreur: 'Construction introuvable (le serveur a peut-être redémarré).' });
  }
  repondre(res, 405, { erreur: 'Méthode non autorisée' });
}

/* ---------- Gestion des apps (kit « App complète ») : relais vers leur API d'administration ----------
   Pour chaque app : son adresse et sa clé ADMIN_API_KEY, gardées sur cette machine dans ~/.atelier-blocs/gestion-apps.json
   (lisible par toi seul), jamais envoyées au navigateur après leur création. L'Atelier appelle
   /api/gestion/app/<id>/<chemin> ; ce serveur relaie vers <adresse>/api/admin/<chemin> avec « Authorization: Bearer <clé> ».
   Mêmes protections que /api/db/ : seulement l'Atelier ouvert depuis http://localhost:8787. */
const FICHIER_GESTION = path.join(DOSSIER_CONNEXIONS, 'gestion-apps.json');
const crypto = require('crypto');
function lireGestion() { try { return JSON.parse(fs.readFileSync(FICHIER_GESTION, 'utf8')); } catch (e) { return {}; } }
function ecrireGestion(g) {
  fs.mkdirSync(DOSSIER_CONNEXIONS, { recursive: true, mode: 0o700 });
  fs.writeFileSync(FICHIER_GESTION, JSON.stringify(g, null, 2), { mode: 0o600 });
}
const gestionPublique = (id, g) => ({ appId: id, url: g.url || '', cle: !!g.cle, cleCreeLe: g.cleCreeLe || null, apercu: g.cle ? g.cle.slice(0, 4) + '…' + g.cle.slice(-4) : '' });
/** Adresse d'app acceptée : https, ou http seulement sur cette machine ou le réseau local (la clé circulerait en clair). */
function adresseApp(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch (e) { throw new Error('Adresse invalide : https://mon-app.fr'); }
  const local = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w-]+\.local)$/i.test(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) throw new Error('L’adresse doit commencer par https:// (http seulement pour une app sur ta machine).');
  return u.origin;
}

async function routeGestion(req, res, action, appId, chemin) {
  const ecriture = req.method !== 'GET';
  if (!memeOrigine(req) || (ecriture && req.headers['x-atelier'] !== '1')) return repondre(res, 403, { erreur: 'Accès réservé à l’Atelier ouvert depuis http://localhost:' + PORT });
  const g = lireGestion();
  if (action === 'liste' && req.method === 'GET') return repondre(res, 200, Object.entries(g).map(([id, x]) => gestionPublique(id, x)));
  if (action === 'config' && req.method === 'POST') {
    const d = JSON.parse((await lireCorps(req, 1e4)) || '{}');
    if (!/^[\w-]{1,80}$/.test(d.appId || '')) return repondre(res, 400, { erreur: 'App inconnue.' });
    const x = g[d.appId] || {};
    if (d.url !== undefined) x.url = d.url ? adresseApp(d.url) : '';
    let nouvelle = null;
    if (d.generer) { nouvelle = crypto.randomBytes(36).toString('base64url'); x.cle = nouvelle; x.cleCreeLe = new Date().toISOString(); }
    if (d.cle) { if (String(d.cle).length < 32) return repondre(res, 400, { erreur: 'La clé fait au moins 32 caractères.' }); x.cle = String(d.cle).trim(); x.cleCreeLe = new Date().toISOString(); }
    g[d.appId] = x; ecrireGestion(g);
    // La clé générée n'est renvoyée qu'une fois, pour la coller chez l'hébergeur
    return repondre(res, 200, Object.assign(gestionPublique(d.appId, x), nouvelle ? { nouvelleCle: nouvelle } : {}));
  }
  if (action === 'reveler' && req.method === 'POST') {
    const d = JSON.parse((await lireCorps(req, 1e4)) || '{}');
    const x = g[d.appId];
    if (!x || !x.cle) return repondre(res, 404, { erreur: 'Aucune clé pour cette app.' });
    return repondre(res, 200, { cle: x.cle });
  }
  if (action === 'oublier' && req.method === 'POST') {
    const d = JSON.parse((await lireCorps(req, 1e4)) || '{}');
    delete g[d.appId]; ecrireGestion(g);
    return repondre(res, 200, { ok: true });
  }
  if (action !== 'app') return repondre(res, 404, { erreur: 'Adresse inconnue.' });
  const x = g[appId];
  if (!x || !x.url || !x.cle) return repondre(res, 409, { erreur: 'Renseigne d’abord l’adresse de l’app et sa clé (onglet Gestion › Connexion).' });
  if (!/^[\w./%-]*$/.test(chemin.split('?')[0]) || /(^|\/)\.\.(\/|$)/.test(chemin) || /%(2e|2f|5c)/i.test(chemin.split('?')[0])) return repondre(res, 400, { erreur: 'Chemin refusé.' });
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return repondre(res, 405, { erreur: 'Méthode refusée.' });
  const corps = ecriture ? await lireCorps(req, 2e6) : undefined;
  let r;
  try {
    r = await fetch(x.url + '/api/admin/' + chemin, { method: req.method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: Object.assign({ Authorization: 'Bearer ' + x.cle, Accept: 'application/json' }, ecriture ? { 'Content-Type': 'application/json' } : {}), body: corps || undefined });
  } catch (e) {
    return repondre(res, 502, { erreur: `L’app ne répond pas (${x.url}) : ${e.name === 'TimeoutError' ? 'délai dépassé' : e.cause && e.cause.code || e.message}. Vérifie qu’elle est en ligne et son adresse.` });
  }
  const type = r.headers.get('content-type') || 'application/octet-stream';
  const octets = Buffer.from(await r.arrayBuffer());
  if (r.status === 404 && !/json/.test(type)) return repondre(res, 502, { erreur: 'Cette adresse ne répond pas comme une app du kit « App complète » (pas d’API /api/admin).' });
  const entetes = { 'Content-Type': type, 'Cache-Control': 'no-store' };
  if (r.headers.get('content-disposition')) entetes['Content-Disposition'] = r.headers.get('content-disposition');
  res.writeHead(r.status, entetes);
  res.end(octets);
}

/* ---------- Routage ---------- */
const serveur = http.createServer((req, res) => {
  const db = req.url.match(/^\/api\/db\/([\w-]+)$/);
  if (db) return req.method === 'OPTIONS' ? repondre(res, 403, { erreur: 'Interdit' }) : routeDb(req, res, db[1]).catch(e => repondre(res, 500, { erreur: e.message }));
  const ge = req.url.match(/^\/api\/gestion\/(liste|config|reveler|oublier)$/) || req.url.match(/^\/api\/gestion\/(app)\/([\w-]{1,80})\/(.*)$/);
  if (ge) return req.method === 'OPTIONS' ? repondre(res, 403, { erreur: 'Interdit' }) : routeGestion(req, res, ge[1], ge[2], ge[3] || '').catch(e => repondre(res, 400, { erreur: e.message }));
  const co = req.url.match(/^\/api\/construire(?:\/([a-f0-9]{16})(?:\/(fichiers))?)?(?:\?.*)?$/);
  if (co) return req.method === 'OPTIONS' ? repondre(res, 403, { erreur: 'Interdit' }) : routeConstruire(req, res, co[1], co[2]).catch(e => repondre(res, 500, { erreur: e.message }));
  const la = req.url.match(/^\/api\/lancer(?:\/([a-f0-9]{16}))?(?:\?.*)?$/);
  if (la) return req.method === 'OPTIONS' ? repondre(res, 403, { erreur: 'Interdit' }) : routeLancer(req, res, la[1]).catch(e => repondre(res, 500, { erreur: e.message }));
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url === '/api/sante') return repondre(res, 200, { ok: true, ia: !!CLE_IA, modele: CLE_IA ? MODELE : null, images: IMAGES ? { fournisseur: IMAGES.fournisseur, modele: IMAGES.modele } : null, construire: true, discussion: true, lancer: true, version: VERSION });
  if (req.url === '/api/image' && req.method === 'POST') return genererImage(req, res);
  if (req.url === '/api/stats') return statsApp(req, res);
  if (req.url === '/api/ia' && req.method === 'POST') return assistant(req, res);
  if (req.url === '/api/discussion' && req.method === 'POST') return discussion(req, res).catch(e => { if (!res.headersSent) repondre(res, 500, { erreur: e.message }); else res.end(); });
  if (req.url === '/api/mobile/apercu' && req.method === 'POST') return recevoirApercu(req, res).catch(e => repondre(res, 500, { erreur: 'Émulateur : ' + e.message }));
  if (req.url === '/api/audit-url' && req.method === 'POST') return auditUrl(req, res).catch(e => repondre(res, 500, { erreur: e.message }));
  if (req.method === 'GET') return servirFichier(req, res);
  repondre(res, 405, { erreur: 'Méthode non autorisée' });
});

// Écoute seulement sur cette machine : le serveur n'est pas exposé au réseau.
// Port déjà pris : le plus souvent l'ancienne version de l'Atelier, toujours ouverte. Sans ce message, le navigateur
// continuerait d'afficher l'ancienne version (ses fichiers) sans que rien ne le dise.
serveur.on('error', async e => {
  if (e.code !== 'EADDRINUSE') { console.error('[atelier] ' + e.message); process.exit(1); }
  let autre = '';
  try { const r = await fetch(`http://127.0.0.1:${PORT}/api/sante`, { signal: AbortSignal.timeout(2000) }); const j = await r.json(); autre = j.version ? 'la v' + j.version : 'une version précédente'; } catch (x) { /* autre programme */ }
  console.error(`\n*** Le port ${PORT} est déjà utilisé${autre ? ` par ${autre} de l’Atelier de Blocs` : ''}. ***`);
  console.error('Ferme l’autre fenêtre du serveur local (ou redémarre l’ordinateur), puis relance lancer-atelier.');
  console.error(autre ? 'Sinon le navigateur continue d’afficher l’ancienne version.\n' : `Ou choisis un autre port : PORT=8790 node serveur.js\n`);
  process.exit(1);
});
serveur.listen(PORT, '127.0.0.1', () => {
  console.log(`Atelier de Blocs v${VERSION} : http://localhost:${PORT}`);
  console.log(CLE_IA ? `Assistant IA prêt (modèle ${MODELE}).` : 'Pas de clé ANTHROPIC_API_KEY : l’assistant fonctionnera en copier-coller.');
  console.log(IMAGES ? `Images par IA prêtes (${IMAGES.fournisseur}, ${IMAGES.modele}).` : 'Pas de clé OPENAI_API_KEY ni GEMINI_API_KEY : le Studio donnera les prompts à copier.');
  console.log(`Connexions aux bases : ${FICHIER_CONNEXIONS} (lisible par toi seul).`);
});
