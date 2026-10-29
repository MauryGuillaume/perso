# Kit « Cybersécurité de base »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs.

Le minimum de sécurité pour une petite app, un prototype ou un outil interne : secrets côté serveur, règles d'accès
sur chaque table, entrées validées, HTTPS, webhooks signés, données personnelles protégées. Pour une app publique qui
encaisse des paiements ou stocke beaucoup de données personnelles, utiliser **« Cybersécurité renforcée »** (obligatoire
par défaut dans l'Atelier) : les deux kits partagent le même outil de recette.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier). |
| `KIT.md` | **Référence complète** : les 10 règles, secrets, accès, entrées, données personnelles, recette, incident. |
| `outils/verifier-securite.js` | Outil de recette (pas livré avec l'app), lancé avec `--niveau base`. |
| `exemples/.env.example`, `exemples/.gitignore` | Liste des variables sans valeur ; fichiers à ne jamais livrer. |
| `exemples/supabase/rls.sql` | Règles d'accès Supabase : une politique par opération. |
| `exemples/_headers` | En-têtes de sécurité pour Netlify / Cloudflare Pages. |

## Essai rapide (Node 18+)

```bash
node outils/verifier-securite.js ../mon-app --niveau base
node outils/verifier-securite.js ../mon-app --niveau base --url https://monapp.fr
```

## Testé

Même outil que le kit renforcé (passé sur 4 apps réelles). En niveau base, CORS ouvert, `verify_jwt = false`, CSP et
protection contre les cadres deviennent des recommandations (`!`) au lieu de bloquer.
