/* ecran-reglages.js — Legumly : « Réglages » (#/reglages) : zone, commune et alerte gel, sauvegarde des données. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};
  const VERSION_APP = '1.0.0';

  E.reglages = {
    titre: 'Réglages', parent: 'mois',
    async rendre(racine) {
      const A = window.appli;
      const [zone, commune, seuil] = await Promise.all([A.db.reglage('zone', null), A.db.reglage('commune', null), A.db.reglage('seuilGel', A.meteo.SEUIL_DEFAUT)]);
      racine.innerHTML = `<h1 class="titre">Réglages</h1>
        <section class="carte" aria-labelledby="t-commune">
          <h2 class="sous-titre" id="t-commune">Ma commune</h2>
          <p class="doux">Pour l’alerte gel. Seule une position approchée (à 1 km près) est envoyée au service météo Open-Meteo.</p>
          <p id="commune-actuelle">${commune ? `📍 <strong>${A.esc(commune.nom)}</strong> <span class="doux">${A.esc(commune.detail || '')}</span>` : 'Aucune commune choisie.'}</p>
          <form id="form-commune" novalidate>
            <label class="champ"><span>${commune ? 'Changer de commune' : 'Chercher ma commune'}</span><input name="q" type="search" autocomplete="address-level2" maxlength="60" enterkeyhint="search" placeholder="Ex. : Nantes"></label>
            <button class="btn btn-secondaire">Chercher</button>
            <p class="erreur" id="err-commune" role="alert"></p>
          </form>
          <ul class="liste-liens" id="resultats" hidden></ul>
          <div id="meteo"></div>
        </section>
        <section class="carte" aria-labelledby="t-zone">
          <h2 class="sous-titre" id="t-zone">Ma zone climatique</h2>
          <p class="doux" id="suggestion"></p>
          <fieldset class="choix-zone">
            <legend class="visuellement-cache">Zone climatique</legend>
            ${Object.entries(A.ZONES).map(([c, z]) => `<label class="ligne choix"><input type="radio" name="zone" value="${c}"${(zone || A.ZONE_DEFAUT) === c ? ' checked' : ''}>
              <span class="ligne-texte">${A.esc(z.nom)}<small>${A.esc(z.aide)}</small></span></label>`).join('')}
          </fieldset>
        </section>
        <section class="carte" aria-labelledby="t-gel">
          <h2 class="sous-titre" id="t-gel">Alerte gel</h2>
          <label class="champ"><span>M’alerter quand la minimale prévue descend à</span>
            <select id="seuil">${[4, 3, 2, 1, 0, -2].map(v => `<option value="${v}"${Number(seuil) === v ? ' selected' : ''}>${v} °C ou moins</option>`).join('')}</select></label>
          <p class="doux">2 °C sous abri météo donne souvent du gel au ras du sol : c’est le réglage conseillé.</p>
        </section>
        <section class="carte" aria-labelledby="t-donnees">
          <h2 class="sous-titre" id="t-donnees">Mes données</h2>
          <p class="doux">Vos bacs, plantations et récoltes restent sur ce téléphone, sans compte. Faites une sauvegarde de temps en temps ou avant de changer de téléphone.</p>
          <div class="actions">
            <button type="button" class="btn btn-secondaire" id="exporter">Sauvegarder (fichier)</button>
            <label class="btn btn-secondaire" for="fichier">Restaurer</label>
            <input type="file" id="fichier" accept="application/json,.json" class="visuellement-cache">
          </div>
          <p class="erreur" id="err-donnees" role="alert"></p>
          <div class="actions"><button type="button" class="btn btn-danger" id="effacer">Tout effacer</button></div>
        </section>
        <p class="doux">Legumly ${VERSION_APP} · Votre quotidien, en plus simple.<br>
          Prévisions : <a href="https://open-meteo.com/" rel="noopener" target="_blank">Open-Meteo.com</a> (CC BY 4.0). Calendriers indicatifs, à adapter à votre jardin.</p>`;

      const fCommune = racine.querySelector('#form-commune'), resultats = racine.querySelector('#resultats');
      const zoneMeteo = racine.querySelector('#meteo');

      async function afficherMeteo(forcer) {
        if (!(await A.db.reglage('commune', null))) { zoneMeteo.innerHTML = ''; return; }
        zoneMeteo.innerHTML = '<p class="doux">Chargement des prévisions…</p>';
        try {
          const g = await A.meteo.joursDeGel(forcer);
          if (!racine.isConnected || !g) return;
          zoneMeteo.innerHTML = `<p class="doux">Minimales des 7 prochains jours${g.horsLigne ? ' (hors ligne, dernières reçues)' : ''} :</p>
            <div class="meteo-jours">${g.jours.map(j => `<div class="${j.min <= g.seuil ? 'froid' : ''}"><div>${A.esc(A.versDate(j.date).toLocaleDateString('fr-FR', { weekday: 'short' }))}</div>
              <div>${A.esc(String(Math.round(j.min)))}°</div></div>`).join('')}</div>`;
        } catch (e) { if (racine.isConnected) zoneMeteo.innerHTML = `<p class="erreur" role="alert">${A.esc(e.message)}</p>`; }
      }
      afficherMeteo(false);
      function majSuggestion(c) {
        const s = c ? A.suggererZone(c) : null;
        racine.querySelector('#suggestion').textContent = s ? `Zone suggérée pour ${c.nom} : ${A.ZONES[s].nom.toLowerCase()}. Ajustez si besoin.` : 'Choisissez la zone la plus proche de votre climat.';
      }
      majSuggestion(commune);

      fCommune.onsubmit = async e => {
        e.preventDefault();
        const err = racine.querySelector('#err-commune');
        await A.pendant(fCommune.querySelector('button'), err, async () => {
          const liste = await A.meteo.chercherCommunes(fCommune.elements.q.value);
          if (!liste.length) { err.textContent = 'Aucune commune trouvée. Vérifiez l’orthographe.'; resultats.hidden = true; return; }
          resultats.innerHTML = liste.map((c, i) => `<li><button type="button" class="ligne bouton-ligne" data-i="${i}"><span class="emoji" aria-hidden="true">📍</span>
            <span class="ligne-texte">${A.esc(c.nom)}<small>${A.esc(c.detail)}${c.altitude != null ? ' · ' + A.esc(Math.round(c.altitude)) + ' m' : ''}</small></span></button></li>`).join('');
          resultats.hidden = false;
          resultats.querySelectorAll('button').forEach(b => {
            b.onclick = async () => {
              const c = liste[Number(b.dataset.i)];
              await A.pendant(b, err, async () => {
                await A.db.regler('commune', c);
                const zoneActuelle = await A.db.reglage('zone', null);
                if (!zoneActuelle) {
                  const s = A.suggererZone(c);
                  await A.db.regler('zone', s);
                  racine.querySelectorAll('input[name="zone"]').forEach(r => { r.checked = r.value === s; });
                }
                racine.querySelector('#commune-actuelle').innerHTML = `📍 <strong>${A.esc(c.nom)}</strong> <span class="doux">${A.esc(c.detail || '')}</span>`;
                resultats.hidden = true; fCommune.reset();
                majSuggestion(c);
                A.toast(`Commune enregistrée : ${c.nom}`);
                afficherMeteo(true);
              });
            };
          });
          resultats.querySelector('button').focus();
        });
      };

      racine.querySelectorAll('input[name="zone"]').forEach(r => {
        r.onchange = async () => {
          try { await A.db.regler('zone', r.value); A.toast(`Zone ${A.ZONES[r.value].nom.toLowerCase()} enregistrée`); }
          catch (e) { A.toast(e.message); }
        };
      });
      racine.querySelector('#seuil').onchange = async e => {
        try { await A.db.regler('seuilGel', Number(e.target.value)); A.toast('Seuil enregistré'); afficherMeteo(false); }
        catch (er) { A.toast(er.message); }
      };

      const errD = racine.querySelector('#err-donnees');
      racine.querySelector('#exporter').onclick = async e => {
        await A.pendant(e.target, errD, async () => {
          const d = await A.db.exporter();
          const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' }));
          const a = document.createElement('a');
          a.href = url; a.download = `legumly-sauvegarde-${A.aujourdhui()}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          A.toast('Sauvegarde téléchargée');
        });
      };
      racine.querySelector('#fichier').onchange = async e => {
        const fichier = e.target.files[0];
        e.target.value = '';
        if (!fichier) return;
        await A.pendant(null, errD, async () => {
          if (fichier.size > 10 * 1024 * 1024) throw new Error('Fichier trop gros pour une sauvegarde Legumly.');
          let d;
          try { d = JSON.parse(await fichier.text()); } catch (er) { throw new Error('Ce fichier n’est pas une sauvegarde lisible.'); }
          if (!d || d.app !== 'legumly') throw new Error('Ce fichier n’est pas une sauvegarde Legumly.');
          if (!confirm(`Remplacer toutes vos données par la sauvegarde du ${A.dateLisible((d.date || '').slice(0, 10), true)} ?`)) return;
          await A.db.importer(d);
          A.toast('Sauvegarde restaurée');
          E.reglages.rendre(racine);
        });
      };
      racine.querySelector('#effacer').onclick = async e => {
        if (!confirm('Effacer définitivement bacs, plantations, récoltes et réglages de ce téléphone ?')) return;
        await A.pendant(e.target, errD, async () => { await A.db.toutEffacer(); A.toast('Données effacées'); location.hash = '#/mois'; });
      };
    }
  };
})();
