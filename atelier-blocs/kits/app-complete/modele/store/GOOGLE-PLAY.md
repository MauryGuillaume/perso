<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: 2cc13ba2e97bb8dc -->
# Suivi clients sur Google Play — tout ce qu'il faut saisir

Dans l'ordre de la **Play Console** (play.google.com/console). Chaque texte est prêt à copier.
Identifiant de l'app (nom du paquet) : `fr.techview.suiviclients` — le même que dans l'Atelier › App mobile, il ne change plus une fois publié.

## 1. Créer l'application

| Champ | Réponse |
| --- | --- |
| Nom de l'application | Suivi clients |
| Langue par défaut | Français (France) – fr-FR |
| Application ou jeu | Application |
| Application gratuite ou payante | Gratuite (les abonnements se vendent dans l'app) |
| Déclarations | Coche le règlement du programme pour les développeurs et les lois d'exportation des États-Unis |

## 2. Configurer votre application (Tableau de bord › « Configurer votre application »)

### Règles de confidentialité
URL :
```text
⟦https://suivi-clients.ton-domaine.fr⟧/confidentialite.html
```

### Accès à l'application
« **Toutes ou certaines fonctionnalités sont soumises à des restrictions** » › Ajouter des instructions :

| Champ | Réponse |
| --- | --- |
| Nom des instructions | Compte de démonstration |
| Nom d'utilisateur, adresse e-mail ou numéro de téléphone | `demo@suivi-clients.fr` |
| Mot de passe | celui du compte de démo (saisis-le dans la console, **jamais dans ce dossier**) |
| Autres informations | le texte ci-dessous |

```text
Suivi clients aide les indépendants et les petites équipes à suivre leurs clients et leurs interventions. Toute l'app demande un compte : utilisez le compte de démonstration ci-dessus, qui contient déjà des clients et des interventions.

La suppression du compte se trouve dans Compte › Supprimer mon compte.
```

Le compte de démo doit exister **dans l'app en ligne**, avec des données d'exemple, et ne pas expirer.

### Annonces
« Votre application contient-elle des annonces ? » : Non — le bandeau maison du socle ne fait que proposer l'offre payante de l'app ; si tu ajoutes AdMob (pub.admob), réponds Oui

### Classification du contenu
Adresse e-mail : `⟦contact@ton-domaine.fr⟧` · Catégorie : « **Toutes les autres types d'applications** » (utilitaire, productivité, communication…).

| Question (questionnaire IARC) | Réponse |
| --- | --- |
| Violence | Non |
| Éléments qui font peur | Non |
| Sexualité | Non |
| Langage | Non |
| Substances réglementées | Non |
| Jeux d’argent et de hasard | Non |
| Les utilisateurs peuvent interagir ou échanger du contenu | Non |
| Partage de la position avec d’autres utilisateurs | Non |
| Accès non restreint à Internet | Non |
| Achats numériques | **Oui** |

Résultat attendu : **PEGI 3** (tout public).

### Public cible et contenu
Tranches d'âge à cocher : **18 ans et plus**.
« L'application peut-elle attirer involontairement des enfants ? » : Non (rien dans l'app ne vise les enfants).

### Applications d'actualités · Applications gouvernementales · COVID-19
Non · Non · Non (« Mon application n'est pas une application de santé publique COVID-19 »).

### Fonctionnalités financières
« Mon application ne propose aucune fonctionnalité financière ».

### Applications de santé
« Mon application n'a pas de fonctionnalités de santé ».

### Identifiant publicitaire
Non, l'application n'utilise pas l'identifiant publicitaire.

### Sécurité des données

| Question | Réponse |
| --- | --- |
| L'application collecte-t-elle ou partage-t-elle des types de données requis ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS imposé en production) |
| Quels moyens proposez-vous pour demander la suppression des données ? | **Les utilisateurs peuvent demander la suppression** : dans l'app (Compte › Supprimer mon compte) et à l'adresse ci-dessous |
| URL de suppression du compte | `⟦https://suivi-clients.ton-domaine.fr⟧/suppression-compte.html` |

Types de données à cocher, puis pour chacun :

| Catégorie › type | Collectée | Partagée | Traitement éphémère | Obligatoire ou facultative | Finalités |
| --- | --- | --- | --- | --- | --- |
| Informations personnelles › Adresse e-mail | Oui | Non | Non | Obligatoire | Gestion du compte, Fonctionnalités de l’appli |
| Informations personnelles › Nom | Oui | Non | Non | Obligatoire | Gestion du compte, Fonctionnalités de l’appli |
| Informations personnelles › ID utilisateur | Oui | Non | Non | Obligatoire | Gestion du compte |
| Informations financières › Historique des achats | Oui | Non | Non | Facultative | Fonctionnalités de l’appli |
| Informations personnelles › Numéro de téléphone | Oui | Non | Non | Facultative | Fonctionnalités de l’appli |
| Activité dans les applis › Autre contenu généré par l’utilisateur | Oui | Non | Non | Obligatoire | Fonctionnalités de l’appli |

Ne coche rien d'autre : l'app n'a ni mesure d'audience, ni rapport de plantage, ni traceur.
« Partagée » ne compte pas les sous-traitants qui travaillent pour toi (hébergeur, Stripe, RevenueCat) : seulement les données remises à un tiers pour son propre usage.

## 3. Fiche Play Store principale (Croissance › Présence sur le Play Store)

**Nom de l'application** (13 / 30 caractères)
```text
Suivi clients
```
**Description courte** (72 / 80 caractères)
```text
Vos clients, vos interventions et les relances à faire, au même endroit.
```
**Description complète** (871 / 4000 caractères)
```text
Suivi clients rassemble vos clients et tout ce que vous faites pour eux : chaque visite, chaque appel, chaque intervention, avec la date, la durée et le montant.

L'app vous dit qui relancer : les clients sans nouvelles depuis 30 jours apparaissent d'eux-mêmes dans la liste des relances.

CE QUE VOUS POUVEZ FAIRE
• Créer une fiche par client : nom, e-mail, téléphone
• Noter chaque intervention en quelques secondes : date, durée, montant
• Retrouver un client en tapant son nom
• Voir la liste des relances à faire (Premium)

GRATUIT OU PREMIUM
L'offre Gratuite suit jusqu'à 20 clients, avec un bandeau publicitaire discret. Premium supprime la limite et la publicité, et ajoute la liste des relances.

VOS DONNÉES
Vos données restent les vôtres : elles ne sont jamais revendues, et vous pouvez supprimer votre compte et toutes vos données depuis l'app, à tout moment.
```

**Éléments graphiques** (générés par `node outils/store-visuels.js`, dossier `store/visuels/google-play/`) :

| Élément | Fichier | Exigence |
| --- | --- | --- |
| Icône de l'application | `icone-512.png` | PNG 512 × 512, 1 Mo au plus |
| Image de présentation | `banniere-1024x500.png` | PNG ou JPEG 1024 × 500, sans transparence |
| Captures d'écran du téléphone | `telephone/*.png` | 2 à 8, 1080 × 1920 |
| Captures pour tablette 7" et 10" | `tablette-10/*.png` | facultatif, 1600 × 2560 (les mêmes pour 7" et 10") |

## 4. Paramètres du Play Store

| Champ | Réponse |
| --- | --- |
| Catégorie | Entreprise (Business) |
| Tags | jusqu'à 5, à choisir dans la liste de la console (proches de : crm, clients, prospects, relance, intervention) |
| Adresse e-mail | ⟦contact@ton-domaine.fr⟧ |
| Site Web | ⟦https://suivi-clients.ton-domaine.fr⟧ |
| Téléphone | (facultatif) |

## 5. Abonnements (Monétiser › Produits › Abonnements)

Un abonnement par palier payant, avec un **forfait de base** par période (renouvellement automatique). Les identifiants
ne changent plus une fois créés. Dans RevenueCat, chaque produit donne le droit (entitlement) qui porte l'**id du palier** :
c'est ce que le socle lit dans le webhook (`APP_URL/api/offre/revenuecat`).

| Abonnement | Identifiant du produit | Prix | Essai gratuit | Droit RevenueCat (entitlement) |
| --- | --- | --- | --- | --- |
| Premium mensuel | `premium_mensuel` | 4,99 € TTC / mois | — | `premium` |
| Premium annuel | `premium_annuel` | 39,99 € TTC / an | — | `premium` |

Prix : saisis le prix TTC en euros pour la France, laisse Google convertir pour les autres pays.

## 6. Versions

1. **Test interne** (Tests › Test interne) : importe le fichier `.aab` construit depuis l'Atelier (App mobile), ajoute ton adresse comme testeur.
2. **Test fermé** : obligatoire pour un **compte personnel** créé après novembre 2023 : **12 testeurs pendant 14 jours** avant de pouvoir demander l'accès à la production.
3. **Production** › Créer une version › même `.aab` › notes de version (34 / 500 caractères) :
```text
Première version de Suivi clients.
```
4. Envoyer pour examen. La première revue prend souvent plusieurs jours.
