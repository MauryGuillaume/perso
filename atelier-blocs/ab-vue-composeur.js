/* ==========================================================================
   ab-vue-composeur.js — composeur d'une app créée avec des blocs
   Onglets : Composition (palette, pile de blocs, téléphone, réglages), Contenu,
   panneaux des blocs (ex. Studio design), Revenus, Publicités,
   Thème, Infos, Variables d'env, Backend, Versions, Export.
   Les modifications sont enregistrées automatiquement ; une « version » est
   un instantané complet, créé quand on le demande.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  /* ======================= Champs de réglage =======================
     Partagés avec l'atelier (aperçu d'un bloc). */
  const C = AB.champs = {};

  C.html = function (defs, valeurs, prefixe) {
    if (!defs.length) return `<p class="muted" style="margin:0">Ce bloc n’a aucun réglage.</p>`;
    return defs.map(r => {
      const v = valeurs[r.cle] !== undefined ? valeurs[r.cle] : (r.defaut !== undefined ? r.defaut : '');
      const id = `rg-${prefixe ? esc(prefixe) + '-' : ''}${esc(r.cle)}`;
      let champ;
      switch (r.type) {
        case 'texte-long': champ = `<textarea class="tv-textarea" id="${id}" data-rg="${esc(r.cle)}">${esc(v)}</textarea>`; break;
        case 'liste': champ = `<textarea class="tv-textarea" id="${id}" data-rg="${esc(r.cle)}">${esc(v)}</textarea>`; break;
        case 'nombre': champ = `<input class="tv-input" type="number" id="${id}" data-rg="${esc(r.cle)}" value="${esc(v)}">`; break;
        case 'couleur': champ = `<input class="tv-input" type="color" id="${id}" data-rg="${esc(r.cle)}" value="${esc(v || '#2962ff')}" style="height:36px;padding:2px">`; break;
        case 'booleen': return `<label class="check"><input type="checkbox" data-rg="${esc(r.cle)}" ${v === true || v === 'true' ? 'checked' : ''}> ${esc(r.label || r.cle)}</label>`;
        case 'choix': champ = `<select class="tv-select" id="${id}" data-rg="${esc(r.cle)}">${String(r.options || '').split('\n').filter(Boolean).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; break;
        default: champ = `<input class="tv-input" id="${id}" data-rg="${esc(r.cle)}" value="${esc(v)}">`;
      }
      return `<div class="input-group"><label class="input-label" for="${id}">${esc(r.label || r.cle)}</label>${champ}${r.aide ? `<div class="input-hint">${esc(r.aide)}</div>` : ''}</div>`;
    }).join('');
  };

  C.lire = function (root, defs) {
    const v = {};
    defs.forEach(r => {
      const el = root.querySelector(`[data-rg="${CSS.escape(r.cle)}"]`);
      if (!el) return;
      v[r.cle] = r.type === 'booleen' ? el.checked : r.type === 'nombre' ? Number(el.value) : el.value;
    });
    return v;
  };

  /* ======================= Composeur ======================= */

  AB.vues.composeur = function (root, app) {
    const M = AB.apps;
    let onglet = (AB.revenus && AB.revenus.ongletVoulu) || 'composition';
    let ecranBase = null;            // onglet Base de données ouvert
    const etatBase = {};             // base et onglet choisis, gardés quand on change d'onglet
    if (AB.revenus) AB.revenus.ongletVoulu = null;
    let selection = app.blocs[0] ? app.blocs[0].uid : null;
    let timerSave = null, timerApercu = null;
    let nbPanneaux = AB.blocs.panneauxDe(app).length;

    AB.app.setCrumbs(['Apps', app.nom]);

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Composeur</div>
        <h2 class="section-title"><span class="mdi ${esc(app.icone)}" id="cpIcone"></span> <span id="cpNom">${esc(app.nom)}</span></h2>
        <div class="row" style="margin-top:6px" id="cpEtat"></div></div>
        <div class="row">
          <button class="btn btn-outline" id="cpBase"><span class="mdi mdi-database-outline"></span>Base de données</button>
          <button class="btn btn-outline" id="cpAudit"><span class="mdi mdi-shield-search"></span>Audit sécurité</button>
          <a class="btn btn-outline" href="#/mobile/app/${esc(app.id)}" title="Projet iOS et Android pour l’App Store et Google Play"><span class="mdi mdi-cellphone-arrow-down"></span>App mobile</a>
          <button class="btn btn-outline" id="cpVersion"><span class="mdi mdi-source-commit"></span>Enregistrer une version</button>
          <button class="btn btn-outline" id="cpHtml" title="L’app en un seul fichier, à ouvrir en double-clic (données gardées sur l’appareil)"><span class="mdi mdi-language-html5"></span>Fichier HTML unique</button>
          <button class="btn btn-primary" id="cpZip"><span class="mdi mdi-folder-zip-outline"></span>Exporter (ZIP)</button>
        </div></div>
      <div class="tabs" id="cpTabs"></div>
      <div id="cpBody"></div></div>`;

    const ONGLETS_BASE = [
      ['composition', 'Composition', 'mdi-view-grid-plus-outline'], ['kits', 'Kits', 'mdi-package-variant-closed'],
      ['conformite', 'Conformité', 'mdi-shield-check-outline'], ['theme', 'Thème', 'mdi-palette-outline'],
      ['infos', 'Infos', 'mdi-information-outline'], ['env', 'Variables d’env', 'mdi-key-outline'],
      ['backend', 'Backend', 'mdi-database-outline'], ['versions', 'Versions', 'mdi-history'], ['export', 'Fichiers', 'mdi-file-code-outline']
    ];

    /* ---------- Enregistrement automatique et aperçu ---------- */
    function changer(opts) {
      opts = opts || {};
      clearTimeout(timerSave); timerSave = null;
      timerSave = setTimeout(async () => { timerSave = null; await M.enregistrer(app); dessinerEtat(); }, 400);
      // Un bloc à panneau ajouté ou retiré : son onglet apparaît ou disparaît
      const nb = AB.blocs.panneauxDe(app).length;
      if (nb !== nbPanneaux) { nbPanneaux = nb; dessinerOnglets(); }
      if (opts.apercu !== false) {
        clearTimeout(timerApercu);
        timerApercu = setTimeout(rafraichirApercu, 250);
      }
    }

    function rafraichirApercu() {
      const f = root.querySelector('#cpPhone');
      if (f) f.srcdoc = AB.rendu.apercu(app);
    }

    function dessinerEtat() {
      const maj = M.misesAJour(app).length;
      const majK = M.misesAJourKits(app).length;
      const bloq = AB.kits.bloquants(app);
      root.querySelector('#cpEtat').innerHTML = `${M.chipStatut(app.statut)}
        <span class="chip chip-primary">Version ${app.versionCourante}</span>
        ${M.modifieeDepuisVersion(app) ? '<span class="chip chip-warning">Modifiée depuis cette version</span>' : '<span class="chip chip-success">À jour</span>'}
        ${maj ? `<span class="chip chip-warning"><span class="mdi mdi-update"></span>${maj} bloc(s) à mettre à jour</span>` : ''}
        ${majK ? `<span class="chip chip-warning"><span class="mdi mdi-update"></span>${majK} kit(s) à mettre à jour</span>` : ''}
        ${bloq ? `<span class="chip chip-danger"><span class="mdi mdi-shield-alert-outline"></span>${bloq} point(s) à vérifier</span>` : '<span class="chip chip-success"><span class="mdi mdi-shield-check-outline"></span>Conforme</span>'}
        ${(app.audits || [])[0] ? `<a href="#/audit/rapport/${esc(app.audits[0].id)}" title="Dernier audit de sécurité">${AB.audit.chipNote(app.audits[0])}</a>` : ''}`;
    }

    /** Onglets : ceux du composeur + un par panneau des blocs de l'app (ex. Studio design). */
    const ONGLETS = () => ONGLETS_BASE.slice(0, 1).concat([['contenu', 'Contenu', 'mdi-text-box-edit-outline'], ['base', 'Base de données', 'mdi-database-outline']], AB.blocs.panneauxDe(app).map(k => ['p:' + k, AB.panneaux[k].nom, AB.panneaux[k].icone]), AB.revenus.ONGLETS, [AB.discussion.ONGLET], ONGLETS_BASE.slice(1));

    function dessinerOnglets() {
      if (!ONGLETS().some(o => o[0] === onglet)) onglet = 'composition';
      root.querySelector('#cpTabs').innerHTML = ONGLETS().map(([k, l, i]) =>
        `<button class="tab ${k === onglet ? 'active' : ''}" data-tab="${k}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { onglet = b.dataset.tab; dessinerOnglets(); dessinerCorps(); });
    }

    function dessinerCorps() {
      const body = root.querySelector('#cpBody');
      if (ecranBase) { ecranBase.destroy(); ecranBase = null; }
      if (onglet === 'base') { body.innerHTML = ''; ecranBase = AB.bases.ecran(body, app, etatBase); return; }
      if (onglet === 'revenus' || onglet === 'pubs') { AB.revenus.vue(onglet, body, app).then(() => dessinerEtat()); return; }
      if (onglet === 'discussion') { body.innerHTML = ''; AB.discussion.vue(body, app); return; }
      if (onglet.startsWith('p:')) { body.innerHTML = ''; AB.panneaux[onglet.slice(2)].vue(body, app).then(() => dessinerEtat()); return; }
      ({ composition, contenu, kits, conformite, theme, infos, env, backend, versions, export: fichiers })[onglet](body);
    }

    /* ======================= Contenu ======================= */
    /** Tous les textes et listes de l'app, écran par écran, sans passer par les réglages techniques. */
    function contenu(body) {
      const TYPES = ['texte', 'texte-long', 'liste'];
      const blocs = app.blocs.map(inst => ({ inst, def: AB.blocs.get(inst.bloc, inst.version) }))
        .filter(x => x.def && x.def.id !== 'admin-contenu' && x.def.reglages.some(r => TYPES.includes(r.type)));
      const admin = AB.rendu.avecContenu(app);
      body.innerHTML = `<div class="bar ${admin ? 'ok' : 'warn'}" style="margin-bottom:14px"><span class="mdi ${admin ? 'mdi-check-circle-outline' : 'mdi-information-outline'}"></span>
          <div>${admin ? 'Le bloc <b>Mode admin</b> est dans l’app : les administrateurs peuvent aussi modifier ces textes depuis l’app publiée, sans la republier.'
            : 'Ces textes partent dans l’app à chaque export. Ajoute le bloc <b>Mode admin</b> pour les modifier aussi depuis l’app publiée.'}</div></div>
        <div class="row" style="gap:16px;align-items:flex-start;flex-wrap:wrap">
          <div style="flex:1 1 420px;min-width:0" id="ctListe">${blocs.length ? blocs.map(({ inst, def }) => {
            const l = libelle(inst);
            return `<div class="panel" style="margin-bottom:12px" data-ct="${esc(inst.uid)}"><div class="panel-head"><span class="panel-label"><span class="mdi ${esc(l.icone)}"></span>${esc(l.nom)}${l.detail ? ' · ' + esc(l.detail) : ''}</span></div>
              <div class="panel-body">${C.html(def.reglages.filter(r => TYPES.includes(r.type)), inst.reglages || {}, inst.uid)}</div></div>`;
          }).join('') : '<div class="empty">Aucun bloc de cette app n’a de texte modifiable.</div>'}</div>
          <div class="phone" style="flex:0 0 auto"><iframe id="cpPhone" sandbox="allow-scripts allow-forms allow-popups" title="Aperçu de l’app"></iframe></div>
        </div>`;
      body.querySelectorAll('[data-ct]').forEach(carte => {
        const x = blocs.find(b => b.inst.uid === carte.dataset.ct);
        const defs = x.def.reglages.filter(r => TYPES.includes(r.type));
        carte.addEventListener('input', () => { x.inst.reglages = Object.assign({}, x.inst.reglages, C.lire(carte, defs)); changer(); });
      });
      rafraichirApercu();
    }

    /* ======================= Composition ======================= */
    function composition(body) {
      body.innerHTML = `<div class="composer">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-puzzle-outline"></span>Blocs</span></div>
          <div class="panel-body"><div class="input-wrap" style="margin-bottom:8px"><input class="tv-input" id="cpCherche" placeholder="Chercher un bloc…"></div>
          <div class="palette" id="cpPalette"></div></div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cellphone"></span>App</span>
          <div class="spacer"></div><span class="small muted">Glisse un bloc dans la colonne, ou clique sur +</span></div>
          <div class="panel-body"><div class="stage">
            <div class="pile" id="cpPile"></div>
            <div class="phone"><iframe id="cpPhone" sandbox="allow-scripts allow-forms allow-popups" title="Aperçu de l’app"></iframe></div>
          </div></div></div>
        <div class="panel settings-col" id="cpReglages"></div>
      </div>`;
      dessinerPalette('');
      dessinerPile();
      dessinerReglages();
      rafraichirApercu();
      body.querySelector('#cpCherche').oninput = e => dessinerPalette(e.target.value);
    }

    function dessinerPalette(q) {
      const pal = root.querySelector('#cpPalette');
      q = q.trim().toLowerCase();
      const blocs = AB.blocs.derniers().filter(b => !q || (b.nom + ' ' + b.description + ' ' + b.categorie).toLowerCase().includes(q));
      let cat = null, html = '';
      blocs.forEach(b => {
        if (b.categorie !== cat) { cat = b.categorie; html += `<div class="palette-cat">${esc(cat)}</div>`; }
        html += `<div class="palette-item" draggable="true" data-nouveau="${esc(b.id)}" title="${esc(b.description)}">
          <span class="mdi ${esc(b.icone)}"></span><div style="flex:1;min-width:0">${esc(b.nom)}<small>v${esc(b.version)}</small></div>
          <button class="btn btn-ghost btn-icon btn-sm" data-ajout="${esc(b.id)}" title="Ajouter à la fin"><span class="mdi mdi-plus"></span></button></div>`;
      });
      pal.innerHTML = html || `<div class="empty">Aucun bloc.</div>`;
      pal.querySelectorAll('[data-nouveau]').forEach(el => el.ondragstart = e => e.dataTransfer.setData('text/plain', 'nouveau:' + el.dataset.nouveau));
      pal.querySelectorAll('[data-ajout]').forEach(b => b.onclick = () => ajouter(b.dataset.ajout, app.blocs.length));
    }

    /** Libellé d'une instance : nom du bloc + son titre ou onglet. */
    function libelle(inst) {
      const def = AB.blocs.get(inst.bloc, inst.version);
      const r = inst.reglages || {};
      const detail = r.onglet || r.titre || r.nom || '';
      return { nom: def ? def.nom : inst.bloc, detail, icone: def ? def.icone : 'mdi-alert-outline', manquant: !def };
    }

    function dessinerPile() {
      const pile = root.querySelector('#cpPile');
      pile.innerHTML = app.blocs.length ? app.blocs.map((inst, i) => {
        const l = libelle(inst);
        const maj = AB.blocs.dernier(inst.bloc);
        const aMaj = maj && U.cmpVersion(maj.version, inst.version) > 0;
        return `<div class="pile-item ${inst.uid === selection ? 'sel' : ''}" draggable="true" data-i="${i}" data-uid="${esc(inst.uid)}">
          <span class="mdi mdi-drag grip"></span><span class="mdi ${esc(l.icone)}" style="color:var(--color-accent)"></span>
          <span class="name" title="${esc(l.nom)}">${esc(l.detail || l.nom)}<br><span class="small muted">${esc(l.nom)} · v${esc(inst.version)}</span></span>
          ${l.manquant ? '<span class="chip chip-danger">Absent</span>' : aMaj ? '<span class="chip chip-warning" title="Nouvelle version disponible"><span class="mdi mdi-update"></span></span>' : ''}
        </div>`;
      }).join('') : `<div class="pile-hint"><span class="mdi mdi-arrow-left" style="font-size:20px"></span><br>Dépose des blocs ici pour construire l’app.</div>`;

      pile.querySelectorAll('[data-uid]').forEach(el => {
        el.onclick = () => { selection = el.dataset.uid; dessinerPile(); dessinerReglages(); };
        el.ondragstart = e => e.dataTransfer.setData('text/plain', 'deplacer:' + el.dataset.i);
      });
      // Position d'insertion : avant le premier élément dont le milieu est sous la souris.
      const position = e => {
        const items = [...pile.querySelectorAll('[data-uid]')];
        const i = items.findIndex(it => { const r = it.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
        return i < 0 ? items.length : i;
      };
      pile.ondragover = e => { e.preventDefault(); pile.classList.add('over'); };
      pile.ondragleave = () => pile.classList.remove('over');
      pile.ondrop = e => {
        e.preventDefault();
        pile.classList.remove('over');
        const [action, val] = e.dataTransfer.getData('text/plain').split(':');
        const pos = position(e);
        if (action === 'nouveau') ajouter(val, pos);
        if (action === 'deplacer') deplacer(Number(val), pos);
      };
    }

    function ajouter(blocId, pos) {
      const def = AB.blocs.dernier(blocId);
      if (!def) return;
      const inst = { uid: U.uuid().slice(0, 8), bloc: def.id, version: def.version, reglages: AB.blocs.reglagesParDefaut(def) };
      app.blocs.splice(pos, 0, inst);
      // Dépendances : on signale celles qui manquent, sans les ajouter d'office.
      const absents = def.dependances.filter(d => !app.blocs.some(b => b.bloc === d));
      if (absents.length) U.toast('warning', 'Dépendances', `${def.nom} a besoin de : ${absents.join(', ')}.`);
      selection = inst.uid;
      dessinerPile(); dessinerReglages(); changer();
    }

    function deplacer(de, vers) {
      if (de === vers || de + 1 === vers) return;
      const [inst] = app.blocs.splice(de, 1);
      app.blocs.splice(vers > de ? vers - 1 : vers, 0, inst);
      dessinerPile(); changer();
    }

    function dessinerReglages() {
      const box = root.querySelector('#cpReglages');
      const i = app.blocs.findIndex(b => b.uid === selection);
      const inst = app.blocs[i];
      if (!inst) {
        box.innerHTML = `<div class="panel-head"><span class="panel-label"><span class="mdi mdi-tune-variant"></span>Réglages</span></div>
          <div class="panel-body"><div class="empty"><span class="mdi mdi-gesture-tap"></span>Sélectionne un bloc de l’app pour le régler.</div></div>`;
        return;
      }
      const def = AB.blocs.get(inst.bloc, inst.version);
      const versions = AB.blocs.versions(inst.bloc);
      const dernier = versions[0];
      box.innerHTML = `<div class="panel-head"><span class="panel-label"><span class="mdi ${esc(def ? def.icone : 'mdi-alert-outline')}"></span>${esc(def ? def.nom : inst.bloc)}</span>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-icon btn-sm" id="rgHaut" title="Monter" ${i === 0 ? 'disabled' : ''}><span class="mdi mdi-arrow-up"></span></button>
          <button class="btn btn-ghost btn-icon btn-sm" id="rgBas" title="Descendre" ${i === app.blocs.length - 1 ? 'disabled' : ''}><span class="mdi mdi-arrow-down"></span></button></div>
        <div class="panel-body stack">
          ${def ? `<p class="muted" style="margin:0">${esc(def.description)}</p>` : `<div class="bar crit"><span class="mdi mdi-alert-outline"></span><div>Ce bloc (v${esc(inst.version)}) n’existe plus dans l’atelier.</div></div>`}
          <div class="input-group"><label class="input-label">Version du bloc</label>
            <select class="tv-select" id="rgVersion">${versions.map(v => `<option value="${esc(v.version)}" ${v.version === inst.version ? 'selected' : ''}>v${esc(v.version)}${v === dernier ? ' (dernière)' : ''}</option>`).join('')}</select></div>
          ${dernier && U.cmpVersion(dernier.version, inst.version) > 0 ? `<div class="bar warn"><span class="mdi mdi-update"></span><div>La version ${esc(dernier.version)} est disponible. ${esc((dernier.journal.find(j => j.version === dernier.version) || {}).texte || '')}</div></div>` : ''}
          ${def && def.id !== 'connexion' ? `<label class="check"><input type="checkbox" id="rgProtege" ${inst.protege ? 'checked' : ''}> <span class="mdi mdi-lock-outline"></span> Réservé aux utilisateurs connectés</label>
            ${def.donneesPersonnelles && !inst.protege && AB.kits.valeurs(app, 'securite').protegerDonneesPerso && AB.kits.resoudre(app).securite ? '<div class="bar warn"><span class="mdi mdi-shield-alert-outline"></span><div>Ce bloc manipule des données personnelles : le kit de cybersécurité demande de le réserver aux connectés.</div></div>' : ''}` : ''}
          <div class="stack" id="rgForm">${def ? C.html(def.reglages, inst.reglages || {}) : ''}</div>
          ${def && def.env.length ? `<div class="input-hint"><span class="mdi mdi-key-outline"></span> Variables nécessaires : ${def.env.map(v => esc(v.cle)).join(', ')}</div>` : ''}
          <div class="row"><button class="btn btn-outline btn-sm" id="rgDup"><span class="mdi mdi-content-duplicate"></span>Dupliquer</button>
            <div class="spacer"></div><button class="btn btn-danger-text btn-sm" id="rgDel"><span class="mdi mdi-delete-outline"></span>Retirer</button></div>
        </div>`;

      if (def) box.querySelector('#rgForm').oninput = box.querySelector('#rgForm').onchange = () => {
        inst.reglages = Object.assign({}, inst.reglages, C.lire(box, def.reglages));
        dessinerPileSansPerdreFocus();
        changer();
      };
      const protege = box.querySelector('#rgProtege');
      if (protege) protege.onchange = () => {
        inst.protege = protege.checked;
        if (inst.protege && !app.blocs.some(b => b.bloc === 'connexion')) U.toast('warning', 'Bloc Connexion absent', 'Ajoute le bloc Connexion pour que les utilisateurs puissent se connecter.');
        dessinerReglages(); changer(); dessinerEtat();
      };
      box.querySelector('#rgVersion').onchange = e => {
        const nv = AB.blocs.get(inst.bloc, e.target.value);
        inst.version = nv.version;
        // On garde les réglages connus, et on ajoute les valeurs par défaut des nouveaux.
        inst.reglages = Object.assign(AB.blocs.reglagesParDefaut(nv), inst.reglages);
        dessinerPile(); dessinerReglages(); changer();
      };
      box.querySelector('#rgHaut').onclick = () => { deplacer(i, i - 1); dessinerReglages(); };
      box.querySelector('#rgBas').onclick = () => { deplacer(i, i + 2); dessinerReglages(); };
      box.querySelector('#rgDup').onclick = () => {
        const copie = Object.assign(U.clone(inst), { uid: U.uuid().slice(0, 8) });
        app.blocs.splice(i + 1, 0, copie);
        selection = copie.uid;
        dessinerPile(); dessinerReglages(); changer();
      };
      box.querySelector('#rgDel').onclick = () => {
        app.blocs.splice(i, 1);
        selection = app.blocs[Math.min(i, app.blocs.length - 1)] ? app.blocs[Math.min(i, app.blocs.length - 1)].uid : null;
        dessinerPile(); dessinerReglages(); changer();
      };
    }

    /** Met à jour les libellés de la pile pendant la saisie, sans toucher au formulaire. */
    function dessinerPileSansPerdreFocus() {
      const el = root.querySelector(`.pile-item[data-uid="${CSS.escape(selection)}"] .name`);
      const inst = app.blocs.find(b => b.uid === selection);
      if (!el || !inst) return;
      const l = libelle(inst);
      el.innerHTML = `${esc(l.detail || l.nom)}<br><span class="small muted">${esc(l.nom)} · v${esc(inst.version)}</span>`;
    }

    /* ======================= Thème =======================
       Le thème vient du kit « charte » ; l'app ne garde que ses surcharges. */
    function theme(body) {
      app.surcharges = app.surcharges || {};
      const charte = AB.kits.resoudre(app).charte;
      const base = Object.assign({}, AB.rendu.THEME_DEFAUT, charte ? charte.valeurs : {});
      const t = AB.rendu.theme(app);
      const marque = k => k in app.surcharges
        ? `<button class="btn btn-ghost btn-xs" data-reset="${k}" title="Revenir à la valeur de la charte (${esc(base[k])})"><span class="mdi mdi-restore"></span>Personnalisé</button>`
        : '<span class="small muted">Charte</span>';
      const couleur = (k, l) => `<div class="input-group"><div class="row"><label class="input-label">${l}</label><div class="spacer"></div>${marque(k)}</div><input class="tv-input" type="color" data-t="${k}" value="${esc(t[k])}" style="height:36px;padding:2px"></div>`;
      body.innerHTML = `<div class="composer" style="grid-template-columns:minmax(0,1fr) auto">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-palette-outline"></span>Thème de l’app</span></div>
          <div class="panel-body stack">
            <div class="bar info"><span class="mdi mdi-information-outline"></span><div>${charte ? `Base : kit <b>${esc(charte.nom)}</b> v${esc(charte.version)}. Une valeur changée ici ne concerne que cette app ; le reste suit la charte.` : 'Aucun kit de charte : choisis-en un dans l’onglet Kits pour partager la même base entre tes apps.'}</div></div>
            <div class="grid grid-2">${couleur('primaire', 'Couleur principale')}${couleur('accent', 'Couleur d’accent')}${couleur('fond', 'Fond')}${couleur('texte', 'Texte')}</div>
            <div class="grid grid-2">
              <div class="input-group"><div class="row"><label class="input-label">Police</label><div class="spacer"></div>${marque('police')}</div><select class="tv-select" data-t="police">${AB.rendu.POLICES.map(p => `<option ${p === t.police ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
              <div class="input-group"><div class="row"><label class="input-label">Arrondi des angles (px)</label><div class="spacer"></div>${marque('rayon')}</div><input class="tv-input" type="number" min="0" max="32" data-t="rayon" value="${esc(t.rayon)}"></div>
            </div>
            <div class="row"><button class="btn btn-outline btn-sm" id="thReset"><span class="mdi mdi-restore"></span>Tout revenir à la charte</button></div>
          </div></div>
        <div class="phone"><iframe id="cpPhone" sandbox="allow-scripts allow-forms allow-popups" title="Aperçu de l’app"></iframe></div></div>`;
      body.querySelectorAll('[data-t]').forEach(el => el.onchange = el.oninput = () => {
        const k = el.dataset.t;
        const v = k === 'rayon' ? Number(el.value) : el.value;
        if (String(v) === String(base[k])) delete app.surcharges[k]; else app.surcharges[k] = v;
        changer();
      });
      // Redessine (pastilles « Personnalisé ») une fois la saisie terminée, hors de l'évènement en cours
      const redessiner = () => setTimeout(() => { if (body.isConnected && onglet === 'theme') theme(body); });
      body.querySelectorAll('[data-t]').forEach(el => el.addEventListener('change', redessiner));
      body.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => { delete app.surcharges[b.dataset.reset]; changer(); theme(body); });
      body.querySelector('#thReset').onclick = () => { app.surcharges = {}; changer(); theme(body); };
      rafraichirApercu();
    }

    /* ======================= Kits ======================= */
    function kits(body) {
      app.kits = app.kits || [];
      const choisi = type => app.kits.find(r => { const k = AB.kits.get(r.kit, r.version); return k && k.type === type; });
      const sel = (type, T) => {
        const ref = choisi(type);
        const options = AB.kits.derniers().filter(k => k.type === type);
        const actuel = ref && AB.kits.get(ref.kit, ref.version);
        const dernier = ref && AB.kits.dernier(ref.kit);
        const verrou = !!(actuel && actuel.obligatoire) || (ref && AB.kits.estObligatoire(ref.kit));
        return `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi ${T.icone}"></span>${esc(T.label)}</span>${verrou ? '<div class="spacer"></div><span class="chip chip-danger"><span class="mdi mdi-lock"></span>Obligatoire</span>' : ''}</div>
          <div class="panel-body stack">
            <div class="grid grid-2">
              <select class="tv-select" data-kit-type="${type}" ${verrou ? 'disabled title="Kit obligatoire pour toutes les apps"' : ''}><option value="">Aucun</option>${options.map(k => `<option value="${esc(k.id)}" ${ref && ref.kit === k.id ? 'selected' : ''}>${esc(k.nom)}</option>`).join('')}</select>
              ${ref ? `<select class="tv-select" data-kit-version="${esc(ref.kit)}">${AB.kits.versions(ref.kit).map(v => `<option ${v.version === ref.version ? 'selected' : ''}>${esc(v.version)}</option>`).join('')}</select>` : '<span></span>'}
            </div>
            ${dernier && U.cmpVersion(dernier.version, ref.version) > 0 ? `<div class="bar warn"><span class="mdi mdi-update"></span><div>La version ${esc(dernier.version)} de ce kit est disponible.</div></div>` : ''}
            ${actuel ? `<p class="muted" style="margin:0">${esc(actuel.description)}</p>${actuel.regles.length ? `<ul style="margin:0;padding-left:18px">${actuel.regles.map(r => `<li>${esc(r.texte)}${r.niveau === 'recommande' ? ' <span class="small muted">(recommandé)</span>' : ''}</li>`).join('')}</ul>` : ''}` : ''}
          </div></div>`;
      };
      const libres = AB.kits.derniers().filter(k => k.type === 'libre');
      body.innerHTML = `<div class="stack">
        <div class="bar info"><span class="mdi mdi-information-outline"></span><div>Les kits donnent à toutes tes apps la même base : charte, règles de sécurité et d’affichage. Ils se créent et se modifient dans l’écran <a href="#/kits">Kits</a>.</div></div>
        <div class="row"><span class="muted">Le prompt de l’app réunit tous ses kits, ses blocs et ses variables, prêt à coller dans Claude.</span><div class="spacer"></div>
          <a class="btn btn-primary btn-sm" href="#/prompt/app/${esc(app.id)}"><span class="mdi mdi-text-box-outline"></span>Générer le prompt de l’app</a></div>
        <div class="grid grid-3">${['charte', 'securite', 'affichage'].map(t => sel(t, AB.kits.TYPES[t])).join('')}</div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-clipboard-check-outline"></span>Règles libres</span></div>
          <div class="panel-body stack">${libres.length ? libres.map(k => `<label class="check"><input type="checkbox" data-libre="${esc(k.id)}" ${app.kits.some(r => r.kit === k.id) ? 'checked' : ''} ${k.obligatoire ? 'disabled' : ''}> <b>${esc(k.nom)}</b> ${k.obligatoire ? '<span class="chip chip-danger"><span class="mdi mdi-lock"></span>Obligatoire</span>' : ''} <span class="muted">${esc(k.description)}</span></label>`).join('')
            : '<span class="muted">Aucun kit de règles libres pour le moment.</span>'}</div></div>
      </div>`;
      const retirerType = type => { app.kits = app.kits.filter(r => { const k = AB.kits.get(r.kit, r.version); return !k || k.type !== type; }); };
      body.querySelectorAll('[data-kit-type]').forEach(el => el.onchange = () => {
        retirerType(el.dataset.kitType);
        const k = AB.kits.dernier(el.value);
        if (k) app.kits.push({ kit: k.id, version: k.version });
        changer(); dessinerEtat(); kits(body);
      });
      body.querySelectorAll('[data-kit-version]').forEach(el => el.onchange = () => {
        app.kits.find(r => r.kit === el.dataset.kitVersion).version = el.value;
        changer(); dessinerEtat(); kits(body);
      });
      body.querySelectorAll('[data-libre]').forEach(el => el.onchange = () => {
        app.kits = app.kits.filter(r => r.kit !== el.dataset.libre);
        const k = AB.kits.dernier(el.dataset.libre);
        if (el.checked && k) app.kits.push({ kit: k.id, version: k.version });
        changer({ apercu: false }); dessinerEtat();
      });
    }

    /* ======================= Conformité ======================= */
    function conformite(body) {
      const res = AB.kits.conformite(app);
      const CHIPS = { ok: ['chip-success', 'mdi-check', 'Conforme'], ko: ['chip-danger', 'mdi-close', 'À corriger'], info: ['chip-info', 'mdi-information-outline', 'Info'], manuel: ['chip-warning', 'mdi-hand-pointing-right', 'À vérifier'] };
      const groupes = [...new Set(res.map(r => r.groupe))];
      const bloquants = AB.kits.bloquants(app);
      body.innerHTML = `<div class="stack">
        ${bloquants ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div><b>${bloquants} point(s) bloquant(s)</b> avant une mise en production.</div></div>`
          : '<div class="bar ok"><span class="mdi mdi-check-decagram-outline"></span><div>Aucun point bloquant.</div></div>'}
        ${groupes.map(g => `<div class="panel"><div class="panel-head"><span class="panel-label">${esc(g)}</span></div><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>
          ${res.filter(r => r.groupe === g).map(r => {
            const c = CHIPS[r.cle && r.statut === 'ok' ? 'ok' : r.statut];
            return `<tr><td style="width:40px">${r.cle ? `<input type="checkbox" data-regle="${esc(r.cle)}" ${r.statut === 'ok' ? 'checked' : ''} title="Cocher quand la règle est respectée">` : ''}</td>
              <td>${esc(r.texte)}${r.detail ? `<div class="small muted">${esc(r.detail)}</div>` : ''}</td>
              <td class="actions"><span class="chip ${c[0]}"><span class="mdi ${c[1]}"></span>${c[2]}</span></td></tr>`;
          }).join('')}</tbody></table></div></div></div>`).join('')}
      </div>`;
      body.querySelectorAll('[data-regle]').forEach(el => el.onchange = () => {
        app.conformite = app.conformite || {};
        if (el.checked) app.conformite[el.dataset.regle] = true; else delete app.conformite[el.dataset.regle];
        changer({ apercu: false }); dessinerEtat(); conformite(body);
      });
    }

    /* ======================= Infos ======================= */
    function infos(body) {
      body.innerHTML = `<div class="panel" style="max-width:820px"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-information-outline"></span>Informations</span></div>
        <div class="panel-body stack">
          <div class="grid grid-2">
            <div class="input-group"><label class="input-label">Nom de l’app</label><input class="tv-input" data-k="nom" value="${esc(app.nom)}"></div>
            <div class="input-group"><label class="input-label">Icône (Material Design Icons)</label><input class="tv-input mono" data-k="icone" value="${esc(app.icone)}"><div class="input-hint">Ex. mdi-store-outline · <a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener">catalogue des icônes</a></div></div>
          </div>
          <div class="input-group"><label class="input-label">Description</label><textarea class="tv-textarea" data-k="description" style="min-height:60px">${esc(app.description)}</textarea></div>
          <div class="grid grid-2">
            <div class="input-group"><label class="input-label">Statut</label><select class="tv-select" data-k="statut">${Object.entries(M.STATUTS).map(([k, v]) => `<option value="${k}" ${k === app.statut ? 'selected' : ''}>${esc(v[0])}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label">Adresse en production</label><input class="tv-input" data-l="prod" value="${esc(app.liens.prod)}" placeholder="https://…"></div>
          </div>
          <div class="input-group"><label class="input-label">Dépôt Git</label><input class="tv-input" data-l="repo" value="${esc(app.liens.repo)}" placeholder="https://github.com/…"></div>
          <div class="input-group"><label class="input-label">Notes</label><textarea class="tv-textarea" data-k="notes" style="min-height:140px">${esc(app.notes)}</textarea></div>
        </div></div>`;
      body.querySelectorAll('[data-k]').forEach(el => el.oninput = el.onchange = () => {
        app[el.dataset.k] = el.value;
        root.querySelector('#cpNom').textContent = app.nom;
        root.querySelector('#cpIcone').className = 'mdi ' + app.icone;
        AB.app.setCrumbs(['Apps', app.nom]);
        changer({ apercu: false });
      });
      body.querySelectorAll('[data-l]').forEach(el => el.oninput = () => { app.liens[el.dataset.l] = el.value.trim(); changer({ apercu: false }); });
    }

    /* ======================= Variables d'environnement =======================
       Les valeurs PUBLIQUES se saisissent ici (elles vont dans app.js) ;
       les secrets n'ont jamais de champ : ils se renseignent sur le serveur. */
    function env(body) {
      const vars = AB.rendu.env(app);
      app.config = app.config || {};
      body.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-key-outline"></span>Variables d’environnement demandées par les blocs</span>
          <div class="spacer"></div><button class="btn btn-outline btn-sm" id="envDl"><span class="mdi mdi-download"></span>.env.example</button></div>
        <div class="panel-body flush">
          ${vars.length ? `<div class="table-wrap"><table class="tv-table"><thead><tr><th>Variable</th><th>Rôle</th><th>Valeur</th><th>Blocs</th></tr></thead><tbody>
          ${vars.map(v => `<tr><td class="mono">${esc(v.cle)}</td><td class="small">${esc(v.role)}</td>
            <td style="min-width:220px">${v.secret ? '<span class="chip chip-danger"><span class="mdi mdi-lock-outline"></span>Secret : sur le serveur uniquement</span>'
              : `<input class="tv-input mono" data-cfg="${esc(v.cle)}" value="${esc(app.config[v.cle] || '')}" placeholder="${esc(v.defaut || '')}">`}</td>
            <td class="small">${esc(v.blocs.join(', '))}</td></tr>`).join('')}</tbody></table></div>`
          : `<div class="empty"><span class="mdi mdi-key-remove"></span>Aucun bloc de cette app ne demande de variable.</div>`}
        </div></div>
        <div class="bar warn" style="margin-top:12px"><span class="mdi mdi-shield-lock-outline"></span><div>Les valeurs publiques sont écrites dans l’app exportée (elles sont visibles par les utilisateurs, c’est normal : la clé « anon » de Supabase est protégée par les règles RLS). Les secrets se renseignent sur le serveur : voir le README du ZIP.</div></div>
        <div class="bar info" style="margin-top:12px"><span class="mdi mdi-information-outline"></span><div>Dans l’aperçu, la connexion et le paiement restent simulés (mode démo) même si les valeurs sont remplies : le vrai fonctionnement se teste sur l’app exportée.</div></div>`;
      body.querySelectorAll('[data-cfg]').forEach(el => el.oninput = () => {
        const v = el.value.trim();
        if (v) app.config[el.dataset.cfg] = v; else delete app.config[el.dataset.cfg];
        changer({ apercu: false });
      });
      body.querySelector('#envDl').onclick = () => U.download('.env.example', AB.rendu.envExample(app));
    }

    /* ======================= Backend ======================= */
    function backend(body) {
      const b = AB.rendu.backend(app);
      if (!b.necessaire) {
        body.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty"><span class="mdi mdi-database-off-outline"></span>Pas de backend nécessaire : aucun bloc de cette app ne déclare de table ni de fonction serveur. <a href="#/bases/${esc(app.id)}">Concevoir les tables de l’app</a></div></div></div>`;
        return;
      }
      body.innerHTML = `<div class="stack">
        <div class="bar info"><span class="mdi mdi-information-outline"></span><div>Backend généré automatiquement à partir des blocs, au format Supabase : tables avec règles d’accès (RLS) et fonctions serveur. Il est inclus dans le ZIP (dossier supabase/), avec les étapes de déploiement dans le README. Les tables propres à l’app se conçoivent dans <a href="#/bases/${esc(app.id)}">Bases de données</a>.</div></div>
        <div class="grid grid-2">
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-table"></span>Tables (${b.tables.length})</span></div>
            <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Table</th><th>Colonnes</th><th>Bloc</th></tr></thead><tbody>
            ${b.tables.map(t => `<tr><td class="mono">${esc(t.nom)}</td><td class="small">${(t.colonnes || []).map(c => `${esc(c[0])} <span class="muted">${esc(c[1])}</span>`).join(', ')}</td><td>${esc(t.bloc)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucune</td></tr>'}
            </tbody></table></div></div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-function-variant"></span>Fonctions serveur (${b.fonctions.length})</span></div>
            <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Fonction</th><th>Méthode</th><th>Bloc</th></tr></thead><tbody>
            ${b.fonctions.map(f => `<tr><td class="mono">${esc(f.nom)}</td><td>${esc(f.methode || 'POST')}</td><td>${esc(f.bloc)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucune</td></tr>'}
            </tbody></table></div></div></div>
        </div>
        ${Object.entries(b.fichiers).map(([n, c]) => `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-file-code-outline"></span><span class="mono">${esc(n)}</span></span></div><div class="panel-body"><pre class="code">${esc(c)}</pre></div></div>`).join('')}
      </div>`;
    }

    /* ======================= Versions ======================= */
    function versions(body) {
      const liste = app.versions.slice().sort((a, b) => b.numero - a.numero);
      body.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-history"></span>Historique des versions</span></div>
        <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Version</th><th>Date</th><th>Note</th><th>Blocs</th><th></th></tr></thead><tbody>
        ${liste.map(v => `<tr><td><b>${v.numero}</b> ${v.numero === app.versionCourante ? '<span class="chip chip-primary">Actuelle</span>' : ''}</td>
          <td class="muted">${esc(U.fmtDate(v.date))}</td><td>${esc(v.note)}</td>
          <td class="small">${(v.copie.blocs || []).map(b => `${esc(b.bloc)} <span class="muted">v${esc(b.version)}</span>`).join(', ') || '—'}</td>
          <td class="actions"><button class="btn btn-outline btn-xs" data-zipv="${v.numero}"><span class="mdi mdi-download"></span>ZIP</button>
          ${v.numero !== app.versionCourante || M.modifieeDepuisVersion(app) ? `<button class="btn btn-outline btn-xs" data-rest="${v.numero}"><span class="mdi mdi-restore"></span>Revenir</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div></div></div>`;
      body.querySelectorAll('[data-rest]').forEach(b => b.onclick = async () => {
        const n = Number(b.dataset.rest);
        if (!(await U.confirm('Revenir à une version', `L’app reprend le contenu de la version ${n}. L’état actuel reste dans l’historique${M.modifieeDepuisVersion(app) ? ' — sauf les modifications non enregistrées en version' : ''}.`, { okLabel: 'Revenir' }))) return;
        clearTimeout(timerSave); timerSave = null;
        await M.restaurer(app, n);
        U.toast('success', `Retour à la version ${n}`);
        AB.app.go('apps/' + app.id);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      body.querySelectorAll('[data-zipv]').forEach(b => b.onclick = () => {
        const v = app.versions.find(x => x.numero === Number(b.dataset.zipv));
        telechargerZip(Object.assign(U.clone(v.copie), { versionCourante: v.numero }));
      });
    }

    /* ======================= Fichiers ======================= */
    function fichiers(body) {
      const f = AB.rendu.fichiers(app);
      const noms = Object.keys(f);
      body.innerHTML = `<div class="composer" style="grid-template-columns:260px minmax(0,1fr)">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-folder-outline"></span>${noms.length} fichiers</span></div>
          <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>
          ${noms.map((n, i) => `<tr data-f="${i}" style="cursor:pointer"><td class="mono">${esc(n)}</td><td class="small muted" style="text-align:right">${(new Blob([f[n]]).size / 1024).toFixed(1)} Ko</td></tr>`).join('')}
          </tbody></table></div></div>
          <div class="panel-body stack">
            <button class="btn btn-primary" id="fzZip"><span class="mdi mdi-folder-zip-outline"></span>Télécharger le ZIP</button>
            <button class="btn btn-outline" id="fzJson"><span class="mdi mdi-code-json"></span>Exporter l’app (JSON)</button>
            <button class="btn btn-outline" id="fzDup"><span class="mdi mdi-content-duplicate"></span>Dupliquer l’app</button>
            <button class="btn btn-danger-text" id="fzDel"><span class="mdi mdi-delete-outline"></span>Supprimer l’app</button>
          </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label mono" id="fzNom"></span></div><div class="panel-body"><pre class="code" id="fzCode"></pre></div></div></div>`;
      const voir = i => { body.querySelector('#fzNom').textContent = noms[i]; body.querySelector('#fzCode').textContent = f[noms[i]]; };
      body.querySelectorAll('[data-f]').forEach(tr => tr.onclick = () => voir(Number(tr.dataset.f)));
      voir(0);
      body.querySelector('#fzZip').onclick = () => telechargerZip(app);
      body.querySelector('#fzJson').onclick = () => U.download(`${U.slug(app.nom) || 'app'}.app.json`, JSON.stringify(app, null, 2), 'application/json');
      body.querySelector('#fzDup').onclick = async () => {
        const copie = await M.creer(Object.assign(M.contenu(app), { id: U.uuid(), nom: app.nom + ' (copie)', versions: [] }));
        U.toast('success', 'App dupliquée', copie.nom);
        AB.app.go('apps/' + copie.id);
      };
      body.querySelector('#fzDel').onclick = async () => {
        if (!(await U.confirm('Supprimer l’app', `« ${app.nom} » et tout son historique seront supprimés de la plateforme.`, { danger: true, okLabel: 'Supprimer' }))) return;
        clearTimeout(timerSave); timerSave = null;
        await AB.db.remove('apps', app.id);
        AB.app.go('apps');
      };
    }

    /** Export ZIP, précédé d'un audit si le kit de cybersécurité le demande. */
    async function telechargerZip(a) {
      const regle = AB.kits.valeurs(a, 'securite').auditExport;
      if (regle && regle !== 'non') {
        // a peut être une ancienne version (copie) : seule l'app ouverte est enregistrée
        if (a === app) { clearTimeout(timerSave); timerSave = null; await M.enregistrer(app); }
        const audit = AB.audit.auditerApp(a);
        if (a !== app) audit.cible.nom += ` (version ${a.versionCourante})`;
        await AB.audit.enregistrer(audit);
        app.audits = [{ id: audit.id, date: audit.date, type: audit.cible.type, score: audit.score, note: audit.note, bloquants: audit.bloquants }].concat(app.audits || []).slice(0, 30);
        dessinerEtat();
        if (audit.bloquants) {
          const detail = `${audit.comptes.critique} critique(s), ${audit.comptes.elevee} élevée(s) — note ${audit.note} (${audit.score}/100).`;
          if (regle === 'bloquer') {
            U.dialog({ title: 'Export bloqué par le kit de cybersécurité', size: 'sm',
              body: `<p style="margin:0">L’audit de sécurité a trouvé des points à corriger avant de livrer : ${esc(detail)}</p>`,
              actions: [{ label: 'Fermer' }, { label: 'Voir le rapport', cls: 'btn-primary', onClick: () => AB.app.go('audit/rapport/' + audit.id) }] });
            return;
          }
          if (!(await U.confirm('Audit de sécurité', `Points à corriger : ${detail} Exporter quand même ?`, { okLabel: 'Exporter quand même' }))) return;
        } else U.toast('success', `Audit de sécurité : ${audit.note} (${audit.score}/100)`, 'Aucun point critique ni élevé.');
      }
      U.download(`${U.slug(a.nom) || 'app'}-v${a.versionCourante || 1}.zip`, AB.zip(AB.rendu.fichiers(a)));
    }

    /* ---------- Boutons du haut ---------- */
    root.querySelector('#cpVersion').onclick = async () => {
      const note = await U.prompt('Nouvelle version', 'Ce qui change dans cette version', '');
      if (note === null) return;
      M.nouvelleVersion(app, note);
      clearTimeout(timerSave); timerSave = null;
      await M.enregistrer(app);
      dessinerEtat();
      if (onglet === 'versions') dessinerCorps();
      U.toast('success', `Version ${app.versionCourante} enregistrée`);
    };
    root.querySelector('#cpZip').onclick = () => telechargerZip(app);
    root.querySelector('#cpBase').onclick = () => { onglet = 'base'; dessinerOnglets(); dessinerCorps(); };
    root.querySelector('#cpHtml').onclick = async () => {
      U.download((U.slug(app.nom) || 'app') + '.html', await AB.rendu.fichierUnique(app), 'text/html;charset=utf-8');
      U.toast('success', 'Fichier HTML téléchargé', 'Ouvre-le en double-clic ; les données restent dans ce navigateur.');
    };
    root.querySelector('#cpAudit').onclick = async () => {
      clearTimeout(timerSave); timerSave = null;
      await M.enregistrer(app);
      const audit = await AB.audit.enregistrer(AB.audit.auditerApp(app));
      app.audits = [{ id: audit.id, date: audit.date, type: 'atelier', score: audit.score, note: audit.note, bloquants: audit.bloquants }].concat(app.audits || []).slice(0, 30);
      AB.app.go('audit/rapport/' + audit.id);
    };

    dessinerEtat();
    dessinerOnglets();
    dessinerCorps();

    return {
      destroy() {
        if (ecranBase) ecranBase.destroy();
        // Enregistre tout de suite ce qui était en attente.
        if (timerSave) { clearTimeout(timerSave); timerSave = null; M.enregistrer(app); }
        clearTimeout(timerApercu);
      }
    };
  };
})();
