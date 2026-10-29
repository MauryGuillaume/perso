# Kit « Cybersécurité renforcée »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs. **Obligatoire pour toutes les apps.**

Socle de sécurité aligné sur l'OWASP Top 10 (2021), l'OWASP ASVS niveau 2, les recommandations de l'ANSSI pour les
applications web et le RGPD. Aucune règle ne s'assouplit sans accord écrit.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier ; dans l'Atelier, ce kit est toujours inclus dans le prompt). |
| `KIT.md` | **Référence complète** : règles, secrets, accès, entrées, en-têtes, webhooks, données personnelles, recette, incident. |
| `outils/verifier-securite.js` | Outil de recette (pas livré avec l'app) : 15 contrôles du code, 10 contrôles du site en ligne avec `--url`. |
| `exemples/serveur/securite.js` | Protections d'un serveur Node sans dépendance : en-têtes, CORS par liste, limite de requêtes, corps limité, erreurs génériques. |
| `exemples/serveur/exemple.js` | Serveur minimal qui les utilise. |
| `exemples/_headers`, `exemples/vercel.json` | En-têtes de sécurité pour Netlify, Cloudflare Pages et Vercel. |
| `exemples/supabase/rls.sql` | Règles d'accès Supabase : une politique par opération. |
| `exemples/supabase/webhook-stripe.ts` | Webhook Stripe avec signature vérifiée (fonction Supabase). |

## Essai rapide (Node 18+)

```bash
node outils/verifier-securite.js ../mon-app                          # le code
node outils/verifier-securite.js ../mon-app --url https://monapp.fr  # + le site en ligne
# ✓ 01 Aucune clé secrète écrite… ✗ 04 Pas de fichier .env… → « Conforme » ou « Non conforme »
```

Les valeurs trouvées sont masquées (`sk_l••••9x`) : le rapport peut être partagé.

## Testé

L'outil a été passé sur PodoLogiciel, PostLocal, RelancePro et Livora (il a trouvé de vrais fichiers `.env` dans les
ZIP) et sur `exemples/serveur/exemple.js` en ligne (en-têtes présents, CORS refusé à une origine inconnue, email
invalide refusé).
