/* outils/verifier-base.js — recette des migrations (OUTIL DE DÉVELOPPEMENT, pas livré avec l'app)
   Kit « Base de données automatique » de l'Atelier de Blocs.

   Crée une base jetable sur le serveur de DATABASE_URL, y applique toutes les migrations avec db/migrer.js,
   les rejoue (rien ne doit changer), contrôle les règles du kit, affiche les tables, puis supprime la base jetable.
   La base de DATABASE_URL elle-même n'est jamais touchée.

   Usage :  DATABASE_URL=postgres://postgres@localhost:5432/postgres node outils/verifier-base.js [dossier_du_projet]
   Code de sortie 0 = « Conforme », 1 = au moins une règle obligatoire en échec. */
'use strict';
const path = require('path');
const { Client } = require('pg');

const projet = path.resolve(process.argv[2] || '.');
const migrer = require(path.join(projet, 'db', 'migrer.js'));
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL manquante (un serveur PostgreSQL où créer une base jetable).'); process.exit(1); }

const jetable = 'verif_' + Date.now().toString(36);
const urlDe = nom => { const u = new URL(url); u.pathname = '/' + nom; return u.toString(); };
const ssl = process.env.DB_SSL === '1' ? { rejectUnauthorized: process.env.DB_SSL_STRICT !== '0' } : undefined;

async function requete(nomBase, sql, params) {
  const c = new Client({ connectionString: urlDe(nomBase), ssl });
  await c.connect();
  try { return (await c.query(sql, params)).rows; } finally { await c.end(); }
}

(async () => {
  const resultats = [];
  const regle = (num, texte, ok, detail, recommande) => resultats.push({ num, texte, ok, detail, recommande });
  const admin = new URL(url).pathname.replace(/^\//, '') || 'postgres';
  await requete(admin, `create database "${jetable}"`);
  try {
    // 1-3 : application, rejeu, journal
    let premiere = [], erreur = '';
    try { premiere = await migrer({ url: urlDe(jetable), silencieux: true }); } catch (e) { erreur = e.message; }
    regle('01', 'Toutes les migrations s’appliquent sur une base vide', !erreur, erreur || `${premiere.length} migration(s)`);
    if (erreur) return;
    const seconde = await migrer({ url: urlDe(jetable), silencieux: true });
    regle('02', 'Un redémarrage ne rejoue rien', seconde.length === 0, seconde.join(', '));
    regle('03', 'Migrations numérotées NNNN_nom.sql', premiere.every(f => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)), premiere.filter(f => !/^\d{4}_[a-z0-9_]+\.sql$/.test(f)).join(', '));

    const q = sql => requete(jetable, sql);
    const tables = (await q(`select c.relname as nom, obj_description(c.oid) as commentaire from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'schema_migrations' order by 1`));
    const colonnes = await q(`select table_name as t, column_name as c, data_type as type, is_nullable = 'NO' as requis, column_default as defaut,
      col_description(format('public.%I', table_name)::regclass, ordinal_position) as commentaire
      from information_schema.columns where table_schema = 'public' and table_name <> 'schema_migrations' order by table_name, ordinal_position`);
    const pk = new Set((await q(`select tc.table_name as t from information_schema.table_constraints tc where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'`)).map(r => r.t));
    const fks = await q(`select conrelid::regclass::text as t, a.attname as c, confrelid::regclass::text as vers, confdeltype as sup,
        exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indkey[0] = con.conkey[1]) as indexee
      from pg_constraint con join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
      where con.contype = 'f' and connamespace = 'public'::regnamespace`);
    const col = t => colonnes.filter(c => c.t === t);

    regle('04', 'Au moins une table', tables.length > 0, `${tables.length} table(s)`);
    regle('05', 'Clé primaire sur chaque table', tables.every(t => pk.has(t.nom)), tables.filter(t => !pk.has(t.nom)).map(t => t.nom).join(', '));
    regle('06', 'Chaque clé étrangère a un index', fks.every(f => f.indexee), fks.filter(f => !f.indexee).map(f => `${f.t}.${f.c}`).join(', '));
    regle('07', 'Chaque table a un commentaire (comment on table)', tables.every(t => t.commentaire), tables.filter(t => !t.commentaire).map(t => t.nom).join(', '));
    regle('08', 'cree_le sur chaque table', tables.every(t => col(t.nom).some(c => c.c === 'cree_le')), tables.filter(t => !col(t.nom).some(c => c.c === 'cree_le')).map(t => t.nom).join(', '));
    regle('09', 'Dates-heures en timestamptz (jamais timestamp sans fuseau)', !colonnes.some(c => c.type === 'timestamp without time zone'),
      colonnes.filter(c => c.type === 'timestamp without time zone').map(c => `${c.t}.${c.c}`).join(', '));
    regle('10', 'Pas de nombre à virgule flottante (argent en numeric)', !colonnes.some(c => /^(real|double precision)$/.test(c.type)),
      colonnes.filter(c => /^(real|double precision)$/.test(c.type)).map(c => `${c.t}.${c.c}`).join(', '));
    regle('11', 'Noms en minuscules avec _', tables.every(t => /^[a-z][a-z0-9_]*$/.test(t.nom)) && colonnes.every(c => /^[a-z][a-z0-9_]*$/.test(c.c)),
      colonnes.filter(c => !/^[a-z][a-z0-9_]*$/.test(c.c)).map(c => `${c.t}.${c.c}`).concat(tables.filter(t => !/^[a-z][a-z0-9_]*$/.test(t.nom)).map(t => t.nom)).join(', '));
    const sansCommentaire = colonnes.filter(c => !c.commentaire && !/^(id|cree_le|modifie_le|nom|email|telephone|actif)$/.test(c.c) && !/_id$/.test(c.c));
    regle('12', 'Colonnes non évidentes commentées (comment on column)', !sansCommentaire.length, sansCommentaire.map(c => `${c.t}.${c.c}`).slice(0, 12).join(', '), true);
    regle('14', 'modifie_le sur chaque table modifiable', tables.every(t => col(t.nom).some(c => c.c === 'modifie_le')), tables.filter(t => !col(t.nom).some(c => c.c === 'modifie_le')).map(t => t.nom).join(', '), true);
    regle('13', 'Clés en uuid', !colonnes.some(c => c.c === 'id' && c.type !== 'uuid'), colonnes.filter(c => c.c === 'id' && c.type !== 'uuid').map(c => c.t).join(', '), true);

    console.log(`\nTables (${tables.length}) :`);
    tables.forEach(t => {
      console.log(`  ${t.nom}${t.commentaire ? ' — ' + t.commentaire : ''}`);
      col(t.nom).forEach(c => {
        const f = fks.find(x => x.t === t.nom && x.c === c.c);
        console.log(`    ${c.c} ${c.type}${c.requis ? ' not null' : ''}${pk.has(t.nom) && c.c === 'id' ? ' (clé)' : ''}${f ? ` → ${f.vers}` : ''}`);
      });
    });
  } finally {
    await requete(admin, `drop database if exists "${jetable}" with (force)`).catch(e => console.error('Base jetable non supprimée : ' + jetable + ' (' + e.message + ')'));
    console.log('\nRecette des migrations :');
    resultats.forEach(r => console.log(`  ${r.ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!r.ok && r.detail ? ' : ' + r.detail : ''}${r.recommande && !r.ok ? ' (recommandé)' : ''}`));
    const ko = resultats.filter(r => !r.ok && !r.recommande).length;
    console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme.');
    process.exitCode = ko ? 1 : 0;
  }
})().catch(e => { console.error(e.message); process.exit(1); });
