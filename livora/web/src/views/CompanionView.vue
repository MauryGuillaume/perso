<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header"><h1>Mon compagnon</h1></header>

    <div class="companion-card card">
      <CompagnonAnime :species-key="companion.species" :level="companion.level" size="xl" />
      <h2 class="companion-name">{{ companion.nom || species?.label }}</h2>
      <p class="companion-stage">{{ evolution?.label }}</p>
      <p class="companion-speech">{{ speech }}</p>
      <div class="companion-xp">
        <span class="companion-level-label">Niveau {{ companion.level }}</span>
        <div class="companion-xp-track"><div class="companion-xp-fill" :style="{ width: companionPct + '%' }"></div></div>
      </div>
    </div>

    <RouterLink to="/personnage/creer" class="btn btn-ghost change-btn">Changer de compagnon</RouterLink>

    <section class="block">
      <h3 class="block-title">Personnalité</h3>
      <div class="personality-grid">
        <button
          v-for="p in COMPANION_PERSONALITIES" :key="p"
          class="personality-btn" :class="{ active: companion.personality === p }"
          @click="companion.personality = p"
        >
          {{ personalityLabel(p) }}
        </button>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">Prochaine évolution</h3>
      <div v-if="nextEvolution" class="next-evo card">
        <span class="next-evo-icon">{{ nextEvolution.icon }}</span>
        <div>
          <p class="next-evo-label">{{ nextEvolution.label }}</p>
          <p class="next-evo-req tabular">Niveau {{ nextEvolution.level }} requis</p>
        </div>
      </div>
      <p v-else class="max-evo">Ton compagnon a atteint sa forme ultime.</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CompagnonAnime from '@/components/CompagnonAnime.vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { COMPANION_PERSONALITIES } from '@/gamification/catalog.js'
import { companionMessage } from '@/gamification/companionMessages.js'

const gamification = useGamificationStore()
const companion = computed(() => gamification.companion)
const species = computed(() => gamification.companionSpecies)
const evolution = computed(() => gamification.companionEvolution)

const companionPct = computed(() => {
  const nextLevelXp = companion.value.level * 120
  return Math.min(100, (companion.value.xp / nextLevelXp) * 100)
})

const nextEvolution = computed(() => {
  if (!species.value) return null
  return species.value.evolutions.find((e) => e.level > companion.value.level) ?? null
})

const speech = computed(() => companionMessage(companion.value.personality, 'day_success'))

const PERSONALITY_LABELS = { motivant: 'Motivant', drole: 'Drôle', calme: 'Calme', taquin: 'Taquin' }
function personalityLabel(p) { return PERSONALITY_LABELS[p] ?? p }
</script>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.companion-card { padding: var(--space-xl) var(--space-lg); text-align: center; margin-bottom: var(--space-lg); display: flex; flex-direction: column; align-items: center; }
.companion-name { font-size: var(--text-xl); margin: var(--space-sm) 0 2px; }
.companion-stage { color: var(--color-ink-faint); font-size: var(--text-sm); margin-bottom: var(--space-md); }
.companion-speech {
  background: var(--color-accent-soft); color: var(--color-accent-ink);
  border-radius: var(--radius-md); padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm); font-weight: 500;
  margin-bottom: var(--space-md);
}
.companion-xp { text-align: left; }
.companion-level-label { font-size: var(--text-xs); color: var(--color-ink-faint); font-weight: 600; }
.companion-xp-track { height: 7px; background: var(--color-surface-sunken); border-radius: var(--radius-pill); overflow: hidden; margin-top: 4px; }
.companion-xp-fill { height: 100%; background: var(--color-accent); transition: width 500ms ease; }

.block { margin-bottom: var(--space-lg); }
.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }

.personality-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.personality-btn {
  padding: 10px; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border); background: var(--color-surface);
  color: var(--color-ink-soft); font-weight: 600; font-size: var(--text-sm);
  cursor: pointer;
}
.personality-btn.active { background: var(--color-accent-soft); color: var(--color-accent-ink); border-color: var(--color-accent); }

.next-evo { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-md); }
.next-evo-icon { font-size: 2rem; }
.next-evo-label { font-weight: 600; }
.next-evo-req { font-size: var(--text-xs); color: var(--color-ink-faint); }
.max-evo { color: var(--color-ink-faint); font-size: var(--text-sm); text-align: center; }
.change-btn { display: block; text-align: center; margin-bottom: var(--space-lg); }
</style>
