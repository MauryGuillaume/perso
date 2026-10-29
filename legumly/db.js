/* db.js — Legumly : stockage local IndexedDB (rien sur un serveur, rien dans localStorage).
   Magasins : reglages (clé : cle), bacs, plantations, journal (clé : id), rappelsFaits (clé : cle « plantation:type »). */
(function () {
  'use strict';
  const A = window.appli = window.appli || {};
  const NOM = 'legumly', VERSION_BASE = 1;
  const MAGASINS = { reglages: 'cle', bacs: 'id', plantations: 'id', journal: 'id', rappelsFaits: 'cle' };
  let ouverture = null;

  function ouvrir() {
    if (ouverture) return ouverture;
    ouverture = new Promise((ok, ko) => {
      if (!('indexedDB' in window)) return ko(new Error('Ce navigateur ne permet pas d’enregistrer des données (IndexedDB).'));
      const req = indexedDB.open(NOM, VERSION_BASE);
      req.onupgradeneeded = () => {
        const base = req.result;
        for (const [nom, cle] of Object.entries(MAGASINS)) if (!base.objectStoreNames.contains(nom)) base.createObjectStore(nom, { keyPath: cle });
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ko(new Error('Impossible d’ouvrir les données de l’app (navigation privée ?).'));
      req.onblocked = () => ko(new Error('Fermez les autres onglets de Legumly puis réessayez.'));
    });
    ouverture.catch(() => { ouverture = null; });
    return ouverture;
  }

  async function transaction(magasins, mode, fn) {
    const base = await ouvrir();
    return new Promise((ok, ko) => {
      const tx = base.transaction(magasins, mode);
      let resultat;
      Promise.resolve(fn(tx, r => { resultat = r; })).catch(ko);
      tx.oncomplete = () => ok(resultat);
      tx.onerror = () => ko(new Error('Enregistrement impossible : ' + (tx.error && tx.error.message || 'erreur inconnue')));
      tx.onabort = () => ko(new Error('Enregistrement annulé' + (tx.error ? ' : ' + tx.error.message : '.')));
    });
  }
  const req = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

  A.db = {
    MAGASINS,
    nouvelId() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10)); },
    lire(magasin, cle) { return transaction(magasin, 'readonly', async (tx, fin) => fin(await req(tx.objectStore(magasin).get(cle)))); },
    tous(magasin) { return transaction(magasin, 'readonly', async (tx, fin) => fin(await req(tx.objectStore(magasin).getAll()))); },
    mettre(magasin, objet) { return transaction(magasin, 'readwrite', (tx, fin) => { tx.objectStore(magasin).put(objet); fin(objet); }); },
    supprimer(magasin, cle) { return transaction(magasin, 'readwrite', tx => { tx.objectStore(magasin).delete(cle); }); },
    /** Supprime un bac avec ses plantations et leurs rappels faits (le journal est conservé). */
    async supprimerBac(id) {
      const plantations = (await this.tous('plantations')).filter(p => p.bacId === id);
      const faits = await this.tous('rappelsFaits');
      return transaction(['bacs', 'plantations', 'rappelsFaits'], 'readwrite', tx => {
        tx.objectStore('bacs').delete(id);
        for (const p of plantations) {
          tx.objectStore('plantations').delete(p.id);
          faits.filter(f => f.cle.startsWith(p.id + ':')).forEach(f => tx.objectStore('rappelsFaits').delete(f.cle));
        }
      });
    },
    async supprimerPlantation(id) {
      const faits = (await this.tous('rappelsFaits')).filter(f => f.cle.startsWith(id + ':'));
      return transaction(['plantations', 'rappelsFaits'], 'readwrite', tx => {
        tx.objectStore('plantations').delete(id);
        faits.forEach(f => tx.objectStore('rappelsFaits').delete(f.cle));
      });
    },
    /** Réglage : valeur ou défaut. */
    async reglage(cle, defaut) { const r = await this.lire('reglages', cle); return r ? r.valeur : defaut; },
    regler(cle, valeur) { return this.mettre('reglages', { cle, valeur }); },
    /** Sauvegarde complète (export JSON). */
    async exporter() {
      const sortie = { app: 'legumly', version: 1, date: new Date().toISOString() };
      for (const m of Object.keys(MAGASINS)) sortie[m] = await this.tous(m);
      return sortie;
    },
    /** Remplace toutes les données par celles d'une sauvegarde (validée avant). */
    async importer(donnees) {
      if (!donnees || donnees.app !== 'legumly') throw new Error('Ce fichier n’est pas une sauvegarde Legumly.');
      for (const m of Object.keys(MAGASINS)) if (donnees[m] !== undefined && !Array.isArray(donnees[m])) throw new Error('Sauvegarde abîmée : « ' + m + ' » illisible.');
      const cles = Object.keys(MAGASINS);
      return transaction(cles, 'readwrite', tx => {
        for (const m of cles) {
          const s = tx.objectStore(m); s.clear();
          for (const o of donnees[m] || []) if (o && typeof o === 'object' && o[MAGASINS[m]] != null) s.put(o);
        }
      });
    },
    toutEffacer() { const cles = Object.keys(MAGASINS); return transaction(cles, 'readwrite', tx => { cles.forEach(m => tx.objectStore(m).clear()); }); }
  };
})();
