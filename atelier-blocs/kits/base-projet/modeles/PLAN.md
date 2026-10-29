# Plan — ⟦Nom de l'app⟧

> Modèle du kit « Base projet » v2.0. À présenter **avant de coder** et à faire valider. Une page, pas plus.

## Besoin compris

⟦En 3 à 5 lignes : pour qui, quel problème, ce que l'app fait. Taux de compréhension estimé : ⟦…⟧ %.⟧
Questions restantes : ⟦aucune / liste en QCM⟧

## Écrans

| Écran | Qui | Données affichées | Actions | Blocs réutilisés |
| --- | --- | --- | --- | --- |
| ⟦Connexion⟧ | ⟦tous⟧ | ⟦—⟧ | ⟦se connecter, mot de passe oublié⟧ | ⟦auth⟧ |

## Modèle de données

⟦Tables principales et relations (détail : MODELE-DONNEES.md du kit « Bases de données »).⟧

## Fonctions serveur

| Route ou fonction | Qui a le droit | Entrées validées | Ce qui fuit en cas d'erreur |
| --- | --- | --- | --- |
| ⟦POST /api/rendez-vous⟧ | ⟦client connecté⟧ | ⟦date future, prestation existante⟧ | ⟦message générique⟧ |

## Services externes et variables

⟦Supabase, Stripe, envoi d'emails… avec les variables nécessaires (public / secret).⟧

## Étapes

1. ⟦Socle, connexion⟧ — testable : ⟦…⟧
2. ⟦…⟧

## Hors périmètre

⟦Ce qui ne sera pas fait dans cette version.⟧
