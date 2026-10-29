/* ecran-legumes.js — Legumly : « Tous les légumes » (#/legumes) et « Fiche légume » (#/fiche/<id>). */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  let filtre = 'tout', recherche = '';

  E.legumes = {
    titre: 'Tous les légumes', parent: 'mois',
    async rendre(racine) {
      const A = window.appli;
      const { liste } = await A.legumes();
      racine.innerHTML = `
        <h1 class="titre">Légumes et aromates</h1>
        <div class="puces" role="group" aria-label="Afficher">
          ${[['tout', 'Tout'], ['legume', 'Légumes'], ['aromate', 'Aromates']].map(([c, t]) => `<button type="button" class="puce" data-filtre="${c}" aria-pressed="${filtre === c}">${t}</button>`).join('')}
        </div>
        <label class="recherche"><span class="visuellement-cache">Chercher</span>
          <input type="search" id="recherche" placeholder="Chercher un légume…" value="${A.esc(recherche)}" autocomplete="off" enterkeyhint="search"></label>
        <p class="doux" id="compte" aria-live="polite"></p>
        <ul class="liste-liens" id="liste"></ul>`;
      const zone = racine.querySelector('#liste');
      function afficher() {
        const q = A.normaliser(recherche);
        const items = liste.filter(l => (filtre === 'tout' || l.type === filtre) && (!q || A.normaliser(l.nom + ' ' + l.famille).includes(q)));
        zone.innerHTML = items.map(l => A.ligneLegume(l, l.famille)).join('');
        zone.hidden = !items.length;
        racine.querySelector('#compte').textContent = items.length ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : 'Aucun résultat.';
      }
      afficher();
      racine.querySelectorAll('.puce').forEach(b => {
        b.onclick = () => { filtre = b.dataset.filtre; racine.querySelectorAll('.puce').forEach(x => x.setAttribute('aria-pressed', String(x === b))); afficher(); };
      });
      racine.querySelector('#recherche').oninput = e => { recherche = e.target.value; afficher(); };
    }
  };

  const LIGNES = [
    { cle: 'semisAbri', nom: 'Semis à l’abri', classe: 'abri' },
    { cle: 'semisTerre', nom: 'Semis en place', classe: 'terre' },
    { cle: 'plantation', nom: 'Plantation', classe: 'plant' },
    { cle: 'recolte', nom: 'Récolte', classe: 'recolte' }
  ];

  E.fiche = {
    titre: 'Fiche légume', parent: 'mois',
    async rendre(racine, params) {
      const A = window.appli;
      const [{ parId }, zoneChoisie, plantations] = await Promise.all([A.legumes(), A.db.reglage('zone', null), A.db.tous('plantations')]);
      const l = parId[params[0]];
      if (!l) { racine.innerHTML = `<div class="vide"><span class="emoji" aria-hidden="true">🤔</span>Ce légume est introuvable.<div class="actions"><a class="btn" href="#/legumes">Voir tous les légumes</a></div></div>`; return; }
      document.getElementById('titre').textContent = l.nom;
      document.title = l.nom + ' · Legumly';
      const zone = zoneChoisie || A.ZONE_DEFAUT;
      const cal = A.calendrier(l, zone);
      const courant = new Date().getMonth() + 1;
      const enCours = plantations.filter(p => p.legumeId === l.id && p.statut === 'en-cours').length;
      const lignes = LIGNES.filter(x => cal[x.cle].length);
      const voisins = ids => ids.map(id => parId[id]).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
        .map(v => `<a href="#/fiche/${A.esc(v.id)}"><span aria-hidden="true">${A.esc(v.emoji)}</span>${A.esc(v.nom)}</a>`).join('');
      const cm = v => `${String(v).replace('.', ',')} cm`;
      const delai = l.joursRecolte >= 365 ? `${Math.round(l.joursRecolte / 365)} an${l.joursRecolte >= 730 ? 's' : ''} (vivace)` : `${Math.round(l.joursRecolte / 7)} semaines environ`;

      racine.innerHTML = `
        <div class="entete-fiche"><span class="emoji" aria-hidden="true">${A.esc(l.emoji)}</span>
          <div><h1 class="titre">${A.esc(l.nom)}</h1>
          <div class="etiquettes"><span class="etiquette">${A.esc(l.famille)}</span><span class="etiquette">${l.type === 'aromate' ? 'Aromate' : 'Légume'}</span>
          ${l.vivace ? '<span class="etiquette">Vivace</span>' : ''}
          <span class="etiquette ${l.gel === 'sensible' ? 'etiquette-gel' : ''}">${l.gel === 'sensible' ? '❄️ Craint le gel' : l.gel === 'rustique' ? 'Rustique' : 'Demi-rustique'}</span></div></div>
        </div>
        ${enCours ? `<div class="info">Dans mon potager : ${enCours} plantation${enCours > 1 ? 's' : ''} en cours. <a href="#/potager">Voir</a></div>` : ''}
        <section class="carte" aria-labelledby="t-cal">
          <h2 class="sous-titre" id="t-cal">Calendrier · zone ${A.esc(A.ZONES[zone].nom.toLowerCase())}</h2>
          <div class="calendrier" aria-hidden="true">
            <span></span>${A.MOIS_COURTS.map((x, i) => `<span class="mois-tete${i + 1 === courant ? ' courant' : ''}">${x}</span>`).join('')}
            ${lignes.map(x => `<span class="nom-ligne">${A.esc(x.nom)}</span>${A.MOIS_COURTS.map((_, i) => `<span class="case${cal[x.cle].includes(i + 1) ? ' ' + x.classe : ''}"></span>`).join('')}`).join('')}
          </div>
          <ul class="liste">${lignes.map(x => `<li><span class="pastille ${x.classe}" aria-hidden="true"></span><strong>${A.esc(x.nom)}</strong> : ${A.esc(A.texteMois(cal[x.cle]))}</li>`).join('')}</ul>
          <p class="doux">Calendrier indicatif : suivez aussi la météo de l’année.${zoneChoisie ? '' : ' <a href="#/reglages">Choisir ma zone</a>'}</p>
        </section>
        <section class="carte" aria-labelledby="t-culture">
          <h2 class="sous-titre" id="t-culture">Culture</h2>
          <dl class="caracs">
            <div><dt>Entre les rangs</dt><dd>${A.esc(cm(l.espacementRang))}</dd></div>
            <div><dt>Entre les plants</dt><dd>${A.esc(cm(l.espacementPlants))}</dd></div>
            <div><dt>Profondeur de semis</dt><dd>${A.esc(cm(l.profondeur))}</dd></div>
            <div><dt>Jusqu’à la récolte</dt><dd>${A.esc(delai)}</dd></div>
            <div><dt>Exposition</dt><dd>${A.esc(l.exposition === 'soleil' ? 'Plein soleil' : 'Mi-ombre')}</dd></div>
            <div><dt>Arrosage</dt><dd>${A.esc(l.arrosage[0].toUpperCase() + l.arrosage.slice(1))}</dd></div>
            ${l.joursRepiquage ? `<div><dt>Repiquage</dt><dd>${A.esc(Math.round(l.joursRepiquage / 7))} semaines après le semis</dd></div>` : ''}
          </dl>
          <p>${A.esc(l.conseil)}</p>
        </section>
        ${l.amis.length || l.ennemis.length ? `<section class="carte" aria-labelledby="t-voisins">
          <h2 class="sous-titre" id="t-voisins">Associations</h2>
          ${l.amis.length ? `<p class="doux">👍 Bons voisins</p><div class="voisins">${voisins(l.amis)}</div>` : ''}
          ${l.ennemis.length ? `<p class="doux">👎 À éloigner</p><div class="voisins">${voisins(l.ennemis)}</div>` : ''}
        </section>` : ''}
        <a class="btn btn-plein" href="#/plantation/nouvelle/${A.esc(l.id)}">Ajouter à mon potager</a>`;
    }
  };
})();
