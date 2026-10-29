<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header"><h1>Ma progression</h1></header>

    <div class="level-card card">
      <XpBar :progress="gamification.progress" />
    </div>

    <div class="stats-grid">
      <div class="stat-card card">
        <span class="stat-value tabular">🔥 {{ gamification.currentStreak }}</span>
        <span class="stat-label">Série actuelle</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">🏆 {{ gamification.bestStreak }}</span>
        <span class="stat-label">Record de série</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ unlockedAchievementsCount }}/{{ ACHIEVEMENTS.length }}</span>
        <span class="stat-label">Achievements</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ completedQuestsCount }}</span>
        <span class="stat-label">Quêtes terminées</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ unopenedChestsCount }}</span>
        <span class="stat-label">Coffres en attente</span>
      </div>
      <div class="stat-card card">
        <span class="stat-value tabular">{{ gamification.unlockedCosmetics.length }}</span>
        <span class="stat-label">Objets débloqués</span>
      </div>
    </div>

    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Compagnon</h3>
        <RouterLink to="/compagnon" class="btn-text">Voir →</RouterLink>
      </div>
      <div class="companion-row card">
        <span class="companion-icon">{{ gamification.companionEvolution?.icon }}</span>
        <div>
          <p class="companion-name">{{ gamification.companionSpecies?.label }}</p>
          <p class="companion-level tabular">Niveau {{ gamification.companion.level }}</p>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Monde</h3>
        <RouterLink to="/monde" class="btn-text">Voir →</RouterLink>
      </div>
      <p class="world-summary">{{ gamification.unlockedZones.length }}/{{ WORLD_ZONES.length }} zones débloquées</p>
    </section>

    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Derniers achievements</h3>
        <RouterLink to="/collection" class="btn-text">Voir tout →</RouterLink>
      </div>
      <div class="achievement-row" v-if="recentAchievements.length">
        <div v-for="a in recentAchievements" :key="a.key" class="achievement-chip card">
          <span>{{ achievementByKey(a.key)?.icon }}</span>
          <span class="achievement-chip-name">{{ achievementByKey(a.key)?.nom }}</span>
        </div>
      </div>
      <p v-else class="empty-hint">Pas encore d'achievement débloqué.</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import XpBar from '@/components/XpBar.vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { WORLD_ZONES } from '@/gamification/catalog.js'
import { ACHIEVEMENTS, achievementByKey } from '@/gamification/achievements.js'

const gamification = useGamificationStore()

const unlockedAchievementsCount = computed(() => gamification.unlockedAchievements.length)
const completedQuestsCount = computed(() => gamification.activeQuests.filter((q) => q.status === 'terminee').length)
const unopenedChestsCount = computed(() => gamification.chests.filter((c) => !c.opened).length)
const recentAchievements = computed(() => gamification.unlockedAchievements.slice(-3).reverse())
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.level-card { padding: var(--space-lg); margin-bottom: var(--space-lg); }

.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: var(--space-lg); }
.stat-card { padding: var(--space-md); display: flex; flex-direction: column; gap: 3px; }
.stat-value { font-size: var(--text-lg); font-weight: 700; }
.stat-label { font-size: var(--text-xs); color: var(--color-ink-faint); }

.block { margin-bottom: var(--space-lg); }
.block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); }
.block-title { font-size: var(--text-lg); margin-bottom: 0; }
.empty-hint { color: var(--color-ink-faint); font-size: var(--text-sm); }

.companion-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md); }
.companion-icon { font-size: 2rem; }
.companion-name { font-weight: 600; }
.companion-level { font-size: var(--text-xs); color: var(--color-ink-faint); }

.world-summary { font-size: var(--text-sm); color: var(--color-ink-soft); }

.achievement-row { display: flex; gap: 8px; flex-wrap: wrap; }
.achievement-chip { display: flex; align-items: center; gap: 6px; padding: 8px 12px; font-size: var(--text-sm); }
.achievement-chip-name { font-weight: 600; font-size: var(--text-xs); }
</style>
