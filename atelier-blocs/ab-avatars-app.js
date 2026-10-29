/* ==========================================================================
   ab-avatars-app.js — les avatars d'une app, lus dans SON code (Livora…)
   Quand le code importé d'une app (Code et versions, version courante)
   contient src/avatar/reperes.json et src/assets/personnage/, le Studio design
   montre ces avatars-là, pas une copie : importer une nouvelle version de l'app
   suffit pour les voir à jour.
   Assemblage repris de PersonnageCalques.vue et avatar/recoloration.js de
   Livora : corps du stade (peau recolorée), tenues portées (calques x/y/w par
   stade, ordre ≥ 10 au-dessus des cheveux), barbe, nez, bouche, yeux (iris et
   sourcils recolorés), coiffure calée sur la tête.
   ========================================================================== */
(function () {
  const A = AB.avatarsApp = {};
  const CACHE = new Map();   // app.id → { numero, pack } (pack = promesse)

  A.PEAUX = { claire: '#f6d3b3', doree: '#f3c27a', mate: '#d9a26b', brune: '#a8693e', foncee: '#6e4127' };
  A.CHEVEUX = { noir: '#2a2522', brun: '#5b3a24', chatain: '#8a5a33', blond: '#e2b75a', roux: '#c4532a', blanc: '#ece8e4', bleu: '#3a7be0', rose: '#ee7fb4', vert: '#2f9e6a', violet: '#7b4bc4' };
  A.YEUX = { marron: '#7a4a24', noir: '#2b2420', bleu: '#3d8be0', vert: '#3aa268', gris: '#8c96a0', ambre: '#d99a2b', violet: '#8b56d6', rouge: '#d8352a' };
  A.DEFAUT = { genre: 'homme', peau: 'doree', coiffure: 'g11', couleurCheveux: 'brun', yeux: 'm1', couleurYeux: 'marron', barbe: null, expression: 'sourire', nez: 'petit', tenues: null };
  A.TENUES_DEFAUT = { homme: ['short_sport'], femme: ['brassiere_sport'] };
  const SEUILS = [1, 5, 10, 15, 20, 30];
  const HAUTEUR_REF = 640;

  /** Pack d'avatars de l'app (ou null si son code n'en a pas). Gardé tant que la version courante ne change pas. */
  A.pack = function (app) {
    const v = AB.code && AB.code.courante(app);
    if (!v) return Promise.resolve(null);
    const c = CACHE.get(app.id);
    if (c && c.numero === v.numero) return c.pack;
    const pack = lire(app, v).catch(e => { console.warn('Avatars de l’app illisibles', e); CACHE.delete(app.id); return null; });
    CACHE.set(app.id, { numero: v.numero, pack });
    return pack;
  };

  async function lire(app, v) {
    const blob = await AB.code.zip(app);
    if (!blob) return null;
    const s = await AB.mobile.sourceZip(blob, app.nom);
    const tous = s.tous || s.fichiers;
    const chemin = Object.keys(tous).filter(c => /(^|\/)src\/avatar\/reperes\.json$/.test(c)).sort((a, b) => a.length - b.length)[0];
    if (!chemin) return null;
    const src = chemin.slice(0, -'avatar/reperes.json'.length);   // …/src/
    const reperes = JSON.parse(AB.mobile.texte(tous[chemin]));
    const urls = new Map();
    /** Adresse (blob) d'un fichier de assets/, chemin relatif comme dans reperes.json. */
    const url = rel => {
      if (!rel) return null;
      if (!urls.has(rel)) { const o = tous[src + 'assets/' + rel]; urls.set(rel, o ? URL.createObjectURL(new Blob([o], { type: 'image/webp' })) : null); }
      return urls.get(rel);
    };
    // Objets à débloquer : vignettes assets/avatar/<emplacement>/<clé>.webp, noms et raretés de cosmeticItems.js
    const noms = {};
    const cosm = tous[src + 'gamification/cosmeticItems.js'];
    if (cosm) for (const m of AB.mobile.texte(cosm).matchAll(/key:\s*'([\w-]+)'[^}]*?label:\s*'((?:[^'\\]|\\.)*)'(?:[^}]*?rarity:\s*'(\w+)')?/g)) noms[m[1]] = { nom: m[2].replace(/\\'/g, '’'), rarete: m[3] || '' };
    const objets = Object.keys(tous).map(c => c.startsWith(src + 'assets/avatar/') && /^([\w-]+)\/([\w-]+)\.webp$/.exec(c.slice((src + 'assets/avatar/').length))).filter(Boolean)
      .map(m => ({ emplacement: m[1], cle: m[2], src: url('avatar/' + m[0]), ...(noms[m[2]] || { nom: m[2].replace(/_/g, ' '), rarete: '' }) }));
    const especes = {};
    const cat = tous[src + 'gamification/catalog.js'];
    if (cat) for (const m of AB.mobile.texte(cat).matchAll(/key:\s*'([\w-]+)',\s*label:\s*'((?:[^'\\]|\\.)*)'/g)) especes[m[1]] = m[2];
    const compagnons = {};
    Object.keys(tous).forEach(c => {
      const m = c.startsWith(src + 'assets/companions/') && /^([\w-]+)\/level-(\d+)\.(webp|png|svg)$/.exec(c.slice((src + 'assets/companions/').length));
      if (m) (compagnons[m[1]] = compagnons[m[1]] || []).push({ niveau: +m[2], src: url('companions/' + m[0]) });
    });
    Object.values(compagnons).forEach(l => l.sort((a, b) => a.niveau - b.niveau));
    return {
      reperes, url, objets, compagnons, especes, chemin, version: v.numero,
      liberer: () => urls.forEach(u => u && URL.revokeObjectURL(u))
    };
  }

  A.stadeDuNiveau = (pack, niveau, genre) => {
    let s = 1;
    SEUILS.forEach((seuil, i) => { if (niveau >= seuil) s = i + 1; });
    return Math.min(s, (pack.reperes.corps[genre] || []).length || 6);
  };

  A.tenuesPortees = (pack, ap) => (ap.tenues || A.TENUES_DEFAUT[ap.genre] || [])
    .map(cle => (pack.reperes.tenues || []).find(t => t.cle === cle)).filter(t => t && t.genre === ap.genre);

  /** Enfile (ou retire) une tenue : enlève celles qui occupent les mêmes emplacements. */
  A.basculer = function (pack, ap, cle) {
    const portees = A.tenuesPortees(pack, ap);
    if (portees.some(t => t.cle === cle)) return portees.filter(t => t.cle !== cle).map(t => t.cle);
    const t = (pack.reperes.tenues || []).find(x => x.cle === cle);
    if (!t) return portees.map(x => x.cle);
    return portees.filter(x => !x.emplacements.some(e => t.emplacements.includes(e))).map(x => x.cle).concat(cle);
  };

  /* ---------- Recoloration (canvas), reprise de recoloration.js ---------- */
  const memo = new Map();
  const garder = (cle, f) => { if (!memo.has(cle)) memo.set(cle, f().catch(e => { memo.delete(cle); throw e; })); return memo.get(cle); };
  const charger = src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  async function pixels(src) {
    const img = await charger(src);
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    return { canvas, ctx, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
  }
  const rgb = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
  const lum = (p, i) => 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
  function percentile(p, q, filtre) { const ls = []; for (let i = 0; i < p.length; i += 16) if (filtre(i)) ls.push(lum(p, i)); ls.sort((a, b) => a - b); return ls[Math.floor(ls.length * q)]; }

  const teinter = (src, couleur) => garder(`t|${src}|${couleur}`, async () => {
    const { canvas, ctx, data } = await pixels(src); const p = data.data; const [r, g, b] = rgb(couleur);
    const l0 = percentile(p, 0.6, i => p[i + 3] > 200) || 255;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const t = Math.min(lum(p, i) / l0, 1.12), reflet = Math.max(0, t - 1) * 60;
      p[i] = Math.min(255, r * t + reflet); p[i + 1] = Math.min(255, g * t + reflet); p[i + 2] = Math.min(255, b * t + reflet);
    }
    ctx.putImageData(data, 0, 0); return canvas.toDataURL();
  });
  const recolorerPeau = (corpsSrc, masqueSrc, couleur) => garder(`p|${corpsSrc}|${couleur}`, async () => {
    if (!masqueSrc) return corpsSrc;
    const [{ canvas, ctx, data }, masque] = await Promise.all([pixels(corpsSrc), pixels(masqueSrc)]);
    const p = data.data, m = masque.data.data; const [r, g, b] = rgb(couleur);
    const l0 = percentile(p, 0.6, i => m[i + 3] > 128) || 200;
    for (let i = 0; i < p.length; i += 4) {
      const a = m[i + 3] / 255; if (!a) continue;
      const t = lum(p, i) / l0;
      p[i] = p[i] * (1 - a) + Math.min(255, r * t) * a; p[i + 1] = p[i + 1] * (1 - a) + Math.min(255, g * t) * a; p[i + 2] = p[i + 2] * (1 - a) + Math.min(255, b * t) * a;
    }
    ctx.putImageData(data, 0, 0); return canvas.toDataURL();
  });
  const recolorerOeil = (oeilSrc, irisSrc, couleurYeux, couleurSourcil) => garder(`o|${oeilSrc}|${couleurYeux}|${couleurSourcil}`, async () => {
    const [{ canvas, ctx, data }, iris] = await Promise.all([pixels(oeilSrc), irisSrc ? pixels(irisSrc) : null]);
    const p = data.data, m = iris ? iris.data.data : new Uint8ClampedArray(p.length);
    const [r, g, b] = rgb(couleurYeux), [sr, sg, sb] = rgb(couleurSourcil);
    const limite = Math.floor(canvas.height * 0.36) * canvas.width * 4;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const a = m[i + 3] / 255;
      if (a) { const t = Math.min(1.1, lum(p, i) / 235); p[i] = p[i] * (1 - a) + r * t * a; p[i + 1] = p[i + 1] * (1 - a) + g * t * a; p[i + 2] = p[i + 2] * (1 - a) + b * t * a; }
      else if (i < limite) { const t = Math.min(1, lum(p, i) / 255); p[i] = sr * t; p[i + 1] = sg * t; p[i + 2] = sb * t; }
    }
    ctx.putImageData(data, 0, 0); return canvas.toDataURL();
  });

  /* ---------- Assemblage (PersonnageCalques.vue) ---------- */
  const mediane = l => l.map(x => x.w).sort((x, y) => x - y)[Math.floor(l.length / 2)];

  /** Calques du personnage : { corps: {w, h}, calques: [{ src, x, y, w, classe }] }. */
  A.calques = async function (pack, apparence, stadeVoulu) {
    const R = pack.reperes, url = pack.url, ap = Object.assign({}, A.DEFAUT, apparence);
    const liste = R.corps[ap.genre] || R.corps.homme;
    const c = liste[Math.min(stadeVoulu, liste.length) - 1];
    const t = { w: c.teteLargeur, hh: c.teteLargeur * 1.3, haut: c.teteHaut, cx: c.teteCx, pic: c.tetePic };
    const cheveux = A.CHEVEUX[ap.couleurCheveux] || A.CHEVEUX.brun;
    const out = [{ classe: 'corps', src: await recolorerPeau(url(`personnage/${ap.genre}/corps-${c.stade}.webp`), url(`personnage/${ap.genre}/peau-${c.stade}.webp`), A.PEAUX[ap.peau] || A.PEAUX.doree), x: 0, y: 0, w: c.w }];
    const habits = A.tenuesPortees(pack, ap).flatMap(tn => (tn.stades[c.stade] || []));
    const calque = h => ({ classe: 'tenue', src: url(h.fichier), x: h.x, y: h.y, w: h.w });
    habits.filter(h => h.ordre < 10).sort((x, y) => x.ordre - y.ordre).forEach(h => out.push(calque(h)));
    const barbe = ap.genre === 'homme' && (R.barbes || []).find(b => b.cle === ap.barbe);
    if (barbe) { const bw = t.w * 1.02; out.push({ classe: 'barbe', src: await teinter(url(barbe.fichier), cheveux), x: t.cx - bw / 2, y: t.haut + t.hh * 0.52, w: bw }); }
    if ((R.nez || []).length) {
      const nez = R.nez.find(x => x.cle === ap.nez) || R.nez[0], nw = t.w * 0.16 * (nez.w / mediane(R.nez));
      out.push({ classe: 'nez', src: url(nez.fichier), x: t.cx - nw / 2, y: t.haut + t.hh * 0.6 - (nez.h * nw) / nez.w / 2, w: nw });
    }
    if ((R.bouches || []).length) {
      const b = R.bouches.find(x => x.cle === ap.expression) || R.bouches[0], bw = t.w * 0.4 * (b.w / mediane(R.bouches));
      out.push({ classe: 'bouche', src: url(b.fichier), x: t.cx - bw / 2, y: t.haut + t.hh * 0.73 - (b.h * bw) / b.w / 2, w: bw });
    }
    const yeux = (R.yeux || []).find(y => y.cle === ap.yeux) || (R.yeux || [])[0];
    if (yeux) for (const [i, o] of yeux.oeil.entries()) {
      const ew = t.w * 0.34, s = ew / o.w;
      out.push({ classe: 'oeil', src: await recolorerOeil(url(o.fichier), url(o.iris), A.YEUX[ap.couleurYeux] || A.YEUX.marron, cheveux), x: t.cx + (i ? 1 : -1) * t.w * 0.2 - ew / 2, y: t.haut + t.hh * 0.5 - o.h * s * 0.6, w: ew });
    }
    const coiffures = R.cheveux || [];
    const co = coiffures.find(h => h.cle === ap.coiffure && h.genre === ap.genre) || coiffures.find(h => h.genre === ap.genre && h.type === 'face');
    if (co && co.type === 'face') {
      const pic = co.calage === 'pic';
      const s = pic ? c.teteLargeur / co.visageLargeur : c.teteLargeurHaut / co.visageLargeurHaut;
      const pos = { x: t.cx - co.visageCx * s, y: pic ? t.pic - co.visagePic * s : t.haut - co.visageHaut * s, w: co.w * s };
      out.push(Object.assign({ classe: 'cheveux', src: await teinter(url(co.fichier), cheveux) }, pos));
      if (co.fond) out.unshift(Object.assign({ classe: 'cheveux', src: await teinter(url(co.fond), cheveux) }, pos));
    } else if (co) {
      const s = (t.w * 1.12) / co.craneLargeur;
      out.push({ classe: 'cheveux', src: await teinter(url(co.fichier), cheveux), x: t.cx - co.craneCx * s, y: t.haut - t.hh * 0.2, w: co.w * s });
    }
    habits.filter(h => h.ordre >= 10).forEach(h => out.push(calque(h)));
    return { corps: c, calques: out, largeurMax: Math.max(...liste.map(x => x.w)) };
  };

  /** Dessine le personnage dans el (hauteur taille px). */
  A.dessiner = async function (el, pack, apparence, stade, taille) {
    const r = await A.calques(pack, apparence, stade);
    const k = taille / HAUTEUR_REF;
    el.innerHTML = `<div class="av-perso" style="width:${Math.ceil(r.largeurMax * k)}px;height:${taille}px"><div class="av-echelle" style="transform:translateX(-50%) scale(${k})">
      <div class="av-corps" style="width:${r.corps.w}px;height:${r.corps.h}px">${r.calques.map(c => `<img src="${c.src}" class="av-calque avc-${c.classe}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px" alt="" draggable="false">`).join('')}</div></div></div>`;
  };
})();
