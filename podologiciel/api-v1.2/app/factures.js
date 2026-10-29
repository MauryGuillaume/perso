/* app/factures.js — factures et avoirs (avant : gardés seulement dans le navigateur).

   Règles de facturation d'un professionnel :
   - un brouillon se modifie et se supprime librement ; il n'a pas de numéro ;
   - « émettre » attribue le numéro suivant de l'année (2026-0001, 2026-0002…), sans trou ni doublon ;
   - une facture émise ne change plus (date, patient, actes, total, notes) : la base le refuse (trigger factures_verrou) ;
     seuls le paiement (statut, mode), la signature du PDF et la date de relance se mettent à jour ;
   - pour l'annuler : un avoir (montants négatifs, numéroté lui aussi) qui la référence.
   Le total est toujours recalculé ici à partir des actes. */
'use strict';

const FACTURE = [['date', 'date', 'date'], ['modePaiement', 'mode_paiement', 'texte'], ['statut', 'statut', 'texte'], ['notes', 'notes', 'texte'],
  ['signatureOption', 'option_signature', 'texte']];
const MODIFIABLE_EMISE = new Set(['mode_paiement', 'statut', 'option_signature', 'dernier_rappel_le']);
const STATUTS = ['en_attente', 'paye'];
const SIGNATURES = ['image', 'empty', 'none'];
const ACTES_DEFAUT = [{ id: 'soin-pedicurie', label: 'Soin de pédicurie', prix: 35 }, { id: 'bilan-podologique', label: 'Bilan podologique', prix: 60 },
  { id: 'ortheses-plantaires', label: 'Orthèses plantaires', prix: 150 }];
const RAPPELS_DEFAUT = { enabled: true, firstReminderDays: 14, repeatIntervalDays: 7 };

module.exports.routes = function (r, ctxApp) {
  const { base, journal, erreur } = ctxApp;
  const d = require('./donnees')(ctxApp);
  const uid = ctx => ctx.utilisateur.id;
  // Arrondi au centime symétrique (un avoir a exactement le total opposé de sa facture), sans erreur de flottant
  const arrondi = n => Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-9) / 100;

  /** Lignes de facture contrôlées ; le total vient d'ici, jamais de l'écran. */
  function actesPropres(actes) {
    if (!Array.isArray(actes)) throw erreur(400, 'Actes : liste attendue.');
    if (actes.length > 100) throw erreur(400, '100 actes maximum par facture.');
    return actes.map((a, i) => {
      const quantite = Number(String(a && a.quantite != null ? a.quantite : 1).replace(',', '.'));
      const prix = Number(String(a && a.prix != null ? a.prix : 0).replace(',', '.'));
      if (!Number.isFinite(quantite) || !Number.isFinite(prix) || Math.abs(quantite) > 10000 || Math.abs(prix) > 1e6) throw erreur(400, `Acte ${i + 1} : quantité ou prix invalide.`);
      return { label: String((a && a.label) || '').slice(0, 200), quantite, prix: arrondi(prix) };
    });
  }
  const totalDe = actes => arrondi(actes.reduce((s, a) => s + a.quantite * a.prix, 0));

  function controler(champs) {
    if ('statut' in champs && !STATUTS.includes(champs.statut)) throw erreur(400, 'Statut : en_attente ou paye.');
    if ('option_signature' in champs && champs.option_signature != null && !SIGNATURES.includes(champs.option_signature)) throw erreur(400, 'Signature : image, empty ou none.');
    if ('mode_paiement' in champs && !champs.mode_paiement) champs.mode_paiement = 'autre';
  }

  const facture = l => l && d.versEcran(FACTURE, l, {
    patientId: l.patient_id, numero: l.numero, genre: l.genre, actes: l.actes || [], total: Number(l.total),
    emise: !!l.numero, emiseLe: l.emise_le, annuleeLe: l.annulee_le, avoirDe: l.avoir_de, patientFige: l.patient_fige,
    lastReminderAt: l.dernier_rappel_le, pennylaneId: l.pennylane_id == null ? null : Number(l.pennylane_id), pennylaneEnvoyeLe: l.pennylane_envoye_le, pennylaneErreur: l.pennylane_erreur
  });

  async function patientDe(patientId, u) {
    if (patientId == null || patientId === '') return null;
    return d.sienne('patients', patientId, u, 'Patient', 'id, nom, prenom, adresse, email, telephone');
  }

  /** Numéro suivant de l'année, attribué dans la transaction (le verrou de ligne évite deux fois le même numéro). */
  async function numeroSuivant(c, u, date) {
    const annee = Number(String(date).slice(0, 4)) || new Date().getFullYear();
    const n = (await c.query(`insert into factures_compteurs (utilisateur_id, annee, dernier) values ($1, $2, 1)
      on conflict (utilisateur_id, annee) do update set dernier = factures_compteurs.dernier + 1 returning dernier`, [u, annee])).rows[0].dernier;
    return `${annee}-${String(n).padStart(4, '0')}`;
  }

  async function emettre(c, ligne, u) {
    if (ligne.numero) return ligne;
    if (!ligne.actes || !ligne.actes.length) throw erreur(400, 'Ajoute au moins un acte avant d’émettre la facture.');
    let fige = null;
    if (ligne.patient_id) {
      const p = (await c.query('select nom, prenom, adresse, email, telephone from patients where id = $1', [ligne.patient_id])).rows[0];
      if (p) fige = p;
    }
    const numero = await numeroSuivant(c, u, ligne.date);
    return (await c.query('update factures set numero = $2, emise_le = now(), patient_fige = $3 where id = $1 returning *', [ligne.id, numero, fige && JSON.stringify(fige)])).rows[0];
  }

  r.get('/api/factures', async (req, ctx) =>
    (await base.lignes('select * from factures where utilisateur_id = $1 and supprime_le is null order by date desc, numero desc nulls first, cree_le desc', [uid(ctx)])).map(facture));

  // Création : brouillon, ou émise directement avec { emettre: true }
  r.post('/api/factures', async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const p = await patientDe(corps.patientId, u);
    const champs = d.colonnes(FACTURE, corps);
    controler(champs);
    const actes = actesPropres(corps.actes || []);
    Object.assign(champs, { utilisateur_id: u, patient_id: p ? p.id : null, actes: JSON.stringify(actes), total: totalDe(actes) });
    if (!champs.date) delete champs.date;
    const l = await base.transaction(async c => {
      const cree = await d.inserer('factures', champs, c);
      return corps.emettre ? emettre(c, cree, u) : cree;
    });
    if (l.numero) await journal(ctx, 'facture_emise', l.id, { numero: l.numero });
    return facture(l);
  });

  // Reprise des factures gardées autrefois dans le navigateur : émises dans l'ordre des dates
  r.post('/api/factures/import', { limite: 5e6 }, async (req, ctx) => {
    const u = uid(ctx);
    const liste = Array.isArray(ctx.corps.factures) ? ctx.corps.factures : null;
    if (!liste || liste.length > 2000) throw erreur(400, 'Entre 0 et 2000 factures attendues.');
    const patients = new Set((await base.lignes('select id from patients where utilisateur_id = $1', [u])).map(x => x.id));
    const triees = liste.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const crees = await base.transaction(async c => {
      const out = [];
      for (const f of triees) {
        const actes = actesPropres(f.actes || []);
        const date = d.DATE.test(String(f.date || '').slice(0, 10)) ? String(f.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
        const champs = { utilisateur_id: u, patient_id: patients.has(f.patientId) ? f.patientId : null, date, actes: JSON.stringify(actes), total: totalDe(actes),
          mode_paiement: String(f.modePaiement || 'autre').slice(0, 40), statut: STATUTS.includes(f.statut) ? f.statut : 'en_attente',
          notes: f.notes ? String(f.notes).slice(0, 20000) : null, option_signature: SIGNATURES.includes(f.signatureOption) ? f.signatureOption : null,
          dernier_rappel_le: f.lastReminderAt && !isNaN(Date.parse(f.lastReminderAt)) ? new Date(f.lastReminderAt) : null };
        const l = await d.inserer('factures', champs, c);
        out.push(actes.length ? await emettre(c, l, u) : l);
      }
      return out;
    });
    await journal(ctx, 'factures_importees', '', { nombre: crees.length });
    return crees.map(facture);
  });

  // /factures/settings avant /factures/:id
  const reglages = l => ({ acteTypes: l && Array.isArray(l.actes) && l.actes.length ? l.actes : ACTES_DEFAUT, rappels: Object.assign({}, RAPPELS_DEFAUT, l && l.rappels), enregistre: !!l });
  r.get('/api/factures/settings', async (req, ctx) => reglages(await base.une('select * from reglages_facturation where utilisateur_id = $1', [uid(ctx)])));

  r.patch('/api/factures/settings', async (req, ctx) => {
    const corps = ctx.corps, champs = {};
    if (corps.acteTypes !== undefined) {
      if (!Array.isArray(corps.acteTypes) || corps.acteTypes.length > 200) throw erreur(400, 'Actes : liste de 200 maximum.');
      champs.actes = JSON.stringify(corps.acteTypes.map(a => ({ id: String((a && a.id) || require('crypto').randomUUID()).slice(0, 60),
        label: String((a && a.label) || '').slice(0, 200), prix: arrondi(Number(String((a && a.prix) ?? 0).replace(',', '.')) || 0) })));
    }
    if (corps.rappels !== undefined) {
      const x = corps.rappels || {};
      const jours = v => Math.min(365, Math.max(1, parseInt(v, 10) || 1));
      champs.rappels = JSON.stringify({ enabled: !!x.enabled, firstReminderDays: jours(x.firstReminderDays), repeatIntervalDays: jours(x.repeatIntervalDays) });
    }
    const cles = Object.keys(champs);
    const l = await base.une(`insert into reglages_facturation (utilisateur_id${cles.map(k => ', ' + k).join('')}) values ($1${cles.map((_, i) => ', $' + (i + 2)).join('')})
      on conflict (utilisateur_id) do update set ${cles.length ? cles.map(k => `${k} = excluded.${k}`).join(', ') : 'utilisateur_id = excluded.utilisateur_id'} returning *`,
    [uid(ctx), ...cles.map(k => champs[k])]);
    return reglages(l);
  });

  r.patch('/api/factures/:id', async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const avant = await d.sienne('factures', ctx.params.id, u, 'Facture');
    const champs = d.colonnes(FACTURE, corps);
    controler(champs);
    if (corps.lastReminderAt !== undefined) champs.dernier_rappel_le = corps.lastReminderAt && !isNaN(Date.parse(corps.lastReminderAt)) ? new Date(corps.lastReminderAt) : null;
    if (avant.numero) {
      // Facture émise : on ignore les champs figés envoyés à l'identique, on refuse ceux qui changent
      for (const k of Object.keys(champs)) {
        if (MODIFIABLE_EMISE.has(k)) continue;
        if (String(champs[k] ?? '') === String(avant[k] ?? '')) { delete champs[k]; continue; }
        throw erreur(409, `Facture ${avant.numero} émise : elle ne peut plus être modifiée. Fais un avoir pour l’annuler.`);
      }
      if (corps.actes !== undefined && totalDe(actesPropres(corps.actes)) !== Number(avant.total)) throw erreur(409, `Facture ${avant.numero} émise : ses actes ne peuvent plus changer. Fais un avoir pour l’annuler.`);
      if (corps.patientId !== undefined && (corps.patientId || null) !== avant.patient_id) throw erreur(409, `Facture ${avant.numero} émise : son patient ne peut plus changer. Fais un avoir pour l’annuler.`);
    } else {
      if (corps.patientId !== undefined) { const p = await patientDe(corps.patientId, u); champs.patient_id = p ? p.id : null; }
      if (corps.actes !== undefined) { const actes = actesPropres(corps.actes); champs.actes = JSON.stringify(actes); champs.total = totalDe(actes); }
    }
    const l = await base.transaction(async c => {
      const maj = await d.modifier('factures', ctx.params.id, u, champs, c);
      return corps.emettre && !maj.numero ? emettre(c, maj, u) : maj;
    });
    if (!avant.numero && l.numero) await journal(ctx, 'facture_emise', l.id, { numero: l.numero });
    return facture(l);
  });

  r.post('/api/factures/:id/emettre', async (req, ctx) => {
    const u = uid(ctx);
    const avant = await d.sienne('factures', ctx.params.id, u, 'Facture');
    if (avant.numero) return facture(avant);
    const l = await base.transaction(async c => emettre(c, (await c.query('select * from factures where id = $1 for update', [avant.id])).rows[0], u));
    await journal(ctx, 'facture_emise', l.id, { numero: l.numero });
    return facture(l);
  });

  // Annulation d'une facture émise : avoir aux montants opposés, numéroté, lié à la facture
  r.post('/api/factures/:id/avoir', async (req, ctx) => {
    const u = uid(ctx);
    const f = await d.sienne('factures', ctx.params.id, u, 'Facture');
    if (!f.numero) throw erreur(400, 'Un brouillon se supprime, il n’a pas besoin d’avoir.');
    if (f.genre === 'avoir') throw erreur(400, 'Un avoir ne s’annule pas.');
    if (f.annulee_le) throw erreur(409, `La facture ${f.numero} est déjà annulée.`);
    const res = await base.transaction(async c => {
      const verrou = (await c.query('update factures set annulee_le = now() where id = $1 and annulee_le is null returning *', [f.id])).rows[0];
      if (!verrou) throw erreur(409, `La facture ${f.numero} est déjà annulée.`);
      const actes = (f.actes || []).map(a => ({ label: a.label, quantite: -Number(a.quantite), prix: Number(a.prix) }));
      const avoir = await d.inserer('factures', { utilisateur_id: u, patient_id: f.patient_id, genre: 'avoir', date: new Date().toISOString().slice(0, 10),
        actes: JSON.stringify(actes), total: totalDe(actes), mode_paiement: f.mode_paiement, statut: f.statut, avoir_de: f.id,
        notes: `Avoir annulant la facture ${f.numero}` + (ctx.corps.motif ? ` : ${String(ctx.corps.motif).slice(0, 500)}` : '') }, c);
      return { facture: verrou, avoir: await emettre(c, avoir, u) };
    });
    await journal(ctx, 'facture_annulee', f.id, { numero: f.numero, avoir: res.avoir.numero });
    return { facture: facture(res.facture), avoir: facture(res.avoir) };
  });

  r.delete('/api/factures/:id', async (req, ctx) => {
    const f = await d.sienne('factures', ctx.params.id, uid(ctx), 'Facture', 'id, numero');
    if (f.numero) throw erreur(409, `La facture ${f.numero} est émise : elle ne se supprime pas (obligation légale). Fais un avoir pour l’annuler.`);
    return d.supprimer('factures', f.id, uid(ctx), 'Facture');
  });
};
