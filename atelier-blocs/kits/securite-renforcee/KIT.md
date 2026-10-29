# Kit « Cybersécurité renforcée » — référence complète

> **Version du kit : 2.0** (2026-10-22). Obligatoire pour toutes les apps de l'Atelier de Blocs.
> Référentiels : OWASP Top 10 (2021), OWASP ASVS 4.0 niveau 2, recommandations ANSSI pour les applications web, RGPD.

## 1. Principes

- **Moindre privilège** : chaque utilisateur, clé et fonction n'a que les droits nécessaires.
- **Défense en profondeur** : une protection ne repose jamais sur une seule barrière (le navigateur n'en est pas une).
- **Le serveur décide** : un montant, un droit, un statut ou un identifiant d'utilisateur n'est jamais repris du navigateur.
- **En cas de doute, l'option la plus sûre.** Si une règle bloque, on s'arrête et on propose une solution conforme ;
  on ne la contourne pas.

## 2. Les trois questions (dans le plan, pour chaque écran et chaque route)

1. **Qui a le droit** de le faire ? (anonyme, connecté, propriétaire de la donnée, administrateur)
2. **Que se passe-t-il si l'entrée est fausse ou malveillante ?** (vide, trop longue, HTML, autre identifiant, rejeu)
3. **Quelle information fuit en cas d'erreur ?** (trace technique, existence d'un compte, données d'un autre)

## 3. Secrets

- Le navigateur ne reçoit que des valeurs publiques : adresse de l'API, clé publique (« anon » Supabase, `pk_` Stripe).
- Les secrets vivent dans les variables d'environnement du serveur (secrets Supabase, hébergeur), jamais dans le dépôt.
- `.env.example` liste les noms, **sans valeur** ; `.env` est dans `.gitignore` et n'est jamais dans un ZIP livré.
- Une variable `NEXT_PUBLIC_…`, `VITE_…`, `PUBLIC_…`, `EXPO_PUBLIC_…` part dans le navigateur : jamais de secret dedans.
- Clé « service_role » Supabase : uniquement dans les fonctions serveur. Dans le front, c'est le piège le plus grave.
- Au moindre doute (clé vue dans une capture, un ticket, un dépôt), on la renouvelle (§ 10).

## 4. Authentification et sessions

- Fournisseur éprouvé (Supabase Auth ou équivalent) ; jamais de hachage de mot de passe « maison ».
- Mots de passe : 12 caractères minimum, avec minuscule, majuscule, chiffre et symbole ; jamais journalisés.
- Email confirmé avant le premier accès aux données ; limitation des tentatives côté serveur (`exemples/serveur/securite.js`).
- Messages identiques pour « compte inconnu » et « mauvais mot de passe ».
- Jeton de session en cookie `HttpOnly; Secure; SameSite=Lax` quand c'est possible ; **jamais dans `localStorage` ni dans une URL**.

## 5. Contrôle d'accès

- Supabase : RLS activée sur **chaque** table, **une politique par opération** (select, insert, update, delete),
  jamais `using (true)` en écriture (`exemples/supabase/rls.sql`).
- Serveur maison : chaque route vérifie l'utilisateur **et** la propriété de la ligne (`where id = $1 and utilisateur_id = $2`).
- Un écran avec des données personnelles est réservé aux utilisateurs connectés.

## 6. Entrées, sorties, navigateur

- Toute donnée reçue (formulaire, URL, API, webhook, fichier) est validée côté serveur : type, longueur, format, liste fermée.
- Requêtes SQL **paramétrées** ; jamais de concaténation. Ni `eval`, ni `new Function`, ni `setTimeout("texte")`.
- À l'affichage : échappement systématique ; `innerHTML` seulement avec une valeur échappée (`esc()`), sinon `textContent`.
- Fichiers reçus : type et taille vérifiés côté serveur, nom regénéré, jamais servis depuis le même domaine sans `Content-Disposition`.
- En-têtes (tous obligatoires sauf mention) — fournis dans `exemples/_headers`, `exemples/vercel.json`, `exemples/serveur/securite.js` :

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

- CORS : liste des origines de l'app ; jamais `*` avec des identifiants.
- Scripts externes en version fixe, avec `integrity` (SRI) quand c'est possible ; dépendances verrouillées (`package-lock.json`), `npm audit` sans faille élevée.

## 7. Webhooks et API externes

- Signature vérifiée (Stripe : `constructEventAsync` avec `STRIPE_WEBHOOK_SECRET`, voir `exemples/supabase/webhook-stripe.ts`).
- Traitement idempotent : un même événement reçu deux fois ne compte qu'une fois.
- Montant lu chez le prestataire, jamais celui envoyé par le navigateur.
- Le serveur n'appelle que des adresses connues (pas d'URL fournie par l'utilisateur : SSRF).
- Supabase : `verify_jwt = true` partout, sauf la fonction du webhook signé.

## 8. Données personnelles (RGPD)

- Minimum nécessaire, finalité et durée de conservation écrites dans le README.
- Réservées aux connectés ; ni dans `localStorage`, ni dans les URL, ni dans les journaux.
- Sauvegardes automatiques de la base, restauration testée.
- Journal des actions sensibles (connexion, paiement, suppression, export) côté serveur, sans mot de passe ni donnée bancaire.
- Export et suppression des données d'un utilisateur possibles sur demande.

## 9. Recette

### 9.1 Outil `outils/verifier-securite.js`

```bash
node outils/verifier-securite.js .                          # code
node outils/verifier-securite.js . --url https://monapp.fr  # + site en ligne
```

| N° | Contrôle | Niveau |
| --- | --- | --- |
| 01 | Aucune clé secrète écrite (Stripe, AWS, Anthropic, OpenAI, GitHub, Google, Slack, clé privée, URL de base avec mot de passe) | obligatoire |
| 02 | Pas de clé service_role Supabase côté navigateur | obligatoire |
| 03 | Pas de variable publique contenant un secret | obligatoire |
| 04 | Pas de fichier `.env` dans le projet livré | obligatoire |
| 05 | Ni `eval` ni `new Function` | obligatoire |
| 06 | Pas de SQL concaténé | obligatoire |
| 07 | Pas de `innerHTML` avec une variable non échappée | recommandé |
| 08 | Aucune ressource en `http://` | obligatoire |
| 09 | CORS jamais ouvert à tous | obligatoire |
| 10 | `verify_jwt = false` réservé aux webhooks | recommandé |
| 11 | Pas de jeton ni de mot de passe dans `localStorage` | obligatoire |
| 12 | Webhooks à signature vérifiée | obligatoire |
| 13 | Dépendances verrouillées | recommandé |
| 14 | Scripts externes avec SRI | recommandé |
| 15 | Pas de trace technique renvoyée au client | recommandé |
| 20–21 | HTTPS, redirection http → https (`--url`) | obligatoire |
| 22–25 | HSTS, CSP, nosniff, protection cadre (`--url`) | obligatoire |
| 26–28 | Referrer-Policy, Permissions-Policy, pas de version de serveur (`--url`) | recommandé |
| 29 | Aucun fichier sensible accessible en ligne (`.env`, `.git`, dumps) | obligatoire |

### 9.2 Audit de l'Atelier

Écran **Audit sécurité** (ou onglet « Code et versions » de l'app) : aucun point critique ni élevé, note A ou B.

### 9.3 À la main

- Un utilisateur ne peut ni lire ni modifier les données d'un autre (changer l'identifiant dans l'URL ou la requête).
- Sans être connecté : aucune donnée protégée.
- Saisie de HTML, de `<script>`, de texte très long : sans effet.
- Rejeu d'un webhook sans signature ou avec une mauvaise signature : refusé.
- Dix mauvais mots de passe de suite : ralenti ou bloqué.

## 10. Incident

1. Révoquer immédiatement la clé exposée et en créer une nouvelle.
2. Chercher dans les journaux toute utilisation anormale.
3. Corriger, relancer la recette et l'audit, documenter (date, cause, données touchées).
4. Données personnelles touchées : notification à la CNIL sous 72 h si le risque l'exige, information des personnes si le risque est élevé.

## 11. Correspondance OWASP Top 10

| Risque | Exigence du kit |
| --- | --- |
| A01 Contrôle d'accès défaillant | § 5, recette 9.3 |
| A02 Défaillances cryptographiques | HTTPS + HSTS, aucun secret côté client (§ 3, § 6) |
| A03 Injection | Requêtes paramétrées, échappement, pas d'eval (§ 6) |
| A04 Conception non sécurisée | Les trois questions (§ 2) |
| A05 Mauvaise configuration | En-têtes, pas de .env, CORS (§ 6) |
| A06 Composants vulnérables | Versions fixes, npm audit, SRI (§ 6) |
| A07 Identification et authentification | § 4 |
| A08 Intégrité des logiciels et des données | Webhooks signés, SRI, verrouillage (§ 6, § 7) |
| A09 Journalisation et surveillance | Journal des actions sensibles (§ 8) |
| A10 SSRF | Adresses connues seulement (§ 7) |

## 12. Pièges connus

- Une clé « service_role » Supabase dans le front donne tous les droits sur la base.
- Un `.env.local` oublié dans un ZIP partagé expose tous les secrets (trouvé sur plusieurs apps réelles).
- `verify_jwt = false` sur une fonction Supabase la rend appelable par n'importe qui.
- Une politique RLS `using (true)` « pour tester » qui part en production.
- Un message « cet email n'existe pas » permet de lister les comptes.

## 13. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : README, PROMPT, KIT en sections numérotées, outil de recette `verifier-securite.js` (code + site en ligne),
exemples (serveur Node protégé, en-têtes Netlify/Vercel, RLS Supabase, webhook Stripe).

### 1.0 — 2026-10-20

Première version : règles et référence dans l'Atelier, obligatoire pour toutes les apps.
