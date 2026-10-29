# Garanto

**Vos tickets et garanties, toujours sous la main.**

Garanto est un coffre personnel pour deux types de justificatifs seulement : les **tickets de caisse** (factures d'achat
comprises) et les **bons ou certificats de garantie**. Chaque utilisateur ajoute un justificatif par photo ou par fichier
(PDF, JPEG, PNG), saisit la date d'achat et les durées de garantie ; l'app calcule la fin de garantie et envoie un rappel
par e-mail 1 mois avant. Depuis chaque fiche, le fichier se télécharge ou s'envoie par e-mail (SAV, assurance, soi-même).

Version 1.0.1 : app web installable (PWA), gratuite, sans publicité ni paiement. Construite sur le kit « App complète » 1.1
de l'Atelier de Blocs (`serveur.js`, `noyau/`, `public/noyau.js` et `public/socle.css` sont ceux du kit, non modifiés).

## Démarrer sur ta machine

```bash
npm install
cp .env.example .env     # remplir DATABASE_URL ; DB_CREER_BASE=1 sur ta machine ; INSCRIPTION_OUVERTE=1
npm start                # crée la base et les tables, puis http://localhost:3000
```

Première connexion : identifiant `admin`, mot de passe `adminadmin`, à remplacer immédiatement (imposé par l'app).
Sans `BREVO_API_KEY` en développement, les e-mails ne partent pas : ils sont écrits dans le journal du serveur.

## Tables

| Table | Rôle |
| --- | --- |
| `achats` | Un achat par produit : magasin, date, montant, garanties légale et commerciale ; `fin_garantie` est une colonne **calculée par PostgreSQL** (date d'achat + la plus longue des deux durées) |
| `justificatifs` | Métadonnées des fichiers joints : type `ticket` ou `garantie` (tout autre document est refusé), type reconnu sur les premiers octets, taille, empreinte SHA-256 |
| `justificatifs_contenu` | Le contenu des fichiers (`bytea`), à part pour que les listes ne le chargent jamais ; masqué dans l'Atelier |
| `envois` | Trace de chaque e-mail : partage par l'utilisateur, rappel de fin de garantie, prévenance d'inactivité |
| `preferences_comptes` | Rappels activés ou non, date de la prévenance d'inactivité |
| `utilisateurs`, `sessions`, `jetons`, `journal`, `reglages` | Socle du kit |

Tout est lié au compte par `compte_id` (suppression en cascade). Documentation détaillée des colonnes :
`node outils/schema-doc.js db/migrations`.

## Rôles

- `utilisateur` : ne voit et ne gère que ses propres achats, fichiers et envois (chaque requête filtre par le compte connecté, identifiants `uuid`).
- `admin` : comptes et réglages depuis l'Atelier ; n'a pas accès au contenu des fichiers (colonne masquée), sauf par la suppression RGPD.

## Variables propres à l'app

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `BREVO_API_KEY` | | Clé de l'API transactionnelle Brevo. **Secrète**, obligatoire en production |
| `EMAIL_EXPEDITEUR` | | Adresse d'expédition validée chez Brevo. Obligatoire en production |
| `EMAIL_EXPEDITEUR_NOM` | `Garanto` | Nom affiché de l'expéditeur |
| `TACHE_QUOTIDIENNE` | `1` | Rappels et suppressions pour inactivité chaque jour ; `0` pour les couper |

Toutes les variables (socle compris) : `.env.example`.

## Réglages (Atelier › Réglages)

Délai du rappel (30 jours), taille maximale d'un fichier (10 Mo), fichiers par achat (5), e-mails par compte et par jour (10),
taille totale des pièces jointes (10 Mo), années d'inactivité avant suppression (3).

## API (toutes les routes exigent un compte ; aucune route publique)

| Route | Rôle |
| --- | --- |
| `GET /api/achats?q=&type=` | Mes achats, triés par fin de garantie ; recherche produit/magasin ; filtre `ticket` / `garantie` |
| `POST /api/achats` | Créer un achat |
| `GET /api/achats/:id` | Fiche : achat, justificatifs (sans contenu), derniers envois |
| `PUT /api/achats/:id` | Modifier (le rappel repart si la fin de garantie change) |
| `DELETE /api/achats/:id` | Supprimer l'achat et ses fichiers |
| `POST /api/achats/:id/justificatifs` | Joindre un fichier : `{ type, nom, donnees }` (base64, 10 Mo, 5 par achat) |
| `GET /api/justificatifs/:id/fichier` | Télécharger : `Content-Disposition: attachment`, bon type, `nosniff` |
| `PATCH /api/justificatifs/:id` | Changer le type (`ticket` / `garantie`) |
| `DELETE /api/justificatifs/:id` | Retirer un fichier |
| `POST /api/achats/:id/envoyer` | E-mail via Brevo : un destinataire, pièces choisies, 10 Mo, 10 par jour, `Reply-To` = l'utilisateur |
| `GET /api/compte` | E-mail, préférence de rappel, envois restants, limites |
| `PUT /api/compte/preferences` | Activer ou couper les rappels |
| `PUT /api/compte/email` | Changer d'e-mail (mot de passe redemandé) |
| `GET /api/compte/export` | Toutes mes données en JSON, fichiers compris (base64) |
| `POST /api/compte/supprimer` | Supprimer mon compte et tous mes fichiers (mot de passe redemandé) |

**Tâche quotidienne** (au démarrage puis toutes les 24 h) : rappel pour chaque achat dont la garantie finit dans 30 jours
(une seule fois grâce à `rappel_envoye_le`, réservé avant l'envoi), puis e-mail de prévenance aux comptes sans connexion
depuis 3 ans et suppression 30 jours plus tard s'ils ne se sont toujours pas connectés.

## Sécurité des fichiers

Liste blanche PDF / JPEG / PNG vérifiée sur les premiers octets (jamais sur l'extension) ; fichiers jamais affichés en ligne
par le serveur (toujours en téléchargement, `nosniff`, CSP `sandbox`) ; l'aperçu des images est construit dans le navigateur
depuis la mémoire. Les photos sont réduites dans le navigateur (2000 px de large, JPEG 0,8) avant l'envoi, ce qui retire aussi
les métadonnées (position GPS). Le même fichier ne peut pas être joint deux fois au même achat.

## RGPD

`app/app.js → rgpd` couvre achats, justificatifs, contenu des fichiers, envois et préférences (action « supprimer »).
Conservation : jusqu'à suppression par l'utilisateur, ou 3 ans sans connexion après un e-mail de prévenance.
L'utilisateur exporte ses données (fichiers compris) et supprime son compte lui-même dans « Mon compte ». Depuis l'Atelier,
la suppression RGPD efface aussi les fichiers ; l'export RGPD de l'Atelier contient les métadonnées, pas le contenu des fichiers.
Aucun traceur ni cookie publicitaire : seul le cookie de session (`HttpOnly`) est utilisé.

## Mise en ligne sur Scalingo (région osc-fr1, Paris)

1. **Créer l'app** : tableau de bord Scalingo › *Create an application* › nom `garanto`, région **osc-fr1**.
   Déploiement par GitHub (lier le dépôt) ou en ligne de commande : `scalingo --region osc-fr1 create garanto`, puis
   `git push scalingo main` depuis le dossier de l'app.
2. **Ajouter la base** : onglet *Addons* › **PostgreSQL** (Starter pour commencer). Scalingo crée la variable `DATABASE_URL`.
3. **Variables** (onglet *Environment*) :

   | Variable | Valeur |
   | --- | --- |
   | `APP_ENV` | `production` |
   | `APP_URL` | `https://garanto.osc-fr1.scalingo.io` (ou ton domaine) |
   | `DB_CREER_BASE` | `0` |
   | `DB_SSL` | `1` |
   | `INSCRIPTION_OUVERTE` | `1` |
   | `ADMIN_API_KEY` | générée par l'Atelier (Gestion › Générer une clé) |
   | `BREVO_API_KEY` | clé Brevo (voir plus bas) |
   | `EMAIL_EXPEDITEUR` | ex. `garanto@mondomaine.fr`, validée chez Brevo |

   `PORT` est fourni par Scalingo. Si le démarrage échoue avec « self-signed certificate in certificate chain », ajoute
   `DB_SSL_STRICT=0` (la connexion reste chiffrée).
4. **Déployer** : Scalingo détecte Node.js (`package.json`) et lance `npm start` (fichier `Procfile`). Les migrations
   s'appliquent seules à chaque démarrage. Un seul conteneur `web` suffit ; avec plusieurs, les rappels ne partent
   quand même qu'une fois.
5. **Première ouverture** : connecte-toi avec `admin` / `adminadmin` et choisis ton mot de passe **tout de suite**.
6. **Atelier** : fiche de l'app › Gestion › adresse `APP_URL` + clé › Tester la connexion.
7. À chaque livraison, change `VERSION` dans `public/sw.js`.

Les fichiers sont dans PostgreSQL : surveille la taille de la base (Atelier › État) et choisis le plan de l'add-on en
conséquence ; les sauvegardes de l'add-on Scalingo couvrent aussi les fichiers.

## Configuration de Brevo

1. Crée un compte sur brevo.com (offre gratuite : 300 e-mails par jour).
2. **Expéditeur** : *Paramètres › Expéditeurs, domaines et IP dédiées* › ajoute l'adresse de `EMAIL_EXPEDITEUR`, puis
   **authentifie ton domaine** (enregistrements DKIM, DMARC et code Brevo à copier chez ton registrar). Sans domaine
   authentifié, les e-mails risquent d'arriver en indésirables.
3. **Clé d'API** : *Paramètres › SMTP et API › Clés API* › *Générer une nouvelle clé API* › copie-la dans `BREVO_API_KEY`
   chez Scalingo (jamais dans un fichier).
4. **IP autorisées** : si la restriction par adresse IP est active dans Brevo, désactive-la ou ajoute les adresses de
   sortie de Scalingo osc-fr1, sinon les envois sont refusés (erreur 401 dans `envois.erreur`).
5. Test : depuis une fiche achat, « Envoyer par e-mail » vers ta propre adresse ; le suivi est dans Brevo › *Transactionnel*
   et dans la table `envois` (Atelier › Données).

Garde-fous anti-spam : un seul destinataire par envoi, 10 envois par compte et par jour, 10 Mo de pièces jointes,
expéditeur toujours `EMAIL_EXPEDITEUR` avec `Reply-To` = l'adresse de l'utilisateur et sa mention en bas du message.

## Recette

```bash
npm run verifier                                                   # Conforme (20 règles)
npm run recette -- postgres://postgres:motdepasse@localhost:5432/postgres   # Conforme (27 scénarios)
```

Sorties de la livraison : `RECETTE.txt`.
