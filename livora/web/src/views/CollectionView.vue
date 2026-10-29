<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header"><h1>Collection</h1></header>

    <div class="tab-row">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- Objets -->
    <div v-if="activeTab === 'objets'" class="item-grid">
      <div v-for="item in objetsGenre" :key="item.key" class="item-tile card" :class="{ locked: !isUnlocked(item.key) }" :style="{ '--rarity-color': RARITY[item.rarity].color }">
        <AssetImage v-if="isUnlocked(item.key)" :asset="cosmeticAsset(item.slot, item.key, item.icon)" :alt="item.label" size="sm" />
        <span v-else class="locked-emoji">🔒</span>
        <span class="item-name">{{ item.label }}</span>
        <span class="rarity-pill" :style="{ background: RARITY[item.rarity].color }">{{ RARITY[item.rarity].label }}</span>
      </div>
    </div>

    <!-- Compagnons -->
    <div v-else-if="activeTab === 'compagnons'" class="item-grid">
      <div v-for="species in COMPANION_SPECIES" :key="species.key" class="item-tile card" :class="{ locked: species.key !== gamification.companion.species }">
        <Companion :species-key="species.key" :level="species.key === gamification.companion.species ? gamification.companion.level : 1" size="sm" />
        <span class="item-name">{{ species.label }}</span>
        <span v-if="species.key === gamification.companion.species" class="pill pill-ok">Actif</span>
      </div>
    </div>

    <!-- Achievements -->
    <div v-else-if="activeTab === 'achievements'" class="item-grid">
      <div v-for="a in ACHIEVEMENTS" :key="a.key" class="item-tile card" :class="{ locked: !isAchievementUnlocked(a.key) }" :style="{ '--rarity-color': RARITY[a.rarity].color }">
        <AssetImage v-if="isAchievementUnlocked(a.key)" :asset="achievementAsset(a.key, a.icon)" :alt="a.nom" size="sm" />
        <span v-else class="locked-emoji">🔒</span>
        <span class="item-name">{{ a.nom }}</span>
        <span class="item-desc">{{ a.description }}</span>
        <span class="rarity-pill" :style="{ background: RARITY[a.rarity].color }">{{ RARITY[a.rarity].label }}</span>
      </div>
    </div>

    <!-- Zones -->
    <div v-else-if="activeTab === 'zones'" class="item-grid">
      <div v-for="zone in WORLD_ZONES" :key="zone.key" class="item-tile card" :class="{ locked: !gamification.unlockedZones.includes(zone.key) }">
        <AssetImage v-if="gamification.unlockedZones.includes(zone.key)" :asset="worldZoneAsset(zone.key, zone.icon)" :alt="zone.label" size="sm" />
        <span v-else class="locked-emoji">🔒</span>
        <span class="item-name">{{ zone.label }}</span>
      </div>
    </div>

    <!-- Exercices -->
    <div v-else-if="activeTab === 'exercices'" class="item-grid">
      <div v-for="key in allExerciseKeys" :key="key" class="item-tile card" :class="{ locked: !gamification.unlockedExercises.includes(key) }">
        <AssetImage v-if="gamification.unlockedExercises.includes(key)" :asset="exerciseAsset(key, exerciseLabel(key).icon)" :alt="exerciseLabel(key).nom" size="sm" />
        <span v-else class="locked-emoji">🔒</span>
        <span class="item-name">{{ exerciseLabel(key).nom }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AssetImage from '@/components/AssetImage.vue'
import Companion from '@/components/Companion.vue'
import { cosmeticAsset, achievementAsset, worldZoneAsset, exerciseAsset } from '@/assets/assetManager.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { RARITY, WORLD_ZONES, COMPANION_SPECIES, EXERCISE_TIERS } from '@/gamification/catalog.js'
import { COSMETIC_ITEMS, cosmeticPourGenre } from '@/gamification/cosmeticItems.js'
import { ACHIEVEMENTS } from '@/gamification/achievements.js'
import { exerciseLabel } from '@/gamification/exerciseUnlocks.js'

const gamification = useGamificationStore()
const activeTab = ref('objets')
// les tenues portées sont réservées à une silhouette : on montre celles du personnage
const objetsGenre = computed(() => COSMETIC_ITEMS.filter((i) => cosmeticPourGenre(i, gamification.apparence.genre ?? 'homme')))

const tabs = [
  { key: 'objets', label: 'Objets' },
  { key: 'compagnons', label: 'Compagnons' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'zones', label: 'Zones' },
  { key: 'exercices', label: 'Exercices' },
]

const allExerciseKeys = [...EXERCISE_TIERS.debutant, ...EXERCISE_TIERS.intermediaire, ...EXERCISE_TIERS.avance]

function isUnlocked(key) { return gamification.unlockedCosmetics.includes(key) }
function isAchievementUnlocked(key) { return gamification.unlockedAchievements.some((a) => a.key === key) }
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.tab-row { display: flex; gap: 6px; overflow-x: auto; margin-bottom: var(--space-lg); padding-bottom: 2px; }
.tab-btn {
  flex-shrink: 0;
  padding: 8px 14px; border-radius: var(--radius-sm);
  border: 2px solid var(--color-ink); background: var(--color-surface);
  color: var(--color-ink-soft); font-family: var(--font-display); font-weight: 400; letter-spacing: 0.02em; text-transform: uppercase; font-size: 0.72rem;
  cursor: pointer; white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-bounce);
}
.tab-btn:active { transform: translate(1px, 1px); }
.tab-btn.active { background: var(--color-accent); color: #fff; box-shadow: 2px 2px 0 rgba(0,0,0,0.35); }

.item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.item-tile {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: var(--space-sm);
  border-top: 3px solid var(--rarity-color, var(--color-border));
  text-align: center;
}
.item-tile.locked { opacity: 0.5; border-top-color: var(--color-border); }
.locked-emoji { font-size: 1.6rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
.item-name { font-size: var(--text-xs); font-weight: 600; color: var(--color-ink); }
.item-desc { font-size: 0.66rem; color: var(--color-ink-faint); }
.rarity-pill { font-size: 0.62rem; font-weight: 700; color: #fff; padding: 2px 8px; border-radius: var(--radius-pill); }
</style>
