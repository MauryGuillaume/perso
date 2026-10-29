/* ==========================================================================
   ab-zip.js — création d'un fichier ZIP sans librairie
   Les fichiers sont stockés sans compression (méthode « store ») : c'est
   simple, lisible et suffisant pour quelques fichiers texte.
   Usage : const blob = AB.zip({ 'index.html': '...', 'dossier/a.js': '...' });
   ========================================================================== */
(function () {
  // Table CRC-32 calculée une fois.
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /** Date et heure au format MS-DOS, utilisé par les en-têtes ZIP. */
  function dosDateTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }

  AB.zip = function (fichiers) {
    const enc = new TextEncoder();
    const { time, date } = dosDateTime(new Date());
    const morceaux = [];   // en-têtes locaux + données
    const central = [];    // répertoire central
    let offset = 0;

    Object.keys(fichiers).forEach(chemin => {
      const nom = enc.encode(chemin);
      const contenu = fichiers[chemin];
      const data = contenu instanceof Uint8Array ? contenu : enc.encode(String(contenu));
      const crc = crc32(data);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);   // signature
      local.setUint16(4, 20, true);           // version nécessaire
      local.setUint16(6, 0x0800, true);       // noms en UTF-8
      local.setUint16(8, 0, true);            // méthode : store
      local.setUint16(10, time, true);
      local.setUint16(12, date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nom.length, true);
      local.setUint16(28, 0, true);
      morceaux.push(new Uint8Array(local.buffer), nom, data);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);
      cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true);
      cd.setUint16(12, time, true);
      cd.setUint16(14, date, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, nom.length, true);
      cd.setUint32(42, offset, true);         // position de l'en-tête local
      central.push(new Uint8Array(cd.buffer), nom);

      offset += 30 + nom.length + data.length;
    });

    const tailleCentral = central.reduce((s, m) => s + m.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, Object.keys(fichiers).length, true);
    fin.setUint16(10, Object.keys(fichiers).length, true);
    fin.setUint32(12, tailleCentral, true);
    fin.setUint32(16, offset, true);

    return new Blob([...morceaux, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
  };
})();
