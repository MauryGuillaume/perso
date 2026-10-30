/* ==========================================================================
   ab-mobile.js — transformer une app HTML en app iOS et Android (Capacitor)
   L'app web est embarquée telle quelle dans une coquille native ; elle parle
   au MÊME serveur qu'avant. Le ZIP produit est un projet Capacitor prêt à
   ouvrir dans Android Studio et Xcode :
     www/                l'app web + mobile-pont.js (adresses de l'API, téléchargements, impression)
     assets/             icône et écran de démarrage (déclinés par @capacitor/assets)
     outils/preparer.js  ajoute iOS et Android, applique version, orientation, permissions, synchronise
     plugins/impression  petit plugin natif pour window.print() (si l'app imprime)
     README, GUIDE-STORES, SERVEUR (CORS et cookies), workflow GitHub pour Android
   Sources possibles : une app de l'Atelier, un fichier HTML, un dossier ou un
   ZIP déjà construit (dist/), ou un site en ligne (mode « site en ligne »).
   ========================================================================== */
(function () {
  const U = AB.u;
  const M = AB.mobile = {};

  M.CAPACITOR = '8.5.3';
  M.PLUGINS = { '@capacitor/app': '8.1.2', '@capacitor/filesystem': '8.1.5', '@capacitor/share': '8.0.3', '@capacitor/splash-screen': '8.0.2', '@capacitor/status-bar': '8.0.4' };
  M.ASSETS = '3.0.5';
  /** Origines de l'app embarquée, à autoriser côté serveur en mode « navigateur ». */
  M.ORIGINES = ['capacitor://localhost', 'https://localhost'];

  const IGNORES = /(^|\/)(node_modules|\.git|\.svn|\.idea|\.vscode|\.DS_Store)(\/|$)/;
  const CODE = /\.(html?|js|mjs|cjs|json|webmanifest)$/i;
  const TIERS = /(^|\/)(vendor|vendors|lib|libs|third[-_]party)\/|\.min\.js$/i;

  /** Réglages par défaut d'une app (gardés dans app.mobile). */
  M.defauts = function (app) {
    const t = app.origine === 'plateforme' ? AB.rendu.theme(app) : { primaire: '#001047', fond: '#ffffff' };
    const nom = app.nom || 'Mon app';
    // Logo choisi à la création (ab-identite.js) : icône et couleur des stores par défaut
    const id = app.identite && app.identite.logo ? app.identite : null;
    if (id) t.primaire = id.couleurs.principale;
    return {
      nom, appId: 'fr.techview.' + (U.slug(nom).replace(/-/g, '') || 'app'), version: '1.0.0', build: 0,
      mode: 'embarque', url: (app.liens && app.liens.prod) || '', api: (app.liens && app.liens.prod) || '',
      prefixes: [], remplacer: [], reseau: 'natif',
      couleur: t.primaire, fondSplash: t.primaire, fondSombre: '#111318', icone: id ? AB.identite.url(AB.identite.svg(id.logo, { carre: true })) : '', iconeRemplir: !!id,
      orientation: 'portrait', appareils: 'iphone-ipad',
      impression: false, telechargements: true, photos: false, camera: false, localisation: false, sauvegardeAndroid: true,
      etapes: {}, exports: []
    };
  };
  M.config = app => Object.assign(M.defauts(app), app.mobile || {});

  /* ======================= Lecture de la source ======================= */
  // Chaque fichier est gardé en octets (images, polices…) ; le texte n'est décodé que pour l'analyse.

  const enc = new TextEncoder(), dec = new TextDecoder('utf-8');
  M.texte = v => typeof v === 'string' ? v : dec.decode(v);
  M.octets = v => typeof v === 'string' ? enc.encode(v) : v;

  /** Garde le dossier de l'app web : celui de l'index.html le moins profond. */
  function racineWeb(fichiers) {
    const index = Object.keys(fichiers).filter(c => /(^|\/)index\.html?$/i.test(c)).sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length)[0];
    if (!index) return { fichiers, racine: '' };
    const racine = index.slice(0, index.lastIndexOf('/') + 1);
    if (!racine) return { fichiers, racine: '' };
    const garde = {};
    Object.keys(fichiers).forEach(c => { if (c.startsWith(racine)) garde[c.slice(racine.length)] = fichiers[c]; });
    return { fichiers: garde, racine, tous: fichiers };
  }

  /** Source = app de l'Atelier : les fichiers de son export, sans le backend. */
  M.sourceAtelier = function (app) {
    const f = AB.rendu.fichiers(app), fichiers = {};
    Object.keys(f).forEach(c => {
      if (/^(supabase|bases)\//.test(c) || /^(\.env\.example|README\.md|_headers|vercel\.json)$/.test(c)) return;
      fichiers[c] = String(f[c]);
    });
    return { type: 'atelier', nom: app.nom, app, fichiers, racine: '', resume: `Export de l’Atelier (version ${app.versionCourante || 1}), ${Object.keys(fichiers).length} fichiers` };
  };

  /** Un seul fichier HTML : il devient www/index.html. */
  M.sourceHtml = async function (fichier) {
    return { type: 'html', nom: fichier.name, fichiers: { 'index.html': new Uint8Array(await fichier.arrayBuffer()) }, racine: '', resume: `${fichier.name} (fichier HTML unique)` };
  };

  /** Dossier choisi avec <input webkitdirectory>. */
  /* Le dossier ou le ZIP choisi pour une app est gardé dans ce navigateur (table « fichiers », un ZIP),
     partagé par l'aperçu web et l'app mobile. */
  M.garderSource = async function (appId, s) {
    const cle = 'mobile:' + appId;
    try {
      if (!s || !['zip', 'dossier', 'html'].includes(s.type)) return await AB.db.remove('fichiers', cle);
      await AB.db.put('fichiers', { id: cle, proprio: cle, chemin: 'source.zip', type: 'application/zip', nom: s.nom, sorte: s.type, blob: AB.zip(s.tous || s.fichiers), date: U.now() });
    } catch (e) { console.warn('Source non gardée', e); }
  };
  M.sourceGardee = async function (appId) {
    try {
      const g = await AB.db.get('fichiers', 'mobile:' + appId);
      if (!g) return null;
      const s = await M.sourceZip(g.blob, g.nom);
      s.type = g.sorte || 'zip';
      return s;
    } catch (e) { console.warn('Source gardée illisible', e); return null; }
  };

  M.sourceDossier = async function (liste) {
    const tous = {};
    for (const f of [...liste]) {
      const chemin = (f.webkitRelativePath || f.name).replace(/^[^/]+\//, '');
      if (IGNORES.test(chemin)) continue;
      tous[chemin] = new Uint8Array(await f.arrayBuffer());
    }
    const nom = ([...liste][0].webkitRelativePath || '').split('/')[0] || 'dossier';
    return M.decrire({ type: 'dossier', nom, ...racineWeb(tous) });
  };

  /** ZIP (méthodes « stocké » et « deflate »), lu dans le navigateur. */
  M.sourceZip = async function (blob, nom) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let fin = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    if (fin < 0) throw new Error('Ce fichier n’est pas un ZIP valide.');
    const n = dv.getUint16(fin + 10, true);
    let p = dv.getUint32(fin + 16, true);
    if (p === 0xffffffff || n === 0xffff) throw new Error('ZIP trop volumineux (ZIP64) : choisis plutôt le dossier décompressé.');
    const tous = {};
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const methode = dv.getUint16(p + 10, true), taille = dv.getUint32(p + 20, true);
      const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
      const chemin = dec.decode(buf.subarray(p + 46, p + 46 + ln));
      p += 46 + ln + le + lc;
      if (chemin.endsWith('/') || IGNORES.test(chemin) || /^__MACOSX\//.test(chemin)) continue;
      if (methode !== 0 && methode !== 8) throw new Error(`Compression non prise en charge pour ${chemin} : décompresse le ZIP et choisis le dossier.`);
      const debut = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      let octets = buf.slice(debut, debut + taille);
      if (methode === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien pour lire un ZIP : choisis le dossier décompressé.');
        octets = new Uint8Array(await new Response(new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      }
      tous[chemin] = octets;
    }
    return M.decrire({ type: 'zip', nom, ...racineWeb(tous) });
  };

  M.decrire = function (s) {
    const n = Object.keys(s.fichiers).length;
    const taille = Object.values(s.fichiers).reduce((t, v) => t + (typeof v === 'string' ? v.length : v.length), 0);
    s.taille = taille;
    s.resume = `${s.nom}${s.racine ? ` › ${s.racine.replace(/\/$/, '')}` : ''} : ${n} fichier(s), ${(taille / 1048576).toFixed(1)} Mo`;
    return s;
  };

  /** Couleur de l'app web (balise theme-color), pour l'icône et l'écran de démarrage. */
  M.couleurSource = function (source) {
    const index = source && source.fichiers['index.html'];
    const m = index && /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-f]{6})["']/i.exec(M.texte(index));
    return m ? m[1] : '';
  };

  /* ======================= Diagnostic ======================= */

  const LOCALES = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(?::\d+)?/g;
  const HTTP_CLAIR = /["'`(]http:\/\/(?!localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|www\.w3\.org|ns\.adobe\.com|purl\.org|schemas\.|xmlns)([a-z0-9-]+\.)+[a-z]{2,}/gi;

  /** Analyse la source : ce qui marchera, ce qu'il faut régler, et des suggestions de réglages. */
  M.analyser = function (source, cfg) {
    const constats = [], sugg = { prefixes: new Set(), locales: new Set(), entetes: new Set() };
    const ajouter = (niveau, titre, detail, cle) => constats.push({ niveau, titre, detail, cle });
    const tous = source && source.tous ? source.tous : source ? source.fichiers : {};
    const noms = Object.keys(tous);
    const textes = [];
    if (source) Object.keys(source.fichiers).forEach(c => {
      const v = source.fichiers[c];
      // Code de l'app seulement : ni feuilles de style ni librairies fournies (leurs noms d'icônes ou de fonctions fausseraient l'analyse)
      if (CODE.test(c) && !TIERS.test(c) && v.length < 6 * 1048576) textes.push([c, M.texte(v)]);
    });
    const code = textes.map(t => t[1]).join('\n');
    const cherche = re => re.test(code);

    if (cfg.mode === 'distant') {
      if (!/^https:\/\/[^/]+/.test(cfg.url)) ajouter('crit', 'Adresse du site manquante ou pas en https', 'Le mode « site en ligne » ouvre le site publié dans l’app : renseigne son adresse en https.', 'url');
      else ajouter('ok', 'Le site en ligne est ouvert dans l’app', 'Même adresse, mêmes cookies, même serveur : rien à changer côté serveur. Une page « Pas de connexion » s’affiche hors ligne.');
      ajouter('warn', 'Apple refuse souvent les apps qui ne font qu’afficher un site (règle 4.2)', 'Pour passer la revue, l’app doit apporter plus qu’un site : idéalement, embarque l’app (mode recommandé) ; sinon, mets en avant ce qui est propre au téléphone (notifications, partage, hors ligne…).');
      ajouter('info', 'Téléchargements et impression non gérés en mode « site en ligne »', 'Le pont mobile (fichiers à partager, impression) ne peut pas s’injecter dans un site distant.');
    } else {
      if (!source) ajouter('crit', 'Aucune app choisie', 'Choisis la source : export de l’Atelier, fichier HTML, dossier ou ZIP de l’app construite (dist/).', 'source');
      else if (!source.fichiers['index.html']) {
        const next = noms.some(c => /(^|\/)(next\.config\.(m?js|ts)|\.next\/)/.test(c));
        ajouter('crit', 'Pas de index.html à la racine de l’app', next
          ? 'C’est une app Next.js avec du code serveur : elle ne peut pas être embarquée. Choisis le mode « site en ligne » avec son adresse publiée.'
          : 'Choisis le dossier construit de l’app (souvent dist/ ou build/ après npm run build), pas le code source.', 'source');
      }
      if (source && source.fichiers['index.html']) {
        const index = M.texte(source.fichiers['index.html']);
        const projet = AB.construire && AB.construire.projet(source);
        if (projet) ajouter('crit', 'C’est le code source, pas l’app construite', `L’Atelier la construit tout seul (${projet.commande}) avec son serveur local : ouvre l’aperçu ou l’émulateur. Sans serveur local, lance ces commandes dans le projet puis choisis le dossier dist/ (ou son ZIP).`, 'source');
        else if (/<script[^>]+src=["']\/?src\/main\.(js|ts)/.test(index) && noms.some(c => /(^|\/)package\.json$/.test(c)))
          ajouter('crit', 'C’est le code source, pas l’app construite', 'Lance npm run build dans le projet, puis choisis le dossier dist/ (ou son ZIP).', 'source');
        else ajouter('ok', 'App web trouvée', source.resume);
        if (/<meta[^>]+Content-Security-Policy/i.test(index)) ajouter('info', 'Politique de sécurité (CSP) complétée automatiquement', 'L’adresse de l’API est ajoutée à connect-src et le pont mobile à script-src, sans rien relâcher d’autre.');
      }
      // Appels relatifs à l'API (fetch('api/…'), axios baseURL '/api')
      const reRel = /["'`](\/?(?:api|graphql|rest|backend|auth)\/)[^"'`\s]*["'`]/g;
      let m;
      for (const [, t] of textes) { reRel.lastIndex = 0; while ((m = reRel.exec(t))) sugg.prefixes.add('/' + m[1].replace(/^\//, '')); }
      const rel = [...sugg.prefixes];
      if (rel.length) {
        const couverts = rel.every(p => (cfg.prefixes || []).includes(p));
        if (!cfg.api) ajouter('crit', 'L’app appelle son serveur par une adresse relative', `Appels vers ${rel.join(', ')} : dans l’app native, il faut l’adresse complète du serveur (ex. https://cabinet.exemple.fr/). Renseigne « Adresse du serveur ».`, 'api');
        else if (!couverts) ajouter('warn', 'Chemins de l’API à rediriger', `Trouvés dans le code : ${rel.join(', ')}. Ajoute-les dans « Chemins envoyés au serveur » (bouton « Appliquer les suggestions »).`, 'prefixes');
        else ajouter('ok', 'Appels au serveur redirigés', `${rel.join(', ')} → ${cfg.api}`);
      }
      // Adresses locales oubliées dans le build
      for (const [, t] of textes) { const r = t.match(LOCALES); if (r) r.forEach(x => sugg.locales.add(x)); }
      const locales = [...sugg.locales].filter(x => !(cfg.remplacer || []).some(r => r[0] === x));
      if (locales.length) ajouter('crit', 'Adresses locales dans l’app', `${locales.join(', ')} ne répond pas depuis un téléphone. Remplace-les par l’adresse du serveur en ligne (« Adresses à remplacer »), ou reconstruis l’app avec la bonne variable (ex. VITE_API_BASE_URL).`, 'remplacer');
      const clair = new Set();
      for (const [, t] of textes) { const r = t.match(HTTP_CLAIR); if (r) r.forEach(x => clair.add(x.slice(1))); }
      if (clair.size) ajouter('warn', 'Adresses en http:// (non chiffré)', `${[...clair].slice(0, 5).join(', ')} : iOS et Android bloquent le http non chiffré. Passe ces adresses en https.`);
      if (cfg.api && !/^https:\/\//.test(cfg.api)) ajouter('crit', 'Le serveur doit être en https', 'iOS et Android refusent les connexions http non chiffrées en production.', 'api');
      // Ressources chargées depuis Internet
      const cdn = new Set();
      for (const [c, t] of textes) if (/\.html?$/.test(c)) { const r = t.match(/<(?:script|link)[^>]+(?:src|href)=["']https:\/\/([^/"']+)/gi); if (r) r.forEach(x => cdn.add(x.replace(/.*https:\/\//, ''))); }
      if (cdn.size) ajouter('info', 'Polices ou scripts chargés depuis Internet', `${[...cdn].join(', ')} : l’app a besoin du réseau pour les afficher. Pour un démarrage hors ligne, embarque-les dans l’app.`);
      if (cherche(/serviceWorker\.register|registerSW|workbox/)) ajouter('ok', 'Service worker désactivé dans l’app', 'Inutile dans une app native et source de vieilles versions en cache après une mise à jour : le pont mobile le neutralise (il reste actif dans le navigateur).');
      if (cherche(/window\.print\s*\(|\bprint\(\)/)) {
        if (cfg.impression) ajouter('ok', 'Impression gérée', 'window.print() ouvre l’impression du téléphone (AirPrint, imprimantes Android, « Enregistrer en PDF ») grâce au plugin fourni.');
        else ajouter('warn', 'L’app imprime (window.print)', 'Dans une app native, window.print() ne fait rien. Coche « Impression » pour ajouter le plugin fourni.', 'impression');
      }
      if (cherche(/\.download\s*=|createObjectURL|\bdownload=|\.save\(['"`]/)) {
        if (cfg.telechargements) ajouter('ok', 'Téléchargements gérés', 'Un fichier « téléchargé » (PDF, CSV, sauvegarde) ouvre la feuille de partage : Fichiers, Mail, AirDrop, Drive…');
        else ajouter('warn', 'L’app télécharge des fichiers', 'Les téléchargements ne marchent pas tels quels dans une app native. Coche « Téléchargements ».', 'telechargements');
      }
      if (cherche(/accept=["']?image|type=["']file|capture=/)) {
        if (!cfg.photos) ajouter('warn', 'L’app choisit des photos ou des fichiers', 'iOS ferme l’app si le texte d’autorisation manque. Coche « Photos et appareil photo ».', 'photos');
      }
      if (cherche(/getUserMedia/) && !cfg.camera) ajouter('warn', 'L’app utilise la caméra ou le micro', 'Coche « Caméra » pour ajouter le texte d’autorisation demandé par iOS.', 'camera');
      if (cherche(/geolocation\./) && !cfg.localisation) ajouter('warn', 'L’app utilise la localisation', 'Coche « Localisation » pour ajouter le texte d’autorisation demandé par iOS.', 'localisation');
      // Cookies et en-têtes propres à l'API
      for (const [, t] of textes) { const r = t.match(/["'](X-[A-Za-z0-9-]+)["']\s*:/g); if (r) r.forEach(x => sugg.entetes.add(x.replace(/["':\s]/g, ''))); }
      if ((rel.length || (cfg.remplacer || []).length) && cfg.reseau === 'webview')
        ajouter('warn', 'Mode réseau « navigateur » : le serveur doit autoriser l’app', `Ajoute ${M.ORIGINES.join(' et ')} à son CORS, avec les cookies en SameSite=None; Secure (voir SERVEUR.md). Sur iPhone, les cookies d’un autre domaine sont souvent bloqués : le mode « natif » évite tout ça.`);
      else if (rel.length || (cfg.remplacer || []).length)
        ajouter('ok', 'Même serveur, sans le modifier', 'Mode réseau natif : les appels passent par le téléphone, pas par le navigateur, donc ni CORS ni cookies tiers. La session (cookie) est gardée par l’app.');
    }
    // Règles des stores (toutes sources)
    // App de l'Atelier : ses blocs disent ce qu'elle fait (le code commun contient tous les cas possibles)
    const blocs = source && source.type === 'atelier' ? (source.app.blocs || []).map(b => b.bloc) : null;
    if (blocs ? blocs.some(b => /paiement/.test(b)) : cherche(/stripe|checkout\.session|abonnement|subscription/i))
      ajouter('warn', 'Paiements : règle Apple 3.1.1', 'Vendre dans l’app un abonnement ou un contenu numérique impose les achats intégrés Apple / Google. Un paiement de service réel (soin, rendez-vous, objet) peut rester sur Stripe.');
    if (blocs ? blocs.includes('connexion') : cherche(/signUp|inscription|creer-compte|register\b/i))
      ajouter('info', 'Création de compte : suppression obligatoire', 'Apple et Google exigent qu’on puisse supprimer son compte depuis l’app (ou par un lien clair dans l’app).');
    if (cherche(/totp|double authentification|two-factor|otpauth/i))
      ajouter('info', 'Double authentification : compte de démonstration', 'Les testeurs d’Apple et de Google doivent pouvoir se connecter : prévois un compte de démo (et sa clé TOTP) dans les notes de revue.');
    if (cherche(/signInWithOAuth|emailRedirectTo|redirectTo|magic.?link/i))
      ajouter('warn', 'Connexion par lien ou par Google/Apple', 'Les liens de retour (e-mail, OAuth) ouvrent le navigateur, pas l’app. À tester ; il faudra peut-être des liens universels (deep links).');
    if (cherche(/patient|bilan|médical|medical|santé|ordonnance/i)) {
      ajouter('info', 'Données de santé', `Politique de confidentialité obligatoire, formulaire « Applications de santé » sur Google Play, et rubrique « Santé » dans la confidentialité de l’App Store.${cfg.sauvegardeAndroid ? ' Pense à couper la sauvegarde Android automatique des données de l’app.' : ''}`, cfg.sauvegardeAndroid ? 'sauvegardeAndroid' : '');
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(cfg.appId || '')) ajouter('crit', 'Identifiant de l’app invalide', 'Format attendu : domaine inversé en minuscules, au moins 3 parties, sans tiret (ex. fr.techview.podologiciel). Il ne pourra plus changer une fois publié.', 'appId');
    if (!/^\d+\.\d+(\.\d+)?$/.test(cfg.version || '')) ajouter('crit', 'Version invalide', 'Format attendu : 1.0.0', 'version');
    if (source && source.taille > 150 * 1048576) ajouter('warn', 'App lourde', `${(source.taille / 1048576).toFixed(0)} Mo : Google Play limite le téléchargement de base à 200 Mo.`);
    const ordre = { crit: 0, warn: 1, info: 2, ok: 3 };
    constats.sort((a, b) => ordre[a.niveau] - ordre[b.niveau]);
    return { constats, bloquants: constats.filter(c => c.niveau === 'crit').length, prefixes: [...sugg.prefixes], locales: [...sugg.locales], entetes: [...sugg.entetes] };
  };

  /* ======================= Icône et écran de démarrage ======================= */

  function canvas(taille) { const c = document.createElement('canvas'); c.width = c.height = taille; return c; }
  const png = c => new Promise(ok => c.toBlob(b => b.arrayBuffer().then(a => ok(new Uint8Array(a))), 'image/png'));

  async function chargerImage(dataUrl) {
    if (!dataUrl) return null;
    const img = new Image();
    img.src = dataUrl;
    try { await img.decode(); return img; } catch (e) { return null; }
  }

  /** Dessine l'emblème (image importée, icône MDI de l'app, ou initiale) dans un carré. */
  async function dessinerEmbleme(ctx, x, y, cote, cfg, app, img) {
    if (img) {
      const r = Math.min(cote / img.width, cote / img.height);
      ctx.drawImage(img, x + (cote - img.width * r) / 2, y + (cote - img.height * r) / 2, img.width * r, img.height * r);
      return;
    }
    let car = '';
    let police = '';
    if (app.icone && document.fonts) {
      const s = document.createElement('span');
      s.className = 'mdi ' + app.icone;
      s.style.cssText = 'position:absolute;left:-9999px';
      document.body.appendChild(s);
      const contenu = getComputedStyle(s, '::before').content;
      const famille = getComputedStyle(s, '::before').fontFamily;
      s.remove();
      if (contenu && contenu !== 'none' && contenu !== 'normal') {
        car = contenu.replace(/^["']|["']$/g, '');
        police = famille || '"Material Design Icons"';
        try { await document.fonts.load(`100px ${police}`); } catch (e) { car = ''; }
        if (car && !document.fonts.check(`100px ${police}`)) car = '';
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (car) { ctx.font = `${Math.round(cote)}px ${police}`; ctx.fillText(car, x + cote / 2, y + cote / 2); }
    else { ctx.font = `700 ${Math.round(cote * 0.8)}px system-ui, sans-serif`; ctx.fillText((cfg.nom || 'A').charAt(0).toUpperCase(), x + cote / 2, y + cote / 2 + cote * 0.04); }
  }

  /** Les 5 images de départ de @capacitor/assets, en PNG. */
  M.images = async function (cfg, app) {
    const img = await chargerImage(cfg.icone);
    const remplir = img && cfg.iconeRemplir;
    const out = {};
    // Icône iOS et ancienne icône Android : fond plein (Apple refuse la transparence)
    let c = canvas(1024), x = c.getContext('2d');
    x.fillStyle = cfg.couleur; x.fillRect(0, 0, 1024, 1024);
    if (remplir) x.drawImage(img, 0, 0, 1024, 1024); else await dessinerEmbleme(x, 192, 192, 640, cfg, app, img);
    out['assets/icon-only.png'] = await png(c);
    // Icône adaptative Android : premier plan dans la zone sûre (66 %), fond uni
    c = canvas(1024); x = c.getContext('2d');
    if (remplir) x.drawImage(img, 170, 170, 684, 684); else await dessinerEmbleme(x, 312, 312, 400, cfg, app, img);
    out['assets/icon-foreground.png'] = await png(c);
    c = canvas(1024); x = c.getContext('2d');
    x.fillStyle = cfg.couleur; x.fillRect(0, 0, 1024, 1024);
    out['assets/icon-background.png'] = await png(c);
    // Écrans de démarrage (clair et sombre)
    for (const [nom, fond] of [['splash', cfg.fondSplash], ['splash-dark', cfg.fondSombre]]) {
      c = canvas(2732); x = c.getContext('2d');
      x.fillStyle = fond; x.fillRect(0, 0, 2732, 2732);
      if (remplir) { x.save(); x.beginPath(); x.roundRect(1066, 1066, 600, 600, 132); x.clip(); x.drawImage(img, 1066, 1066, 600, 600); x.restore(); }
      else await dessinerEmbleme(x, 1116, 1116, 500, cfg, app, img);
      out[`assets/${nom}.png`] = await png(c);
    }
    return out;
  };

  /* ======================= Pont mobile (injecté dans l'app) ======================= */

  /* Ce code part tel quel dans www/mobile-pont.js. Il ne fait rien dans un navigateur :
     seulement dans l'app native (Capacitor), avant tous les autres scripts. */
  function PONT(C) {
    'use strict';
    var cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
    document.documentElement.classList.add('app-native', 'app-' + cap.getPlatform());

    /* ---------- Adresses : chemins de l'API et adresses à remplacer ---------- */
    var base = C.api ? new URL(C.api.replace(/\/*$/, '/')) : null;
    function reecrire(url) {
      var s = String(url);
      for (var i = 0; i < C.remplacer.length; i++) {
        if (s.indexOf(C.remplacer[i][0]) === 0) return C.remplacer[i][1].replace(/\/$/, '') + s.slice(C.remplacer[i][0].replace(/\/$/, '').length);
      }
      if (!base || !C.prefixes.length || /^(blob|data):/.test(s)) return s;
      var u;
      var page = window.AB_MOBILE_PAGE || location.href;   // l'aperçu de l'Atelier donne l'adresse qu'aurait l'app
      try { u = new URL(s, page); } catch (e) { return s; }
      if (u.origin !== new URL(page).origin) return s;
      for (var j = 0; j < C.prefixes.length; j++) {
        if (u.pathname.indexOf(C.prefixes[j]) === 0) return new URL(u.pathname.slice(1) + u.search + u.hash, base).href;
      }
      return s;
    }
    window.AB_MOBILE = { reecrire: reecrire, config: C };

    var fetchOrig = window.fetch;
    window.fetch = function (ressource, options) {
      if (typeof ressource === 'string' || ressource instanceof URL) {
        var nouvelle = reecrire(ressource);
        if (nouvelle !== String(ressource)) {
          options = Object.assign({}, options);
          if (!options.credentials || options.credentials === 'same-origin') options.credentials = 'include';
          return fetchOrig.call(window, nouvelle, options);
        }
      } else if (ressource && ressource.url) {
        var autre = reecrire(ressource.url);
        if (autre !== ressource.url) return fetchOrig.call(window, new Request(autre, ressource), Object.assign({ credentials: 'include' }, options));
      }
      return fetchOrig.apply(window, arguments);
    };
    var ouvrir = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (methode, url) {
      var args = Array.prototype.slice.call(arguments);
      var nouvelle = reecrire(url);
      if (nouvelle !== String(url)) { args[1] = nouvelle; try { this.withCredentials = true; } catch (e) { /* déjà ouvert */ } }
      return ouvrir.apply(this, args);
    };
    if (window.EventSource) {
      var ES = window.EventSource;
      window.EventSource = function (url, opts) { return new ES(reecrire(url), Object.assign({ withCredentials: true }, opts)); };
      window.EventSource.prototype = ES.prototype;
    }
    if (window.WebSocket && C.remplacer.length) {
      var WS = window.WebSocket;
      var ws = function (url, protocoles) {
        var s = String(url).replace(/^ws/, 'http'), n = reecrire(s);
        var finale = n === s ? url : n.replace(/^http/, 'ws');
        return protocoles === undefined ? new WS(finale) : new WS(finale, protocoles);
      };
      ws.prototype = WS.prototype;
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { ws[k] = WS[k]; });
      window.WebSocket = ws;
    }

    /* ---------- Service worker : inutile dans l'app, et il garderait d'anciennes versions ---------- */
    if (navigator.serviceWorker) {
      try {
        navigator.serviceWorker.register = function () { return new Promise(function () {}); };  // jamais résolue : l'app continue sans service worker
        navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
      } catch (e) { /* non disponible sur ce système */ }
    }

    /* ---------- Téléchargements : le fichier part dans la feuille de partage ---------- */
    // Les blobs sont gardés à leur création : les relire par fetch serait bloqué par la CSP (connect-src) et
    // l'adresse blob: est souvent révoquée juste après le clic.
    var blobs = {};
    var creerUrl = URL.createObjectURL, revoquerUrl = URL.revokeObjectURL;
    URL.createObjectURL = function (objet) {
      var u = creerUrl.call(URL, objet);
      if (objet instanceof Blob) blobs[u] = objet;
      return u;
    };
    URL.revokeObjectURL = function (u) {
      setTimeout(function () { delete blobs[u]; }, 60000);
      return revoquerUrl.call(URL, u);
    };
    function enBase64(href) {
      var d = /^data:[^,]*?(;base64)?,(.*)$/.exec(href);
      if (d) return Promise.resolve(d[1] ? d[2] : btoa(unescape(encodeURIComponent(decodeURIComponent(d[2])))));
      var blob = blobs[href];
      var lecture = blob ? Promise.resolve(blob) : (window.CapacitorWebFetch || fetchOrig)(href).then(function (r) { return r.blob(); });
      return lecture.then(function (b) {
        return new Promise(function (ok, ko) {
          var f = new FileReader();
          f.onload = function () { ok(String(f.result).split(',')[1] || ''); };
          f.onerror = ko;
          f.readAsDataURL(b);
        });
      });
    }
    function partager(href, nom) {
      nom = String(nom || 'fichier').replace(/[\\/:*?"<>|]+/g, '-');
      return enBase64(href).then(function (b64) {
        return cap.nativePromise('Filesystem', 'writeFile', { path: nom, data: b64, directory: 'CACHE', recursive: true });
      }).then(function (ecrit) {
        return cap.nativePromise('Share', 'share', { title: nom, files: [ecrit.uri], dialogTitle: nom });
      }).catch(function (e) {
        if (!/cancel|annul/i.test(String(e && e.message))) { console.error(e); alert('Le fichier n’a pas pu être partagé : ' + (e && e.message || e)); }
      });
    }
    if (C.telechargements) {
      var aIntercepter = function (a) { return a && a.hasAttribute && a.hasAttribute('download') && /^(blob:|data:)/.test(a.href); };
      document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
        if (aIntercepter(a)) { e.preventDefault(); partager(a.href, a.getAttribute('download')); }
      }, true);
      var clic = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (aIntercepter(this)) { partager(this.href, this.getAttribute('download')); return; }
        return clic.apply(this, arguments);
      };
      var ouvrirFenetre = window.open;
      window.open = function (url) {
        if (url && /^blob:/.test(String(url))) {
          var b = blobs[String(url)], ext = b && b.type ? (b.type.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '') : 'pdf';
          partager(String(url), (document.title || 'document') + '.' + ext);
          return null;
        }
        return ouvrirFenetre.apply(window, arguments);
      };
    }

    /* ---------- Impression : window.print() ouvre l'impression du téléphone ---------- */
    if (C.impression) {
      window.print = function () {
        cap.nativePromise('Impression', 'imprimer', { nom: document.title || 'Document' }).catch(function (e) {
          console.error(e);
          alert('Impression indisponible sur cet appareil.');
        });
      };
    }
  }

  /** Contenu de www/mobile-pont.js pour ces réglages. */
  M.pont = function (cfg) {
    const C = {
      api: cfg.api || '', prefixes: (cfg.prefixes || []).filter(Boolean), remplacer: (cfg.remplacer || []).filter(r => r[0] && r[1]),
      telechargements: !!cfg.telechargements, impression: !!cfg.impression
    };
    return `/* mobile-pont.js — généré par l'Atelier de Blocs le ${new Date().toLocaleDateString('fr-FR')}.
   Chargé avant les autres scripts. Dans un navigateur il ne fait rien ; dans l'app native il :
   - envoie les appels de l'API au serveur en ligne (${C.prefixes.join(', ') || 'aucun chemin'}${C.remplacer.length ? ', adresses remplacées' : ''}) ;
   - désactive le service worker ;
   - ${C.telechargements ? 'ouvre la feuille de partage pour les fichiers téléchargés' : 'laisse les téléchargements tels quels'} ;
   - ${C.impression ? 'branche window.print() sur l’impression du téléphone' : 'laisse window.print() tel quel'}. */
(${PONT.toString()})(${JSON.stringify(C, null, 2)});
`;
  };

  /* ======================= Préparation de l'app web ======================= */

  /** Ajoute l'API dans la CSP (connect-src) et autorise le pont (script-src 'self'). */
  function completerCsp(contenu, origines) {
    return contenu.replace(/(<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content=")([^"]*)(")/i, (tout, debut, regles, fin) => {
      const liste = regles.split(';').map(r => r.trim()).filter(Boolean);
      const trouver = nom => liste.findIndex(r => r.split(/\s+/)[0] === nom);
      let i = trouver('connect-src');
      const ajout = origines.filter(o => !regles.includes(o));
      if (i >= 0 && ajout.length) liste[i] += ' ' + ajout.join(' ');
      else if (i < 0 && ajout.length && trouver('default-src') >= 0) liste.push(`connect-src 'self' ${ajout.join(' ')}`);
      i = trouver('script-src');
      if (i >= 0 && !/'self'/.test(liste[i])) liste[i] += " 'self'";
      return debut + liste.join('; ') + fin;
    });
  }

  /** Insère le pont en tout premier script de chaque page HTML. */
  function injecterPont(html) {
    if (/mobile-pont\.js/.test(html)) return html;
    const balise = '<script src="/mobile-pont.js"><\/script>';
    if (/<meta[^>]+charset[^>]*>/i.test(html)) return html.replace(/(<meta[^>]+charset[^>]*>)/i, `$1\n  ${balise}`);
    if (/<head[^>]*>/i.test(html)) return html.replace(/(<head[^>]*>)/i, `$1\n  ${balise}`);
    return balise + '\n' + html;
  }

  const origine = u => { try { return new URL(u).origin; } catch (e) { return ''; } };

  function wwwEmbarque(source, cfg) {
    const www = {};
    const origines = [...new Set([origine(cfg.api)].concat((cfg.remplacer || []).map(r => origine(r[1]))).filter(Boolean))];
    Object.keys(source.fichiers).forEach(c => {
      let v = source.fichiers[c];
      if (/\.html?$/i.test(c)) v = injecterPont(completerCsp(M.texte(v), origines));
      www['www/' + c] = v;
    });
    www['www/mobile-pont.js'] = M.pont(cfg);
    return www;
  }

  function pageHorsLigne(cfg, titre, texte, bouton) {
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${U.esc(cfg.nom)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px system-ui,sans-serif;background:${U.esc(cfg.fondSplash)};color:#fff;text-align:center;padding:24px;box-sizing:border-box}
button{font:inherit;font-weight:600;margin-top:16px;padding:12px 22px;border:0;border-radius:10px;background:#fff;color:${U.esc(cfg.fondSplash)}}</style></head>
<body><div><h1 style="font-size:22px">${U.esc(titre)}</h1><p>${U.esc(texte)}</p>${bouton ? `<button onclick="location.href=${U.esc(JSON.stringify(cfg.url))}">${U.esc(bouton)}</button>` : ''}</div></body></html>
`;
  }

  /* ======================= Dossier des stores (kit App complète 1.4) ======================= */

  /** Le dossier store/ d'une app du kit (fiche, documents générés, visuels) trouvé dans la source, ou null. */
  M.dossierStore = function (source) {
    const tous = source && (source.tous || source.fichiers);
    if (!tous) return null;
    const fiche = Object.keys(tous).filter(c => /(^|\/)store\/store\.json$/.test(c)).sort((a, b) => a.length - b.length)[0];
    if (!fiche) return null;
    const prefixe = fiche.slice(0, -'store.json'.length);
    const fichiers = {};
    Object.keys(tous).forEach(c => { if (c.startsWith(prefixe) && /^(store\.json|[A-Z-]+\.md|visuels\/.+\.png)$/.test(c.slice(prefixe.length))) fichiers[c.slice(prefixe.length)] = tous[c]; });
    let json = null;
    try { json = JSON.parse(M.texte(tous[fiche])); } catch (e) { /* fiche illisible : signalée par l'écran */ }
    const pages = ['confidentialite', 'support', 'suppression-compte', 'conditions'].filter(n => Object.keys(tous).some(c => c.endsWith('public/' + n + '.html') || c === n + '.html'));
    return { fiche: json, fichiers, pages, visuels: Object.keys(fichiers).filter(c => c.startsWith('visuels/')).length };
  };

  /* ======================= Fichiers du projet ======================= */

  /** Le projet Capacitor complet : { chemin: texte | octets }. images = M.images(...). */
  M.fichiers = function (app, cfg, source, images, diag) {
    const slug = U.slug(cfg.nom) || 'app';
    const f = {};
    const distant = cfg.mode === 'distant';
    const reseauNatif = cfg.reseau !== 'webview';
    const plugins = Object.assign({}, M.PLUGINS);

    // ---------- www ----------
    if (distant) {
      f['www/index.html'] = pageHorsLigne(cfg, cfg.nom, 'Chargement…', '');
      f['www/erreur.html'] = pageHorsLigne(cfg, 'Pas de connexion', 'L’app a besoin d’Internet pour s’ouvrir. Vérifie ta connexion puis réessaie.', 'Réessayer');
    } else Object.assign(f, wwwEmbarque(source, cfg));

    // ---------- capacitor.config.json ----------
    const conf = {
      appId: cfg.appId, appName: cfg.nom, webDir: 'www',
      backgroundColor: cfg.fondSplash,
      ios: { contentInset: 'automatic', backgroundColor: cfg.fondSplash },
      android: { backgroundColor: cfg.fondSplash, allowMixedContent: false },
      plugins: {
        CapacitorHttp: { enabled: !distant && reseauNatif },
        CapacitorCookies: { enabled: !distant && reseauNatif },
        SplashScreen: { launchShowDuration: 600, launchAutoHide: true, backgroundColor: cfg.fondSplash, showSpinner: false },
        StatusBar: { overlaysWebView: false, style: fonce(cfg.couleur) ? 'DARK' : 'LIGHT', backgroundColor: cfg.couleur }
      }
    };
    if (distant) {
      const hote = (() => { try { return new URL(cfg.url).hostname; } catch (e) { return ''; } })();
      conf.server = { url: cfg.url, allowNavigation: hote ? [hote] : [], errorPath: 'erreur.html' };
    }
    f['capacitor.config.json'] = JSON.stringify(conf, null, 2) + '\n';

    // ---------- réglages natifs, appliqués par outils/preparer.js ----------
    f['mobile.json'] = JSON.stringify({
      nom: cfg.nom, appId: cfg.appId, version: cfg.version, build: cfg.build,
      orientation: cfg.orientation, appareils: cfg.appareils, sauvegardeAndroid: !!cfg.sauvegardeAndroid,
      permissions: {
        photos: cfg.photos ? `${cfg.nom} a besoin de tes photos pour joindre une image.` : '',
        camera: cfg.photos || cfg.camera ? `${cfg.nom} utilise l’appareil photo pour prendre une photo.` : '',
        micro: cfg.camera ? `${cfg.nom} utilise le micro pendant les appels vidéo.` : '',
        localisation: cfg.localisation ? `${cfg.nom} utilise ta position pendant que tu t’en sers.` : ''
      }
    }, null, 2) + '\n';

    // ---------- package.json ----------
    const deps = Object.assign({ '@capacitor/core': M.CAPACITOR, '@capacitor/android': M.CAPACITOR, '@capacitor/ios': M.CAPACITOR }, plugins);
    if (cfg.impression && !distant) deps['capacitor-impression'] = 'file:plugins/impression';
    f['package.json'] = JSON.stringify({
      name: slug + '-mobile', version: cfg.version, private: true,
      description: `${cfg.nom} pour iOS et Android (Capacitor), généré par l’Atelier de Blocs`,
      scripts: {
        preparer: 'node outils/preparer.js',
        android: 'npx cap open android',
        ios: 'npx cap open ios',
        'emulateur:android': 'npx cap run android',
        'emulateur:ios': 'npx cap run ios',
        sync: 'npx cap sync'
      },
      engines: { node: '>=22' },
      dependencies: deps,
      devDependencies: { '@capacitor/cli': M.CAPACITOR, '@capacitor/assets': M.ASSETS }
    }, null, 2) + '\n';

    f['outils/preparer.js'] = `#!/usr/bin/env node
/* Prépare (ou met à jour) les projets iOS et Android à partir de mobile.json.
   Généré par l'Atelier de Blocs. Relance-le après chaque nouvel export : il est sans risque. */
(${PREPARER.toString()})();
`;
    if (cfg.impression && !distant) Object.assign(f, pluginImpression());
    Object.assign(f, images);
    f['.gitignore'] = 'node_modules/\nandroid/app/build/\nandroid/.gradle/\nandroid/build/\nios/App/build/\nios/DerivedData/\n*.keystore\n*.jks\n.env\n';
    f['.github/workflows/android.yml'] = workflowAndroid();
    f['README.md'] = readme(app, cfg, diag);
    // Dossier des stores de l'app (kit App complète 1.4) : joint tel quel, à côté du guide
    const dossier = M.dossierStore(source);
    if (dossier) Object.keys(dossier.fichiers).forEach(c => { f['store/' + c] = dossier.fichiers[c]; });
    f['GUIDE-STORES.md'] = guideStores(cfg, diag, dossier);
    f['SERVEUR.md'] = serveurMd(cfg, diag);
    return f;
  };

  /** Couleur foncée ? Capacitor : style DARK = texte clair (pour fond foncé), LIGHT = texte foncé. */
  const fonce = M.fonce = function (hex) {
    const h = String(hex || '').replace('#', '');
    if (h.length < 6) return false;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
  };

  /* ---------- outils/preparer.js (exécuté par Node chez l'utilisateur) ---------- */
  function PREPARER() {
    const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
    const ici = path.resolve(__dirname, '..');
    const lire = f => fs.readFileSync(path.join(ici, f), 'utf8');
    const ecrire = (f, t) => fs.writeFileSync(path.join(ici, f), t);
    const existe = f => fs.existsSync(path.join(ici, f));
    const lancer = cmd => { console.log('\n› ' + cmd); execSync(cmd, { cwd: ici, stdio: 'inherit' }); };
    const m = JSON.parse(lire('mobile.json'));
    const echapper = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (Number(process.versions.node.split('.')[0]) < 22) { console.error('Node 22 ou plus est nécessaire (node -v).'); process.exit(1); }
    if (!existe('node_modules/@capacitor/cli')) lancer('npm install');
    if (!existe('android')) lancer('npx cap add android');
    if (!existe('ios')) lancer('npx cap add ios');

    /* ---------- Android ---------- */
    let g = lire('android/app/build.gradle');
    g = g.replace(/versionCode\s+\d+/, 'versionCode ' + Math.max(1, m.build)).replace(/versionName\s+"[^"]*"/, 'versionName "' + m.version + '"');
    if (!g.includes('// Atelier de Blocs : signature')) {
      g += `
// Atelier de Blocs : signature de la version à publier, par variables d'environnement (jamais dans le code)
android {
    signingConfigs {
        if (System.getenv("AB_KEYSTORE_FICHIER")) {
            atelier {
                storeFile file(System.getenv("AB_KEYSTORE_FICHIER"))
                storePassword System.getenv("AB_KEYSTORE_MDP")
                keyAlias System.getenv("AB_CLE_ALIAS")
                keyPassword System.getenv("AB_CLE_MDP")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("AB_KEYSTORE_FICHIER")) signingConfig signingConfigs.atelier
        }
    }
}
`;
    }
    ecrire('android/app/build.gradle', g);
    let man = lire('android/app/src/main/AndroidManifest.xml');
    man = man.replace(/android:allowBackup="(true|false)"/, 'android:allowBackup="' + (m.sauvegardeAndroid ? 'true' : 'false') + '"');
    man = man.replace(/\s*android:screenOrientation="[^"]*"/, '');
    if (m.orientation === 'portrait') man = man.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"');
    const permsAndroid = [['camera', 'android.permission.CAMERA'], ['localisation', 'android.permission.ACCESS_FINE_LOCATION'], ['localisation', 'android.permission.ACCESS_COARSE_LOCATION'], ['micro', 'android.permission.RECORD_AUDIO']];
    permsAndroid.forEach(([cle, perm]) => {
      const ligne = '<uses-permission android:name="' + perm + '" />';
      if (m.permissions[cle] && !man.includes(ligne)) man = man.replace('</manifest>', '    ' + ligne + '\n</manifest>');
      if (!m.permissions[cle] && man.includes(ligne)) man = man.replace(new RegExp('\\s*' + ligne.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '');
    });
    ecrire('android/app/src/main/AndroidManifest.xml', man);
    const strings = 'android/app/src/main/res/values/strings.xml';
    if (existe(strings)) {
      ecrire(strings, lire(strings)
        .replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1' + echapper(m.nom) + '$2')
        .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, '$1' + echapper(m.nom) + '$2'));
    }

    /* ---------- iOS ---------- */
    const pbx = 'ios/App/App.xcodeproj/project.pbxproj';
    if (existe(pbx)) {
      ecrire(pbx, lire(pbx)
        .replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = ' + m.version + ';')
        .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = ' + Math.max(1, m.build) + ';')
        .replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g, 'TARGETED_DEVICE_FAMILY = ' + (m.appareils === 'iphone' ? '1' : '"1,2"') + ';'));
    }
    const plist = 'ios/App/App/Info.plist';
    if (existe(plist)) {
      let p = lire(plist);
      const poser = (cle, valeurXml) => {
        const re = new RegExp('\\s*<key>' + cle + '</key>\\s*(<string>[^<]*</string>|<true/>|<false/>|<array>[\\s\\S]*?</array>)');
        p = p.replace(re, '');
        if (valeurXml) p = p.replace(/<\/dict>\s*<\/plist>\s*$/, '\t<key>' + cle + '</key>\n\t' + valeurXml + '\n</dict>\n</plist>\n');
      };
      p = p.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, '$1' + echapper(m.nom) + '$2');
      p = p.replace(/(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)[^<]*(<\/string>)/, '$1fr$2');
      poser('ITSAppUsesNonExemptEncryption', '<false/>');   // seulement HTTPS : pas de déclaration d'export
      const portrait = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>';
      const toutes = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>';
      poser('UISupportedInterfaceOrientations', m.orientation === 'portrait' ? portrait : toutes);
      // L'iPad exige les 4 orientations (multitâche), sauf plein écran obligatoire
      poser('UISupportedInterfaceOrientations~ipad', '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>');
      poser('NSPhotoLibraryUsageDescription', m.permissions.photos ? '<string>' + echapper(m.permissions.photos) + '</string>' : '');
      poser('NSCameraUsageDescription', m.permissions.camera ? '<string>' + echapper(m.permissions.camera) + '</string>' : '');
      poser('NSMicrophoneUsageDescription', m.permissions.micro ? '<string>' + echapper(m.permissions.micro) + '</string>' : '');
      poser('NSLocationWhenInUseUsageDescription', m.permissions.localisation ? '<string>' + echapper(m.permissions.localisation) + '</string>' : '');
      ecrire(plist, p);
    }

    /* ---------- Icônes, écran de démarrage, copie de l'app ---------- */
    lancer('npx capacitor-assets generate --ios --android');
    lancer('npx cap sync');
    console.log('\n✔ ' + m.nom + ' ' + m.version + ' (build ' + m.build + ') prêt.');
    console.log('  Android : npm run android   (Android Studio › Build › Generate Signed App Bundle)');
    console.log('  iOS     : npm run ios       (sur Mac : Xcode › Product › Archive)');
  }

  /* ---------- plugins/impression : window.print() natif ---------- */
  function pluginImpression() {
    const d = 'plugins/impression/';
    return {
      [d + 'package.json']: JSON.stringify({
        name: 'capacitor-impression', version: '1.0.0', private: true,
        description: 'Imprime la page de l’app (AirPrint sur iOS, service d’impression sur Android). Fourni par l’Atelier de Blocs.',
        main: 'index.js', files: ['android/src/main/', 'android/build.gradle', 'ios/Sources', 'Package.swift', 'CapacitorImpression.podspec', 'index.js'],
        capacitor: { ios: { src: 'ios' }, android: { src: 'android' } },
        peerDependencies: { '@capacitor/core': '>=8.0.0' }
      }, null, 2) + '\n',
      [d + 'index.js']: "// Appelé par mobile-pont.js : Capacitor.nativePromise('Impression', 'imprimer', { nom })\nmodule.exports = {};\n",
      [d + 'Package.swift']: `// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorImpression",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapacitorImpression", targets: ["ImpressionPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "ImpressionPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/ImpressionPlugin")
    ]
)
`,
      [d + 'CapacitorImpression.podspec']: `Pod::Spec.new do |s|
  s.name = 'CapacitorImpression'
  s.version = '1.0.0'
  s.summary = 'Impression de la page (Atelier de Blocs)'
  s.license = 'MIT'
  s.homepage = 'https://capacitorjs.com'
  s.author = 'Atelier de Blocs'
  s.source = { :git => 'https://example.invalid/impression.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.9'
end
`,
      [d + 'ios/Sources/ImpressionPlugin/ImpressionPlugin.swift']: `import Foundation
import UIKit
import Capacitor

/// Imprime le contenu de la vue web (AirPrint, « Enregistrer en PDF » via le partage).
@objc(ImpressionPlugin)
public class ImpressionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ImpressionPlugin"
    public let jsName = "Impression"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "imprimer", returnType: CAPPluginReturnPromise)
    ]

    @objc func imprimer(_ call: CAPPluginCall) {
        let nom = call.getString("nom") ?? "Document"
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else {
                call.reject("Vue web introuvable")
                return
            }
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = nom
            let controleur = UIPrintInteractionController.shared
            controleur.printInfo = info
            controleur.printFormatter = webView.viewPrintFormatter()
            controleur.present(animated: true) { _, termine, erreur in
                if let erreur = erreur {
                    call.reject(erreur.localizedDescription)
                    return
                }
                call.resolve(["imprime": termine])
            }
        }
    }
}
`,
      [d + 'android/build.gradle']: `ext {
    androidxAppCompatVersion = project.hasProperty('androidxAppCompatVersion') ? rootProject.ext.androidxAppCompatVersion : '1.7.1'
}

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
    }
}

apply plugin: 'com.android.library'

android {
    namespace = "fr.atelierblocs.impression"
    compileSdk = project.hasProperty('compileSdkVersion') ? rootProject.ext.compileSdkVersion : 36
    defaultConfig {
        minSdkVersion project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 24
        targetSdkVersion project.hasProperty('targetSdkVersion') ? rootProject.ext.targetSdkVersion : 36
    }
    lintOptions {
        abortOnError = false
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_21
        targetCompatibility JavaVersion.VERSION_21
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation project(':capacitor-android')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
}
`,
      [d + 'android/src/main/AndroidManifest.xml']: '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n</manifest>\n',
      [d + 'android/src/main/java/fr/atelierblocs/impression/ImpressionPlugin.java']: `package fr.atelierblocs.impression;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Imprime le contenu de la vue web avec le service d'impression d'Android (ou « Enregistrer en PDF »). */
@CapacitorPlugin(name = "Impression")
public class ImpressionPlugin extends Plugin {

    @PluginMethod
    public void imprimer(PluginCall call) {
        String nom = call.getString("nom", "Document");
        getActivity().runOnUiThread(() -> {
            PrintManager gestionnaire = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            PrintDocumentAdapter adaptateur = getBridge().getWebView().createPrintDocumentAdapter(nom);
            gestionnaire.print(nom, adaptateur, new PrintAttributes.Builder().build());
            call.resolve();
        });
    }
}
`
    };
  }

  function workflowAndroid() {
    return `# Construit l'app Android sur GitHub, sans Android Studio.
# Sans secrets : un APK de test (non signé pour le store).
# Avec les secrets AB_KEYSTORE_BASE64, AB_KEYSTORE_MDP, AB_CLE_ALIAS, AB_CLE_MDP :
# le fichier .aab signé, à déposer sur Google Play.
name: Android
on:
  workflow_dispatch:
  push:
    tags: ['v*']
jobs:
  construire:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - name: Préparer
        run: npm install && node outils/preparer.js
      - name: Construire
        env:
          AB_KEYSTORE_BASE64: \${{ secrets.AB_KEYSTORE_BASE64 }}
          AB_KEYSTORE_MDP: \${{ secrets.AB_KEYSTORE_MDP }}
          AB_CLE_ALIAS: \${{ secrets.AB_CLE_ALIAS }}
          AB_CLE_MDP: \${{ secrets.AB_CLE_MDP }}
        run: |
          cd android
          if [ -n "$AB_KEYSTORE_BASE64" ]; then
            echo "$AB_KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/upload.jks"
            export AB_KEYSTORE_FICHIER="$RUNNER_TEMP/upload.jks"
            ./gradlew bundleRelease
          else
            ./gradlew assembleDebug
          fi
      - uses: actions/upload-artifact@v4
        with:
          name: android
          path: |
            android/app/build/outputs/bundle/release/*.aab
            android/app/build/outputs/apk/debug/*.apk
`;
  }

  /* ======================= Documents du projet ======================= */

  const liste = (constats, niveaux) => constats.filter(c => niveaux.includes(c.niveau)).map(c => `- **${c.titre}** — ${c.detail}`).join('\n');

  function readme(app, cfg, diag) {
    const distant = cfg.mode === 'distant';
    return `# ${cfg.nom} — app iOS et Android

Généré par l’Atelier de Blocs le ${new Date().toLocaleDateString('fr-FR')} · version **${cfg.version}** (build ${cfg.build}) · identifiant \`${cfg.appId}\`

${distant
    ? `Mode **site en ligne** : l’app ouvre ${cfg.url} dans une coquille native. Même serveur, mêmes comptes, rien à changer côté serveur.`
    : `Mode **app embarquée** : l’app web est dans \`www/\` et parle au même serveur qu’avant${cfg.api ? ` (${cfg.api})` : ''}.
Le petit script \`www/mobile-pont.js\` s’en charge, seulement dans l’app native (le site web ne change pas).`}

## Ce qu’il faut sur ton ordinateur

- **Node.js 22 ou plus** (\`node -v\`).
- **Android** : Android Studio (Windows, Mac ou Linux). Il installe Java et le SDK Android.
- **iOS** : un **Mac** avec la dernière version de **Xcode** (App Store du Mac). Pas de Mac ? Voir GUIDE-STORES.md.

## Construire

\`\`\`bash
npm run preparer     # installe, crée android/ et ios/, applique version, icônes, écran de démarrage, copie l’app
npm run android      # ouvre Android Studio : bouton ▶ pour l’essayer sur un téléphone ou un émulateur
npm run ios          # (Mac) ouvre Xcode : choisis ton équipe dans Signing & Capabilities, puis ▶
\`\`\`

\`npm run preparer\` se relance sans risque autant de fois qu’on veut.

## Essayer dans un émulateur

- **Sans rien installer** : l’Atelier a un onglet **Émulateur** (Apps mobiles › ${cfg.nom}) : l’app tourne dans un iPhone,
  un Android ou un iPad simulé, avec le pont mobile actif et le journal des appels au serveur.
- **Émulateur Android** (Windows, Mac, Linux) : dans Android Studio, Device Manager › créer un appareil (Pixel récent),
  puis \`npm run emulateur:android\` (choisis l’appareil dans la liste).
- **Simulateur iOS** (Mac) : \`npm run emulateur:ios\` (les simulateurs viennent avec Xcode).
- **Ton téléphone** : Android en USB avec le « débogage USB » activé, ou iPhone branché au Mac (mode développeur), même commande.

## Mettre à jour l’app

1. Dans l’Atelier, **Apps mobiles › ${cfg.nom} › Télécharger le projet** : le numéro de build augmente tout seul.
2. Supprime le dossier \`www/\` de ce projet, puis dézippe le nouveau ZIP **par-dessus** ce dossier
   (les dossiers \`android/\` et \`ios/\` ne sont pas dans le ZIP : ils sont gardés, avec ta signature).
3. \`npm run preparer\`, puis construis et dépose la nouvelle version (GUIDE-STORES.md, étape 5).

${distant ? '' : `Le serveur ne change pas. Si seule l’app web change, une nouvelle version sur les stores est nécessaire
(l’app embarque ses fichiers) ; garde le serveur compatible avec l’ancienne version le temps que tout le monde mette à jour.
`}
## Contenu

| Fichier | Rôle |
| --- | --- |
| \`www/\` | ${distant ? 'Pages de chargement et « pas de connexion »' : 'L’app web et `mobile-pont.js`'} |
| \`capacitor.config.json\` | Identifiant, nom, ${distant ? 'adresse du site' : 'réseau natif (CapacitorHttp, cookies)'}, écran de démarrage, barre d’état |
| \`mobile.json\` | Version, build, orientation, appareils, textes d’autorisation (appliqués par \`outils/preparer.js\`) |
| \`assets/\` | Icône et écran de démarrage d’origine, déclinés en toutes tailles par \`@capacitor/assets\` |
${cfg.impression && !distant ? '| `plugins/impression/` | Plugin natif pour `window.print()` (AirPrint, impression Android) |\n' : ''}| \`.github/workflows/android.yml\` | Construction Android sur GitHub (APK de test, ou .aab signé avec les secrets) |
| \`GUIDE-STORES.md\` | Comptes, signature, fiches des stores, revue : ce que toi seul peux faire |
| \`SERVEUR.md\` | Ce qui change (ou pas) côté serveur : CORS, cookies, origine |

## Diagnostic au moment de l’export

${liste(diag.constats, ['crit', 'warn', 'info', 'ok']) || '- Rien à signaler.'}
`;
  }

  function guideStores(cfg, diag, dossier) {
    const fiche = dossier && dossier.fiche;
    return `# Publier ${cfg.nom} sur l’App Store et Google Play

Ce que l’Atelier ne peut pas faire à ta place : les comptes, la signature, les fiches et l’envoi.
Identifiant de l’app : \`${cfg.appId}\` (le même sur les deux stores ; il ne change plus une fois publié).
${dossier ? `
**Le dossier \`store/\` de l’app est joint** (kit « App complète » 1.4) : \`store/PUBLIER.md\` (la liste complète),
\`store/GOOGLE-PLAY.md\` et \`store/APP-STORE.md\` (chaque champ des deux consoles, prêt à copier)${dossier.visuels ? ', et \`store/visuels/\` (icônes, bannière, captures)' : ''}.
Ils remplacent l’étape 5 ci-dessous.${fiche && fiche.identifiant && fiche.identifiant !== cfg.appId ? `
⚠️ La fiche des stores annonce l’identifiant \`${fiche.identifiant}\`, différent de celui du projet : mets le même des deux côtés.` : ''}
` : ''}
## 1. Les comptes (une seule fois)

- **Apple Developer Program** : 99 $ par an, sur developer.apple.com/programs. Compte personnel (ton nom affiché)
  ou organisation (nom de la société, numéro **D-U-N-S** gratuit à demander avant, compter 1 à 2 semaines).
- **Google Play Console** : 25 $ une seule fois, sur play.google.com/console, avec vérification d’identité.
  Un **compte personnel** récent doit faire un **test fermé avec au moins 12 testeurs pendant 14 jours**
  avant de pouvoir publier en production ; un compte organisation (D-U-N-S) en est dispensé.

## 2. Le matériel

- **Android** : n’importe quel ordinateur avec Android Studio. Ou sans rien installer : pousse le projet sur GitHub,
  l’action « Android » construit l’app (voir étape 4).
- **iOS** : un **Mac** avec la dernière version de **Xcode** (Apple impose un SDK récent pour les envois).
  Sans Mac : un Mac en location dans le cloud (MacinCloud…), ou un service de build iOS (Codemagic, Ionic Appflow,
  GitHub Actions macOS) — il faudra alors y déposer les certificats de signature.

## 3. Signature

- **iOS** : Xcode › projet App › Signing & Capabilities › coche « Automatically manage signing » et choisis ton équipe.
  Xcode crée certificat et profil tout seul.
- **Android** : Android Studio › Build › Generate Signed App Bundle › « Create new » : crée la **clé d’envoi** (fichier .jks).
  **Garde ce fichier et ses mots de passe en lieu sûr** (gestionnaire de mots de passe + copie hors de l’ordinateur) :
  sans eux, plus de mise à jour possible. Active « Play App Signing » (proposé par défaut) : Google garde la clé finale.
  Pour GitHub : ajoute les secrets \`AB_KEYSTORE_BASE64\` (\`base64 -i upload.jks\`), \`AB_KEYSTORE_MDP\`, \`AB_CLE_ALIAS\`, \`AB_CLE_MDP\`.

## 4. Construire la version à envoyer

- **iOS** : \`npm run ios\`, choisis « Any iOS Device », puis Product › Archive › Distribute App › App Store Connect.
  La version apparaît dans **TestFlight** (pour l’essayer sur ton iPhone) en 15 à 30 minutes.
- **Android** : Build › Generate Signed App Bundle › release → \`android/app/release/app-release.aab\`
  (ou l’artefact de l’action GitHub). Pour essayer avant : \`npm run android\` puis ▶ sur ton téléphone branché.

## 5. Les fiches des stores

À préparer pour les deux :

- [ ] Nom (30 caractères), sous-titre / description courte, description complète, mots-clés (iOS), catégorie.
- [ ] **Politique de confidentialité** : une page en ligne (obligatoire).
- [ ] Captures d’écran : iPhone 6,9" (1320 × 2868)${cfg.appareils === 'iphone' ? '' : ', iPad 13" (2064 × 2752) car l’app tourne sur iPad'} ; Android : au moins 2 captures
      de téléphone, plus l’icône 512 × 512 et une bannière 1024 × 500 (Play).
- [ ] **Confidentialité des données** : « App Privacy » (App Store Connect) et « Sécurité des données » (Play Console) :
      quelles données, pourquoi, liées à la personne ou non, chiffrées en transit (oui : HTTPS).
- [ ] Classification par âge (questionnaire), public cible (Play), coordonnées de support.
- [ ] **Accès pour la revue** : si l’app demande une connexion, un compte de démonstration et la marche à suivre
      (App Store Connect › App Review Information ; Play Console › Accès à l’application).
- [ ] Chiffrement (iOS) : déjà répondu dans l’app (\`ITSAppUsesNonExemptEncryption = false\`, l’app n’utilise que HTTPS).

## 6. Envoyer en revue

- **App Store Connect** : Mon app › + Version › choisis le build › Soumettre. Réponse en général sous 24 à 48 h.
- **Play Console** : Tests › test interne (immédiat) → test fermé → Production › Créer une version › importer le .aab.
  La première revue peut prendre plusieurs jours.
- Chaque nouvel envoi doit avoir un **numéro de build plus grand** : l’Atelier l’augmente à chaque export.

## Points propres à cette app

${liste(diag.constats, ['crit', 'warn', 'info']) || '- Rien de particulier.'}

## Raisons de refus fréquentes

- **4.2 (Apple)** : l’app ne fait qu’afficher un site. Une app embarquée, utilisable, avec ses propres écrans, passe bien mieux.
- **5.1.1 (Apple)** : création de compte sans moyen de supprimer son compte depuis l’app.
- **3.1.1 (Apple)** : abonnement ou contenu numérique payé hors des achats intégrés.
- **2.1** : compte de démonstration absent ou qui ne marche pas, liens morts, plantage au lancement.
- **Google Play** : formulaire « Sécurité des données » incomplet ou faux, politique de confidentialité absente.
`;
  }

  function serveurMd(cfg, diag) {
    const api = origine(cfg.api) || 'https://api.exemple.fr';
    const entetes = ['Content-Type', 'Authorization'].concat(diag.entetes || []);
    if (cfg.mode === 'distant') {
      return `# Côté serveur — ${cfg.nom}

Mode **site en ligne** : l’app ouvre ${cfg.url}. Pour le serveur, c’est un navigateur comme un autre, à la même adresse :
**rien à changer** (mêmes cookies, même CORS, même origine).

À vérifier seulement : le site doit être en **https** avec un certificat valide, et ne pas interdire l’affichage
dans une vue web (aucun en-tête ne l’empêche par défaut ; \`X-Frame-Options\` ne concerne que les iframes).
`;
    }
    return `# Côté serveur — ${cfg.nom}

L’app embarquée tourne à l’adresse \`capacitor://localhost\` (iOS) ou \`https://localhost\` (Android).
Elle appelle ${cfg.api ? `**${cfg.api}**` : 'ton serveur'}${(cfg.prefixes || []).length ? ` pour ${cfg.prefixes.join(', ')}` : ''}.

## Mode réseau choisi : ${cfg.reseau === 'webview' ? '« navigateur »' : '« natif » (recommandé)'}

${cfg.reseau === 'webview' ? '' : `Les appels à l’API passent par le système du téléphone (CapacitorHttp), pas par la vue web :

- **pas de CORS** à configurer ;
- les **cookies de session** (même \`HttpOnly\`, \`Secure\`, \`SameSite=Strict\`, préfixe \`__Host-\`) sont gardés par l’app
  et renvoyés au serveur comme dans un navigateur ;
- aucun en-tête \`Origin\` n’est envoyé : si ton serveur refuse les écritures **sans** origine, accepte l’absence d’origine
  (la protection CSRF par en-tête personnalisé${(diag.entetes || []).length ? `, ici ${diag.entetes.join(', ')},` : ''} reste valable : une page web tierce ne peut pas l’ajouter) ;
- le certificat HTTPS doit être valide (pas de certificat auto-signé).

**Donc rien à modifier côté serveur dans la plupart des cas.** La suite ne sert que si tu passes en mode « navigateur ».
`}
## Si l’app passe par la vue web (mode « navigateur »)

Le serveur doit alors autoriser ces deux origines, avec les cookies :

\`\`\`
Access-Control-Allow-Origin: capacitor://localhost   (ou https://localhost : renvoyer l’origine reçue si elle est dans la liste)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: ${entetes.join(', ')}
Vary: Origin
\`\`\`

Et les cookies de session doivent être \`SameSite=None; Secure\` (sinon ils ne partent pas vers ${api}).
Sur iPhone, les cookies d’un autre domaine restent souvent bloqués (protection anti-pistage) : préfère un jeton
(\`Authorization: Bearer …\`) ou le mode natif.

### Node (http natif, sans dépendance)

\`\`\`js
const ORIGINES_APP = ['capacitor://localhost', 'https://localhost'];
function cors(req, res) {
  const o = req.headers.origin;
  if (ORIGINES_APP.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '${entetes.join(', ')}');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }
  return false;
}
// au début du traitement de chaque requête : if (cors(req, res)) return;
// et dans le contrôle d'origine (CSRF) : accepter aussi ORIGINES_APP.
\`\`\`

### Express

\`\`\`js
const cors = require('cors');
app.use(cors({ origin: ['capacitor://localhost', 'https://localhost', '${api}'], credentials: true }));
\`\`\`

### NestJS (main.ts)

\`\`\`ts
app.enableCors({ origin: ['capacitor://localhost', 'https://localhost', '${api}'], credentials: true });
\`\`\`

### Caddy

\`\`\`
@app header_regexp Origin ^(capacitor://localhost|https://localhost)$
header @app Access-Control-Allow-Origin {http.request.header.Origin}
header @app Access-Control-Allow-Credentials true
header @app Vary Origin
\`\`\`

### Supabase

Rien à faire pour les tables et les fonctions (la clé publique et le jeton de session suffisent).
Pour la connexion par lien e-mail ou par Google/Apple, ajoute l’adresse de retour dans Authentication › URL Configuration.
`;
  }

  /* ======================= Émulateur (aperçu dans l'Atelier) ======================= */
  // L'app tourne dans un téléphone simulé, AVEC le pont mobile, comme dans l'app native :
  // un faux Capacitor répond à la place d'iOS ou d'Android et raconte tout à l'Atelier (journal).

  /* Ce code est chargé avant mobile-pont.js, seulement dans l'aperçu. */
  function FAUX(P) {
    'use strict';
    function dire(m) { try { window.parent.postMessage(Object.assign({ abApercu: true }, m), '*'); } catch (e) { /* hors cadre */ } }
    if (P.page) window.AB_MOBILE_PAGE = P.page;
    // Sans serveur (page intégrée), l'historique refuse les adresses : on garde l'état sans changer l'adresse,
    // sinon le routeur (Vue Router…) recharge le cadre sur la page de l'Atelier.
    ['pushState', 'replaceState'].forEach(function (k) {
      var orig = history[k].bind(history);
      history[k] = function (etat, titre, url) { try { return orig(etat, titre, url); } catch (e) { return orig(etat, titre); } };
    });
    var fichiers = {};
    var imprimer = window.print.bind(window);
    window.Capacitor = {
      DEBUG: false,
      isNativePlatform: function () { return true; },
      getPlatform: function () { return P.plateforme; },
      PluginHeaders: [{ name: 'Impression' }],
      nativePromise: function (plugin, methode, o) {
        o = o || {};
        if (plugin === 'Filesystem' && methode === 'writeFile') { fichiers['apercu://' + o.path] = o.data; return Promise.resolve({ uri: 'apercu://' + o.path }); }
        if (plugin === 'Share' && methode === 'share') {
          (o.files || []).forEach(function (u) { dire({ type: 'fichier', nom: u.replace('apercu://', ''), data: fichiers[u] || '' }); });
          return Promise.resolve({});
        }
        if (plugin === 'Impression') { dire({ type: 'natif', texte: 'Impression demandée : « ' + (o.nom || '') + ' »' }); setTimeout(imprimer, 50); return Promise.resolve({}); }
        dire({ type: 'natif', texte: plugin + '.' + methode });
        return Promise.resolve({});
      }
    };
    // Journal du réseau : ces enveloppes sont posées AVANT le pont, elles voient donc l'adresse finale
    var f = window.fetch;
    window.fetch = function (r, o) {
      var url = typeof r === 'string' ? r : (r && r.url) || String(r), m = (o && o.method) || (r && r.method) || 'GET';
      return f.apply(window, arguments).then(function (res) { dire({ type: 'requete', methode: m, url: url, statut: res.status }); return res; },
        function (e) { dire({ type: 'requete', methode: m, url: url, erreur: String(e && e.message || e) }); throw e; });
    };
    var ouvrir = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, url) {
      var x = this;
      x.addEventListener('loadend', function () { dire({ type: 'requete', methode: m, url: String(url), statut: x.status || undefined, erreur: x.status ? undefined : 'échec' }); });
      return ouvrir.apply(x, arguments);
    };
    window.addEventListener('error', function (e) { dire({ type: 'erreur', texte: e.message + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '') }); });
    window.addEventListener('unhandledrejection', function (e) { dire({ type: 'erreur', texte: 'Promesse rejetée : ' + (e.reason && e.reason.message || e.reason) }); });
    dire({ type: 'demarrage', plateforme: P.plateforme });
    setTimeout(function () {
      var b = document.body;
      if (b && !(b.innerText || '').trim() && !b.querySelector('img,canvas,svg,video')) dire({ type: 'blanc' });
    }, 4000);
  }

  /** Fichiers de l'app tels que dans l'app native (www/), plus le faux Capacitor. */
  M.apercuFichiers = function (cfg, source, plateforme, page) {
    const www = wwwEmbarque(source, cfg), out = {};
    const faux = `/* Aperçu de l'Atelier : remplace iOS / Android */\n(${FAUX.toString()})(${JSON.stringify({ plateforme, page: page || '' })});\n`;
    Object.keys(www).forEach(c => {
      let v = www[c];
      if (/\.html?$/i.test(c)) v = M.texte(v).replace('<script src="/mobile-pont.js">', '<script src="/apercu-capacitor.js"><\/script>\n  <script src="/mobile-pont.js">');
      out[c.replace(/^www\//, '')] = v;
    });
    out['apercu-capacitor.js'] = faux;
    return out;
  };

  /** Envoie l'aperçu au serveur local, qui le sert à la racine (comme Capacitor). Renvoie son adresse.
      relais : port d'une app lancée par le serveur local (ab-construire.js) : /api et le reste y sont relayés. */
  M.envoyerApercu = async function (fichiers, relais) {
    const charge = {};
    for (const c of Object.keys(fichiers)) {
      const o = M.octets(fichiers[c]);
      let bin = '';
      for (let i = 0; i < o.length; i += 32768) bin += String.fromCharCode.apply(null, o.subarray(i, i + 32768));
      charge[c] = btoa(bin);
    }
    const base = await AB.ia.adresse();
    const r = await fetch(base + '/api/mobile/apercu', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify({ fichiers: charge, relais: relais || null }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erreur || 'Serveur local : erreur ' + r.status);
    return j.url;
  };

  const TYPES_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
    woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', json: 'application/json', css: 'text/css', js: 'text/javascript' };
  function enDataUrl(chemin, v) {
    const o = M.octets(v);
    let bin = '';
    for (let i = 0; i < o.length; i += 32768) bin += String.fromCharCode.apply(null, o.subarray(i, i + 32768));
    return `data:${TYPES_MIME[(chemin.split('.').pop() || '').toLowerCase()] || 'application/octet-stream'};base64,${btoa(bin)}`;
  }
  function resoudre(depuis, ref) {
    if (/^(https?:|data:|blob:|\/\/|#|mailto:|tel:)/i.test(ref)) return null;
    const parties = (ref.startsWith('/') ? [] : depuis.split('/').slice(0, -1)).concat(ref.split(/[?#]/)[0].split('/'));
    const pile = [];
    parties.forEach(p => { if (p === '..') pile.pop(); else if (p && p !== '.') pile.push(p); });
    return pile.join('/');
  }

  /** Sans serveur local : une seule page (scripts, styles, images et polices intégrés). */
  M.apercuEnLigne = function (fichiers) {
    const lire = (depuis, ref) => { const c = resoudre(depuis, ref); return c !== null && fichiers[c] !== undefined ? c : null; };
    const css = (chemin, texte) => texte.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (tout, q, ref) => { const c = lire(chemin, ref); return c ? `url("${enDataUrl(c, fichiers[c])}")` : tout; });
    let html = M.texte(fichiers['index.html'] || '');
    const modules = /<script[^>]+type=["']module["']/i.test(html);
    html = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i, '<!-- CSP retirée dans l’aperçu -->');
    const blobs = [];
    if (modules) html = modulesEnLigne(fichiers, html, lire, css, blobs);
    html = html.replace(/<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi, (tout, a, ref, b) => {
      const c = lire('index.html', ref);
      return c ? `<script${(a + b).replace(/\s(crossorigin|defer|async)(=["'][^"']*["'])?/gi, '')}>${M.texte(fichiers[c]).replace(/<\/(script)/gi, '<\\/$1')}<\/script>` : tout;
    });
    html = html.replace(/<link([^>]*)>/gi, (tout, attrs) => {
      const href = /\shref=["']([^"']+)["']/i.exec(attrs), rel = /\srel=["']([^"']+)["']/i.exec(attrs);
      if (!href || !rel) return tout;
      const c = lire('index.html', href[1]);
      if (!c) return tout;
      if (/stylesheet/i.test(rel[1])) return `<style>${css(c, M.texte(fichiers[c]))}</style>`;
      if (/icon/i.test(rel[1])) return tout.replace(href[1], enDataUrl(c, fichiers[c]));
      return '';
    });
    html = html.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (tout, a, ref, b) => { const c = lire('index.html', ref); return c ? a + enDataUrl(c, fichiers[c]) + b : tout; });
    html = html.replace(/<style>([\s\S]*?)<\/style>/gi, (tout, t) => `<style>${css('index.html', t)}</style>`);
    return { html, modules: false, enModules: modules, blobs };
  };

  /* App en modules (Vite…) sans serveur : chaque module devient une adresse blob:, et une « import map »
     relie les adresses virtuelles https://apercu.atelier/<chemin> à ces blobs. Les imports relatifs sont
     réécrits vers ces adresses virtuelles : l'ordre de chargement et les imports circulaires restent ceux
     du navigateur. Les CSS des pages chargées à la demande sont posées d'avance. */
  function modulesEnLigne(fichiers, html, lire, css, blobs) {
    const V = 'https://apercu.atelier/', carte = {}, binaires = {};
    const enBlob = (v, type) => { const u = URL.createObjectURL(new Blob([v], { type })); blobs.push(u); return u; };
    const type = c => TYPES_MIME[(c.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';
    const binaire = c => binaires[c] || (binaires[c] = enBlob(fichiers[c], type(c)));
    const estJs = c => /\.m?js$/i.test(c);
    Object.keys(fichiers).filter(estJs).forEach(c => {
      const dossier = c.slice(0, c.lastIndexOf('/') + 1);
      const t = M.texte(fichiers[c]).replace(/(["'`])((?:\.{1,2}\/|\/)?[\w@.\/-]+?\.[a-z0-9]{2,5})\1/gi, (tout, q, ref) => {
        const relatif = /^[./]/.test(ref);
        const cible = relatif ? lire(c, ref) : (fichiers[dossier + ref] !== undefined ? dossier + ref : null);
        if (!cible || /\.css$/i.test(cible)) return tout;
        if (estJs(cible)) return relatif ? q + V + cible + q : tout;
        return q + binaire(cible) + q;
      });
      carte[V + c] = enBlob(t, 'text/javascript');
    });
    const liees = new Set();
    html = html.replace(/<script([^>]*)\stype=["']module["']([^>]*)><\/script>/gi, (tout, a, b) => {
      const src = /\ssrc=["']([^"']+)["']/i.exec(a + b);
      const c = src && lire('index.html', src[1]);
      return c ? `<script type="module">import ${JSON.stringify(V + c)};<\/script>` : tout;
    });
    html.replace(/<link[^>]+href=["']([^"']+\.css)["']/gi, (t, ref) => { const c = lire('index.html', ref); if (c) liees.add(c); });
    const styles = Object.keys(fichiers).filter(c => /\.css$/i.test(c) && !liees.has(c)).map(c => `<style>${css(c, M.texte(fichiers[c]))}</style>`).join('\n');
    const tete = `<script type="importmap">${JSON.stringify({ imports: carte }).replace(/</g, '\\u003c')}<\/script>
<script>window.addEventListener('vite:preloadError', function (e) { e.preventDefault(); });<\/script>\n`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + '\n' + tete) : tete + html;
    return html.replace(/<\/head>/i, styles + '\n</head>');
  }

  /* ======================= Export ======================= */

  /** Construit le ZIP du projet. Renvoie { blob, nom, diag }. */
  M.exporter = async function (app, cfg, source) {
    const diag = M.analyser(source, cfg);
    const images = await M.images(cfg, app);
    const fichiers = M.fichiers(app, cfg, source, images, diag);
    const racine = (U.slug(cfg.nom) || 'app') + '-mobile/';
    const zip = {};
    Object.keys(fichiers).forEach(c => { zip[racine + c] = fichiers[c]; });
    return { blob: AB.zip(zip), nom: `${U.slug(cfg.nom) || 'app'}-mobile-${cfg.version}-build${cfg.build}.zip`, diag, fichiers };
  };
})();
