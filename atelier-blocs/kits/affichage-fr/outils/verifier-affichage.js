/* outils/verifier-affichage.js — recette « Affichage France » (OUTIL DE DÉVELOPPEMENT, pas livré avec l'app)
   Kit « Affichage France » de l'Atelier de Blocs. Node 18+, sans dépendance.
   node outils/verifier-affichage.js [dossier de l'app]   → « Conforme » (code 0) ou « Non conforme » (code 1) */
'use strict';
const fs = require('fs'), path = require('path');
const racine = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || '.');
const IGNORER = /(^|\/)(node_modules|\.git|dist|build|vendor|outils|exemples|coverage|tests?)(\/|$)|\.min\.js$|(^|\/)affichage\.js$|(^|\/)bandeau-cookies\.js$/;
function fichiers(dossier, out = []) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name), rel = path.relative(racine, p).split(path.sep).join('/');
    if (IGNORER.test(rel)) continue;
    if (e.isDirectory()) fichiers(p, out); else if (/\.(html?|js|jsx|tsx?|vue|svelte|md)$/i.test(e.name)) out.push(rel);
  }
  return out;
}
const tous = fichiers(racine);
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');
const code = tous.filter(f => !/\.md$/i.test(f));
const html = code.filter(f => /\.html?$/i.test(f));
const js = code.filter(f => !/\.html?$/i.test(f));
const T = Object.fromEntries(code.map(f => [f, lire(f)]));
const toutCode = Object.values(T).join('\n');
const resultats = [];
const regle = (num, texte, ok, detail, recommande) => resultats.push({ num, texte, ok: !!ok, detail: detail || '', recommande });
const extrait = a => a.slice(0, 5).join(' ; ') + (a.length > 5 ? ` … (+${a.length - 5})` : '');
const chercher = (re, liste) => {
  const out = [];
  for (const f of liste || code) T[f].split('\n').forEach((l, i) => { if (!/^\s*(\/\/|\*|<!--)/.test(l) && re.test(l)) out.push(`${f}:${i + 1}`); });
  return out;
};

/* Textes visibles : contenu des balises HTML et chaînes du code. */
function textesVisibles() {
  const out = [];
  for (const f of code) {
    let t = T[f];
    if (/\.html?$/i.test(f)) {
      t = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ');
      for (const m of t.matchAll(/>([^<>]+)</g)) out.push(m[1].trim());
      for (const m of t.matchAll(/\b(placeholder|title|aria-label|alt|value)=["']([^"']+)["']/gi)) out.push(m[2]);
    } else {
      for (const m of t.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) if (/[a-zàâçéèêëîïôûùüÿœ]{2}/i.test(m[2]) && !/^[\w./#:-]+$/.test(m[2]) || /\s/.test(m[2])) out.push(m[2].replace(/<[^>]*>|\$\{[^}]*\}/g, ' ').trim());
    }
  }
  return out.filter(Boolean);
}
const visibles = textesVisibles();

const sansLang = html.filter(f => !/<html[^>]*\blang=["']fr/i.test(T[f]) && /<html/i.test(T[f]));
regle('01', 'Pages en français (<html lang="fr">)', !sansLang.length, extrait(sansLang));

const prixMain = chercher(/(toFixed\(\s*2\s*\)|\+\s*['"`]\s*(€|EUR)|(€|EUR)\s*['"`]\s*\+|\}\s*(€|EUR)\b|['"`]\s*\+\s*['"`]?\s*€)/);
regle('02', 'Aucun prix formaté à la main (toFixed(2), « + ' + "' €' »" + ') : fr.prix()', !prixMain.length, extrait(prixMain));

const anglais = chercher(/(toLocale(Date|Time)?String\(\s*['"`]en|Intl\.\w+\(\s*['"`]en|currency:\s*['"`]USD|MM\/DD|\bmm\/dd\b)/);
regle('03', 'Aucun format anglais (en-US, USD, MM/DD)', !anglais.length, extrait(anglais));

const parle = /€|prix|montant|tarif|total|\bdate\b|toLocale|Intl\./i.test(toutCode);
regle('04', 'Formats centralisés : affichage.js (fr.prix, fr.date…) ou Intl en fr-FR', !parle || /\bfr\.(prix|date|heure|nombre)|appli\.(prix|date)|affichage\.js|Intl\.\w+\(\s*['"`]fr/.test(toutCode), '', true);

const liens = toutCode;
const aMentions = tous.some(f => /mentions/i.test(f)) || /mentions[ -]l[ée]gales/i.test(liens);
regle('05', 'Mentions légales accessibles (page ou lien « Mentions légales »)', aMentions);

const collecte = /type=["'](email|tel|password)["']|name=["'](email|telephone|tel|nom|adresse)["']|auth\.signUp|signInWith/i.test(toutCode);
const aConf = tous.some(f => /confidentialit|privacy|donnees-personnelles/i.test(f)) || /politique de confidentialit|donn[ée]es personnelles/i.test(liens);
regle('06', 'Politique de confidentialité si l’app collecte des données personnelles', !collecte || aConf, 'champ email / téléphone / compte trouvé, aucune page de confidentialité');

const paie = /stripe|checkout|paiement|payment|paypal|\bpayer\b/i.test(toutCode);
const aCgv = tous.some(f => /cgv|conditions/i.test(f)) || /conditions g[ée]n[ée]rales de vente|\bCGV\b/.test(liens);
regle('07', 'CGV accessibles si l’app fait payer', !paie || aCgv, 'paiement trouvé, aucune CGV');

const traceurs = chercher(/(googletagmanager|google-analytics|gtag\(|connect\.facebook\.net|fbq\(|hotjar|clarity\.ms|static\.ads-twitter|snap\.licdn|tiktok\.com\/i18n|matomo\.js|piwik\.js)/);
regle('08', 'Traceurs soumis au consentement → bandeau avec refus (bandeau-cookies.js)', !traceurs.length || /bandeau-cookies|consentement\.a\(|tarteaucitron|axeptio|didomi/i.test(toutCode), extrait(traceurs));

const MOTS_EN = /^(Submit|Cancel|Loading\.{0,3}|Sign in|Sign up|Sign out|Log in|Log out|Logout|Login|Register|Search|Save|Delete|Edit|Settings|Next|Previous|Back|Close|Welcome|Error|Password|Email address|Forgot password\??|Home|Profile|Add|Remove|Update|Confirm|Yes|No|OK, got it|Accept|Decline|Continue|Required|Optional|Untitled|No results( found)?|Something went wrong\.?)$/i;
const en = [...new Set(visibles.filter(v => MOTS_EN.test(v)))];
regle('09', 'Aucun texte d’interface en anglais', !en.length, extrait(en.map(v => `« ${v} »`)));

const ht = /\bHT\b|hors taxes/.test(visibles.join('\n'));
regle('10', 'Prix affichés TTC (si « HT » apparaît, « TTC » aussi)', !ht || /\bTTC\b|toutes taxes/.test(visibles.join('\n')), '', true);

const v = visibles.join('\n');
const tu = (v.match(/\b(tu|ton|ta|tes|toi|t’|t')\b(?=\s|[a-zàâéèêîôû])/gi) || []).length + (v.match(/\b(connecte-toi|inscris-toi|vérifie|saisis|choisis)\b/gi) || []).length;
const vous = (v.match(/\b(vous|votre|vos)\b/gi) || []).length;
regle('11', 'Tutoiement ou vouvoiement constant dans toute l’app', !(tu >= 2 && vous >= 2), `tutoiement ×${tu}, vouvoiement ×${vous}`, true);

const fauxPluriel = chercher(/[\wÀ-ÿ]\(s\)/);
regle('12', 'Pluriels accordés (fr.pluriel) plutôt que « élément(s) »', !fauxPluriel.length, extrait(fauxPluriel), true);

console.log(`Recette affichage France — ${racine}\n`);
resultats.forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${!r.ok && r.recommande ? ' (recommandé)' : ''}`));
const ko = resultats.filter(r => !r.ok && !r.recommande).length;
console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (relis ensuite chaque écran : KIT.md § 8).');
process.exitCode = ko ? 1 : 0;
