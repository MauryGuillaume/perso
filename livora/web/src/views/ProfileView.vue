<template>
  <div class="page">
    <header class="page-header">
      <PersonnageCalques :level="gamification.progress.level" :apparence="gamification.apparencePortee" :size="180" />
      <h1>{{ user?.prenom }}</h1>
      <p class="objective">{{ objectiveLabel }}</p>
      <XpBar :progress="gamification.progress" class="profile-xp" />
    </header>

    <h3 class="menu-title">Mon univers</h3>
    <nav class="menu">
      <RouterLink to="/personnage" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">🧑</span>
        <span class="menu-label">Mon personnage</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/compagnon" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">{{ gamification.companionEvolution?.icon ?? '🐉' }}</span>
        <span class="menu-label">Mon compagnon</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/monde" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">🌍</span>
        <span class="menu-label">Mon monde</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/quetes" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">🗡️</span>
        <span class="menu-label">Quêtes</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/recompenses" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">🎁</span>
        <span class="menu-label">Récompenses</span>
        <span v-if="openChestsCount > 0" class="pill pill-ok">{{ openChestsCount }}</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/ma-progression" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">⭐</span>
        <span class="menu-label">Ma progression</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/collection" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">🎒</span>
        <span class="menu-label">Collection</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
    </nav>

    <h3 class="menu-title">Mon programme</h3>
    <nav class="menu">
      <RouterLink to="/progression" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">📈</span>
        <span class="menu-label">Progression sportive</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/habitudes" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">✅</span>
        <span class="menu-label">Habitudes</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/courses" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">🛒</span>
        <span class="menu-label">Liste de courses</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/onboarding" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">📝</span>
        <span class="menu-label">Questionnaire de personnalisation</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/reglages" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">⚙️</span>
        <span class="menu-label">Réglages (rappels, sons, date)</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
      <RouterLink to="/a-propos" class="menu-row card">
        <span class="menu-icon" aria-hidden="true">ℹ️</span>
        <span class="menu-label">À propos, santé et confidentialité</span>
        <span class="menu-arrow" aria-hidden="true">→</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchUser } from '@/services/programService.js'
import XpBar from '@/components/XpBar.vue'
import PersonnageCalques from '@/components/PersonnageCalques.vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'

const gamification = useGamificationStore()
const user = ref(null)
onMounted(async () => { user.value = await fetchUser() })

const openChestsCount = computed(() => gamification.chests.filter((c) => !c.opened).length)

const OBJECTIVE_LABELS = {
  perdre_poids: 'Objectif : perdre du poids',
  prendre_muscle: 'Objectif : prendre du muscle',
  condition_physique: 'Objectif : améliorer ma condition physique',
  energie: 'Objectif : améliorer mon énergie',
  sommeil: 'Objectif : améliorer mon sommeil',
  alimentation: 'Objectif : améliorer mon alimentation',
  autre: 'Objectif personnalisé',
}
const objectiveLabel = computed(() => OBJECTIVE_LABELS[user.value?.objectifPrincipal] ?? '')
</script>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.page-header { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: var(--space-xl); }
.page-header h1 { font-size: var(--text-xl); margin-top: 4px; }
.objective { color: var(--color-ink-soft); font-size: var(--text-sm); margin-bottom: var(--space-sm); }
.profile-xp { width: 100%; max-width: 280px; margin-top: 4px; }

.menu-title {
  font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--color-ink-faint); margin: var(--space-lg) 0 var(--space-sm);
}
.menu-title:first-of-type { margin-top: 0; }

.menu { display: flex; flex-direction: column; gap: 8px; }
.menu-row {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-md);
  width: 100%;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: var(--text-base);
  color: var(--color-ink);
  background: var(--color-surface);
}
.menu-row--btn:disabled { opacity: 0.5; cursor: not-allowed; }
.menu-icon { font-size: 1.15rem; }
.menu-label { flex: 1; font-weight: 500; }
.menu-arrow { color: var(--color-ink-faint); }
</style>
