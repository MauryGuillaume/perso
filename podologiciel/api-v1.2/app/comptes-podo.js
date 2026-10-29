/* app/comptes-podo.js — comptes de PodoLogiciel au format attendu par l'écran (src/api.js, src/store/auth.js).
   S'appuie sur le socle (noyau/comptes.js) : mêmes mots de passe (scrypt), essais limités, jetons signés, journal.

   /api/auth/*   inscription, connexion (+ code 2FA), renouvellement, déconnexion, mot de passe (changé, oublié)
   /api/profile  profil du podologue
   /api/2fa/*    double authentification TOTP (Google Authenticator, 1Password…)
   /api/roles/*  gestion des comptes par un admin dans l'écran (rôle, suspension, « voir en tant que »)

   Rôles : l'écran parle admin / user / premium / vip ; la base garde admin / utilisateur / premium / vip. */
'use strict';
const crypto = require('crypto');
const QRCode = require('qrcode');
const comptes = require('../noyau/comptes');

const VERS_ECRAN = { admin: 'admin', utilisateur: 'user', premium: 'premium', vip: 'vip' };
const VERS_BASE = { admin: 'admin', user: 'utilisateur', premium: 'premium', vip: 'vip' };
const COLONNES = 'id, email, nom, prenom, cabinet, role, actif, mdp_a_changer, premiere_connexion, personnalisation, deux_facteurs_actif, derniere_connexion_le, cree_le, modifie_le';

/** Profil tel que l'écran le lit (jamais de mot de passe ni de secret). */
const profil = u => u && ({
  id: u.id, email: u.email, role: VERS_ECRAN[u.role] || 'user', suspended: !u.actif,
  nom: u.nom, prenom: u.prenom, cabinet: u.cabinet, firstLogin: u.premiere_connexion, customization: u.personnalisation || {},
  twoFactorEnabled: u.deux_facteurs_actif, mustChangePassword: u.mdp_a_changer, lastLoginAt: u.derniere_connexion_le, createdAt: u.cree_le, updatedAt: u.modifie_le
});

/* ---------- TOTP (RFC 6238) et chiffrement du secret ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(octets) {
  let bits = '', out = '';
  for (const o of octets) bits += o.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function deBase32(texte) {
  let bits = '';
  for (const c of String(texte).replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function codeTotp(secret, pas) {
  const compteur = Buffer.alloc(8);
  compteur.writeBigUInt64BE(BigInt(pas));
  const h = crypto.createHmac('sha1', deBase32(secret)).update(compteur).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
/** Code à 6 chiffres valable pour la fenêtre de 30 s en cours (± 30 s de décalage d'horloge). */
function codeValide(secret, code) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const pas = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some(d => comptes.egal(codeTotp(secret, pas + d), c));
}

module.exports.routes = function (r, { base, journal, env, erreur }) {
  const { chiffrer, dechiffrer } = require('./chiffrement')(env, '2fa');
  const lire = id => base.une(`select ${COLONNES} from utilisateurs where id = $1`, [id]);
  /** Vérifie le code 2FA d'un compte, avec la même limite d'essais que la connexion. */
  const verifierCode = async (ctx, id, code) => {
    const cles = ['2fa:' + id, 'ip:' + ctx.ip];
    if (comptes.bloque(cles)) throw erreur(429, 'Trop d’essais, réessaie dans 15 minutes.');
    const u = await base.une('select deux_facteurs_secret from utilisateurs where id = $1', [id]);
    const secret = u && dechiffrer(u.deux_facteurs_secret);
    if (!secret || !codeValide(secret, code)) { comptes.noterEchec(cles); throw erreur(400, 'Code incorrect.'); }
  };
  // L'écran est en « email » : l'identifiant du compte admin par défaut se tape « admin » ou « admin@admin »
  const identifiant = email => { const e = String(email || '').trim().toLowerCase(); return e === 'admin@admin' ? comptes.ADMIN_DEFAUT.email : e; };
  const PUBLIC = { role: 'public' }, PROVISOIRE = { mdpProvisoire: true };

  /* ---------- Inscription, connexion ---------- */
  r.post('/api/auth/register', PUBLIC, async (req, ctx) => {
    if (!env.get('INSCRIPTION_OUVERTE')) throw erreur(403, 'Les comptes sont créés par l’administrateur.');
    const email = comptes.controlerEmail(ctx.corps.email);
    comptes.controlerMdp(ctx.corps.password);
    const u = await base.une(`insert into utilisateurs (email, mdp_hash) values ($1, $2) on conflict (email) do nothing returning ${COLONNES}`,
      [email, await comptes.hacher(ctx.corps.password)]);
    if (!u) throw erreur(409, 'Un compte existe déjà avec cet email.');
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'inscription', email);
    return { user: profil(u) };
  });

  r.post('/api/auth/login', PUBLIC, async (req, ctx) => {
    const u = await comptes.verifierConnexion(ctx, identifiant(ctx.corps.email), ctx.corps.password);
    const complet = await lire(u.id);
    if (complet.deux_facteurs_actif) {
      await journal(Object.assign({}, ctx, { utilisateur: u }), 'connexion_2fa_demandee', u.email);
      return { status: 'requires2fa', pendingToken: comptes.signerJeton({ sub: u.id, typ: '2fa' }, 5) };
    }
    const tokens = await comptes.ouvrirJetons(ctx, u);
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'connexion', u.email, { par: 'jetons' });
    return { status: 'ok', tokens, user: profil(complet) };
  });

  r.post('/api/auth/login/2fa', PUBLIC, async (req, ctx) => {
    const p = comptes.lireJeton(ctx.corps.pendingToken, '2fa');
    if (!p) throw erreur(401, 'Session de connexion expirée, reconnecte-toi.');
    await verifierCode(ctx, p.sub, ctx.corps.code);
    const u = await lire(p.sub);
    if (!u || !u.actif) throw erreur(401, 'Compte désactivé.');
    const tokens = await comptes.ouvrirJetons(ctx, u);
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'connexion', u.email, { par: 'jetons', deuxFacteurs: true });
    return { tokens, user: profil(u) };
  });

  r.post('/api/auth/refresh', PUBLIC, async (req, ctx) => comptes.renouvelerJetons(ctx, ctx.corps.refreshToken));

  r.post('/api/auth/logout', PROVISOIRE, async (req, ctx) => {
    if (!ctx.utilisateur.usurpe_par) await comptes.fermerJetons(ctx.utilisateur.id);
    await journal(ctx, 'deconnexion', ctx.utilisateur.email);
    return { ok: true };
  });

  r.post('/api/auth/change-password', PROVISOIRE, async (req, ctx) => {
    if (ctx.utilisateur.usurpe_par) throw erreur(403, 'Impossible en « voir en tant que ».');
    const u = await base.une('select mdp_hash from utilisateurs where id = $1', [ctx.utilisateur.id]);
    if (!(await comptes.verifier(String(ctx.corps.currentPassword || ''), u.mdp_hash))) throw erreur(400, 'Mot de passe actuel incorrect.');
    comptes.controlerMdp(ctx.corps.newPassword);
    if (ctx.corps.newPassword === ctx.corps.currentPassword) throw erreur(400, 'Le nouveau mot de passe doit être différent.');
    await base.requete('update utilisateurs set mdp_hash = $2, mdp_a_changer = false where id = $1', [ctx.utilisateur.id, await comptes.hacher(ctx.corps.newPassword)]);
    await base.requete('delete from sessions where utilisateur_id = $1', [ctx.utilisateur.id]);
    await journal(ctx, 'mdp_change', ctx.utilisateur.email);
    return { ok: true };
  });

  /* ---------- Mot de passe oublié ---------- */
  const empreinte = t => crypto.createHash('sha256').update(String(t)).digest('hex');
  r.post('/api/auth/forgot-password', PUBLIC, async (req, ctx) => {
    const email = String(ctx.corps.email || '').trim().toLowerCase();
    const cles = ['oubli:' + email, 'ip:' + ctx.ip];
    if (comptes.bloque(cles)) throw erreur(429, 'Trop d’essais, réessaie dans 15 minutes.');
    comptes.noterEchec(['oubli:' + email]);   // au plus quelques demandes par email
    const u = await base.une('select id, email from utilisateurs where email = $1 and actif', [email]);
    if (u) {
      const jeton = crypto.randomBytes(32).toString('base64url');
      await base.requete('delete from reinitialisations_mdp where utilisateur_id = $1 or expire_le < now()', [u.id]);
      await base.requete("insert into reinitialisations_mdp (utilisateur_id, jeton_hash, expire_le) values ($1, $2, now() + interval '1 hour')", [u.id, empreinte(jeton)]);
      const page = env.get('LIEN_REINITIALISATION') || (env.get('APP_URL') || 'http://localhost:5173') + '/#/reset-password';
      // Pas d'envoi d'email branché : le lien est écrit dans les journaux du serveur (à remplacer par un envoi SMTP)
      console.log(`[mot de passe oublié] ${u.email} : ${page}${page.includes('?') ? '&' : '?'}token=${jeton}`);
      await journal(Object.assign({}, ctx, { utilisateur: u }), 'mdp_oublie', u.email);
    }
    return { ok: true };   // même réponse que le compte existe ou non
  });

  r.post('/api/auth/reset-password', PUBLIC, async (req, ctx) => {
    comptes.controlerMdp(ctx.corps.newPassword);
    const d = await base.une('delete from reinitialisations_mdp where jeton_hash = $1 and expire_le > now() returning utilisateur_id', [empreinte(ctx.corps.resetToken || '')]);
    if (!d) throw erreur(400, 'Lien invalide ou expiré : refais une demande.');
    const u = await base.une('update utilisateurs set mdp_hash = $2, mdp_a_changer = false where id = $1 returning id, email', [d.utilisateur_id, await comptes.hacher(ctx.corps.newPassword)]);
    await base.requete('delete from sessions where utilisateur_id = $1', [u.id]);
    await comptes.fermerJetons(u.id);
    await journal(Object.assign({}, ctx, { utilisateur: u }), 'mdp_reinitialise', u.email);
    return { ok: true };
  });

  /* ---------- Profil ---------- */
  r.get('/api/profile', PROVISOIRE, async (req, ctx) => profil(await lire(ctx.utilisateur.id)));

  r.patch('/api/profile', PROVISOIRE, async (req, ctx) => {
    const c = ctx.corps, champs = {};
    for (const [cleEcran, col, max] of [['nom', 'nom', 120], ['prenom', 'prenom', 120], ['cabinet', 'cabinet', 200]]) {
      if (c[cleEcran] !== undefined) champs[col] = String(c[cleEcran] == null ? '' : c[cleEcran]).trim().slice(0, max);
    }
    if (c.firstLogin !== undefined) champs.premiere_connexion = !!c.firstLogin;
    if (c.customization !== undefined) {
      if (!c.customization || typeof c.customization !== 'object' || Array.isArray(c.customization)) throw erreur(400, 'Personnalisation invalide.');
      champs.personnalisation = JSON.stringify(c.customization);
    }
    const cles = Object.keys(champs);
    if (!cles.length) return profil(await lire(ctx.utilisateur.id));
    const u = await base.une(`update utilisateurs set ${cles.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1 returning ${COLONNES}`, [ctx.utilisateur.id, ...cles.map(k => champs[k])]);
    return profil(u);
  });

  /* ---------- Double authentification ---------- */
  r.get('/api/2fa/status', async (req, ctx) => ({ enabled: !!(await lire(ctx.utilisateur.id)).deux_facteurs_actif }));

  r.post('/api/2fa/setup', async (req, ctx) => {
    const u = await lire(ctx.utilisateur.id);
    if (u.deux_facteurs_actif) throw erreur(409, 'La double authentification est déjà activée.');
    const secret = base32(crypto.randomBytes(20));
    await base.requete('update utilisateurs set deux_facteurs_secret = $2 where id = $1', [u.id, chiffrer(secret)]);
    const otpauth = `otpauth://totp/${encodeURIComponent('PodoLogiciel:' + u.email)}?secret=${secret}&issuer=PodoLogiciel&algorithm=SHA1&digits=6&period=30`;
    return { secret, otpauthUrl: otpauth, qrCodeDataUrl: await QRCode.toDataURL(otpauth, { margin: 1, width: 220 }) };
  });

  r.post('/api/2fa/enable', async (req, ctx) => {
    await verifierCode(ctx, ctx.utilisateur.id, ctx.corps.code);
    await base.requete('update utilisateurs set deux_facteurs_actif = true where id = $1', [ctx.utilisateur.id]);
    await journal(ctx, '2fa_activee', ctx.utilisateur.email);
    return { enabled: true };
  });

  r.delete('/api/2fa', async (req, ctx) => {
    await verifierCode(ctx, ctx.utilisateur.id, ctx.corps.code);
    await base.requete('update utilisateurs set deux_facteurs_actif = false, deux_facteurs_secret = null where id = $1', [ctx.utilisateur.id]);
    await journal(ctx, '2fa_desactivee', ctx.utilisateur.email);
    return { enabled: false };
  });

  /* ---------- Comptes (admin de l'écran) ---------- */
  const ADMIN = { role: 'admin' };
  const cible = async id => { const u = await lire(id); if (!u) throw erreur(404, 'Compte introuvable.'); return u; };
  const dernierAdmin = async id => !(await base.une("select 1 from utilisateurs where role = 'admin' and actif and id <> $1 limit 1", [id]));

  r.get('/api/roles/users', ADMIN, async () =>
    (await base.lignes(`select ${COLONNES} from utilisateurs order by cree_le`)).map(u => Object.assign(profil(u), { permissions: [] })));

  r.patch('/api/roles/users/:id/role', ADMIN, async (req, ctx) => {
    const role = VERS_BASE[ctx.corps.role];
    if (!role) throw erreur(400, 'Rôle inconnu (admin, user, premium ou vip).');
    const u = await cible(ctx.params.id);
    if (u.role === 'admin' && role !== 'admin' && await dernierAdmin(u.id)) throw erreur(400, 'C’est le dernier compte admin : impossible de lui retirer ce rôle.');
    const apres = await base.une(`update utilisateurs set role = $2 where id = $1 returning ${COLONNES}`, [u.id, role]);
    await journal(ctx, 'compte_modifie', u.email, { role });
    return Object.assign(profil(apres), { permissions: [] });
  });

  r.patch('/api/roles/users/:id/suspended', ADMIN, async (req, ctx) => {
    const u = await cible(ctx.params.id);
    const suspendre = !!ctx.corps.suspended;
    if (suspendre && u.id === ctx.utilisateur.id) throw erreur(400, 'Tu ne peux pas suspendre ton propre compte.');
    if (suspendre && u.role === 'admin' && await dernierAdmin(u.id)) throw erreur(400, 'C’est le dernier compte admin : impossible de le suspendre.');
    const apres = await base.une(`update utilisateurs set actif = $2 where id = $1 returning ${COLONNES}`, [u.id, !suspendre]);
    if (suspendre) { await comptes.fermerJetons(u.id); await base.requete('delete from sessions where utilisateur_id = $1', [u.id]); }
    await journal(ctx, 'compte_modifie', u.email, { actif: !suspendre });
    return Object.assign(profil(apres), { permissions: [] });
  });

  r.post('/api/roles/users/:id/impersonate', ADMIN, async (req, ctx) => {
    if (ctx.utilisateur.usurpe_par) throw erreur(403, 'Déjà en « voir en tant que ».');
    const u = await cible(ctx.params.id);
    if (!u.actif) throw erreur(400, 'Compte suspendu.');
    await journal(ctx, 'voir_en_tant_que', u.email);
    return { accessToken: comptes.signerJeton({ sub: u.id, typ: 'acces', imp: ctx.utilisateur.id }, 5) };
  });
};
