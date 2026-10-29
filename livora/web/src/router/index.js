import { createRouter, createWebHashHistory } from 'vue-router'
import { hasStartedProgram } from '@/mock/programState.js'

const routes = [
  { path: '/', redirect: '/aujourd-hui' },
  { path: '/onboarding', name: 'Onboarding', component: () => import('@/views/OnboardingView.vue') },
  { path: '/aujourd-hui', name: 'Today', component: () => import('@/views/TodayView.vue') },
  { path: '/agenda', name: 'Agenda', component: () => import('@/views/AgendaView.vue') },
  { path: '/sport', name: 'Sport', component: () => import('@/views/SportView.vue') },
  { path: '/sport/seance/:id', name: 'WorkoutDetail', component: () => import('@/views/WorkoutDetailView.vue'), props: true },
  { path: '/nutrition', name: 'Nutrition', component: () => import('@/views/NutritionView.vue') },
  { path: '/nutrition/repas/:id', name: 'MealDetail', component: () => import('@/views/MealDetailView.vue'), props: true },
  { path: '/courses', name: 'ShoppingList', component: () => import('@/views/ShoppingListView.vue') },
  { path: '/hydratation', name: 'Hydration', component: () => import('@/views/HydrationView.vue') },
  { path: '/sommeil', name: 'Sleep', component: () => import('@/views/SleepView.vue') },
  { path: '/habitudes', name: 'Habits', component: () => import('@/views/HabitsView.vue') },
  { path: '/progression', name: 'Progress', component: () => import('@/views/ProgressView.vue') },
  { path: '/profil', name: 'Profile', component: () => import('@/views/ProfileView.vue') },
  { path: '/reglages', name: 'Settings', component: () => import('@/views/ReglagesView.vue') },
  { path: '/a-propos', name: 'About', component: () => import('@/views/AProposView.vue') },

  // ── Gamification ──────────────────────────────────────────────────────
  { path: '/personnage', name: 'Character', component: () => import('@/views/CharacterView.vue') },
  { path: '/personnage/creer', name: 'CreateCharacter', component: () => import('@/views/CreationPersonnageView.vue') },
  { path: '/compagnon', name: 'Companion', component: () => import('@/views/CompanionView.vue') },
  { path: '/monde', name: 'World', component: () => import('@/views/WorldView.vue') },
  { path: '/recompenses', name: 'Rewards', component: () => import('@/views/RewardsView.vue') },
  { path: '/quetes', name: 'Quests', component: () => import('@/views/QuestsView.vue') },
  { path: '/ma-progression', name: 'GamificationProgress', component: () => import('@/views/GamificationProgressView.vue') },
  { path: '/collection', name: 'Collection', component: () => import('@/views/CollectionView.vue') },

  { path: '/:pathMatch(.*)*', redirect: '/aujourd-hui' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Premier lancement : tant qu'aucun programme n'est démarré (questionnaire ou profil démo), on
// accueille l'utilisateur sur l'onboarding plutôt que sur un programme qui n'est pas le sien.
const PAGES_LIBRES = new Set(['Onboarding', 'About'])
router.beforeEach((to) => {
  if (!hasStartedProgram() && !PAGES_LIBRES.has(to.name)) return { name: 'Onboarding' }
})

export default router
