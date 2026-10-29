/* ecran-potager.js — Legumly : « Mon potager » (#/potager), un bac (#/bac/<id>), formulaire de bac (#/bac-modifier/<id|nouveau>/<légume>)
   et formulaire de plantation (#/plantation/<id|nouvelle>/<légume|_>/<bac>). */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const EMPLACEMENTS = { balcon: 'Balcon ou terrasse', jardin: 'Jardin', partage: 'Jardin partagé', interieur: 'Intérieur' };

  /** Plan simple d'un bac : rectangle aux proportions du bac, une bande par plantation selon la place occupée. */
  function plan(A, bac, plantations, parId) {
    const surfaceBac = (bac.longueur * bac.largeur) / 10000;
    const parts = plantations.filter(p => parId[p.legumeId]).map(p => ({ p, l: parId[p.legumeId], s: A.surface(parId[p.legumeId], p.nbPlants) }));
    const total = parts.reduce((t, x) => t + x.s, 0);
    const taux = surfaceBac ? total / surfaceBac : 0;
    const echelle = Math.max(1, taux);
    const html = `<div class="plan" data-ratio="${Math.min(6, Math.max(0.8, bac.longueur / bac.largeur))}" role="img"
        aria-label="Plan du bac ${A.esc(bac.nom)} : ${parts.length ? parts.map(x => A.esc(x.l.nom)).join(', ') : 'vide'}, rempli à ${Math.round(taux * 100)} %">
      ${parts.map((x, i) => `<div class="plan-part p${i % 2 + 1}" data-part="${(x.s / surfaceBac / echelle * 100).toFixed(2)}"><span class="emoji" aria-hidden="true">${A.esc(x.l.emoji)}</span><span>${A.esc(x.l.nom)}${x.p.nbPlants > 1 ? ` ×${A.esc(x.p.nbPlants)}` : ''}</span></div>`).join('')}
      ${taux < 0.98 ? `<div class="plan-libre">${parts.length ? `libre ${Math.round((1 - taux) * 100)} %` : 'Bac vide'}</div>` : ''}
    </div>
    <div class="jauge${taux > 1 ? ' pleine' : ''}" aria-hidden="true"><span data-part="${Math.min(100, taux * 100).toFixed(1)}"></span></div>
    <p class="doux">${bac.longueur} × ${bac.largeur} cm · ${String(Math.round(surfaceBac * 100) / 100).replace('.', ',')} m² · ${taux > 1 ? `<strong class="erreur">trop serré (${Math.round(taux * 100)} %)</strong>` : `occupé à ${Math.round(taux * 100)} %`}</p>`;
    return html;
  }
  /** Applique les tailles calculées (style par JavaScript : compatible avec la CSP, pas d'attribut style). */
  function dimensionner(racine) {
    racine.querySelectorAll('.plan[data-ratio]').forEach(el => { el.style.aspectRatio = el.dataset.ratio; });
    racine.querySelectorAll('.plan-part[data-part]').forEach(el => { el.style.flex = `0 0 ${el.dataset.part}%`; });
    racine.querySelectorAll('.jauge span[data-part]').forEach(el => { el.style.width = el.dataset.part + '%'; });
  }
  function ligneConflits(A, conflits) {
    if (!conflits.length) return '';
    return `<div class="alerte" role="note"><strong>👎 Mauvais voisins dans ce bac</strong>${conflits.map(([a, b]) => `${A.esc(a.nom)} et ${A.esc(b.nom.toLowerCase())}`).join(' ; ')}. Séparez-les si possible.</div>`;
  }
  function textePlantation(A, p) {
    const morceaux = [];
    if (p.dateSemis) morceaux.push(`${p.mode === 'plant' ? 'planté' : 'semé'} le ${A.dateLisible(p.dateSemis)}`);
    if (p.statut === 'en-cours' && p.dateRecoltePrevue) morceaux.push(`récolte vers le ${A.dateLisible(p.dateRecoltePrevue)}`);
    if (p.statut === 'terminee') morceaux.push('terminée');
    return morceaux.join(' · ');
  }

  E.potager = {
    titre: 'Mon potager', onglet: 'Potager',
    async rendre(racine) {
      const A = window.appli;
      const [{ parId }, bacs, plantations] = await Promise.all([A.legumes(), A.db.tous('bacs'), A.db.tous('plantations')]);
      bacs.sort((a, b) => (a.cree || '').localeCompare(b.cree || ''));
      const enCours = plantations.filter(p => p.statut === 'en-cours');
      const sensibles = [...new Set(enCours.filter(p => parId[p.legumeId] && parId[p.legumeId].gel === 'sensible').map(p => parId[p.legumeId].nom.toLowerCase()))];
      racine.innerHTML = `<div id="gel"></div><h1 class="titre">Mon potager</h1>
        ${bacs.length ? bacs.map(b => {
          const ps = enCours.filter(p => p.bacId === b.id);
          return `<section class="carte"><h2 class="sous-titre">${A.esc(b.nom)} <span class="doux">${A.esc(EMPLACEMENTS[b.emplacement] || '')}</span></h2>
            ${plan(A, b, ps, parId)}
            ${ligneConflits(A, A.conflits(ps, parId))}
            <div class="actions"><a class="btn btn-secondaire" href="#/bac/${A.esc(b.id)}">Ouvrir le bac${ps.length ? ` (${ps.length})` : ''}</a>
            <a class="btn" href="#/plantation/nouvelle/_/${A.esc(b.id)}">Planter</a></div></section>`;
        }).join('') : `<div class="vide"><span class="emoji" aria-hidden="true">🪴</span>Décrivez vos bacs, jardinières ou carrés pour suivre vos plantations et recevoir des rappels.</div>`}
        <a class="btn btn-plein${bacs.length ? ' btn-secondaire' : ''}" href="#/bac-modifier/nouveau">+ Nouveau bac</a>`;
      dimensionner(racine);
      A.meteo.bandeau(sensibles).then(h => { if (racine.isConnected) racine.querySelector('#gel').innerHTML = h; });
    }
  };

  E.bac = {
    titre: 'Bac', parent: 'potager',
    async rendre(racine, params) {
      const A = window.appli;
      const [{ parId }, bac, plantations] = await Promise.all([A.legumes(), A.db.lire('bacs', params[0]), A.db.tous('plantations')]);
      if (!bac) { racine.innerHTML = `<div class="vide">Ce bac n’existe plus.<div class="actions"><a class="btn" href="#/potager">Mon potager</a></div></div>`; return; }
      document.getElementById('titre').textContent = bac.nom;
      const ps = plantations.filter(p => p.bacId === bac.id);
      const enCours = ps.filter(p => p.statut === 'en-cours').sort((a, b) => (a.dateSemis || '').localeCompare(b.dateSemis || ''));
      const finies = ps.filter(p => p.statut !== 'en-cours').sort((a, b) => (b.dateSemis || '').localeCompare(a.dateSemis || ''));
      const ligne = p => {
        const l = parId[p.legumeId] || { nom: 'Légume inconnu', emoji: '❓' };
        return `<li><a href="#/plantation/${A.esc(p.id)}"><span class="emoji" aria-hidden="true">${A.esc(l.emoji)}</span>
          <span class="ligne-texte">${A.esc(l.nom)}${p.nbPlants > 1 ? ` <span class="doux">×${A.esc(p.nbPlants)}</span>` : ''}<small>${A.esc(textePlantation(A, p))}</small></span><span class="chevron" aria-hidden="true">›</span></a></li>`;
      };
      racine.innerHTML = `<h1 class="titre">${A.esc(bac.nom)}</h1>
        <p class="doux">${A.esc(EMPLACEMENTS[bac.emplacement] || '')}${bac.note ? ' · ' + A.esc(bac.note) : ''}</p>
        ${plan(A, bac, enCours, parId)}
        ${ligneConflits(A, A.conflits(enCours, parId))}
        <h2 class="sous-titre">En cours <span class="doux">(${enCours.length})</span></h2>
        ${enCours.length ? `<ul class="liste-liens">${enCours.map(ligne).join('')}</ul>` : '<p class="doux">Rien en culture dans ce bac.</p>'}
        <a class="btn btn-plein" href="#/plantation/nouvelle/_/${A.esc(bac.id)}">+ Ajouter une plantation</a>
        ${finies.length ? `<details class="carte"><summary>Plantations terminées (${finies.length})</summary><ul class="liste-liens">${finies.map(ligne).join('')}</ul></details>` : ''}
        <div class="actions"><a class="btn btn-secondaire" href="#/bac-modifier/${A.esc(bac.id)}">Modifier le bac</a>
        <button type="button" class="btn btn-danger" id="supprimer">Supprimer le bac</button></div>`;
      dimensionner(racine);
      racine.querySelector('#supprimer').onclick = async e => {
        if (!confirm(`Supprimer « ${bac.nom} » et ses ${ps.length} plantation(s) ? Le journal des récoltes est conservé.`)) return;
        await A.pendant(e.target, null, async () => { await A.db.supprimerBac(bac.id); A.toast('Bac supprimé'); location.hash = '#/potager'; });
      };
    }
  };

  E['bac-modifier'] = {
    titre: 'Bac', parent: 'potager',
    async rendre(racine, params) {
      const A = window.appli;
      const nouveau = params[0] === 'nouveau' || !params[0];
      const bacs = await A.db.tous('bacs');
      const bac = nouveau ? { nom: `Bac ${bacs.length + 1}`, longueur: 100, largeur: 40, emplacement: 'balcon', note: '' } : bacs.find(b => b.id === params[0]);
      if (!bac) { racine.innerHTML = `<div class="vide">Ce bac n’existe plus.</div>`; return; }
      document.getElementById('titre').textContent = nouveau ? 'Nouveau bac' : 'Modifier le bac';
      racine.innerHTML = `<h1 class="titre">${nouveau ? 'Nouveau bac' : 'Modifier le bac'}</h1>
        <form class="carte" id="form" novalidate>
          <label class="champ"><span>Nom</span><input name="nom" maxlength="40" required value="${A.esc(bac.nom)}"></label>
          <div class="champs-2">
            <label class="champ"><span>Longueur (cm)</span><input name="longueur" type="number" inputmode="numeric" min="10" max="5000" required value="${A.esc(bac.longueur)}"></label>
            <label class="champ"><span>Largeur (cm)</span><input name="largeur" type="number" inputmode="numeric" min="10" max="5000" required value="${A.esc(bac.largeur)}"></label>
          </div>
          <label class="champ"><span>Emplacement</span><select name="emplacement">${Object.entries(EMPLACEMENTS).map(([c, t]) => `<option value="${c}"${bac.emplacement === c ? ' selected' : ''}>${A.esc(t)}</option>`).join('')}</select></label>
          <label class="champ"><span>Note (facultatif)</span><input name="note" maxlength="120" value="${A.esc(bac.note || '')}" placeholder="Exposition, terreau…"></label>
          <p class="doux">Une jardinière de balcon fait souvent 80 × 20 cm, un carré potager 120 × 120 cm.</p>
          <p class="erreur" id="err" role="alert"></p>
          <button class="btn btn-plein">Enregistrer</button>
        </form>`;
      const form = racine.querySelector('#form');
      form.onsubmit = async e => {
        e.preventDefault();
        const f = form.elements, err = racine.querySelector('#err');
        const nom = f.nom.value.trim(), lo = Math.round(Number(f.longueur.value)), la = Math.round(Number(f.largeur.value));
        if (!nom) { err.textContent = 'Donnez un nom au bac.'; f.nom.focus(); return; }
        if (!(lo >= 10 && lo <= 5000) || !(la >= 10 && la <= 5000)) { err.textContent = 'Les dimensions vont de 10 à 5000 cm.'; f.longueur.focus(); return; }
        await A.pendant(form.querySelector('button'), err, async () => {
          const obj = { ...bac, id: bac.id || A.db.nouvelId(), nom, longueur: lo, largeur: la, emplacement: f.emplacement.value, note: f.note.value.trim(), cree: bac.cree || new Date().toISOString() };
          await A.db.mettre('bacs', obj);
          A.toast(nouveau ? 'Bac créé' : 'Bac enregistré');
          // Création depuis une fiche : on enchaîne sur la plantation du légume choisi
          location.hash = params[1] ? `#/plantation/nouvelle/${encodeURIComponent(params[1])}/${obj.id}` : `#/bac/${obj.id}`;
        });
      };
    }
  };

  E.plantation = {
    titre: 'Plantation', parent: 'potager',
    async rendre(racine, params) {
      const A = window.appli;
      const nouvelle = params[0] === 'nouvelle' || !params[0];
      const [{ liste, parId }, bacs, plantations] = await Promise.all([A.legumes(), A.db.tous('bacs'), A.db.tous('plantations')]);
      const legumeDemande = params[1] && params[1] !== '_' ? params[1] : '';
      if (!bacs.length) {
        racine.innerHTML = `<div class="vide"><span class="emoji" aria-hidden="true">🪴</span>Créez d’abord un bac (jardinière, carré, parcelle) pour y ranger vos plantations.
          <div class="actions"><a class="btn" href="#/bac-modifier/nouveau${legumeDemande ? '/' + A.esc(encodeURIComponent(legumeDemande)) : ''}">Créer mon premier bac</a></div></div>`;
        return;
      }
      let p = nouvelle ? null : plantations.find(x => x.id === params[0]);
      if (!nouvelle && !p) { racine.innerHTML = `<div class="vide">Cette plantation n’existe plus.</div>`; return; }
      if (!p) p = { legumeId: parId[legumeDemande] ? legumeDemande : '', bacId: bacs.some(b => b.id === params[2]) ? params[2] : bacs[0].id, mode: '', dateSemis: A.aujourdhui(), nbPlants: '', dateRecoltePrevue: '', statut: 'en-cours', note: '' };
      document.getElementById('titre').textContent = nouvelle ? 'Nouvelle plantation' : 'Plantation';
      let recolteTouchee = !nouvelle;

      racine.innerHTML = `<h1 class="titre">${nouvelle ? 'Nouvelle plantation' : A.esc((parId[p.legumeId] || {}).nom || 'Plantation')}</h1>
        <form class="carte" id="form" novalidate>
          <label class="champ"><span>Légume ou aromate</span><select name="legume" required><option value="">Choisir…</option>
            ${liste.map(l => `<option value="${A.esc(l.id)}"${l.id === p.legumeId ? ' selected' : ''}>${A.esc(l.nom)}</option>`).join('')}</select></label>
          <label class="champ"><span>Bac</span><select name="bac">${bacs.map(b => `<option value="${A.esc(b.id)}"${b.id === p.bacId ? ' selected' : ''}>${A.esc(b.nom)}</option>`).join('')}</select></label>
          <label class="champ"><span>Comment</span><select name="mode"></select></label>
          <div class="champs-2">
            <label class="champ"><span id="libelle-date">Date de semis</span><input name="date" type="date" required value="${A.esc(p.dateSemis)}"></label>
            <label class="champ"><span>Nombre de plants</span><input name="nb" type="number" inputmode="numeric" min="1" max="999" value="${A.esc(p.nbPlants)}"></label>
          </div>
          <label class="champ"><span>Récolte prévue</span><input name="recolte" type="date" value="${A.esc(p.dateRecoltePrevue)}"></label>
          <label class="champ"><span>Note (facultatif)</span><input name="note" maxlength="200" value="${A.esc(p.note || '')}" placeholder="Variété, provenance…"></label>
          <div id="conseils" aria-live="polite"></div>
          <p class="erreur" id="err" role="alert"></p>
          <button class="btn btn-plein" id="enregistrer">Enregistrer</button>
        </form>
        ${nouvelle ? '' : `<div class="actions">
          <a class="btn btn-secondaire" href="#/recolte/nouvelle/${A.esc(p.id)}">🧺 Noter une récolte</a>
          <button type="button" class="btn btn-secondaire" id="statut">${p.statut === 'en-cours' ? 'Marquer terminée' : 'Remettre en cours'}</button>
          <button type="button" class="btn btn-danger" id="supprimer">Supprimer</button></div>`}`;

      const form = racine.querySelector('#form'), f = form.elements;
      function majModes() {
        const l = parId[f.legume.value];
        const modes = l ? A.modesPossibles(l) : Object.keys(A.MODES);
        const courant = modes.includes(f.mode.value) ? f.mode.value : modes.includes(p.mode) ? p.mode : modes[0];
        f.mode.innerHTML = modes.map(m => `<option value="${m}"${m === courant ? ' selected' : ''}>${A.esc(A.MODES[m])}</option>`).join('');
      }
      function majCalculs() {
        const l = parId[f.legume.value], bac = bacs.find(b => b.id === f.bac.value);
        racine.querySelector('#libelle-date').textContent = f.mode.value === 'plant' ? 'Date de plantation' : 'Date de semis';
        if (!l) { racine.querySelector('#conseils').innerHTML = ''; return; }
        if (!recolteTouchee) f.recolte.value = A.recoltePrevue(l, f.mode.value, f.date.value);
        const conseils = [];
        const zoneP = A.db.reglage('zone', A.ZONE_DEFAUT);
        return zoneP.then(zone => {
          const cal = A.calendrier(l, zone);
          const periode = { 'semis-abri': cal.semisAbri, 'semis-terre': cal.semisTerre, plant: cal.plantation }[f.mode.value] || [];
          if (A.dateValide(f.date.value) && periode.length && !periode.includes(A.versDate(f.date.value).getMonth() + 1))
            conseils.push(`⚠️ Hors saison dans votre zone : plutôt ${A.esc(A.texteMois(periode))}.`);
          if (bac) {
            const autres = plantations.filter(x => x.bacId === bac.id && x.statut === 'en-cours' && x.id !== p.id);
            const libre = Math.max(0, bac.longueur * bac.largeur - autres.reduce((t, x) => t + (parId[x.legumeId] ? A.surface(parId[x.legumeId], x.nbPlants) * 10000 : 0), 0));
            const max = Math.floor(libre / A.placePlant(l));
            if (!f.nb.value) f.nb.value = Math.max(1, Math.min(12, max || 1));
            conseils.push(`Place restante dans « ${A.esc(bac.nom)} » : ${max >= 1 ? `${max} plant${max > 1 ? 's' : ''} environ` : 'presque aucune'} (${Math.round(A.placePlant(l))} cm² chacun).`);
            const ennemis = [...new Set(autres.map(x => x.legumeId))].filter(id => l.ennemis.includes(id)).map(id => parId[id].nom.toLowerCase());
            if (ennemis.length) conseils.push(`👎 Mauvais voisin${ennemis.length > 1 ? 's' : ''} dans ce bac : ${A.esc(ennemis.join(', '))}.`);
          }
          const rep = A.repiquagePrevu(l, f.mode.value, f.date.value);
          if (rep) conseils.push(`Repiquage prévu vers le ${A.esc(A.dateLisible(rep))} : un rappel sera créé.`);
          if (racine.isConnected) racine.querySelector('#conseils').innerHTML = conseils.map(c => `<p class="doux">${c}</p>`).join('');
        });
      }
      majModes(); majCalculs();
      f.legume.onchange = () => { majModes(); if (nouvelle) f.nb.value = ''; recolteTouchee = false; majCalculs(); };
      f.mode.onchange = () => { recolteTouchee = false; majCalculs(); };
      f.date.onchange = () => { recolteTouchee = false; majCalculs(); };
      f.bac.onchange = () => { if (nouvelle) f.nb.value = ''; majCalculs(); };
      f.recolte.oninput = () => { recolteTouchee = true; };

      form.onsubmit = async e => {
        e.preventDefault();
        const err = racine.querySelector('#err');
        const l = parId[f.legume.value];
        if (!l) { err.textContent = 'Choisissez un légume.'; f.legume.focus(); return; }
        if (!A.dateValide(f.date.value)) { err.textContent = 'Indiquez une date valide.'; f.date.focus(); return; }
        const nb = Math.round(Number(f.nb.value || 1));
        if (!(nb >= 1 && nb <= 999)) { err.textContent = 'Le nombre de plants va de 1 à 999.'; f.nb.focus(); return; }
        if (f.recolte.value && (!A.dateValide(f.recolte.value) || f.recolte.value < f.date.value)) { err.textContent = 'La récolte prévue doit suivre la date de semis.'; f.recolte.focus(); return; }
        await A.pendant(racine.querySelector('#enregistrer'), err, async () => {
          const obj = { ...p, id: p.id || A.db.nouvelId(), legumeId: l.id, bacId: f.bac.value, mode: f.mode.value, dateSemis: f.date.value, nbPlants: nb,
            dateRepiquagePrevue: A.repiquagePrevu(l, f.mode.value, f.date.value), dateRecoltePrevue: f.recolte.value || A.recoltePrevue(l, f.mode.value, f.date.value),
            statut: p.statut || 'en-cours', note: f.note.value.trim(), cree: p.cree || new Date().toISOString() };
          await A.db.mettre('plantations', obj);
          A.toast(nouvelle ? `${l.nom} ajouté au potager` : 'Plantation enregistrée');
          location.hash = '#/bac/' + obj.bacId;
        });
      };
      if (!nouvelle) {
        racine.querySelector('#statut').onclick = async e => {
          await A.pendant(e.target, null, async () => {
            p.statut = p.statut === 'en-cours' ? 'terminee' : 'en-cours';
            await A.db.mettre('plantations', p);
            A.toast(p.statut === 'terminee' ? 'Plantation terminée' : 'Plantation remise en cours');
            location.hash = '#/bac/' + p.bacId;
          });
        };
        racine.querySelector('#supprimer').onclick = async e => {
          if (!confirm('Supprimer cette plantation et ses rappels ? Les récoltes notées au journal sont conservées.')) return;
          await A.pendant(e.target, null, async () => { await A.db.supprimerPlantation(p.id); A.toast('Plantation supprimée'); location.hash = '#/bac/' + p.bacId; });
        };
      }
    }
  };
})();
