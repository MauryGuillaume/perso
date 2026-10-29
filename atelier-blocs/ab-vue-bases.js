/* ==========================================================================
   ab-vue-bases.js — écran « Bases de données »
   #/bases                          toutes les apps et leurs bases
   #/bases/<app>                    première base de l'app
   #/bases/<app>/<base>/<onglet>    une base : tables | sql | connexion | donnees | reglages
   Concevoir marche partout (même en fichier local). Se connecter à une base
   réelle passe par le serveur local : le mot de passe reste sur l'ordinateur.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc, B = AB.bases;
  AB.vues = AB.vues || {};

  /** Onglet Données : préférences gardées pendant la visite (confirmer avant d'écrire, journal de l'app, fermer les connexions). */
  const PREFS = { confirmer: true, journal: true, deconnecter: true };

  const moteurDefaut = app => app.origine === 'plateforme' || /supabase/i.test(app.stack || '') ? 'supabase' : 'postgres';
  const connexions = async () => { try { return await B.api('connexions'); } catch (e) { return null; } };
  const etatServeur = () => location.protocol === 'file:'
    ? `<b>Pour voir et modifier les données réelles, ouvre l’Atelier avec son serveur local</b> (le mot de passe de la base reste sur ton ordinateur, jamais dans le navigateur) :
      <ol style="margin:6px 0 0;padding-left:18px">
        <li>Ici : <a href="#" data-sauvegarde>exporter la sauvegarde</a> (tes apps et leurs bases : le navigateur range les données par adresse, la page http://localhost en a une autre).</li>
        <li>Dans le dossier de l’Atelier, double-clique sur <b>lancer-atelier</b> (<span class="mono">.command</span> sur Mac, <span class="mono">.bat</span> sur Windows), ou lance <span class="mono">node serveur.js</span>. Il faut Node.js.</li>
        <li>Dans la page qui s’ouvre (<a href="http://localhost:8787/">http://localhost:8787</a>) : Réglages › Restaurer, puis reviens sur l’app, onglet Base de données.</li></ol>`
    : 'Le serveur local ne répond pas : relance <b>lancer-atelier</b> (ou <span class="mono">node serveur.js</span>) dans le dossier de l’Atelier, puis recharge la page.';
  // Lien « exporter la sauvegarde » des messages ci-dessus
  document.addEventListener('click', async e => {
    const a = e.target.closest && e.target.closest('[data-sauvegarde]');
    if (!a) return;
    e.preventDefault();
    U.download(`atelier-blocs-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await AB.db.exportAll(), null, 2), 'application/json');
  });

  /** Dialogue « Nouvelle base » : renvoie la base ajoutée (déjà enregistrée) ou null. */
  function dialogueBase(app) {
    return new Promise(resolve => {
      let fait = false;
      U.dialog({
        title: 'Nouvelle base pour ' + app.nom, size: 'sm',
        body: `<div class="stack"><div class="input-group"><label class="input-label">Nom</label><input class="tv-input" id="nbNom" value="${(app.bases || []).length ? 'Base ' + ((app.bases || []).length + 1) : 'Base principale'}"></div>
          <div class="input-group"><label class="input-label">Moteur</label><select class="tv-select" id="nbMoteur">${Object.entries(B.MOTEURS).map(([k, l]) => `<option value="${k}" ${k === moteurDefaut(app) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>`,
        actions: [
          { label: 'Annuler', cls: 'btn-outline', onClick: () => resolve(null) },
          { label: 'Créer', cls: 'btn-primary', icon: 'mdi-plus', onClick: async ({ body }) => {
            if (fait) return;
            fait = true;
            const base = B.nouvelleBase(body.querySelector('#nbNom').value.trim() || 'Base', body.querySelector('#nbMoteur').value);
            app.bases = app.bases || [];
            app.bases.push(base);
            await AB.apps.enregistrer(app);
            resolve(base);
          } }
        ]
      });
    });
  }

  AB.vues.bases = async function (root, [appId, baseId, onglet]) {
    if (!appId) return accueil(root);
    const app = await AB.apps.get(appId);
    if (!app) throw new Error('App introuvable.');
    if (!(app.bases || []).length && B.de(app).length) await AB.apps.enregistrer(app);
    if (!baseId) {
      if (app.bases.length) { location.replace(`#/bases/${app.id}/${app.bases[0].id}`); return; }
      return sansBase(root, app);
    }
    const base = app.bases.find(b => b.id === baseId);
    if (!base) throw new Error('Base introuvable pour cette app.');
    return editeur(root, app, base, onglet || 'tables');
  };

  /* ======================= Vue d'ensemble ======================= */
  async function accueil(root) {
    AB.app.setCrumbs(['Bases de données']);
    const apps = await AB.apps.lister();
    for (const a of apps) if (!(a.bases || []).length && B.de(a).length) await AB.apps.enregistrer(a);
    const cx = await connexions();
    const parId = new Map((cx || []).map(c => [c.id, c]));
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Données</div><h2 class="section-title">Bases de données</h2>
        <p class="section-desc">Chaque app a au moins une base, et autant que nécessaire. Pour chaque base : toutes les tables et colonnes (clés, relations, index, règles d’accès), le SQL de création, une connexion à la base réelle, et un explorateur pour voir et modifier les données.</p></div></div>
      ${cx ? '' : `<div class="bar warn"><span class="mdi mdi-lan-disconnect"></span><div>${etatServeur()}</div></div>`}
      <div class="panel"><div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>App</th><th>Bases</th><th></th></tr></thead><tbody>
      ${apps.map(a => `<tr><td><span class="mdi ${esc(a.icone || 'mdi-cellphone')}"></span> <b>${esc(a.nom)}</b><div class="small muted">${a.origine === 'existante' ? esc(a.stack || 'App existante') : 'Créée dans l’Atelier'}</div></td>
        <td><div class="row" style="gap:6px">${(a.bases || []).map(b => {
          const c = parId.get(b.id);
          const n = B.tables(a, b).length;
          return `<a class="chip ${c ? 'chip-success' : ''}" href="#/bases/${esc(a.id)}/${esc(b.id)}" title="${c ? 'Connectée à ' + esc(c.hote + '/' + c.base) : 'Pas encore de connexion'}"><span class="mdi ${c ? 'mdi-database-check-outline' : 'mdi-database-outline'}"></span>${esc(b.nom)} · ${n} table${n > 1 ? 's' : ''}</a>`;
        }).join('') || '<span class="small muted">Aucune base</span>'}</div></td>
        <td class="actions"><button class="btn btn-outline btn-xs" data-ajout="${esc(a.id)}"><span class="mdi mdi-plus"></span>Ajouter une base</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucune app pour le moment.</td></tr>'}
      </tbody></table></div></div></div></div>`;
    root.querySelectorAll('[data-ajout]').forEach(b => b.onclick = async () => {
      const app = apps.find(a => a.id === b.dataset.ajout);
      const base = await dialogueBase(app);
      if (base) AB.app.go(`bases/${app.id}/${base.id}/tables`);
    });
  }

  function sansBase(root, app) {
    AB.app.setCrumbs(['Bases de données', app.nom]);
    root.innerHTML = `<div class="page"><div class="empty"><span class="mdi mdi-database-plus-outline"></span>${esc(app.nom)} n’a pas encore de base décrite ici.
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn btn-primary" id="sbAjout"><span class="mdi mdi-plus"></span>Ajouter une base</button></div></div></div>`;
    root.querySelector('#sbAjout').onclick = async () => { const b = await dialogueBase(app); if (b) AB.app.go(`bases/${app.id}/${b.id}/connexion`); };
  }

  /** Importe un fichier .sql ou schema.prisma dans une base (ajoute ou remplace les tables du même nom). */
  async function importerSchema(app, base, apres) {
    const f = await U.pickFile('.sql,.prisma,.txt');
    if (!f) return;
    let r;
    try { r = B.importerSchemaTexte(f.texte, f.nom, Object.assign({}, base)); }
    catch (e) { return U.toast('error', 'Import impossible', e.message); }
    const existantes = r.tables.filter(t => base.tables.some(x => x.nom === t.nom)).length;
    if (!(await U.confirm('Importer le schéma', `${r.tables.length} table(s) trouvée(s) dans ${f.nom}${existantes ? `, dont ${existantes} déjà présente(s) qui seront remplacées` : ''}. Les colonnes sont reprises telles quelles (noms, types, clés, liens).`, { okLabel: 'Importer' }))) return;
    if (!base.tables.length) base.conventions = { id: false, horodatage: false };
    r.tables.forEach(t => { const i = base.tables.findIndex(x => x.nom === t.nom); if (i >= 0) base.tables[i] = t; else base.tables.push(t); });
    if (r.prisma && base.moteur === 'supabase' && app.origine !== 'plateforme') base.moteur = 'postgres';
    await AB.apps.enregistrer(app);
    U.toast('success', `${r.tables.length} table(s) importée(s)`, 'Pour voir les lignes : onglet Données (connexion à la base).');
    apres();
  }

  /** Bases d'une app DANS son espace (composeur ou fiche) : choix de la base, concepteur, données, SQL, connexion.
      Renvoie { destroy }. */
  B.ecran = function (conteneur, app, depart) {
    let courant = null;
    const ouvrir = (baseId, onglet) => {
      if (courant && courant.destroy) courant.destroy();
      courant = null;
      B.de(app);
      const base = app.bases.find(b => b.id === baseId) || app.bases[0];
      if (!base) {
        conteneur.innerHTML = `<div class="panel"><div class="panel-body"><div class="empty"><span class="mdi mdi-database-plus-outline"></span>${esc(app.nom)} n’a pas encore de base décrite ici.
          <p class="small" style="max-width:560px;margin:8px auto 0">Ajoute sa base, puis importe ses tables depuis un fichier (migration SQL, schema.prisma) ou directement depuis la vraie base (onglet Connexion).</p>
          <div class="row" style="justify-content:center;margin-top:12px"><button class="btn btn-primary" id="sbAjout"><span class="mdi mdi-plus"></span>Ajouter une base</button>
            <button class="btn btn-outline" id="sbImport"><span class="mdi mdi-file-import-outline"></span>Importer un schéma (.sql, .prisma)</button></div></div></div></div>`;
        conteneur.querySelector('#sbAjout').onclick = async () => { const b = await dialogueBase(app); if (b) ouvrir(b.id, 'connexion'); };
        conteneur.querySelector('#sbImport').onclick = async () => {
          const b = B.nouvelleBase('Base principale', moteurDefaut(app));
          app.bases.push(b);
          await importerSchema(app, b, () => ouvrir(b.id, 'tables'));
          if (!b.tables.length) { app.bases.splice(app.bases.indexOf(b), 1); await AB.apps.enregistrer(app); }
        };
        return;
      }
      courant = editeur(conteneur, app, base, onglet || 'tables', { ouvrir });
      if (depart) depart.baseId = base.id;
    };
    ouvrir(depart && depart.baseId, depart && depart.onglet);
    return { destroy() { if (courant && courant.destroy) courant.destroy(); } };
  };

  /* ======================= Une base ======================= */
  const ONGLETS = [['tables', 'Tables', 'mdi-table-edit'], ['sql', 'SQL', 'mdi-code-braces'], ['connexion', 'Connexion', 'mdi-lan-connect'],
    ['donnees', 'Données', 'mdi-table-eye'], ['reglages', 'Réglages', 'mdi-cog-outline']];

  /* integre : { ouvrir(baseId, onglet) } quand l'éditeur est dans l'espace d'une app (onglet Base de données)
     plutôt que sur sa propre page. */
  function editeur(root, app, base, onglet, integre) {
    if (!integre) AB.app.setCrumbs(['Bases de données', app.nom, base.nom]);
    let timer = null;
    const sauver = () => { clearTimeout(timer); timer = setTimeout(() => { timer = null; AB.apps.enregistrer(app); }, 300); };
    let tableSel = null;   // onglet Tables
    let fermer = null;     // nettoyage de l'onglet courant

    root.innerHTML = integre ? `<div class="stack">
      <div class="row">${app.bases.map(b => `<button class="btn ${b === base ? 'btn-primary' : 'btn-outline'} btn-sm" data-base="${esc(b.id)}"><span class="mdi mdi-database-outline"></span>${esc(b.nom)}</button>`).join('')}
        <button class="btn btn-outline btn-sm" id="bdAjout"><span class="mdi mdi-plus"></span>Autre base</button>
        <button class="btn btn-outline btn-sm" id="bdImport" title="Fichier SQL (CREATE TABLE, migrations) ou schema.prisma"><span class="mdi mdi-file-import-outline"></span>Importer un schéma</button>
        <span class="spacer"></span><span class="small muted" id="bdDesc"></span><span id="bdTitre" hidden></span></div>
      <div class="panel"><div class="tabs" id="bdTabs" style="padding:0 8px"></div><div class="panel-body" id="bdCorps"></div></div></div>`
      : `<div class="page">
      <div class="page-head"><div><div class="section-tag">Base de données · ${esc(app.nom)}</div><h2 class="section-title" id="bdTitre">${esc(base.nom)}</h2>
        <p class="section-desc" id="bdDesc"></p></div>
        <div class="row">${app.bases.filter(b => b !== base).map(b => `<a class="btn btn-outline btn-sm" href="#/bases/${esc(app.id)}/${esc(b.id)}/${onglet}"><span class="mdi mdi-database-outline"></span>${esc(b.nom)}</a>`).join('')}
          <button class="btn btn-outline btn-sm" id="bdAjout"><span class="mdi mdi-plus"></span>Autre base</button>
          <button class="btn btn-outline btn-sm" id="bdImport" title="Fichier SQL (CREATE TABLE, migrations) ou schema.prisma"><span class="mdi mdi-file-import-outline"></span>Importer un schéma</button>
          <a class="btn btn-ghost btn-sm" href="#/apps/${esc(app.id)}"><span class="mdi mdi-arrow-left"></span>L’app</a></div></div>
      <div class="panel"><div class="tabs" id="bdTabs" style="padding:0 8px"></div><div class="panel-body" id="bdCorps"></div></div></div>`;
    const $ = s => root.querySelector(s);
    const majEntete = () => {
      $('#bdTitre').textContent = base.nom;
      const n = B.tables(app, base).length;
      $('#bdDesc').textContent = `${B.MOTEURS[base.moteur]} · ${n} table${n > 1 ? 's' : ''}${base.description ? ' · ' + base.description : ''}`;
    };
    majEntete();
    $('#bdAjout').onclick = async () => { const b = await dialogueBase(app); if (b) { if (integre) integre.ouvrir(b.id, 'tables'); else AB.app.go(`bases/${app.id}/${b.id}/tables`); } };
    $('#bdImport').onclick = () => importerSchema(app, base, () => { majEntete(); ouvrir('tables'); });
    root.querySelectorAll('[data-base]').forEach(b => b.onclick = () => integre.ouvrir(b.dataset.base, onglet));
    // Liens internes vers un autre onglet de la même base (marchent aussi dans l'espace de l'app)
    root.onclick = e => {   // propriété (et non écouteur ajouté) : remplacée quand une autre base s'ouvre dans le même conteneur
      const a = e.target.closest && e.target.closest('[data-bd-onglet]');
      if (a && root.contains(a)) { e.preventDefault(); ouvrir(a.dataset.bdOnglet); }
    };

    function dessinerOnglets() {
      $('#bdTabs').innerHTML = ONGLETS.map(([k, l, i]) => `<button class="tab ${k === onglet ? 'active' : ''}" data-tab="${k}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => ouvrir(t.dataset.tab));
    }
    function ouvrir(k) {
      if (fermer) fermer();
      fermer = null;
      onglet = ONGLETS.some(o => o[0] === k) ? k : 'tables';
      if (!integre) history.replaceState(null, '', `#/bases/${app.id}/${base.id}/${onglet}`);
      dessinerOnglets();
      const corps = $('#bdCorps');
      corps.innerHTML = '';
      const r = ({ tables, sql, connexion, donnees, reglages })[onglet](corps);
      fermer = typeof r === 'function' ? r : null;
    }

    /* ---------- Tables (concepteur) ---------- */
    function tables(corps) {
      const supa = base.moteur === 'supabase';
      corps.innerHTML = `<datalist id="bdTypes">${B.TYPES.map(([t, l]) => `<option value="${esc(t)}">${esc(l)}</option>`).join('')}</datalist>
        <div id="bdErreurs"></div>
        <div class="bd-grid"><div class="stack"><div id="bdListe" class="bd-liste"></div>
          <div class="row"><button class="btn btn-primary btn-sm" id="bdNouvelle"><span class="mdi mdi-table-plus"></span>Table</button>
            <button class="btn btn-outline btn-sm" id="bdIA"><span class="mdi mdi-creation"></span>Proposer avec l’IA</button></div></div>
          <div id="bdEditeur"></div></div>`;
      const toutes = () => B.tables(app, base);

      function majGauche() {
        const err = B.verifier(app, base);
        corps.querySelector('#bdErreurs').innerHTML = err.length ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div><b>À corriger avant d’utiliser le SQL :</b><ul style="margin:4px 0 0;padding-left:18px">${err.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : '';
        corps.querySelector('#bdListe').innerHTML = toutes().map(t => `<button class="bd-item ${t.id === tableSel ? 'active' : ''}" data-sel="${esc(t.id)}">
          <span class="mdi ${t.bloc ? 'mdi-puzzle-outline' : 'mdi-table'}"></span><span class="mono">${esc(t.nom)}</span><span class="spacer"></span><span class="small muted">${B.colonnes(base, t).length} col.</span></button>`).join('')
          || '<div class="small muted">Aucune table : ajoute la première, ou demande une proposition à l’IA.</div>';
        corps.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { tableSel = b.dataset.sel; majGauche(); dessinerEditeur(); });
        majEntete();
      }

      /** Colonnes que l'on peut viser par une relation : clés et colonnes uniques. */
      function cibles() {
        const out = supa ? ['auth.users.id'] : [];
        toutes().forEach(t => B.colonnes(base, t).filter(c => c.cle || c.unique).forEach(c => out.push(`${t.nom}.${c.nom}`)));
        return out;
      }

      function dessinerEditeur() {
        const ed = corps.querySelector('#bdEditeur');
        const t = toutes().find(x => x.id === tableSel);
        if (!t) { ed.innerHTML = '<div class="empty"><span class="mdi mdi-table-arrow-left"></span>Choisis une table à gauche.</div>'; return; }
        const auto = B.colonnes(base, t).filter(c => c.auto);
        const ligneAuto = c => `<tr class="bd-auto"><td class="mono">${esc(c.nom)}</td><td class="mono small">${esc(c.type)}</td><td>${c.cle ? '<span class="mdi mdi-key-variant"></span>' : ''}</td><td>${c.requis ? '<span class="mdi mdi-check"></span>' : ''}</td><td></td>
          <td class="mono small">${esc(c.defaut || '')}</td><td class="mono small">${esc(c.reference || '')}</td><td colspan="3"><span class="chip">automatique</span></td></tr>`;
        if (t.bloc) {
          ed.innerHTML = `<div class="stack"><div class="bar info"><span class="mdi mdi-puzzle-outline"></span><div>Table <b class="mono">${esc(t.nom)}</b> fournie par le bloc <b>${esc(t.bloc)}</b> : elle se modifie dans l’écran Blocs. Accès : ${esc(AB.blocs.ACCES_TABLE[t.acces] || t.acces)}.</div></div>
            <div class="table-wrap"><table class="tv-table"><thead><tr><th>Colonne</th><th>Type</th><th>Clé</th><th>Obligatoire</th><th>Unique</th><th>Par défaut</th></tr></thead><tbody>
            ${B.colonnes(base, t).map(c => `<tr><td class="mono">${esc(c.nom)}</td><td class="mono small">${esc(c.type)}</td><td>${c.cle ? '<span class="mdi mdi-key-variant"></span>' : ''}</td><td>${c.requis ? '<span class="mdi mdi-check"></span>' : ''}</td><td>${c.unique ? '<span class="mdi mdi-check"></span>' : ''}</td><td class="mono small">${esc(c.defaut || '')}</td></tr>`).join('')}
            </tbody></table></div></div>`;
          return;
        }
        const opts = cibles();
        ed.innerHTML = `<div class="stack">
          <div class="grid grid-2"><div class="input-group"><label class="input-label">Nom de la table</label><input class="tv-input mono" data-t="nom" value="${esc(t.nom)}"></div>
            <div class="input-group"><label class="input-label">Description</label><input class="tv-input" data-t="description" value="${esc(t.description)}" placeholder="Ce que contient la table"></div></div>
          ${supa ? `<div class="grid grid-2"><label class="check"><input type="checkbox" data-t="proprietaire" ${t.proprietaire ? 'checked' : ''}>Ligne liée à l’utilisateur connecté (colonne utilisateur)</label>
            <div class="input-group"><label class="input-label">Qui peut lire et écrire (RLS)</label><select class="tv-select" data-t="acces">${Object.entries(AB.blocs.ACCES_TABLE).map(([k, l]) => `<option value="${k}" ${k === t.acces ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>` : ''}
          <div class="table-wrap"><table class="tv-table bd-cols"><thead><tr><th>Colonne</th><th>Type</th><th title="Clé primaire">Clé</th><th title="Obligatoire (not null)">Oblig.</th><th>Unique</th><th>Par défaut</th><th>Lien vers</th><th>Si la ligne liée est supprimée</th><th>Description</th><th></th></tr></thead><tbody>
          ${auto.filter(c => c.nom !== 'cree_le' && c.nom !== 'modifie_le').map(ligneAuto).join('')}
          ${t.colonnes.map((c, i) => `<tr>
            <td><input class="tv-input mono" data-c="${i}" data-k="nom" value="${esc(c.nom)}" aria-label="Nom de la colonne"></td>
            <td><input class="tv-input mono" list="bdTypes" data-c="${i}" data-k="type" value="${esc(c.type)}" aria-label="Type"></td>
            <td><input type="checkbox" data-c="${i}" data-k="cle" ${c.cle ? 'checked' : ''} aria-label="Clé primaire"></td>
            <td><input type="checkbox" data-c="${i}" data-k="requis" ${c.requis || c.cle ? 'checked' : ''} ${c.cle ? 'disabled' : ''} aria-label="Obligatoire"></td>
            <td><input type="checkbox" data-c="${i}" data-k="unique" ${c.unique ? 'checked' : ''} ${c.cle ? 'disabled' : ''} aria-label="Unique"></td>
            <td><input class="tv-input mono" data-c="${i}" data-k="defaut" value="${esc(c.defaut)}" placeholder="—" aria-label="Valeur par défaut"></td>
            <td><select class="tv-select mono" data-c="${i}" data-k="reference" aria-label="Lien vers"><option value="">—</option>${opts.concat(c.reference && !opts.includes(c.reference) ? [c.reference] : []).map(o => `<option ${o === c.reference ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>
            <td><select class="tv-select" data-c="${i}" data-k="surSuppression" ${c.reference && c.reference !== 'auth.users.id' ? '' : 'disabled'} aria-label="Si la ligne liée est supprimée">${Object.entries(B.SUPPRESSION).map(([k, l]) => `<option value="${k}" ${k === c.surSuppression ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></td>
            <td><input class="tv-input" data-c="${i}" data-k="description" value="${esc(c.description)}" aria-label="Description"></td>
            <td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-act="haut" data-i="${i}" title="Monter" ${i ? '' : 'disabled'}><span class="mdi mdi-arrow-up"></span></button><button class="btn btn-ghost btn-icon btn-sm" data-act="sup-col" data-i="${i}" title="Supprimer la colonne"><span class="mdi mdi-delete-outline"></span></button></td></tr>`).join('')}
          ${auto.filter(c => c.nom === 'cree_le' || c.nom === 'modifie_le').map(ligneAuto).join('')}
          </tbody></table></div>
          <div class="row"><button class="btn btn-outline btn-sm" data-act="col"><span class="mdi mdi-plus"></span>Colonne</button></div>
          <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-lightning-bolt-outline"></span>Index (recherches rapides)</span><div class="spacer"></div><button class="btn btn-outline btn-xs" data-act="ix"><span class="mdi mdi-plus"></span>Index</button></div>
            <div class="panel-body stack">${(t.index || []).map((ix, i) => `<div class="row"><input class="tv-input mono" style="flex:1" data-ix="${i}" data-k="colonnes" value="${esc(ix.colonnes)}" placeholder="colonne1, colonne2">
              <label class="check"><input type="checkbox" data-ix="${i}" data-k="unique" ${ix.unique ? 'checked' : ''}>Unique</label>
              <button class="btn btn-ghost btn-icon btn-sm" data-act="sup-ix" data-i="${i}" title="Supprimer l’index"><span class="mdi mdi-delete-outline"></span></button></div>`).join('') || '<span class="small muted">Aucun index en plus de ceux des clés et des liens (créés automatiquement).</span>'}</div></div>
          <div class="row"><span class="spacer"></span><button class="btn btn-danger-text btn-sm" data-act="sup-table"><span class="mdi mdi-table-remove"></span>Supprimer la table</button></div></div>`;

        ed.onchange = e => {
          const el = e.target, k = el.dataset.k || el.dataset.t;
          let v = el.type === 'checkbox' ? el.checked : el.value.trim();
          let structure = false;
          if (el.dataset.t) {
            if (k === 'nom') {
              v = B.nomSql(v) || t.nom;
              base.tables.forEach(x => x.colonnes.forEach(c => { if (c.reference && c.reference.split('.')[0] === t.nom) c.reference = v + '.' + c.reference.split('.')[1]; }));
            }
            if (k === 'proprietaire' && v && t.acces === 'serveur') t.acces = 'proprietaire';
            t[k] = v;
            structure = k !== 'description';
          } else if (el.dataset.c !== undefined) {
            const c = t.colonnes[+el.dataset.c];
            if (k === 'nom') {
              v = B.nomSql(v) || c.nom;
              base.tables.forEach(x => x.colonnes.forEach(y => { if (y.reference === `${t.nom}.${c.nom}`) y.reference = `${t.nom}.${v}`; }));
            }
            if (k === 'type') v = v || 'text';
            if (k === 'cle' && v) c.requis = true;
            c[k] = v;
            structure = ['nom', 'cle', 'reference'].includes(k);
          } else if (el.dataset.ix !== undefined) {
            t.index[+el.dataset.ix][k] = v;
          } else return;
          sauver();
          majGauche();
          if (structure) dessinerEditeur();
        };
        ed.onclick = async e => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          const i = +b.dataset.i;
          if (b.dataset.act === 'col') t.colonnes.push(B.nouvelleColonne('colonne_' + (t.colonnes.length + 1)));
          if (b.dataset.act === 'sup-col') t.colonnes.splice(i, 1);
          if (b.dataset.act === 'haut') t.colonnes.splice(i - 1, 0, t.colonnes.splice(i, 1)[0]);
          if (b.dataset.act === 'ix') (t.index = t.index || []).push({ colonnes: '', unique: false });
          if (b.dataset.act === 'sup-ix') t.index.splice(i, 1);
          if (b.dataset.act === 'sup-table') {
            if (!(await U.confirm('Supprimer la table', `La table « ${t.nom} » sera retirée du schéma. Une base déjà créée n’est pas touchée.`, { danger: true, okLabel: 'Supprimer' }))) return;
            base.tables.splice(base.tables.indexOf(t), 1);
            tableSel = (toutes()[0] || {}).id;
          }
          sauver();
          majGauche();
          dessinerEditeur();
          if (b.dataset.act === 'col') { const champs = ed.querySelectorAll('[data-k="nom"][data-c]'); if (champs.length) champs[champs.length - 1].select(); }
        };
      }

      corps.querySelector('#bdNouvelle').onclick = async () => {
        const nom = await U.prompt('Nouvelle table', 'Nom (ex. clients, commandes, rendez_vous)', '');
        if (!nom) return;
        const t = B.nouvelleTable(nom);
        if (toutes().some(x => x.nom === t.nom)) return U.toast('error', 'Cette table existe déjà', t.nom);
        if (base.moteur === 'supabase') t.proprietaire = true;
        base.tables.push(t);
        tableSel = t.id;
        sauver(); majGauche(); dessinerEditeur();
      };
      corps.querySelector('#bdIA').onclick = () => proposerIA(() => { majGauche(); dessinerEditeur(); });

      if (!tableSel || !toutes().some(t => t.id === tableSel)) tableSel = (toutes()[0] || {}).id;
      majGauche();
      dessinerEditeur();
    }

    /** L'IA propose les tables à partir de la description de l'app (via le serveur local ; sinon copier-coller). */
    async function proposerIA(apres) {
      const etat = await AB.ia.etat();
      const consigne = B.consigneIA(app, base);
      const dlg = U.dialog({
        title: 'Proposer les tables avec l’IA', size: 'lg',
        body: `<div class="stack"><div class="input-group"><label class="input-label">Ce que fait l’app (utilisateurs, objets gérés, parcours)</label>
          <textarea class="tv-textarea" id="iaDesc" rows="5">${esc([app.description, app.notes].filter(Boolean).join('\n'))}</textarea></div>
          ${etat.ia ? '' : `<div class="bar info"><span class="mdi mdi-information-outline"></span><div>Pas d’IA branchée sur le serveur local : copie la demande dans Claude, puis colle sa réponse ci-dessous.</div></div>
            <div class="row"><button class="btn btn-outline btn-sm" id="iaCopier"><span class="mdi mdi-content-copy"></span>Copier la demande</button></div>
            <textarea class="tv-textarea code" id="iaReponse" rows="6" placeholder="Réponse JSON de l’IA"></textarea>`}
          <div id="iaApercu" class="small"></div></div>`,
        actions: [{ label: 'Fermer', cls: 'btn-outline' },
          { label: etat.ia ? 'Proposer' : 'Lire la réponse', cls: 'btn-primary', icon: 'mdi-creation', onClick: async ({ body }) => { await lancer(body); return false; } }]
      });
      const demande = () => `${consigne}\n\nL'app « ${app.nom} » :\n${dlg.body.querySelector('#iaDesc').value.trim()}`;
      const copier = dlg.body.querySelector('#iaCopier');
      if (copier) copier.onclick = () => navigator.clipboard.writeText(demande()).then(() => U.toast('success', 'Demande copiée', 'Colle-la dans Claude.'));
      let proposition = null;
      async function lancer(body) {
        const apercu = body.querySelector('#iaApercu');
        if (proposition) return ajouter(apercu);
        try {
          apercu.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Conception en cours…';
          let texte;
          if (etat.ia) {
            const r = await fetch((await AB.ia.adresse()) + '/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systeme: consigne, message: `L'app « ${app.nom} » :\n${body.querySelector('#iaDesc').value.trim()}` }) });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(d.erreur || `Le serveur local a répondu ${r.status}.`);
            texte = d.texte;
          } else texte = body.querySelector('#iaReponse').value;
          const noms = new Set(B.tables(app, base).map(t => t.nom));
          proposition = B.depuisProposition(AB.ia.lireReponse(texte), base).filter(t => !noms.has(t.nom));
          if (!proposition.length) { proposition = null; apercu.textContent = 'Aucune nouvelle table proposée.'; return; }
          apercu.innerHTML = `<b>${proposition.length} table(s) proposée(s) :</b><ul style="margin:4px 0;padding-left:18px">${proposition.map(t => `<li><span class="mono">${esc(t.nom)}</span> : ${t.colonnes.map(c => esc(c.nom)).join(', ')}</li>`).join('')}</ul>Clique encore pour les ajouter au schéma.`;
          dlg.body.closest('.dlg').querySelector('.dlg-foot .btn-primary').lastChild.textContent = `Ajouter ${proposition.length} table(s)`;
        } catch (e) { apercu.innerHTML = `<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`; }
      }
      function ajouter() {
        base.tables.push(...proposition);
        tableSel = proposition[0].id;
        sauver();
        dlg.close();
        U.toast('success', `${proposition.length} table(s) ajoutée(s)`, 'Relis-les et ajuste les colonnes.');
        apres();
      }
    }

    /* ---------- SQL ---------- */
    function sql(corps) {
      const err = B.verifier(app, base), texte = B.sql(app, base);
      const relations = [];
      B.tables(app, base).forEach(t => B.colonnes(base, t).filter(c => c.reference).forEach(c => relations.push(`<li><span class="mono">${esc(t.nom)}.${esc(c.nom)}</span> → <span class="mono">${esc(c.reference)}</span> <span class="muted">(${esc(c.reference === 'auth.users.id' ? 'supprimer aussi' : B.SUPPRESSION[c.surSuppression || 'restrict'].toLowerCase())} si la ligne liée est supprimée)</span></li>`)));
      const fichier = `${U.slug(app.nom)}-${U.slug(base.nom)}.sql`;
      corps.innerHTML = `<div class="stack">
        ${err.length ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div>Le schéma a ${err.length} point(s) à corriger (onglet Tables).</div></div>` : ''}
        <div class="bar info"><span class="mdi mdi-information-outline"></span><div>SQL rejouable : il crée ce qui manque et ne supprime rien. Il est aussi inclus dans le ZIP de l’app${app.origine === 'plateforme' && app.bases[0] === base && base.moteur === 'supabase' ? ' (supabase/migrations/0001_init.sql)' : ` (bases/${esc(U.slug(base.nom))}.sql)`}. Pour l’appliquer directement, utilise l’onglet Connexion.</div></div>
        ${relations.length ? `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-relation-many-to-one"></span>Relations (${relations.length})</span></div><div class="panel-body"><ul style="margin:0;padding-left:18px">${relations.join('')}</ul></div></div>` : ''}
        <div class="row"><button class="btn btn-primary btn-sm" id="sqlDl"><span class="mdi mdi-download"></span>${esc(fichier)}</button><button class="btn btn-outline btn-sm" id="sqlCopier"><span class="mdi mdi-content-copy"></span>Copier</button></div>
        <pre class="code">${esc(texte)}</pre></div>`;
      corps.querySelector('#sqlDl').onclick = () => U.download(fichier, texte, 'application/sql;charset=utf-8');
      corps.querySelector('#sqlCopier').onclick = () => navigator.clipboard.writeText(texte).then(() => U.toast('success', 'SQL copié'));
    }

    /* ---------- Connexion ---------- */
    async function connexion(corps) {
      corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Connexion au serveur local…';
      const liste = await connexions();
      if (!liste) { corps.innerHTML = `<div class="bar warn"><span class="mdi mdi-lan-disconnect"></span><div>${etatServeur()}</div></div>`; return; }
      let c = liste.find(x => x.id === base.id);
      let mode = 'champs';
      corps.innerHTML = `<div class="stack">
        <div class="bar info"><span class="mdi mdi-shield-lock-outline"></span><div>Le mot de passe est envoyé une seule fois au serveur local, qui le garde sur cet ordinateur (fichier <span class="mono">~/.atelier-blocs/connexions.json</span>, lisible par toi seul). Il n’est jamais renvoyé au navigateur, ni mis dans l’app ou son export.</div></div>
        ${base.moteur === 'supabase' ? '<div class="small muted">Supabase : Project Settings → Database → Connection string (URI, « Session pooler »), en remplaçant [YOUR-PASSWORD] par le mot de passe de la base.</div>' : ''}
        <div class="tabs" id="cxModes"></div><div id="cxForm"></div>
        <div class="row"><label class="check"><input type="checkbox" id="cxSsl">Connexion chiffrée (TLS)</label><label class="check"><input type="checkbox" id="cxVerif">Vérifier le certificat</label>
          <label class="check"><input type="checkbox" id="cxLecture">Lecture seule (aucune modification possible)</label></div>
        <div class="row"><button class="btn btn-primary" id="cxEnr"><span class="mdi mdi-content-save-outline"></span>Enregistrer et tester</button>
          <button class="btn btn-outline" id="cxTest"><span class="mdi mdi-lan-check"></span>Tester</button>
          <button class="btn btn-outline" id="cxCreer" hidden><span class="mdi mdi-database-plus-outline"></span>Créer la base sur le serveur</button>
          <span class="spacer"></span><button class="btn btn-danger-text" id="cxOublier"><span class="mdi mdi-link-variant-off"></span>Oublier la connexion</button></div>
        <div id="cxEtat" class="small"></div>
        <div class="panel" id="cxSync"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-database-sync-outline"></span>Schéma de la base réelle</span></div>
          <div class="panel-body stack"><p class="muted" style="margin:0">Compare la base réelle au schéma conçu ici, puis crée ce qui manque (tables, colonnes, relations, RLS). Rien n’est jamais supprimé. Pour une app existante, importe d’abord ses tables dans le concepteur.</p>
            <div class="row"><button class="btn btn-outline" id="cxComparer"><span class="mdi mdi-compare-horizontal"></span>Comparer avec le schéma</button>
              <button class="btn btn-outline" id="cxImporter"><span class="mdi mdi-database-import-outline"></span>Importer les tables de la base</button></div>
            <div id="cxResultat"></div></div></div></div>`;
      const $c = s => corps.querySelector(s);
      const etat = h => { $c('#cxEtat').innerHTML = h; };
      const attente = t => etat(`<span class="mdi mdi-loading mdi-spin"></span> ${esc(t)}`);
      const erreur = e => etat(`<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`);

      function dessinerForm() {
        $c('#cxModes').innerHTML = [['champs', 'Champs'], ['chaine', 'Chaîne de connexion']].map(([k, l]) => `<button class="tab ${k === mode ? 'active' : ''}" data-mode="${k}">${l}</button>`).join('');
        corps.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; dessinerForm(); });
        const mdp = c && c.motdepasse ? '•••••••• (enregistré, laisser vide pour le garder)' : '';
        $c('#cxForm').innerHTML = mode === 'chaine'
          ? `<div class="input-group"><label class="input-label">Chaîne de connexion</label><input class="tv-input mono" type="password" id="cxChaine" autocomplete="off" placeholder="postgres://utilisateur:motdepasse@hote:5432/base?sslmode=require"><div class="input-hint">Masquée car elle contient le mot de passe.</div></div>`
          : `<div class="grid grid-2"><div class="input-group"><label class="input-label">Hôte</label><input class="tv-input mono" id="cxHote" value="${esc(c ? c.hote : 'localhost')}"></div>
              <div class="input-group"><label class="input-label">Port</label><input class="tv-input mono" id="cxPort" inputmode="numeric" value="${esc(c ? c.port : 5432)}"></div>
              <div class="input-group"><label class="input-label">Base</label><input class="tv-input mono" id="cxBase" value="${esc(c ? c.base : B.nomSql(app.nom))}"></div>
              <div class="input-group"><label class="input-label">Utilisateur</label><input class="tv-input mono" id="cxUtil" autocomplete="off" value="${esc(c ? c.utilisateur : 'postgres')}"></div>
              <div class="input-group"><label class="input-label">Mot de passe</label><input class="tv-input" type="password" id="cxMdp" autocomplete="new-password" placeholder="${esc(mdp)}"></div></div>`;
      }
      function dessinerEtat() {
        $c('#cxSsl').checked = c ? c.ssl !== false : base.moteur === 'supabase';
        $c('#cxVerif').checked = c ? c.verifier !== false : true;
        $c('#cxLecture').checked = !!(c && c.lectureSeule);
        ['#cxTest', '#cxOublier'].forEach(s => { $c(s).disabled = !c; });
        $c('#cxSync').hidden = !c;
        if (c && !$c('#cxEtat').innerHTML) etat(`<span class="chip chip-success">Connexion enregistrée</span> ${esc(c.utilisateur)}@${esc(c.hote)}:${esc(c.port)}/${esc(c.base)}${c.lectureSeule ? ' · lecture seule' : ''}`);
      }
      async function tester() {
        attente('Test de la connexion…');
        $c('#cxCreer').hidden = true;
        try {
          const r = await B.api('tester', { id: base.id });
          etat(`<span class="chip chip-success">Connectée</span> ${esc(r.version)} · base <b>${esc(r.base)}</b> (${esc(r.taille)}, ${r.tables} table(s)) · utilisateur ${esc(r.utilisateur)}`);
        } catch (e) {
          erreur(e);
          if (/n’existe pas|does not exist/i.test(e.message) && /base|database/i.test(e.message)) $c('#cxCreer').hidden = false;
        }
      }
      $c('#cxEnr').onclick = async () => {
        const v = { id: base.id, nom: `${app.nom} · ${base.nom}`, appId: app.id, ssl: $c('#cxSsl').checked, verifier: $c('#cxVerif').checked, lectureSeule: $c('#cxLecture').checked };
        if (mode === 'chaine') {
          v.chaine = $c('#cxChaine').value.trim();
          if (!v.chaine) return etat('Colle la chaîne de connexion.');
          if (!/^postgres(ql)?:\/\//.test(v.chaine)) return etat('La chaîne doit commencer par postgres://');
        } else Object.assign(v, { hote: $c('#cxHote').value.trim(), port: $c('#cxPort').value.trim(), base: $c('#cxBase').value.trim(), utilisateur: $c('#cxUtil').value.trim(), motdepasse: $c('#cxMdp').value });
        attente('Enregistrement…');
        try {
          c = await B.api('enregistrer', v);
          if (v.chaine && /sslmode=/.test(v.chaine)) { /* la chaîne décide du TLS */ } else if (v.chaine) c = await B.api('enregistrer', Object.assign({}, c, { id: base.id, ssl: v.ssl, verifier: v.verifier, lectureSeule: v.lectureSeule, motdepasse: '' }));
          mode = 'champs';
          dessinerForm(); dessinerEtat();
          await tester();
        } catch (e) { erreur(e); }
      };
      $c('#cxTest').onclick = tester;
      $c('#cxCreer').onclick = async () => {
        if (!(await U.confirm('Créer la base', `Créer la base « ${c.base} » sur ${c.hote} ? L’utilisateur ${c.utilisateur} doit en avoir le droit.`, { okLabel: 'Créer' }))) return;
        attente('Création de la base…');
        try { await B.api('creer-base', { id: base.id }); U.toast('success', 'Base créée', c.base); await tester(); } catch (e) { erreur(e); }
      };
      $c('#cxOublier').onclick = async () => {
        if (!(await U.confirm('Oublier la connexion', 'Le serveur local efface l’adresse et le mot de passe de cette base. La base elle-même n’est pas touchée.', { danger: true, okLabel: 'Oublier' }))) return;
        try { await B.api('oublier', { id: base.id }); c = null; etat(''); dessinerForm(); dessinerEtat(); } catch (e) { erreur(e); }
      };

      const res = h => { $c('#cxResultat').innerHTML = h; };
      async function comparer() {
        res('<span class="mdi mdi-loading mdi-spin"></span> Lecture de la base…');
        try {
          const err = B.verifier(app, base);
          if (err.length) return res(`<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div>Corrige d’abord le schéma (onglet Tables) : ${esc(err[0])}</div></div>`);
          const { tables } = await B.api('schema', { id: base.id });
          const m = B.migration(app, base, tables);
          res(`<div class="stack">${m.actions.length ? `<div><b>${m.actions.length} changement(s) à appliquer :</b><ul style="margin:4px 0;padding-left:18px">${m.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>La base réelle contient déjà tout le schéma.</div></div>'}
            ${m.alertes.length ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div><ul style="margin:0;padding-left:18px">${m.alertes.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div></div>` : ''}
            ${m.sql ? `<pre class="code">${esc(m.sql)}</pre><div class="row"><button class="btn btn-primary" id="cxAppliquer" ${c.lectureSeule ? 'disabled title="Connexion en lecture seule"' : ''}><span class="mdi mdi-database-arrow-up-outline"></span>Appliquer à la base</button>${c.lectureSeule ? '<span class="small muted">Connexion en lecture seule.</span>' : ''}</div>` : ''}</div>`);
          const bouton = $c('#cxAppliquer');
          if (bouton) bouton.onclick = async () => {
            if (!(await U.confirm('Appliquer à la base réelle', `${m.actions.length} changement(s) sur ${c.base} (${c.hote}). Rien n’est supprimé. Continuer ?`, { okLabel: 'Appliquer' }))) return;
            bouton.disabled = true;
            try { await B.api('appliquer', { id: base.id, sql: m.sql }); U.toast('success', 'Schéma appliqué', `${m.actions.length} changement(s)`); await comparer(); }
            catch (e) { bouton.disabled = false; U.toast('error', 'Échec : rien n’a été appliqué', e.message, 8000); }
          };
        } catch (e) { res(`<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`); }
      }
      $c('#cxComparer').onclick = comparer;
      $c('#cxImporter').onclick = async () => {
        res('<span class="mdi mdi-loading mdi-spin"></span> Lecture de la base…');
        try {
          const { tables } = await B.api('schema', { id: base.id });
          const noms = new Set(B.tables(app, base).map(t => t.nom));
          const nouvelles = tables.filter(t => !noms.has(t.nom));
          if (!nouvelles.length) return res('Toutes les tables de la base sont déjà dans le schéma.');
          res('');
          if (!(await U.confirm('Importer les tables', `${nouvelles.length} table(s) à ajouter au concepteur : ${nouvelles.map(t => t.nom).join(', ')}.`, { okLabel: 'Importer' }))) return;
          base.tables.push(...B.depuisSchema(nouvelles, base));
          sauver(); majEntete();
          U.toast('success', `${nouvelles.length} table(s) importée(s)`, 'Elles sont dans l’onglet Tables.');
        } catch (e) { res(`<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`); }
      };

      dessinerForm();
      dessinerEtat();
      if (c) tester();
    }

    /* ---------- Données (explorateur) ---------- */
    async function donnees(corps) {
      corps.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Connexion…';
      const liste = await connexions();
      if (!liste) { corps.innerHTML = `<div class="bar warn"><span class="mdi mdi-lan-disconnect"></span><div>${etatServeur()}</div></div>`; return; }
      const c = liste.find(x => x.id === base.id);
      if (!c) { corps.innerHTML = `<div class="empty"><span class="mdi mdi-lan-connect"></span>Cette base n’a pas encore de connexion. <a href="#" data-bd-onglet="connexion">Renseigner la connexion</a></div>`; return; }
      let schema = [];
      const v = { table: null, page: 0, tri: '', sens: 'asc', filtreColonne: '', filtreValeur: '', data: null };
      const PAGE = 50;
      const lecture = c.lectureSeule;
      corps.innerHTML = `<div class="stack">
        <div class="row small muted"><span class="mdi mdi-database-check-outline"></span>${esc(c.utilisateur)}@${esc(c.hote)}/${esc(c.base)}${lecture ? ' · <span class="chip chip-warning">Lecture seule</span>' : ''}<span class="spacer"></span><button class="btn btn-ghost btn-sm" id="exSchema"><span class="mdi mdi-refresh"></span>Recharger</button></div>
        <div class="bd-grid"><div id="exTables" class="bd-liste"></div><div id="exVue"></div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-console"></span>Console SQL</span><div class="spacer"></div><span class="small muted">Une instruction · Ctrl+Entrée</span></div>
          <div class="panel-body stack"><textarea class="tv-textarea code" id="exSql" rows="4" placeholder="select * from …"></textarea>
            <div class="row"><button class="btn btn-primary btn-sm" id="exExec"><span class="mdi mdi-play"></span>Exécuter</button><span id="exSqlEtat" class="small"></span></div><div id="exSqlRes"></div></div></div></div>`;
      const $e = s => corps.querySelector(s);
      const cellule = (val, max) => val === null ? '<span class="muted small">NULL</span>' : esc(String(val).length > (max || 80) ? String(val).slice(0, max || 80) + '…' : val);

      async function chargerSchema() {
        $e('#exTables').innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
        try {
          schema = (await B.api('schema', { id: base.id })).tables;
          if (!schema.some(t => t.nom === v.table)) v.table = (schema[0] || {}).nom || null;
          dessinerTables();
          await chargerLignes();
        } catch (e) { $e('#exTables').innerHTML = ''; $e('#exVue').innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`; }
      }
      function dessinerTables() {
        $e('#exTables').innerHTML = schema.map(t => `<button class="bd-item ${t.nom === v.table ? 'active' : ''}" data-tb="${esc(t.nom)}"><span class="mdi mdi-table"></span><span class="mono">${esc(t.nom)}</span><span class="spacer"></span><span class="small muted">${t.lignes > 0 ? '~' + t.lignes : ''}</span></button>`).join('')
          || `<div class="small muted">La base est vide. Crée les tables depuis l’onglet <a href="#" data-bd-onglet="connexion">Connexion</a> (Comparer puis Appliquer).</div>`;
        corps.querySelectorAll('[data-tb]').forEach(b => b.onclick = () => { Object.assign(v, { table: b.dataset.tb, page: 0, tri: '', filtreColonne: '', filtreValeur: '' }); dessinerTables(); chargerLignes(); });
      }
      async function chargerLignes() {
        const vue = $e('#exVue');
        if (!v.table) { vue.innerHTML = ''; return; }
        vue.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> Chargement…';
        try {
          const [data] = await Promise.all([
            B.api('lignes', { id: base.id, table: v.table, limite: PAGE, decalage: v.page * PAGE, tri: v.tri, sens: v.sens, filtreColonne: v.filtreColonne, filtreValeur: v.filtreValeur }),
            chargerAides(v.table)]);
          v.data = data;
          dessinerLignes();
        } catch (e) { vue.innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`; }
      }

      /* Aides à la saisie : valeurs possibles de chaque colonne (base) et rôles déclarés (code de l'app) */
      const aides = {};
      let indices = null;
      async function chargerAides(table) {
        if (aides[table]) return aides[table];
        if (!indices) indices = await B.indicesCode(app).catch(() => ({ roles: [], affichages: {}, kitComplet: false }));
        try { aides[table] = await B.api('aides', { id: base.id, table, affichages: indices.affichages }); }
        catch (e) { aides[table] = { colonnes: [], erreur: e.message, journal: false, deconnexion: [] }; }
        return aides[table];
      }
      const aideCol = nom => ((aides[v.table] || {}).colonnes || []).find(c => c.nom === nom)
        || Object.assign({ requis: false, regles: [] }, (v.data.colonnes.find(c => c.nom === nom) || { nom }));
      const choixCol = col => B.choix(v.table, col, indices);
      const ligneObjet = r => Object.fromEntries(v.data.colonnes.map((x, i) => [x.nom, v.data.lignes[r][i]]));
      /** Libellé d'une valeur liée (clé étrangère) : « Marie · marie@ex.fr » au lieu de l'uuid. */
      const libelleLie = (col, val) => { const o = col.reference && val !== null && (col.reference.options || []).find(x => x.v === String(val)); return o && o.l ? o.l : ''; };
      const identite = r => {
        const o = ligneObjet(r);
        const lisible = ['email', 'nom', 'name', 'titre', 'title', 'libelle', 'label'].filter(k => o[k]).slice(0, 2).map(k => o[k]).join(' · ');
        return (lisible ? lisible + ' — ' : '') + v.data.pk.map(k => `${k} = ${o[k]}`).join(', ');
      };

      const modifiable = () => !lecture && v.data && v.data.pk.length;
      function dessinerLignes() {
        const d = v.data, de = d.total ? v.page * PAGE + 1 : 0, a = Math.min(d.total, (v.page + 1) * PAGE);
        const ai = aides[v.table] || {};
        const cols = d.colonnes.map(x => aideCol(x.nom));
        const aListe = cols.map(c => !!choixCol(c).options.length || !!c.reference);
        $e('#exVue').innerHTML = `<div class="stack">
          <div class="row"><select class="tv-select" id="exFCol" style="max-width:180px"><option value="">Filtrer sur…</option>${d.colonnes.map(x => `<option ${x.nom === v.filtreColonne ? 'selected' : ''}>${esc(x.nom)}</option>`).join('')}</select>
            <input class="tv-input" id="exFVal" style="max-width:220px" placeholder="contient…" value="${esc(v.filtreValeur)}"><button class="btn btn-outline btn-sm" id="exFiltrer"><span class="mdi mdi-filter-outline"></span>Filtrer</button>
            <button class="btn ${v.aides ? 'btn-secondary' : 'btn-ghost'} btn-sm" id="exAidesBtn" title="Valeurs possibles de chaque colonne"><span class="mdi mdi-lightbulb-on-outline"></span>Aides</button>
            <span class="spacer"></span>${lecture ? '' : `<label class="small row" style="gap:4px" title="Montre ce qui va changer et demande ton accord avant d’écrire dans la base"><input type="checkbox" id="exConfirmer" ${PREFS.confirmer ? 'checked' : ''}>Confirmer avant d’écrire</label>
            <button class="btn btn-primary btn-sm" id="exAjout"><span class="mdi mdi-plus"></span>Ajouter une ligne</button>`}</div>
          ${!lecture && !d.pk.length ? '<div class="bar warn"><span class="mdi mdi-key-remove"></span><div>Table sans clé primaire : modification ligne par ligne impossible (utilise la console SQL).</div></div>' : ''}
          ${ai.erreur ? `<div class="bar warn"><span class="mdi mdi-lightbulb-off-outline"></span><div>Aides indisponibles (${esc(ai.erreur)}). Relance <span class="mono">node serveur.js</span> avec cette version de l’Atelier.</div></div>` : ''}
          ${v.aides ? `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-lightbulb-on-outline"></span>Aides pour ${esc(v.table)}</span><div class="spacer"></div>
              <span class="small muted">${ai.journal ? 'Chaque modification est notée dans le journal de l’app.' : ''}</span></div>
            <div class="panel-body"><table class="tv-table bd-aides"><tbody>${cols.map(c => `<tr><td class="mono" style="white-space:nowrap;vertical-align:top">${esc(c.nom)}${d.pk.includes(c.nom) ? ' <span class="mdi mdi-key-variant"></span>' : ''}</td><td class="small">${B.aideColonne(c, choixCol(c))}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
          <div class="table-wrap bd-donnees"><table class="tv-table"><thead><tr>${d.colonnes.map((x, i) => `<th data-tri="${esc(x.nom)}" title="${esc(x.type)}${aListe[i] ? ' · liste de valeurs' : ''} · trier"><span class="mono">${esc(x.nom)}</span>${d.pk.includes(x.nom) ? ' <span class="mdi mdi-key-variant"></span>' : ''}${aListe[i] ? ' <span class="mdi mdi-form-dropdown muted"></span>' : ''}${v.tri === x.nom ? ` <span class="mdi mdi-arrow-${v.sens === 'desc' ? 'down' : 'up'}"></span>` : ''}</th>`).join('')}${modifiable() ? '<th></th>' : ''}</tr></thead>
          <tbody>${d.lignes.map((l, r) => `<tr>${l.map((x, i) => { const lie = libelleLie(cols[i], x); return `<td data-r="${r}" data-i="${i}" class="${modifiable() ? 'bd-editable' : ''}" title="${x === null ? 'NULL' : esc(String(x).slice(0, 500))}">${lie ? esc(lie) : cellule(x)}</td>`; }).join('')}
            ${modifiable() ? `<td class="actions" style="white-space:nowrap"><button class="btn btn-ghost btn-icon btn-sm" data-fiche="${r}" title="Modifier la ligne (avec les aides)"><span class="mdi mdi-pencil-outline"></span></button>${ai.motDePasse ? `<button class="btn btn-ghost btn-icon btn-sm" data-mdp="${r}" title="Mot de passe provisoire"><span class="mdi mdi-lock-reset"></span></button>` : ''}<button class="btn btn-ghost btn-icon btn-sm" data-supl="${r}" title="Supprimer la ligne"><span class="mdi mdi-delete-outline"></span></button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${d.colonnes.length + 1}" class="muted">Aucune ligne.</td></tr>`}</tbody></table></div>
          <div class="row small"><span class="muted">${de}–${a} sur ${d.total}${modifiable() ? ' · double-clic sur une cellule pour la modifier, ou le crayon pour toute la ligne' : ''}</span><span class="spacer"></span>
            <button class="btn btn-outline btn-xs" id="exPrec" ${v.page ? '' : 'disabled'}><span class="mdi mdi-chevron-left"></span>Précédent</button><button class="btn btn-outline btn-xs" id="exSuiv" ${a < d.total ? '' : 'disabled'}>Suivant<span class="mdi mdi-chevron-right"></span></button></div></div>`;
        const filtrer = () => { v.filtreColonne = $e('#exFCol').value; v.filtreValeur = $e('#exFVal').value; v.page = 0; chargerLignes(); };
        $e('#exFiltrer').onclick = filtrer;
        $e('#exFVal').onkeydown = e => { if (e.key === 'Enter') filtrer(); };
        $e('#exPrec').onclick = () => { v.page--; chargerLignes(); };
        $e('#exSuiv').onclick = () => { v.page++; chargerLignes(); };
        $e('#exAidesBtn').onclick = () => { v.aides = !v.aides; dessinerLignes(); };
        if ($e('#exConfirmer')) $e('#exConfirmer').onchange = e => { PREFS.confirmer = e.target.checked; };
        corps.querySelectorAll('[data-tri]').forEach(th => th.onclick = () => { v.sens = v.tri === th.dataset.tri && v.sens === 'asc' ? 'desc' : 'asc'; v.tri = th.dataset.tri; chargerLignes(); });
        if ($e('#exAjout')) $e('#exAjout').onclick = ajouterLigne;
        corps.querySelectorAll('[data-supl]').forEach(b => b.onclick = () => supprimerLigne(+b.dataset.supl));
        corps.querySelectorAll('[data-fiche]').forEach(b => b.onclick = () => ficheLigne(+b.dataset.fiche));
        corps.querySelectorAll('[data-mdp]').forEach(b => b.onclick = () => motDePasse(+b.dataset.mdp));
        if (modifiable()) corps.querySelectorAll('td.bd-editable').forEach(td => td.ondblclick = () => editer(td));
      }
      const cleDe = r => Object.fromEntries(v.data.pk.map(k => [k, v.data.lignes[r][v.data.colonnes.findIndex(x => x.nom === k)]]));
      const majLigne = (r, ligne) => { v.data.lignes[r] = v.data.colonnes.map((x, j) => x.nom in ligne ? (ligne[x.nom] === null ? null : String(ligne[x.nom])) : v.data.lignes[r][j]); };
      const montrer = (col, val) => val === null || val === undefined ? '<span class="muted">NULL</span>'
        : col.sensible ? '<span class="muted">••••</span>' : `<span class="mono">${esc(String(val).length > 120 ? String(val).slice(0, 120) + '…' : val)}</span>${libelleLie(col, val) ? ` <span class="muted">(${esc(libelleLie(col, val))})</span>` : ''}`;
      const sqlLisible = v_ => v_ === null ? 'NULL' : "'" + String(v_).replace(/'/g, "''") + "'";

      /** Montre ce qui va être écrit et demande l'accord. Renvoie { journal, deconnecter } ou null (annulé). */
      function confirmer(action, r, valeurs, opts) {
        const ai = aides[v.table] || {}, avant = ligneObjet(r), changes = Object.keys(valeurs);
        const supprimer = action === 'supprimer';
        const compte = (ai.deconnexion || []).length && changes.some(k => k === 'role' || k === 'actif');
        const alertes = [];
        changes.forEach(k => { if (aideCol(k).sensible) alertes.push(`<b>${esc(k)}</b> est une donnée sensible : une empreinte de mot de passe écrite à la main ne marchera pas. Pour un mot de passe, passe par l’app (réinitialisation).`); });
        if (v.table === 'utilisateurs' && valeurs.role === 'admin') alertes.push('Ce compte aura <b>tous les droits d’administration</b> de l’app.');
        if (v.table === 'utilisateurs' && supprimer) alertes.push('Supprimer un compte efface aussi ce qui en dépend (sessions, et selon les tables, ses données). Pour bloquer l’accès sans rien perdre, passe plutôt <span class="mono">actif</span> à non.');
        const where = v.data.pk.map(k => `"${k}" = ${sqlLisible(avant[k])}`).join(' and ');
        const sql = supprimer ? `delete from public."${v.table}" where ${where}` : `update public."${v.table}" set ${changes.map(k => `"${k}" = ${aideCol(k).sensible ? '••••' : sqlLisible(valeurs[k])}`).join(', ')} where ${where}`;
        return new Promise(resolve => {
          let fait = false;
          const fin = x => { if (!fait) { fait = true; resolve(x); } };
          U.dialog({
            title: supprimer ? 'Supprimer la ligne' : 'Confirmer la modification', size: 'md',
            body: `<div class="stack">
              <div>Table <span class="mono">${esc(v.table)}</span> · ligne <b>${esc(identite(r))}</b></div>
              ${supprimer ? '<div class="bar crit"><span class="mdi mdi-delete-alert-outline"></span><div>La ligne sera supprimée définitivement de la base réelle.</div></div>'
                : `<table class="tv-table"><thead><tr><th>Colonne</th><th>Avant</th><th>Après</th></tr></thead><tbody>${changes.map(k => `<tr><td class="mono">${esc(k)}</td><td>${montrer(aideCol(k), avant[k])}</td><td><b>${montrer(aideCol(k), valeurs[k])}</b></td></tr>`).join('')}</tbody></table>`}
              ${alertes.map(x => `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div>${x}</div></div>`).join('')}
              <details><summary class="small muted">Instruction envoyée à la base</summary><pre class="code small" style="white-space:pre-wrap;margin:6px 0 0">${esc(sql)}</pre></details>
              ${ai.journal ? `<label class="row small bd-option"><input type="checkbox" data-opt="journal" ${PREFS.journal ? 'checked' : ''}><span>Noter dans le journal de l’app (acteur « atelier », avant / après)</span></label>` : ''}
              ${compte ? `<label class="row small bd-option"><input type="checkbox" data-opt="deconnecter" ${PREFS.deconnecter ? 'checked' : ''}><span>Fermer ses connexions ouvertes (${esc(ai.deconnexion.join(', '))}) : le changement s’applique tout de suite, il devra se reconnecter</span></label>` : ''}
              ${!supprimer && !(opts && opts.toujours) ? '<label class="row small bd-option"><input type="checkbox" data-opt="plus"><span>Ne plus demander pendant cette visite (décochable au-dessus du tableau)</span></label>' : ''}</div>`,
            actions: [
              { label: 'Annuler', cls: 'btn-outline', onClick: () => fin(null) },
              { label: supprimer ? 'Supprimer' : 'Écrire dans la base', cls: supprimer ? 'btn-danger' : 'btn-primary', icon: supprimer ? 'mdi-delete-outline' : 'mdi-database-edit-outline', onClick: ({ body }) => {
                const coche = k => { const i = body.querySelector(`[data-opt="${k}"]`); return i ? i.checked : null; };
                if (coche('journal') !== null) PREFS.journal = coche('journal');
                if (coche('deconnecter') !== null) PREFS.deconnecter = coche('deconnecter');
                if (coche('plus')) { PREFS.confirmer = false; const c = $e('#exConfirmer'); if (c) c.checked = false; }
                fin({ journal: !!coche('journal'), deconnecter: !!coche('deconnecter') });
              } }]
          });
          // Fermé par la croix ou Échap : c'est un « non »
          const dlg = [...document.querySelectorAll('.dlg-back')].pop();
          const obs = new MutationObserver(() => { if (!dlg.isConnected) { obs.disconnect(); fin(null); } });
          obs.observe(document.body, { childList: true });
        });
      }

      /** Écrit dans la base réelle (après confirmation si demandée). Renvoie la réponse du serveur, ou null si annulé. */
      async function ecrire(action, r, valeurs) {
        const ai = aides[v.table] || {};
        const sensible = Object.keys(valeurs).some(k => aideCol(k).sensible);
        const compte = (ai.deconnexion || []).length && Object.keys(valeurs).some(k => k === 'role' || k === 'actif');
        let opts = { journal: !!ai.journal && PREFS.journal, deconnecter: !!compte && PREFS.deconnecter };
        if (PREFS.confirmer || sensible || action === 'supprimer') {
          opts = await confirmer(action, r, valeurs, { toujours: sensible });
          if (!opts) return null;
        }
        const rep = await B.api(action, { id: base.id, table: v.table, cle: cleDe(r), valeurs, journal: opts.journal, deconnecter: opts.deconnecter });
        const plus = [rep.journal ? 'noté dans le journal de l’app' : '', rep.fermees ? `${rep.fermees} connexion${rep.fermees > 1 ? 's' : ''} fermée${rep.fermees > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
        U.toast('success', action === 'supprimer' ? 'Ligne supprimée' : 'Modifié', [`${v.table}${action === 'supprimer' ? '' : '.' + Object.keys(valeurs).join(', ')}`, plus].filter(Boolean).join(' · '), 3500);
        return rep;
      }

      function editer(td) {
        if (td.querySelector('[data-champ]')) return;
        const r = +td.dataset.r, i = +td.dataset.i, nom = v.data.colonnes[i].nom, ancien = v.data.lignes[r][i];
        if (nom === 'mdp_hash' && (aides[v.table] || {}).motDePasse) return motDePasse(r);
        const col = aideCol(nom), ch = choixCol(col);
        const remettre = () => { const lie = libelleLie(col, v.data.lignes[r][i]); td.innerHTML = lie ? esc(lie) : cellule(v.data.lignes[r][i]); td.title = v.data.lignes[r][i] === null ? 'NULL' : String(v.data.lignes[r][i]).slice(0, 500); };
        td.innerHTML = B.champ(col, ch, ancien);
        B.cibleRecherche(td, (aides[v.table] || {}).colonnes || []);
        B.brancherChamps(td, base.id);
        const champ = () => td.querySelector('[data-champ]');
        champ().focus();
        let fini = false;
        const annuler = () => { fini = true; remettre(); };
        const valider = async () => {
          if (fini) return;
          const val = B.lireChamp(champ());
          if (val === undefined) return;   // « Autre valeur… » : la saisie commence
          fini = true;
          if (val === B.normaliser(col, ancien)) return annuler();
          td.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
          try {
            const rep = await ecrire('modifier', r, { [nom]: val });
            if (rep) majLigne(r, rep.lignes[0] || {});
          } catch (e) { U.toast('error', 'Modification refusée', e.message, 8000); }
          remettre();
        };
        td.addEventListener('change', e => { if (e.target.tagName === 'SELECT' && e.target.isConnected) valider(); });   // une liste remplacée par « Autre valeur… » n'est plus dans la page
        td.addEventListener('focusout', () => setTimeout(() => { if (!td.contains(document.activeElement) && !document.querySelector('.dlg-back')) valider(); }, 0));
        td.addEventListener('keydown', e => {
          const long = e.target.tagName === 'TEXTAREA';
          if (e.key === 'Escape') { e.stopPropagation(); annuler(); }
          if (e.key === 'Enter' && (!long || e.ctrlKey || e.metaKey)) { e.preventDefault(); valider(); }
        });
      }

      /** Toute la ligne dans un formulaire, avec les aides sous chaque champ. */
      function ficheLigne(r) {
        const avant = ligneObjet(r);
        const cols = v.data.colonnes.map(x => aideCol(x.nom));
        U.dialog({
          title: `Modifier une ligne de ${v.table}`, size: 'lg',
          body: `<div class="stack"><div class="small muted">${esc(identite(r))}</div>${cols.map(c => {
            const fige = v.data.pk.includes(c.nom) || c.auto || (c.nom === 'mdp_hash' && (aides[v.table] || {}).motDePasse);
            return `<div class="input-group"><label class="input-label"><span class="mono">${esc(c.nom)}</span>${fige ? ' <span class="chip">non modifiable ici</span>' : ''}</label>
              ${fige ? `<div class="mono small">${montrer(c, avant[c.nom])}</div>` : B.champ(c, choixCol(c), avant[c.nom])}
              <div class="input-hint">${B.aideColonne(c, choixCol(c))}</div></div>`; }).join('')}</div>`,
          actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Enregistrer', cls: 'btn-primary', icon: 'mdi-content-save-outline', onClick: async ({ body }) => {
            const valeurs = {};
            body.querySelectorAll('[data-champ]').forEach(el => { const x = B.lireChamp(el); if (x !== undefined && x !== B.normaliser(aideCol(el.dataset.champ), avant[el.dataset.champ])) valeurs[el.dataset.champ] = x; });
            if (!Object.keys(valeurs).length) { U.toast('info', 'Rien à modifier', '', 2000); return; }
            try {
              const rep = await ecrire('modifier', r, valeurs);
              if (!rep) return false;
              majLigne(r, rep.lignes[0] || {});
              dessinerLignes();
            } catch (e) { U.toast('error', 'Modification refusée', e.message, 8000); return false; }
          } }]
        });
        const dlg = [...document.querySelectorAll('.dlg-back')].pop().querySelector('.dlg-body');
        B.cibleRecherche(dlg, (aides[v.table] || {}).colonnes || []);
        B.brancherChamps(dlg, base.id);
      }

      /** Mot de passe provisoire d'un compte : saisi en clair ici, haché par le serveur local avec l'algorithme de l'app,
          valable à la connexion suivante, puis à changer (mdp_a_changer). Ses connexions ouvertes sont fermées. */
      function motDePasse(r) {
        const ai = aides[v.table] || {};
        const generer = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', o = crypto.getRandomValues(new Uint8Array(12)); return [...o].map(x => a[x % a.length]).join('') + '-' + (10 + o[0] % 90); };
        U.dialog({
          title: 'Mot de passe provisoire', size: 'md',
          body: `<div class="stack"><div>Compte <b>${esc(identite(r))}</b></div>
            <div class="input-group"><label class="input-label">Nouveau mot de passe</label>
              <div class="row" style="flex-wrap:nowrap"><input class="tv-input mono" id="exMdp" autocomplete="off" spellcheck="false" value="${esc(generer())}">
              <button class="btn btn-outline btn-sm" id="exMdpGen" title="En proposer un autre"><span class="mdi mdi-dice-multiple-outline"></span>Autre</button>
              <button class="btn btn-outline btn-sm" id="exMdpCopier" title="Copier"><span class="mdi mdi-content-copy"></span>Copier</button></div>
              <div class="input-hint">8 caractères au moins, pas seulement des lettres ni seulement des chiffres.</div></div>
            <div class="bar"><span class="mdi mdi-shield-lock-outline"></span><div>Le mot de passe n’est <b>jamais écrit en clair</b> dans la base : le serveur local le hache comme l’app (scrypt), puis coche <span class="mono">mdp_a_changer</span>. La personne se connecte avec, et l’app lui demande aussitôt d’en choisir un nouveau. Ses connexions ouvertes sont fermées.</div></div>
            ${ai.journal ? `<label class="row small bd-option"><input type="checkbox" id="exMdpJournal" ${PREFS.journal ? 'checked' : ''}><span>Noter dans le journal de l’app (sans le mot de passe)</span></label>` : ''}</div>`,
          actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Définir le mot de passe', cls: 'btn-primary', icon: 'mdi-lock-reset', onClick: async ({ body }) => {
            const mdp = body.querySelector('#exMdp').value, j = body.querySelector('#exMdpJournal');
            try {
              const rep = await B.api('mot-de-passe', { id: base.id, table: v.table, cle: cleDe(r), mdp, journal: !!(j && j.checked) });
              majLigne(r, rep.lignes[0] || {});
              dessinerLignes();
              U.toast('success', 'Mot de passe provisoire défini', [rep.fermees ? `${rep.fermees} connexion${rep.fermees > 1 ? 's' : ''} fermée${rep.fermees > 1 ? 's' : ''}` : '', rep.journal ? 'noté dans le journal' : '', 'à changer à la prochaine connexion'].filter(Boolean).join(' · '), 6000);
            } catch (e) { U.toast('error', 'Mot de passe refusé', e.message, 8000); return false; }
          } }]
        });
        const dlg = [...document.querySelectorAll('.dlg-back')].pop();
        dlg.querySelector('#exMdpGen').onclick = () => { dlg.querySelector('#exMdp').value = generer(); };
        dlg.querySelector('#exMdpCopier').onclick = async () => { try { await navigator.clipboard.writeText(dlg.querySelector('#exMdp').value); U.toast('success', 'Copié', '', 1500); } catch (e) { dlg.querySelector('#exMdp').select(); } };
      }

      async function supprimerLigne(r) {
        try { if (await ecrire('supprimer', r, {})) chargerLignes(); }
        catch (e) { U.toast('error', 'Suppression refusée', e.message, 8000); }
      }
      function ajouterLigne() {
        const ai = aides[v.table] || {};
        const t = schema.find(x => x.nom === v.table);
        const cols = (ai.colonnes && ai.colonnes.length ? ai.colonnes : (t ? t.colonnes : v.data.colonnes)).map(x => aideCol(x.nom));
        U.dialog({
          title: 'Ajouter une ligne dans ' + v.table, size: 'lg',
          body: `<div class="stack"><div class="small muted">Laisse vide (ou « valeur par défaut ») pour la valeur par défaut.</div>${cols.map(x => `<div class="input-group"><label class="input-label"><span class="mono">${esc(x.nom)}</span>${x.requis && !x.defaut && !x.auto ? ' <span class="chip chip-warning">obligatoire</span>' : ''}</label>
            ${B.champ(x, choixCol(x), null, { defaut: true })}<div class="input-hint">${B.aideColonne(x, choixCol(x))}</div></div>`).join('')}
            ${ai.journal ? `<label class="row small bd-option"><input type="checkbox" id="exInsJournal" ${PREFS.journal ? 'checked' : ''}><span>Noter dans le journal de l’app</span></label>` : ''}</div>`,
          actions: [{ label: 'Annuler', cls: 'btn-outline' }, { label: 'Ajouter', cls: 'btn-primary', icon: 'mdi-plus', onClick: async ({ body }) => {
            const valeurs = {};
            body.querySelectorAll('[data-champ]').forEach(el => { const x = B.lireChamp(el, { defaut: true }); if (x !== undefined) valeurs[el.dataset.champ] = x; });
            const j = body.querySelector('#exInsJournal');
            try {
              const rep = await B.api('inserer', { id: base.id, table: v.table, valeurs, journal: !!(j && j.checked) });
              U.toast('success', 'Ligne ajoutée', rep.journal ? 'noté dans le journal de l’app' : '', 3000);
              chargerLignes();
            } catch (e) { U.toast('error', 'Ajout refusé', e.message, 8000); return false; }
          } }]
        });
        const dlg = [...document.querySelectorAll('.dlg-back')].pop().querySelector('.dlg-body');
        B.cibleRecherche(dlg, ai.colonnes || []);
        B.brancherChamps(dlg, base.id);
      }
      async function executer() {
        const requete = $e('#exSql').value.trim();
        if (!requete) return;
        $e('#exSqlEtat').innerHTML = '<span class="mdi mdi-loading mdi-spin"></span>';
        try {
          const r = await B.api('sql', { id: base.id, sql: requete });
          $e('#exSqlEtat').innerHTML = `<span class="chip chip-success">${esc(r.commande)}</span>${r.total > r.lignes.length ? ` ${r.lignes.length} premières lignes sur ${r.total}` : ''}`;
          $e('#exSqlRes').innerHTML = r.colonnes.length ? `<div class="table-wrap bd-donnees"><table class="tv-table"><thead><tr>${r.colonnes.map(x => `<th class="mono">${esc(x.nom)}</th>`).join('')}</tr></thead><tbody>${r.lignes.map(l => `<tr>${l.map(x => `<td>${cellule(x, 200)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
          if (!/^SELECT/.test(r.commande)) { Object.keys(aides).forEach(k => delete aides[k]); chargerSchema(); }
        } catch (e) { $e('#exSqlEtat').innerHTML = `<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`; $e('#exSqlRes').innerHTML = ''; }
      }
      $e('#exExec').onclick = executer;
      $e('#exSql').onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); executer(); } };
      $e('#exSchema').onclick = () => { Object.keys(aides).forEach(k => delete aides[k]); indices = null; chargerSchema(); };
      await chargerSchema();
    }

    /* ---------- Réglages de la base ---------- */
    function reglages(corps) {
      corps.innerHTML = `<div class="stack" style="max-width:640px">
        <div class="input-group"><label class="input-label">Nom de la base</label><input class="tv-input" id="rgNom" value="${esc(base.nom)}"></div>
        <div class="input-group"><label class="input-label">Moteur</label><select class="tv-select" id="rgMoteur">${Object.entries(B.MOTEURS).map(([k, l]) => `<option value="${k}" ${k === base.moteur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
          <div class="input-hint">Supabase ajoute les règles d’accès (RLS) et le lien des lignes à l’utilisateur connecté.</div></div>
        <div class="input-group"><label class="input-label">Description</label><textarea class="tv-textarea" id="rgDesc" rows="3">${esc(base.description)}</textarea></div>
        <label class="check"><input type="checkbox" id="rgId" ${base.conventions.id !== false ? 'checked' : ''}>Identifiant automatique <span class="mono">id uuid</span> sur chaque table</label>
        <label class="check"><input type="checkbox" id="rgHoro" ${base.conventions.horodatage !== false ? 'checked' : ''}>Horodatage automatique <span class="mono">cree_le</span> et <span class="mono">modifie_le</span></label>
        <div class="row"><span class="spacer"></span><button class="btn btn-danger-text" id="rgSup"><span class="mdi mdi-database-remove-outline"></span>Supprimer cette base de l’app</button></div></div>`;
      const $r = s => corps.querySelector(s);
      corps.onchange = () => {
        base.nom = $r('#rgNom').value.trim() || base.nom;
        base.moteur = $r('#rgMoteur').value;
        base.description = $r('#rgDesc').value.trim();
        base.conventions = { id: $r('#rgId').checked, horodatage: $r('#rgHoro').checked };
        sauver();
        majEntete();
        if (!integre) AB.app.setCrumbs(['Bases de données', app.nom, base.nom]);
      };
      $r('#rgSup').onclick = async () => {
        if (app.origine === 'plateforme' && app.bases.length === 1) return U.toast('error', 'Impossible', 'Une app de l’Atelier garde au moins une base.');
        if (!(await U.confirm('Supprimer la base', `« ${base.nom} » et ses ${base.tables.length} table(s) seront retirées de l’app, et sa connexion oubliée. La base réelle n’est pas touchée.`, { danger: true, okLabel: 'Supprimer' }))) return;
        app.bases.splice(app.bases.indexOf(base), 1);
        clearTimeout(timer);
        await AB.apps.enregistrer(app);
        try { await B.api('oublier', { id: base.id }); } catch (e) { /* pas de connexion ou serveur arrêté */ }
        if (integre) integre.ouvrir(null); else AB.app.go('bases');
      };
    }

    ouvrir(onglet);
    return { destroy() { root.onclick = null; if (fermer) fermer(); if (timer) { clearTimeout(timer); AB.apps.enregistrer(app); } } };
  }
})();
