/* ==========================================================================
   ab-blocs.js — registres des BLOCS et des KITS
   - Un BLOC est une brique technique (écrans, réglages, données, fonctions
     serveur) : connexion, paiement, formulaire…
   - Un KIT fixe des règles communes à plusieurs apps : charte graphique,
     cybersécurité, règles d'affichage… (types décrits dans ab-kits.js).
   Les deux sont versionnés de la même façon : une ligne par version, clé
   « id@version ». Les fichiers bloc-*.js et kit-*.js appellent
   AB.blocs.declarer(...) ou AB.kits.declarer(...) ; ils sont installés au démarrage.
   ========================================================================== */
(function () {
  const U = AB.u;

  /** Fabrique un registre versionné pour une table de la base (blocs ou kits). */
  AB.registre = function ({ store, nom, normaliser, valider, trier }) {
    const R = { fournis: [], toutes: [] };

    R.declarer = def => { R.fournis.push(def); };

    R.charger = async () => { R.toutes = (await AB.db.list(store)).map(normaliser); };

    /** Installe les éléments fournis qui ne sont pas encore en base. */
    R.installerFournis = async () => {
      for (const def of R.fournis) {
        const x = normaliser(def);
        if (!(await AB.db.get(store, x.cle))) await AB.db.put(store, Object.assign(x, { origine: 'fourni', modifie: U.now() }));
      }
      await R.charger();
    };

    R.enregistrer = async def => {
      const x = normaliser(def);
      const err = valider(x);
      if (err.length) throw new Error(err.join('\n'));
      x.modifie = U.now();
      await AB.db.put(store, x);
      await R.charger();
      return x;
    };

    R.supprimer = async (id, version) => { await AB.db.remove(store, `${id}@${version}`); await R.charger(); };

    /** Toutes les versions d'un élément, la plus récente d'abord. */
    R.versions = id => R.toutes.filter(x => x.id === id).sort((a, b) => U.cmpVersion(b.version, a.version));
    R.get = (id, version) => R.toutes.find(x => x.id === id && x.version === version) || null;
    R.dernier = id => R.versions(id)[0] || null;

    /** La dernière version de chaque élément. */
    R.derniers = () => [...new Set(R.toutes.map(x => x.id))].map(R.dernier).sort(trier);

    /** Texte d'un fichier <nom>-<id>.js, lisible et modifiable à la main. */
    R.versFichier = x => {
      const propre = U.clone(x);
      delete propre.cle; delete propre.origine; delete propre.modifie;
      return `/* ${nom === 'blocs' ? 'Bloc' : 'Kit'} « ${x.nom} » v${x.version} — exporté depuis l'Atelier de Blocs */\nAB.${nom}.declarer(${JSON.stringify(propre, null, 2)});\n`;
    };

    /** Lit un fichier (.json, ou .js qui appelle AB.blocs/kits.declarer). */
    R.depuisFichier = texte => {
      const t = texte.trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        const d = JSON.parse(t);
        return Array.isArray(d) ? d : [d];
      }
      // Fichier .js écrit à la main : on l'exécute avec un faux « AB » qui ne fait
      // que collecter les déclarations. N'importez que vos propres fichiers.
      const trouves = [];
      const ignorer = { declarer: () => {} };
      const faux = { blocs: ignorer, kits: ignorer };
      faux[nom] = { declarer: d => trouves.push(d) };
      new Function('AB', t)(faux);
      return trouves;
    };

    return R;
  };

  /* ======================= Blocs ======================= */

  const TYPES_REGLAGE = {
    'texte': 'Texte court', 'texte-long': 'Texte long', 'nombre': 'Nombre', 'couleur': 'Couleur',
    'booleen': 'Oui / non', 'choix': 'Choix dans une liste', 'liste': 'Liste (une ligne par élément)'
  };
  /** Types de colonne neutres, traduits par le générateur de backend. */
  const TYPES_COLONNE = ['uuid', 'texte', 'texte-long', 'entier', 'decimal', 'booleen', 'date', 'date-heure', 'json'];
  /** Règles d'accès d'une table (traduites en politiques RLS). */
  const ACCES_TABLE = {
    'serveur': 'Serveur uniquement (aucun accès depuis l’app)',
    'proprietaire': 'Chaque utilisateur lit et écrit ses lignes (colonne utilisateur)',
    'lecture-proprietaire': 'Chaque utilisateur lit ses lignes ; écriture par le serveur',
    'insertion-publique': 'Tout le monde peut ajouter ; lecture par le serveur',
    'lecture-publique': 'Tout le monde peut lire ; écriture par le serveur'
  };

  function normaliserBloc(def) {
    const b = Object.assign({
      id: '', nom: '', version: '1.0.0', categorie: 'Divers', icone: 'mdi-puzzle-outline', description: '',
      dependances: [], donneesPersonnelles: false, init: '', panneau: '',
      reglages: [], env: [], tables: [], serveur: [], ecrans: [], journal: []
    }, U.clone(def));
    b.ecrans.forEach(e => { e.html = e.html || ''; e.css = e.css || ''; e.js = e.js || ''; });
    b.tables.forEach(t => { t.acces = t.acces || 'serveur'; });
    b.cle = `${b.id}@${b.version}`;
    return b;
  }

  /** Vérifie un bloc. Renvoie la liste des problèmes (vide = valide). */
  function validerBloc(b) {
    const err = verifierBase(b);
    const doublons = (liste, champ, quoi) => {
      const vus = new Set();
      liste.forEach(x => {
        if (!x[champ]) err.push(`${quoi} : un élément n’a pas de ${champ}.`);
        else if (vus.has(x[champ])) err.push(`${quoi} : « ${x[champ]} » apparaît deux fois.`);
        vus.add(x[champ]);
      });
    };
    doublons(b.reglages, 'cle', 'Réglages');
    doublons(b.env, 'cle', 'Variables d’environnement');
    doublons(b.tables, 'nom', 'Tables');
    doublons(b.serveur, 'nom', 'Fonctions serveur');
    doublons(b.ecrans, 'id', 'Écrans');
    b.env.forEach(v => {
      if (v.cle && !/^[A-Z][A-Z0-9_]*$/.test(v.cle)) err.push(`Variable ${v.cle} : majuscules, chiffres et _ uniquement.`);
      // Règle de sécurité : un secret n'a jamais de valeur dans un bloc.
      if (v.secret && (v.valeur || v.defaut)) err.push(`Variable ${v.cle} : un secret ne doit pas contenir de valeur.`);
    });
    b.tables.forEach(t => {
      if (t.nom && !/^[a-z][a-z0-9_]*$/.test(t.nom)) err.push(`Table ${t.nom} : minuscules, chiffres et _ uniquement.`);
      if (!ACCES_TABLE[t.acces]) err.push(`Table ${t.nom} : règle d’accès « ${t.acces} » inconnue.`);
      if (/proprietaire/.test(t.acces) && !(t.colonnes || []).some(c => c[0] === 'utilisateur')) err.push(`Table ${t.nom} : la règle « ${t.acces} » demande une colonne « utilisateur » (uuid).`);
      (t.colonnes || []).forEach(c => {
        if (!TYPES_COLONNE.includes(c[1])) err.push(`Table ${t.nom}, colonne ${c[0]} : type « ${c[1]} » inconnu.`);
      });
    });
    if (!b.ecrans.length) err.push('Un bloc doit avoir au moins un écran.');
    return err;
  }

  /** Contrôles communs aux blocs et aux kits. */
  function verifierBase(x) {
    const err = [];
    if (!/^[a-z0-9][a-z0-9-]*$/.test(x.id || '')) err.push('Identifiant : lettres minuscules, chiffres et tirets uniquement.');
    if (!x.nom) err.push('Le nom est obligatoire.');
    if (!/^\d+\.\d+\.\d+$/.test(x.version || '')) err.push('Version au format 1.0.0.');
    return err;
  }
  AB.verifierBase = verifierBase;

  const B = AB.blocs = AB.registre({
    store: 'blocs', nom: 'blocs', normaliser: normaliserBloc, valider: validerBloc,
    trier: (a, b) => (a.categorie + a.nom).localeCompare(b.categorie + b.nom, 'fr')
  });
  B.TYPES_REGLAGE = TYPES_REGLAGE;
  B.TYPES_COLONNE = TYPES_COLONNE;
  B.ACCES_TABLE = ACCES_TABLE;
  /** Panneaux d'administration ouverts dans l'espace d'une app (ex. « design » = Studio design).
      Une vue les enregistre : AB.panneaux.design = { nom, icone, vue(racine, app) }. */
  AB.panneaux = AB.panneaux || {};
  /** Clés des panneaux d'une app : blocs de sa composition + blocs branchés (apps existantes). */
  B.panneauxDe = function (app) {
    const ids = (app.blocs || []).map(i => i.bloc).concat(app.blocsBranches || []);
    return [...new Set(ids.map(id => (B.dernier(id) || {}).panneau).filter(k => k && AB.panneaux[k]))];
  };
  /** Blocs qui ont un panneau (ceux qu'on peut brancher sur une app existante). */
  B.avecPanneau = () => B.derniers().filter(b => b.panneau);
  B.normaliser = normaliserBloc;
  B.valider = validerBloc;

  /** Valeurs par défaut des réglages d'un bloc. */
  B.reglagesParDefaut = function (b) {
    const r = {};
    b.reglages.forEach(x => { r[x.cle] = x.defaut !== undefined ? x.defaut : ''; });
    return r;
  };

  /* ---------- Gabarits des écrans ----------
     {{cle}}                     → valeur du réglage, échappée
     {{#cle}} … {{.}} … {{/cle}} → répète pour chaque ligne d'un réglage « liste »
     {{?cle}} … {{/cle}}         → affiché seulement si le réglage est vrai / non vide */
  B.gabarit = function (texte, reglages) {
    const lignes = v => Array.isArray(v) ? v : String(v || '').split('\n').map(s => s.trim()).filter(Boolean);
    return String(texte || '')
      .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, cle, corps) =>
        lignes(reglages[cle]).map(l => corps.replace(/\{\{\.\}\}/g, U.esc(l))).join(''))
      .replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, cle, corps) => {
        const v = reglages[cle];
        return v && v !== 'false' ? corps : '';
      })
      .replace(/\{\{(\w+)\}\}/g, (m, cle) => U.esc(reglages[cle] !== undefined ? reglages[cle] : ''));
  };
})();
