<!-- Généré par outils/store-app.js — ne pas modifier : change store/store.json puis relance l'outil. store-empreinte: 2cc13ba2e97bb8dc -->
# Dossier des stores — Suivi clients

Tout ce qu'il faut pour publier Suivi clients sur **Google Play** et l'**App Store** (kit « App complète » 1.4.0, KIT.md § 18).
Seul `store.json` se modifie à la main ; le reste se régénère avec `node outils/store-app.js`.

| Fichier | Contenu |
| --- | --- |
| `store.json` | **La fiche** : textes, catégorie, public, contenu, données collectées, compte de démo, captures à faire |
| `PUBLIER.md` | La liste complète, dans l'ordre : comptes, mise en ligne, app mobile, visuels, envois |
| `GOOGLE-PLAY.md` | Chaque champ de la Play Console : fiche, sécurité des données, classification, public cible, accès, annonces, abonnements |
| `APP-STORE.md` | Chaque champ d'App Store Connect : fiche, confidentialité de l'app, classification par âge, notes de revue, abonnements |
| `visuels/` | Icônes, bannière Play et captures aux tailles exactes (`node outils/store-visuels.js postgres://…`) |
| `../public/confidentialite.html` | Politique de confidentialité → ⟦https://suivi-clients.ton-domaine.fr⟧/confidentialite.html |
| `../public/support.html` | Aide et contact → ⟦https://suivi-clients.ton-domaine.fr⟧/support.html |
| `../public/suppression-compte.html` | Suppression du compte (exigée par Google Play) → ⟦https://suivi-clients.ton-domaine.fr⟧/suppression-compte.html |
| `../public/conditions.html` | Conditions d'utilisation → ⟦https://suivi-clients.ton-domaine.fr⟧/conditions.html |

## État au 30 octobre 2026

- ! règle 30 : à remplir avant de publier, encore des ⟦…⟧ : editeur.nom, editeur.email, editeur.adresse, copyright, urls.app, soustraitants.0.nom … (+5)
- ! règle 30 : store/visuels/google-play/icone-512.png absent ; store/visuels/google-play/banniere-1024x500.png absent ; store/visuels/app-store/icone-1024.png absent … (+4) ; lance « node outils/store-visuels.js postgres://…/postgres »

Ces pages et ces déclarations décrivent ce que fait l'app : **relis-les** (surtout la confidentialité et les conditions)
et fais-les valider si l'app traite des données sensibles.
