<template>
  <div class="patient-list fade-in">
    <div class="page-header">
      <div>
        <h1 class="page-title">Répertoire patients</h1>
        <p class="page-subtitle">{{ patientStore.patients.length }} patient(s) enregistré(s)</p>
      </div>
      <div class="header-right">
        <!-- Compteur plan free -->
        <div v-if="planLimits.maxPatients !== Infinity" class="plan-counter" :class="{ warn: nearLimit, full: atLimit }">
          {{ patientCount }} / {{ planLimits.maxPatients }} patients
          <span v-if="atLimit"> — <a href="mailto:contact@movyx.com" class="upgrade-link">Passer en Pro</a></span>
        </div>
        <RouterLink
          to="/patients/new"
          class="btn btn-primary"
          :class="{ 'btn-disabled': atLimit }"
          @click.prevent="atLimit ? showLimitModal=true : null"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouveau patient
        </RouterLink>
      </div>
    </div>

    <!-- Bannière limite atteinte -->
    <div v-if="atLimit" class="limit-banner">
      🔒 Vous avez atteint la limite de <strong>{{ planLimits.maxPatients }} patients</strong> du plan Gratuit.
      <a href="mailto:contact@movyx.com" class="upgrade-link">Contactez-nous pour passer en Pro</a>
    </div>

    <!-- Barre de recherche + filtres -->
    <div class="toolbar">
      <div class="search-bar">
        <span class="search-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          v-model="search"
          type="search"
          placeholder="Rechercher par nom, prénom, médecin…"
          class="search-input"
          autocomplete="off"
        />
        <span v-if="search" class="search-count">{{ filteredPatients.length }} résultat(s)</span>
      </div>

      <div class="view-toggle">
        <button class="view-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Liste">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
        <button class="view-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" title="Grille">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Alphabet index -->
    <div class="alpha-index">
      <button
        v-for="letter in alphaLetters"
        :key="letter"
        class="alpha-btn"
        :class="{ active: alphaFilter === letter, has: lettersWithPatients.has(letter) }"
        @click="alphaFilter = alphaFilter === letter ? null : letter"
        :disabled="!lettersWithPatients.has(letter)"
      >{{ letter }}</button>
    </div>

    <!-- Liste -->
    <div v-if="filteredPatients.length">
      <!-- Mode liste -->
      <div v-if="viewMode === 'list'" class="patients-list">
        <div
          v-for="patient in filteredPatients"
          :key="patient.id"
          class="patient-row"
          @click="router.push(`/patients/${patient.id}`)"
        >
          <div class="patient-avatar" :style="{ background: avatarBg(patient) }">
            {{ initials(patient) }}
          </div>
          <div class="patient-main">
            <div class="patient-name">{{ patient.prenom }} {{ patient.nom }}</div>
            <div class="patient-meta">
              <span v-if="patient.dateNaissance">{{ age(patient.dateNaissance) }} ans</span>
              <span v-if="patient.dateNaissance && patient.medecinTraitant" class="sep">·</span>
              <span v-if="patient.medecinTraitant">Dr {{ patient.medecinTraitant }}</span>
              <span v-if="patient.telephone" class="sep">·</span>
              <span v-if="patient.telephone">{{ patient.telephone }}</span>
            </div>
          </div>
          <div class="patient-stats">
            <div class="stat-pill">
              <span class="stat-n">{{ bilanCount(patient.id) }}</span>
              <span class="stat-l">bilan(s)</span>
            </div>
            <div v-if="lastBilanDate(patient.id)" class="last-consult">
              Dernière : {{ lastBilanDate(patient.id) }}
            </div>
          </div>
          <div class="patient-row-actions" @click.stop>
            <RouterLink :to="`/patients/${patient.id}/bilans/new`" class="btn btn-accent btn-sm">
              + Nouvel examen
            </RouterLink>
            <button class="btn btn-ghost btn-icon btn-sm" @click="confirmDelete(patient)" title="Supprimer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mode grille -->
      <div v-else class="patients-grid">
        <div
          v-for="patient in filteredPatients"
          :key="patient.id"
          class="patient-card"
          @click="router.push(`/patients/${patient.id}`)"
        >
          <div class="card-avatar" :style="{ background: avatarBg(patient) }">
            {{ initials(patient) }}
          </div>
          <div class="card-name">{{ patient.prenom }} {{ patient.nom }}</div>
          <div v-if="patient.dateNaissance" class="card-age">{{ age(patient.dateNaissance) }} ans</div>
          <div v-if="patient.medecinTraitant" class="card-doctor">Dr {{ patient.medecinTraitant }}</div>
          <div class="card-bilans">
            <span class="badge badge-neutral">{{ bilanCount(patient.id) }} bilan(s)</span>
          </div>
          <div v-if="lastBilanDate(patient.id)" class="card-last">
            Dernière consultation : {{ lastBilanDate(patient.id) }}
          </div>
          <div class="card-actions" @click.stop>
            <RouterLink :to="`/patients/${patient.id}/bilans/new`" class="btn btn-primary btn-sm w-full">
              + Nouvel examen
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">👤</div>
      <h3>{{ search || alphaFilter ? 'Aucun résultat' : 'Aucun patient' }}</h3>
      <p>{{ search ? `Aucun patient pour "${search}"` : alphaFilter ? `Aucun patient commençant par "${alphaFilter}"` : 'Créez votre premier dossier patient.' }}</p>
      <RouterLink v-if="!search && !alphaFilter" to="/patients/new" class="btn btn-primary" style="margin-top:16px">
        Créer un patient
      </RouterLink>
    </div>

    <!-- Modal limite plan -->
    <Teleport to="body">
      <div v-if="showLimitModal" class="modal-overlay" @click.self="showLimitModal=false">
        <div class="modal">
          <div style="font-size:36px;text-align:center;margin-bottom:12px">🔒</div>
          <h3>Limite du plan Gratuit atteinte</h3>
          <p>Votre plan Gratuit est limité à <strong>{{ planLimits.maxPatients }} patients</strong>.<br>
          Passez en <strong>Pro</strong> pour un nombre illimité de patients et toutes les fonctionnalités avancées.</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showLimitModal=false">Fermer</button>
            <a href="mailto:contact@movyx.com" class="btn btn-primary">Contacter Movyx</a>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal suppression -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
          <div class="modal">
            <h3>Supprimer le patient ?</h3>
            <p>Vous allez supprimer <strong>{{ deleteTarget.prenom }} {{ deleteTarget.nom }}</strong> et tous ses bilans ({{ bilanCount(deleteTarget.id) }}).<br>Cette action est irréversible.</p>
            <div class="modal-actions">
              <button class="btn btn-ghost" @click="deleteTarget = null">Annuler</button>
              <button class="btn btn-danger" @click="doDelete">Supprimer définitivement</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { usePatientStore, FREE_MAX_PATIENTS } from '@/store/patients.js'
import { useBilanStore }   from '@/store/bilans.js'
import { useUIStore }      from '@/store/ui.js'
import { useAuthStore, getPlanLimits } from '@/store/auth.js'

const router       = useRouter()
const patientStore = usePatientStore()
const bilanStore   = useBilanStore()
const uiStore      = useUIStore()
const authStore    = useAuthStore()

const planLimits    = computed(() => getPlanLimits(authStore.effectiveUser?.role || 'free'))
const patientCount  = computed(() => patientStore.patients.length)
const atLimit       = computed(() => planLimits.value.maxPatients !== Infinity && patientCount.value >= planLimits.value.maxPatients)
const nearLimit     = computed(() => planLimits.value.maxPatients !== Infinity && patientCount.value >= planLimits.value.maxPatients - 2)

const search = ref('')
const alphaFilter = ref(null)
const viewMode = ref('list')
const deleteTarget = ref(null)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const alphaLetters = ALPHABET

const lettersWithPatients = computed(() => {
  const s = new Set()
  patientStore.patients.forEach(p => {
    const first = p.nom?.[0]?.toUpperCase()
    if (first) s.add(first)
  })
  return s
})

const filteredPatients = computed(() => {
  let list = patientStore.sortedPatients
  if (alphaFilter.value) {
    list = list.filter(p => p.nom?.[0]?.toUpperCase() === alphaFilter.value)
  }
  const q = search.value.toLowerCase().trim()
  if (q) {
    list = list.filter(p =>
      `${p.nom} ${p.prenom} ${p.medecinTraitant || ''}`.toLowerCase().includes(q)
    )
  }
  return list
})

const initials = (p) => `${p.prenom?.[0] || ''}${p.nom?.[0] || ''}`.toUpperCase() || '?'

const AVATAR_COLORS = ['#2B6CB0', '#52B848', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#DC2626']
const avatarBg = (p) => AVATAR_COLORS[(p.nom?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const age = (dob) => {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

const bilanCount = (id) => bilanStore.bilans.filter(b => b.patientId === id).length

const lastBilanDate = (id) => {
  const bilans = bilanStore.bilans.filter(b => b.patientId === id)
  if (!bilans.length) return null
  const last = bilans.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  return new Date(last.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const showLimitModal = ref(false)
const confirmDelete = (patient) => { deleteTarget.value = patient }
const doDelete = () => {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  // Le serveur retire aussi les bilans du patient ; on les retire de l'écran
  patientStore.deletePatient(id)
    .then(() => { bilanStore.bilans = bilanStore.bilans.filter(b => b.patientId !== id) })
    .catch(e => uiStore.error(e.message))
  uiStore.success('Patient supprimé')
  deleteTarget.value = null
}
</script>

<style scoped>
/* Plan */
.plan-counter { font-size: var(--text-xs); font-weight: 600; padding: 4px 12px; border-radius: var(--radius-full); background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.plan-counter.warn { background: #fef3c7; color: #d97706; border-color: #fde68a; }
.plan-counter.full { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
.upgrade-link { color: var(--color-primary); font-weight: 700; }
.upgrade-link:hover { text-decoration: underline; }
.limit-banner { background: #fff7ed; border: 1px solid #fed7aa; border-radius: var(--radius-lg); padding: 12px 16px; font-size: var(--text-sm); color: #9a3412; margin-bottom: var(--space-lg); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn-disabled { opacity: .5; cursor: not-allowed; pointer-events: none; }

.patient-list { max-width: 1100px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-xl); gap: var(--space-md); flex-wrap: wrap; }
.page-title { font-size: var(--text-2xl); font-weight: 700; letter-spacing: -.02em; }
.page-subtitle { color: var(--color-text-muted); margin-top: 4px; }

/* Toolbar */
.toolbar { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); }
.search-bar { position: relative; flex: 1; display: flex; align-items: center; }
.search-icon { position: absolute; left: 14px; color: var(--color-text-muted); pointer-events: none; }
.search-input {
  width: 100%; padding: 10px 14px 10px 42px;
  border: 1.5px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-surface); font-size: var(--text-sm); color: var(--color-text);
  outline: none; transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.search-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(43,108,176,.1); }
.search-count { position: absolute; right: 12px; font-size: var(--text-xs); color: var(--color-text-muted); }

.view-toggle { display: flex; gap: 3px; background: var(--color-surface-alt); border-radius: var(--radius-md); padding: 3px; border: 1px solid var(--color-border); }
.view-btn { padding: 6px; border-radius: var(--radius-sm); border: none; background: transparent; color: var(--color-text-muted); cursor: pointer; transition: all var(--transition-fast); }
.view-btn.active { background: var(--color-surface); color: var(--color-primary); box-shadow: var(--shadow-sm); }

/* Alphabet */
.alpha-index { display: flex; gap: 2px; flex-wrap: wrap; margin-bottom: var(--space-lg); }
.alpha-btn {
  min-width: 28px; height: 28px; border-radius: var(--radius-sm);
  border: 1px solid transparent; background: transparent; font-size: var(--text-xs);
  font-weight: 600; cursor: pointer; color: var(--color-text-light);
  transition: all var(--transition-fast); display: flex; align-items: center; justify-content: center;
}
.alpha-btn.has { color: var(--color-text); border-color: var(--color-border); background: var(--color-surface); }
.alpha-btn.has:hover { border-color: var(--color-primary); color: var(--color-primary); }
.alpha-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.alpha-btn:disabled { opacity: .3; cursor: default; }

/* List view */
.patients-list { display: flex; flex-direction: column; gap: var(--space-xs); }
.patient-row {
  display: flex; align-items: center; gap: var(--space-md);
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); padding: var(--space-md) var(--space-lg);
  cursor: pointer; transition: all var(--transition-fast); box-shadow: var(--shadow-sm);
}
.patient-row:hover { border-color: var(--color-primary); box-shadow: var(--shadow-md); transform: translateX(2px); }
.patient-avatar {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-sm); font-weight: 700; color: white;
}
.patient-main { flex: 1; min-width: 0; }
.patient-name { font-weight: 700; font-size: var(--text-md); }
.patient-meta { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; display: flex; gap: 4px; flex-wrap: wrap; }
.sep { color: var(--color-text-light); }
.patient-stats { text-align: right; flex-shrink: 0; min-width: 90px; }
.stat-pill { display: inline-flex; align-items: baseline; gap: 3px; }
.stat-n { font-size: var(--text-lg); font-weight: 800; color: var(--color-primary); }
.stat-l { font-size: var(--text-xs); color: var(--color-text-muted); }
.last-consult { font-size: 11px; color: var(--color-text-light); margin-top: 2px; }
.patient-row-actions { display: flex; align-items: center; gap: var(--space-sm); flex-shrink: 0; }

/* Grid view */
.patients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-md); }
.patient-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: var(--space-lg);
  cursor: pointer; transition: all var(--transition-fast);
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-sm);
}
.patient-card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-lg); transform: translateY(-2px); }
.card-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--text-xl); font-weight: 700; color: white;
  margin-bottom: var(--space-sm);
}
.card-name { font-weight: 700; font-size: var(--text-md); }
.card-age, .card-doctor { font-size: var(--text-xs); color: var(--color-text-muted); }
.card-last { font-size: 11px; color: var(--color-text-light); }
.card-actions { width: 100%; margin-top: var(--space-sm); }

/* Empty */
.empty-state { text-align: center; padding: var(--space-2xl); color: var(--color-text-muted); }
.empty-icon { font-size: 48px; margin-bottom: var(--space-md); }
.empty-state h3 { font-size: var(--text-lg); font-weight: 600; color: var(--color-text); margin-bottom: 8px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 9990; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
.modal { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-xl); max-width: 420px; width: 100%; box-shadow: var(--shadow-xl); }
.modal h3 { font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-md); }
.modal p { color: var(--color-text-muted); line-height: 1.6; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xl); }
.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* header-right inline style remplacé par classe */
.header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .header-right { width: 100%; justify-content: space-between; }
  .header-right .btn { flex: 1; justify-content: center; }
}

@media (max-width: 640px) {
  .patient-row { flex-wrap: wrap; gap: var(--space-sm); padding: var(--space-md); }
  .patient-row-actions { width: 100%; justify-content: stretch; gap: var(--space-sm); }
  .patient-row-actions .btn { flex: 1; justify-content: center; }
  .patient-stats { display: none; }
  .toolbar { flex-wrap: wrap; gap: var(--space-sm); }
  .alpha-index { display: none; }
  .patients-grid { grid-template-columns: 1fr 1fr; }
  .patients-list { gap: var(--space-sm); }
}

@media (max-width: 400px) {
  .patients-grid { grid-template-columns: 1fr; }
}
</style>
