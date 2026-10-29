# Kit « App complète »

**Version 1.2** (2026-10-23) — kit de l'Atelier de Blocs.

Le point de départ de toute app avec des comptes et des données. Le dossier `modele/` est une **app qui tourne déjà** :
variables d'environnement vérifiées, base PostgreSQL créée automatiquement et optimisée, comptes et rôles, sécurité,
journal, RGPD, et une API d'administration qui permet de **gérer l'app depuis l'Atelier** (tableur des données,
comptes, journal, sauvegarde) sans jamais régler de connexion à la base. Claude n'écrit que le métier : `app/app.js`,
`db/migrations/` et `public/app-ecrans.js`.

Chaque app démarre avec un compte **`admin` / `adminadmin`**, à changer obligatoirement à la première connexion.

**Charte commune (v1.2)** : toutes les apps ont le même style, les rôles `admin`, `vip` (tous les avantages payants
sans payer) et `utilisateur` plus leurs rôles métier, la même offre Gratuit (avec pub) / Premium (sans pub), le même
écran Abonnement et le même bandeau de pub. Pub et paiement sont éteints tant que `PUB_ACTIVE` et `PAIEMENT_ACTIF`
ne sont pas à 1 (KIT.md § 17).

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** à donner à Claude (hors Atelier ; dans l'Atelier, le prompt généré contient déjà ce kit). |
| `KIT.md` | **Référence complète** : socle, variables, base, API, écrans, conventions, comptes, RGPD, Atelier, recette, mise en ligne. |
| `modele/` | L'app de départ, prête et testée (exemple « Suivi clients ») : à copier en entier, puis remplacer l'exemple. |
| `modele/outils/verifier-app.js` | Contrôle sans lancer l'app : 25 règles (socle intact, variables, base optimisée, front sûr, charte commune…). |
| `modele/outils/recette-app.js` | Recette de bout en bout sur une base jetable : 33 scénarios. |

## Essai rapide (Node 18+ et PostgreSQL 13+)

```bash
cd modele && npm install
DATABASE_URL=postgres://postgres@localhost:5432/suivi_clients DB_CREER_BASE=1 npm start
# [base] base « suivi_clients » créée — 2 migration(s) appliquée(s)
# [installation] Compte admin par défaut créé : identifiant « admin », mot de passe « adminadmin »
# → http://localhost:3000 : connexion admin / adminadmin, puis choix du vrai mot de passe

node outils/verifier-app.js                                            # Conforme
node outils/recette-app.js postgres://postgres@localhost:5432/postgres # Conforme
```

Puis dans l'Atelier : fiche de l'app › **Gestion** › générer la clé, la mettre dans `ADMIN_API_KEY`, saisir l'adresse.

## Testé

Node 22, PostgreSQL 16, Chromium (téléphone 390 px) : installation, compte par défaut, connexion, mot de passe
provisoire, écrans de l'exemple, admin de dépannage, API d'administration complète, les deux outils de recette.
