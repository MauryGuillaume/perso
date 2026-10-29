/* ==========================================================================
   bloc-paiement.js — bloc « Paiement » (Stripe Checkout + Supabase)
   Sécurité :
   - le navigateur envoie seulement l'identifiant du produit ; le MONTANT est
     écrit dans la fonction serveur générée (__INSTANCES__), jamais lu du client ;
   - STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET restent dans les secrets Supabase ;
   - le paiement n'est enregistré que par le webhook, après vérification de la
     signature Stripe ; chaque utilisateur ne lit que ses paiements (RLS).
   Sans configuration (et dans l'aperçu) : paiement simulé.
   ========================================================================== */
AB.blocs.declarer({
  id: 'paiement', nom: 'Paiement en ligne', version: '1.1.0', categorie: 'Technique', icone: 'mdi-credit-card-outline',
  description: 'Paiement par carte avec Stripe Checkout. Montant fixé côté serveur, paiement confirmé par webhook signé, historique « Mes paiements ».',
  dependances: ['connexion'],
  donneesPersonnelles: true,
  reglages: [
    { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Boutique' },
    { cle: 'produit', label: 'Produit ou service', type: 'texte', defaut: 'Consultation' },
    { cle: 'description', label: 'Description', type: 'texte-long', defaut: 'Séance de 45 minutes.' },
    { cle: 'montant', label: 'Prix TTC (€)', type: 'nombre', defaut: 45 },
    { cle: 'bouton', label: 'Texte du bouton', type: 'texte', defaut: 'Payer' },
    { cle: 'merci', label: 'Message après paiement', type: 'texte', defaut: 'Merci ! Votre paiement est confirmé.' },
    { cle: 'historique', label: 'Afficher « Mes paiements »', type: 'booleen', defaut: true }
  ],
  env: [
    { cle: 'STRIPE_SECRET_KEY', role: 'Clé secrète Stripe (Développeurs › Clés API)', secret: true },
    { cle: 'STRIPE_WEBHOOK_SECRET', role: 'Secret de signature du webhook Stripe', secret: true },
    { cle: 'APP_URL', role: 'Adresse publique de l’app (retour après paiement), ex. https://monapp.fr/', secret: false, serveur: true }
  ],
  tables: [{
    nom: 'paiements', acces: 'lecture-proprietaire',
    colonnes: [['utilisateur', 'uuid'], ['produit', 'texte'], ['montant', 'decimal'], ['devise', 'texte'],
      ['statut', 'texte'], ['session_stripe', 'texte', 'unique not null']]
  }],
  serveur: [
    {
      nom: 'creer-paiement', methode: 'POST',
      code: `import Stripe from 'https://esm.sh/stripe@17.2.1?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Produits de l'app, écrits à la génération : le montant ne vient JAMAIS du navigateur.
const INSTANCES = __INSTANCES__;
const PRODUITS = Object.fromEntries(INSTANCES.map(i => [i.id, {
  nom: String(i.reglages.produit), montant: Math.round(Number(i.reglages.montant) * 100), devise: 'eur'
}]));

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
// CORS : seule l'app (APP_URL) peut appeler cette fonction depuis un navigateur
const cors = {
  'Access-Control-Allow-Origin': new URL(Deno.env.get('APP_URL')!).origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin'
};
const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Utilisateur connecté (jeton de session envoyé par l'app)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ erreur: 'Connexion requise' }, 401);

  let produit, page;
  try { ({ produit, page } = await req.json()); } catch (_e) { return json({ erreur: 'Demande illisible' }, 400); }
  const p = PRODUITS[produit];
  if (!p || !(p.montant > 0)) return json({ erreur: 'Produit inconnu' }, 400);
  // Adresse de retour construite côté serveur (pas de redirection vers un site extérieur)
  const retour = Deno.env.get('APP_URL')! + '#' + (/^[\\w-]+$/.test(page) ? page : '');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: p.devise, unit_amount: p.montant, product_data: { name: p.nom } } }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { produit },
    success_url: retour + '?paiement=ok',
    cancel_url: retour + '?paiement=annule'
  });
  return json({ url: session.url });
});`
    },
    {
      nom: 'stripe-webhook', methode: 'POST', public: true,
      code: `import Stripe from 'https://esm.sh/stripe@17.2.1?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Appelée par Stripe (sans session) : la signature prouve que l'appel vient bien de Stripe.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature') ?? '';
  const corps = await req.text();
  let evenement;
  try {
    evenement = await stripe.webhooks.constructEventAsync(corps, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, crypto);
  } catch (_e) {
    return new Response('Signature invalide', { status: 400 });
  }

  if (evenement.type === 'checkout.session.completed') {
    const s = evenement.data.object;
    // Clé service (fournie par Supabase aux fonctions) : écrit malgré la RLS, côté serveur uniquement.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await admin.from('paiements').upsert({
      session_stripe: s.id,
      utilisateur: s.client_reference_id,
      produit: s.metadata?.produit ?? '',
      montant: (s.amount_total ?? 0) / 100,
      devise: s.currency,
      statut: s.payment_status
    }, { onConflict: 'session_stripe' });
    if (error) return new Response(error.message, { status: 500 });   // Stripe réessaiera
  }
  return new Response(JSON.stringify({ recu: true }), { headers: { 'Content-Type': 'application/json' } });
});`
    }
  ],
  ecrans: [{
    id: 'paiement', titre: '{{onglet}}', icone: 'mdi-credit-card-outline',
    html: `<h1 class="titre">{{produit}}</h1>
<div class="ap-succes" data-ok hidden>{{merci}}</div>
<div class="ap-info" data-annule hidden>Paiement annulé : vous n’avez pas été débité.</div>
<div class="carte">
  <p>{{description}}</p>
  <p class="prix" data-prix></p>
  <button class="btn large" type="button" data-payer><span class="mdi mdi-lock-outline"></span>{{bouton}}</button>
  <p class="discret" style="margin-top:8px">Paiement sécurisé par Stripe. Vos données bancaires ne passent pas par cette app.</p>
</div>
{{?historique}}<h2 class="titre" style="font-size:17px">Mes paiements</h2>
<ul class="liste" data-historique><li class="discret">Connectez-vous pour voir vos paiements.</li></ul>{{/historique}}`,
    js: `// Écran Paiement : lance Stripe Checkout et affiche l'historique
const $ = s => racine.querySelector(s);
const page = racine.closest('.ap-page').dataset.page;
$('[data-prix]').textContent = appli.prix(reglages.montant);

// Retour de Stripe : #page?paiement=ok ou =annule
function lireRetour() {
  const statut = (location.hash.split('?')[1] || '').match(/paiement=(\\w+)/);
  $('[data-ok]').hidden = !statut || statut[1] !== 'ok';
  $('[data-annule]').hidden = !statut || statut[1] !== 'annule';
}
window.addEventListener('hashchange', lireRetour);
lireRetour();

async function historique() {
  const ul = $('[data-historique]');
  if (!ul || !appli.utilisateur) return;
  let lignes = [];
  if (appli.demo) lignes = appli.lire('paiements').filter(p => p.utilisateur === appli.utilisateur.id);
  else {
    const sb = await appli.attendre('supabase');
    const { data } = await sb.from('paiements').select('produit, montant, statut, cree_le').order('cree_le', { ascending: false });
    lignes = data || [];
  }
  ul.innerHTML = '';
  if (!lignes.length) ul.innerHTML = '<li class="discret">Aucun paiement pour le moment.</li>';
  lignes.forEach(p => {
    const li = document.createElement('li');
    li.textContent = appli.date(p.cree_le) + ' · ' + appli.prix(p.montant) + (p.statut === 'paid' ? '' : ' · ' + p.statut);
    ul.appendChild(li);
  });
}
appli.surUtilisateur(historique);

$('[data-payer]').onclick = async () => {
  if (!appli.exigerConnexion()) return;
  const bouton = $('[data-payer]');
  bouton.disabled = true;
  try {
    if (appli.demo) {
      appli.enregistrer('paiements', { utilisateur: appli.utilisateur.id, produit: reglages.__instance, montant: reglages.montant, statut: 'paid' });
      appli.toast('Mode démo : paiement simulé, aucune carte débitée.');
      appli.aller(page + '?paiement=ok');
      historique();
    } else {
      const sb = await appli.attendre('supabase');
      const { data, error } = await sb.functions.invoke('creer-paiement', { body: { produit: reglages.__instance, page } });
      if (error || !data.url) throw new Error((data && data.erreur) || 'Paiement indisponible pour le moment.');
      location.href = data.url;   // page de paiement Stripe
    }
  } catch (e) { appli.toast(e.message); }
  bouton.disabled = false;
};`
  }],
  journal: [
    { version: '1.0.0', date: '2026-10-20', texte: 'Première version : Stripe Checkout, webhook signé, historique' },
    { version: '1.1.0', date: '2026-10-20', texte: 'CORS limité à l’adresse de l’app (APP_URL), demande illisible refusée proprement' }
  ]
});
