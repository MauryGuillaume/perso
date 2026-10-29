<template>
  <div class="page">
    <RouterLink to="/aujourd-hui" class="back-link">← Aujourd'hui</RouterLink>
    <header class="page-header"><h1>💧 Hydratation</h1></header>

    <div class="gauge-card card">
      <svg class="gauge" viewBox="0 0 100 100">
        <circle class="gauge-track" cx="50" cy="50" r="44" />
        <circle class="gauge-fill" cx="50" cy="50" r="44" :stroke-dasharray="circumference" :stroke-dashoffset="offset" />
      </svg>
      <div class="gauge-center">
        <span class="gauge-value tabular">{{ (hydration.currentMl / 1000).toFixed(1) }} L</span>
        <span class="gauge-goal tabular">/ {{ (hydration.goalMl / 1000).toFixed(1) }} L objectif</span>
      </div>
    </div>

    <div class="quick-add">
      <button v-for="amt in [250, 500, 750]" :key="amt" class="btn btn-ghost" @click="add(amt)">+{{ amt }} ml</button>
      <button class="btn btn-ghost" @click="showCustom = !showCustom">Personnalisé</button>
    </div>

    <div v-if="showCustom" class="custom-row">
      <input v-model.number="customAmount" type="number" min="0" step="50" placeholder="ml" class="custom-input" />
      <button class="btn btn-primary" @click="addCustom">Ajouter</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchHydration, addHydration } from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { XP_REWARDS } from '@/gamification/catalog.js'
import { onceKeyFor } from '@/gamification/actionBridge.js'

const gamification = useGamificationStore()
const hydration = ref({ currentMl: 0, goalMl: 1 })
const showCustom = ref(false)
const customAmount = ref(250)

onMounted(async () => { hydration.value = await fetchHydration() })

const circumference = 2 * Math.PI * 44
const offset = computed(() => {
  const pct = Math.min(1, hydration.value.currentMl / hydration.value.goalMl)
  return circumference * (1 - pct)
})

async function add(amount) {
  const wasGoalReached = hydration.value.currentMl >= hydration.value.goalMl
  hydration.value = await addHydration(amount)
  const isGoalReachedNow = hydration.value.currentMl >= hydration.value.goalMl
  if (isGoalReachedNow && !wasGoalReached) {
    const result = gamification.awardXp('hydration_goal', XP_REWARDS.hydration_goal.amount, { onceKey: onceKeyFor('hydration_goal', 'jour') })
    if (!result.duplicate) {
      gamification.progressQuestObjective('hydration')
      gamification.progressQuestObjective('hydration_days')
    }
  }
}
async function addCustom() {
  if (customAmount.value > 0) { await add(customAmount.value); showCustom.value = false }
}
</script>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.gauge-card { position: relative; width: 220px; height: 220px; margin: 0 auto var(--space-lg); display: flex; align-items: center; justify-content: center; }
.gauge { width: 100%; height: 100%; transform: rotate(-90deg); }
.gauge-track { fill: none; stroke: var(--color-surface-sunken); stroke-width: 9; }
.gauge-fill { fill: none; stroke: var(--color-accent); stroke-width: 9; stroke-linecap: round; transition: stroke-dashoffset 500ms ease; }
.gauge-center { position: absolute; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.gauge-value { font-size: var(--text-2xl); font-weight: 700; }
.gauge-goal { font-size: var(--text-sm); color: var(--color-ink-faint); }

.quick-add { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.custom-row { display: flex; gap: 8px; margin-top: var(--space-md); justify-content: center; }
.custom-input {
  width: 100px; padding: 10px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-ink);
  text-align: center;
}
</style>
