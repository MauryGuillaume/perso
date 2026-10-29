<template>
  <Teleport to="body">
    <div class="dv-overlay" @click.self="fermer">
      <div class="dv">
        <!-- En-tête -->
        <div class="dv-head">
          <div class="dv-title">
            <input v-model="meta.nom" class="form-input dv-nom" @change="enregistrerMeta" />
            <select v-model="meta.categorie" class="form-input dv-select" @change="enregistrerMeta">
              <option v-for="c in CATEGORIES_DOCUMENTS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <select v-model="meta.bilanId" class="form-input dv-select" title="Rattacher à un examen" @change="enregistrerMeta">
              <option :value="null">Aucun examen lié</option>
              <option v-for="b in bilansDuPatient" :key="b.id" :value="b.id">Examen du {{ formatDate(b.date) }}</option>
            </select>
          </div>
          <div class="dv-head-actions">
            <button class="btn btn-ghost btn-sm" @click="telecharger" title="Télécharger le fichier d'origine">Télécharger</button>
            <button v-if="estImage" class="btn btn-ghost btn-sm" @click="telechargerAnnote" title="Image avec les annotations">Image annotée</button>
            <button class="btn btn-danger btn-sm" @click="emit('supprimer', doc)">Supprimer</button>
            <button class="btn btn-ghost btn-icon" @click="fermer" title="Fermer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="dv-body">
          <!-- Zone du document -->
          <div class="dv-media" ref="mediaRef">
            <div v-if="chargement" class="dv-info">Chargement du document…</div>
            <div v-else-if="erreur" class="dv-info dv-erreur">{{ erreur }}</div>

            <!-- Image + annotations -->
            <template v-else-if="estImage && imageUrl">
              <div class="ann-toolbar">
                <button v-for="o in OUTILS" :key="o.id" class="ann-tool" :class="{ active: outil === o.id }" :title="o.aide" @click="outil = o.id">{{ o.label }}</button>
                <input v-if="outil === 'texte'" v-model="texteAPlacer" class="form-input ann-input" placeholder="Texte, puis clique sur l'image" />
                <span class="ann-sep" />
                <button v-for="c in COULEURS" :key="c" class="ann-color" :class="{ active: couleur === c }" :style="{ background: c }" @click="couleur = c" />
                <span class="ann-sep" />
                <button class="ann-tool" :disabled="!annotations.length" @click="annuler">Annuler</button>
                <button class="ann-tool" :disabled="!annotations.length" @click="toutEffacer">Effacer</button>
                <span class="ann-etat">{{ etatAnnotations }}</span>
              </div>
              <div class="img-wrap">
                <img :src="imageUrl" class="dv-img" draggable="false" @load="onImageLoad" />
                <svg v-if="dims.w" class="ann-svg" :viewBox="`0 0 ${dims.w} ${dims.h}`" :class="{ dessin: outil !== 'aucun' }"
                     @pointerdown="debut" @pointermove="deplace" @pointerup="fin" @pointercancel="fin">
                  <defs>
                    <marker v-for="c in COULEURS" :id="'pointe' + c.slice(1)" :key="c" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" :fill="c" />
                    </marker>
                  </defs>
                  <g v-for="(a, i) in [...annotations, ...(enCours ? [enCours] : [])]" :key="i">
                    <polyline v-if="a.type === 'trait'" :points="pts(a)" fill="none" :stroke="a.couleur" :stroke-width="trait" stroke-linecap="round" stroke-linejoin="round" />
                    <line v-else-if="a.type === 'ligne' || a.type === 'fleche'" :x1="px(a.points[0])[0]" :y1="px(a.points[0])[1]" :x2="px(a.points[1] || a.points[0])[0]" :y2="px(a.points[1] || a.points[0])[1]"
                          :stroke="a.couleur" :stroke-width="trait" stroke-linecap="round" :marker-end="a.type === 'fleche' ? `url(#pointe${a.couleur.slice(1)})` : null" />
                    <template v-else-if="a.type === 'angle'">
                      <polyline :points="pts(a)" fill="none" :stroke="a.couleur" :stroke-width="trait" stroke-linejoin="round" />
                      <circle v-for="(p, j) in a.points" :key="j" :cx="px(p)[0]" :cy="px(p)[1]" :r="trait * 1.4" :fill="a.couleur" />
                      <text v-if="a.points.length === 3" :x="px(a.points[1])[0] + trait * 4" :y="px(a.points[1])[1] - trait * 4" :font-size="trait * 9" :fill="a.couleur" class="ann-text">{{ angleDe(a) }}°</text>
                    </template>
                    <text v-else-if="a.type === 'texte'" :x="px(a.points[0])[0]" :y="px(a.points[0])[1]" :font-size="trait * 8" :fill="a.couleur" class="ann-text">{{ a.texte }}</text>
                  </g>
                </svg>
              </div>
            </template>

            <!-- PDF : pages dessinées -->
            <div v-else-if="estPdf" class="pdf-pages" ref="pagesRef">
              <div v-if="pdfRepli" class="dv-info">
                Aperçu des pages indisponible ici.
                <button class="btn btn-secondary btn-sm" @click="telecharger">Ouvrir le PDF</button>
              </div>
            </div>

            <!-- Texte -->
            <pre v-else-if="estTexte" class="dv-texte">{{ texteFichier }}</pre>
          </div>

          <!-- Panneau : texte lu et aide au bilan -->
          <aside class="dv-side">
            <h4>Texte du document</h4>
            <p v-if="estImage" class="dv-hint">Pour une photo, écris ici ce qui t'intéresse (ex. mesures, remarques) : ce texte se retrouve dans la recherche et peut aller dans un examen.</p>
            <p v-else-if="estPdf && !meta.texte" class="dv-hint">Aucun texte lu dans ce PDF (document scanné ?). Tu peux le saisir ici.</p>
            <textarea ref="texteRef" v-model="meta.texte" class="form-textarea dv-textarea" placeholder="Texte du document…" />
            <div class="dv-row">
              <button class="btn btn-secondary btn-sm" :disabled="meta.texte === texteInitial" @click="enregistrerTexte">Enregistrer le texte</button>
            </div>

            <template v-if="reperes.mots.length || reperes.medecins.length || reperes.dates.length">
              <h4>Repéré dans le texte</h4>
              <div class="chips">
                <span v-for="m in reperes.mots" :key="m" class="chip chip-mot">{{ m }}</span>
                <span v-for="m in reperes.medecins" :key="m" class="chip chip-medecin">{{ m }}</span>
                <span v-for="d in reperes.dates" :key="d" class="chip">{{ d }}</span>
              </div>
              <p class="dv-hint">Repérage automatique, à vérifier.</p>
            </template>

            <h4>Ajouter à un examen</h4>
            <p class="dv-hint">Le texte sélectionné (ou tout le texte) est ajouté aux notes de l'examen choisi.</p>
            <div class="dv-row">
              <select v-model="bilanCible" class="form-input">
                <option value="">— Examen —</option>
                <option v-for="b in bilansDuPatient" :key="b.id" :value="b.id">Examen du {{ formatDate(b.date) }}{{ b.motifConsultation ? ' · ' + b.motifConsultation : '' }}</option>
              </select>
              <button class="btn btn-primary btn-sm" :disabled="!bilanCible || !meta.texte" @click="ajouterAuBilan">Ajouter</button>
            </div>

            <h4>Notes</h4>
            <textarea v-model="meta.notes" class="form-textarea" rows="3" placeholder="Remarques sur ce document…" @change="enregistrerMeta" />
          </aside>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { api } from '@/api.js'
import { useBilanStore } from '@/store/bilans.js'
import { useUIStore } from '@/store/ui.js'
import { CATEGORIES_DOCUMENTS, reperer, ouvrirPdf, dessinerPagePdf } from '@/utils/documents.js'

const props = defineProps({ doc: { type: Object, required: true } })
const emit = defineEmits(['fermer', 'maj', 'supprimer'])

const bilanStore = useBilanStore()
const uiStore = useUIStore()

const OUTILS = [
  { id: 'aucun',  label: 'Voir',   aide: 'Regarder sans dessiner' },
  { id: 'trait',  label: 'Crayon', aide: 'Dessin à main levée' },
  { id: 'ligne',  label: 'Ligne',  aide: 'Tracer une ligne (axe, repère)' },
  { id: 'fleche', label: 'Flèche', aide: 'Montrer une zone' },
  { id: 'angle',  label: 'Angle',  aide: 'Trois clics : point, sommet, point — l’angle s’affiche en degrés' },
  { id: 'texte',  label: 'Texte',  aide: 'Clique où écrire' },
]
const COULEURS = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#111827', '#ffffff']

const chargement = ref(true)
const erreur = ref('')
const fichier = ref(null)
const imageUrl = ref('')
const texteFichier = ref('')
const pdfRepli = ref(false)
const mediaRef = ref(null)
const pagesRef = ref(null)
const texteRef = ref(null)

const meta = reactive({ nom: props.doc.nom, categorie: props.doc.categorie, bilanId: props.doc.bilanId || null, notes: props.doc.notes || '', texte: '' })
const texteInitial = ref('')
const annotations = ref([])
const annotationsEnregistrees = ref('[]')
const bilanCible = ref(props.doc.bilanId || '')

const estImage = computed(() => props.doc.typeMime.startsWith('image/'))
const estPdf = computed(() => props.doc.typeMime === 'application/pdf')
const estTexte = computed(() => props.doc.typeMime === 'text/plain')
const bilansDuPatient = computed(() => bilanStore.bilansByPatient(props.doc.patientId))
const reperes = computed(() => reperer(meta.texte))
const etatAnnotations = computed(() => JSON.stringify(annotations.value) === annotationsEnregistrees.value ? (annotations.value.length ? 'Annotations enregistrées' : '') : 'Enregistrement…')

const formatDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

onMounted(async () => {
  try {
    const [complet, blob] = await Promise.all([api.getDocument(props.doc.id), api.getDocumentFichier(props.doc.id)])
    fichier.value = blob
    meta.texte = texteInitial.value = complet.texte || ''
    annotations.value = complet.annotations || []
    annotationsEnregistrees.value = JSON.stringify(annotations.value)
    if (estImage.value) imageUrl.value = URL.createObjectURL(blob)
    else if (estTexte.value) texteFichier.value = await blob.text()
    chargement.value = false
    if (estPdf.value) { await nextTick(); await afficherPdf(blob) }
  } catch (e) {
    erreur.value = e.message || 'Document illisible'
    chargement.value = false
  }
  document.addEventListener('keydown', clavier)
})

onBeforeUnmount(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  document.removeEventListener('keydown', clavier)
  clearTimeout(timerAnn)
})

function clavier(e) { if (e.key === 'Escape') fermer() }

async function fermer() {
  if (JSON.stringify(annotations.value) !== annotationsEnregistrees.value) await enregistrerAnnotations()
  emit('fermer')
}

// ── PDF ──────────────────────────────────────────────────────────────────────
async function afficherPdf(blob) {
  try {
    const pdf = await ouvrirPdf(new Uint8Array(await blob.arrayBuffer()))
    const largeur = Math.min(900, (pagesRef.value?.clientWidth || 700) - 16)
    for (let n = 1; n <= Math.min(pdf.numPages, 60); n++) {
      const c = await dessinerPagePdf(pdf, n, largeur)
      c.className = 'pdf-page'
      pagesRef.value?.appendChild(c)
    }
  } catch (e) {
    console.warn(e)
    pdfRepli.value = true
  }
}

// ── Image et annotations ─────────────────────────────────────────────────────
const dims = reactive({ w: 0, h: 0 })
const outil = ref('aucun')
const couleur = ref(COULEURS[0])
const enCours = ref(null)
const texteAPlacer = ref('')
const trait = computed(() => Math.max(2, Math.round(Math.max(dims.w, dims.h) / 300)))

function onImageLoad(e) { dims.w = e.target.naturalWidth; dims.h = e.target.naturalHeight }
const px = p => [p[0] * dims.w, p[1] * dims.h]
const pts = a => a.points.map(p => px(p).join(',')).join(' ')

function pointDe(e) {
  const r = e.currentTarget.getBoundingClientRect()
  return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
}

function debut(e) {
  if (outil.value === 'aucun') return
  const p = pointDe(e)
  if (outil.value === 'texte') {
    const t = texteAPlacer.value.trim()
    if (!t) { uiStore.info('Écris d’abord le texte dans la barre, puis clique sur l’image'); return }
    ajouter({ type: 'texte', couleur: couleur.value, points: [p], texte: t.slice(0, 200) })
    return
  }
  if (outil.value === 'angle') {
    if (!enCours.value) enCours.value = { type: 'angle', couleur: couleur.value, points: [p] }
    else {
      enCours.value.points.push(p)
      if (enCours.value.points.length === 3) { ajouter(enCours.value); enCours.value = null }
    }
    return
  }
  e.currentTarget.setPointerCapture?.(e.pointerId)
  enCours.value = { type: outil.value, couleur: couleur.value, points: outil.value === 'trait' ? [p] : [p, p] }
}

function deplace(e) {
  if (!enCours.value || enCours.value.type === 'angle') return
  const p = pointDe(e)
  if (enCours.value.type === 'trait') enCours.value.points.push(p)
  else enCours.value.points[1] = p
}

function fin() {
  if (!enCours.value || enCours.value.type === 'angle') return
  const a = enCours.value
  enCours.value = null
  if (a.type === 'trait' && a.points.length < 2) return
  if (a.type !== 'trait' && Math.hypot((a.points[1][0] - a.points[0][0]) * dims.w, (a.points[1][1] - a.points[0][1]) * dims.h) < trait.value * 2) return
  // Trait à main levée : on garde un point sur deux au-delà de 200 points pour rester léger
  if (a.type === 'trait' && a.points.length > 200) a.points = a.points.filter((_, i) => i % 2 === 0)
  a.points = a.points.map(p => [Math.round(p[0] * 10000) / 10000, Math.round(p[1] * 10000) / 10000])
  ajouter(a)
}

function angleDe(a) {
  const [p1, s, p2] = a.points.map(px)
  const a1 = Math.atan2(p1[1] - s[1], p1[0] - s[0]), a2 = Math.atan2(p2[1] - s[1], p2[0] - s[0])
  let deg = Math.abs((a1 - a2) * 180 / Math.PI)
  if (deg > 180) deg = 360 - deg
  return Math.round(deg * 10) / 10
}

function ajouter(a) { annotations.value.push(a); planifierEnregistrement() }
function annuler() { annotations.value.pop(); planifierEnregistrement() }
function toutEffacer() { if (confirm('Effacer toutes les annotations de cette image ?')) { annotations.value = []; planifierEnregistrement() } }

let timerAnn = null
function planifierEnregistrement() { clearTimeout(timerAnn); timerAnn = setTimeout(enregistrerAnnotations, 800) }
async function enregistrerAnnotations() {
  clearTimeout(timerAnn)
  const json = JSON.stringify(annotations.value)
  try {
    const maj = await api.updateDocument(props.doc.id, { annotations: annotations.value })
    annotationsEnregistrees.value = json
    emit('maj', maj)
  } catch (e) { uiStore.error(e.message || 'Annotations non enregistrées') }
}

/** Image d'origine + annotations, en JPEG. */
async function telechargerAnnote() {
  const img = new Image()
  img.src = imageUrl.value
  await img.decode()
  const c = document.createElement('canvas')
  c.width = dims.w; c.height = dims.h
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  const t = trait.value
  g.lineCap = 'round'; g.lineJoin = 'round'
  for (const a of annotations.value) {
    g.strokeStyle = g.fillStyle = a.couleur; g.lineWidth = t
    const p = a.points.map(px)
    if (a.type === 'texte') { g.font = `bold ${t * 8}px sans-serif`; g.fillText(a.texte, p[0][0], p[0][1]); continue }
    g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke()
    if (a.type === 'fleche') {
      const [x1, y1] = p[0], [x2, y2] = p[1], ang = Math.atan2(y2 - y1, x2 - x1), L = t * 5
      g.beginPath(); g.moveTo(x2, y2)
      g.lineTo(x2 - L * Math.cos(ang - 0.45), y2 - L * Math.sin(ang - 0.45)); g.lineTo(x2 - L * Math.cos(ang + 0.45), y2 - L * Math.sin(ang + 0.45))
      g.closePath(); g.fill()
    }
    if (a.type === 'angle' && p.length === 3) { g.font = `bold ${t * 9}px sans-serif`; g.fillText(angleDe(a) + '°', p[1][0] + t * 4, p[1][1] - t * 4) }
  }
  c.toBlob(b => enregistrerFichier(b, meta.nom.replace(/\.\w+$/, '') + ' (annotée).jpg'), 'image/jpeg', 0.92)
}

function telecharger() { if (fichier.value) enregistrerFichier(fichier.value, meta.nom) }
function enregistrerFichier(blob, nom) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nom
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ── Métadonnées et texte ─────────────────────────────────────────────────────
async function enregistrerMeta() {
  try {
    const maj = await api.updateDocument(props.doc.id, { nom: meta.nom, categorie: meta.categorie, bilanId: meta.bilanId, notes: meta.notes })
    emit('maj', maj)
  } catch (e) { uiStore.error(e.message) }
}

async function enregistrerTexte() {
  try {
    const maj = await api.updateDocument(props.doc.id, { texte: meta.texte })
    texteInitial.value = meta.texte
    emit('maj', maj)
    uiStore.success('Texte enregistré')
  } catch (e) { uiStore.error(e.message) }
}

async function ajouterAuBilan() {
  const b = bilanStore.bilans.find(x => x.id === bilanCible.value)
  if (!b) return
  const el = texteRef.value
  const selection = el && el.selectionEnd > el.selectionStart ? meta.texte.slice(el.selectionStart, el.selectionEnd) : meta.texte
  const ajout = `— Extrait de « ${meta.nom} » —\n${selection.trim()}`
  try {
    await bilanStore.updateBilan(b.id, { notesGenerales: [b.notesGenerales, ajout].filter(Boolean).join('\n\n') })
    if (!meta.bilanId) { meta.bilanId = b.id; await enregistrerMeta() }
    uiStore.success('Ajouté aux notes de l’examen')
  } catch (e) { uiStore.error(e.message) }
}
</script>

<style scoped>
.dv-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .6); z-index: 9995; display: flex; align-items: stretch; justify-content: center; padding: 16px; }
.dv { background: var(--color-surface); border-radius: var(--radius-lg); width: 100%; max-width: 1400px; display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-xl); }
.dv-head { display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--color-border); }
.dv-title { display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center; flex: 1; min-width: 0; }
.dv-nom { font-weight: 700; min-width: 180px; flex: 1; max-width: 360px; }
.dv-select { width: auto; min-width: 150px; }
.dv-head-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.dv-body { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 340px; min-height: 0; }
.dv-media { overflow: auto; background: #0f172a0d; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.dv-side { border-left: 1px solid var(--color-border); padding: 14px; overflow: auto; display: flex; flex-direction: column; gap: 8px; }
.dv-side h4 { font-size: var(--text-sm); font-weight: 700; margin-top: 6px; color: var(--color-primary); }
.dv-hint { font-size: var(--text-xs); color: var(--color-text-muted); margin: 0; line-height: 1.5; }
.dv-textarea { min-height: 180px; font-size: var(--text-sm); line-height: 1.5; }
.dv-row { display: flex; gap: 6px; align-items: center; }
.dv-row .form-input { flex: 1; min-width: 0; }
.dv-info { margin: auto; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 10px; align-items: center; text-align: center; }
.dv-erreur { color: var(--color-error); }
.dv-texte { white-space: pre-wrap; background: #fff; padding: 16px; border-radius: var(--radius-md); width: 100%; max-width: 900px; font-size: var(--text-sm); line-height: 1.6; color: #111; }
.pdf-pages { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.pdf-pages :deep(.pdf-page) { box-shadow: var(--shadow-md); background: #fff; max-width: 100%; height: auto !important; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { font-size: var(--text-xs); padding: 2px 8px; border-radius: var(--radius-full); background: var(--color-surface-alt); border: 1px solid var(--color-border); }
.chip-mot { background: #fef3c7; border-color: #fde68a; color: #92400e; }
.chip-medecin { background: #dbeafe; border-color: #bfdbfe; color: #1d4ed8; }

.ann-toolbar { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; background: var(--color-surface); padding: 6px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); position: sticky; top: 0; z-index: 2; }
.ann-tool { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-sm); padding: 5px 10px; font-size: var(--text-xs); font-weight: 600; cursor: pointer; color: var(--color-text); }
.ann-tool.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.ann-tool:disabled { opacity: .4; cursor: default; }
.ann-color { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #cbd5e1; cursor: pointer; padding: 0; }
.ann-color.active { outline: 2px solid var(--color-primary); outline-offset: 1px; }
.ann-input { width: 200px; padding: 4px 8px; font-size: var(--text-xs); }
.ann-sep { width: 1px; height: 20px; background: var(--color-border); margin: 0 4px; }
.ann-etat { font-size: var(--text-xs); color: var(--color-text-muted); margin-left: 6px; }
.img-wrap { position: relative; display: inline-block; max-width: 100%; line-height: 0; }
.dv-img { max-width: 100%; max-height: calc(100vh - 200px); display: block; user-select: none; }
.ann-svg { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
.ann-svg.dessin { cursor: crosshair; }
.ann-text { font-weight: 700; font-family: system-ui, sans-serif; paint-order: stroke; stroke: rgba(255, 255, 255, .7); stroke-width: 2px; }

@media (max-width: 900px) {
  .dv-overlay { padding: 0; }
  .dv { border-radius: 0; }
  .dv-body { grid-template-columns: 1fr; overflow: auto; }
  .dv-media { min-height: 50vh; }
  .dv-side { border-left: 0; border-top: 1px solid var(--color-border); }
}
</style>
