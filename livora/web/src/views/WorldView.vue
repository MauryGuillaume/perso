<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header">
      <h1>Mon monde</h1>
      <p class="subtitle">Ton monde évolue avec toi — chaque niveau ouvre une nouvelle zone.</p>
    </header>

    <div class="zone-list">
      <div v-for="zone in gamification.unlockedZoneDetails" :key="zone.key" class="zone-card card" :class="{ locked: !zone.unlocked }">
        <AssetImage v-if="zone.unlocked" :asset="worldZoneAsset(zone.key, zone.icon)" :alt="zone.label" size="md" />
        <span v-else class="zone-icon-locked">🔒</span>
        <div class="zone-info">
          <h2 class="zone-label">{{ zone.label }}</h2>
          <p v-if="zone.unlocked" class="zone-desc">{{ zone.description }}</p>
          <p v-else class="zone-locked-label tabular">Niveau {{ zone.levelRequired }} requis</p>
        </div>
        <span v-if="zone.unlocked" class="pill pill-ok">Débloquée</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import AssetImage from '@/components/AssetImage.vue'
import { worldZoneAsset } from '@/assets/assetManager.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
const gamification = useGamificationStore()
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.subtitle { color: var(--color-ink-soft); font-size: var(--text-sm); margin-top: 4px; }

.zone-list { display: flex; flex-direction: column; gap: 8px; }
.zone-card { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md); }
.zone-card.locked { opacity: 0.55; }
.zone-icon-locked { font-size: 1.8rem; width: 56px; text-align: center; flex-shrink: 0; }
.zone-info { flex: 1; min-width: 0; }
.zone-label { font-size: var(--text-base); margin-bottom: 2px; }
.zone-desc { font-size: var(--text-xs); color: var(--color-ink-soft); }
.zone-locked-label { font-size: var(--text-xs); color: var(--color-ink-faint); font-weight: 600; }
</style>
