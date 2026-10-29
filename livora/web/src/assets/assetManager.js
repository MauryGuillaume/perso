// AssetManager — point d'accès UNIQUE aux illustrations de l'app. Aucun écran ne doit
// connaître un chemin de fichier directement : il demande "l'asset du compagnon dragon niveau 8"
// et reçoit soit une vraie image (si le fichier existe dans src/assets/), soit un placeholder
// élégant (gradient + emoji, cf section 26 du prompt gamification — ne jamais générer de
// référence vers un fichier qui n'existe pas encore).
//
// Pour remplacer un placeholder par une vraie illustration plus tard : déposer le fichier au
// chemin attendu (voir docs/gamification-content-guide.md) — aucun écran n'a besoin d'être
// modifié, resolve() bascule automatiquement sur le fichier réel dès qu'il existe.

// import.meta.glob avec eager:false renvoie un chargeur par fichier trouvé sous src/assets/ —
// Vite résout ça au build, donc "le fichier n'existe pas" est déterminable sans requête réseau.
const REAL_ASSETS = import.meta.glob('./**/*.{png,webp,avif,jpg,jpeg,svg}', { eager: true, import: 'default' })

function realAssetUrl(relativePath) {
  // relativePath ex: "companions/dragon/level-3.webp" → clé glob "./companions/dragon/level-3.webp"
  return REAL_ASSETS[`./${relativePath}`] ?? null
}

// Placeholder visuel cohérent avec le design system (tokens.css) : un dégradé doux + l'emoji
// de secours. Rendu par le composant <AssetImage>, jamais une URL cassée dans un <img src>.
export function placeholder(emoji, seed = '') {
  return { kind: 'placeholder', emoji, seed }
}

function realOrPlaceholder(relativePath, emoji, seed) {
  const url = realAssetUrl(relativePath)
  if (url) return { kind: 'image', url }
  return placeholder(emoji, seed)
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function avatarLayerAsset(slot, key) {
  if (!key) return null
  return realOrPlaceholder(`avatar/${slot}/${key}.webp`, AVATAR_SLOT_FALLBACK_EMOJI[slot] ?? '❔', key)
}
const AVATAR_SLOT_FALLBACK_EMOJI = {
  base: '🧑', hair: '💇', coiffure: '💇', clothes: '👕', vetement: '👕',
  shoes: '👟', chaussures: '👟', accessories: '💍', accessoire: '💍', equipment: '🎒', equipement: '🎒',
}

// ── Compagnons ──────────────────────────────────────────────────────────────
export function companionAsset(speciesKey, evolutionLevel, fallbackEmoji) {
  return realOrPlaceholder(`companions/${speciesKey}/level-${evolutionLevel}.webp`, fallbackEmoji ?? '🐾', speciesKey)
}

// ── Monde ───────────────────────────────────────────────────────────────────
export function worldZoneAsset(zoneKey, fallbackEmoji) {
  return realOrPlaceholder(`world/${zoneKey}/scene.webp`, fallbackEmoji ?? '🗺️', zoneKey)
}

// ── Exercices ───────────────────────────────────────────────────────────────
export function exerciseAsset(exerciseKey, fallbackEmoji) {
  return realOrPlaceholder(`exercises/${exerciseKey}.webp`, fallbackEmoji ?? '🏋️', exerciseKey)
}

// ── Repas ───────────────────────────────────────────────────────────────────
export function mealAsset(mealId, fallbackEmoji) {
  return realOrPlaceholder(`meals/${mealId}.webp`, fallbackEmoji ?? '🍽️', mealId)
}

// ── Achievements ────────────────────────────────────────────────────────────
export function achievementAsset(achievementKey, fallbackEmoji) {
  return realOrPlaceholder(`achievements/${achievementKey}.webp`, fallbackEmoji ?? '🏅', achievementKey)
}

// ── Récompenses / coffres ────────────────────────────────────────────────────
export function rewardAsset(rewardKey, fallbackEmoji) {
  return realOrPlaceholder(`rewards/${rewardKey}.webp`, fallbackEmoji ?? '🎁', rewardKey)
}
export function chestAsset(chestKey, opened, fallbackEmoji) {
  return realOrPlaceholder(`chests/${chestKey}-${opened ? 'open' : 'closed'}.webp`, fallbackEmoji ?? '🎁', chestKey)
}

// ── Décorations / objets cosmétiques ─────────────────────────────────────────
export function cosmeticAsset(slot, itemKey, fallbackEmoji) {
  return realOrPlaceholder(`avatar/${slot}/${itemKey}.webp`, fallbackEmoji ?? '✨', itemKey)
}
export function decorationAsset(decorationKey, fallbackEmoji) {
  return realOrPlaceholder(`decorations/${decorationKey}.webp`, fallbackEmoji ?? '🪴', decorationKey)
}

// ── UI (icônes génériques réutilisées à plusieurs endroits) ─────────────────
export function uiAsset(uiKey, fallbackEmoji) {
  return realOrPlaceholder(`ui/${uiKey}.webp`, fallbackEmoji ?? '', uiKey)
}
