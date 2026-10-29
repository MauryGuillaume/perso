/* ==========================================================================
   ab-vue-apps.js — les apps : modèle, catalogue, création, fiche d'une app
   existante. Le composeur (apps créées ici) est dans ab-vue-composeur.js.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  /* ======================= Modèle ======================= */
  const M = AB.apps = {};

  M.STATUTS = { 'idee': ['Idée', 'chip'], 'en-dev': ['En développement', 'chip-info'], 'en-prod': ['En production', 'chip-success'], 'pause': ['En pause', 'chip-warning'] };

  M.lister = async () => (await AB.db.list('apps')).sort((a, b) => String(b.modifie).localeCompare(String(a.modifie)));
  M.get = id => AB.db.get('apps', id);

  M.enregistrer = async function (app) {
    app.modifie = U.now();
    await AB.db.put('apps', app);
    return app;
  };

  /** Nouvelle app de la plateforme, avec sa version 1. */
  M.creer = async function (base) {
    const app = Object.assign({
      id: U.uuid(), origine: 'plateforme', nom: 'Nouvelle app', icone: 'mdi-cellphone', description: '',
      // Les kits « par défaut » donnent la base commune (charte, sécurité, affichage)
      statut: 'idee', kits: AB.kits.parDefaut(), surcharges: {}, config: {}, conformite: {}, blocs: [], notes: '', liens: { repo: '', prod: '' },
      versions: [], versionCourante: 0, cree: U.now()
    }, base || {});
    AB.kits.imposer(app);
    M.nouvelleVersion(app, 'Création');
    return M.enregistrer(app);
  };

  /** Ce qui est copié dans un instantané : tout sauf l'historique lui-même. */
  M.contenu = function (app) {
    const c = U.clone(app);
    delete c.versions; delete c.modifie; delete c.audits;   // l'historique des audits ne fait pas partie d'une version
    delete c.revenus; delete c.pubs;                        // la gestion (revenus, pubs) non plus
    delete c.mobile;                                        // ni la version mobile (son numéro de build ne doit jamais reculer)
    return c;
  };

  /** Enregistre un instantané complet de l'app (retour arrière possible). */
  M.nouvelleVersion = function (app, note) {
    const numero = (app.versions.reduce((m, v) => Math.max(m, v.numero), 0) || 0) + 1;
    app.versionCourante = numero;
    app.versions.push({ numero, date: U.now(), note: note || '', copie: M.contenu(app) });
    return numero;
  };

  /** Revient à une version : son contenu devient l'app courante, dans une nouvelle version. */
  M.restaurer = async function (app, numero) {
    const v = app.versions.find(x => x.numero === numero);
    if (!v) throw new Error('Version introuvable.');
    const versions = app.versions;
    const restauree = Object.assign(U.clone(v.copie), { id: app.id, versions, audits: app.audits || [], revenus: app.revenus || [], pubs: app.pubs || [], mobile: app.mobile });
    AB.kits.imposer(restauree);
    M.nouvelleVersion(restauree, `Retour à la version ${numero}`);
    return M.enregistrer(restauree);
  };

  /** L'app a-t-elle des changements non enregistrés en version ? */
  M.modifieeDepuisVersion = function (app) {
    const v = app.versions.find(x => x.numero === app.versionCourante);
    if (!v) return true;
    const a = M.contenu(app), b = U.clone(v.copie);
    delete a.versionCourante; delete b.versionCourante;
    return JSON.stringify(a) !== JSON.stringify(b);
  };

  /** Blocs de l'app pour lesquels une version plus récente existe. */
  M.misesAJour = function (app) {
    return (app.blocs || []).map(inst => {
      const dernier = AB.blocs.dernier(inst.bloc);
      return dernier && U.cmpVersion(dernier.version, inst.version) > 0 ? { inst, dernier } : null;
    }).filter(Boolean);
  };

  /** Kits de l'app pour lesquels une version plus récente existe. */
  M.misesAJourKits = function (app) {
    return (app.kits || []).map(ref => {
      const dernier = AB.kits.dernier(ref.kit);
      return dernier && U.cmpVersion(dernier.version, ref.version) > 0 ? { ref, dernier } : null;
    }).filter(Boolean);
  };

  M.chipStatut = s => { const x = M.STATUTS[s] || M.STATUTS.idee; return `<span class="chip ${x[1]}">${esc(x[0])}</span>`; };

  /* ======================= Création d'une app ======================= */

  /** Dialogue « Nouvelle app » : vide, ou proposée par l'assistant IA. */
  M.dialogueNouvelle = async function () {
    const etat = await AB.ia.etat();
    const iaPrete = etat.joignable && etat.ia;
    const body = document.createElement('div');
    body.className = 'stack';
    body.innerHTML = `
      <div class="input-group"><label class="input-label">Décris ton app</label>
        <textarea class="tv-textarea" id="naDesc" placeholder="Ex. : une app pour mon cabinet de podologie : présentation, tarifs, prise de contact, coordonnées."></textarea>
        <div class="input-hint">L’assistant choisit les blocs du catalogue et liste ceux qui manquent. Laisse vide pour partir d’une app vide.</div></div>
      ${iaPrete ? `<div class="bar ok"><span class="mdi mdi-robot-outline"></span><div>Le serveur local est prêt : l’assistant répond directement.</div></div>`
        : `<div class="bar info"><span class="mdi mdi-information-outline"></span><div>Serveur local ${etat.joignable ? 'sans clé IA' : 'arrêté'} : copie le prompt dans Claude, puis colle sa réponse ci-dessous. (Voir Réglages pour lancer le serveur.)</div></div>
        <div class="row"><button class="btn btn-outline btn-sm" id="naCopier"><span class="mdi mdi-content-copy"></span>Copier le prompt</button></div>
        <div class="input-group"><label class="input-label">Réponse de Claude (JSON)</label><textarea class="tv-textarea code" id="naRep" style="min-height:100px"></textarea></div>`}
      <div id="naProp"></div>`;
    const promptComplet = () => `${AB.ia.systeme()}\n\nDescription de l'app :\n${body.querySelector('#naDesc').value.trim()}`;
    if (!iaPrete) body.querySelector('#naCopier').onclick = async () => {
      try { await navigator.clipboard.writeText(promptComplet()); U.toast('success', 'Prompt copié', 'Colle-le dans Claude.'); }
      catch (e) { U.dialog({ title: 'Prompt à copier', size: 'lg', body: `<textarea class="tv-textarea code" style="min-height:360px">${esc(promptComplet())}</textarea>` }); }
    };

    U.dialog({
      title: 'Nouvelle app', size: 'lg', body,
      actions: [
        { label: 'Annuler', cls: 'btn-outline' },
        { label: 'Créer l’app', cls: 'btn-primary', icon: 'mdi-check', onClick: async () => {
          const desc = body.querySelector('#naDesc').value.trim();
          let base = { description: desc };
          try {
            if (iaPrete && desc) {
              body.querySelector('#naProp').innerHTML = `<div class="bar info"><span class="loader mdi mdi-loading mdi-spin"></span><div>L’assistant compose l’app…</div></div>`;
              base = Object.assign(base, AB.ia.versApp(await AB.ia.demander(desc)));
            } else if (!iaPrete && body.querySelector('#naRep').value.trim()) {
              base = Object.assign(base, AB.ia.versApp(AB.ia.lireReponse(body.querySelector('#naRep').value)));
            }
          } catch (e) {
            body.querySelector('#naProp').innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-outline"></span><div>${esc(e.message)}</div></div>`;
            return false;
          }
          const app = await M.creer(base);
          AB.app.go('apps/' + app.id);
        } }
      ]
    });
  };

  /* ======================= Catalogue ======================= */

  AB.vues.apps = async function (root) {
    AB.app.setCrumbs(['Apps']);
    let filtre = 'toutes';
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Apps</div><h2 class="section-title">Mes apps</h2>
        <p class="section-desc">Toutes tes apps au même endroit : celles créées avec Claude (importe le ZIP qu’il t’a livré), celles composées avec des blocs, et les fiches de tes apps existantes. Un clic sur une app ouvre son espace : code et versions, base de données, app mobile et émulateur, audit, revenus.</p></div>
        <div class="row"><button class="btn btn-outline" id="apNew" title="Fabriquer une app directement dans l’Atelier, sans Claude"><span class="mdi mdi-puzzle-outline"></span>Composer avec des blocs</button>
        <button class="btn btn-outline" id="apImport" title="Sauvegarde d’une app de l’Atelier (.json)"><span class="mdi mdi-code-json"></span>Importer un .json</button>
        <button class="btn btn-primary" id="apZip"><span class="mdi mdi-folder-zip-outline"></span>Importer le ZIP d’une app</button></div></div>
      <div class="filter-chips" id="apFiltres"></div>
      <div class="card-list" id="apListe"></div></div>`;

    const draw = async () => {
      const apps = await M.lister();
      const filtres = [['toutes', 'Toutes'], ['plateforme', 'Créées ici'], ['existante', 'Existantes']];
      root.querySelector('#apFiltres').innerHTML = filtres.map(([k, l]) =>
        `<button class="filter-chip ${k === filtre ? 'active' : ''}" data-f="${k}">${esc(l)} (${k === 'toutes' ? apps.length : apps.filter(a => a.origine === k).length})</button>`).join('');
      const liste = apps.filter(a => filtre === 'toutes' || a.origine === filtre);
      root.querySelector('#apListe').innerHTML = liste.length ? liste.map(carteApp).join('')
        : `<div class="empty"><span class="mdi mdi-cellphone-off"></span>Aucune app ici.</div>`;
      root.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtre = b.dataset.f; draw(); });
      root.querySelectorAll('[data-app]').forEach(c => c.onclick = () => AB.app.go('apps/' + c.dataset.app));
    };
    root.querySelector('#apNew').onclick = M.dialogueNouvelle;
    root.querySelector('#apZip').onclick = () => AB.code.dialogueImport(null);
    root.querySelector('#apImport').onclick = async () => {
      const f = await U.pickFile('.json');
      if (!f) return;
      try {
        const app = JSON.parse(f.texte);
        if (!app.nom || !Array.isArray(app.blocs)) throw new Error('Ce fichier n’est pas une app exportée.');
        app.id = U.uuid();
        (app.bases || []).forEach(b => { b.id = 'b-' + U.uuid().slice(0, 8); });   // une connexion par base : pas d'identifiant partagé
        app.versions = app.versions || [];
        if (!app.versions.length) M.nouvelleVersion(app, 'Import');
        await M.enregistrer(app);
        U.toast('success', 'App importée', app.nom);
        draw();
      } catch (e) { U.toast('error', 'Import impossible', e.message); }
    };
    await draw();
    return {};
  };

  function carteApp(a) {
    const nbMaj = a.origine === 'plateforme' ? M.misesAJour(a).length + M.misesAJourKits(a).length : 0;
    const info = a.origine === 'plateforme'
      ? `${(a.blocs || []).length} bloc(s) · version ${a.versionCourante || 1}`
      : esc(a.stack || '') + (a.code && a.code.courante ? ` · code v${a.code.courante}` : '');
    return `<div class="app-card" data-app="${esc(a.id)}">
      <div class="app-card-head"><span class="app-card-icon">${AB.identite.pastille(a)}</span>
        <div style="min-width:0"><div class="app-card-name">${esc(a.nom)}</div><div class="small muted">${info}</div></div></div>
      <p>${esc(a.description || '')}</p>
      <div class="row">${M.chipStatut(a.statut)}
        <span class="chip ${a.origine === 'plateforme' ? 'chip-accent' : a.creeAvec === 'claude' ? 'chip-info' : ''}">${a.origine === 'plateforme' ? 'Blocs' : a.creeAvec === 'claude' ? 'Claude' : 'Existante'}</span>
        ${(a.bases || []).some(b => b.tables.length) ? '<span class="chip"><span class="mdi mdi-database-outline"></span>Base</span>' : ''}
        ${nbMaj ? `<span class="chip chip-warning"><span class="mdi mdi-update"></span>${nbMaj} mise(s) à jour</span>` : ''}
        ${(a.alertes || []).length ? `<span class="chip chip-danger"><span class="mdi mdi-alert-outline"></span>Alerte</span>` : ''}</div>
    </div>`;
  }

  /* ======================= Une app ======================= */

  AB.vues.app = async function (root, [id]) {
    const app = await M.get(id);
    if (!app) {
      root.innerHTML = `<div class="page"><div class="empty"><span class="mdi mdi-cellphone-off"></span>App introuvable. <a href="#/apps">Retour aux apps</a></div></div>`;
      return {};
    }
    if (app.origine === 'existante') return ficheExistante(root, app);
    // Apps créées avant les kits : l'ancien thème complet devient des surcharges de la charte.
    if (!app.surcharges) {
      app.surcharges = {};
      Object.entries(app.theme || {}).forEach(([k, v]) => { if (String(v) !== String(AB.rendu.THEME_DEFAUT[k])) app.surcharges[k] = v; });
      app.kits = app.kits || AB.kits.parDefaut();
      delete app.theme;
    }
    // Un kit devenu obligatoire s'ajoute à toutes les apps à leur ouverture
    if (AB.kits.imposer(app)) {
      await M.enregistrer(app);
      U.toast('info', 'Kit obligatoire ajouté', AB.kits.obligatoires().map(k => k.nom).join(', '));
    }
    return AB.vues.composeur(root, app);
  };

  /* ---------- Fiche d'une app existante (Next, Vue…) ---------- */
  function ficheExistante(root, app) {
    AB.app.setCrumbs(['Apps', app.nom]);
    // Livora a le bloc Studio design : il est branché d'office
    if (app.id === 'existante-livora' && !app.blocsBranches) { app.blocsBranches = ['coach-avatar']; M.enregistrer(app); }
    app.blocsBranches = app.blocsBranches || [];
    let onglet = AB.revenus.ongletVoulu || 'fiche';
    AB.revenus.ongletVoulu = null;
    let ecranBase = null;            // onglet Base de données ouvert (concepteur, données…)
    let apercu = null;               // onglet Aperçu ouvert (écouteurs à retirer en le quittant)
    const etatBase = {};             // base et onglet choisis, gardés quand on change d'onglet de l'espace
    const draw = () => {
      const blocsConnus = new Set(AB.blocs.derniers().map(b => b.id));
      root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">${app.creeAvec === 'claude' ? 'App créée avec Claude' : 'App existante'}</div><h2 class="section-title">${AB.identite.pastille(app)} ${esc(app.nom)}</h2>
        <p class="section-desc">${esc(app.description)}</p></div>
        <div class="row"><button class="btn btn-danger-text" id="fxDel"><span class="mdi mdi-delete-outline"></span>Supprimer la fiche</button>
        <a class="btn btn-outline" href="#/audit/app/${esc(app.id)}"><span class="mdi mdi-shield-search"></span>Audit sécurité</a>
        <button class="btn btn-outline" id="fxVoir"><span class="mdi mdi-eye-outline"></span>Voir l’app</button>
        <a class="btn btn-outline" href="#/mobile/app/${esc(app.id)}"><span class="mdi mdi-cellphone-arrow-down"></span>App mobile</a>
        <button class="btn btn-outline" id="fxBase"><span class="mdi mdi-database-outline"></span>Base de données${(app.bases || []).length ? ` (${app.bases.length})` : ''}</button>
        ${app.creeAvec === 'claude' ? '' : '<button class="btn btn-outline" id="fxMigrer"><span class="mdi mdi-puzzle-outline"></span>Préparer une version en blocs</button>'}
        <button class="btn btn-primary" id="fxSave"><span class="mdi mdi-content-save-outline"></span>Enregistrer</button></div></div>
      ${(app.alertes || []).map(a => `<div class="bar crit"><span class="mdi mdi-shield-alert-outline"></span><div>${esc(a)}</div></div>`).join('')}
      ${(app.audits || []).length ? `<div class="bar ${app.audits[0].bloquants ? 'warn' : 'info'}"><span class="mdi mdi-shield-search"></span><div>Dernier audit de sécurité (${esc(U.fmtDate(app.audits[0].date))}) : ${AB.audit.chipNote(app.audits[0])} ${app.audits[0].bloquants ? `${app.audits[0].bloquants} point(s) critique(s) ou élevé(s).` : 'aucun point critique ni élevé.'} <a href="#/audit/rapport/${esc(app.audits[0].id)}">Voir le rapport</a></div></div>`
        : `<div class="bar info"><span class="mdi mdi-shield-search"></span><div>Aucun audit de sécurité pour cette app. <a href="#/audit/app/${esc(app.id)}">Lancer un audit</a> (dossier du code, ZIP ou site en ligne).</div></div>`}
      <div class="tabs" id="fxTabs"></div>
      <div id="fxCorps"></div>
      <div class="grid grid-2" id="fxFiche">
        <div class="stack"><div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-card-text-outline"></span>Fiche</span></div>
          <div class="panel-body stack">
            <div class="grid grid-2">
              <div class="input-group"><label class="input-label">Nom</label><input class="tv-input" data-k="nom" value="${esc(app.nom)}"></div>
              <div class="input-group"><label class="input-label">Statut</label><select class="tv-select" data-k="statut">${Object.entries(M.STATUTS).map(([k, v]) => `<option value="${k}" ${k === app.statut ? 'selected' : ''}>${esc(v[0])}</option>`).join('')}</select></div>
            </div>
            <div class="input-group"><label class="input-label">Description</label><textarea class="tv-textarea" data-k="description" style="min-height:60px">${esc(app.description)}</textarea></div>
            <div class="grid grid-2">
              <div class="input-group"><label class="input-label">Technologies</label><input class="tv-input" data-k="stack" value="${esc(app.stack)}"></div>
              <div class="input-group"><label class="input-label">Dossier</label><input class="tv-input mono" data-k="chemin" value="${esc(app.chemin)}"></div>
              <div class="input-group"><label class="input-label">Dépôt Git</label><input class="tv-input" data-l="repo" value="${esc(app.liens.repo)}" placeholder="https://github.com/…"></div>
              <div class="input-group"><label class="input-label">Adresse en production</label><input class="tv-input" data-l="prod" value="${esc(app.liens.prod)}" placeholder="https://…"></div>
            </div>
            <div class="input-group"><label class="input-label">Icône (Material Design Icons)</label><input class="tv-input mono" data-k="icone" value="${esc(app.icone)}"></div>
            <div class="input-group"><label class="input-label">Notes</label><textarea class="tv-textarea" data-k="notes">${esc(app.notes)}</textarea></div>
          </div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-puzzle-plus-outline"></span>Blocs branchés</span></div>
            <div class="panel-body stack"><p class="small muted" style="margin:0">Un bloc branché ajoute son panneau de gestion dans l’espace de cette app (ex. Studio design pour ses personnages).</p>
            ${AB.blocs.avecPanneau().map(b => `<label class="check"><input type="checkbox" data-branche="${esc(b.id)}" ${app.blocsBranches.includes(b.id) ? 'checked' : ''}> <span class="mdi ${esc(b.icone)}"></span> ${esc(b.nom)} <span class="muted small">· ${esc((AB.panneaux[b.panneau] || {}).nom || b.panneau)}</span></label>`).join('') || '<span class="muted small">Aucun bloc à panneau.</span>'}</div></div></div>
        <div class="stack">
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-puzzle-check-outline"></span>Fonctionnalités et blocs</span></div>
            <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Fonctionnalité</th><th>Bloc</th></tr></thead><tbody>
            ${(app.fonctionnalites || []).map(([f, b]) => `<tr><td>${esc(f)}</td><td>${blocsConnus.has(b) ? `<span class="chip chip-success">${esc(b)}</span>` : `<span class="chip">${esc(b)} · à créer</span>`}</td></tr>`).join('')}
            </tbody></table></div></div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-key-outline"></span>Variables d’environnement</span><div class="spacer"></div><button class="btn btn-ghost btn-sm" id="fxEnvAdd"><span class="mdi mdi-plus"></span>Ajouter</button></div>
            <div class="panel-body flush">${tableEnv(app.env)}</div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-history"></span>Journal</span><div class="spacer"></div><button class="btn btn-ghost btn-sm" id="fxJournal"><span class="mdi mdi-plus"></span>Ajouter</button></div>
            <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>
            ${(app.journal || []).slice().reverse().map(j => `<tr><td class="muted" style="white-space:nowrap">${esc(U.fmtDate(j.date))}</td><td>${esc(j.texte)}</td></tr>`).join('') || '<tr><td class="muted">Vide</td></tr>'}
            </tbody></table></div></div></div>
        </div></div></div>`;
      onglets();
      bind();
    };

    /** Onglets de l'espace : fiche, revenus, publicités, back-office, puis un par panneau des blocs branchés. */
    function onglets() {
      const liste = [['fiche', 'Vue d’ensemble', 'mdi-card-text-outline'], ['apercu', 'Aperçu', 'mdi-eye-outline'], ['code', 'Code et versions', 'mdi-folder-zip-outline'], ['back', 'Base de données', 'mdi-database-outline'], ['gestion', 'Gestion', 'mdi-shield-crown-outline']].concat(AB.revenus.ONGLETS, [AB.discussion.ONGLET])
        .concat(AB.blocs.panneauxDe(app).map(k => ['p:' + k, AB.panneaux[k].nom, AB.panneaux[k].icone]));
      if (!liste.some(o => o[0] === onglet)) onglet = 'fiche';
      root.querySelector('#fxTabs').innerHTML = liste.map(([k, l, i]) => `<button class="tab ${k === onglet ? 'active' : ''}" data-fxtab="${k}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-fxtab]').forEach(b => b.onclick = () => { lireForm(); onglet = b.dataset.fxtab; onglets(); });
      root.querySelector('#fxFiche').hidden = onglet !== 'fiche';
      const corps = root.querySelector('#fxCorps');
      if (ecranBase) { ecranBase.destroy(); ecranBase = null; }
      if (apercu) { apercu.then(a => a && a.destroy()); apercu = null; }
      corps.innerHTML = '';
      if (onglet === 'apercu') apercu = AB.apercu.vue(corps, app);
      else if (onglet === 'back') ecranBase = AB.bases.ecran(corps, app, etatBase);
      else if (onglet === 'code') AB.code.vue(corps, app, () => onglets());
      else if (onglet === 'gestion') AB.gestion.vue(corps, app);
      else if (onglet === 'revenus' || onglet === 'pubs') AB.revenus.vue(onglet, corps, app);
      else if (onglet === 'discussion') AB.discussion.vue(corps, app);
      else if (onglet.startsWith('p:')) AB.panneaux[onglet.slice(2)].vue(corps, app);
    }

    const tableEnv = env => `<div class="table-wrap"><table class="tv-table"><thead><tr><th>Variable</th><th>Rôle</th><th>Secret</th><th></th></tr></thead><tbody>
      ${(env || []).map((v, i) => `<tr><td class="mono">${esc(v.cle)}</td><td>${esc(v.role)}</td>
        <td>${v.secret ? '<span class="chip chip-danger"><span class="mdi mdi-lock-outline"></span>Secret</span>' : '<span class="chip">Public</span>'}</td>
        <td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-envdel="${i}" title="Retirer"><span class="mdi mdi-close"></span></button></td></tr>`).join('')}
      </tbody></table></div>`;

    const lireForm = () => {
      root.querySelectorAll('[data-k]').forEach(el => { app[el.dataset.k] = el.value; });
      root.querySelectorAll('[data-l]').forEach(el => { app.liens[el.dataset.l] = el.value.trim(); });
    };

    const bind = () => {
      root.querySelectorAll('[data-branche]').forEach(x => x.onchange = async () => {
        lireForm();
        app.blocsBranches = app.blocsBranches.filter(id => id !== x.dataset.branche).concat(x.checked ? [x.dataset.branche] : []);
        app.journal.push({ date: U.now(), texte: (x.checked ? 'Bloc branché : ' : 'Bloc débranché : ') + x.dataset.branche });
        await M.enregistrer(app);
        draw();
      });
      root.querySelector('#fxSave').onclick = async () => {
        lireForm();
        app.journal.push({ date: U.now(), texte: 'Fiche modifiée' });
        await M.enregistrer(app);
        AB.app.setCrumbs(['Apps', app.nom]);
        U.toast('success', 'Fiche enregistrée');
        draw();
      };
      root.querySelector('#fxBase').onclick = () => { lireForm(); onglet = 'back'; onglets(); };
      root.querySelector('#fxVoir').onclick = () => { lireForm(); onglet = 'apercu'; onglets(); };
      root.querySelector('#fxDel').onclick = async () => {
        if (!(await U.confirm('Supprimer la fiche', `La fiche « ${app.nom} » sera supprimée de la plateforme, avec les versions de code gardées dans l’Atelier (le code sur ton ordinateur ou ton dépôt n’est pas touché).`, { danger: true, okLabel: 'Supprimer' }))) return;
        await AB.db.remove('apps', app.id);
        await AB.fichiers.vider(AB.code.proprio(app));
        AB.app.go('apps');
      };
      root.querySelector('#fxJournal').onclick = async () => {
        const t = await U.prompt('Journal', 'Ce qui a changé', '');
        if (!t) return;
        lireForm();
        app.journal.push({ date: U.now(), texte: t });
        await M.enregistrer(app);
        draw();
      };
      root.querySelector('#fxEnvAdd').onclick = () => {
        U.dialog({
          title: 'Nouvelle variable', size: 'sm',
          body: `<div class="stack"><div class="input-group"><label class="input-label">Nom</label><input class="tv-input mono" id="evCle" placeholder="STRIPE_SECRET_KEY"></div>
            <div class="input-group"><label class="input-label">Rôle</label><input class="tv-input" id="evRole"></div>
            <label class="check"><input type="checkbox" id="evSecret"> Secret (la valeur ne sera jamais saisie ici)</label></div>`,
          actions: [{ label: 'Annuler' }, { label: 'Ajouter', cls: 'btn-primary', onClick: async ({ body }) => {
            const cle = body.querySelector('#evCle').value.trim().toUpperCase();
            if (!/^[A-Z][A-Z0-9_]*$/.test(cle)) { U.toast('error', 'Nom invalide', 'Majuscules, chiffres et _.'); return false; }
            lireForm();
            app.env.push({ cle, role: body.querySelector('#evRole').value.trim(), secret: body.querySelector('#evSecret').checked });
            await M.enregistrer(app);
            draw();
          } }]
        });
      };
      root.querySelectorAll('[data-envdel]').forEach(b => b.onclick = async () => {
        lireForm();
        app.env.splice(Number(b.dataset.envdel), 1);
        await M.enregistrer(app);
        draw();
      });
      if (root.querySelector('#fxMigrer')) root.querySelector('#fxMigrer').onclick = async () => {
        // Point de départ d'une migration : une app en blocs avec les blocs déjà disponibles.
        const blocs = (app.fonctionnalites || []).map(f => AB.blocs.dernier(f[1])).filter(Boolean)
          .map(d => ({ uid: U.uuid().slice(0, 8), bloc: d.id, version: d.version, reglages: AB.blocs.reglagesParDefaut(d) }));
        const manquants = (app.fonctionnalites || []).filter(f => !AB.blocs.dernier(f[1])).map(f => `- ${f[0]} → bloc « ${f[1]} » à créer`);
        const nouvelle = await M.creer({
          nom: app.nom + ' (blocs)', icone: app.icone, description: app.description, statut: 'idee', blocs,
          notes: `Migration de ${app.nom} (${app.stack}).\n\nBlocs à créer :\n${manquants.join('\n')}`
        });
        app.journal.push({ date: U.now(), texte: `Version en blocs préparée : ${nouvelle.nom}` });
        await M.enregistrer(app);
        AB.app.go('apps/' + nouvelle.id);
      };
    };

    draw();
    return { destroy() { if (ecranBase) ecranBase.destroy(); } };
  }
})();
