/* ecran-note.js — Notix : écran Note (#/note/<id>, pas d'onglet). Modifier, dicter la suite, dossier, épingler, archiver, partager, supprimer. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};

  E.note = {
    titre: 'Note', parent: 'notes',
    rendre(racine, params) {
      const A = window.appli, B = window.notixBase, T = window.notixTexte, V = window.notixVue;
      const id = params[0] || '';
      racine.innerHTML = '<p class="doux">Chargement…</p>';
      let note = null, dictee = null, fini = false, modifiee = false;

      (async () => {
        let ctx, dossiers;
        try {
          [note, dossiers, ctx] = await Promise.all([B.notes.lire(id), B.dossiers.tous(), V.contexteDictee()]);
        } catch (e) { racine.innerHTML = `<p class="erreur" role="alert">${A.esc(e.message)}</p>`; return; }
        if (fini) return;
        if (!note) { racine.innerHTML = '<div class="carte"><p>Cette note n’existe plus.</p><a class="btn" href="#/notes">Revenir aux notes</a></div>'; return; }

        const partage = typeof navigator.share === 'function';
        racine.innerHTML = `<a class="retour" href="#/notes">‹ Notes</a>
          <h1 class="sr">Note</h1>
          <div class="carte">
            <label class="champ"><span>Texte</span><textarea id="texte" rows="10" maxlength="20000"></textarea></label>
            <p class="partiel" id="partiel" aria-hidden="true"></p>
            <div class="actions">
              <button class="btn" id="enregistrer" type="button" disabled>Enregistrer</button>
              <button class="btn btn-secondaire avec-icone" id="dicter" type="button" aria-pressed="false" aria-label="Dicter la suite">${V.ICONES.micro}<span>Dicter la suite</span></button>
            </div>
            <p class="doux" id="etat" aria-live="polite"></p>
            <label class="champ"><span>Dossier</span><select id="dossier">${V.optionsDossiers(dossiers, note.dossierId || '', false)}</select></label>
            <p class="doux" id="dates"></p>
            <p class="erreur" id="err" role="alert"></p>
          </div>
          <div class="carte actions">
            <button class="btn btn-secondaire" id="epingler" type="button"></button>
            <button class="btn btn-secondaire" id="archiver" type="button"></button>
          </div>
          <div class="carte">
            <h2 class="sous-titre">Partager</h2>
            <div class="actions">
              ${partage ? '<button class="btn" id="partager" type="button">Partager…</button>' : ''}
              <a class="btn btn-secondaire" id="sms" href="sms:">Message</a>
              <a class="btn btn-secondaire" id="mail" href="mailto:">E-mail</a>
              <button class="btn btn-secondaire" id="copier" type="button">Copier</button>
            </div>
          </div>
          <button class="btn btn-danger large" id="supprimer" type="button">Supprimer la note</button>`;
        const $ = s => racine.querySelector(s);
        const zone = $('#texte'), err = $('#err');
        zone.value = note.texte;

        function majVue() {
          $('#epingler').textContent = note.epinglee ? 'Désépingler' : 'Épingler';
          $('#epingler').setAttribute('aria-pressed', String(!!note.epinglee));
          $('#archiver').textContent = note.archivee ? 'Désarchiver' : 'Archiver';
          $('#dates').textContent = `Créée le ${T.dateLongue(note.creeeLe)}` + (note.modifieeLe !== note.creeeLe ? ` · modifiée le ${T.dateLongue(note.modifieeLe)}` : '');
          const texte = zone.value;
          $('#sms').href = 'sms:?&body=' + encodeURIComponent(texte);
          $('#mail').href = 'mailto:?subject=' + encodeURIComponent('Note : ' + T.extrait(texte, 50)) + '&body=' + encodeURIComponent(texte);
          $('#enregistrer').disabled = !modifiee;
        }
        async function sauver(changes, message) {
          err.textContent = '';
          try {
            note = await B.notes.enregistrer(Object.assign({}, note, changes));
            if ('texte' in changes) modifiee = false;
            majVue();
            if (message) A.toast(message);
          } catch (e) { err.textContent = e.message; }
        }
        function changement() { modifiee = zone.value !== note.texte; majVue(); }

        zone.oninput = changement;
        dictee = V.brancherDictee({ bouton: $('#dicter'), zone, partiel: $('#partiel'), etat: $('#etat'), erreur: err, ctx, surChangement: changement, texteRepos: '', texteEcoute: 'Je vous écoute… Touchez « Arrêter » pour finir.' });
        $('#enregistrer').onclick = async () => {
          await dictee.arreter();
          if (!zone.value.trim()) { err.textContent = 'La note est vide. Pour l’effacer, utilisez « Supprimer la note ».'; return; }
          $('#enregistrer').disabled = true;
          await sauver({ texte: zone.value.trim() }, 'Note enregistrée');
          zone.value = note.texte;
        };
        $('#dossier').onchange = () => sauver({ dossierId: $('#dossier').value }, `Déplacée dans « ${V.nomsDossiers(dossiers)($('#dossier').value)} »`);
        $('#epingler').onclick = () => sauver({ epinglee: !note.epinglee }, note.epinglee ? 'Note désépinglée' : 'Note épinglée en tête');
        $('#archiver').onclick = () => sauver({ archivee: !note.archivee }, note.archivee ? 'Note désarchivée' : 'Note archivée');
        if (partage) $('#partager').onclick = () => navigator.share({ text: zone.value }).catch(e => { if (e.name !== 'AbortError') err.textContent = 'Le partage n’a pas abouti.'; });
        $('#copier').onclick = async () => {
          try { await navigator.clipboard.writeText(zone.value); A.toast('Texte copié'); }
          catch (e) { zone.select(); err.textContent = 'Copie impossible ici : le texte est sélectionné, copiez-le avec le menu du téléphone.'; }
        };
        $('#supprimer').onclick = async () => {
          if (!(await V.dialogue({ titre: 'Supprimer cette note ?', texte: 'Elle sera effacée de cet appareil. Cette action est définitive.', ok: 'Supprimer', danger: true }))) return;
          try {
            await dictee.arreter();
            await B.notes.supprimer(note.id);
            modifiee = false; note = null;
            location.hash = '#/notes';
            A.toast('Note supprimée');
          } catch (e) { err.textContent = e.message; }
        };
        majVue();
      })();

      return () => {
        fini = true;
        // En quittant l'écran, une modification non enregistrée est gardée
        const zone = racine.querySelector('#texte');
        const sauverSiModifiee = () => {
          if (note && zone && zone.value.trim() && zone.value.trim() !== note.texte) {
            return B.notes.enregistrer(Object.assign({}, note, { texte: zone.value.trim() })).then(() => A.toast('Modifications enregistrées'));
          }
        };
        // Sans dictée en cours, l'écriture part tout de suite : l'écran suivant la lit déjà
        if (dictee && dictee.enCours()) dictee.arreter().then(sauverSiModifiee).catch(() => {});
        else Promise.resolve(sauverSiModifiee()).catch(() => {});
      };
    }
  };
})();
