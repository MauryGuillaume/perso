/* ==========================================================================
   serveur-construire.js — construire le code source d'une app web (Vite, Vue, React…)
   Utilisé par serveur.js. L'Atelier envoie les fichiers du projet (sans node_modules) ;
   ce module les écrit dans ~/.atelier-blocs/constructions/<app>/projet/, lance
   l'installation (npm, pnpm ou yarn selon le fichier de verrouillage) puis « run build »,
   et rend le dossier construit (dist/, build/…) que l'aperçu sert ensuite.
   - node_modules est gardé d'une fois sur l'autre : réinstallé seulement si package.json
     ou le fichier de verrouillage change ;
   - même code qu'à la construction précédente : le résultat est rendu tout de suite ;
   - les clés de l'Atelier (.env de serveur.js) ne sont pas transmises aux commandes.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const WINDOWS = process.platform === 'win32';
const MAX_LIGNES = 3000;
const DELAI_ETAPE = 15 * 60 * 1000;
const SORTIES = ['dist', 'build', 'out', 'www'];

module.exports = function (dossierBase) {
  const travaux = new Map();   // id → travail
  const parCle = new Map();    // cle d'app → id du travail en cours

  const empreinte = parts => { const h = crypto.createHash('sha256'); parts.forEach(p => { h.update(p); h.update('\0'); }); return h.digest('hex'); };

  /** Variables passées aux commandes : celles de la machine, sans les secrets de l'Atelier. */
  function environnement() {
    const env = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (/API_KEY|SECRET|PASSWORD|JETON|TOKEN|^STATS_|^AB_/i.test(k)) continue;
      env[k] = v;
    }
    delete env.NODE_ENV;   // NODE_ENV=production empêcherait d'installer vite (devDependencies)
    return Object.assign(env, { BROWSER: 'none', FORCE_COLOR: '0', NO_COLOR: '1', npm_config_fund: 'false', npm_config_audit: 'false', npm_config_update_notifier: 'false' });
  }

  const existe = c => { try { fs.accessSync(c); return true; } catch (e) { return false; } };
  const disponible = cmd => { try { return spawnSync(cmd, ['--version'], { shell: WINDOWS, timeout: 15000 }).status === 0; } catch (e) { return false; } };

  /** Vide le dossier du projet en gardant les node_modules (l'installation reste valable). */
  function vider(dossier) {
    if (!existe(dossier)) return;
    for (const n of fs.readdirSync(dossier)) {
      if (n === 'node_modules') continue;
      const c = path.join(dossier, n);
      if (fs.lstatSync(c).isDirectory()) { vider(c); if (!fs.readdirSync(c).length) fs.rmdirSync(c); }
      else fs.unlinkSync(c);
    }
  }

  function lireDossier(racine) {
    const out = {};
    (function lire(d, rel) {
      for (const n of fs.readdirSync(d)) {
        const c = path.join(d, n), r = rel ? rel + '/' + n : n;
        const st = fs.statSync(c);
        if (st.isDirectory()) lire(c, r); else out[r] = fs.readFileSync(c);
      }
    })(racine, '');
    return out;
  }

  /** Dossier construit : outDir de vite.config s'il est donné, sinon dist/, build/… celui qui a un index.html. */
  function trouverSortie(projet) {
    const noms = [];
    for (const f of ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.mts']) {
      if (!existe(path.join(projet, f))) continue;
      const m = /outDir\s*:\s*['"`]([^'"`]+)['"`]/.exec(fs.readFileSync(path.join(projet, f), 'utf8'));
      if (m) noms.push(m[1]);
    }
    for (const n of noms.concat(SORTIES)) {
      const d = path.resolve(projet, n);
      if (d.startsWith(projet) && existe(path.join(d, 'index.html'))) return d;
    }
    // Dernier recours : un index.html récent un niveau plus bas (ex. dist/<nom>/browser/ pour Angular)
    for (const n of SORTIES) {
      const d = path.join(projet, n);
      if (!existe(d)) continue;
      const sous = fs.readdirSync(d).map(x => path.join(d, x)).filter(x => existe(path.join(x, 'index.html')));
      if (sous.length) return sous[0];
    }
    return null;
  }

  const SANS_VERROU = ['npm', ['install', '--no-package-lock', '--include=dev', '--no-audit', '--no-fund']];

  /** package-lock.json fait dans un autre dossier (monorepo pnpm, liens « ../ ») : inutilisable seul. */
  function verrouHorsProjet(projet) {
    try {
      const v = JSON.parse(fs.readFileSync(path.join(projet, 'package-lock.json'), 'utf8'));
      return Object.entries(v.packages || {}).some(([k, x]) => k.startsWith('../') || (x && x.link && String(x.resolved || '').startsWith('../')));
    } catch (e) { return true; }
  }

  function commandes(projet, pkg, t) {
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    let gest = 'npm';
    if (existe(path.join(projet, 'pnpm-lock.yaml')) && disponible('pnpm')) gest = 'pnpm';
    else if (existe(path.join(projet, 'yarn.lock')) && disponible('yarn')) gest = 'yarn';
    let installer = [gest, ['install']];
    if (gest === 'npm') {
      if (!existe(path.join(projet, 'package-lock.json'))) installer = ['npm', ['install', '--include=dev', '--no-audit', '--no-fund']];
      else if (verrouHorsProjet(projet)) { t.noter('package-lock.json renvoie hors du projet (monorepo) : installation sans lui.'); installer = SANS_VERROU; }
      else installer = ['npm', ['ci', '--include=dev', '--no-audit', '--no-fund']];
    }
    const construire = pkg.scripts && pkg.scripts.build ? [gest, ['run', 'build']] : deps.vite ? ['npx', ['vite', 'build']] : null;
    return { gest, installer, construire };
  }

  function executer(t, [cmd, args], cwd) {
    return new Promise((ok, ko) => {
      t.noter(`$ ${cmd} ${args.join(' ')}`);
      let p;
      try { p = spawn(cmd, args, { cwd, env: environnement(), shell: WINDOWS, windowsHide: true }); }
      catch (e) { return ko(e); }
      t.processus = p;
      const minuteur = setTimeout(() => { t.noter(`Arrêt : plus de ${DELAI_ETAPE / 60000} minutes.`); p.kill(); }, DELAI_ETAPE);
      let reste = '';
      const lire = b => {
        const txt = reste + b.toString('utf8').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r(?!\n)/g, '\n');
        const lignes = txt.split(/\r?\n/);
        reste = lignes.pop();
        lignes.forEach(l => { if (l.trim()) t.noter(l); });
      };
      p.stdout.on('data', lire);
      p.stderr.on('data', lire);
      p.on('error', e => { clearTimeout(minuteur); ko(e.code === 'ENOENT' ? new Error(`${cmd} est introuvable sur cette machine : installe Node.js (avec npm) depuis https://nodejs.org.`) : e); });
      p.on('close', code => { clearTimeout(minuteur); t.processus = null; if (reste.trim()) t.noter(reste); code === 0 ? ok() : ko(new Error(`${cmd} ${args[0]} a échoué (code ${code}).`)); });
    });
  }

  async function derouler(t, fichiers, dossier) {
    const base = path.join(dossierBase, t.cle);
    const racine = path.join(base, 'projet');
    const projet = path.resolve(racine, dossier || '.');
    const fichierEtat = path.join(base, 'etat.json');
    let avant = {};
    try { avant = JSON.parse(fs.readFileSync(fichierEtat, 'utf8')); } catch (e) { /* première fois */ }

    const noms = Object.keys(fichiers).sort();
    const source = empreinte(noms.flatMap(n => [n, fichiers[n]]));
    if (avant.source === source && avant.sortie && existe(path.join(avant.sortie, 'index.html'))) {
      t.etape = 'Déjà construite';
      t.noter('Même code qu’à la construction précédente : rien à refaire.');
      t.sortie = avant.sortie;
      return;
    }

    t.etape = 'Copie du projet';
    fs.mkdirSync(racine, { recursive: true });
    vider(racine);
    for (const n of noms) {
      const c = path.join(racine, n);
      fs.mkdirSync(path.dirname(c), { recursive: true });
      fs.writeFileSync(c, fichiers[n]);
    }
    t.noter(`${noms.length} fichier(s) copiés dans ${racine}`);

    let pkg;
    try { pkg = JSON.parse(fs.readFileSync(path.join(projet, 'package.json'), 'utf8')); }
    catch (e) { throw new Error('package.json introuvable ou illisible dans ' + (dossier || 'le projet')); }
    const cmd = commandes(projet, pkg, t);
    if (!cmd.construire) throw new Error('Le projet n’a pas de script « build » dans package.json : l’Atelier ne sait pas comment le construire.');

    const verrous = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].map(f => path.join(projet, f)).filter(existe).map(f => fs.readFileSync(f));
    const deps = empreinte([cmd.gest].concat(verrous));
    if (avant.deps === deps && existe(path.join(projet, 'node_modules'))) t.noter('Dépendances inchangées : installation sautée.');
    else {
      t.etape = 'Installation des dépendances';
      try { await executer(t, cmd.installer, projet); }
      catch (e) {
        // package-lock.json pas à jour : npm ci refuse, npm install s'en sort
        if (cmd.installer[1][0] !== 'ci') throw e;
        t.noter('npm ci a échoué : nouvel essai avec npm install.');
        await executer(t, SANS_VERROU, projet);
      }
    }

    t.etape = 'Construction';
    try { await executer(t, cmd.construire, projet); }
    catch (e) {
      // Outil introuvable (« vite: not found ») : dépendances incomplètes, on réinstalle sans le fichier de verrouillage
      if (cmd.gest !== 'npm' || !t.lignes.slice(-15).some(l => /not found|introuvable|n’est pas reconnu|is not recognized|Cannot find (module|package)/i.test(l))) throw e;
      t.etape = 'Réinstallation des dépendances';
      t.noter('Un outil manque après l’installation : réinstallation complète sans package-lock.json.');
      await executer(t, SANS_VERROU, projet);
      t.etape = 'Construction';
      await executer(t, cmd.construire, projet);
    }
    const sortie = trouverSortie(projet);
    if (!sortie) throw new Error('La construction a réussi mais aucun dossier avec index.html n’a été trouvé (dist/, build/…).');
    t.sortie = sortie;
    fs.writeFileSync(fichierEtat, JSON.stringify({ source, deps, sortie, date: new Date().toISOString() }, null, 2));
  }

  return {
    /** Démarre (ou rejoint) la construction d'un projet. corps = { cle, dossier, fichiers: { chemin: base64 } } */
    demarrer(corps) {
      const cle = String(corps.cle || 'app').replace(/[^\w-]/g, '').slice(0, 60) || 'app';
      const enCours = travaux.get(parCle.get(cle));
      if (enCours && enCours.etat === 'en-cours') return enCours.id;
      const dossier = path.posix.normalize('/' + String(corps.dossier || '')).slice(1).replace(/\/$/, '');
      if (dossier.startsWith('..')) throw new Error('Dossier du projet invalide.');
      const fichiers = {};
      for (const [chemin, b64] of Object.entries(corps.fichiers || {})) {
        const propre = path.posix.normalize('/' + String(chemin)).slice(1);
        if (!propre || propre.startsWith('..') || /(^|\/)node_modules(\/|$)/.test(propre)) continue;
        fichiers[propre] = Buffer.from(String(b64), 'base64');
      }
      const id = crypto.randomBytes(8).toString('hex');
      const t = { id, cle, etat: 'en-cours', etape: 'Préparation', lignes: [], decalage: 0, debut: Date.now(), erreur: null, sortie: null };
      t.noter = l => { t.lignes.push(l.slice(0, 2000)); if (t.lignes.length > MAX_LIGNES) { t.lignes.shift(); t.decalage++; } };
      travaux.set(id, t); parCle.set(cle, id);
      derouler(t, fichiers, dossier).then(
        () => { t.etat = 'ok'; t.etape = 'Terminée'; t.noter(`Construite en ${Math.round((Date.now() - t.debut) / 1000)} s : ${t.sortie}`); },
        e => { t.etat = 'echec'; t.erreur = e.message; t.noter('Échec : ' + e.message); });
      // Les vieux travaux terminés sont oubliés (leurs fichiers restent sur le disque)
      for (const [k, x] of travaux) if (x.etat !== 'en-cours' && Date.now() - x.debut > 3600000) travaux.delete(k);
      return id;
    },
    /** État d'un travail ; lignes du journal à partir de « depuis ». */
    etat(id, depuis) {
      const t = travaux.get(id);
      if (!t) return null;
      const n = Math.max(0, (Number(depuis) || 0) - t.decalage);
      return { etat: t.etat, etape: t.etape, erreur: t.erreur, lignes: t.lignes.slice(n), suite: t.decalage + t.lignes.length, secondes: Math.round((Date.now() - t.debut) / 1000) };
    },
    /** Fichiers construits (base64). */
    fichiers(id) {
      const t = travaux.get(id);
      if (!t || t.etat !== 'ok') return null;
      const f = lireDossier(t.sortie), out = {};
      for (const c of Object.keys(f)) out[c] = f[c].toString('base64');
      return out;
    }
  };
};
