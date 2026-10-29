/* ==========================================================================
   ab-vue-kits.js — les KITS : liste, import, éditeur
   Comme pour les blocs : « Enregistrer » remplace la version ouverte,
   « Nouvelle version » crée 1.0.1, 1.1.0 ou 2.0.0 ; les apps restent sur
   leur version jusqu'à ce qu'on les mette à jour dans le composeur.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  /** Apps qui utilisent chaque kit (toutes versions) et chaque version. */
  async function utilisations() {
    const apps = (await AB.db.list('apps')).filter(a => a.origine === 'plateforme');
    const parKit = {}, parVersion = {};
    apps.forEach(a => (a.kits || []).forEach(k => {
      (parKit[k.kit] = parKit[k.kit] || new Set()).add(a.id);
      (parVersion[`${k.kit}@${k.version}`] = parVersion[`${k.kit}@${k.version}`] || new Set()).add(a.nom);
    }));
    return { parKit, parVersion };
  }

  /** Aperçu d'une petite app d'exemple avec ce kit (et les kits par défaut des autres types). */
  function apercuKit(kit) {
    const temp = AB.kits.normaliser(kit);
    const ancien = AB.kits.get(temp.id, temp.version);
    AB.kits.toutes = AB.kits.toutes.filter(k => k !== ancien).concat([temp]);
    try {
      const autres = AB.kits.parDefaut().filter(r => { const k = AB.kits.get(r.kit, r.version); return k && k.type !== temp.type && k.id !== temp.id; });
      const exemple = id => { const d = AB.blocs.dernier(id); return d ? { uid: id, bloc: d.id, version: d.version, reglages: {} } : null; };
      return AB.rendu.apercu({
        nom: 'App d’exemple', icone: 'mdi-cellphone',
        kits: autres.concat([{ kit: temp.id, version: temp.version }]),
        blocs: ['accueil', 'paiement', 'liste'].map(exemple).filter(Boolean)
      });
    } finally {
      AB.kits.toutes = AB.kits.toutes.filter(k => k !== temp).concat(ancien ? [ancien] : []);
    }
  }

  /** Liste des critères (sections du prompt) : ajouter, renommer, réordonner, supprimer. */
  AB.kits.dialogueCriteres = function (apres) {
    const liste = U.clone(AB.kits.criteres);
    const { body } = U.dialog({
      title: 'Critères des kits', size: 'md',
      body: `<p class="muted" style="margin-top:0">Chaque critère est une section du prompt généré, dans cet ordre. Chaque kit y répond (onglet Critères) et y range ses règles. Renommer un critère ne touche pas aux kits ; en supprimer un laisse son texte dans les kits, sous son identifiant.</p><div id="dlgCrit"></div>
        <button class="btn btn-ghost btn-sm" id="dlgCritDefaut"><span class="mdi mdi-restore"></span>Revenir à la liste d’origine</button>`,
      actions: [{ label: 'Annuler' }, { label: 'Enregistrer', cls: 'btn-primary', onClick: async () => {
        await AB.kits.enregistrerCriteres(liste);
        U.toast('success', 'Critères enregistrés', `${AB.kits.criteres.length} critère(s).`);
        if (apres) apres();
      } }]
    });
    const dessiner = () => {
      const box = body.querySelector('#dlgCrit');
      box.innerHTML = '';
      box.appendChild(AB.lignes(liste, [{ k: 'titre', label: 'Critère' }, { k: 'id', label: 'Identifiant', type: 'mono', width: '150px', placeholder: 'auto' }], () => {}));
    };
    body.querySelector('#dlgCritDefaut').onclick = () => { liste.splice(0, liste.length, ...U.clone(AB.kits.CRITERES)); dessiner(); };
    dessiner();
  };

  /* ======================= Liste des kits ======================= */

  AB.vues.kits = async function (root) {
    AB.app.setCrumbs(['Kits']);
    const usage = await utilisations();
    const nbFichiers = {};
    (await AB.db.list('fichiers')).forEach(f => { nbFichiers[f.proprio] = (nbFichiers[f.proprio] || 0) + 1; });
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Kits</div><h2 class="section-title">Mes kits</h2>
        <p class="section-desc">Un kit rassemble tout ce que Claude doit savoir pour créer tes apps : des règles (charte graphique, cybersécurité, affichage, règles libres) et un dossier de documents (KIT.md, exemples de code, images, PDF…). Conçois-les ici, range-les, versionne-les, puis exporte-les en ZIP à joindre dans Claude avec ton prompt. Les kits « par défaut » sont proposés pour chaque nouvelle app.</p></div>
        <div class="row"><button class="btn btn-outline" id="kiCrit"><span class="mdi mdi-format-list-text"></span>Critères</button>
        <a class="btn btn-outline" href="#/prompt"><span class="mdi mdi-text-box-outline"></span>Générer un prompt</a>
        <button class="btn btn-outline" id="kiTout" title="Toutes les dernières versions des kits dans un seul ZIP (un dossier par kit), réimportable d’un coup"><span class="mdi mdi-folder-download-outline"></span>Tout télécharger</button>
        <button class="btn btn-outline" id="kiImport" title="ZIP d’un kit (ou de n’importe quel dossier de documents), ou fichier .js / .json exporté"><span class="mdi mdi-upload-outline"></span>Importer un kit (ZIP)</button>
        <button class="btn btn-primary" id="kiNew"><span class="mdi mdi-plus"></span>Nouveau kit</button></div></div>
      <div id="kiListe" class="stack"></div></div>`;

    const draw = () => {
      const kits = AB.kits.derniers();
      root.querySelector('#kiListe').innerHTML = Object.entries(AB.kits.TYPES).map(([type, T]) => {
        const liste = kits.filter(k => k.type === type);
        return `<div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi ${T.icone}"></span>${esc(T.label)}</span>
            <span class="small muted">${T.unique ? 'un seul par app' : 'plusieurs possibles par app'}</span></div>
          <div class="panel-body flush">${liste.length ? `<div class="table-wrap"><table class="tv-table"><tbody>
          ${liste.map(k => {
            const nbApps = usage.parKit[k.id] ? usage.parKit[k.id].size : 0;
            const nbV = AB.kits.versions(k.id).length;
            const nbCrit = Object.values(k.criteres).filter(t => String(t).trim()).length;
            return `<tr><td><b>${esc(k.nom)}</b> ${k.obligatoire ? '<span class="chip chip-danger"><span class="mdi mdi-lock"></span>Obligatoire</span>' : k.parDefaut ? '<span class="chip chip-accent">Par défaut</span>' : ''} ${k.etiquettes.map(t => `<span class="chip">${esc(t)}</span>`).join(' ')}<div class="small muted">${esc(k.description)}</div></td>
              <td style="white-space:nowrap"><span class="chip chip-primary">v${esc(k.version)}</span>${nbV > 1 ? ` <span class="small muted">${nbV} versions</span>` : ''}</td>
              <td class="small muted" style="white-space:nowrap">${nbCrit} critère(s) · ${k.regles.length} règle(s)${nbFichiers[AB.kits.proprio(k)] ? ` · <span class="mdi mdi-paperclip"></span>${nbFichiers[AB.kits.proprio(k)]} fichier(s)` : ''}</td>
              <td style="white-space:nowrap">${nbApps ? `${nbApps} app(s)` : '<span class="muted">—</span>'}</td>
              <td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-exp="${esc(k.cle)}" title="Télécharger le kit en ZIP (règles + fichiers), à joindre dans Claude"><span class="mdi mdi-folder-zip-outline"></span></button>
                <a class="btn btn-outline btn-xs" href="#/kits/${esc(k.id)}/${esc(k.version)}"><span class="mdi mdi-pencil-outline"></span>Modifier</a></td></tr>`;
          }).join('')}</tbody></table></div>` : `<div class="empty" style="padding:16px">Aucun kit de ce type.</div>`}</div></div>`;
      }).join('');
      root.querySelectorAll('[data-exp]').forEach(btn => btn.onclick = async () => {
        const k = AB.kits.toutes.find(x => x.cle === btn.dataset.exp);
        U.download(`kit-${k.id}-v${k.version}.zip`, await AB.kits.versZip(k));
      });
    };

    root.querySelector('#kiNew').onclick = () => AB.app.go('kits/nouveau/1.0.0');
    root.querySelector('#kiTout').onclick = async () => {
      const kits = AB.kits.derniers();
      U.download(`kits-atelier-${new Date().toISOString().slice(0, 10)}.zip`, await AB.kits.versZipTous(kits));
      U.toast('success', 'Kits téléchargés', `${kits.length} kits, un dossier chacun.`);
    };
    root.querySelector('#kiCrit').onclick = () => AB.kits.dialogueCriteres(draw);
    root.querySelector('#kiImport').onclick = async () => {
      const [z] = await AB.fichiers.choisir({ accept: '.zip,.js,.json' });
      if (!z) return;
      if (/\.zip$/i.test(z.name)) {
        try {
          const kits = await AB.kits.importerZipTous(z, z.name);
          if (kits.length === 1) {
            const [k] = kits;
            U.toast('success', 'Kit importé', `${k.nom} v${k.version}, avec ses fichiers.`);
            AB.app.go(`kits/${k.id}/${k.version}`);
          } else {
            U.toast('success', `${kits.length} kits importés`, kits.map(k => `${k.nom} v${k.version}`).join(', '));
            AB.vues.kits(root);
          }
        } catch (e) { U.toast('error', 'Import impossible', e.message, 8000); }
        return;
      }
      const f = { nom: z.name, texte: await z.text() };
      try {
        const defs = AB.kits.depuisFichier(f.texte);
        if (!defs.length) throw new Error('Aucun kit trouvé dans ce fichier.');
        for (const d of defs) {
          if (AB.kits.get(d.id, d.version) && !(await U.confirm('Kit déjà présent', `${d.nom} v${d.version} existe déjà. Le remplacer ?`, { okLabel: 'Remplacer' }))) continue;
          await AB.kits.enregistrer(Object.assign(d, { origine: 'importe' }));
        }
        U.toast('success', 'Import terminé', `${defs.length} kit(s) lu(s) dans ${f.nom}.`);
        draw();
      } catch (e) { U.toast('error', 'Import impossible', e.message, 8000); }
    };
    draw();
    return {};
  };

  /* ======================= Éditeur d'un kit ======================= */

  AB.vues.kit = async function (root, [id, version]) {
    const nouveau = id === 'nouveau';
    const original = nouveau ? null : AB.kits.get(id, version);
    if (!nouveau && !original) {
      root.innerHTML = `<div class="page"><div class="empty"><span class="mdi mdi-package-variant-remove"></span>Kit introuvable. <a href="#/kits">Retour aux kits</a></div></div>`;
      return {};
    }
    const k = nouveau ? AB.kits.normaliser({ id: '', nom: '', type: 'libre', journal: [{ version: '1.0.0', date: new Date().toISOString().slice(0, 10), texte: 'Première version' }] })
      : AB.kits.normaliser(original);
    const usage = (await utilisations()).parVersion[`${k.id}@${k.version}`];
    let onglet = 'identite', modifie = false, timer = null;

    AB.app.setCrumbs(['Kits', nouveau ? 'Nouveau kit' : `${k.nom} v${k.version}`]);
    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">${nouveau ? 'Nouveau kit' : esc(AB.kits.TYPES[k.type].label)}</div>
        <h2 class="section-title"><span id="keNom">${esc(k.nom || 'Sans nom')}</span> <span class="chip chip-primary">v${esc(k.version)}</span></h2>
        ${usage ? `<p class="section-desc">Cette version est utilisée par : ${esc([...usage].join(', '))}. Enregistrer la modifie pour ces apps ; une nouvelle version les laisse inchangées.</p>` : ''}</div>
        <div class="row">
          ${nouveau ? '' : `<button class="btn btn-danger-text" id="keDel"><span class="mdi mdi-delete-outline"></span>Supprimer cette version</button>
          <button class="btn btn-outline" id="keExp" title="Règles + fichiers, à joindre dans Claude ou à réimporter"><span class="mdi mdi-folder-zip-outline"></span>ZIP du kit</button>
          <button class="btn btn-outline" id="keNewV"><span class="mdi mdi-source-branch"></span>Nouvelle version</button>`}
          <button class="btn btn-primary" id="keSave"><span class="mdi mdi-content-save-outline"></span>Enregistrer</button></div></div>
      <div id="keErreurs"></div>
      <div class="composer" style="grid-template-columns:minmax(0,1fr) 300px">
        <div class="panel"><div class="tabs" id="keTabs" style="padding:0 8px"></div><div class="panel-body" id="keBody"></div></div>
        <div class="stack"><div class="phone"><iframe id="kePhone" sandbox="allow-scripts allow-forms allow-popups" title="Aperçu du kit"></iframe></div>
          <div class="small muted" style="text-align:center">App d’exemple avec ce kit</div></div>
      </div></div>`;

    const ONGLETS = [['identite', 'Identité', 'mdi-card-text-outline'], ['fichiers', 'Fichiers', 'mdi-folder-outline'], ['valeurs', 'Réglages', 'mdi-tune-variant'],
      ['criteres', 'Critères', 'mdi-format-list-text'], ['regles', 'Règles', 'mdi-clipboard-check-outline'],
      ['reference', 'Référence', 'mdi-book-open-variant'], ['css', 'CSS', 'mdi-language-css3'], ['journal', 'Journal', 'mdi-history']];
    const AIDE_TROUS = 'Écris [[Nom du client]] pour un champ à remplir au moment de générer le prompt ([[nom]] et [[description]] sont remplis d’office).';

    const propre = () => { const c = U.clone(k); c.regles = c.regles.filter(r => r.texte && r.texte.trim()); return c; };

    function changer() {
      modifie = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const c = AB.kits.normaliser(propre());
        root.querySelector('#keNom').textContent = c.nom || 'Sans nom';
        const err = AB.kits.valider(c);
        root.querySelector('#keErreurs').innerHTML = err.length ? `<div class="bar warn"><span class="mdi mdi-alert-outline"></span><div>${err.map(esc).join('<br>')}</div></div>` : '';
        root.querySelector('#kePhone').srcdoc = apercuKit(c);
      }, 300);
    }

    function dessinerOnglets() {
      root.querySelector('#keTabs').innerHTML = ONGLETS.map(([c, l, i]) =>
        `<button class="tab ${c === onglet ? 'active' : ''}" data-tab="${c}"><span class="mdi ${i}"></span>${esc(l)}</button>`).join('');
      root.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { onglet = t.dataset.tab; dessinerOnglets(); dessinerCorps(); });
    }

    function dessinerCorps() {
      const body = root.querySelector('#keBody');
      const T = AB.kits.TYPES[k.type];
      if (onglet === 'identite') {
        body.innerHTML = `<div class="stack">
          <div class="grid grid-2">
            <div class="input-group"><label class="input-label">Nom</label><input class="tv-input" data-k="nom" value="${esc(k.nom)}"></div>
            <div class="input-group"><label class="input-label">Identifiant</label><input class="tv-input mono" data-k="id" value="${esc(k.id)}" ${nouveau ? '' : 'readonly'}>
              <div class="input-hint">${nouveau ? 'Rempli d’après le nom.' : 'Fixe une fois le kit créé.'}</div></div>
          </div>
          <div class="input-group"><label class="input-label">Type</label>
            <select class="tv-select" data-k="type" ${nouveau ? '' : 'disabled'}>${Object.entries(AB.kits.TYPES).map(([t, x]) => `<option value="${t}" ${t === k.type ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
          <div class="input-group"><label class="input-label">Description</label><textarea class="tv-textarea" data-k="description" style="min-height:60px">${esc(k.description)}</textarea></div>
          <div class="input-group"><label class="input-label">Étiquettes</label><input class="tv-input" id="keEtiq" value="${esc(k.etiquettes.join(', '))}" placeholder="mobile, e-commerce, B2B…">
            <div class="input-hint">Séparées par des virgules ; elles servent à filtrer les kits dans le générateur de prompt.</div></div>
          <label class="check"><input type="checkbox" id="kePD" ${k.parDefaut ? 'checked' : ''}> Appliquer par défaut à chaque nouvelle app</label>
          <label class="check"><input type="checkbox" id="keOblig" ${k.obligatoire ? 'checked' : ''}> <b>Obligatoire pour toutes les apps</b> <span class="muted">(ajouté à chaque app, y compris existantes, et impossible à retirer)</span></label>
        </div>`;
        let idTouche = !nouveau;
        body.querySelectorAll('[data-k]').forEach(el => el.oninput = el.onchange = () => {
          k[el.dataset.k] = el.value;
          if (el.dataset.k === 'id') idTouche = true;
          if (el.dataset.k === 'nom' && nouveau && !idTouche) { k.id = U.slug(el.value); body.querySelector('[data-k="id"]').value = k.id; }
          if (el.dataset.k === 'type') { k.valeurs = {}; Object.assign(k, AB.kits.normaliser(k)); }
          changer();
        });
        body.querySelector('#kePD').onchange = e => { k.parDefaut = e.target.checked; changer(); };
        body.querySelector('#keOblig').onchange = e => { k.obligatoire = e.target.checked; changer(); };
        body.querySelector('#keEtiq').oninput = e => { k.etiquettes = e.target.value.split(',').map(t => t.trim()).filter(Boolean); changer(); };
      }
      if (onglet === 'fichiers') {
        if (nouveau) {
          body.innerHTML = `<div class="empty"><span class="mdi mdi-content-save-outline"></span>Enregistre d’abord le kit (nom et identifiant) : tu pourras ensuite y déposer ses fichiers.</div>`;
        } else {
          AB.fichiers.panneau(body, AB.kits.proprio(k), {
            aide: 'Les documents du kit : KIT.md, PROMPT.md, exemples de code, captures, PDF, logos… Ils partent dans le ZIP du kit et dans le pack à joindre dans Claude. Les modifications sont enregistrées tout de suite, pour cette version du kit.'
          });
        }
      }
      if (onglet === 'valeurs') {
        body.innerHTML = T.champs.length
          ? `<p class="muted" style="margin-top:0">Ces valeurs s’appliquent à toutes les apps qui utilisent ce kit.${k.type === 'charte' ? ' Chaque app peut ensuite changer certaines valeurs dans son onglet Thème.' : ''}</p><div class="stack" id="keVal">${AB.champs.html(T.champs, k.valeurs)}</div>`
          : `<div class="empty"><span class="mdi mdi-clipboard-text-outline"></span>Un kit de règles libres n’a pas de réglage : ajoute ses règles dans l’onglet Règles.</div>`;
        const box = body.querySelector('#keVal');
        if (box) box.oninput = box.onchange = () => { Object.assign(k.valeurs, AB.champs.lire(box, T.champs)); changer(); };
      }
      if (onglet === 'criteres') {
        body.innerHTML = `<div class="stack">
          <p class="muted" style="margin:0">Ce que ce kit dit pour chaque critère, comme les sections du PROMPT.md du KIT Techview. Laisse vide un critère qui ne le concerne pas. ${esc(AIDE_TROUS)}</p>
          ${AB.kits.criteres.map(c => `<div class="input-group"><label class="input-label">${esc(c.titre)}</label>
            <textarea class="tv-textarea" data-crit="${esc(c.id)}" style="min-height:${k.criteres[c.id] ? 110 : 54}px">${esc(k.criteres[c.id] || '')}</textarea></div>`).join('')}
          ${Object.keys(k.criteres).filter(id => !AB.kits.criteres.some(c => c.id === id) && k.criteres[id]).map(id => `<div class="input-group"><label class="input-label">${esc(id)} <span class="chip chip-warning">critère absent de la liste</span></label>
            <textarea class="tv-textarea" data-crit="${esc(id)}">${esc(k.criteres[id])}</textarea></div>`).join('')}
          <div class="row"><button class="btn btn-ghost btn-sm" id="keCritListe"><span class="mdi mdi-format-list-bulleted"></span>Modifier la liste des critères</button><div class="spacer"></div>
            <button class="btn btn-outline btn-sm" id="keVoirPrompt"><span class="mdi mdi-text-box-outline"></span>Voir le prompt de ce kit seul</button></div>
          <pre class="code" id="kePrompt" hidden></pre></div>`;
        body.querySelectorAll('[data-crit]').forEach(t => t.oninput = () => {
          if (t.value.trim()) k.criteres[t.dataset.crit] = t.value; else delete k.criteres[t.dataset.crit];
          changer();
        });
        body.querySelector('#keCritListe').onclick = () => AB.kits.dialogueCriteres(() => dessinerCorps());
        body.querySelector('#keVoirPrompt').onclick = () => {
          const pre = body.querySelector('#kePrompt');
          pre.hidden = !pre.hidden;
          pre.textContent = AB.prompt.generer({ kits: [AB.kits.normaliser(propre())], nom: k.nom ? `Exemple (${k.nom})` : 'Exemple', fin: AB.prompt.FIN });
        };
      }
      if (onglet === 'regles') {
        const options = {};
        AB.kits.criteres.forEach(c => { options[c.id] = c.titre; });
        k.regles.forEach(r => { if (r.critere && !options[r.critere]) options[r.critere] = r.critere; });
        body.innerHTML = `<p class="muted" style="margin-top:0">Règles écrites : elles vont dans la section du critère choisi du prompt, dans la checklist finale, et chaque app les coche dans son onglet Conformité. Une règle obligatoire non cochée compte comme point bloquant.</p>`;
        body.appendChild(AB.lignes(k.regles, [
          { k: 'texte', label: 'Règle' },
          { k: 'critere', label: 'Critère', type: 'select', options, width: '190px' },
          { k: 'niveau', label: 'Niveau', type: 'select', options: { obligatoire: 'Obligatoire', recommande: 'Recommandé' }, width: '140px' }
        ], () => {
          // Identifiant stable pour les nouvelles règles (les coches des apps y sont rattachées)
          k.regles.forEach(r => { if (!r.id) r.id = 'r-' + U.uuid().slice(0, 8); });
          changer();
        }));
      }
      if (onglet === 'reference') {
        body.innerHTML = `<p class="muted" style="margin-top:0">Texte de référence long, comme le KIT.md du KIT Techview : conventions détaillées, exemples, pièges. Il va en annexe du prompt (Markdown accepté). ${esc(AIDE_TROUS)}</p>
          <textarea class="tv-textarea code" id="keRef" spellcheck="false" style="min-height:360px;white-space:pre-wrap">${esc(k.reference)}</textarea>
          <div class="row" style="margin-top:8px"><button class="btn btn-ghost btn-sm" id="keRefImp"><span class="mdi mdi-file-upload-outline"></span>Charger un fichier .md</button></div>`;
        body.querySelector('#keRef').oninput = e => { k.reference = e.target.value; changer(); };
        body.querySelector('#keRefImp').onclick = async () => {
          const f = await U.pickFile('.md,.txt,.markdown');
          if (!f) return;
          k.reference = f.texte; changer(); dessinerCorps();
        };
      }
      if (onglet === 'css') {
        body.innerHTML = `<p class="muted" style="margin-top:0">CSS ajouté à toutes les apps qui utilisent ce kit. Variables disponibles : <code>--primaire</code>, <code>--accent</code>, <code>--fond</code>, <code>--texte</code>, <code>--rayon</code>, <code>--police</code>.</p>
          <textarea class="tv-textarea code" id="keCss" spellcheck="false" style="min-height:280px">${esc(k.css)}</textarea>`;
        body.querySelector('#keCss').oninput = e => { k.css = e.target.value; changer(); };
      }
      if (onglet === 'journal') {
        const autres = nouveau ? [] : AB.kits.versions(k.id);
        body.innerHTML = `<div class="stack"><div class="table-wrap"><table class="tv-table"><thead><tr><th>Version</th><th>Date</th><th>Changement</th></tr></thead><tbody>
          ${k.journal.slice().reverse().map(j => `<tr><td>v${esc(j.version)}</td><td class="muted">${esc(j.date)}</td><td>${esc(j.texte)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Vide</td></tr>'}</tbody></table></div>
          ${autres.length > 1 ? `<div><b>Toutes les versions :</b> ${autres.map(v => v.version === k.version ? `<span class="chip chip-primary">v${esc(v.version)}</span>` : `<a class="chip" href="#/kits/${esc(v.id)}/${esc(v.version)}">v${esc(v.version)}</a>`).join(' ')}</div>` : ''}</div>`;
      }
    }

    async function enregistrer(def) {
      try {
        const s = await AB.kits.enregistrer(Object.assign(def, { origine: def.origine === 'fourni' ? 'fourni-modifie' : (def.origine || 'atelier') }));
        modifie = false;
        U.toast('success', 'Kit enregistré', `${s.nom} v${s.version}`);
        return s;
      } catch (e) { U.toast('error', 'Le kit n’est pas valide', e.message, 8000); return null; }
    }

    root.querySelector('#keSave').onclick = async () => {
      const def = propre();
      if (nouveau && AB.kits.dernier(def.id)) { U.toast('error', 'Identifiant déjà pris', `Un kit « ${def.id} » existe déjà.`); return; }
      const s = await enregistrer(def);
      if (s && nouveau) AB.app.go(`kits/${s.id}/${s.version}`);
    };
    if (!nouveau) {
      root.querySelector('#keExp').onclick = async () => U.download(`kit-${k.id}-v${k.version}.zip`, await AB.kits.versZip(AB.kits.normaliser(propre())));
      root.querySelector('#keDel').onclick = async () => {
        const msg = usage ? `Attention : ${[...usage].join(', ')} utilise(nt) cette version et afficheront « kit introuvable ».` : 'Cette version sera supprimée.';
        if (!(await U.confirm(`Supprimer ${k.nom} v${k.version}`, msg, { danger: true, okLabel: 'Supprimer' }))) return;
        await AB.kits.supprimer(k.id, k.version);
        await AB.fichiers.vider(AB.kits.proprio(k));
        modifie = false;
        const reste = AB.kits.dernier(k.id);
        AB.app.go(reste ? `kits/${reste.id}/${reste.version}` : 'kits');
      };
      root.querySelector('#keNewV').onclick = () => {
        const options = ['correctif', 'mineure', 'majeure'].map(n => [n, U.bumpVersion(k.version, n)]);
        U.dialog({
          title: 'Nouvelle version du kit', size: 'sm',
          body: `<div class="stack"><div class="input-group"><label class="input-label">Type de changement</label><select class="tv-select" id="nvNiv">
              ${options.map(([n, v]) => `<option value="${v}">${v} — ${n === 'correctif' ? 'correctif' : n === 'mineure' ? 'ajout compatible' : 'changement important'}</option>`).join('')}</select></div>
            <div class="input-group"><label class="input-label">Ce qui change</label><input class="tv-input" id="nvTxt"></div>
            <p class="small muted" style="margin:0">Les apps restent sur leur version ; le composeur leur propose la mise à jour.</p></div>`,
          actions: [{ label: 'Annuler' }, { label: 'Créer la version', cls: 'btn-primary', onClick: async ({ body }) => {
            const v = body.querySelector('#nvNiv').value;
            if (AB.kits.get(k.id, v)) { U.toast('error', 'Version existante', `La v${v} existe déjà.`); return false; }
            const def = propre();
            def.version = v;
            def.journal.push({ version: v, date: new Date().toISOString().slice(0, 10), texte: body.querySelector('#nvTxt').value.trim() || 'Nouvelle version' });
            const s = await enregistrer(def);
            if (!s) return false;
            await AB.fichiers.copier(AB.kits.proprio(k), AB.kits.proprio(s));   // la nouvelle version part des mêmes fichiers
            AB.app.go(`kits/${s.id}/${s.version}`);
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
        if (modifie) U.toast('warning', 'Modifications non enregistrées', `${k.nom || 'Le kit'} n’a pas été enregistré.`, 6000);
      }
    };
  };
})();
