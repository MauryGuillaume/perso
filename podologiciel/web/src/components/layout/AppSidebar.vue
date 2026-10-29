<template>
  <aside class="sidebar" :class="{ 'sidebar--open': uiStore.sidebarOpen }">
    <div class="sidebar-overlay" @click="uiStore.toggleSidebar" />
    <div class="sidebar-content">
      <nav class="sidebar-nav">
        <RouterLink to="/dashboard" class="sidebar-link" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </span>
          Tableau de bord
        </RouterLink>
        <RouterLink to="/patients" class="sidebar-link" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </span>
          Patients
        </RouterLink>

        <!-- Semelles -->
        <RouterLink to="/semelles" class="sidebar-link" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 2c-3 0-4.5 3-4.5 7 0 3 1 5 1.5 7 .6 2.4 1.4 6 4 6s3-2 3-4.5c0-2-1-3-1-5.5 0-2 2.5-3.5 2.5-6S12.5 2 9 2z"/>
            </svg>
          </span>
          Semelles
        </RouterLink>

        <!-- Facturation -->
        <RouterLink to="/facturation" class="sidebar-link" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          Facturation
        </RouterLink>

        <!-- Comptabilité -->
        <RouterLink to="/comptabilite" class="sidebar-link" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6"  y1="20" x2="6"  y2="14"/>
              <line x1="2"  y1="20" x2="22" y2="20"/>
            </svg>
          </span>
          Comptabilité
        </RouterLink>

        <!-- Agenda -->
        <RouterLink to="/agenda" class="sidebar-link" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          Agenda
        </RouterLink>

        <!-- Admin -->
        <RouterLink v-if="authStore.isAdmin" to="/admin" class="sidebar-link sidebar-link--admin" active-class="sidebar-link--active" @click="close">
          <span class="sidebar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          Administration
          <span class="admin-badge">Admin</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user" v-if="authStore.currentUser">
          <div class="sidebar-user-avatar" :style="{ background: avatarColor }">
            {{ initials }}
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">{{ authStore.currentUser.prenom }} {{ authStore.currentUser.nom }}</div>
            <div class="sidebar-user-role" :style="{ color: roleColor }">{{ roleName }}</div>
          </div>
        </div>
        <div class="sidebar-bottom">
          <div class="offline-badge" :class="{ online: isOnline }">
            <span class="dot" />{{ isOnline ? 'En ligne' : 'Hors ligne' }}
          </div>
          <div class="app-version">Movyx v1.0</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useUIStore }  from '@/store/ui.js'
import { useAuthStore, ROLES } from '@/store/auth.js'

const uiStore   = useUIStore()
const authStore = useAuthStore()

const isOnline = ref(navigator.onLine)
const close = () => { if (uiStore.sidebarOpen) uiStore.sidebarOpen = false }

function onResize() {
  // Au-delà du breakpoint desktop, on referme automatiquement le drawer
  if (window.innerWidth > 900 && uiStore.sidebarOpen) {
    uiStore.sidebarOpen = false
  }
}

onMounted(() => {
  window.addEventListener('online',  () => isOnline.value = true)
  window.addEventListener('offline', () => isOnline.value = false)
  window.addEventListener('resize',  onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

const initials = computed(() => {
  const u = authStore.currentUser
  return ((u?.prenom?.[0] || '') + (u?.nom?.[0] || '')).toUpperCase() || '?'
})

const avatarColor = computed(() => {
  const id = authStore.currentUser?.id || ''
  const colors = ['#2B6CB0','#52B848','#7c3aed','#d97706','#dc2626','#0891b2']
  let h = 0; for (const c of id) h = (h << 5) - h + c.charCodeAt(0)
  return colors[Math.abs(h) % colors.length]
})

const roleName  = computed(() => ROLES[authStore.currentUser?.role]?.label || '')
const roleColor = computed(() => ROLES[authStore.currentUser?.role]?.color || 'var(--color-text-muted)')
</script>

<style scoped>
.sidebar { position: fixed; top: calc(var(--header-height) + var(--banner-h, 0px)); left: 0; bottom: 0; z-index: 90; transition: top 200ms ease; }
.sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: -1; }
.sidebar-content {
  width: var(--sidebar-width); height: 100%;
  background: var(--color-surface); border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column;
  padding: var(--space-md) 0;
  transform: translateX(0); transition: transform var(--transition-base);
}
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 0 var(--space-sm); }
.sidebar-link {
  display: flex; align-items: center; gap: var(--space-md);
  padding: 10px var(--space-md); border-radius: var(--radius-md);
  font-size: var(--text-sm); font-weight: 500; color: var(--color-text-muted);
  transition: all var(--transition-fast); position: relative;
}
.sidebar-link:hover { background: var(--color-primary-light); color: var(--color-primary); }
.sidebar-link--active { background: var(--color-primary-light); color: var(--color-primary); font-weight: 600; }
.sidebar-link--admin:hover { background: #f5f3ff; color: #7c3aed; }
.sidebar-icon { display: flex; align-items: center; }
.admin-badge {
  margin-left: auto; font-size: 10px; font-weight: 700; text-transform: uppercase;
  background: #ede9fe; color: #7c3aed; padding: 2px 7px; border-radius: var(--radius-full);
}

.sidebar-footer { border-top: 1px solid var(--color-border); padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; gap: 10px; }

.sidebar-user { display: flex; align-items: center; gap: 10px; }
.sidebar-user-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 12px; font-weight: 700;
}
.sidebar-user-name { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
.sidebar-user-role { font-size: var(--text-xs); font-weight: 600; }

.sidebar-bottom { display: flex; justify-content: space-between; align-items: center; }
.app-version { font-size: var(--text-xs); color: var(--color-text-light); }
.offline-badge { display: flex; align-items: center; gap: 5px; font-size: var(--text-xs); font-weight: 500; color: var(--color-error); }
.offline-badge.online { color: var(--color-success); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

@media (max-width: 900px) {
  .sidebar-content { transform: translateX(-100%); box-shadow: var(--shadow-xl); }
  .sidebar--open .sidebar-content { transform: translateX(0); }
  .sidebar--open .sidebar-overlay { display: block; }
  /* Sur tablette/mobile, les liens sont plus grands pour les doigts */
  .sidebar-link { padding: 14px var(--space-md); font-size: 15px; }
}
</style>
