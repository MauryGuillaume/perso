<template>
  <section class="ressenti card" aria-labelledby="ressenti-titre">
    <h3 id="ressenti-titre" class="ressenti-title">Comment tu te sens aujourd'hui ?</h3>
    <div class="ressenti-choix" role="radiogroup" aria-labelledby="ressenti-titre">
      <button
        v-for="r in RESSENTIS" :key="r.key" type="button" role="radio"
        class="ressenti-btn" :class="{ active: modelValue === r.key }" :aria-checked="modelValue === r.key"
        @click="$emit('update:modelValue', modelValue === r.key ? null : r.key)"
      >
        <span class="ressenti-icon" aria-hidden="true">{{ r.icon }}</span>
        <span class="ressenti-label">{{ r.label }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
// Ressenti du jour : alimente le "Game Master" (gameMaster.js), qui adapte le message et
// propose la version express de la séance quand l'utilisateur est fatigué ou a mal.
defineProps({ modelValue: { type: String, default: null } })
defineEmits(['update:modelValue'])

const RESSENTIS = [
  { key: 'en_forme', icon: '💪', label: 'En forme' },
  { key: 'bof', icon: '🙂', label: 'Bof' },
  { key: 'fatigue', icon: '😴', label: 'Fatigué·e' },
  { key: 'douleur', icon: '🤕', label: 'Douleur' },
]
</script>

<style scoped>
.ressenti { padding: var(--space-md); margin-bottom: var(--space-lg); }
.ressenti-title { font-size: var(--text-base); margin-bottom: var(--space-sm); }
.ressenti-choix { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ressenti-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-height: 64px; padding: 8px 4px;
  border: 2px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-surface); color: var(--color-ink);
  cursor: pointer; touch-action: manipulation;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}
.ressenti-btn:active { transform: scale(0.95); }
.ressenti-btn.active { border-color: var(--color-accent); background: var(--color-accent-soft); }
.ressenti-icon { font-size: 1.4rem; line-height: 1; }
.ressenti-label { font-size: var(--text-xs); font-weight: 700; }
@media (prefers-reduced-motion: reduce) { .ressenti-btn:active { transform: none; } }
</style>
