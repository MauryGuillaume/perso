# Ressena

**Simple, rapide, toujours avec vous.** Un plan progressif qui alterne marche et course, une voix qui annonce
« Courez 90 secondes », et la séance suivante adaptée au ressenti. Pour les débutants, les reprises après une pause et
les personnes en surpoids.

Version 1.0.0, construite sur le kit « App complète » 1.2 de l'Atelier de Blocs (référence : `KIT.md` du kit). Le socle
(`serveur.js`, `noyau/`, `public/noyau.js`, `public/socle.css`) est copié tel quel ; l'app tient dans `app/app.js`,
`db/migrations/0001_init.sql` et `public/app-ecrans.js`.

## Démarrer

```bash
npm install
cp .env.example .env     # remplir DATABASE_URL ; DB_CREER_BASE=1 et INSCRIPTION_OUVERTE=1 sur ta machine
npm start                # crée la base, les tables et le plan 0-5 km, puis http://localhost:3000
```

Première connexion : identifiant `admin`, mot de passe `adminadmin`, à remplacer immédiatement (imposé par le socle).

## Version 1

- Plan « De 0 à 5 km » : 9 semaines, 3 séances par semaine, échauffement et retour au calme de 5 minutes en marchant.
- Séance guidée : « Courez » / « Marchez » en grand, compte à rebours, voix du téléphone (synthèse vocale, aucun service
  externe), pause, arrêt. L'écran reste allumé pendant la séance. La musique de l'utilisateur continue en fond.
- La séance s'enregistre à la fin ; sans réseau, elle reste sur le téléphone et repart à l'ouverture suivante de « Plan »
  (identifiant créé par le téléphone : pas de doublon).
- Ressenti en fin de séance : `trop_facile` ou `bien` → séance suivante ; `difficile` → séance suivante avec un conseil ;
  `trop_dur` ou séance arrêtée → la même séance est reproposée. Après la 3e séance d'une semaine, semaine suivante.
- Avertissement santé à accepter avant la première séance, conseils d'échauffement avant chaque séance.

Limite connue : sur iPhone, si l'écran se verrouille ou si l'app passe en arrière-plan, le navigateur suspend le
chronomètre et la voix. Seule l'app mobile (Capacitor) lèvera cette limite ; elle est prévue avec le GPS (version 2).

## Tables

| Table | Rôle |
| --- | --- |
| `plans` | Programmes d'entraînement : `code` unique (`0-5km`), `nom`, `description`, `semaines` (jsonb : semaines → séances → blocs `course` / `marche` en secondes), `actif`, `ordre` |
| `profils` | Un par compte (`utilisateur_id` unique, cascade) : plan suivi (`plan_id`, restrict), `semaine`, prochaine `seance`, `sante_acceptee_le`, `voix` |
| `seances` | Sorties : `utilisateur_id` (cascade), `plan_id` (set null), `semaine`, `numero`, `debut_le`, `duree_s`, `terminee`, `ressenti` (check), `note`, `distance_m` et `trace` (GPS, v2), `archive_le` |
| `utilisateurs`, `sessions`, `journal`, `reglages`, `jetons`, `abonnements` | Socle du kit |

Toutes les tables ont `id uuid`, `cree_le` / `modifie_le` (`timestamptz`, déclencheur `maj_modifie_le`), un index sur
chaque clé étrangère (`seances (utilisateur_id, debut_le desc)`) et des descriptions en français. Le détail complet :
`node outils/schema-doc.js`.

## Variables propres à l'app

Aucune en version 1. Toutes les variables du socle sont dans `.env.example`. À poser chez l'hébergeur en plus des
obligatoires : `INSCRIPTION_OUVERTE=1` (app grand public) et, pour l'app mobile, `ORIGINES=capacitor://localhost,https://localhost`.

## Réglages (Atelier › Réglages)

| Réglage | Défaut | Rôle |
| --- | --- | --- |
| `plan_depart` | `0-5km` | Plan donné à un nouveau compte |
| `avertissement_sante` | texte fourni | Affiché et à accepter avant la première séance |
| `conseils_echauffement` | 5 conseils | Affichés avant chaque séance (un par ligne) |
| `voix_langue` | `fr-FR` | Langue de la synthèse vocale |

## Routes

Toutes réservées aux comptes connectés (aucune route publique) et limitées aux données du compte connecté.

| Route | Accès | Rôle |
| --- | --- | --- |
| `GET /api/plan` | utilisateur | Profil, plan, séance du jour ; crée le profil au premier appel |
| `PUT /api/profil` | utilisateur | `{ sante_acceptee: true }`, `{ voix: true/false }` |
| `POST /api/plan/recommencer` | utilisateur | Retour en semaine 1, séance 1 (journalisé) |
| `POST /api/seances` | utilisateur | Enregistre une séance `{ id?, semaine, numero, debut_le, duree_s, terminee }` ; renvoi sans doublon |
| `PATCH /api/seances/:id/ressenti` | utilisateur | `{ ressenti, note }` : applique l'adaptation, renvoie la prochaine séance |
| `GET /api/seances?avant=…` | utilisateur | Historique, 20 par page |
| `GET /api/seances/:id` | utilisateur | Détail d'une sortie |
| `DELETE /api/seances/:id` | utilisateur | Retire la sortie de l'historique (`archive_le`, journalisé) |
| `GET /api/records` | utilisateur, palier `premium` | Records et statistiques (402 en Gratuit) |

Les achats intégrés (RevenueCat) passent par le webhook du socle `POST /api/offre/revenuecat`.

## Rôles et droits

Aucun rôle métier : `admin`, `vip` et `utilisateur` viennent du socle.

| Action | utilisateur Gratuit | utilisateur Premium | vip | admin |
| --- | --- | --- | --- | --- |
| Voir son plan, jouer une séance (voix, chronomètre) | oui | oui | oui | oui |
| Enregistrer une séance et son ressenti, voir son historique | oui | oui | oui | oui |
| Retirer une sortie, recommencer le plan, régler la voix | oui | oui | oui | oui |
| Records et statistiques | non (palier `premium`) | oui | oui | oui |
| Plan 5-10 km, GPS et carte (v2) | non (palier `premium`) | oui | oui | oui |
| Voir la pub (si `PUB_ACTIVE=1`) | oui | non | non | non |
| Voir les données des autres coureurs | non | non | non | depuis l'Atelier |
| Gérer plans, comptes, réglages, RGPD | non | non | non | oui (Atelier) |

## Offre

| Palier | Pub | Limites | Avantages | Prix TTC |
| --- | --- | --- | --- | --- |
| Gratuit | oui | aucune | Plan 0-5 km complet, guidage vocal et chronomètre, adaptation au ressenti, historique | 0 € |
| Premium | non | aucune | Records et statistiques, plans 5-10 km et GPS dès leur sortie, sans publicité ; essai 7 jours | 3,99 € / mois, 29,99 € / an |

Pub et paiement éteints au lancement (`PUB_ACTIVE=0`, `PAIEMENT_ACTIF=0`). Jamais de pub sur l'écran « Séance en cours ».

## RGPD

| Table | Personne | Action | Conservation |
| --- | --- | --- | --- |
| `profils` | `utilisateur_id` | supprimer | Tant que le compte existe |
| `seances` | `utilisateur_id` | supprimer | Tant que le compte existe ; compte inactif pendant 3 ans : suppression |

Aucun poids ni donnée médicale n'est collecté.

## Version 2 (prévue) et limites du socle

GPS (distance, allure, parcours) et carte demandent l'app mobile : le socle interdit la géolocalisation dans le
navigateur (`Permissions-Policy: geolocation=()`) et sa CSP refuse les tuiles OpenStreetMap ou IGN (`img-src 'self'`).
Les colonnes `distance_m` et `trace` sont déjà prêtes.

## Recette

```bash
node outils/verifier-app.js                                           # Conforme (25 règles)
node outils/recette-app.js postgres://postgres@localhost:5432/postgres # Conforme (33 scénarios)
```

Sorties jointes : `recette/verifier-app.txt` et `recette/recette-app.txt`.
