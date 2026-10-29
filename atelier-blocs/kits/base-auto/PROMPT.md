# Prompt d'entrée — app avec base de données automatique

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit**. Remplace les éléments entre ⟦ ⟧.
> Dans l'Atelier de Blocs, inutile : coche le kit dans « Prompt et pack », il est inclus dans le prompt et dans le pack.

---

Tu développes **⟦Nom de l'app⟧**. ⟦Décris en 3 à 6 lignes le besoin : utilisateurs, objets gérés, parcours principaux.⟧

L'app enregistre ses données dans une base **PostgreSQL** ⟦ou : Supabase⟧ que **l'app crée elle-même** grâce au kit
« Base de données automatique » joint.

## Avant d'écrire la moindre ligne

1. Lis **intégralement** `KIT.md`, puis `db/migrer.js` et les exemples de `exemples/`.
2. Établis le modèle de données complet : un tableau par table (colonne, type, obligatoire, défaut, unique, lien et
   `on delete`, description). ⟦Si un modèle de l'Atelier est fourni (section « Modèle de données » ou dossier `bases/`) : reprends-le exactement.⟧
3. Présente-le-moi en une page avec la liste des écrans, et attends ma validation.

## Règles non négociables

- **`db/migrer.js` est copié tel quel**, sans modification ; le serveur l'appelle au démarrage, avant d'écouter.
- Tout le schéma est dans `db/migrations/NNNN_nom.sql` : `0001_init.sql` puis un fichier par évolution.
  Une migration appliquée ne se modifie jamais. Aucune table créée ailleurs (ni à la main, ni par un ORM).
- Conventions du KIT.md § 3 : `id uuid`, `cree_le`/`modifie_le`, `numeric(12,2)` pour l'argent, `timestamptz`,
  clé étrangère + `on delete` + index pour chaque relation, `check` pour les valeurs fermées,
  `comment on` en français pour chaque table et chaque colonne non évidente.
- Aucun mot de passe de base dans le code ou le dépôt : `DATABASE_URL` en variable d'environnement.

## Livraison

- L'app complète en un ZIP, avec `db/`, `atelier-app.json` (`"schema": ["db/migrations"]`), `.env.example`
  (`DATABASE_URL`, `DB_CREER_BASE`, `DB_SSL`) et un README (tableau des tables, repartir d'une base vide).
- Le résultat de `node outils/verifier-base.js` : **« Conforme »**.

Commence par la lecture de `KIT.md`, puis présente-moi le modèle de données.
