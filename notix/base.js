/* base.js — Notix : stockage des notes sur l'appareil (IndexedDB « notix »). Rien n'est envoyé à un serveur.
   Magasins : notes { id, texte, dossierId, creeeLe, modifieeLe, epinglee, archivee }, dossiers { id, nom, motsCles, ordre },
   reglages (clé → valeur : « prefs », « brouillon »). */
(function () {
  'use strict';
  const NOM = 'notix', VERSION_BASE = 1;
  const DOSSIERS_DEPART = [
    { id: 'courses', nom: 'Courses', motsCles: ['courses', 'liste de courses'], ordre: 1 },
    { id: 'idees', nom: 'Idées', motsCles: ['idée', 'idées'], ordre: 2 },
    { id: 'souvenirs', nom: 'Souvenirs', motsCles: ['souvenir', 'souvenirs'], ordre: 3 },
    { id: 'a-faire', nom: 'À faire', motsCles: ['à faire', 'tâche', 'rappel'], ordre: 4 }
  ];
  const PREFS_DEFAUT = { langue: 'fr-FR', ponctuation: true, avertissementVu: false };
  let promesse = null, persistanceDemandee = false;

  function ouvrir() {
    if (!promesse) promesse = new Promise((ok, ko) => {
      if (!('indexedDB' in window)) return ko(new Error('Ce navigateur ne peut pas garder de notes (stockage indisponible).'));
      const r = indexedDB.open(NOM, VERSION_BASE);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('dossiers')) {
          const s = db.createObjectStore('dossiers', { keyPath: 'id' });
          DOSSIERS_DEPART.forEach(d => s.put(d));
        }
        if (!db.objectStoreNames.contains('reglages')) db.createObjectStore('reglages');
      };
      r.onsuccess = () => { r.result.onversionchange = () => r.result.close(); ok(r.result); };
      r.onerror = () => ko(new Error('Impossible d’ouvrir le stockage des notes (navigation privée ?).'));
      r.onblocked = () => ko(new Error('Notix est ouverte dans un autre onglet : fermez-le puis réessayez.'));
    });
    promesse.catch(() => { promesse = null; });
    return promesse;
  }

  function messageErreur(e) {
    if (e && e.name === 'QuotaExceededError') return new Error('Le stockage de l’appareil est plein : supprimez des notes ou libérez de la place.');
    return e instanceof Error ? e : new Error('Erreur de stockage.');
  }

  /** Lance une transaction ; fn(t) renvoie une requête IndexedDB ou une valeur. Résout à la fin de la transaction. */
  async function tx(magasins, mode, fn) {
    const db = await ouvrir();
    return new Promise((ok, ko) => {
      const t = db.transaction(magasins, mode);
      let sortie;
      const r = fn(t);
      if (r && typeof r === 'object' && 'onsuccess' in r) r.onsuccess = () => { sortie = r.result; }; else sortie = r;
      t.oncomplete = () => ok(sortie);
      t.onerror = () => ko(messageErreur(t.error));
      t.onabort = () => ko(messageErreur(t.error));
    });
  }

  const nouvelId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

  function demanderPersistance() {
    // Évite que le navigateur efface les notes quand l'appareil manque de place
    if (persistanceDemandee) return;
    persistanceDemandee = true;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  const notes = {
    toutes: () => tx('notes', 'readonly', t => t.objectStore('notes').getAll()),
    lire: id => tx('notes', 'readonly', t => t.objectStore('notes').get(String(id))),
    async enregistrer(note) {
      const maintenant = new Date().toISOString();
      const n = {
        id: note.id || nouvelId(),
        texte: String(note.texte || '').slice(0, 20000),
        dossierId: note.dossierId || '',
        creeeLe: note.creeeLe || maintenant,
        modifieeLe: maintenant,
        epinglee: !!note.epinglee,
        archivee: !!note.archivee
      };
      await tx('notes', 'readwrite', t => t.objectStore('notes').put(n));
      demanderPersistance();
      return n;
    },
    supprimer: id => tx('notes', 'readwrite', t => t.objectStore('notes').delete(String(id)))
  };

  const dossiers = {
    async tous() {
      const liste = await tx('dossiers', 'readonly', t => t.objectStore('dossiers').getAll());
      return liste.sort((a, b) => (a.ordre || 0) - (b.ordre || 0) || a.nom.localeCompare(b.nom, 'fr'));
    },
    async enregistrer(d) {
      const tous = await dossiers.tous();
      const o = { id: d.id || nouvelId(), nom: String(d.nom || '').trim().slice(0, 40), motsCles: d.motsCles || [], ordre: d.ordre || (Math.max(0, ...tous.map(x => x.ordre || 0)) + 1) };
      await tx('dossiers', 'readwrite', t => t.objectStore('dossiers').put(o));
      return o;
    },
    /** Supprime le dossier ; ses notes passent dans « Sans dossier ». */
    supprimer: id => tx(['dossiers', 'notes'], 'readwrite', t => {
      t.objectStore('dossiers').delete(id);
      const c = t.objectStore('notes').openCursor();
      c.onsuccess = () => {
        const cur = c.result;
        if (!cur) return;
        if (cur.value.dossierId === id) cur.update(Object.assign({}, cur.value, { dossierId: '' }));
        cur.continue();
      };
      return undefined;
    })
  };

  const reglages = {
    async prefs() { return Object.assign({}, PREFS_DEFAUT, await tx('reglages', 'readonly', t => t.objectStore('reglages').get('prefs')) || {}); },
    async changerPrefs(changes) { const p = Object.assign(await reglages.prefs(), changes); await tx('reglages', 'readwrite', t => t.objectStore('reglages').put(p, 'prefs')); return p; },
    brouillon: async () => (await tx('reglages', 'readonly', t => t.objectStore('reglages').get('brouillon'))) || '',
    ecrireBrouillon: texte => tx('reglages', 'readwrite', t => t.objectStore('reglages').put(String(texte || '').slice(0, 20000), 'brouillon'))
  };

  async function exporter() {
    return { app: 'notix', format: 1, exporteeLe: new Date().toISOString(), notes: await notes.toutes(), dossiers: await dossiers.tous() };
  }

  /** Fusionne une sauvegarde : une note déjà présente n'est remplacée que si la sauvegarde est plus récente. */
  async function importer(donnees) {
    if (!donnees || donnees.app !== 'notix' || !Array.isArray(donnees.notes)) throw new Error('Ce fichier n’est pas une sauvegarde Notix.');
    const existantes = new Map((await notes.toutes()).map(n => [n.id, n]));
    const okNote = n => n && typeof n.id === 'string' && typeof n.texte === 'string';
    const aEcrire = donnees.notes.filter(okNote).filter(n => !existantes.has(n.id) || String(n.modifieeLe) > String(existantes.get(n.id).modifieeLe));
    const doss = (Array.isArray(donnees.dossiers) ? donnees.dossiers : []).filter(d => d && typeof d.id === 'string' && typeof d.nom === 'string');
    await tx(['notes', 'dossiers'], 'readwrite', t => {
      aEcrire.forEach(n => t.objectStore('notes').put({
        id: n.id, texte: n.texte.slice(0, 20000), dossierId: typeof n.dossierId === 'string' ? n.dossierId : '',
        creeeLe: n.creeeLe || new Date().toISOString(), modifieeLe: n.modifieeLe || new Date().toISOString(), epinglee: !!n.epinglee, archivee: !!n.archivee
      }));
      doss.forEach(d => t.objectStore('dossiers').put({ id: d.id, nom: d.nom.slice(0, 40), motsCles: Array.isArray(d.motsCles) ? d.motsCles.filter(k => typeof k === 'string').slice(0, 20) : [], ordre: Number(d.ordre) || 0 }));
    });
    demanderPersistance();
    return { notes: aEcrire.length, dossiers: doss.length };
  }

  /** Efface toutes les notes et le brouillon ; remet les dossiers de départ. Les réglages sont gardés. */
  function toutEffacer() {
    return tx(['notes', 'dossiers', 'reglages'], 'readwrite', t => {
      t.objectStore('notes').clear();
      const s = t.objectStore('dossiers');
      s.clear();
      DOSSIERS_DEPART.forEach(d => s.put(d));
      t.objectStore('reglages').delete('brouillon');
    });
  }

  window.notixBase = { ouvrir, notes, dossiers, reglages, exporter, importer, toutEffacer, nouvelId };
})();
