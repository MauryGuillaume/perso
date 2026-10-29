/* ==========================================================================
   ab-vue-nouvelle.js — « Créer une app › Nouvelle app » : le prompt d'entrée d'un kit, rempli champ par champ
   #/creer/prompt
   Le PROMPT.md du kit choisi est lu dans ses fichiers. Chaque ⟦…⟧ devient un champ :
   - ⟦Libellé⟧ ou ⟦Libellé : aide⟧ : champ obligatoire (un texte long devient une zone de saisie) ;
   - ⟦?Libellé : aide⟧ : champ facultatif ; vide, sa ligne disparaît du prompt ; rempli, il s'écrit « Libellé : valeur ».
   Le même libellé à plusieurs endroits n'est demandé qu'une fois. « Code » se déduit du nom tant qu'il n'est pas saisi.
   Le panneau « Nom et logo » (ab-identite.js) propose des noms et des logos ; le choix ajoute une section
   « Identité » au prompt et les icônes au ZIP du kit.
   Le brouillon est gardé (réglage « brouillonNouvelleApp »).
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};
  const RE = /⟦([^⟧]*)⟧/g;

  /** Champs d'un modèle de prompt, dans l'ordre d'apparition. */
  function champs(modele) {
    const vus = new Map();
    for (const m of modele.matchAll(RE)) {
      let brut = m[1].trim();
      if (!brut) continue;
      const facultatif = brut.startsWith('?');
      if (facultatif) brut = brut.slice(1).trim();
      const i = brut.indexOf(' : ');
      const libelle = (i > 0 ? brut.slice(0, i) : brut).trim();
      const aide = i > 0 ? brut.slice(i + 3).trim() : '';
      const cle = libelle.toLowerCase();
      if (!vus.has(cle)) vus.set(cle, { cle, libelle, aide: aide.replace(/^./, c => c.toUpperCase()), facultatif, long: /consigne|besoin|décri|rôles|offre/i.test(libelle + ' ' + aide) || aide.length > 140 });
    }
    return [...vus.values()];
  }
  const cleDe = brut => { brut = brut.trim().replace(/^\?/, '').trim(); const i = brut.indexOf(' : '); return (i > 0 ? brut.slice(0, i) : brut).trim().toLowerCase(); };
  const slug = s => U.slug ? U.slug(s) : String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** Valeur effective (le code se déduit du nom). */
  function valeur(c, valeurs, liste) {
    const v = String(valeurs[c.cle] || '').trim();
    if (v || !/^code/.test(c.cle)) return v;
    const nom = liste.find(x => /^nom/.test(x.cle));
    return nom ? slug(valeurs[nom.cle] || '') : '';
  }

  /** Prompt final : texte brut (à copier) ou HTML (aperçu, champs surlignés). */
  function rendre(modele, liste, valeurs, html) {
    const lignes = modele.replace(/\r\n/g, '\n').split('\n').filter(l => !/^>\s*Dans l'Atelier/i.test(l));
    const out = [];
    for (const ligne of lignes) {
      let vide = false;
      const morceaux = [];
      let dernier = 0;
      for (const m of ligne.matchAll(RE)) {
        morceaux.push(html ? esc(ligne.slice(dernier, m.index)) : ligne.slice(dernier, m.index));
        dernier = m.index + m[0].length;
        if (!m[1].trim()) { morceaux.push(html ? esc(m[0]) : m[0]); continue; }
        const c = liste.find(x => x.cle === cleDe(m[1]));
        const v = valeur(c, valeurs, liste);
        if (!v && c.facultatif) { vide = true; continue; }
        const texte = v ? (c.facultatif ? `${c.libelle} : ${v}` : v) : `⟦${c.libelle}⟧`;
        morceaux.push(html ? `<mark class="np-champ ${v ? 'rempli' : 'vide'}" data-va="${esc(c.cle)}">${esc(texte)}</mark>` : texte);
      }
      morceaux.push(html ? esc(ligne.slice(dernier)) : ligne.slice(dernier));
      const resultat = morceaux.join('');
      if (vide && !resultat.replace(/<[^>]+>/g, '').trim()) continue;   // ligne d'un champ facultatif laissé vide
      out.push(resultat);
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  async function modeleDe(k) {
    const f = (await AB.kits.fichiers(k)).find(x => x.chemin === 'PROMPT.md');
    return f ? AB.fichiers.texte(f) : '';
  }

  AB.vues.nouvelleApp = async function (root) {
    AB.app.setCrumbs(['Créer une app', 'Nouvelle app']);
    root.innerHTML = '<div class="page"><span class="mdi mdi-loading mdi-spin"></span></div>';
    // Kits qui ont un prompt d'entrée à remplir
    const candidats = [];
    for (const k of AB.kits.derniers()) {
      for (const v of AB.kits.versions(k.id)) {
        const modele = await modeleDe(v);
        if (RE.test(modele)) candidats.push({ k: v, modele, courante: v.version === k.version });
        RE.lastIndex = 0;
      }
    }
    if (!candidats.length) {
      root.innerHTML = `<div class="page"><div class="empty"><span class="mdi mdi-text-box-remove-outline"></span>Aucun kit n’a de prompt d’entrée (PROMPT.md avec des ⟦…⟧). <a href="#/kits">Mes kits</a></div></div>`;
      return {};
    }
    const brouillon = await AB.db.getMeta('brouillonNouvelleApp', null) || {};
    const parDefaut = candidats.find(c => c.k.id === brouillon.kit && c.k.version === brouillon.version) || candidats.find(c => c.k.id === 'app-complete' && c.courante) || candidats.find(c => c.courante) || candidats[0];
    const etat = { choix: parDefaut, valeurs: Object.assign({}, brouillon.valeurs || {}), identite: Object.assign({}, brouillon.identite || {}) };
    const garder = () => AB.db.setMeta('brouillonNouvelleApp', { kit: etat.choix.k.id, version: etat.choix.k.version, valeurs: etat.valeurs, identite: etat.identite });
    const kitsUniques = [...new Map(candidats.map(c => [c.k.id, c])).values()].sort((a, b) => (b.k.id === 'app-complete') - (a.k.id === 'app-complete'));

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Créer une app</div><h2 class="section-title">Nouvelle app : le prompt</h2>
        <p class="section-desc">Remplis les champs : le prompt se complète à droite. Copie-le dans Claude et joins le kit.
          Pour ajouter d’autres kits ou des blocs, passe par <a href="#/prompt">Prompt et pack</a>.</p></div></div>
      <div class="np-grille">
        <div class="stack"><div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-form-textbox"></span>Variables</span><div class="spacer"></div><span id="npReste"></span></div>
          <div class="panel-body stack">
            <div class="grid grid-2">
              <div class="input-group"><label class="input-label">Package joint</label><select class="tv-select" id="npKit">${kitsUniques.map(c => `<option value="${esc(c.k.id)}">${esc(c.k.nom)}</option>`).join('')}</select>
                <div class="small muted">À joindre à la conversation : <a href="#" id="npZip">télécharger le kit (.zip)</a>, avec le logo choisi</div></div>
              <div class="input-group"><label class="input-label">Version du prompt</label><select class="tv-select" id="npVersion"></select></div>
            </div>
            <div id="npChamps" class="stack"></div>
          </div></div>
          <div id="npIdentite"></div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-text-box-check-outline"></span>Prompt prêt à coller</span><div class="spacer"></div>
          <button class="btn btn-primary btn-sm" id="npCopier"><span class="mdi mdi-content-copy"></span>Copier</button>
          <button class="btn btn-outline btn-sm" id="npMd"><span class="mdi mdi-download"></span>.md</button>
          <button class="btn btn-outline btn-sm" id="npProjet"><span class="mdi mdi-rocket-launch-outline"></span>Enregistrer comme projet</button></div>
          <div class="panel-body"><div class="np-prompt" id="npPrompt"></div></div></div>
      </div></div>`;
    const $ = s => root.querySelector(s);

    function versions() {
      const liste = candidats.filter(c => c.k.id === etat.choix.k.id).sort((a, b) => U.cmpVersion(b.k.version, a.k.version));
      $('#npKit').value = etat.choix.k.id;
      $('#npVersion').innerHTML = liste.map(c => `<option value="${esc(c.k.version)}" ${c === etat.choix ? 'selected' : ''}>v${esc(c.k.version)}${c.courante ? ' (courante)' : ''}</option>`).join('');
    }
    function formulaire() {
      const liste = champs(etat.choix.modele);
      $('#npChamps').innerHTML = liste.map(c => `<div class="input-group"><label class="input-label" for="np-${esc(c.cle)}">${esc(c.libelle)}${c.facultatif ? ' <span class="muted">(facultatif)</span>' : ''}</label>
        ${c.long ? `<textarea class="tv-textarea" id="np-${esc(c.cle)}" data-champ="${esc(c.cle)}" rows="5">${esc(etat.valeurs[c.cle] || '')}</textarea>` : `<input class="tv-input" id="np-${esc(c.cle)}" data-champ="${esc(c.cle)}" value="${esc(etat.valeurs[c.cle] || '')}">`}
        ${c.aide ? `<div class="small muted">${esc(c.aide)}</div>` : ''}</div>`).join('');
      root.querySelectorAll('[data-champ]').forEach(el => {
        el.oninput = () => { etat.valeurs[el.dataset.champ] = el.value; apercu(); garder(); suivreIdentite(); };
        // Description terminée : Claude propose des noms et des logos s'il est joignable
        if (el.tagName === 'TEXTAREA') el.onchange = () => { if (!etat.identite.propositions || etat.identite.propositions.source !== 'claude') panneau.demanderClaude(true); };
      });
      apercu();
    }
    let minuteur = null;
    const suivreIdentite = () => { clearTimeout(minuteur); minuteur = setTimeout(() => panneau && panneau.rafraichir(), 700); };
    /** Ce que le panneau « Nom et logo » sait de l'app. */
    const contexte = () => {
      const l = champs(etat.choix.modele);
      return { nom: nomApp(), accroche: etat.identite.accroche || '', description: l.filter(c => c.long && !/^(rôles|offre)/.test(c.cle)).map(c => valeur(c, etat.valeurs, l)).filter(Boolean).join('\n') };
    };
    const section = () => AB.identite.section(etat.identite, nomApp(), 'identite/');
    function apercu() {
      const liste = champs(etat.choix.modele);
      const code = liste.find(c => /^code/.test(c.cle));
      if (code) { const el = root.querySelector(`[data-champ="${CSS.escape(code.cle)}"]`); if (el) el.placeholder = valeur(code, etat.valeurs, liste) || ''; }
      const reste = liste.filter(c => !c.facultatif && !valeur(c, etat.valeurs, liste)).length;
      $('#npReste').innerHTML = reste ? `<span class="chip chip-warning">${reste} à renseigner</span>` : '<span class="chip chip-success"><span class="mdi mdi-check"></span>Complet</span>';
      const s = section();
      $('#npPrompt').innerHTML = AB.identite.inserer(rendre(etat.choix.modele, liste, etat.valeurs, true), s ? `<mark class="np-champ rempli" data-identite="1">${esc(s)}</mark>` : '');
      const mi = root.querySelector('mark[data-identite]');
      if (mi) mi.onclick = () => $('#npIdentite').scrollIntoView({ behavior: 'smooth', block: 'start' });
      root.querySelectorAll('mark[data-va]').forEach(m => m.onclick = () => { const el = root.querySelector(`[data-champ="${CSS.escape(m.dataset.va)}"]`); if (el) el.focus(); });
    }
    const texte = () => AB.identite.inserer(rendre(etat.choix.modele, champs(etat.choix.modele), etat.valeurs, false), section());
    const manquants = () => { const l = champs(etat.choix.modele); return l.filter(c => !c.facultatif && !valeur(c, etat.valeurs, l)).map(c => c.libelle); };
    const nomApp = () => { const l = champs(etat.choix.modele); const n = l.find(c => /^nom/.test(c.cle)); return n ? valeur(n, etat.valeurs, l) : ''; };

    $('#npKit').onchange = () => { etat.choix = candidats.find(c => c.k.id === $('#npKit').value && c.courante) || candidats.find(c => c.k.id === $('#npKit').value); versions(); formulaire(); garder(); };
    $('#npVersion').onchange = () => { etat.choix = candidats.find(c => c.k.id === etat.choix.k.id && c.k.version === $('#npVersion').value); formulaire(); garder(); };
    // Le kit, avec le logo choisi dans identite/
    $('#npZip').onclick = async ev => {
      ev.preventDefault();
      const k = etat.choix.k, contenu = await AB.kits.contenuZip(k, `${k.id}/`, true);
      if (etat.identite.logo) Object.assign(contenu, await AB.identite.fichiers(etat.identite.logo, `${k.id}/identite/`));
      U.download(`${k.id}-v${k.version}${etat.identite.logo ? '-' + (slug(nomApp()) || 'app') : ''}.zip`, AB.zip(contenu));
    };
    $('#npCopier').onclick = async () => {
      const m = manquants();
      try { await navigator.clipboard.writeText(texte()); } catch (e) { U.download('prompt.md', texte(), 'text/markdown;charset=utf-8'); }
      if (m.length) U.toast('warning', 'Copié, mais incomplet', 'À renseigner : ' + m.join(', '), 6000);
      else U.toast('success', 'Prompt copié', 'Colle-le dans Claude et joins le kit ' + etat.choix.k.nom + '.');
    };
    $('#npMd').onclick = () => U.download(`prompt-${slug(nomApp()) || 'app'}.md`, texte(), 'text/markdown;charset=utf-8');
    $('#npProjet').onclick = async () => {
      const m = manquants();
      if (m.length) return U.toast('error', 'À renseigner d’abord', m.join(', '), 6000);
      const l = champs(etat.choix.modele);
      const consigne = l.find(c => /consigne|besoin/.test(c.cle));
      const app = {
        id: U.uuid(), origine: 'existante', creeAvec: 'claude', nom: nomApp(), icone: 'mdi-application-outline', statut: 'idee',
        description: consigne ? valeur(consigne, etat.valeurs, l).split('\n')[0].slice(0, 200) : '', stack: etat.choix.k.id === 'app-complete' ? 'HTML, CSS, JavaScript + Node.js + PostgreSQL' : '',
        chemin: '', liens: { repo: '', prod: '' }, env: [], notes: '', fonctionnalites: [], blocsBranches: [], versions: [], cree: U.now(),
        kitApp: etat.choix.k.id, prompt: { kit: etat.choix.k.id, version: etat.choix.k.version, valeurs: Object.assign({}, etat.valeurs), texte: texte(), date: U.now() },
        journal: [{ date: U.now(), texte: `Projet créé : prompt du kit ${etat.choix.k.nom} v${etat.choix.k.version}` }]
      };
      try { await AB.identite.enregistrerDansApp(app, etat.identite); } catch (e) { U.toast('warning', 'Logo non enregistré', e.message); }
      await AB.apps.enregistrer(app);
      await AB.fichiers.ajouter('app:' + app.id, 'prompt/PROMPT.md', new TextEncoder().encode(app.prompt.texte), []);
      await AB.db.setMeta('brouillonNouvelleApp', null);
      U.toast('success', 'Projet enregistré', `${app.nom} est dans Mes apps. Importe le ZIP livré par Claude dans « Code et versions ».`, 6000);
      AB.app.go('apps/' + app.id);
    };
    const choisirNom = nom => {
      const n = champs(etat.choix.modele).find(c => /^nom/.test(c.cle));
      if (!n) return;
      // Le code technique suit le nom tant qu'il n'a pas été changé à la main
      const code = champs(etat.choix.modele).find(c => /^code/.test(c.cle));
      if (code && etat.valeurs[code.cle] && etat.valeurs[code.cle] === slug(etat.valeurs[n.cle] || '')) {
        etat.valeurs[code.cle] = slug(nom);
        const ec = root.querySelector(`[data-champ="${CSS.escape(code.cle)}"]`);
        if (ec) ec.value = etat.valeurs[code.cle];
      }
      etat.valeurs[n.cle] = nom;
      const el = root.querySelector(`[data-champ="${CSS.escape(n.cle)}"]`);
      if (el) el.value = nom;
      apercu(); garder();
    };
    let panneau = null;
    versions();
    formulaire();
    panneau = AB.identite.panneau($('#npIdentite'), { identite: etat.identite, contexte, choisirNom, changer: () => { apercu(); garder(); } });
    // Depuis « Créer cette app » de la veille : Claude propose tout de suite des noms et des logos
    if (etat.identite.auto) { delete etat.identite.auto; garder(); panneau.demanderClaude(true); }
    return { destroy() { clearTimeout(minuteur); } };
  };
})();
