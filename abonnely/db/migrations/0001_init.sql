-- 0001_init.sql — tables d'Abonnely : catalogue des services, abonnements suivis, imports de relevés, rappels envoyés.
-- Conventions : KIT.md § 9. Pas de BEGIN/COMMIT : noyau/base.js met chaque fichier dans une transaction.
-- La table « abonnements » est celle du socle (offre Gratuit / Premium) : les abonnements suivis par l'utilisateur
-- sont dans « souscriptions ». Montants en centimes entiers (modèle de l'Atelier : *_cts).

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 1 and 80),
  categorie text not null default 'autre' check (categorie in ('video', 'musique', 'box_internet', 'telephone', 'sport', 'presse', 'jeux', 'logiciel', 'cloud', 'autre')),
  prix_type_cts integer check (prix_type_cts >= 0),
  periodicite_type text not null default 'mensuelle' check (periodicite_type in ('hebdomadaire', 'mensuelle', 'trimestrielle', 'semestrielle', 'annuelle')),
  lien_resiliation text check (lien_resiliation ~ '^https://'),
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists services_nom_uidx on services (lower(nom));
create index if not exists services_categorie_idx on services (categorie);
comment on table services is 'Catalogue des services connus (streaming, musique, box, téléphone, sport…), partagé par tous les comptes';
comment on column services.categorie is 'video, musique, box_internet, telephone, sport, presse, jeux, logiciel, cloud ou autre';
comment on column services.prix_type_cts is 'Prix indicatif de l''offre courante, en centimes TTC (pré-remplit le montant ; à tenir à jour)';
comment on column services.periodicite_type is 'Périodicité du prix indicatif';
comment on column services.lien_resiliation is 'Page de résiliation ou de gestion du compte chez le service (https)';
comment on column services.actif is 'false = retiré du catalogue, sans toucher aux abonnements qui le citent';
drop trigger if exists services_modifie_le on services;
create trigger services_modifie_le before update on services for each row execute function maj_modifie_le();

create table if not exists souscriptions (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  libelle text not null check (length(libelle) between 1 and 80),
  categorie text not null default 'autre' check (categorie in ('video', 'musique', 'box_internet', 'telephone', 'sport', 'presse', 'jeux', 'logiciel', 'cloud', 'autre')),
  montant_cts integer not null check (montant_cts between 0 and 100000000),
  periodicite text not null default 'mensuelle' check (periodicite in ('hebdomadaire', 'mensuelle', 'trimestrielle', 'semestrielle', 'annuelle')),
  prochaine_echeance date not null,
  essai_fin date,
  rappel_jours integer not null default 3 check (rappel_jours between 0 and 30),
  source text not null default 'manuel' check (source in ('manuel', 'import')),
  resilie_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists souscriptions_utilisateur_echeance_idx on souscriptions (utilisateur_id, prochaine_echeance);
create index if not exists souscriptions_service_id_idx on souscriptions (service_id);
create index if not exists souscriptions_echeance_idx on souscriptions (prochaine_echeance) where resilie_le is null;
create index if not exists souscriptions_essai_fin_idx on souscriptions (essai_fin) where essai_fin is not null and resilie_le is null;
comment on table souscriptions is 'Abonnements suivis par chaque utilisateur (streaming, box, salle de sport…) : montant, périodicité, échéances';
comment on column souscriptions.utilisateur_id is 'Compte propriétaire (seul à le voir)';
comment on column souscriptions.service_id is 'Service du catalogue ; vide pour un abonnement saisi librement';
comment on column souscriptions.libelle is 'Nom affiché (repris du service ou saisi)';
comment on column souscriptions.categorie is 'Catégorie pour le graphique (mêmes valeurs que services.categorie)';
comment on column souscriptions.montant_cts is 'Montant prélevé à chaque échéance, en centimes TTC';
comment on column souscriptions.periodicite is 'hebdomadaire, mensuelle, trimestrielle, semestrielle ou annuelle';
comment on column souscriptions.prochaine_echeance is 'Date du prochain prélèvement (avancée automatiquement une fois passée)';
comment on column souscriptions.essai_fin is 'Fin de la période d''essai gratuit, si l''abonnement est en essai';
comment on column souscriptions.rappel_jours is 'Jours avant l''échéance pour le rappel par e-mail (3 ; réglable avec Premium)';
comment on column souscriptions.source is 'manuel (saisi) ou import (détecté dans un relevé)';
comment on column souscriptions.resilie_le is 'Date de résiliation ; null = en cours (on n''efface pas un abonnement)';
drop trigger if exists souscriptions_modifie_le on souscriptions;
create trigger souscriptions_modifie_le before update on souscriptions for each row execute function maj_modifie_le();

create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  lignes integer not null default 0 check (lignes >= 0),
  detectes integer not null default 0 check (detectes >= 0),
  ajoutes integer not null default 0 check (ajoutes >= 0),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists imports_utilisateur_idx on imports (utilisateur_id, cree_le desc);
comment on table imports is 'Relevés bancaires CSV analysés (le fichier n''est jamais gardé : seulement ces compteurs)';
comment on column imports.utilisateur_id is 'Compte qui a importé le relevé';
comment on column imports.lignes is 'Nombre d''opérations lues dans le relevé';
comment on column imports.detectes is 'Prélèvements récurrents proposés';
comment on column imports.ajoutes is 'Propositions ajoutées aux abonnements suivis';
drop trigger if exists imports_modifie_le on imports;
create trigger imports_modifie_le before update on imports for each row execute function maj_modifie_le();

create table if not exists rappels (
  id uuid primary key default gen_random_uuid(),
  souscription_id uuid not null references souscriptions(id) on delete cascade,
  sorte text not null check (sorte in ('echeance', 'essai')),
  echeance date not null,
  envoye_le timestamptz not null default now(),
  cree_le timestamptz not null default now()
);
create unique index if not exists rappels_unicite_uidx on rappels (souscription_id, sorte, echeance);
comment on table rappels is 'Rappels envoyés par e-mail (un seul par abonnement, sorte et date, même après un redémarrage)';
comment on column rappels.sorte is 'echeance (prochain prélèvement) ou essai (fin de l''essai gratuit)';
comment on column rappels.echeance is 'Date rappelée';
comment on column rappels.envoye_le is 'Heure d''envoi de l''e-mail';

-- Catalogue de départ : prix indicatifs (offre courante, à vérifier et tenir à jour depuis l'Atelier › Données › services).
insert into services (nom, categorie, prix_type_cts, periodicite_type, lien_resiliation) values
  ('Netflix', 'video', 1499, 'mensuelle', 'https://www.netflix.com/cancelplan'),
  ('Disney+', 'video', 999, 'mensuelle', 'https://www.disneyplus.com/account'),
  ('Amazon Prime', 'video', 699, 'mensuelle', 'https://www.amazon.fr/mc'),
  ('Canal+', 'video', null, 'mensuelle', 'https://www.canalplus.com/espace-client/'),
  ('Max', 'video', 999, 'mensuelle', 'https://www.max.com/'),
  ('Paramount+', 'video', 799, 'mensuelle', 'https://www.paramountplus.com/fr/account/'),
  ('Apple TV+', 'video', 999, 'mensuelle', 'https://support.apple.com/fr-fr/HT202039'),
  ('Crunchyroll', 'video', 699, 'mensuelle', 'https://www.crunchyroll.com/fr/account/membership'),
  ('YouTube Premium', 'video', 1299, 'mensuelle', 'https://www.youtube.com/paid_memberships'),
  ('Spotify', 'musique', 1214, 'mensuelle', 'https://www.spotify.com/fr/account/subscription/'),
  ('Deezer', 'musique', 1199, 'mensuelle', 'https://www.deezer.com/account/subscription'),
  ('Apple Music', 'musique', 1099, 'mensuelle', 'https://support.apple.com/fr-fr/HT202039'),
  ('Audible', 'musique', 995, 'mensuelle', 'https://www.audible.fr/account/'),
  ('Free (Freebox)', 'box_internet', null, 'mensuelle', 'https://subscribe.free.fr/login/'),
  ('Orange (Livebox)', 'box_internet', null, 'mensuelle', 'https://espace-client.orange.fr/'),
  ('SFR (box)', 'box_internet', null, 'mensuelle', 'https://www.sfr.fr/mon-espace-client/'),
  ('Bouygues Telecom (Bbox)', 'box_internet', null, 'mensuelle', 'https://www.bouyguestelecom.fr/mon-compte'),
  ('Free Mobile', 'telephone', null, 'mensuelle', 'https://mobile.free.fr/account/'),
  ('Orange (mobile)', 'telephone', null, 'mensuelle', 'https://espace-client.orange.fr/'),
  ('SFR (mobile)', 'telephone', null, 'mensuelle', 'https://www.sfr.fr/mon-espace-client/'),
  ('Bouygues Telecom (mobile)', 'telephone', null, 'mensuelle', 'https://www.bouyguestelecom.fr/mon-compte'),
  ('Sosh', 'telephone', null, 'mensuelle', 'https://espace-client.orange.fr/'),
  ('RED by SFR', 'telephone', null, 'mensuelle', 'https://www.red-by-sfr.fr/mon-espace-client/'),
  ('Basic-Fit', 'sport', null, 'mensuelle', 'https://www.basic-fit.com/fr-fr/'),
  ('Fitness Park', 'sport', null, 'mensuelle', 'https://www.fitnesspark.fr/'),
  ('Keep Cool', 'sport', null, 'mensuelle', 'https://www.keepcool.fr/'),
  ('L''Orange Bleue', 'sport', null, 'mensuelle', 'https://www.lorangebleue.fr/'),
  ('Le Monde', 'presse', null, 'mensuelle', 'https://www.lemonde.fr/'),
  ('Cafeyn', 'presse', null, 'mensuelle', 'https://www.cafeyn.co/'),
  ('Kindle Unlimited', 'presse', 999, 'mensuelle', 'https://www.amazon.fr/kindle-dbs/ku/ku-central'),
  ('Xbox Game Pass', 'jeux', null, 'mensuelle', 'https://account.microsoft.com/services'),
  ('PlayStation Plus', 'jeux', null, 'mensuelle', 'https://www.playstation.com/fr-fr/'),
  ('Nintendo Switch Online', 'jeux', 1999, 'annuelle', 'https://accounts.nintendo.com/'),
  ('Microsoft 365', 'logiciel', 9900, 'annuelle', 'https://account.microsoft.com/services'),
  ('Adobe Creative Cloud', 'logiciel', null, 'mensuelle', 'https://account.adobe.com/plans'),
  ('Canva Pro', 'logiciel', null, 'mensuelle', 'https://www.canva.com/'),
  ('ChatGPT Plus', 'logiciel', null, 'mensuelle', 'https://chatgpt.com/'),
  ('Google One', 'cloud', 199, 'mensuelle', 'https://one.google.com/settings'),
  ('iCloud+', 'cloud', 99, 'mensuelle', 'https://support.apple.com/fr-fr/HT202039'),
  ('Dropbox', 'cloud', 1199, 'mensuelle', 'https://www.dropbox.com/account/plan')
on conflict do nothing;
