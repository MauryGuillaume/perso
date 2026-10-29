<template>
  <div v-if="fields && fields.length" class="custom-fields">
    <div class="custom-fields-title">Champs personnalisés</div>
    <div class="custom-fields-grid">
      <div
        v-for="f in fields"
        :key="f.id"
        class="custom-field"
        :class="['custom-field--' + f.type, { wide: ['textarea','checkboxes'].includes(f.type) }]"
      >
        <label class="form-label">
          {{ f.label }}
          <span v-if="f.required" class="required-star">*</span>
        </label>

        <!-- text -->
        <input
          v-if="f.type === 'text'"
          type="text"
          class="form-input"
          :value="getValue(f.id)"
          @input="setValue(f.id, $event.target.value)"
          :placeholder="f.placeholder || f.label"
        />

        <!-- textarea -->
        <textarea
          v-else-if="f.type === 'textarea'"
          class="form-input"
          rows="4"
          :value="getValue(f.id)"
          @input="setValue(f.id, $event.target.value)"
          :placeholder="f.placeholder || f.label"
        />

        <!-- number -->
        <input
          v-else-if="f.type === 'number'"
          type="number"
          class="form-input"
          style="max-width:160px"
          :value="getValue(f.id)"
          @input="setValue(f.id, $event.target.valueAsNumber)"
          :placeholder="f.label"
        />

        <!-- date -->
        <input
          v-else-if="f.type === 'date'"
          type="date"
          class="form-input"
          style="max-width:200px"
          :value="getValue(f.id)"
          @change="setValue(f.id, $event.target.value)"
        />

        <!-- percentage -->
        <div v-else-if="f.type === 'percentage'" class="pct-field">
          <input
            type="range" min="0" max="100"
            :value="getValue(f.id, 0)"
            @input="setValue(f.id, +$event.target.value)"
            class="pct-range"
          />
          <span class="pct-value">{{ getValue(f.id, 0) }}%</span>
        </div>

        <!-- checkbox (single) -->
        <label v-else-if="f.type === 'checkbox'" class="cb-label">
          <input
            type="checkbox"
            :checked="!!getValue(f.id, false)"
            @change="setValue(f.id, $event.target.checked)"
          />
          <span>{{ f.label }}</span>
        </label>

        <!-- checkboxes (multiple) -->
        <div v-else-if="f.type === 'checkboxes'" class="checkboxes-grid">
          <label v-for="opt in f.options" :key="opt" class="cb-label">
            <input
              type="checkbox"
              :checked="(getValue(f.id, []) || []).includes(opt)"
              @change="toggleCheckbox(f.id, opt, $event.target.checked)"
            />
            <span>{{ opt }}</span>
          </label>
        </div>

        <!-- select -->
        <select
          v-else-if="f.type === 'select'"
          class="form-input"
          :value="getValue(f.id, '')"
          @change="setValue(f.id, $event.target.value)"
          style="max-width:280px"
        >
          <option value="">— Choisir —</option>
          <option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>

        <!-- radio -->
        <div v-else-if="f.type === 'radio'" class="radio-group">
          <label v-for="opt in f.options" :key="opt" class="cb-label">
            <input
              type="radio"
              :name="'cf_' + f.id"
              :value="opt"
              :checked="getValue(f.id) === opt"
              @change="setValue(f.id, opt)"
            />
            <span>{{ opt }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  fields:     { type: Array,  default: () => [] },
  customData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update'])

function getValue(id, fallback = '') {
  return props.customData?.[id] !== undefined ? props.customData[id] : fallback
}

function setValue(id, val) {
  emit('update', { ...props.customData, [id]: val })
}

function toggleCheckbox(id, opt, checked) {
  const current = [...(getValue(id, []) || [])]
  const idx = current.indexOf(opt)
  if (checked && idx === -1) current.push(opt)
  if (!checked && idx >= 0)  current.splice(idx, 1)
  setValue(id, current)
}
</script>

<style scoped>
.custom-fields {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 2px dashed var(--color-border);
}
.custom-fields-title {
  font-size: var(--text-sm); font-weight: 700; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: var(--space-lg);
  display: flex; align-items: center; gap: 8px;
}
.custom-fields-title::after {
  content: ''; flex: 1; height: 1px; background: var(--color-border);
}

.custom-fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg);
}
.custom-field.wide { grid-column: 1 / -1; }
.custom-field { display: flex; flex-direction: column; gap: 8px; }

.required-star { color: #ef4444; margin-left: 3px; }

.pct-field { display: flex; align-items: center; gap: 12px; }
.pct-range { flex: 1; accent-color: var(--color-primary); }
.pct-value { font-size: var(--text-sm); font-weight: 700; color: var(--color-primary); min-width: 40px; }

.checkboxes-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.cb-label { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); cursor: pointer; }
.cb-label input { accent-color: var(--color-primary); width: 15px; height: 15px; flex-shrink: 0; }

.radio-group { display: flex; flex-wrap: wrap; gap: 12px; }
</style>
