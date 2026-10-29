<template>
  <div class="page">
    <header class="page-header">
      <h1>Sport</h1>
    </header>

    <section v-if="nextUnlock" class="unlock-banner card">
      <span class="unlock-icon">{{ nextUnlock.icon }}</span>
      <div class="unlock-text">
        <p class="unlock-title">Nouvel exercice disponible</p>
        <p class="unlock-name">{{ nextUnlock.nom }}</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="confirmUnlock">Débloquer</button>
    </section>

    <section v-if="todayWorkout" class="block">
      <h3 class="block-title">Séance du jour</h3>
      <button class="workout-card card" @click="router.push(`/sport/seance/${todayWorkout.id}`)">
        <div class="workout-info">
          <h2 class="workout-name">{{ todayWorkout.nom }}</h2>
          <div class="workout-meta">
            <span class="pill pill-neutral">{{ todayWorkout.dureeMin }} min</span>
            <span class="pill pill-neutral">{{ difficultyLabel(todayWorkout.difficulte) }}</span>
            <span class="pill pill-neutral">{{ goalLabel(todayWorkout.objectif) }}</span>
          </div>
        </div>
        <span class="workout-arrow">→</span>
      </button>
    </section>

    <section class="block">
      <h3 class="block-title">Cette semaine</h3>
      <ul class="week-list">
        <li v-for="day in week" :key="day.iso" class="week-row">
          <span class="week-day">{{ day.label }}</span>
          <span v-if="day.workoutCount" class="pill pill-ok">🏋️ Séance</span>
          <span v-else class="pill pill-neutral">Repos</span>
        </li>
      </ul>
    </section>

    <section class="block">
      <h3 class="block-title">Progression</h3>
      <div class="stats-row">
        <div class="stat-card card">
          <span class="stat-value tabular">{{ progress?.seancesRealisees.faites ?? 0 }}/{{ progress?.seancesRealisees.prevues ?? 0 }}</span>
          <span class="stat-label">séances réalisées ce mois</span>
        </div>
      </div>
      <RouterLink to="/progression" class="btn-text">Voir toute la progression →</RouterLink>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchWeek, fetchToday, fetchWorkout, fetchProgress, fetchProfile } from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { evaluateNextExerciseUnlock } from '@/gamification/exerciseUnlocks.js'

const router = useRouter()
const gamification = useGamificationStore()
const week = ref([])
const todayWorkout = ref(null)
const progress = ref(null)

// Niveau sportif déclaré à l'onboarding (profil démo : débutant). Le déblocage d'exercices ne
// dépend jamais du niveau de JEU seul (section 7) : il faut ce niveau sportif + assez de séances faites.
const niveauSport = ref('debutant')

const nextUnlock = computed(() => evaluateNextExerciseUnlock({
  niveauSport: niveauSport.value,
  workoutsCompletedTotal: progress.value?.seancesRealisees.faites ?? 0,
  alreadyUnlocked: gamification.unlockedExercises,
}))

function confirmUnlock() {
  if (nextUnlock.value) gamification.unlockExercise(nextUnlock.value.key)
}

const DIFFICULTY_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }
const GOAL_LABELS = { force: 'Force', hypertrophie: 'Hypertrophie', cardio: 'Cardio', mobilite: 'Mobilité' }
function difficultyLabel(v) { return DIFFICULTY_LABELS[v] ?? v }
function goalLabel(v) { return GOAL_LABELS[v] ?? v }

onMounted(async () => {
  const today = await fetchToday()
  let profil
  ;[week.value, progress.value, profil] = await Promise.all([fetchWeek(), fetchProgress(), fetchProfile()])
  niveauSport.value = profil.niveauSport
  try {
    todayWorkout.value = today.workout ? await fetchWorkout(today.workout.id) : null
  } catch {
    todayWorkout.value = null
  }
})
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.block { margin-bottom: var(--space-lg); }
.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }

.unlock-banner {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
  background: var(--color-accent-soft);
  border-color: transparent;
}
.unlock-icon { font-size: 1.8rem; }
.unlock-text { flex: 1; }
.unlock-title { font-size: var(--text-xs); color: var(--color-accent-ink); font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
.unlock-name { font-size: var(--text-sm); font-weight: 600; color: var(--color-ink); }
.btn-sm { padding: 8px 14px; font-size: var(--text-xs); white-space: nowrap; }

.workout-card {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-lg);
  cursor: pointer;
  text-align: left;
  transition: transform var(--transition-fast);
}
.workout-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.workout-name { font-size: var(--text-xl); margin-bottom: 8px; }
.workout-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.workout-arrow { font-size: 1.3rem; color: var(--color-ink-faint); }

.week-list { display: flex; flex-direction: column; gap: 6px; }
.week-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px var(--space-sm);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
}
.week-day { font-weight: 600; color: var(--color-ink); font-size: var(--text-sm); }

.stats-row { display: flex; gap: var(--space-sm); margin-bottom: var(--space-sm); }
.stat-card { flex: 1; padding: var(--space-md); display: flex; flex-direction: column; gap: 3px; }
.stat-value { font-size: var(--text-xl); font-weight: 700; }
.stat-label { font-size: var(--text-xs); color: var(--color-ink-faint); }
</style>
