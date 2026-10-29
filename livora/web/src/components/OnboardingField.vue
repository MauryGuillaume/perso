<template>
  <div class="field">
    <label class="field-label" :id="`lbl-${field.key}`" :for="`champ-${field.key}`">{{ field.label }}<span v-if="field.required" aria-hidden="true"> *</span></label>

    <input v-if="field.type === 'text'" :id="`champ-${field.key}`" class="input" type="text" :placeholder="field.placeholder"
      :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />

    <input v-else-if="field.type === 'number'" :id="`champ-${field.key}`" inputmode="numeric" class="input" type="number" :min="field.min" :max="field.max" :placeholder="field.placeholder"
      :value="modelValue ?? ''" @input="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))" />

    <input v-else-if="field.type === 'time'" :id="`champ-${field.key}`" class="input" type="time" :placeholder="field.placeholder"
      :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />

    <div v-else-if="field.type === 'choice'" class="chip-row" role="group" :aria-labelledby="`lbl-${field.key}`">
      <button v-for="opt in field.options" :key="opt.value" type="button" class="chip"
        :class="{ 'chip--active': modelValue === opt.value }" :aria-pressed="modelValue === opt.value" @click="$emit('update:modelValue', opt.value)">
        {{ opt.label }}
      </button>
    </div>

    <div v-else-if="field.type === 'multi'" class="chip-row" role="group" :aria-labelledby="`lbl-${field.key}`">
      <button v-for="opt in field.options" :key="opt.value" type="button" class="chip"
        :class="{ 'chip--active': (modelValue || []).includes(opt.value) }" :aria-pressed="(modelValue || []).includes(opt.value)" @click="toggleMulti(opt.value)">
        {{ opt.label }}
      </button>
    </div>

    <div v-else-if="field.type === 'tags'">
      <div class="tag-row" v-if="(modelValue || []).length">
        <span v-for="(tag, i) in modelValue" :key="i" class="tag">
          {{ tag }}
          <button type="button" class="tag-remove" :aria-label="`Retirer ${tag}`" @click="removeTag(i)">×</button>
        </span>
      </div>
      <input :id="`champ-${field.key}`" class="input" type="text" :placeholder="field.placeholder"
        v-model="tagDraft" @keydown.enter.prevent="addTag" @blur="addTag" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [String, Number, Array, null], default: null },
})
const emit = defineEmits(['update:modelValue'])

function toggleMulti(value) {
  const current = props.modelValue || []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  emit('update:modelValue', next)
}

const tagDraft = ref('')
function addTag() {
  const value = tagDraft.value.trim()
  if (!value) return
  emit('update:modelValue', [...(props.modelValue || []), value])
  tagDraft.value = ''
}
function removeTag(i) {
  const next = [...props.modelValue]
  next.splice(i, 1)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: var(--space-lg); }
.field-label { font-size: var(--text-sm); font-weight: 600; color: var(--color-ink-soft); }

.input {
  padding: 11px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: var(--text-base);
  font-family: inherit;
}
.input:focus { outline: 2px solid var(--color-accent); outline-offset: 1px; }

.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  padding: 9px 16px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-ink);
  background: var(--color-surface);
  color: var(--color-ink-soft);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-bounce), box-shadow var(--transition-fast);
}
.chip:hover { box-shadow: 2px 2px 0 rgba(0,0,0,0.3); }
.chip:active { transform: translate(1px, 1px); box-shadow: none; }
.chip--active { background: var(--color-accent); color: #fff; box-shadow: 2px 2px 0 rgba(0,0,0,0.3); }

@media (prefers-reduced-motion: reduce) {
  .chip:active, .chip--active { transform: none; }
}

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--color-accent-ink);
  font-size: var(--text-xs);
  font-weight: 600;
}
.tag-remove { background: none; border: none; cursor: pointer; color: inherit; font-size: 0.9rem; line-height: 1; }
</style>
