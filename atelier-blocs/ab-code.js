/* ==========================================================================
   ab-code.js — le CODE d'une app : le ZIP livré par Claude, importé dans l'Atelier
   Parcours : prompt + pack de kits → Claude → ZIP de l'app → « Importer le ZIP ».
   - Un import crée l'app (fiche « existante ») ou ajoute une version à une app.
   - Chaque version garde le ZIP entier (table « fichiers », propriétaire app:<id>)
     et son résumé dans app.code.versions ; la version courante sert à l'app
     mobile, à l'audit et au pack d'une évolution.
   - L'analyse lit atelier-app.json (demandé à Claude par le prompt) et, à défaut,
     devine : nom, description, technologies, variables (.env.example), schéma de
     base (*.sql, schema.prisma), dossier web (index.html).
   ========================================================================== */
(function () {
  const U = AB.u;
  const C = AB.code = {};
  const F = AB.fichiers;

  C.MANIFESTE = 'atelier-app.json';
  C.proprio = app => `app:${app.id}`;
  C.versions = app => ((app.code && app.code.versions) || []).slice().sort((a, b) => b.numero - a.numero);
  C.courante = app => C.versions(app).find(v => v.numero === (app.code && app.code.courante)) || C.versions(app)[0] || null;

  /** Le ZIP d'une version (la courante par défaut). */
  C.zip = async function (app, numero) {
    const v = numero ? C.versions(app).find(x => x.numero === numero) : C.courante(app);
    if (!v) return null;
    const f = (await F.lister(C.proprio(app))).find(x => x.chemin === v.chemin);
    return f ? f.blob : null;
  };

  /* ---------- Analyse du contenu ---------- */
  const IGNORE = /(^|\/)(node_modules|\.git|dist-ssr|\.next|\.nuxt|vendor|coverage)\//;

  /** fichiers : { chemin: Uint8Array }. Renvoie ce qu'on sait de l'app. */
  C.analyser = function (fichiers, nomZip) {
    const chemins = Object.keys(fichiers).filter(c => !IGNORE.test(c));
    const lire = c => fichiers[c] ? F.decoder(fichiers[c]) : '';
    const a = { nom: '', description: '', stack: '', icone: 'mdi-cellphone', env: [], schemas: [], web: '', fonctionnalites: [], notes: '', manifeste: null, nbFichiers: chemins.length, alertes: [] };

    // 1) atelier-app.json (à la racine ou dans un sous-dossier)
    const cm = chemins.find(c => c === C.MANIFESTE) || chemins.find(c => c.endsWith('/' + C.MANIFESTE));
    if (cm) {
      try {
        const m = a.manifeste = JSON.parse(lire(cm));
        Object.assign(a, {
          nom: String(m.nom || m.name || ''), description: String(m.description || ''), stack: String(m.stack || m.technologies || ''),
          icone: /^mdi-[\w-]+$/.test(m.icone || '') ? m.icone : a.icone, notes: String(m.notes || ''),
          web: String(m.web || '').replace(/^\.?\/+|\/+$/g, ''),
          fonctionnalites: Array.isArray(m.fonctionnalites) ? m.fonctionnalites.map(f => Array.isArray(f) ? [String(f[0]), String(f[1] || '')] : [String(f.nom || f), String(f.bloc || '')]) : []
        });
        if (Array.isArray(m.env)) a.env = m.env.map(v => typeof v === 'string' ? { cle: v, role: '', secret: /SECRET|KEY|TOKEN|PASSWORD|MOT_DE_PASSE|DATABASE_URL|SERVICE_ROLE/i.test(v) } : { cle: String(v.cle || v.nom || ''), role: String(v.role || ''), secret: !!v.secret }).filter(v => v.cle);
        // schema : un fichier, une liste de fichiers (migrations dans l'ordre) ou un dossier
        const liste = (Array.isArray(m.schema) ? m.schema : m.schema ? [m.schema] : []).map(c => String(c).replace(/^\.?\/+/, ''));
        const vus = liste.flatMap(c => fichiers[c] ? [c] : chemins.filter(x => x.startsWith(c.replace(/\/?$/, '/')) && /\.(sql|prisma)$/i.test(x)).sort());
        if (vus.length) a.schemas.push({ chemin: vus.length > 1 ? vus[0].replace(/[^/]+$/, '') + '*' : vus[0], texte: vus.map(lire).join('\n\n;\n\n') });
      } catch (e) { a.alertes.push(`${cm} illisible : ${e.message}`); }
    }

    // 2) package.json, README, index.html
    const pkgChemin = chemins.filter(c => /(^|\/)package\.json$/.test(c)).sort((x, y) => x.split('/').length - y.split('/').length)[0];
    let pkg = null;
    if (pkgChemin) { try { pkg = JSON.parse(lire(pkgChemin)); } catch (e) { /* package.json invalide : ignoré */ } }
    const readme = chemins.find(c => /^readme\.md$/i.test(c)) || chemins.find(c => /(^|\/)readme\.md$/i.test(c));
    const texteReadme = readme ? lire(readme) : '';
    const indexes = chemins.filter(c => /(^|\/)index\.html?$/i.test(c)).sort((x, y) => x.split('/').length - y.split('/').length);
    if (!a.web && indexes.length) a.web = indexes[0].replace(/\/?index\.html?$/i, '');
    const titreHtml = indexes.length ? ((/<title>([^<]{1,80})<\/title>/i.exec(lire(indexes[0])) || [])[1] || '').trim() : '';
    const titreReadme = ((/^#\s+(.+)$/m.exec(texteReadme) || [])[1] || '').replace(/[*_`]/g, '').trim();
    if (!a.nom) a.nom = titreReadme || titreHtml || (pkg && pkg.name && String(pkg.name).replace(/[-_]+/g, ' ')) || String(nomZip || 'App').replace(/\.zip$/i, '').replace(/[-_]+/g, ' ');
    if (!a.description) a.description = (pkg && pkg.description) || texteReadme.replace(/^#.*$/gm, '').split(/\n\s*\n/).map(x => x.trim()).find(x => x && !/^[>|`!\-*[<]/.test(x)) || '';
    a.description = a.description.replace(/[*`_]{1,2}([^*`_]+)[*`_]{1,2}/g, '$1').replace(/\s+/g, ' ').trim().slice(0, 500);

    if (!a.stack) {
      const dep = pkg ? Object.assign({}, pkg.dependencies, pkg.devDependencies) : {};
      const t = [];
      [['next', 'Next.js'], ['nuxt', 'Nuxt'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'], ['vite', 'Vite'], ['express', 'Express'], ['fastify', 'Fastify'],
        ['@prisma/client', 'Prisma'], ['@supabase/supabase-js', 'Supabase'], ['pg', 'PostgreSQL'], ['@capacitor/core', 'Capacitor'], ['stripe', 'Stripe'], ['tailwindcss', 'Tailwind']]
        .forEach(([d, n]) => { if (dep[d]) t.push(n); });
      if (chemins.some(c => /(^|\/)composer\.json$/.test(c))) t.push('PHP');
      if (chemins.some(c => /(^|\/)supabase\//.test(c)) && !t.includes('Supabase')) t.push('Supabase');
      if (!t.length && indexes.length) t.push('HTML, CSS, JavaScript');
      a.stack = t.join(', ');
    }

    // 3) Variables d'environnement (.env.example), jamais de valeur
    if (!a.env.length) {
      const envEx = chemins.filter(c => /(^|\/)\.env\.(example|exemple|sample|template)$/i.test(c));
      const vus = new Set();
      envEx.forEach(c => lire(c).split(/\r?\n/).forEach(l => {
        const m = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/.exec(l);
        if (m && !vus.has(m[1])) { vus.add(m[1]); a.env.push({ cle: m[1], role: '', secret: /SECRET|KEY|TOKEN|PASSWORD|PASS|DATABASE_URL|SERVICE_ROLE|PRIVATE/i.test(m[1]) && !/PUBLIC|ANON/i.test(m[1]) }); }
      }));
    }
    if (chemins.some(c => /(^|\/)\.env$/.test(c))) a.alertes.push('Le ZIP contient un fichier .env : il peut contenir des mots de passe. Ne le partage pas et retire-le du ZIP.');

    // 4) Schéma de base : schema.prisma, sinon les migrations / fichiers SQL (dans l'ordre)
    if (!a.schemas.length) {
      const prisma = chemins.filter(c => /(^|\/)schema\.prisma$/.test(c));
      const sql = chemins.filter(c => /\.sql$/i.test(c) && !/(^|\/)(seed|seeds|test|tests|fixtures)(\/|[._-])/i.test(c)).sort();
      if (prisma.length) a.schemas.push({ chemin: prisma[0], texte: lire(prisma[0]) });
      else if (sql.length) {
        // Les dossiers qui créent des tables, avec toutes leurs migrations (alter table…) dans l'ordre des noms
        const dossier = c => c.replace(/[^/]+$/, '');
        const dossiers = new Set(sql.filter(c => /create\s+table/i.test(lire(c))).map(dossier));
        const retenus = sql.filter(c => dossiers.has(dossier(c)));
        if (retenus.length) a.schemas.push({ chemin: retenus.length > 1 ? dossier(retenus[0]) + '*.sql' : retenus[0], texte: retenus.map(lire).join('\n\n;\n\n') });
      }
    }
    a.supabase = chemins.some(c => /(^|\/)supabase\//.test(c));
    return a;
  };

  /** Tables trouvées dans l'analyse, sans rien enregistrer : { tables, prisma } ou null. */
  C.tables = function (analyse) {
    if (!analyse.schemas.length) return null;
    const s = analyse.schemas[0];
    try { return AB.bases.importerSchemaTexte(s.texte, s.chemin, AB.bases.nouvelleBase('Base principale', 'postgres')); }
    catch (e) { return null; }
  };

  /** Met les tables du ZIP dans la base principale de l'app (créée si besoin). */
  C.appliquerSchema = function (app, analyse) {
    const r = C.tables(analyse);
    if (!r) return 0;
    AB.bases.de(app);
    let base = app.bases[0];
    if (!base) { base = AB.bases.nouvelleBase('Base principale', analyse.supabase && !r.prisma ? 'supabase' : 'postgres'); app.bases.push(base); }
    base.conventions = { id: false, horodatage: false };
    r.tables.forEach(t => { const i = base.tables.findIndex(x => x.nom === t.nom); if (i >= 0) base.tables[i] = t; else base.tables.push(t); });
    base.description = `Tables relevées dans ${analyse.schemas[0].chemin} (${new Date().toLocaleDateString('fr-FR')})`;
    return r.tables.length;
  };

  /**
   * Importe un ZIP. app absente : crée une nouvelle app. Renvoie { app, analyse, version }.
   * opts : { note, schema: true|false (mettre à jour la base), infos: true (reprendre nom, description…) }
   */
  C.importer = async function (blob, nomFichier, app, opts = {}) {
    const { fichiers } = await F.lireZip(blob);
    if (!Object.keys(fichiers).length) throw new Error('Le ZIP est vide.');
    const analyse = C.analyser(fichiers, nomFichier);
    const nouvelle = !app;
    if (nouvelle) {
      app = {
        id: U.uuid(), origine: 'existante', nom: analyse.nom, icone: analyse.icone, description: analyse.description, statut: 'en-dev',
        stack: analyse.stack, chemin: '', liens: { repo: '', prod: '' }, env: analyse.env, notes: analyse.notes,
        fonctionnalites: analyse.fonctionnalites, journal: [], blocsBranches: [], versions: [], cree: U.now(), creeAvec: 'claude'
      };
    } else if (opts.infos) {
      if (analyse.manifeste) { app.nom = analyse.nom || app.nom; app.description = analyse.description || app.description; }
      app.stack = analyse.stack || app.stack;
      const connues = new Set((app.env || []).map(v => v.cle));
      app.env = (app.env || []).concat(analyse.env.filter(v => !connues.has(v.cle)));
      if (analyse.fonctionnalites.length) app.fonctionnalites = analyse.fonctionnalites;
    }
    if (analyse.manifeste && analyse.manifeste.kit) app.kitApp = String(analyse.manifeste.kit);
    app.code = app.code || { versions: [], courante: 0 };
    const numero = app.code.versions.reduce((m, v) => Math.max(m, v.numero), 0) + 1;
    const chemin = `v${numero}/${String(nomFichier || 'app.zip').split(/[\\/]/).pop()}`;
    await F.ajouter(C.proprio(app), chemin, blob, []);
    const version = { numero, date: U.now(), chemin, nom: String(nomFichier || 'app.zip'), taille: blob.size, nbFichiers: analyse.nbFichiers, stack: analyse.stack, web: analyse.web, note: opts.note || (nouvelle ? 'Import du ZIP créé par Claude' : 'Nouvelle version') };
    app.code.versions.push(version);
    app.code.courante = numero;
    let tables = 0;
    if (opts.schema !== false) tables = C.appliquerSchema(app, analyse);
    app.journal = app.journal || [];
    app.journal.push({ date: U.now(), texte: `Code v${numero} importé (${version.nom}, ${analyse.nbFichiers} fichiers${tables ? `, ${tables} table(s)` : ''})` });
    await AB.apps.enregistrer(app);
    return { app, analyse, version, tables, nouvelle };
  };

  C.supprimerVersion = async function (app, numero) {
    const v = app.code.versions.find(x => x.numero === numero);
    if (!v) return;
    const f = (await F.lister(C.proprio(app))).find(x => x.chemin === v.chemin);
    if (f) await F.supprimer(f.id);
    app.code.versions = app.code.versions.filter(x => x !== v);
    if (app.code.courante === numero) app.code.courante = app.code.versions.reduce((m, x) => Math.max(m, x.numero), 0);
    await AB.apps.enregistrer(app);
  };
})();
