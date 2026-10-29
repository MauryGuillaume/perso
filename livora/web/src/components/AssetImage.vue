<template>
  <img v-if="asset?.kind === 'image'" :src="asset.url" :alt="alt" class="asset-img" :class="sizeClass" loading="lazy" decoding="async" />
  <div v-else class="asset-placeholder" :class="sizeClass" :style="placeholderStyle" role="img" :aria-label="alt">
    <span class="asset-placeholder-emoji">{{ asset?.emoji ?? '❔' }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Résultat direct d'un des helpers de assets/assetManager.js : { kind: 'image', url } | { kind: 'placeholder', emoji, seed }
  asset: { type: Object, default: null },
  alt: { type: String, default: '' },
  size: { type: String, default: 'md' }, // xs | sm | md | lg | xl
})

const sizeClass = computed(() => `size-${props.size}`)

// Dégradé stable par "seed" (ex: clé de compagnon/zone) pour que le même élément ait
// toujours le même placeholder plutôt qu'une couleur aléatoire à chaque rendu.
// Palette manga : papier crème et gris-encre, avec un aplat vermillon en accent occasionnel.
const GRADIENT_PAIRS = [
  ['#F1EEE4', '#DAD5C4'], ['#FBE0DC', '#F0B8B0'], ['#E4E1D7', '#C6C1B0'],
  ['#F5E7CC', '#E8CE96'], ['#EFEDE6', '#CFCABC'], ['#FBE0DC', '#E1382D'],
]
function hashSeed(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}
const placeholderStyle = computed(() => {
  const seed = props.asset?.seed || props.alt || 'default'
  const [from, to] = GRADIENT_PAIRS[hashSeed(seed) % GRADIENT_PAIRS.length]
  return { background: `linear-gradient(145deg, ${from}, ${to})` }
})
</script>

<style scoped>
.asset-img, .asset-placeholder {
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.asset-img { object-fit: contain; }
.asset-placeholder { line-height: 1; border: 2px solid var(--color-ink); }

.size-xs { width: 24px; height: 24px; }
.size-xs .asset-placeholder-emoji, .size-xs { font-size: 0.9rem; }
.size-sm { width: 36px; height: 36px; }
.size-sm .asset-placeholder-emoji { font-size: 1.3rem; }
.size-md { width: 56px; height: 56px; }
.size-md .asset-placeholder-emoji { font-size: 1.9rem; }
.size-lg { width: 88px; height: 88px; }
.size-lg .asset-placeholder-emoji { font-size: 2.8rem; }
.size-xl { width: 140px; height: 140px; }
.size-xl .asset-placeholder-emoji { font-size: 4.2rem; }
</style>
