<template>
  <svg ref="svgRef" class="semelle-svg" :class="{ interactive }" :viewBox="`${-MARGE} ${-MARGE} ${W + 2 * MARGE} ${L + 2 * MARGE}`"
       :width="echelle1 ? `${W + 2 * MARGE}mm` : null" :height="echelle1 ? `${L + 2 * MARGE}mm` : null"
       xmlns="http://www.w3.org/2000/svg" @pointermove="deplace" @pointerup="lacher" @pointercancel="lacher" @pointerdown.self="emit('selectionner', null)">
    <defs>
      <clipPath :id="idClip"><path :d="contour" /></clipPath>
      <pattern :id="idHachures" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="#dc2626" stroke-width="0.6" />
      </pattern>
      <linearGradient v-for="c in couleursCoins" :id="idDegrade(c)" :key="c" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" :stop-color="c" stop-opacity="0.85" /><stop offset="1" :stop-color="c" stop-opacity="0.08" />
      </linearGradient>
    </defs>

    <!-- Semelle -->
    <path :d="contour" class="contour" @pointerdown="emit('selectionner', null)" />
    <g v-if="grille" :clip-path="`url(#${idClip})`" class="grille">
      <line v-for="y in lignesY" :key="'y' + y" :x1="-MARGE" :x2="W + MARGE" :y1="y" :y2="y" />
      <line v-for="x in lignesX" :key="'x' + x" :y1="-MARGE" :y2="L + MARGE" :x1="x" :x2="x" />
    </g>

    <!-- Éléments -->
    <g v-for="e in elements" :key="e.id" class="element" :class="{ choisi: e.id === choisi }"
       :transform="`translate(${pos(e)[0]} ${pos(e)[1]})`" @pointerdown.stop="saisir($event, e)">
      <g :transform="`${cote === 'G' ? 'scale(-1 1) ' : ''}rotate(${-(e.rotation || 0)})`">
        <template v-if="forme(e) === 'barre'">
          <rect :x="-e.largeur / 2" :y="-e.hauteur / 2" :width="e.largeur" :height="e.hauteur" :rx="Math.min(e.hauteur / 2, 5)" :fill="couleur(e)" fill-opacity="0.55" :stroke="couleur(e)" stroke-width="0.6" />
        </template>
        <ellipse v-else-if="forme(e) === 'ovale'" :rx="e.largeur / 2" :ry="e.hauteur / 2" :fill="couleur(e)" fill-opacity="0.5" :stroke="couleur(e)" stroke-width="0.6" />
        <path v-else-if="forme(e) === 'demi'" :d="`M${-e.largeur / 2},${-e.hauteur / 2} A${e.largeur},${e.hauteur / 2} 0 0 1 ${-e.largeur / 2},${e.hauteur / 2} Z`"
              :fill="couleur(e)" fill-opacity="0.5" :stroke="couleur(e)" stroke-width="0.6" />
        <template v-else-if="forme(e) === 'coin'">
          <!-- Biseau : plein du côté épais (interne pour un supinateur, externe pour un pronateur) -->
          <rect :x="-e.largeur / 2" :y="-e.hauteur / 2" :width="e.largeur" :height="e.hauteur" rx="3"
                :fill="`url(#${idDegrade(couleur(e))})`" :stroke="couleur(e)" stroke-width="0.6"
                :transform="epaisExterne(e) ? 'scale(-1 1)' : null" />
        </template>
        <ellipse v-else-if="forme(e) === 'evidement'" :rx="e.largeur / 2" :ry="e.hauteur / 2" :fill="`url(#${idHachures})`" stroke="#dc2626" stroke-width="0.6" stroke-dasharray="2 1.5" />
        <rect v-else :x="-e.largeur / 2" :y="-e.hauteur / 2" :width="e.largeur" :height="e.hauteur" rx="4" :fill="couleur(e)" fill-opacity="0.45" :stroke="couleur(e)" stroke-width="0.6" />
        <rect v-if="e.id === choisi" class="cadre" :x="-e.largeur / 2 - 1.5" :y="-e.hauteur / 2 - 1.5" :width="e.largeur + 3" :height="e.hauteur + 3" rx="2" />
      </g>
      <text v-if="etiquettes" class="etiquette" text-anchor="middle" dominant-baseline="central">{{ abbr(e) }}<tspan v-if="e.epaisseur" class="ep"> {{ e.epaisseur }}</tspan></text>
    </g>

    <!-- Repères -->
    <g v-if="MARGE >= 6" class="reperes">
      <text :x="W / 2" :y="L + MARGE - 1.5" text-anchor="middle">Talon</text>
      <text :x="cote === 'G' ? W + MARGE - 1 : -MARGE + 1" :y="L * 0.45" :text-anchor="cote === 'G' ? 'end' : 'start'" :transform="`rotate(-90 ${cote === 'G' ? W + MARGE - 3 : -MARGE + 3} ${L * 0.45})`">interne</text>
      <text :x="cote === 'G' ? -MARGE + 1 : W + MARGE - 1" :y="L * 0.45" :text-anchor="cote === 'G' ? 'start' : 'end'" :transform="`rotate(-90 ${cote === 'G' ? -MARGE + 3 : W + MARGE - 3} ${L * 0.45})`">externe</text>
    </g>
  </svg>
</template>

<script setup>
import { ref, computed } from 'vue'
import { cheminContour, longueurSemelle, largeurSemelle, versMm, depuisMm, elementType } from '@/utils/semelles.js'

const props = defineProps({
  cote: { type: String, default: 'D' },
  pointure: { type: [Number, String], default: 40 },
  elements: { type: Array, default: () => [] },
  choisi: { type: String, default: null },
  interactive: { type: Boolean, default: false },
  grille: { type: Boolean, default: true },
  etiquettes: { type: Boolean, default: true },
  echelle1: { type: Boolean, default: false },   // largeur et hauteur en mm réels (impression 1:1)
  marge: { type: Number, default: 8 },            // mm autour de la semelle (petite à l'impression 1:1)
})
const emit = defineEmits(['selectionner', 'deplacer'])

const MARGE = props.marge
const uid = Math.random().toString(36).slice(2, 8)
const idClip = `clip-${uid}`
const idHachures = `hach-${uid}`
const idDegrade = c => `deg-${uid}-${c.slice(1)}`

const svgRef = ref(null)
const L = computed(() => longueurSemelle(props.pointure))
const W = computed(() => largeurSemelle(props.pointure))
const contour = computed(() => cheminContour(props.cote, props.pointure))
const lignesY = computed(() => Array.from({ length: Math.floor(L.value / 10) + 1 }, (_, i) => i * 10))
const lignesX = computed(() => Array.from({ length: Math.floor(W.value / 10) + 1 }, (_, i) => i * 10))
const couleursCoins = computed(() => [...new Set(props.elements.filter(e => forme(e) === 'coin').map(couleur))])

const forme = e => elementType(e.type).forme
const couleur = e => elementType(e.type).couleur
const abbr = e => elementType(e.type).abbr
const epaisExterne = e => elementType(e.type).epaisDe === 'externe'
const pos = e => versMm(e.u, e.v, props.cote, props.pointure)

// ── Glisser un élément ───────────────────────────────────────────────────────
let saisi = null
function pointSvg(ev) {
  const m = svgRef.value?.getScreenCTM()
  if (!m) return null
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse())
  return [p.x, p.y]
}
function saisir(ev, e) {
  emit('selectionner', e.id)
  if (!props.interactive) return
  const p = pointSvg(ev)
  if (!p) return
  const [x, y] = pos(e)
  saisi = { id: e.id, dx: x - p[0], dy: y - p[1] }
  svgRef.value?.setPointerCapture?.(ev.pointerId)
}
function deplace(ev) {
  if (!saisi) return
  const p = pointSvg(ev)
  if (!p) return
  const [u, v] = depuisMm(p[0] + saisi.dx, p[1] + saisi.dy, props.cote, props.pointure)
  emit('deplacer', { id: saisi.id, u: Math.round(Math.min(1.2, Math.max(-0.2, u)) * 1000) / 1000, v: Math.round(Math.min(1.1, Math.max(-0.1, v)) * 1000) / 1000 })
}
function lacher() { saisi = null }
</script>

<style scoped>
.semelle-svg { display: block; max-width: 100%; height: auto; user-select: none; touch-action: none; overflow: visible; }
.contour { fill: #f8fafc; stroke: #0f172a; stroke-width: 0.8; }
.grille line { stroke: #cbd5e1; stroke-width: 0.15; }
.element { cursor: default; }
.interactive .element { cursor: grab; }
.cadre { fill: none; stroke: #0f172a; stroke-width: 0.5; stroke-dasharray: 1.5 1; }
.etiquette { font: 700 4px system-ui, sans-serif; fill: #0f172a; pointer-events: none; paint-order: stroke; stroke: #fff; stroke-width: 0.8px; }
.etiquette .ep { font-weight: 400; font-size: 3.2px; }
.reperes text { font: 3.4px system-ui, sans-serif; fill: #64748b; }
</style>
