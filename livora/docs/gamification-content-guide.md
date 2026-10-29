# Guide d'ajout de contenu — gamification Livora

Ce guide explique comment ajouter du contenu (compagnon, zone, achievement, objet
cosmétique, quête, récompense, illustration) **sans modifier les écrans**. Toutes les
vues lisent les catalogues et l'`AssetManager` — jamais un chemin de fichier ou une
valeur en dur.

## Principe général

- Le **contenu** (texte, XP, conditions, raretés) vit dans `src/gamification/*.js` —
  ce sont de simples tableaux/objets JS, éditables sans toucher au Vue.
- Les **illustrations** vivent dans `src/assets/<catégorie>/...` et sont résolues par
  `src/assets/assetManager.js`. Tant qu'un fichier n'existe pas au bon chemin, un
  placeholder (dégradé + emoji) s'affiche automatiquement — rien ne casse.
- **État par utilisateur** (mock) : `src/gamification/mockGamification.js`. En prod,
  ce serait remplacé par de vrais appels API vers les modèles Prisma correspondants
  (`apps/livora/api/prisma/schema.prisma`).

## Ajouter un compagnon

1. Dans `src/gamification/catalog.js`, ajouter une entrée à `COMPANION_SPECIES` :
   ```js
   {
     key: 'hibou', label: 'Hibou', icon: '🦉', // icon = repli emoji si pas d'illustration
     evolutions: [
       { level: 1, label: 'Hibou naissant', icon: '🥚' },
       { level: 5, label: 'Jeune hibou', icon: '🦉' },
       { level: 15, label: 'Hibou sage', icon: '🦉' },
       { level: 30, label: 'Hibou légendaire', icon: '✨🦉' },
     ],
   }
   ```
2. (Optionnel) Déposer les illustrations dans `src/assets/companions/hibou/` :
   `level-1.webp`, `level-5.webp`, `level-15.webp`, `level-30.webp` (un fichier par
   palier d'évolution, nommé `level-<level>.webp`). Rien d'autre à faire — le composant
   `<Companion />` et `companionAsset()` les détecteront automatiquement au prochain build.
3. Rien à changer dans les vues (`CompanionView.vue`, `CollectionView.vue` itèrent déjà
   sur `COMPANION_SPECIES`).

## Ajouter une zone de monde

1. Dans `catalog.js`, ajouter une entrée à `WORLD_ZONES`, à la position voulue dans
   l'ordre de progression :
   ```js
   { key: 'oasis', levelRequired: 10, icon: '🏜️', label: 'Oasis', description: '...' }
   ```
2. (Optionnel) Déposer `src/assets/world/oasis/scene.webp`.
3. Le déblocage est automatique : `handleLevelUp()` dans `useGamificationStore.js`
   débloque toute zone dont `levelRequired` est atteint — aucune logique à dupliquer.

## Ajouter un achievement

1. Dans `src/gamification/achievements.js`, ajouter une entrée à `ACHIEVEMENTS` :
   ```js
   { key: 'mon_cle', nom: 'NOM AFFICHÉ', icon: '🏅', rarity: 'rare', description: '...', condition: '...', rewardXp: 400 }
   ```
   `condition` est une description lisible ; l'évaluation réelle se fait dans
   `checkAchievements()` (`useGamificationStore.js`) ou via un appel explicite à
   `unlockAchievementByKey('mon_cle')` depuis la vue où l'événement se produit.
2. (Optionnel) Déposer `src/assets/achievements/mon_cle.webp`.
3. Raretés disponibles : `commun`, `peu_commun`, `rare`, `epique`, `legendaire`
   (`RARITY` dans `catalog.js`).

## Ajouter un objet cosmétique

1. Dans `src/gamification/cosmeticItems.js`, ajouter une entrée à `COSMETIC_ITEMS` :
   ```js
   { key: 'chapeau_paille', slot: 'coiffure', label: 'Chapeau de paille', icon: '👒', rarity: 'peu_commun' }
   ```
   `slot` doit être l'un de `COSMETIC_SLOTS` (`coiffure`, `vetement`, `chaussures`,
   `accessoire`, `equipement`, `objet_rare`).
2. (Optionnel) Déposer `src/assets/avatar/<slot>/chapeau_paille.webp` — le nom de
   dossier attendu par `avatarLayerAsset()`/`cosmeticAsset()` utilise le nom anglais du
   slot (`hair`, `clothes`, `shoes`, `accessories`, `equipment` — voir le mapping dans
   `assetManager.js` si le slot français ne correspond pas directement).
3. Déblocage : via un coffre (`unlockRandomCosmetic()`), une quête, ou manuellement
   avec `unlockedCosmetics.value.push('chapeau_paille')`.

## Ajouter une quête

1. Dans `src/gamification/quests.js`, ajouter un template à `DAILY_QUEST_TEMPLATES`,
   `WEEKLY_QUEST_TEMPLATES` ou `MONTHLY_QUEST_TEMPLATES` :
   ```js
   {
     questKey: 'ma_quete', titre: 'Titre affiché',
     objectives: [{ key: 'mon_objectif', label: 'Description', target: 3 }],
     rewardXp: 200, rewardChestKey: 'quotidien',
   }
   ```
2. Faire progresser l'objectif depuis la vue concernée avec
   `gamification.progressQuestObjective('mon_objectif', 1)` — la complétion et la
   récompense sont automatiques dès que tous les objectifs atteignent leur cible.

## Ajouter une récompense / un coffre

- Les coffres sont définis dans `CHEST_DEFINITIONS` (`catalog.js`) — 4 types existants
  (`quotidien`, `quete`, `rare`, `legendaire`), chacun avec une fourchette d'XP et une
  chance d'objet cosmétique. Pour un nouveau type, ajouter une clé ici et l'utiliser
  avec `gamification.grantChest('ma_cle', 'source')`.
- **Règle non négociable** (section 11 du prompt gamification) : les coffres ne sont
  jamais achetables et leur contenu n'est jamais payant/aléatoire au sens casino — ils
  sont uniquement gagnés par une action réelle (séance terminée, quête, niveau).

## Ajouter/remplacer une illustration

Aucun écran ne référence un chemin de fichier directement — tout passe par
`src/assets/assetManager.js`. Pour remplacer un placeholder par une vraie image :

1. Déposer le fichier au chemin attendu (voir tableau ci-dessous), format `.webp`
   de préférence (`.png`/`.avif`/`.jpg`/`.svg` aussi supportés).
2. Ne rien changer d'autre — `import.meta.glob` (Vite) détecte le fichier au build
   suivant et l'AssetManager bascule automatiquement du placeholder vers l'image réelle.

| Catégorie | Chemin attendu | Résolu par |
|---|---|---|
| Avatar (couche) | `src/assets/avatar/<slot>/<clé>.webp` | `avatarLayerAsset(slot, clé)` |
| Compagnon | `src/assets/companions/<espèce>/level-<N>.webp` | `companionAsset(espèce, niveau)` |
| Zone du monde | `src/assets/world/<zone>/scene.webp` | `worldZoneAsset(zone)` |
| Exercice | `src/assets/exercises/<clé>.webp` | `exerciseAsset(clé)` |
| Repas | `src/assets/meals/<id>.webp` | `mealAsset(id)` |
| Achievement | `src/assets/achievements/<clé>.webp` | `achievementAsset(clé)` |
| Récompense | `src/assets/rewards/<clé>.webp` | `rewardAsset(clé)` |
| Coffre | `src/assets/chests/<clé>-open.webp` / `-closed.webp` | `chestAsset(clé, ouvert)` |
| Objet cosmétique | `src/assets/avatar/<slot>/<clé>.webp` | `cosmeticAsset(slot, clé)` |
| Décoration | `src/assets/decorations/<clé>.webp` | `decorationAsset(clé)` |

**Ne jamais** écrire `<img src="/src/assets/...">` directement dans un `.vue` — toujours
passer par un helper `assetManager.js` + le composant `<AssetImage :asset="..." />`
(`src/components/AssetImage.vue`), qui gère à la fois l'image réelle et le repli
placeholder.

## Composants réutilisables disponibles

| Composant | Rôle |
|---|---|
| `<Avatar />` | Personnage du joueur, slots équipés, tailles, états (normal/success/celebration) |
| `<Companion />` | Compagnon actif, résout automatiquement l'évolution selon le niveau |
| `<AssetImage />` | Bas niveau — affiche un asset réel ou un placeholder ; utilisé par les deux ci-dessus et directement dans les grilles (Collection, Character, World) |
| `<XpBar />` | Barre XP/niveau, variante compacte |
| `<ChallengeCard />` | Défi surprise en cours |
| `<GamificationEventOverlay />` | File d'événements globale (level-up, achievement, coffre...), montée une fois dans `App.vue` |

## Ce qui NE doit PAS changer sans discussion

- `awardXp()` reste le seul point d'entrée pour tout gain d'XP (anti-abus, plafonds
  quotidiens centralisés).
- Les streaks ne punissent jamais explicitement — toute nouvelle logique de rupture de
  série doit garder un message neutre/positif (cf `registerActivityToday()`).
- Les coffres/récompenses ne sont jamais achetables avec de l'argent réel.
