<template>
  <nav class="bottom-nav" v-if="!isPublicPage">
    <RouterLink to="/dashboard" class="bnav-item" active-class="bnav-item--active">
      <span class="bnav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
      </span>
      <span class="bnav-label">Accueil</span>
    </RouterLink>

    <RouterLink to="/patients" class="bnav-item" active-class="bnav-item--active">
      <span class="bnav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      </span>
      <span class="bnav-label">Patients</span>
    </RouterLink>

    <RouterLink to="/patients/new" class="bnav-item bnav-item--fab">
      <span class="bnav-fab">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </span>
    </RouterLink>

    <RouterLink to="/facturation" class="bnav-item" active-class="bnav-item--active">
      <span class="bnav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </span>
      <span class="bnav-label">Factures</span>
    </RouterLink>

    <button class="bnav-item" @click="uiStore.toggleSidebar">
      <span class="bnav-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </span>
      <span class="bnav-label">Menu</span>
    </button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useUIStore } from '@/store/ui.js'

const uiStore = useUIStore()
const route = useRoute()
const PUBLIC_ROUTES = ['Landing', 'Login']
const isPublicPage = computed(() => PUBLIC_ROUTES.includes(route.name))
</script>

<style scoped>
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 95;
  height: var(--bottom-nav-height, 60px);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -2px 12px rgba(0,0,0,.08);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-bottom: max(env(safe-area-inset-bottom), 0px);
}

.bottom-nav {
  display: none;
  grid-template-columns: repeat(5, 1fr);
  align-items: stretch;
}

.bnav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 8px 4px;
  border: none; background: none; cursor: pointer;
  color: var(--color-text-muted);
  font-size: 10px; font-weight: 500; text-decoration: none;
  transition: color var(--transition-fast);
  min-height: 100%; position: relative;
  -webkit-tap-highlight-color: transparent;
}

.bnav-item:active { transform: scale(.93); }

.bnav-item--active { color: var(--color-primary); }
.bnav-item--active .bnav-icon::before {
  content: '';
  position: absolute;
  top: 6px; left: 50%; transform: translateX(-50%);
  width: 32px; height: 32px;
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  z-index: -1;
}

.bnav-icon {
  position: relative; z-index: 0;
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
}

.bnav-label { font-size: 10px; font-weight: 500; line-height: 1; }

/* Bouton FAB central */
.bnav-item--fab { color: var(--color-primary); }
.bnav-fab {
  width: 46px; height: 46px;
  background: var(--gradient-brand);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 4px 14px rgba(43,108,176,.4);
  margin-top: -14px;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.bnav-item--fab:active .bnav-fab { transform: scale(.92); box-shadow: 0 2px 8px rgba(43,108,176,.3); }

@media (max-width: 900px) {
  .bottom-nav { display: grid; }
}
</style>
