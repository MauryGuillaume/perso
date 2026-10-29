/* app-ecrans.js — écrans de Garanto. Kit « App complète » : KIT.md § 8.
   Règles : toute donnée venue de la base passe par esc() avant innerHTML ; dates et montants par fr.* (affichage.js) ;
   chaque formulaire par appli.formulaire (erreurs du serveur affichées en français). */
'use strict';
(function () {
  const { api, esc, toast, formulaire, ecran, aller } = window.appli;

  // Page servie sans le serveur de l'app (aperçu statique, fichier ouvert) : l'API renvoie la page au lieu de JSON.
  // Le socle resterait sur « Chargement… » : on explique plutôt quoi lancer.
  document.addEventListener('DOMContentLoaded', async () => {
    let ok = false;
    try { const r = await fetch('/api/sante', { headers: { Accept: 'application/json' } }); ok = /json/.test(r.headers.get('content-type') || ''); } catch (e) { ok = false; }
    if (ok) return;
    const vue = document.getElementById('vue');
    vue.innerHTML = `<div class="carte centre"><h1>Serveur de Garanto absent</h1>
      <p>Cette page a besoin de son serveur Node.js et de sa base PostgreSQL : un aperçu des seuls fichiers de <span class="code">public/</span> ne suffit pas.</p>
      <p>Sur ta machine, dans le dossier de l’app : <span class="code">npm install</span>, copie <span class="code">.env.example</span> en <span class="code">.env</span>
      (avec <span class="code">DATABASE_URL</span> et <span class="code">DB_CREER_BASE=1</span>), puis <span class="code">npm start</span> et ouvre <span class="code">http://localhost:3000</span>.</p></div>`;
  });
  const $ = (s, racine) => (racine || document).querySelector(s);
  const LARGEUR_MAX = 2000;   // images réduites avant l'envoi
  const TYPES = { ticket: 'Ticket de caisse', garantie: 'Bon de garantie' };
  const FORMATS = 'application/pdf,image/jpeg,image/png';
  const MO = 1024 * 1024;

  let limites = null;   // réglages utiles à l'écran (taille max, fichiers par achat…)
  const chargerLimites = async () => (limites = limites || await api('GET', '/api/compte'));

  /* ---------- Outils d'affichage ---------- */
  function etat(a) {
    const j = Number(a.jours_restants);
    if (j < 0) return { classe: 'pastille-expiree', texte: 'Expirée' };
    if (j <= 30) return { classe: 'pastille-bientot', texte: j === 0 ? 'Expire aujourd’hui' : 'Expire bientôt' };
    return { classe: 'pastille-ok', texte: 'Garanti' };
  }
  const pastille = a => { const e = etat(a); return `<span class="pastille ${esc(e.classe)}">${esc(e.texte)}</span>`; };
  const duree = m => Number(m) % 12 === 0 && Number(m) > 0 ? fr.pluriel(Number(m) / 12, 'an') : fr.pluriel(Number(m), 'mois', 'mois');
  const finCalculee = (date, legale, commerciale) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
    const [a, m, j] = date.split('-').map(Number);
    const n = Math.max(Number(legale) || 0, Number(commerciale) || 0);
    const d = new Date(Date.UTC(a, m - 1 + n, 1));
    const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();   // 31 janvier + 1 mois = 28/29 février, comme PostgreSQL
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(j, dernier)).padStart(2, '0')}`;
  };
  const icone = mime => mime === 'application/pdf' ? 'PDF' : mime === 'image/png' ? 'PNG' : 'JPG';

  /* ---------- Fichiers : réduction des images, lecture en base64 ---------- */
  async function reduire(f) {
    if (!/^image\/(jpeg|png)$/.test(f.type) && !/\.(jpe?g|png)$/i.test(f.name)) return f;
    let img;
    try { img = await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (e) { throw new Error('Image illisible : ' + f.name); }
    const echelle = Math.min(1, LARGEUR_MAX / img.width);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * echelle); c.height = Math.round(img.height * echelle);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);   // fond blanc pour les PNG transparents
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.8));
    if (!blob) throw new Error('Image illisible : ' + f.name);
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  const base64 = f => new Promise((ok, ko) => {
    const l = new FileReader();
    l.onload = () => ok(String(l.result).split(',')[1] || '');
    l.onerror = () => ko(new Error('Lecture impossible : ' + f.name));
    l.readAsDataURL(f);
  });
  async function envoyerFichier(achatId, f, type) {
    const pret = await reduire(f);
    if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(pret.type)) throw new Error(f.name + ' : seuls les PDF, JPEG et PNG sont acceptés.');
    if (pret.size > limites.taille_max_mo * MO) throw new Error(f.name + ' : ' + limites.taille_max_mo + ' Mo maximum.');
    return api('POST', `/api/achats/${encodeURIComponent(achatId)}/justificatifs`, { type, nom: pret.name, donnees: await base64(pret) });
  }

  /** Boutons « Prendre une photo » et « Choisir un fichier » ; appelle ajout(fichiers) à chaque choix. */
  const boutonsFichiers = (prefixe) => `<div class="actions">
      <label class="btn">Prendre une photo<input type="file" accept="image/*" capture="environment" id="${prefixe}-photo" hidden></label>
      <label class="btn btn-secondaire">Choisir un fichier<input type="file" accept="${FORMATS}" multiple id="${prefixe}-fichier" hidden></label></div>
    <p class="doux">PDF, JPEG ou PNG. Les photos sont réduites avant l’envoi.</p>`;
  function brancherFichiers(prefixe, ajout) {
    for (const id of [prefixe + '-photo', prefixe + '-fichier']) {
      const input = document.getElementById(id);
      input.addEventListener('change', () => { if (input.files.length) ajout([...input.files]); input.value = ''; });
    }
  }
  const choixType = (nom, valeur) => `<select name="${esc(nom)}" aria-label="Type de justificatif">${Object.entries(TYPES).map(([k, v]) =>
    `<option value="${esc(k)}"${k === valeur ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;

  /* ---------- Formulaire d'un achat (ajout et modification) ---------- */
  function champsAchat(a) {
    a = a || {};
    return `<label class="champ"><span>Produit *</span><input name="produit" required maxlength="160" value="${esc(a.produit)}" placeholder="Ex. lave-linge Bosch Série 6"></label>
      <label class="champ"><span>Magasin</span><input name="magasin" maxlength="120" value="${esc(a.magasin)}" placeholder="Ex. Darty, Fnac, Amazon"></label>
      <label class="champ"><span>Date d’achat *</span><input name="date_achat" type="date" required max="${esc(fr.dateIso())}" value="${esc(a.date_achat)}"></label>
      <label class="champ"><span>Montant TTC (€)</span><input name="montant" inputmode="decimal" value="${esc(a.montant == null ? '' : String(a.montant).replace('.', ','))}" placeholder="Ex. 499,90"></label>
      <div class="ligne">
        <label class="champ pousse"><span>Garantie légale (mois)</span><input name="garantie_legale_mois" type="number" min="0" max="120" value="${esc(a.garantie_legale_mois == null ? 24 : a.garantie_legale_mois)}"></label>
        <label class="champ pousse"><span>Garantie commerciale (mois)</span><input name="garantie_commerciale_mois" type="number" min="0" max="240" value="${esc(a.garantie_commerciale_mois == null ? 0 : a.garantie_commerciale_mois)}"></label>
      </div>
      <p class="doux" id="fin-calculee"></p>
      <label class="champ"><span>Note</span><textarea name="note" rows="3" maxlength="2000" placeholder="Numéro de série, remarques…">${esc(a.note)}</textarea></label>`;
  }
  function brancherFin(form) {
    const maj = () => {
      const fin = finCalculee(form.date_achat.value, form.garantie_legale_mois.value, form.garantie_commerciale_mois.value);
      $('#fin-calculee', form).textContent = fin ? `Fin de garantie : ${fr.date(fin, 'long')}` : 'La fin de garantie se calcule dès que la date d’achat est saisie.';
    };
    form.addEventListener('input', maj); maj();
  }
  function lireFormAchat(d) {
    if (d.montant !== '' && d.montant != null) { const m = fr.lireMontant(d.montant); if (m === null) throw new Error('Montant illisible (ex. 499,90).'); d.montant = m; }
    return d;
  }

  /* ---------- Mes achats ---------- */
  let filtre = '', recherche = '';
  ecran('#/achats', { titre: 'Mes achats', onglet: 'Mes achats' }, async vue => {
    vue.innerHTML = `<h1>Mes achats</h1>
      <label class="champ"><span>Rechercher</span><input id="q" type="search" placeholder="Produit ou magasin" value="${esc(recherche)}"></label>
      <div class="actions filtres" role="group" aria-label="Filtrer">${[['', 'Tous'], ['ticket', 'Tickets'], ['garantie', 'Garanties']].map(([v, l]) =>
        `<button type="button" class="btn btn-secondaire" data-filtre="${esc(v)}" aria-pressed="${v === filtre}">${esc(l)}</button>`).join('')}</div>
      <ul class="liste carte" id="liste"></ul>`;
    const charger = async () => {
      const { achats } = await api('GET', `/api/achats?q=${encodeURIComponent(recherche)}&type=${encodeURIComponent(filtre)}`);
      $('#liste').innerHTML = achats.length ? achats.map(a => `<li><a href="#/achats/${esc(a.id)}"><div class="ligne"><span class="pousse"><strong>${esc(a.produit)}</strong><br>
          <span class="doux">${esc([a.magasin, 'fin de garantie le ' + fr.date(a.fin_garantie)].filter(Boolean).join(' · '))}</span><br>
          <span class="doux">${esc(a.types.map(t => TYPES[t]).join(' + ') || 'Aucun justificatif')}</span></span>${pastille(a)}</div></a></li>`).join('')
        : (recherche || filtre ? '<li class="vide">Aucun achat ne correspond.</li>' : '<li class="vide">Aucun achat pour l’instant.<br><a class="btn" href="#/ajouter">Ajouter mon premier ticket</a></li>');
    };
    let attente;
    $('#q').addEventListener('input', e => { recherche = e.target.value; clearTimeout(attente); attente = setTimeout(() => charger().catch(err => toast(err.message, true)), 250); });
    vue.querySelectorAll('[data-filtre]').forEach(b => b.addEventListener('click', () => {
      filtre = b.dataset.filtre;
      vue.querySelectorAll('[data-filtre]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      charger().catch(err => toast(err.message, true));
    }));
    await charger();
  });

  /* ---------- Ajouter ---------- */
  ecran('#/ajouter', { titre: 'Ajouter', onglet: 'Ajouter' }, async vue => {
    await chargerLimites();
    const choisis = [];   // { fichier, type }
    vue.innerHTML = `<h1>Ajouter un achat</h1>
      <div class="carte"><h2>1. Le justificatif</h2>
        <label class="champ"><span>C’est un…</span>${choixType('type-defaut', 'ticket')}</label>
        ${boutonsFichiers('ajout')}<ul class="liste" id="choisis"></ul></div>
      <form class="carte" id="achat" novalidate><h2>2. L’achat</h2>${champsAchat()}
        <div class="actions"><button class="btn" type="submit">Enregistrer</button></div></form>`;
    const lister = () => {
      $('#choisis').innerHTML = choisis.map((c, i) => `<li class="ligne"><span class="pousse">${esc(c.fichier.name)}<br><span class="doux">${esc(fr.taille(c.fichier.size))}</span></span>
        ${choixType('type-' + i, c.type)}<button type="button" class="btn btn-secondaire" data-retirer="${esc(i)}">Retirer</button></li>`).join('');
      $('#choisis').querySelectorAll('select').forEach((s, i) => s.addEventListener('change', () => { choisis[i].type = s.value; }));
      $('#choisis').querySelectorAll('[data-retirer]').forEach(b => b.addEventListener('click', () => { choisis.splice(Number(b.dataset.retirer), 1); lister(); }));
    };
    brancherFichiers('ajout', fichiers => {
      for (const f of fichiers) {
        if (choisis.length >= limites.fichiers_par_achat) { toast(limites.fichiers_par_achat + ' fichiers maximum par achat.', true); break; }
        choisis.push({ fichier: f, type: $('[name="type-defaut"]').value });
      }
      lister();
    });
    const form = $('#achat');
    brancherFin(form);
    formulaire(form, async d => {
      if (!choisis.length) throw new Error('Ajoute au moins une photo ou un fichier : ticket de caisse ou bon de garantie.');
      const { achat } = await api('POST', '/api/achats', lireFormAchat(d));
      const echecs = [];
      for (const c of choisis) { try { await envoyerFichier(achat.id, c.fichier, c.type); } catch (e) { echecs.push(e.message); } }
      if (echecs.length) toast(`Achat enregistré, mais ${echecs.join(' ; ')}`, true); else toast('Achat enregistré.');
      aller(`#/achats/${encodeURIComponent(achat.id)}`);
    });
  });

  /* ---------- Fiche achat ---------- */
  let apercus = [];
  window.addEventListener('hashchange', () => { apercus.forEach(u => URL.revokeObjectURL(u)); apercus = []; });

  ecran('#/achats/:id', { titre: 'Achat' }, async (vue, { id }) => {
    await chargerLimites();
    const { achat: a, justificatifs, envois } = await api('GET', `/api/achats/${encodeURIComponent(id)}`);
    const lien = j => `/api/justificatifs/${encodeURIComponent(j.id)}/fichier`;
    vue.innerHTML = `<p><a href="#/achats">← Mes achats</a></p>
      <div class="ligne"><h1 class="pousse">${esc(a.produit)}</h1>${pastille(a)}</div>
      <div class="carte"><ul class="liste">
        ${a.magasin ? `<li class="ligne"><span class="pousse doux">Magasin</span><span>${esc(a.magasin)}</span></li>` : ''}
        <li class="ligne"><span class="pousse doux">Date d’achat</span><span>${esc(fr.date(a.date_achat, 'long'))}</span></li>
        ${a.montant != null ? `<li class="ligne"><span class="pousse doux">Montant</span><span>${esc(fr.prix(a.montant))}</span></li>` : ''}
        <li class="ligne"><span class="pousse doux">Garantie légale</span><span>${esc(duree(a.garantie_legale_mois))}</span></li>
        <li class="ligne"><span class="pousse doux">Garantie commerciale</span><span>${esc(Number(a.garantie_commerciale_mois) ? duree(a.garantie_commerciale_mois) : 'aucune')}</span></li>
        <li class="ligne"><span class="pousse doux">Fin de garantie</span><strong>${esc(fr.date(a.fin_garantie, 'long'))}</strong></li>
      </ul>${a.note ? `<p class="note">${esc(a.note)}</p>` : ''}</div>
      <div class="carte"><h2>Justificatifs</h2>
        <ul class="liste">${justificatifs.length ? justificatifs.map(j => `<li><div class="ligne">
          ${/^image\//.test(j.type_mime) ? `<img class="vignette" data-apercu="${esc(lien(j))}" alt="Aperçu de ${esc(j.nom_origine)}" width="64" height="64">` : `<span class="vignette vignette-doc" aria-hidden="true">${esc(icone(j.type_mime))}</span>`}
          <span class="pousse nom-fichier">${esc(j.nom_origine)}<br><span class="doux">${esc(TYPES[j.type])} · ${esc(fr.taille(j.taille_octets))}</span></span></div>
          <div class="actions"><a class="btn btn-secondaire" href="${esc(lien(j))}" download="${esc(j.nom_origine)}">Télécharger</a>
          <button type="button" class="btn btn-secondaire" data-supprimer-fichier="${esc(j.id)}" aria-label="Retirer ${esc(j.nom_origine)}">Retirer</button></div></li>`).join('')
          : '<li class="vide">Aucun justificatif.</li>'}</ul>
        ${justificatifs.length < limites.fichiers_par_achat ? `<h3>Ajouter un justificatif</h3><label class="champ"><span>C’est un…</span>${choixType('type-ajout', 'ticket')}</label>${boutonsFichiers('fiche')}` : ''}
      </div>
      <div class="actions">
        <a class="btn" href="#/achats/${esc(a.id)}/envoyer">Envoyer par e-mail</a>
        <a class="btn btn-secondaire" href="#/achats/${esc(a.id)}/modifier">Modifier</a>
        <button type="button" class="btn btn-danger" id="supprimer">Supprimer</button></div>
      ${envois.length ? `<div class="carte"><h2>Derniers envois</h2><ul class="liste">${envois.map(e => `<li class="ligne"><span class="pousse">${esc(e.destinataire)}<br>
        <span class="doux">${esc(fr.dateHeure(e.envoye_le))} · ${esc(fr.pluriel(e.nb_pieces, 'pièce jointe', 'pièces jointes'))}</span></span>
        <span class="pastille">${esc({ envoye: 'Envoyé', echec: 'Échec', en_cours: 'En cours' }[e.statut])}</span></li>`).join('')}</ul></div>` : ''}`;

    // Aperçu des images : récupérées par l'API puis affichées depuis la mémoire (jamais ouvertes en ligne par le serveur)
    vue.querySelectorAll('[data-apercu]').forEach(async img => {
      try {
        const r = await fetch(img.dataset.apercu, { credentials: 'same-origin' });
        if (!r.ok) return;
        const u = URL.createObjectURL(await r.blob()); apercus.push(u); img.src = u;
      } catch (e) { /* l'aperçu est facultatif */ }
    });
    vue.querySelectorAll('[data-supprimer-fichier]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Retirer ce justificatif ? Le fichier sera supprimé.')) return;
      try { await api('DELETE', `/api/justificatifs/${encodeURIComponent(b.dataset.supprimerFichier)}`); toast('Justificatif retiré.'); aller(location.hash); }
      catch (e) { toast(e.message, true); }
    }));
    if ($('#fiche-photo')) brancherFichiers('fiche', async fichiers => {
      try {
        for (const f of fichiers.slice(0, limites.fichiers_par_achat - justificatifs.length)) await envoyerFichier(a.id, f, $('[name="type-ajout"]').value);
        toast('Justificatif ajouté.');
      } catch (e) { toast(e.message, true); }
      aller(location.hash);
    });
    $('#supprimer').addEventListener('click', async () => {
      if (!confirm('Supprimer « ' + a.produit + ' » et tous ses justificatifs ? C’est définitif.')) return;
      try { await api('DELETE', `/api/achats/${encodeURIComponent(a.id)}`); toast('Achat supprimé.'); aller('#/achats'); }
      catch (e) { toast(e.message, true); }
    });
  });

  /* ---------- Modifier ---------- */
  ecran('#/achats/:id/modifier', { titre: 'Modifier' }, async (vue, { id }) => {
    const { achat } = await api('GET', `/api/achats/${encodeURIComponent(id)}`);
    vue.innerHTML = `<p><a href="#/achats/${esc(achat.id)}">← Retour</a></p><h1>Modifier l’achat</h1>
      <form class="carte" novalidate>${champsAchat(achat)}<div class="actions"><button class="btn" type="submit">Enregistrer</button>
      <a class="btn btn-secondaire" href="#/achats/${esc(achat.id)}">Annuler</a></div></form>`;
    const form = $('form', vue);
    brancherFin(form);
    formulaire(form, async d => {
      await api('PUT', `/api/achats/${encodeURIComponent(achat.id)}`, lireFormAchat(d));
      toast('Achat modifié.'); aller(`#/achats/${encodeURIComponent(achat.id)}`);
    });
  });

  /* ---------- Envoyer par e-mail ---------- */
  ecran('#/achats/:id/envoyer', { titre: 'Envoyer par e-mail' }, async (vue, { id }) => {
    const [{ achat: a, justificatifs }, compte] = await Promise.all([api('GET', `/api/achats/${encodeURIComponent(id)}`), api('GET', '/api/compte')]);
    const objet = 'Justificatif d’achat : ' + a.produit + ' (' + fr.date(a.date_achat) + ')';
    const message = 'Bonjour,\n\nVeuillez trouver ci-joint le justificatif d’achat de « ' + a.produit + ' », acheté le ' + fr.date(a.date_achat, 'long') +
      (a.magasin ? ' chez ' + a.magasin : '') + (a.montant != null ? ' pour ' + fr.prix(a.montant) : '') +
      '.\nLa garantie court jusqu’au ' + fr.date(a.fin_garantie, 'long') + '.\n\nCordialement';
    const moi = /@/.test(compte.email) ? compte.email : '';
    vue.innerHTML = `<p><a href="#/achats/${esc(a.id)}">← Retour</a></p><h1>Envoyer par e-mail</h1>
      <form class="carte" id="redaction" novalidate>
        <label class="champ"><span>Destinataire (une seule adresse)</span><input name="destinataire" type="email" required maxlength="200" value="${esc(moi)}" placeholder="sav@exemple.fr"></label>
        ${moi ? `<p class="doux">Pré-rempli avec ton adresse : remplace-la par celle du SAV ou de ton assurance.</p>` : ''}
        <label class="champ"><span>Objet</span><input name="objet" required maxlength="200" value="${esc(objet)}"></label>
        <label class="champ"><span>Message</span><textarea name="message" rows="8" maxlength="5000">${esc(message)}</textarea></label>
        <fieldset class="champ"><legend>Pièces jointes</legend>${justificatifs.length ? justificatifs.map(j => `<label class="case"><input type="checkbox" name="piece" value="${esc(j.id)}" data-taille="${esc(j.taille_octets)}" checked>
          ${esc(j.nom_origine)} <span class="doux">(${esc(TYPES[j.type])}, ${esc(fr.taille(j.taille_octets))})</span></label>`).join('') : '<p class="doux">Aucun justificatif à joindre.</p>'}</fieldset>
        <p class="doux">Il te reste ${esc(fr.pluriel(compte.envois_restants, 'envoi'))} aujourd’hui. Les réponses arriveront sur ton adresse.</p>
        <div class="actions"><button class="btn" type="submit">Vérifier avant l’envoi</button></div></form>
      <div class="carte" id="recap" hidden></div>`;
    const form = $('#redaction');
    formulaire(form, async d => {
      const pieces = [...form.querySelectorAll('[name="piece"]:checked')];
      const total = pieces.reduce((s, p) => s + Number(p.dataset.taille), 0);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.destinataire.trim())) throw new Error('Adresse du destinataire invalide.');
      if (!d.objet.trim()) throw new Error('L’objet est obligatoire.');
      if (total > compte.envoi_taille_max_mo * MO) throw new Error('Pièces jointes trop lourdes : ' + compte.envoi_taille_max_mo + ' Mo au total maximum.');
      const corps = { destinataire: d.destinataire.trim(), objet: d.objet.trim(), message: d.message, pieces: pieces.map(p => p.value) };
      const recap = $('#recap');
      form.hidden = true; recap.hidden = false;
      recap.innerHTML = `<h2>Récapitulatif</h2><ul class="liste">
          <li class="ligne"><span class="pousse doux">À</span><strong>${esc(corps.destinataire)}</strong></li>
          <li class="ligne"><span class="pousse doux">Objet</span><span>${esc(corps.objet)}</span></li>
          <li class="ligne"><span class="pousse doux">Pièces jointes</span><span>${esc(fr.pluriel(pieces.length, 'fichier'))}${pieces.length ? ' · ' + esc(fr.taille(total)) : ''}</span></li></ul>
        <p class="note">${esc(corps.message)}</p>
        <div class="actions"><button type="button" class="btn" id="envoyer">Envoyer</button><button type="button" class="btn btn-secondaire" id="corriger">Corriger</button></div>`;
      $('#corriger').addEventListener('click', () => { recap.hidden = true; form.hidden = false; });
      $('#envoyer').addEventListener('click', async ev => {
        ev.target.disabled = true;
        try { await api('POST', `/api/achats/${encodeURIComponent(a.id)}/envoyer`, corps); limites = null; toast('E-mail envoyé.'); aller(`#/achats/${encodeURIComponent(a.id)}`); }
        catch (e) { toast(e.message, true); ev.target.disabled = false; }
      });
    });
  });

  /* ---------- Mon compte ---------- */
  ecran('#/mon-compte', { titre: 'Mon compte', onglet: 'Compte' }, async vue => {
    const c = limites = await api('GET', '/api/compte');
    vue.innerHTML = `<h1>Mon compte</h1>
      <form class="carte" id="email" novalidate><h2>Adresse e-mail</h2>
        <label class="champ"><span>E-mail</span><input name="email" type="email" required autocomplete="email" value="${esc(c.email)}"></label>
        <label class="champ"><span>Mot de passe actuel (pour confirmer)</span><input name="mdp" type="password" required autocomplete="current-password"></label>
        <div class="actions"><button class="btn" type="submit">Changer d’e-mail</button></div></form>
      <div class="carte"><h2>Mot de passe</h2><div class="actions"><a class="btn btn-secondaire" href="#/mot-de-passe">Changer de mot de passe</a>
        <a class="btn btn-secondaire" href="#/compte">Se déconnecter…</a></div></div>
      <div class="carte"><h2>Rappels</h2>
        <label class="case"><input type="checkbox" id="rappels"${c.rappels_actifs ? ' checked' : ''}> M’envoyer un e-mail ${esc(fr.pluriel(c.rappel_jours_avant, 'jour'))} avant la fin d’une garantie</label></div>
      <div class="carte"><h2>Mes données</h2><p class="doux">Tous tes achats, justificatifs (fichiers compris) et envois, dans un fichier JSON.</p>
        <div class="actions"><a class="btn btn-secondaire" href="/api/compte/export" download>Exporter mes données</a></div></div>
      <form class="carte" id="suppression" novalidate><h2>Supprimer mon compte</h2>
        <p>Ton compte, tes achats et tous tes fichiers seront effacés définitivement.</p>
        <label class="champ"><span>Mot de passe</span><input name="mdp" type="password" required autocomplete="current-password"></label>
        <label class="case"><input type="checkbox" name="confirmer" value="1"> Je comprends que c’est définitif</label>
        <div class="actions"><button class="btn btn-danger" type="submit">Supprimer mon compte</button></div></form>
      <p class="doux">Les fichiers sont conservés jusqu’à ce que tu les supprimes. Sans connexion pendant ${esc(fr.pluriel(3, 'an'))}, un e-mail te prévient, puis le compte est supprimé 30 jours plus tard.</p>`;
    formulaire($('#email'), async (d, form) => {
      const r = await api('PUT', '/api/compte/email', d);
      if (window.appli.utilisateur) window.appli.utilisateur.email = r.email;
      form.mdp.value = ''; toast('Adresse e-mail changée.');
    });
    $('#rappels').addEventListener('change', async e => {
      try { await api('PUT', '/api/compte/preferences', { rappels_actifs: e.target.checked }); toast(e.target.checked ? 'Rappels activés.' : 'Rappels coupés.'); }
      catch (err) { e.target.checked = !e.target.checked; toast(err.message, true); }
    });
    formulaire($('#suppression'), async d => {
      if (!d.confirmer) throw new Error('Coche la case pour confirmer.');
      await api('POST', '/api/compte/supprimer', { mdp: d.mdp });
      location.hash = '#/connexion'; location.reload();
    });
  });
})();
