/* outils/recette-app.js — recette de bout en bout d'une app du kit « App complète » (OUTIL DE DÉVELOPPEMENT)
   Kit « App complète » de l'Atelier de Blocs. Node 18+, utilise le pg de l'app (npm install d'abord).

   node outils/recette-app.js postgres://utilisateur:motdepasse@localhost:5432/postgres
     (ou la variable RECETTE_DATABASE_URL) : un serveur PostgreSQL de TEST, jamais celui de production.
   L'outil crée une base jetable « recette_xxxxxx », lance l'app dessus avec des variables de test, joue les
   scénarios (KIT.md § 13), arrête l'app et supprime la base. Rien n'est touché dans les autres bases.
   → « Conforme » (code 0) ou « Non conforme » (code 1). */
'use strict';
const path = require('path'), crypto = require('crypto'), { spawn } = require('child_process'), net = require('net');
const racine = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--') && !/^postgres/.test(a)) || '.');
const urlServeur = process.argv.slice(2).find(a => /^postgres(ql)?:\/\//.test(a)) || process.env.RECETTE_DATABASE_URL;
if (!urlServeur) { console.error('Indique un serveur PostgreSQL de test : node outils/recette-app.js postgres://…/postgres'); process.exit(2); }
let pg;
try { pg = require(require.resolve('pg', { paths: [racine] })); } catch (e) { console.error('Module pg introuvable : lance « npm install » dans l’app.'); process.exit(2); }

const nomBase = 'recette_' + crypto.randomBytes(3).toString('hex');
const bases = [nomBase];
const urlBase = (() => { const u = new URL(urlServeur); u.pathname = '/' + nomBase; return u.toString(); })();
const urlAdmin = (() => { const u = new URL(urlServeur); u.pathname = '/postgres'; return u.toString(); })();
const CLE = crypto.randomBytes(24).toString('base64url'), CODE = crypto.randomBytes(6).toString('hex');
const MDP = 'Recette-' + crypto.randomBytes(6).toString('hex');
const resultats = [];
const regle = (num, texte, ok, detail, recommande) => { resultats.push({ num, texte, ok: !!ok, detail, recommande }); };
const port = () => new Promise(ok => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });

function lancer(variables, attendreFin) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, ['serveur.js'], { cwd: racine, env: Object.assign({ PATH: process.env.PATH }, variables) });
    let sortie = '';
    p.stdout.on('data', d => { sortie += d; if (!attendreFin && /prête sur le port/.test(sortie)) resolve({ p, sortie: () => sortie }); });
    p.stderr.on('data', d => { sortie += d; });
    p.on('exit', code => resolve({ p, code, sortie: () => sortie, fini: true }));
    setTimeout(() => resolve({ p, sortie: () => sortie, delai: true }), 20000).unref();
  });
}

(async () => {
  const P = await port();
  const base = 'http://127.0.0.1:' + P;
  const ENV = { APP_ENV: 'developpement', PORT: String(P), DATABASE_URL: urlBase, DB_CREER_BASE: '1', ADMIN_API_KEY: CLE, INSTALL_CODE: CODE, ADMIN_DEFAUT: '0', REQUETES_PAR_MINUTE: '10000' };
  let cookie = '', serveur = null;
  const appel = async (methode, chemin, corps, o = {}) => {
    const h = Object.assign({ Accept: 'application/json' }, o.sansAppli ? {} : { 'X-Appli': '1' }, o.cle ? { Authorization: 'Bearer ' + o.cle } : {}, !o.cle && cookie && !o.sansCookie ? { Cookie: cookie } : {});
    if (corps !== undefined) h['Content-Type'] = o.type || 'application/json';
    const r = await fetch(base + chemin, { method: methode, headers: h, body: corps === undefined ? undefined : JSON.stringify(corps) });
    const sc = r.headers.get('set-cookie'); if (sc && o.garder !== false) cookie = sc.split(';')[0];
    const texte = await r.text(); let json = null; try { json = JSON.parse(texte); } catch (e) { /* CSV, HTML */ }
    return { statut: r.status, json: json || {}, texte, entetes: r.headers, setCookie: sc };
  };
  try {
    // 01 Refus de démarrer sans configuration
    const sans = await lancer({ APP_ENV: 'production', PORT: String(P) }, true);
    regle('01', 'Refuse de démarrer si une variable obligatoire manque, en le disant', sans.fini && sans.code !== 0 && /DATABASE_URL/.test(sans.sortie()), 'code ' + sans.code);

    // 02 Démarrage : base créée, migrations appliquées
    serveur = await lancer(ENV);
    regle('02', 'Démarre sur une base neuve : base créée, migrations du socle et de l’app appliquées', !serveur.fini && !serveur.delai && /migration|à jour/i.test(serveur.sortie()), serveur.sortie().trim().split('\n').slice(-3).join(' | '));
    if (serveur.fini || serveur.delai) throw new Error('arrêt : le serveur ne démarre pas');
    const sante = await appel('GET', '/api/sante');
    const accueil = await fetch(base + '/');
    const csp = accueil.headers.get('content-security-policy') || '';
    regle('03', 'Santé et en-têtes de sécurité (CSP sans unsafe-inline, nosniff, DENY)', sante.statut === 200 && /default-src 'self'/.test(csp) && !/unsafe-inline/.test(csp)
      && accueil.headers.get('x-content-type-options') === 'nosniff' && accueil.headers.get('x-frame-options') === 'DENY', `santé ${sante.statut}`);

    // Installation
    const s0 = await appel('GET', '/api/session');
    const faux = await appel('POST', '/api/installation', { code: 'faux', email: 'admin@recette.test', mdp: MDP });
    const vrai = await appel('POST', '/api/installation', { code: CODE, email: 'admin@recette.test', nom: 'Admin', mdp: MDP, appNom: 'Recette' });
    regle('04', 'Première installation : code exigé, compte admin créé, cookie HttpOnly', s0.json.installation === true && faux.statut === 403 && vrai.statut === 201
      && /HttpOnly/i.test(vrai.setCookie || '') && /SameSite=Lax/i.test(vrai.setCookie || '') && vrai.json.utilisateur && vrai.json.utilisateur.role === 'admin', `faux ${faux.statut}, vrai ${vrai.statut} ${vrai.json.erreur || ''}`);
    const encore = await appel('POST', '/api/installation', { code: CODE, email: 'x@recette.test', mdp: MDP }, { garder: false });
    regle('05', 'Installation impossible une seconde fois', encore.statut === 409, 'statut ' + encore.statut);
    const csrf = await appel('POST', '/api/deconnexion', {}, { sansAppli: true, garder: false, type: 'text/plain' });
    regle('06', 'Écriture refusée sans en-tête X-Appli, jeton ni corps JSON (CSRF)', csrf.statut === 403, 'statut ' + csrf.statut);
    const fauxMdp = await appel('POST', '/api/connexion', { email: 'admin@recette.test', mdp: 'mauvais-mdp-123' }, { garder: false });
    const inconnu = await appel('POST', '/api/connexion', { email: 'personne@recette.test', mdp: 'mauvais-mdp-123' }, { garder: false });
    const bon = await appel('POST', '/api/connexion', { email: 'admin@recette.test', mdp: MDP });
    regle('07', 'Connexion : même message pour compte inconnu et mauvais mot de passe, bonne connexion acceptée', fauxMdp.statut === 401 && inconnu.statut === 401 && fauxMdp.json.erreur === inconnu.json.erreur && bon.statut < 300, `${fauxMdp.statut}/${inconnu.statut}/${bon.statut}`);
    const court = await appel('POST', '/api/admin/utilisateurs', { email: 'court@recette.test', mdp: 'abc' });
    regle('08', 'Mot de passe trop court refusé', court.statut === 400, 'statut ' + court.statut);

    // Clé de l'Atelier
    const etat = await appel('GET', '/api/admin/etat', undefined, { cle: CLE });
    const mauvaiseCle = await appel('GET', '/api/admin/etat', undefined, { cle: 'x'.repeat(40) });
    const cleAilleurs = await appel('GET', '/api/moi', undefined, { cle: CLE });
    regle('09', 'Clé de l’Atelier : acceptée sur l’admin, refusée si fausse et hors admin', etat.statut === 200 && mauvaiseCle.statut === 401 && cleAilleurs.statut === 403, `${etat.statut}/${mauvaiseCle.statut}/${cleAilleurs.statut}`);
    const texteEtat = etat.texte;
    regle('10', 'Aucun secret renvoyé par l’état (clé, code, mot de passe de base)', !texteEtat.includes(CLE) && !texteEtat.includes(CODE) && !texteEtat.includes(urlBase), 'un secret apparaît dans /api/admin/etat');
    const nonDef = (etat.json.variables || []).filter(v => v.obligatoire && !v.definie).map(v => v.cle);
    regle('11', 'Toutes les variables obligatoires définies', !nonDef.length, nonDef.join(', '));
    const optim = (etat.json.optimisation || []).filter(o => o.niveau === 'erreur').map(o => o.texte);
    regle('12', 'Base optimisée sur la vraie base (clés, index des liens, fuseaux, montants)', !optim.length, optim.slice(0, 5).join(' ; '));
    const conseils = (etat.json.optimisation || []).filter(o => o.niveau !== 'erreur').map(o => o.texte);
    regle('13', 'Tables décrites et datées (cree_le)', !conseils.length, conseils.slice(0, 5).join(' ; '), true);

    // Tableur
    const tables = await appel('GET', '/api/admin/tables', undefined, { cle: CLE });
    const liste = (tables.json.tables || []);
    const lectures = await Promise.all(liste.map(t => appel('GET', `/api/admin/tables/${t.nom}?par=5`, undefined, { cle: CLE }).then(r => [t.nom, r.statut])));
    const ko = lectures.filter(x => x[1] !== 200).map(x => x.join(' '));
    regle('14', 'Chaque table se lit dans le tableur de l’Atelier', tables.statut === 200 && liste.length >= 4 && !ko.length, ko.join(', ') || 'tables ' + tables.statut);
    const sensibles = liste.filter(t => t.colonnes.some(c => /mdp|hash|secret|token|jeton/i.test(c.nom))).map(t => t.nom);
    regle('15', 'Colonnes sensibles masquées (mots de passe, jetons)', !sensibles.length && !liste.some(t => t.nom === 'sessions'), sensibles.join(', '));
    const app = liste.filter(t => !t.socle && !t.lectureSeule);
    const vides = await Promise.all(app.map(t => appel('POST', `/api/admin/tables/${t.nom}`, {}, { cle: CLE }).then(r => [t, r])));
    const sansMessage = vides.filter(([t, r]) => t.colonnes.some(c => c.obligatoire && !c.lectureSeule) && !(r.statut === 400 && /obligatoire|manquant|à remplir/i.test(r.json.erreur || ''))).map(([t, r]) => `${t.nom} (${r.statut} ${r.json.erreur || ''})`);
    regle('16', 'Ajout incomplet refusé avec un message clair (colonnes obligatoires)', !sansMessage.length, sansMessage.join(', '));
    const nonAppli = await appel('POST', `/api/admin/tables/${(app[0] || {}).nom || 'x'}`, {}, { sansAppli: true, type: 'text/plain' });
    regle('17', 'Le tableur exige une session admin ou la clé', nonAppli.statut === 403 || nonAppli.statut === 401, 'statut ' + nonAppli.statut);

    // Comptes
    const cree = await appel('POST', '/api/admin/utilisateurs', { email: 'membre@recette.test', role: 'utilisateur' }, { cle: CLE });
    const sauve = cookie;
    cookie = '';
    const cx = await appel('POST', '/api/connexion', { email: 'membre@recette.test', mdp: cree.json.mdpProvisoire || '' });
    const bloque = await appel('GET', '/api/admin/etat');
    const routesApp = [];
    try { delete require.cache[path.join(racine, 'app/app.js')]; require(path.join(racine, 'app/app.js')).routes(new Proxy({}, { get: (_, m) => (c, o) => routesApp.push({ m, c, role: typeof o === 'object' ? o.role || 'utilisateur' : 'utilisateur', provisoire: typeof o === 'object' && !!o.mdpProvisoire }) }), { base: {}, journal() {}, env: { get() {} }, erreur: (s, m) => new Error(m) }); } catch (e) { /* routes lues avant l'erreur */ }
    const getSansParam = routesApp.filter(r => r.m === 'get' && !r.c.includes(':') && ![].concat(r.role).includes('public'));
    const getBloquees = getSansParam.filter(r => !r.provisoire);   // routes permises avec un mot de passe provisoire : à part
    const force = getBloquees.length ? await appel('GET', getBloquees[0].c) : { statut: 403 };
    regle('18', 'Compte créé par l’admin : mot de passe provisoire, changement imposé, pas d’accès admin', cree.statut === 201 && cree.json.mdpProvisoire && cx.statut < 300 && cx.json.utilisateur.mdp_a_changer && force.statut === 403 && bloque.statut === 403,
      `création ${cree.statut}, connexion ${cx.statut}, route ${force.statut}, admin ${bloque.statut}`);
    cookie = '';
    const anonymes = await Promise.all(getSansParam.map(r => appel('GET', r.c, undefined, { sansCookie: true }).then(x => [r.c, x.statut])));
    const ouvertes = anonymes.filter(x => x[1] !== 401).map(x => x.join(' '));
    regle('19', 'Routes de l’app fermées sans connexion', !ouvertes.length, ouvertes.join(', '));
    cookie = sauve;

    // Journal, RGPD, sauvegarde, réglages
    const j = await appel('GET', '/api/admin/journal?par=200', undefined, { cle: CLE });
    const actions = new Set((j.json.lignes || []).map(l => l.action));
    const fuite = (j.texte || '').includes(MDP) || (cree.json.mdpProvisoire && j.texte.includes(cree.json.mdpProvisoire));
    regle('20', 'Journal : installation, connexions refusées, comptes ; jamais de mot de passe', ['installation', 'connexion_refusee', 'connexion', 'compte_cree'].every(a => actions.has(a)) && !fuite, [...actions].join(', ') + (fuite ? ' — MOT DE PASSE DANS LE JOURNAL' : ''));
    const rg = await appel('GET', '/api/admin/rgpd?email=membre@recette.test', undefined, { cle: CLE });
    const sup0 = await appel('POST', '/api/admin/rgpd/supprimer', { email: 'membre@recette.test', confirmer: 'non' }, { cle: CLE });
    const sup = await appel('POST', '/api/admin/rgpd/supprimer', { email: 'membre@recette.test', confirmer: 'membre@recette.test' }, { cle: CLE });
    regle('21', 'RGPD : export des données d’une personne, suppression avec confirmation', rg.statut === 200 && rg.json.donnees && rg.json.donnees.utilisateurs && sup0.statut === 400 && sup.statut < 300, `${rg.statut}/${sup0.statut}/${sup.statut}`);
    const sv = await appel('GET', '/api/admin/sauvegarde', undefined, { cle: CLE });
    regle('22', 'Sauvegarde lisible sans mot de passe ni session', sv.statut === 200 && sv.json.tables && !/mdp_hash|scrypt\$/.test(sv.texte) && !sv.json.tables.sessions, 'statut ' + sv.statut);
    const rgl = await appel('PUT', '/api/admin/reglages', { app_nom: 'Recette 2' }, { cle: CLE });
    const s2 = await appel('GET', '/api/session');
    regle('23', 'Réglages partagés modifiables depuis l’Atelier', rgl.statut === 200 && s2.json.app && s2.json.app.nom === 'Recette 2', `${rgl.statut} ${s2.json.app && s2.json.app.nom}`);
    const dernier = await appel('PATCH', `/api/admin/utilisateurs/${vrai.json.utilisateur.id}`, { actif: false }, { cle: CLE });
    regle('24', 'Le dernier admin ne peut pas être retiré', dernier.statut === 400, 'statut ' + dernier.statut);

    // Redémarrage : migrations rejouables
    serveur.p.kill('SIGTERM'); await new Promise(ok => serveur.p.once('exit', ok)); serveur = null;
    serveur = await lancer(ENV);
    const s3 = !serveur.fini && !serveur.delai ? await appel('GET', '/api/sante') : { statut: 0 };
    regle('25', 'Redémarrage sur la même base sans rien réappliquer', s3.statut === 200 && !/appliquée|appliquee/i.test(serveur.sortie().replace(/base à jour/, '')), serveur.sortie().trim().split('\n').slice(-2).join(' | '));

    // Compte admin par défaut sur une base neuve (ADMIN_DEFAUT=1)
    serveur.p.kill('SIGTERM'); await new Promise(ok => serveur.p.once('exit', ok)); serveur = null;
    const nomBase2 = nomBase + '_d';
    bases.push(nomBase2);
    serveur = await lancer(Object.assign({}, ENV, { ADMIN_DEFAUT: '1', DATABASE_URL: urlBase.replace('/' + nomBase, '/' + nomBase2) }));
    cookie = '';
    const sd = await appel('GET', '/api/session');
    const cd = await appel('POST', '/api/connexion', { email: 'admin', mdp: 'adminadmin' });
    const bloqueD = await appel('GET', '/api/admin/utilisateurs');
    const alerte = await appel('GET', '/api/admin/etat', undefined, { cle: CLE });
    const change = await appel('POST', '/api/moi/mdp', { ancien: 'adminadmin', nouveau: MDP });
    const alerte2 = await appel('GET', '/api/admin/etat', undefined, { cle: CLE });
    const aDefaut = r => (r.json.alertes || []).some(a => /adminadmin/.test(a.texte));
    regle('26', 'Compte admin par défaut (admin / adminadmin) : créé, changement imposé, alerte dans l’Atelier jusqu’au changement', sd.json.installation === false && cd.statut < 300
      && cd.json.utilisateur.role === 'admin' && cd.json.utilisateur.mdp_a_changer && bloqueD.statut === 403 && aDefaut(alerte) && change.statut < 300 && !aDefaut(alerte2),
      `connexion ${cd.statut}, admin avant changement ${bloqueD.statut}, alerte ${aDefaut(alerte)}, changement ${change.statut}, alerte après ${aDefaut(alerte2)}`);

    // Connexion par jetons (front séparé, app mobile)
    const jx = await appel('POST', '/api/jetons', { email: 'admin', mdp: MDP }, { sansCookie: true, garder: false });
    const moiJ = await appel('GET', '/api/moi', undefined, { cle: jx.json.accessToken, sansAppli: true });
    const ren = await appel('POST', '/api/jetons/renouveler', { refreshToken: jx.json.refreshToken }, { sansCookie: true, garder: false });
    const ren2 = await appel('POST', '/api/jetons/renouveler', { refreshToken: jx.json.refreshToken }, { sansCookie: true, garder: false });
    const fauxJ = await appel('GET', '/api/moi', undefined, { cle: String(jx.json.accessToken || 'a.b.c').slice(0, -3) + 'abc' });
    const cleToujours = await appel('GET', '/api/admin/etat', undefined, { cle: CLE });
    const sortieJ = await appel('DELETE', '/api/jetons', undefined, { cle: ren.json.accessToken });
    const apresSortie = await appel('POST', '/api/jetons/renouveler', { refreshToken: ren.json.refreshToken }, { sansCookie: true, garder: false });
    regle('27', 'Connexion par jetons : accès par jeton, renouvellement à usage unique, jeton falsifié refusé, déconnexion', jx.statut < 300 && jx.json.accessToken && moiJ.statut === 200
      && moiJ.json.utilisateur && moiJ.json.utilisateur.email === 'admin' && ren.statut < 300 && ren.json.refreshToken && ren2.statut === 401 && fauxJ.statut === 401 && cleToujours.statut === 200
      && sortieJ.statut < 300 && apresSortie.statut === 401, `jetons ${jx.statut}, moi ${moiJ.statut}, renouvellement ${ren.statut}/${ren2.statut}, falsifié ${fauxJ.statut}, clé ${cleToujours.statut}, sortie ${sortieJ.statut}/${apresSortie.statut}`);
  } catch (e) {
    regle('00', 'Recette menée jusqu’au bout', false, e.message);
  } finally {
    if (serveur && serveur.p && serveur.p.exitCode === null) { serveur.p.kill('SIGTERM'); await new Promise(ok => { serveur.p.once('exit', ok); setTimeout(ok, 6000); }); }
    const c = new pg.Client({ connectionString: urlAdmin });
    try { await c.connect(); for (const b of bases) await c.query(`drop database if exists "${b}" with (force)`); } catch (e) { console.error(`Base ${nomBase} non supprimée : ${e.message}`); } finally { await c.end().catch(() => {}); }
  }
  console.log(`Recette de bout en bout — ${racine} (base jetable ${nomBase}, supprimée)\n`);
  resultats.sort((a, b) => a.num.localeCompare(b.num)).forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${!r.ok && r.recommande ? ' (recommandé)' : ''}`));
  const ko = resultats.filter(r => !r.ok && !r.recommande).length;
  console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme.');
  process.exitCode = ko ? 1 : 0;
})();
