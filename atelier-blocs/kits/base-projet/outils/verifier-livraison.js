/* outils/verifier-livraison.js — recette de la LIVRAISON d'une app (OUTIL DE DÉVELOPPEMENT, pas livré avec l'app)
   Kit « Base projet » de l'Atelier de Blocs. Node 18+, sans dépendance.
   node outils/verifier-livraison.js mon-app/        un dossier
   node outils/verifier-livraison.js mon-app.zip     ou directement le ZIP livré
   → « Conforme » (code 0) ou « Non conforme » (code 1). */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const cible = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || '.');

/* ---------- Fichiers : dossier ou ZIP (stocké ou deflate) ---------- */
function lireZip(buf) {
  let fin = buf.length - 22;
  while (fin >= 0 && buf.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('ZIP illisible');
  const n = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    const methode = buf.readUInt16LE(p + 10), taille = buf.readUInt32LE(p + 20);
    const ln = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const nom = buf.slice(p + 46, p + 46 + ln).toString('utf8');
    p += 46 + ln + lx + lc;
    if (nom.endsWith('/')) continue;
    const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const brut = buf.slice(debut, debut + taille);
    out[nom] = methode === 8 ? zlib.inflateRawSync(brut) : brut;
  }
  return out;
}
function lireDossier(dossier) {
  const out = {};
  (function parcourir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name), rel = path.relative(dossier, p).split(path.sep).join('/');
      if (e.isDirectory()) { if (/^(node_modules|\.git)$/.test(e.name)) { out[rel + '/'] = Buffer.alloc(0); continue; } parcourir(p); }
      else out[rel] = fs.statSync(p).size > 5e6 ? Buffer.alloc(fs.statSync(p).size > 1e7 ? 1e7 + 1 : 0) : fs.readFileSync(p);
    }
  })(dossier);
  return out;
}
let fichiers = /\.zip$/i.test(cible) ? lireZip(fs.readFileSync(cible)) : lireDossier(cible);
/* Un ZIP qui contient un seul dossier racine : on regarde dedans. */
const racines = new Set(Object.keys(fichiers).map(c => c.split('/')[0]));
if (racines.size === 1 && Object.keys(fichiers).every(c => c.includes('/'))) {
  const r = [...racines][0] + '/';
  fichiers = Object.fromEntries(Object.entries(fichiers).map(([c, b]) => [c.slice(r.length), b]).filter(([c]) => c));
}
const chemins = Object.keys(fichiers);
const texte = c => fichiers[c] ? fichiers[c].toString('utf8') : null;
const existe = c => chemins.some(x => x === c || x.startsWith(c.replace(/\/?$/, '/')));
const CONSTRUIT = /(^|\/)(node_modules|vendor|dist|build|outils|\.next|\.nuxt|\.output|\.svelte-kit|\.vercel|\.netlify|coverage)\//;
const CODE = /\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte|html?|py|php|go|rb)$/i;
const code = chemins.filter(c => CODE.test(c) && !CONSTRUIT.test(c) && !/\.min\.js$/.test(c));

const resultats = [];
const regle = (num, texte, ok, detail, recommande) => resultats.push({ num, texte, ok: !!ok, detail: detail || '', recommande });
const extrait = a => a.slice(0, 6).join(', ') + (a.length > 6 ? ` … (+${a.length - 6})` : '');

/* README */
const cheminReadme = chemins.find(c => /^readme(\.md)?$/i.test(c));
const readme = cheminReadme ? texte(cheminReadme) : '';
regle('01', 'README à la racine', readme, 'absent');
const sections = [['lancement', /(lancer|lancement|démarr|installation|en local)/i], ['déploiement', /(déploi|mise en ligne|mettre en ligne|hébergement|production)/i], ['mise à jour', /(mise à jour|mettre à jour|nouvelle version|migration)/i]];
const titres = (readme.match(/^#{1,4} .+$/gm) || []).join('\n');
const manquent = sections.filter(([, re]) => !re.test(titres)).map(([n]) => n);
regle('02', 'README : sections lancement, déploiement, mise à jour', readme && !manquent.length, 'manque : ' + manquent.join(', '));

/* Variables d'environnement */
const lues = new Set();
for (const c of code) for (const m of texte(c).matchAll(/(?:process\.env\.|import\.meta\.env\.|Deno\.env\.get\(\s*['"]|process\.env\[\s*['"])([A-Z][A-Z0-9_]+)/g)) lues.add(m[1]);
['NODE_ENV', 'PORT', 'DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR'].forEach(v => lues.delete(v));
const exemples = chemins.filter(c => /(^|\/)\.env\.(example|exemple|sample|modele)$/i.test(c) && !CONSTRUIT.test(c));
const ex = exemples.map(texte).join('\n');
regle('03', '.env.example livré (le code lit des variables)', !lues.size || ex, `variables lues : ${extrait([...lues])}`);
const SECRET = /(SECRET|PRIVATE|PASSWORD|MOT_DE_PASSE|MDP|TOKEN|SERVICE_ROLE|API_KEY|_KEY$|DATABASE_URL|WEBHOOK)/i;
const remplis = (ex.match(/^[ \t]*[A-Z][A-Z0-9_]*[ \t]*=[ \t]*\S.*$/gm) || []).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  .filter(([k, v]) => SECRET.test(k) && !/^(["']?)(|x+|\.\.\.|changeme|à remplir|<.*>|votre.*|your.*|⟦.*⟧|sk_test_\.*|pk_test_\.*)\1$/i.test(v) && !/@(localhost|127\.0\.0\.1|db|postgres)[:/]/.test(v)).map(([k]) => k);
regle('04', '.env.example sans valeur secrète', !remplis.length, extrait(remplis));
const manifeste = (() => { const c = chemins.find(x => x === 'atelier-app.json'); try { return c ? JSON.parse(texte(c)) : null; } catch (e) { return 'invalide'; } })();
const declarees = new Set((ex.match(/^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/gm) || []).map(l => l.replace(/[#=\s]/g, '')).concat(((manifeste && manifeste.env) || []).map(v => typeof v === 'string' ? v : v.cle)));
const oubliees = [...lues].filter(v => !declarees.has(v));
regle('05', 'Chaque variable lue par le code est documentée (.env.example ou atelier-app.json)', !oubliees.length, extrait(oubliees));

/* Fichiers à ne pas livrer */
const interdits = chemins.filter(c => /(^|\/)\.env(\.[\w-]+)?$/.test(c) && !/\.(example|exemple|sample|modele)$/.test(c) || /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.vercel|\.netlify)(\/|$)/.test(c) || /(^|\/)(\.DS_Store|Thumbs\.db)$|\.(dump|sqlite3?|db|sql\.gz|pem|key|p12|log)$/i.test(c));
regle('06', 'Aucun fichier à ne pas livrer (.env, node_modules, .git, .next, dumps, clés, journaux)', !interdits.length, extrait([...new Set(interdits.map(c => c.replace(/^(.*?(node_modules|\.git|\.next|\.nuxt|\.vercel|\.netlify))\/.*$/, '$1/')))]));

/* Manifeste de l'Atelier */
regle('07', 'atelier-app.json présent et valide (nom, version, description)', manifeste && manifeste !== 'invalide' && manifeste.nom && /^\d+\.\d+\.\d+/.test(manifeste.version || '') && manifeste.description,
  manifeste === 'invalide' ? 'JSON invalide' : manifeste ? ['nom', 'version', 'description'].filter(k => !manifeste[k]).join(', ') || 'version au format 1.0.0' : 'absent');
if (manifeste && manifeste !== 'invalide') {
  const liste = (Array.isArray(manifeste.schema) ? manifeste.schema : manifeste.schema ? [manifeste.schema] : []).concat(manifeste.web ? [manifeste.web] : []);
  const absents = liste.map(c => String(c).replace(/^\.?\/+|\/+$/g, '')).filter(c => c && !existe(c));
  regle('08', 'Chemins de atelier-app.json (schema, web) présents', !absents.length, extrait(absents));
}

/* Compte rendu de livraison */
const cheminLiv = chemins.find(c => /^(livraison|compte-rendu|CHANGELOG)\.md$/i.test(c));
const liv = (cheminLiv ? texte(cheminLiv) : '') + '\n' + readme;
regle('09', 'Compte rendu : résultat de la recette', /recette|tests?\b.*(fait|ok|réussi|échou)|✓|☑|\[x\]/i.test(liv), 'aucun résultat de recette trouvé (LIVRAISON.md)');
regle('10', 'Compte rendu : ce qui n’est pas fait ou pas testé', /(pas fait|non fait|pas testé|non testé|reste à faire|limites|à faire)/i.test(liv), 'section absente (LIVRAISON.md)');

/* Propreté */
const restes = chemins.filter(c => /\.(md|html?|json|js|ts|txt)$/i.test(c) && !CONSTRUIT.test(c) && /⟦[^⟧]*⟧/.test(texte(c)));
regle('11', 'Aucun champ ⟦…⟧ laissé à remplir', !restes.length, extrait(restes));
const pkg = chemins.filter(c => /(^|\/)package\.json$/.test(c) && !CONSTRUIT.test(c));
regle('12', 'Dépendances verrouillées (package-lock.json à côté de package.json)', pkg.every(c => existe(c.replace(/package\.json$/, 'package-lock.json')) || existe(c.replace(/package\.json$/, 'pnpm-lock.yaml')) || existe(c.replace(/package\.json$/, 'yarn.lock'))), extrait(pkg), true);
const todo = code.flatMap(c => texte(c).split('\n').map((l, i) => /\b(TODO|FIXME|XXX)\b/.test(l) ? `${c}:${i + 1}` : null).filter(Boolean));
regle('13', 'Aucun TODO / FIXME restant dans le code', !todo.length, extrait(todo), true);
const gros = chemins.filter(c => fichiers[c].length > 1e7 && !CONSTRUIT.test(c));
regle('14', 'Aucun fichier de plus de 10 Mo', !gros.length, extrait(gros), true);

console.log(`Recette de livraison — ${cible} (${chemins.length} fichiers)\n`);
resultats.forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${!r.ok && r.recommande ? ' (recommandé)' : ''}`));
const ko = resultats.filter(r => !r.ok && !r.recommande).length;
console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (lance aussi les outils de recette des autres kits : KIT.md § 7).');
process.exitCode = ko ? 1 : 0;
