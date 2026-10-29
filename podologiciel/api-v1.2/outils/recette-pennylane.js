/* outils/recette-pennylane.js — essai du connecteur Pennylane contre un FAUX Pennylane local (OUTIL DE DÉVELOPPEMENT)
   node outils/recette-pennylane.js postgres://utilisateur:motdepasse@localhost:5432/postgres
   Crée une base jetable, lance l'API avec PENNYLANE_API_URL pointant sur un serveur local qui imite l'API v2
   (/me, /individual_customers, /file_attachments, /customer_invoices/import), joue les scénarios puis supprime la base.
   Aucune donnée ne part chez Pennylane. → « Conforme » (code 0) ou « Non conforme » (code 1). */
'use strict';
const path = require('path'), crypto = require('crypto'), http = require('http'), net = require('net'), { spawn } = require('child_process');
const racine = path.resolve(__dirname, '..');
const urlServeur = process.argv.slice(2).find(a => /^postgres(ql)?:\/\//.test(a)) || process.env.RECETTE_DATABASE_URL;
if (!urlServeur) { console.error('Indique un serveur PostgreSQL de test : node outils/recette-pennylane.js postgres://…/postgres'); process.exit(2); }
const pg = require(require.resolve('pg', { paths: [racine] }));
const nomBase = 'recette_pl_' + crypto.randomBytes(3).toString('hex');
const urlBase = (() => { const u = new URL(urlServeur); u.pathname = '/' + nomBase; return u.toString(); })();
const urlAdmin = (() => { const u = new URL(urlServeur); u.pathname = '/postgres'; return u.toString(); })();
const port = () => new Promise(ok => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => ok(p)); }); });
const resultats = [];
const verifier = (texte, ok, detail) => resultats.push({ texte, ok: !!ok, detail });

/* ---------- Faux Pennylane ---------- */
const JETON = 'pl_test_' + crypto.randomBytes(12).toString('hex');
const pl = { clients: [], fichiers: [], factures: [], appels: [], trop: 0, coupure: false };
function fauxPennylane() {
  return http.createServer((req, res) => {
    const morceaux = [];
    req.on('data', m => morceaux.push(m));
    req.on('end', () => {
      const brut = Buffer.concat(morceaux);
      const url = req.url.replace(/^\/api\/external\/v2/, '');
      pl.appels.push(`${req.method} ${url}`);
      const json = (s, o, h) => { res.writeHead(s, Object.assign({ 'Content-Type': 'application/json' }, h || {})); res.end(JSON.stringify(o)); };
      if (req.headers.authorization !== `Bearer ${JETON}`) return json(401, { error: 'Unauthorized' });
      if (pl.trop > 0) { pl.trop--; return json(429, { error: 'Rate limit' }, { 'Retry-After': '1' }); }
      if (pl.coupure && url === '/customer_invoices/import') { pl.coupure = false; return req.socket.destroy(); }
      const corps = /json/.test(req.headers['content-type'] || '') ? JSON.parse(brut.toString('utf8') || '{}') : null;
      if (req.method === 'GET' && url === '/me') return json(200, { user: { email: 'podo@exemple.fr' }, company: { id: 1, name: 'Cabinet Test' } });
      if (req.method === 'POST' && url === '/individual_customers') {
        if (!corps.first_name || !corps.last_name || !corps.billing_address) return json(422, { message: 'first_name, last_name, billing_address requis' });
        const c = Object.assign({ id: 1000 + pl.clients.length }, corps); pl.clients.push(c); return json(201, c);
      }
      let m = url.match(/^\/individual_customers\/(\d+)$/);
      if (req.method === 'PUT' && m) { const c = pl.clients.find(x => x.id === Number(m[1])); if (!c) return json(404, {}); Object.assign(c, corps, { maj: (c.maj || 0) + 1 }); return json(200, c); }
      if (req.method === 'POST' && url === '/file_attachments') {
        if (!/multipart\/form-data/.test(req.headers['content-type'] || '') || !brut.includes(Buffer.from('%PDF-'))) return json(400, { message: 'PDF attendu' });
        const f = { id: 4000 + pl.fichiers.length, taille: brut.length }; pl.fichiers.push(f); return json(201, f);
      }
      if (req.method === 'POST' && url === '/customer_invoices/import') {
        const requis = ['file_attachment_id', 'date', 'deadline', 'customer_id', 'currency_amount_before_tax', 'currency_amount', 'currency_tax', 'invoice_lines'];
        const manque = requis.filter(k => corps[k] == null);
        if (manque.length) return json(400, { message: 'manque ' + manque.join(', ') });
        if ('label' in corps) return json(400, { message: 'label not expected' });
        const somme = corps.invoice_lines.reduce((s, l) => s + Math.round(Number(l.currency_amount) * 100), 0);
        if (somme !== Math.round(Number(corps.currency_amount) * 100)) return json(422, { message: 'Entry lines are not balanced' });
        if (corps.invoice_lines.some(l => ['currency_amount', 'currency_tax', 'quantity', 'raw_currency_unit_price', 'unit', 'vat_rate'].some(k => l[k] == null))) return json(400, { message: 'ligne incomplète' });
        const f = Object.assign({ id: 9000 + pl.factures.length }, corps); pl.factures.push(f); return json(201, f);
      }
      json(404, { message: 'inconnu' });
    });
  });
}

function lancer(variables) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['serveur.js'], { cwd: racine, env: Object.assign({ PATH: process.env.PATH }, variables) });
    let sortie = '';
    const fini = setTimeout(() => reject(new Error('API non démarrée :\n' + sortie)), 20000);
    p.stdout.on('data', x => { sortie += x; if (/prête sur le port/.test(sortie)) { clearTimeout(fini); resolve(p); } });
    p.stderr.on('data', x => { sortie += x; });
  });
}

(async () => {
  const faux = fauxPennylane();
  const portPl = await port();
  await new Promise(ok => faux.listen(portPl, '127.0.0.1', ok));
  const P = await port();
  const api = await lancer({ DATABASE_URL: urlBase, DB_CREER_BASE: '1', PORT: String(P), INSCRIPTION_OUVERTE: '1', ADMIN_DEFAUT: '0', INSTALL_CODE: 'code-recette-123',
    PENNYLANE_API_URL: `http://127.0.0.1:${portPl}/api/external/v2`, DEUX_FACTEURS_CLE: crypto.randomBytes(24).toString('base64url') });
  const base = `http://127.0.0.1:${P}/api`;
  let jeton = '';
  const appel = async (methode, chemin, corps) => {
    const res = await fetch(base + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      body: corps ? JSON.stringify(corps) : undefined });
    return { statut: res.status, corps: await res.json().catch(() => null) };
  };
  const pdf = n => Buffer.from(`%PDF-1.4\n% facture ${n}\n` + 'x'.repeat(200)).toString('base64');
  const db = new pg.Client({ connectionString: urlBase });
  try {
    await appel('POST', '/auth/register', { email: 'podo@exemple.fr', password: 'Motdepasse-recette-1' });
    jeton = (await appel('POST', '/auth/login', { email: 'podo@exemple.fr', password: 'Motdepasse-recette-1' })).corps.tokens.accessToken;
    await db.connect();
    await db.query("update utilisateurs set role = 'premium'");

    let r = await appel('GET', '/pennylane');
    verifier('État initial : non connecté', (r.statut === 200 || r.statut === 201) && r.corps.connecte === false, JSON.stringify(r.corps));
    r = await appel('PUT', '/pennylane', { jeton: 'mauvaise-cle-pennylane' });
    verifier('Clé refusée par Pennylane : message clair, rien enregistré', r.statut === 400 && /clé d’API/.test(r.corps.message) && !(await db.query('select 1 from pennylane_reglages')).rowCount, r.corps && r.corps.message);
    r = await appel('PUT', '/pennylane', { jeton: JETON, depuis: '2026-01-01' });
    verifier('Connexion : clé vérifiée (/me), entreprise affichée', (r.statut === 200 || r.statut === 201) && r.corps.connecte && r.corps.entreprise === 'Cabinet Test', JSON.stringify(r.corps));
    const stocke = (await db.query('select jeton from pennylane_reglages')).rows[0].jeton;
    verifier('Clé gardée chiffrée en base, jamais renvoyée', !stocke.includes(JETON) && /^v1:/.test(stocke) && !JSON.stringify(r.corps).includes(JETON));

    const patient = (await appel('POST', '/patients', { nom: 'Martin', prenom: 'Claire', adresse: '12 rue des Lilas, 69003 Lyon', email: 'claire@exemple.fr', telephone: '0600000000' })).corps;
    const f1 = (await appel('POST', '/factures', { patientId: patient.id, date: '2026-10-20', actes: [{ label: 'Soin de pédicurie', quantite: 1, prix: 35 }, { label: 'Bilan', quantite: 0.5, prix: 60.01 }], emettre: true })).corps;
    const brouillon = (await appel('POST', '/factures', { patientId: patient.id, date: '2026-10-21', actes: [{ label: 'Soin', quantite: 1, prix: 35 }] })).corps;
    const ancienne = (await appel('POST', '/factures', { patientId: patient.id, date: '2025-12-31', actes: [{ label: 'Soin', quantite: 1, prix: 30 }], emettre: true })).corps;
    r = await appel('GET', '/pennylane');
    verifier('Factures à envoyer : émises et datées après « depuis » seulement', r.corps.aEnvoyer === 1, 'aEnvoyer = ' + r.corps.aEnvoyer);

    r = await appel('POST', `/pennylane/factures/${brouillon.id}`, { pdf: pdf('b') });
    verifier('Un brouillon ne s’envoie pas', r.statut === 400);
    r = await appel('POST', `/pennylane/factures/${f1.id}`, { pdf: Buffer.from('pas un pdf').toString('base64') });
    verifier('PDF illisible refusé', r.statut === 400);

    pl.trop = 1;
    r = await appel('POST', `/pennylane/factures/${f1.id}`, { pdf: pdf(f1.numero) });
    const imp = pl.factures[0] || {};
    verifier('Envoi d’une facture (reprise après un 429)', (r.statut === 200 || r.statut === 201) && r.corps.pennylaneId === 9000, JSON.stringify(r.corps));
    verifier('Import avec NOTRE numéro, notre PDF et la TVA exonérée', imp.invoice_number === f1.numero && imp.file_attachment_id === 4000 && imp.invoice_lines.every(l => l.vat_rate === 'exempt') && imp.currency_tax === '0.00');
    verifier('Total juste et lignes équilibrées (arrondi au centime)', imp.currency_amount === Number(f1.total).toFixed(2), `${imp.currency_amount} / ${f1.total}`);
    const client = pl.clients[0] || {};
    verifier('Patient créé comme client : nom et adresse découpée, sans email ni téléphone', client.last_name === 'Martin' && client.first_name === 'Claire'
      && client.billing_address.postal_code === '69003' && client.billing_address.city === 'Lyon' && client.billing_address.address === '12 rue des Lilas' && !client.emails && !client.phone, JSON.stringify(client));
    r = await appel('POST', `/pennylane/factures/${f1.id}`, { pdf: pdf(f1.numero) });
    verifier('Pas de second envoi d’une facture déjà dans Pennylane', r.statut === 409 && pl.factures.length === 1);
    const liste = (await appel('GET', '/factures')).corps.find(x => x.id === f1.id);
    verifier('La liste des factures montre l’envoi', liste.pennylaneId === 9000 && !!liste.pennylaneEnvoyeLe);

    // Avoir : envoyé après la facture, relié à elle
    const res = (await appel('POST', `/factures/${f1.id}/avoir`, { motif: 'erreur' })).corps;
    r = await appel('POST', `/pennylane/factures/${res.avoir.id}`, { pdf: pdf(res.avoir.numero) });
    const av = pl.factures[1] || {};
    verifier('Avoir envoyé, montants négatifs, relié à la facture annulée', (r.statut === 200 || r.statut === 201) && av.credited_invoice_id === 9000 && Number(av.currency_amount) === -Number(f1.total) && av.customer_id === client.id, JSON.stringify(av).slice(0, 300));

    // Avoir dont la facture n'est pas envoyée
    const f2 = (await appel('POST', '/factures', { patientId: patient.id, date: '2026-10-22', actes: [{ label: 'Soin', quantite: 1, prix: 35 }], emettre: true })).corps;
    const res2 = (await appel('POST', `/factures/${f2.id}/avoir`, {})).corps;
    r = await appel('POST', `/pennylane/factures/${res2.avoir.id}`, { pdf: pdf('a2') });
    verifier('Avoir refusé tant que sa facture n’est pas envoyée', r.statut === 409 && /Envoie d’abord/.test(r.corps.message), r.corps.message);

    // Fiche patient modifiée → client mis à jour au prochain envoi
    await appel('PATCH', `/patients/${patient.id}`, { adresse: '3 place Bellecour 69002 Lyon' });
    r = await appel('POST', `/pennylane/factures/${f2.id}`, { pdf: pdf(f2.numero) });
    verifier('Fiche modifiée : client mis à jour, pas recréé', (r.statut === 200 || r.statut === 201) && pl.clients.length === 1 && pl.clients[0].maj === 1 && pl.clients[0].billing_address.postal_code === '69002', JSON.stringify(pl.clients[0]));

    // Réponse perdue : l'envoi est marqué incertain et ne repart qu'avec forcer
    const f3 = (await appel('POST', '/factures', { date: '2026-10-22', actes: [{ label: 'Soin', quantite: 1, prix: 40 }], emettre: true })).corps;
    pl.coupure = true;
    r = await appel('POST', `/pennylane/factures/${f3.id}`, { pdf: pdf(f3.numero) });
    verifier('Réponse perdue : erreur 502 notée sur la facture', r.statut === 502 && /non reçue/.test(r.corps.message), r.corps && r.corps.message);
    r = await appel('POST', `/pennylane/factures/${f3.id}`, { pdf: pdf(f3.numero) });
    verifier('Renvoi bloqué sans confirmation (évite un doublon)', r.statut === 409 && /vérifie dans Pennylane/.test(r.corps.message));
    r = await appel('POST', `/pennylane/factures/${f3.id}`, { pdf: pdf(f3.numero), forcer: true });
    verifier('Renvoi confirmé : facture sans patient sur le client « Patient sans fiche »', (r.statut === 200 || r.statut === 201) && r.corps.pennylaneId && pl.clients.some(c => c.last_name === 'Patient sans fiche'), JSON.stringify(r));

    // Isolation : un autre podologue ne voit ni n'envoie les factures du premier
    await appel('POST', '/auth/register', { email: 'autre@exemple.fr', password: 'Motdepasse-recette-2' });
    const jeton1 = jeton;
    jeton = (await appel('POST', '/auth/login', { email: 'autre@exemple.fr', password: 'Motdepasse-recette-2' })).corps.tokens.accessToken;
    r = await appel('POST', `/pennylane/factures/${ancienne.id}`, { pdf: pdf('x') });
    verifier('Un autre podologue ne peut pas envoyer ces factures', r.statut === 404);
    r = await appel('GET', '/pennylane');
    verifier('… et n’hérite pas de la connexion Pennylane', r.corps.connecte === false);
    jeton = jeton1;

    r = await appel('PUT', '/pennylane', { envoiAuto: false, depuis: '2025-01-01' });
    verifier('Réglages : envoi auto et date de départ', r.corps.envoiAuto === false && r.corps.depuis === '2025-01-01' && r.corps.aEnvoyer === 2, JSON.stringify(r.corps));
    r = await appel('POST', '/pennylane/patients/synchro');
    verifier('Synchro des clients (rien de changé)', (r.statut === 200 || r.statut === 201) && r.corps.misAJour === 0, JSON.stringify(r.corps));
    const j = (await db.query("select detail::text from journal where action like '%pennylane%'")).rows.map(x => x.detail).join(' ');
    verifier('Journal sans la clé', j.length > 0 && !j.includes(JETON));
    r = await appel('DELETE', '/pennylane');
    verifier('Déconnexion : clé effacée', r.corps.connecte === false && !(await db.query('select 1 from pennylane_reglages')).rowCount);
  } catch (e) {
    verifier('Déroulé sans exception', false, e.stack);
  } finally {
    api.kill();
    faux.close();
    await db.end().catch(() => {});
    const a = new pg.Client({ connectionString: urlAdmin });
    await a.connect();
    await new Promise(ok => setTimeout(ok, 500));
    await a.query(`drop database if exists ${nomBase} with (force)`).catch(e => console.error(e.message));
    await a.end();
  }
  for (const x of resultats) console.log(`  ${x.ok ? '✓' : '✗'} ${x.texte}${x.ok || !x.detail ? '' : '\n      ' + x.detail}`);
  const ko = resultats.filter(x => !x.ok).length;
  console.log(ko ? `\nNon conforme (${ko} échec(s)).` : `\nConforme (${resultats.length} vérifications).`);
  process.exit(ko ? 1 : 0);
})();
