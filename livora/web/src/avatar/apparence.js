// Apparence du personnage : palettes, expressions, stades et accès aux pièces découpées.
// Les placements viennent de reperes.json (produit par l'outil de découpage) : remplacer les
// images et ce fichier suffit à changer les pièces, sans toucher au code.
import REPERES from './reperes.json'

const FICHIERS = import.meta.glob('../assets/personnage/**/*.webp', { eager: true, import: 'default' })
export const url = (rel) => (rel ? FICHIERS[`../assets/${rel}`] ?? null : null)

export const PEAUX = { claire: '#f6d3b3', doree: '#f3c27a', mate: '#d9a26b', brune: '#a8693e', foncee: '#6e4127' }
export const COULEURS_CHEVEUX = {
  noir: '#2a2522', brun: '#5b3a24', chatain: '#8a5a33', blond: '#e2b75a', roux: '#c4532a',
  blanc: '#ece8e4', bleu: '#3a7be0', rose: '#ee7fb4', vert: '#2f9e6a', violet: '#7b4bc4',
}
export const COULEURS_YEUX = {
  marron: '#7a4a24', noir: '#2b2420', bleu: '#3d8be0', vert: '#3aa268',
  gris: '#8c96a0', ambre: '#d99a2b', violet: '#8b56d6', rouge: '#d8352a',
}
export const CORPS = REPERES.corps
export const COIFFURES = REPERES.cheveux
export const BARBES = REPERES.barbes
export const YEUX = REPERES.yeux
export const BOUCHES = REPERES.bouches
export const NEZ = REPERES.nez
// Tenues portées : chaque tenue a ses calques par stade et les emplacements qu'elle occupe
// (une tenue complète prend « haut » et « bas » ; chaussures, bas, haut pour les pièces séparées)
export const TENUES = REPERES.tenues ?? []
export const TENUES_DEFAUT = { homme: ['short_sport'], femme: ['brassiere_sport'] }

export const APPARENCE_DEFAUT = {
  genre: 'homme', peau: 'doree', coiffure: 'g11', couleurCheveux: 'brun',
  yeux: 'm1', couleurYeux: 'marron', barbe: null, expression: 'sourire', nez: 'petit',
  tenues: null, // null : tenue de sport de départ du genre
}

// Stades de corps : 1 (niv. 1-4) · 2 (5-9) · 3 (10-14) · 4 (15-19) · 5 (20-29) · 6 (30 et plus)
// L'homme a 6 stades, la femme 4 : elle garde son 4e stade à partir du niveau 15.
const SEUILS = [1, 5, 10, 15, 20, 30]
export function stadeDuNiveau(niveau, genre = 'homme') {
  let s = 1
  SEUILS.forEach((seuil, i) => { if (niveau >= seuil) s = i + 1 })
  return Math.min(s, CORPS[genre]?.length ?? 6)
}

// Tenues portées par une apparence (celles du genre seulement)
export function tenuesPortees(apparence) {
  const liste = apparence.tenues ?? TENUES_DEFAUT[apparence.genre] ?? []
  return liste.map((cle) => TENUES.find((t) => t.cle === cle)).filter((t) => t && t.genre === apparence.genre)
}

// Enfile une tenue : retire celles qui occupent les mêmes emplacements. Rend la nouvelle liste de clés.
export function enfiler(apparence, cle) {
  const t = TENUES.find((x) => x.cle === cle)
  if (!t) return apparence.tenues ?? TENUES_DEFAUT[apparence.genre] ?? []
  const garde = tenuesPortees(apparence).filter((x) => x.cle !== cle && !x.emplacements.some((e) => t.emplacements.includes(e)))
  return [...garde.map((x) => x.cle), cle]
}

// Tenues portées d'après les objets équipés (emplacements vetement et chaussures du store) :
// on part de la tenue de sport de départ et on enfile chaque objet portable du bon genre.
export function tenuesDepuisEquipement(genre, equipes = {}) {
  let tenues = [...(TENUES_DEFAUT[genre] ?? [])]
  for (const cle of [equipes.vetement, equipes.chaussures]) {
    if (TENUES.some((t) => t.cle === cle && t.genre === genre)) tenues = enfiler({ genre, tenues }, cle)
  }
  return tenues
}
