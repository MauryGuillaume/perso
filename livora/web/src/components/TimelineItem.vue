<template>
  <div class="item" :class="{ done: item.status === 'termine' }">
    <button type="button" class="item-main" @click="$emit('open', item)">
      <div class="item-time tabular">{{ item.time }}</div>
      <div class="item-rail" aria-hidden="true">
        <span class="item-dot" :class="{ done: item.status === 'termine' }"></span>
        <span class="item-line"></span>
      </div>
      <div class="item-body">
        <div class="item-title-row">
          <span class="item-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="item-title">{{ item.title }}</span>
        </div>
        <p v-if="item.subtitle" class="item-subtitle">{{ item.subtitle }}</p>
      </div>
    </button>
    <StatusToggle :status="item.status" :label="item.title" @update="(s) => $emit('status', item.id, s)" />
  </div>
</template>

<script setup>
import StatusToggle from './StatusToggle.vue'
defineProps({ item: { type: Object, required: true } })
defineEmits(['open', 'status'])
</script>

<style scoped>
.item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-xs);
  border-radius: var(--radius-sm);
}
.item-main {
  display: grid;
  grid-template-columns: 52px 20px 1fr;
  align-items: start;
  gap: var(--space-sm);
  width: 100%;
  padding: 0;
  color: inherit;
  font: inherit;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.item:hover { background: var(--color-surface-sunken); }
.item:active { transform: scale(0.99); background: var(--color-surface-sunken); }
.item-time { font-size: var(--text-xs); color: var(--color-ink-faint); padding-top: 6px; font-weight: 600; }

.item-rail { display: flex; flex-direction: column; align-items: center; align-self: stretch; }
.item-dot {
  width: 10px; height: 10px; background: var(--color-surface); border: 2px solid var(--color-ink); margin-top: 8px; flex-shrink: 0;
  transition: background var(--transition-bounce), transform var(--transition-bounce);
}
.item-dot.done { background: var(--color-accent); transform: scale(1.15); }
.item-line { flex: 1; width: 2px; background: var(--color-border); margin-top: 4px; }

.item-body { min-width: 0; padding-top: 2px; }
.item-title-row { display: flex; align-items: center; gap: 8px; }
.item-icon { font-size: 1.05rem; line-height: 1; }
.item-title { font-weight: 700; color: var(--color-ink); font-size: var(--text-base); transition: color var(--transition-base); }
.item.done .item-title { color: var(--color-ink-faint); text-decoration: line-through; text-decoration-color: var(--color-border); }
.item-subtitle { margin-top: 2px; font-size: var(--text-sm); color: var(--color-ink-soft); }

@media (prefers-reduced-motion: reduce) {
  .item:active { transform: none; }
  .item-dot.done { transform: none; }
}

@media (min-width: 900px) {
  .item-main { grid-template-columns: 64px 20px 1fr; }
}
</style>
