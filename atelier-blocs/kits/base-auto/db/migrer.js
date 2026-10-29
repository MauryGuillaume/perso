/* db/migrer.js — crée la base et ses tables automatiquement (PostgreSQL)
   Kit « Base de données automatique » de l'Atelier de Blocs. À copier tel quel.

   Au démarrage du serveur :   await require('./db/migrer')();   (avant app.listen)
   En ligne de commande :      node db/migrer.js                  (ou npm run db:migrer)

   1. Si DB_CREER_BASE=1 : crée la base de DATABASE_URL si elle n'existe pas (droit CREATEDB requis).
   2. Applique, dans l'ordre de leur numéro, les fichiers db/migrations/NNNN_nom.sql pas encore appliqués,
      chacun dans une transaction, et les note dans la table schema_migrations.
   3. Un verrou empêche deux serveurs de migrer en même temps. Une migration déjà appliquée et modifiée
      depuis est signalée (on ne modifie jamais une migration appliquée : on en ajoute une nouvelle).

   Variables : DATABASE_URL (obligatoire), DB_CREER_BASE (0/1), DB_SSL (0/1), DB_SSL_STRICT (1 par défaut). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const DOSSIER = path.join(__dirname, 'migrations');
const VERROU = 727274;   // identifiant du verrou consultatif (pg_advisory_lock)

function options(url) {
  const ssl = process.env.DB_SSL === '1' ? { rejectUnauthorized: process.env.DB_SSL_STRICT !== '0' } : undefined;
  return { connectionString: url, ssl };
}

/** Crée la base si elle n'existe pas (en se connectant à la base « postgres » du même serveur). */
async function creerBaseSiAbsente(url) {
  const u = new URL(url);
  const nom = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!nom) throw new Error('DATABASE_URL ne précise pas le nom de la base.');
  u.pathname = '/postgres';
  const c = new Client(options(u.toString()));
  await c.connect();
  try {
    const r = await c.query('select 1 from pg_database where datname = $1', [nom]);
    if (!r.rowCount) {
      try {
        await c.query(`create database "${nom.replace(/"/g, '""')}"`);
        console.log(`[base] base « ${nom} » créée`);
      } catch (e) { if (e.code !== '42P04' && e.code !== '23505') throw e; }   // créée au même moment par un autre serveur
    }
  } finally { await c.end(); }
}

/** Fichiers de migration, triés par numéro : 0001_init.sql, 0002_factures.sql… */
function migrations() {
  if (!fs.existsSync(DOSSIER)) return [];
  return fs.readdirSync(DOSSIER).filter(f => /^\d+[_-].+\.sql$/i.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b))
    .map(f => {
      const sql = fs.readFileSync(path.join(DOSSIER, f), 'utf8');
      return { version: String(parseInt(f, 10)), fichier: f, sql, empreinte: crypto.createHash('sha256').update(sql).digest('hex') };
    });
}

async function migrer({ url = process.env.DATABASE_URL, creerBase = process.env.DB_CREER_BASE === '1', silencieux = false } = {}) {
  if (!url) throw new Error('DATABASE_URL manquante : la base ne peut pas être créée.');
  const dire = silencieux ? () => {} : m => console.log('[base] ' + m);
  if (creerBase) await creerBaseSiAbsente(url);
  const c = new Client(options(url));
  await c.connect();
  const appliquees = [];
  try {
    await c.query('select pg_advisory_lock($1)', [VERROU]);
    await c.query(`create table if not exists schema_migrations (
      version text primary key,
      fichier text not null,
      empreinte text not null,
      applique_le timestamptz not null default now())`);
    const faites = new Map((await c.query('select version, fichier, empreinte from schema_migrations')).rows.map(r => [r.version, r]));
    for (const m of migrations()) {
      const deja = faites.get(m.version);
      if (deja) {
        if (deja.empreinte !== m.empreinte) console.warn(`[base] attention : ${m.fichier} a changé depuis qu'il a été appliqué. Il n'est pas rejoué : ajoute plutôt une nouvelle migration.`);
        continue;
      }
      await c.query('begin');
      try {
        await c.query(m.sql);
        await c.query('insert into schema_migrations (version, fichier, empreinte) values ($1, $2, $3)', [m.version, m.fichier, m.empreinte]);
        await c.query('commit');
        appliquees.push(m.fichier);
        dire(`migration appliquée : ${m.fichier}`);
      } catch (e) {
        await c.query('rollback').catch(() => {});
        throw new Error(`Migration ${m.fichier} refusée, rien n'a été changé par ce fichier : ${e.message}`);
      }
    }
    dire(appliquees.length ? `${appliquees.length} migration(s) appliquée(s), base à jour` : 'base à jour');
    return appliquees;
  } finally {
    await c.query('select pg_advisory_unlock($1)', [VERROU]).catch(() => {});
    await c.end();
  }
}

module.exports = migrer;
module.exports.migrer = migrer;

if (require.main === module) {
  migrer().then(() => process.exit(0)).catch(e => { console.error('[base] ' + e.message); process.exit(1); });
}
