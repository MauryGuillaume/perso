# Kit « Charte de base »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs.

La base visuelle commune à toutes les apps : couleurs, police, tailles de texte, arrondis, ombre, espacements et
composants prêts (boutons, cartes, champs, pastilles). Une app peut changer certaines valeurs (sa couleur principale
par exemple) ; elle n'ajoute jamais de couleur, de police ou d'ombre en dehors de la charte.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier). |
| `KIT.md` | **Référence complète** : jetons, composants, contrastes, adaptation par app, recette, pièges. |
| `charte/tokens.json` | **Les valeurs de la charte** (couleurs, police, tailles, rayon, ombre, espacements, paires de contraste). |
| `charte/charte.css` | **Feuille prête et testée** : variables + composants. À copier telle quelle (seules les valeurs de `:root` changent). |
| `charte/apercu.html` | Aperçu visuel de référence : chaque écran de l'app doit lui ressembler. |
| `outils/verifier-charte.js` | Outil de recette (pas livré avec l'app) : 11 contrôles. |

## Essai rapide (Node 18+)

```bash
node outils/verifier-charte.js charte                 # la charte elle-même → « Conforme »
node outils/verifier-charte.js ../mon-app             # une app → couleurs, polices, ombres hors charte
```

Ouvre `charte/apercu.html` dans un navigateur pour voir la charte.

## Testé

`charte/` et le socle du kit « Socle PWA » : « Conforme ». Sur un fichier piégé (`#ff0000`, `Arial`, ombre maison,
variable inconnue) : les 3 règles obligatoires et 2 recommandations sont signalées, avec le fichier et la ligne.
Les 10 paires de contraste de la charte dépassent 4,5:1 (WCAG AA).
