# Prompt d'entrée — concevoir la base de données

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit** (et ceux du kit « Base de
> données automatique » si l'app crée sa base elle-même). Remplace les éléments entre ⟦ ⟧.

---

L'app **⟦Nom de l'app⟧** ⟦décris en 3 à 6 lignes ce qu'elle fait et pour qui⟧.
⟦Écrans prévus : …⟧ ⟦Base : PostgreSQL / Supabase.⟧

## Avant le moindre SQL

1. Lis **intégralement** `KIT.md`, puis `exemples/salon/`.
2. Remplis `modeles/MODELE-DONNEES.md` (étapes 1 à 5 du KIT.md § 2) : entités, relations, tables, écrans → colonnes,
   accès, données personnelles.
3. Présente-le-moi et **attends ma validation**. S'il te manque une information, pose la question au lieu d'inventer.

## Règles non négociables (KIT.md § 3)

- Noms en français, minuscules avec `_`, tables au pluriel ; `id uuid`, `cree_le`, `modifie_le` en `timestamptz`.
- Argent en `numeric(12,2)` (jamais `float`) ; valeurs fermées en `check (… in (…))`.
- Chaque relation : clé étrangère, `on delete` choisi et **index**. Une relation n-n a sa table de liaison.
- Chaque table et chaque colonne non évidente a son `comment on`.
- Aucune donnée personnelle sans finalité ni durée de conservation.

## Livraison

- `MODELE-DONNEES.md` validé, `db/migrations/0001_init.sql`, `SCHEMA.md` généré.
- `node outils/schema-doc.js db/migrations` → **« Conforme »**.

Commence par la lecture de `KIT.md`, puis présente-moi le modèle.
