create extension if not exists pgcrypto;
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  texte text not null check (length(texte) <= 500),
  cree_le timestamptz not null default now()
);
comment on table notes is 'Notes saisies';
