// Réactions du compagnon (section 3) — variées par personnalité, jamais culpabilisantes même
// dans les messages de "reprise" après une absence. Chaque fonction pioche aléatoirement dans
// un pool pour éviter la répétition exacte du même message.
const POOLS = {
  workout_completed: {
    motivant: ['🔥 Bien joué ! +250 XP', '💪 Séance terminée, tu assures !'],
    drole: ['😅 Tu as survécu à la séance, félicitations !', '🎉 Séance faite, le canapé peut attendre.'],
    calme: ['🙏 Séance terminée, prends un moment pour respirer.', '✅ C\'est fait, en douceur.'],
    taquin: ['👀 Tiens, tu l\'as vraiment faite cette fois.', '😏 Pas mal du tout.'],
  },
  day_success: {
    motivant: ['🐉 Aujourd\'hui, on a assuré !', '🌟 Journée réussie, on continue comme ça.'],
    drole: ['🎊 Journée validée, popcorn mérité.', '🙌 T\'as tout coché, respect.'],
    calme: ['🌙 Belle journée, repose-toi bien.', '✨ Tout est fait, savoure ce moment.'],
    taquin: ['😎 Regarde-toi, tout coché.', '👑 Journée parfaite, tu m\'impressionnes presque.'],
  },
  inactivity: {
    motivant: ['On reprend doucement aujourd\'hui ?', 'Prêt à repartir ? On y va ensemble.'],
    drole: ['🐉 J\'ai cru que tu m\'avais oublié... on reprend ?', 'Ça faisait longtemps, mais bon retour !'],
    calme: ['Pas de souci, on reprend à ton rythme.', 'Chaque reprise compte, sans pression.'],
    taquin: ['Alors, on avait la flemme ?', 'T\'étais où ? Bon, on reprend.'],
  },
}

export function companionMessage(personality, moment) {
  const pool = POOLS[moment]?.[personality] ?? POOLS[moment]?.motivant ?? []
  if (pool.length === 0) return ''
  return pool[Math.floor(Math.random() * pool.length)]
}
