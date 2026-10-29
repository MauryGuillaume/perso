/* ==========================================================================
   Crée le premier compte administrateur du cabinet (ou un autre compte).
   Usage : node outils/creer-admin.js <email> "<Nom Prénom>" <INITIALES> [role]
     role : admin (par défaut), praticien ou secretariat
   Affiche un mot de passe provisoire, à changer à la première connexion ;
   la double authentification se configure à cette même connexion.
   ========================================================================== */
const { creerCompte, Pool, migrer, S, setDb } = require('../serveur');

(async () => {
  const [email, nom, code, role] = process.argv.slice(2);
  if (!email || !nom) {
    console.log('Usage : node outils/creer-admin.js <email> "<Nom Prénom>" <INITIALES> [admin|praticien|secretariat]');
    process.exit(1);
  }
  S.chargerCle(process.env.PODO_CLE);
  const db = new Pool(process.env.DATABASE_URL, 1);
  setDb(db);
  try {
    await migrer(db);
    const { compte, mdp } = await creerCompte({ email, nom, code: code || '', role: role || 'admin' }, null, '');
    console.log('\nCompte créé : ' + compte.email + ' (' + compte.role + ')');
    console.log('Mot de passe provisoire : ' + mdp);
    console.log('À la première connexion : nouveau mot de passe, puis double authentification.\n');
  } catch (e) {
    console.error('Impossible : ' + (e.code === '23505' ? 'cet e-mail ou ces initiales existent déjà.' : e.message));
    process.exitCode = 1;
  } finally { db.fermer(); }
})();
