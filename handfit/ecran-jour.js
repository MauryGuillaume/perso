/* ecran-jour.js — HandFit : « Aujourd'hui » (#/jour) : bilan rapide, exercices du jour à cocher.
   Aussi « Aperçu » (#/apercu/<0-6>) : la séance type d'un jour de la semaine, sans cocher. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};

  /** Une ligne d'exercice : case à cocher (si coche fournie) et consignes dépliables. */
  function ligneExo(A, it, fait, cochable) {
    const e = A.ex(it.id);
    return `<li class="exo${fait ? ' fait' : ''}">
      ${cochable ? `<button type="button" class="case-a-cocher" data-id="${A.esc(e.id)}" aria-pressed="${fait}" aria-label="${A.esc(e.nom)} : ${fait ? 'fait' : 'à faire'}">${fait ? '✓' : ''}</button>` : ''}
      <details class="exo-details">
        <summary><span class="ligne-texte"><span class="exo-nom">${A.esc(e.nom)}</span><small>${A.esc(it.cible)}${e.mat === 'elastique' ? ' · élastique' : ''}</small></span></summary>
        <dl class="consignes">
          <dt>Installation</dt><dd>${A.esc(e.installation)}</dd>
          <dt>Mouvement</dt><dd>${A.esc(e.mouvement)}</dd>
          <dt>À éviter</dt><dd>${A.esc(e.erreurs)}</dd>
          ${e.hand ? `<dt>Pour le hand</dt><dd>${A.esc(e.hand)}</dd>` : ''}
        </dl>
      </details>
    </li>`;
  }
  function blocsHtml(A, seance, faits, cochable) {
    return seance.blocs.filter(b => b.items.length).map(b => `<section aria-labelledby="b-${b.cle}">
      <h2 class="sous-titre" id="b-${b.cle}">${emojiBloc(b.cle)} ${A.esc(b.titre)}</h2>
      ${b.aide ? `<p class="doux aide-section">${A.esc(b.aide)}</p>` : ''}
      <ul class="liste-exos">${b.items.map(it => ligneExo(A, it, faits.has(it.id), cochable)).join('')}</ul></section>`).join('');
  }
  const emojiBloc = cle => ({ echauffement: '🔥', explosif: '⚡', principal: '🏋️', complement: '🧱', cardio: '❤️', tibias: '🦶' }[cle] || '');
  const alertesHtml = (A, s) => s.alertes.map(a => `<div class="${a.niveau === 'info' ? 'info' : 'alerte'}${a.niveau === 'danger' ? ' alerte-danger' : ''}" ${a.niveau === 'danger' ? 'role="alert"' : ''}>${A.esc(a.texte)}</div>`).join('');
  const idsDe = s => s.blocs.flatMap(b => b.items.map(i => i.id));

  E.jour = {
    titre: 'Aujourd’hui', onglet: 'Aujourd’hui',
    async rendre(racine) {
      const A = window.appli;
      const aujourdhui = new Date(), cle = A.cleDate(aujourdhui);
      let profil = await A.db.reglage('profil', null);
      const enregistre = await A.db.lire('jours', cle);
      const dureeDefaut = await A.db.reglage('duree', 45);
      const etat = enregistre || { date: cle, douleur: 0, duree: dureeDefaut, alerte: false, faits: [] };
      const faits = new Set(etat.faits);

      async function sauver(seance) {
        const ids = idsDe(seance);
        etat.faits = ids.filter(id => faits.has(id));
        etat.total = ids.length;
        etat.titre = seance.jour.titre;
        await A.db.mettre('jours', { ...etat });
      }

      function afficher() {
        if (!profil) {
          racine.innerHTML = `<h1 class="titre">Bienvenue 👋</h1>
            <div class="carte">
              <p>Chaque jour : un bilan de 5 secondes, puis la liste des exercices à cocher. La séance s’adapte à tes tibias.</p>
              <p class="doux">Cette app ne remplace pas un avis médical. Une douleur au tibia n’est pas toujours une périostite : si elle est présente au repos, très localisée ou s’aggrave, consulte avant de continuer le travail des jambes.</p>
              <h2 class="sous-titre">Où en sont tes tibias ?</h2>
              <ul class="liste-liens">${Object.entries(A.PROFILS).map(([c, p]) => `<li><button type="button" class="bouton-ligne ligne" data-profil="${c}">
                <span class="ligne-texte">${A.esc(p.nom)}<small>${A.esc(p.aide)}</small></span><span class="chevron" aria-hidden="true">›</span></button></li>`).join('')}</ul>
              <p class="doux">Modifiable à tout moment dans les réglages.</p>
            </div>`;
          racine.querySelectorAll('[data-profil]').forEach(b => b.onclick = async () => {
            profil = b.dataset.profil; await A.db.regler('profil', profil); afficher();
          });
          return;
        }
        const seance = A.seanceDuJour(aujourdhui, etat, profil);
        const ids = idsDe(seance), nbFaits = ids.filter(id => faits.has(id)).length;
        const pct = ids.length ? Math.round(nbFaits * 100 / ids.length) : 0;
        racine.innerHTML = `<h1 class="titre">${A.esc(A.NOMS_JOURS[aujourdhui.getDay()])} · ${A.esc(seance.jour.titre)}</h1>
          <p class="doux entete-detail">${A.esc(seance.jour.detail)}</p>
          <section class="carte" aria-labelledby="t-bilan">
            <h2 class="sous-titre sans-marge" id="t-bilan">Mon bilan du jour</h2>
            <p class="champ-titre" id="l-douleur">Douleur au tibia : <strong>${etat.douleur}/10</strong></p>
            <div class="echelle" role="group" aria-labelledby="l-douleur">${Array.from({ length: 11 }, (_, n) =>
              `<button type="button" class="puce-n${n >= 7 ? ' fort' : n >= 4 ? ' moyen' : ''}" data-douleur="${n}" aria-pressed="${etat.douleur === n}">${n}</button>`).join('')}</div>
            <p class="champ-titre" id="l-duree">Temps disponible</p>
            <div class="puces" role="group" aria-labelledby="l-duree">${[30, 45].map(d => `<button type="button" class="puce" data-duree="${d}" aria-pressed="${Number(etat.duree) === d}">${d} min</button>`).join('')}</div>
            <label class="choix"><input type="checkbox" id="alerte"${etat.alerte ? ' checked' : ''}>
              <span class="ligne-texte">Signe inquiétant<small>Douleur au repos ou la nuit, sur un point précis de l’os, gonflement, ou qui s’aggrave de jour en jour.</small></span></label>
          </section>
          ${alertesHtml(A, seance)}
          <div class="progression" aria-live="polite">
            <div class="total"><strong>${nbFaits} / ${ids.length} exercices faits</strong><span>${pct} %</span></div>
            <div class="jauge${pct === 100 ? ' pleine' : ''}"><span></span></div>
            ${pct === 100 ? '<p class="bravo">Séance terminée, bravo 💪</p>' : ''}
          </div>
          ${blocsHtml(A, seance, faits, true)}
          <p class="doux">Touche le nom d’un exercice pour voir comment le faire. Si un exercice déclenche une douleur au tibia, arrête-le.</p>`;

        // La barre de progression a une largeur calculée : appliquée en JS (CSP sans style en ligne)
        racine.querySelector('.jauge span').style.width = pct + '%';

        racine.querySelectorAll('[data-douleur]').forEach(b => b.onclick = async () => { etat.douleur = Number(b.dataset.douleur); await maj(); });
        racine.querySelectorAll('[data-duree]').forEach(b => b.onclick = async () => { etat.duree = Number(b.dataset.duree); await A.db.regler('duree', etat.duree); await maj(); });
        racine.querySelector('#alerte').onchange = async e => { etat.alerte = e.target.checked; await maj(); };
        racine.querySelectorAll('.case-a-cocher').forEach(b => b.onclick = async () => {
          const id = b.dataset.id;
          if (faits.has(id)) faits.delete(id); else faits.add(id);
          await maj(id);
        });
        sauver(seance).catch(e => A.toast(e.message));
      }

      async function maj(focusId) {
        const y = window.scrollY;
        try { await sauver(A.seanceDuJour(aujourdhui, etat, profil)); } catch (e) { A.toast(e.message); }
        afficher();
        window.scrollTo(0, y);
        const cible = focusId ? racine.querySelector(`.case-a-cocher[data-id="${CSS.escape(focusId)}"]`) : null;
        if (cible) cible.focus({ preventScroll: true });
      }
      afficher();
    }
  };

  E.apercu = {
    titre: 'Séance type', parent: 'semaine',
    async rendre(racine, [n]) {
      const A = window.appli;
      const jour = Number(n) >= 0 && Number(n) <= 6 ? Number(n) : 1;
      const profil = await A.db.reglage('profil', 'renfo');
      const d = new Date(); d.setDate(d.getDate() + ((jour - d.getDay() + 7) % 7));
      const s = A.seanceDuJour(d, { douleur: 0, duree: 45, alerte: false }, profil);
      racine.innerHTML = `<h1 class="titre">${A.esc(A.NOMS_JOURS[jour])} · ${A.esc(s.jour.titre)}</h1>
        <p class="doux">Version 45 min, sans douleur. Le jour J, ton bilan adapte la liste (30 min, douleur, sauts).</p>
        ${alertesHtml(A, s)}${blocsHtml(A, s, new Set(), false)}`;
    }
  };
})();
