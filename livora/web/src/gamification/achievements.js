// Bibliothèque d'achievements (section 9) — sérieux ET amusants, jamais culpabilisants.
// `condition` est une description lisible (l'évaluation réelle vit dans achievementEngine.js,
// section-9-conforme : ce fichier ne fait QUE décrire le catalogue, pas la logique).
export const ACHIEVEMENTS = [
  {
    key: 'aquaman', nom: 'AQUAMAN', icon: '🥤', rarity: 'rare',
    description: 'Atteindre son objectif d\'hydratation pendant 7 jours.',
    condition: 'hydration_goal_streak >= 7',
    rewardXp: 500,
  },
  {
    key: 'pas_un_lapin', nom: 'JE NE SUIS PAS UN LAPIN', icon: '🥦', rarity: 'peu_commun',
    description: 'Manger des légumes pendant 5 jours.',
    condition: 'veggies_days >= 5',
    rewardXp: 300,
  },
  {
    key: 'canape_deteste', nom: 'LE CANAPÉ ME DÉTESTE', icon: '🛋️', rarity: 'peu_commun',
    description: 'Terminer 5 séances.',
    condition: 'workouts_completed_total >= 5',
    rewardXp: 350,
  },
  {
    key: 'vampire_repenti', nom: 'VAMPIRE REPENTI', icon: '🌙', rarity: 'rare',
    description: 'Respecter son heure de coucher pendant 7 jours.',
    condition: 'bedtime_respected_streak >= 7',
    rewardXp: 500,
  },
  {
    key: 'lent_mais_present', nom: 'LENT MAIS PRÉSENT', icon: '🐌', rarity: 'commun',
    description: 'Faire une activité même avec seulement 10 minutes disponibles.',
    condition: 'short_session_completed >= 1',
    rewardXp: 200,
  },
  {
    key: 'finalement_je_lai_fait', nom: 'BON... FINALEMENT JE L\'AI FAIT', icon: '💪', rarity: 'epique',
    description: 'Terminer une séance alors que tu avais indiqué avoir peu de motivation.',
    condition: 'low_motivation_workout_completed >= 1',
    rewardXp: 600,
  },
  {
    key: 'premiere_seance', nom: 'PREMIER PAS', icon: '🎬', rarity: 'commun',
    description: 'Terminer ta toute première séance.',
    condition: 'workouts_completed_total >= 1',
    rewardXp: 150,
  },
  {
    key: 'semaine_parfaite', nom: 'SEMAINE PARFAITE', icon: '🌟', rarity: 'epique',
    description: 'Compléter toutes les missions prévues sur une semaine.',
    condition: 'perfect_week >= 1',
    rewardXp: 800,
  },
  {
    key: 'cent_jours', nom: 'CENT', icon: '💯', rarity: 'legendaire',
    description: 'Atteindre une série de 100 jours.',
    condition: 'best_streak >= 100',
    rewardXp: 2000,
  },
  {
    key: 'collectionneur', nom: 'COLLECTIONNEUR', icon: '🎒', rarity: 'rare',
    description: 'Débloquer 10 objets cosmétiques différents.',
    condition: 'cosmetics_unlocked >= 10',
    rewardXp: 400,
  },
]

export function achievementByKey(key) {
  return ACHIEVEMENTS.find((a) => a.key === key) ?? null
}
