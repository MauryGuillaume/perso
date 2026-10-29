/* app/metier.js — données de PodoLogiciel : patients, bilans, agenda, dépenses.
   Chaque podologue ne voit et ne modifie que ses lignes (utilisateur_id). Supprimer depuis l'écran date la ligne
   (supprime_le) : elle disparaît de l'app mais reste récupérable par l'admin dans l'Atelier.
   Les champs sont écrits en camelCase par l'écran et rangés en snake_case dans la base ; les champs inconnus sont ignorés. */
'use strict';

/** Correspondance écran ↔ base : [champ de l'écran, colonne, sorte]. */
const PATIENT = [['nom', 'nom', 'texte'], ['prenom', 'prenom', 'texte'], ['dateNaissance', 'date_naissance', 'texte'], ['taille', 'taille', 'texte'],
  ['poids', 'poids', 'texte'], ['medecinTraitant', 'medecin_traitant', 'texte'], ['telephone', 'telephone', 'texte'], ['email', 'email', 'texte'],
  ['adresse', 'adresse', 'texte'], ['notesAdmin', 'notes_admin', 'texte']];
const BILAN = [['typeBilan', 'type_bilan', 'texte'], ['statut', 'statut', 'texte'], ['date', 'date', 'texte'], ['motifConsultation', 'motif_consultation', 'texte'],
  ['douleurScore', 'douleur_score', 'entier']];
const RDV = [['patientName', 'patient_nom', 'texte'], ['date', 'date', 'texte'], ['startTime', 'heure_debut', 'texte'], ['durationMinutes', 'duree_minutes', 'entier'],
  ['type', 'type', 'texte'], ['notes', 'notes', 'texte']];
const AGENDA = [['workStart', 'debut_journee', 'entier'], ['workEnd', 'fin_journee', 'entier'], ['slotMinutes', 'creneau_minutes', 'entier'], ['workDays', 'jours_travailles', 'json']];
const DEPENSE = [['date', 'date', 'texte'], ['libelle', 'libelle', 'texte'], ['categorie', 'categorie', 'texte'], ['montant', 'montant', 'nombre'], ['notes', 'notes', 'texte'],
  ['typeDepense', 'type_depense', 'texte'], ['kmDistance', 'km_distance', 'nombre'], ['kmNbTrajets', 'km_nb_trajets', 'entier'], ['kmAllerRetour', 'km_aller_retour', 'booleen'],
  ['kmTaux', 'km_taux', 'nombre'], ['recurrenceFreq', 'frequence_recurrence', 'texte']];

module.exports.routes = function (r, { base, journal, env, erreur }) {
  /** Valeurs de l'écran → colonnes, avec contrôle de type. */
  function colonnes(carte, corps) {
    const out = {};
    for (const [champ, col, sorte] of carte) {
      if (!(champ in corps)) continue;
      let v = corps[champ];
      if (v === '' && sorte !== 'texte') v = null;
      if (v != null) {
        if (sorte === 'texte') v = String(v).slice(0, 20000);
        else if (sorte === 'entier') { v = Number(v); if (!Number.isInteger(v)) throw erreur(400, `${champ} : nombre entier attendu.`); }
        else if (sorte === 'nombre') { v = Number(String(v).replace(',', '.')); if (!Number.isFinite(v)) throw erreur(400, `${champ} : nombre attendu.`); }
        else if (sorte === 'booleen') v = !!v;
        else if (sorte === 'json') v = JSON.stringify(v);
      }
      out[col] = v;
    }
    return out;
  }
  /** Ligne de la base → objet de l'écran. */
  function versEcran(carte, ligne, extra) {
    if (!ligne) return null;
    const o = { id: ligne.id, userId: ligne.utilisateur_id };
    for (const [champ, col, sorte] of carte) o[champ] = sorte === 'nombre' && ligne[col] != null ? Number(ligne[col]) : ligne[col];
    if (ligne.cree_le) o.createdAt = ligne.cree_le;
    if (ligne.modifie_le) o.updatedAt = ligne.modifie_le;
    return Object.assign(o, extra || {});
  }
  const inserer = async (table, champs) => {
    const cles = Object.keys(champs);
    return base.une(`insert into ${table} (${cles.join(', ')}) values (${cles.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, cles.map(k => champs[k]));
  };
  const modifier = async (table, id, uid, champs) => {
    const cles = Object.keys(champs);
    if (!cles.length) return base.une(`select * from ${table} where id = $1 and utilisateur_id = $2 and supprime_le is null`, [id, uid]);
    return base.une(`update ${table} set ${cles.map((k, i) => `${k} = $${i + 3}`).join(', ')} where id = $1 and utilisateur_id = $2 and supprime_le is null returning *`,
      [id, uid, ...cles.map(k => champs[k])]);
  };
  /** La ligne existe et appartient au podologue connecté (même message sinon : on ne révèle pas les lignes des autres). */
  const sienne = async (table, id, uid, libelle) => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw erreur(404, `${libelle} introuvable.`);
    const l = await base.une(`select * from ${table} where id = $1 and utilisateur_id = $2 and supprime_le is null`, [id, uid]);
    if (!l) throw erreur(404, `${libelle} introuvable.`);
    return l;
  };
  const supprimer = async (table, id, uid, libelle) => {
    await sienne(table, id, uid, libelle);
    await base.requete(`update ${table} set supprime_le = now() where id = $1`, [id]);
    return { deleted: true };
  };
  const uid = ctx => ctx.utilisateur.id;

  /* ---------- Résumé (écran web de l'API) ---------- */
  r.get('/api/resume', async (req, ctx) => base.une(`select
      (select count(*)::int from patients where utilisateur_id = $1 and supprime_le is null) as patients,
      (select count(*)::int from bilans where utilisateur_id = $1 and supprime_le is null) as bilans,
      (select count(*)::int from rendez_vous where utilisateur_id = $1 and supprime_le is null and date >= to_char(now(), 'YYYY-MM-DD')) as rendez_vous_a_venir`, [uid(ctx)]));

  /* ---------- Patients ---------- */
  const patient = l => versEcran(PATIENT, l);
  r.get('/api/patients', async (req, ctx) =>
    (await base.lignes('select * from patients where utilisateur_id = $1 and supprime_le is null order by lower(nom), lower(prenom)', [uid(ctx)])).map(patient));

  r.post('/api/patients', async (req, ctx) => {
    const champs = colonnes(PATIENT, ctx.corps);
    if (!['admin', 'premium', 'vip'].includes(ctx.utilisateur.role)) {
      const n = (await base.une('select count(*)::int as n from patients where utilisateur_id = $1 and supprime_le is null', [uid(ctx)])).n;
      if (n >= env.get('PATIENTS_MAX_GRATUIT')) throw erreur(403, `Le compte gratuit est limité à ${env.get('PATIENTS_MAX_GRATUIT')} patients : passe en Pro pour en ajouter.`);
    }
    return patient(await inserer('patients', Object.assign(champs, { utilisateur_id: uid(ctx) })));
  });

  r.patch('/api/patients/:id', async (req, ctx) => {
    await sienne('patients', ctx.params.id, uid(ctx), 'Patient');
    return patient(await modifier('patients', ctx.params.id, uid(ctx), colonnes(PATIENT, ctx.corps)));
  });

  r.delete('/api/patients/:id', async (req, ctx) => {
    const res = await supprimer('patients', ctx.params.id, uid(ctx), 'Patient');
    await base.requete('update bilans set supprime_le = now() where patient_id = $1 and supprime_le is null', [ctx.params.id]);
    await journal(ctx, 'patient_supprime', ctx.params.id);
    return res;
  });

  /* ---------- Bilans : champs principaux en colonnes, le reste (annotations, schémas…) dans donnees ---------- */
  const bilan = l => l && Object.assign({}, l.donnees || {}, versEcran(BILAN, l, { patientId: l.patient_id }));
  const BILAN_LIMITE = { limite: 25e6 };   // un bilan peut contenir des dessins et des photos
  r.get('/api/bilans', async (req, ctx) => {
    const p = ctx.query.patientId;
    if (p && !/^[0-9a-f-]{36}$/i.test(p)) return [];
    return (await base.lignes(`select * from bilans where utilisateur_id = $1 and supprime_le is null and ($2::uuid is null or patient_id = $2::uuid)
      order by date desc, cree_le desc`, [uid(ctx), p || null])).map(bilan);
  });

  r.post('/api/bilans', BILAN_LIMITE, async (req, ctx) => {
    await sienne('patients', String(ctx.corps.patientId || ''), uid(ctx), 'Patient');
    const champs = colonnes(BILAN, ctx.corps);
    if (!champs.date) champs.date = new Date().toISOString().slice(0, 10);
    return bilan(await inserer('bilans', Object.assign(champs, { utilisateur_id: uid(ctx), patient_id: ctx.corps.patientId })));
  });

  r.patch('/api/bilans/:id', BILAN_LIMITE, async (req, ctx) => {
    const avant = await sienne('bilans', ctx.params.id, uid(ctx), 'Bilan');
    const champs = colonnes(BILAN, ctx.corps);
    if (ctx.corps.data !== undefined) {
      if (!ctx.corps.data || typeof ctx.corps.data !== 'object' || Array.isArray(ctx.corps.data)) throw erreur(400, 'Données du bilan invalides.');
      const reste = Object.assign({}, avant.donnees || {}, ctx.corps.data);
      for (const k of ['id', 'userId', 'patientId', 'createdAt', 'updatedAt']) delete reste[k];
      champs.donnees = JSON.stringify(reste);
    }
    return bilan(await modifier('bilans', ctx.params.id, uid(ctx), champs));
  });

  r.delete('/api/bilans/:id', async (req, ctx) => supprimer('bilans', ctx.params.id, uid(ctx), 'Bilan'));

  /* ---------- Agenda ---------- */
  const rdv = l => versEcran(RDV, l);
  const DEFAUT_AGENDA = { workStart: 8, workEnd: 19, slotMinutes: 30, workDays: [1, 2, 3, 4, 5, 6] };
  const reglagesAgenda = (l, id) => l ? Object.assign({ userId: l.utilisateur_id }, ...AGENDA.map(([champ, col]) => ({ [champ]: l[col] })), { updatedAt: l.modifie_le })
    : Object.assign({ userId: id }, DEFAUT_AGENDA);

  r.get('/api/agenda', async (req, ctx) =>
    (await base.lignes('select * from rendez_vous where utilisateur_id = $1 and supprime_le is null order by date, heure_debut', [uid(ctx)])).map(rdv));

  r.post('/api/agenda', async (req, ctx) => {
    const champs = colonnes(RDV, ctx.corps);
    if (!champs.patient_nom || !champs.date || !champs.heure_debut) throw erreur(400, 'Patient, date et heure sont obligatoires.');
    return rdv(await inserer('rendez_vous', Object.assign(champs, { utilisateur_id: uid(ctx) })));
  });

  // /agenda/settings avant /agenda/:id
  r.get('/api/agenda/settings', async (req, ctx) => reglagesAgenda(await base.une('select * from reglages_agenda where utilisateur_id = $1', [uid(ctx)]), uid(ctx)));

  r.patch('/api/agenda/settings', async (req, ctx) => {
    const champs = colonnes(AGENDA, ctx.corps);
    if (champs.jours_travailles && !/^\[[0-6](,[0-6])*\]$/.test(champs.jours_travailles.replace(/\s/g, ''))) throw erreur(400, 'Jours travaillés invalides.');
    const cles = Object.keys(champs);
    const l = await base.une(`insert into reglages_agenda (utilisateur_id${cles.map(k => ', ' + k).join('')}) values ($1${cles.map((_, i) => ', $' + (i + 2)).join('')})
      on conflict (utilisateur_id) do update set ${cles.length ? cles.map(k => `${k} = excluded.${k}`).join(', ') : 'utilisateur_id = excluded.utilisateur_id'} returning *`,
      [uid(ctx), ...cles.map(k => champs[k])]);
    return reglagesAgenda(l, uid(ctx));
  });

  r.patch('/api/agenda/:id', async (req, ctx) => {
    await sienne('rendez_vous', ctx.params.id, uid(ctx), 'Rendez-vous');
    return rdv(await modifier('rendez_vous', ctx.params.id, uid(ctx), colonnes(RDV, ctx.corps)));
  });

  r.delete('/api/agenda/:id', async (req, ctx) => supprimer('rendez_vous', ctx.params.id, uid(ctx), 'Rendez-vous'));

  /* ---------- Dépenses ---------- */
  const depense = l => versEcran(DEPENSE, l, { recurrenceGroupId: l.groupe_recurrence });
  const controlerDepense = champs => {
    if (!champs.libelle || !champs.date || !champs.categorie || champs.montant == null) throw erreur(400, 'Date, libellé, catégorie et montant sont obligatoires.');
  };
  r.get('/api/expenses', async (req, ctx) =>
    (await base.lignes('select * from depenses where utilisateur_id = $1 and supprime_le is null order by date desc, cree_le desc', [uid(ctx)])).map(depense));

  r.post('/api/expenses', async (req, ctx) => {
    const champs = colonnes(DEPENSE, ctx.corps);
    controlerDepense(champs);
    return depense(await inserer('depenses', Object.assign(champs, { utilisateur_id: uid(ctx) })));
  });

  r.post('/api/expenses/recurring', async (req, ctx) => {
    const dates = Array.isArray(ctx.corps.dates) ? ctx.corps.dates.map(String) : [];
    if (!dates.length || dates.length > 120) throw erreur(400, 'Entre 1 et 120 dates attendues.');
    const champs = colonnes(DEPENSE, Object.assign({}, ctx.corps.expense || {}, { recurrenceFreq: ctx.corps.recurrenceFreq }));
    controlerDepense(Object.assign({}, champs, { date: dates[0] }));
    const groupe = require('crypto').randomUUID();
    const crees = await base.transaction(async c => {
      const out = [];
      for (const date of dates) {
        const ligne = Object.assign({}, champs, { date: date.slice(0, 10), utilisateur_id: uid(ctx), groupe_recurrence: groupe });
        const cles = Object.keys(ligne);
        out.push((await c.query(`insert into depenses (${cles.join(', ')}) values (${cles.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, cles.map(k => ligne[k]))).rows[0]);
      }
      return out;
    });
    return crees.map(depense);
  });

  r.patch('/api/expenses/:id', async (req, ctx) => {
    await sienne('depenses', ctx.params.id, uid(ctx), 'Dépense');
    return depense(await modifier('depenses', ctx.params.id, uid(ctx), colonnes(DEPENSE, ctx.corps)));
  });

  r.delete('/api/expenses/recurrence/:groupe', async (req, ctx) => {
    if (!/^[0-9a-f-]{36}$/i.test(ctx.params.groupe)) return { deletedCount: 0 };
    const res = await base.requete('update depenses set supprime_le = now() where utilisateur_id = $1 and groupe_recurrence = $2 and supprime_le is null', [uid(ctx), ctx.params.groupe]);
    return { deletedCount: res.rowCount };
  });

  r.delete('/api/expenses/:id', async (req, ctx) => supprimer('depenses', ctx.params.id, uid(ctx), 'Dépense'));
};
