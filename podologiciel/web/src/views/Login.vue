<template>
  <div class="login-page">
    <RouterLink to="/landing" class="login-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Retour
    </RouterLink>

    <div class="login-card">
      <img src="/logo.png" alt="Movyx" class="login-logo" />

      <!-- Tabs login / register -->
      <div class="login-tabs">
        <button class="login-tab" :class="{ active: mode === 'login' }" @click="mode = 'login'">Se connecter</button>
        <button class="login-tab" :class="{ active: mode === 'register' }" @click="mode = 'register'">Créer un compte</button>
      </div>

      <!-- Error -->
      <div v-if="error" class="login-error">{{ error }}</div>

      <!-- ── Login ── -->
      <form v-if="mode === 'login'" @submit.prevent="doLogin" class="login-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="loginForm.email" type="email" class="form-input" placeholder="votre@email.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <div class="input-with-eye">
            <input v-model="loginForm.password" :type="showPwd ? 'text' : 'password'" class="form-input" placeholder="••••••••" required autocomplete="current-password" />
            <button type="button" class="eye-btn" @click="showPwd = !showPwd" tabindex="-1">
              <svg v-if="!showPwd" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
        <p class="login-switch">
          <RouterLink to="/forgot-password" class="link-btn">Mot de passe oublié ?</RouterLink>
        </p>
        <p class="login-switch">Pas encore de compte ? <button type="button" @click="mode='register'" class="link-btn">Créer un compte</button></p>
      </form>

      <!-- ── Register ── -->
      <form v-else @submit.prevent="doRegister" class="login-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Prénom</label>
            <input v-model="regForm.prenom" type="text" class="form-input" placeholder="Jean" required autocomplete="given-name" />
          </div>
          <div class="form-group">
            <label class="form-label">Nom</label>
            <input v-model="regForm.nom" type="text" class="form-input" placeholder="Dupont" required autocomplete="family-name" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Cabinet / Établissement</label>
          <input v-model="regForm.cabinet" type="text" class="form-input" placeholder="Cabinet de podologie..." autocomplete="organization" />
        </div>
        <div class="form-group">
          <label class="form-label">Email professionnel</label>
          <input v-model="regForm.email" type="email" class="form-input" placeholder="votre@email.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <div class="input-with-eye">
            <input v-model="regForm.password" :type="showPwd ? 'text' : 'password'" class="form-input" placeholder="8 caractères minimum" required minlength="6" autocomplete="new-password" />
            <button type="button" class="eye-btn" @click="showPwd = !showPwd" tabindex="-1">
              <svg v-if="!showPwd" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirmer le mot de passe</label>
          <input v-model="regForm.confirm" :type="showPwd ? 'text' : 'password'" class="form-input" placeholder="••••••••" required autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Création…' : 'Créer mon compte' }}
        </button>
        <p class="login-switch">Déjà un compte ? <button type="button" @click="mode='login'" class="link-btn">Se connecter</button></p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth.js'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const mode    = ref(route.query.mode === 'register' ? 'register' : 'login')
const loading = ref(false)
const error   = ref('')
const showPwd = ref(false)

const loginForm = ref({ email: '', password: '' })
const regForm   = ref({ prenom: '', nom: '', cabinet: '', email: '', password: '', confirm: '' })

async function doLogin() {
  error.value = ''
  loading.value = true
  try {
    const { requires2fa } = await auth.login(loginForm.value.email, loginForm.value.password)
    // Le serveur (pas le client) décide si le 2FA est requis — cf packages/auth,
    // login() ne renvoie les tokens finaux qu'après vérification du code.
    if (requires2fa) {
      router.push({ name: 'TwoFactor', query: { mode: 'verify', redirect: route.query.redirect || '/dashboard' } })
    } else {
      router.push(route.query.redirect || '/dashboard')
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  error.value = ''
  if (regForm.value.password !== regForm.value.confirm) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  if (regForm.value.password.length < 6) {
    error.value = 'Le mot de passe doit faire au moins 6 caractères'
    return
  }
  loading.value = true
  try {
    await auth.register({
      email:    regForm.value.email,
      password: regForm.value.password,
      nom:      regForm.value.nom,
      prenom:   regForm.value.prenom,
      cabinet:  regForm.value.cabinet,
    })
    router.push('/dashboard')
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
.login-logo { height: 56px; display: block; margin: 0 auto 28px; object-fit: contain; }

.login-tabs { display: flex; background: var(--color-surface-alt); border-radius: var(--radius-lg); padding: 4px; margin-bottom: 24px; }
.login-tab {
  flex: 1; padding: 10px; border-radius: var(--radius-md);
  font-size: var(--text-sm); font-weight: 500; color: var(--color-text-muted);
  transition: all var(--transition-fast); background: transparent; border: none; cursor: pointer;
}
.login-tab.active { background: var(--color-surface); color: var(--color-primary); font-weight: 600; box-shadow: var(--shadow-sm); }

.login-error {
  background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626;
  border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--text-sm);
  margin-bottom: 16px;
}

.login-form { display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }

.input-with-eye { position: relative; }
.input-with-eye .form-input { padding-right: 42px; }
.eye-btn {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: var(--color-text-muted);
  display: flex; align-items: center;
}
.eye-btn:hover { color: var(--color-text); }

.login-switch { font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; }
.link-btn { background: none; border: none; color: var(--color-primary); font-weight: 600; cursor: pointer; font-size: inherit; text-decoration: none; }
.link-btn:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .login-card { padding: 28px 20px; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
