<template>
  <div class="tfa-page">
    <div class="tfa-card">
      <img src="/logo.png" alt="Movyx" class="tfa-logo" />
      <h2 class="tfa-title">Double authentification</h2>

      <!-- Étape 1 : vérification du code après login -->
      <template v-if="mode === 'verify'">
        <p class="tfa-desc">
          Entrez le code à 6 chiffres affiché dans votre application d'authentification
          (Google Authenticator, Authy…).
        </p>
        <div v-if="error" class="tfa-error">{{ error }}</div>
        <div class="tfa-otp-row">
          <input
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="tfa-otp-input"
            @keyup.enter="verifyCode"
            autofocus
          />
          <button class="btn btn-primary" @click="verifyCode" :disabled="loading || code.length !== 6">
            {{ loading ? 'Vérification…' : 'Vérifier' }}
          </button>
        </div>
        <button class="link-btn" @click="cancelLogin">Annuler et se déconnecter</button>
      </template>

      <!-- Étape 2 : activation du 2FA (depuis le profil) -->
      <template v-else-if="mode === 'setup'">
        <template v-if="!secretGenerated">
          <p class="tfa-desc">
            Activez la double authentification pour sécuriser votre compte.
            Vous aurez besoin d'une application comme
            <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
          </p>
          <button class="btn btn-primary" @click="generateSecret" :disabled="loading">
            {{ loading ? 'Génération…' : 'Activer le 2FA' }}
          </button>
        </template>

        <template v-else>
          <p class="tfa-desc">
            1. Scannez ce QR code avec votre application d'authentification.<br/>
            2. Entrez ensuite le code à 6 chiffres pour confirmer l'activation.
          </p>
          <div class="tfa-qr-wrapper">
            <canvas ref="qrCanvas" class="tfa-qr"></canvas>
          </div>
          <p class="tfa-secret-label">
            Clé manuelle :
            <code class="tfa-secret-code">{{ formattedSecret }}</code>
          </p>
          <div v-if="error" class="tfa-error">{{ error }}</div>
          <div v-if="successMsg" class="tfa-success">{{ successMsg }}</div>
          <div class="tfa-otp-row">
            <input
              v-model="code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="000000"
              class="tfa-otp-input"
              @keyup.enter="confirmSetup"
            />
            <button class="btn btn-primary" @click="confirmSetup" :disabled="loading || code.length !== 6">
              {{ loading ? 'Activation…' : 'Confirmer' }}
            </button>
          </div>
        </template>
      </template>

      <!-- Désactivation du 2FA -->
      <template v-else-if="mode === 'disable'">
        <p class="tfa-desc">
          Entrez votre code actuel pour désactiver le 2FA.
        </p>
        <div v-if="error" class="tfa-error">{{ error }}</div>
        <div v-if="successMsg" class="tfa-success">{{ successMsg }}</div>
        <div class="tfa-otp-row">
          <input
            v-model="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="tfa-otp-input"
            @keyup.enter="confirmDisable"
          />
          <button class="btn btn-danger" @click="confirmDisable" :disabled="loading || code.length !== 6">
            {{ loading ? 'Désactivation…' : 'Désactiver le 2FA' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth.js'
import QRCode from 'qrcode'

const props = defineProps({
  // 'verify' | 'setup' | 'disable'
  mode: { type: String, default: 'verify' },
})

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const mode           = computed(() => props.mode || route.query.mode || 'verify')
const code           = ref('')
const loading        = ref(false)
const error          = ref('')
const successMsg     = ref('')
const secretGenerated = ref(false)
const rawSecret      = ref('')
const qrCanvas       = ref(null)

const formattedSecret = computed(() =>
  rawSecret.value.match(/.{1,4}/g)?.join(' ') || ''
)

// ── Vérification du code au login (le serveur vérifie, jamais le client) ──
async function verifyCode() {
  error.value = ''
  loading.value = true
  try {
    await auth.verifyTwoFactorLogin(code.value)
    router.push(route.query.redirect || '/dashboard')
  } catch (e) {
    error.value = e.message || 'Code incorrect. Réessayez.'
  } finally {
    loading.value = false
  }
}

async function cancelLogin() {
  await auth.logout()
  router.push('/login')
}

// ── Génération du secret TOTP (côté serveur, jamais transmis en clair au-delà du setup) ──
async function generateSecret() {
  loading.value = true
  error.value   = ''
  try {
    const { qrCodeDataUrl, secret } = await auth.setupTwoFactor()
    rawSecret.value = secret
    secretGenerated.value = true
    await nextTick()
    // Le serveur renvoie déjà une image QR encodée — on l'affiche directement,
    // pas de génération TOTP côté client.
    const ctx = qrCanvas.value.getContext('2d')
    const img = new Image()
    img.onload = () => {
      qrCanvas.value.width = img.width
      qrCanvas.value.height = img.height
      ctx.drawImage(img, 0, 0)
    }
    img.src = qrCodeDataUrl
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Confirmation de l'activation (le serveur vérifie le code) ─────────────
async function confirmSetup() {
  error.value = ''
  loading.value = true
  try {
    await auth.enableTwoFactor(code.value)
    successMsg.value = '2FA activé avec succès !'
    setTimeout(() => router.push('/profile'), 1500)
  } catch (e) {
    error.value = e.message || 'Code incorrect. Réessayez.'
  } finally {
    loading.value = false
  }
}

// ── Désactivation (le serveur vérifie le code) ─────────────────────────────
async function confirmDisable() {
  error.value = ''
  loading.value = true
  try {
    await auth.disable2FA(code.value)
    successMsg.value = '2FA désactivé.'
    setTimeout(() => router.push('/profile'), 1500)
  } catch (e) {
    error.value = e.message || 'Code incorrect. Réessayez.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.tfa-page {
  min-height: 100dvh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, #f0fdf4 100%);
  padding: var(--space-xl) var(--space-md);
}

.tfa-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: 40px;
  width: 100%; max-width: 420px;
  box-shadow: var(--shadow-xl);
  display: flex; flex-direction: column; align-items: center; gap: 20px;
}

.tfa-logo  { height: 48px; object-fit: contain; }
.tfa-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-text); margin: 0; text-align: center; }
.tfa-desc  { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; line-height: 1.6; margin: 0; }

.tfa-error   { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--text-sm); width: 100%; text-align: center; }
.tfa-success { background: #f0fdf4; border: 1px solid #86efac; color: #16a34a; border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--text-sm); width: 100%; text-align: center; }

.tfa-otp-row   { display: flex; gap: 10px; width: 100%; }
.tfa-otp-input {
  flex: 1; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
  font-size: 1.4rem; letter-spacing: 0.3em; text-align: center;
  background: var(--color-surface-alt); color: var(--color-text);
}
.tfa-otp-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }

.tfa-qr-wrapper { background: #fff; padding: 12px; border-radius: var(--radius-lg); border: 1px solid var(--color-border); }
.tfa-qr         { display: block; }

.tfa-secret-label { font-size: var(--text-xs); color: var(--color-text-muted); text-align: center; }
.tfa-secret-code  { font-family: monospace; background: var(--color-surface-alt); padding: 2px 6px; border-radius: 4px; user-select: all; letter-spacing: 0.1em; }

.link-btn { background: none; border: none; color: var(--color-text-muted); font-size: var(--text-sm); cursor: pointer; }
.link-btn:hover { color: var(--color-primary); text-decoration: underline; }

.btn-danger {
  background: #dc2626; color: #fff; border: none; border-radius: var(--radius-md);
  padding: 10px 18px; font-size: var(--text-sm); font-weight: 600; cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-danger:hover:not(:disabled) { background: #b91c1c; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
