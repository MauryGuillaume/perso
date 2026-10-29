# HandFit 1.0.0

App perso (PWA) : séance du jour de muscu à la maison (élastiques + poids du corps), explosivité pour le handball
et routine anti-périostite, à cocher chaque jour. 100 % statique : pas de serveur, pas de compte, données sur le
téléphone (IndexedDB). HTML, CSS et JavaScript vanilla sur le kit « Socle PWA » de l'Atelier de Blocs.

## Mettre en ligne

Copier tout le dossier sur un hébergement statique en https (Netlify Drop, GitHub Pages, Cloudflare Pages…), ouvrir
l'adresse sur le téléphone, puis « Ajouter à l'écran d'accueil ». L'app marche ensuite hors ligne.

En local : `python3 -m http.server 8080` dans le dossier, puis http://localhost:8080.

## Comment ça marche

- **Aujourd'hui** : bilan en 5 secondes (douleur au tibia 0–10, 30 ou 45 min, signe inquiétant), puis la liste des
  exercices du jour par bloc (échauffement, explosivité, musculation, gainage, finisher, routine tibias). On touche le
  rond pour cocher, le nom pour voir les consignes.
- **Semaine** : le planning (lundi pecs/triceps, mardi dos/biceps, mercredi jambes, jeudi épaules/abdos, vendredi haut
  du corps, samedi bas du corps adapté, dimanche récupération) et l'aperçu de chaque séance.
- **Historique** : jours suivis, exercices faits, courbe de la douleur au tibia sur 14 jours.
- **Réglages** (roue dentée) : profil tibias (sensible, en renforcement, reprise sportive), sauvegarde et restauration.

## Règles d'adaptation (programme.js)

- Signe inquiétant ou douleur ≥ 7 : aucun exercice en charge sur les jambes, pas de renforcement des tibias, conseil de consulter.
- Douleur ≥ 4 : exercices debout remplacés par des versions au sol, routine tibias douce, pas de finisher.
- Sauts (squat sauté, bonds latéraux) seulement en profil « reprise sportive » et douleur ≤ 1 ; sinon explosivité sans impact (pont fessier explosif).
- Routine tibias : renforcement lundi, mercredi, vendredi ; mobilité et contrôle les autres jours.
- 30 min : moins d'exercices et de séries, pas de finisher.

## Mettre à jour

Modifier les fichiers, puis **changer `VERSION` dans `sw.js`** (sinon le téléphone garde l'ancienne version).
Les exercices sont dans `exercices.js`, le planning et les règles dans `programme.js`.

Cette app ne remplace pas un avis médical.
