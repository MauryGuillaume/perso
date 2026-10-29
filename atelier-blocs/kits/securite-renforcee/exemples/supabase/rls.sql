-- exemples/supabase/rls.sql — règles d'accès (RLS) : une politique par opération (kit « Cybersécurité renforcée »)
-- Table liée à l'utilisateur connecté : il ne lit et ne modifie que ses lignes.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texte text not null check (length(texte) <= 5000),
  cree_le timestamptz not null default now()
);
create index if not exists notes_utilisateur_idx on public.notes (utilisateur);
alter table public.notes enable row level security;

drop policy if exists notes_lire on public.notes;
create policy notes_lire on public.notes for select to authenticated using (utilisateur = auth.uid());
drop policy if exists notes_ajouter on public.notes;
create policy notes_ajouter on public.notes for insert to authenticated with check (utilisateur = auth.uid());
drop policy if exists notes_modifier on public.notes;
create policy notes_modifier on public.notes for update to authenticated using (utilisateur = auth.uid()) with check (utilisateur = auth.uid());
drop policy if exists notes_supprimer on public.notes;
create policy notes_supprimer on public.notes for delete to authenticated using (utilisateur = auth.uid());

-- Table de référence lisible par tous, modifiable seulement par le serveur (clé service_role, qui ignore la RLS) :
-- create policy tarifs_lire on public.tarifs for select to anon, authenticated using (true);
-- (aucune politique insert/update/delete : personne ne peut écrire depuis le navigateur)
