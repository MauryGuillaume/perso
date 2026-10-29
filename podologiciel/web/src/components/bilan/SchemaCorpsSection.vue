<template>
  <div class="schema-corps">
    <div class="schema-layout">

      <!-- Panneau contrôles gauche -->
      <div class="schema-controls card">
        <h3 class="section-title">Schéma corporel</h3>
        <p class="section-desc">
          Cliquez sur les zones prédéfinies ou directement sur le corps pour ajouter une annotation avec flèche.
        </p>

        <!-- Zones prédéfinies -->
        <div class="zones-group">
          <div class="group-label">Zones prédéfinies</div>
          <div class="zones-list">
            <button
              v-for="zone in defaultZones"
              :key="zone.id"
              class="zone-btn"
              :class="{ active: hasAnnotation(zone.id) }"
              @click="toggleZone(zone)"
            >
              <span class="zone-side" :class="zone.side === 'left' ? 'side-left' : 'side-right'">
                {{ zone.side === 'left' ? 'G' : 'D' }}
              </span>
              {{ zone.label }}
              <span v-if="hasAnnotation(zone.id)" class="zone-check">✓</span>
            </button>
          </div>
        </div>

        <!-- Liste des annotations -->
        <div v-if="bilan.schemaAnnotations?.length" class="annotations-panel">
          <div class="group-label">Annotations ({{ bilan.schemaAnnotations.length }})</div>
          <div class="ann-list">
            <div
              v-for="ann in bilan.schemaAnnotations"
              :key="ann.id"
              class="ann-row"
              :class="{ selected: selectedId === ann.id }"
              @click="selectedId = selectedId === ann.id ? null : ann.id"
            >
              <div class="ann-row__left">
                <span class="ann-num" :style="{ background: severityBg(ann.severite), color: severityColor(ann.severite) }">
                  {{ bilan.schemaAnnotations.indexOf(ann) + 1 }}
                </span>
                <div>
                  <div class="ann-label">{{ ann.label }}</div>
                  <div class="ann-comment-preview">{{ ann.commentaire || '—' }}</div>
                </div>
              </div>
              <button class="btn btn-ghost btn-icon btn-sm" @click.stop="removeAnnotation(ann.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Édition de l'annotation sélectionnée -->
        <Transition name="fade">
          <div v-if="selectedAnnotation" class="edit-panel">
            <div class="edit-panel__title">
              Éditer : <strong>{{ selectedAnnotation.label }}</strong>
            </div>
            <div class="form-group">
              <label class="form-label">Commentaire</label>
              <textarea
                :value="selectedAnnotation.commentaire"
                @input="updateComment($event.target.value)"
                class="form-textarea"
                placeholder="Description, intensité, localisation précise…"
                rows="3"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Sévérité</label>
              <div class="sev-row">
                <button
                  v-for="s in severities"
                  :key="s.v"
                  class="sev-btn"
                  :class="{ active: selectedAnnotation.severite === s.v }"
                  :style="selectedAnnotation.severite === s.v ? { background: s.bg, color: s.color, borderColor: s.color } : {}"
                  @click="updateSeverite(s.v)"
                >{{ s.label }}</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Corps SVG -->
      <div class="schema-visual card">
        <div class="body-container">
          <svg
            ref="svgRef"
            class="body-svg"
            viewBox="0 0 440 620"
            xmlns="http://www.w3.org/2000/svg"
            @click="onSvgClick"
          >
            <!-- ── DEFS ──────────────────────────────────────────── -->
            <defs>
              <!-- Arrowhead pour flèche allant VERS LA DROITE (zone gauche) -->
              <marker id="arr-right" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#2B6CB0" />
              </marker>
              <!-- Arrowhead pour flèche allant VERS LA GAUCHE (zone droite) -->
              <marker id="arr-left" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
                <polygon points="8 0, 0 3, 8 6" fill="#52B848" />
              </marker>
              <!-- Arrowhead dynamique par sévérité (rouge) -->
              <marker id="arr-right-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
              <marker id="arr-left-red" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
                <polygon points="8 0, 0 3, 8 6" fill="#ef4444" />
              </marker>
              <marker id="arr-right-orange" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#f97316" />
              </marker>
              <marker id="arr-left-orange" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto">
                <polygon points="8 0, 0 3, 8 6" fill="#f97316" />
              </marker>
            </defs>

            <!-- ── CORPS SVG centré à x=220 ──────────────────────── -->
            <!-- Tête -->
            <ellipse cx="220" cy="52" rx="34" ry="40" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Oreille gauche -->
            <ellipse cx="186" cy="54" rx="6" ry="9" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Oreille droite -->
            <ellipse cx="254" cy="54" rx="6" ry="9" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Cou -->
            <rect x="210" y="90" width="20" height="20" rx="4" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Clavicules -->
            <line x1="170" y1="108" x2="220" y2="112" stroke="var(--color-border)" stroke-width="1.5"/>
            <line x1="270" y1="108" x2="220" y2="112" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Torse -->
            <path d="M168 108 Q158 118 160 135 L160 240 Q160 252 172 255 L268 255 Q280 252 280 240 L280 135 Q282 118 272 108 Z"
              fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Sternum (ligne centrale) -->
            <line x1="220" y1="112" x2="220" y2="235" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>
            <!-- Épaule gauche -->
            <ellipse cx="150" cy="128" rx="20" ry="17" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Épaule droite -->
            <ellipse cx="290" cy="128" rx="20" ry="17" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Bras gauche -->
            <rect x="133" y="142" width="22" height="85" rx="11" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Bras droit -->
            <rect x="285" y="142" width="22" height="85" rx="11" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Avant-bras gauche -->
            <rect x="129" y="225" width="20" height="80" rx="10" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Avant-bras droit -->
            <rect x="291" y="225" width="20" height="80" rx="10" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Main gauche -->
            <ellipse cx="139" cy="318" rx="13" ry="16" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Main droite -->
            <ellipse cx="301" cy="318" rx="13" ry="16" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Bassin -->
            <path d="M165 255 Q145 260 142 275 Q142 290 165 295 L275 295 Q298 290 298 275 Q298 260 275 255 Z"
              fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Cuisse gauche -->
            <rect x="170" y="288" width="34" height="100" rx="15" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Cuisse droite -->
            <rect x="236" y="288" width="34" height="100" rx="15" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Genou gauche -->
            <ellipse cx="187" cy="390" rx="19" ry="14" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Genou droit -->
            <ellipse cx="253" cy="390" rx="19" ry="14" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Jambe gauche -->
            <rect x="175" y="401" width="26" height="100" rx="12" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Jambe droite -->
            <rect x="239" y="401" width="26" height="100" rx="12" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Cheville gauche -->
            <ellipse cx="188" cy="502" rx="16" ry="11" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Cheville droite -->
            <ellipse cx="252" cy="502" rx="16" ry="11" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Pied gauche -->
            <ellipse cx="181" cy="528" rx="24" ry="13" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>
            <!-- Pied droit -->
            <ellipse cx="259" cy="528" rx="24" ry="13" fill="var(--color-surface-alt)" stroke="var(--color-border)" stroke-width="1.5"/>

            <!-- ── ANNOTATIONS avec flèches directionnelles ──────── -->
            <g v-for="(ann, idx) in bilan.schemaAnnotations" :key="ann.id">
              <!-- Flèche et label gauche (G→D) -->
              <template v-if="ann.x <= BODY_CENTER">
                <!-- Ligne horizontale de label_x jusqu'au bord du dot -->
                <line
                  :x1="LABEL_LEFT_X"
                  :y1="computedLabelY(ann, idx)"
                  :x2="ann.x - DOT_R - 2"
                  :y2="ann.y"
                  :stroke="arrowColor(ann.severite)"
                  stroke-width="1.5"
                  :marker-end="`url(#${arrowMarkerId(ann.severite, 'right')})`"
                  stroke-dasharray="0"
                />
                <!-- Ligne verticale guide si y differ -->
                <line
                  v-if="Math.abs(computedLabelY(ann, idx) - ann.y) > 2"
                  :x1="LABEL_LEFT_X + 28"
                  :y1="computedLabelY(ann, idx)"
                  :x2="LABEL_LEFT_X + 28"
                  :y2="ann.y"
                  :stroke="arrowColor(ann.severite)"
                  stroke-width="1"
                  opacity="0.4"
                />
                <!-- Texte label gauche -->
                <text
                  :x="LABEL_LEFT_X - 4"
                  :y="computedLabelY(ann, idx) - 3"
                  text-anchor="end"
                  font-size="9.5"
                  font-weight="600"
                  :fill="arrowColor(ann.severite)"
                  style="user-select:none; pointer-events:none;"
                >{{ truncate(ann.label, 14) }}</text>
                <!-- Numéro -->
                <text
                  :x="LABEL_LEFT_X - 4"
                  :y="computedLabelY(ann, idx) + 9"
                  text-anchor="end"
                  font-size="8"
                  :fill="arrowColor(ann.severite)"
                  opacity="0.7"
                  style="user-select:none; pointer-events:none;"
                >{{ idx + 1 }}</text>
              </template>

              <!-- Flèche et label droit (D→G) -->
              <template v-else>
                <!-- Ligne horizontale du dot jusqu'au label -->
                <line
                  :x1="ann.x + DOT_R + 2"
                  :y1="ann.y"
                  :x2="LABEL_RIGHT_X"
                  :y2="computedLabelY(ann, idx)"
                  :stroke="arrowColor(ann.severite)"
                  stroke-width="1.5"
                  :marker-start="`url(#${arrowMarkerId(ann.severite, 'left')})`"
                />
                <!-- Ligne verticale guide si y differ -->
                <line
                  v-if="Math.abs(computedLabelY(ann, idx) - ann.y) > 2"
                  :x1="LABEL_RIGHT_X - 28"
                  :y1="computedLabelY(ann, idx)"
                  :x2="LABEL_RIGHT_X - 28"
                  :y2="ann.y"
                  :stroke="arrowColor(ann.severite)"
                  stroke-width="1"
                  opacity="0.4"
                />
                <!-- Texte label droit -->
                <text
                  :x="LABEL_RIGHT_X + 4"
                  :y="computedLabelY(ann, idx) - 3"
                  text-anchor="start"
                  font-size="9.5"
                  font-weight="600"
                  :fill="arrowColor(ann.severite)"
                  style="user-select:none; pointer-events:none;"
                >{{ truncate(ann.label, 14) }}</text>
                <text
                  :x="LABEL_RIGHT_X + 4"
                  :y="computedLabelY(ann, idx) + 9"
                  text-anchor="start"
                  font-size="8"
                  :fill="arrowColor(ann.severite)"
                  opacity="0.7"
                  style="user-select:none; pointer-events:none;"
                >{{ idx + 1 }}</text>
              </template>

              <!-- Point / Dot sur le corps -->
              <circle
                :cx="ann.x"
                :cy="ann.y"
                :r="DOT_R"
                :fill="selectedId === ann.id ? arrowColor(ann.severite) : 'white'"
                :stroke="arrowColor(ann.severite)"
                stroke-width="2"
                style="cursor:pointer; transition: fill .15s;"
                @click.stop="selectedId = selectedId === ann.id ? null : ann.id"
              />
              <!-- Numéro dans le dot -->
              <text
                :x="ann.x"
                :y="ann.y + 4"
                text-anchor="middle"
                font-size="8"
                font-weight="800"
                :fill="selectedId === ann.id ? 'white' : arrowColor(ann.severite)"
                style="pointer-events:none; user-select:none;"
              >{{ idx + 1 }}</text>
            </g>

            <!-- Séparateur axe médian (aide visuelle) -->
            <line x1="220" y1="0" x2="220" y2="620" stroke="var(--color-border)" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.2"/>
          </svg>
        </div>
        <div class="schema-legend">
          <span class="leg-item leg-left">
            <svg width="28" height="10"><line x1="2" y1="5" x2="22" y2="5" stroke="#2B6CB0" stroke-width="1.5" marker-end="url(#arr-right-static)"/><defs><marker id="arr-right-static" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0,6 2.5,0 5" fill="#2B6CB0"/></marker></defs></svg>
            Zone gauche (G → D)
          </span>
          <span class="leg-item leg-right">
            <svg width="28" height="10"><line x1="2" y1="5" x2="22" y2="5" stroke="#52B848" stroke-width="1.5" marker-start="url(#arr-left-static)"/><defs><marker id="arr-left-static" markerWidth="6" markerHeight="5" refX="0" refY="2.5" orient="auto"><polygon points="6 0,0 2.5,6 5" fill="#52B848"/></marker></defs></svg>
            Zone droite (D → G)
          </span>
          <span class="leg-item" style="color: var(--color-text-muted)">Cliquez sur le corps pour ajouter</span>
        </div>
      </div>
    </div>

    <!-- Modal ajout annotation personnalisée -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="pendingClick" class="modal-overlay" @click.self="pendingClick = null">
          <div class="modal">
            <h3>Ajouter une annotation</h3>
            <p class="modal-hint">Position : {{ pendingClick.x }}, {{ pendingClick.y }} – {{ pendingClick.x <= BODY_CENTER ? 'côté gauche' : 'côté droit' }}</p>
            <div class="form-group" style="margin-top:14px;">
              <label class="form-label">Zone / Libellé *</label>
              <input v-model="newLabel" type="text" class="form-input" placeholder="Ex: Hallux valgus D, tendon d'Achille G…" ref="labelInput" autofocus />
            </div>
            <div class="form-group" style="margin-top:10px;">
              <label class="form-label">Commentaire</label>
              <textarea v-model="newComment" class="form-textarea" placeholder="Douleur, raideur, déformation…" rows="2" />
            </div>
            <div class="form-group" style="margin-top:10px;">
              <label class="form-label">Sévérité</label>
              <div class="sev-row">
                <button
                  v-for="s in severities"
                  :key="s.v"
                  class="sev-btn"
                  :class="{ active: newSeverite === s.v }"
                  :style="newSeverite === s.v ? { background: s.bg, color: s.color, borderColor: s.color } : {}"
                  @click="newSeverite = s.v"
                >{{ s.label }}</button>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" @click="pendingClick = null">Annuler</button>
              <button class="btn btn-primary" @click="confirmAnnotation" :disabled="!newLabel.trim()">Ajouter la flèche</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useBilanStore } from '@/store/bilans.js'

const props = defineProps({ bilan: Object })
const bilanStore = useBilanStore()
const svgRef = ref(null)
const selectedId = ref(null)
const pendingClick = ref(null)
const labelInput = ref(null)

const newLabel = ref('')
const newComment = ref('')
const newSeverite = ref('modérée')

// ── Constantes layout SVG (viewBox 440×620, corps centré à 220) ──────────────
const BODY_CENTER = 220  // axe médian du corps
const DOT_R = 9          // rayon du point d'annotation
const LABEL_LEFT_X = 112 // fin des labels gauche (arrowhead arrive ici)
const LABEL_RIGHT_X = 328 // début des labels droit

// ── Zones prédéfinies ────────────────────────────────────────────────────────
const defaultZones = [
  { id: 'epaule-g',   label: 'Épaule gauche',   side: 'left',  x: 150, y: 128 },
  { id: 'epaule-d',   label: 'Épaule droite',   side: 'right', x: 290, y: 128 },
  { id: 'bassin-g',   label: 'Bassin gauche',   side: 'left',  x: 172, y: 275 },
  { id: 'bassin-d',   label: 'Bassin droit',    side: 'right', x: 268, y: 275 },
  { id: 'genou-g',    label: 'Genou gauche',    side: 'left',  x: 187, y: 390 },
  { id: 'genou-d',    label: 'Genou droit',     side: 'right', x: 253, y: 390 },
  { id: 'cheville-g', label: 'Cheville gauche', side: 'left',  x: 188, y: 502 },
  { id: 'cheville-d', label: 'Cheville droite', side: 'right', x: 252, y: 502 },
  { id: 'pied-g',     label: 'Pied gauche',     side: 'left',  x: 181, y: 528 },
  { id: 'pied-d',     label: 'Pied droit',      side: 'right', x: 259, y: 528 },
  { id: 'hanche-g',   label: 'Hanche gauche',   side: 'left',  x: 165, y: 255 },
  { id: 'hanche-d',   label: 'Hanche droite',   side: 'right', x: 275, y: 255 },
]

// ── Sévérités ────────────────────────────────────────────────────────────────
const severities = [
  { v: 'légère',  label: 'Légère',  color: '#15803d', bg: '#dcfce7' },
  { v: 'modérée', label: 'Modérée', color: '#92400e', bg: '#fef3c7' },
  { v: 'sévère',  label: 'Sévère',  color: '#991b1b', bg: '#fee2e2' },
]

const arrowColor = (sev) => {
  if (sev === 'sévère') return '#ef4444'
  if (sev === 'modérée') return '#f59e0b'
  return '#22c55e'
}
const arrowMarkerId = (sev, dir) => {
  const c = sev === 'sévère' ? 'red' : sev === 'modérée' ? 'orange' : (dir === 'right' ? 'right' : 'left')
  return `arr-${dir}-${c === 'right' || c === 'left' ? dir === 'right' ? '' : '' : c}`.replace('arr-right-', 'arr-right').replace('arr-left-', 'arr-left')
    .replace('arr-right', sev === 'sévère' ? 'arr-right-red' : sev === 'modérée' ? 'arr-right-orange' : 'arr-right')
    .replace('arr-left', sev === 'sévère' ? 'arr-left-red' : sev === 'modérée' ? 'arr-left-orange' : 'arr-left')
}

// Simplifié:
const getMarker = (sev, dir) => {
  const suffix = sev === 'sévère' ? '-red' : sev === 'modérée' ? '-orange' : ''
  return `arr-${dir}${suffix}`
}

const severityBg = (sev) => severities.find(s => s.v === sev)?.bg || '#f3f4f6'
const severityColor = (sev) => severities.find(s => s.v === sev)?.color || '#6b7280'

// ── Calcul Y des labels pour éviter les chevauchements ──────────────────────
const computedLabelY = (ann, idx) => {
  // On retourne le y naturel de l'annotation, avec léger offset si trop proche
  const others = props.bilan.schemaAnnotations
    .slice(0, idx)
    .filter(a => (a.x <= BODY_CENTER) === (ann.x <= BODY_CENTER)) // même côté
  let y = ann.y
  for (const other of others) {
    const otherLabelY = other._labelY || other.y
    if (Math.abs(y - otherLabelY) < 20) {
      y = otherLabelY + (y >= otherLabelY ? 20 : -20)
    }
  }
  ann._labelY = y
  return y
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const truncate = (s, n) => s?.length > n ? s.slice(0, n) + '…' : s

const hasAnnotation = (zoneId) =>
  props.bilan.schemaAnnotations?.some(a => a.zone === zoneId)

const toggleZone = (zone) => {
  if (hasAnnotation(zone.id)) {
    const ann = props.bilan.schemaAnnotations.find(a => a.zone === zone.id)
    if (ann) removeAnnotation(ann.id)
  } else {
    bilanStore.addSchemaAnnotation(props.bilan.id, {
      zone: zone.id, label: zone.label,
      x: zone.x, y: zone.y,
      commentaire: '', severite: 'modérée'
    })
    nextTick(() => exportSnapshot())
  }
}

const onSvgClick = (e) => {
  const svg = svgRef.value
  if (!svg) return
  const pt = svg.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
  pendingClick.value = { x: Math.round(svgPt.x), y: Math.round(svgPt.y) }
  newLabel.value = ''
  newComment.value = ''
  newSeverite.value = 'modérée'
  nextTick(() => labelInput.value?.focus())
}

const confirmAnnotation = () => {
  if (!newLabel.value.trim() || !pendingClick.value) return
  bilanStore.addSchemaAnnotation(props.bilan.id, {
    zone: 'custom',
    label: newLabel.value.trim(),
    x: pendingClick.value.x,
    y: pendingClick.value.y,
    commentaire: newComment.value.trim(),
    severite: newSeverite.value
  })
  pendingClick.value = null
  nextTick(() => exportSnapshot())
}

const selectedAnnotation = computed(() =>
  props.bilan.schemaAnnotations?.find(a => a.id === selectedId.value) || null
)

const removeAnnotation = (id) => {
  bilanStore.removeSchemaAnnotation(props.bilan.id, id)
  if (selectedId.value === id) selectedId.value = null
  nextTick(() => exportSnapshot())
}

const updateComment = (val) => {
  if (!selectedId.value) return
  bilanStore.updateSchemaAnnotation(props.bilan.id, selectedId.value, { commentaire: val })
  exportSnapshot()
}
const updateSeverite = (sev) => {
  if (!selectedId.value) return
  bilanStore.updateSchemaAnnotation(props.bilan.id, selectedId.value, { severite: sev })
  nextTick(() => exportSnapshot())
}

// ── Export SVG → PNG pour PDF ────────────────────────────────────────────────
const exportSnapshot = () => {
  const svg = svgRef.value
  if (!svg) return
  try {
    const serializer = new XMLSerializer()
    let svgStr = serializer.serializeToString(svg)
    // Inject CSS variables as literal values for the snapshot
    svgStr = svgStr.replace(/var\(--color-surface-alt\)/g, '#F9FAFB')
    svgStr = svgStr.replace(/var\(--color-border\)/g, '#E2E8F0')
    const canvas = document.createElement('canvas')
    canvas.width = 440; canvas.height = 620
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 440, 620)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      bilanStore.updateBilan(props.bilan.id, { schemaImageData: canvas.toDataURL('image/png') })
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  } catch (e) {
    console.warn('Schema snapshot failed', e)
  }
}
</script>

<style scoped>
.schema-corps {}
.schema-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-lg);
  align-items: start;
}

/* Controls */
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-sm); color: var(--color-primary); }
.section-desc { font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-lg); line-height: 1.5; }

.zones-group { margin-bottom: var(--space-md); }
.group-label {
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; color: var(--color-text-muted); margin-bottom: var(--space-sm);
}
.zones-list { display: flex; flex-direction: column; gap: 3px; }
.zone-btn {
  display: flex; align-items: center; gap: var(--space-sm);
  padding: 7px 10px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-surface-alt);
  font-size: var(--text-xs); font-weight: 500; cursor: pointer; text-align: left;
  transition: all var(--transition-fast); color: var(--color-text);
}
.zone-btn:hover { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
.zone-btn.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }
.zone-side {
  width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; flex-shrink: 0;
}
.side-left { background: #dbeafe; color: #2B6CB0; }
.side-right { background: #dcfce7; color: #15803d; }
.zone-check { margin-left: auto; color: var(--color-accent); font-weight: 700; }

/* Annotations list */
.annotations-panel { margin-top: var(--space-md); }
.ann-list { display: flex; flex-direction: column; gap: 3px; }
.ann-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; border-radius: var(--radius-md);
  border: 1px solid transparent; cursor: pointer; transition: all var(--transition-fast);
}
.ann-row:hover { background: var(--color-surface-alt); }
.ann-row.selected { background: var(--color-primary-light); border-color: var(--color-primary); }
.ann-row__left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.ann-num { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; }
.ann-label { font-size: var(--text-xs); font-weight: 600; }
.ann-comment-preview { font-size: 10px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

/* Edit panel */
.edit-panel {
  margin-top: var(--space-md); padding: var(--space-md);
  background: var(--color-primary-light); border-radius: var(--radius-md);
  border: 1px solid var(--color-primary); display: flex; flex-direction: column; gap: var(--space-sm);
}
.edit-panel__title { font-size: var(--text-xs); color: var(--color-primary); }
.sev-row { display: flex; gap: 6px; }
.sev-btn {
  flex: 1; padding: 5px 8px; border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border); font-size: var(--text-xs); font-weight: 600;
  cursor: pointer; background: var(--color-surface); color: var(--color-text-muted);
  transition: all var(--transition-fast);
}
.sev-btn:hover { border-color: var(--color-text-muted); }

/* SVG container */
.schema-visual { display: flex; flex-direction: column; }
.body-container {
  flex: 1; display: flex; align-items: center; justify-content: center;
  background: var(--color-surface-alt); border-radius: var(--radius-md);
  padding: var(--space-md);
}
.body-svg {
  width: 100%; max-width: 520px;
  cursor: crosshair;
  filter: drop-shadow(0 2px 8px rgba(43,108,176,.06));
}
.schema-legend {
  display: flex; align-items: center; gap: var(--space-lg);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-xs); color: var(--color-text-muted);
  flex-wrap: wrap;
}
.leg-item { display: flex; align-items: center; gap: 6px; }
.leg-left { color: #2B6CB0; font-weight: 600; }
.leg-right { color: #52B848; font-weight: 600; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 9990; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
.modal { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-xl); max-width: 440px; width: 100%; box-shadow: var(--shadow-xl); }
.modal h3 { font-size: var(--text-lg); font-weight: 700; }
.modal-hint { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xl); }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .schema-layout { grid-template-columns: 1fr; }
}
</style>
