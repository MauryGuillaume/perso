-- noyau/migrations/0002_jetons.sql — connexion par jetons (front séparé, app mobile). NE PAS MODIFIER.
create table if not exists jetons (
  id text primary key,
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  expire_le timestamptz not null,
  ip text,
  agent text,
  cree_le timestamptz not null default now()
);
create index if not exists jetons_utilisateur_id_idx on jetons (utilisateur_id);
create index if not exists jetons_expire_le_idx on jetons (expire_le);
comment on table jetons is 'Jetons de renouvellement des connexions par jetons (socle)';
comment on column jetons.id is 'Empreinte SHA-256 du jeton de renouvellement (le jeton lui-même n''est jamais stocké)';
comment on column jetons.expire_le is 'Fin de validité (JETON_JOURS) ; un jeton utilisé est supprimé et remplacé';
comment on column jetons.ip is 'Adresse IP à l''ouverture';
comment on column jetons.agent is 'Navigateur ou appareil à l''ouverture';
