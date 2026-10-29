# Prompt d'entrée — appliquer la charte de base

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit**. Remplace les éléments entre ⟦ ⟧.

---

L'app **⟦Nom de l'app⟧** doit suivre ma **charte de base**, jointe.

⟦Facultatif : pour cette app, la couleur principale est ⟦#xxxxxx⟧ et l'accent ⟦#xxxxxx⟧.⟧

## Avant d'écrire du CSS

1. Lis **intégralement** `KIT.md`, puis `charte/tokens.json`, `charte/charte.css` et `charte/apercu.html`.
2. Si l'app change des valeurs, mets-les à jour dans `tokens.json` **et** dans `:root` de `charte.css`, puis vérifie les
   contrastes avec l'outil (règle 02). Une valeur qui ne passe pas : propose-m'en une autre.

## Règles non négociables

- `charte/charte.css` est chargée en premier, copiée telle quelle (seules les valeurs de `:root` changent).
- Tout le reste du CSS n'utilise que les variables (`var(--primaire)`, `var(--police)`, `var(--rayon)`, `var(--ombre)`,
  `var(--e4)`…) et les classes prêtes (`btn`, `carte`, `champ`, `pastille`, `doux`, `erreur`…).
- Aucune couleur, police, ombre ou arrondi en dur. Si un besoin n'est pas couvert, **demande-moi** une évolution de la charte.
- Textes de 16 px minimum dans les champs, zones tactiles de 44 px, focus visible.

## Livraison

- `node outils/verifier-charte.js .` → **« Conforme »**, sortie collée dans le compte rendu.
- Captures de chaque écran à 390 px, comparées à `charte/apercu.html`.

Commence par la lecture de `KIT.md`.
