import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/api.js'
import { useAuthStore } from '@/store/auth.js'

export const FREE_MAX_PATIENTS = 10

export const usePatientStore = defineStore('patients', () => {
  const authStore = useAuthStore()

  const patients         = ref([])
  const currentPatientId = ref(null)
  const loading          = ref(false)

  const currentPatient = computed(() => patients.value.find(p => p.id === currentPatientId.value) || null)
  const sortedPatients = computed(() =>
    [...patients.value].sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`))
  )
  const count = computed(() => patients.value.length)

  async function loadPatients() {
    const uid = authStore.currentUser?.id
    if (!uid) { patients.value = []; return }
    loading.value = true
    try {
      patients.value = await api.listPatients()
    } finally {
      loading.value = false
    }
  }

  watch(() => authStore.currentUser?.id, async (newId) => {
    currentPatientId.value = null
    if (newId) await loadPatients()
    else patients.value = []
  }, { immediate: true })   // le store peut naître après la connexion (page ouverte directement)

  async function createPatient(data) {
    const patient = await api.createPatient({
      nom:             '',
      prenom:          '',
      dateNaissance:   '',
      taille:          '',
      poids:           '',
      medecinTraitant: '',
      telephone:       '',
      email:           '',
      adresse:         '',
      notesAdmin:      '',
      ...data,
    })
    patients.value.push(patient)
    return patient
  }

  async function updatePatient(id, data) {
    const idx = patients.value.findIndex(p => p.id === id)
    if (idx === -1) return
    const updated = await api.updatePatient(id, data)
    patients.value[idx] = updated
  }

  async function deletePatient(id) {
    await api.deletePatient(id)
    patients.value = patients.value.filter(p => p.id !== id)
  }

  function setCurrentPatient(id) {
    currentPatientId.value = id
  }

  return {
    patients, currentPatientId, currentPatient, sortedPatients, count, loading,
    loadPatients, createPatient, updatePatient, deletePatient, setCurrentPatient,
  }
})
