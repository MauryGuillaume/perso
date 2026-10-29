-- 0001_init.sql — tables de Ressena : plans d'entraînement, progression des coureurs, séances réalisées.
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.
-- maj_modifie_le() est fournie par le socle (noyau/migrations/0001_socle.sql).

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{2,30}$'),
  nom text not null check (length(nom) between 1 and 80),
  description text not null default '' check (length(description) <= 500),
  semaines jsonb not null check (jsonb_typeof(semaines) = 'array' and jsonb_array_length(semaines) between 1 and 52),
  actif boolean not null default true,
  ordre integer not null default 0 check (ordre >= 0),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists plans_ordre_idx on plans (ordre);
comment on table plans is 'Programmes d''entraînement progressifs (alternance marche / course), gérés depuis l''Atelier';
comment on column plans.code is 'Code stable du plan (ex. 0-5km), repris dans le réglage plan_depart';
comment on column plans.nom is 'Nom affiché du plan';
comment on column plans.description is 'Présentation du plan affichée au coureur';
comment on column plans.semaines is 'Semaines et séances : [{ semaine, seances: [{ numero, echauffement_s, blocs: [{ type: course|marche, duree_s }], retour_calme_s }] }]';
comment on column plans.actif is 'Plan proposé aux comptes';
comment on column plans.ordre is 'Ordre d''affichage des plans';
drop trigger if exists plans_modifie_le on plans;
create trigger plans_modifie_le before update on plans for each row execute function maj_modifie_le();

create table if not exists profils (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null unique references utilisateurs(id) on delete cascade,
  plan_id uuid not null references plans(id) on delete restrict,
  semaine integer not null default 1 check (semaine between 1 and 52),
  seance integer not null default 1 check (seance between 1 and 7),
  sante_acceptee_le timestamptz,
  voix boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists profils_plan_id_idx on profils (plan_id);
comment on table profils is 'Progression de chaque coureur dans son plan (un profil par compte)';
comment on column profils.utilisateur_id is 'Compte du coureur (email et mot de passe dans utilisateurs)';
comment on column profils.plan_id is 'Plan suivi';
comment on column profils.semaine is 'Semaine en cours du plan';
comment on column profils.seance is 'Prochaine séance à faire dans la semaine';
comment on column profils.sante_acceptee_le is 'Date d''acceptation de l''avertissement santé ; vide = à afficher avant la première séance';
comment on column profils.voix is 'Guidage vocal activé';
drop trigger if exists profils_modifie_le on profils;
create trigger profils_modifie_le before update on profils for each row execute function maj_modifie_le();

create table if not exists seances (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  semaine integer check (semaine >= 1),
  numero integer check (numero >= 1),
  debut_le timestamptz not null default now(),
  duree_s integer not null check (duree_s between 0 and 21600),
  terminee boolean not null default false,
  distance_m integer check (distance_m >= 0),
  ressenti text check (ressenti in ('trop_facile', 'bien', 'difficile', 'trop_dur')),
  note text not null default '' check (length(note) <= 500),
  trace jsonb check (trace is null or jsonb_typeof(trace) = 'array'),
  archive_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists seances_utilisateur_id_debut_idx on seances (utilisateur_id, debut_le desc);
create index if not exists seances_plan_id_idx on seances (plan_id);
comment on table seances is 'Sorties réalisées par les coureurs (séance du plan ou sortie libre)';
comment on column seances.id is 'Identifiant, qui peut venir du téléphone : un renvoi après une coupure réseau ne crée pas de doublon';
comment on column seances.utilisateur_id is 'Coureur';
comment on column seances.plan_id is 'Plan de la séance ; vide = sortie libre ou plan retiré';
comment on column seances.semaine is 'Semaine du plan jouée';
comment on column seances.numero is 'Numéro de la séance dans la semaine';
comment on column seances.debut_le is 'Début de la séance';
comment on column seances.duree_s is 'Durée réelle en secondes (pauses exclues)';
comment on column seances.terminee is 'Tous les blocs faits ; false = séance arrêtée avant la fin';
comment on column seances.distance_m is 'Distance en mètres (GPS, version 2)';
comment on column seances.ressenti is 'trop_facile, bien, difficile ou trop_dur : sert à adapter la séance suivante';
comment on column seances.note is 'Note libre du coureur';
comment on column seances.trace is 'Parcours simplifié [[lat, lon, secondes], …] (GPS, version 2)';
comment on column seances.archive_le is 'Séance retirée de l''historique par le coureur ; null = visible (on n''efface pas)';
drop trigger if exists seances_modifie_le on seances;
create trigger seances_modifie_le before update on seances for each row execute function maj_modifie_le();

-- Plan de départ : de 0 à 5 km en 9 semaines, 3 séances par semaine, échauffement et retour au calme de 5 minutes en marchant.
insert into plans (code, nom, description, semaines, ordre) values ('0-5km', 'De 0 à 5 km',
  'En 9 semaines et 3 séances de 30 à 40 minutes par semaine, passez de la marche à 30 minutes de course sans vous arrêter.',
  '[{"semaine":1,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90},{"type":"course","duree_s":60},{"type":"marche","duree_s":90}],"retour_calme_s":300}]},{"semaine":2,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120},{"type":"course","duree_s":90},{"type":"marche","duree_s":120}],"retour_calme_s":300}]},{"semaine":3,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":90},{"type":"marche","duree_s":90},{"type":"course","duree_s":180},{"type":"marche","duree_s":180},{"type":"course","duree_s":90},{"type":"marche","duree_s":90},{"type":"course","duree_s":180},{"type":"marche","duree_s":180}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":90},{"type":"marche","duree_s":90},{"type":"course","duree_s":180},{"type":"marche","duree_s":180},{"type":"course","duree_s":90},{"type":"marche","duree_s":90},{"type":"course","duree_s":180},{"type":"marche","duree_s":180}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":90},{"type":"marche","duree_s":90},{"type":"course","duree_s":180},{"type":"marche","duree_s":180},{"type":"course","duree_s":90},{"type":"marche","duree_s":90},{"type":"course","duree_s":180},{"type":"marche","duree_s":180}],"retour_calme_s":300}]},{"semaine":4,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":180},{"type":"marche","duree_s":90},{"type":"course","duree_s":300},{"type":"marche","duree_s":150},{"type":"course","duree_s":180},{"type":"marche","duree_s":90},{"type":"course","duree_s":300}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":180},{"type":"marche","duree_s":90},{"type":"course","duree_s":300},{"type":"marche","duree_s":150},{"type":"course","duree_s":180},{"type":"marche","duree_s":90},{"type":"course","duree_s":300}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":180},{"type":"marche","duree_s":90},{"type":"course","duree_s":300},{"type":"marche","duree_s":150},{"type":"course","duree_s":180},{"type":"marche","duree_s":90},{"type":"course","duree_s":300}],"retour_calme_s":300}]},{"semaine":5,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":300},{"type":"marche","duree_s":180},{"type":"course","duree_s":300},{"type":"marche","duree_s":180},{"type":"course","duree_s":300}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":480},{"type":"marche","duree_s":300},{"type":"course","duree_s":480}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1200}],"retour_calme_s":300}]},{"semaine":6,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":300},{"type":"marche","duree_s":180},{"type":"course","duree_s":480},{"type":"marche","duree_s":180},{"type":"course","duree_s":300}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":600},{"type":"marche","duree_s":180},{"type":"course","duree_s":600}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1320}],"retour_calme_s":300}]},{"semaine":7,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1500}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1500}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1500}],"retour_calme_s":300}]},{"semaine":8,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1680}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1680}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1680}],"retour_calme_s":300}]},{"semaine":9,"seances":[{"numero":1,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1800}],"retour_calme_s":300},{"numero":2,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1800}],"retour_calme_s":300},{"numero":3,"echauffement_s":300,"blocs":[{"type":"course","duree_s":1800}],"retour_calme_s":300}]}]'::jsonb, 1)
on conflict (code) do nothing;
