/* ==========================================================================
   ab-vue-mobile.js — écran « Apps mobiles » : publier une app HTML sur
   l'App Store et Google Play, avec le même serveur.
   #/mobile              liste des apps et de leur version mobile
   #/mobile/app/<id>     réglages, émulateur, diagnostic, export du projet, étapes des stores
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc, M = AB.mobile;
  AB.vues = AB.vues || {};

  // Source choisie pendant la session (gros fichiers : pas enregistrée), par app
  const SOURCES = {};
  const NIVEAUX = { crit: ['chip-danger', 'mdi-close-octagon-outline', 'Bloquant'], warn: ['chip-warning', 'mdi-alert-outline', 'À régler'], info: ['chip-info', 'mdi-information-outline', 'À savoir'], ok: ['chip-success', 'mdi-check-circle-outline', 'OK'] };
  const BAR = { crit: 'crit', warn: 'warn', info: 'info', ok: 'ok' };

  /** Étapes que seul le propriétaire des comptes peut faire (cochées dans l'onglet Stores). */
  const ETAPES = [
    ['Comptes', [
      ['apple', 'Compte Apple Developer (99 $ par an)', 'https://developer.apple.com/programs/enroll/'],
      ['google', 'Compte Google Play Console (25 $ une fois, vérification d’identité)', 'https://play.google.com/console/signup'],
      ['dunsetc', 'Compte organisation : numéro D-U-N-S (facultatif, gratuit, 1 à 2 semaines)', 'https://developer.apple.com/support/D-U-N-S/']
    ]],
    ['Matériel et outils', [
      ['node', 'Node.js 22 ou plus', 'https://nodejs.org/'],
      ['studio', 'Android Studio installé (ou build par GitHub)', 'https://developer.android.com/studio'],
      ['mac', 'Un Mac avec la dernière version de Xcode (pour iOS)', 'https://apps.apple.com/app/xcode/id497799835']
    ]],
    ['Signature', [
      ['equipe', 'Xcode : équipe choisie, signature automatique', ''],
      ['jks', 'Android : clé d’envoi (.jks) créée et sauvegardée en lieu sûr avec ses mots de passe', ''],
      ['playsigning', 'Google Play App Signing activé', '']
    ]],
    ['Fiches des stores', [
      ['confidentialite', 'Politique de confidentialité en ligne', ''],
      ['captures', 'Captures d’écran (iPhone 6,9", iPad 13" si iPad, Android) et textes', ''],
      ['privacy', 'App Privacy (Apple) et Sécurité des données (Google) remplis', ''],
      ['demo', 'Compte de démonstration pour la revue (si connexion)', ''],
      ['age', 'Classification par âge et public cible', '']
    ]],
    ['Envoi', [
      ['testflight', 'Build iOS envoyé, essayé dans TestFlight', 'https://appstoreconnect.apple.com/'],
      ['testinterne', 'Build Android en test interne (puis test fermé : 12 testeurs, 14 jours pour un compte personnel récent)', 'https://play.google.com/console'],
      ['revueapple', 'Soumis à la revue Apple', ''],
      ['production', 'Publié en production sur Google Play', '']
    ]]
  ];

  /* ======================= Liste ======================= */

  AB.vues.mobile = async function (root, params) {
    if (params[0] === 'app' && params[1]) return editeur(root, params[1]);
    AB.app.setCrumbs(['Apps mobiles']);
    const apps = await AB.apps.lister();
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">iOS et Android</div><h2 class="section-title">Apps mobiles</h2>
        <p class="section-desc">Transforme une app HTML en vraie app pour l’App Store et Google Play, <b>avec le même serveur</b> : l’app web est embarquée dans une coquille native (Capacitor). Tu obtiens un projet prêt à ouvrir dans Android Studio et Xcode, avec icônes, écran de démarrage, adresse de l’API, cookies, et le guide des étapes de publication.</p></div></div>
      <div class="grid grid-3">
        <div class="dash-card"><div class="dash-card-icon" style="background:var(--color-accent-bg);color:var(--color-accent)"><span class="mdi mdi-cellphone-arrow-down"></span></div><div style="font-weight:600;margin-top:10px">1. Choisir l’app</div><div class="dash-card-label">Une app de l’Atelier, un fichier HTML, le dossier ou ZIP construit (dist/), ou un site en ligne.</div></div>
        <div class="dash-card"><div class="dash-card-icon" style="background:var(--color-accent-bg);color:var(--color-accent)"><span class="mdi mdi-stethoscope"></span></div><div style="font-weight:600;margin-top:10px">2. Régler et vérifier</div><div class="dash-card-label">Identifiant, version, serveur, icône. Le diagnostic repère ce qui bloquerait dans l’app ou en revue.</div></div>
        <div class="dash-card"><div class="dash-card-icon" style="background:var(--color-accent-bg);color:var(--color-accent)"><span class="mdi mdi-store-outline"></span></div><div style="font-weight:600;margin-top:10px">3. Construire et publier</div><div class="dash-card-label">npm run preparer, puis Android Studio et Xcode. Le guide liste ce que toi seul peux faire.</div></div>
      </div>
      <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cellphone-link"></span>Tes apps</span></div>
        <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>App</th><th>Identifiant</th><th>Mode</th><th>Dernier export</th><th></th></tr></thead><tbody>
        ${apps.map(a => {
          const c = a.mobile;
          const dernier = c && (c.exports || [])[0];
          return `<tr><td><span class="mdi ${esc(a.icone)}"></span> <b>${esc(a.nom)}</b><div class="small muted">${a.origine === 'plateforme' ? 'Créée dans l’Atelier' : esc(a.stack || 'App existante')}</div></td>
            <td class="mono small">${c ? esc(c.appId) : '<span class="muted">—</span>'}</td>
            <td>${c ? (c.mode === 'distant' ? '<span class="chip chip-warning">Site en ligne</span>' : '<span class="chip chip-success">Embarquée</span>') : '<span class="chip">Pas encore</span>'}</td>
            <td class="small">${dernier ? `v${esc(dernier.version)} · build ${esc(dernier.build)}<div class="muted">${esc(U.fmtDate(dernier.date))}</div>` : '<span class="muted">—</span>'}</td>
            <td class="actions"><a class="btn ${c ? 'btn-outline' : 'btn-primary'} btn-sm" href="#/mobile/app/${esc(a.id)}"><span class="mdi mdi-cellphone-cog"></span>${c ? 'Ouvrir' : 'Préparer'}</a></td></tr>`;
        }).join('') || '<tr><td colspan="5" class="muted">Aucune app. Crée-en une dans Apps.</td></tr>'}
        </tbody></table></div></div></div>
    </div>`;
    return {};
  };

  /* ======================= Éditeur d'une app ======================= */

  async function editeur(root, id) {
    const app = await AB.apps.get(id);
    if (!app) { root.innerHTML = `<div class="page"><div class="empty">App introuvable. <a href="#/mobile">Retour</a></div></div>`; return {}; }
    AB.app.setCrumbs(['Apps mobiles', app.nom]);
    const cfg = M.config(app);
    // Un dossier ou un ZIP choisi ici est gardé dans ce navigateur (ZIP dans la table « fichiers »)
    const garderSource = s => M.garderSource(id, s);
    if (!SOURCES[id]) SOURCES[id] = await M.sourceGardee(id);
    if (!SOURCES[id] && app.origine === 'plateforme') SOURCES[id] = M.sourceAtelier(app);
    // App importée en ZIP (créée avec Claude) : son code courant est gardé dans l'Atelier
    const sourceCode = async () => { const v = AB.code.courante(app); return M.sourceZip(await AB.code.zip(app), `${app.nom} v${v.numero}`); };
    if (!SOURCES[id] && AB.code.courante(app)) { try { SOURCES[id] = await sourceCode(); } catch (e) { console.warn(e); } }
    let onglet = 'general', timer = null, timerEtat = null, apercu = null;
    const nettoyages = [];   // écouteurs et adresses blob de l'onglet affiché

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">App mobile</div><h2 class="section-title"><span class="mdi ${esc(app.icone)}"></span> ${esc(app.nom)}</h2>
        <div class="row" style="margin-top:6px" id="moEtat"></div></div>
        <div class="row">
          <a class="btn btn-outline" href="#/apps/${esc(app.id)}"><span class="mdi mdi-cellphone"></span>Ouvrir l’app</a>
          <button class="btn btn-primary" id="moExport"><span class="mdi mdi-folder-zip-outline"></span>Télécharger le projet mobile</button></div></div>
      <div class="tabs" id="moTabs"></div>
      <div id="moCorps"></div></div>`;
    const $ = s => root.querySelector(s);

    const enregistrer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => { timer = null; app.mobile = cfg; await AB.apps.enregistrer(app); }, 400);
    };
    // Code source construit par le serveur local (aperçu ou émulateur) : le diagnostic et l'export prennent la version construite
    const actuelle = () => AB.construire.deja(SOURCES[id]) || SOURCES[id];
    const diag = () => M.analyser(actuelle(), cfg);

    function dessinerEtat() {
      const d = diag();
      const n = k => d.constats.filter(c => c.niveau === k).length;
      $('#moEtat').innerHTML = `<span class="chip chip-primary mono">${esc(cfg.appId)}</span><span class="chip">v${esc(cfg.version)} · prochain build ${cfg.build + 1}</span>
        ${n('crit') ? `<span class="chip chip-danger">${n('crit')} bloquant(s)</span>` : ''}${n('warn') ? `<span class="chip chip-warning">${n('warn')} à régler</span>` : ''}${!n('crit') && !n('warn') ? '<span class="chip chip-success">Prête à exporter</span>' : ''}`;
    }

    const ONGLETS = [['general', 'App et source', 'mdi-cellphone-arrow-down'], ['serveur', 'Serveur', 'mdi-server-network'], ['apparence', 'Icône et démarrage', 'mdi-palette-outline'],
      ['fonctions', 'Fonctions du téléphone', 'mdi-cellphone-settings'], ['emulateur', 'Émulateur', 'mdi-cellphone-play'], ['diagnostic', 'Diagnostic', 'mdi-stethoscope'], ['stores', 'Publier sur les stores', 'mdi-store-outline']];
    function dessinerOnglets() {
      $('#moTabs').innerHTML = ONGLETS.map(([c, l, i]) => `<button class="tab ${c === onglet ? 'active' : ''}" data-tab="${c}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { onglet = t.dataset.tab; dessinerOnglets(); dessinerCorps(); });
    }
    const aller = o => { onglet = o; dessinerOnglets(); dessinerCorps(); };

    /** Relie les champs [data-c] à cfg. */
    function lier(body) {
      body.querySelectorAll('[data-c]').forEach(el => {
        const cle = el.dataset.c;
        const maj = () => {
          if (el.type === 'checkbox') cfg[cle] = el.checked;
          else if (el.type === 'radio') { if (el.checked) cfg[cle] = el.value; }
          else if (el.dataset.liste === 'lignes') cfg[cle] = el.value.split('\n').map(s => s.trim()).filter(Boolean).map(s => '/' + s.replace(/^\/+/, '').replace(/\/?$/, '/'));
          else if (el.dataset.liste === 'paires') cfg[cle] = el.value.split('\n').map(s => s.split(/\s*(?:=>|→|->)\s*/).map(x => x.trim())).filter(p => p.length === 2 && p[0] && p[1]);
          else if (el.type === 'number') cfg[cle] = Math.max(0, parseInt(el.value, 10) || 0);
          else cfg[cle] = el.value.trim();
          enregistrer();
          clearTimeout(timerEtat); timerEtat = setTimeout(dessinerEtat, 250);
          if (el.dataset.redessiner !== undefined) dessinerCorps();
        };
        el.addEventListener(el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT' || el.type === 'color' ? 'change' : 'input', maj);
      });
    }

    const champ = (cle, label, aide, attrs) => `<div class="input-group"><label class="input-label">${label}</label><input class="tv-input ${attrs && attrs.mono ? 'mono' : ''}" data-c="${cle}" value="${esc(cfg[cle])}" ${attrs && attrs.type ? `type="${attrs.type}"` : ''} placeholder="${esc((attrs && attrs.ph) || '')}">${aide ? `<div class="input-hint">${aide}</div>` : ''}</div>`;
    const caseA = (cle, label, aide) => `<label class="check" style="align-items:flex-start"><input type="checkbox" data-c="${cle}" ${cfg[cle] ? 'checked' : ''} style="margin-top:3px"><span><b>${label}</b>${aide ? `<div class="small muted">${aide}</div>` : ''}</span></label>`;

    /* ---------- Onglet App et source ---------- */
    function general(body) {
      const s = SOURCES[id];
      body.innerHTML = `<div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-card-account-details-outline"></span>Identité de l’app</span></div><div class="panel-body stack">
          ${champ('nom', 'Nom affiché sous l’icône', '30 caractères au plus sur les stores ; court sous l’icône (12 environ).')}
          ${champ('appId', 'Identifiant (bundle ID / package)', 'Domaine inversé, en minuscules, sans tiret : il ne pourra plus changer une fois publié.', { mono: true, ph: 'fr.techview.monapp' })}
          <div class="grid grid-2">${champ('version', 'Version', 'Celle que voient les utilisateurs.', { mono: true, ph: '1.0.0' })}
            <div class="input-group"><label class="input-label">Dernier build exporté</label><input class="tv-input mono" type="number" min="0" data-c="build" value="${cfg.build}"><div class="input-hint">Augmenté de 1 à chaque export (exigé par les stores).</div></div></div>
        </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-swap-horizontal"></span>Comment l’app est livrée</span></div><div class="panel-body stack">
          <label class="check" style="align-items:flex-start"><input type="radio" name="moMode" value="embarque" data-c="mode" data-redessiner ${cfg.mode !== 'distant' ? 'checked' : ''} style="margin-top:3px"><span><b>App embarquée</b> <span class="chip chip-success">Recommandé</span><div class="small muted">Les fichiers de l’app sont dans l’app native ; elle appelle le même serveur qu’aujourd’hui. Démarre vite, passe bien la revue Apple. Pour les apps de l’Atelier et les apps Vue, React, Vite… construites (dist/).</div></span></label>
          <label class="check" style="align-items:flex-start"><input type="radio" name="moMode" value="distant" data-c="mode" data-redessiner ${cfg.mode === 'distant' ? 'checked' : ''} style="margin-top:3px"><span><b>Site en ligne</b><div class="small muted">L’app ouvre ton site publié. Indispensable pour les apps avec rendu serveur (Next.js : PostLocal, RelancePro). Rien à changer côté serveur, mais Apple refuse souvent les apps qui ne sont qu’un site (règle 4.2).</div></span></label>
        </div></div></div>
      ${cfg.mode === 'distant' ? `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-web"></span>Site à ouvrir</span></div><div class="panel-body">
          ${champ('url', 'Adresse du site publié', 'En https. Les liens vers d’autres sites s’ouvriront dans le navigateur du téléphone.', { mono: true, ph: 'https://monapp.fr' })}</div></div>`
        : `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-folder-open-outline"></span>App à embarquer</span></div><div class="panel-body stack">
          <div class="row">${app.origine === 'plateforme' ? '<button class="btn btn-outline" id="moSrcAtelier"><span class="mdi mdi-cellphone-cog"></span>Export de l’Atelier</button>' : ''}
            ${AB.code.courante(app) ? `<button class="btn btn-outline" id="moSrcCode"><span class="mdi mdi-folder-zip-outline"></span>Code de l’app (v${AB.code.courante(app).numero})</button>` : ''}
            <button class="btn btn-outline" id="moSrcHtml"><span class="mdi mdi-language-html5"></span>Fichier HTML</button>
            <button class="btn btn-outline" id="moSrcDossier"><span class="mdi mdi-folder-open-outline"></span>Dossier</button>
            <button class="btn btn-outline" id="moSrcZip"><span class="mdi mdi-folder-zip-outline"></span>ZIP</button></div>
          <div id="moSrcEtat">${s ? `<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>${esc(s.resume)}</div></div>` : `<div class="bar warn"><span class="mdi mdi-folder-alert-outline"></span><div>Aucune app choisie. Le dossier ou le ZIP choisi ici est gardé dans ce navigateur, même après avoir fermé l’Atelier.</div></div>`}</div>
          <p class="small muted" style="margin:0">Pour une app Vue, React ou Vite : <code>npm run build</code> avec l’adresse de l’API de production, puis choisis le dossier <code>dist/</code> (ou son ZIP). Pour un ZIP de projet complet (ex. PodoLogiciel v2), l’Atelier prend le dossier qui contient <code>index.html</code> (ici <code>api/public/</code>). Tout est lu dans ce navigateur, rien n’est envoyé.</p>
        </div></div>`}`;
      lier(body);
      const choisir = (accept, dossier, fn) => {
        const inp = document.createElement('input');
        inp.type = 'file'; if (accept) inp.accept = accept;
        if (dossier) { inp.webkitdirectory = true; inp.multiple = true; }
        inp.onchange = async () => {
          if (!inp.files.length) return;
          body.querySelector('#moSrcEtat').innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Lecture…';
          try { SOURCES[id] = await fn(inp.files); suggerer(true); await garderSource(SOURCES[id]); }
          catch (e) { body.querySelector('#moSrcEtat').innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`; return; }
          dessinerEtat(); dessinerCorps();
        };
        inp.click();
      };
      const b = s2 => body.querySelector(s2);
      if (b('#moSrcAtelier')) b('#moSrcAtelier').onclick = () => { SOURCES[id] = M.sourceAtelier(app); garderSource(null); dessinerEtat(); dessinerCorps(); };
      if (b('#moSrcCode')) b('#moSrcCode').onclick = async () => { try { SOURCES[id] = await sourceCode(); suggerer(true); garderSource(null); } catch (e) { U.toast('error', 'Lecture impossible', e.message); } dessinerEtat(); dessinerCorps(); };
      if (b('#moSrcHtml')) b('#moSrcHtml').onclick = () => choisir('.html,.htm', false, f => M.sourceHtml(f[0]));
      if (b('#moSrcDossier')) b('#moSrcDossier').onclick = () => choisir('', true, f => M.sourceDossier(f));
      if (b('#moSrcZip')) b('#moSrcZip').onclick = () => choisir('.zip', false, f => M.sourceZip(f[0], f[0].name.replace(/\.zip$/i, '')));
    }

    /** Reprend les chemins d'API trouvés dans le code (et les adresses locales à remplacer). */
    function suggerer(silencieux) {
      const d = diag();
      const avant = JSON.stringify([cfg.prefixes, cfg.remplacer]);
      d.prefixes.forEach(p => { if (!cfg.prefixes.includes(p)) cfg.prefixes.push(p); });
      if (cfg.api) d.locales.forEach(l => { if (!cfg.remplacer.some(r => r[0] === l)) cfg.remplacer.push([l, cfg.api.replace(/\/$/, '')]); });
      const teinte = M.couleurSource(SOURCES[id]), defaut = M.defauts(app);
      if (teinte && cfg.couleur === defaut.couleur && cfg.fondSplash === defaut.fondSplash) { cfg.couleur = cfg.fondSplash = teinte; enregistrer(); }
      const change = avant !== JSON.stringify([cfg.prefixes, cfg.remplacer]);
      if (change) { enregistrer(); if (!silencieux) U.toast('success', 'Suggestions appliquées', 'Vérifie les chemins et les adresses.'); }
      else if (!silencieux) U.toast('info', 'Rien à ajouter', d.prefixes.length || d.locales.length ? 'Les suggestions sont déjà appliquées.' : 'Aucun appel relatif ni adresse locale trouvé dans le code.');
      return change;
    }

    /* ---------- Onglet Serveur ---------- */
    function serveur(body) {
      if (cfg.mode === 'distant') {
        body.innerHTML = `<div class="panel"><div class="panel-body"><div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>Mode « site en ligne » : l’app ouvre <b>${esc(cfg.url || 'ton site')}</b>. Pour le serveur, c’est un navigateur comme un autre : même adresse, mêmes cookies, <b>rien à changer</b>.</div></div></div></div>`;
        return;
      }
      const d = diag();
      body.innerHTML = `<div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-server-network"></span>Le même serveur qu’aujourd’hui</span></div><div class="panel-body stack">
          ${champ('api', 'Adresse du serveur', 'Là où l’app web est servie (ou son API) aujourd’hui, en https. Ex. https://cabinet.podologiciel.fr/', { mono: true, ph: 'https://monapp.fr/' })}
          <div class="input-group"><label class="input-label">Chemins envoyés au serveur</label>
            <textarea class="tv-textarea code" style="min-height:70px" data-c="prefixes" data-liste="lignes" placeholder="/api/">${esc(cfg.prefixes.join('\n'))}</textarea>
            <div class="input-hint">Un par ligne. Un appel relatif comme <code>fetch('api/donnees')</code> part vers l’adresse du serveur + <code>api/donnees</code>. ${d.prefixes.length ? `Trouvés dans le code : <b>${esc(d.prefixes.join(', '))}</b>.` : ''}</div></div>
          <div class="input-group"><label class="input-label">Adresses à remplacer</label>
            <textarea class="tv-textarea code" style="min-height:70px" data-c="remplacer" data-liste="paires" placeholder="http://localhost:4517 => https://api.monapp.fr">${esc(cfg.remplacer.map(r => r.join(' => ')).join('\n'))}</textarea>
            <div class="input-hint">« ancienne => nouvelle », une par ligne : pour une adresse de développement restée dans le build. ${d.locales.length ? `Trouvées : <b>${esc(d.locales.join(', '))}</b>.` : ''}</div></div>
          <div class="row"><button class="btn btn-outline btn-sm" id="moSugg"><span class="mdi mdi-auto-fix"></span>Appliquer les suggestions</button></div>
        </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cookie-outline"></span>Cookies, CORS et session</span></div><div class="panel-body stack">
          <label class="check" style="align-items:flex-start"><input type="radio" name="moReseau" value="natif" data-c="reseau" ${cfg.reseau !== 'webview' ? 'checked' : ''} style="margin-top:3px"><span><b>Réseau natif</b> <span class="chip chip-success">Recommandé</span><div class="small muted">Les appels passent par le système du téléphone : pas de CORS, cookies de session gardés par l’app (même HttpOnly, SameSite=Strict). Le serveur ne change pas.</div></span></label>
          <label class="check" style="align-items:flex-start"><input type="radio" name="moReseau" value="webview" data-c="reseau" ${cfg.reseau === 'webview' ? 'checked' : ''} style="margin-top:3px"><span><b>Réseau du navigateur</b><div class="small muted">Comme sur le web. Le serveur doit autoriser <code>capacitor://localhost</code> et <code>https://localhost</code> (CORS) et passer ses cookies en SameSite=None ; sur iPhone, les cookies d’un autre domaine restent souvent bloqués. À réserver aux apps à jeton (Bearer, Supabase).</div></span></label>
          <div class="bar info"><span class="mdi mdi-file-document-outline"></span><div>Le projet contient <b>SERVEUR.md</b> : ce qui change (ou pas) côté serveur, avec le CORS prêt à copier pour Node, Express, NestJS, Caddy et Supabase.</div></div>
        </div></div></div>`;
      lier(body);
      body.querySelector('#moSugg').onclick = () => { suggerer(false); dessinerEtat(); dessinerCorps(); };
    }

    /* ---------- Onglet Icône et démarrage ---------- */
    function apparence(body) {
      const couleur = (cle, label) => `<div class="input-group"><label class="input-label">${label}</label><input class="tv-input" type="color" data-c="${cle}" value="${esc(cfg[cle])}" style="height:36px;padding:2px"></div>`;
      body.innerHTML = `<div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-palette-outline"></span>Icône et écran de démarrage</span></div><div class="panel-body stack">
          <div class="row"><button class="btn btn-outline" id="moIcone"><span class="mdi mdi-image-plus"></span>${cfg.icone ? 'Changer l’image' : 'Importer une image'}</button>
            ${cfg.icone ? '<button class="btn btn-ghost btn-sm" id="moIconeSup"><span class="mdi mdi-close"></span>Revenir à l’icône de l’app</button>' : ''}</div>
          <div class="input-hint">PNG, JPEG ou SVG, carrée, 1024 × 1024 idéalement. Sans image : l’icône ${esc(app.icone || '')} de l’app en blanc sur la couleur choisie.</div>
          ${cfg.icone ? caseA('iconeRemplir', 'L’image est déjà une icône complète', 'Elle remplit tout le carré (sinon elle est centrée avec une marge sur la couleur de fond).') : ''}
          <div class="grid grid-3">${couleur('couleur', 'Fond de l’icône et barre d’état')}${couleur('fondSplash', 'Écran de démarrage')}${couleur('fondSombre', 'Démarrage en mode sombre')}</div>
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Orientation (téléphone)</label><select class="tv-select" data-c="orientation">
              <option value="portrait" ${cfg.orientation === 'portrait' ? 'selected' : ''}>Portrait seulement</option><option value="toutes" ${cfg.orientation !== 'portrait' ? 'selected' : ''}>Portrait et paysage</option></select></div>
            <div class="input-group"><label class="input-label">Appareils Apple</label><select class="tv-select" data-c="appareils">
              <option value="iphone-ipad" ${cfg.appareils !== 'iphone' ? 'selected' : ''}>iPhone et iPad</option><option value="iphone" ${cfg.appareils === 'iphone' ? 'selected' : ''}>iPhone seulement</option></select>
              <div class="input-hint">Avec iPad, il faut aussi des captures d’écran iPad.</div></div></div>
        </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-eye-outline"></span>Aperçu</span><div class="spacer"></div><button class="btn btn-ghost btn-sm" id="moApercu"><span class="mdi mdi-refresh"></span>Actualiser</button></div>
          <div class="panel-body"><div class="row" id="moImages" style="align-items:flex-end;gap:18px"><span class="mdi mdi-loading mdi-spin"></span></div>
          <p class="small muted">Ces images de départ sont déclinées en toutes les tailles iOS et Android (icônes adaptatives comprises) par <code>npm run preparer</code>.</p></div></div></div>`;
      lier(body);
      const dessinerApercu = async () => {
        const zone = body.querySelector('#moImages');
        if (!zone) return;
        if (apercu) apercu.forEach(u => URL.revokeObjectURL(u));
        const im = await M.images(cfg, app);
        const url = k => URL.createObjectURL(new Blob([im[k]], { type: 'image/png' }));
        apercu = [url('assets/icon-only.png'), url('assets/icon-foreground.png'), url('assets/splash.png'), url('assets/splash-dark.png')];
        zone.innerHTML = `<figure style="margin:0;text-align:center"><img src="${apercu[0]}" width="96" height="96" style="border-radius:22px;box-shadow:var(--shadow)" alt=""><figcaption class="small muted">iOS</figcaption></figure>
          <figure style="margin:0;text-align:center"><div style="width:96px;height:96px;border-radius:50%;overflow:hidden;background:${esc(cfg.couleur)}"><img src="${apercu[1]}" width="96" height="96" alt=""></div><figcaption class="small muted">Android</figcaption></figure>
          <figure style="margin:0;text-align:center"><div style="width:90px;height:180px;border-radius:14px;overflow:hidden;border:1px solid var(--border)"><img src="${apercu[2]}" style="width:180px;height:180px;margin-left:-45px" alt=""></div><figcaption class="small muted">Démarrage</figcaption></figure>
          <figure style="margin:0;text-align:center"><div style="width:90px;height:180px;border-radius:14px;overflow:hidden;border:1px solid var(--border)"><img src="${apercu[3]}" style="width:180px;height:180px;margin-left:-45px" alt=""></div><figcaption class="small muted">Sombre</figcaption></figure>`;
      };
      body.querySelectorAll('[data-c]').forEach(el => el.addEventListener('change', () => setTimeout(dessinerApercu, 50)));
      body.querySelector('#moApercu').onclick = dessinerApercu;
      body.querySelector('#moIcone').onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/svg+xml,image/webp';
        inp.onchange = () => {
          const f = inp.files[0];
          if (!f) return;
          if (f.size > 2 * 1048576) return U.toast('warning', 'Image trop lourde', '2 Mo au plus.');
          const r = new FileReader();
          r.onload = () => { cfg.icone = r.result; enregistrer(); dessinerCorps(); };
          r.readAsDataURL(f);
        };
        inp.click();
      };
      const sup = body.querySelector('#moIconeSup');
      if (sup) sup.onclick = () => { cfg.icone = ''; cfg.iconeRemplir = false; enregistrer(); dessinerCorps(); };
      dessinerApercu();
    }

    /* ---------- Onglet Fonctions du téléphone ---------- */
    function fonctions(body) {
      const distant = cfg.mode === 'distant';
      body.innerHTML = `<div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-bridge"></span>Ce que le pont mobile ajoute</span></div><div class="panel-body stack">
          ${distant ? '<div class="bar info"><span class="mdi mdi-information-outline"></span><div>En mode « site en ligne », ces fonctions ne s’appliquent pas : le site est affiché tel quel.</div></div>' : ''}
          ${caseA('telechargements', 'Téléchargements → feuille de partage', 'Un PDF, un CSV ou une sauvegarde « téléchargés » par l’app s’ouvrent dans le partage du téléphone (Fichiers, Mail, AirDrop, Drive…).')}
          ${caseA('impression', 'Impression', 'window.print() ouvre l’impression du téléphone (AirPrint, imprimantes Android, « Enregistrer en PDF »). Ajoute un petit plugin natif au projet.')}
          <div class="small muted">Toujours fait : service worker désactivé dans l’app (il garderait d’anciennes versions après une mise à jour), classe <code>app-native</code> sur la page pour adapter le style.</div>
        </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-shield-key-outline"></span>Autorisations et données</span></div><div class="panel-body stack">
          ${caseA('photos', 'Photos et appareil photo', 'L’app choisit une image ou prend une photo (champ fichier). Sans le texte d’autorisation, iOS ferme l’app.')}
          ${caseA('camera', 'Caméra et micro en direct', 'Vidéo ou scan en direct (getUserMedia).')}
          ${caseA('localisation', 'Localisation', 'Position pendant l’utilisation.')}
          ${caseA('sauvegardeAndroid', 'Sauvegarde Android automatique', 'Android copie les données de l’app (stockage local, cookies) dans le compte Google de l’utilisateur. À couper pour des données de santé.')}
        </div></div></div>`;
      lier(body);
    }

    /* ---------- Onglet Émulateur ---------- */
    // Tailles en points CSS (celles que voit l'app), comme les vrais appareils. « Personnalisé » : taille libre.
    const APPAREILS = [
      ['Téléphones', [
        ['iphone-se', 'iPhone SE', 'ios', 375, 667, 'bouton'],
        ['iphone', 'iPhone 16', 'ios', 393, 852, 'ilot'],
        ['iphone-max', 'iPhone 16 Pro Max', 'ios', 440, 956, 'ilot'],
        ['android-petit', 'Android compact', 'android', 360, 800, 'camera'],
        ['android', 'Android (Pixel 9)', 'android', 412, 915, 'camera']
      ]],
      ['Tablettes', [
        ['ipad-mini', 'iPad mini', 'ios', 744, 1133, 'tablette'],
        ['ipad', 'iPad 11"', 'ios', 820, 1180, 'tablette'],
        ['ipad-pro', 'iPad Pro 13"', 'ios', 1032, 1376, 'tablette'],
        ['tab-android', 'Tablette Android 10"', 'android', 800, 1280, 'tablette'],
        ['tab-android-xl', 'Tablette Android 12"', 'android', 900, 1440, 'tablette']
      ]]
    ];
    const PRESETS = {};
    APPAREILS.forEach(([, l]) => l.forEach(([cle, nom, plateforme, w, h, forme]) => { PRESETS[cle] = { nom, plateforme, w, h, forme }; }));
    const emu = Object.assign({ appareil: 'ipad-pro', l: 1032, h: 1376, plateforme: 'ios', forme: 'tablette', zoom: 'ajuster', journal: [] }, AB.mobile.emuDernier || {});
    if (!emu.journal) emu.journal = [];

    /** Marges du système (barre d'état, barre du bas) selon la forme et le sens. */
    function marges() {
      const paysage = emu.l > emu.h, f = emu.forme;
      if (f === 'ilot') return paysage ? { haut: 0, bas: 21, rayon: 54 } : { haut: 54, bas: 34, rayon: 54 };
      if (f === 'bouton') return { haut: paysage ? 0 : 20, bas: 0, rayon: 6 };
      if (f === 'camera') return { haut: paysage ? 24 : 36, bas: 24, rayon: 36 };
      if (f === 'tablette') return emu.plateforme === 'ios' ? { haut: 24, bas: 20, rayon: 22 } : { haut: 28, bas: 24, rayon: 18 };
      return { haut: 24, bas: 0, rayon: 10 };
    }

    function emulateur(body) {
      const distant = cfg.mode === 'distant';
      const texteBarre = M.fonce(cfg.couleur) ? '#fff' : '#111';
      body.innerHTML = `<div class="stack">
        <div class="panel"><div class="panel-body row" style="gap:10px">
          <select class="tv-select" id="emAppareil" style="width:auto">${APPAREILS.map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(([cle, nom, , w, h]) => `<option value="${cle}" ${cle === emu.appareil ? 'selected' : ''}>${esc(nom)} — ${w} × ${h}</option>`).join('')}</optgroup>`).join('')}
            <option value="libre" ${emu.appareil === 'libre' ? 'selected' : ''}>Personnalisé (taille libre)</option></select>
          <span class="row" style="gap:4px"><input class="tv-input mono" type="number" id="emL" min="240" max="2048" value="${emu.l}" style="width:84px" title="Largeur (points)"><span class="muted">×</span>
            <input class="tv-input mono" type="number" id="emH" min="240" max="2048" value="${emu.h}" style="width:84px" title="Hauteur (points)"></span>
          <select class="tv-select" id="emPlateforme" style="width:auto" title="Système simulé"><option value="ios" ${emu.plateforme === 'ios' ? 'selected' : ''}>iOS</option><option value="android" ${emu.plateforme === 'android' ? 'selected' : ''}>Android</option></select>
          <button class="btn btn-outline btn-sm" id="emTourner" title="Portrait / paysage"><span class="mdi mdi-phone-rotate-landscape"></span>Tourner</button>
          <select class="tv-select" id="emZoom" style="width:auto" title="Zoom">${[['ajuster', 'Ajuster'], ['1', '100 %'], ['0.75', '75 %'], ['0.5', '50 %']].map(([v, l]) => `<option value="${v}" ${String(emu.zoom) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <div class="spacer"></div>
          <button class="btn btn-outline btn-sm" id="emAgrandir" title="Afficher l’émulateur en grand (cliquer autour ou Échap pour revenir)"><span class="mdi mdi-fullscreen"></span>Agrandir</button>
          <button class="btn btn-primary btn-sm" id="emLancer"><span class="mdi mdi-play"></span>Relancer l’app</button>
          <a class="btn btn-ghost btn-sm" id="emOnglet" target="_blank" rel="noopener" hidden><span class="mdi mdi-open-in-new"></span>Nouvel onglet</a>
        </div>
        <div class="panel-body small muted" style="border-top:1px solid var(--border);padding-top:10px" id="emInfo"></div></div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start">
          <div id="emScene" style="overflow:auto;min-height:420px;padding:8px">
            <div class="em-grand-barre"><span id="emGrandNom"></span><span class="spacer"></span><span class="small">Clique autour ou Échap pour revenir</span>
              <button class="btn btn-ghost btn-sm" id="emGrandRelancer" title="Relancer l’app"><span class="mdi mdi-reload"></span>Relancer</button>
              <button class="btn btn-ghost btn-sm" id="emFermer" title="Revenir à la taille normale (Échap)"><span class="mdi mdi-close"></span>Revenir</button></div>
            <div id="emBoite" style="position:relative">
              <div id="emCadre" style="background:#0d0d12;padding:14px;box-shadow:0 18px 50px rgba(0,0,0,.28);box-sizing:border-box;transform-origin:0 0;position:absolute;left:0;top:0">
                <div id="emVerre" style="position:relative;overflow:hidden;background:${esc(cfg.fondSplash)};display:flex;flex-direction:column">
                  <div id="emBarre" style="flex:none;background:${esc(cfg.couleur)};color:${texteBarre};display:flex;align-items:center;justify-content:space-between;font:600 13px system-ui,sans-serif;position:relative;overflow:hidden">
                    <span>9:41</span><span id="emEncoche"></span><span class="mdi mdi-battery-high"></span></div>
                  <iframe id="emEcran" title="Application" style="flex:1;width:100%;border:0;background:#fff;display:block" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin allow-downloads"></iframe>
                  <div id="emBas" style="flex:none;background:#fff;display:flex;align-items:center;justify-content:center"><span id="emTrait" style="height:5px;border-radius:3px;background:#111"></span></div>
                  <div id="emVignette" title="Cliquer pour agrandir"><span>Cliquer pour agrandir</span></div>
                  <div id="emSplash" style="position:absolute;inset:0;background:${esc(cfg.fondSplash)};display:grid;place-items:center;transition:opacity .3s;overflow:hidden"></div>
                </div>
                <div id="emPoignee" title="Tirer pour changer la taille" style="position:absolute;right:-6px;bottom:-6px;width:26px;height:26px;border-radius:50%;background:var(--color-accent);color:#fff;display:grid;place-items:center;cursor:nwse-resize;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span class="mdi mdi-resize-bottom-right"></span></div>
              </div></div></div>
          <div class="stack">
            <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-format-list-bulleted"></span>Journal</span><div class="spacer"></div><button class="btn btn-ghost btn-xs" id="emVider">Vider</button></div>
              <div class="panel-body" style="max-height:360px;overflow:auto"><div id="emJournal" class="stack" style="gap:6px"></div>
              <p class="small muted" style="margin:8px 0 0">Les appels partent vraiment vers le serveur. Dans l’aperçu, c’est le navigateur qui les fait : un refus du serveur (CORS, cookies) est normal ici et ne se produira pas dans l’app en réseau natif. L’adresse affichée est celle que l’app appellera.</p></div></div>
            <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-android"></span>Vrais émulateurs</span></div><div class="panel-body stack">
              <p class="small muted" style="margin:0">Pour un essai 100 % fidèle (réseau natif, impression, partage), dans le projet téléchargé :</p>
              <pre class="code">npm run emulateur:android   # émulateur Android ou téléphone en USB
npm run emulateur:ios       # simulateur iOS (Mac avec Xcode)</pre>
              <p class="small muted" style="margin:0">Tablettes : dans Android Studio › Device Manager, crée un « Pixel Tablet » ; dans Xcode, choisis un simulateur iPad.</p></div></div>
          </div></div></div>`;
      const q = s => body.querySelector(s);
      const ecran = q('#emEcran'), splash = q('#emSplash');
      let echelle = 1;
      let grand = true;   // en grand dès que l'onglet est choisi ; cliquer autour le ramène dans la page

      /** Applique taille, échelle et habillage sans recharger l'app. */
      function appliquer() {
        const m = marges(), paysage = emu.l > emu.h;
        const scene = q('#emScene');
        const dispo = Math.max(320, (scene.clientWidth || 800) - 24);
        scene.classList.toggle('em-grand', grand);
        document.documentElement.classList.toggle('em-grand-ouvert', grand);
        if (grand) echelle = Math.min(2, (window.innerWidth - 48) / (emu.l + 28), (window.innerHeight - 88) / (emu.h + 28));
        else echelle = emu.zoom === 'ajuster' ? Math.min(1, dispo / (emu.l + 28), Math.max(420, window.innerHeight - 300) / (emu.h + 28)) : Number(emu.zoom);
        const cadre = q('#emCadre'), verre = q('#emVerre');
        cadre.style.width = (emu.l + 28) + 'px'; cadre.style.height = (emu.h + 28) + 'px';
        cadre.style.borderRadius = (m.rayon + 14) + 'px';
        cadre.style.transform = `scale(${echelle})`;
        q('#emBoite').style.width = Math.round((emu.l + 28) * echelle) + 'px';
        q('#emBoite').style.height = Math.round((emu.h + 28) * echelle) + 'px';
        verre.style.width = emu.l + 'px'; verre.style.height = emu.h + 'px'; verre.style.borderRadius = m.rayon + 'px';
        const barre = q('#emBarre');
        barre.style.height = m.haut + 'px'; barre.style.padding = `0 ${emu.forme === 'ilot' ? 30 : 16}px`;
        q('#emEncoche').innerHTML = emu.forme === 'ilot' && !paysage ? '<span style="position:absolute;left:50%;top:11px;transform:translateX(-50%);width:124px;height:35px;border-radius:20px;background:#000"></span>'
          : emu.forme === 'camera' ? '<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#000"></span>' : '';
        q('#emBas').style.height = m.bas + 'px';
        q('#emTrait').style.width = m.bas ? (emu.plateforme === 'ios' ? 134 : 108) + 'px' : '0';
        q('#emL').value = emu.l; q('#emH').value = emu.h;
        const nom = emu.appareil === 'libre' ? 'Taille personnalisée' : PRESETS[emu.appareil].nom;
        const telephone = !['tablette', 'libre'].includes(emu.forme);
        const verrou = telephone && cfg.orientation === 'portrait' && paysage;
        q('#emInfo').innerHTML = `<b>${esc(nom)}</b> · ${emu.l} × ${emu.h} points · ${paysage ? 'paysage' : 'portrait'} · ${emu.plateforme === 'ios' ? 'iOS' : 'Android'} · zoom ${Math.round(echelle * 100)} %`
          + (verrou ? ' · <span style="color:var(--color-warning)">l’app est réglée « portrait seulement » : sur un vrai téléphone elle ne tournera pas (les tablettes, elles, tournent toujours)</span>' : '')
          + `<span id="emMode"></span>`;
        q('#emGrandNom').textContent = `${nom} · ${emu.l} × ${emu.h} · zoom ${Math.round(echelle * 100)} %`;
        AB.mobile.emuDernier = { appareil: emu.appareil, l: emu.l, h: emu.h, plateforme: emu.plateforme, forme: emu.forme, zoom: emu.zoom };
      }

      const dessinerJournal = () => {
        const el = q('#emJournal');
        if (!el) return;
        el.innerHTML = emu.journal.slice(-150).map(j => `<div class="small" style="display:flex;gap:6px;align-items:flex-start"><span class="chip ${j.cls}" style="flex:none">${esc(j.etiquette)}</span><span class="mono" style="word-break:break-all">${esc(j.texte)}</span></div>`).join('') || '<span class="small muted">Rien pour l’instant.</span>';
        el.parentElement.scrollTop = el.parentElement.scrollHeight;
      };
      const noter = (etiquette, cls, texte) => { emu.journal.push({ etiquette, cls, texte }); dessinerJournal(); };
      const recevoir = e => {
        const d = e.data;
        if (!d || !d.abApercu || e.source !== ecran.contentWindow) return;
        if (d.type === 'demarrage') noter('Démarrage', 'chip-info', `App lancée comme sur ${d.plateforme === 'ios' ? 'iOS' : 'Android'} (pont mobile actif)`);
        if (d.type === 'requete') {
          if (/^(data|blob):/.test(d.url)) return;
          noter(d.methode, d.erreur ? 'chip-danger' : d.statut >= 400 ? 'chip-warning' : 'chip-success', `${d.url} → ${d.erreur ? 'refusé dans l’aperçu (' + d.erreur + ')' : d.statut}`);
        }
        if (d.type === 'natif') noter('Natif', 'chip-accent', d.texte);
        if (d.type === 'erreur') noter('Erreur', 'chip-danger', d.texte);
        if (d.type === 'blanc') noter('Page blanche', 'chip-warning', 'Rien ne s’affiche après 4 s. Regarde les erreurs ci-dessus ; une app Vite doit être construite (npm run build, dossier dist/) et servie par le serveur local.');
        if (d.type === 'fichier') {
          noter('Partage', 'chip-accent', `${d.nom} : la feuille de partage s’ouvrirait (téléchargé ici)`);
          U.download(d.nom, new Blob([Uint8Array.from(atob(d.data || ''), c => c.charCodeAt(0))]));
        }
      };
      window.addEventListener('message', recevoir);
      const auRedim = () => appliquer();
      window.addEventListener('resize', auRedim);
      nettoyages.push(() => { window.removeEventListener('message', recevoir); window.removeEventListener('resize', auRedim); });

      const cacherSplash = () => setTimeout(() => { splash.style.opacity = '0'; setTimeout(() => { splash.hidden = true; }, 300); }, 600);
      const mode = h => { const el = q('#emMode'); if (el) el.innerHTML = h ? '<br>' + h : ''; };
      /** Affiche une explication dans l'écran du téléphone plutôt qu'une page blanche. */
      const message = (titre, texte) => {
        ecran.removeAttribute('src');
        ecran.srcdoc = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;font:15px/1.5 system-ui,sans-serif;color:#1d1d24;background:#f6f6f9;display:grid;place-items:center;min-height:100vh"><div style="max-width:420px;padding:28px;text-align:center"><div style="font-size:40px">⚠️</div><h2 style="font-size:19px;margin:8px 0 10px">${esc(titre)}</h2><p style="margin:0;color:#4a4a55">${esc(texte)}</p></div></body>`;
        cacherSplash();
      };
      const lancer = async () => {
        splash.hidden = false; splash.style.opacity = '1';
        splash.innerHTML = '<span class="mdi mdi-loading mdi-spin" style="color:#fff;font-size:28px"></span>';
        M.images(cfg, app).then(im => {
          const u = URL.createObjectURL(new Blob([im['assets/splash.png']], { type: 'image/png' }));
          splash.innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`;
          nettoyages.push(() => URL.revokeObjectURL(u));
        });
        ecran.onload = cacherSplash;
        const onglet = q('#emOnglet');
        if (distant) {
          if (!/^https:\/\//.test(cfg.url)) { mode('Renseigne l’adresse du site (onglet App et source).'); return cacherSplash(); }
          ecran.removeAttribute('srcdoc'); ecran.src = cfg.url;
          mode(`Site en ligne. S’il reste blanc, le site interdit l’affichage dans un cadre (X-Frame-Options) : c’est propre à l’aperçu, pas à l’app.`);
          onglet.hidden = false; onglet.href = cfg.url;
          return;
        }
        if (!SOURCES[id]) {
          mode('Choisis d’abord l’app à embarquer (onglet App et source).');
          return message('Aucune app chargée', 'Va dans l’onglet « App et source » et choisis le dossier dist/ de l’app construite (ou son ZIP). Il restera gardé ensuite.');
        }
        let src = SOURCES[id];
        const projet = AB.construire.projet(src);
        if (projet && !AB.construire.deja(src)) {
          noter('Construction', 'chip-info', `Code source détecté (${projet.outil || 'npm'}) : ${projet.commande} sur le serveur local.`);
          mode(`<span class="mdi mdi-loading mdi-spin"></span> Construction de l’app : ${esc(projet.commande)}. La première fois, l’installation peut prendre une à deux minutes.`);
          try {
            let etape = '';
            src = await AB.construire.construire(app.id, src, e => {
              (e.lignes || []).forEach(l => noter('npm', '', l));
              if (e.etape && e.etape !== etape) { etape = e.etape; mode(`<span class="mdi mdi-loading mdi-spin"></span> ${esc(etape)}… (détail dans le journal)`); }
            }, () => ecran.isConnected && SOURCES[id] === src);
            noter('Construite', 'chip-success', src.resume);
            dessinerEtat();
          } catch (e) {
            if (e.code === 'quitte') return;
            noter('Bloquant', 'chip-danger', `${e.titre || 'Construction impossible'} : ${e.message}`);
            mode(`<b>${esc(e.titre || 'Construction impossible')}.</b> ${esc(e.message)}`);
            return message(e.titre || 'Construction impossible', e.message);
          }
          if (!ecran.isConnected) return;
        }
        src = actuelle();
        const brut = diag().constats.find(c => c.niveau === 'crit' && c.cle === 'source');
        if (brut) {
          noter('Bloquant', 'chip-danger', `${brut.titre} : ${brut.detail}`);
          mode(`<b>${esc(brut.titre)}.</b> ${esc(brut.detail)}`);
          return message(brut.titre, brut.detail + ' Le navigateur ne sait pas exécuter le code source d’une app Vite, Vue ou React tel quel : sans cette étape, l’écran reste blanc.');
        }
        const etat = await AB.ia.etat();
        if (etat.joignable) {
          try {
            mode('<span class="mdi mdi-loading mdi-spin"></span> Envoi au serveur local…');
            const url = await M.envoyerApercu(M.apercuFichiers(cfg, src, emu.plateforme));
            ecran.removeAttribute('srcdoc'); ecran.src = url + 'index.html?t=' + Date.now();
            mode(`Aperçu fidèle : l’app est servie à la racine par le serveur local (${esc(url)}), comme dans l’app native.`);
            onglet.hidden = false; onglet.href = url;
            return;
          } catch (e) { noter('Erreur', 'chip-danger', e.message); }
        }
        const r = M.apercuEnLigne(M.apercuFichiers(cfg, src, emu.plateforme, emu.plateforme === 'ios' ? 'capacitor://localhost/index.html' : 'https://localhost/index.html'));
        onglet.hidden = true;
        nettoyages.push(() => (r.blobs || []).forEach(u => URL.revokeObjectURL(u)));
        if (r.modules) {
          // Une app en modules (Vite…) ne peut pas tourner dans un cadre sans adresse : elle resterait blanche
          noter('Bloquant', 'chip-danger', 'App en modules JavaScript : il faut le serveur local de l’Atelier pour l’afficher.');
          mode('<b>Cette app charge des modules JavaScript (Vite, React…) : lance <code>node serveur.js</code> et ouvre l’Atelier sur http://localhost:8787.</b>');
          return message('Serveur local nécessaire', 'Cette app est construite avec Vite (modules JavaScript). Elle ne peut s’afficher que servie par le serveur local de l’Atelier. Lance lancer-atelier (ou node serveur.js dans le dossier de l’Atelier), ouvre http://localhost:8787, puis reviens ici et touche « Relancer l’app ».');
        }
        ecran.removeAttribute('src'); ecran.srcdoc = r.html;
        mode(r.enModules ? 'Aperçu sans serveur local (app en modules, chargée dans ce navigateur). Pour l’aperçu le plus fidèle : <code>node serveur.js</code>, puis l’Atelier sur http://localhost:8787.'
          : 'Aperçu rapide (sans serveur local). Pour l’aperçu fidèle : <code>node serveur.js</code>, puis l’Atelier sur http://localhost:8787.');
      };

      // Changer d'appareil ou de taille ne relance pas l'app (on voit tout de suite la mise en page s'adapter)
      q('#emAppareil').onchange = e => {
        emu.appareil = e.target.value;
        const p = PRESETS[emu.appareil];
        if (p) { const paysage = emu.l > emu.h; Object.assign(emu, { l: paysage ? p.h : p.w, h: paysage ? p.w : p.h, plateforme: p.plateforme, forme: p.forme }); q('#emPlateforme').value = p.plateforme; }
        else emu.forme = 'libre';
        appliquer();
      };
      const libre = () => { emu.appareil = 'libre'; emu.forme = 'libre'; q('#emAppareil').value = 'libre'; };
      const borne = v => Math.max(240, Math.min(2048, Math.round(Number(v) || 0)));
      q('#emL').onchange = e => { emu.l = borne(e.target.value); libre(); appliquer(); };
      q('#emH').onchange = e => { emu.h = borne(e.target.value); libre(); appliquer(); };
      q('#emPlateforme').onchange = e => { emu.plateforme = e.target.value; appliquer(); lancer(); };
      q('#emTourner').onclick = () => { [emu.l, emu.h] = [emu.h, emu.l]; appliquer(); };
      q('#emZoom').onchange = e => { emu.zoom = e.target.value; appliquer(); };
      q('#emLancer').onclick = () => { emu.journal = []; dessinerJournal(); lancer(); };
      q('#emVider').onclick = () => { emu.journal = []; dessinerJournal(); };
      // Poignée : tirer pour redimensionner librement
      q('#emPoignee').onpointerdown = e => {
        e.preventDefault();
        const x0 = e.clientX, y0 = e.clientY, l0 = emu.l, h0 = emu.h, s = echelle;
        ecran.style.pointerEvents = 'none';
        libre();
        const bouger = ev => { emu.l = borne(l0 + (ev.clientX - x0) / s); emu.h = borne(h0 + (ev.clientY - y0) / s); appliquer(); };
        const finir = () => { ecran.style.pointerEvents = ''; window.removeEventListener('pointermove', bouger); window.removeEventListener('pointerup', finir); };
        window.addEventListener('pointermove', bouger);
        window.addEventListener('pointerup', finir);
      };
      // Mode grand : le cadre reste au même endroit du DOM (le déplacer rechargerait l'app)
      const basculer = v => { grand = v; appliquer(); };
      q('#emAgrandir').onclick = () => basculer(true);
      q('#emFermer').onclick = () => basculer(false);
      q('#emGrandRelancer').onclick = () => q('#emLancer').click();
      q('#emScene').addEventListener('click', e => {
        if (grand) { if (e.target === q('#emScene') || e.target === q('#emBoite')) basculer(false); }
        else if (q('#emCadre').contains(e.target) && !q('#emPoignee').contains(e.target)) basculer(true);
      });
      const echap = e => { if (grand && e.key === 'Escape') basculer(false); };
      window.addEventListener('keydown', echap);
      nettoyages.push(() => { window.removeEventListener('keydown', echap); document.documentElement.classList.remove('em-grand-ouvert'); });
      appliquer();
      dessinerJournal();
      lancer();
    }

    /* ---------- Onglet Diagnostic ---------- */
    const CIBLES = { source: 'general', url: 'general', appId: 'general', version: 'general', api: 'serveur', prefixes: 'serveur', remplacer: 'serveur', impression: 'fonctions', telechargements: 'fonctions', photos: 'fonctions', camera: 'fonctions', localisation: 'fonctions', sauvegardeAndroid: 'fonctions' };
    function diagnostic(body) {
      const d = diag();
      body.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-stethoscope"></span>Diagnostic</span><div class="spacer"></div>
          <span class="small muted">Analyse du code de l’app et des règles des stores. Elle ne remplace pas un essai sur un vrai téléphone.</span></div>
        <div class="panel-body stack">${d.constats.map(c => `<div class="bar ${BAR[c.niveau]}"><span class="mdi ${NIVEAUX[c.niveau][1]}"></span><div style="flex:1"><b>${esc(c.titre)}</b> <span class="chip ${NIVEAUX[c.niveau][0]}">${NIVEAUX[c.niveau][2]}</span><div class="small" style="margin-top:2px">${esc(c.detail)}</div></div>
          ${c.cle && CIBLES[c.cle] ? `<button class="btn btn-outline btn-xs" data-aller="${CIBLES[c.cle]}">Régler</button>` : ''}</div>`).join('') || '<div class="empty">Rien à signaler.</div>'}</div></div>`;
      body.querySelectorAll('[data-aller]').forEach(b => b.onclick = () => aller(b.dataset.aller));
    }

    /* ---------- Onglet Stores ---------- */
    function stores(body) {
      const faites = ETAPES.reduce((n, [, l]) => n + l.filter(e => cfg.etapes[e[0]]).length, 0), total = ETAPES.reduce((n, [, l]) => n + l.length, 0);
      body.innerHTML = `<div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-account-check-outline"></span>Ce que toi seul peux faire</span><div class="spacer"></div><span class="chip ${faites === total ? 'chip-success' : ''}">${faites} / ${total}</span></div>
          <div class="panel-body stack">${ETAPES.map(([titre, l]) => `<div><div class="palette-cat" style="margin-bottom:6px">${esc(titre)}</div>
            ${l.map(([cle, texte, lien]) => `<label class="check" style="margin:4px 0"><input type="checkbox" data-etape="${cle}" ${cfg.etapes[cle] ? 'checked' : ''}><span>${esc(texte)}${lien ? ` <a href="${esc(lien)}" target="_blank" rel="noopener" class="small">ouvrir</a>` : ''}</span></label>`).join('')}</div>`).join('')}
          </div></div>
        <div class="stack">
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-console"></span>Construire</span></div><div class="panel-body stack">
            <p class="small muted" style="margin:0">Dézippe le projet, puis dans son dossier :</p>
            <pre class="code">npm run preparer   # iOS + Android, icônes, version, copie de l’app
npm run android    # Android Studio
npm run ios        # Xcode (sur Mac)</pre>
            <p class="small muted" style="margin:0">Le détail pas à pas est dans <b>GUIDE-STORES.md</b> (comptes, signature, fiches, revue) et <b>README.md</b> (mise à jour). Sans Android Studio : pousse le projet sur GitHub, l’action « Android » construit l’APK ou le .aab signé.</p>
          </div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-history"></span>Exports</span></div><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Date</th><th>Version</th><th>Mode</th></tr></thead><tbody>
            ${(cfg.exports || []).map(e => `<tr><td class="small">${esc(U.fmtDate(e.date))}</td><td>v${esc(e.version)} · build ${esc(e.build)}</td><td class="small">${e.mode === 'distant' ? 'Site en ligne' : 'Embarquée'}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucun export pour l’instant.</td></tr>'}
          </tbody></table></div></div></div>
        </div></div>`;
      body.querySelectorAll('[data-etape]').forEach(c => c.onchange = () => { cfg.etapes[c.dataset.etape] = c.checked; enregistrer(); dessinerCorps(); });
    }

    function dessinerCorps() {
      const body = $('#moCorps');
      nettoyages.splice(0).forEach(f => f());
      ({ general, serveur, apparence, fonctions, emulateur, diagnostic, stores })[onglet](body);
    }

    /* ---------- Export ---------- */
    async function exporter() {
      const d = diag();
      if (d.bloquants) {
        const ok = await new Promise(resolve => U.dialog({
          title: 'Points bloquants', size: 'md',
          body: `<p style="margin-top:0">L’app risque de ne pas marcher ou d’être refusée :</p>${d.constats.filter(c => c.niveau === 'crit').map(c => `<div class="bar crit" style="margin-bottom:8px"><span class="mdi mdi-close-octagon-outline"></span><div><b>${esc(c.titre)}</b><div class="small">${esc(c.detail)}</div></div></div>`).join('')}`,
          actions: [{ label: 'Exporter quand même', cls: 'btn-outline', onClick: () => resolve(true) }, { label: 'Voir le diagnostic', cls: 'btn-primary', onClick: () => { resolve(false); aller('diagnostic'); } }]
        }));
        if (!ok) return;
      }
      if (cfg.mode !== 'distant' && !SOURCES[id]) return aller('general');
      // App de l'Atelier : même règle que l'export ZIP (audit de sécurité avant de livrer)
      if (app.origine === 'plateforme' && SOURCES[id] && SOURCES[id].type === 'atelier') {
        const regle = AB.kits.valeurs(app, 'securite').auditExport;
        if (regle && regle !== 'non') {
          const audit = AB.audit.auditerApp(app);
          await AB.audit.enregistrer(audit);
          app.audits = [{ id: audit.id, date: audit.date, type: audit.cible.type, score: audit.score, note: audit.note, bloquants: audit.bloquants }].concat(app.audits || []).slice(0, 30);
          if (audit.bloquants && regle === 'bloquer') {
            U.dialog({ title: 'Export bloqué par le kit de cybersécurité', size: 'sm', body: `<p style="margin:0">L’audit de sécurité a trouvé ${audit.comptes.critique} point(s) critique(s) et ${audit.comptes.elevee} élevé(s) à corriger avant de livrer.</p>`,
              actions: [{ label: 'Fermer' }, { label: 'Voir le rapport', cls: 'btn-primary', onClick: () => AB.app.go('audit/rapport/' + audit.id) }] });
            return;
          }
          if (audit.bloquants && !(await U.confirm('Audit de sécurité', `Points à corriger (note ${audit.note}). Exporter quand même ?`, { okLabel: 'Exporter quand même' }))) return;
        }
      }
      const bouton = $('#moExport');
      bouton.disabled = true;
      try {
        cfg.build += 1;
        const r = await M.exporter(app, cfg, actuelle());
        cfg.exports = [{ date: U.now(), version: cfg.version, build: cfg.build, mode: cfg.mode }].concat(cfg.exports || []).slice(0, 30);
        clearTimeout(timer); timer = null;
        app.mobile = cfg;
        await AB.apps.enregistrer(app);
        U.download(r.nom, r.blob);
        U.toast('success', `Projet mobile v${cfg.version} (build ${cfg.build}) téléchargé`, 'Dézippe-le puis lance npm run preparer.', 6000);
        dessinerEtat(); dessinerCorps();
      } catch (e) {
        console.error(e);
        cfg.build -= 1;
        U.toast('error', 'Export impossible', e.message);
      } finally { bouton.disabled = false; }
    }
    $('#moExport').onclick = exporter;

    if (!app.mobile) { app.mobile = cfg; if (SOURCES[id]) suggerer(true); await AB.apps.enregistrer(app); }
    dessinerEtat();
    dessinerOnglets();
    dessinerCorps();
    return {
      destroy() {
        if (timer) { clearTimeout(timer); timer = null; app.mobile = cfg; AB.apps.enregistrer(app); }
        if (apercu) apercu.forEach(u => URL.revokeObjectURL(u));
        nettoyages.splice(0).forEach(f => f());
      }
    };
  }
})();
