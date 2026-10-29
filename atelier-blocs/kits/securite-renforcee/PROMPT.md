# Prompt d'entrée — sécurité d'une app

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit**. Remplace les éléments entre ⟦ ⟧.
> Dans l'Atelier de Blocs, inutile : ce kit est obligatoire, il est toujours dans le prompt et dans le pack.

---

Tu développes **⟦Nom de l'app⟧**. ⟦Décris en 3 à 6 lignes le besoin.⟧

La sécurité n'est pas une option : le kit « Cybersécurité renforcée » joint s'applique en entier.

## Avant d'écrire la moindre ligne

1. Lis **intégralement** `KIT.md`, puis les exemples de `exemples/`.
2. Dans ton plan, pour chaque écran et chaque route serveur, réponds aux trois questions du KIT.md § 2 :
   qui a le droit ? que se passe-t-il si l'entrée est malveillante ? quelle information fuit en cas d'erreur ?
3. Présente-moi le plan et attends ma validation.

## Règles non négociables

- Aucune clé secrète dans le front, le dépôt, les journaux ou un `.env` livré (KIT.md § 3).
- Montants, droits et statuts toujours décidés côté serveur ; contrôle d'accès sur chaque donnée (RLS ou équivalent).
- Entrées validées côté serveur, échappées à l'affichage ; ni `eval`, ni SQL concaténé.
- HTTPS + HSTS, en-têtes de sécurité (`exemples/_headers`), CORS limité aux origines de l'app.
- Webhooks à signature vérifiée ; erreurs génériques côté client.

## Livraison

- `node outils/verifier-securite.js .` → **« Conforme »**, puis avec `--url` sur le site publié.
- L'audit de sécurité de l'Atelier (note A ou B) et la liste des points restants avec leur justification.

Commence par la lecture de `KIT.md`, puis présente-moi ton plan avec les trois questions.
