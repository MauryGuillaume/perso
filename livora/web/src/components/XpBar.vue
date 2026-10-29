<template>
  <div class="xp-bar" :class="{ compact }">
    <div class="xp-header">
      <span class="xp-level">Niveau {{ progress.level }}</span>
      <span v-if="!progress.isMaxLevel" class="xp-count tabular">{{ progress.xpInLevel }} / {{ progress.xpForLevel }} XP</span>
      <span v-else class="xp-count">Niveau maximum</span>
    </div>
    <div class="xp-track">
      <div class="xp-fill" :style="{ width: pct + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  progress: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
const pct = computed(() => props.progress.isMaxLevel ? 100 : Math.min(100, (props.progress.xpInLevel / props.progress.xpForLevel) * 100))
</script>

<style scoped>
.xp-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.xp-level {
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.02em; text-transform: uppercase;
  color: var(--color-ink); font-size: var(--text-sm);
}
.xp-count { font-size: var(--text-xs); color: var(--color-ink-faint); font-variant-numeric: tabular-nums; font-weight: 700; }
.xp-track {
  height: 12px; border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  border: 2px solid var(--color-ink);
  overflow: hidden;
}
.xp-fill {
  height: 100%;
  background: repeating-linear-gradient(115deg, var(--color-accent) 0 8px, var(--color-accent-strong) 8px 16px);
  transition: width 700ms var(--transition-bounce, 600ms ease);
}

.xp-bar.compact .xp-header { margin-bottom: 4px; }
.xp-bar.compact .xp-track { height: 8px; border-width: 1.5px; }
</style>
