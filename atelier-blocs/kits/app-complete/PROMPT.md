# Prompt d'entrée — app complète (comptes, base, administration depuis l'Atelier)

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit** (archive `app-complete-v1.2.1.zip`
> décompressée, dont `modele/`). Remplace les éléments entre ⟦ ⟧ (ceux qui commencent par « ? » sont facultatifs).
> Dans l'Atelier de Blocs : Créer une app › Nouvelle app remplit ce prompt pour toi.

---

Tu développes **⟦Nom de l'application⟧** (code technique `⟦Code : identifiant technique en minuscules et tirets, ex. suivi-clients⟧`).
⟦Consigne : décris en 3 à 6 lignes le besoin métier : utilisateurs, objets gérés, parcours principaux, emails ou fichiers éventuels⟧

⟦Rôles métier : rôles utiles à l'app en plus de admin, vip et utilisateur, avec ce que chacun peut faire (ou « aucun »)⟧
⟦?Offre : ce qui reste gratuit et ses limites, ce que débloque Premium, prix TTC mensuel et annuel (vide : propose-la)⟧
⟦?Hébergement : où l'app sera mise en ligne (Scalingo, Render, VPS…) et sa base (PostgreSQL fourni, Neon, Supabase…)⟧

L'app part du kit « App complète » joint : le dossier `modele/` est une app qui tourne déjà (variables d'environnement,
base PostgreSQL automatique, comptes, sécurité, API d'administration utilisée par mon Atelier).

## Avant d'écrire la moindre ligne

1. Lis **intégralement** `KIT.md`, puis `modele/app/app.js`, `modele/db/migrations/0001_init.sql` et `modele/public/app-ecrans.js`.
2. Établis le modèle de données complet selon KIT.md § 9 : un tableau par table (colonne, type, obligatoire, défaut,
   unique, lien et `on delete`, index, description). Si un modèle de données vient de mon Atelier, reprends-le exactement.
3. Liste les rôles (ceux du socle `admin`, `vip`, `utilisateur` et les rôles métier) avec la **matrice des droits**
   (une ligne par action, une colonne par rôle, le palier qui ouvre chaque fonction payante), l'**offre** (paliers,
   limites, avantages, prix TTC), les variables d'environnement propres à l'app, les routes de l'API et les écrans.
4. Présente-moi tout cela en une page et attends ma validation.

## Règles non négociables

- Copie `modele/` en entier. **Ne modifie jamais** `serveur.js`, `noyau/`, `public/noyau.js`, `public/socle.css`.
  Tu écris seulement `app/app.js`, `db/migrations/` et `public/app-ecrans.js` (plus titre, icônes et charte).
- Chaque variable d'environnement est **déclarée** dans `app/app.js → variables` et lue par `env.get()` ; jamais de
  `process.env` ; `.env.example` régénéré (`npm run env:exemple`).
- Base optimisée (KIT.md § 9) : `uuid`, `cree_le`/`modifie_le`, `numeric(12,2)`, `timestamptz`, index sur chaque
  clé étrangère, `check` pour les valeurs fermées, `comment on` en français. Une migration appliquée ne se modifie jamais.
- `app/app.js` renseigne `tables` (libellés, colonne d'affichage), `rgpd` (où sont les données personnelles et leur
  durée de conservation) et `reglages` : c'est ce que j'utilise pour gérer l'app depuis l'Atelier.
- SQL toujours paramétré ; toute donnée affichée passe par `esc()` ; aucun script ni style en ligne.
- Le compte par défaut `admin` / `adminadmin` reste tel que le socle le crée (changement imposé à la première connexion).

## Charte commune de mes apps (KIT.md § 17)

- **Style** : la charte du kit telle quelle ; seules `--primaire`, `--sur-primaire`, `--accent`, `--sur-accent`,
  `theme-color` et les icônes changent. Écrans faits avec les classes de `charte.css` et `socle.css`, rien en dur.
- **Rôles** : `admin`, `vip` et `utilisateur` viennent du socle, ne les redéclare pas ; `vip` a tous les avantages du
  palier le plus haut sans payer. Déclare dans `app.roles` chaque rôle métier utile : `{ id, libelle, description }`.
- **Offre** : `app.offre` au format commun, `gratuit` (avec pub, limites) puis `premium` (sans pub) ; fonctions payantes
  par `{ palier: 'premium' }` sur la route ou `offre.limite(ctx, …)`, jamais de test de rôle ou de palier maison.
- **Pub et abonnement** : uniquement ceux du socle (bandeau du bas, écran Abonnement, invitation). Aucun SDK de pub
  ou de paiement ajouté. Ils restent éteints (`PUB_ACTIVE=0`, `PAIEMENT_ACTIF=0`) tant que je ne les allume pas.

## Livraison

- Le nom du paquet (`package.json`) et le dossier sont le code technique ci-dessus.
- L'app complète en un ZIP (sans `node_modules` ni `.env`), avec `package-lock.json`, `.env.example` et
  `atelier-app.json` (`"kit": "app-complete"`) à jour, et un README (tables, variables propres, routes, rôles et
  matrice des droits, paliers de l'offre).
- Les sorties de `node outils/verifier-app.js` et `node outils/recette-app.js postgres://…` : **« Conforme »**.

Commence par la lecture de `KIT.md`, puis présente-moi le modèle de données, les rôles et leurs droits, l'offre, les variables et les écrans.
