/* app/donnees.js — aides communes aux routes de données (factures, documents, semelles).
   Mêmes règles que app/metier.js : champs camelCase de l'écran ↔ colonnes snake_case, chaque podologue ne voit que
   ses lignes, une suppression depuis l'écran date la ligne (supprime_le). */
'use strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = function donnees({ base, erreur }) {
  /** Valeurs de l'écran → colonnes, avec contrôle de type. carte = [[champ, colonne, sorte], …]. */
  function colonnes(carte, corps) {
    const out = {};
    for (const [champ, col, sorte] of carte) {
      if (!(champ in corps)) continue;
      let v = corps[champ];
      if (v === '' && sorte !== 'texte') v = null;
      if (v != null) {
        if (sorte === 'texte') v = String(v).slice(0, 20000);
        else if (sorte === 'date') { v = String(v).slice(0, 10); if (!DATE.test(v)) throw erreur(400, `${champ} : date AAAA-MM-JJ attendue.`); }
        else if (sorte === 'entier') { v = Number(v); if (!Number.isInteger(v)) throw erreur(400, `${champ} : nombre entier attendu.`); }
        else if (sorte === 'nombre') { v = Number(String(v).replace(',', '.')); if (!Number.isFinite(v)) throw erreur(400, `${champ} : nombre attendu.`); }
        else if (sorte === 'booleen') v = !!v;
        else if (sorte === 'json') v = JSON.stringify(v);
        else if (sorte === 'uuid') { v = String(v); if (!UUID.test(v)) throw erreur(400, `${champ} : identifiant invalide.`); }
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

  async function inserer(table, champs, client) {
    const cles = Object.keys(champs);
    const sql = `insert into ${table} (${cles.join(', ')}) values (${cles.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`;
    return client ? (await client.query(sql, cles.map(k => champs[k]))).rows[0] : base.une(sql, cles.map(k => champs[k]));
  }

  async function modifier(table, id, uid, champs, client, retour = '*') {
    const cles = Object.keys(champs);
    const sql = cles.length
      ? `update ${table} set ${cles.map((k, i) => `${k} = $${i + 3}`).join(', ')} where id = $1 and utilisateur_id = $2 and supprime_le is null returning ${retour}`
      : `select ${retour} from ${table} where id = $1 and utilisateur_id = $2 and supprime_le is null`;
    const params = [id, uid, ...cles.map(k => champs[k])];
    return client ? (await client.query(sql, params)).rows[0] : base.une(sql, params);
  }

  /** La ligne existe et appartient au podologue connecté (même message sinon : on ne révèle pas les lignes des autres). */
  async function sienne(table, id, uid, libelle, colonnesLues = '*') {
    if (!UUID.test(String(id || ''))) throw erreur(404, `${libelle} introuvable.`);
    const l = await base.une(`select ${colonnesLues} from ${table} where id = $1 and utilisateur_id = $2 and supprime_le is null`, [id, uid]);
    if (!l) throw erreur(404, `${libelle} introuvable.`);
    return l;
  }

  async function supprimer(table, id, uid, libelle) {
    await sienne(table, id, uid, libelle, 'id');
    await base.requete(`update ${table} set supprime_le = now() where id = $1`, [id]);
    return { deleted: true };
  }

  /** Lien facultatif vers un bilan du même podologue (et du même patient). */
  async function bilanDuPatient(bilanId, patientId, uid) {
    if (bilanId == null || bilanId === '') return null;
    const b = await base.une('select id from bilans where id = $1 and utilisateur_id = $2 and patient_id = $3 and supprime_le is null',
      [UUID.test(String(bilanId)) ? bilanId : null, uid, patientId]);
    if (!b) throw erreur(400, 'Bilan introuvable pour ce patient.');
    return b.id;
  }

  return { colonnes, versEcran, inserer, modifier, sienne, supprimer, bilanDuPatient, UUID, DATE };
};
