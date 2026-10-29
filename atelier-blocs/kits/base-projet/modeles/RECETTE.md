# Recette — ⟦Nom de l'app⟧ v⟦1.0.0⟧

> Modèle du kit « Base projet » v2.0. Chaque ligne : **fait** (✓), **échoué** (✗, avec la raison) ou **non testé** (○, avec la raison).

Testé le ⟦jj/mm/aaaa⟧ sur ⟦Chrome 1xx ordinateur, iPhone Safari, Android Chrome⟧.

## Outils

| Outil | Résultat |
| --- | --- |
| `node outils/verifier-livraison.js .` | ⟦Conforme⟧ |
| `node outils/verifier-securite.js .` | ⟦Conforme⟧ |
| ⟦verifier-base.js / schema-doc.js / verifier-pwa.js / verifier-charte.js / verifier-affichage.js⟧ | ⟦…⟧ |

## Parcours

| Parcours | Téléphone 390 px | Ordinateur | Remarque |
| --- | --- | --- | --- |
| ⟦Créer un compte, se connecter, se déconnecter⟧ | ⟦✓⟧ | ⟦✓⟧ | |

## Cas d'erreur

| Cas | Résultat |
| --- | --- |
| Champ obligatoire vide | ⟦✓ message clair⟧ |
| Mauvais mot de passe (dix fois) | ⟦✓ ralenti⟧ |
| Réseau coupé pendant un envoi | ⟦✓ « Pas de connexion »⟧ |
| Accès à une page protégée sans être connecté | ⟦✓ redirigé⟧ |
| Lecture des données d'un autre utilisateur (identifiant modifié) | ⟦✓ refusé⟧ |
| Texte très long, HTML ou `<script>` dans un champ | ⟦✓ sans effet⟧ |

## Console

Aucune erreur dans la console du navigateur sur tous les écrans : ⟦✓⟧
