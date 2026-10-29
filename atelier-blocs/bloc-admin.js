/* ==========================================================================
   bloc-admin.js — bloc « Mode admin » (contenu modifiable dans l'app publiée)
   Un administrateur connecté voit un bouton « Modifier le contenu » : il
   change les textes et les listes de l'écran affiché, et tous les
   utilisateurs voient la nouvelle version, sans republier l'app.
   Sécurité :
   - les administrateurs sont listés dans le secret ADMIN_EMAILS (côté
     serveur seulement) ; la fonction serveur vérifie la session et l'e-mail
     confirmé avant toute écriture ;
   - la table « contenu » est en lecture publique, écriture par le serveur ;
   - seuls les textes et les listes déclarés par les blocs sont modifiables
     (jamais un prix, une option ou une couleur), et ils restent échappés à
     l'affichage.
   Sans Supabase (aperçu, démo) : mode admin simulé, gardé sur l'appareil.
   ========================================================================== */
AB.blocs.declarer({
  id: 'admin-contenu', nom: 'Mode admin', version: '1.0.0', categorie: 'Gestion', icone: 'mdi-pencil-box-multiple-outline',
  description: 'Les administrateurs modifient les textes et les listes de l’app directement sur le téléphone ; tout le monde voit la nouvelle version sans republier l’app.',
  dependances: ['connexion'],
  reglages: [
    { cle: 'bouton', label: 'Texte du bouton', type: 'texte', defaut: 'Modifier le contenu' }
  ],
  env: [
    { cle: 'ADMIN_EMAILS', role: 'E-mails des administrateurs, séparés par des virgules (secret Supabase)', secret: true },
    { cle: 'APP_URL', role: 'Adresse publique de l’app, ex. https://monapp.fr/', secret: false, serveur: true }
  ],
  tables: [{
    nom: 'contenu', acces: 'lecture-publique',
    colonnes: [['instance', 'texte', 'unique not null'], ['valeurs', 'json', "not null default '{}'::jsonb"], ['modifie_par', 'texte']]
  }],
  serveur: [{
    nom: 'contenu-admin', methode: 'POST',
    code: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Champs modifiables par écran, écrits à la génération : rien d'autre n'est accepté.
const MODIFIABLES: Record<string, string[]> = __MODIFIABLES__;
const ADMINS = (Deno.env.get('ADMIN_EMAILS') ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

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
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée' }, 405);

  // Utilisateur connecté (jeton de session envoyé par l'app), e-mail confirmé et listé dans ADMIN_EMAILS
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ erreur: 'Connexion requise' }, 401);
  const admin = !!user.email && !!user.email_confirmed_at && ADMINS.includes(user.email.toLowerCase());

  let corps: { action?: string; instance?: string; valeurs?: Record<string, unknown> };
  try { corps = await req.json(); } catch { return json({ erreur: 'Demande illisible' }, 400); }
  if (corps.action === 'verifier') return json({ admin });
  if (!admin) return json({ erreur: 'Réservé aux administrateurs' }, 403);
  if (corps.action !== 'enregistrer') return json({ erreur: 'Action inconnue' }, 400);

  const instance = String(corps.instance ?? '');
  const permis = MODIFIABLES[instance];
  if (!permis) return json({ erreur: 'Écran inconnu' }, 400);
  const valeurs: Record<string, string> = {};
  for (const cle of permis) {
    const v = (corps.valeurs ?? {})[cle];
    if (typeof v === 'string' && v.length <= 5000) valeurs[cle] = v;
  }

  // Écriture avec la clé de service (jamais dans l'app) : la table n'est pas modifiable depuis le navigateur
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await db.from('contenu').upsert({ instance, valeurs, modifie_par: user.email }, { onConflict: 'instance' });
  if (error) return json({ erreur: 'Enregistrement impossible' }, 500);
  return json({ ok: true });
});`
  }],
  init: `// Contenu enregistré : lu dans la table « contenu » (lecture publique), ou sur l'appareil en démo
const ESSAI = 'contenu-essai';
appli.attendre('supabase').then(async sb => {
  if (!sb) { appli.fournir('contenu', appli.stockage.get(ESSAI) || {}); return; }
  try {
    const { data, error } = await sb.from('contenu').select('instance, valeurs');
    if (error) throw error;
    appli.fournir('contenu', Object.fromEntries((data || []).map(l => [l.instance, l.valeurs || {}])));
  } catch (e) { appli.fournir('contenu', null); }
});

// Bouton « Modifier le contenu », visible pour un administrateur (vérifié par le serveur)
let bouton = null;
function montrer(oui) {
  if (!oui) { if (bouton) bouton.remove(); bouton = null; return; }
  if (bouton) return;
  bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'ad-bouton';
  bouton.innerHTML = '<span class="mdi mdi-pencil"></span>';
  bouton.setAttribute('aria-label', reglages.bouton || 'Modifier le contenu');
  bouton.title = reglages.bouton || 'Modifier le contenu';
  bouton.onclick = editer;
  document.body.appendChild(bouton);
}
appli.surUtilisateur(async u => {
  const sb = await appli.attendre('supabase');
  if (!sb) { montrer(true); return; }   // démo : mode admin simulé
  if (!u) { montrer(false); return; }
  try {
    const { data } = await sb.functions.invoke('contenu-admin', { body: { action: 'verifier' } });
    montrer(!!(data && data.admin));
  } catch (e) { montrer(false); }
});

// Fenêtre d'édition des textes de l'écran affiché
function editer() {
  if (!appli.contenu) return appli.toast('Rien à modifier dans cette app.');
  const page = document.querySelector('.ap-page.active');
  const { instance, champs } = appli.contenu.champs(page ? page.dataset.page : '');
  if (!instance || !champs.length) return appli.toast('Cet écran n’a pas de texte modifiable.');
  const fond = document.createElement('div');
  fond.className = 'ad-fond';
  const boite = document.createElement('form');
  boite.className = 'ad-boite';
  const titre = document.createElement('h2');
  titre.textContent = reglages.bouton || 'Modifier le contenu';
  boite.appendChild(titre);
  champs.forEach(c => {
    const l = document.createElement('label');
    l.className = 'champ';
    const s = document.createElement('span');
    s.textContent = c.label + (c.type === 'liste' ? ' (un élément par ligne)' : '');
    const x = document.createElement(c.type === 'texte' ? 'input' : 'textarea');
    x.name = c.cle; x.value = c.valeur; x.maxLength = 5000;
    if (c.type !== 'texte') x.rows = c.type === 'liste' ? 6 : 4;
    l.append(s, x);
    boite.appendChild(l);
  });
  const actions = document.createElement('div');
  actions.className = 'ad-actions';
  actions.innerHTML = '<button type="button" class="btn secondaire">Annuler</button><button type="submit" class="btn">Publier</button>';
  boite.appendChild(actions);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  actions.querySelector('.secondaire').onclick = () => fond.remove();
  boite.onsubmit = async ev => {
    ev.preventDefault();
    const valeurs = {};
    champs.forEach(c => { valeurs[c.cle] = boite.elements[c.cle].value; });
    const sb = await appli.attendre('supabase');
    try {
      if (sb) {
        const { data, error } = await sb.functions.invoke('contenu-admin', { body: { action: 'enregistrer', instance, valeurs } });
        if (error || !data || !data.ok) throw new Error((data && data.erreur) || 'Enregistrement impossible');
      } else {
        const essai = appli.stockage.get(ESSAI) || {};
        essai[instance] = Object.assign(essai[instance] || {}, valeurs);
        appli.stockage.set(ESSAI, essai);
      }
      const copie = appli.stockage.get('contenu') || {};
      copie[instance] = Object.assign(copie[instance] || {}, valeurs);
      appli.stockage.set('contenu', copie);
      fond.remove();
      appli.toast(sb ? 'Contenu publié pour tous les utilisateurs' : 'Contenu modifié (démo, sur cet appareil)');
      // Les écrans repartent avec le nouveau contenu
      setTimeout(() => location.reload(), 600);
    } catch (e) { appli.toast(e.message); }
  };
}`,
  ecrans: [{
    id: 'style', titre: 'Mode admin', cache: true, icone: 'mdi-pencil-box-multiple-outline', html: '',
    css: `.ad-bouton { position: fixed; right: 16px; bottom: 84px; width: 52px; height: 52px; border-radius: 50%; border: none; background: #131217; color: #fff; font-size: 24px; box-shadow: 0 4px 14px rgba(0,0,0,.25); cursor: pointer; z-index: 25; }
.ad-fond { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; justify-content: center; z-index: 40; }
.ad-boite { background: var(--carte); width: 100%; max-width: 560px; max-height: 85vh; overflow: auto; border-radius: 16px 16px 0 0; padding: 18px 16px; }
.ad-boite h2 { font-size: 18px; margin: 0 0 12px; }
.ad-actions { display: flex; gap: 8px; justify-content: flex-end; }`
  }],
  journal: [{ version: '1.0.0', date: '2026-10-21', texte: 'Première version : contenu modifiable par les administrateurs dans l’app publiée' }]
});
