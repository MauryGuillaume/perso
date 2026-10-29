// État persisté du programme mock — remplace les objets figés de mockProgram.js par un état
// vivant : jour courant, statuts réels par item/jour, hydratation et sommeil par jour, tout
// sauvegardé en localStorage pour survivre aux rechargements. C'est ce qui fait que l'app se
// comporte "comme si elle était branchée".
//
// Deux façons d'avancer dans le programme (state.dateMode) :
//  - 'reel' : le jour courant suit la date de l'appareil depuis state.startDate (usage normal) ;
//  - 'demo' : le jour courant avance avec les boutons Jour précédent / suivant (tests, démo).
// Deux sources de contenu (state.source) :
//  - 'genere' : le programme généré à l'onboarding (Claude ou générateur de secours) ;
//  - 'demo'   : le programme d'exemple construit sur le profil de Guillaume.
import { readJson, writeJson } from './localStore.js'
import {
  buildDay, weekLabelFor, DEFAULT_SCHEDULE, getMealOptionsFor, configureEngine, getTotalDays,
  getDurationWeeks, PROGRAM_START_DATE, DURATION_WEEKS, localTodayIso, daysBetweenIso, isoForDay,
} from './programEngine.js'
import { mockUser, mockProgramSummary, mockProgress } from './mockProgram.js'

const KEY = 'programState'
// Lu directement en storage plutôt que via le store Pinia d'onboarding, pour éviter un couplage
// store↔store — les deux lisent/écrivent la même clé localStorage (cf useOnboardingStore.js).
const ONBOARDING_KEY = 'onboarding'

function defaultState() {
  return {
    started: false, // false tant que l'utilisateur n'a ni appliqué un programme ni choisi le profil démo
    source: 'demo', // 'demo' | 'genere'
    dateMode: 'reel', // 'reel' | 'demo'
    startDate: localTodayIso(),
    currentDayIndex: 0, // utilisé seulement en mode 'demo'
    // statusByDay[dayIndex] = { [itemId]: 'termine' | 'a_faire' } — ne contient que les
    // écarts par rapport au statut par défaut ('a_faire'), pour rester compact.
    statusByDay: {},
    hydrationByDay: {}, // { [dayIndex]: currentMl }
    sleepByDay: {}, // { [dayIndex]: { heureCoucher, heureReveil } } — saisie réelle du jour, prime sur l'habitude onboarding
    shoppingChecked: {}, // { "semaine::categoryKey::itemNom": boolean }
    weightLog: [], // pesées réelles saisies par l'utilisateur
    mealOverrides: {}, // { [mealId]: {nom, ingredients, ...} } — alternative choisie / ingrédients édités
    mealSelections: {}, // { [dayIndex]: { [type]: index choisi parmi les options } }
    feelingByDay: {}, // { [dayIndex]: 'en_forme' | 'fatigue' | 'douleur' | 'stresse' }
    activitiesByDay: {}, // { [dayIndex]: [{ id, type, label, icon, dureeMin }] } — sport libre
    expressByDay: {}, // { [dayIndex]: true } — séance du jour faite en version express
    exerciseLog: {}, // { [nomExercice]: [{ date, poidsKg, reps }] } — charges et répétitions réalisées
  }
}

// Un navigateur qui avait déjà des données d'avant les modes garde exactement son comportement :
// profil démo, même date de départ, avancée manuelle des jours.
function migrate(saved) {
  if (saved.started !== undefined) return saved
  return {
    ...saved,
    started: true,
    source: 'demo',
    dateMode: 'demo',
    startDate: PROGRAM_START_DATE,
    weightLog: saved.weightLog ?? mockProgress.poidsKg.slice(0, 1),
  }
}

let state = (() => {
  const saved = readJson(KEY, null)
  return saved ? { ...defaultState(), ...migrate(saved) } : defaultState()
})()

function readOnboarding() {
  return readJson(ONBOARDING_KEY, null)
}

function syncEngine() {
  const program = state.source === 'genere' ? readOnboarding()?.generatedProgram ?? null : null
  configureEngine({
    startDate: state.startDate,
    durationWeeks: program?.durationWeeks || DURATION_WEEKS,
    program,
  })
}
syncEngine()

function persist() {
  writeJson(KEY, state)
}

export function resetProgramState() {
  state = defaultState()
  syncEngine()
  persist()
}

// ── Démarrage ──────────────────────────────────────────────────────────────
export function hasStartedProgram() {
  return state.started
}

// Applique le programme généré à l'onboarding : jour 1 = aujourd'hui, statuts remis à zéro.
// Les pesées et les charges sont gardées ; le poids déclaré devient le premier point s'il n'y en a pas.
export function startGeneratedProgram() {
  const answers = readOnboarding()?.answers ?? {}
  const weightLog = state.weightLog.length || !answers.poidsKg
    ? state.weightLog
    : [{ date: localTodayIso(), value: Number(answers.poidsKg) }]
  state = { ...defaultState(), started: true, source: 'genere', weightLog, exerciseLog: state.exerciseLog }
  syncEngine()
  persist()
}

// Profil d'exemple (Guillaume) pour découvrir l'app sans remplir le questionnaire.
export function startDemoProgram() {
  state = { ...defaultState(), started: true, source: 'demo', weightLog: [{ date: localTodayIso(), value: mockProgress.poidsKg[0].value }] }
  syncEngine()
  persist()
}

export function getProgramSource() {
  return state.source
}

// ── Profil (réponses de l'onboarding, repli sur le profil démo) ────────────
const PROFIL_DEMO = {
  ...mockUser,
  niveauSport: 'debutant',
  dureeSeance: 30,
  lieu: 'maison',
  joursDisponibles: DEFAULT_SCHEDULE.joursDisponibles,
}

export function getProfil() {
  const answers = state.source === 'genere' ? readOnboarding()?.answers : null
  if (!answers) return { ...PROFIL_DEMO }
  return {
    ...answers,
    prenom: answers.prenom || PROFIL_DEMO.prenom,
    niveauSport: answers.niveauSport || 'debutant',
    dureeSeance: answers.dureeSeance || 30,
  }
}

export function getProgramSummary() {
  const program = state.source === 'genere' ? readOnboarding()?.generatedProgram : null
  return { ...mockProgramSummary, ...(program?.summary ?? {}), durationWeeks: getDurationWeeks() }
}

// ── Préférences horaires (issues du questionnaire d'onboarding, section sport/sommeil) ──
function getScheduleFromOnboarding() {
  const answers = state.source === 'genere' ? readOnboarding()?.answers : null
  if (!answers) return DEFAULT_SCHEDULE
  return {
    heureReveil: answers.heureReveil || DEFAULT_SCHEDULE.heureReveil,
    heureCoucher: answers.heureCoucher || DEFAULT_SCHEDULE.heureCoucher,
    heureEntrainement: answers.heureEntrainement || DEFAULT_SCHEDULE.heureEntrainement,
    joursDisponibles: answers.joursDisponibles?.length ? answers.joursDisponibles : DEFAULT_SCHEDULE.joursDisponibles,
  }
}

export function getSchedule() {
  return getScheduleFromOnboarding()
}

// ── Jour courant ──────────────────────────────────────────────────────────
function clampDay(d) {
  return Math.max(0, Math.min(getTotalDays() - 1, d))
}

export function getCurrentDayIndex() {
  if (state.dateMode === 'reel') return clampDay(daysBetweenIso(state.startDate, localTodayIso()))
  return state.currentDayIndex
}

// Le programme est arrivé au bout (mode réel) : sert à proposer un nouveau cycle.
export function isProgramFinished() {
  return state.dateMode === 'reel' && daysBetweenIso(state.startDate, localTodayIso()) >= getTotalDays()
}

export function getDateMode() {
  return state.dateMode
}

export function setDateMode(mode) {
  if (mode === state.dateMode) return
  if (mode === 'demo') {
    state.currentDayIndex = getCurrentDayIndex()
  } else {
    // Le jour affiché devient "aujourd'hui" : la date de départ recule d'autant.
    const d = new Date(localTodayIso() + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - state.currentDayIndex)
    state.startDate = d.toISOString().slice(0, 10)
  }
  state.dateMode = mode
  syncEngine()
  persist()
}

export function advanceToNextDay() {
  if (state.dateMode !== 'demo') return getCurrentDayIndex()
  state.currentDayIndex = clampDay(state.currentDayIndex + 1)
  persist()
  return state.currentDayIndex
}

export function goToPreviousDay() {
  if (state.dateMode !== 'demo') return getCurrentDayIndex()
  state.currentDayIndex = clampDay(state.currentDayIndex - 1)
  persist()
  return state.currentDayIndex
}

// ── Jour matérialisé (structure du moteur + statuts et overrides persistés fusionnés) ──
export function materializeDay(dayIndex) {
  const schedule = { ...getScheduleFromOnboarding() }
  // La saisie réelle du jour (écran Sommeil) prime sur l'heure habituelle de l'onboarding.
  const daySleep = state.sleepByDay[dayIndex]
  if (daySleep?.heureCoucher) schedule.heureCoucher = daySleep.heureCoucher
  if (daySleep?.heureReveil) schedule.heureReveil = daySleep.heureReveil

  const mealSelections = state.mealSelections[dayIndex] ?? {}
  const built = buildDay(dayIndex, 'a_faire', schedule, mealSelections)
  const overrides = state.statusByDay[dayIndex] ?? {}

  for (const item of built.items) {
    if (overrides[item.id]) item.status = overrides[item.id]
  }
  if (built.workout) {
    if (state.expressByDay[dayIndex]) applyExpress(built.workout)
    if (overrides[built.workout.id]) built.workout.status = overrides[built.workout.id]
    for (const ex of built.workout.exercises) {
      if (overrides[ex.id]) ex.status = overrides[ex.id]
    }
    const item = built.items.find((i) => i.type === 'workout')
    if (item) item.subtitle = `${built.workout.nom} — ${built.workout.dureeMin} min`
  }
  for (const meal of built.meals) {
    if (overrides[meal.id]) meal.status = overrides[meal.id]
    const contentOverride = state.mealOverrides[meal.id]
    if (contentOverride) Object.assign(meal, contentOverride)
  }
  built.feeling = state.feelingByDay[dayIndex] ?? null
  built.activities = state.activitiesByDay[dayIndex] ?? []
  return built
}

export function getToday() {
  return materializeDay(getCurrentDayIndex())
}

export function getWeekAround(dayIndex) {
  const weekday = materializeDay(dayIndex).weekday // 0=dim..6=sam
  const monday = dayIndex - (weekday === 0 ? 6 : weekday - 1)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = monday + i
    if (d < 0 || d >= getTotalDays()) continue
    const day = materializeDay(d)
    days.push({
      label: day.dateLabel,
      iso: day.iso,
      dayIndex: d,
      workoutCount: day.hasWorkout ? 1 : 0,
      mealCount: day.meals.length,
      isToday: d === getCurrentDayIndex(),
    })
  }
  return days
}

export function getWeekLabel() {
  return weekLabelFor(getCurrentDayIndex())
}

// ── Statut d'un item (timeline, repas, exercice) ────────────────────────
export function setItemStatus(dayIndex, itemId, status) {
  if (!state.statusByDay[dayIndex]) state.statusByDay[dayIndex] = {}
  state.statusByDay[dayIndex][itemId] = status
  persist()
}

export function findMeal(mealId) {
  // mealId encode le jour: "meal-d<dayIndex>-<type>"
  const match = mealId.match(/^meal-d(\d+)-/)
  if (!match) return null
  const dayIndex = parseInt(match[1], 10)
  const day = materializeDay(dayIndex)
  const meal = day.meals.find((m) => m.id === mealId)
  return meal ? { meal, dayIndex } : null
}

export function updateMealContent(mealId, patch) {
  // Les modifications de contenu (alternative choisie, ingrédients édités) ne sont pas
  // régénérables depuis le moteur — on les stocke à part, fusionnées à la lecture.
  state.mealOverrides[mealId] = { ...(state.mealOverrides[mealId] ?? {}), ...patch }
  persist()
}

// Options de repas proposées pour un créneau donné d'un jour — permet de choisir librement
// dès la génération, sans passer par "je n'aime pas ce repas". `selectedIndex` indique
// laquelle des options est actuellement affichée pour ce jour (repli sur le repas prévu).
export function getMealOptionsForDay(dayIndex, type) {
  const options = getMealOptionsFor(type)
  const chosen = state.mealSelections[dayIndex]?.[type]
  if (Number.isInteger(chosen)) return { options, selectedIndex: chosen }
  const planned = materializeDay(dayIndex).meals.find((m) => m.type === type)
  const plannedIndex = options.findIndex((o) => o.nom === planned?.nom)
  return { options, selectedIndex: plannedIndex >= 0 ? plannedIndex : 0 }
}

export function selectMealOption(dayIndex, type, optionIndex) {
  if (!state.mealSelections[dayIndex]) state.mealSelections[dayIndex] = {}
  state.mealSelections[dayIndex][type] = optionIndex
  persist()
  return materializeDay(dayIndex).meals.find((m) => m.type === type)
}

export function findWorkout(workoutId) {
  const match = workoutId.match(/^workout-d(\d+)$/)
  if (!match) return null
  const dayIndex = parseInt(match[1], 10)
  const day = materializeDay(dayIndex)
  return day.workout && day.workout.id === workoutId ? { workout: day.workout, dayIndex } : null
}

export function findExercise(exerciseId) {
  const match = exerciseId.match(/^(workout-d\d+)-ex\d+$/)
  if (!match) return null
  const found = findWorkout(match[1])
  if (!found) return null
  const exercise = found.workout.exercises.find((e) => e.id === exerciseId)
  return exercise ? { exercise, dayIndex: found.dayIndex, workout: found.workout } : null
}

// ── Séance express ─────────────────────────────────────────────────────────
// Version courte de la séance du jour pour les jours sans temps ou sans énergie : les 3 premiers
// exercices, 2 séries, repos réduit. Mieux vaut 10 minutes qu'une séance sautée.
const EXPRESS_EXERCISES = 3
function applyExpress(workout) {
  workout.exercises = workout.exercises.slice(0, EXPRESS_EXERCISES).map((ex) => ({
    ...ex, series: Math.min(ex.series, 2), reposSec: Math.min(ex.reposSec, 40),
  }))
  workout.dureeMin = Math.min(workout.dureeMin, 10)
  workout.express = true
}

export function setExpressWorkout(dayIndex, express) {
  if (express) state.expressByDay[dayIndex] = true
  else delete state.expressByDay[dayIndex]
  persist()
}

// ── Ressenti du jour ───────────────────────────────────────────────────────
export function setFeelingToday(feeling) {
  const d = getCurrentDayIndex()
  if (feeling) state.feelingByDay[d] = feeling
  else delete state.feelingByDay[d]
  persist()
  return state.feelingByDay[d] ?? null
}

// ── Activités libres (handball, marche, vélo…) ────────────────────────────
export function addActivityToday(activity) {
  const d = getCurrentDayIndex()
  const entry = { id: `act-${Date.now()}`, ...activity }
  state.activitiesByDay[d] = [...(state.activitiesByDay[d] ?? []), entry]
  if (!state.statusByDay[d]) state.statusByDay[d] = {}
  state.statusByDay[d].active = 'termine'
  persist()
  return entry
}

export function removeActivityToday(activityId) {
  const d = getCurrentDayIndex()
  state.activitiesByDay[d] = (state.activitiesByDay[d] ?? []).filter((a) => a.id !== activityId)
  if (!state.activitiesByDay[d].length && state.statusByDay[d]) delete state.statusByDay[d].active
  persist()
}

// ── Charges et records par exercice ───────────────────────────────────────
export function logExerciseSet(nomExercice, { poidsKg, reps }) {
  const iso = isoForDay(getCurrentDayIndex())
  const list = (state.exerciseLog[nomExercice] ?? []).filter((e) => e.date !== iso)
  list.push({ date: iso, poidsKg: poidsKg ?? null, reps: reps ?? null })
  list.sort((a, b) => a.date.localeCompare(b.date))
  state.exerciseLog[nomExercice] = list
  persist()
  return getExerciseHistory(nomExercice)
}

export function getExerciseHistory(nomExercice) {
  const list = state.exerciseLog[nomExercice] ?? []
  // Record = charge la plus lourde, puis le plus de répétitions à charge égale.
  const record = list.reduce((best, e) => {
    const score = (e.poidsKg ?? 0) * 1000 + (e.reps ?? 0)
    return !best || score > best.score ? { ...e, score } : best
  }, null)
  return { history: list, last: list[list.length - 1] ?? null, record }
}

export function getAllRecords() {
  return Object.keys(state.exerciseLog)
    .map((nom) => ({ nom, ...getExerciseHistory(nom) }))
    .filter((r) => r.record)
    .sort((a, b) => a.nom.localeCompare(b.nom))
}

// ── Hydratation / sommeil du jour courant ──────────────────────────────────
function hydrationGoalMl() {
  return Math.round((getProgramSummary().objectifHydratationL ?? 2.5) * 1000)
}

export function getHydrationToday() {
  const currentMl = state.hydrationByDay[getCurrentDayIndex()] ?? 0
  return { currentMl, goalMl: hydrationGoalMl() }
}

export function addHydrationToday(amountMl) {
  const d = getCurrentDayIndex()
  const goalMl = hydrationGoalMl()
  const current = state.hydrationByDay[d] ?? 0
  state.hydrationByDay[d] = Math.max(0, Math.min(goalMl + 1000, current + amountMl))
  persist()
  return { currentMl: state.hydrationByDay[d], goalMl }
}

function durationBetween(heureCoucher, heureReveil) {
  const [ch, cm] = heureCoucher.split(':').map(Number)
  const [rh, rm] = heureReveil.split(':').map(Number)
  let minutes = (rh * 60 + rm) - (ch * 60 + cm)
  if (minutes <= 0) minutes += 24 * 60 // coucher le soir, réveil le lendemain
  return Math.round((minutes / 60) * 10) / 10
}

function sleepForDay(dayIndex) {
  const schedule = getScheduleFromOnboarding()
  const daySleep = state.sleepByDay[dayIndex]
  const heureCoucher = daySleep?.heureCoucher || schedule.heureCoucher
  const heureReveil = daySleep?.heureReveil || schedule.heureReveil
  return { heureCoucher, heureReveil, dureeReelleH: durationBetween(heureCoucher, heureReveil) }
}

export function getSleepToday() {
  const dureeCibleH = getProgramSummary().objectifSommeilH ?? 8
  const current = getCurrentDayIndex()
  const today = sleepForDay(current)
  const tendance7j = []
  for (let i = 6; i >= 0; i--) {
    const d = current - i
    tendance7j.push(d >= 0 ? sleepForDay(d).dureeReelleH : today.dureeReelleH)
  }
  return { ...today, dureeCibleH, tendance7j }
}

// Saisie manuelle du coucher/réveil réel du jour courant — prime sur l'heure habituelle de
// l'onboarding tant qu'elle n'est pas re-modifiée. `heureCoucher` concerne la nuit qui VIENT
// DE SE TERMINER (coucher la veille), c'est pourquoi il est stocké sur le jour courant : c'est
// la nuit dont le réveil correspond au jour affiché.
export function setSleepToday({ heureCoucher, heureReveil }) {
  const d = getCurrentDayIndex()
  const existing = state.sleepByDay[d] ?? {}
  state.sleepByDay[d] = {
    ...existing,
    heureCoucher: heureCoucher ?? existing.heureCoucher,
    heureReveil: heureReveil ?? existing.heureReveil,
  }
  persist()
  return getSleepToday()
}

// ── Liste de courses (calculée depuis les repas de la semaine en cours) ─────
const SHOPPING_CATEGORIES = [
  { key: 'fruits_legumes', label: 'Fruits & légumes' },
  { key: 'proteines', label: 'Protéines' },
  { key: 'feculents', label: 'Féculents' },
  { key: 'produits_laitiers', label: 'Produits laitiers' },
  { key: 'epicerie', label: 'Épicerie' },
  { key: 'autre', label: 'Autre' },
]
const UNIT_LABELS = { cas: 'c. à soupe', cac: 'c. à café' }

function formatQuantity(quantite, unite) {
  const fr = (n) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  if (unite === 'g' && quantite >= 1000) return `${fr(quantite / 1000)} kg`
  if (unite === 'ml' && quantite >= 1000) return `${fr(quantite / 1000)} L`
  const n = Math.round(quantite * 10) / 10
  if (unite === 'piece') return `${fr(n)} ${n > 1 ? 'pièces' : 'pièce'}`
  return `${fr(n)} ${UNIT_LABELS[unite] ?? unite}`
}

function currentWeekDays() {
  const current = getCurrentDayIndex()
  const weekday = materializeDay(current).weekday
  const monday = current - (weekday === 0 ? 6 : weekday - 1)
  const days = []
  for (let d = Math.max(0, monday); d <= Math.min(getTotalDays() - 1, monday + 6); d++) days.push(d)
  return { monday, days }
}

export function getShoppingList() {
  const { monday, days } = currentWeekDays()
  const totals = new Map() // "categorie::nom::unite" → { categorie, nom, unite, quantite }
  for (const d of days) {
    for (const meal of materializeDay(d).meals) {
      for (const ing of meal.ingredients ?? []) {
        const categorie = SHOPPING_CATEGORIES.some((c) => c.key === ing.categorie) ? ing.categorie : 'autre'
        const key = `${categorie}::${ing.nom}::${ing.unite}`
        const entry = totals.get(key) ?? { categorie, nom: ing.nom, unite: ing.unite, quantite: 0 }
        entry.quantite += Number(ing.quantite) || 0
        totals.set(key, entry)
      }
    }
  }
  const weekKey = `w${monday}`
  return {
    weekLabel: getWeekLabel(),
    categories: SHOPPING_CATEGORIES.map((cat) => ({
      key: cat.key,
      label: cat.label,
      items: [...totals.values()]
        .filter((e) => e.categorie === cat.key)
        .sort((a, b) => a.nom.localeCompare(b.nom))
        .map((e) => ({
          nom: e.nom,
          quantite: formatQuantity(e.quantite, e.unite),
          checked: state.shoppingChecked[`${weekKey}::${cat.key}::${e.nom}`] ?? false,
        })),
    })).filter((cat) => cat.items.length),
  }
}

export function toggleShoppingItemChecked(categoryKey, itemName) {
  const { monday } = currentWeekDays()
  const key = `w${monday}::${categoryKey}::${itemName}`
  state.shoppingChecked[key] = !(state.shoppingChecked[key] ?? false)
  persist()
  return state.shoppingChecked[key]
}

// ── Progression (calculée depuis l'historique réel, pas figée) ─────────────
export function getProgressSnapshot() {
  const current = getCurrentDayIndex()
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = current - i
    if (d >= 0) last7.push(d)
  }
  const habitudesTaux7j = last7.length ? average(last7.map((d) => dayHabitCompletionRate(d))) : 0
  const hydratationMoy7j = last7.length ? average(last7.map((d) => (state.hydrationByDay[d] ?? 0) / 1000)) : 0
  const sommeilMoy7j = last7.length ? average(last7.map((d) => sleepForDay(d).dureeReelleH)) : 0
  const activites7j = last7.reduce((n, d) => n + (state.activitiesByDay[d]?.length ?? 0), 0)

  return {
    poidsKg: state.weightLog,
    seancesRealisees: { faites: countCompletedWorkoutsUpTo(current), prevues: countWorkoutDaysUpTo(current) },
    habitudesTaux7j: round2(habitudesTaux7j),
    hydratationMoy7j: round2(hydratationMoy7j),
    sommeilMoy7j: round2(sommeilMoy7j),
    activites7j,
    records: getAllRecords(),
  }
}

export function logWeight(value) {
  const iso = isoForDay(getCurrentDayIndex())
  const existing = state.weightLog.find((w) => w.date === iso)
  if (existing) existing.value = value
  else state.weightLog.push({ date: iso, value })
  state.weightLog.sort((a, b) => a.date.localeCompare(b.date))
  persist()
  return state.weightLog
}

function countWorkoutDaysUpTo(dayIndex) {
  let count = 0
  for (let d = 0; d <= dayIndex; d++) if (materializeDay(d).hasWorkout) count += 1
  return count
}
function countCompletedWorkoutsUpTo(dayIndex) {
  let count = 0
  for (let d = 0; d <= dayIndex; d++) {
    const day = materializeDay(d)
    if (day.hasWorkout && day.items.find((i) => i.type === 'workout')?.status === 'termine') count += 1
  }
  return count
}
function dayHabitCompletionRate(dayIndex) {
  const day = materializeDay(dayIndex)
  const habitItems = day.items.filter((i) => i.type === 'habit' || i.type === 'hydration' || i.type === 'sleep')
  if (!habitItems.length) return 0
  return habitItems.filter((i) => i.status === 'termine').length / habitItems.length
}
function average(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length }
function round2(n) { return Math.round(n * 100) / 100 }

// ── Habitudes (statiques par nature, statut dérivé du jour courant) ────────
// itemId 'active' n'est pas dans la timeline : il passe à "terminé" quand une activité libre est
// enregistrée, ou quand on coche l'habitude.
const HABIT_DEFINITIONS = [
  { id: 'h1', icone: '💧', libelle: 'Boire suffisamment', itemId: 'hydration-2' },
  { id: 'h2', icone: '🏋️', libelle: 'Faire ma séance / activité du jour', itemId: 'workout', altItemIds: ['handball', 'match'] },
  { id: 'h3', icone: '🚶', libelle: 'Bouger dans la journée', itemId: 'active', virtual: true },
  { id: 'h4', icone: '🥦', libelle: 'Manger équilibré', itemId: 'dinner' },
  { id: 'h5', icone: '📵', libelle: 'Routine du soir sans écran', itemId: 'routine' },
]

function habitItemId(def, day) {
  if (def.virtual) return def.itemId
  const ids = new Set(day.items.map((i) => i.id))
  if (ids.has(def.itemId)) return def.itemId
  return def.altItemIds?.find((id) => ids.has(id)) ?? null
}

export function getHabitsToday() {
  const d = getCurrentDayIndex()
  const day = materializeDay(d)
  const overrides = state.statusByDay[d] ?? {}
  return HABIT_DEFINITIONS
    .map((h) => {
      const itemId = habitItemId(h, day)
      if (!itemId) return null // ex: pas de séance ni de handball ce jour-là
      const status = h.virtual ? overrides[itemId] : day.items.find((i) => i.id === itemId).status
      return { id: h.id, icone: h.icone, libelle: h.libelle, itemId, status: status === 'termine' ? 'termine' : 'a_faire' }
    })
    .filter(Boolean)
}

export function toggleHabitToday(habitId) {
  const habit = getHabitsToday().find((h) => h.id === habitId)
  if (!habit) return null
  const newStatus = habit.status === 'termine' ? 'a_faire' : 'termine'
  setItemStatus(getCurrentDayIndex(), habit.itemId, newStatus)
  return { ...habit, status: newStatus }
}

export function getUser() {
  const p = getProfil()
  return { prenom: p.prenom, objectifPrincipal: p.objectifPrincipal }
}
