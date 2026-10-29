/* outils/verifier-pwa.js — recette d'une PWA vanilla (OUTIL DE DÉVELOPPEMENT, pas livré avec l'app)
   Kit « Socle PWA » de l'Atelier de Blocs. Node 18+, sans dépendance.
   node outils/verifier-pwa.js [dossier de l'app]      → « Conforme » (code 0) ou « Non conforme » (code 1) */
'use strict';
const fs = require('fs'), path = require('path');
const racine = path.resolve(process.argv[2] || '.');
const lire = f => { try { return fs.readFileSync(path.join(racine, f), 'utf8'); } catch (e) { return null; } };
const existe = f => fs.existsSync(path.join(racine, f.split(/[?#]/)[0]));
const resultats = [];
const regle = (num, texte, ok, detail, recommande) => resultats.push({ num, texte, ok: !!ok, detail: detail || '', recommande });

const html = lire('index.html') || '';
regle('01', 'index.html à la racine', html, 'absent');
regle('02', 'Langue française (<html lang="fr">)', /<html[^>]+lang=["']fr/i.test(html));
regle('03', 'Balise viewport pour mobile', /<meta[^>]+name=["']viewport["'][^>]+width=device-width/i.test(html));
regle('04', 'Titre et description', /<title>[^<]+<\/title>/i.test(html) && /<meta[^>]+name=["']description["']/i.test(html), '', true);
regle('05', 'Couleur du thème (theme-color)', /<meta[^>]+name=["']theme-color["']/i.test(html));

const lienManifeste = (/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i.exec(html) || [])[1];
let m = null;
try { m = lienManifeste && JSON.parse(lire(lienManifeste)); } catch (e) { m = null; }
regle('06', 'Manifeste lié et valide', m, lienManifeste ? 'JSON invalide' : '<link rel="manifest"> absent');
if (m) {
  regle('07', 'Manifeste : name, short_name, start_url, display standalone', m.name && m.short_name && m.start_url && /standalone|fullscreen|minimal-ui/.test(m.display || ''),
    ['name', 'short_name', 'start_url', 'display'].filter(k => !m[k]).join(', '));
  const icones = m.icons || [];
  const tailles = new Set(icones.flatMap(i => String(i.sizes || '').split(' ')));
  regle('08', 'Icônes 192 et 512 (ou SVG « any »)', (tailles.has('192x192') && tailles.has('512x512')) || tailles.has('any'), [...tailles].join(', '));
  const manquantes = icones.filter(i => !existe(i.src)).map(i => i.src);
  regle('09', 'Les fichiers d’icônes existent', !manquantes.length, manquantes.join(', '));
  regle('10', 'Manifeste en français (lang)', /^fr/.test(m.lang || ''), m.lang || 'absent', true);
}

const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(x => x[1]);
const locaux = scripts.filter(s => !/^https?:/.test(s));
const js = locaux.map(s => lire(s) || '').join('\n');
regle('11', 'Service worker enregistré', /serviceWorker\.register\(/.test(js + html));
const sw = (/serviceWorker\.register\(\s*['"]([^'"]+)['"]/.exec(js + html) || [])[1];
const swTexte = sw ? lire(sw) : null;
regle('12', 'Le fichier du service worker existe', !sw || swTexte, sw);
regle('13', 'Service worker versionné (cache nommé avec une version)', !swTexte || /(VERSION|version|CACHE)\s*=\s*['"`][^'"`]*\d/.test(swTexte), '', false);
regle('14', 'Le service worker ne met pas l’API en cache', !swTexte || /\/api\//.test(swTexte), 'aucune exclusion /api/ trouvée', true);
const lies = [...html.matchAll(/(?:src|href)=["']([^"'#:]+)["']/gi)].map(x => x[1]).filter(f => !/^(\/\/|data:|mailto:)/.test(f));
const absents = lies.filter(f => !existe(f));
regle('15', 'Tous les fichiers liés existent', !absents.length, absents.join(', '));
regle('16', 'Vanilla : pas de framework ni de build', !/(react(-dom)?(\.production)?(\.min)?\.js|vue(\.global)?(\.prod)?(\.min)?\.js|angular|svelte|from\s+['"](react|vue)['"]|require\(['"](react|vue)['"]\))/i.test(html + js) && !existe('vite.config.js') && !existe('webpack.config.js'));
regle('17', 'Pas de gestionnaire d’événement dans le HTML (onclick=…), compatible CSP', !/\son(click|load|submit|change|input)=/i.test(html + js.replace(/\.on(click|load|submit|change|input)\s*=/g, '')));
regle('18', 'CSP déclarée (meta ou en-têtes de l’hébergeur)', /Content-Security-Policy/i.test(html) || existe('_headers') || existe('vercel.json'), '', false);
regle('19', 'Chemins d’API relatifs (/api/…), pas d’adresse de serveur en dur', !/fetch\(\s*['"`]https?:\/\/(?!localhost)/.test(js), '', true);
regle('20', 'Valeurs échappées avant innerHTML (fonction esc)', !/innerHTML\s*=/.test(js) || /esc\s*\(/.test(js), '', true);
regle('21', 'Scripts externes en version fixe', scripts.filter(s => /^https?:/.test(s)).every(s => /@\d+\.\d+\.\d+|\/\d+\.\d+\.\d+\//.test(s)), scripts.filter(s => /^https?:/.test(s)).join(', '));

console.log(`Recette PWA — ${racine}\n`);
resultats.forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${!r.ok && r.recommande ? ' (recommandé)' : ''}`));
const ko = resultats.filter(r => !r.ok && !r.recommande).length;
console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (teste ensuite sur téléphone, hors ligne et dans la console : KIT.md § 7).');
process.exitCode = ko ? 1 : 0;
