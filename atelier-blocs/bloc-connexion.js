/* ==========================================================================
   bloc-connexion.js — bloc « Connexion » (Supabase Auth)
   Inscription, connexion, mot de passe oublié, nouveau mot de passe,
   déconnexion. Fournit le client Supabase aux autres blocs
   (appli.attendre('supabase')) et l'utilisateur connecté (appli.utilisateur).
   Sans SUPABASE_URL / SUPABASE_ANON_KEY (et dans l'aperçu) : mode démo,
   comptes simulés dans le navigateur.
   ========================================================================== */
AB.blocs.declarer({
  id: 'connexion', nom: 'Connexion', version: '1.1.0', categorie: 'Technique', icone: 'mdi-account-lock-outline',
  description: 'Comptes utilisateurs avec Supabase Auth : inscription, connexion, mot de passe oublié, déconnexion. Permet de réserver des écrans aux utilisateurs connectés.',
  donneesPersonnelles: true,
  reglages: [
    { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Compte' },
    { cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Mon compte' },
    { cle: 'inscription', label: 'Inscription ouverte à tous', type: 'booleen', defaut: true },
    { cle: 'accueil', label: 'Message une fois connecté', type: 'texte', defaut: 'Vous êtes connecté.' }
  ],
  env: [
    { cle: 'SUPABASE_URL', role: 'Adresse du projet Supabase (Settings › API)', secret: false },
    { cle: 'SUPABASE_ANON_KEY', role: 'Clé publique « anon » de Supabase (protégée par les règles RLS)', secret: false }
  ],
  init: `// Prépare le client Supabase, ou le mode démo s'il n'est pas configuré
const url = appli.config.SUPABASE_URL, cle = appli.config.SUPABASE_ANON_KEY;
if (appli.apercu || !url || !cle) {
  appli.demo = true;
  appli.fournir('supabase', null);
  appli.definirUtilisateur(appli.stockage.get('demo-utilisateur') || null);
  return;
}
appli.charger('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o').then(() => {
  const sb = window.supabase.createClient(url, cle);
  appli.fournir('supabase', sb);
  sb.auth.getSession().then(({ data }) => appli.definirUtilisateur(data.session ? data.session.user : null));
  // PASSWORD_RECOVERY : l'utilisateur revient du lien « mot de passe oublié »
  sb.auth.onAuthStateChange((evenement, session) => appli.definirUtilisateur(session ? session.user : null, evenement));
}).catch(e => appli.toast(e.message));`,
  ecrans: [{
    id: 'compte', titre: '{{onglet}}', icone: 'mdi-account-circle-outline', role: 'connexion',
    html: `<h1 class="titre">{{titre}}</h1>
<div class="ap-info" data-demo hidden>Mode démo : les comptes sont simulés sur cet appareil.</div>
<form class="carte" data-form-connexion>
  <div class="champ"><label>Email</label><input type="email" name="email" autocomplete="email" required></div>
  <div class="champ"><label>Mot de passe</label><input type="password" name="mdp" autocomplete="current-password" maxlength="128" required></div>
  <div class="ap-erreur" data-erreur hidden></div>
  <button class="btn large" type="submit" data-valider>Se connecter</button>
  <div style="display:flex;justify-content:space-between;margin-top:8px">
    {{?inscription}}<button class="btn lien" type="button" data-basculer>Créer un compte</button>{{/inscription}}
    <button class="btn lien" type="button" data-oubli>Mot de passe oublié ?</button>
  </div>
</form>
<form class="carte" data-form-nouveau hidden>
  <p>Choisissez un nouveau mot de passe.</p>
  <div class="champ"><label>Nouveau mot de passe</label><input type="password" name="mdp" autocomplete="new-password" maxlength="128" required></div>
  <button class="btn large" type="submit">Enregistrer</button>
</form>
<div class="carte" data-connecte hidden>
  <p>{{accueil}}</p>
  <p class="discret" data-email></p>
  <button class="btn secondaire large" type="button" data-deconnexion>Se déconnecter</button>
</div>`,
    js: `// Écran Compte : connexion / inscription / mot de passe oublié / profil
const $ = s => racine.querySelector(s);
const form = $('[data-form-connexion]'), formNouveau = $('[data-form-nouveau]');
const secu = appli.kit('securite');
const mdpMin = Number(secu.mdpMin) || 8;
// Règles du kit de cybersécurité (Supabase Auth les vérifie aussi côté serveur)
function erreurMdp(m) {
  if (m.length < mdpMin) return 'Le mot de passe doit contenir au moins ' + mdpMin + ' caractères.';
  if (secu.mdpComplexe && !(/[a-z]/.test(m) && /[A-Z]/.test(m) && /[0-9]/.test(m) && /[^A-Za-z0-9]/.test(m)))
    return 'Le mot de passe doit contenir une minuscule, une majuscule, un chiffre et un symbole.';
  return '';
}
let inscription = false;

const montrerErreur = texte => { $('[data-erreur]').textContent = texte; $('[data-erreur]').hidden = !texte; };
const traduire = m => /Invalid login/i.test(m) ? 'Email ou mot de passe incorrect.'
  : /already registered/i.test(m) ? 'Un compte existe déjà avec cet email.'
  : /Email not confirmed/i.test(m) ? 'Confirmez d’abord votre email (lien reçu par email).' : m;

function dessiner(u, evenement) {
  $('[data-demo]').hidden = !appli.demo;
  formNouveau.hidden = evenement !== 'PASSWORD_RECOVERY';
  form.hidden = !!u || !formNouveau.hidden;
  $('[data-connecte]').hidden = !u || !formNouveau.hidden;
  if (u) $('[data-email]').textContent = u.email;
}
appli.surUtilisateur(dessiner);

const basculer = $('[data-basculer]');
if (basculer) basculer.onclick = () => {
  inscription = !inscription;
  $('[data-valider]').textContent = inscription ? 'Créer mon compte' : 'Se connecter';
  basculer.textContent = inscription ? 'J’ai déjà un compte' : 'Créer un compte';
  form.mdp.autocomplete = inscription ? 'new-password' : 'current-password';
  montrerErreur('');
};

form.addEventListener('submit', async e => {
  e.preventDefault();
  const email = form.email.value.trim(), mdp = form.mdp.value;
  if (inscription && erreurMdp(mdp)) return montrerErreur(erreurMdp(mdp));
  montrerErreur('');
  $('[data-valider]').disabled = true;
  try {
    if (appli.demo) {
      const comptes = appli.stockage.get('demo-comptes') || {};
      if (inscription) comptes[email] = true;
      else if (!comptes[email]) throw new Error('Mode démo : créez d’abord un compte.');
      appli.stockage.set('demo-comptes', comptes);
      const u = { id: 'demo-' + email, email };
      appli.stockage.set('demo-utilisateur', u);
      appli.definirUtilisateur(u);
    } else {
      const sb = await appli.attendre('supabase');
      const r = inscription ? await sb.auth.signUp({ email, password: mdp }) : await sb.auth.signInWithPassword({ email, password: mdp });
      if (r.error) throw r.error;
      if (inscription && !r.data.session) appli.toast('Compte créé : confirmez votre email avec le lien reçu.');
    }
    form.reset();
  } catch (err) { montrerErreur(traduire(err.message)); }
  $('[data-valider]').disabled = false;
});

$('[data-oubli]').onclick = async () => {
  const email = form.email.value.trim();
  if (!email) return montrerErreur('Saisissez votre email, puis cliquez sur « Mot de passe oublié ».');
  if (appli.demo) return appli.toast('Mode démo : aucun email n’est envoyé.');
  const sb = await appli.attendre('supabase');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] + '#' + racine.closest('.ap-page').dataset.page });
  if (error) montrerErreur(traduire(error.message)); else appli.toast('Email envoyé : suivez le lien pour choisir un nouveau mot de passe.');
};

formNouveau.addEventListener('submit', async e => {
  e.preventDefault();
  const mdp = formNouveau.mdp.value;
  if (erreurMdp(mdp)) return appli.toast(erreurMdp(mdp));
  const sb = await appli.attendre('supabase');
  const { error } = await sb.auth.updateUser({ password: mdp });
  if (error) return appli.toast(traduire(error.message));
  appli.toast('Mot de passe modifié.');
  dessiner(appli.utilisateur);
});

$('[data-deconnexion]').onclick = async () => {
  if (appli.demo) { appli.stockage.set('demo-utilisateur', null); appli.definirUtilisateur(null); return; }
  const sb = await appli.attendre('supabase');
  await sb.auth.signOut();
};`
  }],
  journal: [
    { version: '1.0.0', date: '2026-10-20', texte: 'Première version : Supabase Auth, mode démo' },
    { version: '1.1.0', date: '2026-10-20', texte: 'Mots de passe complexes selon le kit de cybersécurité, longueur maximale 128, script Supabase vérifié (SRI)' }
  ]
});
