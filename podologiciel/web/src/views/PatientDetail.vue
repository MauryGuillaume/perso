<template>
  <div class="patient-detail fade-in">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <RouterLink to="/patients" class="breadcrumb-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Répertoire
      </RouterLink>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      <span>{{ isNew ? 'Nouveau patient' : patientName }}</span>
    </div>

    <div class="detail-layout">
      <!-- ── FICHE PATIENT ──────────────────────────────────────────── -->
      <div>
        <div class="card patient-form-card">
          <!-- Avatar + actions -->
          <div class="patient-header">
            <div class="patient-avatar-lg" :style="{ background: avatarBg }">
              {{ initials }}
            </div>
            <div class="patient-header-info">
              <h2 class="patient-name-lg">{{ patientName }}</h2>
              <div v-if="!isNew" class="patient-header-meta">
                <span v-if="form.dateNaissance" class="meta-chip">{{ computedAge }} ans</span>

                <span class="meta-chip badge-neutral">{{ patientBilans.length }} bilan(s)</span>
              </div>
            </div>
            <div class="patient-header-actions">
              <RouterLink
                v-if="!isNew"
                :to="{ name: 'Facturation', query: { patientId: patientId } }"
                class="btn btn-accent"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Facturation
              </RouterLink>
              <button class="btn btn-primary" @click="savePatient">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                Enregistrer
              </button>
            </div>
          </div>

          <hr class="divider" />

          <!-- Formulaire -->
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nom *</label>
              <input v-model="form.nom" type="text" class="form-input" placeholder="DUPONT" />
            </div>
            <div class="form-group">
              <label class="form-label">Prénom *</label>
              <input v-model="form.prenom" type="text" class="form-input" placeholder="Jean" />
            </div>
            <div class="form-group">
              <label class="form-label">Date de naissance</label>
              <input v-model="form.dateNaissance" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Téléphone</label>
              <input v-model="form.telephone" type="tel" class="form-input" placeholder="06 00 00 00 00" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" class="form-input" placeholder="jean@email.fr" />
            </div>
            <div class="form-group">
              <label class="form-label">Médecin traitant</label>
              <input v-model="form.medecinTraitant" type="text" class="form-input" placeholder="Dr Martin" />
            </div>
            <div class="form-group">
              <label class="form-label">Taille (cm)</label>
              <input v-model="form.taille" type="number" class="form-input" placeholder="175" min="50" max="250" />
            </div>
            <div class="form-group">
              <label class="form-label">Poids (kg)</label>
              <input v-model="form.poids" type="number" class="form-input" placeholder="70" min="10" max="300" />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Adresse</label>
              <input v-model="form.adresse" type="text" class="form-input" placeholder="1 rue de la paix, 75001 Paris" />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Notes administratives</label>
              <textarea v-model="form.notesAdmin" class="form-textarea" placeholder="Mutuelle, référence dossier, particularités…" rows="2" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── HISTORIQUE CONSULTATIONS ──────────────────────────────── -->
      <div v-if="!isNew">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Historique des consultations</h3>
            <RouterLink :to="`/patients/${patientId}/bilans/new`" class="btn btn-accent btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouvel examen
            </RouterLink>
          </div>

          <!-- Statistiques rapides -->
          <div v-if="patientBilans.length" class="consult-stats">
            <div class="cs-item">
              <div class="cs-n">{{ patientBilans.length }}</div>
              <div class="cs-l">Consultations</div>
            </div>
            <div class="cs-item">
              <div class="cs-n">{{ finalizedCount }}</div>
              <div class="cs-l">Finalisées</div>
            </div>
            <div class="cs-item">
              <div class="cs-n">{{ avgEva }}</div>
              <div class="cs-l">EVA moy.</div>
            </div>
            <div class="cs-item">
              <div class="cs-n">{{ firstConsult }}</div>
              <div class="cs-l">1ère consult.</div>
            </div>
          </div>

          <!-- Timeline des bilans -->
          <div v-if="patientBilans.length" class="timeline">
            <div
              v-for="bilan in patientBilans"
              :key="bilan.id"
              class="timeline-item"
              @click="router.push(`/bilans/${bilan.id}`)"
            >
              <div class="tl-dot" :class="bilan.statut === 'finalisé' ? 'tl-dot--final' : 'tl-dot--draft'" />
              <div class="tl-content">
                <div class="tl-header">
                  <div class="tl-date">{{ formatDate(bilan.date) }}</div>
                  <span class="badge" :class="bilan.statut === 'finalisé' ? 'badge-success' : 'badge-warning'">
                    {{ bilan.statut }}
                  </span>
                </div>
                <div class="tl-motif">{{ bilan.motifConsultation || 'Aucun motif renseigné' }}</div>
                <div class="tl-meta">
                  <span v-if="bilan.douleurScore !== undefined" class="tl-chip" :class="evaChipClass(bilan.douleurScore)">
                    EVA {{ bilan.douleurScore }}/10
                  </span>
                  <span v-if="bilan.chainesGDS?.length" class="tl-chip">
                    {{ bilan.chainesGDS.length }} chaîne(s)
                  </span>
                  <span v-if="bilan.schemaAnnotations?.length" class="tl-chip">
                    {{ bilan.schemaAnnotations.length }} annotation(s)
                  </span>
                </div>
              </div>
              <div class="tl-actions" @click.stop>
                <button
                  class="btn btn-ghost btn-icon btn-sm"
                  @click="confirmDeleteBilan(bilan)"
                  title="Supprimer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-bilans">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3;margin:0 auto 12px;">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>Aucune consultation pour ce patient.</p>
            <RouterLink :to="`/patients/${patientId}/bilans/new`" class="btn btn-primary btn-sm" style="margin-top:12px">
              Créer le 1er examen
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <template v-if="!isNew">
      <!-- ── SEMELLES ──────────────────────────────────────────────── -->
      <div class="card semelles-card">
        <div class="card-header">
          <h3 class="card-title">Semelles</h3>
          <RouterLink :to="`/patients/${patientId}/semelles/new`" class="btn btn-accent btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvelle paire
          </RouterLink>
        </div>
        <p v-if="!semelles.length" class="vide-semelles">Aucune paire de semelles pour ce patient.</p>
        <div v-else class="semelles-grille">
          <RouterLink v-for="s in semelles" :key="s.id" :to="`/semelles/${s.id}`" class="semelle-carte">
            <div class="semelle-mini">
              <SemelleSchema cote="G" :pointure="s.pointure" :elements="s.elements.filter(e => e.cote === 'G')" :grille="false" :etiquettes="false" />
              <SemelleSchema cote="D" :pointure="s.pointure" :elements="s.elements.filter(e => e.cote === 'D')" :grille="false" :etiquettes="false" />
            </div>
            <div class="semelle-info">
              <strong>{{ formatDate(s.datePrescription) }}</strong> · P. {{ s.pointure }} · {{ libelleType(s.typeSemelle) }}
              <div><span class="semelle-statut" :class="classeStatut(s.statut)">{{ libelleStatut(s.statut) }}</span>
                <span v-if="alerteSemelle(s)" class="semelle-alerte">{{ alerteSemelle(s).texte }}</span></div>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- ── DOCUMENTS ─────────────────────────────────────────────── -->
      <PatientDocuments :patient-id="patientId" />
    </template>

    <!-- Modal suppression bilan -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="bilanToDelete" class="modal-overlay" @click.self="bilanToDelete = null">
          <div class="modal">
            <h3>Supprimer ce bilan ?</h3>
            <p>Bilan du <strong>{{ formatDate(bilanToDelete.date) }}</strong> — {{ bilanToDelete.motifConsultation || 'sans motif' }}<br>Cette action est irréversible.</p>
            <div class="modal-actions">
              <button class="btn btn-ghost" @click="bilanToDelete = null">Annuler</button>
              <button class="btn btn-danger" @click="doDeleteBilan">Supprimer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { usePatientStore } from '@/store/patients.js'
import { useBilanStore } from '@/store/bilans.js'
import { useUIStore } from '@/store/ui.js'
import { api } from '@/api.js'
import PatientDocuments from '@/components/documents/PatientDocuments.vue'
import SemelleSchema from '@/components/semelles/SemelleSchema.vue'
import { libelleStatut, libelleType, alerteSemelle, STATUTS_SEMELLE } from '@/utils/semelles.js'

const route = useRoute()
const router = useRouter()
const patientStore = usePatientStore()
const bilanStore = useBilanStore()
const uiStore = useUIStore()

const patientId = computed(() => route.params.id)
const isNew = computed(() => !patientId.value)
const bilanToDelete = ref(null)

const form = reactive({
  nom: '', prenom: '', dateNaissance: '', telephone: '',
  email: '', medecinTraitant: '', taille: '', poids: '', adresse: '', notesAdmin: ''
})

// Fiche, semelles : rechargées à chaque patient (la page est réutilisée après « Créer »)
const semelles = ref([])
watch(patientId, async (id) => {
  if (!id) { for (const k of Object.keys(form)) form[k] = ''; semelles.value = []; return }
  if (!patientStore.patients.length) await patientStore.loadPatients().catch(() => {})
  const p = patientStore.patients.find(p => p.id === id)
  if (!p) { uiStore.error('Patient introuvable'); router.push('/patients'); return }
  Object.assign(form, p)
  semelles.value = await api.listSemelles(id).catch(() => [])
}, { immediate: true })

const patientName = computed(() => `${form.prenom} ${form.nom}`.trim() || 'Nouveau patient')
const patientBilans = computed(() => bilanStore.bilansByPatient(patientId.value))

const AVATAR_COLORS = ['#2B6CB0', '#52B848', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#DC2626']
const avatarBg = computed(() => AVATAR_COLORS[(form.nom?.charCodeAt(0) || 0) % AVATAR_COLORS.length])
const initials = computed(() => `${form.prenom?.[0] || ''}${form.nom?.[0] || ''}`.toUpperCase() || '?')

const computedAge = computed(() => {
  if (!form.dateNaissance) return null
  return Math.floor((Date.now() - new Date(form.dateNaissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
})


// Stats historique
const finalizedCount = computed(() => patientBilans.value.filter(b => b.statut === 'finalisé').length)
const avgEva = computed(() => {
  const scores = patientBilans.value.map(b => b.douleurScore).filter(s => s !== undefined && s !== null)
  if (!scores.length) return '—'
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
})
const firstConsult = computed(() => {
  if (!patientBilans.value.length) return '—'
  const sorted = [...patientBilans.value].sort((a, b) => new Date(a.date) - new Date(b.date))
  return new Date(sorted[0].date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
})

const evaChipClass = (score) => {
  if (score <= 3) return 'chip-green'
  if (score <= 6) return 'chip-orange'
  return 'chip-red'
}

const savePatient = async () => {
  if (!form.nom.trim() || !form.prenom.trim()) {
    uiStore.warning('Nom et prénom obligatoires')
    return
  }
  try {
    if (isNew.value) {
      const p = await patientStore.createPatient({ ...form })
      uiStore.success('Patient créé avec succès')
      router.push(`/patients/${p.id}`)
    } else {
      await patientStore.updatePatient(patientId.value, { ...form })
      uiStore.success('Dossier patient mis à jour')
    }
  } catch (e) {
    uiStore.error(e.message || 'Enregistrement impossible')
  }
}

const classeStatut = v => STATUTS_SEMELLE.find(s => s.value === v)?.classe || ''
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

const confirmDeleteBilan = (bilan) => { bilanToDelete.value = bilan }
const doDeleteBilan = () => {
  if (!bilanToDelete.value) return
  bilanStore.deleteBilan(bilanToDelete.value.id)
  uiStore.success('Bilan supprimé')
  bilanToDelete.value = null
}
</script>

<style scoped>
.patient-detail { max-width: 1100px; margin: 0 auto; }
.semelles-card { margin-top: var(--space-lg); }
.vide-semelles { color: var(--color-text-muted); font-size: var(--text-sm); }
.semelles-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-md); }
.semelle-carte { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px; text-decoration: none; color: var(--color-text); display: flex; flex-direction: column; gap: 6px; }
.semelle-carte:hover { border-color: var(--color-primary); box-shadow: var(--shadow-sm); }
.semelle-mini { display: flex; justify-content: center; gap: 4px; height: 120px; }
.semelle-mini :deep(.semelle-svg) { height: 100%; width: auto; }
.semelle-info { font-size: var(--text-xs); display: flex; flex-direction: column; gap: 4px; }
.semelle-statut { display: inline-block; padding: 1px 8px; border-radius: var(--radius-full); font-weight: 700; margin-right: 6px; }
.st-prescrite { background: #e0e7ff; color: #3730a3; }
.st-fabrication { background: #fef3c7; color: #92400e; }
.st-livree { background: #dcfce7; color: #15803d; }
.st-controlee { background: #e2e8f0; color: #334155; }
.semelle-alerte { color: #b45309; font-weight: 600; }

.breadcrumb { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xl); font-size: var(--text-sm); color: var(--color-text-muted); }
.breadcrumb-link { color: var(--color-primary); font-weight: 500; display: flex; align-items: center; gap: 4px; }
.breadcrumb-link:hover { text-decoration: underline; }

.detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); align-items: start; }

/* Patient header */
.patient-header { display: flex; align-items: flex-start; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap; }
.patient-header-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-left: auto; }
.patient-avatar-lg {
  width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-2xl); font-weight: 800; color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}
.patient-header-info { flex: 1; }
.patient-name-lg { font-size: var(--text-xl); font-weight: 800; letter-spacing: -.02em; }
.patient-header-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.meta-chip {
  padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 600;
  background: var(--color-primary-light); color: var(--color-primary);
}


.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.form-group--full { grid-column: 1 / -1; }

/* Consult stats */
.consult-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md); margin-bottom: var(--space-lg);
  padding: var(--space-md); background: var(--color-surface-alt);
  border-radius: var(--radius-lg); border: 1px solid var(--color-border);
}
.cs-item { text-align: center; }
.cs-n { font-size: var(--text-xl); font-weight: 800; color: var(--color-primary); }
.cs-l { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; }

/* Timeline */
.timeline { display: flex; flex-direction: column; position: relative; }
.timeline::before {
  content: ''; position: absolute; left: 10px; top: 8px; bottom: 8px;
  width: 2px; background: var(--color-border); border-radius: 1px;
}
.timeline-item {
  display: flex; align-items: flex-start; gap: var(--space-md);
  padding: var(--space-md) var(--space-md) var(--space-md) var(--space-xl);
  position: relative; cursor: pointer; border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}
.timeline-item:hover { background: var(--color-primary-light); }
.tl-dot {
  position: absolute; left: 5px; top: 20px;
  width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--color-surface);
  flex-shrink: 0;
}
.tl-dot--final { background: var(--color-accent); }
.tl-dot--draft  { background: var(--color-warning); }
.tl-content { flex: 1; min-width: 0; }
.tl-header { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: 4px; }
.tl-date { font-weight: 700; font-size: var(--text-sm); }
.tl-motif { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: 6px; }
.tl-meta { display: flex; gap: 4px; flex-wrap: wrap; }
.tl-chip {
  padding: 2px 8px; border-radius: var(--radius-full);
  font-size: 11px; font-weight: 600;
  background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-muted);
}
.chip-green { background: #dcfce7; color: #15803d; border-color: #86efac; }
.chip-orange { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
.chip-red { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.tl-actions { flex-shrink: 0; }

.empty-bilans { text-align: center; padding: var(--space-2xl); color: var(--color-text-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 9990; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
.modal { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-xl); max-width: 420px; width: 100%; box-shadow: var(--shadow-xl); }
.modal h3 { font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-md); }
.modal p { color: var(--color-text-muted); line-height: 1.6; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xl); }
.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; }
  .consult-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .patient-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .patient-header-actions {
    margin-left: 0;
    width: 100%;
  }
  .patient-header-actions .btn {
    flex: 1;
    justify-content: center;
  }
}
@media (max-width: 640px) {
  .form-grid { grid-template-columns: 1fr; }
  .form-group--full { grid-column: 1; }
  .consult-stats { grid-template-columns: repeat(2, 1fr); }
  .timeline-item { padding-left: var(--space-xl); }
}
</style>
