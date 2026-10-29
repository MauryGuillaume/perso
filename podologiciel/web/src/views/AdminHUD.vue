<template>
  <div class="admin fade-in">
    <div class="admin-header">
      <div>
        <h1 class="admin-title">Administration Movyx</h1>
        <p class="admin-sub">Gestion des comptes professionnels</p>
      </div>
    </div>

    <!-- Admin tabs -->
    <div class="tabs" style="margin-bottom:var(--space-xl)">
      <button class="tab" :class="{ active: adminTab==='users'   }" @click="adminTab='users'">👥 Comptes</button>
      <button class="tab" :class="{ active: adminTab==='storage' }" @click="adminTab='storage'">💾 Stockage</button>
      <button class="tab" :class="{ active: adminTab==='tests'   }" @click="adminTab='tests'">🧪 Tests unitaires</button>
      <button class="tab" :class="{ active: adminTab==='mock'    }" @click="adminTab='mock'">🎭 Données mock</button>
    </div>

    <!-- ── Tab : Comptes ─────────────────────────────────────────────────── -->
    <template v-if="adminTab === 'users'">
      <div class="admin-stats">
        <div class="stat-card" v-for="s in stats" :key="s.label">
          <div class="stat-icon">{{ s.icon }}</div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>

      <div class="admin-toolbar">
        <input v-model="search" type="search" class="form-input" placeholder="Rechercher un utilisateur…" style="max-width:300px" />
        <select v-model="filterRole" class="form-input" style="max-width:160px">
          <option value="">Tous les rôles</option>
          <option v-for="(r, k) in ROLES" :key="k" :value="k">{{ r.label }}</option>
        </select>
        <label class="tc-checkbox-label" style="font-size:var(--text-sm)">
          <input type="checkbox" v-model="showDeleted" /> Afficher les comptes supprimés
        </label>
        <button class="btn btn-primary btn-sm" @click="openCreate">+ Ajouter un compte</button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Cabinet</th>
              <th>Rôle</th>
              <th>Créé le</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filteredUsers" :key="u.id" :class="{ suspended: u.suspended, deleted: u.deleted }">
              <td>
                <div class="user-cell">
                  <div class="user-avatar" :style="{ background: avatarColor(u) }">{{ initials(u) }}</div>
                  <div>
                    <div class="user-name">{{ u.prenom }} {{ u.nom }}</div>
                    <div class="user-email">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td>{{ u.cabinet || '—' }}</td>
              <td>
                <select
                  class="role-select"
                  :value="u.role"
                  :style="{ color: ROLES[u.role]?.color }"
                  @change="changeRole(u.id, $event.target.value)"
                  :disabled="u.deleted"
                >
                  <option v-for="(r, k) in ROLES" :key="k" :value="k">{{ r.label }}</option>
                </select>
              </td>
              <td>{{ fmtDate(u.createdAt) }}</td>
              <td>
                <span v-if="u.deleted" class="status-badge status-deleted">Supprimé</span>
                <span v-else class="status-badge" :class="u.suspended ? 'status-suspended' : 'status-active'">
                  {{ u.suspended ? 'Suspendu' : 'Actif' }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <!-- Voir comme -->
                  <button
                    v-if="!u.deleted && u.id !== authStore.currentUser?.id"
                    class="btn btn-xs btn-ghost"
                    :title="authStore.isViewingAs && authStore.viewAsUser?.id === u.id ? 'Arrêter la vue' : 'Voir l\'app comme cet utilisateur'"
                    @click="toggleViewAs(u.id)"
                  >
                    {{ authStore.isViewingAs && authStore.viewAsUser?.id === u.id ? '👁‍🗨' : '👁' }}
                  </button>
                  <button v-if="!u.deleted" class="btn btn-xs btn-ghost" title="Réinitialiser le mot de passe" @click="openResetPwd(u)">🔑</button>
                  <button
                    v-if="!u.deleted"
                    class="btn btn-xs btn-ghost"
                    :title="u.suspended ? 'Réactiver' : 'Suspendre'"
                    @click="toggleSuspend(u)"
                    :disabled="u.id === authStore.currentUser?.id"
                  >{{ u.suspended ? '✅' : '🚫' }}</button>
                  <button
                    v-if="!u.deleted"
                    class="btn btn-xs btn-danger"
                    title="Supprimer (masquer)"
                    @click="confirmDelete(u)"
                    :disabled="u.id === authStore.currentUser?.id"
                  >🗑</button>
                  <button
                    v-if="u.deleted"
                    class="btn btn-xs btn-ghost"
                    style="color:var(--color-accent)"
                    title="Restaurer le compte"
                    @click="doRestore(u.id)"
                  >↩ Restaurer</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:32px">Aucun utilisateur trouvé</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── Tab : Stockage ────────────────────────────────────────────────── -->
    <template v-if="adminTab === 'storage'">
      <div class="storage-info card">
        <h3 class="section-title">Informations sur le stockage</h3>
        <div class="storage-grid">
          <div class="storage-item">
            <div class="storage-key">Clé localStorage</div>
            <div class="storage-val"><code>movyx_users</code></div>
            <div class="storage-desc">Tous les comptes utilisateurs (hash de mot de passe inclus)</div>
          </div>
          <div class="storage-item">
            <div class="storage-key">Clé localStorage</div>
            <div class="storage-val"><code>movyx_session</code></div>
            <div class="storage-desc">Session active (utilisateur connecté)</div>
          </div>
          <div class="storage-item">
            <div class="storage-key">Clé localStorage</div>
            <div class="storage-val"><code>movyx_bilans</code></div>
            <div class="storage-desc">Tous les bilans podologiques</div>
          </div>
          <div class="storage-item">
            <div class="storage-key">Clé localStorage</div>
            <div class="storage-val"><code>movyx_patients</code></div>
            <div class="storage-desc">Tous les dossiers patients</div>
          </div>
        </div>
        <div class="storage-warning">
          ⚠️ Toutes les données sont stockées <strong>localement dans le navigateur</strong> sur cet appareil.
          Elles ne sont pas synchronisées entre appareils. Utilisez le bouton "Export JSON" dans le tableau de bord pour sauvegarder.
        </div>
        <div class="storage-sizes">
          <div v-for="k in storageKeys" :key="k.key" class="storage-size-row">
            <code>{{ k.key }}</code>
            <span>{{ k.size }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Tab : Données mock ───────────────────────────────────────────── -->
    <template v-if="adminTab === 'mock'">
      <div class="mock-panel card">
        <h3 class="section-title">Données de démonstration</h3>
        <p class="mock-desc">
          Injecte un jeu de données fictif (6 patients, bilans, factures, dépenses, agenda) dans votre compte courant.
          Utile pour tester l'interface sans saisir manuellement des données.
        </p>

        <div class="mock-warning" v-if="mockLoaded">
          ⚠️ Des données mock sont déjà présentes. Charger à nouveau les ajoutera en double.
        </div>

        <div class="mock-summary" v-if="mockLoaded">
          <div class="mock-stat" v-for="s in mockStats" :key="s.label">
            <span class="mock-stat-icon">{{ s.icon }}</span>
            <span class="mock-stat-val">{{ s.value }}</span>
            <span class="mock-stat-label">{{ s.label }}</span>
          </div>
        </div>

        <div class="mock-actions">
          <button class="btn btn-primary" @click="loadMock">
            ▶ Charger les données mock
          </button>
          <button class="btn btn-secondary" @click="clearMock" :disabled="!mockLoaded">
            🗑 Supprimer les données mock
          </button>
        </div>

        <div class="mock-detail">
          <strong>Contenu du jeu de données :</strong>
          <ul>
            <li>6 patients (profils variés : diabète, sportive, hallux valgus, pied plat…)</li>
            <li>6 bilans podologiques (complets, brouillons, soins de pédicurie)</li>
            <li>6 factures (payées et en attente)</li>
            <li>8 dépenses (loyer, matériel, charges sociales…)</li>
            <li>6 rendez-vous agenda (mai 2025)</li>
          </ul>
        </div>
      </div>
    </template>

    <!-- ── Tab : Tests unitaires ─────────────────────────────────────────── -->
    <template v-if="adminTab === 'tests'">
      <div class="tests-panel">
        <div class="tests-toolbar">
          <button class="btn btn-primary" @click="runTests" :disabled="running">
            {{ running ? '⏳ Tests en cours…' : '▶ Lancer tous les tests' }}
          </button>
          <span v-if="testResults.length" class="tests-score" :class="allPassed ? 'score-ok' : 'score-fail'">
            {{ passedCount }}/{{ testResults.length }} tests réussis
          </span>
        </div>

        <div v-if="testResults.length" class="tests-list">
          <div
            v-for="r in testResults" :key="r.name"
            class="test-row"
            :class="r.pass ? 'test-pass' : 'test-fail'"
          >
            <span class="test-icon">{{ r.pass ? '✅' : '❌' }}</span>
            <div class="test-info">
              <div class="test-name">{{ r.name }}</div>
              <div v-if="r.detail" class="test-detail">{{ r.detail }}</div>
            </div>
            <span class="test-time">{{ r.ms }}ms</span>
          </div>
        </div>

        <div v-else class="tests-empty">
          Cliquez sur "Lancer tous les tests" pour démarrer la suite de tests.
        </div>
      </div>
    </template>

    <!-- ── Modals ────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <!-- Create user -->
      <div v-if="showCreate" class="modal-overlay" @click.self="showCreate=false">
        <div class="modal-card">
          <h3>Créer un compte</h3>
          <div class="login-error" v-if="createError">{{ createError }}</div>
          <div class="form-group"><label class="form-label">Prénom</label><input v-model="createForm.prenom" class="form-input" /></div>
          <div class="form-group"><label class="form-label">Nom</label><input v-model="createForm.nom" class="form-input" /></div>
          <div class="form-group"><label class="form-label">Email</label><input v-model="createForm.email" type="email" class="form-input" /></div>
          <div class="form-group"><label class="form-label">Cabinet</label><input v-model="createForm.cabinet" class="form-input" /></div>
          <div class="form-group">
            <label class="form-label">Rôle</label>
            <select v-model="createForm.role" class="form-input">
              <option v-for="(r, k) in ROLES" :key="k" :value="k">{{ r.label }}</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Mot de passe temporaire</label><input v-model="createForm.password" type="password" class="form-input" minlength="6" /></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showCreate=false">Annuler</button>
            <button class="btn btn-primary" @click="doCreate">Créer le compte</button>
          </div>
        </div>
      </div>

      <!-- Reset pwd -->
      <div v-if="resetTarget" class="modal-overlay" @click.self="resetTarget=null">
        <div class="modal-card">
          <h3>Réinitialiser le mot de passe</h3>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:16px">
            Compte : <strong>{{ resetTarget.prenom }} {{ resetTarget.nom }}</strong>
          </p>
          <div class="login-error" v-if="resetError">{{ resetError }}</div>
          <div class="form-group"><label class="form-label">Nouveau mot de passe</label><input v-model="newPwd" type="password" class="form-input" minlength="6" /></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="resetTarget=null">Annuler</button>
            <button class="btn btn-primary" @click="doResetPwd">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Confirm delete (soft) -->
      <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget=null">
        <div class="modal-card">
          <h3>Supprimer le compte ?</h3>
          <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:16px">
            Le compte <strong>{{ deleteTarget.prenom }} {{ deleteTarget.nom }}</strong> sera désactivé.<br>
            Il restera visible dans la liste et pourra être restauré à tout moment.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="deleteTarget=null">Annuler</button>
            <button class="btn btn-danger" @click="doDelete">Désactiver</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, ROLES, defaultCustomization } from '@/store/auth.js'
import { useUIStore } from '@/store/ui.js'
import { usePatientStore } from '@/store/patients.js'
import { useBilanStore } from '@/store/bilans.js'
import { useFacturationStore } from '@/store/facturation.js'
import { api } from '@/api.js'
import { MOCK_PATIENTS, MOCK_BILANS, MOCK_FACTURES, MOCK_DEPENSES } from '@/data/mockData.js'

const authStore      = useAuthStore()
const uiStore        = useUIStore()
const patientStore   = usePatientStore()
const bilanStore     = useBilanStore()
const factureStore   = useFacturationStore()
const router         = useRouter()

const adminTab   = ref('users')

onMounted(() => {
  const tab = sessionStorage.getItem('adminTab')
  if (tab) { adminTab.value = tab; sessionStorage.removeItem('adminTab') }
})
const search     = ref('')
const filterRole = ref('')
const showDeleted = ref(false)

const allUsers = computed(() => authStore.getUsers())

const stats = computed(() => [
  { icon: '👥', value: allUsers.value.filter(u => !u.deleted).length,                                         label: 'Comptes actifs' },
  { icon: '✅', value: allUsers.value.filter(u => !u.suspended && !u.deleted).length,                         label: 'Non suspendus' },
  { icon: '⭐', value: allUsers.value.filter(u => u.role === 'vip' && !u.deleted).length,                     label: 'VIP' },
  { icon: '🗑',  value: allUsers.value.filter(u => u.deleted).length,                                         label: 'Supprimés' },
])

const filteredUsers = computed(() => {
  return allUsers.value.filter(u => {
    if (!showDeleted.value && u.deleted) return false
    const q = search.value.toLowerCase()
    const matchSearch = !q || u.email.toLowerCase().includes(q) || u.nom?.toLowerCase().includes(q) || u.prenom?.toLowerCase().includes(q)
    const matchRole   = !filterRole.value || u.role === filterRole.value
    return matchSearch && matchRole
  })
})

function initials(u)     { return ((u.prenom?.[0]||'')+(u.nom?.[0]||'')).toUpperCase()||'?' }
function fmtDate(d)      { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function avatarColor(u)  {
  const colors = ['#2B6CB0','#52B848','#7c3aed','#d97706','#dc2626','#0891b2']
  let h = 0; for (const c of u.id) h = (h << 5) - h + c.charCodeAt(0)
  return colors[Math.abs(h) % colors.length]
}
function changeRole(id, role) {
  const isSelf = id === authStore.currentUser?.id
  const isDowngrade = isSelf && role !== 'admin'

  if (isDowngrade) {
    // Étape 1 — première alerte
    if (!confirm(
      `⚠️ ATTENTION\n\nVous êtes sur le point de changer VOTRE PROPRE rôle de "Administrateur" vers "${ROLES[role]?.label}".\n\n` +
      `Si vous continuez, vous PERDREZ l'accès à l'administration.\n\nÊtes-vous sûr de vouloir continuer ?`
    )) return

    // Étape 2 — deuxième alerte, plus explicite
    if (!confirm(
      `🛑 CONFIRMATION FINALE\n\nCette action est IRRÉVERSIBLE sans l'aide d'un autre administrateur.\n\n` +
      `Votre rôle deviendra : ${ROLES[role]?.label.toUpperCase()}\n\n` +
      `Tapez OK uniquement si vous êtes absolument certain.`
    )) return
  }

  authStore.setRole(id, role)
  uiStore.success(isSelf ? `⚠️ Votre rôle a été changé en "${ROLES[role]?.label}"` : 'Rôle mis à jour')
}
function toggleSuspend(u)     { authStore.setSuspended(u.id, !u.suspended); uiStore.success(u.suspended ? 'Réactivé' : 'Suspendu') }
function doRestore(id)        { authStore.restoreUser(id); uiStore.success('Compte restauré') }

// View as
function toggleViewAs(userId) {
  if (authStore.isViewingAs && authStore.viewAsUser?.id === userId) {
    authStore.stopViewAs()
    uiStore.info('Vue normale restaurée')
  } else {
    authStore.startViewAs(userId)
    const u = allUsers.value.find(u => u.id === userId)
    uiStore.success(`Vue comme ${u?.prenom} ${u?.nom}`)
  }
}

// Create
const showCreate  = ref(false)
const createError = ref('')
const createForm  = ref({ prenom:'',nom:'',email:'',cabinet:'',role:'free',password:'' })
function openCreate() { createForm.value={prenom:'',nom:'',email:'',cabinet:'',role:'free',password:''}; createError.value=''; showCreate.value=true }
function doCreate() {
  createError.value = ''
  try {
    authStore.register({ ...createForm.value })
    const u = authStore.getUsers().find(u => u.email === createForm.value.email)
    if (u && createForm.value.role !== 'free') authStore.setRole(u.id, createForm.value.role)
    showCreate.value = false; uiStore.success('Compte créé')
  } catch (e) { createError.value = e.message }
}

// Reset pwd
const resetTarget = ref(null); const newPwd = ref(''); const resetError = ref('')
function openResetPwd(u) { resetTarget.value=u; newPwd.value=''; resetError.value='' }
function doResetPwd() {
  if (!newPwd.value||newPwd.value.length<6) { resetError.value='Mot de passe trop court (6 min)'; return }
  authStore.adminResetPassword(resetTarget.value.id, newPwd.value)
  resetTarget.value=null; uiStore.success('Mot de passe réinitialisé')
}

// Delete (soft)
const deleteTarget = ref(null)
function confirmDelete(u) { deleteTarget.value = u }
function doDelete() {
  try { authStore.removeUser(deleteTarget.value.id); deleteTarget.value=null; uiStore.success('Compte désactivé') }
  catch (e) { uiStore.error(e.message) }
}

// ── Mock data ─────────────────────────────────────────────────────────────────
// Patients/Bilans vivent maintenant côté serveur (Postgres) avec des ids générés par le
// serveur (UUID) — l'ancienne détection "id commence par mock_" ne fonctionne plus.
// On trace donc les ids des lignes créées par le chargement mock dans localStorage
// (par compte), pour pouvoir les identifier/supprimer précisément ensuite. L'agenda mock
// est retiré : MOCK_AGENDA (data/mockData.js) a une forme différente (title/start/end)
// du vrai modèle Appointment (patientName/date/startTime/durationMinutes) — jamais
// compatible, pas juste cassé par cette migration.
function mockIdsKey(uid) { return `movyx_mock_ids_${uid}` }
function getMockIds(uid) { return JSON.parse(localStorage.getItem(mockIdsKey(uid)) || '{"patients":[],"bilans":[]}') }
function setMockIds(uid, ids) { localStorage.setItem(mockIdsKey(uid), JSON.stringify(ids)) }

const mockLoaded = computed(() => {
  const uid = authStore.currentUser?.id
  if (!uid) return false
  const ids = getMockIds(uid)
  return ids.patients.length > 0 || ids.bilans.length > 0
})

const mockStats = computed(() => {
  const uid = authStore.currentUser?.id
  if (!uid) return []
  const ids = getMockIds(uid)
  return [
    { icon: '👤', value: ids.patients.length, label: 'Patients' },
    { icon: '📋', value: ids.bilans.length,   label: 'Bilans' },
    { icon: '💶', value: (ids.factures || []).length, label: 'Factures' },
    { icon: '📉', value: (ids.depenses || []).length, label: 'Dépenses' },
  ]
})
const MOCK_ID_PREFIX = 'mock_'

async function loadMock() {
  const uid = authStore.currentUser?.id
  if (!uid) { uiStore.error('Aucun utilisateur connecté'); return }

  const ids = getMockIds(uid)

  // Patients — un id -> patientId créé par bilan pour relier MOCK_BILANS correctement
  const patientIdMap = {}
  for (const p of MOCK_PATIENTS) {
    const { id: mockId, createdAt, updatedAt, ...rest } = p
    const created = await patientStore.createPatient(rest)
    patientIdMap[mockId] = created.id
    ids.patients.push(created.id)
  }

  // Bilans
  for (const b of MOCK_BILANS) {
    const { id: mockId, patientId, createdAt, updatedAt, ...rest } = b
    const realPatientId = patientIdMap[patientId]
    if (!realPatientId) continue // bilan mock orphelin (patientId inconnu) — ignoré
    const created = await bilanStore.createBilan(realPatientId, rest.typeBilan)
    await bilanStore.updateBilan(created.id, rest)
    ids.bilans.push(created.id)
  }

  // Factures : envoyées au serveur, qui les émet (numéros continus) ; elles restent ensuite comme toute facture émise
  const facturesMock = MOCK_FACTURES.map(({ id, patientId, ...f }) => ({ ...f, patientId: patientIdMap[patientId] || null }))
  if (!ids.factures?.length) {
    const crees = await api.importFactures(facturesMock)
    ids.factures = crees.map(f => f.id)
  }
  await factureStore.fetchFactures()

  // Dépenses : en base aussi
  if (!ids.depenses?.length) {
    ids.depenses = []
    for (const { id, ...d } of MOCK_DEPENSES) ids.depenses.push((await factureStore.createDepense(d)).id)
  }

  setMockIds(uid, ids)
  uiStore.setMockMode(true)
  uiStore.success('Données mock chargées — les vues sont à jour')
}

async function clearMock() {
  if (!confirm('Supprimer toutes les données mock de votre compte ?')) return
  const uid = authStore.currentUser?.id
  if (!uid) return

  const ids = getMockIds(uid)
  for (const id of ids.patients) await patientStore.deletePatient(id)
  for (const id of ids.bilans) await bilanStore.deleteBilan(id)

  for (const id of ids.depenses || []) await factureStore.deleteDepense(id).catch(() => {})
  // Les factures émises ne se suppriment pas (obligation légale) : elles restent, à annuler par avoir si besoin

  setMockIds(uid, { patients: [], bilans: [], factures: ids.factures || [] })
  uiStore.setMockMode(false)
  uiStore.success('Données mock supprimées — retour aux données réelles')
}

// ── Storage info ─────────────────────────────────────────────────────────────
const storageKeys = computed(() => {
  const keys = ['movyx_users','movyx_session','movyx_bilans','movyx_patients','movyx_view_as']
  return keys.map(key => {
    const v = localStorage.getItem(key)
    const bytes = v ? new Blob([v]).size : 0
    return { key, size: bytes ? (bytes > 1024 ? (bytes/1024).toFixed(1)+' KB' : bytes+' B') : '—' }
  })
})

// ── Tests unitaires ───────────────────────────────────────────────────────────
const testResults = ref([])
const running     = ref(false)
const passedCount = computed(() => testResults.value.filter(r => r.pass).length)
const allPassed   = computed(() => testResults.value.length > 0 && passedCount.value === testResults.value.length)

async function runTests() {
  running.value = true
  testResults.value = []
  const results = []

  function test(name, fn) {
    const t0 = performance.now()
    try {
      const result = fn()
      const ok = result !== false
      results.push({ name, pass: ok, detail: ok ? '' : 'Assertion échouée', ms: Math.round(performance.now()-t0) })
    } catch (e) {
      results.push({ name, pass: false, detail: e.message, ms: Math.round(performance.now()-t0) })
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  test('Auth – generateId produit une chaîne non vide', () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,7)
    return id && id.length > 5
  })

  test('Auth – defaultCustomization() a la bonne structure', () => {
    const c = defaultCustomization()
    return Array.isArray(c.hiddenBuiltinTabs) &&
           typeof c.builtinTabLabels === 'object' &&
           typeof c.extraFields === 'object' &&
           Array.isArray(c.customTabs)
  })

  test('Auth – liste des utilisateurs accessible', () => {
    const users = authStore.getUsers()
    return Array.isArray(users)
  })

  test('Auth – admin détecté correctement', () => {
    return typeof authStore.isAdmin === 'boolean'
  })

  test('Auth – isPro dépend du rôle effectif', () => {
    return typeof authStore.isPro === 'boolean'
  })

  // ── localStorage ──────────────────────────────────────────────────────────
  test('Storage – localStorage disponible', () => {
    localStorage.setItem('__pf_test', '1')
    const v = localStorage.getItem('__pf_test')
    localStorage.removeItem('__pf_test')
    return v === '1'
  })

  test('Store – patientStore.patients est un tableau', () => {
    return Array.isArray(patientStore.patients)
  })

  test('Store – bilanStore.bilans est un tableau', () => {
    return Array.isArray(bilanStore.bilans)
  })

  // ── Modèle bilan ──────────────────────────────────────────────────────────
  test('Bilan – tous les bilans ont un id et un patientId', () => {
    return bilanStore.bilans.every(b => b.id && b.patientId)
  })

  test('Bilan – douleurScore entre 0 et 10', () => {
    return bilanStore.bilans.every(b => b.douleurScore == null || (b.douleurScore >= 0 && b.douleurScore <= 10))
  })

  // ── Patients ──────────────────────────────────────────────────────────────
  test('Patient – tous les patients ont un id', () => {
    return patientStore.patients.every(p => p.id)
  })

  test('Patient – les patients ont nom et prenom', () => {
    return patientStore.patients.every(p => typeof p.nom === 'string' && typeof p.prenom === 'string')
  })

  // ── Customization ─────────────────────────────────────────────────────────
  test('Customization – ROLES couvre admin, vip, pro, free', () => {
    return ['admin','vip','pro','free'].every(k => k in ROLES)
  })

  test('Customization – saveCustomization stocke correctement', () => {
    const initial = authStore.effectiveUser?.customization
    if (!initial) return true
    const test = { ...initial, _testFlag: true }
    authStore.saveCustomization(test)
    const after = authStore.effectiveUser?.customization
    // Restore
    authStore.saveCustomization(initial)
    return after?._testFlag === true
  })

  // ── Intégrité des données ─────────────────────────────────────────────────
  test('Intégrité – pas de bilans orphelins', () => {
    const ids     = new Set(patientStore.patients.map(p => p.id))
    const orphans = bilanStore.bilans.filter(b => !ids.has(b.patientId))
    if (orphans.length > 0) throw new Error(`${orphans.length} bilan(s) orphelin(s) détecté(s)`)
    return true
  })

  test('Intégrité – taille localStorage < 4 MB', () => {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('movyx')) total += (localStorage.getItem(k)||'').length
    }
    const kb = total / 1024
    if (kb > 4096) throw new Error(`Taille : ${kb.toFixed(0)} KB — risque de dépassement`)
    return true
  })

  test('Intégrité – session active cohérente', () => {
    const session = JSON.parse(localStorage.getItem('movyx_session') || 'null')
    if (!session) return true // Pas de session = ok
    const user = authStore.getUsers().find(u => u.id === session.id)
    return !!user && !user.deleted
  })

  // Petite pause pour ne pas bloquer le rendu
  await new Promise(r => setTimeout(r, 50))
  testResults.value = results
  running.value = false
}
</script>

<style scoped>
.admin { max-width: 1200px; margin: 0 auto; }
.admin-header { margin-bottom: var(--space-xl); }
.admin-title { font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); }
.admin-sub { color: var(--color-text-muted); font-size: var(--text-sm); }

.admin-stats { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 16px; margin-bottom: var(--space-xl); }
.stat-card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:20px;text-align:center; }
.stat-icon  { font-size: 28px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--color-primary); }
.stat-label { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 4px; }

.admin-toolbar { display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:var(--space-lg); }

.admin-table-wrap { overflow-x: auto; border-radius: var(--radius-xl); border: 1px solid var(--color-border); }
.admin-table { width:100%;border-collapse:collapse;background:var(--color-surface); }
.admin-table th { padding:12px 16px;text-align:left;font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;background:var(--color-surface-alt);border-bottom:1px solid var(--color-border); }
.admin-table td { padding:14px 16px;border-bottom:1px solid var(--color-border);font-size:var(--text-sm);vertical-align:middle; }
.admin-table tr:last-child td { border-bottom: none; }
.admin-table tr.suspended td { opacity: .6; }
.admin-table tr.deleted td   { opacity: .4; background: #fef2f2; }

.user-cell { display:flex;align-items:center;gap:12px; }
.user-avatar { width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;flex-shrink:0; }
.user-name  { font-weight:600;color:var(--color-text); }
.user-email { font-size:var(--text-xs);color:var(--color-text-muted); }

.role-select { background:none;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:4px 8px;font-size:var(--text-sm);font-weight:600;cursor:pointer; }

.status-badge { display:inline-block;padding:3px 10px;border-radius:var(--radius-full);font-size:11px;font-weight:600; }
.status-active    { background:#dcfce7;color:#16a34a; }
.status-suspended { background:#fef3c7;color:#d97706; }
.status-deleted   { background:#fee2e2;color:#dc2626; }

.action-buttons { display:flex;gap:4px; }
.btn-xs    { padding:4px 8px;font-size:14px; }
.btn-danger { background:#fef2f2;color:#dc2626;border:1px solid #fca5a5; }
.btn-danger:hover { background:#fee2e2; }

.tc-checkbox-label { display:flex;align-items:center;gap:8px;cursor:pointer; }

.login-error { background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:var(--radius-md);padding:10px 14px;font-size:var(--text-sm);margin-bottom:16px; }

/* Storage */
.storage-info.card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:28px; }
.section-title { font-size:var(--text-xl);font-weight:700;margin-bottom:20px;color:var(--color-text); }
.storage-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:20px; }
.storage-item { background:var(--color-surface-alt);border-radius:var(--radius-lg);padding:14px; }
.storage-key  { font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);margin-bottom:4px; }
.storage-val  { margin-bottom:4px; }
.storage-val code { background:var(--color-primary-light);color:var(--color-primary);padding:2px 8px;border-radius:var(--radius-md);font-size:var(--text-sm); }
.storage-desc { font-size:var(--text-xs);color:var(--color-text-muted); }
.storage-warning { background:#fef9c3;border:1px solid #fde047;border-radius:var(--radius-lg);padding:14px;font-size:var(--text-sm);color:#713f12;margin-bottom:16px; }
.storage-sizes { display:flex;flex-direction:column;gap:6px; }
.storage-size-row { display:flex;align-items:center;justify-content:space-between;font-size:var(--text-sm);padding:6px 10px;background:var(--color-surface-alt);border-radius:var(--radius-md); }
.storage-size-row code { font-size:var(--text-sm);color:var(--color-primary); }

/* Tests */
.tests-panel { display:flex;flex-direction:column;gap:20px; }
.tests-toolbar { display:flex;align-items:center;gap:16px; }
.tests-score { font-size:var(--text-sm);font-weight:700;padding:6px 16px;border-radius:var(--radius-full); }
.score-ok   { background:#dcfce7;color:#16a34a; }
.score-fail { background:#fee2e2;color:#dc2626; }

.tests-list { display:flex;flex-direction:column;gap:8px; }
.test-row { display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-radius:var(--radius-lg);border:1px solid var(--color-border); }
.test-pass { background:#f0fdf4;border-color:#bbf7d0; }
.test-fail { background:#fef2f2;border-color:#fca5a5; }
.test-icon { font-size:16px;flex-shrink:0;margin-top:1px; }
.test-info { flex:1;min-width:0; }
.test-name   { font-size:var(--text-sm);font-weight:600;color:var(--color-text); }
.test-detail { font-size:var(--text-xs);color:#dc2626;margin-top:3px;font-family:monospace; }
.test-time   { font-size:var(--text-xs);color:var(--color-text-light);flex-shrink:0; }

.tests-empty { text-align:center;padding:48px;background:var(--color-surface-alt);border-radius:var(--radius-xl);color:var(--color-text-muted);font-size:var(--text-sm); }

/* Modal */
.modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px; }
.modal-card { background:var(--color-surface);border-radius:var(--radius-xl);padding:32px;width:100%;max-width:420px;box-shadow:var(--shadow-xl);display:flex;flex-direction:column;gap:16px; }
.modal-card h3 { font-size:var(--text-xl);font-weight:700;color:var(--color-text); }
.modal-actions { display:flex;justify-content:flex-end;gap:10px;margin-top:8px; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .admin { max-width: 100%; }

  /* Onglets admin scrollables */
  .tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
  .tab  { white-space: nowrap; }

  /* Stats : 2 colonnes max */
  .admin-stats { grid-template-columns: repeat(2, 1fr); }

  /* Toolbar vertical */
  .admin-toolbar { flex-direction: column; align-items: stretch; gap: 8px; }
  .admin-toolbar .form-input { max-width: 100% !important; }
  .admin-toolbar .btn { align-self: flex-start; }

  /* Table : colonnes secondaires cachées sur mobile */
  .admin-table th:nth-child(2),
  .admin-table td:nth-child(2) { display: none; }   /* Cabinet */
  .admin-table th:nth-child(4),
  .admin-table td:nth-child(4) { display: none; }   /* Date */

  /* Réduire le padding des cellules */
  .admin-table th,
  .admin-table td { padding: 10px 10px; font-size: var(--text-xs); }

  /* Modale plein écran sur mobile */
  .modal-card { padding: 24px 20px; }
}

@media (max-width: 480px) {
  /* Stats : 1 colonne */
  .admin-stats { grid-template-columns: repeat(2, 1fr); }
  .stat-value  { font-size: 22px; }

  /* Table : cacher aussi le statut, garder user + rôle + actions */
  .admin-table th:nth-child(5),
  .admin-table td:nth-child(5) { display: none; }   /* Statut */

  .user-avatar { width: 28px; height: 28px; font-size: 11px; }
  .action-buttons { gap: 2px; }
}

/* ── Mock data ─────────────────────────────────────────────────────────── */
.mock-panel.card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:28px;display:flex;flex-direction:column;gap:20px; }
.mock-desc { color:var(--color-text-muted);font-size:var(--text-sm);line-height:1.6; }
.mock-warning { background:#fef9c3;border:1px solid #fde047;border-radius:var(--radius-lg);padding:12px 16px;font-size:var(--text-sm);color:#713f12; }
.mock-summary { display:flex;gap:12px;flex-wrap:wrap; }
.mock-stat { display:flex;align-items:center;gap:6px;background:var(--color-surface-alt);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:8px 14px;font-size:var(--text-sm); }
.mock-stat-icon { font-size:16px; }
.mock-stat-val  { font-weight:700;color:var(--color-primary); }
.mock-stat-label { color:var(--color-text-muted); }
.mock-actions { display:flex;gap:12px;flex-wrap:wrap; }
.mock-detail { background:var(--color-surface-alt);border-radius:var(--radius-lg);padding:16px;font-size:var(--text-sm); }
.mock-detail ul { margin:8px 0 0 0;padding-left:20px;display:flex;flex-direction:column;gap:4px;color:var(--color-text-muted); }
</style>
