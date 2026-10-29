// exemples/supabase/webhook-stripe.ts — fonction Supabase (Deno) qui reçoit les webhooks Stripe
// verify_jwt = false pour CETTE fonction seulement (dans supabase/config.toml) : c'est la signature qui protège.
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-11-20.acacia' });
const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode refusée', { status: 405 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Signature absente', { status: 400 });
  let evenement: Stripe.Event;
  try {
    evenement = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return new Response('Signature invalide', { status: 400 });   // pas de détail technique
  }
  // Idempotent : un même événement peut arriver deux fois (enregistrer evenement.id et ignorer un doublon).
  if (evenement.type === 'checkout.session.completed') {
    // … marquer le paiement comme payé, avec le montant lu chez Stripe (jamais celui envoyé par le navigateur)
  }
  return new Response(JSON.stringify({ recu: true }), { headers: { 'Content-Type': 'application/json' } });
});
