<template>
  <div class="page">
    <RouterLink to="/aujourd-hui" class="back-link">← Aujourd'hui</RouterLink>
    <header class="page-header"><h1>Quêtes</h1></header>

    <ChallengeCard class="challenge-block" />

    <section v-for="group in questGroups" :key="group.type" class="block">
      <h3 class="block-title">{{ group.label }}</h3>
      <p v-if="group.quests.length === 0" class="empty-hint">Rien en cours dans cette catégorie pour l'instant.</p>
      <div v-else class="quest-list">
        <div v-for="quest in group.quests" :key="quest.id" class="quest-card card">
          <div class="quest-header">
            <span class="quest-icon">🗡️</span>
            <h2 class="quest-title">{{ quest.titre }}</h2>
          </div>
          <ul class="objective-list">
            <li v-for="obj in quest.objectives" :key="obj.key" class="objective-row">
              <span class="objective-check">{{ obj.current >= obj.target ? '☑' : '☐' }}</span>
              <span class="objective-label">{{ obj.label }}</span>
              <span class="objective-count tabular">{{ obj.current }}/{{ obj.target }}</span>
            </li>
          </ul>
          <div class="quest-reward">
            <span class="pill pill-neutral tabular">+{{ quest.rewardXp }} XP</span>
            <span v-if="quest.rewardChestKey" class="pill pill-neutral">🎁 Coffre</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ChallengeCard from '@/components/ChallengeCard.vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'

const gamification = useGamificationStore()

const questGroups = computed(() => {
  const active = gamification.activeQuests.filter((q) => q.status === 'en_cours')
  return [
    { type: 'quotidienne', label: 'Quotidiennes', quests: active.filter((q) => q.type === 'quotidienne') },
    { type: 'hebdomadaire', label: 'Hebdomadaires', quests: active.filter((q) => q.type === 'hebdomadaire') },
    { type: 'mensuelle', label: 'Mensuelles', quests: active.filter((q) => q.type === 'mensuelle') },
    { type: 'speciale', label: 'Spéciales', quests: active.filter((q) => q.type === 'speciale') },
  ]
})
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.challenge-block { margin-bottom: var(--space-lg); }

.block { margin-bottom: var(--space-lg); }
.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }
.empty-hint { color: var(--color-ink-faint); font-size: var(--text-sm); }

.quest-list { display: flex; flex-direction: column; gap: var(--space-sm); }
.quest-card { padding: var(--space-md); }
.quest-header { display: flex; align-items: center; gap: 8px; margin-bottom: var(--space-sm); }
.quest-icon { font-size: 1.3rem; }
.quest-title { font-size: var(--text-base); }

.objective-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-sm); }
.objective-row { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); }
.objective-check { color: var(--color-accent); font-size: 1rem; }
.objective-label { flex: 1; color: var(--color-ink); }
.objective-count { color: var(--color-ink-faint); font-size: var(--text-xs); }

.quest-reward { display: flex; gap: 6px; padding-top: var(--space-sm); border-top: 1px solid var(--color-border); }
</style>
