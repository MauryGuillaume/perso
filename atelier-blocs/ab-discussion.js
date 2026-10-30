/* ==========================================================================
   ab-discussion.js — discuter avec Claude
   - menu « Discussion » : questions sur l'Atelier et sur toutes ses apps ;
   - onglet « Discussion » de chaque app : Claude connaît sa fiche, son code
     (version courante), sa base de données et ses revenus. Pour parler de
     monétisation, de fonctionnement, d'évolutions…
   Plusieurs discussions par sujet, gardées dans ce navigateur (table meta,
   clé « discussions:<app | atelier> », comprise dans la sauvegarde).
   Avec le serveur local et sa clé, Claude répond au fil de l'eau ; sinon la
   question est préparée (contexte compris) à coller dans Claude, et sa réponse
   se recolle ici.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const D = AB.discussion = {};
  D.ONGLET = ['discussion', 'Discussion', 'mdi-chat-processing-outline'];

  const BUDGET_CODE = 150000;   // caractères de code envoyés au plus (≈ 40 000 jetons)
  const TEXTE = /\.(md|txt|json|js|mjs|cjs|ts|tsx|jsx|vue|svelte|html?|css|scss|sql|prisma|py|rb|php|go|java|kt|swift|dart|ya?ml|toml)$|(^|\/)\.env\.(example|sample)$/i;
  const EXCLUS = /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|coverage|vendor|\.git)\/|(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.min\.(js|css)|\.map)$|(^|\/)\.env$/i;

  /* ======================= Contexte ======================= */

  const ATELIER = `L'Atelier de Blocs est l'outil (HTML, dans le navigateur) avec lequel l'utilisateur crée et gère ses apps. Trois espaces :
- Créer : préparer un prompt et un pack ZIP (kits + blocs) à donner à Claude, qui écrit l'app complète ; puis importer le ZIP livré. On peut aussi composer une petite app avec des blocs, sans Claude.
- Mes apps : pour chaque app, vue d'ensemble, aperçu (ordinateur, tablette, téléphone ; le code source Vite/React est construit tout seul par le serveur local), code et versions, base de données, gestion (API d'administration), revenus et publicités, discussion avec Claude ; plus les apps mobiles (projet Capacitor pour l'App Store et Google Play, émulateur) et l'audit de sécurité.
- Kits : les règles communes (charte graphique, cybersécurité, affichage légal, socle PWA, app complète…) avec leurs documents, exportés en ZIP pour Claude.
Il y a aussi la Veille technologique (une idée d'app grand public par jour) et un serveur local facultatif (node serveur.js, http://localhost:8787) pour l'IA, les bases de données, la construction et l'aperçu fidèle.`;

  const resumeRevenus = app => {
    const lignes = app.revenus || [];
    if (!lignes.length) return 'Aucun revenu saisi.';
    const parSource = {};
    lignes.forEach(l => { parSource[l.source] = (parSource[l.source] || 0) + (Number(l.montant) || 0); });
    return `12 derniers mois : ${AB.revenus.fmt(AB.revenus.douzeMois(app))}. Total par source : ${Object.entries(parSource).map(([s, m]) => `${s} ${AB.revenus.fmt(m)}`).join(', ')}.`;
  };

  /** Fiche de l'app, sans l'historique ni les gros champs. */
  function fiche(app) {
    const c = U.clone(app);
    ['versions', 'audits', 'revenus', 'code', 'mobile', 'icone', 'cree', 'modifie', 'versionCourante', 'surcharges', 'conformite'].forEach(k => delete c[k]);
    if (c.identite) { delete c.identite.svg; if (c.identite.logo) delete c.identite.logo.svg; }
    (c.bases || []).forEach(b => { delete b.connexion; delete b.donnees; });
    let t = JSON.stringify(c, null, 1);
    if (t.length > 40000) t = t.slice(0, 40000) + '\n… (fiche coupée)';
    return t;
  }

  /** Code de la version courante : arborescence + fichiers texte les plus utiles, dans la limite du budget. */
  async function code(app) {
    const v = AB.code.courante(app);
    if (!v) return null;
    const blob = await AB.code.zip(app);
    if (!blob) return null;
    const s = await AB.mobile.sourceZip(blob, app.nom);
    const tous = s.tous || s.fichiers;
    const chemins = Object.keys(tous).filter(c => !/(^|\/)(node_modules|\.git)\//.test(c)).sort();
    const rang = c => /(^|\/)(README\.md|atelier-app\.json)$/i.test(c) ? 0 : /(^|\/)(package\.json|schema\.prisma|\.env\.example)$|\.sql$/i.test(c) ? 1 : /(^|\/)(src|app|server|api|noyau|lib|pages|routes|components|views|stores?)\//i.test(c) ? 2 : 3;
    const choisis = chemins.filter(c => TEXTE.test(c) && !EXCLUS.test(c) && tous[c].length < 200000)
      .sort((a, b) => rang(a) - rang(b) || tous[a].length - tous[b].length);
    let reste = BUDGET_CODE, n = 0;
    const blocs = [];
    for (const c of choisis) {
      let t = AB.mobile.texte(tous[c]);
      // Exemple de variables : les noms seulement (les valeurs d'exemple sont parfois de vrais mots de passe)
      if (/(^|\/)\.env\.\w+$/.test(c)) t = t.replace(/^(\s*[A-Za-z_][\w.]*\s*=).*$/gm, '$1…');
      if (t.length > reste) continue;
      reste -= t.length; n++;
      blocs.push(`----- ${c} -----\n${t}`);
    }
    const arbre = chemins.slice(0, 600).join('\n') + (chemins.length > 600 ? `\n… et ${chemins.length - 600} autres fichiers` : '');
    return { n, total: chemins.length, version: v.numero, texte: `Code de la version ${v.numero} (${chemins.length} fichiers, ${n} lus en entier, les autres sont seulement listés).\n\nArborescence :\n${arbre}\n\n${blocs.join('\n\n')}` };
  }

  /** Contexte envoyé à Claude, et ce qu'il contient (pour l'afficher). */
  D.contexte = async function (app) {
    if (!app) {
      const apps = await AB.apps.lister();
      const liste = apps.map(a => `- ${a.nom} (${(AB.apps.STATUTS[a.statut] || [a.statut])[0]}, ${a.origine === 'plateforme' ? 'composée avec des blocs' : a.stack || 'app importée'}) : ${(a.description || '').slice(0, 300)} — ${resumeRevenus(a)}`).join('\n');
      return { morceaux: ['L’Atelier', `${apps.length} app(s)`], texte: `${ATELIER}\n\nLes apps de l'utilisateur :\n${liste || '(aucune pour l’instant)'}` };
    }
    const morceaux = ['Fiche'];
    let texte = `App : ${app.nom}\n\nFiche de l'app (JSON) :\n${fiche(app)}\n\nRevenus : ${resumeRevenus(app)}`;
    if (app.origine === 'plateforme') morceaux.push(`${(app.blocs || []).length} bloc(s)`);
    if ((app.bases || []).length) morceaux.push(`Base (${app.bases.reduce((s, b) => s + (b.tables || []).length, 0)} tables)`);
    if ((app.revenus || []).length) morceaux.push('Revenus');
    try {
      const c = await code(app);
      if (c) { morceaux.push(`Code v${c.version} (${c.n}/${c.total} fichiers)`); texte += `\n\n${c.texte}`; }
    } catch (e) { console.warn('Code non lu', e); }
    return { morceaux, texte: `${ATELIER}\n\n${texte}` };
  };

  D.systeme = (app, contexte) => `Tu es Claude, l'assistant de l'Atelier de Blocs. Tu discutes en français avec son utilisateur, qui crée et publie des apps${app ? `, à propos de son app « ${app.nom} »` : ''}.
Tu l'aides à comprendre comment ${app ? 'l’app' : 'l’Atelier et ses apps'} fonctionne${app ? '' : 'nt'} (appuie-toi sur le contexte ci-dessous et cite les fichiers quand c'est utile), à choisir et chiffrer des moyens de monétisation (abonnement, achats intégrés, publicité, freemium, vente, dons… avec les règles de l'App Store et de Google Play, les commissions, le RGPD), et à décider des prochaines évolutions.
Sois concret et honnête : donne des chiffres d'ordre de grandeur quand tu peux, dis quand une information manque au contexte, et propose une prochaine étape. Réponds en Markdown simple (titres courts, listes, gras), sans longueurs inutiles.
${app ? `Si l'utilisateur veut un autre nom, un autre logo ou un autre univers graphique, propose-en plusieurs et termine ta réponse par un bloc de code \`\`\`identite contenant un JSON de la forme
${AB.identite.FORMAT}
(l'Atelier l'affiche en cartes que l'utilisateur adopte d'un clic). ${AB.identite.REGLES_LOGO()}
` : ''}
=== Contexte ===
${contexte}`;

  /* ======================= Rendu Markdown (simple) ======================= */

  D.markdown = function (src) {
    const blocs = [];
    let t = String(src || '').replace(/```(\w*)\n?([\s\S]*?)(```|$)/g, (m, l, c) => { blocs.push(`<pre class="dc-code"><code>${esc(c.replace(/\n$/, ''))}</code></pre>`); return `\u0000${blocs.length - 1}\u0000`; });
    const enLigne = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|[\s(])_([^_\s][^_]*)_/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const out = [];
    let liste = null, para = [];
    const finPara = () => { if (para.length) { out.push(`<p>${para.map(enLigne).join('<br>')}</p>`); para = []; } };
    const finListe = () => { if (liste) { out.push(`<${liste.type}>${liste.items.map(i => `<li>${enLigne(i)}</li>`).join('')}</${liste.type}>`); liste = null; } };
    for (const ligne of t.split('\n')) {
      const bloc = /^\u0000(\d+)\u0000$/.exec(ligne.trim());
      const titre = /^(#{1,6})\s+(.*)$/.exec(ligne);
      const puce = /^\s*[-*•]\s+(.*)$/.exec(ligne), num = /^\s*\d+[.)]\s+(.*)$/.exec(ligne);
      if (bloc) { finPara(); finListe(); out.push(blocs[bloc[1]]); }
      else if (titre) { finPara(); finListe(); out.push(`<h${Math.min(6, titre[1].length + 2)}>${enLigne(titre[2])}</h${Math.min(6, titre[1].length + 2)}>`); }
      else if (puce || num) {
        finPara();
        const type = puce ? 'ul' : 'ol';
        if (liste && liste.type !== type) finListe();
        if (!liste) liste = { type, items: [] };
        liste.items.push((puce || num)[1]);
      }
      else if (/^\s*(---|\*\*\*)\s*$/.test(ligne)) { finPara(); finListe(); out.push('<hr>'); }
      else if (/^\s*\|.*\|\s*$/.test(ligne)) { finPara(); finListe(); if (!/^\s*\|[\s:|-]+\|\s*$/.test(ligne)) out.push(`<div class="dc-ligne-tab">${ligne.trim().slice(1, -1).split('|').map(c => `<span>${enLigne(c.trim())}</span>`).join('')}</div>`); }
      else if (!ligne.trim()) { finPara(); finListe(); }
      else { finListe(); para.push(ligne); }
    }
    finPara(); finListe();
    return out.join('');
  };

  /* ======================= Stockage ======================= */

  const cle = app => 'discussions:' + (app ? app.id : 'atelier');
  const lire = async c => (await AB.db.getMeta(c, null)) || [];
  const ecrire = (c, liste) => AB.db.setMeta(c, liste);

  const SUGGESTIONS = {
    app: ['Comment cette app pourrait-elle gagner de l’argent ? Compare les options pour elle.', 'Propose-moi d’autres noms et logos pour cette app.', 'Explique-moi simplement comment l’app fonctionne, de l’écran au serveur.', 'Quel prix et quelle offre gratuite / payante me conseilles-tu ?', 'Quelles fonctionnalités ajouter en priorité, et pourquoi ?', 'Qu’est-ce qui peut bloquer la publication sur l’App Store et Google Play ?'],
    atelier: ['Comment fonctionne l’Atelier, du prompt à l’app publiée ?', 'Laquelle de mes apps a le plus de potentiel pour gagner de l’argent ?', 'Quels moyens de monétisation pour une app grand public ?', 'Comment passer d’une app web à une app sur les stores ?']
  };

  /* ======================= Vue ======================= */

  /** Adopter un nom ou un logo proposé dans l'onglet Discussion d'une app : il devient celui de l'app. */
  const identiteApp = app => ({
    nom: async n => { app.nom = n.nom; if (n.accroche) app.identite = Object.assign({}, app.identite, { accroche: n.accroche }); await AB.apps.enregistrer(app); U.toast('success', 'Nom adopté', `L’app s’appelle maintenant ${n.nom}.`); },
    logo: async l => {
      try { await AB.identite.enregistrerDansApp(app, { logo: l, accroche: (app.identite && app.identite.accroche) || '' }); await AB.apps.enregistrer(app); U.toast('success', 'Logo adopté', 'Les icônes sont dans les fichiers de l’app (identite/).'); }
      catch (e) { U.toast('error', 'Logo impossible', e.message); }
    },
    univers: async u => {
      try { await AB.identite.enregistrerUnivers(app, u, app.identite && app.identite.logo); U.toast('success', 'Univers adopté', 'univers.css et UNIVERS.md sont dans les fichiers de l’app (identite/).'); }
      catch (e) { U.toast('error', 'Univers impossible', e.message); }
    }
  });

  /**
   * Discussion d'une app (onglet) ou de l'Atelier (app = null). Renvoie { destroy }.
   * opts (facultatif) : un autre sujet, comme le nom et le logo d'une app en création :
   * { cle, contexte() → { morceaux, texte }, systeme(contexte), suggestions, vide: [titre, texte], placeholder,
   *   identite: { nom(prop), logo(prop), ajouter(propositions) } }.
   */
  D.vue = async function (corps, app, opts) {
    opts = opts || {};
    const cleSujet = opts.cle || cle(app);
    const adopter = opts.identite || (app ? identiteApp(app) : null);
    let liste = await lire(cleSujet), courante = liste[0] || null, envoi = null, ctx = null;
    const etat = await AB.ia.etat();
    const direct = etat.joignable && etat.ia && etat.discussion;

    corps.innerHTML = `<div class="dc-grille">
      <div class="panel dc-liste"><div class="panel-body" style="padding:10px">
        <button class="btn btn-primary btn-sm" id="dcNouvelle" style="width:100%;justify-content:center"><span class="mdi mdi-plus"></span>Nouvelle discussion</button>
        <div id="dcFils" class="stack" style="gap:2px;margin-top:10px"></div></div></div>
      <div class="panel dc-zone">
        <div class="panel-head"><span class="panel-label"><span class="mdi mdi-chat-processing-outline"></span><span id="dcTitre">Discussion</span></span><div class="spacer"></div>
          <button class="btn btn-ghost btn-xs" id="dcContexte" title="Ce que Claude reçoit avec chaque question"><span class="mdi mdi-information-outline"></span>Contexte</button>
          <button class="btn btn-ghost btn-xs" id="dcSuppr" title="Supprimer cette discussion"><span class="mdi mdi-delete-outline"></span></button></div>
        <div class="dc-messages" id="dcMessages"></div>
        <div class="dc-saisie">
          <div class="small muted" id="dcEtat" style="margin-bottom:6px"></div>
          <div class="row" style="gap:8px;align-items:flex-end">
            <textarea class="tv-textarea" id="dcTexte" rows="2" placeholder="${opts.placeholder ? esc(opts.placeholder) : app ? `Pose une question sur ${esc(app.nom)} : monétisation, fonctionnement, évolutions…` : 'Pose une question sur l’Atelier ou tes apps…'}" style="flex:1;min-height:46px;max-height:200px;resize:vertical"></textarea>
            <button class="btn btn-primary" id="dcEnvoyer"><span class="mdi ${direct ? 'mdi-send' : 'mdi-content-copy'}"></span>${direct ? 'Envoyer' : 'Préparer pour Claude'}</button>
          </div></div></div></div>`;
    const q = s => corps.querySelector(s);

    q('#dcEtat').innerHTML = direct ? `Claude répond directement (serveur local${etat.modele ? ', ' + esc(etat.modele) : ''}). Entrée pour envoyer, Maj+Entrée pour aller à la ligne.`
      : !etat.joignable ? 'Serveur local arrêté : ta question est préparée avec son contexte pour être collée dans Claude, puis tu recolles la réponse ici. Pour des réponses directes : lancer-atelier avec une clé ANTHROPIC_API_KEY.'
      : !etat.ia ? 'Le serveur local n’a pas de clé ANTHROPIC_API_KEY : ta question est préparée pour être collée dans Claude. Ajoute la clé dans .env à côté de serveur.js pour des réponses directes.'
      : 'Le serveur local date d’une version précédente : relance lancer-atelier pour des réponses directes. En attendant, la question est préparée pour Claude.';

    const contexte = async () => opts.contexte ? opts.contexte() : ctx || (ctx = await D.contexte(app));
    const systeme = texte => opts.systeme ? opts.systeme(texte) : D.systeme(app, texte);

    /** Réponse de Claude : Markdown, et les blocs ```identite en cartes à adopter. */
    function rendre(texte, n) {
      const x = AB.identite.extraire(texte);
      let h = D.markdown(x.texte).replace(/(<p>)?\u0001(\d+)\u0001(<\/p>)?/g, (m, a, k) => AB.identite.htmlPropositions(x.propositions[k], n + ':' + k));
      if (x.enCours) h += '<div class="small muted"><span class="mdi mdi-loading mdi-spin"></span> Propositions de noms et de logos en cours…</div>';
      return h;
    }
    /** Les nouvelles propositions d'une réponse rejoignent aussi la liste du panneau « Nom et logo ». */
    const recues = texte => { if (opts.identite && opts.identite.ajouter) AB.identite.extraire(texte).propositions.forEach(p => opts.identite.ajouter(p)); };
    function brancherCartes(el) {
      el.querySelectorAll('[data-idn], [data-idl], [data-idu]').forEach(b => b.onclick = () => {
        const [n, k, i] = (b.dataset.idn || b.dataset.idl || b.dataset.idu).split(':').map(Number);
        if (Number.isNaN(n) || !courante.messages[n]) return U.toast('info', 'Un instant', 'Attends la fin de la réponse de Claude.');
        const p = AB.identite.extraire(courante.messages[n].content).propositions[k];
        if (!adopter) return U.toast('info', 'À adopter depuis une app', 'Ouvre l’onglet Discussion de l’app, ou « Nom et logo » à la création.');
        if (b.dataset.idn) adopter.nom(p.noms[i]); else if (b.dataset.idu) { if (adopter.univers) adopter.univers(p.univers[i]); } else adopter.logo(p.logos[i]);
        b.classList.add('actif');
      });
    }

    function dessinerFils() {
      q('#dcFils').innerHTML = liste.map(d => `<button class="dc-fil ${courante && d.id === courante.id ? 'actif' : ''}" data-fil="${esc(d.id)}"><span class="dc-fil-titre">${esc(d.titre)}</span><span class="small muted">${esc(U.fmtDate(d.modifie))}</span></button>`).join('')
        || '<div class="small muted" style="padding:6px">Aucune discussion pour l’instant.</div>';
      corps.querySelectorAll('[data-fil]').forEach(b => b.onclick = () => { if (envoi) return; courante = liste.find(d => d.id === b.dataset.fil); dessiner(); });
    }

    function dessinerMessages(enCours) {
      const el = q('#dcMessages');
      const msgs = courante ? courante.messages : [];
      if (!msgs.length && !enCours) {
        el.innerHTML = `<div class="dc-vide"><span class="mdi mdi-chat-question-outline"></span><div style="font-weight:600;margin:6px 0 4px">${opts.vide ? esc(opts.vide[0]) : app ? `Discuter de ${esc(app.nom)}` : 'Discuter avec Claude'}</div>
          <div class="small muted" style="margin-bottom:12px">${opts.vide ? esc(opts.vide[1]) : app ? 'Claude connaît la fiche de l’app, son code, sa base de données et ses revenus.' : 'Claude connaît l’Atelier et la liste de tes apps. Pour une app précise, ouvre son onglet Discussion.'}</div>
          <div class="dc-suggestions">${(opts.suggestions || SUGGESTIONS[app ? 'app' : 'atelier']).map(s => `<button class="btn btn-outline btn-sm" data-sugg="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
        el.querySelectorAll('[data-sugg]').forEach(b => b.onclick = () => { q('#dcTexte').value = b.dataset.sugg; envoyer(); });
        return;
      }
      el.innerHTML = msgs.map((m, n) => `<div class="dc-msg ${m.role === 'user' ? 'dc-moi' : 'dc-claude'}">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : rendre(m.content, n)}</div>`).join('')
        + (enCours !== undefined ? `<div class="dc-msg dc-claude" id="dcFlux">${enCours ? rendre(enCours, 'flux') : '<span class="mdi mdi-loading mdi-spin"></span> Claude réfléchit…'}</div>` : '');
      brancherCartes(el);
      el.scrollTop = el.scrollHeight;
    }

    function dessiner() {
      q('#dcTitre').textContent = courante ? courante.titre : 'Nouvelle discussion';
      q('#dcSuppr').hidden = !courante;
      dessinerFils(); dessinerMessages();
    }

    async function enregistrer() {
      courante.modifie = U.now();
      liste = [courante].concat(liste.filter(d => d.id !== courante.id));
      await ecrire(cleSujet, liste);
      dessinerFils();
    }

    /** Texte complet à coller dans Claude (sans serveur). */
    const promptManuel = async () => {
      const c = await contexte();
      return `${systeme(c.texte)}\n\n=== Discussion ===\n${courante.messages.map(m => `${m.role === 'user' ? 'Moi' : 'Claude'} : ${m.content}`).join('\n\n')}\n\nRéponds à ma dernière question.`;
    };

    async function envoyer() {
      const texte = q('#dcTexte').value.trim();
      if (!texte || envoi) return;
      if (!courante) { courante = { id: U.uuid().slice(0, 12), titre: texte.length > 60 ? texte.slice(0, 57) + '…' : texte, cree: U.now(), messages: [] }; }
      courante.messages.push({ role: 'user', content: texte, date: U.now() });
      q('#dcTexte').value = '';
      await enregistrer();
      q('#dcTitre').textContent = courante.titre; q('#dcSuppr').hidden = false;
      if (!direct) return manuel();
      const bouton = q('#dcEnvoyer');
      bouton.disabled = true;
      dessinerMessages('');
      const ctrl = new AbortController();
      envoi = ctrl;
      let recu = '';
      try {
        const c = await contexte();
        const r = await fetch((await AB.ia.adresse()) + '/api/discussion', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systeme: systeme(c.texte), messages: courante.messages.map(m => ({ role: m.role, content: m.content })) }) });
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.erreur || 'Serveur local : erreur ' + r.status); }
        const lecteur = r.body.getReader(), dec = new TextDecoder();
        let dernier = 0;
        for (;;) {
          const { done, value } = await lecteur.read();
          if (done) break;
          recu += dec.decode(value, { stream: true });
          if (Date.now() - dernier > 80 && corps.isConnected) {
            dernier = Date.now();
            const flux = q('#dcFlux'), el = q('#dcMessages');
            if (flux) { const enBas = el.scrollHeight - el.scrollTop - el.clientHeight < 60; flux.innerHTML = rendre(recu, 'flux'); if (enBas) el.scrollTop = el.scrollHeight; }
          }
        }
        courante.messages.push({ role: 'assistant', content: recu || '_(Réponse vide.)_', date: U.now() });
        recues(recu);
      } catch (e) {
        if (recu) courante.messages.push({ role: 'assistant', content: recu + '\n\n_(Réponse interrompue.)_', date: U.now() });
        if (e.name !== 'AbortError') U.toast('error', 'Pas de réponse de Claude', e.message);
      } finally {
        envoi = null;
        await enregistrer();
        if (corps.isConnected) { bouton.disabled = false; dessinerMessages(); }
      }
    }

    /** Sans serveur : la question est copiée avec son contexte ; la réponse de Claude se colle ici. */
    async function manuel() {
      dessinerMessages();
      const prompt = await promptManuel();
      let copie = false;
      try { await navigator.clipboard.writeText(prompt); copie = true; } catch (e) { /* copie à la main */ }
      U.dialog({
        title: 'Demander à Claude', size: 'lg',
        body: `<p style="margin-top:0">${copie ? '<b>La question est copiée</b> avec le contexte de l’app.' : 'Copie le texte ci-dessous (question et contexte).'} Colle-la dans une conversation avec Claude (claude.ai), puis colle sa réponse en bas.</p>
          <textarea class="tv-textarea code" readonly style="min-height:110px;font-size:11px" id="dcPrompt">${esc(prompt)}</textarea>
          <div class="row" style="gap:8px;margin:8px 0 14px"><button class="btn btn-outline btn-sm" id="dcCopier"><span class="mdi mdi-content-copy"></span>Copier</button>
            <a class="btn btn-outline btn-sm" href="https://claude.ai/new" target="_blank" rel="noopener"><span class="mdi mdi-open-in-new"></span>Ouvrir Claude</a></div>
          <label class="input-label">Réponse de Claude</label><textarea class="tv-textarea" id="dcReponse" style="min-height:160px" placeholder="Colle ici la réponse de Claude"></textarea>`,
        actions: [{ label: 'Plus tard', cls: 'btn-outline' }, { label: 'Ajouter la réponse', cls: 'btn-primary', onClick: async ({ body }) => {
          const rep = body.querySelector('#dcReponse').value.trim();
          if (!rep) { U.toast('warning', 'Réponse vide', 'Colle la réponse de Claude, ou choisis « Plus tard ».'); return false; }
          courante.messages.push({ role: 'assistant', content: rep, date: U.now() });
          recues(rep);
          await enregistrer(); if (corps.isConnected) dessinerMessages();
        } }]
      });
      const b = document.querySelector('#dcCopier');
      if (b) b.onclick = async () => { const t = document.querySelector('#dcPrompt'); t.select(); try { await navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } U.toast('success', 'Copié', 'Colle-le dans Claude.'); };
    }

    q('#dcEnvoyer').onclick = envoyer;
    q('#dcTexte').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); envoyer(); } });
    q('#dcNouvelle').onclick = () => { if (envoi) return; courante = null; dessiner(); q('#dcTexte').focus(); };
    q('#dcSuppr').onclick = async () => {
      if (!courante || envoi || !(await U.confirm('Supprimer la discussion', `« ${courante.titre} » sera effacée.`, { danger: true, okLabel: 'Supprimer' }))) return;
      liste = liste.filter(d => d.id !== courante.id); courante = liste[0] || null;
      await ecrire(cleSujet, liste); dessiner();
    };
    q('#dcContexte').onclick = async () => {
      const c = await contexte();
      U.dialog({ title: 'Ce que Claude reçoit', size: 'lg', body: `<p style="margin-top:0">Avec chaque question, Claude reçoit : ${c.morceaux.map(m => `<span class="chip chip-accent">${esc(m)}</span>`).join(' ')} (${Math.round(c.texte.length / 1000)} k caractères). Les secrets (.env) ne sont jamais envoyés.</p><textarea class="tv-textarea code" readonly style="min-height:320px;font-size:11px">${esc(c.texte)}</textarea>` });
    };
    dessiner();
    return { destroy: () => { if (envoi) envoi.abort(); } };
  };

  /* Page « Discussion » du menu : l'Atelier et toutes les apps */
  AB.vues = AB.vues || {};
  AB.vues.discussion = async function (root) {
    AB.app.setCrumbs(['Discussion']);
    root.innerHTML = `<div class="page"><div class="page-head"><div><div class="section-tag">Claude</div><h2 class="section-title">Discussion</h2>
      <p class="section-desc">Pose tes questions sur l’Atelier, tes apps, leur monétisation. Pour une app précise, son onglet « Discussion » donne à Claude son code et sa base.</p></div></div><div id="dcRacine"></div></div>`;
    return D.vue(root.querySelector('#dcRacine'), null);
  };
})();
