<template>
  <div class="companion" :class="[sizeClass, `state-${state}`]">
    <AssetImage :asset="asset" :alt="evolution?.label ?? species?.label ?? 'Compagnon'" :size="assetSize" />
    <span v-if="state === 'celebration'" class="companion-fx" aria-hidden="true">✨</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AssetImage from '@/components/AssetImage.vue'
import { companionAsset } from '@/assets/assetManager.js'
import { COMPANION_SPECIES } from '@/gamification/catalog.js'

const props = defineProps({
  speciesKey: { type: String, required: true },
  level: { type: Number, required: true },
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  state: { type: String, default: 'normal' }, // normal | celebration
})

const species = computed(() => COMPANION_SPECIES.find((s) => s.key === props.speciesKey))
const evolution = computed(() => {
  const list = species.value?.evolutions
  if (!list) return null
  let evo = list[0]
  for (const e of list) if (props.level >= e.level) evo = e
  return evo
})

const asset = computed(() => companionAsset(props.speciesKey, evolution.value?.level ?? 1, evolution.value?.icon))
const sizeClass = computed(() => `size-${props.size}`)
const assetSize = computed(() => ({ sm: 'sm', md: 'md', lg: 'lg', xl: 'xl' }[props.size] ?? 'md'))
</script>

<style scoped>
.companion { position: relative; display: inline-flex; }
.state-celebration { animation: bounce 500ms ease; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } 65% { transform: translateY(2px); } }

.companion-fx { position: absolute; top: -4px; right: -4px; font-size: 1.1em; }

@media (prefers-reduced-motion: reduce) {
  .state-celebration { animation: none; }
}
</style>
