<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: 2cc13ba2e97bb8dc -->
# Publier Suivi clients — la liste complète, dans l'ordre

Coche au fur et à mesure (la même liste est dans l'Atelier › Mes apps › Suivi clients › App mobile › Stores).

## 1. Les comptes (une seule fois pour toutes tes apps)

- [ ] **Apple Developer Program** : 99 $ par an, developer.apple.com/programs/enroll. Personnel (ton nom affiché) ou
      organisation (nom de la société, numéro **D-U-N-S** gratuit, 1 à 2 semaines).
- [ ] **Google Play Console** : 25 $ une fois, play.google.com/console/signup, vérification d'identité (pièce d'identité,
      adresse, et compte marchand Google Payments pour vendre).
      Compte **personnel** récent : test fermé de **12 testeurs pendant 14 jours** avant la production. Compte organisation : non.
- [ ] Apple : **statut de commerçant** (DSA) dans App Store Connect › Business, pour être distribué dans l'UE.
- [ ] Apple : **Accord des apps payantes** signé, coordonnées bancaires et fiscales (App Store Connect › Business).
- [ ] Google : **profil de paiement** (Play Console › Configuration › Profil de paiement).
- [ ] **RevenueCat** : un projet, une app iOS et une app Android, les droits (entitlements) aux ids des paliers (premium).

## 2. L'app en ligne (avant tout envoi)

- [ ] L'app tourne à ⟦https://suivi-clients.ton-domaine.fr⟧ en **production** (`APP_ENV=production`, `APP_URL=⟦https://suivi-clients.ton-domaine.fr⟧`), mot de passe admin changé.
- [ ] Les pages publiques s'ouvrent sans compte : [confidentialité](⟦https://suivi-clients.ton-domaine.fr⟧/confidentialite.html), [aide](⟦https://suivi-clients.ton-domaine.fr⟧/support.html),
      [suppression du compte](⟦https://suivi-clients.ton-domaine.fr⟧/suppression-compte.html), [conditions](⟦https://suivi-clients.ton-domaine.fr⟧/conditions.html).
- [ ] Le **compte de démonstration** `demo@suivi-clients.fr` existe en production, avec des données d'exemple et un mot de passe noté dans ton gestionnaire.
- [ ] `INSCRIPTION_OUVERTE=1` si chacun crée son compte depuis l'app (sinon, explique dans les notes de revue comment on obtient un compte).
- [ ] Paiement : `PAIEMENT_ACTIF=1`, `REVENUECAT_WEBHOOK_CLE`, `REVENUECAT_CLE_IOS`, `REVENUECAT_CLE_ANDROID` (et Stripe pour le web) — KIT.md § 17.3.
- [ ] Publicité : `PUB_ACTIVE=1` — KIT.md § 17.4.

## 3. L'app mobile (Atelier › Mes apps › Suivi clients › App mobile)

- [ ] Identifiant `fr.techview.suiviclients`, nom « Suivi clients », appareils iPhone et iPad, version 1.0.0.
- [ ] Projet téléchargé, `npm run preparer`, essai sur un vrai téléphone (connexion, écrans, suppression du compte).
- [ ] Signature : Xcode (équipe, signature automatique) ; Android : clé d'envoi `.jks` **sauvegardée** avec ses mots de passe, Play App Signing activé.

## 4. Les visuels et les textes

- [ ] `node outils/store-app.js` puis `node outils/verifier-app.js` : règles 27 à 29 vertes.
- [ ] `node outils/store-visuels.js postgres://…/postgres` (serveur PostgreSQL de **test**) : icônes, bannière et captures dans `store/visuels/` ; règle 30 verte. Regarde chaque image.

## 5. Google Play — `store/GOOGLE-PLAY.md`

- [ ] Créer l'app, puis toutes les rubriques de « Configurer votre application » (confidentialité, accès, annonces, classification, public cible, sécurité des données…).
- [ ] Fiche principale (textes et visuels), catégorie et coordonnées.
- [ ] Abonnements créés et liés dans RevenueCat.
- [ ] Test interne → test fermé (12 testeurs, 14 jours si compte personnel) → production.

## 6. App Store — `store/APP-STORE.md`

- [ ] Créer l'app (Bundle ID `fr.techview.suiviclients`), informations, classification par âge, prix, confidentialité de l'app.
- [ ] Build envoyé depuis Xcode, essayé dans **TestFlight**.
- [ ] Fiche de la version (captures, textes), informations pour la revue (compte de démo).
- [ ] Abonnements créés (groupe, prix, capture), joints à la version.
- [ ] Envoyer pour examen.

## 7. À chaque nouvelle version

- [ ] `app/app.js → version`, `public/sw.js → VERSION`, `store/store.json → nouveautes`, puis `node outils/store-app.js`.
- [ ] Nouvel export mobile depuis l'Atelier (le numéro de build augmente tout seul), envoi sur les deux stores.
- [ ] Nouvelles captures si les écrans ont changé (`node outils/store-visuels.js …`).

## Raisons de refus fréquentes

- Compte de démonstration absent, expiré ou vide (Apple 2.1, Google « Accès à l'application »).
- Politique de confidentialité ou page de suppression du compte inaccessible sans compte.
- Sécurité des données ou confidentialité de l'app qui ne correspond pas à ce que fait l'app (une SDK oubliée).
- Abonnement acheté hors des achats intégrés sur iPhone (3.1.1), ou sans liens vers les conditions et la confidentialité (3.1.2).
- Captures qui ne montrent pas l'app réelle, ou textes qui citent l'autre store.
