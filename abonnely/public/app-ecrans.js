/* app-ecrans.js — écrans d'Abonnely. Kit « App complète » : KIT.md § 8.
   Règles : toute donnée venue de la base passe par esc() avant innerHTML ; dates et montants par fr.* (affichage.js) ;
   chaque formulaire par appli.formulaire (erreurs du serveur affichées en français) ; couleurs par les jetons (app.css). */
'use strict';
(function () {
  const { api, esc, toast, formulaire, ecran, aller, aPalier, exiger } = window.appli;
  const $ = s => document.querySelector(s);

  const CATEGORIES = { video: 'Vidéo', musique: 'Musique et livres audio', box_internet: 'Box internet', telephone: 'Téléphone', sport: 'Sport',
    presse: 'Presse et lecture', jeux: 'Jeux', logiciel: 'Logiciels', cloud: 'Stockage en ligne', autre: 'Autre' };
  const PERIODES = { hebdomadaire: 'par semaine', mensuelle: 'par mois', trimestrielle: 'par trimestre', semestrielle: 'par semestre', annuelle: 'par an' };
  const PERIODICITES = { hebdomadaire: 'Chaque semaine', mensuelle: 'Chaque mois', trimestrielle: 'Chaque trimestre', semestrielle: 'Chaque semestre', annuelle: 'Chaque année' };
  const RAPPEL_DEFAUT = 3;
  const options = (liste, choisi) => Object.entries(liste).map(([v, l]) => `<option value="${esc(v)}"${v === choisi ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const montant = cts => fr.prixCentimes(cts);
  const jourDans = n => { const d = new Date(); d.setDate(d.getDate() + n); return fr.dateIso(d); };
  const moisSuivant = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return fr.dateIso(d); };
  const quand = iso => { const j = Math.round((Date.parse(iso + 'T12:00:00') - Date.parse(fr.dateIso() + 'T12:00:00')) / 864e5);
    return j === 0 ? 'aujourd’hui' : j === 1 ? 'demain' : j > 1 && j < 7 ? `dans ${j} jours` : `le ${fr.date(iso, 'abrege')}`; };
  const premium = '<span class="pastille pastille-offre">Premium</span>';
  const refusPremium = message => { const e = new Error(message); e.statut = 402; e.palier = 'premium'; return e; };

  /** Ligne d'un abonnement dans une liste (lien vers sa fiche). */
  const ligneAbonnement = s => `<li><a class="ligne ab-ligne" href="#/abonnements/${esc(s.id)}">
      <span class="pousse"><strong>${esc(s.libelle)}</strong><br><span class="doux">${s.resilie_le ? 'résilié le ' + esc(fr.date(s.resilie_le)) : 'prochain prélèvement ' + esc(quand(s.prochaine_echeance))}</span>
        ${s.essai_fin && !s.resilie_le ? `<br><span class="pastille pastille-alerte">Essai jusqu’au ${esc(fr.date(s.essai_fin, 'abrege'))}</span>` : ''}</span>
      <span class="ab-montant"><strong>${esc(montant(s.montant_cts))}</strong><br><span class="doux">${esc(PERIODES[s.periodicite] || '')}</span></span></a></li>`;

  /* ---------------- Tableau de bord ---------------- */
  ecran('#/accueil', { titre: 'Tableau de bord', onglet: 'Accueil' }, async vue => {
    const t = await api('GET', '/api/tableau');
    if (!t.nombre) {
      vue.innerHTML = `<h1>Bienvenue sur Abonnely</h1>
        <div class="carte"><p class="vide">Ajoutez vos abonnements (streaming, musique, box, téléphone, salle de sport…) : Abonnely calcule ce qu’ils vous coûtent et vous prévient avant chaque prélèvement.</p>
        <div class="actions actions-pleines"><a class="btn" href="#/ajouter">Ajouter un abonnement</a><a class="btn btn-secondaire" href="#/importer">Importer un relevé</a></div></div>`;
      return;
    }
    const max = Math.max(...t.categories.map(c => c.mensuel_cts), 1);
    vue.innerHTML = `<h1>Tableau de bord</h1>
      <section class="carte carte-teinte ab-totaux" aria-label="Coût de vos abonnements">
        <p class="doux">Vos ${esc(fr.pluriel(t.nombre, 'abonnement'))} vous coûtent</p>
        <p class="ab-total titre">${esc(montant(t.mensuel_cts))}<span class="doux"> par mois</span></p>
        <p>soit <strong>${esc(montant(t.annuel_cts))}</strong> par an</p>
      </section>
      ${t.essais.length ? `<section class="carte"><h2>Essais gratuits qui se terminent</h2><ul class="liste">${t.essais.map(e => `<li><a class="ligne" href="#/abonnements/${esc(e.id)}/resilier">
        <span class="pousse"><strong>${esc(e.libelle)}</strong></span><span class="pastille pastille-alerte">${esc(quand(e.essai_fin))}</span></a></li>`).join('')}</ul></section>` : ''}
      <section class="carte"><h2>Prochains prélèvements</h2><ul class="liste">${t.prochains.map(ligneAbonnement).join('')}</ul>
        <div class="actions"><a class="btn btn-discret" href="#/abonnements">Tous les abonnements</a></div></section>
      <section class="carte"><h2>Par catégorie</h2><p class="doux">Coût ramené au mois</p>
        <ul class="ab-barres">${t.categories.map((c, i) => `<li><span class="ligne"><span class="pousse">${esc(CATEGORIES[c.categorie] || c.categorie)}</span><strong>${esc(montant(c.mensuel_cts))}</strong></span>
          <span class="ab-barre"><span class="ab-barre-plein ab-c${i % 3}" data-part="${esc(Math.max(2, Math.round(c.mensuel_cts / max * 100)))}"></span></span></li>`).join('')}</ul></section>`;
    vue.querySelectorAll('.ab-barre-plein').forEach(b => { b.style.width = b.dataset.part + '%'; });   // CSSOM : permis par la CSP
  });

  /* ---------------- Abonnements ---------------- */
  async function listeAbonnements(vue, resilies) {
    const { abonnements } = await api('GET', '/api/abonnements' + (resilies ? '?resilies=1' : ''));
    vue.innerHTML = `<h1>Abonnements</h1>
      <div class="bascule" role="group" aria-label="Afficher"><button type="button" id="voir-actifs" aria-pressed="${!resilies}">En cours</button><button type="button" id="voir-resilies" aria-pressed="${resilies}">Résiliés</button></div>
      <ul class="liste carte">${abonnements.length ? abonnements.map(ligneAbonnement).join('') : `<li class="vide">${resilies ? 'Aucun abonnement résilié.' : 'Aucun abonnement suivi pour l’instant.'}</li>`}</ul>
      ${resilies ? '' : '<div class="actions"><a class="btn" href="#/ajouter">Ajouter</a><a class="btn btn-secondaire" href="#/importer">Importer un relevé</a></div>'}`;
    $('#voir-actifs').onclick = () => aller('#/abonnements');
    $('#voir-resilies').onclick = () => aller('#/abonnements-resilies');
  }
  ecran('#/abonnements', { titre: 'Abonnements', onglet: 'Abonnements' }, vue => listeAbonnements(vue, false));
  ecran('#/abonnements-resilies', { titre: 'Abonnements résiliés' }, vue => listeAbonnements(vue, true));

  /** Champs communs du formulaire d'un abonnement (ajout et fiche). */
  const champsAbonnement = s => `
    <label class="champ"><span>Nom</span><input name="libelle" required maxlength="80" value="${esc(s.libelle || '')}"></label>
    <div class="ab-deux">
      <label class="champ"><span>Montant (€)</span><input name="montant" required inputmode="decimal" value="${s.montant_cts != null ? esc(String((s.montant_cts / 100).toFixed(2)).replace('.', ',')) : ''}"></label>
      <label class="champ"><span>Périodicité</span><select name="periodicite">${options(PERIODICITES, s.periodicite || 'mensuelle')}</select></label>
    </div>
    <label class="champ"><span>Catégorie</span><select name="categorie">${options(CATEGORIES, s.categorie || 'autre')}</select></label>
    <label class="champ"><span>Prochain prélèvement</span><input name="prochaine_echeance" type="date" required value="${esc(s.prochaine_echeance || moisSuivant())}"></label>
    <label class="champ"><span>Fin de l’essai gratuit (facultatif)</span><input name="essai_fin" type="date" value="${esc(s.essai_fin || '')}"></label>
    <label class="champ"><span>Rappel par e-mail ${aPalier('premium') ? '' : premium}</span><select name="rappel_jours" id="rappel-jours">
      ${[0, 1, 2, 3, 5, 7, 10, 14, 30].map(j => `<option value="${j}"${j === (s.rappel_jours != null ? s.rappel_jours : RAPPEL_DEFAUT) ? ' selected' : ''}>${j === 0 ? 'Le jour même' : j === 1 ? 'La veille' : j + ' jours avant'}</option>`).join('')}</select></label>`;
  /** Un délai de rappel différent de 3 jours est une fonction Premium : invitation standard sinon. */
  const brancherRappel = (form, initial) => {
    const sel = form.querySelector('#rappel-jours');
    sel.addEventListener('change', () => { if (Number(sel.value) !== initial && !exiger('premium')) sel.value = String(initial); });
  };
  const corpsAbonnement = d => ({ libelle: d.libelle, montant: fr.lireMontant(d.montant), periodicite: d.periodicite, categorie: d.categorie,
    prochaine_echeance: d.prochaine_echeance, essai_fin: d.essai_fin || null, rappel_jours: Number(d.rappel_jours) });

  /* ---------------- Fiche d'un abonnement ---------------- */
  ecran('#/abonnements/:id', { titre: 'Abonnement' }, async (vue, { id }) => {
    const { abonnement: s } = await api('GET', `/api/abonnements/${encodeURIComponent(id)}`);
    vue.innerHTML = `<p><a href="#/abonnements">← Abonnements</a></p><h1>${esc(s.libelle)}</h1>
      ${s.resilie_le ? `<div class="carte carte-teinte"><p>Résilié le ${esc(fr.date(s.resilie_le, 'long'))}.</p><div class="actions"><button class="btn btn-secondaire" type="button" id="reprendre">Reprendre le suivi</button></div></div>` : ''}
      <form class="carte" id="fiche" novalidate>${s.service_nom ? `<p><span class="pastille pastille-2">${esc(s.service_nom)}</span> <span class="pastille pastille-3">${esc(CATEGORIES[s.categorie] || '')}</span></p>` : ''}
        ${champsAbonnement(s)}<div class="actions"><button class="btn" type="submit">Enregistrer</button>${s.resilie_le ? '' : `<a class="btn btn-secondaire" href="#/abonnements/${esc(s.id)}/resilier">Résilier</a>`}</div></form>`;
    const form = $('#fiche');
    brancherRappel(form, s.rappel_jours);
    formulaire(form, async d => { await api('PATCH', `/api/abonnements/${encodeURIComponent(id)}`, corpsAbonnement(d)); toast('Abonnement enregistré.'); aller('#/abonnements'); });
    if (s.resilie_le) $('#reprendre').onclick = async () => {
      try { await api('PATCH', `/api/abonnements/${encodeURIComponent(id)}`, { reprendre: true }); toast('Suivi repris.'); aller(`#/abonnements/${encodeURIComponent(id)}`); }
      catch (e) { if (e.statut !== 402) toast(e.message, true); }
    };
  });

  /* ---------------- Ajouter (catalogue) ---------------- */
  ecran('#/ajouter', { titre: 'Ajouter', onglet: 'Ajouter' }, async vue => {
    vue.innerHTML = `<h1>Ajouter un abonnement</h1>
      <label class="champ"><span>Rechercher un service</span><input id="q" type="search" placeholder="Netflix, Free, Basic-Fit…" autocomplete="off"></label>
      <div class="ab-filtres" role="group" aria-label="Catégorie"><button type="button" class="pastille" data-cat="" aria-pressed="true">Tout</button>${Object.entries(CATEGORIES).filter(([k]) => k !== 'autre')
        .map(([k, l]) => `<button type="button" class="pastille pastille-2" data-cat="${esc(k)}" aria-pressed="false">${esc(l)}</button>`).join('')}</div>
      <div class="ab-tuiles" id="tuiles"></div>
      <div class="actions"><button class="btn btn-secondaire" type="button" id="libre">Autre service (saisie libre)</button><a class="btn btn-discret" href="#/importer">Importer un relevé ${aPalier('premium') ? '' : premium}</a></div>
      <div id="zone-form"></div>`;
    let cat = '', services = [];
    const charger = async () => {
      services = (await api('GET', `/api/services?q=${encodeURIComponent($('#q').value)}&categorie=${encodeURIComponent(cat)}`)).services;
      $('#tuiles').innerHTML = services.length ? services.map((s, i) => `<button type="button" class="carte carte-cliquable ab-tuile" data-i="${i}">
          <strong>${esc(s.nom)}</strong><span class="doux">${s.prix_type_cts != null ? esc(montant(s.prix_type_cts) + ' ' + PERIODES[s.periodicite_type]) : esc(CATEGORIES[s.categorie] || '')}</span></button>`).join('')
        : '<p class="vide sans-image">Aucun service trouvé : utilisez la saisie libre.</p>';
    };
    const ouvrir = service => {
      const s = service ? { libelle: service.nom, montant_cts: service.prix_type_cts, periodicite: service.periodicite_type, categorie: service.categorie } : {};
      $('#zone-form').innerHTML = `<form class="carte carte-relief" id="ajout" novalidate><h2>${service ? esc(service.nom) : 'Autre service'}</h2>
        ${service && service.prix_type_cts != null ? '<p class="doux">Montant indicatif : corrigez-le selon votre offre.</p>' : ''}${champsAbonnement(s)}
        <div class="actions"><button class="btn" type="submit">Ajouter</button><button class="btn btn-discret" type="button" id="annuler">Annuler</button></div></form>`;
      const form = $('#ajout');
      brancherRappel(form, RAPPEL_DEFAUT);
      $('#annuler').onclick = () => { $('#zone-form').innerHTML = ''; };
      formulaire(form, async d => {
        await api('POST', '/api/abonnements', Object.assign(corpsAbonnement(d), { service_id: service ? service.id : null }));
        toast('Abonnement ajouté.'); aller('#/accueil');
      });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.querySelector(service ? '[name=montant]' : '[name=libelle]').focus({ preventScroll: true });
    };
    $('#tuiles').addEventListener('click', ev => { const b = ev.target.closest('[data-i]'); if (b) ouvrir(services[Number(b.dataset.i)]); });
    $('#libre').onclick = () => ouvrir(null);
    vue.querySelector('.ab-filtres').addEventListener('click', ev => {
      const b = ev.target.closest('[data-cat]'); if (!b) return;
      cat = b.dataset.cat;
      vue.querySelectorAll('.ab-filtres [data-cat]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      charger().catch(e => toast(e.message, true));
    });
    let attente;
    $('#q').addEventListener('input', () => { clearTimeout(attente); attente = setTimeout(() => charger().catch(e => toast(e.message, true)), 200); });
    await charger();
  });

  /* ---------------- Importer un relevé (Premium) ---------------- */
  /** Relevé bancaire : UTF-8, sinon Windows-1252 (exports des banques françaises). */
  const lireFichier = async f => {
    const octets = await f.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(octets); } catch (e) { return new TextDecoder('windows-1252').decode(octets); }
  };
  ecran('#/importer', { titre: 'Importer un relevé' }, async vue => {
    if (!aPalier('premium')) throw refusPremium('L’import de relevé bancaire fait partie de l’offre Premium.');
    vue.innerHTML = `<p><a href="#/ajouter">← Ajouter</a></p><h1>Importer un relevé</h1>
      <div class="carte"><p>Exportez votre relevé au format <strong>CSV</strong> depuis l’espace client de votre banque (3 mois ou plus), puis choisissez le fichier.
        Abonnely repère les prélèvements qui reviennent au même montant à intervalle régulier.</p>
        <p class="doux">Le fichier est analysé puis oublié : il n’est jamais conservé. Aucune connexion à votre banque n’est demandée.</p>
        <label class="champ"><span>Relevé CSV (2 Mo au plus)</span><input id="fichier" type="file" accept=".csv,text/csv,.txt"></label></div>
      <div id="resultat"></div>`;
    $('#fichier').addEventListener('change', async ev => {
      const f = ev.target.files[0]; if (!f) return;
      const zone = $('#resultat');
      if (f.size > 2e6) { toast('Fichier trop volumineux (2 Mo au plus).', true); return; }
      zone.innerHTML = '<p class="vide sans-image">Analyse du relevé…</p>';
      try {
        const r = await api('POST', '/api/imports', { csv: await lireFichier(f) });
        afficherPropositions(zone, r);
      } catch (e) { zone.innerHTML = `<div class="carte"><p class="erreur">${esc(e.message)}</p></div>`; }
    });
  });
  function afficherPropositions(zone, r) {
    const p = r.propositions;
    if (!p.length) { zone.innerHTML = `<div class="carte"><p class="vide">${esc(fr.pluriel(r.import.lignes, 'opération'))} lues, aucun prélèvement récurrent repéré. Essayez un relevé plus long (3 mois ou plus).</p></div>`; return; }
    zone.innerHTML = `<form class="carte" id="propositions" novalidate><h2>${esc(fr.pluriel(p.length, 'prélèvement récurrent', 'prélèvements récurrents'))}</h2>
      <p class="doux">Sur ${esc(fr.pluriel(r.import.lignes, 'opération'))}. Cochez ceux à suivre.</p>
      <ul class="liste">${p.map((x, i) => `<li><label class="ligne ab-choix"><input type="checkbox" name="p${i}" ${x.deja_suivi ? '' : 'checked'}>
        <span class="pousse"><strong>${esc(x.libelle)}</strong>${x.deja_suivi ? ' <span class="pastille pastille-3">Déjà suivi</span>' : ''}<br>
          <span class="doux">${esc(x.libelle_releve)} · ${esc(fr.pluriel(x.occurrences, 'fois', 'fois'))}, prochain ${esc(fr.date(x.prochaine_echeance, 'abrege'))}</span></span>
        <span class="ab-montant"><strong>${esc(montant(x.montant_cts))}</strong><br><span class="doux">${esc(PERIODES[x.periodicite])}</span></span></label></li>`).join('')}</ul>
      <div class="actions"><button class="btn" type="submit">Ajouter la sélection</button></div></form>`;
    formulaire($('#propositions'), async d => {
      const choisies = p.filter((x, i) => d['p' + i]);
      if (!choisies.length) throw new Error('Cochez au moins un prélèvement.');
      const res = await api('POST', `/api/imports/${encodeURIComponent(r.import.id)}/ajouter`, { propositions: choisies });
      toast(`${fr.pluriel(res.ajoutes, 'abonnement ajouté', 'abonnements ajoutés')}.`); aller('#/abonnements');
    });
  }

  /* ---------------- Résilier ---------------- */
  ecran('#/abonnements/:id/resilier', { titre: 'Résilier' }, async (vue, { id }) => {
    const { abonnement: s } = await api('GET', `/api/abonnements/${encodeURIComponent(id)}`);
    const u = window.appli.utilisateur, nom = (u && u.nom) || '';
    vue.innerHTML = `<p><a href="#/abonnements/${esc(s.id)}">← ${esc(s.libelle)}</a></p><h1>Résilier ${esc(s.libelle)}</h1>
      <p class="doux">${s.resilie_le ? 'Déjà marqué comme résilié.' : `Prochain prélèvement ${esc(quand(s.prochaine_echeance))} : ${esc(montant(s.montant_cts))}.`}</p>
      <section class="carte"><h2>1. En ligne, en quelques clics</h2>
        ${s.lien_resiliation ? `<p>La plupart des services proposent la résiliation depuis l’espace client.</p>
          <div class="actions"><a class="btn" href="${esc(s.lien_resiliation)}" target="_blank" rel="noopener noreferrer">Ouvrir la page de ${esc(s.service_nom || s.libelle)}</a></div>`
          : '<p class="doux">Pas de lien connu pour ce service : cherchez « Résilier » dans votre espace client, ou envoyez la lettre ci-dessous.</p>'}</section>
      <section class="carte"><h2>2. Par courrier ${aPalier('premium') ? '' : premium}</h2>
        <p class="doux">Lettre de résiliation prête à signer, à envoyer en recommandé avec accusé de réception. Vos coordonnées servent à la lettre et ne sont pas enregistrées.</p>
        <form id="lettre" novalidate>
          <label class="champ"><span>Votre nom</span><input name="nom" required maxlength="80" value="${esc(nom)}" autocomplete="name"></label>
          <label class="champ"><span>Votre adresse</span><textarea name="adresse" required maxlength="200" rows="3" autocomplete="street-address"></textarea></label>
          <label class="champ"><span>Numéro client ou de contrat (facultatif)</span><input name="numero" maxlength="60"></label>
          <label class="champ"><span>Adresse du service (facultatif)</span><textarea name="destinataire" maxlength="200" rows="3"></textarea></label>
          <label class="champ"><span>Ville (pour « Fait à… », facultatif)</span><input name="ville" maxlength="60" autocomplete="address-level2"></label>
          <div class="actions"><button class="btn" type="submit">Télécharger la lettre PDF</button></div></form></section>
      ${s.resilie_le ? '' : `<section class="carte carte-teinte"><h2>3. Une fois résilié</h2><p>Marquez-le pour l’enlever de vos totaux et arrêter les rappels.</p>
        <div class="actions"><button class="btn btn-secondaire" type="button" id="marquer">Marquer comme résilié</button></div></section>`}`;
    formulaire($('#lettre'), async d => {
      if (!exiger('premium')) return;
      const q = new URLSearchParams(Object.entries(d).filter(([, v]) => String(v).trim()));
      const res = await fetch(`/api/abonnements/${encodeURIComponent(id)}/lettre.pdf?${q}`, { credentials: 'same-origin', headers: { 'X-Appli': '1' } });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.erreur || 'Erreur ' + res.status); }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = (res.headers.get('Content-Disposition') || '').replace(/.*filename="([^"]+)".*/, '$1') || 'resiliation.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast('Lettre téléchargée.');
    });
    if (!s.resilie_le) $('#marquer').onclick = async () => {
      try { await api('DELETE', `/api/abonnements/${encodeURIComponent(id)}`); toast(s.libelle + ' : marqué comme résilié.'); aller('#/abonnements'); }
      catch (e) { toast(e.message, true); }
    };
  });

  ecran('#/compte', { titre: 'Mon compte', onglet: 'Compte' }, null);   // onglet vers l'écran du socle

})();
