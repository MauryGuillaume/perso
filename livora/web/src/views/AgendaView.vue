<template>
  <div class="page">
    <header class="page-header">
      <h1>Agenda</h1>
      <div class="view-toggle">
        <button class="toggle-btn" :class="{ active: mode === 'jour' }" @click="mode = 'jour'">Jour</button>
        <button class="toggle-btn" :class="{ active: mode === 'semaine' }" @click="mode = 'semaine'">Semaine</button>
      </div>
    </header>

    <template v-if="mode === 'jour'">
      <div class="card timeline-card">
        <TimelineItem
          v-for="item in today?.items ?? []"
          :key="item.id"
          :item="item"
          @open="openItem"
          @status="onStatus"
        />
      </div>
    </template>

    <template v-else>
      <div class="week-strip">
        <button
          v-for="day in week"
          :key="day.iso"
          class="day-card"
          :class="{ today: day.isToday }"
        >
          <span class="day-label">{{ day.label }}</span>
          <div class="day-dots">
            <span v-if="day.workoutCount" class="day-dot workout" title="Séance">🏋️</span>
            <span v-if="day.mealCount" class="day-dot meal tabular">{{ day.mealCount }} repas</span>
          </div>
        </button>
      </div>
      <p class="week-hint">Sélectionne "Jour" pour voir le détail heure par heure d'une journée.</p>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TimelineItem from '@/components/TimelineItem.vue'
import { fetchToday, fetchWeek, markItemStatus } from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { awardXpForTimelineItem } from '@/gamification/actionBridge.js'

const router = useRouter()
const gamification = useGamificationStore()
const mode = ref('jour')
const today = ref(null)
const week = ref([])

onMounted(async () => {
  ;[today.value, week.value] = await Promise.all([fetchToday(), fetchWeek()])
})

function openItem(item) {
  if (item.type === 'workout' && item.refId) router.push(`/sport/seance/${item.refId}`)
  else if (item.type === 'meal' && item.refId) router.push(`/nutrition/repas/${item.refId}`)
  else if (item.type === 'hydration') router.push('/hydratation')
  else if (item.type === 'sleep') router.push('/sommeil')
}

async function onStatus(itemId, status) {
  const item = today.value.items.find((i) => i.id === itemId)
  if (item) {
    item.status = status
    awardXpForTimelineItem(gamification, item, status)
  }
  await markItemStatus(itemId, status)
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.view-toggle { display: flex; background: var(--color-surface-sunken); border: 2px solid var(--color-ink); border-radius: var(--radius-md); padding: 3px; }
.toggle-btn {
  padding: 7px 16px;
  border: none; background: transparent;
  border-radius: var(--radius-sm);
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.02em; text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--color-ink-soft);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--transition-bounce), color var(--transition-fast), transform var(--transition-bounce), box-shadow var(--transition-fast);
}
.toggle-btn:active { transform: scale(0.94); }
.toggle-btn.active { background: var(--color-surface); color: var(--color-ink); box-shadow: var(--shadow-sm); }

.timeline-card { padding: var(--space-sm); }

.week-strip { display: flex; flex-direction: column; gap: 8px; }
.day-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
}
.day-card.today { border-color: var(--color-accent); background: var(--color-accent-soft); }
.day-label { font-weight: 600; color: var(--color-ink); }
.day-dots { display: flex; align-items: center; gap: 10px; font-size: var(--text-sm); color: var(--color-ink-soft); }
.week-hint { margin-top: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); text-align: center; }
</style>
