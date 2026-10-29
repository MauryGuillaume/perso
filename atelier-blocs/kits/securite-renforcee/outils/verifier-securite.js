/* outils/verifier-securite.js — recette de sécurité d'un projet (OUTIL DE DÉVELOPPEMENT, pas livré avec l'app)
   Kit « Cybersécurité renforcée » de l'Atelier de Blocs. Node 18+, sans dépendance.

   node outils/verifier-securite.js [dossier]                 analyse le code (lecture seule)
   node outils/verifier-securite.js [dossier] --url https://… ajoute les contrôles du site en ligne (en-têtes, HTTPS, fichiers exposés)
   node outils/verifier-securite.js [dossier] --niveau base   niveau du kit « Cybersécurité de base » (moins de règles obligatoires)

   Code de sortie 0 = « Conforme » (aucune règle obligatoire en échec), 1 sinon.
   Les valeurs trouvées sont masquées dans le rapport : il peut être partagé. */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const iUrl = args.indexOf('--url');
const url = iUrl >= 0 ? args[iUrl + 1] : '';
const iNiv = args.indexOf('--niveau');
const niveau = iNiv >= 0 ? args[iNiv + 1] : 'renforce';
const racine = path.resolve(args.find((a, i) => !a.startsWith('--') && !(iUrl >= 0 && i === iUrl + 1) && !(iNiv >= 0 && i === iNiv + 1)) || '.');
/* Niveau « base » : ces règles deviennent des recommandations. */
const RECOMMANDE_EN_BASE = new Set(['09', '10', '23', '25']);

const IGNORE = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor|outils)(\/|$)/;
const TEXTE = /\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte|html?|php|py|rb|go|json|ya?ml|toml|sql|sh|env|example|md|txt|conf|ini)$|(^|\/)(\.env[^/]*|Dockerfile|_headers)$/i;
const masquer = s => s.length <= 8 ? '••••' : s.slice(0, 4) + '••••' + s.slice(-2);

function lister(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), rel = path.relative(racine, p).split(path.sep).join('/');
    if (IGNORE.test(rel)) continue;
    if (e.isDirectory()) lister(p, out);
    else if (TEXTE.test(rel) && fs.statSync(p).size < 3e6) out.push({ rel, texte: fs.readFileSync(p, 'utf8') });
  }
  return out;
}
const fichiers = lister(racine);
const code = fichiers.filter(f => /\.(js|mjs|cjs|ts|tsx|jsx|vue|svelte|html?|php|py|rb|go)$/i.test(f.rel) && !/\.min\.js$/.test(f.rel));
const front = code.filter(f => !/(^|\/)(api|server|serveur|backend|functions|supabase|db|scripts?)\//i.test(f.rel) && !/(^|\/)(server|serveur)\.(js|ts)$/.test(f.rel));

const resultats = [];
/** trouve : [{ rel, ligne, extrait }] */
function regle(num, texte, trouves, recommande) {
  resultats.push({ num, texte, trouves: trouves || [], recommande: !!recommande || (niveau === 'base' && RECOMMANDE_EN_BASE.has(num)) });
}
function chercher(liste, re, filtre) {
  const out = [];
  liste.forEach(f => f.texte.split('\n').forEach((l, i) => {
    let m; re.lastIndex = 0;
    while ((m = re.exec(l))) {
      if (!filtre || filtre(m, l, f)) out.push({ rel: f.rel, ligne: i + 1, extrait: masquer(m[1] || m[0]) });
      if (!re.global) break;
    }
  }));
  return out;
}

// --- Code ---
const SECRETS = [
  /\b(sk_live_[0-9a-zA-Z]{10,})/g, /\b(rk_live_[0-9a-zA-Z]{10,})/g, /\b(whsec_[0-9a-zA-Z]{16,})/g,
  /\b(AKIA[0-9A-Z]{16})\b/g, /\b(sk-ant-[0-9a-zA-Z_-]{20,})/g, /\b(sk-(?:proj-)?[0-9a-zA-Z_-]{32,})/g, /\b(xox[bpa]-[0-9a-zA-Z-]{10,})/g,
  /\b(ghp_[0-9a-zA-Z]{30,})/g, /\b(AIza[0-9A-Za-z_-]{35})\b/g, /(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g,
  /(postgres(?:ql)?:\/\/[^:\s'"]+:[^@\s'"]{3,}@[^\s'"]+)/g, /(mysql:\/\/[^:\s'"]+:[^@\s'"]{3,}@[^\s'"]+)/g
];
const nonExemple = f => !/\.(example|exemple|sample|md)$/i.test(f.rel);
const commentaire = l => /^\s*(\/\/|\*|\/\*|#|--)/.test(l);
const factice = m => /:(\$\{?|<|%|\{\{)|:(motdepasse|mot_de_passe|password|pass|secret|changeme|change-me|xxx+|\*+|user|utilisateur)@/i.test(m[1] || m[0]);
regle('01', 'Aucune clé secrète écrite dans le code ou la configuration', SECRETS.flatMap(re => chercher(fichiers.filter(nonExemple), re, (m, l) => !commentaire(l) && !factice(m))));
const jwtServiceRole = chercher(front, /(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/g, m => {
  try { return /service_role/.test(Buffer.from(m[1].split('.')[1], 'base64').toString()); } catch (e) { return false; }
});
regle('02', 'Pas de clé service_role Supabase côté navigateur', jwtServiceRole.concat(chercher(front, /(SERVICE_ROLE[_A-Z]*)/g, (m, l) => /process\.env|import\.meta\.env|Deno\.env/.test(l))));
regle('03', 'Pas de variable publique contenant un secret (NEXT_PUBLIC_, VITE_, PUBLIC_)', chercher(fichiers, /\b((?:NEXT_PUBLIC|VITE|PUBLIC|REACT_APP|EXPO_PUBLIC)_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|MOT_DE_PASSE|TOKEN|WEBHOOK)[A-Z0-9_]*)/g));
regle('04', 'Pas de fichier .env dans le projet livré', fichiers.filter(f => /(^|\/)\.env(\.local|\.production|\.prod)?$/.test(f.rel)).map(f => ({ rel: f.rel, ligne: 0, extrait: 'fichier' })));
regle('05', 'Ni eval ni new Function ni setTimeout avec du texte', chercher(code, /\b(eval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`])/g));
regle('06', 'Pas de SQL construit par concaténation', chercher(code, /((?:query|execute|exec|raw|prepare)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*\b(?:select|insert|update|delete)\b[^'"]*['"]\s*\+))/gi));
regle('07', 'Pas de HTML injecté sans échappement (innerHTML avec une variable)', chercher(front, /(\.(?:innerHTML|outerHTML)\s*\+?=\s*(?!['"`]\s*;?$)(?![^;]*\besc(?:ape)?\w*\()[^;]*(?:\$\{|\+\s*[a-zA-Z_]))/g, (m, l) => !/esc|escape|sanitize|DOMPurify/i.test(l)), true);
regle('08', 'Aucune ressource chargée en http://', chercher(code.filter(f => /\.html?$|\.(js|ts|css)$/.test(f.rel)), /((?:src|href|action)\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1)[^"']+|fetch\(\s*["']http:\/\/(?!localhost|127\.0\.0\.1)[^"']+)/g));
regle('09', 'CORS jamais ouvert à tous avec des identifiants', chercher(code, /(Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*['"]|origin\s*:\s*['"]\*['"]|origin\s*:\s*true)/g));
regle('10', 'Fonctions Supabase : verify_jwt = false réservé aux webhooks', chercher(fichiers.filter(f => /config\.toml$/.test(f.rel)), /(verify_jwt\s*=\s*false)/g, (m, l, f) => true), true);
regle('11', 'Pas de jeton ni de mot de passe dans localStorage', chercher(front, /(localStorage\.setItem\(\s*['"`][^'"`]*(?:token|jeton|jwt|password|mdp|secret|session)[^'"`]*['"`])/gi));
regle('12', 'Webhooks : signature vérifiée', (() => {
  const webhooks = code.filter(f => /webhook/i.test(f.rel));   // routes ou fonctions nommées « webhook »
  return webhooks.filter(f => !/constructEvent|verifySignature|timingSafeEqual|createHmac|signature/i.test(f.texte)).map(f => ({ rel: f.rel, ligne: 0, extrait: 'aucune vérification de signature' }));
})());
const pkg = fichiers.filter(f => /(^|\/)package\.json$/.test(f.rel));
regle('13', 'Dépendances en version fixe (package-lock.json présent)', pkg.filter(f => !fs.existsSync(path.join(racine, path.dirname(f.rel), 'package-lock.json')) && !fs.existsSync(path.join(racine, path.dirname(f.rel), 'pnpm-lock.yaml')) && !fs.existsSync(path.join(racine, path.dirname(f.rel), 'yarn.lock'))).map(f => ({ rel: f.rel, ligne: 0, extrait: 'pas de fichier de verrouillage' })), true);
regle('14', 'Scripts externes avec integrity (SRI)', chercher(code.filter(f => /\.html?$/.test(f.rel)), /(<script[^>]+src=["']https?:\/\/[^"']+["'][^>]*>)/g, (m) => !/integrity=/.test(m[1])), true);
regle('15', 'Erreurs : pas de trace technique renvoyée au client', chercher(code, /(res\.(?:send|json|end)\([^)]*(?:err|e|error)\.(?:stack|message)\b)/g), true);

async function enLigne() {
  if (!url) return;
  const u = new URL(url);
  let r;
  try { r = await fetch(u, { redirect: 'manual' }); } catch (e) { regle('20', 'Site joignable', [{ rel: url, ligne: 0, extrait: e.message }]); return; }
  regle('20', 'Site en HTTPS', u.protocol === 'https:' ? [] : [{ rel: url, ligne: 0, extrait: 'http' }]);
  if (u.protocol === 'https:') {
    try {
      const h = await fetch('http://' + u.host + u.pathname, { redirect: 'manual' });
      regle('21', 'http:// redirige vers https://', h.status >= 300 && h.status < 400 && /^https:/.test(h.headers.get('location') || '') ? [] : [{ rel: 'http://' + u.host, ligne: 0, extrait: String(h.status) }]);
    } catch (e) { /* port 80 fermé : rien à rediriger */ }
  }
  if (r.status >= 300 && r.status < 400) r = await fetch(new URL(r.headers.get('location'), u));
  const h = n => r.headers.get(n) || '';
  const manque = (n, ok) => ok ? [] : [{ rel: n, ligne: 0, extrait: h(n) ? masquer(h(n)) : 'absent' }];
  regle('22', 'En-tête Strict-Transport-Security (HSTS)', manque('strict-transport-security', /max-age=\d{7,}/.test(h('strict-transport-security'))));
  regle('23', 'En-tête Content-Security-Policy', manque('content-security-policy', !!h('content-security-policy') && !/unsafe-eval/.test(h('content-security-policy'))));
  regle('24', 'X-Content-Type-Options: nosniff', manque('x-content-type-options', /nosniff/i.test(h('x-content-type-options'))));
  regle('25', 'Protection contre l’affichage dans un cadre (frame-ancestors ou X-Frame-Options)', manque('frame-ancestors', /frame-ancestors/.test(h('content-security-policy')) || /deny|sameorigin/i.test(h('x-frame-options'))));
  regle('26', 'Referrer-Policy', manque('referrer-policy', !!h('referrer-policy')), true);
  regle('27', 'Permissions-Policy', manque('permissions-policy', !!h('permissions-policy')), true);
  regle('28', 'Pas de version de serveur annoncée', manque('x-powered-by', !h('x-powered-by')), true);
  const exposes = [];
  for (const f of ['.env', '.git/config', 'package.json', '.env.local', 'config.json', 'backup.sql', 'dump.sql']) {
    try { const x = await fetch(new URL('/' + f, u)); const t = x.ok ? await x.text() : ''; if (x.ok && !/<html/i.test(t.slice(0, 300)) && t.length) exposes.push({ rel: '/' + f, ligne: 0, extrait: 'accessible' }); } catch (e) { /* ignoré */ }
  }
  regle('29', 'Aucun fichier sensible accessible en ligne (.env, .git, dumps)', exposes);
}

enLigne().then(() => {
  console.log(`Recette de sécurité${niveau === 'base' ? ' (niveau base)' : ''} — ${racine}${url ? ' + ' + url : ''} (${fichiers.length} fichiers lus)\n`);
  resultats.forEach(r => {
    const ok = !r.trouves.length;
    console.log(`  ${ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!ok && r.recommande ? ' (recommandé)' : ''}`);
    r.trouves.slice(0, 8).forEach(t => console.log(`      ${t.rel}${t.ligne ? ':' + t.ligne : ''}  ${t.extrait}`));
    if (r.trouves.length > 8) console.log(`      … et ${r.trouves.length - 8} autre(s)`);
  });
  const ko = resultats.filter(r => r.trouves.length && !r.recommande).length;
  console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (complète avec l’audit de sécurité de l’Atelier et les tests à la main de la section Recette du KIT.md).');
  process.exitCode = ko ? 1 : 0;
});
