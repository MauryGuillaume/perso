// Couche de service — façade unique entre les vues et les données. Pour l'instant retourne
// les mocks (cf src/mock/programState.js, moteur : src/mock/programEngine.js) ; brancher le
// vrai backend consistera à remplacer les corps de ces fonctions par de vrais appels HTTP
// (même signatures), sans toucher aux vues.
//
// Contrairement à un simple objet mock figé, l'état ici est un vrai programme sur 12 semaines
// qui avance jour après jour et persiste en localStorage (cf src/mock/programState.js) — l'app
// se comporte comme si elle était connectée à un vrai backend qui suit le temps réel.
import {
  getToday, getWeekAround, getCurrentDayIndex, advanceToNextDay, goToPreviousDay,
  findWorkout, findExercise, findMeal, updateMealContent,
  getMealOptionsForDay, selectMealOption,
  getHydrationToday, addHydrationToday, getSleepToday, setSleepToday,
  getHabitsToday, toggleHabitToday,
  getShoppingList, toggleShoppingItemChecked,
  getProgressSnapshot, logWeight,
  setItemStatus, getUser, getProfil, getProgramSummary, getDateMode, setDateMode, isProgramFinished,
  setFeelingToday, addActivityToday, removeActivityToday, setExpressWorkout,
  logExerciseSet, getExerciseHistory, getProgramSource,
} from '@/mock/programState.js'
import { mockAlternativeMeals } from '@/mock/mockProgram.js'
import { getTotalDays, getDurationWeeks } from '@/mock/programEngine.js'

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

export async function fetchUser() {
  await delay()
  return getUser()
}

// Profil complet (réponses de l'onboarding ou profil démo) : niveau sportif, durée de séance…
export async function fetchProfile() {
  await delay(0)
  return getProfil()
}

export async function fetchProgramSummary() {
  await delay()
  return getProgramSummary()
}

export async function fetchToday() {
  await delay()
  return JSON.parse(JSON.stringify(getToday()))
}

export async function fetchWeek() {
  await delay()
  return JSON.parse(JSON.stringify(getWeekAround(getCurrentDayIndex())))
}

export async function fetchWorkout(id) {
  await delay()
  const found = findWorkout(id)
  if (!found) throw new Error('Séance introuvable')
  return JSON.parse(JSON.stringify(found.workout))
}

export async function fetchAlternativeExercises(exerciseId) {
  await delay()
  // Alternatives génériques par groupe musculaire — le générateur IA (onboarding) prend le
  // relais pour de vraies suggestions personnalisées ; ceci reste un repli simple.
  const found = findExercise(exerciseId)
  if (!found) return []
  const byGroup = {
    Jambes: [
      { nom: 'Squat sumo', groupeMusculaire: 'Jambes', series: 3, repetitions: '12', reposSec: 60, consignes: 'Pieds plus larges, cible aussi l\'intérieur des cuisses.' },
      { nom: 'Chaise contre un mur', groupeMusculaire: 'Jambes', series: 3, repetitions: '30 sec', reposSec: 60, consignes: 'Bon isométrique de secours si les genoux tirent.' },
    ],
    Pectoraux: [
      { nom: 'Pompes inclinées (mains sur chaise)', groupeMusculaire: 'Pectoraux', series: 3, repetitions: '12', reposSec: 60, consignes: 'Réduit la charge sur les épaules, bon point de départ.' },
    ],
    Dos: [
      { nom: 'Superman', groupeMusculaire: 'Dos', series: 3, repetitions: '12', reposSec: 45, consignes: 'Allongé sur le ventre, lève bras et jambes en même temps.' },
    ],
    'Sangle abdominale': [
      { nom: 'Crunch', groupeMusculaire: 'Sangle abdominale', series: 3, repetitions: '15', reposSec: 45, consignes: 'Remontée courte et contrôlée, ne tire pas sur la nuque.' },
    ],
  }
  return JSON.parse(JSON.stringify(byGroup[found.exercise.groupeMusculaire] ?? []))
}

export async function fetchMeal(id) {
  await delay()
  const found = findMeal(id)
  if (!found) throw new Error('Repas introuvable')
  return JSON.parse(JSON.stringify(found.meal))
}

export async function fetchAlternativeMeals(mealId) {
  await delay()
  const found = findMeal(mealId)
  if (!found) return []
  const byType = { petit_dejeuner: 'meal-breakfast', dejeuner: 'meal-lunch', diner: 'meal-dinner' }
  if (getProgramSource() === 'genere') {
    // Programme généré : les alternatives sont les autres repas du même type de la semaine.
    return JSON.parse(JSON.stringify(getMealOptionsForDay(found.dayIndex, found.meal.type).options.filter((o) => o.nom !== found.meal.nom)))
  }
  const key = byType[found.meal.type]
  return JSON.parse(JSON.stringify(mockAlternativeMeals[key] ?? []))
}

// Options prêtes à choisir dès l'affichage, pour un créneau donné du jour courant (section
// "choisir les repas") — distinct de fetchAlternativeMeals qui reste le flow IA "je n'aime pas".
export async function fetchMealOptions(dayIndex, type) {
  await delay()
  return JSON.parse(JSON.stringify(getMealOptionsForDay(dayIndex, type)))
}

export async function chooseMealOption(dayIndex, type, optionIndex) {
  await delay(80)
  return JSON.parse(JSON.stringify(selectMealOption(dayIndex, type, optionIndex)))
}

export async function fetchShoppingList() {
  await delay()
  return JSON.parse(JSON.stringify(getShoppingList()))
}

export async function fetchHydration() {
  await delay()
  return { ...getHydrationToday() }
}

export async function fetchSleep() {
  await delay()
  return JSON.parse(JSON.stringify(getSleepToday()))
}

export async function updateSleep(times) {
  await delay(80)
  return JSON.parse(JSON.stringify(setSleepToday(times)))
}

export async function fetchHabits() {
  await delay()
  return JSON.parse(JSON.stringify(getHabitsToday()))
}

export async function fetchProgress() {
  await delay()
  return JSON.parse(JSON.stringify(getProgressSnapshot()))
}

// ── Mutations (persistées en localStorage via programState.js) ──────────

export async function markItemStatus(itemId, status) {
  await delay(80)
  setItemStatus(getCurrentDayIndex(), itemId, status)
  return { id: itemId, status }
}

export async function addHydration(amountMl) {
  await delay(80)
  return { ...addHydrationToday(amountMl) }
}

export async function toggleHabit(habitId) {
  await delay(80)
  return toggleHabitToday(habitId)
}

export async function toggleShoppingItem(categoryKey, itemName) {
  await delay(60)
  const checked = toggleShoppingItemChecked(categoryKey, itemName)
  return { nom: itemName, checked }
}

export async function markExerciseStatus(exerciseId, status) {
  await delay(60)
  const found = findExercise(exerciseId)
  if (!found) return null
  setItemStatus(found.dayIndex, exerciseId, status)
  // Une séance est "terminée" quand tous ses exercices le sont — reflété sur l'item timeline
  // "workout" du jour pour que le dashboard/agenda affichent le bon statut immédiatement.
  const allDone = found.workout.exercises.every((e) => (e.id === exerciseId ? status : e.status) === 'termine')
  const workoutStatus = allDone ? 'termine' : 'a_faire'
  setItemStatus(found.dayIndex, found.workout.id, workoutStatus)
  setItemStatus(found.dayIndex, 'workout', workoutStatus)
  return { id: exerciseId, status }
}

export async function applyMealAlternative(mealId, alternative) {
  await delay(60)
  updateMealContent(mealId, alternative)
  return alternative
}

export async function updateMealIngredients(mealId, ingredients) {
  await delay(60)
  updateMealContent(mealId, { ingredients })
  return ingredients
}

export async function logWeightEntry(value) {
  await delay(80)
  return logWeight(value)
}

// ── Avancement du programme (simulation "comme si l'app tournait en continu") ──

export async function fetchProgramProgress() {
  await delay(0)
  return {
    currentDayIndex: getCurrentDayIndex(), totalDays: getTotalDays(), durationWeeks: getDurationWeeks(),
    dateMode: getDateMode(), finished: isProgramFinished(),
  }
}

export async function changeDateMode(mode) {
  await delay(0)
  setDateMode(mode)
  return fetchProgramProgress()
}

// ── Ressenti, activités libres, séance express, charges ─────────────────────

export async function saveFeeling(feeling) {
  await delay(40)
  return setFeelingToday(feeling)
}

export async function logActivity(activity) {
  await delay(60)
  return addActivityToday(activity)
}

export async function deleteActivity(activityId) {
  await delay(40)
  removeActivityToday(activityId)
}

export async function setWorkoutExpress(workoutId, express) {
  await delay(40)
  const found = findWorkout(workoutId)
  if (!found) return null
  setExpressWorkout(found.dayIndex, express)
  return JSON.parse(JSON.stringify(findWorkout(workoutId).workout))
}

export async function saveExerciseSet(nomExercice, set) {
  await delay(40)
  return logExerciseSet(nomExercice, set)
}

export async function fetchExerciseHistory(nomExercice) {
  await delay(0)
  return getExerciseHistory(nomExercice)
}

export async function goToNextDay() {
  await delay(150)
  return { currentDayIndex: advanceToNextDay() }
}

export async function goToPreviousProgramDay() {
  await delay(150)
  return { currentDayIndex: goToPreviousDay() }
}
