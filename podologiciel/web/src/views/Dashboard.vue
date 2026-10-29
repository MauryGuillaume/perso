<template>
  <div class="dashboard fade-in">
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-subtitle">{{ greeting }}, bienvenue sur Movyx.</p>
      </div>
      <RouterLink to="/patients/new" class="btn btn-primary btn-lg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nouveau patient
      </RouterLink>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon--patients">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalPatients }}</div>
          <div class="stat-label">Patients</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--bilans">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalBilans }}</div>
          <div class="stat-label">Bilans</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--today">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.bilansToday }}</div>
          <div class="stat-label">Bilans aujourd'hui</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--week">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.bilansWeek }}</div>
          <div class="stat-label">Cette semaine</div>
        </div>
      </div>
    </div>

    <!-- Recent bilans -->
    <div class="section-grid">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Bilans récents</h2>
          <RouterLink to="/patients" class="btn btn-ghost btn-sm">Voir tout</RouterLink>
        </div>
        <div v-if="recentBilans.length" class="bilan-list">
          <div
            v-for="bilan in recentBilans"
            :key="bilan.id"
            class="bilan-item"
            @click="openBilan(bilan)"
          >
            <div class="bilan-item__info">
              <div class="bilan-item__patient">{{ getPatientName(bilan.patientId) }}</div>
              <div class="bilan-item__date">{{ formatDate(bilan.date) }}</div>
            </div>
            <div class="bilan-item__right">
              <span class="badge" :class="bilan.statut === 'finalisé' ? 'badge-success' : 'badge-warning'">
                {{ bilan.statut }}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Aucun bilan pour l'instant.</p>
          <RouterLink to="/patients" class="btn btn-secondary btn-sm" style="margin-top:8px">Créer un examen</RouterLink>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Actions rapides</h2>
        </div>
        <div class="quick-actions">
          <RouterLink to="/patients/new" class="quick-action">
            <div class="qa-icon qa-icon--green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <div class="qa-text">
              <div class="qa-title">Nouveau patient</div>
              <div class="qa-sub">Créer un dossier</div>
            </div>
          </RouterLink>
          <RouterLink to="/patients" class="quick-action">
            <div class="qa-icon qa-icon--blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <div class="qa-text">
              <div class="qa-title">Rechercher</div>
              <div class="qa-sub">Trouver un patient</div>
            </div>
          </RouterLink>
          <button class="quick-action" @click="exportData">
            <div class="qa-icon qa-icon--purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div class="qa-text">
              <div class="qa-title">Exporter données</div>
              <div class="qa-sub">Sauvegarde JSON</div>
            </div>
          </button>
          <button class="quick-action" @click="importData">
            <div class="qa-icon qa-icon--orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="qa-text">
              <div class="qa-title">Importer données</div>
              <div class="qa-sub">Restaurer JSON</div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <input ref="importInput" type="file" accept=".json" style="display:none" @change="onImportFile" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { usePatientStore } from '@/store/patients.js'
import { useBilanStore } from '@/store/bilans.js'
import { useUIStore } from '@/store/ui.js'

const router = useRouter()
const patientStore = usePatientStore()
const bilanStore   = useBilanStore()
const uiStore      = useUIStore()
const importInput = ref(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
})

const today = new Date().toISOString().split('T')[0]
const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0]

const stats = computed(() => ({
  totalPatients: patientStore.patients.length,
  totalBilans: bilanStore.bilans.length,
  bilansToday: bilanStore.bilans.filter(b => b.date === today).length,
  bilansWeek: bilanStore.bilans.filter(b => b.date >= weekAgo).length
}))

const recentBilans = computed(() =>
  [...bilanStore.bilans]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6)
)

const getPatientName = (id) => {
  const p = patientStore.patients.find(p => p.id === id)
  return p ? `${p.prenom} ${p.nom}` : 'Patient inconnu'
}

const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

const openBilan = (bilan) => router.push(`/bilans/${bilan.id}`)

const exportData = () => {
  // Les stores sont déjà chargés en mémoire (loadPatients()/loadBilans() au login) —
  // pas besoin d'un aller-retour réseau supplémentaire pour l'export.
  const data = {
    patients: patientStore.patients,
    bilans: bilanStore.bilans,
    exportedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `podo-backup-${today}.json`
  a.click()
  URL.revokeObjectURL(url)
  uiStore.success('Données exportées avec succès')
}

const importData = () => importInput.value?.click()

const onImportFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      // Recrée chaque patient/bilan via l'API (pas d'upsert en masse côté serveur pour
      // l'instant) — les ids d'origine (Firestore/export précédent) ne sont pas réutilisés,
      // de nouveaux ids sont générés côté serveur à la création.
      for (const p of data.patients ?? []) {
        const { id, createdAt, updatedAt, ...rest } = p
        await patientStore.createPatient(rest)
      }
      for (const b of data.bilans ?? []) {
        const { id, createdAt, updatedAt, ...rest } = b
        const created = await bilanStore.createBilan(rest.patientId, rest.typeBilan)
        await bilanStore.updateBilan(created.id, rest)
      }
      uiStore.success('Données importées avec succès')
    } catch {
      uiStore.error('Fichier invalide')
    }
    e.target.value = ''
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-xl); gap: var(--space-md); flex-wrap: wrap; }
.page-title { font-size: var(--text-2xl); font-weight: 700; letter-spacing: -.02em; }
.page-subtitle { color: var(--color-text-muted); margin-top: 4px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex; align-items: center; gap: var(--space-md);
  box-shadow: var(--shadow-sm);
}
.stat-icon {
  width: 48px; height: 48px; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-icon--patients { background: var(--color-primary-light); color: var(--color-primary); }
.stat-icon--bilans { background: #ede9fe; color: #6d28d9; }
.stat-icon--today { background: #fef3c7; color: #d97706; }
.stat-icon--week { background: #fee2e2; color: #dc2626; }
.stat-value { font-size: var(--text-2xl); font-weight: 700; line-height: 1; }
.stat-label { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 4px; }

.section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }

.bilan-list { display: flex; flex-direction: column; gap: 2px; }
.bilan-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px var(--space-sm); border-radius: var(--radius-md);
  cursor: pointer; transition: background var(--transition-fast);
}
.bilan-item:hover { background: var(--color-primary-light); }
.bilan-item__patient { font-weight: 600; font-size: var(--text-sm); }
.bilan-item__date { font-size: var(--text-xs); color: var(--color-text-muted); }
.bilan-item__right { display: flex; align-items: center; gap: var(--space-sm); color: var(--color-text-light); }

.empty-state { text-align: center; padding: var(--space-xl); color: var(--color-text-muted); }

.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
.quick-action {
  display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-md); border-radius: var(--radius-md);
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  text-align: left; transition: all var(--transition-fast); cursor: pointer;
  color: inherit;
}
.quick-action:hover { border-color: var(--color-primary); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.qa-icon { width: 40px; height: 40px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qa-icon--green { background: var(--color-primary-light); color: var(--color-primary); }
.qa-icon--blue { background: #dbeafe; color: #1d4ed8; }
.qa-icon--purple { background: #ede9fe; color: #6d28d9; }
.qa-icon--orange { background: #ffedd5; color: #ea580c; }
.qa-title { font-weight: 600; font-size: var(--text-sm); }
.qa-sub { font-size: var(--text-xs); color: var(--color-text-muted); }

@media (max-width: 768px) {
  .section-grid { grid-template-columns: 1fr; }
  .quick-actions { grid-template-columns: 1fr 1fr; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header .btn { width: 100%; justify-content: center; }
  .stat-card { padding: var(--space-md); }
  .stat-icon { width: 40px; height: 40px; }
  .stat-value { font-size: var(--text-xl); }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .quick-actions { grid-template-columns: 1fr 1fr; }
  .quick-action { flex-direction: column; text-align: center; padding: var(--space-md) var(--space-sm); }
  .qa-text { display: none; }
  .qa-icon { width: 44px; height: 44px; }
}
</style>
