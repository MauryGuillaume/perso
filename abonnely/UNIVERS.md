# Univers graphique de Abonnely : Finance et confiance

Solide, posé et transparent, chaque chiffre est clair.

Couleurs **douces, pas agressives**, fond clair et calme. Les valeurs sont dans
`public/univers.css` ; les écrans n’utilisent que ces jetons, à travers les classes de `charte.css` et `socle.css`.

## Palette

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Couleur principale (barre, `theme-color`) | `--primaire` | `#0F766E` |
| Accent (boutons, liens, onglet actif) | `--accent` | `#94600A` |
| Fond / cartes | `--fond` / `--carte` | `#F5FBFA` / `#FDFEFE` |
| Texte / texte doux | `--texte` / `--doux` | `#1A2E2C` / `#58706E` |
| Teinte claire (pastilles, survols, onglet actif) | `--teinte` | `#FDF3E1` |
| Couleurs d’appoint (catégories, illustrations) | `--couleur-2` / `--couleur-3` | `#D5F2EE` / `#FBE9C6` |

Tous les textes sont à 4,5:1 au moins sur leur fond (contrôlé par `node outils/verifier-app.js`, règle 24).

## Typographie, formes, mouvement

- Titres : géométrique, moderne ; texte : système, nette (16px).
- Formes : équilibrées ; ombres : douce ; densité : normale.
- Motif de la barre et de l’accueil : losanges.
- Mouvement : doux (240ms) ; tout s’arrête si l’appareil demande moins d’animations.

## Pour les écrans

- **Icônes** : Traits réguliers, formes géométriques stables. Une seule famille dans toute l’app, en SVG dans `public/icones/`, couleur `currentColor`.
- **Illustrations** : Objets du quotidien (tickets, coffres, documents) en aplats sobres. L’illustration des écrans vides vient de `--illustration` (classe `vide` ou `illustration`) ;
  une illustration propre à l’app se range dans `public/illustrations/` et reprend la palette ci-dessus.
- **Ton des textes** : Clair et rassurant, vouvoiement, aucun jargon.
- Classes utiles : `carte`, `carte-teinte`, `carte-cliquable`, `btn`, `btn-secondaire`, `btn-discret`, `pastille`, `pastille-2`, `pastille-3`, `illustration`, `vide`.
- Interdit : couleur, police ou ombre écrite en dur dans les écrans (règle 24), police chargée depuis un CDN (bloquée par la CSP).
