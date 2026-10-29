/* app-ecrans.js — écrans de l'app (exemple « Suivi clients » à remplacer). Kit « App complète » : KIT.md § 8.
   Règles : toute donnée venue de la base passe par esc() avant innerHTML ; dates et montants par fr.* (affichage.js) ;
   chaque formulaire par appli.formulaire (erreurs du serveur affichées en français). */
'use strict';
(function () {
  const { api, esc, toast, formulaire, ecran, aller } = window.appli;

  ecran('#/clients', { titre: 'Clients', onglet: 'Clients' }, async vue => {
    vue.innerHTML = `<h1>Clients</h1>
      <form class="carte" id="ajout" novalidate><h2>Nouveau client</h2>
        <label class="champ"><span>Nom</span><input name="nom" required maxlength="120"></label>
        <label class="champ"><span>Email</span><input name="email" type="email"></label>
        <label class="champ"><span>Téléphone</span><input name="telephone" type="tel"></label>
        <button class="btn" type="submit">Ajouter</button></form>
      <label class="champ"><span>Rechercher</span><input id="q" type="search" placeholder="Nom du client"></label>
      <ul class="liste carte" id="liste"></ul>`;
    const charger = async () => {
      const { clients } = await api('GET', '/api/clients?q=' + encodeURIComponent(document.getElementById('q').value));
      document.getElementById('liste').innerHTML = clients.length ? clients.map(c => `<li><a href="#/clients/${esc(c.id)}"><div class="ligne"><span class="pousse"><strong>${esc(c.nom)}</strong><br>
        <span class="doux">${esc(c.email || fr.telephone(c.telephone) || '')}</span></span><span class="doux">${c.dernier_contact ? esc(fr.relatif(c.dernier_contact)) : 'jamais contacté'}</span></div></a></li>`).join('')
        : '<li class="vide">Aucun client.</li>';
    };
    let attente;
    document.getElementById('q').addEventListener('input', () => { clearTimeout(attente); attente = setTimeout(() => charger().catch(e => toast(e.message, true)), 250); });
    formulaire(document.getElementById('ajout'), async (d, form) => { await api('POST', '/api/clients', d); form.reset(); toast('Client ajouté.'); await charger(); });
    await charger();
  });

  ecran('#/clients/:id', { titre: 'Client' }, async (vue, { id }) => {
    const { interventions } = await api('GET', `/api/clients/${encodeURIComponent(id)}/interventions`);
    vue.innerHTML = `<p><a href="#/clients">← Clients</a></p><h1>Interventions</h1>
      <form class="carte" id="ajout" novalidate><h2>Nouvelle intervention</h2>
        <label class="champ"><span>Titre</span><input name="titre" required maxlength="160"></label>
        <label class="champ"><span>Durée (minutes)</span><input name="duree_min" type="number" min="0" value="30"></label>
        <label class="champ"><span>Montant TTC (€)</span><input name="montant" inputmode="decimal"></label>
        <button class="btn" type="submit">Ajouter</button></form>
      <ul class="liste carte">${interventions.length ? interventions.map(i => `<li class="ligne"><span class="pousse"><strong>${esc(i.titre)}</strong><br>
        <span class="doux">${esc(fr.dateHeure(i.date_le))} · ${esc(i.duree_min)} min</span></span><span>${i.montant == null ? '' : esc(fr.prix(i.montant))}</span></li>`).join('')
        : '<li class="vide">Aucune intervention.</li>'}</ul>`;
    formulaire(document.getElementById('ajout'), async d => {
      if (d.montant) d.montant = fr.lireMontant(d.montant);
      await api('POST', `/api/clients/${encodeURIComponent(id)}/interventions`, d); toast('Intervention ajoutée.'); aller(location.hash);
    });
  });

  ecran('#/relances', { titre: 'Relances', onglet: 'Relances' }, async vue => {
    const { clients } = await api('GET', '/api/relances');
    vue.innerHTML = `<h1>À relancer</h1><ul class="liste carte">${clients.length ? clients.map(c => `<li><a href="#/clients/${esc(c.id)}" class="ligne"><span class="pousse">${esc(c.nom)}</span>
      <span class="doux">${c.dernier_contact ? 'dernier contact ' + esc(fr.relatif(c.dernier_contact)) : 'jamais contacté'}</span></a></li>`).join('') : '<li class="vide">Personne à relancer.</li>'}</ul>`;
  });

  ecran('#/compte', { titre: 'Mon compte', onglet: 'Compte' }, null);   // onglet vers l'écran du socle
})();
