/* outils/configurer.js — première configuration sur ta machine : écrit le fichier .env (jamais livré).
   node outils/configurer.js   (lancé tout seul par lancer-api.bat / lancer-api.command si .env manque)
   Demande seulement la connexion PostgreSQL ; les clés secrètes sont tirées au hasard. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), readline = require('readline');
const fichier = path.join(__dirname, '..', '.env');
if (fs.existsSync(fichier)) { console.log('.env existe déjà : rien à faire (supprime-le pour recommencer).'); process.exit(0); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lignes = [], attentes = [];
rl.on('line', l => { const a = attentes.shift(); if (a) a(l.trim()); else lignes.push(l.trim()); });
rl.on('close', () => attentes.splice(0).forEach(a => a('')));
const question = q => { process.stdout.write(q); return lignes.length ? Promise.resolve(lignes.shift()) : new Promise(ok => attentes.push(ok)); };
const cle = n => crypto.randomBytes(n).toString('base64url');
(async () => {
  console.log('Configuration de l’API PodoLogiciel (base PostgreSQL sur ta machine).\n');
  // On essaie la connexion avant d'écrire .env : un mauvais mot de passe ou port se corrige tout de suite
  const { Client } = require('pg');
  let url = null;
  for (let essai = 1; essai <= 5 && !url; essai++) {
    const mdp = await question('Mot de passe de l’utilisateur « postgres » de PostgreSQL (choisi à son installation) : ');
    const port = (await question('Port de PostgreSQL (Entrée = 5432, le port habituel) : ')) || '5432';
    if (!/^\d{2,5}$/.test(port)) { console.log('  Le port est un nombre, en général 5432.\n'); continue; }
    const c = new Client({ host: 'localhost', port: Number(port), user: 'postgres', password: mdp, database: 'postgres', connectionTimeoutMillis: 5000 });
    try {
      await c.connect(); await c.query('select 1');
      url = `postgres://postgres:${encodeURIComponent(mdp)}@localhost:${port}/podologiciel`;
      console.log('  Connexion à PostgreSQL réussie.');
    } catch (e) {
      const m = String(e.message || e);
      console.log('  Connexion impossible : ' + (/password|mot de passe|authentification/i.test(m) ? 'mot de passe refusé.'
        : /ECONNREFUSED/.test(m) ? `rien n’écoute sur le port ${port} : PostgreSQL est-il installé et démarré ? (port habituel : 5432)`
        : /terminated|ECONNRESET|protocol/i.test(m) ? `le port ${port} n’est pas celui de PostgreSQL (port habituel : 5432).` : m) + '\n');
    } finally { await c.end().catch(() => {}); }
  }
  if (!url) { rl.close(); console.log('Configuration abandonnée : relance quand PostgreSQL est prêt.'); process.exitCode = 1; return; }
  const contenu = [
    '# .env — configuration locale de l’API PodoLogiciel (jamais livré, jamais partagé)',
    'APP_ENV=developpement',
    'PORT=4517',
    `DATABASE_URL=${url}`,
    'DB_CREER_BASE=1',
    `ADMIN_API_KEY=${cle(32)}`,
    `JETON_SECRET=${cle(48)}`,
    `DEUX_FACTEURS_CLE=${cle(32)}`,
    'INSCRIPTION_OUVERTE=1',
    'MDP_MIN=8',
    '# Écran web, aperçu de l’Atelier et app mobile : en développement, toutes les origines',
    'ORIGINES=*',
    ''
  ].join('\n');
  fs.writeFileSync(fichier, contenu, { mode: 0o600 });
  rl.close();
  console.log('\n.env écrit. La clé d’administration (ADMIN_API_KEY) est dans .env : colle-la dans l’Atelier › Gestion › Connexion.');
})();
