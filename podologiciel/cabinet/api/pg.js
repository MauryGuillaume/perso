/* ==========================================================================
   pg.js — petit client PostgreSQL sans dépendance (Node 18+)
   Gère : TLS, authentification SCRAM-SHA-256 / MD5 / mot de passe,
   requêtes simples (plusieurs instructions, pour les migrations) et
   requêtes paramétrées ($1, $2… : les valeurs ne sont jamais collées
   dans le SQL). Les valeurs reviennent en texte, comme dans psql.
   ========================================================================== */
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

/** Types courants (OID → nom), pour l'affichage. */
const TYPES = {
  16: 'boolean', 17: 'bytea', 20: 'bigint', 21: 'smallint', 23: 'integer', 25: 'text', 114: 'json', 700: 'real', 701: 'double precision',
  1042: 'char', 1043: 'varchar', 1082: 'date', 1083: 'time', 1114: 'timestamp', 1184: 'timestamptz', 1700: 'numeric', 2950: 'uuid', 3802: 'jsonb',
  1009: 'text[]', 1007: 'integer[]', 1015: 'varchar[]'
};

/** Lit une chaîne de connexion postgres://utilisateur:motdepasse@hote:port/base?sslmode=… */
function lireChaine(chaine) {
  const u = new URL(chaine.replace(/^postgres(ql)?:/, 'http:'));
  const ssl = u.searchParams.get('sslmode');
  return {
    hote: u.hostname, port: Number(u.port) || 5432, base: decodeURIComponent(u.pathname.slice(1)) || 'postgres',
    utilisateur: decodeURIComponent(u.username), motdepasse: decodeURIComponent(u.password),
    ssl: ssl ? ssl !== 'disable' : !/^(localhost|127\.0\.0\.1)$/.test(u.hostname), verifier: ssl === 'verify-full' || ssl === 'verify-ca' || !ssl
  };
}

class Client {
  constructor(c) { this.c = c; this.tampon = Buffer.alloc(0); this.attente = []; }

  /* ---------- Connexion ---------- */
  connecter() {
    const c = this.c;
    return new Promise((ok, ko) => {
      const fin = e => { clearTimeout(minuterie); e ? ko(e) : ok(this); };
      const minuterie = setTimeout(() => { this.fermer(); fin(new Error('Délai de connexion dépassé (10 s)')); }, 10000);
      const brut = net.connect({ host: c.hote, port: c.port });
      brut.once('error', e => fin(new Error(`Connexion impossible à ${c.hote}:${c.port} (${e.code || e.message})`)));
      brut.once('connect', () => {
        if (!c.ssl) return this.demarrer(brut).then(() => fin(), fin);
        // Demande TLS (SSLRequest) puis passage en TLS sur la même socket
        const req = Buffer.alloc(8); req.writeInt32BE(8, 0); req.writeInt32BE(80877103, 4);
        brut.write(req);
        brut.once('data', d => {
          if (d[0] !== 0x53) return fin(new Error('Ce serveur n’accepte pas TLS : décoche « Connexion chiffrée » (seulement sur un réseau local).'));
          const s = tls.connect({ socket: brut, servername: net.isIP(c.hote) ? undefined : c.hote, rejectUnauthorized: c.verifier !== false });
          s.once('error', e => fin(new Error('TLS : ' + e.message + (c.verifier !== false ? ' (si le certificat est auto-signé, décoche « Vérifier le certificat »)' : ''))));
          s.once('secureConnect', () => this.demarrer(s).then(() => fin(), fin));
        });
      });
    });
  }

  demarrer(socket) {
    this.s = socket;
    socket.on('data', d => { this.tampon = Buffer.concat([this.tampon, d]); this.lire(); });
    socket.on('error', e => this.echec(e));
    socket.on('close', () => this.echec(new Error('Connexion fermée par le serveur')));
    const params = ['user', this.c.utilisateur, 'database', this.c.base, 'application_name', 'podologiciel', 'client_encoding', 'UTF8'];
    const corps = Buffer.concat([...params.map(p => Buffer.from(p + '\0')), Buffer.from('\0')]);
    const m = Buffer.alloc(8); m.writeInt32BE(8 + corps.length, 0); m.writeInt32BE(196608, 4);
    socket.write(Buffer.concat([m, corps]));
    return this.recevoir(true);
  }

  /* ---------- Messages ---------- */
  envoyer(type, corps) {
    const t = Buffer.alloc(5); t.write(type, 0); t.writeInt32BE(4 + corps.length, 1);
    this.s.write(Buffer.concat([t, corps]));
  }
  lire() {
    while (this.tampon.length >= 5) {
      const longueur = this.tampon.readInt32BE(1);
      if (this.tampon.length < longueur + 1) return;
      const msg = { type: String.fromCharCode(this.tampon[0]), corps: this.tampon.subarray(5, longueur + 1) };
      this.tampon = this.tampon.subarray(longueur + 1);
      this.traiter(msg);
    }
  }
  echec(e) { const a = this.attente.shift(); if (a) a.ko(a.erreur || e); this.attente.forEach(x => x.ko(e)); this.attente = []; }

  /** Attend jusqu'au prochain ReadyForQuery ; renvoie les résultats de chaque instruction. */
  recevoir(demarrage) {
    return new Promise((ok, ko) => this.attente.push({ ok, ko, demarrage, resultats: [], courant: null, erreur: null }));
  }

  traiter({ type, corps }) {
    const a = this.attente[0];
    if (!a) return;
    switch (type) {
      case 'R': return this.authentifier(corps, a);
      case 'T': {   // description des colonnes
        const n = corps.readInt16BE(0); let p = 2; const colonnes = [];
        for (let i = 0; i < n; i++) {
          const z = corps.indexOf(0, p); const nom = corps.toString('utf8', p, z); p = z + 1;
          const oid = corps.readInt32BE(p + 6); p += 18;
          colonnes.push({ nom, type: TYPES[oid] || 'oid:' + oid });
        }
        a.courant = { colonnes, lignes: [] };
        return;
      }
      case 'D': {   // une ligne
        const n = corps.readInt16BE(0); let p = 2; const ligne = [];
        for (let i = 0; i < n; i++) {
          const l = corps.readInt32BE(p); p += 4;
          if (l < 0) ligne.push(null); else { ligne.push(corps.toString('utf8', p, p + l)); p += l; }
        }
        if (a.courant) a.courant.lignes.push(ligne);
        return;
      }
      case 'C': {   // fin d'une instruction
        const commande = corps.toString('utf8', 0, corps.length - 1);
        a.resultats.push(Object.assign({ commande, colonnes: [], lignes: [] }, a.courant || {}, { commande }));
        a.courant = null;
        return;
      }
      case 'E': { a.erreur = lireErreur(corps); return; }
      case 'Z': {
        this.attente.shift();
        return a.erreur ? a.ko(a.erreur) : a.ok(a.resultats);
      }
      default: return;   // ParameterStatus, BackendKeyData, Notice, ParseComplete, BindComplete, NoData…
    }
  }

  /* ---------- Authentification ---------- */
  authentifier(corps, a) {
    const code = corps.readInt32BE(0);
    const mdp = this.c.motdepasse || '';
    if (code === 0) return;   // OK
    if (code === 3) return this.envoyer('p', Buffer.from(mdp + '\0'));
    if (code === 5) {
      const md5 = s => crypto.createHash('md5').update(s).digest('hex');
      const sel = corps.subarray(4, 8);
      const h = 'md5' + crypto.createHash('md5').update(md5(mdp + this.c.utilisateur)).update(sel).digest('hex');
      return this.envoyer('p', Buffer.from(h + '\0'));
    }
    if (code === 10) {   // SASL : SCRAM-SHA-256
      if (!corps.toString().includes('SCRAM-SHA-256')) return a.ko(new Error('Méthode d’authentification non gérée'));
      this.nonce = crypto.randomBytes(18).toString('base64');
      this.premier = `n=*,r=${this.nonce}`;
      const msg = Buffer.from('n,,' + this.premier);
      const mec = Buffer.from('SCRAM-SHA-256\0');
      const l = Buffer.alloc(4); l.writeInt32BE(msg.length, 0);
      return this.envoyer('p', Buffer.concat([mec, l, msg]));
    }
    if (code === 11) {
      const serveur = corps.subarray(4).toString();
      const v = Object.fromEntries(serveur.split(',').map(x => [x[0], x.slice(2)]));
      if (!v.r || !v.r.startsWith(this.nonce)) return a.ko(new Error('Réponse SCRAM invalide'));
      const sale = crypto.pbkdf2Sync(mdp.normalize('NFKC'), Buffer.from(v.s, 'base64'), Number(v.i), 32, 'sha256');
      const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
      const cleClient = hmac(sale, 'Client Key');
      const sansPreuve = `c=biws,r=${v.r}`;
      const message = `${this.premier},${serveur},${sansPreuve}`;
      const signature = hmac(crypto.createHash('sha256').update(cleClient).digest(), message);
      const preuve = Buffer.from(cleClient.map((b, i) => b ^ signature[i])).toString('base64');
      this.signatureServeur = hmac(hmac(sale, 'Server Key'), message).toString('base64');
      return this.envoyer('p', Buffer.from(`${sansPreuve},p=${preuve}`));
    }
    if (code === 12) {
      const v = corps.subarray(4).toString();
      if (v !== 'v=' + this.signatureServeur) a.ko(new Error('Signature du serveur invalide (SCRAM)'));
      return;
    }
    a.ko(new Error('Méthode d’authentification non gérée (code ' + code + ')'));
  }

  /* ---------- Requêtes ---------- */
  /** Requête simple : peut contenir plusieurs instructions (migrations). */
  simple(sql) {
    const p = this.recevoir();
    this.envoyer('Q', Buffer.from(sql + '\0'));
    return p;
  }
  /** Requête paramétrée : une instruction, valeurs en $1, $2… */
  async requete(sql, valeurs) {
    valeurs = valeurs || [];
    const p = this.recevoir();
    const z = s => Buffer.from(s + '\0');
    const i16 = n => { const b = Buffer.alloc(2); b.writeInt16BE(n, 0); return b; };
    const i32 = n => { const b = Buffer.alloc(4); b.writeInt32BE(n, 0); return b; };
    this.envoyer('P', Buffer.concat([z(''), z(sql), i16(0)]));
    this.envoyer('B', Buffer.concat([z(''), z(''), i16(0), i16(valeurs.length),
      ...valeurs.map(v => { if (v === null || v === undefined) return i32(-1); const b = Buffer.from(String(v)); return Buffer.concat([i32(b.length), b]); }), i16(0)]));
    this.envoyer('D', Buffer.concat([Buffer.from('P'), z('')]));
    this.envoyer('E', Buffer.concat([z(''), i32(0)]));
    this.envoyer('S', Buffer.alloc(0));
    const r = await p;
    return r[r.length - 1] || { colonnes: [], lignes: [] };
  }
  fermer() { try { if (this.s) { this.envoyer('X', Buffer.alloc(0)); this.s.end(); } } catch (e) { /* déjà fermée */ } }
}

function lireErreur(corps) {
  const champs = {};
  let p = 0;
  while (p < corps.length && corps[p] !== 0) {
    const z = corps.indexOf(0, p + 1);
    champs[String.fromCharCode(corps[p])] = corps.toString('utf8', p + 1, z);
    p = z + 1;
  }
  const e = new Error(champs.M + (champs.D ? ' — ' + champs.D : '') + (champs.H ? ' (' + champs.H + ')' : ''));
  e.code = champs.C;
  return e;
}

/** Ouvre une connexion, exécute fn(client), ferme. */
async function avec(config, fn) {
  const c = new Client(config);
  await c.connecter();
  // Connexion en lecture seule : le serveur PostgreSQL refuse toute écriture
  if (config.lectureSeule) await c.simple('set default_transaction_read_only = on');
  try { return await fn(c); } finally { c.fermer(); }
}

module.exports = { Client, avec, lireChaine };
