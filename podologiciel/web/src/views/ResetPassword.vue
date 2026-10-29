<template>
  <div class="login-page">
    <RouterLink to="/login" class="login-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Retour
    </RouterLink>

    <div class="login-card">
      <img src="/logo.png" alt="Movyx" class="login-logo" />
      <h1 class="login-title">Réinitialiser le mot de passe</h1>

      <template v-if="!token">
        <p class="login-error">Ce lien de réinitialisation est invalide. Demandez-en un nouveau.</p>
        <RouterLink to="/forgot-password" class="btn btn-primary" style="width:100%; text-align:center; display:block;">Demander un nouveau lien</RouterLink>
      </template>

      <template v-else-if="done">
        <p class="login-info">Votre mot de passe a bien été mis à jour.</p>
        <RouterLink to="/login" class="btn btn-primary" style="width:100%; text-align:center; display:block;">Se connecter</RouterLink>
      </template>

      <form v-else @submit.prevent="submit" class="login-form">
        <div v-if="error" class="login-error">{{ error }}</div>
        <div class="form-group">
          <label class="form-label">Nouveau mot de passe</label>
          <div class="input-with-eye">
            <input v-model="password" :type="showPwd ? 'text' : 'password'" class="form-input" placeholder="8 caractères minimum" required minlength="6" autocomplete="new-password" />
            <button type="button" class="eye-btn" @click="showPwd = !showPwd" tabindex="-1">
              <svg v-if="!showPwd" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirmer le mot de passe</label>
          <input v-model="confirm" :type="showPwd ? 'text' : 'password'" class="form-input" placeholder="••••••••" required autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Mise à jour…' : 'Réinitialiser le mot de passe' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api } from '@/api.js'

const route = useRoute()
const router = useRouter()

const token = route.query.token || ''
const password = ref('')
const confirm = ref('')
const showPwd = ref(false)
const loading = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== confirm.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Le mot de passe doit faire au moins 6 caractères'
    return
  }
  loading.value = true
  try {
    await api.resetPassword(token, password.value)
    done.value = true
  } catch (e) {
    // Le token peut être invalide, expiré, ou déjà utilisé (il s'invalide de lui-même
    // si le mot de passe a changé entre-temps, cf packages/auth) — message générique.
    error.value = 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.'
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

.input-with-eye { position: relative; }
.input-with-eye .form-input { padding-right: 42px; }
.eye-btn {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: var(--color-text-muted);
  display: flex; align-items: center;
}
.eye-btn:hover { color: var(--color-text); }

@media (max-width: 480px) {
  .login-card { padding: 28px 20px; }
}
</style>
