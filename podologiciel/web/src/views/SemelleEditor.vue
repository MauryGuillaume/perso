<template>
  <div class="semelle-editor fade-in">
    <div class="breadcrumb">
      <RouterLink to="/semelles" class="breadcrumb-link">Semelles</RouterLink>
      <span>›</span>
      <RouterLink v-if="patient" :to="`/patients/${patient.id}`" class="breadcrumb-link">{{ patient.prenom }} {{ patient.nom }}</RouterLink>
      <span>›</span>
      <span>{{ estNouvelle ? 'Nouvelle paire' : `Paire du ${formatDate(form.datePrescription)}` }}</span>
    </div>

    <div v-if="chargement" class="card vide">Chargement…</div>
    <template v-else>
      <!-- En-tête et actions -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Semelles orthopédiques</h1>
          <p class="page-sub">{{ patient ? `${patient.prenom} ${patient.nom}` : '' }} · pointure {{ form.pointure }} · semelle de {{ L }} × {{ W }} mm</p>
        </div>
        <div class="header-actions">
          <span class="etat-save">{{ etatSave }}</span>
          <button class="btn btn-ghost btn-sm" :disabled="!elements.length && estNouvelle" @click="imprimer('gabarit')" title="Gabarits des deux semelles en taille réelle, une page par pied">Imprimer 1:1</button>
          <button class="btn btn-ghost btn-sm" @click="imprimer('fiche')">Fiche de fabrication</button>
          <button class="btn btn-primary btn-sm" :disabled="saving" @click="enregistrer()">Enregistrer</button>
        </div>
      </div>

      <!-- Prescription et suivi -->
      <div class="card">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Date de prescription</label><input v-model="form.datePrescription" type="date" class="form-input" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Pointure</label><input v-model.number="form.pointure" type="number" min="15" max="55" step="0.5" class="form-input" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Type de semelle</label>
            <select v-model="form.typeSemelle" class="form-input" @change="modifie"><option v-for="t in TYPES_SEMELLE" :key="t.value" :value="t.value">{{ t.label }}</option></select></div>
          <div class="form-group"><label class="form-label">Base</label><input v-model="form.base" list="materiaux" class="form-input" placeholder="EVA, résine, carbone…" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Épaisseur de base (mm)</label><input v-model.number="form.epaisseurBase" type="number" min="0" max="30" step="0.5" class="form-input" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Recouvrement</label><input v-model="form.recouvrement" list="materiaux" class="form-input" placeholder="Cuir, microfibre…" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Chaussage</label><input v-model="form.chaussage" class="form-input" placeholder="Ville, sport, sécurité…" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Examen lié</label>
            <select v-model="form.bilanId" class="form-input" @change="modifie">
              <option :value="null">Aucun</option>
              <option v-for="b in bilansPatient" :key="b.id" :value="b.id">Examen du {{ formatDate(b.date) }}</option>
            </select></div>
        </div>
        <hr class="divider" />
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Statut</label>
            <select v-model="form.statut" class="form-input" @change="changementStatut"><option v-for="s in STATUTS_SEMELLE" :key="s.value" :value="s.value">{{ s.label }}</option></select></div>
          <div class="form-group"><label class="form-label">Fabrication</label>
            <select v-model="form.fabrication" class="form-input" @change="modifie"><option value="cabinet">Au cabinet</option><option value="laboratoire">Laboratoire</option></select></div>
          <div v-if="form.fabrication === 'laboratoire'" class="form-group"><label class="form-label">Laboratoire</label><input v-model="form.laboratoire" class="form-input" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Prix de la paire (€)</label><input v-model.number="form.prix" type="number" min="0" step="0.01" class="form-input" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Remise au patient</label><input v-model="form.dateLivraison" type="date" class="form-input" @change="modifie" /></div>
          <div class="form-group"><label class="form-label">Contrôle</label>
            <div class="avec-raccourci"><input v-model="form.dateControle" type="date" class="form-input" @change="modifie" />
              <button class="btn btn-ghost btn-sm" title="Un mois après la remise" @click="form.dateControle = plusMois(form.dateLivraison || aujourdHui, 1); modifie()">+1 mois</button></div></div>
          <div class="form-group"><label class="form-label">Renouvellement conseillé</label>
            <div class="avec-raccourci"><input v-model="form.dateRenouvellement" type="date" class="form-input" @change="modifie" />
              <button class="btn btn-ghost btn-sm" title="Un an après la remise" @click="form.dateRenouvellement = plusMois(form.dateLivraison || aujourdHui, 12); modifie()">+1 an</button></div></div>
        </div>
      </div>

      <!-- Schéma -->
      <div class="schema-zone">
        <div class="card palette">
          <h3 class="section-label">Ajouter un élément</h3>
          <div class="cote-choix">
            <button v-for="c in [['G', 'Gauche'], ['D', 'Droit'], ['GD', 'Les deux']]" :key="c[0]" class="cote-btn" :class="{ active: coteAjout === c[0] }" @click="coteAjout = c[0]">{{ c[1] }}</button>
          </div>
          <button v-for="t in ELEMENTS" :key="t.type" class="palette-item" @click="ajouter(t.type)">
            <span class="pastille" :style="{ background: t.couleur }">{{ t.abbr }}</span>{{ t.label }}
          </button>
          <div class="palette-bas">
            <button class="btn btn-ghost btn-sm" @click="symetriser('G')">Copier gauche → droit</button>
            <button class="btn btn-ghost btn-sm" @click="symetriser('D')">Copier droit → gauche</button>
            <label class="check"><input v-model="grille" type="checkbox" /> Quadrillage 1 cm</label>
          </div>
        </div>

        <div class="card pieds">
          <div class="pied" v-for="c in ['G', 'D']" :key="c">
            <div class="pied-titre">Pied {{ c === 'G' ? 'gauche' : 'droit' }} <span class="muted">({{ elementsDe(c).length }})</span></div>
            <SemelleSchema :cote="c" :pointure="form.pointure" :elements="elementsDe(c)" :choisi="choisiId" :grille="grille" interactive
                           @selectionner="choisiId = $event" @deplacer="deplacer" />
          </div>
          <p class="aide">Vue du dessus de la semelle, orteils en haut. Fais glisser un élément pour le placer ; touche-le pour régler sa taille, son épaisseur et son matériau.</p>
        </div>

        <div class="card proprietes">
          <template v-if="choisi">
            <h3 class="section-label">{{ elementType(choisi.type).label }} — pied {{ choisi.cote === 'G' ? 'gauche' : 'droit' }}</h3>
            <div class="prop-grille">
              <label>Largeur (mm)<input v-model.number="choisi.largeur" type="number" min="2" max="200" class="form-input" @change="modifie" /></label>
              <label>Longueur (mm)<input v-model.number="choisi.hauteur" type="number" min="2" max="300" class="form-input" @change="modifie" /></label>
              <label>Épaisseur (mm)<input v-model.number="choisi.epaisseur" type="number" min="0" max="30" step="0.5" class="form-input" @change="modifie" /></label>
              <label>Rotation (°)<input v-model.number="choisi.rotation" type="number" min="-180" max="180" step="5" class="form-input" @change="modifie" /></label>
              <label>Matériau<input v-model="choisi.materiau" list="materiaux" class="form-input" @change="modifie" /></label>
              <label>Dureté (Shore)<input v-model="choisi.durete" class="form-input" placeholder="ex. 35" @change="modifie" /></label>
            </div>
            <label class="prop-note">Note<textarea v-model="choisi.note" rows="2" class="form-textarea" @change="modifie" /></label>
            <p class="aide">{{ positionLisible(choisi) }}</p>
            <div class="prop-actions">
              <button class="btn btn-ghost btn-sm" @click="dupliquerMiroir(choisi)">Reproduire sur l'autre pied</button>
              <button class="btn btn-danger btn-sm" @click="retirer(choisi)">Retirer</button>
            </div>
          </template>
          <template v-else>
            <h3 class="section-label">Éléments</h3>
            <p v-if="!elements.length" class="aide">Choisis un pied puis un élément dans la liste pour commencer.</p>
            <div v-for="e in elementsTries" :key="e.id" class="liste-el" @click="choisiId = e.id">
              <span class="pastille" :style="{ background: elementType(e.type).couleur }">{{ elementType(e.type).abbr }}</span>
              <span>{{ e.cote }} · {{ elementType(e.type).label }}</span><span class="muted">{{ e.epaisseur }} mm</span>
            </div>
          </template>
        </div>
      </div>

      <div class="card">
        <label class="form-label">Notes de prescription</label>
        <textarea v-model="form.notes" class="form-textarea" rows="3" placeholder="Objectif, consignes de port, adaptation…" @change="modifie" />
      </div>

      <div v-if="!estNouvelle" class="zone-danger">
        <button class="btn btn-danger btn-sm" @click="supprimerPaire">Supprimer cette paire</button>
      </div>
    </template>

    <datalist id="materiaux"><option v-for="m in MATERIAUX" :key="m" :value="m" /></datalist>

    <!-- Impression (visible seulement sur papier) -->
    <Teleport to="body">
      <div v-if="impression" class="zone-impression">
        <template v-if="impression === 'gabarit'">
          <div v-for="c in ['G', 'D']" :key="c" class="page-gabarit">
            <div class="gabarit-entete">
              <strong>{{ patient?.prenom }} {{ patient?.nom }}</strong> — pied {{ c === 'G' ? 'GAUCHE' : 'DROIT' }} — pointure {{ form.pointure }} ({{ L }} mm) — {{ formatDate(form.datePrescription) }}
              <div class="regle"><span class="regle-trait" />contrôle : ce trait doit mesurer 50 mm (imprimer à 100 %, sans « ajuster à la page »)</div>
            </div>
            <SemelleSchema :cote="c" :pointure="form.pointure" :elements="elementsDe(c)" :grille="false" :marge="2" echelle1 />
          </div>
        </template>
        <div v-else class="fiche">
          <div class="fiche-entete">
            <div>
              <div class="fiche-titre">Fiche de fabrication — orthèses plantaires</div>
              <div>{{ pro?.prenom }} {{ pro?.nom }}{{ pro?.cabinet ? ' · ' + pro.cabinet : '' }}</div>
            </div>
            <div class="fiche-date">Prescription du {{ formatDate(form.datePrescription) }}</div>
          </div>
          <table class="fiche-infos">
            <tr><th>Patient</th><td>{{ patient?.prenom }} {{ patient?.nom }}{{ patient?.dateNaissance ? ` (né(e) le ${formatDate(patient.dateNaissance)})` : '' }}</td><th>Pointure</th><td>{{ form.pointure }} — {{ L }} × {{ W }} mm</td></tr>
            <tr><th>Type</th><td>{{ libelleType(form.typeSemelle) }}</td><th>Base</th><td>{{ form.base || '—' }}{{ form.epaisseurBase ? `, ${form.epaisseurBase} mm` : '' }}</td></tr>
            <tr><th>Recouvrement</th><td>{{ form.recouvrement || '—' }}</td><th>Chaussage</th><td>{{ form.chaussage || '—' }}</td></tr>
            <tr><th>Fabrication</th><td>{{ form.fabrication === 'laboratoire' ? `Laboratoire ${form.laboratoire || ''}` : 'Au cabinet' }}</td><th>Remise prévue</th><td>{{ form.dateLivraison ? formatDate(form.dateLivraison) : '—' }}</td></tr>
          </table>
          <div class="fiche-schemas">
            <div v-for="c in ['G', 'D']" :key="c" class="fiche-pied">
              <div class="pied-titre">Pied {{ c === 'G' ? 'gauche' : 'droit' }}</div>
              <SemelleSchema :cote="c" :pointure="form.pointure" :elements="elementsDe(c)" :grille="true" />
            </div>
          </div>
          <table class="fiche-elements">
            <thead><tr><th>Pied</th><th>Élément</th><th>Position</th><th>Taille (mm)</th><th>Ép.</th><th>Matériau</th><th>Dureté</th><th>Note</th></tr></thead>
            <tbody>
              <tr v-for="e in elementsTries" :key="e.id">
                <td>{{ e.cote }}</td><td>{{ elementType(e.type).label }}</td><td>{{ positionLisible(e) }}</td>
                <td>{{ e.largeur }} × {{ e.hauteur }}{{ e.rotation ? `, ${e.rotation}°` : '' }}</td><td>{{ e.epaisseur }}</td><td>{{ e.materiau || '—' }}</td><td>{{ e.durete || '—' }}</td><td>{{ e.note }}</td>
              </tr>
              <tr v-if="!elements.length"><td colspan="8">Aucun élément.</td></tr>
            </tbody>
          </table>
          <div v-if="form.notes" class="fiche-notes"><strong>Notes :</strong> {{ form.notes }}</div>
          <div class="fiche-signature">Signature du praticien :</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { api } from '@/api.js'
import { usePatientStore } from '@/store/patients.js'
import { useBilanStore } from '@/store/bilans.js'
import { useAuthStore } from '@/store/auth.js'
import { useUIStore } from '@/store/ui.js'
import SemelleSchema from '@/components/semelles/SemelleSchema.vue'
import {
  ELEMENTS, TYPES_SEMELLE, STATUTS_SEMELLE, MATERIAUX, elementType, nouvelElement, longueurSemelle, largeurSemelle,
  positionLisible, libelleType, plusMois,
} from '@/utils/semelles.js'

const route = useRoute()
const router = useRouter()
const patientStore = usePatientStore()
const bilanStore = useBilanStore()
const authStore = useAuthStore()
const uiStore = useUIStore()

const aujourdHui = new Date().toISOString().slice(0, 10)
const id = ref(route.params.id || null)
const estNouvelle = computed(() => !id.value)
const patientId = ref(route.params.patientId || null)
const chargement = ref(true)
const saving = ref(false)
const nonEnregistre = ref(false)
const grille = ref(true)
const coteAjout = ref('GD')
const choisiId = ref(null)
const impression = ref(null)

const form = reactive({
  datePrescription: aujourdHui, pointure: 40, typeSemelle: 'thermoformee', base: '', epaisseurBase: null, recouvrement: '', chaussage: '',
  bilanId: null, statut: 'prescrite', fabrication: 'cabinet', laboratoire: '', prix: null, dateLivraison: '', dateControle: '', dateRenouvellement: '', notes: '',
})
const elements = ref([])

const patient = computed(() => patientStore.patients.find(p => p.id === patientId.value) || null)
const pro = computed(() => authStore.currentUser)
const bilansPatient = computed(() => patientId.value ? bilanStore.bilansByPatient(patientId.value) : [])
const L = computed(() => longueurSemelle(form.pointure))
const W = computed(() => largeurSemelle(form.pointure))
const choisi = computed(() => elements.value.find(e => e.id === choisiId.value) || null)
const elementsDe = c => elements.value.filter(e => e.cote === c)
const elementsTries = computed(() => [...elements.value].sort((a, b) => a.cote.localeCompare(b.cote) || b.v - a.v))
const etatSave = computed(() => saving.value ? 'Enregistrement…' : nonEnregistre.value ? 'Modifications non enregistrées' : estNouvelle.value ? '' : 'Enregistré')

const formatDate = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

onMounted(async () => {
  try {
    if (!patientStore.patients.length) await patientStore.loadPatients()
    if (id.value) {
      const s = await api.getSemelle(id.value)
      patientId.value = s.patientId
      for (const k of Object.keys(form)) if (s[k] !== undefined && s[k] !== null) form[k] = s[k]
      elements.value = s.elements || []
    } else {
      // Pointure reprise de la dernière paire du patient
      const precedentes = await api.listSemelles(patientId.value).catch(() => [])
      if (precedentes[0]) form.pointure = precedentes[0].pointure
      if (route.query.bilanId) form.bilanId = String(route.query.bilanId)
    }
    if (!patient.value) { uiStore.error('Patient introuvable'); router.push('/semelles'); return }
  } catch (e) {
    uiStore.error(e.message || 'Semelle introuvable')
    router.push('/semelles')
    return
  } finally {
    chargement.value = false
  }
  window.addEventListener('afterprint', finImpression)
})
onBeforeUnmount(() => { window.removeEventListener('afterprint', finImpression); clearTimeout(timer) })
onBeforeRouteLeave(async () => { if (nonEnregistre.value && !estNouvelle.value) await enregistrer(true) })

// ── Éléments ─────────────────────────────────────────────────────────────────
function ajouter(type) {
  const cotes = coteAjout.value === 'GD' ? ['G', 'D'] : [coteAjout.value]
  const crees = cotes.map(c => nouvelElement(type, c, form.pointure))
  elements.value.push(...crees)
  choisiId.value = crees[crees.length - 1].id
  modifie()
}
function deplacer({ id: eid, u, v }) {
  const e = elements.value.find(x => x.id === eid)
  if (e) { e.u = u; e.v = v; modifie() }
}
function retirer(e) {
  elements.value = elements.value.filter(x => x.id !== e.id)
  choisiId.value = null
  modifie()
}
function dupliquerMiroir(e) {
  const copie = { ...e, id: nouvelElement(e.type, e.cote, form.pointure).id, cote: e.cote === 'G' ? 'D' : 'G' }
  elements.value.push(copie)
  choisiId.value = copie.id
  modifie()
}
function symetriser(depuis) {
  const vers = depuis === 'G' ? 'D' : 'G'
  if (elementsDe(vers).length && !confirm(`Remplacer les éléments du pied ${vers === 'G' ? 'gauche' : 'droit'} par ceux du pied ${depuis === 'G' ? 'gauche' : 'droit'} ?`)) return
  elements.value = [...elementsDe(depuis), ...elementsDe(depuis).map(e => ({ ...e, id: nouvelElement(e.type, vers, form.pointure).id, cote: vers }))]
  choisiId.value = null
  modifie()
}

// ── Enregistrement (automatique une seconde après une modification) ──────────
let timer = null
function modifie() {
  nonEnregistre.value = true
  if (estNouvelle.value) return
  clearTimeout(timer)
  timer = setTimeout(() => enregistrer(true), 1000)
}

function changementStatut() {
  if (form.statut === 'livree' && !form.dateLivraison) {
    form.dateLivraison = aujourdHui
    if (!form.dateControle) form.dateControle = plusMois(aujourdHui, 1)
    if (!form.dateRenouvellement) form.dateRenouvellement = plusMois(aujourdHui, 12)
  }
  modifie()
}

async function enregistrer(silencieux = false) {
  clearTimeout(timer)
  if (saving.value) return
  saving.value = true
  const donnees = { ...form, elements: elements.value }
  for (const k of ['dateLivraison', 'dateControle', 'dateRenouvellement']) if (!donnees[k]) donnees[k] = null
  try {
    if (estNouvelle.value) {
      const s = await api.createSemelle({ ...donnees, patientId: patientId.value })
      id.value = s.id
      router.replace(`/semelles/${s.id}`)
      uiStore.success('Paire de semelles enregistrée')
    } else {
      await api.updateSemelle(id.value, donnees)
      if (!silencieux) uiStore.success('Enregistré')
    }
    nonEnregistre.value = false
  } catch (e) {
    uiStore.error(e.message || 'Enregistrement impossible')
  } finally {
    saving.value = false
  }
}

async function supprimerPaire() {
  if (!confirm('Supprimer cette paire de semelles ?')) return
  try {
    await api.deleteSemelle(id.value)
    nonEnregistre.value = false
    uiStore.success('Paire supprimée')
    router.push(`/patients/${patientId.value}`)
  } catch (e) { uiStore.error(e.message) }
}

// ── Impression ───────────────────────────────────────────────────────────────
let stylePage = null
async function imprimer(quoi) {
  if (nonEnregistre.value) await enregistrer(true)
  impression.value = quoi
  await nextTick()
  // Gabarit 1:1 : A4 portrait jusqu'à ~27 cm de semelle, A3 au-delà
  // Gabarit 1:1 : A4 portrait (287 mm utiles) jusqu'à la pointure 42 environ, A3 au-delà
  const format = quoi === 'gabarit' && L.value + 4 > 286 ? 'A3' : 'A4'
  stylePage = document.createElement('style')
  stylePage.textContent = `@page { size: ${format} portrait; margin: ${quoi === 'gabarit' ? 5 : 8}mm; }`
  document.head.appendChild(stylePage)
  document.documentElement.classList.add('impression-semelles')
  if (quoi === 'gabarit' && format === 'A3') uiStore.info('Semelle longue : choisis le format A3 dans la fenêtre d’impression.')
  setTimeout(() => { window.print(); setTimeout(finImpression, 1500) }, 50)
}
function finImpression() {
  document.documentElement.classList.remove('impression-semelles')
  stylePage?.remove(); stylePage = null
  impression.value = null
}
</script>

<style scoped>
.semelle-editor { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-lg); }
.breadcrumb { display: flex; gap: var(--space-sm); align-items: center; font-size: var(--text-sm); color: var(--color-text-muted); }
.breadcrumb-link { color: var(--color-primary); text-decoration: none; }
.page-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-md); align-items: flex-start; }
.page-title { font-size: var(--text-2xl); font-weight: 800; }
.page-sub { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 4px; }
.header-actions { display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center; }
.etat-save { font-size: var(--text-xs); color: var(--color-text-muted); }
.vide { text-align: center; color: var(--color-text-muted); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: var(--space-md); }
.divider { border: 0; border-top: 1px solid var(--color-border); margin: var(--space-md) 0; }
.avec-raccourci { display: flex; gap: 4px; }
.avec-raccourci .form-input { flex: 1; min-width: 0; }
.schema-zone { display: grid; grid-template-columns: 230px minmax(0, 1fr) 280px; gap: var(--space-md); align-items: start; }
.section-label { font-size: var(--text-sm); font-weight: 700; color: var(--color-primary); margin-bottom: var(--space-sm); }
.palette { display: flex; flex-direction: column; gap: 4px; padding: var(--space-md); }
.cote-choix { display: flex; gap: 4px; margin-bottom: 6px; }
.cote-btn { flex: 1; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-sm); padding: 5px; font-size: var(--text-xs); font-weight: 600; cursor: pointer; }
.cote-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.palette-item { display: flex; align-items: center; gap: 8px; text-align: left; background: none; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 5px 6px; font-size: var(--text-xs); cursor: pointer; color: var(--color-text); }
.palette-item:hover { background: var(--color-primary-light); border-color: var(--color-border); }
.pastille { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 20px; border-radius: 5px; color: #fff; font-size: 10px; font-weight: 800; flex-shrink: 0; }
.palette-bas { display: flex; flex-direction: column; gap: 4px; margin-top: var(--space-sm); border-top: 1px solid var(--color-border); padding-top: var(--space-sm); }
.check { font-size: var(--text-xs); display: flex; gap: 6px; align-items: center; color: var(--color-text-muted); }
.pieds { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); padding: var(--space-md); }
.pied { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pied :deep(.semelle-svg) { width: 100%; max-height: 72vh; }
.pied-titre { font-weight: 700; font-size: var(--text-sm); }
.muted { color: var(--color-text-muted); font-weight: 400; }
.aide { grid-column: 1 / -1; font-size: var(--text-xs); color: var(--color-text-muted); margin: 0; line-height: 1.5; }
.proprietes { padding: var(--space-md); display: flex; flex-direction: column; gap: var(--space-sm); }
.prop-grille { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.prop-grille label, .prop-note { display: flex; flex-direction: column; gap: 3px; font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); }
.prop-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.liste-el { display: flex; align-items: center; gap: 8px; font-size: var(--text-xs); padding: 4px; border-radius: var(--radius-sm); cursor: pointer; }
.liste-el:hover { background: var(--color-primary-light); }
.liste-el .muted { margin-left: auto; }
.zone-danger { display: flex; justify-content: flex-end; }
@media (max-width: 1100px) {
  .schema-zone { grid-template-columns: 1fr; }
  .palette { flex-direction: row; flex-wrap: wrap; }
  .palette .section-label, .cote-choix, .palette-bas { width: 100%; }
  .palette-bas { flex-direction: row; flex-wrap: wrap; }
}
</style>

<style>
/* Impression : seule la zone d'impression des semelles sort sur papier */
.zone-impression { display: none; }
@media print {
  html.impression-semelles body > *:not(.zone-impression) { display: none !important; }
  html.impression-semelles .zone-impression { display: block; color: #000; font-family: system-ui, sans-serif; }
  html.impression-semelles, html.impression-semelles body { background: #fff !important; }
  .page-gabarit { page-break-after: always; break-after: page; display: flex; flex-direction: row; align-items: flex-start; justify-content: center; gap: 6mm; }
  .page-gabarit:last-child { page-break-after: auto; break-after: auto; }
  /* Texte et règle de contrôle sur le côté : toute la hauteur de la page reste pour la semelle */
  .gabarit-entete { font-size: 9pt; writing-mode: vertical-rl; transform: rotate(180deg); display: flex; gap: 3mm; align-items: flex-start; max-height: 285mm; }
  .regle { display: flex; align-items: center; gap: 3mm; font-size: 7.5pt; }
  .regle-trait { display: inline-block; height: 50mm; width: 2mm; border: 0.3mm solid #000; border-left: 0; }
  .fiche { font-size: 9pt; display: flex; flex-direction: column; gap: 4mm; }
  .fiche-entete { display: flex; justify-content: space-between; border-bottom: 0.4mm solid #000; padding-bottom: 2mm; }
  .fiche-titre { font-size: 13pt; font-weight: 800; }
  .fiche table { width: 100%; border-collapse: collapse; }
  .fiche th, .fiche td { border: 0.2mm solid #999; padding: 1.2mm 2mm; text-align: left; vertical-align: top; }
  .fiche th { background: #f1f5f9; font-weight: 700; }
  .fiche-schemas { display: flex; justify-content: center; gap: 10mm; }
  .fiche-pied { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .fiche-pied .semelle-svg { height: 105mm; width: auto; }
  .fiche-signature { margin-top: 8mm; height: 20mm; }
}
</style>
