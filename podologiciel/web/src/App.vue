<template>
  <div
    :data-theme="uiStore.theme"
    :data-admin="isAdminMode"
    class="app-root"
    :style="{ '--banner-h': bannerHeight, '--banner-viewas-h': authStore.isViewingAs ? '36px' : '0px' }"
  >
    <!-- Pages sans layout (Landing, Login) -->
    <template v-if="isPublicPage">
      <RouterView />
    </template>

    <!-- App avec layout complet -->
    <template v-else>
      <!-- Bandeau "Vue comme" pour les admins -->
      <div v-if="authStore.isViewingAs" class="view-as-banner">
        <span>
          👁 Vue comme
          <strong>{{ authStore.viewAsUser?.prenom }} {{ authStore.viewAsUser?.nom }}</strong>
          ({{ authStore.viewAsUser?.role }})
          — vous restez administrateur
        </span>
        <button class="view-as-stop" @click="authStore.stopViewAs()">✕ Revenir à ma vue</button>
      </div>

      <!-- Bandeau "Données mock" -->
      <div v-if="uiStore.mockMode && !isPublicPage" class="mock-banner">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Mode démonstration — données fictives actives</span>
        <RouterLink to="/admin" class="mock-banner-link" @click.native="goToMockTab">Gérer</RouterLink>
      </div>

      <AppHeader />

      <div class="app-layout">
        <AppSidebar />
        <main class="app-main">
          <!-- Bandeau fond admin (route admin OU viewAs actif) -->
          <div v-if="isAdminMode" class="admin-mode-bar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span v-if="authStore.isViewingAs">
              Mode administrateur · vue comme <strong>{{ authStore.viewAsUser?.prenom }} {{ authStore.viewAsUser?.nom }}</strong>
            </span>
            <span v-else>Mode administrateur</span>
          </div>

          <RouterView v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" :key="$route.path" />
            </Transition>
          </RouterView>
        </main>
      </div>
      <HUD />
      <AppBottomNav />

      <!-- Contact flottant -->
      <a href="mailto:contact@movyx.com" class="contact-fab" title="Contacter Movyx">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span class="contact-fab-tooltip">contact@movyx.com</span>
      </a>
    </template>

    <!-- Onboarding (premier accès) -->
    <OnboardingSlides v-model="showOnboarding" @update:modelValue="onOnboardingClose" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { useUIStore }   from '@/store/ui.js'
import { useAuthStore } from '@/store/auth.js'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppBottomNav from '@/components/layout/AppBottomNav.vue'
import HUD from '@/components/layout/HUD.vue'
import OnboardingSlides from '@/components/onboarding/OnboardingSlides.vue'

const uiStore   = useUIStore()
const authStore = useAuthStore()
const route     = useRoute()
const router    = useRouter()

const PUBLIC_ROUTES = ['Landing', 'Login']
const isPublicPage  = computed(() => PUBLIC_ROUTES.includes(route.name))

// Fond admin = route /admin OU viewAs actif (l'admin reste identifiable)
const isAdminMode = computed(() =>
  authStore.isAdmin && (route.name === 'AdminHUD' || authStore.isViewingAs)
)

// Hauteur du bandeau : view-as + mock peuvent s'empiler
const bannerHeight = computed(() => {
  const rows = (authStore.isViewingAs ? 1 : 0) + (!isPublicPage.value && uiStore.mockMode ? 1 : 0)
  return rows === 0 ? '0px' : rows === 1 ? '36px' : '72px'
})

function goToMockTab() {
  // Stocke temporairement l'onglet désiré dans sessionStorage pour que AdminHUD l'ouvre
  sessionStorage.setItem('adminTab', 'mock')
}

const showOnboarding = ref(false)

onMounted(() => {
  document.documentElement.setAttribute('data-theme', uiStore.theme)
  checkOnboarding()
})

watch(() => authStore.currentUser, (u) => { if (u) checkOnboarding() })

function checkOnboarding() {
  if (authStore.currentUser?.firstLogin && !isPublicPage.value) {
    showOnboarding.value = true
  }
}
function onOnboardingClose() {
  authStore.markOnboardingDone()
  showOnboarding.value = false
}
</script>

<style scoped>
.app-root { min-height: 100dvh; display: flex; flex-direction: column; }

/* ── admin background ── */
[data-admin="true"] { background: #f5f3ff; }
[data-admin="true"][data-theme="dark"] { background: #1e1730; }

.admin-mode-bar {
  display: flex; align-items: center; gap: 8px;
  background: #ede9fe; border: 1px solid #c4b5fd;
  border-radius: var(--radius-lg); padding: 8px 16px;
  font-size: var(--text-xs); font-weight: 600; color: #6d28d9;
  margin-bottom: var(--space-lg);
}
[data-theme="dark"] .admin-mode-bar { background: #2e1f5e; border-color: #7c3aed; color: #c4b5fd; }

/* ── layout (tient compte du --banner-h injecté en inline) ── */
.app-layout {
  display: flex; flex: 1;
  padding-top: calc(var(--header-height) + var(--banner-h, 0px));
}
.app-main {
  flex: 1; min-width: 0; padding: var(--space-lg); overflow-x: hidden;
  /* Espace pour la sidebar fixe sur desktop */
  margin-left: var(--sidebar-width);
}

.page-enter-active, .page-leave-active { transition: all 180ms ease; }
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to   { opacity: 0; transform: translateY(-6px); }

/* ── view-as banner ── */
.view-as-banner {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: var(--banner-h, 36px);
  background: #7c3aed; color: white;
  display: flex; align-items: center; justify-content: center; gap: 20px;
  padding: 0 20px; font-size: var(--text-xs); font-weight: 500;
  white-space: nowrap; overflow: hidden;
}
.view-as-stop {
  background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4);
  color: white; border-radius: var(--radius-md); padding: 3px 12px; flex-shrink: 0;
  cursor: pointer; font-size: var(--text-xs); font-weight: 600;
  transition: background var(--transition-fast);
}
.view-as-stop:hover { background: rgba(255,255,255,.35); }

/* ── Mock banner ── */
.mock-banner {
  position: fixed; top: var(--banner-viewas-h, 0px); left: 0; right: 0; z-index: 199;
  height: 36px;
  background: #f59e0b; color: #1c1917;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 0 20px; font-size: var(--text-xs); font-weight: 600;
  white-space: nowrap; overflow: hidden;
}
.mock-banner-link {
  background: rgba(0,0,0,.12); border: 1px solid rgba(0,0,0,.2);
  color: #1c1917; border-radius: var(--radius-md); padding: 2px 10px;
  font-size: var(--text-xs); font-weight: 700; flex-shrink: 0;
  transition: background var(--transition-fast);
}
.mock-banner-link:hover { background: rgba(0,0,0,.22); }

/* ── Contact FAB ── */
.contact-fab {
  position: fixed; bottom: 24px; left: 24px; z-index: 490;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-full); width: 42px; height: 42px;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-muted); box-shadow: var(--shadow-md);
  transition: all var(--transition-base); overflow: visible;
}
.contact-fab:hover { color: var(--color-primary); border-color: var(--color-primary); width: auto; padding: 0 16px; gap: 8px; }
.contact-fab-tooltip { display: none; white-space: nowrap; font-size: var(--text-sm); font-weight: 500; }
.contact-fab:hover .contact-fab-tooltip { display: block; }

@media (max-width: 900px) {
  /* Sur mobile/tablette, la sidebar est un drawer — pas besoin de margin */
  .app-main { margin-left: 0; }
}

@media (max-width: 768px) {
  .app-main {
    padding: var(--space-md) var(--space-sm);
    /* Espace pour la bottom nav */
    padding-bottom: calc(var(--bottom-nav-height, 60px) + var(--space-md));
  }
  .contact-fab { display: none; }
}
</style>
