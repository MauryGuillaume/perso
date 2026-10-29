/* ==========================================================================
   bloc-base.js — blocs fournis avec la plateforme
   Ils servent de point de départ et d'exemples du format. Les blocs métier
   (authentification, paiement Stripe, emails…) seront créés ensuite, un par un.
   Dans un écran :
   - html : gabarit, {{cle}} = réglage échappé, {{#liste}}…{{.}}…{{/liste}} = répétition,
            {{?cle}}…{{/cle}} = affiché si le réglage est vrai ;
   - js   : corps d'une fonction (racine, reglages, appli).
   ========================================================================== */

AB.blocs.declarer({
  id: 'accueil', nom: 'Accueil', version: '1.0.0', categorie: 'Présentation', icone: 'mdi-home-outline',
  description: 'Grand bandeau d’accueil avec un titre, une phrase et un bouton vers l’écran suivant.',
  reglages: [
    { cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Bienvenue' },
    { cle: 'phrase', label: 'Phrase d’accroche', type: 'texte-long', defaut: 'Tout ce dont vous avez besoin, dans votre poche.' },
    { cle: 'bouton', label: 'Texte du bouton', type: 'texte', defaut: 'Commencer' },
    { cle: 'avec_bouton', label: 'Afficher le bouton', type: 'booleen', defaut: true }
  ],
  ecrans: [{
    id: 'accueil', titre: 'Accueil', icone: 'mdi-home-outline',
    html: `<div class="hero">
  <h1>{{titre}}</h1>
  <p>{{phrase}}</p>
  {{?avec_bouton}}<button class="btn secondaire" data-suivant>{{bouton}}</button>{{/avec_bouton}}
</div>`,
    css: '',
    js: `// Le bouton mène à l'écran suivant de l'app
const bouton = racine.querySelector('[data-suivant]');
const suivant = racine.nextElementSibling;
if (bouton && suivant) bouton.addEventListener('click', () => appli.aller(suivant.dataset.page));`
  }],
  journal: [{ version: '1.0.0', date: '2026-10-20', texte: 'Première version' }]
});

AB.blocs.declarer({
  id: 'texte', nom: 'Page de texte', version: '1.0.0', categorie: 'Présentation', icone: 'mdi-text-box-outline',
  description: 'Un titre et des paragraphes (à propos, conditions, aide…).',
  reglages: [
    { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'À propos' },
    { cle: 'titre', label: 'Titre', type: 'texte', defaut: 'À propos' },
    { cle: 'paragraphes', label: 'Paragraphes (un par ligne)', type: 'liste', defaut: 'Présentez votre activité en quelques lignes.\nAjoutez autant de paragraphes que nécessaire.' }
  ],
  ecrans: [{
    id: 'page', titre: '{{onglet}}', icone: 'mdi-text-box-outline',
    html: `<h1 class="titre">{{titre}}</h1>
{{#paragraphes}}<p>{{.}}</p>{{/paragraphes}}`
  }],
  journal: [{ version: '1.0.0', date: '2026-10-20', texte: 'Première version' }]
});

AB.blocs.declarer({
  id: 'liste', nom: 'Liste', version: '1.0.0', categorie: 'Contenu', icone: 'mdi-format-list-bulleted',
  description: 'Liste simple d’éléments (services, tarifs, étapes…), avec recherche facultative.',
  reglages: [
    { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Services' },
    { cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Nos services' },
    { cle: 'elements', label: 'Éléments (un par ligne)', type: 'liste', defaut: 'Consultation — 45 €\nSuivi — 30 €\nBilan complet — 60 €' },
    { cle: 'recherche', label: 'Champ de recherche', type: 'booleen', defaut: false }
  ],
  ecrans: [{
    id: 'liste', titre: '{{onglet}}', icone: 'mdi-format-list-bulleted',
    html: `<h1 class="titre">{{titre}}</h1>
{{?recherche}}<div class="champ"><input type="search" placeholder="Rechercher…" data-recherche></div>{{/recherche}}
<ul class="liste">{{#elements}}<li>{{.}}</li>{{/elements}}</ul>`,
    js: `// Filtre la liste pendant la saisie
const champ = racine.querySelector('[data-recherche]');
if (champ) champ.addEventListener('input', () => {
  const q = champ.value.toLowerCase();
  racine.querySelectorAll('.liste li').forEach(li => { li.hidden = !li.textContent.toLowerCase().includes(q); });
});`
  }],
  journal: [{ version: '1.0.0', date: '2026-10-20', texte: 'Première version' }]
});

AB.blocs.declarer({
  id: 'formulaire', nom: 'Formulaire', version: '1.1.0', categorie: 'Données', icone: 'mdi-form-select',
  description: 'Formulaire libre (demande de contact, inscription…). Les réponses vont dans la table « reponses » de Supabase si le bloc Connexion est configuré, sinon elles restent sur l’appareil.',
  donneesPersonnelles: true,
  reglages: [
    { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Contact' },
    { cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Nous contacter' },
    { cle: 'champs', label: 'Champs (un libellé par ligne)', type: 'liste', defaut: 'Nom\nEmail\nMessage' },
    { cle: 'bouton', label: 'Texte du bouton', type: 'texte', defaut: 'Envoyer' },
    { cle: 'merci', label: 'Message de confirmation', type: 'texte', defaut: 'Merci, votre demande est bien enregistrée.' }
  ],
  tables: [
    { nom: 'reponses', acces: 'insertion-publique', colonnes: [['formulaire', 'texte'], ['donnees', 'json']] }
  ],
  ecrans: [{
    id: 'formulaire', titre: '{{onglet}}', icone: 'mdi-form-select',
    html: `<h1 class="titre">{{titre}}</h1>
<form class="carte" data-form>
  {{#champs}}<div class="champ"><label>{{.}}</label><input name="{{.}}" required></div>{{/champs}}
  <button class="btn large" type="submit">{{bouton}}</button>
</form>
<p class="discret" data-compteur></p>`,
    js: `// Enregistre la réponse (Supabase si disponible, sinon sur l'appareil)
const form = racine.querySelector('[data-form]');
const compteur = racine.querySelector('[data-compteur]');
const majCompteur = () => { compteur.textContent = appli.lire('reponses').length + ' réponse(s) envoyée(s) depuis cet appareil.'; };
form.addEventListener('submit', async e => {
  e.preventDefault();
  const ligne = { formulaire: reglages.titre, donnees: Object.fromEntries(new FormData(form)) };
  const sb = appli.demo ? null : await Promise.race([appli.attendre('supabase'), new Promise(ok => setTimeout(() => ok(null), 3000))]);
  if (sb) {
    const { error } = await sb.from('reponses').insert(ligne);
    if (error) return appli.toast('Envoi impossible : ' + error.message);
  }
  appli.enregistrer('reponses', ligne);
  form.reset();
  appli.toast(reglages.merci);
  majCompteur();
});
majCompteur();`
  }],
  journal: [
    { version: '1.0.0', date: '2026-10-20', texte: 'Première version' },
    { version: '1.1.0', date: '2026-10-20', texte: 'Envoi des réponses dans Supabase (insertion seule, lecture réservée au serveur)' }
  ]
});

AB.blocs.declarer({
  id: 'coordonnees', nom: 'Coordonnées', version: '1.0.0', categorie: 'Contenu', icone: 'mdi-card-account-phone-outline',
  description: 'Téléphone, email et adresse cliquables (appel, email, itinéraire).',
  reglages: [
    { cle: 'nom', label: 'Nom', type: 'texte', defaut: 'Mon entreprise' },
    { cle: 'telephone', label: 'Téléphone', type: 'texte', defaut: '01 23 45 67 89' },
    { cle: 'email', label: 'Email', type: 'texte', defaut: 'contact@exemple.fr' },
    { cle: 'adresse', label: 'Adresse', type: 'texte-long', defaut: '1 rue de la Paix, 75002 Paris' }
  ],
  ecrans: [{
    id: 'coordonnees', titre: 'Coordonnées', icone: 'mdi-map-marker-outline',
    html: `<h1 class="titre">{{nom}}</h1>
<ul class="liste">
  <li><a href="tel:{{telephone}}"><span class="mdi mdi-phone-outline"></span> {{telephone}}</a></li>
  <li><a href="mailto:{{email}}"><span class="mdi mdi-email-outline"></span> {{email}}</a></li>
  <li><a data-carte target="_blank" rel="noopener"><span class="mdi mdi-map-marker-outline"></span> {{adresse}}</a></li>
</ul>`,
    js: `// Lien vers l'itinéraire dans l'app de cartes du téléphone
racine.querySelector('[data-carte]').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(reglages.adresse);`
  }],
  journal: [{ version: '1.0.0', date: '2026-10-20', texte: 'Première version' }]
});
