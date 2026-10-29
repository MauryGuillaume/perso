-- 0002_factures_documents_semelles.sql — factures en base, documents des patients, semelles (orthèses plantaires).
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.

-- ---------- Factures ----------
-- Une facture est d'abord un brouillon (numero vide, modifiable, supprimable). Une fois émise, elle reçoit un numéro
-- continu par année (2026-0001, 2026-0002…) et son contenu ne change plus : on ne corrige que par un avoir.
create table if not exists factures (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  numero text check (length(numero) <= 20),
  genre text not null default 'facture' check (genre in ('facture', 'avoir')),
  date text not null default to_char(now(), 'YYYY-MM-DD'),
  actes jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  mode_paiement text not null default 'especes' check (length(mode_paiement) <= 40),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'paye')),
  notes text,
  option_signature text check (option_signature in ('image', 'empty', 'none')),
  patient_fige jsonb,
  emise_le timestamptz,
  annulee_le timestamptz,
  avoir_de uuid references factures(id) on delete set null,
  dernier_rappel_le timestamptz,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists factures_numero_uidx on factures (utilisateur_id, numero) where numero is not null;
create index if not exists factures_utilisateur_id_idx on factures (utilisateur_id, date desc) where supprime_le is null;
create index if not exists factures_utilisateur_id_fk_idx on factures (utilisateur_id);
create index if not exists factures_patient_id_idx on factures (patient_id);
create index if not exists factures_avoir_de_idx on factures (avoir_de);
comment on table factures is 'Factures et avoirs des podologues';
comment on column factures.numero is 'Numéro continu par année (AAAA-NNNN) ; vide = brouillon';
comment on column factures.genre is 'facture ou avoir (annulation d''une facture émise)';
comment on column factures.date is 'Date de la facture (AAAA-MM-JJ)';
comment on column factures.actes is 'Lignes : libellé, quantité, prix unitaire (JSON)';
comment on column factures.total is 'Total en euros, calculé par le serveur à partir des actes';
comment on column factures.mode_paiement is 'especes, cb, cheque, virement, tiers-payant, autre';
comment on column factures.statut is 'Paiement : en_attente ou paye';
comment on column factures.option_signature is 'Signature sur le PDF : image, empty (cases vides), none ; vide = réglage du profil';
comment on column factures.patient_fige is 'Nom et adresse du patient au moment de l''émission (JSON)';
comment on column factures.emise_le is 'Date d''émission ; vide = brouillon';
comment on column factures.annulee_le is 'Date d''annulation par un avoir';
comment on column factures.avoir_de is 'Pour un avoir : la facture qu''il annule';
comment on column factures.dernier_rappel_le is 'Dernière relance de paiement';
comment on column factures.supprime_le is 'Brouillon supprimé depuis l''app ; une facture émise ne se supprime pas';
drop trigger if exists factures_modifie_le on factures;
create trigger factures_modifie_le before update on factures for each row execute function maj_modifie_le();

-- Une facture émise ne change plus (obligation de numérotation continue et d'inaltérabilité) : la base le garantit,
-- y compris pour une modification faite depuis l'Atelier. Seul le lien vers le patient peut se vider (patient effacé
-- pour le RGPD) : nom et adresse restent dans patient_fige.
create or replace function factures_verrou() returns trigger language plpgsql as $$
begin
  if old.numero is not null and (new.numero is distinct from old.numero or new.date is distinct from old.date
      or new.actes is distinct from old.actes or new.total is distinct from old.total or new.genre is distinct from old.genre
      or new.notes is distinct from old.notes or (new.patient_id is not null and new.patient_id is distinct from old.patient_id) or new.patient_fige is distinct from old.patient_fige
      or new.utilisateur_id is distinct from old.utilisateur_id or new.supprime_le is distinct from old.supprime_le) then
    raise exception 'Facture émise : son contenu ne peut plus changer (fais un avoir).' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists factures_verrou on factures;
create trigger factures_verrou before update on factures for each row execute function factures_verrou();

create table if not exists factures_compteurs (
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  annee integer not null check (annee between 2000 and 2999),
  dernier integer not null default 0 check (dernier >= 0),
  primary key (utilisateur_id, annee)
);
comment on table factures_compteurs is 'Dernier numéro de facture attribué, par podologue et par année';
comment on column factures_compteurs.dernier is 'Dernier numéro utilisé (le suivant est dernier + 1)';

create table if not exists reglages_facturation (
  utilisateur_id uuid primary key references utilisateurs(id) on delete cascade,
  actes jsonb not null default '[]'::jsonb,
  rappels jsonb not null default '{"enabled": true, "firstReminderDays": 14, "repeatIntervalDays": 7}'::jsonb,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table reglages_facturation is 'Actes proposés et règles de relance de chaque podologue';
comment on column reglages_facturation.actes is 'Actes proposés dans les factures : libellé et prix (JSON)';
comment on column reglages_facturation.rappels is 'Relances des factures en attente : activées, premier délai, intervalle en jours (JSON)';
drop trigger if exists reglages_facturation_modifie_le on reglages_facturation;
create trigger reglages_facturation_modifie_le before update on reglages_facturation for each row execute function maj_modifie_le();

-- ---------- Documents des patients ----------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  bilan_id uuid references bilans(id) on delete set null,
  nom text not null check (length(nom) between 1 and 200),
  type_mime text not null check (type_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain')),
  taille integer not null check (taille between 1 and 20000000),
  categorie text not null default 'autre' check (length(categorie) <= 40),
  contenu bytea not null,
  apercu text check (length(apercu) <= 300000),
  texte text,
  annotations jsonb not null default '[]'::jsonb,
  notes text,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists documents_patient_id_idx on documents (patient_id, cree_le desc) where supprime_le is null;
create index if not exists documents_utilisateur_id_idx on documents (utilisateur_id);
create index if not exists documents_bilan_id_idx on documents (bilan_id);
comment on table documents is 'Documents des patients : photos, empreintes, ordonnances, comptes rendus (images, PDF, texte)';
comment on column documents.bilan_id is 'Bilan auquel le document est rattaché (facultatif)';
comment on column documents.type_mime is 'Type du fichier : image JPEG, PNG, WebP, GIF, PDF ou texte';
comment on column documents.taille is 'Taille du fichier en octets (20 Mo maximum)';
comment on column documents.categorie is 'photo, empreinte, ordonnance, compte_rendu, imagerie, courrier, autre';
comment on column documents.contenu is 'Fichier lui-même';
comment on column documents.apercu is 'Vignette (image JPEG réduite)';
comment on column documents.texte is 'Texte lu dans le fichier (PDF ou texte), corrigeable par le podologue';
comment on column documents.annotations is 'Dessins sur l''image : traits, flèches, angles, textes (JSON)';
comment on column documents.supprime_le is 'Date de suppression depuis l''app ; null = document actif';
drop trigger if exists documents_modifie_le on documents;
create trigger documents_modifie_le before update on documents for each row execute function maj_modifie_le();

-- ---------- Semelles (orthèses plantaires) ----------
create table if not exists semelles (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  bilan_id uuid references bilans(id) on delete set null,
  date_prescription text not null default to_char(now(), 'YYYY-MM-DD'),
  pointure numeric(4,1) not null default 40 check (pointure between 15 and 55),
  type_semelle text not null default 'thermoformee' check (length(type_semelle) <= 60),
  base text check (length(base) <= 120),
  epaisseur_base numeric(4,1) check (epaisseur_base between 0 and 30),
  recouvrement text check (length(recouvrement) <= 120),
  chaussage text check (length(chaussage) <= 200),
  elements jsonb not null default '[]'::jsonb,
  statut text not null default 'prescrite' check (statut in ('prescrite', 'en_fabrication', 'livree', 'controlee')),
  fabrication text not null default 'cabinet' check (fabrication in ('cabinet', 'laboratoire')),
  laboratoire text check (length(laboratoire) <= 120),
  date_livraison text,
  date_controle text,
  date_renouvellement text,
  prix numeric(10,2) check (prix >= 0),
  notes text,
  supprime_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists semelles_patient_id_idx on semelles (patient_id, date_prescription desc) where supprime_le is null;
create index if not exists semelles_utilisateur_id_idx on semelles (utilisateur_id, statut) where supprime_le is null;
create index if not exists semelles_utilisateur_id_fk_idx on semelles (utilisateur_id);
create index if not exists semelles_bilan_id_idx on semelles (bilan_id);
comment on table semelles is 'Semelles orthopédiques (orthèses plantaires) : schéma, fabrication et suivi';
comment on column semelles.bilan_id is 'Bilan qui a conduit à la prescription (facultatif)';
comment on column semelles.date_prescription is 'Date de prescription (AAAA-MM-JJ)';
comment on column semelles.pointure is 'Pointure (système français)';
comment on column semelles.type_semelle is 'thermoformee, composite, moulee, fraisee, impression_3d, autre';
comment on column semelles.base is 'Matériau de la base';
comment on column semelles.epaisseur_base is 'Épaisseur de la base en mm';
comment on column semelles.recouvrement is 'Matériau de recouvrement';
comment on column semelles.chaussage is 'Chaussures prévues (ville, sport, sécurité…)';
comment on column semelles.elements is 'Éléments placés sur chaque semelle : type, côté, position, taille, épaisseur, matériau (JSON)';
comment on column semelles.statut is 'prescrite, en_fabrication, livree, controlee';
comment on column semelles.fabrication is 'Fabriquée au cabinet ou par un laboratoire';
comment on column semelles.date_livraison is 'Date de remise au patient (AAAA-MM-JJ)';
comment on column semelles.date_controle is 'Date du contrôle prévu ou fait (AAAA-MM-JJ)';
comment on column semelles.date_renouvellement is 'Date de renouvellement conseillée (AAAA-MM-JJ)';
comment on column semelles.prix is 'Prix de la paire en euros';
comment on column semelles.supprime_le is 'Date de suppression depuis l''app ; null = semelle active';
drop trigger if exists semelles_modifie_le on semelles;
create trigger semelles_modifie_le before update on semelles for each row execute function maj_modifie_le();
