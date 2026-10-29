/* app/pennylane.js — connecteur Pennylane (API v2), facultatif et propre à chaque podologue.

   Pennylane n'est pas obligatoire : la réforme de la facture électronique demande une plateforme agréée au choix, et
   les soins aux patients (exonérés de TVA, B2C) n'en relèvent pas. Ce connecteur sert au podologue qui tient déjà sa
   comptabilité dans Pennylane :
   - il colle sa clé d'API (Pennylane › Paramètres › Connectivité › Développeurs, droits customers, customer_invoices
     et file_attachments) ; elle est vérifiée puis gardée chiffrée, jamais renvoyée à l'écran ;
   - chaque facture émise est IMPORTÉE avec son numéro et son PDF (ceux de PodoLogiciel, pas de seconde numérotation),
     TVA « exonérée » ; un avoir est relié à la facture qu'il annule ;
   - le patient facturé devient un client Pennylane avec son nom et son adresse seulement (ni email, ni téléphone,
     ni donnée de santé).
   Pennylane n'empêche pas les doublons à l'import : une facture envoyée garde son identifiant Pennylane et n'est plus
   proposée ; si la réponse de Pennylane se perd, l'écran demande de vérifier avant de renvoyer (forcer). */
'use strict';

const DEFAUT_URL = 'https://app.pennylane.com/api/external/v2';
const PDF_MAX = 10e6;
const ENVOI_EN_COURS_MS = 2 * 60 * 1000;
const INCERTAIN = 'Réponse de Pennylane non reçue';

module.exports.routes = function (r, ctxApp) {
  const { base, journal, env, erreur } = ctxApp;
  const d = require('./donnees')(ctxApp);
  const { chiffrer, dechiffrer } = require('./chiffrement')(env, 'pennylane');
  const uid = ctx => ctx.utilisateur.id;
  const adresseApi = () => (env.get('PENNYLANE_API_URL') || DEFAUT_URL).replace(/\/+$/, '');
  const montant = n => (Math.round(n * 100) / 100).toFixed(2);

  /* ---------- Appels à Pennylane ---------- */

  /** Message lisible à partir d'une réponse d'erreur de Pennylane. */
  function messagePennylane(statut, corps) {
    const detail = corps && (corps.message || corps.error || (Array.isArray(corps.errors) ? corps.errors.join(' ; ') : corps.errors && JSON.stringify(corps.errors)));
    if (statut === 401) return 'Pennylane refuse la clé d’API (absente, expirée ou révoquée). Colle une nouvelle clé.';
    if (statut === 403) return 'La clé d’API Pennylane n’a pas les droits nécessaires (customers, customer_invoices, file_attachments en écriture).';
    return `Pennylane a répondu ${statut}` + (detail ? ` : ${String(detail).slice(0, 500)}` : '.');
  }

  /** Requête vers Pennylane, avec reprise sur 429 (trop de requêtes). Lève une erreur 502 lisible sinon. */
  async function appel(jeton, methode, chemin, corps, essai = 0) {
    const multipart = typeof FormData !== 'undefined' && corps instanceof FormData;
    let res;
    try {
      res = await fetch(adresseApi() + chemin, {
        method: methode,
        headers: Object.assign({ Authorization: `Bearer ${jeton}`, Accept: 'application/json' }, corps && !multipart ? { 'Content-Type': 'application/json' } : {}),
        body: corps ? (multipart ? corps : JSON.stringify(corps)) : undefined,
        signal: AbortSignal.timeout(30000)
      });
    } catch (e) {
      const x = erreur(502, `${INCERTAIN} (${e.name === 'TimeoutError' ? 'délai dépassé' : 'réseau'}).`);
      x.incertain = true;
      throw x;
    }
    if (res.status === 429 && essai < 3) {
      const attente = Math.min(10, Number(res.headers.get('retry-after')) || 2 ** essai);
      await new Promise(ok => setTimeout(ok, attente * 1000));
      return appel(jeton, methode, chemin, corps, essai + 1);
    }
    const texte = await res.text();
    let json = null;
    try { json = texte ? JSON.parse(texte) : null; } catch (e) { /* réponse non JSON */ }
    if (!res.ok) {
      const x = erreur(res.status === 401 || res.status === 403 ? 400 : 502, messagePennylane(res.status, json));
      x.statutPennylane = res.status;
      throw x;
    }
    return json;
  }

  async function reglagesDe(u) {
    return base.une('select * from pennylane_reglages where utilisateur_id = $1', [u]);
  }
  async function jetonDe(u) {
    const reg = await reglagesDe(u);
    if (!reg) throw erreur(400, 'Pennylane n’est pas connecté : colle ta clé d’API dans Facturation › Pennylane.');
    const jeton = dechiffrer(reg.jeton);
    if (!jeton) throw erreur(400, 'La clé Pennylane enregistrée ne se lit plus (clé de chiffrement du serveur changée) : colle-la à nouveau.');
    return { reg, jeton };
  }

  /* ---------- Patients → clients Pennylane ---------- */

  /** « 12 rue X, 75002 Paris » → { address, postal_code, city }. Sans code postal reconnu, tout va dans address. */
  function adresseDecoupee(texte) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^(.*?)[,\s]*\b(\d{5})\s+([^,\d][^,]*?)(?:,\s*france)?$/i);
    if (m) return { address: m[1].replace(/[,\s]+$/, '') || m[3], postal_code: m[2], city: m[3], country_alpha2: 'FR' };
    return { address: t || 'Non renseignée', postal_code: '', city: '', country_alpha2: 'FR' };
  }

  function clientDe(patient) {
    const p = patient || {};
    return {
      first_name: String(p.prenom || '').trim() || '-',
      last_name: String(p.nom || '').trim() || 'Patient sans fiche',
      billing_address: adresseDecoupee(p.adresse)
    };
  }

  /** Client Pennylane du patient (créé au besoin, mis à jour si la fiche a changé depuis). patient null = « sans fiche ». */
  async function clientPennylane(jeton, u, patient) {
    const lien = patient
      ? await base.une('select * from pennylane_clients where utilisateur_id = $1 and patient_id = $2', [u, patient.id])
      : await base.une('select * from pennylane_clients where utilisateur_id = $1 and patient_id is null', [u]);
    if (lien) {
      if (!patient || !patient.modifie_le || new Date(patient.modifie_le) <= new Date(lien.synchro_le)) return Number(lien.pennylane_id);
      try {
        await appel(jeton, 'PUT', `/individual_customers/${lien.pennylane_id}`, clientDe(patient));
        await base.requete('update pennylane_clients set synchro_le = now() where id = $1', [lien.id]);
        return Number(lien.pennylane_id);
      } catch (e) {
        if (e.statutPennylane !== 404) throw e;
        await base.requete('delete from pennylane_clients where id = $1', [lien.id]); // supprimé dans Pennylane : on le recrée
      }
    }
    const cree = await appel(jeton, 'POST', '/individual_customers', Object.assign(clientDe(patient), {
      external_reference: `podologiciel-${patient ? patient.id : 'sans-fiche-' + u}`.slice(0, 100)
    }));
    if (!cree || !cree.id) throw erreur(502, 'Pennylane n’a pas renvoyé l’identifiant du client créé.');
    await base.requete(`insert into pennylane_clients (utilisateur_id, patient_id, pennylane_id) values ($1, $2, $3)
      on conflict do nothing`, [u, patient ? patient.id : null, cree.id]);
    return cree.id;
  }

  /* ---------- Factures ---------- */

  /** Lignes Pennylane : TVA « exempt », la somme des lignes est exactement le total de la facture. */
  function lignesDe(f) {
    const actes = (f.actes || []).filter(a => Number(a.quantite) && a.label !== undefined);
    if (!actes.length) throw erreur(400, `Facture ${f.numero} : aucun acte à envoyer.`);
    const lignes = actes.map(a => ({
      label: String(a.label || 'Acte').slice(0, 2000),
      quantity: Number(a.quantite),
      raw_currency_unit_price: montant(Number(a.prix)),
      unit: 'piece',
      vat_rate: 'exempt',
      currency_tax: '0.00',
      montant: Math.round(Number(a.quantite) * Number(a.prix) * 100)
    }));
    const ecart = Math.round(Number(f.total) * 100) - lignes.reduce((s, l) => s + l.montant, 0);
    lignes[lignes.length - 1].montant += ecart;
    return lignes.map(({ montant: c, ...l }) => Object.assign(l, { currency_amount: (c / 100).toFixed(2) }));
  }

  const etat = (reg, aEnvoyer) => ({
    connecte: !!reg, entreprise: reg ? reg.entreprise : null, envoiAuto: reg ? reg.envoi_auto : true,
    depuis: reg ? reg.depuis : new Date().toISOString().slice(0, 10), connecteLe: reg ? reg.connecte_le : null, aEnvoyer: aEnvoyer || 0
  });

  async function nombreAEnvoyer(u, reg) {
    if (!reg) return 0;
    const l = await base.une(`select count(*)::int as n from factures where utilisateur_id = $1 and numero is not null
      and pennylane_id is null and supprime_le is null and date >= $2`, [u, reg.depuis]);
    return l.n;
  }

  /* ---------- Routes ---------- */

  r.get('/api/pennylane', async (req, ctx) => {
    const reg = await reglagesDe(uid(ctx));
    return etat(reg, await nombreAEnvoyer(uid(ctx), reg));
  });

  // Connexion (jeton) et réglages (envoiAuto, depuis)
  r.put('/api/pennylane', async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    let reg = await reglagesDe(u);
    const champs = {};
    if (corps.envoiAuto !== undefined) champs.envoi_auto = !!corps.envoiAuto;
    if (corps.depuis !== undefined) {
      if (!d.DATE.test(String(corps.depuis || ''))) throw erreur(400, 'Date de départ : AAAA-MM-JJ attendue.');
      champs.depuis = String(corps.depuis);
    }
    if (corps.jeton !== undefined) {
      const jeton = String(corps.jeton || '').trim();
      if (jeton.length < 10 || jeton.length > 500 || /\s/.test(jeton)) throw erreur(400, 'Clé d’API Pennylane invalide : copie-la en entier depuis Pennylane.');
      const moi = await appel(jeton, 'GET', '/me');
      champs.jeton = chiffrer(jeton);
      champs.entreprise = String((moi && moi.company && moi.company.name) || (moi && moi.user && moi.user.email) || 'Pennylane').slice(0, 200);
      if (reg) champs.connecte_le = new Date();
    } else if (!reg) throw erreur(400, 'Colle d’abord ta clé d’API Pennylane.');
    const cles = Object.keys(champs);
    if (reg && cles.length) {
      reg = await base.une(`update pennylane_reglages set ${cles.map((k, i) => `${k} = $${i + 2}`).join(', ')} where utilisateur_id = $1 returning *`,
        [u, ...cles.map(k => champs[k])]);
    } else if (!reg) {
      reg = await d.inserer('pennylane_reglages', Object.assign({ utilisateur_id: u }, champs));
    }
    if (corps.jeton !== undefined) await journal(ctx, 'pennylane_connecte', u, { entreprise: reg.entreprise });
    return etat(reg, await nombreAEnvoyer(u, reg));
  });

  r.delete('/api/pennylane', async (req, ctx) => {
    const u = uid(ctx);
    await base.requete('delete from pennylane_reglages where utilisateur_id = $1', [u]);
    await journal(ctx, 'pennylane_deconnecte', u, {});
    return etat(null, 0);
  });

  // Envoi d'une facture émise ou d'un avoir : { pdf: base64 du PDF de la facture, forcer?: true après un envoi incertain }
  r.post('/api/pennylane/factures/:id', { limite: 15e6 }, async (req, ctx) => {
    const u = uid(ctx), corps = ctx.corps;
    const f = await d.sienne('factures', ctx.params.id, u, 'Facture');
    if (!f.numero) throw erreur(400, 'Émets la facture avant de l’envoyer à Pennylane.');
    if (f.pennylane_id) throw erreur(409, `La facture ${f.numero} est déjà dans Pennylane.`);
    if (f.pennylane_erreur && f.pennylane_erreur.startsWith(INCERTAIN) && !corps.forcer) {
      throw erreur(409, `Le dernier envoi de ${f.numero} n’a pas eu de réponse : vérifie dans Pennylane qu’elle n’y est pas avant de la renvoyer.`);
    }
    const pdf = Buffer.from(String(corps.pdf || ''), 'base64');
    if (pdf.length < 100 || pdf.length > PDF_MAX || pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw erreur(400, 'Le PDF de la facture est manquant ou illisible.');
    const { jeton } = await jetonDe(u);

    let creditee = null;
    if (f.genre === 'avoir' && f.avoir_de) {
      const orig = await base.une('select numero, pennylane_id from factures where id = $1', [f.avoir_de]);
      if (orig && !orig.pennylane_id) throw erreur(409, `Envoie d’abord la facture ${orig.numero} que cet avoir annule.`);
      creditee = orig && orig.pennylane_id ? Number(orig.pennylane_id) : null;
    }

    // Un seul envoi à la fois pour une facture (deux onglets, double clic)
    const pris = await base.une(`update factures set pennylane_essai_le = now() where id = $1 and pennylane_id is null
      and (pennylane_essai_le is null or pennylane_essai_le < now() - $2::interval) returning id`, [f.id, `${ENVOI_EN_COURS_MS / 1000} seconds`]);
    if (!pris) throw erreur(409, `La facture ${f.numero} est en cours d’envoi.`);

    try {
      const patient = f.patient_id ? await base.une('select id, nom, prenom, adresse, modifie_le from patients where id = $1', [f.patient_id]) : null;
      const clientId = await clientPennylane(jeton, u, patient);
      const lignes = lignesDe(f);
      const formulaire = new FormData();
      const nomFichier = `${f.genre === 'avoir' ? 'Avoir' : 'Facture'}_${f.numero}.pdf`;
      formulaire.append('file', new Blob([pdf], { type: 'application/pdf' }), nomFichier);
      const fichier = await appel(jeton, 'POST', '/file_attachments', formulaire);
      if (!fichier || !fichier.id) throw erreur(502, 'Pennylane n’a pas renvoyé l’identifiant du PDF envoyé.');
      const total = montant(Number(f.total));
      const facture = await appel(jeton, 'POST', '/customer_invoices/import', Object.assign({
        file_attachment_id: fichier.id,
        customer_id: clientId,
        invoice_number: f.numero,
        external_reference: `podologiciel-${f.id}`,
        date: f.date,
        deadline: f.date,
        currency: 'EUR',
        currency_amount_before_tax: total,
        currency_tax: '0.00',
        currency_amount: total,
        invoice_lines: lignes
      }, creditee ? { credited_invoice_id: creditee } : {}));
      if (!facture || !facture.id) throw erreur(502, 'Pennylane n’a pas renvoyé l’identifiant de la facture importée.');
      const l = await base.une(`update factures set pennylane_id = $2, pennylane_envoye_le = now(), pennylane_erreur = null, pennylane_essai_le = null
        where id = $1 returning *`, [f.id, facture.id]);
      await journal(ctx, 'facture_pennylane', f.id, { numero: f.numero, pennylane: facture.id });
      return { id: l.id, numero: l.numero, pennylaneId: Number(l.pennylane_id), pennylaneEnvoyeLe: l.pennylane_envoye_le, pennylaneErreur: null };
    } catch (e) {
      const message = String(e.message || e).slice(0, 1000);
      await base.requete('update factures set pennylane_erreur = $2, pennylane_essai_le = null where id = $1', [f.id, message]);
      throw e.statut ? e : erreur(502, message);
    }
  });

  // Mise à jour des clients Pennylane des patients déjà envoyés dont la fiche a changé (par lots de 50)
  r.post('/api/pennylane/patients/synchro', async (req, ctx) => {
    const u = uid(ctx);
    const { jeton } = await jetonDe(u);
    const a = await base.lignes(`select p.id, p.nom, p.prenom, p.adresse, p.modifie_le from pennylane_clients c join patients p on p.id = c.patient_id
      where c.utilisateur_id = $1 and p.supprime_le is null and p.modifie_le > c.synchro_le order by p.modifie_le limit 51`, [u]);
    const lot = a.slice(0, 50);
    for (const p of lot) await clientPennylane(jeton, u, p);
    return { misAJour: lot.length, restants: a.length > 50 };
  });
};

module.exports.variables = [
  { cle: 'PENNYLANE_API_URL', type: 'url', role: 'Adresse de l’API Pennylane v2 (vide = https://app.pennylane.com/api/external/v2) ; à changer seulement pour un bac à sable ou des tests' }
];
