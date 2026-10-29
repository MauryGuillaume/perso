/* ecran-mois.js — Legumly : écran « Ce mois-ci » (accueil). Adresse : #/mois/<1-12> */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  let filtre = 'tout', recherche = '';

  const SECTIONS = [
    { cle: 'semisAbri', titre: 'À semer à l’abri', pastille: 'abri', aide: 'En godets, au chaud et à la lumière' },
    { cle: 'semisTerre', titre: 'À semer en place', pastille: 'terre', aide: 'Directement dans le bac ou au jardin' },
    { cle: 'plantation', titre: 'À planter ou repiquer', pastille: 'plant', aide: 'Plants, bulbes et semis à l’abri prêts' },
    { cle: 'recolte', titre: 'À récolter', pastille: 'recolte', aide: '' }
  ];

  E.mois = {
    titre: 'Ce mois-ci', onglet: 'Ce mois',
    async rendre(racine, params) {
      const A = window.appli;
      const courant = new Date().getMonth() + 1;
      const m = Math.min(12, Math.max(1, parseInt(params[0], 10) || courant));
      const [{ liste }, zoneChoisie, plantations] = await Promise.all([A.legumes(), A.db.reglage('zone', null), A.db.tous('plantations')]);
      const zone = zoneChoisie || A.ZONE_DEFAUT;
      const prec = m === 1 ? 12 : m - 1, suiv = m === 12 ? 1 : m + 1;

      racine.innerHTML = `
        <div id="gel"></div>
        ${zoneChoisie ? '' : `<div class="info"><strong>Bienvenue dans Legumly 🌱</strong><br>
          Le calendrier est réglé sur la zone océanique. Choisissez votre zone et votre commune pour un calendrier juste et l’alerte gel.
          <div class="actions"><a class="btn" href="#/reglages">Régler ma zone</a></div></div>`}
        <div class="nav-mois">
          <a class="btn-rond" href="#/mois/${prec}" aria-label="Mois précédent : ${A.esc(A.MOIS[prec - 1])}">‹</a>
          <h1 class="titre">${A.esc(A.MOIS[m - 1])}</h1>
          <a class="btn-rond" href="#/mois/${suiv}" aria-label="Mois suivant : ${A.esc(A.MOIS[suiv - 1])}">›</a>
        </div>
        <div class="zone-ligne"><span class="doux">Zone ${A.esc(A.ZONES[zone].nom.toLowerCase())}${m === courant ? ' · mois en cours' : ''}</span>
          ${m === courant ? '' : `<a href="#/mois/${courant}" class="doux">Revenir à ${A.esc(A.MOIS[courant - 1])}</a>`}</div>
        <div id="a-faire"></div>
        <div class="puces" role="group" aria-label="Afficher">
          ${[['tout', 'Tout'], ['legume', 'Légumes'], ['aromate', 'Aromates']].map(([c, t]) => `<button type="button" class="puce" data-filtre="${c}" aria-pressed="${filtre === c}">${t}</button>`).join('')}
        </div>
        <label class="recherche"><span class="visuellement-cache">Chercher dans le mois</span>
          <input type="search" id="recherche" placeholder="Chercher un légume…" value="${A.esc(recherche)}" autocomplete="off" enterkeyhint="search"></label>
        <div id="listes"></div>
        <a class="btn btn-secondaire btn-plein" href="#/legumes">Tous les légumes et aromates (${liste.length})</a>`;

      const zoneListes = racine.querySelector('#listes');
      const calendriers = Object.fromEntries(liste.map(l => [l.id, A.calendrier(l, zone)]));
      function afficher() {
        const q = A.normaliser(recherche);
        const visibles = liste.filter(l => (filtre === 'tout' || l.type === filtre) && (!q || A.normaliser(l.nom).includes(q)));
        const html = SECTIONS.map(s => {
          const items = visibles.filter(l => calendriers[l.id][s.cle].includes(m));
          if (!items.length) return '';
          return `<h2 class="sous-titre"><span class="pastille ${s.pastille}" aria-hidden="true"></span>${A.esc(s.titre)} <span class="doux">(${items.length})</span></h2>
            ${s.aide ? `<p class="doux aide-section">${A.esc(s.aide)}</p>` : ''}
            <ul class="liste-liens">${items.map(l => A.ligneLegume(l, s.cle === 'recolte' ? '' : `Récolte : ${A.texteMois(calendriers[l.id].recolte)}`)).join('')}</ul>`;
        }).join('');
        zoneListes.innerHTML = html || `<div class="vide"><span class="emoji" aria-hidden="true">🔍</span>${q ? 'Rien ne correspond à cette recherche ce mois-ci.' : 'Rien à faire ce mois-ci pour ce filtre.'}</div>`;
      }
      afficher();
      racine.querySelectorAll('.puce').forEach(b => {
        b.onclick = () => {
          filtre = b.dataset.filtre;
          racine.querySelectorAll('.puce').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          afficher();
        };
      });
      racine.querySelector('#recherche').oninput = e => { recherche = e.target.value; afficher(); };

      // Rappels de la semaine (lien) et alerte gel : chargés après l'affichage
      A.rappels().then(r => {
        const fin = A.ajouterJours(A.aujourdhui(), 7);
        const n = r.filter(x => !x.fait && x.date <= fin).length;
        if (n && racine.isConnected) racine.querySelector('#a-faire').innerHTML =
          `<ul class="liste-liens"><li><a href="#/rappels"><span class="emoji" aria-hidden="true">🔔</span><span class="ligne-texte">${n} chose${n > 1 ? 's' : ''} à faire cette semaine</span><span class="chevron" aria-hidden="true">›</span></a></li></ul>`;
      }).catch(() => {});
      const { parId } = await A.legumes();
      const sensibles = [...new Set(plantations.filter(p => p.statut === 'en-cours' && parId[p.legumeId] && parId[p.legumeId].gel === 'sensible').map(p => parId[p.legumeId].nom.toLowerCase()))];
      A.meteo.bandeau(sensibles).then(h => { if (racine.isConnected) racine.querySelector('#gel').innerHTML = h; });
    }
  };
})();
