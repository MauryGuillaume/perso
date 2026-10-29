/* outils/schema-doc.js — documentation et contrôle d'un schéma SANS base de données (OUTIL DE DÉVELOPPEMENT)
   Kit « Bases de données » de l'Atelier de Blocs. Node 18+, sans dépendance.

   node outils/schema-doc.js db/migrations                 lit les fichiers .sql dans l'ordre, contrôle le modèle
   node outils/schema-doc.js db/migrations --sortie SCHEMA.md   écrit aussi la documentation (tableaux + diagramme Mermaid)

   Même lecture du SQL que l'Atelier (create table, alter table, create index, drop table, comment on),
   donc la documentation correspond à l'onglet « Base de données » de l'app.
   Code de sortie 0 = « Conforme », 1 = « Non conforme ». */
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const iSortie = args.indexOf('--sortie');
const sortie = iSortie >= 0 ? args[iSortie + 1] : '';
const entrees = args.filter((a, i) => !a.startsWith('--') && !(iSortie >= 0 && i === iSortie + 1));
if (!entrees.length) entrees.push('db/migrations');

/* ---------- Lecture du SQL (copie de ab-bases.js de l'Atelier) ---------- */
const TYPES_SQL = [[/^timestamp(\(\d+\))?\s+with\s+time\s+zone$|^timestamptz/, 'timestamptz'], [/^timestamp/, 'timestamptz'], [/^(character varying|varchar)\s*\((\d+)\)/, m => `varchar(${m[2]})`],
  [/^(character varying|varchar)$/, 'text'], [/^(big)?serial$/, m => m[1] ? 'bigint' : 'integer'], [/^(int|int4|integer|smallint|int2)$/, 'integer'], [/^(bigint|int8)$/, 'bigint'],
  [/^(double precision|real|float\d?)$/, 'numeric'], [/^(numeric|decimal)\s*(\([^)]*\))?$/, m => 'numeric' + (m[2] || '').replace(/\s/g, '')], [/^(bool|boolean)$/, 'boolean'],
  [/^json(b)?$/, 'jsonb'], [/^citext$/, 'text']];
const typeSql = t => {
  const s = t.trim().toLowerCase().replace(/\s+/g, ' ');
  for (const [re, v] of TYPES_SQL) { const m = s.match(re); if (m) return typeof v === 'function' ? v(m) : v; }
  return s;
};
const sansGuillemets = n => String(n).trim().replace(/^"|"$/g, '').replace(/^public\./i, '').replace(/^"|"$/g, '');
const SUPP = { cascade: 'cascade', 'set null': 'set null', restrict: 'restrict', 'no action': 'restrict', 'set default': 'restrict' };

/** Découpe au premier niveau de parenthèses. */
function decouper(corps) {
  const out = [];
  let prof = 0, cour = '', guill = false;
  for (const ch of corps) {
    if (ch === "'" ) guill = !guill;
    if (!guill && ch === '(') prof++;
    if (!guill && ch === ')') prof--;
    if (!guill && ch === ',' && prof === 0) { out.push(cour.trim()); cour = ''; } else cour += ch;
  }
  if (cour.trim()) out.push(cour.trim());
  return out;
}

/** Une définition de colonne (« nom type not null default … references … ») → colonne, ou null. */
function colonneSql(l) {
  const c = l.match(/^("[^"]+"|\w+)\s+(.+)$/);
  if (!c) return null;
  const reste = c[2];
  const coupe = reste.search(/\s(not null|null|primary key|unique|default|references|check|constraint|generated|collate)\b/i);
  const type = coupe >= 0 ? reste.slice(0, coupe) : reste;
  const attrs = coupe >= 0 ? reste.slice(coupe) : '';
  const col = { nom: sansGuillemets(c[1]), type: typeSql(type), brut: type.trim().toLowerCase().replace(/\s+/g, ' '), requis: /not null|primary key/i.test(attrs), unique: /\bunique\b/i.test(attrs), cle: /primary key/i.test(attrs), defaut: '', reference: '', surSuppression: 'restrict' };
  const def = attrs.match(/default\s+((?:'[^']*'|\([^)]*\)|[^\s,])+(?:\(\))?)/i);
  if (def) col.defaut = def[1];
  const ref = attrs.match(/references\s+([\w."]+)\s*(?:\(([^)]+)\))?(?:.*on delete (cascade|set null|restrict|no action|set default))?/i);
  if (ref && !/^auth\./i.test(ref[1])) Object.assign(col, { reference: sansGuillemets(ref[1].split('.').pop()) + '.' + sansGuillemets(ref[2] || 'id'), surSuppression: SUPP[(ref[3] || 'restrict').toLowerCase()] });
  if (ref && /^auth\./i.test(ref[1])) col.description = 'Compte utilisateur (auth.users)';
  return col;
}

/** Découpe un script en instructions (les « ; » dans les textes et les corps $$…$$ ne comptent pas). */
function instructions(sql) {
  const out = [];
  let cour = '', guill = false;
  for (const ch of sql) {
    if (ch === "'") guill = !guill;
    if (ch === ';' && !guill) { if (cour.trim()) out.push(cour.trim()); cour = ''; } else cour += ch;
  }
  if (cour.trim()) out.push(cour.trim());
  return out;
}

/** Lit un script SQL entier, dans l'ordre : create table, puis les migrations suivantes
    (alter table add/drop/rename column, add constraint foreign key, create index, drop table, comment on). */
const schemaDepuisSql = function (texte) {
  const sql = String(texte).replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, "''");
  const tables = [];
  const table = n => tables.find(x => x.nom === sansGuillemets(String(n).split('.').pop()));
  const NOM = '((?:"[^"]+"|[\\w]+)(?:\\.(?:"[^"]+"|\\w+))?)';
  const lienEtranger = (t, fk) => {
    const col = t.colonnes.find(c => c.nom === sansGuillemets(fk[1].split(',')[0]));
    if (col) Object.assign(col, { reference: sansGuillemets(fk[2].split('.').pop()) + '.' + sansGuillemets(fk[3].split(',')[0]), surSuppression: SUPP[(fk[4] || 'restrict').toLowerCase()] });
  };
  const RE_FK = /foreign key \(([^)]+)\) references ([\w."]+)\s*\(([^)]+)\)(?:.*on delete (cascade|set null|restrict|no action|set default))?/i;
  for (const brut of instructions(sql)) {
    const st = brut.replace(/\s+/g, ' ').trim();
    let m = st.match(new RegExp('^create (?:unlogged |temp |temporary )?table (?:if not exists )?' + NOM + '\\s*\\(', 'i'));
    if (m) {
      if (/^auth$/i.test(m[1].split('.')[0])) continue;
      const ouvre = st.indexOf('(', m[0].length - 1);
      let i = ouvre + 1, prof = 1;
      while (i < st.length && prof) { if (st[i] === '(') prof++; else if (st[i] === ')') prof--; i++; }
      const corps = st.slice(ouvre + 1, i - 1);
      const ancien = table(m[1]);
      if (ancien) tables.splice(tables.indexOf(ancien), 1);   // recréée plus loin dans le script
      const t = { nom: sansGuillemets(m[1].split('.').pop()), colonnes: [], index: [] };
      const cles = [];
      decouper(corps).forEach(ligne => {
        const l = ligne.trim();
        const pk = l.match(/^(?:constraint \S+ )?primary key \(([^)]+)\)/i);
        if (pk) { pk[1].split(',').forEach(c => cles.push(sansGuillemets(c))); return; }
        const uq = l.match(/^(?:constraint \S+ )?unique \(([^)]+)\)/i);
        if (uq) { t.index.push({ colonnes: uq[1].split(',').map(sansGuillemets).join(', '), unique: true }); return; }
        const fk = l.match(new RegExp('^(?:constraint \\S+ )?' + RE_FK.source, 'i'));
        if (fk) { lienEtranger(t, fk); return; }
        if (/^(constraint|check|exclude|like)\b/i.test(l)) return;
        const col = colonneSql(l);
        if (col) t.colonnes.push(col);
      });
      if (cles.length === 1) { const c = t.colonnes.find(x => x.nom === cles[0]); if (c) Object.assign(c, { cle: true, requis: true }); }
      else if (cles.length > 1) t.index.unshift({ colonnes: cles.join(', '), unique: true, cleComposee: true });
      tables.push(t);
      continue;
    }
    m = st.match(new RegExp('^alter table (?:if exists )?(?:only )?' + NOM + ' (.+)$', 'i'));
    if (m) {
      const t = table(m[1]);
      if (!t) continue;
      decouper(m[2]).forEach(action => {
        const a = action.trim();
        let x;
        if ((x = a.match(/^add (?:column )?(?:if not exists )?(?!constraint\b|primary\b|unique\b|foreign\b|check\b)(.+)$/i))) {
          const col = colonneSql(x[1]);
          if (col && !t.colonnes.some(c => c.nom === col.nom)) t.colonnes.push(col);
        } else if ((x = a.match(/^drop (?:column )?(?:if exists )?("[^"]+"|\w+)/i)) && !/^drop constraint/i.test(a)) {
          t.colonnes = t.colonnes.filter(c => c.nom !== sansGuillemets(x[1]));
        } else if ((x = a.match(/^rename (?:column )?("[^"]+"|\w+) to ("[^"]+"|\w+)/i))) {
          const c = t.colonnes.find(y => y.nom === sansGuillemets(x[1])); if (c) c.nom = sansGuillemets(x[2]);
        } else if ((x = a.match(/^rename to ("[^"]+"|\w+)/i))) {
          t.nom = sansGuillemets(x[1]);
        } else if ((x = a.match(/^alter (?:column )?("[^"]+"|\w+) (?:set data )?type ([^,]+?)(?: using .*)?$/i))) {
          const c = t.colonnes.find(y => y.nom === sansGuillemets(x[1])); if (c) c.type = typeSql(x[2]);
        } else if ((x = a.match(/^alter (?:column )?("[^"]+"|\w+) set not null/i))) {
          const c = t.colonnes.find(y => y.nom === sansGuillemets(x[1])); if (c) c.requis = true;
        } else if ((x = a.match(/^alter (?:column )?("[^"]+"|\w+) drop not null/i))) {
          const c = t.colonnes.find(y => y.nom === sansGuillemets(x[1])); if (c) c.requis = false;
        } else if ((x = a.match(/^alter (?:column )?("[^"]+"|\w+) set default (.+)$/i))) {
          const c = t.colonnes.find(y => y.nom === sansGuillemets(x[1])); if (c) c.defaut = x[2].trim();
        } else if ((x = a.match(new RegExp('^add (?:constraint \\S+ )?' + RE_FK.source, 'i')))) {
          lienEtranger(t, x);
        } else if ((x = a.match(/^add (?:constraint \S+ )?primary key \(([^)]+)\)/i))) {
          const cles = x[1].split(',').map(sansGuillemets);
          if (cles.length === 1) { const c = t.colonnes.find(y => y.nom === cles[0]); if (c) Object.assign(c, { cle: true, requis: true }); }
        } else if ((x = a.match(/^add (?:constraint \S+ )?unique \(([^)]+)\)/i))) {
          t.index.push({ colonnes: x[1].split(',').map(sansGuillemets).join(', '), unique: true });
        }
      });
      continue;
    }
    m = st.match(new RegExp('^create (unique )?index (?:concurrently )?(?:if not exists )?(?:\\S+ )?on (?:only )?' + NOM + '(?: using \\w+)? ?\\(([^)]+)\\)', 'i'));
    if (m) {
      const t = table(m[2]);
      const cols = m[3].split(',').map(c => sansGuillemets(c.trim().split(' ')[0])).join(', ');
      if (t && !t.index.some(i => i.colonnes === cols)) t.index.push({ colonnes: cols, unique: !!m[1] });
      continue;
    }
    m = st.match(new RegExp('^drop table (?:if exists )?' + NOM, 'i'));
    if (m) { const t = table(m[1]); if (t) tables.splice(tables.indexOf(t), 1); continue; }
    m = st.match(/^comment on table ([\w."]+) is '((?:[^']|'')*)'/i);
    if (m) { const t = table(m[1]); if (t) t.description = m[2].replace(/''/g, "'"); continue; }
    m = st.match(/^comment on column ([\w."]+)\.("[^"]+"|\w+) is '((?:[^']|'')*)'/i);
    if (m) { const t = table(m[1]); const c = t && t.colonnes.find(x => x.nom === sansGuillemets(m[2])); if (c) c.description = m[3].replace(/''/g, "'"); }
  }
  return tables;
};


/* ---------- Fichiers ---------- */
const fichiersSql = [];
for (const e of entrees) {
  const p = path.resolve(e);
  if (!fs.existsSync(p)) { console.error(`Introuvable : ${e}`); process.exit(2); }
  if (fs.statSync(p).isDirectory()) fs.readdirSync(p).filter(f => /\.sql$/i.test(f)).sort((x, y) => x.localeCompare(y, 'fr', { numeric: true })).forEach(f => fichiersSql.push(path.join(p, f)));
  else fichiersSql.push(p);
}
const sql = fichiersSql.map(f => fs.readFileSync(f, 'utf8')).join(';\n');
const tables = schemaDepuisSql(sql);
const brut = sql.replace(/--[^\n]*/g, '');

/* ---------- Contrôles ---------- */
const resultats = [];
const regle = (num, texte, fautes, recommande) => resultats.push({ num, texte, fautes: fautes || [], recommande });
const parTable = f => tables.flatMap(t => f(t) || []);
const indexe = (t, col) => t.colonnes.some(c => c.nom === col && (c.cle || c.unique)) || t.index.some(i => i.colonnes.split(',')[0].trim() === col);
regle('01', 'Au moins une table', tables.length ? [] : ['aucune table lue']);
regle('02', 'Migrations numérotées NNNN_nom.sql', fichiersSql.filter(f => !/^\d{3,4}_[a-z0-9_]+\.sql$/.test(path.basename(f))).map(f => path.basename(f)));
regle('03', 'Clé primaire sur chaque table', parTable(t => t.colonnes.some(c => c.cle) || t.index.some(i => i.cleComposee) ? [] : [t.nom]));
regle('04', 'Chaque clé étrangère a un index', parTable(t => t.colonnes.filter(c => c.reference && !indexe(t, c.nom)).map(c => `${t.nom}.${c.nom}`)));
regle('05', 'Chaque relation a un comportement à la suppression écrit (on delete)', parTable(t => t.colonnes.filter(c => c.reference && !new RegExp(`${c.nom}[^,;]*references[^,;]*on delete`, 'i').test(brut) && !new RegExp(`foreign key \\(\\s*"?${c.nom}"?\\s*\\)[^;]*on delete`, 'i').test(brut)).map(c => `${t.nom}.${c.nom}`)), true);
regle('06', 'Chaque table a une description (comment on table)', parTable(t => t.description ? [] : [t.nom]));
regle('07', 'Pas de nombre à virgule flottante (real, float, double)', parTable(t => t.colonnes.filter(c => /^(real|float\d?|double precision)$/.test(c.brut)).map(c => `${t.nom}.${c.nom} (${c.brut})`)));
regle('08', 'Dates-heures avec fuseau (timestamptz)', parTable(t => t.colonnes.filter(c => /^timestamp(\(\d\))?( without time zone)?$/.test(c.brut)).map(c => `${t.nom}.${c.nom}`)));
const nomOk = n => /^[a-z][a-z0-9_]*$/.test(n);
regle('09', 'Noms en minuscules avec _', parTable(t => [t.nom].concat(t.colonnes.map(c => `${t.nom}.${c.nom}`)).filter(n => !n.split('.').every(nomOk))));
regle('10', 'cree_le sur chaque table', parTable(t => t.index.some(i => i.cleComposee) || t.colonnes.some(c => c.nom === 'cree_le') ? [] : [t.nom]));
regle('11', 'Montants en numeric(12,2) (colonnes prix, montant, total, solde)', parTable(t => t.colonnes.filter(c => /(prix|montant|total|solde|tarif)/.test(c.nom) && !/^numeric\(\d+,2\)$|^(integer|bigint)$/.test(c.type)).map(c => `${t.nom}.${c.nom} (${c.type})`)), true);
regle('12', 'Colonnes non évidentes décrites (comment on column)', parTable(t => t.colonnes.filter(c => !c.description && !c.cle && !/^(nom|email|telephone|cree_le|modifie_le|actif|archive_le|note|titre|description|adresse|ville|code_postal|libelle)$/.test(c.nom) && !c.reference).map(c => `${t.nom}.${c.nom}`)), true);
regle('13', 'Clés en uuid', parTable(t => t.colonnes.filter(c => c.cle && c.type !== 'uuid').map(c => `${t.nom}.${c.nom} (${c.type})`)), true);
regle('14', 'Relations vers des tables qui existent', parTable(t => t.colonnes.filter(c => c.reference && !tables.some(x => x.nom === c.reference.split('.')[0])).map(c => `${t.nom}.${c.nom} → ${c.reference}`)));

/* ---------- Documentation ---------- */
function markdown() {
  const out = [`# Modèle de données`, '', `> Généré par \`outils/schema-doc.js\` (kit « Bases de données ») à partir de : ${fichiersSql.map(f => '`' + path.basename(f) + '`').join(', ')}.`, ''];
  out.push(`${tables.length} table(s) : ${tables.map(t => '`' + t.nom + '`').join(', ')}.`, '');
  out.push('```mermaid', 'erDiagram');
  tables.forEach(t => {
    out.push(`  ${t.nom} {`);
    t.colonnes.forEach(c => out.push(`    ${c.type.replace(/[^a-z0-9_]/gi, '_')} ${c.nom}${c.cle ? ' PK' : c.reference ? ' FK' : c.unique ? ' UK' : ''}`));
    out.push('  }');
  });
  tables.forEach(t => t.colonnes.filter(c => c.reference).forEach(c => out.push(`  ${c.reference.split('.')[0]} ||--o{ ${t.nom} : "${c.nom}"`)));
  out.push('```', '');
  const esc = s => String(s || '').replace(/\|/g, '\\|');
  tables.forEach(t => {
    out.push(`## \`${t.nom}\``, '');
    if (t.description) out.push(t.description, '');
    out.push('| Colonne | Type | Obligatoire | Défaut | Unique | Lien (on delete) | Description |', '| --- | --- | --- | --- | --- | --- | --- |');
    t.colonnes.forEach(c => out.push(`| \`${c.nom}\`${c.cle ? ' 🔑' : ''} | ${esc(c.type)} | ${c.requis ? 'oui' : ''} | ${esc(c.defaut)} | ${c.unique ? 'oui' : ''} | ${c.reference ? `${c.reference} (${c.surSuppression})` : ''} | ${esc(c.description)} |`));
    if (t.index.length) out.push('', 'Index : ' + t.index.map(i => `\`${i.colonnes}\`${i.unique ? ' (unique)' : ''}`).join(', '));
    out.push('');
  });
  return out.join('\n');
}
if (sortie) fs.writeFileSync(sortie, markdown());

console.log(`Modèle de données — ${fichiersSql.length} fichier(s), ${tables.length} table(s)\n`);
tables.forEach(t => console.log(`  ${t.nom.padEnd(28)} ${String(t.colonnes.length).padStart(3)} colonnes${t.description ? '  ' + t.description : ''}`));
console.log('');
resultats.forEach(r => {
  const ok = !r.fautes.length;
  console.log(`  ${ok ? '✓' : r.recommande ? '!' : '✗'} ${r.num} ${r.texte}${!ok ? ' : ' + r.fautes.slice(0, 6).join(', ') + (r.fautes.length > 6 ? ` … (+${r.fautes.length - 6})` : '') : ''}${!ok && r.recommande ? ' (recommandé)' : ''}`);
});
const ko = resultats.filter(r => r.fautes.length && !r.recommande).length;
if (sortie) console.log(`\nDocumentation écrite : ${sortie}`);
console.log(ko ? `\nNon conforme : ${ko} règle(s) obligatoire(s) en échec.` : '\nConforme (vérifie ensuite sur une vraie base avec le kit « Base de données automatique » : verifier-base.js).');
process.exitCode = ko ? 1 : 0;
