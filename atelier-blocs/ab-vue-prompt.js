/* ==========================================================================
   ab-vue-prompt.js — générateur de prompt : on coche autant de kits qu'on
   veut, on décrit le projet (ou on part d'une app), et on obtient un prompt
   unique qui intègre tous les kits, à copier ou télécharger (.md).
   #/prompt              sélection libre (la dernière est mémorisée)
   #/prompt/app/<id>     part des kits et des blocs d'une app
   Pour une nouvelle app, le panneau « Nom et logo » propose des noms et des logos (section « Identité »
   du prompt, icônes dans identite/ du pack).
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  AB.vues.prompt = async function (root, [appId]) {
    AB.app.setCrumbs(['Créer une app', 'Prompt et pack']);
    const apps = await AB.apps.lister();
    const memo = await AB.db.getMeta('prompt_etat', null);
    const e = Object.assign({ choix: {}, blocs: {}, appId: '', nom: '', description: '', valeurs: {}, checklist: true, annexes: true, fin: AB.prompt.FIN, filtre: '', filtreBlocs: '',
      livraison: true, joindrePack: true, joindreCode: true, identite: {} }, memo || {});
    // Fichiers de chaque kit (noms seulement), pour annoncer le contenu du pack dans le prompt
    const cheminsKits = {};
    (await AB.db.list('fichiers')).forEach(f => { if (f.proprio.startsWith('kit:')) (cheminsKits[f.proprio] = cheminsKits[f.proprio] || []).push(f.chemin); });
    if (!memo) AB.kits.parDefaut().forEach(r => { e.choix[r.kit] = r.version; });
    if (appId) {
      const app = apps.find(a => a.id === appId);
      if (app) {
        e.appId = app.id; e.nom = app.nom; e.description = app.description || '';
        if ((app.kits || []).length) { e.choix = {}; app.kits.forEach(r => { e.choix[r.kit] = r.version; }); }
      }
    }

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Créer une app</div><h2 class="section-title">Prompt et pack pour Claude</h2>
        <p class="section-desc">Décris l’app, coche les kits et les blocs : tu obtiens le prompt à coller dans Claude et le pack ZIP à joindre (kits avec leurs documents, blocs, schéma des bases, code actuel si l’app existe). Claude te livre l’app en ZIP : importe-le dans Mes apps.</p></div>
        <div class="row"><a class="btn btn-outline" href="#/kits"><span class="mdi mdi-package-variant-closed"></span>Gérer les kits</a>
          <a class="btn btn-outline" href="#/blocs"><span class="mdi mdi-puzzle-outline"></span>Gérer les blocs</a></div></div>
      <div class="prompt-grid">
        <div class="stack">
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-briefcase-outline"></span>Projet</span></div>
            <div class="panel-body stack">
              <div class="input-group"><label class="input-label">Partir d’une app</label>
                <select class="tv-select" id="prApp"><option value="">Aucune (nouvelle app)</option>${apps.map(a => `<option value="${esc(a.id)}" ${a.id === e.appId ? 'selected' : ''}>${esc(a.nom)}${a.code && a.code.courante ? ` (code v${a.code.courante})` : ''}</option>`).join('')}</select>
                <div class="input-hint">Pour faire évoluer une app : reprend ses kits, ses blocs, ses bases, ses variables et son code actuel.</div></div>
              <div class="input-group"><label class="input-label">Nom de l’app</label><input class="tv-input" id="prNom" value="${esc(e.nom)}"></div>
              <div class="input-group"><label class="input-label">Besoin</label><textarea class="tv-textarea" id="prDesc" placeholder="Utilisateurs, objets gérés, parcours principaux…">${esc(e.description)}</textarea></div>
              <div id="prTrous" class="stack"></div>
            </div></div>
          <div id="prIdentite"></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-package-variant-closed"></span>Kits à intégrer</span><div class="spacer"></div><span class="chip chip-primary" id="prNb"></span></div>
            <div class="panel-body stack" style="padding-bottom:4px">
              <input class="tv-input" id="prFiltre" placeholder="Filtrer : nom, étiquette, description…" value="${esc(e.filtre)}">
              <div class="row"><button class="btn btn-ghost btn-xs" id="prTous">Tout cocher</button><button class="btn btn-ghost btn-xs" id="prAucun">Tout décocher</button><button class="btn btn-ghost btn-xs" id="prDefaut">Kits par défaut</button></div>
            </div>
            <div class="panel-body flush" id="prKits"></div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-puzzle-outline"></span>Blocs à reprendre</span><div class="spacer"></div><span class="chip chip-primary" id="prNbBlocs"></span></div>
            <div class="panel-body stack" style="padding-bottom:4px"><input class="tv-input" id="prFiltreBlocs" placeholder="Filtrer : nom, catégorie…" value="${esc(e.filtreBlocs)}"></div>
            <div class="panel-body flush" id="prBlocs" style="max-height:360px;overflow:auto"></div></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-tune-variant"></span>Options</span></div>
            <div class="panel-body stack">
              <label class="check"><input type="checkbox" id="prPack" ${e.joindrePack ? 'checked' : ''}> Je joins le pack ZIP (le prompt annonce son contenu)</label>
              <label class="check" id="prCodeL"><input type="checkbox" id="prCode" ${e.joindreCode ? 'checked' : ''}> Joindre le code actuel de l’app dans le pack</label>
              <label class="check"><input type="checkbox" id="prLivr" ${e.livraison ? 'checked' : ''}> Demander l’app en ZIP prêt à importer dans l’Atelier (atelier-app.json)</label>
              <label class="check"><input type="checkbox" id="prCheck" ${e.checklist ? 'checked' : ''}> Checklist finale (toutes les règles à cocher)</label>
              <label class="check"><input type="checkbox" id="prAnnexes" ${e.annexes ? 'checked' : ''}> Références des kits en annexe</label>
              <div class="input-group"><label class="input-label">Consigne de fin</label><textarea class="tv-textarea" id="prFin" style="min-height:60px">${esc(e.fin)}</textarea></div>
            </div></div>
        </div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-text-box-outline"></span>Prompt</span><div class="spacer"></div>
            <span class="small muted" id="prStats"></span>
            <button class="btn btn-outline btn-sm" id="prDl"><span class="mdi mdi-download"></span>.md</button>
            <button class="btn btn-outline btn-sm" id="prCopier"><span class="mdi mdi-content-copy"></span>Copier</button>
            <button class="btn btn-primary btn-sm" id="prZip" title="PROMPT.md + kits (règles et documents) + blocs + bases + code actuel"><span class="mdi mdi-folder-zip-outline"></span>Pack pour Claude (.zip)</button></div>
          <div class="panel-body"><div id="prAlertes"></div><textarea class="tv-textarea code prompt-sortie" id="prSortie" readonly spellcheck="false"></textarea></div></div>
      </div></div>`;
    const $ = s => root.querySelector(s);
    let timer = null;
    const memoriser = () => { timer = null; AB.db.setMeta('prompt_etat', e); };

    const appChoisie = () => apps.find(a => a.id === e.appId) || null;
    /** Kits cochés, rangés par type : charte, sécurité, affichage, libres. */
    const ordreType = k => Object.keys(AB.kits.TYPES).indexOf(k.type);
    const kitsTries = () => AB.kits.derniers().sort((a, b) => ordreType(a) - ordreType(b));
    const imposer = () => AB.kits.obligatoires().forEach(k => { if (!e.choix[k.id]) e.choix[k.id] = k.version; });
    const kitsChoisis = () => kitsTries().filter(k => e.choix[k.id]).map(k => AB.kits.get(k.id, e.choix[k.id]) || k);
    const blocsChoisis = () => AB.blocs.derniers().filter(b => e.blocs[b.id]).map(b => AB.blocs.get(b.id, e.blocs[b.id]) || b);
    const options = () => ({
      kits: kitsChoisis(), blocs: blocsChoisis(), nom: e.nom, description: e.description, app: appChoisie(), valeurs: e.valeurs,
      checklist: e.checklist, annexes: e.annexes, fin: e.fin, livraison: e.livraison, joindreCode: e.joindreCode,
      identite: e.appId ? null : e.identite   // nom et logo : pour une nouvelle app seulement
    });

    function dessinerBlocs() {
      const f = e.filtreBlocs.trim().toLowerCase();
      const blocs = AB.blocs.derniers().filter(b => !f || [b.nom, b.id, b.categorie, b.description].join(' ').toLowerCase().includes(f) || e.blocs[b.id]);
      $('#prBlocs').innerHTML = blocs.map(b => `<label class="kit-choix"><input type="checkbox" data-bloc="${esc(b.id)}" ${e.blocs[b.id] ? 'checked' : ''}>
          <div style="flex:1;min-width:0"><div><span class="mdi ${esc(b.icone)}"></span> <b>${esc(b.nom)}</b> <span class="chip">${esc(b.categorie)}</span></div>
            <div class="small muted">${esc(b.description || '')}</div></div><span class="small muted">v${esc(b.version)}</span></label>`).join('') || '<div class="empty" style="padding:16px">Aucun bloc ne correspond.</div>';
      root.querySelectorAll('[data-bloc]').forEach(c => c.onchange = () => {
        if (c.checked) e.blocs[c.dataset.bloc] = AB.blocs.dernier(c.dataset.bloc).version; else delete e.blocs[c.dataset.bloc];
        generer(false);
      });
    }

    function dessinerKits() {
      const f = e.filtre.trim().toLowerCase();
      const kits = kitsTries().filter(k => !f || [k.nom, k.id, k.description, ...k.etiquettes].join(' ').toLowerCase().includes(f) || e.choix[k.id]);
      $('#prKits').innerHTML = kits.map(k => {
        const T = AB.kits.TYPES[k.type] || AB.kits.TYPES.libre;
        const versions = AB.kits.versions(k.id);
        const v = e.choix[k.id];
        return `<label class="kit-choix"><input type="checkbox" data-kit="${esc(k.id)}" ${v ? 'checked' : ''} ${k.obligatoire ? 'disabled title="Kit obligatoire"' : ''}>
          <div style="flex:1;min-width:0"><div><span class="mdi ${T.icone}"></span> <b>${esc(k.nom)}</b> ${k.obligatoire ? '<span class="chip chip-danger"><span class="mdi mdi-lock"></span>Obligatoire</span>' : ''} ${k.etiquettes.map(t => `<span class="chip">${esc(t)}</span>`).join(' ')}</div>
            <div class="small muted">${esc(T.label)} · ${k.regles.length} règle(s)${k.reference ? ' · référence' : ''}${(cheminsKits[AB.kits.proprio(k)] || []).length ? ` · ${cheminsKits[AB.kits.proprio(k)].length} fichier(s)` : ''}${k.description ? ' · ' + esc(k.description) : ''}</div></div>
          ${v && versions.length > 1 ? `<select class="tv-select" data-ver="${esc(k.id)}" style="width:auto">${versions.map(x => `<option ${x.version === v ? 'selected' : ''}>${esc(x.version)}</option>`).join('')}</select>` : `<span class="small muted">v${esc(v || k.version)}</span>`}
        </label>`;
      }).join('') || '<div class="empty" style="padding:16px">Aucun kit ne correspond.</div>';
      root.querySelectorAll('[data-kit]').forEach(c => c.onchange = () => {
        if (c.checked) e.choix[c.dataset.kit] = AB.kits.dernier(c.dataset.kit).version; else delete e.choix[c.dataset.kit];
        dessinerKits(); generer();
      });
      root.querySelectorAll('[data-ver]').forEach(s => { s.onchange = () => { e.choix[s.dataset.ver] = s.value; generer(); }; });
    }

    function dessinerTrous() {
      const trous = AB.prompt.trous(kitsChoisis());
      const box = $('#prTrous');
      box.innerHTML = trous.length ? `<div class="input-label">Champs demandés par les kits</div>` + trous.map(t =>
        `<div class="input-group"><label class="small muted">${esc(t)}</label><input class="tv-input" data-trou="${esc(t)}" value="${esc(e.valeurs[t] || '')}"></div>`).join('') : '';
      box.querySelectorAll('[data-trou]').forEach(i => i.oninput = () => { e.valeurs[i.dataset.trou] = i.value; generer(false); });
    }

    function generer(trous = true) {
      imposer();
      const opts = options(), kits = opts.kits;
      if (trous) dessinerTrous();
      if (e.joindrePack) opts.pack = AB.prompt.metaPack(opts, cheminsKits);
      const texte = AB.prompt.generer(opts);
      $('#prSortie').value = texte;
      $('#prNb').textContent = `${kits.length} choisi(s)`;
      $('#prNbBlocs').textContent = `${opts.blocs.length} choisi(s)`;
      const app = appChoisie();
      $('#prCodeL').hidden = !(app && AB.code.courante(app));
      $('#prIdentite').hidden = !!app;
      $('#prStats').textContent = `${kits.reduce((n, k) => n + k.regles.length, 0)} règle(s) · ${texte.length.toLocaleString('fr-FR')} caractères`;
      // Deux kits du même type « unique » : les deux sont intégrés, on le signale
      const doublons = Object.entries(AB.kits.TYPES).filter(([t, T]) => T.unique && kits.filter(k => k.type === t).length > 1).map(([, T]) => T.label);
      const restants = (texte.match(/⟦[^⟧]+⟧/g) || []).length;
      $('#prAlertes').innerHTML = (doublons.length ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div>Plusieurs kits du même type : ${esc(doublons.join(', '))}. Tous sont intégrés ; le prompt demande de signaler les contradictions.</div></div>` : '')
        + (restants ? `<div class="bar info"><span class="mdi mdi-form-textbox"></span><div>${restants} champ(s) ⟦…⟧ restent à remplir dans le prompt.</div></div>` : '');
      clearTimeout(timer);
      timer = setTimeout(memoriser, 400);
    }

    $('#prApp').onchange = ev => {
      e.appId = ev.target.value;
      const app = appChoisie();
      if (app) {
        e.nom = app.nom; e.description = app.description || '';
        if ((app.kits || []).length) { e.choix = {}; app.kits.forEach(r => { e.choix[r.kit] = r.version; }); }
        $('#prNom').value = e.nom; $('#prDesc').value = e.description;
      }
      dessinerKits(); generer();
    };
    let minuteur = null;
    const suivreIdentite = () => { clearTimeout(minuteur); minuteur = setTimeout(() => panneau.rafraichir(), 700); };
    $('#prNom').oninput = ev => { e.nom = ev.target.value; generer(false); suivreIdentite(); };
    $('#prDesc').oninput = ev => { e.description = ev.target.value; generer(false); suivreIdentite(); };
    $('#prDesc').onchange = () => { if (!e.appId && (!e.identite.propositions || e.identite.propositions.source !== 'claude')) panneau.demanderClaude(true); };
    const panneau = AB.identite.panneau($('#prIdentite'), {
      identite: e.identite,
      contexte: () => ({ nom: e.nom, accroche: e.identite.accroche || '', description: e.description }),
      choisirNom: nom => { e.nom = nom; $('#prNom').value = nom; generer(false); },
      changer: () => generer(false)
    });
    $('#prFiltre').oninput = ev => { e.filtre = ev.target.value; dessinerKits(); };
    $('#prTous').onclick = () => { AB.kits.derniers().forEach(k => { if (!e.choix[k.id]) e.choix[k.id] = k.version; }); dessinerKits(); generer(); };
    $('#prAucun').onclick = () => { e.choix = {}; dessinerKits(); generer(); };
    $('#prDefaut').onclick = () => { e.choix = {}; AB.kits.parDefaut().forEach(r => { e.choix[r.kit] = r.version; }); dessinerKits(); generer(); };
    $('#prCheck').onchange = ev => { e.checklist = ev.target.checked; generer(false); };
    $('#prPack').onchange = ev => { e.joindrePack = ev.target.checked; generer(false); };
    $('#prCode').onchange = ev => { e.joindreCode = ev.target.checked; generer(false); };
    $('#prLivr').onchange = ev => { e.livraison = ev.target.checked; generer(false); };
    $('#prFiltreBlocs').oninput = ev => { e.filtreBlocs = ev.target.value; dessinerBlocs(); };
    $('#prZip').onclick = async () => {
      const b = $('#prZip');
      b.disabled = true;
      try {
        const p = await AB.prompt.pack(options());
        U.download(p.nom, p.blob);
        if (!e.joindrePack) { e.joindrePack = true; $('#prPack').checked = true; generer(false); }
        U.toast('success', 'Pack prêt', `${p.nom} : colle le prompt dans Claude et joins ce ZIP.`, 6000);
      } catch (err) { U.toast('error', 'Pack impossible', err.message, 8000); }
      b.disabled = false;
    };
    $('#prAnnexes').onchange = ev => { e.annexes = ev.target.checked; generer(false); };
    $('#prFin').oninput = ev => { e.fin = ev.target.value; generer(false); };
    $('#prCopier').onclick = async () => {
      try { await navigator.clipboard.writeText($('#prSortie').value); U.toast('success', 'Prompt copié', 'Colle-le au début de ta conversation avec Claude.'); }
      catch { $('#prSortie').select(); U.toast('info', 'Copie manuelle', 'Le texte est sélectionné : Ctrl+C (ou Cmd+C).'); }
    };
    $('#prDl').onclick = () => U.download(`prompt-${U.slug(e.nom) || 'app'}.md`, $('#prSortie').value, 'text/markdown;charset=utf-8');

    dessinerKits();
    dessinerBlocs();
    generer();
    return { destroy() { clearTimeout(minuteur); if (timer) { clearTimeout(timer); memoriser(); } } };
  };
})();
