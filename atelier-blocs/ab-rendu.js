/* ==========================================================================
   ab-rendu.js — transforme une app (blocs + réglages + kits) en vraie app
   PWA : HTML, CSS, JS, manifest, service worker, backend Supabase.
   - AB.rendu.apercu(app)   : une seule page HTML autonome (pour l'iframe) ;
   - AB.rendu.fichiers(app) : tous les fichiers du ZIP à déployer.
   Les kits s'appliquent ici : thème hérité de la charte, règles de sécurité
   (CSP, HTTPS, écrans protégés), formats et mentions d'affichage.
   ========================================================================== */
(function () {
  const U = AB.u;
  const R = AB.rendu = {};

  R.THEME_DEFAUT = { primaire: '#001047', accent: '#2962ff', fond: '#f4f5f7', texte: '#101012', police: 'Inter', rayon: 12 };
  R.POLICES = AB.kits.POLICES;

  /** Thème final : valeurs par défaut ← kit charte ← surcharges propres à l'app. */
  R.theme = function (app) {
    const charte = AB.kits.resoudre(app).charte;
    return Object.assign({}, R.THEME_DEFAUT, charte ? charte.valeurs : {}, app.surcharges || {});
  };

  /** Liste des pages de l'app : un écran de bloc = une page. */
  R.resoudre = function (app) {
    const pages = [], inits = [], manquants = [];
    (app.blocs || []).forEach(inst => {
      const def = AB.blocs.get(inst.bloc, inst.version);
      if (!def) { manquants.push(`${inst.bloc}@${inst.version}`); return; }
      const reglages = Object.assign(AB.blocs.reglagesParDefaut(def), inst.reglages || {}, { __instance: inst.uid });
      // Bloc à panneau « design » : les skins créés pour cette app partent avec elle
      if (def.panneau === 'design') reglages.__skins = ((app.design || {}).skins || []).map(s => Object.assign({}, s, { fourni: undefined }));
      if (def.init.trim()) inits.push({ cle: inst.uid, bloc: def, js: def.init, reglages });
      def.ecrans.forEach(e => {
        pages.push({
          cle: `${inst.uid}-${e.id}`,
          inst: inst.uid,
          bloc: def,
          role: e.role || '',
          cache: !!e.cache,
          protege: !!inst.protege,
          // Titre en texte brut : il sera échappé à l'affichage.
          titre: String(e.titre || def.nom).replace(/\{\{(\w+)\}\}/g, (m, c) => reglages[c] !== undefined ? reglages[c] : ''),
          icone: e.icone || def.icone,
          html: AB.blocs.gabarit(e.html, reglages),
          gabarit: e.html || '', titreBrut: e.titre || def.nom,
          css: e.css || '',
          js: e.js || '',
          reglages
        });
      });
    });
    return { pages, inits, manquants };
  };

  /* ---------- Contenu modifiable en direct (bloc « Mode admin ») ---------- */
  /** Réglages modifiables depuis l'app publiée : textes et listes seulement (jamais un prix, une couleur ou une option). */
  const TYPES_CONTENU = ['texte', 'texte-long', 'liste'];
  R.avecContenu = app => (app.blocs || []).some(i => i.bloc === 'admin-contenu');
  /** Champs modifiables par instance de bloc : { uid: [{ cle, label, type }] }. */
  R.modifiables = function (app) {
    const m = {};
    (app.blocs || []).forEach(inst => {
      const def = AB.blocs.get(inst.bloc, inst.version);
      if (!def || def.id === 'admin-contenu') return;
      const champs = def.reglages.filter(r => TYPES_CONTENU.includes(r.type)).map(r => ({ cle: r.cle, label: r.label, type: r.type }));
      if (champs.length) m[inst.uid] = champs;
    });
    return m;
  };
  /** Code embarqué dans l'app : applique les valeurs enregistrées et redessine les écrans concernés.
      Il est injecté tel quel (toString) dans le JS généré. */
  function contenuRuntime(CONTENU, reglages, appli) {
    const esc = v => String(v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const lignes = v => Array.isArray(v) ? v : String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
    const gabarit = (texte, r) => String(texte || '')
      .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, cle, corps) => lignes(r[cle]).map(l => corps.replace(/\{\{\.\}\}/g, esc(l))).join(''))
      .replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, cle, corps) => { const v = r[cle]; return v && v !== 'false' ? corps : ''; })
      .replace(/\{\{(\w+)\}\}/g, (m, cle) => esc(r[cle] !== undefined ? r[cle] : ''));
    const titre = (t, r) => String(t).replace(/\{\{(\w+)\}\}/g, (m, c) => r[c] !== undefined ? r[c] : '');
    const reglagesDe = uid => Object.keys(reglages).filter(k => reglages[k].__instance === uid).map(k => reglages[k]);
    /** valeurs : { uid: { cle: texte } } ; seuls les champs déclarés modifiables sont pris. */
    function appliquer(valeurs) {
      Object.keys(valeurs || {}).forEach(uid => {
        const v = {};
        (CONTENU.modifiables[uid] || []).forEach(m => { const x = (valeurs[uid] || {})[m.cle]; if (typeof x === 'string') v[m.cle] = x; });
        if (!Object.keys(v).length) return;
        reglagesDe(uid).forEach(r => Object.assign(r, v));
        Object.keys(CONTENU.gabarits).forEach(cle => {
          const g = CONTENU.gabarits[cle];
          if (g.inst !== uid) return;
          const page = document.querySelector('.ap-page[data-page="' + cle + '"]');
          const racine = page && page.querySelector(':scope > .ap-contenu');
          if (racine) racine.innerHTML = gabarit(g.html, reglages[cle]);
          const o = document.querySelector('.ap-onglet[data-page="' + cle + '"]');
          if (o) { const icone = o.querySelector('.mdi'); o.textContent = titre(g.titre, reglages[cle]); if (icone) o.prepend(icone); }
        });
      });
    }
    return {
      /** Champs modifiables de l'écran affiché, avec leur valeur actuelle. */
      champs(cle) {
        const uid = (CONTENU.gabarits[cle] || {}).inst, r = reglagesDe(uid)[0] || {};
        return { instance: uid, champs: (CONTENU.modifiables[uid] || []).map(m => Object.assign({ valeur: Array.isArray(r[m.cle]) ? r[m.cle].join('\n') : String(r[m.cle] === undefined ? '' : r[m.cle]) }, m)) };
      },
      appliquer,
      /** Avant les écrans : valeurs enregistrées (fournies par le bloc), 2,5 s d'attente au plus, sinon la dernière copie. */
      pret() {
        const copie = appli.stockage.get('contenu') || null;
        return Promise.race([appli.attendre('contenu'), new Promise(ok => setTimeout(() => ok(undefined), 2500))]).then(v => {
          if (v) appli.stockage.set('contenu', v);
          appliquer(v || copie || {});
        });
      }
    };
  }

  /* ---------- CSS de base des apps générées ---------- */
  R.css = function (app) {
    const t = R.theme(app);
    const kits = AB.kits.resoudre(app);
    const cssKits = kits.tous.filter(k => k.css.trim()).map(k => `/* Kit ${k.nom} v${k.version} */\n${k.css}`).join('\n');
    return `/* Style généré par l'Atelier de Blocs — thème de l'app */
:root {
  --primaire: ${t.primaire}; --accent: ${t.accent}; --fond: ${t.fond}; --texte: ${t.texte};
  --carte: #fff; --bordure: #e4e7ec; --discret: #6b6e78; --rayon: ${Number(t.rayon) || 0}px;
  --police: '${String(t.police).replace(/'/g, '')}', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { font: 15px/1.5 var(--police); color: var(--texte); background: var(--fond); display: flex; flex-direction: column; }
.ap-entete { background: var(--primaire); color: #fff; padding: 14px 16px; font-weight: 600; font-size: 17px; display: flex; align-items: center; gap: 8px; }
.ap-pages { flex: 1; overflow: auto; }
.ap-page { display: none; padding: 16px; }
.ap-page.active { display: block; }
.ap-onglets { display: flex; background: var(--carte); border-top: 1px solid var(--bordure); overflow-x: auto; }
.ap-onglet { flex: 1; min-width: 64px; border: none; background: none; font: inherit; font-size: 11px; color: var(--discret); padding: 6px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; }
.ap-onglet .mdi { font-size: 22px; }
.ap-onglet.active { color: var(--accent); }
.ap-erreur { background: #fdecea; color: #c62828; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.ap-info { background: #e1f5fe; color: #01579b; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.ap-succes { background: #e8f5e9; color: #1b5e20; padding: 8px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
.ap-mentions { color: var(--discret); font-size: 11px; text-align: center; padding: 16px; white-space: pre-line; }
.ap-cookies { position: fixed; left: 12px; right: 12px; bottom: 76px; background: #101012; color: #fff; padding: 12px; border-radius: var(--rayon); font-size: 13px; display: flex; gap: 10px; align-items: center; z-index: 20; }
.ap-cookies button { background: #fff; color: #101012; border: none; border-radius: 6px; padding: 6px 12px; font: inherit; font-weight: 600; cursor: pointer; }
.avec-cookies .ap-page { padding-bottom: 110px; }
.ap-verrou { text-align: center; padding: 32px 16px; color: var(--discret); }
.ap-verrou .mdi { font-size: 40px; display: block; }
/* Composants utilisables par les blocs */
.titre { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
.sous-titre { color: var(--discret); margin: 0 0 16px; }
.carte { background: var(--carte); border: 1px solid var(--bordure); border-radius: var(--rayon); padding: 16px; margin-bottom: 12px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-weight: 600; border: none; border-radius: var(--rayon); padding: 12px 18px; background: var(--accent); color: #fff; cursor: pointer; text-decoration: none; }
.btn:disabled { opacity: .6; cursor: default; }
.btn.secondaire { background: var(--carte); color: var(--accent); border: 1px solid var(--accent); }
.btn.lien { background: none; color: var(--accent); padding: 6px 0; font-weight: 500; }
.btn.large { width: 100%; }
.champ { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.champ label { font-size: 13px; font-weight: 600; }
.champ input, .champ textarea, .champ select { font: inherit; padding: 10px 12px; border: 1px solid var(--bordure); border-radius: var(--rayon); background: var(--carte); color: var(--texte); }
.liste { list-style: none; margin: 0; padding: 0; background: var(--carte); border: 1px solid var(--bordure); border-radius: var(--rayon); overflow: hidden; }
.liste li { padding: 12px 16px; border-bottom: 1px solid var(--bordure); }
.liste li:last-child { border-bottom: none; }
.hero { background: var(--primaire); color: #fff; border-radius: var(--rayon); padding: 28px 20px; margin-bottom: 16px; }
.hero h1 { margin: 0 0 6px; font-size: 26px; }
.hero p { margin: 0 0 16px; opacity: .85; }
[hidden] { display: none !important; }
/* Impression (appli.imprimer) : seul le document demandé part à l'imprimante ou en PDF */
#ap-impression { display: none; }
@media print {
  body.ap-imprime > *:not(#ap-impression) { display: none !important; }
  body.ap-imprime #ap-impression { display: block; color: #000; font-size: 12pt; }
}
.prix { font-size: 28px; font-weight: 700; color: var(--primaire); }
.discret { color: var(--discret); font-size: 13px; }
.ap-toast { position: fixed; left: 50%; bottom: 80px; transform: translateX(-50%); background: #101012; color: #fff; padding: 10px 16px; border-radius: 20px; font-size: 13px; z-index: 30; max-width: 90%; }
${cssKits}`;
  };

  /* ---------- JS d'exécution des apps générées ----------
     Chaque bloc peut avoir un code d'initialisation (reglages, appli), lancé
     avant les écrans, et chaque écran un code (racine, reglages, appli).
     « appli » offre :
       aller(page), toast(texte), lire(table), enregistrer(table, ligne),
       modifier(table, id, champs), supprimer(table, id), param(nom), pageDu(idBloc),
       tracer(action, detail) (remplacé par le bloc Journal d'accès), imprimer(html), telecharger(nom, contenu, type),
       exporterDonnees(), importerDonnees(objet),
       stockage.get/set, charger(urlScript, integrite?), fournir(nom, valeur), attendre(nom),
       utilisateur, definirUtilisateur(u, evenement), surUtilisateur(fn),
       exigerConnexion(), prix(n), date(d), config, kit(type), demo, apercu. */
  R.runtime = function (app, pages, inits) {
    const s = AB.kits.valeurs(app, 'securite');
    const a = AB.kits.valeurs(app, 'affichage');
    const kits = { charte: R.theme(app), securite: s, affichage: a };
    // Seules les variables PUBLIQUES vont dans l'app ; les secrets restent sur le serveur.
    const config = {};
    R.env(app).filter(v => !v.secret).forEach(v => { config[v.cle] = (app.config || {})[v.cle] || v.defaut || ''; });
    const codeInits = inits.map(i => `  inits.push([${JSON.stringify(i.cle)}, function (reglages, appli) {\n${i.js}\n  }]);`).join('\n');
    const codeEcrans = pages.filter(p => p.js.trim()).map(p =>
      `  ecrans[${JSON.stringify(p.cle)}] = function (racine, reglages, appli) {\n${p.js}\n  };`).join('\n');
    const reglages = {};
    pages.forEach(p => { reglages[p.cle] = p.reglages; });
    inits.forEach(i => { reglages[i.cle] = i.reglages; });
    const contenu = R.avecContenu(app) ? {
      gabarits: Object.fromEntries(pages.map(p => [p.cle, { inst: p.inst, html: p.gabarit, titre: p.titreBrut }])),
      modifiables: R.modifiables(app)
    } : null;
    return `/* JS généré par l'Atelier de Blocs — ${app.nom} */
(function () {
  'use strict';
  const APERCU = !!window.AB_APERCU;
  const KITS = ${JSON.stringify(kits)};
  const CONFIG = ${JSON.stringify(config)};
  const reglages = ${JSON.stringify(reglages)};
  const CLE_DONNEES = ${JSON.stringify('app-' + (U.slug(app.nom) || 'sans-nom'))};

  // HTTPS obligatoire (kit cybersécurité), sauf en local et dans l'aperçu
  if (KITS.securite.httpsObligatoire && !APERCU && location.protocol === 'http:' && !/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)) {
    location.replace('https://' + location.host + location.pathname + location.search + location.hash);
    return;
  }

  // Stockage local (dans l'aperçu, le navigateur le bloque : on garde alors en mémoire)
  const memoire = {};
  const stockage = {
    get(cle) { try { const v = localStorage.getItem(CLE_DONNEES + ':' + cle); return v === null ? memoire[cle] : JSON.parse(v); } catch (e) { return memoire[cle]; } },
    set(cle, valeur) { memoire[cle] = valeur; try { localStorage.setItem(CLE_DONNEES + ':' + cle, JSON.stringify(valeur)); } catch (e) { /* mémoire seulement */ } }
  };

  // Services partagés entre blocs : un bloc « fournit », les autres « attendent »
  const services = {}, attentes = {};
  const ecouteurs = [];
  const fmtPrix = new Intl.NumberFormat(KITS.affichage.langue || 'fr-FR', { style: 'currency', currency: KITS.affichage.devise || 'EUR' });

  const appli = {
    apercu: APERCU,
    demo: APERCU,              // le bloc Connexion passe aussi en démo sans configuration
    config: CONFIG,
    kit: type => KITS[type] || {},
    stockage,
    utilisateur: null,
    retour: null,
    aller(page) { location.hash = page; },
    toast(texte) {
      const t = document.createElement('div');
      t.className = 'ap-toast'; t.textContent = texte;
      document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
    },
    lire(table) { return stockage.get('table:' + table) || []; },
    enregistrer(table, ligne) {
      const lignes = appli.lire(table);
      ligne = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cree_le: new Date().toISOString() }, ligne);
      lignes.push(ligne);
      stockage.set('table:' + table, lignes);
      document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table } }));
      return ligne;
    },
    modifier(table, id, champs) {
      const lignes = appli.lire(table), l = lignes.find(x => x.id === id);
      if (!l) return null;
      Object.assign(l, champs, { modifie_le: new Date().toISOString() });
      stockage.set('table:' + table, lignes);
      document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table } }));
      return l;
    },
    supprimer(table, id) {
      stockage.set('table:' + table, appli.lire(table).filter(x => x.id !== id));
      document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table } }));
    },
    /** Paramètre de l'adresse : #page?patient=… */
    param(nom) { return new URLSearchParams(location.hash.split('?')[1] || '').get(nom); },
    /** Clé de la page du premier écran d'un bloc de l'app (ex. 'patients'), ou ''. */
    pageDu(idBloc) { const p = document.querySelector('.ap-page[data-bloc="' + idBloc + '"]'); return p ? p.dataset.page : ''; },
    tracer() {},
    /** Imprime (ou enregistre en PDF) un document HTML préparé par un bloc, sans le reste de l'app. */
    imprimer(html) {
      let z = document.getElementById('ap-impression');
      if (!z) { z = document.createElement('div'); z.id = 'ap-impression'; document.body.appendChild(z); }
      z.innerHTML = html;
      document.body.classList.add('ap-imprime');
      const fin = () => { document.body.classList.remove('ap-imprime'); window.removeEventListener('afterprint', fin); };
      window.addEventListener('afterprint', fin);
      window.print();
    },
    /** Télécharge un fichier créé par l'app (sauvegarde, export). */
    telecharger(nom, contenu, type) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([contenu], { type: type || 'application/octet-stream' }));
      a.download = nom; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    /** Toutes les données de l'app sur cet appareil (sauvegarde). */
    exporterDonnees() {
      const d = {};
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(CLE_DONNEES + ':')) d[k.slice(CLE_DONNEES.length + 1)] = JSON.parse(localStorage.getItem(k)); } }
      catch (e) { Object.assign(d, memoire); }
      return d;
    },
    importerDonnees(d) { Object.keys(d || {}).forEach(k => stockage.set(k, d[k])); },
    charger(src, integrite) {
      return new Promise((ok, ko) => {
        const s = document.createElement('script');
        // integrite : empreinte SRI, le navigateur refuse le fichier s'il a été modifié sur le CDN
        if (integrite) { s.integrity = integrite; s.crossOrigin = 'anonymous'; }
        s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Chargement impossible : ' + src));
        document.head.appendChild(s);
      });
    },
    fournir(nom, valeur) {
      services[nom] = valeur;
      (attentes[nom] || []).forEach(f => f(valeur));
      delete attentes[nom];
    },
    attendre(nom) {
      if (nom in services) return Promise.resolve(services[nom]);
      return new Promise(ok => (attentes[nom] = attentes[nom] || []).push(ok));
    },
    definirUtilisateur(u, evenement) {
      appli.utilisateur = u || null;
      ecouteurs.forEach(f => f(appli.utilisateur, evenement));
      afficher();
    },
    surUtilisateur(f) { ecouteurs.push(f); f(appli.utilisateur); },
    /** Mène à l'écran de connexion, puis revient ici. Renvoie false si pas connecté. */
    exigerConnexion() {
      if (appli.utilisateur) return true;
      appli.retour = location.hash.slice(1).split('?')[0];
      const p = document.querySelector('.ap-page[data-role="connexion"]');
      if (p) appli.aller(p.dataset.page); else appli.toast('Connexion requise.');
      return false;
    },
    prix: n => fmtPrix.format(Number(n) || 0),
    date(d) {
      const x = new Date(d);
      return KITS.affichage.formatDate === 'long'
        ? x.toLocaleDateString(KITS.affichage.langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : x.toLocaleDateString(KITS.affichage.langue);
    }
  };

  // Contenu modifiable en direct (bloc « Mode admin »)
  const CONTENU = ${JSON.stringify(contenu)};
  if (CONTENU) appli.contenu = (${contenuRuntime.toString()})(CONTENU, reglages, appli);

  const inits = [], ecrans = {};
${codeInits}
${codeEcrans}

  /** Page demandée par l'adresse (#page ou #page?param=…). */
  const pageDemandee = () => location.hash.slice(1).split('?')[0];

  // Navigation entre les pages, avec les écrans réservés aux connectés
  function afficher() {
    const pages = document.querySelectorAll('.ap-page');
    if (!pages.length) return;
    const voulu = pageDemandee();
    const cible = document.querySelector('.ap-page[data-page="' + voulu + '"]') || document.querySelector('.ap-page:not([data-cache])') || pages[0];
    const avant = document.querySelector('.ap-page.active');
    pages.forEach(p => {
      p.classList.toggle('active', p === cible);
      // Un écran protégé n'affiche son contenu qu'à un utilisateur connecté
      if (p.hasAttribute('data-protege')) {
        const verrou = p.querySelector(':scope > .ap-verrou');
        const contenu = p.querySelector(':scope > .ap-contenu');
        verrou.hidden = !!appli.utilisateur;
        contenu.hidden = !appli.utilisateur;
      }
    });
    document.querySelectorAll('.ap-onglet').forEach(o => o.classList.toggle('active', o.dataset.page === cible.dataset.page));
    // Les écrans peuvent se rafraîchir quand on y revient (ou quand l'adresse change de paramètre)
    cible.dispatchEvent(new CustomEvent('ap:affiche', { detail: { avant: avant && avant.dataset.page } }));
    if (appli.utilisateur && appli.retour && cible.dataset.role === 'connexion') {
      const r = appli.retour; appli.retour = null; appli.aller(r);
    }
  }
  document.querySelectorAll('.ap-onglet').forEach(o => o.addEventListener('click', () => appli.aller(o.dataset.page)));
  document.querySelectorAll('.ap-verrou button').forEach(b => b.addEventListener('click', () => appli.exigerConnexion()));
  window.addEventListener('hashchange', afficher);

  // Lancement : initialisations des blocs, puis code de chaque écran
  const erreur = (racine, e) => {
    const d = document.createElement('div');
    d.className = 'ap-erreur';
    d.textContent = 'Erreur dans ce bloc : ' + String(e && e.message || e);
    racine.prepend(d);
  };
  inits.forEach(([cle, f]) => { try { f(reglages[cle], appli); } catch (e) { console.error(e); appli.toast('Erreur au démarrage d’un bloc : ' + e.message); } });
  // Sans configuration Supabase, personne ne fournira le client : on le dit tout de suite aux blocs qui l'attendent.
  if (!('supabase' in services) && !CONFIG.SUPABASE_URL) appli.fournir('supabase', null);
  function lancerEcrans() {
    Object.keys(ecrans).forEach(cle => {
      const page = document.querySelector('.ap-page[data-page="' + cle + '"]');
      const racine = page.querySelector(':scope > .ap-contenu') || page;
      try { ecrans[cle](racine, reglages[cle], appli); } catch (e) { erreur(racine, e); }
    });
    afficher();
  }
  // Avec le Mode admin, les textes enregistrés sont posés avant de lancer les écrans
  if (appli.contenu) appli.contenu.pret().then(lancerEcrans); else lancerEcrans();

  // Bandeau cookies (kit affichage)
  if (KITS.affichage.bandeauCookies && !stockage.get('cookies-vu')) {
    const b = document.createElement('div');
    b.className = 'ap-cookies';
    b.innerHTML = '<span></span><button type="button">OK</button>';
    b.querySelector('span').textContent = KITS.affichage.texteCookies;
    b.querySelector('button').onclick = () => { stockage.set('cookies-vu', true); b.remove(); document.body.classList.remove('avec-cookies'); };
    document.body.appendChild(b);
    document.body.classList.add('avec-cookies');   // laisse la place au bandeau sous le contenu
  }

  // Mode hors ligne (PWA), seulement quand l'app est servie en http(s)
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !APERCU) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
`;
  };

  /** Corps HTML commun à l'aperçu et à l'export. */
  function corps(app, pages, manquants) {
    const contenu = R.avecContenu(app);   // écrans enveloppés dans .ap-contenu : le Mode admin peut les redessiner
    const a = AB.kits.valeurs(app, 'affichage');
    const vide = !pages.length
      ? `<section class="ap-page active" data-page="vide"><div class="carte discret">Ajoute des blocs pour construire l'app.</div></section>` : '';
    const alerte = manquants.length
      ? `<div class="ap-erreur" style="margin:8px">Blocs introuvables : ${U.esc(manquants.join(', '))}</div>` : '';
    const visibles = pages.filter(p => !p.cache);
    const onglets = visibles.length > 1
      ? `<nav class="ap-onglets">${visibles.map(p => `<button class="ap-onglet" data-page="${U.esc(p.cle)}"><span class="mdi ${U.esc(p.icone)}"></span>${U.esc(p.titre)}</button>`).join('')}</nav>` : '';
    const mentions = a.mentions ? `<div class="ap-mentions">${U.esc(a.mentions)}</div>` : '';
    const section = p => {
      const attrs = `class="ap-page" data-page="${U.esc(p.cle)}" data-bloc="${U.esc(p.bloc.id)}"${p.role ? ` data-role="${U.esc(p.role)}"` : ''}${p.cache ? ' data-cache' : ''}`;
      if (!p.protege) return contenu ? `<section ${attrs}>\n<div class="ap-contenu">\n${p.html}\n</div>${mentions}</section>` : `<section ${attrs}>\n${p.html}\n${mentions}</section>`;
      return `<section ${attrs} data-protege>
<div class="ap-verrou"><span class="mdi mdi-lock-outline"></span><p>Cet écran est réservé aux utilisateurs connectés.</p><button class="btn" type="button">Se connecter</button></div>
<div class="ap-contenu" hidden>\n${p.html}\n</div>${mentions}</section>`;
    };
    return `<header class="ap-entete"><span class="mdi ${U.esc(app.icone || 'mdi-cellphone')}"></span>${U.esc(app.nom || 'Mon app')}</header>
${alerte}<main class="ap-pages">
${vide}${pages.map(section).join('\n')}
</main>
${onglets}`;
  }

  const CSS_BLOCS = pages => {
    const vus = new Set();
    return pages.filter(p => p.css.trim() && !vus.has(p.bloc.cle + p.css) && vus.add(p.bloc.cle + p.css))
      .map(p => `/* Bloc ${p.bloc.id} v${p.bloc.version} */\n${p.css}`).join('\n');
  };

  /** Icônes + police du thème (Google Fonts, sauf la police du système). */
  function liens(app) {
    const police = R.theme(app).police;
    const font = police === 'system-ui' ? ''
      : `\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(police)}:wght@400;600;700&display=swap">`;
    return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css" integrity="sha384-HphS8cQyN+eYiJ5PMbzShG6qZdRtvHPVLPkYb8JwMkmNgaIxrFVDhQe3jIbq3EZ2" crossorigin="anonymous">${font}`;
  }

  /** Règles CSP (kit cybersécurité) : scripts limités à l'app et à jsDelivr. */
  function reglesCsp() {
    return [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "base-uri 'self'", "form-action 'self'", "object-src 'none'"
    ];
  }
  function csp(app) {
    if (!AB.kits.valeurs(app, 'securite').csp) return '';
    return `<meta http-equiv="Content-Security-Policy" content="${reglesCsp().join('; ')}">\n  `;
  }

  /** En-têtes HTTP de sécurité, pour l'hébergeur (une balise meta ne peut pas tous les poser). */
  R.entetes = function (app) {
    const s = AB.kits.valeurs(app, 'securite');
    const e = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
      'Cross-Origin-Opener-Policy': 'same-origin'
    };
    if (s.csp) e['Content-Security-Policy'] = reglesCsp().concat(["frame-ancestors 'none'", 'upgrade-insecure-requests']).join('; ');
    if (!s.httpsObligatoire) delete e['Strict-Transport-Security'];
    return e;
  };

  const enLigne = js => js.replace(/<\/script/gi, '<\\/script');

  /** Une page HTML autonome, pour l'aperçu dans le téléphone simulé. */
  R.apercu = function (app) {
    const { pages, inits, manquants } = R.resoudre(app);
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${liens(app)}<style>${R.css(app)}\n${CSS_BLOCS(pages)}</style></head><body>
${corps(app, pages, manquants)}
<script>window.AB_APERCU = true;\n${enLigne(R.runtime(app, pages, inits))}</script></body></html>`;
  };

  /** Aperçu d'un seul bloc (atelier), avec des réglages donnés. */
  R.apercuBloc = function (def, reglages, kits) {
    const ancien = AB.blocs.get(def.id, def.version);
    // Le bloc en cours d'édition n'est peut-être pas encore enregistré : on le place temporairement.
    const temp = AB.blocs.normaliser(def);
    AB.blocs.toutes = AB.blocs.toutes.filter(b => b !== ancien).concat([temp]);
    try {
      return R.apercu({ nom: def.nom || 'Aperçu', icone: def.icone, kits: kits || AB.kits.parDefaut(),
        blocs: [{ uid: 'b1', bloc: temp.id, version: temp.version, reglages: reglages || {} }] });
    } finally {
      AB.blocs.toutes = AB.blocs.toutes.filter(b => b !== temp).concat(ancien ? [ancien] : []);
    }
  };

  /* ---------- Variables d'environnement ---------- */

  /** Toutes les variables demandées par les blocs de l'app, sans doublon. */
  R.env = function (app) {
    const vars = new Map();
    (app.blocs || []).forEach(inst => {
      const def = AB.blocs.get(inst.bloc, inst.version);
      if (!def) return;
      def.env.forEach(v => {
        if (!vars.has(v.cle)) vars.set(v.cle, Object.assign({ blocs: [] }, v));
        const x = vars.get(v.cle);
        if (v.secret) x.secret = true;   // secret dès qu'un bloc le déclare secret
        if (!x.blocs.includes(def.nom)) x.blocs.push(def.nom);
      });
    });
    return [...vars.values()];
  };

  /** Fichier .env.example : valeurs publiques, JAMAIS de valeur secrète. */
  R.envExample = function (app) {
    const vars = R.env(app);
    if (!vars.length) return '# Aucune variable d’environnement nécessaire.\n';
    return vars.map(v => `# ${v.role || ''} (bloc : ${v.blocs.join(', ')})${v.secret ? ' — SECRET : à renseigner sur le serveur uniquement' : ''}\n${v.cle}=${v.secret ? '' : ((app.config || {})[v.cle] || v.defaut || '')}`).join('\n\n') + '\n';
  };

  /* ---------- Backend généré (Supabase) ----------
     Généré seulement si un bloc déclare des tables ou des fonctions serveur.
     Dans le code d'une fonction, __INSTANCES__ est remplacé par la liste des
     instances du bloc dans l'app ([{ id, reglages }]) : c'est ainsi que les
     montants d'un paiement sont fixés côté serveur. */
  const TYPES_PG = {
    'uuid': 'uuid', 'texte': 'text', 'texte-long': 'text', 'entier': 'integer', 'decimal': 'numeric',
    'booleen': 'boolean', 'date': 'date', 'date-heure': 'timestamptz', 'json': 'jsonb'
  };

  /** Politiques RLS selon la règle d'accès de la table. */
  function politiques(t) {
    const n = t.nom;
    switch (t.acces) {
      case 'proprietaire': return `create policy "${n}_proprietaire" on public.${n} for all to authenticated
  using (utilisateur = auth.uid()) with check (utilisateur = auth.uid());`;
      case 'lecture-proprietaire': return `create policy "${n}_lecture_proprietaire" on public.${n} for select to authenticated
  using (utilisateur = auth.uid());`;
      case 'insertion-publique': return `create policy "${n}_insertion" on public.${n} for insert to anon, authenticated
  with check (true);`;
      case 'lecture-publique': return `create policy "${n}_lecture" on public.${n} for select to anon, authenticated
  using (true);`;
      default: return `-- Aucune politique : seules les fonctions serveur (clé service) accèdent à cette table.`;
    }
  }

  R.backend = function (app) {
    const tables = [], fonctions = [];
    const parBloc = {};
    (app.blocs || []).forEach(inst => {
      const def = AB.blocs.get(inst.bloc, inst.version);
      if (!def) return;
      (parBloc[def.id] = parBloc[def.id] || { def, instances: [] }).instances.push(inst);
    });
    Object.values(parBloc).forEach(({ def, instances }) => {
      def.tables.forEach(t => { if (!tables.find(x => x.nom === t.nom)) tables.push(Object.assign({ bloc: def.nom }, t)); });
      const liste = instances.map(i => ({ id: i.uid, reglages: Object.assign(AB.blocs.reglagesParDefaut(def), i.reglages || {}) }));
      def.serveur.forEach(f => {
        if (!fonctions.find(x => x.nom === f.nom)) fonctions.push(Object.assign({ bloc: def.nom }, f, { code: String(f.code || '').replace(/__INSTANCES__/g, JSON.stringify(liste, null, 2))
          .replace(/__MODIFIABLES__/g, JSON.stringify(Object.fromEntries(Object.entries(R.modifiables(app)).map(([uid, ch]) => [uid, ch.map(c => c.cle)])), null, 2)) }));
      });
    });
    const fichiers = {};
    if (tables.length) {
      const sql = tables.map(t => {
        const cols = (t.colonnes || []).filter(c => c[0] !== 'id' && c[0] !== 'cree_le')
          .map(c => `  ${c[0]} ${TYPES_PG[c[1]] || 'text'}${c[2] ? ' ' + c[2] : ''}`);
        return `-- Table ${t.nom} (bloc : ${t.bloc}) — accès : ${AB.blocs.ACCES_TABLE[t.acces] || t.acces}
create table if not exists public.${t.nom} (
  id uuid primary key default gen_random_uuid(),
${cols.map(c => c + ',').join('\n')}
  cree_le timestamptz not null default now()
);
alter table public.${t.nom} enable row level security;
${politiques(t)}`;
      }).join('\n\n');
      fichiers['supabase/migrations/0001_init.sql'] = `-- Généré par l'Atelier de Blocs pour ${app.nom}\n-- RLS activée sur toutes les tables (kit cybersécurité).\n\n${sql}\n`;
    }
    fonctions.forEach(f => {
      fichiers[`supabase/functions/${f.nom}/index.ts`] =
        `// Fonction « ${f.nom} » (bloc : ${f.bloc}) — ${f.methode || 'POST'}${f.public ? ' — appelée sans session (webhook)' : ''}\n// Les secrets se lisent avec Deno.env.get('NOM'), jamais depuis le navigateur.\n${f.code}\n`;
    });
    // Règles de mots de passe du kit de cybersécurité, appliquées aussi par Supabase Auth
    const s = AB.kits.valeurs(app, 'securite');
    const auth = parBloc.connexion ? `[auth]
minimum_password_length = ${Math.max(6, Number(s.mdpMin) || 8)}
${s.mdpComplexe ? 'password_requirements = "lower_upper_letters_digits_symbols"\n' : ''}
[auth.email]
enable_confirmations = true
secure_password_change = true
` : '';
    if (fonctions.length || auth) {
      fichiers['supabase/config.toml'] = `# Généré par l'Atelier de Blocs
${auth}${auth && fonctions.length ? '\n' : ''}${fonctions.map(f => `[functions.${f.nom}]\nverify_jwt = ${f.public ? 'false' : 'true'}`).join('\n\n')}\n`;
    }
    // Bases dessinées dans l'Atelier : la première base Supabase remplace la migration des blocs (elle les inclut)
    let bases = false;
    (app.bases || []).forEach((b, i) => {
      if (!b.tables.length && !(i === 0 && tables.length)) return;
      if (i === 0 && b.moteur === 'supabase') { if (b.tables.length) fichiers['supabase/migrations/0001_init.sql'] = AB.bases.sql(app, b); }
      else fichiers[`bases/${U.slug(b.nom) || b.id}.sql`] = AB.bases.sql(app, b);
      bases = true;
    });
    return { necessaire: tables.length > 0 || fonctions.length > 0 || bases, auth: !!auth, tables, fonctions, fichiers };
  };

  /* ---------- Fichiers de l'app à déployer ---------- */
  /** L'app en un seul fichier HTML (CSS et JS dans la page), à ouvrir en double-clic.
      La CSP n'autorise que CE script, par son empreinte SHA-256. */
  R.fichierUnique = async function (app) {
    const { pages, inits, manquants } = R.resoudre(app);
    const t = R.theme(app);
    const js = enLigne(R.runtime(app, pages, inits));
    const octets = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(js)));
    const empreinte = btoa(String.fromCharCode(...octets));
    const regles = reglesCsp().map(r => r.startsWith('script-src') ? `script-src 'sha256-${empreinte}'` : r.startsWith('connect-src') && !R.backend(app).fichiers['supabase/config.toml'] ? "connect-src 'self'" : r);
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${regles.join('; ')}">
  <meta name="theme-color" content="${U.esc(t.primaire)}">
  <title>${U.esc(app.nom || 'Mon app')}</title>
  ${liens(app)}
  <style>
${R.css(app)}
${CSS_BLOCS(pages)}
  </style>
</head>
<body>
${corps(app, pages, manquants)}
<script>${js}</script>
</body>
</html>
`;
  };

  R.fichiers = function (app) {
    const { pages, inits, manquants } = R.resoudre(app);
    const t = R.theme(app);
    const nom = app.nom || 'Mon app';
    const back = R.backend(app);
    // Variables à donner aux fonctions serveur : les secrets, et les publiques marquées « serveur »
    const pourServeur = R.env(app).filter(v => v.secret || v.serveur);
    const f = {};
    f['index.html'] = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${csp(app)}<meta name="theme-color" content="${U.esc(t.primaire)}">
  <title>${U.esc(nom)}</title>
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icon.svg">
  ${liens(app)}
  <link rel="stylesheet" href="style.css">
</head>
<body>
${corps(app, pages, manquants)}
<script src="app.js"></script>
</body>
</html>
`;
    f['style.css'] = R.css(app) + '\n' + CSS_BLOCS(pages);
    f['app.js'] = R.runtime(app, pages, inits);
    f['manifest.webmanifest'] = JSON.stringify({
      name: nom, short_name: nom.slice(0, 12), start_url: './index.html', display: 'standalone',
      background_color: t.fond, theme_color: t.primaire,
      icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }]
    }, null, 2);
    f['icon.svg'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${U.esc(t.primaire)}"/><text x="256" y="330" font-size="240" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="700">${U.esc(nom.charAt(0).toUpperCase())}</text></svg>`;
    f['sw.js'] = `// Service worker : garde les fichiers de l'app pour qu'elle s'ouvre hors ligne.
const CACHE = ${JSON.stringify(U.slug(nom) + '-v' + (app.versionCourante || 1))};
const FICHIERS = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))));
// Seuls les fichiers de l'app passent par le cache ; les appels à Supabase ou Stripe vont toujours au réseau.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
`;
    f['.env.example'] = R.envExample(app);
    if (AB.kits.valeurs(app, 'securite').entetes) {
      const e = R.entetes(app);
      f['_headers'] = `# En-têtes de sécurité (Netlify, Cloudflare Pages) — kit cybersécurité\n/*\n${Object.entries(e).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
      f['vercel.json'] = JSON.stringify({ headers: [{ source: '/(.*)', headers: Object.entries(e).map(([key, value]) => ({ key, value })) }] }, null, 2) + '\n';
    }
    Object.assign(f, back.fichiers);
    const kits = AB.kits.resoudre(app);
    f['README.md'] = `# ${nom}

Généré par l'Atelier de Blocs le ${new Date().toLocaleDateString('fr-FR')} (version ${app.versionCourante || 1}).

## Blocs et kits

${(app.blocs || []).map(i => `- Bloc ${i.bloc} v${i.version}${i.protege ? ' (réservé aux connectés)' : ''}`).join('\n') || '- aucun bloc'}
${kits.tous.map(k => `- Kit ${k.nom} v${k.version}`).join('\n')}

## Lancer l'app

Servez ce dossier avec un serveur statique en HTTPS (Netlify, Vercel, OVH…), ou en local avec \`npx serve .\`.
${AB.kits.valeurs(app, 'securite').entetes ? `Les en-têtes de sécurité sont dans \`_headers\` (Netlify, Cloudflare Pages) et \`vercel.json\` (Vercel) ;
sur un autre hébergeur, recopiez-les dans sa configuration (voir le rapport d'audit de l'Atelier).` : ''}
Sur un téléphone, le navigateur propose « Ajouter à l'écran d'accueil ».
Les variables publiques sont déjà dans \`app.js\` (voir \`.env.example\`).
${back.necessaire ? `
## Backend (Supabase)

1. Créer un projet sur supabase.com, puis lier ce dossier : \`supabase link --project-ref <ref>\`.
2. Créer les tables et leurs règles d'accès : \`supabase db push\` (fichier \`supabase/migrations/0001_init.sql\`).
${back.fonctions.length ? `3. Renseigner les secrets (jamais dans le code) :
${pourServeur.map(v => `   \`supabase secrets set ${v.cle}=${v.secret ? '…' : ((app.config || {})[v.cle] || '…')}\``).join('\n') || '   aucun'}
4. Déployer les fonctions : ${back.fonctions.map(fn => `\`supabase functions deploy ${fn.nom}${fn.public ? ' --no-verify-jwt' : ''}\``).join(', ')}.
` : ''}${back.fonctions.some(fn => fn.nom === 'stripe-webhook') ? `5. Dans Stripe › Développeurs › Webhooks, ajouter l'adresse \`https://<ref>.supabase.co/functions/v1/stripe-webhook\`
   avec l'évènement \`checkout.session.completed\`, puis mettre son secret de signature dans STRIPE_WEBHOOK_SECRET.
` : ''}` : ''}${back.auth ? `
## Comptes (Supabase Auth)

Les règles de mot de passe du kit de cybersécurité sont dans \`supabase/config.toml\` (section \`[auth]\`).
Appliquez-les au projet en ligne avec \`supabase config push\`, ou dans Supabase › Authentication
(longueur minimale, exigences de caractères, confirmation de l'email).
` : ''}`;
    return f;
  };
})();
