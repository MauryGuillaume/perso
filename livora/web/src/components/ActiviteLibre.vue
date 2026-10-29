<template>
  <section class="activite card">
    <div class="activite-header">
      <h3 class="activite-title">Activités en plus</h3>
      <button v-if="!ouvert" type="button" class="btn btn-ghost btn-sm" @click="ouvert = true">+ Ajouter</button>
    </div>

    <ul v-if="activities.length" class="activite-liste">
      <li v-for="a in activities" :key="a.id" class="activite-ligne">
        <span aria-hidden="true">{{ a.icon }}</span>
        <span class="activite-nom">{{ a.label }}</span>
        <span class="activite-duree tabular">{{ a.dureeMin }} min</span>
        <button type="button" class="btn-text activite-suppr" :aria-label="`Supprimer ${a.label}`" @click="$emit('remove', a.id)">✕</button>
      </li>
    </ul>
    <p v-else-if="!ouvert" class="activite-vide">Handball, marche, vélo… tout compte, même 10 minutes.</p>

    <form v-if="ouvert" class="activite-form" @submit.prevent="valider">
      <div class="activite-types" role="radiogroup" aria-label="Type d'activité">
        <button v-for="t in TYPES" :key="t.key" type="button" role="radio" :aria-checked="type === t.key"
          class="type-btn" :class="{ active: type === t.key }" @click="type = t.key">
          <span aria-hidden="true">{{ t.icon }}</span> {{ t.label }}
        </button>
      </div>
      <label class="duree-label">
        Durée (min)
        <input v-model.number="dureeMin" type="number" min="5" max="300" step="5" inputmode="numeric" class="duree-input" />
      </label>
      <div class="form-actions">
        <button type="button" class="btn-text" @click="ouvert = false">Annuler</button>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="!type || !(dureeMin > 0)">Enregistrer</button>
      </div>
    </form>
  </section>
</template>

<script setup>
// Sport fait en dehors du programme (club, marche, vélo…) : compte pour l'habitude "Bouger",
// les quêtes "marche" et rapporte de l'XP, pour que tout effort soit reconnu.
import { ref } from 'vue'

defineProps({ activities: { type: Array, default: () => [] } })
const emit = defineEmits(['add', 'remove'])

const TYPES = [
  { key: 'marche', label: 'Marche', icon: '🚶' },
  { key: 'course', label: 'Course', icon: '🏃' },
  { key: 'velo', label: 'Vélo', icon: '🚴' },
  { key: 'handball', label: 'Handball', icon: '🤾' },
  { key: 'natation', label: 'Natation', icon: '🏊' },
  { key: 'autre', label: 'Autre', icon: '⚡' },
]

const ouvert = ref(false)
const type = ref('marche')
const dureeMin = ref(30)

function valider() {
  const t = TYPES.find((x) => x.key === type.value)
  emit('add', { type: t.key, label: t.label, icon: t.icon, dureeMin: dureeMin.value })
  ouvert.value = false
}
</script>

<style scoped>
.activite { padding: var(--space-md); margin-bottom: var(--space-lg); }
.activite-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.activite-title { font-size: var(--text-base); }
.btn-sm { padding: 8px 14px; font-size: var(--text-xs); }
.activite-vide { margin-top: 6px; font-size: var(--text-sm); color: var(--color-ink-soft); }
.activite-liste { margin-top: var(--space-sm); display: flex; flex-direction: column; gap: 6px; }
.activite-ligne { display: flex; align-items: center; gap: 10px; font-size: var(--text-sm); }
.activite-nom { flex: 1; font-weight: 600; }
.activite-duree { color: var(--color-ink-soft); font-weight: 700; }
.activite-suppr { min-width: 32px; min-height: 32px; }
.activite-form { margin-top: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-sm); }
.activite-types { display: flex; flex-wrap: wrap; gap: 6px; }
.type-btn {
  padding: 8px 12px; min-height: 40px;
  border: 2px solid var(--color-border); border-radius: var(--radius-pill);
  background: var(--color-surface); color: var(--color-ink);
  font-size: var(--text-sm); font-weight: 600; cursor: pointer;
}
.type-btn.active { border-color: var(--color-accent); background: var(--color-accent-soft); }
.duree-label { display: flex; align-items: center; gap: 10px; font-size: var(--text-sm); font-weight: 600; }
.duree-input {
  width: 90px; padding: 8px 10px;
  border: 2px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-surface); color: var(--color-ink);
}
.form-actions { display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
</style>
