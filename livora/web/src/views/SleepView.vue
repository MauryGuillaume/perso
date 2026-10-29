<template>
  <div class="page" v-if="sleep">
    <RouterLink to="/aujourd-hui" class="back-link">← Aujourd'hui</RouterLink>
    <header class="page-header"><h1>🌙 Sommeil</h1></header>

    <div class="summary-card card">
      <template v-if="!editing">
        <div class="summary-row">
          <div class="summary-item">
            <span class="label-eyebrow">Coucher</span>
            <span class="summary-value">{{ sleep.heureCoucher }}</span>
          </div>
          <span class="summary-arrow">→</span>
          <div class="summary-item">
            <span class="label-eyebrow">Réveil</span>
            <span class="summary-value">{{ sleep.heureReveil }}</span>
          </div>
        </div>
        <div class="duration-row">
          <span class="duration-value tabular">{{ sleep.dureeReelleH }} h</span>
          <span class="duration-label">cette nuit · objectif {{ sleep.dureeCibleH }} h</span>
        </div>
        <button class="btn btn-ghost btn-sm edit-btn" type="button" @click="startEdit">Modifier les horaires</button>
      </template>
      <template v-else>
        <div class="edit-row">
          <label class="edit-field">
            <span class="label-eyebrow">Coucher (hier)</span>
            <input v-model="draftCoucher" type="time" class="time-input" />
          </label>
          <label class="edit-field">
            <span class="label-eyebrow">Réveil</span>
            <input v-model="draftReveil" type="time" class="time-input" />
          </label>
        </div>
        <div class="edit-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="editing = false">Annuler</button>
          <button class="btn btn-primary btn-sm" type="button" @click="saveEdit">Enregistrer</button>
        </div>
      </template>
    </div>

    <section class="block">
      <h3 class="block-title">Tendance sur 7 jours</h3>
      <div class="chart card">
        <div v-for="(h, i) in sleep.tendance7j" :key="i" class="bar-col">
          <div class="bar" :style="{ height: (h / maxH) * 100 + '%' }"></div>
          <span class="bar-label tabular">{{ h }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onceKeyFor } from '@/gamification/actionBridge.js'
import { ref, computed, onMounted } from 'vue'
import { fetchSleep, updateSleep } from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'

const gamification = useGamificationStore()
const sleep = ref(null)
const editing = ref(false)
const draftCoucher = ref('')
const draftReveil = ref('')

onMounted(async () => { sleep.value = await fetchSleep() })
const maxH = computed(() => Math.max(...(sleep.value?.tendance7j ?? [8]), 8))

function startEdit() {
  draftCoucher.value = sleep.value.heureCoucher
  draftReveil.value = sleep.value.heureReveil
  editing.value = true
}

async function saveEdit() {
  const wasRoutineDone = sleep.value.dureeReelleH >= sleep.value.dureeCibleH
  sleep.value = await updateSleep({ heureCoucher: draftCoucher.value, heureReveil: draftReveil.value })
  editing.value = false
  if (!wasRoutineDone && sleep.value.dureeReelleH >= sleep.value.dureeCibleH) {
    gamification.awardXp('habit_completed', 30, { relatedEntityId: 'sleep_goal', onceKey: onceKeyFor('sleep_goal', 'nuit') })
  }
}
</script>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.summary-card { padding: var(--space-lg); margin-bottom: var(--space-lg); }
.summary-row { display: flex; align-items: center; justify-content: center; gap: var(--space-lg); margin-bottom: var(--space-md); }
.summary-item { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.summary-value { font-size: var(--text-xl); font-weight: 700; }
.summary-arrow { color: var(--color-ink-faint); }
.duration-row { text-align: center; padding-top: var(--space-md); border-top: 1px solid var(--color-border); }
.duration-value { font-size: var(--text-2xl); font-weight: 700; color: var(--color-accent-ink); }
.duration-label { display: block; font-size: var(--text-xs); color: var(--color-ink-faint); margin-top: 3px; }
.edit-btn { display: block; margin: var(--space-md) auto 0; }

.edit-row { display: flex; justify-content: center; gap: var(--space-lg); }
.edit-field { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.time-input {
  padding: 10px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-ink);
  font-size: var(--text-base); font-family: inherit; text-align: center;
}
.edit-actions { display: flex; justify-content: center; gap: 8px; margin-top: var(--space-md); }

.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }
.chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; padding: var(--space-md); height: 160px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
.bar { width: 100%; max-width: 24px; background: var(--color-accent); border-radius: 6px 6px 0 0; min-height: 4px; transition: height 500ms ease; }
.bar-label { font-size: var(--text-xs); color: var(--color-ink-faint); }
</style>
