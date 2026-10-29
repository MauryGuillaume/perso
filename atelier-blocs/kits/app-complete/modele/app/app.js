/* app/app.js — TOUT ce qui est propre à l'app (exemple « Suivi clients » à remplacer).
   Kit « App complète » : le noyau lit cette déclaration ; ne touche jamais aux fichiers de noyau/.

   nom, version      identité (le nom affiché peut être changé par APP_NOM ou le réglage partagé app_nom)
   variables         variables d'environnement propres à l'app (même format que noyau/env.js, KIT.md § 5.2)
   roles             rôles MÉTIER de l'app, en plus de ceux du socle (admin, vip, utilisateur) : id, libellé, ce qu'il peut faire
   offre             paliers de l'offre commune (KIT.md § 17) : gratuit (avec pub, limites) puis premium (et pro), prix TTC
   tables            pour l'admin et l'Atelier : libellé, colonne d'affichage, colonnes masquées, lecture seule
   rgpd              données personnelles : où les trouver pour un export ou une suppression (KIT.md § 11)
   reglages          paramètres partagés modifiables par l'admin (Atelier › Réglages)
   routes(r, ctx)    API métier (KIT.md § 7) ; { palier: 'premium' } réserve une route, offre.limite() applique une limite */
'use strict';

module.exports = {
  nom: 'Suivi clients',
  version: '1.0.0',

  variables: [
    { cle: 'RELANCE_JOURS', type: 'entier', defaut: '30', role: 'Nombre de jours sans contact avant de proposer une relance' }
  ],

  roles: [
    { id: 'commercial', libelle: 'Commercial', description: 'Crée et suit ses clients et leurs interventions ; ne gère ni les comptes ni les réglages' }
  ],

  offre: {
    paliers: [
      { id: 'gratuit', libelle: 'Gratuit', pub: true, limites: { clients: 20 }, avantages: ['Suivi des clients et des interventions'] },
      { id: 'premium', libelle: 'Premium', pub: false, prix: { mois: 4.99, an: 39.99 }, limites: {},
        avantages: ['Clients illimités', 'Liste des relances à faire', 'Sans publicité'] }
    ]
  },

  tables: {
    clients: { libelle: 'Clients', affichage: 'nom' },
    interventions: { libelle: 'Interventions', affichage: 'titre' }
  },

  rgpd: [
    { table: 'clients', colonne: 'email', action: 'anonymiser', colonnes: ['nom', 'email', 'telephone'], conservation: '3 ans après le dernier contact' },
    { table: 'interventions', colonne: 'cree_par', action: 'anonymiser', colonnes: ['cree_par'], conservation: 'durée du contrat' }
  ],

  reglages: [
    { cle: 'societe_nom', libelle: 'Nom de la société', type: 'texte', defaut: '' }
  ],

  routes(r, { base, journal, env, erreur, offre }) {
    const texte = (v, max, nom) => { const s = String(v == null ? '' : v).trim(); if (!s) throw erreur(400, `${nom} est obligatoire.`); if (s.length > max) throw erreur(400, `${nom} : ${max} caractères maximum.`); return s; };

    r.get('/api/clients', async (req, ctx) => {
      const q = String(ctx.query.q || '').trim();
      return { clients: await base.lignes(`select c.id, c.nom, c.email, c.telephone, c.statut, c.cree_le,
          (select max(i.date_le) from interventions i where i.client_id = c.id) as dernier_contact
        from clients c where ($1 = '' or c.nom ilike '%' || $1 || '%') and c.archive_le is null order by c.nom limit 200`, [q]) };
    });

    r.post('/api/clients', async (req, ctx) => {
      const nom = texte(ctx.corps.nom, 120, 'Le nom');
      await offre.limite(ctx, 'clients', (await base.une('select count(*)::int as n from clients where cree_par = $1 and archive_le is null', [ctx.utilisateur.id])).n);
      const email = ctx.corps.email ? String(ctx.corps.email).trim().toLowerCase() : null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw erreur(400, 'Adresse email invalide.');
      const client = await base.une('insert into clients (nom, email, telephone, cree_par) values ($1, $2, $3, $4) returning *',
        [nom, email, String(ctx.corps.telephone || '').trim().slice(0, 30) || null, ctx.utilisateur.id]);
      await journal(ctx, 'client_cree', client.id);
      return { client };
    });

    r.get('/api/clients/:id/interventions', async (req, ctx) => ({
      interventions: await base.lignes('select id, titre, date_le, duree_min, montant, fait from interventions where client_id = $1 order by date_le desc', [ctx.params.id])
    }));

    r.post('/api/clients/:id/interventions', async (req, ctx) => {
      const titre = texte(ctx.corps.titre, 160, 'Le titre');
      const montant = ctx.corps.montant === '' || ctx.corps.montant == null ? null : Number(ctx.corps.montant);
      if (montant !== null && !(montant >= 0 && montant < 1e9)) throw erreur(400, 'Montant invalide.');
      const intervention = await base.une(`insert into interventions (client_id, titre, date_le, duree_min, montant, cree_par)
        values ($1, $2, coalesce($3::timestamptz, now()), $4, $5, $6) returning *`,
        [ctx.params.id, titre, ctx.corps.date_le || null, Math.max(0, parseInt(ctx.corps.duree_min, 10) || 30), montant, ctx.utilisateur.id]);
      return { intervention };
    });

    r.get('/api/relances', { palier: 'premium' }, async () => ({
      clients: await base.lignes(`select c.id, c.nom, max(i.date_le) as dernier_contact from clients c left join interventions i on i.client_id = c.id
        where c.archive_le is null group by c.id having coalesce(max(i.date_le), c.cree_le) < now() - make_interval(days => $1) order by 3 nulls first limit 100`, [env.get('RELANCE_JOURS')])
    }));
  }
};
