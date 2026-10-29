<template>
  <div class="page" v-if="list">
    <RouterLink to="/nutrition" class="back-link">← Nutrition</RouterLink>
    <header class="page-header">
      <h1>Liste de courses</h1>
      <p class="week-label">{{ list.weekLabel }}</p>
    </header>

    <div class="category-block card" v-for="cat in list.categories" :key="cat.key">
      <h3 class="category-title">{{ cat.label }}</h3>
      <ul class="item-list">
        <li v-for="item in cat.items" :key="item.nom" class="item-row" @click="toggle(cat.key, item)">
          <span class="checkbox" :class="{ checked: item.checked }">
            <svg v-if="item.checked" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="5 13 10 18 19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="item-name" :class="{ checked: item.checked }">{{ item.nom }}</span>
          <span class="item-qty tabular">{{ item.quantite }}</span>
        </li>
      </ul>
    </div>
  </div>
  <div v-else class="page"><p>Chargement…</p></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchShoppingList, toggleShoppingItem } from '@/services/programService.js'

const list = ref(null)

onMounted(async () => { list.value = await fetchShoppingList() })

async function toggle(categoryKey, item) {
  item.checked = !item.checked
  await toggleShoppingItem(categoryKey, item.nom)
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.week-label { color: var(--color-ink-soft); font-size: var(--text-sm); margin-top: 4px; }

.category-block { padding: var(--space-md); margin-bottom: var(--space-sm); }
.category-title { font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-ink-faint); margin-bottom: var(--space-sm); }
.item-list { display: flex; flex-direction: column; }
.item-row {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: 10px 2px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--transition-fast);
}
.item-row:last-child { border-bottom: none; }
.item-row:active { background: var(--color-surface-sunken); }
.checkbox {
  width: 20px; height: 20px; flex-shrink: 0;
  border-radius: var(--radius-sm); border: 2px solid var(--color-ink);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  transition: background var(--transition-bounce), transform var(--transition-bounce);
}
.checkbox svg { width: 13px; height: 13px; }
.checkbox.checked { background: var(--color-accent); transform: scale(1.1); }
.item-name { flex: 1; font-size: var(--text-sm); color: var(--color-ink); transition: color var(--transition-base); }
.item-name.checked { color: var(--color-ink-faint); text-decoration: line-through; }

@media (prefers-reduced-motion: reduce) {
  .checkbox.checked { transform: none; }
}
.item-qty { font-size: var(--text-xs); color: var(--color-ink-faint); }
</style>
