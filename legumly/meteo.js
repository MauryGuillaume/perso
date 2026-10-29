/* meteo.js — Legumly : prévisions de gel (Open-Meteo, sans clé) et recherche de commune.
   Service externe : appelé directement depuis le téléphone (domaines ouverts dans la CSP, connect-src).
   Jamais mis en cache par le service worker ; le dernier résultat est gardé en IndexedDB pour l'affichage hors ligne. */
(function () {
  'use strict';
  const A = window.appli = window.appli || {};
  const URL_PREVISIONS = 'https://api.open-meteo.com/v1/forecast';
  const URL_COMMUNES = 'https://geocoding-api.open-meteo.com/v1/search';
  const FRAICHEUR_MS = 3 * 3600 * 1000;
  const SEUIL_DEFAUT = 2;

  async function lireJson(url) {
    let r;
    try { r = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'omit' }); }
    catch (e) { throw new Error('Pas de connexion. Réessayez dans un instant.'); }
    let d = null;
    try { d = await r.json(); } catch (e) { /* réponse non JSON */ }
    if (!r.ok) throw new Error((d && d.reason) ? 'Service météo : ' + d.reason : `Service météo indisponible (erreur ${r.status}).`);
    return d;
  }

  A.meteo = {
    SEUIL_DEFAUT,
    /** Communes correspondant à un nom (France d'abord). */
    async chercherCommunes(nom) {
      const q = String(nom || '').trim();
      if (q.length < 2) throw new Error('Tapez au moins 2 lettres.');
      const url = `${URL_COMMUNES}?name=${encodeURIComponent(q)}&count=8&language=fr&format=json`;
      const d = await lireJson(url);
      return (d && d.results || []).map(c => ({
        nom: c.name, detail: [c.admin2 || c.admin1, c.country_code !== 'FR' ? c.country : ''].filter(Boolean).join(', '),
        pays: c.country_code, altitude: c.elevation,
        // Coordonnées arrondies à 0,01° (environ 1 km) : assez pour la météo, sans adresse précise
        lat: Math.round(c.latitude * 100) / 100, lon: Math.round(c.longitude * 100) / 100
      })).sort((a, b) => (b.pays === 'FR') - (a.pays === 'FR'));
    },

    /** Prévisions des minimales sur 7 jours. { jours:[{date, min}], date, commune, horsLigne? } ou null sans commune. */
    async previsions(forcer) {
      const commune = await A.db.reglage('commune', null);
      if (!commune) return null;
      const cache = await A.db.reglage('meteo', null);
      const memeLieu = cache && cache.lat === commune.lat && cache.lon === commune.lon;
      if (!forcer && memeLieu && Date.now() - cache.recu < FRAICHEUR_MS) return { ...cache, commune };
      try {
        const url = `${URL_PREVISIONS}?latitude=${commune.lat}&longitude=${commune.lon}&daily=temperature_2m_min&timezone=auto&forecast_days=7`;
        const d = await lireJson(url);
        const jours = (d.daily && d.daily.time || []).map((date, i) => ({ date, min: d.daily.temperature_2m_min[i] })).filter(j => typeof j.min === 'number');
        if (!jours.length) throw new Error('Prévisions vides.');
        const res = { recu: Date.now(), lat: commune.lat, lon: commune.lon, jours };
        await A.db.regler('meteo', res);
        return { ...res, commune };
      } catch (e) {
        if (memeLieu) return { ...cache, commune, horsLigne: true, erreur: e.message };
        throw e;
      }
    },

    /** Jours de gel à venir (à partir d'aujourd'hui) sous le seuil. */
    async joursDeGel(forcer) {
      const p = await this.previsions(forcer);
      if (!p) return null;
      const seuil = await A.db.reglage('seuilGel', SEUIL_DEFAUT);
      const auj = A.aujourdhui();
      return { ...p, seuil, gel: p.jours.filter(j => j.date >= auj && j.min <= seuil) };
    },

    /** Bandeau d'alerte gel (HTML) pour un écran, ou '' s'il n'y a rien à signaler. */
    async bandeau(sensiblesEnPlace) {
      let g;
      try { g = await this.joursDeGel(); } catch (e) { return ''; }
      if (!g || !g.gel.length) return '';
      const premier = g.gel[0], plusFroid = g.gel.reduce((a, b) => (b.min < a.min ? b : a));
      const jour = d => d === A.aujourdhui() ? 'cette nuit' : new Date(A.versDate(d)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
      const quoi = sensiblesEnPlace && sensiblesEnPlace.length
        ? `Protégez ${A.esc(sensiblesEnPlace.slice(0, 4).join(', '))}${sensiblesEnPlace.length > 4 ? '…' : ''} avec un voile ou rentrez les pots.`
        : 'Protégez les semis et les plants frileux (voile d’hivernage, pots à l’abri).';
      return `<div class="alerte" role="alert"><strong>❄️ Risque de gel à ${A.esc(g.commune.nom)} : ${A.esc(String(Math.round(plusFroid.min * 10) / 10).replace('.', ','))} °C ${A.esc(jour(plusFroid.date))}</strong>
        ${g.gel.length > 1 ? `${g.gel.length} nuits sous ${A.esc(g.seuil)} °C à partir de ${A.esc(jour(premier.date))}. ` : ''}${quoi}
        ${g.horsLigne ? `<br><span class="doux">Prévisions du ${A.esc(new Date(g.recu).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))} (hors ligne).</span>` : ''}</div>`;
    }
  };
})();
