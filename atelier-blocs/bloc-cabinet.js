/* ==========================================================================
   bloc-cabinet.js — blocs « Serveur du cabinet » et « Équipe du cabinet »
   Pour un cabinet de groupe : les données vont sur le serveur du cabinet
   (API PodoLogiciel, PostgreSQL chez un hébergeur de données de santé)
   au lieu de rester sur l'appareil.
   - Serveur du cabinet : connexion e-mail + mot de passe + code de double
     authentification, déconnexion après inactivité ; remplace la lecture et
     l'écriture des tables patients, bilans, rdv, factures et journal par
     l'API (/api). À placer en premier dans l'app, avant les autres blocs.
   - Équipe du cabinet : « Mon compte » (mot de passe, en-tête des factures)
     et « Équipe » (comptes et rôles, réservé à l'administrateur).
   Aucun secret dans l'app : la session est un cookie HttpOnly posé par le
   serveur, la clé de chiffrement des données reste sur le serveur.
   Dans le code des blocs : pas de backtick ni de barre oblique inverse.
   ========================================================================== */
(function () {
  const ESC = `const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const ROLES = { admin: 'Administrateur', praticien: 'Praticien', secretariat: 'Secrétariat' };
`;

  /* ======================= Serveur du cabinet ======================= */
  AB.blocs.declarer({
    id: 'serveur-cabinet', nom: 'Serveur du cabinet', version: '1.0.0', categorie: 'Technique', icone: 'mdi-server-security',
    description: 'Cabinet de groupe : connexion avec double authentification et données sur le serveur du cabinet (API PodoLogiciel + PostgreSQL chez un hébergeur HDS). Les blocs Patients, Bilans, Agenda, Facturation et Journal passent en mode équipe. À placer en premier.',
    reglages: [
      { cle: 'titre', label: 'Titre de l’écran de connexion', type: 'texte', defaut: 'Connexion au cabinet' },
      { cle: 'minutes', label: 'Déconnexion après inactivité (minutes)', type: 'nombre', defaut: 15 },
      { cle: 'aide', label: 'Aide sous le formulaire', type: 'texte', defaut: 'Mot de passe oublié ou téléphone perdu : demande à l’administrateur du cabinet de réinitialiser ton compte.' }
    ],
    init: `// Les tables du cabinet sont lues et écrites sur le serveur ; les autres restent sur l'appareil
const TABLES = ['patients', 'bilans', 'rdv', 'factures', 'journal'];
const cache = {};
TABLES.forEach(t => { cache[t] = []; });
const local = { lire: appli.lire, enregistrer: appli.enregistrer, modifier: appli.modifier, supprimer: appli.supprimer };
appli.serveurDonnees = true;
appli.equipe = [];
appli.moi = null;

/** Appel à l'API du cabinet ; le cookie de session part tout seul (même origine). */
async function api(methode, chemin, corps) {
  const r = await fetch('api/' + chemin, {
    method: methode, credentials: 'same-origin', cache: 'no-store',
    headers: methode === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Podo': '1' },
    body: methode === 'GET' ? undefined : JSON.stringify(corps || {})
  });
  let j = {};
  try { j = await r.json(); } catch (e) { /* réponse vide */ }
  if (r.status === 401 && appli.utilisateur && chemin !== 'mot-de-passe') fin('Session expirée : reconnecte-toi.');
  if (r.status === 403 && j.doitChanger) { const p = appli.pageDu('equipe-cabinet'); if (p) appli.aller(p); }
  if (!r.ok) { const e = new Error(j.erreur || 'Erreur du serveur (' + r.status + ')'); e.statut = r.status; throw e; }
  return j;
}
appli.api = api;
const signaler = table => document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table: table, serveur: true } }));
function remplir(d) {
  ['patients', 'bilans', 'rdv', 'factures'].forEach(t => { cache[t] = d[t] || []; });
  appli.equipe = d.equipe || [];
  if (d.moi) appli.moi = d.moi;
}
async function charger() { remplir(await api('GET', 'donnees')); signaler('*'); }
appli.rafraichir = async table => {
  if (!appli.utilisateur || (appli.moi && appli.moi.doit_changer)) return;
  try {
    if (table === 'journal') { cache.journal = (await api('GET', 'journal')).journal || []; signaler('journal'); }
    else await charger();
  } catch (e) { if (e.statut !== 401) appli.toast(e.message); }
};

// Écritures : affichées tout de suite, envoyées dans l'ordre ; la réponse du serveur fait foi
let file = Promise.resolve(), enCours = 0;
function envoyer(methode, chemin, corps, apres) {
  enCours++;
  file = file.then(() => api(methode, chemin, corps)).then(r => { if (apres) apres(r); }).catch(e => {
    if (e.statut === 401) return;
    appli.toast(e.message || 'Enregistrement impossible.');
    return charger().catch(() => {});
  }).finally(() => { enCours--; });
  return file;
}
const remplacer = (table, ligne) => {
  const l = cache[table], i = l.findIndex(x => x.id === ligne.id);
  if (i >= 0) l[i] = ligne; else l.push(ligne);
  signaler(table);
};
const duServeur = t => TABLES.includes(t) && t !== 'journal';
appli.lire = t => TABLES.includes(t) ? cache[t] : local.lire(t);
appli.enregistrer = (table, ligne) => {
  if (!duServeur(table)) return local.enregistrer(table, ligne);
  const l = Object.assign({ id: crypto.randomUUID(), cree_le: new Date().toISOString() }, ligne);
  cache[table].push(l);
  envoyer('POST', table, l, r => remplacer(table, r.ligne));
  return l;
};
appli.modifier = (table, id, champs) => {
  if (!duServeur(table)) return local.modifier(table, id, champs);
  const l = cache[table].find(x => x.id === id);
  if (!l) return null;
  Object.assign(l, champs, { modifie_le: new Date().toISOString() });
  envoyer('PATCH', table + '/' + id, champs, r => remplacer(table, r.ligne));
  return l;
};
appli.supprimer = (table, id) => {
  if (!duServeur(table)) return local.supprimer(table, id);
  cache[table] = cache[table].filter(x => x.id !== id);
  // La base supprime aussi les bilans et rendez-vous du patient (les factures restent)
  if (table === 'patients') { cache.bilans = cache.bilans.filter(b => b.patient !== id); cache.rdv = cache.rdv.filter(r => r.patient !== id); }
  envoyer('DELETE', table + '/' + id);
};
// Journal : le serveur note déjà les connexions et les écritures ; l'app ajoute consultations, impressions, exports
const DEJA_NOTE = /^(création|modification|suppression|archivage|désarchivage|paiement|rendez-vous )/;
appli.tracer = (action, detail) => {
  if (!appli.utilisateur || (appli.moi && appli.moi.doit_changer) || DEJA_NOTE.test(String(action))) return;
  envoyer('POST', 'journal', { action: String(action || '').slice(0, 80), detail: String(detail || '').slice(0, 200) });
};

/* ---------- Session ---------- */
function fin(message) {
  TABLES.forEach(t => { cache[t] = []; });
  appli.equipe = []; appli.moi = null;
  if (appli.utilisateur) appli.definirUtilisateur(null, 'SIGNED_OUT');
  if (message) appli.toast(message);
  appli.exigerConnexion();
}
appli.deconnecter = async message => { try { await api('POST', 'deconnexion'); } catch (e) { /* déjà déconnecté */ } fin(message); };
/** Après les deux facteurs : charge les données (sauf mot de passe provisoire à changer). */
appli.entrer = async moi => {
  appli.moi = moi;
  if (!moi.doit_changer) remplir(await api('GET', 'donnees'));
  appli.definirUtilisateur({ id: moi.id, email: moi.email, nom: moi.nom, role: moi.role }, 'SIGNED_IN');
  signaler('*');
};

// Onglets selon le rôle : Bilans pour les praticiens, Équipe pour l'administrateur
function onglets() {
  const role = appli.moi ? appli.moi.role : '';
  document.querySelectorAll('.ap-page').forEach(p => {
    const o = document.querySelector('.ap-onglet[data-page="' + p.dataset.page + '"]');
    if (!o) return;
    const masque = (p.dataset.bloc === 'bilan-podo' && role === 'secretariat') || (p.dataset.bloc === 'equipe-cabinet' && /-equipe$/.test(p.dataset.page) && role !== 'admin');
    o.hidden = masque;
  });
}

// Déconnexion : bouton dans l'en-tête, et après inactivité
const delai = Math.max(1, Number(reglages.minutes) || 15) * 60000;
let minuteur = null;
const relancer = () => { clearTimeout(minuteur); if (appli.utilisateur) minuteur = setTimeout(() => appli.deconnecter('Déconnecté après ' + Math.round(delai / 60000) + ' minutes d’inactivité.'), delai); };
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, relancer, { passive: true }));
const b = document.createElement('button');
b.type = 'button'; b.className = 'sc-bouton'; b.hidden = true;
b.addEventListener('click', () => appli.deconnecter());
const entete = document.querySelector('.ap-entete');
if (entete) entete.appendChild(b);
appli.surUtilisateur(u => { b.hidden = !u; b.textContent = 'Déconnexion'; b.title = u ? 'Connecté : ' + (u.nom || u.email) : ''; onglets(); relancer(); });

// Les autres postes du cabinet écrivent aussi : on recharge chaque minute, et au retour sur l'app
setInterval(() => { if (appli.utilisateur && enCours === 0 && document.visibilityState === 'visible') appli.rafraichir(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && enCours === 0) appli.rafraichir(); });

// Au démarrage : session encore ouverte ?
setTimeout(async () => {
  try { await appli.entrer((await api('GET', 'moi')).moi); }
  catch (e) { appli.exigerConnexion(); }
}, 0);`,
    ecrans: [{
      id: 'connexion', titre: '{{titre}}', icone: 'mdi-shield-account-outline', role: 'connexion', cache: true,
      html: `<div class="carte sc-boite">
  <span class="mdi mdi-shield-account-outline sc-icone"></span>
  <h1 class="titre">{{titre}}</h1>
  <form data-mdp>
    <div class="champ"><label for="sc-email">E-mail</label><input id="sc-email" name="email" type="email" autocomplete="username" required></div>
    <div class="champ"><label for="sc-mdp">Mot de passe</label><input id="sc-mdp" name="mdp" type="password" autocomplete="current-password" required></div>
    <button class="btn large" type="submit">Continuer</button>
  </form>
  <form data-code hidden>
    <div data-enrolement hidden>
      <p><b>Première connexion : active la double authentification.</b></p>
      <ol class="sc-etapes">
        <li>Installe une application d’authentification sur ton téléphone (Google Authenticator, Microsoft Authenticator, FreeOTP…).</li>
        <li>Ajoute un compte avec la clé ci-dessous (saisie manuelle, type « basé sur l’heure ») : <code class="sc-secret" data-secret></code> <a class="sc-lien" data-lien>ou touche ici depuis le téléphone</a></li>
        <li>Saisis le code à 6 chiffres qu’elle affiche.</li>
      </ol>
    </div>
    <p data-texte-code>Saisis le code à 6 chiffres de ton application d’authentification.</p>
    <div class="champ"><label for="sc-code">Code de vérification</label><input id="sc-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required></div>
    <button class="btn large" type="submit">Se connecter</button>
    <button class="btn lien" type="button" data-retour>‹ Changer d’e-mail</button>
  </form>
  <p class="discret">{{aide}}</p>
</div>`,
      css: `.sc-boite { max-width: 420px; margin: 24px auto; text-align: center; }
.sc-boite form { text-align: left; }
.sc-icone { font-size: 40px; color: var(--accent); }
.sc-etapes { padding-left: 20px; font-size: 14px; }
.sc-etapes li { margin-bottom: 6px; }
.sc-secret { display: inline-block; font-size: 15px; letter-spacing: 1px; background: var(--fond); border: 1px solid var(--bordure); border-radius: 6px; padding: 4px 8px; margin: 4px 0; word-break: break-all; user-select: all; }
.sc-lien { display: block; font-size: 13px; color: var(--accent); }
.sc-bouton { margin-left: auto; background: rgba(255,255,255,.15); color: #fff; border: 1px solid rgba(255,255,255,.4); border-radius: 6px; padding: 4px 10px; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }`,
      js: `// Étape 1 : e-mail et mot de passe ; étape 2 : code de double authentification
const f1 = racine.querySelector('[data-mdp]'), f2 = racine.querySelector('[data-code]');
function etape(n) {
  f1.hidden = n !== 1; f2.hidden = n !== 2;
  (n === 1 ? f1.elements.email : f2.elements.code).focus();
}
f1.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await appli.api('POST', 'connexion', { email: f1.elements.email.value.trim(), mdp: f1.elements.mdp.value });
    f1.elements.mdp.value = '';
    const enrol = r.etape === 'enrolement';
    racine.querySelector('[data-enrolement]').hidden = !enrol;
    racine.querySelector('[data-texte-code]').hidden = enrol;
    if (enrol) {
      racine.querySelector('[data-secret]').textContent = r.secret.match(/.{1,4}/g).join(' ');
      racine.querySelector('[data-lien]').href = r.uri;
    }
    etape(2);
  } catch (x) { appli.toast(x.message); }
});
f2.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await appli.api('POST', 'totp', { code: f2.elements.code.value.split(' ').join('') });
    const retour = appli.retour;
    f2.reset();
    racine.querySelector('[data-secret]').textContent = '';
    await appli.entrer(r.moi);
    etape(1);
    f1.reset();
    if (r.moi.doit_changer) {
      appli.toast('Bienvenue ! Choisis maintenant ton mot de passe personnel.');
      const p = appli.pageDu('equipe-cabinet');
      if (p) return appli.aller(p);
    }
    // On quitte l'écran de connexion pour le premier écran de l'app
    if (!retour && document.querySelector('.ap-page.active') === racine.closest('.ap-page')) {
      const p = document.querySelector('.ap-page:not([data-cache])');
      if (p) appli.aller(p.dataset.page);
    }
  } catch (x) {
    appli.toast(x.message);
    f2.elements.code.value = '';
    if (x.statut === 401 && /Session/.test(x.message)) etape(1);
  }
});
racine.querySelector('[data-retour]').addEventListener('click', () => etape(1));`
    }],
    journal: [{ version: '1.0.0', date: '2026-10-21', texte: 'Première version : connexion avec double authentification, données sur le serveur du cabinet' }]
  });

  /* ======================= Équipe du cabinet ======================= */
  AB.blocs.declarer({
    id: 'equipe-cabinet', nom: 'Équipe du cabinet', version: '1.0.0', categorie: 'Technique', icone: 'mdi-account-group-outline',
    description: 'Avec le Serveur du cabinet : « Mon compte » (mot de passe, en-tête des factures du praticien) et « Équipe » (comptes, rôles praticien / secrétariat / administrateur, réinitialisation), réservé à l’administrateur.',
    donneesPersonnelles: true,
    dependances: ['serveur-cabinet'],
    reglages: [
      { cle: 'onglet', label: 'Nom de l’onglet du compte', type: 'texte', defaut: 'Mon compte' },
      { cle: 'ongletEquipe', label: 'Nom de l’onglet de l’équipe', type: 'texte', defaut: 'Équipe' }
    ],
    ecrans: [{
      id: 'compte', titre: '{{onglet}}', icone: 'mdi-account-cog-outline',
      html: `<h1 class="titre">Mon compte</h1>
<p class="sous-titre" data-qui></p>
<form class="carte" data-mdp>
  <h2 class="eq-h2">Mot de passe</h2>
  <p class="eq-alerte" data-provisoire hidden>Ton mot de passe est provisoire : choisis le tien pour accéder aux dossiers.</p>
  <div class="champ"><label for="eq-ancien">Mot de passe actuel</label><input id="eq-ancien" name="ancien" type="password" autocomplete="current-password" required></div>
  <div class="champ"><label for="eq-nouveau">Nouveau mot de passe (12 caractères au moins)</label><input id="eq-nouveau" name="nouveau" type="password" autocomplete="new-password" minlength="12" required></div>
  <div class="champ"><label for="eq-conf">Confirmer</label><input id="eq-conf" name="confirmation" type="password" autocomplete="new-password" required></div>
  <button class="btn large" type="submit">Changer le mot de passe</button>
  <p class="discret">Astuce : une phrase de 4 ou 5 mots est longue et facile à retenir.</p>
</form>
<form class="carte" data-profil hidden>
  <h2 class="eq-h2">En-tête de mes factures</h2>
  <div class="champ"><label for="eq-cabinet">Nom du cabinet</label><input id="eq-cabinet" name="cabinet"></div>
  <div class="champ"><label for="eq-adresse">Adresse</label><textarea id="eq-adresse" name="adresse" rows="2"></textarea></div>
  <div class="champ"><label for="eq-tel">Téléphone</label><input id="eq-tel" name="telephone" type="tel"></div>
  <div class="champ"><label for="eq-id">Identifiants (RPPS, SIRET, ADELI)</label><input id="eq-id" name="identifiants"></div>
  <div class="champ"><label for="eq-mention">Mention TVA</label><input id="eq-mention" name="mention" placeholder="TVA non applicable, article 261-4-1° du CGI"></div>
  <button class="btn" type="submit">Enregistrer</button>
</form>`,
      css: `.eq-h2 { font-size: 16px; margin: 0 0 10px; }
.eq-alerte { background: #fff4e5; color: #8a4b00; border-radius: var(--rayon); padding: 8px 12px; font-size: 14px; }
.eq-compte { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
.eq-compte .eq-qui { flex: 1; min-width: 180px; }
.eq-compte select { font: inherit; font-size: 13px; padding: 4px; border: 1px solid var(--bordure); border-radius: 6px; }
.eq-tag { font-size: 11px; background: var(--bordure); border-radius: 10px; padding: 2px 8px; }
.eq-inactif { opacity: .55; }
.eq-mdp-prov { font-size: 18px; letter-spacing: 1px; user-select: all; }`,
      js: ESC + `// Mon compte : mot de passe et profil (en-tête des factures)
const fm = racine.querySelector('[data-mdp]'), fp = racine.querySelector('[data-profil]');
function dessiner() {
  const m = appli.moi;
  if (!m) return;
  racine.querySelector('[data-qui]').textContent = m.nom + ' · ' + m.email + ' · ' + (ROLES[m.role] || m.role);
  racine.querySelector('[data-provisoire]').hidden = !m.doit_changer;
  fp.hidden = m.role === 'secretariat' || m.doit_changer;
  ['cabinet', 'adresse', 'telephone', 'identifiants', 'mention'].forEach(k => { fp.elements[k].value = (m.profil || {})[k] || ''; });
}
fm.addEventListener('submit', async e => {
  e.preventDefault();
  if (fm.elements.nouveau.value !== fm.elements.confirmation.value) return appli.toast('Les deux mots de passe sont différents.');
  try {
    const avant = appli.moi.doit_changer;
    const r = await appli.api('POST', 'mot-de-passe', { ancien: fm.elements.ancien.value, nouveau: fm.elements.nouveau.value });
    fm.reset();
    appli.toast('Mot de passe changé. Les autres sessions ouvertes sont fermées.');
    if (avant) {
      await appli.entrer(r.moi);
      const p = document.querySelector('.ap-page:not([data-cache])');
      if (p) appli.aller(p.dataset.page);
    } else appli.moi = r.moi;
    dessiner();
  } catch (x) { appli.toast(x.message); }
});
fp.addEventListener('submit', async e => {
  e.preventDefault();
  const profil = {};
  ['cabinet', 'adresse', 'telephone', 'identifiants', 'mention'].forEach(k => { profil[k] = fp.elements[k].value.trim(); });
  try {
    appli.moi = (await appli.api('PATCH', 'moi', { profil })).moi;
    appli.toast('Profil enregistré');
    appli.rafraichir();
  } catch (x) { appli.toast(x.message); }
});
racine.closest('.ap-page').addEventListener('ap:affiche', dessiner);
appli.surUtilisateur(dessiner);`
    }, {
      id: 'equipe', titre: '{{ongletEquipe}}', icone: 'mdi-account-group-outline',
      html: `<h1 class="titre">Équipe du cabinet</h1>
<p class="sous-titre">Comptes, rôles et accès. Le praticien voit le dossier médical de ses patients et de ceux qu’on lui partage ; le secrétariat voit l’identité des patients, l’agenda et les factures.</p>
<div class="carte discret" data-refus hidden>Cet écran est réservé à l’administrateur du cabinet.</div>
<div data-admin hidden>
  <ul class="liste" data-liste></ul>
  <div class="carte" data-prov hidden></div>
  <form class="carte" data-form>
    <h2 class="eq-h2">Ajouter un compte</h2>
    <div class="champ"><label for="eq-nom">Nom et prénom</label><input id="eq-nom" name="nom" required></div>
    <div class="champ"><label for="eq-email">E-mail</label><input id="eq-email" name="email" type="email" required></div>
    <div class="champ"><label for="eq-role">Rôle</label><select id="eq-role" name="role"><option value="praticien">Praticien</option><option value="secretariat">Secrétariat</option><option value="admin">Administrateur (praticien qui gère les comptes)</option></select></div>
    <div class="champ" data-champ-code><label for="eq-code">Initiales (numéro des factures, ex. CD)</label><input id="eq-code" name="code" maxlength="6"></div>
    <button class="btn" type="submit">Créer le compte</button>
    <p class="discret">Un mot de passe provisoire s’affiche une seule fois : remets-le en main propre. À la première connexion, la personne choisit son mot de passe et active la double authentification.</p>
  </form>
</div>`,
      js: ESC + `// Équipe : comptes du cabinet (administrateur)
const form = racine.querySelector('[data-form]');
let comptes = [];
function provisoire(c, mdp) {
  const d = racine.querySelector('[data-prov]');
  d.hidden = false;
  d.innerHTML = '<p>Mot de passe provisoire de <b>' + esc(c.nom) + '</b> (' + esc(c.email) + '), affiché une seule fois :</p><p class="eq-mdp-prov">' + esc(mdp) + '</p><p class="discret">Remets-le en main propre. La personne le changera et activera la double authentification à sa première connexion.</p>';
  d.scrollIntoView({ block: 'center' });
}
function dessiner() {
  const id = appli.moi ? appli.moi.id : '';
  racine.querySelector('[data-liste]').innerHTML = comptes.map(c => '<li class="eq-compte' + (c.actif ? '' : ' eq-inactif') + '"><span class="eq-qui"><b>' + esc(c.nom) + '</b>' + (c.code ? ' <span class="eq-tag">' + esc(c.code) + '</span>' : '') + '<br><span class="discret">' + esc(c.email) + ' · ' + (c.totp_actif ? 'double authentification active' : 'première connexion à faire') + (c.actif ? '' : ' · désactivé') + '</span></span>'
    + '<select data-role="' + esc(c.id) + '" aria-label="Rôle"' + (c.id === id ? ' disabled' : '') + '>' + Object.keys(ROLES).map(r => '<option value="' + r + '"' + (r === c.role ? ' selected' : '') + '>' + esc(ROLES[r]) + '</option>').join('') + '</select>'
    + '<button class="btn lien" type="button" data-reinit="' + esc(c.id) + '">Réinitialiser</button>'
    + (c.id === id ? '' : '<button class="btn lien" type="button" data-actif="' + esc(c.id) + '">' + (c.actif ? 'Désactiver' : 'Réactiver') + '</button>') + '</li>').join('');
  racine.querySelectorAll('[data-role]').forEach(s => s.addEventListener('change', () => modifier(s.dataset.role, { role: s.value })));
  racine.querySelectorAll('[data-reinit]').forEach(b => b.addEventListener('click', () => {
    const c = comptes.find(x => x.id === b.dataset.reinit);
    if (confirm('Réinitialiser le compte de ' + c.nom + ' ? Nouveau mot de passe provisoire et nouvelle double authentification (téléphone perdu, oubli).')) modifier(c.id, { reinitialiser: true });
  }));
  racine.querySelectorAll('[data-actif]').forEach(b => b.addEventListener('click', () => {
    const c = comptes.find(x => x.id === b.dataset.actif);
    if (!c.actif || confirm('Désactiver le compte de ' + c.nom + ' ? Ses sessions sont fermées ; ses dossiers, rendez-vous et factures restent.')) modifier(c.id, { actif: !c.actif });
  }));
}
async function charger() {
  const admin = appli.moi && appli.moi.role === 'admin';
  racine.querySelector('[data-refus]').hidden = admin;
  racine.querySelector('[data-admin]').hidden = !admin;
  if (!admin) return;
  try { comptes = (await appli.api('GET', 'comptes')).comptes; dessiner(); } catch (x) { appli.toast(x.message); }
}
async function modifier(id, champs) {
  try {
    const r = await appli.api('PATCH', 'comptes/' + id, champs);
    if (r.mdp) provisoire(r.compte, r.mdp); else appli.toast('Compte modifié');
    await charger();
    appli.rafraichir();
  } catch (x) { appli.toast(x.message); charger(); }
}
form.elements.role.addEventListener('change', () => { racine.querySelector('[data-champ-code]').hidden = form.elements.role.value === 'secretariat'; });
form.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await appli.api('POST', 'comptes', { nom: form.elements.nom.value.trim(), email: form.elements.email.value.trim(), role: form.elements.role.value, code: form.elements.role.value === 'secretariat' ? '' : form.elements.code.value.trim() });
    form.reset();
    racine.querySelector('[data-champ-code]').hidden = false;
    provisoire(r.compte, r.mdp);
    await charger();
    appli.rafraichir();
  } catch (x) { appli.toast(x.message); }
});
racine.closest('.ap-page').addEventListener('ap:affiche', charger);`
    }],
    journal: [{ version: '1.0.0', date: '2026-10-21', texte: 'Première version : Mon compte et gestion de l’équipe' }]
  });
})();
