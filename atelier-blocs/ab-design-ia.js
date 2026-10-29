/* ==========================================================================
   ab-design-ia.js — illustrations des compagnons par IA (Studio design)
   Chaque compagnon (8 espèces × 4 paliers) est redessiné par un générateur
   d'images à partir de son dessin actuel (même espèce, mêmes couleurs) :
   bébé tout fin → jeune athlète mince → adulte musclé → héros légendaire
   très musclé, et il grandit dans l'image à chaque palier.
   La clé du générateur reste sur le serveur local (serveur.js) ; sans
   serveur, l'Atelier donne les prompts à copier et on importe les images.
   Le personnage du joueur suit la même logique (5 stades, masculin ou
   féminin, yeux, cheveux et coiffure au choix), façon manga de combat des
   années 90 : le style est décrit, jamais nommé (les générateurs refusent
   souvent d'imiter une œuvre ou un auteur nommément).
   Les images validées sont gardées sur cette machine (IndexedDB, en .webp).
   ========================================================================== */
(function () {
  const D = AB.design;
  const DI = AB.designIA = {};

  /* Rendu des images : 3D (par défaut) ou 2D manga. Chaque rendu a ses propres images enregistrées. */
  DI.RENDUS = { '3d': 'Rendu 3D', '2d': 'Dessin 2D manga' };
  DI.rendu = '3d';
  DI.choisirRendu = r => { DI.rendu = DI.RENDUS[r] ? r : '3d'; return AB.db.setMeta('design-ia-rendu', DI.rendu); };
  DI.chargerRendu = async () => { DI.rendu = (await AB.db.getMeta('design-ia-rendu', '3d')) === '2d' ? '2d' : '3d'; return DI.rendu; };
  DI.portee = '';   // id de l'app dont on ouvre le studio ('' = bibliothèque commune)
  const prefixe = () => `design-ia:${DI.portee ? DI.portee + ':' : ''}${DI.rendu}:`;
  /** Verbe du prompt selon le rendu : recréer en 3D ou redessiner en 2D. */
  const refaire = () => DI.rendu === '3d' ? 're-create it as a fully 3D rendered character (real volume, materials, lighting and depth, not a flat 2D drawing)' : 'redraw it as a rich, high-quality illustration';

  /** Charte 3D des compagnons : mascotte de film d'animation ou de jeu mobile haut de gamme. */
  DI.STYLE_3D = 'High-quality stylised 3D character render for Livora, a fitness coaching app, like a premium animated-film or mobile-game mascot: smooth sculpted shapes, soft materials with subtle subsurface scattering, fur, feathers or scales suggested with fine texture, big expressive eyes with glossy reflections, soft studio lighting with a warm key light and a vermilion-tinted rim light, gentle ambient occlusion, accents of vermilion red (#E1382D) and gold (#E3A93E). Full body, centred, three-quarter front view, the whole character visible with a small margin, plain transparent background (or pure white if transparency is impossible), no text, no frame, no scenery.';
  /** Charte 2D : le style Livora (encre, aplats, vermillon et or). */
  DI.STYLE = 'Polished 2D manga / anime mascot illustration for Livora, a fitness coaching app. Bold clean black ink outlines (#131217), cel shading with two flat tones per colour and crisp highlights, expressive eyes, warm accents of vermilion red (#E1382D) and gold (#E3A93E). Full body, centred, three-quarter front view, the whole character visible with a small margin, plain transparent background (or pure white if transparency is impossible), no text, no frame, no scenery.';

  /** Identité de chaque espèce : reprend le dessin actuel (couleurs, signes distinctifs, caractère de Livora). */
  DI.ESPECES = {
    dragon: 'a green dragon (body #55B27A, cream belly #F3E3B3, dark green details #2F7A50) with two small horns, a spiked tail and little wings, brave and friendly',
    chien: 'a caramel-brown dog (#C98B4E) with a cream muzzle and belly, floppy dark-brown ears, a short tail and its tongue out, loyal and cheerful',
    chat: 'a grey tabby cat (#9A97A6) with darker grey stripes, a pale belly, pointy ears, a long tail and whiskers, mischievous look',
    renard: 'an orange fox (#E0702C) with white cheeks and belly, black-tipped ears and paws, a big bushy tail with a white tip, cunning smile',
    panda: 'a giant panda, white body with black ears, black eye patches, black arms and legs, calm and serene',
    grenouille: 'a bright green frog (#6DBE45) with a pale green belly, big round eyes on top of its head and long agile legs',
    koala: 'a grey koala (#9AA3AD) with big fluffy white-tufted ears, a large dark nose and a pale belly, serene',
    paresseux: 'a brown sloth (#A57F5B) with a cream face mask, dark stripes around the eyes and long claws, relaxed smile'
  };

  /** Évolution : du mince au musclé, et de plus en plus grand dans l'image. */
  DI.PALIERS = {
    1: { taille: 45, texte: 'Evolution stage 1 of 4, BABY: tiny, chubby face and thin little limbs, big head (half of its height), big shiny eyes, sitting, no muscles at all. The character fills only about 45% of the image height.' },
    5: { taille: 60, texte: 'Evolution stage 2 of 4, YOUNG: grown a bit, slim and lean, now standing on its hind legs like a young athlete, slender arms with the very first hint of muscle tone, wears a vermilion sports headband. The character fills about 60% of the image height.' },
    15: { taille: 78, texte: 'Evolution stage 3 of 4, ADULT: anthropomorphic fitness athlete standing on its hind legs, clearly muscular and toned (defined shoulders, biceps, chest and abs), confident pose with fists on hips, vermilion sports headband. The character fills about 78% of the image height.' },
    30: { taille: 92, texte: 'Evolution stage 4 of 4, LEGENDARY: heroic manga powerhouse, massively muscular like a shonen hero (broad V-shaped torso, huge shoulders and arms, eight-pack abs, visible veins), powerful flexing pose, small gold crown, glowing gold aura with flame-like energy around the body. The character fills about 92% of the image height.' }
  };
  /** Bébés particuliers, comme dans Livora (œuf, têtard). */
  const BEBES = {
    dragon: 'The baby dragon is hatching from a cream egg with green spots, only its head, little arms and tail out of the shell.',
    grenouille: 'The baby is a tadpole: round green head-body, tiny back legs starting to grow, a little tail.'
  };

  const cle = (esp, palier) => `${prefixe()}${esp}-${palier}`;

  /** Prompt complet pour une espèce et un palier. avecPrecedent : une image du palier d'avant est jointe. */
  DI.prompt = function (esp, palier, avecPrecedent) {
    const p = DI.PALIERS[palier];
    return [
      `Character: ${DI.ESPECES[esp]}.`,
      p.texte,
      palier === 1 && BEBES[esp] ? BEBES[esp] : '',
      'Reference image 1 is the current simple vector drawing of this exact character at this stage: keep its species, colours, markings and accessories, but ' + refaire() + ' instead of basic shapes.',
      avecPrecedent ? 'Reference image 2 is the previous evolution stage, already made: keep the same face, colours and art style so that both images clearly show the same character growing up and getting stronger.' : '',
      DI.rendu === '3d' ? DI.STYLE_3D : DI.STYLE
    ].filter(Boolean).join('\n');
  };

  /** Dessin actuel (SVG) converti en PNG carré, pour servir de référence au générateur. */
  DI.reference = function (esp, palier, taille) {
    return DI.raster(D.url(D.compagnon(esp, palier)), taille || 1024, 'image/png');
  };

  /** Rend une image (URL) sur un canevas carré et renvoie une data URL (PNG ou WebP). */
  DI.raster = function (src, taille, type, qualite) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = taille;
        const ctx = c.getContext('2d');
        const k = Math.min(taille / (im.naturalWidth || taille), taille / (im.naturalHeight || taille));
        const w = (im.naturalWidth || taille) * k, h = (im.naturalHeight || taille) * k;
        ctx.drawImage(im, (taille - w) / 2, (taille - h) / 2, w, h);
        resolve(c.toDataURL(type || 'image/webp', qualite || 0.9));
      };
      im.onerror = () => reject(new Error('Image illisible.'));
      im.src = src;
    });
  };

  /** Image validée d'un compagnon (ou null). */
  DI.lire = esp => Promise.all(D.PALIERS.map(p => AB.db.getMeta(cle(esp, p), null))).then(l => Object.fromEntries(D.PALIERS.map((p, i) => [p, l[i]])));
  DI.toutes = async function () {
    const r = {};
    for (const esp of Object.keys(D.ESPECES)) r[esp] = await DI.lire(esp);
    return r;
  };
  /** Enregistre une image (data URL) en WebP 768 px. */
  DI.enregistrer = async function (esp, palier, image, origine) {
    const webp = await DI.raster(image, 768, 'image/webp', 0.9);
    const v = { image: webp, origine: origine || 'import', date: new Date().toISOString() };
    await AB.db.setMeta(cle(esp, palier), v);
    return v;
  };
  DI.effacer = (esp, palier) => AB.db.setMeta(cle(esp, palier), null);

  /** Le serveur local peut-il générer des images ? → { fournisseur, modele } ou null. */
  DI.generateur = async function () {
    const e = await AB.ia.etat();
    return e.joignable && e.images ? e.images : null;
  };

  /** Génère un palier : référence = dessin actuel + image du palier précédent (si elle existe). */
  DI.generer = async function (esp, palier) {
    const i = D.PALIERS.indexOf(palier), avant = i > 0 ? await AB.db.getMeta(cle(esp, D.PALIERS[i - 1]), null) : null;
    const references = [await DI.reference(esp, palier)];
    if (avant) references.push(await DI.raster(avant.image, 1024, 'image/png'));
    return DI.enregistrer(esp, palier, await demanderImage(DI.prompt(esp, palier, !!avant), references), 'ia');
  };

  /* ---------- Personnage du joueur ---------- */
  /** Style « manga de combat des années 90 », décrit sans nommer d'œuvre. */
  DI.STYLE_PERSO_3D = 'Stylised 3D anime character render in the spirit of modern 3D anime fighting games: fully 3D with real volume, sculpted anatomy and dramatic lighting (warm key light, strong rim light), subtle toon shading and crisp outlines, sharp angular features, expressive eyes with strong eyebrows, gravity-defying hair sculpted in big sharp locks, defined jawline, vivid colours, energetic and heroic mood, accents of vermilion red (#E1382D) and gold (#E3A93E). Full body, centred, standing, three-quarter front view, whole character visible with a small margin, plain transparent background (or pure white if transparency is impossible), no text, no frame, no scenery. Original character, not a copy of any existing character.';
  DI.STYLE_PERSO = 'Classic 1990s shonen martial-arts anime style: sharp angular features, expressive eyes with strong eyebrows, gravity-defying hair drawn in big sharp locks, defined jawline, bold clean black ink outlines (#131217), vivid flat colours with hard two-tone cel shading and crisp highlights, energetic and heroic mood, accents of vermilion red (#E1382D) and gold (#E3A93E). Full body, centred, standing, three-quarter front view, whole character visible with a small margin, plain transparent background (or pure white if transparency is impossible), no text, no frame, no scenery. Original character, not a copy of any existing character.';

  /** Choix proposés : [clé, libellé français, description pour le générateur]. */
  DI.PERSO = {
    genre: [['m', 'Masculin', 'young man'], ['f', 'Féminin', 'young woman']],
    peau: [['claire', 'Claire', 'fair skin'], ['doree', 'Dorée', 'light golden tan skin'], ['mate', 'Mate', 'olive skin'], ['brune', 'Brune', 'brown skin'], ['foncee', 'Foncée', 'dark brown skin']],
    formeYeux: [['percants', 'Perçants', 'sharp narrow determined eyes'], ['grands', 'Grands et ronds', 'big round bright eyes'], ['amande', 'En amande', 'almond-shaped eyes'], ['fronces', 'Regard froncé', 'intense eyes under heavy frowning brows']],
    couleurYeux: [['noirs', 'Noirs', 'black'], ['marron', 'Marron', 'brown'], ['bleus', 'Bleus', 'blue'], ['verts', 'Verts', 'green'], ['gris', 'Gris', 'grey'], ['ambre', 'Ambre', 'amber'], ['violets', 'Violets', 'violet'], ['rouges', 'Rouges', 'red']],
    couleurCheveux: [['noirs', 'Noirs', 'jet-black'], ['bruns', 'Bruns', 'dark brown'], ['chatains', 'Châtains', 'chestnut'], ['blonds', 'Blonds', 'golden blond'], ['roux', 'Roux', 'copper red'], ['blancs', 'Blancs', 'silver white'], ['bleus', 'Bleus', 'electric blue'], ['roses', 'Roses', 'pink'], ['verts', 'Verts', 'emerald green'], ['violets', 'Violets', 'purple']],
    coiffure: [
      ['eventail', 'Pointes en éventail', 'big spiky hair fanning out in all directions', 'm'],
      ['flammes', 'Pointes dressées en flammes', 'tall upswept spikes like flames', 'm'],
      ['meche', 'Pointes avec mèche sur le front', 'spiky hair with sharp bangs falling over the forehead', 'mf'],
      ['brosse', 'Courts en brosse', 'short flat-top crew cut', 'm'],
      ['crete', 'Crête', 'spiky mohawk', 'mf'],
      ['rase', 'Rasés', 'shaved head', 'm'],
      ['queue_haute', 'Queue de cheval haute', 'high spiky ponytail', 'mf'],
      ['couettes', 'Couettes', 'two spiky pigtails', 'f'],
      ['carre', 'Carré court', 'short bob cut with sharp locks', 'f'],
      ['longs', 'Longs lâchés en pointes', 'long loose hair in big sharp locks', 'f'],
      ['chignons', 'Deux chignons', 'two round buns on top of the head', 'f'],
      ['lutin', 'Courts en pointes (garçonne)', 'short spiky pixie cut', 'f'],
      ['tresse', 'Longue tresse', 'one long braid', 'f']
    ],
    tenue: [['gi', 'Kimono d’arts martiaux', 'a martial-arts gi in vermilion red and black with a black belt and wristbands'], ['sport', 'Tenue de sport', 'a sporty training outfit (fitted top and shorts) in vermilion red and black'], ['torse_nu', 'Torse nu, pantalon de gi', 'bare chest with martial-arts gi trousers in vermilion red and a black belt']]
  };
  DI.persoDefaut = genre => genre === 'f'
    ? { genre: 'f', peau: 'doree', formeYeux: 'grands', couleurYeux: 'marron', couleurCheveux: 'noirs', coiffure: 'queue_haute', tenue: 'sport', doree: true }
    : { genre: 'm', peau: 'doree', formeYeux: 'percants', couleurYeux: 'noirs', couleurCheveux: 'noirs', coiffure: 'eventail', tenue: 'gi', doree: true };
  const choix = (liste, k) => (DI.PERSO[liste].find(x => x[0] === k) || DI.PERSO[liste][0]);

  /** Évolution du corps, stade par stade (1 à 5), selon le genre. */
  const STADES_PERSO = {
    m: [
      'Stage 1 of 5, BEGINNER: skinny teenage beginner, thin arms and legs, narrow shoulders, no visible muscles, a bit unsure but motivated smile.',
      'Stage 2 of 5, MOTIVATED: slim and lean, first visible muscle tone on the arms and shoulders, standing straighter, determined look.',
      'Stage 3 of 5, ATHLETE IN TRAINING: athletic and fit, defined chest, shoulders, biceps and visible abs, confident fighting stance.',
      'Stage 4 of 5, ATHLETE: very muscular martial artist, broad V-shaped torso, big shoulders and arms, six-pack abs, intense focused look, light energy sparks around the fists.',
      'Stage 5 of 5, LEGEND: legendary hero with a massive, heroic shonen physique (huge shoulders, thick arms, eight-pack abs, visible veins), powerful flexing pose, fierce confident expression, blazing golden energy aura with flame-like edges around the whole body.'
    ],
    f: [
      'Stage 1 of 5, BEGINNER: slim teenage beginner, thin arms and legs, no visible muscles, a bit unsure but motivated smile.',
      'Stage 2 of 5, MOTIVATED: slim and lean, first visible muscle tone on the arms and shoulders, standing straighter, determined look.',
      'Stage 3 of 5, ATHLETE IN TRAINING: athletic and fit, toned shoulders and arms, visible abs, strong legs, confident fighting stance.',
      'Stage 4 of 5, ATHLETE: strong muscular martial artist, defined shoulders, biceps and abs, powerful legs, intense focused look, light energy sparks around the fists. Athletic and strong, never sexualised.',
      'Stage 5 of 5, LEGEND: legendary heroine with a powerful, very muscular athletic physique (strong shoulders and arms, defined six-pack abs, powerful legs), heroic stance, fierce confident expression, blazing golden energy aura with flame-like edges around the whole body. Strong and heroic, never sexualised.'
    ]
  };
  DI.STADES_PERSO = STADES_PERSO;

  /** Prompt du personnage pour un stade (1 à 5). */
  DI.promptPerso = function (c, stade, avecPrecedent) {
    const g = c.genre === 'f' ? 'f' : 'm';
    const legende = stade === 5 && c.doree;
    return [
      `Character: an original ${choix('genre', g)[2]} training to become a martial-arts and fitness hero, with ${choix('peau', c.peau)[2]}, ${choix('formeYeux', c.formeYeux)[2]} with ${choix('couleurYeux', c.couleurYeux)[2]} irises, ${choix('couleurCheveux', c.couleurCheveux)[2]} hair styled as ${choix('coiffure', c.coiffure)[2]}, wearing ${choix('tenue', c.tenue)[2]}.`,
      STADES_PERSO[g][stade - 1],
      legende ? 'At this legendary stage the hair glows with golden light at the tips and the eyes shine with energy, but the hairstyle and identity stay the same.' : '',
      'The height and face stay the same from stage to stage; only the body grows stronger, the posture more confident and the effects more spectacular.',
      g === 'f'
        ? 'Reference image 1 is a simple generic vector drawing that only shows the level of musculature for this stage (it is drawn as a man): use it as a guide for how strong the body is, but the character is a woman as described above; ' + refaire() + ' with the hair, eyes and outfit described above.'
        : 'Reference image 1 is a simple vector drawing of the body at this stage: follow its proportions and musculature, but ' + refaire() + ' with the hair, eyes and outfit described above.',
      avecPrecedent ? 'Reference image 2 is the previous stage, already made: keep exactly the same face, hairstyle, colours and outfit so that both images clearly show the same person getting stronger.' : '',
      DI.rendu === '3d' ? DI.STYLE_PERSO_3D : DI.STYLE_PERSO
    ].filter(Boolean).join('\n');
  };
  /** Signature d'un choix de personnage (sert de clé de stockage). */
  DI.signature = c => ['genre', 'peau', 'formeYeux', 'couleurYeux', 'couleurCheveux', 'coiffure', 'tenue'].map(k => c[k]).join('-') + (c.doree ? '-or' : '');
  const clePerso = (c, stade) => `${prefixe()}perso-${DI.signature(c)}-${stade}`;
  /** Référence : le corps du stade dessiné par le moteur (peau choisie). */
  DI.referencePerso = (c, stade) => DI.raster(D.url(D.avatarBase({ stade, peau: D.PEAUX[c.peau] })), 1024, 'image/png');
  DI.lirePerso = c => Promise.all([1, 2, 3, 4, 5].map(st => AB.db.getMeta(clePerso(c, st), null))).then(l => Object.fromEntries(l.map((v, i) => [i + 1, v])));
  DI.enregistrerPerso = async function (c, stade, image, origine) {
    const v = { image: await DI.raster(image, 768, 'image/webp', 0.9), origine: origine || 'import', date: new Date().toISOString() };
    await AB.db.setMeta(clePerso(c, stade), v);
    return v;
  };
  DI.effacerPerso = (c, stade) => AB.db.setMeta(clePerso(c, stade), null);
  DI.genererPerso = async function (c, stade) {
    const avant = stade > 1 ? await AB.db.getMeta(clePerso(c, stade - 1), null) : null;
    const references = [await DI.referencePerso(c, stade)];
    if (avant) references.push(await DI.raster(avant.image, 1024, 'image/png'));
    return DI.enregistrerPerso(c, stade, await demanderImage(DI.promptPerso(c, stade, !!avant), references), 'ia');
  };

  /** Demande une image au serveur local (la clé reste sur le serveur). */
  async function demanderImage(prompt, references) {
    const base = await AB.ia.adresse();
    const r = await fetch(base + '/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' },
      body: JSON.stringify({ prompt, references })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erreur || `Le serveur local a répondu ${r.status}.`);
    return data.image;
  }

  /** Octets d'une data URL (pour le ZIP). */
  DI.octets = function (dataUrl) {
    const b = atob(String(dataUrl).split(',')[1] || '');
    const o = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
    return o;
  };
})();
