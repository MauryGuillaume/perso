/* commun.js — Notix : éléments partagés par les écrans (icônes, ligne de note, fenêtre de confirmation, bouton de dictée). */
(function () {
  'use strict';
  const VERSION = '1.0.0';
  const svg = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  const ICONES = {
    micro: svg('<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"/>'),
    notes: svg('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
    dossiers: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    reglages: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    epingle: svg('<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>')
  };

  const esc = v => window.appli.esc(v);
  const T = () => window.notixTexte;

  /** Nom affiché d'un dossier à partir de son id. */
  function nomsDossiers(dossiers) {
    const m = new Map(dossiers.map(d => [d.id, d.nom]));
    return id => (id && m.get(id)) || 'Sans dossier';
  }

  function ligneNote(n, nomDossier) {
    return `<li><a class="note-ligne" href="#/note/${esc(encodeURIComponent(n.id))}">
      <span class="note-extrait">${n.epinglee ? `<span class="epingle">${ICONES.epingle}<span class="sr">Épinglée : </span></span>` : ''}${esc(T().extrait(n.texte) || '(note vide)')}</span>
      <span class="note-meta">${esc(nomDossier(n.dossierId))} · ${esc(T().dateCourte(n.modifieeLe))}${n.archivee ? ' · Archivée' : ''}</span></a></li>`;
  }

  /** Options d'un <select> de dossier. avecAuto : ajoute « Automatique (mots-clés) ». */
  function optionsDossiers(dossiers, choisi, avecAuto) {
    return (avecAuto ? `<option value="auto"${choisi === 'auto' ? ' selected' : ''}>Automatique (mots-clés)</option>` : '') +
      dossiers.map(d => `<option value="${esc(d.id)}"${d.id === choisi ? ' selected' : ''}>${esc(d.nom)}</option>`).join('') +
      `<option value=""${choisi === '' ? ' selected' : ''}>Sans dossier</option>`;
  }

  /** Fenêtre de confirmation accessible (dialog). Résout true si l'utilisateur confirme. */
  function dialogue({ titre, texte, ok = 'OK', annuler = 'Annuler', danger = false }) {
    if (typeof HTMLDialogElement === 'undefined') return Promise.resolve(window.confirm(titre + '\n\n' + texte));
    return new Promise(resoudre => {
      const d = document.createElement('dialog');
      d.className = 'dialogue';
      d.setAttribute('aria-labelledby', 'dialogue-titre');
      d.innerHTML = `<h2 id="dialogue-titre">${esc(titre)}</h2><p>${esc(texte)}</p>
        <div class="actions">${annuler ? `<button class="btn btn-secondaire" value="non" type="button">${esc(annuler)}</button>` : ''}
        <button class="btn${danger ? ' btn-danger' : ''}" value="oui" type="button">${esc(ok)}</button></div>`;
      let reponse = false;
      d.querySelectorAll('button').forEach(b => { b.onclick = () => { reponse = b.value === 'oui'; d.close(); }; });
      d.onclose = () => { d.remove(); resoudre(reponse); };
      document.body.appendChild(d);
      d.showModal();
      d.querySelector('button[value="oui"]').focus();
    });
  }

  /** Branche un bouton micro sur une zone de texte. ctx = { prefs, origine } chargés par l'écran.
      Renvoie { arreter() → Promise (attend les derniers mots), enCours() }. */
  function brancherDictee({ bouton, zone, partiel, etat, erreur, ctx, surChangement, texteRepos = 'Touchez le micro pour dicter', texteEcoute = 'Je vous écoute… Touchez pour arrêter' }) {
    const D = window.notixDictee, B = window.notixBase;
    let session = null, attente = [];
    const libelle = bouton.getAttribute('aria-label') || 'Dicter';
    const span = bouton.querySelector('span'), texteSpan = span ? span.textContent : '';
    function repos() {
      session = null;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.classList.remove('actif');
      bouton.setAttribute('aria-label', libelle);
      if (span) span.textContent = texteSpan;
      if (etat) etat.textContent = texteRepos;
      partiel.textContent = '';
      attente.splice(0).forEach(f => f());
    }
    function lancer() {
      erreur.textContent = '';
      bouton.setAttribute('aria-pressed', 'true');
      bouton.classList.add('actif');
      bouton.setAttribute('aria-label', 'Arrêter la dictée');
      if (span) span.textContent = 'Arrêter';
      if (etat) etat.textContent = texteEcoute;
      try {
        session = D.demarrer({
          langue: ctx.prefs.langue, local: ctx.origine.local,
          surPartiel: p => { partiel.textContent = p; },
          surFinal: seg => {
            const t = ctx.prefs.ponctuation ? T().ponctuer(seg) : String(seg).trim();
            zone.value = T().joindre(zone.value, t).slice(0, 20000);
            zone.scrollTop = zone.scrollHeight;
            if (surChangement) surChangement();
          },
          surEtat: e => { if (e === 'arret') repos(); },
          surErreur: m => { erreur.textContent = m; repos(); }
        });
      } catch (e) { erreur.textContent = e.message; repos(); }
    }
    if (!D.mode()) {
      bouton.disabled = true;
      if (etat) etat.textContent = 'La dictée n’est pas disponible dans ce navigateur : écrivez au clavier, ou ouvrez Notix dans Chrome ou Safari.';
    }
    bouton.onclick = async () => {
      if (session) { session.arreter(); return; }
      if (!ctx.prefs.avertissementVu) {
        const ok = await dialogue({ titre: 'Avant votre première dictée', texte: ctx.origine.texte + ' Le bruit autour de vous peut gêner la transcription : vous pourrez corriger le texte avant d’enregistrer.', ok: 'Compris, dicter', annuler: 'Plus tard' });
        if (!ok) return;
        ctx.prefs.avertissementVu = true;
        B.reglages.changerPrefs({ avertissementVu: true }).catch(() => {});
      }
      lancer();
    };
    return {
      enCours: () => !!session,
      arreter() {
        if (!session) return Promise.resolve();
        return new Promise(ok => { attente.push(ok); setTimeout(ok, 1500); session.arreter(); });
      }
    };
  }

  /** Charge ce dont la dictée a besoin : réglages et phrase « où part l'audio ». */
  async function contexteDictee() {
    const prefs = await window.notixBase.reglages.prefs();
    const origine = await window.notixDictee.origineAudio(prefs.langue);
    return { prefs, origine };
  }

  window.notixVue = { VERSION, ICONES, nomsDossiers, ligneNote, optionsDossiers, dialogue, brancherDictee, contexteDictee };
})();
