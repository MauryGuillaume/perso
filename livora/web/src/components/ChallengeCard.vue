<template>
  <div v-if="challenge && challenge.status !== 'ignoree' && challenge.status !== 'terminee'" class="challenge-card card">
    <span class="challenge-tag">Défi du jour · optionnel</span>
    <div class="challenge-body">
      <span class="challenge-icon">{{ challenge.icon }}</span>
      <div>
        <h3 class="challenge-title">{{ challenge.titre }}</h3>
        <p class="challenge-desc">{{ challenge.description }}</p>
        <p class="challenge-raison">{{ challenge.raisonAbsurde }}</p>
      </div>
    </div>

    <ol v-if="challenge.steps?.length" class="challenge-steps">
      <li v-for="(step, i) in challenge.steps" :key="i">
        <span class="step-num tabular">{{ i + 1 }}</span>
        <span>{{ step }}</span>
      </li>
    </ol>

    <div class="challenge-actions">
      <template v-if="challenge.status === 'proposee'">
        <button class="btn btn-ghost btn-sm" @click="gamification.dismissChallenge()">Non merci</button>
        <button class="btn btn-primary btn-sm" @click="gamification.acceptChallenge()">Accepter</button>
      </template>
      <template v-else>
        <span class="pill pill-ok">Accepté</span>
        <button class="btn btn-primary btn-sm" @click="gamification.completeChallenge()">Marquer comme fait</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'

const gamification = useGamificationStore()
const challenge = computed(() => gamification.activeChallenge)
</script>

<style scoped>
.challenge-card { padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); position: relative; overflow: visible; }
.challenge-tag {
  align-self: flex-start;
  font-family: var(--font-display); font-weight: 400; font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase;
  background: var(--color-night); color: #fff;
  padding: 3px 10px;
  transform: skewX(-8deg);
}
.challenge-body { display: flex; gap: var(--space-sm); align-items: flex-start; margin-top: 4px; }
.challenge-icon { font-size: 1.9rem; }
.challenge-title {
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.01em;
  font-size: var(--text-lg); margin-bottom: 3px;
}
.challenge-desc { font-size: var(--text-sm); color: var(--color-ink-soft); font-weight: 500; }
.challenge-raison { font-size: var(--text-xs); color: var(--color-ink-faint); font-style: italic; margin-top: 3px; }

.challenge-steps {
  display: flex; flex-direction: column; gap: 7px;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface-sunken);
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius-sm);
}
.challenge-steps li { display: flex; align-items: flex-start; gap: 8px; font-size: var(--text-sm); color: var(--color-ink); line-height: 1.4; font-weight: 500; }
.step-num {
  flex-shrink: 0; width: 20px; height: 20px; margin-top: 1px;
  border: 1.5px solid var(--color-ink);
  background: var(--color-accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.68rem; font-weight: 800;
}

.challenge-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-sm { padding: 9px 16px; font-size: 0.68rem; }
</style>
