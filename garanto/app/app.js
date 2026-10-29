/* app/app.js — Garanto : coffre des tickets de caisse et des bons de garantie.
   Kit « App complète » : le noyau lit cette déclaration ; ne touche jamais aux fichiers de noyau/.

   nom, version      identité (le nom affiché peut être changé par APP_NOM ou le réglage partagé app_nom)
   variables         variables d'environnement propres à l'app (même format que noyau/env.js, KIT.md § 5.2)
   tables            pour l'admin et l'Atelier : libellé, colonne d'affichage, colonnes masquées, lecture seule
   rgpd              données personnelles : où les trouver pour un export ou une suppression (KIT.md § 11)
   reglages          paramètres partagés modifiables par l'admin (Atelier › Réglages)
   routes(r, ctx)    API métier (KIT.md § 7)
   demarrage(ctx)    tâche quotidienne : rappels de fin de garantie, prévenances et suppressions pour inactivité */
'use strict';
const crypto = require('crypto');
const comptes = require('../noyau/comptes');   // utilisé tel quel : vérification du mot de passe, contrôle de l'email

const MO = 1024 * 1024;
const JOUR = 24 * 3600 * 1000;
const MAX_OCTETS = 10 * MO;   // plafond de la base (justificatifs.taille_octets)
const ACHAT = `a.id, a.produit, a.magasin, a.date_achat::text as date_achat, a.montant, a.garantie_legale_mois, a.garantie_commerciale_mois,
  a.fin_garantie::text as fin_garantie, (a.fin_garantie - current_date) as jours_restants, a.rappel_envoye_le, a.note, a.cree_le, a.modifie_le`;
const PIECE = 'j.id, j.type, j.nom_origine, j.type_mime, j.taille_octets, j.cree_le';

/** Type reconnu sur les premiers octets (jamais sur l'extension) : PDF, JPEG ou PNG, sinon null. */
function typeDuContenu(b) {
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
}

const echapperHtml = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateFr = iso => iso ? iso.split('-').reverse().join('/') : '';

module.exports = {
  nom: 'Garanto',
  version: '1.0.1',

  variables: [
    { cle: 'BREVO_API_KEY', type: 'texte', secret: true, obligatoireEnProduction: true, role: 'Clé de l’API transactionnelle Brevo (e-mails sortants) ; absente en développement = e-mails écrits dans le journal du serveur' },
    { cle: 'EMAIL_EXPEDITEUR', type: 'texte', obligatoireEnProduction: true, role: 'Adresse d’expédition des e-mails, validée chez Brevo (ex. garanto@mondomaine.fr)' },
    { cle: 'EMAIL_EXPEDITEUR_NOM', type: 'texte', defaut: 'Garanto', role: 'Nom affiché de l’expéditeur des e-mails' },
    { cle: 'TACHE_QUOTIDIENNE', type: 'booleen', defaut: '1', role: '1 : rappels de fin de garantie et suppressions pour inactivité chaque jour ; 0 pour les couper (tests)' }
  ],

  roles: [],

  tables: {
    achats: { libelle: 'Achats', affichage: 'produit', colonnesLectureSeule: ['compte_id'] },
    justificatifs: { libelle: 'Justificatifs', affichage: 'nom_origine', colonnesLectureSeule: ['achat_id', 'compte_id', 'type_mime', 'taille_octets', 'empreinte_sha256'] },
    justificatifs_contenu: { libelle: 'Contenu des fichiers', colonnesMasquees: ['contenu'], lectureSeule: true },
    envois: { libelle: 'E-mails envoyés', affichage: 'objet', lectureSeule: true },
    preferences_comptes: { libelle: 'Préférences des comptes' }
  },

  rgpd: [
    { table: 'achats', colonne: 'compte_id', action: 'supprimer', conservation: 'jusqu’à suppression par l’utilisateur, ou 3 ans sans connexion après un e-mail de prévenance' },
    { table: 'justificatifs', colonne: 'compte_id', action: 'supprimer', conservation: 'jusqu’à suppression par l’utilisateur, ou 3 ans sans connexion après un e-mail de prévenance' },
    { table: 'justificatifs_contenu', colonne: 'compte_id', action: 'supprimer', conservation: 'fichiers : comme les justificatifs (export complet par l’utilisateur dans « Mon compte »)' },
    { table: 'envois', colonne: 'compte_id', action: 'supprimer', conservation: 'comme le compte' },
    { table: 'preferences_comptes', colonne: 'compte_id', action: 'supprimer', conservation: 'comme le compte' }
  ],

  reglages: [
    { cle: 'rappel_jours_avant', libelle: 'Rappel envoyé combien de jours avant la fin de garantie', type: 'entier', defaut: 30 },
    { cle: 'taille_max_mo', libelle: 'Taille maximale d’un fichier (Mo, 10 au plus)', type: 'entier', defaut: 10 },
    { cle: 'fichiers_par_achat', libelle: 'Nombre maximal de fichiers par achat (5 au plus)', type: 'entier', defaut: 5 },
    { cle: 'envois_par_jour', libelle: 'E-mails envoyés au plus par compte et par jour', type: 'entier', defaut: 10 },
    { cle: 'envoi_taille_max_mo', libelle: 'Taille totale des pièces jointes d’un e-mail (Mo, 10 au plus)', type: 'entier', defaut: 10 },
    { cle: 'inactivite_annees', libelle: 'Années sans connexion avant prévenance puis suppression du compte', type: 'entier', defaut: 3 }
  ],

  routes(r, { base, journal, env, erreur }) {
    outils = { base, journal, env, erreur };

    const texte = (v, max, nom, facultatif) => {
      const s = String(v == null ? '' : v).trim();
      if (!s) { if (facultatif) return null; throw erreur(400, `${nom} est obligatoire.`); }
      if (s.length > max) throw erreur(400, `${nom} : ${max} caractères maximum.`);
      return s;
    };
    const mois = (v, defaut, max, nom) => {
      if (v === '' || v == null) return defaut;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > max) throw erreur(400, `${nom} : un nombre de mois entre 0 et ${max}.`);
      return n;
    };
    const uuid = (v, quoi) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v))) throw erreur(404, `${quoi} introuvable.`); return v; };

    /** Champs d'un achat, contrôlés ; la fin de garantie est calculée par la base. */
    function lireAchat(c) {
      const date = String(c.date_achat || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + 'T00:00:00Z'))) throw erreur(400, 'La date d’achat est obligatoire (jj/mm/aaaa).');
      if (date > new Date(Date.now() + JOUR).toISOString().slice(0, 10)) throw erreur(400, 'La date d’achat ne peut pas être dans le futur.');
      if (date < '1980-01-01') throw erreur(400, 'Date d’achat trop ancienne.');
      let montant = c.montant === '' || c.montant == null ? null : Number(c.montant);
      if (montant !== null && !(montant >= 0 && montant < 1e9)) throw erreur(400, 'Montant invalide.');
      if (montant !== null) montant = Math.round(montant * 100) / 100;
      return [texte(c.produit, 160, 'Le produit'), texte(c.magasin, 120, 'Le magasin', true), date, montant,
        mois(c.garantie_legale_mois, 24, 120, 'Garantie légale'), mois(c.garantie_commerciale_mois, 0, 240, 'Garantie commerciale'), texte(c.note, 2000, 'La note', true)];
    }
    async function achatDe(ctx) {
      const a = await base.une(`select ${ACHAT} from achats a where a.id = $1 and a.compte_id = $2`, [uuid(ctx.params.id, 'Achat'), ctx.utilisateur.id]);
      if (!a) throw erreur(404, 'Achat introuvable.');
      return a;
    }

    /* ---------- Achats ---------- */
    r.get('/api/achats', async (req, ctx) => {
      const q = String(ctx.query.q || '').trim().slice(0, 100).replace(/[\\%_]/g, m => '\\' + m);
      const type = ['ticket', 'garantie'].includes(ctx.query.type) ? ctx.query.type : '';
      return { achats: await base.lignes(`select ${ACHAT},
          coalesce((select array_agg(distinct j.type) from justificatifs j where j.achat_id = a.id), '{}') as types,
          (select count(*)::int from justificatifs j where j.achat_id = a.id) as nb_justificatifs
        from achats a where a.compte_id = $1
          and ($2 = '' or a.produit ilike '%' || $2 || '%' or a.magasin ilike '%' || $2 || '%')
          and ($3 = '' or exists (select 1 from justificatifs j where j.achat_id = a.id and j.type = $3))
        order by a.fin_garantie, lower(a.produit) limit 500`, [ctx.utilisateur.id, q, type]) };
    });

    r.post('/api/achats', async (req, ctx) => {
      const v = lireAchat(ctx.corps);
      const { id } = await base.une(`insert into achats (compte_id, produit, magasin, date_achat, montant, garantie_legale_mois, garantie_commerciale_mois, note)
        values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`, [ctx.utilisateur.id, ...v]);
      ctx.params.id = id;
      return { achat: await achatDe(ctx) };
    });

    r.get('/api/achats/:id', async (req, ctx) => {
      const achat = await achatDe(ctx);
      return { achat,
        justificatifs: await base.lignes(`select ${PIECE} from justificatifs j where j.achat_id = $1 and j.compte_id = $2 order by j.cree_le`, [achat.id, ctx.utilisateur.id]),
        envois: await base.lignes(`select destinataire, objet, nb_pieces, envoye_le, statut from envois where achat_id = $1 and compte_id = $2 and nature = 'partage'
          order by envoye_le desc limit 10`, [achat.id, ctx.utilisateur.id]) };
    });

    r.put('/api/achats/:id', async (req, ctx) => {
      const v = lireAchat(ctx.corps);
      // Fin de garantie changée = nouveau rappel à envoyer
      const a = await base.une(`update achats set produit = $3, magasin = $4, date_achat = $5, montant = $6, garantie_legale_mois = $7, garantie_commerciale_mois = $8, note = $9,
          rappel_envoye_le = case when ($5::date + make_interval(months => greatest($7::int, $8::int)))::date = fin_garantie then rappel_envoye_le else null end
        where id = $1 and compte_id = $2 returning id`, [uuid(ctx.params.id, 'Achat'), ctx.utilisateur.id, ...v]);
      if (!a) throw erreur(404, 'Achat introuvable.');
      return { achat: await achatDe(ctx) };
    });

    r.delete('/api/achats/:id', async (req, ctx) => {
      const a = await base.une('delete from achats where id = $1 and compte_id = $2 returning id, produit', [uuid(ctx.params.id, 'Achat'), ctx.utilisateur.id]);
      if (!a) throw erreur(404, 'Achat introuvable.');
      await journal(ctx, 'achat_supprime', 'achats:' + a.id);
      return { ok: true };
    });

    /* ---------- Justificatifs ---------- */
    r.post('/api/achats/:id/justificatifs', { limite: 14.5e6 }, async (req, ctx) => {
      const achat = await achatDe(ctx);
      const type = ctx.corps.type;
      if (!['ticket', 'garantie'].includes(type)) throw erreur(400, 'Choisis le type : ticket de caisse ou bon de garantie. Les autres documents ne sont pas acceptés.');
      const nom = texte(String(ctx.corps.nom || '').replace(/[\u0000-\u001f\\/]/g, '_'), 200, 'Le nom du fichier');
      if (typeof ctx.corps.donnees !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(ctx.corps.donnees)) throw erreur(400, 'Fichier illisible.');
      const contenu = Buffer.from(ctx.corps.donnees, 'base64');
      const max = Math.min(MAX_OCTETS, (await reglage('taille_max_mo')) * MO);
      if (!contenu.length) throw erreur(400, 'Le fichier est vide.');
      if (contenu.length > max) throw erreur(413, `Fichier trop lourd : ${Math.round(max / MO)} Mo maximum.`);
      const t = typeDuContenu(contenu);
      if (!t) throw erreur(415, 'Format refusé : seuls les PDF, JPEG et PNG sont acceptés.');
      const maxFichiers = Math.min(5, await reglage('fichiers_par_achat'));
      const empreinte = crypto.createHash('sha256').update(contenu).digest('hex');
      const j = await base.transaction(async c => {
        await c.query('select id from achats where id = $1 for update', [achat.id]);   // compte des fichiers sans course
        const { rows: [{ n }] } = await c.query('select count(*)::int as n from justificatifs where achat_id = $1', [achat.id]);
        if (n >= maxFichiers) throw erreur(400, `${maxFichiers} fichiers maximum par achat.`);
        if ((await c.query('select 1 from justificatifs where achat_id = $1 and empreinte_sha256 = $2', [achat.id, empreinte])).rowCount) throw erreur(409, 'Ce fichier est déjà joint à cet achat.');
        const { rows: [ligne] } = await c.query(`insert into justificatifs (achat_id, compte_id, type, nom_origine, type_mime, taille_octets, empreinte_sha256)
          values ($1, $2, $3, $4, $5, $6, $7) returning id, type, nom_origine, type_mime, taille_octets, cree_le`, [achat.id, ctx.utilisateur.id, type, nom, t.mime, contenu.length, empreinte]);
        await c.query('insert into justificatifs_contenu (justificatif_id, compte_id, contenu) values ($1, $2, $3)', [ligne.id, ctx.utilisateur.id, contenu]);
        return ligne;
      });
      return { justificatif: j };
    });

    // Toujours en téléchargement (jamais affiché en ligne par le navigateur), accès vérifié par compte
    r.get('/api/justificatifs/:id/fichier', async (req, ctx) => {
      const f = await base.une(`select j.nom_origine, j.type_mime, c.contenu from justificatifs j join justificatifs_contenu c on c.justificatif_id = j.id
        where j.id = $1 and j.compte_id = $2`, [uuid(ctx.params.id, 'Fichier'), ctx.utilisateur.id]);
      if (!f) throw erreur(404, 'Fichier introuvable.');
      const ascii = f.nom_origine.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
      ctx.res.writeHead(200, { 'Content-Type': f.type_mime, 'Content-Length': f.contenu.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.nom_origine)}`, 'Content-Security-Policy': "default-src 'none'; sandbox" });
      ctx.res.end(f.contenu);
    });

    r.patch('/api/justificatifs/:id', async (req, ctx) => {
      if (!['ticket', 'garantie'].includes(ctx.corps.type)) throw erreur(400, 'Type : ticket ou garantie.');
      const j = await base.une(`update justificatifs j set type = $3 where j.id = $1 and j.compte_id = $2 returning ${PIECE}`, [uuid(ctx.params.id, 'Fichier'), ctx.utilisateur.id, ctx.corps.type]);
      if (!j) throw erreur(404, 'Fichier introuvable.');
      return { justificatif: j };
    });

    r.delete('/api/justificatifs/:id', async (req, ctx) => {
      const j = await base.une('delete from justificatifs where id = $1 and compte_id = $2 returning id', [uuid(ctx.params.id, 'Fichier'), ctx.utilisateur.id]);
      if (!j) throw erreur(404, 'Fichier introuvable.');
      await journal(ctx, 'justificatif_supprime', 'justificatifs:' + j.id);
      return { ok: true };
    });

    /* ---------- Envoi par e-mail ---------- */
    r.post('/api/achats/:id/envoyer', async (req, ctx) => {
      const achat = await achatDe(ctx);
      const destinataire = comptes.controlerEmail(ctx.corps.destinataire);
      const objet = texte(ctx.corps.objet, 200, 'L’objet');
      const message = texte(ctx.corps.message, 5000, 'Le message', true) || '';
      const ids = [...new Set([].concat(ctx.corps.pieces || []).map(String))];
      if (ids.length > 5) throw erreur(400, '5 pièces jointes maximum.');
      ids.forEach(id => uuid(id, 'Pièce jointe'));
      const parJour = await reglage('envois_par_jour');
      const { n } = await base.une(`select count(*)::int as n from envois where compte_id = $1 and nature = 'partage'
        and envoye_le >= (date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')`, [ctx.utilisateur.id]);
      if (n >= parJour) throw erreur(429, `Tu as atteint la limite de ${parJour} e-mails aujourd’hui. Réessaie demain.`);
      const pieces = ids.length ? await base.lignes(`select j.id, j.nom_origine, c.contenu from justificatifs j join justificatifs_contenu c on c.justificatif_id = j.id
        where j.achat_id = $1 and j.compte_id = $2 and j.id = any($3::uuid[])`, [achat.id, ctx.utilisateur.id, ids]) : [];
      if (pieces.length !== ids.length) throw erreur(400, 'Une pièce jointe est introuvable.');
      const total = pieces.reduce((s, p) => s + p.contenu.length, 0);
      const maxTotal = Math.min(MAX_OCTETS, (await reglage('envoi_taille_max_mo')) * MO);
      if (total > maxTotal) throw erreur(413, `Pièces jointes trop lourdes : ${Math.round(maxTotal / MO)} Mo au total maximum.`);
      const auteur = ctx.utilisateur.email;
      const corps = `${message}\n\n—\nEnvoyé par ${auteur} depuis Garanto. Pour répondre, utilisez simplement « Répondre ».`;
      const envoi = await base.une(`insert into envois (compte_id, achat_id, nature, destinataire, objet, nb_pieces, taille_octets) values ($1, $2, 'partage', $3, $4, $5, $6) returning id`,
        [ctx.utilisateur.id, achat.id, destinataire, objet, pieces.length, total]);
      try {
        const idFournisseur = await envoyerEmail({ a: destinataire, repondreA: auteur, objet, texte: corps,
          pieces: pieces.map(p => ({ name: p.nom_origine, content: p.contenu.toString('base64') })) });
        await base.requete(`update envois set statut = 'envoye', id_fournisseur = $2 where id = $1`, [envoi.id, idFournisseur]);
      } catch (e) {
        await base.requete(`update envois set statut = 'echec', erreur = $2 where id = $1`, [envoi.id, String(e.message).slice(0, 500)]);
        throw erreur(502, 'L’e-mail n’a pas pu partir. Réessaie dans quelques minutes.');
      }
      await journal(ctx, 'email_envoye', 'achats:' + achat.id, { destinataire, pieces: pieces.length });
      return { ok: true, restants: parJour - n - 1 };
    });

    /* ---------- Mon compte ---------- */
    async function verifierMdp(ctx) {
      const u = await base.une('select mdp_hash from utilisateurs where id = $1', [ctx.utilisateur.id]);
      if (!u || !(await comptes.verifier(String(ctx.corps.mdp || ''), u.mdp_hash))) throw erreur(400, 'Mot de passe incorrect.');
    }

    r.get('/api/compte', async (req, ctx) => {
      const p = await base.une('select rappels_actifs from preferences_comptes where compte_id = $1', [ctx.utilisateur.id]);
      const parJour = await reglage('envois_par_jour');
      const { n } = await base.une(`select count(*)::int as n from envois where compte_id = $1 and nature = 'partage'
        and envoye_le >= (date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')`, [ctx.utilisateur.id]);
      return { email: ctx.utilisateur.email, rappels_actifs: p ? p.rappels_actifs : true, rappel_jours_avant: await reglage('rappel_jours_avant'),
        envois_par_jour: parJour, envois_restants: Math.max(0, parJour - n), taille_max_mo: Math.min(10, await reglage('taille_max_mo')),
        fichiers_par_achat: Math.min(5, await reglage('fichiers_par_achat')), envoi_taille_max_mo: Math.min(10, await reglage('envoi_taille_max_mo')) };
    });

    r.put('/api/compte/preferences', async (req, ctx) => {
      const actifs = ctx.corps.rappels_actifs === true || ctx.corps.rappels_actifs === 'true' || ctx.corps.rappels_actifs === '1';
      await base.requete(`insert into preferences_comptes (compte_id, rappels_actifs) values ($1, $2)
        on conflict (compte_id) do update set rappels_actifs = excluded.rappels_actifs`, [ctx.utilisateur.id, actifs]);
      return { rappels_actifs: actifs };
    });

    r.put('/api/compte/email', async (req, ctx) => {
      const email = comptes.controlerEmail(ctx.corps.email);
      await verifierMdp(ctx);
      if (await base.une('select 1 from utilisateurs where email = $1 and id <> $2', [email, ctx.utilisateur.id])) throw erreur(409, 'Un compte existe déjà avec cet email.');
      await base.requete('update utilisateurs set email = $2 where id = $1', [ctx.utilisateur.id, email]);
      await journal(ctx, 'email_change', email, { ancien: ctx.utilisateur.email });
      return { email };
    });

    // Export complet (fichiers compris, en base64), écrit au fil de l'eau pour ne pas tout charger en mémoire
    r.get('/api/compte/export', async (req, ctx) => {
      const id = ctx.utilisateur.id;
      const compte = await base.une('select email, nom, role, cree_le, derniere_connexion_le from utilisateurs where id = $1', [id]);
      const preferences = await base.une('select rappels_actifs, inactivite_prevenu_le from preferences_comptes where compte_id = $1', [id]);
      const achats = await base.lignes(`select ${ACHAT} from achats a where a.compte_id = $1 order by a.date_achat`, [id]);
      const pieces = await base.lignes(`select j.achat_id, ${PIECE}, j.empreinte_sha256 from justificatifs j where j.compte_id = $1 order by j.cree_le`, [id]);
      const envois = await base.lignes('select achat_id, nature, destinataire, objet, nb_pieces, taille_octets, envoye_le, statut from envois where compte_id = $1 order by envoye_le', [id]);
      await journal(ctx, 'export_donnees', compte.email);
      const res = ctx.res;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="garanto-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"` });
      const ecrire = s => new Promise(ok => { if (res.write(s)) ok(); else res.once('drain', ok); });
      await ecrire(`{"app":"Garanto","exporte_le":${JSON.stringify(new Date())},"compte":${JSON.stringify(compte)},"preferences":${JSON.stringify(preferences)},"envois":${JSON.stringify(envois)},"achats":[`);
      for (let i = 0; i < achats.length; i++) {
        const a = achats[i];
        await ecrire((i ? ',' : '') + JSON.stringify(a).slice(0, -1) + ',"justificatifs":[');
        const siens = pieces.filter(p => p.achat_id === a.id);
        for (let k = 0; k < siens.length; k++) {
          const c = await base.une('select contenu from justificatifs_contenu where justificatif_id = $1', [siens[k].id]);
          const p = Object.assign({}, siens[k]); delete p.achat_id;
          await ecrire((k ? ',' : '') + JSON.stringify(p).slice(0, -1) + `,"contenu_base64":"${c ? c.contenu.toString('base64') : ''}"}`);
        }
        await ecrire(']}');
      }
      res.end(']}');
    });

    r.post('/api/compte/supprimer', async (req, ctx) => {
      await verifierMdp(ctx);
      if (ctx.utilisateur.role === 'admin' && !(await base.une("select 1 from utilisateurs where role = 'admin' and actif and id <> $1", [ctx.utilisateur.id])))
        throw erreur(400, 'C’est le dernier compte admin : impossible de le supprimer.');
      const bilan = await base.une(`select (select count(*)::int from achats where compte_id = $1) as achats, (select count(*)::int from justificatifs where compte_id = $1) as fichiers`, [ctx.utilisateur.id]);
      await journal(ctx, 'compte_supprime_par_utilisateur', ctx.utilisateur.email, bilan);
      await base.requete('delete from utilisateurs where id = $1', [ctx.utilisateur.id]);   // achats, fichiers, envois, sessions : en cascade
      const secure = env.get('APP_ENV') === 'production' ? '; Secure' : '';
      ctx.res.setHeader('Set-Cookie', `sid=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`);
      return { ok: true };
    });
  },

  async demarrage({ env }) {
    if (!env.get('TACHE_QUOTIDIENNE')) return;
    const lancer = () => tacheQuotidienne().catch(e => console.error('[garanto] tâche quotidienne : ' + e.message));
    setTimeout(lancer, 5000).unref();
    setInterval(lancer, JOUR).unref();
  },

  // Pour les tests (outils/ et scripts) : la tâche et la détection de type, sans passer par le serveur
  tacheQuotidienne: () => tacheQuotidienne(),
  typeDuContenu
};

let outils = null;   // { base, journal, env, erreur } reçus du socle par routes()

/** Réglage partagé (table reglages du socle), sinon la valeur par défaut déclarée ci-dessus. */
async function reglage(cle) {
  const decl = module.exports.reglages.find(x => x.cle === cle);
  const r = await outils.base.une('select valeur from reglages where cle = $1', [cle]);
  const v = r && r.valeur != null && r.valeur !== '' ? Number(r.valeur) : NaN;
  return Number.isFinite(v) && v >= 0 ? v : decl.defaut;
}

/** E-mail sortant par l'API transactionnelle Brevo. Sans clé hors production : écrit dans le journal du serveur. Renvoie l'identifiant du message. */
async function envoyerEmail({ a, repondreA, objet, texte, pieces }) {
  const { env } = outils;
  const cle = env.get('BREVO_API_KEY');
  const html = `<div>${echapperHtml(texte).replace(/\n/g, '<br>')}</div>`;
  if (!cle) {
    if (env.get('APP_ENV') === 'production') throw new Error('BREVO_API_KEY absente');
    console.log(`[email] (non envoyé, BREVO_API_KEY absente) à ${a} — ${objet} — ${(pieces || []).length} pièce(s)\n${texte}`);
    return 'dev-' + crypto.randomUUID();
  }
  const corps = { sender: { email: env.get('EMAIL_EXPEDITEUR'), name: env.get('EMAIL_EXPEDITEUR_NOM') }, to: [{ email: a }], subject: objet, textContent: texte, htmlContent: html };
  if (repondreA && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repondreA)) corps.replyTo = { email: repondreA };
  if (pieces && pieces.length) corps.attachment = pieces;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': cle, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(corps), signal: AbortSignal.timeout(30000) });
  const rep = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brevo ${res.status} : ${rep.message || rep.code || 'refus'}`);
  return rep.messageId || '';
}

/** Rappels de fin de garantie, puis prévenances et suppressions pour inactivité. Sans double envoi : chaque ligne est réservée avant l'envoi. */
async function tacheQuotidienne() {
  if (!outils) return;
  const { base, journal, env } = outils;
  const url = env.get('APP_URL') || '';
  const bilan = { rappels: 0, prevenances: 0, suppressions: 0, echecs: 0 };

  const avant = await reglage('rappel_jours_avant');
  const aRappeler = await base.lignes(`select a.id, a.compte_id, a.produit, a.magasin, a.fin_garantie::text as fin_garantie, u.email from achats a
      join utilisateurs u on u.id = a.compte_id left join preferences_comptes p on p.compte_id = a.compte_id
    where a.rappel_envoye_le is null and a.fin_garantie between current_date and current_date + $1::int
      and coalesce(p.rappels_actifs, true) and u.actif and u.email like '%_@_%' order by a.fin_garantie limit 1000`, [avant]);
  for (const a of aRappeler) {
    if (!(await base.une('update achats set rappel_envoye_le = now() where id = $1 and rappel_envoye_le is null returning id', [a.id]))) continue;
    const objet = `Garantie bientôt terminée : ${a.produit}`.slice(0, 200);
    const texte = `Bonjour,\n\nLa garantie de « ${a.produit} »${a.magasin ? ` (acheté chez ${a.magasin})` : ''} se termine le ${dateFr(a.fin_garantie)}.\n` +
      `Si le produit présente un défaut, c’est le moment de contacter le vendeur ou le SAV : votre ticket et votre garantie sont dans Garanto.\n\n${url}\n\n` +
      `Pour ne plus recevoir ces rappels : Garanto › Mon compte.`;
    const envoi = await base.une(`insert into envois (compte_id, achat_id, nature, destinataire, objet) values ($1, $2, 'rappel', $3, $4) returning id`, [a.compte_id, a.id, a.email, objet]);
    try {
      const idF = await envoyerEmail({ a: a.email, objet, texte });
      await base.requete(`update envois set statut = 'envoye', id_fournisseur = $2 where id = $1`, [envoi.id, idF]);
      bilan.rappels++;
    } catch (e) {
      await base.requete(`update envois set statut = 'echec', erreur = $2 where id = $1`, [envoi.id, String(e.message).slice(0, 500)]);
      await base.requete('update achats set rappel_envoye_le = null where id = $1', [a.id]);   // retenté demain
      bilan.echecs++;
    }
  }

  const annees = Math.max(1, await reglage('inactivite_annees'));
  const aPrevenir = await base.lignes(`select u.id, u.email from utilisateurs u left join preferences_comptes p on p.compte_id = u.id
    where u.role <> 'admin' and u.email like '%_@_%' and coalesce(u.derniere_connexion_le, u.cree_le) < now() - make_interval(years => $1::int)
      and (p.inactivite_prevenu_le is null or p.inactivite_prevenu_le < coalesce(u.derniere_connexion_le, u.cree_le)) limit 500`, [annees]);
  for (const u of aPrevenir) {
    const objet = 'Votre compte Garanto sera supprimé dans 30 jours';
    const texte = `Bonjour,\n\nVous ne vous êtes pas connecté à Garanto depuis plus de ${annees} ans. Sans connexion de votre part d’ici 30 jours, ` +
      `votre compte, vos tickets et vos garanties seront définitivement supprimés.\n\nPour les garder, connectez-vous simplement : ${url}\n`;
    const envoi = await base.une(`insert into envois (compte_id, nature, destinataire, objet) values ($1, 'prevenance', $2, $3) returning id`, [u.id, u.email, objet]);
    try {
      const idF = await envoyerEmail({ a: u.email, objet, texte });
      await base.requete(`update envois set statut = 'envoye', id_fournisseur = $2 where id = $1`, [envoi.id, idF]);
      await base.requete(`insert into preferences_comptes (compte_id, inactivite_prevenu_le) values ($1, now())
        on conflict (compte_id) do update set inactivite_prevenu_le = now()`, [u.id]);
      bilan.prevenances++;
    } catch (e) {
      await base.requete(`update envois set statut = 'echec', erreur = $2 where id = $1`, [envoi.id, String(e.message).slice(0, 500)]);
      bilan.echecs++;
    }
  }

  const aSupprimer = await base.lignes(`select u.id, u.email from utilisateurs u join preferences_comptes p on p.compte_id = u.id
    where u.role <> 'admin' and p.inactivite_prevenu_le < now() - interval '30 days' and coalesce(u.derniere_connexion_le, u.cree_le) < p.inactivite_prevenu_le limit 500`);
  for (const u of aSupprimer) {
    await base.requete('delete from utilisateurs where id = $1', [u.id]);
    await journal(null, 'compte_supprime_inactivite', u.email);
    bilan.suppressions++;
  }

  if (bilan.rappels || bilan.prevenances || bilan.suppressions || bilan.echecs) {
    console.log(`[garanto] tâche quotidienne : ${bilan.rappels} rappel(s), ${bilan.prevenances} prévenance(s), ${bilan.suppressions} suppression(s), ${bilan.echecs} échec(s)`);
    await journal(null, 'tache_quotidienne', '', bilan);
  }
  return bilan;
}
