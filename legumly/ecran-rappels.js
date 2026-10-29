/* ecran-rappels.js — Legumly : « Rappels » (#/rappels). Calculés depuis les plantations ; « fait » enregistré en IndexedDB.
   Les rappels s'affichent dans l'app (pastille sur l'onglet) : pas de notification app fermée sans serveur d'envoi. */
(function () {
  'use strict';
  const E = window.ECRANS_APP = window.ECRANS_APP || {};

  E.rappels = {
    titre: 'Rappels', onglet: 'Rappels',
    async rendre(racine) {
      const A = window.appli;
      const [rappels, { liste }, zone] = await Promise.all([A.rappels(), A.legumes(), A.db.reglage('zone', A.ZONE_DEFAUT)]);
      const auj = A.aujourdhui(), semaine = A.ajouterJours(auj, 7), ilYa30 = A.ajouterJours(auj, -30);
      const groupes = [
        { titre: 'En retard', classe: 'retard', items: rappels.filter(r => !r.fait && r.date < auj) },
        { titre: 'Cette semaine', classe: '', items: rappels.filter(r => !r.fait && r.date >= auj && r.date <= semaine) },
        { titre: 'Plus tard', classe: '', items: rappels.filter(r => !r.fait && r.date > semaine) }
      ];
      const faits = rappels.filter(r => r.fait && r.faitLe >= ilYa30).sort((a, b) => b.faitLe.localeCompare(a.faitLe));
      const m = new Date().getMonth() + 1;
      const aSemer = liste.filter(l => { const c = A.calendrier(l, zone); return c.semisAbri.includes(m) || c.semisTerre.includes(m); }).length;
      const quand = r => {
        const n = A.ecartJours(auj, r.date);
        if (n === 0) return 'aujourd’hui';
        if (n === 1) return 'demain';
        if (n === -1) return 'hier';
        if (n < 0) return `depuis ${-n} jours (${A.dateLisible(r.date)})`;
        if (n <= 7) return `dans ${n} jours`;
        return `vers le ${A.dateLisible(r.date)}`;
      };
      const ligne = (r, classe) => `<li class="rappel ${classe}">
          <button type="button" class="case-a-cocher" data-cle="${A.esc(r.cle)}" aria-pressed="${r.fait}" aria-label="${r.fait ? 'Annuler : ' : 'Marquer fait : '}${A.esc(r.texte)}">${r.fait ? '✓' : ''}</button>
          <span class="emoji" aria-hidden="true">${A.esc(r.legume.emoji)}</span>
          <span class="ligne-texte"><a href="#/plantation/${A.esc(r.plantation.id)}">${A.esc(r.texte)}</a><small>${A.esc(r.fait ? 'Fait' : (r.type === 'recolte' ? 'Début de récolte ' : 'À faire ') + quand(r))}</small></span>
          ${r.type === 'recolte' && !r.fait && r.date <= semaine ? `<a class="btn-rond" href="#/recolte/nouvelle/${A.esc(r.plantation.id)}" aria-label="Noter une récolte de ${A.esc(r.legume.nom.toLowerCase())}">🧺</a>` : ''}
        </li>`;

      const aFaire = groupes.some(g => g.items.length);
      racine.innerHTML = `<h1 class="titre">Rappels</h1>
        ${aFaire ? groupes.filter(g => g.items.length).map(g => `<h2 class="sous-titre">${A.esc(g.titre)} <span class="doux">(${g.items.length})</span></h2>
          <ul class="liste-liens">${g.items.map(r => ligne(r, g.classe)).join('')}</ul>`).join('')
        : `<div class="vide"><span class="emoji" aria-hidden="true">🔔</span>${rappels.length ? 'Tout est fait, bravo !' : 'Les rappels de repiquage et de récolte apparaissent ici quand vous ajoutez des plantations à votre potager.'}
            ${rappels.length ? '' : '<div class="actions"><a class="btn" href="#/potager">Mon potager</a></div>'}</div>`}
        <ul class="liste-liens"><li><a href="#/mois/${m}"><span class="emoji" aria-hidden="true">🌱</span><span class="ligne-texte">${aSemer} légumes et aromates à semer en ${A.esc(A.MOIS[m - 1])}<small>Voir le calendrier du mois</small></span><span class="chevron" aria-hidden="true">›</span></a></li></ul>
        ${faits.length ? `<details class="carte"><summary>Faits ces 30 derniers jours (${faits.length})</summary><ul class="liste-liens">${faits.map(r => ligne(r, '')).join('')}</ul></details>` : ''}
        <p class="doux">Les rappels s’affichent dans l’app : ouvrez Legumly de temps en temps, la pastille de l’onglet indique ce qui est à faire dans les 7 jours.</p>`;

      racine.querySelectorAll('.case-a-cocher').forEach(b => {
        b.onclick = async () => {
          const fait = b.getAttribute('aria-pressed') !== 'true';
          await A.pendant(b, null, async () => {
            if (fait) await A.db.mettre('rappelsFaits', { cle: b.dataset.cle, date: A.aujourdhui() });
            else await A.db.supprimer('rappelsFaits', b.dataset.cle);
            A.toast(fait ? 'Fait ✓' : 'Remis à faire');
            await E.rappels.rendre(racine);
            A.majBadges();
            if (racine.parentNode) racine.parentNode.focus({ preventScroll: true });
          });
        };
      });
    }
  };
})();
