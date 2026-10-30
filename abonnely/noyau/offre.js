/* noyau/offre.js — offre commune à toutes les apps : paliers (Gratuit, Premium…), rôle vip, abonnements, publicité.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier (l'offre de l'app se déclare dans app/app.js → offre).

   - Paliers : app.offre.paliers, du moins cher au plus cher ; le premier est toujours « gratuit ». Chaque palier dit s'il
     montre la pub, ses limites ({ achats: 20 }) et ses avantages ; un palier payant a ses prix TTC { mois, an }.
   - Palier d'un compte : admin et vip = palier le plus haut, sans payer ; sinon le meilleur abonnement en cours
     (table abonnements : actif, ou annulé mais pas encore échu) ; sinon « gratuit ».
   - Routes : r.get('/api/export', { palier: 'premium' }, fn) refuse (402) un compte d'un palier inférieur ;
     offre.limite(ctx, 'achats', nombreActuel) refuse (402) au-delà de la limite du palier.
   - Publicité (PUB_ACTIVE) : un seul format, le bandeau en bas de l'écran, pour les paliers « pub: true » ; jamais pour
     admin ni vip. Paiement (PAIEMENT_ACTIF) : Stripe Checkout sur le web, RevenueCat (App Store, Google Play) sur mobile ;
     éteint, l'écran Abonnement affiche « bientôt disponible » et rien ne peut être acheté.
   - Webhooks : POST /api/offre/stripe (signature Stripe-Signature vérifiée, STRIPE_WEBHOOK_SECRET),
     POST /api/offre/revenuecat (en-tête Authorization = REVENUECAT_WEBHOOK_CLE). Un abonnement offert se crée depuis
     l'Atelier (Données › abonnements, source « manuel »). */
'use strict';
const crypto = require('crypto');
const env = require('./env');
// Chargés à la première utilisation : outils/verifier-app.js contrôle l'offre (declarer) sans base ni dépendance installée
const base = new Proxy({}, { get: (_, k) => require('./base')[k] });
const journal = (...a) => require('./journal')(...a);
const { erreur } = require('./http');

const ID = /^[a-z][a-z0-9_]*$/;
const ROLES_SOCLE = ['admin', 'vip', 'utilisateur'];
let paliers = [{ id: 'gratuit', libelle: 'Gratuit', pub: false, limites: {}, avantages: [] }];

/** Lit et contrôle app.offre ; lève une erreur claire si le format commun n'est pas respecté. */
function declarer(offre) {
  if (!offre) return paliers;
  const l = offre.paliers;
  const fautes = [];
  if (!Array.isArray(l) || !l.length) fautes.push('offre.paliers doit être une liste');
  else {
    if (l[0].id !== 'gratuit') fautes.push('le premier palier est « gratuit »');
    if (l.length > 3) fautes.push('3 paliers au plus (gratuit, premium, pro)');
    const vus = new Set();
    l.forEach((p, i) => {
      if (!ID.test(p.id || '') || vus.has(p.id)) fautes.push(`palier ${i + 1} : id en minuscules, unique`);
      vus.add(p.id);
      if (!p.libelle) fautes.push(`palier ${p.id} : libellé manquant`);
      if (i > 0 && !(p.prix && (p.prix.mois > 0 || p.prix.an > 0))) fautes.push(`palier ${p.id} : prix TTC { mois, an } attendu`);
      Object.entries(p.limites || {}).forEach(([k, v]) => { if (!ID.test(k) || !(Number.isInteger(v) && v >= 0)) fautes.push(`palier ${p.id} : limite ${k} (entier attendu)`); });
    });
    if (l.length > 1 && l[l.length - 1].pub) fautes.push('le palier le plus haut est sans publicité');
  }
  if (fautes.length) throw new Error('app/app.js → offre : ' + fautes.join(' ; '));
  paliers = l.map(p => ({ id: p.id, libelle: p.libelle, pub: !!p.pub, prix: p.prix || null, limites: Object.assign({}, p.limites || {}),
    avantages: (p.avantages || []).map(String), essaiJours: p.essaiJours || 0 }));
  return paliers;
}
const rang = id => paliers.findIndex(p => p.id === id);
const palier = id => paliers[Math.max(0, rang(id))];
const plusHaut = () => paliers[paliers.length - 1];

/** Palier effectif d'un compte : { palier, source, fin_le, gere (abonnement Stripe à gérer dans le portail) }. */
async function palierDe(u) {
  if (!u) return { palier: paliers[0], source: 'gratuit', fin_le: null };
  if (u.role === 'admin' || u.role === 'vip') return { palier: plusHaut(), source: u.role, fin_le: null };
  const abos = await base.lignes(`select palier, source, statut, fin_le, client_externe from abonnements
    where utilisateur_id = $1 and statut in ('actif', 'annule') and (fin_le is null or fin_le > now())`, [u.id]);
  let meilleur = null;
  for (const a of abos) if (rang(a.palier) > 0 && (!meilleur || rang(a.palier) > rang(meilleur.palier))) meilleur = a;
  if (!meilleur) return { palier: paliers[0], source: 'gratuit', fin_le: null };
  return { palier: palier(meilleur.palier), source: meilleur.source, statut: meilleur.statut, fin_le: meilleur.fin_le, gere: meilleur.source === 'stripe' && !!meilleur.client_externe };
}

/** Ce que le front doit savoir (session) : palier, pub à afficher, paiement ouvert, catalogue. */
async function etat(u) {
  const p = await palierDe(u);
  const pub = env.get('PUB_ACTIVE') && p.palier.pub;
  return {
    palier: p.palier.id, libelle: p.palier.libelle, source: p.source, statut: p.statut || 'actif', fin_le: p.fin_le, gere: !!p.gere, limites: p.palier.limites,
    pub, admob: pub ? { android: env.get('ADMOB_BANNIERE_ANDROID') || '', ios: env.get('ADMOB_BANNIERE_IOS') || '' } : null,
    paiement: env.get('PAIEMENT_ACTIF') && paliers.length > 1,
    revenuecat: env.get('PAIEMENT_ACTIF') ? { android: env.get('REVENUECAT_CLE_ANDROID') || '', ios: env.get('REVENUECAT_CLE_IOS') || '' } : null,
    paliers: catalogue()
  };
}
const catalogue = () => paliers.map(p => ({ id: p.id, libelle: p.libelle, pub: p.pub, prix: p.prix, limites: p.limites, avantages: p.avantages, essaiJours: p.essaiJours }));

/** Refuse (402) si le compte n'a pas au moins ce palier. */
async function exiger(ctx, id) {
  if (rang(id) < 0) throw new Error(`Palier inconnu dans une route : ${id} (déclare-le dans app/app.js → offre)`);
  if (ctx.parCle) return true;
  const p = await palierDe(ctx.utilisateur);
  if (rang(p.palier.id) >= rang(id)) return true;
  const e = erreur(402, `Cette fonction fait partie de l’offre ${palier(id).libelle}.`);
  e.palier = id;
  throw e;
}
/** Limite du palier du compte pour « cle » (Infinity sans limite). */
async function limiteDe(ctx, cle) {
  const p = (await palierDe(ctx.utilisateur)).palier;
  return Number.isInteger(p.limites[cle]) ? p.limites[cle] : Infinity;
}
/** Refuse (402) d'ajouter un élément quand « actuel » atteint la limite du palier ; propose le palier suivant qui l'accepte. */
async function limite(ctx, cle, actuel) {
  const max = await limiteDe(ctx, cle);
  if (actuel < max) return max;
  const p = (await palierDe(ctx.utilisateur)).palier;
  const suivant = paliers.slice(rang(p.id) + 1).find(x => !Number.isInteger(x.limites[cle]) || x.limites[cle] > actuel);
  const e = erreur(402, `Limite atteinte : ${max} avec l’offre ${p.libelle}.${suivant ? ` Passe à ${suivant.libelle} pour aller plus loin.` : ''}`);
  e.palier = suivant ? suivant.id : null;
  throw e;
}

/* ---------- Abonnements venus des fournisseurs ---------- */
async function enregistrer(a) {
  if (!a.utilisateur_id || rang(a.palier) < 1) return null;
  const u = await base.une('select id from utilisateurs where id = $1', [a.utilisateur_id]);
  if (!u) return null;
  return base.une(`insert into abonnements (utilisateur_id, palier, source, statut, periode, fin_le, id_externe, client_externe)
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    on conflict (source, id_externe) where id_externe is not null do update set palier = excluded.palier, statut = excluded.statut,
      periode = coalesce(excluded.periode, abonnements.periode), fin_le = excluded.fin_le, client_externe = coalesce(excluded.client_externe, abonnements.client_externe)
    returning id, utilisateur_id, palier, source, statut, fin_le`,
  [a.utilisateur_id, a.palier, a.source, a.statut, a.periode || null, a.fin_le || null, a.id_externe, a.client_externe || null]);
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const date = s => s ? new Date(s * 1000) : null;

/** Signature d'un webhook Stripe : t=…,v1=… ; HMAC SHA-256 de « t.corps », 5 minutes de tolérance. */
function signatureStripe(entete, brut, secret) {
  const parts = String(entete || '').split(',').map(x => x.split('='));
  const t = (parts.find(x => x[0] === 't') || [])[1];
  const sigs = parts.filter(x => x[0] === 'v1').map(x => x[1]);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const attendu = crypto.createHmac('sha256', secret).update(`${t}.${brut.toString('utf8')}`).digest('hex');
  return sigs.some(s => s.length === attendu.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(attendu)));
}
async function stripe(chemin, champs) {
  const corps = new URLSearchParams();
  Object.entries(champs).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') corps.append(k, String(v)); });
  const r = await fetch('https://api.stripe.com/v1/' + chemin, { method: 'POST', body: corps,
    headers: { Authorization: 'Bearer ' + env.get('STRIPE_SECRET'), 'Content-Type': 'application/x-www-form-urlencoded' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`[offre] Stripe ${chemin} : ${(j.error && j.error.message) || r.status}`); throw erreur(502, 'Le service de paiement ne répond pas, réessaie plus tard.'); }
  return j;
}
const prixStripe = (id, periode) => {
  const ligne = env.get('STRIPE_PRIX').find(x => x.split('=')[0].trim() === `${id}_${periode}`);
  return ligne ? ligne.split('=')[1].trim() : '';
};
const STATUT_STRIPE = s => ['active', 'trialing', 'past_due'].includes(s) ? 'actif' : ['canceled', 'unpaid', 'incomplete_expired'].includes(s) ? 'expire' : null;

/* ---------- Routes ---------- */
function routes(r) {
  r.get('/api/offre', { role: 'public' }, async (req, ctx) => etat(ctx.utilisateur));

  // Achat sur le web : session Stripe Checkout, l'abonnement arrive par le webhook
  r.post('/api/offre/payer', async (req, ctx) => {
    if (!env.get('PAIEMENT_ACTIF')) throw erreur(409, 'Le paiement n’est pas encore ouvert.');
    const id = String(ctx.corps.palier || ''), periode = ctx.corps.periode === 'an' ? 'an' : 'mois';
    if (rang(id) < 1) throw erreur(400, 'Palier inconnu.');
    if (ctx.utilisateur.role === 'admin' || ctx.utilisateur.role === 'vip') throw erreur(409, 'Ton compte a déjà tous les avantages, sans payer.');
    const prix = prixStripe(id, periode);
    if (!env.get('STRIPE_SECRET') || !prix) throw erreur(503, 'Le paiement par carte n’est pas configuré (STRIPE_SECRET, STRIPE_PRIX).');
    const url = env.get('APP_URL') || `http://${ctx.req.headers.host}`;
    const meta = { utilisateur_id: ctx.utilisateur.id, palier: id, periode };
    const champs = { mode: 'subscription', 'line_items[0][price]': prix, 'line_items[0][quantity]': 1, client_reference_id: ctx.utilisateur.id,
      success_url: url + '/#/abonnement/merci', cancel_url: url + '/#/abonnement', allow_promotion_codes: 'true', locale: 'fr',
      customer_email: /@/.test(ctx.utilisateur.email) ? ctx.utilisateur.email : undefined };
    Object.entries(meta).forEach(([k, v]) => { champs[`metadata[${k}]`] = v; champs[`subscription_data[metadata][${k}]`] = v; });
    const essai = palier(id).essaiJours;
    if (essai && !(await base.une('select 1 from abonnements where utilisateur_id = $1 limit 1', [ctx.utilisateur.id]))) champs['subscription_data[trial_period_days]'] = essai;
    const s = await stripe('checkout/sessions', champs);
    await journal(ctx, 'paiement_demande', id, { periode });
    return { url: s.url };
  });

  // Résilier ou changer de carte : portail Stripe (aussi simple que l'achat)
  r.post('/api/offre/portail', async (req, ctx) => {
    if (!env.get('PAIEMENT_ACTIF') || !env.get('STRIPE_SECRET')) throw erreur(409, 'Le paiement n’est pas encore ouvert.');
    const a = await base.une(`select client_externe from abonnements where utilisateur_id = $1 and source = 'stripe' and client_externe is not null
      order by cree_le desc limit 1`, [ctx.utilisateur.id]);
    if (!a) throw erreur(404, 'Aucun abonnement par carte pour ce compte. Un abonnement pris sur téléphone se gère dans l’App Store ou Google Play.');
    const s = await stripe('billing_portal/sessions', { customer: a.client_externe, return_url: (env.get('APP_URL') || `http://${ctx.req.headers.host}`) + '/#/abonnement' });
    return { url: s.url };
  });

  r.post('/api/offre/stripe', { role: 'public', limite: 5e5 }, async (req, ctx) => {
    const secret = env.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw erreur(503, 'Webhook Stripe non configuré.');
    if (!signatureStripe(req.headers['stripe-signature'], ctx.brut || Buffer.alloc(0), secret)) throw erreur(400, 'Signature Stripe invalide.');
    const ev = ctx.corps || {}, o = (ev.data && ev.data.object) || {};
    const meta = o.metadata || {};
    let a = null;
    if (ev.type === 'checkout.session.completed' && o.mode === 'subscription' && o.subscription) {
      a = await enregistrer({ utilisateur_id: UUID.test(meta.utilisateur_id || '') ? meta.utilisateur_id : o.client_reference_id, palier: meta.palier, source: 'stripe',
        statut: 'actif', periode: meta.periode, id_externe: o.subscription, client_externe: o.customer });
    } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type) && UUID.test(meta.utilisateur_id || '')) {
      const fin = o.current_period_end || (o.items && o.items.data && o.items.data[0] && o.items.data[0].current_period_end);
      let statut = ev.type.endsWith('deleted') ? 'expire' : STATUT_STRIPE(o.status);
      if (statut === 'actif' && o.cancel_at_period_end) statut = 'annule';
      if (statut) a = await enregistrer({ utilisateur_id: meta.utilisateur_id, palier: meta.palier, source: 'stripe', statut, periode: meta.periode,
        fin_le: statut === 'expire' ? new Date() : date(fin), id_externe: o.id, client_externe: o.customer });
    }
    if (a) await journal(ctx, 'abonnement_' + a.statut, a.utilisateur_id, { source: 'stripe', palier: a.palier, evenement: ev.type });
    return { recu: true };
  });

  r.post('/api/offre/revenuecat', { role: 'public', limite: 5e5 }, async (req, ctx) => {
    const cle = env.get('REVENUECAT_WEBHOOK_CLE');
    if (!cle) throw erreur(503, 'Webhook RevenueCat non configuré.');
    const recue = String(req.headers.authorization || '');
    if (recue.length !== cle.length || !crypto.timingSafeEqual(Buffer.from(recue), Buffer.from(cle))) throw erreur(401, 'Clé du webhook refusée.');
    const ev = (ctx.corps && ctx.corps.event) || {};
    const id = [].concat(ev.entitlement_ids || [], ev.entitlement_id || []).find(x => rang(x) > 0);
    const statuts = { INITIAL_PURCHASE: 'actif', RENEWAL: 'actif', UNCANCELLATION: 'actif', PRODUCT_CHANGE: 'actif', NON_RENEWING_PURCHASE: 'actif',
      CANCELLATION: 'annule', EXPIRATION: 'expire' };
    let a = null;
    if (statuts[ev.type] && id && UUID.test(ev.app_user_id || '')) {
      a = await enregistrer({ utilisateur_id: ev.app_user_id, palier: id, source: ev.store === 'APP_STORE' || ev.store === 'MAC_APP_STORE' ? 'apple' : 'google',
        statut: statuts[ev.type], periode: /annual|year|an/i.test(ev.product_id || '') ? 'an' : 'mois',
        fin_le: ev.type === 'EXPIRATION' ? new Date() : ev.expiration_at_ms ? new Date(ev.expiration_at_ms) : null,
        id_externe: ev.original_transaction_id || `${ev.app_user_id}:${ev.product_id}` });
    }
    if (a) await journal(ctx, 'abonnement_' + a.statut, a.utilisateur_id, { source: a.source, palier: a.palier, evenement: ev.type });
    return { recu: true };
  });
}

/** Résumé pour l'Atelier (État) : paliers, comptes par palier, alertes de configuration. */
async function resume() {
  const parPalier = await base.lignes(`select palier, count(distinct utilisateur_id)::int as comptes from abonnements
    where statut in ('actif', 'annule') and (fin_le is null or fin_le > now()) group by palier`);
  const vip = (await base.une("select count(*)::int as n from utilisateurs where role = 'vip' and actif")).n;
  const alertes = [];
  if (env.get('PAIEMENT_ACTIF')) {
    if (!env.get('STRIPE_SECRET') && !env.get('REVENUECAT_WEBHOOK_CLE')) alertes.push({ niveau: 'erreur', texte: 'PAIEMENT_ACTIF=1 sans STRIPE_SECRET ni REVENUECAT_WEBHOOK_CLE : rien ne peut être acheté.' });
    if (env.get('STRIPE_SECRET') && !env.get('STRIPE_WEBHOOK_SECRET')) alertes.push({ niveau: 'erreur', texte: 'STRIPE_WEBHOOK_SECRET absent : les paiements Stripe ne seront jamais enregistrés.' });
    paliers.slice(1).forEach(p => ['mois', 'an'].filter(x => p.prix && p.prix[x] > 0).forEach(x => {
      if (env.get('STRIPE_SECRET') && !prixStripe(p.id, x)) alertes.push({ niveau: 'erreur', texte: `STRIPE_PRIX : prix « ${p.id}_${x} » manquant.` });
    }));
  }
  if (env.get('PUB_ACTIVE') && !env.get('ADMOB_BANNIERE_ANDROID') && !env.get('ADMOB_BANNIERE_IOS')) alertes.push({ niveau: 'conseil', texte: 'PUB_ACTIVE=1 sans identifiant AdMob : le bandeau affiche la promotion de l’offre payante (pub maison).' });
  return { paliers: catalogue(), pub: env.get('PUB_ACTIVE'), paiement: env.get('PAIEMENT_ACTIF'), vip,
    abonnes: Object.fromEntries(parPalier.map(x => [x.palier, x.comptes])), alertes };
}

module.exports = { declarer, routes, etat, palierDe, exiger, limite, limiteDe, resume, catalogue, rang, signatureStripe, ROLES_SOCLE };
