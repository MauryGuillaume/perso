/* ==========================================================================
   serveur.js — API de PodoLogiciel (cabinet de groupe), sans dépendance npm
   Node 20+ et PostgreSQL 14+. Sert aussi l'app (dossier public/).

   Sécurité :
   - connexion par e-mail + mot de passe + code de double authentification
     (TOTP), session dans un cookie HttpOnly, Secure, SameSite=Strict ;
     déconnexion après 30 min d'inactivité, et au plus tard après 12 h ;
   - 5 essais ratés : compte bloqué 15 min ; limite aussi par adresse IP ;
   - écritures : en-tête X-Podo et origine vérifiés (contre le CSRF) ;
   - rôles : le praticien ne voit le dossier médical que de ses patients
     (référent) ou de ceux qu'on lui partage ; le secrétariat ne voit que
     l'identité, l'agenda et les factures ; l'administrateur gère les comptes ;
   - données de santé chiffrées en AES-256-GCM avant d'aller en base, la clé
     (PODO_CLE) ne quitte pas le serveur ;
   - factures numérotées par le serveur, non modifiables (sauf le paiement),
     non supprimables ; journal d'accès en ajout seul (règles dans la base).
   ========================================================================== */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const S = require('./securite');
const { Pool, migrer } = require('./db');

const CONF = {
  port: Number(process.env.PORT) || 8080,
  origine: String(process.env.PODO_ORIGINE || 'http://localhost:8080').replace(/\/+$/, ''),
  inactivite: Math.max(5, Number(process.env.PODO_INACTIVITE_MIN) || 30),
  nom: process.env.PODO_NOM || 'PodoLogiciel',
  proxy: process.env.PODO_PROXY === '1',       // derrière un proxy (Nginx, hébergeur) : IP lue dans X-Forwarded-For
  public: path.join(__dirname, 'public')
};
const SECURISE = CONF.origine.startsWith('https://');
const COOKIE = SECURISE ? '__Host-podo' : 'podo';   // en local (http), le préfixe __Host- n'est pas permis

let db;

/* ======================= Outils HTTP ======================= */
class Erreur extends Error { constructor(statut, message, extra) { super(message); this.statut = statut; this.extra = extra; } }

// L'app ne charge rien d'ailleurs : polices et icônes sont dans public/vendor
const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self'", "img-src 'self' data:", "connect-src 'self'",
  "base-uri 'self'", "form-action 'self'", "object-src 'none'", "frame-ancestors 'none'"].join('; ');

function entetes(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CSP);
  if (SECURISE) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
function json(res, statut, corps, plus) {
  res.writeHead(statut, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, plus || {}));
  res.end(JSON.stringify(corps));
}
function lireCorps(req) {
  return new Promise((ok, ko) => {
    let taille = 0; const morceaux = [];
    req.on('data', d => { taille += d.length; if (taille > 1024 * 1024) { ko(new Erreur(413, 'Requête trop grosse.')); req.destroy(); } else morceaux.push(d); });
    req.on('end', () => {
      if (!taille) return ok({});
      try { const o = JSON.parse(Buffer.concat(morceaux).toString('utf8')); ok(o && typeof o === 'object' && !Array.isArray(o) ? o : {}); }
      catch (e) { ko(new Erreur(400, 'JSON invalide.')); }
    });
    req.on('error', ko);
  });
}
const ipDe = req => String((CONF.proxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '').slice(0, 64);
function cookies(req) {
  const o = {};
  String(req.headers.cookie || '').split(';').forEach(c => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i).trim()] = c.slice(i + 1).trim(); });
  return o;
}
const cookieSession = (jeton, age) => `${COOKIE}=${jeton}; Path=/; HttpOnly; SameSite=Strict${SECURISE ? '; Secure' : ''}; Max-Age=${age}`;

/* ======================= Validation ======================= */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const estUuid = v => typeof v === 'string' && UUID.test(v);
const texte = (v, max) => String(v == null ? '' : v).slice(0, max);
const estDate = v => typeof v === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v) && !isNaN(Date.parse(v + 'T12:00:00Z'));
function extraire(b, schema) {
  const o = {};
  Object.keys(schema).forEach(k => { if (k in b) o[k] = texte(b[k], schema[k]); });
  return o;
}
const IDENTITE = { nom: 100, prenom: 100, naissance: 10, sexe: 20, telephone: 40, email: 200, medecin: 200, activite: 200, adresse: 500 };
const MEDICAL = { antecedents: 5000, traitements: 5000, allergies: 2000, notes: 10000 };
const BILAN = { pointure: 20, morphologie: 40, statique: 40, motif: 5000, douleurs: 5000, cutane: 5000, marche: 5000, conclusion: 5000, traitement: 5000 };
const PROFIL = { cabinet: 200, adresse: 500, identifiants: 200, mention: 200, telephone: 40 };
const STATUTS_RDV = ['prévu', 'honoré', 'absent', 'annulé'];
const MODES = ['Carte bancaire', 'Espèces', 'Chèque', 'Virement'];
const nomPatient = p => p ? ((p.nom || '').toUpperCase() + ' ' + (p.prenom || '')).trim() : '';

/* ======================= Journal d'accès ======================= */
async function tracer(u, action, detail, ip, t) {
  await (t || db).requete('insert into journal (utilisateur_id, email, action, detail, ip) values ($1, $2, $3, $4, $5)',
    [u && u.id || null, texte(u && u.email, 200), texte(action, 80), detail ? S.chiffrer(texte(detail, 200), 'journal') : '', ip || '']);
}

/* ======================= Sessions ======================= */
async function lireSession(req) {
  const j = cookies(req)[COOKIE];
  if (!j || j.length > 100) return null;
  const s = await db.ligne(`select s.jeton, s.totp_ok, s.cree_le, s.vu_le, u.id, u.email, u.nom, u.role, u.code, u.profil, u.doit_changer, u.actif
    from sessions s join utilisateurs u on u.id = s.utilisateur_id
    where s.jeton = $1 and s.vu_le > now() - make_interval(mins => $2::int) and s.cree_le > now() - interval '12 hours'`, [S.empreinte(j), CONF.inactivite]);
  if (!s || !s.actif) return null;
  // Étape « code » : 5 minutes pour saisir le code après le mot de passe
  if (!s.totp_ok && Date.parse(s.cree_le) < Date.now() - 5 * 60000) return null;
  if (Date.now() - Date.parse(s.vu_le) > 60000) await db.requete('update sessions set vu_le = now() where jeton = $1', [s.jeton]);
  return s;
}
async function ouvrirSession(res, u, totpOk, ip) {
  const j = S.nouveauJeton();
  await db.requete('insert into sessions (jeton, utilisateur_id, totp_ok, ip) values ($1, $2, $3, $4)', [S.empreinte(j), u.id, totpOk, ip]);
  res.setHeader('Set-Cookie', cookieSession(j, 12 * 3600));
}
const moiDe = u => ({ id: u.id, email: u.email, nom: u.nom, role: u.role, code: u.code, profil: u.profil || {}, doit_changer: !!u.doit_changer });

/* Essais ratés par adresse IP (en mémoire) : 30 sur 15 minutes */
const essaisIp = new Map();
function verifierIp(ip) {
  const e = essaisIp.get(ip);
  if (e && e.depuis > Date.now() - 15 * 60000 && e.n >= 30) throw new Erreur(429, 'Trop d’essais depuis cette adresse : réessaie dans 15 minutes.');
}
function echecIp(ip) {
  const e = essaisIp.get(ip);
  if (!e || e.depuis < Date.now() - 15 * 60000) essaisIp.set(ip, { n: 1, depuis: Date.now() }); else e.n++;
}
async function echecCompte(id) {
  // Au 5e essai raté : blocage 15 minutes
  await db.requete(`update utilisateurs set echecs = case when echecs >= 4 then 0 else echecs + 1 end,
    bloque_jusqua = case when echecs >= 4 then now() + interval '15 minutes' else bloque_jusqua end where id = $1`, [id]);
}
const bloque = u => u && u.bloque_jusqua && Date.parse(u.bloque_jusqua) > Date.now();

/* ======================= Équipe et droits ======================= */
const soignant = u => u.role === 'praticien' || u.role === 'admin';
const voitTout = u => u.role !== 'praticien';     // agenda et factures de tout le cabinet
const accesMedical = (u, p) => soignant(u) && (p.praticien_id === u.id || (p.partage || []).includes(u.id));
const equipe = () => db.lignes('select id, nom, role, code, profil, actif from utilisateurs order by nom');
async function praticienValide(id) {
  if (!estUuid(id)) return null;
  return db.ligne("select id, code from utilisateurs where id = $1 and actif and role in ('praticien', 'admin')", [id]);
}
async function partageValide(liste) {
  const ids = (Array.isArray(liste) ? liste : []).filter(estUuid).slice(0, 20);
  if (!ids.length) return [];
  return (await db.lignes("select id from utilisateurs where id = any($1::uuid[]) and role in ('praticien', 'admin')", ['{' + ids.join(',') + '}'])).map(x => x.id);
}

/* ======================= Lignes vers l'app ======================= */
function versPatient(u, p) {
  const id = S.dechiffrer(p.identite, 'patients:' + p.id + ':identite') || {};
  const med = accesMedical(u, p) ? Object.assign({ antecedents: '', traitements: '', allergies: '', notes: '' }, S.dechiffrer(p.medical, 'patients:' + p.id + ':medical')) : null;
  return Object.assign({}, id, med || {}, { id: p.id, referent: p.praticien_id, partage: p.partage || [], archive: !!p.archive,
    cree_le: p.cree_le, modifie_le: p.modifie_le, acces: med ? 'complet' : 'identite' });
}
const versBilan = b => Object.assign({}, S.dechiffrer(b.donnees, 'bilans:' + b.id) || {}, { id: b.id, patient: b.patient_id, auteur: b.auteur_id, date: b.date, cree_le: b.cree_le, modifie_le: b.modifie_le });
const versRdv = r => Object.assign({}, S.dechiffrer(r.donnees, 'rdv:' + r.id) || {}, { id: r.id, praticien: r.praticien_id, patient: r.patient_id, date: r.date, heure: r.heure, duree: r.duree, statut: r.statut, cree_le: r.cree_le });
const versFacture = f => Object.assign({}, S.dechiffrer(f.donnees, 'factures:' + f.id) || {}, { id: f.id, praticien: f.praticien_id, patient: f.patient_id, numero: f.numero,
  date: f.date, total: Number(f.total), statut: f.statut, mode: f.mode, paye_le: f.paye_le || '', cree_le: f.cree_le });

const SQL = {
  patient: 'select id, praticien_id, partage, archive, cree_le, modifie_le, identite, medical from patients',
  bilan: 'select b.id, b.patient_id, b.auteur_id, b.date, b.cree_le, b.modifie_le, b.donnees, p.praticien_id, p.partage from bilans b join patients p on p.id = b.patient_id',
  rdv: 'select id, praticien_id, patient_id, date, heure, duree, statut, cree_le, donnees from rdv',
  facture: 'select id, praticien_id, patient_id, numero, date, total, statut, mode, paye_le, cree_le, donnees from factures'
};

async function toutesDonnees(u) {
  const [patients, bilans, rdv, factures, eq] = await Promise.all([
    db.lignes(SQL.patient + ' order by cree_le'),
    soignant(u) ? db.lignes(SQL.bilan + ' where p.praticien_id = $1 or $1 = any(p.partage) order by b.date', [u.id]) : [],
    voitTout(u) ? db.lignes(SQL.rdv + ' order by date, heure') : db.lignes(SQL.rdv + ' where praticien_id = $1 order by date, heure', [u.id]),
    voitTout(u) ? db.lignes(SQL.facture + ' order by numero') : db.lignes(SQL.facture + ' where praticien_id = $1 order by numero', [u.id]),
    equipe()
  ]);
  return { moi: moiDe(u), equipe: eq, patients: patients.map(p => versPatient(u, p)), bilans: bilans.map(versBilan), rdv: rdv.map(versRdv), factures: factures.map(versFacture) };
}

/* ======================= Patients ======================= */
async function patientDe(id) {
  if (!estUuid(id)) throw new Erreur(404, 'Dossier introuvable.');
  const p = await db.ligne(SQL.patient + ' where id = $1', [id]);
  if (!p) throw new Erreur(404, 'Dossier introuvable.');
  return p;
}
const T = {};
T.patients = {
  async creer(u, b, ip) {
    const id = estUuid(b.id) ? b.id.toLowerCase() : crypto.randomUUID();
    const ref = await praticienValide(b.referent) || (soignant(u) ? { id: u.id } : null);
    if (!ref) throw new Erreur(400, 'Choisis le praticien référent du patient.');
    const partage = (await partageValide(b.partage)).filter(x => x !== ref.id);
    const identite = Object.assign(extraire(b, IDENTITE), { consentement: !!b.consentement, consentement_le: b.consentement ? new Date().toISOString() : '' });
    if (!identite.nom || !identite.prenom) throw new Erreur(400, 'Nom et prénom obligatoires.');
    const p = { id, praticien_id: ref.id, partage };
    const medical = accesMedical(u, p) ? extraire(b, MEDICAL) : {};
    await db.requete('insert into patients (id, praticien_id, partage, cree_par, identite, medical) values ($1, $2, $3::uuid[], $4, $5, $6)',
      [id, ref.id, '{' + partage.join(',') + '}', u.id, S.chiffrer(identite, 'patients:' + id + ':identite'), S.chiffrer(medical, 'patients:' + id + ':medical')]);
    await tracer(u, 'création du dossier', nomPatient(identite), ip);
    return versPatient(u, await patientDe(id));
  },
  async modifier(u, id, b, ip) {
    const p = await patientDe(id);
    const med = accesMedical(u, p);
    const responsable = p.praticien_id === u.id || u.role === 'admin';
    const identite = Object.assign(S.dechiffrer(p.identite, 'patients:' + id + ':identite') || {}, extraire(b, IDENTITE));
    if ('consentement' in b) {
      if (b.consentement && !identite.consentement) identite.consentement_le = new Date().toISOString();
      identite.consentement = !!b.consentement;
    }
    if (!identite.nom || !identite.prenom) throw new Erreur(400, 'Nom et prénom obligatoires.');
    let medical = p.medical;
    if (med && Object.keys(MEDICAL).some(k => k in b))
      medical = S.chiffrer(Object.assign(S.dechiffrer(p.medical, 'patients:' + id + ':medical') || {}, extraire(b, MEDICAL)), 'patients:' + id + ':medical');
    let ref = p.praticien_id, partage = p.partage || [];
    if (('referent' in b && b.referent !== p.praticien_id) || ('partage' in b && JSON.stringify(b.partage) !== JSON.stringify(partage))) {
      if (!responsable) throw new Erreur(403, 'Seul le praticien référent (ou l’administrateur) change le référent et le partage.');
      if ('referent' in b) { const r = await praticienValide(b.referent); if (!r) throw new Erreur(400, 'Praticien référent inconnu.'); ref = r.id; }
      if ('partage' in b) partage = await partageValide(b.partage);
      partage = partage.filter(x => x !== ref);
    }
    let archive = p.archive;
    if ('archive' in b && !!b.archive !== p.archive) {
      if (!med && u.role !== 'admin') throw new Erreur(403, 'Archivage réservé au praticien du patient.');
      archive = !!b.archive;
    }
    await db.requete('update patients set praticien_id = $2, partage = $3::uuid[], archive = $4, identite = $5, medical = $6, modifie_le = now() where id = $1',
      [id, ref, '{' + partage.join(',') + '}', archive, S.chiffrer(identite, 'patients:' + id + ':identite'), medical]);
    await tracer(u, archive !== p.archive ? (archive ? 'archivage' : 'désarchivage') : 'modification du dossier', nomPatient(identite), ip);
    return versPatient(u, await patientDe(id));
  },
  async supprimer(u, id, ip) {
    const p = await patientDe(id);
    if (p.praticien_id !== u.id && u.role !== 'admin') throw new Erreur(403, 'Seul le praticien référent (ou l’administrateur) supprime un dossier.');
    await db.requete('delete from patients where id = $1', [id]);
    await tracer(u, 'suppression du dossier', nomPatient(S.dechiffrer(p.identite, 'patients:' + id + ':identite')), ip);
  }
};

/* ======================= Bilans ======================= */
function donneesBilan(b, avant) {
  const d = Object.assign(avant || {}, extraire(b, BILAN));
  if ('reperes' in b) d.reperes = (Array.isArray(b.reperes) ? b.reperes : []).slice(0, 60).map(r => ({
    x: Math.round(Number(r && r.x) || 0), y: Math.round(Number(r && r.y) || 0), cote: r && r.cote === 'droit' ? 'droit' : 'gauche', texte: texte(r && r.texte, 300) }));
  return d;
}
async function bilanDe(u, id) {
  if (!estUuid(id)) throw new Erreur(404, 'Bilan introuvable.');
  const b = await db.ligne(SQL.bilan + ' where b.id = $1', [id]);
  if (!b || !accesMedical(u, b)) throw new Erreur(404, 'Bilan introuvable.');
  return b;
}
T.bilans = {
  async creer(u, b, ip) {
    const p = await patientDe(b.patient);
    if (!accesMedical(u, p)) throw new Erreur(403, 'Ce dossier médical ne t’est pas partagé.');
    if (!estDate(b.date)) throw new Erreur(400, 'Date du bilan invalide.');
    const id = estUuid(b.id) ? b.id.toLowerCase() : crypto.randomUUID();
    await db.requete('insert into bilans (id, patient_id, auteur_id, date, donnees) values ($1, $2, $3, $4, $5)',
      [id, p.id, u.id, b.date, S.chiffrer(donneesBilan(b), 'bilans:' + id)]);
    await tracer(u, 'création d’un bilan', nomPatient(S.dechiffrer(p.identite, 'patients:' + p.id + ':identite')), ip);
    return versBilan(await bilanDe(u, id));
  },
  async modifier(u, id, b, ip) {
    const x = await bilanDe(u, id);
    const date = estDate(b.date) ? b.date : x.date;
    await db.requete('update bilans set date = $2, donnees = $3, modifie_le = now() where id = $1',
      [id, date, S.chiffrer(donneesBilan(b, S.dechiffrer(x.donnees, 'bilans:' + id)), 'bilans:' + id)]);
    await tracer(u, 'modification d’un bilan', '', ip);
    return versBilan(await bilanDe(u, id));
  },
  async supprimer(u, id, ip) {
    await bilanDe(u, id);
    await db.requete('delete from bilans where id = $1', [id]);
    await tracer(u, 'suppression d’un bilan', '', ip);
  }
};

/* ======================= Rendez-vous ======================= */
async function praticienPour(u, demande, defaut) {
  if (u.role === 'praticien') {
    if (demande && demande !== u.id) throw new Erreur(403, 'Tu ne peux agir que pour toi-même.');
    return { id: u.id };
  }
  const p = await praticienValide(demande || defaut);
  if (!p) throw new Erreur(400, 'Choisis le praticien.');
  return p;
}
async function rdvDe(u, id) {
  if (!estUuid(id)) throw new Erreur(404, 'Rendez-vous introuvable.');
  const r = await db.ligne(SQL.rdv + ' where id = $1', [id]);
  if (!r || (!voitTout(u) && r.praticien_id !== u.id)) throw new Erreur(404, 'Rendez-vous introuvable.');
  return r;
}
function champsRdv(b, avant) {
  const r = Object.assign({}, avant);
  if ('date' in b) { if (!estDate(b.date)) throw new Erreur(400, 'Date invalide.'); r.date = b.date; }
  if ('heure' in b) { if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(String(b.heure))) throw new Erreur(400, 'Heure invalide.'); r.heure = b.heure; }
  if ('duree' in b) { const d = Math.round(Number(b.duree)); if (!(d >= 5 && d <= 600)) throw new Erreur(400, 'Durée invalide.'); r.duree = d; }
  if ('statut' in b) { if (!STATUTS_RDV.includes(b.statut)) throw new Erreur(400, 'Statut invalide.'); r.statut = b.statut; }
  return r;
}
T.rdv = {
  async creer(u, b, ip) {
    const p = await patientDe(b.patient);
    const pr = await praticienPour(u, b.praticien, p.praticien_id);
    const r = champsRdv(Object.assign({ statut: 'prévu' }, b), {});
    if (!r.date || !r.heure || !r.duree) throw new Erreur(400, 'Date, heure et durée obligatoires.');
    const id = estUuid(b.id) ? b.id.toLowerCase() : crypto.randomUUID();
    await db.requete('insert into rdv (id, praticien_id, patient_id, date, heure, duree, statut, cree_par, donnees) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, pr.id, p.id, r.date, r.heure, r.duree, r.statut, u.id, S.chiffrer({ motif: texte(b.motif, 300) }, 'rdv:' + id)]);
    await tracer(u, 'création d’un rendez-vous', nomPatient(S.dechiffrer(p.identite, 'patients:' + p.id + ':identite')), ip);
    return versRdv(await rdvDe(u, id));
  },
  async modifier(u, id, b, ip) {
    const x = await rdvDe(u, id);
    const r = champsRdv(b, { date: x.date, heure: x.heure, duree: x.duree, statut: x.statut });
    const pr = 'praticien' in b ? await praticienPour(u, b.praticien) : { id: x.praticien_id };
    const donnees = 'motif' in b ? S.chiffrer({ motif: texte(b.motif, 300) }, 'rdv:' + id) : x.donnees;
    await db.requete('update rdv set praticien_id = $2, date = $3, heure = $4, duree = $5, statut = $6, donnees = $7, modifie_le = now() where id = $1',
      [id, pr.id, r.date, r.heure, r.duree, r.statut, donnees]);
    await tracer(u, 'rendez-vous ' + r.statut, '', ip);
    return versRdv(await rdvDe(u, id));
  },
  async supprimer(u, id, ip) {
    await rdvDe(u, id);
    await db.requete('delete from rdv where id = $1', [id]);
    await tracer(u, 'suppression d’un rendez-vous', '', ip);
  }
};

/* ======================= Factures ======================= */
async function factureDe(u, id) {
  if (!estUuid(id)) throw new Erreur(404, 'Facture introuvable.');
  const f = await db.ligne(SQL.facture + ' where id = $1', [id]);
  if (!f || (!voitTout(u) && f.praticien_id !== u.id)) throw new Erreur(404, 'Facture introuvable.');
  return f;
}
T.factures = {
  async creer(u, b, ip) {
    const p = await patientDe(b.patient);
    const pr = await praticienPour(u, b.praticien, p.praticien_id);
    const lignes = (Array.isArray(b.lignes) ? b.lignes : []).slice(0, 50).map(l => ({
      libelle: texte(l && l.libelle, 120), quantite: Math.min(100, Math.max(1, Math.round(Number(l && l.quantite) || 1))),
      prix: Math.round(Math.min(100000, Math.max(0, Number(l && l.prix) || 0)) * 100) / 100 }));
    if (!lignes.length) throw new Erreur(400, 'Ajoute au moins un acte.');
    const total = Math.round(lignes.reduce((s, l) => s + l.quantite * l.prix, 0) * 100) / 100;
    const statut = b.statut === 'payée' ? 'payée' : 'en attente';
    const mode = MODES.includes(b.mode) ? b.mode : MODES[0];
    const id = estUuid(b.id) ? b.id.toLowerCase() : crypto.randomUUID();
    const identite = S.dechiffrer(p.identite, 'patients:' + p.id + ':identite') || {};
    const numero = await db.transaction(async t => {
      // Numéro continu par praticien et par année, donné par la base (deux postes ne peuvent pas prendre le même)
      const pra = await t.ligne('select code, (now() at time zone \'Europe/Paris\')::date as jour from utilisateurs where id = $1', [pr.id]);
      const an = Number(String(pra.jour).slice(0, 4));
      const n = await t.requete('insert into compteurs (praticien_id, annee, valeur) values ($1, $2, 1) on conflict (praticien_id, annee) do update set valeur = compteurs.valeur + 1 returning valeur', [pr.id, an]);
      const num = 'F-' + an + '-' + (pra.code ? pra.code + '-' : '') + String(n.lignes[0][0]).padStart(4, '0');
      await t.requete(`insert into factures (id, praticien_id, patient_id, numero, date, total, statut, mode, paye_le, cree_par, donnees)
        values ($1, $2, $3, $4, $5, $6, $7, $8, ${statut === 'payée' ? 'now()' : 'null'}, $9, $10)`,
        [id, pr.id, p.id, num, pra.jour, total.toFixed(2), statut, mode, u.id,
          S.chiffrer({ lignes, patientNom: nomPatient(identite), patientAdresse: identite.adresse || '' }, 'factures:' + id)]);
      await tracer(u, 'création de facture', num, ip, t);
      return num;
    });
    return Object.assign(versFacture(await factureDe(u, id)), { numero });
  },
  async modifier(u, id, b, ip) {
    const f = await factureDe(u, id);
    const statut = b.statut === 'payée' || b.statut === 'en attente' ? b.statut : f.statut;
    const mode = MODES.includes(b.mode) ? b.mode : f.mode;
    await db.requete(`update factures set statut = $2, mode = $3, paye_le = case when $2 = 'payée' then coalesce(paye_le, now()) else null end where id = $1`, [id, statut, mode]);
    await tracer(u, 'paiement de facture', f.numero + ' : ' + statut, ip);
    return versFacture(await factureDe(u, id));
  },
  async supprimer() { throw new Erreur(405, 'Une facture émise ne se supprime pas (obligation comptable).'); }
};

/* ======================= Comptes (administrateur) ======================= */
const COMPTE = 'select id, email, nom, role, code, actif, totp_actif, doit_changer, cree_le from utilisateurs';
function champsCompte(b, avant) {
  const c = Object.assign({}, avant);
  if ('email' in b) { c.email = texte(b.email, 200).trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) throw new Erreur(400, 'E-mail invalide.'); }
  if ('nom' in b) { c.nom = texte(b.nom, 100).trim(); if (!c.nom) throw new Erreur(400, 'Nom obligatoire.'); }
  if ('role' in b) { if (!['admin', 'praticien', 'secretariat'].includes(b.role)) throw new Erreur(400, 'Rôle invalide.'); c.role = b.role; }
  if ('code' in b) { c.code = texte(b.code, 6).trim().toUpperCase(); if (c.code && !/^[A-Z0-9]{2,6}$/.test(c.code)) throw new Erreur(400, 'Initiales : 2 à 6 lettres ou chiffres.'); }
  if (c.role !== 'secretariat' && !c.code) throw new Erreur(400, 'Donne des initiales au praticien (elles numérotent ses factures).');
  return c;
}
async function creerCompte(b, auteur, ip) {
  const c = champsCompte(b, { role: 'praticien', code: '' });
  if (!c.email || !c.nom) throw new Erreur(400, 'E-mail et nom obligatoires.');
  const mdp = S.mdpProvisoire();
  const r = { id: crypto.randomUUID() };
  await db.requete('insert into utilisateurs (id, email, nom, role, code, mdp) values ($1, $2, $3, $4, $5, $6)', [r.id, c.email, c.nom, c.role, c.code, S.hacherMdp(mdp)]);
  if (auteur) await tracer(auteur, 'création de compte', c.email + ' (' + c.role + ')', ip);
  return { compte: await db.ligne(COMPTE + ' where id = $1', [r.id]), mdp };
}

/* ======================= Routes ======================= */
async function api(req, res, url) {
  const ip = ipDe(req), m = req.method, chemin = url.pathname;
  if (m !== 'GET') {
    // Contre le CSRF : en-tête que seul le code de l'app envoie, et origine attendue
    if (req.headers['x-podo'] !== '1') throw new Erreur(403, 'En-tête X-Podo manquant.');
    if (req.headers.origin && req.headers.origin !== CONF.origine) throw new Erreur(403, 'Origine refusée.');
  }
  if (chemin === '/api/sante' && m === 'GET') { await db.requete('select 1'); return json(res, 200, { ok: true }); }

  /* ---------- Connexion ---------- */
  if (chemin === '/api/connexion' && m === 'POST') {
    verifierIp(ip);
    const b = await lireCorps(req);
    const email = texte(b.email, 200).trim().toLowerCase();
    const u = await db.ligne('select id, email, nom, role, mdp, actif, totp_actif, bloque_jusqua from utilisateurs where email = $1', [email]);
    if (bloque(u)) { S.verifierMdp(b.mdp, null); throw new Erreur(429, 'Compte bloqué 15 minutes après 5 essais ratés.'); }
    if (!S.verifierMdp(texte(b.mdp, 200), u && u.mdp) || !u.actif) {
      echecIp(ip);
      if (u) await echecCompte(u.id);
      await tracer(u || { email }, 'échec de connexion', '', ip);
      throw new Erreur(401, 'E-mail ou mot de passe incorrect.');
    }
    await ouvrirSession(res, u, false, ip);
    if (u.totp_actif) return json(res, 200, { etape: 'totp' });
    // Première connexion : on prépare la double authentification (secret à ajouter dans l'application d'authentification)
    const secret = S.nouveauSecretTotp();
    await db.requete('update utilisateurs set totp = $2, totp_pas = 0 where id = $1', [u.id, S.chiffrer(secret, 'utilisateurs:' + u.id + ':totp')]);
    return json(res, 200, { etape: 'enrolement', secret, uri: S.lienTotp(secret, u.email, CONF.nom) });
  }
  if (chemin === '/api/totp' && m === 'POST') {
    verifierIp(ip);
    const s = await lireSession(req);
    if (!s) throw new Erreur(401, 'Session expirée : saisis à nouveau ton mot de passe.');
    const b = await lireCorps(req);
    const u = await db.ligne('select id, email, totp, totp_actif, totp_pas, bloque_jusqua from utilisateurs where id = $1', [s.id]);
    if (bloque(u)) throw new Erreur(429, 'Compte bloqué 15 minutes après 5 essais ratés.');
    const pas = u.totp ? S.verifierTotp(S.dechiffrer(u.totp, 'utilisateurs:' + u.id + ':totp'), b.code, u.totp_pas) : -1;
    if (pas < 0) {
      echecIp(ip); await echecCompte(u.id);
      await tracer(u, 'code de double authentification refusé', '', ip);
      throw new Erreur(401, 'Code incorrect ou déjà utilisé.');
    }
    await db.requete('update utilisateurs set totp_pas = $2, totp_actif = true, echecs = 0, bloque_jusqua = null where id = $1', [u.id, pas]);
    // Nouvelle session (nouveau jeton) une fois les deux facteurs vérifiés
    await db.requete('delete from sessions where jeton = $1', [s.jeton]);
    await ouvrirSession(res, u, true, ip);
    await tracer(u, u.totp_actif ? 'connexion' : 'double authentification activée, connexion', '', ip);
    return json(res, 200, { moi: moiDe(s) });
  }
  if (chemin === '/api/deconnexion' && m === 'POST') {
    const s = await lireSession(req);
    if (s) { await db.requete('delete from sessions where jeton = $1', [s.jeton]); await tracer(s, 'déconnexion', '', ip); }
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookieSession('', 0) });
  }

  /* ---------- Tout le reste : session complète ---------- */
  const u = await lireSession(req);
  if (!u || !u.totp_ok) throw new Erreur(401, 'Connexion requise.');
  if (chemin === '/api/moi' && m === 'GET') return json(res, 200, { moi: moiDe(u) });
  if (chemin === '/api/mot-de-passe' && m === 'POST') {
    const b = await lireCorps(req);
    const x = await db.ligne('select mdp from utilisateurs where id = $1', [u.id]);
    if (!S.verifierMdp(texte(b.ancien, 200), x.mdp)) { await echecCompte(u.id); throw new Erreur(401, 'Mot de passe actuel incorrect.'); }
    const pb = S.reglesMdp(b.nouveau, u.email) || (b.nouveau === b.ancien ? 'Choisis un mot de passe différent de l’actuel.' : '');
    if (pb) throw new Erreur(400, pb);
    await db.requete('update utilisateurs set mdp = $2, doit_changer = false where id = $1', [u.id, S.hacherMdp(b.nouveau)]);
    await db.requete('delete from sessions where utilisateur_id = $1 and jeton <> $2', [u.id, u.jeton]);
    await tracer(u, 'changement de mot de passe', '', ip);
    return json(res, 200, { moi: moiDe(Object.assign({}, u, { doit_changer: false })) });
  }
  if (u.doit_changer) throw new Erreur(403, 'Change d’abord ton mot de passe provisoire (onglet Mon compte).', { doitChanger: true });

  if (chemin === '/api/moi' && m === 'PATCH') {
    const b = await lireCorps(req);
    const nom = 'nom' in b ? texte(b.nom, 100).trim() || u.nom : u.nom;
    const profil = Object.assign({}, u.profil, extraire(b.profil || {}, PROFIL));
    await db.requete('update utilisateurs set nom = $2, profil = $3::jsonb where id = $1', [u.id, nom, JSON.stringify(profil)]);
    await tracer(u, 'modification du profil', '', ip);
    return json(res, 200, { moi: moiDe(Object.assign({}, u, { nom, profil })) });
  }
  if (chemin === '/api/donnees' && m === 'GET') return json(res, 200, await toutesDonnees(u));

  if (chemin === '/api/journal') {
    if (m === 'POST') {
      const b = await lireCorps(req);
      if (!texte(b.action, 80).trim()) throw new Erreur(400, 'Action manquante.');
      await tracer(u, b.action, b.detail, ip);
      return json(res, 201, { ok: true });
    }
    if (m === 'GET') {
      const l = u.role === 'admin'
        ? await db.lignes('select id, date, email, action, detail, ip from journal order by id desc limit 2000')
        : await db.lignes('select id, date, email, action, detail, ip from journal where utilisateur_id = $1 order by id desc limit 2000', [u.id]);
      return json(res, 200, { journal: l.reverse().map(x => ({ id: String(x.id), date: x.date, qui: x.email, action: x.action, ip: x.ip,
        detail: x.detail ? (() => { try { return S.dechiffrer(x.detail, 'journal'); } catch (e) { return '(illisible)'; } })() : '' })) });
    }
  }

  let r = chemin.match(/^\/api\/comptes(?:\/([0-9a-f-]{36}))?$/);
  if (r) {
    if (u.role !== 'admin') throw new Erreur(403, 'Réservé à l’administrateur du cabinet.');
    if (m === 'GET' && !r[1]) return json(res, 200, { comptes: await db.lignes(COMPTE + ' order by nom') });
    if (m === 'POST' && !r[1]) return json(res, 201, await creerCompte(await lireCorps(req), u, ip));
    if (m === 'PATCH' && r[1]) {
      const b = await lireCorps(req);
      const avant = await db.ligne(COMPTE + ' where id = $1', [r[1]]);
      if (!avant) throw new Erreur(404, 'Compte introuvable.');
      if (avant.id === u.id && (('actif' in b && !b.actif) || ('role' in b && b.role !== 'admin')))
        throw new Erreur(400, 'Tu ne peux pas retirer tes propres droits d’administrateur.');
      const c = champsCompte(b, avant);
      const actif = 'actif' in b ? !!b.actif : avant.actif;
      await db.requete('update utilisateurs set email = $2, nom = $3, role = $4, code = $5, actif = $6 where id = $1', [avant.id, c.email, c.nom, c.role, c.code, actif]);
      let mdp;
      if (b.reinitialiser) {
        // Nouveau mot de passe provisoire et nouvelle double authentification (téléphone perdu, oubli)
        mdp = S.mdpProvisoire();
        await db.requete('update utilisateurs set mdp = $2, doit_changer = true, totp = null, totp_actif = false, totp_pas = 0, echecs = 0, bloque_jusqua = null where id = $1', [avant.id, S.hacherMdp(mdp)]);
      }
      if (b.reinitialiser || !actif) await db.requete('delete from sessions where utilisateur_id = $1', [avant.id]);
      await tracer(u, b.reinitialiser ? 'réinitialisation de compte' : 'modification de compte', c.email, ip);
      return json(res, 200, { compte: await db.ligne(COMPTE + ' where id = $1', [avant.id]), mdp });
    }
  }

  r = chemin.match(/^\/api\/(patients|bilans|rdv|factures)(?:\/([0-9a-f-]{36}))?$/);
  if (r) {
    const t = T[r[1]];
    if (r[1] === 'bilans' && !soignant(u)) throw new Erreur(403, 'Les bilans sont réservés aux praticiens.');
    if (m === 'POST' && !r[2]) return json(res, 201, { ligne: await t.creer(u, await lireCorps(req), ip) });
    if (m === 'PATCH' && r[2]) return json(res, 200, { ligne: await t.modifier(u, r[2].toLowerCase(), await lireCorps(req), ip) });
    if (m === 'DELETE' && r[2]) { await t.supprimer(u, r[2].toLowerCase(), ip); return json(res, 200, { ok: true }); }
  }
  throw new Erreur(404, 'Adresse inconnue.');
}

/* ======================= Fichiers de l'app ======================= */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon' };
function fichier(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { erreur: 'Méthode non autorisée.' });
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const p = path.normalize(path.join(CONF.public, rel));
  if (!p.startsWith(CONF.public + path.sep) || path.basename(p).startsWith('.')) return json(res, 404, { erreur: 'Introuvable.' });
  fs.stat(p, (e, st) => {
    if (e || !st.isFile()) return json(res, 404, { erreur: 'Introuvable.' });
    const ext = path.extname(p);
    // Les fichiers de l'app sont revalidés à chaque ouverture : une mise à jour arrive tout de suite
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': /\.(woff2?|png|ico)$/.test(ext) ? 'public, max-age=604800' : 'no-cache', 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(p).pipe(res);
  });
}

/* ======================= Démarrage ======================= */
function serveur() {
  return http.createServer(async (req, res) => {
    const debut = Date.now();
    entetes(res);
    let url;
    try { url = new URL(req.url, 'http://x'); } catch (e) { return json(res, 400, { erreur: 'Adresse invalide.' }); }
    res.on('finish', () => console.log(new Date().toISOString(), req.method, url.pathname, res.statusCode, (Date.now() - debut) + ' ms'));
    if (!url.pathname.startsWith('/api/')) return fichier(req, res, url);
    try { await api(req, res, url); }
    catch (e) {
      if (e.statut) return json(res, e.statut, Object.assign({ erreur: e.message }, e.extra || {}));
      if (e.code === '23505') return json(res, 409, { erreur: 'Cette valeur existe déjà (e-mail, initiales ou identifiant).' });
      if (e.code === 'P0001') return json(res, 409, { erreur: e.message });
      if (e.code === '23503') return json(res, 409, { erreur: 'Élément lié introuvable ou encore utilisé.' });
      console.error(e);
      json(res, 500, { erreur: 'Erreur interne du serveur.' });
    }
  });
}

async function demarrer() {
  S.chargerCle(process.env.PODO_CLE);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant (voir .env.example).');
  db = new Pool(process.env.DATABASE_URL, Number(process.env.PODO_CONNEXIONS) || 8);
  // La base peut démarrer après l'API (docker compose) : on réessaie pendant 60 s
  for (let i = 0; ; i++) {
    try { await migrer(db); break; }
    catch (e) { if (i >= 30 || /Migration/.test(e.message)) throw e; console.log('Base pas encore prête (' + e.message + '), nouvel essai dans 2 s'); await new Promise(r => setTimeout(r, 2000)); }
  }
  if (!SECURISE) console.warn('ATTENTION : PODO_ORIGINE n’est pas en https. À n’utiliser qu’en local pour essayer.');
  // Ménage des sessions expirées toutes les 10 minutes
  setInterval(() => db.requete("delete from sessions where vu_le < now() - make_interval(mins => $1::int) or cree_le < now() - interval '12 hours'", [CONF.inactivite]).catch(e => console.error(e.message)), 600000).unref();
  serveur().listen(CONF.port, () => console.log(CONF.nom + ' : API prête sur le port ' + CONF.port + ' (' + CONF.origine + ')'));
}

if (require.main === module) demarrer().catch(e => { console.error('Démarrage impossible : ' + e.message); process.exit(1); });
module.exports = { creerCompte, demarrer, Pool, migrer, S, setDb: d => { db = d; } };
