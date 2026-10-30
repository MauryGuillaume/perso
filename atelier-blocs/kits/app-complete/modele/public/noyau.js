/* noyau.js — socle du front : appels à l'API, session, écrans de compte, routeur, admin de dépannage.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier. Les écrans de l'app vont dans app-ecrans.js.

   API pour app-ecrans.js (KIT.md § 8) :
     appli.ecran('#/clients/:id', { titre, onglet, role }, async (vue, params) => {...})   déclare un écran
     appli.ecran('#/compte', { onglet: 'Compte' }, null)   ajoute un onglet vers un écran existant
     appli.api('GET', '/api/clients')  → objet JSON ; lève une Error avec le message français du serveur
     appli.esc(texte)                  échappe pour innerHTML (TOUJOURS pour une donnée venue de la base)
     appli.toast(message, erreur?)     message bref
     appli.formulaire(form, async donnees => {...})   envoi d'un formulaire avec bouton désactivé et erreurs affichées
     appli.utilisateur, appli.aller('#/...')

   Offre commune (KIT.md § 17) :
     appli.offre()                     → { palier, libelle, source, pub, paiement, limites, paliers } du compte connecté
     appli.aPalier('premium')          → vrai si le compte a au moins ce palier (admin et vip : toujours)
     appli.exiger('premium')           → comme aPalier, et sinon affiche l'invitation standard à passer à l'offre
     Une réponse 402 du serveur (route { palier } ou limite atteinte) affiche l'invitation (écriture) ou, si elle arrive
     pendant l'affichage d'un écran, remplace l'écran par la carte standard « Cette fonction fait partie de l'offre … ».
     ecran(motif, { pub: false }, …)   écran sans bandeau de pub (plein écran, appareil photo…) ; jamais de pub sur
                                       les écrans du socle (connexion, compte, abonnement, dépannage). */
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ecrans = [];
  let session = { utilisateur: null, installation: false, inscription: false, app: { nom: 'Mon app' }, mdpMin: 12, offre: null };

  async function api(methode, chemin, corps) {
    const options = { method: methode, credentials: 'same-origin', headers: { 'X-Appli': '1', Accept: 'application/json' } };
    if (corps !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(corps); }
    let res;
    try { res = await fetch(chemin, options); } catch (e) { throw new Error('Connexion impossible. Vérifie ta connexion internet.'); }
    const donnees = await res.json().catch(() => ({}));
    if (res.status === 401 && !chemin.startsWith('/api/connexion') && !chemin.startsWith('/api/installation') && session.utilisateur) {
      session.utilisateur = null; aller('#/connexion');
    }
    if (res.status === 402 && methode !== 'GET') inviter(donnees.palier, donnees.erreur);
    if (!res.ok) { const e = new Error(donnees.erreur || `Erreur ${res.status}`); e.statut = res.status; e.palier = donnees.palier; throw e; }
    return donnees;
  }

  let minuteur;
  function toast(message, erreur) {
    const t = $('#toast');
    t.textContent = message; t.className = 'toast' + (erreur ? ' erreur' : ''); t.hidden = false;
    clearTimeout(minuteur); minuteur = setTimeout(() => { t.hidden = true; }, erreur ? 6000 : 3000);
  }

  /** Branche un formulaire : empêche le double envoi, affiche l'erreur sous le formulaire. */
  function formulaire(form, fn) {
    let zone = form.querySelector('.erreur[data-zone]');
    if (!zone) { zone = document.createElement('p'); zone.className = 'erreur'; zone.dataset.zone = '1'; zone.setAttribute('role', 'alert'); zone.hidden = true; form.appendChild(zone); }
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const bouton = form.querySelector('[type=submit]');
      zone.hidden = true;
      if (bouton) bouton.disabled = true;
      try { await fn(Object.fromEntries(new FormData(form)), form); }
      catch (e) { zone.textContent = e.message; zone.hidden = false; }
      finally { if (bouton) bouton.disabled = false; }
    });
  }

  function ecran(motif, options, fn) {
    if (typeof options === 'function') { fn = options; options = {}; }
    const noms = [];
    const re = new RegExp('^' + motif.replace(/\/:(\w+)/g, (_, n) => { noms.push(n); return '/([^/]+)'; }) + '$');
    ecrans.push(Object.assign({ motif, re, noms, fn, role: 'utilisateur' }, options));
  }
  const aller = h => { if (location.hash === h) afficher(); else location.hash = h; };
  const aLeRole = (e) => [].concat(e.role).some(r => r === 'utilisateur' || r === session.utilisateur.role) || session.utilisateur.role === 'admin';

  /* ---------- Offre commune : paliers, invitation, bandeau de pub ---------- */
  const offre = () => session.offre || { palier: 'gratuit', paliers: [], limites: {} };
  const rangDe = id => offre().paliers.findIndex(p => p.id === id);
  const aPalier = id => rangDe(offre().palier) >= rangDe(id);
  const euros = n => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const prixCourt = p => !p.prix ? 'Gratuit' : p.prix.mois ? `${euros(p.prix.mois)} / mois` : `${euros(p.prix.an)} / an`;
  const offrePayante = id => offre().paliers.find(p => p.id === id) || offre().paliers[1];

  /** Invitation standard : une feuille en bas de l'écran, une seule action (voir l'offre). */
  function inviter(id, message) {
    const p = offrePayante(id);
    if (!p || !session.utilisateur) return;
    fermerInvitation();
    const f = document.createElement('div');
    f.className = 'feuille-fond'; f.id = 'invitation';
    f.innerHTML = `<div class="feuille" role="dialog" aria-modal="true" aria-labelledby="invitation-titre">
      <span class="pastille pastille-offre">${esc(p.libelle)}</span><h2 id="invitation-titre">${esc(message || `Cette fonction fait partie de l’offre ${p.libelle}.`)}</h2>
      <ul class="avantages">${p.avantages.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      <div class="actions"><a class="btn" href="#/abonnement" id="invitation-voir">Voir l’offre ${esc(p.libelle)} · ${esc(prixCourt(p))}</a>
      <button class="btn btn-secondaire" type="button" id="invitation-fermer">Plus tard</button></div></div>`;
    document.body.appendChild(f);
    f.onclick = ev => { if (ev.target === f || ev.target.id === 'invitation-fermer' || ev.target.id === 'invitation-voir') fermerInvitation(); };
    f.querySelector('#invitation-voir').focus();
  }
  function fermerInvitation() { const f = $('#invitation'); if (f) f.remove(); }
  function exiger(id) { if (aPalier(id)) return true; inviter(id); return false; }

  const ECRANS_SANS_PUB = /^#\/(connexion|inscription|installation|mot-de-passe|compte|abonnement|admin)/;
  const natif = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  const plateforme = () => (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';
  let admobPret = null, admobVisible = false;
  /** AdMob (app mobile Capacitor, extension @capacitor-community/admob) : consentement UMP puis bannière adaptative en bas. */
  async function admob(montrer, adId) {
    const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
    if (!A || !adId) return false;
    try {
      if (!admobPret) admobPret = (async () => {
        await A.initialize({});
        const c = await A.requestConsentInfo();
        if (c && c.isConsentFormAvailable && c.status === 'REQUIRED') await A.showConsentForm();
      })();
      await admobPret;
      if (montrer && !admobVisible) { await A.showBanner({ adId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: $('#onglets').hidden ? 0 : 64 }); admobVisible = true; }
      if (!montrer && admobVisible) { await A.removeBanner(); admobVisible = false; }
      return true;
    } catch (e) { return false; }
  }
  /** Bandeau : un seul format pour toutes les apps (bas de l'écran, au-dessus des onglets), jamais pour un palier sans pub. */
  async function bandeau(e, route) {
    let b = $('#pub');
    if (!b) { b = document.createElement('aside'); b.id = 'pub'; b.className = 'pub'; b.setAttribute('aria-label', 'Publicité'); b.hidden = true; document.body.appendChild(b); }
    const o = offre();
    const montrer = !!(session.utilisateur && o.pub && e && e.pub !== false && !ECRANS_SANS_PUB.test(route));
    const adId = natif() && o.admob ? o.admob[plateforme()] : '';
    if (adId && await admob(montrer, adId)) { b.hidden = true; document.body.classList.toggle('avec-pub', false); return; }
    const p = offrePayante();
    b.hidden = !montrer || !p;
    document.body.classList.toggle('avec-pub', !b.hidden);
    document.body.classList.toggle('avec-onglets', !$('#onglets').hidden);
    if (!b.hidden) b.innerHTML = `<span class="pub-etiquette">Pub</span><span class="pub-texte">Passe à <strong>${esc(p.libelle)}</strong> : sans publicité</span><a class="pub-lien" href="#/abonnement">Retirer la pub</a>`;
  }

  /* ---------- Rendu ---------- */
  function cadre(titre, onglets) {
    document.title = titre ? `${titre} · ${session.app.nom}` : session.app.nom;
    $('#titre-app').textContent = session.app.nom;
    $('#bouton-compte').hidden = !session.utilisateur;
    if (session.utilisateur) $('#bouton-compte').textContent = session.utilisateur.nom || session.utilisateur.email.split('@')[0];
    const nav = $('#onglets');
    const liste = onglets ? ecrans.filter(e => e.onglet && aLeRole(e)) : [];
    nav.hidden = !liste.length;
    $('#vue').classList.toggle('sans-onglets', !liste.length);
    nav.innerHTML = liste.map(e => `<a href="${esc(e.motif)}"${location.hash.startsWith(e.motif) ? ' aria-current="page"' : ''}>${esc(e.onglet)}</a>`).join('');
  }

  async function afficher() {
    const vue = $('#vue');
    const h = location.hash || '#/';
    let route = h;
    if (session.installation) route = '#/installation';
    else if (!session.utilisateur && !['#/connexion', '#/inscription'].includes(h)) route = '#/connexion';
    else if (session.utilisateur && session.utilisateur.mdp_a_changer) route = '#/mot-de-passe';
    else if (session.utilisateur && ['#/connexion', '#/inscription', '#/installation', '#/'].includes(h)) {
      const premier = ecrans.find(e => e.onglet && aLeRole(e)) || ecrans.find(e => aLeRole(e) && !e.noms.length);
      route = premier ? premier.motif : '#/compte';
    }
    if (route !== h) { history.replaceState(null, '', route); }
    document.body.classList.toggle('ecran-accueil', ECRANS_ACCUEIL.test(route) || (route === '#/mot-de-passe' && !!(session.utilisateur && session.utilisateur.mdp_a_changer)));
    const e = ecrans.find(x => x.fn && x.re.test(route));
    if (!e) { cadre('Introuvable', true); vue.innerHTML = '<p class="vide">Cette page n’existe pas.</p><p class="centre"><a class="btn" href="#/">Accueil</a></p>'; return; }
    if (session.utilisateur && !aLeRole(e)) { cadre('Accès réservé', true); vue.innerHTML = '<p class="vide">Accès réservé.</p>'; return; }
    const m = e.re.exec(route);
    const params = Object.fromEntries(e.noms.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    cadre(e.titre, !!session.utilisateur && !session.utilisateur.mdp_a_changer);
    fermerInvitation();
    bandeau(e, route);
    vue.innerHTML = '<p class="vide">Chargement…</p>';
    try { await e.fn(vue, params); }
    catch (err) {
      if (err.statut === 402) { const p = offrePayante(err.palier); vue.innerHTML = `<div class="carte centre"><span class="pastille pastille-offre">${esc(p ? p.libelle : 'Offre')}</span><h2>${esc(err.message)}</h2>
        ${p ? `<ul class="avantages">${p.avantages.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}<div class="actions"><a class="btn" href="#/abonnement">Voir l’offre${p ? ' ' + esc(p.libelle) : ''}</a></div></div>`; return; }
      vue.innerHTML = `<div class="carte"><p class="erreur">${esc(err.message)}</p><button class="btn btn-secondaire" id="reessayer">Réessayer</button></div>`; $('#reessayer').onclick = afficher; }
    vue.focus({ preventScroll: true });
  }

  async function chargerSession() {
    session = await api('GET', '/api/session');
    appli.utilisateur = session.utilisateur;
  }

  /* ---------- Écrans du socle ---------- */
  const champ = (nom, libelle, type = 'text', extra = '') => `<label class="champ"><span>${esc(libelle)}</span><input name="${nom}" type="${type}" ${extra}></label>`;
  /** Champ mot de passe avec le bouton « Afficher » (branché une fois pour toutes, plus bas). */
  const champMdp = (nom, libelle, autocomplete) => `<label class="champ"><span>${esc(libelle)}</span><span class="champ-mdp">
    <input name="${nom}" type="password" required autocomplete="${autocomplete}" autocapitalize="off" spellcheck="false">
    <button type="button" class="voir-mdp" aria-pressed="false" aria-label="Afficher le mot de passe">Afficher</button></span></label>`;
  const mdpAide = () => `<p class="doux aide-mdp">Au moins ${session.mdpMin} caractères, avec des lettres et des chiffres ou symboles.</p>`;
  /** Écrans d'accueil (connexion, inscription, installation, mot de passe imposé) : bandeau à la couleur de l'app,
      logo et nom, puis le formulaire dans une carte en relief. */
  const ECRANS_ACCUEIL = /^#\/(connexion|inscription|installation)$/;
  const accueil = (contenu, pied = '') => `<div class="accueil"><div class="accueil-entete">
      <img class="accueil-logo" src="/icone.svg" alt="" width="72" height="72"><p class="accueil-nom">${esc(session.app.nom)}</p></div>
    ${contenu}${pied ? `<div class="accueil-pied">${pied}</div>` : ''}</div>`;
  /** Le nouveau mot de passe et sa confirmation doivent être identiques : signalé pendant la saisie et à l'envoi. */
  function brancherConfirmation(form) {
    const nouveau = form.elements.nouveau || form.elements.mdp, confirmation = form.elements.confirmation;
    const verifier = () => { const ko = !!confirmation.value && confirmation.value !== nouveau.value; confirmation.setAttribute('aria-invalid', ko); return !ko; };
    confirmation.addEventListener('input', verifier); nouveau.addEventListener('input', () => { if (confirmation.value) verifier(); });
    return () => { if (!verifier() || !confirmation.value) { confirmation.setAttribute('aria-invalid', 'true'); confirmation.focus(); throw new Error('Les deux nouveaux mots de passe ne correspondent pas.'); } };
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.voir-mdp');
    if (!b) return;
    ev.preventDefault();
    const input = b.parentNode.querySelector('input'), voir = input.type === 'password';
    input.type = voir ? 'text' : 'password';
    b.textContent = voir ? 'Masquer' : 'Afficher';
    b.setAttribute('aria-pressed', voir); b.setAttribute('aria-label', voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    input.focus();
  });

  ecran('#/installation', { titre: 'Installation', role: 'public' }, async vue => {
    let etape = 1; const donnees = {};
    const dessiner = () => {
      const pas = [1, 2, 3].map(n => `<span${n <= etape ? ' class="faite"' : ''}></span>`).join('');
      const corps = etape === 1
        ? `<h1>Bienvenue</h1><p class="accueil-intro">Première ouverture : crée le compte administrateur.</p><p class="doux">Le code d’installation est la variable INSTALL_CODE, ou le code affiché dans les journaux du serveur au démarrage.</p>
           ${champ('code', 'Code d’installation', 'text', 'required autocomplete="off" autocapitalize="off"')}`
        : etape === 2
          ? `<h1>Ton compte admin</h1>${champ('nom', 'Ton nom', 'text', 'autocomplete="name"')}${champ('email', 'Email', 'email', 'required autocomplete="email"')}
             ${champMdp('mdp', 'Mot de passe', 'new-password')}${mdpAide()}`
          : `<h1>Nom de l’app</h1>${champ('appNom', 'Nom affiché', 'text', `value="${esc(donnees.appNom || session.app.nom)}" maxlength="80"`)}`;
      vue.innerHTML = accueil(`<form class="carte carte-relief accueil-carte" novalidate><div class="etapes">${pas}</div>${corps}
        <div class="actions actions-pleines">${etape > 1 ? '<button type="button" class="btn btn-secondaire" id="retour">Retour</button>' : ''}<button class="btn" type="submit">${etape < 3 ? 'Continuer' : 'Terminer'}</button></div></form>`,
        `Étape ${etape} sur 3`);
      const form = vue.querySelector('form');
      if (etape > 1) $('#retour').onclick = () => { etape--; dessiner(); };
      formulaire(form, async d => {
        Object.assign(donnees, d);
        if (etape === 1 && !d.code.trim()) throw new Error('Saisis le code d’installation.');
        if (etape === 2 && (!d.email || d.mdp.length < session.mdpMin)) throw new Error(`Email et mot de passe (${session.mdpMin} caractères minimum) obligatoires.`);
        if (etape < 3) { etape++; return dessiner(); }
        try { await api('POST', '/api/installation', donnees); }
        catch (e) { if (/code/i.test(e.message)) { etape = 1; dessiner(); toast(e.message, true); return; } if (/mot de passe|email/i.test(e.message)) { etape = 2; dessiner(); toast(e.message, true); return; } throw e; }
        await chargerSession(); toast('App installée. Bienvenue !'); aller('#/');
      });
      const premier = form.querySelector('input'); if (premier) premier.focus();
    };
    dessiner();
  });

  ecran('#/connexion', { titre: 'Connexion', role: 'public' }, async vue => {
    vue.innerHTML = accueil(`<form class="carte carte-relief accueil-carte" novalidate><h1>Connexion</h1>
      <p class="accueil-intro">Content de te revoir ! Connecte-toi pour continuer.</p>
      ${champ('email', 'Email ou identifiant', 'text', 'required autocomplete="username" autocapitalize="off" spellcheck="false"')}${champMdp('mdp', 'Mot de passe', 'current-password')}
      <div class="actions actions-pleines"><button class="btn" type="submit">Se connecter</button></div>
      <p class="doux accueil-note">Mot de passe oublié : demande à l’administrateur de le réinitialiser.</p></form>`,
      session.inscription ? 'Pas encore de compte ? <a href="#/inscription">Créer un compte</a>' : '');
    formulaire(vue.querySelector('form'), async d => { await api('POST', '/api/connexion', d); await chargerSession(); aller('#/'); });
  });

  ecran('#/inscription', { titre: 'Créer un compte', role: 'public' }, async vue => {
    if (!session.inscription) return aller('#/connexion');
    vue.innerHTML = accueil(`<form class="carte carte-relief accueil-carte" novalidate><h1>Créer un compte</h1>
      <p class="accueil-intro">Quelques secondes suffisent, et c’est gratuit.</p>
      ${champ('nom', 'Nom', 'text', 'autocomplete="name"')}${champ('email', 'Email', 'email', 'required autocomplete="email"')}
      ${champMdp('mdp', 'Mot de passe', 'new-password')}${mdpAide()}
      <div class="actions actions-pleines"><button class="btn" type="submit">Créer mon compte</button></div></form>`,
      'Déjà un compte ? <a href="#/connexion">Se connecter</a>');
    formulaire(vue.querySelector('form'), async d => { await api('POST', '/api/inscription', d); await chargerSession(); aller('#/'); });
  });

  ecran('#/mot-de-passe', { titre: 'Mot de passe' }, async vue => {
    const force = session.utilisateur.mdp_a_changer;
    const form = `<form class="carte carte-relief${force ? ' accueil-carte' : ''}" novalidate><h1>${force ? 'Choisis ton mot de passe' : 'Changer de mot de passe'}</h1>
      ${force ? '<p class="accueil-intro">Ton mot de passe actuel est provisoire : choisis le tien pour continuer.</p>' : ''}
      ${champMdp('ancien', 'Mot de passe actuel', 'current-password')}
      ${champMdp('nouveau', 'Nouveau mot de passe', 'new-password')}${mdpAide()}
      ${champMdp('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
      <div class="actions${force ? ' actions-pleines' : ''}"><button class="btn" type="submit">Enregistrer</button>${force ? '' : '<a class="btn btn-secondaire" href="#/compte">Annuler</a>'}</div></form>`;
    vue.innerHTML = force ? accueil(form) : `<div class="centre">${form}</div>`;
    const f = vue.querySelector('form'), concordance = brancherConfirmation(f);
    formulaire(f, async d => { concordance(); await api('POST', '/api/moi/mdp', d); await chargerSession(); toast('Mot de passe enregistré.'); aller(force ? '#/' : '#/compte'); });
  });

  ecran('#/compte', { titre: 'Mon compte' }, async vue => {
    const u = session.utilisateur, o = offre();
    const role = (session.roles || []).find(r => r.id === u.role);
    vue.innerHTML = `<h1>Mon compte</h1><div class="carte"><p><strong>${esc(u.nom || u.email)}</strong></p><p class="doux">${esc(u.email)} · ${esc(role ? role.libelle : u.role)}</p>
      ${o.paliers.length > 1 ? `<p class="ligne"><span class="pousse">Offre : <span class="pastille ${o.palier === 'gratuit' ? '' : 'pastille-offre'}">${esc(o.libelle)}</span></span><a href="#/abonnement">${o.palier === 'gratuit' ? 'Voir les offres' : 'Mon abonnement'}</a></p>` : ''}
      <div class="actions"><a class="btn btn-secondaire" href="#/mot-de-passe">Changer de mot de passe</a>
      ${u.role === 'admin' ? '<a class="btn btn-secondaire" href="#/admin">Dépannage admin</a>' : ''}
      <button class="btn btn-secondaire" id="deconnexion">Se déconnecter</button></div></div>
      <p class="ligne"><span class="doux pousse">${esc(session.app.nom)} · version ${esc(session.app.version)}</span><a href="#/compte/supprimer">Supprimer mon compte</a></p>
      ${liensLegaux()}`;
    $('#deconnexion').onclick = async () => { await api('POST', '/api/deconnexion'); session.utilisateur = null; appli.utilisateur = null; aller('#/connexion'); };
  });

  /* Pages publiques générées par outils/store-app.js (KIT.md § 18) : à portée de main dans l'app, comme l'exigent
     l'App Store (5.1.1, 3.1.2) et Google Play. Sur iPhone, les conditions d'un abonnement acheté dans l'app sont celles d'Apple. */
  const EULA_APPLE = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
  const liensLegaux = () => `<p class="doux liens-legaux"><a href="/support.html">Aide et contact</a> · <a href="/confidentialite.html">Confidentialité</a> ·
    <a href="${natif() && plateforme() === 'ios' ? EULA_APPLE : '/conditions.html'}"${natif() && plateforme() === 'ios' ? ' target="_blank" rel="noopener"' : ''}>Conditions d’utilisation</a></p>`;

  // Suppression du compte par la personne elle-même (exigée par l'App Store et Google Play) : POST /api/moi/supprimer
  ecran('#/compte/supprimer', { titre: 'Supprimer mon compte' }, async vue => {
    const o = offre(), store = o.palier !== 'gratuit' && (o.source === 'apple' || o.source === 'google');
    vue.innerHTML = `<div class="centre"><form class="carte carte-relief" novalidate><h1>Supprimer mon compte</h1>
      <p>Ton compte et toutes tes données dans ${esc(session.app.nom)} seront <strong>effacés définitivement</strong>. Cette action ne peut pas être annulée.</p>
      ${o.gere && o.statut !== 'annule' ? '<p class="erreur">Ton abonnement est encore actif : résilie-le d’abord depuis l’écran <a href="#/abonnement">Abonnement</a>.</p>' : ''}
      ${store ? `<p class="erreur">Ton abonnement a été pris sur ${o.source === 'apple' ? 'l’App Store' : 'Google Play'} : supprimer le compte ne l’arrête pas. Résilie-le dans les réglages du téléphone.</p>` : ''}
      ${champMdp('mdp', 'Mot de passe, pour confirmer', 'current-password')}
      <div class="actions"><button class="btn btn-danger" type="submit">Supprimer définitivement</button><a class="btn btn-secondaire" href="#/compte">Annuler</a></div></form></div>`;
    formulaire(vue.querySelector('form'), async d => {
      await api('POST', '/api/moi/supprimer', d);
      session.utilisateur = null; appli.utilisateur = null;
      toast('Ton compte a été supprimé.'); aller('#/connexion');
    });
  });

  /* ---------- Abonnement : le même écran dans toutes les apps ---------- */
  // Retour du paiement Stripe : l'abonnement arrive par le webhook, quelques secondes après
  ecran('#/abonnement/merci', { titre: 'Abonnement' }, async () => {
    for (let i = 0; i < 5 && offre().palier === 'gratuit'; i++) { await new Promise(ok => setTimeout(ok, 1500)); await chargerSession(); }
    toast(offre().palier !== 'gratuit' ? 'Merci ! Ton abonnement est actif.' : 'Merci ! Ton abonnement sera actif dans quelques instants.');
    aller('#/abonnement');
  });
  ecran('#/abonnement', { titre: 'Abonnement' }, async vue => {
    const o = offre();
    if (o.paliers.length < 2) { vue.innerHTML = '<h1>Abonnement</h1><p class="vide">Cette app est entièrement gratuite.</p>'; return; }
    let periode = 'an';
    const offert = o.source === 'admin' || o.source === 'vip';
    const dessiner = () => {
      const remise = p => p.prix && p.prix.mois && p.prix.an ? Math.round((1 - p.prix.an / (p.prix.mois * 12)) * 100) : 0;
      const remiseMax = Math.max(0, ...o.paliers.map(remise));
      const fin = o.fin_le ? new Date(o.fin_le).toLocaleDateString('fr-FR') : '';
      vue.innerHTML = `<h1>Abonnement</h1>
        <div class="carte"><p class="ligne"><span class="pousse">Ton offre : <span class="pastille ${o.palier === 'gratuit' ? '' : 'pastille-offre'}">${esc(o.libelle)}</span></span>
          ${o.palier !== 'gratuit' && fin ? `<span class="doux">${o.statut === 'annule' ? 'jusqu’au' : 'renouvelée le'} ${esc(fin)}</span>` : ''}</p>
          ${offert ? `<p class="succes">${o.source === 'vip' ? 'Compte VIP' : 'Compte administrateur'} : tous les avantages de l’offre ${esc(o.libelle)} sont offerts.</p>` : ''}
          ${o.gere ? '<div class="actions"><button class="btn btn-secondaire" id="portail">Gérer ou résilier mon abonnement</button></div>' : ''}
          ${o.palier !== 'gratuit' && !offert && !o.gere && (o.source === 'apple' || o.source === 'google') ? `<p class="doux">Abonnement pris sur ${o.source === 'apple' ? 'l’App Store' : 'Google Play'} : il se gère dans les réglages du téléphone.</p>` : ''}</div>
        ${o.paliers.some(p => p.prix && p.prix.mois && p.prix.an) ? `<div class="bascule" role="group" aria-label="Période"><button type="button" data-periode="mois" aria-pressed="${periode === 'mois'}">Mensuel</button>
          <button type="button" data-periode="an" aria-pressed="${periode === 'an'}">Annuel${remiseMax ? ` <span class="pastille pastille-offre">−${remiseMax} %</span>` : ''}</button></div>` : ''}
        <div class="offres">${o.paliers.map(p => {
          const prix = !p.prix ? '0 €' : euros(p.prix[periode] || p.prix.mois || p.prix.an);
          const unite = !p.prix ? '' : p.prix[periode] ? (periode === 'an' ? ' / an' : ' / mois') : p.prix.mois ? ' / mois' : ' / an';
          const actuel = p.id === o.palier;
          const action = actuel ? '<span class="btn btn-secondaire" aria-disabled="true">Offre actuelle</span>'
            : !p.prix || offert || rangDe(p.id) < rangDe(o.palier) ? ''
            : o.paiement ? `<button class="btn" data-acheter="${esc(p.id)}">${p.essaiJours ? `Essayer ${esc(p.essaiJours)} jours gratuits` : `Passer à ${esc(p.libelle)}`}</button>`
            : '<span class="btn btn-secondaire" aria-disabled="true">Bientôt disponible</span>';
          return `<div class="carte offre${actuel ? ' offre-actuelle' : ''}${p.id === offrePayante().id ? ' offre-conseillee' : ''}">
            <h2>${esc(p.libelle)}</h2><p class="prix">${esc(prix)}<span class="doux">${esc(unite)}</span></p>
            ${periode === 'an' && p.prix && p.prix.an && p.prix.mois ? `<p class="doux">soit ${esc(euros(p.prix.an / 12))} par mois</p>` : ''}
            <ul class="avantages">${(p.pub ? [] : ['Sans publicité']).concat(p.avantages.filter(a => !/sans pub/i.test(a))).map(a => `<li>${esc(a)}</li>`).join('')}
            ${Object.entries(p.limites).map(([k, v]) => `<li class="doux">${esc(v)} ${esc(k.replace(/_/g, ' '))} au maximum</li>`).join('')}</ul>
            <div class="actions">${action}</div></div>`;
        }).join('')}</div>
        <p class="doux">Prix TTC. L’abonnement se renouvelle automatiquement à la fin de chaque période ; il se résilie à tout moment, en quelques clics, et reste actif jusqu’à la fin de la période payée.
          ${natif() ? '' : 'Paiement sécurisé par Stripe.'}</p>
        ${natif() && o.paiement ? '<p><button class="btn btn-secondaire" id="restaurer">Restaurer mes achats</button></p>' : ''}
        ${liensLegaux()}`;
      vue.querySelectorAll('[data-periode]').forEach(b => b.onclick = () => { periode = b.dataset.periode; dessiner(); });
      vue.querySelectorAll('[data-acheter]').forEach(b => b.onclick = () => acheter(b, b.dataset.acheter, periode));
      const portail = $('#portail');
      if (portail) portail.onclick = async () => { portail.disabled = true; try { location.href = (await api('POST', '/api/offre/portail')).url; } catch (e) { toast(e.message, true); portail.disabled = false; } };
      const restaurer = $('#restaurer');
      if (restaurer) restaurer.onclick = () => achatMobile(restaurer, null, null);
    };
    async function acheter(bouton, id, per) {
      if (natif()) return achatMobile(bouton, id, per);
      bouton.disabled = true;
      try { location.href = (await api('POST', '/api/offre/payer', { palier: id, periode: per })).url; } catch (e) { toast(e.message, true); bouton.disabled = false; }
    }
    /** App mobile : achat dans le store par RevenueCat (@revenuecat/purchases-capacitor) ; offering = id du palier, paquets $rc_monthly / $rc_annual. */
    async function achatMobile(bouton, id, per) {
      const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases;
      const cle = o.revenuecat && o.revenuecat[plateforme()];
      if (!P || !cle) return toast('L’achat dans l’app n’est pas encore disponible sur ce téléphone.', true);
      bouton.disabled = true;
      try {
        await P.configure({ apiKey: cle, appUserID: session.utilisateur.id });
        if (!id) await P.restorePurchases();
        else {
          const { all, current } = await P.getOfferings();
          const off = (all && all[id]) || current;
          const paquet = off && off.availablePackages.find(x => x.identifier === (per === 'an' ? '$rc_annual' : '$rc_monthly'));
          if (!paquet) throw new Error('Offre introuvable dans le store.');
          await P.purchasePackage({ aPackage: paquet });
        }
        for (let i = 0; i < 6; i++) { await new Promise(ok => setTimeout(ok, 1500)); await chargerSession(); if (offre().palier !== 'gratuit') break; }
        toast(offre().palier !== 'gratuit' ? 'Merci ! Ton abonnement est actif.' : 'Achat enregistré : il apparaîtra dans quelques instants.');
        afficher();
      } catch (e) { if (!/cancel/i.test(e.message || '')) toast(e.message || 'Achat impossible.', true); bouton.disabled = false; }
    }
    dessiner();
  });

  /* ---------- Admin de dépannage (la gestion complète se fait depuis l'Atelier de Blocs) ---------- */
  ecran('#/admin', { titre: 'Dépannage', role: 'admin' }, async vue => {
    const [etat, comptes] = await Promise.all([api('GET', '/api/admin/etat'), api('GET', '/api/admin/utilisateurs')]);
    const pastille = v => v.definie ? '<span class="pastille pastille-succes">OK</span>' : v.obligatoire ? '<span class="pastille pastille-danger">absente</span>' : '<span class="pastille">défaut</span>';
    vue.innerHTML = `<h1>Dépannage</h1><p class="doux">La gestion complète (données, journal, RGPD, sauvegarde) se fait depuis l’Atelier de Blocs.</p>
      <div class="carte"><h2>État</h2><p>${esc(etat.app.nom)} v${esc(etat.app.version)} · ${esc(etat.app.env)} · base ${esc(etat.base.nom)} (${etat.base.tables} tables)</p>
        ${etat.alertes.concat(etat.optimisation.filter(o => o.niveau === 'erreur')).map(a => `<p class="${a.niveau === 'erreur' ? 'erreur' : 'doux'}">${esc(a.texte)}</p>`).join('') || '<p class="succes">Aucune alerte.</p>'}
        <div class="defile"><table class="tableau"><thead><tr><th>Variable</th><th>État</th></tr></thead><tbody>
        ${etat.variables.map(v => `<tr><td><span class="code">${esc(v.cle)}</span></td><td>${pastille(v)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="carte"><h2>Comptes</h2><ul class="liste">${comptes.utilisateurs.map(c => `<li class="ligne"><span class="pousse">${esc(c.nom || c.email)}<br><span class="doux">${esc(c.email)} · ${esc(c.role)}${c.actif ? '' : ' · désactivé'}</span></span>
        <button class="btn btn-secondaire" data-mdp="${esc(c.id)}">Nouveau mot de passe</button></li>`).join('')}</ul>
        <form id="nouveau-compte" novalidate><h2>Ajouter un compte</h2>${champ('email', 'Email', 'email', 'required')}${champ('nom', 'Nom')}
        <label class="champ"><span>Rôle</span><select name="role">${(comptes.rolesDetail || comptes.roles.map(id => ({ id, libelle: id }))).map(r => `<option value="${esc(r.id)}"${r.id === 'utilisateur' ? ' selected' : ''}>${esc(r.libelle)}</option>`).join('')}</select></label>
        <p class="doux">VIP : tous les avantages de l’offre la plus haute, sans payer, sans droit d’administration.</p>
        <button class="btn" type="submit">Créer</button></form><p id="provisoire" class="carte" hidden></p></div>`;
    const montrer = (email, mdp) => { const p = $('#provisoire'); p.hidden = false; p.innerHTML = `Mot de passe provisoire de ${esc(email)} : <span class="code">${esc(mdp)}</span><br><span class="doux">Transmets-le ; il devra le changer à sa première connexion.</span>`; };
    vue.querySelectorAll('[data-mdp]').forEach(b => b.onclick = async () => {
      if (!confirm('Générer un nouveau mot de passe provisoire ?')) return;
      try { const r = await api('POST', `/api/admin/utilisateurs/${encodeURIComponent(b.dataset.mdp)}/mdp`); montrer(r.utilisateur.email, r.mdpProvisoire); } catch (e) { toast(e.message, true); }
    });
    formulaire($('#nouveau-compte'), async d => { const r = await api('POST', '/api/admin/utilisateurs', d); toast('Compte créé.'); await afficher(); montrer(r.utilisateur.email, r.mdpProvisoire); });
  });

  const appli = window.appli = { api, esc, toast, formulaire, ecran, aller, utilisateur: null, session: () => session, offre, aPalier, exiger, inviter };

  document.addEventListener('DOMContentLoaded', async () => {
    $('#bouton-compte').onclick = () => aller('#/compte');
    window.addEventListener('hashchange', afficher);
    try { await chargerSession(); } catch (e) { $('#vue').innerHTML = `<p class="vide erreur">${esc(e.message)}</p>`; return; }
    afficher();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
})();
