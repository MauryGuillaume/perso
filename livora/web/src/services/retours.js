// Petits retours sensoriels sur les victoires (niveau, coffre, quête) : un carillon court généré
// par Web Audio (aucun fichier son) et une vibration, chacun désactivable dans le profil.
let contexte = null

const MELODIES = {
  victoire: [523.25, 659.25, 783.99, 1046.5], // do mi sol do
  petit: [659.25, 987.77],
}

export function jouerSon(nom = 'petit') {
  try {
    contexte ??= new (window.AudioContext || window.webkitAudioContext)()
    const notes = MELODIES[nom] ?? MELODIES.petit
    const t0 = contexte.currentTime
    notes.forEach((freq, i) => {
      const osc = contexte.createOscillator()
      const gain = contexte.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const debut = t0 + i * 0.09
      gain.gain.setValueAtTime(0.0001, debut)
      gain.gain.exponentialRampToValueAtTime(0.18, debut + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, debut + 0.35)
      osc.connect(gain).connect(contexte.destination)
      osc.start(debut)
      osc.stop(debut + 0.4)
    })
  } catch { /* audio indisponible : on ignore */ }
}

export function vibrer(motif = [40]) {
  try { navigator.vibrate?.(motif) } catch { /* non supporté */ }
}

// Appelé pour chaque événement de gamification affiché.
export function feterEvenement(type, reglages) {
  const grand = ['level_up', 'achievement', 'quest_completed', 'companion_level_up', 'challenge_completed'].includes(type)
  if (reglages?.sons) jouerSon(grand ? 'victoire' : 'petit')
  if (reglages?.vibrations) vibrer(grand ? [60, 40, 120] : [40])
}
