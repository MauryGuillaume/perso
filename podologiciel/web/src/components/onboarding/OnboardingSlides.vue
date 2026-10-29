<template>
  <Teleport to="body">
    <Transition name="onboard">
      <div v-if="modelValue" class="onboard-overlay">
        <div class="onboard-card">
          <!-- Progress dots -->
          <div class="onboard-dots">
            <span v-for="i in slides.length" :key="i" class="dot" :class="{ active: i-1 === step }" @click="step=i-1" />
          </div>

          <!-- Slide -->
          <Transition :name="slideDir" mode="out-in">
            <div :key="step" class="onboard-slide">
              <div class="onboard-visual">{{ slides[step].visual }}</div>
              <h2 class="onboard-title">{{ slides[step].title }}</h2>
              <p class="onboard-desc">{{ slides[step].desc }}</p>
            </div>
          </Transition>

          <!-- Progress bar -->
          <div class="onboard-progress">
            <div class="onboard-progress-fill" :style="{ width: ((step+1)/slides.length*100)+'%' }" />
          </div>

          <!-- Actions -->
          <div class="onboard-actions">
            <button v-if="step < slides.length-1" class="btn btn-ghost btn-sm" @click="done">Passer</button>
            <div style="flex:1" />
            <button v-if="step > 0" class="btn btn-secondary btn-sm" @click="prev">← Précédent</button>
            <button v-if="step < slides.length-1" class="btn btn-primary" @click="next">Suivant →</button>
            <button v-else class="btn btn-primary" @click="done">Commencer 🚀</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const step     = ref(0)
const slideDir = ref('slide-next')

const slides = [
  {
    visual: '🦶',
    title:  'Bienvenue dans Movyx',
    desc:   'Votre logiciel podologique professionnel, disponible sur tous vos appareils et fonctionnel même hors ligne. Toutes vos données restent stockées localement.',
  },
  {
    visual: '👤',
    title:  'Gérez votre patientèle',
    desc:   'Un répertoire complet avec historique des consultations, recherche instantanée, filtres alphabétiques, et fiche patient détaillée (âge, IMC, antécédents, médecin traitant).',
  },
  {
    visual: '📋',
    title:  'Bilans podologiques complets',
    desc:   'Interrogatoire structuré, évaluation de la douleur EVA, préférences motrices, baromètrie plantaire, schéma corporel interactif avec flèches, chaînes GDS — et export PDF en un clic.',
  },
  {
    visual: '⚙️',
    title:  'Personnalisez votre espace',
    desc:   'Avec un compte Pro ou VIP, créez vos propres onglets, ajoutez des champs sur mesure (texte, pourcentage, cases à cocher, menus déroulants) et adaptez l\'application à votre pratique unique.',
  },
]

function next() { slideDir.value = 'slide-next'; step.value++ }
function prev() { slideDir.value = 'slide-prev'; step.value-- }
function done() { emit('update:modelValue', false) }
</script>

<style scoped>
.onboard-overlay {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.onboard-card {
  background: var(--color-surface); border-radius: var(--radius-xl);
  padding: 40px 36px; width: 100%; max-width: 500px;
  box-shadow: var(--shadow-xl);
  display: flex; flex-direction: column; gap: 24px;
}

.onboard-dots { display: flex; justify-content: center; gap: 8px; }
.dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--color-border); cursor: pointer;
  transition: all var(--transition-base);
}
.dot.active { background: var(--color-primary); transform: scale(1.3); }

.onboard-slide { text-align: center; }
.onboard-visual { font-size: 72px; line-height: 1; margin-bottom: 24px; }
.onboard-title { font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); margin-bottom: 12px; }
.onboard-desc { font-size: var(--text-base); color: var(--color-text-muted); line-height: 1.65; max-width: 380px; margin: 0 auto; }

.onboard-progress { height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.onboard-progress-fill { height: 100%; background: var(--gradient-brand); border-radius: 2px; transition: width 300ms ease; }

.onboard-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

@media (max-width: 480px) {
  .onboard-card { padding: 28px 20px; gap: 18px; }
  .onboard-visual { font-size: 52px; margin-bottom: 16px; }
  .onboard-title { font-size: var(--text-xl); }
  .onboard-desc { font-size: var(--text-sm); }
  .onboard-actions { justify-content: flex-end; }
}

/* Transitions */
.onboard-enter-active, .onboard-leave-active { transition: all 300ms ease; }
.onboard-enter-from { opacity: 0; transform: scale(.96); }
.onboard-leave-to  { opacity: 0; transform: scale(.96); }

.slide-next-enter-active, .slide-next-leave-active,
.slide-prev-enter-active, .slide-prev-leave-active { transition: all 250ms ease; }
.slide-next-enter-from { opacity: 0; transform: translateX(40px); }
.slide-next-leave-to   { opacity: 0; transform: translateX(-40px); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-40px); }
.slide-prev-leave-to   { opacity: 0; transform: translateX(40px); }
</style>
