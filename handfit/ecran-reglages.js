/* ecran-reglages.js — HandFit : « Réglages » (#/reglages) : profil tibias, sauvegarde des données. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const VERSION_APP = '1.0.0';

  E.reglages = {
    titre: 'Réglages', parent: 'jour',
    async rendre(racine) {
      const A = window.appli;
      const profil = await A.db.reglage('profil', 'renfo');
      racine.innerHTML = `<h1 class="titre">Réglages</h1>
        <section class="carte" aria-labelledby="t-profil">
          <h2 class="sous-titre sans-marge" id="t-profil">Profil tibias</h2>
          <fieldset class="choix-zone"><legend class="visuellement-cache">Profil tibias</legend>
            ${Object.entries(A.PROFILS).map(([c, p]) => `<label class="choix"><input type="radio" name="profil" value="${c}"${profil === c ? ' checked' : ''}>
              <span class="ligne-texte">${A.esc(p.nom)}<small>${A.esc(p.aide)}</small></span></label>`).join('')}
          </fieldset>
          <p class="doux">La douleur notée chaque jour passe avant le profil : à 4/10 ou plus, la séance devient douce quel que soit le profil.</p>
        </section>
        <section class="carte" aria-labelledby="t-donnees">
          <h2 class="sous-titre sans-marge" id="t-donnees">Mes données</h2>
          <p class="doux">Tout reste sur ce téléphone, sans compte. Fais une sauvegarde avant de changer de téléphone.</p>
          <div class="actions">
            <button type="button" class="btn btn-secondaire" id="exporter">Sauvegarder (fichier)</button>
            <label class="btn btn-secondaire" for="fichier">Restaurer</label>
            <input type="file" id="fichier" accept="application/json,.json" class="visuellement-cache">
          </div>
          <p class="erreur" id="err" role="alert"></p>
          <div class="actions"><button type="button" class="btn btn-danger" id="effacer">Tout effacer</button></div>
        </section>
        <div class="info"><strong>Sécurité</strong> Cette app ne remplace pas un médecin ou un kiné. Arrête un exercice si la douleur augmente pendant ou après.
          Consulte si la douleur est présente au repos ou la nuit, très localisée sur l’os, ou s’aggrave : une fracture de fatigue peut ressembler à une périostite.</div>
        <p class="doux">HandFit ${VERSION_APP} · Muscu à la maison, explosivité pour le hand et routine tibias.</p>`;

      racine.querySelectorAll('input[name="profil"]').forEach(r => r.onchange = async () => { await A.db.regler('profil', r.value); A.toast('Profil enregistré'); });
      const err = racine.querySelector('#err');
      racine.querySelector('#exporter').onclick = async () => {
        try {
          const d = await A.db.exporter();
          const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }));
          const a = document.createElement('a'); a.href = url; a.download = `handfit-${A.cleDate()}.json`; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) { err.textContent = e.message; }
      };
      racine.querySelector('#fichier').onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const d = JSON.parse(await f.text());
          if (!confirm('Remplacer toutes les données par cette sauvegarde ?')) return;
          await A.db.importer(d); A.toast('Sauvegarde restaurée');
        } catch (x) { err.textContent = x instanceof SyntaxError ? 'Fichier illisible.' : x.message; }
        e.target.value = '';
      };
      racine.querySelector('#effacer').onclick = async () => {
        if (!confirm('Effacer tout l’historique et les réglages ?')) return;
        try { await A.db.toutEffacer(); A.toast('Données effacées'); location.hash = '#/jour'; } catch (e) { err.textContent = e.message; }
      };
    }
  };
})();
