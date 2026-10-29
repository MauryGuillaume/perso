// Semelles orthopédiques : gabarit de semelle à la pointure, catalogue des éléments et calculs de mise en page.
// Repère commun (enregistré par l'API) : u = 0 bord interne → 1 bord externe, v = 0 talon → 1 bout des orteils.
// Les tailles d'éléments sont en mm. Dessin vu du dessus de la semelle, orteils en haut ; pied droit : bord interne à gauche.

/** Longueur de la semelle en mm : pointure française (point de Paris = 2/3 cm). */
export const longueurSemelle = pointure => Math.round(Number(pointure || 40) * 20 / 3)
/** Largeur maximale (au niveau des têtes métatarsiennes), environ 37 % de la longueur. */
export const largeurSemelle = pointure => Math.round(longueurSemelle(pointure) * 0.37)

// Contour du pied droit (u, v), dans le sens des aiguilles d'une montre depuis le milieu du talon
const CONTOUR = [
  [0.50, 0.000], [0.70, 0.015], [0.80, 0.060], [0.83, 0.150], [0.84, 0.300], [0.88, 0.450], [0.95, 0.600], [0.99, 0.700],
  [0.97, 0.780], [0.90, 0.860], [0.78, 0.930], [0.60, 0.975], [0.40, 0.995], [0.25, 1.000], [0.12, 0.985], [0.04, 0.940],
  [0.00, 0.860], [0.01, 0.740], [0.07, 0.600], [0.17, 0.450], [0.19, 0.320], [0.16, 0.180], [0.20, 0.070], [0.32, 0.015],
]

/** Position en mm d'un point (u, v) pour un côté. */
export function versMm(u, v, cote, pointure) {
  const L = longueurSemelle(pointure), W = largeurSemelle(pointure)
  return [(cote === 'G' ? 1 - u : u) * W, (1 - v) * L]
}
export function depuisMm(x, y, cote, pointure) {
  const L = longueurSemelle(pointure), W = largeurSemelle(pointure)
  const u = x / W
  return [cote === 'G' ? 1 - u : u, 1 - y / L]
}

/** Chemin SVG lissé (Catmull-Rom fermée) du contour de la semelle, en mm. */
export function cheminContour(cote, pointure) {
  const p = CONTOUR.map(([u, v]) => versMm(u, v, cote, pointure))
  const n = p.length, f = x => Math.round(x * 10) / 10
  let d = `M${f(p[0][0])},${f(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`
  }
  return d + ' Z'
}

/**
 * Éléments courants d'une orthèse plantaire. forme : barre, ovale, demi (hémi-coupole), coin (biseau), rect, evidement.
 * epaisDe (coins) : côté le plus épais, 'interne' ou 'externe'.
 */
export const ELEMENTS = [
  { type: 'brc',         abbr: 'BRC', label: 'Barre rétro-capitale',            forme: 'barre',     u: 0.50, v: 0.66, largeur: 0.80, hauteur: 10, epaisseur: 3, couleur: '#2563eb' },
  { type: 'olive',       abbr: 'ARC', label: 'Appui rétro-capital (olive)',     forme: 'ovale',     u: 0.45, v: 0.63, largeur: 22,   hauteur: 28, epaisseur: 3, couleur: '#0891b2' },
  { type: 'brd',         abbr: 'BRD', label: 'Barre rétro-diaphysaire',         forme: 'barre',     u: 0.50, v: 0.52, largeur: 0.75, hauteur: 10, epaisseur: 3, couleur: '#4f46e5' },
  { type: 'esc',         abbr: 'ESC', label: 'Élément sous-cuboïdien',          forme: 'ovale',     u: 0.78, v: 0.38, largeur: 22,   hauteur: 30, epaisseur: 4, couleur: '#7c3aed' },
  { type: 'voute',       abbr: 'SVI', label: 'Soutien de voûte interne',        forme: 'demi',      u: 0.20, v: 0.40, largeur: 30,   hauteur: 70, epaisseur: 6, couleur: '#16a34a' },
  { type: 'csa',         abbr: 'CSA', label: 'Coin supinateur antérieur',       forme: 'coin',      u: 0.25, v: 0.72, largeur: 40,   hauteur: 45, epaisseur: 2, couleur: '#ea580c', epaisDe: 'interne' },
  { type: 'csp',         abbr: 'CSP', label: 'Coin supinateur postérieur',      forme: 'coin',      u: 0.32, v: 0.12, largeur: 32,   hauteur: 55, epaisseur: 3, couleur: '#ea580c', epaisDe: 'interne' },
  { type: 'cpa',         abbr: 'CPA', label: 'Coin pronateur antérieur',        forme: 'coin',      u: 0.78, v: 0.72, largeur: 40,   hauteur: 45, epaisseur: 2, couleur: '#db2777', epaisDe: 'externe' },
  { type: 'cpp',         abbr: 'CPP', label: 'Coin pronateur postérieur',       forme: 'coin',      u: 0.68, v: 0.12, largeur: 32,   hauteur: 55, epaisseur: 3, couleur: '#db2777', epaisDe: 'externe' },
  { type: 'talonnette',  abbr: 'TAL', label: 'Talonnette (élévation du talon)', forme: 'rect',      u: 0.50, v: 0.12, largeur: 0.60, hauteur: 75, epaisseur: 5, couleur: '#b45309' },
  { type: 'hallux',      abbr: 'SH',  label: 'Élément sous-hallux / 1er rayon', forme: 'ovale',     u: 0.20, v: 0.86, largeur: 25,   hauteur: 45, epaisseur: 2, couleur: '#0d9488' },
  { type: 'evidement',   abbr: 'EV',  label: 'Évidement (décharge)',            forme: 'evidement', u: 0.50, v: 0.70, largeur: 20,   hauteur: 20, epaisseur: 0, couleur: '#dc2626' },
  { type: 'libre',       abbr: '…',   label: 'Élément libre',                   forme: 'rect',      u: 0.50, v: 0.50, largeur: 30,   hauteur: 20, epaisseur: 2, couleur: '#475569' },
]
export const elementType = type => ELEMENTS.find(e => e.type === type) || ELEMENTS[ELEMENTS.length - 1]

/** Nouvel élément pour un côté (largeur ≤ 1 dans le catalogue = fraction de la largeur de semelle). */
export function nouvelElement(type, cote, pointure) {
  const t = elementType(type)
  const W = largeurSemelle(pointure)
  return {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
    type: t.type, cote, u: t.u, v: t.v,
    largeur: t.largeur <= 1 ? Math.round(t.largeur * W) : t.largeur, hauteur: t.hauteur,
    rotation: 0, epaisseur: t.epaisseur, materiau: '', durete: '', note: '',
  }
}

export const TYPES_SEMELLE = [
  { value: 'thermoformee',  label: 'Thermoformée' },
  { value: 'composite',     label: 'Composite (éléments collés)' },
  { value: 'moulee',        label: 'Moulée' },
  { value: 'fraisee',       label: 'Fraisée (CFAO)' },
  { value: 'impression_3d', label: 'Impression 3D' },
  { value: 'orthoplastie',  label: 'Orthoplastie' },
  { value: 'autre',         label: 'Autre' },
]

export const STATUTS_SEMELLE = [
  { value: 'prescrite',      label: 'Prescrite',      classe: 'st-prescrite' },
  { value: 'en_fabrication', label: 'En fabrication', classe: 'st-fabrication' },
  { value: 'livree',         label: 'Livrée',         classe: 'st-livree' },
  { value: 'controlee',      label: 'Contrôlée',      classe: 'st-controlee' },
]

export const MATERIAUX = ['EVA', 'Liège', 'Cuir', 'Polyéthylène', 'Poron®', 'Plastazote®', 'Résine', 'Carbone', 'Mousse PU', 'Podiane®', 'Microcellulaire']

export const libelleStatut = v => STATUTS_SEMELLE.find(s => s.value === v)?.label || v
export const libelleType = v => TYPES_SEMELLE.find(s => s.value === v)?.label || v

/** Position lisible d'un élément (pour la fiche de fabrication). */
export function positionLisible(e) {
  const zone = e.v < 0.25 ? 'talon' : e.v < 0.55 ? 'médio-pied' : e.v < 0.8 ? 'avant-pied' : 'orteils'
  const cote = e.u < 0.35 ? 'interne' : e.u > 0.65 ? 'externe' : 'central'
  return `${zone}, ${cote} — à ${Math.round(e.v * 100)} % de la longueur depuis le talon`
}

/** Semelle : à contrôler ou à renouveler (rappels de la liste). */
export function alerteSemelle(s, aujourdHui = new Date().toISOString().slice(0, 10)) {
  if (s.statut === 'livree' && s.dateControle && s.dateControle <= aujourdHui) return { niveau: 'controle', texte: 'Contrôle à faire' }
  if (s.dateRenouvellement && s.dateRenouvellement <= aujourdHui) return { niveau: 'renouveler', texte: 'À renouveler' }
  if (s.statut === 'en_fabrication' && s.datePrescription && (Date.now() - new Date(s.datePrescription)) > 21 * 864e5) return { niveau: 'retard', texte: 'En fabrication depuis plus de 3 semaines' }
  return null
}

/** Ajoute des mois à une date AAAA-MM-JJ. */
export function plusMois(date, mois) {
  const d = new Date((date || new Date().toISOString().slice(0, 10)) + 'T12:00:00')
  d.setMonth(d.getMonth() + mois)
  return d.toISOString().slice(0, 10)
}
