-- 0001_init.sql — exemple du kit « Bases de données » : un salon de coiffure.
-- Montre : relation 1-n (clients → rendez_vous), n-n avec table de liaison (rendez_vous ↔ prestations),
-- valeurs fermées (check), montants en numeric(12,2), archivage au lieu de suppression, commentaires.
create extension if not exists pgcrypto;

create or replace function maj_modifie_le() returns trigger language plpgsql as $$
begin new.modifie_le = now(); return new; end $$;

create table if not exists employes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur_agenda text not null default 'bleu' check (couleur_agenda in ('bleu', 'vert', 'orange', 'violet')),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table employes is 'Personnes qui réalisent les prestations';
comment on column employes.couleur_agenda is 'Couleur de la colonne dans l''agenda';

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  email text unique,
  consentement_sms boolean not null default false,
  archive_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table clients is 'Clients du salon';
comment on column clients.consentement_sms is 'Accord du client pour les rappels par SMS (RGPD)';
comment on column clients.archive_le is 'Date d''archivage ; null = client actif';

create table if not exists prestations (
  id uuid primary key default gen_random_uuid(),
  libelle text not null unique,
  duree_min integer not null check (duree_min > 0),
  prix numeric(12,2) not null check (prix >= 0),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table prestations is 'Catalogue des prestations (coupe, couleur…)';
comment on column prestations.libelle is 'Nom affiché au client et sur la facture';
comment on column prestations.duree_min is 'Durée prévue en minutes';
comment on column prestations.prix is 'Prix TTC en euros';

create table if not exists rendez_vous (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  employe_id uuid references employes(id) on delete set null,
  debut timestamptz not null,
  fin timestamptz not null,
  statut text not null default 'prevu' check (statut in ('prevu', 'fait', 'annule', 'absent')),
  total numeric(12,2) not null default 0,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  check (fin > debut)
);
comment on table rendez_vous is 'Rendez-vous pris par les clients';
comment on column rendez_vous.debut is 'Début du rendez-vous';
comment on column rendez_vous.fin is 'Fin calculée à partir des durées des prestations';
comment on column rendez_vous.statut is 'prevu, fait, annule ou absent';
comment on column rendez_vous.total is 'Total TTC recalculé côté serveur à partir des prestations';
create index if not exists rendez_vous_client_id_idx on rendez_vous (client_id);
create index if not exists rendez_vous_employe_id_idx on rendez_vous (employe_id);
create index if not exists rendez_vous_debut_idx on rendez_vous (debut);

-- Relation n-n : un rendez-vous a plusieurs prestations, une prestation sert dans plusieurs rendez-vous.
create table if not exists rendez_vous_prestations (
  rendez_vous_id uuid not null references rendez_vous(id) on delete cascade,
  prestation_id uuid not null references prestations(id) on delete restrict,
  prix numeric(12,2) not null,
  cree_le timestamptz not null default now(),
  primary key (rendez_vous_id, prestation_id)
);
comment on table rendez_vous_prestations is 'Prestations de chaque rendez-vous (table de liaison)';
comment on column rendez_vous_prestations.prix is 'Prix TTC au moment du rendez-vous (le catalogue peut changer)';
create index if not exists rendez_vous_prestations_prestation_id_idx on rendez_vous_prestations (prestation_id);

drop trigger if exists employes_modifie_le on employes;
create trigger employes_modifie_le before update on employes for each row execute function maj_modifie_le();
drop trigger if exists clients_modifie_le on clients;
create trigger clients_modifie_le before update on clients for each row execute function maj_modifie_le();
drop trigger if exists prestations_modifie_le on prestations;
create trigger prestations_modifie_le before update on prestations for each row execute function maj_modifie_le();
drop trigger if exists rendez_vous_modifie_le on rendez_vous;
create trigger rendez_vous_modifie_le before update on rendez_vous for each row execute function maj_modifie_le();

insert into prestations (libelle, duree_min, prix) values
  ('Coupe', 30, 28.00), ('Couleur', 60, 55.00), ('Brushing', 20, 18.00)
on conflict (libelle) do nothing;
