-- 0001_init.sql — tables de l'app d'exemple « Suivi clients » (à remplacer par le modèle validé de l'app).
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.
-- maj_modifie_le() est fournie par le socle (noyau/migrations/0001_socle.sql).

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 1 and 120),
  email text check (email = lower(email)),
  telephone text,
  statut text not null default 'prospect' check (statut in ('prospect', 'client', 'ancien')),
  archive_le timestamptz,
  cree_par uuid references utilisateurs(id) on delete set null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists clients_cree_par_idx on clients (cree_par);
create index if not exists clients_nom_idx on clients (lower(nom));
create unique index if not exists clients_email_uidx on clients (email) where email is not null;
comment on table clients is 'Clients et prospects suivis';
comment on column clients.statut is 'prospect, client ou ancien';
comment on column clients.archive_le is 'Date d''archivage ; null = actif (on n''efface pas un client)';
comment on column clients.cree_par is 'Compte qui a créé la fiche';
drop trigger if exists clients_modifie_le on clients;
create trigger clients_modifie_le before update on clients for each row execute function maj_modifie_le();

create table if not exists interventions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  titre text not null check (length(titre) between 1 and 160),
  date_le timestamptz not null default now(),
  duree_min integer not null default 30 check (duree_min >= 0),
  montant numeric(12,2) check (montant >= 0),
  fait boolean not null default false,
  cree_par uuid references utilisateurs(id) on delete set null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists interventions_client_id_date_idx on interventions (client_id, date_le desc);
create index if not exists interventions_cree_par_idx on interventions (cree_par);
comment on table interventions is 'Rendez-vous, appels et travaux réalisés pour un client';
comment on column interventions.date_le is 'Date et heure de l''intervention';
comment on column interventions.duree_min is 'Durée en minutes';
comment on column interventions.montant is 'Montant TTC en euros (facultatif)';
comment on column interventions.fait is 'Intervention réalisée';
comment on column interventions.cree_par is 'Compte qui a saisi l''intervention';
drop trigger if exists interventions_modifie_le on interventions;
create trigger interventions_modifie_le before update on interventions for each row execute function maj_modifie_le();
