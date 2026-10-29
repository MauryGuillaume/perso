<template>
  <div class="card docs-card">
    <div class="card-header">
      <h3 class="card-title">Documents</h3>
      <div class="docs-actions">
        <select v-model="filtre" class="form-input docs-filtre">
          <option value="">Tous ({{ documents.length }})</option>
          <option v-for="c in categoriesPresentes" :key="c.value" :value="c.value">{{ c.label }} ({{ c.n }})</option>
        </select>
        <button class="btn btn-accent btn-sm" :disabled="envoi.length > 0" @click="inputRef.click()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter
        </button>
        <input ref="inputRef" type="file" :accept="TYPES_ACCEPTES" multiple hidden @change="choisis($event.target.files); $event.target.value = ''" />
      </div>
    </div>

    <div class="drop" :class="{ survol }" @dragover.prevent="survol = true" @dragleave="survol = false" @drop.prevent="survol = false; choisis($event.dataTransfer.files)" @click="!documents.length && inputRef.click()">
      <div v-if="envoi.length" class="envoi">
        <div v-for="e in envoi" :key="e.nom" class="envoi-ligne">
          <span class="envoi-nom">{{ e.nom }}</span><span class="envoi-etat">{{ e.etat }}</span>
        </div>
      </div>

      <div v-if="chargement" class="docs-vide">Chargement…</div>
      <div v-else-if="!documents.length && !envoi.length" class="docs-vide">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.35"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        <p>Glisse ici des photos, empreintes, ordonnances ou comptes rendus (images, PDF, .txt), ou touche pour en choisir.</p>
      </div>

      <div v-else class="docs-grille">
        <button v-for="d in documentsFiltres" :key="d.id" class="doc" @click.stop="ouvert = d">
          <div class="doc-vignette">
            <img v-if="d.apercu" :src="d.apercu" alt="" />
            <span v-else class="doc-type">{{ d.typeMime === 'application/pdf' ? 'PDF' : d.typeMime === 'text/plain' ? 'TXT' : 'IMG' }}</span>
            <span v-if="d.nbAnnotations" class="doc-badge" title="Annotations">✎ {{ d.nbAnnotations }}</span>
          </div>
          <div class="doc-nom">{{ d.nom }}</div>
          <div class="doc-meta">{{ libelleCategorie(d.categorie) }} · {{ formatDate(d.createdAt) }}</div>
        </button>
      </div>
    </div>

    <DocumentViewer v-if="ouvert" :doc="ouvert" @fermer="ouvert = null" @maj="majDocument" @supprimer="aSupprimer = $event" />

    <Teleport to="body">
      <div v-if="aSupprimer" class="ds-overlay" @click.self="aSupprimer = null">
        <div class="ds-modal">
          <h3>Supprimer « {{ aSupprimer.nom }} » ?</h3>
          <p>Le document disparaît du dossier du patient.</p>
          <div class="ds-actions">
            <button class="btn btn-ghost" @click="aSupprimer = null">Annuler</button>
            <button class="btn btn-danger" @click="supprimer">Supprimer</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/api.js'
import { useUIStore } from '@/store/ui.js'
import { CATEGORIES_DOCUMENTS, TYPES_ACCEPTES, preparerDocument } from '@/utils/documents.js'
import DocumentViewer from '@/components/documents/DocumentViewer.vue'

const props = defineProps({ patientId: { type: String, required: true }, bilanId: { type: String, default: null } })
const emit = defineEmits(['nombre'])
const uiStore = useUIStore()

const documents = ref([])
const chargement = ref(true)
const filtre = ref('')
const survol = ref(false)
const envoi = ref([])
const ouvert = ref(null)
const aSupprimer = ref(null)
const inputRef = ref(null)

const formatDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
const libelleCategorie = v => CATEGORIES_DOCUMENTS.find(c => c.value === v)?.label || v
const documentsFiltres = computed(() => filtre.value ? documents.value.filter(d => d.categorie === filtre.value) : documents.value)
const categoriesPresentes = computed(() => CATEGORIES_DOCUMENTS.map(c => ({ ...c, n: documents.value.filter(d => d.categorie === c.value).length })).filter(c => c.n))

async function charger() {
  chargement.value = true
  try {
    documents.value = await api.listDocuments({ patientId: props.patientId, bilanId: props.bilanId })
    emit('nombre', documents.value.length)
  } catch (e) {
    uiStore.error(e.message || 'Documents illisibles')
  } finally {
    chargement.value = false
  }
}
watch(() => [props.patientId, props.bilanId], charger, { immediate: true })

async function choisis(liste) {
  const fichiers = [...(liste || [])]
  if (!fichiers.length) return
  envoi.value = fichiers.map(f => ({ nom: f.name, etat: 'en attente' }))
  let ok = 0
  for (const [i, f] of fichiers.entries()) {
    const ligne = envoi.value[i]
    try {
      ligne.etat = 'lecture…'
      const prepare = await preparerDocument(f)
      ligne.etat = 'envoi…'
      const cree = await api.createDocument({ ...prepare, patientId: props.patientId, bilanId: props.bilanId || undefined })
      documents.value.unshift(cree)
      ligne.etat = 'ajouté'
      ok++
    } catch (e) {
      ligne.etat = 'refusé'
      uiStore.error(e.message || `${f.name} : envoi impossible`)
    }
  }
  if (ok) uiStore.success(ok > 1 ? `${ok} documents ajoutés` : 'Document ajouté')
  emit('nombre', documents.value.length)
  setTimeout(() => { envoi.value = [] }, 1500)
}

function majDocument(d) {
  const i = documents.value.findIndex(x => x.id === d.id)
  if (i >= 0) documents.value[i] = { ...documents.value[i], ...d }
  if (ouvert.value?.id === d.id) Object.assign(ouvert.value, d)
}

async function supprimer() {
  const d = aSupprimer.value
  try {
    await api.deleteDocument(d.id)
    documents.value = documents.value.filter(x => x.id !== d.id)
    if (ouvert.value?.id === d.id) ouvert.value = null
    aSupprimer.value = null
    emit('nombre', documents.value.length)
    uiStore.success('Document supprimé')
  } catch (e) { uiStore.error(e.message) }
}
</script>

<style scoped>
.docs-card { margin-top: var(--space-lg); }
.docs-actions { display: flex; gap: var(--space-sm); align-items: center; }
.docs-filtre { width: auto; padding: 6px 10px; font-size: var(--text-xs); }
.drop { border: 2px dashed transparent; border-radius: var(--radius-md); transition: border-color .15s, background .15s; min-height: 80px; }
.drop.survol { border-color: var(--color-primary); background: var(--color-primary-light); }
.docs-vide { text-align: center; color: var(--color-text-muted); font-size: var(--text-sm); padding: var(--space-lg) var(--space-md); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.docs-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--space-md); padding: 4px; }
.doc { text-align: left; background: none; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: box-shadow .15s, border-color .15s; }
.doc:hover { border-color: var(--color-primary); box-shadow: var(--shadow-sm); }
.doc-vignette { position: relative; aspect-ratio: 4 / 3; background: var(--color-surface-alt); border-radius: var(--radius-sm); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.doc-vignette img { width: 100%; height: 100%; object-fit: cover; }
.doc-type { font-weight: 800; color: var(--color-text-muted); font-size: var(--text-sm); letter-spacing: .05em; }
.doc-badge { position: absolute; right: 4px; bottom: 4px; background: rgba(15,23,42,.75); color: #fff; font-size: 10px; padding: 1px 6px; border-radius: var(--radius-full); }
.doc-nom { font-size: var(--text-xs); font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doc-meta { font-size: 10px; color: var(--color-text-muted); }
.envoi { display: flex; flex-direction: column; gap: 4px; padding: 8px; }
.envoi-ligne { display: flex; justify-content: space-between; gap: 8px; font-size: var(--text-xs); background: var(--color-surface-alt); padding: 6px 10px; border-radius: var(--radius-sm); }
.envoi-nom { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.envoi-etat { color: var(--color-text-muted); flex-shrink: 0; }
.ds-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
.ds-modal { background: var(--color-surface); border-radius: var(--radius-lg); padding: var(--space-lg); max-width: 420px; width: 100%; display: flex; flex-direction: column; gap: var(--space-md); }
.ds-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); }
</style>
