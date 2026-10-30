# Univers graphique de Mon app : Pro et efficace

Net, structuré et sûr de lui, l’essentiel d’abord.

Couleurs **douces, pas agressives**, fond clair et calme. Les valeurs sont dans
`public/univers.css` ; les écrans n’utilisent que ces jetons, à travers les classes de `charte.css` et `socle.css`.

## Palette

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Couleur principale (barre, `theme-color`) | `--primaire` | `#36568C` |
| Accent (boutons, liens, onglet actif) | `--accent` | `#2E778A` |
| Fond / cartes | `--fond` / `--carte` | `#F5F7FB` / `#FDFEFE` |
| Texte / texte doux | `--texte` / `--doux` | `#1A212E` / `#636D7E` |
| Teinte claire (pastilles, survols, onglet actif) | `--teinte` | `#E4F5F9` |
| Couleurs d’appoint (catégories, illustrations) | `--couleur-2` / `--couleur-3` | `#D9E2F2` / `#D8DEF3` |

Tous les textes sont à 4,5:1 au moins sur leur fond (contrôlé par `node outils/verifier-app.js`, règle 24).

## Typographie, formes, mouvement

- Titres : géométrique, moderne ; texte : système, nette (16px).
- Formes : équilibrées ; ombres : nette (liseré) ; densité : normale.
- Motif de la barre et de l’accueil : grille.
- Mouvement : doux (240ms) ; tout s’arrête si l’appareil demande moins d’animations.

## Pour les écrans

- **Icônes** : Traits réguliers de 1,75 px, angles légèrement arrondis. Une seule famille dans toute l’app, en SVG dans `public/icones/`, couleur `currentColor`.
- **Illustrations** : Schémas et objets du métier, sobres, deux couleurs. L’illustration des écrans vides vient de `--illustration` (classe `vide` ou `illustration`) ;
  une illustration propre à l’app se range dans `public/illustrations/` et reprend la palette ci-dessus.
- **Ton des textes** : Professionnel et direct, vouvoiement, chiffres en avant.
- Classes utiles : `carte`, `carte-teinte`, `carte-cliquable`, `btn`, `btn-secondaire`, `btn-discret`, `pastille`, `pastille-2`, `pastille-3`, `illustration`, `vide`.
- Interdit : couleur, police ou ombre écrite en dur dans les écrans (règle 24), police chargée depuis un CDN (bloquée par la CSP).
