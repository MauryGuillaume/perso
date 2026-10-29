/* JS généré par l'Atelier de Blocs — PodoLogiciel Cabinet */
(function () {
  'use strict';
  const APERCU = !!window.AB_APERCU;
  const KITS = {"charte":{"primaire":"#0f3d4c","accent":"#0e7c86","fond":"#f4f5f7","texte":"#101012","police":"Inter","rayon":12},"securite":{"mdpMin":12,"httpsObligatoire":true,"csp":true,"protegerDonneesPerso":true,"mdpComplexe":true,"entetes":true,"auditExport":"bloquer"},"affichage":{"langue":"fr-FR","devise":"EUR","formatDate":"court","mentions":"","bandeauCookies":true,"texteCookies":"Cette app utilise uniquement les cookies nécessaires à son fonctionnement."}};
  const CONFIG = {};
  const reglages = {"serveur-connexion":{"titre":"Connexion au cabinet","minutes":15,"aide":"Mot de passe oublié ou téléphone perdu : demande à l’administrateur du cabinet de réinitialiser ton compte.","__instance":"serveur"},"agenda-agenda":{"onglet":"Agenda","debut":8,"fin":19,"duree":30,"__instance":"agenda"},"patients-patients":{"onglet":"Patients","__instance":"patients"},"bilans-bilans":{"onglet":"Bilans","cabinet":"Cabinet de pédicurie-podologie","__instance":"bilans"},"factures-factures":{"onglet":"Factures","actes":"Soin de pédicurie-podologie — 35\nBilan podologique — 45\nSemelles orthopédiques — 150\nSoin à domicile — 45","cabinet":"Cabinet de pédicurie-podologie","praticien":"","adresse":"","identifiants":"","mention":"TVA non applicable, article 261-4-1° du CGI","__instance":"factures"},"journal-journal":{"onglet":"Journal","garder":5000,"__instance":"journal"},"equipe-compte":{"onglet":"Mon compte","ongletEquipe":"Équipe","__instance":"equipe"},"equipe-equipe":{"onglet":"Mon compte","ongletEquipe":"Équipe","__instance":"equipe"},"serveur":{"titre":"Connexion au cabinet","minutes":15,"aide":"Mot de passe oublié ou téléphone perdu : demande à l’administrateur du cabinet de réinitialiser ton compte.","__instance":"serveur"},"journal":{"onglet":"Journal","garder":5000,"__instance":"journal"}};
  const CLE_DONNEES = "app-podologiciel-cabinet";

  // HTTPS obligatoire (kit cybersécurité), sauf en local et dans l'aperçu
  if (KITS.securite.httpsObligatoire && !APERCU && location.protocol === 'http:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    location.replace('https://' + location.host + location.pathname + location.search + location.hash);
    return;
  }

  // Stockage local (dans l'aperçu, le navigateur le bloque : on garde alors en mémoire)
  const memoire = {};
  const stockage = {
    get(cle) { try { const v = localStorage.getItem(CLE_DONNEES + ':' + cle); return v === null ? memoire[cle] : JSON.parse(v); } catch (e) { return memoire[cle]; } },
    set(cle, valeur) { memoire[cle] = valeur; try { localStorage.setItem(CLE_DONNEES + ':' + cle, JSON.stringify(valeur)); } catch (e) { /* mémoire seulement */ } }
  };

  // Services partagés entre blocs : un bloc « fournit », les autres « attendent »
  const services = {}, attentes = {};
  const ecouteurs = [];
  const fmtPrix = new Intl.NumberFormat(KITS.affichage.langue || 'fr-FR', { style: 'currency', currency: KITS.affichage.devise || 'EUR' });

  const appli = {
    apercu: APERCU,
    demo: APERCU,              // le bloc Connexion passe aussi en démo sans configuration
    config: CONFIG,
    kit: type => KITS[type] || {},
    stockage,
    utilisateur: null,
    retour: null,
    aller(page) { location.hash = page; },
    toast(texte) {
      const t = document.createElement('div');
      t.className = 'ap-toast'; t.textContent = texte;
      document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
    },
    lire(table) { return stockage.get('table:' + table) || []; },
    enregistrer(table, ligne) {
      const lignes = appli.lire(table);
      ligne = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cree_le: new Date().toISOString() }, ligne);
      lignes.push(ligne);
      stockage.set('table:' + table, lignes);
      document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table } }));
      return ligne;
    },
    modifier(table, id, champs) {
      const lignes = appli.lire(table), l = lignes.find(x => x.id === id);
      if (!l) return null;
      Object.assign(l, champs, { modifie_le: new Date().toISOString() });
      stockage.set('table:' + table, lignes);
      document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table } }));
      return l;
    },
    supprimer(table, id) {
      stockage.set('table:' + table, appli.lire(table).filter(x => x.id !== id));
      document.dispatchEvent(new CustomEvent('ap:donnees', { detail: { table } }));
    },
    /** Paramètre de l'adresse : #page?patient=… */
    param(nom) { return new URLSearchParams(location.hash.split('?')[1] || '').get(nom); },
    /** Clé de la page du premier écran d'un bloc de l'app (ex. 'patients'), ou ''. */
    pageDu(idBloc) { const p = document.querySelector('.ap-page[data-bloc="' + idBloc + '"]'); return p ? p.dataset.page : ''; },
    tracer() {},
    /** Imprime (ou enregistre en PDF) un document HTML préparé par un bloc, sans le reste de l'app. */
    imprimer(html) {
      let z = document.getElementById('ap-impression');
      if (!z) { z = document.createElement('div'); z.id = 'ap-impression'; document.body.appendChild(z); }
      z.innerHTML = html;
      document.body.classList.add('ap-imprime');
      const fin = () => { document.body.classList.remove('ap-imprime'); window.removeEventListener('afterprint', fin); };
      window.addEventListener('afterprint', fin);
      window.print();
    },
    /** Télécharge un fichier créé par l'app (sauvegarde, export). */
    telecharger(nom, contenu, type) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([contenu], { type: type || 'application/octet-stream' }));
      a.download = nom; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    },
    /** Toutes les données de l'app sur cet appareil (sauvegarde). */
    exporterDonnees() {
      const d = {};
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(CLE_DONNEES + ':')) d[k.slice(CLE_DONNEES.length + 1)] = JSON.parse(localStorage.getItem(k)); } }
      catch (e) { Object.assign(d, memoire); }
      return d;
    },
    importerDonnees(d) { Object.keys(d || {}).forEach(k => stockage.set(k, d[k])); },
    charger(src, integrite) {
      return new Promise((ok, ko) => {
        const s = document.createElement('script');
        // integrite : empreinte SRI, le navigateur refuse le fichier s'il a été modifié sur le CDN
        if (integrite) { s.integrity = integrite; s.crossOrigin = 'anonymous'; }
        s.src = src; s.onload = ok; s.onerror = () => ko(new Error('Chargement impossible : ' + src));
        document.head.appendChild(s);
      });
    },
    fournir(nom, valeur) {
      services[nom] = valeur;
      (attentes[nom] || []).forEach(f => f(valeur));
      delete attentes[nom];
    },
    attendre(nom) {
      if (nom in services) return Promise.resolve(services[nom]);
      return new Promise(ok => (attentes[nom] = attentes[nom] || []).push(ok));
    },
    definirUtilisateur(u, evenement) {
      appli.utilisateur = u || null;
      ecouteurs.forEach(f => f(appli.utilisateur, evenement));
      afficher();
    },
    surUtilisateur(f) { ecouteurs.push(f); f(appli.utilisateur); },
    /** Mène à l'écran de connexion, puis revient ici. Renvoie false si pas connecté. */
    exigerConnexion() {
      if (appli.utilisateur) return true;
      appli.retour = location.hash.slice(1).split('?')[0];
      const p = document.querySelector('.ap-page[data-role="connexion"]');
      if (p) appli.aller(p.dataset.page); else appli.toast('Connexion requise.');
      return false;
    },
    prix: n => fmtPrix.format(Number(n) || 0),
    date(d) {
      const x = new Date(d);
      return KITS.affichage.formatDate === 'long'
        ? x.toLocaleDateString(KITS.affichage.langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : x.toLocaleDateString(KITS.affichage.langue);
    }
  };

  // Contenu modifiable en direct (bloc « Mode admin »)
  const CONTENU = null;
  if (CONTENU) appli.contenu = (function contenuRuntime(CONTENU, reglages, appli) {
    const esc = v => String(v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const lignes = v => Array.isArray(v) ? v : String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
    const gabarit = (texte, r) => String(texte || '')
      .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, cle, corps) => lignes(r[cle]).map(l => corps.replace(/\{\{\.\}\}/g, esc(l))).join(''))
      .replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, cle, corps) => { const v = r[cle]; return v && v !== 'false' ? corps : ''; })
      .replace(/\{\{(\w+)\}\}/g, (m, cle) => esc(r[cle] !== undefined ? r[cle] : ''));
    const titre = (t, r) => String(t).replace(/\{\{(\w+)\}\}/g, (m, c) => r[c] !== undefined ? r[c] : '');
    const reglagesDe = uid => Object.keys(reglages).filter(k => reglages[k].__instance === uid).map(k => reglages[k]);
    /** valeurs : { uid: { cle: texte } } ; seuls les champs déclarés modifiables sont pris. */
    function appliquer(valeurs) {
      Object.keys(valeurs || {}).forEach(uid => {
        const v = {};
        (CONTENU.modifiables[uid] || []).forEach(m => { const x = (valeurs[uid] || {})[m.cle]; if (typeof x === 'string') v[m.cle] = x; });
        if (!Object.keys(v).length) return;
        reglagesDe(uid).forEach(r => Object.assign(r, v));
        Object.keys(CONTENU.gabarits).forEach(cle => {
          const g = CONTENU.gabarits[cle];
          if (g.inst !== uid) return;
          const page = document.querySelector('.ap-page[data-page="' + cle + '"]');
          const racine = page && page.querySelector(':scope > .ap-contenu');
          if (racine) racine.innerHTML = gabarit(g.html, reglages[cle]);
          const o = document.querySelector('.ap-onglet[data-page="' + cle + '"]');
          if (o) { const icone = o.querySelector('.mdi'); o.textContent = titre(g.titre, reglages[cle]); if (icone) o.prepend(icone); }
        });
      });
    }
    return {
      /** Champs modifiables de l'écran affiché, avec leur valeur actuelle. */
      champs(cle) {
        const uid = (CONTENU.gabarits[cle] || {}).inst, r = reglagesDe(uid)[0] || {};
        return { instance: uid, champs: (CONTENU.modifiables[uid] || []).map(m => Object.assign({ valeur: Array.isArray(r[m.cle]) ? r[m.cle].join('\n') : String(r[m.cle] === undefined ? '' : r[m.cle]) }, m)) };
      },
      appliquer,
      /** Avant les écrans : valeurs enregistrées (fournies par le bloc), 2,5 s d'attente au plus, sinon la dernière copie. */
      pret() {
        const copie = appli.stockage.get('contenu') || null;
        return Promise.race([appli.attendre('contenu'), new Promise(ok => setTimeout(() => ok(undefined), 2500))]).then(v => {
          if (v) appli.stockage.set('contenu', v);
          appliquer(v || copie || {});
        });
      }
    };
  })(CONTENU, reglages, appli);

  const inits = [], ecrans = {};
  inits.push(["serveur", function (reglages, appli) {
// Les tables du cabinet sont lues et écrites sur le serveur ; les autres restent sur l'appareil
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
}, 0);
  }]);
  inits.push(["journal", function (reglages, appli) {
// Les autres blocs appellent appli.tracer(action, détail)
// Avec le Serveur du cabinet, c'est le serveur qui tient le journal (bloc placé avant celui-ci)
if (appli.serveurDonnees) return;
const max = Math.max(100, Number(reglages.garder) || 5000);
appli.tracer = function (action, detail) {
  const l = appli.stockage.get('table:journal') || [];
  l.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: new Date().toISOString(),
    qui: appli.utilisateur ? String(appli.utilisateur.email || appli.utilisateur.id) : 'non déverrouillé',
    action: String(action || '').slice(0, 80), detail: String(detail || '').slice(0, 200) });
  appli.stockage.set('table:journal', l.slice(-max));
};
  }]);
  ecrans["serveur-connexion"] = function (racine, reglages, appli) {
// Étape 1 : e-mail et mot de passe ; étape 2 : code de double authentification
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
racine.querySelector('[data-retour]').addEventListener('click', () => etape(1));
  };
  ecrans["agenda-agenda"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const NL = String.fromCharCode(10);
const nomPatient = p => p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : 'Patient supprimé';
const patients = () => appli.lire('patients').filter(p => !p.archive).sort((a, b) => nomPatient(a).localeCompare(nomPatient(b)));
const optionsPatients = (choisi, vide, filtre) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + patients().filter(filtre || Boolean).map(p => '<option value="' + esc(p.id) + '"' + (p.id === choisi ? ' selected' : '') + '>' + esc(nomPatient(p)) + '</option>').join('');
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR') : '';
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// Mode équipe (bloc Serveur du cabinet) : membres, praticiens, droits
const enEquipe = () => !!appli.equipe;
const moi = () => appli.moi || {};
const praticiens = () => (appli.equipe || []).filter(m => m.role !== 'secretariat' && m.actif);
const membre = id => (appli.equipe || []).find(m => m.id === id) || null;
const nomMembre = id => { const m = membre(id); return m ? m.nom : ''; };
const optionsPraticiens = (choisi, vide) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + praticiens().map(m => '<option value="' + esc(m.id) + '"' + (m.id === choisi ? ' selected' : '') + '>' + esc(m.nom) + '</option>').join('');
const soigne = p => !!p && p.acces !== 'identite' && moi().role !== 'secretariat';
const optionsSoignes = (choisi, vide) => optionsPatients(choisi, vide, soigne);
const quandServeur = f => document.addEventListener('ap:donnees', e => { if (e.detail && e.detail.serveur) f(e.detail.table); });
// Agenda du jour
const jour = racine.querySelector('[data-jour]'), form = racine.querySelector('[data-form]');
const STATUTS = ['prévu', 'honoré', 'absent', 'annulé'];
const minutes = h => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + b; };
const hhmm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const decaler = n => { const d = new Date(jour.value + 'T12:00:00'); d.setDate(d.getDate() + n); jour.value = d.toISOString().slice(0, 10); dessiner(); };
// En équipe : filtre par praticien ; le praticien ne voit que son agenda, le secrétariat choisit le praticien du rendez-vous
const filtrePra = racine.querySelector('[data-filtre-pra]');
const choixPra = () => enEquipe() && moi().role !== 'praticien';
let filtreInit = false;
function dessinerEquipe() {
  filtrePra.hidden = !choixPra();
  racine.querySelector('[data-champ-pra]').hidden = !choixPra();
  if (!choixPra()) return;
  if (!filtreInit) { filtreInit = true; filtrePra.dataset.valeur = moi().role === 'admin' ? moi().id : ''; }
  filtrePra.innerHTML = optionsPraticiens(filtrePra.dataset.valeur, 'Tous les praticiens');
  const p = form.elements.praticien.value;
  form.elements.praticien.innerHTML = optionsPraticiens(p, 'Choisir le praticien');
}
function dessiner() {
  dessinerEquipe();
  const pra = choixPra() ? filtrePra.value : '';
  const l = appli.lire('rdv').filter(r => r.date === jour.value && (!pra || r.praticien === pra)).sort((a, b) => minutes(a.heure) - minutes(b.heure));
  const pat = Object.fromEntries(appli.lire('patients').map(p => [p.id, p]));
  const actifs = l.filter(r => r.statut !== 'annulé');
  const prochain = jour.value === aujourdhui() ? actifs.find(r => minutes(r.heure) >= new Date().getHours() * 60 + new Date().getMinutes()) : null;
  racine.querySelector('[data-resume]').textContent = new Date(jour.value + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + actifs.length + ' rendez-vous' + (prochain ? ' · prochain à ' + prochain.heure : '');
  const pagePatients = appli.pageDu('patients');
  racine.querySelector('[data-liste]').innerHTML = l.map(r => '<li class="ag-rdv' + (r.statut === 'annulé' ? ' ag-annule' : '') + '"><span class="ag-heure">' + esc(r.heure) + '–' + esc(hhmm(minutes(r.heure) + Number(r.duree || 0))) + '</span><span class="ag-corps">'
    + (pagePatients && pat[r.patient] ? '<a href="#' + esc(pagePatients) + '?patient=' + esc(r.patient) + '">' + esc(nomPatient(pat[r.patient])) + '</a>' : '<b>' + esc(nomPatient(pat[r.patient])) + '</b>')
    + '<br><span class="discret">' + esc(r.motif || '') + (choixPra() && !pra ? ' · ' + esc(nomMembre(r.praticien)) : '') + '</span></span><select data-statut="' + esc(r.id) + '" aria-label="Statut">' + STATUTS.map(s => '<option' + (s === (r.statut || 'prévu') ? ' selected' : '') + '>' + s + '</option>').join('') + '</select>'
    + '<button class="btn lien pt-danger" type="button" data-suppr="' + esc(r.id) + '" aria-label="Supprimer le rendez-vous">Suppr.</button></li>').join('')
    || '<li class="discret">Aucun rendez-vous ce jour-là.</li>';
  racine.querySelectorAll('[data-statut]').forEach(s => s.addEventListener('change', () => { appli.modifier('rdv', s.dataset.statut, { statut: s.value }); appli.tracer('rendez-vous ' + s.value, ''); dessiner(); }));
  racine.querySelectorAll('[data-suppr]').forEach(b => b.addEventListener('click', () => { if (confirm('Supprimer ce rendez-vous ?')) { appli.supprimer('rdv', b.dataset.suppr); appli.tracer('suppression d’un rendez-vous', ''); dessiner(); } }));
  const choisi = form.elements.patient.value;
  form.elements.patient.innerHTML = optionsPatients(choisi, 'Choisir un patient');
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const v = { patient: form.elements.patient.value, date: form.elements.date.value, heure: form.elements.heure.value, duree: Number(form.elements.duree.value), motif: form.elements.motif.value.trim(), statut: 'prévu' };
  if (enEquipe()) {
    v.praticien = choixPra() ? form.elements.praticien.value : moi().id;
    if (!v.praticien) return appli.toast('Choisis le praticien.');
  }
  const d = minutes(v.heure), f = d + v.duree;
  if (d < Number(reglages.debut) * 60 || f > Number(reglages.fin) * 60) appli.toast('Attention : en dehors des horaires du cabinet.');
  const conflit = appli.lire('rdv').find(r => r.date === v.date && r.statut !== 'annulé' && (!v.praticien || r.praticien === v.praticien) && minutes(r.heure) < f && minutes(r.heure) + Number(r.duree) > d);
  if (conflit && !confirm('Ce créneau chevauche un rendez-vous à ' + conflit.heure + '. L’ajouter quand même ?')) return;
  appli.enregistrer('rdv', v);
  appli.tracer('création d’un rendez-vous', nomPatient(appli.lire('patients').find(p => p.id === v.patient)));
  appli.toast('Rendez-vous ajouté');
  jour.value = v.date;
  form.elements.motif.value = '';
  dessiner();
});
jour.addEventListener('change', dessiner);
filtrePra.addEventListener('change', () => { filtrePra.dataset.valeur = filtrePra.value; dessiner(); });
// Le praticien du rendez-vous est d'abord le référent du patient
form.elements.patient.addEventListener('change', () => {
  const p = appli.lire('patients').find(x => x.id === form.elements.patient.value);
  if (choixPra() && p && p.referent) form.elements.praticien.value = p.referent;
});
quandServeur(dessiner);
racine.querySelector('[data-prec]').addEventListener('click', () => decaler(-1));
racine.querySelector('[data-suiv]').addEventListener('click', () => decaler(1));
racine.querySelector('[data-auj]').addEventListener('click', () => { jour.value = aujourdhui(); dessiner(); });
jour.value = aujourdhui();
form.elements.date.value = aujourdhui();
form.elements.duree.value = Number(reglages.duree) || 30;
racine.closest('.ap-page').addEventListener('ap:affiche', () => {
  dessiner();
  const id = appli.param('patient');
  if (id) { form.elements.patient.value = id; form.elements.patient.dispatchEvent(new Event('change')); form.elements.heure.focus(); form.scrollIntoView({ block: 'start' }); }
});
dessiner();
  };
  ecrans["patients-patients"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const NL = String.fromCharCode(10);
const nomPatient = p => p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : 'Patient supprimé';
const patients = () => appli.lire('patients').filter(p => !p.archive).sort((a, b) => nomPatient(a).localeCompare(nomPatient(b)));
const optionsPatients = (choisi, vide, filtre) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + patients().filter(filtre || Boolean).map(p => '<option value="' + esc(p.id) + '"' + (p.id === choisi ? ' selected' : '') + '>' + esc(nomPatient(p)) + '</option>').join('');
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR') : '';
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// Mode équipe (bloc Serveur du cabinet) : membres, praticiens, droits
const enEquipe = () => !!appli.equipe;
const moi = () => appli.moi || {};
const praticiens = () => (appli.equipe || []).filter(m => m.role !== 'secretariat' && m.actif);
const membre = id => (appli.equipe || []).find(m => m.id === id) || null;
const nomMembre = id => { const m = membre(id); return m ? m.nom : ''; };
const optionsPraticiens = (choisi, vide) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + praticiens().map(m => '<option value="' + esc(m.id) + '"' + (m.id === choisi ? ' selected' : '') + '>' + esc(m.nom) + '</option>').join('');
const soigne = p => !!p && p.acces !== 'identite' && moi().role !== 'secretariat';
const optionsSoignes = (choisi, vide) => optionsPatients(choisi, vide, soigne);
const quandServeur = f => document.addEventListener('ap:donnees', e => { if (e.detail && e.detail.serveur) f(e.detail.table); });
// Liste, recherche et dossier patient
const vueListe = racine.querySelector('[data-vue-liste]'), vueFiche = racine.querySelector('[data-vue-fiche]');
const form = racine.querySelector('[data-form]'), cherche = racine.querySelector('[data-cherche]');
const IDENTITE = ['nom', 'prenom', 'naissance', 'sexe', 'telephone', 'email', 'medecin', 'activite', 'adresse'], MEDICAL = ['antecedents', 'traitements', 'allergies', 'notes'];
const CHAMPS = IDENTITE.concat(MEDICAL);
let courant = null;
// En équipe : le référent (ou l'administrateur) choisit le référent et le partage ; le dossier médical n'est montré qu'aux praticiens qui y ont accès
const responsable = () => !enEquipe() || !courant || courant.referent === moi().id || moi().role === 'admin';
const medicalVisible = () => !enEquipe() || (courant ? soigne(courant) : moi().role !== 'secretariat');
function dessinerEquipe(partageSaisi, refSaisi) {
  const zone = racine.querySelector('[data-equipe]');
  zone.hidden = !enEquipe();
  if (!enEquipe()) return;
  const ref = refSaisi || (courant ? courant.referent : (moi().role !== 'secretariat' ? moi().id : ''));
  form.elements.referent.innerHTML = optionsPraticiens(ref, 'Choisir le praticien');
  const partage = partageSaisi || (courant ? courant.partage || [] : []);
  const pz = racine.querySelector('[data-partage]');
  pz.innerHTML = praticiens().filter(m => m.id !== form.elements.referent.value).map(m => '<label><input type="checkbox" value="' + esc(m.id) + '"' + (partage.includes(m.id) ? ' checked' : '') + '> ' + esc(m.nom) + '</label>').join('') || '<span class="discret">Aucun autre praticien.</span>';
  form.elements.referent.disabled = !responsable();
  pz.querySelectorAll('input').forEach(x => { x.disabled = !responsable(); });
}
const age = d => { if (!d) return ''; const n = new Date(d), a = new Date(); let x = a.getFullYear() - n.getFullYear(); if (a < new Date(a.getFullYear(), n.getMonth(), n.getDate())) x--; return x + ' ans'; };
function liste() {
  const q = cherche.value.trim().toLowerCase(), tous = racine.querySelector('[data-archives]').checked;
  const l = appli.lire('patients').filter(p => tous || !p.archive)
    .filter(p => !q || [p.nom, p.prenom, p.telephone, p.email].join(' ').toLowerCase().includes(q))
    .sort((a, b) => nomPatient(a).localeCompare(nomPatient(b)));
  racine.querySelector('[data-liste]').innerHTML = l.map(p => '<li><button class="pt-ligne" type="button" data-id="' + esc(p.id) + '"><span><b>' + esc(nomPatient(p)) + '</b> <span class="discret">' + esc(age(p.naissance)) + '</span>' + (p.archive ? ' <span class="pt-tag">archivé</span>' : '') + (enEquipe() && p.referent ? ' <span class="pt-tag">' + esc(nomMembre(p.referent)) + '</span>' : '') + '</span><span class="discret">' + esc(p.telephone || '') + '</span></button></li>').join('')
    || '<li class="discret">' + (q ? 'Aucun patient trouvé.' : 'Aucun patient pour l’instant. Ajoute le premier avec « + Patient ».') + '</li>';
  racine.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => ouvrir(b.dataset.id)));
}
function montrerListe() { courant = null; vueFiche.hidden = true; vueListe.hidden = false; liste(); }
function ouvrir(id) {
  courant = id ? appli.lire('patients').find(p => p.id === id) || null : null;
  if (id && !courant) return montrerListe();
  vueListe.hidden = true; vueFiche.hidden = false;
  form.reset();
  CHAMPS.forEach(c => { form.elements[c].value = courant ? courant[c] || '' : ''; });
  form.elements.consentement.checked = !!(courant && courant.consentement);
  racine.querySelector('[data-nom]').textContent = courant ? nomPatient(courant) : 'Nouveau patient';
  racine.querySelector('[data-actions]').hidden = !courant;
  racine.querySelector('[data-medical]').hidden = !medicalVisible();
  racine.querySelector('[data-sans-medical]').hidden = medicalVisible();
  dessinerEquipe();
  racine.querySelectorAll('[data-aller]').forEach(b => { b.hidden = !appli.pageDu(b.dataset.aller) || (b.dataset.aller === 'bilan-podo' && !medicalVisible()); });
  racine.querySelector('[data-archiver]').textContent = courant && courant.archive ? 'Désarchiver' : 'Archiver';
  racine.querySelector('[data-archiver]').hidden = !medicalVisible() && moi().role !== 'admin';
  racine.querySelector('[data-supprimer]').hidden = !responsable();
  historique();
  if (courant) appli.tracer('consultation du dossier', nomPatient(courant));
  window.scrollTo(0, 0);
}
function historique() {
  const h = racine.querySelector('[data-historique]');
  if (!courant) { h.innerHTML = ''; return; }
  const bilans = appli.lire('bilans').filter(b => b.patient === courant.id).sort((a, b) => String(b.date).localeCompare(a.date));
  const rdv = appli.lire('rdv').filter(r => r.patient === courant.id).sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure));
  const factures = appli.lire('factures').filter(f => f.patient === courant.id).sort((a, b) => String(b.date).localeCompare(a.date));
  const bloc = (titre, lignes, vide) => '<h2 class="pt-h2">' + esc(titre) + '</h2><ul class="liste">' + (lignes.join('') || '<li class="discret">' + esc(vide) + '</li>') + '</ul>';
  h.innerHTML = bloc('Bilans (' + bilans.length + ')', bilans.map(b => '<li>' + esc(dateFr(b.date)) + ' · ' + esc(b.motif || 'Bilan') + '</li>'), 'Aucun bilan.')
    + bloc('Rendez-vous (' + rdv.length + ')', rdv.slice(0, 20).map(r => '<li>' + esc(dateFr(r.date)) + ' ' + esc(r.heure) + ' · ' + esc(r.motif || '') + ' <span class="pt-tag">' + esc(r.statut || 'prévu') + '</span></li>'), 'Aucun rendez-vous.')
    + bloc('Factures (' + factures.length + ')', factures.map(f => '<li>' + esc(f.numero) + ' · ' + esc(dateFr(f.date)) + ' · ' + esc(appli.prix(f.total)) + ' <span class="pt-tag">' + esc(f.statut) + '</span></li>'), 'Aucune facture.');
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const v = {};
  (medicalVisible() ? CHAMPS : IDENTITE).forEach(c => { v[c] = form.elements[c].value.trim(); });
  v.consentement = form.elements.consentement.checked;
  if (v.consentement && !(courant && courant.consentement)) v.consentement_le = new Date().toISOString();
  if (enEquipe() && responsable()) {
    if (!form.elements.referent.value) return appli.toast('Choisis le praticien référent.');
    v.referent = form.elements.referent.value;
    v.partage = Array.from(racine.querySelectorAll('[data-partage] input:checked')).map(x => x.value).filter(id => id !== v.referent);
  }
  if (courant) { appli.modifier('patients', courant.id, v); appli.tracer('modification du dossier', nomPatient(v)); }
  else { courant = appli.enregistrer('patients', v); appli.tracer('création du dossier', nomPatient(v)); }
  appli.toast('Dossier enregistré');
  ouvrir(courant.id);
});
racine.querySelector('[data-nouveau]').addEventListener('click', () => ouvrir(null));
racine.querySelector('[data-retour]').addEventListener('click', () => { appli.aller(racine.closest('.ap-page').dataset.page); montrerListe(); });
cherche.addEventListener('input', liste);
racine.querySelector('[data-archives]').addEventListener('change', liste);
form.elements.referent.addEventListener('change', () => dessinerEquipe(Array.from(racine.querySelectorAll('[data-partage] input:checked')).map(x => x.value), form.elements.referent.value));
// Données rechargées depuis le serveur du cabinet : la liste se met à jour (pas la fiche en cours de saisie)
quandServeur(() => { if (vueFiche.hidden) liste(); });
racine.querySelectorAll('[data-aller]').forEach(b => b.addEventListener('click', () => {
  appli.aller(appli.pageDu(b.dataset.aller) + '?patient=' + encodeURIComponent(courant.id) + '&nouveau=1');
}));
racine.querySelector('[data-exporter]').addEventListener('click', () => {
  const dossier = { format: 'dossier-patient/1', exporte_le: new Date().toISOString(), patient: courant,
    bilans: appli.lire('bilans').filter(b => b.patient === courant.id), rendez_vous: appli.lire('rdv').filter(r => r.patient === courant.id),
    factures: appli.lire('factures').filter(f => f.patient === courant.id) };
  appli.telecharger('dossier-' + (courant.nom || 'patient').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json', JSON.stringify(dossier, null, 2), 'application/json');
  appli.tracer('export du dossier', nomPatient(courant));
});
racine.querySelector('[data-archiver]').addEventListener('click', () => {
  appli.modifier('patients', courant.id, { archive: !courant.archive });
  appli.tracer(courant.archive ? 'désarchivage' : 'archivage', nomPatient(courant));
  ouvrir(courant.id);
});
racine.querySelector('[data-supprimer]').addEventListener('click', () => {
  if (!confirm('Supprimer définitivement le dossier de ' + nomPatient(courant) + ' (bilans et rendez-vous compris) ? Les dossiers de soins se conservent en général 20 ans : préfère « Archiver ». Les factures restent (obligation comptable).')) return;
  // Sur le serveur du cabinet, la base supprime elle-même bilans et rendez-vous du patient
  if (!enEquipe()) {
    appli.lire('bilans').filter(b => b.patient === courant.id).forEach(b => appli.supprimer('bilans', b.id));
    appli.lire('rdv').filter(r => r.patient === courant.id).forEach(r => appli.supprimer('rdv', r.id));
  }
  appli.tracer('suppression du dossier', nomPatient(courant));
  appli.supprimer('patients', courant.id);
  montrerListe();
});
racine.closest('.ap-page').addEventListener('ap:affiche', () => {
  const id = appli.param('patient');
  if (id) ouvrir(id); else if (vueFiche.hidden) liste();
});
liste();
  };
  ecrans["bilans-bilans"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const NL = String.fromCharCode(10);
const nomPatient = p => p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : 'Patient supprimé';
const patients = () => appli.lire('patients').filter(p => !p.archive).sort((a, b) => nomPatient(a).localeCompare(nomPatient(b)));
const optionsPatients = (choisi, vide, filtre) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + patients().filter(filtre || Boolean).map(p => '<option value="' + esc(p.id) + '"' + (p.id === choisi ? ' selected' : '') + '>' + esc(nomPatient(p)) + '</option>').join('');
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR') : '';
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// Mode équipe (bloc Serveur du cabinet) : membres, praticiens, droits
const enEquipe = () => !!appli.equipe;
const moi = () => appli.moi || {};
const praticiens = () => (appli.equipe || []).filter(m => m.role !== 'secretariat' && m.actif);
const membre = id => (appli.equipe || []).find(m => m.id === id) || null;
const nomMembre = id => { const m = membre(id); return m ? m.nom : ''; };
const optionsPraticiens = (choisi, vide) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + praticiens().map(m => '<option value="' + esc(m.id) + '"' + (m.id === choisi ? ' selected' : '') + '>' + esc(m.nom) + '</option>').join('');
const soigne = p => !!p && p.acces !== 'identite' && moi().role !== 'secretariat';
const optionsSoignes = (choisi, vide) => optionsPatients(choisi, vide, soigne);
const quandServeur = f => document.addEventListener('ap:donnees', e => { if (e.detail && e.detail.serveur) f(e.detail.table); });
// Bilans : liste par patient, formulaire, schéma annoté, impression
const vueListe = racine.querySelector('[data-vue-liste]'), form = racine.querySelector('[data-form]');
const filtre = racine.querySelector('[data-filtre]'), svg = racine.querySelector('[data-schema]');
const CHAMPS = ['patient', 'date', 'pointure', 'morphologie', 'statique', 'motif', 'douleurs', 'cutane', 'marche', 'conclusion', 'traitement'];
const LIBELLES = { pointure: 'Pointure', morphologie: 'Morphologie de l’avant-pied', statique: 'Statique', motif: 'Motif de consultation', douleurs: 'Douleurs', cutane: 'Examen cutané et unguéal', marche: 'Examen à la marche, chaussage', conclusion: 'Conclusion', traitement: 'Traitement proposé' };
let courant = null, reperes = [];
const patientDe = id => appli.lire('patients').find(p => p.id === id);
function liste() {
  const choisi = filtre.value;
  filtre.innerHTML = optionsSoignes(choisi, 'Tous les patients');
  const l = appli.lire('bilans').filter(b => !filtre.value || b.patient === filtre.value).sort((a, b) => String(b.date).localeCompare(a.date));
  racine.querySelector('[data-liste]').innerHTML = l.map(b => '<li><button class="pt-ligne" type="button" data-id="' + esc(b.id) + '"><span><b>' + esc(nomPatient(patientDe(b.patient))) + '</b> <span class="discret">' + esc(b.motif ? b.motif.slice(0, 60) : '') + '</span></span><span class="discret">' + esc(dateFr(b.date)) + '</span></button></li>').join('')
    || '<li class="discret">Aucun bilan.</li>';
  racine.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => ouvrir(b.dataset.id)));
}
function montrerListe() { courant = null; form.hidden = true; vueListe.hidden = false; liste(); }
function ouvrir(id, patient) {
  courant = id ? appli.lire('bilans').find(b => b.id === id) || null : null;
  vueListe.hidden = true; form.hidden = false;
  form.reset();
  // En équipe : seulement les patients dont on voit le dossier médical
  form.elements.patient.innerHTML = optionsSoignes(courant ? courant.patient : patient || '', 'Choisir un patient');
  CHAMPS.forEach(c => { if (c !== 'patient') form.elements[c].value = courant ? courant[c] || '' : ''; });
  if (!courant) form.elements.date.value = aujourdhui();
  reperes = courant ? JSON.parse(JSON.stringify(courant.reperes || [])) : [];
  racine.querySelector('[data-supprimer]').hidden = !courant;
  dessinerReperes();
  if (courant) appli.tracer('consultation d’un bilan', nomPatient(patientDe(courant.patient)));
  window.scrollTo(0, 0);
}
function dessinerReperes() {
  racine.querySelector('[data-points]').innerHTML = reperes.map((r, i) => '<g class="bp-point" transform="translate(' + esc(Number(r.x) || 0) + ',' + esc(Number(r.y) || 0) + ')"><circle r="9"/><text text-anchor="middle" y="4">' + (i + 1) + '</text></g>').join('');
  const ol = racine.querySelector('[data-reperes]');
  ol.innerHTML = reperes.map((r, i) => '<li><div><input data-texte="' + i + '" value="' + esc(r.texte) + '" placeholder="Pied ' + esc(r.cote) + ' : hyperkératose, cor, douleur…" aria-label="Repère ' + (i + 1) + '"><button type="button" data-retirer="' + i + '" aria-label="Retirer le repère ' + (i + 1) + '">Retirer</button></div></li>').join('');
  ol.querySelectorAll('[data-texte]').forEach(x => x.addEventListener('input', () => { reperes[x.dataset.texte].texte = x.value; }));
  ol.querySelectorAll('[data-retirer]').forEach(x => x.addEventListener('click', () => { reperes.splice(Number(x.dataset.retirer), 1); dessinerReperes(); }));
}
svg.addEventListener('click', e => {
  if (e.target.closest('.bp-point')) return;
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  if (p.y > 270) return;
  reperes.push({ x: Math.round(p.x), y: Math.round(p.y), cote: p.x < 160 ? 'gauche' : 'droit', texte: '' });
  dessinerReperes();
  const champs = racine.querySelectorAll('[data-texte]');
  champs[champs.length - 1].focus();
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const v = {};
  CHAMPS.forEach(c => { v[c] = form.elements[c].value.trim(); });
  v.reperes = reperes;
  const nom = nomPatient(patientDe(v.patient));
  if (courant) { appli.modifier('bilans', courant.id, v); appli.tracer('modification d’un bilan', nom); }
  else { courant = appli.enregistrer('bilans', v); appli.tracer('création d’un bilan', nom); }
  appli.toast('Bilan enregistré');
  ouvrir(courant.id);
});
racine.querySelector('[data-imprimer]').addEventListener('click', () => {
  const v = {};
  CHAMPS.forEach(c => { v[c] = form.elements[c].value.trim(); });
  const p = patientDe(v.patient);
  if (!p) return appli.toast('Choisis d’abord le patient.');
  const schema = svg.outerHTML.replace('data-schema', 'style="width:300px;display:block;margin:8px 0"');
  appli.imprimer('<div style="font-family:system-ui,sans-serif;max-width:720px">'
    + '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:6px;margin-bottom:12px"><b>' + esc(reglages.cabinet) + '</b><span>Bilan du ' + esc(dateFr(v.date)) + '</span></div>'
    + '<h1 style="font-size:20px;margin:0 0 4px">Bilan podologique</h1>'
    + '<p style="margin:0 0 12px"><b>' + esc(nomPatient(p)) + '</b>' + (p.naissance ? ', né(e) le ' + esc(dateFr(p.naissance)) : '') + '</p>'
    + Object.keys(LIBELLES).filter(k => v[k]).map(k => '<p style="margin:0 0 8px"><b>' + esc(LIBELLES[k]) + ' :</b><br>' + esc(v[k]).split(NL).join('<br>') + '</p>').join('')
    + (reperes.length ? '<p style="margin:12px 0 0"><b>Schéma</b></p>' + schema + '<ol>' + reperes.map(r => '<li>Pied ' + esc(r.cote) + ' : ' + esc(r.texte) + '</li>').join('') + '</ol>' : '')
    + '</div>');
  appli.tracer('impression d’un bilan', nomPatient(p));
});
racine.querySelector('[data-supprimer]').addEventListener('click', () => {
  if (!confirm('Supprimer ce bilan ?')) return;
  appli.tracer('suppression d’un bilan', nomPatient(patientDe(courant.patient)));
  appli.supprimer('bilans', courant.id);
  montrerListe();
});
racine.querySelector('[data-nouveau]').addEventListener('click', () => ouvrir(null, filtre.value));
racine.querySelector('[data-retour]').addEventListener('click', () => { appli.aller(racine.closest('.ap-page').dataset.page); montrerListe(); });
filtre.addEventListener('change', liste);
racine.closest('.ap-page').addEventListener('ap:affiche', () => {
  const id = appli.param('patient');
  if (id && appli.param('nouveau')) ouvrir(null, id);
  else if (id) { filtre.innerHTML = optionsSoignes(id, 'Tous les patients'); filtre.value = id; montrerListe(); }
  else if (form.hidden) liste();
});
quandServeur(() => { if (form.hidden) liste(); });
liste();
  };
  ecrans["factures-factures"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const NL = String.fromCharCode(10);
const nomPatient = p => p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : 'Patient supprimé';
const patients = () => appli.lire('patients').filter(p => !p.archive).sort((a, b) => nomPatient(a).localeCompare(nomPatient(b)));
const optionsPatients = (choisi, vide, filtre) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + patients().filter(filtre || Boolean).map(p => '<option value="' + esc(p.id) + '"' + (p.id === choisi ? ' selected' : '') + '>' + esc(nomPatient(p)) + '</option>').join('');
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR') : '';
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// Mode équipe (bloc Serveur du cabinet) : membres, praticiens, droits
const enEquipe = () => !!appli.equipe;
const moi = () => appli.moi || {};
const praticiens = () => (appli.equipe || []).filter(m => m.role !== 'secretariat' && m.actif);
const membre = id => (appli.equipe || []).find(m => m.id === id) || null;
const nomMembre = id => { const m = membre(id); return m ? m.nom : ''; };
const optionsPraticiens = (choisi, vide) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + praticiens().map(m => '<option value="' + esc(m.id) + '"' + (m.id === choisi ? ' selected' : '') + '>' + esc(m.nom) + '</option>').join('');
const soigne = p => !!p && p.acces !== 'identite' && moi().role !== 'secretariat';
const optionsSoignes = (choisi, vide) => optionsPatients(choisi, vide, soigne);
const quandServeur = f => document.addEventListener('ap:donnees', e => { if (e.detail && e.detail.serveur) f(e.detail.table); });
// Factures : création, paiement, impression, export
const form = racine.querySelector('[data-form]'), mois = racine.querySelector('[data-mois]');
const ACTES = String(reglages.actes || '').split(NL).map(l => l.trim()).filter(Boolean).map(l => {
  const i = l.lastIndexOf('—'); return i < 0 ? { libelle: l, prix: 0 } : { libelle: l.slice(0, i).trim(), prix: Number(l.slice(i + 1).replace(',', '.').trim()) || 0 };
});
const patientDe = id => appli.lire('patients').find(p => p.id === id);
// En équipe : factures par praticien ; le secrétariat et l'administrateur voient tout le cabinet
const filtrePra = racine.querySelector('[data-filtre-pra]');
const choixPra = () => enEquipe() && moi().role !== 'praticien';
function dessinerEquipe() {
  filtrePra.hidden = !choixPra();
  racine.querySelector('[data-champ-pra]').hidden = !choixPra();
  // Le serveur date la facture du jour (numérotation chronologique)
  racine.querySelector('[data-champ-date]').hidden = enEquipe();
  form.elements.date.required = !enEquipe();
  if (!choixPra()) return;
  filtrePra.innerHTML = optionsPraticiens(filtrePra.dataset.valeur || '', 'Tous les praticiens');
}
function ligneActe(acte) {
  const d = document.createElement('div');
  d.className = 'fa-ligne';
  d.innerHTML = '<select aria-label="Acte">' + ACTES.map((a, i) => '<option value="' + i + '">' + esc(a.libelle) + '</option>').join('') + '<option value="-1">Autre…</option></select><input type="number" min="1" value="1" aria-label="Quantité"><input type="number" min="0" step="0.01" aria-label="Prix unitaire"><button type="button" aria-label="Retirer l’acte">×</button>';
  const [sel, qte, prix, retirer] = d.children;
  if (acte >= 0 && ACTES[acte]) { sel.value = acte; prix.value = ACTES[acte].prix; }
  sel.addEventListener('change', () => { const a = ACTES[sel.value]; if (a) prix.value = a.prix; else { const l = prompt('Libellé de l’acte'); if (l) { const o = document.createElement('option'); o.value = 'x'; o.textContent = l; sel.appendChild(o); sel.value = 'x'; } } total(); });
  [qte, prix].forEach(x => x.addEventListener('input', total));
  retirer.addEventListener('click', () => { d.remove(); total(); });
  racine.querySelector('[data-lignes]').appendChild(d);
  total();
}
function lignes() {
  return Array.from(racine.querySelectorAll('.fa-ligne')).map(d => {
    const [sel, qte, prix] = d.children;
    return { libelle: sel.options[sel.selectedIndex].textContent, quantite: Number(qte.value) || 1, prix: Math.round((Number(prix.value) || 0) * 100) / 100 };
  });
}
function total() { const t = lignes().reduce((s, l) => s + l.quantite * l.prix, 0); racine.querySelector('[data-total]').textContent = appli.prix(t); return Math.round(t * 100) / 100; }
function numero(date) {
  const an = String(date).slice(0, 4);
  const n = appli.lire('factures').filter(f => String(f.numero).startsWith('F-' + an + '-')).map(f => Number(f.numero.split('-')[2])).reduce((a, b) => Math.max(a, b), 0) + 1;
  return 'F-' + an + '-' + String(n).padStart(4, '0');
}
function dessiner() {
  dessinerEquipe();
  const pra = choixPra() ? filtrePra.value : '';
  const toutes = appli.lire('factures').filter(f => !pra || f.praticien === pra), m = mois.value;
  const duMois = toutes.filter(f => String(f.date).slice(0, 7) === m);
  const somme = l => l.reduce((s, f) => s + Number(f.total || 0), 0);
  racine.querySelector('[data-resume]').innerHTML = '<div class="fa-tuile"><b>' + esc(appli.prix(somme(duMois))) + '</b><span>Facturé ce mois</span></div><div class="fa-tuile"><b>' + esc(appli.prix(somme(duMois.filter(f => f.statut === 'payée')))) + '</b><span>Encaissé</span></div><div class="fa-tuile"><b>' + esc(appli.prix(somme(toutes.filter(f => f.statut !== 'payée')))) + '</b><span>En attente (tout)</span></div>';
  racine.querySelector('[data-liste]').innerHTML = duMois.sort((a, b) => String(b.numero).localeCompare(a.numero)).map(f => '<li class="fa-facture"><span class="ag-corps"><b>' + esc(f.numero || 'numéro en cours…') + '</b> · ' + esc(dateFr(f.date)) + '<br><span class="discret">' + esc(f.patientNom) + (choixPra() && !pra ? ' · ' + esc(nomMembre(f.praticien)) : '') + '</span></span><b>' + esc(appli.prix(f.total)) + '</b>'
    + '<button class="btn lien" type="button" data-payer="' + esc(f.id) + '">' + (f.statut === 'payée' ? 'Payée ✓' : 'Marquer payée') + '</button><button class="btn lien" type="button" data-imprimer="' + esc(f.id) + '">PDF</button></li>').join('')
    || '<li class="discret">Aucune facture ce mois-ci.</li>';
  racine.querySelectorAll('[data-payer]').forEach(b => b.addEventListener('click', () => {
    const f = toutes.find(x => x.id === b.dataset.payer);
    appli.modifier('factures', f.id, { statut: f.statut === 'payée' ? 'en attente' : 'payée', paye_le: f.statut === 'payée' ? '' : new Date().toISOString() });
    appli.tracer('paiement de facture', f.numero);
    dessiner();
  }));
  racine.querySelectorAll('[data-imprimer]').forEach(b => b.addEventListener('click', () => imprimer(toutes.find(x => x.id === b.dataset.imprimer))));
}
function imprimer(f) {
  if (!f.numero) return appli.toast('Numéro en cours d’attribution, réessaie dans un instant.');
  const p = patientDe(f.patient) || { adresse: f.patientAdresse };
  // En équipe : en-tête tiré du profil du praticien (onglet Mon compte), sinon des réglages du bloc
  const m = enEquipe() ? membre(f.praticien) : null, pr = m ? m.profil || {} : {};
  const e = { cabinet: pr.cabinet || reglages.cabinet, praticien: m ? m.nom : reglages.praticien, adresse: pr.adresse || reglages.adresse, identifiants: pr.identifiants || reglages.identifiants, mention: pr.mention || reglages.mention };
  appli.imprimer('<div style="font-family:system-ui,sans-serif;max-width:720px">'
    + '<div style="display:flex;justify-content:space-between;gap:24px"><div><b style="font-size:16px">' + esc(e.cabinet) + '</b><br>' + esc(e.praticien) + '<br>' + esc(e.adresse).split(NL).join('<br>') + '<br><small>' + esc(e.identifiants) + '</small></div>'
    + '<div style="text-align:right"><b style="font-size:18px">Facture ' + esc(f.numero) + '</b><br>du ' + esc(dateFr(f.date)) + '</div></div>'
    + '<p style="margin:24px 0 12px"><b>' + esc(f.patientNom) + '</b><br>' + esc(p.adresse || '').split(NL).join('<br>') + '</p>'
    + '<table style="width:100%;border-collapse:collapse"><tr style="border-bottom:1px solid #333"><th style="text-align:left">Acte</th><th>Qté</th><th style="text-align:right">Prix</th><th style="text-align:right">Montant</th></tr>'
    + f.lignes.map(l => '<tr style="border-bottom:1px solid #ddd"><td>' + esc(l.libelle) + '</td><td style="text-align:center">' + l.quantite + '</td><td style="text-align:right">' + esc(appli.prix(l.prix)) + '</td><td style="text-align:right">' + esc(appli.prix(l.prix * l.quantite)) + '</td></tr>').join('')
    + '<tr><td colspan="3" style="text-align:right;padding-top:8px"><b>Total</b></td><td style="text-align:right;padding-top:8px"><b>' + esc(appli.prix(f.total)) + '</b></td></tr></table>'
    + '<p style="margin-top:16px">' + esc(e.mention) + '<br>' + (f.statut === 'payée' ? 'Facture acquittée, payée par ' + esc(f.mode).toLowerCase() + '.' : 'À régler.') + '</p></div>');
  appli.tracer('impression de facture', f.numero);
}
form.addEventListener('submit', e => {
  e.preventDefault();
  const l = lignes();
  if (!l.length) return appli.toast('Ajoute au moins un acte.');
  const p = patientDe(form.elements.patient.value);
  const f = { numero: numero(form.elements.date.value), patient: p.id, patientNom: nomPatient(p), date: form.elements.date.value, lignes: l, total: total(), mode: form.elements.mode.value, statut: form.elements.statut.value };
  if (enEquipe()) {
    // Le serveur du cabinet donne le numéro (continu par praticien) et la date du jour
    f.numero = ''; f.date = aujourdhui();
    f.praticien = choixPra() ? form.elements.praticien.value : moi().id;
    if (!f.praticien) return appli.toast('Choisis le praticien.');
  }
  appli.enregistrer('factures', f);
  if (f.numero) appli.tracer('création de facture', f.numero);
  appli.toast(f.numero ? 'Facture ' + f.numero + ' créée' : 'Facture créée');
  form.hidden = true;
  mois.value = f.date.slice(0, 7);
  dessiner();
});
function nouvelle(patient) {
  form.hidden = false;
  form.reset();
  form.elements.patient.innerHTML = optionsPatients(patient || '', 'Choisir un patient');
  form.elements.date.value = aujourdhui();
  if (choixPra()) {
    const pt = patientDe(patient);
    form.elements.praticien.innerHTML = optionsPraticiens(pt ? pt.referent : (moi().role === 'admin' ? moi().id : ''), 'Choisir le praticien');
  }
  racine.querySelector('[data-lignes]').innerHTML = '';
  ligneActe(0);
  form.scrollIntoView({ block: 'start' });
}
racine.querySelector('[data-nouvelle]').addEventListener('click', () => nouvelle(''));
racine.querySelector('[data-annuler]').addEventListener('click', () => { form.hidden = true; });
racine.querySelector('[data-ajout]').addEventListener('click', () => ligneActe(0));
mois.addEventListener('change', dessiner);
filtrePra.addEventListener('change', () => { filtrePra.dataset.valeur = filtrePra.value; dessiner(); });
form.elements.patient.addEventListener('change', () => { const pt = patientDe(form.elements.patient.value); if (choixPra() && pt && pt.referent) form.elements.praticien.value = pt.referent; });
quandServeur(dessiner);
racine.querySelector('[data-csv]').addEventListener('click', () => {
  const cell = v => /[;"]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  const pra = choixPra() ? filtrePra.value : '';
  const lignesCsv = ['date;numero;patient;montant;mode;statut;source;note' + (enEquipe() ? ';praticien' : '')].concat(appli.lire('factures').filter(f => f.numero && (!pra || f.praticien === pra)).sort((a, b) => String(a.numero).localeCompare(b.numero))
    .map(f => [f.date, f.numero, f.patientNom, String(f.total).replace('.', ','), f.mode, f.statut, 'Ventes', f.numero].concat(enEquipe() ? [nomMembre(f.praticien)] : []).map(cell).join(';')));
  appli.telecharger('factures.csv', String.fromCharCode(65279) + lignesCsv.join(NL), 'text/csv;charset=utf-8');
  appli.tracer('export comptable', '');
});
mois.value = aujourdhui().slice(0, 7);
racine.closest('.ap-page').addEventListener('ap:affiche', () => {
  dessiner();
  const id = appli.param('patient');
  if (id && appli.param('nouveau')) nouvelle(id);
});
dessiner();
  };
  ecrans["journal-journal"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const NL = String.fromCharCode(10);
const nomPatient = p => p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : 'Patient supprimé';
const patients = () => appli.lire('patients').filter(p => !p.archive).sort((a, b) => nomPatient(a).localeCompare(nomPatient(b)));
const optionsPatients = (choisi, vide, filtre) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + patients().filter(filtre || Boolean).map(p => '<option value="' + esc(p.id) + '"' + (p.id === choisi ? ' selected' : '') + '>' + esc(nomPatient(p)) + '</option>').join('');
const dateFr = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR') : '';
const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// Mode équipe (bloc Serveur du cabinet) : membres, praticiens, droits
const enEquipe = () => !!appli.equipe;
const moi = () => appli.moi || {};
const praticiens = () => (appli.equipe || []).filter(m => m.role !== 'secretariat' && m.actif);
const membre = id => (appli.equipe || []).find(m => m.id === id) || null;
const nomMembre = id => { const m = membre(id); return m ? m.nom : ''; };
const optionsPraticiens = (choisi, vide) => (vide ? '<option value="">' + esc(vide) + '</option>' : '') + praticiens().map(m => '<option value="' + esc(m.id) + '"' + (m.id === choisi ? ' selected' : '') + '>' + esc(m.nom) + '</option>').join('');
const soigne = p => !!p && p.acces !== 'identite' && moi().role !== 'secretariat';
const optionsSoignes = (choisi, vide) => optionsPatients(choisi, vide, soigne);
const quandServeur = f => document.addEventListener('ap:donnees', e => { if (e.detail && e.detail.serveur) f(e.detail.table); });
// Journal : 300 dernières entrées, filtre, export
const filtre = racine.querySelector('[data-filtre]');
function dessiner() {
  const q = filtre.value.trim().toLowerCase();
  const l = appli.lire('journal').slice().reverse().filter(x => !q || (x.action + ' ' + x.detail + ' ' + x.qui).toLowerCase().includes(q)).slice(0, 300);
  racine.querySelector('[data-liste]').innerHTML = l.map(x => '<li><time>' + esc(new Date(x.date).toLocaleString('fr-FR')) + '</time><span><b>' + esc(x.action) + '</b> ' + esc(x.detail) + ' <span class="discret">· ' + esc(x.qui) + (x.ip ? ' · ' + esc(x.ip) : '') + '</span></span></li>').join('') || '<li class="discret">Journal vide.</li>';
}
// Sur le serveur du cabinet : journal de tout le cabinet pour l'administrateur, le sien pour les autres
if (appli.serveurDonnees) racine.querySelector('[data-sous-titre]').textContent = 'Qui a ouvert ou modifié quoi, et quand, dans le cabinet. Le journal est gardé par le serveur et ne peut pas être effacé.';
quandServeur(t => { if (t === 'journal' || t === '*') dessiner(); });
filtre.addEventListener('input', dessiner);
racine.querySelector('[data-csv]').addEventListener('click', () => {
  const cell = v => /[;"]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  appli.telecharger('journal-acces.csv', String.fromCharCode(65279) + ['date;qui;action;detail;ip'].concat(appli.lire('journal').map(x => [x.date, x.qui, x.action, x.detail, x.ip || ''].map(cell).join(';'))).join(NL), 'text/csv;charset=utf-8');
  appli.tracer('export du journal', '');
});
racine.closest('.ap-page').addEventListener('ap:affiche', () => { dessiner(); if (appli.rafraichir) appli.rafraichir('journal'); });
dessiner();
  };
  ecrans["equipe-compte"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const ROLES = { admin: 'Administrateur', praticien: 'Praticien', secretariat: 'Secrétariat' };
// Mon compte : mot de passe et profil (en-tête des factures)
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
appli.surUtilisateur(dessiner);
  };
  ecrans["equipe-equipe"] = function (racine, reglages, appli) {
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const ROLES = { admin: 'Administrateur', praticien: 'Praticien', secretariat: 'Secrétariat' };
// Équipe : comptes du cabinet (administrateur)
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
racine.closest('.ap-page').addEventListener('ap:affiche', charger);
  };

  /** Page demandée par l'adresse (#page ou #page?param=…). */
  const pageDemandee = () => location.hash.slice(1).split('?')[0];

  // Navigation entre les pages, avec les écrans réservés aux connectés
  function afficher() {
    const pages = document.querySelectorAll('.ap-page');
    if (!pages.length) return;
    const voulu = pageDemandee();
    const cible = document.querySelector('.ap-page[data-page="' + voulu + '"]') || document.querySelector('.ap-page:not([data-cache])') || pages[0];
    const avant = document.querySelector('.ap-page.active');
    pages.forEach(p => {
      p.classList.toggle('active', p === cible);
      // Un écran protégé n'affiche son contenu qu'à un utilisateur connecté
      if (p.hasAttribute('data-protege')) {
        const verrou = p.querySelector(':scope > .ap-verrou');
        const contenu = p.querySelector(':scope > .ap-contenu');
        verrou.hidden = !!appli.utilisateur;
        contenu.hidden = !appli.utilisateur;
      }
    });
    document.querySelectorAll('.ap-onglet').forEach(o => o.classList.toggle('active', o.dataset.page === cible.dataset.page));
    // Les écrans peuvent se rafraîchir quand on y revient (ou quand l'adresse change de paramètre)
    cible.dispatchEvent(new CustomEvent('ap:affiche', { detail: { avant: avant && avant.dataset.page } }));
    if (appli.utilisateur && appli.retour && cible.dataset.role === 'connexion') {
      const r = appli.retour; appli.retour = null; appli.aller(r);
    }
  }
  document.querySelectorAll('.ap-onglet').forEach(o => o.addEventListener('click', () => appli.aller(o.dataset.page)));
  document.querySelectorAll('.ap-verrou button').forEach(b => b.addEventListener('click', () => appli.exigerConnexion()));
  window.addEventListener('hashchange', afficher);

  // Lancement : initialisations des blocs, puis code de chaque écran
  const erreur = (racine, e) => {
    const d = document.createElement('div');
    d.className = 'ap-erreur';
    d.textContent = 'Erreur dans ce bloc : ' + String(e && e.message || e);
    racine.prepend(d);
  };
  inits.forEach(([cle, f]) => { try { f(reglages[cle], appli); } catch (e) { console.error(e); appli.toast('Erreur au démarrage d’un bloc : ' + e.message); } });
  // Sans configuration Supabase, personne ne fournira le client : on le dit tout de suite aux blocs qui l'attendent.
  if (!('supabase' in services) && !CONFIG.SUPABASE_URL) appli.fournir('supabase', null);
  function lancerEcrans() {
    Object.keys(ecrans).forEach(cle => {
      const page = document.querySelector('.ap-page[data-page="' + cle + '"]');
      const racine = page.querySelector(':scope > .ap-contenu') || page;
      try { ecrans[cle](racine, reglages[cle], appli); } catch (e) { erreur(racine, e); }
    });
    afficher();
  }
  // Avec le Mode admin, les textes enregistrés sont posés avant de lancer les écrans
  if (appli.contenu) appli.contenu.pret().then(lancerEcrans); else lancerEcrans();

  // Bandeau cookies (kit affichage)
  if (KITS.affichage.bandeauCookies && !stockage.get('cookies-vu')) {
    const b = document.createElement('div');
    b.className = 'ap-cookies';
    b.innerHTML = '<span></span><button type="button">OK</button>';
    b.querySelector('span').textContent = KITS.affichage.texteCookies;
    b.querySelector('button').onclick = () => { stockage.set('cookies-vu', true); b.remove(); document.body.classList.remove('avec-cookies'); };
    document.body.appendChild(b);
    document.body.classList.add('avec-cookies');   // laisse la place au bandeau sous le contenu
  }

  // Mode hors ligne (PWA), seulement quand l'app est servie en http(s)
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !APERCU) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
