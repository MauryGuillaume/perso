# Prompt d'entrée — affichage français et obligations légales

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit**. Remplace les éléments entre ⟦ ⟧.

---

L'app **⟦Nom de l'app⟧** s'adresse à ⟦des particuliers / des professionnels⟧ en France. ⟦Elle fait payer : oui / non.⟧
⟦Elle utilise une mesure d'audience ou d'autres traceurs : lesquels / aucun.⟧ On ⟦vouvoie / tutoie⟧ l'utilisateur.

## Avant d'écrire du code

1. Lis **intégralement** `KIT.md`, puis `modele/`.
2. Liste ce que l'app affiche (prix, dates, quantités…) et les pages légales nécessaires (§ 5), et dis-moi les
   informations qui te manquent pour les remplir (raison sociale, SIRET, hébergeur, médiateur…).

## Règles non négociables

- `affichage.js` copié tel quel ; **tout** prix, date, heure, nombre, téléphone et pluriel passe par `fr.…` (jamais `toFixed`, jamais `+ ' €'`).
- Montants stockés en centimes (entier) ou en `numeric(12,2)` ; prix affichés **TTC** aux particuliers.
- Textes 100 % en français, sans faute, avec le même ⟦vouvoiement / tutoiement⟧ partout.
- Mentions légales et confidentialité accessibles depuis chaque écran ; CGV lisibles et acceptées avant tout paiement.
- Aucun traceur soumis au consentement avant le choix ; refuser aussi simple qu'accepter (`bandeau-cookies.js`).

## Livraison

- `node outils/verifier-affichage.js .` → **« Conforme »**, sortie dans le compte rendu.
- La liste des ⟦…⟧ restés à remplir dans les pages légales.

Commence par la lecture de `KIT.md`.
