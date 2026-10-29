<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header"><h1>Réglages</h1></header>

    <section class="bloc card">
      <h2 class="bloc-titre">Rappels</h2>
      <p v-if="permission === 'unsupported'" class="aide">Ton navigateur ne gère pas les notifications.</p>
      <template v-else>
        <label class="ligne">
          <span>Activer les rappels</span>
          <input type="checkbox" class="interrupteur" :checked="rappels.actifs" @change="basculerRappels($event.target.checked)" />
        </label>
        <p v-if="permission === 'denied'" class="aide aide--alerte">Les notifications sont bloquées : autorise-les dans les réglages du navigateur pour Livora.</p>
        <fieldset class="sous-choix" :disabled="!rappels.actifs">
          <legend class="sr-only">Types de rappels</legend>
          <label class="ligne"><span>15 min avant la séance</span><input type="checkbox" class="interrupteur" :checked="rappels.seance" @change="maj({ rappels: { seance: $event.target.checked } })" /></label>
          <label class="ligne"><span>Pauses eau</span><input type="checkbox" class="interrupteur" :checked="rappels.hydratation" @change="maj({ rappels: { hydratation: $event.target.checked } })" /></label>
          <label class="ligne"><span>Routine du soir</span><input type="checkbox" class="interrupteur" :checked="rappels.coucher" @change="maj({ rappels: { coucher: $event.target.checked } })" /></label>
        </fieldset>
        <p class="aide">Les rappels arrivent tant que Livora est ouverte ou en arrière-plan. Installe l'app sur ton écran d'accueil pour qu'ils soient plus fiables.</p>
      </template>
    </section>

    <section class="bloc card">
      <h2 class="bloc-titre">Sons et vibrations</h2>
      <label class="ligne"><span>Son aux victoires</span><input type="checkbox" class="interrupteur" :checked="reglages.sons" @change="maj({ sons: $event.target.checked })" /></label>
      <label class="ligne"><span>Vibrations</span><input type="checkbox" class="interrupteur" :checked="reglages.vibrations" @change="maj({ vibrations: $event.target.checked })" /></label>
    </section>

    <section class="bloc card">
      <h2 class="bloc-titre">Avancée du programme</h2>
      <div class="choix" role="radiogroup" aria-label="Avancée du programme">
        <label class="choix-ligne"><input type="radio" name="mode" value="reel" :checked="dateMode === 'reel'" @change="changerMode('reel')" /> Suivre la vraie date</label>
        <label class="choix-ligne"><input type="radio" name="mode" value="demo" :checked="dateMode === 'demo'" @change="changerMode('demo')" /> Mode démo (boutons Jour précédent / suivant)</label>
      </div>
      <p class="aide">Le mode démo sert à tester l'app en avançant les jours à la main.</p>
    </section>

    <section class="bloc card">
      <h2 class="bloc-titre">Mon programme</h2>
      <RouterLink to="/onboarding" class="btn btn-ghost">Refaire le questionnaire</RouterLink>
      <button type="button" class="btn-text danger" @click="toutEffacer">Effacer toutes mes données</button>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { fetchProgramProgress, changeDateMode } from '@/services/programService.js'
import { permissionRappels, demanderPermissionRappels } from '@/services/rappels.js'
import { clearAll } from '@/mock/localStore.js'

const gamification = useGamificationStore()
const reglages = computed(() => gamification.reglages)
const rappels = computed(() => gamification.reglages.rappels)
const permission = ref(permissionRappels())
const dateMode = ref('reel')

onMounted(async () => { dateMode.value = (await fetchProgramProgress()).dateMode })

function maj(patch) {
  gamification.updateReglages(patch)
}

async function basculerRappels(actifs) {
  if (actifs) permission.value = await demanderPermissionRappels()
  maj({ rappels: { actifs: actifs && permission.value === 'granted' } })
}

async function changerMode(mode) {
  dateMode.value = (await changeDateMode(mode)).dateMode
}

function toutEffacer() {
  if (!confirm('Effacer ton programme, ta progression et ton personnage ? Cette action est définitive.')) return
  clearAll()
  location.reload()
}
</script>

<style scoped>
.page { max-width: 480px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }
.bloc { padding: var(--space-md); margin-bottom: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.bloc-titre { font-size: var(--text-lg); }
.ligne { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); min-height: 44px; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.interrupteur { width: 22px; height: 22px; accent-color: var(--color-accent); cursor: pointer; }
.sous-choix { border: none; margin: 0; padding: 0 0 0 var(--space-sm); display: flex; flex-direction: column; }
.sous-choix:disabled { opacity: 0.5; }
.aide { font-size: var(--text-sm); color: var(--color-ink-soft); }
.aide--alerte { color: var(--color-danger-ink); font-weight: 600; }
.choix { display: flex; flex-direction: column; gap: 6px; }
.choix-ligne { display: flex; align-items: center; gap: 10px; min-height: 40px; font-size: var(--text-sm); cursor: pointer; }
.choix-ligne input { accent-color: var(--color-accent); width: 18px; height: 18px; }
.btn { align-self: flex-start; }
.danger { color: var(--color-danger-ink); align-self: flex-start; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
