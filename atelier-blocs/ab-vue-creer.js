/* ==========================================================================
   ab-vue-creer.js — « Créer une app » : le parcours avec Claude
   1. prompt + pack (kits, blocs) ; 2. dans Claude ; 3. import du ZIP livré.
   En option : composer une app avec des blocs directement dans l'Atelier.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  AB.vues.creer = async function (root) {
    AB.app.setCrumbs(['Créer une app']);
    const apps = await AB.apps.lister();
    const avecCode = apps.filter(a => AB.code.courante(a));
    const nbKits = AB.kits.derniers().length, nbBlocs = AB.blocs.derniers().length;
    const etape = (n, icone, titre, corps) => `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="chip chip-primary">${n}</span> <span class="mdi ${icone}"></span>${titre}</span></div><div class="panel-body stack">${corps}</div></div>`;
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Créer une app</div><h2 class="section-title">De l’idée à l’app, avec Claude</h2>
        <p class="section-desc">L’Atelier prépare tout ce que Claude doit savoir (ton besoin, tes kits, tes blocs), Claude écrit l’app complète, et tu la ranges ici pour la gérer : versions, base de données, app mobile, audit.</p></div></div>
      <div class="grid grid-3">
        ${etape(1, 'mdi-text-box-outline', 'Prépare le prompt et le pack', `<p class="muted" style="margin:0"><b>Nouvelle app</b> : remplis quelques champs (nom, code, besoin), le prompt du kit « App complète » se complète tout seul. <b>Prompt et pack</b> : pour cocher plusieurs kits (${nbKits}) et des blocs (${nbBlocs}), ou faire évoluer une app (code actuel et schéma des bases joints).</p>
          <div class="row"><a class="btn btn-primary" href="#/creer/prompt"><span class="mdi mdi-text-box-outline"></span>Nouvelle app</a>
            <a class="btn btn-outline" href="#/prompt"><span class="mdi mdi-package-variant"></span>Prompt et pack</a>
            ${avecCode.length || apps.length ? `<select class="tv-select" id="crEvol" style="width:auto"><option value="">Faire évoluer une app…</option>${apps.map(a => `<option value="${esc(a.id)}">${esc(a.nom)}</option>`).join('')}</select>` : ''}</div>`)}
        ${etape(2, 'mdi-robot-outline', 'Dans Claude', `<ol style="margin:0;padding-left:18px;line-height:1.7">
            <li>Ouvre une nouvelle conversation (ou un projet Claude).</li>
            <li>Colle le prompt et <b>joins le pack ZIP</b>.</li>
            <li>Valide le plan que Claude te propose.</li>
            <li>Demande-lui l’app complète <b>en un seul ZIP</b> (le prompt le précise, avec la fiche <code>atelier-app.json</code>).</li></ol>`)}
        ${etape(3, 'mdi-folder-zip-outline', 'Importe l’app livrée', `<p class="muted" style="margin:0">L’Atelier lit le ZIP : nom, technologies, variables, tables de la base, dossier web. L’app apparaît dans Mes apps, avec son code gardé version par version.</p>
          <div class="row"><button class="btn btn-primary" id="crImport"><span class="mdi mdi-upload-outline"></span>Importer le ZIP d’une nouvelle app</button></div>
          ${avecCode.length ? `<div class="row"><select class="tv-select" id="crVersApp" style="width:auto">${avecCode.map(a => `<option value="${esc(a.id)}">${esc(a.nom)} (v${a.code.courante})</option>`).join('')}</select>
            <button class="btn btn-outline btn-sm" id="crVersion"><span class="mdi mdi-source-branch"></span>Nouvelle version</button></div>` : ''}`)}
      </div>
      <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-puzzle-outline"></span>Sans Claude : composer avec des blocs</span></div>
        <div class="panel-body row"><p class="muted" style="margin:0;flex:1;min-width:240px">Pour une petite app : assemble des blocs de l’Atelier, règle-les et exporte une PWA prête à héberger.</p>
          <button class="btn btn-outline" id="crCompo"><span class="mdi mdi-puzzle-outline"></span>Composer une app</button>
          <a class="btn btn-ghost" href="#/blocs"><span class="mdi mdi-puzzle-edit-outline"></span>Blocs</a>
          <a class="btn btn-ghost" href="#/design"><span class="mdi mdi-palette-swatch-outline"></span>Studio design</a></div></div>
      ${apps.filter(a => a.creeAvec === 'claude').length ? `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-history"></span>Créées avec Claude</span></div>
        <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><tbody>${apps.filter(a => a.creeAvec === 'claude').slice(0, 8).map(a => `<tr>
          <td><a href="#/apps/${esc(a.id)}"><b>${esc(a.nom)}</b></a><div class="small muted">${esc(a.stack || '')}</div></td>
          <td class="small muted">code v${(a.code && a.code.courante) || '—'}</td><td class="small muted">${esc(U.fmtDate(a.modifie))}</td></tr>`).join('')}</tbody></table></div></div></div>` : ''}
    </div>`;
    const $ = s => root.querySelector(s);
    $('#crImport').onclick = () => AB.code.dialogueImport(null);
    $('#crCompo').onclick = AB.apps.dialogueNouvelle;
    if ($('#crEvol')) $('#crEvol').onchange = ev => { if (ev.target.value) AB.app.go('prompt/app/' + ev.target.value); };
    if ($('#crVersion')) $('#crVersion').onclick = async () => {
      const app = await AB.apps.get($('#crVersApp').value);
      if (app) AB.code.dialogueImport(app, () => { AB.revenus.ongletVoulu = 'code'; AB.app.go('apps/' + app.id); });
    };
    return {};
  };
})();
