<template>
  <div class="page" v-if="progress">
    <RouterLink to="/sport" class="back-link">← Sport</RouterLink>
    <header class="page-header"><h1>Progression</h1></header>

    <div class="stats-grid">
      <div class="stat-card card">
        <span class="stat-value tabular">{{ progress.seancesRealisees.faites }}/{{ progress.seancesRealisees.prevues }}</span>
        <span class="stat-label">Séances réalisées</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ Math.round(progress.habitudesTaux7j * 100) }}%</span>
        <span class="stat-label">Habitudes (7 j)</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ progress.hydratationMoy7j }} L</span>
        <span class="stat-label">Hydratation moy.</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ progress.sommeilMoy7j }} h</span>
        <span class="stat-label">Sommeil moyen</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ progress.activites7j }}</span>
        <span class="stat-label">Activités en plus (7 j)</span>
      </div>
    </div>

    <section class="block">
      <h3 class="block-title">Poids</h3>
      <div class="line-chart card">
        <form class="weight-form" @submit.prevent="saveWeight">
          <label for="poids-du-jour" class="weight-label">Ma pesée du jour</label>
          <input id="poids-du-jour" v-model.number="weightDraft" type="number" min="20" max="300" step="0.1" inputmode="decimal" placeholder="kg" class="weight-input" />
          <button type="submit" class="btn btn-primary btn-sm" :disabled="!(weightDraft > 0)">Enregistrer</button>
        </form>
        <template v-if="progress.poidsKg.length >= 2">
          <svg viewBox="0 0 300 130" class="line-svg" role="img" :aria-label="weightSummary">
            <line v-for="g in grid" :key="g.y" x1="34" :x2="300" :y1="g.y" :y2="g.y" class="grid-line" />
            <text v-for="g in grid" :key="'t' + g.y" x="0" :y="g.y + 4" class="axis-text">{{ g.label }}</text>
            <polyline :points="weightPoints.map((p) => `${p.x},${p.y}`).join(' ')" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-for="(p, i) in weightPoints" :key="i" :cx="p.x" :cy="p.y" r="3.5" fill="var(--color-accent)"><title>{{ p.label }}</title></circle>
          </svg>
          <p class="weight-delta" :class="{ down: weightDelta < 0 }">{{ weightSummary }}</p>
        </template>
        <p v-else class="empty-hint">Note ta pesée une fois par semaine, à la même heure : la courbe apparaîtra dès la 2e.</p>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">Mes records</h3>
      <ul v-if="progress.records.length" class="records card">
        <li v-for="r in progress.records" :key="r.nom" class="record-row">
          <span class="record-name">{{ r.nom }}</span>
          <span class="record-value tabular">{{ formatSet(r.record) }}</span>
        </li>
      </ul>
      <p v-else class="empty-hint">Note tes charges et répétitions pendant les séances pour suivre tes records.</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchProgress, logWeightEntry } from '@/services/programService.js'

const progress = ref(null)
const weightDraft = ref(null)
onMounted(async () => { progress.value = await fetchProgress() })

async function saveWeight() {
  progress.value.poidsKg = await logWeightEntry(weightDraft.value)
  weightDraft.value = null
}

function formatSet(s) {
  return [s.poidsKg ? `${s.poidsKg} kg` : null, s.reps ? `${s.reps} rép.` : null].filter(Boolean).join(' × ')
}

const range = computed(() => {
  const values = (progress.value?.poidsKg ?? []).map((d) => d.value)
  const min = Math.floor(Math.min(...values) - 1)
  const max = Math.ceil(Math.max(...values) + 1)
  return { min, max, span: max - min || 1 }
})
const yFor = (v) => 120 - ((v - range.value.min) / range.value.span) * 110

const grid = computed(() => {
  const { min, max } = range.value
  return [max, Math.round((min + max) / 2), min].map((v) => ({ y: yFor(v), label: `${v}` }))
})

const weightPoints = computed(() => {
  const data = progress.value?.poidsKg ?? []
  const t0 = Date.parse(data[0]?.date)
  const t1 = Date.parse(data[data.length - 1]?.date)
  return data.map((d, i) => ({
    x: 38 + (t1 > t0 ? (Date.parse(d.date) - t0) / (t1 - t0) : i / Math.max(1, data.length - 1)) * 256,
    y: yFor(d.value),
    label: `${new Date(d.date).toLocaleDateString('fr-FR')} : ${d.value} kg`,
  }))
})

const weightDelta = computed(() => {
  const data = progress.value?.poidsKg ?? []
  return data.length >= 2 ? Math.round((data[data.length - 1].value - data[0].value) * 10) / 10 : 0
})
const weightSummary = computed(() => {
  const data = progress.value?.poidsKg ?? []
  if (data.length < 2) return ''
  const sign = weightDelta.value > 0 ? '+' : ''
  return `${data[data.length - 1].value} kg aujourd'hui, ${sign}${weightDelta.value} kg depuis le ${new Date(data[0].date).toLocaleDateString('fr-FR')}`
})
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); margin-bottom: var(--space-lg); }
.stat-card { padding: var(--space-md); display: flex; flex-direction: column; gap: 3px; }
.stat-value { font-size: var(--text-xl); font-weight: 700; }
.stat-label { font-size: var(--text-xs); color: var(--color-ink-faint); }

.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }
.line-chart { padding: var(--space-md); }
.line-svg { width: 100%; height: 120px; }
.grid-line { stroke: var(--color-border); stroke-width: 1; }
.axis-text { font-size: 10px; fill: var(--color-ink-faint); }
.weight-form { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: var(--space-md); }
.weight-label { font-size: var(--text-sm); font-weight: 700; }
.weight-input { width: 90px; padding: 8px 10px; border: 2px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-ink); }
.btn-sm { padding: 8px 14px; font-size: var(--text-xs); }
.weight-delta { margin-top: 6px; font-size: var(--text-sm); color: var(--color-ink-soft); font-weight: 600; }
.weight-delta.down { color: var(--color-ok-ink); }
.empty-hint { font-size: var(--text-sm); color: var(--color-ink-soft); }
.block { margin-bottom: var(--space-lg); }
.records { padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; }
.record-row { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: var(--text-sm); }
.record-row:last-child { border-bottom: none; }
.record-name { font-weight: 600; }
.record-value { font-weight: 800; }
</style>
