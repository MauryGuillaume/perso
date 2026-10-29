# PodoLogiciel — API

API de PodoLogiciel (bilans podologiques) : comptes des podologues, double authentification, patients, bilans,
documents des patients, semelles orthopédiques, factures et avoirs (avec envoi facultatif à Pennylane), agenda et dépenses. Construite sur le kit « App complète » 1.1 de l'Atelier de Blocs (référence : `KIT.md` du kit) :
variables d'environnement vérifiées, base PostgreSQL créée et migrée toute seule, compte admin par défaut,
journal, RGPD et gestion depuis l'Atelier.

L'écran des podologues est l'app Vue `podology-web` (web et mobile). Elle appelle cette API avec des jetons :
on la construit avec `VITE_API_BASE_URL=<adresse de l'API>/api`.

## Démarrer sur ta machine

Il faut **Node.js** (LTS, https://nodejs.org) et **PostgreSQL** (https://www.postgresql.org/download/ ; retiens le
mot de passe de l'utilisateur `postgres` choisi à l'installation).

- Windows : double-clic sur `lancer-api.bat` ; Mac : `lancer-api.command` ; sinon `npm install` puis `npm start`.
- La première fois, l'outil demande le mot de passe de PostgreSQL et écrit `.env` (clés secrètes tirées au hasard).
- L'API crée la base `podologiciel` et ses tables, puis écoute sur **http://localhost:4517**.

Dans l'écran PodoLogiciel construit pour `http://localhost:4517/api` : « Créer un compte » pour un podologue.

**Compte admin par défaut** : identifiant `admin@admin` (ou `admin`), mot de passe `adminadmin`. À la première
connexion, l'API n'autorise que le profil : change le mot de passe dans Profil › « Changer le mot de passe », le reste s’ouvre ensuite.
L'Atelier affiche une alerte tant que ce n'est pas fait.

## Gérer l'API depuis l'Atelier

Fiche de l'app › Gestion › Connexion : adresse `http://localhost:4517`, clé = `ADMIN_API_KEY` du fichier `.env`.
Tu y vois l'état, les données (tableur), les comptes, le journal, le RGPD et la sauvegarde.

## Routes (contrat de l'écran, `podology-web/src/api.js`)

| Groupe | Routes |
| --- | --- |
| Comptes | `POST /api/auth/register`, `/login`, `/login/2fa`, `/refresh`, `/logout`, `/change-password`, `/forgot-password`, `/reset-password` |
| Profil | `GET` / `PATCH /api/profile` |
| Double authentification | `POST /api/2fa/setup`, `POST /api/2fa/enable`, `DELETE /api/2fa`, `GET /api/2fa/status` |
| Comptes (admin) | `GET /api/roles/users`, `PATCH /api/roles/users/:id/role`, `PATCH …/suspended`, `POST …/impersonate` |
| Patients | `GET` / `POST /api/patients`, `PATCH` / `DELETE /api/patients/:id` |
| Bilans | `GET /api/bilans?patientId=`, `POST /api/bilans`, `PATCH` / `DELETE /api/bilans/:id` (25 Mo par bilan) |
| Agenda | `GET` / `POST /api/agenda`, `PATCH` / `DELETE /api/agenda/:id`, `GET` / `PATCH /api/agenda/settings` |
| Factures | `GET` / `POST /api/factures` (`emettre: true` pour numéroter), `PATCH` / `DELETE /api/factures/:id` (brouillon seulement), `POST /api/factures/:id/emettre`, `POST /api/factures/:id/avoir`, `POST /api/factures/import`, `GET` / `PATCH /api/factures/settings` |
| Documents | `GET /api/documents?patientId=&bilanId=`, `POST /api/documents` (20 Mo, base64), `GET` / `PATCH` / `DELETE /api/documents/:id`, `GET /api/documents/:id/fichier` |
| Semelles | `GET /api/semelles?patientId=`, `POST /api/semelles`, `GET` / `PATCH` / `DELETE /api/semelles/:id` |
| Pennylane | `GET` / `PUT` / `DELETE /api/pennylane` (clé d'API et réglages), `POST /api/pennylane/factures/:id` (envoi avec le PDF), `POST /api/pennylane/patients/synchro` |
| Dépenses | `GET` / `POST /api/expenses`, `POST /api/expenses/recurring`, `PATCH` / `DELETE /api/expenses/:id`, `DELETE /api/expenses/recurrence/:groupe` |

**Routes publiques (sans compte), et pourquoi** : `register` (inscription des podologues, fermée si
`INSCRIPTION_OUVERTE=0`), `login` et `login/2fa` (connexion), `refresh` (renouvellement avec un jeton à usage
unique), `forgot-password` et `reset-password` (mot de passe oublié : même réponse que le compte existe ou non,
lien valable une heure, à usage unique). Toutes limitent les essais (5 échecs → 15 minutes).

**Factures** : un brouillon se modifie et se supprime. Émise, une facture reçoit le numéro suivant de l'année
(2026-0001, 2026-0002…, sans trou) et son contenu ne change plus, ce que la base garantit elle-même (trigger
`factures_verrou`) ; seuls le paiement et la signature du PDF se mettent à jour. Pour l'annuler : un avoir numéroté
aux montants opposés. Le total est toujours recalculé par le serveur. Les factures que l'ancien écran gardait dans le
navigateur sont reprises automatiquement à la première connexion (`/api/factures/import`), émises dans l'ordre des dates.

**Pennylane (facultatif)** : Pennylane n'est pas obligatoire. La réforme de la facture électronique impose de
*recevoir* les factures fournisseurs via une plateforme agréée au choix (depuis le 1er septembre 2026), et les soins
aux patients, exonérés de TVA, ne relèvent ni de l'émission électronique ni de l'e-reporting. Ce connecteur sert au
podologue qui tient sa comptabilité dans Pennylane. Il colle sa clé d'API dans Facturation › Pennylane (Pennylane :
Paramètres › Connectivité › Développeurs, droits en écriture Clients, Factures clients et Fichiers) : elle est
vérifiée, gardée chiffrée (AES-256-GCM, clé dérivée de `DEUX_FACTEURS_CLE`) et jamais renvoyée. Chaque facture émise
est **importée** dans Pennylane avec son numéro et son PDF (fabriqué par l'écran), en TVA « exonérée » ; un avoir est
relié à la facture qu'il annule (la facture doit être envoyée avant). Le patient devient un client Pennylane avec son
nom et son adresse seulement, mis à jour quand sa fiche change. Envoi automatique à l'émission (réglable), ou
manuel ; seules les factures datées à partir d'un jour choisi sont proposées. Pennylane accepte les doublons à
l'import : une facture envoyée ne repart plus, et si la réponse de Pennylane se perd, l'écran demande de vérifier
dans Pennylane avant de la renvoyer.

**Documents** : le type est contrôlé sur le contenu du fichier (pas seulement sur le nom), 20 Mo au plus. Le texte des
PDF et .txt est lu dans le navigateur (pdf.js), sans service extérieur, et reste corrigeable.

Chaque podologue ne voit et ne modifie que ses données. Supprimer depuis l'écran date la ligne (`supprime_le`) :
elle disparaît de l'app et reste visible pour l'admin dans l'Atelier.

## Tables

| Table | Rôle |
| --- | --- |
| `utilisateurs` (socle + colonnes) | Podologues : prénom, cabinet, personnalisation, double authentification (secret chiffré AES-256-GCM) |
| `patients` | Patients d'un podologue |
| `bilans` | Bilans : date, statut, motif, douleur en colonnes ; annotations, schémas, barométrie en JSON (`donnees`) |
| `rendez_vous`, `reglages_agenda` | Agenda et horaires de chaque podologue |
| `depenses` | Comptabilité : dépenses, indemnités kilométriques, récurrences |
| `reinitialisations_mdp` | Liens « mot de passe oublié » en cours (empreinte seulement) |
| `factures`, `factures_compteurs`, `reglages_facturation` | Factures et avoirs ; dernier numéro par année ; actes proposés et relances |
| `documents` | Photos, empreintes, ordonnances, comptes rendus (images, PDF, texte) : fichier, vignette, texte lu, annotations |
| `pennylane_reglages`, `pennylane_clients` | Connexion Pennylane de chaque podologue (clé chiffrée, envoi auto, date de départ) ; patients devenus clients Pennylane. Colonnes `pennylane_*` des factures : identifiant, date et erreur d'envoi |
| `semelles` | Orthèses plantaires : pointure, matériaux, éléments placés sur chaque pied, fabrication et suivi |
| `sessions`, `jetons`, `journal`, `reglages` | Socle du kit |

## Variables propres à l'app

| Variable | Rôle |
| --- | --- |
| `DEUX_FACTEURS_CLE` | Chiffrement des secrets 2FA (32 caractères minimum, obligatoire en production, ne plus la changer) |
| `LIEN_REINITIALISATION` | Page « nouveau mot de passe » de l'écran ; le lien est écrit dans les journaux du serveur tant qu'aucun email n'est branché |
| `PATIENTS_MAX_GRATUIT` | Patients maximum d'un compte gratuit (10) |
| `PENNYLANE_API_URL` | Adresse de l'API Pennylane v2 ; vide = l'officielle. À changer seulement pour un bac à sable ou les tests |

Variables du socle utiles ici : `JETON_SECRET` (signature des jetons, obligatoire en production), `ORIGINES`
(adresses de l'écran : site, `capacitor://localhost` pour l'app mobile, `null` pour l'aperçu de l'Atelier ;
`*` accepté seulement en développement), `INSCRIPTION_OUVERTE=1`. Toutes : `.env.example`.

Dépendance en plus de `pg` : `qrcode` (QR code de la double authentification, sans appel extérieur).

## Recette

```bash
npm run verifier                                                  # Conforme (20 règles)
npm run recette -- postgres://postgres:motdepasse@localhost:5432/postgres   # Conforme (27 scénarios)
node outils/recette-pennylane.js postgres://postgres:motdepasse@localhost:5432/postgres   # Conforme (25 vérifications, faux Pennylane local)
```

## Ce qui reste à brancher pour la mise en ligne

- Envoi des emails « mot de passe oublié » (SMTP) : aujourd'hui le lien s'écrit dans les journaux du serveur.
- Lecture des photos d'ordonnance (reconnaissance de caractères) : aujourd'hui le texte d'une photo se saisit à la main.
- Hébergement certifié HDS pour une mise en ligne (données de santé).
- Paiement de l'abonnement Pro : le rôle se change par l'admin (écran ou Atelier).
