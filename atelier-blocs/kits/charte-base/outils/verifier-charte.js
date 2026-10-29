/* outils/verifier-charte.js — recette de la charte (OUTIL DE DÉVELOPPEMENT, pas livré avec l'app)
   Kit « Charte de base » de l'Atelier de Blocs. Node 18+, sans dépendance.
   node outils/verifier-charte.js [dossier de l'app] [--tokens chemin/tokens.json]
   → « Conforme » (code 0) ou « Non conforme » (code 1). */
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const iTok = args.indexOf('--tokens');
const cheminTokens = iTok >= 0 ? args[iTok + 1] : null;
const racine = path.resolve(args.find((a, i) => !a.startsWith('--') && !(iTok >= 0 && i === iTok + 1)) || '.');

const IGNORER = /(^|\/)(node_modules|\.git|dist|build|vendor|outils|exemples)(\/|$)|\.min\.(js|css)$/;
function fichiers(dossier, out = []) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name), rel = path.relative(racine, p).split(path.sep).join('/');
    if (IGNORER.test(rel)) continue;
    if (e.isDirectory()) fichiers(p, out); else if (/\.(css|html?|js|jsx|tsx?|vue|svelte)$/i.test(e.name)) out.push(rel);
  }
  return out;
}

/* Les jetons : tokens.json indiqué, sinon charte/tokens.json de l'app, sinon celui du kit. */
const candidats = [cheminTokens && path.resolve(cheminTokens), path.join(racine, 'charte/tokens.json'), path.join(racine, 'tokens.json'), path.join(__dirname, '../charte/tokens.json')].filter(Boolean);
const fichierTokens = candidats.find(f => fs.existsSync(f));
let tokens = null;
try { tokens = JSON.parse(fs.readFileSync(fichierTokens, 'utf8')); } catch (e) { tokens = null; }

/* Couleurs */
const NOMMEES = { white: '#ffffff', black: '#000000' };
function hex(c) {
  c = String(c).trim().toLowerCase();
  if (NOMMEES[c]) return NOMMEES[c];
  let m = c.match(/^#([0-9a-f]{3,8})$/);
  if (m) { let h = m[1]; if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(x => x + x).join(''); return '#' + h.slice(0, 6); }
  m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
  return null;
}
function luminance(h) {
  const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const contraste = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const resultats = [];
const regle = (num, texte, ok, detail, recommande) => resultats.push({ num, texte, ok: !!ok, detail: detail || '', recommande });

regle('01', 'Jetons de la charte lisibles (tokens.json)', tokens && tokens.couleurs, fichierTokens || 'introuvable');
if (!tokens || !tokens.couleurs) { fin(); return; }
const couleurs = Object.fromEntries(Object.entries(tokens.couleurs).map(([k, v]) => [k, hex(v)]));
const permises = new Set(Object.values(couleurs).concat(['#ffffff', '#000000']));
const ombre = (tokens.ombre || '').match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) || [];
ombre.forEach(c => permises.add(hex(c)));

const faibles = (tokens.contrastes || []).map(([a, b]) => [a, b, couleurs[a] && couleurs[b] ? contraste(couleurs[a], couleurs[b]) : 0]).filter(([, , r]) => r < 4.5);
regle('02', 'Contraste d’au moins 4,5:1 pour chaque paire texte / fond de la charte', !faibles.length, faibles.map(([a, b, r]) => `${a} sur ${b} : ${r.toFixed(2)}`).join(' ; '));

const liste = fichiers(racine);
regle('03', 'Fichiers CSS, HTML ou JS trouvés', liste.length, 'aucun');

/* Une feuille qui (re)définit les variables de la charte est la source : on ne la contrôle pas pour les couleurs. */
const sources = new Set();
const hors = [], polices = [], ombres = [], inconnues = new Set(), rayons = [];
const vars = new Set(['primaire', 'accent', 'fond', 'texte', 'carte', 'bordure', 'doux', 'danger', 'succes', 'alerte', 'sur-primaire', 'sur-accent', 'police', 'rayon', 'ombre',
  't-petit', 't-normal', 't-titre', 't-grand-titre', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
const textes = {};
for (const f of liste) {
  let t = fs.readFileSync(path.join(racine, f), 'utf8');
  textes[f] = t;
  for (const m of t.matchAll(/--([\w-]+)\s*:/g)) vars.add(m[1]);
  if (/:root\s*\{[^}]*--primaire\s*:/.test(t)) sources.add(f);
}
for (const f of liste) {
  if (sources.has(f)) continue;
  const t = textes[f].replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const lignes = t.split('\n');
  lignes.forEach((l, i) => {
    const ou = `${f}:${i + 1}`;
    if (/^\s*\/\//.test(l)) return;
    for (const m of l.matchAll(/(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/g)) {
      const avant = l.slice(0, m.index);
      if (/(href|src|action|id|for)=["'][^"']*$/i.test(avant) || /&$/.test(avant) || /location\.hash|['"`]$/.test(avant) && !/(color|background|border|fill|stroke|shadow|outline)/i.test(avant)) continue;
      const h = hex(m[1]);
      if (!h || !permises.has(h)) hors.push(`${ou} ${m[1]}`);
    }
    for (const m of l.matchAll(/font-family\s*:\s*([^;"}]+)/gi)) if (!/^\s*(var\(--police\)|inherit)\s*$/i.test(m[1])) polices.push(`${ou} ${m[1].trim()}`);
    for (const m of l.matchAll(/(?:^|[;{\s"'])font\s*:\s*([^;"}]+)/gi)) if (!/var\(--police\)|inherit/i.test(m[1])) polices.push(`${ou} font: ${m[1].trim()}`);
    for (const m of l.matchAll(/box-shadow\s*:\s*([^;"}]+)/gi)) if (!/^\s*(var\(--ombre\)|none|inherit)\s*$/i.test(m[1])) ombres.push(`${ou} ${m[1].trim()}`);
    for (const m of l.matchAll(/border-radius\s*:\s*([^;"}]+)/gi)) if (!/var\(--rayon\)|^\s*(0|50%|999px|inherit)\s*$/i.test(m[1])) rayons.push(`${ou} ${m[1].trim()}`);
    for (const m of l.matchAll(/var\(--([\w-]+)/g)) if (!vars.has(m[1])) inconnues.add(`--${m[1]}`);
  });
}
const extrait = a => a.slice(0, 6).join(' ; ') + (a.length > 6 ? ` … (+${a.length - 6})` : '');
regle('04', 'Aucune couleur en dehors de la charte', !hors.length, extrait(hors));
regle('05', 'Aucune autre police que var(--police)', !polices.length, extrait(polices));
regle('06', 'Aucune ombre autre que var(--ombre)', !ombres.length, extrait(ombres));
regle('07', 'Arrondis avec var(--rayon)', !rayons.length, extrait(rayons), true);
regle('08', 'Toutes les variables utilisées existent', !inconnues.size, [...inconnues].join(', '), true);
const html = Object.entries(textes).filter(([f]) => /\.html?$/i.test(f)).map(([, t]) => t).join('\n');
regle('09', 'Logo ou icône de l’app défini (link rel="icon" ou manifeste)', /rel=["'](icon|apple-touch-icon|manifest)["']/i.test(html) || fs.existsSync(path.join(racine, 'icone.svg')), '', true);
regle('10', 'Une seule feuille définit les variables de la charte', sources.size <= 1, [...sources].join(', '), true);
const ecarts = [];
for (const f of sources) {
  const root = (textes[f].match(/:root\s*\{([^}]*)\}/) || [])[1] || '';
  for (const m of root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) if (couleurs[m[1]] && hex(m[2]) && hex(m[2]) !== couleurs[m[1]]) ecarts.push(`--${m[1]} ${m[2].trim()} au lieu de ${couleurs[m[1]]}`);
}
regle('11', 'Les variables de la feuille source ont les valeurs de tokens.json', !ecarts.length, extrait(ecarts), true);
fin();

function fin() {
  console.log(`Recette charte — ${racine}\n`);
  resultats.forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${!r.ok && r.recommande ? ' (recommandé)' : ''}`));
  const ko = resultats.filter(r => !r.ok && !r.recommande).length;
  console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (compare ensuite chaque écran avec charte/apercu.html : KIT.md § 8).');
  process.exitCode = ko ? 1 : 0;
}
