<template>
  <div class="page">
    <!-- ── Héros : personnage + compagnon + progression, ambiance jeu vidéo ── -->
    <section class="hero">
      <div class="hero-topbar" :class="{ 'hero-topbar--reel': dateMode === 'reel' }">
        <template v-if="dateMode === 'demo'">
          <button class="day-nav-btn" type="button" :disabled="!canGoBack" @click="onPreviousDay" aria-label="Jour précédent">‹</button>
          <span class="day-label tabular">Jour {{ dayNumber }} / {{ totalDays }}</span>
          <button class="day-nav-btn day-nav-btn--primary" type="button" :disabled="!canGoForward" @click="onNextDay">Jour suivant ›</button>
        </template>
        <template v-else>
          <span class="day-date">{{ dateLongue }}</span>
          <span class="day-label tabular">Jour {{ dayNumber }} / {{ totalDays }}</span>
        </template>
      </div>

      <div class="hero-stage">
        <div class="hero-orb" aria-hidden="true"></div>
        <RouterLink to="/personnage" class="hero-avatar-link" aria-label="Mon personnage">
          <PersonnageCalques :level="gamification.progress.level" :apparence="gamification.apparencePortee" :size="200" />
        </RouterLink>
        <RouterLink to="/compagnon" class="hero-companion-badge" aria-label="Mon compagnon">
          <CompagnonAnime :species-key="gamification.companion.species" :level="gamification.companion.level" size="sm" />
        </RouterLink>
      </div>

      <p class="greeting">Salut {{ user?.prenom || '' }} 👋</p>
      <div class="level-pill pill pill-game tabular">Niveau {{ gamification.progress.level }}</div>

      <div class="hero-xp">
        <XpBar :progress="gamification.progress" />
      </div>

      <div class="hero-stats-row">
        <RouterLink v-if="openChestsCount > 0" to="/recompenses" class="hero-chip hero-chip--gold">
          <span class="hero-chip-icon">🎁</span>
          <span class="tabular">{{ openChestsCount }}</span>
        </RouterLink>
        <div class="hero-chip">
          <span class="hero-chip-icon">🔥</span>
          <span class="tabular">{{ gamification.currentStreak }}j</span>
        </div>
      </div>
    </section>

    <section v-if="finished" class="banner card">
      <p><strong>Programme terminé, bravo !</strong> Refais le questionnaire pour un nouveau cycle adapté à tes progrès.</p>
      <RouterLink to="/onboarding" class="btn btn-primary btn-sm">Nouveau programme</RouterLink>
    </section>

    <section v-if="!gamification.personnageCree" class="banner card">
      <p><strong>Crée ton personnage</strong> : il évolue avec toi à chaque niveau.</p>
      <RouterLink to="/personnage/creer" class="btn btn-primary btn-sm">C'est parti</RouterLink>
    </section>

    <RessentiDuJour :model-value="today?.feeling ?? null" @update:model-value="onFeeling" />

    <div v-if="gm.message" class="gm-message" role="status">
      <p>{{ gm.message }}</p>
      <RouterLink v-if="gm.suggestExpress && workoutItem && workoutItem.status !== 'termine'" :to="`/sport/seance/${workoutItem.refId}?express=1`" class="btn btn-game btn-sm gm-cta">
        ⚡ Séance express 10 min
      </RouterLink>
    </div>

    <ChallengeCard class="challenge-block" />

    <!-- ── Objectifs du jour ── -->
    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Tes objectifs aujourd'hui</h3>
        <span class="objectives-count tabular">{{ doneCount }}/{{ today?.items.length ?? 0 }}</span>
      </div>
      <div class="objectives-track"><div class="objectives-fill" :style="{ width: progressPct + '%' }"></div></div>
    </section>

    <section v-if="nowItem" class="now-card">
      <span class="label-eyebrow now-eyebrow">Maintenant</span>
      <div class="now-content">
        <span class="now-icon">{{ nowItem.icon }}</span>
        <div class="now-text">
          <h2 class="now-title">{{ nowItem.title }}</h2>
          <p v-if="nowItem.subtitle" class="now-subtitle">{{ nowItem.subtitle }}</p>
        </div>
      </div>
      <button class="btn btn-game now-cta" @click="openItem(nowItem)">
        {{ nowItem.type === 'workout' ? '⚡ Commencer' : 'Voir le détail' }}
      </button>
    </section>

    <section v-if="nextItems.length" class="block">
      <h3 class="block-title">Ensuite</h3>
      <ul class="next-list">
        <li v-for="item in nextItems" :key="item.id" class="next-row">
          <span class="next-icon">{{ item.icon }}</span>
          <span class="next-title">{{ item.title }}</span>
          <span class="next-time tabular">{{ item.time }}</span>
        </li>
      </ul>
    </section>

    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Ta journée</h3>
        <RouterLink to="/agenda" class="btn-text">Voir l'agenda →</RouterLink>
      </div>
      <div class="card timeline-card">
        <TimelineItem
          v-for="item in today?.items ?? []"
          :key="item.id"
          :item="item"
          @open="openItem"
          @status="onStatus"
        />
      </div>
    </section>

    <ActiviteLibre :activities="today?.activities ?? []" @add="onAddActivity" @remove="onRemoveActivity" />

    <section class="block widgets-grid">
      <RouterLink to="/hydratation" class="widget card">
        <span class="widget-icon">💧</span>
        <span class="widget-value tabular">{{ (hydration.currentMl / 1000).toFixed(1) }} L</span>
        <span class="widget-label">/ {{ (hydration.goalMl / 1000).toFixed(1) }} L aujourd'hui</span>
      </RouterLink>
      <RouterLink to="/sommeil" class="widget card">
        <span class="widget-icon">🌙</span>
        <span class="widget-value tabular">{{ sleep.dureeReelleH }} h</span>
        <span class="widget-label">de sommeil cette nuit</span>
      </RouterLink>
      <RouterLink to="/habitudes" class="widget card">
        <span class="widget-icon">✅</span>
        <span class="widget-value tabular">{{ habitsDone }}/{{ habits.length }}</span>
        <span class="widget-label">habitudes aujourd'hui</span>
      </RouterLink>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TimelineItem from '@/components/TimelineItem.vue'
import XpBar from '@/components/XpBar.vue'
import PersonnageCalques from '@/components/PersonnageCalques.vue'
import CompagnonAnime from '@/components/CompagnonAnime.vue'
import ChallengeCard from '@/components/ChallengeCard.vue'
import RessentiDuJour from '@/components/RessentiDuJour.vue'
import ActiviteLibre from '@/components/ActiviteLibre.vue'
import {
  fetchUser, fetchToday, fetchHydration, fetchSleep, fetchHabits, markItemStatus,
  fetchProgramProgress, goToNextDay, goToPreviousProgramDay, saveFeeling, logActivity, deleteActivity,
} from '@/services/programService.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { awardXpForTimelineItem, onceKeyFor } from '@/gamification/actionBridge.js'
import { gameMasterMessage } from '@/gamification/gameMaster.js'
import { XP_REWARDS } from '@/gamification/catalog.js'
import { planifierRappels } from '@/services/rappels.js'

const router = useRouter()
const gamification = useGamificationStore()
const user = ref(null)
const today = ref(null)
const hydration = ref({ currentMl: 0, goalMl: 1 })
const sleep = ref({ dureeReelleH: 0 })
const habits = ref([])
const dayNumber = ref(1)
const totalDays = ref(84)
const dateMode = ref('reel')
const finished = ref(false)
const dateLongue = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

const canGoBack = computed(() => dayNumber.value > 1)
const canGoForward = computed(() => dayNumber.value < totalDays.value)

async function reloadAll() {
  ;[user.value, today.value, hydration.value, sleep.value, habits.value] = await Promise.all([
    fetchUser(), fetchToday(), fetchHydration(), fetchSleep(), fetchHabits(),
  ])
  planifierRappels(today.value, hydration.value, gamification.reglages.rappels)
}

async function onNextDay() {
  const { currentDayIndex } = await goToNextDay()
  dayNumber.value = currentDayIndex + 1
  await reloadAll()
}
async function onPreviousDay() {
  const { currentDayIndex } = await goToPreviousProgramDay()
  dayNumber.value = currentDayIndex + 1
  await reloadAll()
}

onMounted(async () => {
  const [, progress] = await Promise.all([reloadAll(), fetchProgramProgress()])
  dayNumber.value = progress.currentDayIndex + 1
  totalDays.value = progress.totalDays
  dateMode.value = progress.dateMode
  finished.value = progress.finished
  gamification.refreshQuests()
})

async function onFeeling(feeling) {
  today.value.feeling = await saveFeeling(feeling)
}

async function onAddActivity(activity) {
  const entry = await logActivity(activity)
  today.value.activities = [...(today.value.activities ?? []), entry]
  gamification.awardXp('activity_completed', XP_REWARDS.activity_completed.amount, { relatedEntityId: entry.id, onceKey: onceKeyFor('activity', entry.id) })
  if (activity.type === 'marche') {
    gamification.progressQuestObjective('walk')
    gamification.progressQuestObjective('walks')
  }
  if (activity.dureeMin <= 15) gamification.unlockAchievementByKey('lent_mais_present')
  habits.value = await fetchHabits()
}

async function onRemoveActivity(activityId) {
  await deleteActivity(activityId)
  today.value.activities = today.value.activities.filter((a) => a.id !== activityId)
  gamification.revokeXp(onceKeyFor('activity', activityId))
  habits.value = await fetchHabits()
}

const habitsDone = computed(() => habits.value.filter((h) => h.status === 'termine').length)
const openChestsCount = computed(() => gamification.chests.filter((c) => !c.opened).length)

const workoutItem = computed(() => today.value?.items.find((i) => i.type === 'workout') ?? null)

const gm = computed(() => {
  if (!today.value) return { message: '' }
  const result = gameMasterMessage({
    currentStreak: gamification.currentStreak,
    workoutDureeMin: today.value.workout?.dureeMin ?? 0,
    availableMinutesToday: null,
    feeling: today.value.feeling,
  })
  // Sans séance prévue, seul un message lié au ressenti a du sens.
  return workoutItem.value || today.value.feeling ? result : { message: '' }
})

const doneCount = computed(() => (today.value?.items ?? []).filter((i) => i.status === 'termine').length)
const progressPct = computed(() => {
  const items = today.value?.items ?? []
  if (!items.length) return 0
  return Math.round((doneCount.value / items.length) * 100)
})

const nowItem = computed(() => {
  const items = today.value?.items ?? []
  return items.find((i) => i.status === 'a_faire') ?? null
})

const nextItems = computed(() => {
  const items = today.value?.items ?? []
  const nowId = nowItem.value?.id
  const startAfter = nowId ? items.findIndex((i) => i.id === nowId) + 1 : 0
  return items.slice(startAfter).filter((i) => i.status !== 'termine').slice(0, 3)
})

function openItem(item) {
  if (item.type === 'workout' && item.refId) router.push(`/sport/seance/${item.refId}`)
  else if (item.type === 'meal' && item.refId) router.push(`/nutrition/repas/${item.refId}`)
  else if (item.type === 'hydration') router.push('/hydratation')
  else if (item.type === 'sleep') router.push('/sommeil')
}

async function onStatus(itemId, status) {
  const item = today.value.items.find((i) => i.id === itemId)
  if (item) {
    item.status = status
    awardXpForTimelineItem(gamification, item, status)
  }
  await markItemStatus(itemId, status)
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: 0 var(--space-md) var(--space-2xl); }

/* ── Héros — planche manga : encre, halftone, burst radial ──────────────── */
.hero {
  position: relative;
  margin: 0 calc(var(--space-md) * -1) var(--space-lg);
  padding: var(--space-sm) var(--space-md) var(--space-lg);
  display: flex; flex-direction: column; align-items: center;
  background: var(--color-night);
  clip-path: polygon(0 0, 100% 0, 100% 94%, 0 100%);
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(115deg, transparent 0 18px, rgba(255,255,255,0.035) 18px 19px),
    repeating-linear-gradient(65deg, transparent 0 24px, rgba(225,56,45,0.06) 24px 25px);
  pointer-events: none;
}

.hero-topbar {
  position: relative; z-index: 2;
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-bottom: var(--space-md);
}
.day-label {
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.03em;
  font-size: 0.72rem; color: #fff;
  background: var(--color-accent);
  padding: 5px 14px 4px;
  transform: skewX(-8deg);
  box-shadow: 3px 3px 0 rgba(0,0,0,0.4);
}
.day-nav-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid rgba(255,255,255,0.3); border-radius: 50%;
  background: transparent;
  color: #fff;
  font-size: var(--text-sm); font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-fast);
}
.day-nav-btn:active:not(:disabled) { transform: scale(0.9); }
.day-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.day-nav-btn--primary { width: auto; padding: 0 12px; border-radius: var(--radius-pill); white-space: nowrap; font-size: var(--text-xs); background: var(--color-accent); border-color: var(--color-accent); }

.hero-stage { position: relative; z-index: 2; margin-bottom: 6px; }
.hero-orb {
  position: absolute; inset: 50% auto auto 50%;
  width: 200px; height: 200px;
  transform: translate(-50%, -50%);
  background: repeating-conic-gradient(from 0deg, var(--color-accent) 0deg 6deg, transparent 6deg 20deg);
  opacity: 0.7;
  border-radius: 50%;
  animation: spin-orb 30s linear infinite;
  pointer-events: none;
}
@keyframes spin-orb { to { transform: translate(-50%, -50%) rotate(360deg); } }
.hero-avatar-link { position: relative; display: block; }
.hero-companion-badge {
  position: absolute; bottom: 0; right: -8px;
  border-radius: 50%; border: 3px solid var(--color-ink);
  background: var(--color-bg); line-height: 0;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.4);
  transition: transform var(--transition-bounce);
}
.hero-companion-badge:active { transform: scale(0.9); }

.day-date { font-size: var(--text-sm); font-weight: 700; color: #fff; text-transform: capitalize; }
.greeting { position: relative; z-index: 2; color: #d8d6cf; font-size: var(--text-sm); margin-top: 6px; }
.level-pill {
  position: relative; z-index: 2;
  margin-top: 8px; font-size: 0.7rem; padding: 5px 15px;
  background: #fff; color: var(--color-night);
  border-color: var(--color-night);
}

.hero-xp { position: relative; z-index: 2; width: 100%; max-width: 320px; margin-top: var(--space-md); }
.hero-xp :deep(.xp-level) { color: #fff; }
.hero-xp :deep(.xp-count) { color: #b8b6ae; }
.hero-xp :deep(.xp-track) { border-color: #fff; background: #2a2930; }

.hero-stats-row { position: relative; z-index: 2; display: flex; gap: 8px; margin-top: var(--space-sm); }
.hero-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 13px;
  border-radius: var(--radius-md);
  background: #fff;
  border: 2px solid var(--color-ink);
  font-size: var(--text-sm); font-weight: 800; color: var(--color-night);
  box-shadow: 2px 2px 0 rgba(0,0,0,0.35);
}
.hero-chip--gold { background: var(--color-gold-soft); color: var(--color-gold-ink); }
.hero-chip-icon { font-size: 1rem; }

/* ── Contenu sous le héros ────────────────────────────────────────────── */
.gm-message {
  font-size: var(--text-sm); color: var(--color-ink); font-weight: 500;
  padding: 12px var(--space-md);
  background: var(--color-surface);
  border: 2px solid var(--color-ink);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-md);
  position: relative;
}
.gm-cta { margin-top: var(--space-sm); }
.btn-sm { padding: 8px 14px; font-size: var(--text-xs); }
.banner { padding: var(--space-md); margin-bottom: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); align-items: flex-start; font-size: var(--text-sm); }
.challenge-block { margin-bottom: var(--space-lg); }

.block { margin-bottom: var(--space-lg); }
.block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); }
.block-title {
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.01em;
  font-size: var(--text-lg); margin-bottom: var(--space-sm);
  display: flex; align-items: center; gap: 8px;
}
.block-title::before { content: ''; width: 5px; height: 16px; background: var(--color-accent); display: inline-block; }
.block-header .block-title { margin-bottom: 0; }
.objectives-count { font-size: var(--text-sm); font-weight: 800; color: var(--color-accent-ink); }
.objectives-track { height: 12px; border-radius: var(--radius-pill); background: var(--color-surface-sunken); border: 2px solid var(--color-ink); overflow: hidden; }
.objectives-fill {
  height: 100%;
  background: repeating-linear-gradient(115deg, var(--color-accent) 0 8px, var(--color-accent-strong) 8px 16px);
  transition: width 600ms var(--transition-bounce);
}

.now-card { padding: var(--space-lg); margin-bottom: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-sm); }
.now-eyebrow { color: var(--color-accent-ink); }
.now-content { display: flex; align-items: center; gap: var(--space-sm); margin-top: 4px; }
.now-icon { font-size: 2.2rem; line-height: 1; }
.now-title { font-size: var(--text-xl); }
.now-subtitle { color: var(--color-ink-soft); margin-top: 2px; font-size: var(--text-sm); font-weight: 500; }
.now-cta { align-self: flex-start; margin-top: 6px; }

.next-list { display: flex; flex-direction: column; gap: 6px; }
.next-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px var(--space-sm);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1.5px dashed var(--color-border);
}
.next-icon { font-size: 1rem; }
.next-title { flex: 1; font-size: var(--text-sm); color: var(--color-ink); font-weight: 600; }
.next-time { font-size: var(--text-xs); color: var(--color-ink-faint); font-weight: 700; }

.timeline-card { padding: var(--space-sm); }

.widgets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-sm); }
.widget {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 3px;
  padding: var(--space-md) var(--space-xs);
}
.widget:active { transform: translate(2px, 2px); box-shadow: none; }
.widget-icon { font-size: 1.3rem; }
.widget-value { font-family: var(--font-display); font-weight: 400; font-size: var(--text-lg); color: var(--color-ink); }
.widget-label { font-size: 0.64rem; color: var(--color-ink-faint); line-height: 1.3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }

@media (prefers-reduced-motion: reduce) {
  .hero-orb { animation: none; }
}
</style>
