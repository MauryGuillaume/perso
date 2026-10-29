<template>
  <div class="page">
    <RouterLink :to="retour" class="back-link">← Retour</RouterLink>
    <header class="page-header">
      <h1>Ton personnage</h1>
      <p class="subtitle">Il grandit avec toi : {{ nbStades }} stades d'évolution selon ton niveau.</p>
    </header>

    <div class="apercu card">
      <PersonnageCalques :level="1" :stade="stadeApercu" :apparence="apercu" :size="240" />
      <div class="stades" role="group" aria-label="Aperçu des stades">
        <button v-for="s in nbStades" :key="s" type="button" class="stade-btn" :class="{ active: stadeApercu === s }"
          :aria-pressed="stadeApercu === s" @click="stadeApercu = s">{{ s }}</button>
      </div>
    </div>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-genre">Silhouette</h2>
      <div class="choix-ligne" role="radiogroup" aria-labelledby="t-genre">
        <button v-for="g in GENRES" :key="g.key" type="button" role="radio" :aria-checked="brouillon.genre === g.key"
          class="chip" :class="{ active: brouillon.genre === g.key }" @click="changerGenre(g.key)">{{ g.label }}</button>
      </div>
    </section>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-peau">Peau</h2>
      <div class="choix-ligne" role="radiogroup" aria-labelledby="t-peau">
        <button v-for="(hex, cle) in PEAUX" :key="cle" type="button" role="radio" :aria-checked="brouillon.peau === cle"
          :aria-label="LIBELLES_PEAU[cle] ?? cle" class="pastille" :class="{ active: brouillon.peau === cle }"
          :style="{ background: hex }" @click="brouillon.peau = cle" />
      </div>
    </section>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-coiffure">Coiffure</h2>
      <div class="grille" role="radiogroup" aria-labelledby="t-coiffure">
        <button v-for="(h, i) in coiffures" :key="h.cle" type="button" role="radio" :aria-checked="brouillon.coiffure === h.cle"
          :aria-label="`Coiffure ${i + 1}`" class="vignette" :class="{ active: brouillon.coiffure === h.cle }" @click="brouillon.coiffure = h.cle">
          <img :src="url(h.fichier)" alt="" loading="lazy" />
        </button>
      </div>
      <div class="choix-ligne choix-ligne--serre" role="radiogroup" aria-label="Couleur des cheveux">
        <button v-for="(hex, cle) in COULEURS_CHEVEUX" :key="cle" type="button" role="radio" :aria-checked="brouillon.couleurCheveux === cle"
          :aria-label="`Cheveux ${cle}`" class="pastille" :class="{ active: brouillon.couleurCheveux === cle }"
          :style="{ background: hex }" @click="brouillon.couleurCheveux = cle" />
      </div>
    </section>

    <section v-if="brouillon.genre === 'homme'" class="bloc">
      <h2 class="bloc-titre" id="t-barbe">Barbe</h2>
      <div class="grille" role="radiogroup" aria-labelledby="t-barbe">
        <button type="button" role="radio" :aria-checked="!brouillon.barbe" class="vignette vignette--texte"
          :class="{ active: !brouillon.barbe }" @click="brouillon.barbe = null">Aucune</button>
        <button v-for="(b, i) in BARBES" :key="b.cle" type="button" role="radio" :aria-checked="brouillon.barbe === b.cle"
          :aria-label="`Barbe ${i + 1}`" class="vignette" :class="{ active: brouillon.barbe === b.cle }" @click="brouillon.barbe = b.cle">
          <img :src="url(b.fichier)" alt="" loading="lazy" />
        </button>
      </div>
    </section>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-yeux">Yeux</h2>
      <div class="grille" role="radiogroup" aria-labelledby="t-yeux">
        <button v-for="(y, i) in yeux" :key="y.cle" type="button" role="radio" :aria-checked="brouillon.yeux === y.cle"
          :aria-label="`Yeux ${i + 1}`" class="vignette" :class="{ active: brouillon.yeux === y.cle }" @click="brouillon.yeux = y.cle">
          <img :src="url(y.oeil[0].fichier)" alt="" loading="lazy" />
        </button>
      </div>
      <div class="choix-ligne choix-ligne--serre" role="radiogroup" aria-label="Couleur des yeux">
        <button v-for="(hex, cle) in COULEURS_YEUX" :key="cle" type="button" role="radio" :aria-checked="brouillon.couleurYeux === cle"
          :aria-label="`Yeux ${cle}`" class="pastille" :class="{ active: brouillon.couleurYeux === cle }"
          :style="{ background: hex }" @click="brouillon.couleurYeux = cle" />
      </div>
    </section>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-nez">Nez</h2>
      <div class="grille" role="radiogroup" aria-labelledby="t-nez">
        <button v-for="n in NEZ" :key="n.cle" type="button" role="radio" :aria-checked="brouillon.nez === n.cle"
          :aria-label="`Nez ${n.cle}`" class="vignette" :class="{ active: brouillon.nez === n.cle }" @click="brouillon.nez = n.cle">
          <img :src="url(n.fichier)" alt="" loading="lazy" />
        </button>
      </div>
    </section>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-expression">Expression</h2>
      <div class="grille" role="radiogroup" aria-labelledby="t-expression">
        <button v-for="b in BOUCHES" :key="b.cle" type="button" role="radio" :aria-checked="brouillon.expression === b.cle"
          :aria-label="LIBELLES_EXPRESSION[b.cle] ?? b.cle" :title="LIBELLES_EXPRESSION[b.cle] ?? b.cle" class="vignette"
          :class="{ active: brouillon.expression === b.cle }" @click="brouillon.expression = b.cle">
          <img :src="url(b.fichier)" alt="" loading="lazy" />
        </button>
      </div>
    </section>

    <section class="bloc">
      <h2 class="bloc-titre" id="t-compagnon">Ton compagnon</h2>
      <p class="bloc-aide">Il t'accompagne et évolue à chaque séance terminée.</p>
      <div class="compagnons" role="radiogroup" aria-labelledby="t-compagnon">
        <button v-for="s in COMPANION_SPECIES" :key="s.key" type="button" role="radio" :aria-checked="espece === s.key"
          class="compagnon-btn card" :class="{ active: espece === s.key }" @click="espece = s.key">
          <Companion :species-key="s.key" :level="1" size="sm" />
          <span class="compagnon-nom">{{ s.label }}</span>
        </button>
      </div>
    </section>

    <div class="actions">
      <button type="button" class="btn btn-primary" @click="valider">C'est moi ! ✨</button>
    </div>
  </div>
</template>

<script setup>
// Création / modification du personnage : choix de l'apparence (palettes et pièces du pack
// avatars, cf src/avatar/apparence.js) et du compagnon. Stocké dans le store de gamification.
import { reactive, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PersonnageCalques from '@/components/PersonnageCalques.vue'
import Companion from '@/components/Companion.vue'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { COMPANION_SPECIES } from '@/gamification/catalog.js'
import {
  url, PEAUX, COULEURS_CHEVEUX, COULEURS_YEUX, COIFFURES, BARBES, YEUX, BOUCHES, NEZ, CORPS, APPARENCE_DEFAUT,
  tenuesDepuisEquipement,
} from '@/avatar/apparence.js'

const router = useRouter()
const route = useRoute()
const gamification = useGamificationStore()

const GENRES = [{ key: 'homme', label: 'Homme' }, { key: 'femme', label: 'Femme' }]
const LIBELLES_PEAU = { claire: 'Peau claire', doree: 'Peau dorée', mate: 'Peau mate', brune: 'Peau brune', foncee: 'Peau foncée' }
const LIBELLES_EXPRESSION = {
  neutre: 'Neutre', sourire: 'Sourire', grand_sourire: 'Grand sourire', rire: 'Rire', determine: 'Déterminé',
  en_coin: 'Sourire en coin', effort: 'Effort', dents_serrees: 'Dents serrées', surpris: 'Surpris', moue: 'Moue',
  triste: 'Triste', langue: 'Langue tirée', sifflote: 'Sifflote', essouffle: 'Essoufflé', confiant: 'Confiant', cri: 'Cri',
}

const brouillon = reactive({ ...APPARENCE_DEFAUT, ...gamification.apparence })
const espece = ref(gamification.companion.species)
const stadeApercu = ref(1)
const retour = computed(() => (route.query.depuis === 'onboarding' ? '/aujourd-hui' : '/personnage'))

// homme : 6 stades, femme : 4 ; l'aperçu porte les tenues équipées (ou la tenue de sport de départ)
const nbStades = computed(() => CORPS[brouillon.genre].length)
const apercu = computed(() => ({ ...brouillon, tenues: tenuesDepuisEquipement(brouillon.genre, gamification.equippedItems) }))
const coiffures = computed(() => COIFFURES.filter((h) => h.genre === brouillon.genre))
const yeux = computed(() => YEUX.filter((y) => y.genre === brouillon.genre))

// Coiffure et yeux dépendent de la silhouette : on prend la première pièce compatible.
function changerGenre(genre) {
  brouillon.genre = genre
  if (!coiffures.value.some((h) => h.cle === brouillon.coiffure)) brouillon.coiffure = coiffures.value[0]?.cle
  if (!yeux.value.some((y) => y.cle === brouillon.yeux)) brouillon.yeux = yeux.value[0]?.cle
  if (genre === 'femme') brouillon.barbe = null
  stadeApercu.value = Math.min(stadeApercu.value, nbStades.value)
}

function valider() {
  gamification.saveApparence({ ...brouillon })
  gamification.chooseCompanion(espece.value)
  router.push(route.query.depuis === 'onboarding' ? '/aujourd-hui' : '/personnage')
}
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-md); }
.page-header h1 { font-size: var(--text-2xl); }
.subtitle { color: var(--color-ink-soft); font-size: var(--text-sm); margin-top: 4px; }

.apercu {
  position: sticky; top: 0; z-index: 5;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-sm);
  padding: var(--space-md); margin-bottom: var(--space-lg);
}
.stades { display: flex; gap: 6px; }
.stade-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid var(--color-border); background: var(--color-surface); color: var(--color-ink);
  font-weight: 800; cursor: pointer;
}
.stade-btn.active { border-color: var(--color-accent); background: var(--color-accent); color: #fff; }

.bloc { margin-bottom: var(--space-lg); }
.bloc-titre { font-size: var(--text-lg); margin-bottom: var(--space-sm); }
.bloc-aide { font-size: var(--text-sm); color: var(--color-ink-soft); margin-bottom: var(--space-sm); }
.choix-ligne { display: flex; flex-wrap: wrap; gap: 8px; }
.choix-ligne--serre { margin-top: var(--space-sm); }
.chip {
  padding: 10px 16px; min-height: 44px;
  border: 2px solid var(--color-border); border-radius: var(--radius-pill);
  background: var(--color-surface); color: var(--color-ink); font-weight: 700; cursor: pointer;
}
.chip.active { border-color: var(--color-accent); background: var(--color-accent-soft); }
.pastille {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid var(--color-surface); box-shadow: 0 0 0 2px var(--color-border);
  cursor: pointer;
}
.pastille.active { box-shadow: 0 0 0 3px var(--color-accent); }
.grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; }
.vignette {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  padding: 6px; border: 2px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-surface-sunken); cursor: pointer;
}
.vignette img { max-width: 100%; max-height: 100%; object-fit: contain; }
.vignette--texte { font-size: var(--text-xs); font-weight: 700; color: var(--color-ink); }
.vignette.active { border-color: var(--color-accent); background: var(--color-accent-soft); }
.compagnons { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.compagnon-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: var(--space-sm); border: 2px solid transparent; cursor: pointer; color: var(--color-ink);
}
.compagnon-btn.active { border-color: var(--color-accent); }
.compagnon-nom { font-size: var(--text-xs); font-weight: 700; }
.actions { position: sticky; bottom: 96px; display: flex; justify-content: center; }
@media (min-width: 900px) { .actions { bottom: var(--space-md); } }
</style>
