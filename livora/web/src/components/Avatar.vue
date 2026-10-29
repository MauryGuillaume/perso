<template>
  <div class="avatar" :class="[sizeClass, `state-${state}`]">
    <div class="avatar-stage">
      <AssetImage :asset="baseAsset" :alt="`Avatar${nom ? ' de ' + nom : ''}`" size="xl" class="avatar-layer avatar-base" />
      <AssetImage v-if="clothesAsset" :asset="clothesAsset" alt="" size="xl" class="avatar-layer" />
      <AssetImage v-if="shoesAsset" :asset="shoesAsset" alt="" size="xl" class="avatar-layer" />
      <AssetImage v-if="hairAsset" :asset="hairAsset" alt="" size="xl" class="avatar-layer" />
      <AssetImage v-if="accessoriesAsset" :asset="accessoriesAsset" alt="" size="xl" class="avatar-layer" />
      <AssetImage v-if="equipmentAsset" :asset="equipmentAsset" alt="" size="xl" class="avatar-layer" />
      <span v-if="state === 'celebration'" class="avatar-fx" aria-hidden="true">✨</span>
      <span v-if="state === 'success'" class="avatar-fx avatar-fx--success" aria-hidden="true">✓</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AssetImage from '@/components/AssetImage.vue'
import { avatarLayerAsset } from '@/assets/assetManager.js'

const props = defineProps({
  // Clés d'objets équipés par slot (ex: { hair: 'bandeau_simple', clothes: 'veste_survet', ... }).
  // Passer null/undefined pour un slot = rien affiché à cette couche.
  base: { type: String, default: 'default' },
  hair: { type: String, default: null },
  clothes: { type: String, default: null },
  shoes: { type: String, default: null },
  accessories: { type: String, default: null },
  equipment: { type: String, default: null },
  nom: { type: String, default: '' },
  size: { type: String, default: 'lg' }, // sm | md | lg | xl
  state: { type: String, default: 'normal' }, // normal | success | celebration
})

const baseAsset = computed(() => avatarLayerAsset('base', props.base || 'default'))
const hairAsset = computed(() => avatarLayerAsset('hair', props.hair))
const clothesAsset = computed(() => avatarLayerAsset('clothes', props.clothes))
const shoesAsset = computed(() => avatarLayerAsset('shoes', props.shoes))
const accessoriesAsset = computed(() => avatarLayerAsset('accessories', props.accessories))
const equipmentAsset = computed(() => avatarLayerAsset('equipment', props.equipment))

const sizeClass = computed(() => `size-${props.size}`)
</script>

<style scoped>
.avatar-stage {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.avatar-layer { position: absolute; inset: 0; width: 100%; height: 100%; background: none; border-radius: 0; }
.avatar-layer.avatar-base { position: relative; }
.avatar-layer :deep(.asset-placeholder) { background: none !important; border: none !important; }
.avatar-base :deep(.asset-placeholder) {
  background: radial-gradient(circle at 35% 30%, #fff, var(--color-surface-sunken)) !important;
  border: 3px solid var(--color-ink) !important;
}

.size-sm .avatar-stage { width: 40px; height: 40px; }
.size-md .avatar-stage { width: 72px; height: 72px; }
.size-lg .avatar-stage { width: 112px; height: 112px; }
.size-xl .avatar-stage { width: 168px; height: 168px; }
.avatar-stage :deep(.asset-img), .avatar-stage :deep(.asset-placeholder) { width: 100%; height: 100%; }

.state-success .avatar-stage { animation: pop 320ms ease; }
.state-celebration .avatar-stage { animation: pop 480ms ease; }
@keyframes pop { 0% { transform: scale(1); } 45% { transform: scale(1.08); } 100% { transform: scale(1); } }

.avatar-fx {
  position: absolute; top: -6px; right: -6px;
  font-size: 1.4em; line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}
.avatar-fx--success { color: var(--color-accent); font-size: 1.1em; }

@media (prefers-reduced-motion: reduce) {
  .state-success .avatar-stage, .state-celebration .avatar-stage { animation: none; }
}
</style>
