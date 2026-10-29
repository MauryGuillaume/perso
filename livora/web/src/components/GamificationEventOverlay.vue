<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="current" class="overlay" @click.self="dismiss">
        <div class="event-card" role="dialog" aria-modal="true" aria-live="assertive">
          <template v-if="current.type === 'level_up'">
            <p class="sparkle">✨ LEVEL UP ✨</p>
            <h2 class="event-title">Niveau {{ current.level }}</h2>
            <div v-if="current.newZones?.length" class="unlock-list">
              <p class="unlock-line" v-for="zone in current.newZones" :key="zone.key">{{ zone.icon }} Zone débloquée : {{ zone.label }}</p>
            </div>
          </template>

          <template v-else-if="current.type === 'achievement'">
            <p class="sparkle">🏅 ACHIEVEMENT DÉBLOQUÉ</p>
            <div class="achievement-icon">{{ current.achievement.icon }}</div>
            <h2 class="event-title">{{ current.achievement.nom }}</h2>
            <p class="event-desc">{{ current.achievement.description }}</p>
            <p class="event-reward tabular">+{{ current.achievement.rewardXp }} XP</p>
          </template>

          <template v-else-if="current.type === 'chest_earned'">
            <p class="sparkle">Nouveau coffre</p>
            <div class="achievement-icon">{{ chestIcon(current.chestKey) }}</div>
            <h2 class="event-title">{{ chestLabel(current.chestKey) }}</h2>
            <p class="event-desc">Rends-toi dans tes récompenses pour l'ouvrir.</p>
          </template>

          <template v-else-if="current.type === 'streak_milestone'">
            <p class="sparkle">🔥 SÉRIE</p>
            <h2 class="event-title">{{ current.days }} jours</h2>
            <p class="event-desc">Continue comme ça.</p>
          </template>

          <template v-else-if="current.type === 'joker_used'">
            <p class="sparkle">🃏 JOKER UTILISÉ</p>
            <h2 class="event-title">Série préservée</h2>
            <p class="event-desc">On reprend aujourd'hui — ta série continue.</p>
          </template>

          <template v-else-if="current.type === 'quest_completed'">
            <p class="sparkle">🗡️ QUÊTE TERMINÉE</p>
            <h2 class="event-title">{{ current.quest.titre }}</h2>
            <p class="event-reward tabular">+{{ current.quest.rewardXp }} XP</p>
          </template>

          <template v-else-if="current.type === 'challenge_completed'">
            <p class="sparkle">{{ current.challenge.icon }} DÉFI RÉUSSI</p>
            <h2 class="event-title">{{ current.challenge.titre }}</h2>
            <p class="event-reward tabular">+{{ current.challenge.rewardXp }} XP</p>
          </template>

          <template v-else-if="current.type === 'record'">
            <p class="sparkle">🏆 NOUVEAU RECORD</p>
            <h2 class="event-title">{{ current.exercice }}</h2>
            <p class="event-reward tabular">{{ current.valeur }}</p>
          </template>

          <template v-else-if="current.type === 'companion_level_up'">
            <p class="sparkle">Ton compagnon évolue</p>
            <h2 class="event-title">Niveau {{ current.level }}</h2>
          </template>

          <button class="btn btn-primary continue-btn" autofocus @click="dismiss">Continuer</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { CHEST_DEFINITIONS } from '@/gamification/catalog.js'
import { feterEvenement } from '@/services/retours.js'

const store = useGamificationStore()
const current = ref(null)

function chestIcon(key) { return CHEST_DEFINITIONS[key]?.icon ?? '🎁' }
function chestLabel(key) { return CHEST_DEFINITIONS[key]?.label ?? 'Coffre' }

function tryConsume() {
  if (current.value) return
  current.value = store.consumeNextEvent()
  if (current.value) feterEvenement(current.value.type, store.reglages)
}
function dismiss() {
  current.value = null
  // Petit délai pour laisser la transition de sortie se jouer avant d'afficher le suivant.
  setTimeout(tryConsume, 200)
}

onMounted(tryConsume)
watch(() => store.eventQueue.length, tryConsume)
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(19, 18, 23, 0.68);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  padding: var(--space-md);
}
.event-card {
  position: relative;
  background: var(--color-surface);
  border: 3px solid var(--color-ink);
  border-radius: var(--radius-md);
  padding: var(--space-xl) var(--space-lg);
  max-width: 340px;
  width: 100%;
  text-align: center;
  box-shadow: 6px 6px 0 rgba(0,0,0,0.4);
  overflow: hidden;
}
.event-card::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-conic-gradient(from 0deg, rgba(225,56,45,0.08) 0deg 4deg, transparent 4deg 16deg);
  pointer-events: none;
}
.sparkle {
  position: relative;
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.04em; text-transform: uppercase;
  font-size: 0.75rem; color: #fff;
  background: var(--color-accent);
  display: inline-block;
  padding: 4px 14px;
  margin-bottom: 12px;
  transform: skewX(-8deg);
}
.achievement-icon { position: relative; font-size: 2.8rem; margin-bottom: 8px; }
.event-title { position: relative; font-size: var(--text-xl); margin-bottom: 6px; }
.event-desc { position: relative; color: var(--color-ink-soft); font-size: var(--text-sm); margin-bottom: 4px; font-weight: 500; }
.event-reward { position: relative; color: var(--color-accent-ink); font-weight: 800; font-size: var(--text-lg); margin-top: 6px; }
.unlock-list { position: relative; margin-top: var(--space-sm); display: flex; flex-direction: column; gap: 4px; }
.unlock-line { font-size: var(--text-sm); color: var(--color-ink); font-weight: 600; }
.continue-btn { position: relative; margin-top: var(--space-lg); width: 100%; }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
