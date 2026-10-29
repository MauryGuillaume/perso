/* app.js — socle PWA (kit « Socle PWA ») : routeur par #, écrans, appels à l'API, toast, service worker.
   Vanilla, sans build. Chaque écran : { titre, onglet?, rendre(racine, params) → nettoyage? } */
(function () {
  'use strict';
  const A = window.appli = {};

  /** Échappe une valeur avant de la mettre dans du HTML. À utiliser pour TOUTE donnée affichée. */
  A.esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Appel à l'API du même serveur, par chemin relatif (/api/…) : compatible avec l'app mobile de l'Atelier. */
  A.api = async function (chemin, options = {}) {
    const init = { method: options.method || 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (options.corps !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(options.corps); }
    let r;
    try { r = await fetch(chemin, init); } catch (e) { throw new Error('Pas de connexion. Réessaie dans un instant.'); }
    const d = r.headers.get('content-type') && r.headers.get('content-type').includes('json') ? await r.json() : null;
    if (!r.ok) throw new Error((d && d.erreur) || `Erreur ${r.status}`);
    return d;
  };

  let timerToast;
  A.toast = function (texte) {
    const t = document.getElementById('toast');
    t.textContent = texte; t.hidden = false;
    clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 3500);
  };

  /* ---------- Écrans (à remplacer par ceux de l'app) ---------- */
  const ECRANS = {
    accueil: {
      titre: 'Accueil', onglet: 'Accueil',
      rendre(racine) {
        racine.innerHTML = `<h1 class="titre">Bonjour</h1>
          <div class="carte"><p>Socle PWA de l'Atelier de Blocs. Remplace cet écran par ceux de ton app.</p>
          <button class="btn" id="essai">Afficher un message</button></div>`;
        racine.querySelector('#essai').onclick = () => A.toast('Ça marche.');
      }
    },
    liste: {
      titre: 'Liste', onglet: 'Liste',
      rendre(racine) {
        const elements = ['Premier', 'Deuxième', '<b>pas de HTML injecté</b>'];
        racine.innerHTML = `<h1 class="titre">Liste</h1><ul class="liste carte">${elements.map(e => `<li>${A.esc(e)}</li>`).join('')}</ul>`;
      }
    },
    reglages: {
      titre: 'Réglages', onglet: 'Réglages',
      rendre(racine) {
        racine.innerHTML = `<h1 class="titre">Réglages</h1>
          <form class="carte" id="form" novalidate>
            <label class="champ"><span>Nom</span><input name="nom" maxlength="80" autocomplete="name" required></label>
            <button class="btn">Enregistrer</button><p class="erreur" id="err" role="alert"></p></form>`;
        racine.querySelector('#form').onsubmit = e => {
          e.preventDefault();
          const nom = e.target.nom.value.trim();
          racine.querySelector('#err').textContent = nom ? '' : 'Le nom est obligatoire.';
          if (nom) A.toast('Enregistré');
        };
      }
    }
  };
  const DEFAUT = 'accueil';

  /* ---------- Routeur ---------- */
  let nettoyage = null;
  function router() {
    const [cle, ...params] = location.hash.replace(/^#\/?/, '').split('/');
    const ecran = ECRANS[cle] || ECRANS[DEFAUT];
    if (typeof nettoyage === 'function') nettoyage();
    const vue = document.getElementById('vue');
    vue.innerHTML = '';
    document.getElementById('titre').textContent = ecran.titre;
    document.title = ecran.titre + ' · Mon app';
    document.querySelectorAll('#onglets a').forEach(a => a.toggleAttribute('aria-current', a.dataset.ecran === (ECRANS[cle] ? cle : DEFAUT)));
    document.querySelectorAll('#onglets a[aria-current]').forEach(a => a.setAttribute('aria-current', 'page'));
    nettoyage = ecran.rendre(vue, params.map(decodeURIComponent));
    vue.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('onglets').innerHTML = Object.entries(ECRANS).filter(([, e]) => e.onglet)
      .map(([cle, e]) => `<a href="#/${cle}" data-ecran="${cle}">${A.esc(e.onglet)}</a>`).join('');
    window.addEventListener('hashchange', router);
    router();
    // Service worker : seulement en http(s) (pas en file://)
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})();
