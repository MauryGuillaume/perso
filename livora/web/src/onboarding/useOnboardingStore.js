import { defineStore } from 'pinia'
import { ONBOARDING_STEPS, createEmptyAnswers } from './onboardingSteps.js'
import { generateProgram } from './programGenerator.js'

const STORAGE_KEY = 'livora.onboarding'

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    stepIndex: 0,
    answers: createEmptyAnswers(),
    status: 'idle', // idle | generating | done | error
    generationSource: null, // 'claude' | 'mock'
    generationError: null,
    generatedProgram: null,
    generatedAt: null,
  }),
  getters: {
    steps: () => ONBOARDING_STEPS,
    currentStep(state) { return ONBOARDING_STEPS[state.stepIndex] },
    isLastStep(state) { return state.stepIndex === ONBOARDING_STEPS.length - 1 },
    progressPct(state) { return Math.round(((state.stepIndex + 1) / ONBOARDING_STEPS.length) * 100) },
  },
  actions: {
    restoreFromStorage() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const saved = JSON.parse(raw)
        this.answers = { ...createEmptyAnswers(), ...saved.answers }
        this.generatedProgram = saved.generatedProgram ?? null
        this.generationSource = saved.generationSource ?? null
        this.generatedAt = saved.generatedAt ?? null
        if (this.generatedProgram) this.status = 'done'
      } catch { /* stockage corrompu, on repart d'un état vide */ }
    },
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        answers: this.answers,
        generatedProgram: this.generatedProgram,
        generationSource: this.generationSource,
        generatedAt: this.generatedAt,
      }))
    },
    setField(key, value) {
      this.answers[key] = value
      this.persist()
    },
    next() {
      if (this.stepIndex < ONBOARDING_STEPS.length - 1) this.stepIndex += 1
    },
    back() {
      if (this.stepIndex > 0) this.stepIndex -= 1
    },
    async submit() {
      this.status = 'generating'
      this.generationError = null
      const { source, program, error } = await generateProgram(this.answers)
      this.generatedProgram = program
      this.generationSource = source
      this.generationError = error ?? null
      this.generatedAt = new Date().toISOString()
      this.status = 'done'
      this.persist()
      return { source, program, error }
    },
    exportJson() {
      const payload = {
        exportedAt: new Date().toISOString(),
        source: this.generationSource,
        generationError: this.generationError,
        answers: this.answers,
        generatedProgram: this.generatedProgram,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `livora-programme-${(this.answers.prenom || 'utilisateur').toLowerCase()}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    reset() {
      this.stepIndex = 0
      this.answers = createEmptyAnswers()
      this.status = 'idle'
      this.generationSource = null
      this.generationError = null
      this.generatedProgram = null
      this.generatedAt = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})
