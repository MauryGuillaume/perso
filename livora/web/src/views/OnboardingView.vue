<template>
  <div class="page">
    <div v-if="intro" class="intro">
      <p class="intro-logo" aria-hidden="true">Li</p>
      <h1>Bienvenue sur Livora</h1>
      <p class="subtitle">Ton programme sport, repas et sommeil, construit pour ta vraie vie. Chaque effort fait évoluer ton personnage.</p>
      <ul class="intro-points">
        <li>🏋️ Des séances à ton niveau, même en 10 minutes</li>
        <li>🥗 Des repas que tu aimes, et ta liste de courses</li>
        <li>🐉 Un compagnon qui grandit avec toi</li>
      </ul>
      <div class="actions">
        <button class="btn btn-primary" type="button" @click="intro = false">Créer mon programme (≈ 3 min)</button>
        <button class="btn btn-ghost" type="button" @click="startDemo">Découvrir avec un profil d'exemple</button>
      </div>
      <p class="hint">Livora donne des conseils généraux et ne remplace pas un avis médical. <RouterLink to="/a-propos" class="hint-link">En savoir plus</RouterLink></p>
    </div>

    <div v-else-if="store.status !== 'generating' && store.status !== 'done'" class="quiz">
      <div class="progress-track"><div class="progress-fill" :style="{ width: store.progressPct + '%' }" /></div>
      <p class="step-count">Étape {{ store.stepIndex + 1 }} / {{ store.steps.length }}</p>

      <header class="quiz-header">
        <h1>{{ store.currentStep.title }}</h1>
        <p class="subtitle">{{ store.currentStep.subtitle }}</p>
      </header>

      <div class="fields">
        <OnboardingField v-for="field in store.currentStep.fields" :key="field.key" :field="field"
          :model-value="store.answers[field.key]" @update:model-value="(v) => store.setField(field.key, v)" />
      </div>

      <div class="nav-row">
        <button v-if="store.stepIndex > 0" class="btn btn-ghost" type="button" @click="store.back()">← Retour</button>
        <span v-else />
        <div class="nav-right">
          <button v-if="stepIsOptional && !store.isLastStep" class="btn btn-text" type="button" @click="store.next()">Passer</button>
          <button v-if="!store.isLastStep" class="btn btn-primary" type="button" :disabled="!canProceed" @click="store.next()">Continuer →</button>
          <button v-else class="btn btn-primary" type="button" :disabled="!canProceed" @click="handleSubmit">Générer mon programme ✨</button>
        </div>
      </div>
    </div>

    <div v-else-if="store.status === 'generating'" class="generating">
      <div class="spinner" />
      <p>Génération de ton programme personnalisé…</p>
      <p class="hint">{{ hasKey ? 'Claude construit ton programme sur-mesure.' : "Pas de clé API configurée — génération avec le générateur de secours." }}</p>
    </div>

    <div v-else class="result">
      <h1>C'est prêt, {{ store.answers.prenom }} 🎉</h1>
      <p class="subtitle" v-if="store.generationSource === 'claude'">Ton programme a été généré par Claude à partir de tes réponses.</p>
      <p class="subtitle" v-else>
        Généré avec le générateur de secours (pas de clé API Anthropic configurée dans apps/livora/web/.env).
        <span v-if="store.generationError" class="error-note">Erreur Claude : {{ store.generationError }}</span>
      </p>

      <div class="summary-grid">
        <div class="summary-card card"><span class="summary-value">{{ store.generatedProgram.summary.seancesParSemaine }}</span><span class="summary-label">séances / semaine</span></div>
        <div class="summary-card card"><span class="summary-value">{{ store.generatedProgram.summary.repasParSemaine }}</span><span class="summary-label">repas / semaine</span></div>
        <div class="summary-card card"><span class="summary-value">{{ store.generatedProgram.summary.objectifHydratationL }} L</span><span class="summary-label">hydratation / jour</span></div>
        <div class="summary-card card"><span class="summary-value">{{ store.generatedProgram.summary.objectifSommeilH }} h</span><span class="summary-label">sommeil visé</span></div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="button" @click="startProgram">Commencer mon programme →</button>
        <p v-if="alreadyStarted" class="hint">Ton programme actuel sera remplacé ; ta progression de jeu, tes pesées et tes records sont gardés.</p>
        <button class="btn btn-ghost" type="button" @click="store.exportJson()">⬇ Exporter mes réponses et le programme (JSON)</button>
        <button class="btn btn-text" type="button" @click="restart">Recommencer le questionnaire</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import OnboardingField from '@/components/OnboardingField.vue'
import { useOnboardingStore } from '@/onboarding/useOnboardingStore.js'
import { isStepValid } from '@/onboarding/onboardingSteps.js'
import { hasApiKey } from '@/onboarding/programGenerator.js'
import { hasStartedProgram, startGeneratedProgram, startDemoProgram } from '@/mock/programState.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'

const router = useRouter()
const store = useOnboardingStore()
const gamification = useGamificationStore()
store.restoreFromStorage()

const hasKey = hasApiKey()
const alreadyStarted = hasStartedProgram()
const intro = ref(!alreadyStarted && store.status !== 'done')
const canProceed = computed(() => isStepValid(store.currentStep, store.answers))
const stepIsOptional = computed(() => store.currentStep.fields.every((f) => !f.required))

function suite() {
  router.push(gamification.personnageCree ? '/aujourd-hui' : { path: '/personnage/creer', query: { depuis: 'onboarding' } })
}

// Programme généré appliqué : jour 1 = aujourd'hui. Un premier départ repart de zéro côté jeu.
function startProgram() {
  if (!alreadyStarted) gamification.resetProgress()
  startGeneratedProgram()
  suite()
}

function startDemo() {
  startDemoProgram()
  gamification.loadDemoProgress()
  suite()
}

async function handleSubmit() {
  await store.submit()
}
function restart() {
  store.reset()
}
</script>

<style scoped>
.page { max-width: 560px; margin: 0 auto; padding: var(--space-xl) var(--space-md) var(--space-2xl); }

.progress-track { height: 4px; border-radius: var(--radius-pill); background: var(--color-surface-sunken); overflow: hidden; margin-bottom: var(--space-sm); }
.progress-fill { height: 100%; background: var(--color-accent); transition: width var(--transition-base); }
.step-count { font-size: var(--text-xs); color: var(--color-ink-faint); margin-bottom: var(--space-lg); }

.quiz-header { margin-bottom: var(--space-xl); }
.quiz-header h1 { font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: 6px; }
.subtitle { color: var(--color-ink-soft); font-size: var(--text-sm); }

.nav-row { display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-xl); }
.nav-right { display: flex; align-items: center; gap: 6px; }
.intro { display: flex; flex-direction: column; gap: var(--space-md); padding-top: var(--space-lg); }
.intro h1 { font-family: var(--font-display); font-size: var(--text-3xl); }
.intro-logo {
  width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;
  background: var(--color-accent); color: #fff; font-family: var(--font-display); font-size: 1.5rem;
  border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);
}
.intro-points { display: flex; flex-direction: column; gap: 8px; font-size: var(--text-base); font-weight: 600; }
.hint-link { text-decoration: underline; }

.btn { padding: 12px 22px; border-radius: var(--radius-pill); font-weight: 600; font-size: var(--text-sm); cursor: pointer; border: none; }
.btn-primary { background: var(--color-accent); color: #fff; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost { background: var(--color-surface-sunken); color: var(--color-ink); }
.btn-text { background: none; color: var(--color-ink-faint); text-decoration: underline; padding: 8px; }

.generating { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-md); padding: var(--space-2xl) 0; text-align: center; }
.spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--color-border); border-top-color: var(--color-accent); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.hint { color: var(--color-ink-faint); font-size: var(--text-xs); margin-top: var(--space-md); }

.result h1 { font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: 6px; }
.error-note { display: block; color: var(--color-danger); margin-top: 4px; }

.summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: var(--space-lg) 0; }
.summary-card { padding: var(--space-md); display: flex; flex-direction: column; gap: 2px; }
.summary-value { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
.summary-label { font-size: var(--text-xs); color: var(--color-ink-faint); }

.actions { display: flex; flex-direction: column; gap: var(--space-sm); align-items: stretch; margin-top: var(--space-lg); }
.actions .btn { text-align: center; }

@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
