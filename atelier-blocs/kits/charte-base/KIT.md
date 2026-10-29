# Kit « Charte de base » — référence complète

> **Version du kit : 2.0** (2026-10-22). S'applique à toutes les apps de l'Atelier de Blocs, avec le kit « Socle PWA »
> ou n'importe quel front (HTML, React, Vue…).

## 1. Principes

- **Une seule source** : les valeurs vivent dans `charte/tokens.json` et dans `:root` de `charte/charte.css`. Le reste
  du code ne fait que les utiliser (`var(--…)`).
- **Rien en dehors de la charte** : pas de nouvelle couleur, police, ombre ou taille « pour cet écran ». Un besoin
  nouveau = une évolution de la charte (§ 7), demandée et validée.
- **Lisible d'abord** : contraste AA (4,5:1) pour tout texte, 16 px dans les champs, zones tactiles de 44 px.

## 2. Jetons

| Variable CSS | Jeton (`tokens.json`) | Valeur | Usage |
| --- | --- | --- | --- |
| `--primaire` | `couleurs.primaire` | `#001047` | Barre du haut, titres forts |
| `--sur-primaire` | `couleurs.sur-primaire` | `#ffffff` | Texte posé sur la couleur primaire |
| `--accent` | `couleurs.accent` | `#2962ff` | Boutons, liens, onglet actif, focus |
| `--sur-accent` | `couleurs.sur-accent` | `#ffffff` | Texte des boutons |
| `--fond` | `couleurs.fond` | `#f4f5f7` | Fond de page |
| `--carte` | `couleurs.carte` | `#ffffff` | Cartes, champs |
| `--texte` | `couleurs.texte` | `#101012` | Texte principal |
| `--doux` | `couleurs.doux` | `#5f626c` | Texte secondaire, libellés |
| `--bordure` | `couleurs.bordure` | `#e3e5ea` | Bordures, séparateurs |
| `--danger` / `--succes` / `--alerte` | `couleurs.…` | `#c62828` / `#2e7d32` / `#a15c00` | Erreurs, confirmations, avertissements |
| `--police` | `police` | Inter, puis polices système | Tout le texte |
| `--t-petit` … `--t-grand-titre` | `tailles` | 14 / 16 / 22 / 28 px | Tailles de texte (4 seulement) |
| `--rayon` | `rayon` | 12 px | Cartes, boutons ; champs : `calc(var(--rayon) - 4px)` |
| `--ombre` | `ombre` | douce, 2 niveaux | Seule ombre permise (`.carte-relief`) |
| `--e1` … `--e6` | `espacements` | 4 / 8 / 12 / 16 / 24 / 32 px | Marges et espacements |

La police Inter n'est pas chargée par la charte : sans elle, les polices système prennent le relais. Pour la charger,
héberge le fichier avec l'app (pas d'appel à un service tiers sans accord : RGPD).

## 3. Composants prêts (`charte.css`)

`btn`, `btn-secondaire`, `btn-danger` · `carte`, `carte-relief` · `champ` (libellé `span` + `input`/`select`/`textarea`,
`aria-invalid="true"` en erreur) · `pastille`, `pastille-succes`, `pastille-alerte`, `pastille-danger` · `titre`,
`grand-titre`, `doux`, `erreur`, `succes` · `barre`. Voir `charte/apercu.html`.

Un composant propre à l'app se construit **avec les variables** : `border: 1px solid var(--bordure); padding: var(--e3);`.

## 4. Contrastes

`tokens.json` liste les paires texte / fond utilisées (`contrastes`). L'outil calcule chaque rapport (formule WCAG 2.1) :
4,5:1 minimum. Valeurs actuelles : texte sur fond 17,4 ; doux sur carte 6,1 ; blanc sur accent 4,9 ; blanc sur primaire 18,0.
Ne jamais écrire du texte `--doux` sur `--bordure`, ni de l'`--accent` sur `--primaire`.

## 5. Adapter la charte à une app

Une app peut changer **les valeurs** (pas les noms) : sa couleur principale, son accent, son rayon.

1. Changer la valeur dans `tokens.json` **et** dans `:root` de `charte.css` (l'outil vérifie qu'elles sont identiques, règle 11).
2. Relancer l'outil : les contrastes (règle 02) doivent passer.
3. Dans l'Atelier : fiche du kit « Charte de base » → valeurs propres à l'app (elles partent dans le prompt).

## 6. Où charger la charte

- PWA vanilla (kit « Socle PWA ») : `charte.css` remplace le bloc `:root` de `style.css`, ou est chargée avant lui.
- React, Vue… : importée une fois à la racine (`import './charte.css'`) ; les composants utilisent `var(--…)`.
- Tailwind : les jetons dans `theme.extend` à partir de `tokens.json` ; aucune couleur de la palette par défaut.

## 7. Faire évoluer la charte

Une nouvelle couleur, taille ou ombre se décide une fois pour toutes les apps : nouvelle version du kit dans l'Atelier
(fiche du kit → Nouvelle version), avec la raison dans l'historique (§ 10). Jamais dans le code d'une seule app.

## 8. Recette

### 8.1 Outil `outils/verifier-charte.js`

```bash
node outils/verifier-charte.js .                              # l'app (prend charte/tokens.json de l'app s'il existe)
node outils/verifier-charte.js . --tokens ../charte/tokens.json
```

| N° | Contrôle | Niveau |
| --- | --- | --- |
| 01 | `tokens.json` lisible | obligatoire |
| 02 | Contraste ≥ 4,5:1 pour chaque paire de la charte | obligatoire |
| 03 | Fichiers CSS, HTML ou JS trouvés | obligatoire |
| 04 | Aucune couleur hors charte (hex, rgb, hsl) | obligatoire |
| 05 | Aucune police autre que `var(--police)` | obligatoire |
| 06 | Aucune ombre autre que `var(--ombre)` | obligatoire |
| 07 | Arrondis avec `var(--rayon)` | recommandé |
| 08 | Toutes les variables utilisées existent | recommandé |
| 09 | Logo ou icône défini | recommandé |
| 10 | Une seule feuille définit les variables | recommandé |
| 11 | Les variables ont les valeurs de `tokens.json` | recommandé |

La feuille qui définit `--primaire` dans `:root` est la source : ses couleurs ne sont pas contrôlées (règle 11 à la place).
Les dossiers `node_modules`, `dist`, `build`, `vendor`, `outils`, `exemples` et les fichiers `.min` sont ignorés.

### 8.2 À la main

- Chaque écran à 390 px et sur ordinateur, comparé à `charte/apercu.html` : mêmes boutons, cartes, champs, couleurs.
- Mode sombre du téléphone : l'app reste lisible (elle n'est pas obligée d'avoir un thème sombre).
- Navigation au clavier : le focus est visible partout.

## 9. Pièges connus

- Une couleur « juste un peu différente » (`#2a62ff`) : c'est une couleur hors charte, l'outil la signale.
- Une bibliothèque de composants (Bootstrap, MUI…) apporte ses propres couleurs et polices : à éviter, ou thème
  entièrement branché sur les variables.
- Un SVG d'icône avec `fill="#333"` : utiliser `fill="currentColor"`.
- Du texte gris clair « élégant » sur fond gris : contraste insuffisant.
- Changer `--accent` sans vérifier le blanc des boutons dessus (règle 02).

## 10. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : `tokens.json`, `charte.css` (variables + composants), `apercu.html`, outil de recette
`verifier-charte.js` (11 contrôles, contrastes WCAG calculés). `--doux` passe de `#6b6e78` à `#5f626c` (contraste 5,6
sur le fond au lieu de 4,7) ; ajout de `--alerte`, `--sur-primaire`, `--sur-accent`, tailles et espacements.

### 1.1 — 2026-10-20

Texte pour le prompt (critère design) et règle « aucune couleur hors charte ».

### 1.0 — 2026-10-20

Première version : couleurs, police, arrondi dans l'Atelier.
