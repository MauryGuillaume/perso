/* ==========================================================================
   ab-gestion.js — onglet « Gestion » d'une app du kit « App complète »
   L'Atelier gère l'app par son API d'administration, sans connexion à la base :
   le serveur local garde l'adresse et la clé ADMIN_API_KEY de chaque app
   (~/.atelier-blocs/gestion-apps.json) et relaie les appels (/api/gestion/…).
   Sous-onglets : Connexion, État, Données (tableur), Comptes, Journal, RGPD,
   Sauvegarde et réglages.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const G = AB.gestion = {};
  const ONGLETS = [['connexion', 'Connexion', 'mdi-key-chain-variant'], ['etat', 'État', 'mdi-heart-pulse'], ['donnees', 'Données', 'mdi-table-edit'],
    ['comptes', 'Comptes', 'mdi-account-multiple-outline'], ['journal', 'Journal', 'mdi-history'], ['rgpd', 'RGPD', 'mdi-shield-account-outline'],
    ['sauvegarde', 'Sauvegarde et réglages', 'mdi-content-save-cog-outline']];
  const memoire = {};   // sous-onglet et table choisis, par app

  /** Appel au serveur local (même origine). */
  async function local(chemin, corps) {
    if (location.protocol === 'file:') throw new Error('Pour gérer une app, ouvre l’Atelier depuis le serveur local : node serveur.js, puis http://localhost:8787');
    let r;
    try {
      r = await fetch('/api/gestion/' + chemin, corps === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify(corps) });
    } catch (e) { throw new Error('Serveur local injoignable : lance « node serveur.js » puis ouvre http://localhost:8787'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.erreur || (r.status === 404 ? 'Serveur local trop ancien : relance la dernière version de serveur.js.' : `Erreur ${r.status}`));
    return d;
  }
  /** Appel à l'API d'administration de l'app, relayé par le serveur local. */
  function client(appId) {
    const url = chemin => '/api/gestion/app/' + encodeURIComponent(appId) + '/' + chemin;
    const appel = async (methode, chemin, corps) => {
      let r;
      try {
        r = await fetch(url(chemin), { method: methode, headers: Object.assign({ Accept: 'application/json' }, methode !== 'GET' ? { 'Content-Type': 'application/json', 'X-Atelier': '1' } : {}),
          body: corps === undefined ? undefined : JSON.stringify(corps) });
      } catch (e) { throw new Error('Serveur local injoignable : lance « node serveur.js » puis ouvre http://localhost:8787'); }
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) throw new Error('Clé refusée par l’app : vérifie que ADMIN_API_KEY chez l’hébergeur est bien la clé de l’onglet Connexion, puis redémarre l’app.');
      if (!r.ok) throw new Error(d.erreur || `Erreur ${r.status}`);
      return d;
    };
    return {
      get: c => appel('GET', c), post: (c, d) => appel('POST', c, d || {}), patch: (c, d) => appel('PATCH', c, d), put: (c, d) => appel('PUT', c, d), del: c => appel('DELETE', c),
      async fichier(chemin, nomParDefaut) {
        const r = await fetch(url(chemin));
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.erreur || `Erreur ${r.status}`); }
        const nom = ((r.headers.get('content-disposition') || '').match(/filename="([^"]+)"/) || [])[1] || nomParDefaut;
        U.download(nom, await r.blob());
      }
    };
  }

  /* ---------- Présentation des valeurs ---------- */
  const NOMS = { cree_le: 'Créé le', modifie_le: 'Modifié le', archive_le: 'Archivé le', cree_par: 'Créé par', email: 'Email', telephone: 'Téléphone', duree_min: 'Durée (min)' };
  const libelleColonne = c => NOMS[c.nom] || (c.nom.replace(/_id$/, '').replace(/_le$/, '').replace(/_/g, ' ').replace(/^./, m => m.toUpperCase()));
  const technique = c => c.cle && /uuid|integer|bigint/.test(c.udt || c.type) || c.nom === 'modifie_le';
  const genre = c => c.lien ? 'lien' : c.choix ? 'choix' : c.type === 'boolean' ? 'booleen' : /timestamp/.test(c.type) ? 'dateheure' : c.type === 'date' ? 'date'
    : /^(integer|bigint|smallint|numeric|real|double precision)$/.test(c.type) ? 'nombre' : /json/.test(c.type) ? 'json' : 'texte';
  const deux = n => String(n).padStart(2, '0');
  function afficher(c, v, liens) {
    if (v === null || v === undefined || v === '') return '<span class="muted">—</span>';
    const g = genre(c);
    if (g === 'lien') { const l = liens && liens[c.nom] && liens[c.nom][String(v)]; return l ? esc(l) : `<span class="mono small muted">${esc(String(v).slice(0, 8))}…</span>`; }
    if (g === 'booleen') return v ? '<span class="chip chip-success">Oui</span>' : '<span class="chip">Non</span>';
    if (g === 'dateheure' || g === 'date') { const d = new Date(v); if (isNaN(d)) return esc(v); return g === 'date' ? d.toLocaleDateString('fr-FR') : `${d.toLocaleDateString('fr-FR')} ${deux(d.getHours())}:${deux(d.getMinutes())}`; }
    if (g === 'nombre') return esc(Number(v).toLocaleString('fr-FR', { minimumFractionDigits: c.type === 'numeric' && String(v).includes('.') ? 2 : 0, maximumFractionDigits: 4 }));
    if (g === 'json') return `<span class="mono small">${esc(JSON.stringify(v).slice(0, 80))}</span>`;
    const s = String(v);
    return esc(s.length > 80 ? s.slice(0, 80) + '…' : s);
  }
  /** Champ de saisie adapté au type de la colonne. Les liens se choisissent dans une liste (chargée à part). */
  function champ(c, v, attr) {
    const g = genre(c), a = attr || '';
    const vide = c.nullable || v == null ? `<option value="">${c.nullable ? '—' : '(valeur par défaut)'}</option>` : '';
    if (g === 'choix') return `<select class="tv-select" ${a}>${vide}${c.choix.map(x => `<option ${String(v) === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    if (g === 'booleen') return `<select class="tv-select" ${a}>${vide}<option value="true" ${v === true ? 'selected' : ''}>Oui</option><option value="false" ${v === false ? 'selected' : ''}>Non</option></select>`;
    if (g === 'lien') return `<select class="tv-select" ${a} data-lien="${esc(c.lien.table)}" data-val="${esc(v == null ? '' : v)}"><option value="">${v == null ? '—' : 'Chargement…'}</option></select>`;
    if (g === 'dateheure') { const d = v ? new Date(v) : null; return `<input class="tv-input" type="datetime-local" ${a} value="${d && !isNaN(d) ? `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}` : ''}">`; }
    if (g === 'date') return `<input class="tv-input" type="date" ${a} value="${esc(v ? String(v).slice(0, 10) : '')}">`;
    if (g === 'nombre') return `<input class="tv-input" inputmode="decimal" ${a} value="${esc(v == null ? '' : String(v).replace('.', ','))}">`;
    if (g === 'json') return `<textarea class="tv-textarea mono" rows="4" ${a}>${esc(v == null ? '' : JSON.stringify(v, null, 1))}</textarea>`;
    return String(v || '').length > 60 ? `<textarea class="tv-textarea" rows="4" ${a}>${esc(v || '')}</textarea>` : `<input class="tv-input" ${a} value="${esc(v == null ? '' : v)}">`;
  }
  /** Valeur saisie → valeur envoyée à l'app. */
  function lire(c, el) {
    const g = genre(c), s = el.value;
    if (s === '') return g === 'texte' && !c.nullable ? '' : null;
    if (g === 'booleen') return s === 'true';
    if (g === 'dateheure') return new Date(s).toISOString();
    if (g === 'nombre') { const n = Number(s.replace(/\s/g, '').replace(',', '.')); if (isNaN(n)) throw new Error(`${libelleColonne(c)} : nombre attendu.`); return n; }
    if (g === 'json') { try { return JSON.parse(s); } catch (e) { throw new Error(`${libelleColonne(c)} : JSON invalide.`); } }
    return s;
  }
  async function remplirLiens(racine, api) {
    for (const sel of racine.querySelectorAll('select[data-lien]')) {
      try {
        const { choix } = await api.get(`tables/${encodeURIComponent(sel.dataset.lien)}/choix`);
        const v = sel.dataset.val;
        if (v && !choix.some(x => x.id === v)) choix.unshift({ id: v, libelle: v });
        sel.innerHTML = '<option value="">—</option>' + choix.map(x => `<option value="${esc(x.id)}" ${x.id === v ? 'selected' : ''}>${esc(x.libelle || x.id)}</option>`).join('');
      } catch (e) { sel.innerHTML = `<option value="${esc(sel.dataset.val)}">${esc(e.message)}</option>`; }
    }
  }

  /* ---------- Vue ---------- */
  G.vue = async function (racine, app) {
    const m = memoire[app.id] = memoire[app.id] || { onglet: null, table: null };
    racine.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Chargement…';
    let config = null;
    try { config = (await local('liste')).find(x => x.appId === app.id) || null; }
    catch (e) { racine.innerHTML = `<div class="bar warn"><span class="mdi mdi-lan-disconnect"></span><div>${esc(e.message)}</div></div>`; return; }
    const pret = () => config && config.url && config.cle;
    if (!m.onglet) m.onglet = pret() ? 'etat' : 'connexion';
    const api = client(app.id);

    function dessiner() {
      racine.innerHTML = `<div class="stack">
        ${app.kitApp === 'app-complete' ? '' : '<div class="bar info"><span class="mdi mdi-information-outline"></span><div>Cette gestion marche avec les apps construites sur le kit « App complète » (API /api/admin). Coche ce kit dans « Prompt et pack » pour tes prochaines apps.</div></div>'}
        <div class="row">${ONGLETS.map(([k, l, i]) => `<button class="btn btn-sm ${k === m.onglet ? 'btn-primary' : 'btn-outline'}" data-gs="${k}" ${k !== 'connexion' && !pret() ? 'disabled' : ''}><span class="mdi ${i}"></span>${esc(l)}</button>`).join('')}
          <span class="spacer"></span>${config && config.url ? `<span class="small muted mono">${esc(config.url)}</span>` : ''}</div>
        <div id="gsCorps"></div></div>`;
      racine.querySelectorAll('[data-gs]').forEach(b => b.onclick = () => { m.onglet = b.dataset.gs; dessiner(); });
      const corps = racine.querySelector('#gsCorps');
      const vues = { connexion, etat, donnees, comptes, journal, rgpd, sauvegarde };
      Promise.resolve(vues[m.onglet](corps)).catch(e => { corps.innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`; });
    }

    /* ----- Connexion : adresse et clé ----- */
    function connexion(corps) {
      corps.innerHTML = `<div class="grid grid-2"><div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-key-chain-variant"></span>Relier l’app à l’Atelier</span></div>
        <div class="panel-body stack">
          <div class="input-group"><label class="input-label">1. Adresse de l’app en ligne</label><input class="tv-input" id="gsUrl" placeholder="https://mon-app.fr" value="${esc((config && config.url) || (app.liens && app.liens.prod) || '')}"></div>
          <div class="input-group"><label class="input-label">2. Clé d’administration</label>
            <div class="row">${config && config.cle ? `<span class="chip chip-success"><span class="mdi mdi-check"></span>Clé enregistrée (${esc(config.apercu)})</span>` : '<span class="chip">Pas encore de clé</span>'}
            <button class="btn btn-outline btn-sm" id="gsGen"><span class="mdi mdi-key-plus"></span>${config && config.cle ? 'Nouvelle clé' : 'Générer une clé'}</button>
            ${config && config.cle ? '<button class="btn btn-ghost btn-sm" id="gsVoir"><span class="mdi mdi-eye-outline"></span>Revoir la clé</button>' : ''}
            <button class="btn btn-ghost btn-sm" id="gsColler"><span class="mdi mdi-content-paste"></span>J’ai déjà une clé</button></div></div>
          <div id="gsCle"></div>
          <div class="row"><button class="btn btn-primary" id="gsTester"><span class="mdi mdi-lan-connect"></span>Enregistrer et tester</button><span id="gsRes" class="small"></span></div>
        </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-help-circle-outline"></span>Comment ça marche</span></div>
        <div class="panel-body small stack">
          <p style="margin:0">L’Atelier ne se branche pas sur la base : il parle à l’app, qui fait le travail. Il lui faut seulement son adresse et une clé secrète partagée.</p>
          <ol style="margin:0;padding-left:18px"><li>Génère la clé ici.</li><li>Chez ton hébergeur, dans les <b>variables d’environnement</b> de l’app, ajoute <span class="mono">ADMIN_API_KEY</span> avec cette clé comme valeur, puis redémarre l’app.</li>
            <li>Reviens ici : « Enregistrer et tester ».</li></ol>
          <p style="margin:0">La clé reste sur ton ordinateur (serveur local de l’Atelier), jamais dans le navigateur ni dans le code. Si elle a fuité : « Nouvelle clé », puis remplace-la chez l’hébergeur.</p>
          <p style="margin:0">Compte admin de chaque app neuve : identifiant <span class="mono">admin</span>, mot de passe <span class="mono">adminadmin</span>, à changer à la première connexion (l’onglet État le rappelle tant que ce n’est pas fait).</p></div></div></div>`;
      const $ = s => corps.querySelector(s);
      const montrer = cle => {
        $('#gsCle').innerHTML = `<div class="bar warn"><span class="mdi mdi-key-alert-outline"></span><div class="stack" style="gap:6px"><div>Copie cette clé dans la variable <b class="mono">ADMIN_API_KEY</b> chez ton hébergeur, puis redémarre l’app.</div>
          <div class="row"><input class="tv-input mono" id="gsCleTxt" readonly value="${esc(cle)}"><button class="btn btn-outline btn-sm" id="gsCopier"><span class="mdi mdi-content-copy"></span>Copier</button></div></div></div>`;
        $('#gsCopier').onclick = async () => { try { await navigator.clipboard.writeText(cle); U.toast('success', 'Clé copiée'); } catch (e) { $('#gsCleTxt').select(); } };
      };
      $('#gsGen').onclick = async () => {
        if (config && config.cle && !(await U.confirm('Nouvelle clé', 'L’ancienne clé ne marchera plus : il faudra mettre la nouvelle chez l’hébergeur. Continuer ?', { okLabel: 'Générer' }))) return;
        try { const r = await local('config', { appId: app.id, generer: true }); config = r; montrer(r.nouvelleCle); $('#gsGen').innerHTML = '<span class="mdi mdi-key-plus"></span>Nouvelle clé'; }
        catch (e) { U.toast('error', 'Clé', e.message, 8000); }
      };
      if ($('#gsVoir')) $('#gsVoir').onclick = async () => { try { montrer((await local('reveler', { appId: app.id })).cle); } catch (e) { U.toast('error', 'Clé', e.message); } };
      $('#gsColler').onclick = async () => {
        const cle = await U.prompt('Clé existante', 'Colle la valeur de ADMIN_API_KEY (32 caractères minimum)');
        if (!cle) return;
        try { config = await local('config', { appId: app.id, cle }); U.toast('success', 'Clé enregistrée'); dessiner(); } catch (e) { U.toast('error', 'Clé', e.message, 8000); }
      };
      $('#gsTester').onclick = async () => {
        $('#gsRes').innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
        try {
          config = await local('config', { appId: app.id, url: $('#gsUrl').value });
          if (!config.cle) throw new Error('Génère d’abord la clé (étape 2).');
          const e = await api.get('etat');
          $('#gsRes').innerHTML = `<span class="chip chip-success"><span class="mdi mdi-check"></span>Connecté : ${esc(e.app.nom)} v${esc(e.app.version)}</span>`;
          if (app.liens && !app.liens.prod) { app.liens.prod = config.url; AB.apps.enregistrer(app); }
          setTimeout(() => { m.onglet = 'etat'; dessiner(); }, 900);
        } catch (e) { $('#gsRes').innerHTML = `<span class="chip chip-danger">${esc(e.message)}</span>`; }
      };
    }

    /* ----- État ----- */
    async function etat(corps) {
      corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
      const e = await api.get('etat');
      const taille = o => o > 1e9 ? (o / 1e9).toFixed(1) + ' Go' : o > 1e6 ? (o / 1e6).toFixed(1) + ' Mo' : Math.round(o / 1e3) + ' ko';
      const alertes = e.alertes.concat(e.optimisation.filter(o => o.niveau === 'erreur'));
      corps.innerHTML = `<div class="stack">
        ${alertes.map(a => `<div class="bar ${a.niveau === 'erreur' ? 'crit' : 'warn'}"><span class="mdi mdi-alert-outline"></span><div>${esc(a.texte)}</div></div>`).join('') || '<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>Tout va bien : aucune alerte.</div></div>'}
        <div class="grid grid-3">
          <div class="panel"><div class="panel-body"><div class="small muted">App</div><b>${esc(e.app.nom)}</b> v${esc(e.app.version)}<div class="small muted">${esc(e.app.env)} · kit ${esc(e.app.kit || '?')} · Node ${esc(e.app.node)}<br>démarrée le ${esc(U.fmtDate(e.app.demarre_le))}</div></div></div>
          <div class="panel"><div class="panel-body"><div class="small muted">Base</div><b>${e.base.tables} tables</b> · ~${e.base.lignes} lignes<div class="small muted">${esc(e.base.version)} · ${taille(e.base.taille)}</div></div></div>
          <div class="panel"><div class="panel-body"><div class="small muted">Comptes</div><b>${e.comptes.actifs} actifs</b> sur ${e.comptes.total}<div class="small muted">${e.comptes.admins} admin(s)</div></div></div></div>
        <div class="grid grid-2">
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-key-outline"></span>Variables d’environnement</span></div><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>
            ${e.variables.map(v => `<tr><td><span class="mono">${esc(v.cle)}</span><div class="small muted">${esc(v.role || '')}</div></td>
              <td>${v.definie ? (v.secret ? '<span class="chip chip-success">définie</span>' : `<span class="chip ${v.source === 'défaut' || v.source === 'defaut' ? '' : 'chip-success'}">${esc(v.valeur === '' || v.valeur == null ? '(vide)' : String(v.valeur))}</span>`) : v.obligatoire ? '<span class="chip chip-danger">absente</span>' : '<span class="chip">non définie</span>'}</td></tr>`).join('')}
          </tbody></table></div></div></div>
          <div class="stack">
            <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-speedometer"></span>Optimisation de la base</span></div><div class="panel-body small">
              ${e.optimisation.length ? '<ul style="margin:0;padding-left:18px">' + e.optimisation.map(o => `<li style="color:var(${o.niveau === 'erreur' ? '--color-danger' : '--text-2'})">${esc(o.texte)}</li>`).join('') + '</ul>' : '<span class="chip chip-success"><span class="mdi mdi-check"></span>Clés, index, fuseaux et montants conformes</span>'}</div></div>
            <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-database-arrow-up-outline"></span>Migrations appliquées</span></div><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>
              ${e.migrations.map(x => `<tr><td class="mono small">${esc(x.fichier)}</td><td class="small muted">${esc(U.fmtDate(x.applique_le))}</td></tr>`).join('')}</tbody></table></div></div></div></div></div></div>`;
    }

    /* ----- Données : le tableur ----- */
    async function donnees(corps) {
      corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
      const { tables } = await api.get('tables');
      const v = { page: 1, q: '', filtres: {}, tri: '', sens: '', d: null, techniques: false };
      if (!tables.some(t => t.nom === m.table)) m.table = (tables.find(t => !t.socle) || tables[0] || {}).nom;
      corps.innerHTML = `<div class="bd-grid"><div class="bd-liste" id="gsTables"></div><div id="gsGrille"></div></div>`;
      const listeTables = () => {
        corps.querySelector('#gsTables').innerHTML = tables.map(t => `<button class="bd-item ${t.nom === m.table ? 'active' : ''}" data-tb="${esc(t.nom)}" title="${esc(t.description)}">
          <span class="mdi ${t.socle ? 'mdi-cog-outline' : 'mdi-table'}"></span><span>${esc(t.libelle)}</span><span class="spacer"></span><span class="small muted">${t.lignes}</span></button>`).join('');
        corps.querySelectorAll('[data-tb]').forEach(b => b.onclick = () => { m.table = b.dataset.tb; Object.assign(v, { page: 1, q: '', filtres: {}, tri: '', sens: '' }); listeTables(); charger(); });
      };
      async function charger() {
        const g = corps.querySelector('#gsGrille');
        if (!m.table) { g.innerHTML = '<div class="empty">Aucune table.</div>'; return; }
        g.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
        const p = new URLSearchParams({ page: v.page, par: 50 });
        if (v.q) p.set('q', v.q);
        if (v.tri) { p.set('tri', v.tri); p.set('sens', v.sens); }
        Object.entries(v.filtres).forEach(([k, x]) => p.set('f.' + k, x));
        try { v.d = await api.get(`tables/${encodeURIComponent(m.table)}?${p}`); dessinerGrille(); }
        catch (e) { g.innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`; }
      }
      function dessinerGrille() {
        const d = v.d, t = d.table, ecrit = !t.lectureSeule && t.cle;
        const cols = t.colonnes.filter(c => v.techniques || !technique(c));
        const de = d.total ? (d.page - 1) * d.par + 1 : 0, a = Math.min(d.total, d.page * d.par);
        const filtrables = t.colonnes.filter(c => c.choix || c.type === 'boolean' || c.lien);
        corps.querySelector('#gsGrille').innerHTML = `<div class="stack">
          <div class="row"><b>${esc(t.libelle)}</b>${t.description ? `<span class="small muted">${esc(t.description)}</span>` : ''}<span class="spacer"></span>
            ${t.socle ? '<span class="chip">Se gère dans son onglet</span>' : !ecrit ? '<span class="chip chip-warning">Lecture seule</span>' : '<button class="btn btn-primary btn-sm" id="gsAjout"><span class="mdi mdi-plus"></span>Ajouter</button>'}
            <button class="btn btn-outline btn-sm" id="gsCsv"><span class="mdi mdi-file-delimited-outline"></span>CSV</button></div>
          <div class="row"><input class="tv-input" id="gsQ" style="max-width:260px" placeholder="Rechercher…" value="${esc(v.q)}">
            ${filtrables.map(c => `<select class="tv-select" data-filtre="${esc(c.nom)}" style="max-width:180px"><option value="">${esc(libelleColonne(c))} : tous</option>
              ${c.lien ? (v.filtres[c.nom] ? `<option selected value="${esc(v.filtres[c.nom])}">${esc((d.liens[c.nom] || {})[v.filtres[c.nom]] || v.filtres[c.nom])}</option>` : '') : (c.type === 'boolean' ? ['true', 'false'] : c.choix).map(x => `<option value="${esc(x)}" ${v.filtres[c.nom] === x ? 'selected' : ''}>${esc(x === 'true' ? 'Oui' : x === 'false' ? 'Non' : x)}</option>`).join('')}
              ${c.nullable ? `<option value="∅" ${v.filtres[c.nom] === '∅' ? 'selected' : ''}>(vide)</option>` : ''}</select>`).join('')}
            <span class="spacer"></span><label class="check small"><input type="checkbox" id="gsTech" ${v.techniques ? 'checked' : ''}> colonnes techniques</label></div>
          <div class="table-wrap bd-donnees"><table class="tv-table"><thead><tr>${cols.map(c => `<th data-tri="${esc(c.nom)}" title="${esc((c.description ? c.description + ' · ' : '') + c.nom + ' · ' + c.type)} · trier">${esc(libelleColonne(c))}${c.obligatoire ? ' *' : ''}${d.tri === c.nom ? ` <span class="mdi mdi-arrow-${d.sens === 'desc' ? 'down' : 'up'}"></span>` : ''}</th>`).join('')}${ecrit ? '<th></th>' : ''}</tr></thead>
          <tbody>${d.lignes.map((l, r) => `<tr>${cols.map(c => `<td data-r="${r}" data-c="${esc(c.nom)}" class="${ecrit && !c.lectureSeule ? 'bd-editable' : ''}">${afficher(c, l[c.nom], d.liens)}</td>`).join('')}
            ${ecrit ? `<td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-sup="${r}" title="Supprimer la ligne"><span class="mdi mdi-delete-outline"></span></button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${cols.length + 1}" class="muted">Aucune ligne.</td></tr>`}</tbody></table></div>
          <div class="row small"><span class="muted">${de}–${a} sur ${d.total}${ecrit ? ' · double-clic sur une case pour la modifier' : ''}</span><span class="spacer"></span>
            <button class="btn btn-outline btn-xs" id="gsPrec" ${d.page > 1 ? '' : 'disabled'}><span class="mdi mdi-chevron-left"></span>Précédent</button><button class="btn btn-outline btn-xs" id="gsSuiv" ${a < d.total ? '' : 'disabled'}>Suivant<span class="mdi mdi-chevron-right"></span></button></div></div>`;
        const $ = s => corps.querySelector(s);
        let attente;
        $('#gsQ').oninput = () => { clearTimeout(attente); attente = setTimeout(() => { v.q = $('#gsQ').value.trim(); v.page = 1; charger(); }, 350); };
        corps.querySelectorAll('[data-filtre]').forEach(s => {
          const c = t.colonnes.find(x => x.nom === s.dataset.filtre);
          if (c.lien) s.onfocus = async () => { if (s.dataset.charge) return; s.dataset.charge = 1; try { const { choix } = await api.get(`tables/${encodeURIComponent(c.lien.table)}/choix`); s.insertAdjacentHTML('beforeend', choix.filter(x => x.id !== v.filtres[c.nom]).map(x => `<option value="${esc(x.id)}">${esc(x.libelle || x.id)}</option>`).join('')); } catch (e) { /* liste vide */ } };
          s.onchange = () => { if (s.value) v.filtres[c.nom] = s.value; else delete v.filtres[c.nom]; v.page = 1; charger(); };
        });
        $('#gsTech').onchange = () => { v.techniques = $('#gsTech').checked; dessinerGrille(); };
        $('#gsPrec').onclick = () => { v.page--; charger(); };
        $('#gsSuiv').onclick = () => { v.page++; charger(); };
        $('#gsCsv').onclick = () => api.fichier(`tables/${encodeURIComponent(t.nom)}/csv`, t.nom + '.csv').catch(e => U.toast('error', 'Export', e.message));
        corps.querySelectorAll('[data-tri]').forEach(th => th.onclick = () => { v.sens = d.tri === th.dataset.tri && d.sens === 'asc' ? 'desc' : 'asc'; v.tri = th.dataset.tri; charger(); });
        if ($('#gsAjout')) $('#gsAjout').onclick = () => ajouter(t);
        corps.querySelectorAll('[data-sup]').forEach(b => b.onclick = () => supprimer(t, d.lignes[+b.dataset.sup]));
        corps.querySelectorAll('td.bd-editable').forEach(td => td.ondblclick = () => editer(td, t));
      }
      function editer(td, t) {
        if (td.querySelector('input, select, textarea')) return;
        const ligne = v.d.lignes[+td.dataset.r], c = t.colonnes.find(x => x.nom === td.dataset.c), ancien = ligne[c.nom];
        td.innerHTML = champ(c, ancien, 'data-ed');
        const el = td.querySelector('[data-ed]');
        if (genre(c) === 'lien') remplirLiens(td, api);
        el.focus();
        let fini = false;
        const annuler = () => { fini = true; td.innerHTML = afficher(c, ancien, v.d.liens); };
        const valider = async () => {
          if (fini) return; fini = true;
          let val;
          try { val = lire(c, el); } catch (e) { U.toast('error', 'Valeur refusée', e.message, 6000); return annuler(); }
          if (JSON.stringify(val) === JSON.stringify(ancien) || (val === null && ancien === null)) return annuler();
          td.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
          try {
            const { ligne: apres } = await api.patch(`tables/${encodeURIComponent(t.nom)}/${encodeURIComponent(ligne[t.cle])}`, { [c.nom]: val });
            Object.assign(ligne, apres);
            if (genre(c) === 'lien' && el.selectedOptions && el.selectedOptions[0]) (v.d.liens[c.nom] = v.d.liens[c.nom] || {})[String(val)] = el.selectedOptions[0].textContent;
            td.innerHTML = afficher(c, ligne[c.nom], v.d.liens);
            U.toast('success', 'Enregistré', `${t.libelle} · ${libelleColonne(c)}`, 2000);
          } catch (e) { td.innerHTML = afficher(c, ancien, v.d.liens); U.toast('error', 'Modification refusée', e.message, 8000); }
        };
        el.onkeydown = e => { if (e.key === 'Escape') annuler(); if (e.key === 'Enter' && el.tagName !== 'TEXTAREA') { e.preventDefault(); valider(); } };
        if (el.tagName === 'SELECT') el.onchange = valider;
        el.onblur = () => setTimeout(valider, 120);
      }
      async function supprimer(t, ligne) {
        const nom = t.affichage && ligne[t.affichage] ? `« ${ligne[t.affichage]} »` : 'cette ligne';
        if (!(await U.confirm('Supprimer', `Supprimer définitivement ${nom} de ${t.libelle} ? (journalisé)`, { danger: true, okLabel: 'Supprimer' }))) return;
        try { await api.del(`tables/${encodeURIComponent(t.nom)}/${encodeURIComponent(ligne[t.cle])}`); U.toast('success', 'Ligne supprimée'); const x = tables.find(y => y.nom === t.nom); if (x) x.lignes--; listeTables(); charger(); }
        catch (e) { U.toast('error', 'Suppression refusée', e.message, 8000); }
      }
      function ajouter(t) {
        const cols = t.colonnes.filter(c => !c.lectureSeule);
        const dlg = U.dialog({
          title: 'Ajouter dans ' + t.libelle, size: 'md',
          body: `<div class="stack"><div class="small muted">* obligatoire. Laisse vide pour la valeur par défaut.</div>${cols.map(c => `<div class="input-group"><label class="input-label">${esc(libelleColonne(c))}${c.obligatoire ? ' *' : ''}${c.description ? ` <span class="muted">· ${esc(c.description)}</span>` : ''}</label>${champ(c, null, `data-ins="${esc(c.nom)}"`)}</div>`).join('')}</div>`,
          actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Ajouter', cls: 'btn-primary', icon: 'mdi-plus', onClick: async ({ body }) => {
            const valeurs = {};
            try { body.querySelectorAll('[data-ins]').forEach(el => { const c = cols.find(x => x.nom === el.dataset.ins); const val = lire(c, el); if (val !== null && val !== '') valeurs[c.nom] = val; }); }
            catch (e) { U.toast('error', 'Ajout refusé', e.message, 6000); return false; }
            try { await api.post(`tables/${encodeURIComponent(t.nom)}`, valeurs); U.toast('success', 'Ligne ajoutée'); const x = tables.find(y => y.nom === t.nom); if (x) x.lignes++; listeTables(); charger(); }
            catch (e) { U.toast('error', 'Ajout refusé', e.message, 8000); return false; }
          } }]
        });
        remplirLiens(dlg.body, api);
      }
      listeTables();
      await charger();
    }

    /* ----- Comptes ----- */
    async function comptes(corps) {
      corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
      const { utilisateurs, roles } = await api.get('utilisateurs');
      const provisoire = (email, mdp) => U.dialog({ title: 'Mot de passe provisoire', size: 'sm',
        body: `<p style="margin-top:0">Transmets-le à <b>${esc(email)}</b> : il devra le changer à sa première connexion.</p><input class="tv-input mono" readonly value="${esc(mdp)}">`, actions: [{ label: 'Fermer', cls: 'btn-primary' }] });
      corps.innerHTML = `<div class="stack"><div class="row"><span class="small muted">${utilisateurs.length} compte(s)</span><span class="spacer"></span><button class="btn btn-primary btn-sm" id="gsNouv"><span class="mdi mdi-account-plus-outline"></span>Créer un compte</button></div>
        <div class="panel"><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Compte</th><th>Rôle</th><th>Actif</th><th>Dernière connexion</th><th></th></tr></thead><tbody>
        ${utilisateurs.map(u => `<tr><td><b>${esc(u.nom || u.email)}</b><div class="small muted">${esc(u.email)}${u.mdp_a_changer ? ' · <span class="chip chip-warning">mot de passe à changer</span>' : ''}</div></td>
          <td><select class="tv-select" data-role="${esc(u.id)}">${roles.map(r => `<option ${r === u.role ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-actif="${esc(u.id)}" ${u.actif ? 'checked' : ''}></td>
          <td class="small muted">${u.derniere_connexion_le ? esc(U.fmtDate(u.derniere_connexion_le)) : 'jamais'}</td>
          <td class="actions"><button class="btn btn-ghost btn-sm" data-mdp="${esc(u.id)}"><span class="mdi mdi-lock-reset"></span>Mot de passe</button><button class="btn btn-ghost btn-sm" data-edit="${esc(u.id)}"><span class="mdi mdi-pencil-outline"></span></button><button class="btn btn-ghost btn-icon btn-sm" data-supu="${esc(u.id)}"><span class="mdi mdi-delete-outline"></span></button></td></tr>`).join('')}
        </tbody></table></div></div></div></div>`;
      const trouve = id => utilisateurs.find(u => String(u.id) === id);
      const patch = async (id, corpsP, ok) => { try { await api.patch('utilisateurs/' + encodeURIComponent(id), corpsP); U.toast('success', ok); } catch (e) { U.toast('error', 'Refusé', e.message, 8000); } comptes(corps); };
      corps.querySelectorAll('[data-role]').forEach(s => s.onchange = () => patch(s.dataset.role, { role: s.value }, 'Rôle changé'));
      corps.querySelectorAll('[data-actif]').forEach(c => c.onchange = () => patch(c.dataset.actif, { actif: c.checked }, c.checked ? 'Compte réactivé' : 'Compte désactivé'));
      corps.querySelectorAll('[data-mdp]').forEach(b => b.onclick = async () => {
        const u = trouve(b.dataset.mdp);
        if (!(await U.confirm('Mot de passe provisoire', `Générer un nouveau mot de passe provisoire pour ${u.email} ? L’ancien ne marchera plus.`, { okLabel: 'Générer' }))) return;
        try { const r = await api.post(`utilisateurs/${encodeURIComponent(u.id)}/mdp`); provisoire(u.email, r.mdpProvisoire); comptes(corps); } catch (e) { U.toast('error', 'Refusé', e.message, 8000); }
      });
      corps.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
        const u = trouve(b.dataset.edit);
        U.dialog({ title: 'Modifier le compte', size: 'sm', body: `<div class="stack"><div class="input-group"><label class="input-label">Nom</label><input class="tv-input" id="gsUNom" value="${esc(u.nom || '')}"></div>
          <div class="input-group"><label class="input-label">Email (sert à se connecter)</label><input class="tv-input" id="gsUMail" value="${esc(u.email)}"></div></div>`,
          actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Enregistrer', cls: 'btn-primary', onClick: async ({ body }) => {
            const d = { nom: body.querySelector('#gsUNom').value };
            const mail = body.querySelector('#gsUMail').value.trim();
            if (mail !== u.email) d.email = mail;
            try { await api.patch('utilisateurs/' + encodeURIComponent(u.id), d); U.toast('success', 'Compte modifié'); comptes(corps); } catch (e) { U.toast('error', 'Refusé', e.message, 8000); return false; }
          } }] });
      });
      corps.querySelectorAll('[data-supu]').forEach(b => b.onclick = async () => {
        const u = trouve(b.dataset.supu);
        if (!(await U.confirm('Supprimer le compte', `Supprimer définitivement le compte ${u.email} ? (Pour une demande RGPD, utilise plutôt l’onglet RGPD.)`, { danger: true, okLabel: 'Supprimer' }))) return;
        try { await api.del('utilisateurs/' + encodeURIComponent(u.id)); U.toast('success', 'Compte supprimé'); comptes(corps); } catch (e) { U.toast('error', 'Refusé', e.message, 8000); }
      });
      corps.querySelector('#gsNouv').onclick = () => U.dialog({ title: 'Créer un compte', size: 'sm',
        body: `<div class="stack"><div class="input-group"><label class="input-label">Email</label><input class="tv-input" id="gsNMail" type="email"></div>
          <div class="input-group"><label class="input-label">Nom</label><input class="tv-input" id="gsNNom"></div>
          <div class="input-group"><label class="input-label">Rôle</label><select class="tv-select" id="gsNRole">${roles.map(r => `<option ${r === 'utilisateur' ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
          <div class="small muted">Un mot de passe provisoire est généré ; la personne choisit le sien à la première connexion.</div></div>`,
        actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Créer', cls: 'btn-primary', onClick: async ({ body }) => {
          try {
            const r = await api.post('utilisateurs', { email: body.querySelector('#gsNMail').value, nom: body.querySelector('#gsNNom').value, role: body.querySelector('#gsNRole').value });
            comptes(corps); provisoire(r.utilisateur.email, r.mdpProvisoire);
          } catch (e) { U.toast('error', 'Refusé', e.message, 8000); return false; }
        } }] });
    }

    /* ----- Journal ----- */
    async function journal(corps) {
      const f = { page: 1, action: '', q: '' };
      const NOMS_ACTIONS = { connexion: 'Connexion', connexion_refusee: 'Connexion refusée', installation: 'Installation', admin_defaut_cree: 'Compte admin par défaut créé', mdp_change: 'Mot de passe changé',
        mdp_reinitialise: 'Mot de passe provisoire', compte_cree: 'Compte créé', compte_modifie: 'Compte modifié', compte_supprime: 'Compte supprimé', donnees_ajoutees: 'Ligne ajoutée',
        donnees_modifiees: 'Ligne modifiée', donnees_supprimees: 'Ligne supprimée', donnees_exportees: 'Export CSV', rgpd_export: 'RGPD : export', rgpd_suppression: 'RGPD : suppression',
        sauvegarde: 'Sauvegarde', reglages_modifies: 'Réglages modifiés', inscription: 'Inscription', installation_refusee: 'Installation refusée' };
      async function charger() {
        corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
        const p = new URLSearchParams({ page: f.page, par: 50 });
        if (f.action) p.set('action', f.action);
        if (f.q) p.set('q', f.q);
        const j = await api.get('journal?' + p);
        const de = j.total ? (j.page - 1) * j.par + 1 : 0, a = Math.min(j.total, j.page * j.par);
        corps.innerHTML = `<div class="stack"><div class="row"><select class="tv-select" id="gsJAct" style="max-width:240px"><option value="">Toutes les actions</option>${j.actions.map(x => `<option value="${esc(x)}" ${x === f.action ? 'selected' : ''}>${esc(NOMS_ACTIONS[x] || x)}</option>`).join('')}</select>
          <input class="tv-input" id="gsJQ" style="max-width:260px" placeholder="Qui ou quoi…" value="${esc(f.q)}"></div>
          <div class="panel"><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Sur</th><th>Détail</th></tr></thead><tbody>
          ${j.lignes.map(l => `<tr><td class="small" style="white-space:nowrap">${esc(U.fmtDate(l.cree_le))}</td><td>${esc(l.acteur === 'atelier' ? 'Atelier (toi)' : l.acteur)}</td><td>${esc(NOMS_ACTIONS[l.action] || l.action)}</td><td class="small mono">${esc(l.cible)}</td>
            <td class="small muted" title="${esc(JSON.stringify(l.detail))}">${l.detail && Object.keys(l.detail).length ? esc(JSON.stringify(l.detail).slice(0, 100)) : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Rien pour l’instant.</td></tr>'}</tbody></table></div></div></div>
          <div class="row small"><span class="muted">${de}–${a} sur ${j.total}</span><span class="spacer"></span><button class="btn btn-outline btn-xs" id="gsJPrec" ${j.page > 1 ? '' : 'disabled'}>Précédent</button><button class="btn btn-outline btn-xs" id="gsJSuiv" ${a < j.total ? '' : 'disabled'}>Suivant</button></div></div>`;
        corps.querySelector('#gsJAct').onchange = e => { f.action = e.target.value; f.page = 1; charger(); };
        corps.querySelector('#gsJQ').onkeydown = e => { if (e.key === 'Enter') { f.q = e.target.value.trim(); f.page = 1; charger(); } };
        corps.querySelector('#gsJPrec').onclick = () => { f.page--; charger(); };
        corps.querySelector('#gsJSuiv').onclick = () => { f.page++; charger(); };
      }
      await charger();
    }

    /* ----- RGPD ----- */
    function rgpd(corps) {
      corps.innerHTML = `<div class="grid grid-2"><div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-shield-account-outline"></span>Demande d’une personne</span></div>
        <div class="panel-body stack"><div class="input-group"><label class="input-label">Email de la personne</label><input class="tv-input" id="gsREmail" type="email"></div>
          <div class="row"><button class="btn btn-outline" id="gsRExp"><span class="mdi mdi-download"></span>Exporter ses données</button><button class="btn btn-danger" id="gsRSup"><span class="mdi mdi-account-remove-outline"></span>Effacer ses données</button></div>
          <div id="gsRRes"></div></div></div>
        <div class="panel"><div class="panel-body small stack"><p style="margin:0"><b>Export</b> : toutes les données liées à cet email (compte et tables déclarées par l’app), en un fichier JSON à envoyer à la personne.</p>
          <p style="margin:0"><b>Effacement</b> : les données sont anonymisées ou supprimées selon les règles de l’app, puis le compte est supprimé. Irréversible ; tout est noté au journal.</p></div></div></div>`;
      const email = () => corps.querySelector('#gsREmail').value.trim().toLowerCase();
      corps.querySelector('#gsRExp').onclick = async () => {
        if (!email()) return U.toast('error', 'Email manquant');
        try { const d = await api.get('rgpd?email=' + encodeURIComponent(email())); U.download(`donnees-${email()}.json`, JSON.stringify(d, null, 2), 'application/json');
          corps.querySelector('#gsRRes').innerHTML = `<div class="bar ok"><span class="mdi mdi-check"></span><div>Export prêt : ${Object.entries(d.donnees).map(([k, x]) => `${esc(k)} (${x.length})`).join(', ') || 'aucune donnée trouvée'}.</div></div>`; }
        catch (e) { U.toast('error', 'Export', e.message, 8000); }
      };
      corps.querySelector('#gsRSup').onclick = () => {
        if (!email()) return U.toast('error', 'Email manquant');
        U.dialog({ title: 'Effacer les données', size: 'sm', body: `<p style="margin-top:0">Pour confirmer, recopie l’email : <b>${esc(email())}</b></p><input class="tv-input" id="gsRConf">`,
          actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Effacer', cls: 'btn-danger', onClick: async ({ body }) => {
            try { const r = await api.post('rgpd/supprimer', { email: email(), confirmer: body.querySelector('#gsRConf').value.trim().toLowerCase() });
              corps.querySelector('#gsRRes').innerHTML = `<div class="bar ok"><span class="mdi mdi-check"></span><div>Fait : ${Object.entries(r.bilan).map(([k, x]) => `${esc(k)} ${esc(x)}`).join(', ') || 'aucune donnée'}.</div></div>`; }
            catch (e) { U.toast('error', 'Effacement refusé', e.message, 8000); return false; }
          } }] });
      };
    }

    /* ----- Sauvegarde et réglages ----- */
    async function sauvegarde(corps) {
      corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
      const { reglages } = await api.get('reglages');
      corps.innerHTML = `<div class="grid grid-2"><div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-content-save-outline"></span>Sauvegarde</span></div>
        <div class="panel-body stack small"><p style="margin:0">Télécharge toutes les tables en un fichier lisible (JSON, sans mot de passe). La sauvegarde complète et automatique de la base se règle chez l’hébergeur.</p>
          <div><button class="btn btn-primary" id="gsSv"><span class="mdi mdi-download"></span>Télécharger la sauvegarde</button></div></div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cog-outline"></span>Réglages de l’app</span></div>
        <div class="panel-body stack">${reglages.map(r => `<div class="input-group"><label class="input-label">${esc(r.libelle || r.cle)}</label>
          ${r.type === 'booleen' ? `<select class="tv-select" data-rg="${esc(r.cle)}" ${r.impose ? 'disabled' : ''}><option value="true" ${r.valeur ? 'selected' : ''}>Oui</option><option value="false" ${!r.valeur ? 'selected' : ''}>Non</option></select>`
            : `<input class="tv-input" data-rg="${esc(r.cle)}" value="${esc(r.valeur == null ? '' : r.valeur)}" ${r.impose ? 'disabled title="Imposé par la variable APP_NOM"' : ''}>`}</div>`).join('')}
          <div><button class="btn btn-primary" id="gsRgOk"><span class="mdi mdi-content-save-outline"></span>Enregistrer</button></div></div></div></div>`;
      corps.querySelector('#gsSv').onclick = () => api.fichier('sauvegarde', 'sauvegarde.json').then(() => U.toast('success', 'Sauvegarde téléchargée')).catch(e => U.toast('error', 'Sauvegarde', e.message, 8000));
      corps.querySelector('#gsRgOk').onclick = async () => {
        const d = {};
        corps.querySelectorAll('[data-rg]:not([disabled])').forEach(el => { const r = reglages.find(x => x.cle === el.dataset.rg); d[r.cle] = r.type === 'booleen' ? el.value === 'true' : r.type === 'entier' ? Number(el.value) : el.value; });
        try { await api.put('reglages', d); U.toast('success', 'Réglages enregistrés'); } catch (e) { U.toast('error', 'Réglages', e.message, 8000); }
      };
    }

    dessiner();
  };
})();
