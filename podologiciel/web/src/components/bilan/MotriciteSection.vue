<template>
  <div class="motricite">
    <div class="section-grid">
      <div class="card">
        <h3 class="section-title">Préférences motrices</h3>
        <div class="motricite-grid">

          <div class="pref-group">
            <label class="form-label">Latéralité</label>
            <div class="radio-group">
              <label v-for="opt in ['Droitier', 'Gaucher', 'Ambidextre']" :key="opt" class="radio-label">
                <input type="radio" :value="opt" :checked="bilan.lateralite === opt"
                  @change="emit('update', { lateralite: opt })" />
                <span class="radio-custom" />
                {{ opt }}
              </label>
            </div>
          </div>

          <div class="pref-group">
            <label class="form-label">Jambe motrice (appel)</label>
            <div class="radio-group">
              <label v-for="opt in ['Droite', 'Gauche']" :key="opt" class="radio-label">
                <input type="radio" :value="opt" :checked="bilan.jambemotrice === opt"
                  @change="emit('update', { jambemotrice: opt })" />
                <span class="radio-custom" />
                {{ opt }}
              </label>
            </div>
          </div>

          <div class="pref-group">
            <label class="form-label">Œil moteur (directeur)</label>
            <div class="radio-group">
              <label v-for="opt in ['Droit', 'Gauche']" :key="opt" class="radio-label">
                <input type="radio" :value="opt" :checked="bilan.oeilMoteur === opt"
                  @change="emit('update', { oeilMoteur: opt })" />
                <span class="radio-custom" />
                {{ opt }}
              </label>
            </div>
          </div>

          <div class="pref-group">
            <label class="form-label">Point mobile (référence)</label>
            <div class="radio-group">
              <label v-for="opt in ['Droit', 'Gauche', 'Bilatéral']" :key="opt" class="radio-label">
                <input type="radio" :value="opt" :checked="bilan.pointMobile === opt"
                  @change="emit('update', { pointMobile: opt })" />
                <span class="radio-custom" />
                {{ opt }}
              </label>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-top: var(--space-lg);">
          <label class="form-label">Notes motrices complémentaires</label>
          <textarea
            :value="bilan.notesMotrices"
            @input="emit('update', { notesMotrices: $event.target.value })"
            class="form-textarea"
            placeholder="Observations sur les préférences motrices, compensations…"
            rows="4"
          />
        </div>
      </div>

      <!-- Visual summary -->
      <div class="card">
        <h3 class="section-title">Récapitulatif latéralité</h3>
        <div class="laterality-visual">
          <div class="lat-figure">
            <div class="lat-row">
              <div class="lat-icon" :class="{ active: bilan.oeilMoteur === 'Gauche' }">
                <span class="lat-icon-inner">👁</span>
                <span class="lat-tag">Œil G</span>
              </div>
              <div class="lat-center-label">Œil moteur</div>
              <div class="lat-icon" :class="{ active: bilan.oeilMoteur === 'Droit' }">
                <span class="lat-icon-inner">👁</span>
                <span class="lat-tag">Œil D</span>
              </div>
            </div>
            <hr class="divider" />
            <div class="lat-row">
              <div class="lat-icon" :class="{ active: bilan.lateralite === 'Gaucher' }">
                <span class="lat-icon-inner">✋</span>
                <span class="lat-tag">Main G</span>
              </div>
              <div class="lat-center-label">Latéralité</div>
              <div class="lat-icon" :class="{ active: bilan.lateralite === 'Droitier' }">
                <span class="lat-icon-inner">✋</span>
                <span class="lat-tag">Main D</span>
              </div>
            </div>
            <hr class="divider" />
            <div class="lat-row">
              <div class="lat-icon" :class="{ active: bilan.jambemotrice === 'Gauche' }">
                <span class="lat-icon-inner">🦵</span>
                <span class="lat-tag">Jambe G</span>
              </div>
              <div class="lat-center-label">Jambe motrice</div>
              <div class="lat-icon" :class="{ active: bilan.jambemotrice === 'Droite' }">
                <span class="lat-icon-inner">🦵</span>
                <span class="lat-tag">Jambe D</span>
              </div>
            </div>
          </div>

          <div class="homogeneity-badge" :class="homogeneityClass">
            <span class="h-label">Latéralité :</span>
            <span class="h-value">{{ homogeneityLabel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ bilan: Object })
const emit = defineEmits(['update'])

const homogeneityLabel = computed(() => {
  const { lateralite, jambemotrice, oeilMoteur } = props.bilan
  const mainD = lateralite === 'Droitier'
  const jambeD = jambemotrice === 'Droite'
  const oeilD = oeilMoteur === 'Droit'
  if (mainD && jambeD && oeilD) return 'Homogène droite'
  if (!mainD && !jambeD && !oeilD) return 'Homogène gauche'
  return 'Hétérogène (croisée)'
})
const homogeneityClass = computed(() => {
  const label = homogeneityLabel.value
  if (label.includes('droite')) return 'h-right'
  if (label.includes('gauche')) return 'h-left'
  return 'h-cross'
})
</script>

<style scoped>
.motricite {}
.section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-lg); color: var(--color-primary); }
.motricite-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
.pref-group { }
.radio-group { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.radio-label { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: var(--text-sm); font-weight: 500; }
.radio-label input { display: none; }
.radio-custom {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--color-border); flex-shrink: 0;
  transition: all var(--transition-fast); position: relative;
}
.radio-label input:checked + .radio-custom {
  border-color: var(--color-primary); background: var(--color-primary);
  box-shadow: inset 0 0 0 3px var(--color-surface);
}

/* Laterality visual */
.laterality-visual { }
.lat-figure { background: var(--color-surface-alt); border-radius: var(--radius-lg); padding: var(--space-lg); border: 1px solid var(--color-border); }
.lat-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm) 0; }
.lat-center-label { font-size: var(--text-xs); color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.lat-icon {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px; border-radius: var(--radius-md); border: 2px solid transparent;
  transition: all var(--transition-fast); min-width: 60px;
}
.lat-icon.active { background: var(--color-primary-light); border-color: var(--color-primary); }
.lat-icon-inner { font-size: 24px; }
.lat-tag { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); }
.lat-icon.active .lat-tag { color: var(--color-primary); }

.homogeneity-badge {
  display: flex; align-items: center; gap: 8px;
  margin-top: var(--space-md); padding: var(--space-md);
  border-radius: var(--radius-md); font-size: var(--text-sm);
}
.h-label { font-weight: 500; color: var(--color-text-muted); }
.h-value { font-weight: 700; }
.h-right { background: #dcfce7; }
.h-right .h-value { color: #15803d; }
.h-left { background: #dbeafe; }
.h-left .h-value { color: #1d4ed8; }
.h-cross { background: #fef3c7; }
.h-cross .h-value { color: #92400e; }

@media (max-width: 900px) {
  .section-grid { grid-template-columns: 1fr; }
  .motricite-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .motricite-grid { grid-template-columns: 1fr; }
}
</style>
