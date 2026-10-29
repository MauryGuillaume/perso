<template>
  <div class="semelles fade-in">
    <div class="page-header">
      <div>
        <h1 class="page-title">Semelles</h1>
        <p class="page-sub">Suivi des orthèses plantaires : prescription, fabrication, remise, contrôle et renouvellement</p>
      </div>
    </div>

    <div v-if="alertes.length" class="card alertes">
      <div class="alertes-titre">{{ alertes.length }} paire(s) demandent ton attention</div>
      <RouterLink v-for="a in alertes" :key="a.s.id" :to="`/semelles/${a.s.id}`" class="alerte" :class="'alerte-' + a.alerte.niveau">
        <strong>{{ nomPatient(a.s.patientId) }}</strong> · {{ a.alerte.texte }}
        <span class="muted">{{ a.s.dateControle && a.alerte.niveau === 'controle' ? 'prévu le ' + formatDate(a.s.dateControle) : a.s.dateRenouvellement && a.alerte.niveau === 'renouveler' ? 'depuis le ' + formatDate(a.s.dateRenouvellement) : '' }}</span>
      </RouterLink>
    </div>

    <div class="card filtres">
      <input v-model="recherche" class="form-input" placeholder="Rechercher un patient…" />
      <div class="statuts">
        <button class="statut-filtre" :class="{ active: !filtre }" @click="filtre = ''">Toutes ({{ semelles.length }})</button>
        <button v-for="s in STATUTS_SEMELLE" :key="s.value" class="statut-filtre" :class="{ active: filtre === s.value }" @click="filtre = s.value">
          {{ s.label }} ({{ semelles.filter(x => x.statut === s.value).length }})
        </button>
      </div>
    </div>

    <div class="card">
      <div v-if="chargement" class="vide">Chargement…</div>
      <div v-else-if="!liste.length" class="vide">
        <p>{{ semelles.length ? 'Aucune paire pour ce filtre.' : 'Aucune paire de semelles pour le moment.' }}</p>
        <p class="muted">Ouvre la fiche d'un patient puis « Nouvelle paire » dans la rubrique Semelles.</p>
      </div>
      <table v-else class="table">
        <thead><tr><th>Patient</th><th>Prescription</th><th>Pointure</th><th>Type</th><th>Statut</th><th>Contrôle</th><th>Renouvellement</th></tr></thead>
        <tbody>
          <tr v-for="s in liste" :key="s.id" class="ligne" @click="router.push(`/semelles/${s.id}`)">
            <td class="gras">{{ nomPatient(s.patientId) }}</td>
            <td>{{ formatDate(s.datePrescription) }}</td>
            <td>{{ s.pointure }}</td>
            <td>{{ libelleType(s.typeSemelle) }}<span v-if="s.fabrication === 'laboratoire'" class="muted"> · labo</span></td>
            <td><span class="statut" :class="classeStatut(s.statut)">{{ libelleStatut(s.statut) }}</span></td>
            <td>{{ s.dateControle ? formatDate(s.dateControle) : '—' }}</td>
            <td>{{ s.dateRenouvellement ? formatDate(s.dateRenouvellement) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/api.js'
import { usePatientStore } from '@/store/patients.js'
import { useUIStore } from '@/store/ui.js'
import { STATUTS_SEMELLE, libelleStatut, libelleType, alerteSemelle } from '@/utils/semelles.js'

const router = useRouter()
const patientStore = usePatientStore()
const uiStore = useUIStore()

const semelles = ref([])
const chargement = ref(true)
const filtre = ref('')
const recherche = ref('')

onMounted(async () => {
  try {
    if (!patientStore.patients.length) await patientStore.loadPatients()
    semelles.value = await api.listSemelles()
  } catch (e) {
    uiStore.error(e.message || 'Semelles illisibles')
  } finally {
    chargement.value = false
  }
})

const nomPatient = id => { const p = patientStore.patients.find(x => x.id === id); return p ? `${p.prenom} ${p.nom}` : '—' }
const formatDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
const classeStatut = v => STATUTS_SEMELLE.find(s => s.value === v)?.classe || ''

const liste = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  return semelles.value.filter(s => (!filtre.value || s.statut === filtre.value) && (!q || nomPatient(s.patientId).toLowerCase().includes(q)))
})
const alertes = computed(() => semelles.value.map(s => ({ s, alerte: alerteSemelle(s) })).filter(a => a.alerte))
</script>

<style scoped>
.semelles { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-md); }
.page-title { font-size: var(--text-2xl); font-weight: 800; }
.page-sub { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 4px; }
.alertes { border-left: 4px solid var(--color-warning); display: flex; flex-direction: column; gap: 6px; }
.alertes-titre { font-weight: 700; font-size: var(--text-sm); }
.alerte { font-size: var(--text-sm); color: var(--color-text); text-decoration: none; padding: 6px 10px; border-radius: var(--radius-sm); background: var(--color-surface-alt); }
.alerte:hover { background: var(--color-primary-light); }
.alerte-controle { border-left: 3px solid #2563eb; }
.alerte-renouveler { border-left: 3px solid #16a34a; }
.alerte-retard { border-left: 3px solid #dc2626; }
.filtres { display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: center; }
.filtres .form-input { max-width: 280px; }
.statuts { display: flex; flex-wrap: wrap; gap: 6px; }
.statut-filtre { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-full); padding: 5px 12px; font-size: var(--text-xs); font-weight: 600; cursor: pointer; color: var(--color-text); }
.statut-filtre.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.vide { text-align: center; color: var(--color-text-muted); padding: var(--space-lg); }
.muted { color: var(--color-text-muted); }
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; font-size: var(--text-xs); text-transform: uppercase; color: var(--color-text-muted); padding: 8px 10px; border-bottom: 2px solid var(--color-border); }
.table td { padding: 10px; font-size: var(--text-sm); border-bottom: 1px solid var(--color-border); }
.ligne { cursor: pointer; }
.ligne:hover { background: var(--color-primary-light); }
.gras { font-weight: 600; }
.statut { display: inline-block; padding: 2px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 700; }
.st-prescrite { background: #e0e7ff; color: #3730a3; }
.st-fabrication { background: #fef3c7; color: #92400e; }
.st-livree { background: #dcfce7; color: #15803d; }
.st-controlee { background: #e2e8f0; color: #334155; }
@media (max-width: 700px) { .table th:nth-child(n+5), .table td:nth-child(n+5) { display: none; } }
</style>
