# Kit « Base de données automatique »

**Version 1.0** (2026-10-22) — kit de l'Atelier de Blocs.

Pour toute app qui enregistre des données : **l'app crée elle-même sa base et toutes ses tables** (colonnes, clés,
relations, index, commentaires) au démarrage, puis applique chaque évolution une seule fois. Personne ne lance de SQL
à la main, et l'Atelier affiche la base dès l'import du ZIP de l'app.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** à donner à Claude (hors Atelier ; dans l'Atelier, le prompt généré contient déjà ce kit). |
| `KIT.md` | **Référence complète** : principe, modèle, conventions, migrations, branchement, Supabase, recette, pièges. |
| `db/migrer.js` | Le moteur : crée la base, applique les migrations dans l'ordre, verrou, transactions. **À copier tel quel, ne pas modifier.** |
| `outils/verifier-base.js` | Outil de recette (pas livré avec l'app) : base jetable, migrations appliquées puis rejouées, 14 règles contrôlées. |
| `exemples/db/migrations/` | Exemple : `0001_init.sql` (deux tables liées, déclencheur, commentaires) et `0002_…` (évolution). Format à suivre, à remplacer. |
| `exemples/serveur.js` | Branchement minimal : `await migrer()` avant d'écouter. |
| `exemples/atelier-app.json` | Fiche de l'app pour l'import dans l'Atelier (`"schema": ["db/migrations"]`). |

## Essai rapide (PostgreSQL 13+ et Node 18+)

```bash
npm install pg
DATABASE_URL=postgres://postgres@localhost:5432/essai_kit DB_CREER_BASE=1 node exemples/serveur.js
# [base] base « essai_kit » créée
# [base] migration appliquée : 0001_init.sql …
# puis http://localhost:3000/api/clients → []

DATABASE_URL=postgres://postgres@localhost:5432/postgres node outils/verifier-base.js .
# Recette des migrations : ✓ 01 … ✓ 14 — Conforme.
```

(Pour l'essai, copie d'abord `exemples/db/migrations` dans `db/migrations`.)

## Testé

`db/migrer.js` et `outils/verifier-base.js` ont été testés sur PostgreSQL 16 : création de la base absente, rejeu sans
effet, migration modifiée signalée, migration en erreur annulée en entier (code de sortie 1), deux serveurs qui
démarrent en même temps sur une base absente.
