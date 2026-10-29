# Suivi clients

Suivi des clients et des interventions, avec relances. App construite sur le kit « App complète » 1.1 de l'Atelier de Blocs
(référence : KIT.md du kit).

## Démarrer

```bash
npm install
cp .env.example .env     # remplir DATABASE_URL ; DB_CREER_BASE=1 sur ta machine
npm start                # crée la base et les tables, puis http://localhost:3000
```

Première connexion : identifiant `admin`, mot de passe `adminadmin`, à remplacer immédiatement.

## Tables

| Table | Rôle |
| --- | --- |
| `clients` | Clients et prospects suivis (archivés, jamais effacés) |
| `interventions` | Rendez-vous, appels et travaux réalisés pour un client |
| `utilisateurs`, `sessions`, `journal`, `reglages` | Socle du kit (comptes, sessions, journal, réglages) |

## Variables propres à l'app

| Variable | Rôle |
| --- | --- |
| `RELANCE_JOURS` | Jours sans contact avant de proposer une relance (30) |

Toutes les variables : `.env.example`. Aucune route n'est ouverte sans compte.

## Recette

```bash
npm run verifier                                      # Conforme
npm run recette -- postgres://postgres@localhost:5432/postgres   # Conforme
```
