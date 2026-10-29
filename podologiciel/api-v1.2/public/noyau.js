/* noyau.js — socle du front : appels à l'API, session, écrans de compte, routeur, admin de dépannage.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier. Les écrans de l'app vont dans app-ecrans.js.

   API pour app-ecrans.js (KIT.md § 8) :
     appli.ecran('#/clients/:id', { titre, onglet, role }, async (vue, params) => {...})   déclare un écran
     appli.ecran('#/compte', { onglet: 'Compte' }, null)   ajoute un onglet vers un écran existant
     appli.api('GET', '/api/clients')  → objet JSON ; lève une Error avec le message français du serveur
     appli.esc(texte)                  échappe pour innerHTML (TOUJOURS pour une donnée venue de la base)
     appli.toast(message, erreur?)     message bref
     appli.formulaire(form, async donnees => {...})   envoi d'un formulaire avec bouton désactivé et erreurs affichées
     appli.utilisateur, appli.aller('#/...') */
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ecrans = [];
  let session = { utilisateur: null, installation: false, inscription: false, app: { nom: 'Mon app' }, mdpMin: 12 };

  async function api(methode, chemin, corps) {
    const options = { method: methode, credentials: 'same-origin', headers: { 'X-Appli': '1', Accept: 'application/json' } };
    if (corps !== undefined) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(corps); }
    let res;
    try { res = await fetch(chemin, options); } catch (e) { throw new Error('Connexion impossible. Vérifie ta connexion internet.'); }
    const donnees = await res.json().catch(() => ({}));
    if (res.status === 401 && !chemin.startsWith('/api/connexion') && !chemin.startsWith('/api/installation') && session.utilisateur) {
      session.utilisateur = null; aller('#/connexion');
    }
    if (!res.ok) throw new Error(donnees.erreur || `Erreur ${res.status}`);
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
    const e = ecrans.find(x => x.fn && x.re.test(route));
    if (!e) { cadre('Introuvable', true); vue.innerHTML = '<p class="vide">Cette page n’existe pas.</p><p class="centre"><a class="btn" href="#/">Accueil</a></p>'; return; }
    if (session.utilisateur && !aLeRole(e)) { cadre('Accès réservé', true); vue.innerHTML = '<p class="vide">Accès réservé.</p>'; return; }
    const m = e.re.exec(route);
    const params = Object.fromEntries(e.noms.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
    cadre(e.titre, !!session.utilisateur && !session.utilisateur.mdp_a_changer);
    vue.innerHTML = '<p class="vide">Chargement…</p>';
    try { await e.fn(vue, params); }
    catch (err) { vue.innerHTML = `<div class="carte"><p class="erreur">${esc(err.message)}</p><button class="btn btn-secondaire" id="reessayer">Réessayer</button></div>`; $('#reessayer').onclick = afficher; }
    vue.focus({ preventScroll: true });
  }

  async function chargerSession() {
    session = await api('GET', '/api/session');
    appli.utilisateur = session.utilisateur;
  }

  /* ---------- Écrans du socle ---------- */
  const champ = (nom, libelle, type = 'text', extra = '') => `<label class="champ"><span>${esc(libelle)}</span><input name="${nom}" type="${type}" ${extra}></label>`;
  const mdpAide = () => `<p class="doux">Au moins ${session.mdpMin} caractères, avec des lettres et des chiffres ou symboles.</p>`;

  ecran('#/installation', { titre: 'Installation', role: 'public' }, async vue => {
    let etape = 1; const donnees = {};
    const dessiner = () => {
      const pas = [1, 2, 3].map(n => `<span${n <= etape ? ' class="faite"' : ''}></span>`).join('');
      const corps = etape === 1
        ? `<h1>Bienvenue</h1><p>Première ouverture : crée le compte administrateur.</p><p class="doux">Le code d’installation est la variable INSTALL_CODE, ou le code affiché dans les journaux du serveur au démarrage.</p>
           ${champ('code', 'Code d’installation', 'text', 'required autocomplete="off" autocapitalize="off"')}`
        : etape === 2
          ? `<h1>Ton compte admin</h1>${champ('nom', 'Ton nom', 'text', 'autocomplete="name"')}${champ('email', 'Email', 'email', 'required autocomplete="email"')}
             ${champ('mdp', 'Mot de passe', 'password', 'required autocomplete="new-password"')}${mdpAide()}`
          : `<h1>Nom de l’app</h1>${champ('appNom', 'Nom affiché', 'text', `value="${esc(donnees.appNom || session.app.nom)}" maxlength="80"`)}`;
      vue.innerHTML = `<div class="centre"><div class="etapes">${pas}</div><form class="carte" novalidate>${corps}
        <div class="actions">${etape > 1 ? '<button type="button" class="btn btn-secondaire" id="retour">Retour</button>' : ''}<button class="btn" type="submit">${etape < 3 ? 'Continuer' : 'Terminer'}</button></div></form></div>`;
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
    vue.innerHTML = `<div class="centre"><form class="carte" novalidate><h1>Connexion</h1>
      ${champ('email', 'Email ou identifiant', 'text', 'required autocomplete="username" autocapitalize="off" spellcheck="false"')}${champ('mdp', 'Mot de passe', 'password', 'required autocomplete="current-password"')}
      <div class="actions"><button class="btn" type="submit">Se connecter</button></div>
      <p class="doux">Mot de passe oublié : demande à l’administrateur de le réinitialiser.</p>
      ${session.inscription ? '<p><a href="#/inscription">Créer un compte</a></p>' : ''}</form></div>`;
    formulaire(vue.querySelector('form'), async d => { await api('POST', '/api/connexion', d); await chargerSession(); aller('#/'); });
  });

  ecran('#/inscription', { titre: 'Créer un compte', role: 'public' }, async vue => {
    if (!session.inscription) return aller('#/connexion');
    vue.innerHTML = `<div class="centre"><form class="carte" novalidate><h1>Créer un compte</h1>
      ${champ('nom', 'Nom', 'text', 'autocomplete="name"')}${champ('email', 'Email', 'email', 'required autocomplete="email"')}
      ${champ('mdp', 'Mot de passe', 'password', 'required autocomplete="new-password"')}${mdpAide()}
      <div class="actions"><button class="btn" type="submit">Créer</button></div><p><a href="#/connexion">J’ai déjà un compte</a></p></form></div>`;
    formulaire(vue.querySelector('form'), async d => { await api('POST', '/api/inscription', d); await chargerSession(); aller('#/'); });
  });

  ecran('#/mot-de-passe', { titre: 'Mot de passe' }, async vue => {
    const force = session.utilisateur.mdp_a_changer;
    vue.innerHTML = `<div class="centre"><form class="carte" novalidate><h1>${force ? 'Choisis ton mot de passe' : 'Changer de mot de passe'}</h1>
      ${force ? '<p>Ton mot de passe est provisoire : choisis le tien pour continuer.</p>' : ''}
      ${champ('ancien', force ? 'Mot de passe provisoire' : 'Mot de passe actuel', 'password', 'required autocomplete="current-password"')}
      ${champ('nouveau', 'Nouveau mot de passe', 'password', 'required autocomplete="new-password"')}${mdpAide()}
      <div class="actions"><button class="btn" type="submit">Enregistrer</button>${force ? '' : '<a class="btn btn-secondaire" href="#/compte">Annuler</a>'}</div></form></div>`;
    formulaire(vue.querySelector('form'), async d => { await api('POST', '/api/moi/mdp', d); await chargerSession(); toast('Mot de passe enregistré.'); aller(force ? '#/' : '#/compte'); });
  });

  ecran('#/compte', { titre: 'Mon compte' }, async vue => {
    const u = session.utilisateur;
    vue.innerHTML = `<h1>Mon compte</h1><div class="carte"><p><strong>${esc(u.nom || u.email)}</strong></p><p class="doux">${esc(u.email)} · ${esc(u.role)}</p>
      <div class="actions"><a class="btn btn-secondaire" href="#/mot-de-passe">Changer de mot de passe</a>
      ${u.role === 'admin' ? '<a class="btn btn-secondaire" href="#/admin">Dépannage admin</a>' : ''}
      <button class="btn btn-secondaire" id="deconnexion">Se déconnecter</button></div></div>
      <p class="doux">${esc(session.app.nom)} · version ${esc(session.app.version)}</p>`;
    $('#deconnexion').onclick = async () => { await api('POST', '/api/deconnexion'); session.utilisateur = null; appli.utilisateur = null; aller('#/connexion'); };
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
        <label class="champ"><span>Rôle</span><select name="role">${comptes.roles.map(r => `<option${r === 'utilisateur' ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
        <button class="btn" type="submit">Créer</button></form><p id="provisoire" class="carte" hidden></p></div>`;
    const montrer = (email, mdp) => { const p = $('#provisoire'); p.hidden = false; p.innerHTML = `Mot de passe provisoire de ${esc(email)} : <span class="code">${esc(mdp)}</span><br><span class="doux">Transmets-le ; il devra le changer à sa première connexion.</span>`; };
    vue.querySelectorAll('[data-mdp]').forEach(b => b.onclick = async () => {
      if (!confirm('Générer un nouveau mot de passe provisoire ?')) return;
      try { const r = await api('POST', `/api/admin/utilisateurs/${encodeURIComponent(b.dataset.mdp)}/mdp`); montrer(r.utilisateur.email, r.mdpProvisoire); } catch (e) { toast(e.message, true); }
    });
    formulaire($('#nouveau-compte'), async d => { const r = await api('POST', '/api/admin/utilisateurs', d); toast('Compte créé.'); await afficher(); montrer(r.utilisateur.email, r.mdpProvisoire); });
  });

  const appli = window.appli = { api, esc, toast, formulaire, ecran, aller, utilisateur: null, session: () => session };

  document.addEventListener('DOMContentLoaded', async () => {
    $('#bouton-compte').onclick = () => aller('#/compte');
    window.addEventListener('hashchange', afficher);
    try { await chargerSession(); } catch (e) { $('#vue').innerHTML = `<p class="vide erreur">${esc(e.message)}</p>`; return; }
    afficher();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
})();
