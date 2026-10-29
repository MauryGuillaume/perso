<template>
  <div class="notes-generales">
    <div class="card">
      <h3 class="section-title">Notes générales</h3>
      <textarea
        :value="bilan.notesGenerales"
        @input="emit('update', { notesGenerales: $event.target.value })"
        class="form-textarea notes-textarea"
        placeholder="Observations complémentaires, plan de traitement, suivi prévu, recommandations…"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ bilan: Object })
const emit = defineEmits(['update'])
</script>

<style scoped>
.notes-generales {}
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-md); color: var(--color-primary); }
.notes-textarea { min-height: 400px; font-size: var(--text-md); line-height: 1.7; }
</style>
