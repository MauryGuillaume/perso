<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: 2cc13ba2e97bb8dc -->
# Suivi clients sur l'App Store — tout ce qu'il faut saisir

Dans l'ordre d'**App Store Connect** (appstoreconnect.apple.com). Chaque texte est prêt à copier.

## 1. Identifiant de l'app (developer.apple.com › Certificates, Identifiers & Profiles)
Identifiers › + › App IDs › App : Bundle ID **explicite** :
```text
fr.techview.suiviclients
```
(Xcode le crée tout seul avec la signature automatique ; il doit être le même que dans l'Atelier › App mobile.)
Capacité à cocher : **In-App Purchase** (cochée par défaut).

## 2. Nouvelle app (Apps › +)

| Champ | Réponse |
| --- | --- |
| Plateformes | iOS |
| Nom | Suivi clients (13 / 30 caractères, unique sur tout l'App Store) |
| Langue principale | Français (France) |
| Identifiant de lot (Bundle ID) | `fr.techview.suiviclients` |
| UGS (SKU) | `fr.techview.suiviclients` |
| Accès utilisateur | Accès complet |

## 3. Informations sur l'app

| Champ | Réponse |
| --- | --- |
| Sous-titre | Clients, visites et relances (28 / 30 caractères) |
| Catégorie principale | Économie et entreprise (Business) |
| Catégorie secondaire | Productivité (Productivity) |
| Droits sur le contenu | « Non, elle ne contient pas, n'affiche pas et n'accède pas à du contenu de tiers » |
| Statut de commerçant (UE, DSA) | **Commerçant** si tu vends ou fais de la pub (c'est le cas) : adresse, téléphone et e-mail ci-dessous seront affichés sur la fiche européenne |
| Coordonnées affichées | ⟦Ton nom ou ta société⟧ · ⟦Adresse postale (obligatoire pour un compte organisation et pour vendre dans l'UE)⟧ · (téléphone) · ⟦contact@ton-domaine.fr⟧ |

### Classification par âge (Modifier › questionnaire)

| Question | Réponse |
| --- | --- |
| Violence de dessin animé ou fantastique / Violence réaliste | Aucun / Non |
| Thèmes d’horreur ou de peur | Aucun / Non |
| Contenu sexuel ou nudité / Thèmes suggestifs | Aucun / Non |
| Grossièretés ou humour cru | Aucun / Non |
| Consommation ou références à l’alcool, au tabac ou aux drogues | Aucun / Non |
| Jeux de hasard simulés / Jeux d’argent / Concours | Aucun / Non |
| Informations médicales ou thérapeutiques | Aucun / Non |
| Contenu généré par l’utilisateur | Aucun / Non |
| Messagerie et chat | Aucun / Non |
| Accès Web non restreint | Aucun / Non |
| Publicité | Non |
| Contrôles parentaux, vérification de l'âge | Non |

Résultat attendu : **4+**.


## 4. Prix et disponibilité
Prix : **Gratuit** (0 €), l'offre payante passe par les abonnements (§ 6). Disponibilité : tous les pays, ou la France seulement si l'app ne vise qu'elle.

## 5. Confidentialité de l'app

URL de la politique de confidentialité :
```text
⟦https://suivi-clients.ton-domaine.fr⟧/confidentialite.html
```
« Collectez-vous des données à partir de cette app ? » : **Oui**. Types à cocher, puis pour chacun :

| Catégorie › type | Utilisations | Liée à l'identité | Utilisée pour le suivi (tracking) |
| --- | --- | --- | --- |
| Coordonnées › Adresse e-mail | Fonctionnalité de l’app | Oui | Non |
| Coordonnées › Nom | Fonctionnalité de l’app | Oui | Non |
| Identifiants › ID utilisateur | Fonctionnalité de l’app | Oui | Non |
| Achats › Historique d’achat | Fonctionnalité de l’app | Oui | Non |
| Coordonnées › Numéro de téléphone | Fonctionnalité de l’app | Oui | Non |
| Contenu utilisateur › Autre contenu utilisateur | Fonctionnalité de l’app | Oui | Non |

Rien d'autre : pas de mesure d'audience, de rapport de plantage ni de traceur dans le socle.

## 6. Version iOS 1.0 (fiche de la version)

**Captures d'écran** (`node outils/store-visuels.js`, dossier `store/visuels/app-store/`) :
- iPhone 6,9" : `iphone-6.9/*.png` (1320 × 2868), de 1 à 10. Apple les réduit pour les autres iPhone.
- iPad 13" : `ipad-13/*.png` (2064 × 2752), de 1 à 10 — obligatoires, l'app tourne aussi sur iPad.

**Texte promotionnel** (88 / 170 caractères, modifiable sans nouvelle version)
```text
Ne laissez plus un client sans nouvelles : la liste des relances se remplit toute seule.
```
**Description** (1157 / 4000 caractères)
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

Abonnement Premium : renouvelé automatiquement, résiliable à tout moment dans les réglages de votre compte Apple.
Conditions d’utilisation : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Confidentialité : ⟦https://suivi-clients.ton-domaine.fr⟧/confidentialite.html
```
**Mots-clés** (86 / 100 octets, séparés par des virgules, sans espace)
```text
crm,clients,prospects,relance,intervention,commercial,artisan,suivi,rendez-vous,carnet
```
**URL d'assistance**
```text
⟦https://suivi-clients.ton-domaine.fr⟧/support.html
```
**URL marketing** (facultatif)
**Copyright**
```text
2026 ⟦Ton nom ou ta société⟧
```
**Build** : celui envoyé depuis Xcode (Product › Archive › Distribute App), visible dans TestFlight 15 à 30 minutes après.

### Informations pour la revue de l'app

| Champ | Réponse |
| --- | --- |
| Connexion requise | **Oui** |
| Nom d'utilisateur | `demo@suivi-clients.fr` |
| Mot de passe | celui du compte de démo (saisis-le dans App Store Connect, **jamais dans ce dossier**) |
| Prénom, nom | ⟦Prénom⟧ ⟦Nom⟧ |
| Téléphone | ⟦+33 6 00 00 00 00⟧ |
| E-mail | ⟦contact@ton-domaine.fr⟧ |

**Remarques** (894 / 4000 caractères)
```text
Suivi clients aide les indépendants et les petites équipes à suivre leurs clients et leurs interventions. Toute l'app demande un compte : utilisez le compte de démonstration ci-dessus, qui contient déjà des clients et des interventions.

Compte de démonstration : demo@suivi-clients.fr (mot de passe dans le champ prévu).

Suppression du compte : Compte › Supprimer mon compte (mot de passe demandé ; le compte et ses données sont effacés).

Confidentialité, conditions et aide : liens en bas de l’écran Compte et de l’écran Abonnement.

Abonnements : écran Abonnement (Compte › Voir les offres), achetés par les achats intégrés d’Apple (StoreKit, via RevenueCat), avec « Restaurer mes achats » sur le même écran. Le compte de démonstration est à l’offre gratuite : l’achat se teste avec un compte sandbox.

L’app communique avec son serveur en HTTPS ; toutes les fonctions demandent un compte.
```

### Conformité de l'exportation
Déjà répondu dans l'app : `ITSAppUsesNonExemptEncryption = false` (ajouté par l'Atelier, l'app n'utilise que le HTTPS).

## 7. Abonnements (Monétisation › Abonnements)

Un **groupe d'abonnements** « Suivi clients Premium », puis un abonnement à renouvellement automatique par palier et période.
Dans RevenueCat, chaque produit donne le droit (entitlement) qui porte l'**id du palier** (webhook : `APP_URL/api/offre/revenuecat`).

| Abonnement | Identifiant du produit | Prix | Essai gratuit | Droit RevenueCat (entitlement) |
| --- | --- | --- | --- | --- |
| Premium mensuel | `fr.techview.suiviclients.premium.mensuel` | 4,99 € TTC / mois | — | `premium` |
| Premium annuel | `fr.techview.suiviclients.premium.annuel` | 39,99 € TTC / an | — | `premium` |

Pour chacun : durée, prix (palier de prix le plus proche du TTC), nom affiché et description en français, **capture de
l'écran d'achat** (`#/abonnement`, dans les captures iPhone), offre d'introduction si essai gratuit. Le premier
abonnement s'envoie **avec** la première version de l'app (case « Achats intégrés et abonnements » de la version).
Dans l'app, sur iPhone, les liens « Conditions d'utilisation » (CLUF standard d'Apple) et « Confidentialité » sont sous les offres (règle 3.1.2).

## 8. Envoyer pour examen
Ajouter pour examen › Envoyer. Réponse en général sous 24 à 48 heures. Publication manuelle conseillée la première fois.
