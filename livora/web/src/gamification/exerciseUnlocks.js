// Déblocage d'exercices (section 7) — volontairement PAS une fonction de l'XP seul.
// Un vrai backend ferait décider l'IA (Game Master) via un appel Claude prenant en compte
// niveau sportif déclaré à l'onboarding, matériel dispo, objectif, historique de séances.
// Ici (mock), on simule cette décision avec une règle simple mais du même ESPRIT : le niveau
// sportif (pas le niveau de jeu) détermine le palier d'exercices, et le niveau de jeu ne fait
// qu'indiquer qu'un palier supérieur est "disponible à évaluer" — jamais débloqué seul.
import { EXERCISE_TIERS } from './catalog.js'

const EXERCISE_LABELS = {
  squat: { nom: 'Squat', icon: '🏋️' },
  gainage: { nom: 'Gainage', icon: '🧘' },
  pompes_genoux: { nom: 'Pompes (genoux)', icon: '💪' },
  marche: { nom: 'Marche', icon: '🚶' },
  fentes: { nom: 'Fentes', icon: '🦵' },
  pompes: { nom: 'Pompes', icon: '💪' },
  rowing_haltere: { nom: 'Rowing haltère', icon: '🏋️' },
  gainage_dynamique: { nom: 'Gainage dynamique', icon: '🧘' },
  burpees: { nom: 'Burpees', icon: '🔥' },
  tractions: { nom: 'Tractions', icon: '🧗' },
  squat_bulgare: { nom: 'Squat bulgare', icon: '🏋️' },
  pompes_declinees: { nom: 'Pompes déclinées', icon: '💪' },
}

export function exerciseLabel(key) {
  return EXERCISE_LABELS[key] ?? { nom: key, icon: '🏋️' }
}

// Simule la décision du Game Master : ne propose le palier "intermediaire"/"avance" que si
// le niveau sportif réel (onboarding) le permet ET que suffisamment de séances ont été
// complétées à ce palier — jamais uniquement "tu as le niveau de jeu N donc tu débloques X".
export function evaluateNextExerciseUnlock({ niveauSport, workoutsCompletedTotal, alreadyUnlocked }) {
  const tierOrder = ['debutant', 'intermediaire', 'avance']
  const sportTierIndex = tierOrder.indexOf(niveauSport)

  for (let i = 0; i <= sportTierIndex; i++) {
    const tier = tierOrder[i]
    const minWorkouts = i === 0 ? 0 : i * 5 // il faut ~5 séances complétées par palier avant de proposer le suivant
    if (workoutsCompletedTotal < minWorkouts) break
    for (const key of EXERCISE_TIERS[tier]) {
      if (!alreadyUnlocked.includes(key)) {
        return { key, ...exerciseLabel(key), tier }
      }
    }
  }
  return null
}
