/* ==========================================================================
   ab-vue-veille.js — « Veille technologique » : une idée d'app par jour
   #/veille                    idée du jour
   #/veille/jour/AAAA-MM-JJ    idée d'un autre jour (jours précédents, suivants)
   #/veille/idee/<id>          une fiche
   #/veille/toutes             toutes les idées (filtres niveau, catégorie, recherche)
   #/veille/favoris            idées gardées
   #/veille/ia                 idées générées par l'IA
   Données et logique : ab-veille.js.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc, V = () => AB.veille;
  AB.vues = AB.vues || {};

  const chipNiveau = n => { const x = V().NIVEAUX[n] || V().NIVEAUX.intermediaire; return `<span class="chip ${x.chip}"><span class="mdi ${x.icone}"></span>${esc(x.label)}</span>`; };
  const chipServeur = i => i.serveur ? '<span class="chip chip-warning"><span class="mdi mdi-server-outline"></span>Avec serveur</span>' : '<span class="chip chip-success"><span class="mdi mdi-cellphone-check"></span>Sans serveur</span>';
  const ul = l => (l || []).length ? `<ul class="vt-liste">${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">—</p>';
  const ulCode = l => (l || []).length ? `<ul class="vt-liste vt-code">${l.map(x => { const i = x.indexOf(' : '); return `<li><code>${esc(i > 0 ? x.slice(0, i) : x)}</code>${i > 0 ? ' ' + esc(x.slice(i + 3)) : ''}</li>`; }).join('')}</ul>` : '<p class="muted">—</p>';
  const dateLongue = jour => new Date(jour + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const decaler = (jour, n) => { const d = new Date(jour + 'T12:00:00'); d.setDate(d.getDate() + n); return V().jour(d); };

  function section(icone, titre, contenu, large) {
    return `<div class="panel ${large ? 'vt-large' : ''}"><div class="panel-head"><span class="panel-label"><span class="mdi ${icone}"></span>${esc(titre)}</span></div><div class="panel-body">${contenu}</div></div>`;
  }

  /** Fiche complète d'une idée. */
  function fiche(i, etat) {
    const m = i.monetisation || {};
    const fav = etat.favoris.includes(i.id), faite = etat.faites.includes(i.id);
    const kits = (i.kits || []).map(id => { const k = AB.kits.derniers().find(x => x.id === id); return `<a class="chip chip-accent" href="#/kits/${esc(id)}/${esc(k ? k.version : '')}">${esc(k ? k.nom : id)}</a>`; }).join(' ');
    return `<div class="vt-tete panel"><div class="panel-body">
        <div class="vt-titre"><span class="vt-icone"><span class="mdi ${esc(i.icone || 'mdi-lightbulb-on-outline')}"></span></span>
          <div style="min-width:0"><h2>${esc(i.titre)}</h2><p class="vt-accroche">${esc(i.accroche || '')}</p>
            <div class="row">${chipNiveau(i.niveau)}<span class="chip">${esc(i.categorie || '')}</span><span class="chip chip-info"><span class="mdi mdi-timer-outline"></span>${esc(i.duree || '')}</span>${chipServeur(i)}
              ${i.source === 'ia' ? '<span class="chip chip-primary"><span class="mdi mdi-robot-outline"></span>Générée par l’IA</span>' : ''}${faite ? '<span class="chip chip-success"><span class="mdi mdi-check"></span>Réalisée</span>' : ''}</div></div></div>
        <div class="row" style="margin-top:14px">
          <button class="btn btn-primary" data-act="creer"><span class="mdi mdi-rocket-launch-outline"></span>Créer cette app</button>
          <button class="btn btn-outline" data-act="fav"><span class="mdi ${fav ? 'mdi-star' : 'mdi-star-outline'}"></span>${fav ? 'Dans mes favoris' : 'Garder'}</button>
          <button class="btn btn-outline" data-act="faite"><span class="mdi mdi-check-circle-outline"></span>${faite ? 'Pas encore réalisée' : 'Marquer réalisée'}</button>
          <button class="btn btn-outline" data-act="copier"><span class="mdi mdi-content-copy"></span>Copier la fiche</button>
          <button class="btn btn-outline" data-act="md"><span class="mdi mdi-download"></span>.md</button>
          ${i.source === 'ia' ? '<button class="btn btn-danger-text" data-act="suppr"><span class="mdi mdi-delete-outline"></span>Supprimer</button>' : ''}
        </div></div></div>
      <div class="vt-grille">
        ${section('mdi-account-group-outline', 'Pour qui', `<p>${esc(i.cible || '')}</p>`)}
        ${section('mdi-alert-decagram-outline', 'Le problème', `<p>${esc(i.probleme || '')}</p>`)}
        ${section('mdi-lightbulb-on-outline', 'La solution', `<p>${esc(i.solution || '')}</p>`)}
        ${section('mdi-trending-up', 'Pourquoi maintenant', `<p>${esc(i.pourquoi || '')}</p>`)}
        ${section('mdi-format-list-checks', 'Fonctionnalités', ul(i.fonctionnalites))}
        ${section('mdi-cellphone-screenshot', 'Écrans', ul(i.ecrans))}
        ${section('mdi-database-outline', i.serveur ? 'Données (tables)' : 'Données (sur l’appareil)', ulCode(i.donnees), true)}
        ${section('mdi-api', 'API et sources de données', ulCode(i.api), true)}
        ${section('mdi-shield-account-outline', 'Rôles', `<p>${esc(i.roles || '')}</p>`)}
        ${section('mdi-layers-outline', 'Stack technique', ul(i.stack))}
        ${section('mdi-package-variant-closed', 'Kits de l’Atelier', `<div class="row">${kits || '<span class="muted">—</span>'}</div>`)}
        ${section('mdi-connection', 'Services externes', ul(i.services))}
        ${section('mdi-rocket-launch-outline', 'Mise en production, étape par étape', `<ol class="vt-liste">${V().etapesProduction(i).map(e => `<li>${esc(e)}</li>`).join('')}</ol>`, true)}
        ${section('mdi-cash-multiple', 'Monétisation', `<dl class="vt-dl"><dt>Modèle</dt><dd>${esc(m.modele || '—')}</dd><dt>Prix</dt><dd>${esc(m.prix || '—')}</dd><dt>Objectif</dt><dd>${esc(m.objectif || '—')}</dd><dt>Coûts</dt><dd>${esc(i.couts || '—')}</dd></dl>`)}
        ${section('mdi-alert-outline', 'Risques et parades', ul(i.risques))}
        ${section('mdi-flag-checkered', 'Version minimale (à sortir d’abord)', `<p>${esc(i.mvp || '')}</p>`)}
        ${section('mdi-arrow-expand-right', 'Évolutions', ul(i.evolutions))}
      </div>`;
  }

  function carte(i, etat) {
    return `<a class="app-card" href="#/veille/idee/${esc(i.id)}">
      <div class="app-card-head"><span class="app-card-icon"><span class="mdi ${esc(i.icone || 'mdi-lightbulb-on-outline')}"></span></span>
        <div style="min-width:0"><div class="app-card-name">${esc(i.titre)}${etat.favoris.includes(i.id) ? ' <span class="mdi mdi-star" style="color:var(--color-warning)"></span>' : ''}</div><div class="small muted">${esc(i.categorie || '')} · ${esc(i.duree || '')}</div></div></div>
      <p>${esc(i.accroche || '')}</p>
      <div class="row">${chipNiveau(i.niveau)}${chipServeur(i)}${i.source === 'ia' ? '<span class="chip chip-primary">IA</span>' : ''}${etat.faites.includes(i.id) ? '<span class="chip chip-success">Réalisée</span>' : ''}</div></a>`;
  }

  /** Génère une idée : par le serveur local si l'IA est prête, sinon prompt à copier et réponse à coller. */
  async function dialogueGenerer(etat, apres) {
    const ia = await AB.ia.etat();
    const d = U.dialog({
      title: 'Nouvelle idée par l’IA', size: 'md',
      body: `<div class="stack">
        <div class="input-group"><label class="input-label">Orientation (facultatif)</label><input class="tv-input" id="vgConsigne" placeholder="ex. sans serveur, pour les voyageurs, avec la caméra, jeu simple…"></div>
        ${ia.ia ? '<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>Le serveur local est prêt : l’idée est demandée directement à l’IA.</div></div>'
          : `<div class="bar warn"><span class="mdi mdi-information-outline"></span><div>Le serveur local ${ia.joignable ? 'n’a pas de clé IA' : 'n’est pas lancé'} : copie le prompt dans Claude, puis colle sa réponse ci-dessous.</div></div>
          <button class="btn btn-outline" id="vgCopier"><span class="mdi mdi-content-copy"></span>Copier le prompt</button>
          <textarea class="tv-textarea code" id="vgReponse" placeholder="Réponse de Claude (JSON)"></textarea>`}
        <div id="vgEtat"></div></div>`,
      actions: [{ label: 'Annuler', cls: 'btn-outline' }, {
        label: ia.ia ? 'Générer' : 'Ajouter l’idée', cls: 'btn-primary', icon: 'mdi-creation-outline',
        onClick: async ({ body }) => {
          const consigne = body.querySelector('#vgConsigne').value.trim();
          const etatEl = body.querySelector('#vgEtat');
          try {
            let idee;
            if (ia.ia) {
              etatEl.innerHTML = '<span class="mdi mdi-loading mdi-spin"></span> L’IA réfléchit (20 à 60 s)…';
              idee = await V().generer(etat, consigne);
            } else {
              idee = V().normaliser(AB.ia.lireReponse(body.querySelector('#vgReponse').value));
            }
            etat.ia.push(idee);
            await V().garder(etat);
            U.toast('success', 'Idée ajoutée', idee.titre);
            apres(idee);
          } catch (e) {
            etatEl.innerHTML = `<div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${esc(e.message)}</div></div>`;
            return false;
          }
        }
      }]
    });
    const copier = d.body.querySelector('#vgCopier');
    if (copier) copier.onclick = async () => {
      const t = V().systeme(etat, d.body.querySelector('#vgConsigne').value.trim());
      try { await navigator.clipboard.writeText(t); U.toast('success', 'Prompt copié', 'Colle-le dans Claude.'); } catch (e) { U.download('prompt-veille.md', t, 'text/markdown;charset=utf-8'); }
    };
  }

  AB.vues.veille = async function (root, params) {
    const mode = params[0] || 'jour', arg = params[1];
    const etat = await V().etat();
    const aujourdhui = V().jour();
    const jour = mode === 'jour' && /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : aujourdhui;
    const recharger = () => AB.vues.veille(root, params);

    // Génération automatique : une fois par jour, si activée et si l'IA est prête
    if (mode === 'jour' && jour === aujourdhui && etat.auto && etat.derniereAuto !== aujourdhui && !etat.ia.some(i => i.jour === aujourdhui)) {
      etat.derniereAuto = aujourdhui;
      await V().garder(etat);
      AB.ia.etat().then(async e => {
        if (!e.ia) return;
        try {
          const idee = await V().generer(etat, '');
          etat.ia.push(idee); await V().garder(etat);
          if (location.hash.replace(/^#\/?/, '') === 'veille') { U.toast('success', 'Idée du jour générée par l’IA', idee.titre); recharger(); }
        } catch (err) { U.toast('warning', 'Génération automatique impossible', err.message, 6000); }
      });
    }

    const toutes = V().toutes(etat);
    const onglet = mode === 'idee' ? '' : mode;
    const tabs = [['jour', 'Idée du jour', 'mdi-calendar-star', '#/veille'], ['toutes', `Toutes les idées (${toutes.length})`, 'mdi-view-grid-outline', '#/veille/toutes'],
      ['favoris', `Favoris (${etat.favoris.length})`, 'mdi-star-outline', '#/veille/favoris'], ['ia', `Générées par l’IA (${etat.ia.length})`, 'mdi-robot-outline', '#/veille/ia']];

    let corps = '', courante = null;
    if (mode === 'jour' || mode === 'idee') {
      courante = mode === 'idee' ? V().trouver(etat, arg) : V().ideeDu(etat, jour);
      if (!courante) corps = `<div class="empty"><span class="mdi mdi-lightbulb-off-outline"></span>Idée introuvable. <a href="#/veille">Idée du jour</a></div>`;
      else {
        const nav = mode === 'jour' ? `<div class="row vt-jours">
            <a class="btn btn-outline btn-sm" href="#/veille/jour/${decaler(jour, -1)}"><span class="mdi mdi-chevron-left"></span>Jour précédent</a>
            <b class="vt-date">${esc(dateLongue(jour))}${jour === aujourdhui ? ' <span class="chip chip-accent">aujourd’hui</span>' : ''}</b>
            ${jour !== aujourdhui ? `<a class="btn btn-ghost btn-sm" href="#/veille">Aujourd’hui</a>` : ''}
            <a class="btn btn-outline btn-sm" href="#/veille/jour/${decaler(jour, 1)}">Jour suivant<span class="mdi mdi-chevron-right"></span></a></div>` : '';
        corps = nav + fiche(courante, etat);
      }
    } else {
      const source = mode === 'favoris' ? toutes.filter(i => etat.favoris.includes(i.id)) : mode === 'ia' ? toutes.filter(i => i.source === 'ia').reverse() : toutes;
      const categories = [...new Set(toutes.map(i => i.categorie).filter(Boolean))].sort();
      corps = `<div class="row vt-filtres">
          <input class="tv-input" id="vtQ" placeholder="Rechercher (titre, cible, techno…)" style="max-width:320px">
          <select class="tv-select" id="vtNiveau" style="max-width:180px"><option value="">Tous niveaux</option>${Object.entries(V().NIVEAUX).map(([k, n]) => `<option value="${k}">${esc(n.label)}</option>`).join('')}</select>
          <select class="tv-select" id="vtCat" style="max-width:200px"><option value="">Toutes catégories</option>${categories.map(c => `<option>${esc(c)}</option>`).join('')}</select>
          <select class="tv-select" id="vtServeur" style="max-width:180px"><option value="">Avec ou sans serveur</option><option value="non">Sans serveur</option><option value="oui">Avec serveur</option></select>
          <label class="row small"><input type="checkbox" id="vtFaites"> Masquer les réalisées</label></div>
        <div class="card-list" id="vtCartes"></div>`;
      root._source = source;
    }

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Veille technologique</div><h2 class="section-title">Une idée d’app par jour</h2>
        <p class="section-desc">Chaque jour, une app grand public qui peut marcher (comme une calculatrice ou une météo), avec tout son fonctionnement : écrans, données, API, stack, kits, mise en production sur le web et les stores, revenus. « Créer cette app » remplit le prompt pour Claude.</p></div>
        <div class="row"><label class="row small" title="À la première ouverture de chaque jour, si le serveur local a une clé IA"><input type="checkbox" id="vtAuto" ${etat.auto ? 'checked' : ''}> Idée du jour par l’IA</label>
          <button class="btn btn-outline" id="vtHasard"><span class="mdi mdi-dice-5-outline"></span>Au hasard</button>
          <button class="btn btn-primary" id="vtGenerer"><span class="mdi mdi-creation-outline"></span>Nouvelle idée par l’IA</button></div></div>
      <div class="tabs">${tabs.map(t => `<a class="tab ${t[0] === onglet ? 'active' : ''}" href="${t[3]}"><span class="mdi ${t[2]}"></span>${esc(t[1])}</a>`).join('')}</div>
      <div class="stack">${corps}</div></div>`;
    AB.app.setCrumbs(['Veille technologique'].concat(courante ? [courante.titre] : []));
    const $ = s => root.querySelector(s);

    $('#vtAuto').onchange = async e => {
      etat.auto = e.target.checked; await V().garder(etat);
      const ia = await AB.ia.etat();
      U.toast(etat.auto && !ia.ia ? 'warning' : 'success', etat.auto ? 'Idée du jour par l’IA activée' : 'Idée du jour tirée du catalogue',
        etat.auto && !ia.ia ? 'Le serveur local n’a pas de clé IA : le catalogue reste utilisé en attendant.' : '');
    };
    $('#vtHasard').onclick = () => { const l = toutes.filter(i => !courante || i.id !== courante.id); AB.app.go('veille/idee/' + l[Math.floor(Math.random() * l.length)].id); };
    $('#vtGenerer').onclick = () => dialogueGenerer(etat, idee => AB.app.go('veille/idee/' + idee.id));

    if (courante) {
      root.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
        const act = b.dataset.act;
        if (act === 'creer') return V().creerApp(courante);
        if (act === 'md') return U.download(`idee-${U.slug(courante.titre)}.md`, V().versMarkdown(courante), 'text/markdown;charset=utf-8');
        if (act === 'copier') {
          try { await navigator.clipboard.writeText(V().versMarkdown(courante)); U.toast('success', 'Fiche copiée', 'En Markdown.'); }
          catch (e) { U.download(`idee-${U.slug(courante.titre)}.md`, V().versMarkdown(courante), 'text/markdown;charset=utf-8'); }
          return;
        }
        if (act === 'suppr') {
          if (!await U.confirm('Supprimer l’idée', `Supprimer « ${courante.titre} » ?`, { okLabel: 'Supprimer', danger: true })) return;
          etat.ia = etat.ia.filter(i => i.id !== courante.id);
          etat.favoris = etat.favoris.filter(id => id !== courante.id);
          await V().garder(etat);
          return AB.app.go('veille/ia');
        }
        const cle = act === 'fav' ? 'favoris' : 'faites';
        etat[cle] = etat[cle].includes(courante.id) ? etat[cle].filter(id => id !== courante.id) : etat[cle].concat(courante.id);
        await V().garder(etat);
        recharger();
      });
    } else if ($('#vtCartes')) {
      const source = root._source;
      const filtrer = () => {
        const q = $('#vtQ').value.trim().toLowerCase(), n = $('#vtNiveau').value, sv = $('#vtServeur').value, c = $('#vtCat').value, sansFaites = $('#vtFaites').checked;
        const l = source.filter(i => (!n || i.niveau === n) && (!sv || !!i.serveur === (sv === 'oui')) && (!c || i.categorie === c) && (!sansFaites || !etat.faites.includes(i.id))
          && (!q || JSON.stringify(i).toLowerCase().includes(q)));
        $('#vtCartes').innerHTML = l.map(i => carte(i, etat)).join('') || `<div class="empty"><span class="mdi mdi-lightbulb-outline"></span>${mode === 'favoris' ? 'Aucun favori : « Garder » sur une fiche l’ajoute ici.' : mode === 'ia' ? 'Aucune idée générée. Bouton « Nouvelle idée par l’IA ».' : 'Aucune idée ne correspond.'}</div>`;
      };
      ['#vtQ', '#vtNiveau', '#vtServeur', '#vtCat', '#vtFaites'].forEach(s => { $(s).oninput = filtrer; $(s).onchange = filtrer; });
      filtrer();
    }
    return {};
  };
})();
