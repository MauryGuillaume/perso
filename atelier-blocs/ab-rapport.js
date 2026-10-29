/* ==========================================================================
   ab-rapport.js — rapport d'audit de cybersécurité (page HTML autonome)
   Une seule page, sans script, imprimable en PDF (A4) : synthèse et note,
   évolution depuis l'audit précédent, couverture OWASP, plan d'action,
   constats détaillés avec preuves masquées, contrôles réussis, méthode.
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const P = AB.rapport = {};

  const COULEUR_NOTE = { A: '#2e7d32', B: '#558b2f', C: '#c49000', D: '#ef6c00', E: '#d84315', F: '#b71c1c' };
  const TYPES = { atelier: 'App de l’Atelier (modèle et fichiers générés)', code: 'Code source', url: 'Site en ligne' };
  P.COULEUR_NOTE = COULEUR_NOTE;
  P.TYPES = TYPES;

  const date = iso => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const chip = g => `<span class="g g-${g}">${esc(AB.audit.GRAVITES[g].label)}</span>`;

  /** Verdict en une phrase selon la note. */
  function verdict(a) {
    if (a.comptes.critique) return ['Insuffisant', 'Au moins une faille critique est présente : la mise en production est à proscrire tant qu’elle n’est pas corrigée.'];
    if (a.comptes.elevee) return ['À renforcer', 'Des failles de gravité élevée doivent être corrigées avant la mise en production.'];
    if (a.note === 'A') return ['Très bon', 'Aucune faille critique ou élevée n’a été détectée ; les points restants relèvent du durcissement.'];
    if (a.note === 'B') return ['Bon', 'Aucune faille critique ou élevée ; plusieurs points moyens méritent d’être traités rapidement.'];
    return ['Moyen', 'Pas de faille critique ou élevée, mais de nombreux points de configuration restent à corriger.'];
  }

  /** Jauge circulaire du score. */
  function jauge(score, note) {
    const r = 54, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score)) / 100;
    return `<svg width="148" height="148" viewBox="0 0 148 148" role="img" aria-label="Score ${score} sur 100, note ${note}">
      <circle cx="74" cy="74" r="${r}" fill="none" stroke="#e8eaf0" stroke-width="12"/>
      <circle cx="74" cy="74" r="${r}" fill="none" stroke="${COULEUR_NOTE[note]}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 74 74)"/>
      <text x="74" y="78" text-anchor="middle" font-size="44" font-weight="800" fill="${COULEUR_NOTE[note]}">${note}</text>
      <text x="74" y="104" text-anchor="middle" font-size="14" fill="#5b6070">${score} / 100</text></svg>`;
  }

  P.html = function (a, precedent) {
    const G = AB.audit.GRAVITES;
    const ko = a.resultats.filter(r => r.statut === 'ko').sort((x, y) => G[x.gravite].ordre - G[y.gravite].ordre || x.regle.localeCompare(y.regle));
    const ok = a.resultats.filter(r => r.statut === 'ok');
    const na = a.resultats.filter(r => r.statut === 'na' || r.statut === 'erreur');
    const R = id => AB.audit.regle(id) || { titre: id, description: '', impact: '', correction: '', refs: [], categorie: 'A05' };
    const [niveau, phrase] = verdict(a);
    const p = a.perimetre;
    const total = Object.values(a.comptes).reduce((s, n) => s + n, 0);

    // Évolution depuis l'audit précédent de la même cible
    let evolution = '';
    if (precedent) {
      const avant = new Set(precedent.resultats.filter(r => r.statut === 'ko').map(r => r.regle));
      const apres = new Set(ko.map(r => r.regle));
      const corriges = [...avant].filter(x => !apres.has(x)), nouveaux = [...apres].filter(x => !avant.has(x));
      const d = a.score - precedent.score;
      evolution = `<section><h2>Évolution depuis l’audit du ${esc(new Date(precedent.date).toLocaleDateString('fr-FR'))}</h2>
        <div class="evo"><div><span class="big" style="color:${d >= 0 ? '#2e7d32' : '#b71c1c'}">${d >= 0 ? '+' : ''}${d}</span> points (${precedent.score} → ${a.score}, note ${esc(precedent.note)} → ${esc(a.note)})</div>
        <div><b>${corriges.length}</b> point(s) corrigé(s)${corriges.length ? ' : ' + corriges.map(id => esc(`${id} ${R(id).titre}`)).join(' ; ') : ''}</div>
        <div><b>${nouveaux.length}</b> nouveau(x) point(s)${nouveaux.length ? ' : ' + nouveaux.map(id => esc(`${id} ${R(id).titre}`)).join(' ; ') : ''}</div></div></section>`;
    }

    // Couverture OWASP
    const cats = Object.keys(AB.audit.CATEGORIES).map(c => {
      const rs = a.resultats.filter(r => R(r.regle).categorie === c && r.statut !== 'na' && r.statut !== 'erreur');
      const k = rs.filter(r => r.statut === 'ko');
      const pire = k.sort((x, y) => G[x.gravite].ordre - G[y.gravite].ordre)[0];
      return `<tr><td>${esc(AB.audit.CATEGORIES[c])}</td><td class="c">${rs.length}</td><td class="c">${rs.length - k.length}</td><td class="c">${k.length}</td>
        <td>${!rs.length ? '<span class="muted">Non couvert par cette cible</span>' : pire ? chip(pire.gravite) : '<span class="g g-ok">Conforme</span>'}</td></tr>`;
    }).join('');

    // Plan d'action par délai
    const plan = Object.entries(G).filter(([g]) => g !== 'info').map(([g, info]) => {
      const rs = ko.filter(r => r.gravite === g);
      return rs.length ? `<div class="plan"><h3>${esc(info.delai)} <span class="muted">— ${esc(info.label.toLowerCase())}</span></h3><ol>${rs.map(r => `<li><b>${esc(r.regle)} ${esc(R(r.regle).titre)}</b> : ${esc(R(r.regle).correction)}</li>`).join('')}</ol></div>` : '';
    }).join('') || '<p>Aucune action nécessaire.</p>';

    const constats = ko.map(r => {
      const d = R(r.regle);
      const autres = r.total - r.constats.slice(0, 15).length;
      return `<article class="finding" style="border-left-color:${G[r.gravite].couleur}">
        <header><span class="id">${esc(r.regle)}</span><h3>${esc(d.titre)}</h3>${chip(r.gravite)}<span class="cat">${esc(AB.audit.CATEGORIES[d.categorie] || d.categorie)}</span></header>
        <p>${esc(d.description)}</p>
        <dl><dt>Impact</dt><dd>${esc(d.impact)}</dd><dt>Correction</dt><dd>${esc(d.correction)}</dd>
        ${d.refs && d.refs.length ? `<dt>Références</dt><dd>${esc(d.refs.join(' · '))}</dd>` : ''}</dl>
        <table class="occ"><thead><tr><th>Emplacement</th><th>Constat</th></tr></thead><tbody>
        ${r.constats.slice(0, 15).map(c => `<tr><td class="loc">${esc(c.fichier)}${c.ligne ? `<span class="muted">:${c.ligne}</span>` : ''}${c.gravite !== r.gravite ? ' ' + chip(c.gravite) : ''}</td>
          <td>${c.detail ? `<div>${esc(c.detail)}</div>` : ''}${c.extrait ? `<code>${esc(c.extrait)}</code>` : ''}</td></tr>`).join('')}
        ${autres > 0 ? `<tr><td colspan="2" class="muted">… et ${autres} autre(s) occurrence(s).</td></tr>` : ''}</tbody></table>
      </article>`;
    }).join('') || '<p>Aucun point à corriger.</p>';

    const resume = `L’audit automatisé ${a.cible.type === 'url' ? `du site <b>${esc(a.cible.url || a.cible.nom)}</b>` : `de <b>${esc(a.cible.nom)}</b>`} a appliqué
      ${a.resultats.length - na.length} contrôles de sécurité${p.fichiers ? ` sur ${p.fichiers.toLocaleString('fr-FR')} fichier(s) (${p.lignes.toLocaleString('fr-FR')} lignes)` : ''}.
      ${total ? `Il relève <b>${total} point(s)</b> à traiter, dont ${a.comptes.critique} critique(s) et ${a.comptes.elevee} de gravité élevée.` : 'Il ne relève aucun point à traiter.'}
      ${phrase}`;

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit de sécurité — ${esc(a.cible.nom)} — ${esc(new Date(a.date).toLocaleDateString('fr-FR'))}</title>
<style>
  :root { --ink: #12141c; --muted: #5b6070; --line: #e3e6ee; --bg: #f6f7fa; --brand: #001047; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.55 Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: var(--ink); background: #fff; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 0 32px 48px; }
  .cover { background: var(--brand); color: #fff; padding: 36px 0 30px; margin-bottom: 28px; }
  .cover .wrap { padding-bottom: 0; }
  .kicker { text-transform: uppercase; letter-spacing: .12em; font-size: 11px; opacity: .75; }
  .cover h1 { margin: 6px 0 4px; font-size: 28px; letter-spacing: -.01em; }
  .cover .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 20px; font-size: 12px; }
  .cover .meta b { display: block; font-size: 13px; }
  .cover .meta span { opacity: .7; }
  h2 { font-size: 18px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--ink); }
  h3 { font-size: 15px; margin: 0; }
  .synth { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 24px; align-items: center; }
  .niveau { font-size: 20px; font-weight: 700; margin: 0 0 6px; }
  .tiles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
  .tile { border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; border-top: 4px solid; }
  .tile b { font-size: 24px; display: block; line-height: 1.1; }
  .tile span { font-size: 12px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); background: var(--bg); }
  td.c { text-align: center; }
  .g { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 10px; color: #fff; white-space: nowrap; }
  .g-critique { background: #b71c1c; } .g-elevee { background: #e65100; } .g-moyenne { background: #f9a825; color: #3b2a00; }
  .g-faible { background: #1565c0; } .g-info { background: #607d8b; } .g-ok { background: #2e7d32; }
  .muted { color: var(--muted); }
  .evo { display: grid; gap: 6px; background: var(--bg); padding: 14px 16px; border-radius: 10px; }
  .evo .big { font-size: 20px; font-weight: 800; }
  .plan { margin-bottom: 12px; } .plan ol { margin: 6px 0 0; padding-left: 20px; } .plan li { margin: 4px 0; }
  .finding { border: 1px solid var(--line); border-left: 5px solid; border-radius: 10px; padding: 14px 16px; margin: 0 0 14px; break-inside: avoid; }
  .finding header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .finding .id { font: 600 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
  .finding .cat { font-size: 12px; color: var(--muted); margin-left: auto; }
  .finding p { margin: 4px 0 8px; }
  dl { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 4px 12px; margin: 0 0 10px; }
  dt { font-weight: 600; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; padding-top: 2px; }
  dd { margin: 0; }
  .occ td { font-size: 12.5px; }
  .occ .loc { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; width: 38%; }
  code { display: block; margin-top: 4px; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; background: #0f1118; color: #e6e8ef; padding: 6px 8px; border-radius: 6px; white-space: pre-wrap; word-break: break-all; }
  .cols { columns: 2; column-gap: 24px; list-style: none; padding: 0; } .cols li { break-inside: avoid; margin: 3px 0; }
  .note { background: var(--bg); border-radius: 10px; padding: 14px 16px; font-size: 13px; }
  footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  @media (max-width: 700px) { .wrap { padding: 0 16px 32px; } .cover .meta, .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } .synth { grid-template-columns: 1fr; } .cols { columns: 1; } dl { grid-template-columns: 1fr; } }
  @page { size: A4; margin: 14mm 12mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .cover { margin: 0 0 20px; } .wrap { padding: 0 4px; } h2 { break-after: avoid; } section { break-inside: auto; } }
</style></head><body>
<div class="cover"><div class="wrap">
  <div class="kicker">Rapport d’audit de cybersécurité</div>
  <h1>${esc(a.cible.nom)}</h1>
  <div>${esc(TYPES[a.cible.type] || a.cible.type)}${a.cible.url ? ' · ' + esc(a.cible.url) : ''}</div>
  <div class="meta">
    <div><span>Date</span><b>${esc(date(a.date))}</b></div>
    <div><span>Référence</span><b>AUD-${esc(a.id.slice(0, 8).toUpperCase())}</b></div>
    <div><span>Référentiel</span><b>OWASP Top 10 (2021)</b></div>
    <div><span>Moteur</span><b>Atelier de Blocs, règles v${esc(a.version)}</b></div>
  </div>
</div></div>
<div class="wrap">
<section><h2>Synthèse</h2>
  <div class="synth">${jauge(a.score, a.note)}
    <div><p class="niveau">Niveau de sécurité : ${esc(niveau)}</p><p style="margin:0">${resume}</p></div></div>
  <div class="tiles">${Object.entries(G).map(([g, i]) => `<div class="tile" style="border-top-color:${i.couleur}"><b>${a.comptes[g]}</b><span>${esc(i.label)}</span></div>`).join('')}</div>
</section>
${evolution}
<section><h2>Plan d’action</h2>${plan}</section>
<section><h2>Couverture OWASP Top 10</h2>
  <table><thead><tr><th>Catégorie</th><th class="c">Contrôles</th><th class="c">Conformes</th><th class="c">À corriger</th><th>Gravité max.</th></tr></thead><tbody>${cats}</tbody></table></section>
<section><h2>Constats détaillés (${ko.length})</h2>${constats}</section>
<section><h2>Contrôles conformes (${ok.length})</h2>
  ${ok.length ? `<ul class="cols">${ok.map(r => `<li><span class="g g-ok">OK</span> <b>${esc(r.regle)}</b> ${esc(R(r.regle).titre)}</li>`).join('')}</ul>` : '<p class="muted">Aucun.</p>'}</section>
${na.length ? `<section><h2>Contrôles non applicables à cette cible (${na.length})</h2><p class="muted">${na.map(r => esc(`${r.regle} ${R(r.regle).titre}`)).join(' · ')}</p></section>` : ''}
<section><h2>Périmètre et méthode</h2>
  <table><tbody>
    <tr><th style="width:220px">Cible</th><td>${esc(TYPES[a.cible.type] || a.cible.type)} : ${esc(a.cible.url || a.cible.nom)}${a.cible.source ? ' (' + esc(a.cible.source) + ')' : ''}</td></tr>
    ${p.fichiers ? `<tr><th>Fichiers analysés</th><td>${p.fichiers.toLocaleString('fr-FR')} fichier(s), ${p.lignes.toLocaleString('fr-FR')} lignes (${p.clients} côté navigateur, ${p.serveurs} côté serveur)${p.ignores ? ` ; ${p.ignores.toLocaleString('fr-FR')} fichier(s) ignoré(s) : dépendances, binaires, images, fichiers trop gros` : ''}</td></tr>` : ''}
    ${p.site ? `<tr><th>Site</th><td>${esc(p.site.final || p.site.url)} (HTTP ${esc(p.site.statut)}) ; ${p.site.scripts} script(s) du site analysé(s) ; en-têtes, certificat, redirection, CORS et ${'14'} chemins sensibles testés</td></tr>` : ''}
    <tr><th>Durée</th><td>${(a.duree / 1000).toFixed(1)} s</td></tr>
    <tr><th>Notation</th><td>100 points moins une pénalité par contrôle non conforme (critique 25, élevée 12, moyenne 5, faible 2). Note : A ≥ 90 sans point élevé, B ≥ 75, C ≥ 60, D ≥ 40, E en dessous ; F dès qu’un point critique est présent.</td></tr>
  </tbody></table>
  <p class="note"><b>Limites.</b> Cet audit est une analyse automatique (analyse statique du code et contrôle passif du site par requêtes de lecture). Il détecte les erreurs les plus fréquentes et les plus graves, mais ne remplace pas une revue de code manuelle ni un test d’intrusion par un professionnel. Les secrets trouvés sont masqués dans ce rapport ; un secret détecté doit être considéré comme compromis et renouvelé. La base de vulnérabilités des dépendances est une sélection : lancez aussi <i>npm audit</i>.</p>
</section>
<footer><span>Rapport généré par l’Atelier de Blocs · ${esc(date(a.date))}</span><span>AUD-${esc(a.id.slice(0, 8).toUpperCase())} · Confidentiel</span></footer>
</div></body></html>`;
  };
})();
