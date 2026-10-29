<template>
  <div class="page" v-if="workout">
    <RouterLink to="/sport" class="back-link">← Sport</RouterLink>

    <header class="page-header">
      <h1>{{ workout.nom }}</h1>
      <div class="meta-row">
        <span class="pill pill-neutral">{{ workout.dureeMin }} min</span>
        <span class="pill pill-neutral">{{ difficultyLabel(workout.difficulte) }}</span>
        <span class="pill pill-neutral">{{ goalLabel(workout.objectif) }}</span>
        <span v-if="workout.express" class="pill pill-game">⚡ Express</span>
      </div>
      <button type="button" class="btn btn-ghost btn-sm express-toggle" :aria-pressed="Boolean(workout.express)" @click="toggleExpress">
        {{ workout.express ? 'Revenir à la séance complète' : '⚡ Pas le temps ? Version express 10 min' }}
      </button>
    </header>

    <div class="exercise-list">
      <div v-for="ex in workout.exercises" :key="ex.id" class="exercise-card card" :class="{ done: ex.status === 'termine' }">
        <div class="exercise-header">
          <button type="button" class="exercise-open" :aria-expanded="openId === ex.id" @click="toggleOpen(ex.id)">
            <span class="exercise-icon" aria-hidden="true">🏋️</span>
            <span class="exercise-info">
              <span class="exercise-name">{{ ex.nom }}</span>
              <span class="exercise-sets tabular">{{ ex.series }} × {{ ex.repetitions }}<span v-if="ex.poidsKg"> · {{ ex.poidsKg }} kg</span></span>
            </span>
          </button>
          <StatusToggle :status="ex.status" :label="ex.nom" @update="(s) => setExerciseStatus(ex, s)" />
        </div>

        <div v-if="openId === ex.id" class="exercise-detail">
          <p class="exercise-rest">Repos : <span class="tabular">{{ ex.reposSec }} sec</span></p>
          <p v-if="ex.consignes" class="exercise-consignes">{{ ex.consignes }}</p>

          <a class="demo-link" :href="demoUrl(ex.nom)" target="_blank" rel="noopener">▶ Voir comment faire « {{ ex.nom }} »</a>

          <form class="log-form" @submit.prevent="saveSet(ex)">
            <label class="log-field">Charge (kg)
              <input v-model.number="drafts[ex.id].poidsKg" type="number" min="0" step="0.5" inputmode="decimal" placeholder="0" />
            </label>
            <label class="log-field">Répétitions
              <input v-model.number="drafts[ex.id].reps" type="number" min="0" step="1" inputmode="numeric" :placeholder="ex.repetitions" />
            </label>
            <button type="submit" class="btn btn-ghost btn-sm">Noter</button>
          </form>
          <p v-if="histories[ex.nom]?.record" class="log-record">
            🏆 Record : <span class="tabular">{{ formatSet(histories[ex.nom].record) }}</span>
            <span v-if="histories[ex.nom].last && histories[ex.nom].last.date !== histories[ex.nom].record.date"> · dernière fois : <span class="tabular">{{ formatSet(histories[ex.nom].last) }}</span></span>
          </p>

          <RestTimer :seconds="ex.reposSec" class="exercise-timer" />

          <div class="exercise-actions">
            <button class="btn btn-ghost btn-sm" @click="openReplace(ex)">Remplacer l'exercice</button>
          </div>

          <div v-if="alternativesFor === ex.id" class="alternatives">
            <p v-if="loadingAlt" class="alt-loading">Recherche d'alternatives…</p>
            <p v-else-if="alternatives.length === 0" class="alt-empty">Aucune alternative disponible pour cet exercice.</p>
            <div v-else class="alt-list">
              <div v-for="(alt, i) in alternatives" :key="i" class="alt-card">
                <h3 class="alt-name">{{ alt.nom }}</h3>
                <p class="alt-sets tabular">{{ alt.series }} × {{ alt.repetitions }} · repos {{ alt.reposSec }}s</p>
                <p v-if="alt.consignes" class="alt-consignes">{{ alt.consignes }}</p>
                <button class="btn btn-primary btn-sm" @click="applyAlternative(ex, alt)">Utiliser cette alternative</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="page"><p>Chargement…</p></div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import StatusToggle from '@/components/StatusToggle.vue'
import RestTimer from '@/components/RestTimer.vue'
import {
  fetchWorkout, markExerciseStatus, fetchAlternativeExercises, setWorkoutExpress,
  saveExerciseSet, fetchExerciseHistory, fetchToday, fetchProgress,
} from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { XP_REWARDS } from '@/gamification/catalog.js'
import { onceKeyFor } from '@/gamification/actionBridge.js'

const gamification = useGamificationStore()
const route = useRoute()
const props = defineProps({ id: { type: String, required: true } })
const drafts = reactive({})
const histories = reactive({})

const workout = ref(null)
const openId = ref(null)
const alternativesFor = ref(null)
const alternatives = ref([])
const loadingAlt = ref(false)

const DIFFICULTY_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }
const GOAL_LABELS = { force: 'Force', hypertrophie: 'Hypertrophie', cardio: 'Cardio', mobilite: 'Mobilité' }
function difficultyLabel(v) { return DIFFICULTY_LABELS[v] ?? v }
function goalLabel(v) { return GOAL_LABELS[v] ?? v }

async function load() {
  workout.value = await fetchWorkout(props.id)
  if (route.query.express === '1' && !workout.value.express) workout.value = await setWorkoutExpress(props.id, true)
  for (const ex of workout.value.exercises) {
    drafts[ex.id] ??= { poidsKg: null, reps: null }
    histories[ex.nom] = await fetchExerciseHistory(ex.nom)
  }
}

async function toggleExpress() {
  workout.value = await setWorkoutExpress(props.id, !workout.value.express)
  for (const ex of workout.value.exercises) drafts[ex.id] ??= { poidsKg: null, reps: null }
}

function demoUrl(nom) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(nom + ' exercice technique')}`
}

function formatSet(s) {
  return [s.poidsKg ? `${s.poidsKg} kg` : null, s.reps ? `${s.reps} rép.` : null].filter(Boolean).join(' × ') || '—'
}

async function saveSet(ex) {
  const d = drafts[ex.id]
  if (!d.poidsKg && !d.reps) return
  const before = histories[ex.nom]?.record
  histories[ex.nom] = await saveExerciseSet(ex.nom, { poidsKg: d.poidsKg || null, reps: d.reps || null })
  const after = histories[ex.nom].record
  if (before && after && after.score > before.score) gamification.pushEvent({ type: 'record', exercice: ex.nom, valeur: formatSet(after) })
}
onMounted(load)
watch(() => props.id, load)

function toggleOpen(id) {
  openId.value = openId.value === id ? null : id
  alternativesFor.value = null
}

async function setExerciseStatus(ex, status) {
  const wasComplete = workout.value.exercises.every((e) => e.status === 'termine')
  ex.status = status
  await markExerciseStatus(ex.id, status)

  const isNowComplete = workout.value.exercises.every((e) => e.status === 'termine')
  if (isNowComplete && !wasComplete) {
    // La séance entière vient d'être terminée — c'est ici, pas exercice par exercice, que
    // l'XP "séance" (section 11) et le coffre associé sont accordés, une seule fois par séance.
    const result = gamification.awardXp('workout_completed', XP_REWARDS.workout_completed.amount, { relatedEntityId: workout.value.id, onceKey: `workout:${workout.value.id}` })
    if (result.duplicate) return
    gamification.progressQuestObjective('workouts')
    gamification.grantChest('quotidien', 'workout_completed')
    gamification.awardCompanionXp(80)
    await unlockWorkoutAchievements()
  }
}

async function unlockWorkoutAchievements() {
  const [today, progress] = await Promise.all([fetchToday(), fetchProgress()])
  const done = progress.seancesRealisees.faites
  if (done >= 1) gamification.unlockAchievementByKey('premiere_seance')
  if (done >= 5) gamification.unlockAchievementByKey('canape_deteste')
  if (workout.value.express) gamification.unlockAchievementByKey('lent_mais_present')
  if (['fatigue', 'bof'].includes(today.feeling)) gamification.unlockAchievementByKey('finalement_je_lai_fait')
}

async function openReplace(ex) {
  alternativesFor.value = ex.id
  loadingAlt.value = true
  alternatives.value = await fetchAlternativeExercises(ex.id)
  loadingAlt.value = false
}

function applyAlternative(ex, alt) {
  Object.assign(ex, { nom: alt.nom, series: alt.series, repetitions: alt.repetitions, reposSec: alt.reposSec, consignes: alt.consignes, groupeMusculaire: alt.groupeMusculaire })
  alternativesFor.value = null
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); margin-bottom: var(--space-sm); }
.meta-row { display: flex; gap: 6px; flex-wrap: wrap; }

.exercise-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.exercise-card { overflow: hidden; }
.exercise-card.done .exercise-name { color: var(--color-ink-faint); }

.exercise-header {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-md);
}
.exercise-open {
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: var(--space-sm);
  padding: 0; background: transparent; border: none; cursor: pointer; text-align: left; color: inherit; font: inherit;
}
.exercise-icon { font-size: 1.4rem; }
.exercise-info { flex: 1; min-width: 0; }
.exercise-name { display: block; font-size: var(--text-base); font-weight: 600; }
.exercise-sets { display: block; font-size: var(--text-sm); color: var(--color-ink-soft); margin-top: 2px; }

.exercise-detail { padding: 0 var(--space-md) var(--space-md); border-top: 1px solid var(--color-border); }
.exercise-rest { margin-top: var(--space-sm); font-size: var(--text-sm); color: var(--color-ink-soft); }
.exercise-consignes { margin-top: 6px; font-size: var(--text-sm); color: var(--color-ink); line-height: 1.5; }
.exercise-timer { margin: var(--space-md) auto 0; }
.exercise-actions { margin-top: var(--space-md); display: flex; justify-content: center; }
.btn-sm { padding: 8px 16px; font-size: var(--text-xs); }
.express-toggle { margin-top: var(--space-sm); }
.demo-link { display: inline-block; margin-top: var(--space-sm); font-size: var(--text-sm); font-weight: 600; color: var(--color-accent-ink); text-decoration: underline; }
.log-form { display: flex; align-items: flex-end; gap: 8px; margin-top: var(--space-md); flex-wrap: wrap; }
.log-field { display: flex; flex-direction: column; gap: 4px; font-size: var(--text-xs); font-weight: 700; color: var(--color-ink-soft); }
.log-field input { width: 96px; padding: 8px 10px; border: 2px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-ink); font-size: var(--text-sm); }
.log-record { margin-top: 6px; font-size: var(--text-sm); color: var(--color-ink-soft); }

.alternatives { margin-top: var(--space-md); }
.alt-loading, .alt-empty { color: var(--color-ink-faint); font-size: var(--text-sm); text-align: center; }
.alt-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.alt-card { background: var(--color-surface-sunken); border-radius: var(--radius-sm); padding: var(--space-sm) var(--space-md); }
.alt-name { font-size: var(--text-sm); font-weight: 600; margin-bottom: 3px; }
.alt-sets { font-size: var(--text-xs); color: var(--color-ink-soft); }
.alt-consignes { font-size: var(--text-xs); color: var(--color-ink-soft); margin-top: 4px; }
.alt-card .btn { margin-top: var(--space-sm); }
</style>
