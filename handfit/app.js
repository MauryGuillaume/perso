/* app.js — HandFit, sur le socle PWA (kit « Socle PWA ») : routeur par #, écrans, appels à l'API, toast, service worker.
   Vanilla, sans build. Chaque écran : { titre, onglet?, parent?, rendre(racine, params) → nettoyage? }
   Les écrans sont déclarés dans window.ECRANS_APP par les fichiers ecran-*.js, chargés avant celui-ci. */
(function () {
  'use strict';
  const A = window.appli = window.appli || {};
  const NOM_APP = 'HandFit';

  /** Échappe une valeur avant de la mettre dans du HTML. À utiliser pour TOUTE donnée affichée. */
  A.esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Appel à l'API du même serveur, par chemin relatif (/api/…) : compatible avec l'app mobile de l'Atelier.
      HandFit n'a pas de serveur : tout reste sur le téléphone (db.js). Gardé pour rester sur le socle. */
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

  /** Bouton « Désactivé pendant l'envoi » : exécute fn, rétablit le bouton, affiche l'erreur dans zoneErreur. */
  A.pendant = async function (bouton, zoneErreur, fn) {
    if (bouton) bouton.disabled = true;
    if (zoneErreur) zoneErreur.textContent = '';
    try { return await fn(); }
    catch (e) { if (zoneErreur) zoneErreur.textContent = e.message; else A.toast(e.message); }
    finally { if (bouton) bouton.disabled = false; }
  };

  /* ---------- Écrans ---------- */
  const ECRANS = window.ECRANS_APP || {};
  const DEFAUT = 'jour';
  const ICONES = {
    jour: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
    semaine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    historique: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>'
  };

  /* ---------- Routeur ---------- */
  let nettoyage = null, profondeur = 0, cleCourante = null;
  function router() {
    const [cle, ...params] = location.hash.replace(/^#\/?/, '').split('/');
    const vraieCle = ECRANS[cle] ? cle : DEFAUT;
    const ecran = ECRANS[vraieCle];
    if (typeof nettoyage === 'function') nettoyage();
    nettoyage = null;
    const vue = document.getElementById('vue');
    vue.innerHTML = '';
    // Un conteneur neuf par affichage : un écran asynchrone ancien écrit dans un nœud détaché, sans effet.
    const racine = document.createElement('div');
    vue.appendChild(racine);
    document.getElementById('titre').textContent = ecran.titre;
    document.title = ecran.titre === NOM_APP ? NOM_APP : ecran.titre + ' · ' + NOM_APP;
    const ongletActif = ecran.onglet ? vraieCle : ecran.parent;
    document.querySelectorAll('#onglets a').forEach(a => {
      if (a.dataset.ecran === ongletActif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('retour').hidden = !!ecran.onglet;
    document.getElementById('lien-reglages').hidden = vraieCle === 'reglages';
    cleCourante = vraieCle;
    let r;
    try { r = ecran.rendre(racine, params.filter(Boolean).map(decodeURIComponent)); } catch (e) { r = Promise.reject(e); }
    if (r && typeof r.then === 'function') {
      r.then(n => { if (racine.isConnected) nettoyage = n; }).catch(e => {
        console.error(e);
        if (racine.isConnected) racine.innerHTML = `<div class="carte"><p class="erreur" role="alert">${A.esc(e.message || 'Erreur inattendue.')}</p></div>`;
      });
    } else nettoyage = r;
    vue.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('onglets').innerHTML = Object.entries(ECRANS).filter(([, e]) => e.onglet)
      .map(([cle, e]) => `<a href="#/${cle}" data-ecran="${cle}">${ICONES[cle] || ''}<span>${A.esc(e.onglet)}</span></a>`).join('');
    window.addEventListener('hashchange', () => { profondeur++; router(); });
    document.getElementById('retour').onclick = () => {
      if (profondeur > 0) { profondeur -= 2; history.back(); }
      else location.hash = '#/' + ((ECRANS[cleCourante] && ECRANS[cleCourante].parent) || DEFAUT);
    };
    router();
    // Service worker : seulement en http(s) (pas en file://)
    if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})();
