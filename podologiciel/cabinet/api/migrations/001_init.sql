-- PodoLogiciel : schéma initial (cabinet de groupe)
-- Les données de santé sont chiffrées par l'API (AES-256-GCM) avant d'arriver ici :
-- les colonnes « identite », « medical » et « donnees » ne contiennent que du texte chiffré.
-- En clair, seulement ce qu'il faut pour trier et filtrer (dates, statuts, montants, liens).

create table utilisateurs (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  nom text not null,
  role text not null check (role in ('admin', 'praticien', 'secretariat')),
  code text not null default '',                 -- initiales du praticien, dans le numéro de ses factures
  mdp text not null,                             -- empreinte scrypt
  doit_changer boolean not null default true,    -- mot de passe provisoire
  totp text,                                     -- secret de double authentification (chiffré)
  totp_actif boolean not null default false,
  totp_pas bigint not null default 0,            -- dernier code accepté (un code ne sert qu'une fois)
  profil jsonb not null default '{}',            -- cabinet, adresse, RPPS, SIRET, mention TVA (pour les factures)
  actif boolean not null default true,
  echecs int not null default 0,
  bloque_jusqua timestamptz,
  cree_le timestamptz not null default now()
);
create unique index utilisateurs_code on utilisateurs (code) where code <> '';

create table sessions (
  jeton text primary key,                        -- empreinte SHA-256 du jeton (le jeton lui-même n'est que dans le cookie)
  utilisateur_id uuid not null references utilisateurs (id) on delete cascade,
  totp_ok boolean not null default false,
  cree_le timestamptz not null default now(),
  vu_le timestamptz not null default now(),
  ip text not null default ''
);
create index sessions_utilisateur on sessions (utilisateur_id);

create table patients (
  id uuid primary key,
  praticien_id uuid not null references utilisateurs (id),   -- praticien référent
  partage uuid[] not null default '{}',                      -- praticiens qui ont aussi accès au dossier médical
  archive boolean not null default false,
  cree_par uuid references utilisateurs (id),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz,
  identite text not null,                        -- chiffré : nom, prénom, naissance, contact, consentement
  medical text not null                          -- chiffré : antécédents, traitements, allergies, notes
);

create table bilans (
  id uuid primary key,
  patient_id uuid not null references patients (id) on delete cascade,
  auteur_id uuid not null references utilisateurs (id),
  date date not null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz,
  donnees text not null                          -- chiffré : tout le bilan
);
create index bilans_patient on bilans (patient_id);

create table rdv (
  id uuid primary key,
  praticien_id uuid not null references utilisateurs (id),
  patient_id uuid not null references patients (id) on delete cascade,
  date date not null,
  heure text not null check (heure ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  duree int not null check (duree between 5 and 600),
  statut text not null default 'prévu' check (statut in ('prévu', 'honoré', 'absent', 'annulé')),
  cree_par uuid references utilisateurs (id),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz,
  donnees text not null                          -- chiffré : motif
);
create index rdv_date on rdv (date);

create table compteurs (
  praticien_id uuid not null references utilisateurs (id),
  annee int not null,
  valeur int not null,
  primary key (praticien_id, annee)
);

create table factures (
  id uuid primary key,
  praticien_id uuid not null references utilisateurs (id),
  patient_id uuid references patients (id) on delete set null,   -- la facture reste si le dossier est supprimé
  numero text not null unique,
  date date not null,
  total numeric(10, 2) not null check (total >= 0),
  statut text not null check (statut in ('payée', 'en attente')),
  mode text not null,
  paye_le timestamptz,
  cree_par uuid references utilisateurs (id),
  cree_le timestamptz not null default now(),
  donnees text not null                          -- chiffré : actes, nom et adresse du patient au jour de la facture
);

-- Une facture émise ne se modifie pas et ne se supprime pas : seul son paiement change.
create function factures_immuables() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Une facture émise ne se supprime pas';
  end if;
  if new.id <> old.id or new.praticien_id <> old.praticien_id or new.numero <> old.numero or new.date <> old.date
     or new.total <> old.total or new.donnees <> old.donnees or new.cree_le <> old.cree_le
     or new.cree_par is distinct from old.cree_par
     or (new.patient_id is distinct from old.patient_id and new.patient_id is not null) then
    raise exception 'Une facture émise ne se modifie pas (seul son paiement change)';
  end if;
  return new;
end $$;
create trigger factures_immuables before update or delete on factures
  for each row execute function factures_immuables();

-- Journal d'accès : on ajoute, on ne modifie pas, on n'efface pas.
create table journal (
  id bigserial primary key,
  date timestamptz not null default now(),
  utilisateur_id uuid references utilisateurs (id),
  email text not null default '',
  action text not null,
  detail text not null default '',               -- chiffré quand il cite un patient
  ip text not null default ''
);
create index journal_date on journal (date desc);

create function journal_ajout_seul() returns trigger language plpgsql as $$
begin
  raise exception 'Le journal d''accès ne se modifie pas et ne s''efface pas';
end $$;
create trigger journal_ajout_seul before update or delete on journal
  for each row execute function journal_ajout_seul();
create trigger journal_pas_de_vidage before truncate on journal
  for each statement execute function journal_ajout_seul();
