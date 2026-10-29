# Kit « Socle PWA » — référence complète

> **Version du kit : 2.0** (2026-10-22). Base technique des apps mobiles en HTML, CSS et JavaScript vanilla.

## 1. Principes

- **Vanilla** : HTML, CSS et JavaScript, sans framework, sans build, sans dépendance côté navigateur. L'app s'ouvre en
  copiant le dossier sur un hébergement statique.
- **Mobile d'abord** : pensée pour 390 px, utilisable au pouce, puis élargie pour l'ordinateur (720 px de contenu au plus).
- **Installable et hors ligne** : manifeste + service worker ; l'app s'ouvre sans réseau après une première visite.
- **Même serveur pour le web et le mobile** : l'API est appelée par chemins relatifs (`/api/…`). L'écran Apps mobiles de
  l'Atelier transforme ensuite l'app en app App Store / Google Play sans toucher au serveur.

## 2. Fichiers (dossier `modele/`)

| Fichier | Rôle | À modifier ? |
| --- | --- | --- |
| `index.html` | Coquille : barre du haut, zone `#vue`, onglets `#onglets`, toast. CSP en `<meta>` | Titre, description, couleur, liste des scripts |
| `style.css` | Variables de la charte (`--primaire`, `--accent`, `--fond`, `--texte`, `--rayon`, `--police`) et classes prêtes | Valeurs des variables ; ajouts avec les variables seulement |
| `app.js` | `appli.esc`, `appli.api`, `appli.toast`, routeur par `#`, écrans `ECRANS` | Les écrans (à remplacer) |
| `sw.js` | Cache des fichiers de l'app, API jamais en cache | `VERSION` à chaque livraison, liste `FICHIERS` |
| `manifest.webmanifest` | Nom, couleurs, icônes, `display: standalone` | Nom, couleurs |
| `icone.svg`, `icone-180/192/512.png` | Icônes (unies, à remplacer) | Oui |

Une app plus grande range un écran par fichier : `ecran-accueil.js`, `ecran-clients.js`… chargés avant `app.js` et
déclarés dans `ECRANS` (`window.ECRANS_APP`), toujours sans module ni build.

## 3. Écrans et navigation

- Un écran = `{ titre, onglet?, rendre(racine, params) → nettoyage? }`. Adresse : `#/<clé>/<paramètre>`.
- 3 à 5 onglets au plus en bas ; le reste s'ouvre depuis un écran.
- `rendre` remplit `racine` et branche ses événements par propriété (`bouton.onclick = …`), jamais par `onclick=""` dans
  le HTML (CSP). Il renvoie une fonction de nettoyage s'il a lancé un minuteur ou un écouteur global.
- Toute valeur venue des données passe par `appli.esc()` avant `innerHTML` ; sinon `textContent`.
- Classes prêtes : `titre`, `carte`, `liste`, `champ`, `btn`, `btn-secondaire`, `doux`, `erreur`, `toast`.

## 4. Données et API

- `appli.api('/api/clients')`, `appli.api('/api/clients', { method: 'POST', corps: { … } })` : JSON, cookies du même site,
  message d'erreur lisible (`{ "erreur": "…" }` côté serveur), « Pas de connexion » si le réseau est coupé.
- Jamais d'adresse de serveur en dur dans le code : chemins relatifs. Jamais de clé secrète dans le navigateur.
- Pas de donnée personnelle ni de jeton dans `localStorage`. Un brouillon de formulaire non sensible peut y aller.
- Chaque action qui écrit affiche un état (bouton désactivé pendant l'envoi) puis un toast de confirmation ou l'erreur.

## 5. Service worker et installation

- `sw.js` met en cache les fichiers de l'app (cache d'abord, puis réseau) et **jamais l'API** (données possiblement personnelles).
- **`VERSION` change à chaque livraison** : sinon les téléphones gardent l'ancienne app.
- Enregistré seulement en http(s) (`file://` n'a pas de service worker) ; tester avec `outils/servir.js`.
- Manifeste : `name`, `short_name` (12 caractères environ), `start_url: "./"`, `display: "standalone"`, `lang: "fr"`,
  icônes SVG + PNG 192 et 512 (`maskable` pour Android), `apple-touch-icon` 180 pour iOS.

## 6. Accessibilité et confort mobile

- Zones tactiles de 44 px minimum ; champs de 16 px (sinon iOS zoome).
- Focus visible (`:focus-visible`), libellé sur chaque champ, `role="alert"` pour les erreurs, `aria-live` pour le toast.
- Marges de sécurité (`env(safe-area-inset-*)`) pour les écrans à encoche.
- Contraste suffisant ; `prefers-reduced-motion` respecté.
- Pas de défilement horizontal à 390 px.

## 7. Recette

### 7.1 Outil `outils/verifier-pwa.js`

```bash
node outils/verifier-pwa.js .
```

21 contrôles : `index.html`, `lang="fr"`, viewport, titre et description, theme-color, manifeste (valide, champs,
icônes 192/512, fichiers existants, langue), service worker (enregistré, présent, versionné, API exclue), fichiers liés
existants, vanilla, pas de `onclick=""`, CSP, API en chemins relatifs, `esc()` avant `innerHTML`, scripts externes en
version fixe. Il faut **« Conforme »**.

### 7.2 À la main

- Sur un vrai téléphone (iOS et Android) : chaque parcours de bout en bout ; installation sur l'écran d'accueil.
- Hors ligne après une première visite : l'app s'ouvre (mode avion puis réouverture).
- Nouvelle livraison : la nouvelle version s'affiche après réouverture (VERSION changée).
- Console sans erreur sur tous les écrans ; pas de défilement horizontal à 390 px.

## 8. Pièges connus

- Oublier de changer `VERSION` dans `sw.js` : les utilisateurs restent sur l'ancienne app.
- Mettre l'API en cache dans le service worker : données périmées ou personnelles visibles hors connexion.
- `onclick=""` dans le HTML : bloqué par la CSP.
- Une adresse `http://localhost:3000` oubliée dans le code : l'app mobile ne joint plus le serveur.
- Un champ en 14 px : iOS zoome à chaque saisie.

## 9. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : socle prêt et testé (`modele/`), outil de recette `verifier-pwa.js` (21 contrôles), serveur local de test.

### 1.0 — 2026-10-20

Première version : règles dans l'Atelier.
