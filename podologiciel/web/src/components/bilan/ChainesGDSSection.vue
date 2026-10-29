<template>
  <div class="chaines-gds">
    <div class="section-grid">
      <div class="card">
        <h3 class="section-title">Chaînes musculaires GDS</h3>
        <p class="section-desc">Sélectionnez les chaînes musculaires impliquées (sélection multiple possible).</p>

        <div class="chains-grid">
          <div
            v-for="chain in chainesGDS"
            :key="chain.id"
            class="chain-card"
            :class="{ 'chain-card--selected': isSelected(chain.id), [`chain-card--${chain.color}`]: true }"
            @click="toggleChain(chain.id)"
          >
            <div class="chain-header">
              <span class="chain-abbr">{{ chain.abbr }}</span>
              <span v-if="isSelected(chain.id)" class="chain-check">✓</span>
            </div>
            <div class="chain-name">{{ chain.name }}</div>
            <div class="chain-desc">{{ chain.description }}</div>
            <div class="chain-muscles">{{ chain.muscles }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="section-title">Résumé des chaînes sélectionnées</h3>
        <div v-if="selectedChains.length" class="selected-summary">
          <div v-for="chain in selectedChains" :key="chain.id" class="summary-item" :class="`summary-item--${chain.color}`">
            <div class="si-abbr">{{ chain.abbr }}</div>
            <div class="si-info">
              <div class="si-name">{{ chain.name }}</div>
              <div class="si-muscles">{{ chain.muscles }}</div>
            </div>
          </div>

          <div class="form-group" style="margin-top: var(--space-lg);">
            <label class="form-label">Notes sur les chaînes sélectionnées</label>
            <textarea
              :value="bilan.chainesNotes"
              @input="emit('update', { chainesNotes: $event.target.value })"
              class="form-textarea"
              placeholder="Observations cliniques sur les chaînes identifiées…"
              rows="4"
            />
          </div>
        </div>
        <div v-else class="empty-chains">
          <div class="empty-icon">🔗</div>
          <p>Aucune chaîne sélectionnée</p>
          <p class="empty-sub">Cliquez sur les chaînes dans le panneau de gauche.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useBilanStore } from '@/store/bilans.js'

const props = defineProps({ bilan: Object })
const emit = defineEmits(['update'])
const bilanStore = useBilanStore()

const chainesGDS = [
  {
    id: 'PA', abbr: 'PA', name: 'Chaîne postérieure du bras',
    description: 'Extension du membre supérieur',
    muscles: 'Trapèze, deltoïde post., triceps brachial',
    color: 'red'
  },
  {
    id: 'AM', abbr: 'AM', name: 'Chaîne antérieure du membre sup.',
    description: 'Flexion du membre supérieur',
    muscles: 'Pectoral, biceps brachial, fléchisseurs',
    color: 'blue'
  },
  {
    id: 'PL', abbr: 'PL', name: 'Chaîne postéro-latérale',
    description: 'Extension et rotation externe',
    muscles: 'Ischio-jambiers lat., fessier moyen',
    color: 'green'
  },
  {
    id: 'AM2', abbr: 'AM', name: 'Chaîne antéro-médiale',
    description: 'Flexion et rotation interne',
    muscles: 'Psoas-iliaque, adducteurs, TFL',
    color: 'orange'
  },
  {
    id: 'PP', abbr: 'PP', name: 'Chaîne postérieure du plan profond',
    description: 'Stabilisation vertébrale',
    muscles: 'Multifides, semi-épineux, rotateurs',
    color: 'purple'
  },
  {
    id: 'PA2', abbr: 'PA', name: 'Chaîne antérieure plan profond',
    description: 'Flexion rachidienne profonde',
    muscles: 'Psoas, ilio-psoas, scalènes',
    color: 'pink'
  },
  {
    id: 'PIE', abbr: 'PIE', name: 'Chaîne de redressement',
    description: 'Érection du rachis',
    muscles: 'Sacro-spinaux, érecteurs du rachis',
    color: 'yellow'
  },
  {
    id: 'PAS', abbr: 'PAS', name: 'Chaîne postéro-antérieure sup.',
    description: 'Extension cervicale',
    muscles: 'Sous-occipitaux, trapèze sup.',
    color: 'teal'
  }
]

const isSelected = (id) => props.bilan.chainesGDS?.includes(id)

const toggleChain = (id) => {
  const current = props.bilan.chainesGDS || []
  const updated = isSelected(id)
    ? current.filter(c => c !== id)
    : [...current, id]
  emit('update', { chainesGDS: updated })
}

const selectedChains = computed(() =>
  chainesGDS.filter(c => isSelected(c.id))
)
</script>

<style scoped>
.chaines-gds {}
.section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-sm); color: var(--color-primary); }
.section-desc { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: var(--space-lg); }

.chains-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
.chain-card {
  padding: var(--space-md); border-radius: var(--radius-md);
  border: 2px solid var(--color-border); cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-surface-alt);
}
.chain-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.chain-card--selected { border-width: 2px; }
.chain-card--red.chain-card--selected { border-color: #ef4444; background: #fff0f0; }
.chain-card--blue.chain-card--selected { border-color: #3b82f6; background: #eff6ff; }
.chain-card--green.chain-card--selected { border-color: #22c55e; background: #f0fdf4; }
.chain-card--orange.chain-card--selected { border-color: #f97316; background: #fff7ed; }
.chain-card--purple.chain-card--selected { border-color: #a855f7; background: #faf5ff; }
.chain-card--pink.chain-card--selected { border-color: #ec4899; background: #fdf2f8; }
.chain-card--yellow.chain-card--selected { border-color: #eab308; background: #fefce8; }
.chain-card--teal.chain-card--selected { border-color: #14b8a6; background: #f0fdfa; }

.chain-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.chain-abbr { font-size: var(--text-xs); font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--color-primary); background: var(--color-primary-light); padding: 2px 6px; border-radius: var(--radius-sm); }
.chain-check { color: var(--color-success); font-weight: 700; }
.chain-name { font-size: var(--text-xs); font-weight: 700; margin-bottom: 4px; }
.chain-desc { font-size: 11px; color: var(--color-text-muted); margin-bottom: 4px; }
.chain-muscles { font-size: 10px; color: var(--color-text-light); font-style: italic; }

.selected-summary { display: flex; flex-direction: column; gap: var(--space-sm); }
.summary-item {
  display: flex; align-items: flex-start; gap: var(--space-md);
  padding: var(--space-md); border-radius: var(--radius-md);
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
}
.si-abbr { font-weight: 800; font-size: var(--text-sm); color: var(--color-primary); min-width: 36px; }
.si-name { font-size: var(--text-sm); font-weight: 600; }
.si-muscles { font-size: var(--text-xs); color: var(--color-text-muted); }

.empty-chains { text-align: center; padding: var(--space-2xl); color: var(--color-text-muted); }
.empty-icon { font-size: 40px; margin-bottom: var(--space-md); }
.empty-sub { font-size: var(--text-sm); margin-top: 4px; }

@media (max-width: 900px) {
  .section-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .chains-grid { grid-template-columns: 1fr; }
}
</style>
