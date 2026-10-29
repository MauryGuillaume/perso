/* bandeau-cookies.js — kit « Affichage France » v2.0 (Atelier de Blocs). PRÊT ET TESTÉ : ne pas modifier.
   Conforme aux lignes directrices de la CNIL (2020, mises à jour 2023) :
   - sans traceur soumis au consentement (mesure d'audience non exemptée, publicité, réseaux sociaux) : simple information ;
   - avec : « Tout accepter » et « Tout refuser » au même niveau, rien n'est déposé avant le choix,
     choix gardé 6 mois, modifiable à tout moment (lien « Gérer les cookies »).
   Réglage AVANT le script :  window.COOKIES = { finalites: { mesure: 'Mesure d’audience (Matomo)' }, confidentialite: 'confidentialite.html' };
   Lecture :  consentement.a('mesure') → true / false ;  événement 'consentement' sur window à chaque choix.
   Un lien <a href="#" data-cookies> rouvre le bandeau.  Styles : affichage.css. */
(function () {
  'use strict';
  const R = Object.assign({ finalites: {}, confidentialite: 'confidentialite.html', dureeMois: 6,
    texteInfo: 'Cette app utilise uniquement les cookies nécessaires à son fonctionnement.',
    texte: 'Avec votre accord, nous utilisons des traceurs pour les finalités suivantes. Vous pouvez changer d’avis à tout moment.' }, window.COOKIES || {});
  const CLE = 'consentement-cookies';
  const finalites = Object.keys(R.finalites);
  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; } };
  const ecrire = v => { try { localStorage.setItem(CLE, JSON.stringify(v)); } catch (e) { /* navigation privée : redemandé */ } };
  const valide = c => c && c.date && (Date.now() - c.date) < R.dureeMois * 30.5 * 86400000 && finalites.every(f => f in (c.choix || {}));
  let choix = valide(lire()) ? lire() : null;

  window.consentement = {
    a: f => !!(choix && choix.choix && choix.choix[f] === true),
    choix: () => choix ? Object.assign({}, choix.choix) : null,
    ouvrir: () => afficher(true)
  };

  function enregistrer(valeurs) {
    choix = { date: Date.now(), choix: valeurs };
    ecrire(choix);
    fermer();
    window.dispatchEvent(new CustomEvent('consentement', { detail: Object.assign({}, valeurs) }));
  }
  function fermer() { const b = document.getElementById('bandeau-cookies'); if (b) b.remove(); }
  function el(tag, classe, texte) { const e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; }

  function afficher(force) {
    fermer();
    const b = el('div', 'bandeau-cookies');
    b.id = 'bandeau-cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookies');
    const p = el('p', null, finalites.length ? R.texte : R.texteInfo);
    b.appendChild(p);
    const lien = el('a', null, 'En savoir plus');
    lien.href = R.confidentialite;
    if (finalites.length) {
      const liste = el('div', 'bandeau-cookies-finalites');
      const cases = {};
      finalites.forEach(f => {
        const l = el('label', 'bandeau-cookies-case');
        const c = el('input'); c.type = 'checkbox'; c.checked = window.consentement.a(f);
        cases[f] = c;
        l.appendChild(c); l.appendChild(document.createTextNode(' ' + R.finalites[f]));
        liste.appendChild(l);
      });
      b.appendChild(liste);
      const actions = el('div', 'bandeau-cookies-actions');
      const tout = v => Object.fromEntries(finalites.map(f => [f, v]));
      const refuser = el('button', 'btn btn-secondaire', 'Tout refuser');
      const accepter = el('button', 'btn btn-secondaire', 'Tout accepter');   // même apparence que « Tout refuser » (CNIL)
      const garder = el('button', 'btn', 'Enregistrer mes choix');
      refuser.type = accepter.type = garder.type = 'button';
      refuser.onclick = () => enregistrer(tout(false));
      accepter.onclick = () => enregistrer(tout(true));
      garder.onclick = () => enregistrer(Object.fromEntries(finalites.map(f => [f, cases[f].checked])));
      actions.append(refuser, accepter, garder, lien);
      b.appendChild(actions);
    } else {
      const actions = el('div', 'bandeau-cookies-actions');
      const ok = el('button', 'btn', 'J’ai compris');
      ok.type = 'button';
      ok.onclick = () => enregistrer({});
      actions.append(ok, lien);
      b.appendChild(actions);
    }
    document.body.appendChild(b);
    if (force) (b.querySelector('button') || b).focus();
  }

  function demarrer() {
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('[data-cookies]');
      if (a) { e.preventDefault(); afficher(true); }
    });
    if (!choix) afficher(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
