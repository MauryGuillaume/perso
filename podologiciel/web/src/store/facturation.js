import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { generateId } from '@/utils/uuid.js'
import { useAuthStore } from '@/store/auth.js'
import { api } from '@/api.js'

// ── Actes par défaut ────────────────────────────────────────────────────────
export const DEFAULT_ACTE_TYPES = [
  { id: 'soin-pedicurie',      label: 'Soin de pédicurie',      prix: 35  },
  { id: 'bilan-podologique',   label: 'Bilan podologique',       prix: 60  },
  { id: 'ortheses-plantaires', label: 'Orthèses plantaires',     prix: 150 },
]

export const CATEGORIES_DEPENSES = [
  { value: 'loyer',            label: 'Loyer / Local'             },
  { value: 'materiel',         label: 'Matériel médical'          },
  { value: 'fournitures',      label: 'Fournitures'               },
  { value: 'charges-sociales', label: 'Charges sociales'          },
  { value: 'assurance',        label: 'Assurance'                 },
  { value: 'formation',        label: 'Formation'                 },
  { value: 'logiciel',         label: 'Logiciel / Abonnement'     },
  { value: 'transport',        label: 'Transport'                 },
  { value: 'communication',    label: 'Communication / Marketing' },
  { value: 'comptabilite',     label: 'Comptabilité / Juridique'  },
  { value: 'autre',            label: 'Autre'                     },
]

export const MODES_PAIEMENT = [
  { value: 'cheque',       label: 'Chèque'       },
  { value: 'especes',      label: 'Espèces'      },
  { value: 'cb',           label: 'Carte bancaire' },
  { value: 'virement',     label: 'Virement'     },
  { value: 'tiers-payant', label: 'Tiers payant' },
  { value: 'autre',        label: 'Autre'        },
]

function userKey(base, userId) {
  return userId ? `${base}_${userId}` : base
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}

export const useFacturationStore = defineStore('facturation', () => {
  const authStore = useAuthStore()

  function uid() { return authStore.currentUser?.id || null }

  // ── State ─────────────────────────────────────────────────────────────────
  // Factures, actes et relances : en base (podologiciel-api), plus dans le navigateur.
  const factures       = ref([])
  const acteTypes      = ref(DEFAULT_ACTE_TYPES.map(a => ({ ...a })))
  const depenses       = ref([])
  const rappelSettings = ref({ enabled: true, firstReminderDays: 14, repeatIntervalDays: 7 })
  const loading        = ref(false)
  const pennylane      = ref({ connecte: false, entreprise: null, envoiAuto: true, depuis: null })

  watch(() => authStore.currentUser?.id, async (newId) => {
    factures.value = []
    depenses.value = []
    pennylane.value = { connecte: false, entreprise: null, envoiAuto: true, depuis: null }
    if (!newId) return
    loading.value = true
    try {
      await Promise.all([fetchFactures(), fetchSettings(), fetchDepenses(), fetchPennylane()])
      await reprendreAnciennesDonnees(newId)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  /**
   * Reprise unique des factures, actes et relances gardés autrefois dans ce navigateur (localStorage) :
   * envoyés au serveur, qui émet les factures dans l'ordre des dates. L'ancienne copie est gardée sous un autre nom.
   */
  async function reprendreAnciennesDonnees(id) {
    const cle = userKey('movyx_factures', id)
    const anciennes = load(cle, null)
    if (Array.isArray(anciennes) && anciennes.length) {
      const crees = await api.importFactures(anciennes)
      factures.value.push(...crees)
      localStorage.setItem(cle + '_reprises', JSON.stringify(anciennes))
      localStorage.removeItem(cle)
    }
    const actes = load(userKey('movyx_acte_types', id), null)
    const rappels = load(userKey('movyx_rappel_settings', id), null)
    if ((actes || rappels) && !settingsEnregistres) {
      const res = await api.updateFacturationSettings({ ...(actes ? { acteTypes: actes } : {}), ...(rappels ? { rappels } : {}) })
      applySettings(res)
    }
    localStorage.removeItem(userKey('movyx_acte_types', id))
    localStorage.removeItem(userKey('movyx_rappel_settings', id))
  }

  // ── Réglages (actes proposés, relances) ───────────────────────────────────
  let settingsEnregistres = false
  function applySettings(res) {
    acteTypes.value = res.acteTypes.map(a => ({ ...a }))
    rappelSettings.value = { ...res.rappels }
    settingsEnregistres = res.enregistre
  }
  async function fetchSettings() { applySettings(await api.getFacturationSettings()) }

  let saveTimer = null
  function saveSettings() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      try { applySettings(await api.updateFacturationSettings({ acteTypes: acteTypes.value, rappels: rappelSettings.value })) }
      catch (e) { console.error(e) }
    }, 400)
  }

  function createActeType(data) {
    const t = { id: generateId(), label: '', prix: 0, ...data }
    acteTypes.value.push(t); saveSettings(); return t
  }
  function updateActeType(id, data) {
    const idx = acteTypes.value.findIndex(t => t.id === id)
    if (idx >= 0) { Object.assign(acteTypes.value[idx], data); saveSettings() }
  }
  function deleteActeType(id) {
    acteTypes.value = acteTypes.value.filter(t => t.id !== id); saveSettings()
  }
  function updateRappelSettings(data) {
    Object.assign(rappelSettings.value, data); saveSettings()
  }

  // ── Factures ──────────────────────────────────────────────────────────────
  async function fetchFactures() { factures.value = await api.listFactures() }

  function remplacer(f) {
    const idx = factures.value.findIndex(x => x.id === f.id)
    if (idx >= 0) factures.value[idx] = f
    else factures.value.push(f)
    return f
  }

  /** data.emettre = true : la facture reçoit tout de suite son numéro (et ne change plus ensuite). */
  async function createFacture(data) { return remplacer(await api.createFacture(data)) }
  async function updateFacture(id, data) { return remplacer(await api.updateFacture(id, data)) }
  async function emettreFacture(id) { return remplacer(await api.emettreFacture(id)) }

  /** Annule une facture émise : crée un avoir numéroté aux montants opposés. */
  async function annulerFacture(id, motif) {
    const res = await api.avoirFacture(id, motif)
    remplacer(res.facture)
    remplacer(res.avoir)
    return res.avoir
  }

  /** Seul un brouillon se supprime. */
  async function deleteFacture(id) {
    await api.deleteFacture(id)
    factures.value = factures.value.filter(f => f.id !== id)
  }

  function getFacture(id) { return factures.value.find(f => f.id === id) ?? null }

  function facturesByPatient(patientId) {
    return factures.value
      .filter(f => f.patientId === patientId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  // ── Pennylane (facultatif) ─────────────────────────────────────────────────
  // Les factures émises y sont importées avec leur numéro et leur PDF ; l'écran fabrique le PDF (Facturation.vue).
  async function fetchPennylane() {
    try { pennylane.value = await api.getPennylane() } catch (e) { console.error(e) }
  }
  async function reglerPennylane(data) { pennylane.value = await api.updatePennylane(data); return pennylane.value }
  async function deconnecterPennylane() { pennylane.value = await api.deletePennylane() }

  /** pdf : base64 du PDF de la facture. En cas d'échec, l'erreur est gardée sur la facture puis relancée. */
  async function envoyerPennylane(facture, pdf, forcer = false) {
    try {
      const res = await api.envoyerPennylane(facture.id, pdf, forcer)
      const f = getFacture(facture.id)
      if (f) Object.assign(f, { pennylaneId: res.pennylaneId, pennylaneEnvoyeLe: res.pennylaneEnvoyeLe, pennylaneErreur: null })
      return res
    } catch (e) {
      const f = getFacture(facture.id)
      if (f && !/déjà dans Pennylane|en cours d’envoi/.test(e.message)) f.pennylaneErreur = e.message
      throw e
    }
  }

  /** Met à jour dans Pennylane les clients dont la fiche patient a changé ; renvoie le nombre mis à jour. */
  async function synchroClientsPennylane() {
    let total = 0, res
    do { res = await api.synchroPennylane(); total += res.misAJour } while (res.restants)
    return total
  }

  // Factures émises à envoyer : datées depuis le réglage « depuis », dans l'ordre d'émission (une facture avant son avoir)
  const facturesPourPennylane = computed(() => {
    if (!pennylane.value.connecte) return []
    return factures.value
      .filter(f => f.numero && !f.pennylaneId && (!pennylane.value.depuis || f.date >= pennylane.value.depuis))
      .sort((a, b) => new Date(a.emiseLe) - new Date(b.emiseLe) || String(a.numero).localeCompare(String(b.numero)))
  })

  // ── Dépenses (podologiciel-api) ────────────────────────────────────────────
  async function fetchDepenses() {
    depenses.value = await api.listExpenses()
  }

  /**
   * data.recurrenceDates (plusieurs dates calculées côté client) => création récurrente,
   * une dépense par date, rattachées au même recurrenceGroupId (généré côté serveur).
   * Sinon création simple. Le montant kilométrique est déjà calculé côté client
   * (Comptabilite.vue), le serveur ne fait que persister.
   */
  async function createDepense(data) {
    if (data.recurrenceDates?.length > 1) {
      const { recurrenceDates, recurrenceFreq, ...expense } = data
      const created = await api.createRecurringExpenses({ expense, recurrenceFreq, dates: recurrenceDates })
      depenses.value.push(...created)
      return created
    }

    const created = await api.createExpense(data)
    depenses.value.push(created)
    return created
  }

  async function updateDepense(id, data) {
    const updated = await api.updateExpense(id, data)
    const idx = depenses.value.findIndex(d => d.id === id)
    if (idx >= 0) depenses.value[idx] = updated
    return updated
  }

  async function deleteDepense(id) {
    await api.deleteExpense(id)
    depenses.value = depenses.value.filter(d => d.id !== id)
  }

  async function deleteDepenseRecurrenceGroup(recurrenceGroupId) {
    const { deletedCount } = await api.deleteExpenseRecurrenceGroup(recurrenceGroupId)
    depenses.value = depenses.value.filter(d => d.recurrenceGroupId !== recurrenceGroupId)
    return deletedCount
  }

  // ── Rappels ───────────────────────────────────────────────────────────────
  const facturesNeedingReminder = computed(() => {
    if (!rappelSettings.value.enabled) return []
    const now      = Date.now()
    const firstMs  = rappelSettings.value.firstReminderDays  * 86_400_000
    const repeatMs = rappelSettings.value.repeatIntervalDays * 86_400_000
    return factures.value.filter(f => {
      if (!f.numero || f.genre === 'avoir' || f.annuleeLe) return false
      if (f.statut !== 'en_attente') return false
      const age = now - new Date(f.date).getTime()
      if (age < firstMs) return false
      if (f.lastReminderAt) return now - new Date(f.lastReminderAt).getTime() >= repeatMs
      return true
    }).sort((a, b) => new Date(a.date) - new Date(b.date))
  })

  async function markReminded(id) {
    return updateFacture(id, { lastReminderAt: new Date().toISOString() })
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const facturesSorted = computed(() => [...factures.value].sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.numero || '').localeCompare(String(a.numero || ''))))
  // Recettes : factures émises et avoirs (les avoirs, négatifs, compensent les factures annulées)
  const facturesEmises = computed(() => facturesSorted.value.filter(f => f.numero))
  const depensesSorted = computed(() => [...depenses.value].sort((a, b) => new Date(b.date) - new Date(a.date)))

  return {
    factures, facturesSorted, facturesEmises, acteTypes, depenses, depensesSorted, loading,
    rappelSettings, facturesNeedingReminder,
    createActeType, updateActeType, deleteActeType,
    fetchFactures, createFacture, updateFacture, emettreFacture, annulerFacture, deleteFacture, getFacture, facturesByPatient,
    fetchDepenses, createDepense, updateDepense, deleteDepense, deleteDepenseRecurrenceGroup,
    updateRappelSettings, markReminded,
    pennylane, facturesPourPennylane, fetchPennylane, reglerPennylane, deconnecterPennylane, envoyerPennylane, synchroClientsPennylane,
  }
})
