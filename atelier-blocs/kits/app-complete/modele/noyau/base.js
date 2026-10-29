/* noyau/base.js — la base PostgreSQL : création automatique, migrations, connexions, requêtes paramétrées.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier.

   Au démarrage : crée la base si DB_CREER_BASE=1, applique noyau/migrations (tables du socle : utilisateurs,
   sessions, journal, reglages) puis db/migrations (tables de l'app), chaque fichier dans une transaction, sous verrou.
   Ensuite : base.requete(sql, params), base.une(sql, params), base.transaction(async client => …).
   Jamais de SQL construit par concaténation de valeurs : toujours $1, $2…  Pour un nom de table ou de colonne : base.ident(). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool, Client } = require('pg');
const env = require('./env');

const RACINE = path.join(__dirname, '..');
const DOSSIERS = [
  { dossier: path.join(__dirname, 'migrations'), prefixe: 'socle-' },   // tables du kit
  { dossier: path.join(RACINE, 'db', 'migrations'), prefixe: '' }       // tables de l'app
];
const VERROU = 727274;
let pool = null;

const sslDe = () => env.get('DB_SSL') ? { rejectUnauthorized: env.get('DB_SSL_STRICT') } : undefined;

/** Identifiant SQL entre guillemets (nom de table ou de colonne déjà validé). */
const ident = n => '"' + String(n).replace(/"/g, '""') + '"';

async function creerBaseSiAbsente(url) {
  const u = new URL(url);
  const nom = decodeURIComponent(u.pathname.replace(/^\//, ''));
  if (!nom) throw new Error('DATABASE_URL ne précise pas le nom de la base.');
  u.pathname = '/postgres';
  const c = new Client({ connectionString: u.toString(), ssl: sslDe() });
  await c.connect();
  try {
    if (!(await c.query('select 1 from pg_database where datname = $1', [nom])).rowCount) {
      try { await c.query(`create database ${ident(nom)}`); console.log(`[base] base « ${nom} » créée`); }
      catch (e) { if (e.code !== '42P04' && e.code !== '23505') throw e; }
    }
  } finally { await c.end(); }
}

/** Toutes les migrations, dans l'ordre : celles du socle puis celles de l'app. */
function migrations() {
  const out = [];
  for (const { dossier, prefixe } of DOSSIERS) {
    if (!fs.existsSync(dossier)) continue;
    fs.readdirSync(dossier).filter(f => /^\d+[_-].+\.sql$/i.test(f))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b))
      .forEach(f => {
        const sql = fs.readFileSync(path.join(dossier, f), 'utf8');
        out.push({ version: prefixe + String(parseInt(f, 10)), fichier: (prefixe ? 'noyau/' : '') + f, sql, empreinte: crypto.createHash('sha256').update(sql).digest('hex') });
      });
  }
  return out;
}

/** Crée la base et applique les migrations manquantes. Renvoie la liste des fichiers appliqués. */
async function migrer({ url = env.get('DATABASE_URL'), creerBase = env.get('DB_CREER_BASE'), silencieux = false } = {}) {
  const dire = silencieux ? () => {} : m => console.log('[base] ' + m);
  if (creerBase) await creerBaseSiAbsente(url);
  const c = new Client({ connectionString: url, ssl: sslDe() });
  await c.connect();
  const appliquees = [];
  try {
    await c.query('select pg_advisory_lock($1)', [VERROU]);
    await c.query(`create table if not exists schema_migrations (version text primary key, fichier text not null,
      empreinte text not null, applique_le timestamptz not null default now())`);
    const faites = new Map((await c.query('select version, empreinte from schema_migrations')).rows.map(r => [r.version, r.empreinte]));
    for (const m of migrations()) {
      if (faites.has(m.version)) {
        if (faites.get(m.version) !== m.empreinte) console.warn(`[base] attention : ${m.fichier} a changé depuis qu'il a été appliqué ; il n'est pas rejoué (ajoute une nouvelle migration).`);
        continue;
      }
      await c.query('begin');
      try {
        await c.query(m.sql);
        await c.query('insert into schema_migrations (version, fichier, empreinte) values ($1, $2, $3)', [m.version, m.fichier, m.empreinte]);
        await c.query('commit');
        appliquees.push(m.fichier);
        dire('migration appliquée : ' + m.fichier);
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

function demarrer() {
  if (!pool) {
    pool = new Pool({ connectionString: env.get('DATABASE_URL'), ssl: sslDe(), max: env.get('DB_POOL_MAX'), idleTimeoutMillis: 30000 });
    pool.on('error', e => console.error('[base] connexion perdue : ' + e.message));
  }
  return pool;
}
const requete = (sql, params) => demarrer().query(sql, params);
const une = async (sql, params) => (await requete(sql, params)).rows[0] || null;
const lignes = async (sql, params) => (await requete(sql, params)).rows;
/** Plusieurs requêtes tout ou rien : fn reçoit un client avec .query(sql, params). */
async function transaction(fn) {
  const c = await demarrer().connect();
  try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; }
  catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  finally { c.release(); }
}
const arreter = async () => { if (pool) { const p = pool; pool = null; await p.end(); } };

module.exports = { migrer, migrations, requete, une, lignes, transaction, ident, arreter, demarrer };

if (require.main === module) {
  try { env.declarer(require('../app/app.js').variables || []); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  const err = env.charger();
  if (err.length) { console.error('[base] ' + err.join('\n[base] ')); process.exit(1); }
  migrer().then(() => process.exit(0)).catch(e => { console.error('[base] ' + e.message); process.exit(1); });
}
