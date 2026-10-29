# Kit « Bases de données »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs.

Comment **concevoir** la base d'une app avant de la coder : entités, relations, types, clés, index, accès, données
personnelles. Le kit « Base de données automatique » prend ensuite le relais pour **créer** la base au démarrage de
l'app (migrations). Les deux kits ont les mêmes conventions et l'Atelier lit le même SQL.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier). |
| `KIT.md` | **Référence complète** : méthode en 6 étapes, conventions, relations, index, accès, évolutions, recette, pièges. |
| `modeles/MODELE-DONNEES.md` | **Modèle à remplir** avant le SQL : entités, relations, tables, écrans → colonnes, accès, données personnelles. |
| `outils/schema-doc.js` | Outil (pas livré avec l'app) : lit les migrations **sans base de données**, contrôle 14 règles et écrit `SCHEMA.md` (tableaux + diagramme Mermaid). |
| `exemples/salon/` | Exemple complet : salon de coiffure, 5 tables, relation 1-n et n-n, `SCHEMA.md` généré. |

## Essai rapide (Node 18+)

```bash
node outils/schema-doc.js exemples/salon/db/migrations --sortie /tmp/SCHEMA.md    # → « Conforme »
node outils/schema-doc.js ../mon-app/db/migrations                                # contrôle d'une app
```

## Testé

`exemples/salon` : « Conforme » ici, et appliqué sur PostgreSQL 16 avec `verifier-base.js` du kit « Base de données
automatique » (« Conforme », migrations rejouées sans erreur). Sur PodoLogiciel (8 tables) et PostLocal (4 tables) :
mêmes écarts que sur une vraie base (index de clés étrangères, descriptions, `cree_le`).
