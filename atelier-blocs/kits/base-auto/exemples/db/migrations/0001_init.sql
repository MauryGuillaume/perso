-- 0001_init.sql — exemple du kit « Base de données automatique » (à remplacer par le modèle de l'app)
-- Rejouable : chaque instruction vérifie ce qui existe déjà. Pas de BEGIN/COMMIT : migrer.js s'en charge.
create extension if not exists pgcrypto;

-- Mise à jour automatique de modifie_le
create or replace function maj_modifie_le() returns trigger language plpgsql as $$
begin new.modifie_le = now(); return new; end $$;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text unique,
  telephone text,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table clients is 'Clients du cabinet';
comment on column clients.email is 'Adresse email, unique, sert à la connexion';

create table if not exists rendez_vous (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  debut timestamptz not null,
  duree_min integer not null default 30 check (duree_min > 0),
  statut text not null default 'prevu' check (statut in ('prevu', 'fait', 'annule')),
  montant numeric(12,2),
  note text,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table rendez_vous is 'Rendez-vous des clients';
comment on column rendez_vous.debut is 'Date et heure de début';
comment on column rendez_vous.duree_min is 'Durée en minutes';
comment on column rendez_vous.statut is 'prevu, fait ou annule';
comment on column rendez_vous.montant is 'Montant TTC en euros';
comment on column rendez_vous.note is 'Note libre du praticien';
create index if not exists rendez_vous_client_id_idx on rendez_vous (client_id);
create index if not exists rendez_vous_debut_idx on rendez_vous (debut);

drop trigger if exists clients_modifie_le on clients;
create trigger clients_modifie_le before update on clients for each row execute function maj_modifie_le();
drop trigger if exists rendez_vous_modifie_le on rendez_vous;
create trigger rendez_vous_modifie_le before update on rendez_vous for each row execute function maj_modifie_le();
