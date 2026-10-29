// Quêtes standard (section 5) — modèles réutilisés pour générer des instances UserQuest.
// Les quêtes "spéciales" (section 5, générées par l'IA) n'ont pas de modèle ici : elles sont
// produites à la volée par gameMaster.js et stockées directement dans UserQuest sans questKey.

export const DAILY_QUEST_TEMPLATES = [
  { key: 'hydrate_du_jour', titre: 'Hydratation du jour', objectives: [{ key: 'hydration', label: 'Atteindre ton objectif d\'eau', target: 1 }], rewardXp: 150, rewardChestKey: 'quotidien' },
  { key: 'repas_du_jour', titre: 'Trois repas', objectives: [{ key: 'meals', label: 'Terminer 3 repas prévus', target: 3 }], rewardXp: 150, rewardChestKey: 'quotidien' },
  { key: 'marche_du_jour', titre: 'Petite marche', objectives: [{ key: 'walk', label: 'Faire une marche', target: 1 }], rewardXp: 150, rewardChestKey: 'quotidien' },
]

export const WEEKLY_QUEST_TEMPLATES = [
  {
    key: 'guerrier_regulier', titre: 'Le guerrier régulier',
    objectives: [
      { key: 'workouts', label: '3 entraînements', target: 3 },
      { key: 'hydration_days', label: '4 jours avec objectif d\'hydratation atteint', target: 4 },
      { key: 'evening_routine_days', label: '5 jours avec routine du soir', target: 5 },
      { key: 'walks', label: '3 marches', target: 3 },
    ],
    rewardXp: 1000, rewardChestKey: 'quete',
  },
  {
    key: 'semaine_equilibree', titre: 'Semaine équilibrée',
    objectives: [
      { key: 'meals', label: '18 repas suivis', target: 18 },
      { key: 'sleep_days', label: '5 nuits avec heure de coucher respectée', target: 5 },
      { key: 'habits', label: '15 habitudes complétées', target: 15 },
    ],
    rewardXp: 1000, rewardChestKey: 'quete',
  },
]

export const MONTHLY_QUEST_TEMPLATES = [
  {
    key: 'mois_constant', titre: 'Un mois de constance',
    objectives: [
      { key: 'workouts', label: '12 entraînements', target: 12 },
      { key: 'streak', label: 'Atteindre une série de 14 jours', target: 14 },
    ],
    rewardXp: 2500, rewardChestKey: 'rare',
  },
]
