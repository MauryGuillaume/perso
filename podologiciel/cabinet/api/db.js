/* ==========================================================================
   db.js — connexions à PostgreSQL (petit pool), transactions, migrations
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { Client, lireChaine } = require('./pg');

class Pool {
  constructor(url, taille) { this.conf = lireChaine(url); this.taille = taille || 5; this.libres = []; this.total = 0; this.file = []; }

  async prendre() {
    const c = this.libres.pop();
    if (c) return c;
    if (this.total < this.taille) {
      this.total++;
      try { return await new Client(this.conf).connecter(); } catch (e) { this.total--; throw e; }
    }
    return new Promise(ok => this.file.push(ok));
  }
  rendre(c, casse) {
    if (casse) { c.fermer(); this.total--; const f = this.file.shift(); if (f) this.prendre().then(f); return; }
    const f = this.file.shift();
    if (f) f(c); else this.libres.push(c);
  }
  /** Une instruction ; les erreurs de PostgreSQL ont un code, celles du réseau non (connexion à jeter). */
  async requete(sql, valeurs) {
    const c = await this.prendre();
    let casse = false;
    try { return await c.requete(sql, valeurs); }
    catch (e) { casse = !e.code; throw e; }
    finally { this.rendre(c, casse); }
  }
  /** Lignes en objets JavaScript (types JSON : nombres, booléens, tableaux). */
  async lignes(sql, valeurs, c) {
    const r = await (c || this).requete(`select coalesce(json_agg(t), '[]') from (${sql}) t`, valeurs);
    return JSON.parse(r.lignes[0][0]);
  }
  async ligne(sql, valeurs, c) { return (await this.lignes(sql, valeurs, c))[0] || null; }
  /** fn(t) dans une transaction ; t.requete, t.lignes, t.ligne utilisent la même connexion. */
  async transaction(fn) {
    const c = await this.prendre();
    let casse = false;
    const t = { requete: (s, v) => c.requete(s, v), lignes: (s, v) => this.lignes(s, v, c), ligne: (s, v) => this.ligne(s, v, c) };
    try {
      await c.simple('begin');
      const r = await fn(t);
      await c.simple('commit');
      return r;
    } catch (e) {
      casse = !e.code;
      if (!casse) await c.simple('rollback').catch(() => { casse = true; });
      throw e;
    } finally { this.rendre(c, casse); }
  }
  fermer() { this.libres.forEach(c => c.fermer()); this.libres = []; }
}

/** Applique, dans l'ordre, les fichiers de migrations/ pas encore passés. */
async function migrer(pool, journaliser) {
  await pool.requete('create table if not exists migrations (nom text primary key, appliquee_le timestamptz not null default now())');
  const faites = new Set((await pool.lignes('select nom from migrations')).map(m => m.nom));
  const dossier = path.join(__dirname, 'migrations');
  for (const nom of fs.readdirSync(dossier).filter(f => f.endsWith('.sql')).sort()) {
    if (faites.has(nom)) continue;
    const sql = fs.readFileSync(path.join(dossier, nom), 'utf8');
    const c = await pool.prendre();
    try {
      await c.simple('begin;\n' + sql + `\n;insert into migrations (nom) values ('${nom.replace(/'/g, "''")}');\ncommit;`);
      (journaliser || console.log)('Migration appliquée : ' + nom);
    } catch (e) {
      await c.simple('rollback').catch(() => {});
      throw new Error('Migration ' + nom + ' : ' + e.message);
    } finally { pool.rendre(c); }
  }
}

module.exports = { Pool, migrer };
