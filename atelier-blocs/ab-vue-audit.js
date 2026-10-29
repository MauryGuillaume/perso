/* ==========================================================================
   ab-vue-audit.js — écran « Audit de sécurité »
   #/audit                   nouvel audit + historique
   #/audit/app/<id>          nouvel audit, app déjà choisie
   #/audit/rapport/<id>      rapport d'un audit (HTML, PDF, JSON)
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  const chipNote = a => `<span class="chip" style="background:${AB.rapport.COULEUR_NOTE[a.note]};color:#fff;font-weight:700">${esc(a.note)} · ${a.score}/100</span>`;
  const ICONES = { atelier: 'mdi-cellphone-cog', code: 'mdi-folder-search-outline', url: 'mdi-web-check' };
  AB.audit.chipNote = chipNote;

  /** Lance un audit, l'enregistre et ouvre le rapport. */
  async function executer(fn, etat) {
    etat('<span class="mdi mdi-loading mdi-spin"></span> Audit en cours…');
    try {
      const audit = await fn(t => etat(`<span class="mdi mdi-loading mdi-spin"></span> ${esc(t)}`));
      await AB.audit.enregistrer(audit);
      AB.app.go('audit/rapport/' + audit.id);
    } catch (e) {
      console.error(e);
      etat(`<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`);
    }
  }

  AB.vues.audit = async function (root, params) {
    const [mode, id] = params;
    if (mode === 'rapport') return rapport(root, id);
    AB.app.setCrumbs(['Audit de sécurité']);
    const apps = await AB.apps.lister();
    const plateforme = apps.filter(a => a.origine === 'plateforme'), existantes = apps.filter(a => a.origine === 'existante');
    const choisie = mode === 'app' ? apps.find(a => a.id === id) : null;
    let onglet = choisie ? (choisie.origine === 'plateforme' ? 'atelier' : 'code') : 'atelier';
    const serveur = await AB.ia.etat();
    const audits = await AB.audit.lister();
    const nomApp = idApp => (apps.find(a => a.id === idApp) || {}).nom;
    const optionsApps = (liste, sel, vide) => `${vide ? `<option value="">${esc(vide)}</option>` : ''}${liste.map(a => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nom)}</option>`).join('')}`;

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Cybersécurité</div><h2 class="section-title">Audit de sécurité</h2>
        <p class="section-desc">Teste la sécurité d’une app à tout moment : ${AB.audit.REGLES.length} contrôles alignés sur l’OWASP Top 10 (secrets exposés, injections, règles d’accès, webhooks, dépendances vulnérables, en-têtes HTTP…). Chaque audit produit un rapport avec note, preuves et plan d’action.</p></div></div>
      <div class="panel"><div class="tabs" id="auTabs" style="padding:0 8px"></div><div class="panel-body" id="auCorps"></div>
        <div class="panel-body" style="border-top:1px solid var(--border)"><div class="row"><button class="btn btn-primary" id="auGo"><span class="mdi mdi-shield-search"></span>Lancer l’audit</button><span id="auEtat" class="small"></span></div></div></div>
      <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-history"></span>Historique des audits</span><div class="spacer"></div><span class="small muted">${audits.length} audit(s)</span></div>
        <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Date</th><th>Cible</th><th>Note</th><th>Critiques / élevées</th><th></th></tr></thead><tbody>
        ${audits.map(a => `<tr><td class="small" style="white-space:nowrap">${esc(U.fmtDate(a.date))}</td>
          <td><span class="mdi ${ICONES[a.cible.type]}"></span> <b>${esc(a.cible.nom)}</b><div class="small muted">${esc(AB.rapport.TYPES[a.cible.type])}${a.cible.appId && nomApp(a.cible.appId) && nomApp(a.cible.appId) !== a.cible.nom ? ' · ' + esc(nomApp(a.cible.appId)) : ''}</div></td>
          <td>${chipNote(a)}</td><td>${a.comptes.critique ? `<span class="chip chip-danger">${a.comptes.critique} critique(s)</span> ` : ''}${a.comptes.elevee ? `<span class="chip chip-warning">${a.comptes.elevee} élevée(s)</span>` : ''}${!a.bloquants ? '<span class="chip chip-success">Aucune</span>' : ''}</td>
          <td class="actions"><a class="btn btn-outline btn-xs" href="#/audit/rapport/${esc(a.id)}"><span class="mdi mdi-file-document-outline"></span>Rapport</a>
            <button class="btn btn-ghost btn-icon btn-sm" data-sup="${esc(a.id)}" title="Supprimer"><span class="mdi mdi-delete-outline"></span></button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Aucun audit pour le moment.</td></tr>'}
        </tbody></table></div></div></div>
    </div>`;
    const $ = s => root.querySelector(s);
    const etat = h => { $('#auEtat').innerHTML = h; };
    let source = null;   // fichiers lus (onglet code)

    const ONGLETS = [['atelier', 'App de l’Atelier', 'mdi-cellphone-cog'], ['code', 'Code source', 'mdi-folder-search-outline'], ['url', 'Site en ligne', 'mdi-web-check']];
    function dessinerOnglets() {
      $('#auTabs').innerHTML = ONGLETS.map(([c, l, i]) => `<button class="tab ${c === onglet ? 'active' : ''}" data-tab="${c}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { onglet = t.dataset.tab; etat(''); dessinerOnglets(); dessinerCorps(); });
    }
    function dessinerCorps() {
      const c = $('#auCorps');
      if (onglet === 'atelier') {
        c.innerHTML = plateforme.length ? `<div class="stack"><p class="muted" style="margin:0">Analyse le modèle de l’app (kits, blocs protégés, variables) et tous les fichiers de son export : HTML, JavaScript, SQL et règles RLS, fonctions serveur, configuration.</p>
          <div class="input-group" style="max-width:420px"><label class="input-label">App</label><select class="tv-select" id="auApp">${optionsApps(plateforme, choisie && choisie.id)}</select></div></div>`
          : '<div class="empty">Aucune app créée dans l’Atelier.</div>';
      }
      if (onglet === 'code') {
        c.innerHTML = `<div class="stack"><p class="muted" style="margin:0">Pour tes apps existantes (Next, Vue, Express, Laravel…) : choisis le dossier du projet ou son ZIP. Les fichiers sont lus dans ce navigateur et ne sont envoyés nulle part. node_modules, .git, images et fichiers de plus de 3 Mo sont ignorés.</p>
          <div class="row"><button class="btn btn-outline" id="auDossier"><span class="mdi mdi-folder-open-outline"></span>Choisir un dossier</button>
            <button class="btn btn-outline" id="auZip"><span class="mdi mdi-folder-zip-outline"></span>Choisir un ZIP</button><span id="auSource" class="small muted">${source ? esc(source.resume) : 'Aucun code choisi'}</span></div>
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Nom de la cible</label><input class="tv-input" id="auNom" value="${esc(source ? source.nom : choisie ? choisie.nom : '')}"></div>
            <div class="input-group"><label class="input-label">Rattacher à l’app</label><select class="tv-select" id="auLien">${optionsApps(apps, choisie && choisie.id, 'Aucune')}</select></div></div></div>`;
        const lire = async (fn, arg, nom) => {
          etat('<span class="mdi mdi-loading mdi-spin"></span> Lecture…');
          try {
            const r = await fn(arg, t => etat(`<span class="mdi mdi-loading mdi-spin"></span> ${esc(t)}`));
            source = Object.assign(r, { nom, resume: `${nom} : ${r.fichiers.length} fichier(s) à analyser, ${r.ignores} ignoré(s)` });
            etat('');
            dessinerCorps();
            if (!$('#auNom').value) $('#auNom').value = nom;
          } catch (e) { etat(`<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`); }
        };
        $('#auDossier').onclick = () => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.webkitdirectory = true; inp.multiple = true;
          inp.onchange = () => { if (inp.files.length) lire(AB.audit.lireDossier, inp.files, (inp.files[0].webkitRelativePath || '').split('/')[0] || 'Projet'); };
          inp.click();
        };
        $('#auZip').onclick = () => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.accept = '.zip';
          inp.onchange = () => { const f = inp.files[0]; if (f) lire(AB.audit.lireZip, f, f.name.replace(/\.zip$/i, '')); };
          inp.click();
        };
      }
      if (onglet === 'url') {
        const prod = choisie && choisie.liens && choisie.liens.prod;
        c.innerHTML = `<div class="stack"><p class="muted" style="margin:0">Contrôle le site publié : HTTPS et certificat, redirection, en-têtes de sécurité, cookies, CORS, fichiers sensibles exposés (.env, .git…), et analyse du HTML et des scripts réellement servis (clés oubliées dans le build). Uniquement des requêtes de lecture.</p>
          ${serveur.joignable ? '' : `<div class="bar warn"><span class="mdi mdi-server-off"></span><div>Cet audit passe par le serveur local, qui est arrêté. Lance <code>node serveur.js</code> dans le dossier de l’Atelier puis ouvre <a href="http://localhost:8787">http://localhost:8787</a> (voir <a href="#/reglages">Réglages</a>).</div></div>`}
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Adresse du site</label><input class="tv-input mono" id="auUrl" placeholder="https://monapp.fr" value="${esc(prod || '')}"></div>
            <div class="input-group"><label class="input-label">Rattacher à l’app</label><select class="tv-select" id="auLien">${optionsApps(apps, choisie && choisie.id, 'Aucune')}</select></div></div>
          <label class="check"><input type="checkbox" id="auAutorise"> Je confirme être responsable de ce site ou autorisé par écrit à le tester.</label></div>`;
      }
    }

    $('#auGo').onclick = () => {
      if (onglet === 'atelier') {
        const app = plateforme.find(a => a.id === ($('#auApp') || {}).value);
        if (!app) return etat('Choisis une app.');
        return executer(async () => AB.audit.auditerApp(app), etat);
      }
      if (onglet === 'code') {
        if (!source || !source.fichiers.length) return etat('Choisis d’abord un dossier ou un ZIP contenant du code.');
        const nom = $('#auNom').value.trim() || source.nom, appId = $('#auLien').value || null;
        return executer(async () => AB.audit.lancer({ type: 'code', nom, appId, source: source.nom }, { fichiers: source.fichiers, noms: source.noms, ignores: source.ignores }), etat);
      }
      const url = $('#auUrl').value.trim();
      if (!url) return etat('Indique l’adresse du site.');
      if (!$('#auAutorise').checked) return etat('Coche la confirmation d’autorisation : tester un site sans autorisation est illégal.');
      executer(() => AB.audit.auditerUrl(url, $('#auLien').value || null), etat);
    };
    root.querySelectorAll('[data-sup]').forEach(b => b.onclick = async () => {
      if (!(await U.confirm('Supprimer cet audit', 'Le rapport sera supprimé de l’historique.', { danger: true, okLabel: 'Supprimer' }))) return;
      await AB.db.remove('audits', b.dataset.sup);
      if (location.hash === '#/audit') AB.vues.audit(root, []); else AB.app.go('audit');
    });
    dessinerOnglets();
    dessinerCorps();
    return {};
  };

  /* ---------- Rapport d'un audit ---------- */
  async function rapport(root, id) {
    const a = await AB.db.get('audits', id);
    if (!a) { root.innerHTML = `<div class="page"><div class="empty">Audit introuvable. <a href="#/audit">Retour aux audits</a></div></div>`; return {}; }
    AB.app.setCrumbs(['Audit de sécurité', a.cible.nom]);
    const precedent = await AB.audit.precedent(a);
    const html = AB.rapport.html(a, precedent);
    const app = a.cible.appId ? await AB.db.get('apps', a.cible.appId) : null;
    const nomFichier = `audit-securite-${U.slug(a.cible.nom) || 'app'}-${a.date.slice(0, 10)}`;
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Rapport d’audit</div><h2 class="section-title">${esc(a.cible.nom)} ${chipNote(a)}</h2>
        <p class="section-desc">${esc(U.fmtDate(a.date))} · ${esc(AB.rapport.TYPES[a.cible.type])}${precedent ? ` · audit précédent : ${chipNote(precedent)}` : ''}</p></div>
        <div class="row">
          ${a.cible.type === 'atelier' && app ? '<button class="btn btn-outline" id="raRelancer"><span class="mdi mdi-refresh"></span>Relancer</button>' : ''}
          ${app ? `<a class="btn btn-outline" href="#/apps/${esc(app.id)}"><span class="mdi mdi-cellphone"></span>Ouvrir l’app</a>` : ''}
          <button class="btn btn-outline" id="raJson"><span class="mdi mdi-code-json"></span>JSON</button>
          <button class="btn btn-outline" id="raHtml"><span class="mdi mdi-download"></span>Rapport HTML</button>
          <button class="btn btn-primary" id="raPdf"><span class="mdi mdi-printer-outline"></span>Imprimer / PDF</button></div></div>
      <div class="panel" style="overflow:hidden"><iframe id="raCadre" sandbox="allow-same-origin allow-modals" title="Rapport d’audit" style="width:100%;height:78vh;border:0;display:block;background:#fff"></iframe></div>
      <p class="small muted">Pour un PDF : « Imprimer / PDF », puis « Enregistrer au format PDF » comme imprimante.</p></div>`;
    const cadre = root.querySelector('#raCadre');
    cadre.srcdoc = html;
    root.querySelector('#raHtml').onclick = () => U.download(nomFichier + '.html', html, 'text/html;charset=utf-8');
    root.querySelector('#raJson').onclick = () => U.download(nomFichier + '.json', JSON.stringify(a, null, 2), 'application/json');
    root.querySelector('#raPdf').onclick = () => { try { cadre.contentWindow.focus(); cadre.contentWindow.print(); } catch (e) { U.toast('info', 'Impression', 'Télécharge le rapport HTML puis imprime-le depuis ton navigateur.'); } };
    const rel = root.querySelector('#raRelancer');
    if (rel) rel.onclick = async () => {
      const audit = AB.audit.auditerApp(app);
      await AB.audit.enregistrer(audit);
      AB.app.go('audit/rapport/' + audit.id);
    };
    return {};
  }
})();
