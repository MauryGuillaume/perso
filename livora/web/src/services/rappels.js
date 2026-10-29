// Rappels locaux (séance, eau, coucher) : notifications planifiées pour la journée en cours tant
// que l'app est ouverte ou gardée en arrière-plan par le navigateur. Des rappels qui arrivent
// app fermée demandent des notifications push envoyées par le serveur (cf étape backend).
let minuteurs = []

export function rappelsDisponibles() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permissionRappels() {
  return rappelsDisponibles() ? Notification.permission : 'unsupported'
}

export async function demanderPermissionRappels() {
  if (!rappelsDisponibles()) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

async function notifier(titre, corps, tag) {
  const options = { body: corps, tag, icon: 'icone-192.png', badge: 'icone-192.png' }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) return reg.showNotification(titre, options)
  } catch { /* pas de service worker (dev) : notification simple */ }
  new Notification(titre, options)
}

// Date d'aujourd'hui à l'heure "HH:MM", décalée de `minutesAvant`.
function aujourdhuiA(hhmm, minutesAvant = 0) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m - minutesAvant, 0, 0)
  return d
}

function planifier(date, titre, corps, tag) {
  const delai = date.getTime() - Date.now()
  if (delai <= 0 || delai > 24 * 3600 * 1000) return
  minuteurs.push(setTimeout(() => notifier(titre, corps, tag), delai))
}

export function annulerRappels() {
  minuteurs.forEach(clearTimeout)
  minuteurs = []
}

// Replanifie tous les rappels du jour à partir de la timeline (appelé à chaque chargement du
// jour : un item coché entre-temps n'est plus rappelé).
export function planifierRappels(today, hydration, prefs) {
  annulerRappels()
  if (!today || !prefs?.actifs || permissionRappels() !== 'granted') return
  for (const item of today.items) {
    if (item.status === 'termine') continue
    if (prefs.seance && item.type === 'workout') {
      planifier(aujourdhuiA(item.time, 15), 'Ta séance arrive', `${item.subtitle} dans 15 minutes. Même la version express compte !`, 'seance')
    }
    if (prefs.hydratation && item.type === 'hydration' && hydration?.currentMl < hydration?.goalMl) {
      planifier(aujourdhuiA(item.time), 'Petite pause eau 💧', 'Un grand verre d\'eau et tu te rapproches de ton objectif.', item.id)
    }
    if (prefs.coucher && item.id === 'routine') {
      planifier(aujourdhuiA(item.time), 'Routine du soir 🌙', 'On coupe les écrans, ton sommeil te dira merci.', 'coucher')
    }
  }
}
