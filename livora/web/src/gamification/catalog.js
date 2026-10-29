// Catalogue de contenu de la gamification — données statiques, éditables ici pour retuner
// l'économie XP/niveaux/déblocages sans toucher au code des vues (cf prompt section 11/12 :
// "Les valeurs doivent être configurables dans le code"). Rien ici n'est propre à un
// utilisateur — l'état par utilisateur vit dans src/gamification/mockGamification.js.

// ── XP par action (section 11) ──────────────────────────────────────────────
// Plafonds quotidiens par source pour éviter le farm trivial (section 23 anti-abus) —
// null = pas de plafond (les séances/quêtes sont naturellement rares dans une journée).
export const XP_REWARDS = {
  hydration_goal: { amount: 50, dailyCap: 1 }, // XP accordé une seule fois/jour (objectif atteint), pas par +250ml
  habit_completed: { amount: 50, dailyCap: 5 },
  walk_completed: { amount: 100, dailyCap: 2 },
  activity_completed: { amount: 100, dailyCap: 2 }, // activité libre enregistrée (club, vélo, course…)
  meal_completed: { amount: 75, dailyCap: 4 },
  workout_completed: { amount: 250, dailyCap: 2 },
  quest_daily: { amount: 150, dailyCap: null },
  quest_weekly: { amount: 1000, dailyCap: null },
  quest_monthly: { amount: 2500, dailyCap: null },
  achievement_unlocked: { amount: 500, dailyCap: null }, // valeur par défaut ; certains achievements précisent la leur
  challenge_completed: { amount: 250, dailyCap: null },
  streak_bonus: { amount: 100, dailyCap: 1 }, // petit bonus le jour où une série passe un palier (7/14/30...)
  chest_opened_bonus: { amount: 0, dailyCap: null }, // montant réel calculé dynamiquement à l'ouverture (cf openChest), pas de valeur fixe ici
}

// ── Niveaux (section 12) — seuils cumulatifs, progression croissante ───────
// LEVELS[i] = XP total cumulé nécessaire pour atteindre le niveau i+1 (LEVELS[0] = seuil du niveau 2).
export const LEVEL_THRESHOLDS = [
  500, 1200, 2000, 3000, 4200, 5600, 7200, 9000, 11000,
  13500, 16500, 20000, 24000, 28500, 33500, 39000, 45000, 51500, 58500,
  66000, 74000, 82500, 91500, 101000, 111000, 121500, 132500, 144000, 156000,
]
export const MAX_LEVEL = LEVEL_THRESHOLDS.length + 1 // niveau 1 + un niveau par seuil

export function levelFromTotalXp(totalXp) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 2
    else break
  }
  return Math.min(level, MAX_LEVEL)
}

export function levelProgress(totalXp) {
  const level = levelFromTotalXp(totalXp)
  const floor = level === 1 ? 0 : LEVEL_THRESHOLDS[level - 2]
  const ceiling = level >= MAX_LEVEL ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] : LEVEL_THRESHOLDS[level - 1]
  return {
    level,
    xpInLevel: totalXp - floor,
    xpForLevel: ceiling - floor,
    totalXp,
    isMaxLevel: level >= MAX_LEVEL,
  }
}

// ── Séries (section 6) ───────────────────────────────────────────────────
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]
export const MAX_RECOVERY_JOKERS = 2

// ── Rareté (section 1) ──────────────────────────────────────────────────
export const RARITY = {
  commun: { label: 'Commun', color: '#8C897F', order: 0 },
  peu_commun: { label: 'Peu commun', color: '#3D7A4D', order: 1 },
  rare: { label: 'Rare', color: '#2B6CB0', order: 2 },
  epique: { label: 'Épique', color: '#7C3AED', order: 3 },
  legendaire: { label: 'Légendaire', color: '#D97706', order: 4 },
}

// ── Monde évolutif (section 2) — configurable ────────────────────────────
export const WORLD_ZONES = [
  { key: 'parcelle', levelRequired: 1, icon: '🌱', label: 'Petite parcelle', description: 'Le tout début de ton monde.' },
  { key: 'maison', levelRequired: 3, icon: '🏠', label: 'Maison', description: 'Un toit pour ton personnage.' },
  { key: 'foret', levelRequired: 5, icon: '🌳', label: 'Forêt', description: 'Une forêt s\'étend autour de chez toi.' },
  { key: 'plage', levelRequired: 8, icon: '🏖️', label: 'Plage', description: 'Le sable et la mer, à deux pas.' },
  { key: 'montagne', levelRequired: 12, icon: '🏔️', label: 'Montagne', description: 'Un sommet qui domine ton monde.' },
  { key: 'village', levelRequired: 16, icon: '🏘️', label: 'Village', description: 'D\'autres habitants s\'installent.' },
  { key: 'chateau', levelRequired: 20, icon: '🏰', label: 'Château', description: 'Une forteresse pour ton personnage.' },
  { key: 'volcan', levelRequired: 25, icon: '🌋', label: 'Zone volcanique', description: 'Un territoire spectaculaire.' },
  { key: 'espace', levelRequired: 30, icon: '🚀', label: 'Zone spatiale', description: 'Au-delà de ton monde.' },
]

// ── Compagnons (section 3) ────────────────────────────────────────────────
// `evolutions[].level` = niveau du COMPAGNON (indépendant du niveau du joueur, cf
// awardCompanionXp dans useGamificationStore.js) auquel ce palier est atteint.
export const COMPANION_SPECIES = [
  {
    key: 'dragon', label: 'Dragon', icon: '🐉',
    evolutions: [
      { level: 1, label: 'Bébé dragon', icon: '🥚' },
      { level: 5, label: 'Dragon junior', icon: '🐲' },
      { level: 15, label: 'Dragon adulte', icon: '🐉' },
      { level: 30, label: 'Dragon légendaire', icon: '✨🐉' },
    ],
  },
  {
    key: 'chien', label: 'Chien', icon: '🐶',
    evolutions: [
      { level: 1, label: 'Chiot', icon: '🐶' },
      { level: 5, label: 'Jeune chien', icon: '🐕' },
      { level: 15, label: 'Chien fidèle', icon: '🐕‍🦺' },
      { level: 30, label: 'Chien légendaire', icon: '✨🐕' },
    ],
  },
  {
    key: 'chat', label: 'Chat', icon: '🐱',
    evolutions: [
      { level: 1, label: 'Chaton', icon: '🐱' },
      { level: 5, label: 'Jeune chat', icon: '🐈' },
      { level: 15, label: 'Chat espiègle', icon: '🐈‍⬛' },
      { level: 30, label: 'Chat légendaire', icon: '✨🐈' },
    ],
  },
  {
    key: 'renard', label: 'Renard', icon: '🦊',
    evolutions: [
      { level: 1, label: 'Renardeau', icon: '🦊' },
      { level: 5, label: 'Jeune renard', icon: '🦊' },
      { level: 15, label: 'Renard rusé', icon: '🦊' },
      { level: 30, label: 'Renard des légendes', icon: '✨🦊' },
    ],
  },
  {
    key: 'panda', label: 'Panda', icon: '🐼',
    evolutions: [
      { level: 1, label: 'Bébé panda', icon: '🐼' },
      { level: 5, label: 'Jeune panda', icon: '🐼' },
      { level: 15, label: 'Panda serein', icon: '🐼' },
      { level: 30, label: 'Panda légendaire', icon: '✨🐼' },
    ],
  },
  {
    key: 'grenouille', label: 'Grenouille', icon: '🐸',
    evolutions: [
      { level: 1, label: 'Têtard', icon: '🐸' },
      { level: 5, label: 'Jeune grenouille', icon: '🐸' },
      { level: 15, label: 'Grenouille agile', icon: '🐸' },
      { level: 30, label: 'Grenouille légendaire', icon: '✨🐸' },
    ],
  },
  {
    key: 'koala', label: 'Koala', icon: '🐨',
    evolutions: [
      { level: 1, label: 'Bébé koala', icon: '🐨' },
      { level: 5, label: 'Jeune koala', icon: '🐨' },
      { level: 15, label: 'Koala serein', icon: '🐨' },
      { level: 30, label: 'Koala légendaire', icon: '✨🐨' },
    ],
  },
  {
    key: 'paresseux', label: 'Paresseux', icon: '🦥',
    evolutions: [
      { level: 1, label: 'Petit paresseux', icon: '🦥' },
      { level: 5, label: 'Paresseux zen', icon: '🦥' },
      { level: 15, label: 'Paresseux sage', icon: '🦥' },
      { level: 30, label: 'Paresseux légendaire', icon: '✨🦥' },
    ],
  },
  {
    key: 'griffon', label: 'Griffon', icon: '🦅',
    evolutions: [
      { level: 1, label: 'Œuf de griffon', icon: '🥚' },
      { level: 5, label: 'Jeune griffon', icon: '🦅' },
      { level: 15, label: 'Griffon athlète', icon: '🦅' },
      { level: 30, label: 'Griffon légendaire', icon: '✨🦅' },
    ],
  },
  {
    key: 'licorne', label: 'Licorne', icon: '🦄',
    evolutions: [
      { level: 1, label: 'Bébé licorne', icon: '🦄' },
      { level: 5, label: 'Jeune licorne', icon: '🦄' },
      { level: 15, label: 'Licorne athlète', icon: '🦄' },
      { level: 30, label: 'Licorne légendaire', icon: '✨🦄' },
    ],
  },
  {
    key: 'phenix', label: 'Phénix', icon: '🔥',
    evolutions: [
      { level: 1, label: 'Œuf de phénix', icon: '🥚' },
      { level: 5, label: 'Jeune phénix', icon: '🐦‍🔥' },
      { level: 15, label: 'Phénix athlète', icon: '🐦‍🔥' },
      { level: 30, label: 'Phénix légendaire', icon: '✨🐦‍🔥' },
    ],
  },
]

export const COMPANION_PERSONALITIES = ['motivant', 'drole', 'calme', 'taquin']

// ── Coffres (section 4) ────────────────────────────────────────────────────
export const CHEST_DEFINITIONS = {
  quotidien: { key: 'quotidien', label: 'Coffre quotidien', icon: '🎁', minXp: 30, maxXp: 80, cosmeticChance: 0.15 },
  quete: { key: 'quete', label: 'Coffre de quête', icon: '🏆', minXp: 100, maxXp: 300, cosmeticChance: 0.35 },
  rare: { key: 'rare', label: 'Coffre rare', icon: '💎', minXp: 200, maxXp: 500, cosmeticChance: 0.7 },
  legendaire: { key: 'legendaire', label: 'Coffre légendaire', icon: '👑', minXp: 500, maxXp: 1200, cosmeticChance: 1 },
}

// ── Exercices débloquables (section 7) — dépend du niveau SPORTIF réel, pas juste de l'XP ──
export const EXERCISE_TIERS = {
  debutant: ['squat', 'gainage', 'pompes_genoux', 'marche'],
  intermediaire: ['fentes', 'pompes', 'rowing_haltere', 'gainage_dynamique'],
  avance: ['burpees', 'tractions', 'squat_bulgare', 'pompes_declinees'],
}
