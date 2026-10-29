<template>
  <div class="agenda-page">

    <!-- ═══════════════════════════════════ HEADER ══════════════════════════════════ -->
    <div class="agenda-header">
      <div class="header-left">
        <h1 class="agenda-title">
          <span class="title-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          Agenda
        </h1>
      </div>

      <div class="header-center">
        <button class="nav-btn" @click="prevWeek" title="Semaine précédente">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="today-btn" @click="goToToday">Aujourd'hui</button>
        <button class="nav-btn" @click="nextWeek" title="Semaine suivante">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <span class="week-label">{{ weekLabel }}</span>
      </div>

      <div class="header-right">
        <button class="icon-btn" :class="{ active: showSettings }" @click="showSettings = !showSettings" title="Paramètres de l'agenda">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Paramètres
        </button>
        <button class="add-btn" @click="openNewAppt(null, null)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouveau RDV
        </button>
      </div>
    </div>

    <!-- ════════════════════════════════ SETTINGS PANEL ═════════════════════════════ -->
    <Transition name="slide-down">
      <div v-if="showSettings" class="settings-panel">
        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">Début journée</label>
            <div class="setting-control">
              <input type="number" v-model.number="settings.workStart" min="5" max="12" class="time-input" @change="saveSettings">
              <span class="setting-unit">h</span>
            </div>
          </div>
          <div class="setting-item">
            <label class="setting-label">Fin journée</label>
            <div class="setting-control">
              <input type="number" v-model.number="settings.workEnd" min="13" max="23" class="time-input" @change="saveSettings">
              <span class="setting-unit">h</span>
            </div>
          </div>
          <div class="setting-item">
            <label class="setting-label">Durée créneau</label>
            <select v-model.number="settings.slotMinutes" class="setting-select" @change="saveSettings">
              <option :value="15">15 min</option>
              <option :value="20">20 min</option>
              <option :value="30">30 min</option>
              <option :value="60">1 heure</option>
            </select>
          </div>
          <div class="setting-item">
            <label class="setting-label">Jours affichés</label>
            <div class="days-picker">
              <button
                v-for="d in DAY_DEFS"
                :key="d.val"
                class="day-pill"
                :class="{ active: settings.workDays.includes(d.val) }"
                @click="toggleDay(d.val)"
              >{{ d.short }}</button>
            </div>
          </div>
        </div>
        <button class="settings-close" @click="showSettings = false">Fermer</button>
      </div>
    </Transition>

    <!-- ═════════════════════════════════ CALENDAR ══════════════════════════════════ -->
    <div class="calendar-outer">
      <!-- Sticky column headers -->
      <div class="cal-head" :style="{ '--day-count': displayedDays.length }">
        <div class="time-corner"></div>
        <div
          v-for="day in displayedDays"
          :key="day.iso"
          class="day-header"
          :class="{ 'day-header--today': day.isToday }"
        >
          <span class="day-name">{{ day.dayName }}</span>
          <span class="day-num" :class="{ 'day-num--today': day.isToday }">{{ day.dayNum }}</span>
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="cal-body" ref="calBody" :style="{ '--day-count': displayedDays.length }">
        <!-- Time labels column -->
        <div class="time-col">
          <div
            v-for="hour in displayedHours"
            :key="hour"
            class="time-label"
            :style="{ height: HOUR_HEIGHT + 'px' }"
          >{{ pad(hour) }}:00</div>
        </div>

        <!-- Day columns -->
        <div
          v-for="day in displayedDays"
          :key="day.iso"
          class="day-col"
          :style="{ height: totalHeight + 'px' }"
          @click="onDayColClick(day, $event)"
        >
          <!-- Hour grid lines -->
          <div
            v-for="hour in displayedHours"
            :key="hour"
            class="hour-line"
            :style="{ top: getTopForMinutes((hour - settings.workStart) * 60) + 'px' }"
          ></div>
          <!-- Half-hour grid lines -->
          <div
            v-for="hour in displayedHours"
            :key="'h' + hour"
            class="half-line"
            :style="{ top: getTopForMinutes((hour - settings.workStart) * 60 + 30) + 'px' }"
          ></div>

          <!-- Current time indicator -->
          <div
            v-if="day.isToday && nowOffset >= 0 && nowOffset <= totalHeight"
            class="now-line"
            :style="{ top: nowOffset + 'px' }"
          ></div>

          <!-- Appointments -->
          <div
            v-for="appt in getApptsForDay(day.iso)"
            :key="appt.id"
            class="event-block"
            :style="getEventStyle(appt)"
            @click.stop="openEditModal(appt)"
            :title="`${appt.patientName} – ${appt.type}`"
          >
            <span class="event-time">{{ appt.startTime }}</span>
            <span class="event-name">{{ appt.patientName }}</span>
            <span class="event-type-tag">{{ appt.type }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════ APPOINTMENT MODAL ══════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showApptModal" class="modal-backdrop" @click.self="closeModal">
          <div class="modal" @click.stop>
            <div class="modal-header">
              <h2>{{ form.id ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous' }}</h2>
              <button class="modal-close" @click="closeModal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Patient *</label>
                <input
                  v-model="form.patientName"
                  placeholder="Nom et prénom du patient"
                  class="form-input"
                  ref="patientInput"
                  @keydown.enter.prevent="saveAppt"
                >
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Date *</label>
                  <input type="date" v-model="form.date" class="form-input">
                </div>
                <div class="form-group">
                  <label>Heure début *</label>
                  <input type="time" v-model="form.startTime" step="900" class="form-input">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Type de RDV</label>
                  <select v-model="form.type" class="form-input">
                    <option v-for="t in APPT_TYPES" :key="t.label" :value="t.label">{{ t.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Durée</label>
                  <select v-model.number="form.durationMinutes" class="form-input">
                    <option :value="15">15 min</option>
                    <option :value="20">20 min</option>
                    <option :value="30">30 min</option>
                    <option :value="45">45 min</option>
                    <option :value="60">1 h</option>
                    <option :value="90">1 h 30</option>
                    <option :value="120">2 h</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Notes</label>
                <textarea
                  v-model="form.notes"
                  rows="3"
                  placeholder="Notes optionnelles…"
                  class="form-input form-textarea"
                ></textarea>
              </div>

              <!-- Color picker by type (auto-applied but can override) -->
              <div class="type-colors">
                <span
                  v-for="t in APPT_TYPES"
                  :key="t.label"
                  class="type-chip"
                  :style="{ background: t.color + '22', color: t.color, borderColor: form.type === t.label ? t.color : 'transparent' }"
                  @click="form.type = t.label"
                >{{ t.label }}</span>
              </div>
            </div>

            <div class="modal-footer">
              <button v-if="form.id" class="btn btn--danger" @click="deleteAppt">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Supprimer
              </button>
              <div class="modal-footer-right">
                <button class="btn btn--ghost" @click="closeModal">Annuler</button>
                <button class="btn btn--primary" @click="saveAppt" :disabled="!form.patientName.trim()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════ DOCTOLIB MODAL ══════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDoctolibInfo" class="modal-backdrop" @click.self="showDoctolibInfo = false">
          <div class="modal modal--wide" @click.stop>
            <div class="modal-header">
              <h2>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2" style="flex-shrink:0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Importer depuis Doctolib
              </h2>
              <button class="modal-close" @click="showDoctolibInfo = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="modal-body info-body">
              <div class="info-note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Doctolib ne fournit <strong>pas d'API publique</strong> pour les praticiens. L'import se fait via export manuel ou fichier .ics.
              </div>

              <div class="info-steps">
                <div class="info-step">
                  <div class="step-num">1</div>
                  <div class="step-content">
                    <strong>Exporter depuis Doctolib Pro</strong>
                    <p>Connectez-vous à <em>pro.doctolib.fr</em> → votre agenda → menu <strong>« Exporter »</strong> → choisissez la plage de dates → téléchargez le fichier <code>.ics</code>.</p>
                  </div>
                </div>
                <div class="info-step">
                  <div class="step-num">2</div>
                  <div class="step-content">
                    <strong>Importer ici</strong>
                    <p>Cliquez sur <strong>« Choisir un fichier .ics »</strong> ci-dessous et sélectionnez le fichier exporté. Les rendez-vous s'ajouteront à votre agenda Movyx.</p>
                  </div>
                </div>
                <div class="info-step">
                  <div class="step-num">3</div>
                  <div class="step-content">
                    <strong>Synchronisation automatique (alternative)</strong>
                    <p>Copiez l'URL du calendrier Doctolib (iCal link) dans votre application calendrier système (Google Agenda, Outlook, Apple Calendrier) pour une synchronisation en temps réel. Movyx peut alors importer ce flux .ics régulièrement.</p>
                  </div>
                </div>
              </div>

              <div v-if="icsImportResult" class="ics-result" :class="icsImportResult.type">
                {{ icsImportResult.message }}
              </div>
            </div>

            <div class="modal-footer">
              <a href="https://pro.doctolib.fr" target="_blank" rel="noopener noreferrer" class="btn btn--outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Ouvrir Doctolib Pro
              </a>
              <div class="modal-footer-right">
                <label class="btn btn--primary file-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Choisir un fichier .ics
                  <input type="file" accept=".ics" @change="importICS" hidden>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { api } from '@/api.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64 // px per hour

const DAY_DEFS = [
  { val: 1, short: 'Lu', long: 'Lun' },
  { val: 2, short: 'Ma', long: 'Mar' },
  { val: 3, short: 'Me', long: 'Mer' },
  { val: 4, short: 'Je', long: 'Jeu' },
  { val: 5, short: 'Ve', long: 'Ven' },
  { val: 6, short: 'Sa', long: 'Sam' },
  { val: 0, short: 'Di', long: 'Dim' },
]

const DAY_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MONTH_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

const APPT_TYPES = [
  { label: 'Bilan',         color: '#2B6CB0' },
  { label: 'Séance',        color: '#52B848' },
  { label: 'Consultation',  color: '#d97706' },
  { label: 'Urgence',       color: '#dc2626' },
  { label: 'Orthèse',       color: '#7c3aed' },
  { label: 'Suivi',         color: '#0891b2' },
  { label: 'Autre',         color: '#6b7280' },
]

function typeColor(label) {
  return APPT_TYPES.find(t => t.label === label)?.color ?? '#6b7280'
}

// ─── State ─────────────────────────────────────────────────────────────────────
const appointments = ref([])
const settings = ref({ workStart: 8, workEnd: 19, slotMinutes: 30, workDays: [1,2,3,4,5,6] })
const currentWeekMonday = ref(getMonday(new Date()))

const showSettings    = ref(false)
const showApptModal   = ref(false)
const showDoctolibInfo = ref(false)
const icsImportResult = ref(null)
const calBody = ref(null)
const patientInput = ref(null)
const nowOffset = ref(0)
let nowTimer = null

const EMPTY_FORM = () => ({
  id: null,
  patientName: '',
  date: toISO(new Date()),
  startTime: '09:00',
  durationMinutes: 30,
  type: 'Consultation',
  notes: '',
})
const form = ref(EMPTY_FORM())

// ─── Helpers ───────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }

function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

function getMonday(d) {
  const day = new Date(d)
  const dow = day.getDay()
  // Shift to Monday (0=Sun -> -6, 1=Mon -> 0, ...)
  const diff = (dow === 0) ? -6 : 1 - dow
  day.setDate(day.getDate() + diff)
  day.setHours(0,0,0,0)
  return day
}

function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function minutesFromTimeStr(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function timeStrFromMinutes(m) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Computed ──────────────────────────────────────────────────────────────────
const displayedDays = computed(() => {
  const today = toISO(new Date())
  const sorted = [...settings.value.workDays].sort((a, b) => {
    // Sort Mon(1)-Sat(6)-Sun(0)
    const order = [1,2,3,4,5,6,0]
    return order.indexOf(a) - order.indexOf(b)
  })

  // Collect the days within the current week that match workDays
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = addDays(currentWeekMonday.value, i)
    const dow = d.getDay()
    if (sorted.includes(dow)) {
      const iso = toISO(d)
      result.push({
        iso,
        isToday: iso === today,
        dayName: DAY_DEFS.find(x => x.val === dow)?.long || '',
        dayNum: d.getDate(),
        month: MONTH_FR[d.getMonth()],
      })
    }
  }
  return result
})

const weekLabel = computed(() => {
  const days = displayedDays.value
  if (!days.length) return ''
  const first = days[0]
  const last  = days[days.length - 1]
  // Same month?
  const fd = new Date(first.iso), ld = new Date(last.iso)
  if (fd.getMonth() === ld.getMonth()) {
    return `${first.dayNum} – ${last.dayNum} ${first.month} ${fd.getFullYear()}`
  }
  return `${first.dayNum} ${first.month} – ${last.dayNum} ${last.month} ${ld.getFullYear()}`
})

const displayedHours = computed(() => {
  const arr = []
  for (let h = settings.value.workStart; h < settings.value.workEnd; h++) arr.push(h)
  return arr
})

const totalHeight = computed(() => (settings.value.workEnd - settings.value.workStart) * HOUR_HEIGHT)

// ─── Position helpers ──────────────────────────────────────────────────────────
function getTopForMinutes(offsetMinutes) {
  return (offsetMinutes / 60) * HOUR_HEIGHT
}

function getEventStyle(appt) {
  const startMin = minutesFromTimeStr(appt.startTime)
  const offset   = startMin - settings.value.workStart * 60
  const top      = getTopForMinutes(Math.max(0, offset))
  const height   = Math.max(20, getTopForMinutes(appt.durationMinutes))
  const color    = typeColor(appt.type)
  return {
    top: top + 'px',
    height: height + 'px',
    background: color + '22',
    borderLeftColor: color,
    color,
  }
}

function getApptsForDay(iso) {
  return appointments.value.filter(a => a.date === iso)
}

// ─── Now line ──────────────────────────────────────────────────────────────────
function updateNowLine() {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const offset = minutes - settings.value.workStart * 60
  nowOffset.value = getTopForMinutes(offset)
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function prevWeek() { currentWeekMonday.value = addDays(currentWeekMonday.value, -7) }
function nextWeek() { currentWeekMonday.value = addDays(currentWeekMonday.value,  7) }
function goToToday() { currentWeekMonday.value = getMonday(new Date()) }

// ─── Settings ─────────────────────────────────────────────────────────────────
function toggleDay(val) {
  const idx = settings.value.workDays.indexOf(val)
  if (idx === -1) {
    if (settings.value.workDays.length < 7) settings.value.workDays.push(val)
  } else {
    if (settings.value.workDays.length > 1) settings.value.workDays.splice(idx, 1)
  }
  saveSettings()
}

async function saveSettings() {
  settings.value = await api.updateAgendaSettings(settings.value)
}

// ─── Click on day column ───────────────────────────────────────────────────────
function onDayColClick(day, e) {
  const col = e.currentTarget
  const rect = col.getBoundingClientRect()
  const y = e.clientY - rect.top + col.scrollTop
  const minutesFromTop = (y / HOUR_HEIGHT) * 60
  const totalMinutes = settings.value.workStart * 60 + minutesFromTop
  // Round to nearest slot
  const slot = settings.value.slotMinutes
  const rounded = Math.round(totalMinutes / slot) * slot
  const startTime = timeStrFromMinutes(Math.min(rounded, (settings.value.workEnd * 60) - slot))
  openNewAppt(day.iso, startTime)
}

// ─── Appointment modal ─────────────────────────────────────────────────────────
function openNewAppt(date, startTime) {
  form.value = {
    ...EMPTY_FORM(),
    date: date || toISO(new Date()),
    startTime: startTime || '09:00',
    durationMinutes: settings.value.slotMinutes,
  }
  showApptModal.value = true
  nextTick(() => patientInput.value?.focus())
}

function openEditModal(appt) {
  form.value = { ...appt }
  showApptModal.value = true
  nextTick(() => patientInput.value?.focus())
}

function closeModal() {
  showApptModal.value = false
  form.value = EMPTY_FORM()
}

async function saveAppt() {
  if (!form.value.patientName.trim()) return
  const { id, ...data } = form.value
  if (id) {
    const idx = appointments.value.findIndex(a => a.id === id)
    const updated = await api.updateAppointment(id, data)
    if (idx !== -1) appointments.value[idx] = updated
  } else {
    const created = await api.createAppointment(data)
    appointments.value.push(created)
  }
  closeModal()
}

async function deleteAppt() {
  await api.deleteAppointment(form.value.id)
  appointments.value = appointments.value.filter(a => a.id !== form.value.id)
  closeModal()
}

// ─── ICS Import ───────────────────────────────────────────────────────────────
function importICS(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    const text = evt.target.result
    const imported = parseICS(text)
    if (imported.length === 0) {
      icsImportResult.value = { type: 'error', message: 'Aucun événement trouvé dans le fichier .ics.' }
    } else {
      for (const importedAppt of imported) {
        const { id, ...data } = importedAppt
        const created = await api.createAppointment(data)
        appointments.value.push(created)
      }
      icsImportResult.value = { type: 'success', message: `${imported.length} rendez-vous importés avec succès.` }
    }
    e.target.value = ''
  }
  reader.readAsText(file)
}

function parseICS(text) {
  const events = []
  const vevents = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []

  for (const ve of vevents) {
    const getVal = (key) => {
      const m = ve.match(new RegExp(`${key}[^:]*:([^\r\n]+)`))
      return m?.[1]?.trim() ?? null
    }

    const dtstart = getVal('DTSTART')
    const dtend   = getVal('DTEND')
    const summary = getVal('SUMMARY')
    const desc    = getVal('DESCRIPTION')

    if (!dtstart || !summary) continue

    const parseDateTime = (s) => {
      // Handle YYYYMMDD and YYYYMMDDTHHMMSS[Z]
      const clean = s.replace(/Z$/, '')
      if (clean.length === 8) {
        return { date: `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`, time: '09:00' }
      }
      const date = `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`
      const time = `${clean.slice(9,11)}:${clean.slice(11,13)}`
      return { date, time }
    }

    const start = parseDateTime(dtstart)
    let durationMinutes = 30
    if (dtend) {
      const end = parseDateTime(dtend)
      durationMinutes = minutesFromTimeStr(end.time) - minutesFromTimeStr(start.time)
      if (durationMinutes <= 0) durationMinutes = 30
    }

    events.push({
      id: nanoid(),
      date: start.date,
      startTime: start.time,
      durationMinutes,
      patientName: summary,
      type: 'Autre',
      notes: desc || '',
    })
  }
  return events
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  const [loadedSettings, loadedAppointments] = await Promise.all([
    api.getAgendaSettings(),
    api.listAppointments(),
  ])
  settings.value = loadedSettings
  appointments.value = loadedAppointments
  updateNowLine()
  nowTimer = setInterval(updateNowLine, 60000)
  // Scroll to now
  nextTick(() => {
    if (calBody.value) {
      const target = Math.max(0, nowOffset.value - 100)
      calBody.value.scrollTop = target
    }
  })
})

onUnmounted(() => clearInterval(nowTimer))

watch(() => settings.value.workStart, updateNowLine)
watch(() => settings.value.workEnd, updateNowLine)
</script>

<style scoped>
/* ═══════════════════════ PAGE LAYOUT ═══════════════════════════════════════ */
.agenda-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--header-height) - var(--banner-h, 0px) - 2 * var(--space-lg));
  gap: var(--space-sm);
  min-height: 0;
}

/* ═══════════════════════ HEADER ════════════════════════════════════════════ */
.agenda-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.header-left { display: flex; align-items: center; }
.header-center { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; }
.header-right { display: flex; align-items: center; gap: 8px; }

.agenda-title {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--text-lg); font-weight: 700; color: var(--color-text);
  margin: 0;
}
.title-icon { display: flex; align-items: center; color: var(--color-primary); }

.nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-surface);
  cursor: pointer; color: var(--color-text); transition: all var(--transition-fast);
}
.nav-btn:hover { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }

.today-btn {
  padding: 6px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-surface);
  font-size: var(--text-sm); font-weight: 600; color: var(--color-text);
  cursor: pointer; transition: all var(--transition-fast);
}
.today-btn:hover { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }

.week-label {
  font-size: var(--text-sm); font-weight: 600; color: var(--color-text);
  white-space: nowrap; margin-left: 6px;
}

.icon-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-surface);
  font-size: var(--text-sm); font-weight: 500; color: var(--color-text-muted);
  cursor: pointer; transition: all var(--transition-fast);
}
.icon-btn:hover, .icon-btn.active {
  background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary);
}

.doctolib-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: var(--radius-md);
  border: 1px solid #0891b2; background: #e0f7fa;
  font-size: var(--text-sm); font-weight: 600; color: #0891b2;
  cursor: pointer; transition: all var(--transition-fast);
}
.doctolib-btn:hover { background: #0891b2; color: white; }

.add-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: var(--radius-md);
  border: none; background: var(--color-primary);
  font-size: var(--text-sm); font-weight: 600; color: white;
  cursor: pointer; transition: opacity var(--transition-fast);
}
.add-btn:hover { opacity: .88; }

/* ═══════════════════════ SETTINGS PANEL ════════════════════════════════════ */
.settings-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  flex-shrink: 0;
}

.settings-grid {
  display: flex; flex-wrap: wrap; gap: var(--space-md) var(--space-xl);
  align-items: flex-end;
}

.setting-item { display: flex; flex-direction: column; gap: 4px; }
.setting-label { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; }
.setting-control { display: flex; align-items: center; gap: 6px; }
.time-input { width: 60px; padding: 5px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--color-bg); color: var(--color-text); }
.setting-unit { font-size: var(--text-sm); color: var(--color-text-muted); }
.setting-select { padding: 5px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--color-bg); color: var(--color-text); }

.days-picker { display: flex; gap: 4px; }
.day-pill {
  padding: 4px 10px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: var(--color-bg);
  font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted);
  cursor: pointer; transition: all var(--transition-fast);
}
.day-pill.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }

.settings-close {
  margin-top: var(--space-sm); padding: 4px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: transparent; cursor: pointer;
  font-size: var(--text-sm); color: var(--color-text-muted);
}
.settings-close:hover { background: var(--color-bg); }

/* ═══════════════════════ CALENDAR ══════════════════════════════════════════ */
.calendar-outer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

/* Sticky header row */
.cal-head {
  display: grid;
  grid-template-columns: 52px repeat(var(--day-count, 6), 1fr);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.time-corner {
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
}

.day-header {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 4px; border-left: 1px solid var(--color-border);
  user-select: none;
}
.day-name { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; }
.day-num { font-size: 18px; font-weight: 700; color: var(--color-text); line-height: 1.2; }
.day-num--today {
  background: var(--color-primary);
  color: white;
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.day-header--today .day-name { color: var(--color-primary); }

/* Scrollable body */
.cal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: 52px repeat(var(--day-count, 6), 1fr);
  align-items: start;
}

.time-col {
  border-right: 1px solid var(--color-border);
  position: sticky;
  left: 0;
  background: var(--color-surface);
  z-index: 5;
}

.time-label {
  display: flex; align-items: flex-start; justify-content: flex-end;
  padding: 0 8px 0 4px;
  padding-top: 2px;
  font-size: 10px; font-weight: 600;
  color: var(--color-text-muted);
  box-sizing: border-box;
  border-top: 1px solid var(--color-border);
}

.day-col {
  position: relative;
  border-left: 1px solid var(--color-border);
  cursor: crosshair;
}

.hour-line {
  position: absolute; left: 0; right: 0; height: 1px;
  background: var(--color-border); pointer-events: none;
}
.half-line {
  position: absolute; left: 0; right: 0; height: 1px;
  background: var(--color-border); opacity: .4; pointer-events: none;
  border-top: 1px dashed var(--color-border);
}

.now-line {
  position: absolute; left: 0; right: 0; height: 2px;
  background: #dc2626; z-index: 4; pointer-events: none;
}
.now-line::before {
  content: ''; position: absolute; left: -4px; top: -4px;
  width: 10px; height: 10px; border-radius: 50%; background: #dc2626;
}

/* Events */
.event-block {
  position: absolute; left: 3px; right: 3px;
  border-radius: 5px; padding: 3px 6px;
  border-left: 3px solid;
  cursor: pointer; z-index: 3;
  display: flex; flex-direction: column; gap: 1px;
  transition: filter var(--transition-fast);
  overflow: hidden;
  box-sizing: border-box;
}
.event-block:hover { filter: brightness(.9); }

.event-time { font-size: 10px; font-weight: 700; opacity: .8; }
.event-name { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event-type-tag { font-size: 10px; opacity: .8; }

/* ═══════════════════════ MODALS ════════════════════════════════════════════ */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: var(--space-lg);
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  width: 100%; max-width: 480px;
  box-shadow: var(--shadow-xl);
  display: flex; flex-direction: column;
  max-height: 90vh; overflow: hidden;
}
.modal--wide { max-width: 580px; }

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-lg) var(--space-lg) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.modal-header h2 {
  margin: 0; font-size: var(--text-lg); font-weight: 700; color: var(--color-text);
  display: flex; align-items: center; gap: 8px;
}
.modal-close {
  border: none; background: none; cursor: pointer; color: var(--color-text-muted);
  padding: 4px; border-radius: var(--radius-sm);
  display: flex; align-items: center; transition: color var(--transition-fast);
}
.modal-close:hover { color: var(--color-text); background: var(--color-bg); }

.modal-body { padding: var(--space-lg); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-md); }
.modal-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: var(--space-sm);
}
.modal-footer-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.form-group label { font-size: var(--text-xs); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .04em; }
.form-row { display: flex; gap: var(--space-md); }

.form-input {
  padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: var(--text-sm); background: var(--color-bg); color: var(--color-text);
  transition: border-color var(--transition-fast);
  width: 100%; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: var(--color-primary); }
.form-textarea { resize: vertical; min-height: 72px; }

.type-colors { display: flex; flex-wrap: wrap; gap: 6px; }
.type-chip {
  padding: 3px 10px; border-radius: var(--radius-full);
  font-size: 11px; font-weight: 600; cursor: pointer;
  border: 1.5px solid transparent; transition: all var(--transition-fast);
  user-select: none;
}
.type-chip:hover { opacity: .8; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-md); border: none;
  font-size: var(--text-sm); font-weight: 600; cursor: pointer;
  transition: all var(--transition-fast);
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn--primary { background: var(--color-primary); color: white; }
.btn--primary:hover:not(:disabled) { opacity: .88; }
.btn--ghost { background: transparent; color: var(--color-text-muted); border: 1px solid var(--color-border); }
.btn--ghost:hover { background: var(--color-bg); }
.btn--danger { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
.btn--danger:hover { background: #dc2626; color: white; }
.btn--outline { background: transparent; color: #0891b2; border: 1px solid #0891b2; }
.btn--outline:hover { background: #e0f7fa; }

.file-label { cursor: pointer; }
.file-label:hover { opacity: .9; }

/* Info modal */
.info-body { gap: var(--space-lg); }

.info-note {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 14px; border-radius: var(--radius-md);
  background: #fffbeb; border: 1px solid #fde68a;
  font-size: var(--text-sm); line-height: 1.5; color: #92400e;
}

.info-steps { display: flex; flex-direction: column; gap: var(--space-md); }
.info-step { display: flex; gap: var(--space-md); align-items: flex-start; }
.step-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--color-primary); color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; flex-shrink: 0;
  margin-top: 2px;
}
.step-content { flex: 1; }
.step-content strong { font-size: var(--text-sm); color: var(--color-text); display: block; margin-bottom: 3px; }
.step-content p { font-size: var(--text-sm); color: var(--color-text-muted); margin: 0; line-height: 1.5; }
.step-content code { font-family: monospace; background: var(--color-bg); padding: 1px 5px; border-radius: 3px; font-size: 12px; }

.ics-result {
  padding: 10px 14px; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: 500;
}
.ics-result.success { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.ics-result.error   { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

/* ═══════════════════════ TRANSITIONS ═══════════════════════════════════════ */
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ═══════════════════════ RESPONSIVE ════════════════════════════════════════ */
@media (max-width: 900px) {
  .agenda-header { gap: var(--space-sm); }
  .header-left .agenda-title span:last-child { display: none; }
  .icon-btn span:last-child { display: none; }
  .week-label { display: none; }
  .add-btn span:last-child { display: none; }
}

@media (max-width: 640px) {
  .header-center { gap: 4px; }
  .doctolib-btn span:last-child { display: none; }
}
</style>
