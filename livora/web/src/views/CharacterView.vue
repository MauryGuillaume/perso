<template>
  <div class="page">
    <RouterLink to="/profil" class="back-link">← Profil</RouterLink>
    <header class="page-header"><h1>Mon personnage</h1></header>

    <div class="avatar-card card">
      <PersonnageCalques :level="gamification.progress.level" :apparence="gamification.apparencePortee" :size="260" />
      <p class="stade-info">Stade {{ stade }} / {{ nbStades }}<span v-if="prochainStade"> · prochaine évolution au niveau {{ prochainStade }}</span></p>
      <XpBar :progress="gamification.progress" />
      <RouterLink to="/personnage/creer" class="btn btn-ghost btn-sm">✏️ Modifier mon apparence</RouterLink>
    </div>

    <section class="block">
      <h3 class="block-title">Équipé</h3>
      <p class="block-hint">Les tenues et chaussures marquées 👕 sont portées par ton personnage ; les autres objets s'affichent ici.</p>
      <div class="equipped-grid">
        <div v-for="slot in COSMETIC_SLOTS" :key="slot" class="equip-slot card">
          <span class="slot-label">{{ slotLabel(slot) }}</span>
          <template v-if="equipped[slot]">
            <span class="slot-icon">{{ itemIcon(equipped[slot]) }}</span>
            <span class="slot-item-name">{{ itemLabel(equipped[slot]) }}</span>
            <button class="btn-text" @click="gamification.unequipSlot(slot)">Retirer</button>
          </template>
          <span v-else class="slot-empty">Aucun objet</span>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-header">
        <h3 class="block-title">Objets débloqués</h3>
        <span class="pill pill-neutral tabular">{{ unlockedItems.length }}/{{ objetsGenre.length }}</span>
      </div>
      <div class="item-grid">
        <button
          v-for="item in unlockedItems" :key="item.key"
          class="item-tile card"
          :style="{ '--rarity-color': RARITY[item.rarity].color }"
          @click="gamification.equipItem(item.slot, item.key)"
        >
          <AssetImage :asset="cosmeticAsset(item.slot, item.key, item.icon)" :alt="item.label" size="sm" />
          <span class="item-name">{{ item.label }}<template v-if="item.porte"> 👕</template></span>
          <span class="rarity-pill" :style="{ background: RARITY[item.rarity].color }">{{ RARITY[item.rarity].label }}</span>
        </button>
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">Objets verrouillés</h3>
      <div class="item-grid">
        <div v-for="item in lockedItems" :key="item.key" class="item-tile item-tile--locked card">
          <span class="item-icon locked-icon">🔒</span>
          <span class="item-name">{{ item.label }}</span>
          <span class="rarity-pill" :style="{ background: RARITY[item.rarity].color }">{{ RARITY[item.rarity].label }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import XpBar from '@/components/XpBar.vue'
import PersonnageCalques from '@/components/PersonnageCalques.vue'
import { stadeDuNiveau, CORPS } from '@/avatar/apparence.js'
import AssetImage from '@/components/AssetImage.vue'
import { cosmeticAsset } from '@/assets/assetManager.js'
import { useGamificationStore } from '@/gamification/useGamificationStore.js'
import { RARITY } from '@/gamification/catalog.js'
import { COSMETIC_ITEMS, COSMETIC_SLOTS, cosmeticByKey, cosmeticPourGenre } from '@/gamification/cosmeticItems.js'

const gamification = useGamificationStore()
const equipped = computed(() => gamification.equippedItems)
const SEUILS_STADES = [1, 5, 10, 15, 20, 30]
const genre = computed(() => gamification.apparence.genre ?? 'homme')
const nbStades = computed(() => CORPS[genre.value].length)
const stade = computed(() => stadeDuNiveau(gamification.progress.level, genre.value))
const prochainStade = computed(() => (stade.value < nbStades.value ? SEUILS_STADES[stade.value] : null))
// objets proposés : ceux de la silhouette du joueur (les tenues portées sont réservées à un genre)
const objetsGenre = computed(() => COSMETIC_ITEMS.filter((i) => cosmeticPourGenre(i, genre.value)))

const unlockedItems = computed(() => objetsGenre.value.filter((i) => gamification.unlockedCosmetics.includes(i.key)))
const lockedItems = computed(() => objetsGenre.value.filter((i) => !gamification.unlockedCosmetics.includes(i.key)))

const SLOT_LABELS = { coiffure: 'Coiffure', vetement: 'Vêtement', chaussures: 'Chaussures', accessoire: 'Accessoire', equipement: 'Équipement', objet_rare: 'Objet rare' }
function slotLabel(slot) { return SLOT_LABELS[slot] ?? slot }
function itemIcon(key) { return cosmeticByKey(key)?.icon ?? '❔' }
function itemLabel(key) { return cosmeticByKey(key)?.label ?? key }
</script>

<style scoped>
.page { max-width: 640px; margin: 0 auto; padding: var(--space-lg) var(--space-md) var(--space-2xl); }
.back-link { display: inline-block; margin-bottom: var(--space-md); color: var(--color-ink-faint); font-size: var(--text-sm); font-weight: 600; }
.page-header { margin-bottom: var(--space-lg); }
.page-header h1 { font-size: var(--text-2xl); }

.avatar-card { padding: var(--space-lg); margin-bottom: var(--space-lg); display: flex; flex-direction: column; align-items: center; gap: var(--space-md); }
.avatar-card .xp-bar { width: 100%; }

.block { margin-bottom: var(--space-lg); }
.stade-info { font-size: var(--text-sm); color: var(--color-ink-soft); font-weight: 600; }
.block-hint { font-size: var(--text-sm); color: var(--color-ink-soft); margin-bottom: var(--space-sm); }
.btn-sm { padding: 8px 14px; font-size: var(--text-xs); }
.block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm); }
.block-title { font-size: var(--text-lg); margin-bottom: var(--space-sm); }
.block-header .block-title { margin-bottom: 0; }

.equipped-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.equip-slot { padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; gap: 3px; }
.slot-label { font-size: var(--text-xs); color: var(--color-ink-faint); text-transform: uppercase; letter-spacing: 0.03em; }
.slot-icon { font-size: 1.3rem; }
.slot-item-name { font-size: var(--text-sm); font-weight: 600; }
.slot-empty { font-size: var(--text-sm); color: var(--color-ink-faint); padding: 4px 0; }

.item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.item-tile {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: var(--space-sm);
  border-top: 3px solid var(--rarity-color, var(--color-border));
  cursor: pointer;
  text-align: center;
}
.item-tile--locked { cursor: default; opacity: 0.55; border-top-color: var(--color-border); }
.item-icon { font-size: 1.6rem; }
.locked-icon { font-size: 1.3rem; }
.item-name { font-size: var(--text-xs); font-weight: 600; color: var(--color-ink); }
.rarity-pill { font-size: 0.62rem; font-weight: 700; color: #fff; padding: 2px 8px; border-radius: var(--radius-pill); }
</style>
