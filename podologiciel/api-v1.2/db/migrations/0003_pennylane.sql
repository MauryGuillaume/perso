-- 0003_pennylane.sql — connecteur Pennylane (facultatif, propre à chaque podologue).
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.
-- Pennylane n'est pas obligatoire : c'est un logiciel de comptabilité (et une plateforme agréée de facturation
-- électronique parmi d'autres). Le podologue qui l'utilise colle sa clé d'API ; ses factures émises y sont importées
-- avec leur numéro et leur PDF, et les patients facturés y deviennent des clients (nom et adresse seulement).

create table if not exists pennylane_reglages (
  utilisateur_id uuid primary key references utilisateurs(id) on delete cascade,
  jeton text not null,
  entreprise text,
  envoi_auto boolean not null default true,
  depuis text not null default to_char(now(), 'YYYY-MM-DD') check (depuis ~ '^\d{4}-\d{2}-\d{2}$'),
  connecte_le timestamptz not null default now(),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table pennylane_reglages is 'Connexion Pennylane de chaque podologue';
comment on column pennylane_reglages.jeton is 'Clé d''API Pennylane, chiffrée AES-256-GCM (jamais renvoyée à l''écran)';
comment on column pennylane_reglages.entreprise is 'Nom de l''entreprise Pennylane reliée';
comment on column pennylane_reglages.envoi_auto is 'Envoyer chaque facture à Pennylane dès son émission';
comment on column pennylane_reglages.depuis is 'Seules les factures datées de ce jour ou après sont proposées à l''envoi (AAAA-MM-JJ)';
drop trigger if exists pennylane_reglages_modifie_le on pennylane_reglages;
create trigger pennylane_reglages_modifie_le before update on pennylane_reglages for each row execute function maj_modifie_le();

-- Patient de PodoLogiciel ↔ client Pennylane. patient_id vide : client « Patient sans fiche » du podologue.
create table if not exists pennylane_clients (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  pennylane_id bigint not null,
  synchro_le timestamptz not null default now(),
  cree_le timestamptz not null default now()
);
create unique index if not exists pennylane_clients_patient_uidx on pennylane_clients (utilisateur_id, patient_id) where patient_id is not null;
create unique index if not exists pennylane_clients_sans_fiche_uidx on pennylane_clients (utilisateur_id) where patient_id is null;
create index if not exists pennylane_clients_patient_id_idx on pennylane_clients (patient_id);
comment on table pennylane_clients is 'Patients envoyés à Pennylane comme clients';
comment on column pennylane_clients.pennylane_id is 'Identifiant du client dans Pennylane';
comment on column pennylane_clients.synchro_le is 'Dernière mise à jour du client dans Pennylane';

-- Suivi de l'envoi de chaque facture (ces colonnes ne sont pas verrouillées par factures_verrou)
alter table factures add column if not exists pennylane_id bigint;
alter table factures add column if not exists pennylane_envoye_le timestamptz;
alter table factures add column if not exists pennylane_erreur text;
alter table factures add column if not exists pennylane_essai_le timestamptz;
comment on column factures.pennylane_id is 'Identifiant de la facture importée dans Pennylane ; vide = pas encore envoyée';
comment on column factures.pennylane_envoye_le is 'Date d''envoi à Pennylane';
comment on column factures.pennylane_erreur is 'Dernière erreur d''envoi à Pennylane';
comment on column factures.pennylane_essai_le is 'Début du dernier envoi (évite deux envois simultanés)';
