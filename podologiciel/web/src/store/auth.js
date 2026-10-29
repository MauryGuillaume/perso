import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, getAccessToken, setTokens, clearTokens } from '@/api.js'

export const ROLES = {
  admin: { label: 'Administrateur', color: '#7c3aed' },
  vip:   { label: 'VIP',            color: '#d97706' },
  pro:   { label: 'Pro',            color: '#2B6CB0' },
  free:  { label: 'Gratuit',        color: '#6b7280' },
}

// packages/roles utilise admin/user/premium/vip — Podologie utilise historiquement
// admin/free/pro/vip (Firebase). On traduit ici pour ne rien changer dans les 19+
// composants qui consomment déjà currentUser.role avec les valeurs historiques.
const ROLE_FROM_BACKEND = { admin: 'admin', user: 'free', premium: 'pro', vip: 'vip' }
const ROLE_TO_BACKEND = { admin: 'admin', free: 'user', pro: 'premium', vip: 'vip' }

export const useAuthStore = defineStore('auth', () => {
  const currentUser  = ref(null)
  const pendingToken  = ref(null) // présent entre l'étape 1 (login) et l'étape 2 (code 2FA)
  const viewAsUser   = ref(null)
  const authReady    = ref(false)

  const isLoggedIn  = computed(() => !!currentUser.value)
  const isAdmin     = computed(() => currentUser.value?.role === 'admin')
  const isViewingAs = computed(() => !!viewAsUser.value && isAdmin.value)
  const effectiveUser = computed(() => isViewingAs.value ? viewAsUser.value : currentUser.value)
  const isPro         = computed(() => ['pro', 'vip', 'admin'].includes(effectiveUser.value?.role))

  function toFrontUser(profile) {
    return { ...profile, role: ROLE_FROM_BACKEND[profile.role] ?? 'free' }
  }

  // Appelé dans main.js — retourne une promesse qui résout après vérification du token stocké.
  async function initAuth() {
    const token = getAccessToken()
    if (!token) { authReady.value = true; return }
    try {
      const profile = await api.getProfile()
      currentUser.value = toFrontUser(profile)
    } catch {
      clearTokens()
      currentUser.value = null
    } finally {
      authReady.value = true
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────
  async function register({ email, password, nom, prenom, cabinet = '' }) {
    await api.register(email, password)
    await login(email, password)
    await api.updateProfile({ nom, prenom, cabinet })
    const profile = await api.getProfile()
    currentUser.value = toFrontUser(profile)
    return currentUser.value
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  // Renvoie { requires2fa: true } si une vérification par code est nécessaire —
  // à ce stade, aucun token final n'a été émis (contrairement à l'ancienne
  // implémentation Firebase qui vérifiait le 2FA côté client après coup).
  async function login(email, password) {
    const result = await api.login(email, password)

    if (result.status === 'requires2fa') {
      pendingToken.value = result.pendingToken
      return { requires2fa: true }
    }

    setTokens(result.tokens.accessToken, result.tokens.refreshToken)
    const profile = await api.getProfile()
    currentUser.value = toFrontUser(profile)
    return { requires2fa: false }
  }

  async function verifyTwoFactorLogin(code) {
    if (!pendingToken.value) throw new Error('Session de connexion expirée, reconnectez-vous.')
    const result = await api.completeTwoFactorLogin(pendingToken.value, code)
    pendingToken.value = null
    setTokens(result.tokens.accessToken, result.tokens.refreshToken)
    currentUser.value = toFrontUser(result.user)
    const profile = await api.getProfile()
    currentUser.value = toFrontUser(profile)
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    try { await api.logout() } catch { /* le token peut déjà être expiré, on nettoie quand même */ }
    clearTokens()
    currentUser.value = null
    viewAsUser.value  = null
    pendingToken.value = null
  }

  // ── Update profile ─────────────────────────────────────────────────────────
  async function updateProfile(data) {
    if (!currentUser.value) return

    // Le changement de mot de passe passe par une route dédiée (POST /auth/change-password,
    // packages/auth) — pas par PATCH /profile qui ne connaît que les champs métier.
    if (data.password && data.currentPassword) {
      await api.changePassword(data.currentPassword, data.password)
      const { password, currentPassword, ...rest } = data
      if (Object.keys(rest).length === 0) return
      data = rest
    }

    const profile = await api.updateProfile(data)
    currentUser.value = toFrontUser(profile)
  }

  async function markOnboardingDone() {
    await updateProfile({ firstLogin: false })
  }

  // ── ViewAs (admin seulement) — impersonation réelle côté serveur ───────────
  async function startViewAs(userId) {
    if (!isAdmin.value) return
    const { accessToken } = await api.impersonate(userId)
    // Le token d'impersonation remplace temporairement l'access token courant ;
    // le refresh token de l'admin reste inchangé pour pouvoir revenir ensuite.
    setTokens(accessToken, null)
    const profile = await api.getProfile()
    viewAsUser.value = toFrontUser(profile)
  }

  function stopViewAs() {
    viewAsUser.value = null
    // Le token d'impersonation expire de lui-même (5 min) ; on ne le révoque pas
    // explicitement ici, l'admin doit simplement se reconnecter s'il continue après.
  }

  async function refreshViewAs() {
    if (!viewAsUser.value) return
    const profile = await api.getProfile()
    viewAsUser.value = toFrontUser(profile)
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async function getUsers() {
    const users = await api.listUsers()
    return users.map(toFrontUser)
  }

  async function setRole(id, role) {
    await api.setUserRole(id, ROLE_TO_BACKEND[role] ?? role)
    if (isViewingAs.value && viewAsUser.value?.id === id) await refreshViewAs()
  }

  async function setSuspended(id, v) {
    await api.setUserSuspended(id, v)
  }

  async function removeUser(id) {
    if (id === currentUser.value?.id) throw new Error('Vous ne pouvez pas supprimer votre propre compte')
    await api.setUserSuspended(id, true)
  }

  async function restoreUser(id) {
    await api.setUserSuspended(id, false)
  }

  async function adminResetPassword() {
    throw new Error('Réinitialisation de mot de passe par un admin : pas encore disponible.')
  }

  async function upgradeToPro() {
    // Sans vraie brique billing branchée sur Podologie, ceci reste un raccourci
    // manuel — équivalent à ce qui existait déjà côté Firebase (pas de paiement réel).
    await setRole(currentUser.value?.id, 'pro')
    const profile = await api.getProfile()
    currentUser.value = toFrontUser(profile)
  }

  // ── Customization ──────────────────────────────────────────────────────────
  async function saveCustomization(cust) {
    const targetId = isViewingAs.value ? viewAsUser.value?.id : currentUser.value?.id
    if (!targetId) return
    if (isViewingAs.value) {
      // La customisation d'un compte usurpé serait à porter par une route admin dédiée —
      // hors périmètre de ce chantier auth, laissé en l'état pour l'instant.
      return
    }
    await updateProfile({ customization: cust })
  }

  // ── 2FA TOTP (vérification réelle côté serveur, cf packages/two-factor-auth) ─
  async function save2FASecret(secret) {
    // Conservé pour compatibilité de nom avec TwoFactor.vue — appelle en réalité
    // le flux serveur complet setup() + enable(code), pas juste une sauvegarde locale.
    throw new Error('save2FASecret est remplacé par setupTwoFactor()/enableTwoFactor(code) — voir store/auth.js')
  }

  async function setupTwoFactor() {
    return api.twoFactorSetup() // { qrCodeDataUrl, secret }
  }

  async function enableTwoFactor(code) {
    await api.twoFactorEnable(code)
    const profile = await api.getProfile()
    currentUser.value = toFrontUser(profile)
  }

  async function disable2FA(code) {
    await api.twoFactorDisable(code)
    const profile = await api.getProfile()
    currentUser.value = toFrontUser(profile)
  }

  return {
    currentUser, viewAsUser, authReady, pendingToken,
    isLoggedIn, isAdmin, isViewingAs, effectiveUser, isPro,
    initAuth,
    login, verifyTwoFactorLogin, register, logout, updateProfile, markOnboardingDone,
    startViewAs, stopViewAs, refreshViewAs,
    getUsers, setRole, setSuspended, removeUser, restoreUser, adminResetPassword, upgradeToPro,
    saveCustomization,
    save2FASecret, setupTwoFactor, enableTwoFactor, disable2FA,
  }
})

// ── Default customization model ───────────────────────────────────────────────
export function defaultCustomization() {
  return {
    hiddenBuiltinTabs: [],
    builtinTabLabels:  {},
    extraFields:       {},
    customTabs:        [],
  }
}

// ── Plan limits & features ────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:  { maxPatients: 10, canCustomizeTabs: false, canCreateTabs: false },
  pro:   { maxPatients: Infinity, canCustomizeTabs: true,  canCreateTabs: true  },
  vip:   { maxPatients: Infinity, canCustomizeTabs: true,  canCreateTabs: true  },
  admin: { maxPatients: Infinity, canCustomizeTabs: true,  canCreateTabs: true  },
}

export function getPlanLimits(role) {
  return PLAN_LIMITS[role] || PLAN_LIMITS.free
}

// ── Field types ───────────────────────────────────────────────────────────────
export const FIELD_TYPES = [
  { value: 'text',        label: 'Texte court',                  hasPlaceholder: true  },
  { value: 'textarea',    label: 'Texte long',                   hasPlaceholder: true  },
  { value: 'number',      label: 'Nombre',                       hasPlaceholder: false },
  { value: 'percentage',  label: 'Pourcentage (curseur 0–100)',  hasPlaceholder: false },
  { value: 'checkbox',    label: 'Case à cocher',                hasPlaceholder: false },
  { value: 'checkboxes',  label: 'Cases à cocher multiples',     hasPlaceholder: false },
  { value: 'select',      label: 'Menu déroulant',               hasPlaceholder: false },
  { value: 'radio',       label: 'Choix unique (boutons radio)', hasPlaceholder: false },
  { value: 'date',        label: 'Date',                         hasPlaceholder: false },
]
