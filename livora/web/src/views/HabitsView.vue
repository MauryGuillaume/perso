<template>
  <div class="page">
    <RouterLink to="/aujourd-hui" class="back-link">← Aujourd'hui</RouterLink>
    <header class="page-header">
      <h1>Habitudes</h1>
      <p class="progress-line">{{ done }}/{{ habits.length }} aujourd'hui</p>
      <div class="progress-track"><div class="progress-fill" :style="{ width: pct + '%' }"></div></div>
    </header>

    <ul class="habit-list">
      <li v-for="h in habits" :key="h.id" class="habit-row card" @click="toggle(h)">
        <span class="habit-icon" aria-hidden="true">{{ h.icone }}</span>
        <span class="habit-label" :class="{ done: h.status === 'termine' }">{{ h.libelle }}</span>
        <StatusToggle :status="h.status" :label="h.libelle" @update="() => toggle(h)" @click.stop />
      </li>
    </ul>

    <p class="encouragement">La régularité compte plus que la perfection — un jour manqué ne remet rien en cause.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import StatusToggle from '@/components/StatusToggle.vue'
import { fetchHabits, toggleHabit } from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { XP_REWARDS } from '@/gamification/catalog.js'
import { onceKeyFor } from '@/gamification/actionBridge.js'

const gamification = useGamificationStore()
const habits = ref([])
onMounted(async () => { habits.value = await fetchHabits() })

const done = computed(() => habits.value.filter((h) => h.status === 'termine').length)
const pct = computed(() => habits.value.length ? Math.round((done.value / habits.value.length) * 100) : 0)

async function toggle(h) {
  const wasTermine = h.status === 'termine'
  h.status = wasTermine ? 'a_faire' : 'termine'
  await toggleHabit(h.id)
  const key = onceKeyFor('habit_completed', h.itemId ?? h.id)
  if (!wasTermine) {
    const result = gamification.awardXp('habit_completed', XP_REWARDS.habit_completed.amount, { relatedEntityId: h.id, onceKey: key })
    if (!result.duplicate) gamification.progressQuestObjective('habits')
  } else if (gamification.revokeXp(key)) {
    gamification.progressQuestObjective('habits', -1)
  }
}
</script>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); margin-bottom: var(--space-sm); }
.progress-line { color: var(--color-ink-soft); font-size: var(--text-sm); margin-bottom: 8px; }
.progress-track { height: 7px; border-radius: var(--radius-pill); background: var(--color-surface-sunken); overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-accent); transition: width 400ms ease; }

.habit-list { display: flex; flex-direction: column; gap: 8px; }
.habit-row {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-md);
  cursor: pointer;
}
.habit-icon { font-size: 1.3rem; }
.habit-label { flex: 1; font-weight: 500; color: var(--color-ink); }
.habit-label.done { color: var(--color-ink-faint); text-decoration: line-through; }

.encouragement { margin-top: var(--space-lg); text-align: center; color: var(--color-ink-faint); font-size: var(--text-sm); line-height: 1.5; }
</style>
