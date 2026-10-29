/* ==========================================================================
   ab-bases.js — les BASES DE DONNÉES des apps
   Chaque app (créée ici ou existante) a une ou plusieurs bases (app.bases).
   Une base décrit toutes ses tables : colonnes, types, clés, relations,
   index, et pour Supabase les règles d'accès (RLS). On en tire :
   - le SQL de création (PostgreSQL ou Supabase), rejouable sans risque ;
   - la migration qui amène une base réelle au schéma voulu (comparaison) ;
   - l'import du schéma d'une base existante.
   La connexion à une base réelle passe par le serveur local (serveur.js) :
   les mots de passe ne sont jamais dans le navigateur.
   ========================================================================== */
(function () {
  const U = AB.u;
  const B = AB.bases = {};

  /** Types proposés : [type PostgreSQL, libellé]. */
  B.TYPES = [
    ['uuid', 'Identifiant (uuid)'], ['text', 'Texte'], ['varchar(255)', 'Texte court (255)'], ['integer', 'Nombre entier'],
    ['bigint', 'Grand entier'], ['numeric(12,2)', 'Montant (2 décimales)'], ['numeric', 'Nombre décimal'], ['boolean', 'Oui / non'],
    ['date', 'Date'], ['timestamptz', 'Date et heure'], ['time', 'Heure'], ['jsonb', 'JSON'], ['text[]', 'Liste de textes'], ['bytea', 'Binaire']
  ];
  B.MOTEURS = { supabase: 'Supabase (PostgreSQL + règles RLS)', postgres: 'PostgreSQL' };
  B.SUPPRESSION = { 'restrict': 'Interdire', 'cascade': 'Supprimer aussi', 'set null': 'Vider le lien' };
  const ACCES = () => AB.blocs.ACCES_TABLE;

  /** Nom SQL valide : minuscules, chiffres, _ */
  B.nomSql = s => U.slug(s).replace(/-/g, '_').replace(/^(\d)/, '_$1').slice(0, 63);
  const qi = n => '"' + String(n).replace(/"/g, '""') + '"';
  const ql = v => "'" + String(v).replace(/'/g, "''") + "'";

  B.nouvelleBase = (nom, moteur) => ({
    id: 'b-' + U.uuid().slice(0, 8), nom: nom || 'Base principale', moteur: moteur || 'supabase', description: '',
    conventions: { id: true, horodatage: true }, tables: []
  });
  B.nouvelleTable = nom => ({
    id: 't-' + U.uuid().slice(0, 8), nom: B.nomSql(nom || 'nouvelle_table'), description: '',
    proprietaire: false, acces: 'proprietaire', colonnes: [], index: []
  });
  B.nouvelleColonne = nom => ({ nom: B.nomSql(nom || 'colonne'), type: 'text', requis: false, unique: false, defaut: '', reference: '', surSuppression: 'restrict', description: '' });

  /** Bases d'une app (au moins une pour une app de la plateforme). */
  B.de = function (app) {
    app.bases = app.bases || [];
    if (!app.bases.length && app.origine === 'plateforme') app.bases.push(B.nouvelleBase('Base principale', 'supabase'));
    return app.bases;
  };

  /** Tables apportées par les blocs de l'app (dans la première base), en lecture seule. */
  B.tablesDesBlocs = function (app) {
    const out = [];
    (app.blocs || []).forEach(i => {
      const d = AB.blocs.get(i.bloc, i.version);
      if (!d) return;
      d.tables.forEach(t => {
        if (out.some(x => x.nom === t.nom)) return;
        const TYPES = { uuid: 'uuid', texte: 'text', 'texte-long': 'text', entier: 'integer', decimal: 'numeric', booleen: 'boolean', date: 'date', 'date-heure': 'timestamptz', json: 'jsonb' };
        out.push({
          id: 'bloc-' + t.nom, nom: t.nom, description: `Fournie par le bloc ${d.nom}`, bloc: d.nom, acces: t.acces || 'serveur', proprietaire: false, index: [],
          colonnes: (t.colonnes || []).filter(c => c[0] !== 'id' && c[0] !== 'cree_le').map(c => ({
            nom: c[0], type: TYPES[c[1]] || 'text', requis: /not null/i.test(c[2] || ''), unique: /unique/i.test(c[2] || ''),
            defaut: ((c[2] || '').match(/default\s+(.+)$/i) || [0, ''])[1], reference: '', surSuppression: 'restrict', description: ''
          }))
        });
      });
    });
    return out;
  };

  /** Toutes les colonnes d'une table, conventions comprises (id, utilisateur, horodatage). */
  B.colonnes = function (base, t) {
    const c = [];
    const conv = base.conventions || {};
    if (conv.id !== false && !t.colonnes.some(x => x.nom === 'id' || x.cle)) c.push({ nom: 'id', type: 'uuid', cle: true, requis: true, defaut: 'gen_random_uuid()', auto: true });
    if (t.proprietaire && base.moteur === 'supabase' && !t.colonnes.some(x => x.nom === 'utilisateur'))
      c.push({ nom: 'utilisateur', type: 'uuid', requis: true, defaut: 'auth.uid()', reference: 'auth.users.id', surSuppression: 'cascade', auto: true });
    t.colonnes.forEach(x => c.push(x));
    if (conv.horodatage !== false || t.bloc) {
      if (!t.colonnes.some(x => x.nom === 'cree_le')) c.push({ nom: 'cree_le', type: 'timestamptz', requis: true, defaut: 'now()', auto: true });
      if (conv.horodatage !== false && !t.bloc && !t.colonnes.some(x => x.nom === 'modifie_le')) c.push({ nom: 'modifie_le', type: 'timestamptz', requis: true, defaut: 'now()', auto: true });
    }
    return c;
  };

  /** Tables complètes d'une base : celles des blocs (première base seulement) puis celles dessinées. */
  B.tables = function (app, base) {
    const premiere = (app.bases || [])[0] === base;
    const blocs = premiere && base.moteur === 'supabase' ? B.tablesDesBlocs(app) : [];
    return blocs.filter(t => !base.tables.some(x => x.nom === t.nom)).concat(base.tables);
  };

  /* ======================= Vérification ======================= */
  B.verifier = function (app, base) {
    const err = [], tables = B.tables(app, base), noms = new Set();
    tables.forEach(t => {
      if (!/^[a-z_][a-z0-9_]*$/.test(t.nom)) err.push(`Table « ${t.nom} » : nom invalide (minuscules, chiffres et _).`);
      if (noms.has(t.nom)) err.push(`Deux tables s’appellent « ${t.nom} ».`);
      noms.add(t.nom);
      const cols = B.colonnes(base, t), nc = new Set();
      if (!cols.some(c => c.cle)) err.push(`Table « ${t.nom} » : pas de clé primaire (activez l’identifiant automatique ou cochez une colonne « clé »).`);
      cols.forEach(c => {
        if (!/^[a-z_][a-z0-9_]*$/.test(c.nom)) err.push(`${t.nom}.${c.nom} : nom de colonne invalide.`);
        if (nc.has(c.nom)) err.push(`${t.nom} : deux colonnes « ${c.nom} ».`);
        nc.add(c.nom);
      });
    });
    tables.forEach(t => B.colonnes(base, t).filter(c => c.reference && !c.auto && c.reference !== 'auth.users.id').forEach(c => {
      const [rt, rc] = c.reference.split('.');
      const cible = tables.find(x => x.nom === rt);
      if (!cible) err.push(`${t.nom}.${c.nom} : la table liée « ${rt} » n’existe pas.`);
      else if (!B.colonnes(base, cible).some(x => x.nom === (rc || 'id'))) err.push(`${t.nom}.${c.nom} : la colonne liée « ${c.reference} » n’existe pas.`);
    }));
    if (base.moteur === 'supabase') tables.filter(t => t.acces === 'proprietaire' || t.acces === 'lecture-proprietaire').forEach(t => {
      if (!B.colonnes(base, t).some(c => c.nom === 'utilisateur')) err.push(`Table « ${t.nom} » : l’accès « ${ACCES()[t.acces]} » demande l’option « Ligne liée à l’utilisateur connecté ».`);
    });
    return err;
  };

  /* ======================= SQL ======================= */

  function defColonne(c) {
    let s = `  ${qi(c.nom)} ${c.type}`;
    if (c.cle) s += ' primary key';
    if (c.requis && !c.cle) s += ' not null';
    if (c.unique && !c.cle) s += ' unique';
    if (c.defaut !== undefined && String(c.defaut).trim() !== '') s += ' default ' + String(c.defaut).trim();
    if (c.reference === 'auth.users.id') s += ' references auth.users(id) on delete cascade';
    return s;
  }
  const nomContrainte = (t, c) => `${t}_${c}_fkey`.slice(0, 63);

  /** Politiques RLS (Supabase) selon le mode d'accès. */
  function politiques(t) {
    const n = qi(t.nom), p = s => qi(`${t.nom}_${s}`.slice(0, 63));
    const drop = s => `drop policy if exists ${p(s)} on public.${n};\n`;
    switch (t.acces) {
      case 'proprietaire': return drop('proprietaire') + `create policy ${p('proprietaire')} on public.${n} for all to authenticated using (utilisateur = auth.uid()) with check (utilisateur = auth.uid());`;
      case 'lecture-proprietaire': return drop('lecture_proprietaire') + `create policy ${p('lecture_proprietaire')} on public.${n} for select to authenticated using (utilisateur = auth.uid());`;
      case 'insertion-publique': return drop('insertion') + `create policy ${p('insertion')} on public.${n} for insert to anon, authenticated with check (true);`;
      case 'lecture-publique': return drop('lecture') + `create policy ${p('lecture')} on public.${n} for select to anon, authenticated using (true);`;
      default: return `-- Accès « serveur » : aucune politique, seules les fonctions serveur (clé service) y accèdent.`;
    }
  }

  /** Ordre de création : une table après celles qu'elle référence (les cycles sont gérés par ALTER TABLE). */
  function ordonner(tables, base) {
    const reste = tables.slice(), out = [];
    while (reste.length) {
      const i = reste.findIndex(t => B.colonnes(base, t).every(c => !c.reference || c.auto || c.reference.split('.')[0] === t.nom || out.some(o => o.nom === c.reference.split('.')[0]) || !reste.some(r => r.nom === c.reference.split('.')[0])));
      out.push(reste.splice(i < 0 ? 0 : i, 1)[0]);
    }
    return out;
  }

  /** SQL de création d'une table (sans ses clés étrangères). */
  function sqlTable(base, t) {
    const cols = B.colonnes(base, t);
    const lignes = cols.map(defColonne);
    let s = `-- ${t.nom}${t.description ? ' : ' + t.description.replace(/\n/g, ' ') : ''}${t.bloc ? ' (bloc ' + t.bloc + ')' : ''}\ncreate table if not exists public.${qi(t.nom)} (\n${lignes.join(',\n')}\n);`;
    if (t.description) s += `\ncomment on table public.${qi(t.nom)} is ${ql(t.description)};`;
    cols.filter(c => c.description).forEach(c => { s += `\ncomment on column public.${qi(t.nom)}.${qi(c.nom)} is ${ql(c.description)};`; });
    (t.index || []).filter(ix => ix && ix.colonnes).forEach(ix => {
      const cs = String(ix.colonnes).split(',').map(x => x.trim()).filter(Boolean);
      s += `\ncreate ${ix.unique ? 'unique ' : ''}index if not exists ${qi(`${t.nom}_${cs.join('_')}_idx`.slice(0, 63))} on public.${qi(t.nom)} (${cs.map(qi).join(', ')});`;
    });
    if (cols.some(c => c.nom === 'modifie_le' && c.auto)) s += `\ndrop trigger if exists ${qi(t.nom + '_modifie_le')} on public.${qi(t.nom)};\ncreate trigger ${qi(t.nom + '_modifie_le')} before update on public.${qi(t.nom)} for each row execute function public.ab_modifie_le();`;
    return s;
  }

  /** Clés étrangères, ajoutées seulement si elles n'existent pas encore. */
  function sqlRelations(base, tables) {
    const out = [];
    tables.forEach(t => B.colonnes(base, t).filter(c => c.reference && !c.auto && c.reference !== 'auth.users.id').forEach(c => {
      const [rt, rc] = c.reference.split('.');
      const nom = nomContrainte(t.nom, c.nom);
      out.push(`do $$ begin
  if not exists (select 1 from pg_constraint where conname = ${ql(nom)}) then
    alter table public.${qi(t.nom)} add constraint ${qi(nom)} foreign key (${qi(c.nom)}) references public.${qi(rt)} (${qi(rc || 'id')}) on delete ${c.surSuppression || 'restrict'};
  end if;
end $$;`);
      out.push(`create index if not exists ${qi(`${t.nom}_${c.nom}_idx`.slice(0, 63))} on public.${qi(t.nom)} (${qi(c.nom)});`);
    }));
    return out;
  }

  const FONCTION_MODIFIE = `-- Met à jour modifie_le à chaque modification d'une ligne
create or replace function public.ab_modifie_le() returns trigger language plpgsql as $$
begin new.modifie_le = now(); return new; end $$;`;

  /** SQL complet d'une base, rejouable (if not exists). */
  B.sql = function (app, base, tablesChoisies) {
    const tables = ordonner(tablesChoisies || B.tables(app, base), base);
    if (!tables.length) return `-- ${base.nom} : aucune table pour le moment.\n`;
    const supa = base.moteur === 'supabase';
    const parts = [`-- Base « ${base.nom} » de l'app ${app.nom} — ${B.MOTEURS[base.moteur]}
-- Généré par l'Atelier de Blocs le ${new Date().toLocaleDateString('fr-FR')}. Rejouable : rien n'est supprimé.
create extension if not exists pgcrypto;`];
    if (tables.some(t => B.colonnes(base, t).some(c => c.nom === 'modifie_le' && c.auto))) parts.push(FONCTION_MODIFIE);
    tables.forEach(t => parts.push(sqlTable(base, t)));
    const rel = sqlRelations(base, tables);
    if (rel.length) parts.push('-- Relations entre les tables\n' + rel.join('\n'));
    if (supa) parts.push('-- Règles d’accès (RLS) : activées sur toutes les tables\n' + tables.map(t => `alter table public.${qi(t.nom)} enable row level security;\n${politiques(t)}`).join('\n\n'));
    return parts.join('\n\n') + '\n';
  };

  /* ======================= Comparaison avec une base réelle ======================= */
  /** schema : [{ nom, colonnes: [{ nom, type, requis, defaut }] }] (lu par le serveur local).
      Renvoie { sql, actions: [texte], alertes: [texte] } : on ajoute, on ne supprime jamais. */
  B.migration = function (app, base, schema) {
    const voulu = B.tables(app, base);
    const reel = new Map((schema || []).map(t => [t.nom, t]));
    const nouvelles = voulu.filter(t => !reel.has(t.nom));
    const actions = [], alertes = [], parts = [];
    if (nouvelles.length) {
      parts.push(B.sql(app, base, nouvelles).replace(/^-- Base.*\n-- Généré.*\n/, ''));
      nouvelles.forEach(t => actions.push(`Créer la table ${t.nom} (${B.colonnes(base, t).length} colonnes)`));
    }
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '').replace('charactervarying', 'varchar').replace('timestampwithtimezone', 'timestamptz').replace(/^int4$/, 'integer').replace(/^int8$/, 'bigint').replace(/^bool$/, 'boolean');
    voulu.filter(t => reel.has(t.nom)).forEach(t => {
      const r = reel.get(t.nom);
      B.colonnes(base, t).forEach(c => {
        const rc = r.colonnes.find(x => x.nom === c.nom);
        if (!rc) {
          const sansDefaut = c.requis && !(c.defaut && String(c.defaut).trim());
          parts.push(`alter table public.${qi(t.nom)} add column if not exists ${defColonne(Object.assign({}, c, { requis: c.requis && !sansDefaut, cle: false })).trim()};`);
          actions.push(`Ajouter la colonne ${t.nom}.${c.nom} (${c.type})`);
          if (sansDefaut) alertes.push(`${t.nom}.${c.nom} est obligatoire mais sans valeur par défaut : ajoutée facultative (les lignes existantes n’ont pas de valeur).`);
        } else if (norm(rc.type).split('(')[0] !== norm(c.type).split('(')[0] && !(norm(c.type) === 'text[]' && /array|_text/.test(norm(rc.type)))) {
          alertes.push(`${t.nom}.${c.nom} : type ${rc.type} dans la base, ${c.type} dans le schéma (non modifié automatiquement).`);
        }
      });
      r.colonnes.filter(x => !B.colonnes(base, t).some(c => c.nom === x.nom)).forEach(x => alertes.push(`${t.nom}.${x.nom} existe dans la base mais pas dans le schéma (conservée).`));
    });
    const rel = sqlRelations(base, voulu.filter(t => reel.has(t.nom)));
    if (actions.length && rel.length) parts.push(rel.join('\n'));
    if (base.moteur === 'supabase') voulu.filter(t => reel.has(t.nom) && !reel.get(t.nom).rls).forEach(t => {
      parts.push(`alter table public.${qi(t.nom)} enable row level security;\n${politiques(t)}`);
      actions.push(`Activer la RLS sur ${t.nom}`);
    });
    [...reel.keys()].filter(n => !voulu.some(t => t.nom === n)).forEach(n => alertes.push(`La table ${n} existe dans la base mais pas dans le schéma (conservée).`));
    return { sql: parts.length ? `-- Migration vers le schéma « ${base.nom} »\n\n${parts.join('\n\n')}\n` : '', actions, alertes };
  };

  /** Import : schéma d'une base réelle → tables du concepteur. */
  B.depuisSchema = function (schema, base) {
    const types = { 'character varying': 'varchar(255)', 'timestamp with time zone': 'timestamptz', 'timestamp without time zone': 'timestamptz', 'double precision': 'numeric', 'real': 'numeric', 'smallint': 'integer', 'json': 'jsonb', 'ARRAY': 'text[]', 'USER-DEFINED': 'text' };
    return schema.map(t => {
      const tb = B.nouvelleTable(t.nom);
      tb.nom = t.nom;
      tb.description = t.description || '';
      tb.colonnes = t.colonnes.filter(c => !(base.conventions.id !== false && c.nom === 'id') && !(base.conventions.horodatage !== false && (c.nom === 'cree_le' || c.nom === 'modifie_le'))).map(c => ({
        nom: c.nom, type: types[c.type] || c.type, requis: !!c.requis, unique: !!c.unique, cle: !!c.cle,
        defaut: c.defaut && !/nextval/.test(c.defaut) ? c.defaut : (/nextval/.test(c.defaut || '') ? '' : ''),
        reference: c.reference || '', surSuppression: c.surSuppression || 'restrict', description: c.description || ''
      }));
      if (base.conventions.id !== false && !t.colonnes.some(c => c.nom === 'id')) tb.colonnes.unshift(Object.assign(B.nouvelleColonne('id'), { cle: true, requis: true }));
      tb.acces = 'serveur';
      return tb;
    });
  };

  /** Résumé du modèle de données pour le prompt (Markdown). */
  B.markdown = function (app) {
    return (app.bases || []).map(base => {
      const tables = B.tables(app, base);
      if (!tables.length) return '';
      return `### Base « ${base.nom} » (${B.MOTEURS[base.moteur]})\n\n` + tables.map(t => `- **${t.nom}**${t.description ? ' — ' + t.description : ''}${base.moteur === 'supabase' ? ` (accès : ${ACCES()[t.acces] || t.acces})` : ''} : ` +
        B.colonnes(base, t).map(c => `\`${c.nom}\` ${c.type}${c.cle ? ' clé' : ''}${c.requis && !c.cle ? ' obligatoire' : ''}${c.unique ? ' unique' : ''}${c.reference ? ` → ${c.reference}` : ''}`).join(', ')).join('\n');
    }).filter(Boolean).join('\n\n');
  };

  /* ======================= Proposition par l'IA ======================= */
  /** Consigne pour que l'IA propose toutes les tables d'une app. */
  B.consigneIA = function (app, base) {
    const existantes = B.tables(app, base).map(t => t.nom);
    return `Tu conçois la base de données PostgreSQL${base.moteur === 'supabase' ? ' (Supabase)' : ''} d'une app mobile.
Propose TOUTES les tables nécessaires : colonnes, types, obligatoires, uniques, valeurs par défaut et relations.
Conventions : noms en minuscules avec _ (snake_case, en français), pas de colonne id, cree_le ni modifie_le (ajoutées automatiquement : id uuid, horodatage).
Une relation se note "reference": "table.id". Types permis : ${B.TYPES.map(t => t[0]).join(', ')}.
${base.moteur === 'supabase' ? `Pour chaque table : "proprietaire": true si chaque ligne appartient à l'utilisateur connecté (colonne utilisateur ajoutée), et "acces" parmi ${Object.keys(ACCES()).join(', ')}.` : ''}
${existantes.length ? `Tables déjà présentes (ne pas les reproposer) : ${existantes.join(', ')}.` : ''}
Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{ "tables": [ { "nom": "...", "description": "...", "proprietaire": false, "acces": "serveur",
  "colonnes": [ { "nom": "...", "type": "text", "requis": true, "unique": false, "defaut": "", "reference": "", "surSuppression": "restrict", "description": "..." } ],
  "index": [ { "colonnes": "col1, col2", "unique": false } ] } ] }`;
  };

  /** Proposition (JSON de l'IA) → tables du concepteur, en ignorant ce qui est invalide. */
  B.depuisProposition = function (prop, base) {
    const types = B.TYPES.map(t => t[0]);
    return (prop.tables || []).filter(t => t && t.nom).map(t => {
      const tb = B.nouvelleTable(t.nom);
      tb.description = String(t.description || '');
      tb.proprietaire = !!t.proprietaire && base.moteur === 'supabase';
      tb.acces = ACCES()[t.acces] ? t.acces : (tb.proprietaire ? 'proprietaire' : 'serveur');
      tb.colonnes = (t.colonnes || []).filter(c => c && c.nom && !['id', 'cree_le', 'modifie_le'].includes(c.nom) && !(tb.proprietaire && c.nom === 'utilisateur')).map(c => Object.assign(B.nouvelleColonne(c.nom), {
        type: types.includes(c.type) ? c.type : (/^(varchar|numeric)\(\d+(,\d+)?\)$/.test(c.type) ? c.type : 'text'),
        requis: !!c.requis, unique: !!c.unique, defaut: String(c.defaut || ''),
        reference: /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(c.reference || '') ? c.reference : '',
        surSuppression: B.SUPPRESSION[c.surSuppression] ? c.surSuppression : 'restrict', description: String(c.description || '')
      }));
      tb.index = (t.index || []).filter(i => i && i.colonnes).map(i => ({ colonnes: String(i.colonnes), unique: !!i.unique }));
      return tb;
    });
  };

  /* ======================= Import d'un schéma écrit (sans connexion) ======================= */
  // Fichier SQL (CREATE TABLE, migrations Supabase…) ou schema.prisma → même format que l'import d'une base réelle,
  // puis B.depuisSchema. Les noms restent ceux de la vraie base (ex. "User", "userId" chez Prisma).

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
    const col = { nom: sansGuillemets(c[1]), type: typeSql(type), requis: /not null|primary key/i.test(attrs), unique: /\bunique\b/i.test(attrs), cle: /primary key/i.test(attrs), defaut: '', reference: '', surSuppression: 'restrict' };
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
  B.schemaDepuisSql = function (texte) {
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

  const TYPES_PRISMA = { String: 'text', Int: 'integer', BigInt: 'bigint', Float: 'numeric', Decimal: 'numeric', Boolean: 'boolean', DateTime: 'timestamptz', Json: 'jsonb', Bytes: 'bytea' };
  B.schemaDepuisPrisma = function (texte) {
    const src = String(texte).replace(/\/\/[^\n]*/g, '');
    const enums = new Set([...src.matchAll(/^\s*enum\s+(\w+)\s*\{/gm)].map(m => m[1]));
    const modeles = [...src.matchAll(/^\s*model\s+(\w+)\s*\{([\s\S]*?)^\s*\}/gm)];
    const noms = new Set(modeles.map(m => m[1]));
    const tables = [];
    const nomTable = {};
    modeles.forEach(([, nom, corps]) => { const map = corps.match(/@@map\("([^"]+)"\)/); nomTable[nom] = map ? map[1] : nom; });
    modeles.forEach(([, nom, corps]) => {
      const t = { nom: nomTable[nom], colonnes: [], index: [] };
      const relations = [];
      corps.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
        if (l.startsWith('@@')) {
          const u = l.match(/^@@(unique|index|id)\(\s*(?:fields:\s*)?\[([^\]]+)\]/);
          if (u) t.index.push({ colonnes: u[2].split(',').map(s => s.trim()).join(', '), unique: u[1] !== 'index', cleComposee: u[1] === 'id' });
          return;
        }
        const f = l.match(/^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/);
        if (!f) return;
        const [, champ, type, liste, optionnel, attrs] = f;
        if (noms.has(type)) {   // champ de relation : il ne crée pas de colonne, il dit où pointe la clé étrangère
          const r = attrs.match(/@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*references:\s*\[([^\]]+)\](?:[^)]*onDelete:\s*(\w+))?/);
          if (r) relations.push({ champ: r[1].split(',')[0].trim(), cible: nomTable[type], colonne: r[2].split(',')[0].trim(), supp: r[3] });
          return;
        }
        const map = attrs.match(/@map\("([^"]+)"\)/);
        const col = { nom: map ? map[1] : champ, type: enums.has(type) ? 'text' : (TYPES_PRISMA[type] || 'text') + (liste ? '[]' : ''), requis: !optionnel, unique: /@unique\b/.test(attrs), cle: /@id\b/.test(attrs), defaut: '', reference: '', surSuppression: 'restrict' };
        if (/@db\.Uuid/.test(attrs)) col.type = 'uuid';
        const def = attrs.match(/@default\(((?:[^()]|\([^()]*\))*)\)/);
        if (def) {
          const d = def[1].trim();
          col.defaut = d === 'now()' ? 'now()' : /^(uuid|cuid|nanoid|autoincrement)\(/.test(d) ? '' : /^"/.test(d) ? `'${d.slice(1, -1).replace(/'/g, "''")}'` : d;
          if (/^autoincrement\(/.test(d)) col.description = 'Numéro automatique';
        }
        if (/@updatedAt/.test(attrs)) col.description = 'Mis à jour automatiquement';
        t.colonnes.push(col);
      });
      relations.forEach(r => {
        const c = t.colonnes.find(x => x.nom === r.champ || x.nom === r.champ);
        if (c) Object.assign(c, { reference: r.cible + '.' + r.colonne, surSuppression: { Cascade: 'cascade', SetNull: 'set null' }[r.supp] || 'restrict' });
      });
      tables.push(t);
    });
    return tables;
  };

  /** Lit un fichier de schéma (.sql ou .prisma) et renvoie les tables au format du concepteur. */
  B.importerSchemaTexte = function (texte, nomFichier, base) {
    const prisma = /\.prisma$/i.test(nomFichier || '') || /^\s*model\s+\w+\s*\{/m.test(texte);
    const schema = prisma ? B.schemaDepuisPrisma(texte) : B.schemaDepuisSql(texte);
    if (!schema.length) throw new Error('Aucune table trouvée : il faut un fichier SQL avec des CREATE TABLE, ou un schema.prisma avec des model.');
    base.conventions = { id: false, horodatage: false };   // les tables gardent exactement leurs colonnes
    const tables = B.depuisSchema(schema, base);
    tables.forEach((tb, i) => {
      tb.index = (schema[i].index || []).map(x => ({ colonnes: x.colonnes, unique: !!x.unique }));
      tb.description = schema[i].description || tb.description;
      tb.colonnes.forEach((c, j) => { const s = schema[i].colonnes.find(x => x.nom === c.nom); if (s && s.description) c.description = s.description; });
    });
    return { tables, prisma };
  };

  /* ======================= Serveur local : connexions et données ======================= */
  /** Appel à l'API bases du serveur local (même origine uniquement : http://localhost:8787). */
  B.api = async function (chemin, corps) {
    if (location.protocol === 'file:') throw new Error('Pour se connecter aux bases, ouvre l’Atelier depuis le serveur local : node serveur.js, puis http://localhost:8787');
    const r = await fetch('/api/db/' + chemin, corps === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify(corps) });
    let d;
    try { d = await r.json(); } catch (e) { throw new Error(`Réponse illisible du serveur (${r.status}). Le serveur local est-il à jour ?`); }
    if (!r.ok) throw new Error(d.erreur || `Erreur ${r.status}`);
    return d;
  };
  B.serveurDisponible = async () => { try { return location.protocol !== 'file:' && !!(await B.api('connexions')); } catch (e) { return false; } };

  /* ======================= Aides à la saisie (onglet Données) =======================
     Le serveur donne, pour chaque colonne d'une table, les valeurs possibles lues dans la base (enum, CHECK,
     oui/non), les lignes liées d'une clé étrangère et les valeurs déjà utilisées. Le code de l'app ajoute
     les rôles déclarés (kit « App complète » : app/app.js › roles) et la colonne d'affichage de chaque table. */
  const NUL = '⟨NULL⟩', AUTRE = '⟨autre⟩';   // marqueurs des options « NULL » et « Autre valeur… » (pas de caractère nul : le HTML le remplace)
  const cacheIndices = new Map();

  /** Ce que le code de la version courante dit des données : rôles, colonne d'affichage par table. Jamais exécuté, seulement lu. */
  B.indicesCode = async function (app) {
    const v = AB.code && AB.code.courante(app);
    if (!v) return { roles: [], affichages: {}, kitComplet: false };
    const cle = app.id + ':' + v.numero;
    if (cacheIndices.has(cle)) return cacheIndices.get(cle);
    const out = { roles: [], affichages: {}, kitComplet: false };
    try {
      const blob = await AB.code.zip(app);
      const s = blob ? await AB.mobile.sourceZip(blob, app.nom) : null;
      const tous = s ? (s.tous || s.fichiers) : {};
      const chemins = Object.keys(tous);
      out.kitComplet = chemins.some(c => /(^|\/)noyau\/admin\.js$/.test(c));
      const cApp = chemins.filter(c => /(^|\/)app\/app\.js$/.test(c)).sort((a, b) => a.length - b.length)[0];
      if (cApp) {
        const src = AB.mobile.texte(tous[cApp]).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        const bloc = (cle_, ouvre, ferme) => {
          const m = src.match(new RegExp('\\b' + cle_ + '\\s*:\\s*\\' + ouvre));
          if (!m) return '';
          let n = 0;
          for (let i = m.index + m[0].length - 1; i < src.length; i++) {
            if (src[i] === ouvre) n++; else if (src[i] === ferme && --n === 0) return src.slice(m.index + m[0].length, i);
          }
          return '';
        };
        const lit = '[\'"`]([^\'"`]+)[\'"`]';
        const roles = bloc('roles', '[', ']');
        const objets = roles.match(/\{[^{}]*\}/g) || [];
        if (objets.length) objets.forEach(o => { const id = (o.match(new RegExp('\\bid\\s*:\\s*' + lit)) || [])[1]; if (id) out.roles.push({ v: id, l: (o.match(new RegExp('\\blibelle\\s*:\\s*' + lit)) || [])[1] || '' }); });
        else [...roles.matchAll(new RegExp(lit, 'g'))].forEach(m => out.roles.push({ v: m[1], l: '' }));
        const tables = bloc('tables', '{', '}');
        [...tables.matchAll(new RegExp('([\\w$]+)\\s*:\\s*\\{[^{}]*?\\baffichage\\s*:\\s*' + lit, 'g'))].forEach(m => { out.affichages[m[1]] = m[2]; });
      }
    } catch (e) { /* code illisible : on se contente de la base */ }
    cacheIndices.set(cle, out);
    return out;
  };

  /** Choix proposés pour une colonne : { options: [{ v, l }], ferme (seules ces valeurs passent), source, recherche (table liée trop grande) }. */
  B.choix = function (table, col, indices) {
    const ch = { options: [], ferme: false, source: '', recherche: null };
    if (col.valeurs) {
      ch.options = col.valeurs.map(v => ({ v, l: col.source === 'booleen' ? (v === 'true' ? 'oui' : 'non') : '' }));
      ch.ferme = true;
      ch.source = { enum: 'type énuméré de la base', check: 'contrainte de la base', booleen: 'oui / non' }[col.source] || '';
    } else if (col.reference && !col.reference.erreur) {
      ch.options = col.reference.options.map(o => ({ v: o.v, l: o.l || '' }));
      ch.ferme = true;
      ch.source = `lignes de ${col.reference.table}` + (col.reference.affichage ? ` (affichées par ${col.reference.affichage})` : '');
      if (col.reference.total > col.reference.options.length) ch.recherche = col.reference;
    }
    // Rôles : ceux du code (admin et utilisateur sont fournis par le noyau du kit « App complète »)
    if (/^roles?$/.test(col.nom) && !ch.ferme && indices) {
      const noyau = indices.kitComplet && table === 'utilisateurs' ? [{ v: 'admin', l: 'Administrateur (tous les droits)' }, { v: 'utilisateur', l: 'Utilisateur (compte connecté)' }] : [];
      noyau.concat(indices.roles).forEach(r => { if (!ch.options.some(o => o.v === r.v)) ch.options.push({ v: r.v, l: r.l }); });
      if (ch.options.length) ch.source = noyau.length ? 'rôles du noyau et de app/app.js' : 'rôles déclarés dans app/app.js';
    }
    // Valeurs déjà présentes dans la table (petites listes) : proposées, une autre valeur reste possible
    (col.existantes || []).forEach(e => {
      const o = ch.options.find(x => x.v === e.v);
      if (o) o.n = e.n; else if (!ch.ferme) ch.options.push({ v: e.v, l: ch.source ? 'utilisé, absent du code' : '', n: e.n });
    });
    if (!ch.source && ch.options.length) ch.source = 'valeurs déjà utilisées dans la table';
    return ch;
  };

  const texteSql = t => /text|char|json|\[\]/.test(t || '') && !/^uuid$/.test(t);
  const esc = s => U.esc(s);
  const libelleOption = (o, fk) => fk ? (o.l ? `${o.l} — ${o.v}` : o.v) : (o.l ? `${o.v} — ${o.l}` : o.v) + (o.n ? ` (${o.n})` : '');

  /** PostgreSQL renvoie les booléens en t / f : on les compare et on les affiche en true / false, comme dans la liste. */
  B.normaliser = (col, v) => col && col.type === 'boolean' && (v === 't' || v === 'f') ? (v === 't' ? 'true' : 'false') : v;

  /** Champ de saisie d'une colonne (liste déroulante quand on connaît les valeurs). valeur : texte ou null. */
  B.champ = function (col, ch, valeur, opts) {
    opts = opts || {};
    valeur = B.normaliser(col, valeur);
    const attrs = `data-champ="${esc(col.nom)}" data-type="${esc(col.type)}"`;
    const fk = !!col.reference;
    if (ch.recherche) {
      return `<div class="bd-recherche"><input class="tv-input mono" ${attrs} data-recherche list="dl-${esc(col.nom)}" value="${esc(valeur === null || valeur === undefined ? '' : valeur)}" placeholder="${col.requis ? 'cherche par ' + esc(ch.recherche.affichage || ch.recherche.colonne) : 'vide = NULL · cherche…'}">
        <datalist id="dl-${esc(col.nom)}">${ch.options.map(o => `<option value="${esc(o.v)}">${esc(o.l || '')}</option>`).join('')}</datalist></div>`;
    }
    if (ch.options.length) {
      const actuelle = valeur === null || valeur === undefined ? null : String(valeur);
      const connue = actuelle === null || ch.options.some(o => o.v === actuelle);
      return `<select class="tv-select mono" ${attrs}>
        ${opts.defaut ? `<option value="">${esc(col.defaut ? 'valeur par défaut (' + col.defaut + ')' : 'valeur par défaut')}</option>` : ''}
        ${!col.requis ? `<option value="${NUL}" ${actuelle === null && !opts.defaut ? 'selected' : ''}>NULL (vide)</option>` : ''}
        ${!connue ? `<option value="${esc(actuelle)}" selected>${esc(actuelle)} (valeur actuelle)</option>` : ''}
        ${ch.options.map(o => `<option value="${esc(o.v)}" ${o.v === actuelle ? 'selected' : ''}>${esc(libelleOption(o, fk))}</option>`).join('')}
        ${!ch.ferme ? `<option value="${AUTRE}">Autre valeur…</option>` : ''}</select>`;
    }
    const v = valeur === null || valeur === undefined ? '' : String(valeur);
    const ph = opts.defaut ? (col.defaut ? 'défaut : ' + col.defaut : '') : texteSql(col.type) ? '' : 'vide = NULL';
    return v.length > 60 || /json/.test(col.type) ? `<textarea class="tv-textarea mono" rows="4" ${attrs} placeholder="${esc(ph)}">${esc(v)}</textarea>`
      : `<input class="tv-input mono" ${attrs} value="${esc(v)}" placeholder="${esc(ph)}">`;
  };

  /** Branche « Autre valeur… » et la recherche dans une grande table liée. */
  B.brancherChamps = function (conteneur, baseId) {
    conteneur.querySelectorAll('select[data-champ]').forEach(s => s.addEventListener('change', () => {
      if (s.value !== AUTRE) return;
      const i = document.createElement('input');
      i.className = 'tv-input mono'; i.dataset.champ = s.dataset.champ; i.dataset.type = s.dataset.type; i.placeholder = 'nouvelle valeur';
      s.replaceWith(i); i.focus();
    }));
    conteneur.querySelectorAll('input[data-recherche]').forEach(i => {
      let minuterie;
      i.addEventListener('input', () => {
        clearTimeout(minuterie);
        minuterie = setTimeout(async () => {
          const dl = conteneur.querySelector('#' + CSS.escape(i.getAttribute('list')));
          const col = i.dataset.champ;
          try {
            const r = await B.api('options', { id: baseId, table: i.dataset.refTable, colonne: i.dataset.refColonne, affichage: i.dataset.refAffichage, q: i.value });
            dl.innerHTML = r.options.map(o => `<option value="${esc(o.v)}">${esc(o.l || '')}</option>`).join('');
          } catch (e) { /* la recherche est une aide : on garde la saisie libre */ void col; }
        }, 250);
      });
    });
  };
  /** Indique à un champ de recherche quelle table liée interroger. */
  B.cibleRecherche = function (conteneur, colonnes) {
    conteneur.querySelectorAll('input[data-recherche]').forEach(i => {
      const c = colonnes.find(x => x.nom === i.dataset.champ);
      if (c && c.reference) { i.dataset.refTable = c.reference.table; i.dataset.refColonne = c.reference.colonne; i.dataset.refAffichage = (c.reference.affichage || '').split(',')[0]; }
    });
  };

  /** Valeur saisie : texte, ou null (NULL choisi, ou champ vide d'une colonne non texte). undefined = valeur par défaut (ajout). */
  B.lireChamp = function (el, opts) {
    const v = el.value;
    if (v === NUL) return null;
    if (v === AUTRE) return undefined;
    if (v === '' && opts && opts.defaut) return undefined;
    if (v === '' && !texteSql(el.dataset.type)) return null;
    return v;
  };

  /** Ce qui aide à remplir une colonne, en clair (sous le champ et dans le panneau « Aides »). */
  B.aideColonne = function (col, ch) {
    const l = [];
    if (col.description) l.push(esc(col.description));
    if (ch.options.length && !col.reference) l.push(`<b>${ch.ferme ? 'Valeurs permises' : 'Valeurs proposées'}</b> (${esc(ch.source)}) : ${ch.options.map(o => `<span class="mono">${esc(o.v)}</span>${o.l ? ' ' + esc(o.l) : ''}`).join(', ')}${ch.ferme ? '' : ' · une autre valeur reste possible'}`);
    if (col.reference) l.push(col.reference.erreur ? `Lien vers <span class="mono">${esc(col.reference.table)}</span> (${esc(col.reference.erreur)})`
      : `Lien vers <span class="mono">${esc(col.reference.table)}.${esc(col.reference.colonne)}</span> : ${col.reference.total} ligne${col.reference.total > 1 ? 's' : ''}${ch.recherche ? ', tape pour chercher' : ''}`);
    (col.regles || []).forEach(r => l.push(`Règle de la base : <span class="mono">${esc(r)}</span>`));
    const etat = [col.cle ? 'clé primaire' : '', col.unique && !col.cle ? 'unique' : '', col.requis ? 'obligatoire' : 'peut être vide (NULL)', col.defaut ? 'défaut : ' + col.defaut : '', col.auto ? 'calculée par la base' : ''].filter(Boolean);
    l.push(`<span class="muted">${esc(col.type)} · ${esc(etat.join(' · '))}</span>`);
    if (col.sensible) l.push('<span style="color:var(--color-warning)"><span class="mdi mdi-shield-alert-outline"></span> ' + (col.nom === 'mdp_hash'
      ? 'Empreinte du mot de passe : pour en donner un, utilise le cadenas de la ligne (mot de passe provisoire, haché comme l’app, à changer à la connexion suivante).</span>'
      : 'Donnée sensible : ne pas l’écrire à la main.</span>'));
    return l.join('<br>');
  };
  B.NUL = NUL;
})();
