/* noyau/admin.js — API d'administration : état, données (tableur), comptes, journal, RGPD, sauvegarde, réglages.
   Kit « App complète » de l'Atelier de Blocs. PRÊT ET TESTÉ : ne pas modifier.

   Réservée au rôle admin (session) ou à l'Atelier de Blocs (clé ADMIN_API_KEY). Chaque modification est journalisée.
   Les tables, colonnes, clés et commentaires sont lus dans la base elle-même : une nouvelle migration apparaît sans
   rien coder. app/app.js → tables précise les libellés, les colonnes masquées et les tables en lecture seule. */
'use strict';
const base = require('./base');
const env = require('./env');
const journal = require('./journal');
const comptes = require('./comptes');
const { erreur } = require('./http');

const CACHEES = new Set(['schema_migrations', 'sessions', 'jetons']);
const SOCLE_LECTURE_SEULE = new Set(['utilisateurs', 'journal', 'reglages']);   // gérées par leurs écrans dédiés
const SENSIBLE = /(^|_)(mdp|password|secret|token|jeton|hash)(_|$)/i;
const AFFICHAGE = ['nom', 'libelle', 'titre', 'intitule', 'email', 'raison_sociale', 'reference', 'numero', 'code'];
const ADMIN = { role: 'admin' };
const demarreLe = new Date();

let cache = null, cacheLe = 0;
/** Schéma réel de la base (mis en cache 20 s). */
async function schema(app, forcer) {
  if (cache && !forcer && Date.now() - cacheLe < 20000) return cache;
  const conf = (app && app.tables) || {};
  const tables = await base.lignes(`select c.relname as nom, obj_description(c.oid, 'pg_class') as description, c.reltuples::bigint as estimation
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by c.relname`);
  const colonnes = await base.lignes(`select c.table_name as t, c.column_name as nom, c.data_type as type, c.udt_name as udt, c.is_nullable = 'YES' as nullable,
      c.column_default as defaut, c.is_generated = 'ALWAYS' or c.is_identity = 'YES' as generee, c.character_maximum_length as longueur,
      col_description(format('public.%I', c.table_name)::regclass, c.ordinal_position) as description
    from information_schema.columns c where c.table_schema = 'public' order by c.table_name, c.ordinal_position`);
  const cles = await base.lignes(`select con.conrelid::regclass::text as t, con.contype as genre, array_agg(a.attname::text order by k.n) as colonnes,
      con.confrelid::regclass::text as vers, (select array_agg(a2.attname::text order by k2.n) from unnest(con.confkey) with ordinality k2(att, n)
        join pg_attribute a2 on a2.attrelid = con.confrelid and a2.attnum = k2.att) as vers_colonnes,
      con.confdeltype as supp, pg_get_constraintdef(con.oid) as def
    from pg_constraint con cross join lateral unnest(con.conkey) with ordinality k(att, n)
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.att
    where con.connamespace = 'public'::regnamespace and con.contype in ('p', 'f', 'u', 'c') group by con.oid`);
  const index = await base.lignes(`select i.indrelid::regclass::text as t, array_agg(a.attname::text order by k.n) as colonnes
    from pg_index i cross join lateral unnest(i.indkey) with ordinality k(att, n) join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.att
    where i.indrelid::regclass::text in (select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') group by i.indexrelid, i.indrelid`);
  const out = {};
  for (const t of tables) {
    if (CACHEES.has(t.nom)) continue;
    const c = conf[t.nom] || {};
    const pk = cles.find(k => k.t === t.nom && k.genre === 'p');
    const fks = cles.filter(k => k.t === t.nom && k.genre === 'f');
    const checks = cles.filter(k => k.t === t.nom && k.genre === 'c');
    const cols = colonnes.filter(x => x.t === t.nom).map(x => {
      const fk = fks.find(f => f.colonnes.length === 1 && f.colonnes[0] === x.nom);
      const choix = checks.map(k => (k.def.match(new RegExp(`\\(+${x.nom}\\s*=\\s*ANY\\s*\\(+ARRAY\\[(.+?)\\]`, 'i')) || [])[1]).find(Boolean);
      return {
        nom: x.nom, type: x.udt === 'numeric' ? 'numeric' : x.type, udt: x.udt, obligatoire: !x.nullable && !x.defaut && !x.generee,
        nullable: x.nullable, defaut: x.defaut, description: x.description || '', longueur: x.longueur,
        cle: !!(pk && pk.colonnes.includes(x.nom)), unique: cles.some(k => k.t === t.nom && k.genre === 'u' && k.colonnes.length === 1 && k.colonnes[0] === x.nom),
        lien: fk ? { table: fk.vers.replace(/^public\./, '').replace(/"/g, ''), colonne: fk.vers_colonnes[0], suppression: { a: 'aucune action', r: 'interdire', c: 'supprimer aussi', n: 'vider le lien', d: 'valeur par défaut' }[fk.supp] } : null,
        choix: choix ? choix.split(',').map(v => v.trim().replace(/^'(.*)'::.*$/, '$1').replace(/^'(.*)'$/, '$1')) : null,
        masquee: (c.colonnesMasquees || []).includes(x.nom) || SENSIBLE.test(x.nom),
        lectureSeule: x.generee || (pk && pk.colonnes.includes(x.nom) && !!x.defaut) || /^(cree_le|modifie_le)$/.test(x.nom) || (c.lectureSeule === true) || (c.colonnesLectureSeule || []).includes(x.nom)
      };
    });
    out[t.nom] = {
      nom: t.nom, libelle: c.libelle || t.nom.replace(/_/g, ' ').replace(/^./, m => m.toUpperCase()), description: c.description || t.description || '',
      socle: SOCLE_LECTURE_SEULE.has(t.nom), lectureSeule: SOCLE_LECTURE_SEULE.has(t.nom) || c.lectureSeule === true || !pk || pk.colonnes.length !== 1,
      cle: pk && pk.colonnes.length === 1 ? pk.colonnes[0] : null, estimation: Math.max(0, Number(t.estimation)),
      affichage: (c.affichage) || (cols.find(x => AFFICHAGE.includes(x.nom)) || {}).nom || null,
      colonnes: cols, index: index.filter(i => i.t === t.nom).map(i => i.colonnes)
    };
  }
  cache = out; cacheLe = Date.now();
  return out;
}

/** Contrôles d'optimisation de la base (lus en direct). */
function optimisation(sch) {
  const out = [];
  for (const t of Object.values(sch)) {
    if (!t.cle && !t.colonnes.some(c => c.cle)) out.push({ niveau: 'erreur', texte: `${t.nom} : pas de clé primaire` });
    if (!t.description) out.push({ niveau: 'conseil', texte: `${t.nom} : table sans description (comment on table)` });
    if (!t.colonnes.some(c => c.nom === 'cree_le')) out.push({ niveau: 'conseil', texte: `${t.nom} : pas de colonne cree_le` });
    for (const c of t.colonnes) {
      if (c.lien && !t.index.some(i => i[0] === c.nom)) out.push({ niveau: 'erreur', texte: `${t.nom}.${c.nom} : clé étrangère sans index (lenteurs)` });
      if (c.type === 'timestamp without time zone') out.push({ niveau: 'erreur', texte: `${t.nom}.${c.nom} : date-heure sans fuseau` });
      if (/^(real|double precision)$/.test(c.type)) out.push({ niveau: 'erreur', texte: `${t.nom}.${c.nom} : nombre à virgule flottante (argent : numeric)` });
    }
  }
  return out;
}

function table(sch, nom) {
  const t = sch[nom];
  if (!t) throw erreur(404, `Table inconnue : ${nom}`);
  return t;
}
const visibles = t => t.colonnes.filter(c => !c.masquee);
const qi = base.ident;

/** Valeur reçue de l'écran → valeur pour PostgreSQL (vide = null ; JSON pour jsonb). */
function valeur(col, v) {
  if (v === undefined) return undefined;
  if (v === '' && col.type !== 'text' && col.type !== 'character varying') return null;
  if ((col.type === 'jsonb' || col.type === 'json') && v !== null && typeof v !== 'string') return JSON.stringify(v);
  if (col.type === 'ARRAY' && Array.isArray(v)) return v;
  return v;
}

function routes(r, app) {
  /* ---------- État ---------- */
  r.get('/api/admin/etat', ADMIN, async (req, ctx) => {
    const sch = await schema(app, true);
    const pg = await base.une('select version() as version, pg_database_size(current_database()) as taille, current_database() as nom');
    const migrations = await base.lignes('select version, fichier, applique_le from schema_migrations order by applique_le, version');
    const modifiees = base.migrations().filter(m => migrations.some(x => x.version === m.version)).length;
    const comptes_ = await base.une("select count(*)::int as total, count(*) filter (where role = 'admin' and actif)::int as admins, count(*) filter (where actif)::int as actifs from utilisateurs");
    const variables = env.etat();
    const alertes = [];
    if (await comptes.adminDefautActif()) alertes.push({ niveau: 'erreur', texte: 'Le compte « admin » a encore le mot de passe par défaut « adminadmin » : connecte-toi à l’app pour le changer (ou génère un mot de passe provisoire dans Comptes).' });
    if (!comptes_.admins) alertes.push({ niveau: 'conseil', texte: 'Aucun compte admin dans l’app : crée-le depuis l’Atelier (Comptes) ou par la première installation.' });
    if (env.get('APP_ENV') !== 'production') alertes.push({ niveau: 'conseil', texte: 'APP_ENV n’est pas « production » : HTTPS et cookies sécurisés ne sont pas imposés.' });
    variables.filter(v => v.obligatoire && !v.definie).forEach(v => alertes.push({ niveau: 'erreur', texte: `Variable ${v.cle} absente` }));
    return {
      app: { nom: await comptes.nomApp(app), version: app.version || '1.0.0', kit: require('../package.json').kitAppComplete || null, env: env.get('APP_ENV'), url: env.get('APP_URL'),
        demarre_le: demarreLe, node: process.version },
      base: { nom: pg.nom, version: pg.version.split(' ').slice(0, 2).join(' '), taille: Number(pg.taille), tables: Object.keys(sch).length,
        lignes: Object.values(sch).reduce((s, t) => s + t.estimation, 0) },
      migrations: migrations.map(m => Object.assign(m, { socle: m.version.startsWith('socle-') })), migrationsConnues: base.migrations().length, migrationsAppliquees: modifiees,
      comptes: comptes_, variables, alertes, optimisation: optimisation(sch)
    };
  });

  /* ---------- Données : le tableur ---------- */
  r.get('/api/admin/tables', ADMIN, async () => {
    const sch = await schema(app, true);
    const comptes_ = await Promise.all(Object.values(sch).map(t => t.estimation < 100000
      ? base.une(`select count(*)::int as n from ${qi(t.nom)}`).then(x => [t.nom, x.n]) : Promise.resolve([t.nom, t.estimation])));
    const n = Object.fromEntries(comptes_);
    return { tables: Object.values(sch).map(t => Object.assign({}, t, { lignes: n[t.nom], colonnes: visibles(t) })) };
  });

  r.get('/api/admin/tables/:table', ADMIN, async (req, ctx) => {
    const t = table(await schema(app), ctx.params.table);
    const cols = visibles(t);
    const q = ctx.query;
    const par = Math.min(200, Math.max(1, parseInt(q.par, 10) || 50));
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const where = [], params = [];
    if (q.q && String(q.q).trim()) {
      params.push('%' + String(q.q).trim().replace(/[\\%_]/g, m => '\\' + m) + '%');
      const textes = cols.filter(c => /^(text|character varying|uuid|USER-DEFINED|integer|bigint|numeric|date)$/.test(c.type));
      if (textes.length) where.push('(' + textes.map(c => `${qi(c.nom)}::text ilike $${params.length}`).join(' or ') + ')');
    }
    for (const [k, v] of Object.entries(q)) {
      const m = /^f\.(.+)$/.exec(k);
      if (!m) continue;
      const c = cols.find(x => x.nom === m[1]);
      if (!c) throw erreur(400, `Colonne inconnue : ${m[1]}`);
      if (v === '∅') where.push(`${qi(c.nom)} is null`);
      else { params.push(String(v)); where.push(`${qi(c.nom)}::text = $${params.length}`); }
    }
    const tri = cols.find(c => c.nom === q.tri) || cols.find(c => c.nom === 'cree_le') || cols.find(c => c.cle) || cols[0];
    const sens = q.sens === 'asc' ? 'asc' : q.sens === 'desc' ? 'desc' : (tri && tri.nom === 'cree_le' ? 'desc' : 'asc');
    const clause = where.length ? ' where ' + where.join(' and ') : '';
    const total = (await base.une(`select count(*)::int as n from ${qi(t.nom)}${clause}`, params)).n;
    params.push(par, (page - 1) * par);
    const lignes = await base.lignes(`select ${cols.map(c => qi(c.nom)).join(', ')} from ${qi(t.nom)}${clause}
      order by ${qi(tri.nom)} ${sens} nulls last${t.cle && t.cle !== tri.nom ? ', ' + qi(t.cle) : ''} limit $${params.length - 1} offset $${params.length}`, params);
    // Libellés des lignes liées (ex. client_id → « Mme Martin »)
    const sch = await schema(app);
    const liens = {};
    for (const c of cols.filter(x => x.lien)) {
      const cible = sch[c.lien.table];
      const ids = [...new Set(lignes.map(l => l[c.nom]).filter(v => v != null))];
      if (!cible || !cible.affichage || !ids.length) continue;
      const rows = await base.lignes(`select ${qi(c.lien.colonne)}::text as id, ${qi(cible.affichage)}::text as libelle from ${qi(cible.nom)} where ${qi(c.lien.colonne)}::text = any($1)`, [ids.map(String)]);
      liens[c.nom] = Object.fromEntries(rows.map(x => [x.id, x.libelle]));
    }
    return { table: Object.assign({}, t, { colonnes: cols }), total, page, par, tri: tri.nom, sens, lignes, liens };
  });

  /** Choix pour un lien : les lignes de la table liée (id + libellé), avec recherche. */
  r.get('/api/admin/tables/:table/choix', ADMIN, async (req, ctx) => {
    const t = table(await schema(app), ctx.params.table);
    const cleCol = t.cle || 'id';
    const aff = t.affichage || cleCol;
    const params = [];
    let where = '';
    if (ctx.query.q) { params.push('%' + String(ctx.query.q).trim() + '%'); where = ` where ${qi(aff)}::text ilike $1`; }
    return { choix: await base.lignes(`select ${qi(cleCol)}::text as id, ${qi(aff)}::text as libelle from ${qi(t.nom)}${where} order by 2 limit 50`, params) };
  });

  function colonnesEcrites(t, corps, creation) {
    const out = [];
    for (const [k, v] of Object.entries(corps || {})) {
      const c = t.colonnes.find(x => x.nom === k);
      if (!c) throw erreur(400, `Colonne inconnue : ${k}`);
      if (c.masquee || c.lectureSeule) { if (creation && c.cle && !c.defaut) out.push([c, valeur(c, v)]); else continue; }
      else out.push([c, valeur(c, v)]);
    }
    return out;
  }
  const modifiable = t => { if (t.lectureSeule) throw erreur(403, t.socle ? `La table ${t.nom} se gère dans son écran dédié.` : `La table ${t.nom} est en lecture seule.`); };

  r.post('/api/admin/tables/:table', ADMIN, async (req, ctx) => {
    const sch = await schema(app);
    const t = table(sch, ctx.params.table); modifiable(t);
    const cols = colonnesEcrites(t, ctx.corps, true);
    const manquent = t.colonnes.filter(c => c.obligatoire && !c.lectureSeule && !c.masquee && !cols.some(([x, v]) => x.nom === c.nom && v !== null && v !== ''));
    if (manquent.length) throw erreur(400, 'À remplir : ' + manquent.map(c => c.nom).join(', '));
    const ligne = await base.une(cols.length
      ? `insert into ${qi(t.nom)} (${cols.map(([c]) => qi(c.nom)).join(', ')}) values (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) returning ${visibles(t).map(c => qi(c.nom)).join(', ')}`
      : `insert into ${qi(t.nom)} default values returning ${visibles(t).map(c => qi(c.nom)).join(', ')}`, cols.map(([, v]) => v));
    await journal(ctx, 'donnees_ajoutees', `${t.nom}:${ligne[t.cle]}`, { colonnes: cols.map(([c]) => c.nom) });
    return { ligne };
  });

  r.patch('/api/admin/tables/:table/:id', ADMIN, async (req, ctx) => {
    const t = table(await schema(app), ctx.params.table); modifiable(t);
    const cols = colonnesEcrites(t, ctx.corps, false);
    if (!cols.length) throw erreur(400, 'Rien à modifier.');
    const avant = await base.une(`select ${cols.map(([c]) => qi(c.nom)).join(', ')} from ${qi(t.nom)} where ${qi(t.cle)}::text = $1`, [ctx.params.id]);
    if (!avant) throw erreur(404, 'Ligne introuvable (supprimée entre-temps ?).');
    const ligne = await base.une(`update ${qi(t.nom)} set ${cols.map(([c], i) => `${qi(c.nom)} = $${i + 2}`).join(', ')} where ${qi(t.cle)}::text = $1
      returning ${visibles(t).map(c => qi(c.nom)).join(', ')}`, [ctx.params.id, ...cols.map(([, v]) => v)]);
    await journal(ctx, 'donnees_modifiees', `${t.nom}:${ctx.params.id}`, { avant, apres: Object.fromEntries(cols.map(([c, v]) => [c.nom, v])) });
    return { ligne };
  });

  r.delete('/api/admin/tables/:table/:id', ADMIN, async (req, ctx) => {
    const t = table(await schema(app), ctx.params.table); modifiable(t);
    const avant = await base.une(`delete from ${qi(t.nom)} where ${qi(t.cle)}::text = $1 returning ${visibles(t).map(c => qi(c.nom)).join(', ')}`, [ctx.params.id]);
    if (!avant) throw erreur(404, 'Ligne introuvable.');
    await journal(ctx, 'donnees_supprimees', `${t.nom}:${ctx.params.id}`, { avant });
    return { ok: true };
  });

  r.get('/api/admin/tables/:table/csv', ADMIN, async (req, ctx) => {
    const t = table(await schema(app), ctx.params.table);
    const cols = visibles(t);
    const lignes = await base.lignes(`select ${cols.map(c => qi(c.nom)).join(', ')} from ${qi(t.nom)} order by 1 limit 100000`);
    const cell = v => { if (v == null) return ''; const s = v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[";\n\r]/.test(s) || /^[=+\-@]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    await journal(ctx, 'donnees_exportees', t.nom, { lignes: lignes.length });
    ctx.res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${t.nom}.csv"`, 'Cache-Control': 'no-store' });
    ctx.res.end('﻿' + [cols.map(c => c.nom).join(';')].concat(lignes.map(l => cols.map(c => cell(l[c.nom])).join(';'))).join('\r\n'));
  });

  /* ---------- Comptes ---------- */
  const U = comptes.PUBLIC_UTILISATEUR;
  const roles = () => ['admin', 'utilisateur'].concat((app.roles || []).map(x => x.id || x));
  r.get('/api/admin/utilisateurs', ADMIN, async () => ({ utilisateurs: await base.lignes(`select ${U} from utilisateurs order by role = 'admin' desc, email`), roles: roles() }));

  r.post('/api/admin/utilisateurs', ADMIN, async (req, ctx) => {
    const email = comptes.controlerEmail(ctx.corps.email);
    const role = String(ctx.corps.role || 'utilisateur');
    if (!roles().includes(role)) throw erreur(400, `Rôle inconnu : ${role}`);
    const provisoire = ctx.corps.mdp ? null : comptes.mdpProvisoire();
    if (ctx.corps.mdp) comptes.controlerMdp(ctx.corps.mdp);
    const u = await base.une(`insert into utilisateurs (email, nom, role, mdp_hash, mdp_a_changer) values ($1, $2, $3, $4, $5)
      on conflict (email) do nothing returning ${U}`, [email, String(ctx.corps.nom || '').trim().slice(0, 120), role, await comptes.hacher(ctx.corps.mdp || provisoire), !!provisoire]);
    if (!u) throw erreur(409, 'Un compte existe déjà avec cet email.');
    await journal(ctx, 'compte_cree', email, { role });
    return { utilisateur: u, mdpProvisoire: provisoire };
  });

  async function dernierAdmin(id) {
    const r_ = await base.une("select count(*)::int as n from utilisateurs where role = 'admin' and actif and id <> $1", [id]);
    return r_.n === 0;
  }
  r.patch('/api/admin/utilisateurs/:id', ADMIN, async (req, ctx) => {
    const u = await base.une(`select ${U} from utilisateurs where id::text = $1`, [ctx.params.id]);
    if (!u) throw erreur(404, 'Compte introuvable.');
    const champs = {};
    if (ctx.corps.nom !== undefined) champs.nom = String(ctx.corps.nom).trim().slice(0, 120);
    if (ctx.corps.email !== undefined) champs.email = comptes.controlerEmail(ctx.corps.email);
    if (ctx.corps.role !== undefined) { if (!roles().includes(ctx.corps.role)) throw erreur(400, 'Rôle inconnu.'); champs.role = ctx.corps.role; }
    if (ctx.corps.actif !== undefined) champs.actif = !!ctx.corps.actif;
    if (u.role === 'admin' && (champs.role && champs.role !== 'admin' || champs.actif === false) && await dernierAdmin(u.id)) throw erreur(400, 'C’est le dernier compte admin : impossible de le retirer.');
    const cles = Object.keys(champs);
    if (!cles.length) throw erreur(400, 'Rien à modifier.');
    const apres = await base.une(`update utilisateurs set ${cles.map((k, i) => `${qi(k)} = $${i + 2}`).join(', ')} where id = $1 returning ${U}`, [u.id, ...cles.map(k => champs[k])]);
    if (champs.actif === false || champs.role) { await base.requete('delete from sessions where utilisateur_id = $1', [u.id]); await base.requete('delete from jetons where utilisateur_id = $1', [u.id]); }
    await journal(ctx, 'compte_modifie', u.email, champs);
    return { utilisateur: apres };
  });

  r.post('/api/admin/utilisateurs/:id/mdp', ADMIN, async (req, ctx) => {
    const provisoire = comptes.mdpProvisoire();
    const u = await base.une(`update utilisateurs set mdp_hash = $2, mdp_a_changer = true where id::text = $1 returning ${U}`, [ctx.params.id, await comptes.hacher(provisoire)]);
    if (!u) throw erreur(404, 'Compte introuvable.');
    { await base.requete('delete from sessions where utilisateur_id = $1', [u.id]); await base.requete('delete from jetons where utilisateur_id = $1', [u.id]); }
    await journal(ctx, 'mdp_reinitialise', u.email);
    return { utilisateur: u, mdpProvisoire: provisoire };
  });

  r.delete('/api/admin/utilisateurs/:id', ADMIN, async (req, ctx) => {
    const u = await base.une(`select ${U} from utilisateurs where id::text = $1`, [ctx.params.id]);
    if (!u) throw erreur(404, 'Compte introuvable.');
    if (u.role === 'admin' && await dernierAdmin(u.id)) throw erreur(400, 'C’est le dernier compte admin : impossible de le supprimer.');
    await base.requete('delete from utilisateurs where id = $1', [u.id]);
    await journal(ctx, 'compte_supprime', u.email);
    return { ok: true };
  });

  /* ---------- Journal ---------- */
  r.get('/api/admin/journal', ADMIN, async (req, ctx) => {
    const par = Math.min(200, parseInt(ctx.query.par, 10) || 50), page = Math.max(1, parseInt(ctx.query.page, 10) || 1);
    const where = [], params = [];
    if (ctx.query.action) { params.push(ctx.query.action); where.push(`action = $${params.length}`); }
    if (ctx.query.q) { params.push('%' + ctx.query.q + '%'); where.push(`(acteur ilike $${params.length} or cible ilike $${params.length})`); }
    const clause = where.length ? ' where ' + where.join(' and ') : '';
    const total = (await base.une(`select count(*)::int as n from journal${clause}`, params)).n;
    params.push(par, (page - 1) * par);
    return { total, page, par, lignes: await base.lignes(`select id, acteur, action, cible, detail, ip, cree_le from journal${clause} order by cree_le desc limit $${params.length - 1} offset $${params.length}`, params),
      actions: (await base.lignes('select distinct action from journal order by 1')).map(x => x.action) };
  });

  /* ---------- RGPD ---------- */
  async function donneesDe(email) {
    const sch = await schema(app);
    const out = {};
    const u = await base.une(`select ${U} from utilisateurs where email = $1`, [email]);
    if (u) out.utilisateurs = [u];
    for (const d of app.rgpd || []) {
      const t = sch[d.table];
      if (!t) continue;
      const cols = visibles(t).map(c => qi(c.nom)).join(', ');
      if (d.colonne === 'utilisateur_id' || (t.colonnes.find(c => c.nom === d.colonne) || {}).lien) { if (u) out[d.table] = await base.lignes(`select ${cols} from ${qi(t.nom)} where ${qi(d.colonne)} = $1`, [u.id]); }
      else out[d.table] = await base.lignes(`select ${cols} from ${qi(t.nom)} where lower(${qi(d.colonne)}::text) = $1`, [email]);
    }
    return { utilisateur: u, donnees: out };
  }
  r.get('/api/admin/rgpd', ADMIN, async (req, ctx) => {
    const email = comptes.controlerEmail(ctx.query.email);
    const r_ = await donneesDe(email);
    await journal(ctx, 'rgpd_export', email, { tables: Object.keys(r_.donnees) });
    return { email, exporte_le: new Date(), regles: app.rgpd || [], donnees: r_.donnees };
  });
  r.post('/api/admin/rgpd/supprimer', ADMIN, async (req, ctx) => {
    const email = comptes.controlerEmail(ctx.corps.email);
    if (ctx.corps.confirmer !== email) throw erreur(400, 'Recopie l’email pour confirmer.');
    const { utilisateur: u } = await donneesDe(email);
    const sch = await schema(app);
    const bilan = {};
    await base.transaction(async c => {
      for (const d of app.rgpd || []) {
        const t = sch[d.table];
        if (!t) continue;
        const parId = d.colonne === 'utilisateur_id' || (t.colonnes.find(x => x.nom === d.colonne) || {}).lien;
        if (parId && !u) continue;
        const cond = parId ? `${qi(d.colonne)} = $1` : `lower(${qi(d.colonne)}::text) = $1`;
        const p = [parId ? u.id : email];
        if (d.action === 'anonymiser') {
          const cols = (d.colonnes || [d.colonne]).filter(n => t.colonnes.some(x => x.nom === n));
          const res = await c.query(`update ${qi(t.nom)} set ${cols.map(n => { const col = t.colonnes.find(x => x.nom === n); return `${qi(n)} = ${col.nullable ? 'null' : "'anonyme'"}`; }).join(', ')} where ${cond}`, p);
          bilan[t.nom] = `${res.rowCount} anonymisée(s)`;
        } else {
          const res = await c.query(`delete from ${qi(t.nom)} where ${cond}`, p);
          bilan[t.nom] = `${res.rowCount} supprimée(s)`;
        }
      }
      if (u) {
        if (u.role === 'admin' && await dernierAdmin(u.id)) throw erreur(400, 'C’est le dernier compte admin : impossible de le supprimer.');
        await c.query('delete from utilisateurs where id = $1', [u.id]); bilan.utilisateurs = '1 supprimé';
      }
    });
    await journal(ctx, 'rgpd_suppression', email, bilan);
    return { email, bilan };
  });

  /* ---------- Sauvegarde lisible ---------- */
  r.get('/api/admin/sauvegarde', ADMIN, async (req, ctx) => {
    const sch = await schema(app, true);
    const tables = {};
    for (const t of Object.values(sch)) tables[t.nom] = await base.lignes(`select ${visibles(t).map(c => qi(c.nom)).join(', ')} from ${qi(t.nom)} order by 1 limit 200000`);
    await journal(ctx, 'sauvegarde', '', { tables: Object.keys(tables).length });
    ctx.res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="sauvegarde-${new Date().toISOString().slice(0, 10)}.json"` });
    ctx.res.end(JSON.stringify({ app: await comptes.nomApp(app), date: new Date(), note: 'Export lisible (sans mots de passe). La sauvegarde complète de la base se règle chez l’hébergeur.', tables }, null, 1));
  });

  /* ---------- Réglages partagés ---------- */
  r.get('/api/admin/reglages', ADMIN, async () => {
    const enBase = Object.fromEntries((await base.lignes('select cle, valeur from reglages')).map(x => [x.cle, x.valeur]));
    const decl = [{ cle: 'app_nom', libelle: 'Nom de l’app', type: 'texte' }].concat(app.reglages || []);
    return { reglages: decl.map(d => Object.assign({}, d, { valeur: enBase[d.cle] !== undefined ? enBase[d.cle] : (d.defaut !== undefined ? d.defaut : null),
      impose: d.cle === 'app_nom' && !!env.get('APP_NOM') })) };
  });
  r.put('/api/admin/reglages', ADMIN, async (req, ctx) => {
    const decl = [{ cle: 'app_nom' }].concat(app.reglages || []);
    for (const [k, v] of Object.entries(ctx.corps || {})) {
      if (!decl.some(d => d.cle === k)) throw erreur(400, `Réglage inconnu : ${k}`);
      await comptes.enregistrerReglage(k, v, ctx.utilisateur && ctx.utilisateur.id);
    }
    await journal(ctx, 'reglages_modifies', '', ctx.corps);
    return { ok: true };
  });
}

module.exports = { routes, schema, optimisation };
