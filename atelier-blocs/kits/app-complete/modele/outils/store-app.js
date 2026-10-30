/* outils/store-app.js — dossier de publication sur Google Play et l'App Store (OUTIL DE DÉVELOPPEMENT)
   Kit « App complète » de l'Atelier de Blocs. Node 18+, sans dépendance. KIT.md § 18.

   node outils/store-app.js              génère, à partir de store/store.json, de app/app.js et de public/univers.css :
                                           store/LISEZMOI.md, store/GOOGLE-PLAY.md, store/APP-STORE.md, store/PUBLIER.md
                                           public/confidentialite.html, support.html, suppression-compte.html, conditions.html, pages.css
   node outils/store-app.js --verifier   contrôle seulement (règles 27 à 30 de verifier-app.js), sans rien écrire
   node outils/store-app.js mon-app/     autre dossier

   Seul store/store.json se modifie à la main : tout le reste est régénéré (chaque fichier porte l'empreinte de ce
   qui l'a produit ; verifier-app.js signale un dossier qui n'est plus à jour). Les visuels : outils/store-visuels.js. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const VERSION_OUTIL = '1.4.0';
const LIMITES = { nom: 30, sousTitre: 30, descriptionCourte: 80, description: 4000, motsCles: 100, textePromo: 170, nouveautes: 500, notesRevue: 4000 };
const EULA_APPLE = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** Catégories : clé de store.json → [libellé Google Play, libellé App Store] (nom de la console, en anglais entre parenthèses). */
const CATEGORIES = {
  'productivite': ['Productivité (Productivity)', 'Productivité (Productivity)'],
  'entreprise': ['Entreprise (Business)', 'Économie et entreprise (Business)'],
  'finance': ['Finance (Finance)', 'Finance (Finance)'],
  'sante-forme': ['Santé et remise en forme (Health & Fitness)', 'Forme et santé (Health & Fitness)'],
  'medical': ['Médecine (Medical)', 'Médecine (Medical)'],
  'style-de-vie': ['Style de vie (Lifestyle)', 'Style de vie (Lifestyle)'],
  'education': ['Enseignement (Education)', 'Éducation (Education)'],
  'outils': ['Outils (Tools)', 'Utilitaires (Utilities)'],
  'cuisine': ['Cuisine et boissons (Food & Drink)', 'Cuisine et boissons (Food & Drink)'],
  'shopping': ['Shopping (Shopping)', 'Shopping (Shopping)'],
  'social': ['Réseaux sociaux (Social)', 'Réseaux sociaux (Social Networking)'],
  'communication': ['Communication (Communication)', 'Réseaux sociaux (Social Networking)'],
  'voyage': ['Voyages et infos locales (Travel & Local)', 'Voyages (Travel)'],
  'sport': ['Sport (Sports)', 'Sports (Sports)'],
  'divertissement': ['Divertissement (Entertainment)', 'Divertissement (Entertainment)'],
  'actualites': ['Actualités et magazines (News & Magazines)', 'Actualités (News)'],
  'photo': ['Photographie (Photography)', 'Photo et vidéo (Photo & Video)'],
  'musique': ['Musique et audio (Music & Audio)', 'Musique (Music)'],
  'navigation': ['Plans et navigation (Maps & Navigation)', 'Navigation (Navigation)'],
  'livres': ['Livres et références (Books & Reference)', 'Livres (Books)'],
  'reference': ['Livres et références (Books & Reference)', 'Référence (Reference)'],
  'meteo': ['Météo (Weather)', 'Météo (Weather)'],
  'maison': ['Maison et habitat (House & Home)', 'Style de vie (Lifestyle)'],
  'parents': ['Parentalité (Parenting)', 'Style de vie (Lifestyle)'],
  'auto': ['Auto et véhicules (Auto & Vehicles)', 'Utilitaires (Utilities)'],
  'beaute': ['Beauté (Beauty)', 'Style de vie (Lifestyle)'],
  'evenements': ['Événements (Events)', 'Style de vie (Lifestyle)'],
  'art-design': ['Art et design (Art & Design)', 'Graphisme et design (Graphics & Design)']
};

/** Types de données : clé de store.json → libellé, [catégorie, type] de « Sécurité des données » (Play), [catégorie, type] de « Confidentialité de l'app » (Apple). */
const DONNEES = {
  nom: ['Nom', ['Informations personnelles', 'Nom'], ['Coordonnées', 'Nom']],
  email: ['Adresse e-mail', ['Informations personnelles', 'Adresse e-mail'], ['Coordonnées', 'Adresse e-mail']],
  telephone: ['Numéro de téléphone', ['Informations personnelles', 'Numéro de téléphone'], ['Coordonnées', 'Numéro de téléphone']],
  adresse: ['Adresse postale', ['Informations personnelles', 'Adresse'], ['Coordonnées', 'Adresse physique']],
  identifiant: ['Identifiant du compte', ['Informations personnelles', 'ID utilisateur'], ['Identifiants', 'ID utilisateur']],
  infosPerso: ['Autres informations personnelles', ['Informations personnelles', 'Autres informations'], ['Coordonnées', 'Autres coordonnées']],
  sensibles: ['Informations sensibles (origine, opinions, religion, orientation…)', ['Informations personnelles', 'Origine ethnique et raciale, opinions politiques ou religieuses, orientation sexuelle (selon le cas)'], ['Informations sensibles', 'Informations sensibles']],
  finances: ['Informations financières (montants, budgets, revenus…)', ['Informations financières', 'Autres informations financières'], ['Informations financières', 'Autres informations financières']],
  paiement: ['Moyen de paiement', ['Informations financières', 'Informations de paiement de l’utilisateur'], ['Informations financières', 'Informations de paiement']],
  achats: ['Historique des achats et abonnements', ['Informations financières', 'Historique des achats'], ['Achats', 'Historique d’achat']],
  sante: ['Informations de santé', ['Santé et remise en forme', 'Informations de santé'], ['Santé et forme', 'Santé']],
  forme: ['Activité physique', ['Santé et remise en forme', 'Informations sur la remise en forme'], ['Santé et forme', 'Forme physique']],
  messages: ['Messages', ['Messages', 'Autres messages dans l’appli'], ['Contenu utilisateur', 'E-mails ou messages texte']],
  photos: ['Photos', ['Photos et vidéos', 'Photos'], ['Contenu utilisateur', 'Photos ou vidéos']],
  videos: ['Vidéos', ['Photos et vidéos', 'Vidéos'], ['Contenu utilisateur', 'Photos ou vidéos']],
  audio: ['Enregistrements audio', ['Fichiers audio', 'Enregistrements vocaux ou audio'], ['Contenu utilisateur', 'Données audio']],
  fichiers: ['Fichiers et documents', ['Fichiers et documents', 'Fichiers et documents'], ['Contenu utilisateur', 'Autre contenu utilisateur']],
  agenda: ['Agenda', ['Agenda', 'Événements d’agenda'], ['Autres données', 'Autres types de données']],
  contacts: ['Contacts du téléphone', ['Contacts', 'Contacts'], ['Contacts', 'Contacts']],
  contenu: ['Contenus saisis dans l’app', ['Activité dans les applis', 'Autre contenu généré par l’utilisateur'], ['Contenu utilisateur', 'Autre contenu utilisateur']],
  recherches: ['Recherches dans l’app', ['Activité dans les applis', 'Historique des recherches dans l’appli'], ['Historique de recherche', 'Historique de recherche']],
  interactions: ['Utilisation de l’app (écrans ouverts, actions)', ['Activité dans les applis', 'Interactions avec l’appli'], ['Données d’utilisation', 'Interaction avec le produit']],
  positionPrecise: ['Position précise', ['Position', 'Position exacte'], ['Localisation', 'Localisation précise']],
  positionApprox: ['Position approximative', ['Position', 'Position approximative'], ['Localisation', 'Localisation approximative']],
  plantages: ['Rapports de plantage', ['Infos et performances de l’appli', 'Journaux de plantage'], ['Diagnostics', 'Données de plantage']],
  performances: ['Mesures de performance', ['Infos et performances de l’appli', 'Diagnostics'], ['Diagnostics', 'Données de performance']],
  idAppareil: ['Identifiant de l’appareil (publicité)', ['Appareil ou autres identifiants', 'Appareil ou autres identifiants'], ['Identifiants', 'Identifiant de l’appareil']],
  pubDonnees: ['Données publicitaires', null, ['Données d’utilisation', 'Données publicitaires']]
};
/** Finalités : clé → [Play, Apple, texte de la politique de confidentialité]. */
const FINALITES = {
  fonctionnement: ['Fonctionnalités de l’appli', 'Fonctionnalité de l’app', 'faire fonctionner l’app'],
  compte: ['Gestion du compte', 'Fonctionnalité de l’app', 'gérer votre compte'],
  securite: ['Prévention des fraudes, sécurité et conformité', 'Fonctionnalité de l’app', 'protéger l’app et votre compte'],
  analyse: ['Analyse', 'Analyses', 'mesurer l’usage de l’app pour l’améliorer'],
  communications: ['Communications du développeur', 'Marketing du développeur', 'vous écrire au sujet de l’app'],
  personnalisation: ['Personnalisation', 'Personnalisation du produit', 'adapter l’app à votre usage'],
  publicite: ['Publicité ou marketing', 'Publicité de tiers', 'afficher de la publicité']
};
/** Contenu de l'app : clé → [question, Apple (questionnaire), Google Play (questionnaire IARC)]. */
const CONTENU = {
  violence: ['Violence (dessinée, réaliste ou suggérée)', 'Violence de dessin animé ou fantastique / Violence réaliste', 'Violence'],
  peur: ['Thèmes d’horreur ou qui font peur', 'Thèmes d’horreur ou de peur', 'Éléments qui font peur'],
  sexe: ['Nudité, sexualité ou thèmes suggestifs', 'Contenu sexuel ou nudité / Thèmes suggestifs', 'Sexualité'],
  langage: ['Grossièretés ou humour cru', 'Grossièretés ou humour cru', 'Langage'],
  drogues: ['Alcool, tabac ou drogues', 'Consommation ou références à l’alcool, au tabac ou aux drogues', 'Substances réglementées'],
  jeuxArgent: ['Jeux d’argent (simulés ou réels), loot boxes', 'Jeux de hasard simulés / Jeux d’argent / Concours', 'Jeux d’argent et de hasard'],
  medical: ['Informations médicales ou de traitement', 'Informations médicales ou thérapeutiques', 'Informations médicales (déclaration « Applis de santé »)'],
  contenusPartages: ['Contenus publiés par les utilisateurs et visibles par d’autres', 'Contenu généré par l’utilisateur', 'Les utilisateurs peuvent interagir ou échanger du contenu'],
  messagerie: ['Messagerie ou discussion entre utilisateurs', 'Messagerie et chat', 'Les utilisateurs peuvent interagir ou échanger du contenu'],
  positionPartagee: ['Partage de sa position avec d’autres utilisateurs', '— (pas de question)', 'Partage de la position avec d’autres utilisateurs'],
  navigateurWeb: ['Navigation libre sur le Web dans l’app', 'Accès Web non restreint', 'Accès non restreint à Internet']
};
const AGES = { 'tous': 'tout public, enfants compris', '13+': '13 ans et plus', '16+': '16 ans et plus', '18+': '18 ans et plus' };
const TRANCHES_PLAY = { 'tous': ['5 ans et moins', '6 à 8 ans', '9 à 12 ans', '13 à 15 ans', '16 et 17 ans', '18 ans et plus'], '13+': ['13 à 15 ans', '16 et 17 ans', '18 ans et plus'], '16+': ['16 et 17 ans', '18 ans et plus'], '18+': ['18 ans et plus'] };

/* ======================= Lecture ======================= */

function charger(racine) {
  const lire = r => { try { return fs.readFileSync(path.join(racine, r), 'utf8'); } catch (e) { return null; } };
  const ctx = { racine, lire, erreur: '' };
  const brut = lire('store/store.json');
  if (brut === null) ctx.erreur = 'store/store.json absent (copie celui du kit et remplis-le, KIT.md § 18)';
  else try { ctx.fiche = JSON.parse(brut); } catch (e) { ctx.erreur = 'store/store.json illisible : ' + e.message; }
  ctx.fiche = ctx.fiche || {};
  const avant = Object.assign({}, process.env);
  try { delete require.cache[path.join(racine, 'app/app.js')]; ctx.app = require(path.join(racine, 'app/app.js')); } catch (e) { ctx.app = {}; }
  Object.keys(process.env).forEach(k => { if (!(k in avant)) delete process.env[k]; });
  try { ctx.pkg = JSON.parse(lire('package.json')); } catch (e) { ctx.pkg = {}; }
  const univers = lire('public/univers.css') || '';
  const jeton = n => { const m = new RegExp('--' + n + '\\s*:\\s*([^;]+);').exec(univers); return m ? m[1].trim() : ''; };
  ctx.couleurs = { primaire: jeton('primaire') || '#36568C', surPrimaire: jeton('sur-primaire') || '#FFFFFF', fond: jeton('fond') || '#F5F7FB', accent: jeton('accent') || '#2E778A', teinte: jeton('teinte') || '#E4F5F9', texte: jeton('texte') || '#1A212E' };
  ctx.d = deduire(ctx);
  return ctx;
}

/** Tout ce que l'outil déduit de la fiche et de l'app (offre, pub, données du socle, adresses). */
function deduire(ctx) {
  const f = ctx.fiche, app = ctx.app || {};
  const paliers = (app.offre && app.offre.paliers) || [{ id: 'gratuit', libelle: 'Gratuit' }];
  const payants = paliers.filter(p => p.prix && (p.prix.mois || p.prix.an));
  const admob = !!(f.pub && f.pub.admob), pubPerso = admob && !!f.pub.personnalisee;
  const base = String((f.urls && f.urls.app) || '').replace(/\/+$/, '');
  const urls = { app: base, confidentialite: base + '/confidentialite.html', support: base + '/support.html', suppression: base + '/suppression-compte.html', conditions: base + '/conditions.html', marketing: (f.urls && f.urls.marketing) || '' };
  // Données : celles du socle (compte, achats, publicité) puis celles de l'app, fusionnées par type
  const liste = [
    { type: 'email', pourquoi: 'la connexion à votre compte', finalites: ['compte'], facultatif: false, socle: true, conservation: 'jusqu’à la suppression du compte' },
    { type: 'nom', pourquoi: 'le nom affiché de votre compte', finalites: ['compte'], facultatif: true, socle: true, conservation: 'jusqu’à la suppression du compte' },
    { type: 'identifiant', pourquoi: 'relier vos données à votre compte', finalites: ['compte'], facultatif: false, socle: true, conservation: 'jusqu’à la suppression du compte' }
  ];
  if (payants.length) liste.push({ type: 'achats', pourquoi: 'votre abonnement (offre, dates, renouvellement)', finalites: ['fonctionnement'], facultatif: true, socle: true, conservation: 'jusqu’à la suppression du compte' });
  if (admob) {
    liste.push({ type: 'idAppareil', pourquoi: 'l’affichage de la publicité par Google AdMob', finalites: ['publicite'], facultatif: false, socle: true, partage: ['Google AdMob'], conservation: 'selon les règles de Google' });
    liste.push({ type: 'pubDonnees', pourquoi: 'la publicité affichée et vos interactions avec elle', finalites: ['publicite'], facultatif: false, socle: true, partage: ['Google AdMob'], conservation: 'selon les règles de Google' });
  }
  const brutes = liste.concat((Array.isArray(f.donnees) ? f.donnees : []).filter(x => DONNEES[x.type]).map(x => Object.assign({ finalites: [] }, x, { app: true })));
  const donnees = [];
  for (const x of liste.concat((Array.isArray(f.donnees) ? f.donnees : []).map(x => Object.assign({}, x, { app: true })))) {
    const deja = donnees.find(y => y.type === x.type);
    if (!deja) { donnees.push(Object.assign({ finalites: [], partage: [] }, x)); continue; }
    deja.finalites = [...new Set(deja.finalites.concat(x.finalites || []))];
    deja.partage = [...new Set((deja.partage || []).concat(x.partage || []))];
    deja.pourquoi = deja.socle && x.app ? `${deja.pourquoi} ; ${x.pourquoi}` : deja.pourquoi;
    deja.facultatif = deja.facultatif && x.facultatif !== false;
    if (x.app && x.conservation) deja.conservation = x.conservation;
    deja.app = deja.app || x.app;
  }
  const tiers = [].concat(f.soustraitants || []);
  if (payants.length) tiers.push({ nom: 'Stripe', role: 'paiement des abonnements sur le site (vos données bancaires ne passent jamais par nos serveurs)', pays: 'Irlande (Union européenne)' },
    { nom: 'Apple et Google', role: 'paiement des abonnements pris dans l’app mobile', pays: 'selon le store' },
    { nom: 'RevenueCat', role: 'suivi des abonnements pris dans l’app mobile (identifiant du compte, achats)', pays: 'États-Unis (clauses contractuelles types)' });
  if (admob) tiers.push({ nom: 'Google AdMob', role: 'publicité dans l’app mobile (identifiant publicitaire de l’appareil)', pays: 'États-Unis (Data Privacy Framework)' });
  const age = (f.public && f.public.age) || '18+';
  return { paliers, payants, pubWeb: paliers.some(p => p.pub), admob, pubPerso, urls, donnees, brutes, tiers, age, enfants: age === 'tous' || !!(f.public && f.public.enfants),
    ipad: f.appareils !== 'iphone', nomApp: f.nom || app.nom || 'Mon app', version: app.version || ctx.pkg.version || '1.0.0',
    sante: donnees.some(x => ['sante', 'forme'].includes(x.type)) || !!(f.contenu && f.contenu.medical) || ['medical', 'sante-forme'].includes(f.categorie),
    finance: f.categorie === 'finance', journalMois: Number(f.journalMois) || 12 };
}

/** Empreinte de tout ce qui produit le dossier : un fichier généré dont l'empreinte diffère n'est plus à jour. */
function empreinte(ctx) {
  const a = ctx.app || {};
  const source = JSON.stringify({ f: ctx.fiche, a: { nom: a.nom, version: a.version, offre: a.offre, rgpd: a.rgpd, roles: a.roles }, c: ctx.couleurs, v: VERSION_OUTIL });
  return crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
}

/* ======================= Contrôles (règles 27 à 30) ======================= */

const longueur = s => [...String(s || '')].length;
const vide = s => !String(s == null ? '' : s).trim();
const aRemplir = v => JSON.stringify(v).includes('⟦');
const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));
const motsClesTexte = f => (Array.isArray(f.motsCles) ? f.motsCles.map(m => String(m).trim()).filter(Boolean).join(',') : String(f.motsCles || ''));
function placeholders(objet, chemin, out) {
  if (typeof objet === 'string') { if (objet.includes('⟦')) out.push(chemin); return out; }
  if (objet && typeof objet === 'object') for (const [k, v] of Object.entries(objet)) if (!k.startsWith('$')) placeholders(v, chemin ? `${chemin}.${k}` : k, out);
  return out;
}

/** Liste des problèmes : { regle, niveau: 'crit' | 'warn', texte }. crit = la règle échoue. */
function controler(ctx) {
  const p = [], f = ctx.fiche, d = ctx.d;
  const ajouter = (regle, niveau, texte) => p.push({ regle, niveau, texte });
  if (ctx.erreur) { ajouter('27', 'crit', ctx.erreur); return p; }
  /* 27 — Fiche complète et dans les limites des stores */
  const obligatoires = { nom: f.nom, sousTitre: f.sousTitre, descriptionCourte: f.descriptionCourte, description: f.description, categorie: f.categorie,
    'editeur.nom': f.editeur && f.editeur.nom, 'editeur.email': f.editeur && f.editeur.email, 'urls.app': f.urls && f.urls.app, identifiant: f.identifiant, 'public.age': f.public && f.public.age };
  const manquants = Object.keys(obligatoires).filter(k => vide(obligatoires[k]));
  if (manquants.length) ajouter('27', 'crit', 'à remplir : ' + manquants.join(', '));
  const trous = placeholders(f, '', []);
  if (trous.length) ajouter('30', 'warn', 'à remplir avant de publier, encore des ⟦…⟧ : ' + trous.slice(0, 6).join(', ') + (trous.length > 6 ? ` … (+${trous.length - 6})` : ''));
  for (const [k, max] of Object.entries({ nom: LIMITES.nom, sousTitre: LIMITES.sousTitre, descriptionCourte: LIMITES.descriptionCourte, description: LIMITES.description, textePromo: LIMITES.textePromo, nouveautes: LIMITES.nouveautes }))
    if (longueur(f[k]) > max) ajouter('27', 'crit', `${k} : ${longueur(f[k])} caractères pour ${max} au maximum`);
  const mc = motsClesTexte(f);
  if (!mc) ajouter('27', 'crit', 'motsCles : au moins un mot-clé (App Store)');
  else if (Buffer.byteLength(mc) > LIMITES.motsCles) ajouter('27', 'crit', `motsCles : ${Buffer.byteLength(mc)} octets séparés par des virgules pour 100 au maximum (App Store)`);
  if (f.categorie && !CATEGORIES[f.categorie]) ajouter('27', 'crit', `categorie « ${f.categorie} » inconnue (au choix : ${Object.keys(CATEGORIES).join(', ')})`);
  if (f.categorie2 && !CATEGORIES[f.categorie2]) ajouter('27', 'crit', `categorie2 « ${f.categorie2} » inconnue`);
  if (f.identifiant && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(f.identifiant)) ajouter('27', 'crit', 'identifiant : domaine inversé en minuscules, 3 parties au moins, sans tiret (ex. fr.techview.monapp) ; le même que dans l’Atelier › App mobile');
  if (f.editeur && !vide(f.editeur.email) && !aRemplir(f.editeur.email) && !emailOk(f.editeur.email)) ajouter('27', 'crit', 'editeur.email : adresse invalide');
  if (f.urls && !vide(f.urls.app) && !aRemplir(f.urls.app) && !/^https:\/\/[^/\s]+/.test(f.urls.app)) ajouter('27', 'crit', 'urls.app : l’adresse en ligne de l’app, en https:// (les stores exigent des pages publiques en https)');
  if (f.public && f.public.age && !AGES[f.public.age]) ajouter('27', 'crit', `public.age : ${Object.keys(AGES).join(', ')}`);
  if (f.appareils && !['iphone', 'iphone-ipad'].includes(f.appareils)) ajouter('27', 'crit', 'appareils : iphone ou iphone-ipad');
  if (f.nom && /gratuit|free|meilleur|best|n°\s?1|#1|\btop\b|promo|soldes|nouveau/i.test(f.nom)) ajouter('27', 'warn', 'nom : Google Play refuse « gratuit », « meilleur », « n° 1 », « promo »… dans le nom');
  if (/\p{Extended_Pictographic}/u.test((f.nom || '') + (f.sousTitre || ''))) ajouter('27', 'warn', 'nom ou sous-titre : pas d’émoji (refusé par Google Play)');
  if (f.nom && f.nom === f.nom.toUpperCase() && /[A-Z]{4}/.test(f.nom)) ajouter('27', 'warn', 'nom tout en majuscules : refusé par Google Play (sauf marque déposée)');
  if (/android|google play/i.test(f.description || '') || /iphone|ipad|app store|apple/i.test(f.description || '')) ajouter('27', 'warn', 'description : ne cite ni Android / Google Play (refus Apple 2.3.10) ni iPhone / App Store (même texte sur les deux stores)');
  if (f.description && longueur(f.description) < 300) ajouter('27', 'warn', 'description courte pour une fiche complète (300 caractères au moins conseillés)');
  if (mc && f.nom && mc.toLowerCase().split(',').some(m => m.trim() === f.nom.toLowerCase())) ajouter('27', 'warn', 'motsCles : inutile de répéter le nom de l’app (Apple le prend déjà en compte)');
  if (!f.revue || vide(f.revue.compteDemo)) ajouter('27', 'crit', 'revue.compteDemo : l’identifiant du compte de démonstration pour les équipes de revue (toute l’app demande un compte)');
  if (f.revue && longueur(f.revue.notes) > LIMITES.notesRevue) ajouter('27', 'crit', `revue.notes : ${LIMITES.notesRevue} caractères au maximum`);

  /* 28 — Déclarations cohérentes avec l'app (contenu, données, publicité, achats, captures) */
  const c = f.contenu || {};
  const nonRepondues = Object.keys(CONTENU).filter(k => typeof c[k] !== 'boolean');
  if (nonRepondues.length) ajouter('28', 'crit', 'contenu : réponds true ou false à ' + nonRepondues.join(', ') + ' (questionnaires de classification)');
  const inconnus = (Array.isArray(f.donnees) ? f.donnees : []).filter(x => !DONNEES[x.type] || x.type === 'pubDonnees');
  if (inconnus.length) ajouter('28', 'crit', `donnees : type inconnu ${inconnus.map(x => x.type).join(', ')} (au choix : ${Object.keys(DONNEES).filter(k => k !== 'pubDonnees').join(', ')})`);
  const sansFin = (Array.isArray(f.donnees) ? f.donnees : []).filter(x => !Array.isArray(x.finalites) || !x.finalites.length || x.finalites.some(y => !FINALITES[y]));
  if (sansFin.length) ajouter('28', 'crit', `donnees : finalités absentes ou inconnues pour ${sansFin.map(x => x.type).join(', ')} (au choix : ${Object.keys(FINALITES).join(', ')})`);
  const sansPourquoi = (Array.isArray(f.donnees) ? f.donnees : []).filter(x => vide(x.pourquoi));
  if (sansPourquoi.length) ajouter('28', 'crit', `donnees : « pourquoi » manquant pour ${sansPourquoi.map(x => x.type).join(', ')} (repris dans la politique de confidentialité)`);
  const rgpd = (ctx.app && ctx.app.rgpd) || [];
  if (rgpd.length && !(Array.isArray(f.donnees) && f.donnees.length)) ajouter('28', 'crit', `donnees : app/app.js → rgpd déclare des données personnelles (${rgpd.map(r => r.table).join(', ')}) mais store.json n’en déclare aucune`);
  // La suppression du compte (socle) efface les lignes de rgpd puis l'utilisateur : un autre lien vers utilisateurs la bloquerait
  const bloquants = [];
  let migrations = [];
  try { migrations = fs.readdirSync(path.join(ctx.racine, 'db/migrations')).filter(n => n.endsWith('.sql')).sort(); } catch (e) { /* règle 14 */ }
  for (const n of migrations) {
    let table = '';
    for (const l of (ctx.lire('db/migrations/' + n) || '').replace(/--.*$/gm, '').split('\n')) {
      const t = /create table (?:if not exists )?"?(\w+)"?/i.exec(l); if (t) table = t[1];
      const a = /alter table (?:only )?"?(\w+)"?/i.exec(l); if (a) table = a[1];
      const r = /"?(\w+)"?\s+uuid\b[^,]*references\s+utilisateurs\s*\(\s*id\s*\)(?![^,]*on delete (cascade|set null))/i.exec(l);
      if (r && !rgpd.some(x => x.table === table && x.colonne === r[1] && x.action === 'supprimer')) bloquants.push(`${table}.${r[1]}`);
    }
  }
  if (bloquants.length) ajouter('28', 'crit', `suppression du compte impossible : ${bloquants.join(', ')} pointe vers utilisateurs sans « on delete cascade / set null » ni règle rgpd « supprimer »`);
  if (d.pubWeb && !(f.pub && typeof f.pub.admob === 'boolean')) ajouter('28', 'crit', 'pub.admob : true si l’app mobile affichera AdMob (ADMOB_BANNIERE_*), false sinon (déclaration « Annonces » et sécurité des données)');
  if (d.pubPerso) ajouter('28', 'warn', 'pub.personnalisee : des annonces personnalisées sur iPhone demandent l’autorisation de suivi (App Tracking Transparency), que le socle n’affiche pas : garde false (annonces non personnalisées) ou ajoute ATT');
  if (d.enfants) ajouter('28', 'warn', 'public : une app pour les enfants suit le programme « Familles » de Google et la catégorie Enfants d’Apple (pas de pub personnalisée, règles strictes) : à valider avant de publier');
  const cap = f.captures || {};
  const ecrans = Array.isArray(cap.ecrans) ? cap.ecrans : [];
  if (ecrans.length < 2) ajouter('28', 'crit', 'captures.ecrans : 2 écrans au moins (Google Play en exige 2, l’App Store 1), 8 au plus');
  if (ecrans.length > 8) ajouter('28', 'crit', 'captures.ecrans : 8 au plus (limite de Google Play)');
  if (ecrans.some(e => !/^#\//.test(e.route || ''))) ajouter('28', 'crit', 'captures.ecrans : chaque écran a une route « #/… »');
  if (ecrans.some(e => longueur(e.legende) > 60)) ajouter('28', 'warn', 'captures.ecrans : légendes de 60 caractères au plus (lisibles sur la capture)');
  if (d.payants.length && !ecrans.some(e => /^#\/abonnement/.test(e.route || ''))) ajouter('28', 'warn', 'captures.ecrans : ajoute #/abonnement, Apple demande une capture de l’écran d’achat pour chaque abonnement');
  if (d.sante) ajouter('28', 'warn', 'données de santé : remplis aussi la déclaration « Applis de santé » de Google Play, et vérifie que l’app ne fait pas de diagnostic (règle 1.4.1 d’Apple)');

  /* 29 — Dossier et pages publiques à jour */
  const e = empreinte(ctx);
  const perimes = GENERES.filter(r => { const t = ctx.lire(r); return t === null || !t.includes('store-empreinte: ' + e); });
  if (perimes.length) ajouter('29', 'crit', 'à générer ou plus à jour : ' + perimes.slice(0, 5).join(', ') + (perimes.length > 5 ? ` … (+${perimes.length - 5})` : '') + ' — lance « node outils/store-app.js »');

  /* 30 — Prêt à publier (recommandé) : plus de ⟦…⟧ (ci-dessus), visuels aux tailles des stores (outils/store-visuels.js) */
  const vis = controlerVisuels(ctx);
  if (vis.length) ajouter('30', 'warn', vis.join(' ; '));
  return p;
}

/** Tailles attendues : [chemin, largeur, hauteur, sans transparence]. Les captures : 2 au moins par dossier. */
function visuelsAttendus(ctx) {
  const v = [['store/visuels/google-play/icone-512.png', 512, 512, false], ['store/visuels/google-play/banniere-1024x500.png', 1024, 500, true], ['store/visuels/app-store/icone-1024.png', 1024, 1024, true]];
  const dossiers = [['store/visuels/google-play/telephone', 1080, 1920], ['store/visuels/app-store/iphone-6.9', 1320, 2868]];
  if (ctx.d.ipad) dossiers.push(['store/visuels/app-store/ipad-13', 2064, 2752], ['store/visuels/google-play/tablette-10', 1600, 2560]);
  return { fichiers: v, dossiers };
}
/** Largeur, hauteur et type de couleur d'un PNG (en-tête IHDR). */
function taillePng(fichier) {
  try {
    const b = fs.readFileSync(fichier);
    if (b.readUInt32BE(0) !== 0x89504e47) return null;
    return { l: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: [4, 6].includes(b[25]) };
  } catch (e) { return null; }
}
function controlerVisuels(ctx) {
  const ko = [], { fichiers, dossiers } = visuelsAttendus(ctx);
  const nb = (ctx.fiche.captures && Array.isArray(ctx.fiche.captures.ecrans) ? ctx.fiche.captures.ecrans.length : 2);
  for (const [r, l, h, opaque] of fichiers) {
    const t = taillePng(path.join(ctx.racine, r));
    if (!t) ko.push(`${r} absent`);
    else if (t.l !== l || t.h !== h) ko.push(`${r} : ${t.l} × ${t.h} au lieu de ${l} × ${h}`);
    else if (opaque && t.alpha) ko.push(`${r} : sans transparence attendue`);
  }
  for (const [d, l, h] of dossiers) {
    let noms = [];
    try { noms = fs.readdirSync(path.join(ctx.racine, d)).filter(n => /\.png$/.test(n)); } catch (e) { /* absent */ }
    if (noms.length < Math.min(2, nb)) { ko.push(`${d}/ : ${noms.length} capture(s)`); continue; }
    const mauvaises = noms.filter(n => { const t = taillePng(path.join(ctx.racine, d, n)); return !t || t.l !== l || t.h !== h || t.alpha; });
    if (mauvaises.length) ko.push(`${d}/ : ${mauvaises.join(', ')} pas en ${l} × ${h} sans transparence`);
  }
  return ko.length ? [ko.length > 3 ? `${ko.slice(0, 3).join(' ; ')} … (+${ko.length - 3})` : ko.join(' ; '), 'lance « node outils/store-visuels.js postgres://…/postgres »'] : [];
}

/* ======================= Génération ======================= */

const GENERES = ['store/LISEZMOI.md', 'store/GOOGLE-PLAY.md', 'store/APP-STORE.md', 'store/PUBLIER.md',
  'public/confidentialite.html', 'public/support.html', 'public/suppression-compte.html', 'public/conditions.html', 'public/pages.css'];

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bloc = t => '```text\n' + String(t == null ? '' : t) + '\n```';
const compte = (t, max) => `${longueur(t)} / ${max} caractères`;
const euros = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €';
const oui = b => b ? '**Oui**' : 'Non';
const auj = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Description pour l'App Store : avec un abonnement, les liens vers les conditions et la confidentialité (règle 3.1.2). */
function descriptionApple(ctx) {
  const f = ctx.fiche, d = ctx.d;
  if (!d.payants.length) return f.description || '';
  const ajout = `\n\nAbonnement ${d.payants.map(p => p.libelle).join(' / ')} : renouvelé automatiquement, résiliable à tout moment dans les réglages de votre compte Apple.\nConditions d’utilisation : ${EULA_APPLE}\nConfidentialité : ${d.urls.confidentialite}`;
  return (f.description || '') + ajout;
}

function abonnementsTableau(ctx, store) {
  const d = ctx.d, id = ctx.fiche.identifiant || 'fr.techview.app';
  const lignes = [];
  for (const p of d.payants) for (const [per, lib] of [['mois', 'mensuel'], ['an', 'annuel']]) {
    if (!p.prix[per]) continue;
    const produit = store === 'apple' ? `${id}.${p.id}.${lib}` : `${p.id}_${lib}`;
    lignes.push(`| ${p.libelle} ${lib} | \`${produit}\` | ${euros(p.prix[per])} TTC / ${per === 'an' ? 'an' : 'mois'} | ${p.essaiJours ? p.essaiJours + ' jours offerts' : '—'} | \`${p.id}\` |`);
  }
  return `| Abonnement | Identifiant du produit | Prix | Essai gratuit | Droit RevenueCat (entitlement) |\n| --- | --- | --- | --- | --- |\n${lignes.join('\n')}`;
}

function docGoogle(ctx, e) {
  const f = ctx.fiche, d = ctx.d, c = f.contenu || {}, cat = CATEGORIES[f.categorie] || ['?', '?'], ed = f.editeur || {}, r = f.revue || {};
  const declarees = d.donnees.filter(x => DONNEES[x.type] && DONNEES[x.type][1]);
  return `<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: ${e} -->
# ${d.nomApp} sur Google Play — tout ce qu'il faut saisir

Dans l'ordre de la **Play Console** (play.google.com/console). Chaque texte est prêt à copier.
Identifiant de l'app (nom du paquet) : \`${f.identifiant}\` — le même que dans l'Atelier › App mobile, il ne change plus une fois publié.

## 1. Créer l'application

| Champ | Réponse |
| --- | --- |
| Nom de l'application | ${f.nom} |
| Langue par défaut | Français (France) – fr-FR |
| Application ou jeu | Application |
| Application gratuite ou payante | Gratuite${d.payants.length ? ' (les abonnements se vendent dans l\'app)' : ''} |
| Déclarations | Coche le règlement du programme pour les développeurs et les lois d'exportation des États-Unis |

## 2. Configurer votre application (Tableau de bord › « Configurer votre application »)

### Règles de confidentialité
URL :
${bloc(d.urls.confidentialite)}

### Accès à l'application
« **Toutes ou certaines fonctionnalités sont soumises à des restrictions** » › Ajouter des instructions :

| Champ | Réponse |
| --- | --- |
| Nom des instructions | Compte de démonstration |
| Nom d'utilisateur, adresse e-mail ou numéro de téléphone | \`${r.compteDemo || ''}\` |
| Mot de passe | celui du compte de démo (saisis-le dans la console, **jamais dans ce dossier**) |
| Autres informations | le texte ci-dessous |

${bloc((r.notes || '') + '\n\nLa suppression du compte se trouve dans Compte › Supprimer mon compte.')}

Le compte de démo doit exister **dans l'app en ligne**, avec des données d'exemple, et ne pas expirer.

### Annonces
« Votre application contient-elle des annonces ? » : ${d.admob ? '**Oui** (bannière Google AdMob dans l\'app mobile)' : `Non${d.pubWeb ? ' — le bandeau maison du socle ne fait que proposer l\'offre payante de l\'app ; si tu ajoutes AdMob (pub.admob), réponds Oui' : ''}`}

### Classification du contenu
Adresse e-mail : \`${ed.email || ''}\` · Catégorie : « **Toutes les autres types d'applications** » (utilitaire, productivité, communication…)${f.categorie === 'social' || f.categorie === 'communication' ? ' — ou « Réseaux sociaux » si l\'app en est un' : ''}.

| Question (questionnaire IARC) | Réponse |
| --- | --- |
${[...new Set(Object.keys(CONTENU).filter(k => k !== 'medical').map(k => CONTENU[k][2]))].map(q => `| ${q} | ${oui(Object.keys(CONTENU).some(k => CONTENU[k][2] === q && c[k]))} |`).join('\n')}
| Achats numériques | ${oui(d.payants.length)} |

Résultat attendu : ${Object.keys(CONTENU).every(k => !c[k]) ? '**PEGI 3** (tout public)' : 'calculé par le questionnaire selon les réponses « Oui »'}.

### Public cible et contenu
Tranches d'âge à cocher : **${(TRANCHES_PLAY[d.age] || TRANCHES_PLAY['18+']).join(', ')}**.
${d.enfants ? '⚠️ Des tranches de moins de 13 ans font entrer l\'app dans le programme **Familles** : règles strictes (pas de pub personnalisée, SDK certifiés).' : '« L\'application peut-elle attirer involontairement des enfants ? » : Non (rien dans l\'app ne vise les enfants).'}

### Applications d'actualités · Applications gouvernementales · COVID-19
Non · Non · Non (« Mon application n'est pas une application de santé publique COVID-19 »).

### Fonctionnalités financières
${d.finance ? '⚠️ App de catégorie Finance : choisis ce qui correspond (souvent « Aucune » si l\'app ne fait que suivre des dépenses, sans prêt, paiement ni crypto).' : '« Mon application ne propose aucune fonctionnalité financière ».'}

### Applications de santé
${d.sante ? '⚠️ À remplir : coche les fonctionnalités de santé réelles de l\'app (suivi, bien-être, médical…).' : '« Mon application n\'a pas de fonctionnalités de santé ».'}

### Identifiant publicitaire
${d.admob ? '**Oui**, pour la publicité (AdMob). L\'app mobile déclare la permission AD_ID.' : 'Non, l\'application n\'utilise pas l\'identifiant publicitaire.'}

### Sécurité des données

| Question | Réponse |
| --- | --- |
| L'application collecte-t-elle ou partage-t-elle des types de données requis ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS imposé en production) |
| Quels moyens proposez-vous pour demander la suppression des données ? | **Les utilisateurs peuvent demander la suppression** : dans l'app (Compte › Supprimer mon compte) et à l'adresse ci-dessous |
| URL de suppression du compte | \`${d.urls.suppression}\` |

Types de données à cocher, puis pour chacun :

| Catégorie › type | Collectée | Partagée | Traitement éphémère | Obligatoire ou facultative | Finalités |
| --- | --- | --- | --- | --- | --- |
${declarees.map(x => { const t = DONNEES[x.type][1]; return `| ${t[0]} › ${t[1]} | Oui | ${x.partage && x.partage.length ? 'Oui (' + x.partage.join(', ') + ')' : 'Non'} | Non | ${x.facultatif ? 'Facultative' : 'Obligatoire'} | ${[...new Set(x.finalites.map(y => FINALITES[y] ? FINALITES[y][0] : y))].join(', ')} |`; }).join('\n')}

Ne coche rien d'autre : l'app n'a ni mesure d'audience, ni rapport de plantage, ni traceur${d.admob ? ' en dehors d\'AdMob' : ''}.
« Partagée » ne compte pas les sous-traitants qui travaillent pour toi (hébergeur${d.payants.length ? ', Stripe, RevenueCat' : ''}) : seulement les données remises à un tiers pour son propre usage.

## 3. Fiche Play Store principale (Croissance › Présence sur le Play Store)

**Nom de l'application** (${compte(f.nom, 30)})
${bloc(f.nom)}
**Description courte** (${compte(f.descriptionCourte, 80)})
${bloc(f.descriptionCourte)}
**Description complète** (${compte(f.description, 4000)})
${bloc(f.description)}

**Éléments graphiques** (générés par \`node outils/store-visuels.js\`, dossier \`store/visuels/google-play/\`) :

| Élément | Fichier | Exigence |
| --- | --- | --- |
| Icône de l'application | \`icone-512.png\` | PNG 512 × 512, 1 Mo au plus |
| Image de présentation | \`banniere-1024x500.png\` | PNG ou JPEG 1024 × 500, sans transparence |
| Captures d'écran du téléphone | \`telephone/*.png\` | 2 à 8, 1080 × 1920 |
${d.ipad ? '| Captures pour tablette 7" et 10" | `tablette-10/*.png` | facultatif, 1600 × 2560 (les mêmes pour 7" et 10") |\n' : ''}
## 4. Paramètres du Play Store

| Champ | Réponse |
| --- | --- |
| Catégorie | ${cat[0]} |
| Tags | jusqu'à 5, à choisir dans la liste de la console (proches de : ${(f.motsCles || []).slice(0, 5).join(', ')}) |
| Adresse e-mail | ${ed.email || ''} |
| Site Web | ${ed.site || d.urls.app} |
| Téléphone | ${ed.telephone || '(facultatif)'} |

${d.payants.length ? `## 5. Abonnements (Monétiser › Produits › Abonnements)

Un abonnement par palier payant, avec un **forfait de base** par période (renouvellement automatique). Les identifiants
ne changent plus une fois créés. Dans RevenueCat, chaque produit donne le droit (entitlement) qui porte l'**id du palier** :
c'est ce que le socle lit dans le webhook (\`APP_URL/api/offre/revenuecat\`).

${abonnementsTableau(ctx, 'google')}

Prix : saisis le prix TTC en euros pour la France, laisse Google convertir pour les autres pays.
` : ''}
## ${d.payants.length ? 6 : 5}. Versions

1. **Test interne** (Tests › Test interne) : importe le fichier \`.aab\` construit depuis l'Atelier (App mobile), ajoute ton adresse comme testeur.
2. **Test fermé** : obligatoire pour un **compte personnel** créé après novembre 2023 : **12 testeurs pendant 14 jours** avant de pouvoir demander l'accès à la production.
3. **Production** › Créer une version › même \`.aab\` › notes de version (${compte(f.nouveautes, 500)}) :
${bloc(f.nouveautes || '')}
4. Envoyer pour examen. La première revue prend souvent plusieurs jours.
`;
}

function docApple(ctx, e) {
  const f = ctx.fiche, d = ctx.d, c = f.contenu || {}, cat = CATEGORIES[f.categorie] || ['?', '?'], cat2 = f.categorie2 && CATEGORIES[f.categorie2], ed = f.editeur || {}, r = f.revue || {}, rc = r.contact || {};
  const desc = descriptionApple(ctx);
  const declarees = d.donnees.filter(x => DONNEES[x.type] && DONNEES[x.type][2]);
  const notes = notesRevue(ctx);
  return `<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: ${e} -->
# ${d.nomApp} sur l'App Store — tout ce qu'il faut saisir

Dans l'ordre d'**App Store Connect** (appstoreconnect.apple.com). Chaque texte est prêt à copier.

## 1. Identifiant de l'app (developer.apple.com › Certificates, Identifiers & Profiles)
Identifiers › + › App IDs › App : Bundle ID **explicite** :
${bloc(f.identifiant)}
(Xcode le crée tout seul avec la signature automatique ; il doit être le même que dans l'Atelier › App mobile.)
${d.payants.length ? 'Capacité à cocher : **In-App Purchase** (cochée par défaut).' : ''}

## 2. Nouvelle app (Apps › +)

| Champ | Réponse |
| --- | --- |
| Plateformes | iOS |
| Nom | ${f.nom} (${compte(f.nom, 30)}, unique sur tout l'App Store) |
| Langue principale | Français (France) |
| Identifiant de lot (Bundle ID) | \`${f.identifiant}\` |
| UGS (SKU) | \`${f.identifiant}\` |
| Accès utilisateur | Accès complet |

## 3. Informations sur l'app

| Champ | Réponse |
| --- | --- |
| Sous-titre | ${f.sousTitre} (${compte(f.sousTitre, 30)}) |
| Catégorie principale | ${cat[1]} |
| Catégorie secondaire | ${cat2 ? cat2[1] : '(facultatif)'} |
| Droits sur le contenu | « Non, elle ne contient pas, n'affiche pas et n'accède pas à du contenu de tiers »${c.contenusPartages ? ' — ⚠️ à revoir : l\'app affiche des contenus publiés par les utilisateurs' : ''} |
| Statut de commerçant (UE, DSA) | **Commerçant** si tu vends ou fais de la pub (${d.payants.length || d.admob ? 'c\'est le cas' : 'à décider'}) : adresse, téléphone et e-mail ci-dessous seront affichés sur la fiche européenne |
| Coordonnées affichées | ${ed.nom || ''} · ${ed.adresse || ''} · ${ed.telephone || '(téléphone)'} · ${ed.email || ''} |

### Classification par âge (Modifier › questionnaire)

| Question | Réponse |
| --- | --- |
${Object.keys(CONTENU).filter(k => CONTENU[k][1][0] !== '—').map(k => `| ${CONTENU[k][1]} | ${c[k] ? '**Oui / Fréquent ou peu fréquent, selon l\'app**' : 'Aucun / Non'} |`).join('\n')}
| Publicité | ${oui(d.admob)} |
| Contrôles parentaux, vérification de l'âge | Non |

Résultat attendu : ${Object.keys(CONTENU).every(k => !c[k]) ? '**4+**' : 'calculé par le questionnaire'}.
${d.enfants ? '⚠️ Une app pour les enfants va dans la catégorie Enfants : règles 1.3 et 5.1.4 (pas de pub ni d\'analyse tierces).' : ''}

## 4. Prix et disponibilité
Prix : **Gratuit** (0 €)${d.payants.length ? ', l\'offre payante passe par les abonnements (§ 6)' : ''}. Disponibilité : tous les pays, ou la France seulement si l'app ne vise qu'elle.

## 5. Confidentialité de l'app

URL de la politique de confidentialité :
${bloc(d.urls.confidentialite)}
« Collectez-vous des données à partir de cette app ? » : **Oui**. Types à cocher, puis pour chacun :

| Catégorie › type | Utilisations | Liée à l'identité | Utilisée pour le suivi (tracking) |
| --- | --- | --- | --- |
${declarees.map(x => { const t = DONNEES[x.type][2]; return `| ${t[0]} › ${t[1]} | ${[...new Set(x.finalites.map(y => FINALITES[y] ? FINALITES[y][1] : y))].join(', ')} | ${x.type === 'pubDonnees' || x.type === 'idAppareil' ? (d.pubPerso ? 'Oui' : 'Non') : 'Oui'} | ${(x.type === 'pubDonnees' || x.type === 'idAppareil') && d.pubPerso ? '**Oui** (demande l\'autorisation de suivi, ATT)' : 'Non'} |`; }).join('\n')}

Rien d'autre : pas de mesure d'audience, de rapport de plantage ni de traceur${d.admob ? ' hors AdMob' : ''} dans le socle.

## 6. Version iOS 1.0 (fiche de la version)

**Captures d'écran** (\`node outils/store-visuels.js\`, dossier \`store/visuels/app-store/\`) :
- iPhone 6,9" : \`iphone-6.9/*.png\` (1320 × 2868), de 1 à 10. Apple les réduit pour les autres iPhone.
${d.ipad ? '- iPad 13" : `ipad-13/*.png` (2064 × 2752), de 1 à 10 — obligatoires, l\'app tourne aussi sur iPad.\n' : ''}
**Texte promotionnel** (${compte(f.textePromo, 170)}, modifiable sans nouvelle version)
${bloc(f.textePromo || '')}
**Description** (${compte(desc, 4000)})
${bloc(desc)}
**Mots-clés** (${Buffer.byteLength(motsClesTexte(f))} / 100 octets, séparés par des virgules, sans espace)
${bloc(motsClesTexte(f))}
**URL d'assistance**
${bloc(d.urls.support)}
**URL marketing** ${d.urls.marketing ? '\n' + bloc(d.urls.marketing) : '(facultatif)'}
**Copyright**
${bloc(f.copyright || `${new Date().getFullYear()} ${ed.nom || ''}`)}
**Build** : celui envoyé depuis Xcode (Product › Archive › Distribute App), visible dans TestFlight 15 à 30 minutes après.

### Informations pour la revue de l'app

| Champ | Réponse |
| --- | --- |
| Connexion requise | **Oui** |
| Nom d'utilisateur | \`${r.compteDemo || ''}\` |
| Mot de passe | celui du compte de démo (saisis-le dans App Store Connect, **jamais dans ce dossier**) |
| Prénom, nom | ${rc.prenom || ''} ${rc.nom || ''} |
| Téléphone | ${rc.telephone || ''} |
| E-mail | ${rc.email || ed.email || ''} |

**Remarques** (${compte(notes, 4000)})
${bloc(notes)}

### Conformité de l'exportation
Déjà répondu dans l'app : \`ITSAppUsesNonExemptEncryption = false\` (ajouté par l'Atelier, l'app n'utilise que le HTTPS).

${d.payants.length ? `## 7. Abonnements (Monétisation › Abonnements)

Un **groupe d'abonnements** « ${d.nomApp} ${d.payants.map(p => p.libelle).join(' / ')} », puis un abonnement à renouvellement automatique par palier et période.
Dans RevenueCat, chaque produit donne le droit (entitlement) qui porte l'**id du palier** (webhook : \`APP_URL/api/offre/revenuecat\`).

${abonnementsTableau(ctx, 'apple')}

Pour chacun : durée, prix (palier de prix le plus proche du TTC), nom affiché et description en français, **capture de
l'écran d'achat** (\`#/abonnement\`, dans les captures iPhone), offre d'introduction si essai gratuit. Le premier
abonnement s'envoie **avec** la première version de l'app (case « Achats intégrés et abonnements » de la version).
Dans l'app, sur iPhone, les liens « Conditions d'utilisation » (CLUF standard d'Apple) et « Confidentialité » sont sous les offres (règle 3.1.2).
` : ''}
## ${d.payants.length ? 8 : 7}. Envoyer pour examen
Ajouter pour examen › Envoyer. Réponse en général sous 24 à 48 heures. Publication manuelle conseillée la première fois.
`;
}

function notesRevue(ctx) {
  const f = ctx.fiche, d = ctx.d, r = f.revue || {};
  const lignes = [r.notes || ''];
  lignes.push(`Compte de démonstration : ${r.compteDemo || ''} (mot de passe dans le champ prévu).`);
  lignes.push('Suppression du compte : Compte › Supprimer mon compte (mot de passe demandé ; le compte et ses données sont effacés).');
  lignes.push(`Confidentialité, conditions et aide : liens en bas de l’écran Compte${d.payants.length ? ' et de l’écran Abonnement' : ''}.`);
  if (d.payants.length) lignes.push('Abonnements : écran Abonnement (Compte › Voir les offres), achetés par les achats intégrés d’Apple (StoreKit, via RevenueCat), avec « Restaurer mes achats » sur le même écran. Le compte de démonstration est à l’offre gratuite : l’achat se teste avec un compte sandbox.');
  if (d.admob) lignes.push('Publicité : bannière Google AdMob en bas de l’écran pour l’offre gratuite, après le formulaire de consentement.');
  lignes.push('L’app communique avec son serveur en HTTPS ; toutes les fonctions demandent un compte.');
  return lignes.filter(Boolean).join('\n\n');
}

function docPublier(ctx, e) {
  const f = ctx.fiche, d = ctx.d;
  return `<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: ${e} -->
# Publier ${d.nomApp} — la liste complète, dans l'ordre

Coche au fur et à mesure (la même liste est dans l'Atelier › Mes apps › ${d.nomApp} › App mobile › Stores).

## 1. Les comptes (une seule fois pour toutes tes apps)

- [ ] **Apple Developer Program** : 99 $ par an, developer.apple.com/programs/enroll. Personnel (ton nom affiché) ou
      organisation (nom de la société, numéro **D-U-N-S** gratuit, 1 à 2 semaines).
- [ ] **Google Play Console** : 25 $ une fois, play.google.com/console/signup, vérification d'identité (pièce d'identité,
      adresse${d.payants.length || d.admob ? ', et compte marchand Google Payments pour vendre' : ''}).
      Compte **personnel** récent : test fermé de **12 testeurs pendant 14 jours** avant la production. Compte organisation : non.
- [ ] Apple : **statut de commerçant** (DSA) dans App Store Connect › Business, pour être distribué dans l'UE.
${d.payants.length ? '- [ ] Apple : **Accord des apps payantes** signé, coordonnées bancaires et fiscales (App Store Connect › Business).\n- [ ] Google : **profil de paiement** (Play Console › Configuration › Profil de paiement).\n- [ ] **RevenueCat** : un projet, une app iOS et une app Android, les droits (entitlements) aux ids des paliers (' + d.payants.map(p => p.id).join(', ') + ').\n' : ''}${d.admob ? '- [ ] **AdMob** : une app iOS et une app Android, un bloc « bannière » chacune, et le fichier **app-ads.txt** à la racine du site déclaré dans les stores.\n' : ''}
## 2. L'app en ligne (avant tout envoi)

- [ ] L'app tourne à ${d.urls.app} en **production** (\`APP_ENV=production\`, \`APP_URL=${d.urls.app}\`), mot de passe admin changé.
- [ ] Les pages publiques s'ouvrent sans compte : [confidentialité](${d.urls.confidentialite}), [aide](${d.urls.support}),
      [suppression du compte](${d.urls.suppression}), [conditions](${d.urls.conditions}).
- [ ] Le **compte de démonstration** \`${(f.revue || {}).compteDemo || ''}\` existe en production, avec des données d'exemple et un mot de passe noté dans ton gestionnaire.
- [ ] \`INSCRIPTION_OUVERTE=1\` si chacun crée son compte depuis l'app (sinon, explique dans les notes de revue comment on obtient un compte).
${d.payants.length ? `- [ ] Paiement : \`PAIEMENT_ACTIF=1\`, \`REVENUECAT_WEBHOOK_CLE\`, \`REVENUECAT_CLE_IOS\`, \`REVENUECAT_CLE_ANDROID\` (et Stripe pour le web) — KIT.md § 17.3.\n` : ''}${d.pubWeb ? `- [ ] Publicité : \`PUB_ACTIVE=1\`${d.admob ? ', `ADMOB_BANNIERE_IOS`, `ADMOB_BANNIERE_ANDROID`' : ''} — KIT.md § 17.4.\n` : ''}
## 3. L'app mobile (Atelier › Mes apps › ${d.nomApp} › App mobile)

- [ ] Identifiant \`${f.identifiant}\`, nom « ${f.nom} », appareils ${d.ipad ? 'iPhone et iPad' : 'iPhone seulement'}, version ${d.version}.
- [ ] Projet téléchargé, \`npm run preparer\`, essai sur un vrai téléphone (connexion, écrans, suppression du compte).
- [ ] Signature : Xcode (équipe, signature automatique) ; Android : clé d'envoi \`.jks\` **sauvegardée** avec ses mots de passe, Play App Signing activé.

## 4. Les visuels et les textes

- [ ] \`node outils/store-app.js\` puis \`node outils/verifier-app.js\` : règles 27 à 29 vertes.
- [ ] \`node outils/store-visuels.js postgres://…/postgres\` (serveur PostgreSQL de **test**) : icônes, bannière et captures dans \`store/visuels/\` ; règle 30 verte. Regarde chaque image.

## 5. Google Play — \`store/GOOGLE-PLAY.md\`

- [ ] Créer l'app, puis toutes les rubriques de « Configurer votre application » (confidentialité, accès, annonces, classification, public cible, sécurité des données…).
- [ ] Fiche principale (textes et visuels), catégorie et coordonnées.
${d.payants.length ? '- [ ] Abonnements créés et liés dans RevenueCat.\n' : ''}- [ ] Test interne → test fermé (12 testeurs, 14 jours si compte personnel) → production.

## 6. App Store — \`store/APP-STORE.md\`

- [ ] Créer l'app (Bundle ID \`${f.identifiant}\`), informations, classification par âge, prix, confidentialité de l'app.
- [ ] Build envoyé depuis Xcode, essayé dans **TestFlight**.
- [ ] Fiche de la version (captures, textes), informations pour la revue (compte de démo).
${d.payants.length ? '- [ ] Abonnements créés (groupe, prix, capture), joints à la version.\n' : ''}- [ ] Envoyer pour examen.

## 7. À chaque nouvelle version

- [ ] \`app/app.js → version\`, \`public/sw.js → VERSION\`, \`store/store.json → nouveautes\`, puis \`node outils/store-app.js\`.
- [ ] Nouvel export mobile depuis l'Atelier (le numéro de build augmente tout seul), envoi sur les deux stores.
- [ ] Nouvelles captures si les écrans ont changé (\`node outils/store-visuels.js …\`).

## Raisons de refus fréquentes

- Compte de démonstration absent, expiré ou vide (Apple 2.1, Google « Accès à l'application »).
- Politique de confidentialité ou page de suppression du compte inaccessible sans compte.
- Sécurité des données ou confidentialité de l'app qui ne correspond pas à ce que fait l'app (une SDK oubliée).
- ${d.payants.length ? 'Abonnement acheté hors des achats intégrés sur iPhone (3.1.1), ou sans liens vers les conditions et la confidentialité (3.1.2).' : 'App trop proche d\'un simple site (Apple 4.2) : l\'app embarquée et ses écrans passent bien mieux.'}
- Captures qui ne montrent pas l'app réelle, ou textes qui citent l'autre store.
`;
}

function docLisezmoi(ctx, e, problemes) {
  const d = ctx.d;
  const etat = problemes.length ? problemes.map(p => `- ${p.niveau === 'crit' ? '✗' : '!'} règle ${p.regle} : ${p.texte}`).join('\n') : '- ✓ Tout est prêt (règles 27 à 30).';
  return `<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: ${e} -->
# Dossier des stores — ${d.nomApp}

Tout ce qu'il faut pour publier ${d.nomApp} sur **Google Play** et l'**App Store** (kit « App complète » ${ctx.pkg.kitAppComplete || ''}, KIT.md § 18).
Seul \`store.json\` se modifie à la main ; le reste se régénère avec \`node outils/store-app.js\`.

| Fichier | Contenu |
| --- | --- |
| \`store.json\` | **La fiche** : textes, catégorie, public, contenu, données collectées, compte de démo, captures à faire |
| \`PUBLIER.md\` | La liste complète, dans l'ordre : comptes, mise en ligne, app mobile, visuels, envois |
| \`GOOGLE-PLAY.md\` | Chaque champ de la Play Console : fiche, sécurité des données, classification, public cible, accès, annonces${d.payants.length ? ', abonnements' : ''} |
| \`APP-STORE.md\` | Chaque champ d'App Store Connect : fiche, confidentialité de l'app, classification par âge, notes de revue${d.payants.length ? ', abonnements' : ''} |
| \`visuels/\` | Icônes, bannière Play et captures aux tailles exactes (\`node outils/store-visuels.js postgres://…\`) |
| \`../public/confidentialite.html\` | Politique de confidentialité → ${d.urls.confidentialite} |
| \`../public/support.html\` | Aide et contact → ${d.urls.support} |
| \`../public/suppression-compte.html\` | Suppression du compte (exigée par Google Play) → ${d.urls.suppression} |
| \`../public/conditions.html\` | Conditions d'utilisation → ${d.urls.conditions} |

## État au ${auj()}

${etat}

Ces pages et ces déclarations décrivent ce que fait l'app : **relis-les** (surtout la confidentialité et les conditions)
et fais-les valider si l'app traite des données sensibles.
`;
}

/* ---------- Pages publiques (servies par l'app, sans compte) ---------- */

function page(ctx, e, titre, corps) {
  const d = ctx.d;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titre)} — ${esc(d.nomApp)}</title>
<meta name="description" content="${esc(titre)} de ${esc(d.nomApp)}">
<meta name="theme-color" content="${esc(ctx.couleurs.primaire)}">
<link rel="icon" href="/icone.svg" type="image/svg+xml">
<link rel="stylesheet" href="/univers.css">
<link rel="stylesheet" href="/charte.css">
<link rel="stylesheet" href="/pages.css">
</head>
<body class="page-publique">
<!-- Généré par outils/store-app.js à partir de store/store.json (KIT.md § 18) — ne pas modifier à la main. store-empreinte: ${e} -->
<header class="barre"><a class="barre-titre" href="/">${esc(d.nomApp)}</a><a class="page-retour" href="/">Ouvrir l’app</a></header>
<main class="page-contenu">
<h1>${esc(titre)}</h1>
<p class="doux">Dernière mise à jour : ${esc(auj())}</p>
${corps}
</main>
<footer class="page-pied doux"><a href="/support.html">Aide et contact</a> · <a href="/confidentialite.html">Confidentialité</a> · <a href="/conditions.html">Conditions d’utilisation</a> · <a href="/suppression-compte.html">Supprimer mon compte</a></footer>
</body>
</html>
`;
}

function pageConfidentialite(ctx, e) {
  const f = ctx.fiche, d = ctx.d, ed = f.editeur || {};
  // une ligne par usage (compte, puis données de l'app), sans fusionner : chacune a sa raison et sa durée
  const lignes = d.brutes.filter(x => x.type !== 'pubDonnees').map(x => `<tr><td>${esc(DONNEES[x.type] ? DONNEES[x.type][0] : x.type)}${x.facultatif ? ' <span class="doux">(facultatif)</span>' : ''}</td><td>${esc(x.pourquoi)}</td><td>${x.finalites.includes('publicite') ? 'Consentement' : x.finalites.includes('securite') ? 'Intérêt légitime' : 'Exécution du service (contrat)'}</td><td>${esc(x.conservation || 'jusqu’à la suppression du compte')}</td></tr>`);
  lignes.push(`<tr><td>Mot de passe</td><td>sécuriser votre compte (seule une empreinte chiffrée est gardée, jamais le mot de passe)</td><td>Exécution du service (contrat)</td><td>jusqu’à la suppression du compte</td></tr>`);
  lignes.push(`<tr><td>Journal de sécurité (adresse IP, actions sensibles : connexions, changements de compte)</td><td>protéger l’app et votre compte</td><td>Intérêt légitime</td><td>${d.journalMois} mois</td></tr>`);
  const tiers = d.tiers.map(t => `<li><strong>${esc(t.nom)}</strong> — ${esc(t.role)} — ${esc(t.pays)}</li>`).join('');
  return page(ctx, e, 'Politique de confidentialité', `
<section class="carte"><h2>Qui est responsable de vos données ?</h2>
<p>${esc(ed.nom)}${ed.adresse ? ', ' + esc(ed.adresse) : ''}${ed.pays ? ' (' + esc(ed.pays) + ')' : ''}. Pour toute question sur vos données : <a href="mailto:${esc(ed.email)}">${esc(ed.email)}</a>.</p></section>
<section class="carte"><h2>Quelles données, pourquoi, combien de temps ?</h2>
<div class="page-tableau"><table><thead><tr><th>Données</th><th>Pour quoi faire</th><th>Base légale</th><th>Conservation</th></tr></thead><tbody>
${lignes.join('\n')}
</tbody></table></div>
<p>${esc(d.nomApp)} n’utilise ni mesure d’audience, ni traceur publicitaire${d.admob ? ' en dehors de la publicité décrite ci-dessus' : ''}, et ne vend ni ne loue vos données.</p></section>
<section class="carte"><h2>Qui y a accès ?</h2>
<p>Vous, et les personnes habilitées de ${esc(ed.nom)}. Nos prestataires y accèdent seulement pour ce qui les concerne :</p>
<ul>${tiers || '<li>aucun prestataire</li>'}</ul></section>
${d.admob ? `<section class="carte"><h2>Publicité</h2><p>Dans l’app mobile, l’offre gratuite affiche une bannière de Google AdMob. Au premier lancement, un formulaire vous demande votre accord ; ${d.pubPerso ? 'les annonces peuvent être personnalisées si vous l’acceptez' : 'les annonces ne sont pas personnalisées'}. L’offre payante n’a pas de publicité.</p></section>` : ''}
<section class="carte"><h2>Sécurité</h2><p>Les échanges entre l’app et son serveur sont chiffrés (HTTPS). Les mots de passe sont protégés par une empreinte (scrypt) ; les accès sont limités et journalisés.</p></section>
<section class="carte"><h2>Vos droits</h2>
<p>Vous pouvez accéder à vos données, les rectifier, les effacer, en limiter l’usage, vous y opposer et les récupérer dans un format lisible, en écrivant à <a href="mailto:${esc(ed.email)}">${esc(ed.email)}</a>. Réponse sous un mois. Vous pouvez aussi saisir la CNIL (<a href="https://www.cnil.fr/fr/plaintes">cnil.fr/plaintes</a>).</p>
<p><strong>Supprimer votre compte</strong> : dans l’app, Compte › Supprimer mon compte, ou voir la page <a href="/suppression-compte.html">suppression du compte</a>.</p></section>
<section class="carte"><h2>Cookies</h2><p>Un seul cookie, nécessaire au fonctionnement : celui de votre session (connexion). Aucun cookie de mesure ou de publicité sur le site.</p></section>`);
}

function pageSupport(ctx, e) {
  const f = ctx.fiche, d = ctx.d, ed = f.editeur || {};
  return page(ctx, e, 'Aide et contact', `
<section class="carte"><h2>Nous écrire</h2>
<p>Une question, un problème, une idée ? Écrivez à <a href="mailto:${esc(ed.email)}?subject=${encodeURIComponent(d.nomApp)}">${esc(ed.email)}</a>${ed.telephone ? ` ou appelez le ${esc(ed.telephone)}` : ''}. Nous répondons en général sous deux jours ouvrés.</p>
<p class="doux">${esc(ed.nom)}${ed.adresse ? ' · ' + esc(ed.adresse) : ''}</p></section>
<section class="carte"><h2>Questions fréquentes</h2>
<h3>Comment changer mon mot de passe ?</h3><p>Dans l’app : Compte › Changer de mot de passe.</p>
<h3>J’ai oublié mon mot de passe</h3><p>Écrivez-nous depuis l’adresse de votre compte : nous vous envoyons un mot de passe provisoire, à changer à la connexion.</p>
${d.payants.length ? `<h3>Comment gérer ou résilier mon abonnement ?</h3><p>Pris sur iPhone : Réglages › votre nom › Abonnements. Pris sur Android : Google Play › Profil › Paiements et abonnements. Pris sur le site : dans l’app, Abonnement › Gérer ou résilier mon abonnement. L’abonnement reste actif jusqu’à la fin de la période payée.</p>
<h3>J’ai changé de téléphone</h3><p>Connectez-vous avec le même compte, puis Abonnement › Restaurer mes achats.</p>` : ''}
<h3>Comment supprimer mon compte ?</h3><p>Dans l’app : Compte › Supprimer mon compte. Tout est expliqué sur la page <a href="/suppression-compte.html">suppression du compte</a>.</p></section>
<section class="carte"><h2>À propos</h2><p>${esc(d.nomApp)}, version ${esc(d.version)}. ${esc(f.descriptionCourte || '')}</p></section>`);
}

function pageSuppression(ctx, e) {
  const f = ctx.fiche, d = ctx.d, ed = f.editeur || {};
  const efface = d.brutes.filter(x => x.type !== 'pubDonnees' && x.type !== 'idAppareil').map(x => `<li>${esc(DONNEES[x.type] ? DONNEES[x.type][0] : x.type)} (${esc(x.pourquoi)})</li>`).join('');
  return page(ctx, e, `Supprimer votre compte ${d.nomApp}`, `
<section class="carte"><h2>Depuis l’app (immédiat)</h2>
<ol><li>Ouvrez ${esc(d.nomApp)} et connectez-vous.</li><li>Touchez <strong>Compte</strong>, puis <strong>Supprimer mon compte</strong>, tout en bas.</li><li>Saisissez votre mot de passe et confirmez.</li></ol>
<p>Votre compte et vos données sont effacés tout de suite.</p></section>
<section class="carte"><h2>Sans l’app</h2>
<p>Écrivez à <a href="mailto:${esc(ed.email)}?subject=${encodeURIComponent('Suppression de mon compte ' + d.nomApp)}">${esc(ed.email)}</a> <strong>depuis l’adresse e-mail de votre compte</strong>, avec pour objet « Suppression de mon compte ». Nous effaçons le compte sous 30 jours au plus et vous le confirmons.</p></section>
<section class="carte"><h2>Ce qui est effacé</h2><ul>${efface}</ul>
<h2>Ce qui est gardé</h2>
<ul><li>Le journal de sécurité (adresse IP, date des actions sensibles), ${d.journalMois} mois au plus, pour la sécurité de l’app ; il n’est plus relié à votre compte.</li>
${d.payants.length ? '<li>Les factures d’un abonnement payé sur le site, gardées par Stripe pendant la durée légale (10 ans).</li>' : ''}</ul>
${d.payants.length ? '<p><strong>Abonnement</strong> : supprimer le compte n’arrête pas un abonnement pris sur l’App Store ou Google Play ; résiliez-le dans les réglages du téléphone. Un abonnement pris sur le site doit être résilié avant (Abonnement › Gérer ou résilier).</p>' : ''}</section>`);
}

function pageConditions(ctx, e) {
  const f = ctx.fiche, d = ctx.d, ed = f.editeur || {};
  const offres = d.paliers.map(p => `<li><strong>${esc(p.libelle)}</strong>${p.prix ? ` : ${[p.prix.mois ? euros(p.prix.mois) + ' TTC par mois' : '', p.prix.an ? euros(p.prix.an) + ' TTC par an' : ''].filter(Boolean).join(' ou ')}${p.essaiJours ? `, ${esc(p.essaiJours)} jours d’essai gratuit` : ''}` : ' : gratuit'}${p.pub ? ', avec publicité' : ', sans publicité'}.</li>`).join('');
  return page(ctx, e, 'Conditions d’utilisation', `
<section class="carte"><h2>Le service</h2><p>${esc(d.nomApp)} est édité par ${esc(ed.nom)}${ed.adresse ? ', ' + esc(ed.adresse) : ''} (<a href="mailto:${esc(ed.email)}">${esc(ed.email)}</a>). ${esc(f.descriptionCourte || '')} Utiliser l’app, c’est accepter ces conditions.</p></section>
<section class="carte"><h2>Votre compte</h2><p>Vous êtes responsable de votre mot de passe et de ce que vous faites avec votre compte. Vous pouvez le supprimer à tout moment depuis l’app (Compte › Supprimer mon compte). Nous pouvons suspendre un compte utilisé contre la loi ou contre ces conditions.</p></section>
<section class="carte"><h2>Les offres</h2><ul>${offres}</ul>
${d.payants.length ? `<p>Les abonnements se renouvellent automatiquement à la fin de chaque période, au même prix, sauf résiliation avant la date de renouvellement. Ils se résilient à tout moment et restent actifs jusqu’à la fin de la période payée. Pris sur l’App Store ou Google Play, ils suivent aussi les conditions d’Apple (<a href="${EULA_APPLE}">contrat de licence standard</a>) ou de Google, et se gèrent dans les réglages du téléphone. Pris sur le site, le paiement passe par Stripe ; vous disposez d’un droit de rétractation de 14 jours, auquel vous renoncez expressément si vous utilisez l’offre payante pendant ce délai.</p>` : ''}</section>
<section class="carte"><h2>Vos contenus</h2><p>Ce que vous saisissez dans l’app reste à vous. Nous ne l’utilisons que pour faire fonctionner le service, comme le décrit la <a href="/confidentialite.html">politique de confidentialité</a>.</p></section>
<section class="carte"><h2>Disponibilité et responsabilité</h2><p>Nous faisons le nécessaire pour que l’app fonctionne et que vos données soient sauvegardées, sans pouvoir garantir une disponibilité sans interruption. ${esc(d.nomApp)} est un outil d’aide : vous restez responsable de vos décisions.</p></section>
<section class="carte"><h2>Droit applicable</h2><p>Ces conditions relèvent du droit français. En cas de litige, écrivez-nous d’abord ; vous pouvez aussi recourir gratuitement à un médiateur de la consommation ou à la plateforme européenne de règlement en ligne des litiges.</p></section>`);
}

const PAGES_CSS = `/* pages.css — pages publiques (confidentialité, aide, suppression du compte, conditions).
   Généré par outils/store-app.js (KIT.md § 18) avec univers.css et charte.css. store-empreinte: @E */
.page-publique { margin: 0; min-height: 100vh; background: var(--fond); color: var(--texte); font: var(--t-normal, 16px)/1.6 var(--police); }
.page-publique .barre { display: flex; align-items: center; gap: var(--e3); padding: var(--e3) var(--e4); padding-top: max(var(--e3), env(safe-area-inset-top)); }
.page-publique .barre a { color: var(--sur-primaire); text-decoration: none; }
.page-publique .barre-titre { font: var(--graisse-titres) 1.15rem var(--police-titres); flex: 1; }
.page-retour { font-weight: 600; }
.page-contenu { max-width: 760px; margin: 0 auto; padding: var(--e4); display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--e4); overflow-wrap: break-word; }
.page-contenu h1 { font: var(--graisse-titres) var(--t-grand-titre, 1.6rem)/1.2 var(--police-titres); margin: var(--e2) 0 0; }
.page-contenu > .doux { margin: 0; }
.page-contenu .carte h2 { font: var(--graisse-titres) var(--t-titre, 1.15rem)/1.3 var(--police-titres); margin-top: 0; }
.page-contenu .carte h3 { font-size: 1rem; margin: var(--e3) 0 var(--e1); }
.page-contenu a { color: var(--accent); }
.page-tableau { overflow-x: auto; }
.page-tableau table { width: 100%; border-collapse: collapse; font-size: var(--t-petit, 14px); }
@media (max-width: 600px) {
  .page-tableau thead { display: none; }
  .page-tableau tr { display: grid; grid-template-columns: minmax(0, 1fr); padding: var(--e2) 0; border-bottom: 1px solid var(--bordure); }
  .page-tableau tr td { border: 0; padding: 2px 0; }
  .page-tableau td:first-child { font-weight: 600; }
  .page-tableau td:nth-child(3)::before { content: "Base légale : "; color: var(--doux); }
  .page-tableau td:nth-child(4)::before { content: "Conservation : "; color: var(--doux); }
}
.page-tableau th, .page-tableau td { text-align: left; vertical-align: top; padding: var(--e2); border-bottom: 1px solid var(--bordure); }
.page-tableau th { background: var(--teinte); }
.page-pied { max-width: 760px; margin: 0 auto; padding: var(--e4); text-align: center; }
.page-pied a { color: inherit; }
`;

function generer(ctx) {
  const e = empreinte(ctx);
  const ecrire = (r, t) => { const c = path.join(ctx.racine, r); fs.mkdirSync(path.dirname(c), { recursive: true }); fs.writeFileSync(c, t); };
  ecrire('store/GOOGLE-PLAY.md', docGoogle(ctx, e));
  ecrire('store/APP-STORE.md', docApple(ctx, e));
  ecrire('store/PUBLIER.md', docPublier(ctx, e));
  ecrire('public/confidentialite.html', pageConfidentialite(ctx, e));
  ecrire('public/support.html', pageSupport(ctx, e));
  ecrire('public/suppression-compte.html', pageSuppression(ctx, e));
  ecrire('public/conditions.html', pageConditions(ctx, e));
  ecrire('public/pages.css', PAGES_CSS.replace('@E', e));
  ecrire('store/LISEZMOI.md', docLisezmoi(ctx, e, []));   // provisoire : l'état final dépend des fichiers écrits
  const problemes = controler(ctx);
  ecrire('store/LISEZMOI.md', docLisezmoi(ctx, e, problemes));
  return problemes;
}

module.exports = { charger, controler, generer, empreinte, controlerVisuels, visuelsAttendus, notesRevue, descriptionApple, CATEGORIES, DONNEES, FINALITES, CONTENU, LIMITES, GENERES };

if (require.main === module) {
  const args = process.argv.slice(2);
  const racine = path.resolve(args.find(a => !a.startsWith('--')) || '.');
  const ctx = charger(racine);
  const problemes = args.includes('--verifier') || ctx.erreur ? controler(ctx) : generer(ctx);
  if (!args.includes('--verifier') && !ctx.erreur) console.log(`Dossier des stores généré — ${racine}\n  store/LISEZMOI.md, GOOGLE-PLAY.md, APP-STORE.md, PUBLIER.md\n  public/confidentialite.html, support.html, suppression-compte.html, conditions.html, pages.css\n`);
  problemes.forEach(p => console.log(`  ${p.niveau === 'crit' ? '✗' : '!'} ${p.regle} ${p.texte}`));
  const ko = problemes.filter(p => p.niveau === 'crit').length;
  console.log(ko ? `\nÀ compléter : ${ko} point(s) bloquant(s) (règles 27 à 29).` : problemes.length ? '\nPrêt, avec des conseils ci-dessus.' : '\nPrêt.');
  process.exitCode = ko ? 1 : 0;
}
