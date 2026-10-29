# Kit « Base de données automatique » — référence complète

> **Version du kit : 1.0** (2026-10-22). Pour toute app qui enregistre des données. Lis ce fichier en entier avant d'écrire le modèle.

## 1. Principe

Personne ne crée la base ni les tables à la main. **L'app les crée elle-même** :

1. Au démarrage, le serveur appelle `db/migrer.js` (fourni, à copier tel quel) **avant** d'accepter des requêtes.
2. `migrer.js` crée la base si elle n'existe pas (`DB_CREER_BASE=1`), puis applique dans l'ordre de leur numéro les
   fichiers `db/migrations/0001_….sql`, `0002_….sql`… pas encore appliqués, **chacun dans une transaction**.
3. Chaque migration appliquée est notée dans la table `schema_migrations` (numéro, fichier, empreinte SHA-256, date) :
   un redémarrage ne rejoue rien, une nouvelle migration est appliquée une seule fois.
4. Un verrou (`pg_advisory_lock`) empêche deux serveurs de migrer en même temps.
5. Une migration en erreur est annulée en entier et **le serveur ne démarre pas** : jamais de base à moitié migrée.
6. L'Atelier de Blocs lit ces mêmes fichiers à l'import du ZIP de l'app : l'onglet **Base de données** affiche
   exactement les tables, colonnes, clés, relations, index et commentaires. Il suit les migrations dans l'ordre
   (`create table`, `alter table add/drop/rename column`, `alter column type/default/not null`, clés étrangères ajoutées,
   `create index`, `drop table`, `comment on`).

## 2. Avant de coder : le modèle

Présente d'abord le modèle complet, table par table, et attends la validation :

| Table | Colonne | Type | Obligatoire | Défaut | Unique | Lien (on delete) | Description |
| --- | --- | --- | --- | --- | --- | --- | --- |

- Chaque donnée affichée, saisie, filtrée, triée ou comptée dans un écran a sa colonne. Pas de fourre-tout JSON
  pour ce qui sert à chercher ou relier (`jsonb` seulement pour des réglages libres).
- Si le prompt contient une section « Modèle de données » ou si le pack contient `bases/*.sql`, le modèle vient de
  l'Atelier : reprends-le **exactement** (mêmes noms de tables et de colonnes) dans `0001_init.sql`. S'il manque
  quelque chose, propose-le au lieu de l'inventer.

## 3. Conventions (PostgreSQL 13+)

| Sujet | Règle |
| --- | --- |
| Noms | Minuscules avec `_`, en français ; tables au pluriel (`clients`, `rendez_vous`) |
| Clé | `id uuid primary key default gen_random_uuid()` (`create extension if not exists pgcrypto`) |
| Dates de ligne | `cree_le timestamptz not null default now()` partout ; `modifie_le` sur toute table modifiable, tenu par le déclencheur `maj_modifie_le` |
| Types | `text` (pas de varchar sans raison), `integer`/`bigint`, `numeric(12,2)` pour l'argent (**jamais** real/float), `boolean`, `date`, `timestamptz` (**jamais** timestamp sans fuseau) |
| Relations | Colonne `<table_au_singulier>_id` + `references <table>(id)` + `on delete` choisi (`cascade` si la ligne n'a pas de sens seule, `set null` si elle survit, `restrict` sinon) + **un index** |
| Valeurs fermées | `text not null default '…' check (statut in ('…', '…'))` |
| Unicité | `unique` sur la colonne ; `unique (a, b)` pour un couple |
| Descriptions | `comment on table` pour chaque table, `comment on column` pour chaque colonne non évidente, en français : l'Atelier les affiche |
| Suppression | On ne supprime pas une donnée métier : colonne `actif boolean not null default true` ou `archive_le timestamptz` |

Exemple complet : `exemples/db/migrations/0001_init.sql`.

## 4. Les migrations

- Dossier `db/migrations/`, fichiers `NNNN_description.sql` (4 chiffres, minuscules, `_`) : `0001_init.sql`, `0002_factures.sql`.
- **Une migration appliquée ne se modifie plus jamais** (`migrer.js` le signale) : toute évolution est un nouveau fichier.
- Rejouables : `create table if not exists`, `add column if not exists`, `create index if not exists`,
  `drop trigger if exists` puis `create trigger`, `create or replace function`.
- Additives : une colonne `not null` ajoutée à une table remplie a un `default`. Une suppression ou un changement de type
  va dans une migration à part, après sauvegarde et avec accord écrit.
- **Pas de `begin` / `commit`** dans les fichiers : `migrer.js` met chaque fichier dans une transaction.
  (Une instruction qui refuse les transactions, comme `create index concurrently`, n'a pas sa place ici.)
- Données de départ (rôles, catégories, réglages) : dans une migration, `insert … on conflict do nothing`.
  Jamais de compte avec un mot de passe écrit en dur.

## 5. Brancher `migrer.js`

```js
// server.js
const migrer = require('./db/migrer');

(async () => {
  await migrer();                                   // crée la base et les tables manquantes
  app.listen(process.env.PORT || 3000);
})().catch(e => { console.error(e.message); process.exit(1); });
```

```json
"dependencies": { "pg": "^8.13.1" },
"scripts": { "start": "node server.js", "db:migrer": "node db/migrer.js", "db:verifier": "node outils/verifier-base.js ." }
```

Exemple qui tourne : `exemples/serveur.js`. Appel avec options : `migrer({ url, creerBase, silencieux })`, renvoie la liste des fichiers appliqués.

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL `postgres://utilisateur:motdepasse@hote:5432/nom_de_la_base` — **secrète** |
| `DB_CREER_BASE` | `1` : créer la base si elle n'existe pas (serveur à toi, droit CREATEDB) ; `0` chez un hébergeur qui la fournit |
| `DB_SSL` | `1` pour une base distante (Supabase, Neon, Scaleway…) ; `DB_SSL_STRICT=0` seulement pour un certificat auto-signé |

## 6. Supabase

Même fonctionnement : `DATABASE_URL` = chaîne de connexion Postgres du projet, `DB_SSL=1`, `DB_CREER_BASE=0`.
En plus, dans la même migration que chaque table : `alter table … enable row level security` et ses `create policy` ;
une table liée à l'utilisateur a `utilisateur uuid not null default auth.uid() references auth.users(id)`.
Si le projet utilise la CLI Supabase, les mêmes fichiers peuvent vivre dans `supabase/migrations/` (`supabase db push`) :
le README le dit, et `atelier-app.json` indique `"schema": ["supabase/migrations"]`.

## 7. Prisma ou un autre ORM

Préfère le SQL ci-dessus. Si un ORM est imposé : migrations versionnées appliquées au démarrage
(`prisma migrate deploy`), jamais `prisma db push` ni `synchronize: true` en production, et `schema.prisma` livré.

## 8. Ce que contient le ZIP de l'app

- `db/migrations/*.sql`, `db/migrer.js` branché au démarrage, `npm run db:migrer` ;
- `atelier-app.json` avec `"schema": ["db/migrations"]` (voir `exemples/atelier-app.json`) ;
- `.env.example` avec `DATABASE_URL` (vide), `DB_CREER_BASE`, `DB_SSL` ;
- dans le README : le tableau des tables (rôle de chacune), comment repartir d'une base vide, la sortie de la recette.

`outils/verifier-base.js` ne part pas en production (outil de développement), mais peut rester dans le dépôt.

## 9. Recette (`outils/verifier-base.js`)

```bash
DATABASE_URL=postgres://postgres@localhost:5432/postgres node outils/verifier-base.js .
```

Il crée une base jetable sur ce serveur (la base de `DATABASE_URL` n'est pas touchée), applique toutes les migrations,
les rejoue, contrôle les règles, affiche les tables puis supprime la base jetable. Il faut **« Conforme »** :

| N° | Règle | Niveau |
| --- | --- | --- |
| 01 | Toutes les migrations s'appliquent sur une base vide | obligatoire |
| 02 | Un redémarrage ne rejoue rien | obligatoire |
| 03 | Migrations numérotées `NNNN_nom.sql` | obligatoire |
| 04 | Au moins une table | obligatoire |
| 05 | Clé primaire sur chaque table | obligatoire |
| 06 | Chaque clé étrangère a un index | obligatoire |
| 07 | Chaque table a un commentaire | obligatoire |
| 08 | `cree_le` sur chaque table | obligatoire |
| 09 | Dates-heures en `timestamptz` | obligatoire |
| 10 | Pas de nombre à virgule flottante | obligatoire |
| 11 | Noms en minuscules avec `_` | obligatoire |
| 12 | Colonnes non évidentes commentées | recommandé |
| 13 | Clés en `uuid` | recommandé |
| 14 | `modifie_le` sur chaque table modifiable | recommandé |

À la main ensuite : ajout, modification, suppression d'une ligne sur chaque table ; refus d'un lien vers une ligne
inexistante et d'une valeur hors `check` ; import du ZIP dans l'Atelier → mêmes tables dans l'onglet Base de données.

## 10. Pièges connus

- `DB_CREER_BASE=1` demande le droit CREATEDB : chez un hébergeur, la base existe déjà, mets `0`.
- Une colonne `not null` ajoutée sans `default` à une table remplie fait échouer la migration (et le démarrage).
- Renommer une colonne casse le code qui l'utilise : migration + code dans la même livraison.
- `on delete cascade` supprime en chaîne : à réserver aux lignes qui n'ont aucun sens seules.
- Les fichiers de `exemples/` montrent le format : ils ne vont pas tels quels dans l'app.
- Une migration éditée après coup n'est pas rejouée en production : la base réelle et le code divergent. Toujours un nouveau fichier.

## 11. Historique des versions du kit

### 1.0 — 2026-10-22

Première version : `db/migrer.js` (création de la base, migrations dans l'ordre, transactions, verrou, empreintes),
`outils/verifier-base.js` (14 règles), exemples, lecture des migrations par l'Atelier (v1.15). Testé sur PostgreSQL 16.
