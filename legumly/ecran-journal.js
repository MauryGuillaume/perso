/* ecran-journal.js — Legumly : « Journal » des récoltes (#/journal/<année>) et formulaire de récolte (#/recolte/<id|nouvelle>/<plantation>). */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const UNITES = { g: 'g', kg: 'kg', pieces: 'pièce(s)', bottes: 'botte(s)' };
  const nombre = n => String(Math.round(n * 100) / 100).replace('.', ',');

  /** « 2,4 kg · 12 pièces » à partir d'une liste d'entrées (g et kg additionnés). */
  function totaux(entrees) {
    let kg = 0, pieces = 0, bottes = 0;
    for (const e of entrees) {
      if (e.unite === 'g') kg += e.quantite / 1000; else if (e.unite === 'kg') kg += e.quantite;
      else if (e.unite === 'pieces') pieces += e.quantite; else if (e.unite === 'bottes') bottes += e.quantite;
    }
    return [kg ? (kg < 1 ? `${nombre(kg * 1000)} g` : `${nombre(kg)} kg`) : '', pieces ? `${nombre(pieces)} pièce${pieces > 1 ? 's' : ''}` : '',
      bottes ? `${nombre(bottes)} botte${bottes > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
  }

  E.journal = {
    titre: 'Journal des récoltes', onglet: 'Journal',
    async rendre(racine, params) {
      const A = window.appli;
      const [{ parId }, entrees] = await Promise.all([A.legumes(), A.db.tous('journal')]);
      const annees = [...new Set(entrees.map(e => e.date.slice(0, 4)))].sort().reverse();
      const anneeCourante = String(new Date().getFullYear());
      if (!annees.includes(anneeCourante)) annees.unshift(anneeCourante);
      const annee = annees.includes(params[0]) ? params[0] : anneeCourante;
      const dansAnnee = entrees.filter(e => e.date.startsWith(annee)).sort((a, b) => b.date.localeCompare(a.date) || (b.cree || '').localeCompare(a.cree || ''));
      const parLegume = {};
      dansAnnee.forEach(e => { (parLegume[e.legumeId] = parLegume[e.legumeId] || []).push(e); });
      const classement = Object.entries(parLegume).map(([id, es]) => ({ l: parId[id] || { nom: 'Légume inconnu', emoji: '❓' }, es }))
        .sort((a, b) => b.es.length - a.es.length || a.l.nom.localeCompare(b.l.nom, 'fr'));
      const parMois = {};
      dansAnnee.forEach(e => { const m = Number(e.date.slice(5, 7)); (parMois[m] = parMois[m] || []).push(e); });

      racine.innerHTML = `<h1 class="titre">Journal des récoltes</h1>
        ${annees.length > 1 ? `<div class="puces" role="group" aria-label="Saison">${annees.map(a => `<a class="puce" href="#/journal/${a}" ${a === annee ? 'aria-current="true"' : ''}>${a}</a>`).join('')}</div>` : ''}
        <a class="btn btn-plein" href="#/recolte/nouvelle">🧺 Noter une récolte</a>
        ${dansAnnee.length ? `
          <h2 class="sous-titre">Saison ${A.esc(annee)} · ${dansAnnee.length} récolte${dansAnnee.length > 1 ? 's' : ''}</h2>
          <ul class="liste-liens">${classement.map(x => `<li><div class="ligne"><span class="emoji" aria-hidden="true">${A.esc(x.l.emoji)}</span>
            <span class="ligne-texte">${A.esc(x.l.nom)}<small>${A.esc(totaux(x.es))} · ${x.es.length} cueillette${x.es.length > 1 ? 's' : ''}</small></span></div></li>`).join('')}</ul>
          ${Object.keys(parMois).sort((a, b) => b - a).map(m => `<h2 class="sous-titre">${A.esc(A.MOIS[m - 1][0].toUpperCase() + A.MOIS[m - 1].slice(1))}</h2>
            <ul class="liste-liens">${parMois[m].map(e => { const l = parId[e.legumeId] || { nom: 'Légume inconnu', emoji: '❓' };
              return `<li><a href="#/recolte/${A.esc(e.id)}"><span class="emoji" aria-hidden="true">${A.esc(l.emoji)}</span>
                <span class="ligne-texte">${A.esc(l.nom)} · ${A.esc(nombre(e.quantite))} ${A.esc(UNITES[e.unite] || '')}<small>${A.esc(A.dateLisible(e.date))}${e.note ? ' · ' + A.esc(e.note) : ''}</small></span>
                <span class="chevron" aria-hidden="true">›</span></a></li>`; }).join('')}</ul>`).join('')}`
        : `<div class="vide"><span class="emoji" aria-hidden="true">🧺</span>Aucune récolte notée en ${A.esc(annee)}. Notez chaque cueillette pour voir ce que rapporte votre potager.</div>`}`;
    }
  };

  E.recolte = {
    titre: 'Récolte', parent: 'journal',
    async rendre(racine, params) {
      const A = window.appli;
      const nouvelle = params[0] === 'nouvelle' || !params[0];
      const [{ liste, parId }, entrees, plantations, bacs] = await Promise.all([A.legumes(), A.db.tous('journal'), A.db.tous('plantations'), A.db.tous('bacs')]);
      let e = nouvelle ? null : entrees.find(x => x.id === params[0]);
      if (!nouvelle && !e) { racine.innerHTML = `<div class="vide">Cette récolte n’existe plus.</div>`; return; }
      const plantation = nouvelle && params[1] ? plantations.find(p => p.id === params[1]) : null;
      if (!e) {
        // Unité par défaut : pièces pour les gros fruits, bottes pour les aromates, sinon grammes
        const l = plantation && parId[plantation.legumeId];
        const unite = l ? (l.type === 'aromate' ? 'bottes' : /Cucurbitacées|Brassicacées/.test(l.famille) && l.espacementPlants >= 40 ? 'pieces' : 'g') : 'g';
        e = { legumeId: plantation ? plantation.legumeId : '', plantationId: plantation ? plantation.id : '', bacId: plantation ? plantation.bacId : '', date: A.aujourdhui(), quantite: '', unite, note: '' };
      }
      document.getElementById('titre').textContent = nouvelle ? 'Noter une récolte' : 'Récolte';
      const nomBac = Object.fromEntries(bacs.map(b => [b.id, b.nom]));
      racine.innerHTML = `<h1 class="titre">${nouvelle ? 'Noter une récolte' : 'Modifier la récolte'}</h1>
        <form class="carte" id="form" novalidate>
          <label class="champ"><span>Légume ou aromate</span><select name="legume" required><option value="">Choisir…</option>
            ${liste.map(l => `<option value="${A.esc(l.id)}"${l.id === e.legumeId ? ' selected' : ''}>${A.esc(l.nom)}</option>`).join('')}</select></label>
          <label class="champ"><span>Plantation (facultatif)</span><select name="plantation"></select></label>
          <label class="champ"><span>Date</span><input name="date" type="date" required value="${A.esc(e.date)}" max="${A.esc(A.aujourdhui())}"></label>
          <div class="champs-2">
            <label class="champ"><span>Quantité</span><input name="quantite" type="text" inputmode="decimal" autocomplete="off" required value="${A.esc(e.quantite === '' ? '' : String(e.quantite).replace('.', ','))}"></label>
            <label class="champ"><span>Unité</span><select name="unite">${Object.entries(UNITES).map(([c, t]) => `<option value="${c}"${c === e.unite ? ' selected' : ''}>${A.esc(t)}</option>`).join('')}</select></label>
          </div>
          <label class="champ"><span>Note (facultatif)</span><input name="note" maxlength="200" value="${A.esc(e.note || '')}" placeholder="Goût, calibre, météo…"></label>
          ${plantation && plantation.statut === 'en-cours' ? `<label class="champ"><span><input type="checkbox" name="terminer"> C’était la dernière récolte : terminer la plantation</span></label>` : ''}
          <p class="erreur" id="err" role="alert"></p>
          <button class="btn btn-plein" id="enregistrer">Enregistrer</button>
        </form>
        ${nouvelle ? '' : '<div class="actions"><button type="button" class="btn btn-danger" id="supprimer">Supprimer cette récolte</button></div>'}`;
      const form = racine.querySelector('#form'), f = form.elements;
      function majPlantations() {
        const ps = plantations.filter(p => p.legumeId === f.legume.value).sort((a, b) => (b.dateSemis || '').localeCompare(a.dateSemis || ''));
        f.plantation.innerHTML = `<option value="">Aucune en particulier</option>` + ps.map(p =>
          `<option value="${A.esc(p.id)}"${p.id === e.plantationId ? ' selected' : ''}>${A.esc(nomBac[p.bacId] || 'Bac supprimé')} · ${A.esc(A.dateLisible(p.dateSemis, true))}${p.statut === 'en-cours' ? '' : ' (terminée)'}</option>`).join('');
        f.plantation.disabled = !ps.length;
      }
      majPlantations();
      f.legume.onchange = majPlantations;

      form.onsubmit = async ev => {
        ev.preventDefault();
        const err = racine.querySelector('#err');
        const l = parId[f.legume.value];
        const q = Number(String(f.quantite.value).trim().replace(/\s/g, '').replace(',', '.'));
        if (!l) { err.textContent = 'Choisissez un légume.'; f.legume.focus(); return; }
        if (!A.dateValide(f.date.value)) { err.textContent = 'Indiquez une date valide.'; f.date.focus(); return; }
        if (!(q > 0 && q < 100000)) { err.textContent = 'Indiquez une quantité supérieure à 0.'; f.quantite.focus(); return; }
        await A.pendant(racine.querySelector('#enregistrer'), err, async () => {
          const p = plantations.find(x => x.id === f.plantation.value);
          const obj = { ...e, id: e.id || A.db.nouvelId(), legumeId: l.id, plantationId: p ? p.id : '', bacId: p ? p.bacId : '', date: f.date.value,
            quantite: q, unite: f.unite.value, note: f.note.value.trim(), cree: e.cree || new Date().toISOString() };
          await A.db.mettre('journal', obj);
          if (p) await A.db.mettre('rappelsFaits', { cle: p.id + ':recolte', date: A.aujourdhui() });
          if (f.terminer && f.terminer.checked && p) await A.db.mettre('plantations', { ...p, statut: 'terminee' });
          A.toast(nouvelle ? 'Récolte notée 🧺' : 'Récolte enregistrée');
          location.hash = '#/journal/' + obj.date.slice(0, 4);
        });
      };
      if (!nouvelle) racine.querySelector('#supprimer').onclick = async ev => {
        if (!confirm('Supprimer cette récolte du journal ?')) return;
        await A.pendant(ev.target, null, async () => { await A.db.supprimer('journal', e.id); A.toast('Récolte supprimée'); location.hash = '#/journal/' + e.date.slice(0, 4); });
      };
    }
  };
})();
