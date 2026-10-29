/* ==========================================================================
   bloc-stats.js — bloc « Statistiques » : l'Atelier récupère les chiffres de l'app
   Une fonction serveur de l'app renvoie, sur 12 mois, les revenus déjà
   enregistrés (table « paiements » du bloc Paiement en ligne) et les
   utilisateurs (total, actifs sur 30 jours, nouveaux du mois).
   Sécurité :
   - seul le serveur local de l'Atelier l'appelle, avec un jeton secret
     (ATELIER_STATS_JETON, 32 caractères au moins) comparé en temps constant ;
     le jeton n'est jamais dans l'app ni dans le navigateur ;
   - pas de CORS : un navigateur ne peut pas lire la réponse ;
   - la réponse ne contient que des totaux, aucune donnée personnelle.
   Format de la réponse (« atelier-stats/1 ») : toute autre app (NestJS,
   Laravel…) peut le renvoyer pour être récupérée de la même façon.
   ========================================================================== */
AB.blocs.declarer({
  id: 'stats-atelier', nom: 'Statistiques', version: '1.0.0', categorie: 'Gestion', icone: 'mdi-chart-box-outline',
  description: 'L’Atelier récupère d’un clic les revenus et les utilisateurs de l’app (totaux par mois, sans donnée personnelle).',
  reglages: [],
  env: [
    { cle: 'ATELIER_STATS_JETON', role: 'Jeton partagé avec le serveur local de l’Atelier (openssl rand -hex 32), secret Supabase', secret: true }
  ],
  serveur: [{
    nom: 'stats-atelier', methode: 'POST', public: true,
    code: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Appelée uniquement par le serveur local de l'Atelier, avec le jeton partagé (pas de session utilisateur).
const JETON = Deno.env.get('ATELIER_STATS_JETON') ?? '';
const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Comparaison en temps constant : la durée ne révèle rien du jeton. */
function egal(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
const moisDe = (iso: string) => iso.slice(0, 7);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405);
  if (JETON.length < 32) return json({ erreur: 'ATELIER_STATS_JETON absent ou trop court' }, 503);
  if (!egal(req.headers.get('x-atelier-jeton') ?? '', JETON)) return json({ erreur: 'Interdit' }, 403);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const maintenant = new Date();
  const depuis = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 11, 1)).toISOString();

  // Revenus : paiements réussis des 12 derniers mois, additionnés par mois (table absente = pas de revenus)
  const parMois: Record<string, { montant: number; nombre: number }> = {};
  let devise = 'eur';
  const { data: paiements, error } = await db.from('paiements').select('montant, devise, cree_le').eq('statut', 'paid').gte('cree_le', depuis);
  if (!error) for (const p of paiements ?? []) {
    const m = moisDe(p.cree_le);
    parMois[m] = parMois[m] ?? { montant: 0, nombre: 0 };
    parMois[m].montant += Number(p.montant) || 0;
    parMois[m].nombre++;
    if (p.devise) devise = p.devise;
  }

  // Utilisateurs : seulement des totaux
  const trenteJours = Date.now() - 30 * 24 * 3600 * 1000, ceMois = moisDe(maintenant.toISOString());
  let total = 0, actifs30j = 0, nouveauxMois = 0;
  for (let page = 1; page <= 100; page++) {
    const { data, error: e } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (e) break;
    for (const u of data.users) {
      total++;
      if (u.last_sign_in_at && Date.parse(u.last_sign_in_at) >= trenteJours) actifs30j++;
      if (moisDe(u.created_at) === ceMois) nouveauxMois++;
    }
    if (data.users.length < 1000) break;
  }

  return json({
    format: 'atelier-stats/1', genere: maintenant.toISOString(), devise: devise.toUpperCase(),
    revenus: Object.entries(parMois).map(([mois, v]) => ({ mois, montant: Math.round(v.montant * 100) / 100, nombre: v.nombre, source: 'Ventes' })),
    utilisateurs: { total, actifs30j, nouveauxMois }
  });
});`
  }],
  journal: [{ version: '1.0.0', date: '2026-10-21', texte: 'Première version : revenus et utilisateurs récupérés par l’Atelier' }]
});
