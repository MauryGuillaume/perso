-- noyau/migrations/0001_socle.sql — tables du kit « App complète ». NE PAS MODIFIER (ajouter une migration dans db/migrations).
create extension if not exists pgcrypto;

-- Mise à jour automatique de modifie_le : à brancher sur chaque table modifiable de l'app (voir KIT.md § 9).
create or replace function maj_modifie_le() returns trigger language plpgsql as $$
begin new.modifie_le = now(); return new; end $$;

create table if not exists utilisateurs (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and (email like '%_@_%' or email = 'admin')),
  nom text not null default '',
  role text not null default 'utilisateur' check (role ~ '^[a-z][a-z0-9_]*$'),
  mdp_hash text not null,
  mdp_a_changer boolean not null default false,
  actif boolean not null default true,
  derniere_connexion_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists utilisateurs_email_uidx on utilisateurs (email);
create index if not exists utilisateurs_role_idx on utilisateurs (role);
comment on table utilisateurs is 'Comptes de l''app (socle)';
comment on column utilisateurs.email is 'Adresse email en minuscules (ou « admin » pour le compte par défaut), sert à la connexion';
comment on column utilisateurs.role is 'admin, utilisateur ou un rôle déclaré dans app/app.js';
comment on column utilisateurs.mdp_hash is 'Empreinte scrypt du mot de passe (jamais le mot de passe)';
comment on column utilisateurs.mdp_a_changer is 'Mot de passe provisoire : à changer à la prochaine connexion';
comment on column utilisateurs.actif is 'Compte désactivé = connexion refusée, données gardées';
comment on column utilisateurs.derniere_connexion_le is 'Date de la dernière connexion réussie';
drop trigger if exists utilisateurs_modifie_le on utilisateurs;
create trigger utilisateurs_modifie_le before update on utilisateurs for each row execute function maj_modifie_le();

create table if not exists sessions (
  id text primary key,
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  expire_le timestamptz not null,
  ip text,
  agent text,
  cree_le timestamptz not null default now()
);
create index if not exists sessions_utilisateur_id_idx on sessions (utilisateur_id);
create index if not exists sessions_expire_le_idx on sessions (expire_le);
comment on table sessions is 'Sessions ouvertes (socle)';
comment on column sessions.id is 'Empreinte SHA-256 du jeton de session (le jeton lui-même n''est jamais stocké)';
comment on column sessions.expire_le is 'Fin de validité, prolongée à chaque activité';
comment on column sessions.ip is 'Adresse IP à l''ouverture';
comment on column sessions.agent is 'Navigateur à l''ouverture';

create table if not exists journal (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid references utilisateurs(id) on delete set null,
  acteur text not null default '',
  action text not null,
  cible text not null default '',
  detail jsonb not null default '{}'::jsonb,
  ip text,
  cree_le timestamptz not null default now()
);
create index if not exists journal_cree_le_idx on journal (cree_le desc);
create index if not exists journal_utilisateur_id_idx on journal (utilisateur_id);
create index if not exists journal_action_idx on journal (action);
comment on table journal is 'Journal des actions sensibles : connexions, comptes, modifications de données par l''admin, RGPD (socle)';
comment on column journal.acteur is 'Email de l''auteur, « atelier » ou « système » (gardé si le compte est supprimé)';
comment on column journal.action is 'Ex. connexion, connexion_refusee, donnees_modifiees, rgpd_export';
comment on column journal.cible is 'Table et identifiant, ou email concerné';
comment on column journal.detail is 'Détails sans mot de passe ni donnée bancaire';
comment on column journal.ip is 'Adresse IP de la requête';

create table if not exists reglages (
  cle text primary key check (cle ~ '^[a-z][a-z0-9_]*$'),
  valeur jsonb not null default 'null'::jsonb,
  modifie_par uuid references utilisateurs(id) on delete set null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists reglages_modifie_par_idx on reglages (modifie_par);
comment on table reglages is 'Paramètres partagés de l''app, modifiables par l''admin (socle)';
comment on column reglages.cle is 'Nom du paramètre (ex. app_nom, societe_nom)';
comment on column reglages.valeur is 'Valeur JSON';
comment on column reglages.modifie_par is 'Dernier admin qui l''a modifié';
drop trigger if exists reglages_modifie_le on reglages;
create trigger reglages_modifie_le before update on reglages for each row execute function maj_modifie_le();
