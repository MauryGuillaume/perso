// "Game Master" IA (section 14) — dans une vraie implémentation, ceci serait un appel à
// l'API Claude avec le profil/programme/progression complets en contexte (cf program-generation
// côté backend). En mock, on simule sa fonction avec des règles simples MAIS dans le même
// ESPRIT explicite du prompt : jamais culpabilisant, adapte le discours à l'état réel de
// l'utilisateur (fatigue déclarée, disponibilité, régularité) plutôt que d'afficher un message
// générique. Retourne un message contextuel + éventuellement une suggestion d'adaptation.
export function gameMasterMessage({ currentStreak, workoutDureeMin, availableMinutesToday, feelingTired, feeling }) {
  if (feeling === 'douleur') {
    return { tone: 'recovery', message: 'Écoute ton corps : pas de charge sur la zone douloureuse. La version express ou une marche suffit. Si la douleur dure, demande l\'avis d\'un professionnel de santé.', suggestExpress: true }
  }
  if (feelingTired || feeling === 'fatigue') {
    return { tone: 'recovery', message: 'Pas de séance intense aujourd\'hui. Version express de 10 minutes, ou mission récupération : étirements ou marche tranquille.', suggestExpress: true }
  }
  if (feeling === 'en_forme' && currentStreak >= 3) {
    return { tone: 'momentum', message: `En forme et ${currentStreak} jours d'affilée : c'est le jour pour donner un peu plus.` }
  }
  if (availableMinutesToday != null && availableMinutesToday < workoutDureeMin) {
    return {
      tone: 'adapted',
      message: `Tu n'as que ${availableMinutesToday} minutes ? J'ai adapté ta mission en conséquence.`,
      adaptedDurationMin: availableMinutesToday,
    }
  }
  if (currentStreak >= 14) {
    return { tone: 'momentum', message: 'Tu avances vite et régulièrement. Une nouvelle quête vient d\'apparaître.' }
  }
  if (currentStreak === 0) {
    return { tone: 'restart', message: 'On reprend aujourd\'hui, à ton rythme.' }
  }
  return { tone: 'neutral', message: '' }
}

// Décide si une séance manquée doit déclencher une proposition de version allégée — jamais un
// message de type "tu as échoué" (section 20).
export function missedWorkoutMessage() {
  return 'Pas grave. On reprend avec une version plus courte si tu veux.'
}
