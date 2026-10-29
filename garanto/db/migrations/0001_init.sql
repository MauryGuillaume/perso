-- 0001_init.sql — tables de Garanto (modèle validé le 2026-10-23).
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.
-- maj_modifie_le() est fournie par le socle (noyau/migrations/0001_socle.sql).
-- Exception assumée à « pas d'effacement de données métier » : l'utilisateur supprime réellement ses achats et fichiers (RGPD).

create table if not exists achats (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references utilisateurs(id) on delete cascade,
  produit text not null check (length(produit) between 1 and 160),
  magasin text check (length(magasin) <= 120),
  date_achat date not null,
  montant numeric(12,2) check (montant >= 0),
  garantie_legale_mois integer not null default 24 check (garantie_legale_mois between 0 and 120),
  garantie_commerciale_mois integer not null default 0 check (garantie_commerciale_mois between 0 and 240),
  fin_garantie date generated always as ((date_achat + make_interval(months => greatest(garantie_legale_mois, garantie_commerciale_mois)))::date) stored,
  rappel_envoye_le timestamptz,
  note text check (length(note) <= 2000),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists achats_compte_id_fin_idx on achats (compte_id, fin_garantie);
create index if not exists achats_rappel_idx on achats (fin_garantie) where rappel_envoye_le is null;
comment on table achats is 'Achats enregistrés par chaque utilisateur, avec leurs garanties';
comment on column achats.compte_id is 'Propriétaire de l''achat (seul à le voir)';
comment on column achats.produit is 'Nom du produit acheté';
comment on column achats.magasin is 'Enseigne ou site marchand';
comment on column achats.date_achat is 'Date d''achat, saisie par l''utilisateur';
comment on column achats.montant is 'Prix TTC en euros (facultatif)';
comment on column achats.garantie_legale_mois is 'Garantie légale de conformité, en mois (24 par défaut)';
comment on column achats.garantie_commerciale_mois is 'Garantie commerciale du fabricant ou du magasin, en mois';
comment on column achats.fin_garantie is 'Calculée par la base : date d''achat + la plus longue des deux garanties';
comment on column achats.rappel_envoye_le is 'Date du rappel e-mail de fin de garantie ; vide = pas encore envoyé';
comment on column achats.note is 'Numéro de série, remarques';
drop trigger if exists achats_modifie_le on achats;
create trigger achats_modifie_le before update on achats for each row execute function maj_modifie_le();

create table if not exists justificatifs (
  id uuid primary key default gen_random_uuid(),
  achat_id uuid not null references achats(id) on delete cascade,
  compte_id uuid not null references utilisateurs(id) on delete cascade,
  type text not null check (type in ('ticket', 'garantie')),
  nom_origine text not null check (length(nom_origine) between 1 and 200),
  type_mime text not null check (type_mime in ('application/pdf', 'image/jpeg', 'image/png')),
  taille_octets integer not null check (taille_octets between 1 and 10485760),
  empreinte_sha256 text not null check (length(empreinte_sha256) = 64),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists justificatifs_achat_id_empreinte_uidx on justificatifs (achat_id, empreinte_sha256);
create index if not exists justificatifs_compte_id_idx on justificatifs (compte_id);
comment on table justificatifs is 'Tickets de caisse et bons de garantie joints à un achat (sans le contenu du fichier)';
comment on column justificatifs.compte_id is 'Propriétaire, pour vérifier l''accès sans passer par l''achat';
comment on column justificatifs.type is 'ticket (ticket de caisse ou facture) ou garantie (bon ou certificat) ; tout autre document est refusé';
comment on column justificatifs.nom_origine is 'Nom du fichier envoyé';
comment on column justificatifs.type_mime is 'Type reconnu sur les premiers octets du fichier : PDF, JPEG ou PNG';
comment on column justificatifs.taille_octets is 'Taille du fichier (10 Mo maximum)';
comment on column justificatifs.empreinte_sha256 is 'Empreinte du contenu : le même fichier ne se joint pas deux fois au même achat';
drop trigger if exists justificatifs_modifie_le on justificatifs;
create trigger justificatifs_modifie_le before update on justificatifs for each row execute function maj_modifie_le();

create table if not exists justificatifs_contenu (
  justificatif_id uuid primary key references justificatifs(id) on delete cascade,
  compte_id uuid not null references utilisateurs(id) on delete cascade,
  contenu bytea not null,
  cree_le timestamptz not null default now()
);
create index if not exists justificatifs_contenu_compte_id_idx on justificatifs_contenu (compte_id);
comment on table justificatifs_contenu is 'Contenu des fichiers, à part pour que les listes ne le chargent jamais (Scalingo n''a pas de disque persistant)';
comment on column justificatifs_contenu.compte_id is 'Propriétaire (règle RGPD de suppression)';
comment on column justificatifs_contenu.contenu is 'Octets du fichier, jamais affichés dans l''Atelier';

create table if not exists envois (
  id uuid primary key default gen_random_uuid(),
  compte_id uuid not null references utilisateurs(id) on delete cascade,
  achat_id uuid references achats(id) on delete set null,
  nature text not null default 'partage' check (nature in ('partage', 'rappel', 'prevenance')),
  destinataire text not null check (destinataire = lower(destinataire) and length(destinataire) <= 200),
  objet text not null check (length(objet) between 1 and 200),
  nb_pieces integer not null default 0 check (nb_pieces between 0 and 5),
  taille_octets integer not null default 0 check (taille_octets between 0 and 10485760),
  envoye_le timestamptz not null default now(),
  statut text not null default 'en_cours' check (statut in ('en_cours', 'envoye', 'echec')),
  id_fournisseur text,
  erreur text,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists envois_compte_id_envoye_idx on envois (compte_id, envoye_le desc);
create index if not exists envois_achat_id_idx on envois (achat_id);
comment on table envois is 'Trace de chaque e-mail envoyé : partage d''un justificatif, rappel de fin de garantie, prévenance d''inactivité';
comment on column envois.achat_id is 'Achat concerné (vide pour une prévenance d''inactivité)';
comment on column envois.nature is 'partage (par l''utilisateur, compté dans le quota du jour), rappel ou prevenance (automatiques)';
comment on column envois.destinataire is 'Adresse unique du destinataire';
comment on column envois.nb_pieces is 'Nombre de pièces jointes';
comment on column envois.taille_octets is 'Taille totale des pièces jointes (10 Mo maximum)';
comment on column envois.statut is 'en_cours, envoye ou echec';
comment on column envois.id_fournisseur is 'Identifiant du message chez Brevo';
comment on column envois.erreur is 'Raison de l''échec';
drop trigger if exists envois_modifie_le on envois;
create trigger envois_modifie_le before update on envois for each row execute function maj_modifie_le();

create table if not exists preferences_comptes (
  compte_id uuid primary key references utilisateurs(id) on delete cascade,
  rappels_actifs boolean not null default true,
  inactivite_prevenu_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
comment on table preferences_comptes is 'Préférences personnelles de chaque compte (absente = valeurs par défaut)';
comment on column preferences_comptes.rappels_actifs is 'Rappel par e-mail avant la fin de garantie';
comment on column preferences_comptes.inactivite_prevenu_le is 'Date de l''e-mail prévenant de la suppression pour inactivité';
drop trigger if exists preferences_comptes_modifie_le on preferences_comptes;
create trigger preferences_comptes_modifie_le before update on preferences_comptes for each row execute function maj_modifie_le();
