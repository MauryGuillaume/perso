# Kit « Bases de données » — référence complète

> **Version du kit : 2.0** (2026-10-22). Conception du modèle de données de toute app. La création automatique de la
> base au démarrage est dans le kit **« Base de données automatique »** (mêmes conventions).

## 1. Principes

- **Le modèle d'abord** : on écrit et on valide le modèle avant tout SQL et tout écran.
- **Le schéma fait foi** : le SQL des migrations (ou l'écran Bases de données de l'Atelier) est la référence. Aucune
  table ni colonne créée « à la main » en dehors.
- **Chaque donnée a sa place** : tout ce qui est affiché, saisi, filtré, trié ou compté dans un écran a sa colonne.
  `jsonb` seulement pour des réglages libres, jamais pour ce qui sert à chercher ou relier.
- **Au moins une base par app** ; une deuxième seulement si les données sont vraiment séparées (statistiques, archives).

## 2. Méthode en 6 étapes (`modeles/MODELE-DONNEES.md`)

1. **Entités** : les choses que l'app manipule, avec un exemple réel, qui les crée, qui les voit, combien.
2. **Relations** : pour chaque paire, 1-1, 1-n ou n-n, et ce qui se passe quand on supprime.
3. **Tables et colonnes** : une table par entité, une colonne par information, type et contraintes (§ 3).
4. **Écrans → colonnes** : chaque donnée de chaque écran pointe vers une colonne. Une donnée sans colonne = un oubli.
5. **Accès** : qui lit, qui écrit, quelle règle (RLS Supabase ou contrôle côté serveur).
6. **Données personnelles** : finalité et durée de conservation de chacune (RGPD).

Puis : `0001_init.sql`, `schema-doc.js` → « Conforme », et validation.

## 3. Conventions (PostgreSQL 13+ / Supabase)

| Sujet | Règle |
| --- | --- |
| Noms | Français, minuscules avec `_` ; tables au pluriel (`clients`, `rendez_vous`), colonnes au singulier |
| Clé | `id uuid primary key default gen_random_uuid()` |
| Dates de ligne | `cree_le timestamptz not null default now()` partout ; `modifie_le` sur les tables modifiables |
| Texte | `text` (avec `check (length(x) <= n)` si une limite compte), pas de `varchar` sans raison |
| Nombres | `integer` / `bigint` ; argent en `numeric(12,2)` ou en centimes `integer` — **jamais** `real` / `float` |
| Dates | `date` pour un jour, `timestamptz` pour un instant — **jamais** `timestamp` sans fuseau |
| Oui / non | `boolean not null default false` |
| Valeurs fermées | `text not null default '…' check (statut in ('…', '…'))` |
| Unicité | `unique` sur la colonne, `unique (a, b)` pour un couple |
| Archivage | `actif boolean` ou `archive_le timestamptz` au lieu de supprimer une donnée métier |
| Descriptions | `comment on table` et `comment on column` en français : l'Atelier et `SCHEMA.md` les affichent |

## 4. Relations

| Type | Comment | Exemple (`exemples/salon`) |
| --- | --- | --- |
| 1-n | Colonne `<table_au_singulier>_id` dans la table « plusieurs » + `references` + **index** | `rendez_vous.client_id → clients` |
| n-n | Table de liaison `<a>_<b>` avec les deux clés, clé primaire composée, index sur la 2ᵉ colonne | `rendez_vous_prestations` |
| 1-1 | Colonne `…_id unique` | profil ↔ compte |
| Utilisateur (Supabase) | `utilisateur uuid not null default auth.uid() references auth.users(id)` | |

`on delete` toujours écrit :

- `cascade` : la ligne n'a aucun sens seule (les prestations d'un rendez-vous supprimé) ;
- `set null` : la ligne survit sans le lien (rendez-vous d'un employé parti) ;
- `restrict` : on refuse de supprimer tant qu'il y a des liens (un client qui a des rendez-vous → on l'archive).

Une valeur qui change avec le temps (prix du catalogue) est **recopiée** dans la ligne qui l'utilise (`rendez_vous_prestations.prix`).

## 5. Index

- Chaque clé étrangère (obligatoire : sans index, les jointures et les suppressions deviennent lentes).
- Chaque colonne filtrée ou triée dans un écran (`rendez_vous.debut` pour l'agenda).
- `unique` crée déjà son index. Pas d'index « au cas où » sur une petite table.

## 6. Accès

- Supabase : `alter table … enable row level security` sur **chaque** table, une politique par opération, dans la même
  migration que la table (voir le kit « Cybersécurité renforcée », `exemples/supabase/rls.sql`).
- Serveur maison : chaque requête filtre sur l'utilisateur ou l'organisation (`where … and salon_id = $2`).
- Aucun mot de passe de base dans le code, le dépôt ou le navigateur : `DATABASE_URL` sur le serveur.

## 7. Évolutions

- Une évolution = un nouveau fichier de migration (`0002_…sql`) ; une migration appliquée ne se modifie plus.
- Additives et rejouables (`if not exists`) ; une colonne `not null` ajoutée a un `default`.
- Suppression ou changement de type : migration à part, après sauvegarde, avec accord écrit.
- Le détail (exécution au démarrage, verrou, transactions) est dans le kit « Base de données automatique ».

## 8. Dans l'Atelier de Blocs

- Écran **Bases de données** : concevoir les tables à la main, ou importer le SQL ; générer le SQL rejouable.
- App importée depuis un ZIP : l'onglet **Base de données** lit les migrations (`atelier-app.json` → `schema`) avec la
  même lecture que `schema-doc.js`.
- Le prompt de l'Atelier contient la section « Modèle de données » : Claude la reprend **exactement**.

## 9. Recette

### 9.1 Outil `outils/schema-doc.js` (sans base)

```bash
node outils/schema-doc.js db/migrations                       # contrôle
node outils/schema-doc.js db/migrations --sortie SCHEMA.md    # + documentation
```

| N° | Contrôle | Niveau |
| --- | --- | --- |
| 01 | Au moins une table | obligatoire |
| 02 | Migrations numérotées `NNNN_nom.sql` | obligatoire |
| 03 | Clé primaire sur chaque table | obligatoire |
| 04 | Chaque clé étrangère a un index | obligatoire |
| 05 | `on delete` écrit pour chaque relation | recommandé |
| 06 | Chaque table décrite (`comment on table`) | obligatoire |
| 07 | Pas de `real` / `float` / `double` | obligatoire |
| 08 | `timestamptz` (pas de `timestamp` sans fuseau) | obligatoire |
| 09 | Noms en minuscules avec `_` | obligatoire |
| 10 | `cree_le` sur chaque table | obligatoire |
| 11 | Montants en `numeric(12,2)` ou en centimes | recommandé |
| 12 | Colonnes non évidentes décrites | recommandé |
| 13 | Clés en `uuid` | recommandé |
| 14 | Relations vers des tables qui existent | obligatoire |

### 9.2 Sur une vraie base

`verifier-base.js` du kit « Base de données automatique » : applique les migrations sur une base jetable, les rejoue et
contrôle les mêmes règles sur le résultat réel.

### 9.3 À la main

Ajout, modification, suppression d'une ligne sur chaque table ; refus d'un lien vers une ligne inexistante, d'une
valeur hors `check`, d'un doublon `unique` ; (Supabase) refus de lire les lignes d'un autre utilisateur.

## 10. Pièges connus

- Un statut en texte libre (« Payé », « payée », « PAYE ») : toujours un `check` avec la liste fermée.
- Un prix lu dans le catalogue au moment de la facture : il change, la facture aussi. Recopier le prix.
- `on delete cascade` sur `clients` : supprimer un client efface toutes ses factures. Archiver à la place.
- Des noms anglais et français mélangés (`created_at` et `cree_le`) : choisir une fois pour toutes (le français ici).
- Une liste stockée dans une colonne texte (« coupe,couleur ») : c'est une relation n-n.
- `timestamp` sans fuseau : décalage d'une heure deux fois par an.

## 11. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : méthode en 6 étapes, modèle `MODELE-DONNEES.md`, outil `schema-doc.js` (14 contrôles sans base,
documentation Markdown + Mermaid, même lecture du SQL que l'Atelier), exemple salon (5 tables, 1-n et n-n) testé sur PostgreSQL 16.

### 1.0 — 2026-10-20

Première version : règles de conception dans l'Atelier.
