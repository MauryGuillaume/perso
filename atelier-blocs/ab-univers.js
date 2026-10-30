/* ==========================================================================
   ab-univers.js — univers graphique propre à chaque app
   Chaque app reçoit son ambiance, déduite de son besoin : palette, polices, formes, ombres, motif,
   illustration des écrans vides, rythme des animations, ton des textes. Le socle de qualité, lui, ne
   change pas : contrastes vérifiés (4,5:1), texte à 16 px au moins, cibles de 44 px, mouvement réduit.
   Couleurs douces par défaut ; vives seulement quand le concept s'y prête (enfants, sport, fête…).
   - AB.univers.deduire(texte) : les univers qui collent à la description, le meilleur d'abord ;
   - AB.univers.jetons(choix, couleursLogo) : les jetons calculés (contrastes corrigés) ;
   - AB.univers.css(...) → public/univers.css du kit « App complète » ; AB.univers.md(...) → UNIVERS.md ;
   - AB.univers.verifier(jetons) : les mêmes contrôles que verifier-app.js (règle 24).
   Choix d'univers (gardé dans l'identité de l'app) :
   { base, intensite: 'douce' | 'vive', polices, formes, motif, illustration, densite, mouvement, barre,
     teintes: { primaire: '#RRGGBB', accent: '#RRGGBB' } | null, motifFond: bool, pourquoi, source }
   Fichier utilisable aussi par Node (module.exports), pour les outils du mainteneur.
   ========================================================================== */
(function (racine) {
  const UV = {};

  /* ======================= Couleurs ======================= */

  const HEX = /^#[0-9a-f]{6}$/i;
  const borne = (x, a, b) => Math.max(a, Math.min(b, x));
  function versHsl(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: h * 60, s, l };
  }
  function versHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = borne(s, 0, 1); l = borne(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function luminance(hex) {
    if (!HEX.test(String(hex || '').trim())) return null;
    const n = parseInt(String(hex).trim().slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255].map(v => v / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
      .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  }
  UV.contraste = function (a, b) { const x = luminance(a), y = luminance(b); return x === null || y === null ? null : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** Assombrit (ou éclaircit) une couleur jusqu'au contraste demandé sur chacun des fonds. */
  function lisible(hex, fonds, ratio, eclaircir) {
    const c = versHsl(hex);
    for (let i = 0; i < 100; i++) {
      const x = versHex(c.h, c.s, c.l);
      if (fonds.every(f => UV.contraste(x, f) >= ratio)) return x;
      c.l += eclaircir ? 0.01 : -0.01;
      if (c.l <= 0 || c.l >= 1) break;
    }
    return eclaircir ? '#FFFFFF' : '#111111';
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
  const melanger = (a, b, k) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  UV.hsl = versHsl;

  /* ======================= Vocabulaire ======================= */

  UV.POLICES = {
    systeme: { label: 'Système, nette', pile: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
    arrondie: { label: 'Arrondie, amicale', pile: 'ui-rounded, "SF Pro Rounded", Nunito, "Varela Round", Quicksand, system-ui, sans-serif' },
    geometrique: { label: 'Géométrique, moderne', pile: '"Avenir Next", Avenir, Montserrat, "Century Gothic", Futura, system-ui, sans-serif' },
    humaniste: { label: 'Humaniste, chaleureuse', pile: '"Segoe UI", "Gill Sans", "Gill Sans MT", Optima, Candara, "Noto Sans", system-ui, sans-serif' },
    'serif-douce': { label: 'Serif douce, littéraire', pile: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif' },
    elegante: { label: 'Serif élégante, raffinée', pile: 'Didot, "Bodoni 72", "Bodoni MT", "Playfair Display", "Cormorant Garamond", Georgia, serif', titresSeulement: true },
    condensee: { label: 'Condensée, dynamique', pile: '"Avenir Next Condensed", "Barlow Condensed", "Roboto Condensed", "Arial Narrow", sans-serif-condensed, system-ui, sans-serif', titresSeulement: true },
    technique: { label: 'Technique, chasse fixe', pile: 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace', titresSeulement: true }
  };
  UV.FORMES = {
    douces: { label: 'Douces (arrondis, boutons pilule)', rayon: 18, btn: 999, champ: 14, trait: 1 },
    bulles: { label: 'Bulles (très arrondi, traits épais)', rayon: 24, btn: 999, champ: 16, trait: 2 },
    equilibrees: { label: 'Équilibrées', rayon: 12, btn: 12, champ: 10, trait: 1 },
    nettes: { label: 'Nettes (angles vifs)', rayon: 6, btn: 6, champ: 6, trait: 1 }
  };
  UV.OMBRES = { douce: 'Douce', nette: 'Nette (liseré)', portee: 'Portée (décalée, graphique)', aucune: 'Aucune (à plat)' };
  UV.DENSITES = { aeree: { label: 'Aérée', e: [4, 8, 14, 20, 28, 40], t: 17 }, normale: { label: 'Normale', e: [4, 8, 12, 16, 24, 32], t: 16 }, compacte: { label: 'Compacte', e: [4, 6, 10, 14, 20, 28], t: 16 } };
  UV.MOUVEMENTS = { calme: { label: 'Calme', duree: 320, courbe: 'cubic-bezier(.25, .8, .25, 1)' }, doux: { label: 'Doux', duree: 240, courbe: 'cubic-bezier(.2, .7, .2, 1)' }, vif: { label: 'Vif, rebondi', duree: 180, courbe: 'cubic-bezier(.3, 1.35, .5, 1)' } };
  UV.BARRES = { degrade: 'Dégradé', plein: 'Couleur pleine', claire: 'Claire (teintée)' };

  /* Motifs : tuiles SVG (c = couleur, a = opacité), répétées sur la barre et le bandeau d'accueil */
  const svgUrl = s => `url("data:image/svg+xml,${encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29')}")`;
  UV.MOTIFS = {
    aucun: { label: 'Aucun', taille: 0, d: () => '' },
    pois: { label: 'Pois', taille: 28, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><g fill='${c}' fill-opacity='${a}'><circle cx='7' cy='7' r='2.5'/><circle cx='21' cy='21' r='2.5'/></g></svg>` },
    vagues: { label: 'Vagues', taille: 64, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='32'><path d='M0 16 C16 4 16 28 32 16 S48 4 64 16' fill='none' stroke='${c}' stroke-opacity='${a}' stroke-width='2'/></svg>` },
    diagonales: { label: 'Diagonales', taille: 24, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M-6 30 L30 -6 M-6 6 L6 -6 M18 30 L30 18' stroke='${c}' stroke-opacity='${a}' stroke-width='3'/></svg>` },
    grille: { label: 'Grille', taille: 32, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M32 0 H0 V32' fill='none' stroke='${c}' stroke-opacity='${a}' stroke-width='1'/></svg>` },
    feuilles: { label: 'Feuilles', taille: 56, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><g fill='${c}' fill-opacity='${a}'><path d='M10 26 C10 14 18 6 30 6 C30 18 22 26 10 26 Z'/><path d='M34 50 C34 40 41 33 51 33 C51 43 44 50 34 50 Z'/></g></svg>` },
    confettis: { label: 'Confettis', taille: 60, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><g fill='${c}' fill-opacity='${a}'><rect x='8' y='10' width='8' height='3' rx='1.5' transform='rotate(30 12 11)'/><circle cx='44' cy='14' r='2.5'/><rect x='36' y='40' width='8' height='3' rx='1.5' transform='rotate(-35 40 41)'/><path d='M14 44 l3 6 l-6 0 Z'/></g></svg>` },
    etoiles: { label: 'Étoiles', taille: 48, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><g fill='${c}' fill-opacity='${a}'><path d='M12 6 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z'/><circle cx='36' cy='34' r='1.8'/></g></svg>` },
    courbes: { label: 'Courbes de niveau', taille: 80, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><g fill='none' stroke='${c}' stroke-opacity='${a}' stroke-width='1.5'><path d='M0 20 C20 10 40 30 80 18'/><path d='M0 44 C24 32 48 58 80 42'/><path d='M0 68 C28 58 52 80 80 66'/></g></svg>` },
    losanges: { label: 'Losanges', taille: 32, d: (c, a) => `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><path d='M16 4 L28 16 L16 28 L4 16 Z' fill='none' stroke='${c}' stroke-opacity='${a}' stroke-width='1.5'/></svg>` }
  };

  /* Illustrations des écrans vides (4:3) : formes simples aux couleurs de l'univers */
  UV.ILLUSTRATIONS = {
    bulles: { label: 'Bulles', d: p => `<circle cx='86' cy='70' r='44' fill='${p.c2}'/><circle cx='150' cy='92' r='30' fill='${p.c3}'/><circle cx='120' cy='54' r='14' fill='${p.accent}'/><circle cx='60' cy='118' r='9' fill='${p.primaire}'/>` },
    plante: { label: 'Plante', d: p => `<ellipse cx='120' cy='158' rx='70' ry='8' fill='${p.c2}'/><path d='M96 112 H144 L136 156 H104 Z' fill='${p.accent}'/><path d='M120 112 V70' stroke='${p.primaire}' stroke-width='5' stroke-linecap='round'/><path d='M120 84 C96 84 84 70 82 48 C104 48 120 60 120 84 Z' fill='${p.primaire}'/><path d='M120 74 C122 52 136 40 158 38 C158 60 142 74 120 74 Z' fill='${p.c3}'/>` },
    carnet: { label: 'Carnet', d: p => `<rect x='62' y='30' width='100' height='128' rx='10' fill='${p.c2}'/><rect x='72' y='30' width='90' height='128' rx='10' fill='#FFFFFF' stroke='${p.primaire}' stroke-width='3'/><path d='M88 64 H146 M88 84 H146 M88 104 H126' stroke='${p.c3}' stroke-width='6' stroke-linecap='round'/><path d='M150 128 L186 92 L196 102 L160 138 L146 142 Z' fill='${p.accent}'/>` },
    paysage: { label: 'Paysage', d: p => `<circle cx='164' cy='54' r='20' fill='${p.c3}'/><path d='M20 150 L88 70 L130 118 L154 92 L220 150 Z' fill='${p.primaire}'/><path d='M76 84 L88 70 L100 84 Z' fill='#FFFFFF'/><rect x='20' y='148' width='200' height='12' rx='6' fill='${p.c2}'/>` },
    coeur: { label: 'Cœur', d: p => `<circle cx='120' cy='90' r='62' fill='${p.c2}'/><path d='M120 132 C92 112 80 98 80 82 A20 20 0 0 1 120 74 A20 20 0 0 1 160 82 C160 98 148 112 120 132 Z' fill='${p.primaire}'/><path d='M176 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z' fill='${p.accent}'/>` },
    boite: { label: 'Boîte', d: p => `<ellipse cx='120' cy='156' rx='72' ry='8' fill='${p.c2}'/><path d='M70 72 L120 52 L170 72 V136 L120 156 L70 136 Z' fill='${p.c3}'/><path d='M70 72 L120 92 L170 72' fill='none' stroke='${p.primaire}' stroke-width='4' stroke-linejoin='round'/><path d='M120 92 V156' stroke='${p.primaire}' stroke-width='4'/><path d='M95 62 L145 82' stroke='${p.accent}' stroke-width='8' stroke-linecap='round'/>` },
    fusee: { label: 'Fusée', d: p => `<circle cx='120' cy='96' r='64' fill='${p.c2}'/><path d='M120 36 C140 54 146 80 140 116 H100 C94 80 100 54 120 36 Z' fill='${p.primaire}'/><circle cx='120' cy='78' r='10' fill='#FFFFFF'/><path d='M100 104 L84 128 L102 122 Z M140 104 L156 128 L138 122 Z' fill='${p.accent}'/><path d='M110 120 L120 146 L130 120 Z' fill='${p.c3}'/>` },
    trophee: { label: 'Trophée', d: p => `<ellipse cx='120' cy='158' rx='60' ry='7' fill='${p.c2}'/><path d='M88 40 H152 V70 A32 32 0 0 1 88 70 Z' fill='${p.accent}'/><path d='M88 50 H70 A18 18 0 0 0 92 82 M152 50 H170 A18 18 0 0 1 148 82' fill='none' stroke='${p.accent}' stroke-width='6'/><rect x='112' y='100' width='16' height='26' fill='${p.primaire}'/><rect x='92' y='126' width='56' height='16' rx='4' fill='${p.primaire}'/>` }
  };

  /* ======================= Les univers ======================= */

  /* h : teintes (degrés) de la couleur principale et de l'accent ; fond : teinte du fond si elle diffère de la principale. */
  UV.BASES = {
    soin: { nom: 'Soin et sérénité', ambiance: 'Rassurant, propre et chaleureux, comme un cabinet lumineux.', h: [178, 258], intensite: 'douce',
      polices: ['arrondie', 'systeme'], formes: 'douces', ombre: 'douce', motif: 'vagues', illustration: 'coeur', densite: 'aeree', mouvement: 'calme', barre: 'degrade',
      icones: 'Traits arrondis de 2 px, formes pleines évitées, coins doux.', images: 'Illustrations calmes, personnages bienveillants, jamais d’image médicale crue.', ton: 'Rassurant et clair : phrases courtes, vouvoiement, jamais alarmiste.',
      mots: /sante|soin|medec|medic|patient|therap|kine|podolo|psy|cabinet|infirm|dentist|pharma|clinique|docteur|rendez-vous medic|ordonnance|bien.?etre/ },
    zen: { nom: 'Calme et bien-être', ambiance: 'Lent, doux et apaisant, beaucoup d’air et de lumière.', h: [252, 335], intensite: 'douce',
      polices: ['serif-douce', 'humaniste'], formes: 'douces', ombre: 'douce', motif: 'courbes', illustration: 'paysage', densite: 'aeree', mouvement: 'calme', barre: 'degrade',
      icones: 'Traits fins et arrondis, formes organiques.', images: 'Paysages simplifiés, ciels, dégradés pastel.', ton: 'Bienveillant et posé, tutoiement doux, aucune injonction.',
      mots: /medit|sommeil|dormir|yoga|respir|humeur|journal intime|gratitude|relax|stress|anxi|zen|sophro|emotion/ },
    nature: { nom: 'Nature et potager', ambiance: 'Organique, terrien et lumineux, comme un carnet de jardin.', h: [132, 28], intensite: 'douce',
      polices: ['serif-douce', 'humaniste'], formes: 'douces', ombre: 'douce', motif: 'feuilles', illustration: 'plante', densite: 'normale', mouvement: 'doux', barre: 'plein',
      icones: 'Traits arrondis, détails végétaux (feuilles, gouttes) avec parcimonie.', images: 'Plantes, saisons, textures naturelles dessinées à plat.', ton: 'Convivial et concret, conseils de saison, tutoiement.',
      mots: /jardin|plante|potager|ecolo|recycl|ferme|bio\b|randon|nature|arros|graine|semis|compost|climat|carbone|durable|foret|animal|cheval|chien|chat\b/ },
    gourmand: { nom: 'Gourmand et convivial', ambiance: 'Chaleureux et appétissant, comme une table de fête.', h: [8, 158], fond: 38, intensite: 'douce',
      polices: ['serif-douce', 'systeme'], formes: 'douces', ombre: 'douce', motif: 'pois', illustration: 'bulles', densite: 'normale', mouvement: 'doux', barre: 'plein',
      icones: 'Traits ronds et généreux, petits détails gourmands.', images: 'Plats et ingrédients en aplats colorés, vue de dessus.', ton: 'Gourmand et chaleureux, tutoiement, verbes d’action.',
      mots: /cuisin|recette|repas|restau|courses\b|liste de course|menu|boulang|patiss|aliment|ingredient|cave|vin\b|biere|cafe\b|traiteur|food|gouter|diner/ },
    pro: { nom: 'Pro et efficace', ambiance: 'Net, structuré et sûr de lui, l’essentiel d’abord.', h: [218, 192], intensite: 'douce',
      polices: ['geometrique', 'systeme'], formes: 'equilibrees', ombre: 'nette', motif: 'grille', illustration: 'carnet', densite: 'normale', mouvement: 'doux', barre: 'plein',
      icones: 'Traits réguliers de 1,75 px, angles légèrement arrondis.', images: 'Schémas et objets du métier, sobres, deux couleurs.', ton: 'Professionnel et direct, vouvoiement, chiffres en avant.',
      mots: /factur|devis|client|gestion|stock|planning|entreprise|artisan|crm|intervention|chantier|commande|fournisseur|equipe|salarie|tache|projet|pro\b|b2b|relance/ },
    confiance: { nom: 'Finance et confiance', ambiance: 'Solide, posé et transparent, chaque chiffre est clair.', h: [226, 158], intensite: 'douce', profond: true,
      polices: ['geometrique', 'systeme'], formes: 'equilibrees', ombre: 'douce', motif: 'losanges', illustration: 'boite', densite: 'normale', mouvement: 'doux', barre: 'degrade',
      icones: 'Traits réguliers, formes géométriques stables.', images: 'Objets du quotidien (tickets, coffres, documents) en aplats sobres.', ton: 'Clair et rassurant, vouvoiement, aucun jargon.',
      mots: /budget|banque|epargn|garanti|assuran|impot|depense|ticket|contrat|administr|papier|document|argent|compte bancaire|credit|facture perso|abonnement|sav\b|coffre/ },
    ludique: { nom: 'Ludique et famille', ambiance: 'Joyeux, rond et récompensant, on a envie d’y revenir.', h: [266, 46], intensite: 'vive',
      polices: ['arrondie', 'arrondie'], graisse: 800, formes: 'bulles', ombre: 'portee', motif: 'confettis', illustration: 'fusee', densite: 'aeree', mouvement: 'vif', barre: 'degrade',
      icones: 'Traits épais et ronds, formes pleines bicolores.', images: 'Personnages expressifs, étoiles, récompenses.', ton: 'Enjoué et encourageant, tutoiement, félicitations à chaque étape.',
      mots: /enfant|jeu\b|jeux|ecole|famille|quiz|apprend|devoir|anniversaire|bebe|eleve|parent|gamif|badge|recompense|defi|niveau|avatar|compagnon/ },
    energie: { nom: 'Énergie et sport', ambiance: 'Dynamique et motivant, ça avance vite.', h: [14, 206], intensite: 'vive',
      polices: ['condensee', 'systeme'], graisse: 800, casse: 'uppercase', formes: 'nettes', ombre: 'nette', motif: 'diagonales', illustration: 'trophee', densite: 'normale', mouvement: 'vif', barre: 'degrade',
      icones: 'Traits épais, angles vifs, inclinaison légère.', images: 'Silhouettes en mouvement, chiffres en grand.', ton: 'Motivant et bref, tutoiement, verbes à l’impératif.',
      mots: /sport|course|muscu|entrain|fitness|velo|match|club|coach|seance|running|natation|foot|tennis|perf|calorie|marathon|salle de sport/ },
    culture: { nom: 'Créatif et culture', ambiance: 'Éditorial et inspirant, comme une belle revue.', h: [328, 246], intensite: 'douce',
      polices: ['elegante', 'humaniste'], formes: 'equilibrees', ombre: 'douce', motif: 'courbes', illustration: 'carnet', densite: 'aeree', mouvement: 'doux', barre: 'plein',
      icones: 'Traits fins et précis.', images: 'Couvertures, affiches et formes graphiques, beaucoup de blanc.', ton: 'Curieux et élégant, tutoiement, phrases soignées.',
      mots: /musique|lecture|livre|art\b|artiste|photo|cinema|film|ecriture|podcast|biblio|musee|concert|theatre|poesie|dessin|creati/ },
    evasion: { nom: 'Évasion et voyage', ambiance: 'Ouvert, lumineux et léger, un air de vacances.', h: [198, 12], intensite: 'douce',
      polices: ['geometrique', 'systeme'], formes: 'douces', ombre: 'douce', motif: 'vagues', illustration: 'paysage', densite: 'normale', mouvement: 'doux', barre: 'degrade',
      icones: 'Traits arrondis, pictogrammes de voyage simples.', images: 'Paysages et cartes simplifiés, soleil, horizon.', ton: 'Enthousiaste et pratique, tutoiement.',
      mots: /voyage|vacance|meteo|mer\b|plage|sortie|location|trajet|carte|itinerair|vol\b|hotel|camping|tourism|week-end|ski|bateau/ },
    tech: { nom: 'Tech et malin', ambiance: 'Précis, futé et moderne, sans froideur.', h: [244, 176], intensite: 'douce', profond: true,
      polices: ['technique', 'systeme'], formes: 'nettes', ombre: 'nette', motif: 'grille', illustration: 'bulles', densite: 'compacte', mouvement: 'doux', barre: 'degrade',
      icones: 'Traits fins et réguliers, angles nets.', images: 'Formes géométriques, schémas, points et lignes.', ton: 'Précis et complice, tutoiement, sans jargon inutile.',
      mots: /\bia\b|intelligence artif|outil|code|donnee|securi|mot de passe|automat|domotique|statist|api\b|serveur|robot|logiciel|tableau de bord|analyse/ },
    elegance: { nom: 'Élégance et beauté', ambiance: 'Raffiné et délicat, chaque détail compte.', h: [340, 32], intensite: 'douce',
      polices: ['elegante', 'humaniste'], formes: 'douces', ombre: 'douce', motif: 'losanges', illustration: 'coeur', densite: 'aeree', mouvement: 'calme', barre: 'plein',
      icones: 'Traits très fins, détails dorés avec parcimonie.', images: 'Photos lumineuses ou aplats délicats, beaucoup d’espace.', ton: 'Raffiné et attentionné, vouvoiement.',
      mots: /beaute|mode\b|coiff|mariage|bijou|salon|esthet|cadeau|rencontre|couple|parfum|maquill|ongle|vetement|luxe|amour/ },
    communaute: { nom: 'Communauté et local', ambiance: 'Accueillant et vivant, on se sent du quartier.', h: [14, 174], intensite: 'douce',
      polices: ['arrondie', 'systeme'], formes: 'douces', ombre: 'douce', motif: 'pois', illustration: 'bulles', densite: 'normale', mouvement: 'doux', barre: 'plein',
      icones: 'Traits arrondis, pictogrammes de personnes et de lieux.', images: 'Petits personnages variés, lieux du quotidien.', ton: 'Chaleureux et inclusif, tutoiement.',
      mots: /associa|voisin|quartier|benevol|evenement|entraide|mairie|partage|covoit|communaut|local|commerce|marche|collectif|fete|sortie entre/ }
  };

  const sansAccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /** Univers classés selon la description : [{ id, score }], le meilleur d'abord (au moins 3). */
  UV.deduire = function (texte) {
    const t = sansAccent(texte);
    const res = Object.entries(UV.BASES).map(([id, b]) => ({ id, score: (t.match(new RegExp(b.mots.source, 'g')) || []).length })).filter(x => x.score).sort((a, b) => b.score - a.score);
    for (const id of ['pro', 'communaute', 'zen']) if (res.length < 3 && !res.some(x => x.id === id)) res.push({ id, score: 0 });
    return res;
  };

  /** Choix complet à partir d'un univers de base (valeurs par défaut de la base, puis celles données). */
  UV.choix = function (base, plus) {
    const b = UV.BASES[base] || UV.BASES.pro;
    const c = Object.assign({ base: UV.BASES[base] ? base : 'pro', intensite: b.intensite, polices: b.polices.slice(), formes: b.formes, ombre: b.ombre, motif: b.motif,
      illustration: b.illustration, densite: b.densite, mouvement: b.mouvement, barre: b.barre, motifFond: false, teintes: null, pourquoi: '' }, plus || {});
    return UV.normaliser(c);
  };

  /** Nettoie un choix venu de l'utilisateur ou de Claude : tout ce qui est inconnu reprend la valeur de la base. */
  UV.normaliser = function (x) {
    x = x || {};
    const base = UV.BASES[x.base] ? x.base : 'pro', b = UV.BASES[base];
    const pol = Array.isArray(x.polices) ? x.polices : [x.polices, x.policeTexte];
    const titres = UV.POLICES[pol[0]] ? pol[0] : b.polices[0];
    const texte = UV.POLICES[pol[1]] && !UV.POLICES[pol[1]].titresSeulement ? pol[1] : b.polices[1];
    const t = x.teintes && typeof x.teintes === 'object' ? x.teintes : null;
    const teintes = t && HEX.test(t.primaire || '') && HEX.test(t.accent || '') ? { primaire: t.primaire.toUpperCase(), accent: t.accent.toUpperCase() } : null;
    const pris = (v, liste, d) => (liste[v] ? v : d);
    return { base, intensite: x.intensite === 'vive' ? 'vive' : 'douce', polices: [titres, texte], formes: pris(x.formes, UV.FORMES, b.formes), ombre: pris(x.ombre, UV.OMBRES, b.ombre),
      motif: pris(x.motif, UV.MOTIFS, b.motif), illustration: pris(x.illustration, UV.ILLUSTRATIONS, b.illustration), densite: pris(x.densite, UV.DENSITES, b.densite),
      mouvement: pris(x.mouvement, UV.MOUVEMENTS, b.mouvement), barre: pris(x.barre, UV.BARRES, b.barre), motifFond: !!x.motifFond, teintes,
      pourquoi: String(x.pourquoi || '').slice(0, 240), titre: String(x.titre || '').slice(0, 80), source: x.source === 'claude' ? 'claude' : 'auto' };
  };

  /* ======================= Calcul des jetons ======================= */

  /**
   * Jetons de l'univers (contrastes corrigés). couleurs : celles du logo choisi { principale, accent } (facultatif) ;
   * sinon les teintes de la base, ou celles du choix (teintes).
   */
  UV.jetons = function (choix, couleurs) {
    const c = UV.normaliser(choix), b = UV.BASES[c.base];
    const vive = c.intensite === 'vive';
    const source = c.teintes || (couleurs && HEX.test(couleurs.principale || '') && HEX.test(couleurs.accent || '') ? { primaire: couleurs.principale, accent: couleurs.accent } : null);
    const hp = source ? versHsl(source.primaire).h : b.h[0], ha = source ? versHsl(source.accent).h : b.h[1];
    // Saturation : douce par défaut, vive si le concept s'y prête ; une couleur de marque grise reste sobre
    const sp = source && versHsl(source.primaire).s < 0.12 ? 0.08 : vive ? 0.74 : 0.44;
    const sa = source && versHsl(source.accent).s < 0.12 ? 0.10 : vive ? 0.86 : 0.5;
    const hf = b.fond !== undefined && !source ? b.fond : hp;
    const blanc = '#FFFFFF';
    const fond = versHex(hf, vive ? 0.55 : 0.38, vive ? 0.965 : 0.972);
    const carte = versHex(hf, 0.6, 0.995);
    const texte = versHex(hp, 0.28, 0.14);
    const teinte = versHex(ha, vive ? 0.85 : 0.62, vive ? 0.91 : 0.935);
    const c2 = versHex(hp, vive ? 0.7 : 0.48, vive ? 0.87 : 0.9);
    const c3 = versHex(ha + 36, vive ? 0.78 : 0.52, vive ? 0.86 : 0.9);
    const bordure = versHex(hp, 0.22, 0.885);
    const doux = lisible(versHex(hp, 0.12, 0.44), [fond, carte, teinte], 4.6);
    // Un jaune ou un orange clair assombri jusqu'au contraste vire au kaki : il reste en décor (teinte, illustrations)
    // et les boutons prennent une teinte voisine de la principale
    const jaune = ha >= 38 && ha <= 80;
    const accent = lisible(versHex(jaune ? hp + 24 : ha, sa, vive ? 0.47 : 0.46), [carte, fond, blanc], 4.6);
    let primaire, surPrimaire, barreFond;
    if (c.barre === 'claire') {
      primaire = versHex(hp, vive ? 0.7 : 0.5, 0.9);
      surPrimaire = lisible(texte, [primaire], 7);
      barreFond = `linear-gradient(135deg, ${primaire}, ${versHex(ha, vive ? 0.7 : 0.5, 0.9)})`;
    } else {
      primaire = lisible(versHex(hp, b.profond ? sp * 0.9 : sp, b.profond ? 0.26 : vive ? 0.42 : 0.38), [blanc], b.profond ? 9 : 5);
      surPrimaire = blanc;
      const fin = lisible(melanger(primaire, versHex(ha, sp, 0.4), 0.42), [blanc], 4.6);
      barreFond = c.barre === 'degrade' ? `linear-gradient(135deg, ${primaire}, ${fin})` : primaire;
    }
    const surAccent = blanc;
    const btnFond = vive ? `linear-gradient(135deg, ${accent}, ${lisible(versHex(versHsl(accent).h + 18, sa, 0.45), [blanc], 4.6)})` : accent;
    const danger = lisible(versHex(4, 0.62, 0.45), [carte, fond, teinte, blanc], 4.6);
    const succes = lisible(versHex(142, 0.5, 0.36), [carte, fond, teinte], 4.6);
    const alerte = lisible(versHex(32, 0.85, 0.36), [carte, fond, teinte], 4.6);
    const f = UV.FORMES[c.formes], d = UV.DENSITES[c.densite], m = UV.MOUVEMENTS[c.mouvement];
    const ombreTxt = texte;
    const ombres = {
      douce: [`0 1px 2px ${rgba(ombreTxt, 0.05)}, 0 6px 18px ${rgba(ombreTxt, 0.06)}`, `0 2px 4px ${rgba(ombreTxt, 0.06)}, 0 14px 32px ${rgba(ombreTxt, 0.12)}`],
      nette: [`0 1px 0 ${rgba(ombreTxt, 0.08)}`, `0 2px 0 ${rgba(ombreTxt, 0.1)}, 0 8px 20px ${rgba(ombreTxt, 0.08)}`],
      portee: [`3px 3px 0 ${rgba(ombreTxt, 0.14)}`, `5px 5px 0 ${rgba(ombreTxt, 0.18)}`],
      aucune: ['none', `0 8px 24px ${rgba(ombreTxt, 0.1)}`]
    }[c.ombre];
    const motif = UV.MOTIFS[c.motif];
    const surBarre = c.barre === 'claire' ? surPrimaire : blanc;
    const pal = { primaire, accent, c2, c3, teinte };
    const titres = UV.POLICES[c.polices[0]], corps = UV.POLICES[c.polices[1]];
    const majuscules = (b.casse === 'uppercase');
    return {
      univers: c.base, intensite: c.intensite,
      primaire, 'sur-primaire': surPrimaire, accent, 'sur-accent': surAccent,
      fond, carte, texte, doux, bordure, teinte, 'couleur-2': c2, 'couleur-3': c3,
      danger, succes, alerte,
      'barre-fond': barreFond, 'btn-fond': btnFond,
      police: corps.pile, 'police-titres': titres.pile,
      'graisse-titres': String(b.graisse || (c.polices[0] === 'elegante' || c.polices[0] === 'serif-douce' ? 600 : 700)),
      'casse-titres': majuscules && c.polices[0] === 'condensee' ? 'uppercase' : 'none',
      'lettrage-titres': majuscules && c.polices[0] === 'condensee' ? '0.02em' : c.polices[0] === 'elegante' ? '0' : '-0.01em',
      't-petit': '14px', 't-normal': d.t + 'px', 't-titre': (c.polices[0] === 'condensee' ? 24 : 22) + 'px', 't-grand-titre': (c.polices[0] === 'condensee' || c.polices[0] === 'elegante' ? 32 : 28) + 'px',
      rayon: f.rayon + 'px', 'rayon-btn': f.btn + 'px', 'rayon-champ': f.champ + 'px', trait: f.trait + 'px',
      ombre: ombres[0], 'ombre-forte': ombres[1], 'btn-ombre': c.ombre === 'portee' ? `2px 2px 0 ${rgba(ombreTxt, 0.2)}` : vive ? `0 4px 12px ${rgba(accent, 0.28)}` : 'none',
      motif: motif.taille ? svgUrl(motif.d(surBarre, c.barre === 'claire' ? 0.18 : 0.16)) : 'none', 'motif-taille': (motif.taille || 32) + 'px',
      'fond-motif': c.motifFond && motif.taille ? svgUrl(motif.d(primaire, 0.05)) : 'none',
      illustration: svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180'>${UV.ILLUSTRATIONS[c.illustration].d(pal)}</svg>`),
      duree: m.duree + 'ms', courbe: m.courbe,
      e1: d.e[0] + 'px', e2: d.e[1] + 'px', e3: d.e[2] + 'px', e4: d.e[3] + 'px', e5: d.e[4] + 'px', e6: d.e[5] + 'px'
    };
  };

  /* Jetons attendus dans univers.css (verifier-app.js, règle 24, reprend la même liste) */
  UV.NOMS = ['primaire', 'sur-primaire', 'accent', 'sur-accent', 'fond', 'carte', 'texte', 'doux', 'bordure', 'teinte', 'couleur-2', 'couleur-3', 'danger', 'succes', 'alerte',
    'barre-fond', 'btn-fond', 'police', 'police-titres', 'graisse-titres', 'casse-titres', 'lettrage-titres', 't-petit', 't-normal', 't-titre', 't-grand-titre',
    'rayon', 'rayon-btn', 'rayon-champ', 'trait', 'ombre', 'ombre-forte', 'btn-ombre', 'motif', 'motif-taille', 'fond-motif', 'illustration', 'duree', 'courbe',
    'e1', 'e2', 'e3', 'e4', 'e5', 'e6'];

  /* Paires texte / fond contrôlées à 4,5:1 (les mêmes dans verifier-app.js) */
  UV.PAIRES = [['texte', 'fond'], ['texte', 'carte'], ['texte', 'teinte'], ['texte', 'couleur-2'], ['texte', 'couleur-3'], ['doux', 'fond'], ['doux', 'carte'],
    ['sur-primaire', 'primaire'], ['sur-accent', 'accent'], ['accent', 'carte'], ['accent', 'fond'], ['danger', 'carte'], ['succes', 'carte'], ['alerte', 'carte']];

  /** Contrôles de qualité d'un jeu de jetons : [{ ok, texte, recommande }]. */
  UV.verifier = function (j) {
    const out = [];
    const pire = UV.PAIRES.map(([t, f]) => ({ t, f, c: UV.contraste(j[t], j[f]) })).sort((a, b) => (a.c || 0) - (b.c || 0));
    const ko = pire.filter(x => x.c === null || x.c < 4.5);
    out.push({ ok: !ko.length, texte: ko.length ? 'Contraste trop faible : ' + ko.map(x => `${x.t} sur ${x.f} ${x.c ? x.c.toFixed(1) : '?'}`).join(', ') : `Lisible : tous les textes à ${pire[0].c.toFixed(1)}:1 ou plus (4,5 minimum)` });
    const sat = Math.max(...['primaire', 'accent'].map(n => HEX.test(j[n] || '') ? versHsl(j[n]).s : 0));
    out.push({ ok: sat >= 0.25, texte: sat >= 0.25 ? 'Coloré : la marque a une vraie couleur' : 'Trop gris : donne de la couleur à la principale ou à l’accent' });
    const fortes = ['fond', 'carte'].filter(n => HEX.test(j[n] || '') && versHsl(j[n]).l < 0.93);
    const criard = j.intensite !== 'vive' && ['accent', 'primaire'].some(n => HEX.test(j[n] || '') && versHsl(j[n]).s > 0.8 && versHsl(j[n]).l > 0.35);
    out.push({ ok: !fortes.length && !criard, recommande: true, texte: fortes.length ? 'Fond trop chargé : garde un fond très clair' : criard ? 'Couleurs vives dans un univers doux : adoucis l’accent ou passe en « vive »' : (j.intensite === 'vive' ? 'Couleurs vives, fond clair et calme' : 'Couleurs douces, pas agressives') });
    const tn = parseFloat(j['t-normal']), tp = parseFloat(j['t-petit']);
    out.push({ ok: tn >= 16 && tp >= 13, texte: tn >= 16 && tp >= 13 ? `Texte à ${tn} px (16 minimum)` : 'Texte trop petit : 16 px minimum, 13 px pour les mentions' });
    const du = parseFloat(j.duree);
    out.push({ ok: du > 0 && du <= 400, texte: du <= 400 ? `Animations de ${du} ms (fluide, 400 ms maximum)` : 'Animations trop lentes : 400 ms maximum' });
    return out;
  };

  /* ======================= Fichiers ======================= */

  /** public/univers.css du kit « App complète ». */
  UV.css = function (choix, j, nom) {
    const c = UV.normaliser(choix), b = UV.BASES[c.base];
    const ligne = n => `  --${n}: ${j[n]};`;
    const groupes = [
      ['Couleurs (contraste 4,5:1 contrôlé, règle 24)', ['primaire', 'sur-primaire', 'accent', 'sur-accent', 'fond', 'carte', 'texte', 'doux', 'bordure', 'teinte', 'couleur-2', 'couleur-3', 'danger', 'succes', 'alerte', 'barre-fond', 'btn-fond']],
      ['Typographie (polices du système ou fichiers dans public/polices/, jamais de CDN : la CSP les bloque)', ['police', 'police-titres', 'graisse-titres', 'casse-titres', 'lettrage-titres', 't-petit', 't-normal', 't-titre', 't-grand-titre']],
      ['Formes et relief', ['rayon', 'rayon-btn', 'rayon-champ', 'trait', 'ombre', 'ombre-forte', 'btn-ombre']],
      ['Motif (barre et accueil), illustration des écrans vides : SVG en data: ou fichier de public/', ['motif', 'motif-taille', 'fond-motif', 'illustration']],
      ['Mouvement et rythme', ['duree', 'courbe', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6']]
    ];
    return `/* univers.css — univers graphique de ${nom || 'l’app'} : « ${b.nom} », couleurs ${c.intensite === 'vive' ? 'vives' : 'douces'}.
   Généré par l'Atelier de Blocs. PROPRE À L'APP : les valeurs se changent, les noms restent (verifier-app.js, règle 24).
   Polices : titres ${UV.POLICES[c.polices[0]].label.toLowerCase()}, texte ${UV.POLICES[c.polices[1]].label.toLowerCase()} ; formes ${UV.FORMES[c.formes].label.toLowerCase()} ;
   motif ${UV.MOTIFS[c.motif].label.toLowerCase()} ; illustration ${UV.ILLUSTRATIONS[c.illustration].label.toLowerCase()} ; mouvement ${UV.MOUVEMENTS[c.mouvement].label.toLowerCase()}. Voir UNIVERS.md. */
:root {
  --univers: ${c.base}; --intensite: ${c.intensite};
${groupes.map(([titre, noms]) => `  /* ${titre} */\n${noms.map(ligne).join('\n')}`).join('\n')}
}
`;
  };

  /** UNIVERS.md : la direction artistique de l'app, pour Claude et pour la suite. */
  UV.md = function (choix, j, nom) {
    const c = UV.normaliser(choix), b = UV.BASES[c.base];
    const coul = n => `\`${j[n]}\``;
    return `# Univers graphique de ${nom || 'l’app'} : ${c.titre || b.nom}

${b.ambiance}${c.pourquoi ? ` ${c.pourquoi}` : ''}

Couleurs **${c.intensite === 'vive' ? 'vives (le concept s’y prête)' : 'douces, pas agressives'}**, fond clair et calme. Les valeurs sont dans
\`public/univers.css\` ; les écrans n’utilisent que ces jetons, à travers les classes de \`charte.css\` et \`socle.css\`.

## Palette

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Couleur principale (barre, \`theme-color\`) | \`--primaire\` | ${coul('primaire')} |
| Accent (boutons, liens, onglet actif) | \`--accent\` | ${coul('accent')} |
| Fond / cartes | \`--fond\` / \`--carte\` | ${coul('fond')} / ${coul('carte')} |
| Texte / texte doux | \`--texte\` / \`--doux\` | ${coul('texte')} / ${coul('doux')} |
| Teinte claire (pastilles, survols, onglet actif) | \`--teinte\` | ${coul('teinte')} |
| Couleurs d’appoint (catégories, illustrations) | \`--couleur-2\` / \`--couleur-3\` | ${coul('couleur-2')} / ${coul('couleur-3')} |

Tous les textes sont à 4,5:1 au moins sur leur fond (contrôlé par \`node outils/verifier-app.js\`, règle 24).

## Typographie, formes, mouvement

- Titres : ${UV.POLICES[c.polices[0]].label.toLowerCase()} ; texte : ${UV.POLICES[c.polices[1]].label.toLowerCase()} (${j['t-normal']}).
- Formes : ${UV.FORMES[c.formes].label.toLowerCase()} ; ombres : ${UV.OMBRES[c.ombre].toLowerCase()} ; densité : ${UV.DENSITES[c.densite].label.toLowerCase()}.
- Motif de la barre et de l’accueil : ${UV.MOTIFS[c.motif].label.toLowerCase()}${c.motifFond ? ' (aussi en filigrane sur le fond)' : ''}.
- Mouvement : ${UV.MOUVEMENTS[c.mouvement].label.toLowerCase()} (${j.duree}) ; tout s’arrête si l’appareil demande moins d’animations.

## Pour les écrans

- **Icônes** : ${b.icones} Une seule famille dans toute l’app, en SVG dans \`public/icones/\`, couleur \`currentColor\`.
- **Illustrations** : ${b.images} L’illustration des écrans vides vient de \`--illustration\` (classe \`vide\` ou \`illustration\`) ;
  une illustration propre à l’app se range dans \`public/illustrations/\` et reprend la palette ci-dessus.
- **Ton des textes** : ${b.ton}
- Classes utiles : \`carte\`, \`carte-teinte\`, \`carte-cliquable\`, \`btn\`, \`btn-secondaire\`, \`btn-discret\`, \`pastille\`, \`pastille-2\`, \`pastille-3\`, \`illustration\`, \`vide\`.
- Interdit : couleur, police ou ombre écrite en dur dans les écrans (règle 24), police chargée depuis un CDN (bloquée par la CSP).
`;
  };

  /** Section « Univers graphique » du prompt. dossier : où sont univers.css et UNIVERS.md dans ce qu'on joint. */
  UV.section = function (choix, j, dossier) {
    const c = UV.normaliser(choix), b = UV.BASES[c.base], d = dossier || 'identite/';
    return [`### Univers graphique : ${c.titre || b.nom}`, '',
      `- Ambiance : ${b.ambiance}${c.pourquoi ? ' ' + c.pourquoi : ''}`,
      `- Couleurs ${c.intensite === 'vive' ? 'vives (le concept s’y prête)' : 'douces, pas agressives'} : principale \`${j.primaire}\`, accent \`${j.accent}\`, fond \`${j.fond}\`. \`theme-color\` = \`${j.primaire}\`.`,
      `- Titres ${UV.POLICES[c.polices[0]].label.toLowerCase()}, texte ${UV.POLICES[c.polices[1]].label.toLowerCase()} ; formes ${UV.FORMES[c.formes].label.toLowerCase()} ; motif ${UV.MOTIFS[c.motif].label.toLowerCase()} ; mouvement ${UV.MOUVEMENTS[c.mouvement].label.toLowerCase()}.`,
      `- Je joins \`${d}univers.css\` (à copier tel quel dans \`public/univers.css\`) et \`${d}UNIVERS.md\` (direction artistique : icônes, illustrations, ton des textes) : suis-les dans tous les écrans.`,
      `- Le socle de qualité ne change pas : contrastes 4,5:1, texte à 16 px, boutons de 44 px, animations courtes et coupées si l’appareil le demande.`].join('\n');
  };

  /* ======================= Propositions par Claude ======================= */

  UV.FORMAT = `"univers": [{"titre": "nom de l'ambiance", "base": "<id>", "intensite": "douce | vive", "teintes": {"primaire": "#RRGGBB", "accent": "#RRGGBB"},
   "polices": ["<titres>", "<texte>"], "formes": "<id>", "motif": "<id>", "illustration": "<id>", "pourquoi": "en une phrase, pourquoi cet univers colle au besoin"}]`;
  UV.REGLES = () => `Univers graphique : une ambiance propre à l'app, déduite de son besoin et de ses utilisateurs. Couleurs DOUCES par défaut (pas agressives) ; "vive" seulement si le concept s'y prête (enfants, jeu, sport, fête). Les contrastes sont corrigés par l'Atelier.
Bases (id) : ${Object.entries(UV.BASES).map(([id, b]) => `${id} (${b.nom.toLowerCase()})`).join(', ')}.
Polices : titres parmi ${Object.keys(UV.POLICES).join(', ')} ; texte parmi ${Object.keys(UV.POLICES).filter(k => !UV.POLICES[k].titresSeulement).join(', ')}.
Formes : ${Object.keys(UV.FORMES).join(', ')}. Motifs : ${Object.keys(UV.MOTIFS).join(', ')}. Illustrations : ${Object.keys(UV.ILLUSTRATIONS).join(', ')}.`;

  /* ======================= Aperçu ======================= */

  /** Page d'aperçu (iframe srcdoc) : un écran type de l'app avec les vrais charte.css et socle.css du kit. */
  UV.page = function (o) {
    const j = o.jetons;
    const varsCss = ':root {\n' + Object.entries(j).map(([k, v]) => `  --${k}: ${v};`).join('\n') + '\n}';
    const nom = String(o.nom || 'Mon app').replace(/[<>&]/g, '');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${varsCss}\n${o.charte || ''}\n${o.socle || ''}\nbody{min-height:100vh} .vue{padding-bottom:96px}</style></head><body class="avec-onglets">
<header class="barre"><span class="barre-titre">${nom}</span><button class="barre-compte">Compte</button></header>
<main class="vue"><h1>Bonjour Camille</h1>
<div class="carte carte-teinte"><div class="ligne"><span class="pousse"><strong>3 choses aujourd’hui</strong><br><span class="doux">La prochaine dans 2 heures</span></span><span class="pastille">Nouveau</span></div></div>
<h2>À venir</h2>
<ul class="liste carte"><li class="ligne"><span class="pousse"><strong>Premier élément</strong><br><span class="doux">Mardi 4 novembre · 14 h 30</span></span><span class="pastille pastille-2">Prévu</span></li>
<li class="ligne"><span class="pousse"><strong>Deuxième élément</strong><br><span class="doux">Jeudi 6 novembre</span></span><span class="pastille pastille-3">À faire</span></li></ul>
<form class="carte"><h2>Ajouter</h2><label class="champ"><span>Titre</span><input value="Exemple"></label>
<div class="actions"><button class="btn" type="button">Enregistrer</button><button class="btn btn-secondaire" type="button">Annuler</button></div></form>
<div class="carte"><p class="vide">Rien d’autre pour l’instant.</p></div></main>
<nav class="onglets"><a aria-current="page" href="#">Accueil</a><a href="#">Liste</a><a href="#">Stats</a><a href="#">Compte</a></nav></body></html>`;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = UV;
  if (racine && racine.AB) racine.AB.univers = UV;
})(typeof window !== 'undefined' ? window : null);
