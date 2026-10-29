/* ==========================================================================
   ab-vue-code.js — import du ZIP d'une app et onglet « Code et versions »
   AB.code.dialogueImport(app?)  : choisit un ZIP, montre ce qui a été trouvé,
                                   crée l'app ou ajoute une version ;
   AB.code.vue(conteneur, app)   : versions du code dans l'espace de l'app
                                   (télécharger, parcourir, auditer, mobile).
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const C = AB.code, F = AB.fichiers;

  /** Résumé de l'analyse, en HTML. */
  function resume(a, r) {
    const lignes = [
      ['Nom', esc(a.nom)], ['Technologies', esc(a.stack || '—')],
      ['Fichiers', `${a.nbFichiers}${a.web ? ` · interface web dans <code>${esc(a.web || '/')}</code>` : ''}`],
      ['Base de données', r ? `${r.tables.length} table(s) trouvée(s) dans <code>${esc(a.schemas[0].chemin)}</code>` : '<span class="muted">aucun schéma (*.sql, schema.prisma)</span>'],
      ['Variables', a.env.length ? a.env.map(v => `<code>${esc(v.cle)}</code>${v.secret ? ' <span class="mdi mdi-lock-outline" title="secret"></span>' : ''}`).join(' ') : '<span class="muted">aucune (.env.example)</span>'],
      ['Fiche Atelier', a.manifeste ? `<span class="chip chip-success">${esc(C.MANIFESTE)}</span>` : `<span class="muted">pas de ${esc(C.MANIFESTE)} : informations devinées</span>`]
    ];
    return `<table class="tv-table"><tbody>${lignes.map(([k, v]) => `<tr><td class="muted" style="white-space:nowrap">${k}</td><td>${v}</td></tr>`).join('')}</tbody></table>
      ${a.description ? `<p class="small" style="margin:8px 0 0">${esc(a.description)}</p>` : ''}
      ${a.alertes.map(t => `<div class="bar warn" style="margin-top:8px"><span class="mdi mdi-alert-outline"></span><div>${esc(t)}</div></div>`).join('')}`;
  }

  /** Importe un ZIP : nouvelle app (app absente) ou nouvelle version de app. */
  C.dialogueImport = async function (app, apres) {
    const [z] = await F.choisir({ accept: '.zip' });
    if (!z) return;
    let analyse, r;
    try {
      const { fichiers } = await F.lireZip(z);
      analyse = C.analyser(fichiers, z.name);
      r = C.tables(analyse);
    } catch (e) { return U.toast('error', 'Lecture impossible', e.message, 8000); }
    const aDesTables = app && (app.bases || []).some(b => b.tables.length);
    U.dialog({
      title: app ? `Nouvelle version de ${app.nom}` : 'Importer l’app créée par Claude', size: 'md',
      body: `<div class="stack"><div class="small muted">${esc(z.name)} · ${F.taille(z.size)}</div>${resume(analyse, r)}
        ${app ? `<label class="check"><input type="checkbox" id="ciInfos" ${analyse.manifeste ? 'checked' : ''}> Reprendre le nom, la description, les technologies et les nouvelles variables</label>
          ${r ? `<label class="check"><input type="checkbox" id="ciSchema" checked> Mettre à jour la base de données avec ces ${r.tables.length} table(s)${aDesTables ? ' <span class="muted">(les tables du même nom sont remplacées, les autres gardées)</span>' : ''}</label>` : ''}
          <div class="input-group"><label class="input-label">Ce qui change dans cette version</label><input class="tv-input" id="ciNote" placeholder="Ex. ajout de la facturation"></div>`
          : `<p class="small muted" style="margin:0">L’app apparaît dans Mes apps. Le ZIP est gardé tel quel (version 1) : tu pourras le retélécharger, l’auditer, en faire l’app mobile, ou importer les versions suivantes.</p>`}</div>`,
      actions: [{ label: 'Annuler' }, { label: app ? 'Ajouter la version' : 'Importer l’app', cls: 'btn-primary', icon: 'mdi-check', onClick: async ({ body }) => {
        try {
          const opts = app ? { infos: body.querySelector('#ciInfos').checked, schema: !!(body.querySelector('#ciSchema') && body.querySelector('#ciSchema').checked), note: body.querySelector('#ciNote').value.trim() } : {};
          const res = await C.importer(z, z.name, app, opts);
          U.toast('success', res.nouvelle ? 'App importée' : `Version ${res.version.numero} ajoutée`, `${res.app.nom}${res.tables ? ` · ${res.tables} table(s) dans la base` : ''}`);
          if (apres) apres(res); else { AB.revenus.ongletVoulu = 'code'; AB.app.go('apps/' + res.app.id); }
        } catch (e) { U.toast('error', 'Import impossible', e.message, 8000); return false; }
      } }]
    });
  };

  /** Liste des fichiers d'un ZIP (lecture seule, aperçu des textes). */
  async function parcourir(blob, titre) {
    const { fichiers } = await F.lireZip(blob);
    const chemins = Object.keys(fichiers).sort();
    const { body } = U.dialog({
      title: titre, size: 'lg',
      body: `<div class="stack"><input class="tv-input" id="cpFiltre" placeholder="Filtrer (ex. api/, .sql, index.html)">
        <div class="grid grid-2" style="grid-template-columns:minmax(0,320px) minmax(0,1fr);align-items:start">
          <div id="cpListe" style="max-height:60vh;overflow:auto;font-size:13px"></div>
          <pre class="code" id="cpTexte" style="max-height:60vh;overflow:auto;margin:0;white-space:pre-wrap">Choisis un fichier.</pre></div></div>`
    });
    const dessiner = f => {
      body.querySelector('#cpListe').innerHTML = chemins.filter(c => !f || c.toLowerCase().includes(f)).slice(0, 800)
        .map(c => `<div><a href="#" data-c="${esc(c)}">${esc(c)}</a> <span class="muted">${F.taille(fichiers[c].length)}</span></div>`).join('') || '<span class="muted">Aucun fichier.</span>';
      body.querySelectorAll('[data-c]').forEach(a => a.onclick = e => {
        e.preventDefault();
        const c = a.dataset.c;
        body.querySelector('#cpTexte').textContent = F.estTexte(c) || /\.(ts|tsx|jsx|vue|php|py|rb|go|java|kt|swift|sh|toml|ini|lock|gitignore)$/i.test(c)
          ? F.decoder(fichiers[c]).slice(0, 200000) : `${c} : fichier binaire (${F.taille(fichiers[c].length)}).`;
      });
    };
    body.querySelector('#cpFiltre').oninput = e => dessiner(e.target.value.trim().toLowerCase());
    dessiner('');
  }

  /** Audit de sécurité d'une version du code, rattaché à l'app. */
  async function auditer(app, v, etat) {
    etat('<span class="mdi mdi-loading mdi-spin"></span> Audit en cours…');
    try {
      const blob = await C.zip(app, v.numero);
      const src = await AB.audit.lireZip(blob);
      const audit = await AB.audit.lancer({ type: 'code', nom: `${app.nom} v${v.numero}`, appId: app.id, source: v.nom }, { fichiers: src.fichiers, noms: src.noms, ignores: src.ignores });
      await AB.audit.enregistrer(audit);
      AB.app.go('audit/rapport/' + audit.id);
    } catch (e) { etat(`<span class="chip chip-danger">Erreur</span> ${esc(e.message)}`); }
  }

  /** Onglet « Code et versions » de l'espace d'une app. */
  C.vue = function (conteneur, app, redessiner) {
    const versions = C.versions(app);
    const cour = C.courante(app);
    conteneur.innerHTML = `<div class="stack">
      <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-folder-zip-outline"></span>Code de l’app</span><div class="spacer"></div>
          <a class="btn btn-outline btn-sm" href="#/prompt/app/${esc(app.id)}"><span class="mdi mdi-text-box-outline"></span>Prompt d’évolution pour Claude</a>
          <button class="btn btn-primary btn-sm" id="ccImport"><span class="mdi mdi-upload-outline"></span>Importer une nouvelle version (ZIP)</button></div>
        <div class="panel-body stack">
          ${cour ? `<div class="bar ok"><span class="mdi mdi-check-circle-outline"></span><div>Version courante : <b>v${cour.numero}</b> · ${esc(cour.nom)} · ${cour.nbFichiers} fichiers · ${F.taille(cour.taille)} · ${esc(U.fmtDate(cour.date))}${cour.stack ? ` · ${esc(cour.stack)}` : ''}</div></div>
            <div class="row"><button class="btn btn-outline btn-sm" data-act="parcourir" data-v="${cour.numero}"><span class="mdi mdi-file-tree-outline"></span>Parcourir les fichiers</button>
              <button class="btn btn-outline btn-sm" data-act="dl" data-v="${cour.numero}"><span class="mdi mdi-download"></span>Télécharger le ZIP</button>
              <a class="btn btn-outline btn-sm" href="#/mobile/app/${esc(app.id)}"><span class="mdi mdi-cellphone-arrow-down"></span>App mobile et émulateur</a>
              <button class="btn btn-outline btn-sm" data-act="audit" data-v="${cour.numero}"><span class="mdi mdi-shield-search"></span>Audit de sécurité</button>
              <span class="small muted" id="ccEtat"></span></div>`
            : `<div class="empty" style="padding:16px"><span class="mdi mdi-folder-zip-outline"></span>Pas encore de code dans l’Atelier pour cette app. Importe le ZIP créé par Claude (ou le ZIP de ton projet) : il sera gardé ici, version par version.</div>`}
        </div></div>
      ${versions.length ? `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-history"></span>Versions</span></div>
        <div class="panel-body flush"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Version</th><th>Date</th><th>Fichier</th><th>Note</th><th></th></tr></thead><tbody>
        ${versions.map(v => `<tr><td style="white-space:nowrap"><b>v${v.numero}</b> ${v.numero === app.code.courante ? '<span class="chip chip-success">courante</span>' : ''}</td>
          <td class="muted" style="white-space:nowrap">${esc(U.fmtDate(v.date))}</td>
          <td>${esc(v.nom)}<div class="small muted">${v.nbFichiers} fichiers · ${F.taille(v.taille)}</div></td><td>${esc(v.note || '')}</td>
          <td class="actions" style="white-space:nowrap">
            <button class="btn btn-ghost btn-icon btn-sm" data-act="parcourir" data-v="${v.numero}" title="Parcourir"><span class="mdi mdi-file-tree-outline"></span></button>
            <button class="btn btn-ghost btn-icon btn-sm" data-act="dl" data-v="${v.numero}" title="Télécharger"><span class="mdi mdi-download"></span></button>
            ${v.numero !== app.code.courante ? `<button class="btn btn-ghost btn-icon btn-sm" data-act="courante" data-v="${v.numero}" title="Revenir à cette version"><span class="mdi mdi-restore"></span></button>
            <button class="btn btn-ghost btn-icon btn-sm" data-act="sup" data-v="${v.numero}" title="Supprimer"><span class="mdi mdi-close"></span></button>` : ''}</td></tr>`).join('')}
        </tbody></table></div></div></div>` : ''}</div>`;
    const etat = h => { const e = conteneur.querySelector('#ccEtat'); if (e) e.innerHTML = h; };
    conteneur.querySelector('#ccImport').onclick = () => C.dialogueImport(app, () => redessiner());
    conteneur.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
      const v = versions.find(x => x.numero === Number(b.dataset.v));
      try {
        if (b.dataset.act === 'dl') U.download(v.nom.replace(/\.zip$/i, '') + `-v${v.numero}.zip`, await C.zip(app, v.numero));
        if (b.dataset.act === 'parcourir') await parcourir(await C.zip(app, v.numero), `${app.nom} · v${v.numero}`);
        if (b.dataset.act === 'audit') await auditer(app, v, etat);
        if (b.dataset.act === 'courante') { app.code.courante = v.numero; app.journal.push({ date: U.now(), texte: `Retour au code v${v.numero}` }); await AB.apps.enregistrer(app); redessiner(); }
        if (b.dataset.act === 'sup') {
          if (!(await U.confirm(`Supprimer la version ${v.numero}`, `${v.nom} sera supprimé de l’Atelier.`, { danger: true, okLabel: 'Supprimer' }))) return;
          await C.supprimerVersion(app, v.numero); redessiner();
        }
      } catch (e) { U.toast('error', 'Action impossible', e.message, 8000); }
    });
  };
})();
