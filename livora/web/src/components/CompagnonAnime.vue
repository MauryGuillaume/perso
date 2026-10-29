<template>
  <div class="compagnon-anime" :class="{ vivant: anime, evolution: enEvolution }">
    <Companion v-bind="$attrs" :species-key="speciesKey" :level="level" :size="size" :state="state" />
    <span v-if="enEvolution" class="eclats" aria-hidden="true"><i v-for="n in 14" :key="n" :style="eclat(n)" /></span>
  </div>
</template>

<script setup>
// Compagnon qui flotte doucement et joue l'animation d'évolution quand il change de palier.
// Utilise le composant Companion existant et les images companions/<espèce>/level-<palier>.webp.
import { computed, ref, watch } from 'vue'
import Companion from '@/components/Companion.vue'
import { COMPANION_SPECIES } from '@/gamification/catalog.js'

defineOptions({ inheritAttrs: false })
const props = defineProps({
  speciesKey: { type: String, required: true },
  level: { type: Number, required: true },
  size: { type: String, default: 'lg' },
  state: { type: String, default: 'normal' },
  anime: { type: Boolean, default: true },
})

const palier = computed(() => {
  const evos = COMPANION_SPECIES.find((s) => s.key === props.speciesKey)?.evolutions ?? []
  let p = 1
  for (const e of evos) if (props.level >= e.level) p = e.level
  return p
})
const enEvolution = ref(false)
watch(palier, (nouveau, ancien) => {
  if (nouveau <= ancien || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  enEvolution.value = false
  requestAnimationFrame(() => { enEvolution.value = true })
  setTimeout(() => { enEvolution.value = false }, 1500)
})
function eclat(n) {
  const ang = (n / 14) * Math.PI * 2, r = 70 + ((n * 37) % 10) * 5
  return { '--x': Math.cos(ang) * r + 'px', '--y': Math.sin(ang) * r + 'px' }
}
</script>

<style scoped>
.compagnon-anime { position: relative; display: inline-flex; transform-origin: 50% 100%; }
.vivant { animation: flotte 2.6s ease-in-out infinite; }
@keyframes flotte { 50% { transform: translateY(-6px) scale(1.01, 0.99); } }
.evolution { animation: evolue 1.5s ease-in-out; }
@keyframes evolue {
  15% { filter: brightness(0) invert(1) drop-shadow(0 0 14px #e3a93e); transform: scale(1); }
  30% { transform: scale(1.06); } 45% { transform: scale(0.96); }
  60% { transform: scale(1.08); filter: brightness(0) invert(1) drop-shadow(0 0 28px #e3a93e); }
  80% { filter: brightness(0) invert(1) drop-shadow(0 0 10px #e3a93e); transform: scale(1); }
  100% { filter: none; }
}
.eclats { position: absolute; left: 50%; top: 45%; }
.eclats i { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #e3a93e; box-shadow: 0 0 10px #e3a93e; opacity: 0; animation: eclat 0.9s 0.75s ease-out forwards; }
@keyframes eclat { from { transform: translate(0, 0) scale(1); opacity: 1; } to { transform: translate(var(--x), var(--y)) scale(0.2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .vivant, .evolution { animation: none; } }
</style>
