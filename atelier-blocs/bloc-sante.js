/* ==========================================================================
   bloc-sante.js — blocs pour un cabinet de santé (podologie d'abord)
   Verrou de l'appareil, Patients, Bilan podologique, Agenda, Facturation,
   Journal d'accès, Sauvegarde chiffrée.
   Seuls sur l'appareil, les blocs gardent les données dans le stockage de
   l'app (pas de serveur, donc pas d'hébergement de données de santé).
   Avec le bloc « Serveur du cabinet » (bloc-cabinet.js), les mêmes blocs
   passent en mode équipe : données sur le serveur du cabinet, praticien
   référent, partage du dossier médical, agenda et factures par praticien.
   Le Verrou protège l'accès, le Journal trace qui ouvre quoi, la Sauvegarde
   exporte un fichier chiffré (AES-GCM, clé tirée du mot de passe).
   Dans le code des blocs : pas de backtick ni de barre oblique inverse
   (ils sont écrits dans des gabarits) ; NL = saut de ligne.
   ========================================================================== */
(function () {
  /* Petits outils recopiés dans chaque bloc qui en a besoin */
  const OUTILS = `const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
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
`;

  /* ======================= Verrou de l'appareil ======================= */
  AB.blocs.declarer({
    id: 'verrou-local', nom: 'Verrou de l’appareil', version: '1.0.0', categorie: 'Sécurité', icone: 'mdi-lock-outline',
    description: 'Code d’accès pour une app dont les données restent sur l’appareil : protège les écrans réservés et se reverrouille après inactivité. À utiliser à la place du bloc Connexion quand il n’y a pas de serveur.',
    reglages: [
      { cle: 'titre', label: 'Titre de l’écran', type: 'texte', defaut: 'Accès au cabinet' },
      { cle: 'minutes', label: 'Verrouillage après inactivité (minutes)', type: 'nombre', defaut: 10 }
    ],
    init: `// Reverrouillage après inactivité, bouton « Verrouiller » dans l'en-tête
const delai = Math.max(1, Number(reglages.minutes) || 10) * 60000;
let minuteur = null;
const verrouiller = () => {
  if (!appli.utilisateur) return;
  appli.tracer('verrouillage', '');
  appli.definirUtilisateur(null, 'SIGNED_OUT');
  appli.exigerConnexion();
};
const relancer = () => { clearTimeout(minuteur); if (appli.utilisateur) minuteur = setTimeout(verrouiller, delai); };
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, relancer, { passive: true }));
const b = document.createElement('button');
b.type = 'button'; b.className = 'vl-bouton'; b.textContent = 'Verrouiller'; b.hidden = true;
b.addEventListener('click', verrouiller);
const entete = document.querySelector('.ap-entete');
if (entete) entete.appendChild(b);
appli.surUtilisateur(u => { b.hidden = !u; relancer(); });
// Au démarrage : écran du code
setTimeout(() => { if (!appli.utilisateur) appli.exigerConnexion(); }, 0);`,
    ecrans: [{
      id: 'verrou', titre: '{{titre}}', icone: 'mdi-lock-outline', role: 'connexion', cache: true,
      html: `<div class="carte vl-boite">
  <span class="mdi mdi-lock-outline vl-icone"></span>
  <h1 class="titre">{{titre}}</h1>
  <p class="sous-titre" data-intro></p>
  <form data-form>
    <div class="champ"><label for="vl-code">Code d’accès</label><input id="vl-code" name="code" type="password" autocomplete="current-password" required></div>
    <div class="champ" data-confirmer><label for="vl-conf">Confirmer le code</label><input id="vl-conf" name="confirmation" type="password" autocomplete="new-password"></div>
    <button class="btn large" type="submit" data-ok>Déverrouiller</button>
  </form>
  <p class="discret">Les données restent sur cet appareil. Sans le code, il faudra restaurer une sauvegarde chiffrée.</p>
</div>`,
      css: `.vl-boite { max-width: 380px; margin: 24px auto; text-align: center; }
.vl-boite form { text-align: left; }
.vl-icone { font-size: 40px; color: var(--accent); }
.vl-bouton { margin-left: auto; background: rgba(255,255,255,.15); color: #fff; border: 1px solid rgba(255,255,255,.4); border-radius: 6px; padding: 4px 10px; font: inherit; font-size: 13px; cursor: pointer; }`,
      js: `// Code d'accès : seule son empreinte (PBKDF2-SHA-256, sel aléatoire) est gardée sur l'appareil
const hex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
const deHex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
async function deriver(code, sel) {
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: sel, iterations: 310000, hash: 'SHA-256' }, cle, 256)));
}
const form = racine.querySelector('[data-form]'), conf = racine.querySelector('[data-confirmer]');
function dessiner() {
  const v = appli.stockage.get('verrou');
  racine.querySelector('[data-intro]').textContent = v ? 'Saisis ton code d’accès.' : 'Choisis un code d’accès de 8 caractères au moins. Il protège les dossiers sur cet appareil.';
  conf.hidden = !!v;
  form.elements.confirmation.required = !v;
  racine.querySelector('[data-ok]').textContent = v ? 'Déverrouiller' : 'Créer le code';
}
let echecs = 0, bloque = 0;
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (Date.now() < bloque) return appli.toast('Trop d’essais : patiente ' + Math.ceil((bloque - Date.now()) / 1000) + ' s.');
  const code = form.elements.code.value, v = appli.stockage.get('verrou');
  if (!v) {
    if (code.length < 8) return appli.toast('8 caractères au moins.');
    if (code !== form.elements.confirmation.value) return appli.toast('Les deux codes sont différents.');
    const sel = crypto.getRandomValues(new Uint8Array(16));
    appli.stockage.set('verrou', { sel: hex(sel), empreinte: await deriver(code, sel), cree_le: new Date().toISOString() });
  } else if (await deriver(code, deHex(v.sel)) !== v.empreinte) {
    echecs++;
    if (echecs >= 5) { bloque = Date.now() + 30000; echecs = 0; }
    appli.tracer('échec de déverrouillage', '');
    form.reset();
    return appli.toast('Code incorrect.');
  }
  echecs = 0;
  form.reset();
  const retour = appli.retour;
  appli.definirUtilisateur({ id: 'local', email: 'Praticien' }, 'SIGNED_IN');
  appli.tracer(v ? 'déverrouillage' : 'code créé', '');
  dessiner();
  // On quitte l'écran du code pour le premier écran de l'app
  if (!retour && document.querySelector('.ap-page.active') === racine.closest('.ap-page')) {
    const p = document.querySelector('.ap-page:not([data-cache])');
    if (p) appli.aller(p.dataset.page);
  }
});
dessiner();`
    }],
    journal: [{ version: '1.0.0', date: '2026-10-21', texte: 'Première version : code d’accès local, verrouillage après inactivité' }]
  });

  /* ======================= Patients ======================= */
  AB.blocs.declarer({
    id: 'patients', nom: 'Patients', version: '1.1.0', categorie: 'Santé', icone: 'mdi-account-heart-outline',
    description: 'Dossiers patients : identité, contact, antécédents, traitements, consentement ; historique des bilans, rendez-vous et factures ; export du dossier (RGPD), archivage. En équipe : praticien référent et partage du dossier médical.',
    donneesPersonnelles: true,
    reglages: [{ cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Patients' }],
    ecrans: [{
      id: 'patients', titre: '{{onglet}}', icone: 'mdi-account-heart-outline',
      html: `<div data-vue-liste>
  <div class="pt-barre"><input class="pt-cherche" type="search" placeholder="Rechercher (nom, téléphone, e-mail)" aria-label="Rechercher un patient" data-cherche><button class="btn" type="button" data-nouveau>+ Patient</button></div>
  <ul class="liste" data-liste></ul>
  <label class="discret pt-archives"><input type="checkbox" data-archives> Afficher les dossiers archivés</label>
</div>
<div data-vue-fiche hidden>
  <button class="btn lien" type="button" data-retour>‹ Tous les patients</button>
  <h1 class="titre" data-nom></h1>
  <div class="pt-actions" data-actions>
    <button class="btn" type="button" data-aller="bilan-podo">Nouveau bilan</button>
    <button class="btn secondaire" type="button" data-aller="agenda">Rendez-vous</button>
    <button class="btn secondaire" type="button" data-aller="facturation">Facturer</button>
    <button class="btn secondaire" type="button" data-exporter>Exporter le dossier</button>
    <button class="btn secondaire" type="button" data-archiver>Archiver</button>
    <button class="btn lien pt-danger" type="button" data-supprimer>Supprimer</button>
  </div>
  <form class="carte" data-form>
    <div class="pt-grille">
      <div class="champ"><label for="pt-nom">Nom</label><input id="pt-nom" name="nom" required autocomplete="off"></div>
      <div class="champ"><label for="pt-prenom">Prénom</label><input id="pt-prenom" name="prenom" required autocomplete="off"></div>
      <div class="champ"><label for="pt-naissance">Date de naissance</label><input id="pt-naissance" name="naissance" type="date"></div>
      <div class="champ"><label for="pt-sexe">Sexe</label><select id="pt-sexe" name="sexe"><option value=""></option><option>Femme</option><option>Homme</option><option>Autre</option></select></div>
      <div class="champ"><label for="pt-tel">Téléphone</label><input id="pt-tel" name="telephone" type="tel" autocomplete="off"></div>
      <div class="champ"><label for="pt-email">E-mail</label><input id="pt-email" name="email" type="email" autocomplete="off"></div>
      <div class="champ"><label for="pt-medecin">Médecin traitant</label><input id="pt-medecin" name="medecin"></div>
      <div class="champ"><label for="pt-activite">Profession, sport</label><input id="pt-activite" name="activite"></div>
    </div>
    <div class="champ"><label for="pt-adresse">Adresse</label><textarea id="pt-adresse" name="adresse" rows="2"></textarea></div>
    <div class="pt-grille" data-equipe hidden>
      <div class="champ"><label for="pt-ref">Praticien référent</label><select id="pt-ref" name="referent"></select></div>
      <fieldset class="champ pt-partage"><legend>Dossier médical partagé avec</legend><div data-partage></div></fieldset>
    </div>
    <div data-medical>
    <div class="champ"><label for="pt-ant">Antécédents, pathologies (diabète, AOMI…)</label><textarea id="pt-ant" name="antecedents" rows="3"></textarea></div>
    <div class="pt-grille">
      <div class="champ"><label for="pt-trait">Traitements en cours</label><textarea id="pt-trait" name="traitements" rows="2"></textarea></div>
      <div class="champ"><label for="pt-all">Allergies</label><textarea id="pt-all" name="allergies" rows="2"></textarea></div>
    </div>
    <div class="champ"><label for="pt-notes">Notes</label><textarea id="pt-notes" name="notes" rows="3"></textarea></div>
    </div>
    <p class="discret" data-sans-medical hidden>Le dossier médical de ce patient est réservé à son praticien référent et aux praticiens avec qui il est partagé.</p>
    <label class="pt-consent"><input type="checkbox" name="consentement"> Le patient est informé du traitement de ses données de santé et y consent</label>
    <button class="btn large" type="submit">Enregistrer le dossier</button>
  </form>
  <div data-historique></div>
</div>`,
      css: `.pt-barre { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.pt-cherche, .pt-barre select { flex: 1; min-width: 160px; font: inherit; padding: 10px 12px; border: 1px solid var(--bordure); border-radius: var(--rayon); background: var(--carte); color: var(--texte); }
.pt-ligne { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; background: none; border: none; font: inherit; color: inherit; text-align: left; padding: 0; cursor: pointer; }
.pt-ligne b { font-weight: 600; }
.pt-grille { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0 12px; }
.pt-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 12px; }
.pt-actions .btn { padding: 8px 12px; font-size: 13px; }
.pt-danger { color: #c62828; }
.pt-consent { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; margin: 4px 0 12px; }
.pt-archives { display: block; margin-top: 10px; }
.pt-tag { font-size: 11px; background: var(--bordure); border-radius: 10px; padding: 2px 8px; }
.pt-h2 { font-size: 16px; margin: 16px 0 8px; }
.pt-partage { border: 1px solid var(--bordure); border-radius: var(--rayon); padding: 6px 10px; }
.pt-partage legend { font-size: 13px; padding: 0 4px; }
.pt-partage label { display: block; font-size: 14px; }`,
      js: OUTILS + `// Liste, recherche et dossier patient
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
liste();`
    }],
    journal: [{ version: '1.1.0', date: '2026-10-21', texte: 'Mode équipe : praticien référent, partage du dossier médical, dossier médical masqué au secrétariat' }, { version: '1.0.0', date: '2026-10-21', texte: 'Première version' }]
  });

  /* ======================= Bilan podologique ======================= */
  // Schéma des deux pieds (gros orteil côté intérieur), repères numérotés posés au doigt
  const PIED = `<path d="M8,-96 C34,-100 46,-70 44,-36 C42,-2 36,30 38,66 C40,102 22,124 -2,124 C-26,124 -42,104 -40,70 C-38,36 -48,0 -46,-38 C-44,-76 -22,-94 8,-96 Z"/>
<circle cx="26" cy="-106" r="15"/><circle cx="2" cy="-114" r="9"/><circle cx="-15" cy="-110" r="8"/><circle cx="-29" cy="-102" r="7"/><circle cx="-40" cy="-90" r="6"/>`;
  AB.blocs.declarer({
    id: 'bilan-podo', nom: 'Bilan podologique', version: '1.1.0', categorie: 'Santé', icone: 'mdi-foot-print',
    description: 'Bilan complet (motif, morphologie, statique, douleurs, examen cutané et unguéal, marche, conclusion, traitement) avec schéma des pieds annoté et export PDF.',
    donneesPersonnelles: true,
    reglages: [
      { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Bilans' },
      { cle: 'cabinet', label: 'En-tête des bilans imprimés', type: 'texte', defaut: 'Cabinet de pédicurie-podologie' }
    ],
    ecrans: [{
      id: 'bilans', titre: '{{onglet}}', icone: 'mdi-foot-print',
      html: `<div data-vue-liste>
  <div class="pt-barre"><select data-filtre aria-label="Patient"></select><button class="btn" type="button" data-nouveau>+ Bilan</button></div>
  <ul class="liste" data-liste></ul>
</div>
<form data-form hidden>
  <button class="btn lien" type="button" data-retour>‹ Tous les bilans</button>
  <h1 class="titre">Bilan podologique</h1>
  <div class="carte">
    <div class="pt-grille">
      <div class="champ"><label for="bp-patient">Patient</label><select id="bp-patient" name="patient" required></select></div>
      <div class="champ"><label for="bp-date">Date</label><input id="bp-date" name="date" type="date" required></div>
      <div class="champ"><label for="bp-pointure">Pointure</label><input id="bp-pointure" name="pointure" inputmode="decimal"></div>
      <div class="champ"><label for="bp-morpho">Morphologie de l’avant-pied</label><select id="bp-morpho" name="morphologie"><option></option><option>Égyptien</option><option>Grec</option><option>Carré</option></select></div>
      <div class="champ"><label for="bp-statique">Statique</label><select id="bp-statique" name="statique"><option></option><option>Normale</option><option>Pied plat</option><option>Pied creux</option><option>Valgus</option><option>Varus</option></select></div>
    </div>
    <div class="champ"><label for="bp-motif">Motif de consultation</label><textarea id="bp-motif" name="motif" rows="2"></textarea></div>
    <div class="champ"><label for="bp-douleurs">Douleurs (siège, intensité sur 10, circonstances)</label><textarea id="bp-douleurs" name="douleurs" rows="2"></textarea></div>
    <div class="champ"><label for="bp-cutane">Examen cutané et unguéal</label><textarea id="bp-cutane" name="cutane" rows="2"></textarea></div>
    <div class="champ"><label for="bp-marche">Examen à la marche, chaussage</label><textarea id="bp-marche" name="marche" rows="2"></textarea></div>
  </div>
  <div class="carte">
    <h2 class="pt-h2">Schéma des pieds</h2>
    <p class="discret">Touche un pied pour placer un repère, puis décris-le.</p>
    <svg class="bp-schema" data-schema viewBox="0 0 320 290" role="img" aria-label="Schéma des pieds gauche et droit">
      <text x="80" y="284" text-anchor="middle" class="bp-legende">Gauche</text><text x="240" y="284" text-anchor="middle" class="bp-legende">Droit</text>
      <g class="bp-pied" transform="translate(80,140)">${PIED}</g>
      <g class="bp-pied" transform="translate(240,140) scale(-1,1)">${PIED}</g>
      <g data-points></g>
    </svg>
    <ol class="bp-reperes" data-reperes></ol>
  </div>
  <div class="carte">
    <div class="champ"><label for="bp-conclusion">Conclusion</label><textarea id="bp-conclusion" name="conclusion" rows="3"></textarea></div>
    <div class="champ"><label for="bp-traitement">Traitement proposé (soins, orthèses, semelles, conseils)</label><textarea id="bp-traitement" name="traitement" rows="3"></textarea></div>
  </div>
  <div class="pt-actions">
    <button class="btn" type="submit">Enregistrer le bilan</button>
    <button class="btn secondaire" type="button" data-imprimer>PDF / imprimer</button>
    <button class="btn lien pt-danger" type="button" data-supprimer>Supprimer</button>
  </div>
</form>`,
      css: `.bp-schema { width: 100%; max-width: 420px; display: block; margin: 0 auto; cursor: crosshair; touch-action: manipulation; }
.bp-pied path, .bp-pied circle { fill: #f6efe9; stroke: var(--texte); stroke-width: 1.5; }
.bp-legende { font-size: 12px; fill: var(--discret); }
.bp-point circle { fill: var(--accent); stroke: #fff; stroke-width: 2; }
.bp-point text { fill: #fff; font-size: 11px; font-weight: 700; }
.bp-reperes { padding-left: 22px; margin: 8px 0 0; }
.bp-reperes li { margin-bottom: 6px; }
.bp-reperes li div { display: flex; gap: 6px; }
.bp-reperes input { flex: 1; font: inherit; padding: 6px 10px; border: 1px solid var(--bordure); border-radius: var(--rayon); }
.bp-reperes button { border: none; background: none; color: #c62828; font: inherit; cursor: pointer; }`,
      js: OUTILS + `// Bilans : liste par patient, formulaire, schéma annoté, impression
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
liste();`
    }],
    journal: [{ version: '1.1.0', date: '2026-10-21', texte: 'Mode équipe : seulement les patients dont on voit le dossier médical' }, { version: '1.0.0', date: '2026-10-21', texte: 'Première version' }]
  });

  /* ======================= Agenda ======================= */
  AB.blocs.declarer({
    id: 'agenda', nom: 'Agenda', version: '1.1.0', categorie: 'Santé', icone: 'mdi-calendar-clock-outline',
    description: 'Rendez-vous du jour, jour par jour, avec les patients ; statut (prévu, honoré, absent, annulé), alerte en cas de chevauchement. En équipe : un agenda par praticien, le secrétariat voit et remplit tous les agendas.',
    donneesPersonnelles: true,
    reglages: [
      { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Agenda' },
      { cle: 'debut', label: 'Ouverture (heure)', type: 'nombre', defaut: 8 },
      { cle: 'fin', label: 'Fermeture (heure)', type: 'nombre', defaut: 19 },
      { cle: 'duree', label: 'Durée par défaut (minutes)', type: 'nombre', defaut: 30 }
    ],
    ecrans: [{
      id: 'agenda', titre: '{{onglet}}', icone: 'mdi-calendar-clock-outline',
      html: `<div class="ag-nav">
  <button class="btn secondaire" type="button" data-prec aria-label="Jour précédent">‹</button>
  <input class="ag-jour" type="date" data-jour aria-label="Jour affiché">
  <button class="btn secondaire" type="button" data-suiv aria-label="Jour suivant">›</button>
  <button class="btn lien" type="button" data-auj>Aujourd’hui</button>
  <select class="ag-pra" data-filtre-pra aria-label="Praticien" hidden></select>
</div>
<p class="discret" data-resume></p>
<ul class="liste" data-liste></ul>
<form class="carte ag-form" data-form>
  <h2 class="pt-h2">Nouveau rendez-vous</h2>
  <div class="pt-grille">
    <div class="champ"><label for="ag-patient">Patient</label><select id="ag-patient" name="patient" required></select></div>
    <div class="champ"><label for="ag-date">Date</label><input id="ag-date" name="date" type="date" required></div>
    <div class="champ"><label for="ag-heure">Heure</label><input id="ag-heure" name="heure" type="time" step="300" required></div>
    <div class="champ"><label for="ag-duree">Durée (min)</label><input id="ag-duree" name="duree" type="number" min="5" step="5" required></div>
    <div class="champ" data-champ-pra hidden><label for="ag-pra">Praticien</label><select id="ag-pra" name="praticien"></select></div>
  </div>
  <div class="champ"><label for="ag-motif">Motif</label><input id="ag-motif" name="motif"></div>
  <button class="btn large" type="submit">Ajouter le rendez-vous</button>
</form>`,
      css: `.ag-nav { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.ag-nav .btn.secondaire { padding: 8px 14px; }
.ag-jour, .ag-pra { font: inherit; padding: 8px 10px; border: 1px solid var(--bordure); border-radius: var(--rayon); }
.ag-rdv { display: flex; gap: 10px; align-items: flex-start; }
.ag-heure { font-weight: 700; min-width: 92px; }
.ag-rdv .ag-corps { flex: 1; min-width: 0; }
.ag-rdv select { font: inherit; font-size: 13px; padding: 4px; border: 1px solid var(--bordure); border-radius: 6px; }
.ag-annule { opacity: .55; text-decoration: line-through; }
.ag-corps a { color: var(--accent); font-weight: 600; }
.ag-form { margin-top: 16px; }`,
      js: OUTILS + `// Agenda du jour
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
dessiner();`
    }],
    journal: [{ version: '1.1.0', date: '2026-10-21', texte: 'Mode équipe : agenda par praticien, le secrétariat choisit le praticien' }, { version: '1.0.0', date: '2026-10-21', texte: 'Première version' }]
  });

  /* ======================= Facturation ======================= */
  AB.blocs.declarer({
    id: 'facturation', nom: 'Facturation', version: '1.1.0', categorie: 'Santé', icone: 'mdi-receipt-text-outline',
    description: 'Factures numérotées par année (non modifiables après création), actes et tarifs réglables, paiement, impression PDF, chiffre du mois et export comptable CSV (importable dans les Revenus de l’Atelier). En équipe : numéro donné par le serveur, par praticien, en-tête tiré du profil du praticien.',
    donneesPersonnelles: true,
    reglages: [
      { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Factures' },
      { cle: 'actes', label: 'Actes et tarifs (« libellé — prix », un par ligne)', type: 'liste', defaut: 'Soin de pédicurie-podologie — 35\nBilan podologique — 45\nSemelles orthopédiques — 150\nSoin à domicile — 45' },
      { cle: 'cabinet', label: 'Nom du cabinet', type: 'texte', defaut: 'Cabinet de pédicurie-podologie' },
      { cle: 'praticien', label: 'Praticien', type: 'texte', defaut: '' },
      { cle: 'adresse', label: 'Adresse du cabinet', type: 'texte-long', defaut: '' },
      { cle: 'identifiants', label: 'Identifiants (RPPS, SIRET)', type: 'texte', defaut: '' },
      { cle: 'mention', label: 'Mention TVA', type: 'texte', defaut: 'TVA non applicable, article 261-4-1° du CGI' }
    ],
    ecrans: [{
      id: 'factures', titre: '{{onglet}}', icone: 'mdi-receipt-text-outline',
      html: `<div class="fa-resume" data-resume></div>
<div class="pt-barre"><input class="pt-cherche" type="month" data-mois aria-label="Mois"><select data-filtre-pra aria-label="Praticien" hidden></select><button class="btn" type="button" data-nouvelle>+ Facture</button><button class="btn secondaire" type="button" data-csv>Export CSV</button></div>
<ul class="liste" data-liste></ul>
<form class="carte" data-form hidden>
  <h2 class="pt-h2">Nouvelle facture</h2>
  <div class="pt-grille">
    <div class="champ"><label for="fa-patient">Patient</label><select id="fa-patient" name="patient" required></select></div>
    <div class="champ" data-champ-date><label for="fa-date">Date</label><input id="fa-date" name="date" type="date" required></div>
    <div class="champ" data-champ-pra hidden><label for="fa-pra">Praticien</label><select id="fa-pra" name="praticien"></select></div>
  </div>
  <div data-lignes></div>
  <button class="btn lien" type="button" data-ajout>+ Ajouter un acte</button>
  <p class="fa-total">Total : <b data-total></b></p>
  <div class="pt-grille">
    <div class="champ"><label for="fa-mode">Mode de paiement</label><select id="fa-mode" name="mode"><option>Carte bancaire</option><option>Espèces</option><option>Chèque</option><option>Virement</option></select></div>
    <div class="champ"><label for="fa-statut">Statut</label><select id="fa-statut" name="statut"><option value="payée">Payée</option><option value="en attente">En attente</option></select></div>
  </div>
  <div class="pt-actions"><button class="btn" type="submit">Créer la facture</button><button class="btn secondaire" type="button" data-annuler>Annuler</button></div>
  <p class="discret">Une facture créée ne se modifie plus (numérotation continue) ; seul son paiement peut changer.</p>
</form>`,
      css: `.fa-resume { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.fa-tuile { background: var(--carte); border: 1px solid var(--bordure); border-radius: var(--rayon); padding: 10px; }
.fa-tuile b { display: block; font-size: 18px; }
.fa-tuile span { font-size: 12px; color: var(--discret); }
.fa-ligne { display: grid; grid-template-columns: 1fr 64px 90px 32px; gap: 6px; margin-bottom: 6px; }
.fa-ligne select, .fa-ligne input { font: inherit; padding: 8px; border: 1px solid var(--bordure); border-radius: var(--rayon); min-width: 0; }
.fa-ligne button { border: none; background: none; color: #c62828; font-size: 18px; cursor: pointer; }
.fa-total { font-size: 16px; text-align: right; }
.fa-facture { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.fa-facture .ag-corps { flex: 1; min-width: 140px; }`,
      js: OUTILS + `// Factures : création, paiement, impression, export
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
dessiner();`
    }],
    journal: [{ version: '1.1.0', date: '2026-10-21', texte: 'Mode équipe : numéro donné par le serveur, en-tête du praticien' }, { version: '1.0.0', date: '2026-10-21', texte: 'Première version' }]
  });

  /* ======================= Journal d'accès ======================= */
  AB.blocs.declarer({
    id: 'journal-acces', nom: 'Journal d’accès', version: '1.1.0', categorie: 'Sécurité', icone: 'mdi-clipboard-text-clock-outline',
    description: 'Trace qui ouvre, crée, modifie, imprime ou exporte quoi, et quand (dossiers patients, factures, déverrouillages). Consultable et exportable, sans effacement depuis l’app.',
    reglages: [
      { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Journal' },
      { cle: 'garder', label: 'Nombre d’entrées gardées', type: 'nombre', defaut: 5000 }
    ],
    init: `// Les autres blocs appellent appli.tracer(action, détail)
// Avec le Serveur du cabinet, c'est le serveur qui tient le journal (bloc placé avant celui-ci)
if (appli.serveurDonnees) return;
const max = Math.max(100, Number(reglages.garder) || 5000);
appli.tracer = function (action, detail) {
  const l = appli.stockage.get('table:journal') || [];
  l.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: new Date().toISOString(),
    qui: appli.utilisateur ? String(appli.utilisateur.email || appli.utilisateur.id) : 'non déverrouillé',
    action: String(action || '').slice(0, 80), detail: String(detail || '').slice(0, 200) });
  appli.stockage.set('table:journal', l.slice(-max));
};`,
    ecrans: [{
      id: 'journal', titre: '{{onglet}}', icone: 'mdi-clipboard-text-clock-outline',
      html: `<h1 class="titre">Journal d’accès</h1>
<p class="sous-titre" data-sous-titre>Qui a ouvert ou modifié quoi, et quand, sur cet appareil.</p>
<div class="pt-barre"><input class="pt-cherche" type="search" placeholder="Filtrer (patient, action…)" aria-label="Filtrer le journal" data-filtre><button class="btn secondaire" type="button" data-csv>Export CSV</button></div>
<ul class="liste jo-liste" data-liste></ul>`,
      css: `.jo-liste li { display: flex; gap: 10px; font-size: 13px; padding: 8px 12px; }
.jo-liste time { color: var(--discret); white-space: nowrap; }`,
      js: OUTILS + `// Journal : 300 dernières entrées, filtre, export
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
dessiner();`
    }],
    journal: [{ version: '1.1.0', date: '2026-10-21', texte: 'Mode équipe : journal tenu par le serveur du cabinet' }, { version: '1.0.0', date: '2026-10-21', texte: 'Première version' }]
  });

  /* ======================= Sauvegarde chiffrée ======================= */
  AB.blocs.declarer({
    id: 'sauvegarde', nom: 'Sauvegarde chiffrée', version: '1.0.0', categorie: 'Sécurité', icone: 'mdi-shield-lock-outline',
    description: 'Exporte toutes les données de l’app dans un fichier chiffré (AES-GCM 256, clé tirée d’un mot de passe) et les restaure ; rappel quand la dernière sauvegarde est ancienne.',
    reglages: [
      { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Sauvegarde' },
      { cle: 'rappel', label: 'Rappel après (jours)', type: 'nombre', defaut: 7 }
    ],
    init: `// Rappel de sauvegarde, une fois par ouverture, après déverrouillage
let rappele = false;
appli.surUtilisateur(u => {
  if (!u || rappele) return;
  rappele = true;
  const der = appli.stockage.get('sauvegarde-derniere');
  const jours = der ? (Date.now() - Date.parse(der)) / 86400000 : Infinity;
  if (jours > (Number(reglages.rappel) || 7) && (appli.lire('patients').length || appli.lire('factures').length)) appli.toast('Pense à faire une sauvegarde chiffrée (onglet ' + reglages.onglet + ').');
});`,
    ecrans: [{
      id: 'sauvegarde', titre: '{{onglet}}', icone: 'mdi-shield-lock-outline',
      html: `<h1 class="titre">Sauvegarde chiffrée</h1>
<p class="sous-titre" data-derniere></p>
<form class="carte" data-export>
  <h2 class="pt-h2">Créer une sauvegarde</h2>
  <div class="champ"><label for="sv-mdp">Mot de passe de la sauvegarde (10 caractères au moins)</label><input id="sv-mdp" name="mdp" type="password" autocomplete="new-password" required minlength="10"></div>
  <div class="champ"><label for="sv-mdp2">Confirmer</label><input id="sv-mdp2" name="mdp2" type="password" autocomplete="new-password" required></div>
  <button class="btn large" type="submit">Télécharger la sauvegarde</button>
  <p class="discret">Garde le fichier sur une clé USB ou un disque à part. Sans ce mot de passe, personne ne peut le lire, toi compris.</p>
</form>
<form class="carte" data-import>
  <h2 class="pt-h2">Restaurer une sauvegarde</h2>
  <div class="champ"><label for="sv-fichier">Fichier de sauvegarde</label><input id="sv-fichier" name="fichier" type="file" accept=".json,application/json" required></div>
  <div class="champ"><label for="sv-mdp3">Mot de passe</label><input id="sv-mdp3" name="mdp" type="password" autocomplete="current-password" required></div>
  <button class="btn secondaire large" type="submit">Restaurer (remplace les données de cet appareil)</button>
</form>`,
      js: OUTILS + `// Chiffrement : PBKDF2-SHA-256 (310 000 tours) → AES-GCM 256
const b64 = o => { let s = ''; for (let i = 0; i < o.length; i += 32768) s += String.fromCharCode.apply(null, o.subarray(i, i + 32768)); return btoa(s); };
const deB64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function cle(mdp, sel) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(mdp), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function derniere() {
  const d = appli.stockage.get('sauvegarde-derniere');
  racine.querySelector('[data-derniere]').textContent = d ? 'Dernière sauvegarde : ' + new Date(d).toLocaleString('fr-FR') : 'Aucune sauvegarde faite depuis cet appareil.';
}
const fe = racine.querySelector('[data-export]'), fi = racine.querySelector('[data-import]');
fe.addEventListener('submit', async e => {
  e.preventDefault();
  if (fe.elements.mdp.value !== fe.elements.mdp2.value) return appli.toast('Les deux mots de passe sont différents.');
  const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const donnees = new TextEncoder().encode(JSON.stringify(appli.exporterDonnees()));
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cle(fe.elements.mdp.value, sel), donnees));
  const d = new Date();
  appli.telecharger('sauvegarde-' + aujourdhui() + '.json', JSON.stringify({ format: 'ap-sauvegarde/1', app: document.title, date: d.toISOString(), kdf: 'PBKDF2-SHA256-310000', sel: b64(sel), iv: b64(iv), donnees: b64(chiffre) }), 'application/json');
  appli.stockage.set('sauvegarde-derniere', d.toISOString());
  appli.tracer('sauvegarde chiffrée', '');
  fe.reset(); derniere();
  appli.toast('Sauvegarde téléchargée');
});
fi.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const f = JSON.parse(await fi.elements.fichier.files[0].text());
    if (f.format !== 'ap-sauvegarde/1') throw new Error('Ce fichier n’est pas une sauvegarde de l’app.');
    let clair;
    try { clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(f.iv) }, await cle(fi.elements.mdp.value, deB64(f.sel)), deB64(f.donnees)); }
    catch (x) { throw new Error('Mot de passe incorrect ou fichier abîmé.'); }
    if (!confirm('Remplacer les données de cet appareil par la sauvegarde du ' + new Date(f.date).toLocaleString('fr-FR') + ' ?')) return;
    appli.importerDonnees(JSON.parse(new TextDecoder().decode(clair)));
    appli.tracer('restauration d’une sauvegarde', f.date);
    appli.toast('Sauvegarde restaurée');
    setTimeout(() => location.reload(), 800);
  } catch (x) { appli.toast(x.message); }
});
racine.closest('.ap-page').addEventListener('ap:affiche', derniere);
derniere();`
    }],
    journal: [{ version: '1.0.0', date: '2026-10-21', texte: 'Première version' }]
  });
})();
