# Kit « App complète »

**Version 1.4** (2026-10-30) — kit de l'Atelier de Blocs.

Le point de départ de toute app avec des comptes et des données. Le dossier `modele/` est une **app qui tourne déjà** :
variables d'environnement vérifiées, base PostgreSQL créée automatiquement et optimisée, comptes et rôles, sécurité,
journal, RGPD, et une API d'administration qui permet de **gérer l'app depuis l'Atelier** (tableur des données,
comptes, journal, sauvegarde) sans jamais régler de connexion à la base. Claude n'écrit que le métier : `app/app.js`,
`db/migrations/` et `public/app-ecrans.js`.

Chaque app démarre avec un compte **`admin` / `adminadmin`**, à changer obligatoirement à la première connexion.

**Prête pour Google Play et l'App Store (v1.4)** : suppression du compte dans l'app, pages publiques (confidentialité,
aide, suppression du compte, conditions) et, à partir d'une seule fiche `store/store.json`, le dossier complet des deux
stores : chaque champ de la Play Console et d'App Store Connect, sécurité des données, confidentialité de l'app,
classifications, notes de revue, abonnements, icônes, bannière et captures aux tailles exactes (KIT.md § 18).

**Univers propre à chaque app (v1.3)** : chaque app a son univers graphique (palette douce ou vive selon le concept,
polices, formes, motif, illustrations, ton : `public/univers.css` et `UNIVERS.md`), sur un socle commun qui la garde
fluide, lisible, colorée et accessible (KIT.md § 17.1).

**Charte commune (v1.2)** : toutes les apps ont les rôles `admin`, `vip` (tous les avantages payants
sans payer) et `utilisateur` plus leurs rôles métier, la même offre Gratuit (avec pub) / Premium (sans pub), le même
écran Abonnement et le même bandeau de pub. Pub et paiement sont éteints tant que `PUB_ACTIVE` et `PAIEMENT_ACTIF`
ne sont pas à 1 (KIT.md § 17).

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** à donner à Claude (hors Atelier ; dans l'Atelier, le prompt généré contient déjà ce kit). |
| `KIT.md` | **Référence complète** : socle, variables, base, API, écrans, conventions, comptes, RGPD, Atelier, recette, mise en ligne. |
| `modele/` | L'app de départ, prête et testée (exemple « Suivi clients ») : à copier en entier, puis remplacer l'exemple. |
| `modele/outils/verifier-app.js` | Contrôle sans lancer l'app : 30 règles (socle intact, variables, base optimisée, front sûr, univers lisible et coloré, fiche des stores…). |
| `modele/outils/recette-app.js` | Recette de bout en bout sur une base jetable : 34 scénarios. |
| `modele/store/store.json` | Fiche des stores de l'exemple, à remplir pour chaque app. |
| `modele/outils/store-app.js` | Dossier des stores et pages publiques, générés depuis `store/store.json`. |
| `modele/outils/store-visuels.js` | Icônes, bannière Play et captures aux tailles des stores (Playwright, PostgreSQL de test). |

## Essai rapide (Node 18+ et PostgreSQL 13+)

```bash
cd modele && npm install
DATABASE_URL=postgres://postgres@localhost:5432/suivi_clients DB_CREER_BASE=1 npm start
# [base] base « suivi_clients » créée — 2 migration(s) appliquée(s)
# [installation] Compte admin par défaut créé : identifiant « admin », mot de passe « adminadmin »
# → http://localhost:3000 : connexion admin / adminadmin, puis choix du vrai mot de passe

node outils/verifier-app.js                                            # Conforme
node outils/recette-app.js postgres://postgres@localhost:5432/postgres # Conforme
node outils/store-app.js                                               # dossier store/ et pages publiques
node outils/store-visuels.js postgres://postgres@localhost:5432/postgres # store/visuels/ (Playwright)
```

Puis dans l'Atelier : fiche de l'app › **Gestion** › générer la clé, la mettre dans `ADMIN_API_KEY`, saisir l'adresse.

## Testé

Node 22, PostgreSQL 16, Chromium (téléphone 390 px) : installation, compte par défaut, connexion, mot de passe
provisoire, écrans de l'exemple, admin de dépannage, API d'administration complète, les deux outils de recette,
suppression du compte, dossier des stores et visuels (exemple et Abonnely).
