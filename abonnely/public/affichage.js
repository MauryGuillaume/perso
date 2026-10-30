/* affichage.js — kit « Affichage France » v2.0 (Atelier de Blocs). PRÊT ET TESTÉ : ne pas modifier.
   Formats français pour tout ce qui s'affiche : prix, nombres, dates, heures, téléphones, pluriels, tailles.
   Navigateur (window.fr, et appli.prix / appli.date si appli existe) ou Node (require('./affichage.js')). */
(function (racine) {
  'use strict';
  const R = { langue: 'fr-FR', devise: 'EUR', fuseau: 'Europe/Paris' };
  const fr = {};
  const cache = {};
  const fmt = (genre, options) => {
    const cle = genre + JSON.stringify(options) + R.langue + R.fuseau;
    if (!cache[cle]) cache[cle] = new Intl[genre](R.langue, genre === 'DateTimeFormat' ? Object.assign({ timeZone: R.fuseau }, options) : options);
    return cache[cle];
  };

  /** Réglages : fr.reglages({ devise: 'EUR', fuseau: 'Europe/Paris', langue: 'fr-FR' }). */
  fr.reglages = function (r) { Object.assign(R, r || {}); for (const k in cache) delete cache[k]; return Object.assign({}, R); };

  const nombreOuNul = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);

  /** 12.5 → « 12,50 € » ; { centimes: false } → « 13 € » ; { centimes: 'auto' } → « 12 € » mais « 12,50 € ». */
  fr.prix = function (montant, o) {
    const n = nombreOuNul(montant);
    if (n === null) return '';
    o = o || {};
    const sansCentimes = o.centimes === false || (o.centimes === 'auto' && Number.isInteger(n));
    return fmt('NumberFormat', { style: 'currency', currency: o.devise || R.devise, minimumFractionDigits: sansCentimes ? 0 : 2, maximumFractionDigits: sansCentimes ? 0 : 2 }).format(n);
  };
  /** Montant stocké en centimes (entier) → « 12,50 € ». */
  fr.prixCentimes = (centimes, o) => nombreOuNul(centimes) === null ? '' : fr.prix(Number(centimes) / 100, o);
  /** Arrondi à 2 décimales, sans les erreurs du flottant (1.005 → 1.01). */
  fr.arrondi = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  /** HT → TTC et TTC → HT (taux en %, 20 par défaut). */
  fr.ttc = (ht, taux) => fr.arrondi(Number(ht) * (1 + (taux === undefined ? 20 : taux) / 100));
  fr.ht = (ttc, taux) => fr.arrondi(Number(ttc) / (1 + (taux === undefined ? 20 : taux) / 100));
  /** « 12,5 » ou « 1 234,50 € » saisi → 12.5 / 1234.5 (null si illisible). */
  fr.lireMontant = function (texte) {
    const s = String(texte == null ? '' : texte).replace(/[\s  €]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
  };

  /** 1234.5 → « 1 234,5 » ; décimales fixes : fr.nombre(3, 2) → « 3,00 ». */
  fr.nombre = function (n, decimales) {
    const v = nombreOuNul(n);
    if (v === null) return '';
    return fmt('NumberFormat', decimales === undefined ? { maximumFractionDigits: 2 } : { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(v);
  };
  /** 0.205 → « 20,5 % » (une fraction, pas un nombre de 0 à 100). */
  fr.pourcent = (x, decimales) => nombreOuNul(x) === null ? '' : fmt('NumberFormat', { style: 'percent', maximumFractionDigits: decimales === undefined ? 1 : decimales }).format(Number(x));

  /** Une date « 2026-10-22 » (sans heure) reste ce jour-là, quel que soit le fuseau. */
  function enDate(d) {
    if (d === null || d === undefined || d === '') return null;
    if (d instanceof Date) return isNaN(d) ? null : d;
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return { jour: d };
    const x = new Date(d);
    return isNaN(x) ? null : x;
  }
  const FORMATS = {
    court: { day: '2-digit', month: '2-digit', year: 'numeric' },     // 22/10/2026
    long: { day: 'numeric', month: 'long', year: 'numeric' },         // 22 octobre 2026
    jour: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, // jeudi 22 octobre 2026
    abrege: { day: 'numeric', month: 'short' },                       // 22 oct.
    mois: { month: 'long', year: 'numeric' }                          // octobre 2026
  };
  /** Date : 'court' (défaut), 'long', 'jour', 'abrege', 'mois'. */
  fr.date = function (d, format) {
    const x = enDate(d);
    if (!x) return '';
    const o = FORMATS[format || 'court'] || FORMATS.court;
    if (x.jour) { const [a, m, j] = x.jour.split('-').map(Number); return fmt('DateTimeFormat', Object.assign({}, o, { timeZone: 'UTC' })).format(new Date(Date.UTC(a, m - 1, j))); }
    return fmt('DateTimeFormat', o).format(x);
  };
  /** « 14:30 » */
  fr.heure = function (d) { const x = enDate(d); return !x || x.jour ? '' : fmt('DateTimeFormat', { hour: '2-digit', minute: '2-digit' }).format(x); };
  /** « 22/10/2026 à 14:30 » (format 'long' : « 22 octobre 2026 à 14:30 »). */
  fr.dateHeure = function (d, format) { const x = enDate(d); return !x ? '' : x.jour ? fr.date(d, format) : `${fr.date(x, format)} à ${fr.heure(x)}`; };
  /** « il y a 3 jours », « hier », « dans 2 heures », « à l'instant ». */
  fr.relatif = function (d, maintenant) {
    const x = enDate(d);
    if (!x) return '';
    const t = x.jour ? new Date(x.jour + 'T12:00:00').getTime() : x.getTime();
    const ecart = (t - (maintenant ? new Date(maintenant).getTime() : Date.now())) / 1000;
    const a = Math.abs(ecart);
    if (a < 45) return 'à l’instant';
    const rtf = fmt('RelativeTimeFormat', { numeric: 'auto' });
    const pas = [[60, 'second', 1], [3600, 'minute', 60], [86400, 'hour', 3600], [604800, 'day', 86400], [2629800, 'week', 604800], [31557600, 'month', 2629800], [Infinity, 'year', 31557600]];
    for (const [limite, unite, div] of pas) if (a < limite) return rtf.format(Math.round(ecart / div), unite);
  };
  /** Pour un champ <input type="date"> : « 2026-10-22 » dans le fuseau de l'app. */
  fr.dateIso = function (d) {
    const x = enDate(d || new Date());
    if (!x) return '';
    if (x.jour) return x.jour;
    const p = fmt('DateTimeFormat', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(x).reduce((o, q) => (o[q.type] = q.value, o), {});
    return `${p.year}-${p.month}-${p.day}`;
  };

  /** « 0612345678 » ou « +33612345678 » → « 06 12 34 56 78 » / « +33 6 12 34 56 78 ». Sinon le texte reçu. */
  fr.telephone = function (t) {
    const s = String(t == null ? '' : t).replace(/[\s.\-()]/g, '');
    let m = s.match(/^0(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (m) return `0${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`;
    m = s.match(/^(?:\+|00)33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (m) return `+33 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`;
    return String(t == null ? '' : t);
  };
  /** Règle française : 0 et 1 au singulier. fr.pluriel(3, 'client') → « 3 clients » ; forme irrégulière en 3e argument. */
  fr.pluriel = (n, singulier, pluriel) => `${fr.nombre(n)} ${Math.abs(Number(n)) < 2 ? singulier : (pluriel || singulier + 's')}`;
  /** ['a', 'b', 'c'] → « a, b et c ». */
  fr.liste = (elements, ou) => fmt('ListFormat', { style: 'long', type: ou ? 'disjunction' : 'conjunction' }).format((elements || []).map(String));
  /** 1234567 → « 1,2 Mo ». */
  fr.taille = function (octets) {
    const n = nombreOuNul(octets);
    if (n === null) return '';
    const u = ['octets', 'Ko', 'Mo', 'Go', 'To'];
    let i = 0, v = n;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return i === 0 ? fr.pluriel(n, 'octet') : `${fr.nombre(v, v < 10 ? 1 : 0)} ${u[i]}`;
  };

  if (typeof module === 'object' && module.exports) module.exports = fr;
  if (racine) {
    racine.fr = fr;
    if (racine.appli) Object.assign(racine.appli, { prix: fr.prix, date: fr.date, heure: fr.heure, nombre: fr.nombre });
  }
})(typeof window !== 'undefined' ? window : null);
