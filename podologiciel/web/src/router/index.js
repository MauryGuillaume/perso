import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/store/auth.js'

const routes = [
  { path: '/',        redirect: '/dashboard' },
  { path: '/landing', name: 'Landing',      component: () => import('@/views/Landing.vue') },
  { path: '/login',   name: 'Login',        component: () => import('@/views/Login.vue') },
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('@/views/ForgotPassword.vue') },
  { path: '/reset-password',  name: 'ResetPassword',  component: () => import('@/views/ResetPassword.vue') },
  { path: '/2fa',     name: 'TwoFactor',    component: () => import('@/views/TwoFactor.vue') },
  { path: '/dashboard', name: 'Dashboard',  component: () => import('@/views/Dashboard.vue'),   meta: { requiresAuth: true } },
  { path: '/patients',  name: 'PatientList', component: () => import('@/views/PatientList.vue'), meta: { requiresAuth: true } },
  { path: '/patients/new', name: 'PatientNew', component: () => import('@/views/PatientDetail.vue'), meta: { requiresAuth: true } },
  { path: '/patients/:id', name: 'PatientDetail', component: () => import('@/views/PatientDetail.vue'), meta: { requiresAuth: true } },
  { path: '/patients/:patientId/bilans/new', name: 'BilanNew', component: () => import('@/views/BilanEditor.vue'), meta: { requiresAuth: true } },
  { path: '/bilans/:id', name: 'BilanEditor', component: () => import('@/views/BilanEditor.vue'), meta: { requiresAuth: true } },
  { path: '/semelles', name: 'Semelles', component: () => import('@/views/Semelles.vue'), meta: { requiresAuth: true } },
  { path: '/patients/:patientId/semelles/new', name: 'SemelleNew', component: () => import('@/views/SemelleEditor.vue'), meta: { requiresAuth: true } },
  { path: '/semelles/:id', name: 'SemelleEditor', component: () => import('@/views/SemelleEditor.vue'), meta: { requiresAuth: true } },
  { path: '/facturation', name: 'Facturation', component: () => import('@/views/Facturation.vue'), meta: { requiresAuth: true } },
  { path: '/comptabilite', name: 'Comptabilite', component: () => import('@/views/Comptabilite.vue'), meta: { requiresAuth: true } },
  { path: '/agenda', name: 'Agenda', component: () => import('@/views/Agenda.vue'), meta: { requiresAuth: true } },
  { path: '/admin',   name: 'AdminHUD',     component: () => import('@/views/AdminHUD.vue'),    meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/profile', name: 'Profile',      component: () => import('@/views/Profile.vue'),     meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Attendre que initAuth() (vérification du token stocké) soit résolu, cf main.js
  if (!auth.authReady) return

  const isLoggedIn = auth.isLoggedIn
  const isAdmin    = auth.isAdmin

  // Routes protégées : doit être connecté
  if (to.meta.requiresAuth && !isLoggedIn) {
    return { name: 'Landing' }
  }

  // Routes protégées : vérification 2FA obligatoire si activé
  if (to.meta.requiresAuth && isLoggedIn && auth.currentUser?.twoFactorEnabled) {
    const twoFaOk = sessionStorage.getItem('movyx_2fa_ok') === auth.currentUser.id
    if (!twoFaOk && to.name !== 'TwoFactor') {
      return { name: 'TwoFactor', query: { mode: 'verify', redirect: to.fullPath } }
    }
  }

  if (to.meta.requiresAdmin && !isAdmin) return { name: 'Dashboard' }

  // Déjà connecté → pas besoin de voir landing/login
  if ((to.name === 'Login' || to.name === 'Landing') && isLoggedIn) {
    return { name: 'Dashboard' }
  }
})

router.afterEach((to) => {
  const titles = {
    Landing:      'Movyx – Logiciel podologique',
    Login:        'Connexion – Movyx',
    ForgotPassword: 'Mot de passe oublié – Movyx',
    ResetPassword:  'Réinitialiser le mot de passe – Movyx',
    TwoFactor:    'Double authentification – Movyx',
    Dashboard:    'Tableau de bord – Movyx',
    PatientList:  'Patients – Movyx',
    AdminHUD:     'Administration – Movyx',
    Facturation:  'Facturation – Movyx',
    Comptabilite: 'Comptabilité – Movyx',
    Agenda:       'Agenda – Movyx',
  }
  document.title = titles[to.name] || 'Movyx – Bilans Podologiques'
})

export default router
