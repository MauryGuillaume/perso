/* ==========================================================================
   ab-kits.js — les KITS : règles communes qui servent de base aux apps
   Un kit a un TYPE qui définit ses réglages (« valeurs ») :
   - charte     : couleurs, police, arrondis, CSS de base (chaque app peut
                  changer certaines valeurs sans toucher au reste) ;
   - securite   : règles de cybersécurité appliquées et vérifiées ;
   - affichage  : langue, devise, formats, mentions légales, bandeau cookies ;
   - libre      : des règles écrites (checklist), du CSS, et surtout des
                  documents : un kit est aussi un dossier de fichiers (KIT.md,
                  exemples de code, images, PDF…) exporté en ZIP pour Claude.
   Tout kit peut ajouter des règles libres, cochées app par app.
   Une app choisit au plus un kit par type (charte, securite, affichage) et
   autant de kits « libre » qu'elle veut. Les kits « par défaut » sont
   appliqués à chaque nouvelle app.

   Comme le KIT Techview (PROMPT.md + KIT.md), un kit est aussi du texte
   pour l'IA : il répond à des CRITÈRES (sections du prompt : contexte,
   règles non négociables, design, sécurité, recette, livraison…). Chaque
   règle est rangée sous un critère, chaque critère peut recevoir un texte
   libre, et un texte de référence long va en annexe. La liste des critères
   se règle dans l'écran Kits ; ab-prompt.js assemble les kits choisis en
   un seul prompt.
   ========================================================================== */
(function () {
  const U = AB.u;

  const POLICES = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Lato', 'Nunito', 'system-ui'];

  const TYPES = {
    charte: {
      label: 'Charte graphique', icone: 'mdi-palette-outline', unique: true,
      champs: [
        { cle: 'primaire', label: 'Couleur principale', type: 'couleur', defaut: '#001047' },
        { cle: 'accent', label: 'Couleur d’accent', type: 'couleur', defaut: '#2962ff' },
        { cle: 'fond', label: 'Fond', type: 'couleur', defaut: '#f4f5f7' },
        { cle: 'texte', label: 'Texte', type: 'couleur', defaut: '#101012' },
        { cle: 'police', label: 'Police', type: 'choix', options: POLICES.join('\n'), defaut: 'Inter' },
        { cle: 'rayon', label: 'Arrondi des angles (px)', type: 'nombre', defaut: 12 }
      ]
    },
    securite: {
      label: 'Cybersécurité', icone: 'mdi-shield-lock-outline', unique: true,
      champs: [
        { cle: 'mdpMin', label: 'Longueur minimale des mots de passe', type: 'nombre', defaut: 10 },
        { cle: 'httpsObligatoire', label: 'HTTPS obligatoire (redirection automatique)', type: 'booleen', defaut: true },
        { cle: 'csp', label: 'En-tête de sécurité CSP (sources de scripts limitées)', type: 'booleen', defaut: true },
        { cle: 'protegerDonneesPerso', label: 'Écrans avec données personnelles réservés aux connectés', type: 'booleen', defaut: true },
        { cle: 'mdpComplexe', label: 'Mots de passe complexes (minuscule, majuscule, chiffre, symbole)', type: 'booleen', defaut: false },
        { cle: 'entetes', label: 'En-têtes de sécurité pour l’hébergeur (_headers, vercel.json)', type: 'booleen', defaut: false },
        { cle: 'auditExport', label: 'Audit de sécurité avant chaque export', type: 'choix', options: 'non\navertir\nbloquer', defaut: 'non',
          aide: 'bloquer : export refusé tant qu’il reste un point critique ou élevé' }
      ]
    },
    affichage: {
      label: 'Règles d’affichage', icone: 'mdi-format-list-checks', unique: true,
      champs: [
        { cle: 'langue', label: 'Langue et format régional', type: 'texte', defaut: 'fr-FR', aide: 'Ex. fr-FR, fr-BE, en-GB' },
        { cle: 'devise', label: 'Devise', type: 'texte', defaut: 'EUR' },
        { cle: 'formatDate', label: 'Format des dates', type: 'choix', options: 'court\nlong', defaut: 'court' },
        { cle: 'mentions', label: 'Mentions en bas de chaque écran', type: 'texte-long', defaut: '' },
        { cle: 'bandeauCookies', label: 'Bandeau d’information cookies', type: 'booleen', defaut: true },
        { cle: 'texteCookies', label: 'Texte du bandeau', type: 'texte', defaut: 'Cette app utilise uniquement les cookies nécessaires à son fonctionnement.' }
      ]
    },
    libre: { label: 'Kit libre (règles et documents)', icone: 'mdi-folder-zip-outline', unique: false, champs: [] }
  };

  /* Critères proposés au départ, d'après le PROMPT.md du KIT Techview.
     La liste réelle (modifiable) est dans K.criteres, enregistrée en base. */
  const CRITERES = [
    { id: 'contexte', titre: 'Contexte et objectif' },
    { id: 'avant', titre: 'Avant d’écrire la moindre ligne' },
    { id: 'regles', titre: 'Règles non négociables' },
    { id: 'design', titre: 'Charte graphique et design' },
    { id: 'securite', titre: 'Cybersécurité' },
    { id: 'donnees', titre: 'Données et backend' },
    { id: 'affichage', titre: 'Affichage et textes' },
    { id: 'demarche', titre: 'Démarche attendue' },
    { id: 'recette', titre: 'Recette avant livraison' },
    { id: 'livraison', titre: 'Livraison' },
    { id: 'pieges', titre: 'Pièges connus' }
  ];
  /** Critère où vont par défaut les règles et les valeurs d'un type de kit. */
  const CRITERE_DU_TYPE = { charte: 'design', securite: 'securite', affichage: 'affichage', libre: 'regles' };

  function normaliser(def) {
    const k = Object.assign({
      id: '', nom: '', version: '1.0.0', type: 'libre', description: '', parDefaut: false, obligatoire: false,
      etiquettes: [], valeurs: {}, regles: [], criteres: {}, reference: '', css: '', journal: []
    }, U.clone(def));
    delete k.fichiersFournis;   // installés dans la table « fichiers » (K.installerFournis)
    const type = TYPES[k.type] || TYPES.libre;
    type.champs.forEach(c => { if (k.valeurs[c.cle] === undefined) k.valeurs[c.cle] = c.defaut; });
    if (typeof k.etiquettes === 'string') k.etiquettes = k.etiquettes.split(',');
    k.etiquettes = k.etiquettes.map(e => String(e).trim()).filter(Boolean);
    k.regles.forEach((r, i) => {
      r.id = r.id || 'r' + (i + 1);
      r.niveau = r.niveau || 'obligatoire';
      r.critere = r.critere || CRITERE_DU_TYPE[k.type] || 'regles';
    });
    k.cle = `${k.id}@${k.version}`;
    return k;
  }

  function valider(k) {
    const err = AB.verifierBase(k);
    if (!TYPES[k.type]) err.push(`Type « ${k.type} » inconnu.`);
    const vus = new Set();
    k.regles.forEach(r => {
      if (!r.texte) err.push('Une règle est vide.');
      if (vus.has(r.id)) err.push(`Deux règles ont le même identifiant (${r.id}).`);
      vus.add(r.id);
    });
    return err;
  }

  const K = AB.kits = AB.registre({
    store: 'kits', nom: 'kits', normaliser, valider,
    trier: (a, b) => (a.type + a.nom).localeCompare(b.type + b.nom, 'fr')
  });
  K.TYPES = TYPES;
  K.POLICES = POLICES;
  K.normaliser = normaliser;
  K.valider = valider;
  K.CRITERES = CRITERES;
  K.CRITERE_DU_TYPE = CRITERE_DU_TYPE;

  /* ---------- Critères (sections du prompt) ---------- */
  K.criteres = U.clone(CRITERES);
  K.chargerCriteres = async () => { K.criteres = await AB.db.getMeta('criteres', U.clone(CRITERES)); };
  K.enregistrerCriteres = async liste => {
    const vus = new Set();
    K.criteres = liste.filter(c => c.titre && c.titre.trim()).map(c => {
      let id = c.id || U.slug(c.titre) || 'c';
      while (vus.has(id)) id += '-2';
      vus.add(id);
      return { id, titre: c.titre.trim() };
    });
    await AB.db.setMeta('criteres', K.criteres);
  };
  /** Titre d'un critère (un critère inconnu, venu d'un kit importé, garde son identifiant). */
  K.titreCritere = id => (K.criteres.find(c => c.id === id) || { titre: id }).titre;

  /** Kits à appliquer à une nouvelle app (les obligatoires en font toujours partie). */
  K.parDefaut = () => K.derniers().filter(k => k.parDefaut || k.obligatoire).map(k => ({ kit: k.id, version: k.version }));

  /** Kits obligatoires : imposés à toutes les apps de la plateforme, impossibles à retirer. */
  K.obligatoires = () => K.derniers().filter(k => k.obligatoire);
  K.estObligatoire = id => { const k = K.dernier(id); return !!(k && k.obligatoire); };

  /** Ajoute à l'app les kits obligatoires qui lui manquent (remplace un kit du même type unique).
      Renvoie true si l'app a changé. */
  K.imposer = function (app) {
    if (app.origine !== 'plateforme') return false;
    app.kits = app.kits || [];
    let change = false;
    K.obligatoires().forEach(o => {
      if (app.kits.some(r => r.kit === o.id)) return;
      if (TYPES[o.type] && TYPES[o.type].unique) {
        app.kits = app.kits.filter(r => { const k = K.get(r.kit, r.version); return !k || k.type !== o.type; });
      }
      app.kits.push({ kit: o.id, version: o.version });
      change = true;
    });
    return change;
  };

  /** Kits d'une app, résolus : { charte, securite, affichage, libres: [], tous: [], manquants: [] }. */
  K.resoudre = function (app) {
    const r = { charte: null, securite: null, affichage: null, libres: [], tous: [], manquants: [] };
    (app.kits || []).forEach(ref => {
      const k = K.get(ref.kit, ref.version);
      if (!k) { r.manquants.push(`${ref.kit}@${ref.version}`); return; }
      r.tous.push(k);
      if (k.type === 'libre') r.libres.push(k); else r[k.type] = k;
    });
    return r;
  };

  /** Valeurs d'un type de kit pour une app (valeurs par défaut si l'app n'a pas ce kit). */
  K.valeurs = function (app, type) {
    const k = K.resoudre(app)[type];
    const v = {};
    TYPES[type].champs.forEach(c => { v[c.cle] = c.defaut; });
    return Object.assign(v, k ? k.valeurs : {});
  };

  /* ======================= Conformité d'une app =======================
     Renvoie [{ groupe, texte, statut: 'ok'|'ko'|'info'|'manuel', detail, cle? }]
     'manuel' : règle écrite d'un kit, à cocher (app.conformite[cle]). */
  K.conformite = function (app) {
    const res = [];
    const kits = K.resoudre(app);
    const ajouter = (groupe, texte, ok, detail, statut) => res.push({ groupe, texte, statut: statut || (ok ? 'ok' : 'ko'), detail: detail || '' });
    const instances = (app.blocs || []).map(i => ({ inst: i, def: AB.blocs.get(i.bloc, i.version) })).filter(x => x.def);

    // Contrôles toujours faits
    kits.manquants.forEach(m => ajouter('Kits', `Kit introuvable : ${m}`, false));
    K.obligatoires().forEach(o => { if (!(app.kits || []).some(r => r.kit === o.id)) ajouter('Kits', `Kit obligatoire absent : ${o.nom}`, false); });
    ['charte', 'securite', 'affichage'].forEach(t => {
      if (!kits[t]) ajouter('Kits', `Aucun kit « ${TYPES[t].label} »`, false, 'Les valeurs par défaut de la plateforme s’appliquent.', 'info');
    });
    instances.forEach(({ def }) => def.dependances.forEach(d => {
      if (!instances.some(x => x.def.id === d)) ajouter('Blocs', `${def.nom} a besoin du bloc « ${d} »`, false);
    }));
    const secretsRemplis = AB.rendu.env(app).filter(v => v.secret && app.config && app.config[v.cle]);
    ajouter('Secrets', 'Aucune valeur secrète enregistrée dans l’app', !secretsRemplis.length, secretsRemplis.map(v => v.cle).join(', '));

    // Kit de cybersécurité
    const s = K.valeurs(app, 'securite');
    if (kits.securite) {
      ajouter('Cybersécurité', `Mots de passe d’au moins ${s.mdpMin} caractères`, Number(s.mdpMin) >= 8, Number(s.mdpMin) < 8 ? 'Moins de 8 caractères : trop faible.' : '');
      ajouter('Cybersécurité', 'HTTPS obligatoire', !!s.httpsObligatoire);
      ajouter('Cybersécurité', 'En-tête CSP dans l’app exportée', !!s.csp);
      if (s.mdpComplexe) ajouter('Cybersécurité', 'Mots de passe complexes exigés', true, 'Contrôlé dans l’app et dans supabase/config.toml.');
      if (s.entetes) ajouter('Cybersécurité', 'En-têtes de sécurité fournis à l’hébergeur', true, '_headers et vercel.json dans l’export.');
      const dernierAudit = (app.audits || [])[0];
      if (s.auditExport !== 'non') ajouter('Cybersécurité', 'Audit de sécurité sans point critique ni élevé', !!dernierAudit && !dernierAudit.bloquants,
        dernierAudit ? `Dernier audit : ${dernierAudit.score}/100 (${dernierAudit.note}), ${U.fmtDate(dernierAudit.date)}` : 'Aucun audit : lance-le depuis l’onglet Export ou l’écran Audit.');
      if (s.protegerDonneesPerso) {
        const exposes = instances.filter(x => x.def.donneesPersonnelles && !x.inst.protege && x.def.id !== 'connexion');
        ajouter('Cybersécurité', 'Données personnelles réservées aux utilisateurs connectés', !exposes.length,
          exposes.length ? 'À protéger : ' + exposes.map(x => (x.inst.reglages && (x.inst.reglages.onglet || x.inst.reglages.titre)) || x.def.nom).join(', ') : '');
        if (exposes.length && !instances.some(x => x.def.id === 'connexion')) ajouter('Cybersécurité', 'Bloc Connexion présent pour protéger les écrans', false);
      }
    }
    instances.forEach(({ def }) => def.tables.forEach(t => {
      ajouter('Données', `Table ${t.nom} : ${AB.blocs.ACCES_TABLE[t.acces]}`, true, 'Règles d’accès (RLS) générées.', 'info');
    }));

    // Règles écrites des kits (checklist)
    kits.tous.forEach(k => k.regles.forEach(r => {
      const cle = `${k.id}:${r.id}`;
      res.push({ groupe: k.nom, texte: r.texte, statut: (app.conformite || {})[cle] ? 'ok' : 'manuel', detail: r.niveau === 'recommande' ? 'Recommandé' : 'Obligatoire', cle });
    }));
    return res;
  };

  /** Résumé : nombre de points bloquants (ko + règles obligatoires non cochées). */
  K.bloquants = app => K.conformite(app).filter(r => r.statut === 'ko' || (r.statut === 'manuel' && r.detail === 'Obligatoire')).length;

  /* ======================= Fichiers du kit et ZIP =======================
     Un kit est aussi un dossier : ses fichiers sont dans la table « fichiers »
     (propriétaire kit:<id>@<version>). Son ZIP contient KIT-ATELIER.md (ce que
     l'Atelier sait du kit : critères, règles, valeurs, référence), kit-atelier.json
     (pour le réimporter à l'identique) et tous ses fichiers. */
  K.proprio = k => `kit:${k.id}@${k.version}`;
  K.fichiers = k => AB.fichiers.lister(K.proprio(k));

  /** Kits fournis : leurs fichiers (fichiersFournis : { chemin: texte }) sont installés une fois, s'ils n'ont encore aucun fichier. */
  /** Fichier fourni : texte, ou binaire écrit « data:;base64,… » (images). */
  const enOctets = c => typeof c === 'string' && c.startsWith('data:') ? Uint8Array.from(atob(c.slice(c.indexOf(',') + 1)), x => x.charCodeAt(0)) : c;
  const installerKitsFournis = K.installerFournis;
  K.installerFournis = async function () {
    await installerKitsFournis();
    for (const def of K.fournis) {
      if (!def.fichiersFournis || !K.get(def.id, def.version)) continue;
      const proprio = `kit:${def.id}@${def.version}`;
      if ((await AB.fichiers.lister(proprio)).length) continue;
      for (const [chemin, contenu] of Object.entries(def.fichiersFournis)) await AB.fichiers.ajouter(proprio, chemin, enOctets(contenu), []);
    }
  };

  /** Le kit en Markdown, lisible par Claude. fichiers : chemins joints (facultatif). */
  K.markdown = function (k, fichiers) {
    const T = TYPES[k.type] || TYPES.libre;
    const out = [`# Kit « ${k.nom} » v${k.version}`, '', `> ${T.label}${k.etiquettes.length ? ' · ' + k.etiquettes.join(', ') : ''}. Exporté de l’Atelier de Blocs le ${new Date().toLocaleDateString('fr-FR')}.`, ''];
    if (k.description) out.push(k.description.trim(), '');
    if (T.champs.length) {
      out.push('## Valeurs imposées', '');
      T.champs.forEach(c => { let v = k.valeurs[c.cle]; if (c.type === 'booleen') v = v ? 'oui' : 'non'; if (v !== '' && v !== undefined) out.push(`- ${c.label} : \`${String(v).trim()}\``); });
      out.push('');
    }
    const ids = K.criteres.map(c => c.id).concat(Object.keys(k.criteres).filter(id => !K.criteres.some(c => c.id === id)));
    ids.forEach(id => {
      const texte = String(k.criteres[id] || '').trim();
      const regles = k.regles.filter(r => (r.critere || CRITERE_DU_TYPE[k.type]) === id);
      if (!texte && !regles.length) return;
      out.push(`## ${K.titreCritere(id)}`, '');
      if (texte) out.push(texte, '');
      if (regles.length) out.push(...regles.map(r => `- ${r.niveau === 'recommande' ? 'Recommandé' : '**Obligatoire**'} : ${r.texte}`), '');
    });
    if (k.css && k.css.trim()) out.push('## CSS commun', '', '```css', k.css.trim(), '```', '');
    if (fichiers && fichiers.length) out.push('## Fichiers du kit', '', 'À lire avant de commencer : ils font partie des consignes.', '', ...fichiers.map(c => `- \`${c}\``), '');
    if (k.reference && k.reference.trim()) out.push('## Référence', '', k.reference.trim(), '');
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
  };

  /** Contenu du kit pour un ZIP : { chemin: contenu } sous prefixe (ex. « kits/charte/ »). */
  K.contenuZip = async function (k, prefixe, avecDefinition) {
    const fichiers = await K.fichiers(k);
    const sortie = {};
    const nomMd = fichiers.some(f => f.chemin === 'KIT-ATELIER.md') ? 'KIT-ATELIER-' + k.version + '.md' : 'KIT-ATELIER.md';
    sortie[prefixe + nomMd] = K.markdown(k, fichiers.map(f => f.chemin));
    if (avecDefinition) {
      const def = U.clone(k);
      delete def.cle; delete def.modifie; delete def.fichiersFournis;
      sortie[prefixe + 'kit-atelier.json'] = JSON.stringify(def, null, 2);
    }
    for (const f of fichiers) sortie[prefixe + f.chemin] = await AB.fichiers.octets(f);
    return sortie;
  };
  K.versZip = async k => AB.zip(await K.contenuZip(k, `${k.id}/`, true));

  /** Tous les kits (dernières versions) dans un seul ZIP : un dossier par kit, réimportable d'un coup. */
  K.versZipTous = async function (kits) {
    const sortie = {};
    const lignes = ['# Kits de l’Atelier de Blocs', '', `Exportés le ${new Date().toLocaleDateString('fr-FR')}. Un dossier par kit ; chacun contient son \`kit-atelier.json\` (réimport dans l’Atelier : Kits → Importer un kit) et ses fichiers (README.md, PROMPT.md, KIT.md, outils, modèles…).`, '', '| Dossier | Kit | Version | Fichiers |', '| --- | --- | --- | --- |'];
    for (const k of kits) {
      const contenu = await K.contenuZip(k, `${k.id}/`, true);
      Object.assign(sortie, contenu);
      lignes.push(`| \`${k.id}/\` | ${k.nom} | ${k.version} | ${Object.keys(contenu).length} |`);
    }
    sortie['LISEZMOI.md'] = lignes.join('\n') + '\n';
    return AB.zip(sortie);
  };

  /** Importe un ZIP qui contient un ou plusieurs kits (un dossier par kit avec son kit-atelier.json). Renvoie la liste des kits. */
  K.importerZipTous = async function (blob, nomFichier) {
    const { fichiers } = await AB.fichiers.lireZip(blob);
    const dossiers = Object.keys(fichiers).filter(c => /^[^/]+\/kit-atelier\.json$/.test(c)).map(c => c.split('/')[0]);
    if (fichiers['kit-atelier.json'] || !dossiers.length) return [await K.importerZip(blob, nomFichier)];
    const kits = [];
    for (const d of dossiers) {
      const sous = {};
      Object.entries(fichiers).forEach(([c, o]) => { if (c.startsWith(d + '/')) sous[c] = o; });
      kits.push(await K.importerZip(AB.zip(sous), d + '.zip'));
    }
    return kits;
  };

  /** Importe un ZIP de kit : celui de l'Atelier (kit-atelier.json) ou n'importe quel dossier de documents
      (le nom vient du ZIP, la référence de KIT.md ou README.md). Renvoie le kit enregistré. */
  K.importerZip = async function (blob, nomFichier, remplacer) {
    const { fichiers, racine } = await AB.fichiers.lireZip(blob);
    const chemins = Object.keys(fichiers);
    if (!chemins.length) throw new Error('Le ZIP est vide.');
    const lire = c => AB.fichiers.decoder(fichiers[c]);
    let def;
    if (fichiers['kit-atelier.json']) {
      def = JSON.parse(lire('kit-atelier.json'));
    } else {
      // Nom du dossier : « techview-app-kit-1.8 » → kit techview-app-kit, version 1.8.0
      const dossier = racine || String(nomFichier || 'kit').replace(/\.zip$/i, '');
      const mv = /^(.*?)[-_ ]v?(\d+(?:\.\d+){0,2})$/.exec(dossier);
      let version = mv ? (mv[2] + '.0.0').split('.').slice(0, 3).join('.') : '1.0.0';
      const lisibles = ['PROMPT.md', 'KIT.md', 'README.md'].map(n => chemins.find(c => c.toLowerCase() === n.toLowerCase())).filter(Boolean);
      const principal = chemins.find(c => /^kit\.md$/i.test(c)) || chemins.find(c => /^readme\.md$/i.test(c)) || chemins.find(c => /^[^/]+\.md$/i.test(c));
      const texte = principal ? lire(principal) : '';
      const titre = ((/^#\s+(.+)$/m.exec(texte) || [])[1] || '').replace(/[*_`]/g, '').trim();
      const para = texte.replace(/^#.*$/gm, '').split(/\n\s*\n/).map(x => x.trim()).find(x => x && !/^[>|`-]/.test(x)) || '';
      const nom = (titre ? titre.split(/\s+[—–]\s+|\s+-\s+/)[0] : (mv ? mv[1] : dossier).replace(/[-_]+/g, ' ')).slice(0, 60).trim();
      const id = U.slug(mv ? mv[1] : dossier) || U.slug(nom) || 'kit';
      while (K.get(id, version)) version = U.bumpVersion(version, 'correctif');
      const precedent = K.dernier(id);
      def = precedent ? Object.assign(U.clone(precedent), { version }) : { id, nom, version, type: 'libre', etiquettes: ['documents'], reference: '',
        description: ((titre && titre !== nom ? titre + '. ' : '') + para.split('\n')[0]).replace(/[*`]/g, '').replace(/\s+/g, ' ').replace(/\s*:$/, '.').slice(0, 300) };
      def.journal = (def.journal || []).concat([{ version, date: new Date().toISOString().slice(0, 10), texte: `Importé de ${nomFichier || 'un ZIP'} (${chemins.length} fichiers)` }]);
      def.criteres = Object.assign({}, def.criteres, { contexte: `Les ${chemins.length} fichiers de ce kit sont joints dans son dossier. Ils font partie des consignes${lisibles.length ? ` : lis d’abord ${lisibles.map(c => `\`${c}\``).join(', puis ')}` : ''}.` });
    }
    const k = await K.enregistrer(Object.assign(def, { origine: 'importe' }));
    const proprio = K.proprio(k);
    await AB.fichiers.vider(proprio);
    for (const c of chemins) {
      if (c === 'kit-atelier.json' || /^KIT-ATELIER(-[\d.]+)?\.md$/.test(c)) continue;   // régénérés à l'export
      await AB.fichiers.ajouter(proprio, c, fichiers[c], []);
    }
    return k;
  };
})();
