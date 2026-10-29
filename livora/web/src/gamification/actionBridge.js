// Pont entre les actions "métier" existantes (item de timeline, exercice, ingrédient...) et
// le système XP — centralise la correspondance type d'action → source XP pour ne pas la
// dupliquer dans chaque vue (TodayView, AgendaView, WorkoutDetailView, ...).
import { XP_REWARDS } from './catalog.js'
import { isoForDay } from '@/mock/programEngine.js'
import { getCurrentDayIndex } from '@/mock/programState.js'

const ITEM_TYPE_TO_XP_SOURCE = {
  meal: 'meal_completed',
  habit: 'habit_completed',
  workout: null, // les séances gagnent leur XP exercice par exercice, pas au niveau de l'item timeline
  hydration: null, // l'hydratation gagne son XP via addHydration (objectif atteint), pas au clic "terminé"
  sleep: null,
}

// Objectifs de quête alimentés par un item précis de la timeline (en plus de meals / habits).
const ITEM_QUEST_OBJECTIVES = {
  routine: ['evening_routine_days'],
  sleep: ['sleep_days'],
}

// Clé "une fois par élément et par jour" : la même action ne rapporte qu'une fois.
export function onceKeyFor(source, entityId) {
  return `${source}:${entityId}:${isoForDay(getCurrentDayIndex())}`
}

// Appelé quand un item de timeline (Dashboard ou Agenda) change de statut. "termine" accorde
// l'XP une seule fois ; revenir à "à faire" la retire (le jour même).
export function awardXpForTimelineItem(store, item, newStatus) {
  const source = ITEM_TYPE_TO_XP_SOURCE[item.type]
  const questKeys = [
    ...(item.type === 'habit' ? ['habits'] : []),
    ...(item.type === 'meal' ? ['meals'] : []),
    ...(ITEM_QUEST_OBJECTIVES[item.id] ?? []),
  ]
  const key = onceKeyFor(source ?? item.type, item.id)

  if (newStatus === 'termine') {
    let first = true
    if (source && XP_REWARDS[source]) {
      const result = store.awardXp(source, XP_REWARDS[source].amount, { relatedEntityId: item.id, onceKey: key })
      first = !result.duplicate
    }
    if (first) for (const k of questKeys) store.progressQuestObjective(k)
  } else if (source && store.revokeXp(key)) {
    for (const k of questKeys) store.progressQuestObjective(k, -1)
  }
}
