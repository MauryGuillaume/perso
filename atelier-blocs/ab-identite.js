/* ==========================================================================
   ab-identite.js — nom et logo de chaque nouvelle app
   À chaque création (Nouvelle app, « Créer cette app » de la veille, Prompt et pack),
   l'Atelier propose plusieurs noms et plusieurs logos :
   - tout de suite, sans IA : noms dérivés des mots de la description, logos dessinés
     à partir d'une bibliothèque de symboles et de palettes ;
   - avec Claude (serveur local et sa clé, sinon prompt à copier) : noms plus inventifs,
     logos choisis ou dessinés en SVG ;
   - en discutant avec Claude : ses réponses contiennent des propositions à adopter d'un clic.
   Le choix ajoute une section « Identité » au prompt et les icônes (icone.svg, icone-512.png,
   icone-192.png, icone-180.png) au ZIP à joindre.
   État d'une identité (gardé dans le brouillon de la vue) :
   { propositions: { noms: [], logos: [], source: 'auto' | 'claude', graine }, nom, accroche, logo }
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const I = AB.identite = {};

  /* ======================= Palettes et symboles ======================= */

  I.PALETTES = {
    canard: { principale: '#0F766E', claire: '#14B8A6', accent: '#F59E0B' },
    nuit: { principale: '#1E3A8A', claire: '#3B82F6', accent: '#F97316' },
    violet: { principale: '#6D28D9', claire: '#A78BFA', accent: '#FBBF24' },
    framboise: { principale: '#BE185D', claire: '#F472B6', accent: '#FDE68A' },
    foret: { principale: '#166534', claire: '#22C55E', accent: '#FACC15' },
    corail: { principale: '#C2410C', claire: '#FB923C', accent: '#0EA5E9' },
    ardoise: { principale: '#1F2937', claire: '#4B5563', accent: '#22D3EE' },
    ocean: { principale: '#0369A1', claire: '#38BDF8', accent: '#FB7185' },
    prune: { principale: '#7E22CE', claire: '#C084FC', accent: '#34D399' },
    rubis: { principale: '#B91C1C', claire: '#F87171', accent: '#FCD34D' },
    olive: { principale: '#4D7C0F', claire: '#84CC16', accent: '#F97316' },
    indigo: { principale: '#4338CA', claire: '#818CF8', accent: '#F472B6' }
  };

  /* Chaque symbole est dessiné dans un carré 0..100 : c = couleur du symbole, f = couleur des détails (celle du fond). */
  const etoile = (n, r1, r2) => { const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = Math.PI * i / n - Math.PI / 2; p.push(`${(50 + r * Math.cos(a)).toFixed(1)} ${(52 + r * Math.sin(a)).toFixed(1)}`); } return 'M' + p.join(' L') + ' Z'; };
  const SYMBOLES = {
    bouclier: { label: 'Bouclier', d: (c, f) => `<path d="M50 6 L88 20 V46 C88 70 72 87 50 96 C28 87 12 70 12 46 V20 Z" fill="${c}"/><path d="M33 50 L45 62 L68 38" fill="none" stroke="${f}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
      mots: /garanti|protec|secur|surete|assuran|fiable|confian|sauvegard|coffre|sav\b/ },
    ticket: { label: 'Ticket', d: (c, f) => `<path d="M18 6 H82 V94 L74 88 L66 94 L58 88 L50 94 L42 88 L34 94 L26 88 L18 94 Z" fill="${c}"/><rect x="30" y="24" width="40" height="7" rx="3.5" fill="${f}"/><rect x="30" y="40" width="40" height="7" rx="3.5" fill="${f}"/><rect x="30" y="56" width="24" height="7" rx="3.5" fill="${f}"/>`,
      mots: /ticket|facture|recu\b|caisse|achat|justificati|depense|note de frais/ },
    coche: { label: 'Coche', d: c => `<path d="M14 52 L38 76 L86 26" fill="none" stroke="${c}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`,
      mots: /tache|habitude|todo|liste|objectif|valid|routine|check|faire/ },
    feuille: { label: 'Feuille', d: (c, f) => `<path d="M16 84 C16 42 42 14 88 12 C86 58 62 84 18 86 Z" fill="${c}"/><path d="M22 80 L64 38" stroke="${f}" stroke-width="5" stroke-linecap="round"/>`,
      mots: /feuille|nature|ecolo|vert|bio\b|durable|climat|carbone|recycl/ },
    pousse: { label: 'Pousse', d: c => `<path d="M50 94 V50" stroke="${c}" stroke-width="9" stroke-linecap="round"/><path d="M50 58 C28 58 14 46 12 22 C36 22 50 36 50 58 Z" fill="${c}"/><path d="M50 50 C52 26 66 12 90 12 C90 36 74 50 50 50 Z" fill="${c}"/>`,
      mots: /plante|jardin|potager|arros|graine|pousse|fleur|botani|semis/ },
    goutte: { label: 'Goutte', d: (c, f) => `<path d="M50 6 C66 30 80 46 80 63 A30 30 0 0 1 20 63 C20 46 34 30 50 6 Z" fill="${c}"/><path d="M36 64 A14 14 0 0 0 48 78" fill="none" stroke="${f}" stroke-width="6" stroke-linecap="round"/>`,
      mots: /\beau\b|hydrat|boire|pluie|piscine|aqua|fuite/ },
    nuage: { label: 'Nuage', d: c => `<path d="M26 80 A20 20 0 0 1 22 41 A26 26 0 0 1 71 30 A22 22 0 0 1 78 80 Z" fill="${c}"/>`,
      mots: /meteo|nuage|ciel|temps qu|cloud|previsi/ },
    soleil: { label: 'Soleil', d: c => `<circle cx="50" cy="50" r="21" fill="${c}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => { const r = a * Math.PI / 180; return `<path d="M${(50 + 32 * Math.cos(r)).toFixed(1)} ${(50 + 32 * Math.sin(r)).toFixed(1)} L${(50 + 44 * Math.cos(r)).toFixed(1)} ${(50 + 44 * Math.sin(r)).toFixed(1)}" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`; }).join('')}`,
      mots: /soleil|ete\b|vacance|solaire|matin|uv\b|plage/ },
    lune: { label: 'Lune', d: c => `<path d="M62 8 A42 42 0 1 0 92 68 A34 34 0 1 1 62 8 Z" fill="${c}"/>`,
      mots: /sommeil|dormir|nuit|reve|dodo|sieste|lune|relax|medit/ },
    eclair: { label: 'Éclair', d: c => `<path d="M58 4 L18 56 H46 L40 96 L82 40 H54 Z" fill="${c}"/>`,
      mots: /energie|electri|rapide|vite|batterie|charge|flash|instant|puissan/ },
    coeur: { label: 'Cœur', d: c => `<path d="M50 90 C20 68 6 52 6 34 A22 22 0 0 1 50 24 A22 22 0 0 1 94 34 C94 52 80 68 50 90 Z" fill="${c}"/>`,
      mots: /sante|coeur|amour|bien.?etre|soin|don\b|benevol|famille|rencontre|couple/ },
    etoile: { label: 'Étoile', d: c => `<path d="${etoile(5, 46, 20)}" fill="${c}" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`,
      mots: /favori|etoile|avis|note\b|classement|meilleur|star|recompens|fidelit/ },
    etincelle: { label: 'Étincelle', d: c => `<path d="M46 6 C50 36 60 46 90 50 C60 54 50 64 46 94 C42 64 32 54 4 50 C32 46 42 36 46 6 Z" fill="${c}"/><path d="M80 8 C81 16 84 19 92 20 C84 21 81 24 80 32 C79 24 76 21 68 20 C76 19 79 16 80 8 Z" fill="${c}"/>`,
      mots: /\bia\b|intelligen|magi|automati|assistant|genere|suggest|idee/ },
    horloge: { label: 'Horloge', d: (c, f) => `<circle cx="50" cy="50" r="42" fill="${c}"/><path d="M50 24 V50 L68 61" fill="none" stroke="${f}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
      mots: /minut|chrono|horaire|heure|temps|rappel|delai|duree|pointage|retard/ },
    calendrier: { label: 'Calendrier', d: (c, f) => `<rect x="10" y="16" width="80" height="76" rx="12" fill="${c}"/><rect x="10" y="34" width="80" height="6" fill="${f}"/><rect x="26" y="6" width="9" height="20" rx="4.5" fill="${c}" stroke="${f}" stroke-width="3"/><rect x="65" y="6" width="9" height="20" rx="4.5" fill="${c}" stroke="${f}" stroke-width="3"/>${[[24, 50], [44, 50], [64, 50], [24, 68], [44, 68]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="11" rx="2.5" fill="${f}"/>`).join('')}`,
      mots: /agenda|calendrier|rendez|planning|reserv|evenement|echeance|date|semaine|mois/ },
    bulle: { label: 'Bulle', d: (c, f) => `<path d="M22 10 H78 A14 14 0 0 1 92 24 V58 A14 14 0 0 1 78 72 H44 L22 92 V72 A14 14 0 0 1 8 58 V24 A14 14 0 0 1 22 10 Z" fill="${c}"/>${[30, 50, 70].map(x => `<circle cx="${x}" cy="41" r="6" fill="${f}"/>`).join('')}`,
      mots: /message|discut|chat\b|conversa|social|communaut|entraide|avis|forum/ },
    maison: { label: 'Maison', d: (c, f) => `<path d="M50 8 L94 46 H82 V92 H18 V46 H6 Z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><rect x="41" y="62" width="18" height="30" rx="3" fill="${f}"/>`,
      mots: /maison|logement|foyer|immobili|domicile|colocat|location|travaux|bricol|demenag/ },
    epingle: { label: 'Repère', d: (c, f) => `<path d="M50 96 C30 68 16 54 16 37 A34 34 0 0 1 84 37 C84 54 70 68 50 96 Z" fill="${c}"/><circle cx="50" cy="37" r="13" fill="${f}"/>`,
      mots: /carte|lieu|adresse|station|trajet|itinerai|proche|autour|localis|gps|quartier|ville/ },
    avion: { label: 'Avion en papier', d: (c, f) => `<path d="M6 46 L94 8 L68 92 L48 60 Z" fill="${c}" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M48 60 L94 8" stroke="${f}" stroke-width="5" stroke-linecap="round"/>`,
      mots: /voyage|vol\b|envoi|envoy|partag|courrier|mail|transfert|vacance/ },
    photo: { label: 'Appareil photo', d: (c, f) => `<rect x="6" y="26" width="88" height="62" rx="12" fill="${c}"/><rect x="32" y="14" width="36" height="18" rx="5" fill="${c}"/><circle cx="50" cy="57" r="19" fill="${f}"/><circle cx="50" cy="57" r="10" fill="${c}"/>`,
      mots: /photo|scan|camera|image|album|selfie|souvenir/ },
    piece: { label: 'Pièce', d: (c, f) => `<circle cx="50" cy="50" r="44" fill="${c}"/><circle cx="50" cy="50" r="33" fill="none" stroke="${f}" stroke-width="5"/><path d="M62 34 A18 18 0 1 0 62 66 M30 45 H56 M30 55 H56" fill="none" stroke="${f}" stroke-width="7" stroke-linecap="round"/>`,
      mots: /argent|budget|prix|euro|economi|banque|epargne|paiement|payer|cout|remboursement|compte commun|monnaie|finance/ },
    panier: { label: 'Panier', d: (c, f) => `<path d="M30 36 L44 10 M70 36 L56 10" stroke="${c}" stroke-width="8" stroke-linecap="round"/><path d="M6 34 H94 L82 88 H18 Z" fill="${c}" stroke="${c}" stroke-width="4" stroke-linejoin="round"/><path d="M36 50 V74 M50 50 V74 M64 50 V74" stroke="${f}" stroke-width="6" stroke-linecap="round"/>`,
      mots: /course|panier|magasin|boutique|shopping|marche|vente|commande|epicer|liste de/ },
    couverts: { label: 'Couverts', d: c => `<path d="M24 8 V34 A10 10 0 0 0 44 34 V8 M34 8 V92" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 92 V8 C84 18 88 40 80 54 H70" fill="${c}" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
      mots: /recette|cuisine|repas|menu|restaurant|aliment|manger|nutrit|frigo|plat\b|gaspill/ },
    livre: { label: 'Livre', d: (c, f) => `<path d="M50 20 C38 12 22 10 6 12 V82 C22 80 38 82 50 90 C62 82 78 80 94 82 V12 C78 10 62 12 50 20 Z" fill="${c}"/><path d="M50 22 V88" stroke="${f}" stroke-width="4"/>`,
      mots: /livre|lecture|apprend|cours|ecole|etud|revis|langue|savoir|biblio|devoir|quiz/ },
    note: { label: 'Note de musique', d: c => `<path d="M38 76 V20 L86 10 V64" fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round"/><circle cx="26" cy="76" r="14" fill="${c}"/><circle cx="74" cy="66" r="14" fill="${c}"/><path d="M38 34 L86 24" stroke="${c}" stroke-width="10"/>`,
      mots: /musique|son\b|chanson|playlist|audio|podcast|radio|karaoke|instrument|accord/ },
    haltere: { label: 'Haltère', d: c => `<rect x="6" y="36" width="12" height="28" rx="4" fill="${c}"/><rect x="20" y="24" width="14" height="52" rx="5" fill="${c}"/><rect x="34" y="45" width="32" height="10" fill="${c}"/><rect x="66" y="24" width="14" height="52" rx="5" fill="${c}"/><rect x="82" y="36" width="12" height="28" rx="4" fill="${c}"/>`,
      mots: /sport|muscu|fitness|entrain|seance|exercice|gym|course a pied|running|coach/ },
    patte: { label: 'Patte', d: c => `<ellipse cx="50" cy="68" rx="24" ry="20" fill="${c}"/><ellipse cx="22" cy="42" rx="10" ry="13" fill="${c}"/><ellipse cx="40" cy="24" rx="10" ry="13" fill="${c}"/><ellipse cx="60" cy="24" rx="10" ry="13" fill="${c}"/><ellipse cx="78" cy="42" rx="10" ry="13" fill="${c}"/>`,
      mots: /animal|animaux|chien|chat\b|veterin|compagnon|croquette|pet\b/ },
    cadenas: { label: 'Cadenas', d: (c, f) => `<path d="M30 44 V30 A20 20 0 0 1 70 30 V44" fill="none" stroke="${c}" stroke-width="10"/><rect x="14" y="42" width="72" height="52" rx="10" fill="${c}"/><circle cx="50" cy="62" r="8" fill="${f}"/><rect x="46" y="64" width="8" height="16" rx="3" fill="${f}"/>`,
      mots: /mot de passe|secret|prive|chiffr|confidentiel|verrou|acces|identifiant/ },
    loupe: { label: 'Loupe', d: c => `<circle cx="42" cy="42" r="28" fill="none" stroke="${c}" stroke-width="11"/><path d="M63 63 L88 88" stroke="${c}" stroke-width="14" stroke-linecap="round"/>`,
      mots: /recherch|trouver|compar|chercher|explor|enquete|verifi|detect|analyse/ },
    graphique: { label: 'Graphique', d: c => `<rect x="10" y="56" width="20" height="36" rx="5" fill="${c}"/><rect x="40" y="34" width="20" height="58" rx="5" fill="${c}"/><rect x="70" y="10" width="20" height="82" rx="5" fill="${c}"/>`,
      mots: /statist|suivi|consommation|progress|tableau de bord|graphi|mesure|releve|evolution|bilan/ },
    dossier: { label: 'Dossier', d: (c, f) => `<path d="M6 22 A8 8 0 0 1 14 14 H38 L48 26 H86 A8 8 0 0 1 94 34 V80 A8 8 0 0 1 86 88 H14 A8 8 0 0 1 6 80 Z" fill="${c}"/><rect x="6" y="36" width="88" height="5" fill="${f}"/>`,
      mots: /document|dossier|fichier|archive|classe|ranger|papier|administratif|stocke/ },
    voiture: { label: 'Voiture', d: (c, f) => `<path d="M8 66 V52 L22 30 A8 8 0 0 1 29 26 H71 A8 8 0 0 1 78 30 L92 52 V66 A6 6 0 0 1 86 72 H14 A6 6 0 0 1 8 66 Z" fill="${c}"/><path d="M26 48 L33 36 H67 L74 48 Z" fill="${f}"/><circle cx="28" cy="74" r="11" fill="${c}" stroke="${f}" stroke-width="5"/><circle cx="72" cy="74" r="11" fill="${c}" stroke="${f}" stroke-width="5"/>`,
      mots: /voiture|auto\b|carbur|essence|garage|vehicul|parking|conduite|permis|covoit/ },
    de: { label: 'Dé', d: (c, f) => `<rect x="10" y="10" width="80" height="80" rx="18" fill="${c}"/>${[[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${f}"/>`).join('')}`,
      mots: /jeu|hasard|tirage|\bdes\b|partie|ludique|defi|pari|equipe/ },
    personnes: { label: 'Personnes', d: c => `<circle cx="34" cy="30" r="15" fill="${c}"/><path d="M8 88 C8 64 20 52 34 52 C48 52 60 64 60 88 Z" fill="${c}"/><circle cx="68" cy="34" r="13" fill="${c}" opacity=".75"/><path d="M58 56 C62 54 65 54 68 54 C82 54 92 66 92 88 H64 C64 74 62 64 58 56 Z" fill="${c}" opacity=".75"/>`,
      mots: /groupe|ami|equipe|partage|famille|invite|membre|ensemble|collectif|voisin/ },
    cible: { label: 'Cible', d: (c, f) => `<circle cx="50" cy="50" r="44" fill="${c}"/><circle cx="50" cy="50" r="30" fill="${f}"/><circle cx="50" cy="50" r="17" fill="${c}"/>`,
      mots: /objectif|but\b|cible|defi|precis|focus|concentr|productiv/ },
    cloche: { label: 'Cloche', d: c => `<path d="M50 8 A6 6 0 0 1 56 14 V16 C70 20 78 32 78 48 V64 L88 76 H12 L22 64 V48 C22 32 30 20 44 16 V14 A6 6 0 0 1 50 8 Z" fill="${c}"/><path d="M40 82 A10 10 0 0 0 60 82 Z" fill="${c}"/>`,
      mots: /alerte|notif|rappel|alarme|prevenir|avertir|reveil/ }
  };
  I.SYMBOLES = SYMBOLES;
  I.STYLES = { plein: 'Symbole sur dégradé', badge: 'Symbole et pastille', monogramme: 'Initiale', pastille: 'Rond clair', accent: 'Fond sombre' };

  const PALETTE_DES = {
    canard: /garanti|sante|soin|coffre|eau|piscine/, foret: /plante|jardin|nature|ecolo|argent|epargne|bio\b/, ocean: /meteo|eau|voyage|mer|ciel|pluie/,
    nuit: /sommeil|nuit|banque|finance|administratif|document/, corail: /recette|cuisine|repas|aliment|sport/, rubis: /sport|alerte|urgence|course/,
    violet: /jeu|ia\b|intelligen|musique|magi|fete/, framboise: /amour|rencontre|beaute|mode|cadeau/, ardoise: /secur|mot de passe|outil|pro\b/,
    olive: /potager|graine|recycl|durable/, prune: /lecture|apprend|langue|medit/, indigo: /statist|suivi|budget|productiv|etud/
  };

  /* ======================= Outils ======================= */

  const sansAccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const HEX = /^#[0-9a-f]{6}$/i;
  function hasard(graine) { let x = (Math.abs(graine) % 2147483646) + 1; return () => (x = x * 16807 % 2147483647) / 2147483647; }
  function hash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function melange(t, r) { const a = t.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function assombrir(hex, k) {
    const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const couleurs = c => {
    const p = Object.assign({}, I.PALETTES.canard, c || {});
    ['principale', 'claire', 'accent'].forEach(k => { if (!HEX.test(p[k])) p[k] = I.PALETTES.canard[k]; });
    return p;
  };

  /* ======================= Dessin des logos ======================= */

  /** Place un symbole (carré 0..100) dans un carré de côté t à (x, y). */
  const placer = (id, x, y, t, c, f) => { const s = SYMBOLES[id] || SYMBOLES.etoile; return `<g transform="translate(${x} ${y}) scale(${t / 100})">${s.d(c, f)}</g>`; };

  /**
   * SVG d'un logo. logo : { style, symbole, symbole2, couleurs, lettre } ou { svg } (dessiné par Claude).
   * opts.carre : coins droits (icônes PNG, que les systèmes arrondissent eux-mêmes).
   */
  I.svg = function (logo, opts) {
    opts = opts || {};
    if (!logo) return '';
    if (logo.svg) return logo.svg;
    const p = couleurs(logo.couleurs), rx = opts.carre ? 0 : 112;
    const id = 'g' + hash(JSON.stringify(logo)).toString(36);
    const degrade = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.claire}"/><stop offset="1" stop-color="${p.principale}"/></linearGradient></defs>`;
    const fondDegrade = `<rect width="512" height="512" rx="${rx}" fill="url(#${id})"/>`;
    let corps = '';
    switch (logo.style) {
      case 'badge':
        corps = fondDegrade + placer(logo.symbole, 70, 66, 270, '#FFFFFF', p.principale)
          + `<circle cx="366" cy="366" r="100" fill="${p.accent}" stroke="${p.principale}" stroke-width="16"/>`
          + placer(logo.symbole2 || 'coche', 310, 310, 112, '#FFFFFF', p.accent);
        break;
      case 'monogramme': {
        const l = esc(String(logo.lettre || 'A').charAt(0).toUpperCase());
        corps = fondDegrade + `<text x="256" y="262" text-anchor="middle" dominant-baseline="central" font-family="Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="300" fill="#FFFFFF">${l}</text>`
          + `<circle cx="384" cy="128" r="44" fill="${p.accent}"/>`;
        break;
      }
      case 'pastille':
        corps = `<rect width="512" height="512" rx="${rx}" fill="${p.principale}"/><circle cx="256" cy="256" r="178" fill="#FFFFFF"/>`
          + placer(logo.symbole, 136, 136, 240, p.principale, '#FFFFFF') + `<circle cx="392" cy="120" r="40" fill="${p.accent}" stroke="${p.principale}" stroke-width="12"/>`;
        break;
      case 'accent': {
        const sombre = assombrir(p.principale, 0.55);
        corps = `<rect width="512" height="512" rx="${rx}" fill="${sombre}"/>` + placer(logo.symbole, 106, 106, 300, p.accent, sombre);
        break;
      }
      default:
        corps = fondDegrade + placer(logo.symbole, 106, 106, 300, '#FFFFFF', p.principale);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${logo.style === 'pastille' || logo.style === 'accent' ? '' : degrade}${corps}</svg>`;
  };

  /** Adresse data: d'un SVG, pour <img> (une image n'exécute jamais de script). */
  I.url = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  /** Nettoie un SVG écrit par Claude : pas de script, d'événement, de lien externe ni d'objet étranger. Renvoie '' s'il est illisible. */
  I.nettoyerSvg = function (texte) {
    const src = String(texte || '').trim();
    if (!/^<svg[\s>]/i.test(src) || src.length > 20000) return '';
    const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
    const racine = doc.documentElement;
    if (!racine || racine.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return '';
    const PERMIS = new Set(['svg', 'g', 'defs', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'text', 'tspan', 'title', 'use', 'filter', 'fegaussianblur', 'feoffset', 'feblend', 'feflood', 'fecomposite', 'femerge', 'femergenode', 'fedropshadow']);
    [...racine.querySelectorAll('*')].forEach(el => {
      if (!PERMIS.has(el.nodeName.toLowerCase())) { el.remove(); return; }
      [...el.attributes].forEach(a => {
        const n = a.name.toLowerCase(), v = a.value;
        if (n.startsWith('on') || ((n === 'href' || n === 'xlink:href') && !v.startsWith('#')) || /url\(\s*['"]?(?!#)/i.test(v) || /javascript:/i.test(v)) el.removeAttribute(a.name);
      });
    });
    [...racine.attributes].forEach(a => { if (a.name.toLowerCase().startsWith('on')) racine.removeAttribute(a.name); });
    racine.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!racine.getAttribute('viewBox')) racine.setAttribute('viewBox', `0 0 ${parseFloat(racine.getAttribute('width')) || 512} ${parseFloat(racine.getAttribute('height')) || 512}`);
    racine.setAttribute('width', '512'); racine.setAttribute('height', '512');
    return new XMLSerializer().serializeToString(racine);
  };

  /** PNG (octets) d'un logo, côté × côté, sur fond plein (les icônes iOS refusent la transparence). */
  I.png = async function (logo, cote) {
    const svg = I.svg(logo, { carre: true });
    const img = new Image();
    img.src = I.url(svg);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = cote;
    const x = c.getContext('2d');
    x.fillStyle = couleurs(logo.couleurs).principale;
    x.fillRect(0, 0, cote, cote);
    x.drawImage(img, 0, 0, cote, cote);
    return new Promise((ok, ko) => c.toBlob(b => b ? b.arrayBuffer().then(a => ok(new Uint8Array(a))) : ko(new Error('Image impossible')), 'image/png'));
  };

  /** Les 4 icônes, pour un ZIP : { prefixe + 'icone.svg': …, …-512, -192, -180 }. */
  I.fichiers = async function (logo, prefixe) {
    prefixe = prefixe || '';
    const out = { [prefixe + 'icone.svg']: I.svg(logo) };
    for (const t of [512, 192, 180]) out[`${prefixe}icone-${t}.png`] = await I.png(logo, t);
    return out;
  };

  /* ======================= Propositions sans IA ======================= */

  const VIDES = new Set(('pour avec sans dans des les une aux par sur est son ses leur leurs qui que quoi quand chaque tout tous toute toutes plus moins elle ils elles nous vous mon ton notre votre '
    + 'app application appli utilisateur utilisateurs permet permettre fait faire peut peuvent etre avoir entre comme simple simplement aussi encore apres avant ainsi donc mais tres bien '
    + 'jour jours fois version premiere ecran ecrans donnees role roles fiche compte comptes ajout ajoute ajouter selon depuis vers chez cette ceci cela celui celle grace '
    + 'fonctionnalites prevues fonctionnalite services externes points attention connexion inscription admin gere gerer liste lister type types mode moyen sont sera ont '
    + 'french francais france public grand gratuit gratuite calcule envoie recoit reste autre autres meme part partir lors deux trois quatre premier').split(' '));

  /** Mots clés de l'app (forme sans accent et forme d'origine), les plus parlants d'abord. */
  I.motsCles = function (texte) {
    const t = String(texte || '');
    const scores = new Map();
    let pos = 0;
    for (const m of t.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿœŒ’']+/g)) {
      const brut = m[0].replace(/^[a-z]’|^[a-z]'/i, '');
      const s = sansAccent(brut).replace(/œ/g, 'oe');
      pos++;
      if (s.length < 4 || VIDES.has(s)) continue;
      const cle = s.replace(/(s|x)$/, '');
      const x = scores.get(cle) || { cle, mot: brut.toLowerCase().replace(/(s|x)$/, ''), n: 0 };
      x.n += 1 + (pos < 25 ? 1.5 : 0) + (s.length > 6 ? 0.3 : 0);
      scores.set(cle, x);
    }
    return [...scores.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  };

  /** Racine courte d'un mot : « garantie » → « garant », « calculatrice » → « calcul ». */
  function racine(mot) {
    let r = mot.replace(/(trice|teur|tion|ment|ique|ette|euse|eur|age|ure|ie|ee|e|s)$/, '');
    if (r.length < 3) r = mot;
    if (r.length > 7) r = r.slice(0, 6).replace(/[aeiouy]+$/, '');
    return r;
  }
  const prononcable = n => n.length >= 4 && n.length <= 11 && !/[^aeiouy]{4}|[aeiouy]{3}|(.)\1\1/.test(sansAccent(n));

  /** Noms, accroches et logos proposés sans IA, à partir du nom, de l'accroche et de la description. */
  I.proposerLocal = function (ctx, graine) {
    ctx = ctx || {};
    const r = hasard(hash((ctx.description || '') + (ctx.nom || '')) + (graine || 0) * 977);
    // Les mots du nom de travail comptent double : ils disent le plus souvent ce qu'est l'app
    const texte = [ctx.nom, ctx.nom, ctx.accroche, ctx.description].filter(Boolean).join('. ');
    const mots = I.motsCles(texte);
    const m = mots.length ? mots : [{ cle: 'app', mot: 'app' }];
    const racines = [...new Set(m.map(x => racine(x.cle)).filter(x => x.length >= 3))];
    const candidats = [];
    const ajouter = (nom, pourquoi) => { nom = cap(nom); if (prononcable(nom) && !candidats.some(c => sansAccent(c.nom) === sansAccent(nom))) candidats.push({ nom, pourquoi }); };
    const finConsonne = s => !/[aeiouy]$/.test(s);
    melange(racines.slice(0, 4), r).forEach((ra, i) => {
      const suffixes = finConsonne(ra) ? melange(['o', 'io', 'ly', 'a', 'ix', 'eo', 'is'], r) : melange(['ly', 'o', 'z', 'x', 'na', 'lo'], r);
      suffixes.slice(0, 2 + (i === 0)).forEach(s => ajouter(ra + s, `Dérivé de « ${m.find(x => racine(x.cle) === ra).mot} » : court, facile à dire et à retenir.`));
    });
    if (racines.length > 1) {
      // Mot-valise : le début du premier mot (jusqu'à une consonne) et la fin du second (à partir d'une voyelle)
      const [a, b] = melange(racines.slice(0, 4), r);
      const debut = (a.match(/^.*?[aeiouy]+[^aeiouy]/) || [a])[0], j = b.search(/[aeiouy]/);
      if (j > 0 && debut !== a && debut.length + b.length - j <= 8) ajouter(debut + b.slice(j) + (finConsonne(b) ? 'o' : ''), `Mot-valise de « ${a} » et « ${b} ».`);
    }
    if (m[0]) {
      const mot = m[0].mot;
      ajouter('Mon' + cap(mot.replace(/\s+/g, '')), 'Personnel et clair : on comprend tout de suite à quoi sert l’app.');
      ajouter(cap(mot) + 'Facile', 'Descriptif : dit ce que fait l’app et promet la simplicité.');
    }
    const noms = melange(candidats, r).slice(0, 6);
    const pluriel = w => /[sxz]$/.test(w) ? w : /al$/.test(w) ? w.slice(0, -1) + 'ux' : /eau$/.test(w) ? w + 'x' : w + 's';
    const kw = m.slice(0, 2).map(x => pluriel(x.mot));
    const ACCROCHES = [
      kw[1] ? `${cap(kw[0])} et ${kw[1]}, toujours sous la main.` : `${cap(kw[0])}, toujours sous la main.`,
      kw[1] ? `${cap(kw[0])}, ${kw[1]} : tout au même endroit.` : `Tous vos ${kw[0]} au même endroit.`,
      'L’essentiel, en un coup d’œil.',
      'Simple, rapide, toujours avec vous.',
      'Votre quotidien, en plus simple.',
      `${cap(kw[0])} : on s’en occupe.`
    ];
    noms.forEach((n, i) => { n.accroche = ctx.accroche && i === 0 ? ctx.accroche : ACCROCHES[(i + Math.floor(r() * 6)) % ACCROCHES.length]; });
    return { noms, logos: I.logosLocaux(ctx, graine, noms[0] ? noms[0].nom : ctx.nom), source: 'auto', graine: graine || 0 };
  };

  /** Symboles qui parlent de l'app, dans l'ordre. */
  I.symbolesDe = function (texte) {
    const t = sansAccent(texte);
    const trouves = Object.entries(SYMBOLES).map(([id, s]) => ({ id, n: (t.match(new RegExp(s.mots.source, 'g')) || []).length })).filter(x => x.n).sort((a, b) => b.n - a.n).map(x => x.id);
    return trouves.length ? trouves : ['etoile', 'etincelle', 'coche'];
  };

  I.logosLocaux = function (ctx, graine, nom) {
    const r = hasard(hash(ctx.description || '') + (graine || 0) * 131 + 17);
    const texte = sansAccent([ctx.nom, ctx.accroche, ctx.description].join(' '));
    const symboles = I.symbolesDe(texte);
    const palettes = Object.keys(I.PALETTES);
    const parlantes = palettes.filter(p => PALETTE_DES[p].test(texte));
    const ordrePal = melange(parlantes, r).concat(melange(palettes.filter(p => !parlantes.includes(p)), r));
    const styles = melange(['plein', 'badge', 'pastille', 'accent', 'monogramme', 'plein'], r);
    const sym = i => symboles[(i + (graine || 0)) % symboles.length];
    return styles.map((style, i) => {
      const pal = ordrePal[i % ordrePal.length];
      const l = { style, symbole: sym(i), symbole2: style === 'badge' ? (symboles.find(s => s !== sym(i) && ['bouclier', 'coche', 'cloche', 'etoile', 'coeur', 'horloge'].includes(s)) || 'coche') : '', couleurs: Object.assign({}, I.PALETTES[pal]), lettre: (nom || ctx.nom || 'A').charAt(0) };
      l.titre = style === 'monogramme' ? `Initiale « ${l.lettre.toUpperCase()} », ${pal}` : `${SYMBOLES[l.symbole].label}${l.symbole2 ? ' et ' + SYMBOLES[l.symbole2].label.toLowerCase() : ''}, ${pal}`;
      return l;
    });
  };

  /* ======================= Propositions par Claude ======================= */

  const LISTE_SYMBOLES = () => Object.entries(SYMBOLES).map(([id, s]) => `${id} (${s.label.toLowerCase()})`).join(', ');

  /** Format de réponse attendu (utilisé aussi par la discussion). */
  I.FORMAT = `{"noms": [{"nom": "…", "accroche": "une phrase courte", "pourquoi": "d'où vient le nom, en une phrase"}],
 "logos": [{"titre": "…", "style": "plein | badge | monogramme | pastille | accent", "symbole": "<id>", "symbole2": "<id, pour le style badge>", "lettre": "<initiale, pour monogramme>",
   "couleurs": {"principale": "#RRGGBB", "claire": "#RRGGBB", "accent": "#RRGGBB"}, "svg": "<facultatif : SVG complet>"}]}`;
  I.REGLES_LOGO = () => `Logos : un emblème simple, lisible à 48 px, deux ou trois couleurs, sans texte (sauf le style monogramme). Styles : plein (symbole blanc sur dégradé), badge (symbole blanc et pastille ronde de la couleur d'accent avec un second symbole), monogramme (initiale), pastille (symbole coloré dans un rond blanc), accent (symbole couleur d'accent sur fond sombre).
Symboles disponibles (id) : ${LISTE_SYMBOLES()}.
Si aucun symbole ne convient, fournis "svg" : un SVG complet viewBox="0 0 512 512", fond plein en carré arrondi (rx="112"), formes simples (path, rect, circle, dégradés), sans texte, sans image, sans script, moins de 3 000 caractères ; "couleurs" reste obligatoire. Au plus deux logos en svg.`;

  I.systeme = function (ctx, n) {
    return `Tu es un expert du nommage et de l'identité visuelle des apps grand public françaises.
À partir de la description de l'app, propose ${n || 6} noms et 4 logos.
Noms : courts (4 à 10 lettres, un seul mot de préférence), faciles à prononcer en français, mémorables, sans reprendre une marque connue ; varie les approches (mot dérivé comme « Garanto » pour une app de garanties, mot-valise, mot inventé, mot français détourné). Une accroche courte par nom.
${I.REGLES_LOGO()}
Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :
${I.FORMAT}`;
  };
  I.message = ctx => `Nom de travail : ${ctx.nom || '(aucun)'}\n${ctx.accroche ? `Accroche : ${ctx.accroche}\n` : ''}Description :\n${ctx.description || '(vide)'}`;

  /** Normalise une proposition (de Claude ou de la discussion) : { noms, logos } propres. */
  I.normaliser = function (prop) {
    const noms = (Array.isArray(prop && prop.noms) ? prop.noms : []).filter(x => x && String(x.nom || '').trim())
      .map(x => ({ nom: String(x.nom).trim().slice(0, 40), accroche: String(x.accroche || '').trim().slice(0, 160), pourquoi: String(x.pourquoi || '').trim().slice(0, 240) }));
    const logos = (Array.isArray(prop && prop.logos) ? prop.logos : []).map(x => {
      if (!x) return null;
      const l = { titre: String(x.titre || '').slice(0, 80), couleurs: couleurs(x.couleurs) };
      const svg = x.svg ? I.nettoyerSvg(x.svg) : '';
      if (svg) { l.svg = svg; return l; }
      l.style = I.STYLES[x.style] ? x.style : 'plein';
      l.symbole = SYMBOLES[x.symbole] ? x.symbole : 'etoile';
      if (l.style === 'badge') l.symbole2 = SYMBOLES[x.symbole2] ? x.symbole2 : 'coche';
      if (l.style === 'monogramme') l.lettre = String(x.lettre || (noms[0] && noms[0].nom) || 'A').charAt(0);
      if (!l.titre) l.titre = l.style === 'monogramme' ? `Initiale « ${l.lettre} »` : SYMBOLES[l.symbole].label;
      return l;
    }).filter(Boolean);
    return { noms, logos };
  };

  /** Demande des propositions à Claude par le serveur local. */
  I.demander = async function (ctx) {
    const base = await AB.ia.adresse();
    const r = await fetch(base + '/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systeme: I.systeme(ctx), message: I.message(ctx) }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erreur || `Le serveur local a répondu ${r.status}.`);
    return I.normaliser(AB.ia.lireReponse(data.texte));
  };

  /* ======================= Section du prompt ======================= */

  /** Section « Identité » du prompt (vide si rien n'est choisi). dossier : où sont les icônes dans ce qu'on joint. */
  I.section = function (id, nom, dossier) {
    if (!id || (!id.logo && !String(id.accroche || '').trim() && !id.nomChoisi)) return '';
    const out = ['## Identité', ''];
    const acc = String(id.accroche || '').trim();
    out.push(`- Nom affiché : ${nom || id.nomChoisi || '⟦Nom⟧'}.${acc ? ` Accroche : « ${acc.replace(/[«»]/g, '').replace(/[.\s]+$/, '').trim()} ».` : ''}`);
    if (id.logo) {
      const p = couleurs(id.logo.couleurs);
      out.push(`- Couleurs : principale \`${p.principale}\`, claire \`${p.claire}\`, accent \`${p.accent}\`. \`theme-color\` = \`${p.principale}\`.`);
      const d = dossier || 'identite/';
      out.push(`- Logo : je joins \`${d}icone.svg\`, \`${d}icone-512.png\`, \`${d}icone-192.png\`, \`${d}icone-180.png\` ; remplace les icônes du modèle par celles-ci (mêmes noms de fichiers) et reprends ces couleurs dans la charte et le manifeste.`);
    }
    return out.join('\n');
  };

  /** Insère la section avant le premier titre « ## » du prompt (sinon à la fin). */
  I.inserer = function (prompt, section) {
    if (!section) return prompt;
    const lignes = prompt.split('\n');
    const i = lignes.findIndex(l => /^## /.test(l));
    if (i < 0) return prompt.replace(/\s*$/, '') + '\n\n' + section + '\n';
    lignes.splice(i, 0, ...section.split('\n'), '');
    return lignes.join('\n');
  };

  /* ======================= Vue : panneau « Nom et logo » ======================= */

  const carteNom = (n, i, choisi, attr) => `<button type="button" class="id-nom ${choisi ? 'actif' : ''}" ${attr}="${i}" title="${esc(n.pourquoi || '')}"><b>${esc(n.nom)}</b>${n.accroche ? `<span class="small muted">${esc(n.accroche)}</span>` : ''}</button>`;
  const carteLogo = (l, i, choisi, attr) => `<button type="button" class="id-logo ${choisi ? 'actif' : ''}" ${attr}="${i}" title="${esc(l.titre || '')}"><img src="${I.url(I.svg(l))}" alt="${esc(l.titre || 'Logo')}"><span class="small muted">${esc(l.titre || '')}</span></button>`;
  I.carteNom = carteNom; I.carteLogo = carteLogo;

  /** Propositions rendues dans un message de la discussion (boutons data-idn / data-idl pour adopter). */
  I.htmlPropositions = function (prop, base) {
    return `<div class="id-dans-msg">${prop.noms.length ? `<div class="id-noms">${prop.noms.map((n, i) => carteNom(n, base + ':' + i, false, 'data-idn')).join('')}</div>` : ''}
      ${prop.logos.length ? `<div class="id-logos">${prop.logos.map((l, i) => carteLogo(l, base + ':' + i, false, 'data-idl')).join('')}</div>` : ''}
      <div class="small muted">Clique sur un nom ou un logo pour l’adopter.</div></div>`;
  };

  /** Blocs ```identite {…}``` d'une réponse de Claude : { texte sans les blocs, propositions } ; un bloc pas encore fermé est masqué. */
  I.extraire = function (texte) {
    const propositions = [];
    let t = String(texte || '').replace(/```identite\s*\n?([\s\S]*?)```/g, (m, json) => {
      try { const p = I.normaliser(JSON.parse(json.trim())); if (p.noms.length || p.logos.length) { propositions.push(p); return `\n\u0001${propositions.length - 1}\u0001\n`; } } catch (e) { /* bloc illisible : on le laisse tel quel */ }
      return m;
    });
    const enCours = /```identite[\s\S]*$/.test(t);
    t = t.replace(/```identite[\s\S]*$/, '');
    return { texte: t, propositions, enCours };
  };

  /** Contexte et consigne de la discussion « Nom et logo ». */
  I.systemeDiscussion = (ctx, id) => `Tu es Claude, l'assistant de l'Atelier de Blocs. Tu aides son utilisateur, en français, à choisir le nom et le logo de sa future app : tu donnes ton avis franc sur les propositions, tu en proposes d'autres selon ses remarques (plus court, plus sérieux, une autre couleur, un autre symbole…), et tu signales un nom trop proche d'une marque connue.
Noms : courts, faciles à prononcer, mémorables. ${I.REGLES_LOGO()}
Chaque fois que tu proposes des noms ou des logos, termine ta réponse par un bloc de code \`\`\`identite contenant un JSON de la forme
${I.FORMAT}
(seulement les nouvelles propositions, les deux listes peuvent être vides). L'Atelier l'affiche en cartes que l'utilisateur adopte d'un clic. Réponds en Markdown simple et bref.

=== L'app ===
${I.message(ctx)}

=== Propositions actuelles ===
Noms : ${(id.propositions && id.propositions.noms || []).map(n => n.nom).join(', ') || '(aucun)'}
Logos : ${(id.propositions && id.propositions.logos || []).map(l => l.titre).join(' ; ') || '(aucun)'}
Choix actuel : nom « ${ctx.nom || '—'} »${id.accroche ? `, accroche « ${id.accroche} »` : ''}${id.logo ? `, logo ${JSON.stringify(Object.assign({}, id.logo, { svg: id.logo.svg ? '(svg)' : undefined }))}` : ', pas de logo'}.`;

  /**
   * Panneau « Nom et logo » (Nouvelle app, Prompt et pack).
   * opts : { identite (objet modifié en place), contexte() → { nom, accroche, description }, choisirNom(nom), changer() }
   * Renvoie { rafraichir(), demanderClaude() }.
   */
  I.panneau = function (el, opts) {
    const id = opts.identite;
    id.propositions = id.propositions || null;
    let iaEtat = null;
    el.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-palette-swatch-outline"></span>Nom et logo</span><div class="spacer"></div>
        <span id="idEtat"></span></div>
      <div class="panel-body stack">
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <button class="btn btn-outline btn-xs" id="idAutres" title="Nouvelles propositions, sans IA"><span class="mdi mdi-refresh"></span>Autres idées</button>
          <button class="btn btn-outline btn-xs" id="idClaude"><span class="mdi mdi-creation-outline"></span>Proposer avec Claude</button>
          <button class="btn btn-outline btn-xs" id="idDiscuter"><span class="mdi mdi-chat-processing-outline"></span>En discuter avec Claude</button></div>
        <div class="small muted" id="idSource"></div>
        <div><div class="input-label">Noms proposés</div><div class="id-noms" id="idNoms"></div></div>
        <div><div class="input-label">Logos proposés</div><div class="id-logos" id="idLogos"></div></div>
        <div class="id-choix" id="idChoix"></div>
      </div></div>`;
    const q = s => el.querySelector(s);

    const auto = () => { id.propositions = I.proposerLocal(opts.contexte(), (id.propositions && id.propositions.source === 'auto' ? id.propositions.graine : 0)); };

    function dessiner() {
      const p = id.propositions || { noms: [], logos: [] };
      const nom = (opts.contexte().nom || '').trim();
      q('#idSource').innerHTML = p.source === 'claude' ? '<span class="mdi mdi-creation-outline"></span> Propositions de Claude. « Autres idées » repart des propositions automatiques.'
        : 'Propositions automatiques tirées de la description (sans IA). Pour des noms plus inventifs : « Proposer avec Claude ».';
      q('#idNoms').innerHTML = p.noms.map((n, i) => carteNom(n, i, n.nom === nom, 'data-nom')).join('') || '<span class="small muted">Décris l’app pour obtenir des noms.</span>';
      q('#idLogos').innerHTML = p.logos.map((l, i) => carteLogo(l, i, id.logo && JSON.stringify(l) === JSON.stringify(id.logo), 'data-logo')).join('');
      el.querySelectorAll('[data-nom]').forEach(b => b.onclick = () => adopterNom(p.noms[+b.dataset.nom]));
      el.querySelectorAll('[data-logo]').forEach(b => b.onclick = () => adopterLogo(p.logos[+b.dataset.logo]));
      q('#idEtat').innerHTML = id.logo ? '<span class="chip chip-success"><span class="mdi mdi-check"></span>Logo choisi</span>' : '<span class="chip chip-warning">Choisis un nom et un logo</span>';
      const c = id.logo ? couleurs(id.logo.couleurs) : null;
      q('#idChoix').innerHTML = `<div class="input-label">Ton choix (ajouté au prompt, section « Identité »)</div>
        <div class="row" style="gap:12px;align-items:flex-start">
          ${id.logo ? `<img class="id-apercu" src="${I.url(I.svg(id.logo))}" alt="Logo choisi">` : '<div class="id-apercu id-vide"><span class="mdi mdi-image-outline"></span></div>'}
          <div class="stack" style="flex:1;min-width:0;gap:6px">
            <div><b>${esc(nom || 'Nom à choisir')}</b></div>
            <input class="tv-input" id="idAccroche" placeholder="Accroche (une phrase)" value="${esc(id.accroche || '')}">
            ${c ? `<div class="row" style="gap:6px">${['principale', 'claire', 'accent'].map(k => `<label class="id-couleur" title="Couleur ${k}"><input type="color" data-coul="${k}" value="${c[k].toLowerCase()}"><span class="small muted">${k}</span></label>`).join('')}</div>
              <div class="row" style="gap:6px"><button class="btn btn-outline btn-xs" id="idZip"><span class="mdi mdi-download"></span>Logo (.zip)</button><button class="btn btn-ghost btn-xs" id="idRetirer"><span class="mdi mdi-close"></span>Retirer le logo</button></div>` : ''}
          </div></div>`;
      q('#idAccroche').oninput = ev => { id.accroche = ev.target.value; opts.changer(); };
      el.querySelectorAll('[data-coul]').forEach(i => i.oninput = () => { id.logo.couleurs = Object.assign({}, id.logo.couleurs, { [i.dataset.coul]: i.value.toUpperCase() }); q('.id-apercu').src = I.url(I.svg(id.logo)); opts.changer(); });
      el.querySelectorAll('[data-coul]').forEach(i => i.onchange = () => dessiner());
      if (q('#idRetirer')) q('#idRetirer').onclick = () => { id.logo = null; dessiner(); opts.changer(); };
      if (q('#idZip')) q('#idZip').onclick = async () => {
        try { U.download(`logo-${U.slug(nom) || 'app'}.zip`, AB.zip(await I.fichiers(id.logo, ''))); }
        catch (e) { U.toast('error', 'Logo impossible', e.message); }
      };
    }

    function adopterNom(n) {
      if (!n) return;
      id.nomChoisi = n.nom;
      if (n.accroche) id.accroche = n.accroche;
      opts.choisirNom(n.nom);
      // Le monogramme suit l'initiale du nom
      if (id.logo && id.logo.style === 'monogramme') id.logo.lettre = n.nom.charAt(0);
      if (id.propositions) id.propositions.logos.forEach(l => { if (l.style === 'monogramme') { l.lettre = n.nom.charAt(0); l.titre = `Initiale « ${l.lettre.toUpperCase()} »`; } });
      dessiner(); opts.changer();
    }
    function adopterLogo(l) {
      if (!l) return;
      id.logo = U.clone(l);
      dessiner(); opts.changer();
    }

    /** Ajoute des propositions (de Claude ou de la discussion) en tête de liste. */
    function ajouter(p, source) {
      const avant = id.propositions || { noms: [], logos: [] };
      id.propositions = { noms: p.noms.concat(avant.noms.filter(n => !p.noms.some(x => x.nom === n.nom))).slice(0, 12), logos: p.logos.concat(avant.logos).slice(0, 10), source: source || 'claude', graine: avant.graine || 0 };
      dessiner(); opts.changer();
    }

    async function demanderClaude(silencieux) {
      iaEtat = iaEtat || await AB.ia.etat();
      const ctx = opts.contexte();
      if (!String(ctx.description || '').trim()) { if (!silencieux) U.toast('warning', 'Décris d’abord l’app', 'Claude a besoin de la description pour proposer des noms.'); return; }
      if (iaEtat.ia) {
        const b = q('#idClaude');
        b.disabled = true; b.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>Claude cherche…';
        try { ajouter(await I.demander(ctx), 'claude'); if (!silencieux) U.toast('success', 'Nouvelles propositions', 'Claude a proposé des noms et des logos.'); }
        catch (e) { if (!silencieux) U.toast('error', 'Pas de propositions', e.message, 6000); }
        if (b.isConnected) { b.disabled = false; b.innerHTML = '<span class="mdi mdi-creation-outline"></span>Proposer avec Claude'; }
        return;
      }
      if (silencieux) return;
      const prompt = `${I.systeme(ctx)}\n\n${I.message(ctx)}`;
      const d = U.dialog({
        title: 'Noms et logos par Claude', size: 'md',
        body: `<div class="stack"><div class="bar warn"><span class="mdi mdi-information-outline"></span><div>Le serveur local ${iaEtat.joignable ? 'n’a pas de clé ANTHROPIC_API_KEY' : 'n’est pas lancé'} : copie le prompt dans Claude, puis colle sa réponse ci-dessous.</div></div>
          <div class="row" style="gap:8px"><button class="btn btn-outline btn-sm" id="idCopier"><span class="mdi mdi-content-copy"></span>Copier le prompt</button>
            <a class="btn btn-outline btn-sm" href="https://claude.ai/new" target="_blank" rel="noopener"><span class="mdi mdi-open-in-new"></span>Ouvrir Claude</a></div>
          <textarea class="tv-textarea code" id="idReponse" placeholder="Réponse de Claude (JSON)" style="min-height:160px"></textarea><div id="idErreur"></div></div>`,
        actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Ajouter les propositions', cls: 'btn-primary', onClick: ({ body }) => {
          try { const p = I.normaliser(AB.ia.lireReponse(body.querySelector('#idReponse').value)); if (!p.noms.length && !p.logos.length) throw new Error('Aucun nom ni logo dans la réponse.'); ajouter(p, 'claude'); }
          catch (e) { body.querySelector('#idErreur').innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`; return false; }
        } }]
      });
      d.body.querySelector('#idCopier').onclick = async () => { try { await navigator.clipboard.writeText(prompt); U.toast('success', 'Prompt copié', 'Colle-le dans Claude.'); } catch (e) { U.download('prompt-nom-logo.md', prompt, 'text/markdown;charset=utf-8'); } };
    }

    function discuter() {
      const corps = document.createElement('div');
      const d = U.dialog({ title: 'Nom et logo : discuter avec Claude', size: 'lg', body: corps });
      d.body.closest('.dlg').classList.add('id-dlg');
      AB.discussion.vue(corps, null, {
        cle: 'discussions:identite',
        contexte: async () => ({ morceaux: ['Description de l’app', 'Propositions actuelles', 'Ton choix'], texte: I.systemeDiscussion(opts.contexte(), id) }),
        systeme: () => I.systemeDiscussion(opts.contexte(), id),
        suggestions: ['Que penses-tu de ces noms ? Lequel retenir et pourquoi ?', 'Propose-moi des noms plus courts et plus percutants.', 'Le logo doit faire plus sérieux : propose d’autres couleurs et symboles.', 'Dessine-moi 2 logos sur mesure (SVG).'],
        vide: ['Discuter du nom et du logo', 'Claude connaît la description de l’app, les propositions et ton choix. Ses nouvelles propositions s’affichent en cartes : clique pour les adopter.'],
        placeholder: 'Ex. « plus court », « une couleur plus chaude », « un symbole de bouclier »…',
        identite: { nom: n => { adopterNom(n); U.toast('success', 'Nom adopté', n.nom); }, logo: l => { adopterLogo(l); U.toast('success', 'Logo adopté', l.titre || ''); }, ajouter: p => ajouter(p, 'claude') }
      });
    }

    q('#idAutres').onclick = () => { const g = (id.propositions && id.propositions.source === 'auto' ? id.propositions.graine : 0) + 1; id.propositions = I.proposerLocal(opts.contexte(), g); dessiner(); opts.changer(); };
    q('#idClaude').onclick = () => demanderClaude(false);
    q('#idDiscuter').onclick = discuter;

    if (!id.propositions || !id.propositions.noms.length) auto();
    dessiner();
    return {
      /** À appeler quand la description ou le nom changent : les propositions automatiques suivent. */
      rafraichir() { if (!id.propositions || id.propositions.source === 'auto') { auto(); } dessiner(); },
      demanderClaude
    };
  };

  /* ======================= Pour une app enregistrée ======================= */

  /** Copie l'identité choisie dans l'app (fiche + fichiers identite/ de l'app). */
  I.enregistrerDansApp = async function (app, id) {
    if (!id || !id.logo) { if (id && id.accroche) app.identite = Object.assign({}, app.identite, { accroche: id.accroche }); return; }
    app.identite = { accroche: id.accroche || '', couleurs: couleurs(id.logo.couleurs), logo: U.clone(id.logo), svg: I.svg(id.logo) };
    const f = await I.fichiers(id.logo, 'identite/');
    for (const [chemin, contenu] of Object.entries(f)) await AB.fichiers.ajouter('app:' + app.id, chemin, typeof contenu === 'string' ? new TextEncoder().encode(contenu) : contenu, []);
  };

  /** Pastille d'une app : son logo s'il existe, sinon son icône MDI. */
  I.pastille = (app, cls) => app && app.identite && app.identite.svg ? `<img class="id-mini ${cls || ''}" src="${I.url(app.identite.svg)}" alt="">` : `<span class="mdi ${esc((app && app.icone) || 'mdi-cellphone')}"></span>`;
})();
