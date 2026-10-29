/* ==========================================================================
   ab-audit.js — moteur d'audit de cybersécurité
   Trois cibles :
   - « atelier » : une app de la plateforme (son modèle + les fichiers générés) ;
   - « code »    : un dossier ou un ZIP de code source (Next, Vue, Express…) ;
   - « url »     : un site en ligne. Le serveur local (serveur.js) collecte
                   en-têtes, certificat, fichiers exposés, HTML et scripts ;
                   l'analyse se fait ici, avec les mêmes règles que le code.
   Chaque règle est rattachée à l'OWASP Top 10 (2021) et a une gravité.
   Résultat : un objet « audit » (score /100, note A à F, constats avec
   preuves masquées, corrections), enregistré dans la table « audits ».
   Analyse automatique : elle ne remplace pas un test d'intrusion manuel.
   ========================================================================== */
(function () {
  const U = AB.u;
  const A = AB.audit = {};
  A.VERSION = '1.0';

  A.GRAVITES = {
    critique: { label: 'Critique', poids: 25, ordre: 0, couleur: '#b71c1c', delai: 'Immédiat' },
    elevee: { label: 'Élevée', poids: 12, ordre: 1, couleur: '#e65100', delai: 'Sous 7 jours' },
    moyenne: { label: 'Moyenne', poids: 5, ordre: 2, couleur: '#f9a825', delai: 'Sous 30 jours' },
    faible: { label: 'Faible', poids: 2, ordre: 3, couleur: '#1565c0', delai: 'À planifier' },
    info: { label: 'Info', poids: 0, ordre: 4, couleur: '#607d8b', delai: 'Pour information' }
  };
  A.CATEGORIES = {
    A01: 'A01 Contrôle d’accès', A02: 'A02 Cryptographie et secrets', A03: 'A03 Injection',
    A04: 'A04 Conception', A05: 'A05 Configuration', A06: 'A06 Composants vulnérables',
    A07: 'A07 Authentification', A08: 'A08 Intégrité', A09: 'A09 Journalisation', A10: 'A10 SSRF'
  };

  /* ======================= Fichiers ======================= */

  const DOSSIERS_IGNORES = /(^|\/)(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|\.turbo|\.vercel|\.cache|coverage|vendor|__pycache__|\.venv|venv|Pods|\.idea|\.gradle)\//;
  const EXT_TEXTE = /\.(m?[jt]sx?|cjs|vue|svelte|html?|php|py|rb|go|java|kt|swift|dart|cs|sql|json|toml|ya?ml|sh|conf|ini|xml|prisma|md|txt|properties|map|astro)$/i;
  const NOMS_TEXTE = /(^|\/)(\.env[^/]*|\.gitignore|\.npmrc|\.htaccess|\.htpasswd|Dockerfile|_headers|_redirects|netlify\.toml)$/i;
  const NON_ANALYSES = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|[^/]+\.tsbuildinfo)$/;
  A.TAILLE_MAX = 3 * 1024 * 1024;

  /** Faut-il lire ce fichier ? */
  A.garder = (chemin, taille) => !DOSSIERS_IGNORES.test('/' + chemin) && (EXT_TEXTE.test(chemin) || NOMS_TEXTE.test(chemin)) && (taille === undefined || taille <= A.TAILLE_MAX);

  /** Code exécuté sur le serveur (et non envoyé au navigateur) ? */
  function estServeur(f) {
    return /(^|\/)(supabase\/functions|api|server|serveur|backend|functions|routes|controllers|middlewares?|prisma|migrations?|scripts|lib\/server|server-only)\//i.test(f.chemin)
      || /(^|\/)(serveur|server|app)\.(c?js|ts)$/.test(f.chemin) && /require\(['"](express|http|fastify)['"]\)|from ['"](express|fastify|node:http)['"]/.test(f.texte)
      || /^\s*['"]use server['"]/.test(f.texte) || /^\s*import\s+["']server-only["']/m.test(f.texte) || /\.(php|py|rb|go|java|kt|cs|sql|prisma|sh)$/i.test(f.chemin);
  }
  const estEnv = f => /(^|\/)\.env(\.[\w-]+)?$/.test(f.chemin) && !/\.(example|sample|template|dist|defaults?)$/i.test(f.chemin);

  /** Prépare les fichiers : lignes, côté client ou serveur, minifié ou non. */
  function preparer(fichiers) {
    return fichiers.filter(f => typeof f.texte === 'string').map(f => {
      const lignes = f.texte.split(/\r?\n/);
      const moyenne = f.texte.length / Math.max(1, lignes.length);
      return Object.assign({}, f, { lignes, serveur: f.serveur !== undefined ? f.serveur : estServeur(f), minifie: moyenne > 300, analyse: !NON_ANALYSES.test(f.chemin) });
    });
  }

  /* ======================= Secrets : motifs et masquage ======================= */

  const SECRETS = [
    { nom: 'Clé secrète Stripe (live)', re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{20,}/g, gravite: 'critique' },
    { nom: 'Clé secrète Stripe (test)', re: /\b(?:sk|rk)_test_[0-9a-zA-Z]{20,}/g, gravite: 'elevee' },
    { nom: 'Secret de webhook Stripe', re: /\bwhsec_[0-9a-zA-Z]{20,}/g, gravite: 'critique' },
    { nom: 'Clé API Anthropic', re: /\bsk-ant-[0-9A-Za-z_-]{20,}/g, gravite: 'critique' },
    { nom: 'Clé API OpenAI', re: /\bsk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g, gravite: 'critique' },
    { nom: 'Clé d’accès AWS', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, gravite: 'critique' },
    { nom: 'Jeton GitHub', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, gravite: 'critique' },
    { nom: 'Jeton Slack', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, gravite: 'elevee' },
    { nom: 'Clé API Brevo', re: /\bxkeysib-[a-f0-9]{64}-[A-Za-z0-9]{16}/g, gravite: 'elevee' },
    { nom: 'Clé API SendGrid', re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, gravite: 'elevee' },
    { nom: 'Clé API Google', re: /\bAIza[0-9A-Za-z_-]{35}\b/g, gravite: 'moyenne' },
    { nom: 'Clé privée', re: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g, gravite: 'critique' }
  ];
  const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

  /** Lit le contenu d'un JWT (sans vérifier la signature). */
  function lireJwt(jeton) {
    try { return JSON.parse(atob(jeton.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return null; }
  }

  /** Masque un secret : on garde le début pour le reconnaître, jamais la valeur. */
  const masquerValeur = v => v.length <= 10 ? '•'.repeat(v.length) : `${v.slice(0, Math.min(8, Math.floor(v.length / 3)))}••••••(${v.length} car.)`;
  A.masquer = function (texte) {
    let t = String(texte);
    SECRETS.forEach(s => { t = t.replace(s.re, masquerValeur); });
    t = t.replace(JWT, masquerValeur);
    // Valeurs affectées à un nom sensible : KEY=valeur, "password": "valeur"
    t = t.replace(/((?:secret|password|passwd|pwd|mdp|api[_-]?key|token|private[_-]?key|client[_-]?secret|service[_-]?role[_-]?key|auth)[\w-]*["']?\s*[:=]\s*["'`]?)([^"'`\s,;]{6,})/gi, (m, a, v) => /^(process\.env|import\.meta|Deno\.env|env\(|\$\{)/.test(v) ? m : a + masquerValeur(v));
    return t;
  };
  /** Extrait d'une ligne, raccourci et masqué. */
  const extrait = ligne => { const l = A.masquer(String(ligne).trim()); return l.length > 180 ? l.slice(0, 177) + '…' : l; };

  const SUBSTITUTS = /^(x{3,}|\.{3}|…|<.*>|your|votre|change|todo|example|exemple|test|dummy|placeholder|secret|password|motdepasse|null|undefined|true|false|\*+)|\$\{|process\.env|import\.meta|Deno\.env/i;

  /* ======================= Outils des règles ======================= */

  /** Parcourt les lignes des fichiers retenus et renvoie un constat par ligne qui correspond. */
  function chercher(ctx, filtre, re, test) {
    const out = [];
    ctx.fichiers.filter(f => f.analyse && filtre(f)).forEach(f => f.lignes.forEach((l, i) => {
      if (l.length > 5000 && !f.minifie) return;
      re.lastIndex = 0;
      const m = re.exec(l);
      if (m && (!test || test(l, m, f))) out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(f.minifie ? l.slice(Math.max(0, m.index - 60), m.index + 120) : l) });
    }));
    return out;
  }
  const code = f => /\.(m?[jt]sx?|cjs|vue|svelte|html?|php|astro)$/i.test(f.chemin);
  const client = f => code(f) && !f.serveur;
  const nonMinifie = f => !f.minifie;
  const tout = () => true;
  const contient = (ctx, re) => ctx.fichiers.some(f => re.test(f.texte));

  /** Version x.y.z lue dans package-lock.json (installée) ou package.json (demandée). */
  function versionsInstallees(ctx) {
    const v = {};
    ctx.fichiers.filter(f => /(^|\/)package\.json$/.test(f.chemin)).forEach(f => {
      try {
        const p = JSON.parse(f.texte);
        Object.entries(Object.assign({}, p.dependencies, p.devDependencies)).forEach(([n, spec]) => {
          v[n] = v[n] || { demande: spec, fichier: f.chemin, version: (String(spec).match(/\d+\.\d+\.\d+/) || [null])[0], dev: !!(p.devDependencies && p.devDependencies[n]) };
        });
      } catch (e) { /* package.json illisible */ }
    });
    ctx.fichiers.filter(f => /(^|\/)package-lock\.json$/.test(f.chemin)).forEach(f => {
      try {
        const p = JSON.parse(f.texte);
        Object.entries(p.packages || {}).forEach(([cle, info]) => {
          const n = cle.replace(/^.*node_modules\//, '');
          if (v[n] && cle === 'node_modules/' + n && info.version) { v[n].version = info.version; v[n].verrou = true; }
        });
      } catch (e) { /* lock illisible */ }
    });
    return v;
  }
  const cmp = (a, b) => U.cmpVersion(a, b);
  /** Vulnérabilités connues (sélection, octobre 2026) : [paquet, de, jusqu'à (exclu), gravité, référence]. */
  const VULNS = [
    ['next', '11.1.4', '12.3.5', 'critique', 'CVE-2025-29927 : contournement du middleware (authentification)'],
    ['next', '13.0.0', '13.5.9', 'critique', 'CVE-2025-29927 : contournement du middleware (authentification)'],
    ['next', '14.0.0', '14.2.25', 'critique', 'CVE-2025-29927 : contournement du middleware (authentification)'],
    ['next', '15.0.0', '15.0.5', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['next', '15.1.0', '15.1.9', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['next', '15.2.0', '15.2.6', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['next', '15.3.0', '15.3.6', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['next', '15.4.0', '15.4.8', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['next', '15.5.0', '15.5.7', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['next', '16.0.0', '16.0.7', 'critique', 'CVE-2025-55182/66478 : exécution de code à distance (React Server Components)'],
    ['react-server-dom-webpack', '19.0.0', '19.0.1', 'critique', 'CVE-2025-55182 : exécution de code à distance'],
    ['react-server-dom-webpack', '19.1.0', '19.1.2', 'critique', 'CVE-2025-55182 : exécution de code à distance'],
    ['react-server-dom-webpack', '19.2.0', '19.2.1', 'critique', 'CVE-2025-55182 : exécution de code à distance'],
    ['jsonwebtoken', '0.0.0', '9.0.0', 'elevee', 'CVE-2022-23529/23539/23540/23541 : vérification de jeton contournable'],
    ['lodash', '0.0.0', '4.17.21', 'elevee', 'CVE-2021-23337 / CVE-2020-8203 : injection de commande, pollution de prototype'],
    ['axios', '0.0.0', '0.21.1', 'elevee', 'CVE-2020-28168 : SSRF'],
    ['axios', '1.0.0', '1.8.2', 'moyenne', 'CVE-2025-27152 : SSRF et fuite d’identifiants via URL absolue'],
    ['express', '0.0.0', '4.20.0', 'moyenne', 'CVE-2024-29041 / CVE-2024-43796 : redirection ouverte, XSS'],
    ['multer', '0.0.0', '2.0.0', 'moyenne', 'CVE-2025-47935/47944 : déni de service'],
    ['body-parser', '0.0.0', '1.20.3', 'moyenne', 'CVE-2024-45590 : déni de service'],
    ['cookie', '0.0.0', '0.7.0', 'faible', 'CVE-2024-47764 : injection dans les attributs du cookie']
  ];

  /* ======================= Règles ======================= */
  // portee : 'code' (code source ou fichiers générés), 'url' (site en ligne), 'atelier' (modèle d'une app de la plateforme)
  // verifier(ctx) → [constat] (vide = conforme) ou null (non applicable)

  const R = A.REGLES = [];
  const regle = r => R.push(Object.assign({ portee: 'code', refs: [] }, r));

  /* ----- A02 Secrets ----- */
  regle({
    id: 'SEC-01', titre: 'Clé secrète ou jeton exposé dans le code', categorie: 'A02', gravite: 'critique',
    description: 'Une clé d’API, un jeton ou une clé privée est écrit en clair dans un fichier du projet.',
    impact: 'Toute personne qui lit le code (dépôt, navigateur, sauvegarde) peut utiliser la clé : paiements, envoi d’emails, accès aux données, facture d’API.',
    correction: 'Révoquer la clé immédiatement chez le fournisseur et en créer une nouvelle. La ranger dans une variable d’environnement du serveur (Supabase secrets, Vercel, hébergeur), jamais dans le code ni dans une variable publique. Purger l’historique git si elle y a été commitée.',
    refs: ['OWASP A02:2021', 'ASVS V2.10, V6.4', 'CWE-798'],
    verifier(ctx) {
      const out = [];
      ctx.fichiers.filter(f => f.analyse && !estEnv(f)).forEach(f => f.lignes.forEach((l, i) => {
        SECRETS.forEach(s => {
          s.re.lastIndex = 0;
          const m = s.re.exec(l);
          if (!m) return;
          const exemple = /\.(example|sample|template)$|README|\.md$/i.test(f.chemin);
          let g = s.gravite;
          if (f.serveur && g === 'critique') g = 'elevee';   // en dur côté serveur : grave, mais pas envoyé au navigateur
          if (exemple && /test|xxx|exemple|example/i.test(m[0])) return;
          out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(f.minifie ? l.slice(Math.max(0, m.index - 60), m.index + 100) : l), detail: `${s.nom}${f.serveur ? ' (code serveur)' : ' (envoyé au navigateur)'}`, gravite: g });
        });
      }));
      return out;
    }
  });
  regle({
    id: 'SEC-02', titre: 'Clé « service_role » Supabase hors du serveur', categorie: 'A02', gravite: 'critique',
    description: 'Un jeton Supabase de rôle service_role, ou une variable qui le désigne, est utilisé dans du code envoyé au navigateur.',
    impact: 'La clé service_role ignore toutes les règles RLS : n’importe qui peut lire, modifier et supprimer toute la base.',
    correction: 'Retirer la clé du front, la renouveler dans Supabase (Settings › API › Roll), et ne l’utiliser que dans les fonctions serveur (Deno.env.get). Le navigateur n’utilise que la clé « anon ».',
    refs: ['OWASP A01:2021', 'Supabase : API keys', 'CWE-522'],
    verifier(ctx) {
      const out = [];
      ctx.fichiers.filter(f => f.analyse).forEach(f => f.lignes.forEach((l, i) => {
        JWT.lastIndex = 0;
        let m;
        while ((m = JWT.exec(l))) {
          const p = lireJwt(m[0]);
          if (p && p.role === 'service_role') out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(l), detail: f.serveur ? 'Jeton service_role écrit en dur dans le code serveur' : 'Jeton service_role dans du code client', gravite: f.serveur && !estEnv(f) ? 'elevee' : 'critique' });
        }
        // Simple référence (process.env.SUPABASE_SERVICE_ROLE_KEY) : pas une fuite en soi, mais le fichier doit rester côté serveur
        if (client(f) && /SERVICE_ROLE|serviceRole|service_role_key/i.test(l) && !/^\s*(\/\/|\*|#)/.test(l)) out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(l), detail: 'Clé service_role utilisée dans un fichier qui n’est pas marqué serveur : ajouter import "server-only" et vérifier qu’il n’est jamais importé côté client', gravite: 'faible' });
      }));
      return out;
    }
  });
  regle({
    id: 'SEC-03', titre: 'Secret dans une variable publique (NEXT_PUBLIC_, VITE_…)', categorie: 'A02', gravite: 'critique',
    description: 'Une variable dont le nom évoque un secret porte un préfixe qui l’envoie au navigateur.',
    impact: 'Les variables NEXT_PUBLIC_, VITE_, REACT_APP_, EXPO_PUBLIC_ et NUXT_PUBLIC_ sont copiées dans le JavaScript public : le secret est lisible par tous.',
    correction: 'Renommer la variable sans préfixe public et ne la lire que côté serveur (route API, fonction serveur). Renouveler le secret s’il a déjà été déployé.',
    refs: ['OWASP A02:2021', 'CWE-200'],
    verifier: ctx => chercher(ctx, tout, /\b(?:NEXT_PUBLIC|VITE|REACT_APP|EXPO_PUBLIC|NUXT_PUBLIC|PUBLIC)_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|PASSWD|WEBHOOK|ADMIN|ANTHROPIC|OPENAI|CLAUDE|MISTRAL|GROQ|SENDGRID|BREVO|MAILGUN|RESEND|TWILIO|AWS_SECRET|GITHUB_TOKEN|DATABASE_URL|JWT|SMTP_PASS)[A-Z0-9_]*/)
  });
  regle({
    id: 'SEC-04', titre: 'Fichier .env avec des valeurs dans le projet', categorie: 'A02', gravite: 'elevee',
    description: 'Un fichier .env contenant des valeurs fait partie du code analysé.',
    impact: 'Si ce fichier est commité ou déployé, tous les secrets qu’il contient sont exposés.',
    correction: 'Vérifier que .env est dans .gitignore et absent du dépôt (git rm --cached .env) et du déploiement. Fournir un .env.example sans valeur. Renouveler les secrets s’il a été publié.',
    refs: ['OWASP A05:2021', 'CWE-538'],
    verifier(ctx) {
      const ignore = ctx.fichiers.filter(f => /(^|\/)\.gitignore$/.test(f.chemin)).some(f => /^\s*\/?\.env(\*|\b)/m.test(f.texte));
      return ctx.fichiers.filter(estEnv).map(f => {
        const sensibles = f.lignes.filter(l => /^\s*[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PASS|PRIVATE|DATABASE_URL)[A-Z0-9_]*\s*=\s*\S+/.test(l));
        if (!f.lignes.some(l => /^\s*[A-Z0-9_]+\s*=\s*\S+/.test(l))) return null;
        return { fichier: f.chemin, ligne: 1, extrait: extrait(sensibles[0] || ''), detail: `${sensibles.length} variable(s) sensible(s) renseignée(s)${ignore ? ' ; le fichier est ignoré par git, vérifier qu’il n’est pas déployé' : ' ; le fichier n’est PAS ignoré par git'}`, gravite: sensibles.length ? (ignore ? 'moyenne' : 'critique') : 'faible' };
      }).filter(Boolean);
    }
  });
  regle({
    id: 'SEC-05', titre: 'Mot de passe ou clé probable écrit en dur', categorie: 'A02', gravite: 'elevee',
    description: 'Une valeur littérale est affectée à un nom sensible (password, secret, apiKey, token…).',
    impact: 'Le secret est partagé avec toute personne qui a accès au code et ne peut pas être changé sans redéployer.',
    correction: 'Lire la valeur depuis une variable d’environnement du serveur et renouveler le secret.',
    refs: ['CWE-798', 'ASVS V2.10.4'],
    verifier: ctx => chercher(ctx, f => !estEnv(f) && !/\.(md|txt|example|sample)$/i.test(f.chemin) && nonMinifie(f) && !/(^|\/)(tests?|__tests__|spec|e2e|fixtures?)\//i.test(f.chemin),
      /(?:secret|password|passwd|pwd|api[_-]?key|apikey|auth[_-]?token|access[_-]?token|private[_-]?key|client[_-]?secret)["']?\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/i,
      (l, m) => !SUBSTITUTS.test(m[1]) && !/type=["']password|placeholder|label|name=|autocomplete|i18n|t\(/i.test(l) && /[0-9]/.test(m[1]) && /[A-Za-z]/.test(m[1]))
  });
  regle({
    id: 'SEC-06', titre: 'Identifiants dans une chaîne de connexion', categorie: 'A02', gravite: 'elevee',
    description: 'Une URL de base de données contient un utilisateur et un mot de passe.',
    impact: 'Accès direct à la base de données pour toute personne qui lit le code.',
    correction: 'Mettre la chaîne de connexion dans une variable d’environnement du serveur et changer le mot de passe de la base.',
    refs: ['CWE-798'],
    verifier: ctx => chercher(ctx, f => !estEnv(f) && !/\.(md|example)$/i.test(f.chemin), /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s"'`/]+:([^@\s"'`]{3,})@/i, (l, m) => !SUBSTITUTS.test(m[1]) && !/^(pass(word)?|mdp|postgres|root)$/i.test(m[1]))
  });

  /* ----- A03 Injection et XSS ----- */
  regle({
    id: 'INJ-01', titre: 'HTML construit avec des données non échappées (XSS)', categorie: 'A03', gravite: 'moyenne',
    description: 'innerHTML, outerHTML ou insertAdjacentHTML reçoit une chaîne assemblée avec des variables, sans fonction d’échappement visible.',
    impact: 'Si une variable contient une donnée saisie par un utilisateur, un script malveillant peut s’exécuter chez les autres utilisateurs (vol de session, actions à leur place).',
    correction: 'Utiliser textContent pour du texte, ou échapper chaque valeur (fonction esc) avant de l’insérer, ou passer par DOMPurify pour du HTML riche.',
    refs: ['OWASP A03:2021', 'ASVS V5.3.3', 'CWE-79'],
    verifier: ctx => chercher(ctx, f => client(f) && nonMinifie(f), /\.(?:innerHTML|outerHTML)\s*\+?=|insertAdjacentHTML\s*\(/,
      l => /\$\{|["'`]\s*\+\s*[\w.(]|\+\s*["'`]|,\s*[a-zA-Z_$][\w.$]*\s*\)/.test(l) && !/\b(esc|escape\w*|sanitize\w*|DOMPurify|encode\w*)\s*\(/i.test(l))
  });
  regle({
    id: 'INJ-02', titre: 'Insertion de HTML brut par le framework', categorie: 'A03', gravite: 'moyenne',
    description: 'dangerouslySetInnerHTML (React) ou v-html (Vue) insère du HTML sans échappement.',
    impact: 'Même risque XSS qu’innerHTML si le contenu vient d’un utilisateur ou d’une source externe.',
    correction: 'Afficher le texte normalement ({valeur} ou {{ valeur }}), ou nettoyer le HTML avec DOMPurify juste avant.',
    refs: ['OWASP A03:2021', 'CWE-79'],
    verifier: ctx => chercher(ctx, f => client(f) && nonMinifie(f), /dangerouslySetInnerHTML|\sv-html\s*=/, l => !/DOMPurify|sanitize/i.test(l))
  });
  regle({
    id: 'INJ-03', titre: 'Exécution de code dynamique (eval, new Function)', categorie: 'A03', gravite: 'elevee',
    description: 'Du texte est exécuté comme du code JavaScript.',
    impact: 'Si ce texte peut être influencé de l’extérieur, un attaquant exécute son propre code. Empêche aussi une CSP stricte.',
    correction: 'Remplacer par du code explicite (JSON.parse pour des données, tables de fonctions pour des actions).',
    refs: ['CWE-95', 'ASVS V5.2.4'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f), /(?:^|[^\w.])eval\s*\(|new\s+Function\s*\(|set(?:Timeout|Interval)\s*\(\s*["'`]/)
  });
  regle({
    id: 'INJ-04', titre: 'Requête SQL construite par concaténation', categorie: 'A03', gravite: 'elevee',
    description: 'Une requête SQL est assemblée avec des variables au lieu de paramètres.',
    impact: 'Injection SQL : lecture ou suppression de toute la base, contournement de l’authentification.',
    correction: 'Utiliser des requêtes paramétrées ($1, ?, :nom), le query builder de l’ORM, ou $queryRaw avec gabarit (jamais $queryRawUnsafe avec des données).',
    refs: ['OWASP A03:2021', 'CWE-89'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f),
      /\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(|\b(?:query|execute|exec|raw|whereRaw|prepare)\s*\(\s*`[^`]*\b(?:SELECT|INSERT|UPDATE|DELETE|WHERE)\b[^`]*\$\{|["'](?:SELECT|INSERT INTO|UPDATE|DELETE FROM)\b[^"']*["']\s*\+|\b(?:mysqli_query|query)\s*\([^)]*\$_(?:GET|POST|REQUEST|COOKIE)/i)
  });
  regle({
    id: 'INJ-05', titre: 'Commande système construite avec des variables', categorie: 'A03', gravite: 'elevee',
    description: 'exec, execSync ou spawn reçoit une commande assemblée avec des variables.',
    impact: 'Injection de commande : exécution de n’importe quelle commande sur le serveur.',
    correction: 'Utiliser execFile/spawn avec une liste d’arguments fixes, et valider strictement chaque valeur.',
    refs: ['CWE-78'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f), /\b(?:exec|execSync|spawnSync|spawn)\s*\(\s*(?:`[^`]*\$\{|["'][^"']*["']\s*\+)/)
  });
  regle({
    id: 'INJ-06', titre: 'Donnée de requête renvoyée ou utilisée sans contrôle', categorie: 'A03', gravite: 'elevee',
    description: 'Une valeur de la requête (query, body, params, $_GET…) est affichée, utilisée comme chemin de fichier ou comme adresse de redirection.',
    impact: 'XSS réfléchi, lecture de fichiers arbitraires (path traversal) ou redirection vers un site piégé.',
    correction: 'Valider la valeur (liste blanche, format), échapper à l’affichage, utiliser path.basename pour un nom de fichier, et n’autoriser que des redirections internes.',
    refs: ['CWE-22', 'CWE-601', 'CWE-79'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f),
      /\becho\s+\$_(?:GET|POST|REQUEST)|res\.send\(\s*req\.(?:query|body|params)|(?:readFile|readFileSync|sendFile|createReadStream)\s*\([^)]*req\.(?:query|params|body)|res\.redirect\(\s*req\.(?:query|body|params)/)
  });

  /* ----- A01 Contrôle d'accès / données (Supabase, Stripe) ----- */
  regle({
    id: 'ACC-01', titre: 'Table sans RLS (Row Level Security)', categorie: 'A01', gravite: 'elevee',
    description: 'Une table du schéma public est créée sans activer la RLS.',
    impact: 'Avec la clé publique « anon » (présente dans le front), n’importe qui peut lire et souvent modifier toute la table.',
    correction: 'Ajouter « alter table … enable row level security; » puis une politique par opération (select, insert, update, delete) limitée à l’utilisateur concerné.',
    refs: ['OWASP A01:2021', 'Supabase : Row Level Security', 'CWE-284'],
    verifier(ctx) {
      // RLS : propre à Supabase / PostgREST (une base derrière une API à soi, comme Prisma, se protège dans l'API)
      const sql = ctx.fichiers.filter(f => /\.sql$/i.test(f.chemin) && !/(^|\/)prisma\//.test(f.chemin) && (/(^|\/)supabase\//.test(f.chemin) || ctx.supabase));
      if (!sql.length) return null;
      const tout = sql.map(f => f.texte).join('\n').toLowerCase();
      const out = [];
      sql.forEach(f => f.lignes.forEach((l, i) => {
        const m = l.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?(\w+)"?/i);
        if (!m || /^(?:auth|storage|_)/.test(m[1]) || /create\s+table\s+(?:if\s+not\s+exists\s+)?"?(?!public)\w+"?\./i.test(l)) return;
        const re = new RegExp(`alter\\s+table\\s+(?:only\\s+)?(?:"?public"?\\.)?"?${m[1].toLowerCase()}"?\\s+enable\\s+row\\s+level\\s+security`);
        if (!re.test(tout)) out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(l), detail: `Table ${m[1]} : RLS non activée` });
      }));
      return out;
    }
  });
  regle({
    id: 'ACC-02', titre: 'Politique RLS trop permissive', categorie: 'A01', gravite: 'elevee',
    description: 'Une politique RLS autorise une écriture à tout le monde (using (true) ou with check (true)).',
    impact: 'Les règles d’accès existent mais ne protègent rien : tout utilisateur peut modifier ou supprimer les lignes des autres.',
    correction: 'Limiter la politique à l’utilisateur propriétaire (auth.uid() = utilisateur) ou au rôle service. Une insertion publique (formulaire de contact) doit être limitée en débit (captcha, fonction serveur).',
    refs: ['OWASP A01:2021', 'CWE-285'],
    verifier(ctx) {
      const out = [];
      ctx.fichiers.filter(f => /\.sql$/i.test(f.chemin)).forEach(f => {
        const re = /create\s+policy[\s\S]*?;/gi;
        let m;
        while ((m = re.exec(f.texte))) {
          const p = m[0].replace(/\s+/g, ' ');
          const ligne = f.texte.slice(0, m.index).split('\n').length;
          const op = (p.match(/\bfor (all|select|insert|update|delete)\b/i) || [0, 'all'])[1].toLowerCase();
          const ouvert = /using \(\s*true\s*\)|with check \(\s*true\s*\)/i.test(p);
          if (!ouvert || op === 'select') continue;
          const insertionPublique = op === 'insert';
          out.push({ fichier: f.chemin, ligne, extrait: extrait(p), detail: insertionPublique ? 'Insertion ouverte à tous : prévoir une limite anti-spam' : `Opération « ${op} » ouverte à tous`, gravite: insertionPublique ? 'faible' : 'elevee' });
        }
      });
      return out;
    }
  });
  regle({
    id: 'ACC-03', titre: 'Webhook sans vérification de signature', categorie: 'A08', gravite: 'elevee',
    description: 'Un point d’entrée de webhook (Stripe ou autre) traite des évènements sans vérifier leur signature.',
    impact: 'N’importe qui peut envoyer un faux évènement « paiement réussi » et obtenir le produit sans payer.',
    correction: 'Vérifier chaque appel avec le secret du webhook : stripe.webhooks.constructEvent(Async)(corps brut, en-tête stripe-signature, STRIPE_WEBHOOK_SECRET), ou une signature HMAC comparée en temps constant.',
    refs: ['OWASP A08:2021', 'Stripe : webhooks signatures', 'CWE-345'],
    verifier(ctx) {
      const out = [];
      ctx.fichiers.filter(f => code(f) && f.serveur && /webhook/i.test(f.chemin + (f.texte.match(/checkout\.session\.completed|payment_intent\.succeeded|invoice\.paid/) ? ' webhook' : ''))).forEach(f => {
        if (/constructEvent|verifyWebhook|verifySignature|timingSafeEqual|crypto\.subtle\.verify|svix|validateWebhook/i.test(f.texte)) return;
        out.push({ fichier: f.chemin, ligne: 1, extrait: extrait(f.lignes.find(l => /webhook|checkout\.session/i.test(l)) || f.lignes[0]), detail: 'Aucune vérification de signature trouvée dans ce fichier' });
      });
      return out;
    }
  });
  regle({
    id: 'ACC-04', titre: 'Montant de paiement fourni par le client', categorie: 'A04', gravite: 'elevee',
    description: 'Le montant envoyé à Stripe vient du corps de la requête au lieu d’être fixé côté serveur.',
    impact: 'Un utilisateur peut payer 0,01 € un produit qui en vaut 100.',
    correction: 'Le client envoie seulement un identifiant de produit ; le serveur lit le prix dans sa configuration ou sa base.',
    refs: ['OWASP A04:2021', 'CWE-602'],
    verifier: ctx => chercher(ctx, f => code(f) && f.serveur && nonMinifie(f), /(?:unit_amount|amount)\s*:\s*(?:Number\()?\s*(?:req\.body|body|params|data|payload)\.(?:amount|price|prix|montant|total)/i)
  });
  regle({
    id: 'ACC-05', titre: 'Fonction serveur ouverte sans session', categorie: 'A01', gravite: 'faible',
    description: 'Une fonction Supabase est déclarée avec verify_jwt = false : elle accepte les appels sans utilisateur connecté.',
    impact: 'Acceptable pour un webhook signé ; dangereux pour toute autre fonction, appelable par n’importe qui.',
    correction: 'Laisser verify_jwt = true sauf pour les webhooks, et vérifier la signature de ceux-ci (voir ACC-03).',
    refs: ['Supabase : Edge Functions auth'],
    verifier(ctx) {
      const conf = ctx.fichiers.filter(f => /config\.toml$/.test(f.chemin));
      if (!conf.length) return null;
      const out = [];
      conf.forEach(f => { let fn = ''; f.lignes.forEach((l, i) => {
        const m = l.match(/^\s*\[functions\.([\w-]+)\]/); if (m) fn = m[1];
        if (!/verify_jwt\s*=\s*false/.test(l)) return;
        // Une fonction qui compare un jeton partagé en temps constant (ex. stats-atelier) n'est pas ouverte à tous
        const code = (ctx.fichiers.find(x => x.chemin.endsWith('functions/' + fn + '/index.ts')) || { lignes: [] }).lignes.join('\n');
        const jeton = /(timingSafeEqual|egal)\(\s*req\.headers\.get\(/.test(code);
        out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(l), gravite: /webhook/i.test(fn) || jeton ? 'info' : 'moyenne',
          detail: `Fonction ${fn}${/webhook/i.test(fn) ? ' (webhook : vérifier sa signature)' : jeton ? ' (protégée par un jeton partagé comparé en temps constant)' : ' : n’est pas un webhook, vérifier que c’est voulu'}` });
      }); });
      return out;
    }
  });

  /* ----- A07 Authentification ----- */
  regle({
    id: 'AUT-01', titre: 'Jeton ou session stocké dans localStorage', categorie: 'A07', gravite: 'moyenne',
    description: 'Un jeton d’authentification est écrit à la main dans localStorage ou dans un cookie lisible en JavaScript.',
    impact: 'En cas de faille XSS, le jeton est volé et la session usurpée.',
    correction: 'Laisser la bibliothèque d’authentification gérer la session (Supabase Auth), ou utiliser un cookie HttpOnly, Secure, SameSite défini par le serveur.',
    refs: ['ASVS V3.2', 'CWE-922'],
    verifier: ctx => chercher(ctx, f => client(f) && nonMinifie(f), /localStorage\.setItem\(\s*["'`][^"'`]*(?:token|jwt|session|auth|bearer)|document\.cookie\s*=\s*[^;]*(?:token|jwt|session)/i)
  });
  regle({
    id: 'AUT-02', titre: 'Longueur minimale de mot de passe trop faible', categorie: 'A07', gravite: 'moyenne',
    description: 'Le code accepte des mots de passe de moins de 8 caractères.',
    impact: 'Mots de passe devinables en quelques minutes par force brute.',
    correction: 'Exiger au moins 12 caractères (kit Cybersécurité renforcée) côté client ET côté serveur (Supabase Auth : minimum_password_length).',
    refs: ['ASVS V2.1.1', 'ANSSI : mots de passe'],
    verifier: ctx => chercher(ctx, f => (code(f) || /config\.toml$/.test(f.chemin)) && nonMinifie(f),
      /(?:password|mot.?de.?passe|mdp|pwd)[\s\S]{0,60}?(?:minLength|min_length|minlength|\.min)\s*[(:=]\s*["']?([1-7])\b|minimum_password_length\s*=\s*([1-7])\b/i)
  });
  regle({
    id: 'AUT-03', titre: 'Hachage ou aléa faible pour un usage de sécurité', categorie: 'A02', gravite: 'moyenne',
    description: 'MD5/SHA-1 utilisé pour des mots de passe, Math.random pour un jeton, ou bcrypt avec un coût trop bas.',
    impact: 'Mots de passe retrouvables et jetons prévisibles.',
    correction: 'Mots de passe : bcrypt (coût ≥ 12) ou argon2, ou laisser faire Supabase Auth. Jetons : crypto.randomUUID() ou crypto.getRandomValues().',
    refs: ['OWASP A02:2021', 'CWE-327', 'CWE-338'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f),
      /createHash\(\s*["'](?:md5|sha1)["']|bcrypt\w*\.(?:hash|genSalt)(?:Sync)?\([^)]*,\s*(?:[1-9])\s*\)|Math\.random\(\)/,
      l => !/Math\.random/.test(l) || /token|secret|password|mdp|otp|nonce|salt|code_?verif|reset|invite/i.test(l))
  });
  regle({
    id: 'AUT-04', titre: 'Secret JWT écrit en dur', categorie: 'A07', gravite: 'elevee',
    description: 'jwt.sign ou jwt.verify reçoit une clé littérale.',
    impact: 'Toute personne qui lit le code peut fabriquer des jetons valides et se connecter en tant que n’importe qui.',
    correction: 'Lire la clé dans une variable d’environnement longue et aléatoire (32 octets minimum), et la renouveler.',
    refs: ['CWE-321'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f), /jwt\.(?:sign|verify)\s*\([^,]+,\s*["'`][^"'`]+["'`]/)
  });

  /* ----- A05 Configuration ----- */
  regle({
    id: 'CFG-01', titre: 'Vérification TLS désactivée', categorie: 'A05', gravite: 'elevee',
    description: 'Le code accepte des certificats HTTPS invalides.',
    impact: 'Les échanges avec les API peuvent être interceptés et modifiés (attaque de l’homme du milieu).',
    correction: 'Supprimer rejectUnauthorized: false et NODE_TLS_REJECT_UNAUTHORIZED=0 ; corriger le certificat du service appelé.',
    refs: ['CWE-295'],
    verifier: ctx => chercher(ctx, tout, /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0|verify\s*=\s*False/)
  });
  regle({
    id: 'CFG-02', titre: 'Ressource chargée en HTTP non chiffré', categorie: 'A02', gravite: 'moyenne',
    description: 'Un script, une feuille de style, un formulaire ou un appel réseau utilise http://.',
    impact: 'Le contenu peut être modifié en chemin (script injecté) ; les données envoyées circulent en clair.',
    correction: 'Passer toutes les adresses en https:// (ou en chemin relatif).',
    refs: ['OWASP A02:2021', 'CWE-319'],
    verifier: ctx => chercher(ctx, f => code(f), /(?:src|href|action)\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|www\.w3\.org)|fetch\(\s*["'`]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)|axios\.\w+\(\s*["'`]http:\/\/(?!localhost|127\.0\.0\.1)/,
      l => !/<a\s/i.test(l) || /<(script|link|iframe|form|img)/i.test(l))
  });
  regle({
    id: 'CFG-03', titre: 'Script externe sans contrôle d’intégrité (SRI)', categorie: 'A08', gravite: 'faible',
    description: 'Une balise <script> charge un fichier d’un autre domaine sans attribut integrity.',
    impact: 'Si le CDN est compromis, le script modifié s’exécute dans l’app avec tous les droits de l’utilisateur.',
    correction: 'Ajouter integrity="sha384-…" et crossorigin="anonymous" (empreinte donnée par le CDN, ex. srihash.org), ou héberger le fichier avec l’app.',
    refs: ['OWASP A08:2021', 'CWE-353'],
    verifier: ctx => chercher(ctx, f => /\.(html?|vue|php|astro|[jt]sx)$/i.test(f.chemin), /<script[^>]+src=["']https?:\/\/[^"']+["'][^>]*>/i, l => !/integrity=/i.test(l) && !/googletagmanager|google-analytics|js\.stripe\.com|challenges\.cloudflare|hcaptcha|recaptcha/i.test(l))
  });
  regle({
    id: 'CFG-04', titre: 'Bibliothèque CDN sans version fixe', categorie: 'A06', gravite: 'faible',
    description: 'Un fichier est chargé depuis unpkg ou jsDelivr sans numéro de version précis.',
    impact: 'Une nouvelle version (ou une version piégée) est chargée automatiquement, sans contrôle.',
    correction: 'Indiquer une version exacte : paquet@1.2.3.',
    refs: ['OWASP A06:2021'],
    verifier: ctx => chercher(ctx, f => code(f), /(?:unpkg\.com|cdn\.jsdelivr\.net\/npm|esm\.sh)\/((?:@[\w.-]+\/)?[\w.-]+)(@[\w.^~*-]+)?/, (l, m) => !m[2] || /[\^~*]|latest/.test(m[2]) || !/\d+\.\d+\.\d+/.test(m[2]))
  });
  regle({
    id: 'CFG-05', titre: 'CORS ouvert à toutes les origines', categorie: 'A05', gravite: 'moyenne',
    description: 'Le serveur répond Access-Control-Allow-Origin: * ou accepte toute origine.',
    impact: 'N’importe quel site peut appeler l’API depuis le navigateur d’un utilisateur ; grave si des identifiants (cookies) sont acceptés.',
    correction: 'Lister explicitement les origines de l’app ; ne jamais combiner * (ou origin: true) avec credentials: true.',
    refs: ['OWASP A05:2021', 'CWE-942'],
    verifier: ctx => chercher(ctx, f => code(f) && f.serveur && nonMinifie(f), /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*["']|\bcors\(\s*\)|origin\s*:\s*(?:["']\*["']|true)/,
      (l, m, f) => true).map(c => Object.assign(c, { gravite: /credentials\s*:\s*true/.test((ctx.fichiers.find(f => f.chemin === c.fichier) || {}).texte || '') ? 'elevee' : 'moyenne' }))
  });
  regle({
    id: 'CFG-06', titre: 'Pas de politique CSP', categorie: 'A05', gravite: 'moyenne',
    description: 'Aucune Content-Security-Policy n’est définie (ni balise meta, ni en-tête configuré dans le projet).',
    impact: 'Sans CSP, une faille XSS permet de charger et d’exécuter n’importe quel script.',
    correction: 'Ajouter une CSP (en-tête HTTP de préférence) : default-src \'self\' ; script-src limité aux domaines nécessaires ; frame-ancestors \'none\'.',
    refs: ['OWASP A05:2021', 'ASVS V14.4.3'],
    verifier(ctx) {
      const html = ctx.fichiers.filter(f => /(^|\/)(index\.html?|app\.html|_document\.[jt]sx?|layout\.[jt]sx?|nuxt\.config\.[jt]s)$/.test(f.chemin));
      if (!html.length) return null;
      return contient(ctx, /Content-Security-Policy|contentSecurityPolicy|helmet\(/i) ? [] : [{ fichier: html[0].chemin, ligne: 1, extrait: '', detail: 'Aucune CSP trouvée dans le projet' }];
    }
  });
  regle({
    id: 'CFG-07', titre: 'En-têtes de sécurité non configurés', categorie: 'A05', gravite: 'faible',
    description: 'Le projet ne configure pas les en-têtes HSTS, X-Content-Type-Options, protection contre l’affichage en iframe…',
    impact: 'Le navigateur n’applique pas ses protections supplémentaires (clickjacking, détection de type, HTTPS forcé).',
    correction: 'Les définir chez l’hébergeur (_headers, vercel.json, next.config headers(), helmet pour Express, nginx). Vérifier ensuite avec l’audit « Site en ligne ».',
    refs: ['OWASP Secure Headers Project'],
    verifier(ctx) {
      if (!ctx.fichiers.some(f => /(^|\/)(index\.html?|package\.json)$/.test(f.chemin))) return null;
      return contient(ctx, /Strict-Transport-Security|X-Content-Type-Options|helmet\(|frame-ancestors|X-Frame-Options/i) ? [] : [{ fichier: '(projet)', ligne: 0, extrait: '', detail: 'Aucune configuration d’en-têtes de sécurité trouvée' }];
    }
  });
  regle({
    id: 'CFG-08', titre: 'Serveur Express sans helmet', categorie: 'A05', gravite: 'faible',
    description: 'Une API Express ne pose pas les en-têtes de sécurité par défaut.',
    impact: 'Version du serveur annoncée (X-Powered-By), pas d’en-têtes de protection.',
    correction: 'npm install helmet, puis app.use(helmet()) ; ou au minimum app.disable(\'x-powered-by\').',
    refs: ['Express : security best practices'],
    verifier(ctx) {
      const ex = ctx.fichiers.filter(f => code(f) && /require\(["']express["']\)|from ["']express["']/.test(f.texte));
      if (!ex.length) return null;
      return contient(ctx, /helmet/) ? [] : [{ fichier: ex[0].chemin, ligne: 1, extrait: '', detail: 'Express utilisé sans helmet' }];
    }
  });
  regle({
    id: 'CFG-09', titre: '.env non ignoré par git', categorie: 'A05', gravite: 'moyenne',
    description: 'Le fichier .gitignore ne contient pas .env.',
    impact: 'Un « git add . » suffit à publier tous les secrets dans le dépôt.',
    correction: 'Ajouter « .env* » et « !.env.example » au .gitignore.',
    refs: ['CWE-538'],
    verifier(ctx) {
      const gi = ctx.fichiers.filter(f => /(^|\/)\.gitignore$/.test(f.chemin));
      if (!gi.length) return ctx.fichiers.some(f => /(^|\/)package\.json$/.test(f.chemin)) ? [{ fichier: '(projet)', ligne: 0, extrait: '', detail: 'Pas de .gitignore dans le projet', gravite: 'faible' }] : null;
      return gi.filter(f => !/^\s*\/?\.env/m.test(f.texte) && !/^\s*\*\.env/m.test(f.texte)).map(f => ({ fichier: f.chemin, ligne: 1, extrait: '', detail: '.env absent du .gitignore' }));
    }
  });
  regle({
    id: 'CFG-10', titre: 'Détails techniques renvoyés au client', categorie: 'A05', gravite: 'faible',
    description: 'Une erreur (message ou pile d’appels) est renvoyée telle quelle dans la réponse HTTP.',
    impact: 'Révèle la structure interne (chemins, requêtes, versions) et aide un attaquant.',
    correction: 'Renvoyer un message générique et un identifiant d’erreur ; journaliser le détail côté serveur.',
    refs: ['CWE-209'],
    verifier: ctx => chercher(ctx, f => code(f) && f.serveur && nonMinifie(f), /res\.(?:send|json|status\(\d+\)\.(?:send|json))\([^)]*(?:err|error|e)\.(?:stack|message)|JSON\.stringify\(\s*\{[^}]*(?:error|erreur)\s*:\s*(?:err|error|e)\.(?:stack|message)/)
  });
  regle({
    id: 'CFG-11', titre: 'Mode debug ou source maps en production', categorie: 'A05', gravite: 'faible',
    description: 'APP_DEBUG/DEBUG activé, ou fichiers .map présents dans le dossier publié.',
    impact: 'Le code source d’origine et des informations internes deviennent lisibles.',
    correction: 'Désactiver le debug en production et ne pas publier les fichiers .map (productionBrowserSourceMaps: false, build.sourcemap: false).',
    refs: ['CWE-489', 'CWE-540'],
    verifier(ctx) {
      const out = chercher(ctx, f => estEnv(f) || /settings\.py$/.test(f.chemin), /^\s*(?:APP_DEBUG|DEBUG)\s*=\s*(?:true|True|1)\b/);
      ctx.fichiers.filter(f => /(^|\/)(dist|build|out|public)\/.+\.js\.map$/.test(f.chemin)).slice(0, 5).forEach(f => out.push({ fichier: f.chemin, ligne: 0, extrait: '', detail: 'Source map publiée' }));
      return out;
    }
  });
  regle({
    id: 'CFG-12', titre: 'Donnée sensible écrite dans la console', categorie: 'A09', gravite: 'faible',
    description: 'console.log affiche un mot de passe, un jeton ou une clé.',
    impact: 'Le secret se retrouve dans les journaux du navigateur ou du serveur, lisibles par d’autres.',
    correction: 'Supprimer ces journaux ou masquer la valeur.',
    refs: ['CWE-532', 'OWASP A09:2021'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f), /console\.(?:log|info|debug|warn)\([^)]*\b(?:password|mdp|token|secret|apiKey|api_key|authorization)\b/i)
  });
  regle({
    id: 'CFG-13', titre: 'Lien externe sans rel="noopener"', categorie: 'A05', gravite: 'info',
    description: 'Un lien target="_blank" n’a pas rel="noopener noreferrer".',
    impact: 'Risque faible (les navigateurs récents protègent par défaut) : la page ouverte pourrait rediriger l’onglet d’origine.',
    correction: 'Ajouter rel="noopener noreferrer" aux liens target="_blank".',
    refs: ['CWE-1022'],
    verifier: ctx => chercher(ctx, f => code(f) && nonMinifie(f), /target=["']_blank["']/, l => !/noopener|noreferrer/.test(l))
  });

  /* ----- A06 Composants ----- */
  regle({
    id: 'DEP-01', titre: 'Dépendance avec une vulnérabilité connue', categorie: 'A06', gravite: 'elevee',
    description: 'Une bibliothèque installée est dans une version touchée par une faille publique.',
    impact: 'Les failles publiques sont exploitées automatiquement par des robots peu après leur publication.',
    correction: 'Mettre à jour la dépendance (npm install paquet@latest ou la version corrigée indiquée), puis lancer npm audit et refaire les tests.',
    refs: ['OWASP A06:2021', 'npm audit'],
    verifier(ctx) {
      const v = versionsInstallees(ctx);
      if (!Object.keys(v).length) return null;
      const out = [];
      VULNS.forEach(([n, de, a, g, ref]) => {
        const d = v[n];
        if (d && d.version && cmp(d.version, de) >= 0 && cmp(d.version, a) < 0) out.push({ fichier: d.fichier, ligne: 0, extrait: `"${n}": "${d.demande}"`, detail: `${n} ${d.version}${d.verrou ? ' (installée)' : ' (demandée)'} — ${ref}. Corrigé en ${a}.`, gravite: d.dev && g !== 'critique' ? 'faible' : g });
      });
      return out;
    }
  });
  regle({
    id: 'DEP-02', titre: 'Dépendances non verrouillées', categorie: 'A06', gravite: 'faible',
    description: 'Pas de fichier de verrouillage (package-lock.json, yarn.lock, pnpm-lock.yaml), ou dépendance en version « * » ou « latest ».',
    impact: 'Chaque installation peut récupérer une version différente, éventuellement piégée (attaque de la chaîne d’approvisionnement).',
    correction: 'Commiter le fichier de verrouillage et installer avec npm ci ; remplacer * et latest par une version.',
    refs: ['OWASP A08:2021'],
    verifier(ctx) {
      const pk = ctx.fichiers.filter(f => /(^|\/)package\.json$/.test(f.chemin));
      if (!pk.length) return null;
      const out = [];
      pk.forEach(f => {
        const dossier = f.chemin.replace(/package\.json$/, '');
        const verrou = ctx.noms.some(n => n === dossier + 'package-lock.json' || n === dossier + 'yarn.lock' || n === dossier + 'pnpm-lock.yaml');
        if (!verrou && /"dependencies"/.test(f.texte)) out.push({ fichier: f.chemin, ligne: 0, extrait: '', detail: 'Aucun fichier de verrouillage à côté' });
        f.lignes.forEach((l, i) => { if (/:\s*"(?:\*|latest)"/.test(l)) out.push({ fichier: f.chemin, ligne: i + 1, extrait: extrait(l), detail: 'Version non fixée' }); });
      });
      return out;
    }
  });

  /* ----- Modèle d'une app de l'Atelier ----- */
  regle({
    id: 'ATL-01', titre: 'Kit de cybersécurité absent ou affaibli', categorie: 'A04', gravite: 'elevee', portee: 'atelier',
    description: 'L’app n’applique pas le kit de cybersécurité obligatoire, ou ses réglages sont en dessous du niveau exigé.',
    impact: 'Les protections générées (HTTPS forcé, CSP, en-têtes, mots de passe forts) ne sont pas toutes présentes dans l’app exportée.',
    correction: 'Dans le composeur, onglet Kits : appliquer « Cybersécurité renforcée » dans sa dernière version.',
    refs: ['Kit Cybersécurité renforcée'],
    verifier(ctx) {
      const app = ctx.app, out = [];
      const s = AB.kits.valeurs(app, 'securite');
      const k = AB.kits.resoudre(app).securite;
      AB.kits.obligatoires().filter(o => o.type === 'securite').forEach(o => { if (!k || k.id !== o.id) out.push({ fichier: 'Kits de l’app', ligne: 0, extrait: '', detail: `Kit obligatoire « ${o.nom} » non appliqué` }); });
      if (!s.httpsObligatoire) out.push({ fichier: 'Kit sécurité', ligne: 0, extrait: '', detail: 'HTTPS non forcé', gravite: 'elevee' });
      if (!s.csp) out.push({ fichier: 'Kit sécurité', ligne: 0, extrait: '', detail: 'CSP désactivée', gravite: 'moyenne' });
      if (Number(s.mdpMin) < 12) out.push({ fichier: 'Kit sécurité', ligne: 0, extrait: '', detail: `Mots de passe de ${s.mdpMin} caractères (12 exigés)`, gravite: Number(s.mdpMin) < 8 ? 'elevee' : 'moyenne' });
      if (!s.mdpComplexe) out.push({ fichier: 'Kit sécurité', ligne: 0, extrait: '', detail: 'Complexité des mots de passe non exigée', gravite: 'faible' });
      if (!s.entetes) out.push({ fichier: 'Kit sécurité', ligne: 0, extrait: '', detail: 'En-têtes HTTP de sécurité non fournis à l’hébergeur', gravite: 'faible' });
      return out;
    }
  });
  regle({
    id: 'ATL-02', titre: 'Écran avec données personnelles accessible sans connexion', categorie: 'A01', gravite: 'elevee', portee: 'atelier',
    description: 'Un bloc qui manipule des données personnelles n’est pas réservé aux utilisateurs connectés.',
    impact: 'Les données personnelles d’autres utilisateurs peuvent être consultées ou saisies sans compte.',
    correction: 'Dans le composeur, cocher « Réservé aux utilisateurs connectés » sur ce bloc et ajouter le bloc Connexion.',
    refs: ['RGPD art. 32', 'OWASP A01:2021'],
    verifier(ctx) {
      return (ctx.app.blocs || []).map(i => ({ i, d: AB.blocs.get(i.bloc, i.version) })).filter(x => x.d && x.d.donneesPersonnelles && !x.i.protege && x.d.id !== 'connexion')
        .map(({ i, d }) => {
          const tablesPubliques = d.tables.some(t => t.acces === 'insertion-publique');
          return { fichier: `Bloc ${d.nom}`, ligne: 0, extrait: '', detail: `« ${(i.reglages && (i.reglages.onglet || i.reglages.titre)) || d.nom} » n’est pas protégé${tablesPubliques ? ' : formulaire public en écriture seule (personne ne peut relire les réponses) ; acceptable s’il est voulu, avec une protection anti-spam' : ''}`, gravite: tablesPubliques ? 'faible' : 'elevee' };
        });
    }
  });
  regle({
    id: 'ATL-03', titre: 'Valeur secrète enregistrée dans l’app', categorie: 'A02', gravite: 'critique', portee: 'atelier',
    description: 'Une variable marquée secrète a une valeur dans la configuration de l’app.',
    impact: 'Elle pourrait se retrouver dans une sauvegarde ou un export.',
    correction: 'Vider la valeur dans l’onglet Variables d’env et la renseigner seulement dans les secrets du serveur.',
    refs: ['Kit Cybersécurité renforcée'],
    verifier: ctx => AB.rendu.env(ctx.app).filter(v => v.secret && ctx.app.config && ctx.app.config[v.cle]).map(v => ({ fichier: 'Variables d’env', ligne: 0, extrait: `${v.cle}=${masquerValeur(String(ctx.app.config[v.cle]))}`, detail: v.role || '' }))
  });
  regle({
    id: 'ATL-04', titre: 'Dépendance de bloc manquante', categorie: 'A04', gravite: 'moyenne', portee: 'atelier',
    description: 'Un bloc a besoin d’un autre bloc absent de l’app (par exemple Paiement sans Connexion).',
    impact: 'Le bloc ne peut pas vérifier l’identité de l’utilisateur ou ne fonctionne pas.',
    correction: 'Ajouter le bloc demandé dans la composition.',
    refs: [],
    verifier(ctx) {
      const defs = (ctx.app.blocs || []).map(i => AB.blocs.get(i.bloc, i.version)).filter(Boolean);
      return defs.flatMap(d => d.dependances.filter(dep => !defs.some(x => x.id === dep)).map(dep => ({ fichier: `Bloc ${d.nom}`, ligne: 0, extrait: '', detail: `Bloc « ${dep} » manquant` })));
    }
  });

  /* ----- Site en ligne (données collectées par serveur.js) ----- */
  const regleUrl = r => regle(Object.assign({ portee: 'url' }, r));
  const H = (ctx, nom) => (ctx.site.entetes || {})[nom.toLowerCase()];
  regleUrl({
    id: 'WEB-01', titre: 'HTTPS absent ou invalide', categorie: 'A02', gravite: 'critique',
    description: 'Le site ne répond pas en HTTPS, ou son certificat est invalide ou expiré.',
    impact: 'Mots de passe et données circulent en clair ou peuvent être interceptés ; les navigateurs affichent une alerte.',
    correction: 'Activer HTTPS chez l’hébergeur (certificat Let’s Encrypt automatique) et renouveler le certificat.',
    refs: ['OWASP A02:2021'],
    verifier(ctx) {
      const s = ctx.site, out = [];
      if (!s.https || !s.https.ok) out.push({ fichier: s.url, ligne: 0, extrait: '', detail: `HTTPS indisponible : ${(s.https && s.https.erreur) || 'erreur inconnue'}` });
      if (s.tls && s.tls.jours !== undefined) {
        if (s.tls.jours < 0) out.push({ fichier: s.url, ligne: 0, extrait: '', detail: `Certificat expiré depuis ${-s.tls.jours} jour(s)` });
        else if (s.tls.jours < 15) out.push({ fichier: s.url, ligne: 0, extrait: '', detail: `Certificat expirant dans ${s.tls.jours} jour(s)`, gravite: 'moyenne' });
        if (s.tls.protocole && /TLSv1(\.1)?$/.test(s.tls.protocole)) out.push({ fichier: s.url, ligne: 0, extrait: s.tls.protocole, detail: 'Protocole TLS obsolète', gravite: 'elevee' });
      }
      return out;
    }
  });
  regleUrl({
    id: 'WEB-02', titre: 'HTTP non redirigé vers HTTPS', categorie: 'A02', gravite: 'moyenne',
    description: 'La version http:// du site ne redirige pas automatiquement vers https://.',
    impact: 'Un utilisateur qui tape l’adresse sans https reste sur une connexion non chiffrée.',
    correction: 'Activer la redirection HTTPS forcée chez l’hébergeur (301 ou 308 vers https://).',
    refs: ['ASVS V9.1.1'],
    verifier(ctx) {
      const r = ctx.site.http;
      if (!r || r.erreur) return null;
      return /^30[1278]$/.test(String(r.statut)) && /^https:/i.test(r.location || '') ? [] : [{ fichier: 'http://' + ctx.site.hote, ligne: 0, extrait: `HTTP ${r.statut}${r.location ? ' → ' + r.location : ''}`, detail: 'Pas de redirection vers HTTPS' }];
    }
  });
  const enteteRequis = (id, nom, titre, gravite, test, correction, impact) => regleUrl({
    id, titre, categorie: 'A05', gravite, description: `En-tête ${nom} absent ou insuffisant.`, impact, correction, refs: ['OWASP Secure Headers Project', 'ASVS V14.4'],
    verifier(ctx) { if (!ctx.site.https || !ctx.site.https.ok) return null; const v = H(ctx, nom); const pb = test(v, ctx); return pb ? [{ fichier: ctx.site.final || ctx.site.url, ligne: 0, extrait: v ? `${nom}: ${String(v).slice(0, 160)}` : `${nom} : absent`, detail: pb }] : []; }
  });
  enteteRequis('WEB-03', 'Strict-Transport-Security', 'HSTS absent ou trop court', 'moyenne',
    v => !v ? 'HSTS absent' : (Number((String(v).match(/max-age=(\d+)/) || [0, 0])[1]) < 15552000 ? 'max-age inférieur à 6 mois' : ''),
    'Ajouter Strict-Transport-Security: max-age=31536000; includeSubDomains.', 'Le navigateur peut encore tenter une connexion HTTP, interceptable.');
  enteteRequis('WEB-04', 'Content-Security-Policy', 'CSP absente ou faible', 'moyenne',
    (v, ctx) => {
      const meta = /<meta[^>]+http-equiv=["']Content-Security-Policy/i.test(ctx.site.html || '');
      if (!v && !meta) return 'Aucune CSP (ni en-tête, ni balise meta)';
      const p = String(v || '');
      if (v && /script-src[^;]*'unsafe-eval'/.test(p)) return 'script-src autorise \'unsafe-eval\'';
      if (v && /script-src[^;]*'unsafe-inline'/.test(p) && !/nonce-|sha256-/.test(p)) return 'script-src autorise \'unsafe-inline\' sans nonce';
      return '';
    }, 'Définir une CSP en en-tête HTTP : default-src \'self\'; script-src limité ; object-src \'none\'; frame-ancestors \'none\'.', 'Une faille XSS peut charger et exécuter n’importe quel script.');
  enteteRequis('WEB-05', 'X-Content-Type-Options', 'X-Content-Type-Options absent', 'faible', v => !/nosniff/i.test(v || '') ? 'nosniff absent' : '',
    'Ajouter X-Content-Type-Options: nosniff.', 'Le navigateur peut interpréter un fichier téléversé comme un script.');
  enteteRequis('WEB-06', 'X-Frame-Options', 'Protection contre le clickjacking absente', 'moyenne',
    (v, ctx) => (v && /deny|sameorigin/i.test(v)) || /frame-ancestors/i.test(H(ctx, 'Content-Security-Policy') || '') ? '' : 'Ni X-Frame-Options, ni frame-ancestors',
    'Ajouter X-Frame-Options: DENY ou CSP frame-ancestors \'none\'.', 'Le site peut être affiché dans une iframe invisible pour piéger les clics de l’utilisateur.');
  enteteRequis('WEB-07', 'Referrer-Policy', 'Referrer-Policy absente', 'faible', v => !v || /unsafe-url|no-referrer-when-downgrade/i.test(v) ? (v ? 'Politique trop permissive' : 'Absente') : '',
    'Ajouter Referrer-Policy: strict-origin-when-cross-origin.', 'L’adresse complète des pages (avec paramètres) est transmise aux sites tiers.');
  enteteRequis('WEB-08', 'Permissions-Policy', 'Permissions-Policy absente', 'info', v => !v ? 'Absente' : '',
    'Ajouter Permissions-Policy: camera=(), microphone=(), geolocation=().', 'Les fonctions sensibles du navigateur ne sont pas explicitement bloquées.');
  regleUrl({
    id: 'WEB-09', titre: 'Version du serveur annoncée', categorie: 'A05', gravite: 'faible',
    description: 'Les en-têtes Server ou X-Powered-By donnent le logiciel et sa version.',
    impact: 'Facilite la recherche de failles connues pour cette version.',
    correction: 'Masquer X-Powered-By (app.disable(\'x-powered-by\'), poweredByHeader: false) et la version du serveur.',
    refs: ['CWE-200'],
    verifier(ctx) {
      const out = [];
      ['X-Powered-By', 'Server', 'X-AspNet-Version'].forEach(n => { const v = H(ctx, n); if (v && (n !== 'Server' || /\d/.test(v))) out.push({ fichier: ctx.site.final || ctx.site.url, ligne: 0, extrait: `${n}: ${v}`, detail: 'Information technique exposée' }); });
      return out;
    }
  });
  regleUrl({
    id: 'WEB-10', titre: 'Cookie sans attributs de sécurité', categorie: 'A07', gravite: 'moyenne',
    description: 'Un cookie est posé sans Secure, HttpOnly ou SameSite.',
    impact: 'Le cookie peut être lu par un script (XSS) ou envoyé depuis un autre site (CSRF).',
    correction: 'Poser les cookies de session avec Secure; HttpOnly; SameSite=Lax (ou Strict).',
    refs: ['ASVS V3.4'],
    verifier(ctx) {
      return (ctx.site.cookies || []).map(c => {
        const nom = c.split('=')[0].trim();
        const manque = ['Secure', 'HttpOnly', 'SameSite'].filter(a => !new RegExp('\\b' + a + '\\b', 'i').test(c));
        return manque.length ? { fichier: ctx.site.final || ctx.site.url, ligne: 0, extrait: `${nom}=…`, detail: `Manque : ${manque.join(', ')}`, gravite: /sess|auth|token|sid/i.test(nom) ? 'moyenne' : 'faible' } : null;
      }).filter(Boolean);
    }
  });
  regleUrl({
    id: 'WEB-11', titre: 'Fichier sensible accessible publiquement', categorie: 'A05', gravite: 'critique',
    description: 'Un fichier qui ne devrait jamais être publié (.env, dépôt .git, configuration) est téléchargeable.',
    impact: 'Secrets, code source complet ou accès aux serveurs récupérables par n’importe qui.',
    correction: 'Supprimer le fichier du dossier publié, bloquer les fichiers cachés chez l’hébergeur, puis renouveler tous les secrets qu’il contenait.',
    refs: ['OWASP A05:2021', 'CWE-538'],
    verifier: ctx => (ctx.site.exposes || []).map(e => ({ fichier: (ctx.site.origine || '') + e.chemin, ligne: 0, extrait: e.apercu ? A.masquer(e.apercu) : '', detail: `${e.chemin} accessible (HTTP ${e.statut}, ${e.taille} octets)`, gravite: e.gravite || 'critique' }))
  });
  regleUrl({
    id: 'WEB-12', titre: 'CORS : toute origine acceptée', categorie: 'A05', gravite: 'moyenne',
    description: 'Le site autorise les appels depuis n’importe quel autre site.',
    impact: 'Avec Access-Control-Allow-Credentials: true, un site piégé peut lire les données de l’utilisateur connecté.',
    correction: 'Limiter Access-Control-Allow-Origin aux origines de l’app.',
    refs: ['CWE-942'],
    verifier(ctx) {
      const c = ctx.site.cors;
      if (!c) return null;
      const reflete = c.acao && (c.acao === '*' || c.acao === c.origineTest);
      return reflete ? [{ fichier: ctx.site.final || ctx.site.url, ligne: 0, extrait: `Access-Control-Allow-Origin: ${c.acao}${c.acac ? ' ; Allow-Credentials: ' + c.acac : ''}`, detail: c.acao === '*' ? 'Toutes origines (*)' : 'Origine de test renvoyée telle quelle', gravite: c.acac === 'true' && c.acao !== '*' ? 'elevee' : (c.acao === '*' ? 'faible' : 'moyenne') }] : [];
    }
  });
  regleUrl({
    id: 'WEB-13', titre: 'Pas de security.txt', categorie: 'A09', gravite: 'info',
    description: 'Le fichier /.well-known/security.txt n’existe pas.',
    impact: 'Une personne qui découvre une faille ne sait pas à qui la signaler.',
    correction: 'Publier /.well-known/security.txt avec un contact (Contact: mailto:…) et une date d’expiration (Expires:).',
    refs: ['RFC 9116'],
    verifier: ctx => ctx.site.securityTxt === undefined ? null : (ctx.site.securityTxt ? [] : [{ fichier: (ctx.site.origine || '') + '/.well-known/security.txt', ligne: 0, extrait: '', detail: 'Absent' }])
  });

  /* ======================= Exécution ======================= */

  /** Note de A à F : un point critique donne F. */
  A.note = (score, comptes) => comptes.critique ? 'F' : score >= 90 && !comptes.elevee ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';

  /**
   * Lance l'audit.
   * cible : { type: 'atelier'|'code'|'url', nom, appId?, url?, source? }
   * donnees : { fichiers: [{ chemin, texte, serveur? }], ignores?, app?, site? }
   */
  A.lancer = function (cible, donnees) {
    const debut = performance.now();
    const fichiers = preparer(donnees.fichiers || []);
    const ctx = { fichiers, noms: (donnees.noms || fichiers.map(f => f.chemin)), app: donnees.app || null, site: donnees.site || null };
    ctx.supabase = fichiers.some(f => /(^|\/)supabase\//.test(f.chemin) || (/(^|\/)package\.json$/.test(f.chemin) && /@supabase\//.test(f.texte)));
    const resultats = R.map(r => {
      const applicable = r.portee === 'code' ? fichiers.length > 0 : r.portee === 'atelier' ? !!ctx.app : !!ctx.site;
      if (!applicable) return { regle: r.id, statut: 'na', constats: [] };
      let c;
      try { c = r.verifier(ctx); }
      catch (e) { console.error(r.id, e); return { regle: r.id, statut: 'erreur', constats: [], erreur: e.message }; }
      if (c === null) return { regle: r.id, statut: 'na', constats: [] };
      c.forEach(x => { x.gravite = x.gravite || r.gravite; });
      c.sort((a, b) => A.GRAVITES[a.gravite].ordre - A.GRAVITES[b.gravite].ordre);
      const total = c.length;
      // Gravité retenue pour la règle : la plus haute parmi ses constats
      return { regle: r.id, statut: total ? 'ko' : 'ok', gravite: total ? c[0].gravite : r.gravite, total, constats: c.slice(0, 60) };
    });
    const ko = resultats.filter(r => r.statut === 'ko');
    const comptes = { critique: 0, elevee: 0, moyenne: 0, faible: 0, info: 0 };
    ko.forEach(r => { comptes[r.gravite]++; });
    const score = Math.max(0, 100 - ko.reduce((s, r) => s + A.GRAVITES[r.gravite].poids, 0));
    return {
      id: U.uuid(), date: U.now(), version: A.VERSION, cible,
      duree: Math.round(performance.now() - debut),
      perimetre: {
        fichiers: fichiers.length, lignes: fichiers.reduce((n, f) => n + f.lignes.length, 0),
        clients: fichiers.filter(f => !f.serveur && code(f)).length, serveurs: fichiers.filter(f => f.serveur).length,
        ignores: donnees.ignores || 0, site: donnees.site ? { url: donnees.site.url, final: donnees.site.final, statut: donnees.site.statut, scripts: (donnees.site.scripts || []).length } : null
      },
      score, note: A.note(score, comptes), comptes, bloquants: comptes.critique + comptes.elevee, resultats
    };
  };

  A.regle = id => R.find(r => r.id === id);

  /** Fichiers d'une app de l'Atelier : ceux de l'export ZIP (rien n'est envoyé au navigateur depuis supabase/). */
  A.fichiersAtelier = app => Object.entries(AB.rendu.fichiers(app)).map(([chemin, texte]) => ({ chemin, texte: String(texte), serveur: /^supabase\//.test(chemin) }));

  /** Audit complet d'une app de la plateforme. */
  A.auditerApp = app => A.lancer({ type: 'atelier', nom: app.nom, appId: app.id }, { fichiers: A.fichiersAtelier(app), app });

  /** Audit d'un site : collecte par le serveur local, analyse ici (HTML et scripts compris). */
  A.auditerUrl = async function (url, appId) {
    const base = await AB.ia.adresse();
    let r;
    try {
      r = await fetch(base + '/api/audit-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, autorise: true }) });
    } catch (e) { throw new Error('Serveur local injoignable : lance « node serveur.js » (voir Réglages).'); }
    const site = await r.json();
    if (!r.ok) throw new Error(site.erreur || 'Collecte impossible');
    const fichiers = [];
    if (site.html) fichiers.push({ chemin: 'en-ligne/index.html', texte: site.html, serveur: false });
    (site.scripts || []).forEach(s => fichiers.push({ chemin: s.url.replace(/^https?:\/\/[^/]+/, '') || s.url, texte: s.texte, serveur: false }));
    const audit = A.lancer({ type: 'url', nom: site.hote || url, url: site.final || url, appId }, { fichiers, site });
    // Pour un site, seules les règles qui ont un sens sur des fichiers publiés sont gardées
    const utiles = /^(SEC-01|SEC-02|SEC-03|INJ-0[1-3]|CFG-0[2-4]|CFG-12|CFG-13|WEB-\d+)$/;
    audit.resultats.forEach(x => { if (!utiles.test(x.regle) && x.statut !== 'na') { x.statut = 'na'; x.constats = []; x.total = 0; } });
    return A.recalculer(audit);
  };

  /** Recalcule score et comptes après filtrage des résultats. */
  A.recalculer = function (audit) {
    const comptes = { critique: 0, elevee: 0, moyenne: 0, faible: 0, info: 0 };
    audit.resultats.filter(r => r.statut === 'ko').forEach(r => { comptes[r.gravite]++; });
    audit.score = Math.max(0, 100 - audit.resultats.filter(r => r.statut === 'ko').reduce((s, r) => s + A.GRAVITES[r.gravite].poids, 0));
    audit.comptes = comptes;
    audit.note = A.note(audit.score, comptes);
    audit.bloquants = comptes.critique + comptes.elevee;
    return audit;
  };

  /* ======================= Lecture d'un dossier ou d'un ZIP ======================= */

  /** Fichiers d'un <input type="file" webkitdirectory>. */
  A.lireDossier = async function (liste, progression) {
    const fichiers = [], noms = [];
    let ignores = 0, i = 0;
    const tous = [...liste];
    for (const f of tous) {
      const chemin = (f.webkitRelativePath || f.name).replace(/^[^/]+\//, '');
      noms.push(chemin);
      if (!A.garder(chemin, f.size)) { ignores++; continue; }
      fichiers.push({ chemin, texte: await f.text() });
      if (progression && ++i % 50 === 0) progression(`${i} fichiers lus…`);
    }
    return { fichiers, noms, ignores };
  };

  /** Lit un ZIP (méthodes « stocké » et « deflate ») sans librairie. */
  A.lireZip = async function (blob, progression) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let fin = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    if (fin < 0) throw new Error('Ce fichier n’est pas un ZIP valide.');
    let n = dv.getUint16(fin + 10, true), p = dv.getUint32(fin + 16, true);
    if (p === 0xffffffff || n === 0xffff) throw new Error('ZIP trop volumineux (ZIP64) : choisis plutôt le dossier décompressé.');
    const dec = new TextDecoder('utf-8');
    const entrees = [];
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const methode = dv.getUint16(p + 10, true), taille = dv.getUint32(p + 20, true), brute = dv.getUint32(p + 24, true);
      const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
      entrees.push({ nom: dec.decode(buf.subarray(p + 46, p + 46 + ln)), methode, taille, brute, local });
      p += 46 + ln + le + lc;
    }
    // Retire le dossier racine commun (projet/…)
    const racine = entrees.length && entrees.every(e => e.nom.split('/')[0] === entrees[0].nom.split('/')[0] && e.nom.includes('/')) ? entrees[0].nom.split('/')[0] + '/' : '';
    const fichiers = [], noms = [];
    let ignores = 0, i = 0;
    for (const e of entrees) {
      if (e.nom.endsWith('/')) continue;
      const chemin = e.nom.slice(racine.length);
      noms.push(chemin);
      if (!A.garder(chemin, e.brute) || (e.methode !== 0 && e.methode !== 8)) { ignores++; continue; }
      const debut = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      const data = buf.subarray(debut, debut + e.taille);
      let octets = data;
      if (e.methode === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien pour lire un ZIP : choisis le dossier décompressé.');
        octets = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      }
      fichiers.push({ chemin, texte: dec.decode(octets) });
      if (progression && ++i % 50 === 0) progression(`${i} fichiers décompressés…`);
    }
    return { fichiers, noms, ignores };
  };

  /* ======================= Historique ======================= */

  /** Enregistre l'audit et son résumé dans la fiche de l'app liée. */
  A.enregistrer = async function (audit) {
    await AB.db.put('audits', audit);
    if (audit.cible.appId) {
      const app = await AB.db.get('apps', audit.cible.appId);
      if (app) {
        app.audits = [{ id: audit.id, date: audit.date, type: audit.cible.type, score: audit.score, note: audit.note, bloquants: audit.bloquants }].concat(app.audits || []).slice(0, 30);
        await AB.db.put('apps', app);
      }
    }
    return audit;
  };
  A.lister = async () => (await AB.db.list('audits')).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  /** Audit précédent de la même cible (même app et même type, ou même nom). */
  A.precedent = async function (audit) {
    return (await A.lister()).find(a => a.id !== audit.id && a.date < audit.date && a.cible.type === audit.cible.type &&
      (audit.cible.appId ? a.cible.appId === audit.cible.appId : a.cible.nom === audit.cible.nom)) || null;
  };
})();
