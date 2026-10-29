/* texte.js — Notix : traitement du texte dicté (ponctuation à la voix, mots-clés, recherche, dates).
   Fonctions pures, sans accès au DOM : testables avec Node. */
(function (global) {
  'use strict';

  // Mots prononcés → signe. Le plus long d'abord (« point d'interrogation » avant « point »).
  const PONCTUATION = [
    ['nouveau paragraphe', '\n\n'],
    ['(?:retour )?[àa] la ligne', '\n'],
    ["point d['’ ]?interrogation", '?'],
    ["point d['’ ]?exclamation", '!'],
    ['points? de suspension', '…'],
    ['point[- ]virgule', ';'],
    ['deux[- ]points', ':'],
    ['(?:ouvre[rz]?|ouvrez) les guillemets', '«'],
    ['(?:ferme[rz]?|fermez) les guillemets', '»'],
    ['virgule', ','],
    ['point final', '.'],
    // « point » seul, sauf après un déterminant (« le point important », « un point »)
    ['(?<!\\b(?:le|un|au|du|ce|cet|bon|mon|ton|son|quel|même|chaque|ce|premier|dernier)\\s)point', '.']
  ];
  // Liste affichée dans Réglages
  const MOTS_PONCTUATION = [
    ['virgule', ','], ['point', '.'], ["point d'interrogation", '?'], ["point d'exclamation", '!'],
    ['deux points', ':'], ['point-virgule', ';'], ['points de suspension', '…'],
    ['ouvrez les guillemets', '«'], ['fermez les guillemets', '»'], ['à la ligne', 'retour à la ligne'],
    ['nouveau paragraphe', 'ligne vide']
  ];
  const D = '\u0001', F = '\u0002', INS = ' '; // marqueurs internes, espace insécable

  const REGLES = PONCTUATION.map(([motif, signe]) => [new RegExp('(^|\\s)' + motif + '(?=[\\s.,;:!?]|$)', 'giu'), signe]);

  /** Met une majuscule en début de texte et après . ! ? … ou un retour à la ligne. */
  function majuscules(t, debut = true) {
    return t.replace(/(^|[.!?…]\s+|\n[  ]*)(\p{Ll})/gu, (m, avant, lettre, pos) => (pos === 0 && !debut && !avant ? m : avant + lettre.toUpperCase()));
  }

  /** Remplace les mots de ponctuation dictés par les signes, avec les espaces à la française. */
  function ponctuer(segment) {
    let s = String(segment || '');
    for (const [re, signe] of REGLES) s = s.replace(re, (m, esp) => esp + D + signe + F);
    s = s
      .replace(/[ \t]*\u0001([,.…])\u0002[ \t]*/g, '$1 ')
      .replace(/[ \t]*\u0001([;:!?])\u0002[ \t]*/g, INS + '$1 ')
      .replace(/\u0001«\u0002[ \t]*/g, '«' + INS)
      .replace(/[ \t]*\u0001»\u0002/g, INS + '»')
      .replace(/[ \t]*\u0001(\n+)\u0002[ \t]*/g, '$1')
      .replace(/[\u0001\u0002]/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +\n/g, '\n');
    return majuscules(s, false).replace(/^ +| +$/g, '');
  }

  /** Ajoute un segment dicté à la fin du texte, avec la bonne espace et la majuscule si une phrase commence. */
  function joindre(avant, segment) {
    let seg = String(segment || '').replace(/^[ \t]+|[ \t]+$/g, '');
    if (!seg.replace(/ /g, '').trim() && !seg.includes('\n')) return avant;
    avant = String(avant || '');
    const fin = avant.replace(/[ \t ]+$/, '');
    const debutPhrase = !fin || /[.!?…]$/.test(fin) || /\n$/.test(fin);
    if (debutPhrase) seg = seg.replace(/^([\s «]*)(\p{Ll})/u, (m, a, l) => a + l.toUpperCase());
    if (!avant) return seg.replace(/^[\s ]+/, '');
    let sep = ' ';
    if (/^[ ]?[,.…)\n]/.test(seg) || /\s$/.test(avant)) sep = '';
    if (/^ /.test(seg)) sep = '';
    return avant + sep + seg;
  }

  /** Minuscules sans accents, même longueur que le texte d'origine (les positions correspondent). */
  function normaliser(t) {
    let r = '';
    for (const c of String(t || '')) {
      const n = c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      r += n ? [...n][0] : c;
    }
    return r;
  }

  /** Si le texte commence par un mot-clé d'un dossier, renvoie { dossier, motCle, texte sans le mot-clé }. */
  function classer(texte, dossiers) {
    const t = String(texte || '').replace(/^[\s ]+/, '');
    const n = normaliser(t);
    const candidats = [];
    (dossiers || []).forEach(d => (d.motsCles || []).forEach(k => { const nk = normaliser(k).trim(); if (nk) candidats.push([nk, k, d]); }));
    candidats.sort((a, b) => b[0].length - a[0].length);
    for (const [nk, k, d] of candidats) {
      if (!n.startsWith(nk)) continue;
      const suivant = n.charAt(nk.length);
      if (suivant && /[\p{L}\p{N}]/u.test(suivant)) continue;
      const reste = t.slice(nk.length).replace(/^[\s ,:;.\-–—]+/, '');
      return { dossier: d, motCle: k, texte: reste.replace(/^(\p{Ll})/u, l => l.toUpperCase()) };
    }
    return null;
  }

  /** Recherche plein texte : tous les mots, sans tenir compte des accents ni des majuscules. */
  function rechercher(notes, requete, nomDossier) {
    const mots = normaliser(requete).split(/\s+/).filter(Boolean);
    if (!mots.length) return notes.slice();
    return notes.filter(note => {
      const cible = normaliser(note.texte + ' ' + (nomDossier ? nomDossier(note.dossierId) : ''));
      return mots.every(m => cible.includes(m));
    });
  }

  /** Tri : épinglées d'abord, puis la plus récemment modifiée. */
  function trier(notes) {
    return notes.slice().sort((a, b) => (b.epinglee ? 1 : 0) - (a.epinglee ? 1 : 0) || String(b.modifieeLe).localeCompare(String(a.modifieeLe)));
  }

  function extrait(texte, max = 140) {
    const t = String(texte || '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const coupe = t.slice(0, max);
    return coupe.slice(0, Math.max(coupe.lastIndexOf(' '), max - 20)).replace(/[\s,;:]+$/, '') + '…';
  }

  /** « Aujourd'hui, 08:12 », « Hier, 19:40 », « 12 oct. », « 12 oct. 2025 ». */
  function dateCourte(iso, maintenant = new Date()) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const jour = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const ecart = Math.round((jour(maintenant) - jour(d)) / 86400000);
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (ecart === 0) return "Aujourd'hui, " + heure;
    if (ecart === 1) return 'Hier, ' + heure;
    return d.toLocaleDateString('fr-FR', d.getFullYear() === maintenant.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function dateLongue(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** « courses, Acheter ; courses » → ['courses', 'acheter'] */
  function lireMotsCles(saisie) {
    const vus = new Set(), r = [];
    String(saisie || '').split(/[,;\n]/).map(k => k.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean).forEach(k => {
      const n = normaliser(k); if (!vus.has(n)) { vus.add(n); r.push(k.slice(0, 40)); }
    });
    return r.slice(0, 20);
  }

  const api = { ponctuer, joindre, majuscules, normaliser, classer, rechercher, trier, extrait, dateCourte, dateLongue, lireMotsCles, MOTS_PONCTUATION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.notixTexte = api;
})(typeof window !== 'undefined' ? window : globalThis);
