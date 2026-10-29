/* ==========================================================================
   ab-construire.js — le code source d'une app (Vite, Vue, React…) est construit
   tout seul pour l'aperçu et l'app mobile.
   Le navigateur ne sait pas lancer npm : le serveur local (serveur.js) installe
   les dépendances puis lance « npm run build », et renvoie le dossier construit
   (dist/). Sans serveur local, un message dit quoi faire.
   App avec son propre serveur Node (kit « App complète »…) : le serveur local
   l'installe, lui donne une base PostgreSQL de test, la lance, et l'aperçu
   relaie /api vers elle (serveur-lancer.js).
   ========================================================================== */
(function () {
  const M = AB.mobile;
  const C = AB.construire = {};
  const FAITES = new WeakMap();   // source → source construite (ou promesse en cours), pour la session

  const OUTILS = ['vite', 'react-scripts', '@vue/cli-service', 'parcel', '@angular/cli', 'astro', '@sveltejs/kit', 'webpack', '@rsbuild/core'];

  /** Projet à construire : { dossier, outil, commande }, ou null si la source est déjà construite (ou pas un projet npm). */
  C.projet = function (source) {
    if (!source || !['zip', 'dossier'].includes(source.type)) return null;
    const tous = source.tous || source.fichiers;
    const racine = source.racine || '';
    const dossiers = Object.keys(tous).filter(c => /(^|\/)package\.json$/.test(c)).map(c => c.slice(0, -'package.json'.length));
    if (!dossiers.length) return null;
    // Le package.json le plus proche au-dessus du dossier de l'index.html ; sans index.html, le moins profond
    const index = source.fichiers['index.html'] ? M.texte(source.fichiers['index.html']) : '';
    const dossier = index
      ? dossiers.filter(d => racine.startsWith(d)).sort((a, b) => b.length - a.length)[0]
      : dossiers.sort((a, b) => a.split('/').length - b.split('/').length)[0];
    if (dossier === undefined) return null;
    let pkg;
    try { pkg = JSON.parse(M.texte(tous[dossier + 'package.json'])); } catch (e) { return null; }
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    if (deps.next) return null;   // Next.js : code serveur, voir le diagnostic (mode « site en ligne »)
    const scripts = pkg.scripts || {};
    if (!scripts.build && !deps.vite) return null;
    // Code source : index.html qui charge src/…, modèle Create React App, ou index.html rangé dans public/ ou src/
    const brut = !index || /<script[^>]+src=["'][^"']*\bsrc\/[^"']+\.(m?[jt]sx?|vue|svelte)["']/i.test(index) || /%PUBLIC_URL%/.test(index)
      || (racine !== dossier && /(^|\/)(public|src)\/$/.test(racine.slice(dossier.length)));
    if (!brut) return null;
    const outil = OUTILS.find(d => deps[d]) || '';
    const gest = tous[dossier + 'pnpm-lock.yaml'] ? 'pnpm' : tous[dossier + 'yarn.lock'] ? 'yarn' : 'npm';
    return { dossier, outil, gest, commande: `${gest} install puis ${scripts.build ? gest + ' run build' : 'vite build'}` };
  };

  /** App avec son propre serveur Node (kit « App complète », Express…) : l'interface est dans un sous-dossier
      (public/…) d'un projet qui se lance (script start ou serveur.js). { dossier, commande, base } ou null. */
  C.serveurApp = function (source) {
    if (!source || !['zip', 'dossier'].includes(source.type) || !source.racine || C.projet(source)) return null;
    const tous = source.tous || source.fichiers;
    const dossier = Object.keys(tous).filter(c => /(^|\/)package\.json$/.test(c)).map(c => c.slice(0, -'package.json'.length))
      .filter(d => source.racine.startsWith(d) && source.racine !== d).sort((a, b) => b.length - a.length)[0];
    if (dossier === undefined) return null;
    let pkg;
    try { pkg = JSON.parse(M.texte(tous[dossier + 'package.json'])); } catch (e) { return null; }
    const entree = ['serveur.js', 'server.js', 'index.js', 'app.js', pkg.main].find(f => f && tous[dossier + f]);
    if (!(pkg.scripts && pkg.scripts.start) && !entree) return null;
    const deps = Object.assign({}, pkg.dependencies);
    const exemple = tous[dossier + '.env.example'] ? M.texte(tous[dossier + '.env.example']) : '';
    const base = ['pg', 'postgres', '@prisma/client', 'knex', 'sequelize', 'typeorm', 'pg-promise', 'drizzle-orm'].some(d => deps[d]) || /^\s*DATABASE_URL\s*=/m.test(exemple);
    return { dossier, base, commande: pkg.scripts && pkg.scripts.start ? 'npm start' : 'node ' + entree };
  };

  const LANCEES = new WeakMap();   // source → port de l'app lancée (ou promesse en cours)
  /** Port de l'app déjà lancée pendant cette session (ou null). */
  C.portLance = function (source) {
    const p = source && LANCEES.get(source);
    return typeof p === 'number' ? p : null;
  };

  /** Lance le serveur de l'app avec le serveur local (npm install, base de test, npm start). Renvoie son port. */
  C.lancer = function (cle, source, suivi, actif) {
    const deja = LANCEES.get(source);
    if (deja) return deja.then ? deja : Promise.resolve(deja);
    const app = C.serveurApp(source);
    const p = (async () => {
      await verifierServeur(true);
      const tous = source.tous || source.fichiers, fichiers = {};
      for (const c of Object.keys(tous)) if (c.startsWith(app.dossier)) fichiers[c.slice(app.dossier.length)] = enBase64(M.octets(tous[c]));
      suivi && suivi({ etape: 'Envoi de l’app au serveur local', lignes: [] });
      const r = await fetch('/api/lancer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify({ cle, fichiers }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erreur('Lancement impossible', j.erreur || 'Serveur local : erreur ' + r.status);
      let depuis = 0, etat;
      for (;;) {
        await new Promise(ok => setTimeout(ok, 700));
        if (actif && !actif()) throw erreur('Lancement suivi ailleurs', 'Page quittée : le lancement continue sur le serveur local.', { code: 'quitte' });
        const e = await fetch(`/api/lancer/${j.id}?depuis=${depuis}`);
        etat = await e.json().catch(() => ({}));
        if (!e.ok) throw erreur('Lancement impossible', etat.erreur || 'Serveur local : erreur ' + e.status);
        depuis = etat.suite;
        suivi && suivi(etat);
        if (etat.etat !== 'en-cours') break;
      }
      if (etat.etat !== 'pret') throw erreur('L’app n’a pas pu démarrer', `${etat.erreur || 'Arrêtée.'} Les dernières lignes du journal disent pourquoi (variable manquante, erreur dans le code…).`);
      return etat.port;
    })();
    LANCEES.set(source, p);
    p.then(port => LANCEES.set(source, port), () => LANCEES.delete(source));
    return p;
  };
  /** Oublie le lancement (l'app sera relancée au prochain aperçu). */
  C.oublierLancement = source => source && LANCEES.delete(source);

  /** Source déjà construite pendant cette session (ou null). */
  C.deja = function (source) {
    const f = source && FAITES.get(source);
    return f && !f.then ? f : null;
  };

  /** Erreur avec un titre pour l'écran de l'aperçu. */
  const erreur = (titre, texte, extra) => Object.assign(new Error(texte), { titre }, extra || {});

  const enBase64 = o => {
    let bin = '';
    for (let i = 0; i < o.length; i += 32768) bin += String.fromCharCode.apply(null, o.subarray(i, i + 32768));
    return btoa(bin);
  };
  const deBase64 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));

  /** Le serveur local peut-il construire ? Sinon, une erreur qui dit quoi faire. */
  async function verifierServeur(lancement) {
    const etat = await AB.ia.etat();
    if (!etat.joignable) throw erreur('Serveur local à lancer', lancement
      ? 'Cette app a son propre serveur (API, base de données) : pour la faire tourner, l’Atelier a besoin de son serveur local. Double-clic sur lancer-atelier (.command sur Mac, .bat sur Windows), puis ouvre l’Atelier sur http://localhost:8787 et reviens ici.'
      : 'C’est le code source de l’app : pour l’installer et la construire toute seule, l’Atelier a besoin de son serveur local. Double-clic sur lancer-atelier (.command sur Mac, .bat sur Windows), puis ouvre l’Atelier sur http://localhost:8787 et reviens ici. Sinon, lance npm install puis npm run build dans le projet et choisis le dossier dist/.',
      { code: 'serveur' });
    if (!etat.construire || (lancement && !etat.lancer)) throw erreur('Serveur local à relancer', 'Le serveur local tourne mais il date d’une version précédente de l’Atelier : ferme-le, puis relance lancer-atelier.', { code: 'ancien' });
    if (await AB.ia.adresse() !== '') throw erreur('Ouvre l’Atelier sur http://localhost:8787',
      'Le serveur local tourne, mais l’Atelier est ouvert en fichier. Par sécurité, la construction ou le lancement d’une app (qui exécutent npm sur ta machine) ne part que de l’Atelier ouvert à l’adresse http://localhost:8787. Tes données y sont à part : exporte la sauvegarde ici (Réglages) et restaure-la là-bas la première fois.',
      { code: 'origine' });
  }

  /** Construit la source avec le serveur local. suivi({ etape, lignes, secondes }) ; actif() faux = on arrête de suivre. */
  C.construire = function (cle, source, suivi, actif) {
    const deja = FAITES.get(source);
    if (deja) return deja.then ? deja : Promise.resolve(deja);
    const projet = C.projet(source);
    if (!projet) return Promise.resolve(source);
    const p = (async () => {
      await verifierServeur();
      const tous = source.tous || source.fichiers;
      const fichiers = {};
      for (const c of Object.keys(tous)) {
        if (!c.startsWith(projet.dossier)) continue;
        const rel = c.slice(projet.dossier.length);
        if (/^(dist|build|out|\.next|\.nuxt|\.output|coverage)\//.test(rel)) continue;   // anciens résultats, inutiles
        fichiers[rel] = enBase64(M.octets(tous[c]));
      }
      suivi && suivi({ etape: 'Envoi du projet au serveur local', lignes: [] });
      const r = await fetch('/api/construire', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify({ cle, dossier: '', fichiers }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw erreur('Construction impossible', j.erreur || 'Serveur local : erreur ' + r.status);
      let depuis = 0, etat;
      for (;;) {
        await new Promise(ok => setTimeout(ok, 800));
        if (actif && !actif()) throw erreur('Construction suivie ailleurs', 'Page quittée : la construction continue sur le serveur local.', { code: 'quitte' });
        const e = await fetch(`/api/construire/${j.id}?depuis=${depuis}`);
        etat = await e.json().catch(() => ({}));
        if (!e.ok) throw erreur('Construction impossible', etat.erreur || 'Serveur local : erreur ' + e.status);
        depuis = etat.suite;
        suivi && suivi(etat);
        if (etat.etat !== 'en-cours') break;
      }
      if (etat.etat !== 'ok') throw erreur('La construction a échoué', `${etat.erreur} Regarde les dernières lignes du journal : souvent une dépendance manquante ou une erreur dans le code.`);
      const f = await fetch(`/api/construire/${j.id}/fichiers`);
      const jf = await f.json().catch(() => ({}));
      if (!f.ok) throw erreur('Construction impossible', jf.erreur || 'Serveur local : erreur ' + f.status);
      const construits = {};
      Object.keys(jf.fichiers).forEach(c => { construits[c] = deBase64(jf.fichiers[c]); });
      const s = M.decrire({ type: 'construit', nom: source.nom, fichiers: construits, racine: '' });
      s.resume = `${source.resume.replace(/ : .*$/, '')} : construite automatiquement (${projet.commande}), ${Object.keys(construits).length} fichier(s), ${(s.taille / 1048576).toFixed(1)} Mo`;
      s.origine = source;
      return s;
    })();
    FAITES.set(source, p);
    p.then(s => FAITES.set(source, s), () => FAITES.delete(source));
    return p;
  };
})();
