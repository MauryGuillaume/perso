<template>
  <div class="barometrie">
    <div class="section-grid">
      <div class="card">
        <h3 class="section-title">Analyse podo-barométrique</h3>
        <p class="section-desc">Importez une image de résultats Winpod ou saisissez les données manuellement.</p>

        <div class="import-zone" :class="{ 'has-image': bilan.barometrieImage }" @click="triggerUpload" @dragover.prevent @drop.prevent="onDrop">
          <div v-if="!bilan.barometrieImage" class="import-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="import-icon">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <div class="import-text">
              <strong>Glissez une image ici</strong>
              <span>ou cliquez pour choisir (PNG, JPG)</span>
            </div>
          </div>
          <div v-else class="image-preview">
            <img :src="bilan.barometrieImage" alt="Baromètrie" />
            <button class="remove-image" @click.stop="removeImage">×</button>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />

        <div class="form-group" style="margin-top: var(--space-lg);">
          <label class="form-label">Notes et interprétation</label>
          <textarea
            :value="bilan.barometrieNotes"
            @input="emit('update', { barometrieNotes: $event.target.value })"
            class="form-textarea"
            placeholder="Zones de surcharge plantaire, asymétries, remarques…"
            rows="4"
          />
        </div>
      </div>

      <!-- Manual data entry -->
      <div class="card">
        <h3 class="section-title">Données manuelles</h3>
        <div class="baro-grid">
          <div class="baro-foot">
            <div class="foot-label foot-label--left">Pied Gauche</div>
            <div class="pressure-zones">
              <div v-for="zone in zonesGauche" :key="zone.id" class="pressure-zone">
                <label class="zone-label">{{ zone.label }}</label>
                <div class="zone-input-row">
                  <input
                    type="number" min="0" max="100"
                    :value="getZoneValue('gauche', zone.id)"
                    @input="setZoneValue('gauche', zone.id, $event.target.value)"
                    class="form-input zone-input"
                    placeholder="—"
                  />
                  <span class="zone-unit">%</span>
                  <div class="pressure-bar-mini">
                    <div class="pressure-fill" :style="{ width: getZoneValue('gauche', zone.id) + '%', background: pressureColor(getZoneValue('gauche', zone.id)) }" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="baro-foot">
            <div class="foot-label foot-label--right">Pied Droit</div>
            <div class="pressure-zones">
              <div v-for="zone in zonesDroite" :key="zone.id" class="pressure-zone">
                <label class="zone-label">{{ zone.label }}</label>
                <div class="zone-input-row">
                  <input
                    type="number" min="0" max="100"
                    :value="getZoneValue('droit', zone.id)"
                    @input="setZoneValue('droit', zone.id, $event.target.value)"
                    class="form-input zone-input"
                    placeholder="—"
                  />
                  <span class="zone-unit">%</span>
                  <div class="pressure-bar-mini">
                    <div class="pressure-fill" :style="{ width: getZoneValue('droit', zone.id) + '%', background: pressureColor(getZoneValue('droit', zone.id)) }" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ bilan: Object })
const emit = defineEmits(['update'])
const fileInput = ref(null)

const ZONES = ['Talon', 'Médio-pied', 'Métatarses', 'Orteils']
const zonesGauche = ZONES.map((label, i) => ({ id: `g${i}`, label }))
const zonesDroite = ZONES.map((label, i) => ({ id: `d${i}`, label }))

const baroData = computed(() => props.bilan.barometrieData || {})

const getZoneValue = (side, id) => baroData.value[`${side}_${id}`] || 0
const setZoneValue = (side, id, val) => {
  const data = { ...baroData.value, [`${side}_${id}`]: Number(val) }
  emit('update', { barometrieData: data })
}

const pressureColor = (v) => {
  const n = Number(v)
  if (n < 25) return '#22c55e'
  if (n < 50) return '#84cc16'
  if (n < 75) return '#f59e0b'
  return '#ef4444'
}

const triggerUpload = () => fileInput.value?.click()

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => emit('update', { barometrieImage: ev.target.result })
  reader.readAsDataURL(file)
  e.target.value = ''
}

const onDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = (ev) => emit('update', { barometrieImage: ev.target.result })
  reader.readAsDataURL(file)
}

const removeImage = () => emit('update', { barometrieImage: null })
</script>

<style scoped>
.barometrie {}
.section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-sm); color: var(--color-primary); }
.section-desc { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-lg); }

.import-zone {
  border: 2px dashed var(--color-border); border-radius: var(--radius-lg);
  padding: var(--space-xl); cursor: pointer; transition: all var(--transition-base);
  text-align: center; background: var(--color-surface-alt);
}
.import-zone:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
.import-zone.has-image { padding: var(--space-sm); border-style: solid; border-color: var(--color-border); cursor: default; }
.import-icon { margin: 0 auto var(--space-md); color: var(--color-text-light); }
.import-text { display: flex; flex-direction: column; gap: 4px; }
.import-text strong { font-size: var(--text-sm); }
.import-text span { font-size: var(--text-xs); color: var(--color-text-muted); }

.image-preview { position: relative; }
.image-preview img { width: 100%; border-radius: var(--radius-md); max-height: 300px; object-fit: contain; }
.remove-image {
  position: absolute; top: 8px; right: 8px;
  background: rgba(0,0,0,.6); color: #fff;
  border: none; border-radius: 50%; width: 28px; height: 28px;
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background var(--transition-fast);
}
.remove-image:hover { background: rgba(0,0,0,.9); }

.baro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
.foot-label { font-size: var(--text-sm); font-weight: 700; margin-bottom: var(--space-md); text-align: center; padding: 4px; border-radius: var(--radius-md); }
.foot-label--left { background: #dbeafe; color: #1d4ed8; }
.foot-label--right { background: #dcfce7; color: #15803d; }
.pressure-zones { display: flex; flex-direction: column; gap: var(--space-sm); }
.pressure-zone { }
.zone-label { font-size: var(--text-xs); color: var(--color-text-muted); font-weight: 600; margin-bottom: 4px; display: block; }
.zone-input-row { display: flex; align-items: center; gap: 6px; }
.zone-input { width: 60px; flex-shrink: 0; padding: 6px 8px; font-size: var(--text-sm); }
.zone-unit { font-size: var(--text-xs); color: var(--color-text-muted); }
.pressure-bar-mini { flex: 1; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
.pressure-fill { height: 100%; border-radius: 3px; transition: width .3s ease, background .3s ease; }

@media (max-width: 900px) {
  .section-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .baro-grid { grid-template-columns: 1fr; }
}
</style>
