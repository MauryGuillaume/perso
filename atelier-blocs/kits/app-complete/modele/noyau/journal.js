/* noyau/journal.js — journal des actions sensibles (table journal). Kit « App complète ». Ne pas modifier.
   journal(ctx, 'action', 'cible', { détails sans mot de passe ni donnée bancaire })
   journal.purger(mois) efface les lignes plus anciennes (JOURNAL_MOIS, chaque jour depuis serveur.js) */
'use strict';
const base = require('./base');
const INTERDITS = /(mot_?de_?passe|mdp|password|secret|token|jeton|carte|iban|cvc)/i;

function nettoyer(detail) {
  const out = {};
  for (const [k, v] of Object.entries(detail || {})) out[k] = INTERDITS.test(k) ? '••••' : (v && typeof v === 'object' && !Array.isArray(v) ? nettoyer(v) : v);
  return out;
}

async function journal(ctx, action, cible, detail) {
  const u = ctx && ctx.utilisateur;
  try {
    await base.requete('insert into journal (utilisateur_id, acteur, action, cible, detail, ip) values ($1, $2, $3, $4, $5, $6)',
      [u ? u.id : null, u ? u.email : (ctx && ctx.parCle ? 'atelier' : 'système'), action, String(cible || ''), JSON.stringify(nettoyer(detail)), ctx && ctx.ip || null]);
  } catch (e) { console.error('[journal] ' + e.message); }
}
/** Efface les lignes plus anciennes que JOURNAL_MOIS (durée annoncée dans la politique de confidentialité). */
async function purger(mois) {
  try {
    const r = await base.requete('delete from journal where cree_le < now() - make_interval(months => $1)', [Math.max(1, mois || 12)]);
    if (r.rowCount) console.log(`[journal] ${r.rowCount} ligne(s) de plus de ${mois} mois effacée(s)`);
  } catch (e) { console.error('[journal] purge : ' + e.message); }
}
module.exports = journal;
module.exports.nettoyer = nettoyer;
module.exports.purger = purger;
