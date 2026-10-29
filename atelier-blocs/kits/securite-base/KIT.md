# Kit « Cybersécurité de base » — référence complète

> **Version du kit : 2.0** (2026-10-22). Minimum pour toute app. Une app publique avec paiement ou beaucoup de données
> personnelles passe au kit **« Cybersécurité renforcée »** (OWASP ASVS niveau 2).

## 1. Principe

Le navigateur n'est jamais une protection : tout ce qu'il envoie peut être modifié. Le serveur (ou la base, avec ses
règles d'accès) décide de tout ce qui compte : qui voit quoi, combien ça coûte, qui a le droit.

## 2. Les 10 règles

| N° | Règle | Contrôlée par l'outil |
| --- | --- | --- |
| 1 | Aucun secret (clé Stripe, clé service Supabase, clé d'IA, mot de passe de base) dans le code du navigateur, le dépôt ou un ZIP | 01, 02, 03, 04 |
| 2 | Règles d'accès sur chaque table : un utilisateur ne lit et ne modifie que ses données | à la main (§ 8.2) |
| 3 | Toute entrée validée côté serveur (type, longueur, format) | à la main |
| 4 | SQL paramétré, ni `eval` ni `new Function` | 05, 06 |
| 5 | Affichage échappé (`textContent`, ou `esc()` avant `innerHTML`) | 07 (recommandé) |
| 6 | HTTPS partout, aucune ressource en `http://` | 08, 20, 21 |
| 7 | Mots de passe : fournisseur éprouvé (Supabase Auth…), 10 caractères minimum, jamais stockés ni journalisés par l'app | à la main |
| 8 | Pas de jeton ni de mot de passe dans `localStorage` | 11 |
| 9 | Webhooks à signature vérifiée | 12 |
| 10 | Données personnelles : le nécessaire seulement, réservées aux connectés, durée de conservation écrite | à la main |

## 3. Secrets

- Le navigateur ne reçoit que des valeurs **publiques** : adresse de l'API, clé « anon » Supabase, clé `pk_` Stripe.
- Les secrets sont des variables du serveur (secrets Supabase, réglages de l'hébergeur). `.env` est dans `.gitignore`
  (`exemples/.gitignore`) ; `.env.example` liste les noms **sans valeur** (`exemples/.env.example`).
- Une variable `NEXT_PUBLIC_…`, `VITE_…`, `PUBLIC_…` part dans le navigateur : jamais de secret dedans.
- Une clé vue là où elle ne devait pas être (capture, ticket, ZIP) se renouvelle immédiatement (§ 9).

## 4. Accès aux données

- Supabase : RLS activée sur **chaque** table, une politique par opération (`exemples/supabase/rls.sql`).
- Serveur maison : chaque route vérifie l'utilisateur et la propriété de la ligne (`where id = $1 and utilisateur_id = $2`).
- Un montant, un droit ou un statut est recalculé côté serveur, jamais repris du navigateur.

## 5. Entrées et affichage

- Validation côté serveur de tout ce qui arrive (formulaire, URL, API, fichier) ; la validation dans le navigateur n'est qu'un confort.
- Requêtes paramétrées (`query('… where id = $1', [id])`).
- Affichage avec `textContent`, ou `innerHTML` avec une valeur échappée.

## 6. Transport et en-têtes

HTTPS partout (l'hébergeur le fournit). En-têtes conseillés (`exemples/_headers`) : `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `X-Frame-Options: DENY`, `Referrer-Policy`.
En niveau base, seuls HSTS et `nosniff` sont obligatoires ; les autres sont recommandés.

## 7. Données personnelles (RGPD)

- Collecter le strict nécessaire ; finalité et durée de conservation écrites dans le README.
- Réservées aux utilisateurs connectés ; jamais dans les URL, les journaux ou `localStorage`.
- Sauvegarde automatique de la base.
- Suppression des données d'un utilisateur possible sur demande.

## 8. Recette

### 8.1 Outil `outils/verifier-securite.js`

```bash
node outils/verifier-securite.js . --niveau base                          # code
node outils/verifier-securite.js . --niveau base --url https://monapp.fr  # + site en ligne
```

Obligatoires en niveau base : 01 à 06, 08, 11, 12 (code) ; 20, 21, 22, 24, 29 (en ligne).
Recommandés : 07, 09, 10, 13, 14, 15, 23, 25 à 28. Il faut **« Conforme »**. Les valeurs trouvées sont masquées.

### 8.2 À la main

- Connecté en tant qu'utilisateur A, changer l'identifiant dans l'URL ou la requête pour lire une donnée de B : refusé.
- Sans être connecté : aucune donnée protégée.
- Un champ rempli de `<script>alert(1)</script>` : affiché tel quel, sans effet.
- Le ZIP livré ne contient ni `.env`, ni `node_modules`, ni dump de base.

## 9. Incident

1. Révoquer la clé exposée et en créer une nouvelle.
2. Chercher dans les journaux une utilisation anormale.
3. Corriger, relancer la recette, noter la date, la cause et les données touchées.
4. Données personnelles touchées : notification à la CNIL sous 72 h si le risque l'exige.

## 10. Pièges connus

- Clé « service_role » Supabase dans le front : tous les droits sur la base pour n'importe qui.
- Un `.env.local` oublié dans un ZIP partagé (trouvé sur plusieurs apps réelles).
- Une politique RLS `using (true)` « pour tester » qui part en production.
- Un message « cet email n'existe pas » qui permet de lister les comptes.

## 11. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : README, PROMPT, KIT en sections numérotées, outil de recette partagé avec le kit renforcé
(`verifier-securite.js --niveau base`), exemples `.env.example`, `.gitignore`, RLS, en-têtes.

### 1.1 — 2026-10-20

Textes pour le prompt (critères sécurité, données).

### 1.0 — 2026-10-20

Première version : règles minimales dans l'Atelier.
