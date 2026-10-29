# Notix

**Simple, rapide, toujours avec vous.** Un gros bouton micro, la dictée transcrite en direct, des notes recherchables,
des mots-clés (« courses », « idée ») qui classent la note.

Version 1.0.0, PWA en HTML, CSS et JavaScript vanilla, construite sur le kit « Socle PWA » 2.0 de l'Atelier de Blocs
(référence : `KIT.md` du kit). Aucun serveur, aucune base distante : les notes restent dans le navigateur (IndexedDB).

## Lancer sur sa machine

Le micro et le service worker exigent `http://localhost` ou HTTPS (pas `file://`).

```bash
node outils/servir.js . 8080      # servir.js est dans le kit Socle PWA ; ou : npx serve .
```

Puis http://localhost:8080 dans Chrome ou Safari. Sur un téléphone du même réseau, l'adresse IP de l'ordinateur ne suffit
pas pour le micro (pas de HTTPS) : tester sur l'hébergement final ou via un tunnel HTTPS.

## Déployer

Copier **tout le dossier tel quel** sur un hébergement statique en **HTTPS** (Netlify, Vercel, GitHub Pages,
Cloudflare Pages, OVH…). Pas de build, pas de variable, pas de base de données.

- HTTPS obligatoire : sans lui, pas de micro, pas d'installation, pas de hors ligne.
- L'app fonctionne dans un sous-dossier (`https://exemple.fr/notix/`) : tous les chemins sont relatifs.
- Facultatif : servir `sw.js` avec `Cache-Control: no-cache` pour que les mises à jour arrivent plus vite.

## Mettre à jour

1. Modifier les fichiers.
2. **Changer `VERSION` dans `sw.js`** (`notix-v1.0.0` → `notix-v1.0.1`) et `VERSION` dans `commun.js` (affichée dans Réglages).
3. Si un fichier est ajouté, l'ajouter à `FICHIERS` dans `sw.js` et dans `index.html`.
4. Redéployer. Les téléphones prennent la nouvelle version à la deuxième ouverture de l'app (vérifié).

Les notes ne sont pas touchées par une mise à jour. Changer la structure des données demande d'augmenter
`VERSION_BASE` dans `base.js` et de compléter `onupgradeneeded`.

## Variables

| Clé | Rôle | Obligatoire | Défaut | Secrète |
| --- | --- | --- | --- | --- |
| — | Aucune variable d'environnement : app 100 % statique, sans serveur ni service externe payant | — | — | — |

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Coquille du socle (barre, vue, onglets, toast), CSP, liste des scripts |
| `style.css` | Charte Notix (variables) et classes ; aucune couleur hors des variables |
| `app.js` | Socle : `appli.esc`, `appli.api` (inutilisé en v1), `appli.toast`, routeur, onglets |
| `texte.js` | Ponctuation à la voix, mots-clés, recherche, dates (fonctions pures) |
| `base.js` | Stockage IndexedDB : notes, dossiers, réglages, export, import |
| `dictee.js` | Reconnaissance vocale : Web Speech API ou plugin Capacitor |
| `commun.js` | Icônes, ligne de note, fenêtre de confirmation, bouton de dictée partagé |
| `ecran-*.js` | Un fichier par écran : enregistrer, notes, note, dossiers, reglages |
| `sw.js`, `manifest.webmanifest`, `icone*.{svg,png}` | Installation et hors ligne |

## Écrans

| Écran | Adresse | Onglet | Rôle |
| --- | --- | --- | --- |
| Enregistrer | `#/enregistrer` (ouverture) | Oui | Gros micro, texte en direct, dossier détecté, enregistrer ; saisie au clavier possible |
| Notes | `#/notes` | Oui | Recherche plein texte (sans accents ni majuscules, plusieurs mots), épinglées en tête, filtre Archivées |
| Note | `#/note/<id>` | Non | Modifier, dicter la suite, dossier, épingler, archiver, partager (Partager…, Message, E-mail, Copier), supprimer |
| Dossiers | `#/dossiers`, `#/dossiers/<id>` | Oui | Dossiers et leurs mots-clés, créer, renommer, supprimer (notes → « Sans dossier ») |
| Réglages | `#/reglages` | Oui | Langue, ponctuation à la voix, où part l'audio, mots de ponctuation, export/import, tout effacer |

## Données (IndexedDB « notix », version 1)

| Magasin | Champs |
| --- | --- |
| `notes` | `id`, `texte` (20 000 caractères au plus), `dossierId` (vide = sans dossier), `creeeLe`, `modifieeLe`, `epinglee`, `archivee` |
| `dossiers` | `id`, `nom`, `motsCles` (liste), `ordre`. Départ : Courses, Idées, Souvenirs, À faire |
| `reglages` | `prefs` (`langue`, `ponctuation`, `avertissementVu`), `brouillon` (texte en cours) |

Rien dans `localStorage`. L'app demande au navigateur un stockage persistant pour éviter l'effacement automatique.
Sauvegarde : Réglages › Exporter (fichier JSON), Importer (fusion : une note n'est remplacée que si la sauvegarde est plus récente).

## Dictée et confidentialité

- **Navigateur** : Web Speech API. Chrome envoie en général l'audio aux serveurs de Google, Safari à Apple, Edge à
  Microsoft. Si Chrome propose la dictée sur l'appareil (`processLocally`, langue téléchargée depuis Réglages), l'audio
  reste sur le téléphone et Réglages l'indique. L'utilisateur est prévenu avant sa première dictée.
- **App mobile (Capacitor)** : si le plugin `@capacitor-community/speech-recognition` est installé, `dictee.js` l'utilise
  automatiquement. À ajouter dans l'app mobile : le plugin, et sur iOS les textes `NSMicrophoneUsageDescription` et
  `NSSpeechRecognitionUsageDescription`. Non testé sur appareil.
- **Sans reconnaissance** (Firefox…) : le micro est grisé, un message invite à écrire au clavier.
- **Bruit** : conseil à l'écran ; le texte reste modifiable avant l'enregistrement.
- Ponctuation à la voix : « virgule », « point », « point d'interrogation », « point d'exclamation », « deux points »,
  « point-virgule », « points de suspension », « ouvrez / fermez les guillemets », « à la ligne », « nouveau paragraphe ».
  Espaces à la française, majuscule en début de phrase. « le point », « un point » restent des mots.
- Mots-clés : une note qui **commence** par un mot-clé est rangée dans son dossier et le mot est retiré
  (« Courses : lait, pain » → dossier Courses, texte « Lait, pain »). Un mot-clé ne peut appartenir qu'à un dossier.

## Recette (1.0.0, 27 octobre 2026)

`node outils/verifier-pwa.js .` → **Conforme** (21/21).

Tests automatisés dans Chromium à 390 px, avec une reconnaissance vocale simulée : **53/53**.

- [x] Chaque écran sans défilement horizontal à 390 px ; micro de 136 px ; zones tactiles de 44 px ; focus visible
- [x] Avertissement audio avant la première dictée, puis plus jamais
- [x] Texte partiel en direct, ponctuation à la voix, relance après un silence, arrêt, « Dicter la suite »
- [x] Classement par mots-clés (Courses, À faire, dossier créé), mot-clé déjà pris refusé
- [x] Brouillon retrouvé après réouverture ; modification d'une note gardée en la quittant
- [x] Recherche sans accents, plusieurs mots, par nom de dossier ; épinglée en tête ; archiver et filtre ; supprimer
- [x] HTML saisi affiché comme du texte (pas d'injection)
- [x] Export, tout effacer, import ; ponctuation désactivable
- [x] Hors ligne après une première visite : l'app s'ouvre et les notes sont lisibles
- [x] Nouvelle version (`VERSION` changée) visible à la réouverture
- [x] Navigateur sans dictée : micro grisé, message, saisie au clavier
- [x] Console sans erreur sur tous les écrans

À faire sur de vrais téléphones (non faisable ici, pas de micro) :

- [ ] Dictée réelle sur iPhone (Safari et app installée) et Android (Chrome), au calme et dans le bruit
- [ ] Installation sur l'écran d'accueil (iOS : Partager › Sur l'écran d'accueil)
- [ ] Partage vers Messages et e-mail
- [ ] Plugin Capacitor dans l'app mobile

## Identité

Icônes **provisoires** (micro cyan sur fond `#1F2937`) : remplacer `icone.svg`, `icone-180.png`, `icone-192.png` et
`icone-512.png` par les fichiers définitifs (mêmes noms), puis changer `VERSION` dans `sw.js`. L'icône 512 sert aussi
d'icône « maskable » Android : garder le dessin dans les 80 % centraux.
