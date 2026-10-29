/* app-ecrans.js — écrans de Ressena. Kit « App complète » : KIT.md § 8.
   Règles : toute donnée venue de la base passe par esc() avant innerHTML ; dates par fr.* (affichage.js) ;
   chaque formulaire par appli.formulaire (erreurs du serveur affichées en français).
   La séance se déroule entièrement sur le téléphone (chronomètre, voix, écran maintenu allumé) et s'envoie à la fin ;
   sans réseau, elle reste en attente sur le téléphone et repart à la prochaine ouverture de « Mon plan ». */
'use strict';
(function () {
  const { api, esc, toast, formulaire, ecran, aller } = window.appli;
  const $ = s => document.querySelector(s);
  const ATTENTE = 'ressena-seances-en-attente';
  const RESSENTIS = [
    ['trop_facile', 'Trop facile', 'J’aurais pu en faire plus'],
    ['bien', 'Bien', 'Un bon effort, sans souffrir'],
    ['difficile', 'Difficile', 'J’ai terminé, mais c’était dur'],
    ['trop_dur', 'Trop dur', 'Je préfère refaire cette séance']
  ];
  const libelleRessenti = id => (RESSENTIS.find(r => r[0] === id) || [, ''])[1];

  /* ---------- Outils ---------- */
  const chrono = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
  const duree = s => { s = Math.round(s); if (s < 60) return `${s} s`; const m = Math.floor(s / 60), r = s % 60; return r ? `${m} min ${String(r).padStart(2, '0')}` : `${m} min`; };
  const dureeParlee = s => { if (s < 120 && s % 60) return `${s} secondes`; const m = Math.floor(s / 60), r = s % 60; return `${m} minute${m > 1 ? 's' : ''}${r ? ' ' + r : ''}`; };
  const totalSeance = x => (x.echauffement_s || 0) + (x.blocs || []).reduce((t, b) => t + b.duree_s, 0) + (x.retour_calme_s || 0);
  const resume = x => {
    const blocs = x.blocs || [], course = blocs.filter(b => b.type === 'course');
    if (course.length === 1 && blocs.length === 1) return `${duree(course[0].duree_s)} de course sans arrêt`;
    const total = course.reduce((t, b) => t + b.duree_s, 0);
    const memes = course.every(b => b.duree_s === course[0].duree_s);
    return memes ? `${esc(course.length)} × ${duree(course[0].duree_s)} de course, ${duree(total)} au total` : `${esc(course.length)} temps de course, ${duree(total)} au total`;
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
  const lireAttente = () => { try { return JSON.parse(localStorage.getItem(ATTENTE) || '[]'); } catch (e) { return []; } };
  const ecrireAttente = l => { try { if (l.length) localStorage.setItem(ATTENTE, JSON.stringify(l)); else localStorage.removeItem(ATTENTE); } catch (e) { /* stockage indisponible */ } };

  /** Envoie les séances restées sur le téléphone ; renvoie l'identifiant de la dernière envoyée. */
  async function envoyerAttente() {
    let derniere = null;
    for (const s of lireAttente()) {
      try { await api('POST', '/api/seances', s); derniere = s.id; ecrireAttente(lireAttente().filter(x => x.id !== s.id)); }
      catch (e) { if (e.statut && e.statut < 500) ecrireAttente(lireAttente().filter(x => x.id !== s.id)); else break; }
    }
    return derniere;
  }

  /* ---------- Voix (synthèse vocale du téléphone, aucun service externe) ---------- */
  const voix = { active: true, langue: 'fr-FR' };
  function dire(texte) {
    if (!voix.active || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = voix.langue; u.rate = 1;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.replace('_', '-').toLowerCase().startsWith(voix.langue.slice(0, 2).toLowerCase()));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  const annonce = e => e.type === 'echauffement' ? `Échauffement : marchez d’un pas vif pendant ${dureeParlee(e.duree_s)}.`
    : e.type === 'retour' ? `Bravo ! Retour au calme : marchez ${dureeParlee(e.duree_s)}.`
    : e.type === 'course' ? `Courez ${dureeParlee(e.duree_s)}.` : `Marchez ${dureeParlee(e.duree_s)}.`;
  const LIBELLES = { echauffement: 'Échauffement', course: 'Courez', marche: 'Marchez', retour: 'Retour au calme' };

  /* ---------- Écran toujours allumé pendant la séance ---------- */
  let verrou = null;
  async function garderAllume(oui) {
    try {
      if (oui && 'wakeLock' in navigator && !verrou && document.visibilityState === 'visible') { verrou = await navigator.wakeLock.request('screen'); verrou.addEventListener('release', () => { verrou = null; }); }
      if (!oui && verrou) { await verrou.release(); verrou = null; }
    } catch (e) { verrou = null; }
  }
  document.addEventListener('visibilitychange', () => { if (encours && !encours.pause) garderAllume(true); });

  /* ---------- Séance en cours (gardée en mémoire si on change d'écran) ---------- */
  let encours = null;
  let minuteur = null;

  function demarrerSeance(etat) {
    const x = etat.prochaine;
    const etapes = [{ type: 'echauffement', duree_s: x.echauffement_s || 0 }].concat(x.blocs || [], [{ type: 'retour', duree_s: x.retour_calme_s || 0 }]).filter(e => e.duree_s > 0);
    let t = 0;
    etapes.forEach(e => { e.debut = t; t += e.duree_s; });
    encours = { semaine: x.semaine, numero: x.numero, etapes, total: t, debut_le: new Date().toISOString(), ecoule: 0, depuis: Date.now(), pause: false, index: -1, mi: false };
    voix.active = etat.profil.voix; voix.langue = etat.voix_langue || 'fr-FR';
    garderAllume(true);
    clearInterval(minuteur); minuteur = setInterval(tic, 250);
    tic();
  }
  const ecoule = () => encours.ecoule + (encours.pause ? 0 : (Date.now() - encours.depuis) / 1000);

  function tic() {
    if (!encours) return;
    const t = ecoule();
    if (t >= encours.total) { finir(true); return; }
    const i = encours.etapes.findIndex(e => t < e.debut + e.duree_s);
    if (i !== encours.index) { encours.index = i; dire(annonce(encours.etapes[i])); }
    if (!encours.mi && t >= encours.total / 2) { encours.mi = true; if (encours.etapes[i].duree_s > 20) setTimeout(() => dire('Vous êtes à la moitié de la séance.'), 2500); }
    afficherSeance();
  }

  function afficherSeance() {
    const zone = $('#seance-direct');
    if (!zone || !encours) return;
    const t = ecoule(), e = encours.etapes[encours.index] || encours.etapes[0];
    const reste = e.debut + e.duree_s - t;
    const suivante = encours.etapes[encours.index + 1];
    $('#etape-libelle').textContent = LIBELLES[e.type];
    $('#etape-reste').textContent = chrono(reste);
    $('#etape-suivante').textContent = suivante ? `Ensuite : ${LIBELLES[suivante.type].toLowerCase()} ${duree(suivante.duree_s)}` : 'Dernière étape';
    $('#seance-ecoule').textContent = `${chrono(t)} / ${chrono(encours.total)}`;
    $('#seance-pause').textContent = encours.pause ? 'Reprendre' : 'Pause';
    zone.querySelectorAll('.etapes span').forEach((s, k) => s.classList.toggle('faite', k <= encours.index));
  }

  function basculerPause() {
    if (!encours) return;
    if (encours.pause) { encours.depuis = Date.now(); encours.pause = false; garderAllume(true); dire('On reprend.'); }
    else { encours.ecoule = ecoule(); encours.pause = true; garderAllume(false); dire('Pause.'); }
    afficherSeance();
  }

  async function finir(terminee) {
    if (!encours) return;
    const s = encours;
    clearInterval(minuteur); minuteur = null; encours = null;
    garderAllume(false);
    dire(terminee ? 'Séance terminée. Bravo !' : 'Séance arrêtée.');
    const seance = { id: uuid(), semaine: s.semaine, numero: s.numero, debut_le: s.debut_le, duree_s: Math.round(Math.min(s.total, s.ecoule + (s.pause ? 0 : (Date.now() - s.depuis) / 1000))), terminee };
    ecrireAttente(lireAttente().concat([seance]));
    await envoyerAttente();
    if (lireAttente().some(x => x.id === seance.id)) { toast('Pas de réseau : la séance est gardée sur le téléphone et sera envoyée plus tard.', true); aller('#/plan'); }
    else aller('#/fin/' + seance.id);
  }

  /* ---------- Mon plan ---------- */
  ecran('#/plan', { titre: 'Mon plan', onglet: 'Plan' }, async vue => {
    const envoyee = await envoyerAttente().catch(() => null);
    const etat = await api('GET', '/api/plan');
    const { plan, profil } = etat;
    const semaine = (plan.semaines || []).find(s => s.semaine === profil.semaine) || { seances: [] };
    const nbSemaines = (plan.semaines || []).length;
    const aNoter = envoyee ? { id: envoyee } : etat.a_noter;
    const enAttente = lireAttente().length;
    vue.innerHTML = `<h1>${esc(plan.nom)}</h1>
      ${enAttente ? `<p class="carte doux">${esc(fr.pluriel(enAttente, 'séance gardée', 'séances gardées'))} sur le téléphone, en attente de réseau.</p>` : ''}
      ${!profil.sante_acceptee_le ? `<div class="carte carte-relief"><span class="pastille pastille-alerte">Avant de commencer</span><h2>Votre santé d’abord</h2>
        <p>${esc(etat.avertissement_sante)}</p><div class="actions"><button class="btn" type="button" id="accepter">J’ai lu, je commence</button></div></div>` : ''}
      ${aNoter && profil.sante_acceptee_le ? `<div class="carte carte-relief"><h2>Comment s’est passée votre séance ?</h2><p class="doux">Votre réponse adapte la séance suivante.</p>
        <div class="actions"><a class="btn" href="#/fin/${esc(aNoter.id)}">Donner mon ressenti</a></div></div>` : ''}
      ${etat.termine ? `<div class="carte carte-relief"><span class="pastille pastille-succes">Plan terminé</span><h2>Bravo, vous courez 30 minutes sans vous arrêter !</h2>
        <p class="doux">Vous pouvez refaire le plan, ou continuer à courir à votre rythme. Le plan 5-10 km arrive bientôt.</p>
        <div class="actions"><button class="btn btn-secondaire" type="button" id="recommencer">Recommencer le plan</button></div></div>` : ''}
      <div class="carte"><div class="ligne"><h2 class="pousse">Semaine ${esc(profil.semaine)}</h2><span class="doux">sur ${esc(nbSemaines)}</span></div>
        <div class="etapes" aria-hidden="true">${(plan.semaines || []).map(s => `<span${s.semaine < profil.semaine || etat.termine ? ' class="faite"' : ''}></span>`).join('')}</div>
        <ul class="liste">${semaine.seances.map(x => {
          const faite = etat.faites.includes(x.numero) && x.numero < profil.seance || etat.termine;
          const prochaine = !etat.termine && x.numero === profil.seance;
          return `<li class="ligne"><span class="pousse"><strong>Séance ${esc(x.numero)}</strong><br><span class="doux">${esc(resume(x))} · ${esc(duree(totalSeance(x)))} en tout</span></span>
            ${faite ? '<span class="pastille pastille-succes">Faite</span>' : prochaine ? '<span class="pastille pastille-offre">À faire</span>' : '<span class="pastille">À venir</span>'}</li>`;
        }).join('')}</ul>
        ${etat.prochaine ? `<div class="actions"><a class="btn" href="#/seance" id="demarrer"${profil.sante_acceptee_le ? '' : ' aria-disabled="true"'}>${encours ? 'Revenir à la séance en cours' : `Démarrer la séance ${esc(etat.prochaine.numero)}`}</a></div>` : ''}
      </div>
      <p class="doux">${esc(plan.description)}</p>`;
    const accepter = $('#accepter');
    if (accepter) accepter.addEventListener('click', async () => { accepter.disabled = true; try { await api('PUT', '/api/profil', { sante_acceptee: true }); aller('#/plan'); } catch (e) { toast(e.message, true); accepter.disabled = false; } });
    const demarrer = $('#demarrer');
    if (demarrer && !profil.sante_acceptee_le) demarrer.addEventListener('click', ev => { ev.preventDefault(); toast('Lisez et acceptez d’abord l’avertissement santé.', true); });
    const recommencer = $('#recommencer');
    if (recommencer) recommencer.addEventListener('click', async () => { if (!confirm('Recommencer le plan à la semaine 1 ?')) return; await api('POST', '/api/plan/recommencer', {}); toast('Plan remis à la semaine 1.'); aller('#/plan'); });
  });

  /* ---------- Séance en cours (plein écran, sans pub) ---------- */
  ecran('#/seance', { titre: 'Séance en cours', pub: false }, async vue => {
    if (!encours) {
      const etat = await api('GET', '/api/plan');
      if (!etat.profil.sante_acceptee_le || !etat.prochaine) { aller('#/plan'); return; }
      const x = etat.prochaine;
      vue.innerHTML = `<p><a href="#/plan">← Mon plan</a></p><h1>Semaine ${esc(x.semaine)} · séance ${esc(x.numero)}</h1>
        <div class="carte"><h2>${esc(resume(x))}</h2><p class="doux">${esc(duree(totalSeance(x)))} en tout, échauffement et retour au calme compris.</p>
          <ul class="liste">${[{ type: 'echauffement', duree_s: x.echauffement_s }].concat(x.blocs, [{ type: 'retour', duree_s: x.retour_calme_s }]).filter(e => e.duree_s > 0)
            .map(e => `<li class="ligne"><span class="pousse">${esc(LIBELLES[e.type])}</span><span class="doux">${esc(duree(e.duree_s))}</span></li>`).join('')}</ul></div>
        <div class="carte"><h2>Avant de partir</h2><ul class="avantages">${etat.conseils.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>
        <p class="doux">Gardez l’app ouverte pendant la séance : l’écran reste allumé. Votre musique peut jouer en fond, la voix passe par-dessus.</p>
        <div class="actions"><button class="btn" type="button" id="partir">C’est parti</button></div>`;
      $('#partir').addEventListener('click', () => { if ('speechSynthesis' in window && etat.profil.voix) speechSynthesis.speak(new SpeechSynthesisUtterance('')); demarrerSeance(etat); aller('#/seance'); });
      return;
    }
    vue.innerHTML = `<div id="seance-direct" class="centre">
        <div class="etapes" aria-hidden="true">${encours.etapes.map(() => '<span></span>').join('')}</div>
        <div class="carte carte-relief"><p class="doux">Semaine ${esc(encours.semaine)} · séance ${esc(encours.numero)}</p>
          <h1 id="etape-libelle" aria-live="assertive"></h1><p class="prix" id="etape-reste"></p><p class="doux" id="etape-suivante"></p></div>
        <p class="doux">Temps écoulé : <strong id="seance-ecoule"></strong></p>
        <div class="actions"><button class="btn" type="button" id="seance-pause">Pause</button><button class="btn btn-secondaire" type="button" id="seance-arreter">Arrêter</button></div></div>`;
    $('#seance-pause').addEventListener('click', basculerPause);
    $('#seance-arreter').addEventListener('click', () => { if (confirm('Arrêter la séance ? Elle sera enregistrée comme incomplète et vous la referez la prochaine fois.')) finir(false); });
    afficherSeance();
  });

  /* ---------- Fin de séance : ressenti ---------- */
  ecran('#/fin/:id', { titre: 'Fin de séance' }, async (vue, { id }) => {
    const { seance } = await api('GET', `/api/seances/${encodeURIComponent(id)}`);
    vue.innerHTML = `<h1>${seance.terminee ? 'Séance terminée, bravo !' : 'Séance arrêtée'}</h1>
      <div class="carte"><div class="ligne"><span class="pousse">${seance.semaine ? `Semaine ${esc(seance.semaine)} · séance ${esc(seance.numero)}` : 'Sortie libre'}</span><strong>${esc(chrono(seance.duree_s))}</strong></div>
        <p class="doux">${esc(fr.dateHeure(seance.debut_le))}</p></div>
      ${seance.ressenti ? `<div class="carte"><p>Ressenti : <strong>${esc(libelleRessenti(seance.ressenti))}</strong></p><div class="actions"><a class="btn" href="#/plan">Voir mon plan</a></div></div>`
      : `<form class="carte" id="ressenti" novalidate><h2>Comment vous sentez-vous ?</h2>
        <ul class="liste">${RESSENTIS.map(([v, l, d]) => `<li><label class="ligne"><input type="radio" name="ressenti" value="${esc(v)}" required><span class="pousse"><strong>${esc(l)}</strong><br><span class="doux">${esc(d)}</span></span></label></li>`).join('')}</ul>
        <label class="champ"><span>Une note pour vous (facultatif)</span><textarea name="note" maxlength="500" rows="3"></textarea></label>
        <button class="btn" type="submit">Enregistrer</button></form><div id="suite"></div>`}`;
    const form = $('#ressenti');
    if (!form) return;
    formulaire(form, async d => {
      if (!d.ressenti) throw new Error('Choisissez votre ressenti.');
      const etat = await api('PATCH', `/api/seances/${encodeURIComponent(id)}/ressenti`, d);
      form.remove();
      const x = etat.prochaine;
      $('#suite').innerHTML = `<div class="carte carte-relief"><p>${esc(etat.conseil)}</p>
        ${x ? `<p class="doux">Prochaine séance : semaine ${esc(x.semaine)}, séance ${esc(x.numero)} · ${esc(resume(x))}.</p>` : '<p class="doux">Vous avez terminé le plan !</p>'}
        <div class="actions"><a class="btn" href="#/plan">Voir mon plan</a></div></div>`;
    });
  });

  /* ---------- Historique ---------- */
  ecran('#/historique', { titre: 'Historique', onglet: 'Historique' }, async vue => {
    vue.innerHTML = `<h1>Historique</h1><div class="carte" id="records"></div><div class="carte"><ul class="liste" id="liste"></ul></div>
      <div class="actions"><button class="btn btn-secondaire" type="button" id="plus" hidden>Voir plus</button></div>`;
    const records = $('#records');
    if (appli.aPalier('premium')) {
      const { records: r } = await api('GET', '/api/records');
      records.innerHTML = `<div class="ligne"><h2 class="pousse">Mes records</h2><span class="pastille pastille-offre">Premium</span></div>
        <table class="tableau"><tbody>
          <tr><th>Plus longue course sans arrêt</th><td>${r.plus_longue_course_s ? esc(duree(r.plus_longue_course_s)) : '—'}</td></tr>
          <tr><th>Plus longue séance</th><td>${r.plus_longue_seance_s ? esc(duree(r.plus_longue_seance_s)) : '—'}</td></tr>
          <tr><th>Séances terminées</th><td>${esc(fr.nombre(r.terminees))} sur ${esc(fr.nombre(r.seances))}</td></tr>
          <tr><th>Temps total</th><td>${esc(duree(r.duree_totale_s))}</td></tr>
          <tr><th>Séances sur 4 semaines</th><td>${esc(fr.nombre(r.seances_4_semaines))}</td></tr>
          <tr><th>Semaines d’affilée</th><td>${esc(fr.nombre(r.serie_semaines))}</td></tr></tbody></table>`;
    } else {
      records.innerHTML = `<div class="ligne"><h2 class="pousse">Mes records</h2><span class="pastille pastille-offre">Premium</span></div>
        <p class="doux">Plus longue course, temps total, régularité : suivez vos progrès avec Premium.</p>
        <div class="actions"><button class="btn btn-secondaire" type="button" id="voir-records">Voir mes records</button></div>`;
      $('#voir-records').addEventListener('click', () => appli.exiger('premium'));
    }
    let avant = null;
    const charger = async () => {
      const { seances, suite } = await api('GET', '/api/seances' + (avant ? '?avant=' + encodeURIComponent(avant) : ''));
      const liste = $('#liste');
      if (!avant && !seances.length) liste.innerHTML = '<li class="vide">Aucune sortie pour le moment. Votre première séance vous attend dans « Plan ».</li>';
      liste.insertAdjacentHTML('beforeend', seances.map(s => `<li><a href="#/historique/${esc(s.id)}"><div class="ligne"><span class="pousse"><strong>${esc(fr.date(s.debut_le))}</strong><br>
        <span class="doux">${s.semaine ? `Semaine ${esc(s.semaine)} · séance ${esc(s.numero)}` : 'Sortie libre'} · ${esc(duree(s.duree_s))}</span></span>
        ${s.ressenti ? `<span class="pastille">${esc(libelleRessenti(s.ressenti))}</span>` : ''}${s.terminee ? '' : '<span class="pastille pastille-alerte">Arrêtée</span>'}</div></a></li>`).join(''));
      if (seances.length) avant = seances[seances.length - 1].debut_le;
      $('#plus').hidden = !suite;
    };
    $('#plus').addEventListener('click', () => charger().catch(e => toast(e.message, true)));
    await charger();
  });

  /* ---------- Détail d'une sortie (carte avec le suivi GPS, version 2) ---------- */
  ecran('#/historique/:id', { titre: 'Sortie' }, async (vue, { id }) => {
    const { seance: s } = await api('GET', `/api/seances/${encodeURIComponent(id)}`);
    vue.innerHTML = `<p><a href="#/historique">← Historique</a></p><h1>${esc(fr.date(s.debut_le))}</h1>
      <div class="carte"><table class="tableau"><tbody>
        <tr><th>Séance</th><td>${s.semaine ? `${esc(s.plan || '')} · semaine ${esc(s.semaine)}, séance ${esc(s.numero)}` : 'Sortie libre'}</td></tr>
        <tr><th>Début</th><td>${esc(fr.heure(s.debut_le))}</td></tr>
        <tr><th>Durée</th><td>${esc(chrono(s.duree_s))}${s.terminee ? '' : ' (arrêtée avant la fin)'}</td></tr>
        ${s.distance_m != null ? `<tr><th>Distance</th><td>${esc(fr.nombre(s.distance_m / 1000, 2))} km</td></tr>` : ''}
        <tr><th>Ressenti</th><td>${s.ressenti ? esc(libelleRessenti(s.ressenti)) : `<a href="#/fin/${esc(s.id)}">À donner</a>`}</td></tr>
        ${s.note ? `<tr><th>Note</th><td>${esc(s.note)}</td></tr>` : ''}</tbody></table></div>
      ${s.contenu ? `<div class="carte"><h2>Programme</h2><p class="doux">${esc(resume(s.contenu))}</p></div>` : ''}
      <div class="carte"><h2>Carte</h2><p class="doux">Le parcours, la distance et l’allure arriveront avec le suivi GPS de l’app mobile.</p></div>
      <div class="actions"><button class="btn btn-secondaire" type="button" id="retirer">Retirer de l’historique</button></div>`;
    $('#retirer').addEventListener('click', async () => {
      if (!confirm('Retirer cette sortie de votre historique ?')) return;
      try { await api('DELETE', `/api/seances/${encodeURIComponent(id)}`); toast('Sortie retirée.'); aller('#/historique'); } catch (e) { toast(e.message, true); }
    });
  });

  /* ---------- Profil ---------- */
  ecran('#/profil', { titre: 'Profil', onglet: 'Profil' }, async vue => {
    const etat = await api('GET', '/api/plan');
    vue.innerHTML = `<h1>Profil</h1>
      <div class="carte"><h2>${esc(etat.plan.nom)}</h2><p class="doux">${etat.termine ? 'Plan terminé' : `Semaine ${esc(etat.profil.semaine)}, prochaine séance : ${esc(etat.profil.seance)}`}</p>
        <div class="actions"><button class="btn btn-secondaire" type="button" id="recommencer">Recommencer le plan</button></div></div>
      <form class="carte" id="reglages" novalidate><h2>Guidage vocal</h2>
        <label class="ligne"><input type="checkbox" name="voix" value="1"${etat.profil.voix ? ' checked' : ''}><span class="pousse">Annoncer chaque changement à voix haute, par exemple « Courez 90 secondes ».</span></label>
        <div class="actions"><button class="btn" type="submit">Enregistrer</button><button class="btn btn-secondaire" type="button" id="essai">Tester la voix</button></div></form>
      <details class="carte"><summary>Avertissement santé</summary><p>${esc(etat.avertissement_sante)}</p>
        ${etat.profil.sante_acceptee_le ? `<p class="doux">Accepté le ${esc(fr.date(etat.profil.sante_acceptee_le))}.</p>` : ''}</details>
      <div class="actions"><a class="btn btn-secondaire" href="#/compte">Mon compte</a><a class="btn btn-secondaire" href="#/abonnement">Abonnement</a></div>`;
    formulaire($('#reglages'), async d => { await api('PUT', '/api/profil', { voix: d.voix === '1' }); toast('Réglage enregistré.'); });
    $('#essai').addEventListener('click', () => { const avant = voix.active; voix.active = true; voix.langue = etat.voix_langue || 'fr-FR'; dire('Courez 90 secondes.'); voix.active = avant; });
    $('#recommencer').addEventListener('click', async () => {
      if (!confirm('Recommencer le plan à la semaine 1 ? Votre historique est conservé.')) return;
      try { await api('POST', '/api/plan/recommencer', {}); toast('Plan remis à la semaine 1.'); aller('#/plan'); } catch (e) { toast(e.message, true); }
    });
  });

  ecran('#/compte', { titre: 'Mon compte', onglet: 'Compte' }, null);   // onglet vers l'écran du socle
})();
