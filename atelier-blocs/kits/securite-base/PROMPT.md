# Prompt d'entrée — cybersécurité de base

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit**. Remplace les éléments entre ⟦ ⟧.

---

L'app **⟦Nom de l'app⟧** doit respecter ma **cybersécurité de base**, jointe. ⟦Contexte : prototype / outil interne / petite app publique.⟧

## Avant d'écrire du code

1. Lis **intégralement** `KIT.md`.
2. Dans ton plan, pour chaque écran et chaque fonction serveur : qui a le droit, que se passe-t-il si l'entrée est
   fausse, quelle information fuit en cas d'erreur.

## Règles non négociables (KIT.md § 2)

- Aucun secret dans le navigateur, le dépôt ou un ZIP : variables du serveur, `.env.example` sans valeur.
- Règles d'accès sur chaque table ; un utilisateur ne lit et ne modifie que ses données.
- Entrées validées côté serveur, SQL paramétré, affichage échappé.
- HTTPS partout ; webhooks à signature vérifiée ; mots de passe gérés par un fournisseur éprouvé (10 caractères minimum).
- Si une règle bloque, arrête-toi et propose une solution au lieu de la contourner.

## Livraison

- `node outils/verifier-securite.js . --niveau base` → **« Conforme »**, sortie dans le compte rendu.
- Le tableau des variables d'environnement (public ou secret).

Commence par la lecture de `KIT.md`.
