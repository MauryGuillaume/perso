<template>
  <div class="schema-pied">

    <div class="pied-section-header">
      <div>
        <h3 class="section-title">Schéma des pieds</h3>
        <p class="section-desc">
          Cliquez n'importe où sur un pied pour ajouter une annotation à cet endroit précis.
        </p>
      </div>
      <div v-if="totalAnnotations" class="total-ann-badge">
        {{ totalAnnotations }} annotation{{ totalAnnotations > 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Grille 2×2 des pieds -->
    <div class="pieds-grid">
      <div v-for="view in FOOT_VIEWS" :key="view.id" class="pied-card card">

        <!-- Titre du vue -->
        <div class="pied-card-header">
          <span class="side-badge" :class="view.side">
            {{ view.side === 'gauche' ? 'G' : 'D' }}
          </span>
          <span class="pied-label">{{ view.label }}</span>
          <span v-if="getAnnotations(view.id).length" class="ann-count-badge">
            {{ getAnnotations(view.id).length }}
          </span>
        </div>

        <!-- SVG du pied -->
        <div class="pied-svg-wrap" :ref="el => svgWrapRefs[view.id] = el">
          <svg
            class="pied-svg"
            viewBox="0 0 160 295"
            @click="(e) => onSvgClick(e, view.id)"
          >
            <!-- ── Corps du pied (miroir pour le pied gauche) ── -->
            <g :transform="view.side === 'gauche' ? 'scale(-1,1) translate(-160,0)' : ''">

              <!-- == PLANTAIRE == -->
              <template v-if="view.type === 'plantaire'">
                <!-- Corps pied — arche médiale prononcée côté gauche (médial), bord latéral droit -->
                <path :d="PLANTAIRE_BODY" :fill="footFill" :stroke="footStroke" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                <!-- Orteils : hallux large à gauche (médial), 5e petit à droite (latéral) -->
                <ellipse cx="43"  cy="28"  rx="15"  ry="21"  :fill="footFill" :stroke="footStroke" stroke-width="1.5"/>
                <ellipse cx="67"  cy="17"  rx="10.5" ry="18"  :fill="footFill" :stroke="footStroke" stroke-width="1.4"/>
                <ellipse cx="86"  cy="19"  rx="9"   ry="15.5" :fill="footFill" :stroke="footStroke" stroke-width="1.4"/>
                <ellipse cx="103" cy="27"  rx="7.5" ry="13"  :fill="footFill" :stroke="footStroke" stroke-width="1.3"/>
                <ellipse cx="116" cy="39"  rx="6"   ry="10.5" :fill="footFill" :stroke="footStroke" stroke-width="1.3"/>
                <!-- Voûte plantaire — arche médiale en pointillés -->
                <path d="M 40 124 C 48 155 55 175 58 200" fill="none" stroke="var(--color-text-muted)" stroke-width="1" stroke-dasharray="4,3" opacity="0.35"/>
                <!-- Têtes métatarsiennes (ligne de référence) -->
                <path d="M 30 70 Q 67 60 122 72" fill="none" stroke="var(--color-text-muted)" stroke-width="0.7" stroke-dasharray="3,4" opacity="0.2"/>
              </template>

              <!-- == DORSALE == -->
              <template v-else>
                <!-- Corps pied — les deux bords convergent vers la cheville -->
                <path :d="DORSALE_BODY" :fill="footFill" :stroke="footStroke" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
                <!-- Orteils -->
                <ellipse cx="43"  cy="28"  rx="15"  ry="21"  :fill="footFill" :stroke="footStroke" stroke-width="1.5"/>
                <ellipse cx="67"  cy="17"  rx="10.5" ry="18"  :fill="footFill" :stroke="footStroke" stroke-width="1.4"/>
                <ellipse cx="86"  cy="19"  rx="9"   ry="15.5" :fill="footFill" :stroke="footStroke" stroke-width="1.4"/>
                <ellipse cx="103" cy="27"  rx="7.5" ry="13"  :fill="footFill" :stroke="footStroke" stroke-width="1.3"/>
                <ellipse cx="116" cy="39"  rx="6"   ry="10.5" :fill="footFill" :stroke="footStroke" stroke-width="1.3"/>
                <!-- Ongles -->
                <rect x="32"  y="11" width="22" height="9"   rx="5"   :fill="footFill" :stroke="footStroke" stroke-width="1" opacity="0.9"/>
                <rect x="60"  y="2"  width="15" height="8"   rx="4"   :fill="footFill" :stroke="footStroke" stroke-width="0.9" opacity="0.9"/>
                <rect x="80"  y="6"  width="13" height="7"   rx="3.5" :fill="footFill" :stroke="footStroke" stroke-width="0.9" opacity="0.9"/>
                <rect x="98"  y="15" width="11" height="6.5" rx="3"   :fill="footFill" :stroke="footStroke" stroke-width="0.9" opacity="0.9"/>
                <rect x="112" y="29" width="9"  height="5.5" rx="2.5" :fill="footFill" :stroke="footStroke" stroke-width="0.9" opacity="0.9"/>
                <!-- Tendons métatarsiens (lignes subtiles) -->
                <line x1="43"  y1="49" x2="46"  y2="120" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.2"/>
                <line x1="67"  y1="35" x2="69"  y2="120" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.2"/>
                <line x1="86"  y1="35" x2="87"  y2="120" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.2"/>
                <line x1="103" y1="40" x2="104" y2="120" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.2"/>
                <!-- Malléoles -->
                <ellipse cx="38"  cy="248" rx="14" ry="10" :fill="footFill" :stroke="footStroke" stroke-width="1.3"/>
                <ellipse cx="120" cy="251" rx="12" ry="9"  :fill="footFill" :stroke="footStroke" stroke-width="1.3"/>
              </template>
            </g>

            <!-- ── Labels zones — HORS du groupe miroir pour rester lisibles ── -->
            <g pointer-events="none" font-family="sans-serif">
              <template v-if="view.type === 'plantaire'">
                <text x="80" y="88"  text-anchor="middle" font-size="7.5" fill="var(--color-text-muted)" opacity="0.55">Avant-pied</text>
                <text x="80" y="162" text-anchor="middle" font-size="7"   fill="var(--color-text-muted)" opacity="0.55">Médio-pied</text>
                <text x="80" y="240" text-anchor="middle" font-size="7.5" fill="var(--color-text-muted)" opacity="0.55">Talon</text>
              </template>
              <template v-else>
                <text x="80" y="88"  text-anchor="middle" font-size="7.5" fill="var(--color-text-muted)" opacity="0.55">Avant-pied</text>
                <text x="80" y="162" text-anchor="middle" font-size="7"   fill="var(--color-text-muted)" opacity="0.55">Dos du pied</text>
                <text x="80" y="235" text-anchor="middle" font-size="7.5" fill="var(--color-text-muted)" opacity="0.55">Cheville</text>
              </template>
            </g>

            <!-- ── Annotations ── -->
            <g v-for="(ann, idx) in getAnnotations(view.id)" :key="ann.id">
              <!-- Halo -->
              <circle
                :cx="ann.x" :cy="ann.y" r="16"
                :fill="severityBg(ann.severite)"
                opacity="0.2"
                pointer-events="none"
              />
              <!-- Dot principal -->
              <circle
                :cx="ann.x" :cy="ann.y" r="11"
                :fill="severityBg(ann.severite)"
                stroke="white" stroke-width="2.5"
                class="ann-dot"
                @click.stop="openEditAnnotation(view.id, ann)"
              />
              <!-- Numéro -->
              <text
                :x="ann.x" :y="ann.y + 4"
                text-anchor="middle"
                font-size="9" font-weight="700"
                fill="white"
                pointer-events="none"
                font-family="sans-serif"
              >{{ idx + 1 }}</text>
            </g>

            <!-- Zone de clic transparente -->
            <rect x="0" y="0" width="160" height="295" fill="transparent" class="svg-hit-area"/>
          </svg>
        </div>

        <!-- Liste des annotations de ce pied -->
        <div v-if="getAnnotations(view.id).length" class="ann-mini-list">
          <div
            v-for="(ann, idx) in getAnnotations(view.id)"
            :key="ann.id"
            class="ann-mini-item"
            :class="{ selected: selectedKey === view.id + ann.id }"
            @click="openEditAnnotation(view.id, ann)"
          >
            <span class="ann-mini-num" :style="{ background: severityBg(ann.severite), color: severityColor(ann.severite) }">
              {{ idx + 1 }}
            </span>
            <div class="ann-mini-info">
              <span class="ann-mini-label">{{ ann.label || '—' }}</span>
              <span v-if="ann.commentaire" class="ann-mini-comment">{{ ann.commentaire }}</span>
            </div>
            <button class="btn-ann-del" @click.stop="removeAnnotation(view.id, ann.id)" title="Supprimer">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty hint -->
        <div v-else class="pied-empty-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Cliquez sur le pied pour annoter
        </div>

      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════
         POPOVER : Nouvelle annotation / Édition
    ════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="popover.visible" class="popover-backdrop" @click="cancelPopover"/>
      <Transition name="popover-enter">
        <div
          v-if="popover.visible"
          class="pied-popover"
          :style="popoverStyle"
          @click.stop
        >
          <div class="popover-header">
            <span>{{ popover.isEdit ? 'Modifier l\'annotation' : 'Nouvelle annotation' }}</span>
            <button class="popover-close-btn" @click="cancelPopover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="popover-body">
            <div class="form-group">
              <label class="form-label">Label <span class="required">*</span></label>
              <input
                v-model="popover.label"
                class="form-input"
                placeholder="Cor, durillon, ongle incarné, mycose…"
                ref="popoverInputRef"
                @keyup.enter="confirmAnnotation"
                @keyup.escape="cancelPopover"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Commentaire</label>
              <textarea
                v-model="popover.commentaire"
                class="form-textarea"
                rows="2"
                placeholder="Taille, stade, évolution, traitement…"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Sévérité</label>
              <div class="sev-row">
                <button
                  v-for="s in severities" :key="s.v"
                  class="sev-btn"
                  :class="{ active: popover.severite === s.v }"
                  :style="popover.severite === s.v ? { background: s.bg, color: s.color, borderColor: s.color } : {}"
                  @click="popover.severite = s.v"
                >{{ s.label }}</button>
              </div>
            </div>
          </div>

          <div class="popover-footer">
            <button class="btn btn-ghost btn-sm" @click="cancelPopover">Annuler</button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="!popover.label.trim()"
              @click="confirmAnnotation"
            >{{ popover.isEdit ? 'Mettre à jour' : 'Ajouter' }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { useBilanStore } from '@/store/bilans.js'

const props = defineProps({ bilan: { type: Object, required: true } })

const bilanStore     = useBilanStore()
const svgWrapRefs    = ref({})
const popoverInputRef = ref(null)
const selectedKey    = ref('')

// ── Vues disponibles ──────────────────────────────────────────────────────────
const FOOT_VIEWS = [
  { id: 'plantaire_gauche', label: 'Vue plantaire',  type: 'plantaire', side: 'gauche' },
  { id: 'plantaire_droit',  label: 'Vue plantaire',  type: 'plantaire', side: 'droit'  },
  { id: 'dorsal_gauche',    label: 'Vue dorsale',    type: 'dorsale',   side: 'gauche' },
  { id: 'dorsal_droit',     label: 'Vue dorsale',    type: 'dorsale',   side: 'droit'  },
]

// ── Couleurs pieds ────────────────────────────────────────────────────────────
const footFill   = 'var(--color-surface-alt)'
const footStroke = 'var(--color-border)'

// ── Chemins SVG ───────────────────────────────────────────────────────────────
// ─── PLANTAIRE droite ────────────────────────────────────────────────────────
// Pied droit vu par en-dessous : gros orteil = côté médial = GAUCHE (petit x)
//   • Bord médial (gauche) : arche très creusée — x grimpe de 30 à ~60 au médio-pied
//   • Bord latéral (droite) : léger bombé 5e métatarsien vers x=128, puis droit
//   • Talon large et bien arrondi
// Le pied GAUCHE = miroir SVG scale(-1,1) translate(-160,0)
const PLANTAIRE_BODY =
  'M 30 57 ' +
  // Bord médial — descend avec arche progressive
  'C 27 83, 33 118, 44 150 ' +
  // Arche plantaire — creux médial prononcé (x monte fort)
  'C 49 170, 57 186, 59 206 ' +
  // Sortie arche → talon médial
  'C 57 224, 51 240, 52 256 ' +
  // Courbe talon médial → fond
  'Q 60 278, 80 282 ' +
  // Fond talon → latéral
  'Q 103 278, 120 260 ' +
  // Bord latéral — remontée droite avec légère bosse 5e métatarsien
  'C 128 240, 128 214, 126 190 ' +
  'C 124 168, 126 148, 129 126 ' +
  // 5e métatarsien léger retrait
  'C 128 106, 124 84, 122 57 ' +
  // Fermeture haut (pont métatarsien)
  'C 118 44, 42 43, 30 57 Z'

// ─── DORSALE droite ───────────────────────────────────────────────────────────
// Pied vu par le dessus : pas d'arche visible, les deux bords convergent
// progressivement vers la cheville (bas du SVG) avec malléoles saillantes
const DORSALE_BODY =
  'M 30 54 ' +
  'C 27 80, 31 116, 36 152 ' +
  'C 38 174, 40 196, 42 222 ' +
  'Q 52 262, 80 270 ' +
  'Q 110 264, 120 244 ' +
  'C 127 218, 124 194, 122 170 ' +
  'C 120 148, 122 114, 126 80 ' +
  'C 127 58, 122 43, 122 54 ' +
  'C 118 42, 42 42, 30 54 Z'

// ── Sévérités ─────────────────────────────────────────────────────────────────
const severities = [
  { v: 'légère',   label: 'Légère',   bg: '#bbf7d0', color: '#15803d' },
  { v: 'modérée',  label: 'Modérée',  bg: '#fed7aa', color: '#c2410c' },
  { v: 'sévère',   label: 'Sévère',   bg: '#fecaca', color: '#dc2626' },
]

function severityBg(sev) {
  return severities.find(s => s.v === sev)?.bg || '#bfdbfe'
}
function severityColor(sev) {
  return severities.find(s => s.v === sev)?.color || '#1d4ed8'
}

// ── Helpers annotations ───────────────────────────────────────────────────────
function getAnnotations(viewId) {
  return props.bilan.piedAnnotations?.[viewId] || []
}

const totalAnnotations = computed(() =>
  FOOT_VIEWS.reduce((s, v) => s + getAnnotations(v.id).length, 0)
)

// ── Conversion coordonnées SVG ────────────────────────────────────────────────
function toSvgCoords(event, viewId) {
  const wrap = svgWrapRefs.value[viewId]
  if (!wrap) return { x: 80, y: 140 }
  const svg = wrap.querySelector('svg')
  if (!svg) return { x: 80, y: 140 }
  const pt  = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
  return { x: Math.round(svgP.x), y: Math.round(svgP.y) }
}

// ── Popover état ──────────────────────────────────────────────────────────────
const popover = reactive({
  visible:     false,
  isEdit:      false,
  viewId:      '',
  annotationId: '',
  label:       '',
  commentaire: '',
  severite:    '',
  x: 0, y: 0,           // coords sur le SVG
  screenX: 0, screenY: 0, // coords écran pour positionner le popover
})

const popoverStyle = computed(() => {
  const GAP = 12
  const W   = 300
  const H   = 320  // hauteur estimée du popover
  const vw  = window.innerWidth
  const vh  = window.innerHeight

  // Par défaut : en dessous du clic, centré horizontalement
  let top  = popover.screenY + GAP
  let left = popover.screenX - W / 2

  // Si le popover dépasse en bas → le placer au-dessus du clic
  if (top + H + GAP > vh) {
    top = popover.screenY - H - GAP
  }
  // Garde-fou si même au-dessus c'est trop haut (fenêtre très petite)
  if (top < GAP) top = GAP

  // Contraindre horizontalement dans la fenêtre
  if (left < GAP)              left = GAP
  if (left + W + GAP > vw)     left = vw - W - GAP

  return { position: 'fixed', left: left + 'px', top: top + 'px', width: W + 'px', zIndex: 9995 }
})

// ── Clic sur le SVG → nouvelle annotation ─────────────────────────────────────
function onSvgClick(event, viewId) {
  // Ignorer si clic sur un dot existant
  if (event.target.closest('.ann-dot')) return
  const coords = toSvgCoords(event, viewId)
  // Garder dans les limites du pied (approx)
  if (coords.x < 5 || coords.x > 155 || coords.y < 5 || coords.y > 290) return
  Object.assign(popover, {
    visible:      true,
    isEdit:       false,
    viewId,
    annotationId: '',
    label:        '',
    commentaire:  '',
    severite:     '',
    x:  coords.x,
    y:  coords.y,
    screenX: event.clientX,
    screenY: event.clientY,
  })
  nextTick(() => popoverInputRef.value?.focus())
}

// ── Clic sur un dot existant → édition ────────────────────────────────────────
function openEditAnnotation(viewId, ann) {
  selectedKey.value = viewId + ann.id
  Object.assign(popover, {
    visible:      true,
    isEdit:       true,
    viewId,
    annotationId: ann.id,
    label:        ann.label || '',
    commentaire:  ann.commentaire || '',
    severite:     ann.severite || '',
    x:  ann.x,
    y:  ann.y,
    screenX: window.innerWidth / 2,
    screenY: window.innerHeight / 2,
  })
  nextTick(() => popoverInputRef.value?.focus())
}

function cancelPopover() {
  popover.visible = false
  selectedKey.value = ''
}

function confirmAnnotation() {
  if (!popover.label.trim()) return
  if (popover.isEdit) {
    bilanStore.updatePiedAnnotation(props.bilan.id, popover.viewId, popover.annotationId, {
      label:       popover.label.trim(),
      commentaire: popover.commentaire,
      severite:    popover.severite,
    })
  } else {
    bilanStore.addPiedAnnotation(props.bilan.id, popover.viewId, {
      x:           popover.x,
      y:           popover.y,
      label:       popover.label.trim(),
      commentaire: popover.commentaire,
      severite:    popover.severite,
    })
  }
  cancelPopover()
}

function removeAnnotation(viewId, annId) {
  bilanStore.removePiedAnnotation(props.bilan.id, viewId, annId)
}
</script>

<style scoped>
.schema-pied { display: flex; flex-direction: column; gap: var(--space-lg); }

.pied-section-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md);
}
.section-title { font-size: var(--text-lg); font-weight: 700; margin-bottom: 4px; }
.section-desc  { font-size: var(--text-sm); color: var(--color-text-muted); }

.total-ann-badge {
  flex-shrink: 0; padding: 4px 14px; border-radius: var(--radius-full);
  background: var(--color-primary-light); color: var(--color-primary);
  font-size: var(--text-xs); font-weight: 700; border: 1px solid var(--color-primary);
  white-space: nowrap;
}

/* Grille 2×2 */
.pieds-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: var(--space-lg);
}

.pied-card {
  display: flex; flex-direction: column; gap: 0; overflow: hidden;
  padding: 0;
}

.pied-card-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-alt);
}

.side-badge {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800;
  flex-shrink: 0;
}
.side-badge.gauche { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
.side-badge.droit  { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

.pied-label { font-size: var(--text-sm); font-weight: 600; flex: 1; }

.ann-count-badge {
  padding: 1px 8px; border-radius: var(--radius-full);
  font-size: 10px; font-weight: 700;
  background: var(--color-primary); color: white;
}

/* SVG */
.pied-svg-wrap {
  display: flex; justify-content: center; align-items: center;
  padding: 14px 10px; background: var(--color-surface);
  cursor: crosshair; min-height: 200px;
}
.pied-svg {
  width: 100%; max-width: 160px; height: auto;
  filter: drop-shadow(0 2px 10px rgba(0,0,0,.07));
  transition: filter var(--transition-fast);
}
.pied-svg-wrap:hover .pied-svg { filter: drop-shadow(0 4px 16px rgba(0,0,0,.13)); }

.svg-hit-area { cursor: crosshair; }
.ann-dot { cursor: pointer; transition: r 0.15s; }
.ann-dot:hover { r: 13; }

/* Liste annotations par pied */
.ann-mini-list {
  display: flex; flex-direction: column; gap: 0;
  border-top: 1px solid var(--color-border);
  max-height: 160px; overflow-y: auto;
}
.ann-mini-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 12px; cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}
.ann-mini-item:last-child { border-bottom: none; }
.ann-mini-item:hover      { background: var(--color-primary-light); }
.ann-mini-item.selected   { background: var(--color-primary-light); }

.ann-mini-num {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800;
}
.ann-mini-info  { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ann-mini-label { font-size: var(--text-xs); font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ann-mini-comment { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.btn-ann-del {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 4px;
  border: none; background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-muted); transition: all var(--transition-fast);
  padding: 0;
}
.btn-ann-del:hover { background: #fecaca; color: #dc2626; }

.pied-empty-hint {
  display: flex; align-items: center; gap: 6px; justify-content: center;
  padding: 10px; font-size: var(--text-xs); color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
}

/* ── Popover ── */
.popover-backdrop {
  position: fixed; inset: 0; z-index: 9994;
}
.pied-popover {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}
.popover-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--color-border);
  font-size: var(--text-sm); font-weight: 700;
  background: var(--color-surface-alt);
}
.popover-close-btn {
  width: 24px; height: 24px; border: none; background: transparent;
  cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-muted); transition: all var(--transition-fast);
}
.popover-close-btn:hover { background: var(--color-border); color: var(--color-text); }

.popover-body {
  padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.popover-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--color-border);
}

.sev-row { display: flex; gap: 6px; flex-wrap: wrap; }
.sev-btn {
  padding: 4px 12px; border-radius: var(--radius-full); border: 1px solid var(--color-border);
  font-size: var(--text-xs); font-weight: 600; cursor: pointer; background: var(--color-surface-alt);
  color: var(--color-text-muted); transition: all var(--transition-fast);
}
.sev-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.sev-btn.active { border-width: 1.5px; }

.form-label { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; display: block; }
.required { color: var(--color-danger, #dc2626); }

/* Transitions popover */
.popover-enter-active { transition: opacity 150ms, transform 150ms; }
.popover-enter-from   { opacity: 0; transform: translateY(-6px) scale(0.97); }
.popover-leave-active { transition: opacity 100ms; }
.popover-leave-to     { opacity: 0; }

@media (max-width: 640px) {
  .pieds-grid { grid-template-columns: 1fr; }
}
</style>
