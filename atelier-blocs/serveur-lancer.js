/* ==========================================================================
   serveur-lancer.js — lancer le serveur Node d'une app pour l'aperçu (kit « App complète »,
   Express, NestJS compilé…). Utilisé par serveur.js.
   L'Atelier envoie les fichiers du projet (sans node_modules). Ce module :
   1. les copie dans ~/.atelier-blocs/apps-lancees/<app>/projet/ (node_modules gardé d'une fois sur l'autre) ;
   2. installe les dépendances si package.json ou le verrou a changé ;
   3. si l'app a besoin de PostgreSQL : lui donne une base à elle (app_<nom>) sur le PostgreSQL de l'Atelier,
      installé une seule fois dans ~/.atelier-blocs/postgres/ (paquet npm embedded-postgres), ou sur ton
      propre serveur si AB_PG_URL est donné (postgres://utilisateur:motdepasse@localhost:5432) ;
   4. lance l'app (npm start, ou node <fichier>) sur un port libre, avec des variables de développement
      (PORT, DATABASE_URL, APP_ENV=developpement…) ; ses secrets de développement sont tirés au hasard et gardés ;
   5. attend qu'elle réponde. L'aperçu (port 8788) sert alors l'interface et relaie /api vers elle.
   Une app déjà lancée avec le même code n'est pas relancée. Les clés de l'Atelier ne lui sont pas transmises.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const pg = require('./serveur-pg');

const WINDOWS = process.platform === 'win32';
const MAX_LIGNES = 3000;
const PG_VERSION = '18.3.0-beta.16';
const PG_PORT = Number(process.env.AB_PG_PORT) || 54329;
const DEPS_BASE = ['pg', 'postgres', '@prisma/client', 'knex', 'sequelize', 'typeorm', 'pg-promise', 'drizzle-orm', '@mikro-orm/postgresql'];

module.exports = function (dossierBase, adresseApercu) {
  const lancements = new Map();   // cle → lancement
  const parId = new Map();
  let postgres = null;            // promesse : { url } du serveur PostgreSQL de l'Atelier

  const existe = c => { try { fs.accessSync(c); return true; } catch (e) { return false; } };
  const empreinte = parts => { const h = crypto.createHash('sha256'); parts.forEach(p => { h.update(p); h.update('\0'); }); return h.digest('hex'); };

  function environnementPropre() {
    const env = {};
    for (const [k, v] of Object.entries(process.env)) if (!/API_KEY|SECRET|PASSWORD|JETON|TOKEN|^STATS_|^AB_|^PORT$|^DATABASE_URL$/i.test(k)) env[k] = v;
    delete env.NODE_ENV;
    return Object.assign(env, { BROWSER: 'none', FORCE_COLOR: '0', NO_COLOR: '1', npm_config_fund: 'false', npm_config_audit: 'false', npm_config_update_notifier: 'false' });
  }

  function vider(dossier) {
    if (!existe(dossier)) return;
    for (const n of fs.readdirSync(dossier)) {
      if (n === 'node_modules') continue;
      const c = path.join(dossier, n);
      if (fs.lstatSync(c).isDirectory()) { vider(c); if (!fs.readdirSync(c).length) fs.rmdirSync(c); }
      else fs.unlinkSync(c);
    }
  }

  function executer(l, [cmd, args], cwd, env) {
    return new Promise((ok, ko) => {
      l.noter(`$ ${cmd} ${args.join(' ')}`);
      const p = spawn(cmd, args, { cwd, env: env || environnementPropre(), shell: WINDOWS, windowsHide: true });
      brancherSortie(l, p);
      p.on('error', e => ko(e.code === 'ENOENT' ? new Error(`${cmd} est introuvable sur cette machine : installe Node.js (avec npm) depuis https://nodejs.org.`) : e));
      p.on('close', code => code === 0 ? ok() : ko(new Error(`${cmd} ${args[0]} a échoué (code ${code}).`)));
    });
  }

  function brancherSortie(l, p) {
    let reste = '';
    const lire = b => {
      const lignes = (reste + b.toString('utf8').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r(?!\n)/g, '\n')).split(/\r?\n/);
      reste = lignes.pop();
      lignes.forEach(x => { if (x.trim()) l.noter(x); });
    };
    p.stdout.on('data', lire); p.stderr.on('data', lire);
    p.on('close', () => { if (reste.trim()) l.noter(reste); reste = ''; });
  }

  const portLibre = () => new Promise((ok, ko) => { const s = net.createServer(); s.unref(); s.on('error', ko); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
  const repond = port => new Promise(ok => { const c = net.connect({ host: '127.0.0.1', port }); c.once('connect', () => { c.destroy(); ok(true); }); c.once('error', () => ok(false)); });

  /** Valeurs d'un fichier .env (KEY=valeur). */
  function lireEnv(texte) {
    const out = {};
    String(texte || '').split(/\r?\n/).forEach(l => {
      const m = /^\s*(?:export\s+)?([A-Za-z_][\w.]*)\s*=\s*(.*?)\s*$/.exec(l);
      if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    });
    return out;
  }

  /* ---------- PostgreSQL de l'Atelier ---------- */

  async function demarrerPostgres(l) {
    if (process.env.AB_PG_URL) { l.noter('Base sur ton serveur PostgreSQL (AB_PG_URL).'); return { url: process.env.AB_PG_URL.replace(/(@[^/]+)\/.*$/, '$1') }; }
    const dossier = path.join(path.dirname(dossierBase), 'postgres');
    fs.mkdirSync(dossier, { recursive: true });
    const fichierMdp = path.join(dossier, 'motdepasse');
    if (!existe(fichierMdp)) fs.writeFileSync(fichierMdp, crypto.randomBytes(18).toString('base64url'), { mode: 0o600 });
    const mdp = fs.readFileSync(fichierMdp, 'utf8').trim();
    const url = `postgres://atelier:${mdp}@127.0.0.1:${PG_PORT}`;
    // Déjà en route (lancé par une session précédente du serveur local) ?
    try { await pg.avec(pg.lireChaine(url + '/postgres'), c => c.simple('select 1')); l.noter(`PostgreSQL de l’Atelier déjà en route (port ${PG_PORT}).`); return { url }; }
    catch (e) { /* à démarrer */ }
    const module = path.join(dossier, 'node_modules', 'embedded-postgres', 'dist', 'index.js');
    if (!existe(module)) {
      l.etape = 'Installation de PostgreSQL (une seule fois)';
      if (!existe(path.join(dossier, 'package.json'))) fs.writeFileSync(path.join(dossier, 'package.json'), JSON.stringify({ name: 'atelier-postgres', private: true }, null, 2));
      await executer(l, ['npm', ['install', `embedded-postgres@${PG_VERSION}`, '--no-audit', '--no-fund']], dossier);
    }
    l.etape = 'Démarrage de PostgreSQL';
    const { default: EmbeddedPostgres } = await import(pathToFileURL(module).href);
    const donnees = path.join(dossier, 'donnees');
    const instance = new EmbeddedPostgres({
      databaseDir: donnees, port: PG_PORT, user: 'atelier', password: mdp, persistent: true,
      initdbFlags: ['--encoding=UTF8', '--locale=C', '--lc-messages=C'],   // locale présente partout (Mac, Windows, Linux minimal)
      // Postgres refuse de tourner en root (conteneurs Linux seulement) : un utilisateur « postgres » est alors créé
      createPostgresUser: typeof process.getuid === 'function' && process.getuid() === 0,
      onLog: m => { const t = String(m).trim(); if (t && !/^(\d{4}-\d\d-\d\d.*LOG:|waiting for server|done|server started)/.test(t)) l.noter('[postgres] ' + t.slice(0, 300)); },
      onError: m => l.noter('[postgres] ' + String(m && m.message || m).trim().slice(0, 300))
    });
    const echec = e => new Error('PostgreSQL : ' + (e && e.message || e));
    if (!existe(path.join(donnees, 'PG_VERSION'))) {
      fs.rmSync(donnees, { recursive: true, force: true });   // reste d'une création interrompue
      l.noter('Création des données PostgreSQL dans ' + donnees);
      await instance.initialise().catch(e => { throw echec(e); });
    }
    await instance.start().catch(e => { throw echec(e); });
    l.noter(`PostgreSQL de l’Atelier prêt (port ${PG_PORT}, données dans ${donnees}).`);
    const arreter = () => { instance.stop().catch(() => {}); };
    process.once('exit', arreter);
    return { url, instance };
  }

  async function baseDeLApp(l, cle) {
    if (!postgres) postgres = demarrerPostgres(l).catch(e => { postgres = null; throw e; });
    const { url } = await postgres;
    const nom = 'app_' + cle.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
    await pg.avec(pg.lireChaine(url + '/postgres'), async c => {
      const r = await c.requete('select 1 from pg_database where datname = $1', [nom]);
      if (!(r.lignes || r.rows || []).length) { await c.simple(`create database "${nom}"`); l.noter(`Base « ${nom} » créée.`); }
      else l.noter(`Base « ${nom} » réutilisée (tes données de test sont gardées).`);
    });
    return `${url}/${nom}`;
  }

  /* ---------- Lancement ---------- */

  function arreterProcessus(x) {
    if (!x || !x.processus || x.processus.exitCode !== null) return Promise.resolve();
    const p = x.processus;
    return new Promise(ok => {
      p.once('close', ok);
      if (WINDOWS) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F']); else p.kill('SIGTERM');
      setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà arrêté */ } ok(); }, 6000).unref();
    });
  }

  function commandeLancement(projet, pkg) {
    const start = pkg.scripts && pkg.scripts.start;
    const direct = start && /^\s*node\s+([\w./-]+\.(c|m)?js)\s*$/.exec(start);
    if (direct) return [process.execPath, [direct[1]]];   // node direct : s'arrête proprement (pas de npm au milieu)
    if (start) return ['npm', ['start']];
    for (const f of [pkg.main, 'serveur.js', 'server.js', 'index.js', 'app.js', 'dist/main.js'].filter(Boolean)) if (existe(path.join(projet, f))) return [process.execPath, [f]];
    return null;
  }

  async function derouler(l, fichiers) {
    const base = path.join(dossierBase, l.cle);
    const projet = path.join(base, 'projet');
    const fichierEtat = path.join(base, 'etat.json');
    let avant = {};
    try { avant = JSON.parse(fs.readFileSync(fichierEtat, 'utf8')); } catch (e) { /* première fois */ }
    const noms = Object.keys(fichiers).sort();
    const source = empreinte(noms.flatMap(n => [n, fichiers[n]]));

    l.etape = 'Copie du projet';
    fs.mkdirSync(projet, { recursive: true });
    vider(projet);
    for (const n of noms) { const c = path.join(projet, n); fs.mkdirSync(path.dirname(c), { recursive: true }); fs.writeFileSync(c, fichiers[n]); }
    l.noter(`${noms.length} fichier(s) copiés dans ${projet}`);

    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(path.join(projet, 'package.json'), 'utf8')); } catch (e) { /* app sans package.json */ }
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    const verrous = ['package.json', 'package-lock.json'].map(f => path.join(projet, f)).filter(existe).map(f => fs.readFileSync(f));
    const empDeps = empreinte(verrous);
    if (Object.keys(pkg.dependencies || {}).length) {
      if (avant.deps === empDeps && existe(path.join(projet, 'node_modules'))) l.noter('Dépendances inchangées : installation sautée.');
      else {
        l.etape = 'Installation des dépendances';
        const verrou = existe(path.join(projet, 'package-lock.json'));
        try { await executer(l, ['npm', [verrou ? 'ci' : 'install', '--include=dev', '--no-audit', '--no-fund']], projet); }
        catch (e) { if (!verrou) throw e; l.noter('npm ci a échoué : nouvel essai avec npm install.'); await executer(l, ['npm', ['install', '--no-package-lock', '--include=dev', '--no-audit', '--no-fund']], projet); }
      }
    }

    // Variables : celles d'exemple, puis les réglages de développement de l'Atelier
    const exemple = lireEnv(existe(path.join(projet, '.env.example')) ? fs.readFileSync(path.join(projet, '.env.example'), 'utf8') : '');
    const connues = new Set(Object.keys(exemple));
    const vars = {};
    for (const [k, v] of Object.entries(exemple)) if (v !== '') vars[k] = v;
    const secrets = avant.secrets || {};
    for (const k of connues) if (/SECRET$|^JETON_SECRET$|^SESSION_SECRET$|^JWT_[A-Z_]*SECRET$/.test(k) && !vars[k]) vars[k] = secrets[k] = secrets[k] || crypto.randomBytes(32).toString('hex');
    const port = await portLibre();
    Object.assign(vars, { PORT: String(port), NODE_ENV: 'development' });
    const reglages = { APP_ENV: 'developpement', APP_URL: adresseApercu, ORIGINES: adresseApercu, DB_SSL: '0', DB_CREER_BASE: '0', ADMIN_DEFAUT: '1', TACHE_QUOTIDIENNE: '0', INSCRIPTION_OUVERTE: '1' };
    for (const [k, v] of Object.entries(reglages)) if (connues.has(k)) vars[k] = v;
    if (DEPS_BASE.some(d => deps[d]) || connues.has('DATABASE_URL')) {
      l.etape = 'Base de données';
      vars.DATABASE_URL = await baseDeLApp(l, l.cle);
    }

    const cmd = commandeLancement(projet, pkg);
    if (!cmd) throw new Error('L’Atelier ne sait pas lancer ce serveur : ajoute un script « start » dans package.json (ex. "start": "node serveur.js").');
    l.etape = 'Démarrage de l’app';
    l.noter(`$ ${cmd[0] === process.execPath ? 'node' : cmd[0]} ${cmd[1].join(' ')}   (port ${port}${vars.DATABASE_URL ? ', base ' + vars.DATABASE_URL.split('/').pop() : ''})`);
    const p = spawn(cmd[0], cmd[1], { cwd: projet, env: Object.assign(environnementPropre(), vars), shell: WINDOWS && cmd[0] === 'npm', windowsHide: true });
    l.processus = p;
    brancherSortie(l, p);
    let sortie = null;
    p.on('close', code => { sortie = code; if (l.etat === 'pret') { l.etat = 'arrete'; l.noter(`L’app s’est arrêtée (code ${code}).`); } });
    p.on('error', e => { sortie = -1; l.noter('Lancement impossible : ' + e.message); });
    const fin = Date.now() + 90000;
    while (Date.now() < fin) {
      if (sortie !== null) throw new Error(`L’app s’est arrêtée au démarrage (code ${sortie}). Regarde les dernières lignes du journal.`);
      if (await repond(port)) break;
      await new Promise(ok => setTimeout(ok, 400));
    }
    if (!(await repond(port))) { await arreterProcessus(l); throw new Error('L’app ne répond pas après 90 secondes.'); }
    l.port = port;
    l.source = source;
    fs.writeFileSync(fichierEtat, JSON.stringify({ deps: empDeps, secrets, date: new Date().toISOString() }, null, 2), { mode: 0o600 });
  }

  return {
    /** Lance (ou relance) l'app. corps = { cle, fichiers: { chemin: base64 } } */
    demarrer(corps) {
      const cle = String(corps.cle || 'app').replace(/[^\w-]/g, '').slice(0, 60) || 'app';
      const fichiers = {};
      for (const [chemin, b64] of Object.entries(corps.fichiers || {})) {
        const propre = path.posix.normalize('/' + String(chemin)).slice(1);
        if (!propre || propre.startsWith('..') || /(^|\/)node_modules(\/|$)/.test(propre)) continue;
        fichiers[propre] = Buffer.from(String(b64), 'base64');
      }
      const avant = lancements.get(cle);
      const source = empreinte(Object.keys(fichiers).sort().flatMap(n => [n, fichiers[n]]));
      if (avant && (avant.etat === 'en-cours' || (avant.etat === 'pret' && avant.source === source))) return avant.id;
      const id = crypto.randomBytes(8).toString('hex');
      const l = { id, cle, etat: 'en-cours', etape: 'Préparation', lignes: [], decalage: 0, debut: Date.now(), erreur: null, port: null };
      l.noter = x => { l.lignes.push(String(x).slice(0, 2000)); if (l.lignes.length > MAX_LIGNES) { l.lignes.shift(); l.decalage++; } };
      lancements.set(cle, l); parId.set(id, l);
      (async () => {
        if (avant) { l.noter('Arrêt de la version précédente de l’app…'); await arreterProcessus(avant); parId.delete(avant.id); }
        await derouler(l, fichiers);
      })().then(
        () => { l.etat = 'pret'; l.etape = 'Prête'; l.noter(`App lancée en ${Math.round((Date.now() - l.debut) / 1000)} s sur le port ${l.port} : l’aperçu relaie /api vers elle.`); },
        e => { l.etat = 'echec'; l.erreur = e && e.message || String(e); l.noter('Échec : ' + l.erreur); arreterProcessus(l); });
      return id;
    },
    etat(id, depuis) {
      const l = parId.get(id);
      if (!l) return null;
      const n = Math.max(0, (Number(depuis) || 0) - l.decalage);
      return { etat: l.etat, etape: l.etape, erreur: l.erreur, port: l.port, lignes: l.lignes.slice(n), suite: l.decalage + l.lignes.length, secondes: Math.round((Date.now() - l.debut) / 1000) };
    },
    /** Le port est-il celui d'une app lancée ici ? (le relais de l'aperçu ne va que vers elles) */
    portConnu: port => [...lancements.values()].some(l => l.etat === 'pret' && l.port === port),
    arreterTout() { for (const l of lancements.values()) arreterProcessus(l); }
  };
};
