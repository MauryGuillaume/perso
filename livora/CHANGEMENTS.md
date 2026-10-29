# Livora — skins Gemini et tenues portées (23 octobre 2026)

À copier à la place de `apps/livora/` comme la version précédente, puis `npm install` dans `web/`.

- **Toutes les skins Gemini** : corps homme sur 6 stades, corps femme sur 4 stades (elle garde le 4e à partir du niveau 15),
  31 coiffures homme et 31 coiffures femme de face, compagnons dragon, griffon, licorne et phénix.
- **Le personnage est habillé** : 31 tenues portées, chacune dessinée sur tous les stades (14 homme, 17 femme).
  Équiper une tenue ou des chaussures dans « Mon personnage » habille le personnage partout (accueil, profil, personnage).
  Sans tenue équipée, il porte la tenue de sport de départ (short pour l'homme, brassière et short pour la femme).
- **Tenues réservées à une silhouette** : une femme ne voit et ne gagne que les tenues femme, un homme que les tenues homme
  (collection, coffres, récompenses). Les autres objets restent communs aux deux.
- **Écran de création** : nombre de stades selon la silhouette, tenue équipée visible dans l'aperçu.
- Les anciennes coiffures femme (premières planches) sont remplacées : un personnage qui en portait une prend la première
  coiffure de face, à rechoisir dans « Modifier mon apparence ».
- Le profil d'exemple a quelques tenues débloquées pour essayer l'habillage.

Limites : ailes de l'Ange du défilé un peu rognées, léger halo jaune sur l'armure de samouraï, objets des planches catalogue
(auréole, lunettes, casquettes…) toujours affichés en vignette et pas encore portés.

# Livora — corrections et améliorations (22 octobre 2026)

À copier à la place de `apps/livora/` (les `.env` ne sont pas inclus : garde les tiens, ou recrée-les depuis les `.env.example`).
Puis, dans `web/` : `npm install` (le `package-lock.json` a été régénéré, l'ancien n'installait ni Vue ni Vite).

## À faire de ton côté

- **Régénère les deux secrets JWT** de `api/.env` (`openssl rand -hex 32` pour chacun) : l'ancien `.env` circulait dans `apps.zip`.
- Ajoute `CORS_ORIGINS` à `api/.env` (voir `api/.env.example`).

## Bugs corrigés

| Problème | Correction |
| --- | --- |
| Le programme généré à l'onboarding n'était jamais utilisé | Bouton « Commencer mon programme » : séances, repas, horaires et durée viennent du programme généré |
| Pas d'onboarding au premier lancement | Écran d'accueil, puis questionnaire (ou profil d'exemple) ; plus de navigation tant que rien n'est démarré |
| Un nouvel utilisateur démarrait avec les 2 850 XP et la série du profil d'exemple | Départ à zéro (niveau 1, 3 objets, un coffre de bienvenue) ; la progression d'exemple reste pour le profil démo |
| Niveaux décalés d'un cran (niveau 2 à 0 XP) | Seuils corrigés : niveau 1 de 0 à 499 XP |
| XP gagnable en boucle en cochant / décochant | Une seule fois par élément et par jour ; décocher retire l'XP et la progression de quête |
| Quêtes jamais renouvelées | Une quête quotidienne, une hebdomadaire et une mensuelle, renouvelées à chaque période |
| Images des compagnons chien, chat, renard, grenouille, paresseux introuvables | Dossiers renommés comme les clés du catalogue |
| Niveau sportif et durée de séance en dur | Lus depuis le profil |
| Liste de courses figée | Calculée depuis les repas de la semaine |
| Mode sombre : héros et barre de navigation illisibles | Couleur `--color-night` qui reste sombre dans les deux thèmes |
| Contraste trop faible (texte gris, rouge) | `--color-ink-faint` et `--color-accent` ajustés (AA) |
| Boutons imbriqués dans la timeline et les exercices | Structure corrigée, libellés accessibles |
| Bouton « Jour suivant » écrasé sur grand écran | Corrigé |
| PWA sans icônes, images non disponibles hors ligne | Icônes ajoutées, `.webp` mis en cache |
| API : 3 connexions Prisma, CORS ouvert à tous | Client partagé (`api/src/prisma/client.ts`), origines limitées par `CORS_ORIGINS` |
| Prompt Claude ambigu sur les jours (dayIndex) | 0 = lundi … 6 = dimanche, aligné sur l'onboarding |

## Nouveautés

- **Vraie date** : le jour du programme suit le calendrier. Le mode démo (Jour précédent / suivant) reste dans Réglages.
- **Personnage en calques** (pack avatars) partout à la place de l'ancien avatar, et **écran de création** (silhouette, peau, coiffure, couleurs, yeux, nez, barbe, expression, compagnon). Les 97 objets et les 3 nouveaux compagnons (griffon, licorne, phénix) sont dans les catalogues.
- **Ressenti du jour** (en forme, bof, fatigué, douleur) : le message du coach s'adapte et propose la séance express.
- **Séance express 10 min** : 3 exercices, 2 séries, repos réduit.
- **Activités en plus** (marche, course, vélo, handball, natation…) : XP, habitude « Bouger », quêtes marche.
- **Charges et records** par exercice, lien « Voir comment faire » pour chaque exercice.
- **Courbe de poids** avec saisie de la pesée, liste des records.
- **Rappels** (séance, eau, routine du soir) et **sons / vibrations** aux victoires, réglables.
- **Réglages**, page **À propos** (avertissement santé, données), bouton pour tout effacer.
- Générateur de secours plus réaliste : 3 types de séances selon le niveau et la durée, repas variés qui respectent régime, aliments détestés, allergies et temps de cuisine.

## Limites connues

- Le corps du personnage est encore nu : il faut les planches « tenues sur 6 stades » pour habiller le personnage et porter les objets.
- Tout reste stocké dans le navigateur ; les rappels n'arrivent que si l'app est ouverte ou en arrière-plan. Les comptes, la synchronisation et les notifications push demandent le backend (étape suivante).
- L'appel à Claude se fait encore depuis le navigateur : à déplacer dans l'API avant toute mise en ligne.
