/* app/documents.js — documents des patients : photos, empreintes, ordonnances, comptes rendus (images, PDF, texte).

   L'écran envoie le fichier en base64 dans du JSON (20 Mo maximum une fois décodé), avec le texte qu'il a lu dedans
   (PDF ou .txt) et une vignette. Le fichier est rangé dans la base (colonne contenu) et relu par
   GET /api/documents/:id/fichier, seulement par son podologue. Le type est contrôlé sur les premiers octets du fichier,
   pas seulement sur ce que l'écran annonce. */
'use strict';

const DOCUMENT = [['nom', 'nom', 'texte'], ['categorie', 'categorie', 'texte'], ['notes', 'notes', 'texte']];
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
const CATEGORIES = ['photo', 'empreinte', 'ordonnance', 'compte_rendu', 'imagerie', 'courrier', 'autre'];
const TAILLE_MAX = 20e6;
// Colonnes de la liste : jamais le fichier lui-même, ni le texte complet
const LISTE = `id, utilisateur_id, patient_id, bilan_id, nom, type_mime, taille, categorie, apercu, notes, cree_le, modifie_le,
  jsonb_array_length(annotations) as nb_annotations, length(coalesce(texte, '')) as longueur_texte`;

/** Le contenu correspond-il au type annoncé ? (signatures de fichiers) */
function typeConforme(type, o) {
  const debut = (...octets) => octets.every((x, i) => o[i] === x);
  if (type === 'image/jpeg') return debut(0xff, 0xd8, 0xff);
  if (type === 'image/png') return debut(0x89, 0x50, 0x4e, 0x47);
  if (type === 'image/gif') return debut(0x47, 0x49, 0x46, 0x38);
  if (type === 'image/webp') return debut(0x52, 0x49, 0x46, 0x46) && o.slice(8, 12).toString('latin1') === 'WEBP';
  if (type === 'application/pdf') return o.slice(0, 1024).toString('latin1').includes('%PDF-');
  if (type === 'text/plain') return !o.slice(0, 8192).includes(0);
  return false;
}

module.exports.routes = function (r, ctxApp) {
  const { base, journal, erreur } = ctxApp;
  const d = require('./donnees')(ctxApp);
  const uid = ctx => ctx.utilisateur.id;

  const document = (l, complet) => l && d.versEcran(DOCUMENT, l, Object.assign({
    patientId: l.patient_id, bilanId: l.bilan_id, typeMime: l.type_mime, taille: l.taille, apercu: l.apercu,
    nbAnnotations: l.nb_annotations != null ? l.nb_annotations : (l.annotations || []).length,
    aTexte: l.longueur_texte != null ? l.longueur_texte > 0 : !!l.texte
  }, complet ? { texte: l.texte || '', annotations: l.annotations || [] } : {}));

  function controler(champs, corps) {
    if ('nom' in champs) { champs.nom = String(champs.nom || '').replace(/[\\/\0]/g, '_').trim().slice(0, 200); if (!champs.nom) throw erreur(400, 'Nom du document obligatoire.'); }
    if ('categorie' in champs && !CATEGORIES.includes(champs.categorie)) throw erreur(400, `Catégorie : ${CATEGORIES.join(', ')}.`);
    if (corps.texte !== undefined) champs.texte = corps.texte == null ? null : String(corps.texte).slice(0, 2e6);
    if (corps.apercu !== undefined) {
      if (corps.apercu != null && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(String(corps.apercu))) throw erreur(400, 'Vignette : image JPEG, PNG ou WebP attendue.');
      if (corps.apercu && String(corps.apercu).length > 300000) throw erreur(400, 'Vignette trop grande (300 Ko maximum).');
      champs.apercu = corps.apercu || null;
    }
    if (corps.annotations !== undefined) {
      if (!Array.isArray(corps.annotations) || corps.annotations.length > 500) throw erreur(400, 'Annotations : 500 maximum.');
      const json = JSON.stringify(corps.annotations);
      if (json.length > 2e6) throw erreur(400, 'Annotations trop lourdes.');
      champs.annotations = json;
    }
  }

  r.get('/api/documents', async (req, ctx) => {
    const p = ctx.query.patientId, b = ctx.query.bilanId;
    if ((p && !d.UUID.test(p)) || (b && !d.UUID.test(b))) return [];
    return (await base.lignes(`select ${LISTE} from documents where utilisateur_id = $1 and supprime_le is null
      and ($2::uuid is null or patient_id = $2::uuid) and ($3::uuid is null or bilan_id = $3::uuid) order by cree_le desc`, [uid(ctx), p || null, b || null]))
      .map(l => document(l));
  });

  r.post('/api/documents', { limite: 30e6 }, async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const p = await d.sienne('patients', corps.patientId, u, 'Patient', 'id');
    const type = String(corps.typeMime || '');
    if (!TYPES.includes(type)) throw erreur(400, 'Type de fichier non pris en charge : photo (JPEG, PNG, WebP, GIF), PDF ou texte (.txt).');
    if (typeof corps.contenu !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(corps.contenu.slice(0, 1000))) throw erreur(400, 'Fichier manquant (base64 attendu).');
    const octets = Buffer.from(corps.contenu, 'base64');
    if (!octets.length) throw erreur(400, 'Fichier vide.');
    if (octets.length > TAILLE_MAX) throw erreur(413, 'Fichier trop lourd : 20 Mo maximum.');
    if (!typeConforme(type, octets)) throw erreur(400, 'Le contenu du fichier ne correspond pas à son type.');
    const champs = d.colonnes(DOCUMENT, Object.assign({ categorie: type.startsWith('image/') ? 'photo' : 'autre' }, corps));
    controler(champs, corps);
    if (type === 'text/plain' && corps.texte === undefined) champs.texte = octets.toString('utf8').slice(0, 2e6);
    Object.assign(champs, { utilisateur_id: u, patient_id: p.id, bilan_id: await d.bilanDuPatient(corps.bilanId, p.id, u), type_mime: type, taille: octets.length, contenu: octets });
    const l = await d.inserer('documents', champs);
    await journal(ctx, 'document_ajoute', l.id, { type, taille: octets.length });
    return document(l, true);
  });

  r.get('/api/documents/:id', async (req, ctx) =>
    document(await d.sienne('documents', ctx.params.id, uid(ctx), 'Document', LISTE + ', texte, annotations'), true));

  // Le fichier lui-même (lu par l'écran avec son jeton, puis affiché depuis la mémoire du navigateur)
  r.get('/api/documents/:id/fichier', async (req, ctx) => {
    const l = await d.sienne('documents', ctx.params.id, uid(ctx), 'Document', 'nom, type_mime, contenu');
    ctx.res.writeHead(200, { 'Content-Type': l.type_mime + (l.type_mime === 'text/plain' ? '; charset=utf-8' : ''), 'Content-Length': l.contenu.length,
      'Cache-Control': 'private, no-store', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(l.nom)}`,
      'Content-Security-Policy': "default-src 'none'; sandbox" });
    ctx.res.end(l.contenu);
  });

  r.patch('/api/documents/:id', { limite: 3e6 }, async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const avant = await d.sienne('documents', ctx.params.id, u, 'Document', 'id, patient_id');
    const champs = d.colonnes(DOCUMENT, corps);
    controler(champs, corps);
    if (corps.bilanId !== undefined) champs.bilan_id = await d.bilanDuPatient(corps.bilanId, avant.patient_id, u);
    await d.modifier('documents', avant.id, u, champs, null, 'id');
    return document(await base.une(`select ${LISTE}, texte, annotations from documents where id = $1`, [avant.id]), true);
  });

  r.delete('/api/documents/:id', async (req, ctx) => d.supprimer('documents', ctx.params.id, uid(ctx), 'Document'));
};
