# PodoLogiciel Cabinet (v2)

Logiciel de cabinet de podologie **de groupe** : patients, bilans podologiques avec schéma des pieds,
agenda, factures, journal d'accès. Plusieurs praticiens et un secrétariat travaillent sur les mêmes
données, gardées sur le serveur du cabinet, chez un hébergeur certifié HDS.

L'app (dossier `api/public/`) est construite avec l'Atelier de Blocs (blocs Serveur du cabinet,
Équipe du cabinet, Patients, Bilan podologique, Agenda, Facturation, Journal d'accès). Le fichier
`atelier/podologiciel-cabinet-atelier.json` se réimporte dans l'Atelier pour la modifier.

## Contenu

| Chemin | Rôle |
| --- | --- |
| `api/serveur.js` | API et serveur de l'app (Node 20, aucune dépendance npm) |
| `api/securite.js` | Mots de passe (scrypt), double authentification (TOTP), chiffrement AES-256-GCM |
| `api/db.js`, `api/pg.js` | Connexion à PostgreSQL (client intégré), transactions, migrations |
| `api/migrations/001_init.sql` | Tables, règles « facture non modifiable » et « journal non effaçable » |
| `api/outils/creer-admin.js` | Crée le premier compte administrateur |
| `api/public/` | L'app (PWA) servie par l'API, polices et icônes comprises |
| `docker-compose.yml`, `Caddyfile` | Base + API + HTTPS automatique |
| `.env.example` | Les 3 réglages à remplir (domaine, mot de passe de la base, clé de chiffrement) |
| `outils/sauvegarde.sh` | Sauvegarde chiffrée de la base, à lancer chaque nuit |
| `DEPLOIEMENT.md` | Mise en ligne chez un hébergeur HDS, pas à pas |

## Essayer sur ton ordinateur (Docker)

```bash
cp .env.example .env
# dans .env : PODO_DOMAINE=localhost, POSTGRES_PASSWORD=$(openssl rand -hex 24), PODO_CLE=$(openssl rand -base64 32)
docker compose up -d --build
docker compose exec api node outils/creer-admin.js toi@cabinet.fr "Nom Prénom" AB
# ouvre https://localhost (certificat local : accepte l'avertissement), connecte-toi avec le mot de passe provisoire
```

Sans Docker : Node 20+ et PostgreSQL 14+, puis dans `api/` :
`DATABASE_URL=postgres://… PODO_CLE=… PODO_ORIGINE=http://localhost:8080 node serveur.js` (http seulement en local).

## Qui voit quoi

| | Praticien | Secrétariat | Administrateur |
| --- | --- | --- | --- |
| Identité et coordonnées des patients | tous | tous | tous |
| Dossier médical (antécédents, traitements, allergies, notes) et bilans | ses patients (référent) et ceux qu'on lui partage | non | comme un praticien |
| Agenda | le sien | tous les praticiens | tous |
| Factures | les siennes | toutes, en crée pour un praticien | toutes |
| Comptes de l'équipe, journal de tout le cabinet | non | non | oui |

Le praticien référent (ou l'administrateur) choisit avec qui partager le dossier médical d'un patient.

## Sécurité

- Connexion : e-mail + mot de passe (12 caractères au moins) + code à 6 chiffres d'une application
  d'authentification. Mot de passe provisoire à changer à la première connexion.
- 5 essais ratés : compte bloqué 15 minutes ; limite aussi par adresse IP.
- Session dans un cookie `HttpOnly`, `Secure`, `SameSite=Strict` ; nouveau jeton après la double
  authentification ; déconnexion après 30 minutes d'inactivité côté serveur (15 côté app), 12 h au plus.
- Écritures protégées contre le CSRF (en-tête `X-Podo` et origine vérifiés).
- Données de santé chiffrées par l'API (AES-256-GCM) avant d'aller en base : identité, dossier médical,
  bilans, motifs de rendez-vous, lignes des factures, détails du journal. La clé `PODO_CLE` ne quitte
  pas le serveur ; un vol de la base ou d'une sauvegarde seule ne donne rien de lisible.
- Factures : numéro continu par praticien et par année donné par la base (`F-2026-AB-0001`), total
  recalculé par le serveur ; une facture ne se modifie pas (sauf son paiement) et ne se supprime pas,
  même en SQL (règle dans la base).
- Journal d'accès : connexions, échecs, consultations, impressions, exports et écritures ; on ne peut ni
  le modifier ni l'effacer, même en SQL.
- En-têtes de sécurité (CSP stricte, HSTS, anti-iframe) ; l'app ne charge rien depuis un autre site.
- Aucun secret dans l'app : le navigateur ne connaît que son cookie de session.

## Limites de cette version

- Pas de télétransmission SESAM-Vitale ni de feuille de soins électronique : à faire avec un logiciel
  agréé ou un partenaire certifié (voir `DEPLOIEMENT.md`).
- Pas encore d'avoir (facture d'annulation) pour corriger une facture émise.
- La double authentification se configure en saisissant la clé (ou par le lien sur téléphone), sans QR code.
- La clé de chiffrement ne se change pas encore (pas de rotation) : garde-la en lieu sûr dès le départ.
