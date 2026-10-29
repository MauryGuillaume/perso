<template>
  <Teleport to="body">
    <div class="hud-container" aria-live="polite">
      <TransitionGroup name="notif" tag="div" class="notifications-list">
        <div
          v-for="notif in uiStore.notifications"
          :key="notif.id"
          class="notification"
          :class="`notification--${notif.type}`"
          @click="uiStore.removeNotification(notif.id)"
        >
          <span class="notif-icon">
            <svg v-if="notif.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg v-else-if="notif.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <svg v-else-if="notif.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </span>
          <span class="notif-message">{{ notif.message }}</span>
          <button class="notif-close" @click.stop="uiStore.removeNotification(notif.id)" aria-label="Fermer">×</button>
        </div>
      </TransitionGroup>
    </div>

    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="uiStore.loading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner" />
          <span>Chargement…</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useUIStore } from '@/store/ui.js'
const uiStore = useUIStore()
</script>

<style scoped>
.hud-container {
  position: fixed; bottom: var(--space-lg); right: var(--space-lg);
  z-index: 9999; display: flex; flex-direction: column; gap: var(--space-sm);
  pointer-events: none;
}
.notifications-list { display: flex; flex-direction: column; gap: var(--space-sm); }

.notification {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: var(--radius-md);
  min-width: 280px; max-width: 400px;
  font-size: var(--text-sm); font-weight: 500;
  box-shadow: var(--shadow-lg);
  pointer-events: all; cursor: pointer;
  backdrop-filter: blur(12px);
  animation: slideUp 200ms ease both;
}
.notification--success { background: rgba(220,252,231,.95); color: #14532d; border: 1px solid #86efac; }
.notification--error   { background: rgba(254,226,226,.95); color: #7f1d1d; border: 1px solid #fca5a5; }
.notification--warning { background: rgba(254,243,199,.95); color: #78350f; border: 1px solid #fcd34d; }
.notification--info    { background: rgba(219,234,254,.95); color: #1e3a5f; border: 1px solid #93c5fd; }

.notif-icon { display: flex; align-items: center; flex-shrink: 0; }
.notif-message { flex: 1; }
.notif-close { background: none; border: none; font-size: 18px; line-height: 1; opacity: .5; transition: opacity var(--transition-fast); padding: 0 2px; color: inherit; }
.notif-close:hover { opacity: 1; }

.loading-overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(0,0,0,.35); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.loading-spinner {
  background: var(--color-surface);
  padding: var(--space-xl);
  border-radius: var(--radius-xl);
  display: flex; flex-direction: column; align-items: center; gap: var(--space-md);
  box-shadow: var(--shadow-xl);
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }

.notif-enter-active { transition: all 200ms ease; }
.notif-leave-active { transition: all 200ms ease; }
.notif-enter-from { opacity: 0; transform: translateX(20px); }
.notif-leave-to { opacity: 0; transform: translateX(20px); }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .hud-container { bottom: var(--space-md); right: var(--space-sm); left: var(--space-sm); }
  .notification { min-width: 0; width: 100%; }
}
</style>
