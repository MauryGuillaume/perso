/* app/app.js — Abonnely : suivi des abonnements (streaming, musique, box, téléphone, salle de sport…).
   Kit « App complète » : le noyau lit cette déclaration ; ne touche jamais aux fichiers de noyau/.

   nom, version      identité (le nom affiché peut être changé par APP_NOM ou le réglage partagé app_nom)
   variables         Brevo (rappels), heure de la tâche quotidienne, taille des imports
   roles             aucun rôle métier : admin, vip et utilisateur du socle suffisent
   offre             Gratuit (pub, 8 abonnements) / Premium (illimité, import CSV, lettre PDF, délai de rappel réglable)
   tables, rgpd      pour l'Atelier : libellés, colonnes d'affichage ; données personnelles et conservation
   reglages          paramètres partagés (Atelier › Réglages)
   routes(r, ctx)    API métier (KIT.md § 7) : tableau de bord, abonnements, catalogue, imports, lettre de résiliation
   demarrage(ctx)    tâche quotidienne : échéances avancées, rappels avant prélèvement et fin d'essai (Brevo) */
'use strict';
const crypto = require('crypto');

const CATEGORIES = ['video', 'musique', 'box_internet', 'telephone', 'sport', 'presse', 'jeux', 'logiciel', 'cloud', 'autre'];
const PERIODICITES = { hebdomadaire: { mois: 52 / 12, sql: '7 days', jours: 7 }, mensuelle: { mois: 1, sql: '1 month', jours: 30.4 },
  trimestrielle: { mois: 1 / 3, sql: '3 months', jours: 91.3 }, semestrielle: { mois: 1 / 6, sql: '6 months', jours: 182.6 }, annuelle: { mois: 1 / 12, sql: '1 year', jours: 365.2 } };
const RAPPEL_DEFAUT = 3;
const AUJOURDHUI = `(now() at time zone 'Europe/Paris')::date`;
const COLONNES = `s.id, s.service_id, s.libelle, s.categorie, s.montant_cts, s.periodicite, s.prochaine_echeance::text as prochaine_echeance,
  s.essai_fin::text as essai_fin, s.rappel_jours, s.source, s.resilie_le, s.cree_le, sv.nom as service_nom, sv.lien_resiliation`;

module.exports = {
  nom: 'Abonnely',
  version: '1.0.0',

  variables: [
    { cle: 'BREVO_API_KEY', type: 'texte', secret: true, obligatoireEnProduction: true, role: 'Clé de l’API transactionnelle Brevo (rappels par e-mail) ; absente en développement = e-mails écrits dans le journal du serveur' },
    { cle: 'EMAIL_EXPEDITEUR', type: 'texte', obligatoireEnProduction: true, role: 'Adresse d’expédition des rappels, validée chez Brevo (ex. rappels@abonnely.fr)' },
    { cle: 'EMAIL_EXPEDITEUR_NOM', type: 'texte', defaut: 'Abonnely', role: 'Nom affiché de l’expéditeur des rappels' },
    { cle: 'RAPPEL_HEURE', type: 'entier', defaut: '8', role: 'Heure (Paris, 0 à 23) à partir de laquelle la tâche quotidienne envoie les rappels' },
    { cle: 'RAPPELS_ACTIFS', type: 'booleen', defaut: '1', role: '1 : tâche quotidienne des rappels active ; 0 : aucun e-mail envoyé (tests, préproduction)' },
    { cle: 'IMPORT_LIGNES_MAX', type: 'entier', defaut: '5000', role: 'Nombre maximal d’opérations lues dans un relevé CSV importé' }
  ],

  roles: [],

  offre: {
    paliers: [
      { id: 'gratuit', libelle: 'Gratuit', pub: true, limites: { abonnements: 8 },
        avantages: ['Catalogue des services connus', 'Total mensuel et annuel, graphique par catégorie', 'Rappel par e-mail 3 jours avant chaque prélèvement et fin d’essai', 'Lien direct de résiliation'] },
      { id: 'premium', libelle: 'Premium', pub: false, prix: { mois: 1.99, an: 14.99 }, essaiJours: 7, limites: {},
        avantages: ['Abonnements illimités', 'Import de relevé bancaire CSV', 'Lettre de résiliation PDF', 'Délai de rappel réglable (0 à 30 jours)', 'Sans publicité'] }
    ]
  },

  tables: {
    services: { libelle: 'Catalogue des services', affichage: 'nom' },
    souscriptions: { libelle: 'Abonnements suivis', affichage: 'libelle', colonnesLectureSeule: ['source'] },
    imports: { libelle: 'Imports de relevés', affichage: 'cree_le', lectureSeule: true },
    rappels: { libelle: 'Rappels envoyés', affichage: 'echeance', lectureSeule: true }
  },

  rgpd: [
    { table: 'souscriptions', colonne: 'utilisateur_id', action: 'supprimer', colonnes: ['libelle', 'montant_cts', 'prochaine_echeance', 'essai_fin'], conservation: 'tant que le compte existe ; supprimés avec le compte' },
    { table: 'imports', colonne: 'utilisateur_id', action: 'supprimer', colonnes: ['lignes', 'detectes', 'ajoutes'], conservation: '12 mois (le relevé lui-même n’est jamais conservé)' }
  ],

  reglages: [
    { cle: 'rappel_essai_jours', libelle: 'Jours avant la fin d’un essai gratuit pour le rappel', type: 'entier', defaut: 3 },
    { cle: 'imports_conservation_mois', libelle: 'Durée de conservation des traces d’import (mois)', type: 'entier', defaut: 12 }
  ],

  routes(r, { base, journal, env, erreur, offre }) {
    outils = { base, journal, env, erreur };
    const texte = (v, max, nom, facultatif) => {
      const s = String(v == null ? '' : v).trim();
      if (!s) { if (facultatif) return null; throw erreur(400, `${nom} est obligatoire.`); }
      if (s.length > max) throw erreur(400, `${nom} : ${max} caractères maximum.`);
      return s;
    };
    const uuid = (v, nom) => { if (!/^[0-9a-f-]{36}$/i.test(String(v || ''))) throw erreur(400, `${nom} invalide.`); return String(v); };
    const date = (v, nom, facultatif) => {
      const s = String(v == null ? '' : v).trim();
      if (!s) { if (facultatif) return null; throw erreur(400, `${nom} est obligatoire.`); }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s + 'T00:00:00Z'))) throw erreur(400, `${nom} : date invalide (aaaa-mm-jj).`);
      return s;
    };
    const centimes = v => {
      const n = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 1e6) throw erreur(400, 'Montant invalide.');
      return Math.round(n * 100);
    };
    const choix = (v, liste, defaut, nom) => { const s = v == null || v === '' ? defaut : String(v); if (!liste.includes(s)) throw erreur(400, `${nom} invalide.`); return s; };

    /** Lit et contrôle un abonnement envoyé par l'écran (ajout ou modification). */
    async function lireSouscription(ctx, c, existant) {
      const d = {};
      let service = null;
      if (c.service_id !== undefined && c.service_id !== null && c.service_id !== '') {
        service = await base.une('select id, nom, categorie from services where id = $1 and actif', [uuid(c.service_id, 'Service')]);
        if (!service) throw erreur(400, 'Ce service n’est pas dans le catalogue.');
        d.service_id = service.id;
      } else if (c.service_id !== undefined || !existant) d.service_id = null;
      if (c.libelle !== undefined || !existant) d.libelle = texte(c.libelle || (service && service.nom), 80, 'Le nom');
      if (c.categorie !== undefined || !existant) d.categorie = choix(c.categorie || (service && service.categorie), CATEGORIES, 'autre', 'Catégorie');
      if (c.montant !== undefined || !existant) d.montant_cts = centimes(c.montant);
      if (c.periodicite !== undefined || !existant) d.periodicite = choix(c.periodicite, Object.keys(PERIODICITES), 'mensuelle', 'Périodicité');
      if (c.prochaine_echeance !== undefined || !existant) d.prochaine_echeance = date(c.prochaine_echeance, 'La prochaine échéance');
      if (c.essai_fin !== undefined) d.essai_fin = date(c.essai_fin, 'La fin d’essai', true);
      if (c.rappel_jours !== undefined && c.rappel_jours !== '' && c.rappel_jours !== null) {
        const j = Number(c.rappel_jours);
        if (!Number.isInteger(j) || j < 0 || j > 30) throw erreur(400, 'Délai de rappel : de 0 à 30 jours.');
        const avant = existant ? existant.rappel_jours : RAPPEL_DEFAUT;
        if (j !== avant) await offre.exiger(ctx, 'premium');   // délai réglable : Premium (402 sinon, invitation du socle)
        d.rappel_jours = j;
      }
      return d;
    }

    async function lire(ctx, id) {
      const s = await base.une(`select ${COLONNES} from souscriptions s left join services sv on sv.id = s.service_id where s.id = $1 and s.utilisateur_id = $2`,
        [uuid(id, 'Abonnement'), ctx.utilisateur.id]);
      if (!s) throw erreur(404, 'Abonnement introuvable.');
      return s;
    }
    const actifs = async ctx => (await base.une('select count(*)::int as n from souscriptions where utilisateur_id = $1 and resilie_le is null', [ctx.utilisateur.id])).n;

    r.get('/api/tableau', async (req, ctx) => {
      await avancerEcheances(ctx.utilisateur.id);
      const liste = await base.lignes(`select ${COLONNES} from souscriptions s left join services sv on sv.id = s.service_id
        where s.utilisateur_id = $1 and s.resilie_le is null order by s.prochaine_echeance, s.libelle`, [ctx.utilisateur.id]);
      const parCategorie = {};
      let mensuel = 0;
      for (const s of liste) { const m = s.montant_cts * PERIODICITES[s.periodicite].mois; mensuel += m; parCategorie[s.categorie] = (parCategorie[s.categorie] || 0) + m; }
      const essais = await base.lignes(`select s.id, s.libelle, s.essai_fin::text as essai_fin from souscriptions s
        where s.utilisateur_id = $1 and s.resilie_le is null and s.essai_fin between ${AUJOURDHUI} and ${AUJOURDHUI} + 14 order by s.essai_fin`, [ctx.utilisateur.id]);
      return {
        nombre: liste.length,
        mensuel_cts: Math.round(mensuel), annuel_cts: Math.round(mensuel * 12),
        categories: Object.entries(parCategorie).map(([categorie, m]) => ({ categorie, mensuel_cts: Math.round(m) })).sort((a, b) => b.mensuel_cts - a.mensuel_cts),
        prochains: liste.slice(0, 5), essais
      };
    });

    r.get('/api/abonnements', async (req, ctx) => {
      await avancerEcheances(ctx.utilisateur.id);
      const resilies = ctx.query.resilies === '1';
      return { abonnements: await base.lignes(`select ${COLONNES} from souscriptions s left join services sv on sv.id = s.service_id
        where s.utilisateur_id = $1 and (s.resilie_le is ${resilies ? 'not null' : 'null'}) order by ${resilies ? 's.resilie_le desc' : 's.prochaine_echeance, s.libelle'} limit 500`, [ctx.utilisateur.id]) };
    });

    r.post('/api/abonnements', async (req, ctx) => {
      await offre.limite(ctx, 'abonnements', await actifs(ctx));
      const d = await lireSouscription(ctx, ctx.corps || {}, null);
      const s = await base.une(`insert into souscriptions (utilisateur_id, service_id, libelle, categorie, montant_cts, periodicite, prochaine_echeance, essai_fin, rappel_jours)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [ctx.utilisateur.id, d.service_id, d.libelle, d.categorie, d.montant_cts, d.periodicite, d.prochaine_echeance, d.essai_fin || null, d.rappel_jours == null ? RAPPEL_DEFAUT : d.rappel_jours]);
      await avancerEcheances(ctx.utilisateur.id);
      return { abonnement: await lire(ctx, s.id) };
    });

    r.get('/api/abonnements/:id', async (req, ctx) => ({ abonnement: await lire(ctx, ctx.params.id) }));

    r.patch('/api/abonnements/:id', async (req, ctx) => {
      const existant = await lire(ctx, ctx.params.id);
      const c = ctx.corps || {};
      const d = await lireSouscription(ctx, c, existant);
      if (c.reprendre === true && existant.resilie_le) {
        await offre.limite(ctx, 'abonnements', await actifs(ctx));
        d.resilie_le = null;
      }
      const cles = Object.keys(d);
      if (cles.length) {
        await base.requete(`update souscriptions set ${cles.map((k, i) => `${base.ident(k)} = $${i + 3}`).join(', ')} where id = $1 and utilisateur_id = $2`,
          [existant.id, ctx.utilisateur.id].concat(cles.map(k => d[k])));
      }
      await avancerEcheances(ctx.utilisateur.id);
      return { abonnement: await lire(ctx, existant.id) };
    });

    // « Supprimer » = résilier : l'abonnement est archivé (resilie_le), jamais effacé (KIT.md § 9)
    r.delete('/api/abonnements/:id', async (req, ctx) => {
      const s = await lire(ctx, ctx.params.id);
      await base.requete(`update souscriptions set resilie_le = coalesce(resilie_le, now()) where id = $1 and utilisateur_id = $2`, [s.id, ctx.utilisateur.id]);
      await journal(ctx, 'abonnement_resilie', s.id, { libelle: s.libelle });
      return { ok: true };
    });

    r.get('/api/services', async (req, ctx) => {
      const q = String(ctx.query.q || '').trim().slice(0, 60);
      const cat = CATEGORIES.includes(ctx.query.categorie) ? ctx.query.categorie : '';
      return { services: await base.lignes(`select id, nom, categorie, prix_type_cts, periodicite_type, lien_resiliation from services
        where actif and ($1 = '' or nom ilike '%' || $1 || '%') and ($2 = '' or categorie = $2)
        order by (lower(nom) like lower($1) || '%') desc, nom limit $3`, [q, cat, q || cat ? 40 : 100]) };
    });

    /* ---------- Import d'un relevé CSV (Premium) : analysé en mémoire, jamais gardé ---------- */
    r.post('/api/imports', { palier: 'premium', limite: 3e6 }, async (req, ctx) => {
      const csv = String((ctx.corps || {}).csv || '');
      if (!csv.trim()) throw erreur(400, 'Le relevé est vide.');
      if (csv.length > 2.5e6) throw erreur(413, 'Relevé trop volumineux (2 Mo maximum).');
      const operations = lireReleve(csv, env.get('IMPORT_LIGNES_MAX'));
      if (!operations.length) throw erreur(400, 'Aucune opération reconnue : le fichier doit contenir des colonnes date, libellé et montant (export CSV de votre banque).');
      const services = await base.lignes('select id, nom, categorie, lien_resiliation from services where actif');
      const suivis = await base.lignes('select service_id, libelle, montant_cts from souscriptions where utilisateur_id = $1 and resilie_le is null', [ctx.utilisateur.id]);
      const propositions = detecterRecurrents(operations, services, suivis);
      const imp = await base.une('insert into imports (utilisateur_id, lignes, detectes) values ($1, $2, $3) returning id, cree_le',
        [ctx.utilisateur.id, operations.length, propositions.length]);
      return { import: { id: imp.id, lignes: operations.length, detectes: propositions.length }, propositions };
    });

    r.post('/api/imports/:id/ajouter', { palier: 'premium' }, async (req, ctx) => {
      const imp = await base.une('select id, ajoutes from imports where id = $1 and utilisateur_id = $2', [uuid(ctx.params.id, 'Import'), ctx.utilisateur.id]);
      if (!imp) throw erreur(404, 'Import introuvable.');
      const liste = Array.isArray((ctx.corps || {}).propositions) ? ctx.corps.propositions.slice(0, 100) : [];
      if (!liste.length) throw erreur(400, 'Cochez au moins un prélèvement à ajouter.');
      const lignes = [];
      for (const p of liste) lignes.push(await lireSouscription(ctx, { service_id: p.service_id || null, libelle: p.libelle, categorie: p.categorie,
        montant: p.montant, periodicite: p.periodicite, prochaine_echeance: p.prochaine_echeance }, null));
      await base.transaction(async c => {
        for (const d of lignes) {
          await c.query(`insert into souscriptions (utilisateur_id, service_id, libelle, categorie, montant_cts, periodicite, prochaine_echeance, rappel_jours, source)
            values ($1, $2, $3, $4, $5, $6, $7, $8, 'import')`, [ctx.utilisateur.id, d.service_id, d.libelle, d.categorie, d.montant_cts, d.periodicite, d.prochaine_echeance, RAPPEL_DEFAUT]);
        }
        await c.query('update imports set ajoutes = ajoutes + $2 where id = $1', [imp.id, lignes.length]);
      });
      await avancerEcheances(ctx.utilisateur.id);
      return { ajoutes: lignes.length };
    });

    /* ---------- Lettre de résiliation PDF (Premium) : nom, adresse et n° client saisis à la demande, jamais enregistrés ---------- */
    r.get('/api/abonnements/:id/lettre.pdf', { palier: 'premium' }, async (req, ctx) => {
      const s = await lire(ctx, ctx.params.id);
      const q = ctx.query;
      const pdf = lettrePdf({
        nom: texte(q.nom, 80, 'Votre nom'), adresse: texte(q.adresse, 200, 'Votre adresse'),
        numero: texte(q.numero, 60, 'Le numéro client', true), destinataire: texte(q.destinataire, 200, 'L’adresse du service', true),
        ville: texte(q.ville, 60, 'La ville', true), service: s.service_nom || s.libelle, libelle: s.libelle, echeance: s.prochaine_echeance
      });
      const fichier = 'resiliation-' + (s.libelle.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'abonnement') + '.pdf';
      ctx.res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fichier}"`, 'Cache-Control': 'no-store', 'Content-Length': pdf.length });
      ctx.res.end(pdf);
    });
  },

  async demarrage({ env }) {
    if (!env.get('RAPPELS_ACTIFS')) return;
    const lancer = () => tacheQuotidienne().catch(e => console.error('[abonnely] tâche quotidienne : ' + e.message));
    setTimeout(lancer, 10000).unref();
    setInterval(lancer, 3600 * 1000).unref();   // toutes les heures ; ne travaille qu'une fois par jour, à partir de RAPPEL_HEURE
  },

  // Pour les tests (sans serveur) : analyse d'un relevé, détection, lettre PDF
  lireReleve: (csv, max) => lireReleve(csv, max || 5000),
  detecterRecurrents: (ops, services, suivis) => detecterRecurrents(ops, services || [], suivis || []),
  lettrePdf: o => lettrePdf(o),
  tacheQuotidienne: () => tacheQuotidienne()
};

let outils = null;   // { base, journal, env, erreur } reçus du socle par routes()

const IV = `(case periodicite when 'hebdomadaire' then interval '7 days' when 'mensuelle' then interval '1 month' when 'trimestrielle' then interval '3 months'
  when 'semestrielle' then interval '6 months' else interval '1 year' end)`;
const JOURS = `(case periodicite when 'hebdomadaire' then 7 when 'mensuelle' then 30.437 when 'trimestrielle' then 91.31 when 'semestrielle' then 182.62 else 365.25 end)`;
/** Échéances passées avancées d'autant de périodes qu'il faut (comptées depuis la date d'origine : le 31 reste le 31 quand le mois l'a) :
    la « prochaine échéance » reste toujours à venir. Une seule requête. */
async function avancerEcheances(utilisateurId) {
  await outils.base.requete(`update souscriptions set prochaine_echeance = (
      select (prochaine_echeance + ${IV} * k)::date from generate_series(greatest(1, floor((${AUJOURDHUI} - prochaine_echeance) / ${JOURS})::int - 1),
        greatest(1, floor((${AUJOURDHUI} - prochaine_echeance) / ${JOURS})::int - 1) + 6) k
      where (prochaine_echeance + ${IV} * k)::date >= ${AUJOURDHUI} limit 1)
    where resilie_le is null and prochaine_echeance < ${AUJOURDHUI} and ($1::uuid is null or utilisateur_id = $1)`, [utilisateurId || null]);
}

/** Réglage partagé (table reglages du socle), sinon la valeur par défaut déclarée. */
async function reglage(cle) {
  const decl = module.exports.reglages.find(x => x.cle === cle);
  const r = await outils.base.une('select valeur from reglages where cle = $1', [cle]);
  const v = r && r.valeur != null && r.valeur !== '' ? Number(r.valeur) : NaN;
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : decl.defaut;
}

/* ======================= Rappels par e-mail (Brevo) ======================= */

const echapperHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateFr = iso => { const [a, m, j] = String(iso).slice(0, 10).split('-'); return `${j}/${m}/${a}`; };
const euros = cts => (cts / 100).toFixed(2).replace('.', ',') + ' €';

/** E-mail sortant par l'API transactionnelle Brevo. Sans clé hors production : écrit dans le journal du serveur. */
async function envoyerEmail({ a, objet, texte }) {
  const { env } = outils;
  const cle = env.get('BREVO_API_KEY');
  if (!cle) {
    if (env.get('APP_ENV') === 'production') throw new Error('BREVO_API_KEY absente');
    console.log(`[email] (non envoyé, BREVO_API_KEY absente) à ${a} — ${objet}\n${texte}`);
    return 'dev-' + crypto.randomUUID();
  }
  const corps = { sender: { email: env.get('EMAIL_EXPEDITEUR'), name: env.get('EMAIL_EXPEDITEUR_NOM') }, to: [{ email: a }], subject: objet,
    textContent: texte, htmlContent: `<div>${echapperHtml(texte).replace(/\n/g, '<br>')}</div>` };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(corps), signal: AbortSignal.timeout(30000) });
  const rep = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brevo ${res.status} : ${rep.message || rep.code || 'refus'}`);
  return rep.messageId || '';
}

let dernierJour = '';
/** Une fois par jour, à partir de RAPPEL_HEURE (Paris) : échéances avancées, rappels envoyés sans doublon (table rappels), traces d'import purgées. */
async function tacheQuotidienne(forcer) {
  if (!outils) return null;
  const { base, journal, env } = outils;
  const maintenant = await base.une(`select ${AUJOURDHUI}::text as jour, extract(hour from now() at time zone 'Europe/Paris')::int as heure`);
  if (!forcer && (maintenant.jour === dernierJour || maintenant.heure < env.get('RAPPEL_HEURE'))) return null;
  dernierJour = maintenant.jour;
  await avancerEcheances(null);
  const url = env.get('APP_URL') || '';
  const essaiJours = await reglage('rappel_essai_jours');
  const bilan = { echeances: 0, essais: 0, echecs: 0 };
  const aRappeler = await base.lignes(`
    select s.id, s.libelle, s.montant_cts, 'echeance' as sorte, s.prochaine_echeance::text as echeance, sv.lien_resiliation, u.email
      from souscriptions s join utilisateurs u on u.id = s.utilisateur_id left join services sv on sv.id = s.service_id
     where s.resilie_le is null and u.actif and u.email like '%_@_%' and s.prochaine_echeance between ${AUJOURDHUI} and ${AUJOURDHUI} + s.rappel_jours
       and (s.essai_fin is null or s.essai_fin < s.prochaine_echeance)
    union all
    select s.id, s.libelle, s.montant_cts, 'essai', s.essai_fin::text, sv.lien_resiliation, u.email
      from souscriptions s join utilisateurs u on u.id = s.utilisateur_id left join services sv on sv.id = s.service_id
     where s.resilie_le is null and u.actif and u.email like '%_@_%' and s.essai_fin between ${AUJOURDHUI} and ${AUJOURDHUI} + $1::int
    limit 5000`, [essaiJours]);
  for (const a of aRappeler) {
    const reserve = await base.une('insert into rappels (souscription_id, sorte, echeance) values ($1, $2, $3) on conflict do nothing returning id', [a.id, a.sorte, a.echeance]);
    if (!reserve) continue;
    const essai = a.sorte === 'essai';
    const objet = (essai ? `Fin d’essai le ${dateFr(a.echeance)} : ${a.libelle}` : `Prélèvement le ${dateFr(a.echeance)} : ${a.libelle} (${euros(a.montant_cts)})`).slice(0, 200);
    const texte = `Bonjour,\n\n` + (essai
      ? `L’essai gratuit de « ${a.libelle} » se termine le ${dateFr(a.echeance)}. Ensuite, l’abonnement devient payant (${euros(a.montant_cts)}).\nSi vous ne souhaitez pas le garder, c’est le moment de le résilier.`
      : `« ${a.libelle} » sera prélevé de ${euros(a.montant_cts)} le ${dateFr(a.echeance)}.\nSi vous ne l’utilisez plus, vous pouvez encore le résilier avant cette date.`) +
      (a.lien_resiliation ? `\n\nRésilier : ${a.lien_resiliation}` : '') + `\n\nVos abonnements : ${url}\n\nPour changer le délai de ces rappels : Abonnely › Abonnements › la fiche de l’abonnement.`;
    try {
      await envoyerEmail({ a: a.email, objet, texte });
      bilan[essai ? 'essais' : 'echeances']++;
    } catch (e) {
      bilan.echecs++;
      await base.requete('delete from rappels where id = $1', [reserve.id]);   // retenté au prochain passage
      console.error(`[abonnely] rappel non envoyé (${a.id}) : ${e.message}`);
    }
  }
  const mois = await reglage('imports_conservation_mois');
  await base.requete(`delete from imports where cree_le < now() - make_interval(months => $1)`, [Math.max(1, mois)]);
  if (bilan.echeances || bilan.essais || bilan.echecs) await journal({ utilisateur: null, ip: 'tâche' }, 'rappels_envoyes', '', bilan).catch(() => {});
  return bilan;
}

/* ======================= Relevé CSV : lecture et détection des prélèvements récurrents ======================= */

const DATE_FR = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;
const MONTANT = /^[+-]?\s?(?:\d{1,3}(?:[  .']\d{3})+|\d+)(?:[.,]\d{1,2})?\s?(?:€|EUR)?$/i;

function lireDate(s) {
  s = String(s || '').trim();
  let m = DATE_FR.exec(s);
  if (m) { const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return valide(a, Number(m[2]), Number(m[1])); }
  m = DATE_ISO.exec(s);
  if (m) return valide(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
  function valide(a, mo, j) { if (mo < 1 || mo > 12 || j < 1 || j > 31 || a < 1990 || a > 2100) return null; return `${a}-${String(mo).padStart(2, '0')}-${String(j).padStart(2, '0')}`; }
}
function lireMontant(s) {
  s = String(s || '').trim().replace(/\s?(€|EUR)$/i, '');
  if (!s || !MONTANT.test(s)) return null;
  const neg = /^-/.test(s);
  s = s.replace(/^[+-]\s?/, '').replace(/[  ']/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');        // 1.234,56
  else if (/\.\d{1,2}$/.test(s)) s = s.replace(/,/g, '');                     // 1,234.56
  else s = s.replace(/[.,]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}
function decouper(ligne, sep) {
  const cellules = []; let cur = ''; let guill = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (guill) { if (c === '"') { if (ligne[i + 1] === '"') { cur += '"'; i++; } else guill = false; } else cur += c; }
    else if (c === '"') guill = true;
    else if (c === sep) { cellules.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  cellules.push(cur.trim());
  return cellules;
}
const sansAccents = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Opérations au débit d'un relevé CSV : [{ date, libelle, montant (positif) }]. Accepte ; , ou tabulation, un en-tête ou non. */
function lireReleve(csv, max) {
  const lignes = String(csv).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lignes.length) return [];
  const sep = [';', '\t', ','].map(s => [s, lignes.slice(0, 20).reduce((n, l) => n + decouper(l, s).length - 1, 0)]).sort((a, b) => b[1] - a[1])[0][0];
  const lues = lignes.map(l => decouper(l, sep));
  // En-tête : la première ligne qui nomme une colonne « date » et une colonne de montant
  let idx = null;
  for (let i = 0; i < Math.min(lues.length, 15); i++) {
    const t = lues[i].map(c => sansAccents(c).toLowerCase());
    const date = t.findIndex(c => /date/.test(c) && !/valeur/.test(c));
    const d2 = date < 0 ? t.findIndex(c => /date/.test(c)) : date;
    const libelle = t.findIndex(c => /libell|descri|intitul|label|nature|detail|operation/.test(c) && !/date/.test(c));
    const montant = t.findIndex(c => /montant|amount|somme/.test(c));
    const debit = t.findIndex(c => /debit/.test(c));
    const credit = t.findIndex(c => /credit/.test(c));
    if (d2 >= 0 && (montant >= 0 || debit >= 0)) { idx = { ligne: i, date: d2, libelle, montant, debit, credit }; break; }
  }
  const ops = [];
  for (let i = idx ? idx.ligne + 1 : 0; i < lues.length && ops.length < max; i++) {
    const c = lues[i];
    let date, libelle, montant = null;
    if (idx) {
      date = lireDate(c[idx.date]);
      libelle = idx.libelle >= 0 ? c[idx.libelle] : c.filter((x, k) => k !== idx.date && lireMontant(x) === null && !lireDate(x)).sort((a, b) => b.length - a.length)[0];
      if (idx.debit >= 0 && lireMontant(c[idx.debit])) montant = -Math.abs(lireMontant(c[idx.debit]));
      else if (idx.montant >= 0) montant = lireMontant(c[idx.montant]);
      else if (idx.credit >= 0 && lireMontant(c[idx.credit])) montant = Math.abs(lireMontant(c[idx.credit]));
    } else {
      const d = c.findIndex(x => lireDate(x)); if (d < 0) continue;
      date = lireDate(c[d]);
      const nums = c.map((x, k) => [k, k === d || lireDate(x) ? null : lireMontant(x)]).filter(x => x[1] !== null);
      libelle = c.filter((x, k) => k !== d && !lireDate(x) && lireMontant(x) === null).sort((a, b) => b.length - a.length)[0];
      if (nums.length === 1) montant = nums[0][1];
      else if (nums.length >= 2) { const nonVide = nums.find(x => x[1] !== 0); montant = nonVide ? nonVide[1] : null; if (nonVide && nonVide[1] > 0 && nums.indexOf(nonVide) === 0) montant = -nonVide[1]; }
    }
    if (!date || !libelle || montant === null || !(montant < 0)) continue;
    ops.push({ date, libelle: String(libelle).replace(/\s+/g, ' ').trim().slice(0, 200), montant: Math.round(-montant * 100) / 100 });
  }
  return ops;
}

const BRUIT = /\b(PRLV|PRELEVEMENT|PRELEV|SEPA|CB|CARTE|PAIEMENT|PAIEMT|PAR|ACHAT|FACTURE|FACT|ECHEANCE|ECH|EUROPEEN|EUR|DU|LE|DE|DES|LA|REF|RUM|ICS|NUM|MANDAT|ABONNEMENT|ABO|X\d+|\d+X+)\b/g;
/** Clé d'un libellé bancaire : majuscules sans accents, sans dates, références ni mots de banque ; trois premiers mots. */
function cleLibelle(l) {
  return sansAccents(l).toUpperCase().replace(/\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?/g, ' ').replace(/[^A-Z0-9+ ]/g, ' ').replace(/\b\w*\d{3,}\w*\b/g, ' ')
    .replace(BRUIT, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(m => m.length > 1).slice(0, 3).join(' ');
}
const nomService = n => sansAccents(n).toUpperCase().replace(/\(.*?\)/g, ' ').replace(/[^A-Z0-9+ ]/g, ' ').replace(/\s+/g, ' ').trim();
const ajouter = (iso, jours) => new Date(Date.parse(iso + 'T12:00:00Z') + jours * 864e5).toISOString().slice(0, 10);
function ajouterPeriode(iso, periodicite) {
  const d = new Date(iso + 'T12:00:00Z');
  if (periodicite === 'hebdomadaire') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + ({ mensuelle: 1, trimestrielle: 3, semestrielle: 6, annuelle: 12 }[periodicite]));
  return d.toISOString().slice(0, 10);
}

/** Groupes de débits au même libellé et au même montant (à 5 % près), espacés régulièrement : propositions d'abonnements. */
function detecterRecurrents(operations, services, suivis) {
  const groupes = new Map();
  for (const o of operations) { const k = cleLibelle(o.libelle); if (!k) continue; if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(o); }
  const catalogue = services.map(s => ({ s, cle: nomService(s.nom), premier: nomService(s.nom).split(' ')[0] })).sort((a, b) => b.cle.length - a.cle.length);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const propositions = [];
  for (const [cle, ops] of groupes) {
    // regroupe par montant voisin (5 %)
    const tri = ops.slice().sort((a, b) => a.montant - b.montant);
    const paquets = [];
    for (const o of tri) { const p = paquets.find(x => Math.abs(o.montant - x.ref) <= Math.max(0.05 * x.ref, 0.01)); if (p) p.ops.push(o); else paquets.push({ ref: o.montant, ops: [o] }); }
    for (const p of paquets) {
      if (p.ops.length < 2) continue;
      const dates = [...new Set(p.ops.map(o => o.date))].sort();
      if (dates.length < 2) continue;
      const ecarts = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / 864e5);
      const median = ecarts.slice().sort((a, b) => a - b)[Math.floor(ecarts.length / 2)];
      const periodicite = Object.entries(PERIODICITES).find(([, v]) => Math.abs(median - v.jours) <= Math.max(2, v.jours * 0.15));
      if (!periodicite) continue;
      const regulier = ecarts.filter(e => Math.abs(e - median) <= Math.max(3, median * 0.25)).length >= Math.ceil(ecarts.length * 0.75);
      if (!regulier) continue;
      const derniere = p.ops.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      let prochaine = ajouterPeriode(derniere.date, periodicite[0]);
      for (let i = 0; i < 400 && prochaine < aujourdhui; i++) prochaine = ajouterPeriode(prochaine, periodicite[0]);
      const trouve = catalogue.find(c => (c.cle.length >= 3 && (' ' + cle + ' ').includes(' ' + c.cle + ' ')) || (c.premier.length >= 3 && cle.split(' ').includes(c.premier)));
      const montant_cts = Math.round(derniere.montant * 100);
      const deja = suivis.some(x => (trouve && x.service_id === trouve.s.id) || (cleLibelle(x.libelle) === cle && Math.abs(x.montant_cts - montant_cts) <= Math.max(5, montant_cts * 0.05)));
      const joli = trouve ? trouve.s.nom : cle.split(' ').map(m => m.charAt(0) + m.slice(1).toLowerCase()).join(' ');
      propositions.push({ libelle: joli.slice(0, 80), libelle_releve: derniere.libelle, service_id: trouve ? trouve.s.id : null, categorie: trouve ? trouve.s.categorie : 'autre',
        lien_resiliation: trouve ? trouve.s.lien_resiliation : null, montant: (montant_cts / 100).toFixed(2), montant_cts, periodicite: periodicite[0],
        occurrences: p.ops.length, derniere: derniere.date, prochaine_echeance: prochaine, deja_suivi: deja });
    }
  }
  return propositions.sort((a, b) => (a.deja_suivi - b.deja_suivi) || b.montant_cts * PERIODICITES[b.periodicite].mois - a.montant_cts * PERIODICITES[a.periodicite].mois).slice(0, 60);
}

/* ======================= Lettre de résiliation : PDF A4 sans dépendance ======================= */

const WIN = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, 'œ': 0x9c, 'Œ': 0x8c, ' ': 0x20, ' ': 0x20 };
/** Texte → octets WinAnsi échappés pour une chaîne PDF. */
function chainePdf(s) {
  const octets = [];
  for (const c of String(s)) {
    let b = WIN[c] !== undefined ? WIN[c] : c.charCodeAt(0);
    if (b > 0xff) b = 0x3f;
    if (b === 0x28 || b === 0x29 || b === 0x5c) octets.push(0x5c);
    octets.push(b);
  }
  return Buffer.from(octets).toString('latin1');
}
/** Largeur approximative (Helvetica, 1/1000 em) pour couper les lignes. */
function largeur(s, taille) {
  let w = 0;
  for (const c of s) w += /[il.,;:'!|’ ]/.test(c) ? 280 : /[mwMW]/.test(c) ? 850 : /[A-Z]/.test(c) ? 680 : 540;
  return w * taille / 1000;
}
function couper(texte, taille, max) {
  const sortie = [];
  for (const para of String(texte).split('\n')) {
    let ligne = '';
    for (const mot of para.split(' ')) {
      const essai = ligne ? ligne + ' ' + mot : mot;
      if (largeur(essai, taille) > max && ligne) { sortie.push(ligne); ligne = mot; } else ligne = essai;
    }
    sortie.push(ligne);
  }
  return sortie;
}
function lettrePdf(o) {
  const jour = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const G = 70, L = 595 - 2 * G;
  const blocs = [];   // [x, y, taille, gras, texte]
  let y = 780;
  const ecrire = (texte, { taille = 11, gras = false, x = G, apres = 4, max = L } = {}) => {
    for (const l of couper(texte, taille, max)) { blocs.push([x, y, taille, gras, l]); y -= taille * 1.45; }
    y -= apres;
  };
  ecrire(o.nom, { gras: true, apres: 0 });
  ecrire(o.adresse, { apres: 18, max: 260 });
  if (o.destinataire) { const yAvant = y; ecrire(o.service, { gras: true, x: 330, apres: 0, max: 195 }); ecrire(o.destinataire, { x: 330, apres: 18, max: 195 }); y = Math.min(y, yAvant - 40); }
  else ecrire(`${o.service}\nService clients — résiliation`, { x: 330, apres: 18, max: 195 });
  ecrire(`${o.ville ? o.ville + ', le ' : 'Le '}${jour}`, { x: 330, apres: 22, max: 195 });
  ecrire('Lettre recommandée avec accusé de réception', { taille: 10, apres: 10 });
  ecrire(`Objet : résiliation de mon abonnement « ${o.libelle} »${o.numero ? ` — n° client ${o.numero}` : ''}`, { gras: true, apres: 18 });
  ecrire('Madame, Monsieur,', { apres: 10 });
  ecrire(`Par la présente, je vous informe de ma décision de résilier mon abonnement « ${o.libelle} »${o.numero ? `, souscrit sous le numéro client ${o.numero}` : ''}.`, { apres: 8 });
  ecrire(`Je vous remercie de bien vouloir prendre en compte cette résiliation dans les délais prévus par les conditions générales de mon contrat, et au plus tard à la prochaine échéance${o.echeance ? ` (${dateFr(o.echeance)})` : ''}, puis de cesser tout prélèvement à compter de cette date.`, { apres: 8 });
  ecrire('Je vous saurais gré de m’adresser une confirmation écrite de cette résiliation, précisant sa date de prise d’effet.', { apres: 8 });
  ecrire('Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.', { apres: 30 });
  ecrire(o.nom, { x: 330, gras: true, max: 195 });
  const flux = blocs.map(([x, yy, t, g, s]) => `BT /${g ? 'F2' : 'F1'} ${t} Tf ${x} ${yy.toFixed(1)} Td (${chainePdf(s)}) Tj ET`).join('\n');
  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(flux, 'latin1')} >>\nstream\n${flux}\nendstream`,
    `<< /Title (${chainePdf('Résiliation — ' + o.libelle)}) /Producer (Abonnely) >>`
  ];
  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const positions = [];
  objets.forEach((obj, i) => { positions.push(Buffer.byteLength(pdf, 'latin1')); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n` + positions.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('') +
    `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
