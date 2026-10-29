# Mini Notes

Petite app de notes, exemple de livraison conforme du kit « Base projet ».

Version 1.0.0 — 22/10/2026 · Stack : HTML, CSS, JavaScript + Node.js + PostgreSQL

## Lancer en local

```bash
cp .env.example .env
npm ci
npm start
```

## Variables d'environnement

| Clé | Rôle | Obligatoire | Défaut | Secrète |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Connexion à la base | oui | | **oui** |
| `PORT` | Port HTTP | non | 3000 | non |

## Déploiement

1. Créer le service Node chez l'hébergeur et une base PostgreSQL.
2. Renseigner `DATABASE_URL`.
3. Les tables sont créées au premier démarrage.

## Mise à jour

1. Sauvegarder la base.
2. Déployer ; les nouvelles migrations s'appliquent au démarrage.

## Données personnelles

Aucune donnée personnelle.
