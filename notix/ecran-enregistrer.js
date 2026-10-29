/* ecran-enregistrer.js — Notix : écran Enregistrer (onglet, écran d'ouverture). Gros micro, dictée en direct, dossier détecté. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const V = () => window.notixVue;

  E.enregistrer = {
    titre: 'Enregistrer', onglet: 'Enregistrer', icone: 'micro',
    rendre(racine) {
      const A = window.appli, B = window.notixBase, T = window.notixTexte;
      racine.innerHTML = `<section class="enreg">
        <h1 class="sr">Nouvelle note</h1>
        <button class="micro" id="micro" type="button" aria-pressed="false" aria-label="Démarrer la dictée">${V().ICONES.micro}</button>
        <p class="etat" id="etat" aria-live="polite">Touchez le micro pour dicter</p>
        <p class="doux conseil">Commencez par « courses » ou « idée » pour classer la note. Dites « virgule », « point », « à la ligne ».</p>
        <div class="carte">
          <label class="champ"><span>Texte de la note</span><textarea id="texte" rows="6" maxlength="20000" placeholder="Votre texte apparaît ici. Vous pouvez aussi l’écrire."></textarea></label>
          <p class="partiel" id="partiel" aria-hidden="true"></p>
          <label class="champ"><span>Dossier</span><select id="dossier"></select></label>
          <p class="doux" id="detecte"></p>
          <div class="actions"><button class="btn" id="enregistrer" type="button">Enregistrer la note</button>
            <button class="btn btn-secondaire" id="effacer" type="button">Effacer</button></div>
          <p class="erreur" id="err" role="alert"></p>
        </div></section>`;
      const $ = s => racine.querySelector(s);
      const zone = $('#texte'), choix = $('#dossier'), err = $('#err');
      let dossiers = [], dictee = null, minuteur = null, fini = false;

      function detecter() {
        if (choix.value !== 'auto') { $('#detecte').textContent = ''; return; }
        const c = T.classer(zone.value, dossiers);
        $('#detecte').textContent = !zone.value.trim() ? '' : c ? `Classement : « ${c.dossier.nom} » (mot-clé « ${c.motCle} »).` : 'Aucun mot-clé reconnu : la note ira dans « Sans dossier ».';
      }
      function changement() {
        detecter();
        clearTimeout(minuteur);
        minuteur = setTimeout(() => B.reglages.ecrireBrouillon(zone.value).catch(() => {}), 400);
      }

      (async () => {
        try {
          const [ctx, liste, brouillon] = await Promise.all([V().contexteDictee(), B.dossiers.tous(), B.reglages.brouillon()]);
          if (fini) return;
          dossiers = liste;
          choix.innerHTML = V().optionsDossiers(dossiers, 'auto', true);
          if (brouillon && !zone.value) zone.value = brouillon;
          detecter();
          dictee = V().brancherDictee({ bouton: $('#micro'), zone, partiel: $('#partiel'), etat: $('#etat'), erreur: err, ctx, surChangement: changement });
        } catch (e) { err.textContent = e.message; }
      })();

      zone.oninput = changement;
      choix.onchange = detecter;

      $('#effacer').onclick = async () => {
        if (zone.value.trim() && !(await V().dialogue({ titre: 'Effacer le texte ?', texte: 'Le texte en cours sera perdu.', ok: 'Effacer', danger: true }))) return;
        if (dictee) await dictee.arreter();
        zone.value = ''; err.textContent = '';
        changement();
        zone.focus();
      };

      $('#enregistrer').onclick = async () => {
        const bouton = $('#enregistrer');
        bouton.disabled = true;
        try {
          if (dictee) await dictee.arreter();
          let texte = zone.value.trim(), dossierId = choix.value;
          if (!texte) { err.textContent = 'La note est vide : dictez ou écrivez quelque chose.'; return; }
          if (dossierId === 'auto') {
            const c = T.classer(texte, dossiers);
            dossierId = c ? c.dossier.id : '';
            if (c && c.texte.trim()) texte = c.texte.trim();
          }
          await B.notes.enregistrer({ texte, dossierId });
          clearTimeout(minuteur);
          await B.reglages.ecrireBrouillon('');
          zone.value = ''; err.textContent = '';
          choix.value = 'auto'; detecter();
          A.toast(`Note enregistrée dans « ${V().nomsDossiers(dossiers)(dossierId)} »`);
        } catch (e) { err.textContent = e.message; } finally { bouton.disabled = false; }
      };

      return () => {
        fini = true;
        clearTimeout(minuteur);
        // Les derniers mots dictés arrivent après l'arrêt : le brouillon est gardé ensuite
        (dictee ? dictee.arreter() : Promise.resolve()).then(() => { clearTimeout(minuteur); return B.reglages.ecrireBrouillon(zone.value); }).catch(() => {});
      };
    }
  };
})();
