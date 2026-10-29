/* ==========================================================================
   ab-db.js — stockage dans le navigateur (IndexedDB)
   Quatre tables :
   - apps  : une ligne par app (créée ici ou existante), clé « id » ;
   - blocs : une ligne par VERSION de bloc, clé « cle » = « id@version » ;
   - kits  : une ligne par VERSION de kit, clé « cle » = « id@version » ;
   - meta  : réglages de la plateforme, clé « cle » ;
   - audits : un rapport d'audit de sécurité complet, clé « id » ;
   - fichiers : fichiers joints (documents d'un kit, ZIP du code d'une app), clé « id »,
                rangés par propriétaire (« kit:<id>@<version> », « app:<id> »).
   ========================================================================== */
(function () {
  const DB_NAME = 'atelier-blocs';
  const DB_VERSION = 4;   // 2 : table « kits » ; 3 : table « audits » ; 4 : table « fichiers »
  let db = null;

  const D = AB.db = {};

  D.open = function () {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('apps')) d.createObjectStore('apps', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('blocs')) d.createObjectStore('blocs', { keyPath: 'cle' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'cle' });
        if (!d.objectStoreNames.contains('kits')) d.createObjectStore('kits', { keyPath: 'cle' });
        if (!d.objectStoreNames.contains('audits')) d.createObjectStore('audits', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('fichiers')) d.createObjectStore('fichiers', { keyPath: 'id' }).createIndex('proprio', 'proprio');
      };
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  };

  /** Exécute une requête sur une table et renvoie son résultat. */
  function run(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  }

  D.get = (store, key) => run(store, 'readonly', s => s.get(key));
  D.list = (store) => run(store, 'readonly', s => s.getAll());
  D.put = (store, value) => run(store, 'readwrite', s => s.put(value));
  D.remove = (store, key) => run(store, 'readwrite', s => s.delete(key));
  D.clear = (store) => run(store, 'readwrite', s => s.clear());
  D.parIndex = (store, index, valeur) => run(store, 'readonly', s => s.index(index).getAll(valeur));

  /* Réglages de la plateforme (adresse du serveur local, etc.) */
  D.getMeta = async (cle, defaut) => {
    const row = await D.get('meta', cle);
    return row ? row.valeur : defaut;
  };
  D.setMeta = (cle, valeur) => D.put('meta', { cle, valeur });

  /** Sauvegarde complète de la plateforme, pour l'export JSON. */
  D.exportAll = async () => ({
    format: 'atelier-blocs', version: 1, date: AB.u.now(),
    apps: await D.list('apps'), blocs: await D.list('blocs'), kits: await D.list('kits'), meta: await D.list('meta'), audits: await D.list('audits'),
    fichiers: await AB.fichiers.versSauvegarde()
  });

  /** Restaure une sauvegarde. remplacer=true efface d'abord tout. */
  D.importAll = async (data, remplacer) => {
    if (!data || data.format !== 'atelier-blocs') throw new Error('Ce fichier n’est pas une sauvegarde de l’Atelier de Blocs.');
    if (remplacer) { for (const t of ['apps', 'blocs', 'kits', 'meta', 'audits', 'fichiers']) await D.clear(t); }
    for (const a of data.apps || []) await D.put('apps', a);
    for (const b of data.blocs || []) await D.put('blocs', b);
    for (const k of data.kits || []) await D.put('kits', k);
    for (const m of data.meta || []) await D.put('meta', m);
    for (const a of data.audits || []) await D.put('audits', a);
    for (const f of data.fichiers || []) await D.put('fichiers', AB.fichiers.depuisSauvegarde(f));
  };
})();
