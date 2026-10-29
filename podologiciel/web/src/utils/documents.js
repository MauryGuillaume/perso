// Documents des patients : lecture des fichiers dans le navigateur (vignette, texte des PDF et .txt) avant l'envoi,
// et repérage d'informations utiles au bilan. Rien n'est envoyé à un service extérieur : tout se fait ici.

export const TYPES_ACCEPTES = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.txt,.pdf'
export const TAILLE_MAX = 20 * 1024 * 1024

export const CATEGORIES_DOCUMENTS = [
  { value: 'photo',        label: 'Photo' },
  { value: 'empreinte',    label: 'Empreinte / podoscope' },
  { value: 'ordonnance',   label: 'Ordonnance' },
  { value: 'compte_rendu', label: 'Compte rendu' },
  { value: 'imagerie',     label: 'Imagerie (radio, écho…)' },
  { value: 'courrier',     label: 'Courrier' },
  { value: 'autre',        label: 'Autre' },
]

/** Type MIME fiable (certains appareils n'en donnent pas pour .txt ou .pdf). */
export function typeDuFichier(file) {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return { txt: 'text/plain', pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext] || ''
}

export function blobVersBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(new Error('Lecture du fichier impossible'))
    r.readAsDataURL(blob)
  })
}

function chargerImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image illisible'))
    img.src = src
  })
}

/** Image redimensionnée (côté le plus long ≤ max), en JPEG. */
async function reduireImage(blob, max, qualite) {
  const url = URL.createObjectURL(blob)
  try {
    const img = await chargerImage(url)
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * k))
    c.height = Math.max(1, Math.round(img.naturalHeight * k))
    const g = c.getContext('2d')
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height)
    g.drawImage(img, 0, 0, c.width, c.height)
    return { canvas: c, largeur: img.naturalWidth, hauteur: img.naturalHeight, toBlob: () => new Promise(res => c.toBlob(res, 'image/jpeg', qualite)) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── PDF (pdf.js, chargé seulement quand on en a besoin) ───────────────────────
let pdfjsPromesse = null
export function chargerPdfjs() {
  if (!pdfjsPromesse) {
    pdfjsPromesse = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
      .then(([pdfjs, worker]) => { pdfjs.GlobalWorkerOptions.workerSrc = worker.default; return pdfjs })
      .catch(e => { pdfjsPromesse = null; throw e })
  }
  return pdfjsPromesse
}

export async function ouvrirPdf(donnees) {
  const pdfjs = await chargerPdfjs()
  return pdfjs.getDocument({ data: donnees, isEvalSupported: false }).promise
}

/** Texte de toutes les pages (50 au plus), lignes reconstituées. */
export async function textePdf(pdf, maxPages = 50) {
  const pages = []
  for (let n = 1; n <= Math.min(pdf.numPages, maxPages); n++) {
    const page = await pdf.getPage(n)
    const contenu = await page.getTextContent()
    let ligne = '', texte = '', yPrec = null
    for (const it of contenu.items) {
      const y = it.transform ? Math.round(it.transform[5]) : null
      if (yPrec !== null && y !== null && Math.abs(y - yPrec) > 2) { texte += ligne.trimEnd() + '\n'; ligne = '' }
      ligne += it.str + (it.hasEOL ? '\n' : '')
      yPrec = y
    }
    texte += ligne
    pages.push(texte.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim())
  }
  return pages.filter(Boolean).join('\n\n— page suivante —\n\n')
}

/** Une page du PDF dessinée dans un canvas à la largeur voulue. */
export async function dessinerPagePdf(pdf, numero, largeur, canvas) {
  const page = await pdf.getPage(numero)
  const base = page.getViewport({ scale: 1 })
  const ratio = window.devicePixelRatio || 1
  const vue = page.getViewport({ scale: (largeur / base.width) * ratio })
  const c = canvas || document.createElement('canvas')
  c.width = Math.round(vue.width); c.height = Math.round(vue.height)
  c.style.width = largeur + 'px'
  await page.render({ canvasContext: c.getContext('2d'), viewport: vue }).promise
  return c
}

/**
 * Prépare un fichier choisi par le podologue : contrôle, image réduite si énorme, vignette, texte lu.
 * Renvoie ce qu'attend POST /api/documents (sauf patientId).
 */
export async function preparerDocument(file) {
  const type = typeDuFichier(file)
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'].includes(type)) {
    if (/heic|heif/i.test(type + file.name)) throw new Error(`${file.name} : format HEIC (iPhone) non lu par les navigateurs. Choisis « Plus compatible » dans Réglages › Appareil photo › Formats, ou envoie une capture.`)
    throw new Error(`${file.name} : seuls les photos (JPEG, PNG, WebP, GIF), PDF et fichiers texte (.txt) sont acceptés.`)
  }
  let blob = file, apercu = null, texte
  if (type.startsWith('image/')) {
    const reduite = await reduireImage(file, 3000, 0.9)
    // Photo d'appareil très grande : ramenée à 3000 px (largement assez pour un bilan) pour rester légère
    if (type !== 'image/gif' && (Math.max(reduite.largeur, reduite.hauteur) > 3000 || file.size > 8e6)) blob = await reduite.toBlob()
    apercu = (await reduireImage(file, 320, 0.75)).canvas.toDataURL('image/jpeg', 0.75)
  } else if (type === 'application/pdf') {
    try {
      const pdf = await ouvrirPdf(new Uint8Array(await file.arrayBuffer()))
      texte = await textePdf(pdf)
      apercu = (await dessinerPagePdf(pdf, 1, 320 / (window.devicePixelRatio || 1))).toDataURL('image/jpeg', 0.75)
    } catch (e) {
      console.warn('Lecture du PDF impossible ici', e)
    }
  } else {
    texte = await file.text()
  }
  if (blob.size > TAILLE_MAX) throw new Error(`${file.name} : 20 Mo maximum.`)
  const typeFinal = blob === file ? type : 'image/jpeg'
  let nom = file.name || 'document'
  if (typeFinal === 'image/jpeg' && blob !== file) nom = nom.replace(/\.\w+$/, '') + '.jpg'
  return {
    nom, typeMime: typeFinal, contenu: await blobVersBase64(blob), apercu, texte,
    categorie: type.startsWith('image/') ? 'photo' : /ordo/i.test(nom) ? 'ordonnance' : type === 'application/pdf' ? 'compte_rendu' : 'autre',
  }
}

// ── Repérage d'informations dans un texte (aide, à vérifier par le podologue) ─
const MOTS_CLES = [
  'diabète', 'diabétique', 'neuropathie', 'artérite', 'AOMI', 'anticoagulant', 'insuffisance veineuse',
  'hallux valgus', 'hallux rigidus', 'quintus varus', 'griffe', 'orteils en griffe', 'névrome de morton', 'morton',
  'fasciite', 'aponévrosite', 'épine calcanéenne', 'talalgie', 'métatarsalgie', 'tendinite', 'tendinopathie', 'achille',
  'entorse', 'fracture', 'arthrose', 'polyarthrite', 'goutte', 'pied plat', 'pied creux', 'valgus', 'varus',
  'scoliose', 'lombalgie', 'gonalgie', 'inégalité de longueur', 'semelles', 'orthèses plantaires', 'orthoplastie', 'durillon', 'cor', 'verrue', 'ongle incarné', 'onychomycose',
]

function sansAccents(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

export function reperer(texte) {
  if (!texte) return { mots: [], medecins: [], dates: [] }
  const plat = sansAccents(texte)
  const mots = MOTS_CLES.filter(m => new RegExp(`\\b${sansAccents(m)}s?\\b`).test(plat))
    .filter((m, i, l) => !l.some((x, j) => j !== i && x.length > m.length && sansAccents(x).includes(sansAccents(m))))
  const medecins = [...new Set((texte.match(/\b(?:Dr|Docteur|Pr)\.?\s+[A-ZÉÈ][\w'’-]+(?:\s+[A-ZÉÈ][\w'’-]+)?/g) || []).map(s => s.trim()))].slice(0, 6)
  const dates = [...new Set(texte.match(/\b\d{1,2}[/.-]\d{1,2}[/.-](?:19|20)\d{2}\b/g) || [])].slice(0, 8)
  return { mots, medecins, dates }
}

export function tailleLisible(octets) {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}
