/* app/chiffrement.js — chiffrement AES-256-GCM des secrets gardés en base (2FA, clé Pennylane).
   La clé vient de DEUX_FACTEURS_CLE ; chaque usage en dérive la sienne (« 2fa » garde la dérivation d'origine,
   pour que les secrets déjà chiffrés restent lisibles). */
'use strict';
const crypto = require('crypto');

let averti = false;
module.exports = function chiffrement(env, usage) {
  const cle = () => {
    let source = env.get('DEUX_FACTEURS_CLE');
    if (!source) {
      if (!averti) { console.warn('[chiffrement] DEUX_FACTEURS_CLE absente : clé de développement utilisée (obligatoire en production).'); averti = true; }
      source = 'developpement-podologiciel-' + env.get('DATABASE_URL');
    }
    return crypto.createHash('sha256').update(usage === '2fa' ? source : `${usage}:${source}`).digest();
  };
  const chiffrer = texte => {
    const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', cle(), iv);
    const donnees = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
    return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), donnees.toString('base64')].join(':');
  };
  const dechiffrer = texte => {
    const [v, iv, tag, donnees] = String(texte || '').split(':');
    if (v !== 'v1') return null;
    try {
      const d = crypto.createDecipheriv('aes-256-gcm', cle(), Buffer.from(iv, 'base64'));
      d.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([d.update(Buffer.from(donnees, 'base64')), d.final()]).toString('utf8');
    } catch (e) { return null; }
  };
  return { chiffrer, dechiffrer };
};
