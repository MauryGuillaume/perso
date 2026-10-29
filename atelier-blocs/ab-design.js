/* ==========================================================================
   ab-design.js — moteur de DESSIN : personnages, skins, compagnons, mouvements
   Tout est dessiné en SVG (vectoriel, léger, net à toutes les tailles),
   style « manga » : contour encre épais, aplats, ombres franches.
   - avatar   : personnage de face qui évolue avec le niveau (5 stades)
   - calques  : un skin = un calque par emplacement (coiffure, vêtement…),
                même cadre 200×200 que le personnage, donc superposables
   - compagnons : 8 espèces × 4 paliers d'évolution, animés (respiration, clignement)
   - mouvements : exercices animés (squat, pompes, burpees…), dans la tenue du joueur
   La fonction moteurDesign() n'utilise rien d'extérieur : son code est aussi
   embarqué tel quel dans les apps générées (bloc « Coach avatar »).
   ========================================================================== */
function moteurDesign() {
  const ENCRE = '#131217', PAPIER = '#EFEDE6', OR = '#E3A93E', VERMILLON = '#E1382D';
  const n = v => Math.round(v * 10) / 10;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let compteur = 0;
  const uid = p => p + (++compteur).toString(36);

  /* ---------- Couleurs ---------- */
  function rgb(hex) { const h = String(hex || '#888').replace('#', ''); const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h; return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) || 0); }
  const hexa = a => '#' + a.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const melange = (a, b, t) => { const x = rgb(a), y = rgb(b); return hexa(x.map((v, i) => v + (y[i] - v) * t)); };
  const fonce = (c, t) => melange(c, '#000000', t === undefined ? 0.22 : t);
  const clair = (c, t) => melange(c, '#ffffff', t === undefined ? 0.35 : t);

  const PEAUX = { claire: '#F6D7BE', doree: '#E8B98D', mate: '#C98E62', brune: '#8D5A3B', foncee: '#5E3A26' };
  const CHEVEUX = { noir: '#24212B', brun: '#5B3A26', chatain: '#8A5A34', blond: '#E2B45A', roux: '#C4532A', bleu: '#3456C9', rose: '#E46BA0', blanc: '#E9E6DF' };

  /** Les 5 stades du personnage : il évolue avec le niveau du joueur. */
  const STADES = [
    { stade: 1, niveau: 1, nom: 'Débutant', texte: 'Premiers pas' },
    { stade: 2, niveau: 5, nom: 'Motivé', texte: 'Regard décidé, énergie qui monte' },
    { stade: 3, niveau: 10, nom: 'Sportif', texte: 'Bras dessinés, lignes de vitesse' },
    { stade: 4, niveau: 15, nom: 'Athlète', texte: 'Rayons de concentration' },
    { stade: 5, niveau: 25, nom: 'Légende', texte: 'Aura dorée, mèches de lumière' }
  ];
  const stadeDuNiveau = niv => STADES.filter(s => (niv || 1) >= s.niveau).pop().stade;

  /* ---------- Enveloppe SVG ---------- */
  function enveloppe(contenu, o) {
    o = o || {};
    const vb = o.vb || [0, 0, 200, 200];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${o.taille || vb[2]}" height="${o.taille ? n(o.taille * vb[3] / vb[2]) : vb[3]}"${o.titre ? ` role="img" aria-label="${esc(o.titre)}"` : ''}>${o.titre ? `<title>${esc(o.titre)}</title>` : ''}${o.style ? `<style>${o.style}</style>` : ''}${o.defs ? `<defs>${o.defs}</defs>` : ''}${contenu}</svg>`;
  }
  const trait = (c, l) => `stroke="${c || ENCRE}" stroke-width="${l || 4}" stroke-linejoin="round" stroke-linecap="round"`;
  const S = trait();   // contour encre standard

  /* ---------- Motifs des vêtements ---------- */
  const MOTIFS = { uni: 'Uni', rayures: 'Rayures', bandes: 'Bandes latérales', eclair: 'Éclair', etoile: 'Étoile', pois: 'Pois', numero: 'Numéro' };
  function motif(id, nom, c1, c2) {
    if (nom === 'rayures') return `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${c1}"/><rect y="7" width="12" height="5" fill="${c2}"/></pattern>`;
    if (nom === 'pois') return `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="${c1}"/><circle cx="7" cy="7" r="2.6" fill="${c2}"/></pattern>`;
    return '';
  }
  const remplissage = (id, nom, c1) => (nom === 'rayures' || nom === 'pois') ? `url(#${id})` : c1;
  /** Logo de poitrine (éclair, étoile, numéro), centré en (x, y). */
  function logo(nom, x, y, c2, texte) {
    if (nom === 'eclair') return `<path d="M${x + 3},${y - 13} L${x - 7},${y + 2} L${x},${y + 2} L${x - 3},${y + 13} L${x + 8},${y - 3} L${x + 1},${y - 3} Z" fill="${c2}" ${trait(ENCRE, 2)}/>`;
    if (nom === 'etoile') { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + i * Math.PI / 5; p.push(n(x + r * Math.cos(a)) + ',' + n(y + r * Math.sin(a))); } return `<polygon points="${p.join(' ')}" fill="${c2}" ${trait(ENCRE, 2)}/>`; }
    if (nom === 'numero') return `<text x="${x}" y="${y + 7}" text-anchor="middle" font-family="Anton, Impact, 'Arial Narrow', sans-serif" font-size="21" fill="${c2}" stroke="${ENCRE}" stroke-width="1.2" paint-order="stroke">${esc(String(texte || '7').slice(0, 2))}</text>`;
    if (nom === 'bandes') return '';
    return '';
  }

  /* ======================= AVATAR (de face, cadre 200×200) ======================= */
  // Proportions de héros de manga : tête ≈ 1/5 de la hauteur. La musculature grandit à chaque stade.
  const pt = p => n(p[0]) + ',' + n(p[1]);
  const sym = p => [200 - p[0], p[1]];

  /** Morphologie d'un stade (0 à 4) : largeurs et articulations du côté droit de l'image. */
  function morpho(stade) {
    const i = stade - 1;
    const g = {
      i, S: [21, 24, 28, 33, 39][i], W: [14.5, 15.5, 16.5, 17.5, 19][i], nw: [5.5, 6.5, 7.5, 9, 11.5][i],
      trap: [0, 1, 3, 6, 10][i], lat: [0, 1.5, 3.5, 6.5, 10][i],
      ua: [4.4, 5.2, 6.4, 7.8, 9.6][i], bi: [0.4, 1.2, 2.4, 3.8, 5.6][i],
      fa: [3.8, 4.4, 5.2, 6.2, 7.4][i], fab: [0.4, 1, 1.8, 2.6, 3.8][i],
      cu: [7.4, 8.2, 9.2, 10.6, 12.4][i], qb: [0.4, 1.2, 2.2, 3.4, 5][i],
      mo: [4.8, 5.2, 5.8, 6.6, 7.6][i], mb: [0.8, 1.4, 2.2, 3.2, 4.4][i],
      rp: [4.6, 5.1, 5.8, 6.6, 7.6][i], delt: [5.2, 6.4, 8, 9.8, 12.2][i]
    };
    g.epaule = [100 + g.S - 3, 60];
    g.coude = [100 + g.S + 2 + i * 1.4, 88];
    g.poignet = [100 + g.S + 4 + i * 2.2, 112];
    g.poing = [g.poignet[0] + 1, g.poignet[1] + g.rp * 0.9];
    g.hanche = [100 + 8.5 + i * 0.6, 117];
    g.genou = [100 + 9 + i * 0.9, 149];
    g.cheville = [100 + 9 + i * 0.7, 180];
    return g;
  }

  /** Membre (segment musclé) de A vers B : largeurs aux deux bouts et renflement (biceps, mollet…). */
  function membre(A, B, wA, wB, bo, bi, pos) {
    pos = pos === undefined ? 0.42 : pos;
    const dx = B[0] - A[0], dy = B[1] - A[1], Lg = Math.hypot(dx, dy) || 1, nx = -dy / Lg, ny = dx / Lg;
    const P = (t, w) => [A[0] + dx * t + nx * w, A[1] + dy * t + ny * w];
    const wm = wA + (wB - wA) * pos;
    const a1 = P(0, wA), b1 = P(1, wB), b2 = P(1, -wB), a2 = P(0, -wA), m1 = P(pos, wm + bo), m2 = P(pos, -(wm + bi));
    const c1 = [2 * m1[0] - (a1[0] + b1[0]) / 2, 2 * m1[1] - (a1[1] + b1[1]) / 2];
    const c2 = [2 * m2[0] - (a2[0] + b2[0]) / 2, 2 * m2[1] - (a2[1] + b2[1]) / 2];
    return `M${pt(a1)} Q${pt(c1)} ${pt(b1)} A${n(wB)},${n(wB)} 0 0 0 ${pt(b2)} Q${pt(c2)} ${pt(a2)} A${n(wA)},${n(wA)} 0 0 0 ${pt(a1)} Z`;
  }

  /** Forme ombrée façon cel-shading : ombre franche côté droit/bas, contour encre. */
  function forme(d, c, o) {
    o = o || {};
    const id = uid('k'), dx = o.dx === undefined ? 3 : o.dx, dy = o.dy === undefined ? 1.5 : o.dy;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})"><path d="${d}" fill="${o.ombre || fonce(c, 0.24)}"/><path d="${d}" fill="${c}" transform="translate(${-dx} ${-dy})"/>${o.reflet ? `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2" transform="translate(${dx * 0.8} ${dy})"/>` : ''}</g>${o.contour === 0 ? '' : `<path d="${d}" fill="none" ${trait(ENCRE, o.contour || 2.6)}/>`}`;
  }
  /** Plusieurs formes fondues en une seule silhouette : un passage encre (contour commun), puis la couleur sans contour. */
  const silhouette = (ds, c, ep) => ds.map(d => `<path d="${d}" fill="${ENCRE}" ${trait(ENCRE, (ep || 2.6) * 2)}/>`).join('') + ds.map(d => forme(d, c, { contour: 0 })).join('');
  const ligne = (d, l, c) => `<path d="${d}" fill="none" ${trait(c || ENCRE, l || 1.5)}/>`;

  /** Contour du torse (gonfle : épaisseur en plus pour un vêtement ; bas : ourlet horizontal). */
  function torse(g, gonfle, bas) {
    const k = gonfle || 0, S = g.S + k, W = g.W + k, nw = g.nw + k * 0.5, t = g.trap, lat = g.lat;
    const droite = [
      [[100 + nw * 0.5, 48 - k], [100 + nw * 0.8, 47.5 - k], [100 + nw, 47 - k]],
      [[100 + nw + (S - nw) * 0.3, 48 - t * 0.35 - k], [100 + S - 10, 52 - t * 0.3 - k], [100 + S - 4, 55 - k]],
      [[100 + S + 1, 57], [100 + S, 66], [100 + S - 5, 73]],
      [[100 + S - 5 + lat * 0.45, 82], [100 + W + lat * 0.55, 95], [100 + W, 104]]
    ];
    if (bas) droite.push([[100 + W, 108], [100 + W + 1.5, bas - 4], [100 + W + 2, bas]], [[100 + W, bas + 0.5], [104, bas + 1], [100, bas + 1]]);
    else droite.push([[100 + W, 110], [100 + W + 2, 112], [100 + W + 2, 118]], [[100 + W, 122], [106, 124], [100, 124]]);
    const debut = [100, 48 - k];
    let d = `M${pt(debut)}`;
    droite.forEach(s => { d += ` C${pt(s[0])} ${pt(s[1])} ${pt(s[2])}`; });
    // côté gauche : symétrique, parcouru à l'envers
    const pts = [debut].concat(droite.map(s => s[2]));
    for (let j = droite.length - 1; j >= 0; j--) d += ` C${pt(sym(droite[j][1]))} ${pt(sym(droite[j][0]))} ${pt(sym(pts[j]))}`;
    return d + ' Z';
  }

  /** Bras (droit si cote = 1, gauche si -1) : épaule, coude, poignet. */
  const bras = (g, cote) => { const f = cote > 0 ? p => p : sym; return { e: f(g.epaule), c: f(g.coude), p: f(g.poignet), poing: f(g.poing) }; };
  const jambe = (g, cote) => { const f = cote > 0 ? p => p : sym; return { h: f(g.hanche), g: f(g.genou), c: f(g.cheville) }; };

  function fondStade(stade, g) {
    let s = `<ellipse cx="100" cy="191" rx="${44 + g.i * 4}" ry="5.5" fill="${ENCRE}" opacity=".18"/>`;
    if (stade === 3) s = `<g ${trait(ENCRE, 2.5)} opacity=".3"><path d="M14,96 h34 M6,112 h40 M18,128 h28 M152,96 h34 M154,112 h40 M154,128 h28"/></g>` + s;
    if (stade >= 4) {
      const rayons = [];
      for (let k = 0; k < 28; k++) { const a = k * Math.PI / 14, a2 = a + 0.06; rayons.push(`M${n(100 + 58 * Math.cos(a))},${n(100 + 58 * Math.sin(a))} L${n(100 + 150 * Math.cos(a))},${n(100 + 150 * Math.sin(a))} L${n(100 + 150 * Math.cos(a2))},${n(100 + 150 * Math.sin(a2))} Z`); }
      s = `<path class="rayons" d="${rayons.join(' ')}" fill="${stade === 5 ? OR : VERMILLON}" opacity="${stade === 5 ? 0.3 : 0.16}"/>` + s;
    }
    if (stade === 5) {
      // Aura en flammes autour du corps
      const fl = [];
      for (let k = 0; k <= 16; k++) {
        const a = Math.PI * (0.05 + 0.9 * k / 16), r = k % 2 ? 62 : 82, h = k % 2 ? 0 : 14;
        fl.push(pt([100 - Math.cos(a) * r * 0.82, 120 - Math.sin(a) * r * 1.25 - h]));
      }
      s = `<path class="aura" d="M${fl.join(' L')} L${pt([100 + 64, 196])} L${pt([100 - 64, 196])} Z" fill="${OR}" opacity=".32" ${trait(OR, 6)}/>` +
        `<path class="aura" d="M${fl.map(p => p.split(',').map((v, j) => j ? n(+v * 0.86 + 22) : n((+v - 100) * 0.82 + 100)).join(',')).join(' L')} Z" fill="#FFF1C9" opacity=".45"/>` + s;
    }
    return s;
  }

  function cheveux(c, stade) {
    const reflet = clair(c, 0.35), heros = stade === 5;
    const pointes = heros
      ? 'M85,26 L74,14 L85,15 L78,2 L91,9 L93,0 L101,8 L108,0 L111,9 L122,3 L116,15 L127,14 L115,26 Z'
      : stade >= 3 ? 'M86,24 L80,14 L88,15 L86,6 L94,10 L98,3 L103,9 L110,4 L111,12 L119,11 L114,24 Z'
        : 'M87,23 L84,15 L90,15 L90,8 L97,11 L101,6 L105,11 L111,8 L111,15 L116,15 L113,23 Z';
    const frange = 'M86.5,27 C86,18 92,13 100,13 C108,13 114,18 113.5,27 L111,21 L108.5,25 L106,18.5 L103,24 L100,17.5 L97,24 L94,18.5 L91.5,25 L89,21 Z';
    return `<path d="${pointes}" fill="${c}" ${trait(ENCRE, 2.6)}/><path d="${frange}" fill="${c}" ${trait(ENCRE, 2.4)}/>
      ${ligne(heros ? 'M92,9 L95,15 M106,7 L104,14 M84,16 L88,20' : 'M95,11 L97,15 M105,10 L104,14', 2, reflet)}${heros ? ligne('M78,2 L85,15 M122,3 L116,15 M93,0 L95,10', 1.6, OR) : ''}`;
  }

  function visage(g, peau) {
    const i = g.i, oe = [0, 0.5, 1, 1.6, 2.2][i];
    let s = '';
    [-1, 1].forEach(k => {
      const cx = 100 + k * 6;
      // œil en amande, iris noir, reflet ; paupière supérieure épaisse qui s'abaisse côté nez (regard décidé)
      s += `<path d="M${n(cx - k * 3.8)},${n(30.2)} Q${n(cx)},${n(27.4 + oe * 0.3)} ${n(cx + k * 3.8)},${n(29.4 + oe * 0.5)} Q${n(cx)},${n(32.6)} ${n(cx - k * 3.8)},${n(30.2)} Z" fill="#fff"/>
        <circle cx="${n(cx - k * 0.2)}" cy="30.2" r="${n(2.1 - i * 0.12)}" fill="${ENCRE}"/><circle cx="${n(cx - k * 0.9 + 0.6)}" cy="29.4" r=".7" fill="#fff"/>
        ${ligne(`M${n(cx - k * 4.2)},${n(30)} Q${n(cx)},${n(26.8 + oe * 0.35)} ${n(cx + k * 4.2)},${n(29.2 + oe * 0.6)}`, 1.9)}
        <path d="M${n(100 + k * 10.8)},${n(24.6 - i * 0.2)} L${n(100 + k * 2.6)},${n(25.6 + oe)} L${n(100 + k * 2.8)},${n(27.2 + oe)} L${n(100 + k * 10.6)},${n(26.2 - i * 0.1)} Z" fill="${ENCRE}"/>`;
    });
    s += ligne('M100.6,32.2 L99,36 L101.4,36.4', 1.2, fonce(peau, 0.45));
    const bouches = [
      ligne('M96.6,40.6 Q100,42.6 103.4,40.6', 1.6),
      ligne('M96.2,40.8 Q100,42.4 104,39.6', 1.7),
      ligne('M96,40.6 Q100.5,42 104.4,39.4', 1.8) + ligne('M104.2,39.4 l1,-.6', 1.2),
      ligne('M95.6,40.6 L104.4,40.6', 2) + ligne('M95.6,40.6 l-1,1 M104.4,40.6 l1,1', 1.2),
      `<path d="M94.6,39.4 Q100,45.6 105.4,39.4 Z" fill="#fff" ${trait(ENCRE, 1.6)}/>${ligne('M96,40.6 H104.2 M100,39.6 V43', 0.9)}`
    ];
    s += bouches[i];
    if (i >= 3) s += ligne('M90,35 l1.6,2.4 M110,35 l-1.6,2.4', 1, fonce(peau, 0.35));
    return s;
  }

  /** Muscles dessinés : pectoraux, abdominaux, obliques, dentelés, deltoïdes, biceps, quadriceps, veines. */
  function muscles(g, peau) {
    const i = g.i, S = g.S, W = g.W, ombre = fonce(peau, 0.2), trait2 = (d, l) => ligne(d, l || 1.4);
    let s = '';
    if (i >= 1) [-1, 1].forEach(k => {
      const x = v => 100 + k * v;
      const pec = `M${x(1)},61 C${x(1)},${72 + i} ${x(S * 0.5)},${76 + i * 1.3} ${x(S - 6)},66`;
      if (i >= 2) s += `<path d="${pec} C${x(S - 5)},${70 + i} ${x(S * 0.5)},${80 + i * 1.4} ${x(1)},${76 + i}Z" fill="${ombre}" opacity=".55"/>`;
      s += trait2(pec, i >= 3 ? 1.8 : 1.3);
      if (i >= 3) s += trait2(`M${x(g.nw + 1.5)},51.5 Q${x(S * 0.55)},53.5 ${x(S - 6)},57`, 1.1);
      if (i >= 3) s += trait2(`M${x(W + g.lat * 0.4 - 1)},84 L${x(W - 3)},90 M${x(W + g.lat * 0.3 - 1)},92 L${x(W - 4)},98`, 1.2);
      if (i >= 4) s += trait2(`M${x(S - 9)},71 l${-k * 4},3 M${x(S - 10)},76 l${-k * 4},3 M${x(S - 11)},81 l${-k * 3.6},2.6`, 1.2);
    });
    if (i >= 2) {
      const rangs = i - 0, aw = W * 0.5, y0 = 80 + i * 1.2, h = [0, 0, 7.6, 7, 6.4][i];
      s += trait2(`M100,${62 + i * 2} V${y0 + rangs * h + 2}`, 1.2);
      for (let r = 0; r < rangs; r++) [-1, 1].forEach(k => {
        const y = y0 + r * h, x0 = k > 0 ? 101.2 : 98.8 - aw;
        s += `<rect x="${n(x0)}" y="${n(y)}" width="${n(aw)}" height="${n(h - 1.4)}" rx="2.6" fill="${clair(peau, 0.08)}" ${trait(ENCRE, 1.15)}/>${ligne(`M${n(x0 + 1)},${n(y + h - 1.6)} h${n(aw - 2)}`, 1.4, ombre)}`;
      });
    }
    if (i >= 3) s += `<path d="M${100 - g.nw},48 L${100 - g.nw - 6},53 L${100 - g.nw - 1},55 Z M${100 + g.nw},48 L${100 + g.nw + 6},53 L${100 + g.nw + 1},55 Z" fill="${ombre}" opacity=".6"/>`;
    return s;
  }

  function brasDessin(g, peau, cote) {
    const b = bras(g, cote), i = g.i;
    const haut = membre(b.e, b.c, g.ua, g.ua * 0.78, cote > 0 ? g.bi * 0.4 : g.bi, cote > 0 ? g.bi : g.bi * 0.4, 0.55);
    const avb = membre(b.c, b.p, g.fa, g.fa * 0.72, cote > 0 ? g.fab : g.fab * 0.5, cote > 0 ? g.fab * 0.5 : g.fab, 0.3);
    const d = b.e;
    const delto = (`M${n(d[0] - g.delt * 0.9)},${n(d[1] + 2)} C${n(d[0] - g.delt)},${n(d[1] - g.delt * 0.9)} ${n(d[0] + g.delt)},${n(d[1] - g.delt * 0.9)} ${n(d[0] + g.delt * 0.95)},${n(d[1] + 3)} C${n(d[0] + g.delt * 0.8)},${n(d[1] + g.delt * 1.2)} ${n(d[0] + cote * 2)},${n(d[1] + g.delt * 1.5)} ${n(d[0] - g.delt * 0.9)},${n(d[1] + 2)} Z`);
    const poing = `M${n(b.poing[0] - g.rp)},${n(b.poing[1] - g.rp * 0.4)} a${g.rp},${n(g.rp * 1.05)} 0 1 0 ${n(g.rp * 2)},0 a${g.rp},${n(g.rp * 1.05)} 0 1 0 ${n(-g.rp * 2)},0 Z`;
    let s = silhouette([avb, poing, haut, delto], peau);
    // creux du deltoïde, marqué dès que le muscle prend du volume
    if (i >= 1) s += ligne(`M${n(d[0] - cote * g.delt * 0.7)},${n(d[1] + g.delt * 0.9)} Q${n(d[0] + cote * 1)},${n(d[1] + g.delt * 1.5)} ${n(d[0] + cote * g.delt * 0.85)},${n(d[1] + g.delt * 0.6)}`, 1.3);
    if (i >= 2) s += ligne(`M${n(b.c[0] - cote * (g.ua * 0.3))},${n(b.c[1] - 3)} q${n(-cote * 2)},${-7 - i} ${n(-cote * 1)},${-12 - i * 1.5}`, 1.2);
    if (i >= 3) s += ligne(`M${n(b.c[0] + cote * 1)},${n(b.c[1] + 4)} q${n(cote * 2.5)},6 ${n(cote * 1.5)},13`, 1.1);
    if (i >= 4) s += ligne(`M${n(b.p[0] - cote * 2)},${n(b.p[1] - 4)} q${n(-cote * 2)},-5 0,-9 q${n(cote * 2)},-4 ${n(-cote * 0.5)},-9 M${n(b.c[0] - cote * 3)},${n(b.c[1] - 8)} q${n(-cote * 2)},-4 ${n(-cote * 0.5)},-9`, 1.1, fonce(peau, 0.32));
    s += ligne(`M${n(b.poing[0] - g.rp * 0.6)},${n(b.poing[1] - 1)} h${n(g.rp * 1.2)} M${n(b.poing[0] - g.rp * 0.5)},${n(b.poing[1] + 2.4)} h${n(g.rp)}`, 1);
    return s;
  }

  function jambeDessin(g, peau, cote) {
    const j = jambe(g, cote), i = g.i;
    const cuisse = membre(j.h, j.g, g.cu, g.cu * 0.62, cote > 0 ? g.qb * 0.8 : g.qb, cote > 0 ? g.qb : g.qb * 0.8, 0.4);
    const mollet = membre(j.g, j.c, g.mo, 3.4, cote > 0 ? g.mb * 0.7 : g.mb, cote > 0 ? g.mb : g.mb * 0.7, 0.3);
    let s = silhouette([mollet, cuisse], peau);
    if (i >= 2) s += ligne(`M${n(j.g[0] - cote * 3)},${n(j.g[1] - 3)} q${n(-cote * 5)},-6 ${n(-cote * 3)},-14`, 1.2);
    if (i >= 3) s += ligne(`M${n(j.h[0] + cote * g.cu * 0.6)},${n(j.h[1] + 4)} Q${n(j.g[0] + cote * 2)},${n(j.h[1] + 18)} ${n(j.g[0] + cote * 3)},${n(j.g[1] - 4)}`, 1.1) + ligne(`M${n(j.g[0] + cote * 1)},${n(j.g[1] + 6)} q${n(cote * 3)},6 ${n(cote * 1)},12`, 1.1);
    return s;
  }

  /** Personnage de base (sans skin) : morphologie du stade, short, baskets simples, effets. */
  function base(o) {
    o = o || {};
    const stade = o.stade || 1, peau = o.peau || PEAUX.doree, ch = o.cheveux || CHEVEUX.brun, g = morpho(stade);
    let s = fondStade(stade, g);
    [-1, 1].forEach(k => { s += jambeDessin(g, peau, k); });
    [-1, 1].forEach(k => { const c = jambe(g, k).c; s += forme(`M${n(c[0] - 8 - g.i * 0.4)},${n(c[1] + 10)} L${n(c[0] - 6.5)},${n(c[1] - 1)} Q${n(c[0])},${n(c[1] - 4)} ${n(c[0] + 6.5)},${n(c[1] - 1)} L${n(c[0] + 8 + g.i * 0.4)},${n(c[1] + 10)} Z`, '#E4E1D7') + ligne(`M${n(c[0] - 8)},${n(c[1] + 7.5)} H${n(c[0] + 8)}`, 1.6); });
    // short
    const sh = `M${n(100 - g.W - 1.5)},106 L${n(100 + g.W + 1.5)},106 L${n(g.hanche[0] + g.cu + 3)},134 L${n(101.5)},136 L100,130 L${n(98.5)},136 L${n(200 - g.hanche[0] - g.cu - 3)},134 Z`;
    s += `<path d="M${n(100 - g.nw * 0.8)},50 L${n(100 - g.nw * 0.7)},38 L${n(100 + g.nw * 0.7)},38 L${n(100 + g.nw * 0.8)},50 Z" fill="${fonce(peau, 0.12)}" ${trait(ENCRE, 2.4)}/>`;
    s += forme(torse(g), peau) + muscles(g, peau);
    s += forme(sh, '#2A2830') + ligne(`M${n(100 - g.W)},110 H${n(100 + g.W)}`, 1.2, '#55525E');
    [-1, 1].forEach(k => { s += brasDessin(g, peau, k); });
    if (g.i >= 3) s += ligne(`M${n(100 - g.nw * 0.5)},40 L98,49 M${n(100 + g.nw * 0.5)},40 L102,49`, 1.1, fonce(peau, 0.35));
    // tête
    const jaw = g.i >= 3 ? 'M87,24 C87,11 113,11 113,24 L113,33 C112.5,40 106,45.5 100,46.6 C94,45.5 87.5,40 87,33 Z' : 'M87,24 C87,11 113,11 113,24 L113,31 C113,38 108,44 100,46.4 C92,44 87,38 87,31 Z';
    s += forme('M84.4,26 a2.8,4.6 0 1 0 0.1,0 Z M115.6,26 a2.8,4.6 0 1 0 0.1,0 Z', peau, { dx: 1, dy: 0.5 }) + forme(jaw, peau, { dx: 2.2, dy: 1 }) + visage(g, peau) + cheveux(ch, stade);
    if (stade === 5) s += `<g class="etincelles" fill="${OR}" ${trait(ENCRE, 1.3)}><path d="M30,52 l3,8 8,3 -8,3 -3,8 -3,-8 -8,-3 8,-3 Z"/><path d="M168,40 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2 Z"/><path d="M164,150 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 Z"/></g>`;
    return s;
  }

  /* ---------- Modèles de skins, par emplacement ---------- */
  // dessin(c1, c2, motif, id, texte, g) : g = morphologie du stade, pour que le vêtement épouse le corps.
  const manche = (g, cote, c, longue) => {
    const b = bras(g, cote), fin = longue ? b.c : [b.e[0] + (b.c[0] - b.e[0]) * 0.5, b.e[1] + (b.c[1] - b.e[1]) * 0.5];
    let s = forme(membre(b.e, fin, g.ua + 2.6, g.ua + 1.6, g.bi * 0.6, g.bi * 0.6, 0.5), c);
    s += forme(`M${n(b.e[0] - g.delt - 1.5)},${n(b.e[1] + 3)} C${n(b.e[0] - g.delt - 1)},${n(b.e[1] - g.delt - 1)} ${n(b.e[0] + g.delt + 1)},${n(b.e[1] - g.delt - 1)} ${n(b.e[0] + g.delt + 1.6)},${n(b.e[1] + 4)} L${n(b.e[0] + 2)},${n(b.e[1] + g.delt + 4)} Z`, c);
    if (longue) s += forme(membre(b.c, b.p, g.fa + 2, g.fa + 1.2, g.fab * 0.5, g.fab * 0.5, 0.3), c) + forme(membre([b.p[0] - (b.p[0] - b.c[0]) * 0.12, b.p[1] - (b.p[1] - b.c[1]) * 0.12], b.p, g.fa + 1.6, g.fa + 1.4, 0, 0), fonce(c, 0.12));
    return s;
  };
  const tissuMuscles = (g, c) => g.i >= 2 ? ligne(`M101,62 C101,${72 + g.i} ${100 + g.S * 0.5},${76 + g.i * 1.3} ${100 + g.S - 6},66 M99,62 C99,${72 + g.i} ${100 - g.S * 0.5},${76 + g.i * 1.3} ${100 - g.S + 6},66`, 1.2, fonce(c, 0.32)) + (g.i >= 3 ? ligne(`M100,${80 + g.i} V104 M${100 - g.W * 0.5},${90 + g.i} H${100 + g.W * 0.5}`, 1, fonce(c, 0.28)) : '') : '';
  const MODELES = {
    coiffure: {
      bandeau: { nom: 'Bandeau', cadre: [78, 8, 46, 26], dessin: (c1, c2) => forme('M86.4,19 C93,15.6 107,15.6 113.6,19 L113.4,23.4 C107,20.4 93,20.4 86.6,23.4 Z', c1) + forme('M112.6,19.6 L121,15 L119,21 L123.4,25.6 L112.8,23 Z', c1) + ligne('M88,20.6 C94,18.2 106,18.2 112,20.6', 1, c2) },
      casquette: { nom: 'Casquette', cadre: [80, 2, 40, 30], dessin: (c1, c2) => forme('M86.4,22 C86,9 93,5.5 100,5.5 C107,5.5 114,9 113.6,22 Z', c1) + ligne('M100,5.8 V21', 1.4, fonce(c1, 0.3)) + forme('M86,21 C93,18.6 107,18.6 114,21 C119,22 120,25 115.6,25.6 C108,23.6 92,23.6 84.4,25.6 C80,25 81,22 86,21 Z', fonce(c1, 0.1)) + forme('M94,10.6 H106 V15.6 H94 Z', c2) + `<circle cx="100" cy="5.8" r="2" fill="${c2}" ${trait(ENCRE, 1.4)}/>` },
      bonnet: { nom: 'Bonnet', cadre: [80, 0, 40, 30], dessin: (c1, c2) => forme('M87,20 C86,8 93,4.6 100,4.6 C107,4.6 114,8 113,20 Z', c1) + forme('M86,18 H114 V24.4 H86 Z', fonce(c1, 0.12)) + ligne('M90,18.6 v5 M95,18.6 v5 M100,18.6 v5 M105,18.6 v5 M110,18.6 v5', 1, fonce(c1, 0.35)) + forme('M100,0.6 a4,4 0 1 0 .1,0 Z', c2, { dx: 1, dy: 1 }) },
      couronne: { nom: 'Couronne de laurier', cadre: [78, 6, 44, 24], dessin: (c1, c2) => { let f = ligne('M86,22 C92,14 108,14 114,22', 3.6) + ligne('M86,22 C92,14 108,14 114,22', 1.8, c2); for (let k = 0; k < 5; k++) [-1, 1].forEach(s => { const x = 100 + s * (13 - k * 2.6), y = 21 - k * 1.9; f += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="3.4" ry="1.7" transform="rotate(${s * (36 - k * 7)} ${n(x)} ${n(y)})" fill="${k % 2 ? c1 : clair(c1, 0.2)}" ${trait(ENCRE, 1.1)}/>`; }); return f + `<circle cx="100" cy="14.6" r="2" fill="${c2}" ${trait(ENCRE, 1.1)}/>`; } },
      crete: { nom: 'Crête', cadre: [86, 0, 28, 24], dessin: (c1, c2) => forme('M93,17 L91,2 L97,9 L100,0.6 L103,9 L109,2 L107,17 Z', c1) + ligne('M97,9 L98,14 M103,9 L102,14', 1.4, c2) }
    },
    vetement: {
      tshirt: { nom: 'T-shirt', cadre: [56, 40, 88, 86], dessin: (c1, c2, m, id, txt, g) => [-1, 1].map(k => manche(g, k, c1)).join('') + forme(torse(g, 1.4, 116), remplissage(id, m, c1), { ombre: fonce(c1, 0.2) }) + tissuMuscles(g, c1) + (m === 'bandes' ? ligne(`M${100 - g.W - 0.5},92 V114 M${100 + g.W + 0.5},92 V114`, 3, c2) : '') + ligne(`M${n(100 - g.nw - 1)},48 Q100,${55 + g.i * 0.4} ${n(100 + g.nw + 1)},48`, 2.6, c2) + logo(m, 100, 70 + g.i, c2, txt) },
      debardeur: { nom: 'Débardeur', cadre: [64, 40, 72, 86], dessin: (c1, c2, m, id, txt, g) => { const d = torse(g, 1.2, 116), cl = uid('d'); return `<clipPath id="${cl}"><path d="M${n(100 - g.S + 6)},40 H${n(100 + g.S - 6)} L${n(100 + g.S - 5)},74 L${n(100 + g.W + 4)},130 H${n(100 - g.W - 4)} L${n(100 - g.S + 5)},74 Z"/></clipPath><g clip-path="url(#${cl})">${forme(d, remplissage(id, m, c1), { ombre: fonce(c1, 0.2) })}</g>` + ligne(`M${n(100 - g.S + 6)},${56} L${n(100 - g.S + 5)},74 M${n(100 + g.S - 6)},56 L${n(100 + g.S - 5)},74`, 2.4) + tissuMuscles(g, c1) + ligne(`M${n(100 - g.nw - 1)},48 Q100,${58 + g.i} ${n(100 + g.nw + 1)},48`, 2.4, c2) + logo(m, 100, 74 + g.i, c2, txt); } },
      veste: { nom: 'Veste de survêtement', cadre: [50, 40, 100, 86], dessin: (c1, c2, m, id, txt, g) => [-1, 1].map(k => manche(g, k, c1, true) + ligne(`M${pt(bras(g, k).e)} L${pt(bras(g, k).c)} L${pt(bras(g, k).p)}`, 1.6, c2)).join('') + forme(torse(g, 1.8, 117), remplissage(id, m, c1), { ombre: fonce(c1, 0.2) }) + ligne('M100,49 V117', 2) + ligne(`M${100 - g.nw - 3},47 L100,58 L${100 + g.nw + 3},47`, 2.2, c2) + (m === 'bandes' ? ligne(`M${100 - g.W},90 V115 M${100 + g.W},90 V115`, 2.4, c2) : '') },
      sweat: { nom: 'Sweat à capuche', cadre: [50, 36, 100, 90], dessin: (c1, c2, m, id, txt, g) => [-1, 1].map(k => manche(g, k, c1, true)).join('') + forme(torse(g, 2.2, 118), remplissage(id, m, c1), { ombre: fonce(c1, 0.2) }) + forme(`M${100 - g.nw - 6},50 C${100 - g.nw - 4},40 ${100 + g.nw + 4},40 ${100 + g.nw + 6},50 C${100 + 4},56 ${100 - 4},56 ${100 - g.nw - 6},50 Z`, fonce(c1, 0.15)) + forme(`M${100 - g.W * 0.7},100 H${100 + g.W * 0.7} L${100 + g.W * 0.8},114 H${100 - g.W * 0.8} Z`, fonce(c1, 0.08)) + ligne('M97,54 l-1,9 M103,54 l1,9', 1.4, c2) + logo(m, 100, 76 + g.i, c2, txt) },
      cape: { nom: 'Cape', cadre: [30, 40, 140, 156], dessin: (c1, c2, m, id, txt, g) => forme(`M${100 - g.S - 2},56 C${100 - g.S - 14},90 ${100 - g.S - 22},150 ${100 - g.S - 26},188 L${100 - g.S - 6},182 L${100 - g.S + 2},120 Z M${100 + g.S + 2},56 C${100 + g.S + 14},90 ${100 + g.S + 22},150 ${100 + g.S + 26},188 L${100 + g.S + 6},182 L${100 + g.S - 2},120 Z`, c1) + forme(`M${100 - g.S + 2},52 C${100 - 10},${58} ${100 + 10},58 ${100 + g.S - 2},52 L${100 + g.S - 4},58 C${100 + 10},64 ${100 - 10},64 ${100 - g.S + 4},58 Z`, fonce(c1, 0.15)) + forme('M100,55.6 a3.6,3.6 0 1 0 .1,0 Z', c2, { dx: 1, dy: 1 }) }
    },
    chaussures: {
      baskets: { nom: 'Baskets', cadre: [80, 168, 40, 26], dessin: (c1, c2, m, id, txt, g) => [-1, 1].map(k => { const c = jambe(g, k).c; return forme(`M${n(c[0] - 8.6)},${n(c[1] + 9)} L${n(c[0] - 7)},${n(c[1] - 2)} Q${n(c[0])},${n(c[1] - 5)} ${n(c[0] + 7)},${n(c[1] - 2)} L${n(c[0] + 8.6)},${n(c[1] + 9)} Z`, c1) + forme(`M${n(c[0] - 9)},${n(c[1] + 7)} H${n(c[0] + 9)} V${n(c[1] + 10.6)} H${n(c[0] - 9)} Z`, '#fff', { dx: 0, dy: 1 }) + ligne(`M${n(c[0] - 4)},${n(c[1] + 3)} l8,-3`, 2, c2); }).join('') },
      trail: { nom: 'Chaussures de trail', cadre: [78, 166, 44, 30], dessin: (c1, c2, m, id, txt, g) => [-1, 1].map(k => { const c = jambe(g, k).c; return forme(`M${n(c[0] - 9)},${n(c[1] + 9)} L${n(c[0] - 7.4)},${n(c[1] - 3)} Q${n(c[0])},${n(c[1] - 6)} ${n(c[0] + 7.4)},${n(c[1] - 3)} L${n(c[0] + 9)},${n(c[1] + 9)} Z`, c1) + forme(`M${n(c[0] - 9.6)},${n(c[1] + 7)} H${n(c[0] + 9.6)} V${n(c[1] + 11.6)} H${n(c[0] - 9.6)} Z`, '#2A2830', { dx: 0, dy: 1 }) + ligne(`M${n(c[0] - 3)},${n(c[1] - 1)} h6 M${n(c[0] - 3.6)},${n(c[1] + 2)} h7.2`, 1.3, c2); }).join('') },
      montantes: { nom: 'Montantes', cadre: [78, 160, 44, 34], dessin: (c1, c2, m, id, txt, g) => [-1, 1].map(k => { const c = jambe(g, k).c; return forme(`M${n(c[0] - 8.6)},${n(c[1] + 9)} L${n(c[0] - 6)},${n(c[1] - 12)} H${n(c[0] + 6)} L${n(c[0] + 8.6)},${n(c[1] + 9)} Z`, c1) + forme(`M${n(c[0] - 9)},${n(c[1] + 7)} H${n(c[0] + 9)} V${n(c[1] + 10.6)} H${n(c[0] - 9)} Z`, '#fff', { dx: 0, dy: 1 }) + ligne(`M${n(c[0] - 3)},${n(c[1] - 8)} h6 M${n(c[0] - 3)},${n(c[1] - 4)} h6`, 1.3, c2); }).join('') }
    },
    accessoire: {
      montre: { nom: 'Montre', cadre: [44, 96, 30, 26], dessin: (c1, c2, m, id, txt, g) => { const b = bras(g, -1), p = [b.p[0] + (b.c[0] - b.p[0]) * 0.12, b.p[1] + (b.c[1] - b.p[1]) * 0.12]; return forme(membre([p[0] + 0.6, p[1] - 2.4], [p[0] - 0.6, p[1] + 2.4], g.fa * 0.8 + 1.6, g.fa * 0.8 + 1.6, 0, 0), c1) + forme(`M${n(p[0] - 3.6)},${n(p[1] - 3.6)} h7.2 v7.2 h-7.2 Z`, c2, { dx: 1, dy: 1 }) + ligne(`M${n(p[0])},${n(p[1] - 1.6)} v1.8 h1.4`, 1); } },
      bracelet: { nom: 'Bracelet', cadre: [126, 96, 30, 26], dessin: (c1, c2, m, id, txt, g) => { const b = bras(g, 1), p = [b.p[0] + (b.c[0] - b.p[0]) * 0.12, b.p[1] + (b.c[1] - b.p[1]) * 0.12]; return forme(membre([p[0] - 0.6, p[1] - 2], [p[0] + 0.6, p[1] + 2], g.fa * 0.8 + 1.4, g.fa * 0.8 + 1.4, 0, 0), c1) + `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="1.6" fill="${c2}"/>`; } },
      gourde: { nom: 'Gourde', cadre: [118, 104, 40, 60], dessin: (c1, c2, m, id, txt, g) => { const p = bras(g, 1).poing, y = p[1] + g.rp * 0.7; return ligne(`M${n(p[0] - 2)},${n(y - 2)} q2,4 4,0`, 2) + forme(`M${n(p[0] - 3.4)},${n(y)} h6.8 v4.6 h-6.8 Z`, c2, { dx: 1, dy: 1 }) + forme(`M${n(p[0] - 6)},${n(y + 4)} h12 a2,2 0 0 1 2,2 v24 a4,4 0 0 1 -4,4 h-8 a4,4 0 0 1 -4,-4 v-24 a2,2 0 0 1 2,-2 Z`, c1) + ligne(`M${n(p[0] - 3)},${n(y + 16)} h6`, 1.8, '#fff'); } },
      lunettes: { nom: 'Lunettes de sport', cadre: [84, 22, 32, 16], dessin: (c1, c2) => forme('M88,28 C92,26 98,26.6 100,28.6 C102,26.6 108,26 112,28 L111.4,32 C108,34.6 102.4,34 100.6,31.4 H99.4 C97.6,34 92,34.6 88.6,32 Z', c1, { dx: 1, dy: 1 }) + ligne('M91,29 h4 M105,29 h4', 1.4, c2) + ligne('M86.6,29 L88,28.6 M112,28.6 L113.4,29', 1.6) }
    },
    equipement: {
      sac: { nom: 'Sac à dos', cadre: [54, 34, 92, 70], dessin: (c1, c2, m, id, txt, g) => forme(`M${100 - g.S - 3},50 C${100 - g.S - 6},40 ${100 - g.nw - 8},38 ${100 - g.nw - 2},46 Z M${100 + g.S + 3},50 C${100 + g.S + 6},40 ${100 + g.nw + 8},38 ${100 + g.nw + 2},46 Z`, c1) + [-1, 1].map(k => forme(membre([100 + k * (g.nw + 4), 49], [100 + k * (g.S - 6), 76], 2.4, 2.4, 0, 0), fonce(c1, 0.1))).join('') + forme(`M${100 - g.S + 8},64 H${100 + g.S - 8} V67.6 H${100 - g.S + 8} Z`, c2, { dx: 0, dy: 1 }) },
      haltere: { nom: 'Haltère', cadre: [26, 100, 60, 40], dessin: (c1, c2, m, id, txt, g) => { const p = bras(g, -1).poing, y = p[1] - g.rp * 0.4, r = g.rp + 1; return forme(`M${n(p[0] - r - 9)},${n(y - 1.8)} h9 v3.6 h-9 Z M${n(p[0] + r)},${n(y - 1.8)} h9 v3.6 h-9 Z`, c2, { dx: 0, dy: 1 }) + forme(`M${n(p[0] - r - 17)},${n(y - 10)} h8 v20 h-8 Z M${n(p[0] + r + 9)},${n(y - 10)} h8 v20 h-8 Z`, c1) + ligne(`M${n(p[0] - r - 15)},${n(y - 7)} v6 M${n(p[0] + r + 11)},${n(y - 7)} v6`, 1.4, '#fff'); } },
      corde: { nom: 'Corde à sauter', cadre: [40, 100, 120, 96], dessin: (c1, c2, m, id, txt, g) => { const h = cote => { const p = bras(g, cote).poing; return [p[0], p[1] + g.rp * 0.6]; }, a = h(-1), b = h(1), fa = [a[0], a[1] + 13], fb = [b[0], b[1] + 13], corde = `M${pt(fa)} C${n(fa[0] - 10)},212 ${n(fb[0] + 10)},212 ${pt(fb)}`; return ligne(corde, 4) + ligne(corde, 1.8, c2) + [a, b].map(p => forme(`M${n(p[0] - 3)},${n(p[1])} h6 v14 h-6 Z`, c1, { dx: 1, dy: 1 })).join(''); } },
      ballon: { nom: 'Ballon', cadre: [128, 100, 50, 50], dessin: (c1, c2, m, id, txt, g) => { const p = bras(g, 1).poing; return forme(`M${n(p[0] + 26)},${n(p[1])} a14,14 0 1 0 -28,0 a14,14 0 1 0 28,0 Z`, c1) + ligne(`M${n(p[0] - 1)},${n(p[1] - 3)} Q${n(p[0] + 12)},${n(p[1] + 2)} ${n(p[0] + 25)},${n(p[1] - 3)} M${n(p[0] + 12)},${n(p[1] - 14)} Q${n(p[0] + 6)},${n(p[1])} ${n(p[0] + 12)},${n(p[1] + 14)}`, 1.8, c2); } }
    },
    objet_rare: {
      aura: { nom: 'Aura d’énergie', cadre: [14, 0, 172, 200], dessin: (c1, c2) => `<g class="pulse"><path d="M100,4 C152,8 182,58 176,110 C172,162 144,194 100,196 C56,194 28,162 24,110 C18,58 48,8 100,4 Z" fill="none" ${trait(c1, 4.5)} opacity=".55" stroke-dasharray="14 10"/><path d="M100,14 C144,18 166,62 162,108 C158,154 136,184 100,186 C64,184 42,154 38,108 C34,62 56,18 100,14 Z" fill="none" ${trait(c2, 2.6)} opacity=".6"/></g><g fill="${c2}" ${trait(ENCRE, 1.3)}><path d="M26,36 l3,8 8,3 -8,3 -3,8 -3,-8 -8,-3 8,-3 Z"/><path d="M176,66 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2 Z"/><path d="M36,170 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 Z"/></g>` },
      ailes: { nom: 'Ailes', cadre: [0, 30, 200, 110], dessin: (c1, c2) => { const aile = t => `<path transform="${t}" d="M74,66 C50,40 20,34 4,44 C14,50 18,56 18,62 C8,62 2,68 2,78 C12,76 20,78 24,84 C14,90 12,98 14,108 C28,98 44,96 56,96 Z" fill="${c1}" ${trait(ENCRE, 2.6)}/><path transform="${t}" d="M62,66 C46,58 32,56 20,60 M58,78 C44,74 32,76 24,84 M54,90 C44,90 34,94 28,100" fill="none" ${trait(c2, 2.2)}/>`; return `<g class="flotte">${aile('')}${aile('matrix(-1 0 0 1 200 0)')}</g>`; } }
    }
  };
  const EMPLACEMENTS = { coiffure: 'Coiffure', vetement: 'Vêtement', chaussures: 'Chaussures', accessoire: 'Accessoire', equipement: 'Équipement', objet_rare: 'Objet rare' };
  /** Dossier des calques dans Livora (Avatar.vue utilise les noms anglais). */
  const DOSSIER_CALQUE = { coiffure: 'hair', vetement: 'clothes', chaussures: 'shoes', accessoire: 'accessories', equipement: 'equipment' };

  const ANIM_CALQUES = `.pulse{animation:pulse 2.4s ease-in-out infinite;transform-origin:100px 100px}.flotte{animation:flotte 3s ease-in-out infinite}
@keyframes pulse{50%{opacity:.6;transform:scale(1.03)}}@keyframes flotte{50%{transform:translateY(-3px)}}
.rayons{animation:tourne 30s linear infinite;transform-origin:100px 100px}.aura{animation:flamme 1.2s ease-in-out infinite alternate;transform-origin:100px 196px}
@keyframes flamme{to{transform:scale(1.03,1.06)}}
.etincelles{animation:brille 1.6s ease-in-out infinite}@keyframes brille{50%{opacity:.35}}@keyframes tourne{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

  /** Dessin d'un skin sur une morphologie. skin : { emplacement, modele, couleur1, couleur2, motif, texte } */
  function dessinSkin(skin, stade) {
    const m = (MODELES[skin.emplacement] || {})[skin.modele];
    if (!m) return { defs: '', svg: '' };
    const id = uid('m');
    return { defs: motif(id, skin.motif, skin.couleur1, fonce(skin.couleur1, 0.2)), svg: m.dessin(skin.couleur1, skin.couleur2 || '#ffffff', skin.motif || 'uni', id, skin.texte, morpho(stade || 3)), cadre: m.cadre };
  }

  /** Calque seul d'un skin (cadre 200×200, transparent), pour la morphologie d'un stade (3 par défaut). */
  function calque(skin, o) {
    o = o || {};
    const d = dessinSkin(skin, o.stade || stadeDuNiveau(o.niveau || 10));
    return enveloppe(d.svg, { defs: d.defs, style: ANIM_CALQUES, titre: skin.nom, taille: o.taille });
  }
  /** Vignette d'un skin (cadré sur l'objet), pour les grilles de collection. */
  function vignette(skin, o) {
    const d = dessinSkin(skin, 3);
    const c = d.cadre || [0, 0, 200, 200], cote = Math.max(c[2], c[3]) + 10;
    const vb = [n(c[0] + c[2] / 2 - cote / 2), n(c[1] + c[3] / 2 - cote / 2), cote, cote];
    return enveloppe(d.svg, { vb, defs: d.defs, style: ANIM_CALQUES, titre: skin.nom, taille: (o || {}).taille || 120 });
  }

  const ORDRE_CALQUES = ['vetement', 'chaussures', 'coiffure', 'accessoire', 'equipement', 'objet_rare'];
  /** Personnage complet : base + skins portés. o : { niveau|stade, peau, cheveux, tenue: { emplacement: skin } } */
  function avatar(o) {
    o = o || {};
    const stade = o.stade || stadeDuNiveau(o.niveau);
    const tenue = o.tenue || {};
    let defs = '', corps = '';
    const ailes = tenue.objet_rare && tenue.objet_rare.modele === 'ailes';
    if (ailes) { const d = dessinSkin(tenue.objet_rare, stade); defs += d.defs; corps += d.svg; }
    corps += base({ stade, peau: o.peau, cheveux: o.cheveux });
    ORDRE_CALQUES.forEach(e => {
      if (!tenue[e] || (e === 'objet_rare' && ailes)) return;
      const d = dessinSkin(tenue[e], stade); defs += d.defs; corps += d.svg;
    });
    return enveloppe(corps, { defs, style: ANIM_CALQUES, titre: o.titre || 'Personnage', taille: o.taille });
  }
  /** Personnage de base seul (calque du dessous dans Livora : avatar/base/…). */
  function avatarBase(o) {
    o = o || {};
    const stade = o.stade || stadeDuNiveau(o.niveau);
    return enveloppe(base({ stade, peau: o.peau, cheveux: o.cheveux }), { style: ANIM_CALQUES, titre: 'Personnage — ' + STADES[stade - 1].nom, taille: o.taille });
  }

  /* ======================= COMPAGNONS ======================= */
  const ESPECES = {
    dragon: { nom: 'Dragon', corps: '#55B27A', ventre: '#F3E3B3', detail: '#2F7A50', oreilles: 'cornes', queue: 'pique', extra: 'ailes', bebe: 'oeuf' },
    chien: { nom: 'Chien', corps: '#C98B4E', ventre: '#F5E6CF', detail: '#6E4524', oreilles: 'tombantes', queue: 'courte', museau: true, langue: true },
    chat: { nom: 'Chat', corps: '#9A97A6', ventre: '#EDEBF2', detail: '#5E5B6A', oreilles: 'pointues', queue: 'longue', moustaches: true, rayures: true },
    renard: { nom: 'Renard', corps: '#E0702C', ventre: '#FFF6EA', detail: '#2A2026', oreilles: 'pointues', queue: 'touffue', museau: true },
    panda: { nom: 'Panda', corps: '#F7F6F2', ventre: '#F7F6F2', detail: '#24212B', oreilles: 'rondes', queue: 'courte', taches: true },
    grenouille: { nom: 'Grenouille', corps: '#6DBE45', ventre: '#DDF2C4', detail: '#3B7A22', oreilles: 'aucune', queue: 'aucune', yeuxHauts: true, bebe: 'tetard' },
    koala: { nom: 'Koala', corps: '#9AA3AD', ventre: '#E8EBEE', detail: '#3A3F47', oreilles: 'touffues', queue: 'aucune', grosNez: true },
    paresseux: { nom: 'Paresseux', corps: '#A57F5B', ventre: '#E9D7BE', detail: '#4E3826', oreilles: 'aucune', queue: 'aucune', masque: true }
  };
  const PALIERS = [1, 5, 15, 30];
  const NOMS_PALIERS = ['Bébé', 'Jeune', 'Adulte', 'Légendaire'];

  function oreilles(e, cx, cy, r) {
    const c = e.corps, d = e.detail, k = e.oreilles;
    if (k === 'pointues') return [-1, 1].map(s => `<path d="M${n(cx + s * r * 0.35)},${n(cy - r * 0.85)} L${n(cx + s * r * 0.95)},${n(cy - r * 1.35)} L${n(cx + s * r * 0.92)},${n(cy - r * 0.45)} Z" fill="${c}" ${S}/><path d="M${n(cx + s * r * 0.5)},${n(cy - r * 0.8)} L${n(cx + s * r * 0.85)},${n(cy - r * 1.12)} L${n(cx + s * r * 0.83)},${n(cy - r * 0.6)} Z" fill="${e.nom === 'Renard' ? d : '#F4A7B9'}"/>`).join('');
    if (k === 'tombantes') return [-1, 1].map(s => `<path d="M${n(cx + s * r * 0.55)},${n(cy - r * 0.8)} C${n(cx + s * r * 1.35)},${n(cy - r * 0.9)} ${n(cx + s * r * 1.3)},${n(cy + r * 0.2)} ${n(cx + s * r * 1.05)},${n(cy + r * 0.35)} C${n(cx + s * r * 0.85)},${n(cy + r * 0.1)} ${n(cx + s * r * 0.85)},${n(cy - r * 0.4)} ${n(cx + s * r * 0.55)},${n(cy - r * 0.8)} Z" fill="${d}" ${S}/>`).join('');
    if (k === 'rondes') return [-1, 1].map(s => `<circle cx="${n(cx + s * r * 0.78)}" cy="${n(cy - r * 0.78)}" r="${n(r * 0.36)}" fill="${d}" ${S}/>`).join('');
    if (k === 'touffues') return [-1, 1].map(s => `<circle cx="${n(cx + s * r * 0.95)}" cy="${n(cy - r * 0.55)}" r="${n(r * 0.5)}" fill="${c}" ${S}/><circle cx="${n(cx + s * r * 0.95)}" cy="${n(cy - r * 0.5)}" r="${n(r * 0.28)}" fill="${e.ventre}"/>`).join('');
    if (k === 'cornes') return [-1, 1].map(s => `<path d="M${n(cx + s * r * 0.45)},${n(cy - r * 0.8)} L${n(cx + s * r * 0.7)},${n(cy - r * 1.4)} L${n(cx + s * r * 0.75)},${n(cy - r * 0.7)} Z" fill="${e.ventre}" ${S}/>`).join('');
    return '';
  }

  function queue(e, palier) {
    const c = e.corps, k = e.queue, t = 0.8 + palier * 0.1;
    if (k === 'longue') return `<path class="queue" d="M128,160 C${n(150 + 20 * t)},160 ${n(150 + 20 * t)},120 ${n(140 + 18 * t)},${n(110 - 6 * t)}" fill="none" ${trait(ENCRE, 13)}/><path class="queue" d="M128,160 C${n(150 + 20 * t)},160 ${n(150 + 20 * t)},120 ${n(140 + 18 * t)},${n(110 - 6 * t)}" fill="none" ${trait(c, 6)}/>`;
    if (k === 'touffue') return `<path class="queue" d="M124,162 C150,170 176,150 172,${n(118 - 8 * t)} C166,132 152,138 140,140 C150,130 150,124 146,116 C136,134 126,144 122,150 Z" fill="${c}" ${S}/><path class="queue" d="M172,${n(118 - 8 * t)} C170,128 164,134 158,136 C162,126 166,122 172,${n(118 - 8 * t)} Z" fill="#fff" ${trait(ENCRE, 2)}/>`;
    if (k === 'pique') return `<path class="queue" d="M126,166 C150,172 164,160 168,144" fill="none" ${trait(ENCRE, 13)}/><path class="queue" d="M126,166 C150,172 164,160 168,144" fill="none" ${trait(c, 6)}/><path class="queue" d="M162,146 L172,132 L176,150 Z" fill="${e.detail}" ${S}/>`;
    if (k === 'courte') return `<ellipse cx="130" cy="164" rx="9" ry="7" fill="${e.taches ? e.detail : c}" ${S}/>`;
    return '';
  }

  /** Un compagnon à un palier d'évolution (1, 5, 15 ou 30). */
  function compagnon(cle, palier, o) {
    o = o || {};
    const e = ESPECES[cle];
    if (!e) return enveloppe('', {});
    const rang = Math.max(0, PALIERS.indexOf(palier) >= 0 ? PALIERS.indexOf(palier) : PALIERS.filter(p => palier >= p).length - 1);
    const id = uid('c');
    const style = `.respire{animation:respire 2.8s ease-in-out infinite;transform-origin:100px 180px}@keyframes respire{50%{transform:scale(1.025,.975)}}
.yeux{animation:cligne 5s infinite;transform-origin:100px 96px}@keyframes cligne{0%,93%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.queue{animation:remue 1.8s ease-in-out infinite;transform-origin:126px 162px}@keyframes remue{50%{transform:rotate(-7deg)}}
.rayons{animation:tourne 24s linear infinite;transform-origin:100px 110px}@keyframes tourne{to{transform:rotate(360deg)}}
.etincelles{animation:brille 1.5s ease-in-out infinite}@keyframes brille{50%{opacity:.3}}
.oeuf{animation:balance 2.2s ease-in-out infinite;transform-origin:100px 186px}@keyframes balance{25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;
    let fond = `<ellipse cx="100" cy="190" rx="${48 + rang * 6}" ry="6" fill="${ENCRE}" opacity=".16"/>`;
    if (rang === 3) {
      const r = [];
      for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10, a2 = a + 0.09; r.push(`M${n(100 + 60 * Math.cos(a))},${n(110 + 60 * Math.sin(a))} L${n(100 + 130 * Math.cos(a))},${n(110 + 130 * Math.sin(a))} L${n(100 + 130 * Math.cos(a2))},${n(110 + 130 * Math.sin(a2))} Z`); }
      fond = `<radialGradient id="${id}g"><stop offset="0" stop-color="${OR}" stop-opacity=".6"/><stop offset="1" stop-color="${OR}" stop-opacity="0"/></radialGradient><circle cx="100" cy="112" r="92" fill="url(#${id}g)"/><path class="rayons" d="${r.join(' ')}" fill="${OR}" opacity=".35"/>` + fond;
    }
    // Bébés particuliers : œuf de dragon, têtard
    if (rang === 0 && e.bebe === 'oeuf') {
      return enveloppe(fond + `<g class="oeuf"><path d="M100,62 C130,62 148,110 148,140 C148,172 126,188 100,188 C74,188 52,172 52,140 C52,110 70,62 100,62 Z" fill="#F3E3B3" ${S}/>
        <circle cx="80" cy="108" r="7" fill="${e.corps}" ${trait(ENCRE, 2.5)}/><circle cx="120" cy="150" r="9" fill="${e.corps}" ${trait(ENCRE, 2.5)}/><circle cx="92" cy="166" r="5" fill="${e.corps}" ${trait(ENCRE, 2.5)}/>
        <path d="M58,126 L72,118 L82,130 L94,116 L106,130 L118,116 L130,128 L142,120" fill="none" ${trait(ENCRE, 3)}/>
        <path d="M60,126 L72,118 L82,130 L94,116 L106,130 L118,116 L130,128 L140,121 C136,100 120,66 100,66 C80,66 64,100 60,126 Z" fill="${e.corps}" ${S}/>
        <g class="yeux"><ellipse cx="88" cy="100" rx="6" ry="7.5" fill="${ENCRE}"/><ellipse cx="112" cy="100" rx="6" ry="7.5" fill="${ENCRE}"/><circle cx="90" cy="97" r="2.2" fill="#fff"/><circle cx="114" cy="97" r="2.2" fill="#fff"/></g>
        <path d="M84,74 L88,64 L94,74 M106,74 L112,64 L116,74" fill="${e.ventre}" ${trait(ENCRE, 2.5)}/></g>`, { style, titre: `${e.nom} — ${NOMS_PALIERS[0]}`, taille: o.taille });
    }
    if (rang === 0 && e.bebe === 'tetard') {
      return enveloppe(fond + `<g class="respire"><path class="queue" d="M120,140 C150,128 160,160 182,146 C168,172 146,166 124,160 Z" fill="${e.detail}" ${S}/>
        <ellipse cx="96" cy="142" rx="40" ry="34" fill="${e.corps}" ${S}/><ellipse cx="90" cy="152" rx="24" ry="16" fill="${e.ventre}"/>
        <g class="yeux"><ellipse cx="82" cy="132" rx="6.5" ry="8" fill="${ENCRE}"/><ellipse cx="108" cy="132" rx="6.5" ry="8" fill="${ENCRE}"/><circle cx="84" cy="129" r="2.4" fill="#fff"/><circle cx="110" cy="129" r="2.4" fill="#fff"/></g>
        <path d="M88,150 Q96,156 104,150" fill="none" ${trait(ENCRE, 3)}/><circle cx="64" cy="112" r="5" fill="#BFE6F5" ${trait(ENCRE, 2)}/><circle cx="56" cy="96" r="3.5" fill="#BFE6F5" ${trait(ENCRE, 2)}/></g>`, { style, titre: `${e.nom} — ${NOMS_PALIERS[0]}`, taille: o.taille });
    }
    // Proportions : la tête rapetisse et le corps grandit avec l'évolution
    const rt = [40, 38, 36, 37][rang], rc = [28, 34, 40, 42][rang];
    const cyT = [104, 92, 80, 76][rang], cyC = 186 - rc - 6;
    const c = e.corps, v = e.ventre, d = e.detail;
    let s = queue(e, rang);
    if (e.extra === 'ailes' && rang >= 1) { const t = [0, 0.8, 1.1, 1.3][rang]; s += [-1, 1].map(k => `<path d="M${100 + k * 26},${cyC - 18} C${n(100 + k * 70 * t)},${n(cyC - 70 * t)} ${n(100 + k * 84 * t)},${n(cyC - 10)} ${n(100 + k * 58 * t)},${cyC + 6} C${n(100 + k * 52 * t)},${cyC - 8} ${n(100 + k * 40)},${cyC - 4} ${100 + k * 30},${cyC} Z" fill="${d}" ${S}/>`).join(''); }
    // corps, pattes
    s += `<g class="respire"><ellipse cx="100" cy="${cyC}" rx="${n(rc * 1.08)}" ry="${rc}" fill="${c}" ${S}/>
      <ellipse cx="100" cy="${n(cyC + rc * 0.12)}" rx="${n(rc * 0.66)}" ry="${n(rc * 0.7)}" fill="${v}"/>
      ${e.taches ? `<path d="M${n(100 - rc * 1.02)},${n(cyC - rc * 0.2)} C${n(100 - rc * 1.1)},${n(cyC + rc * 0.6)} ${n(100 - rc * 0.6)},${n(cyC + rc * 0.9)} ${n(100 - rc * 0.4)},${n(cyC + rc * 0.95)} L${n(100 - rc * 0.55)},${n(cyC - rc * 0.55)} Z M${n(100 + rc * 1.02)},${n(cyC - rc * 0.2)} C${n(100 + rc * 1.1)},${n(cyC + rc * 0.6)} ${n(100 + rc * 0.6)},${n(cyC + rc * 0.9)} ${n(100 + rc * 0.4)},${n(cyC + rc * 0.95)} L${n(100 + rc * 0.55)},${n(cyC - rc * 0.55)} Z" fill="${d}"/>` : ''}
      ${e.rayures ? `<path d="M${n(100 - rc)},${cyC - 6} l12,4 M${n(100 + rc)},${cyC - 6} l-12,4 M${n(100 - rc + 2)},${cyC + 8} l12,2 M${n(100 + rc - 2)},${cyC + 8} l-12,2" ${trait(d, 3.5)}/>` : ''}
      <ellipse cx="${n(100 - rc * 0.55)}" cy="${n(cyC + rc * 0.9)}" rx="${n(rc * 0.34)}" ry="${n(rc * 0.22)}" fill="${e.taches ? d : c}" ${S}/>
      <ellipse cx="${n(100 + rc * 0.55)}" cy="${n(cyC + rc * 0.9)}" rx="${n(rc * 0.34)}" ry="${n(rc * 0.22)}" fill="${e.taches ? d : c}" ${S}/>
      ${e.masque ? `<path d="M${n(100 - rc * 1.05)},${n(cyC - rc * 0.3)} C${n(100 - rc * 1.5)},${n(cyC)} ${n(100 - rc * 1.4)},${n(cyC + rc * 0.4)} ${n(100 - rc * 1.2)},${n(cyC + rc * 0.5)} M${n(100 + rc * 1.05)},${n(cyC - rc * 0.3)} C${n(100 + rc * 1.5)},${n(cyC)} ${n(100 + rc * 1.4)},${n(cyC + rc * 0.4)} ${n(100 + rc * 1.2)},${n(cyC + rc * 0.5)}" fill="none" ${trait(ENCRE, 12)}/><path d="M${n(100 - rc * 1.05)},${n(cyC - rc * 0.3)} C${n(100 - rc * 1.5)},${n(cyC)} ${n(100 - rc * 1.4)},${n(cyC + rc * 0.4)} ${n(100 - rc * 1.2)},${n(cyC + rc * 0.5)} M${n(100 + rc * 1.05)},${n(cyC - rc * 0.3)} C${n(100 + rc * 1.5)},${n(cyC)} ${n(100 + rc * 1.4)},${n(cyC + rc * 0.4)} ${n(100 + rc * 1.2)},${n(cyC + rc * 0.5)}" fill="none" ${trait(c, 6)}/>` : ''}`;
    // accessoire d'adulte : bandeau de sport ; légendaire : couronne
    const yeuxY = cyT + rt * 0.08;
    let tete = oreilles(e, 100, cyT, rt) + `<circle cx="100" cy="${cyT}" r="${rt}" fill="${c}" ${S}/>`;
    if (e.masque) tete += `<ellipse cx="100" cy="${n(cyT + 4)}" rx="${n(rt * 0.78)}" ry="${n(rt * 0.62)}" fill="${v}"/><path d="M${n(100 - rt * 0.62)},${n(yeuxY + 6)} C${n(100 - rt * 0.5)},${n(yeuxY - 10)} ${n(100 - rt * 0.2)},${n(yeuxY - 8)} ${n(100 - rt * 0.12)},${n(yeuxY)} M${n(100 + rt * 0.62)},${n(yeuxY + 6)} C${n(100 + rt * 0.5)},${n(yeuxY - 10)} ${n(100 + rt * 0.2)},${n(yeuxY - 8)} ${n(100 + rt * 0.12)},${n(yeuxY)}" fill="none" ${trait(d, 9)}/>`;
    if (e.taches) tete += `<ellipse cx="${n(100 - rt * 0.38)}" cy="${n(yeuxY)}" rx="${n(rt * 0.24)}" ry="${n(rt * 0.3)}" transform="rotate(25 ${n(100 - rt * 0.38)} ${n(yeuxY)})" fill="${d}"/><ellipse cx="${n(100 + rt * 0.38)}" cy="${n(yeuxY)}" rx="${n(rt * 0.24)}" ry="${n(rt * 0.3)}" transform="rotate(-25 ${n(100 + rt * 0.38)} ${n(yeuxY)})" fill="${d}"/>`;
    if (e.museau) tete += `<ellipse cx="100" cy="${n(cyT + rt * 0.42)}" rx="${n(rt * 0.42)}" ry="${n(rt * 0.3)}" fill="${v}" ${trait(ENCRE, 2.5)}/>`;
    if (e.nom === 'Renard') tete += `<path d="M${n(100 - rt)},${n(cyT + 4)} C${n(100 - rt * 0.6)},${n(cyT + rt * 0.2)} ${n(100 - rt * 0.4)},${n(cyT + rt * 0.5)} 100,${n(cyT + rt * 0.75)} C${n(100 + rt * 0.4)},${n(cyT + rt * 0.5)} ${n(100 + rt * 0.6)},${n(cyT + rt * 0.2)} ${n(100 + rt)},${n(cyT + 4)} C${n(100 + rt * 0.9)},${n(cyT + rt * 0.7)} ${n(100 + rt * 0.5)},${n(cyT + rt)} 100,${n(cyT + rt)} C${n(100 - rt * 0.5)},${n(cyT + rt)} ${n(100 - rt * 0.9)},${n(cyT + rt * 0.7)} ${n(100 - rt)},${n(cyT + 4)} Z" fill="${v}"/>`;
    if (e.nom === 'Dragon') tete += `<ellipse cx="100" cy="${n(cyT + rt * 0.45)}" rx="${n(rt * 0.5)}" ry="${n(rt * 0.3)}" fill="${clair(c, 0.25)}" ${trait(ENCRE, 2.5)}/><circle cx="${n(100 - rt * 0.16)}" cy="${n(cyT + rt * 0.4)}" r="2" fill="${ENCRE}"/><circle cx="${n(100 + rt * 0.16)}" cy="${n(cyT + rt * 0.4)}" r="2" fill="${ENCRE}"/>`;
    // yeux : grands et ronds au début, plus déterminés ensuite
    const ry = [9, 8.5, 7.5, 7.5][rang], ex = rt * (e.yeuxHauts ? 0.42 : 0.36), ey = e.yeuxHauts ? cyT - rt * 0.62 : yeuxY;
    if (e.yeuxHauts) tete += `<circle cx="${n(100 - ex)}" cy="${n(ey)}" r="${n(rt * 0.32)}" fill="${c}" ${S}/><circle cx="${n(100 + ex)}" cy="${n(ey)}" r="${n(rt * 0.32)}" fill="${c}" ${S}/><circle cx="${n(100 - ex)}" cy="${n(ey)}" r="${n(rt * 0.22)}" fill="#fff"/><circle cx="${n(100 + ex)}" cy="${n(ey)}" r="${n(rt * 0.22)}" fill="#fff"/>`;
    tete += `<g class="yeux"><ellipse cx="${n(100 - ex)}" cy="${n(ey)}" rx="${n(ry * 0.78)}" ry="${ry}" fill="${ENCRE}"/><ellipse cx="${n(100 + ex)}" cy="${n(ey)}" rx="${n(ry * 0.78)}" ry="${ry}" fill="${ENCRE}"/>
      <circle cx="${n(100 - ex + 2.4)}" cy="${n(ey - 3)}" r="2.6" fill="#fff"/><circle cx="${n(100 + ex + 2.4)}" cy="${n(ey - 3)}" r="2.6" fill="#fff"/>${rang === 3 ? `<circle cx="${n(100 - ex - 1.5)}" cy="${n(ey + 3)}" r="1.4" fill="${OR}"/><circle cx="${n(100 + ex - 1.5)}" cy="${n(ey + 3)}" r="1.4" fill="${OR}"/>` : ''}</g>`;
    if (rang >= 2) tete += `<path d="M${n(100 - ex - 8)},${n(ey - ry - 6)} L${n(100 - ex + 7)},${n(ey - ry - 2)} M${n(100 + ex + 8)},${n(ey - ry - 6)} L${n(100 + ex - 7)},${n(ey - ry - 2)}" ${trait(ENCRE, 3)}/>`;
    // nez et bouche
    const ny = e.yeuxHauts ? cyT + rt * 0.1 : cyT + rt * 0.32;
    if (e.grosNez) tete += `<ellipse cx="100" cy="${n(ny + 2)}" rx="${n(rt * 0.2)}" ry="${n(rt * 0.26)}" fill="${d}" ${trait(ENCRE, 2)}/>`;
    else if (e.nom !== 'Dragon' && !e.yeuxHauts) tete += `<path d="M${n(100 - 5)},${n(ny)} h10 l-5,5 Z" fill="${ENCRE}" ${trait(ENCRE, 2)}/>`;
    const by = e.yeuxHauts ? cyT + rt * 0.3 : ny + (e.grosNez ? 14 : 8);
    tete += rang >= 2 ? `<path d="M${n(100 - 9)},${n(by)} Q100,${n(by + 11)} ${n(100 + 9)},${n(by)} Z" fill="#fff" ${trait(ENCRE, 2.5)}/>` : `<path d="M${n(100 - 8)},${n(by)} Q${n(100 - 4)},${n(by + 5)} 100,${n(by)} Q${n(100 + 4)},${n(by + 5)} ${n(100 + 8)},${n(by)}" fill="none" ${trait(ENCRE, 2.5)}/>`;
    if (e.langue && rang < 2) tete += `<path d="M97,${n(by + 2)} q3,8 6,0" fill="${VERMILLON}" ${trait(ENCRE, 2)}/>`;
    if (e.moustaches) tete += `<path d="M${n(100 - rt * 0.4)},${n(ny + 4)} l-${n(rt * 0.55)},-4 M${n(100 - rt * 0.4)},${n(ny + 8)} l-${n(rt * 0.55)},3 M${n(100 + rt * 0.4)},${n(ny + 4)} l${n(rt * 0.55)},-4 M${n(100 + rt * 0.4)},${n(ny + 8)} l${n(rt * 0.55)},3" ${trait(ENCRE, 2)}/>`;
    tete += `<ellipse cx="${n(100 - rt * 0.62)}" cy="${n(ny + 4)}" rx="6" ry="3.5" fill="${VERMILLON}" opacity=".28"/><ellipse cx="${n(100 + rt * 0.62)}" cy="${n(ny + 4)}" rx="6" ry="3.5" fill="${VERMILLON}" opacity=".28"/>`;
    if (rang === 2) tete += `<path d="M${n(100 - rt * 0.98)},${n(cyT - rt * 0.42)} C${n(100 - rt * 0.4)},${n(cyT - rt * 0.66)} ${n(100 + rt * 0.4)},${n(cyT - rt * 0.66)} ${n(100 + rt * 0.98)},${n(cyT - rt * 0.42)} L${n(100 + rt * 0.94)},${n(cyT - rt * 0.22)} C${n(100 + rt * 0.4)},${n(cyT - rt * 0.46)} ${n(100 - rt * 0.4)},${n(cyT - rt * 0.46)} ${n(100 - rt * 0.94)},${n(cyT - rt * 0.22)} Z" fill="${VERMILLON}" ${trait(ENCRE, 3)}/><path d="M${n(100 + rt * 0.94)},${n(cyT - rt * 0.36)} l12,-6 -3,10 6,6 -14,-4 Z" fill="${VERMILLON}" ${trait(ENCRE, 3)}/>`;
    if (rang === 3) tete += `<path d="M${n(100 - rt * 0.55)},${n(cyT - rt * 0.78)} L${n(100 - rt * 0.62)},${n(cyT - rt * 1.28)} L${n(100 - rt * 0.28)},${n(cyT - rt * 1.02)} L100,${n(cyT - rt * 1.4)} L${n(100 + rt * 0.28)},${n(cyT - rt * 1.02)} L${n(100 + rt * 0.62)},${n(cyT - rt * 1.28)} L${n(100 + rt * 0.55)},${n(cyT - rt * 0.78)} Z" fill="${OR}" ${S}/><circle cx="100" cy="${n(cyT - rt * 1.0)}" r="3.5" fill="${VERMILLON}" ${trait(ENCRE, 1.5)}/>`;
    s += tete + '</g>';
    if (rang === 3) s += `<g class="etincelles" fill="${OR}" ${trait(ENCRE, 1.5)}><path d="M28,70 l3,8 8,3 -8,3 -3,8 -3,-8 -8,-3 8,-3 Z"/><path d="M170,58 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2 Z"/><path d="M164,160 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 Z"/></g>`;
    return enveloppe(fond + s, { style, defs: '', titre: `${e.nom} — ${NOMS_PALIERS[rang]}`, taille: o.taille });
  }

  /* ======================= MOUVEMENTS (exercices animés, vue de profil) ======================= */
  // Squelette : hanche (racine), torse 40, tête r 14, bras 22 + 21, jambes 29 + 29. Personnage tourné vers la droite.
  const L = { torse: 40, epaule: 37, bras: 22, avb: 21, cuisse: 29, tibia: 29 };
  const deg = r => r * 180 / Math.PI;
  /** Angle de rotation (SVG, sens horaire) qui amène le vecteur « vers le bas » sur la direction (ux, uy). */
  const angleBas = (ux, uy) => deg(Math.atan2(-ux, uy));
  /** Cinématique inverse à 2 segments : depuis J vers la cible T ; genou/coude du côté `cote` (x>0 = devant). */
  function ik(J, T, a, b, cote) {
    let dx = T[0] - J[0], dy = T[1] - J[1];
    let d = Math.hypot(dx, dy);
    const dmax = a + b - 0.01, dmin = Math.abs(a - b) + 0.01;
    if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
    if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
    const base = Math.atan2(dy, dx), alpha = Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const choix = [base + alpha, base - alpha].map(t => ({ t, ex: J[0] + a * Math.cos(t), ey: J[1] + a * Math.sin(t) }));
    const sol = cote === 'haut' ? (choix[0].ey < choix[1].ey ? choix[0] : choix[1]) : cote === 'bas' ? (choix[0].ey > choix[1].ey ? choix[0] : choix[1]) : (cote > 0 ? (choix[0].ex > choix[1].ex ? choix[0] : choix[1]) : (choix[0].ex < choix[1].ex ? choix[0] : choix[1]));
    const a1 = angleBas(Math.cos(sol.t), Math.sin(sol.t));
    const a2 = angleBas(J[0] + dx - sol.ex, J[1] + dy - sol.ey);
    return [a1, a2 - a1];
  }
  /** Pose → angles. p : { hanche:[x,y], torse:deg, pieds:[[x,y],[x,y]] (arrière, avant), mains:[[x,y],[x,y]], genoux:[c,c], coudes:[c,c] } */
  function angles(p) {
    const t = p.torse * Math.PI / 180;
    const epaule = [p.hanche[0] + L.epaule * Math.sin(t), p.hanche[1] - L.epaule * Math.cos(t)];
    const g = p.genoux || [1, 1], c = p.coudes || [-1, -1];
    const jambe = i => ik(p.hanche, p.pieds[i], L.cuisse, L.tibia, g[i]);
    const bras = i => { const r = ik(epaule, p.mains[i], L.bras, L.avb, c[i]); return [r[0] - p.torse, r[1]]; };
    return { x: p.hanche[0], y: p.hanche[1], torse: p.torse, j0: jambe(0), j1: jambe(1), b0: bras(0), b1: bras(1), tete: p.tete || 0 };
  }

  // Sol à y = 172 ; debout, la hanche est à y ≈ 114.
  const SOL = 172;
  const MOUVEMENTS = {
    squat: { nom: 'Squat', duree: 2.4, poses: [
      { hanche: [96, 114], torse: 4, pieds: [[96, SOL], [102, SOL]], mains: [[104, 112], [110, 110]] },
      { hanche: [80, 140], torse: 34, pieds: [[96, SOL], [102, SOL]], mains: [[138, 92], [142, 96]] },
      { hanche: [96, 114], torse: 4, pieds: [[96, SOL], [102, SOL]], mains: [[104, 112], [110, 110]] }] },
    fentes: { nom: 'Fentes', duree: 2.6, poses: [
      { hanche: [100, 114], torse: 0, pieds: [[96, SOL], [104, SOL]], mains: [[98, 112], [104, 112]] },
      { hanche: [96, 136], torse: 0, pieds: [[64, SOL], [132, SOL]], mains: [[94, 132], [100, 132]], genoux: ['bas', 1] },
      { hanche: [100, 114], torse: 0, pieds: [[96, SOL], [104, SOL]], mains: [[98, 112], [104, 112]] }] },
    squat_bulgare: { nom: 'Squat bulgare', duree: 2.6, decor: 'banc-arriere', poses: [
      { hanche: [104, 116], torse: 4, pieds: [[60, 146], [124, SOL]], mains: [[100, 114], [106, 114]], genoux: ['bas', 1] },
      { hanche: [100, 140], torse: 12, pieds: [[60, 146], [124, SOL]], mains: [[100, 138], [108, 138]], genoux: ['bas', 1] },
      { hanche: [104, 116], torse: 4, pieds: [[60, 146], [124, SOL]], mains: [[100, 114], [106, 114]], genoux: ['bas', 1] }] },
    marche: { nom: 'Marche', duree: 1.2, poses: [
      { hanche: [100, 118], torse: 4, pieds: [[80, SOL], [122, SOL]], mains: [[118, 140], [84, 140]], genoux: [1, 1] },
      { hanche: [100, 115], torse: 4, pieds: [[100, SOL], [104, 160]], mains: [[100, 144], [102, 144]] },
      { hanche: [100, 118], torse: 4, pieds: [[122, SOL], [80, SOL]], mains: [[84, 140], [118, 140]] },
      { hanche: [100, 115], torse: 4, pieds: [[104, 160], [100, SOL]], mains: [[102, 144], [100, 144]] },
      { hanche: [100, 118], torse: 4, pieds: [[80, SOL], [122, SOL]], mains: [[118, 140], [84, 140]] }] },
    gainage: { nom: 'Gainage', duree: 3, poses: [
      { hanche: [96, 150], torse: 82, pieds: [[40, SOL], [44, SOL]], mains: [[151, 168], [155, 168]], genoux: ['haut', 'haut'], coudes: ['bas', 'bas'] },
      { hanche: [96, 148], torse: 82, pieds: [[40, SOL], [44, SOL]], mains: [[151, 168], [155, 168]], genoux: ['haut', 'haut'], coudes: ['bas', 'bas'] },
      { hanche: [96, 150], torse: 82, pieds: [[40, SOL], [44, SOL]], mains: [[151, 168], [155, 168]], genoux: ['haut', 'haut'], coudes: ['bas', 'bas'] }] },
    gainage_dynamique: { nom: 'Gainage dynamique', duree: 2.4, poses: [
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] },
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [176, 124]], genoux: ['haut', 'haut'], coudes: [-1, 'haut'] },
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] },
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[176, 124], [136, SOL]], genoux: ['haut', 'haut'], coudes: ['haut', -1] },
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] }] },
    pompes: { nom: 'Pompes', duree: 2, poses: [
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] },
      { hanche: [99, 162], torse: 80, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: ['haut', 'haut'] },
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] }] },
    pompes_genoux: { nom: 'Pompes sur les genoux', duree: 2, poses: [
      { hanche: [90.7, 152], torse: 52, pieds: [[42, 156], [46, 156]], mains: [[122, SOL], [126, SOL]], genoux: ['bas', 'bas'], coudes: [-1, -1] },
      { hanche: [96.3, 163.8], torse: 78, pieds: [[42, 156], [46, 156]], mains: [[122, SOL], [126, SOL]], genoux: ['bas', 'bas'], coudes: ['haut', 'haut'] },
      { hanche: [90.7, 152], torse: 52, pieds: [[42, 156], [46, 156]], mains: [[122, SOL], [126, SOL]], genoux: ['bas', 'bas'], coudes: [-1, -1] }] },
    pompes_declinees: { nom: 'Pompes déclinées', duree: 2, decor: 'banc-haut', poses: [
      { hanche: [105.8, 125.5], torse: 95, pieds: [[48, 120], [52, 120]], mains: [[140, SOL], [144, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] },
      { hanche: [101.7, 142], torse: 112, pieds: [[48, 120], [52, 120]], mains: [[140, SOL], [144, SOL]], genoux: ['haut', 'haut'], coudes: ['haut', 'haut'] },
      { hanche: [105.8, 125.5], torse: 95, pieds: [[48, 120], [52, 120]], mains: [[140, SOL], [144, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] }] },
    rowing_haltere: { nom: 'Rowing haltère', duree: 2.2, decor: 'banc-avant', haltere: 1, poses: [
      { hanche: [86, 116], torse: 70, pieds: [[80, SOL], [86, SOL]], mains: [[124, 140], [114, 150]], genoux: [1, 1], coudes: ['bas', 1] },
      { hanche: [86, 116], torse: 70, pieds: [[80, SOL], [86, SOL]], mains: [[124, 140], [104, 118]], genoux: [1, 1], coudes: ['bas', -1] },
      { hanche: [86, 116], torse: 70, pieds: [[80, SOL], [86, SOL]], mains: [[124, 140], [114, 150]], genoux: [1, 1], coudes: ['bas', 1] }] },
    tractions: { nom: 'Tractions', duree: 2.4, decor: 'barre', poses: [
      { hanche: [100, 108], torse: 0, pieds: [[96, 158], [100, 160]], mains: [[94, 30], [104, 30]], coudes: [-1, 1], genoux: [-1, -1] },
      { hanche: [100, 80], torse: 0, pieds: [[92, 130], [96, 132]], mains: [[94, 30], [104, 30]], coudes: [-1, 1], genoux: [-1, -1] },
      { hanche: [100, 108], torse: 0, pieds: [[96, 158], [100, 160]], mains: [[94, 30], [104, 30]], coudes: [-1, 1], genoux: [-1, -1] }] },
    burpees: { nom: 'Burpees', duree: 3.2, poses: [
      { hanche: [100, 114], torse: 2, pieds: [[98, SOL], [104, SOL]], mains: [[102, 112], [108, 112]] },
      { hanche: [92, 146], torse: 58, pieds: [[96, SOL], [102, SOL]], mains: [[132, SOL], [136, SOL]], coudes: [-1, -1] },
      { hanche: [94.5, 147.5], torse: 65, pieds: [[42, SOL], [46, SOL]], mains: [[132, SOL], [136, SOL]], genoux: ['haut', 'haut'], coudes: [-1, -1] },
      { hanche: [92, 146], torse: 58, pieds: [[96, SOL], [102, SOL]], mains: [[132, SOL], [136, SOL]], coudes: [-1, -1] },
      { hanche: [100, 114], torse: 2, pieds: [[98, SOL], [104, SOL]], mains: [[102, 112], [108, 112]] },
      { hanche: [100, 96], torse: 0, pieds: [[98, 152], [104, 152]], mains: [[96, 34], [106, 34]], coudes: [-1, 1] },
      { hanche: [100, 114], torse: 2, pieds: [[98, SOL], [104, SOL]], mains: [[102, 112], [108, 112]] }] }
  };
  const NIVEAUX_EXERCICES = { debutant: ['squat', 'gainage', 'pompes_genoux', 'marche'], intermediaire: ['fentes', 'pompes', 'rowing_haltere', 'gainage_dynamique'], avance: ['burpees', 'tractions', 'squat_bulgare', 'pompes_declinees'] };

  /** Rend les angles continus d'une pose à l'autre (pas de tour complet entre deux images). */
  function continus(liste) {
    for (let i = 1; i < liste.length; i++) {
      let d = liste[i] - liste[i - 1];
      while (d > 180) { liste[i] -= 360; d -= 360; }
      while (d < -180) { liste[i] += 360; d += 360; }
    }
    return liste.map(n);
  }

  /** Exercice animé. o : { niveau ou stade, peau, cheveux, tenue: { vetement, chaussures, coiffure }, taille } */
  function mouvement(cle, o) {
    o = o || {};
    const m = MOUVEMENTS[cle];
    if (!m) return enveloppe('', {});
    const tenue = o.tenue || {};
    const peau = o.peau || PEAUX.doree, ch = o.cheveux || CHEVEUX.brun;
    const haut = (tenue.vetement && tenue.vetement.couleur1) || VERMILLON;
    const manche = tenue.vetement && /veste|sweat/.test(tenue.vetement.modele) ? haut : peau;
    const chaussure = (tenue.chaussures && tenue.chaussures.couleur1) || '#F4F2EC';
    const bandeau = tenue.coiffure ? tenue.coiffure.couleur1 : null;
    const short = '#2A2830';
    const P = m.poses.map(angles);
    const k = P.length, temps = P.map((_, i) => n(i / (k - 1))).join(';');
    const doux = Array(k - 1).fill('.45 0 .55 1').join(';');
    const anim = (type, vals) => `<animateTransform attributeName="transform" type="${type}" values="${vals.join(';')}" keyTimes="${temps}" dur="${m.duree}s" repeatCount="indefinite" calcMode="spline" keySplines="${doux}"/>`;
    const rot = (liste, extra) => anim('rotate', continus(liste).map(a => a + (extra || '')));
    const serie = f => P.map(f);
    // Silhouette du stade : mêmes largeurs que l'avatar de face, réduites au gabarit de profil
    const g = morpho(o.stade || stadeDuNiveau(o.niveau || 10)), K = 0.75, i = g.i, nu = !tenue.vetement;
    const W = { cu: g.cu * K, ge: g.cu * K * 0.62, qb: g.qb * K, mo: g.mo * K, mb: g.mb * K, ua: g.ua * K, bi: g.bi * K, fa: g.fa * K, fab: g.fab * K, rp: g.rp * K };
    // Segment musclé en repère local (de 0,0 vers 0,l ; +x = devant) : passage encre puis couleur ombrée
    const seg = (d, c, encre) => encre ? `<path d="${d}" fill="${ENCRE}" ${trait(ENCRE, 5)}/>` : forme(d, c, { contour: 0, dx: 1.6, dy: 0.8 });
    const cuisse = membre([0, 0], [0, L.cuisse], W.cu, W.ge, W.qb * 0.6, W.qb, 0.4);
    const tibia = membre([0, 0], [0, L.tibia], W.mo, 2.6, W.mb, W.mb * 0.3, 0.3);
    const brasH = membre([0, 0], [0, L.bras], W.ua, W.ua * 0.8, W.bi * 0.6, W.bi, 0.5);
    const avb = membre([0, 0], [0, L.avb], W.fa, W.fa * 0.75, W.fab * 0.4, W.fab, 0.3);
    const tronc = membre([0, 4], [0, -L.torse + 3], 8.5 + i * 0.5, 9.5 + i * 1.3, 2 + i * 1.7, 1 + i * 1.1, 0.68);
    // Un membre à deux segments : groupe rotatif → segment → groupe rotatif → segment (+ extrémité)
    function chaine(a1, a2, l1, d1, d2, c1, c2, encre, bout, fonceur, extra) {
      const f = fonceur ? x => fonce(x, 0.18) : x => x;
      return `<g>${rot(a1)}${seg(d1, f(c1), encre)}${encre || !extra ? '' : extra(f)}<g transform="translate(0 ${l1})"><g>${rot(a2)}${seg(d2, f(c2), encre)}${bout ? bout(encre, f) : ''}</g></g></g>`;
    }
    const pied = (encre, f) => { const d = `M-4,${L.tibia - 3} h10 q6,0 7,5 v3 h-18 Z`; return encre ? `<path d="${d}" fill="${ENCRE}" ${trait(ENCRE, 5)}/>` : `<path d="${d}" fill="${f(chaussure)}"/>${ligne(`M-5,${L.tibia + 3} h17`, 1.4)}`; };
    const main = (encre, f) => encre ? `<circle cx="0" cy="${L.avb}" r="${n(W.rp + 2.5)}" fill="${ENCRE}"/>` : `<circle cx="0" cy="${L.avb}" r="${n(W.rp)}" fill="${f(peau)}"/>`;
    const haltere = encre => `<g transform="translate(0 ${L.avb})"><path d="M-12,0 L12,0" ${trait(ENCRE, encre ? 8 : 4)}/>${encre ? '' : `<rect x="-15" y="-7" width="7" height="14" rx="2" fill="${OR}" ${trait(ENCRE, 2.5)}/><rect x="8" y="-7" width="7" height="14" rx="2" fill="${OR}" ${trait(ENCRE, 2.5)}/>`}</g>`;
    // Short sur le haut de la cuisse ; manche courte (t-shirt) ou longue (veste, sweat) sur le bras
    const shortCuisse = f => forme(membre([0, -2], [0, L.cuisse * 0.45], W.cu + 1.2, W.cu * 0.9 + 1, W.qb * 0.5, W.qb * 0.9, 0.5), f(short), { contour: 0, dx: 1.6, dy: 0.8 }) + ligne(`M${n(-W.cu * 0.9 - 1)},${n(L.cuisse * 0.45)} H${n(W.cu * 0.95 + 1)}`, 1.6);
    const mancheCourte = tenue.vetement && !/veste|sweat|cape/.test(tenue.vetement.modele) ? f => forme(membre([0, -2], [0, L.bras * 0.42], W.ua + 1.4, W.ua + 1, W.bi * 0.5, W.bi * 0.8, 0.5), f(haut), { contour: 0, dx: 1.6, dy: 0.8 }) + ligne(`M${n(-W.ua - 1.2)},${n(L.bras * 0.42)} H${n(W.ua + 1.4)}`, 1.4) : null;
    // Torse de profil : poitrine qui se bombe, abdos et pectoraux dessinés à nu
    const torseCouleur = nu ? peau : haut;
    const detailsTorse = nu
      ? (i >= 1 ? ligne(`M${n(9 + i * 2.2)},${n(-26 + i * 0.5)} Q${n(5 + i)},${n(-20 + i * 0.6)} ${n(-1)},${n(-23)}`, 1.3) : '') + (i >= 2 ? ligne(Array.from({ length: i }, (_, r) => `M${n(8 + i * 0.6)},${n(-14 + r * 5.5)} h-4`).join(' '), 1.2) : '') + (i >= 3 ? ligne(`M${n(2 + i)},-32 q-3,-4 -9,-4`, 1.1) : '')
      : ligne(`M${n(9 + i * 2.2)},${n(-26 + i * 0.5)} Q${n(5 + i)},${n(-20 + i * 0.6)} ${n(-1)},${n(-23)}`, 1.1, fonce(haut, 0.3));
    const tetePath = 'M-12,-13 A12,12 0 0 1 12,-15 L13.4,-9.6 L11.2,-8.6 Q11,-2 6,0.6 L-4,0.2 Q-12,-4 -12,-13 Z';
    const cheveuxPath = i === 4 ? 'M-13,-10 L-25,-16 L-15,-21 L-24,-32 L-10,-28 L-9,-41 L0,-30 L7,-40 L9,-29 L18,-31 L13,-20 C8,-24 0,-23 -2,-18 L-6,-12 Z'
      : i >= 2 ? 'M-13,-11 L-22,-17 L-14,-21 L-20,-30 L-8,-27 L-6,-36 L1,-28 L8,-34 L9,-26 L15,-22 C8,-24 0,-23 -2,-18 L-6,-12 Z'
        : 'M-13,-11 L-19,-17 L-13,-20 L-16,-27 L-7,-25 L-4,-31 L2,-26 L8,-29 L9,-24 L14,-20 C8,-24 0,-23 -2,-18 L-6,-12 Z';
    function passe(encre) {
      const jambe = j => chaine(serie(p => p['j' + j][0]), serie(p => p['j' + j][1]), L.cuisse, cuisse, tibia, peau, peau, encre, pied, j === 0, shortCuisse);
      const bras = j => chaine(serie(p => p['b' + j][0]), serie(p => p['b' + j][1]), L.bras, brasH, avb, manche, manche === peau ? peau : haut, encre, (e, f) => main(e, f) + (m.haltere === j ? haltere(e) : ''), j === 0, mancheCourte);
      const tete = encre ? `<path d="${tetePath}" fill="${ENCRE}" ${trait(ENCRE, 5.5)}/><path d="${cheveuxPath}" fill="${ENCRE}" ${trait(ENCRE, 5)}/>`
        : `<path d="${tetePath}" fill="${peau}"/><path d="${cheveuxPath}" fill="${ch}"/>${i === 4 ? ligne('M-24,-32 L-12,-27 M-9,-41 L-6,-30 M7,-40 L5,-29', 1.4, OR) : ''}${bandeau ? `<path d="M-12.6,-17 L12.6,-18" ${trait(bandeau, 4.5)}/><path d="M-12.6,-17 l-8,3 M-12.6,-17 l-7,-3" ${trait(bandeau, 3)}/>` : ''}`
          + `<path d="M3.4,-12.6 Q6.8,-14.2 10,-12.4 Q7,-10.4 3.4,-12.6 Z" fill="#fff" ${trait(ENCRE, 1.2)}/><circle cx="7.6" cy="-12.4" r="1.4" fill="${ENCRE}"/>${ligne(`M2.4,${n(-16 + i * 0.25)} L11,${n(-15.6 - i * 0.5)}`, 1.8)}${ligne(i >= 3 ? 'M5,-3.6 H10.4' : 'M5,-4 q3,1.4 5.6,-1', 1.5)}<path d="M-3,-11 a2.2,3.4 0 1 0 .1,0 Z" fill="${fonce(peau, 0.15)}" ${trait(ENCRE, 1.2)}/>`;
      const auxEpaules = b => `<g>${rot(serie(p => p.torse))}<g transform="translate(0 ${-L.epaule})">${b}</g></g>`;
      const cou = encre ? `<path d="M-4,${-L.torse + 2} L-4,${-L.torse - 6} L5,${-L.torse - 6} L5,${-L.torse + 2} Z" fill="${ENCRE}" ${trait(ENCRE, 5)}/>` : `<path d="M-4,${-L.torse + 2} L-4,${-L.torse - 6} L5,${-L.torse - 6} L5,${-L.torse + 2} Z" fill="${fonce(peau, 0.12)}"/>`;
      const buste = `<g>${rot(serie(p => p.torse))}${cou}${seg(tronc, torseCouleur, encre)}${encre ? '' : detailsTorse + forme(`M${n(-8.5 - i * 0.5)},-4 L${n(9 + i * 0.5)},-4 L${n(9 + i * 0.5)},6 L${n(-8.5 - i * 0.5)},6 Z`, short, { contour: 0, dx: 1.6, dy: 0.8 }) + ligne(`M${n(-8.5 - i * 0.5)},-4 H${n(9 + i * 0.5)}`, 1.6)}
          <g transform="translate(0 ${-L.torse - 4})">${tete}</g></g>`;
      return [jambe(0), auxEpaules(bras(0)), buste, jambe(1), auxEpaules(bras(1))];
    }
    // Chaque partie (jambe, bras, buste) : son contour encre puis sa couleur, de l'arrière vers l'avant,
    // pour que le bras devant le torse garde son trait.
    const encres = passe(true), couleurs = passe(false);
    const corps = `<g>${anim('translate', P.map(p => n(p.x) + ' ' + n(p.y)))}${encres.map((e, j) => e + couleurs[j]).join('')}</g>`;
    let decor = `<rect x="0" y="${SOL}" width="200" height="28" fill="${PAPIER}"/><path d="M10,${SOL} L190,${SOL}" ${trait(ENCRE, 3)}/><ellipse cx="100" cy="${SOL + 6}" rx="70" ry="4" fill="${ENCRE}" opacity=".08"/>`;
    if (m.decor === 'banc-arriere') decor += `<path d="M30,${SOL - 26} h44 v8 h-44 Z M36,${SOL - 18} v18 M68,${SOL - 18} v18" fill="#8A5F14" ${trait(ENCRE, 3)}/>`;
    if (m.decor === 'banc-haut') decor += `<path d="M28,${SOL - 52} h40 v8 h-40 Z M34,${SOL - 44} v44 M62,${SOL - 44} v44" fill="#8A5F14" ${trait(ENCRE, 3)}/>`;
    if (m.decor === 'banc-avant') decor += `<path d="M110,${SOL - 34} h50 v8 h-50 Z M116,${SOL - 26} v26 M154,${SOL - 26} v26" fill="#8A5F14" ${trait(ENCRE, 3)}/>`;
    if (m.decor === 'barre') decor += `<path d="M40,30 L160,30" ${trait(ENCRE, 9)}/><path d="M40,30 L160,30" ${trait('#B9B4A6', 4)}/><path d="M44,30 L44,${SOL} M156,30 L156,${SOL}" ${trait(ENCRE, 4)}/>`;
    const traits = m.decor === 'barre' ? '' : `<g opacity=".25" ${trait(i === 4 ? OR : VERMILLON, 3)}><path d="M14,40 h22 M8,52 h30 M164,40 h22 M162,52 h30"/></g>`;
    const titre = m.nom;
    const etiquette = o.sansTitre ? '' : `<text x="100" y="194" text-anchor="middle" font-family="Anton, Impact, 'Arial Narrow', sans-serif" font-size="${titre.length > 18 ? 11.5 : 14}" letter-spacing="1" fill="${ENCRE}">${esc(titre.toUpperCase())}</text>`;
    return enveloppe(`<rect width="200" height="200" fill="${o.fond || '#FFFFFF'}"/>${traits}${decor}${corps}${etiquette}`, { titre, taille: o.taille });
  }

  /* ======================= Catalogue Livora ======================= */
  // Les 14 objets de Livora (cosmeticItems.js) dessinés avec les modèles ci-dessus.
  const SKINS_LIVORA = [
    { cle: 't_shirt_gris', emplacement: 'vetement', modele: 'tshirt', nom: 'T-shirt gris', couleur1: '#9A978C', couleur2: '#F4F2EC', motif: 'uni', rarete: 'commun' },
    { cle: 'baskets_blanches', emplacement: 'chaussures', modele: 'baskets', nom: 'Baskets blanches', couleur1: '#F4F2EC', couleur2: VERMILLON, motif: 'uni', rarete: 'commun' },
    { cle: 'bandeau_simple', emplacement: 'coiffure', modele: 'bandeau', nom: 'Bandeau simple', couleur1: VERMILLON, couleur2: '#FFFFFF', motif: 'uni', rarete: 'commun' },
    { cle: 'casquette_verte', emplacement: 'coiffure', modele: 'casquette', nom: 'Casquette sauge', couleur1: '#7C9A72', couleur2: '#F4F2EC', motif: 'uni', rarete: 'peu_commun' },
    { cle: 'veste_survet', emplacement: 'vetement', modele: 'veste', nom: 'Veste de survêtement', couleur1: '#2B4C7E', couleur2: '#FFFFFF', motif: 'uni', rarete: 'peu_commun' },
    { cle: 'gourde_perso', emplacement: 'accessoire', modele: 'gourde', nom: 'Gourde personnalisée', couleur1: VERMILLON, couleur2: '#F4F2EC', motif: 'uni', rarete: 'peu_commun' },
    { cle: 'chaussures_trail', emplacement: 'chaussures', modele: 'trail', nom: 'Chaussures de trail', couleur1: '#3D7A4D', couleur2: '#E3A93E', motif: 'uni', rarete: 'rare' },
    { cle: 'montre_sport', emplacement: 'accessoire', modele: 'montre', nom: 'Montre de sport', couleur1: '#24212B', couleur2: '#7FD1E8', motif: 'uni', rarete: 'rare' },
    { cle: 'sac_a_dos_rando', emplacement: 'equipement', modele: 'sac', nom: 'Sac à dos de randonnée', couleur1: '#B8823C', couleur2: VERMILLON, motif: 'uni', rarete: 'rare' },
    { cle: 'cape_montagne', emplacement: 'vetement', modele: 'cape', nom: 'Cape de montagne', couleur1: '#7C3AED', couleur2: OR, motif: 'uni', rarete: 'epique' },
    { cle: 'couronne_laurier', emplacement: 'coiffure', modele: 'couronne', nom: 'Couronne de laurier', couleur1: '#5E9A3A', couleur2: OR, motif: 'uni', rarete: 'epique' },
    { cle: 'haltere_dore', emplacement: 'equipement', modele: 'haltere', nom: 'Haltère doré', couleur1: OR, couleur2: '#8A5F14', motif: 'uni', rarete: 'epique' },
    { cle: 'aura_energie', emplacement: 'objet_rare', modele: 'aura', nom: 'Aura d’énergie', couleur1: VERMILLON, couleur2: OR, motif: 'uni', rarete: 'legendaire' },
    { cle: 'ailes_legende', emplacement: 'objet_rare', modele: 'ailes', nom: 'Ailes de légende', couleur1: '#FFFFFF', couleur2: OR, motif: 'uni', rarete: 'legendaire' }
  ];
  const RARETES = { commun: ['Commun', '#8C897F'], peu_commun: ['Peu commun', '#3D7A4D'], rare: ['Rare', '#2B6CB0'], epique: ['Épique', '#7C3AED'], legendaire: ['Légendaire', '#D97706'] };

  return {
    PEAUX, CHEVEUX, STADES, MODELES, MOTIFS, EMPLACEMENTS, DOSSIER_CALQUE, ESPECES, PALIERS, NOMS_PALIERS, MOUVEMENTS, NIVEAUX_EXERCICES, SKINS_LIVORA, RARETES,
    stadeDuNiveau, avatar, avatarBase, calque, vignette, compagnon, mouvement,
    /** data: URL d'un SVG, pour <img src> (aucun script, aucun risque d'injection dans la page). */
    url: svgTexte => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTexte)
  };
}
if (typeof AB !== 'undefined') { AB.design = moteurDesign(); AB.design.SOURCE = moteurDesign.toString(); }
