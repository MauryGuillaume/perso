/* app.js — Notix, sur le socle PWA (kit « Socle PWA » 2.0) : routeur par #, écrans, appels à l'API, toast, service worker.
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

  /* ---------- Écrans : un fichier ecran-<nom>.js par écran, chargés avant app.js ---------- */
  const ECRANS = window.ECRANS_APP || {};
  const DEFAUT = 'enregistrer';

  /* ---------- Routeur ---------- */
  let nettoyage = null;
  function router() {
    const [cle, ...params] = location.hash.replace(/^#\/?/, '').split('/');
    const ecran = ECRANS[cle] || ECRANS[DEFAUT];
    if (typeof nettoyage === 'function') nettoyage();
    const vue = document.getElementById('vue');
    vue.innerHTML = '';
    document.getElementById('titre').textContent = ecran.titre;
    document.title = ecran.titre + ' · Notix';
    document.querySelectorAll('#onglets a').forEach(a => a.toggleAttribute('aria-current', a.dataset.ecran === (ECRANS[cle] ? (ecran.parent || cle) : DEFAUT)));
    document.querySelectorAll('#onglets a[aria-current]').forEach(a => a.setAttribute('aria-current', 'page'));
    nettoyage = ecran.rendre(vue, params.map(decodeURIComponent));
    vue.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('onglets').innerHTML = Object.entries(ECRANS).filter(([, e]) => e.onglet)
      .map(([cle, e]) => `<a href="#/${cle}" data-ecran="${cle}">${(window.notixVue && window.notixVue.ICONES[e.icone]) || ''}<span>${A.esc(e.onglet)}</span></a>`).join('');
    window.addEventListener('hashchange', router);
    router();
    // Service worker : seulement en http(s) (pas en file://)
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})();
