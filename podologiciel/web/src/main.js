import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './styles/global.css'
import { useAuthStore } from '@/store/auth.js'

const app   = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Attendre que Firebase Auth résolve l'état initial avant de monter l'app.
// Cela évite un flash de redirection vers /landing au refresh.
const auth = useAuthStore()
auth.initAuth().then(() => {
  app.mount('#app')
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
