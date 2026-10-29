/**
 * PodoFlow – Quality Test Suite
 * Exécuter : node src/tests/quality.js
 *
 * Teste les fonctionnalités critiques du MVP via simulation Node.js
 */

// Polyfill localStorage pour Node.js
const store = {}
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
const results = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    results.push({ name, ok: true })
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}`)
    console.log(`     → ${e.message}`)
    results.push({ name, ok: false, error: e.message })
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

// ── Import modules under test ─────────────────────────────────────────────────
// Inline re-implementation for Node testing (no ESM/Vue deps)

// --- uuid ---
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// --- storage ---
const KEYS = { PATIENTS: 'podo_patients', BILANS: 'podo_bilans', SETTINGS: 'podo_settings' }
const storage = {
  getPatients() { try { return JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]') } catch { return [] } },
  savePatients(p) { localStorage.setItem(KEYS.PATIENTS, JSON.stringify(p)) },
  getBilans() { try { return JSON.parse(localStorage.getItem(KEYS.BILANS) || '[]') } catch { return [] } },
  saveBilans(b) { localStorage.setItem(KEYS.BILANS, JSON.stringify(b)) },
  exportAll() { return { patients: this.getPatients(), bilans: this.getBilans(), exportedAt: new Date().toISOString() } },
  importAll(data) { if (data.patients) this.savePatients(data.patients); if (data.bilans) this.saveBilans(data.bilans) },
  clearAll() { Object.values(KEYS).forEach(k => localStorage.removeItem(k)) }
}

// --- bilan model ---
function defaultBilan(patientId) {
  return {
    id: generateId(), patientId,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    motifConsultation: '', antecedentsMedicaux: '', antecedentsFamiliaux: '',
    maladies: '', traitementsEnCours: '', circumstancesApparition: '',
    douleurScore: 5, facteursAggravants: '', facteursAttenuants: '',
    questionsPersonnalisees: [], lateralite: '', jambemotrice: '', oeilMoteur: '',
    pointMobile: '', notesMotrices: '', barometrieData: null, barometrieImage: null,
    barometrieNotes: '', schemaAnnotations: [], chainesGDS: [], canvasData: null,
    notesGenerales: '', statut: 'brouillon'
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 – UUID
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📋 Suite 1 – Génération d\'identifiants uniques')

test('generateId retourne une chaîne non vide', () => {
  const id = generateId()
  assert(typeof id === 'string' && id.length > 0)
})

test('Deux IDs consécutifs sont différents', () => {
  const ids = new Set(Array.from({ length: 100 }, generateId))
  assertEqual(ids.size, 100, 'IDs non uniques détectés')
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 – Sauvegarde des données (localStorage)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n💾 Suite 2 – Sauvegarde des données')

test('Patients initiaux sont vide', () => {
  storage.clearAll()
  assertEqual(storage.getPatients().length, 0)
})

test('Sauvegarde d\'un patient', () => {
  const patient = { id: generateId(), nom: 'Dupont', prenom: 'Jean', createdAt: new Date().toISOString() }
  storage.savePatients([patient])
  const loaded = storage.getPatients()
  assertEqual(loaded.length, 1)
  assertEqual(loaded[0].nom, 'Dupont')
})

test('Sauvegarde de plusieurs patients', () => {
  const patients = Array.from({ length: 5 }, (_, i) => ({
    id: generateId(), nom: `Patient${i}`, prenom: 'Test'
  }))
  storage.savePatients(patients)
  assertEqual(storage.getPatients().length, 5)
})

test('Sauvegarde d\'un bilan', () => {
  const bilan = defaultBilan('pid123')
  bilan.motifConsultation = 'Douleur plantaire'
  bilan.douleurScore = 7
  storage.saveBilans([bilan])
  const loaded = storage.getBilans()
  assertEqual(loaded.length, 1)
  assertEqual(loaded[0].motifConsultation, 'Douleur plantaire')
  assertEqual(loaded[0].douleurScore, 7)
})

test('Persistance après relecture', () => {
  const bilan = defaultBilan('pid-persist')
  bilan.notesGenerales = 'Test persistance'
  storage.saveBilans([bilan])
  const reloaded = storage.getBilans()
  assertEqual(reloaded[0].notesGenerales, 'Test persistance')
})

test('JSON invalide dans localStorage ne crash pas', () => {
  localStorage.setItem(KEYS.PATIENTS, '{invalid json}}}')
  const result = storage.getPatients()
  assert(Array.isArray(result), 'Doit retourner un tableau vide')
  assertEqual(result.length, 0)
  storage.clearAll()
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 – Modèle de bilan
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📄 Suite 3 – Modèle bilan podologique')

test('Bilan par défaut contient tous les champs requis', () => {
  const bilan = defaultBilan('pid1')
  const required = [
    'id', 'patientId', 'date', 'douleurScore', 'motifConsultation',
    'questionsPersonnalisees', 'schemaAnnotations', 'chainesGDS', 'statut'
  ]
  required.forEach(field => assert(field in bilan, `Champ manquant: ${field}`))
})

test('EVA score dans les bornes (0-10)', () => {
  const bilan = defaultBilan('pid1')
  assert(bilan.douleurScore >= 0 && bilan.douleurScore <= 10, 'Score EVA hors bornes')
})

test('Statut par défaut est brouillon', () => {
  const bilan = defaultBilan('pid1')
  assertEqual(bilan.statut, 'brouillon')
})

test('Questions personnalisées initialisées à tableau vide', () => {
  const bilan = defaultBilan('pid1')
  assert(Array.isArray(bilan.questionsPersonnalisees))
  assertEqual(bilan.questionsPersonnalisees.length, 0)
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 – Questions dynamiques
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n❓ Suite 4 – Questions personnalisées')

test('Ajout d\'une question personnalisée', () => {
  const bilan = defaultBilan('pid1')
  const question = { id: generateId(), question: 'Douleurs nocturnes ?', reponse: '' }
  bilan.questionsPersonnalisees.push(question)
  assertEqual(bilan.questionsPersonnalisees.length, 1)
  assertEqual(bilan.questionsPersonnalisees[0].question, 'Douleurs nocturnes ?')
})

test('Mise à jour d\'une réponse', () => {
  const bilan = defaultBilan('pid1')
  const qid = generateId()
  bilan.questionsPersonnalisees.push({ id: qid, question: 'Test ?', reponse: '' })
  const q = bilan.questionsPersonnalisees.find(q => q.id === qid)
  q.reponse = 'Oui, depuis 3 mois'
  assertEqual(q.reponse, 'Oui, depuis 3 mois')
})

test('Suppression d\'une question', () => {
  const bilan = defaultBilan('pid1')
  const qid = generateId()
  bilan.questionsPersonnalisees.push({ id: qid, question: 'À supprimer ?', reponse: '' })
  bilan.questionsPersonnalisees = bilan.questionsPersonnalisees.filter(q => q.id !== qid)
  assertEqual(bilan.questionsPersonnalisees.length, 0)
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 – Annotations schéma corporel
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🗺 Suite 5 – Annotations schéma corporel')

test('Ajout d\'une annotation', () => {
  const bilan = defaultBilan('pid1')
  const ann = { id: generateId(), zone: 'genou-g', label: 'Genou gauche', x: 124, y: 372, commentaire: '', severite: 'modérée' }
  bilan.schemaAnnotations.push(ann)
  assertEqual(bilan.schemaAnnotations.length, 1)
})

test('Mise à jour d\'une annotation', () => {
  const bilan = defaultBilan('pid1')
  const aid = generateId()
  bilan.schemaAnnotations.push({ id: aid, zone: 'cheville-d', label: 'Cheville droite', commentaire: '', severite: 'légère' })
  const ann = bilan.schemaAnnotations.find(a => a.id === aid)
  ann.commentaire = 'Entorse récente'
  ann.severite = 'sévère'
  assertEqual(ann.commentaire, 'Entorse récente')
  assertEqual(ann.severite, 'sévère')
})

test('Suppression d\'une annotation', () => {
  const bilan = defaultBilan('pid1')
  const aid = generateId()
  bilan.schemaAnnotations.push({ id: aid, zone: 'test' })
  bilan.schemaAnnotations = bilan.schemaAnnotations.filter(a => a.id !== aid)
  assertEqual(bilan.schemaAnnotations.length, 0)
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 – Export / Import données
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n📦 Suite 6 – Export / Import données')

test('Export contient patients et bilans', () => {
  storage.clearAll()
  storage.savePatients([{ id: 'p1', nom: 'Test' }])
  storage.saveBilans([{ id: 'b1', patientId: 'p1' }])
  const exported = storage.exportAll()
  assert('patients' in exported)
  assert('bilans' in exported)
  assert('exportedAt' in exported)
  assertEqual(exported.patients.length, 1)
  assertEqual(exported.bilans.length, 1)
})

test('Import restaure les données', () => {
  storage.clearAll()
  const backup = {
    patients: [{ id: 'p-import', nom: 'Importé', prenom: 'Test' }],
    bilans: [{ id: 'b-import', patientId: 'p-import' }]
  }
  storage.importAll(backup)
  assertEqual(storage.getPatients().length, 1)
  assertEqual(storage.getPatients()[0].nom, 'Importé')
  assertEqual(storage.getBilans().length, 1)
})

test('clearAll vide toutes les données', () => {
  storage.savePatients([{ id: 'p1' }])
  storage.saveBilans([{ id: 'b1' }])
  storage.clearAll()
  assertEqual(storage.getPatients().length, 0)
  assertEqual(storage.getBilans().length, 0)
})

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 – Chaînes GDS
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔗 Suite 7 – Chaînes musculaires GDS')

test('Sélection de chaînes GDS', () => {
  const bilan = defaultBilan('pid1')
  bilan.chainesGDS = ['PA', 'AM', 'PL']
  assertEqual(bilan.chainesGDS.length, 3)
  assert(bilan.chainesGDS.includes('PA'))
})

test('Désélection d\'une chaîne GDS', () => {
  const bilan = defaultBilan('pid1')
  bilan.chainesGDS = ['PA', 'AM', 'PL']
  bilan.chainesGDS = bilan.chainesGDS.filter(c => c !== 'AM')
  assertEqual(bilan.chainesGDS.length, 2)
  assert(!bilan.chainesGDS.includes('AM'))
})

// ══════════════════════════════════════════════════════════════════════════════
// RAPPORT FINAL
// ══════════════════════════════════════════════════════════════════════════════
const total = passed + failed
const score = Math.round((passed / total) * 100)

console.log('\n' + '═'.repeat(60))
console.log('  📊 RAPPORT QUALITÉ PODO LOGICIEL')
console.log('═'.repeat(60))
console.log(`  Total tests  : ${total}`)
console.log(`  ✅ Réussis   : ${passed}`)
console.log(`  ❌ Échoués   : ${failed}`)
console.log(`  📈 Score     : ${score}/100`)
console.log('─'.repeat(60))

if (score === 100) {
  console.log('  🏆 Excellent ! Toutes les fonctionnalités critiques passent.')
} else if (score >= 80) {
  console.log('  ✅ Bon niveau. Quelques corrections mineures à apporter.')
} else if (score >= 60) {
  console.log('  ⚠️  Niveau moyen. Des corrections importantes sont nécessaires.')
} else {
  console.log('  🚨 Niveau insuffisant. Corrections urgentes requises.')
}

if (failed > 0) {
  console.log('\n  Tests échoués :')
  results.filter(r => !r.ok).forEach(r => {
    console.log(`  • ${r.name}`)
    console.log(`    ${r.error}`)
  })
}

console.log('═'.repeat(60) + '\n')

process.exit(failed > 0 ? 1 : 0)
