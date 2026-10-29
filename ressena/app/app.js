/* app/app.js — Ressena : plan progressif marche / course, guidage vocal, séance suivante adaptée au ressenti.
   Kit « App complète » : le noyau lit cette déclaration ; ne touche jamais aux fichiers de noyau/.

   nom, version      identité (le nom affiché peut être changé par APP_NOM ou le réglage partagé app_nom)
   variables         aucune variable propre en v1 (tout ce qui se règle sans redéployer est dans reglages)
   roles             aucun rôle métier : chaque coureur ne voit que ses données, l'admin gère les plans depuis l'Atelier
   offre             Gratuit (avec pub) puis Premium (records et statistiques, sans pub)
   tables            pour l'admin et l'Atelier : libellé, colonne d'affichage, colonnes masquées
   rgpd              données personnelles : profils et séances, supprimés avec la personne
   reglages          plan de départ, avertissement santé, conseils d'échauffement, langue de la voix
   routes(r, ctx)    API métier (KIT.md § 7), chaque requête limitée au compte connecté */
'use strict';

const RESSENTIS = ['trop_facile', 'bien', 'difficile', 'trop_dur'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AVERTISSEMENT_SANTE = 'La course à pied sollicite le cœur, les articulations et les tendons. Avant de commencer, demandez l’avis de votre médecin '
  + 'si vous avez une maladie cardiaque ou respiratoire, une douleur articulaire, un surpoids important, si vous êtes enceinte ou si vous n’avez pas fait de sport depuis longtemps. '
  + 'Pendant la séance, arrêtez-vous immédiatement en cas de douleur à la poitrine, d’essoufflement anormal, de vertige ou de douleur vive. '
  + 'Ressena propose un entraînement général : il ne remplace pas un avis médical.';
const CONSEILS_ECHAUFFEMENT = 'Marchez d’un pas vif pendant les 5 minutes d’échauffement.\n'
  + 'Courez lentement : vous devez pouvoir parler en courant.\n'
  + 'Buvez un peu d’eau avant et après la séance.\n'
  + 'Gardez un jour de repos entre deux séances.\n'
  + 'Une douleur qui dure : faites une pause et parlez-en à un professionnel de santé.';

const REGLAGES = [
  { cle: 'plan_depart', libelle: 'Plan donné à un nouveau compte (code du plan)', type: 'texte', defaut: '0-5km' },
  { cle: 'avertissement_sante', libelle: 'Avertissement santé, à accepter avant la première séance', type: 'texte', defaut: AVERTISSEMENT_SANTE },
  { cle: 'conseils_echauffement', libelle: 'Conseils affichés avant chaque séance (un par ligne)', type: 'texte', defaut: CONSEILS_ECHAUFFEMENT },
  { cle: 'voix_langue', libelle: 'Langue de la voix (ex. fr-FR)', type: 'texte', defaut: 'fr-FR' }
];

module.exports = {
  nom: 'Ressena',
  version: '1.0.0',

  variables: [],

  roles: [],

  offre: {
    paliers: [
      { id: 'gratuit', libelle: 'Gratuit', pub: true, limites: {},
        avantages: ['Plan de 0 à 5 km complet', 'Guidage vocal et chronomètre', 'Séance suivante adaptée au ressenti', 'Historique des sorties'] },
      { id: 'premium', libelle: 'Premium', pub: false, prix: { mois: 3.99, an: 29.99 }, essaiJours: 7, limites: {},
        avantages: ['Records et statistiques', 'Plans 5-10 km et suivi GPS dès leur sortie', 'Sans publicité'] }
    ]
  },

  tables: {
    plans: { libelle: 'Plans', affichage: 'nom' },
    profils: { libelle: 'Profils des coureurs', affichage: 'utilisateur_id' },
    seances: { libelle: 'Séances', affichage: 'debut_le', colonnesMasquees: ['trace'] }
  },

  rgpd: [
    { table: 'profils', colonne: 'utilisateur_id', action: 'supprimer', colonnes: [], conservation: 'tant que le compte existe' },
    { table: 'seances', colonne: 'utilisateur_id', action: 'supprimer', colonnes: [], conservation: 'tant que le compte existe ; compte inactif pendant 3 ans : suppression' }
  ],

  reglages: REGLAGES,

  routes(r, { base, journal, erreur }) {
    const entier = (v, min, max, nom) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) throw erreur(400, `${nom} : nombre entier entre ${min} et ${max} attendu.`);
      return n;
    };
    const reglage = async cle => {
      const ligne = await base.une('select valeur from reglages where cle = $1', [cle]);
      const v = ligne && ligne.valeur;
      return v === null || v === undefined || v === '' ? REGLAGES.find(x => x.cle === cle).defaut : v;
    };

    /** Profil du compte, créé au premier appel avec le plan de départ. */
    async function profilDe(utilisateurId) {
      const p = await base.une('select * from profils where utilisateur_id = $1', [utilisateurId]);
      if (p) return p;
      const code = String(await reglage('plan_depart'));
      const plan = await base.une('select id from plans where actif and code = $1', [code])
        || await base.une('select id from plans where actif order by ordre, nom limit 1');
      if (!plan) throw erreur(503, 'Aucun plan d’entraînement n’est disponible pour le moment.');
      await base.requete('insert into profils (utilisateur_id, plan_id) values ($1, $2) on conflict (utilisateur_id) do nothing', [utilisateurId, plan.id]);
      return base.une('select * from profils where utilisateur_id = $1', [utilisateurId]);
    }

    const semaineDe = (plan, n) => (plan.semaines || []).find(s => s.semaine === n);
    const seanceDe = (plan, semaine, numero) => { const s = semaineDe(plan, semaine); return s && (s.seances || []).find(x => x.numero === numero); };
    const termine = (plan, profil) => { const s = semaineDe(plan, profil.semaine); return !s || profil.seance > s.seances.length; };

    /** Position après une séance réussie : séance suivante, semaine suivante, ou plan terminé (dernière semaine, séance n+1). */
    function apres(plan, profil) {
      const s = semaineDe(plan, profil.semaine);
      if (!s) return { semaine: profil.semaine, seance: profil.seance };
      if (profil.seance < s.seances.length) return { semaine: profil.semaine, seance: profil.seance + 1 };
      if (semaineDe(plan, profil.semaine + 1)) return { semaine: profil.semaine + 1, seance: 1 };
      return { semaine: profil.semaine, seance: s.seances.length + 1 };
    }

    async function etat(utilisateurId) {
      const profil = await profilDe(utilisateurId);
      const plan = await base.une('select id, code, nom, description, semaines from plans where id = $1', [profil.plan_id]);
      const faites = await base.lignes(`select distinct numero from seances where utilisateur_id = $1 and plan_id = $2 and semaine = $3
        and terminee and archive_le is null and coalesce(ressenti, '') <> 'trop_dur'`, [utilisateurId, plan.id, profil.semaine]);
      const aNoter = await base.une(`select id, debut_le, duree_s from seances where utilisateur_id = $1 and ressenti is null and terminee and archive_le is null
        and debut_le > now() - interval '2 days' order by debut_le desc limit 1`, [utilisateurId]);
      const [avertissement, conseils, voixLangue] = await Promise.all(['avertissement_sante', 'conseils_echauffement', 'voix_langue'].map(reglage));
      const fini = termine(plan, profil);
      return {
        profil: { semaine: profil.semaine, seance: profil.seance, voix: profil.voix, sante_acceptee_le: profil.sante_acceptee_le },
        plan, termine: fini, faites: faites.map(x => x.numero), a_noter: aNoter || null,
        prochaine: fini ? null : Object.assign({ semaine: profil.semaine }, seanceDe(plan, profil.semaine, profil.seance)),
        avertissement_sante: String(avertissement), conseils: String(conseils).split('\n').map(x => x.trim()).filter(Boolean), voix_langue: String(voixLangue)
      };
    }

    r.get('/api/plan', async (req, ctx) => etat(ctx.utilisateur.id));

    r.put('/api/profil', async (req, ctx) => {
      const p = await profilDe(ctx.utilisateur.id);
      const c = ctx.corps || {};
      if (c.voix !== undefined && typeof c.voix !== 'boolean') throw erreur(400, 'Voix : oui ou non attendu.');
      if (c.sante_acceptee !== undefined && c.sante_acceptee !== true) throw erreur(400, 'L’avertissement santé ne peut qu’être accepté.');
      await base.requete(`update profils set voix = coalesce($2, voix),
        sante_acceptee_le = case when $3 then coalesce(sante_acceptee_le, now()) else sante_acceptee_le end where id = $1`,
        [p.id, c.voix === undefined ? null : c.voix, c.sante_acceptee === true]);
      return etat(ctx.utilisateur.id);
    });

    r.post('/api/plan/recommencer', async (req, ctx) => {
      const p = await profilDe(ctx.utilisateur.id);
      await base.requete('update profils set semaine = 1, seance = 1 where id = $1', [p.id]);
      await journal(ctx, 'plan_recommence', 'profils:' + p.id, { semaine: p.semaine, seance: p.seance });
      return etat(ctx.utilisateur.id);
    });

    r.post('/api/seances', { limite: 2e6 }, async (req, ctx) => {
      const c = ctx.corps || {};
      const profil = await profilDe(ctx.utilisateur.id);
      const id = c.id == null || c.id === '' ? null : String(c.id);
      if (id && !UUID.test(id)) throw erreur(400, 'Identifiant de séance invalide.');
      const debut = c.debut_le ? new Date(c.debut_le) : new Date();
      if (isNaN(debut) || debut > new Date(Date.now() + 5 * 60e3) || debut < new Date(Date.now() - 30 * 864e5)) throw erreur(400, 'Date de début invalide.');
      const duree = entier(c.duree_s, 0, 21600, 'Durée');
      let semaine = null, numero = null, planId = null;
      if (c.semaine != null || c.numero != null) {
        semaine = entier(c.semaine, 1, 52, 'Semaine'); numero = entier(c.numero, 1, 7, 'Séance');
        const plan = await base.une('select id, semaines from plans where id = $1', [profil.plan_id]);
        if (!seanceDe(plan, semaine, numero)) throw erreur(400, 'Cette séance n’existe pas dans votre plan.');
        planId = plan.id;
      }
      const distance = c.distance_m == null || c.distance_m === '' ? null : entier(c.distance_m, 0, 200000, 'Distance');
      let trace = null;
      if (c.trace != null) {
        if (!Array.isArray(c.trace) || c.trace.length > 5000 || !c.trace.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite))) throw erreur(400, 'Parcours invalide.');
        trace = JSON.stringify(c.trace);
      }
      const seance = await base.une(`insert into seances (id, utilisateur_id, plan_id, semaine, numero, debut_le, duree_s, terminee, distance_m, trace)
        values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb) on conflict (id) do nothing returning *`,
        [id, ctx.utilisateur.id, planId, semaine, numero, debut.toISOString(), duree, c.terminee === true, distance, trace]);
      if (seance) return { seance };
      const deja = await base.une('select * from seances where id = $1 and utilisateur_id = $2', [id, ctx.utilisateur.id]);
      if (!deja) throw erreur(409, 'Cet identifiant de séance est déjà utilisé.');
      return { seance: deja };
    });

    r.patch('/api/seances/:id/ressenti', async (req, ctx) => {
      if (!UUID.test(ctx.params.id)) throw erreur(404, 'Séance introuvable.');
      const ressenti = String((ctx.corps || {}).ressenti || '');
      if (!RESSENTIS.includes(ressenti)) throw erreur(400, 'Choisissez votre ressenti.');
      const note = String((ctx.corps || {}).note || '').trim();
      if (note.length > 500) throw erreur(400, 'Note : 500 caractères maximum.');
      const conseil = await base.transaction(async client => {
        const s = (await client.query('select * from seances where id = $1 and utilisateur_id = $2 and archive_le is null for update', [ctx.params.id, ctx.utilisateur.id])).rows[0];
        if (!s) throw erreur(404, 'Séance introuvable.');
        if (s.ressenti) throw erreur(400, 'Le ressenti de cette séance est déjà enregistré.');
        await client.query('update seances set ressenti = $2, note = $3 where id = $1', [s.id, ressenti, note]);
        const p = (await client.query('select * from profils where utilisateur_id = $1 for update', [ctx.utilisateur.id])).rows[0];
        const enCours = p && s.plan_id === p.plan_id && s.semaine === p.semaine && s.numero === p.seance;
        if (!enCours) return 'Ressenti enregistré.';
        if (!s.terminee || ressenti === 'trop_dur') return 'Pas de souci : on refait cette séance la prochaine fois, à votre rythme.';
        const plan = (await client.query('select semaines from plans where id = $1', [p.plan_id])).rows[0];
        const suite = apres(plan, p);
        await client.query('update profils set semaine = $2, seance = $3 where id = $1', [p.id, suite.semaine, suite.seance]);
        if (ressenti === 'difficile') return 'Bravo ! Séance suivante au programme : courez plus lentement si besoin et gardez un jour de repos.';
        return 'Bravo ! Séance suivante au programme.';
      });
      return Object.assign({ conseil }, await etat(ctx.utilisateur.id));
    });

    r.get('/api/seances', async (req, ctx) => {
      const avant = ctx.query.avant ? new Date(String(ctx.query.avant)) : null;
      if (avant && isNaN(avant)) throw erreur(400, 'Date invalide.');
      const seances = await base.lignes(`select s.id, s.debut_le, s.duree_s, s.terminee, s.distance_m, s.ressenti, s.semaine, s.numero, p.nom as plan
        from seances s left join plans p on p.id = s.plan_id
        where s.utilisateur_id = $1 and s.archive_le is null and ($2::timestamptz is null or s.debut_le < $2)
        order by s.debut_le desc limit 21`, [ctx.utilisateur.id, avant ? avant.toISOString() : null]);
      return { seances: seances.slice(0, 20), suite: seances.length > 20 };
    });

    r.get('/api/seances/:id', async (req, ctx) => {
      if (!UUID.test(ctx.params.id)) throw erreur(404, 'Séance introuvable.');
      const s = await base.une(`select s.id, s.debut_le, s.duree_s, s.terminee, s.distance_m, s.ressenti, s.note, s.semaine, s.numero, s.trace,
          p.nom as plan, p.semaines from seances s left join plans p on p.id = s.plan_id
        where s.id = $1 and s.utilisateur_id = $2 and s.archive_le is null`, [ctx.params.id, ctx.utilisateur.id]);
      if (!s) throw erreur(404, 'Séance introuvable.');
      const contenu = s.semaines ? seanceDe({ semaines: s.semaines }, s.semaine, s.numero) : null;
      delete s.semaines;
      return { seance: Object.assign(s, { contenu: contenu || null }) };
    });

    r.delete('/api/seances/:id', async (req, ctx) => {
      if (!UUID.test(ctx.params.id)) throw erreur(404, 'Séance introuvable.');
      const s = await base.une('update seances set archive_le = now() where id = $1 and utilisateur_id = $2 and archive_le is null returning id', [ctx.params.id, ctx.utilisateur.id]);
      if (!s) throw erreur(404, 'Séance introuvable.');
      await journal(ctx, 'seance_retiree', 'seances:' + s.id);
      return { ok: true };
    });

    r.get('/api/records', { palier: 'premium' }, async (req, ctx) => {
      const totaux = await base.une(`select count(*)::int as seances, count(*) filter (where terminee)::int as terminees,
          coalesce(sum(duree_s), 0)::int as duree_totale_s, max(duree_s) as plus_longue_seance_s,
          count(*) filter (where debut_le > now() - interval '28 days')::int as seances_4_semaines
        from seances where utilisateur_id = $1 and archive_le is null`, [ctx.utilisateur.id]);
      const semaines = (await base.lignes(`select distinct to_char(date_trunc('week', debut_le at time zone 'Europe/Paris'), 'YYYY-MM-DD') as lundi
        from seances where utilisateur_id = $1 and archive_le is null order by 1 desc`, [ctx.utilisateur.id])).map(x => x.lundi);
      // Série : semaines consécutives avec au moins une sortie, depuis la semaine en cours (ou la précédente si rien cette semaine).
      const jour = d => d.toISOString().slice(0, 10);
      const attendue = new Date(jour(new Date()) + 'T00:00:00Z');
      attendue.setUTCDate(attendue.getUTCDate() - ((attendue.getUTCDay() + 6) % 7));
      if (semaines[0] !== jour(attendue)) attendue.setUTCDate(attendue.getUTCDate() - 7);
      let serie = 0;
      for (const lundi of semaines) { if (lundi !== jour(attendue)) break; serie++; attendue.setUTCDate(attendue.getUTCDate() - 7); }
      const faites = await base.lignes(`select distinct s.semaine, s.numero, s.plan_id from seances s
        where s.utilisateur_id = $1 and s.archive_le is null and s.terminee and s.plan_id is not null`, [ctx.utilisateur.id]);
      const plans = Object.fromEntries((await base.lignes('select id, semaines from plans where id = any($1::uuid[])', [[...new Set(faites.map(f => f.plan_id))]])).map(p => [p.id, p]));
      const course = faites.reduce((max, f) => {
        const x = plans[f.plan_id] && seanceDe(plans[f.plan_id], f.semaine, f.numero);
        return Math.max(max, ...((x && x.blocs) || []).filter(b => b.type === 'course').map(b => b.duree_s));
      }, 0);
      return { records: Object.assign(totaux, { plus_longue_course_s: course, serie_semaines: serie }) };
    });
  }
};
