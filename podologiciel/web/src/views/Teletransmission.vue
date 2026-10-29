<template>
  <div class="iframe-page">
    <div class="iframe-header">
      <div class="iframe-title">
        <span class="iframe-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </span>
        Télétransmission – Anaël
      </div>
      <a
        href="https://www.anael.fr/moncompte/login"
        target="_blank"
        rel="noopener noreferrer"
        class="open-external-btn"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Ouvrir dans un nouvel onglet
      </a>
    </div>

    <div class="iframe-wrapper">
      <iframe
        src="https://www.anael.fr/moncompte/login"
        title="Télétransmission Anaël"
        allow="fullscreen"
        referrerpolicy="no-referrer-when-downgrade"
        @load="onLoad"
        @error="onError"
      />
      <div v-if="blocked" class="iframe-blocked">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
        <h3>Anaël ne peut pas être affiché ici</h3>
        <p>Pour des raisons de sécurité, Anaël (Ameli) interdit l'intégration dans une iframe.<br>Ouvrez-le directement dans votre navigateur.</p>
        <a
          href="https://www.anael.fr/moncompte/login"
          target="_blank"
          rel="noopener noreferrer"
          class="blocked-btn"
        >
          Ouvrir Anaël
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const blocked = ref(false)

function onLoad(e) {
  try {
    const doc = e.target.contentDocument
    if (!doc || doc.body?.innerHTML === '') blocked.value = true
  } catch {
    blocked.value = true
  }
}

function onError() {
  blocked.value = true
}
</script>

<style scoped>
.iframe-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--header-height) - var(--banner-h, 0px) - 2 * var(--space-lg));
  gap: var(--space-md);
}

.iframe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.iframe-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
}

.iframe-icon {
  display: flex;
  align-items: center;
  color: #0891b2;
}

.open-external-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  padding: 6px 14px;
  transition: all var(--transition-fast);
}

.open-external-btn:hover {
  background: var(--color-primary);
  color: white;
}

.iframe-wrapper {
  flex: 1;
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  background: var(--color-surface);
}

.iframe-wrapper iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.iframe-blocked {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  background: var(--color-surface);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-xl);
}

.iframe-blocked h3 {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.iframe-blocked p {
  font-size: var(--text-sm);
  line-height: 1.6;
  margin: 0;
  max-width: 420px;
}

.blocked-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-md);
  padding: 10px 20px;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: opacity var(--transition-fast);
  margin-top: var(--space-sm);
}

.blocked-btn:hover {
  opacity: 0.85;
}
</style>
