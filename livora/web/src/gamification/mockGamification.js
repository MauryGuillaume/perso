// État mock de la gamification — équivalent de mockProgram.js mais pour tout ce qui est
// gamification. Mutable en mémoire (pas persisté), remplacé plus tard par de vrais appels
// API vers UserGamification/XPTransaction/etc. (cf prisma/schema.prisma).
import { levelProgress } from './catalog.js'

export const mockUserGamification = {
  totalXp: 2850,
  currentStreak: 6,
  bestStreak: 14,
  recoveryJokers: 2,
  lastActiveDate: null, // sera fixé au premier calcul de série
  equippedItems: {
    coiffure: 'casquette_verte',
    vetement: 'veste_survet',
    chaussures: 'baskets_blanches',
  },
}

export const mockUnlockedCosmetics = [
  't_shirt_gris', 'baskets_blanches', 'bandeau_simple',
  'casquette_verte', 'veste_survet', 'gourde_perso',
  // quelques tenues portées pour essayer l'habillage du personnage (homme et femme)
  'short_sport', 'brassiere_sport', 'kimono_karate', 'jogging_capuche', 'tenue_saiyan', 'boxeur',
  'robe_ete', 'legging_sport', 'robe_soiree_rouge', 'bikini_bleu',
]

export const mockCompanion = {
  id: 'comp-1',
  species: 'dragon',
  nom: null,
  personality: 'motivant',
  xp: 620,
  level: 8,
}

export const mockUnlockedZones = ['parcelle', 'maison', 'foret', 'plage']

export const mockUnlockedExercises = ['squat', 'gainage', 'pompes_genoux', 'marche', 'fentes', 'pompes']

export const mockUnlockedAchievements = [
  { key: 'premiere_seance', unlockedAt: '2026-08-20' },
  { key: 'canape_deteste', unlockedAt: '2026-09-02' },
  { key: 'lent_mais_present', unlockedAt: '2026-09-10' },
]

export const mockActiveQuests = [
  {
    id: 'q-daily-1', questKey: 'hydrate_du_jour', type: 'quotidienne',
    titre: 'Hydratation du jour',
    objectives: [{ key: 'hydration', label: 'Atteindre ton objectif d\'eau', target: 1, current: 0 }],
    rewardXp: 150, rewardChestKey: 'quotidien', status: 'en_cours',
  },
  {
    id: 'q-weekly-1', questKey: 'guerrier_regulier', type: 'hebdomadaire',
    titre: 'Le guerrier régulier',
    objectives: [
      { key: 'workouts', label: '3 entraînements', target: 3, current: 1 },
      { key: 'hydration_days', label: '4 jours avec objectif d\'hydratation atteint', target: 4, current: 2 },
      { key: 'evening_routine_days', label: '5 jours avec routine du soir', target: 5, current: 3 },
      { key: 'walks', label: '3 marches', target: 3, current: 1 },
    ],
    rewardXp: 1000, rewardChestKey: 'quete', status: 'en_cours',
  },
]

export const mockActiveChallenge = {
  id: 'ch-1', key: 'defi_canard', titre: 'DÉFI DU CANARD', icon: '🦆',
  description: 'Routine mobilité express (5 min).',
  raisonAbsurde: 'Parce que le canard l\'exige.',
  steps: [
    'Rotations des chevilles — 10 tours dans chaque sens, chaque pied',
    'Cercles de bras — 15 en avant, 15 en arrière',
    'Rotations de hanches — 10 tours dans chaque sens',
    'Étirement des ischio-jambiers — 30 sec par jambe, penché en avant',
    'Chat-vache (dos) — 10 répétitions à quatre pattes',
  ],
  rewardXp: 250, rewardChestKey: 'quotidien', status: 'proposee',
}

export const mockChests = [
  { id: 'chest-1', chestKey: 'quotidien', source: 'day_completed', opened: false, earnedAt: '2026-09-18' },
]

export function currentGamificationSnapshot() {
  return { ...mockUserGamification, ...levelProgress(mockUserGamification.totalXp) }
}
