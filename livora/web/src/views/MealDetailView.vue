<template>
  <div class="page" v-if="meal">
    <RouterLink to="/nutrition" class="back-link">← Nutrition</RouterLink>

    <header class="page-header">
      <span class="meal-type-label">{{ typeLabel(meal.type) }}</span>
      <h1>{{ meal.nom }}</h1>
      <div class="meta-row">
        <span class="pill pill-neutral">⏱ {{ meal.tempsPrepMin }} min</span>
        <span class="pill pill-neutral tabular">{{ meal.calories }} kcal</span>
      </div>
    </header>

    <section class="macros-card card">
      <div class="macro"><span class="macro-value tabular">{{ meal.proteinesG }}g</span><span class="macro-label">Protéines</span></div>
      <div class="macro"><span class="macro-value tabular">{{ meal.glucidesG }}g</span><span class="macro-label">Glucides</span></div>
      <div class="macro"><span class="macro-value tabular">{{ meal.lipidesG }}g</span><span class="macro-label">Lipides</span></div>
    </section>

    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Ingrédients</h3>
        <button class="btn-text" type="button" @click="editingIngredients = !editingIngredients">
          {{ editingIngredients ? 'Terminer' : 'Modifier' }}
        </button>
      </div>
      <ul class="ingredient-list card">
        <li v-for="(ing, i) in meal.ingredients" :key="i" class="ingredient-row">
          <template v-if="editingIngredients">
            <input class="ing-input ing-input--name" type="text" v-model="ing.nom" />
            <input class="ing-input ing-input--qty tabular" type="number" min="0" step="any" v-model.number="ing.quantite" />
            <select class="ing-input ing-input--unit" v-model="ing.unite">
              <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
            </select>
            <button class="ing-remove" type="button" @click="removeIngredient(i)" aria-label="Supprimer l'ingrédient">×</button>
          </template>
          <template v-else>
            <span>{{ ing.nom }}</span>
            <span class="ingredient-qty tabular">{{ ing.quantite }} {{ uniteLabel(ing.unite, ing.quantite) }}</span>
          </template>
        </li>
      </ul>
      <button v-if="editingIngredients" class="btn btn-ghost btn-sm add-ingredient-btn" type="button" @click="addIngredient">+ Ajouter un ingrédient</button>
    </section>

    <section class="block">
      <h3 class="block-title">Préparation</h3>
      <ol class="steps-list">
        <li v-for="(step, i) in meal.preparation" :key="i" class="step-row">
          <span class="step-num tabular">{{ i + 1 }}</span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </section>

    <section class="action-row">
      <button class="btn btn-ghost" @click="openReplace">Je n'aime pas ce repas — proposer des alternatives</button>
    </section>

    <section v-if="showAlternatives" class="block">
      <p v-if="loadingAlt" class="alt-loading">{{ hasKey ? 'Claude cherche des alternatives…' : 'Génération des alternatives…' }}</p>
      <template v-else>
        <p v-if="altSource === 'mock'" class="alt-source-note">
          Alternatives générées par le générateur de secours (pas de clé API Anthropic configurée).
        </p>
        <div class="alt-list">
          <div v-for="(alt, i) in alternatives" :key="i" class="alt-card card">
            <h3 class="alt-name">{{ alt.nom }}</h3>
            <p class="alt-macros tabular">⏱ {{ alt.tempsPrepMin }} min · {{ alt.calories }} kcal · {{ alt.proteinesG }}g P · {{ alt.glucidesG }}g G · {{ alt.lipidesG }}g L</p>
            <ul v-if="alt.ingredients?.length" class="alt-ingredients">
              <li v-for="(ing, j) in alt.ingredients" :key="j">{{ ing.nom }} — {{ ing.quantite }} {{ uniteLabel(ing.unite, ing.quantite) }}</li>
            </ul>
            <button class="btn btn-primary btn-sm" @click="applyAlternative(alt)">Choisir cette recette</button>
          </div>
          <p v-if="alternatives.length === 0" class="alt-empty">Aucune alternative disponible pour ce repas.</p>
        </div>
      </template>
    </section>
  </div>
  <div v-else class="page"><p>Chargement…</p></div>
</template>

<script setup>
const UNITES = { piece: ['pièce', 'pièces'], cas: ['c. à soupe', 'c. à soupe'], cac: ['c. à café', 'c. à café'] }
function uniteLabel(unite, quantite) {
  const u = UNITES[unite]
  return u ? u[quantite > 1 ? 1 : 0] : unite
}
import { ref, onMounted, watch, watchEffect } from 'vue'
import { fetchMeal, applyMealAlternative, updateMealIngredients } from '@/services/programService.js'
import { suggestMealAlternatives, hasApiKey } from '@/onboarding/programGenerator.js'
import { useOnboardingStore } from '@/onboarding/useOnboardingStore.js'

const props = defineProps({ id: { type: String, required: true } })

const meal = ref(null)
const editingIngredients = ref(false)
const showAlternatives = ref(false)
const loadingAlt = ref(false)
const alternatives = ref([])
const altSource = ref(null)
const hasKey = hasApiKey()
const onboardingStore = useOnboardingStore()

const UNITS = ['g', 'kg', 'ml', 'L', 'piece', 'cas', 'cac']

const TYPE_LABELS = { petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', collation: 'Collation', diner: 'Dîner' }
function typeLabel(t) { return TYPE_LABELS[t] ?? t }

async function load() {
  meal.value = await fetchMeal(props.id)
  showAlternatives.value = false
  editingIngredients.value = false
}
onMounted(load)
watch(() => props.id, load)

function addIngredient() {
  meal.value.ingredients.push({ nom: '', quantite: 1, unite: 'g', categorie: 'autre' })
  persistIngredients()
}
function removeIngredient(i) {
  meal.value.ingredients.splice(i, 1)
  persistIngredients()
}
function persistIngredients() {
  updateMealIngredients(meal.value.id, JSON.parse(JSON.stringify(meal.value.ingredients)))
}
// Les champs d'ingrédients sont modifiés en place (v-model) — un watcher suffit à persister
// chaque frappe sans multiplier les appels explicites sur chaque input.
watchEffect(() => {
  if (meal.value && editingIngredients.value) persistIngredients()
})

async function openReplace() {
  showAlternatives.value = true
  loadingAlt.value = true
  const { source, options } = await suggestMealAlternatives(meal.value, onboardingStore.answers)
  altSource.value = source
  alternatives.value = options
  loadingAlt.value = false
}

async function applyAlternative(alt) {
  const patch = {
    nom: alt.nom,
    tempsPrepMin: alt.tempsPrepMin,
    calories: alt.calories,
    proteinesG: alt.proteinesG,
    glucidesG: alt.glucidesG,
    lipidesG: alt.lipidesG,
    ingredients: alt.ingredients ?? meal.value.ingredients,
    preparation: alt.preparation ?? meal.value.preparation,
  }
  Object.assign(meal.value, patch)
  await applyMealAlternative(meal.value.id, patch)
  showAlternatives.value = false
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.meal-type-label { font-size: var(--text-xs); color: var(--color-ink-faint); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.page-header h1 { font-size: var(--text-2xl); margin: 4px 0 var(--space-sm); }
.meta-row { display: flex; gap: 6px; }

.macros-card { display: flex; padding: var(--space-md); margin-bottom: var(--space-lg); }
.macro { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.macro-value { font-size: var(--text-lg); font-weight: 700; }
.macro-label { font-size: var(--text-xs); color: var(--color-ink-faint); }

.block { margin-bottom: var(--space-lg); }
.block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); }
.block-title { font-size: var(--text-lg); margin-bottom: 0; }
.btn-text { background: none; border: none; color: var(--color-accent-ink); font-weight: 600; font-size: var(--text-xs); cursor: pointer; }

.ingredient-list { padding: var(--space-sm) var(--space-md); }
.ingredient-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 9px 0; font-size: var(--text-sm); border-bottom: 1px solid var(--color-border); }
.ingredient-row:last-child { border-bottom: none; }
.ingredient-qty { color: var(--color-ink-soft); }

.ing-input {
  border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface);
  color: var(--color-ink); font-size: var(--text-xs); font-family: inherit; padding: 6px 8px;
}
.ing-input--name { flex: 1; min-width: 0; }
.ing-input--qty { width: 56px; }
.ing-input--unit { width: 60px; }
.ing-remove {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; border: none;
  background: var(--color-danger-soft); color: var(--color-danger-ink); cursor: pointer; font-size: 0.9rem; line-height: 1;
}
.add-ingredient-btn { width: 100%; margin-top: 8px; }

.steps-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.step-row { display: flex; gap: var(--space-sm); align-items: flex-start; font-size: var(--text-sm); line-height: 1.5; }
.step-num {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  background: var(--color-accent-soft); color: var(--color-accent-ink);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 700;
}

.action-row { display: flex; justify-content: center; margin-bottom: var(--space-md); }
.btn-sm { padding: 8px 16px; font-size: var(--text-xs); margin-top: 8px; }
.alt-loading, .alt-empty { color: var(--color-ink-faint); font-size: var(--text-sm); text-align: center; }
.alt-source-note { color: var(--color-warn-ink); font-size: var(--text-xs); background: var(--color-warn-soft); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: var(--space-sm); }
.alt-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.alt-card { padding: var(--space-md); }
.alt-name { font-size: var(--text-base); margin-bottom: 4px; }
.alt-macros { font-size: var(--text-xs); color: var(--color-ink-soft); margin-bottom: 6px; }
.alt-ingredients { font-size: var(--text-xs); color: var(--color-ink-soft); padding-left: 18px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px; }
</style>
