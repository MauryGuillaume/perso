<template>
  <div class="perso" :style="{ width: largeur + 'px', height: size + 'px' }" role="img" :aria-label="`Personnage, stade ${stade} sur ${CORPS[a.genre].length}`">
    <div class="perso-echelle" :style="echelle">
      <div class="perso-corps" :class="{ evolution: enEvolution, vivant: anime }" :style="{ width: corps.w + 'px', height: corps.h + 'px' }">
        <img v-for="c in calques" :key="c.cle" :src="c.src" :class="['calque', c.classe]" :style="c.style" alt="" draggable="false" />
      </div>
    </div>
    <span v-if="enEvolution" class="eclats" aria-hidden="true"><i v-for="n in 16" :key="n" :style="eclat(n)" /></span>
  </div>
</template>

<script setup>
// Personnage en calques : corps du stade (6 stades homme, 4 femme), peau, tenues, nez, bouche, yeux, barbe, coiffure.
// Change de stade avec une animation d'évolution ; respire, cligne des yeux et bouge les cheveux.
import { computed, ref, watch } from 'vue'
import { teinter, recolorerPeau, recolorerOeil } from '@/avatar/recoloration.js'
import {
  url, CORPS, COIFFURES, BARBES, YEUX, BOUCHES, NEZ, PEAUX, COULEURS_CHEVEUX, COULEURS_YEUX,
  APPARENCE_DEFAUT, stadeDuNiveau, tenuesPortees,
} from '@/avatar/apparence.js'

const props = defineProps({
  level: { type: Number, default: 1 },
  // Force un stade (1 à 6 pour l'homme, 1 à 4 pour la femme) au lieu de le déduire du niveau
  stade: { type: Number, default: null },
  apparence: { type: Object, default: () => ({}) },
  size: { type: Number, default: 260 }, // hauteur en px
  anime: { type: Boolean, default: true },
})

const HAUTEUR_REF = 640
const a = computed(() => ({ ...APPARENCE_DEFAUT, ...props.apparence }))
const stade = computed(() => Math.min(props.stade ?? stadeDuNiveau(props.level, a.value.genre), CORPS[a.value.genre].length))
const corps = computed(() => CORPS[a.value.genre][stade.value - 1])
const k = computed(() => props.size / HAUTEUR_REF)
const largeur = computed(() => Math.ceil(Math.max(...CORPS[a.value.genre].map((c) => c.w)) * k.value))
const echelle = computed(() => ({ transform: `translateX(-50%) scale(${k.value})` }))

// repères de la tête du stade : largeur w, hauteur estimée hh
const tete = computed(() => {
  const c = corps.value
  return { w: c.teteLargeur, hh: c.teteLargeur * 1.3, haut: c.teteHaut, cx: c.teteCx, pic: c.tetePic }
})
// largeur médiane d'une planche : garde les écarts de taille entre pièces (grand cri, petite moue)
const mediane = (l) => [...l].map((x) => x.w).sort((x, y) => x - y)[Math.floor(l.length / 2)]
const L_BOUCHE = mediane(BOUCHES)
const L_NEZ = mediane(NEZ)

const calques = ref([])
let tour = 0
watch([corps, a], async () => {
  const n = ++tour
  const t = tete.value, c = corps.value, ap = a.value
  const cheveux = COULEURS_CHEVEUX[ap.couleurCheveux] ?? COULEURS_CHEVEUX.brun
  const liste = [{
    cle: 'corps', src: await recolorerPeau(url(`personnage/${ap.genre}/corps-${c.stade}.webp`), url(`personnage/${ap.genre}/peau-${c.stade}.webp`), PEAUX[ap.peau] ?? PEAUX.doree),
    style: { left: 0, top: 0, width: c.w + 'px' },
  }]
  // tenues : calques posés en coordonnées du corps ; ce qui dépasse au-dessus du menton (casque, coiffe) va par-dessus les cheveux
  const habits = tenuesPortees(ap).flatMap((tn) => (tn.stades[c.stade] ?? []).map((cal, i) => ({ ...cal, cle: `${tn.cle}-${i}` })))
  const calque = (cal) => ({ cle: cal.cle, classe: 'tenue', src: url(cal.fichier), style: { left: cal.x + 'px', top: cal.y + 'px', width: cal.w + 'px' } })
  habits.filter((h) => h.ordre < 10).sort((x, y) => x.ordre - y.ordre).forEach((h) => liste.push(calque(h)))
  const barbe = ap.genre === 'homme' && BARBES.find((b) => b.cle === ap.barbe)
  if (barbe) {
    const bw = t.w * 1.02
    liste.push({ cle: 'barbe', src: await teinter(url(barbe.fichier), cheveux), style: { left: t.cx - bw / 2 + 'px', top: t.haut + t.hh * 0.52 + 'px', width: bw + 'px' } })
  }
  const nez = NEZ.find((x) => x.cle === ap.nez) ?? NEZ[0]
  const nw = t.w * 0.16 * (nez.w / L_NEZ)
  liste.push({ cle: 'nez', src: url(nez.fichier), style: { left: t.cx - nw / 2 + 'px', top: t.haut + t.hh * 0.6 - (nez.h * nw) / nez.w / 2 + 'px', width: nw + 'px' } })
  const bouche = BOUCHES.find((x) => x.cle === ap.expression) ?? BOUCHES[0]
  const bw2 = t.w * 0.4 * (bouche.w / L_BOUCHE)
  liste.push({ cle: 'bouche', src: url(bouche.fichier), style: { left: t.cx - bw2 / 2 + 'px', top: t.haut + t.hh * 0.73 - (bouche.h * bw2) / bouche.w / 2 + 'px', width: bw2 + 'px' } })
  const yeux = YEUX.find((y) => y.cle === ap.yeux) ?? YEUX[0]
  for (const [i, o] of yeux.oeil.entries()) {
    const ew = t.w * 0.34, s = ew / o.w
    liste.push({
      cle: 'oeil' + i, classe: 'oeil',
      src: await recolorerOeil(url(o.fichier), url(o.iris), COULEURS_YEUX[ap.couleurYeux] ?? COULEURS_YEUX.marron, cheveux),
      style: { left: t.cx + (i ? 1 : -1) * t.w * 0.2 - ew / 2 + 'px', top: t.haut + t.hh * 0.5 - o.h * s * 0.6 + 'px', width: ew + 'px' },
    })
  }
  // coiffure inconnue (ancienne clé f… des premières planches) : première coiffure de la silhouette
  const coiffure = COIFFURES.find((h) => h.cle === ap.coiffure && h.genre === ap.genre) ?? COIFFURES.find((h) => h.genre === ap.genre && h.type === 'face')
  if (coiffure?.type === 'face') {
    // coiffure dessinée autour d'un visage : on cale ce visage sur la tête du corps
    // (largeur du visage, et haut du crâne pour qu'il ne reste pas de trou sous les cheveux)
    // calage « pic » : sur la ligne la plus large du visage (coiffures à frange, qui cachent le haut du front)
    const pic = coiffure.calage === 'pic'
    const s = pic ? c.teteLargeur / coiffure.visageLargeur : c.teteLargeurHaut / coiffure.visageLargeurHaut
    const top = pic ? t.pic - coiffure.visagePic * s : t.haut - coiffure.visageHaut * s
    const style = { left: t.cx - coiffure.visageCx * s + 'px', top: top + 'px', width: coiffure.w * s + 'px' }
    liste.push({ cle: 'cheveux', classe: 'cheveux', src: await teinter(url(coiffure.fichier), cheveux), style })
    // cheveux de derrière la tête, sous le corps : bouchent les vides autour du crâne
    if (coiffure.fond) liste.unshift({ cle: 'cheveux-fond', classe: 'cheveux', src: await teinter(url(coiffure.fond), cheveux), style })
  } else if (coiffure) {
    const s = (t.w * 1.12) / coiffure.craneLargeur
    liste.push({
      cle: 'cheveux', classe: 'cheveux', src: await teinter(url(coiffure.fichier), cheveux),
      style: { left: t.cx - coiffure.craneCx * s + 'px', top: t.haut - t.hh * 0.2 + 'px', width: coiffure.w * s + 'px' },
    })
  }
  habits.filter((h) => h.ordre >= 10).forEach((h) => liste.push(calque(h)))
  if (n === tour) calques.value = liste
}, { immediate: true, deep: true })

// Animation d'évolution quand le stade monte
const enEvolution = ref(false)
watch(stade, (nouveau, ancien) => {
  if (nouveau <= ancien || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  enEvolution.value = false
  requestAnimationFrame(() => { enEvolution.value = true })
  setTimeout(() => { enEvolution.value = false }, 1500)
})
function eclat(n) {
  const ang = (n / 16) * Math.PI * 2, r = props.size * (0.35 + ((n * 37) % 10) / 40)
  return { '--x': Math.cos(ang) * r + 'px', '--y': Math.sin(ang) * r + 'px' }
}
</script>

<style scoped>
.perso { position: relative; display: inline-block; }
.perso-echelle { position: absolute; left: 50%; bottom: 0; transform-origin: 50% 100%; }
.perso-corps { position: relative; transform-origin: 50% 100%; }
.calque { position: absolute; display: block; max-width: none; pointer-events: none; user-select: none; }
.vivant { animation: respire 3.4s ease-in-out infinite; }
.vivant .cheveux { transform-origin: 50% 10%; animation: ondule 4.6s ease-in-out infinite; }
.vivant .oeil { transform-origin: 50% 62%; animation: cligne 4.2s infinite; }
@keyframes respire { 50% { transform: scale(1.006, 1.012); } }
@keyframes ondule { 25% { transform: rotate(0.7deg); } 75% { transform: rotate(-0.7deg); } }
@keyframes cligne { 0%, 93%, 100% { transform: scaleY(1); } 95.5% { transform: scaleY(0.12); } }
.evolution { animation: evolue 1.5s ease-in-out; }
@keyframes evolue {
  15% { filter: brightness(0) invert(1) drop-shadow(0 0 14px #e3a93e); transform: scale(1); }
  30% { transform: scale(1.06); } 45% { transform: scale(0.96); }
  60% { transform: scale(1.08); filter: brightness(0) invert(1) drop-shadow(0 0 28px #e3a93e); }
  80% { filter: brightness(0) invert(1) drop-shadow(0 0 10px #e3a93e); transform: scale(1); }
  100% { filter: none; }
}
.eclats { position: absolute; left: 50%; top: 45%; }
.eclats i { position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #e3a93e; box-shadow: 0 0 10px #e3a93e; opacity: 0; animation: eclat 0.9s 0.75s ease-out forwards; }
@keyframes eclat { from { transform: translate(0, 0) scale(1); opacity: 1; } to { transform: translate(var(--x), var(--y)) scale(0.2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .vivant, .vivant .cheveux, .vivant .oeil, .evolution { animation: none; } }
</style>
