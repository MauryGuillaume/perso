// Petit utilitaire de persistance localStorage — utilisé par programState.js et par le store
// de gamification pour survivre aux rechargements de page (cf besoin : "comme si l'app était
// branchée mais enregistrée en local").
const PREFIX = 'livora.'

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota dépassé ou stockage indisponible (navigation privée) — l'app continue en mémoire.
  }
}

export function clearAll() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
  for (const k of keys) localStorage.removeItem(k)
}
