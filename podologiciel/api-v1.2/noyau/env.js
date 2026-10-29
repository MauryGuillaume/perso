/* noyau/env.js — variables d'environnement DÉCLARÉES, typées et vérifiées au démarrage.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier (les variables de l'app se déclarent dans app/app.js).

   Priorité : variables du système (hébergeur) > fichier .env (développement seulement) > valeur par défaut.
   - Une variable obligatoire absente arrête le démarrage avec la liste de ce qui manque (jamais d'app à moitié configurée).
   - Une valeur invalide (entier, booléen, URL, choix) arrête aussi le démarrage, avec la raison.
   - Une variable secrète n'est jamais affichée, journalisée ni renvoyée par l'API : l'admin voit « définie » ou « absente ».
   - Toute lecture passe par env.get('CLE') : une clé non déclarée lève une erreur (pas de variable cachée dans le code).

   node noyau/env.js --exemple   écrit le contenu de .env.example (toutes les variables, sans valeur secrète)
   node noyau/env.js --verifier  vérifie la configuration actuelle et affiche l'état (secrets masqués) */
'use strict';
const fs = require('fs');
const path = require('path');

/** Variables du noyau. Format : { cle, type, role, obligatoire?, secret?, defaut?, choix?, min? } */
const NOYAU = [
  { cle: 'APP_ENV', type: 'choix', choix: ['developpement', 'production'], defaut: 'developpement', role: 'Environnement : « production » impose HTTPS, cookies sécurisés et toutes les variables obligatoires' },
  { cle: 'APP_URL', type: 'url', role: 'Adresse publique de l’app (https://…), obligatoire en production', obligatoireEnProduction: true },
  { cle: 'APP_NOM', type: 'texte', role: 'Nom affiché de l’app (sinon celui de app/app.js ou du réglage partagé)' },
  { cle: 'PORT', type: 'entier', defaut: '3000', role: 'Port HTTP du serveur' },
  { cle: 'DATABASE_URL', type: 'url', obligatoire: true, secret: true, role: 'Connexion PostgreSQL : postgres://utilisateur:motdepasse@hote:5432/base' },
  { cle: 'DB_CREER_BASE', type: 'booleen', defaut: '0', role: '1 : créer la base si elle n’existe pas (serveur à toi) ; 0 chez un hébergeur qui la fournit' },
  { cle: 'DB_SSL', type: 'booleen', defaut: '0', role: '1 : connexion chiffrée à la base (base distante : Supabase, Neon, Scaleway…)' },
  { cle: 'DB_SSL_STRICT', type: 'booleen', defaut: '1', role: '0 seulement pour un certificat auto-signé' },
  { cle: 'DB_POOL_MAX', type: 'entier', defaut: '10', role: 'Connexions simultanées à la base' },
  { cle: 'ADMIN_API_KEY', type: 'texte', secret: true, min: 32, obligatoireEnProduction: true, role: 'Clé d’admin de l’Atelier de Blocs (générée par l’Atelier, 32 caractères minimum) : l’Atelier gère l’app avec elle' },
  { cle: 'ADMIN_DEFAUT', type: 'booleen', defaut: '1', role: '1 : sur une base sans admin, crée le compte « admin » / « adminadmin », à changer à la première connexion ; 0 : assistant d’installation avec INSTALL_CODE' },
  { cle: 'INSTALL_CODE', type: 'texte', secret: true, min: 8, role: 'Code de première installation ; vide = un code est tiré au hasard et affiché dans les journaux du serveur' },
  { cle: 'SESSION_HEURES', type: 'entier', defaut: '12', role: 'Durée d’une session sans activité, en heures' },
  { cle: 'MDP_MIN', type: 'entier', defaut: '12', role: 'Longueur minimale des mots de passe' },
  { cle: 'INSCRIPTION_OUVERTE', type: 'booleen', defaut: '0', role: '1 : chacun peut créer son compte ; 0 : comptes créés par un admin' },
  { cle: 'ORIGINES', type: 'liste', role: 'Autres origines autorisées à appeler l’API (séparées par des virgules), en plus de APP_URL : https://…, capacitor://localhost (app mobile), null (aperçu de l’Atelier), * (toutes, ignoré en production)' },
  { cle: 'JETON_SECRET', type: 'texte', secret: true, min: 32, role: 'Signature des jetons de connexion (front séparé, app mobile) ; vide = tirée au hasard à chaque démarrage (reconnexion après un redémarrage). Obligatoire en production si l’app utilise les jetons' },
  { cle: 'JETON_MINUTES', type: 'entier', defaut: '15', role: 'Durée du jeton d’accès, en minutes (renouvelé avec le jeton de renouvellement)' },
  { cle: 'JETON_JOURS', type: 'entier', defaut: '30', role: 'Durée du jeton de renouvellement, en jours (rester connecté)' },
  { cle: 'REQUETES_PAR_MINUTE', type: 'entier', defaut: '300', role: 'Limite de requêtes par adresse IP et par minute' }
];

let declarees = NOYAU.slice();
let valeurs = null;   // cle → { valeur (typée), brute, source }
let erreurs = [];

/** Lit un fichier .env simple (CLE=valeur, # commentaires, guillemets facultatifs). Jamais en production. */
function lireFichierEnv(fichier) {
  const out = {};
  if (!fs.existsSync(fichier)) return out;
  for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const VRAI = /^(1|true|oui|vrai|on|yes)$/i, FAUX = /^(0|false|non|faux|off|no)$/i;
function convertir(d, brute) {
  switch (d.type) {
    case 'entier': if (!/^-?\d+$/.test(brute)) throw new Error('nombre entier attendu'); return parseInt(brute, 10);
    case 'booleen': if (VRAI.test(brute)) return true; if (FAUX.test(brute)) return false; throw new Error('1 ou 0 attendu');
    case 'url': try { const u = new URL(brute); if (!/^(https?|postgres(ql)?):$/.test(u.protocol)) throw new Error(); return brute.replace(/\/+$/, ''); } catch (e) { throw new Error('adresse invalide'); }
    case 'choix': if (!d.choix.includes(brute.toLowerCase())) throw new Error('valeurs possibles : ' + d.choix.join(', ')); return brute.toLowerCase();
    case 'liste': return brute.split(',').map(x => x.trim()).filter(Boolean);
    default: if (d.min && brute.length < d.min) throw new Error(`${d.min} caractères minimum`); return brute;
  }
}

/** Ajoute les variables propres à l'app (app/app.js → variables). */
function declarer(liste) {
  for (const d of liste || []) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(d.cle || '')) throw new Error(`Variable mal nommée : ${d.cle}`);
    if (declarees.some(x => x.cle === d.cle)) throw new Error(`Variable déclarée deux fois : ${d.cle}`);
    declarees.push(Object.assign({ type: 'texte', role: '' }, d, { app: true }));
  }
  valeurs = null;
}

/** Charge et vérifie toutes les variables. Renvoie la liste des erreurs (vide si tout va bien). */
function charger({ racine = path.join(__dirname, '..'), systeme = process.env } = {}) {
  const enProd = String(systeme.APP_ENV || '').toLowerCase() === 'production';
  const fichier = enProd ? {} : lireFichierEnv(path.join(racine, '.env'));
  valeurs = {}; erreurs = [];
  for (const d of declarees) {
    let brute, source;
    if (systeme[d.cle] !== undefined && systeme[d.cle] !== '') { brute = String(systeme[d.cle]); source = 'systeme'; }
    else if (fichier[d.cle] !== undefined && fichier[d.cle] !== '') { brute = fichier[d.cle]; source = '.env'; }
    else if (d.defaut !== undefined) { brute = String(d.defaut); source = 'defaut'; }
    if (brute === undefined) {
      if (d.obligatoire || (enProd && d.obligatoireEnProduction)) erreurs.push(`${d.cle} manquante : ${d.role}`);
      valeurs[d.cle] = { valeur: d.type === 'liste' ? [] : null, source: 'absente' };
      continue;
    }
    try { valeurs[d.cle] = { valeur: convertir(d, brute), source }; }
    catch (e) { erreurs.push(`${d.cle} invalide (${e.message})`); valeurs[d.cle] = { valeur: null, source: 'invalide' }; }
  }
  if (enProd && valeurs.APP_URL && valeurs.APP_URL.valeur && !/^https:/.test(valeurs.APP_URL.valeur)) erreurs.push('APP_URL doit être en https en production');
  return erreurs;
}

/** Valeur typée d'une variable déclarée. */
function get(cle) {
  if (!valeurs) charger();
  if (!declarees.some(d => d.cle === cle)) throw new Error(`Variable non déclarée : ${cle} (à déclarer dans app/app.js → variables)`);
  return valeurs[cle].valeur;
}

/** État pour l'admin : jamais de valeur secrète. */
function etat() {
  if (!valeurs) charger();
  return declarees.map(d => ({
    cle: d.cle, role: d.role, type: d.type, secret: !!d.secret, app: !!d.app,
    obligatoire: !!d.obligatoire || (!!d.obligatoireEnProduction && get('APP_ENV') === 'production'),
    source: valeurs[d.cle].source, definie: !['absente', 'invalide'].includes(valeurs[d.cle].source),
    valeur: d.secret ? null : (Array.isArray(valeurs[d.cle].valeur) ? valeurs[d.cle].valeur.join(', ') : valeurs[d.cle].valeur)
  }));
}

/** Contenu de .env.example : chaque variable, son rôle, sans valeur secrète. */
function exemple() {
  const lignes = ['# .env.example — généré par « node noyau/env.js --exemple ». Copier en .env (jamais livré) et remplir.',
    '# Secrètes : uniquement dans les variables de l’hébergeur en production.', ''];
  for (const d of declarees) {
    lignes.push(`# ${d.role}${d.obligatoire ? ' — OBLIGATOIRE' : d.obligatoireEnProduction ? ' — obligatoire en production' : ''}${d.secret ? ' — SECRÈTE' : ''}${d.choix ? ' — ' + d.choix.join(' | ') : ''}`);
    lignes.push(`${d.cle}=${d.secret || d.defaut === undefined ? '' : d.defaut}`, '');
  }
  return lignes.join('\n');
}

module.exports = { declarer, charger, get, etat, exemple, erreurs: () => erreurs.slice(), declarees: () => declarees.map(d => Object.assign({}, d)), NOYAU };

if (require.main === module) {
  try { declarer((require('../app/app.js').variables) || []); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  if (process.argv.includes('--exemple')) process.stdout.write(exemple() + '\n');
  else {
    const err = charger();
    etat().forEach(v => console.log(`  ${v.definie ? '✓' : v.obligatoire ? '✗' : '·'} ${v.cle.padEnd(22)} ${v.secret ? (v.definie ? '•••••• définie' : 'absente') : (v.valeur === null || v.valeur === '' ? 'absente' : v.valeur)}  (${v.source})`));
    console.log(err.length ? '\nConfiguration incomplète :\n- ' + err.join('\n- ') : '\nConfiguration complète.');
    process.exitCode = err.length ? 1 : 0;
  }
}
