<template>
  <div class="status-toggle">
    <button
      type="button"
      class="status-btn"
      :class="{ done: status === 'termine' }"
      :aria-pressed="status === 'termine'"
      :aria-label="label ? `${label} : terminé` : 'Terminé'"
      title="Marquer comme terminé"
      @click="$emit('update', status === 'termine' ? 'a_faire' : 'termine')"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="5 13 10 18 19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</template>

<script setup>
defineProps({ status: { type: String, default: 'a_faire' }, label: { type: String, default: '' } })
defineEmits(['update'])
</script>

<style scoped>
.status-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-ink);
  background: var(--color-surface);
  color: transparent;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-bounce), box-shadow var(--transition-fast);
  flex-shrink: 0;
}
.status-btn svg { width: 16px; height: 16px; }
.status-btn:hover { box-shadow: 2px 2px 0 var(--color-ink); }
.status-btn:active { transform: translate(1px, 1px); box-shadow: none; }
.status-btn.done {
  background: var(--color-accent);
  border-color: var(--color-ink);
  color: #fff;
  box-shadow: 2px 2px 0 var(--color-ink);
}

@media (prefers-reduced-motion: reduce) {
  .status-btn.done { transform: none; }
}
</style>
