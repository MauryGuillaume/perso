/* ecran-semaine.js — HandFit : « Semaine » (#/semaine) : planning du lundi au dimanche, état de la semaine en cours,
   et « Historique » (#/historique) : jours passés, exercices faits, douleur au tibia. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};

  /** Lundi de la semaine de la date d. */
  function lundi(d) { const l = new Date(d); l.setHours(0, 0, 0, 0); l.setDate(l.getDate() - ((l.getDay() + 6) % 7)); return l; }
  const etatJour = j => !j || !j.total ? '' : j.faits.length >= j.total ? '✓' : `${j.faits.length}/${j.total}`;

  E.semaine = {
    titre: 'Semaine', onglet: 'Semaine',
    async rendre(racine) {
      const A = window.appli;
      const jours = new Map((await A.db.tous('jours')).map(j => [j.date, j]));
      const l = lundi(new Date()), auj = A.cleDate();
      const lignes = [1, 2, 3, 4, 5, 6, 0].map((n, i) => {
        const d = new Date(l); d.setDate(l.getDate() + i);
        const cle = A.cleDate(d), j = jours.get(cle), p = A.SEMAINE[n];
        const etat = etatJour(j);
        return `<li><a href="${cle === auj ? '#/jour' : '#/apercu/' + n}"${cle === auj ? ' aria-current="date" class="aujourdhui"' : ''}>
          <span class="jour-court">${A.esc(A.NOMS_JOURS[n].slice(0, 3))}</span>
          <span class="ligne-texte">${A.esc(p.titre)}<small>${A.esc(p.detail)}</small></span>
          ${etat ? `<span class="etat${etat === '✓' ? ' complet' : ''}" aria-label="${etat === '✓' ? 'séance faite' : 'exercices faits : ' + etat}">${A.esc(etat)}</span>` : ''}
          <span class="chevron" aria-hidden="true">›</span></a></li>`;
      }).join('');
      const faites = [...jours.values()].filter(j => j.date >= A.cleDate(l) && j.total && j.faits.length >= j.total).length;
      racine.innerHTML = `<h1 class="titre">Ma semaine</h1>
        <p class="doux">${faites} séance${faites > 1 ? 's' : ''} complète${faites > 1 ? 's' : ''} cette semaine. 30 à 45 min par jour, les muscles alternent pour récupérer.</p>
        <ul class="liste-liens">${lignes}</ul>
        <div class="info"><strong>Routine tibias</strong> : renforcement lundi, mercredi et vendredi, mobilité et contrôle les autres jours. Les sauts n’apparaissent qu’en profil « reprise sportive » sans douleur.</div>`;
    }
  };

  E.historique = {
    titre: 'Historique', onglet: 'Historique',
    async rendre(racine) {
      const A = window.appli;
      const jours = (await A.db.tous('jours')).filter(j => j.total).sort((a, b) => b.date.localeCompare(a.date));
      if (!jours.length) {
        racine.innerHTML = `<h1 class="titre">Historique</h1><div class="carte vide"><span class="emoji" aria-hidden="true">📅</span>Rien pour l’instant. Coche tes premiers exercices dans « Aujourd’hui ».</div>`;
        return;
      }
      // 14 derniers jours : douleur au tibia
      const parDate = new Map(jours.map(j => [j.date, j]));
      const barres = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - 13 + i);
        const j = parDate.get(A.cleDate(d));
        return { j, d };
      });
      const complets = jours.filter(j => j.faits.length >= j.total).length;
      racine.innerHTML = `<h1 class="titre">Historique</h1>
        <div class="carte">
          <h2 class="sous-titre sans-marge">Douleur au tibia, 14 derniers jours</h2>
          <div class="graphe" role="img" aria-label="Douleur au tibia sur 14 jours : ${barres.map(b => b.j ? b.j.douleur : '–').join(', ')}">
            ${barres.map(b => `<div class="colonne"><span class="barre-douleur${b.j ? (b.j.douleur >= 7 ? ' fort' : b.j.douleur >= 4 ? ' moyen' : '') : ' vide'}" data-h="${b.j ? b.j.douleur : 0}"></span>
              <small>${A.esc(String(b.d.getDate()))}</small></div>`).join('')}
          </div>
          <p class="doux">${complets} séance${complets > 1 ? 's' : ''} complète${complets > 1 ? 's' : ''} sur ${jours.length} jour${jours.length > 1 ? 's' : ''} suivis.</p>
        </div>
        <ul class="liste-liens">${jours.map(j => {
          const d = A.versDate(j.date), complet = j.faits.length >= j.total;
          return `<li><div class="ligne"><span class="jour-court">${A.esc(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))}</span>
            <span class="ligne-texte">${A.esc(j.titre || '')}<small>${j.faits.length}/${j.total} exercices · tibia ${j.douleur}/10${j.alerte ? ' · signe inquiétant' : ''} · ${j.duree} min</small></span>
            ${complet ? '<span class="etat complet" aria-label="séance complète">✓</span>' : ''}</div></li>`;
        }).join('')}</ul>`;
      racine.querySelectorAll('.barre-douleur').forEach(b => { b.style.height = Math.max(4, Number(b.dataset.h) * 10) + '%'; });
    }
  };
})();
