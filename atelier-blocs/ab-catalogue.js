/* ==========================================================================
   ab-catalogue.js — fiches de départ des apps existantes de Guillaume
   Relevées dans apps.zip le 20/10/2026. Installées une seule fois au premier
   démarrage ; ensuite elles se modifient dans la plateforme.
   Seuls les NOMS des variables d'environnement sont repris, jamais leurs valeurs.
   ========================================================================== */
(function () {
  const env = (cle, role, secret) => ({ cle, role, secret: !!secret });

  const SUPABASE = [
    env('NEXT_PUBLIC_SUPABASE_URL', 'URL du projet Supabase'),
    env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Clé publique Supabase (anon)'),
    env('SUPABASE_SERVICE_ROLE_KEY', 'Clé service Supabase', true)
  ];
  const STRIPE = [
    env('STRIPE_SECRET_KEY', 'Clé secrète Stripe', true),
    env('STRIPE_WEBHOOK_SECRET', 'Secret de signature du webhook Stripe', true),
    env('STRIPE_PRICE_ID_PRO', 'Prix du plan Pro'),
    env('STRIPE_PRICE_ID_BUSINESS', 'Prix du plan Business')
  ];

  AB.catalogue = [
    {
      id: 'existante-postlocal', nom: 'PostLocal', icone: 'mdi-instagram',
      description: 'Génération de contenu réseaux sociaux par IA pour les petits commerces locaux.',
      stack: 'Next.js 14 + Supabase + OpenAI + Stripe', chemin: 'apps/postlocal',
      env: SUPABASE.concat([env('OPENAI_API_KEY', 'Clé OpenAI', true)], STRIPE, [env('NEXT_PUBLIC_APP_URL', 'URL publique de l’app')]),
      fonctionnalites: [
        ['Inscription / connexion (Supabase Auth)', 'connexion'],
        ['Onboarding du commerce', 'onboarding'],
        ['Génération de posts par IA', 'generation-ia'],
        ['Historique des posts', 'liste'],
        ['Abonnements Stripe (Free, Pro 9 €, Business 19 €)', 'abonnement-stripe'],
        ['Compteurs d’usage par plan', 'quotas']
      ],
      alertes: []
    },
    {
      id: 'existante-relancepro', nom: 'RelancePro', icone: 'mdi-bell-ring-outline',
      description: 'CRM ultra simplifié pour ne jamais oublier de relancer un prospect.',
      stack: 'Next.js 14 + Supabase + OpenAI + Stripe + Resend', chemin: 'apps/relancepro',
      env: SUPABASE.concat([
        env('OPENAI_API_KEY', 'Clé OpenAI', true),
        env('RESEND_API_KEY', 'Clé Resend (emails)', true),
        env('RESEND_FROM_EMAIL', 'Adresse d’expédition')
      ], STRIPE, [env('NEXT_PUBLIC_APP_URL', 'URL publique de l’app')]),
      fonctionnalites: [
        ['Inscription / connexion (Supabase Auth)', 'connexion'],
        ['Prospects et relances', 'crm-contacts'],
        ['Email de relance rédigé par IA', 'generation-ia'],
        ['Envoi d’emails (Resend)', 'emails'],
        ['Abonnements Stripe (Free, Pro 12 €, Business 29 €)', 'abonnement-stripe']
      ],
      alertes: []
    },
    {
      id: 'existante-livora', nom: 'Livora', icone: 'mdi-run',
      description: 'Programme quotidien personnalisé : sport, nutrition, sommeil, habitudes, avec gamification.',
      stack: 'Vue 3 + Vite (PWA) · API NestJS + Prisma', chemin: 'apps/livora',
      env: [
        env('VITE_ANTHROPIC_API_KEY', 'Clé Anthropic côté web', true),
        env('DATABASE_URL', 'Base de données de l’API', true),
        env('PORT', 'Port de l’API'),
        env('JWT_ACCESS_SECRET', 'Secret des jetons d’accès', true),
        env('JWT_REFRESH_SECRET', 'Secret des jetons de rafraîchissement', true),
        env('ANTHROPIC_API_KEY', 'Clé Anthropic côté API', true)
      ],
      fonctionnalites: [
        ['Onboarding', 'onboarding'],
        ['Programme du jour, agenda', 'agenda'],
        ['Sport, nutrition, sommeil, hydratation, habitudes', 'suivi'],
        ['Gamification : XP, quêtes, défis, récompenses, compagnon', 'gamification'],
        ['Liste de courses', 'liste']
      ],
      alertes: ['VITE_ANTHROPIC_API_KEY : une variable VITE_ est intégrée au code envoyé au navigateur. La clé Anthropic est donc lisible par tout utilisateur. À déplacer côté API.']
    },
    {
      id: 'existante-podology', nom: 'PodoLogiciel', icone: 'mdi-foot-print',
      description: 'PWA pour podologues : bilans complets, patients, agenda, facturation, comptabilité.',
      stack: 'Vue 3 + Vite (PWA) · API NestJS + Prisma (podology-api)', chemin: 'apps/podology-web + apps/podology-api',
      env: [env('DATABASE_URL', 'Base de données de l’API', true), env('PORT', 'Port de l’API')],
      fonctionnalites: [
        ['Connexion, mot de passe oublié, double authentification', 'connexion'],
        ['Patients', 'patients'],
        ['Bilans podologiques avec schémas annotés et export PDF', 'bilan-podo'],
        ['Agenda', 'agenda'],
        ['Facturation, télétransmission, comptabilité, dépenses', 'facturation'],
        ['Journal d’accès aux dossiers', 'journal-acces'],
        ['Sauvegarde chiffrée', 'sauvegarde'],
        ['Onglets personnalisables', 'personnalisation']
      ],
      alertes: []
    },
    {
      id: 'existante-training', nom: 'Programme Hand (training)', icone: 'mdi-handball',
      description: 'Programme d’entraînement « Force. Explosivité. Endurance. » avec minuteur.',
      stack: 'HTML/JS (PWA) · API NestJS + Prisma', chemin: 'apps/training',
      env: [env('DATABASE_URL', 'Base de données de l’API', true), env('PORT', 'Port de l’API')],
      fonctionnalites: [
        ['Connexion', 'connexion'],
        ['Programme et séances', 'suivi'],
        ['Minuteur de repos', 'minuteur']
      ],
      alertes: []
    }
  ];

  /** Installe les fiches au premier démarrage (une seule fois). */
  AB.installerCatalogue = async function () {
    if (!(await AB.db.getMeta('catalogue_installe', false))) {
      for (const fiche of AB.catalogue) {
        await AB.db.put('apps', Object.assign({
          origine: 'existante', statut: 'en-dev', liens: { repo: '', prod: '' }, notes: '',
          journal: [{ date: AB.u.now(), texte: 'Fiche créée depuis apps.zip' }], modifie: AB.u.now()
        }, AB.u.clone(fiche)));
      }
      await AB.db.setMeta('catalogue_installe', true);
    }
    // v1.14 : une fiche encore sans base reçoit les tables relevées dans son code (ab-catalogue-bases.js), une seule fois
    if (!(await AB.db.getMeta('catalogue_bases', false))) {
      for (const [id, bases] of Object.entries(AB.catalogueBases || {})) {
        const app = await AB.db.get('apps', id);
        if (app && !(app.bases || []).length) {
          app.bases = AB.u.clone(bases);
          (app.journal = app.journal || []).push({ date: AB.u.now(), texte: 'Tables de la base reprises du code (apps.zip)' });
          await AB.db.put('apps', app);
        }
      }
      await AB.db.setMeta('catalogue_bases', true);
    }
  };
})();
