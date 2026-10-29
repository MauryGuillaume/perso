// Store Pinia central de la gamification — point d'entrée UNIQUE pour tout gain d'XP
// (cf section 15 : ACTION RÉELLE → XP → Progression → Récompense → Déblocage → nouvelle
// quête). Toute action du reste de l'app (séance terminée, repas terminé, etc.) doit passer
// par `awardXp()` plutôt que de manipuler l'XP directement, pour que les plafonds anti-abus
// (section 23) et les effets de bord (level-up, achievements, quêtes) restent centralisés
// en un seul endroit au lieu d'être dupliqués dans chaque vue.
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { XP_REWARDS, levelProgress, STREAK_MILESTONES, MAX_RECOVERY_JOKERS, WORLD_ZONES, COMPANION_SPECIES } from './catalog.js'
import { ACHIEVEMENTS } from './achievements.js'
import { COSMETIC_ITEMS, cosmeticPourGenre } from './cosmeticItems.js'
import { readJson, writeJson } from '@/mock/localStore.js'
import { getCurrentDayIndex } from '@/mock/programState.js'
import { isoForDay } from '@/mock/programEngine.js'
import {
  mockUserGamification, mockUnlockedCosmetics, mockCompanion, mockUnlockedZones,
  mockUnlockedExercises, mockUnlockedAchievements, mockActiveQuests, mockActiveChallenge, mockChests,
} from './mockGamification.js'
import { DAILY_QUEST_TEMPLATES, WEEKLY_QUEST_TEMPLATES, MONTHLY_QUEST_TEMPLATES } from './quests.js'
import { APPARENCE_DEFAUT, tenuesDepuisEquipement } from '@/avatar/apparence.js'

// La notion de "jour" de la gamification suit le jour COURANT DU PROGRAMME (dayIndex). En mode
// date réelle c'est la date de l'appareil ; en mode démo, c'est le jour affiché, pour que
// l'avancée manuelle des jours fasse progresser la série comme le ferait le vrai temps.
function todayIso() {
  return isoForDay(getCurrentDayIndex())
}

// Lundi (ISO) de la semaine d'une date, et mois "YYYY-MM" : clés des quêtes hebdo / mensuelles.
function mondayOf(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

// Départ d'un nouveau joueur : niveau 1, trois objets communs, un coffre de bienvenue.
// short_sport et brassiere_sport : tenue portée de départ (homme / femme), toujours disponible
const STARTER_COSMETICS = ['t_shirt_gris', 'baskets_blanches', 'bandeau_simple', 'short_sport', 'brassiere_sport']
function freshStart() {
  return {
    totalXp: 0, currentStreak: 0, bestStreak: 0, recoveryJokers: 1, lastActiveDate: null,
    equippedItems: { vetement: 't_shirt_gris', chaussures: 'baskets_blanches' },
    unlockedCosmetics: [...STARTER_COSMETICS],
    unlockedZones: ['parcelle'],
    unlockedExercises: ['squat', 'gainage', 'pompes_genoux', 'marche'],
    unlockedAchievements: [],
    companion: { id: 'comp-1', species: 'dragon', nom: null, personality: 'motivant', xp: 0, level: 1 },
    activeQuests: [],
    activeChallenge: mockActiveChallenge ? { ...mockActiveChallenge } : null,
    chests: [{ id: 'chest-bienvenue', chestKey: 'quotidien', source: 'bienvenue', opened: false, earnedAt: null }],
  }
}

// Progression d'exemple (profil démo) : celle des données mock d'origine.
function demoStart() {
  return {
    totalXp: mockUserGamification.totalXp, currentStreak: mockUserGamification.currentStreak,
    bestStreak: mockUserGamification.bestStreak, recoveryJokers: mockUserGamification.recoveryJokers,
    lastActiveDate: null, equippedItems: { ...mockUserGamification.equippedItems },
    unlockedCosmetics: [...mockUnlockedCosmetics], unlockedZones: [...mockUnlockedZones],
    unlockedExercises: [...mockUnlockedExercises], unlockedAchievements: [...mockUnlockedAchievements],
    companion: { ...mockCompanion }, activeQuests: JSON.parse(JSON.stringify(mockActiveQuests)),
    activeChallenge: mockActiveChallenge ? { ...mockActiveChallenge } : null,
    chests: JSON.parse(JSON.stringify(mockChests)),
  }
}

export const REGLAGES_DEFAUT = {
  sons: true,
  vibrations: true,
  rappels: { actifs: false, seance: true, hydratation: true, coucher: true },
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

const PERSIST_KEY = 'gamificationState'

// État persisté en localStorage — survit aux rechargements et à l'avancée de jour (cf besoin :
// "comme si l'application était branchée mais enregistrée en local"). Absent au tout premier
// lancement, auquel cas on repart des valeurs de départ définies dans mockGamification.js.
const saved = readJson(PERSIST_KEY, null)

export const useGamificationStore = defineStore('gamification', () => {
  // ── État (hydraté depuis localStorage si présent, sinon valeurs de départ du mock) ──────
  // Sans état sauvegardé, un nouveau joueur part de zéro (et non plus des valeurs d'exemple).
  const start = saved ?? freshStart()
  const totalXp = ref(start.totalXp)
  const currentStreak = ref(start.currentStreak)
  const bestStreak = ref(start.bestStreak)
  const recoveryJokers = ref(start.recoveryJokers)
  const lastActiveDate = ref(start.lastActiveDate)
  const equippedItems = ref(start.equippedItems ?? {})
  const unlockedCosmetics = ref(start.unlockedCosmetics ?? [])
  const unlockedZones = ref(start.unlockedZones ?? [])
  const unlockedExercises = ref(start.unlockedExercises ?? [])
  const unlockedAchievements = ref(start.unlockedAchievements ?? [])
  const companion = ref(start.companion)
  const activeQuests = ref(start.activeQuests ?? [])
  const activeChallenge = ref(start.activeChallenge ?? null)
  const chests = ref(start.chests ?? [])
  // Plafonds anti-abus : remis à zéro à chaque nouveau jour du programme — dailyCapDate garde
  // la trace du dernier jour où ils ont été comptés.
  const dailyCapDate = ref(saved?.dailyCapDate ?? todayIso())
  const dailyActionCounts = ref(saved?.dailyActionCounts ?? {})
  // XP déjà accordée pour une action précise (clé = source + élément + jour) : cocher, décocher
  // puis recocher un repas ne rapporte qu'une fois, et décocher retire l'XP gagnée.
  const awardedKeys = ref(saved?.awardedKeys ?? {})
  const apparence = ref(saved?.apparence ?? { ...APPARENCE_DEFAUT })
  const personnageCree = ref(saved?.personnageCree ?? false)
  const reglages = ref({ ...REGLAGES_DEFAUT, ...(saved?.reglages ?? {}), rappels: { ...REGLAGES_DEFAUT.rappels, ...(saved?.reglages?.rappels ?? {}) } })

  const persisted = {
    totalXp, currentStreak, bestStreak, recoveryJokers, lastActiveDate, equippedItems,
    unlockedCosmetics, unlockedZones, unlockedExercises, unlockedAchievements,
    companion, activeQuests, activeChallenge, chests, dailyCapDate, dailyActionCounts,
    awardedKeys, apparence, personnageCree, reglages,
  }
  watch(
    Object.values(persisted),
    () => writeJson(PERSIST_KEY, Object.fromEntries(Object.entries(persisted).map(([k, r]) => [k, r.value]))),
    { deep: true }
  )

  function applyStart(values) {
    for (const [k, v] of Object.entries(values)) persisted[k].value = v
    dailyActionCounts.value = {}
    awardedKeys.value = {}
    refreshQuests()
  }
  // Appelés au démarrage d'un programme (cf OnboardingView) : progression d'exemple pour le
  // profil démo, départ à zéro pour un vrai programme. Apparence et réglages sont conservés.
  function loadDemoProgress() { applyStart(demoStart()) }
  function resetProgress() { applyStart(freshStart()) }

  // File d'événements à afficher (level-up, achievement, coffre...) — consommée par
  // un composant de notification global monté une fois dans App.vue (section 16/17).
  const eventQueue = ref([])
  function pushEvent(event) { eventQueue.value.push(event) }
  function consumeNextEvent() { return eventQueue.value.shift() ?? null }

  // ── Progression dérivée ──────────────────────────────────────────────
  const progress = computed(() => levelProgress(totalXp.value))

  const unlockedZoneDetails = computed(() =>
    WORLD_ZONES.map((z) => ({ ...z, unlocked: unlockedZones.value.includes(z.key) }))
  )

  const companionSpecies = computed(() => COMPANION_SPECIES.find((s) => s.key === companion.value.species))
  const companionEvolution = computed(() => {
    const species = companionSpecies.value
    if (!species) return null
    let evo = species.evolutions[0]
    for (const e of species.evolutions) if (companion.value.level >= e.level) evo = e
    return evo
  })

  // ── Cœur du système : awardXp ────────────────────────────────────────
  // Toute action passe par ici. Applique le plafond quotidien (section 23), enregistre la
  // transaction (mock : juste un event, pas de vraie table), recalcule le niveau, et
  // déclenche les effets de bord (level-up, déblocage de zone, achievements).
  function awardXp(source, amount, { relatedEntityId = null, skipDailyCap = false, onceKey = null } = {}) {
    const today = todayIso()
    if (dailyCapDate.value !== today) {
      // Nouveau jour — on repart avec des plafonds anti-abus frais (section 23).
      dailyCapDate.value = today
      dailyActionCounts.value = {}
      refreshQuests()
    }
    if (onceKey && awardedKeys.value[onceKey]) return { granted: 0, duplicate: true }

    const rule = XP_REWARDS[source]
    const cap = rule?.dailyCap ?? null
    if (!skipDailyCap && cap != null) {
      const used = dailyActionCounts.value[source] ?? 0
      if (used >= cap) return { granted: 0, capped: true }
      dailyActionCounts.value[source] = used + 1
    }

    if (onceKey) awardedKeys.value[onceKey] = { source, amount, day: today }
    const before = levelProgress(totalXp.value)
    totalXp.value += amount
    const after = levelProgress(totalXp.value)

    registerActivityToday()
    checkAchievements()

    if (after.level > before.level) {
      handleLevelUp(before.level, after.level)
    }

    return { granted: amount, capped: false, leveledUp: after.level > before.level }
  }

  // Annule l'XP d'une action décochée (même jour seulement : on ne retire rien du passé, et le
  // niveau atteint n'est jamais repris).
  function revokeXp(onceKey) {
    const entry = awardedKeys.value[onceKey]
    if (!entry || entry.day !== todayIso()) return 0
    delete awardedKeys.value[onceKey]
    const floor = levelProgress(totalXp.value)
    const minXp = totalXp.value - floor.xpInLevel
    totalXp.value = Math.max(minXp, totalXp.value - entry.amount)
    if (dailyActionCounts.value[entry.source]) dailyActionCounts.value[entry.source] -= 1
    return entry.amount
  }

  function handleLevelUp(fromLevel, toLevel) {
    const newlyUnlockedZones = WORLD_ZONES.filter(
      (z) => z.levelRequired > fromLevel && z.levelRequired <= toLevel && !unlockedZones.value.includes(z.key)
    )
    for (const zone of newlyUnlockedZones) {
      unlockedZones.value.push(zone.key)
    }
    pushEvent({
      type: 'level_up',
      level: toLevel,
      newZones: newlyUnlockedZones,
    })
  }

  // ── Séries (section 6) — jamais punitif, jokers de récupération ─────
  function registerActivityToday() {
    const today = todayIso()
    if (lastActiveDate.value === today) return // déjà comptée aujourd'hui

    if (!lastActiveDate.value) {
      currentStreak.value = 1
    } else {
      const gap = daysBetween(lastActiveDate.value, today)
      if (gap === 1) {
        currentStreak.value += 1
      } else if (gap > 1 && recoveryJokers.value > 0) {
        // Un joker préserve la série au lieu de la casser (section 6 — jamais "tu as échoué")
        recoveryJokers.value -= 1
        currentStreak.value += 1
        pushEvent({ type: 'joker_used', daysGap: gap })
      } else if (gap > 1) {
        currentStreak.value = 1 // "On reprend aujourd'hui." — jamais un message culpabilisant
      }
    }

    lastActiveDate.value = today
    if (currentStreak.value > bestStreak.value) bestStreak.value = currentStreak.value
    for (const quest of activeQuests.value) {
      const o = quest.objectives.find((x) => x.key === 'streak')
      if (o && quest.status === 'en_cours') {
        o.current = Math.min(o.target, currentStreak.value)
        if (quest.objectives.every((x) => x.current >= x.target)) completeQuest(quest)
      }
    }

    if (STREAK_MILESTONES.includes(currentStreak.value)) {
      awardXp('streak_bonus', XP_REWARDS.streak_bonus.amount, { skipDailyCap: true })
      pushEvent({ type: 'streak_milestone', days: currentStreak.value })
    }
  }

  // ── Achievements (section 9) — évaluation simplifiée sur l'état mock ─
  function checkAchievements() {
    const alreadyUnlocked = new Set(unlockedAchievements.value.map((a) => a.key))
    const candidates = []

    // Conditions évaluables directement sur l'état actuel du store (mock) — un vrai backend
    // ferait ce calcul côté serveur à partir de l'historique réel.
    if (unlockedCosmetics.value.length >= 10 && !alreadyUnlocked.has('collectionneur')) candidates.push('collectionneur')
    if (bestStreak.value >= 100 && !alreadyUnlocked.has('cent_jours')) candidates.push('cent_jours')

    for (const key of candidates) {
      const achievement = ACHIEVEMENTS.find((a) => a.key === key)
      if (!achievement) continue
      unlockedAchievements.value.push({ key, unlockedAt: todayIso() })
      totalXp.value += achievement.rewardXp
      pushEvent({ type: 'achievement', achievement })
    }
  }

  // Appelé explicitement par les vues quand une condition précise se produit (ex: séance
  // terminée malgré motivation basse) — plus fiable que de deviner depuis l'état global.
  function unlockAchievementByKey(key) {
    if (unlockedAchievements.value.some((a) => a.key === key)) return
    const achievement = ACHIEVEMENTS.find((a) => a.key === key)
    if (!achievement) return
    unlockedAchievements.value.push({ key, unlockedAt: todayIso() })
    totalXp.value += achievement.rewardXp
    pushEvent({ type: 'achievement', achievement })
  }

  // ── Quêtes (section 5) ───────────────────────────────────────────────
  // Une quête quotidienne par jour, une hebdomadaire par semaine, une mensuelle par mois : les
  // quêtes d'une période passée disparaissent, la nouvelle est tirée en alternant les modèles.
  function refreshQuests() {
    const today = todayIso()
    const periods = [
      { type: 'quotidienne', key: today, templates: DAILY_QUEST_TEMPLATES },
      { type: 'hebdomadaire', key: mondayOf(today), templates: WEEKLY_QUEST_TEMPLATES },
      { type: 'mensuelle', key: today.slice(0, 7), templates: MONTHLY_QUEST_TEMPLATES },
    ]
    const kept = activeQuests.value.filter((q) => periods.some((p) => p.type === q.type && p.key === q.periodKey))
    for (const p of periods) {
      if (kept.some((q) => q.type === p.type)) continue
      const seed = [...p.key].reduce((n, ch) => n + ch.charCodeAt(0), 0)
      const t = p.templates[seed % p.templates.length]
      kept.push({
        id: `q-${p.type}-${p.key}`, questKey: t.key, type: p.type, titre: t.titre, periodKey: p.key,
        objectives: t.objectives.map((o) => ({ ...o, current: 0 })),
        rewardXp: t.rewardXp, rewardChestKey: t.rewardChestKey, status: 'en_cours',
      })
    }
    activeQuests.value = kept
    const streakObjective = kept.flatMap((q) => q.objectives).find((o) => o.key === 'streak')
    if (streakObjective) streakObjective.current = Math.min(streakObjective.target, currentStreak.value)
  }
  refreshQuests()

  function progressQuestObjective(objectiveKey, incrementBy = 1) {
    for (const quest of activeQuests.value) {
      if (quest.status !== 'en_cours') continue
      const objective = quest.objectives.find((o) => o.key === objectiveKey)
      if (!objective) continue
      objective.current = Math.max(0, Math.min(objective.target, objective.current + incrementBy))
      if (quest.objectives.every((o) => o.current >= o.target)) {
        completeQuest(quest)
      }
    }
  }

  function completeQuest(quest) {
    quest.status = 'terminee'
    quest.completedAt = todayIso()
    awardXp(quest.type === 'quotidienne' ? 'quest_daily' : quest.type === 'hebdomadaire' ? 'quest_weekly' : 'quest_monthly', quest.rewardXp, { relatedEntityId: quest.id, skipDailyCap: true })
    if (quest.rewardChestKey) grantChest(quest.rewardChestKey, 'quest_completed')
    pushEvent({ type: 'quest_completed', quest })
  }

  // ── Défis absurdes (section 10) ──────────────────────────────────────
  function acceptChallenge() {
    if (activeChallenge.value) activeChallenge.value.status = 'acceptee'
  }
  function completeChallenge() {
    if (!activeChallenge.value) return
    const c = activeChallenge.value
    c.status = 'terminee'
    awardXp('challenge_completed', c.rewardXp, { relatedEntityId: c.id, skipDailyCap: true })
    if (c.rewardChestKey) grantChest(c.rewardChestKey, 'quest_completed')
    pushEvent({ type: 'challenge_completed', challenge: c })
  }
  function dismissChallenge() {
    if (activeChallenge.value) activeChallenge.value.status = 'ignoree'
  }

  // ── Déblocage d'exercices (section 7) ────────────────────────────────
  function unlockExercise(exerciseKey) {
    if (unlockedExercises.value.includes(exerciseKey)) return
    unlockedExercises.value.push(exerciseKey)
  }

  // ── Coffres (section 4 — jamais de hasard payant, uniquement gagnés par l'action) ──
  function grantChest(chestKey, source) {
    chests.value.push({ id: `chest-${Date.now()}`, chestKey, source, opened: false, earnedAt: todayIso() })
    pushEvent({ type: 'chest_earned', chestKey })
  }

  function openChest(chestId) {
    const chest = chests.value.find((c) => c.id === chestId)
    if (!chest || chest.opened) return null

    const def = { quotidien: [30, 80], quete: [100, 300], rare: [200, 500], legendaire: [500, 1200] }[chest.chestKey] ?? [30, 80]
    const xpGained = Math.round(def[0] + Math.random() * (def[1] - def[0]))
    const contents = [{ type: 'xp', amount: xpGained }]

    // Chance de cosmétique non encore débloqué (section 4 — pas de doublon, pas de hasard payant)
    const cosmeticChance = { quotidien: 0.15, quete: 0.35, rare: 0.7, legendaire: 1 }[chest.chestKey] ?? 0.15
    if (Math.random() < cosmeticChance) {
      contents.push({ type: 'cosmetic_pending' }) // résolu par la vue via unlockRandomCosmetic()
    }

    chest.opened = true
    chest.openedAt = todayIso()
    chest.contents = contents
    awardXp('chest_opened_bonus', xpGained, { skipDailyCap: true })
    return contents
  }

  function unlockRandomCosmetic() {
    // pas de tenue réservée à l'autre silhouette dans les coffres et récompenses
    const locked = COSMETIC_ITEMS.filter((i) => !unlockedCosmetics.value.includes(i.key) && cosmeticPourGenre(i, apparence.value.genre))
    if (locked.length === 0) return null
    const item = locked[Math.floor(Math.random() * locked.length)]
    unlockedCosmetics.value.push(item.key)
    return item
  }

  // ── Objets équipés (section 1) ───────────────────────────────────────
  function equipItem(slot, itemKey) {
    if (!unlockedCosmetics.value.includes(itemKey)) return
    equippedItems.value[slot] = itemKey
  }
  function unequipSlot(slot) {
    delete equippedItems.value[slot]
  }

  // ── Compagnon (section 3) ────────────────────────────────────────────
  function chooseCompanion(speciesKey) {
    if (!COMPANION_SPECIES.some((s) => s.key === speciesKey)) return
    companion.value.species = speciesKey
  }

  // Apparence affichée : celle choisie à la création, habillée des tenues équipées (vetement, chaussures).
  const apparencePortee = computed(() => ({
    ...APPARENCE_DEFAUT, ...apparence.value,
    tenues: tenuesDepuisEquipement(apparence.value.genre ?? APPARENCE_DEFAUT.genre, equippedItems.value),
  }))

  function saveApparence(nouvelle) {
    apparence.value = { ...APPARENCE_DEFAUT, ...nouvelle }
    personnageCree.value = true
  }

  function updateReglages(patch) {
    reglages.value = { ...reglages.value, ...patch, rappels: { ...reglages.value.rappels, ...(patch.rappels ?? {}) } }
  }

  function awardCompanionXp(amount) {
    companion.value.xp += amount
    // Palier d'évolution simple : même table de seuils que le joueur, réduite d'un facteur —
    // reste indépendant du niveau du joueur (section 3 : "possède son propre niveau d'évolution").
    const nextLevelXp = companion.value.level * 120
    if (companion.value.xp >= nextLevelXp) {
      companion.value.level += 1
      pushEvent({ type: 'companion_level_up', level: companion.value.level })
    }
  }

  return {
    totalXp, currentStreak, bestStreak, recoveryJokers, equippedItems,
    unlockedCosmetics, unlockedZones, unlockedExercises, unlockedAchievements,
    companion, activeQuests, activeChallenge, chests,
    progress, unlockedZoneDetails, companionSpecies, companionEvolution,
    awardXp, awardCompanionXp,
    progressQuestObjective, completeQuest, refreshQuests, revokeXp,
    apparence, apparencePortee, personnageCree, saveApparence, chooseCompanion, reglages, updateReglages,
    loadDemoProgress, resetProgress,
    acceptChallenge, completeChallenge, dismissChallenge,
    grantChest, openChest, unlockRandomCosmetic,
    equipItem, unequipSlot, unlockExercise,
    unlockAchievementByKey,
    pushEvent, consumeNextEvent, eventQueue,
  }
})
