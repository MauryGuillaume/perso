-- 0001_podologie.sql — tables de PodoLogiciel (podologues, patients, bilans, agenda, dépenses).
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.
-- Chaque podologue ne voit que ses données (utilisateur_id) ; une ligne supprimée par l'écran garde une date
-- supprime_le (corbeille) et disparaît de l'app.

-- Profil du podologue : colonnes ajoutées aux comptes du socle
alter table utilisateurs add column if not exists prenom text not null default '';
alter table utilisateurs add column if not exists cabinet text not null default '';
alter table utilisateurs add column if not exists premiere_connexion boolean not null default true;
alter table utilisateurs add column if not exists personnalisation jsonb not null default '{}'::jsonb;
alter table utilisateurs add column if not exists deux_facteurs_secret text;
alter table utilisateurs add column if not exists deux_facteurs_actif boolean not null default false;
comment on column utilisateurs.prenom is 'Prénom du podologue';
comment on column utilisateurs.cabinet is 'Nom du cabinet ou de l''établissement';
comment on column utilisateurs.premiere_connexion is 'Visite guidée de l''app pas encore faite';
comment on column utilisateurs.personnalisation is 'Onglets et champs personnalisés des bilans (JSON)';
comment on column utilisateurs.deux_facteurs_secret is 'Secret de double authentification (TOTP), chiffré AES-256-GCM';
comment on column utilisateurs.deux_facteurs_actif is 'Double authentification activée';

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  nom text not null default '' check (length(nom) <= 120),
  prenom text not null default '' check (length(prenom) <= 120),
  date_naissance text,
  taille text,
  poids text,
  medecin_traitant text,
  telephone text,
  email text,
  adresse text,
  notes_admin text,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists patients_utilisateur_id_idx on patients (utilisateur_id, lower(nom)) where supprime_le is null;
create index if not exists patients_utilisateur_id_fk_idx on patients (utilisateur_id);
comment on table patients is 'Patients d''un podologue';
comment on column patients.utilisateur_id is 'Podologue propriétaire de la fiche';
comment on column patients.date_naissance is 'Date de naissance telle que saisie (AAAA-MM-JJ)';
comment on column patients.taille is 'Taille saisie (cm)';
comment on column patients.poids is 'Poids saisi (kg)';
comment on column patients.notes_admin is 'Notes administratives';
comment on column patients.supprime_le is 'Date de suppression depuis l''app ; null = fiche active';
drop trigger if exists patients_modifie_le on patients;
create trigger patients_modifie_le before update on patients for each row execute function maj_modifie_le();

create table if not exists bilans (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  type_bilan text not null default 'bilan' check (length(type_bilan) <= 40),
  statut text not null default 'brouillon' check (length(statut) <= 40),
  date text not null default to_char(now(), 'YYYY-MM-DD'),
  motif_consultation text,
  douleur_score integer check (douleur_score between 0 and 10),
  donnees jsonb not null default '{}'::jsonb,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists bilans_utilisateur_id_idx on bilans (utilisateur_id, date desc) where supprime_le is null;
create index if not exists bilans_utilisateur_id_fk_idx on bilans (utilisateur_id);
create index if not exists bilans_patient_id_idx on bilans (patient_id);
comment on table bilans is 'Bilans podologiques et consultations';
comment on column bilans.type_bilan is 'bilan, consultation…';
comment on column bilans.statut is 'brouillon, finalisé…';
comment on column bilans.date is 'Date du bilan (AAAA-MM-JJ)';
comment on column bilans.douleur_score is 'Douleur (EVA) de 0 à 10';
comment on column bilans.donnees is 'Reste du bilan : questionnaire, annotations du pied, schémas, barométrie (JSON)';
comment on column bilans.supprime_le is 'Date de suppression depuis l''app ; null = bilan actif';
drop trigger if exists bilans_modifie_le on bilans;
create trigger bilans_modifie_le before update on bilans for each row execute function maj_modifie_le();

create table if not exists rendez_vous (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  patient_nom text not null check (length(patient_nom) between 1 and 200),
  date text not null,
  heure_debut text not null,
  duree_minutes integer not null default 30 check (duree_minutes between 1 and 1440),
  type text not null default 'Consultation' check (length(type) <= 80),
  notes text,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists rendez_vous_utilisateur_id_idx on rendez_vous (utilisateur_id, date) where supprime_le is null;
create index if not exists rendez_vous_utilisateur_id_fk_idx on rendez_vous (utilisateur_id);
comment on table rendez_vous is 'Rendez-vous de l''agenda';
comment on column rendez_vous.patient_nom is 'Nom du patient tel que saisi dans l''agenda';
comment on column rendez_vous.date is 'Jour du rendez-vous (AAAA-MM-JJ)';
comment on column rendez_vous.heure_debut is 'Heure de début (HH:MM)';
comment on column rendez_vous.supprime_le is 'Date de suppression depuis l''app ; null = rendez-vous actif';
drop trigger if exists rendez_vous_modifie_le on rendez_vous;
create trigger rendez_vous_modifie_le before update on rendez_vous for each row execute function maj_modifie_le();

create table if not exists reglages_agenda (
  utilisateur_id uuid primary key references utilisateurs(id) on delete cascade,
  debut_journee integer not null default 8 check (debut_journee between 0 and 23),
  fin_journee integer not null default 19 check (fin_journee between 1 and 24),
  creneau_minutes integer not null default 30 check (creneau_minutes between 5 and 240),
  jours_travailles jsonb not null default '[1,2,3,4,5,6]'::jsonb,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table reglages_agenda is 'Horaires de l''agenda de chaque podologue';
comment on column reglages_agenda.jours_travailles is 'Jours ouverts, 0 = dimanche … 6 = samedi (JSON)';
drop trigger if exists reglages_agenda_modifie_le on reglages_agenda;
create trigger reglages_agenda_modifie_le before update on reglages_agenda for each row execute function maj_modifie_le();

create table if not exists depenses (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  date text not null,
  libelle text not null check (length(libelle) between 1 and 200),
  categorie text not null check (length(categorie) <= 60),
  montant numeric(12,2) not null,
  notes text,
  type_depense text not null default 'standard' check (length(type_depense) <= 40),
  km_distance numeric(10,2),
  km_nb_trajets integer,
  km_aller_retour boolean,
  km_taux numeric(8,4),
  groupe_recurrence uuid,
  frequence_recurrence text,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists depenses_utilisateur_id_idx on depenses (utilisateur_id, date desc) where supprime_le is null;
create index if not exists depenses_utilisateur_id_fk_idx on depenses (utilisateur_id);
create index if not exists depenses_groupe_recurrence_idx on depenses (groupe_recurrence) where groupe_recurrence is not null;
comment on table depenses is 'Dépenses du cabinet (comptabilité)';
comment on column depenses.date is 'Date de la dépense (AAAA-MM-JJ)';
comment on column depenses.montant is 'Montant en euros';
comment on column depenses.type_depense is 'standard ou kilometrique';
comment on column depenses.km_taux is 'Barème kilométrique en euros par km';
comment on column depenses.groupe_recurrence is 'Dépenses créées ensemble par une récurrence';
comment on column depenses.frequence_recurrence is 'mensuelle, trimestrielle…';
comment on column depenses.supprime_le is 'Date de suppression depuis l''app ; null = dépense active';
drop trigger if exists depenses_modifie_le on depenses;
create trigger depenses_modifie_le before update on depenses for each row execute function maj_modifie_le();

create table if not exists reinitialisations_mdp (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  jeton_hash text not null,
  expire_le timestamptz not null,
  cree_le timestamptz not null default now()
);
create unique index if not exists reinitialisations_mdp_jeton_hash_uidx on reinitialisations_mdp (jeton_hash);
create index if not exists reinitialisations_mdp_utilisateur_id_idx on reinitialisations_mdp (utilisateur_id);
comment on table reinitialisations_mdp is 'Demandes « mot de passe oublié » en cours (une heure)';
comment on column reinitialisations_mdp.jeton_hash is 'Empreinte SHA-256 du lien envoyé (le lien lui-même n''est jamais stocké)';
comment on column reinitialisations_mdp.expire_le is 'Fin de validité du lien';
