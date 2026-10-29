/* ecran-reglages.js — Notix : écran Réglages (onglet). Langue, ponctuation à la voix, où part l'audio, sauvegarde, tout effacer. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const LANGUES = [['fr-FR', 'Français (France)'], ['fr-BE', 'Français (Belgique)'], ['fr-CA', 'Français (Canada)'], ['fr-CH', 'Français (Suisse)'],
    ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Español'], ['de-DE', 'Deutsch'], ['it-IT', 'Italiano']];

  E.reglages = {
    titre: 'Réglages', onglet: 'Réglages', icone: 'reglages',
    rendre(racine) {
      const A = window.appli, B = window.notixBase, T = window.notixTexte, V = window.notixVue, D = window.notixDictee;
      racine.innerHTML = `<h1 class="sr">Réglages</h1>
        <section class="carte"><h2 class="sous-titre">Dictée</h2>
          <label class="champ"><span>Langue de la dictée</span><select id="langue">${LANGUES.map(([c, n]) => `<option value="${c}">${A.esc(n)}</option>`).join('')}</select></label>
          <label class="case"><input type="checkbox" id="ponctuation"><span>Ponctuation à la voix (« virgule », « point »…)</span></label>
        </section>
        <section class="carte"><h2 class="sous-titre">Où part l’audio ?</h2>
          <p id="origine">…</p>
          <div id="local"></div>
        </section>
        <section class="carte"><h2 class="sous-titre">Mots de ponctuation</h2>
          <dl class="mots">${T.MOTS_PONCTUATION.map(([mot, signe]) => `<div><dt>« ${A.esc(mot)} »</dt><dd>${A.esc(signe)}</dd></div>`).join('')}</dl>
        </section>
        <section class="carte"><h2 class="sous-titre">Sauvegarde</h2>
          <p id="stats" class="doux"></p>
          <p>Vos notes restent sur cet appareil. Changer de téléphone ou effacer les données du navigateur les supprime : exportez-les de temps en temps.</p>
          <div class="actions"><button class="btn" id="exporter" type="button">Exporter mes notes</button>
            <label class="btn btn-secondaire fichier">Importer une sauvegarde<input type="file" id="importer" accept="application/json,.json"></label></div>
        </section>
        <section class="carte"><h2 class="sous-titre">Effacer</h2>
          <p class="doux">Efface toutes les notes de cet appareil et remet les dossiers de départ.</p>
          <button class="btn btn-danger" id="effacer" type="button">Tout effacer</button>
        </section>
        <p class="erreur" id="err" role="alert"></p>
        <p class="doux pied">Notix ${A.esc(V.VERSION)} · Simple, rapide, toujours avec vous</p>`;
      const $ = s => racine.querySelector(s);
      const err = $('#err');
      let fini = false;

      async function majOrigine(langue) {
        const o = await D.origineAudio(langue);
        if (fini) return;
        $('#origine').textContent = o.texte;
        const etat = D.mode() === 'web' ? await D.etatLocal(langue) : 'inconnu';
        const zone = $('#local');
        if (etat === 'downloadable') {
          zone.innerHTML = '<p class="doux">Ce navigateur peut faire la dictée sur l’appareil, sans envoyer l’audio, après un téléchargement.</p><button class="btn btn-secondaire" id="installer" type="button">Télécharger la dictée hors ligne</button>';
          zone.querySelector('#installer').onclick = async e => {
            e.target.disabled = true; e.target.textContent = 'Téléchargement…';
            try { await D.installerLocal(langue); A.toast('Dictée sur l’appareil prête'); } catch (er) { err.textContent = 'Le téléchargement n’a pas abouti.'; }
            majOrigine(langue);
          };
        } else zone.innerHTML = etat === 'downloading' ? '<p class="doux">Téléchargement de la dictée hors ligne en cours…</p>' : '';
      }

      async function majStats() {
        const [n, d] = await Promise.all([B.notes.toutes(), B.dossiers.tous()]);
        if (!fini) $('#stats').textContent = `${n.length} note${n.length > 1 ? 's' : ''}, ${d.length} dossier${d.length > 1 ? 's' : ''} sur cet appareil.`;
      }

      (async () => {
        try {
          const p = await B.reglages.prefs();
          if (fini) return;
          $('#langue').value = p.langue;
          $('#ponctuation').checked = !!p.ponctuation;
          await Promise.all([majOrigine(p.langue), majStats()]);
        } catch (e) { err.textContent = e.message; }
      })();

      $('#langue').onchange = async e => {
        try { await B.reglages.changerPrefs({ langue: e.target.value }); A.toast('Langue enregistrée'); majOrigine(e.target.value); } catch (er) { err.textContent = er.message; }
      };
      $('#ponctuation').onchange = async e => {
        try { await B.reglages.changerPrefs({ ponctuation: e.target.checked }); A.toast(e.target.checked ? 'Ponctuation à la voix activée' : 'Ponctuation à la voix désactivée'); } catch (er) { err.textContent = er.message; }
      };

      $('#exporter').onclick = async () => {
        try {
          const donnees = await B.exporter();
          const url = URL.createObjectURL(new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' }));
          const a = document.createElement('a');
          a.href = url; a.download = `notix-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          A.toast(`${donnees.notes.length} note${donnees.notes.length > 1 ? 's' : ''} exportée${donnees.notes.length > 1 ? 's' : ''}`);
        } catch (e) { err.textContent = e.message; }
      };
      $('#importer').onchange = async e => {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        err.textContent = '';
        try {
          if (f.size > 20 * 1024 * 1024) throw new Error('Fichier trop gros pour une sauvegarde Notix.');
          let donnees;
          try { donnees = JSON.parse(await f.text()); } catch (er) { throw new Error('Ce fichier n’est pas une sauvegarde Notix.'); }
          const r = await B.importer(donnees);
          A.toast(`${r.notes} note${r.notes > 1 ? 's' : ''} importée${r.notes > 1 ? 's' : ''}`);
          majStats();
        } catch (er) { err.textContent = er.message; }
      };
      $('#effacer').onclick = async () => {
        const ok = await V.dialogue({ titre: 'Tout effacer ?', texte: 'Toutes les notes de cet appareil seront supprimées. Exportez-les d’abord si vous voulez les garder. Cette action est définitive.', ok: 'Tout effacer', danger: true });
        if (!ok) return;
        try { await B.toutEffacer(); A.toast('Toutes les notes ont été effacées'); majStats(); } catch (er) { err.textContent = er.message; }
      };
      return () => { fini = true; };
    }
  };
})();
