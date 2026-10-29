// Recoloration des pièces d'avatar dans le navigateur (canvas, sans dépendance).
// Les pièces sont dessinées en blanc ou gris : on multiplie leur luminosité par la couleur
// choisie, ce qui garde le trait et les ombres. Résultats mis en cache (data: URL).

const cache = new Map()

function charger(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function pixels(src) {
  const img = await charger(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) }
}

const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16))
const lum = (p, i) => 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]

function percentile(p, q, filtre) {
  const ls = []
  for (let i = 0; i < p.length; i += 16) if (filtre(i)) ls.push(lum(p, i))
  ls.sort((a, b) => a - b)
  return ls[Math.floor(ls.length * q)]
}

function memo(cle, calcul) {
  if (!cache.has(cle)) cache.set(cle, calcul().catch((e) => { cache.delete(cle); throw e }))
  return cache.get(cle)
}

// Cheveux, barbe : pièce grise ou blanche -> couleur
export function teinter(src, couleur) {
  return memo(`t|${src}|${couleur}`, async () => {
    const { canvas, ctx, data } = await pixels(src)
    const p = data.data
    const [r, g, b] = rgb(couleur)
    const l0 = percentile(p, 0.6, (i) => p[i + 3] > 200) || 255
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue
      // zones plus claires que le gris de référence : léger reflet, sans repasser au blanc
      const t = Math.min(lum(p, i) / l0, 1.12)
      const reflet = Math.max(0, t - 1) * 60
      p[i] = Math.min(255, r * t + reflet)
      p[i + 1] = Math.min(255, g * t + reflet)
      p[i + 2] = Math.min(255, b * t + reflet)
    }
    ctx.putImageData(data, 0, 0)
    return canvas.toDataURL()
  })
}

// Corps : seuls les pixels du masque de peau changent de teinte
export function recolorerPeau(corpsSrc, masqueSrc, couleur) {
  return memo(`p|${corpsSrc}|${couleur}`, async () => {
    const [{ canvas, ctx, data }, masque] = await Promise.all([pixels(corpsSrc), pixels(masqueSrc)])
    const p = data.data
    const m = masque.data.data
    const [r, g, b] = rgb(couleur)
    const l0 = percentile(p, 0.6, (i) => m[i + 3] > 128) || 200
    for (let i = 0; i < p.length; i += 4) {
      const a = m[i + 3] / 255
      if (!a) continue
      const t = lum(p, i) / l0
      p[i] = p[i] * (1 - a) + Math.min(255, r * t) * a
      p[i + 1] = p[i + 1] * (1 - a) + Math.min(255, g * t) * a
      p[i + 2] = p[i + 2] * (1 - a) + Math.min(255, b * t) * a
    }
    ctx.putImageData(data, 0, 0)
    return canvas.toDataURL()
  })
}

// Œil : l'iris (masque) prend la couleur des yeux, le sourcil (haut de la pièce) celle des cheveux
export function recolorerOeil(oeilSrc, irisSrc, couleurYeux, couleurSourcil) {
  return memo(`o|${oeilSrc}|${couleurYeux}|${couleurSourcil}`, async () => {
    const [{ canvas, ctx, data }, iris] = await Promise.all([pixels(oeilSrc), irisSrc ? pixels(irisSrc) : null])
    const p = data.data
    const m = iris ? iris.data.data : new Uint8ClampedArray(p.length)
    const [r, g, b] = rgb(couleurYeux)
    const [sr, sg, sb] = rgb(couleurSourcil)
    const limite = Math.floor(canvas.height * 0.36) * canvas.width * 4
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue
      const a = m[i + 3] / 255
      if (a) {
        const t = Math.min(1.1, lum(p, i) / 235)
        p[i] = p[i] * (1 - a) + r * t * a
        p[i + 1] = p[i + 1] * (1 - a) + g * t * a
        p[i + 2] = p[i + 2] * (1 - a) + b * t * a
      } else if (i < limite) {
        const t = Math.min(1, lum(p, i) / 255)
        p[i] = sr * t
        p[i + 1] = sg * t
        p[i + 2] = sb * t
      }
    }
    ctx.putImageData(data, 0, 0)
    return canvas.toDataURL()
  })
}
