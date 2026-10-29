/* ecran-dossiers.js — Notix : écran Dossiers (onglet). #/dossiers : liste et création ; #/dossiers/<id> : notes du dossier, mots-clés, renommer, supprimer. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const SANS = 'sans-dossier';

  E.dossiers = {
    titre: 'Dossiers', onglet: 'Dossiers', icone: 'dossiers',
    rendre(racine, params) {
      const A = window.appli, B = window.notixBase, T = window.notixTexte, V = window.notixVue;
      const id = params[0] || '';
      racine.innerHTML = '<p class="doux">Chargement…</p>';
      let fini = false;

      /** Vérifie nom et mots-clés ; renvoie un message d'erreur ou ''. */
      function verifier(nom, mots, dossiers, idCourant) {
        if (!nom) return 'Le nom du dossier est obligatoire.';
        if (dossiers.some(d => d.id !== idCourant && T.normaliser(d.nom) === T.normaliser(nom))) return `Un dossier « ${nom} » existe déjà.`;
        for (const k of mots) {
          const autre = dossiers.find(d => d.id !== idCourant && (d.motsCles || []).some(x => T.normaliser(x) === T.normaliser(k)));
          if (autre) return `Le mot-clé « ${k} » classe déjà les notes dans « ${autre.nom} ».`;
        }
        return '';
      }

      const formulaire = (d, bouton) => `
        <label class="champ"><span>Nom</span><input name="nom" maxlength="40" required autocomplete="off" value="${A.esc(d ? d.nom : '')}"></label>
        <label class="champ"><span>Mots-clés, séparés par des virgules</span><input name="mots" maxlength="400" autocomplete="off" autocapitalize="none" value="${A.esc(d ? (d.motsCles || []).join(', ') : '')}" aria-describedby="aide-mots"></label>
        <p class="doux" id="aide-mots">Une note dictée qui commence par l’un de ces mots est rangée ici, et le mot est retiré.</p>
        <button class="btn">${bouton}</button><p class="erreur" id="err" role="alert"></p>`;

      async function liste() {
        const [dossiers, notes] = await Promise.all([B.dossiers.tous(), B.notes.toutes()]);
        if (fini) return;
        const compte = did => notes.filter(n => (n.dossierId || '') === did && !n.archivee).length;
        const connus = new Set(dossiers.map(d => d.id));
        const sans = notes.filter(n => !n.archivee && (!n.dossierId || !connus.has(n.dossierId))).length;
        const ligne = (href, nom, n, mots) => `<li><a class="note-ligne" href="${href}">
          <span class="note-extrait">${A.esc(nom)} <span class="compte">${n}</span></span>
          <span class="note-meta">${mots ? 'Mots-clés : ' + A.esc(mots) : 'Aucun mot-clé'}</span></a></li>`;
        racine.innerHTML = `<h1 class="titre">Dossiers</h1>
          <ul class="liste carte notes">${dossiers.map(d => ligne('#/dossiers/' + A.esc(encodeURIComponent(d.id)), d.nom, compte(d.id), (d.motsCles || []).join(', '))).join('')}
          ${ligne('#/dossiers/' + SANS, 'Sans dossier', sans, '')}</ul>
          <form class="carte" id="form" novalidate><h2 class="sous-titre">Nouveau dossier</h2>${formulaire(null, 'Créer le dossier')}</form>`;
        const f = racine.querySelector('#form');
        f.onsubmit = async e => {
          e.preventDefault();
          const nom = f.nom.value.trim(), mots = T.lireMotsCles(f.mots.value);
          const msg = verifier(nom, mots, dossiers, null);
          f.querySelector('#err').textContent = msg;
          if (msg) return;
          const b = f.querySelector('button'); b.disabled = true;
          try { await B.dossiers.enregistrer({ nom, motsCles: mots }); A.toast(`Dossier « ${nom} » créé`); await liste(); }
          catch (er) { f.querySelector('#err').textContent = er.message; b.disabled = false; }
        };
      }

      async function detail() {
        const [dossiers, notes] = await Promise.all([B.dossiers.tous(), B.notes.toutes()]);
        if (fini) return;
        const connus = new Set(dossiers.map(d => d.id));
        const d = dossiers.find(x => x.id === id);
        if (!d && id !== SANS) { racine.innerHTML = '<div class="carte"><p>Ce dossier n’existe plus.</p><a class="btn" href="#/dossiers">Revenir aux dossiers</a></div>'; return; }
        const siennes = T.trier(notes.filter(n => d ? n.dossierId === d.id : (!n.dossierId || !connus.has(n.dossierId))));
        const nomDossier = V.nomsDossiers(dossiers);
        racine.innerHTML = `<a class="retour" href="#/dossiers">‹ Dossiers</a>
          <h1 class="titre">${A.esc(d ? d.nom : 'Sans dossier')}</h1>
          ${siennes.length ? `<ul class="liste carte notes">${siennes.map(n => V.ligneNote(n, nomDossier)).join('')}</ul>` : '<div class="carte"><p class="doux">Aucune note dans ce dossier.</p></div>'}
          ${d ? `<form class="carte" id="form" novalidate><h2 class="sous-titre">Modifier le dossier</h2>${formulaire(d, 'Enregistrer')}</form>
          <button class="btn btn-danger large" id="supprimer" type="button">Supprimer le dossier</button>` : ''}`;
        if (!d) return;
        const f = racine.querySelector('#form');
        f.onsubmit = async e => {
          e.preventDefault();
          const nom = f.nom.value.trim(), mots = T.lireMotsCles(f.mots.value);
          const msg = verifier(nom, mots, dossiers, d.id);
          f.querySelector('#err').textContent = msg;
          if (msg) return;
          const b = f.querySelector('button'); b.disabled = true;
          try { await B.dossiers.enregistrer(Object.assign({}, d, { nom, motsCles: mots })); A.toast('Dossier enregistré'); await detail(); }
          catch (er) { f.querySelector('#err').textContent = er.message; b.disabled = false; }
        };
        racine.querySelector('#supprimer').onclick = async () => {
          const n = siennes.length;
          const ok = await V.dialogue({ titre: `Supprimer « ${d.nom} » ?`, texte: n ? `Ses ${n} note${n > 1 ? 's' : ''} ne seront pas effacées : elles passeront dans « Sans dossier ».` : 'Le dossier est vide.', ok: 'Supprimer', danger: true });
          if (!ok) return;
          try { await B.dossiers.supprimer(d.id); location.hash = '#/dossiers'; A.toast('Dossier supprimé'); }
          catch (er) { f.querySelector('#err').textContent = er.message; }
        };
      }

      (id ? detail() : liste()).catch(e => { racine.innerHTML = `<p class="erreur" role="alert">${A.esc(e.message)}</p>`; });
      return () => { fini = true; };
    }
  };
})();
