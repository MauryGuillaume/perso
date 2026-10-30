# Kit « App complète » — référence complète

> **Version du kit : 1.3** (2026-10-30). Pour toute app avec des comptes et des données. Lis ce fichier en entier avant de coder.

## 1. Principe

L'app est construite sur un **socle prêt et testé** (dossier `modele/`). Ce socle fournit déjà tout ce qui revient dans
chaque app, et toujours de la même façon :

- **variables d'environnement** déclarées, typées et vérifiées au démarrage (§ 5) ;
- **base PostgreSQL créée automatiquement**, migrations appliquées dans l'ordre (§ 6), conventions d'une base optimisée (§ 9) ;
- **comptes** : première installation, connexion, rôles, mot de passe provisoire, sessions sûres (§ 10) ;
- **API d'administration** que l'Atelier de Blocs utilise pour gérer l'app (§ 12) : tableur des données, comptes,
  journal, RGPD, sauvegarde, réglages, état de la configuration et de la base ;
- **sécurité** : CSP stricte, protection CSRF, limite de requêtes, cookies HttpOnly, secrets jamais affichés ;
- **front** installable (PWA) avec ses écrans de compte et un admin de dépannage ;
- **charte commune des apps** (§ 17) : un socle de qualité commun (lisible, fluide, coloré, accessible) et un **univers
  graphique propre à chaque app** (palette, polices, formes, motif, illustrations, ton), les rôles `admin`, `vip` et `utilisateur` dans toutes les apps,
  la même offre (Gratuit avec pub, Premium sans pub), le même écran Abonnement et le même bandeau de pub, éteints
  tant que `PUB_ACTIVE` et `PAIEMENT_ACTIF` ne sont pas à 1.

Le travail sur une nouvelle app se limite à **trois endroits** :

| Où | Quoi |
| --- | --- |
| `app/app.js` | Nom, variables propres, rôles métier, offre (paliers), tables (libellés), RGPD, réglages, routes de l'API métier |
| `db/migrations/` | Les tables de l'app (SQL), une migration par évolution |
| `public/app-ecrans.js` | Les écrans de l'app |
| `public/univers.css` | L'univers graphique de l'app (fourni par l'Atelier, § 17.1) |

Tout le reste (`serveur.js`, `noyau/`, `public/noyau.js`, `public/charte.css`, `public/socle.css`) se **copie tel quel et ne se modifie
jamais** : `outils/verifier-app.js` le contrôle par empreintes (règle 02). Si le socle ne permet pas quelque chose,
dis-le-moi au lieu de le modifier : c'est une évolution du kit.

## 2. Fichiers

| Fichier | Rôle | Modifier ? |
| --- | --- | --- |
| `serveur.js` | Point d'entrée : variables → base → routes → écoute | non |
| `noyau/env.js` | Variables d'environnement du socle, lecture `env.get('CLE')`, `.env.example` | non |
| `noyau/base.js` | Création de la base, migrations, requêtes paramétrées, transactions | non |
| `noyau/http.js` | Serveur HTTP sans dépendance : routes, rôles, sécurité, erreurs en français | non |
| `noyau/comptes.js` | Comptes, mots de passe (scrypt), sessions, installation | non |
| `noyau/admin.js` | API d'administration (Atelier et admin de dépannage) | non |
| `noyau/journal.js` | Journal des actions sensibles | non |
| `noyau/offre.js` | Offre commune : paliers, rôle vip, abonnements, pub, paiement Stripe et RevenueCat (§ 17) | non |
| `noyau/migrations/*.sql` | Tables du socle : `utilisateurs`, `sessions`, `journal`, `reglages`, `jetons`, `abonnements` | non |
| `noyau/empreintes.json` | Empreintes du socle, de `charte.css` et de `socle.css` (règle 02) | non |
| `app/app.js` | **Déclaration de l'app** (exemple « Suivi clients » à remplacer) | **oui** |
| `db/migrations/*.sql` | **Tables de l'app** | **oui** |
| `public/index.html` | Page unique (titre, couleur) | titre et `theme-color` seulement |
| `public/noyau.js`, `public/socle.css` | Socle du front : API, routeur, écrans de compte et d'abonnement, bandeau de pub, dépannage | non |
| `public/app-ecrans.js` | **Écrans de l'app** | **oui** |
| `public/univers.css` | **Univers graphique de l'app** : palette, polices, formes, ombres, motif, illustration, rythme (jetons) | **oui, les valeurs** (§ 17.1, règles 24 à 26) |
| `public/charte.css` | Composants communs (cartes, boutons, champs, pastilles…), qualité de lecture et fluidité | non |
| `UNIVERS.md` | Direction artistique de l'app : palette, icônes, illustrations, ton des textes | oui (fourni par l'Atelier) |
| `public/affichage.js` | Kit « Affichage FR » | selon ce kit |
| `public/sw.js`, `manifest.webmanifest`, icônes | PWA | nom, couleurs, icônes, `VERSION` |
| `.env.example` | Toutes les variables, sans secret (généré : `npm run env:exemple`) | régénérer |
| `atelier-app.json` | Fiche de l'app pour l'Atelier (`"kit": "app-complete"`) | oui |
| `outils/verifier-app.js`, `outils/recette-app.js`, `outils/schema-doc.js` | Recette (§ 13), pas livrés en production | non |

## 3. Démarrer

```bash
npm install
cp .env.example .env            # puis remplir DATABASE_URL (et DB_CREER_BASE=1 sur ta machine)
npm start
# [base] base « mon_app » créée — migrations appliquées
# [installation] Compte admin par défaut créé : identifiant « admin », mot de passe « adminadmin » — à changer…
# [serveur] Mon app v1.0.0 prête sur le port 3000 (developpement)
```

**Compte admin par défaut** : sur une base sans admin, le démarrage crée l'identifiant **`admin`** avec le mot de passe
**`adminadmin`**. À la première connexion, l'app impose de le remplacer par un vrai mot de passe (`MDP_MIN` caractères) ;
tant que ce n'est pas fait, l'Atelier affiche une alerte rouge dans « État ». L'email et le nom du compte se changent
ensuite depuis l'Atelier (Comptes). Change-le **dès la mise en ligne** : tant qu'il garde `adminadmin`, n'importe qui
connaissant le kit peut prendre la main.

Avec `ADMIN_DEFAUT=0`, pas de compte par défaut : à la première ouverture, l'assistant demande le code d'installation
(`INSTALL_CODE`, ou celui affiché dans les journaux), crée le compte admin puis le nom de l'app.

## 4. Ce que fait le socle au démarrage

1. Lit les variables (système > `.env` hors production > défaut), **s'arrête net** si une obligatoire manque ou est invalide,
   avec la liste de ce qui ne va pas.
2. Crée la base si `DB_CREER_BASE=1`, puis applique `noyau/migrations` puis `db/migrations` sous verrou, chaque fichier
   dans une transaction ; une migration déjà appliquée et modifiée ensuite est signalée.
3. Branche les routes : comptes, `/api/admin/*`, `/api/sante`, puis `app.routes`.
4. Annonce l'installation si aucun admin n'existe, appelle `app.demarrage` si présent, écoute sur `PORT`.
5. Arrêt propre sur SIGTERM/SIGINT (connexions fermées).

## 5. Variables d'environnement

### 5.1 Variables du socle (toujours présentes)

| Variable | Type | Défaut | Rôle |
| --- | --- | --- | --- |
| `APP_ENV` | choix (developpement, production) | `developpement` | Environnement : « production » impose HTTPS, cookies sécurisés et toutes les variables obligatoires |
| `APP_URL` | url |  | Adresse publique de l’app (https://…), obligatoire en production **Obligatoire en production.** |
| `APP_NOM` | texte |  | Nom affiché de l’app (sinon celui de app/app.js ou du réglage partagé) |
| `PORT` | entier | `3000` | Port HTTP du serveur |
| `DATABASE_URL` | url |  | Connexion PostgreSQL : postgres://utilisateur:motdepasse@hote:5432/base **Obligatoire.** **Secrète.** |
| `DB_CREER_BASE` | booleen | `0` | 1 : créer la base si elle n’existe pas (serveur à toi) ; 0 chez un hébergeur qui la fournit |
| `DB_SSL` | booleen | `0` | 1 : connexion chiffrée à la base (base distante : Supabase, Neon, Scaleway…) |
| `DB_SSL_STRICT` | booleen | `1` | 0 seulement pour un certificat auto-signé |
| `DB_POOL_MAX` | entier | `10` | Connexions simultanées à la base |
| `ADMIN_API_KEY` | texte |  | Clé d’admin de l’Atelier de Blocs (générée par l’Atelier, 32 caractères minimum) : l’Atelier gère l’app avec elle **Obligatoire en production.** **Secrète.** |
| `ADMIN_DEFAUT` | booleen | `1` | 1 : sur une base sans admin, crée le compte « admin » / « adminadmin », à changer à la première connexion ; 0 : assistant d’installation avec INSTALL_CODE |
| `INSTALL_CODE` | texte |  | Code de première installation ; vide = un code est tiré au hasard et affiché dans les journaux du serveur **Secrète.** |
| `SESSION_HEURES` | entier | `12` | Durée d’une session sans activité, en heures |
| `MDP_MIN` | entier | `12` | Longueur minimale des mots de passe |
| `INSCRIPTION_OUVERTE` | booleen | `0` | 1 : chacun peut créer son compte ; 0 : comptes créés par un admin |
| `ORIGINES` | liste |  | Autres origines autorisées à appeler l’API (séparées par des virgules), en plus de APP_URL : https://…, capacitor://localhost (app mobile), null (aperçu de l’Atelier), * (toutes, ignoré en production) |
| `JETON_SECRET` | texte |  | Signature des jetons de connexion (front séparé, app mobile) ; vide = tirée au hasard à chaque démarrage. Obligatoire en production si l’app utilise les jetons **Secrète.** |
| `JETON_MINUTES` | entier | `15` | Durée du jeton d’accès, en minutes |
| `JETON_JOURS` | entier | `30` | Durée du jeton de renouvellement, en jours |
| `REQUETES_PAR_MINUTE` | entier | `300` | Limite de requêtes par adresse IP et par minute |
| `PUB_ACTIVE` | booleen | `0` | 1 : bandeau de publicité en bas de l’écran pour les paliers « avec pub » (Gratuit) ; 0 : aucune publicité |
| `ADMOB_BANNIERE_ANDROID` | texte |  | Identifiant du bloc d’annonces AdMob « bannière » Android (ca-app-pub-…/…) ; vide = bandeau maison (promotion de l’offre payante) |
| `ADMOB_BANNIERE_IOS` | texte |  | Identifiant du bloc d’annonces AdMob « bannière » iOS (ca-app-pub-…/…) ; vide = bandeau maison |
| `PAIEMENT_ACTIF` | booleen | `0` | 1 : les paliers payants peuvent s’acheter (Stripe sur le web, stores via RevenueCat sur mobile) ; 0 : écran Abonnement en « bientôt disponible » |
| `STRIPE_SECRET` | texte |  | Clé secrète Stripe (sk_live_… ou sk_test_…) pour l’abonnement sur le web **Secrète.** |
| `STRIPE_WEBHOOK_SECRET` | texte |  | Secret de signature du webhook Stripe (whsec_…), adresse : APP_URL/api/offre/stripe **Secrète.** |
| `STRIPE_PRIX` | liste |  | Prix Stripe de chaque palier et période : premium_mois=price_…,premium_an=price_… |
| `REVENUECAT_WEBHOOK_CLE` | texte |  | Valeur de l’en-tête Authorization du webhook RevenueCat (sans « Bearer »), adresse : APP_URL/api/offre/revenuecat **Secrète.** |
| `REVENUECAT_CLE_ANDROID` | texte |  | Clé publique du SDK RevenueCat pour Android (goog_…), achats dans l’app mobile |
| `REVENUECAT_CLE_IOS` | texte |  | Clé publique du SDK RevenueCat pour iOS (appl_…), achats dans l’app mobile |

Secrètes : `DATABASE_URL`, `ADMIN_API_KEY`, `INSTALL_CODE`, `JETON_SECRET`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `REVENUECAT_WEBHOOK_CLE`. Elles ne sont jamais affichées, journalisées ni renvoyées
par l'API : l'admin et l'Atelier voient seulement « définie » ou « absente ». En production, elles se saisissent dans les
variables de l'hébergeur, jamais dans un fichier livré. Le fichier `.env` est ignoré quand `APP_ENV=production`.

### 5.2 Variables propres à l'app

Elles se **déclarent** dans `app/app.js → variables`, avec le même format, puis se lisent par `env.get('CLE')` :

```js
variables: [
  { cle: 'RELANCE_JOURS', type: 'entier', defaut: '30', role: 'Jours sans contact avant relance' },
  { cle: 'STRIPE_SECRET', type: 'texte', secret: true, obligatoireEnProduction: true, role: 'Clé secrète Stripe' }
]
```

Types : `texte`, `entier`, `booleen` (1/0, oui/non), `url`, `choix` (avec `choix: [...]`), `liste` (virgules).
Options : `obligatoire`, `obligatoireEnProduction`, `secret`, `defaut`, `min` (longueur).
**Jamais de `process.env` ailleurs que dans `noyau/env.js`** (règle 05) : une variable non déclarée n'existe pas.
Après chaque ajout : `npm run env:exemple` pour régénérer `.env.example` (règle 08), et `npm run env:verifier` pour
voir l'état (secrets masqués).

## 6. La base : création et migrations

- `noyau/migrations/` : tables du socle (préfixe `socle-` dans `schema_migrations`). **Ne pas toucher.**
- `db/migrations/NNNN_nom.sql` : tables de l'app, `0001_init.sql` puis un fichier par évolution.
- Une migration appliquée ne se modifie plus jamais : toute évolution est un nouveau fichier.
- Rejouables (`if not exists`, `drop trigger if exists` puis `create trigger`), **sans `begin`/`commit`**.
- Une suppression (`drop table`, `drop column`), un `truncate` ou un changement de type va dans une migration à part,
  après sauvegarde, avec mon accord écrit dans le fichier : `-- accord : …` (règle 16).
- Les tables de l'app peuvent se lier au socle : `cree_par uuid references utilisateurs(id) on delete set null`.
- La fonction `maj_modifie_le()` est fournie par le socle pour les déclencheurs `modifie_le`.
- `npm run db:migrer` applique les migrations sans démarrer l'app.

## 7. API de l'app (`app/app.js → routes`)

```js
routes(r, { base, journal, env, erreur, offre }) {
  r.get('/api/clients', async (req, ctx) => ({ clients: await base.lignes('select … where nom ilike $1', ['%' + ctx.query.q + '%']) }));
  r.post('/api/clients', { role: 'commercial' }, async (req, ctx) => {
    if (!ctx.corps.nom) throw erreur(400, 'Le nom est obligatoire.');
    const client = await base.une('insert into clients (nom, cree_par) values ($1, $2) returning *', [ctx.corps.nom, ctx.utilisateur.id]);
    await journal(ctx, 'client_cree', client.id);
    return { client };
  });
}
```

- Méthodes `get`, `post`, `put`, `patch`, `delete` ; paramètres `/:id` dans `ctx.params`, requête dans `ctx.query`,
  corps JSON dans `ctx.corps` (1 Mo maximum), compte dans `ctx.utilisateur`.
- `role` : `'utilisateur'` (défaut : tout compte connecté, `vip` compris), `'admin'`, un rôle de `app.roles`, une liste, ou `'public'`
  (sans compte : à justifier dans le README, règle 13). L'admin passe partout.
- `palier` : `{ palier: 'premium' }` réserve la route aux comptes de ce palier ou plus (admin et vip compris) ; les autres
  reçoivent `402` avec `{ erreur, palier }`, et le front affiche l'invitation standard (§ 17.3). Une limite du palier
  (« 20 achats en Gratuit ») se contrôle avant l'ajout : `await offre.limite(ctx, 'achats', nombreActuel)`.
  Jamais de test `role === 'vip'` ni de calcul de palier maison (règle 23).
- Toutes les adresses sous `/api/`, sans reprendre celles du socle : `admin`, `session`, `installation`, `connexion`,
  `inscription`, `deconnexion`, `moi`, `sante`, `jetons`, `offre` (règle 12).
- **SQL toujours paramétré** (`$1`, `$2`…) ; un nom de table ou de colonne venu de l'extérieur passe par `base.ident()`
  après contrôle. Plusieurs écritures liées : `base.transaction(async c => { await c.query(…) })`.
- Erreurs : `throw erreur(statut, 'message en français')`. Les erreurs PostgreSQL courantes deviennent des messages
  clairs (valeur en double, lien impossible, format invalide, champ obligatoire, règle de la base).
- Actions sensibles (suppression, export, changement de droits) : `journal(ctx, 'action', cible, detail)`.

## 8. Écrans (`public/app-ecrans.js`)

```js
const { api, esc, toast, formulaire, ecran, aller } = window.appli;
ecran('#/clients', { titre: 'Clients', onglet: 'Clients' }, async vue => {
  const { clients } = await api('GET', '/api/clients');
  vue.innerHTML = `<ul class="liste">${clients.map(c => `<li>${esc(c.nom)}</li>`).join('')}</ul>`;
});
ecran('#/compte', { onglet: 'Compte' }, null);   // onglet vers l'écran « Mon compte » du socle
```

- `ecran(motif, { titre, onglet, role, pub }, fn)` : `onglet` ajoute l'écran à la barre du bas, `role` le réserve,
  `pub: false` retire le bandeau de pub de cet écran (plein écran, appareil photo).
- Offre : `appli.offre()` (palier, limites, paliers), `appli.aPalier('premium')`, `appli.exiger('premium')` (affiche
  l'invitation standard si le compte n'a pas le palier). Un bouton Premium porte la pastille `pastille-offre`.
- `api(méthode, adresse, corps)` envoie l'en-tête `X-Appli` et le cookie, et lève une erreur avec le message du serveur.
- **Toute donnée venue de la base passe par `esc()`** avant `innerHTML` (règle 18) ; montants et dates par `fr.*`
  (kit « Affichage FR ») ; formulaires par `formulaire(form, async données => …)` (bouton bloqué, erreur affichée).
- Aucun `<script>` ni `style=` ni `onclick=` en ligne : la CSP les bloque (règle 17). Les classes de mise en page
  sont dans `socle.css`, les couleurs dans `charte.css`.
- Le socle gère déjà : installation, connexion, inscription (si ouverte), mot de passe provisoire imposé,
  « Mon compte » (avec l'offre du compte), « Abonnement », le bandeau de pub, l'invitation à passer à l'offre payante,
  « Dépannage » (admin) et la redirection vers la connexion quand la session expire.

## 9. Base de données optimisée : conventions

| Sujet | Règle |
| --- | --- |
| Noms | Minuscules avec `_`, en français ; tables au pluriel |
| Clé | `id uuid primary key default gen_random_uuid()` |
| Dates de ligne | `cree_le timestamptz not null default now()` partout ; `modifie_le` + déclencheur `maj_modifie_le` sur toute table modifiable |
| Types | `text` (+ `check (length(…) between …)`), `integer`/`bigint`, **`numeric(12,2)` pour l'argent**, `boolean`, `date`, **`timestamptz`** ; jamais `real`/`float`, jamais `timestamp` sans fuseau |
| Relations | `<table>_id uuid references <table>(id) on delete …` (cascade, set null ou restrict, choisi) **+ un index** |
| Valeurs fermées | `text not null default '…' check (statut in ('…', '…'))` : l'Atelier en fait une liste déroulante |
| Unicité | `unique`, ou index unique partiel (`where email is not null`) |
| Recherche | index sur ce qui est filtré ou trié souvent (`lower(nom)`, `(client_id, date_le desc)`) |
| Descriptions | `comment on table` partout, `comment on column` pour chaque colonne non évidente : l'Atelier les affiche |
| Suppression | Pas d'effacement de données métier : `archive_le timestamptz` ou `actif boolean` |
| Données de départ | `insert … on conflict do nothing` dans une migration ; jamais de mot de passe en dur |

Ces règles sont contrôlées deux fois : sur les fichiers (`verifier-app.js`, règle 15) et sur la vraie base
(`recette-app.js`, règles 12 et 13), et l'Atelier les affiche en continu dans « État » (§ 12).

## 10. Comptes, rôles et sécurité

- Mots de passe scrypt, `MDP_MIN` caractères minimum, mêlant lettres et chiffres ou symboles ; jamais stockés ni journalisés en clair.
- Session : jeton aléatoire dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production ; seule son empreinte est en base ;
  durée `SESSION_HEURES` prolongée à chaque activité ; changement de mot de passe ou de rôle = sessions fermées.
- 5 échecs de connexion (même email ou même adresse) = 15 minutes d'attente ; même message pour compte inconnu et mauvais mot de passe.
- Comptes créés par l'admin ou l'Atelier : mot de passe provisoire, changement imposé à la première connexion.
  Mot de passe oublié : l'admin en génère un nouveau provisoire.
- Compte par défaut `admin` / `adminadmin` (§ 3) : changement de mot de passe imposé avant toute autre action,
  alerte dans l'Atelier tant qu'il garde ce mot de passe ; `ADMIN_DEFAUT=0` le supprime de la procédure.
- Rôles : `admin`, `vip`, `utilisateur` (socle, dans toutes les apps), plus les rôles métier de `app.roles` (§ 17.2).
  Le dernier admin ne peut pas être retiré ni supprimé.
- Écritures : en-tête `X-Appli`, jeton `Authorization: Bearer` ou corps JSON (`Content-Type: application/json`) obligatoire (CSRF : un
  formulaire d'un autre site ne peut envoyer aucun des trois). CORS limité à `APP_URL` et `ORIGINES`. Limite `REQUETES_PAR_MINUTE` par adresse.
- Taille des envois : 1 Mo par défaut ; une route qui reçoit plus (dessins, photos) le déclare : `r.patch('/api/x/:id', { limite: 25e6 }, fn)`.
- Erreurs renvoyées en `{ erreur, message }` (même texte), pour les fronts qui lisent l'une ou l'autre clé.

### 10.1 Front séparé ou app mobile : connexion par jetons

Quand l'écran n'est pas servi par l'app (front Vue/React/Vite sur une autre adresse, app mobile Capacitor, aperçu de
l'Atelier), le cookie de session ne suffit pas : l'écran envoie `Authorization: Bearer <jeton d'accès>`.

- Routes du socle : `POST /api/jetons` (`email`, `mdp` → `accessToken`, `refreshToken`, `utilisateur`),
  `POST /api/jetons/renouveler` (`refreshToken` → nouvelle paire ; l'ancien ne sert plus), `DELETE /api/jetons` (déconnexion).
- Jeton d'accès : JWT HS256 signé par `JETON_SECRET`, valable `JETON_MINUTES` ; à chaque requête le socle revérifie que le
  compte existe et est actif, applique le mot de passe provisoire et les rôles, comme pour la session.
- Jeton de renouvellement : aléatoire, à usage unique, `JETON_JOURS` ; seule son empreinte est en base (table `jetons`).
  Changement de mot de passe, de rôle, compte désactivé ou réinitialisé = jetons fermés.
- Si l'écran attend un autre contrat (ex. `/api/auth/login` → `{ status, tokens }`), l'app écrit ses routes avec les outils
  du socle : `comptes.verifierConnexion(ctx, email, mdp)`, `comptes.ouvrirJetons(ctx, u)`, `comptes.renouvelerJetons(ctx, jeton)`,
  `comptes.fermerJetons(id)`, `comptes.signerJeton(contenu, minutes)` / `comptes.lireJeton(jeton, sorte)` (étape 2FA, « voir en tant que »).
- Une route permise avec un mot de passe provisoire (profil, changement de mot de passe) le déclare : `{ mdpProvisoire: true }`.
- `ORIGINES` liste les adresses de l'écran : son site, `capacitor://localhost` et `https://localhost` (app mobile), `null` pour l'aperçu
  de l'Atelier ; `*` en développement seulement.
- En-têtes : CSP stricte (`'self'` uniquement), HSTS en production, `nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`.

## 11. RGPD

`app/app.js → rgpd` dit où se trouvent les données personnelles, table par table :

```js
rgpd: [{ table: 'clients', colonne: 'email', action: 'anonymiser', colonnes: ['nom', 'email', 'telephone'], conservation: '3 ans après le dernier contact' }]
```

- `colonne` : l'email de la personne, ou une colonne qui pointe vers `utilisateurs` (ex. `cree_par`).
- `action` : `anonymiser` (les `colonnes` sont vidées) ou `supprimer` (lignes effacées).
- `conservation` : durée écrite, reprise dans la politique de confidentialité (kit « Affichage FR »).
- L'Atelier fait l'**export** (toutes les données d'une personne, JSON) et la **suppression** (avec l'email recopié pour
  confirmer). Le compte de la personne est supprimé aussi ; tout est journalisé.

## 12. Gérer l'app depuis l'Atelier de Blocs

L'admin de l'app, c'est toi, depuis l'Atelier. Aucune connexion à la base à régler : l'Atelier passe par l'API
d'administration de l'app avec **l'adresse de l'app et sa clé `ADMIN_API_KEY`**.

1. Dans l'Atelier, fiche de l'app › **Gestion** › « Générer une clé ». L'Atelier la garde dans son serveur local
   (jamais dans le navigateur) et te dit où la coller chez l'hébergeur : variable `ADMIN_API_KEY`.
2. Saisis l'adresse de l'app (`APP_URL`), puis « Tester la connexion ».
3. Tu gères ensuite tout depuis l'Atelier :

| Onglet | Ce que tu fais |
| --- | --- |
| État | Version, base (taille, tables, lignes), migrations appliquées, variables (définie / absente, jamais la valeur d'un secret), alertes, contrôles d'optimisation |
| Données | Un tableur par table : chercher, filtrer, trier, modifier une cellule, ajouter, supprimer, exporter en CSV ; les liens s'affichent avec le nom de la ligne liée et se choisissent dans une liste |
| Comptes | Créer, changer le rôle, désactiver, générer un mot de passe provisoire, supprimer |
| Journal | Qui a fait quoi et quand (connexions, comptes, modifications de données, RGPD) |
| RGPD | Export et suppression des données d'une personne |
| Sauvegarde | Export lisible de toutes les tables (sans mot de passe) |
| Réglages | Paramètres partagés de l'app (nom affiché, `app.reglages`) |

- Les tables du socle (`utilisateurs`, `journal`, `reglages`) se gèrent par leurs onglets ; `sessions` et
  `schema_migrations` sont cachées ; les colonnes sensibles (`mdp`, `hash`, `secret`, `token`, `jeton`) sont masquées.
- `app.tables` affine l'affichage : `libelle`, `affichage` (colonne qui nomme une ligne), `colonnesMasquees`,
  `colonnesLectureSeule`, `lectureSeule`.
- Chaque modification faite depuis l'Atelier est journalisée (acteur « Atelier »).
- Dans l'app, l'écran « Dépannage » (admin) reste minimal : état, variables, comptes, mot de passe provisoire.

Adresses : `GET /api/admin/etat`, `GET /api/admin/tables`, `GET|POST /api/admin/tables/:table`,
`PATCH|DELETE /api/admin/tables/:table/:id`, `GET /api/admin/tables/:table/choix`, `GET /api/admin/tables/:table/csv`,
`/api/admin/utilisateurs[/:id[/mdp]]`, `GET /api/admin/journal`, `GET /api/admin/rgpd`, `POST /api/admin/rgpd/supprimer`,
`GET /api/admin/sauvegarde`, `GET|PUT /api/admin/reglages`. Accès : session admin, ou `Authorization: Bearer <ADMIN_API_KEY>`
(comparaison à temps constant, 5 essais faux = 15 minutes de blocage, la clé n'ouvre que ces adresses).

## 13. Recette

### 13.1 Sans lancer l'app : `node outils/verifier-app.js`

| N° | Règle | Niveau |
| --- | --- | --- |
| 01 | Fichiers du kit présents | obligatoire |
| 02 | Noyau intact (noyau/, serveur.js, public/noyau.js, public/socle.css, public/charte.css non modifiés) | obligatoire |
| 03 | package.json : script start, kitAppComplete, pg déclaré | obligatoire |
| 04 | Pas de dépendance en plus de pg (chaque ajout se justifie) | recommandé |
| 05 | process.env lu uniquement par noyau/env.js (sinon : déclarer dans app/app.js → variables, puis env.get) | obligatoire |
| 06 | app/app.js se charge | obligatoire |
| 07 | Variables de l’app déclarées : CLE_EN_MAJUSCULES, type connu, rôle écrit, pas de doublon avec le noyau | obligatoire |
| 08 | .env.example à jour (node noyau/env.js --exemple) et sans valeur secrète | obligatoire |
| 09 | .gitignore exclut .env et node_modules | obligatoire |
| 10 | Aucun secret écrit dans le code (mot de passe de base, clé privée, clé d’API) | obligatoire |
| 11 | app/app.js : nom, version, tables et rgpd qui existent dans les migrations | obligatoire |
| 12 | Routes de l’app sous /api/, sans prendre les adresses du noyau (admin, session, moi…) | obligatoire |
| 13 | Aucune route de l’app ouverte sans compte (role public) sans raison écrite dans KIT/README | recommandé |
| 14 | Migrations de l’app numérotées sans doublon, distinctes du socle | obligatoire |
| 15 | Base optimisée : clés, index des liens, timestamptz, numeric, descriptions (schema-doc.js) | obligatoire |
| 16 | Pas de suppression ni de changement de type sans « -- accord » écrit dans la migration | recommandé |
| 17 | Front compatible CSP : aucun script, style ou onclick en ligne, ni eval | obligatoire |
| 18 | Données de la base échappées dans les écrans : ${esc(…)} et non ${x.champ} | obligatoire |
| 19 | Service worker : l’API n’est jamais mise en cache | obligatoire |
| 20 | atelier-app.json : kit app-complete, même version que app/app.js, admin /api/admin | obligatoire |
| 21 | Rôles : admin, vip et utilisateur viennent du socle ; chaque rôle métier a un id, un libellé et une description de ses droits | obligatoire |
| 22 | Offre au format commun : gratuit d'abord, 3 paliers au plus, prix TTC mois/an et avantages des paliers payants, le plus haut sans pub | obligatoire |
| 23 | Pub, paiement et droits passent par le socle (aucun SDK de pub ou de paiement, aucun test du rôle vip dans le code de l'app) | obligatoire |
| 24 | Univers graphique propre à l'app, socle commun : tous les jetons présents, textes à 4,5:1, app colorée, texte à 16 px, animations ≤ 400 ms, rien en dur dans les écrans | obligatoire |
| 25 | theme-color de index.html = --primaire d'univers.css | recommandé |
| 26 | Couleurs douces par défaut (vives seulement si `--intensite: vive`), fond et cartes très clairs | recommandé |

### 13.2 De bout en bout : `node outils/recette-app.js postgres://…/postgres`

Sur un serveur PostgreSQL **de test** : l'outil crée une base jetable, lance l'app avec des variables de test, joue
les scénarios, arrête l'app et supprime la base.

| N° | Scénario | Niveau |
| --- | --- | --- |
| 01 | Refuse de démarrer si une variable obligatoire manque, en le disant | obligatoire |
| 02 | Démarre sur une base neuve : base créée, migrations du socle et de l’app appliquées | obligatoire |
| 03 | Santé et en-têtes de sécurité (CSP sans unsafe-inline, nosniff, DENY) | obligatoire |
| 04 | Première installation : code exigé, compte admin créé, cookie HttpOnly | obligatoire |
| 05 | Installation impossible une seconde fois | obligatoire |
| 06 | Écriture refusée sans en-tête X-Appli, jeton ni corps JSON (CSRF) | obligatoire |
| 07 | Connexion : même message pour compte inconnu et mauvais mot de passe, bonne connexion acceptée | obligatoire |
| 08 | Mot de passe trop court refusé | obligatoire |
| 09 | Clé de l’Atelier : acceptée sur l’admin, refusée si fausse et hors admin | obligatoire |
| 10 | Aucun secret renvoyé par l’état (clé, code, mot de passe de base) | obligatoire |
| 11 | Toutes les variables obligatoires définies | obligatoire |
| 12 | Base optimisée sur la vraie base (clés, index des liens, fuseaux, montants) | obligatoire |
| 13 | Tables décrites et datées (cree_le) | recommandé |
| 14 | Chaque table se lit dans le tableur de l’Atelier | obligatoire |
| 15 | Colonnes sensibles masquées (mots de passe, jetons) | obligatoire |
| 16 | Ajout incomplet refusé avec un message clair (colonnes obligatoires) | obligatoire |
| 17 | Le tableur exige une session admin ou la clé | obligatoire |
| 18 | Compte créé par l’admin : mot de passe provisoire, changement imposé, pas d’accès admin | obligatoire |
| 19 | Routes de l’app fermées sans connexion | obligatoire |
| 20 | Journal : installation, connexions refusées, comptes ; jamais de mot de passe | obligatoire |
| 21 | RGPD : export des données d’une personne, suppression avec confirmation | obligatoire |
| 22 | Sauvegarde lisible sans mot de passe ni session | obligatoire |
| 23 | Réglages partagés modifiables depuis l’Atelier | obligatoire |
| 24 | Le dernier admin ne peut pas être retiré | obligatoire |
| 25 | Redémarrage sur la même base sans rien réappliquer | obligatoire |
| 26 | Compte admin par défaut (admin / adminadmin) : créé, changement imposé (confirmation vérifiée), alerte dans l’Atelier jusqu’au changement | obligatoire |
| 27 | Connexion par jetons : accès par jeton, renouvellement à usage unique, jeton falsifié refusé, déconnexion | obligatoire |
| 28 | Offre commune éteinte par défaut : pas de pub, paiement fermé, webhooks non configurés refusés | obligatoire |
| 29 | Rôles : admin, vip et utilisateur toujours présents, plus les rôles métier de l'app | obligatoire |
| 30 | VIP : tous les avantages du palier le plus haut sans payer, sans pub, sans droit d'administration ; utilisateur au palier gratuit | obligatoire |
| 31 | Publicité : un seul bandeau, seulement pour les paliers avec pub (PUB_ACTIVE=1) | obligatoire |
| 32 | Abonnement offert depuis l'Atelier : palier donné tout de suite, retiré à l'expiration | obligatoire |
| 33 | Webhooks de paiement : signature Stripe et clé RevenueCat vérifiées, abonnement ouvert puis fermé | obligatoire |

### 13.3 À la main

Parcours de chaque écran sur téléphone (390 px) et ordinateur ; chaque formulaire avec une erreur ; un compte de chaque rôle
(utilisateur, vip, chaque rôle métier) ; avec `PUB_ACTIVE=1` : le bandeau en Gratuit, rien en VIP ; l'écran Abonnement ; import du ZIP dans
l'Atelier puis Gestion › Tester la connexion › Données : chaque table s'ouvre, une cellule se modifie.

## 14. Mise en ligne

1. Hébergeur Node 18+ avec PostgreSQL (Scalingo, Render, Railway, Clever Cloud, un VPS…) ou base séparée (Neon, Supabase : `DB_SSL=1`).
2. Variables chez l'hébergeur : `APP_ENV=production`, `APP_URL`, `DATABASE_URL`, `ADMIN_API_KEY` (générée par l'Atelier),
   `DB_CREER_BASE=0` si la base est fournie, plus celles de l'app. `INSTALL_CODE` si tu veux choisir le code.
3. Commande de démarrage : `npm start`. Les migrations s'appliquent seules à chaque démarrage.
4. Première ouverture : connecte-toi avec `admin` / `adminadmin` et choisis ton mot de passe **tout de suite**
   (ou, avec `ADMIN_DEFAUT=0`, assistant d'installation).
5. Dans `public/sw.js`, change `VERSION` à chaque livraison.

## 15. Ce que contient le ZIP livré

L'app complète (sans `node_modules` ni `.env`), `package-lock.json`, `.env.example` à jour, `atelier-app.json`
(`"kit": "app-complete"`, `"admin": { "api": "/api/admin" }`), un README (rôle de l'app, tableau des tables, variables
propres, routes publiques justifiées, **tableau des rôles et de leurs droits, tableau des paliers de l'offre**) et la sortie des deux outils de recette : **« Conforme »**.

## 16. Pièges connus

- Modifier un fichier du socle « pour aller plus vite » : la règle 02 échoue et les mises à jour du kit deviennent impossibles.
- `process.env.X` dans le code de l'app : la variable n'est ni vérifiée, ni dans `.env.example`, ni visible dans l'Atelier.
- Oublier l'index d'une clé étrangère : rien ne se voit avec 10 lignes, tout ralentit avec 100 000.
- `innerHTML` avec une donnée non échappée : une fiche client peut injecter du code dans l'écran de l'admin.
- `DB_CREER_BASE=1` chez un hébergeur qui fournit la base : droit refusé, l'app ne démarre pas.
- Une colonne `not null` ajoutée sans `default` à une table remplie : la migration échoue et l'app ne démarre pas.
- La clé `ADMIN_API_KEY` donne tous les droits d'admin : elle ne va que chez l'hébergeur et dans l'Atelier, jamais ailleurs.
  Si elle a fuité : nouvelle clé dans l'Atelier, puis remplacement chez l'hébergeur.

## 17. Charte commune des apps

Toutes les apps de l'Atelier se gèrent de la même façon et ont la même qualité d'usage, mais **chacune a son propre univers
graphique**, adapté à son besoin. Ce qui change d'une app à l'autre : son nom, son logo, son univers, ses rôles métier, le
contenu de ses paliers et ses prix. Tout le reste est fourni par le socle et contrôlé par les outils de recette.

### 17.1 Le style : un socle de qualité commun, un univers par app

**Le socle commun** (`public/charte.css` et `public/socle.css`, jamais modifiés) garantit dans toutes les apps :

- **lisibilité** : texte à 16 px au moins, interligne aéré, titres équilibrés, contraste 4,5:1 de tous les textes ;
- **confort** : boutons et champs de 44 px de haut, focus visible, zone de toucher sans délai ;
- **fluidité** : écrans qui entrent en douceur, boutons qui réagissent au toucher, feuilles qui glissent, toujours courts
  (≤ 400 ms) et coupés si l'appareil demande moins d'animations ;
- **disposition** : barre du haut avec le nom de l'app et le bouton du compte, contenu en cartes, onglets en bas (3 à 5,
  le dernier « Compte »), bandeau de pub juste au-dessus des onglets, messages en bas.

**L'univers de l'app** (`public/univers.css`, valeurs propres à l'app, et `UNIVERS.md`) est fourni par l'Atelier (Nouvelle
app › « Nom, logo et univers ») : il est déduit de la description de l'app (13 ambiances : soin, calme, nature, gourmand,
pro, finance, ludique, sport, culture, voyage, tech, élégance, communauté) puis ajustable, ou proposé par Claude. Il fixe :

| Jetons | Ce qu'ils règlent |
| --- | --- |
| `--primaire`, `--accent`, `--fond`, `--carte`, `--texte`, `--doux`, `--bordure`, `--teinte`, `--couleur-2`, `--couleur-3`, `--danger`, `--succes`, `--alerte`, `--sur-primaire`, `--sur-accent` | La palette (`--teinte` : fonds clairs des pastilles, survols et onglet actif ; `--couleur-2`/`-3` : catégories et illustrations) |
| `--barre-fond`, `--btn-fond` | Barre du haut et boutons : couleur pleine ou dégradé |
| `--police`, `--police-titres`, `--graisse-titres`, `--casse-titres`, `--lettrage-titres`, `--t-*` | La typographie |
| `--rayon`, `--rayon-btn`, `--rayon-champ`, `--trait`, `--ombre`, `--ombre-forte`, `--btn-ombre` | Les formes et le relief |
| `--motif`, `--motif-taille`, `--fond-motif`, `--illustration` | Le motif de la barre et de l'accueil, l'illustration des écrans vides |
| `--duree`, `--courbe`, `--e1` à `--e6` | Le rythme des animations et la densité |

- **Couleurs douces par défaut**, pas agressives : fond très clair, couleurs posées. **Vives** (`--intensite: vive`)
  seulement si le concept s'y prête (enfants, jeu, sport, fête). Toujours **colorées** : une app grise ne passe pas.
- Si `univers.css` est joint, il se copie **tel quel**. Sinon, pars de celui du modèle et choisis les valeurs selon le
  besoin, en suivant les mêmes principes. Une valeur peut changer, un nom de jeton jamais (règle 24).
- Polices : celles du système (les piles d'`univers.css`) ou des fichiers dans `public/polices/` déclarés par `@font-face`
  dans `univers.css` ; jamais de CDN (bloqué par la CSP). Images du motif et de l'illustration : SVG en `data:` ou fichier
  de `public/`.
- Les écrans n'utilisent que les classes de `charte.css` et `socle.css` : `carte`, `carte-teinte`, `carte-cliquable`,
  `btn`, `btn-secondaire`, `btn-discret`, `champ`, `liste`, `ligne`, `pastille`, `pastille-2`, `pastille-3`, `actions`,
  `illustration`, `vide`… Un fichier CSS propre à l'app (`public/app.css`) est permis pour la mise en page de ses écrans,
  uniquement avec les jetons : aucune couleur, police ni ombre écrite en dur (règle 24).
- `UNIVERS.md` donne la direction artistique à suivre dans tous les écrans : style des icônes (une seule famille, SVG
  dans `public/icones/`, `currentColor`), illustrations (`public/illustrations/`, dans la palette), ton des textes.
- `theme-color` de `index.html` et du manifeste = `--primaire` (règle 25) ; `background_color` du manifeste = `--fond`.

### 17.2 Les rôles

| Rôle | Fourni par | Droits |
| --- | --- | --- |
| `admin` | socle | Tout : comptes, réglages, dépannage ; tous les avantages du palier le plus haut. Compte `admin` / `adminadmin` créé d'office. |
| `vip` | socle | Tous les avantages du palier payant le plus haut, **sans payer**, sans publicité ; aucun droit d'administration. Donné par l'admin (Atelier › Comptes ou Dépannage). |
| `utilisateur` | socle | Compte standard ; ses avantages dépendent de son palier (Gratuit ou abonnement). |
| rôles métier | `app.roles` | Ceux dont l'app a besoin (ex. `praticien`, `secretaire`, `commercial`) : `{ id, libelle, description }`, la description dit ce qu'il peut faire. |

Avant de coder, Claude présente la **matrice des droits** : une ligne par action (voir, créer, modifier, supprimer,
exporter… chaque objet métier), une colonne par rôle, et pour chaque fonction payante le palier qui l'ouvre.
Un rôle métier se combine avec le palier : un `commercial` gratuit voit la pub, un `commercial` abonné ne la voit plus.

### 17.3 L'offre et l'abonnement

```js
offre: {
  paliers: [
    { id: 'gratuit', libelle: 'Gratuit', pub: true, limites: { achats: 20 }, avantages: ['Rappels par e-mail'] },
    { id: 'premium', libelle: 'Premium', pub: false, prix: { mois: 1.99, an: 14.99 }, essaiJours: 7,
      avantages: ['Achats illimités', 'Export ZIP', 'Sans publicité'] }
  ]
}
```

- Toujours le même modèle « freemium » : `gratuit` (avec pub et des limites qui se ressentent), puis `premium` (sans pub,
  tout débloqué) et, seulement si l'app le justifie, `pro` au-dessus. 3 paliers au plus ; le plus haut est sans pub.
- Prix TTC en euros, mensuel et annuel ; l'annuel coûte environ 7 à 8 mois (−30 à −40 %). `essaiJours` : essai gratuit
  au premier abonnement (Stripe ; sur mobile, l'essai se règle dans les stores).
- Palier d'un compte : admin et vip → le plus haut ; sinon le meilleur abonnement en cours (`abonnements`, actif ou
  résilié mais pas échu) ; sinon `gratuit`. Un abonnement offert s'ajoute depuis l'Atelier (Données › `abonnements`,
  source `manuel`, `fin_le` vide = sans fin).
- Écran **Abonnement** (`#/abonnement`, socle, identique partout) : l'offre du compte, la bascule Mensuel / Annuel avec la
  remise, une carte par palier (prix, avantages, limites), un seul bouton par carte, les mentions (prix TTC,
  renouvellement automatique, résiliation à tout moment, en quelques clics) et le lien « Gérer ou résilier ».
  Paiement éteint : « Bientôt disponible ».
- **Invitation** (socle, identique partout) : quand une route `{ palier }` ou une limite répond 402, une feuille monte du
  bas de l'écran avec les avantages du palier et un seul bouton « Voir l'offre … » ; sur un écran entier réservé, la carte
  « Cette fonction fait partie de l'offre … » remplace l'écran.
- Paiement (`PAIEMENT_ACTIF=1`) : sur le web, **Stripe Checkout** (`STRIPE_SECRET`, `STRIPE_PRIX`, webhook
  `APP_URL/api/offre/stripe` signé par `STRIPE_WEBHOOK_SECRET`, événements `checkout.session.completed` et
  `customer.subscription.*`) et le portail Stripe pour résilier ; dans l'app mobile, **RevenueCat** (achats App Store et
  Google Play, obligatoires pour un abonnement numérique sur mobile) : extension `@revenuecat/purchases-capacitor`, un
  « entitlement » et un « offering » par palier, nommés comme le palier (`premium`), paquets `$rc_monthly` et
  `$rc_annual`, webhook `APP_URL/api/offre/revenuecat` avec l'en-tête Authorization = `REVENUECAT_WEBHOOK_CLE`. Le bouton
  « Restaurer mes achats » est présent sur mobile. Un abonnement pris sur un support vaut sur les autres (même compte).

### 17.4 La publicité

- Un seul format dans toutes les apps : **un bandeau en bas de l'écran**, au-dessus des onglets, pour les paliers
  `pub: true` seulement. Jamais d'interstitiel, de vidéo imposée ni de pub dans le contenu.
- Jamais sur les écrans du socle (connexion, inscription, mot de passe, compte, abonnement, dépannage), ni pour admin ou
  vip, ni sur un écran déclaré `pub: false`. Le bandeau porte la mention « Pub » et le lien « Retirer la pub » vers
  l'écran Abonnement.
- `PUB_ACTIVE=0` (défaut) : aucune pub. `PUB_ACTIVE=1` sur le web : bandeau « maison » qui présente l'offre payante
  (aucune régie, aucun traceur, pas de bandeau cookies supplémentaire). Dans l'app mobile avec `ADMOB_BANNIERE_ANDROID` /
  `ADMOB_BANNIERE_IOS` : bannière AdMob adaptative (extension `@capacitor-community/admob`), précédée du formulaire de
  consentement de Google (UMP), obligatoire en Europe.

### 17.5 Mise en route, dans l'ordre

1. Version 1 : `PUB_ACTIVE=0`, `PAIEMENT_ACTIF=0`. L'offre est déclarée, l'écran Abonnement affiche « Bientôt
   disponible », les comptes vip et les abonnements offerts marchent déjà.
2. Pub : `PUB_ACTIVE=1` (bandeau maison sur le web) ; puis, avec l'app mobile et un compte AdMob, les identifiants
   `ADMOB_BANNIERE_*`.
3. Paiement : compte Stripe (web) et/ou comptes développeur Apple et Google + RevenueCat (mobile), variables ci-dessus,
   puis `PAIEMENT_ACTIF=1`. L'Atelier signale dans « État » une variable de paiement manquante.

## 18. Historique des versions du kit

### 1.3.0 — 2026-10-30

Un univers graphique propre à chaque app (§ 17.1). La charte se sépare en deux : `public/charte.css` (composants communs,
désormais contrôlé par empreinte comme `socle.css`) et `public/univers.css` (jetons propres à l'app : palette complète,
polices des titres et du texte, formes, ombres, barre et boutons en dégradé ou pleins, motif, illustration des écrans
vides, rythme et densité), avec `UNIVERS.md` pour la direction artistique. Couleurs douces par défaut. Socle plus fluide :
entrée des écrans, retour au toucher des boutons, feuilles qui glissent, onglet actif en pastille, illustration dans les
listes vides ; classes `carte-teinte`, `carte-cliquable`, `btn-discret`, `pastille-2`, `pastille-3`, `illustration`.
Règle 24 réécrite (jetons présents, 14 paires de contraste à 4,5:1 y compris dans les dégradés, app colorée, texte à
16 px, animations ≤ 400 ms, aucune ressource externe, ordre des feuilles), règle 25 sur `univers.css`, nouvelle règle 26
(couleurs douces, recommandée). Mise à jour d'une app 1.2.x : remplacer `public/charte.css`, `public/socle.css`,
`noyau/empreintes.json`, `outils/verifier-app.js` ; ajouter `public/univers.css` (généré par l'Atelier : fiche de l'app ›
Discussion « Propose-moi 3 univers », ou Nouvelle app) ; dans `index.html`, `<link rel="stylesheet" href="/univers.css">`
avant `charte.css` et `theme-color` = `--primaire` ; ajouter `/univers.css` aux `FICHIERS` de `sw.js` et changer
`VERSION` ; `kitAppComplete` à 1.3.0. Rien à changer dans `app/`.

### 1.2.1 — 2026-10-26

Écran « Mot de passe » : le premier champ s'appelle toujours « Mot de passe actuel » (il affichait « Mot de passe
provisoire » au premier changement, y compris pour `admin` / `adminadmin`), et un troisième champ « Confirmer le nouveau
mot de passe » est vérifié pendant la saisie et à l'envoi. `POST /api/moi/mdp` accepte `confirmation` (facultatif pour
les fronts séparés et les apps mobiles ; s'il est envoyé, il doit être identique à `nouveau`, sinon 400). Écrans
d'accueil (connexion, inscription, installation, mot de passe imposé) mis en forme : bandeau aux couleurs de l'app avec
le logo et le nom, carte en relief, bouton pleine largeur, bouton « Afficher » dans les champs mot de passe ; uniquement
avec les variables de la charte. Scénario 26 complété. Mise à jour d'une app 1.2.0 : remplacer `noyau/comptes.js`,
`noyau/empreintes.json`, `public/noyau.js`, `public/socle.css`, `outils/recette-app.js`, et `kitAppComplete` à 1.2.1 dans
`package.json` ; rien à changer dans `app/`.

### 1.2 — 2026-10-23

Charte commune des apps (§ 17) : rôles `admin`, `vip` (tous les avantages du palier le plus haut sans payer) et
`utilisateur` fournis par le socle, rôles métier décrits ; offre en paliers (`app.offre`), table `abonnements`
(migration `noyau/migrations/0003_offre.sql`), option `{ palier }` des routes et `offre.limite()`, écran Abonnement,
invitation et bandeau de pub communs, paiement Stripe et RevenueCat par webhooks, AdMob sur mobile ; tout est éteint par
défaut (`PUB_ACTIVE=0`, `PAIEMENT_ACTIF=0`). Contrôles 21 à 25 (rôles, offre, pub et paiement par le socle, charte,
theme-color) et scénarios 28 à 33. Mise à jour d'une app 1.1 : remplacer `serveur.js`, `noyau/` (dont la nouvelle
migration), `public/noyau.js`, `public/socle.css`, `outils/` ; ajouter `offre` et la `description` des rôles dans
`app/app.js`, puis `npm run env:exemple`.

### 1.1 — 2026-10-22

Connexion par jetons pour les fronts séparés et les apps mobiles (§ 10.1) : jeton d'accès signé, jeton de renouvellement à
usage unique (table `jetons`, migration `noyau/migrations/0002_jetons.sql`), routes `/api/jetons`, outils pour les routes de
connexion de l'app. `ORIGINES` accepte `capacitor://localhost`, `null` et `*` (hors production). Corps JSON accepté comme
protection CSRF, option `limite` des routes appliquée, option `mdpProvisoire`, erreurs en `{ erreur, message }`.
Recette : 27 scénarios. Mise à jour d'une app 1.0 : remplacer `serveur.js`, `noyau/` (dont la nouvelle migration),
`outils/` et `noyau/empreintes.json` ; rien à changer dans `app/`.

### 1.0 — 2026-10-22

Première version : socle serveur (variables déclarées, base et migrations automatiques, comptes, sessions, sécurité,
journal), API d'administration pour l'Atelier (état, tableur, comptes, journal, RGPD, sauvegarde, réglages), front PWA
avec écrans de compte et dépannage, exemple « Suivi clients », compte admin par défaut `admin` / `adminadmin` à changer à la première connexion,
`verifier-app.js` (20 règles) et `recette-app.js` (26 scénarios). Testé sur Node 22 et PostgreSQL 16.
