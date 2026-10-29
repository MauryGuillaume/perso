/* ==========================================================================
   ab-vue-accueil.js — tableau de bord (dont les revenus de toutes les apps)
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  AB.vues.accueil = async function (root) {
    AB.app.setCrumbs(['Tableau de bord']);
    const apps = await AB.apps.lister();
    const creees = apps.filter(a => a.origine === 'plateforme');
    const existantes = apps.filter(a => a.origine === 'existante');
    const blocs = AB.blocs.derniers();
    const aMettreAJour = creees.map(a => ({ app: a, maj: AB.apps.misesAJour(a), majK: AB.apps.misesAJourKits(a) })).filter(x => x.maj.length || x.majK.length);
    const nonConformes = creees.map(a => ({ app: a, n: AB.kits.bloquants(a) })).filter(x => x.n);
    const alertes = existantes.filter(a => (a.alertes || []).length);
    const audits = apps.map(a => ({ app: a, dernier: (a.audits || [])[0] }));
    const auditsKo = audits.filter(x => x.dernier && x.dernier.bloquants);
    const sansAudit = audits.filter(x => !x.dernier);
    const ideeJour = AB.veille.ideeDu(await AB.veille.etat(), AB.veille.jour());

    const carte = (icone, valeur, label) => `<div class="dash-card"><div class="dash-card-icon"><span class="mdi ${icone}"></span></div>
      <div class="dash-card-value">${valeur}</div><div class="dash-card-label">${esc(label)}</div></div>`;

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Atelier de Blocs</div><h2 class="section-title">Tableau de bord</h2>
        <p class="section-desc">Compose des apps mobiles avec des blocs réutilisables, et garde un œil sur toutes tes apps.</p></div>
        <div class="row"><button class="btn btn-outline" id="tbBloc"><span class="mdi mdi-puzzle-plus-outline"></span>Nouveau bloc</button>
        <button class="btn btn-primary" id="tbApp"><span class="mdi mdi-plus"></span>Nouvelle app</button></div></div>
      <div class="grid grid-4">
        ${carte('mdi-cellphone-link', creees.length, 'App(s) créée(s) ici')}
        ${carte('mdi-folder-outline', existantes.length, 'App(s) existante(s)')}
        ${carte('mdi-puzzle-outline', blocs.length, 'Bloc(s) dans l’atelier')}
        ${carte('mdi-package-variant-closed', AB.kits.derniers().length, 'Kit(s) de règles communes')}
      </div>
      <div class="bar info"><span class="mdi mdi-lightbulb-on-outline"></span><div><b>Idée d’app du jour</b> : ${esc(ideeJour.titre)}. ${esc(ideeJour.accroche)} <a href="#/veille">Voir la fiche complète</a></div></div>
      ${alertes.map(a => `<div class="bar crit"><span class="mdi mdi-shield-alert-outline"></span><div><b>${esc(a.nom)}</b> : ${esc(a.alertes[0])} <a href="#/apps/${esc(a.id)}">Voir la fiche</a></div></div>`).join('')}
      ${aMettreAJour.map(x => `<div class="bar warn"><span class="mdi mdi-update"></span><div><b>${esc(x.app.nom)}</b> : ${x.maj.map(m => `${esc(m.dernier.nom)} v${esc(m.inst.version)} → v${esc(m.dernier.version)}`).concat(x.majK.map(m => `kit ${esc(m.dernier.nom)} v${esc(m.ref.version)} → v${esc(m.dernier.version)}`)).join(', ')}. <a href="#/apps/${esc(x.app.id)}">Ouvrir le composeur</a></div></div>`).join('')}
      ${auditsKo.map(x => `<div class="bar crit"><span class="mdi mdi-shield-search"></span><div><b>${esc(x.app.nom)}</b> : dernier audit de sécurité ${AB.audit.chipNote(x.dernier)}, ${x.dernier.bloquants} point(s) critique(s) ou élevé(s). <a href="#/audit/rapport/${esc(x.dernier.id)}">Voir le rapport</a></div></div>`).join('')}
      ${sansAudit.length ? `<div class="bar info"><span class="mdi mdi-shield-search"></span><div>${sansAudit.length} app(s) sans audit de sécurité : ${sansAudit.slice(0, 6).map(x => `<a href="#/audit/app/${esc(x.app.id)}">${esc(x.app.nom)}</a>`).join(', ')}${sansAudit.length > 6 ? '…' : ''}</div></div>` : ''}
      ${nonConformes.map(x => `<div class="bar info"><span class="mdi mdi-shield-alert-outline"></span><div><b>${esc(x.app.nom)}</b> : ${x.n} point(s) de conformité à traiter. <a href="#/apps/${esc(x.app.id)}">Voir l’app</a></div></div>`).join('')}
      ${AB.revenus.panneauGlobal(apps)}
      <div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-clock-outline"></span>Apps récentes</span><div class="spacer"></div><a class="btn btn-ghost btn-sm" href="#/apps">Toutes</a></div>
          <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>
          ${apps.slice(0, 6).map(a => `<tr><td><a href="#/apps/${esc(a.id)}"><span class="mdi ${esc(a.icone)}"></span> ${esc(a.nom)}</a></td><td>${AB.apps.chipStatut(a.statut)}</td><td>${(a.audits || [])[0] ? AB.audit.chipNote(a.audits[0]) : '<span class="small muted">Pas d’audit</span>'}</td><td class="small muted">${esc(U.fmtDate(a.modifie))}</td></tr>`).join('') || '<tr><td class="muted">Aucune app.</td></tr>'}
          </tbody></table></div></div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-rocket-launch-outline"></span>Pour commencer</span></div>
          <div class="panel-body"><ol style="margin:0;padding-left:18px;line-height:1.9">
            <li><b>Nouvelle app</b> : décris-la, l’assistant choisit les blocs (ou pars d’une app vide).</li>
            <li>Dans le <b>composeur</b>, glisse des blocs, règle-les et regarde le téléphone.</li>
            <li><b>Enregistrer une version</b> à chaque étape : tu peux toujours revenir en arrière.</li>
            <li><b>Exporter (ZIP)</b> : une PWA prête à héberger, avec son backend si un bloc en a besoin.</li>
            <li>Dans <b>Blocs</b>, crée tes briques techniques ou importe des fichiers <code>bloc-*.js</code>.</li>
            <li>Dans <b>Kits</b>, fixe les règles communes : charte, cybersécurité, affichage.</li>
            <li>Dans <b>Prompt</b>, coche plusieurs kits : tu obtiens un prompt unique qui les intègre tous.</li>
            <li>Dans <b>Audit sécurité</b>, teste une app, un dossier de code ou un site en ligne et récupère le rapport.</li>
          </ol></div></div>
      </div></div>`;
    AB.revenus.lierGlobal(root, apps, () => AB.vues.accueil(root));
    root.querySelector('#tbApp').onclick = AB.apps.dialogueNouvelle;
    root.querySelector('#tbBloc').onclick = () => AB.app.go('blocs/nouveau/1.0.0');
    return {};
  };
})();
