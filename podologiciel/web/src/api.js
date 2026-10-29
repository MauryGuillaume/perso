const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4517'
const TOKEN_KEY = 'movyx_access_token'
const REFRESH_KEY = 'movyx_refresh_token'

export function getAccessToken() { return localStorage.getItem(TOKEN_KEY) }
export function getRefreshToken() { return localStorage.getItem(REFRESH_KEY) }

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return request(path, { method, body, auth, retry: false })
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || 'Erreur serveur')
  return data
}

// Fichier binaire (document d'un patient) : même jeton, réponse en Blob
async function requestBlob(path, retry = true) {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (res.status === 401 && retry && await tryRefresh()) return requestBlob(path, false)
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message || 'Fichier introuvable')
  }
  return res.blob()
}

async function tryRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const data = await request('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false })
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    clearTokens()
    return false
  }
}

export const api = {
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password }, auth: false }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  completeTwoFactorLogin: (pendingToken, code) =>
    request('/auth/login/2fa', { method: 'POST', body: { pendingToken, code }, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (resetToken, newPassword) =>
    request('/auth/reset-password', { method: 'POST', body: { resetToken, newPassword }, auth: false }),

  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PATCH', body: data }),

  twoFactorSetup: () => request('/2fa/setup', { method: 'POST' }),
  twoFactorEnable: (code) => request('/2fa/enable', { method: 'POST', body: { code } }),
  twoFactorDisable: (code) => request('/2fa', { method: 'DELETE', body: { code } }),
  twoFactorStatus: () => request('/2fa/status'),

  listUsers: () => request('/roles/users'),
  setUserRole: (id, role) => request(`/roles/users/${id}/role`, { method: 'PATCH', body: { role } }),
  setUserSuspended: (id, suspended) => request(`/roles/users/${id}/suspended`, { method: 'PATCH', body: { suspended } }),
  impersonate: (id) => request(`/roles/users/${id}/impersonate`, { method: 'POST' }),

  listPatients: () => request('/patients'),
  createPatient: (data) => request('/patients', { method: 'POST', body: data }),
  updatePatient: (id, data) => request(`/patients/${id}`, { method: 'PATCH', body: data }),
  deletePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),

  listBilans: (patientId) => request(`/bilans${patientId ? `?patientId=${patientId}` : ''}`),
  createBilan: (data) => request('/bilans', { method: 'POST', body: data }),
  updateBilan: (id, data) => request(`/bilans/${id}`, { method: 'PATCH', body: data }),
  deleteBilan: (id) => request(`/bilans/${id}`, { method: 'DELETE' }),

  listAppointments: () => request('/agenda'),
  createAppointment: (data) => request('/agenda', { method: 'POST', body: data }),
  updateAppointment: (id, data) => request(`/agenda/${id}`, { method: 'PATCH', body: data }),
  deleteAppointment: (id) => request(`/agenda/${id}`, { method: 'DELETE' }),
  getAgendaSettings: () => request('/agenda/settings'),
  updateAgendaSettings: (data) => request('/agenda/settings', { method: 'PATCH', body: data }),

  listExpenses: () => request('/expenses'),
  createExpense: (data) => request('/expenses', { method: 'POST', body: data }),
  createRecurringExpenses: (data) => request('/expenses/recurring', { method: 'POST', body: data }),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PATCH', body: data }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  deleteExpenseRecurrenceGroup: (groupId) => request(`/expenses/recurrence/${groupId}`, { method: 'DELETE' }),

  // Factures : brouillon → émise (numéro continu) → avoir pour annuler
  listFactures: () => request('/factures'),
  createFacture: (data) => request('/factures', { method: 'POST', body: data }),
  updateFacture: (id, data) => request(`/factures/${id}`, { method: 'PATCH', body: data }),
  emettreFacture: (id) => request(`/factures/${id}/emettre`, { method: 'POST' }),
  avoirFacture: (id, motif) => request(`/factures/${id}/avoir`, { method: 'POST', body: { motif } }),
  deleteFacture: (id) => request(`/factures/${id}`, { method: 'DELETE' }),
  importFactures: (factures) => request('/factures/import', { method: 'POST', body: { factures } }),
  getFacturationSettings: () => request('/factures/settings'),
  updateFacturationSettings: (data) => request('/factures/settings', { method: 'PATCH', body: data }),

  // Pennylane (facultatif) : clé d'API du podologue, envoi des factures émises avec leur PDF
  getPennylane: () => request('/pennylane'),
  updatePennylane: (data) => request('/pennylane', { method: 'PUT', body: data }),
  deletePennylane: () => request('/pennylane', { method: 'DELETE' }),
  envoyerPennylane: (id, pdf, forcer) => request(`/pennylane/factures/${id}`, { method: 'POST', body: { pdf, forcer } }),
  synchroPennylane: () => request('/pennylane/patients/synchro', { method: 'POST' }),

  // Documents des patients
  listDocuments: ({ patientId, bilanId } = {}) => request(`/documents?${new URLSearchParams(Object.entries({ patientId, bilanId }).filter(([, v]) => v))}`),
  getDocument: (id) => request(`/documents/${id}`),
  getDocumentFichier: (id) => requestBlob(`/documents/${id}/fichier`),
  createDocument: (data) => request('/documents', { method: 'POST', body: data }),
  updateDocument: (id, data) => request(`/documents/${id}`, { method: 'PATCH', body: data }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Semelles (orthèses plantaires)
  listSemelles: (patientId) => request(`/semelles${patientId ? `?patientId=${patientId}` : ''}`),
  getSemelle: (id) => request(`/semelles/${id}`),
  createSemelle: (data) => request('/semelles', { method: 'POST', body: data }),
  updateSemelle: (id, data) => request(`/semelles/${id}`, { method: 'PATCH', body: data }),
  deleteSemelle: (id) => request(`/semelles/${id}`, { method: 'DELETE' }),
}
