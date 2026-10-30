# Atelier de Blocs — v1.31

Plateforme HTML en **trois espaces** :

1. **Créer** : préparer le prompt et le pack ZIP (kits + blocs) à donner à Claude, qui écrit l'app complète ;
   puis importer le ZIP livré par Claude. (En option : composer une petite app avec des blocs, sans Claude.)
2. **Mes apps** : gérer chaque app au même endroit : code et versions, base de données, app mobile et émulateur,
   audit de sécurité, revenus.
3. **Kits** : concevoir, ranger et versionner des kits (règles + dossier de documents), exportés en ZIP pour Claude.

HTML/CSS/JS vanilla, sans build, sans dépendance npm.

- **Blocs** : l'aspect technique (comment on se connecte, comment on paie, où vont les données).
- **Kits** : les règles communes qui rendent les apps homogènes (charte graphique, cybersécurité, affichage, règles libres).

## Lancer

- **Sans rien installer** : double-clic sur `atelier-blocs.html` (fichier unique, tout inclus).
  Ou, après avoir extrait tout le dossier, `index.html` (même contenu, en fichiers séparés).
- **Avec l'assistant IA** (facultatif, Node 18+) :

  ```bash
  ANTHROPIC_API_KEY=sk-ant-… node serveur.js
  # puis ouvrir http://localhost:8787
  ```

  La clé peut aussi aller dans un fichier `.env` à côté de `serveur.js`.
  Elle reste sur le serveur : le navigateur ne la voit jamais.
  Sans serveur, l'assistant donne un prompt à copier dans Claude et un champ pour coller la réponse.
- **Pour illustrer les compagnons par IA** (facultatif) : `OPENAI_API_KEY=sk-… node serveur.js`
  ou `GEMINI_API_KEY=… node serveur.js` (ou dans `.env`). Modèles par défaut : `gpt-image-1` ou
  `gemini-2.5-flash-image`, à changer avec `AB_IMAGE_MODELE`. Sans clé, le Studio donne les prompts à copier.
- **Pour se connecter aux bases de données** : double-clic sur `lancer-atelier.command` (Mac), `lancer-atelier.bat` (Windows)
  ou `lancer-atelier.sh` (Linux), qui démarre `node serveur.js` et ouvre http://localhost:8787. Obligatoire pour voir les
  données réelles ; concevoir les tables marche aussi en fichier local. La première fois, exporte la sauvegarde depuis le
  fichier local (Réglages) et restaure-la à l'adresse localhost : le navigateur range les données de chaque adresse à part.

Tout est enregistré dans le navigateur (IndexedDB). Réglages › Exporter la sauvegarde pour garder une copie.

## Le parcours avec Claude (v1.14)

1. **Créer une app › Prompt et pack** : décris l'app, coche les kits et les blocs à reprendre. Tu obtiens le prompt
   (à copier) et **Pack pour Claude (.zip)** : `PROMPT.md`, `kits/<kit>/` (règles en `KIT-ATELIER.md` + tous les
   documents du kit), `blocs/<bloc>.js`, et pour faire évoluer une app : `bases/*.sql` et `code-actuel/`.
2. **Dans Claude** : colle le prompt, joins le pack. Le prompt demande l'app en un seul ZIP avec une fiche
   `atelier-app.json` (nom, description, technologies, dossier web, schéma de la base, variables, fonctionnalités).
3. **Mes apps › Importer le ZIP d'une app** : l'Atelier lit le ZIP (avec ou sans `atelier-app.json` : il devine à partir
   de `package.json`, `README.md`, `index.html`, `.env.example`, `*.sql`, `schema.prisma`), crée l'app et remplit sa
   base de données. Le ZIP est gardé (version 1).
4. **Nouvelle version** : onglet « Code et versions » de l'app › Importer une nouvelle version. Les versions se
   téléchargent, se parcourent, s'auditent ; on peut revenir à une version précédente.

L'app mobile reprend toute seule le code courant (plus besoin de rechoisir le dossier), l'audit de sécurité se lance
depuis la version, et le prompt d'évolution joint le code actuel.

### Kits = dossiers de documents

Un kit garde ses règles (critères, règles, valeurs, référence) **et** ses fichiers (onglet Fichiers : ajouter des
fichiers, un dossier ou le contenu d'un ZIP ; voir, modifier un texte, télécharger). « Importer un kit (ZIP) » accepte
n'importe quel dossier zippé, par exemple `techview-app-kit-1.8.zip` : kit `techview-app-kit` v1.8.0, nom et description
lus dans `KIT.md` ou `README.md`, tous les fichiers joints ; un ZIP 1.9 du même kit devient sa version 1.9.0.
Le bouton ZIP d'un kit l'exporte avec `KIT-ATELIER.md` et `kit-atelier.json` (pour le réimporter à l'identique).
Les fichiers sont dans la sauvegarde (Réglages › Exporter).

### Base de données dans chaque app

Onglet « Base de données » dans l'espace de chaque app (composeur et fiche) : tables, SQL, connexion, données,
réglages, plusieurs bases par app. « Importer un schéma » lit un fichier SQL (CREATE TABLE, migrations) ou un
`schema.prisma`. Les fiches PostLocal, RelancePro, Livora, Podology et Training arrivent avec leurs tables.

### Prêt pour Google Play et l'App Store (v1.31)

Chaque app du kit **App complète 1.4** arrive avec tout ce que les deux stores demandent, préparé par Claude en même
temps que l'app à partir d'une seule fiche, `store/store.json`.

- **Dans l'app** : « Supprimer mon compte » (écran Compte, exigé par Apple et Google), liens « Aide et contact ·
  Confidentialité · Conditions d'utilisation » sous les écrans Compte et Abonnement, et quatre pages publiques servies
  sans compte : `/confidentialite.html`, `/support.html`, `/suppression-compte.html`, `/conditions.html`. Le journal est
  purgé après `JOURNAL_MOIS` mois, la durée annoncée dans la politique de confidentialité.
- **`node outils/store-app.js`** : le dossier `store/` — `PUBLIER.md` (comptes, mise en ligne, app mobile, envois, dans
  l'ordre), `GOOGLE-PLAY.md` et `APP-STORE.md` (chaque champ des deux consoles, dans leur ordre : textes prêts à copier
  avec leur compteur, catégories, sécurité des données, confidentialité de l'app, classifications PEGI et Apple, public
  cible, accès pour la revue et compte de démo, annonces, abonnements et droits RevenueCat, notes de revue).
- **`node outils/store-visuels.js postgres://…`** : icône 512 et bannière 1024 × 500 (Play), icône 1024 (App Store),
  captures iPhone 6,9", iPad 13", téléphone et tablette Android aux tailles exactes, avec une légende et les couleurs de
  l'univers de l'app (sur une base jetable remplie de données d'exemple, comme la recette).
- `verifier-app.js` : règles 27 à 30 (fiche complète et dans les limites des stores, déclarations cohérentes avec l'app
  dont `rgpd`, dossier à jour, visuels aux bonnes tailles) ; `recette-app.js` : scénario 34 (suppression du compte).
- **App mobile › Stores** : panneau « Fiches des stores » (résumé de la fiche, identifiant à aligner, documents à
  ouvrir et copier, visuels) ; le dossier `store/` est joint au projet mobile téléchargé.
- Mise à jour d'une app 1.3.x : `kits/app-complete/KIT.md` § 19.

### Un univers graphique propre à chaque app (v1.30)

Les apps ne se ressemblent plus toutes : chacune reçoit **son univers**, adapté à son besoin, sur un socle commun qui la
garde **fluide, lisible, colorée et accessible**. Kit **App complète 1.3**.

- **Nouvelle app** et **Prompt et pack** : le panneau devient « Nom, logo et univers ». L'Atelier déduit l'univers de la
  description parmi 13 ambiances (soin et sérénité, calme et bien-être, nature, gourmand, pro, finance, ludique, sport,
  culture, voyage, tech, élégance, communauté) et en montre trois en cartes. L'univers choisi s'affiche en **aperçu réel**
  (les vrais `charte.css` et `socle.css` du kit) et se règle : couleurs douces ou vives, teintes du logo ou de l'univers,
  polices des titres et du texte, formes, ombres, barre, motif, illustration, densité, animations. Les contrôles
  (contrastes 4,5:1, app colorée, couleurs douces, texte à 16 px, animations courtes) s'affichent en direct.
- **Couleurs douces par défaut**, pas agressives ; vives seulement quand le concept s'y prête (enfants, jeu, sport, fête).
  Les contrastes sont corrigés automatiquement, y compris avec les couleurs du logo.
- « Proposer avec Claude » et la discussion proposent aussi des univers (cartes à adopter d'un clic). Dans l'onglet
  Discussion d'une app existante : « Propose-moi 3 univers », l'univers adopté va dans ses fichiers (`identite/`).
- Le prompt reçoit une section « Univers graphique » ; le ZIP du kit et le pack reçoivent `identite/univers.css` (à copier
  dans `public/`) et `identite/UNIVERS.md` (palette, icônes, illustrations, ton des textes).
- Kit : `public/univers.css` (palette complète, polices, formes, ombres, dégradés, motif, illustration des écrans vides,
  rythme) ; `charte.css` devient les composants communs, plus fluides (entrée des écrans, retour au toucher, feuilles qui
  glissent, onglet actif en pastille). `verifier-app.js` : règle 24 réécrite, 25 sur `univers.css`, 26 couleurs douces.
  Mise à jour d'une app 1.2.x : `kits/app-complete/KIT.md` § 19.

### Kit « App complète » 1.2.1 : mot de passe et écrans d'accueil (v1.29.1)

- Changement de mot de passe : premier champ « Mot de passe actuel » (même au premier changement imposé), et nouveau
  champ « Confirmer le nouveau mot de passe », vérifié dans l'écran et par le serveur (`confirmation` dans `/api/moi/mdp`).
- Connexion, inscription, installation et mot de passe imposé : bandeau aux couleurs de l'app avec son logo et son nom,
  carte en relief, bouton pleine largeur, bouton « Afficher » dans les champs mot de passe. Rien à faire dans les apps :
  le style vient de `socle.css` et des 4 couleurs de marque.
- Pour une app déjà livrée en 1.2.0 (Ressena…) : remplacer les fichiers du socle listés dans `KIT.md` § 19.

### Le Studio design prend les avatars dans le code de l'app (v1.29)

Quand le code importé d'une app (onglet « Code et versions », version courante) contient ses avatars, comme Livora v3
(`src/avatar/reperes.json`, `src/assets/personnage/`, `assets/companions/`, `assets/avatar/`), son Studio design s'ouvre
sur l'onglet **Avatars de l'app**, lu directement dans ce code, sans copie : importer une nouvelle version de l'app
suffit pour voir ses nouveaux dessins.

- personnage assemblé comme dans l'app (repris de `PersonnageCalques.vue` et `recoloration.js`) : corps du stade selon
  le niveau (6 stades homme, 4 femme), peau, coiffure, couleur des cheveux, yeux, expression, nez, barbe ;
- tenues portées du genre (cliquer pour enfiler ou retirer), évolution sur tous les stades ;
- compagnons à chaque palier et objets à débloquer (noms et raretés lus dans `cosmeticItems.js`).

La bibliothèque commune (menu Studio design) montre ceux de Livora. Les anciens onglets dessinés en SVG restent
(« Personnage SVG (ancien) »…) ; leur export prévient qu'il remettrait les anciens dessins dans l'app.

### Les apps avec leur serveur tournent dans l'aperçu (v1.28)

**v1.28.1** : si une ancienne version du serveur local tourne encore, la nouvelle ne pouvait pas démarrer (port 8787
pris) sans rien dire, et le navigateur continuait d'afficher l'ancienne Atelier. Le serveur local l'annonce maintenant
dans sa fenêtre (« Le port 8787 est déjà utilisé par une version précédente… »), et l'Atelier signale un serveur local
d'une autre version (bas de la barre latérale en orange et message).

Une app qui a son propre serveur Node (kit « App complète » comme Garanto, Express…) ne restait que sur
« Chargement… » dans l'**Aperçu** : seul `public/` était servi, et `/api` renvoyait la page HTML. Maintenant, quand le
ZIP contient un `package.json` (script `start` ou `serveur.js`) au-dessus du dossier web, le serveur local :

1. copie l'app dans `~/.atelier-blocs/apps-lancees/<app>/projet/` et installe ses dépendances (gardées d'une fois sur l'autre) ;
2. si elle utilise PostgreSQL (`pg`, Prisma… ou `DATABASE_URL` dans `.env.example`), lui crée une **base de test à
   elle** (`app_<id>`) sur le PostgreSQL de l'Atelier : installé tout seul la première fois dans `~/.atelier-blocs/postgres/`
   (paquet npm `embedded-postgres`, environ 30 Mo, rien à configurer), puis démarré avec le serveur local. Les données de
   test sont gardées. Pour utiliser ton propre PostgreSQL : `AB_PG_URL=postgres://utilisateur:motdepasse@localhost:5432`
   dans le `.env` de l'Atelier ;
3. lance l'app sur un port libre avec des variables de développement : celles de `.env.example`, plus `PORT`,
   `DATABASE_URL`, `APP_ENV=developpement`, `APP_URL`/`ORIGINES` = l'adresse de l'aperçu, et pour le kit App complète
   `ADMIN_DEFAUT=1` (compte admin / adminadmin), `TACHE_QUOTIDIENNE=0`. Les secrets de développement (`…_SECRET`)
   sont tirés au hasard et gardés ;
4. l'aperçu (http://localhost:8788) sert l'interface et **relaie `/api` et le reste vers l'app**, à la même adresse :
   cookies de session et connexion marchent comme en ligne.

Tout s'affiche dans le Journal (installation, migrations, sortie de l'app). Une app déjà lancée avec le même code n'est
pas relancée ; un nouveau ZIP arrête l'ancienne version et lance la nouvelle. Comme la construction, c'est réservé à
l'Atelier ouvert sur http://localhost:8787, et les clés de l'Atelier ne sont pas transmises à l'app.

### Charte commune des apps (v1.27)

Le kit **App complète passe en 1.2** : toutes les apps créées avec lui se ressemblent et se vendent de la même façon
(détail dans `kits/app-complete/KIT.md` § 17).

- **Style** : la charte de base partout ; une app ne change que ses deux couleurs de marque (contraste contrôlé),
  `theme-color` et son logo. Rien en dur dans les écrans.
- **Rôles** : `admin`, `vip` et `utilisateur` dans toutes les apps, plus les rôles métier utiles à chacune
  (`{ id, libelle, description }`). **VIP** = tous les avantages du palier payant le plus haut, sans payer, sans pub et
  sans droit d'administration ; se donne dans Comptes.
- **Offre** : Gratuit (avec pub et des limites) puis Premium (sans pub), éventuellement Pro ; prix TTC mensuel et annuel.
  Écran **Abonnement**, **invitation** « Cette fonction fait partie de l'offre Premium » et **bandeau de pub** en bas de
  l'écran fournis par le socle, identiques partout. Un abonnement offert s'ajoute dans Données › `abonnements`.
- **Éteint par défaut** : `PUB_ACTIVE=0` et `PAIEMENT_ACTIF=0`. Puis bandeau maison sur le web, AdMob sur mobile ;
  paiement par Stripe (web) et RevenueCat (App Store, Google Play), enregistré par webhooks signés.
- Le prompt « Nouvelle app » demande les **rôles métier** et l'**offre**, et exige la matrice des droits avant de coder.
- Recette : `verifier-app.js` 25 règles, `recette-app.js` 33 scénarios.

### Mot de passe provisoire depuis les données (v1.26)

Onglet **Base de données › Données**, table `utilisateurs` d'une app du kit « App complète » : le **cadenas** d'une ligne
(ou un double-clic sur `mdp_hash`) donne un mot de passe provisoire à un compte. On le tape ou on en tire un au hasard,
on peut le copier. Il n'est **jamais écrit en clair** : le serveur local le hache comme l'app (`scrypt$16384$8$1$…`,
même format que `noyau/comptes.js`), coche `mdp_a_changer` et ferme les connexions ouvertes du compte, dans une même
transaction (et le note au journal de l'app, sans le mot de passe). La personne se connecte avec, puis l'app lui
demande aussitôt d'en choisir un nouveau. Écrire du texte en clair dans `mdp_hash` est refusé (il ne marcherait pas :
l'app compare des empreintes).

### Modifier les données en direct, avec les aides (v1.25)

Onglet **Base de données › Données** d'une app (serveur local et connexion à la base réelle) :

- **Listes déroulantes** au lieu d'un champ libre dès qu'on connaît les valeurs : type `enum`, contrainte
  `check (… in (…))`, oui / non, et pour une **clé étrangère** les lignes liées affichées lisiblement
  (« Marie · marie@ex.fr » plutôt que l'uuid ; colonne `affichage` de `app.tables` si l'app la déclare, sinon `nom`,
  `titre`, `email`…). Au-delà de 200 lignes liées, on tape pour chercher.
- **Rôles** : pour `utilisateurs.role`, la liste vient du code de l'app (version courante) : `admin` et `utilisateur`
  du noyau du kit « App complète », plus les rôles de `app/app.js › roles` avec leur libellé. Le code est seulement lu,
  jamais exécuté. Les valeurs déjà utilisées dans une colonne (statuts, catégories…) sont proposées aussi, avec
  « Autre valeur… » pour en saisir une nouvelle.
- Bouton **Aides** : pour chaque colonne, sa description, les valeurs permises ou proposées, les règles de la base
  (ex. `role ~ '^[a-z]…'`), le lien vers une autre table, obligatoire / défaut, et un avertissement sur les données
  sensibles (empreinte de mot de passe…).
- **Crayon** sur une ligne : toute la ligne dans un formulaire, avec l'aide sous chaque champ. Double-clic sur une
  cellule : modification rapide.
- **Confirmation avant d'écrire** : avant / après, l'instruction envoyée, et selon la table : « Noter dans le journal
  de l'app » (table `journal` du kit : acteur `atelier`, avant / après, données sensibles masquées) et, pour un
  changement de `role` ou `actif` d'un compte, « Fermer ses connexions ouvertes » (tables `sessions` et `jetons`), pour
  que le changement s'applique tout de suite. « Ne plus demander pendant cette visite » se décoche au-dessus du tableau ;
  une colonne sensible et une suppression demandent toujours.
- Tout passe dans **une transaction** (la ligne, le journal, les connexions) et la règle du kit est tenue :
  **le dernier compte admin actif** ne peut être ni rétrogradé, ni désactivé, ni supprimé.

### Nom et logo à chaque création (v1.24)

À chaque création d'app, l'Atelier propose **plusieurs noms et plusieurs logos** (panneau « Nom et logo ») :
**Créer une app › Nouvelle app**, **« Créer cette app »** de la veille et **Prompt et pack** (nouvelle app).

- **Tout de suite, sans IA** : des noms tirés des mots de la description (comme « Garanto » pour des garanties), avec une
  accroche, et 6 logos dessinés (36 symboles, 12 palettes, 5 styles : dégradé, pastille, badge, initiale, fond sombre).
  « Autres idées » en tire d'autres.
- **Avec Claude** : « Proposer avec Claude » (serveur local et sa clé ; sinon le prompt se copie et la réponse se colle).
  Claude choisit des symboles et des couleurs, ou dessine le logo en SVG (nettoyé : ni script, ni lien, ni image externe).
  Avec le serveur local, Claude propose tout seul dès que la description est écrite, et dès l'arrivée depuis la veille.
- **En discuter** : « En discuter avec Claude » ouvre une discussion sur le nom et le logo (« plus court », « plus sérieux »,
  « une autre couleur »…). Ses propositions s'affichent en cartes : un clic adopte le nom ou le logo.
  Dans l'onglet **Discussion** d'une app déjà créée, on peut aussi demander d'autres noms et logos et les adopter.

Le nom choisi remplit le champ « Nom » (et le code technique s'il n'a pas été changé à la main). L'accroche et les couleurs
se modifient dans le panneau. Le choix ajoute au prompt une section **« Identité »** (nom, accroche, couleurs, icônes à
reprendre) et les icônes `icone.svg`, `icone-512.png`, `icone-192.png`, `icone-180.png` dans `identite/` du ZIP du kit
(Nouvelle app) ou du pack (Prompt et pack) ; « Logo (.zip) » les télécharge seules. « Enregistrer comme projet » garde le
logo dans la fiche (affiché dans Mes apps) et ses icônes dans les fichiers de l'app ; Apps mobiles le prend comme icône et
couleur par défaut.

### Discussion avec Claude (v1.23)

Pour parler de monétisation, du fonctionnement d'une app ou de ses évolutions :

- **onglet « Discussion » de chaque app** (fiche et composeur) : Claude reçoit la fiche de l'app, son code (version
  courante : arborescence et jusqu'à 150 000 caractères de fichiers utiles, README, `package.json`, schéma, `src/`…),
  sa base de données et ses revenus. Le bouton « Contexte » montre exactement ce qui est envoyé. Les fichiers `.env`
  ne sont jamais lus ; d'un `.env.example`, seuls les noms des variables partent ;
- **menu « Discussion »** : questions sur l'Atelier et sur l'ensemble des apps (liste, statut, revenus).

Plusieurs discussions par app, gardées dans le navigateur (et dans la sauvegarde). Des suggestions de questions
s'affichent au départ. Avec le serveur local et sa clé `ANTHROPIC_API_KEY`, Claude répond **en direct** (route
`/api/discussion`, réponse au fil de l'eau, contexte mis en cache chez Anthropic pour les questions suivantes).
Sans serveur ou sans clé, « Préparer pour Claude » copie la question avec son contexte pour la coller dans claude.ai,
puis on recolle la réponse dans la discussion.

### Code source construit tout seul (v1.22)

Dans l'**Aperçu** d'une app (et l'**Émulateur** des apps mobiles), on peut maintenant choisir le **code source** (dossier
ou ZIP d'un projet Vite, Vue, React, Svelte, Angular…), plus seulement le dossier construit `dist/`. L'Atelier le
reconnaît (un `package.json` avec un script `build` et un `index.html` qui charge `src/…`) et le **serveur local**
s'occupe du reste :

1. il copie le projet dans `~/.atelier-blocs/constructions/<app>/projet/` (sans `node_modules`) ;
2. il installe les dépendances : `npm ci` (ou `npm install`), `pnpm install` ou `yarn install` selon le fichier de
   verrouillage. Un `package-lock.json` fait dans un monorepo (liens `../`) est ignoré ; si un outil manque ensuite
   (« vite: not found »), il réinstalle sans lui ;
3. il lance `npm run build` et trouve le dossier construit (`outDir` de `vite.config`, sinon `dist/`, `build/`, `out/`, `www/`) ;
4. l'aperçu affiche l'app construite. Toutes les lignes de npm s'affichent dans le **Journal**.

Les fois suivantes c'est bien plus rapide : `node_modules` est gardé (réinstallé seulement si `package.json` ou le
verrou change) et le même code n'est pas reconstruit. Une fois construite, l'app mobile (diagnostic, export du projet
Capacitor) prend aussi la version construite.

Il faut l'Atelier ouvert sur **http://localhost:8787** (double-clic sur `lancer-atelier`) : sans serveur local, ou avec
l'Atelier ouvert en fichier, l'aperçu explique quoi faire au lieu d'une page blanche. Les apps Next.js (code serveur)
restent en mode « site en ligne ». L'API de l'app n'est pas lancée : l'aperçu appelle l'adresse d'API construite dans l'app.

### Veille technologique : une idée d'app grand public par jour (v1.20, v1.21)

Menu **Veille technologique** (sous le tableau de bord, qui affiche aussi l'idée du jour). Chaque jour, une idée d'app
**grand public** (comme une calculatrice ou une météo, jamais pour un type d'entreprise), simple ou plus complexe, avec tout son fonctionnement pour une mise en production rapide : pour qui, problème,
solution, pourquoi maintenant, fonctionnalités, écrans, tables, routes d'API, rôles, stack, **kits de l'Atelier** à joindre,
services externes et leurs coûts, **mise en production étape par étape** jusqu'à l'App Store et Google Play
(Apps mobiles de l'Atelier, comptes développeur, fiches des stores), monétisation, risques et parades, version minimale, évolutions.

- **30 fiches intégrées** (hors ligne) : une différente chaque jour pendant 30 jours, niveaux et sujets mélangés.
  16 apps **sans serveur** (tout sur le téléphone, kit Socle PWA, hébergement gratuit) et 14 **avec serveur** (comptes,
  partage, IA : kit App complète). Filtre « Avec ou sans serveur » dans Toutes les idées.
  « Jour précédent » / « Jour suivant » pour parcourir, « Au hasard », onglet **Toutes les idées** (recherche, niveau, catégorie).
- **Créer cette app** : remplit Créer une app › Nouvelle app (kit Socle PWA ou App complète selon l'app : nom, consigne détaillée) ;
  il reste à copier le prompt dans Claude.
- **Garder** (favoris), **Marquer réalisée**, **Copier la fiche** ou la télécharger en **.md**.
- **Nouvelle idée par l'IA** : avec le serveur local et sa clé, l'IA écrit une fiche au même format, toujours grand public
  (orientation facultative, sans reprendre une idée existante) ; sans serveur, le prompt se copie dans Claude et la réponse se colle.
  Case **Idée du jour par l'IA** : à la première ouverture de chaque jour, l'IA génère l'idée du jour (le catalogue sert
  tant que l'IA n'est pas prête). Les idées générées sont dans l'onglet **Générées par l'IA** et dans la sauvegarde.

### Kit « App complète » 1.1 : fronts séparés et apps mobiles (v1.19)

Le kit se connecte maintenant par jetons (front Vue/React/Vite sur une autre adresse, app mobile, aperçu de l'Atelier) :
jeton d'accès signé, renouvellement à usage unique, `ORIGINES` avec `capacitor://localhost` et `null`. Recette : 27 scénarios.
Première app construite dessus : l'API de PodoLogiciel (`podologiciel-api`), qui reprend le contrat de son écran Vue.

### Voir une app dans l'Atelier (v1.18)

Chaque fiche d'app a un onglet « Aperçu » (bouton « Voir l'app ») : l'app s'affiche dans un cadre Ordinateur,
Ordinateur portable, iPad Pro 13" ou iPhone 16, et « Ouvrir dans un nouvel onglet » l'ouvre en pleine page.
Source : le dossier ou le ZIP de l'app construite (gardé, le même que dans Apps mobiles), le code importé
dans « Code et versions », ou l'adresse en production. Avec le serveur local l'app est servie à la racine ;
sans lui, elle est intégrée dans la page (apps Vite comprises). Le journal montre les erreurs et les appels
à l'API (« pas de réponse » = l'API n'est pas lancée ou l'adresse d'API de la construction est fausse).

### Émulateur mobile en grand (v1.17)

Apps mobiles › Émulateur s'ouvre en grand au-dessus de la page ; cliquer autour du téléphone ou Échap le ramène
dans la page, « Agrandir » ou un clic sur le contour le remet en grand. Plus de page blanche muette : si la source
est le code d'une app Vite/Vue/React (non construite), l'écran du téléphone explique de lancer `npm run build`
et de choisir `dist/` ; si l'app construite charge des modules JavaScript, il faut le serveur local
(`node serveur.js`, puis http://localhost:8787). Le journal signale aussi une page restée vide après 4 s.
En petit, un clic n'importe où sur le téléphone l'agrandit. Le dossier ou le ZIP choisi dans « App et source »
est gardé dans le navigateur (v1.17.1) : plus besoin de le recharger à chaque ouverture de l'Atelier.
Depuis la v1.17.2, une app Vite/Vue/React construite (dist/) tourne aussi sans serveur local : ses modules sont
chargés dans le navigateur (import map), pages chargées à la demande comprises. L'appareil par défaut est l'iPad Pro 13".

### Nouvelle app : le prompt rempli champ par champ (v1.16)

Créer une app › **Nouvelle app** : choisis le kit joint (App complète par défaut) et la version de son prompt. Chaque
⟦…⟧ du `PROMPT.md` du kit devient un champ (nom de l'application, code technique déduit du nom, consigne, rôles et
hébergement facultatifs) ; le prompt se complète en direct à droite, champs surlignés, avec le compte de ce qui reste
« à renseigner ». **Copier**, **.md**, télécharger le kit à joindre, ou **Enregistrer comme projet** (crée la fiche de
l'app, garde le prompt dans ses fichiers). Le brouillon est gardé. Convention pour un kit : `⟦Libellé : aide⟧`,
`⟦?Libellé : aide⟧` pour un champ facultatif (sa ligne disparaît s'il est vide).

### Gérer ses apps depuis l'Atelier (v1.16)

Onglet **Gestion** dans la fiche de chaque app construite sur le kit « App complète ». Aucune connexion à la base à
régler : l'Atelier parle à l'app par son API d'administration, avec son adresse et une clé.

1. Gestion › Connexion › **Générer une clé**. Copie-la chez l'hébergeur dans la variable `ADMIN_API_KEY`, redémarre l'app.
2. Saisis l'adresse de l'app, puis **Enregistrer et tester**.
3. Ensuite : **État** (version, base, variables définies ou absentes, alertes, optimisation, migrations), **Données**
   (un tableur par table : rechercher, filtrer, trier, double-clic pour modifier une case, ajouter, supprimer, CSV ; les
   liens s'affichent avec le nom de la ligne liée et se choisissent dans une liste), **Comptes** (créer, rôle, désactiver,
   mot de passe provisoire), **Journal**, **RGPD** (export, effacement), **Sauvegarde et réglages**.

Chaque app neuve a un compte `admin` / `adminadmin`, à changer à la première connexion ; l'onglet État le rappelle en
rouge tant que ce n'est pas fait. Il faut le serveur local (`node serveur.js`, http://localhost:8787) : il garde
l'adresse et la clé de chaque app dans `~/.atelier-blocs/gestion-apps.json` (lisible par toi seul) et relaie les appels ;
le navigateur ne voit jamais la clé (sauf à sa création, pour la copier, ou sur « Revoir la clé »).

### Les 9 kits fournis (v1.16)

Chaque kit est au format du KIT Techview : `README.md` (à lire d'abord, tableau des fichiers, essai rapide),
`PROMPT.md` (prompt d'entrée avec des ⟦…⟧ à remplacer), `KIT.md` (référence en sections numérotées, avec l'historique
des versions), des fichiers **prêts et testés** et un **outil de recette** (`node outils/verifier-….js` → « Conforme »
ou « Non conforme »). Ils sont installés avec leurs fichiers (onglet Fichiers du kit) et partent dans le pack pour Claude.

| Kit | Version | Fichiers prêts | Outil de recette |
| --- | --- | --- | --- |
| **App complète** (nouveau) | 1.0 | `modele/` : app Node + PostgreSQL qui tourne (variables déclarées et vérifiées, base créée et optimisée, comptes et rôles, compte admin / adminadmin, sécurité, journal, RGPD, API d'administration pour l'onglet Gestion), exemple « Suivi clients » | `verifier-app.js` : 20 règles ; `recette-app.js` : 26 scénarios sur une base jetable |
| Cybersécurité renforcée (obligatoire) | 2.0 | serveur Node protégé, en-têtes Netlify/Vercel, RLS, webhook Stripe | `verifier-securite.js` : 15 contrôles du code + 10 du site (`--url`) |
| Base projet | 2.0 | modèles PLAN, README-app, RECETTE, LIVRAISON, `atelier-app.json`, app livrée d'exemple | `verifier-livraison.js` : 14 contrôles, sur un dossier ou le ZIP livré |
| Base de données automatique | 1.0 | `db/migrer.js` (crée la base et les tables au démarrage), exemples | `verifier-base.js` : base jetable, 14 règles |
| Bases de données | 2.0 | méthode en 6 étapes, `MODELE-DONNEES.md`, exemple salon (1-n et n-n) | `schema-doc.js` : 14 contrôles sans base + `SCHEMA.md` avec diagramme |
| Socle PWA | 2.0 | `modele/` : coquille, routeur, `appli.api`, service worker, manifeste, icônes | `verifier-pwa.js` : 21 contrôles ; `servir.js` |
| Charte de base | 2.0 | `tokens.json`, `charte.css` (variables + composants), `apercu.html` | `verifier-charte.js` : couleurs, polices, ombres hors charte, contrastes calculés |
| Cybersécurité de base | 2.0 | `.env.example`, `.gitignore`, RLS, en-têtes | `verifier-securite.js --niveau base` |
| Affichage France | 2.0 | `affichage.js` (prix, dates, téléphones, pluriels), bandeau cookies CNIL, mentions légales, confidentialité, CGV | `verifier-affichage.js` : 12 contrôles |

**Télécharger** : bouton ZIP d'un kit, ou **Tout télécharger** (Kits) : un ZIP avec un dossier par kit.
**Importer un kit (ZIP)** accepte aussi ce ZIP de tous les kits (chaque dossier avec son `kit-atelier.json` est importé).
Les sources des kits sont dans `kits/` ; `python3 outils/construire-kits.py kits kit-base.js dist-kits` regénère
`kit-base.js` et les ZIP. Les anciennes versions (1.x) restent dans l'Atelier pour les apps qui les utilisent.

L'onglet Base de données d'une app importée suit les migrations dans l'ordre (`create table`, `alter table`
add/drop/rename/type/not null/default/clés, `create index`, `drop table`, `comment on`) : les descriptions des tables et
des colonnes s'affichent.

## Ce qu'on peut faire

| Écran | Rôle |
| --- | --- |
| Créer une app | Les trois étapes avec Claude (prompt + pack, conversation, import du ZIP) et l'option « composer avec des blocs » |
| Tableau de bord | Chiffres, alertes de sécurité, blocs à mettre à jour, **revenus de toutes les apps** (ce mois, mois dernier, 12 mois, graphique, tableau par app, import CSV multi-apps) |
| Veille technologique | Une idée d'app par jour avec tout son fonctionnement (écrans, données, API, stack, kits, mise en production, revenus) ; « Créer cette app » remplit le prompt ; nouvelles idées par l'IA |
| Apps | Catalogue : apps créées ici + fiches de postlocal, relancepro, livora, podology, training |
| Espace d'une app | Un clic sur une app ouvre son espace : vue d'ensemble, **Contenu** (apps créées ici), **Revenus**, **Publicités**, back-office (ses bases), et un onglet par bloc spécial (ex. Studio design de Livora) |
| Composeur | Glisser-déposer des blocs, réglages, aperçu téléphone, kits, conformité, thème, variables d'env, backend, versions, export ZIP |
| Blocs | Créer, modifier, versionner, importer et exporter des blocs |
| Kits | Créer, modifier, versionner, importer et exporter des kits ; gérer la liste des critères |
| Apps mobiles | Transformer une app HTML en app iOS et Android pour l'App Store et Google Play, **avec le même serveur** : projet Capacitor prêt à construire, icônes, écran de démarrage, adresse de l'API, cookies, diagnostic des règles des stores, **émulateur** (téléphones, tablettes, taille libre) et checklist de publication (v1.13) |
| Audit sécurité | Audit de cybersécurité d'une app de l'Atelier, d'un dossier ou ZIP de code, ou d'un site en ligne ; rapport noté (A à F) avec preuves masquées et plan d'action, en HTML, PDF ou JSON ; historique par app |
| Bases de données | Une ou plusieurs bases par app : concevoir toutes les tables (colonnes, types, clés, relations, index, règles d'accès), SQL de création, connexion à chaque base, comparer et appliquer le schéma, importer le schéma d'une base existante, voir et modifier les données, console SQL |
| Studio design | Personnage qui évolue avec le niveau (5 stades), skins par emplacement (fournis et créés : modèle, couleurs, motif), 8 compagnons × 4 paliers d'évolution, 12 exercices animés ; export d'un pack d'images SVG pour Livora ou générique |
| Prompt et pack | Cocher kits et blocs (ou partir d'une app) : prompt unique à copier ou télécharger (.md), et pack ZIP à joindre dans Claude |
| Réglages | Sauvegarde / restauration, serveur local |

**Fichier HTML unique** (v1.11, bouton du composeur) : l'app entière en un fichier à ouvrir en double-clic, CSS et JS
dans la page, script autorisé par son empreinte SHA-256 dans la CSP ; les données restent dans le navigateur de l'appareil.

L'export ZIP contient une PWA prête à héberger (`index.html`, `style.css`, `app.js`, manifest,
service worker, icône), un `.env.example` (noms des variables, jamais de valeur secrète) et,
si un bloc déclare des tables ou des fonctions, un dossier `supabase/` (tables avec règles RLS,
fonctions serveur, `config.toml`) et les étapes de déploiement dans le README de l'app.

## Blocs fournis

| Bloc | Rôle |
| --- | --- |
| Connexion | Supabase Auth : inscription, connexion, mot de passe oublié, déconnexion ; permet de réserver des écrans aux connectés |
| Paiement en ligne | Stripe Checkout : montant fixé côté serveur, webhook signé, historique « Mes paiements » (RLS) |
| Formulaire | Réponses envoyées dans Supabase (insertion seule) |
| Accueil, Page de texte, Liste, Coordonnées | Présentation et contenu |
| Coach avatar | Personnage qui évolue, skins, compagnons ; ajoute l'onglet **Studio design** dans l'espace de l'app (personnages et skins propres à cette app) |
| Statistiques | L'Atelier récupère d'un clic les revenus (paiements réussis, par mois) et les utilisateurs (total, actifs 30 j, nouveaux du mois) de l'app ; totaux seulement, aucune donnée personnelle |
| Verrou de l'appareil | Code d'accès local (empreinte PBKDF2), reverrouillage après inactivité ; protège les écrans réservés quand l'app n'a pas de serveur |
| Patients, Bilan podologique, Agenda, Facturation | Cabinet de santé : dossiers patients (consentement, export RGPD, archivage), bilan avec schéma des pieds annoté et PDF, rendez-vous du jour, factures numérotées non modifiables, PDF et export CSV. Versions 1.1.0 : mode équipe avec le Serveur du cabinet (praticien référent, partage du dossier médical, agenda et factures par praticien) |
| Serveur du cabinet, Équipe du cabinet | Cabinet de groupe (v1.12) : connexion e-mail + mot de passe + double authentification (TOTP), données sur l'API du cabinet (PostgreSQL chez un hébergeur HDS, données de santé chiffrées), rôles praticien / secrétariat / administrateur, Mon compte, gestion de l'équipe. L'API est livrée à part (`podologiciel-v2.zip`) |
| Journal d'accès, Sauvegarde chiffrée | Trace qui ouvre ou modifie quoi ; sauvegarde de toutes les données en fichier chiffré (AES-GCM 256) et restauration |
| Mode admin | Les administrateurs (liste dans le secret `ADMIN_EMAILS`) modifient les textes et les listes de l'app publiée, depuis le téléphone, sans la republier |

Sans clés Supabase (et toujours dans l'aperçu), Connexion et Paiement tournent en **mode démo** (comptes et paiements simulés).

## Kits

| Type | Ce qu'il fixe | Comment il s'applique |
| --- | --- | --- |
| Charte graphique | Couleurs, police, arrondis, CSS commun | Thème de l'app ; chaque app peut changer certaines valeurs (onglet Thème) |
| Cybersécurité | Mots de passe, HTTPS, CSP, écrans avec données personnelles réservés aux connectés | Appliqué à la génération et vérifié dans l'onglet Conformité |
| Affichage | Langue, devise, format des dates, mentions, bandeau cookies | `appli.prix()`, `appli.date()`, mentions et bandeau dans l'app |
| Règles libres | Toute règle écrite | Checklist dans l'onglet Conformité |

Chaque kit a aussi des règles écrites (obligatoires ou recommandées), cochées app par app.
Les kits marqués « par défaut » sont appliqués à chaque nouvelle app. Format d'un fichier : voir `kit-base.js`.

### Kits et prompt (sur le modèle du KIT Techview)

Comme `PROMPT.md` et `KIT.md`, un kit est aussi du texte pour l'IA. Il répond à des **critères**, qui sont les sections
du prompt : Contexte et objectif, Avant d'écrire la moindre ligne, Règles non négociables, Charte graphique et design,
Cybersécurité, Données et backend, Affichage et textes, Démarche attendue, Recette avant livraison, Livraison, Pièges connus.
La liste se modifie (Kits › Critères). Dans l'éditeur d'un kit :

- **Critères** : un texte par critère (vide = le kit ne dit rien sur ce point) ;
- **Règles** : chacune rangée sous un critère, obligatoire ou recommandée ;
- **Référence** : un texte long en annexe (on peut charger un `.md`, comme `KIT.md`) ;
- **Étiquettes** : pour filtrer les kits dans le générateur.

Champs à remplir : `[[Nom du client]]` (ou `⟦Nom du client⟧`) dans un texte devient un champ du générateur ;
`[[nom]]` et `[[description]]` sont remplis d'office.

Le **générateur** (menu Prompt, ou « Générer le prompt de l'app » dans l'onglet Kits du composeur) assemble les kits cochés :
présentation du projet et tableau des kits, une section par critère (textes, valeurs imposées, CSS commun, règles),
blocs, tables et variables de l'app si on part d'une app, checklist finale, références en annexe, consigne de fin.

## Bases de données

Menu **Bases de données** (ou bouton du même nom dans le composeur et sur la fiche d'une app existante).

- **Au moins une base par app**, et autant que nécessaire (« Autre base »). Moteur : Supabase (avec règles RLS) ou PostgreSQL.
- **Tables** : nom, description, colonnes (type, clé, obligatoire, unique, valeur par défaut, lien vers une autre table et
  comportement à la suppression), index. Conventions automatiques : `id uuid`, `cree_le`, `modifie_le` (mis à jour par un trigger),
  et pour Supabase la colonne `utilisateur` liée au compte connecté. Les tables des blocs (paiement…) s'affichent en lecture seule.
  Le bouton **Proposer avec l'IA** propose toutes les tables à partir de la description de l'app.
- **SQL** : script rejouable (crée ce qui manque, ne supprime rien), aussi inclus dans le ZIP de l'app
  (`supabase/migrations/0001_init.sql` pour la première base Supabase, `bases/<nom>.sql` pour les autres).
- **Connexion** (une par base) : champs ou chaîne `postgres://…`, TLS, vérification du certificat, option lecture seule.
  Le mot de passe est envoyé une fois au serveur local, qui le garde dans `~/.atelier-blocs/connexions.json` (droits 600) ;
  il n'est jamais renvoyé au navigateur ni mis dans l'export. Boutons : tester, créer la base, **comparer avec le schéma**
  puis **appliquer** (ajoute tables, colonnes, relations, RLS ; ne supprime jamais), **importer les tables** d'une base existante.
- **Données** : liste des tables, lignes paginées, tri, filtre, ajout, modification (double-clic sur une cellule, ou
  crayon pour toute la ligne) avec listes de valeurs possibles et confirmation avant d'écrire (v1.25, voir plus haut),
  suppression avec confirmation, console SQL (une instruction à la fois). En lecture seule, PostgreSQL refuse toute écriture.
- Supabase : la chaîne de connexion est dans Project Settings → Database → Connection string (URI, « Session pooler »).
- Le kit **Bases de données** (par défaut) met les règles de conception dans le prompt, et le prompt d'une app contient
  tout son modèle de données.

## Studio design et bloc « Coach avatar »

- Tous les dessins sont générés en **SVG** par `ab-design.js` (style manga de Livora : contour encre, vermillon, or) :
  nets à toutes les tailles, légers, et animés dans une simple balise `<img>` (respiration, clignement, exercices en boucle ;
  animations coupées si l'utilisateur demande moins d'animations).
- **Personnage** (v1.6, style héros de manga) : vraies formes musclées en aplats ombrés (cel-shading) et 5 stades
  de musculature selon le niveau, du gringalet (Débutant) au colosse (Légende : épaules en V, abdos en 8, veines,
  cheveux en pointes dorés, aura de flammes). Le visage se durcit à chaque stade. Peau et cheveux au choix.
- **Les vêtements épousent le corps** : chaque skin est redessiné pour la morphologie du stade.
- **Skins** : 6 emplacements (coiffure, vêtement, chaussures, accessoire, équipement, objet rare), 23 modèles,
  couleurs et motifs (rayures, pois, bandes, éclair, étoile, numéro). Les 14 objets de Livora sont fournis ;
  « Créer un skin » en ajoute autant qu'on veut (aperçu en direct sur le personnage).
- **Compagnons** : dragon, chien, chat, renard, panda, grenouille, koala, paresseux ; paliers 1, 5, 15, 30 (œuf et têtard au départ, couronne et aura dorée à la fin).
- **Rendu des images IA** (v1.8) : **3D par défaut** (mascottes de film d'animation, personnage 3D d'anime),
  ou dessin 2D manga au choix. Chaque rendu garde ses propres images.
- **Personnage IA** (v1.8) : le personnage du joueur façon manga de combat des années 90 (style décrit, jamais nommé :
  les générateurs refusent souvent de copier une œuvre), en masculin ou en féminin, personnalisable : peau, forme et
  couleur des yeux, couleur des cheveux, 13 coiffures, tenue, cheveux dorés au stade Légende. 5 stades du débutant mince
  à la légende très musclée ; chaque stade est généré à partir du précédent. Prompts téléchargeables en .md.
- **Compagnons IA** (v1.7) : chaque compagnon est redessiné par un générateur d'images à partir de son dessin actuel
  (même espèce, mêmes couleurs, style Livora). 4 paliers du mince au musclé : bébé tout fin, jeune athlète mince,
  adulte musclé, héros légendaire très musclé avec couronne et aura dorée ; il grandit dans l'image à chaque palier.
  Chaque palier est généré avec le précédent en référence, pour garder le même personnage. Sans clé : prompt
  (en anglais, mieux suivi par les générateurs) et images de référence à télécharger, puis import du résultat.
  Les illustrations sont gardées sur la machine (.webp) et remplacent les dessins SVG dans les packs.
- **Mouvements** : squat, fentes, squat bulgare, marche, gainage, gainage dynamique, pompes (classiques, genoux, déclinées), rowing haltère, tractions, burpees — dans la tenue du joueur et avec la silhouette musclée de son stade.
- **Pack Livora** : images rangées aux chemins de son AssetManager (`web/src/assets/avatar|companions|exercises/…`) + fiche d'intégration,
  et le **personnage vivant** : `components/AvatarManga.vue` + `design/moteurDesign.js` (sans dépendance ni appel réseau), qui dessine
  en direct le corps du niveau du joueur avec sa tenue, ou l'exercice demandé.
- **Bloc « Coach avatar »** (catégorie Motivation) : écran avec le personnage, barre d'XP, bouton de séance, garde-robe
  (skins débloqués selon la rareté : niveaux 1, 5, 10, 15, 25), compagnon qui évolue et exercices animés.

## Gestion app par app (v1.9)

- **Blocs spéciaux** : un bloc peut apporter un panneau de gestion (`panneau: 'design'`). Ajouté à une app créée ici,
  ou « branché » sur une app existante (fiche › Blocs branchés), il ajoute son onglet dans l'espace de l'app.
  Livora a le Studio design branché : ses skins et images IA sont rangés dans `app.design`, séparés des autres apps.
- **Contenu** : l'onglet Contenu du composeur réunit tous les textes et listes de l'app, bloc par bloc, avec l'aperçu.
  Avec le bloc **Mode admin**, ces mêmes textes se modifient depuis l'app publiée : table `contenu` en lecture publique,
  écriture uniquement par la fonction serveur `contenu-admin` (session vérifiée, e-mail confirmé et listé dans
  `ADMIN_EMAILS`, seuls les champs texte/liste déclarés sont acceptés, affichage toujours échappé). Sans Supabase
  (aperçu, démo), le mode admin est simulé sur l'appareil. Livora garde son contenu dans son code.
- **Revenus et publicités** : pas encore de source branchée, donc saisie à la main ou import CSV
  (colonnes `mois;source;montant;note`, plus `app` pour l'import global ; dates `2026-10`, `15/10/2026`… ;
  montants `1 234,56 €` ou `1,234.56` ; doublons sautés). Emplacements de pub par app (réseau, format,
  identifiant public, statut) ; une clé secrète collée par erreur est refusée. Ces données ne font pas partie
  des versions de l'app (restaurer une version ne les efface pas). Les connecteurs (AdMob, Stripe, stores)
  viendront plus tard, côté serveur.
- **Récupération automatique** (v1.10) : avec le bloc **Statistiques**, l'onglet Revenus a un bouton **Actualiser**
  et le tableau de bord un bouton **Tout actualiser**. `serveur.js` appelle la fonction `stats-atelier` de l'app avec
  un jeton partagé ; les lignes récupérées sont marquées « auto » et remplacées à chaque actualisation, les saisies
  manuelles restent. Mise en place pour une app (clé affichée dans l'onglet, ex. `CLUB`) :
  1. `openssl rand -hex 32` pour créer le jeton ;
  2. `supabase secrets set ATELIER_STATS_JETON=<jeton>` côté app ;
  3. dans le `.env` de `serveur.js` : `STATS_CLUB_URL=https://<projet>.supabase.co/functions/v1/stats-atelier`
     et `STATS_CLUB_JETON=<jeton>`, puis relancer le serveur.

  Une app qui n'est pas faite avec l'Atelier (ex. Livora en NestJS) peut être récupérée de la même façon : une route
  `POST` qui vérifie l'en-tête `x-atelier-jeton` et renvoie
  `{"format":"atelier-stats/1","devise":"EUR","revenus":[{"mois":"2026-10","montant":249.5,"nombre":5,"source":"Ventes"}],"utilisateurs":{"total":42,"actifs30j":17,"nouveauxMois":6}}`.

## Cybersécurité

- **Kit obligatoire « Cybersécurité renforcée »** : coché « Obligatoire pour toutes les apps », il est ajouté à chaque app
  (y compris les apps déjà créées, à leur ouverture) et ne peut pas être retiré. Il impose : mots de passe de 12 caractères
  avec minuscule, majuscule, chiffre et symbole (vérifiés dans l'app et par Supabase Auth via `supabase/config.toml`),
  HTTPS, CSP, en-têtes HTTP de sécurité (`_headers`, `vercel.json`), écrans avec données personnelles réservés aux connectés,
  et un **audit avant chaque export** : l'export est refusé tant qu'il reste un point critique ou élevé.
  Ses critères et ses 23 règles (OWASP Top 10, ASVS) vont dans le prompt ; sa référence contient la politique de sécurité complète.
- **Audit de sécurité** (menu Audit sécurité, bouton « Audit sécurité » du composeur et des fiches) : 53 contrôles alignés sur l’OWASP Top 10.
  - *App de l'Atelier* : modèle de l'app et tous les fichiers de son export.
  - *Code source* : un dossier ou un ZIP (Next, Vue, Express, Laravel…), lu dans le navigateur, rien n'est envoyé.
    Secrets et clés exposés, variables publiques sensibles, .env, XSS, eval, injections SQL et commande, RLS Supabase,
    webhooks non signés, montant fixé par le client, CORS, CSP, dépendances avec failles connues (Next.js, axios, jsonwebtoken…).
  - *Site en ligne* (avec `serveur.js`) : HTTPS et certificat, redirection, en-têtes, cookies, CORS, fichiers exposés
    (.env, .git…), et analyse du HTML et des scripts réellement servis. Requêtes de lecture uniquement, à faire sur ses propres sites.
  - Rapport : note A à F (F dès qu'un point critique existe), score sur 100, évolution depuis l'audit précédent,
    plan d'action par délai, couverture OWASP, constats avec emplacement et extrait (secrets masqués), méthode et limites.
  - Analyse automatique : elle ne remplace pas un test d'intrusion par un professionnel.

## Apps mobiles : App Store et Google Play (v1.13)

Menu **Apps mobiles**, ou bouton **App mobile** du composeur et de la fiche d'une app.

- **Sources** : une app de l'Atelier (son export), un fichier HTML unique, le dossier ou le ZIP de l'app construite
  (`dist/` d'une app Vue/React/Vite ; dans un ZIP de projet complet, le dossier qui contient `index.html` est pris tout seul,
  ex. `api/public/` de PodoLogiciel v2), ou un **site en ligne** (obligatoire pour Next.js : PostLocal, RelancePro).
- **Même serveur** : l'app web est embarquée telle quelle avec `mobile-pont.js`, chargé en premier et inactif dans un navigateur.
  Dans l'app native il envoie les chemins de l'API (`/api/`…) vers l'adresse du serveur, remplace les adresses de développement
  oubliées (`http://localhost:4517` → `https://api…`), désactive le service worker, ouvre la feuille de partage pour les fichiers
  « téléchargés » et branche `window.print()` sur l'impression du téléphone (petit plugin natif fourni).
  **Réseau natif** (par défaut, CapacitorHttp) : pas de CORS, cookies de session gardés par l'app (même HttpOnly,
  SameSite=Strict, `__Host-`), aucun changement côté serveur. `SERVEUR.md` donne le CORS pour le mode « navigateur ».
- **Diagnostic** : appels relatifs, adresses locales, http non chiffré, ressources en ligne, impression, téléchargements,
  autorisations iOS (photos, caméra, position), règles Apple (4.2 site seul, 3.1.1 achats intégrés, 5.1.1 suppression de compte),
  compte de démo pour la revue (double authentification), données de santé.
- **Émulateur** : l'app tourne dans un iPhone, un Android ou une tablette (iPad mini, iPad 11", iPad Pro 13", tablettes Android)
  avec le pont mobile actif ; **taille libre** (largeur × hauteur ou poignée à tirer), rotation, zoom, iOS ou Android ;
  journal des appels au serveur (adresse finale), des partages et impressions, et des erreurs. Avec `node serveur.js`,
  l'app est servie à la racine de http://localhost:8788 comme dans l'app native (indispensable pour les apps Vite/React) ;
  sans serveur, aperçu rapide en une page.
- **Projet téléchargé** (Capacitor 8) : `npm run preparer` (ajoute iOS et Android, version et build, orientation, iPhone/iPad,
  textes d'autorisation, chiffrement déclaré, sauvegarde Android, icônes et écrans de démarrage en toutes tailles, synchronise),
  `npm run android`, `npm run ios`, `npm run emulateur:android`, `npm run emulateur:ios`, workflow GitHub pour construire
  l'Android (APK, ou .aab signé avec les secrets). Le numéro de build augmente à chaque export ; la config mobile ne fait pas
  partie des versions de l'app (le build ne recule jamais).
- **GUIDE-STORES.md** et l'onglet **Publier sur les stores** : ce que seul le propriétaire des comptes peut faire (comptes Apple 99 $/an
  et Google 25 $, Mac et Xcode, signature, fiches, confidentialité, revue), avec une checklist cochée app par app.

## Format d'un bloc

Un bloc est un fichier `bloc-<id>.js` (ou `.json`) qui s'importe dans l'atelier.
Exemples dans `bloc-base.js`.

```js
AB.blocs.declarer({
  id: 'mon-bloc', nom: 'Mon bloc', version: '1.0.0', categorie: 'Divers', icone: 'mdi-puzzle-outline',
  description: '…', dependances: [],
  reglages: [{ cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Bonjour' }],
  env: [{ cle: 'STRIPE_SECRET_KEY', role: 'Clé secrète Stripe', secret: true }],
  tables: [{ nom: 'paiements', colonnes: [['montant', 'decimal'], ['statut', 'texte']] }],
  serveur: [{ nom: 'creer-session', methode: 'POST', code: '…' }],
  ecrans: [{ id: 'principal', titre: '{{titre}}', icone: 'mdi-star', html: '<h1 class="titre">{{titre}}</h1>', css: '', js: '' }],
  journal: [{ version: '1.0.0', date: '2026-10-20', texte: 'Première version' }]
});
```

- Types de réglage : `texte`, `texte-long`, `nombre`, `couleur`, `booleen`, `choix`, `liste`.
- Types de colonne : `uuid`, `texte`, `texte-long`, `entier`, `decimal`, `booleen`, `date`, `date-heure`, `json`.
- Accès d'une table (`acces`) : `serveur`, `proprietaire`, `lecture-proprietaire`, `insertion-publique`, `lecture-publique` (traduits en règles RLS).
- `init` : code lancé au démarrage, avant les écrans (`reglages`, `appli`) ; `appli.fournir(nom, valeur)` partage un service.
- Fonctions serveur : `__INSTANCES__` est remplacé par les instances du bloc et leurs réglages ; `public: true` pour un webhook.
- HTML d'un écran : `{{cle}}` (valeur échappée), `{{#liste}}…{{.}}…{{/liste}}`, `{{?cle}}…{{/cle}}`.
  Classes prêtes : `titre`, `sous-titre`, `carte`, `btn`, `btn secondaire`, `champ`, `liste`, `hero`, `discret`.
- JS d'un écran : corps d'une fonction `(racine, reglages, appli)` avec
  `appli.aller(page)`, `appli.toast(texte)`, `appli.lire(table)`, `appli.enregistrer(table, ligne)`,
  `appli.attendre('supabase')`, `appli.utilisateur`, `appli.exigerConnexion()`, `appli.prix(n)`, `appli.date(d)`,
  `appli.kit('securite')`, `appli.config.NOM`, `appli.demo`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html`, `ab-style.css` | Coquille et style (couleurs en variables en tête du CSS) |
| `ab-utils.js` | Échappement, identifiants, dates, toasts, dialogues |
| `ab-db.js` | Stockage IndexedDB, sauvegarde |
| `ab-fichiers.js` | Fichiers joints (documents des kits, ZIP du code des apps), lecture de ZIP, panneau de fichiers |
| `ab-vue-nouvelle.js` | Créer une app › Nouvelle app : prompt d'entrée d'un kit rempli champ par champ |
| `ab-gestion.js` | Onglet Gestion d'une app « App complète » : clé, état, tableur des données, comptes, journal, RGPD, sauvegarde |
| `ab-code.js` | Code d'une app : import du ZIP livré par Claude, analyse (atelier-app.json, package.json, SQL, Prisma), versions |
| `ab-blocs.js` | Registre versionné commun, blocs : validation, gabarits |
| `ab-kits.js` | Kits : types, valeurs, critères, conformité |
| `ab-prompt.js` | Assemble plusieurs kits en un prompt |
| `ab-audit.js` | Moteur d'audit de sécurité (règles, lecture de dossier/ZIP, score) |
| `ab-rapport.js` | Rapport d'audit HTML imprimable |
| `ab-bases.js` | Bases de données : modèle, SQL, migration, import, appel au serveur local |
| `ab-design-ia.js` | Images par IA (3D ou 2D) : compagnons et personnage personnalisable, prompts, références, génération via le serveur local |
| `ab-design.js` | Moteur de dessin SVG : personnages, skins, compagnons, mouvements (aussi embarqué dans les apps) |
| `ab-rendu.js` | Génération de l'app (aperçu, fichiers PWA, `.env.example`, backend) |
| `ab-zip.js` | Création du ZIP sans librairie |
| `ab-ia.js` | Assistant « Décris ton app » |
| `ab-catalogue.js` | Fiches de départ des apps existantes |
| `ab-veille.js` | Veille technologique : catalogue des idées d'apps, idée du jour, fiche Markdown, génération par l'IA |
| `ab-catalogue-bases.js` | Tables des apps existantes (relevées dans leur code), ajoutées une fois à leur fiche |
| `ab-revenus.js` | Revenus et publicités par app (saisie, CSV, graphique) et total de toutes les apps |
| `ab-mobile.js` | Apps mobiles : lecture de la source, diagnostic, pont mobile, icônes, projet Capacitor, émulateur |
| `ab-identite.js` | Nom et logo à la création : propositions sans IA et par Claude, dessin des logos (SVG, PNG), section « Identité » du prompt |
| `ab-discussion.js` | Discussion avec Claude : menu Discussion et onglet Discussion de chaque app (contexte, réponses en direct ou à coller) |
| `ab-construire.js` | Reconnaît le code source d'une app (Vite, React…) et le fait construire par le serveur local pour l'aperçu et l'app mobile |
| `bloc-base.js`, `bloc-connexion.js`, `bloc-paiement.js`, `bloc-avatar.js`, `bloc-admin.js`, `bloc-stats.js`, `bloc-sante.js`, `bloc-sante-v1.js` (versions 1.0.0 gardées pour les apps existantes), `bloc-cabinet.js` | Blocs fournis |
| `kit-base.js` | Kits fournis (généré depuis `kits/`) : App complète, Cybersécurité renforcée (obligatoire), Base projet, Base de données automatique, Bases de données, Socle PWA, Charte de base, Cybersécurité de base, Affichage France, avec leurs fichiers |
| `kits/` | Sources des 9 kits (un dossier chacun : `kit.json`, README, PROMPT, KIT, fichiers prêts, outils de recette) |
| `outils/construire-kits.py` | Regénère `kit-base.js` et les ZIP téléchargeables à partir de `kits/` |
| `outils/assembler-html.py` | Regénère `atelier-blocs.html` (fichier unique) à partir de `index.html` : `python3 outils/assembler-html.py . > atelier-blocs.html` |
| `ab-vue-*.js` | Un fichier par écran |
| `ab-app.js` | Démarrage et routage (chargé en dernier) |
| `serveur.js` | Serveur local facultatif (fichiers, relais IA, collecte pour l'audit d'un site en ligne, connexions aux bases, relais vers l'administration des apps « App complète », émulateur des apps mobiles sur le port 8788) |
| `lancer-atelier.command`, `.bat`, `.sh` | Double-clic : démarre le serveur local et ouvre l'Atelier |
| `serveur-pg.js` | Client PostgreSQL sans dépendance (TLS, SCRAM-SHA-256, requêtes paramétrées), utilisé par `serveur.js` |
| `ab-avatars-app.js` | Avatars d'une app lus dans son code importé (reperes.json, calques, recoloration) pour le Studio design |
| `serveur-lancer.js` | Lance le serveur Node d'une app pour l'aperçu (dépendances, base PostgreSQL de test, variables de développement), utilisé par `serveur.js` |
| `serveur-construire.js` | Installation des dépendances et `npm run build` du code source d'une app, utilisé par `serveur.js` |
| `atelier-blocs.html` | Tous les fichiers ci-dessus réunis en un seul (généré) |

## Sécurité

- Aucun secret dans le navigateur : les blocs déclarent seulement le nom des variables ;
  un secret ne peut pas avoir de valeur (refusé à l'enregistrement).
- Mode admin : `ADMIN_EMAILS` et la clé de service restent dans les secrets Supabase ; le navigateur ne peut pas écrire
  dans la table `contenu`, seule la fonction serveur le fait après vérification.
- Statistiques : le jeton (32 caractères au moins) n'est que dans le `.env` de `serveur.js` et les secrets de l'app ;
  le navigateur n'envoie que la clé de l'app, jamais l'adresse ni le jeton ; le jeton ne part qu'en HTTPS ; la fonction
  le compare en temps constant, n'a pas de CORS et ne renvoie que des totaux, revérifiés par `serveur.js`.
- Valeurs échappées partout ; l'aperçu tourne dans une iframe `sandbox`.
- Construction du code source : elle lance npm (et les scripts des dépendances) sur ta machine, donc les routes
  `/api/construire` ne répondent qu'à l'Atelier ouvert depuis http://localhost:8787 (même origine, `X-Atelier`), jamais à
  une autre page ni au fichier local. Les clés de l'Atelier (`.env` de `serveur.js` : clés d'API, jetons) ne sont pas
  transmises aux commandes. Ne construis que du code dont tu connais la provenance.
- Gestion des apps : la clé `ADMIN_API_KEY` de chaque app reste dans `~/.atelier-blocs/gestion-apps.json` (droits 600) ;
  les routes `/api/gestion/` ne répondent qu'à l'Atelier ouvert depuis http://localhost:8787 (écritures avec `X-Atelier`),
  n'appellent que `<adresse>/api/admin/…` (chemins contrôlés), en HTTPS sauf pour une app sur la machine ou le réseau local.
  Côté app, la clé est comparée en temps constant, bloquée 15 minutes après 5 essais faux, et n'ouvre que l'administration ;
  chaque action faite depuis l'Atelier est au journal de l'app.
- `serveur.js` n'écoute que sur 127.0.0.1 et ne sert ni `.env` ni les fichiers cachés.
- Images par IA : la clé (OpenAI ou Gemini) reste dans `serveur.js` ; la route `/api/image` exige l'en-tête
  `X-Atelier`, n'accepte que des images PNG, WebP ou JPEG en référence (3 au plus) et un prompt de 4 000 caractères au plus.
- Bases : les routes `/api/db/` ne répondent qu'à l'Atelier ouvert depuis http://localhost:8787 (hôte, origine et
  en-tête vérifiés, pas de CORS) ; noms de tables et de colonnes contrôlés dans le schéma réel, valeurs toujours passées
  en paramètres ($1, $2…) ; mots de passe gardés côté serveur seulement. Les aides (v1.25) ne lisent que le catalogue
  PostgreSQL et les tables liées des schémas `public` et `auth` ; les valeurs déjà utilisées ne sont jamais lues pour une
  colonne sensible, unique ou clé. Une modification, son entrée au journal et la fermeture des connexions passent dans
  une même transaction.
