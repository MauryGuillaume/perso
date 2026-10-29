/* ==========================================================================
   ab-revenus.js — revenus et publicités de chaque app, et le total global
   Les revenus se saisissent à la main, s'importent en CSV, ou sont
   récupérés automatiquement dans les apps qui ont le bloc « Statistiques »
   (via le serveur local, qui garde le jeton). Les lignes récupérées portent
   « auto » et sont remplacées à chaque actualisation. Import CSV (export AdMob, Stripe, App Store…). Les
   connecteurs viendront plus tard, côté serveur (jamais de clé d'API dans
   le navigateur).
   Données rangées dans l'app (hors versions) :
   - app.revenus : [{ id, mois: 'AAAA-MM', source, montant, note, pub }]
   - app.pubs    : [{ id, reseau, format, emplacement, identifiant, statut, note }]
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const R = AB.revenus = {};

  R.SOURCES = ['Publicités', 'Abonnements', 'Achats intégrés', 'Ventes', 'Dons', 'Autre'];
  R.RESEAUX = ['AdMob', 'AdSense', 'Meta Audience Network', 'AppLovin', 'Unity Ads', 'Partenariat direct', 'Autre'];
  R.FORMATS = ['Bannière', 'Interstitiel', 'Vidéo récompensée', 'Native', 'Ouverture d’app'];
  R.STATUTS = { prevue: ['Prévue', 'chip'], active: ['Active', 'chip-success'], pause: ['En pause', 'chip-warning'] };

  /* ---------- Calculs ---------- */
  const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  R.fmt = n => euros.format(Math.round((Number(n) || 0) * 100) / 100);
  R.moisCourant = () => new Date().toISOString().slice(0, 7);
  /** Les n derniers mois, du plus ancien au mois courant. */
  R.derniersMois = function (n) {
    const d = new Date(), l = [];
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      l.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'));
    }
    return l;
  };
  const NOMS_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  R.nomMois = (m, long) => { const [a, n] = m.split('-'); return NOMS_MOIS[Number(n) - 1] + (long ? ' ' + a : ''); };

  R.total = (app, filtre) => (app.revenus || []).filter(filtre || (() => true)).reduce((s, l) => s + (Number(l.montant) || 0), 0);
  R.totalMois = (app, mois, source) => R.total(app, l => l.mois === mois && (!source || l.source === source));
  /** Série mensuelle (n mois) pour une ou plusieurs apps. */
  R.serie = (apps, n) => R.derniersMois(n).map(mois => ({ mois, total: apps.reduce((s, a) => s + R.totalMois(a, mois), 0) }));
  R.douzeMois = app => { const m = R.derniersMois(12); return R.total(app, l => m.includes(l.mois)); };

  /* ---------- CSV ---------- */
  /** Montant écrit à la française ou à l'anglaise : « 1 234,56 € », « 1,234.56 », « 12.5 ». */
  R.lireMontant = function (t) {
    let s = String(t || '').replace(/[\s  €$£]/g, '').replace(/EUR|USD/i, '');
    if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else s = s.replace(',', '.');
    const n = Number(s);
    return s && isFinite(n) ? Math.round(n * 100) / 100 : null;
  };
  /** Mois d'une date : 2026-10, 2026-10-15, 15/10/2026, 10/2026. */
  R.lireMois = function (t) {
    const s = String(t || '').trim();
    let m = s.match(/^(\d{4})-(\d{1,2})/);
    if (m) return m[1] + '-' + m[2].padStart(2, '0');
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (m) return m[3] + '-' + m[2].padStart(2, '0');
    m = s.match(/^(\d{1,2})[/.-](\d{4})$/);
    if (m) return m[2] + '-' + m[1].padStart(2, '0');
    return null;
  };
  function decouper(ligne, sep) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < ligne.length; i++) {
      const c = ligne[i];
      if (q) { if (c === '"' && ligne[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out.map(x => x.trim());
  }
  /** Lit un CSV de revenus. Colonnes reconnues par leur titre : mois/date, source, montant, note, app.
      Sans titre : mois ; source ; montant ; note. */
  R.lireCSV = function (texte) {
    const lignes = String(texte || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (!lignes.length) return { lignes: [], erreurs: ['Fichier vide.'] };
    const sep = [';', '\t', ','].map(s => [s, decouper(lignes[0], s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const tete = decouper(lignes[0], sep).map(x => x.toLowerCase());
    const trouver = mots => tete.findIndex(h => mots.some(m => h.includes(m)));
    let col = { mois: trouver(['mois', 'date', 'période', 'periode', 'month']), source: trouver(['source', 'type', 'catégorie', 'categorie']),
      montant: trouver(['montant', 'revenu', 'gain', 'amount', 'total', 'earnings']), note: trouver(['note', 'détail', 'detail', 'description', 'libellé']), app: trouver(['app', 'application']) };
    let debut = 1;
    if (col.mois < 0 || col.montant < 0) { col = { mois: 0, source: 1, montant: 2, note: 3, app: -1 }; debut = 0; }
    const res = [], erreurs = [];
    lignes.slice(debut).forEach((l, i) => {
      const c = decouper(l, sep), mois = R.lireMois(c[col.mois]), montant = R.lireMontant(c[col.montant]);
      if (!mois || montant === null) { erreurs.push(`Ligne ${i + 1 + debut} ignorée : ${l.slice(0, 60)}`); return; }
      const src = col.source >= 0 ? c[col.source] || '' : '';
      res.push({ mois, montant, source: R.SOURCES.find(s => s.toLowerCase() === src.toLowerCase()) || (/pub|ad/i.test(src) ? 'Publicités' : src || 'Autre'),
        note: col.note >= 0 ? (c[col.note] || '').slice(0, 200) : '', app: col.app >= 0 ? c[col.app] || '' : '' });
    });
    return { lignes: res, erreurs };
  };
  /** Ajoute des lignes importées en sautant les doublons exacts. Renvoie le nombre ajouté. */
  R.ajouter = function (app, lignes) {
    app.revenus = app.revenus || [];
    const cle = l => [l.mois, l.source, l.montant, l.note || ''].join('|');
    const deja = new Set(app.revenus.map(cle));
    let n = 0;
    lignes.forEach(l => {
      const x = { id: U.uuid(), mois: l.mois, source: l.source || 'Autre', montant: l.montant, note: l.note || '', pub: l.pub || '' };
      if (deja.has(cle(x))) return;
      deja.add(cle(x)); app.revenus.push(x); n++;
    });
    return n;
  };
  const csvCellule = v => /[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  R.versCSV = (lignes, avecApp) => [(avecApp ? 'app;' : '') + 'mois;source;montant;note']
    .concat(lignes.map(l => (avecApp ? csvCellule(l.app) + ';' : '') + [l.mois, l.source, String(l.montant).replace('.', ','), l.note || ''].map(csvCellule).join(';'))).join('\n');

  /* ---------- Récupération automatique (bloc « Statistiques ») ---------- */
  /** Clé de l'app dans le .env du serveur local : STATS_<CLE>_URL et STATS_<CLE>_JETON. */
  R.cleStats = app => app.cleStats || U.slug(app.nom).toUpperCase().replace(/-/g, '_').slice(0, 60) || 'APP';
  async function appelStats(methode, corps) {
    const base = await AB.ia.adresse();
    const r = await fetch(base + '/api/stats', { method: methode, headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: corps ? JSON.stringify(corps) : undefined });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erreur || 'Serveur local : erreur ' + r.status);
    return data;
  }
  /** Clés des apps configurées sur le serveur local, ou null s'il ne répond pas. */
  R.appsConfigurees = () => appelStats('GET').then(d => d.apps || [], () => null);
  /** Récupère les chiffres de l'app et remplace ses lignes « auto ». */
  R.recuperer = async function (app) {
    const d = await appelStats('POST', { cle: R.cleStats(app) });
    const mois = new Set(d.revenus.map(l => l.mois));
    app.revenus = (app.revenus || []).filter(l => !(l.auto && (mois.has(l.mois) || R.derniersMois(12).includes(l.mois))));
    d.revenus.forEach(l => app.revenus.push({ id: U.uuid(), mois: l.mois, source: R.SOURCES.includes(l.source) ? l.source : 'Ventes', montant: l.montant,
      note: `${l.nombre} paiement(s)${d.devise !== 'EUR' ? ' en ' + d.devise : ''}`, pub: '', auto: true }));
    app.stats = { date: U.now(), utilisateurs: d.utilisateurs, devise: d.devise };
    await AB.apps.enregistrer(app);
    return d;
  };
  const etapesStats = (app, avecBloc) => `<ol class="small" style="margin:6px 0 0;padding-left:18px;line-height:1.8">
    ${avecBloc ? '' : '<li>Ajoute le bloc <b>Statistiques</b> à l’app (ou renvoie le format <code>atelier-stats/1</code> depuis son API), puis déploie-la.</li>'}
    <li>Crée un jeton dans un terminal : <code>openssl rand -hex 32</code></li>
    <li>Côté app : <code>supabase secrets set ATELIER_STATS_JETON=&lt;jeton&gt;</code></li>
    <li>Dans le <code>.env</code> de <code>serveur.js</code> : <code>STATS_${esc(R.cleStats(app))}_URL=https://&lt;projet&gt;.supabase.co/functions/v1/stats-atelier</code> et <code>STATS_${esc(R.cleStats(app))}_JETON=&lt;jeton&gt;</code>, puis relance le serveur.</li></ol>`;

  /** Panneau « Récupération automatique » de l'onglet Revenus. */
  function panneauAuto(el, app, apresMaj) {
    const avecBloc = (app.blocs || []).some(i => i.bloc === 'stats-atelier') || (app.blocsBranches || []).includes('stats-atelier');
    const u = app.stats && app.stats.utilisateurs;
    el.innerHTML = `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cloud-download-outline"></span>Récupération automatique</span><div class="spacer"></div>
      <span class="small muted" id="rvAutoEtat">Vérification du serveur local…</span></div>
      <div class="panel-body stack" id="rvAutoCorps">
      ${u ? `<div class="grid grid-4">${tuile('mdi-account-multiple-outline', u.total, 'Utilisateurs')}${tuile('mdi-account-clock-outline', u.actifs30j, 'Actifs sur 30 jours')}${tuile('mdi-account-plus-outline', u.nouveauxMois, 'Nouveaux ce mois-ci')}${tuile('mdi-update', esc(U.fmtDate(app.stats.date)), 'Dernière récupération')}</div>` : ''}
      </div></div>`;
    const etat = el.querySelector('#rvAutoEtat'), corps = el.querySelector('#rvAutoCorps');
    R.appsConfigurees().then(liste => {
      if (!el.isConnected) return;
      if (liste === null) { etat.textContent = 'Serveur local arrêté'; corps.insertAdjacentHTML('beforeend', `<p class="small muted" style="margin:0">Lance <code>node serveur.js</code> pour récupérer les chiffres de l’app : c’est lui qui garde le jeton, jamais le navigateur.</p>`); return; }
      if (!liste.includes(R.cleStats(app))) { etat.textContent = 'Pas encore configurée'; corps.insertAdjacentHTML('beforeend', `<div class="small">Pour que l’Atelier récupère les revenus et les utilisateurs de cette app :</div>${etapesStats(app, avecBloc)}`); return; }
      etat.innerHTML = `<button class="btn btn-primary btn-sm" id="rvActualiser"><span class="mdi mdi-refresh"></span>Actualiser</button>`;
      el.querySelector('#rvActualiser').onclick = async ev => {
        ev.currentTarget.disabled = true;
        try { const d = await R.recuperer(app); U.toast('success', 'Chiffres récupérés', `${d.revenus.length} mois de revenus · ${d.utilisateurs.total} utilisateur(s)`); }
        catch (e) { U.toast('error', 'Récupération impossible', e.message, 7000); }
        apresMaj();
      };
    });
  }

  /* ---------- Graphique : barres mensuelles (une série) ---------- */
  R.graphique = function (serie) {
    const W = 1000, H = 220, G = 44, B = 24, max = Math.max(...serie.map(s => s.total)) || 100;
    const pas = Math.pow(10, Math.floor(Math.log10(max))), haut = Math.ceil(max / pas) * pas;
    const larg = (W - G) / serie.length, y = v => H - B - (v / haut) * (H - B - 10);
    const reperes = [0, haut / 2, haut];
    return `<svg class="rv-graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenus des ${serie.length} derniers mois">
      ${reperes.map(v => `<line x1="${G}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="rv-grille"/><text x="${G - 6}" y="${y(v) + 4}" class="rv-axe" text-anchor="end">${esc(v >= 1000 ? Math.round(v / 100) / 10 + ' k' : Math.round(v))}</text>`).join('')}
      ${serie.map((s, i) => {
        const x = G + i * larg + larg * 0.18, w = larg * 0.64, h = Math.max(0, H - B - y(s.total));
        const r = Math.min(4, w / 2, h);
        const barre = h > 0 ? `<path class="rv-barre" d="M${x},${H - B} v${-(h - r)} q0,${-r} ${r},${-r} h${w - 2 * r} q${r},0 ${r},${r} v${h - r} z"/>` : '';
        return `<g class="rv-col" tabindex="0"><title>${esc(R.nomMois(s.mois, true))} : ${esc(R.fmt(s.total))}</title>
          <rect x="${G + i * larg}" y="0" width="${larg}" height="${H - B}" class="rv-cible"/>${barre}
          <text x="${x + w / 2}" y="${H - 6}" class="rv-axe" text-anchor="middle">${esc(R.nomMois(s.mois))}</text></g>`;
      }).join('')}
    </svg>`;
  };

  const tuile = (icone, valeur, label) => `<div class="dash-card"><div class="dash-card-icon"><span class="mdi ${icone}"></span></div>
    <div class="dash-card-value">${valeur}</div><div class="dash-card-label">${esc(label)}</div></div>`;
  const options = (liste, v) => liste.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');

  /* ---------- Onglet « Revenus » d'une app ---------- */
  R.vueRevenus = function (root, app) {
    app.revenus = app.revenus || [];
    const sauver = async () => { await AB.apps.enregistrer(app); dessiner(); };
    function dessiner() {
      const mc = R.moisCourant(), [prec] = R.derniersMois(2);
      const lignes = app.revenus.slice().sort((a, b) => b.mois.localeCompare(a.mois));
      root.innerHTML = `<div class="stack">
        <div id="rvAuto"></div>
        <div class="grid grid-4">
          ${tuile('mdi-calendar-month-outline', R.fmt(R.totalMois(app, mc)), 'Ce mois-ci (' + R.nomMois(mc, true) + ')')}
          ${tuile('mdi-calendar-arrow-left', R.fmt(R.totalMois(app, prec)), 'Mois dernier')}
          ${tuile('mdi-chart-bar', R.fmt(R.douzeMois(app)), '12 derniers mois')}
          ${tuile('mdi-bullhorn-outline', R.fmt(R.totalMois(app, mc, 'Publicités')), 'Dont publicités ce mois-ci')}
        </div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-chart-bar"></span>Revenus par mois</span></div>
          <div class="panel-body">${R.graphique(R.serie([app], 12))}</div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cash-multiple"></span>Lignes de revenus</span><div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" id="rvCsv" title="Colonnes : mois;source;montant;note (export AdMob, Stripe, App Store…)"><span class="mdi mdi-file-upload-outline"></span>Importer un CSV</button>
          <button class="btn btn-ghost btn-sm" id="rvExport" ${lignes.length ? '' : 'disabled'}><span class="mdi mdi-file-download-outline"></span>Exporter</button></div>
          <div class="panel-body">
            <form class="rv-ajout" id="rvForm">
              <div class="input-group"><label class="input-label" for="rvMois">Mois</label><input class="tv-input" type="month" id="rvMois" value="${mc}" required></div>
              <div class="input-group"><label class="input-label" for="rvSource">Source</label><select class="tv-select" id="rvSource">${options(R.SOURCES)}</select></div>
              <div class="input-group" id="rvPubG" hidden><label class="input-label" for="rvPub">Emplacement</label><select class="tv-select" id="rvPub"><option value="">Toutes les pubs</option>${(app.pubs || []).map(p => `<option value="${esc(p.id)}">${esc(p.emplacement)} · ${esc(p.format)}</option>`).join('')}</select></div>
              <div class="input-group"><label class="input-label" for="rvMontant">Montant (€)</label><input class="tv-input" id="rvMontant" inputmode="decimal" placeholder="0,00" required></div>
              <div class="input-group" style="flex:2 1 160px"><label class="input-label" for="rvNote">Note</label><input class="tv-input" id="rvNote" maxlength="200"></div>
              <button class="btn btn-primary" type="submit"><span class="mdi mdi-plus"></span>Ajouter</button>
            </form></div>
          <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Mois</th><th>Source</th><th>Note</th><th style="text-align:right">Montant</th><th></th></tr></thead><tbody>
          ${lignes.map(l => { const p = (app.pubs || []).find(x => x.id === l.pub); return `<tr><td>${esc(R.nomMois(l.mois, true))}</td><td>${esc(l.source)}${l.auto ? ' <span class="chip chip-info" title="Récupéré automatiquement, remplacé à chaque actualisation">auto</span>' : ''}${p ? ` <span class="small muted">· ${esc(p.emplacement)}</span>` : ''}</td><td class="muted">${esc(l.note || '')}</td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${esc(R.fmt(l.montant))}</td><td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-rvdel="${esc(l.id)}" title="Supprimer la ligne" aria-label="Supprimer la ligne"><span class="mdi mdi-close"></span></button></td></tr>`; }).join('')
            || '<tr><td colspan="5" class="muted">Pas encore de revenus pour cette app.</td></tr>'}
          </tbody></table></div></div></div></div>`;
      panneauAuto(root.querySelector('#rvAuto'), app, dessiner);
      const src = root.querySelector('#rvSource');
      src.onchange = () => { root.querySelector('#rvPubG').hidden = src.value !== 'Publicités' || !(app.pubs || []).length; };
      root.querySelector('#rvForm').onsubmit = async e => {
        e.preventDefault();
        const montant = R.lireMontant(root.querySelector('#rvMontant').value);
        if (montant === null) return U.toast('error', 'Montant illisible', 'Exemple : 12,50');
        app.revenus.push({ id: U.uuid(), mois: root.querySelector('#rvMois').value, source: src.value, montant,
          note: root.querySelector('#rvNote').value.trim(), pub: src.value === 'Publicités' ? root.querySelector('#rvPub').value : '' });
        await sauver();
      };
      root.querySelectorAll('[data-rvdel]').forEach(b => b.onclick = async () => { app.revenus = app.revenus.filter(l => l.id !== b.dataset.rvdel); await sauver(); });
      root.querySelector('#rvCsv').onclick = async () => {
        const f = await U.pickFile('.csv,.tsv,.txt,text/csv');
        if (!f) return;
        const { lignes: l, erreurs } = R.lireCSV(f.texte);
        const n = R.ajouter(app, l);
        await sauver();
        U.toast(n ? 'success' : 'info', `${n} ligne(s) importée(s)`, erreurs.length ? `${erreurs.length} ligne(s) ignorée(s) (mois ou montant illisible)` : (l.length > n ? `${l.length - n} doublon(s) sauté(s)` : ''));
      };
      root.querySelector('#rvExport').onclick = () => U.download(`revenus-${U.slug(app.nom)}.csv`, '﻿' + R.versCSV(lignes), 'text/csv;charset=utf-8');
    }
    dessiner();
    return Promise.resolve();
  };

  /* ---------- Onglet « Publicités » d'une app ---------- */
  R.vuePubs = function (root, app) {
    app.pubs = app.pubs || [];
    const sauver = async () => { await AB.apps.enregistrer(app); dessiner(); };
    function dialogue(pub) {
      const p = pub || { reseau: 'AdMob', format: 'Bannière', emplacement: '', identifiant: '', statut: 'prevue', note: '' };
      U.dialog({
        title: pub ? 'Modifier l’emplacement' : 'Nouvel emplacement de pub',
        body: `<div class="stack">
          <div class="grid grid-2">
            <div class="input-group"><label class="input-label" for="pbEmpl">Emplacement</label><input class="tv-input" id="pbEmpl" value="${esc(p.emplacement)}" placeholder="Bas de l’écran Séance"></div>
            <div class="input-group"><label class="input-label" for="pbStatut">Statut</label><select class="tv-select" id="pbStatut">${Object.entries(R.STATUTS).map(([k, v]) => `<option value="${k}" ${k === p.statut ? 'selected' : ''}>${esc(v[0])}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label" for="pbReseau">Réseau</label><select class="tv-select" id="pbReseau">${options(R.RESEAUX, p.reseau)}</select></div>
            <div class="input-group"><label class="input-label" for="pbFormat">Format</label><select class="tv-select" id="pbFormat">${options(R.FORMATS, p.format)}</select></div>
          </div>
          <div class="input-group"><label class="input-label" for="pbId">Identifiant du bloc d’annonces</label><input class="tv-input mono" id="pbId" value="${esc(p.identifiant)}" placeholder="ca-app-pub-…/…">
            <div class="input-hint">Identifiant public (il est dans l’app). Ne colle jamais ici une clé d’API ou un mot de passe.</div></div>
          <div class="input-group"><label class="input-label" for="pbNote">Note</label><textarea class="tv-textarea" id="pbNote" style="min-height:60px">${esc(p.note)}</textarea></div></div>`,
        actions: [{ label: 'Annuler' }, {
          label: 'Enregistrer', cls: 'btn-primary', onClick: async ({ body }) => {
            const v = k => body.querySelector(k).value.trim();
            if (!v('#pbEmpl')) { U.toast('error', 'Nomme l’emplacement'); return false; }
            if (/(sk|pk|rk)_(live|test)_|AIza[0-9A-Za-z_-]{20}|secret|password/i.test(v('#pbId') + ' ' + v('#pbNote'))) { U.toast('error', 'Clé secrète détectée', 'Les clés restent côté serveur, jamais dans l’Atelier.'); return false; }
            Object.assign(p, { emplacement: v('#pbEmpl'), statut: v('#pbStatut'), reseau: v('#pbReseau'), format: v('#pbFormat'), identifiant: v('#pbId'), note: v('#pbNote') });
            if (!pub) app.pubs.push(Object.assign({ id: U.uuid() }, p));
            await sauver();
          }
        }]
      });
    }
    function dessiner() {
      const mc = R.moisCourant(), m12 = R.derniersMois(12);
      const pubMois = R.totalMois(app, mc, 'Publicités');
      root.innerHTML = `<div class="stack">
        <div class="grid grid-4">
          ${tuile('mdi-bullhorn-outline', app.pubs.filter(p => p.statut === 'active').length, 'Emplacement(s) actif(s)')}
          ${tuile('mdi-calendar-month-outline', R.fmt(pubMois), 'Publicités ce mois-ci')}
          ${tuile('mdi-chart-bar', R.fmt(R.total(app, l => l.source === 'Publicités' && m12.includes(l.mois))), 'Publicités sur 12 mois')}
          ${tuile('mdi-percent-outline', (R.totalMois(app, mc) ? Math.round(pubMois / R.totalMois(app, mc) * 100) : 0) + ' %', 'Part des revenus ce mois-ci')}
        </div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-bullhorn-outline"></span>Emplacements de pub</span><div class="spacer"></div>
          <button class="btn btn-primary btn-sm" id="pbAjout"><span class="mdi mdi-plus"></span>Ajouter un emplacement</button></div>
          <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Emplacement</th><th>Réseau</th><th>Format</th><th>Statut</th><th style="text-align:right">12 mois</th><th></th></tr></thead><tbody>
          ${app.pubs.map(p => `<tr><td><b>${esc(p.emplacement)}</b>${p.identifiant ? `<div class="small muted mono">${esc(p.identifiant)}</div>` : ''}</td><td>${esc(p.reseau)}</td><td>${esc(p.format)}</td>
            <td><span class="chip ${R.STATUTS[p.statut][1]}">${esc(R.STATUTS[p.statut][0])}</span></td>
            <td style="text-align:right;font-variant-numeric:tabular-nums">${esc(R.fmt(R.total(app, l => l.pub === p.id && m12.includes(l.mois))))}</td>
            <td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-pbmod="${esc(p.id)}" title="Modifier" aria-label="Modifier"><span class="mdi mdi-pencil-outline"></span></button>
              <button class="btn btn-ghost btn-icon btn-sm" data-pbdel="${esc(p.id)}" title="Retirer" aria-label="Retirer"><span class="mdi mdi-close"></span></button></td></tr>`).join('')
            || '<tr><td colspan="6" class="muted">Pas de pub dans cette app pour l’instant.</td></tr>'}
          </tbody></table></div></div></div>
        <p class="small muted" style="margin:0">Les revenus d’une pub se saisissent dans l’onglet Revenus, source « Publicités », en choisissant l’emplacement.</p></div>`;
      root.querySelector('#pbAjout').onclick = () => dialogue(null);
      root.querySelectorAll('[data-pbmod]').forEach(b => b.onclick = () => dialogue(app.pubs.find(p => p.id === b.dataset.pbmod)));
      root.querySelectorAll('[data-pbdel]').forEach(b => b.onclick = async () => {
        if (!await U.confirm('Retirer cet emplacement ?', 'Les revenus déjà saisis restent, sans emplacement.', { danger: true, okLabel: 'Retirer' })) return;
        app.pubs = app.pubs.filter(p => p.id !== b.dataset.pbdel);
        (app.revenus || []).forEach(l => { if (l.pub === b.dataset.pbdel) l.pub = ''; });
        await sauver();
      });
    }
    dessiner();
    return Promise.resolve();
  };

  /** Onglets de gestion communs aux deux espaces d'app (composeur et fiche). */
  R.ONGLETS = [['revenus', 'Revenus', 'mdi-cash-multiple'], ['pubs', 'Publicités', 'mdi-bullhorn-outline']];
  R.vue = (onglet, root, app) => onglet === 'revenus' ? R.vueRevenus(root, app) : R.vuePubs(root, app);

  /* ---------- Tableau de bord : revenus de toutes les apps ---------- */
  R.panneauGlobal = function (apps) {
    const mc = R.moisCourant(), [prec] = R.derniersMois(2);
    const tot = m => apps.reduce((s, a) => s + R.totalMois(a, m), 0);
    const lignes = apps.map(a => ({ a, mois: R.totalMois(a, mc), prec: R.totalMois(a, prec), an: R.douzeMois(a), pubs: (a.pubs || []).filter(p => p.statut === 'active').length }))
      .sort((x, y) => y.an - x.an || x.a.nom.localeCompare(y.a.nom));
    const total12 = lignes.reduce((s, l) => s + l.an, 0);
    return `<div class="panel" id="tbRevenus"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-cash-multiple"></span>Revenus de toutes les apps</span><div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" id="tbActualiser" hidden><span class="mdi mdi-refresh"></span>Tout actualiser</button>
        <button class="btn btn-ghost btn-sm" id="tbCsv"><span class="mdi mdi-file-upload-outline"></span>Importer un CSV</button></div>
      <div class="panel-body stack">
        <div class="grid grid-4">
          ${tuile('mdi-calendar-month-outline', R.fmt(tot(mc)), 'Ce mois-ci (' + R.nomMois(mc, true) + ')')}
          ${tuile('mdi-calendar-arrow-left', R.fmt(tot(prec)), 'Mois dernier')}
          ${tuile('mdi-chart-bar', R.fmt(total12), '12 derniers mois')}
          ${tuile('mdi-bullhorn-outline', R.fmt(apps.reduce((s, a) => s + R.totalMois(a, mc, 'Publicités'), 0)), 'Dont publicités ce mois-ci')}
        </div>
        ${R.graphique(R.serie(apps, 12))}
        ${total12 ? '' : '<p class="small muted" style="margin:0">Pas encore de revenus : ajoute-les dans l’onglet Revenus de chaque app, ou importe un CSV avec une colonne <code>app</code>.</p>'}
      </div>
      <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>App</th><th style="text-align:right">Ce mois-ci</th><th style="text-align:right">Mois dernier</th><th style="text-align:right">12 mois</th><th style="text-align:right">Part</th><th>Pubs actives</th></tr></thead><tbody>
        ${lignes.map(l => `<tr><td><a href="#/apps/${esc(l.a.id)}" data-onglet="revenus"><span class="mdi ${esc(l.a.icone)}"></span> ${esc(l.a.nom)}</a></td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${esc(R.fmt(l.mois))}</td><td style="text-align:right;font-variant-numeric:tabular-nums" class="muted">${esc(R.fmt(l.prec))}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums"><b>${esc(R.fmt(l.an))}</b></td><td style="text-align:right" class="muted">${total12 ? Math.round(l.an / total12 * 100) : 0} %</td>
          <td>${l.pubs ? `<a href="#/apps/${esc(l.a.id)}" data-onglet="pubs">${l.pubs}</a>` : '<span class="muted">0</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Aucune app.</td></tr>'}
      </tbody></table></div></div></div>`;
  };

  /** Branche le panneau global : liens vers l'onglet voulu, import CSV multi-apps (colonne « app »). */
  R.lierGlobal = function (root, apps, redessiner) {
    root.querySelectorAll('#tbRevenus [data-onglet]').forEach(a => a.onclick = () => { R.ongletVoulu = a.dataset.onglet; });
    // Apps configurées sur le serveur local : un bouton les actualise toutes
    R.appsConfigurees().then(liste => {
      const cibles = apps.filter(a => (liste || []).includes(R.cleStats(a)));
      const b = root.querySelector('#tbActualiser');
      if (!b || !cibles.length) return;
      b.hidden = false;
      b.title = cibles.map(a => a.nom).join(', ');
      b.onclick = async () => {
        b.disabled = true;
        const ko = [];
        for (const a of cibles) { try { await R.recuperer(a); } catch (e) { ko.push(a.nom + ' : ' + e.message); } }
        U.toast(ko.length ? 'error' : 'success', `${cibles.length - ko.length} app(s) actualisée(s)`, ko.join(' · '), 7000);
        redessiner();
      };
    });
    root.querySelector('#tbCsv').onclick = async () => {
      const f = await U.pickFile('.csv,.tsv,.txt,text/csv');
      if (!f) return;
      const { lignes, erreurs } = R.lireCSV(f.texte);
      const norm = s => String(s || '').trim().toLowerCase();
      const parApp = new Map(), inconnues = new Set();
      lignes.forEach(l => {
        const a = apps.find(x => norm(x.nom) === norm(l.app) || x.id === l.app);
        if (!a) { inconnues.add(l.app || '(vide)'); return; }
        if (!parApp.has(a)) parApp.set(a, []);
        parApp.get(a).push(l);
      });
      let n = 0;
      for (const [a, l] of parApp) { n += R.ajouter(a, l); await AB.apps.enregistrer(a); }
      U.toast(n ? 'success' : 'info', `${n} ligne(s) importée(s) dans ${parApp.size} app(s)`,
        [inconnues.size ? `App inconnue : ${[...inconnues].slice(0, 3).join(', ')}` : '', erreurs.length ? `${erreurs.length} ligne(s) illisible(s)` : ''].filter(Boolean).join(' · '), 6000);
      redessiner();
    };
  };
})();
