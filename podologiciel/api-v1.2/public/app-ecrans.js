/* app-ecrans.js — écran web de l'API PodoLogiciel. Kit « App complète » : KIT.md § 8.
   L'app des podologues est l'écran Vue (podology-web) ; ici, un résumé du compte connecté et l'accès au compte.
   Règles : toute donnée venue de la base passe par esc() avant innerHTML. */
'use strict';
(function () {
  const { api, esc, ecran } = window.appli;

  ecran('#/resume', { titre: 'Résumé', onglet: 'Résumé' }, async vue => {
    const r = await api('GET', '/api/resume');
    vue.innerHTML = `<h1>PodoLogiciel</h1>
      <p class="doux">Les podologues utilisent l’application PodoLogiciel (web et mobile) ; cette page résume ton compte.</p>
      <ul class="liste carte">
        <li class="ligne"><span class="pousse">Patients</span><strong>${esc(r.patients)}</strong></li>
        <li class="ligne"><span class="pousse">Bilans</span><strong>${esc(r.bilans)}</strong></li>
        <li class="ligne"><span class="pousse">Rendez-vous à venir</span><strong>${esc(r.rendez_vous_a_venir)}</strong></li>
      </ul>`;
  });

  ecran('#/compte', { titre: 'Mon compte', onglet: 'Compte' }, null);   // onglet vers l'écran du socle
})();
