/* app/semelles.js — semelles orthopédiques (orthèses plantaires) : schéma, fabrication et suivi.

   Les éléments sont placés sur un gabarit normalisé de chaque pied (côté G ou D) : u = 0 bord interne → 1 bord externe,
   v = 0 talon → 1 orteils ; largeur et hauteur en mm, rotation en degrés, épaisseur en mm. L'écran les dessine à la
   pointure (impression 1:1) ; le serveur contrôle seulement les valeurs. */
'use strict';

const SEMELLE = [['datePrescription', 'date_prescription', 'date'], ['pointure', 'pointure', 'nombre'], ['typeSemelle', 'type_semelle', 'texte'],
  ['base', 'base', 'texte'], ['epaisseurBase', 'epaisseur_base', 'nombre'], ['recouvrement', 'recouvrement', 'texte'], ['chaussage', 'chaussage', 'texte'],
  ['statut', 'statut', 'texte'], ['fabrication', 'fabrication', 'texte'], ['laboratoire', 'laboratoire', 'texte'], ['dateLivraison', 'date_livraison', 'date'],
  ['dateControle', 'date_controle', 'date'], ['dateRenouvellement', 'date_renouvellement', 'date'], ['prix', 'prix', 'nombre'], ['notes', 'notes', 'texte']];
const STATUTS = ['prescrite', 'en_fabrication', 'livree', 'controlee'];

module.exports.routes = function (r, ctxApp) {
  const { base, erreur } = ctxApp;
  const d = require('./donnees')(ctxApp);
  const uid = ctx => ctx.utilisateur.id;
  const borne = (v, min, max, defaut) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut; };

  function elementsPropres(liste) {
    if (!Array.isArray(liste) || liste.length > 80) throw erreur(400, 'Éléments : 80 maximum.');
    return liste.map(e => ({
      id: String((e && e.id) || require('crypto').randomUUID()).slice(0, 60),
      type: String((e && e.type) || 'libre').slice(0, 40),
      cote: e && e.cote === 'G' ? 'G' : 'D',
      u: borne(e && e.u, -0.2, 1.2, 0.5), v: borne(e && e.v, -0.1, 1.1, 0.5),
      largeur: borne(e && e.largeur, 2, 200, 30), hauteur: borne(e && e.hauteur, 2, 300, 20),
      rotation: borne(e && e.rotation, -180, 180, 0), epaisseur: borne(e && e.epaisseur, 0, 30, 3),
      materiau: String((e && e.materiau) || '').slice(0, 80), durete: String((e && e.durete) || '').slice(0, 20),
      note: String((e && e.note) || '').slice(0, 300)
    }));
  }

  function controler(champs, corps) {
    if ('statut' in champs && !STATUTS.includes(champs.statut)) throw erreur(400, `Statut : ${STATUTS.join(', ')}.`);
    if ('fabrication' in champs && !['cabinet', 'laboratoire'].includes(champs.fabrication)) throw erreur(400, 'Fabrication : cabinet ou laboratoire.');
    if ('pointure' in champs && (champs.pointure == null || champs.pointure < 15 || champs.pointure > 55)) throw erreur(400, 'Pointure entre 15 et 55.');
    if (corps.elements !== undefined) champs.elements = JSON.stringify(elementsPropres(corps.elements));
  }

  const semelle = l => l && d.versEcran(SEMELLE, l, { patientId: l.patient_id, bilanId: l.bilan_id, elements: l.elements || [] });

  r.get('/api/semelles', async (req, ctx) => {
    const p = ctx.query.patientId;
    if (p && !d.UUID.test(p)) return [];
    return (await base.lignes(`select * from semelles where utilisateur_id = $1 and supprime_le is null and ($2::uuid is null or patient_id = $2::uuid)
      order by date_prescription desc, cree_le desc`, [uid(ctx), p || null])).map(semelle);
  });

  r.post('/api/semelles', async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const p = await d.sienne('patients', corps.patientId, u, 'Patient', 'id');
    const champs = d.colonnes(SEMELLE, corps);
    controler(champs, corps);
    for (const k of Object.keys(champs)) if (champs[k] == null && ['date_prescription', 'pointure', 'type_semelle', 'statut', 'fabrication'].includes(k)) delete champs[k];
    Object.assign(champs, { utilisateur_id: u, patient_id: p.id, bilan_id: await d.bilanDuPatient(corps.bilanId, p.id, u) });
    return semelle(await d.inserer('semelles', champs));
  });

  r.get('/api/semelles/:id', async (req, ctx) => semelle(await d.sienne('semelles', ctx.params.id, uid(ctx), 'Semelle')));

  r.patch('/api/semelles/:id', async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const avant = await d.sienne('semelles', ctx.params.id, u, 'Semelle', 'id, patient_id');
    const champs = d.colonnes(SEMELLE, corps);
    controler(champs, corps);
    if (corps.bilanId !== undefined) champs.bilan_id = await d.bilanDuPatient(corps.bilanId, avant.patient_id, u);
    return semelle(await d.modifier('semelles', avant.id, u, champs));
  });

  r.delete('/api/semelles/:id', async (req, ctx) => d.supprimer('semelles', ctx.params.id, uid(ctx), 'Semelle'));
};
