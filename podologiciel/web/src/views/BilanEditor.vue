<template>
  <div class="bilan-editor fade-in">
    <!-- Header -->
    <div class="bilan-header">
      <div class="bilan-breadcrumb">
        <RouterLink to="/patients" class="breadcrumb-link">Patients</RouterLink>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        <RouterLink v-if="patient" :to="`/patients/${patient.id}`" class="breadcrumb-link">
          {{ patient.prenom }} {{ patient.nom }}
        </RouterLink>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>{{ bilan?.typeBilan === 'soin_pedicurie' ? 'Soin pédicurie' : 'Examen' }} du {{ formatDate(bilan?.date) }}</span>
      </div>
      <div class="bilan-actions">
        <div class="bilan-date-edit">
          <label class="form-label" style="margin:0">Date</label>
          <input type="date" :value="bilan?.date" @change="updateField({ date: $event.target.value })" class="form-input date-input" />
        </div>
        <span class="badge" :class="bilan?.statut === 'finalisé' ? 'badge-success' : 'badge-warning'">
          {{ bilan?.statut || 'brouillon' }}
        </span>
        <button class="btn btn-secondary btn-sm" @click="finalize">
          {{ bilan?.statut === 'finalisé' ? 'Rouvrir' : 'Finaliser' }}
        </button>
        <button class="btn btn-primary" @click="exportPDF" :disabled="exporting">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
          </svg>
          {{ exporting ? 'Génération…' : 'Export PDF' }}
        </button>
        <button class="btn btn-secondary" @click="openSendEmail" :disabled="exporting || sending">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          {{ sending ? 'Envoi…' : 'Envoyer par mail' }}
        </button>
      </div>
    </div>

    <!-- Auto-save indicator -->
    <div class="autosave-bar" :class="{ saving: isSaving, saved: justSaved }">
      <span v-if="isSaving"><span class="spinner-mini" /> Enregistrement…</span>
      <span v-else-if="justSaved">✓ Sauvegardé automatiquement</span>
      <span v-else>Sauvegarde automatique active</span>
    </div>

    <!-- Tabs -->
    <div class="tabs-wrapper">
      <div class="tabs">
        <button
          v-for="tab in visibleTabs"
          :key="tab.id"
          class="tab"
          :class="{
            active: activeTab === tab.id,
            'tab--hidden': tab.isHidden && authStore.isAdmin,
          }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          {{ tab.label }}
          <span v-if="tab.isHidden && authStore.isAdmin" class="tab-hidden-badge" title="Onglet masqué (visible admin uniquement)">👁</span>
        </button>

        <!-- + Onglet / restaurer (pro/vip/admin) -->
        <button v-if="canCustomize" class="tab tab-add" @click="showNewTab = true" title="Créer ou restaurer un onglet">
          + Onglet
        </button>
      </div>

      <!-- Actions sur l'onglet courant (pro+) — avec message upgrade pour free -->
      <div v-if="!canCustomize" class="tab-actions-bar tab-actions-free">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        Personnalisation des onglets disponible en <a href="mailto:contact@movyx.com" class="upgrade-link">plan Pro</a>
      </div>
      <div v-else class="tab-actions-bar">
        <button class="btn btn-ghost btn-xs tab-action-btn" @click="openCustomize(activeTab)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2"/></svg>
          Personnaliser l'onglet
        </button>
        <!-- Restaurer un onglet masqué -->
        <button
          v-if="isCurrentTabHidden"
          class="btn btn-ghost btn-xs tab-action-btn"
          style="color:var(--color-accent)"
          @click="restoreTab(activeTab)"
        >
          ↩ Restaurer l'onglet
        </button>
        <!-- Masquer/supprimer (uniquement si l'onglet est visible) -->
        <template v-else>
          <button
            v-if="isBuiltinTab(activeTab)"
            class="btn btn-ghost btn-xs tab-action-btn tab-action-delete"
            @click="askHideBuiltinTab(activeTab)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            Masquer l'onglet
          </button>
          <button
            v-else
            class="btn btn-ghost btn-xs tab-action-btn tab-action-delete"
            @click="askHideCustomTab(activeTab)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            Masquer l'onglet
          </button>
        </template>
      </div>
    </div>

    <!-- Tab content -->
    <div class="tab-content" v-if="bilan">
      <div v-if="isCurrentTabHidden && authStore.isAdmin" class="admin-hidden-notice">
        <span>👁 Cet onglet est <strong>masqué</strong> pour les utilisateurs — visible uniquement pour les administrateurs.</span>
        <button class="btn btn-sm btn-accent" @click="restoreTab(activeTab)">↩ Restaurer l'onglet</button>
      </div>

      <template v-if="isBuiltinTab(activeTab)">
        <!-- Onglets bilan classique -->
        <template v-if="bilan.typeBilan !== 'soin_pedicurie'">
          <Interrogatoire    v-if="activeTab === 'interrogatoire'" :bilan="bilan" @update="updateField" />
          <MotriciteSection  v-if="activeTab === 'motricite'"     :bilan="bilan" @update="updateField" />
          <BarometrieSection v-if="activeTab === 'barometrie'"    :bilan="bilan" @update="updateField" />
          <SchemaCorpsSection v-if="activeTab === 'schema'"       :bilan="bilan" />
          <ChainesGDSSection v-if="activeTab === 'chaines'"       :bilan="bilan" @update="updateField" />
        </template>
        <!-- Onglets soin de pédicurie -->
        <SchemaPiedSection v-if="activeTab === 'pieds'"  :bilan="bilan" />
        <!-- Notes commun aux deux types -->
        <NotesGenerales    v-if="activeTab === 'notes'"  :bilan="bilan" @update="updateField" />
      </template>

      <div v-if="!isBuiltinTab(activeTab) && !getTabFields(activeTab).length" class="custom-tab-placeholder">
        <div class="custom-tab-empty">
          <div class="custom-tab-empty-icon">⚙️</div>
          <h3>Onglet vide</h3>
          <p>Cliquez sur "Personnaliser l'onglet" pour ajouter vos champs.</p>
          <button class="btn btn-primary btn-sm" @click="openCustomize(activeTab)">Personnaliser</button>
        </div>
      </div>

      <CustomTabContent
        v-if="getTabFields(activeTab).length"
        :fields="getTabFields(activeTab)"
        :custom-data="bilan.customData"
        @update="(d) => updateField({ customData: d })"
      />
    </div>


    <div id="pdf-export-target" style="position:absolute;left:-9999px;top:0;width:794px;background:white;">
      <PDFTemplate v-if="bilan && patient" :bilan="bilan" :patient="patient" />
    </div>

    <!-- Tab customizer drawer -->
    <TabCustomizer
      v-model="showCustomizer"
      :tab-id="customizerTabId"
      :tab-label="getTabLabel(customizerTabId)"
      :default-label="getBuiltinLabel(customizerTabId)"
      :is-builtin="isBuiltinTab(customizerTabId)"
      :current-label="getCustomLabel(customizerTabId)"
      :fields="getTabFields(customizerTabId)"
      @save="onCustomizerSave"
    />

    <!-- ── Modal : Nouvel onglet + restauration ────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showNewTab" class="modal-overlay" @click.self="showNewTab=false">
        <div class="modal-card modal-card--wide">
          <h3>Gérer les onglets</h3>

          <!-- Restaurer des onglets masqués -->
          <div v-if="hiddenRestorableTabs.length" class="restore-section">
            <div class="restore-section-title">↩ Onglets masqués — cliquer pour restaurer</div>
            <div class="restore-list">
              <button
                v-for="t in hiddenRestorableTabs" :key="t.id"
                class="restore-tab-btn"
                @click="restoreTab(t.id); showNewTab=false"
              >
                <span>{{ t.icon }}</span>
                <span>{{ t.label }}</span>
                <span class="restore-tag">Restaurer</span>
              </button>
            </div>
          </div>

          <!-- Créer un nouvel onglet -->
          <div class="new-tab-section">
            <div class="restore-section-title">+ Créer un nouvel onglet personnalisé</div>
            <div class="form-group">
              <label class="form-label">Nom de l'onglet</label>
              <input v-model="newTabLabel" class="form-input" placeholder="Ex: Tests personnalisés" @keyup.enter="doCreateTab" />
            </div>
            <div class="form-group">
              <label class="form-label">Icône (emoji)</label>
              <div class="emoji-picker">
                <button v-for="e in EMOJI_LIST" :key="e" class="emoji-btn" :class="{ selected: newTabIcon===e }" @click="newTabIcon=e">{{ e }}</button>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showNewTab=false">Fermer</button>
            <button class="btn btn-primary" @click="doCreateTab" :disabled="!newTabLabel.trim()">Créer l'onglet</button>
          </div>
        </div>
      </div>

      <!-- ── Sélection du type de consultation (création) ─────────────────── -->
      <div v-if="showTypeSelector" class="modal-overlay">
        <div class="modal-card modal-card--type">
          <h3>Quel type de consultation ?</h3>
          <p class="modal-desc">Choisissez le type pour afficher les onglets adaptés.</p>
          <div class="type-choice-grid">
            <button class="type-choice-btn" @click="selectType('bilan')">
              <span class="type-choice-icon">🩺</span>
              <strong>Bilan podologique</strong>
              <span class="type-choice-desc">Interrogatoire, motricité, baromètrie, schéma corporel, chaînes GDS…</span>
            </button>
            <button class="type-choice-btn" @click="selectType('soin_pedicurie')">
              <span class="type-choice-icon">🦶</span>
              <strong>Soin de pédicurie</strong>
              <span class="type-choice-desc">Schéma des 4 faces des pieds avec annotations localisées.</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Confirmation masquage ────────────────────────────────────────── -->
      <div v-if="confirmHideTabId" class="modal-overlay" @click.self="confirmHideTabId=null">
        <div class="modal-card">
          <h3>Masquer l'onglet ?</h3>
          <p class="modal-desc">
            L'onglet <strong>« {{ getTabLabel(confirmHideTabId) }} »</strong> sera masqué.<br>
            Vous pourrez le restaurer à tout moment depuis le bouton <em>"+ Onglet"</em>.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="confirmHideTabId=null">Annuler</button>
            <button class="btn btn-primary" @click="doHideTab(confirmHideTabId)">Masquer</button>
          </div>
        </div>
      </div>
      <!-- ── Modal : Envoyer par mail ──────────────────────────────────────── -->
      <div v-if="showSendEmail" class="modal-overlay" @click.self="showSendEmail=false">
        <div class="modal-card modal-card--wide">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:6px">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Envoyer le bilan par email
          </h3>

          <!-- Bandeau mode : direct ou fallback -->
          <div v-if="emailDirect" class="email-mode-badge email-mode-badge--direct">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Le PDF sera partagé directement via votre client mail — aucun fichier sauvegardé
          </div>
          <div v-else class="email-mode-badge email-mode-badge--fallback">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Le PDF sera téléchargé et votre client mail s'ouvrira avec les champs pré-remplis.
          </div>
          <!-- Info patient sans email -->
          <div v-if="!patient?.email" class="email-config-warn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Aucun email renseigné pour ce patient. Vous pouvez en saisir un ci-dessous.</span>
          </div>

          <div class="email-fields-row">
            <div class="form-group">
              <label class="form-label">De (expéditeur)</label>
              <input
                :value="authStore.currentUser?.proEmail || authStore.currentUser?.email || ''"
                class="form-input"
                disabled
                title="Votre adresse email professionnelle (modifiable dans Profil)"
              />
            </div>
            <div class="form-group">
              <label class="form-label">À (patient) *</label>
              <input v-model="sendEmailTo" type="email" class="form-input" placeholder="patient@exemple.fr" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Objet</label>
            <input v-model="sendEmailSubject" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Message</label>
            <textarea v-model="sendEmailMessage" class="form-input" rows="4" style="resize:vertical" />
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showSendEmail=false">Annuler</button>
            <button class="btn btn-primary" @click="doSendEmail" :disabled="sending || !sendEmailTo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {{ sending ? 'Envoi…' : (emailDirect ? 'Envoyer' : 'Préparer l\'email') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { usePatientStore }   from '@/store/patients.js'
import { useBilanStore }     from '@/store/bilans.js'
import { useUIStore }        from '@/store/ui.js'
import { useAuthStore, defaultCustomization, getPlanLimits } from '@/store/auth.js'
import { generateId }        from '@/utils/uuid.js'
import { exportBilanPDF, getBilanPDFBase64 } from '@/utils/pdf.js'
import { sendOrOpenEmail, canShareDirect } from '@/utils/emailService.js'

import Interrogatoire     from '@/components/bilan/Interrogatoire.vue'
import MotriciteSection   from '@/components/bilan/MotriciteSection.vue'
import BarometrieSection  from '@/components/bilan/BarometrieSection.vue'
import SchemaCorpsSection from '@/components/bilan/SchemaCorpsSection.vue'
import SchemaPiedSection  from '@/components/bilan/SchemaPiedSection.vue'
import ChainesGDSSection  from '@/components/bilan/ChainesGDSSection.vue'
import NotesGenerales     from '@/components/bilan/NotesGenerales.vue'
import PDFTemplate        from '@/components/bilan/PDFTemplate.vue'
import TabCustomizer      from '@/components/customization/TabCustomizer.vue'
import CustomTabContent   from '@/components/customization/CustomTabContent.vue'

const route        = useRoute()
const router       = useRouter()
const patientStore = usePatientStore()
const bilanStore   = useBilanStore()
const uiStore      = useUIStore()
const authStore    = useAuthStore()

const activeTab        = ref('interrogatoire')
const exporting        = ref(false)
const isSaving         = ref(false)
const justSaved        = ref(false)
const showTypeSelector = ref(false)
let   pendingPatientId = ''
let saveTimer = null, savedTimer = null

// ── Envoi par email ─────────────────────────────────────────────────────────
const showSendEmail    = ref(false)
const sending          = ref(false)
const sendEmailTo      = ref('')
const sendEmailSubject = ref('')
const sendEmailMessage = ref('')
const emailDirect      = ref(canShareDirect())

const BUILTIN_TABS_BILAN = [
  { id: 'interrogatoire', label: 'Interrogatoire', icon: '🩺' },
  { id: 'motricite',      label: 'Préf. motrices', icon: '🦾' },
  { id: 'barometrie',     label: 'Baromètrie',     icon: '📊' },
  { id: 'schema',         label: 'Schéma corps',   icon: '🫀' },
  { id: 'chaines',        label: 'Chaînes GDS',    icon: '🔗' },
  { id: 'notes',          label: 'Notes',          icon: '📝' },
]

const BUILTIN_TABS_PEDICURIE = [
  { id: 'pieds',  label: 'Schéma des pieds', icon: '🦶' },
  { id: 'notes',  label: 'Notes',            icon: '📝' },
]

const BUILTIN_TABS = computed(() =>
  bilan.value?.typeBilan === 'soin_pedicurie'
    ? BUILTIN_TABS_PEDICURIE
    : BUILTIN_TABS_BILAN
)

const EMOJI_LIST = ['📋','🔬','🧪','💊','🩹','🧬','📐','📌','⭐','🎯','📈','🗒️','🔍','🏥','💡','🧩']

// ── Customization ──────────────────────────────────────────────────────────
const cust      = computed(() => authStore.effectiveUser?.customization || defaultCustomization())
const planLimits = computed(() => getPlanLimits(authStore.effectiveUser?.role || 'free'))
const canCustomize = computed(() => planLimits.value.canCustomizeTabs)

// Tous les onglets (y compris masqués pour les admins)
const allTabs = computed(() => {
  const hidden  = cust.value.hiddenBuiltinTabs || []
  const labels  = cust.value.builtinTabLabels  || {}
  const customs = cust.value.customTabs        || []
  const builtin = BUILTIN_TABS.value.map(t => ({
    ...t,
    label:    labels[t.id] || t.label,
    isHidden: hidden.includes(t.id),
  }))
  const customAll = customs.map(t => ({ ...t, isHidden: !!t.hidden }))
  return [...builtin, ...customAll]
})

// Onglets visibles (non masqués), + les masqués pour l'admin
const visibleTabs = computed(() => {
  if (authStore.isAdmin) return allTabs.value
  return allTabs.value.filter(t => !t.isHidden)
})

// Liste des onglets masqués pouvant être restaurés
const hiddenRestorableTabs = computed(() => allTabs.value.filter(t => t.isHidden))

const isCurrentTabHidden = computed(() => {
  const t = allTabs.value.find(t => t.id === activeTab.value)
  return t?.isHidden || false
})

function isBuiltinTab(id)    { return BUILTIN_TABS.value.some(t => t.id === id) }
function getBuiltinLabel(id) { return BUILTIN_TABS.value.find(t => t.id === id)?.label || '' }
function getCustomLabel(id)  { return (cust.value.builtinTabLabels || {})[id] || '' }
function getTabLabel(id) {
  if (!id) return ''
  const t = allTabs.value.find(t => t.id === id)
  return t?.label || id
}
function getTabFields(id) { return (cust.value.extraFields || {})[id] || [] }

// ── Masquage & Restauration ─────────────────────────────────────────────────
const confirmHideTabId = ref(null)

function askHideBuiltinTab(tabId) { confirmHideTabId.value = tabId }
function askHideCustomTab(tabId)  { confirmHideTabId.value = tabId }

function doHideTab(tabId) {
  const newCust = { ...cust.value }
  if (isBuiltinTab(tabId)) {
    newCust.hiddenBuiltinTabs = [...(newCust.hiddenBuiltinTabs || []), tabId]
  } else {
    newCust.customTabs = (newCust.customTabs || []).map(t =>
      t.id === tabId ? { ...t, hidden: true } : t
    )
  }
  authStore.saveCustomization(newCust)
  confirmHideTabId.value = null
  // On passe sur le premier onglet visible
  const first = visibleTabs.value.find(t => t.id !== tabId)
  if (first) activeTab.value = first.id
  uiStore.info('Onglet masqué. Restaurez-le via "+ Onglet".')
}

function restoreTab(tabId) {
  const newCust = { ...cust.value }
  if (isBuiltinTab(tabId)) {
    newCust.hiddenBuiltinTabs = (newCust.hiddenBuiltinTabs || []).filter(id => id !== tabId)
  } else {
    newCust.customTabs = (newCust.customTabs || []).map(t =>
      t.id === tabId ? { ...t, hidden: false } : t
    )
  }
  authStore.saveCustomization(newCust)
  activeTab.value = tabId
  uiStore.success('Onglet restauré !')
}

// ── Tab customizer ──────────────────────────────────────────────────────────
const showCustomizer  = ref(false)
const customizerTabId = ref('')

function openCustomize(tabId) {
  customizerTabId.value = tabId
  showCustomizer.value  = true
}

function onCustomizerSave({ tabId, label, fields }) {
  const newCust = { ...cust.value }
  if (isBuiltinTab(tabId)) {
    newCust.builtinTabLabels = { ...newCust.builtinTabLabels, [tabId]: label }
  } else {
    newCust.customTabs = (newCust.customTabs || []).map(t =>
      t.id === tabId ? { ...t, label: label || t.label } : t
    )
  }
  newCust.extraFields = { ...newCust.extraFields, [tabId]: fields }
  authStore.saveCustomization(newCust)
  uiStore.success('Onglet personnalisé !')
}

// ── Nouvel onglet ───────────────────────────────────────────────────────────
const showNewTab  = ref(false)
const newTabLabel = ref('')
const newTabIcon  = ref('📋')

function doCreateTab() {
  if (!newTabLabel.value.trim()) return
  const tab = { id: 'custom_' + generateId(), label: newTabLabel.value.trim(), icon: newTabIcon.value, hidden: false }
  const newCust = { ...cust.value, customTabs: [...(cust.value.customTabs || []), tab] }
  authStore.saveCustomization(newCust)
  showNewTab.value  = false
  newTabLabel.value = ''
  activeTab.value   = tab.id
  uiStore.success('Onglet créé !')
}

// ── Bilan ───────────────────────────────────────────────────────────────────
const bilan   = computed(() => bilanStore.currentBilan)
const patient = computed(() => {
  if (!bilan.value) return null
  return patientStore.patients.find(p => p.id === bilan.value.patientId) || null
})

onMounted(() => {
  const bilanId   = route.params.id
  const patientId = route.params.patientId
  if (bilanId) {
    bilanStore.setCurrentBilan(bilanId)
    if (!bilan.value) { uiStore.error('Bilan introuvable'); router.push('/patients') }
    else {
      // Aller sur le premier onglet du bon type
      const firstTab = BUILTIN_TABS.value[0]
      if (firstTab) activeTab.value = firstTab.id
    }
  } else if (patientId) {
    // Afficher le sélecteur de type avant de créer le bilan
    pendingPatientId = patientId
    showTypeSelector.value = true
  }
})

async function selectType(type) {
  showTypeSelector.value = false
  try {
    const newBilan = await bilanStore.createBilan(pendingPatientId, type)
    activeTab.value = type === 'soin_pedicurie' ? 'pieds' : 'interrogatoire'
    router.replace(`/bilans/${newBilan.id}`)
  } catch (e) {
    uiStore.error(e.message || 'Création de l’examen impossible')
    router.push(`/patients/${pendingPatientId}`)
  }
}

const updateField = (data) => {
  bilanStore.updateCurrentBilan(data)
  triggerSave()
}

const triggerSave = () => {
  clearTimeout(saveTimer)
  isSaving.value = true; justSaved.value = false
  saveTimer = setTimeout(() => {
    isSaving.value = false; justSaved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => { justSaved.value = false }, 2500)
  }, 800)
}

const finalize = () => {
  if (!bilan.value) return
  const newStatut = bilan.value.statut === 'finalisé' ? 'brouillon' : 'finalisé'
  bilanStore.updateCurrentBilan({ statut: newStatut })
  uiStore.success(newStatut === 'finalisé' ? '✓ Examen finalisé' : 'Examen rouvert en édition')
}

const exportPDF = async () => {
  if (!bilan.value || !patient.value) return
  exporting.value = true
  uiStore.info('Génération du PDF en cours…')
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 300))
    await exportBilanPDF(bilan.value, patient.value)
    uiStore.success('PDF exporté avec succès')
  } catch (e) {
    console.error(e); uiStore.error('Erreur lors de l\'export PDF')
  } finally {
    exporting.value = false
  }
}

const openSendEmail = () => {
  if (!patient.value) return
  emailDirect.value = canShareDirect()
  const typeBilan = bilan.value?.typeBilan === 'soin_pedicurie' ? 'Soin de pédicurie' : 'Bilan podologique'
  const praticien = authStore.currentUser
    ? `${authStore.currentUser.prenom || ''} ${authStore.currentUser.nom || ''}`.trim()
    : 'Votre podologue'
  sendEmailTo.value      = patient.value.email || ''
  sendEmailSubject.value = `${typeBilan} du ${formatDate(bilan.value?.date)} — ${patient.value.prenom} ${patient.value.nom}`
  sendEmailMessage.value = `Bonjour ${patient.value.prenom},\n\nVeuillez trouver ci-joint votre ${typeBilan.toLowerCase()} du ${formatDate(bilan.value?.date)}.\n\nCordialement,\n${praticien}`
  showSendEmail.value = true
}

const doSendEmail = async () => {
  if (!bilan.value || !patient.value || !sendEmailTo.value) return
  sending.value = true
  uiStore.info('Génération du PDF…')
  try {
    await nextTick()
    await new Promise(r => setTimeout(r, 300))
    const { base64, filename } = await getBilanPDFBase64(bilan.value, patient.value)
    const mode = await sendOrOpenEmail({
      toEmail:     sendEmailTo.value,
      subject:     sendEmailSubject.value,
      body:        sendEmailMessage.value,
      pdfBase64Uri: base64,
      pdfFilename:  filename,
    })
    if (mode === 'direct') {
      uiStore.success('Email envoyé avec succès !')
    } else {
      uiStore.success('PDF téléchargé — votre client mail va s\'ouvrir, joignez le fichier avant d\'envoyer.')
    }
    showSendEmail.value = false
  } catch (e) {
    console.error(e)
    uiStore.error(e.message || 'Erreur lors de l\'envoi')
  } finally {
    sending.value = false
  }
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'
</script>

<style scoped>
.bilan-editor { max-width: 1200px; margin: 0 auto; }
.bilan-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-md); flex-wrap: wrap; gap: var(--space-md);
  padding-bottom: var(--space-md); border-bottom: 1px solid var(--color-border);
}
.bilan-breadcrumb { display: flex; align-items: center; gap: var(--space-sm); font-size: var(--text-sm); color: var(--color-text-muted); }
.breadcrumb-link { color: var(--color-primary); font-weight: 500; }
.breadcrumb-link:hover { text-decoration: underline; }
.bilan-actions { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.bilan-date-edit { display: flex; align-items: center; gap: 6px; }
.date-input { padding: 5px 10px; font-size: var(--text-sm); width: auto; }

.autosave-bar {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--text-xs); color: var(--color-text-muted);
  margin-bottom: var(--space-lg);
  padding: 4px 12px; border-radius: var(--radius-full);
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  transition: all var(--transition-base);
}
.autosave-bar.saving { color: var(--color-primary); border-color: var(--color-primary); }
.autosave-bar.saved  { color: var(--color-success); border-color: var(--color-success); background: #f0fdf4; }
.spinner-mini {
  display: inline-block; width: 10px; height: 10px;
  border: 1.5px solid var(--color-primary); border-top-color: transparent;
  border-radius: 50%; animation: spin 600ms linear infinite; vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }

.tabs-wrapper { overflow-x: auto; margin-bottom: var(--space-sm); -webkit-overflow-scrolling: touch; }
.tabs { min-width: max-content; display: flex; align-items: center; }
.tab-icon { font-size: 14px; }

/* Onglet masqué (visible seulement admin) */
.tab--hidden { opacity: .55; border-style: dashed !important; }
.tab-hidden-badge { font-size: 10px; margin-left: 4px; }

.tab-add {
  margin-left: 8px; padding: 8px 14px;
  font-size: var(--text-xs); font-weight: 600; color: var(--color-primary);
  border: 1px dashed var(--color-primary); border-radius: var(--radius-md);
  background: transparent; cursor: pointer; transition: all var(--transition-fast);
}
.tab-add:hover { background: var(--color-primary-light); }

.tab-actions-bar {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  margin-bottom: var(--space-md); border-bottom: 1px solid var(--color-border);
}
.tab-action-btn { display: flex; align-items: center; gap: 5px; font-size: var(--text-xs); color: var(--color-text-muted); }
.tab-action-btn:hover    { color: var(--color-primary); }
.tab-action-delete:hover { color: #dc2626 !important; }
.tab-actions-free { color: var(--color-text-muted); font-size: var(--text-xs); }
.upgrade-link { color: var(--color-primary); font-weight: 700; }
.upgrade-link:hover { text-decoration: underline; }
.btn-xs { padding: 4px 10px; font-size: 12px; }
.btn-accent { background: var(--color-accent); color: white; border: none; }

/* Bandeau admin sur onglet masqué */
.admin-hidden-notice {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  background: #fef9c3; border: 1px solid #fde047; border-radius: var(--radius-lg);
  padding: 12px 16px; font-size: var(--text-sm); color: #713f12;
  margin-bottom: var(--space-lg);
}

.tab-content { animation: fadeIn 180ms ease both; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.custom-tab-placeholder { padding: var(--space-xl) 0; }
.custom-tab-empty {
  text-align: center; padding: 60px 20px;
  background: var(--color-surface-alt); border-radius: var(--radius-xl);
  border: 2px dashed var(--color-border);
}
.custom-tab-empty-icon { font-size: 48px; margin-bottom: 16px; }
.custom-tab-empty h3 { font-size: var(--text-xl); font-weight: 700; margin-bottom: 8px; }
.custom-tab-empty p  { color: var(--color-text-muted); margin-bottom: 20px; }

/* Modals */
.modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px; }
.modal-card { background:var(--color-surface);border-radius:var(--radius-xl);padding:32px;width:100%;max-width:420px;box-shadow:var(--shadow-xl);display:flex;flex-direction:column;gap:16px; }
.modal-card--wide { max-width: 540px; }
.modal-card--type { max-width: 560px; }
.modal-card h3 { font-size:var(--text-xl);font-weight:700;color:var(--color-text); }
.modal-desc { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.6; }
.modal-actions { display:flex;justify-content:flex-end;gap:10px;margin-top:8px; }

/* Sélection type de consultation */
.type-choice-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);
}
.type-choice-btn {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 24px 16px; border-radius: var(--radius-xl);
  border: 2px solid var(--color-border); background: var(--color-surface-alt);
  cursor: pointer; text-align: center; transition: all var(--transition-fast);
}
.type-choice-btn:hover {
  border-color: var(--color-primary); background: var(--color-primary-light);
  transform: translateY(-2px); box-shadow: var(--shadow-md);
}
.type-choice-icon { font-size: 36px; line-height: 1; }
.type-choice-btn strong { font-size: var(--text-base); font-weight: 700; color: var(--color-text); }
.type-choice-desc { font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.5; }

/* Restore section */
.restore-section { background: var(--color-surface-alt); border-radius: var(--radius-lg); padding: 14px; }
.restore-section-title { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); margin-bottom: 10px; }
.restore-list { display: flex; flex-wrap: wrap; gap: 8px; }
.restore-tab-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-surface);
  font-size: var(--text-sm); cursor: pointer; transition: all var(--transition-fast);
}
.restore-tab-btn:hover { border-color: var(--color-accent); background: #f0fdf4; }
.restore-tag { font-size: 10px; color: var(--color-accent); font-weight: 700; border: 1px solid var(--color-accent); padding: 1px 6px; border-radius: var(--radius-full); }

.new-tab-section { display: flex; flex-direction: column; gap: 14px; }

.emoji-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.emoji-btn { width:34px;height:34px;font-size:17px;border-radius:var(--radius-md);border:2px solid transparent;background:var(--color-surface-alt);cursor:pointer;transition:all var(--transition-fast); }
.emoji-btn:hover, .emoji-btn.selected { border-color:var(--color-primary);background:var(--color-primary-light); }

@media (max-width: 768px) {
  /* En-tête bilan */
  .bilan-header { flex-direction: column; align-items: flex-start; gap: var(--space-sm); }
  .bilan-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; gap: 6px; }
  .bilan-breadcrumb { font-size: var(--text-xs); }

  /* Modal plein écran */
  .modal-card { padding: 20px 16px; }
  .type-choice-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 640px) {
  .bilan-date-edit, .tab-actions-bar { display: none; }
  .tab-icon { display: none; }

  /* Modale type : 1 colonne */
  .type-choice-grid { grid-template-columns: 1fr; }
}

/* Email send modal */
.email-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
@media (max-width: 600px) { .email-fields-row { grid-template-columns: 1fr; } }

.email-mode-badge {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 9px 14px; border-radius: var(--radius-md);
  font-size: var(--text-sm); margin-bottom: var(--space-md);
}
.email-mode-badge svg { flex-shrink: 0; }
.email-mode-badge--direct {
  background: #f0fdf4; border: 1px solid #86efac; color: #166534;
}
.email-mode-badge--fallback {
  background: #fffbeb; border: 1px solid #f59e0b; color: #92400e;
}
.email-setup-link { color: var(--color-primary); font-weight: 600; text-decoration: underline; white-space: nowrap; }

.email-config-warn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: var(--radius-md);
  background: #fffbeb; border: 1px solid #f59e0b;
  color: #92400e; font-size: var(--text-sm);
  margin-bottom: var(--space-md);
}
.email-config-warn svg { flex-shrink: 0; color: #f59e0b; }
</style>
