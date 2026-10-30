/* outils/store-visuels.js — visuels des stores : icônes, bannière Google Play et captures d'écran (OUTIL DE DÉVELOPPEMENT)
   Kit « App complète » de l'Atelier de Blocs. Node 18+, le pg de l'app et Playwright (Chromium). KIT.md § 18.

   node outils/store-visuels.js postgres://utilisateur:motdepasse@localhost:5432/postgres
     (ou RECETTE_DATABASE_URL) : un serveur PostgreSQL de TEST, jamais celui de production. Comme la recette, l'outil
     crée une base jetable, lance l'app, crée le compte de démo et les données de store.json → captures.donnees,
     photographie chaque écran de captures.ecrans à la taille de chaque appareil, puis supprime la base.
   node outils/store-visuels.js --sans-captures   icônes et bannière seulement (ni base, ni serveur)
   Options : --brut (captures sans légende ni cadre), mon-app/ (autre dossier).

   Écrit dans store/visuels/ :
     google-play/icone-512.png              icône de la fiche (512 × 512)
     google-play/banniere-1024x500.png      image de présentation (1024 × 500, sans transparence)
     google-play/telephone/1.png …          captures téléphone (1080 × 1920)
     google-play/tablette-10/1.png …        captures tablette 7" et 10" (1600 × 2560), si l'app tourne sur iPad
     app-store/icone-1024.png               icône App Store (1024 × 1024, sans transparence ; l'app mobile embarque la sienne)
     app-store/iphone-6.9/1.png …           captures iPhone 6,9" (1320 × 2868)
     app-store/ipad-13/1.png …              captures iPad 13" (2064 × 2752), si l'app tourne sur iPad
   Playwright : déjà là dans l'Atelier ou en CI ; sinon « npm install --no-save playwright && npx playwright install chromium ». */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib'), net = require('net'), { spawn, spawnSync } = require('child_process');
const store = require('./store-app.js');

const args = process.argv.slice(2);
const racine = path.resolve(args.find(a => !a.startsWith('--') && !/^postgres/.test(a)) || '.');
const sansCaptures = args.includes('--sans-captures'), brut = args.includes('--brut');
const urlServeur = args.find(a => /^postgres(ql)?:\/\//.test(a)) || process.env.RECETTE_DATABASE_URL;
const sortie = path.join(racine, 'store/visuels');

const APPAREILS = [
  { id: 'app-store/iphone-6.9', l: 440, h: 956, dpr: 3, mobile: true },
  { id: 'app-store/ipad-13', l: 1032, h: 1376, dpr: 2, mobile: true, ipad: true },
  { id: 'google-play/telephone', l: 360, h: 640, dpr: 3, mobile: true },
  { id: 'google-play/tablette-10', l: 800, h: 1280, dpr: 2, mobile: true, ipad: true }
];

function playwright() {
  const chemins = [racine, process.cwd(), __dirname];
  const npm = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding: 'utf8' });
  if (npm.stdout) chemins.push(npm.stdout.trim());
  for (const p of chemins) { try { return require(require.resolve('playwright', { paths: [p] })); } catch (e) { /* suivant */ } }
  console.error('Playwright introuvable. Dans l’app : « npm install --no-save playwright && npx playwright install chromium », puis relance.');
  process.exit(2);
}

/* ---------- PNG sans transparence (App Store, bannière Play) : RGBA → RGB, sur fond blanc ---------- */
function pngSansAlpha(buf) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const morceau = (type, data) => { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
  let p = 8, ihdr = null; const idat = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') ihdr = Buffer.from(data); else if (type === 'IDAT') idat.push(data);
    p += 12 + n;
  }
  const l = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4), profondeur = ihdr[8], couleur = ihdr[9];
  if (couleur === 2 || profondeur !== 8 || ihdr[12] !== 0) return buf;
  const bpp = couleur === 6 ? 4 : couleur === 4 ? 2 : couleur === 0 ? 1 : 0;
  if (!bpp) return buf;
  const brut = zlib.inflateSync(Buffer.concat(idat)), ligne = l * bpp;
  const px = Buffer.alloc(ligne * h);
  for (let y = 0; y < h; y++) {
    const f = brut[y * (ligne + 1)], src = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1)), dst = px.subarray(y * ligne, (y + 1) * ligne), haut = y ? px.subarray((y - 1) * ligne, y * ligne) : null;
    for (let i = 0; i < ligne; i++) {
      const a = i >= bpp ? dst[i - bpp] : 0, b = haut ? haut[i] : 0, c = haut && i >= bpp ? haut[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      dst[i] = v & 0xff;
    }
  }
  const rgb = Buffer.alloc((l * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    rgb[y * (l * 3 + 1)] = 0;
    for (let x = 0; x < l; x++) {
      const s = y * ligne + x * bpp, d = y * (l * 3 + 1) + 1 + x * 3;
      const al = bpp === 4 || bpp === 2 ? px[s + bpp - 1] / 255 : 1;
      for (let k = 0; k < 3; k++) { const v = bpp >= 3 ? px[s + k] : px[s]; rgb[d + k] = Math.round(v * al + 255 * (1 - al)); }
    }
  }
  const entete = Buffer.from(ihdr); entete[9] = 2;
  return Buffer.concat([buf.subarray(0, 8), morceau('IHDR', entete), morceau('IDAT', zlib.deflateSync(rgb, { level: 9 })), morceau('IEND', Buffer.alloc(0))]);
}

/* ---------- Mise en page (HTML rendu par Chromium, aux couleurs de l'univers) ---------- */
const univers = () => { try { return fs.readFileSync(path.join(racine, 'public/univers.css'), 'utf8'); } catch (e) { return ''; } };
const echapper = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** L'icône en carré plein (les stores arrondissent eux-mêmes) : le grand rectangle arrondi du fond devient carré. */
function iconeCarree() {
  let svg = '';
  try { svg = fs.readFileSync(path.join(racine, 'public/icone.svg'), 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, ''); } catch (e) { return null; }
  const vb = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
  if (vb) svg = svg.replace(new RegExp(`(<rect[^>]*width="${vb[1]}"[^>]*height="${vb[2]}"[^>]*?)\\s+rx="[^"]*"`), '$1');
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
const gabarit = (corps, css) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${univers()}
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
body { font-family: var(--police); color: var(--texte); background: var(--fond); -webkit-font-smoothing: antialiased; }
${css}</style></head><body>${corps}</body></html>`;

async function rendre(navigateur, l, h, dpr, html, opaque) {
  const page = await navigateur.newPage({ viewport: { width: l, height: h }, deviceScaleFactor: dpr });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  return opaque ? pngSansAlpha(png) : png;
}
function ecrire(rel, octets) {
  const c = path.join(sortie, rel);
  fs.mkdirSync(path.dirname(c), { recursive: true });
  fs.writeFileSync(c, octets);
  return path.relative(racine, c);
}

async function icones(navigateur, ctx) {
  const ico = iconeCarree();
  const html = taille => gabarit(ico ? `<img src="${ico}" alt="">` : `<div class="ini">${echapper((ctx.d.nomApp || 'A').charAt(0).toUpperCase())}</div>`,
    `body { background: var(--primaire); } img { display: block; width: 100%; height: 100%; }
     .ini { width: 100%; height: 100%; display: grid; place-items: center; color: var(--sur-primaire); font: var(--graisse-titres) ${Math.round(taille * 0.55)}px var(--police-titres); }`);
  const faits = [];
  faits.push(ecrire('google-play/icone-512.png', await rendre(navigateur, 512, 512, 1, html(512), false)));
  faits.push(ecrire('app-store/icone-1024.png', await rendre(navigateur, 1024, 1024, 1, html(1024), true)));
  const f = ctx.fiche;
  faits.push(ecrire('google-play/banniere-1024x500.png', await rendre(navigateur, 1024, 500, 1, gabarit(`
    <div class="b"><div class="motif"></div>${ico ? `<img src="${ico}" alt="">` : ''}<div class="t"><h1>${echapper(f.nom || ctx.d.nomApp)}</h1><p>${echapper(f.sousTitre || f.descriptionCourte || '')}</p></div></div>`,
    `.b { position: relative; width: 100%; height: 100%; display: flex; align-items: center; gap: 56px; padding: 0 88px; box-sizing: border-box;
       background: linear-gradient(135deg, var(--primaire), var(--accent)); color: var(--sur-primaire); }
     .motif { position: absolute; inset: 0; background: var(--motif, none); background-size: var(--motif-taille, 24px); opacity: .18; }
     .b img { position: relative; width: 220px; height: 220px; border-radius: 48px; box-shadow: 0 18px 40px rgba(0,0,0,.25); flex: none; }
     .t { position: relative; max-width: 600px; }
     h1 { margin: 0 0 14px; font: var(--graisse-titres) 64px/1.05 var(--police-titres); letter-spacing: var(--lettrage-titres); text-transform: var(--casse-titres); }
     p { margin: 0; font-size: 30px; line-height: 1.3; opacity: .95; }`), true)));
  return faits;
}

/** Une capture mise en scène : la légende en haut, l'écran de l'app dans un cadre arrondi. */
function cadre(a, ecranPng, legende) {
  const img = 'data:image/png;base64,' + ecranPng.toString('base64');
  const echelle = a.l > 700 ? 0.8 : 0.78;
  return gabarit(`<div class="s"><div class="motif"></div><h1>${echapper(legende)}</h1><div class="ecran"><img src="${img}" alt=""></div></div>`,
    `.s { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; padding-top: ${Math.round(a.h * 0.055)}px;
       background: linear-gradient(170deg, var(--primaire), var(--accent)); color: var(--sur-primaire); }
     .motif { position: absolute; inset: 0; background: var(--motif, none); background-size: var(--motif-taille, 24px); opacity: .16; }
     h1 { position: relative; margin: 0 ${Math.round(a.l * 0.08)}px ${Math.round(a.h * 0.04)}px; text-align: center; font: var(--graisse-titres) ${Math.round(a.l * (a.l > 700 ? 0.05 : 0.072))}px/1.15 var(--police-titres);
       letter-spacing: var(--lettrage-titres); text-wrap: balance; }
     .ecran { position: relative; width: ${Math.round(a.l * echelle)}px; height: ${Math.round(a.h * echelle)}px; border-radius: ${Math.round(Math.min(a.l, 440) * 0.07)}px; overflow: hidden;
       box-shadow: 0 0 0 ${Math.max(6, Math.round(a.l * 0.022))}px rgba(255,255,255,.9), 0 24px 60px rgba(0,0,0,.3); background: var(--fond); }
     .ecran img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }`);
}

/* ---------- Captures : base jetable, app lancée, compte de démo et données d'exemple ---------- */
const port = () => new Promise(ok => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
function lancer(variables) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, ['serveur.js'], { cwd: racine, env: Object.assign({ PATH: process.env.PATH }, variables) });
    let txt = '';
    p.stdout.on('data', d => { txt += d; if (/prête sur le port/.test(txt)) resolve({ p }); });
    p.stderr.on('data', d => { txt += d; });
    p.on('exit', code => resolve({ p, code, fini: true, txt }));
    setTimeout(() => resolve({ p, delai: true, txt }), 20000).unref();
  });
}
/** {{c1.client.id}} → valeur gardée ; {{jour-3}} → date du jour moins 3 jours (aaaa-mm-jj). */
function remplacer(v, gardes) {
  if (typeof v === 'string') {
    const seul = /^\{\{([^}]+)\}\}$/.exec(v);
    const val = expr => {
      const j = /^jour([+-]\d+)?$/.exec(expr);
      if (j) { const d = new Date(Date.now() + (parseInt(j[1] || '0', 10)) * 86400e3); return d.toISOString().slice(0, 10); }
      return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), gardes);
    };
    if (seul) { const r = val(seul[1]); if (r === undefined) throw new Error(`captures : {{${seul[1]}}} inconnu`); return r; }
    return v.replace(/\{\{([^}]+)\}\}/g, (_, e) => { const r = val(e); if (r === undefined) throw new Error(`captures : {{${e}}} inconnu`); return r; });
  }
  if (Array.isArray(v)) return v.map(x => remplacer(x, gardes));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, remplacer(x, gardes)]));
  return v;
}

async function captures(navigateur, ctx) {
  let pg;
  try { pg = require(require.resolve('pg', { paths: [racine] })); } catch (e) { console.error('Module pg introuvable : lance « npm install » dans l’app.'); process.exit(2); }
  const nomBase = 'visuels_' + crypto.randomBytes(3).toString('hex');
  const urlBase = (() => { const u = new URL(urlServeur); u.pathname = '/' + nomBase; return u.toString(); })();
  const urlAdmin = (() => { const u = new URL(urlServeur); u.pathname = '/postgres'; return u.toString(); })();
  const CLE = crypto.randomBytes(24).toString('base64url'), CODE = crypto.randomBytes(6).toString('hex'), MDP = 'Visuels-' + crypto.randomBytes(6).toString('hex');
  const P = await port(), base = 'http://127.0.0.1:' + P;
  const cap = ctx.fiche.captures || {}, faits = [];
  let serveur = null;
  try {
    serveur = await lancer({ APP_ENV: 'developpement', PORT: String(P), DATABASE_URL: urlBase, DB_CREER_BASE: '1', ADMIN_API_KEY: CLE, INSTALL_CODE: CODE, ADMIN_DEFAUT: '0',
      REQUETES_PAR_MINUTE: '10000', PAIEMENT_ACTIF: '1', PUB_ACTIVE: '0', APP_NOM: ctx.fiche.nom || '' });
    if (serveur.fini || serveur.delai) throw new Error('le serveur ne démarre pas : ' + String(serveur.txt || '').trim().split('\n').slice(-3).join(' | '));
    const api = async (methode, chemin, corps, o = {}) => {
      const r = await fetch(base + chemin, { method: methode, headers: Object.assign({ 'X-Appli': '1', Accept: 'application/json' }, corps === undefined ? {} : { 'Content-Type': 'application/json' }, o.cle ? { Authorization: 'Bearer ' + CLE } : {}, o.cookie ? { Cookie: o.cookie } : {}),
        body: corps === undefined ? undefined : JSON.stringify(corps) });
      const sc = r.headers.get('set-cookie'); let json = {}; try { json = await r.json(); } catch (e) { /* vide */ }
      if (r.status >= 300) throw new Error(`${methode} ${chemin} : ${r.status} ${json.message || json.erreur || ''}`);
      return { json, cookie: sc ? sc.split(';')[0] : o.cookie };
    };
    await api('POST', '/api/installation', { code: CODE, email: 'admin@visuels.test', nom: 'Admin', mdp: MDP, appNom: ctx.fiche.nom || '' });
    /** Compte prêt : créé par l'admin, mot de passe provisoire changé, palier donné. */
    const creer = async (email, nom, palier) => {
      await api('POST', '/api/admin/utilisateurs', { email, nom, role: cap.role || 'utilisateur', mdp: MDP }, { cle: true });
      let { cookie } = await api('POST', '/api/connexion', { email, mdp: MDP });
      const nouveau = MDP + '-2';
      ({ cookie } = await api('POST', '/api/moi/mdp', { ancien: MDP, nouveau, confirmation: nouveau }, { cookie }));
      const id = (await api('GET', '/api/moi', undefined, { cookie })).json.utilisateur.id;
      if (palier && palier !== 'gratuit') await api('POST', '/api/admin/tables/abonnements', { utilisateur_id: id, palier, source: 'manuel', note: 'captures des stores' }, { cle: true });
      return { email, mdp: nouveau, cookie };
    };
    const paliers = ctx.d.paliers.map(p => p.id);
    const demo = await creer(String((ctx.fiche.revue || {}).compteDemo || 'demo@visuels.test').replace(/⟦|⟧/g, '') || 'demo@visuels.test', cap.nom || 'Camille Martin', cap.offre || paliers[paliers.length - 1]);
    const gardes = {};
    for (const [i, etape] of (cap.donnees || []).entries()) {
      try { const r = await api(etape.methode || 'POST', remplacer(etape.chemin, gardes), remplacer(etape.corps, gardes), { cookie: demo.cookie }); if (etape.garder) gardes[etape.garder] = r.json; }
      catch (e) { throw new Error(`captures.donnees[${i}] : ${e.message}`); }
    }
    const gratuit = (cap.ecrans || []).some(e => e.compte === 'gratuit') ? await creer('gratuit@visuels.test', cap.nom || 'Camille Martin', 'gratuit') : null;

    for (const a of APPAREILS.filter(x => ctx.d.ipad || !x.ipad)) {
      const contextes = {};
      const contexte = async compte => {
        if (contextes[compte.email]) return contextes[compte.email];
        const c = await navigateur.newContext({ viewport: { width: a.l, height: a.h }, deviceScaleFactor: a.dpr, isMobile: a.mobile, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
        await c.request.post(base + '/api/connexion', { data: { email: compte.email, mdp: compte.mdp }, headers: { 'X-Appli': '1' } });
        return (contextes[compte.email] = c);
      };
      for (const [i, e] of (cap.ecrans || []).entries()) {
        const page = await (await contexte(e.compte === 'gratuit' && gratuit ? gratuit : demo)).newPage();
        await page.goto(base + '/' + remplacer(e.route, gardes), { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const png = await page.screenshot({ type: 'png' });
        await page.close();
        const fini = brut || !e.legende ? png : await rendre(navigateur, a.l, a.h, a.dpr, cadre(a, png, e.legende), false);
        faits.push(ecrire(`${a.id}/${i + 1}.png`, pngSansAlpha(fini)));
      }
      for (const c of Object.values(contextes)) await c.close();
    }
  } finally {
    if (serveur && serveur.p && serveur.p.exitCode === null) { serveur.p.kill('SIGTERM'); await new Promise(ok => { serveur.p.once('exit', ok); setTimeout(ok, 6000); }); }
    const c = new pg.Client({ connectionString: urlAdmin });
    try { await c.connect(); await c.query(`drop database if exists "${nomBase}" with (force)`); } catch (e) { console.error(`Base ${nomBase} non supprimée : ${e.message}`); } finally { await c.end().catch(() => {}); }
  }
  return faits;
}

(async () => {
  if (!sansCaptures && !urlServeur) { console.error('Indique un serveur PostgreSQL de test : node outils/store-visuels.js postgres://…/postgres (ou --sans-captures pour les icônes et la bannière seulement)'); process.exit(2); }
  const ctx = store.charger(racine);
  if (ctx.erreur) { console.error(ctx.erreur); process.exit(1); }
  const { chromium } = playwright();
  const navigateur = await chromium.launch();
  const faits = [];
  let erreur = null;
  try {
    // Les anciennes captures partent : un écran retiré de store.json ne doit pas rester dans le dossier
    if (!sansCaptures) for (const a of APPAREILS) fs.rmSync(path.join(sortie, a.id), { recursive: true, force: true });
    faits.push(...await icones(navigateur, ctx));
    if (!sansCaptures) faits.push(...await captures(navigateur, ctx));
  } catch (e) { erreur = e; } finally { await navigateur.close(); }
  console.log(`Visuels des stores — ${racine}\n`);
  faits.forEach(f => console.log('  ✓ ' + f));
  if (erreur) { console.log(`\n  ✗ ${erreur.message}`); process.exitCode = 1; return; }
  const restes = store.controlerVisuels(store.charger(racine));
  console.log(restes.length ? `\n  ! ${restes[0]}` : `\nVisuels prêts (règle 30). Regarde chaque image avant de l’envoyer.`);
})();
