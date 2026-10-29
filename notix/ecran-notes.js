/* ecran-notes.js — Notix : écran Notes (onglet). Recherche plein texte, épinglées en tête, filtre Archivées. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  // Recherche et filtre gardés pendant la session (retour depuis une note)
  const memoire = { q: '', archivees: false };

  E.notes = {
    titre: 'Notes', onglet: 'Notes', icone: 'notes',
    rendre(racine) {
      const B = window.notixBase, T = window.notixTexte, V = window.notixVue;
      racine.innerHTML = `<h1 class="sr">Notes</h1>
        <label class="champ"><span>Rechercher dans les notes</span>
          <input type="search" id="q" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Un mot, une phrase…"></label>
        <div class="filtres" role="group" aria-label="Notes affichées">
          <button class="puce" type="button" data-archivees="0">Notes</button>
          <button class="puce" type="button" data-archivees="1">Archivées</button></div>
        <p class="doux" id="compte" aria-live="polite"></p>
        <ul class="liste carte notes" id="liste" hidden></ul>
        <div class="carte vide" id="vide" hidden></div>
        <p class="erreur" id="err" role="alert"></p>`;
      const $ = s => racine.querySelector(s);
      const q = $('#q');
      q.value = memoire.q;
      let notes = [], nomDossier = () => 'Sans dossier', minuteur = null;

      function afficher() {
        racine.querySelectorAll('.puce').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.archivees === '1') === memoire.archivees)));
        const base = notes.filter(n => !!n.archivee === memoire.archivees);
        const trouvees = T.trier(T.rechercher(base, memoire.q, nomDossier));
        $('#liste').innerHTML = trouvees.map(n => V.ligneNote(n, nomDossier)).join('');
        $('#liste').hidden = !trouvees.length;
        const vide = $('#vide');
        vide.hidden = !!trouvees.length;
        vide.innerHTML = memoire.q.trim() ? '<p>Aucune note ne contient ces mots.</p>'
          : memoire.archivees ? '<p>Aucune note archivée.</p>'
          : '<p>Aucune note pour l’instant.</p><a class="btn" href="#/enregistrer">Dicter ma première note</a>';
        $('#compte').textContent = trouvees.length ? `${trouvees.length} note${trouvees.length > 1 ? 's' : ''}${memoire.q.trim() ? ' trouvée' + (trouvees.length > 1 ? 's' : '') : ''}` : '';
      }

      (async () => {
        try {
          const [n, d] = await Promise.all([B.notes.toutes(), B.dossiers.tous()]);
          notes = n; nomDossier = V.nomsDossiers(d);
          afficher();
        } catch (e) { $('#err').textContent = e.message; }
      })();

      q.oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(() => { memoire.q = q.value; afficher(); }, 120); };
      racine.querySelectorAll('.puce').forEach(b => { b.onclick = () => { memoire.archivees = b.dataset.archivees === '1'; afficher(); }; });
      return () => clearTimeout(minuteur);
    }
  };
})();
