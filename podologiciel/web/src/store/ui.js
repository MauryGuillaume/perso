import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid.js'

const MOCK_MODE_KEY = 'movyx_mock_mode'

export const useUIStore = defineStore('ui', {
  state: () => ({
    notifications: [],
    loading: false,
    sidebarOpen: false,
    theme: localStorage.getItem('podo_theme') || 'light',
    mockMode: localStorage.getItem(MOCK_MODE_KEY) === 'true',
  }),

  actions: {
    notify(message, type = 'info', duration = 3000) {
      const id = generateId()
      this.notifications.push({ id, message, type, visible: true })
      setTimeout(() => this.removeNotification(id), duration)
    },
    success(message) { this.notify(message, 'success') },
    error(message) { this.notify(message, 'error', 5000) },
    info(message) { this.notify(message, 'info') },
    warning(message) { this.notify(message, 'warning', 4000) },
    removeNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id)
    },
    setLoading(val) { this.loading = val },
    toggleSidebar() { this.sidebarOpen = !this.sidebarOpen },
    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('podo_theme', theme)
      document.documentElement.setAttribute('data-theme', theme)
    },
    setMockMode(val) {
      this.mockMode = val
      localStorage.setItem(MOCK_MODE_KEY, val ? 'true' : 'false')
    },
  }
})
