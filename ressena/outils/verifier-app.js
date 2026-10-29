/* outils/verifier-app.js — contrôle d'une app du kit « App complète » SANS la lancer (OUTIL DE DÉVELOPPEMENT)
   Kit « App complète » de l'Atelier de Blocs. Node 18+, sans dépendance.
   node outils/verifier-app.js            contrôle le dossier courant (racine de l'app)
   node outils/verifier-app.js mon-app/   contrôle un autre dossier
   → « Conforme » (code 0) ou « Non conforme » (code 1). Règles : KIT.md § 13.
   (Mainteneur du kit seulement : --empreintes réécrit noyau/empreintes.json.) */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawnSync } = require('child_process');
const args = process.argv.slice(2);
const racine = path.resolve(args.find(a => !a.startsWith('--')) || '.');
const lire = r => { try { return fs.readFileSync(path.join(racine, r), 'utf8'); } catch (e) { return null; } };
const existe = r => fs.existsSync(path.join(racine, r));
const liste = d => existe(d) ? fs.readdirSync(path.join(racine, d)).sort() : [];
const extrait = l => l.slice(0, 6).join(', ') + (l.length > 6 ? ` … (+${l.length - 6})` : '');
const resultats = [];
const regle = (num, texte, ok, detail, recommande) => resultats.push({ num, texte, ok: !!ok, detail, recommande });

/* Fichiers du noyau (identiques dans toutes les apps du kit) */
const NOYAU = ['serveur.js', ...['env', 'base', 'http', 'comptes', 'admin', 'journal', 'offre'].map(n => `noyau/${n}.js`),
  ...liste('noyau/migrations').map(f => 'noyau/migrations/' + f), 'public/noyau.js', 'public/socle.css'];
const empreinte = r => crypto.createHash('sha256').update((lire(r) || '').replace(/\r\n/g, '\n')).digest('hex');
/* Charte commune : les jetons de :root (valeurs) et le reste de charte.css (composants, identique dans toutes les apps) */
const CHARTE_LIBRES = ['primaire', 'sur-primaire', 'accent', 'sur-accent'];
function lireCharte(texte) {
  const m = /:root\s*\{([^}]*)\}/.exec(texte || '');
  if (!m) return null;
  const jetons = {};
  for (const x of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) jetons[x[1]] = x[2].trim().replace(/\s+/g, ' ');
  const reste = (texte.slice(0, m.index).replace(/\/\*[\s\S]*?\*\//g, '') + texte.slice(m.index + m[0].length)).replace(/\r\n/g, '\n').trim();
  return { jetons, composants: crypto.createHash('sha256').update(reste).digest('hex') };
}
if (args.includes('--empreintes')) {
  const sortie = Object.fromEntries(NOYAU.filter(existe).map(r => [r, empreinte(r)]));
  sortie['charte'] = lireCharte(lire('public/charte.css'));
  fs.writeFileSync(path.join(racine, 'noyau/empreintes.json'), JSON.stringify(sortie, null, 1) + '\n');
  console.log('noyau/empreintes.json réécrit.'); process.exit(0);
}

/* Tous les fichiers de code (hors dépendances et outils) */
const code = [];
(function parcourir(d) {
  for (const e of fs.readdirSync(path.join(racine, d), { withFileTypes: true })) {
    const r = d ? d + '/' + e.name : e.name;
    if (e.isDirectory()) { if (!/^(node_modules|\.git|outils)$/.test(e.name)) parcourir(r); }
    else if (/\.(js|mjs|cjs|json|html|sql)$/.test(e.name) && !/package-lock\.json$/.test(e.name)) code.push(r);
  }
})('');

/* 01–02 Structure et noyau */
const attendus = [...NOYAU, 'noyau/empreintes.json', 'app/app.js', 'public/index.html', 'public/app-ecrans.js', 'public/affichage.js', 'public/charte.css', 'package.json', '.env.example', '.gitignore', 'atelier-app.json'];
const absents = attendus.filter(r => !existe(r)).concat(liste('db/migrations').length ? [] : ['db/migrations/*.sql']);
regle('01', 'Fichiers du kit présents', !absents.length, 'absent : ' + extrait(absents));
let empreintes = {};
try { empreintes = JSON.parse(lire('noyau/empreintes.json')); } catch (e) { /* signalé par la règle 01 */ }
const touches = NOYAU.filter(r => existe(r) && empreintes[r] !== empreinte(r));
regle('02', 'Noyau intact (noyau/, serveur.js, public/noyau.js, public/socle.css non modifiés)', !touches.length, 'modifié : ' + extrait(touches) + ' — remets la version du kit, le métier va dans app/ et db/');

/* 03 package.json */
let pkg = {};
try { pkg = JSON.parse(lire('package.json')); } catch (e) { /* 01 */ }
const deps = Object.keys(pkg.dependencies || {});
regle('03', 'package.json : script start, kitAppComplete, pg déclaré', pkg.scripts && /serveur\.js/.test(pkg.scripts.start || '') && pkg.kitAppComplete && deps.includes('pg'), 'scripts.start = « node serveur.js », kitAppComplete et dépendance pg attendus');
regle('04', 'Pas de dépendance en plus de pg (chaque ajout se justifie)', deps.every(d => d === 'pg'), 'en plus : ' + extrait(deps.filter(d => d !== 'pg')), true);

/* 05–08 Variables d'environnement */
const envDirect = code.filter(r => r.endsWith('.js') && r !== 'noyau/env.js' && /process\.env\b/.test(lire(r)));
regle('05', 'process.env lu uniquement par noyau/env.js (sinon : déclarer dans app/app.js → variables, puis env.get)', !envDirect.length, extrait(envDirect));
let app = null, erreurApp = '';
const avant = Object.assign({}, process.env);
try { delete require.cache[path.join(racine, 'app/app.js')]; app = require(path.join(racine, 'app/app.js')); } catch (e) { erreurApp = e.message; }
Object.keys(process.env).forEach(k => { if (!(k in avant)) delete process.env[k]; });
regle('06', 'app/app.js se charge', app, erreurApp);
app = app || {};
const TYPES = ['texte', 'entier', 'booleen', 'url', 'choix', 'liste'];
const NOYAU_VARS = (lire('noyau/env.js') || '').match(/cle: '([A-Z0-9_]+)'/g) || [];
const nomsNoyau = NOYAU_VARS.map(m => m.slice(6, -1));
const mauvaises = (app.variables || []).filter(v => !/^[A-Z][A-Z0-9_]*$/.test(v.cle || '') || !TYPES.includes(v.type || 'texte') || !v.role || nomsNoyau.includes(v.cle)).map(v => v.cle || '?');
regle('07', 'Variables de l’app déclarées : CLE_EN_MAJUSCULES, type connu, rôle écrit, pas de doublon avec le noyau', !mauvaises.length, extrait(mauvaises));
const exemple = lire('.env.example') || '';
const declarees = nomsNoyau.concat((app.variables || []).map(v => v.cle));
const manquantes = declarees.filter(c => !new RegExp(`^${c}=`, 'm').test(exemple));
const secretes = (app.variables || []).filter(v => v.secret).map(v => v.cle).concat(['DATABASE_URL', 'ADMIN_API_KEY', 'INSTALL_CODE'])
  .filter(c => new RegExp(`^${c}=\\s*[^\\s#"']`, 'm').test(exemple) || new RegExp(`^${c}=\\s*"[^"]+"`, 'm').test(exemple));
regle('08', '.env.example à jour (node noyau/env.js --exemple) et sans valeur secrète', !manquantes.length && !secretes.length,
  (manquantes.length ? 'manque : ' + extrait(manquantes) : '') + (secretes.length ? ' valeur remplie : ' + extrait(secretes) : ''));
const gi = lire('.gitignore') || '';
regle('09', '.gitignore exclut .env et node_modules', /^\.env$/m.test(gi) && /^node_modules\/?$/m.test(gi), 'ajoute .env et node_modules/');
const SECRET = /(postgres(ql)?:\/\/[^:\s'"]+:[^@\s'"]+@|sk_live_[0-9a-zA-Z]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|eyJhbGciOi[0-9a-zA-Z_-]{20,}\.)/;
const EXEMPLE = /\/\/(utilisateur|user|usr):(motdepasse|mot_de_passe|mdp|password|pass|secret)@/i;
const fuites = code.filter(r => (lire(r).match(new RegExp(SECRET.source, 'g')) || []).some(m => !EXEMPLE.test(m)));
regle('10', 'Aucun secret écrit dans le code (mot de passe de base, clé privée, clé d’API)', !fuites.length, extrait(fuites));

/* 11–13 Déclarations de l'app */
const sqlApp = liste('db/migrations').filter(f => f.endsWith('.sql')).map(f => lire('db/migrations/' + f)).join('\n');
const sqlTout = liste('noyau/migrations').map(f => lire('noyau/migrations/' + f)).join('\n') + sqlApp;
const tablesSql = [...sqlTout.matchAll(/create table (?:if not exists )?(?:public\.)?"?(\w+)"?/gi)].map(m => m[1].toLowerCase());
const refsInconnues = Object.keys(app.tables || {}).concat((app.rgpd || []).map(d => d.table)).filter(t => !tablesSql.includes(t));
const rgpdKo = (app.rgpd || []).filter(d => !d.colonne || !['anonymiser', 'supprimer'].includes(d.action) || !d.conservation).map(d => d.table || '?');
regle('11', 'app/app.js : nom, version, tables et rgpd qui existent dans les migrations', app.nom && /^\d+\.\d+\.\d+$/.test(app.version || '') && !refsInconnues.length && !rgpdKo.length,
  [!app.nom || !app.version ? 'nom ou version (x.y.z) manquant' : '', refsInconnues.length ? 'tables inconnues : ' + extrait(refsInconnues) : '', rgpdKo.length ? 'rgpd incomplet (colonne, action anonymiser|supprimer, conservation) : ' + extrait(rgpdKo) : ''].filter(Boolean).join(' ; '));
const routes = [];
const faux = new Proxy({}, { get: (_, m) => (chemin, o) => routes.push({ m, chemin, role: typeof o === 'object' ? o.role : undefined }) });
try { if (typeof app.routes === 'function') app.routes(faux, { base: {}, journal() {}, env: { get() {} }, erreur: (s, m) => new Error(m) }); } catch (e) { /* routes déclarées avant l'erreur */ }
const RESERVEES = /^\/api\/(admin|session|installation|connexion|inscription|deconnexion|moi|sante|jetons|offre)(\/|$)/;
const routesKo = routes.filter(r => !r.chemin.startsWith('/api/') || RESERVEES.test(r.chemin)).map(r => r.chemin);
regle('12', 'Routes de l’app sous /api/, sans prendre les adresses du noyau (admin, session, moi…)', !routesKo.length, extrait(routesKo));
const publiques = routes.filter(r => [].concat(r.role || []).includes('public')).map(r => `${r.m.toUpperCase()} ${r.chemin}`);
regle('13', 'Aucune route de l’app ouverte sans compte (role public) sans raison écrite dans KIT/README', !publiques.length, extrait(publiques), true);

/* 14–15 Base de données */
const numeros = liste('db/migrations').filter(f => f.endsWith('.sql')).map(f => (f.match(/^(\d+)_/) || [])[1]).filter(Boolean);
const doublons = numeros.filter((n, i) => numeros.indexOf(n) !== i);
const dansApp = liste('db/migrations').filter(f => /socle/i.test(f));
regle('14', 'Migrations de l’app numérotées sans doublon, distinctes du socle', !doublons.length && !dansApp.length, extrait(doublons.concat(dansApp)));
const doc = spawnSync(process.execPath, [path.join(__dirname, 'schema-doc.js'), path.join(racine, 'noyau/migrations'), path.join(racine, 'db/migrations')], { encoding: 'utf8' });
const fautesDoc = (doc.stdout || '').split('\n').filter(l => /^\s+✗/.test(l)).map(l => l.trim().slice(2));
regle('15', 'Base optimisée : clés, index des liens, timestamptz, numeric, descriptions (schema-doc.js)', doc.status === 0, extrait(fautesDoc) || (doc.stderr || '').trim());
const destructif = sqlApp.split(';').filter(s => /\b(drop\s+(table|column)|truncate|alter\s+column\s+\w+\s+type)\b/i.test(s) && !/--\s*accord/i.test(s)).map(s => s.trim().split('\n')[0].slice(0, 60));
regle('16', 'Pas de suppression ni de changement de type sans « -- accord » écrit dans la migration', !destructif.length, extrait(destructif), true);

/* 17–19 Front */
const html = code.filter(r => r.startsWith('public/') && r.endsWith('.html')).map(r => [r, lire(r)]);
const enLigne = html.filter(([, t]) => /<script(?![^>]*\bsrc=)[^>]*>|<style[\s>]|\sstyle=|\son[a-z]+=/i.test(t)).map(([r]) => r);
const jsFront = code.filter(r => r.startsWith('public/') && r.endsWith('.js'));
const jsEnLigne = jsFront.filter(r => /\son[a-z]+=\\?["']|\sstyle=\\?["']|\beval\(|new Function\(/.test(lire(r))).map(r => r);
regle('17', 'Front compatible CSP : aucun script, style ou onclick en ligne, ni eval', !enLigne.length && !jsEnLigne.length, extrait(enLigne.concat(jsEnLigne)));
const ecrans = lire('public/app-ecrans.js') || '';
const sansEsc = [...ecrans.matchAll(/\$\{\s*([a-z_]+\.[a-z_]+)\s*\}/gi)].map(m => m[1]).filter(v => !/^(fr|appli)\./.test(v));
regle('18', 'Données de la base échappées dans les écrans : ${esc(…)} et non ${x.champ}', !sansEsc.length, extrait([...new Set(sansEsc)]));
const sw = lire('public/sw.js');
regle('19', 'Service worker : l’API n’est jamais mise en cache', !sw || /\/api\//.test(sw), 'public/sw.js doit ignorer /api/');

/* 20 Atelier */
let at = {};
try { at = JSON.parse(lire('atelier-app.json')); } catch (e) { /* 01 */ }
regle('20', 'atelier-app.json : kit app-complete, même version que app/app.js, admin /api/admin', at.kit === 'app-complete' && at.version === app.version && at.admin && at.admin.api === '/api/admin',
  `kit « app-complete », version ${app.version || '?'} et "admin": { "api": "/api/admin" } attendus`);

/* 21–24 Charte commune des apps : rôles, offre, publicité et paiement, style (KIT.md § 17) */
const ROLES_SOCLE = ['admin', 'vip', 'utilisateur'];
const rolesKo = (app.roles || []).filter(x => typeof x !== 'object' || !/^[a-z][a-z0-9_]*$/.test(x.id || '') || ROLES_SOCLE.includes(x.id) || !x.libelle || !x.description)
  .map(x => (x && x.id) || String(x));
regle('21', 'Rôles : admin, vip et utilisateur viennent du socle ; chaque rôle métier a un id, un libellé et une description de ses droits', !rolesKo.length,
  extrait(rolesKo) + ' — format { id, libelle, description } ; ne redéclare ni admin, ni vip, ni utilisateur');
let offreKo = '';
if (!app.offre) offreKo = 'app/app.js → offre absent (au minimum { paliers: [{ id: \'gratuit\', libelle: \'Gratuit\' }] })';
else {
  try { require(path.join(racine, 'noyau/offre.js')).declarer(app.offre); } catch (e) { offreKo = e.message; }
  const sansAvantage = (app.offre.paliers || []).slice(1).filter(p => !(p.avantages || []).length).map(p => p.id);
  if (!offreKo && sansAvantage.length) offreKo = 'avantages à écrire pour : ' + sansAvantage.join(', ');
}
regle('22', 'Offre au format commun : gratuit d’abord, 3 paliers au plus, prix TTC mois/an et avantages des paliers payants, le plus haut sans pub', !offreKo, offreKo);
const metier = code.filter(r => (r.startsWith('app/') || r === 'public/app-ecrans.js' || (r.startsWith('public/') && r.endsWith('.html'))));
const SDK = /(adsbygoogle|googletagservices|googlesyndication|doubleclick|js\.stripe\.com|checkout\.stripe|api\.stripe\.com|revenuecat|Plugins\.(AdMob|Purchases)|role\s*===?\s*['"]vip['"]|['"]vip['"]\s*===?)/i;
const horsSocle = metier.filter(r => SDK.test(lire(r)));
regle('23', 'Pub, paiement et droits passent par le socle (aucun SDK de pub ou de paiement, aucun test du rôle vip dans le code de l’app)', !horsSocle.length,
  extrait(horsSocle) + ' — utilise { palier } dans les routes, offre.limite(), appli.exiger()');
const ref = empreintes.charte, actuelle = lireCharte(lire('public/charte.css'));
const charteKo = [];
if (!ref || !actuelle) charteKo.push('public/charte.css sans bloc :root ou empreinte de référence absente');
else {
  if (actuelle.composants !== ref.composants) charteKo.push('composants de charte.css modifiés (seules les valeurs de :root changent)');
  const noms = Object.keys(ref.jetons);
  const enPlus = Object.keys(actuelle.jetons).filter(n => !noms.includes(n)), enMoins = noms.filter(n => !(n in actuelle.jetons));
  if (enPlus.length || enMoins.length) charteKo.push('jetons ajoutés ou retirés : ' + extrait(enPlus.concat(enMoins)));
  const changes = noms.filter(n => n in actuelle.jetons && actuelle.jetons[n] !== ref.jetons[n] && !CHARTE_LIBRES.includes(n));
  if (changes.length) charteKo.push('valeurs communes changées : ' + extrait(changes) + ' (seules primaire, sur-primaire, accent, sur-accent sont propres à l’app)');
  const lum = h => { const m = /^#([0-9a-f]{6})$/i.exec(String(h).trim()); if (!m) return null; return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return x === null || y === null ? null : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  [['sur-primaire', 'primaire'], ['sur-accent', 'accent'], ['accent', 'carte']].forEach(([t, f]) => {
    const c = contraste(actuelle.jetons[t], actuelle.jetons[f]);
    if (c === null) charteKo.push(`--${t} et --${f} en #rrggbb attendus`);
    else if (c < 4.5) charteKo.push(`contraste --${t} sur --${f} : ${c.toFixed(1)} (4,5 minimum)`);
  });
}
const cssApp = liste('public').filter(f => f.endsWith('.css') && !['charte.css', 'socle.css'].includes(f)).map(f => 'public/' + f);
const STYLE_EN_DUR = /(#[0-9a-f]{6}\b|#[0-9a-f]{3}\b(?=\s*[;,)])|rgba?\(|hsla?\(|font-family|box-shadow\s*:\s*(?!var\(--ombre\)|none))/i;
const enDur = cssApp.filter(r => STYLE_EN_DUR.test(lire(r).replace(/\/\*[\s\S]*?\*\//g, '')))
  .concat(['public/app-ecrans.js'].filter(r => /(#[0-9a-f]{6}\b|rgba?\(|hsla?\(|fontFamily|font-family|\.style\.(color|background|boxShadow))/i.test(lire(r) || '')));
if (enDur.length) charteKo.push('couleur, police ou ombre écrite en dur : ' + extrait(enDur));
regle('24', 'Charte commune : composants identiques, seules les couleurs primaire et accent changent (contraste 4,5:1), rien en dur dans les écrans', !charteKo.length, charteKo.join(' ; '));
const theme = ((lire('public/index.html') || '').match(/name="theme-color" content="([^"]+)"/) || [])[1];
regle('25', 'theme-color de index.html = --primaire de la charte', actuelle && theme && theme.toLowerCase() === String(actuelle.jetons.primaire).toLowerCase(), `theme-color ${theme || 'absent'}, --primaire ${actuelle ? actuelle.jetons.primaire : '?'}`, true);

console.log(`Contrôle de l’app — ${racine}\n`);
resultats.forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${!r.ok && r.recommande ? ' (recommandé)' : ''}`));
const ko = resultats.filter(r => !r.ok && !r.recommande).length;
console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (lance ensuite la recette de bout en bout : node outils/recette-app.js).');
process.exitCode = ko ? 1 : 0;
