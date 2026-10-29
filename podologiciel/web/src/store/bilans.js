import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/api.js'
import { generateId } from '@/utils/uuid.js'
import { useAuthStore } from '@/store/auth.js'

// Champs gérés comme colonnes scalaires côté serveur (cf apps/podology-api/api/prisma/schema.prisma,
// model Bilan) — tout le reste part dans Bilan.data (JSON). updateBilan() doit répartir le payload
// entre les deux avant l'appel API.
const SCALAR_FIELDS = ['date', 'statut', 'motifConsultation', 'douleurScore']

function splitBilanPayload(data) {
  const scalars = {}
  const rest = {}
  for (const [key, value] of Object.entries(data)) {
    if (SCALAR_FIELDS.includes(key)) scalars[key] = value
    else rest[key] = value
  }
  return { scalars, rest }
}

const defaultBilan = () => ({
  id: '',
  patientId: '',
  date:      new Date().toISOString().split('T')[0],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  motifConsultation:      '',
  antecedentsMedicaux:    '',
  antecedentsFamiliaux:   '',
  maladies:               '',
  traitementsEnCours:     '',
  circumstancesApparition:'',
  douleurScore:           null,
  facteursAggravants:     '',
  facteursAttenuants:     '',
  questionsPersonnalisees: [],

  pointMobile:   '',
  jambemotrice:  '',
  oeilMoteur:    '',
  lateralite:    '',
  notesMotrices: '',

  barometrieData:  null,
  barometrieImage: null,
  barometrieNotes: '',

  schemaAnnotations: [],
  schemaImageData:   null,

  chainesGDS:   [],
  chainesNotes: '',

  canvasData: null,

  notesGenerales: '',

  customData: {},

  typeBilan: 'bilan',

  piedAnnotations: {
    plantaire_gauche: [],
    plantaire_droit:  [],
    dorsal_gauche:    [],
    dorsal_droit:     [],
  },

  statut: 'brouillon',
})

export const useBilanStore = defineStore('bilans', () => {
  const authStore = useAuthStore()

  const bilans         = ref([])
  const currentBilanId = ref(null)
  const autoSaveTimer  = ref(null)
  const loading        = ref(false)

  const currentBilan = computed(() => bilans.value.find(b => b.id === currentBilanId.value) || null)

  function bilansByPatient(patientId) {
    return bilans.value
      .filter(b => b.patientId === patientId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  async function loadBilans() {
    const uid = authStore.currentUser?.id
    if (!uid) { bilans.value = []; return }
    loading.value = true
    try {
      bilans.value = await api.listBilans()
    } finally {
      loading.value = false
    }
  }

  watch(() => authStore.currentUser?.id, async (newId) => {
    currentBilanId.value = null
    if (newId) await loadBilans()
    else bilans.value = []
  }, { immediate: true })   // le store peut naître après la connexion (page ouverte directement)

  async function createBilan(patientId, type = 'bilan') {
    const created = await api.createBilan({ patientId, typeBilan: type })
    // Le serveur ne renvoie que les champs par défaut minimaux (cf BilansController.create) —
    // on complète localement avec le reste du questionnaire vierge, puis on persiste ce
    // complément immédiatement pour que le serveur ait la même vue que le client.
    const bilan = {
      ...defaultBilan(),
      ...created,
      piedAnnotations: {
        plantaire_gauche: [],
        plantaire_droit:  [],
        dorsal_gauche:    [],
        dorsal_droit:     [],
      },
    }
    const { scalars, rest } = splitBilanPayload(bilan)
    await api.updateBilan(bilan.id, { ...scalars, data: rest })
    bilans.value.push(bilan)
    currentBilanId.value = bilan.id
    return bilan
  }

  async function updateBilan(id, data) {
    const idx = bilans.value.findIndex(b => b.id === id)
    if (idx === -1) return
    const { scalars, rest } = splitBilanPayload(data)
    const payload = { ...scalars, ...(Object.keys(rest).length > 0 ? { data: rest } : {}) }
    const updated = await api.updateBilan(id, payload)
    bilans.value[idx] = { ...bilans.value[idx], ...updated }
  }

  async function updateCurrentBilan(data) {
    if (currentBilanId.value) await updateBilan(currentBilanId.value, data)
  }

  async function deleteBilan(id) {
    await api.deleteBilan(id)
    bilans.value = bilans.value.filter(b => b.id !== id)
  }

  function setCurrentBilan(id) { currentBilanId.value = id }

  async function addQuestionPersonnalisee(bilanId, question) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (bilan) {
      await updateBilan(bilanId, {
        questionsPersonnalisees: [
          ...bilan.questionsPersonnalisees,
          { id: generateId(), question, reponse: '' },
        ],
      })
    }
  }

  async function updateQuestionReponse(bilanId, questionId, reponse) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (bilan) {
      await updateBilan(bilanId, {
        questionsPersonnalisees: bilan.questionsPersonnalisees.map(q =>
          q.id === questionId ? { ...q, reponse } : q
        ),
      })
    }
  }

  async function removeQuestionPersonnalisee(bilanId, questionId) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (bilan) {
      await updateBilan(bilanId, {
        questionsPersonnalisees: bilan.questionsPersonnalisees.filter(q => q.id !== questionId),
      })
    }
  }

  async function addSchemaAnnotation(bilanId, annotation) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (bilan) {
      await updateBilan(bilanId, {
        schemaAnnotations: [
          ...(bilan.schemaAnnotations || []),
          { id: generateId(), commentaire: '', ...annotation },
        ],
      })
    }
  }

  async function updateSchemaAnnotation(bilanId, annotationId, data) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (bilan) {
      await updateBilan(bilanId, {
        schemaAnnotations: bilan.schemaAnnotations.map(a =>
          a.id === annotationId ? { ...a, ...data } : a
        ),
      })
    }
  }

  async function removeSchemaAnnotation(bilanId, annotationId) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (bilan) {
      await updateBilan(bilanId, {
        schemaAnnotations: bilan.schemaAnnotations.filter(a => a.id !== annotationId),
      })
    }
  }

  async function addPiedAnnotation(bilanId, view, annotation) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (!bilan) return
    const current = bilan.piedAnnotations?.[view] || []
    await updateBilan(bilanId, {
      piedAnnotations: {
        ...bilan.piedAnnotations,
        [view]: [...current, { id: generateId(), commentaire: '', severite: '', ...annotation }],
      },
    })
  }

  async function updatePiedAnnotation(bilanId, view, annotationId, data) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (!bilan) return
    const current = (bilan.piedAnnotations?.[view] || []).map(a =>
      a.id === annotationId ? { ...a, ...data } : a
    )
    await updateBilan(bilanId, {
      piedAnnotations: { ...bilan.piedAnnotations, [view]: current },
    })
  }

  async function removePiedAnnotation(bilanId, view, annotationId) {
    const bilan = bilans.value.find(b => b.id === bilanId)
    if (!bilan) return
    const current = (bilan.piedAnnotations?.[view] || []).filter(a => a.id !== annotationId)
    await updateBilan(bilanId, {
      piedAnnotations: { ...bilan.piedAnnotations, [view]: current },
    })
  }

  return {
    bilans, currentBilanId, autoSaveTimer, loading,
    currentBilan, bilansByPatient,
    loadBilans, createBilan, updateBilan, updateCurrentBilan, deleteBilan, setCurrentBilan,
    addQuestionPersonnalisee, updateQuestionReponse, removeQuestionPersonnalisee,
    addSchemaAnnotation, updateSchemaAnnotation, removeSchemaAnnotation,
    addPiedAnnotation, updatePiedAnnotation, removePiedAnnotation,
  }
})
