# ⟦Nom de l'app⟧

⟦À quoi sert l'app, pour qui, en 2 ou 3 lignes.⟧

Version ⟦1.0.0⟧ — ⟦jj/mm/aaaa⟧ · ⟦Stack : HTML, CSS, JavaScript + Node.js + PostgreSQL⟧

## Lancer en local

```bash
cp .env.example .env        # puis remplir les valeurs (voir Variables)
npm ci
npm start                   # http://localhost:3000
```

## Variables d'environnement

| Clé | Rôle | Obligatoire | Défaut | Secrète |
| --- | --- | --- | --- | --- |
| `⟦DATABASE_URL⟧` | ⟦Connexion à la base⟧ | oui | | **oui** |
| `⟦PORT⟧` | ⟦Port HTTP⟧ | non | 3000 | non |

Une variable secrète ne va que sur le serveur (réglages de l'hébergeur, secrets Supabase), jamais dans le dépôt.

## Déploiement

1. ⟦Créer le projet chez l'hébergeur (…), relier le dépôt.⟧
2. ⟦Renseigner les variables d'environnement.⟧
3. ⟦La base est créée au premier démarrage (migrations).⟧
4. ⟦Vérifier : …⟧

## Mise à jour

1. ⟦Sauvegarder la base.⟧
2. ⟦Déployer la nouvelle version ; les nouvelles migrations s'appliquent au démarrage.⟧
3. ⟦Vérifier la recette rapide (LIVRAISON.md).⟧

## Base de données

⟦Tableau des tables et de leur rôle, ou lien vers SCHEMA.md.⟧

## Données personnelles

| Donnée | Pourquoi | Durée de conservation |
| --- | --- | --- |
| ⟦email⟧ | ⟦connexion⟧ | ⟦jusqu'à la suppression du compte⟧ |
