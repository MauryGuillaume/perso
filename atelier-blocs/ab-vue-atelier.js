/* ==========================================================================
   ab-vue-atelier.js — l'atelier de blocs : liste, import, éditeur
   L'éditeur travaille sur une copie du bloc ; « Enregistrer » remplace la
   version ouverte, « Nouvelle version » crée 1.0.1, 1.1.0 ou 2.0.0.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  /** Nombre d'apps qui utilisent chaque bloc (toutes versions), et par version. */
  async function utilisations() {
    const apps = (await AB.db.list('apps')).filter(a => a.origine === 'plateforme');
    const parBloc = {}, parVersion = {};
    apps.forEach(a => (a.blocs || []).forEach(i => {
      (parBloc[i.bloc] = parBloc[i.bloc] || new Set()).add(a.id);
      (parVersion[`${i.bloc}@${i.version}`] = parVersion[`${i.bloc}@${i.version}`] || new Set()).add(a.nom);
    }));
    return { parBloc, parVersion };
  }

  /* ======================= Liste des blocs ======================= */

  AB.vues.blocs = async function (root) {
    AB.app.setCrumbs(['Atelier de blocs']);
    const usage = await utilisations();
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Atelier</div><h2 class="section-title">Blocs réutilisables</h2>
        <p class="section-desc">Chaque bloc apporte ses écrans, ses réglages, ses variables d’environnement et, si besoin, ses tables et fonctions serveur.</p></div>
        <div class="row"><button class="btn btn-outline" id="blImport"><span class="mdi mdi-upload-outline"></span>Importer un bloc</button>
        <button class="btn btn-primary" id="blNew"><span class="mdi mdi-plus"></span>Nouveau bloc</button></div></div>
      <input class="tv-input" id="blCherche" placeholder="Chercher un bloc…" style="max-width:360px">
      <div class="panel"><div class="panel-body flush"><div class="table-wrap"><table class="tv-table">
        <thead><tr><th>Bloc</th><th>Catégorie</th><th>Version</th><th>Contenu</th><th>Utilisé par</th><th></th></tr></thead>
        <tbody id="blListe"></tbody></table></div></div></div></div>`;

    const draw = q => {
      q = (q || '').toLowerCase();
      const blocs = AB.blocs.derniers().filter(b => !q || (b.nom + b.id + b.categorie + b.description).toLowerCase().includes(q));
      root.querySelector('#blListe').innerHTML = blocs.map(b => {
        const nbV = AB.blocs.versions(b.id).length;
        const nbApps = usage.parBloc[b.id] ? usage.parBloc[b.id].size : 0;
        const contenu = [
          `${b.ecrans.length} écran(s)`, b.reglages.length ? `${b.reglages.length} réglage(s)` : '',
          b.env.length ? `${b.env.length} variable(s)` : '', b.tables.length ? `${b.tables.length} table(s)` : '',
          b.serveur.length ? `${b.serveur.length} fonction(s)` : ''].filter(Boolean).join(' · ');
        return `<tr><td><div class="row" style="flex-wrap:nowrap"><span class="mdi ${esc(b.icone)}" style="font-size:20px;color:var(--color-accent)"></span>
            <div><b>${esc(b.nom)}</b><div class="small muted mono">${esc(b.id)}</div></div></div></td>
          <td>${esc(b.categorie)}</td>
          <td><span class="chip chip-primary">v${esc(b.version)}</span>${nbV > 1 ? ` <span class="small muted">${nbV} versions</span>` : ''}</td>
          <td class="small muted">${esc(contenu)}</td>
          <td>${nbApps ? `${nbApps} app(s)` : '<span class="muted">—</span>'}</td>
          <td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-exp="${esc(b.cle)}" title="Exporter le fichier du bloc"><span class="mdi mdi-download"></span></button>
            <a class="btn btn-outline btn-xs" href="#/blocs/${esc(b.id)}/${esc(b.version)}"><span class="mdi mdi-pencil-outline"></span>Modifier</a></td></tr>`;
      }).join('') || `<tr><td colspan="6"><div class="empty"><span class="mdi mdi-puzzle-remove-outline"></span>Aucun bloc.</div></td></tr>`;
      root.querySelectorAll('[data-exp]').forEach(btn => btn.onclick = () => {
        const b = AB.blocs.toutes.find(x => x.cle === btn.dataset.exp);
        U.download(`bloc-${b.id}.js`, AB.blocs.versFichier(b), 'text/javascript');
      });
    };

    root.querySelector('#blCherche').oninput = e => draw(e.target.value);
    root.querySelector('#blNew').onclick = () => AB.app.go('blocs/nouveau/1.0.0');
    root.querySelector('#blImport').onclick = async () => {
      const f = await U.pickFile('.js,.json');
      if (!f) return;
      try {
        const defs = AB.blocs.depuisFichier(f.texte);
        if (!defs.length) throw new Error('Aucun bloc trouvé dans ce fichier.');
        for (const d of defs) {
          const existe = AB.blocs.get(d.id, d.version);
          if (existe && !(await U.confirm('Bloc déjà présent', `${d.nom} v${d.version} existe déjà. Le remplacer ?`, { okLabel: 'Remplacer' }))) continue;
          await AB.blocs.enregistrer(Object.assign(d, { origine: 'importe' }));
        }
        U.toast('success', 'Import terminé', `${defs.length} bloc(s) lu(s) dans ${f.nom}.`);
        draw(root.querySelector('#blCherche').value);
      } catch (e) { U.toast('error', 'Import impossible', e.message, 8000); }
    };
    draw('');
    return {};
  };

  /* ======================= Éditeur d'un bloc ======================= */

  /** Éditeur de lignes générique (réglages, variables, colonnes).
      spec : [{ k, label, type: 'text'|'select'|'check'|'mono', options, width }] */
  const lignes = AB.lignes = function (items, spec, onChange) {
    const box = document.createElement('div');
    const draw = () => {
      box.innerHTML = `<div class="table-wrap"><table class="tv-table"><thead><tr>${spec.map(s => `<th${s.width ? ` style="width:${s.width}"` : ''}>${esc(s.label)}</th>`).join('')}<th></th></tr></thead><tbody>
        ${items.map((it, i) => `<tr>${spec.map(s => {
          const v = it[s.k] !== undefined ? it[s.k] : '';
          if (s.type === 'select') return `<td><select class="tv-select" data-i="${i}" data-k="${s.k}">${Object.entries(s.options).map(([k, l]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td>`;
          if (s.type === 'check') return `<td style="text-align:center"><input type="checkbox" data-i="${i}" data-k="${s.k}" ${v ? 'checked' : ''}></td>`;
          return `<td><input class="tv-input ${s.type === 'mono' ? 'mono' : ''}" data-i="${i}" data-k="${s.k}" value="${esc(v)}" placeholder="${esc(s.placeholder || '')}"></td>`;
        }).join('')}<td class="actions">
          <button class="btn btn-ghost btn-icon btn-sm" data-up="${i}" title="Monter" ${i ? '' : 'disabled'}><span class="mdi mdi-arrow-up"></span></button>
          <button class="btn btn-ghost btn-icon btn-sm" data-del="${i}" title="Supprimer"><span class="mdi mdi-close"></span></button></td></tr>`).join('')}
        </tbody></table></div>
        <div style="padding:8px 12px"><button class="btn btn-ghost btn-sm" data-add><span class="mdi mdi-plus"></span>Ajouter une ligne</button></div>`;
      box.querySelectorAll('[data-k]').forEach(el => el.oninput = el.onchange = () => {
        const s = spec.find(x => x.k === el.dataset.k);
        items[Number(el.dataset.i)][el.dataset.k] = s.type === 'check' ? el.checked : el.value;
        onChange();
      });
      box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { items.splice(Number(b.dataset.del), 1); draw(); onChange(); });
      box.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
        const i = Number(b.dataset.up);
        [items[i - 1], items[i]] = [items[i], items[i - 1]];
        draw(); onChange();
      });
      box.querySelector('[data-add]').onclick = () => {
        const vide = {};
        spec.forEach(s => { vide[s.k] = s.type === 'check' ? false : s.type === 'select' ? Object.keys(s.options)[0] : ''; });
        items.push(vide); draw(); onChange();
      };
    };
    draw();
    return box;
  };

  AB.vues.bloc = async function (root, [id, version]) {
    const nouveau = id === 'nouveau';
    const original = nouveau ? null : AB.blocs.get(id, version);
    if (!nouveau && !original) {
      root.innerHTML = `<div class="page"><div class="empty"><span class="mdi mdi-puzzle-remove-outline"></span>Bloc introuvable. <a href="#/blocs">Retour à l’atelier</a></div></div>`;
      return {};
    }
    // Copie de travail : rien n'est enregistré avant « Enregistrer ».
    const b = nouveau ? AB.blocs.normaliser({
      id: '', nom: '', version: '1.0.0', categorie: 'Divers',
      ecrans: [{ id: 'principal', titre: '{{titre}}', icone: '', html: '<h1 class="titre">{{titre}}</h1>\n<div class="carte">Contenu du bloc</div>', css: '', js: '' }],
      reglages: [{ cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Mon bloc' }],
      journal: [{ version: '1.0.0', date: new Date().toISOString().slice(0, 10), texte: 'Première version' }]
    }) : AB.blocs.normaliser(original);
    const usage = (await utilisations()).parVersion[`${b.id}@${b.version}`];
    let onglet = 'identite', modifie = false, timer = null;
    // Les colonnes de table sont des tableaux [nom, type] ; on les édite comme objets.
    b.tables.forEach(t => { t._cols = (t.colonnes || []).map(c => ({ nom: c[0], type: c[1], contrainte: c[2] || '' })); });

    AB.app.setCrumbs(['Atelier de blocs', nouveau ? 'Nouveau bloc' : `${b.nom} v${b.version}`]);
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">${nouveau ? 'Nouveau bloc' : 'Bloc'}</div>
        <h2 class="section-title"><span class="mdi ${esc(b.icone)}" id="beIcone"></span> <span id="beNom">${esc(b.nom || 'Sans nom')}</span> <span class="chip chip-primary">v${esc(b.version)}</span></h2>
        ${usage ? `<p class="section-desc">Cette version est utilisée par : ${esc([...usage].join(', '))}. Enregistrer la modifie pour ces apps ; une nouvelle version les laisse inchangées.</p>` : ''}</div>
        <div class="row">
          ${nouveau ? '' : `<button class="btn btn-danger-text" id="beDel"><span class="mdi mdi-delete-outline"></span>Supprimer cette version</button>
          <button class="btn btn-outline" id="beExp"><span class="mdi mdi-download"></span>Fichier</button>
          <button class="btn btn-outline" id="beNewV"><span class="mdi mdi-source-branch"></span>Nouvelle version</button>`}
          <button class="btn btn-primary" id="beSave"><span class="mdi mdi-content-save-outline"></span>Enregistrer</button></div></div>
      <div id="beErreurs"></div>
      <div class="composer" style="grid-template-columns:minmax(0,1fr) 300px">
        <div class="panel"><div class="tabs" id="beTabs" style="padding:0 8px"></div><div class="panel-body" id="beBody"></div></div>
        <div class="stack"><div class="phone"><iframe id="bePhone" sandbox="allow-scripts allow-forms allow-popups" title="Aperçu du bloc"></iframe></div>
          <div class="small muted" style="text-align:center">Aperçu avec les valeurs par défaut des réglages</div></div>
      </div></div>`;

    const ONGLETS = [['identite', 'Identité', 'mdi-card-text-outline'], ['reglages', 'Réglages', 'mdi-tune-variant'],
      ['ecrans', 'Écrans', 'mdi-cellphone-screenshot'], ['donnees', 'Données et serveur', 'mdi-database-outline'],
      ['env', 'Variables', 'mdi-key-outline'], ['journal', 'Journal', 'mdi-history']];

    /** Bloc tel qu'il sera enregistré (colonnes remises en tableaux). */
    function propre() {
      const c = U.clone(b);
      c.tables.forEach(t => { t.colonnes = (t._cols || []).filter(x => x.nom).map(x => x.contrainte ? [x.nom, x.type, x.contrainte] : [x.nom, x.type]); delete t._cols; });
      c.reglages.forEach(r => { delete r.optionsTexte; if (r.type === 'booleen') r.defaut = r.defaut === true || r.defaut === 'true'; else if (r.type === 'nombre' && r.defaut !== '') r.defaut = Number(r.defaut); });
      return c;
    }

    function changer() {
      modifie = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const c = AB.blocs.normaliser(propre());
        root.querySelector('#beNom').textContent = c.nom || 'Sans nom';
        root.querySelector('#beIcone').className = 'mdi ' + c.icone;
        const err = AB.blocs.valider(c);
        root.querySelector('#beErreurs').innerHTML = err.length
          ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div>${err.map(esc).join('<br>')}</div></div>` : '';
        try { root.querySelector('#bePhone').srcdoc = AB.rendu.apercuBloc(c, AB.blocs.reglagesParDefaut(c)); } catch (e) { /* bloc incomplet */ }
      }, 300);
    }

    function dessinerOnglets() {
      root.querySelector('#beTabs').innerHTML = ONGLETS.map(([k, l, i]) =>
        `<button class="tab ${k === onglet ? 'active' : ''}" data-tab="${k}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { onglet = t.dataset.tab; dessinerOnglets(); dessinerCorps(); });
    }

    function champ(label, k, opts) {
      opts = opts || {};
      return `<div class="input-group"><label class="input-label">${esc(label)}</label>
        ${opts.long ? `<textarea class="tv-textarea" data-b="${k}">${esc(b[k])}</textarea>` : `<input class="tv-input ${opts.mono ? 'mono' : ''}" data-b="${k}" value="${esc(Array.isArray(b[k]) ? b[k].join(', ') : b[k])}" ${opts.lecture ? 'readonly' : ''} ${opts.liste ? `list="${opts.liste}"` : ''}>`}
        ${opts.aide ? `<div class="input-hint">${opts.aide}</div>` : ''}</div>`;
    }

    function dessinerCorps() {
      const body = root.querySelector('#beBody');
      body.innerHTML = '';
      if (onglet === 'identite') {
        const cats = [...new Set(AB.blocs.toutes.map(x => x.categorie))];
        body.innerHTML = `<div class="stack">
          <div class="grid grid-2">${champ('Nom', 'nom')}${champ('Identifiant', 'id', { mono: true, lecture: !nouveau, aide: nouveau ? 'Rempli d’après le nom ; minuscules, chiffres et tirets.' : 'Fixe une fois le bloc créé.' })}</div>
          <div class="grid grid-2">${champ('Catégorie', 'categorie', { liste: 'beCats' })}${champ('Icône', 'icone', { mono: true, aide: 'Material Design Icons, ex. mdi-credit-card-outline' })}</div>
          <datalist id="beCats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
          ${champ('Description', 'description', { long: true })}
          ${champ('Dépendances', 'dependances', { mono: true, aide: 'Identifiants des blocs requis, séparés par des virgules (ex. connexion).' })}
          <label class="check"><input type="checkbox" id="beDP" ${b.donneesPersonnelles ? 'checked' : ''}> Ce bloc affiche ou collecte des données personnelles (le kit de cybersécurité peut exiger qu’il soit réservé aux connectés)</label>
        </div>`;
        body.querySelector('#beDP').onchange = e => { b.donneesPersonnelles = e.target.checked; changer(); };
        let idTouche = !nouveau || !!b.id;
        body.querySelectorAll('[data-b]').forEach(el => el.oninput = () => {
          const k = el.dataset.b;
          b[k] = k === 'dependances' ? el.value.split(',').map(s => s.trim()).filter(Boolean) : el.value;
          if (k === 'id') idTouche = true;
          if (k === 'nom' && nouveau && !idTouche) { b.id = U.slug(el.value); body.querySelector('[data-b="id"]').value = b.id; }
          changer();
        });
      }
      if (onglet === 'reglages') {
        body.innerHTML = `<p class="muted" style="margin-top:0">Les réglages s’affichent dans le composeur. Dans le HTML d’un écran, <code>{{cle}}</code> insère la valeur ; dans le JS, <code>reglages.cle</code>. Pour un « choix », mettre les options dans Options, séparées par des « | ».</p>`;
        b.reglages.forEach(r => { if (r.options) r.optionsTexte = String(r.options).split('\n').join(' | '); });
        body.appendChild(lignes(b.reglages, [
          { k: 'cle', label: 'Clé', type: 'mono', placeholder: 'titre', width: '130px' }, { k: 'label', label: 'Libellé' },
          { k: 'type', label: 'Type', type: 'select', options: AB.blocs.TYPES_REGLAGE, width: '150px' },
          { k: 'defaut', label: 'Valeur par défaut' }, { k: 'optionsTexte', label: 'Options', placeholder: 'a | b | c' }
        ], () => {
          b.reglages.forEach(r => { r.options = r.optionsTexte ? r.optionsTexte.split('|').map(s => s.trim()).filter(Boolean).join('\n') : undefined; });
          changer();
        }));
      }
      if (onglet === 'ecrans') {
        body.innerHTML = `<div class="bar info" style="margin-bottom:12px"><span class="mdi mdi-information-outline"></span><div>
          <b>HTML</b> : <code>{{cle}}</code> valeur échappée · <code>{{#liste}}&lt;li&gt;{{.}}&lt;/li&gt;{{/liste}}</code> une ligne par élément · <code>{{?cle}}…{{/cle}}</code> si vrai.
          Classes prêtes : titre, sous-titre, carte, btn, btn secondaire, champ, liste, hero, discret.<br>
          <b>JS</b> : corps d’une fonction <code>(racine, reglages, appli)</code> ; <code>appli.aller(page)</code>, <code>appli.toast(texte)</code>, <code>appli.lire(table)</code>, <code>appli.enregistrer(table, ligne)</code>.<br>
          Services : <code>appli.attendre('supabase')</code>, <code>appli.utilisateur</code>, <code>appli.exigerConnexion()</code>, <code>appli.prix(n)</code>, <code>appli.date(d)</code>, <code>appli.kit('securite')</code>, <code>appli.config.NOM</code>, <code>appli.demo</code>.<br>
          Réglages de ce bloc : ${b.reglages.map(r => `<code>${esc(r.cle)}</code>`).join(' ') || 'aucun'}</div></div>
          <div class="input-group" style="margin-bottom:12px"><label class="input-label">Initialisation (facultatif)</label>
            <textarea class="tv-textarea code" id="beInit" spellcheck="false" style="min-height:90px" placeholder="Code lancé au démarrage de l’app, avant les écrans : (reglages, appli)">${esc(b.init)}</textarea>
            <div class="input-hint">Pour préparer un service partagé : <code>appli.fournir('nom', valeur)</code>.</div></div>
          <div class="stack" id="beEcrans"></div>
          <button class="btn btn-outline btn-sm" id="beAddEcran" style="margin-top:12px"><span class="mdi mdi-plus"></span>Ajouter un écran</button>`;
        body.querySelector('#beInit').oninput = e => { b.init = e.target.value; changer(); };
        const box = body.querySelector('#beEcrans');
        b.ecrans.forEach((e, i) => {
          const p = document.createElement('div');
          p.className = 'panel';
          p.innerHTML = `<div class="panel-head"><span class="panel-label"><span class="mdi mdi-cellphone-screenshot"></span>Écran ${i + 1}</span><div class="spacer"></div>
            <button class="btn btn-danger-text btn-sm" data-delecran><span class="mdi mdi-delete-outline"></span>Supprimer</button></div>
            <div class="panel-body stack">
              <div class="grid grid-3">
                <div class="input-group"><label class="input-label">Identifiant</label><input class="tv-input mono" data-e="id" value="${esc(e.id)}"></div>
                <div class="input-group"><label class="input-label">Nom de l’onglet</label><input class="tv-input" data-e="titre" value="${esc(e.titre)}"><div class="input-hint">Peut contenir {{cle}}</div></div>
                <div class="input-group"><label class="input-label">Icône de l’onglet</label><input class="tv-input mono" data-e="icone" value="${esc(e.icone || '')}" placeholder="${esc(b.icone)}"></div>
              </div>
              <div class="row">
                <label class="check"><input type="checkbox" data-ecache ${e.cache ? 'checked' : ''}> Pas d’onglet (écran ouvert par un lien)</label>
                <label class="check"><input type="checkbox" data-erole ${e.role === 'connexion' ? 'checked' : ''}> Écran de connexion de l’app</label>
              </div>
              <div class="input-group"><label class="input-label">HTML</label><textarea class="tv-textarea code" data-e="html" spellcheck="false">${esc(e.html)}</textarea></div>
              <div class="grid grid-2">
                <div class="input-group"><label class="input-label">CSS</label><textarea class="tv-textarea code" data-e="css" spellcheck="false">${esc(e.css)}</textarea></div>
                <div class="input-group"><label class="input-label">JS</label><textarea class="tv-textarea code" data-e="js" spellcheck="false">${esc(e.js)}</textarea></div>
              </div></div>`;
          p.querySelectorAll('[data-e]').forEach(el => el.oninput = () => { e[el.dataset.e] = el.value; changer(); });
          p.querySelector('[data-ecache]').onchange = ev => { e.cache = ev.target.checked; changer(); };
          p.querySelector('[data-erole]').onchange = ev => { e.role = ev.target.checked ? 'connexion' : ''; changer(); };
          // Tabulation = deux espaces dans les zones de code
          p.querySelectorAll('textarea.code').forEach(t => t.onkeydown = ev => {
            if (ev.key !== 'Tab') return;
            ev.preventDefault();
            t.setRangeText('  ', t.selectionStart, t.selectionEnd, 'end');
            t.dispatchEvent(new Event('input'));
          });
          p.querySelector('[data-delecran]').onclick = () => { b.ecrans.splice(i, 1); dessinerCorps(); changer(); };
          box.appendChild(p);
        });
        body.querySelector('#beAddEcran').onclick = () => {
          b.ecrans.push({ id: 'ecran-' + (b.ecrans.length + 1), titre: b.nom || 'Écran', icone: '', html: '<div class="carte"></div>', css: '', js: '' });
          dessinerCorps(); changer();
        };
      }
      if (onglet === 'donnees') {
        body.innerHTML = `<p class="muted" style="margin-top:0">Si le bloc déclare des tables ou des fonctions serveur, le backend de l’app est généré automatiquement (colonnes <code>id</code> et <code>cree_le</code> ajoutées d’office). Sinon, aucun backend n’est créé.</p>
          <h3 style="font-size:14px;margin:12px 0 8px">Tables</h3><div class="stack" id="beTables"></div>
          <button class="btn btn-outline btn-sm" id="beAddTable" style="margin-top:8px"><span class="mdi mdi-plus"></span>Ajouter une table</button>
          <h3 style="font-size:14px;margin:20px 0 8px">Fonctions serveur</h3><div class="stack" id="beFonctions"></div>
          <button class="btn btn-outline btn-sm" id="beAddFn" style="margin-top:8px"><span class="mdi mdi-plus"></span>Ajouter une fonction</button>`;
        const types = {};
        AB.blocs.TYPES_COLONNE.forEach(t => { types[t] = t; });
        b.tables.forEach((t, i) => {
          const p = document.createElement('div');
          p.className = 'panel';
          p.innerHTML = `<div class="panel-head"><input class="tv-input mono" data-tn value="${esc(t.nom)}" placeholder="nom_de_table" style="max-width:200px">
            <select class="tv-select" data-acces style="max-width:420px">${Object.entries(AB.blocs.ACCES_TABLE).map(([k, l]) => `<option value="${k}" ${k === t.acces ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><div class="spacer"></div>
            <button class="btn btn-danger-text btn-sm" data-deltable><span class="mdi mdi-delete-outline"></span>Supprimer</button></div><div class="panel-body flush"></div>`;
          p.querySelector('[data-tn]').oninput = e => { t.nom = e.target.value; changer(); };
          p.querySelector('[data-acces]').onchange = e => { t.acces = e.target.value; changer(); };
          p.querySelector('[data-deltable]').onclick = () => { b.tables.splice(i, 1); dessinerCorps(); changer(); };
          p.querySelector('.panel-body').appendChild(lignes(t._cols, [{ k: 'nom', label: 'Colonne', type: 'mono' }, { k: 'type', label: 'Type', type: 'select', options: types }, { k: 'contrainte', label: 'Contrainte SQL', type: 'mono', placeholder: 'unique not null' }], changer));
          body.querySelector('#beTables').appendChild(p);
        });
        b.serveur.forEach((f, i) => {
          const p = document.createElement('div');
          p.className = 'panel';
          p.innerHTML = `<div class="panel-head"><input class="tv-input mono" data-fn="nom" value="${esc(f.nom)}" placeholder="nom-de-fonction" style="max-width:240px">
            <select class="tv-select" data-fn="methode" style="max-width:110px">${['POST', 'GET'].map(m => `<option ${m === f.methode ? 'selected' : ''}>${m}</option>`).join('')}</select>
            <label class="check small"><input type="checkbox" data-fnpublic ${f.public ? 'checked' : ''}> Appelée sans session (webhook)</label><div class="spacer"></div>
            <button class="btn btn-danger-text btn-sm" data-delfn><span class="mdi mdi-delete-outline"></span>Supprimer</button></div>
            <div class="panel-body"><textarea class="tv-textarea code" data-fn="code" spellcheck="false" placeholder="Code de la fonction (TypeScript, format Supabase Edge Functions). __INSTANCES__ = liste des instances du bloc dans l’app, avec leurs réglages.">${esc(f.code || '')}</textarea></div>`;
          p.querySelectorAll('[data-fn]').forEach(el => el.oninput = el.onchange = () => { f[el.dataset.fn] = el.value; changer(); });
          p.querySelector('[data-fnpublic]').onchange = e => { f.public = e.target.checked; changer(); };
          p.querySelector('[data-delfn]').onclick = () => { b.serveur.splice(i, 1); dessinerCorps(); changer(); };
          body.querySelector('#beFonctions').appendChild(p);
        });
        body.querySelector('#beAddTable').onclick = () => { b.tables.push({ nom: '', acces: 'serveur', _cols: [{ nom: '', type: 'texte', contrainte: '' }] }); dessinerCorps(); changer(); };
        body.querySelector('#beAddFn').onclick = () => {
          b.serveur.push({ nom: 'ma-fonction', methode: 'POST', code: `Deno.serve(async (req) => {\n  // const cle = Deno.env.get('MA_CLE_SECRETE');\n  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });\n});` });
          dessinerCorps(); changer();
        };
      }
      if (onglet === 'env') {
        body.innerHTML = `<div class="bar warn" style="margin-bottom:12px"><span class="mdi mdi-shield-lock-outline"></span><div>On déclare ici le NOM et le rôle des variables. Les secrets n’ont jamais de valeur dans un bloc : ils se renseignent sur le serveur.</div></div>`;
        body.appendChild(lignes(b.env, [
          { k: 'cle', label: 'Variable', type: 'mono', placeholder: 'STRIPE_SECRET_KEY' }, { k: 'role', label: 'Rôle' },
          { k: 'defaut', label: 'Valeur par défaut (public seulement)' }, { k: 'secret', label: 'Secret', type: 'check', width: '70px' },
          { k: 'serveur', label: 'Utile au serveur', type: 'check', width: '90px' }
        ], () => { b.env.forEach(v => { v.cle = String(v.cle || '').toUpperCase(); if (v.secret) v.defaut = ''; }); changer(); }));
      }
      if (onglet === 'journal') {
        const autres = nouveau ? [] : AB.blocs.versions(b.id);
        body.innerHTML = `<div class="stack">
          <div class="table-wrap"><table class="tv-table"><thead><tr><th>Version</th><th>Date</th><th>Changement</th></tr></thead><tbody>
          ${b.journal.slice().reverse().map(j => `<tr><td>v${esc(j.version)}</td><td class="muted">${esc(j.date)}</td><td>${esc(j.texte)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Vide</td></tr>'}</tbody></table></div>
          ${autres.length > 1 ? `<div><b>Toutes les versions :</b> ${autres.map(v => v.version === b.version ? `<span class="chip chip-primary">v${esc(v.version)}</span>` : `<a class="chip" href="#/blocs/${esc(v.id)}/${esc(v.version)}">v${esc(v.version)}</a>`).join(' ')}</div>` : ''}
        </div>`;
      }
    }

    /* ---------- Actions ---------- */
    async function enregistrer(def) {
      try {
        const s = await AB.blocs.enregistrer(Object.assign(def, { origine: def.origine === 'fourni' ? 'fourni-modifie' : (def.origine || 'atelier') }));
        modifie = false;
        U.toast('success', 'Bloc enregistré', `${s.nom} v${s.version}`);
        return s;
      } catch (e) {
        U.toast('error', 'Le bloc n’est pas valide', e.message, 8000);
        return null;
      }
    }

    root.querySelector('#beSave').onclick = async () => {
      const def = propre();
      if (nouveau && AB.blocs.dernier(def.id)) { U.toast('error', 'Identifiant déjà pris', `Un bloc « ${def.id} » existe déjà.`); return; }
      const s = await enregistrer(def);
      if (s && nouveau) AB.app.go(`blocs/${s.id}/${s.version}`);
    };
    if (!nouveau) {
      root.querySelector('#beExp').onclick = () => U.download(`bloc-${b.id}.js`, AB.blocs.versFichier(AB.blocs.normaliser(propre())), 'text/javascript');
      root.querySelector('#beDel').onclick = async () => {
        const msg = usage ? `Attention : ${[...usage].join(', ')} utilise(nt) cette version et afficheront « bloc absent ».` : 'Cette version sera supprimée.';
        if (!(await U.confirm(`Supprimer ${b.nom} v${b.version}`, msg, { danger: true, okLabel: 'Supprimer' }))) return;
        await AB.blocs.supprimer(b.id, b.version);
        modifie = false;
        const reste = AB.blocs.dernier(b.id);
        AB.app.go(reste ? `blocs/${reste.id}/${reste.version}` : 'blocs');
      };
      root.querySelector('#beNewV').onclick = () => {
        const options = ['correctif', 'mineure', 'majeure'].map(n => [n, U.bumpVersion(b.version, n)]);
        U.dialog({
          title: 'Nouvelle version du bloc', size: 'sm',
          body: `<div class="stack"><div class="input-group"><label class="input-label">Type de changement</label><select class="tv-select" id="nvNiv">
              ${options.map(([n, v]) => `<option value="${v}">${v} — ${n === 'correctif' ? 'correctif' : n === 'mineure' ? 'ajout compatible' : 'changement incompatible'}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label">Ce qui change</label><input class="tv-input" id="nvTxt"></div>
            <p class="small muted" style="margin:0">Les apps restent sur leur version ; le composeur leur propose la mise à jour.</p></div>`,
          actions: [{ label: 'Annuler' }, { label: 'Créer la version', cls: 'btn-primary', onClick: async ({ body }) => {
            const v = body.querySelector('#nvNiv').value;
            if (AB.blocs.get(b.id, v)) { U.toast('error', 'Version existante', `La v${v} existe déjà.`); return false; }
            const def = propre();
            def.version = v;
            def.journal.push({ version: v, date: new Date().toISOString().slice(0, 10), texte: body.querySelector('#nvTxt').value.trim() || 'Nouvelle version' });
            const s = await enregistrer(def);
            if (!s) return false;
            AB.app.go(`blocs/${s.id}/${s.version}`);
          } }]
        });
      };
    }

    const avantDepart = e => { if (modifie) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', avantDepart);

    dessinerOnglets();
    dessinerCorps();
    changer();
    modifie = false;
    return {
      destroy() {
        window.removeEventListener('beforeunload', avantDepart);
        clearTimeout(timer);
        if (modifie) U.toast('warning', 'Modifications non enregistrées', `${b.nom || 'Le bloc'} n’a pas été enregistré.`, 6000);
      }
    };
  };
})();
