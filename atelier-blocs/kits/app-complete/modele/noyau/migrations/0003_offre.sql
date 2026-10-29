-- noyau/migrations/0003_offre.sql — offre commune (paliers Gratuit / Premium…, abonnements). NE PAS MODIFIER.
-- Le palier d'un compte se calcule : admin et vip = palier le plus haut, sinon le meilleur abonnement en cours, sinon « gratuit ».
create table if not exists abonnements (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  palier text not null check (palier ~ '^[a-z][a-z0-9_]*$'),
  source text not null default 'manuel' check (source in ('manuel', 'stripe', 'apple', 'google')),
  statut text not null default 'actif' check (statut in ('actif', 'annule', 'expire')),
  periode text check (periode in ('mois', 'an')),
  debut_le timestamptz not null default now(),
  fin_le timestamptz,
  id_externe text,
  client_externe text,
  note text not null default '',
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists abonnements_utilisateur_id_idx on abonnements (utilisateur_id, statut);
create unique index if not exists abonnements_externe_uidx on abonnements (source, id_externe) where id_externe is not null;
comment on table abonnements is 'Abonnements payants ou offerts (socle, offre commune) : le meilleur abonnement en cours donne le palier du compte';
comment on column abonnements.palier is 'Identifiant du palier déclaré dans app/app.js → offre (ex. premium)';
comment on column abonnements.source is 'manuel (offert depuis l''Atelier), stripe (web), apple ou google (app mobile, via RevenueCat)';
comment on column abonnements.statut is 'actif ; annule = résilié mais valable jusqu''à fin_le ; expire';
comment on column abonnements.periode is 'mois ou an (vide pour un abonnement offert)';
comment on column abonnements.fin_le is 'Fin de la période payée ; vide = sans fin (abonnement offert)';
comment on column abonnements.id_externe is 'Identifiant chez le fournisseur (abonnement Stripe, transaction d''origine du store)';
comment on column abonnements.client_externe is 'Client chez le fournisseur (client Stripe) : sert au portail de résiliation';
comment on column abonnements.note is 'Note libre (raison d''un abonnement offert)';
drop trigger if exists abonnements_modifie_le on abonnements;
create trigger abonnements_modifie_le before update on abonnements for each row execute function maj_modifie_le();
