// Moteur de programme mock — génère le contenu de N'IMPORTE QUEL jour du programme (0 à
// durationWeeks*7 - 1) à partir de patterns hebdomadaires réutilisables, au lieu d'un seul
// jour "aujourd'hui" figé en dur. Permet à l'app de tourner en continu, jour après jour,
// avec un vrai jour 1 de départ — cf besoin : "comme si l'application était branchée mais
// enregistrée en local".
//
// Contenu construit à partir du questionnaire réel de Guillaume (cf mockProgram.js pour le
// contexte complet : débutant, maison, élastiques + tapis, 30 min/séance, handball club le
// mercredi et vendredi soir + match le week-end, perte de poids, budget serré).

// Date du jour 0 et durée : réglables, car elles dépendent de l'utilisateur (date à laquelle il
// a commencé, durée du programme généré). PROGRAM_START_DATE reste la date du profil démo.
export const PROGRAM_START_DATE = '2026-06-16'
export const DURATION_WEEKS = 12
export const TOTAL_DAYS = DURATION_WEEKS * 7

const config = {
  startDate: PROGRAM_START_DATE,
  durationWeeks: DURATION_WEEKS,
  program: null, // programme généré à l'onboarding (forme GeneratedProgramJson), null = profil démo
}

export function configureEngine({ startDate, durationWeeks, program } = {}) {
  if (startDate) config.startDate = startDate
  if (durationWeeks) config.durationWeeks = durationWeeks
  if (program !== undefined) config.program = program
}

export function getDurationWeeks() { return config.durationWeeks }
export function getTotalDays() { return config.durationWeeks * 7 }
export function usesGeneratedProgram() { return Boolean(config.program?.days?.length) }

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// Calcul en UTC : évite qu'un passage à l'heure d'été décale un jour.
export function isoForDay(dayIndex) {
  const d = new Date(config.startDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayIndex)
  return d.toISOString().slice(0, 10)
}

export function weekdayForDay(dayIndex) {
  // 0=dimanche..6=samedi, cohérent avec Date.getDay()
  return new Date(isoForDay(dayIndex) + 'T00:00:00Z').getUTCDay()
}

// Nombre de jours entre deux dates ISO (YYYY-MM-DD).
export function daysBetweenIso(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
}

// Date du jour de l'appareil au format ISO, en heure locale.
export function localTodayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Jours de renfo maison : lundi(1)/mardi(2)/jeudi(4) — pas mercredi(3)/vendredi(5) (handball
// club), repos actif samedi(6), match dimanche(0) compté comme activité mais pas "workout" du
// programme perso.
const WORKOUT_WEEKDAYS = new Set([1, 2, 4])
const HANDBALL_MATCH_WEEKDAY = 0

const WORKOUT_TEMPLATES = [
  {
    nom: 'Full Body élastiques',
    dureeMin: 30, difficulte: 'debutant', objectif: 'force',
    exercises: [
      { nomEx: 'Squat au poids du corps', groupeMusculaire: 'Jambes', series: 3, repetitions: '12', reposSec: 60, consignes: 'Débutant : descends jusqu\'où c\'est confortable, dos droit, pousse dans les talons.' },
      { nomEx: 'Pompes sur genoux', groupeMusculaire: 'Pectoraux', series: 3, repetitions: '10', reposSec: 60, consignes: 'Corps aligné des genoux à la tête. Réduis l\'amplitude si besoin.' },
      { nomEx: 'Tirage élastique dos', groupeMusculaire: 'Dos', series: 3, repetitions: '12', reposSec: 60, consignes: 'Fixe l\'élastique à une poignée de porte. Tire les coudes vers l\'arrière.' },
      { nomEx: 'Fentes alternées', groupeMusculaire: 'Jambes', series: 2, repetitions: '10 / jambe', reposSec: 60, consignes: 'Genou avant aligné avec la cheville.' },
      { nomEx: 'Gainage sur tapis', groupeMusculaire: 'Sangle abdominale', series: 3, repetitions: '25 sec', reposSec: 45, consignes: 'Corps aligné de la tête aux talons.' },
    ],
  },
  {
    nom: 'Haut du corps élastiques',
    dureeMin: 30, difficulte: 'debutant', objectif: 'force',
    exercises: [
      { nomEx: 'Pompes sur genoux', groupeMusculaire: 'Pectoraux', series: 3, repetitions: '10', reposSec: 60, consignes: 'Corps aligné, contrôle la descente.' },
      { nomEx: 'Tirage élastique dos', groupeMusculaire: 'Dos', series: 3, repetitions: '12', reposSec: 60, consignes: 'Omoplates serrées en fin de mouvement.' },
      { nomEx: 'Élévations latérales élastique', groupeMusculaire: 'Épaules', series: 3, repetitions: '12', reposSec: 45, consignes: 'Coudes légèrement fléchis, monte jusqu\'à l\'horizontale.' },
      { nomEx: 'Gainage sur tapis', groupeMusculaire: 'Sangle abdominale', series: 3, repetitions: '30 sec', reposSec: 45, consignes: 'Respire calmement, ne bloque pas.' },
    ],
  },
  {
    nom: 'Bas du corps & mobilité',
    dureeMin: 30, difficulte: 'debutant', objectif: 'mobilite',
    exercises: [
      { nomEx: 'Squat au poids du corps', groupeMusculaire: 'Jambes', series: 3, repetitions: '15', reposSec: 45, consignes: 'Rythme modéré, contrôle la remontée.' },
      { nomEx: 'Fentes alternées', groupeMusculaire: 'Jambes', series: 3, repetitions: '10 / jambe', reposSec: 60, consignes: 'Appui mur possible pour l\'équilibre.' },
      { nomEx: 'Pont fessier', groupeMusculaire: 'Fessiers', series: 3, repetitions: '15', reposSec: 45, consignes: 'Serre les fessiers en haut du mouvement.' },
      { nomEx: 'Étirements dynamiques', groupeMusculaire: 'Mobilité', series: 1, repetitions: '5 min', reposSec: 0, consignes: 'Prépare les articulations, mouvements contrôlés.' },
    ],
  },
]

const MEAL_ROTATION = [
  {
    petit_dejeuner: { nom: 'Œufs, flocons d\'avoine & banane', tempsPrepMin: 10, calories: 430, proteinesG: 24, glucidesG: 52, lipidesG: 13,
      ingredients: [{ nom: 'Œufs', quantite: 2, unite: 'piece', categorie: 'proteines' }, { nom: 'Flocons d\'avoine', quantite: 50, unite: 'g', categorie: 'feculents' }, { nom: 'Lait demi-écrémé', quantite: 150, unite: 'ml', categorie: 'produits_laitiers' }, { nom: 'Banane', quantite: 1, unite: 'piece', categorie: 'fruits_legumes' }, { nom: 'Cannelle', quantite: 1, unite: 'cac', categorie: 'epicerie' }],
      preparation: ['Fais cuire les œufs à la poêle sans matière grasse ajoutée.', 'Fais chauffer le lait, ajoute les flocons d\'avoine, laisse cuire 4-5 min.', 'Ajoute la banane coupée et une pincée de cannelle.'] },
    dejeuner: { nom: 'Poulet, riz complet & haricots verts', tempsPrepMin: 25, calories: 560, proteinesG: 45, glucidesG: 55, lipidesG: 14,
      ingredients: [{ nom: 'Blanc de poulet', quantite: 150, unite: 'g', categorie: 'proteines' }, { nom: 'Riz complet', quantite: 70, unite: 'g', categorie: 'feculents' }, { nom: 'Haricots verts', quantite: 200, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Huile d\'olive', quantite: 1, unite: 'cas', categorie: 'epicerie' }, { nom: 'Ail', quantite: 1, unite: 'piece', categorie: 'fruits_legumes' }],
      preparation: ['Fais cuire le riz complet selon les instructions du paquet.', 'Assaisonne le poulet et cuis-le à la poêle 6-7 min de chaque côté.', 'Fais cuire les haricots verts à la vapeur 10 min.', 'Dresse le tout avec un filet d\'huile d\'olive.'] },
    diner: { nom: 'Œufs, lentilles & légumes rôtis', tempsPrepMin: 25, calories: 480, proteinesG: 28, glucidesG: 46, lipidesG: 16,
      ingredients: [{ nom: 'Œufs', quantite: 2, unite: 'piece', categorie: 'proteines' }, { nom: 'Lentilles vertes (cuites)', quantite: 150, unite: 'g', categorie: 'feculents' }, { nom: 'Courgette', quantite: 150, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Carotte', quantite: 100, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Huile d\'olive', quantite: 1, unite: 'cas', categorie: 'epicerie' }],
      preparation: ['Préchauffe le four à 200°C, coupe courgette et carotte en bâtonnets.', 'Enfourne les légumes avec un filet d\'huile d\'olive pendant 20 min.', 'Fais chauffer les lentilles et cuis les œufs au plat ou brouillés.', 'Dresse le tout ensemble.'] },
  },
  {
    petit_dejeuner: { nom: 'Yaourt grec, flocons & fruits', tempsPrepMin: 5, calories: 390, proteinesG: 22, glucidesG: 46, lipidesG: 11,
      ingredients: [{ nom: 'Yaourt grec', quantite: 150, unite: 'g', categorie: 'produits_laitiers' }, { nom: 'Flocons d\'avoine', quantite: 40, unite: 'g', categorie: 'feculents' }, { nom: 'Pomme', quantite: 1, unite: 'piece', categorie: 'fruits_legumes' }, { nom: 'Miel', quantite: 1, unite: 'cac', categorie: 'epicerie' }],
      preparation: ['Mélange le yaourt et les flocons d\'avoine.', 'Ajoute la pomme coupée en dés et un filet de miel.'] },
    dejeuner: { nom: 'Dinde, quinoa & brocoli', tempsPrepMin: 25, calories: 540, proteinesG: 44, glucidesG: 50, lipidesG: 13,
      ingredients: [{ nom: 'Escalope de dinde', quantite: 150, unite: 'g', categorie: 'proteines' }, { nom: 'Quinoa', quantite: 70, unite: 'g', categorie: 'feculents' }, { nom: 'Brocoli', quantite: 200, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Huile d\'olive', quantite: 1, unite: 'cas', categorie: 'epicerie' }],
      preparation: ['Fais cuire le quinoa selon les instructions du paquet.', 'Cuis la dinde à la poêle 6-8 min de chaque côté.', 'Fais cuire le brocoli à la vapeur 8 min.', 'Dresse le tout avec un filet d\'huile d\'olive.'] },
    diner: { nom: 'Omelette, pois chiches & épinards', tempsPrepMin: 20, calories: 460, proteinesG: 26, glucidesG: 40, lipidesG: 18,
      ingredients: [{ nom: 'Œufs', quantite: 3, unite: 'piece', categorie: 'proteines' }, { nom: 'Pois chiches (cuits)', quantite: 150, unite: 'g', categorie: 'feculents' }, { nom: 'Épinards frais', quantite: 100, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Huile d\'olive', quantite: 1, unite: 'cac', categorie: 'epicerie' }],
      preparation: ['Fais revenir les épinards à la poêle avec un peu d\'huile.', 'Ajoute les pois chiches, chauffe 3-4 min.', 'Ajoute les œufs battus, cuis en omelette.'] },
  },
  {
    petit_dejeuner: { nom: 'Pain complet, œuf & fromage blanc', tempsPrepMin: 8, calories: 410, proteinesG: 23, glucidesG: 48, lipidesG: 12,
      ingredients: [{ nom: 'Pain complet', quantite: 2, unite: 'piece', categorie: 'feculents' }, { nom: 'Œufs', quantite: 1, unite: 'piece', categorie: 'proteines' }, { nom: 'Fromage blanc', quantite: 100, unite: 'g', categorie: 'produits_laitiers' }, { nom: 'Fruits rouges', quantite: 60, unite: 'g', categorie: 'fruits_legumes' }],
      preparation: ['Fais cuire l\'œuf à la coque ou au plat.', 'Toaste le pain complet.', 'Sers avec le fromage blanc et les fruits rouges.'] },
    dejeuner: { nom: 'Thon, riz complet & poivrons', tempsPrepMin: 20, calories: 520, proteinesG: 40, glucidesG: 52, lipidesG: 15,
      ingredients: [{ nom: 'Thon au naturel', quantite: 150, unite: 'g', categorie: 'proteines' }, { nom: 'Riz complet', quantite: 70, unite: 'g', categorie: 'feculents' }, { nom: 'Poivrons', quantite: 150, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Huile d\'olive', quantite: 1, unite: 'cas', categorie: 'epicerie' }],
      preparation: ['Fais cuire le riz complet.', 'Fais revenir les poivrons émincés 8 min à la poêle.', 'Ajoute le thon égoutté, mélange, assaisonne.'] },
    diner: { nom: 'Soupe de légumes & œufs mollets', tempsPrepMin: 25, calories: 400, proteinesG: 22, glucidesG: 38, lipidesG: 14,
      ingredients: [{ nom: 'Carotte', quantite: 150, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Poireau', quantite: 150, unite: 'g', categorie: 'fruits_legumes' }, { nom: 'Pomme de terre', quantite: 150, unite: 'g', categorie: 'feculents' }, { nom: 'Œufs', quantite: 2, unite: 'piece', categorie: 'proteines' }],
      preparation: ['Fais cuire les légumes 20 min à l\'eau, mixe en soupe.', 'Fais cuire les œufs mollets 6 min à l\'eau bouillante.', 'Sers la soupe avec les œufs coupés en deux.'] },
  },
]

function mealId(dayIndex, type) {
  return `meal-d${dayIndex}-${type}`
}

function buildMeal(dayIndex, type, template, statusIfPast) {
  return {
    id: mealId(dayIndex, type),
    type,
    nom: template.nom,
    tempsPrepMin: template.tempsPrepMin,
    calories: template.calories,
    proteinesG: template.proteinesG,
    glucidesG: template.glucidesG,
    lipidesG: template.lipidesG,
    ingredients: template.ingredients,
    preparation: template.preparation,
    status: statusIfPast,
  }
}

// Jour du programme généré correspondant à un jour de la semaine : le programme généré décrit
// une semaine type, dayIndex 0 = lundi … 6 = dimanche (cf JSON_SHAPE_INSTRUCTIONS).
function generatedDayFor(weekday) {
  const days = config.program?.days ?? []
  const index = (weekday + 6) % 7
  return days.find((d) => d.dayIndex === index) ?? days[index % days.length] ?? null
}

// Choix proposés pour un créneau : les 3 rotations du profil démo, ou les repas distincts de ce
// type dans la semaine générée. Un jour donné propose donc plusieurs vraies options complètes,
// sélectionnables directement sans passer par "je n'aime pas".
export function getMealOptionsFor(type) {
  if (usesGeneratedProgram()) {
    const seen = new Set()
    const options = []
    for (const day of config.program.days) {
      for (const meal of day.meals ?? []) {
        if (meal.type !== type || seen.has(meal.nom)) continue
        seen.add(meal.nom)
        options.push(meal)
      }
    }
    return options.map((meal, i) => ({ optionIndex: i, ...meal }))
  }
  return MEAL_ROTATION.map((set, i) => ({ optionIndex: i, ...set[type] }))
}

function workoutId(dayIndex) {
  return `workout-d${dayIndex}`
}

function buildWorkout(dayIndex, template, statusIfPast) {
  return {
    id: workoutId(dayIndex),
    nom: template.nom,
    dureeMin: template.dureeMin,
    difficulte: template.difficulte,
    objectif: template.objectif,
    status: statusIfPast,
    exercises: template.exercises.map((ex, i) => ({
      id: `${workoutId(dayIndex)}-ex${i + 1}`,
      ordre: i + 1,
      nom: ex.nomEx ?? ex.nom,
      groupeMusculaire: ex.groupeMusculaire,
      series: ex.series,
      repetitions: ex.repetitions,
      poidsKg: ex.poidsKg ?? null,
      reposSec: ex.reposSec ?? 60,
      consignes: ex.consignes ?? '',
      status: statusIfPast,
    })),
  }
}

export const DEFAULT_SCHEDULE = {
  heureReveil: '07:00',
  heureCoucher: '23:00',
  heureEntrainement: '18:30',
  joursDisponibles: [1, 2, 4], // lundi/mardi/jeudi — repli si l'onboarding n'a pas encore été fait
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60)
  const hh = Math.floor(total / 60).toString().padStart(2, '0')
  const mm = (total % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

// Construit le jour complet (structure + timeline) pour un dayIndex donné. `defaultStatus`
// détermine le statut initial des items ('termine' pour les jours strictement passés lors de
// la toute première génération, 'a_faire' sinon) — les statuts réels sont ensuite écrasés par
// programState.js à partir de ce qui est persisté en localStorage. `schedule` vient des
// réponses réelles de l'onboarding (heure d'entraînement, coucher/réveil, jours dispo) —
// repli sur DEFAULT_SCHEDULE si l'utilisateur n'a pas (encore) rempli le questionnaire.
// `mealSelections` = { petit_dejeuner?: optionIndex, dejeuner?: optionIndex, diner?: optionIndex }
// — choix explicite de l'utilisateur pour ce jour ; sinon repli sur la rotation par défaut.
const MEAL_SLOTS = {
  petit_dejeuner: { icon: '🥣', title: 'Petit-déjeuner', itemId: 'breakfast' },
  dejeuner: { icon: '🥗', title: 'Déjeuner', itemId: 'lunch' },
  collation: { icon: '🍎', title: 'Collation', itemId: 'snack' },
  diner: { icon: '🍽️', title: 'Dîner', itemId: 'dinner' },
}

function mealTime(type, n, { heureReveil, heureCoucher }) {
  if (type === 'petit_dejeuner') return addMinutes(heureReveil, 20)
  if (type === 'dejeuner') return '12:30'
  if (type === 'diner') return addMinutes(heureCoucher, -180)
  return addMinutes('10:30', n * 330) // collations : 10:30, puis 16:00
}

export function buildDay(dayIndex, defaultStatus = 'a_faire', schedule = DEFAULT_SCHEDULE, mealSelections = {}) {
  const { heureReveil, heureCoucher, heureEntrainement, joursDisponibles } = { ...DEFAULT_SCHEDULE, ...schedule }
  // joursDisponibles (onboarding) : 1=lundi..7=dimanche → converti vers 0=dimanche..6=samedi (Date.getDay()).
  const workoutWeekdays = new Set((joursDisponibles?.length ? joursDisponibles : DEFAULT_SCHEDULE.joursDisponibles).map((d) => d % 7))

  const weekday = weekdayForDay(dayIndex)
  const generated = usesGeneratedProgram() ? generatedDayFor(weekday) : null
  // Handball : propre au profil démo (club mercredi/vendredi, match le dimanche).
  const isDemo = !usesGeneratedProgram()
  const isMatchDay = isDemo && weekday === HANDBALL_MATCH_WEEKDAY
  const isHandballEvening = isDemo && (weekday === 3 || weekday === 5)

  // Repas : ceux de la semaine générée, sinon la rotation du profil démo. Un choix explicite de
  // l'utilisateur pour ce créneau (mealSelections) prime.
  let mealTemplates
  if (generated) {
    mealTemplates = (generated.meals ?? []).map((m) => ({ type: m.type, template: m }))
  } else {
    const defaultRotation = MEAL_ROTATION[dayIndex % MEAL_ROTATION.length]
    mealTemplates = ['petit_dejeuner', 'dejeuner', 'diner'].map((type) => ({ type, template: defaultRotation[type] }))
  }
  const counts = {}
  const meals = mealTemplates.map(({ type, template }) => {
    counts[type] = (counts[type] ?? 0) + 1
    const slotType = counts[type] > 1 ? `${type}-${counts[type]}` : type
    const options = getMealOptionsFor(type)
    const chosen = mealSelections[type]
    const picked = counts[type] === 1 && Number.isInteger(chosen) && options[chosen] ? options[chosen] : template
    return { ...buildMeal(dayIndex, slotType, picked, defaultStatus), type, slot: counts[type] - 1 }
  })

  const workoutTemplate = generated
    ? generated.workouts?.[0] ?? null
    : workoutWeekdays.has(weekday) ? WORKOUT_TEMPLATES[dayIndex % WORKOUT_TEMPLATES.length] : null
  const workout = workoutTemplate ? buildWorkout(dayIndex, workoutTemplate, defaultStatus) : null
  const hasWorkout = Boolean(workout)

  const items = [
    { id: 'wake', time: heureReveil, icon: '🌅', title: 'Réveil', subtitle: '300 ml d\'eau', type: 'habit', status: defaultStatus },
    { id: 'hydration-1', time: addMinutes(heureReveil, 180), icon: '💧', title: 'Hydratation', subtitle: '500 ml', type: 'hydration', status: defaultStatus },
    { id: 'hydration-2', time: '15:30', icon: '💧', title: 'Hydratation', subtitle: '500 ml', type: 'hydration', status: defaultStatus },
  ]
  for (const meal of meals) {
    const slot = MEAL_SLOTS[meal.type] ?? MEAL_SLOTS.collation
    items.push({
      id: meal.slot ? `${slot.itemId}-${meal.slot + 1}` : slot.itemId,
      time: mealTime(meal.type, meal.slot, { heureReveil, heureCoucher }),
      icon: slot.icon, title: slot.title, subtitle: meal.nom, type: 'meal', refId: meal.id, status: defaultStatus,
    })
  }

  if (hasWorkout) {
    items.push({ id: 'workout', time: heureEntrainement, icon: '🏋️', title: 'Séance', subtitle: `${workout.nom} — ${workout.dureeMin} min`, type: 'workout', refId: workout.id, status: defaultStatus })
  } else if (isHandballEvening) {
    items.push({ id: 'handball', time: heureEntrainement, icon: '🤾', title: 'Entraînement handball', subtitle: 'Séance club', type: 'habit', status: defaultStatus })
  } else if (isMatchDay) {
    items.push({ id: 'match', time: '15:00', icon: '🏆', title: 'Match handball', subtitle: 'Match du week-end', type: 'habit', status: defaultStatus })
  }

  items.push({ id: 'routine', time: addMinutes(heureCoucher, -90), icon: '🌙', title: 'Routine sommeil', subtitle: 'Écrans coupés', type: 'habit', status: defaultStatus })
  items.push({ id: 'sleep', time: heureCoucher, icon: '😴', title: 'Coucher', subtitle: '', type: 'sleep', status: defaultStatus })

  // Timeline triée chronologiquement — nécessaire car les horaires viennent maintenant de
  // préférences utilisateur variables (heure de coucher/réveil/entraînement) et non plus
  // d'horaires fixes déjà dans l'ordre.
  items.sort((a, b) => a.time.localeCompare(b.time))

  return {
    dayIndex,
    iso: isoForDay(dayIndex),
    weekday,
    dateLabel: DAY_LABELS[weekday],
    items,
    meals,
    workout,
    hasWorkout,
  }
}

export function weekLabelFor(dayIndex) {
  const startOfWeek = dayIndex - weekdayForDay(dayIndex) + 1 // lundi de la semaine contenant dayIndex (approx, suffisant pour l'affichage)
  const monday = Math.max(0, startOfWeek)
  const sunday = Math.min(getTotalDays() - 1, monday + 6)
  const fmt = (iso) => {
    const [, m, day] = iso.split('-')
    return `${parseInt(day, 10)}/${m}`
  }
  return `Semaine du ${fmt(isoForDay(monday))} au ${fmt(isoForDay(sunday))}`
}
