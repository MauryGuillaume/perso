<template>
  <header class="app-header">
    <div class="header-left">
      <button class="btn btn-icon btn-ghost mobile-menu-btn" @click="uiStore.toggleSidebar" aria-label="Menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <RouterLink to="/dashboard" class="header-brand">
        <img src="/logo.png" alt="Movyx" class="brand-logo" />
      </RouterLink>
    </div>

    <nav class="header-nav desktop-only">
      <RouterLink to="/dashboard" class="nav-link" active-class="nav-link--active">Tableau de bord</RouterLink>
      <RouterLink to="/patients"  class="nav-link" active-class="nav-link--active">Patients</RouterLink>
      <RouterLink v-if="authStore.isAdmin" to="/admin" class="nav-link nav-link--admin" active-class="nav-link--active">Administration</RouterLink>
    </nav>

    <div class="header-right">
      <!-- Plan badge (free) -->
      <span v-if="currentRole === 'free'" class="plan-badge plan-badge--free" title="Passez en Pro pour débloquer toutes les fonctionnalités">
        Gratuit
      </span>
      <span v-else-if="currentRole === 'vip'" class="plan-badge plan-badge--vip">VIP ⭐</span>

      <!-- Theme toggle -->
      <button class="btn btn-icon btn-ghost" @click="toggleTheme" :title="uiStore.theme === 'dark' ? 'Mode clair' : 'Mode sombre'">
        <svg v-if="uiStore.theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>

      <!-- User menu -->
      <div class="user-menu" ref="menuRef">
        <button class="user-trigger" @click="menuOpen = !menuOpen">
          <div v-if="authStore.currentUser?.photo" class="user-avatar-sm user-avatar-photo">
            <img :src="authStore.currentUser.photo" alt="avatar" />
          </div>
          <div v-else class="user-avatar-sm" :style="{ background: avatarColor }">{{ initials }}</div>
          <span class="desktop-only user-trigger-name">{{ authStore.currentUser?.prenom }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="desktop-only"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <Transition name="dropdown">
          <div v-if="menuOpen" class="user-dropdown">
            <div class="user-dropdown-header">
              <div class="user-avatar-lg" :style="authStore.currentUser?.photo ? {} : { background: avatarColor }">
                <img v-if="authStore.currentUser?.photo" :src="authStore.currentUser.photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />
                <span v-else>{{ initials }}</span>
              </div>
              <div>
                <div class="dropdown-name">{{ authStore.currentUser?.prenom }} {{ authStore.currentUser?.nom }}</div>
                <div class="dropdown-email">{{ authStore.currentUser?.email }}</div>
                <span class="dropdown-role" :style="{ color: roleColor }">{{ roleName }}</span>
              </div>
            </div>
            <div class="dropdown-divider" />
            <RouterLink to="/profile" class="dropdown-item" @click="menuOpen=false">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Mon profil
            </RouterLink>
            <RouterLink to="/patients/new" class="dropdown-item" @click="menuOpen=false">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouveau patient
            </RouterLink>
            <RouterLink v-if="authStore.isAdmin" to="/admin" class="dropdown-item" @click="menuOpen=false">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Administration
            </RouterLink>
            <a href="mailto:contact@movyx.com" class="dropdown-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Contact Movyx
            </a>
            <div class="dropdown-divider" />
            <button class="dropdown-item dropdown-item--danger" @click="logout">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Déconnexion
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useUIStore }  from '@/store/ui.js'
import { useAuthStore, ROLES } from '@/store/auth.js'

const uiStore   = useUIStore()
const authStore = useAuthStore()
const router    = useRouter()

const menuOpen = ref(false)
const menuRef  = ref(null)

const toggleTheme = () => uiStore.setTheme(uiStore.theme === 'dark' ? 'light' : 'dark')

const currentRole = computed(() => authStore.currentUser?.role || 'free')

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

function logout() { authStore.logout(); menuOpen.value = false; router.push('/landing') }

function handleClickOutside(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<style scoped>
.app-header {
  /* Décalé par --banner-h injecté sur .app-root */
  position: fixed;
  top: var(--banner-h, 0px);
  left: 0; right: 0; z-index: 100;
  height: var(--header-height);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 var(--space-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 0 var(--color-border), 0 2px 8px rgba(43,108,176,.06);
  gap: var(--space-md);
  transition: top 200ms ease;
}
[data-admin="true"] .app-header {
  border-bottom-color: #c4b5fd;
  box-shadow: 0 1px 0 #c4b5fd, 0 2px 8px rgba(124,58,237,.08);
}

.header-left  { display: flex; align-items: center; gap: var(--space-md); }
.header-brand { display: flex; align-items: center; }
.brand-logo   { height: 40px; width: auto; object-fit: contain; display: block; }

.header-nav { display: flex; gap: var(--space-xs); }
.nav-link {
  padding: 6px 14px; border-radius: var(--radius-md);
  font-size: var(--text-sm); font-weight: 500;
  color: var(--color-text-muted); transition: all var(--transition-fast);
}
.nav-link:hover      { color: var(--color-primary); background: var(--color-primary-light); }
.nav-link--active    { color: var(--color-primary); background: var(--color-primary-light); font-weight: 600; }
.nav-link--admin:hover { color: #7c3aed; background: #f5f3ff; }

.header-right { display: flex; align-items: center; gap: var(--space-sm); }
.mobile-menu-btn { display: none; }

/* Plan badges */
.plan-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--radius-full); letter-spacing: .03em;
}
.plan-badge--free { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
.plan-badge--vip  { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }

/* User menu */
.user-menu { position: relative; }
.user-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: var(--color-surface);
  cursor: pointer; transition: all var(--transition-fast);
}
.user-trigger:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
.user-avatar-sm {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 11px; font-weight: 700; overflow: hidden;
}
.user-avatar-photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.user-trigger-name { font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }

.user-dropdown {
  position: absolute; top: calc(100% + 8px); right: 0;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); box-shadow: var(--shadow-xl);
  min-width: 240px; overflow: hidden; z-index: 200;
  /* Prevent overflow on very narrow screens */
  max-width: calc(100vw - 16px);
}
.user-dropdown-header { display: flex; align-items: center; gap: 12px; padding: 16px; }
.user-avatar-lg { width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:700; }
.dropdown-name  { font-weight: 600; font-size: var(--text-sm); color: var(--color-text); }
.dropdown-email { font-size: var(--text-xs); color: var(--color-text-muted); }
.dropdown-role  { font-size: 11px; font-weight: 700; }
.dropdown-divider { height: 1px; background: var(--color-border); margin: 4px 0; }
.dropdown-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; font-size: var(--text-sm); color: var(--color-text);
  transition: background var(--transition-fast); cursor: pointer; width: 100%;
  border: none; background: none; text-align: left;
}
.dropdown-item:hover { background: var(--color-surface-alt); }
.dropdown-item--danger { color: #dc2626; }
.dropdown-item--danger:hover { background: #fef2f2; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 150ms ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px) scale(.97); }

@media (max-width: 768px) {
  .desktop-only { display: none; }
  .mobile-menu-btn { display: flex; }
  .brand-logo { height: 32px; }
  .app-header { padding: 0 var(--space-md); }
  .plan-badge { display: none; }
}

/* Sur très petits écrans, le dropdown s'ancre à gauche pour ne pas déborder */
@media (max-width: 400px) {
  .user-dropdown { right: auto; left: -60px; }
}
</style>
