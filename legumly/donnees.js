/* donnees.js — Legumly : base des légumes (legumes.json), zones climatiques, dates, rappels et calculs du potager. */
(function () {
  'use strict';
  const A = window.appli = window.appli || {};

  /* ---------- Dates (chaînes AAAA-MM-JJ, heure locale) ---------- */
  const deux = n => String(n).padStart(2, '0');
  A.dateIso = d => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
  A.aujourdhui = () => A.dateIso(new Date());
  A.versDate = iso => { const [a, m, j] = String(iso).split('-').map(Number); return new Date(a, m - 1, j); };
  A.ajouterJours = (iso, n) => { const d = A.versDate(iso); d.setDate(d.getDate() + Number(n || 0)); return A.dateIso(d); };
  A.ecartJours = (de, a) => Math.round((A.versDate(a) - A.versDate(de)) / 86400000);
  A.MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  A.MOIS_COURTS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  A.dateLisible = (iso, avecAnnee) => {
    if (!iso) return '';
    const d = A.versDate(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: avecAnnee || d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  };
  A.dateValide = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && !isNaN(A.versDate(iso));

  /* ---------- Zones climatiques (France métropolitaine) ----------
     Calendrier de référence : océanique. En plein air (semis en terre, plantation, récolte), chaque période continue
     commence plus tôt ou plus tard au printemps (mois de février à juillet) et finit plus tôt ou plus tard à l'automne
     (août à décembre). Les semis à l'abri ne bougent pas. */
  A.ZONES = {
    oceanique: { nom: 'Océanique', aide: 'Ouest, Nord-Ouest, Bassin parisien', debut: 0, debutSensible: 0, fin: 0 },
    mediterraneenne: { nom: 'Méditerranéenne', aide: 'Pourtour méditerranéen, Corse, basse vallée du Rhône', debut: -1, debutSensible: -1, fin: 1 },
    continentale: { nom: 'Continentale', aide: 'Nord-Est, Centre-Est, Bourgogne, Lyonnais', debut: 0, debutSensible: 1, fin: 0 },
    montagne: { nom: 'Montagne', aide: 'Au-dessus de 700 m environ', debut: 1, debutSensible: 1, fin: -1 }
  };
  A.ZONE_DEFAUT = 'oceanique';

  /** Suggère une zone à partir d'une commune (latitude, longitude, altitude). Indicatif seulement. */
  A.suggererZone = c => {
    if (c.altitude != null && c.altitude >= 700) return 'montagne';
    if ((c.lat < 44.3 && c.lon > 2.9) || (c.lat < 43.2 && c.lon > 1.9) || c.lon > 8.4) return 'mediterraneenne';
    if (c.lon >= 4 && c.lat > 45) return 'continentale';
    return 'oceanique';
  };

  /** Plages continues d'une liste de mois (avec bouclage décembre → janvier). */
  function plages(mois) {
    const s = new Set(mois);
    if (s.size === 12) return [{ debut: 1, fin: 12, annee: true }];
    const res = [];
    for (let m = 1; m <= 12; m++) {
      const prec = m === 1 ? 12 : m - 1;
      if (s.has(m) && !s.has(prec)) {
        let fin = m;
        while (s.has(fin % 12 + 1) && fin % 12 + 1 !== m) fin = fin % 12 + 1;
        res.push({ debut: m, fin });
      }
    }
    return res;
  }
  const dansPrintemps = m => m >= 2 && m <= 7, dansAutomne = m => m >= 8 && m <= 12;
  const borne = m => ((m - 1 + 12) % 12) + 1;
  const longueur = p => (p.fin - p.debut + 12) % 12 + 1;

  function decaler(mois, zone, sensible) {
    const z = A.ZONES[zone] || A.ZONES[A.ZONE_DEFAUT];
    const dDebut = sensible ? z.debutSensible : z.debut;
    if (!dDebut && !z.fin) return mois.slice();
    const res = new Set();
    for (const p of plages(mois)) {
      if (p.annee) { for (let m = 1; m <= 12; m++) res.add(m); continue; }
      let { debut, fin } = p;
      const l = longueur(p);
      let nl = l;
      if (dansPrintemps(debut) && dDebut) { debut = borne(debut + dDebut); nl -= dDebut; }
      if (dansAutomne(fin) && z.fin) { fin = borne(fin + z.fin); nl += z.fin; }
      if (nl < 1) { debut = p.debut; fin = p.debut; nl = 1; } // période trop raccourcie : on garde un mois
      if (nl > 12) nl = 12;
      for (let i = 0, m = debut; i < nl; i++, m = borne(m + 1)) res.add(m);
    }
    return [...res].sort((a, b) => a - b);
  }

  /** Calendrier d'un légume pour une zone : { semisAbri, semisTerre, plantation, recolte } (mois 1-12). */
  A.calendrier = (l, zone) => {
    const sensible = l.gel === 'sensible';
    return {
      semisAbri: l.semisAbri.slice(),
      semisTerre: decaler(l.semisTerre, zone, sensible),
      plantation: decaler(l.plantation, zone, sensible),
      recolte: decaler(l.recolte, zone, sensible)
    };
  };

  /** « mars à mai, octobre » */
  A.texteMois = mois => {
    if (!mois.length) return '';
    return plages(mois).map(p => p.annee ? 'toute l’année' : p.debut === p.fin ? A.MOIS[p.debut - 1] : `${A.MOIS[p.debut - 1]} à ${A.MOIS[p.fin - 1]}`).join(', ');
  };

  /* ---------- Base des légumes ---------- */
  let chargement = null;
  A.legumes = () => {
    if (!chargement) {
      chargement = fetch('legumes.json').then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => {
          const liste = d.legumes.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
          return { liste, parId: Object.fromEntries(liste.map(l => [l.id, l])) };
        })
        .catch(() => { chargement = null; throw new Error('La liste des légumes n’a pas pu être chargée. Ouvrez l’app une fois avec du réseau.'); });
    }
    return chargement;
  };

  /** Normalise pour la recherche (sans accents ni majuscules). */
  A.normaliser = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /** Modes de mise en place possibles pour un légume. */
  A.MODES = { 'semis-abri': 'Semis à l’abri (godets)', 'semis-terre': 'Semis en place', 'plant': 'Plant ou bulbe mis en place' };
  A.modesPossibles = l => {
    const m = [];
    if (l.semisAbri.length) m.push('semis-abri');
    if (l.semisTerre.length) m.push('semis-terre');
    if (l.plantation.length) m.push('plant');
    return m;
  };
  /** Date de récolte prévue selon le mode. */
  A.recoltePrevue = (l, mode, date) => {
    if (!A.dateValide(date)) return '';
    let j = l.joursRecolte;
    if (mode === 'plant' && l.joursRepiquage) j = Math.max(15, l.joursRecolte - l.joursRepiquage);
    return A.ajouterJours(date, j);
  };
  A.repiquagePrevu = (l, mode, date) => (mode === 'semis-abri' && l.joursRepiquage && A.dateValide(date)) ? A.ajouterJours(date, l.joursRepiquage) : '';

  /** Surface occupée (m²) par une plantation : nombre de plants × place d'un plant. */
  /** Place d'un plant (cm²) en bac : l'espacement entre plants, et les trois quarts de l'écart entre rangs
      (en bac on serre un peu les rangs, les allées ne sont pas nécessaires). */
  A.placePlant = l => l.espacementPlants * Math.max(l.espacementPlants, 0.75 * l.espacementRang);
  A.surface = (l, nbPlants) => (Math.max(1, Number(nbPlants) || 1) * A.placePlant(l)) / 10000;

  /** Mauvais voisins dans un ensemble de plantations : [[legumeA, legumeB], …] */
  A.conflits = (plantations, parId) => {
    const ids = [...new Set(plantations.map(p => p.legumeId))].filter(id => parId[id]);
    const res = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++)
      if (parId[ids[i]].ennemis.includes(ids[j])) res.push([parId[ids[i]], parId[ids[j]]]);
    return res;
  };

  /* ---------- Rappels ---------- */
  /** Rappels calculés depuis les plantations en cours. { cle, type, date, plantation, legume, texte, fait } */
  A.rappels = async () => {
    const [{ parId }, plantations, faits, bacs] = await Promise.all([A.legumes(), A.db.tous('plantations'), A.db.tous('rappelsFaits'), A.db.tous('bacs')]);
    const fait = Object.fromEntries(faits.map(f => [f.cle, f.date]));
    const nomBac = Object.fromEntries(bacs.map(b => [b.id, b.nom]));
    const res = [];
    for (const p of plantations) {
      if (p.statut !== 'en-cours') continue;
      const l = parId[p.legumeId];
      if (!l) continue;
      const bac = nomBac[p.bacId] || 'bac supprimé';
      if (p.dateRepiquagePrevue) res.push({ cle: p.id + ':repiquage', type: 'repiquage', date: p.dateRepiquagePrevue, plantation: p, legume: l, texte: `Repiquer ${l.nom.toLowerCase()} (${bac})` });
      if (p.dateRecoltePrevue) res.push({ cle: p.id + ':recolte', type: 'recolte', date: p.dateRecoltePrevue, plantation: p, legume: l, texte: `Récolter ${l.nom.toLowerCase()} (${bac})` });
    }
    res.forEach(r => { r.fait = !!fait[r.cle]; r.faitLe = fait[r.cle] || ''; });
    return res.sort((a, b) => a.date.localeCompare(b.date));
  };
  /** Nombre de rappels à faire (en retard ou dans les 7 jours) pour la pastille de l'onglet. */
  A.majBadges = async () => {
    try {
      const fin = A.ajouterJours(A.aujourdhui(), 7);
      const n = (await A.rappels()).filter(r => !r.fait && r.date <= fin).length;
      if (A.badge) A.badge('rappels', n);
    } catch (e) { /* données pas encore prêtes : pas de pastille */ }
  };

  /* ---------- Petits morceaux d'interface partagés ---------- */
  A.ligneLegume = (l, detail) => `<li><a href="#/fiche/${A.esc(l.id)}"><span class="emoji" aria-hidden="true">${A.esc(l.emoji)}</span>
    <span class="ligne-texte">${A.esc(l.nom)}${detail ? `<small>${A.esc(detail)}</small>` : ''}</span><span class="chevron" aria-hidden="true">›</span></a></li>`;
})();
