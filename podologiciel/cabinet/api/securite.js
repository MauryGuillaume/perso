/* ==========================================================================
   securite.js — mots de passe, double authentification, chiffrement
   - Mots de passe : scrypt (N = 32768), sel aléatoire, comparaison en temps
     constant.
   - Double authentification : TOTP (RFC 6238, 6 chiffres, 30 s) compatible
     avec Google Authenticator, Microsoft Authenticator, FreeOTP… ; un code
     ne sert qu'une fois.
   - Données de santé : AES-256-GCM avec la clé PODO_CLE (32 octets en
     base64), qui reste sur le serveur. Chaque valeur chiffrée est liée à sa
     table et à sa ligne (données associées), on ne peut pas la recopier
     ailleurs.
   ========================================================================== */
const crypto = require('crypto');

/* ---------- Mots de passe ---------- */
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hacherMdp(mdp) {
  const sel = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(mdp).normalize('NFKC'), sel, 32, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, sel.toString('base64'), h.toString('base64')].join('$');
}

// Empreinte factice : un e-mail inconnu prend le même temps qu'un mauvais mot de passe
const FACTICE = hacherMdp(crypto.randomBytes(12).toString('hex'));

function verifierMdp(mdp, stocke) {
  const [algo, N, r, p, sel, h] = String(stocke || FACTICE).split('$');
  if (algo !== 'scrypt') return false;
  const attendu = Buffer.from(h, 'base64');
  const calcule = crypto.scryptSync(String(mdp).normalize('NFKC'), Buffer.from(sel, 'base64'), attendu.length,
    { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return crypto.timingSafeEqual(attendu, calcule) && !!stocke;
}

/** Règles du mot de passe : 12 caractères au moins, pas l'e-mail. Renvoie le message d'erreur ou ''. */
function reglesMdp(mdp, email) {
  mdp = String(mdp || '');
  if (mdp.length < 12) return 'Le mot de passe doit faire 12 caractères au moins.';
  if (mdp.length > 200) return 'Mot de passe trop long.';
  if (email && mdp.toLowerCase().includes(String(email).split('@')[0].toLowerCase())) return 'Le mot de passe ne doit pas contenir l’e-mail.';
  if (new Set(mdp).size < 5) return 'Mot de passe trop simple.';
  return '';
}

/** Mot de passe provisoire lisible (sans 0/O, 1/l/I), à changer à la première connexion. */
function mdpProvisoire() {
  const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const o = crypto.randomBytes(16);
  const s = Array.from(o, x => A[x % A.length]).join('');
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16);
}

/* ---------- TOTP (RFC 6238) ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf) {
  let bits = 0, val = 0, s = '';
  for (const o of buf) {
    val = (val << 8) | o; bits += 8;
    while (bits >= 5) { s += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) s += B32[(val << (5 - bits)) & 31];
  return s;
}
function deBase32(s) {
  let bits = 0, val = 0; const o = [];
  for (const c of String(s).toUpperCase().replace(/[^A-Z2-7]/g, '')) {
    val = (val << 5) | B32.indexOf(c); bits += 5;
    if (bits >= 8) { o.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(o);
}
const PAS = 30;
const pasCourant = (t = Date.now()) => Math.floor(t / 1000 / PAS);
function codeTotp(secret, pas) {
  const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(pas));
  const h = crypto.createHmac('sha1', deBase32(secret)).update(m).digest();
  const d = h[h.length - 1] & 15;
  return String((h.readUInt32BE(d) & 0x7fffffff) % 1000000).padStart(6, '0');
}
/** Vérifie un code (décalage d'horloge de ±30 s toléré). Renvoie le pas utilisé, ou -1.
    dernierPas : un code déjà accepté (ou plus ancien) est refusé. */
function verifierTotp(secret, code, dernierPas) {
  code = String(code || '').replace(/\s/g, '');
  if (!/^[0-9]{6}$/.test(code)) return -1;
  const maintenant = pasCourant();
  for (const pas of [maintenant - 1, maintenant, maintenant + 1]) {
    if (pas <= Number(dernierPas || 0)) continue;
    if (crypto.timingSafeEqual(Buffer.from(codeTotp(secret, pas)), Buffer.from(code))) return pas;
  }
  return -1;
}
const nouveauSecretTotp = () => base32(crypto.randomBytes(20));
const lienTotp = (secret, email, emetteur) =>
  'otpauth://totp/' + encodeURIComponent(emetteur + ':' + email) + '?secret=' + secret + '&issuer=' + encodeURIComponent(emetteur) + '&algorithm=SHA1&digits=6&period=30';

/* ---------- Chiffrement des données ---------- */
let CLE = null;
function chargerCle(b64) {
  const k = Buffer.from(String(b64 || ''), 'base64');
  if (k.length !== 32) throw new Error('PODO_CLE doit contenir 32 octets en base64 (openssl rand -base64 32).');
  CLE = k;
}
/** Chiffre une valeur (objet ou texte) ; aad lie la valeur à sa place (ex. « patients:<id>:identite »). */
function chiffrer(valeur, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', CLE, iv);
  c.setAAD(Buffer.from(aad));
  const corps = Buffer.concat([c.update(JSON.stringify(valeur), 'utf8'), c.final()]);
  return 'v1:' + Buffer.concat([iv, c.getAuthTag(), corps]).toString('base64');
}
function dechiffrer(texte, aad) {
  if (!texte) return null;
  const b = Buffer.from(String(texte).slice(3), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', CLE, b.subarray(0, 12));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}

/* ---------- Jetons de session ---------- */
const nouveauJeton = () => crypto.randomBytes(32).toString('base64url');
const empreinte = j => crypto.createHash('sha256').update(String(j)).digest('hex');

module.exports = {
  hacherMdp, verifierMdp, reglesMdp, mdpProvisoire,
  base32, deBase32, codeTotp, verifierTotp, pasCourant, nouveauSecretTotp, lienTotp,
  chargerCle, chiffrer, dechiffrer, nouveauJeton, empreinte
};
