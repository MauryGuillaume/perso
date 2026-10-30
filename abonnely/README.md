# Abonnely

« Votre quotidien, en plus simple. » Chacun suit ses abonnements (streaming, musique, box, téléphone, salle de sport…) :
ajout depuis un catalogue de services connus ou import d'un relevé bancaire CSV, coût mensuel et annuel, graphique par
catégorie, rappel par e-mail avant chaque prélèvement et chaque fin d'essai, lien direct ou lettre PDF pour résilier.

App construite sur le kit « App complète » **1.3.0** de l'Atelier de Blocs (référence : `KIT.md` du kit). Univers
graphique « Finance et confiance », couleurs douces : `public/univers.css` et `UNIVERS.md`.

## Démarrer

```bash
npm install
cp .env.example .env     # remplir DATABASE_URL ; DB_CREER_BASE=1 sur ta machine ; INSCRIPTION_OUVERTE=1
npm start                # crée la base et les tables, puis http://localhost:3000
```

Première connexion : identifiant `admin`, mot de passe `adminadmin`, à remplacer immédiatement.
En production : `INSCRIPTION_OUVERTE=1` (chacun crée son compte), `BREVO_API_KEY` et `EMAIL_EXPEDITEUR` (rappels).

## Tables

| Table | Rôle |
| --- | --- |
| `services` | Catalogue partagé des services connus : nom, catégorie, prix indicatif (`prix_type_cts`) et sa périodicité, lien de résiliation, `actif`. 40 services pré-remplis ; **prix et liens indicatifs, à tenir à jour** depuis l'Atelier › Données |
| `souscriptions` | Les abonnements suivis par chaque compte (« Abonnements suivis » dans l'Atelier) : service, libellé, catégorie, `montant_cts`, périodicité, prochaine échéance, fin d'essai, délai de rappel, source (manuel / import), `resilie_le` (archivage, rien n'est effacé) |
| `imports` | Trace des relevés analysés : nombre d'opérations lues, propositions, ajouts. **Le fichier n'est jamais gardé** |
| `rappels` | Rappels envoyés (abonnement, sorte échéance / essai, date) : un seul e-mail par échéance, même après un redémarrage |
| `utilisateurs`, `sessions`, `journal`, `reglages`, `jetons`, `abonnements` | Socle du kit. `abonnements` = l'offre Gratuit / Premium du compte (d'où le nom `souscriptions` pour les abonnements suivis) |

Montants en centimes entiers (`*_cts`), comme le modèle de l'Atelier. Les échéances passées sont avancées
automatiquement (à la lecture et par la tâche quotidienne) en comptant les périodes depuis la date d'origine.

## Variables propres à l'app

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `BREVO_API_KEY` | | Clé de l'API transactionnelle Brevo, secrète, obligatoire en production. Absente en développement : les e-mails sont écrits dans le journal du serveur |
| `EMAIL_EXPEDITEUR` | | Adresse d'expédition validée chez Brevo, obligatoire en production |
| `EMAIL_EXPEDITEUR_NOM` | `Abonnely` | Nom affiché de l'expéditeur |
| `RAPPEL_HEURE` | `8` | Heure (Paris) à partir de laquelle la tâche quotidienne envoie les rappels |
| `RAPPELS_ACTIFS` | `1` | 0 : aucun e-mail (tests, préproduction) |
| `IMPORT_LIGNES_MAX` | `5000` | Opérations lues au plus par relevé |

Toutes les variables : `.env.example`. Réglages partagés (Atelier › Réglages) : `rappel_essai_jours` (3, jours avant la
fin d'un essai), `imports_conservation_mois` (12, purge des traces d'import).

## Routes

Aucune route ouverte sans compte. Chaque compte ne voit que ses propres abonnements (404 sinon).

| Méthode et adresse | Offre | Rôle |
| --- | --- | --- |
| `GET /api/tableau` | | Totaux mensuel et annuel, répartition par catégorie, 5 prochains prélèvements, essais qui finissent sous 14 jours |
| `GET /api/abonnements` (`?resilies=1`) | | Abonnements en cours (ou résiliés) |
| `POST /api/abonnements` | limite `abonnements` : 8 en Gratuit | Ajouter (avec `service_id` du catalogue ou en saisie libre) |
| `GET /api/abonnements/:id` | | Un abonnement |
| `PATCH /api/abonnements/:id` | délai de rappel ≠ 3 jours : Premium | Modifier ; `{ reprendre: true }` reprend le suivi d'un abonnement résilié |
| `DELETE /api/abonnements/:id` | | Résilier : archive (`resilie_le`), journalisé |
| `GET /api/services?q=&categorie=` | | Recherche dans le catalogue actif |
| `POST /api/imports` | Premium | `{ csv }` (2 Mo au plus) : analysé en mémoire, renvoie les prélèvements récurrents détectés |
| `POST /api/imports/:id/ajouter` | Premium | `{ propositions: [...] }` : ajoute la sélection |
| `GET /api/abonnements/:id/lettre.pdf?nom=&adresse=&numero=&destinataire=&ville=` | Premium | Lettre de résiliation PDF (A4, sans dépendance) ; coordonnées non enregistrées |

**Tâche quotidienne** (`demarrage`, toutes les heures, travaille une fois par jour à partir de `RAPPEL_HEURE`) :
échéances avancées, rappel « prélèvement le … » `rappel_jours` avant chaque échéance, rappel « fin d'essai » avant
chaque `essai_fin`, envoi par Brevo, un seul e-mail par échéance (table `rappels`, retenté le lendemain en cas d'échec),
purge des traces d'import.

**Détection CSV** : séparateur `;`, `,` ou tabulation, en-tête reconnu (date, libellé, montant ou débit / crédit) ou
deviné, dates jj/mm/aaaa ou ISO, montants à la française. Les débits sont regroupés par libellé nettoyé (sans
« PRLV SEPA », « CB », références ni dates) et par montant à 5 % près ; au moins 2 débits espacés régulièrement
(semaine, mois, trimestre, semestre, an) font une proposition, rapprochée du catalogue. Pas d'agrégation bancaire
automatique (DSP2) : un agrégateur agréé (Bridge, Powens) pourra s'ajouter plus tard.

## Rôles et droits

Rôles du socle uniquement (`admin`, `vip`, `utilisateur`), aucun rôle métier.

| Action | utilisateur Gratuit | utilisateur Premium | vip | admin |
| --- | --- | --- | --- | --- |
| Tableau de bord, totaux, graphique par catégorie | oui | oui | oui | oui |
| Chercher dans le catalogue | oui | oui | oui | oui |
| Ajouter un abonnement | 8 au plus | illimité | illimité | illimité |
| Modifier, résilier (archiver), reprendre ses abonnements | oui | oui | oui | oui |
| Rappel par e-mail (échéance et fin d'essai) | 3 jours avant | délai 0 à 30 jours | réglable | réglable |
| Lien direct de résiliation | oui | oui | oui | oui |
| Importer un relevé CSV | **Premium** | oui | oui | oui |
| Lettre de résiliation PDF | **Premium** | oui | oui | oui |
| Voir les abonnements d'un autre compte | non | non | non | Atelier seulement (Données, RGPD) |
| Catalogue, comptes, réglages | non | non | non | oui (Atelier, Dépannage) |
| Publicité (si `PUB_ACTIVE=1`) | bandeau | non | non | non |

## Offre

| Palier | Pub | Limites | Avantages | Prix TTC |
| --- | --- | --- | --- | --- |
| Gratuit | oui | 8 abonnements suivis | Catalogue, total mensuel et annuel, graphique, rappel 3 jours avant, lien de résiliation | 0 € |
| Premium | non | aucune | Abonnements illimités, import CSV, lettre PDF, délai de rappel réglable, sans publicité (essai 7 jours) | 1,99 €/mois ou 14,99 €/an |

Pub et paiement éteints (`PUB_ACTIVE=0`, `PAIEMENT_ACTIF=0`) : l'écran Abonnement affiche « Bientôt disponible ».

## RGPD

`souscriptions` et `imports` sont supprimés avec le compte (export et suppression depuis l'Atelier › RGPD) ; les
`rappels` suivent par cascade. Traces d'import gardées 12 mois. Les relevés et les coordonnées de la lettre ne sont jamais
enregistrés.

## Icônes

`public/icone*.{svg,png}` : icône **provisoire** (flèche de renouvellement et pièce en euro, aux couleurs de l'app),
à remplacer par les fichiers `identite/` définitifs (mêmes noms).

## Recette

```bash
npm run verifier                                                   # Conforme (26/26)
npm run recette -- postgres://postgres@localhost:5432/postgres     # Conforme (33/33)
```
Sorties complètes : `RECETTE.txt`.
