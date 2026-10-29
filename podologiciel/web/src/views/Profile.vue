<template>
  <div class="profile fade-in">
    <div class="profile-header">
      <RouterLink to="/dashboard" class="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Retour
      </RouterLink>
      <h1 class="profile-title">Mon profil</h1>
    </div>

    <div class="profile-grid">
      <!-- ── Colonne gauche : avatar + rôle ────────────────────── -->
      <div class="profile-aside">
        <div class="avatar-card card">
          <!-- Avatar cliquable -->
          <div class="avatar-wrap" @click="triggerFileInput" title="Changer la photo">
            <img v-if="photoPreview" :src="photoPreview" class="avatar-img" alt="Photo de profil" />
            <div v-else class="avatar-initials" :style="{ background: avatarColor }">{{ initials }}</div>
            <div class="avatar-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Changer</span>
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onPhotoChange" />

          <div class="avatar-info">
            <div class="avatar-name">{{ form.prenom }} {{ form.nom }}</div>
            <div class="avatar-email">{{ authStore.currentUser?.email }}</div>
            <span class="avatar-role-badge" :style="{ background: roleBadgeBg, color: roleColor }">
              {{ roleName }}
            </span>
          </div>

          <!-- Bouton supprimer photo -->
          <button v-if="photoPreview && photoPreview !== defaultPhoto" class="btn btn-ghost btn-sm del-photo" @click="removePhoto">
            Supprimer la photo
          </button>
        </div>

        <!-- Plan info -->
        <div class="plan-card card">
          <div class="plan-label">Plan actuel</div>
          <div class="plan-name" :style="{ color: roleColor }">{{ roleName }}</div>
          <div v-if="authStore.currentUser?.role === 'free'" class="plan-desc">
            Limité à 10 patients.<br>
            <a href="mailto:contact@movyx.com" class="upgrade-link">Passer en Pro →</a>
          </div>
          <div v-else-if="authStore.currentUser?.role === 'vip'" class="plan-desc plan-desc--vip">
            ⭐ Accès complet sans abonnement
          </div>
          <div v-else-if="authStore.currentUser?.role === 'pro'" class="plan-desc plan-desc--pro">
            Accès complet à toutes les fonctionnalités
          </div>
        </div>
      </div>

      <!-- ── Colonne droite : formulaires ─────────────────────── -->
      <div class="profile-main">
        <!-- Infos personnelles -->
        <div class="card profile-section">
          <h2 class="section-title">Informations personnelles</h2>
          <div v-if="infoSuccess" class="success-bar">✓ Profil mis à jour</div>
          <div v-if="infoError" class="error-bar">{{ infoError }}</div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input v-model="form.prenom" class="form-input" placeholder="Prénom" />
            </div>
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input v-model="form.nom" class="form-input" placeholder="Nom" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Cabinet / Établissement</label>
            <input v-model="form.cabinet" class="form-input" placeholder="Cabinet de podologie…" />
          </div>
          <div class="form-group">
            <label class="form-label">Email <span class="field-readonly">(non modifiable)</span></label>
            <input :value="authStore.currentUser?.email" class="form-input" disabled />
          </div>

          <div class="section-actions">
            <button class="btn btn-primary" @click="saveInfo" :disabled="savingInfo">
              {{ savingInfo ? 'Enregistrement…' : 'Enregistrer les infos' }}
            </button>
          </div>
        </div>

        <!-- Infos professionnelles -->
        <div class="card profile-section">
          <h2 class="section-title">Informations professionnelles</h2>
          <p class="section-desc">Ces informations apparaissent sur vos factures PDF.</p>
          <div v-if="proSuccess" class="success-bar">✓ Informations professionnelles mises à jour</div>
          <div v-if="proError" class="error-bar">{{ proError }}</div>
          <div class="form-group">
            <label class="form-label">Adresse du cabinet</label>
            <input v-model="proForm.proAdresse" class="form-input" placeholder="1 rue de la Paix, 75001 Paris" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Téléphone professionnel</label>
              <input v-model="proForm.proTelephone" class="form-input" placeholder="01 23 45 67 89" />
            </div>
            <div class="form-group">
              <label class="form-label">Email professionnel</label>
              <input v-model="proForm.proEmail" type="email" class="form-input" placeholder="cabinet@email.fr" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Numéro SIRET</label>
            <input v-model="proForm.proSiret" class="form-input" placeholder="XXX XXX XXX XXXXX" maxlength="20" />
          </div>
          <div class="section-actions">
            <button class="btn btn-primary" @click="savePro" :disabled="savingPro">
              {{ savingPro ? 'Enregistrement…' : 'Enregistrer les infos pro' }}
            </button>
          </div>
        </div>

        <!-- Signature & Tampon PDF -->
        <div class="card profile-section">
          <h2 class="section-title">Signature &amp; Tampon PDF</h2>
          <p class="section-desc">Ces éléments peuvent apparaître sur vos factures PDF générées.</p>
          <div v-if="sigSuccess" class="success-bar">✓ Signature et tampon enregistrés</div>

          <!-- Option d'affichage -->
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Affichage sur les factures PDF</label>
            <div class="sig-option-group">
              <label
                v-for="opt in sigOptions"
                :key="opt.value"
                class="sig-option"
                :class="{ active: sigForm.signatureOption === opt.value }"
              >
                <input type="radio" :value="opt.value" v-model="sigForm.signatureOption" style="display:none" />
                <span class="sig-opt-icon">{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-row">
            <!-- Signature -->
            <div class="form-group">
              <label class="form-label">Signature du praticien</label>
              <div class="img-upload-zone" @click="sigFileInput?.click()">
                <img v-if="sigForm.signatureImage" :src="sigForm.signatureImage" class="sig-preview" alt="Signature" />
                <div v-else class="img-upload-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                  <span>Cliquer pour importer</span>
                  <span class="img-upload-hint">PNG, JPG – fond transparent recommandé</span>
                </div>
              </div>
              <input ref="sigFileInput" type="file" accept="image/*" style="display:none" @change="onSigChange" />
              <button v-if="sigForm.signatureImage" class="btn btn-ghost btn-sm" style="margin-top:6px;color:#dc2626" @click="sigForm.signatureImage = ''">
                Supprimer la signature
              </button>
            </div>

            <!-- Tampon -->
            <div class="form-group">
              <label class="form-label">Tampon / Cachet</label>
              <div class="img-upload-zone" @click="tampFileInput?.click()">
                <img v-if="sigForm.tamponnImage" :src="sigForm.tamponnImage" class="sig-preview" alt="Tampon" />
                <div v-else class="img-upload-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
                  <span>Cliquer pour importer</span>
                  <span class="img-upload-hint">PNG, JPG – fond transparent recommandé</span>
                </div>
              </div>
              <input ref="tampFileInput" type="file" accept="image/*" style="display:none" @change="onTampChange" />
              <button v-if="sigForm.tamponnImage" class="btn btn-ghost btn-sm" style="margin-top:6px;color:#dc2626" @click="sigForm.tamponnImage = ''">
                Supprimer le tampon
              </button>
            </div>
          </div>

          <div class="section-actions">
            <button class="btn btn-primary" @click="saveSig" :disabled="savingSig">
              {{ savingSig ? 'Enregistrement…' : 'Enregistrer signature & tampon' }}
            </button>
          </div>
        </div>

        <!-- Mot de passe -->
        <div class="card profile-section">
          <h2 class="section-title">Changer le mot de passe</h2>
          <div v-if="pwdSuccess" class="success-bar">✓ Mot de passe mis à jour</div>
          <div v-if="pwdError" class="error-bar">{{ pwdError }}</div>

          <div class="form-group">
            <label class="form-label">Mot de passe actuel</label>
            <div class="input-with-eye">
              <input v-model="pwdForm.current" :type="showCurrent ? 'text' : 'password'" class="form-input" autocomplete="current-password" />
              <button type="button" class="eye-btn" @click="showCurrent = !showCurrent" tabindex="-1">
                <svg v-if="!showCurrent" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nouveau mot de passe</label>
              <div class="input-with-eye">
                <input v-model="pwdForm.next" :type="showNext ? 'text' : 'password'" class="form-input" autocomplete="new-password" />
                <button type="button" class="eye-btn" @click="showNext = !showNext" tabindex="-1">
                  <svg v-if="!showNext" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Confirmer</label>
              <input v-model="pwdForm.confirm" :type="showNext ? 'text' : 'password'" class="form-input" autocomplete="new-password" />
            </div>
          </div>

          <!-- Indicateur de force -->
          <div v-if="pwdForm.next" class="pwd-strength">
            <div class="pwd-bar">
              <div class="pwd-fill" :style="{ width: pwdStrength.pct + '%', background: pwdStrength.color }" />
            </div>
            <span :style="{ color: pwdStrength.color }">{{ pwdStrength.label }}</span>
          </div>

          <div class="section-actions">
            <button class="btn btn-primary" @click="savePassword" :disabled="savingPwd || !pwdForm.current || !pwdForm.next">
              {{ savingPwd ? 'Enregistrement…' : 'Changer le mot de passe' }}
            </button>
          </div>
        </div>

        <!-- Double authentification -->
        <div class="card profile-section">
          <h2 class="section-title">Double authentification (2FA)</h2>
          <div class="tfa-status-row">
            <div class="tfa-badge" :class="authStore.currentUser?.twoFactorEnabled ? 'tfa-on' : 'tfa-off'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              {{ authStore.currentUser?.twoFactorEnabled ? '2FA activé' : '2FA désactivé' }}
            </div>
            <p class="tfa-hint">
              {{ authStore.currentUser?.twoFactorEnabled
                ? 'Votre compte est protégé par une application d\'authentification (Google Authenticator, Authy…).'
                : 'Ajoutez une couche de sécurité supplémentaire à votre compte.' }}
            </p>
          </div>
          <div class="section-actions">
            <RouterLink
              v-if="!authStore.currentUser?.twoFactorEnabled"
              :to="{ name: 'TwoFactor', query: { mode: 'setup' } }"
              class="btn btn-primary"
            >
              Activer le 2FA
            </RouterLink>
            <RouterLink
              v-else
              :to="{ name: 'TwoFactor', query: { mode: 'disable' } }"
              class="btn btn-outline"
            >
              Désactiver le 2FA
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore, ROLES } from '@/store/auth.js'
import { useUIStore } from '@/store/ui.js'

const authStore = useAuthStore()
const uiStore   = useUIStore()

// ── Form infos ──────────────────────────────────────────────────────────────
const u = authStore.currentUser
const form = ref({
  prenom:  u?.prenom  || '',
  nom:     u?.nom     || '',
  cabinet: u?.cabinet || '',
})

// ── Infos professionnelles (factures PDF) ────────────────────────────────────
const proForm = ref({
  proAdresse:   u?.proAdresse   || '',
  proTelephone: u?.proTelephone || '',
  proEmail:     u?.proEmail     || '',
  proSiret:     u?.proSiret     || '',
})
const proSuccess = ref(false)
const proError   = ref('')
const savingPro  = ref(false)

async function savePro() {
  proError.value = ''; proSuccess.value = false; savingPro.value = true
  try {
    await authStore.updateProfile({ ...proForm.value })
    proSuccess.value = true
    setTimeout(() => proSuccess.value = false, 3000)
  } catch (e) { proError.value = e.message }
  finally { savingPro.value = false }
}

const infoSuccess = ref(false)
const infoError   = ref('')
const savingInfo  = ref(false)

async function saveInfo() {
  infoError.value = ''; infoSuccess.value = false; savingInfo.value = true
  try {
    await authStore.updateProfile({ prenom: form.value.prenom, nom: form.value.nom, cabinet: form.value.cabinet })
    infoSuccess.value = true
    setTimeout(() => infoSuccess.value = false, 3000)
  } catch (e) { infoError.value = e.message }
  finally { savingInfo.value = false }
}

// ── Photo ───────────────────────────────────────────────────────────────────
const fileInput   = ref(null)
const photoPreview = computed(() => authStore.currentUser?.photo || null)

function triggerFileInput() { fileInput.value?.click() }

function onPhotoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) { uiStore.error('Image trop lourde (max 2 Mo)'); return }
  const reader = new FileReader()
  reader.onload = (ev) => {
    authStore.updateProfile({ photo: ev.target.result })
    uiStore.success('Photo mise à jour')
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function removePhoto() {
  authStore.updateProfile({ photo: null })
  uiStore.info('Photo supprimée')
}

// ── Signature & Tampon ─────────────────────────────────────────────────────
const sigFileInput  = ref(null)
const tampFileInput = ref(null)
const sigSuccess    = ref(false)
const savingSig     = ref(false)

const sigOptions = [
  { value: 'image', icon: '🖼️', label: 'Signature & tampon enregistrés' },
  { value: 'empty', icon: '✏️', label: 'Champs vides à remplir à la main' },
  { value: 'none',  icon: '🚫', label: 'Ne pas afficher les champs' },
]

const sigForm = ref({
  signatureImage:  u?.signatureImage  || '',
  tamponnImage:    u?.tamponnImage    || '',
  signatureOption: u?.signatureOption || 'empty',
})

function readImg(file, maxMb = 1) {
  return new Promise((res, rej) => {
    if (file.size > maxMb * 1024 * 1024) { rej(new Error(`Image trop lourde (max ${maxMb} Mo)`)); return }
    const r = new FileReader()
    r.onload = e => res(e.target.result)
    r.readAsDataURL(file)
  })
}

async function onSigChange(e) {
  const file = e.target.files[0]; if (!file) return
  try { sigForm.value.signatureImage = await readImg(file) } catch (err) { uiStore.error(err.message) }
  e.target.value = ''
}

async function onTampChange(e) {
  const file = e.target.files[0]; if (!file) return
  try { sigForm.value.tamponnImage = await readImg(file) } catch (err) { uiStore.error(err.message) }
  e.target.value = ''
}

async function saveSig() {
  savingSig.value = true
  try {
    await new Promise(r => setTimeout(r, 150))
    authStore.updateProfile({
      signatureImage:  sigForm.value.signatureImage,
      tamponnImage:    sigForm.value.tamponnImage,
      signatureOption: sigForm.value.signatureOption,
    })
    sigSuccess.value = true
    setTimeout(() => sigSuccess.value = false, 3000)
  } finally { savingSig.value = false }
}

// ── Password ────────────────────────────────────────────────────────────────
const pwdForm   = ref({ current: '', next: '', confirm: '' })
const showCurrent = ref(false)
const showNext    = ref(false)
const pwdSuccess  = ref(false)
const pwdError    = ref('')
const savingPwd   = ref(false)

const pwdStrength = computed(() => {
  const p = pwdForm.value.next
  if (!p) return { pct: 0, color: '#e5e7eb', label: '' }
  let score = 0
  if (p.length >= 8)  score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^a-zA-Z0-9]/.test(p)) score++
  const levels = [
    { pct: 20,  color: '#ef4444', label: 'Très faible' },
    { pct: 40,  color: '#f97316', label: 'Faible' },
    { pct: 60,  color: '#eab308', label: 'Moyen' },
    { pct: 80,  color: '#22c55e', label: 'Fort' },
    { pct: 100, color: '#16a34a', label: 'Très fort' },
  ]
  return levels[Math.min(score, 4)]
})

async function savePassword() {
  pwdError.value = ''; pwdSuccess.value = false; savingPwd.value = true
  try {
    if (pwdForm.value.next !== pwdForm.value.confirm) throw new Error('Les mots de passe ne correspondent pas')
    if (pwdForm.value.next.length < 6) throw new Error('Mot de passe trop court (6 caractères min)')
    await authStore.updateProfile({ password: pwdForm.value.next, currentPassword: pwdForm.value.current })
    pwdSuccess.value = true
    pwdForm.value = { current: '', next: '', confirm: '' }
    setTimeout(() => pwdSuccess.value = false, 3000)
  } catch (e) { pwdError.value = e.message }
  finally { savingPwd.value = false }
}

// ── Computed affichage ───────────────────────────────────────────────────────
const initials = computed(() => {
  return ((form.value.prenom?.[0] || '') + (form.value.nom?.[0] || '')).toUpperCase() || '?'
})
const avatarColor = computed(() => {
  const id = authStore.currentUser?.id || ''
  const colors = ['#2B6CB0','#52B848','#7c3aed','#d97706','#dc2626','#0891b2']
  let h = 0; for (const c of id) h = (h << 5) - h + c.charCodeAt(0)
  return colors[Math.abs(h) % colors.length]
})
const roleName    = computed(() => ROLES[authStore.currentUser?.role]?.label || '')
const roleColor   = computed(() => ROLES[authStore.currentUser?.role]?.color || 'var(--color-text-muted)')
const roleBadgeBg = computed(() => {
  const c = roleColor.value
  return c + '20'
})
const defaultPhoto = null
</script>

<style scoped>
.profile { max-width: 960px; margin: 0 auto; }
.profile-header { margin-bottom: var(--space-xl); }
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: 12px;
  transition: color var(--transition-fast);
}
.back-link:hover { color: var(--color-primary); }
.profile-title { font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); }

.profile-grid {
  display: grid; grid-template-columns: 260px 1fr; gap: var(--space-xl); align-items: start;
}

/* ── Aside ── */
.profile-aside { display: flex; flex-direction: column; gap: var(--space-lg); }
.avatar-card.card { padding: 28px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }

.avatar-wrap {
  position: relative; width: 100px; height: 100px; border-radius: 50%; cursor: pointer;
  flex-shrink: 0; overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
.avatar-initials {
  width: 100%; height: 100%; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 32px; font-weight: 700;
}
.avatar-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,.5); display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  color: white; font-size: 11px; font-weight: 600;
  opacity: 0; transition: opacity var(--transition-fast);
}
.avatar-wrap:hover .avatar-overlay { opacity: 1; }

.avatar-name  { font-size: var(--text-lg); font-weight: 700; color: var(--color-text); }
.avatar-email { font-size: var(--text-xs); color: var(--color-text-muted); }
.avatar-role-badge { font-size: var(--text-xs); font-weight: 700; padding: 3px 12px; border-radius: var(--radius-full); }
.del-photo { font-size: var(--text-xs); color: #dc2626; }
.del-photo:hover { background: #fef2f2; }

.plan-card.card { padding: 20px; }
.plan-label { font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); margin-bottom: 6px; }
.plan-name  { font-size: var(--text-xl); font-weight: 800; margin-bottom: 8px; }
.plan-desc  { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.5; }
.section-desc { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: 16px; margin-top: -10px; }
.plan-desc--vip { color: #d97706; font-weight: 500; }
.plan-desc--pro { color: var(--color-primary); }
.upgrade-link { color: var(--color-primary); font-weight: 700; }
.upgrade-link:hover { text-decoration: underline; }

/* ── Main ── */
.profile-main { display: flex; flex-direction: column; gap: var(--space-lg); }
.profile-section.card { padding: 28px; }
.section-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-text); margin-bottom: 20px; }
.section-actions { display: flex; justify-content: flex-end; margin-top: var(--space-lg); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.field-readonly { font-size: var(--text-xs); color: var(--color-text-light); font-weight: 400; }

.success-bar { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--text-sm); margin-bottom: 16px; }
.error-bar   { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; border-radius: var(--radius-md); padding: 10px 14px; font-size: var(--text-sm); margin-bottom: 16px; }

/* 2FA */
.tfa-status-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.tfa-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 9999px; font-size: var(--text-sm); font-weight: 600; width: fit-content; }
.tfa-on  { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
.tfa-off { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.tfa-hint { font-size: var(--text-sm); color: var(--color-text-muted); margin: 0; }

/* Password strength */
.pwd-strength { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.pwd-bar  { flex: 1; height: 4px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.pwd-fill { height: 100%; border-radius: 2px; transition: all 300ms ease; }
.pwd-strength span { font-size: var(--text-xs); font-weight: 600; min-width: 70px; }

/* Eye toggle */
.input-with-eye { position: relative; }
.input-with-eye .form-input { padding-right: 42px; }
.eye-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: flex; align-items: center; }
.eye-btn:hover { color: var(--color-text); }

/* Signature & tampon */
.sig-option-group {
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;
}
.sig-option {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  cursor: pointer; font-size: var(--text-sm);
  transition: all var(--transition-fast); background: var(--color-surface);
}
.sig-option:hover  { border-color: var(--color-primary); color: var(--color-primary); }
.sig-option.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); font-weight: 600; }

.img-upload-zone {
  border: 2px dashed var(--color-border); border-radius: var(--radius-md);
  min-height: 90px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 12px; transition: border-color var(--transition-fast);
  background: var(--color-surface-alt);
}
.img-upload-zone:hover { border-color: var(--color-primary); }

.img-upload-placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-size: var(--text-sm); color: var(--color-text-muted);
}
.img-upload-hint { font-size: var(--text-xs); color: var(--color-text-light); }

.sig-preview {
  max-height: 70px; max-width: 100%; object-fit: contain; display: block;
}

@media (max-width: 768px) {
  .profile-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .sig-option-group { flex-direction: column; }
}
</style>
