<template>
  <div class="login-page">
    <RouterLink to="/login" class="login-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Retour
    </RouterLink>

    <div class="login-card">
      <img src="/logo.png" alt="Movyx" class="login-logo" />
      <h1 class="login-title">Mot de passe oublié</h1>

      <template v-if="sent">
        <p class="login-info">
          Si un compte existe pour <strong>{{ submittedEmail }}</strong>, un email avec un lien de réinitialisation
          vient d'être envoyé. Le lien est valable 30 minutes.
        </p>
        <RouterLink to="/login" class="btn btn-primary" style="width:100%; text-align:center; display:block;">Retour à la connexion</RouterLink>
      </template>

      <form v-else @submit.prevent="submit" class="login-form">
        <p class="login-info">Indiquez votre email professionnel, nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
        <div v-if="error" class="login-error">{{ error }}</div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="email" type="email" class="form-input" placeholder="votre@email.com" required autocomplete="email" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Envoi…' : 'Envoyer le lien' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api.js'

const email = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)
const submittedEmail = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    // Le serveur renvoie toujours { emailed: true } que le compte existe ou non
    // (ne jamais révéler l'existence d'un compte) — on affiche donc toujours le
    // même message de confirmation, indépendamment de la réponse.
    await api.forgotPassword(email.value)
    submittedEmail.value = email.value
    sent.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, #f0fdf4 100%);
  padding: var(--space-xl) var(--space-md);
}
.login-back {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--text-sm); color: var(--color-text-muted);
  position: absolute; top: 24px; left: 24px;
  transition: color var(--transition-fast);
}
.login-back:hover { color: var(--color-primary); }

.login-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: 40px;
  width: 100%; max-width: 460px;
  box-shadow: var(--shadow-xl);
}
.login-logo { height: 56px; display: block; margin: 0 auto 20px; object-fit: contain; }
.login-title { font-size: var(--text-lg); font-weight: 700; text-align: center; margin: 0 0 20px; color: var(--color-text); }
.login-info { font-size: var(--text-sm); color: var(--color-text-muted); margin: 0 0 16px; line-height: 1.5; }

.login-error {
  background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626;
  border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--text-sm);
  margin-bottom: 16px;
}

.login-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }

@media (max-width: 480px) {
  .login-card { padding: 28px 20px; }
}
</style>
