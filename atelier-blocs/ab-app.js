/* ==========================================================================
   ab-app.js — démarrage, barre latérale et routage (chargé en dernier)
   Adresses :
     #/                       tableau de bord
     #/creer                  créer une app : prompt + pack → Claude → import du ZIP livré
     #/creer/prompt           nouvelle app : prompt d'entrée d'un kit, rempli champ par champ
     #/apps                   catalogue des apps
     #/apps/<id>              composeur (app de la plateforme) ou fiche (app existante)
     #/blocs                  atelier : liste des blocs
     #/blocs/<id>/<version>   éditeur d'un bloc (« nouveau » pour en créer un)
     #/kits                   kits : règles communes (charte, sécurité, affichage…)
     #/kits/<id>/<version>    éditeur d'un kit
     #/prompt                 prompt et pack pour Claude (kits, blocs → prompt + ZIP à joindre)
     #/prompt/app/<id>        prompt d'une app (ses kits et ses blocs)
     #/bases                  bases de données des apps (concepteur, connexion, données)
     #/bases/<app>/<base>/<onglet>  une base : tables | sql | connexion | donnees | reglages
     #/design                 studio design : personnages, skins, compagnons, mouvements
     #/mobile                 apps mobiles : publier une app HTML sur l'App Store et Google Play
     #/mobile/app/<id>        version mobile d'une app (réglages, diagnostic, projet Capacitor)
     #/audit                  audit de sécurité (nouvel audit, historique)
     #/audit/app/<id>         audit d'une app ; #/audit/rapport/<id> : rapport
     #/veille                 veille technologique : une idée d'app par jour (+ /jour/<date>, /idee/<id>, /toutes, /favoris, /ia)
     #/discussion             discussion avec Claude (l'Atelier et toutes les apps) ; une app a aussi son onglet Discussion
     #/reglages               réglages de la plateforme
   Chaque vue : render(root, params) → { destroy? }
   ========================================================================== */
(function () {
  const U = AB.u;
  const A = AB.app = {};
  A.VERSION = '1.30';   // même numéro que VERSION dans serveur.js

  /* Trois espaces : créer (prompt, pack, blocs), gérer ses apps, gérer ses kits ; et la veille (une idée d'app par jour). */
  const NAV = [
    { section: '', liens: [{ route: '', label: 'Tableau de bord', icon: 'mdi-view-dashboard-outline' },
      { route: 'veille', label: 'Veille technologique', icon: 'mdi-lightbulb-on-outline' },
      { route: 'discussion', label: 'Discussion', icon: 'mdi-chat-processing-outline' }] },
    { section: 'Créer', liens: [
      { route: 'creer', label: 'Créer une app', icon: 'mdi-creation-outline' },
      { route: 'prompt', label: 'Prompt et pack', icon: 'mdi-text-box-outline' },
      { route: 'blocs', label: 'Blocs', icon: 'mdi-puzzle-outline' },
      { route: 'design', label: 'Studio design', icon: 'mdi-palette-swatch-outline' }] },
    { section: 'Mes apps', liens: [
      { route: 'apps', label: 'Apps', icon: 'mdi-cellphone-link' },
      { route: 'bases', label: 'Bases de données', icon: 'mdi-database-outline' },
      { route: 'mobile', label: 'Apps mobiles', icon: 'mdi-cellphone-arrow-down' },
      { route: 'audit', label: 'Audit sécurité', icon: 'mdi-shield-search' }] },
    { section: 'Kits', liens: [{ route: 'kits', label: 'Mes kits', icon: 'mdi-package-variant-closed' }] },
    { section: 'Atelier', liens: [{ route: 'reglages', label: 'Réglages', icon: 'mdi-cog-outline' }] }
  ];

  const ROUTES = [
    [/^$/, () => AB.vues.accueil],
    [/^creer$/, () => AB.vues.creer],
    [/^creer\/prompt$/, () => AB.vues.nouvelleApp],
    [/^apps$/, () => AB.vues.apps],
    [/^apps\/([\w-]+)$/, () => AB.vues.app],
    [/^blocs$/, () => AB.vues.blocs],
    [/^blocs\/([\w-]+)\/([\w.-]+)$/, () => AB.vues.bloc],
    [/^kits$/, () => AB.vues.kits],
    [/^kits\/([\w-]+)\/([\w.-]+)$/, () => AB.vues.kit],
    [/^prompt$/, () => AB.vues.prompt],
    [/^prompt\/app\/([\w-]+)$/, () => AB.vues.prompt],
    [/^bases(?:\/([\w-]+))?(?:\/([\w-]+))?(?:\/(\w+))?$/, () => AB.vues.bases],
    [/^design$/, () => AB.vues.design],
    [/^mobile$/, () => AB.vues.mobile],
    [/^mobile\/(app)\/([\w-]+)$/, () => AB.vues.mobile],
    [/^audit$/, () => AB.vues.audit],
    [/^audit\/(app|rapport)\/([\w-]+)$/, () => AB.vues.audit],
    [/^veille(?:\/(jour|idee|toutes|favoris|ia))?(?:\/([\w.-]+))?$/, () => AB.vues.veille],
    [/^discussion$/, () => AB.vues.discussion],
    [/^reglages$/, () => AB.vues.reglages]
  ];

  let vueCourante = null;
  A.root = null;

  A.setCrumbs = function (parts) {
    const el = document.getElementById('crumbs');
    el.innerHTML = parts.map((p, i) => i === parts.length - 1 ? `<b>${U.esc(p)}</b>` : U.esc(p)).join(' <span class="muted">/</span> ');
    document.title = parts[parts.length - 1] + ' · Atelier de Blocs';
  };

  A.go = route => { location.hash = '#/' + route; };

  function dessinerNav(route) {
    const premier = route.split('/')[0];
    document.getElementById('sbNav').innerHTML = NAV.map(g => (g.section ? `<div class="sb-section">${U.esc(g.section)}</div>` : '') + g.liens.map(n =>
      `<a class="sb-link ${n.route === premier ? 'active' : ''}" href="#/${n.route}"><span class="mdi ${n.icon}"></span>${U.esc(n.label)}</a>`).join('')).join('');
  }

  /** Pied de la barre latérale : état du serveur local (IA). */
  A.majPied = async function () {
    const etat = await AB.ia.etat();
    const autre = etat.joignable && etat.version !== A.VERSION;
    const txt = !etat.joignable ? 'Serveur local : arrêté' : autre ? `Serveur local : ${etat.version ? 'v' + etat.version : 'ancienne version'}` : (etat.ia ? 'Serveur local : IA prête' : 'Serveur local : sans clé IA');
    document.getElementById('sbFoot').innerHTML = `<a href="#/reglages" style="color:${autre ? 'var(--color-warning)' : 'inherit'}"><span class="dot ${etat.joignable ? 'on' : ''}"></span>${U.esc(txt)}</a>`;
    // Ancien serveur encore ouvert : ce qui passe par lui (aperçu, construction, lancement des apps) date de sa version
    if (autre && !A.averti) {
      A.averti = true;
      U.toast('warning', 'Le serveur local n’est pas à jour',
        `Il est ${etat.version ? 'en v' + etat.version : 'd’une version précédente'}, l’Atelier en v${A.VERSION}. Ferme l’ancienne fenêtre du serveur local, puis relance lancer-atelier de cette version.`, 15000);
    }
  };

  async function router() {
    const route = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    document.body.classList.remove('nav-open');
    if (vueCourante && vueCourante.destroy) vueCourante.destroy();
    vueCourante = null;
    dessinerNav(route);
    const root = A.root = document.getElementById('view');
    root.innerHTML = '';
    document.getElementById('shell').scrollTop = 0;
    for (const [re, vue] of ROUTES) {
      const m = route.match(re);
      if (m) {
        try { vueCourante = await vue()(root, m.slice(1)); }
        catch (e) {
          console.error(e);
          root.innerHTML = `<div class="page"><div class="bar crit"><span class="mdi mdi-alert-circle-outline"></span><div>${U.esc(e.message)}</div></div></div>`;
        }
        return;
      }
    }
    root.innerHTML = `<div class="page"><div class="empty"><span class="mdi mdi-map-marker-question-outline"></span>Page introuvable. <a href="#/">Retour au tableau de bord</a></div></div>`;
  }

  async function demarrer() {
    try {
      await AB.db.open();
      await AB.blocs.installerFournis();
      await AB.kits.installerFournis();
      await AB.kits.chargerCriteres();
      await AB.installerCatalogue();
    } catch (e) {
      document.getElementById('view').innerHTML = `<div class="page"><div class="bar crit"><span class="mdi mdi-database-alert-outline"></span><div>Le stockage du navigateur est indisponible (${U.esc(e.message)}). Essayez Chrome, Edge ou Firefox hors navigation privée.</div></div></div>`;
      return;
    }
    document.getElementById('navToggle').onclick = () => document.body.classList.toggle('nav-open');
    document.getElementById('navOverlay').onclick = () => document.body.classList.remove('nav-open');
    window.addEventListener('hashchange', router);
    router();
    A.majPied();
  }

  AB.vues = AB.vues || {};
  document.addEventListener('DOMContentLoaded', demarrer);
})();
