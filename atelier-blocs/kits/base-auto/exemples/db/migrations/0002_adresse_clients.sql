-- 0002 — exemple d'évolution : on AJOUTE, on ne modifie jamais 0001
alter table clients add column if not exists adresse text;
alter table clients add column if not exists actif boolean not null default true;
comment on column clients.adresse is 'Adresse postale complète';
comment on column clients.actif is 'Faux quand le client est archivé (jamais supprimé)';
