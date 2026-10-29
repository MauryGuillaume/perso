/* ==========================================================================
   ab-vue-design.js — écran « Studio design »
   #/design   personnage évolutif, skins (fournis et créés), compagnons,
              compagnons illustrés par IA, mouvements animés, export du pack
              d'images (Livora ou générique)
   App dont le code importé contient ses avatars (src/avatar/reperes.json, comme
   Livora) : onglet « Avatars de l'app », lus dans ce code (ab-avatars-app.js) :
   personnage assemblé, tenues, évolution, compagnons, objets. Importer une
   nouvelle version de l'app suffit pour les voir à jour. Les onglets SVG restent
   (ancien style). La bibliothèque commune montre ceux de Livora.
   Les skins créés ici sont rangés dans la bibliothèque commune (meta
   « design-skins ») : ils servent à toutes les apps.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc, D = AB.design, DI = AB.designIA;
  AB.vues = AB.vues || {};

  const img = (svg, taille, alt) => `<img src="${D.url(svg)}" width="${taille}" height="${taille}" alt="${esc(alt || '')}" loading="lazy" style="display:block">`;
  const RANG = { commun: 1, peu_commun: 5, rare: 10, epique: 15, legendaire: 25 };   // niveau de déblocage conseillé
  const AV = AB.avatarsApp;
  const estLivora = app => app.id === 'existante-livora' || /livora/i.test(app.nom || '');
  const RARETES_AV = { commun: ['Commun', '#6b7280'], peu_commun: ['Peu commun', '#2e7d32'], rare: ['Rare', '#2b6cb0'], epique: ['Épique', '#7c3aed'], legendaire: ['Légendaire', '#b7791f'] };

  /** Où sont rangés les skins créés et les réglages du studio : dans l'app (panneau de l'app)
      ou dans la bibliothèque commune (meta « design-skins » / « design-reglages »). */
  async function stockage(app) {
    if (!app) return {
      skins: () => AB.db.getMeta('design-skins', []), setSkins: v => AB.db.setMeta('design-skins', v),
      reglages: () => AB.db.getMeta('design-reglages', {}), setReglages: v => AB.db.setMeta('design-reglages', v)
    };
    if (!app.design) {
      // Livora reprend ce qui a été créé dans le studio commun (il a été fait pour elle)
      app.design = app.id === 'existante-livora'
        ? { skins: await AB.db.getMeta('design-skins', []), reglages: await AB.db.getMeta('design-reglages', {}) }
        : { skins: [], reglages: {} };
      await AB.apps.enregistrer(app);
    }
    return {
      skins: async () => app.design.skins || [], setSkins: async v => { app.design.skins = v; await AB.apps.enregistrer(app); },
      reglages: async () => app.design.reglages || {}, setReglages: async v => { app.design.reglages = v; await AB.apps.enregistrer(app); }
    };
  }

  /** Panneau « Studio design » dans l'espace d'une app (bloc Coach avatar, ou branché sur une app existante). */
  AB.panneaux = AB.panneaux || {};
  AB.panneaux.design = { nom: 'Studio design', icone: 'mdi-palette-swatch-outline', vue: (racine, app) => AB.vues.design(racine, { app }) };

  /** opts.app : studio propre à cette app, affiché dans son espace. Sans app : bibliothèque commune (#/design). */
  AB.vues.design = async function (root, opts) {
    const app = (opts && opts.app) || null;
    if (!app) AB.app.setCrumbs(['Studio design']);
    const S = await stockage(app);
    /** Tous les skins : ceux de Livora puis ceux créés dans ce studio. */
    const skins = async () => D.SKINS_LIVORA.map(s => Object.assign({ fourni: true }, s)).concat(await S.skins());
    let liste = await skins();
    const etat = Object.assign({ niveau: 12, peau: 'doree', cheveux: 'brun', tenue: { vetement: 't_shirt_gris', chaussures: 'baskets_blanches', coiffure: 'bandeau_simple' }, onglet: 'perso', compagnon: 'dragon' },
      await S.reglages());
    const sauver = () => S.setReglages(etat);
    DI.portee = app ? app.id : '';
    await DI.chargerRendu();
    let iaImages = await DI.toutes();   // illustrations IA validées, par espèce et palier
    const skin = cle => liste.find(s => s.cle === cle);
    const tenue = () => Object.fromEntries(Object.entries(etat.tenue).map(([e, c]) => [e, skin(c)]).filter(([, s]) => s));
    const options = () => ({ niveau: etat.niveau, peau: D.PEAUX[etat.peau], cheveux: D.CHEVEUX[etat.cheveux], tenue: tenue() });

    const apps = app ? [] : (await AB.db.list('apps')).filter(a => AB.blocs.panneauxDe(a).includes('design'));
    root.innerHTML = app ? `<div class="stack">
      <div class="row"><div><b>Studio design de ${esc(app.nom)}</b><div class="small muted">Personnages, skins, compagnons et images IA propres à cette app.${app.origine === 'plateforme' ? ' Les skins créés ici apparaissent dans la garde-robe de l’app.' : ' Le pack d’images se range dans le code de l’app.'}</div></div><div class="spacer"></div>
        <button class="btn btn-primary" id="dsLivora"><span class="mdi mdi-folder-zip-outline"></span>Pack d’images</button></div>
      <div class="panel"><div class="tabs" id="dsTabs" style="padding:0 8px"></div><div class="panel-body" id="dsCorps"></div></div></div>` : `<div class="page">
      ${apps.length ? `<div class="bar ok"><span class="mdi mdi-information-outline"></span><div>Chaque app qui a le bloc Studio design a son propre studio, dans son espace : ${apps.map(a => `<a href="#/apps/${esc(a.id)}">${esc(a.nom)}</a>`).join(', ')}. Ici, c’est la bibliothèque commune, point de départ de toutes les apps.</div></div>` : ''}
      <div class="page-head"><div><div class="section-tag">Design</div><h2 class="section-title">Studio design</h2>
        <p class="section-desc">Personnages qui évoluent avec le niveau, skins à équiper, compagnons évolutifs et mouvements d’exercices animés, dans le style de Livora (contour encre, vermillon, or). Tout est dessiné en SVG : net à toutes les tailles, léger, animé.</p></div>
        <div class="row"><button class="btn btn-primary" id="dsLivora"><span class="mdi mdi-folder-zip-outline"></span>Pack d’images pour Livora</button></div></div>
      <div class="panel"><div class="tabs" id="dsTabs" style="padding:0 8px"></div><div class="panel-body" id="dsCorps"></div></div></div>`;
    const $ = s => root.querySelector(s);
    // Avatars lus dans le code de l'app (ou, dans la bibliothèque commune, dans celui de Livora)
    const appAv = app || (await AB.db.list('apps')).find(a => estLivora(a) && AB.code.courante(a)) || null;
    const pack = appAv ? await AV.pack(appAv) : null;
    const gemini = !!pack || (app ? estLivora(app) : false);
    const ONGLETS = (gemini ? [['gemini', 'Avatars de l’app', 'mdi-account-star']] : []).concat([['perso', gemini ? 'Personnage SVG (ancien)' : 'Personnage', 'mdi-account-star-outline'], ['skins', gemini ? 'Skins SVG' : 'Skins', 'mdi-tshirt-crew-outline'], ['compagnons', gemini ? 'Compagnons SVG' : 'Compagnons', 'mdi-paw'], ['ia', 'Compagnons IA', 'mdi-creation'], ['persoIA', 'Personnage IA', 'mdi-account-edit-outline'], ['mouvements', 'Mouvements', 'mdi-run-fast'], ['export', 'Export', 'mdi-download']]);
    // Livora : le pack Gemini s'ouvre en premier (une fois ; ensuite le dernier onglet choisi)
    if (pack && !etat.geminiVu) { etat.onglet = 'gemini'; etat.geminiVu = true; sauver(); }
    if (!ONGLETS.some(o => o[0] === etat.onglet)) etat.onglet = 'perso';
    function onglets() {
      $('#dsTabs').innerHTML = ONGLETS.map(([k, l, i]) => `<button class="tab ${k === etat.onglet ? 'active' : ''}" data-tab="${k}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { etat.onglet = t.dataset.tab; sauver(); onglets(); corps(); });
    }
    function corps() { ({ gemini: vueGemini, perso, skins: vueSkins, compagnons, ia: vueIA, persoIA: vuePersoIA, mouvements, export: vueExport })[etat.onglet]($('#dsCorps')); }

    /* ---------- Avatars de l'app (lus dans son code) ---------- */
    function vueGemini(c) {
      if (!pack) {
        c.innerHTML = `<div class="bar warn"><span class="mdi mdi-information-outline"></span><div><b>Les avatars de ${esc((appAv || app || {}).nom || 'l’app')} ne sont pas dans son code importé.</b>
          Le Studio les lit dans le code de l’app (onglet « Code et versions », version courante) : il cherche <span class="mono">src/avatar/reperes.json</span> et les images de <span class="mono">src/assets/personnage/</span>.
          Importe la version de l’app qui les contient (Livora v3 ou plus), puis reviens ici.</div></div>`;
        return;
      }
      const R = pack.reperes;
      const ap = etat.apparence = Object.assign({}, AV.DEFAUT, etat.apparence || {});
      const niv = etat.niveauApp = etat.niveauApp || 12;
      const stade = AV.stadeDuNiveau(pack, niv, ap.genre);
      const nbStades = (R.corps[ap.genre] || []).length;
      const opts = (obj, val, libelle) => Object.keys(obj).map(k => `<option value="${esc(k)}" ${k === val ? 'selected' : ''}>${esc(libelle ? libelle(k) : k)}</option>`).join('');
      const coiffures = (R.cheveux || []).filter(h => h.genre === ap.genre);
      const yeux = (R.yeux || []).filter(y => !y.genre || y.genre === ap.genre);
      const portees = AV.tenuesPortees(pack, ap).map(t => t.cle);
      const tenues = (R.tenues || []).filter(t => t.genre === ap.genre);
      const vignette = t => { const l = t.stades[Math.min(3, nbStades)] || Object.values(t.stades)[0] || []; return l[0] ? pack.url(l[0].fichier) : ''; };
      const rar = r => RARETES_AV[r] || ['', 'inherit'];
      const parEmp = {};
      pack.objets.forEach(o => (parEmp[o.emplacement] = parEmp[o.emplacement] || []).push(o));
      c.innerHTML = `<div class="stack">
        <div class="small muted">Lus dans le code de ${esc(appAv.nom)} v${pack.version} (<span class="mono">${esc(pack.chemin)}</span>) : ${coiffures.length} coiffures pour ce genre, ${(R.tenues || []).length} tenues portées, ${Object.keys(pack.compagnons).length} compagnons, ${pack.objets.length} objets. Nouvelle version de l’app importée = avatars à jour ici.</div>
        <div class="ds-grid">
          <div class="ds-scene av-scene"><div id="avPerso" class="av-boite"><span class="mdi mdi-loading mdi-spin"></span></div>
            <div class="input-group" style="width:100%"><label class="input-label">Niveau du joueur : <b id="avNivTxt">${niv}</b> · stade ${stade} sur ${nbStades}</label><input type="range" min="1" max="40" value="${niv}" id="avNiv" style="width:100%"></div></div>
          <div class="stack">
            <div class="grid grid-2">
              <div class="input-group"><label class="input-label">Genre</label><select class="tv-select" data-av="genre">${['homme', 'femme'].filter(g => R.corps[g]).map(g => `<option ${g === ap.genre ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
              <div class="input-group"><label class="input-label">Peau</label><select class="tv-select" data-av="peau">${opts(AV.PEAUX, ap.peau)}</select></div>
              <div class="input-group"><label class="input-label">Coiffure</label><select class="tv-select" data-av="coiffure">${coiffures.map(h => `<option value="${esc(h.cle)}" ${h.cle === ap.coiffure ? 'selected' : ''}>${esc(h.nom || h.cle)}</option>`).join('')}</select></div>
              <div class="input-group"><label class="input-label">Couleur des cheveux</label><select class="tv-select" data-av="couleurCheveux">${opts(AV.CHEVEUX, ap.couleurCheveux)}</select></div>
              <div class="input-group"><label class="input-label">Yeux</label><select class="tv-select" data-av="yeux">${yeux.map(y => `<option value="${esc(y.cle)}" ${y.cle === ap.yeux ? 'selected' : ''}>${esc(y.nom || y.cle)}</option>`).join('')}</select></div>
              <div class="input-group"><label class="input-label">Couleur des yeux</label><select class="tv-select" data-av="couleurYeux">${opts(AV.YEUX, ap.couleurYeux)}</select></div>
              <div class="input-group"><label class="input-label">Expression</label><select class="tv-select" data-av="expression">${(R.bouches || []).map(b => `<option ${b.cle === ap.expression ? 'selected' : ''}>${esc(b.cle)}</option>`).join('')}</select></div>
              <div class="input-group"><label class="input-label">Nez</label><select class="tv-select" data-av="nez">${(R.nez || []).map(n => `<option ${n.cle === ap.nez ? 'selected' : ''}>${esc(n.cle)}</option>`).join('')}</select></div>
              ${ap.genre === 'homme' && (R.barbes || []).length ? `<div class="input-group"><label class="input-label">Barbe</label><select class="tv-select" data-av="barbe"><option value="">— Aucune —</option>${(R.barbes || []).map(b => `<option value="${esc(b.cle)}" ${b.cle === ap.barbe ? 'selected' : ''}>${esc(b.nom || b.cle)}</option>`).join('')}</select></div>` : ''}
            </div>
            <div><b>Tenues portées</b> <span class="small muted">(clique pour enfiler ou retirer ; une tenue complète remplace le haut et le bas)</span></div>
            <div class="av-tenues">${tenues.map(t => `<button class="av-tenue ${portees.includes(t.cle) ? 'active' : ''}" data-tenue="${esc(t.cle)}" title="${esc(t.nom)}"><img src="${vignette(t)}" alt="" loading="lazy"><span>${esc(t.nom)}</span><span class="small" style="color:${rar(t.rarete)[1]}">${esc(rar(t.rarete)[0])}</span></button>`).join('') || '<span class="small muted">Aucune tenue pour ce genre.</span>'}</div>
          </div></div>
        <h3 style="margin:18px 0 8px">Évolution du personnage</h3>
        <div class="ds-ligne" id="avEvolution">${(R.corps[ap.genre] || []).map(x => `<figure class="ds-carte ${x.stade === stade ? 'active' : ''}"><div class="av-boite" data-stade="${x.stade}" style="height:190px"></div><figcaption><b>Stade ${x.stade}</b><span class="small muted">Niveau ${[1, 5, 10, 15, 20, 30][x.stade - 1]}+</span></figcaption></figure>`).join('')}</div>
        <h3 style="margin:18px 0 8px">Compagnons</h3>
        ${Object.entries(pack.compagnons).map(([esp, l]) => `<div style="margin-bottom:10px"><b>${esc(pack.especes[esp] || esp)}</b><div class="ds-ligne">${l.map(x => `<figure class="ds-carte"><img src="${x.src}" alt="" loading="lazy" style="width:120px;height:120px;object-fit:contain"><figcaption><span class="small muted">Niveau ${x.niveau}+</span></figcaption></figure>`).join('')}</div></div>`).join('') || '<span class="small muted">Aucune image de compagnon dans le code.</span>'}
        <h3 style="margin:18px 0 8px">Objets à débloquer (${pack.objets.length})</h3>
        ${Object.entries(parEmp).map(([e, l]) => `<div style="margin-bottom:10px"><b>${esc(e)}</b> <span class="small muted">${l.length}</span><div class="av-objets">${l.map(o => `<figure title="${esc(o.nom)}"><img src="${o.src}" alt="" loading="lazy"><figcaption>${esc(o.nom)}${o.rarete ? `<span style="color:${rar(o.rarete)[1]}">${esc(rar(o.rarete)[0])}</span>` : ''}</figcaption></figure>`).join('')}</div></div>`).join('')}
      </div>`;
      const majPerso = () => AV.dessiner(c.querySelector('#avPerso'), pack, etat.apparence, AV.stadeDuNiveau(pack, etat.niveauApp, etat.apparence.genre), 370).catch(e => { c.querySelector('#avPerso').textContent = 'Image illisible : ' + e.message; });
      majPerso();
      c.querySelectorAll('[data-stade]').forEach(el => AV.dessiner(el, pack, ap, +el.dataset.stade, 168).catch(() => {}));
      const changer = () => { sauver(); vueGemini(c); };
      c.querySelector('#avNiv').oninput = e => { c.querySelector('#avNivTxt').textContent = e.target.value; };
      c.querySelector('#avNiv').onchange = e => { etat.niveauApp = +e.target.value; changer(); };
      c.querySelectorAll('[data-av]').forEach(el => el.onchange = () => {
        const k = el.dataset.av;
        ap[k] = el.value || null;
        if (k === 'genre') {   // nouvelle silhouette : coiffure, yeux et tenue de départ de ce genre
          const h = (R.cheveux || []).find(x => x.genre === ap.genre && x.type === 'face') || (R.cheveux || []).find(x => x.genre === ap.genre);
          ap.coiffure = h ? h.cle : ap.coiffure;
          const y = (R.yeux || []).find(x => !x.genre || x.genre === ap.genre); ap.yeux = y ? y.cle : ap.yeux;
          ap.tenues = null; ap.barbe = null;
        }
        changer();
      });
      c.querySelectorAll('[data-tenue]').forEach(b => b.onclick = () => { ap.tenues = AV.basculer(pack, ap, b.dataset.tenue); changer(); });
    }

    /* ---------- Personnage ---------- */
    function perso(c) {
      const stade = D.stadeDuNiveau(etat.niveau);
      c.innerHTML = `<div class="ds-grid">
        <div class="ds-scene">${img(D.avatar(Object.assign(options(), { titre: 'Aperçu' })), 280, 'Personnage')}
          <div class="row" style="justify-content:center"><span class="chip chip-primary">Niveau ${etat.niveau}</span><span class="chip">${esc(D.STADES[stade - 1].nom)}</span></div></div>
        <div class="stack">
          <div class="input-group"><label class="input-label">Niveau du joueur : <b id="dsNivTxt">${etat.niveau}</b></label><input type="range" min="1" max="30" value="${etat.niveau}" id="dsNiv" style="width:100%"></div>
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Peau</label><select class="tv-select" data-k="peau">${Object.keys(D.PEAUX).map(k => `<option ${k === etat.peau ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label">Cheveux</label><select class="tv-select" data-k="cheveux">${Object.keys(D.CHEVEUX).map(k => `<option ${k === etat.cheveux ? 'selected' : ''}>${k}</option>`).join('')}</select></div></div>
          ${Object.entries(D.EMPLACEMENTS).map(([e, l]) => `<div class="input-group"><label class="input-label">${esc(l)}</label><select class="tv-select" data-slot="${e}"><option value="">— Aucun —</option>${liste.filter(s => s.emplacement === e).map(s => `<option value="${esc(s.cle)}" ${etat.tenue[e] === s.cle ? 'selected' : ''}>${esc(s.nom)}${s.fourni ? '' : ' (créé)'}</option>`).join('')}</select></div>`).join('')}
        </div></div>
        <h3 style="margin:20px 0 8px">Évolution du personnage</h3>
        <div class="ds-ligne">${D.STADES.map(s => `<figure class="ds-carte ${s.stade === stade ? 'active' : ''}">${img(D.avatar(Object.assign(options(), { stade: s.stade })), 130, s.nom)}<figcaption><b>${esc(s.nom)}</b><span class="small muted">Niveau ${s.niveau}+ · ${esc(s.texte)}</span></figcaption></figure>`).join('')}</div>`;
      c.querySelector('#dsNiv').oninput = e => { c.querySelector('#dsNivTxt').textContent = e.target.value; };
      c.querySelector('#dsNiv').onchange = e => { etat.niveau = +e.target.value; sauver(); perso(c); };
      c.querySelectorAll('[data-k]').forEach(s => s.onchange = () => { etat[s.dataset.k] = s.value; sauver(); perso(c); });
      c.querySelectorAll('[data-slot]').forEach(s => s.onchange = () => { if (s.value) etat.tenue[s.dataset.slot] = s.value; else delete etat.tenue[s.dataset.slot]; sauver(); perso(c); });
    }

    /* ---------- Skins ---------- */
    function vueSkins(c) {
      c.innerHTML = `<div class="row" style="margin-bottom:12px"><p class="muted" style="margin:0;flex:1">Un skin = un modèle (casquette, sweat, baskets…) + des couleurs + un motif. Il se superpose au personnage à toutes les étapes de son évolution. Les skins créés ici servent à toutes les apps.</p>
        <button class="btn btn-primary" id="dsNouveau"><span class="mdi mdi-plus"></span>Créer un skin</button></div>
        ${Object.entries(D.EMPLACEMENTS).map(([e, l]) => `<h3 style="margin:16px 0 8px">${esc(l)}</h3><div class="ds-ligne">${liste.filter(s => s.emplacement === e).map(s => `<figure class="ds-carte">
          ${img(D.vignette(s), 110, s.nom)}<figcaption><b>${esc(s.nom)}</b><span class="small" style="color:${(D.RARETES[s.rarete] || D.RARETES.commun)[1]}">${esc((D.RARETES[s.rarete] || D.RARETES.commun)[0])}</span>
          <span class="row" style="justify-content:center;gap:2px"><button class="btn btn-ghost btn-icon btn-sm" data-essayer="${esc(s.cle)}" title="Essayer sur le personnage"><span class="mdi mdi-account-check-outline"></span></button>
          <button class="btn btn-ghost btn-icon btn-sm" data-copier="${esc(s.cle)}" title="${s.fourni ? 'Créer une variante' : 'Modifier'}"><span class="mdi ${s.fourni ? 'mdi-content-copy' : 'mdi-pencil-outline'}"></span></button>
          <button class="btn btn-ghost btn-icon btn-sm" data-svg="${esc(s.cle)}" title="Télécharger le calque SVG"><span class="mdi mdi-download"></span></button>
          ${s.fourni ? '' : `<button class="btn btn-ghost btn-icon btn-sm" data-sup="${esc(s.cle)}" title="Supprimer"><span class="mdi mdi-delete-outline"></span></button>`}</span></figcaption></figure>`).join('') || '<span class="small muted">Aucun skin.</span>'}</div>`).join('')}`;
      c.querySelector('#dsNouveau').onclick = () => editer(null);
      c.querySelectorAll('[data-essayer]').forEach(b => b.onclick = () => { const s = skin(b.dataset.essayer); etat.tenue[s.emplacement] = s.cle; etat.onglet = 'perso'; sauver(); onglets(); corps(); });
      c.querySelectorAll('[data-copier]').forEach(b => b.onclick = () => { const s = skin(b.dataset.copier); editer(s.fourni ? Object.assign({}, s, { cle: '', nom: s.nom + ' (variante)', fourni: false }) : s); });
      c.querySelectorAll('[data-svg]').forEach(b => b.onclick = () => { const s = skin(b.dataset.svg); U.download(s.cle + '.svg', D.calque(s), 'image/svg+xml'); });
      c.querySelectorAll('[data-sup]').forEach(b => b.onclick = async () => {
        const s = skin(b.dataset.sup);
        if (!(await U.confirm('Supprimer le skin', `« ${s.nom} » sera retiré de la bibliothèque.`, { danger: true, okLabel: 'Supprimer' }))) return;
        await enregistrerPerso(liste.filter(x => !x.fourni && x !== s));
        vueSkins(c);
      });
    }
    async function enregistrerPerso(perso) {
      await S.setSkins(perso.map(s => { const x = Object.assign({}, s); delete x.fourni; return x; }));
      liste = await skins();
    }

    /** Éditeur d'un skin, avec aperçu en direct sur le personnage. */
    function editer(original) {
      const s = Object.assign({ cle: '', nom: '', emplacement: 'vetement', modele: 'tshirt', couleur1: '#E1382D', couleur2: '#FFFFFF', motif: 'uni', texte: '7', rarete: 'commun' }, original || {});
      const nouveau = !original || !original.cle;
      const dlg = U.dialog({
        title: nouveau ? 'Créer un skin' : 'Modifier le skin', size: 'lg',
        body: `<div class="ds-grid"><div class="ds-scene" id="skApercu"></div><div class="stack">
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Nom</label><input class="tv-input" id="skNom" value="${esc(s.nom)}" placeholder="Maillot du club"></div>
            <div class="input-group"><label class="input-label">Rareté</label><select class="tv-select" id="skRarete">${Object.entries(D.RARETES).map(([k, v]) => `<option value="${k}" ${k === s.rarete ? 'selected' : ''}>${esc(v[0])} (niveau ${RANG[k]}+)</option>`).join('')}</select></div></div>
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Emplacement</label><select class="tv-select" id="skEmp">${Object.entries(D.EMPLACEMENTS).map(([k, v]) => `<option value="${k}" ${k === s.emplacement ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label">Modèle</label><select class="tv-select" id="skModele"></select></div></div>
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Couleur principale</label><input type="color" class="tv-input" id="skC1" value="${esc(s.couleur1)}" style="height:38px;padding:3px"></div>
            <div class="input-group"><label class="input-label">Couleur secondaire</label><input type="color" class="tv-input" id="skC2" value="${esc(s.couleur2)}" style="height:38px;padding:3px"></div></div>
          <div class="grid grid-2" id="skMotifs"><div class="input-group"><label class="input-label">Motif</label><select class="tv-select" id="skMotif">${Object.entries(D.MOTIFS).map(([k, v]) => `<option value="${k}" ${k === s.motif ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label">Numéro (motif « Numéro »)</label><input class="tv-input" id="skTexte" maxlength="2" value="${esc(s.texte || '')}"></div></div>
          <div class="small muted">Couleurs de la charte Livora : <span class="row" style="display:inline-flex;gap:4px;vertical-align:middle">${['#E1382D', '#131217', '#E3A93E', '#2E7D5B', '#2B6CB0', '#7C3AED', '#F4F2EC'].map(x => `<button type="button" class="ds-pastille" data-c="${x}" style="background:${x}" title="${x}"></button>`).join('')}</span></div>
        </div></div>`,
        actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Enregistrer', cls: 'btn-primary', icon: 'mdi-content-save-outline', onClick: async ({ body }) => {
          lire(body);
          if (!s.nom.trim()) { U.toast('error', 'Donne un nom au skin'); return false; }
          const perso = liste.filter(x => !x.fourni);
          if (nouveau) {
            let cle = U.slug(s.nom).replace(/-/g, '_') || 'skin', i = 2;
            while (liste.some(x => x.cle === cle)) cle = U.slug(s.nom).replace(/-/g, '_') + '_' + i++;
            s.cle = cle;
            perso.push(s);
          } else perso[perso.findIndex(x => x.cle === s.cle)] = s;
          await enregistrerPerso(perso);
          U.toast('success', 'Skin enregistré', s.nom);
          if (etat.onglet === 'skins') vueSkins($('#dsCorps'));
        } }]
      });
      const b = dlg.body;
      function lire(body) {
        Object.assign(s, { nom: body.querySelector('#skNom').value.trim(), rarete: body.querySelector('#skRarete').value, emplacement: body.querySelector('#skEmp').value, modele: body.querySelector('#skModele').value,
          couleur1: body.querySelector('#skC1').value, couleur2: body.querySelector('#skC2').value, motif: body.querySelector('#skMotif').value, texte: body.querySelector('#skTexte').value.trim() });
      }
      function modeles() {
        const e = b.querySelector('#skEmp').value, m = D.MODELES[e];
        if (!m[s.modele]) s.modele = Object.keys(m)[0];
        b.querySelector('#skModele').innerHTML = Object.entries(m).map(([k, v]) => `<option value="${k}" ${k === s.modele ? 'selected' : ''}>${esc(v.nom)}</option>`).join('');
        b.querySelector('#skMotifs').hidden = e !== 'vetement';
      }
      function apercu() {
        lire(b);
        const t = tenue();
        t[s.emplacement] = s;
        b.querySelector('#skApercu').innerHTML = img(D.avatar(Object.assign(options(), { tenue: t })), 240, 'Aperçu') + `<div class="row" style="justify-content:center">${img(D.vignette(s), 90, 'Vignette')}</div>`;
      }
      b.querySelector('#skEmp').onchange = () => { s.emplacement = b.querySelector('#skEmp').value; modeles(); apercu(); };
      b.addEventListener('input', apercu);
      b.addEventListener('change', apercu);
      b.querySelectorAll('[data-c]').forEach(p => p.onclick = () => { b.querySelector('#skC1').value = p.dataset.c; apercu(); });
      modeles();
      apercu();
    }

    /* ---------- Compagnons ---------- */
    function compagnons(c) {
      c.innerHTML = `<p class="muted" style="margin-top:0">Chaque compagnon évolue en 4 paliers (niveaux 1, 5, 15 et 30 du compagnon) : il grandit, prend un bandeau de sport, puis devient légendaire (couronne, aura dorée). Animés : respiration, clignement des yeux, queue qui remue.</p>
        <div class="table-wrap"><table class="tv-table ds-table"><thead><tr><th>Espèce</th>${D.NOMS_PALIERS.map((p, i) => `<th>${esc(p)} <span class="muted small">(niv. ${D.PALIERS[i]})</span></th>`).join('')}</tr></thead><tbody>
        ${Object.entries(D.ESPECES).map(([k, e]) => `<tr><td><b>${esc(e.nom)}</b></td>${D.PALIERS.map(p => `<td><button class="ds-vignette" data-comp="${k}" data-palier="${p}" title="Télécharger en SVG">${img(D.compagnon(k, p), 110, e.nom)}</button></td>`).join('')}</tr>`).join('')}
        </tbody></table></div>`;
      c.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => U.download(`${b.dataset.comp}-level-${b.dataset.palier}.svg`, D.compagnon(b.dataset.comp, +b.dataset.palier), 'image/svg+xml'));
    }

    /* ---------- Compagnons illustrés par IA ---------- */
    async function vueIA(c) {
      const gen = await DI.generateur();
      if (etat.onglet !== 'ia') return;
      const cellule = (e, p) => {
        const im = iaImages[e][p];
        return `<div class="ds-ia" data-cell="${e}-${p}">
          <div class="ds-ia-img">${im ? `<img src="${esc(im.image)}" alt="${esc(D.ESPECES[e].nom)} ${esc(D.NOMS_PALIERS[D.PALIERS.indexOf(p)])} (IA)">` : `<div class="ds-ia-vide">${img(D.compagnon(e, p), 96, D.ESPECES[e].nom)}<span class="small muted">dessin actuel</span></div>`}</div>
          <div class="ds-ia-actions">
            ${gen ? `<button class="btn btn-sm btn-primary" data-gen="${e}" data-p="${p}" title="Générer avec l’IA"><span class="mdi mdi-creation"></span>IA</button>` : ''}
            <button class="btn btn-sm btn-outline" data-prompt="${e}" data-p="${p}" title="Voir le prompt et la référence"><span class="mdi mdi-text-box-outline"></span>Prompt</button>
            <button class="btn btn-sm btn-outline" data-import="${e}" data-p="${p}" title="Importer une image"><span class="mdi mdi-upload"></span>Importer</button>
            ${im ? `<button class="btn btn-sm btn-outline" data-efface="${e}" data-p="${p}" title="Revenir au dessin actuel"><span class="mdi mdi-close"></span>Retirer</button>` : ''}
          </div></div>`;
      };
      const nb = Object.values(iaImages).reduce((t, x) => t + Object.values(x).filter(Boolean).length, 0);
      c.innerHTML = `<div class="stack">
        <p class="muted" style="margin:0">Chaque compagnon est recréé par une IA à partir de son dessin actuel (même espèce, mêmes couleurs), en 3D (ou en dessin 2D manga si tu préfères). Il évolue en 4 paliers : bébé tout fin, jeune athlète mince, adulte musclé, puis héros légendaire très musclé avec aura dorée, et il grandit dans l’image à chaque palier. Chaque palier est généré à partir du précédent pour garder le même personnage.</p>
        ${gen ? `<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>Générateur prêt sur le serveur local : <b>${esc(gen.fournisseur)}</b> (${esc(gen.modele)}). Chaque image est facturée par le fournisseur.</div></div>`
          : `<div class="bar warn"><span class="mdi mdi-information-outline"></span><div>Pas de générateur d’images sur le serveur local. Ouvre le prompt d’un palier (bouton « Prompt »), colle-le dans ChatGPT, Gemini ou Midjourney avec l’image de référence, puis importe le résultat (bouton « Importer »). Pour générer ici : lancer <span class="mono">serveur.js</span> avec <span class="mono">OPENAI_API_KEY</span> ou <span class="mono">GEMINI_API_KEY</span> (la clé reste sur ta machine).</div></div>`}
        ${selRendu()}
        <div class="row"><span class="chip ${nb ? 'chip-success' : ''}">${nb} / ${Object.keys(D.ESPECES).length * D.PALIERS.length} illustrations</span>
          ${gen ? `<button class="btn btn-primary" id="iaTout"><span class="mdi mdi-creation"></span>Générer celles qui manquent</button>` : ''}</div>
        <div class="table-wrap"><table class="tv-table ds-table"><thead><tr><th>Espèce</th>${D.NOMS_PALIERS.map((n, i) => `<th>${esc(n)} <span class="muted small">(niv. ${D.PALIERS[i]})</span></th>`).join('')}</tr></thead><tbody>
        ${Object.entries(D.ESPECES).map(([e, x]) => `<tr><td><b>${esc(x.nom)}</b>${gen ? `<br><button class="btn btn-sm btn-outline" data-gen-esp="${e}" style="margin-top:6px"><span class="mdi mdi-creation"></span>Les 4 paliers</button>` : ''}</td>${D.PALIERS.map(p => `<td>${cellule(e, p)}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div></div>`;

      const occupe = (e, p, oui) => { const el = c.querySelector(`[data-cell="${e}-${p}"] .ds-ia-img`); if (el && oui) el.innerHTML = '<div class="ds-ia-vide"><span class="mdi mdi-loading mdi-spin" style="font-size:28px"></span><span class="small muted">Génération…</span></div>'; };
      const lot = async liste => {
        c.querySelectorAll('button').forEach(b => { b.disabled = true; });
        let ok = 0;
        try {
          for (const [e, p] of liste) {
            occupe(e, p, true);
            iaImages[e][p] = await DI.generer(e, p);
            ok++;
          }
          if (ok) U.toast('success', ok > 1 ? `${ok} illustrations générées` : 'Illustration générée');
        } catch (err) {
          U.toast('error', 'Génération impossible', err.message);
        }
        vueIA(c);
      };
      lierRendu(c, async () => { iaImages = await DI.toutes(); vueIA(c); });
      c.querySelectorAll('[data-gen]').forEach(b => b.onclick = () => lot([[b.dataset.gen, +b.dataset.p]]));
      c.querySelectorAll('[data-gen-esp]').forEach(b => b.onclick = () => lot(D.PALIERS.map(p => [b.dataset.genEsp, p])));
      const tout = c.querySelector('#iaTout');
      if (tout) tout.onclick = async () => {
        const manquent = [];
        Object.keys(D.ESPECES).forEach(e => D.PALIERS.forEach(p => { if (!iaImages[e][p]) manquent.push([e, p]); }));
        if (!manquent.length) return U.toast('info', 'Toutes les illustrations sont déjà faites');
        if (await U.confirm('Générer les illustrations', `${manquent.length} image(s) vont être demandées au générateur (${gen.fournisseur}), une par une. Chaque image est facturée par le fournisseur.`, { okLabel: 'Générer' })) lot(manquent);
      };
      c.querySelectorAll('[data-prompt]').forEach(b => b.onclick = () => dialoguePrompt(b.dataset.prompt, +b.dataset.p));
      c.querySelectorAll('[data-import]').forEach(b => b.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/png,image/webp,image/jpeg';
        inp.onchange = () => {
          const f = inp.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = async () => {
            try { iaImages[b.dataset.import][+b.dataset.p] = await DI.enregistrer(b.dataset.import, +b.dataset.p, r.result, 'import'); U.toast('success', 'Image importée'); }
            catch (err) { U.toast('error', 'Image illisible', err.message); }
            vueIA(c);
          };
          r.readAsDataURL(f);
        };
        inp.click();
      });
      c.querySelectorAll('[data-efface]').forEach(b => b.onclick = async () => { await DI.effacer(b.dataset.efface, +b.dataset.p); iaImages[b.dataset.efface][+b.dataset.p] = null; vueIA(c); });
    }
    /* ---------- Personnage illustré par IA (manga de combat, personnalisable) ---------- */
    async function vuePersoIA(c) {
      const choixP = etat.persoIA = Object.assign(DI.persoDefaut('m'), etat.persoIA || {});
      const [gen, ims] = await Promise.all([DI.generateur(), DI.lirePerso(choixP)]);
      if (etat.onglet !== 'persoIA') return;
      const sel = (k, label) => `<div class="input-group"><label class="input-label">${esc(label)}</label><select class="tv-select" data-choix="${k}">${DI.PERSO[k].map(o => `<option value="${o[0]}" ${o[0] === choixP[k] ? 'selected' : ''}>${esc(o[1])}${k === 'coiffure' && !o[3].includes(choixP.genre) ? ' (plutôt ' + (o[3] === 'f' ? 'féminin' : 'masculin') + ')' : ''}</option>`).join('')}</select></div>`;
      const cellule = st => {
        const im = ims[st];
        return `<div class="ds-ia" data-cell="perso-${st}"><b class="small">${esc(D.STADES[st - 1].nom)}</b>
          <div class="ds-ia-img">${im ? `<img src="${esc(im.image)}" alt="Personnage, stade ${esc(D.STADES[st - 1].nom)} (IA)">` : `<div class="ds-ia-vide">${img(D.avatarBase({ stade: st, peau: D.PEAUX[choixP.peau] }), 96, D.STADES[st - 1].nom)}<span class="small muted">corps de référence</span></div>`}</div>
          <div class="ds-ia-actions">
            ${gen ? `<button class="btn btn-sm btn-primary" data-pgen="${st}" title="Générer avec l’IA"><span class="mdi mdi-creation"></span>IA</button>` : ''}
            <button class="btn btn-sm btn-outline" data-pprompt="${st}" title="Voir le prompt et la référence"><span class="mdi mdi-text-box-outline"></span>Prompt</button>
            <button class="btn btn-sm btn-outline" data-pimport="${st}" title="Importer une image"><span class="mdi mdi-upload"></span>Importer</button>
            ${im ? `<button class="btn btn-sm btn-outline" data-pefface="${st}" title="Retirer"><span class="mdi mdi-close"></span>Retirer</button>` : ''}
          </div></div>`;
      };
      c.innerHTML = `<div class="stack">
        <p class="muted" style="margin:0">Le personnage du joueur façon manga de combat des années 90 (cheveux en grosses mèches pointues, regard intense, aura d’énergie), en 3D ou en dessin 2D, en masculin ou en féminin. Il passe par les 5 stades : débutant tout mince, motivé, sportif, athlète très musclé, puis légende avec aura dorée. Choisis ses yeux, ses cheveux et sa coiffure : chaque combinaison a ses propres images. Le style est décrit sans nommer d’œuvre, car les générateurs refusent souvent de copier un manga existant.</p>
        ${gen ? `<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>Générateur prêt : <b>${esc(gen.fournisseur)}</b> (${esc(gen.modele)}). Chaque image est facturée par le fournisseur.</div></div>`
          : `<div class="bar warn"><span class="mdi mdi-information-outline"></span><div>Pas de générateur d’images sur le serveur local : copie le prompt de chaque stade dans ChatGPT, Gemini ou Midjourney avec l’image de référence, puis importe le résultat.</div></div>`}
        ${selRendu()}
        <div class="grid grid-2" style="gap:12px">${sel('genre', 'Genre')}${sel('peau', 'Peau')}${sel('formeYeux', 'Forme des yeux')}${sel('couleurYeux', 'Couleur des yeux')}${sel('couleurCheveux', 'Couleur des cheveux')}${sel('coiffure', 'Coiffure')}${sel('tenue', 'Tenue')}
          <label class="row small" style="align-self:end;gap:6px"><input type="checkbox" data-doree ${choixP.doree ? 'checked' : ''}> Cheveux et regard dorés au stade Légende</label></div>
        <div class="row">${gen ? `<button class="btn btn-primary" id="pTout"><span class="mdi mdi-creation"></span>Générer les 5 stades</button>` : ''}
          <button class="btn btn-outline" id="pMd"><span class="mdi mdi-download"></span>Télécharger les 5 prompts (.md)</button></div>
        <div class="ds-ligne">${[1, 2, 3, 4, 5].map(cellule).join('')}</div></div>`;

      c.querySelectorAll('[data-choix]').forEach(x => x.onchange = () => {
        const k = x.dataset.choix;
        if (k === 'genre') { const d = DI.persoDefaut(x.value); choixP.genre = d.genre; choixP.coiffure = d.coiffure; choixP.formeYeux = d.formeYeux; choixP.tenue = d.tenue; }
        else choixP[k] = x.value;
        sauver(); vuePersoIA(c);
      });
      lierRendu(c, () => vuePersoIA(c));
      c.querySelector('[data-doree]').onchange = e => { choixP.doree = e.target.checked; sauver(); vuePersoIA(c); };
      const lot = async stades => {
        c.querySelectorAll('button, select, input').forEach(b => { b.disabled = true; });
        let ok = 0;
        try {
          for (const st of stades) {
            const el = c.querySelector(`[data-cell="perso-${st}"] .ds-ia-img`);
            if (el) el.innerHTML = '<div class="ds-ia-vide"><span class="mdi mdi-loading mdi-spin" style="font-size:28px"></span><span class="small muted">Génération…</span></div>';
            await DI.genererPerso(choixP, st); ok++;
          }
          if (ok) U.toast('success', ok > 1 ? `${ok} images générées` : 'Image générée');
        } catch (err) { U.toast('error', 'Génération impossible', err.message); }
        vuePersoIA(c);
      };
      c.querySelectorAll('[data-pgen]').forEach(b => b.onclick = () => lot([+b.dataset.pgen]));
      const tout = c.querySelector('#pTout');
      if (tout) tout.onclick = async () => { if (await U.confirm('Générer les 5 stades', `5 images vont être demandées au générateur (${gen.fournisseur}), une par une, chacune à partir de la précédente. Chaque image est facturée par le fournisseur.`, { okLabel: 'Générer' })) lot([1, 2, 3, 4, 5]); };
      c.querySelector('#pMd').onclick = () => U.download(`personnage-${DI.signature(choixP)}.md`, promptsPersoMd(choixP), 'text/markdown;charset=utf-8');
      c.querySelectorAll('[data-pprompt]').forEach(b => b.onclick = () => {
        const st = +b.dataset.pprompt, avant = st > 1 ? ims[st - 1] : null;
        dialogueTexte(`Personnage · ${D.STADES[st - 1].nom} : prompt pour l’IA`, DI.promptPerso(choixP, st, !!avant),
          [img(D.avatarBase({ stade: st, peau: D.PEAUX[choixP.peau] }), 110, 'Référence 1'), avant ? `<img src="${esc(avant.image)}" width="110" height="110" alt="Référence 2">` : ''].join(''),
          async () => {
            U.download(`personnage-stade-${st}-reference-1.png`, new Blob([DI.octets(await DI.referencePerso(choixP, st))], { type: 'image/png' }));
            if (avant) U.download(`personnage-stade-${st - 1}-reference-2.webp`, new Blob([DI.octets(avant.image)], { type: 'image/webp' }));
          }, !!avant);
      });
      c.querySelectorAll('[data-pimport]').forEach(b => b.onclick = () => importerImage(async data => { await DI.enregistrerPerso(choixP, +b.dataset.pimport, data, 'import'); vuePersoIA(c); }));
      c.querySelectorAll('[data-pefface]').forEach(b => b.onclick = async () => { await DI.effacerPerso(choixP, +b.dataset.pefface); vuePersoIA(c); });
    }
    /** Choix du rendu des images IA (3D par défaut). Chaque rendu garde ses propres images. */
    const selRendu = () => `<div class="row" style="gap:8px"><span class="small"><b>Rendu</b></span>${Object.entries(DI.RENDUS).map(([k, l]) => `<button class="btn btn-sm ${k === DI.rendu ? 'btn-primary' : 'btn-outline'}" data-rendu="${k}">${esc(l)}</button>`).join('')}</div>`;
    const lierRendu = (c, suite) => c.querySelectorAll('[data-rendu]').forEach(b => b.onclick = async () => { await DI.choisirRendu(b.dataset.rendu); iaImages = await DI.toutes(); suite(); });
    /** Les 5 prompts d'un personnage, en Markdown. */
    function promptsPersoMd(ch) {
      const lib = k => (DI.PERSO[k].find(o => o[0] === ch[k]) || [])[1];
      return `# Personnage Livora : prompts pour un générateur d'images (${DI.RENDUS[DI.rendu]})

${lib('genre')} · peau ${lib('peau')} · yeux ${lib('formeYeux')}, ${lib('couleurYeux')} · cheveux ${lib('couleurCheveux')}, ${lib('coiffure')} · ${lib('tenue')}

Générer les 5 stades dans l'ordre. Joindre l'image de référence du stade (corps dessiné par l'Atelier) et,
à partir du stade 2, l'image obtenue au stade précédent, pour garder la même personne.
Les prompts sont en anglais : les générateurs d'images les suivent mieux.
${[1, 2, 3, 4, 5].map(st => `
## Stade ${st} : ${D.STADES[st - 1].nom} (niveau ${D.STADES[st - 1].niveau})

\`\`\`text
${DI.promptPerso(ch, st, st > 1)}
\`\`\`
`).join('')}`;
    }
    /** Choisit une image sur l'appareil et la passe en data URL. */
    function importerImage(suite) {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/png,image/webp,image/jpeg';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = async () => { try { await suite(r.result); U.toast('success', 'Image importée'); } catch (err) { U.toast('error', 'Image illisible', err.message); } };
        r.readAsDataURL(f);
      };
      inp.click();
    }
    /** Fenêtre « prompt à copier » avec ses images de référence. */
    function dialogueTexte(titre, texte, apercus, telecharger, deux) {
      U.dialog({
        title: titre, size: 'lg',
        body: `<div class="stack"><p class="small muted" style="margin:0">À coller dans ChatGPT, Gemini ou Midjourney, en joignant ${deux ? 'les deux images ci-dessous (1 : référence, 2 : étape précédente)' : 'l’image de référence ci-dessous'}. Le prompt est en anglais : les générateurs d’images le suivent mieux.</p>
          <textarea class="tv-input mono" id="iaPrompt" rows="12" style="font-size:12px">${esc(texte)}</textarea>
          <div class="row">${apercus}</div></div>`,
        actions: [
          { label: 'Télécharger les références', cls: 'btn-outline', icon: 'mdi-download', onClick: async () => { await telecharger(); return false; } },
          { label: 'Copier le prompt', cls: 'btn-primary', icon: 'mdi-content-copy', onClick: async ({ body }) => {
            try { await navigator.clipboard.writeText(body.querySelector('#iaPrompt').value); U.toast('success', 'Prompt copié'); } catch (err) { body.querySelector('#iaPrompt').select(); U.toast('info', 'Sélectionne le texte et copie-le'); }
            return false;
          } }
        ]
      });
    }

    /** Prompt d'un palier, à copier, avec les images de référence à joindre. */
    async function dialoguePrompt(e, p) {
      const i = D.PALIERS.indexOf(p), avant = i > 0 ? iaImages[e][D.PALIERS[i - 1]] : null, texte = DI.prompt(e, p, !!avant);
      const dlg = U.dialog({
        title: `${D.ESPECES[e].nom} · ${D.NOMS_PALIERS[i]} : prompt pour l’IA`, size: 'lg',
        body: `<div class="stack"><p class="small muted" style="margin:0">À coller dans ChatGPT, Gemini ou Midjourney, en joignant ${avant ? 'les deux images ci-dessous (1 : dessin actuel, 2 : palier précédent)' : 'l’image de référence ci-dessous'}. Le prompt est en anglais : les générateurs d’images le suivent mieux.</p>
          <textarea class="tv-input mono" id="iaPrompt" rows="12" style="font-size:12px">${esc(texte)}</textarea>
          <div class="row">${img(D.compagnon(e, p), 110, 'Référence 1')}${avant ? `<img src="${esc(avant.image)}" width="110" height="110" alt="Référence 2">` : ''}</div></div>`,
        actions: [
          { label: 'Télécharger les références', cls: 'btn-outline', icon: 'mdi-download', onClick: async () => {
            U.download(`${e}-level-${p}-reference-1.png`, new Blob([DI.octets(await DI.reference(e, p))], { type: 'image/png' }));
            if (avant) U.download(`${e}-level-${D.PALIERS[i - 1]}-reference-2.webp`, new Blob([DI.octets(avant.image)], { type: 'image/webp' }));
            return false;
          } },
          { label: 'Copier le prompt', cls: 'btn-primary', icon: 'mdi-content-copy', onClick: async ({ body }) => {
            try { await navigator.clipboard.writeText(body.querySelector('#iaPrompt').value); U.toast('success', 'Prompt copié'); } catch (err) { body.querySelector('#iaPrompt').select(); U.toast('info', 'Sélectionne le texte et copie-le'); }
            return false;
          } }
        ]
      });
      return dlg;
    }

    /* ---------- Mouvements ---------- */
    function mouvements(c) {
      const niveaux = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
      c.innerHTML = `<p class="muted" style="margin-top:0">Exercices animés en boucle, avec la silhouette du stade (la musculature suit le niveau) et la tenue choisie dans l’onglet Personnage (haut, chaussures, bandeau). Clique sur une animation pour la télécharger en SVG.</p>
        ${Object.entries(D.NIVEAUX_EXERCICES).map(([n, cles]) => `<h3 style="margin:16px 0 8px">${esc(niveaux[n])}</h3><div class="ds-ligne">${cles.map(k => `<button class="ds-vignette ds-mvt" data-mvt="${k}" title="Télécharger en SVG">${img(D.mouvement(k, options()), 190, D.MOUVEMENTS[k].nom)}</button>`).join('')}</div>`).join('')}`;
      c.querySelectorAll('[data-mvt]').forEach(b => b.onclick = () => U.download(`${b.dataset.mvt}.svg`, D.mouvement(b.dataset.mvt, options()), 'image/svg+xml'));
    }

    /* ---------- Export ---------- */
    function vueExport(c) {
      const n = paquetLivora().nombre;
      c.innerHTML = `<div class="stack" style="max-width:820px">
        ${gemini ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div><b>Cette app a ses propres avatars (Gemini).</b> Le pack SVG ci-dessous est l’ancien style : copié dans l’app, il remettrait les anciens dessins (AvatarManga). Les nouveaux sont dans le code de l’app : voir l’onglet « Avatars de l’app ».</div></div>` : ''}
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-run"></span>${gemini ? 'Ancien pack SVG pour Livora' : 'Pack pour Livora'}</span></div><div class="panel-body stack">
          <p style="margin:0">${n} images SVG rangées exactement aux chemins attendus par l’AssetManager de Livora (<span class="mono">web/src/assets/…</span>) : les écrans passent automatiquement des emojis provisoires aux vrais dessins, sans modifier une seule vue.</p>
          <ul style="margin:0;padding-left:18px"><li>Personnage : <span class="mono">avatar/base/default.svg</span> + les 5 stades d’évolution</li>
            <li>Skins : calques <span class="mono">avatar/hair|clothes|shoes|accessories|equipment/&lt;clé&gt;.svg</span> et vignettes de collection</li>
            <li>Compagnons : <span class="mono">companions/&lt;espèce&gt;/level-1|5|15|30</span> (illustration IA en .webp si elle est faite, sinon le dessin .svg)</li>
            <li>Exercices animés : <span class="mono">exercises/&lt;clé&gt;.svg</span></li>
            <li>Personnage vivant : <span class="mono">components/AvatarManga.vue</span> + <span class="mono">design/moteurDesign.js</span>, qui dessine en direct le corps du stade avec la tenue équipée</li>
            <li>Fiche d’intégration (2 petites modifications de code) et les skins créés à ajouter dans <span class="mono">cosmeticItems.js</span></li></ul>
          <div class="row"><button class="btn btn-primary" id="dsZipLivora"><span class="mdi mdi-folder-zip-outline"></span>Télécharger le pack Livora</button></div></div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-image-multiple-outline"></span>Pack générique</span></div><div class="panel-body stack">
          <p style="margin:0">Les mêmes images rangées simplement par type, avec une planche d’aperçu HTML, pour une autre app ou un graphiste.</p>
          <div class="row"><button class="btn btn-outline" id="dsZipGen"><span class="mdi mdi-folder-zip-outline"></span>Télécharger le pack générique</button></div></div></div></div>`;
      c.querySelector('#dsZipLivora').onclick = () => U.download('livora-design-pack.zip', AB.zip(paquetLivora().fichiers));
      c.querySelector('#dsZipGen').onclick = () => U.download('design-pack.zip', AB.zip(paquetGenerique()));
    }

    /** Fichiers du pack Livora, aux chemins de l'AssetManager. */
    function paquetLivora() {
      const f = {}, A = 'web/src/assets/', o = { peau: D.PEAUX[etat.peau], cheveux: D.CHEVEUX[etat.cheveux] };
      f[A + 'avatar/base/default.svg'] = D.avatarBase(Object.assign({ stade: 1 }, o));
      D.STADES.forEach(s => { f[`${A}avatar/base/stade-${s.stade}.svg`] = D.avatarBase(Object.assign({ stade: s.stade }, o)); });
      liste.forEach(s => {
        if (D.DOSSIER_CALQUE[s.emplacement]) f[`${A}avatar/${D.DOSSIER_CALQUE[s.emplacement]}/${s.cle}.svg`] = D.calque(s);
        f[`${A}avatar/${s.emplacement}/${s.cle}.svg`] = D.vignette(s);
      });
      // Compagnons : l'illustration IA (.webp) si elle existe, sinon le dessin SVG
      Object.keys(D.ESPECES).forEach(e => D.PALIERS.forEach(p => {
        const ia = iaImages[e] && iaImages[e][p];
        if (ia) f[`${A}companions/${e}/level-${p}.webp`] = DI.octets(ia.image); else f[`${A}companions/${e}/level-${p}.svg`] = D.compagnon(e, p);
      }));
      Object.keys(D.MOUVEMENTS).forEach(m => { f[`${A}exercises/${m}.svg`] = D.mouvement(m, { peau: o.peau, cheveux: o.cheveux }); });
      const nombre = Object.keys(f).length;
      // Personnage vivant : le moteur de dessin en module ES + un composant Vue qui l'utilise
      f['web/src/design/moteurDesign.js'] = `/* Moteur de dessin de l'Atelier de Blocs (généré, ne pas modifier à la main).
   Personnage à 5 stades de musculature, skins, compagnons et exercices animés, en SVG. */
${D.SOURCE}

/** Skins créés dans l'Atelier (en plus du catalogue Livora intégré au moteur). */
export const SKINS_PERSO = ${JSON.stringify(liste.filter(s => !s.fourni), null, 2)};

export default moteurDesign;
`;
      f['web/src/components/AvatarManga.vue'] = composantVue();
      f['LIVORA-INTEGRATION.md'] = integration(liste.filter(s => !s.fourni));
      f['apercu.html'] = planche();
      return { fichiers: f, nombre };
    }
    function paquetGenerique() {
      const f = {}, o = { peau: D.PEAUX[etat.peau], cheveux: D.CHEVEUX[etat.cheveux] };
      D.STADES.forEach(s => { f[`personnage/stade-${s.stade}-${U.slug(s.nom)}.svg`] = D.avatarBase(Object.assign({ stade: s.stade }, o)); f[`personnage/equipe-stade-${s.stade}.svg`] = D.avatar(Object.assign(options(), { stade: s.stade })); });
      liste.forEach(s => { f[`skins/calques/${s.emplacement}/${s.cle}.svg`] = D.calque(s); f[`skins/vignettes/${s.emplacement}/${s.cle}.svg`] = D.vignette(s); });
      Object.keys(D.ESPECES).forEach(e => D.PALIERS.forEach(p => {
        const ia = iaImages[e] && iaImages[e][p];
        if (ia) f[`compagnons/${e}/palier-${p}.webp`] = DI.octets(ia.image); else f[`compagnons/${e}/palier-${p}.svg`] = D.compagnon(e, p);
      }));
      Object.keys(D.MOUVEMENTS).forEach(m => { f[`mouvements/${m}.svg`] = D.mouvement(m, options()); });
      f['apercu.html'] = planche();
      return f;
    }
    /** Planche d'aperçu : toutes les images sur une page. */
    function planche() {
      const fig = (svg, l) => `<figure>${img(svg, 140, l)}<figcaption>${esc(l)}</figcaption></figure>`;
      return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pack design — aperçu</title>
<style>body{font:14px system-ui,sans-serif;background:#EFEDE6;color:#131217;margin:24px}h2{font-family:Impact,'Arial Narrow',sans-serif;letter-spacing:1px;margin:28px 0 8px}figure{display:inline-block;margin:6px;text-align:center;background:#fff;border:2px solid #131217;box-shadow:3px 3px 0 #131217;padding:6px}figcaption{font-size:12px;margin-top:4px}</style></head><body>
<h1>Pack design</h1><h2>Évolution du personnage</h2>${D.STADES.map(s => fig(D.avatar(Object.assign(options(), { stade: s.stade })), s.nom)).join('')}
<h2>Skins</h2>${liste.map(s => fig(D.vignette(s), s.nom)).join('')}
<h2>Compagnons</h2>${Object.entries(D.ESPECES).map(([k, e]) => D.PALIERS.map((p, i) => iaImages[k] && iaImages[k][p] ? `<figure><img src="${esc(iaImages[k][p].image)}" width="140" height="140" alt="${esc(e.nom)}"><figcaption>${esc(e.nom)} · ${esc(D.NOMS_PALIERS[i])}</figcaption></figure>` : fig(D.compagnon(k, p), `${e.nom} · ${D.NOMS_PALIERS[i]}`)).join('')).join('<br>')}
<h2>Mouvements</h2>${Object.keys(D.MOUVEMENTS).map(m => fig(D.mouvement(m, options()), D.MOUVEMENTS[m].nom)).join('')}
</body></html>`;
    }
    /** Composant Vue de Livora : le personnage dessiné en direct pour son niveau et sa tenue. */
    function composantVue() {
      return `<script setup>
// Personnage manga vivant : son corps suit le niveau (5 stades de musculature) et il porte la tenue équipée.
// Avec la prop « exercice », il fait l'exercice animé dans sa tenue et avec sa silhouette.
import { computed } from 'vue'
import moteurDesign, { SKINS_PERSO } from '../design/moteurDesign.js'

const D = moteurDesign()
const CATALOGUE = [...D.SKINS_LIVORA, ...SKINS_PERSO]

const props = defineProps({
  level: { type: Number, default: 1 },
  // { slot: cléObjet } ou [cléObjet, …] : les clés de cosmeticItems.js
  equipped: { type: [Object, Array], default: () => ({}) },
  peau: { type: String, default: 'doree' }, // ${Object.keys(D.PEAUX).join(' | ')}
  cheveux: { type: String, default: 'brun' }, // ${Object.keys(D.CHEVEUX).join(' | ')}
  exercice: { type: String, default: '' }, // ${Object.keys(D.MOUVEMENTS).join(' | ')}
  size: { type: [Number, String], default: 220 }
})

const tenue = computed(() => {
  const cles = Array.isArray(props.equipped) ? props.equipped : Object.values(props.equipped || {})
  const t = {}
  cles.forEach(k => { const s = CATALOGUE.find(x => x.cle === k); if (s) t[s.emplacement] = s })
  return t
})
const stade = computed(() => D.STADES[D.stadeDuNiveau(props.level) - 1])
const src = computed(() => {
  const o = { niveau: props.level, tenue: tenue.value, peau: D.PEAUX[props.peau], cheveux: D.CHEVEUX[props.cheveux] }
  return D.url(props.exercice && D.MOUVEMENTS[props.exercice] ? D.mouvement(props.exercice, o) : D.avatar(o))
})
const alt = computed(() => props.exercice && D.MOUVEMENTS[props.exercice] ? D.MOUVEMENTS[props.exercice].nom : 'Personnage, stade ' + stade.value.nom)
</script>

<template>
  <img class="avatar-manga" :src="src" :alt="alt" :width="size" :height="size" />
</template>

<style scoped>
.avatar-manga { display: block; max-width: 100%; height: auto; }
</style>
`;
    }
    function integration(perso) {
      return `# Intégrer le pack design dans Livora

1. Copier le dossier \`web/src/assets/\` du ZIP dans \`apps/livora/web/src/assets/\` (fusionner).

2. \`web/src/assets/assetManager.js\` cherche aujourd'hui uniquement des fichiers \`.webp\`.
   Remplacer la fonction \`realAssetUrl\` par celle-ci (elle accepte aussi .svg, .png… comme le dit déjà le guide) :

\`\`\`js
function realAssetUrl(relativePath) {
  const sansExtension = relativePath.replace(/\\.[a-z]+$/i, '')
  for (const ext of ['webp', 'avif', 'png', 'jpg', 'jpeg', 'svg']) {
    const url = REAL_ASSETS[\`./\${sansExtension}.\${ext}\`]
    if (url) return url
  }
  return null
}
\`\`\`

3. (Facultatif) Personnage qui évolue avec le niveau : dans les vues qui affichent \`<Avatar>\`
   (TodayView, ProfileView, CharacterView), passer le stade selon le niveau du joueur :

\`\`\`vue
<Avatar :base="'stade-' + stadeAvatar" … />
\`\`\`
\`\`\`js
// 1 : niveaux 1-4 · 2 : 5-9 · 3 : 10-14 · 4 : 15-24 · 5 : 25 et plus
const stadeAvatar = computed(() => { const n = gamification.progress.level; return n >= 25 ? 5 : n >= 15 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : 1 })
\`\`\`

4. (Recommandé) Personnage vivant, avec la vraie évolution musculaire : les calques fixes ci-dessus sont
   dessinés pour la silhouette du stade 3. Pour que les vêtements épousent le corps à chaque stade, utiliser
   le composant fourni \`components/AvatarManga.vue\` à la place de \`<Avatar>\` :

\`\`\`vue
<script setup>
import AvatarManga from '@/components/AvatarManga.vue'
</script>

<AvatarManga :level="gamification.progress.level" :equipped="equippedCosmetics" />
<!-- Exercice animé dans la tenue et avec la silhouette du joueur -->
<AvatarManga :level="gamification.progress.level" :equipped="equippedCosmetics" exercice="pompes" :size="180" />
\`\`\`

   \`equipped\` accepte un objet \`{ emplacement: clé }\` ou une liste de clés de \`cosmeticItems.js\`.
   Le moteur (\`design/moteurDesign.js\`) n'a aucune dépendance et ne fait aucun appel réseau :
   les images sont produites en SVG dans le navigateur (balise \`<img>\` en \`data:\`).

Les animations (respiration, clignement, exercices) sont dans les SVG eux-mêmes :
elles fonctionnent dans une simple balise \`<img>\` et s'arrêtent si l'utilisateur a demandé moins d'animations.

${perso.length ? `## Skins créés dans l'Atelier

À ajouter dans \`web/src/gamification/cosmeticItems.js\` (tableau \`COSMETIC_ITEMS\`) :

\`\`\`js
${perso.map(s => `  { key: '${s.cle}', slot: '${s.emplacement}', label: ${JSON.stringify(s.nom)}, icon: '✨', rarity: '${s.rarete}' },`).join('\n')}
\`\`\`
` : ''}
## Contenu

- \`avatar/base/default.svg\` (stade 1) et \`avatar/base/stade-1…5.svg\`
- \`avatar/<hair|clothes|shoes|accessories|equipment>/<clé>.svg\` : calques superposés par \`<Avatar>\`
- \`avatar/<coiffure|vetement|…>/<clé>.svg\` : vignettes de la collection et de l'écran Personnage
- \`companions/<espèce>/level-<1|5|15|30>.svg\`
- \`exercises/<clé>.svg\` : exercices animés
- \`design/moteurDesign.js\` et \`components/AvatarManga.vue\` : personnage vivant (étape 4)
`;
    }

    $('#dsLivora').onclick = () => { etat.onglet = gemini ? 'gemini' : 'export'; sauver(); onglets(); corps(); };
    onglets();
    corps();
  };
})();
