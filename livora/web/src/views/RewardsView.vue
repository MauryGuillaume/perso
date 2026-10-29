<template>
  <div class="page">
    <RouterLink to="/aujourd-hui" class="back-link">← Aujourd'hui</RouterLink>
    <header class="page-header"><h1>Récompenses</h1></header>

    <section class="block" v-if="openChests.length">
      <h3 class="block-title">Coffres disponibles</h3>
      <div class="chest-grid">
        <button v-for="chest in openChests" :key="chest.id" class="chest-tile card" @click="open(chest)">
          <span class="chest-tile-icon">{{ chestDef(chest.chestKey).icon }}</span>
          <span class="chest-tile-label">{{ chestDef(chest.chestKey).label }}</span>
        </button>
      </div>
    </section>
    <p v-else class="empty-hint">Aucun coffre disponible pour l'instant — termine une séance ou une quête pour en gagner.</p>

    <section v-if="openedChests.length" class="block">
      <h3 class="block-title">Historique</h3>
      <ul class="history-list">
        <li v-for="chest in openedChests" :key="chest.id" class="history-row card">
          <span class="chest-tile-icon small">{{ chestDef(chest.chestKey).icon }}</span>
          <span class="history-label">{{ chestDef(chest.chestKey).label }}</span>
          <span class="history-contents tabular">{{ contentsSummary(chest) }}</span>
        </li>
      </ul>
    </section>

    <Transition name="fade">
      <div v-if="revealResult" class="reveal-overlay" @click.self="revealResult = null">
        <div class="reveal-card">
          <p class="sparkle">🎉 Coffre ouvert</p>
          <div v-for="(entry, i) in revealResult" :key="i" class="reveal-entry">
            <template v-if="entry.type === 'xp'">
              <span class="reveal-icon">⭐</span>
              <span class="tabular">+{{ entry.amount }} XP</span>
            </template>
            <template v-else-if="entry.type === 'cosmetic'">
              <span class="reveal-icon">{{ entry.item.icon }}</span>
              <span>{{ entry.item.label }}</span>
            </template>
          </div>
          <button class="btn btn-primary" @click="revealResult = null">Continuer</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { CHEST_DEFINITIONS } from '@/gamification/catalog.js'

const gamification = useGamificationStore()
const revealResult = ref(null)

const openChests = computed(() => gamification.chests.filter((c) => !c.opened))
const openedChests = computed(() => gamification.chests.filter((c) => c.opened).slice().reverse())

function chestDef(key) { return CHEST_DEFINITIONS[key] ?? { icon: '🎁', label: 'Coffre' } }

function open(chest) {
  const contents = gamification.openChest(chest.id)
  if (!contents) return
  const resolved = contents.map((entry) => {
    if (entry.type === 'cosmetic_pending') {
      const item = gamification.unlockRandomCosmetic()
      return item ? { type: 'cosmetic', item } : null
    }
    return entry
  }).filter(Boolean)
  revealResult.value = resolved
}

function contentsSummary(chest) {
  if (!chest.contents) return ''
  const xp = chest.contents.find((c) => c.type === 'xp')
  const hasCosmetic = chest.contents.some((c) => c.type === 'cosmetic' || c.type === 'cosmetic_pending')
  return `+${xp?.amount ?? 0} XP${hasCosmetic ? ' + objet' : ''}`
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.empty-hint { color: var(--color-ink-faint); font-size: var(--text-sm); text-align: center; margin-top: var(--space-lg); }

.block { margin-bottom: var(--space-lg); }
.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }

.chest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
.chest-tile {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: var(--space-lg) var(--space-sm);
  cursor: pointer;
  transition: transform var(--transition-fast);
}
.chest-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.chest-tile-icon { font-size: 2.2rem; }
.chest-tile-icon.small { font-size: 1.4rem; }
.chest-tile-label { font-size: var(--text-xs); font-weight: 600; text-align: center; }

.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); }
.history-label { flex: 1; font-size: var(--text-sm); font-weight: 500; }
.history-contents { font-size: var(--text-xs); color: var(--color-ink-faint); }

.reveal-overlay { position: fixed; inset: 0; background: rgba(28,27,31,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--space-md); }
.reveal-card { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-xl) var(--space-lg); max-width: 320px; width: 100%; text-align: center; box-shadow: var(--shadow-lg); }
.sparkle { font-size: var(--text-sm); font-weight: 700; color: var(--color-accent-ink); margin-bottom: var(--space-md); }
.reveal-entry { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 0; font-weight: 600; }
.reveal-icon { font-size: 1.3rem; }
.reveal-card .btn { margin-top: var(--space-md); width: 100%; }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
