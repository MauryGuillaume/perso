/* ==========================================================================
   ab-apercu.js — onglet « Aperçu » d'une app : la voir telle qu'elle s'affiche
   dans un navigateur (ordinateur, tablette, téléphone), ou dans un nouvel onglet.
   Source : le dossier ou le ZIP choisi (gardé, partagé avec Apps mobiles), le code
   importé dans « Code et versions », ou l'adresse en production.
   Avec le serveur local, l'app est servie à la racine (aperçu fidèle) ; sinon elle
   est intégrée dans la page (modules Vite compris).
   Code source (Vite, Vue, React…) : le serveur local l'installe et le construit tout seul
   (ab-construire.js), puis l'aperçu montre le dossier construit.
   ========================================================================== */
(function () {
  const U = AB.u, M = AB.mobile, esc = U.esc;
  const P = AB.apercu = {};
  const SOURCES = {};   // source chargée par app, pour la session

  const ECRANS = [
    ['ordinateur', 'Ordinateur', 1440, 900, 'mdi-monitor'],
    ['portable', 'Ordinateur portable', 1280, 800, 'mdi-laptop'],
    ['tablette', 'iPad Pro 13"', 1032, 1376, 'mdi-tablet'],
    ['telephone', 'iPhone 16', 393, 852, 'mdi-cellphone']
  ];
  const reglage = { ecran: 'ordinateur', origine: 'fichiers' };

  /* Chargé en premier dans la page de l'app : erreurs vers le journal, historique sans adresse (page intégrée). */
  const PRELUDE = `(function () {
  function dire(m) { try { var c = window.parent !== window ? window.parent : window.opener; if (c) c.postMessage(Object.assign({ abApercuWeb: true }, m), '*'); } catch (e) {} }
  // Pas de service worker dans l'aperçu : il garderait d'anciennes versions en cache
  try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return new Promise(function () {}); }; } catch (e) {}
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k].bind(history);
    history[k] = function (etat, titre, url) { try { return orig(etat, titre, url); } catch (e) { return orig(etat, titre); } };
  });
  window.addEventListener('error', function (e) { dire({ type: 'erreur', texte: e.message + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '') }); });
  window.addEventListener('unhandledrejection', function (e) { dire({ type: 'erreur', texte: 'Promesse rejetée : ' + (e.reason && e.reason.message || e.reason) }); });
  var f = window.fetch;
  if (f) window.fetch = function (r, o) {
    var url = String(r && r.url || r), m = (o && o.method) || (r && r.method) || 'GET';
    return f.apply(this, arguments).then(function (x) { if (!/^(data|blob):/.test(url)) dire({ type: 'requete', methode: m, url: url, statut: x.status }); return x; },
      function (err) { dire({ type: 'requete', methode: m, url: url, erreur: err && err.message || 'échec' }); throw err; });
  };
  setTimeout(function () { var b = document.body; if (b && !(b.innerText || '').trim() && !b.querySelector('img,canvas,svg,video')) dire({ type: 'blanc' }); }, 4000);
  dire({ type: 'demarrage' });
})();
`;

  /** Fichiers de la page : ceux de l'app, plus le prélude chargé avant tout le reste. */
  function fichiersPage(source) {
    const out = Object.assign({}, source.fichiers);
    const index = M.texte(out['index.html'] || '');
    out['index.html'] = /<head[^>]*>/i.test(index) ? index.replace(/<head[^>]*>/i, m => m + '\n<script src="/apercu-web.js"></script>') : '<script src="/apercu-web.js"></script>\n' + index;
    out['apercu-web.js'] = PRELUDE;
    return out;
  }

  P.vue = async function (corps, app) {
    const nettoyages = [];
    const nettoyer = () => nettoyages.splice(0).forEach(f => { try { f(); } catch (e) { /* déjà fait */ } });
    const journal = [];
    const code = AB.code.courante(app);
    const prod = (app.liens && app.liens.prod) || '';
    corps.innerHTML = '<div class="empty"><span class="mdi mdi-loading mdi-spin"></span> Chargement de l’app…</div>';
    if (!SOURCES[app.id]) SOURCES[app.id] = await M.sourceGardee(app.id);
    if (!SOURCES[app.id] && code) { try { SOURCES[app.id] = await M.sourceZip(await AB.code.zip(app), `${app.nom} v${code.numero}`); } catch (e) { console.warn(e); } }
    if (!SOURCES[app.id] && prod) reglage.origine = 'prod';

    function dessiner() {
      nettoyer();
      const s = SOURCES[app.id];
      const enLigne = reglage.origine === 'prod';
      corps.innerHTML = `<div class="stack">
        <div class="panel"><div class="panel-body row" style="gap:10px;flex-wrap:wrap">
          <span class="row" style="gap:4px">${ECRANS.map(([k, n, , , i]) => `<button class="btn btn-sm ${k === reglage.ecran ? 'btn-primary' : 'btn-outline'}" data-ecran="${k}" title="${esc(n)}"><span class="mdi ${i}"></span>${esc(n)}</button>`).join('')}</span>
          <div class="spacer"></div>
          <select class="tv-select" id="apOrigine" style="width:auto">
            <option value="fichiers" ${!enLigne ? 'selected' : ''}>Fichiers de l’app</option>
            <option value="prod" ${enLigne ? 'selected' : ''} ${prod ? '' : 'disabled'}>Site en ligne${prod ? '' : ' (adresse non renseignée)'}</option></select>
          <button class="btn btn-outline btn-sm" id="apDossier"><span class="mdi mdi-folder-open-outline"></span>Dossier</button>
          <button class="btn btn-outline btn-sm" id="apZip"><span class="mdi mdi-folder-zip-outline"></span>ZIP</button>
          ${code ? `<button class="btn btn-outline btn-sm" id="apCode" title="Code importé dans « Code et versions »"><span class="mdi mdi-source-branch"></span>Code v${code.numero}</button>` : ''}
          <button class="btn btn-outline btn-sm" id="apRelancer"><span class="mdi mdi-reload"></span>Relancer</button>
          <button class="btn btn-primary btn-sm" id="apOnglet"><span class="mdi mdi-open-in-new"></span>Ouvrir dans un nouvel onglet</button>
        </div>
        <div class="panel-body small muted" style="border-top:1px solid var(--border);padding-top:10px" id="apInfo">${enLigne ? `Site en ligne : ${esc(prod)}` : s ? esc((AB.construire.deja(s) || s).resume) : 'Aucune app chargée : choisis le dossier de l’app ou son ZIP (le code source est construit tout seul avec le serveur local).'}</div></div>
        <div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start">
          <div id="apScene" style="overflow:hidden"><div id="apBoite" style="position:relative">
            <div id="apCadre" style="position:absolute;left:0;top:0;transform-origin:0 0;background:#0d0d12;border-radius:14px;padding:10px;box-shadow:0 18px 50px rgba(0,0,0,.25);box-sizing:border-box">
              <div id="apBarre" style="height:30px;display:flex;align-items:center;gap:6px;padding:0 10px;color:#9a9aa5;font:12px system-ui,sans-serif"><span style="width:10px;height:10px;border-radius:50%;background:#ff5f57"></span><span style="width:10px;height:10px;border-radius:50%;background:#febc2e"></span><span style="width:10px;height:10px;border-radius:50%;background:#28c840"></span><span id="apAdresse" style="margin-left:10px;flex:1;background:#1d1d24;border-radius:6px;padding:4px 10px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"></span></div>
              <iframe id="apEcran" title="Aperçu de l’app" style="display:block;border:0;background:#fff;border-radius:6px" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin allow-downloads"></iframe>
            </div></div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-format-list-bulleted"></span>Journal</span><div class="spacer"></div><button class="btn btn-ghost btn-xs" id="apVider">Vider</button></div>
            <div class="panel-body" style="max-height:520px;overflow:auto"><div id="apJournal" class="stack" style="gap:6px"></div>
            <p class="small muted" style="margin:8px 0 0">L’app appelle vraiment son serveur (API). Si la connexion échoue, vérifie que l’API tourne et que l’app a été construite avec la bonne adresse d’API.</p></div></div>
        </div></div>`;
      const q = x => corps.querySelector(x);
      const ecran = q('#apEcran');

      const appliquer = () => {
        if (!corps.isConnected) return nettoyer();   // page quittée
        const [, , l, h] = ECRANS.find(e => e[0] === reglage.ecran);
        const dispo = Math.max(320, q('#apScene').clientWidth - 8), haut = Math.max(480, window.innerHeight - 260);
        const ech = Math.min(1, dispo / (l + 20), haut / (h + 50));
        const cadre = q('#apCadre');
        cadre.style.width = (l + 20) + 'px'; cadre.style.height = (h + 50) + 'px'; cadre.style.transform = `scale(${ech})`;
        ecran.style.width = l + 'px'; ecran.style.height = h + 'px';
        q('#apBoite').style.width = Math.round((l + 20) * ech) + 'px'; q('#apBoite').style.height = Math.round((h + 50) * ech) + 'px';
      };
      const dessinerJournal = () => {
        const el = q('#apJournal'); if (!el) return;
        el.innerHTML = journal.slice(-150).map(j => `<div class="small" style="display:flex;gap:6px;align-items:flex-start"><span class="chip ${j.cls}" style="flex:none">${esc(j.etiquette)}</span><span class="mono" style="word-break:break-all">${esc(j.texte)}</span></div>`).join('') || '<span class="small muted">Rien pour l’instant.</span>';
        el.parentElement.scrollTop = el.parentElement.scrollHeight;
      };
      const noter = (etiquette, cls, texte) => { journal.push({ etiquette, cls, texte }); dessinerJournal(); };
      const recevoir = e => {
        const d = e.data;
        if (!d || !d.abApercuWeb || e.source !== ecran.contentWindow) return;
        if (d.type === 'demarrage') noter('Démarrage', 'chip-info', 'App lancée');
        if (d.type === 'erreur') noter('Erreur', 'chip-danger', d.texte);
        if (d.type === 'blanc') noter('Page blanche', 'chip-warning', 'Rien ne s’affiche après 4 s : regarde les erreurs ci-dessus. Une app Vite, Vue ou React doit être construite (npm run build, dossier dist/).');
        if (d.type === 'requete') noter(d.methode, d.erreur ? 'chip-danger' : d.statut >= 400 ? 'chip-warning' : 'chip-success', `${d.url} → ${d.erreur ? 'pas de réponse (' + d.erreur + ') : l’API est-elle lancée ?' : d.statut}`);
      };
      window.addEventListener('message', recevoir);
      window.addEventListener('resize', appliquer);
      nettoyages.push(() => { window.removeEventListener('message', recevoir); window.removeEventListener('resize', appliquer); });

      const message = (titre, texte) => {
        ecran.removeAttribute('src');
        ecran.srcdoc = `<!doctype html><meta charset="utf-8"><body style="margin:0;font:15px/1.5 system-ui,sans-serif;color:#1d1d24;background:#f6f6f9;display:grid;place-items:center;min-height:100vh"><div style="max-width:460px;padding:28px;text-align:center"><div style="font-size:40px">⚠️</div><h2 style="font-size:19px;margin:8px 0 10px">${esc(titre)}</h2><p style="margin:0;color:#4a4a55">${esc(texte)}</p></div></body>`;
      };
      /** Écran d'attente pendant la construction. */
      const attente = (titre, texte) => {
        ecran.removeAttribute('src');
        ecran.srcdoc = `<!doctype html><meta charset="utf-8"><style>@keyframes t{to{transform:rotate(360deg)}}</style><body style="margin:0;font:15px/1.5 system-ui,sans-serif;color:#1d1d24;background:#f6f6f9;display:grid;place-items:center;min-height:100vh"><div style="max-width:480px;padding:28px;text-align:center"><div style="width:34px;height:34px;margin:0 auto;border:4px solid #d9d9e3;border-top-color:#001047;border-radius:50%;animation:t 1s linear infinite"></div><h2 style="font-size:19px;margin:14px 0 10px">${esc(titre)}</h2><p style="margin:0;color:#4a4a55">${esc(texte)}</p></div></body>`;
      };
      /** Source à afficher : celle choisie, ou sa version construite par le serveur local si c'est du code source. */
      const preparer = async () => {
        const src = SOURCES[app.id];
        const projet = AB.construire.projet(src);
        if (!projet) return src;
        const deja = AB.construire.deja(src);
        if (deja) return deja;
        q('#apAdresse').textContent = 'Construction de l’app…';
        noter('Construction', 'chip-info', `Code source détecté (${projet.outil || 'npm'}) : ${projet.commande} sur le serveur local.`);
        attente('Construction de l’app…', `${projet.commande}. La première fois, l’installation peut prendre une à deux minutes ; ensuite c’est bien plus rapide.`);
        let etape = '';
        try {
          const s = await AB.construire.construire(app.id, src, e => {
            (e.lignes || []).forEach(l => noter('npm', '', l));
            if (e.etape && e.etape !== etape) { etape = e.etape; attente(etape + '…', `${projet.commande}. Le détail s’affiche dans le journal.`); }
          }, () => corps.isConnected && SOURCES[app.id] === src);
          noter('Construite', 'chip-success', s.resume);
          if (q('#apInfo')) q('#apInfo').textContent = s.resume;
          return s;
        } catch (e) {
          if (e.code === 'quitte') return null;
          noter('Bloquant', 'chip-danger', `${e.titre || 'Construction impossible'} : ${e.message}`);
          message(e.titre || 'Construction impossible', e.message);
          q('#apAdresse').textContent = '';
          return null;
        }
      };
      /** App avec son serveur (API, base) : lancée par le serveur local ; renvoie son port, ou null (message affiché). */
      const demarrerApp = async s => {
        const appSrv = AB.construire.serveurApp(s);
        const deja = AB.construire.portLance(s);
        if (deja) return deja;
        noter('Serveur', 'chip-info', `Cette app a son propre serveur${appSrv.base ? ' et une base PostgreSQL' : ''} : installation et lancement (${appSrv.commande}) par le serveur local.`);
        attente('Lancement de l’app…', `npm install${appSrv.base ? ', base de test' : ''}, puis ${appSrv.commande}. La première fois peut prendre une à deux minutes.`);
        q('#apAdresse').textContent = 'Lancement de l’app…';
        let etape = '';
        try {
          const port = await AB.construire.lancer(app.id, s, e => {
            (e.lignes || []).forEach(l => noter('app', '', l));
            if (e.etape && e.etape !== etape) { etape = e.etape; attente(etape + '…', 'Le détail s’affiche dans le journal.'); }
          }, () => corps.isConnected && SOURCES[app.id] === s);
          noter('Prête', 'chip-success', `Serveur de l’app lancé (port ${port}) : l’aperçu lui relaie /api. Compte de test : voir le README de l’app (souvent admin / adminadmin).`);
          return port;
        } catch (e) {
          if (e.code === 'quitte') return null;
          noter('Bloquant', 'chip-danger', `${e.titre || 'Lancement impossible'} : ${e.message}`);
          message(e.titre || 'Lancement impossible', e.message);
          q('#apAdresse').textContent = '';
          return null;
        }
      };
      const bloquant = s => {
        const crit = M.analyser(s, M.config(app)).constats.find(c => c.niveau === 'crit' && c.cle === 'source');
        if (crit) { noter('Bloquant', 'chip-danger', `${crit.titre} : ${crit.detail}`); message(crit.titre, crit.detail); }
        return crit;
      };

      /** Adresse servie par le serveur local, ou null s'il ne tourne pas. */
      const servir = async (s, relais) => {
        const etat = await AB.ia.etat();
        if (!etat.joignable) return null;
        try { return await M.envoyerApercu(fichiersPage(s), relais); } catch (e) { noter('Erreur', 'chip-danger', e.message); return null; }
      };
      const lancer = async () => {
        if (reglage.origine === 'prod') {
          ecran.removeAttribute('srcdoc'); ecran.src = prod; q('#apAdresse').textContent = prod;
          noter('Info', 'chip-info', 'Site en ligne. S’il reste blanc, le site interdit l’affichage dans un cadre : utilise « Ouvrir dans un nouvel onglet ».');
          return;
        }
        if (!SOURCES[app.id]) return message('Aucune app chargée', 'Choisis le dossier de l’app ou son ZIP avec les boutons au-dessus : l’app construite (dist/) ou son code source, que le serveur local construit tout seul. Il sera gardé ensuite.');
        const s = await preparer();
        if (!s || !corps.isConnected) return;
        if (bloquant(s)) return;
        let relais = null;
        if (AB.construire.serveurApp(s)) { relais = await demarrerApp(s); if (!relais || !corps.isConnected) return; }
        const url = await servir(s, relais);
        if (url) { ecran.removeAttribute('srcdoc'); ecran.src = url + 'index.html?t=' + Date.now(); q('#apAdresse').textContent = url; return; }
        const r = M.apercuEnLigne(fichiersPage(s));
        nettoyages.push(() => (r.blobs || []).forEach(u => URL.revokeObjectURL(u)));
        ecran.removeAttribute('src'); ecran.srcdoc = r.html;
        q('#apAdresse').textContent = 'Aperçu intégré (sans serveur local)';
      };
      const ouvrirOnglet = async () => {
        if (reglage.origine === 'prod') return window.open(prod, '_blank', 'noopener');
        if (!SOURCES[app.id]) return U.toast('warning', 'Aucune app chargée', 'Choisis d’abord le dossier ou le ZIP de l’app.');
        const s = AB.construire.projet(SOURCES[app.id]) ? AB.construire.deja(SOURCES[app.id]) : SOURCES[app.id];
        if (!s) return U.toast('info', 'App pas encore construite', 'Attends la fin de la construction dans l’aperçu, puis réessaie.');
        if (bloquant(s)) return;
        const relais = AB.construire.serveurApp(s) ? AB.construire.portLance(s) : null;
        if (AB.construire.serveurApp(s) && !relais) return U.toast('info', 'App pas encore lancée', 'Attends qu’elle s’affiche dans l’aperçu, puis réessaie.');
        const w = window.open('', '_blank');   // ouvert tout de suite (sinon le navigateur bloque la fenêtre)
        if (!w) return U.toast('warning', 'Fenêtre bloquée', 'Autorise les fenêtres pour l’Atelier dans le navigateur.');
        const url = await servir(s, relais);
        if (url) { w.location.href = url + 'index.html?t=' + Date.now(); return; }
        // Sans serveur : la page est écrite dans le nouvel onglet ; ses blobs restent valides tant que l'Atelier est ouvert
        const r = M.apercuEnLigne(fichiersPage(s));
        w.document.open(); w.document.write(r.html); w.document.close();
      };

      const choisir = (dossier, fn) => {
        const inp = document.createElement('input');
        inp.type = 'file';
        if (dossier) { inp.webkitdirectory = true; inp.multiple = true; } else inp.accept = '.zip';
        inp.onchange = async () => {
          if (!inp.files.length) return;
          q('#apInfo').innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Lecture…';
          try { SOURCES[app.id] = await fn(inp.files); await M.garderSource(app.id, SOURCES[app.id]); reglage.origine = 'fichiers'; }
          catch (e) { U.toast('error', 'Lecture impossible', e.message); }
          dessiner();
        };
        inp.click();
      };
      corps.querySelectorAll('[data-ecran]').forEach(b => b.onclick = () => { reglage.ecran = b.dataset.ecran; corps.querySelectorAll('[data-ecran]').forEach(x => x.className = `btn btn-sm ${x.dataset.ecran === reglage.ecran ? 'btn-primary' : 'btn-outline'}`); appliquer(); });
      q('#apOrigine').onchange = e => { reglage.origine = e.target.value; dessiner(); };
      q('#apDossier').onclick = () => choisir(true, f => M.sourceDossier(f));
      q('#apZip').onclick = () => choisir(false, f => M.sourceZip(f[0], f[0].name.replace(/\.zip$/i, '')));
      if (q('#apCode')) q('#apCode').onclick = async () => {
        try { SOURCES[app.id] = await M.sourceZip(await AB.code.zip(app), `${app.nom} v${code.numero}`); await M.garderSource(app.id, null); reglage.origine = 'fichiers'; }
        catch (e) { U.toast('error', 'Lecture impossible', e.message); }
        dessiner();
      };
      q('#apRelancer').onclick = () => { AB.construire.oublierLancement(SOURCES[app.id]); journal.length = 0; dessinerJournal(); lancer(); };
      q('#apVider').onclick = () => { journal.length = 0; dessinerJournal(); };
      q('#apOnglet').onclick = ouvrirOnglet;
      appliquer(); dessinerJournal(); lancer();
    }
    dessiner();
    return { destroy: nettoyer };
  };
})();
