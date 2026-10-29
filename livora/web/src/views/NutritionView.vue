<template>
  <div class="page">
    <header class="page-header">
      <h1>Nutrition</h1>
      <RouterLink to="/courses" class="btn btn-ghost btn-sm">🛒 Liste de courses</RouterLink>
    </header>

    <section class="block">
      <h3 class="block-title">Aujourd'hui</h3>
      <div class="meal-list">
        <div v-for="meal in meals" :key="meal.id" class="meal-block">
          <div class="meal-card card">
            <button class="meal-card-main" @click="router.push(`/nutrition/repas/${meal.id}`)">
              <span class="meal-type-icon">{{ typeIcon(meal.type) }}</span>
              <div class="meal-info">
                <span class="meal-type-label">{{ typeLabel(meal.type) }}</span>
                <h2 class="meal-name">{{ meal.nom }}</h2>
                <p class="meal-macros tabular">{{ meal.calories }} kcal · {{ meal.proteinesG }}g protéines</p>
              </div>
              <span v-if="meal.status === 'termine'" class="pill pill-ok">Fait</span>
            </button>
            <button class="choose-btn" type="button" @click="toggleChoice(meal.type)">
              {{ openChoiceType === meal.type ? 'Fermer' : 'Choisir un autre repas' }}
            </button>
          </div>

          <div v-if="openChoiceType === meal.type" class="options-row">
            <button
              v-for="opt in optionsByType[meal.type] ?? []" :key="opt.optionIndex"
              class="option-card card" :class="{ active: opt.optionIndex === selectedByType[meal.type] }"
              @click="chooseOption(meal.type, opt.optionIndex)"
            >
              <h3 class="option-name">{{ opt.nom }}</h3>
              <p class="option-macros tabular">⏱ {{ opt.tempsPrepMin }} min · {{ opt.calories }} kcal</p>
              <span v-if="opt.optionIndex === selectedByType[meal.type]" class="pill pill-ok">Sélectionné</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchMeal, fetchToday, fetchMealOptions, chooseMealOption, fetchProgramProgress } from '@/services/programService.js'

const router = useRouter()
const meals = ref([])
const dayIndex = ref(0)
const openChoiceType = ref(null)
const optionsByType = ref({})
const selectedByType = ref({})

const TYPE_LABELS = { petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', collation: 'Collation', diner: 'Dîner' }
const TYPE_ICONS = { petit_dejeuner: '🥣', dejeuner: '🥗', collation: '🍎', diner: '🍽️' }
function typeLabel(t) { return TYPE_LABELS[t] ?? t }
function typeIcon(t) { return TYPE_ICONS[t] ?? '🍴' }

async function reloadMeals() {
  const today = await fetchToday()
  const ids = today.meals.map((m) => m.id)
  meals.value = await Promise.all(ids.map(fetchMeal))
}

onMounted(async () => {
  const progress = await fetchProgramProgress()
  dayIndex.value = progress.currentDayIndex
  await reloadMeals()
})

async function toggleChoice(type) {
  if (openChoiceType.value === type) {
    openChoiceType.value = null
    return
  }
  openChoiceType.value = type
  if (!optionsByType.value[type]) {
    const { options, selectedIndex } = await fetchMealOptions(dayIndex.value, type)
    optionsByType.value = { ...optionsByType.value, [type]: options }
    selectedByType.value = { ...selectedByType.value, [type]: selectedIndex }
  }
}

async function chooseOption(type, optionIndex) {
  selectedByType.value = { ...selectedByType.value, [type]: optionIndex }
  await chooseMealOption(dayIndex.value, type, optionIndex)
  await reloadMeals()
  openChoiceType.value = null
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); gap: var(--space-sm); }
.page-header h1 { font-size: var(--text-2xl); }
.btn-sm { padding: 9px 15px; font-size: var(--text-xs); white-space: nowrap; }

.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }
.meal-list { display: flex; flex-direction: column; gap: var(--space-md); }
.meal-block { display: flex; flex-direction: column; gap: 8px; }
.meal-card { padding: 0; overflow: hidden; }
.meal-card-main {
  display: flex; align-items: center; gap: var(--space-sm);
  width: 100%; padding: var(--space-md);
  cursor: pointer; text-align: left;
  background: none; border: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: transform var(--transition-fast);
}
.meal-card-main:hover { transform: translateY(-1px); }
.meal-card-main:active { transform: scale(0.99); }
.meal-type-icon { font-size: 1.6rem; }
.meal-info { flex: 1; min-width: 0; }
.meal-type-label { font-size: var(--text-xs); color: var(--color-ink-faint); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.meal-name { font-size: var(--text-base); margin: 2px 0 3px; }
.meal-macros { font-size: var(--text-xs); color: var(--color-ink-soft); }

.choose-btn {
  width: 100%; padding: 9px;
  border: none; border-top: 1px solid var(--color-border);
  background: var(--color-surface-sunken);
  color: var(--color-accent-ink); font-size: var(--text-xs); font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--transition-fast);
}

.options-row { display: flex; flex-direction: column; gap: 6px; padding-left: var(--space-sm); }
.option-card {
  display: flex; flex-direction: column; gap: 3px;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer; text-align: left;
  border: 1.5px solid var(--color-border);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
}
.option-card:active { transform: scale(0.98); }
.option-card.active { border-color: var(--color-accent); background: var(--color-accent-soft); }
.option-name { font-size: var(--text-sm); font-weight: 600; }
.option-macros { font-size: var(--text-xs); color: var(--color-ink-faint); }
</style>
