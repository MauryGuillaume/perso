<template>
  <div class="shell">
    <!-- Nav desktop (sidebar) -->
    <a href="#contenu" class="skip-link">Aller au contenu</a>
    <aside v-if="showNav" class="side-nav">
      <div class="brand">
        <span class="brand-mark">Li</span>
        <span class="brand-name">LIVORA</span>
      </div>
      <nav class="nav-list" aria-label="Navigation principale">
        <RouterLink v-for="item in navItems" :key="item.name" :to="item.to" class="nav-link" active-class="nav-link--active">
          <span class="nav-icon" aria-hidden="true" v-html="item.icon"></span>
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <main id="contenu" class="content" :class="{ 'content--sans-nav': !showNav }" tabindex="-1">
      <RouterView v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </main>

    <!-- Nav mobile (bottom bar) -->
    <nav v-if="showNav" class="bottom-nav" aria-label="Navigation principale">
      <RouterLink v-for="item in navItems" :key="item.name" :to="item.to" class="bottom-link" active-class="bottom-link--active">
        <span class="bottom-icon-wrap" aria-hidden="true">
          <span class="nav-icon" v-html="item.icon"></span>
        </span>
        <span class="bottom-label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <GamificationEventOverlay />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GamificationEventOverlay from '@/components/GamificationEventOverlay.vue'
import { hasStartedProgram } from '@/mock/programState.js'

const route = useRoute()
// Pas de barre de navigation pendant le tout premier questionnaire : elle mènerait nulle part.
const showNav = computed(() => route.name !== 'Onboarding' || hasStartedProgram())

const navItems = [
  { name: 'Today', to: '/aujourd-hui', label: 'Jour', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke-linecap="round"/></svg>' },
  { name: 'Agenda', to: '/agenda', label: 'Agenda', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4" stroke-linecap="round"/></svg>' },
  { name: 'Sport', to: '/sport', label: 'Sport', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5l11 11M4 9l3-3M17 20l3-3M2.5 10.5l3-3 3 3-3 3-3-3zM15.5 13.5l3-3 3 3-3 3-3-3z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { name: 'Nutrition', to: '/nutrition', label: 'Nutrition', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c-1 3-4 4-4 8a4 4 0 008 0c0-4-3-5-4-8z"/><path d="M12 15v6M9 21h6" stroke-linecap="round"/></svg>' },
  { name: 'Profile', to: '/profil', label: 'Profil', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.6-3.6 4.6-5.5 7.5-5.5s5.9 1.9 7.5 5.5" stroke-linecap="round"/></svg>' },
]
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100dvh;
}

/* ── Sidebar (desktop) ─────────────────────────────────────────────── */
.side-nav {
  display: none;
  width: 240px;
  flex-shrink: 0;
  flex-direction: column;
  gap: var(--space-xl);
  padding: var(--space-lg) var(--space-md);
  background: var(--color-night);
  border-right: 2px solid var(--color-ink);
}
.brand { display: flex; align-items: center; gap: 11px; padding: 0 var(--space-sm); }
.brand-mark {
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-accent);
  color: #fff;
  border: 2px solid #fff;
  border-radius: var(--radius-sm);
  font-family: var(--font-display); font-weight: 400; font-size: 1.1rem;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.4);
}
.brand-name { font-family: var(--font-display); font-weight: 400; font-size: 1.2rem; letter-spacing: 0.06em; color: #fff; }

.nav-list { display: flex; flex-direction: column; gap: 4px; }
.nav-link {
  position: relative;
  display: flex; align-items: center; gap: 13px;
  padding: 12px var(--space-md);
  border-radius: var(--radius-sm);
  color: #b8b6ae;
  font-weight: 600;
  font-size: var(--text-sm);
  transition: background var(--transition-base), color var(--transition-fast);
}
.nav-link:hover { background: rgba(255,255,255,0.07); color: #fff; }
.nav-link:active { transform: scale(0.98); }
.nav-link--active {
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
  box-shadow: 3px 3px 0 rgba(0,0,0,0.35);
}
.nav-icon { width: 20px; height: 20px; flex-shrink: 0; display: inline-flex; }
.nav-icon :deep(svg) { width: 100%; height: 100%; transition: transform var(--transition-bounce); }
.nav-link--active .nav-icon :deep(svg) { transform: scale(1.08); }

.content { flex: 1; min-width: 0; padding-bottom: 88px; background: var(--color-bg); outline: none; }
.content--sans-nav { padding-bottom: 0; }
.skip-link {
  position: absolute; left: 8px; top: -60px; z-index: 50;
  padding: 10px 14px; background: var(--color-accent); color: #fff; font-weight: 700; border-radius: var(--radius-sm);
}
.skip-link:focus { top: 8px; }

/* ── Bottom nav (mobile) ───────────────────────────────────────────── */
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  padding: 10px 6px calc(10px + env(safe-area-inset-bottom));
  background: var(--color-night);
  border-top: 2px solid var(--color-ink);
  clip-path: polygon(0 10px, 100% 0, 100% 100%, 0 100%);
  z-index: 20;
}
.bottom-link {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 2px 10px;
  color: #a9a69d;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: color var(--transition-fast);
}
.bottom-link:active { transform: scale(0.92); }
.bottom-icon-wrap {
  position: relative;
  width: 44px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%);
  transition: background var(--transition-bounce), transform var(--transition-bounce);
}
.nav-icon :deep(svg) { transition: transform var(--transition-bounce), stroke var(--transition-fast); }
.bottom-link--active { color: #fff; }
.bottom-link--active .bottom-icon-wrap {
  background: var(--color-accent);
  transform: translateY(-2px);
}
.bottom-link--active .nav-icon :deep(svg) { transform: scale(1.05); }

@media (prefers-reduced-motion: reduce) {
  .bottom-link:active { transform: none; }
  .bottom-link--active .bottom-icon-wrap,
  .bottom-link--active .nav-icon :deep(svg) { transform: none; }
}

@media (min-width: 900px) {
  .side-nav { display: flex; }
  .bottom-nav { display: none; }
  .content { padding-bottom: 0; }
}

/* ── Transition entre pages ────────────────────────────────────────── */
.page-enter-active,
.page-leave-active {
  transition: opacity 200ms cubic-bezier(0.34, 1, 0.64, 1), transform 200ms cubic-bezier(0.34, 1, 0.64, 1);
}
.page-enter-from { opacity: 0; transform: translateY(10px); }
.page-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .page-enter-active, .page-leave-active { transition: opacity 90ms linear; }
  .page-enter-from, .page-leave-to { transform: none; }
}
</style>
