/* noyau/comptes.js — comptes, mots de passe, sessions, rôles, première installation.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier.

   - Mots de passe : scrypt (sel aléatoire), longueur minimale MDP_MIN, jamais stockés ni journalisés en clair.
   - Session : jeton aléatoire de 32 octets dans un cookie HttpOnly, SameSite=Lax (Secure en production) ;
     seule son empreinte SHA-256 est en base ; durée SESSION_HEURES, prolongée à chaque activité.
   - Essais de connexion : 5 échecs pour un même email ou une même IP → attente de 15 minutes. Message identique
     pour « compte inconnu » et « mauvais mot de passe ».
   - Accès de l'Atelier : en-tête « Authorization: Bearer <ADMIN_API_KEY> » = droits d'admin (comparaison à temps constant).
   - Jetons (front séparé, app mobile) : « Authorization: Bearer <jeton d'accès> » (JWT HS256 signé par JETON_SECRET, JETON_MINUTES),
     renouvelé par un jeton de renouvellement à usage unique (JETON_JOURS, seule son empreinte est en base, table jetons).
     L'app ouvre les jetons avec ouvrirJetons(ctx, u) dans ses propres routes de connexion ; mêmes règles que la session
     (compte actif vérifié à chaque requête, mot de passe provisoire, rôles).
   - Compte admin par défaut (ADMIN_DEFAUT=1, défaut) : sur une base sans admin, le démarrage crée l'identifiant « admin »
     avec le mot de passe « adminadmin », à changer obligatoirement à la première connexion (alerte dans l'Atelier tant
     qu'il ne l'est pas).
   - Première installation (ADMIN_DEFAUT=0) : tant qu'aucun admin n'existe, POST /api/installation crée le premier compte admin avec le
     code INSTALL_CODE (ou le code affiché dans les journaux du serveur au démarrage). L'Atelier peut aussi le créer. */
'use strict';
const crypto = require('crypto');
const base = require('./base');
const env = require('./env');
const journal = require('./journal');
const { erreur } = require('./http');
const offre = require('./offre');

const COOKIE = 'sid';
const scrypt = (mdp, sel) => new Promise((ok, ko) => crypto.scrypt(mdp, sel, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? ko(e) : ok(k)));
const egal = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const empreinte = jeton => crypto.createHash('sha256').update(jeton).digest('hex');

async function hacher(mdp) {
  const sel = crypto.randomBytes(16);
  return `scrypt$16384$8$1$${sel.toString('base64')}$${(await scrypt(mdp, sel)).toString('base64')}`;
}
async function verifier(mdp, hash) {
  const [algo, , , , sel, cle] = String(hash || '').split('$');
  if (algo !== 'scrypt' || !sel) { await scrypt('x', Buffer.alloc(16)); return false; }   // même durée qu'un vrai essai
  return egal((await scrypt(mdp, Buffer.from(sel, 'base64'))).toString('base64'), cle);
}

/** Règle des mots de passe : longueur, et pas uniquement des lettres ou uniquement des chiffres. */
function controlerMdp(mdp) {
  const min = env.get('MDP_MIN');
  if (typeof mdp !== 'string' || mdp.length < min) throw erreur(400, `Le mot de passe doit faire au moins ${min} caractères.`);
  if (mdp.length > 200) throw erreur(400, 'Mot de passe trop long.');
  if (/^[a-zA-Z]+$/.test(mdp) || /^\d+$/.test(mdp)) throw erreur(400, 'Le mot de passe doit mêler lettres et chiffres ou symboles.');
}
const controlerEmail = email => {
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) throw erreur(400, 'Adresse email invalide.');
  return e;
};
/** Mot de passe provisoire lisible (pour un compte créé par l'admin). */
const mdpProvisoire = () => crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 14) + '-' + crypto.randomInt(10, 99);

/* ---------- Essais de connexion ---------- */
const echecs = new Map();   // clé (email ou ip) → { n, jusqua }
setInterval(() => { const t = Date.now(); for (const [k, v] of echecs) if (v.jusqua < t && t - v.dernier > 3600e3) echecs.delete(k); }, 600e3).unref();
function bloque(cles) { const t = Date.now(); return cles.some(k => { const v = echecs.get(k); return v && v.jusqua > t; }); }
function noterEchec(cles) {
  for (const k of cles) {
    const v = echecs.get(k) || { n: 0, jusqua: 0 };
    v.n++; v.dernier = Date.now();
    if (v.n >= 5) { v.jusqua = Date.now() + 15 * 60e3; v.n = 0; }
    echecs.set(k, v);
  }
}

/* ---------- Sessions ---------- */
function cookieSession(jeton, maxAge) {
  const secure = env.get('APP_ENV') === 'production' ? '; Secure' : '';
  return `${COOKIE}=${jeton || ''}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}
async function ouvrirSession(ctx, u) {
  const jeton = crypto.randomBytes(32).toString('base64url');
  const heures = env.get('SESSION_HEURES');
  await base.requete('insert into sessions (id, utilisateur_id, expire_le, ip, agent) values ($1, $2, now() + make_interval(hours => $3), $4, $5)',
    [empreinte(jeton), u.id, heures, ctx.ip, String(ctx.req.headers['user-agent'] || '').slice(0, 200)]);
  await base.requete('update utilisateurs set derniere_connexion_le = now() where id = $1', [u.id]);
  await base.requete('delete from sessions where expire_le < now()');
  ctx.res.setHeader('Set-Cookie', cookieSession(jeton, heures * 3600));
}

/* ---------- Jetons (JWT HS256, sans dépendance) ---------- */
let secretAuHasard = null;
function secretJetons() {
  if (env.get('JETON_SECRET')) return env.get('JETON_SECRET');
  if (!secretAuHasard) {
    secretAuHasard = crypto.randomBytes(48).toString('base64');
    if (env.get('APP_ENV') === 'production') console.warn('[comptes] JETON_SECRET absent : les jetons sont perdus à chaque redémarrage. Renseigne-le chez l’hébergeur.');
  }
  return secretAuHasard;
}
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
/** Signe un jeton : contenu (sub = id du compte, typ = sorte du jeton) valable « minutes ». */
function signerJeton(contenu, minutes) {
  const t = Math.floor(Date.now() / 1000);
  const corps = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64(Object.assign({}, contenu, { iat: t, exp: t + Math.round(minutes * 60) }));
  return corps + '.' + crypto.createHmac('sha256', secretJetons()).update(corps).digest('base64url');
}
/** Lit un jeton signé ; null s'il est faux, expiré ou d'une autre sorte. */
function lireJeton(jeton, typ) {
  const [e, c, sig] = String(jeton || '').split('.');
  if (!e || !c || !sig) return null;
  const attendu = crypto.createHmac('sha256', secretJetons()).update(e + '.' + c).digest('base64url');
  if (!egal(sig, attendu)) return null;
  try {
    const p = JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
    if (!p.exp || p.exp < Date.now() / 1000 || (typ && p.typ !== typ)) return null;
    return p;
  } catch (err) { return null; }
}
/** Ouvre une connexion par jetons : { accessToken, refreshToken } (le second est à usage unique). */
async function ouvrirJetons(ctx, u, extra) {
  const renouv = crypto.randomBytes(32).toString('base64url');
  await base.requete('insert into jetons (id, utilisateur_id, expire_le, ip, agent) values ($1, $2, now() + make_interval(days => $3), $4, $5)',
    [empreinte(renouv), u.id, env.get('JETON_JOURS'), ctx.ip || null, String((ctx.req && ctx.req.headers['user-agent']) || '').slice(0, 200)]);
  await base.requete('update utilisateurs set derniere_connexion_le = now() where id = $1', [u.id]);
  await base.requete('delete from jetons where expire_le < now()');
  return { accessToken: signerJeton(Object.assign({ sub: u.id, typ: 'acces' }, extra || {}), env.get('JETON_MINUTES')), refreshToken: renouv };
}
/** Échange un jeton de renouvellement contre une nouvelle paire ; l'ancien ne sert plus. */
async function renouvelerJetons(ctx, refreshToken) {
  const ligne = await base.une(`delete from jetons j using utilisateurs u where j.id = $1 and j.expire_le > now() and u.id = j.utilisateur_id and u.actif
    returning u.id`, [empreinte(String(refreshToken || ''))]);
  if (!ligne) throw erreur(401, 'Session expirée, reconnecte-toi.');
  return ouvrirJetons(ctx, ligne);
}
/** Ferme toutes les connexions par jetons d'un compte (déconnexion, mot de passe changé, compte désactivé). */
async function fermerJetons(utilisateurId) { await base.requete('delete from jetons where utilisateur_id = $1', [utilisateurId]); }

const PUBLIC_UTILISATEUR = 'id, email, nom, role, actif, mdp_a_changer, derniere_connexion_le, cree_le';
const role = (u, roles) => roles.includes(u.role) || u.role === 'admin';

/** Qui fait la requête ? Contrôle le rôle demandé par la route. */
async function auth(req, route, ip) {
  const roles = [].concat(route.role);
  // Atelier : clé d'admin
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  // Jeton d'accès d'un compte (trois parties séparées par des points) : mêmes règles que la session
  if (bearer && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(bearer[1]) && !(env.get('ADMIN_API_KEY') && egal(bearer[1], env.get('ADMIN_API_KEY')))) {
    const p = lireJeton(bearer[1], 'acces');
    const u = p && await base.une(`select ${PUBLIC_UTILISATEUR} from utilisateurs where id = $1 and actif`, [p.sub]);
    if (!u) {
      if (roles.includes('public')) return { utilisateur: null };
      throw erreur(401, 'Session expirée, reconnecte-toi.');
    }
    if (p.imp) u.usurpe_par = p.imp;   // jeton « voir en tant que » ouvert par un admin
    if (u.mdp_a_changer && !route.mdpProvisoire && !route.chemin.startsWith('/api/moi')) throw erreur(403, 'Change d’abord ton mot de passe provisoire.');
    if (!roles.includes('public') && !roles.includes('utilisateur') && !role(u, roles)) throw erreur(403, 'Accès réservé.');
    return { utilisateur: u };
  }
  if (bearer) {
    const cle = env.get('ADMIN_API_KEY');
    if (bloque(['cle:' + ip])) throw erreur(429, 'Trop d’essais, réessaie dans 15 minutes.');
    if (!cle || !egal(bearer[1], cle)) { noterEchec(['cle:' + ip]); throw erreur(401, 'Clé d’admin refusée.'); }
    if (!roles.some(x => x === 'admin' || x === 'public')) throw erreur(403, 'La clé d’admin ne sert qu’aux routes d’administration.');
    return { utilisateur: null, parCle: true };
  }
  if (roles.includes('public')) return { utilisateur: await utilisateurDuCookie(req) };
  const u = await utilisateurDuCookie(req);
  if (!u) throw erreur(401, 'Connecte-toi pour continuer.');
  if (u.mdp_a_changer && !route.mdpProvisoire && !route.chemin.startsWith('/api/moi')) throw erreur(403, 'Change d’abord ton mot de passe provisoire.');
  if (!roles.includes('utilisateur') && !role(u, roles)) throw erreur(403, 'Accès réservé.');
  return { utilisateur: u };
}
async function utilisateurDuCookie(req) {
  const jeton = (String(req.headers.cookie || '').match(/(?:^|;\s*)sid=([^;]+)/) || [])[1];
  if (!jeton) return null;
  const u = await base.une(`update sessions s set expire_le = now() + make_interval(hours => $2) from utilisateurs u
    where s.id = $1 and s.expire_le > now() and u.id = s.utilisateur_id and u.actif
    returning ${PUBLIC_UTILISATEUR.split(', ').map(c => 'u.' + c).join(', ')}`, [empreinte(jeton), env.get('SESSION_HEURES')]);
  return u;
}

/* ---------- Première installation ---------- */
let codeInstallation = null;
async function installationAFaire() { return !(await base.une("select 1 from utilisateurs where role = 'admin' and actif limit 1")); }
const ADMIN_DEFAUT = { email: 'admin', mdp: 'adminadmin' };
async function annoncerInstallation() {
  if (!(await installationAFaire())) return;
  if (env.get('ADMIN_DEFAUT')) {
    await base.requete(`insert into utilisateurs (email, nom, role, mdp_hash, mdp_a_changer) values ($1, 'Administrateur', 'admin', $2, true)
      on conflict (email) do update set role = 'admin', actif = true, mdp_hash = excluded.mdp_hash, mdp_a_changer = true`, [ADMIN_DEFAUT.email, await hacher(ADMIN_DEFAUT.mdp)]);
    await journal({}, 'admin_defaut_cree', ADMIN_DEFAUT.email);
    console.log('[installation] Compte admin par défaut créé : identifiant « admin », mot de passe « adminadmin » — à changer à la première connexion.');
    return;
  }
  if (!env.get('INSTALL_CODE')) {
    codeInstallation = crypto.randomBytes(5).toString('hex');
    console.log(`[installation] Aucun admin. Ouvre l'app et saisis le code d'installation : ${codeInstallation}`);
  } else console.log('[installation] Aucun admin. Ouvre l’app et saisis le code INSTALL_CODE.');
}

/** Vérifie email + mot de passe (essais limités, même message pour compte inconnu et mauvais mot de passe). Renvoie le compte. */
async function verifierConnexion(ctx, emailBrut, mdp) {
  const email = String(emailBrut || '').trim().toLowerCase();
  const cles = ['email:' + email, 'ip:' + ctx.ip];
  if (bloque(cles)) throw erreur(429, 'Trop d’essais, réessaie dans 15 minutes.');
  const u = await base.une(`select ${PUBLIC_UTILISATEUR}, mdp_hash from utilisateurs where email = $1`, [email]);
  const ok = await verifier(String(mdp || ''), u && u.mdp_hash);
  if (!u || !ok || !u.actif) {
    noterEchec(cles);
    await journal(ctx, 'connexion_refusee', email);
    throw erreur(401, 'Email ou mot de passe incorrect.');
  }
  delete u.mdp_hash;
  return u;
}

/* ---------- Routes ---------- */
function routes(r, app) {
  r.get('/api/session', { role: 'public' }, async (req, ctx) => ({
    utilisateur: ctx.utilisateur, installation: await installationAFaire(), inscription: env.get('INSCRIPTION_OUVERTE'),
    app: { nom: await nomApp(app), version: app.version || '1.0.0' }, mdpMin: env.get('MDP_MIN'),
    roles: rolesDe(app), offre: await offre.etat(ctx.utilisateur)
  }));

  r.post('/api/installation', { role: 'public' }, async (req, ctx) => {
    if (!(await installationAFaire())) throw erreur(409, 'L’app est déjà installée.');
    const cles = ['inst:' + ctx.ip];
    if (bloque(cles)) throw erreur(429, 'Trop d’essais, réessaie dans 15 minutes.');
    const attendu = env.get('INSTALL_CODE') || codeInstallation;
    if (!attendu || !egal(String(ctx.corps.code || '').trim(), attendu)) { noterEchec(cles); await journal(ctx, 'installation_refusee', ''); throw erreur(403, 'Code d’installation incorrect.'); }
    const email = controlerEmail(ctx.corps.email);
    controlerMdp(ctx.corps.mdp);
    const nom = String(ctx.corps.nom || '').trim().slice(0, 120);
    const u = await base.une(`insert into utilisateurs (email, nom, role, mdp_hash) values ($1, $2, 'admin', $3)
      on conflict (email) do update set role = 'admin', mdp_hash = excluded.mdp_hash, actif = true returning ${PUBLIC_UTILISATEUR}`, [email, nom, await hacher(ctx.corps.mdp)]);
    if (ctx.corps.appNom) await enregistrerReglage('app_nom', String(ctx.corps.appNom).slice(0, 80), u.id);
    codeInstallation = null;
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'installation', email);
    await ouvrirSession(ctx, u);
    return { utilisateur: u };
  });

  r.post('/api/connexion', { role: 'public' }, async (req, ctx) => {
    const u = await verifierConnexion(ctx, ctx.corps.email, ctx.corps.mdp);
    await ouvrirSession(ctx, u);
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'connexion', u.email);
    return { utilisateur: u };
  });

  // Connexion par jetons (front séparé, app mobile) : mêmes contrôles, sans cookie
  r.post('/api/jetons', { role: 'public' }, async (req, ctx) => {
    const u = await verifierConnexion(ctx, ctx.corps.email, ctx.corps.mdp);
    const jetons = await ouvrirJetons(ctx, u);
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'connexion', u.email, { par: 'jetons' });
    return Object.assign({ utilisateur: u }, jetons);
  });
  r.post('/api/jetons/renouveler', { role: 'public' }, async (req, ctx) => renouvelerJetons(ctx, ctx.corps.refreshToken));
  r.delete('/api/jetons', { mdpProvisoire: true }, async (req, ctx) => { await fermerJetons(ctx.utilisateur.id); return { ok: true }; });

  r.post('/api/inscription', { role: 'public' }, async (req, ctx) => {
    if (!env.get('INSCRIPTION_OUVERTE')) throw erreur(403, 'Les comptes sont créés par l’administrateur.');
    const email = controlerEmail(ctx.corps.email);
    controlerMdp(ctx.corps.mdp);
    const u = await base.une(`insert into utilisateurs (email, nom, mdp_hash) values ($1, $2, $3) on conflict (email) do nothing returning ${PUBLIC_UTILISATEUR}`,
      [email, String(ctx.corps.nom || '').trim().slice(0, 120), await hacher(ctx.corps.mdp)]);
    if (!u) throw erreur(409, 'Un compte existe déjà avec cet email.');
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'inscription', email);
    await ouvrirSession(ctx, u);
    return { utilisateur: u };
  });

  r.post('/api/deconnexion', { role: 'public' }, async (req, ctx) => {
    const jeton = (String(req.headers.cookie || '').match(/(?:^|;\s*)sid=([^;]+)/) || [])[1];
    if (jeton) await base.requete('delete from sessions where id = $1', [empreinte(jeton)]);
    ctx.res.setHeader('Set-Cookie', cookieSession('', 0));
    return { ok: true };
  });

  r.get('/api/moi', async (req, ctx) => ({ utilisateur: ctx.utilisateur, offre: await offre.etat(ctx.utilisateur) }));

  r.post('/api/moi/mdp', async (req, ctx) => {
    const u = await base.une('select mdp_hash from utilisateurs where id = $1', [ctx.utilisateur.id]);
    if (!(await verifier(String(ctx.corps.ancien || ''), u.mdp_hash))) throw erreur(400, 'Mot de passe actuel incorrect.');
    controlerMdp(ctx.corps.nouveau);
    if (ctx.corps.nouveau === ctx.corps.ancien) throw erreur(400, 'Le nouveau mot de passe doit être différent.');
    await base.requete('update utilisateurs set mdp_hash = $2, mdp_a_changer = false where id = $1', [ctx.utilisateur.id, await hacher(ctx.corps.nouveau)]);
    await base.requete('delete from sessions where utilisateur_id = $1', [ctx.utilisateur.id]);
    await fermerJetons(ctx.utilisateur.id);
    await ouvrirSession(ctx, ctx.utilisateur);
    await journal(ctx, 'mdp_change', ctx.utilisateur.email);
    return { ok: true };
  });
}

/** Rôles de l'app : ceux du socle (admin, vip, utilisateur) puis ceux de app/app.js, avec leur libellé. */
function rolesDe(app) {
  return [{ id: 'admin', libelle: 'Administrateur', description: 'Gère les comptes et les réglages ; tous les avantages de l’offre la plus haute' },
    { id: 'vip', libelle: 'VIP', description: 'Tous les avantages de l’offre payante la plus haute, sans payer ; aucun droit d’administration' },
    { id: 'utilisateur', libelle: 'Utilisateur', description: 'Compte standard ; ses avantages dépendent de son abonnement' }]
    .concat((app.roles || []).map(x => typeof x === 'string' ? { id: x, libelle: x } : { id: x.id, libelle: x.libelle || x.id, description: x.description || '' }));
}

/** Le compte admin par défaut a-t-il encore son mot de passe d'origine ? (alerte de l'Atelier) */
async function adminDefautActif() {
  const u = await base.une("select mdp_hash from utilisateurs where email = $1 and actif and mdp_a_changer", [ADMIN_DEFAUT.email]);
  return !!u && await verifier(ADMIN_DEFAUT.mdp, u.mdp_hash);
}

async function enregistrerReglage(cle, valeur, par) {
  await base.requete(`insert into reglages (cle, valeur, modifie_par) values ($1, $2, $3)
    on conflict (cle) do update set valeur = excluded.valeur, modifie_par = excluded.modifie_par`, [cle, JSON.stringify(valeur), par || null]);
}
async function nomApp(app) {
  if (env.get('APP_NOM')) return env.get('APP_NOM');
  const r = await base.une("select valeur from reglages where cle = 'app_nom'");
  return (r && r.valeur) || app.nom || 'Mon app';
}

module.exports = { auth, routes, hacher, verifier, controlerMdp, controlerEmail, mdpProvisoire, annoncerInstallation, installationAFaire,
  enregistrerReglage, nomApp, adminDefautActif, rolesDe, PUBLIC_UTILISATEUR, egal,
  signerJeton, lireJeton, ouvrirJetons, renouvelerJetons, fermerJetons, verifierConnexion, bloque, noterEchec, ADMIN_DEFAUT };
