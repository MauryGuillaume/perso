/* ==========================================================================
   ab-prompt.js — assemble plusieurs kits en UN prompt prêt à coller dans Claude
   Sur le modèle du PROMPT.md du KIT Techview : présentation du projet, puis
   une section par critère (contexte, règles non négociables, design, sécurité,
   recette, livraison…) où chaque kit choisi apporte son texte, ses valeurs
   et ses règles, puis une checklist finale et les références en annexe.
   Champs à remplir : [[Nom du client]] ou ⟦Nom du client⟧ dans le texte d'un
   kit ; ils sont remplacés à la génération (laissés tels quels si vides).
   ========================================================================== */
(function () {
  const U = AB.u;
  const P = AB.prompt = {};

  const TROU = /⟦([^⟧\n]{1,80})⟧|\[\[([^\]\n]{1,80})\]\]/g;
  /** Champs remplis automatiquement depuis le projet. */
  const AUTO = { nom: 'nom', 'nom de l’app': 'nom', "nom de l'app": 'nom', "nom de l'application": 'nom', 'nom de l’application': 'nom', description: 'description' };

  const textesDuKit = k => [k.description, k.reference, ...Object.values(k.criteres || {}), ...k.regles.map(r => r.texte)];

  /** Champs à remplir trouvés dans les kits (hors nom et description, remplis d'office). */
  P.trous = function (kits) {
    const vus = new Map();
    kits.forEach(k => textesDuKit(k).forEach(t => String(t || '').replace(TROU, (m, a, b) => {
      const nom = (a || b).trim();
      if (!AUTO[nom.toLowerCase()] && !vus.has(nom.toLowerCase())) vus.set(nom.toLowerCase(), nom);
      return m;
    })));
    return [...vus.values()];
  };

  /** Valeurs d'un kit typé, en lignes « - Libellé : valeur ». */
  function lignesValeurs(k, surcharges) {
    const T = AB.kits.TYPES[k.type];
    if (!T || !T.champs.length) return [];
    return T.champs.map(c => {
      let v = surcharges && surcharges[c.cle] !== undefined ? surcharges[c.cle] : k.valeurs[c.cle];
      if (c.type === 'booleen') v = v ? 'oui' : 'non';
      if (v === undefined || v === null || String(v).trim() === '') return '';
      const perso = surcharges && surcharges[c.cle] !== undefined ? ' *(personnalisé pour cette app)*' : '';
      return c.type === 'texte-long' ? `- ${c.label} :\n\n  > ${String(v).trim().replace(/\n/g, '\n  > ')}`
        : `- ${c.label} : \`${String(v).trim()}\`${perso}`;
    }).filter(Boolean);
  }

  /** Description de l'app : blocs, écrans réservés, variables, tables. */
  function sectionApp(app) {
    const insts = (app.blocs || []).map(i => ({ i, d: AB.blocs.get(i.bloc, i.version) })).filter(x => x.d);
    const modele = AB.bases.markdown(app);
    const existante = app.origine !== 'plateforme';
    if (!insts.length && !modele && !existante) return '';
    const out = [existante ? '## L’app actuelle' : '## L’app et ses blocs', ''];
    if (existante) {
      out.push(`Cette demande fait évoluer une app qui existe déjà${app.stack ? ` (${app.stack})` : ''}${app.code && app.code.courante ? `, dont le code actuel (version ${app.code.courante}) est joint` : ''}. Garde ses choix techniques et ce qui fonctionne ; ne réécris que ce qui doit changer.`, '');
      if ((app.fonctionnalites || []).length) out.push('Fonctionnalités actuelles :', '', ...app.fonctionnalites.map(f => `- ${f[0]}`), '');
    }
    if (insts.length) out.push('L’app est composée des blocs suivants (déjà écrits dans l’Atelier de Blocs, à reprendre ou à prolonger, pas à réinventer) :', '');
    insts.forEach(({ i, d }) => {
      const titre = (i.reglages && (i.reglages.onglet || i.reglages.titre)) || d.nom;
      out.push(`- **${d.nom}** v${d.version}${titre !== d.nom ? ` (« ${titre} »)` : ''}${i.protege ? ' — réservé aux utilisateurs connectés' : ''} : ${d.description || ''}`.trim());
    });
    const tables = insts.flatMap(({ d }) => d.tables.map(t => `- \`${t.nom}\` (${AB.blocs.ACCES_TABLE[t.acces] || t.acces}) : ${t.colonnes.map(c => c[0]).join(', ')}`));
    if (modele) out.push('', '### Modèle de données', '', 'Les bases ci-dessous sont conçues dans l’Atelier (écran « Bases de données ») : crée exactement ces tables et colonnes, avec le SQL fourni par l’Atelier, et ne change le schéma qu’en le modifiant là-bas.', '', modele);
    else if (tables.length) out.push('', 'Tables (Supabase, règles d’accès RLS générées) :', '', ...[...new Set(tables)]);
    const env = existante ? (app.env || []).map(v => Object.assign({ blocs: [] }, v)) : AB.rendu.env(app);
    if (env.length) {
      out.push('', 'Variables d’environnement (noms seulement : aucune valeur secrète ne doit apparaître dans le code livré) :', '',
        '| Clé | Rôle | Secrète | Blocs |', '| --- | --- | --- | --- |',
        ...env.map(v => `| \`${v.cle}\` | ${v.role || ''} | ${v.secret ? 'oui (serveur uniquement)' : 'non'} | ${v.blocs.join(', ')} |`));
    }
    return out.join('\n');
  }

  /** Blocs choisis en plus (hors app) : ce qu'ils font, leurs tables, leurs réglages. */
  function sectionBlocs(blocs, pack) {
    if (!blocs || !blocs.length) return '';
    const out = ['## Blocs à reprendre', '',
      `Ces blocs existent déjà dans mon Atelier de Blocs${pack ? ' (définition complète, écrans et code compris, dans `blocs/` du pack joint)' : ''}. Reprends leur fonctionnement, leurs écrans et leurs tables au lieu de les réinventer, en les adaptant à l’app.`, ''];
    blocs.forEach(d => {
      out.push(`### ${d.nom} (v${d.version}${pack ? `, \`blocs/${d.id}.js\`` : ''})`, '', (d.description || '').trim() || '—', '');
      if (d.ecrans.length) out.push(`- Écrans : ${d.ecrans.map(e => [e.titre, e.nom, e.id].find(t => t && !/\{\{/.test(t))).filter(Boolean).join(', ') || d.ecrans.length}`);
      if (d.tables.length) out.push(`- Tables : ${d.tables.map(t => `\`${t.nom}\` (${t.colonnes.map(c => c[0]).join(', ')})`).join(' ; ')}`);
      if (d.reglages.length) out.push(`- Réglages : ${d.reglages.map(r => r.label || r.cle).join(', ')}`);
      if (d.env.length) out.push(`- Variables : ${d.env.map(v => `\`${v.cle}\``).join(', ')}`);
      if (d.dependances.length) out.push(`- A besoin de : ${d.dependances.join(', ')}`);
      if (d.donneesPersonnelles) out.push('- Manipule des données personnelles : écrans réservés aux utilisateurs connectés.');
      out.push('');
    });
    return out.join('\n');
  }

  /** Contenu du pack joint (liste des dossiers et fichiers). */
  function sectionPack(pack) {
    const out = ['## Fichiers joints', '', `Je joins le ZIP **${pack.nom}**. Lis-le en entier avant de commencer : son contenu fait partie des consignes.`, ''];
    pack.kits.forEach(({ k, chemins }) => out.push(`- \`kits/${k.id}/\` : le kit « ${k.nom} » (\`KIT-ATELIER.md\` reprend ses règles)${chemins.length ? `, avec ${chemins.length} document(s) : ${chemins.slice(0, 12).map(c => `\`${c}\``).join(', ')}${chemins.length > 12 ? '…' : ''}` : ''}`));
    pack.blocs.forEach(d => out.push(`- \`blocs/${d.id}.js\` : le bloc « ${d.nom} » (définition, écrans, code)`));
    pack.bases.forEach(b => out.push(`- \`bases/${b.fichier}\` : le schéma de la base « ${b.base.nom} » (SQL de création)`));
    if (pack.identite) out.push('- `identite/` : le logo de l’app (`icone.svg`, `icone-512.png`, `icone-192.png`, `icone-180.png`) s’il est choisi, son univers graphique (`univers.css`, `UNIVERS.md`)');
    if (pack.code) out.push(`- \`code-actuel/\` : le code actuel de l’app (version ${pack.code}). Pars de lui.`);
    return out.join('\n');
  }

  P.MANIFESTE_EXEMPLE = {
    nom: 'Nom de l’app', description: 'Ce que fait l’app, en 2 ou 3 phrases.', version: '1.0.0', icone: 'mdi-cellphone',
    stack: 'Ex. HTML, CSS, JavaScript + Node.js (Express) + PostgreSQL', web: 'public',
    schema: ['db/schema.sql'],
    env: [{ cle: 'DATABASE_URL', role: 'Connexion à la base', secret: true }],
    fonctionnalites: [['Prise de rendez-vous', 'agenda']],
    notes: 'Ce qu’il faut savoir pour lancer et faire évoluer l’app.'
  };

  /** Consigne de livraison : un ZIP que l'Atelier sait importer. */
  function sectionLivraison() {
    return ['## Livraison pour l’Atelier de Blocs', '',
      'Livre l’app complète dans **un seul fichier ZIP**, que j’importerai dans mon Atelier de Blocs pour la gérer (versions, base de données, app mobile, audit). Pas de `node_modules`, pas de fichier `.env` avec des valeurs. À la racine du ZIP :', '',
      '- `atelier-app.json` : la fiche de l’app, au format ci-dessous ;',
      '- `README.md` : installation, lancement en local, déploiement ;',
      '- `.env.example` : toutes les variables, sans aucune valeur secrète ;',
      '- le schéma de la base : SQL de création (`CREATE TABLE`, clés, relations) ou `schema.prisma`, cité dans `schema` ;',
      '- l’interface : le dossier qui contient `index.html` (cité dans `web`), qui appelle l’API par des chemins relatifs (`/api/…`) pour pouvoir devenir une app mobile sans changer le serveur.', '',
      '```json', JSON.stringify(P.MANIFESTE_EXEMPLE, null, 2), '```', '',
      '`fonctionnalites` : une ligne par fonctionnalité, avec le bloc de l’Atelier qui la porte (ou le nom d’un bloc à créer).'].join('\n');
  }

  /**
   * Génère le prompt.
   * opts : { kits: [kit], nom, description, app?, valeurs: { champ: texte }, annexes, checklist, fin,
   *          blocs: [bloc] (en plus de ceux de l'app), pack: { nom, kits: [{ k, chemins }], blocs, bases, code } | null,
   *          livraison: true (ZIP importable dans l'Atelier), identite: nom et logo choisis (ab-identite.js) | null }
   */
  P.generer = function (opts) {
    const kits = opts.kits || [];
    const nom = (opts.nom || '').trim() || (opts.app && opts.app.nom) || '⟦Nom de l’app⟧';
    const description = (opts.description || '').trim() || (opts.app && opts.app.description) || '⟦Décris en 3 à 6 lignes le besoin : utilisateurs, objets gérés, parcours principaux.⟧';
    const surcharges = opts.app && opts.app.surcharges && Object.keys(opts.app.surcharges).length ? opts.app.surcharges : null;

    // Ce que chaque kit apporte à chaque critère
    const parCritere = new Map();
    const section = id => { if (!parCritere.has(id)) parCritere.set(id, { textes: [], valeurs: [], css: [], regles: [] }); return parCritere.get(id); };
    kits.forEach(k => {
      Object.entries(k.criteres || {}).forEach(([c, t]) => { if (String(t || '').trim()) section(c).textes.push({ k, t: String(t).trim() }); });
      const cType = AB.kits.CRITERE_DU_TYPE[k.type] || 'regles';
      const val = lignesValeurs(k, k.type === 'charte' ? surcharges : null);
      if (val.length) section(cType).valeurs.push({ k, lignes: val });
      if (k.css && k.css.trim()) section('design').css.push({ k, css: k.css.trim() });
      k.regles.forEach(r => section(r.critere || cType).regles.push({ k, r }));
    });

    const ordre = AB.kits.criteres.map(c => c.id).concat([...parCritere.keys()].filter(id => !AB.kits.criteres.some(c => c.id === id)));
    const plusieurs = kits.length > 1;
    const out = [];
    out.push(`# Prompt — ${nom}`, '',
      `> Généré par l’Atelier de Blocs le ${new Date().toLocaleDateString('fr-FR')} à partir de ${kits.length} kit(s). À coller tel quel au début de la conversation avec Claude.`,
      '', '---', '',
      `Tu développes **${nom}**, une app mobile (PWA en HTML, CSS et JavaScript). ${description}`, '');
    const identite = AB.identite.section(opts.identite, nom, opts.pack ? 'identite/' : '');
    if (identite) out.push(identite, '');
    if (kits.length) {
      out.push(`Tu respectes **tous** les kits ci-dessous : ils forment la base commune de mes apps. Si deux kits se contredisent, signale-le-moi avant de trancher.`, '',
        '| Kit | Type | Version | Rôle |', '| --- | --- | --- | --- |',
        ...kits.map(k => `| ${k.nom} | ${(AB.kits.TYPES[k.type] || {}).label || k.type} | ${k.version} | ${(k.description || '').replace(/\n/g, ' ')} |`), '');
    }

    let appPlacee = false;
    const placerApp = () => {
      if (appPlacee) return;
      appPlacee = true;
      const s = opts.app ? sectionApp(opts.app) : '';
      if (s) out.push(s, '');
      const b = sectionBlocs(opts.blocs, !!opts.pack);
      if (b) out.push(b, '');
      if (opts.pack) out.push(sectionPack(opts.pack), '');
    };

    ordre.forEach(id => {
      const s = parCritere.get(id);
      if (!s) { if (id === 'contexte') placerApp(); return; }
      out.push(`## ${AB.kits.titreCritere(id)}`, '');
      s.textes.forEach(({ k, t }) => { if (plusieurs) out.push(`*${k.nom} :*`, ''); out.push(t, ''); });
      s.valeurs.forEach(({ k, lignes }) => out.push(`Valeurs fixées par **${k.nom}** :`, '', ...lignes, ''));
      s.css.forEach(({ k, css }) => out.push(`CSS commun imposé par **${k.nom}** (à reprendre tel quel) :`, '', '```css', css, '```', ''));
      const regles = s.regles.slice().sort((a, b) => (a.r.niveau === 'recommande') - (b.r.niveau === 'recommande'));
      if (regles.length) out.push(...regles.map(({ k, r }) => `- ${r.niveau === 'recommande' ? 'Recommandé' : '**Obligatoire**'} : ${r.texte}${plusieurs ? ` *(${k.nom})*` : ''}`), '');
      if (id === 'contexte') placerApp();
    });
    placerApp();

    const toutes = kits.flatMap(k => k.regles.map(r => ({ k, r })));
    if (opts.checklist !== false && toutes.length) {
      out.push('## Checklist finale', '', 'Avant de me livrer, vérifie chaque point et donne-moi cette liste cochée :', '',
        ...toutes.map(({ k, r }) => `- [ ] ${r.texte} *(${k.nom}${r.niveau === 'recommande' ? ', recommandé' : ''})*`), '');
    }
    if (opts.livraison) out.push(sectionLivraison(), '');
    const refs = kits.filter(k => k.reference && k.reference.trim());
    if (opts.annexes !== false && refs.length) {
      out.push('## Annexes : références des kits', '');
      refs.forEach(k => out.push(`### ${k.nom} (v${k.version})`, '', k.reference.trim(), ''));
    }
    if (opts.fin && opts.fin.trim()) out.push('---', '', opts.fin.trim(), '');

    // Champs à remplir
    const valeurs = Object.assign({}, opts.valeurs);
    return out.join('\n').replace(TROU, (m, a, b) => {
      const cle = (a || b).trim();
      const auto = AUTO[cle.toLowerCase()];
      if (auto === 'nom') return nom;
      if (auto === 'description') return description;
      const v = Object.entries(valeurs).find(([c]) => c.toLowerCase() === cle.toLowerCase());
      return v && String(v[1]).trim() ? String(v[1]).trim() : `⟦${cle}⟧`;
    }).replace(/\n{3,}/g, '\n\n');
  };

  /**
   * Pack à joindre dans Claude avec le prompt : un ZIP avec PROMPT.md, les kits (règles + fichiers),
   * les blocs choisis, le SQL des bases de l'app et son code actuel.
   * opts : ceux de P.generer, plus { joindreCode }. Renvoie { blob, nom, texte }.
   */
  /** Ce que contiendra le pack (noms seulement, sans rien lire) : pour le prompt affiché à l'écran.
      cheminsKits : { 'kit:<id>@<version>': [chemins] }. */
  P.metaPack = function (opts, cheminsKits) {
    const app = opts.app || null;
    const slug = U.slug(opts.nom || (app && app.nom) || 'app') || 'app';
    const pack = { nom: `pack-${slug}.zip`, racine: `pack-${slug}/`, kits: [], blocs: opts.blocs || [], bases: [], code: 0, identite: AB.identite.aDesFichiers(opts.identite) };
    (opts.kits || []).forEach(k => pack.kits.push({ k, chemins: (cheminsKits[AB.kits.proprio(k)] || []).slice().sort() }));
    if (app) {
      AB.bases.de(app);
      app.bases.forEach(b => { if (AB.bases.tables(app, b).length) pack.bases.push({ fichier: `${U.slug(b.nom) || b.id}.sql`, base: b }); });
      if (opts.joindreCode && AB.code.courante(app)) pack.code = AB.code.courante(app).numero;
    }
    return pack;
  };

  P.pack = async function (opts) {
    const app = opts.app || null;
    const cheminsKits = {};
    for (const k of opts.kits || []) cheminsKits[AB.kits.proprio(k)] = (await AB.kits.fichiers(k)).map(f => f.chemin);
    const pack = P.metaPack(opts, cheminsKits);
    const { nom, racine } = pack;
    const contenu = {};
    for (const k of opts.kits || []) Object.assign(contenu, await AB.kits.contenuZip(k, `${racine}kits/${k.id}/`, false));
    pack.blocs.forEach(d => { contenu[`${racine}blocs/${d.id}.js`] = AB.blocs.versFichier(d); });
    pack.bases.forEach(({ fichier, base }) => { contenu[`${racine}bases/${fichier}`] = AB.bases.sql(app, base); });
    if (pack.identite) Object.assign(contenu, await AB.identite.fichiersIdentite(opts.identite, `${racine}identite/`, opts.nom || ''));
    if (pack.code) {
      const { fichiers } = await AB.fichiers.lireZip(await AB.code.zip(app));
      Object.entries(fichiers).forEach(([c, o]) => { if (!/(^|\/)(node_modules|\.git)\//.test(c) && !/(^|\/)\.env$/.test(c)) contenu[`${racine}code-actuel/${c}`] = o; });
    }
    const texte = P.generer(Object.assign({}, opts, { pack }));
    contenu[`${racine}PROMPT.md`] = texte;
    contenu[`${racine}LISEZMOI.md`] = [`# ${nom}`, '', 'Pack préparé par l’Atelier de Blocs.', '',
      '1. Dans Claude, ouvre une nouvelle conversation.',
      '2. Colle le contenu de `PROMPT.md` (ou joins-le).',
      '3. Joins ce ZIP entier.',
      '4. Quand Claude livre l’app en ZIP, importe-le dans l’Atelier : Mes apps › Importer le ZIP d’une app (ou, pour une nouvelle version, onglet « Code et versions » de l’app).', ''].join('\n');
    return { blob: AB.zip(contenu), nom, texte };
  };

  P.FIN = 'Commence par me présenter en une page ton plan (écrans, données, blocs utilisés ou à créer) et attends ma validation si un point est ambigu.';
})();
