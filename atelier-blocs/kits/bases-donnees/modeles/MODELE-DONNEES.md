# Modèle de données — ⟦Nom de l'app⟧

> Modèle du kit « Bases de données » v2.0. À remplir **avant** d'écrire le SQL, puis à faire valider.
> Une fois validé : `db/migrations/0001_init.sql` (kit « Base de données automatique ») et `node outils/schema-doc.js db/migrations --sortie SCHEMA.md`.

## 1. Ce que l'app manipule

| Chose (entité) | Exemple réel | Qui la crée | Qui la voit | Combien (an 1) |
| --- | --- | --- | --- | --- |
| ⟦Client⟧ | ⟦Mme Martin, 06…⟧ | ⟦l'employé à l'accueil⟧ | ⟦employés du salon⟧ | ⟦2 000⟧ |

## 2. Relations

| De | Vers | Type | À la suppression de « Vers » |
| --- | --- | --- | --- |
| ⟦rendez_vous⟧ | ⟦clients⟧ | ⟦plusieurs pour un (1-n)⟧ | ⟦interdire (restrict)⟧ |
| ⟦rendez_vous⟧ | ⟦prestations⟧ | ⟦plusieurs pour plusieurs (n-n) → table ⟦rendez_vous_prestations⟧⟧ | ⟦interdire⟧ |

## 3. Tables

### `⟦clients⟧` — ⟦description en une phrase⟧

| Colonne | Type | Obligatoire | Défaut | Unique | Lien (on delete) | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | uuid | oui | gen_random_uuid() | | | Clé |
| `⟦nom⟧` | text | oui | | | | ⟦…⟧ |
| `cree_le` | timestamptz | oui | now() | | | Date de création |
| `modifie_le` | timestamptz | oui | now() | | | Dernière modification |

Index : ⟦colonnes filtrées ou triées dans les écrans⟧.

## 4. Écrans → colonnes

| Écran | Données affichées ou saisies | Colonnes |
| --- | --- | --- |
| ⟦Agenda⟧ | ⟦heure, client, prestations, employé⟧ | ⟦rendez_vous.debut, clients.nom, prestations.libelle, employes.nom⟧ |

## 5. Accès

| Table | Lecture | Écriture | Règle |
| --- | --- | --- | --- |
| ⟦clients⟧ | ⟦employés connectés⟧ | ⟦employés connectés⟧ | ⟦RLS : même salon⟧ |

## 6. Données personnelles

| Donnée | Pourquoi | Durée de conservation |
| --- | --- | --- |
| ⟦téléphone⟧ | ⟦rappels de rendez-vous⟧ | ⟦3 ans après le dernier rendez-vous⟧ |
