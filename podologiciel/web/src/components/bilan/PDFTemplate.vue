<template>
  <div class="pdf-template" id="pdf-content">

    <!-- ══ EN-TÊTE ══════════════════════════════════════════════ -->
    <div class="pdf-header">
      <div class="pdf-brand">
        <img src="/logo.png" alt="Movyx" class="pdf-logo-img" />
        <div class="pdf-subtitle">{{ bilan.typeBilan === 'soin_pedicurie' ? 'Soin de Pédicurie' : 'Bilan Podologique Complet' }}</div>
      </div>
      <div class="pdf-meta-box">
        <div class="pdf-meta-row"><strong>Date :</strong> {{ formatDate(bilan.date) }}</div>
        <div class="pdf-meta-row"><strong>Généré le :</strong> {{ formatDate(new Date().toISOString()) }}</div>
      </div>
    </div>

    <!-- ══ INFORMATIONS PATIENT ════════════════════════════════ -->
    <div class="pdf-section">
      <div class="pdf-section-title">Informations Patient</div>
      <div class="pdf-patient-card">
        <div class="pdf-patient-grid">
          <div class="pdf-field-row"><span class="pdf-field-label">Nom complet</span><span class="pdf-field-value">{{ patient.prenom }} {{ patient.nom }}</span></div>
          <div v-if="patient.dateNaissance" class="pdf-field-row"><span class="pdf-field-label">Date de naissance</span><span class="pdf-field-value">{{ formatDate(patient.dateNaissance) }} ({{ patientAge }} ans)</span></div>
          <div v-if="patient.taille" class="pdf-field-row"><span class="pdf-field-label">Taille</span><span class="pdf-field-value">{{ patient.taille }} cm</span></div>
          <div v-if="patient.poids" class="pdf-field-row"><span class="pdf-field-label">Poids</span><span class="pdf-field-value">{{ patient.poids }} kg</span></div>
          <div v-if="patient.medecinTraitant" class="pdf-field-row"><span class="pdf-field-label">Médecin traitant</span><span class="pdf-field-value">Dr {{ patient.medecinTraitant }}</span></div>
          <div v-if="patient.telephone" class="pdf-field-row"><span class="pdf-field-label">Téléphone</span><span class="pdf-field-value">{{ patient.telephone }}</span></div>
          <div v-if="patient.email" class="pdf-field-row"><span class="pdf-field-label">Email</span><span class="pdf-field-value">{{ patient.email }}</span></div>
          <div v-if="patient.adresse" class="pdf-field-row pdf-field-row--full"><span class="pdf-field-label">Adresse</span><span class="pdf-field-value">{{ patient.adresse }}</span></div>
        </div>
      </div>
    </div>

    <!-- ══ INTERROGATOIRE ════════════════════════════════════════ -->
    <div v-if="showInterrogatoire" class="pdf-section">
      <div class="pdf-section-title">Interrogatoire</div>
      <div class="pdf-two-col">
        <div class="pdf-col">
          <div v-if="bilan.motifConsultation" class="pdf-field">
            <span class="pdf-field-label">Motif de consultation</span>
            <span class="pdf-field-value">{{ bilan.motifConsultation }}</span>
          </div>
          <div v-if="bilan.antecedentsMedicaux" class="pdf-field">
            <span class="pdf-field-label">Antécédents médicaux</span>
            <span class="pdf-field-value">{{ bilan.antecedentsMedicaux }}</span>
          </div>
          <div v-if="bilan.antecedentsFamiliaux" class="pdf-field">
            <span class="pdf-field-label">Antécédents familiaux</span>
            <span class="pdf-field-value">{{ bilan.antecedentsFamiliaux }}</span>
          </div>
          <div v-if="bilan.maladies" class="pdf-field">
            <span class="pdf-field-label">Maladies</span>
            <span class="pdf-field-value">{{ bilan.maladies }}</span>
          </div>
          <div v-if="bilan.traitementsEnCours" class="pdf-field">
            <span class="pdf-field-label">Traitements en cours</span>
            <span class="pdf-field-value">{{ bilan.traitementsEnCours }}</span>
          </div>
        </div>
        <div class="pdf-col">
          <div v-if="bilan.circumstancesApparition" class="pdf-field">
            <span class="pdf-field-label">Circonstances d'apparition</span>
            <span class="pdf-field-value">{{ bilan.circumstancesApparition }}</span>
          </div>
          <!-- EVA visuelle (uniquement si renseignée et non nulle) -->
          <div v-if="bilan.douleurScore != null && bilan.douleurScore !== 0" class="pdf-field">
            <span class="pdf-field-label">Évaluation de la douleur (EVA)</span>
            <div class="pdf-eva">
              <div class="pdf-eva-bar">
                <div class="pdf-eva-fill" :style="{ width: (bilan.douleurScore * 10) + '%', background: evaColor(bilan.douleurScore) }" />
              </div>
              <span class="pdf-eva-score" :style="{ color: evaColor(bilan.douleurScore) }">{{ bilan.douleurScore }}/10</span>
            </div>
          </div>
          <div v-if="bilan.facteursAggravants" class="pdf-field">
            <span class="pdf-field-label">Facteurs aggravants</span>
            <span class="pdf-field-value">{{ bilan.facteursAggravants }}</span>
          </div>
          <div v-if="bilan.facteursAttenuants" class="pdf-field">
            <span class="pdf-field-label">Facteurs atténuants</span>
            <span class="pdf-field-value">{{ bilan.facteursAttenuants }}</span>
          </div>
        </div>
      </div>

      <!-- Questions personnalisées -->
      <div v-if="bilan.questionsPersonnalisees?.length" style="margin-top:12px;">
        <div class="pdf-sub-title">Questions personnalisées</div>
        <div class="pdf-custom-questions">
          <div v-for="q in bilan.questionsPersonnalisees" :key="q.id" class="pdf-cq-row">
            <span class="pdf-cq-q">{{ q.question }}</span>
            <span class="pdf-cq-a">{{ q.reponse || '—' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ PRÉFÉRENCES MOTRICES ══════════════════════════════════ -->
    <div v-if="showMotricite && hasMotricite" class="pdf-section">
      <div class="pdf-section-title">Préférences Motrices</div>
      <div class="pdf-motrices-grid">
        <div v-if="bilan.lateralite" class="pdf-motrice-item">
          <span class="pdf-motrice-label">Latéralité</span>
          <span class="pdf-motrice-value">{{ bilan.lateralite }}</span>
        </div>
        <div v-if="bilan.jambemotrice" class="pdf-motrice-item">
          <span class="pdf-motrice-label">Jambe motrice</span>
          <span class="pdf-motrice-value">{{ bilan.jambemotrice }}</span>
        </div>
        <div v-if="bilan.oeilMoteur" class="pdf-motrice-item">
          <span class="pdf-motrice-label">Œil moteur</span>
          <span class="pdf-motrice-value">{{ bilan.oeilMoteur }}</span>
        </div>
        <div v-if="bilan.pointMobile" class="pdf-motrice-item">
          <span class="pdf-motrice-label">Point mobile</span>
          <span class="pdf-motrice-value">{{ bilan.pointMobile }}</span>
        </div>
      </div>
      <div v-if="bilan.notesMotrices" class="pdf-field" style="margin-top:8px;">
        <span class="pdf-field-label">Notes motrices</span>
        <span class="pdf-field-value">{{ bilan.notesMotrices }}</span>
      </div>
    </div>

    <!-- ══ SCHÉMA CORPOREL ═══════════════════════════════════════ -->
    <div v-if="showSchema && (bilan.schemaAnnotations?.length || bilan.schemaImageData)" class="pdf-section">
      <div class="pdf-section-title">Schéma Corporel Annoté</div>
      <div class="pdf-schema-layout">
        <div v-if="bilan.schemaImageData" class="pdf-schema-img">
          <img :src="bilan.schemaImageData" alt="Schéma corporel" />
        </div>
        <div v-if="bilan.schemaAnnotations?.length" class="pdf-schema-list">
          <div class="pdf-sub-title" style="margin-bottom:8px;">Détail des annotations</div>
          <div v-for="(ann, i) in bilan.schemaAnnotations" :key="ann.id" class="pdf-ann-row">
            <span class="pdf-ann-num" :style="{ background: severityBg(ann.severite), color: severityColor(ann.severite) }">{{ i + 1 }}</span>
            <div class="pdf-ann-info">
              <div class="pdf-ann-label">{{ ann.label }}</div>
              <div class="pdf-ann-sev" :style="{ color: severityColor(ann.severite) }">Sévérité : {{ ann.severite || '—' }}</div>
              <div v-if="ann.commentaire" class="pdf-ann-comment">{{ ann.commentaire }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ BAROMÈTRIE ════════════════════════════════════════════ -->
    <div v-if="showBarometrie && (bilan.barometrieImage || bilan.barometrieNotes || hasBaroData)" class="pdf-section">
      <div class="pdf-section-title">Analyse Podo-Barométrique</div>
      <div class="pdf-baro-layout">
        <div v-if="bilan.barometrieImage" class="pdf-baro-img">
          <img :src="bilan.barometrieImage" alt="Baromètrie" />
        </div>
        <div class="pdf-baro-data">
          <div v-if="hasBaroData">
            <div class="pdf-sub-title" style="margin-bottom:8px;">Pressions par zone (%)</div>
            <div class="pdf-baro-grid">
              <div class="pdf-baro-foot">
                <div class="pdf-foot-label">Pied Gauche</div>
                <div v-for="(label, i) in zoneLabels" :key="i" class="pdf-baro-zone">
                  <span>{{ label }}</span>
                  <div class="pdf-mini-bar">
                    <div class="pdf-mini-fill" :style="{ width: (bilan.barometrieData[`gauche_g${i}`] || 0) + '%', background: baroColor(bilan.barometrieData[`gauche_g${i}`]) }" />
                  </div>
                  <span>{{ bilan.barometrieData[`gauche_g${i}`] || 0 }}%</span>
                </div>
              </div>
              <div class="pdf-baro-foot">
                <div class="pdf-foot-label">Pied Droit</div>
                <div v-for="(label, i) in zoneLabels" :key="i" class="pdf-baro-zone">
                  <span>{{ label }}</span>
                  <div class="pdf-mini-bar">
                    <div class="pdf-mini-fill" :style="{ width: (bilan.barometrieData[`droit_d${i}`] || 0) + '%', background: baroColor(bilan.barometrieData[`droit_d${i}`]) }" />
                  </div>
                  <span>{{ bilan.barometrieData[`droit_d${i}`] || 0 }}%</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="bilan.barometrieNotes" class="pdf-field" style="margin-top:8px;">
            <span class="pdf-field-label">Notes et interprétation</span>
            <span class="pdf-field-value">{{ bilan.barometrieNotes }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ CHAÎNES GDS ════════════════════════════════════════════ -->
    <div v-if="showChaines && bilan.chainesGDS?.length" class="pdf-section">
      <div class="pdf-section-title">Chaînes Musculaires GDS</div>
      <div class="pdf-chains">
        <span v-for="c in bilan.chainesGDS" :key="c" class="pdf-chain-badge">{{ c }}</span>
      </div>
      <div v-if="bilan.chainesNotes" class="pdf-field" style="margin-top:8px;">
        <span class="pdf-field-label">Notes</span>
        <span class="pdf-field-value">{{ bilan.chainesNotes }}</span>
      </div>
    </div>

    <!-- ══ ANNOTATIONS LIBRES (CANVAS) ═══════════════════════════ -->
    <div v-if="bilan.canvasData" class="pdf-section">
      <div class="pdf-section-title">Annotations Libres</div>
      <div class="pdf-canvas-wrap">
        <img :src="bilan.canvasData" alt="Annotations libres du praticien" class="pdf-canvas-img" />
      </div>
    </div>

    <!-- ══ SCHÉMA DES PIEDS ═══════════════════════════════════════ -->
    <div v-if="showPieds && hasPiedAnnotations" class="pdf-section">
      <div class="pdf-section-title">Schéma des Pieds Annotés</div>
      <div class="pdf-pieds-grid">
        <div v-for="view in piedViews" :key="view.id" class="pdf-pied-col">
          <div class="pdf-pied-head">
            <span class="pdf-pied-badge" :class="view.side">{{ view.side === 'gauche' ? 'G' : 'D' }}</span>
            {{ view.label }}
          </div>
          <div class="pdf-pied-svg-wrap">
            <svg :viewBox="'0 0 160 285'" width="110" height="196" style="display:block;margin:0 auto">
              <g :transform="view.side === 'gauche' ? 'scale(-1,1) translate(-160,0)' : ''">
                <!-- Orteils -->
                <ellipse cx="38"  cy="30"  rx="17" ry="26" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
                <ellipse cx="66"  cy="22"  rx="12" ry="19" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
                <ellipse cx="90"  cy="23"  rx="10" ry="17" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
                <ellipse cx="112" cy="28"  rx="8.5" ry="14" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
                <ellipse cx="130" cy="36"  rx="7"  ry="11" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
                <!-- Corps du pied -->
                <path d="M 21 57 C 17 83 16 116 18 146 C 20 176 28 204 42 232 Q 60 264 82 268 Q 106 268 125 254 C 140 239 149 215 147 188 C 145 160 143 130 140 106 C 140 84 140 69 148 58 C 145 48 139 47 137 54 Z" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.8"/>
              </g>
              <!-- Annotations (coordonnées sans miroir) -->
              <g v-for="(ann, idx) in getPiedAnnotations(view.id)" :key="ann.id">
                <circle :cx="ann.x" :cy="ann.y" r="13" :fill="piedSevBg(ann.severite)" opacity="0.92"/>
                <text
                  :x="ann.x" :y="ann.y"
                  text-anchor="middle"
                  dominant-baseline="central"
                  font-size="9" font-weight="700"
                  fill="white" font-family="sans-serif"
                >{{ idx + 1 }}</text>
              </g>
            </svg>
          </div>
          <div v-if="getPiedAnnotations(view.id).length" class="pdf-pied-anns">
            <div v-for="(ann, idx) in getPiedAnnotations(view.id)" :key="ann.id" class="pdf-pied-ann-row">
              <span class="pdf-pied-ann-num" :style="{ background: piedSevBg(ann.severite), color: '#fff' }">{{ idx + 1 }}</span>
              <div class="pdf-pied-ann-info">
                <strong>{{ ann.label }}</strong>
                <span v-if="ann.commentaire"> — {{ ann.commentaire }}</span>
                <span v-if="ann.severite" class="pdf-pied-sev" :style="{ color: piedSevColor(ann.severite) }"> ({{ ann.severite }})</span>
              </div>
            </div>
          </div>
          <div v-else class="pdf-pied-empty">Aucune annotation</div>
        </div>
      </div>
    </div>

    <!-- ══ NOTES GÉNÉRALES ════════════════════════════════════════ -->
    <div v-if="bilan.notesGenerales" class="pdf-section">
      <div class="pdf-section-title">Notes Générales / Plan de Traitement</div>
      <div class="pdf-notes-text">{{ bilan.notesGenerales }}</div>
    </div>

    <!-- ══ PIED DE PAGE ════════════════════════════════════════════ -->
    <div class="pdf-footer">
      <div>{{ patient.prenom }} {{ patient.nom }} · Examen du {{ formatDate(bilan.date) }}</div>
      <div>Movyx – Document confidentiel</div>
      <div>Généré le {{ formatDate(new Date().toISOString()) }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth.js'

const props = defineProps({ bilan: Object, patient: Object })

const authStore = useAuthStore()
const hiddenTabs = computed(() => authStore.effectiveUser?.customization?.hiddenBuiltinTabs || [])
const isTabVisible = (id) => !hiddenTabs.value.includes(id)

// Section visibility: tab must be visible (not hidden) AND have data
const showInterrogatoire = computed(() => isTabVisible('interrogatoire') && hasInterrogatoire.value)
const showMotricite      = computed(() => isTabVisible('motricite'))
const showBarometrie     = computed(() => isTabVisible('barometrie'))
const showSchema         = computed(() => isTabVisible('schema'))
const showChaines        = computed(() => isTabVisible('chaines'))
const showPieds          = computed(() => isTabVisible('pieds'))

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const patientAge = computed(() => {
  if (!props.patient.dateNaissance) return '—'
  return Math.floor((Date.now() - new Date(props.patient.dateNaissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
})

const hasInterrogatoire = computed(() => !!(
  props.bilan.motifConsultation ||
  props.bilan.antecedentsMedicaux ||
  props.bilan.antecedentsFamiliaux ||
  props.bilan.maladies ||
  props.bilan.traitementsEnCours ||
  props.bilan.circumstancesApparition ||
  (props.bilan.douleurScore != null && props.bilan.douleurScore !== 0) ||
  props.bilan.facteursAggravants ||
  props.bilan.facteursAttenuants ||
  props.bilan.questionsPersonnalisees?.length
))

const hasMotricite = computed(() =>
  props.bilan.lateralite || props.bilan.jambemotrice ||
  props.bilan.oeilMoteur || props.bilan.pointMobile || props.bilan.notesMotrices
)

const hasBaroData = computed(() => {
  if (!props.bilan.barometrieData) return false
  return Object.values(props.bilan.barometrieData).some(v => v > 0)
})

const zoneLabels = ['Talon', 'Médio-pied', 'Métatarses', 'Orteils']

const evaColor = (score) => {
  if (score <= 3) return '#22c55e'
  if (score <= 6) return '#f59e0b'
  if (score <= 8) return '#f97316'
  return '#ef4444'
}

const severityBg = (sev) => {
  if (sev === 'sévère') return '#fee2e2'
  if (sev === 'modérée') return '#fef3c7'
  return '#dcfce7'
}
const severityColor = (sev) => {
  if (sev === 'sévère') return '#991b1b'
  if (sev === 'modérée') return '#92400e'
  return '#15803d'
}

const baroColor = (v) => {
  const n = Number(v)
  if (n < 25) return '#22c55e'
  if (n < 50) return '#84cc16'
  if (n < 75) return '#f59e0b'
  return '#ef4444'
}

// ── Schéma pieds ──────────────────────────────────────────────
const piedViews = [
  { id: 'plantaire_gauche', label: 'Plantaire', type: 'plantaire', side: 'gauche' },
  { id: 'plantaire_droit',  label: 'Plantaire', type: 'plantaire', side: 'droit'  },
  { id: 'dorsal_gauche',    label: 'Dorsale',   type: 'dorsale',   side: 'gauche' },
  { id: 'dorsal_droit',     label: 'Dorsale',   type: 'dorsale',   side: 'droit'  },
]

function getPiedAnnotations(viewId) {
  return props.bilan.piedAnnotations?.[viewId] || []
}

const hasPiedAnnotations = computed(() =>
  piedViews.some(v => getPiedAnnotations(v.id).length > 0)
)

function piedSevBg(sev) {
  if (sev === 'sévère') return '#dc2626'
  if (sev === 'modérée') return '#f97316'
  return '#22c55e'
}
function piedSevColor(sev) {
  if (sev === 'sévère') return '#991b1b'
  if (sev === 'modérée') return '#c2410c'
  return '#15803d'
}
</script>

<style scoped>
/* ── Base ───────────────────────────────────────────────────── */
.pdf-template {
  font-family: 'Inter', Arial, sans-serif;
  font-size: 11px; line-height: 1.5;
  color: #1A2B3C; background: white;
  padding: 32px 36px;
  width: 794px; box-sizing: border-box;
}

/* ── En-tête ────────────────────────────────────────────────── */
.pdf-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px; padding-bottom: 16px;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #2B6CB0 0%, #52B848 100%) 1;
}
.pdf-logo-img { height: 40px; width: auto; }
.pdf-subtitle { font-size: 11px; color: #64748B; margin-top: 4px; font-weight: 500; }
.pdf-meta-box { text-align: right; display: flex; flex-direction: column; gap: 3px; }
.pdf-meta-row { font-size: 10px; }

/* ── Sections ───────────────────────────────────────────────── */
.pdf-section { margin-bottom: 18px; page-break-inside: avoid; }
.pdf-section-title {
  font-size: 11px; font-weight: 800; color: #2B6CB0;
  text-transform: uppercase; letter-spacing: .06em;
  text-align: center;
  margin-bottom: 10px; padding: 4px 8px;
  border-left: 3px solid #52B848;
  background: linear-gradient(90deg, #EBF4FF 0%, transparent 100%);
}
.pdf-sub-title {
  font-size: 10px; font-weight: 700; color: #64748B;
  text-transform: uppercase; letter-spacing: .04em;
}

/* ── Patient ────────────────────────────────────────────────── */
.pdf-patient-card { background: #F8FAFC; border-radius: 8px; padding: 12px; border: 1px solid #E2E8F0; }
.pdf-patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
.pdf-field-row { display: flex; gap: 6px; align-items: baseline; }
.pdf-field-row--full { grid-column: 1 / -1; }
.pdf-field-label { font-weight: 700; color: #64748B; min-width: 110px; flex-shrink: 0; }
.pdf-field-value { color: #1A2B3C; }

/* ── Two-column ─────────────────────────────────────────────── */
.pdf-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.pdf-field { display: flex; flex-direction: column; margin-bottom: 7px; }

/* ── EVA ────────────────────────────────────────────────────── */
.pdf-eva { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.pdf-eva-bar { flex: 1; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; }
.pdf-eva-fill { height: 100%; border-radius: 4px; }
.pdf-eva-score { font-weight: 800; font-size: 13px; min-width: 36px; }

/* ── Custom questions ───────────────────────────────────────── */
.pdf-custom-questions { display: flex; flex-direction: column; gap: 4px; }
.pdf-cq-row { display: flex; gap: 10px; padding: 5px 8px; background: #F8FAFC; border-radius: 4px; }
.pdf-cq-q { font-weight: 700; min-width: 200px; flex-shrink: 0; }
.pdf-cq-a { color: #64748B; }

/* ── Préf. motrices ─────────────────────────────────────────── */
.pdf-motrices-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.pdf-motrice-item { background: #F8FAFC; border-radius: 6px; padding: 8px; text-align: center; border: 1px solid #E2E8F0; }
.pdf-motrice-label { display: block; font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; }
.pdf-motrice-value { display: block; font-size: 13px; font-weight: 800; color: #2B6CB0; margin-top: 2px; }

/* ── Schéma corps ───────────────────────────────────────────── */
.pdf-schema-layout { display: flex; gap: 16px; align-items: flex-start; }
.pdf-schema-img { flex-shrink: 0; }
.pdf-schema-img img { max-width: 220px; border: 1px solid #E2E8F0; border-radius: 8px; }
.pdf-schema-list { flex: 1; }
.pdf-ann-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start; }
.pdf-ann-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; }
.pdf-ann-label { font-weight: 700; font-size: 11px; }
.pdf-ann-sev { font-size: 10px; font-weight: 600; }
.pdf-ann-comment { font-size: 10px; color: #64748B; margin-top: 2px; }

/* ── Baromètrie ─────────────────────────────────────────────── */
.pdf-baro-layout { display: flex; gap: 16px; align-items: flex-start; }
.pdf-baro-img img { max-width: 250px; border: 1px solid #E2E8F0; border-radius: 6px; }
.pdf-baro-data { flex: 1; }
.pdf-baro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pdf-foot-label { font-size: 10px; font-weight: 700; margin-bottom: 6px; text-align: center; padding: 2px; background: #EBF4FF; border-radius: 4px; color: #2B6CB0; }
.pdf-baro-zone { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 10px; }
.pdf-baro-zone span:first-child { min-width: 72px; }
.pdf-baro-zone span:last-child { min-width: 28px; text-align: right; font-weight: 600; }
.pdf-mini-bar { flex: 1; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden; }
.pdf-mini-fill { height: 100%; border-radius: 3px; }

/* ── Chaînes GDS ────────────────────────────────────────────── */
.pdf-chains { display: flex; flex-wrap: wrap; gap: 6px; }
.pdf-chain-badge { padding: 3px 10px; background: #EBF4FF; color: #2B6CB0; border-radius: 99px; font-size: 10px; font-weight: 700; }

/* ── Canvas annotations ─────────────────────────────────────── */
.pdf-canvas-wrap { border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
.pdf-canvas-img { width: 100%; max-height: 350px; object-fit: contain; display: block; background: white; }

/* ── Notes ──────────────────────────────────────────────────── */
.pdf-notes-text { white-space: pre-wrap; line-height: 1.7; color: #1A2B3C; padding: 10px; background: #F8FAFC; border-radius: 6px; border: 1px solid #E2E8F0; }

/* ── Schéma pieds ───────────────────────────────────────────── */
.pdf-pieds-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  align-items: start;   /* columns auto-size to content */
}
.pdf-pied-col {
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  /* no overflow:hidden — let annotation list expand freely */
}
.pdf-pied-head {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 8px; background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  font-size: 9px; font-weight: 700; color: #64748B;
}
.pdf-pied-badge {
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800; flex-shrink: 0;
}
.pdf-pied-badge.gauche { background: #dbeafe; color: #1d4ed8; }
.pdf-pied-badge.droit  { background: #dcfce7; color: #15803d; }
.pdf-pied-svg-wrap { padding: 6px; background: white; }
.pdf-pied-anns {
  padding: 6px 8px;
  display: flex; flex-direction: column; gap: 4px;
  border-top: 1px solid #E2E8F0; background: #F8FAFC;
}
.pdf-pied-ann-row { display: flex; align-items: flex-start; gap: 5px; font-size: 9px; }
.pdf-pied-ann-num {
  width: 14px; height: 14px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800; flex-shrink: 0;
}
.pdf-pied-ann-info { flex: 1; line-height: 1.4; }
.pdf-pied-sev { font-style: italic; }
.pdf-pied-empty { padding: 6px 8px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #E2E8F0; }

/* ── Pied de page ───────────────────────────────────────────── */
.pdf-footer {
  display: flex; justify-content: space-between;
  font-size: 9px; color: #A0AEC0; margin-top: 20px;
  padding-top: 10px; border-top: 1px solid #E2E8F0;
}
</style>
