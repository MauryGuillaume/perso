/* serveur.js — point d'entrée. Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier.
   1. Charge et vérifie les variables d'environnement (noyau + app/app.js) : arrêt net si une est absente ou invalide.
   2. Crée la base si besoin et applique les migrations (noyau puis db/migrations).
   3. Branche les routes : comptes, offre commune (paliers, abonnements, pub), administration (Atelier), puis celles de l'app.
   4. Écoute sur PORT. Arrêt propre sur SIGTERM / SIGINT. */
'use strict';
const path = require('path');
const env = require('./noyau/env');
const app = require('./app/app.js');
env.declarer(app.variables || []);

async function demarrer({ ecouter = true } = {}) {
  const erreurs = env.charger({ racine: __dirname });
  if (erreurs.length) {
    console.error('[config] L’app ne peut pas démarrer :\n  - ' + erreurs.join('\n  - ') + '\n  Voir .env.example et KIT.md § 5.');
    process.exitCode = 1;
    throw new Error('Configuration incomplète');
  }
  const base = require('./noyau/base');
  const http = require('./noyau/http');
  const comptes = require('./noyau/comptes');
  const admin = require('./noyau/admin');
  const journal = require('./noyau/journal');
  const offre = require('./noyau/offre');
  offre.declarer(app.offre);
  const rolesEnDouble = (app.roles || []).map(x => x.id || x).filter(x => offre.ROLES_SOCLE.includes(x));
  if (rolesEnDouble.length) throw new Error(`app/app.js → roles : ${rolesEnDouble.join(', ')} est fourni par le socle, ne le redéclare pas`);

  await base.migrer();
  const r = http.routeur();
  comptes.routes(r, app);
  offre.routes(r, app);
  admin.routes(r, app);
  r.get('/api/sante', { role: 'public' }, async () => { await base.requete('select 1'); return { ok: true }; });
  if (typeof app.routes === 'function') app.routes(r, { base, journal, env, erreur: http.erreur, offre });
  const serveur = http.creerServeur({ routeur: r, auth: comptes.auth, contexte: { base, journal, env, offre }, racinePublic: path.join(__dirname, 'public') });
  await comptes.annoncerInstallation();
  if (typeof app.demarrage === 'function') await app.demarrage({ base, env, journal });
  if (ecouter) await new Promise(ok => serveur.listen(env.get('PORT'), ok));
  if (ecouter) console.log(`[serveur] ${app.nom || 'App'} v${app.version || '1.0.0'} prête sur le port ${env.get('PORT')} (${env.get('APP_ENV')})`);
  const arreter = () => { console.log('[serveur] arrêt'); serveur.close(() => base.arreter().then(() => process.exit(0))); setTimeout(() => process.exit(0), 5000).unref(); };
  process.once('SIGTERM', arreter); process.once('SIGINT', arreter);
  return serveur;
}

module.exports = demarrer;
if (require.main === module) demarrer().catch(e => { if (e.message !== 'Configuration incomplète') console.error('[serveur] ' + e.message); process.exit(1); });
