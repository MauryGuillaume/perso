<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="modelValue" class="tc-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="tc-drawer">
          <!-- Header -->
          <div class="tc-header">
            <div>
              <h3 class="tc-title">Personnaliser « {{ tabLabel }} »</h3>
              <p class="tc-sub">Ajoutez des champs supplémentaires à cet onglet</p>
            </div>
            <button class="btn btn-icon btn-ghost" @click="$emit('update:modelValue', false)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Rename tab (built-in only) -->
          <div v-if="isBuiltin" class="tc-section">
            <label class="form-label">Renommer l'onglet <span class="tc-hint">(laisser vide pour conserver le nom par défaut)</span></label>
            <input v-model="localLabel" type="text" class="form-input" :placeholder="defaultLabel" />
          </div>

          <!-- Existing fields -->
          <div class="tc-section" style="flex:1;overflow-y:auto">
            <div class="tc-section-head">
              <span class="form-label" style="margin:0">Champs personnalisés ({{ localFields.length }})</span>
              <button class="btn btn-primary btn-sm" @click="addField">+ Ajouter un champ</button>
            </div>

            <div v-if="localFields.length === 0" class="tc-empty">
              Aucun champ ajouté. Cliquez sur "Ajouter un champ" pour commencer.
            </div>

            <div v-else class="tc-fields-list">
              <div v-for="(f, idx) in localFields" :key="f.id" class="tc-field-item">
                <!-- View mode -->
                <div v-if="editingIdx !== idx" class="tc-field-view">
                  <div class="tc-field-info">
                    <span class="tc-field-type-badge">{{ typeLabel(f.type) }}</span>
                    <span class="tc-field-label">{{ f.label }}</span>
                    <span v-if="f.placeholder" class="tc-field-ph">placeholder: "{{ f.placeholder }}"</span>
                    <span v-if="f.required" class="tc-field-required">requis</span>
                  </div>
                  <div class="tc-field-actions">
                    <button class="btn btn-xs btn-ghost" @click="editingIdx = idx">✏️</button>
                    <button class="btn btn-xs btn-ghost" @click="moveUp(idx)"   :disabled="idx === 0">↑</button>
                    <button class="btn btn-xs btn-ghost" @click="moveDown(idx)" :disabled="idx === localFields.length-1">↓</button>
                    <button class="btn btn-xs btn-ghost" style="color:#dc2626" @click="removeField(idx)">🗑</button>
                  </div>
                </div>

                <!-- Edit mode -->
                <div v-else class="tc-field-edit">
                  <div class="form-group">
                    <label class="form-label">Type de champ</label>
                    <select v-model="f.type" class="form-input" @change="f.options=[]; f.placeholder=''">
                      <option v-for="t in FIELD_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Libellé / Question</label>
                    <input v-model="f.label" class="form-input" placeholder="Ex: Niveau de satisfaction" />
                  </div>

                  <!-- Placeholder pour texte court et texte long -->
                  <div v-if="hasPlaceholder(f.type)" class="form-group">
                    <label class="form-label">Texte d'exemple (placeholder)</label>
                    <input v-model="f.placeholder" class="form-input" placeholder="Ex: Saisissez votre réponse ici…" />
                  </div>

                  <!-- Options pour select / radio / checkboxes -->
                  <div v-if="['select','radio','checkboxes'].includes(f.type)" class="form-group">
                    <label class="form-label">Options <span class="tc-hint">(une par ligne)</span></label>
                    <textarea
                      class="form-input"
                      rows="4"
                      :value="f.options?.join('\n')"
                      @input="f.options = $event.target.value.split('\n').filter(o => o.trim())"
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>

                  <div class="tc-field-edit-footer">
                    <label class="tc-checkbox-label">
                      <input type="checkbox" v-model="f.required" />
                      Champ obligatoire
                    </label>
                    <button class="btn btn-primary btn-sm" @click="editingIdx = -1" :disabled="!f.label.trim()">Valider</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Save / Cancel -->
          <div class="tc-footer">
            <button class="btn btn-secondary" @click="$emit('update:modelValue', false)">Annuler</button>
            <button class="btn btn-primary" @click="save">Enregistrer les modifications</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { FIELD_TYPES } from '@/store/auth.js'
import { generateId } from '@/utils/uuid.js'

const props = defineProps({
  modelValue:   Boolean,
  tabId:        String,
  tabLabel:     String,
  defaultLabel: String,
  isBuiltin:    { type: Boolean, default: true },
  currentLabel: String,
  fields:       { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'save'])

const localLabel  = ref('')
const localFields = ref([])
const editingIdx  = ref(-1)

watch(() => props.modelValue, (v) => {
  if (v) {
    localLabel.value  = props.currentLabel || ''
    localFields.value = props.fields.map(f => ({
      ...f,
      options:     [...(f.options     || [])],
      placeholder: f.placeholder || '',
    }))
    editingIdx.value = -1
  }
})

function typeLabel(type) {
  return FIELD_TYPES.find(t => t.value === type)?.label || type
}

function hasPlaceholder(type) {
  return FIELD_TYPES.find(t => t.value === type)?.hasPlaceholder ?? false
}

function addField() {
  const f = { id: generateId(), type: 'text', label: '', required: false, options: [], placeholder: '' }
  localFields.value.push(f)
  editingIdx.value = localFields.value.length - 1
}

function removeField(idx) { localFields.value.splice(idx, 1); editingIdx.value = -1 }
function moveUp(idx)   { if (idx > 0) { const a = localFields.value.splice(idx, 1)[0]; localFields.value.splice(idx-1, 0, a) } }
function moveDown(idx) { if (idx < localFields.value.length-1) { const a = localFields.value.splice(idx, 1)[0]; localFields.value.splice(idx+1, 0, a) } }

function save() {
  for (const f of localFields.value) {
    if (!f.label.trim()) { alert('Tous les champs doivent avoir un libellé'); return }
  }
  emit('save', {
    tabId:  props.tabId,
    label:  localLabel.value,
    fields: localFields.value,
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.tc-overlay {
  position: fixed; inset: 0; z-index: 800;
  background: rgba(0,0,0,.4); display: flex; justify-content: flex-end;
}
.tc-drawer {
  width: 100%; max-width: 480px; height: 100%; background: var(--color-surface);
  box-shadow: var(--shadow-xl); display: flex; flex-direction: column;
  overflow: hidden;
}
.tc-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
}
.tc-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-text); }
.tc-sub   { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 4px; }
.tc-hint  { font-size: var(--text-xs); color: var(--color-text-light); font-weight: 400; }

.tc-section { padding: 20px 24px; border-bottom: 1px solid var(--color-border); }
.tc-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }

.tc-empty { text-align: center; color: var(--color-text-muted); font-size: var(--text-sm); padding: 24px; background: var(--color-surface-alt); border-radius: var(--radius-lg); }

.tc-fields-list { display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.tc-field-item { border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }

.tc-field-view {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; background: var(--color-surface-alt);
}
.tc-field-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.tc-field-type-badge {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
  background: var(--color-primary-light); color: var(--color-primary);
  padding: 2px 8px; border-radius: var(--radius-full); flex-shrink: 0;
}
.tc-field-label   { font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }
.tc-field-ph      { font-size: 11px; color: var(--color-text-light); font-style: italic; }
.tc-field-required { font-size: 10px; color: #ef4444; font-weight: 600; flex-shrink: 0; }
.tc-field-actions { display: flex; gap: 2px; flex-shrink: 0; }
.btn-xs { padding: 4px 8px; font-size: 13px; }

.tc-field-edit { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.tc-field-edit-footer { display: flex; align-items: center; justify-content: space-between; }
.tc-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); cursor: pointer; }

.tc-footer { padding: 20px 24px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }

.drawer-enter-active, .drawer-leave-active { transition: all 280ms ease; }
.drawer-enter-from .tc-drawer, .drawer-leave-to .tc-drawer { transform: translateX(100%); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }

@media (max-width: 540px) {
  .tc-drawer { max-width: 100%; }
  .tc-header  { padding: 16px; }
  .tc-section { padding: 14px 16px; }
  .tc-title   { font-size: var(--text-base); }
  .tc-footer  { padding: 14px 16px; }
  .tc-field-view { flex-wrap: wrap; gap: 6px; }
  .tc-field-actions { flex-shrink: 0; }
}
</style>
