/* ==========================================================================
   ab-vue-reglages.js — réglages de la plateforme : sauvegarde, serveur local
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  AB.vues = AB.vues || {};

  AB.vues.reglages = async function (root) {
    AB.app.setCrumbs(['Réglages']);
    const url = await AB.db.getMeta('serveur_url', 'http://localhost:8787');

    root.innerHTML = `<div class="page">
      <div class="page-head"><div><div class="section-tag">Plateforme</div><h2 class="section-title">Réglages</h2>
        <p class="section-desc">Tout est enregistré dans ce navigateur. Exporte régulièrement une sauvegarde.</p></div></div>
      <div class="grid grid-2">
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-database-export-outline"></span>Sauvegarde</span></div>
          <div class="panel-body stack">
            <p class="muted" style="margin:0">Un fichier JSON avec toutes les apps, tous les blocs (toutes versions) et les réglages.</p>
            <div class="row"><button class="btn btn-primary" id="rgExport"><span class="mdi mdi-download"></span>Exporter la sauvegarde</button>
              <button class="btn btn-outline" id="rgImport"><span class="mdi mdi-upload"></span>Restaurer…</button></div>
            <div class="bar info"><span class="mdi mdi-github"></span><div>Prochaine étape prévue : enregistrer apps et blocs dans un dépôt GitHub (une modification = un commit).</div></div>
          </div></div>
        <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-server-outline"></span>Serveur local (facultatif)</span></div>
          <div class="panel-body stack">
            <p class="muted" style="margin:0">Il garde les clés secrètes hors du navigateur, relaie l’assistant IA et permet l’audit de sécurité d’un site en ligne. Sans lui, tout le reste fonctionne.</p>
            <div class="input-group"><label class="input-label">Adresse</label><input class="tv-input mono" id="rgUrl" value="${esc(url)}"></div>
            <div class="row"><button class="btn btn-outline" id="rgTest"><span class="mdi mdi-lan-connect"></span>Tester</button><span id="rgEtat"></span></div>
            <div class="input-hint">Pour le lancer (Node 18 ou plus récent), dans le dossier de la plateforme :</div>
            <pre class="code">ANTHROPIC_API_KEY=sk-ant-… node serveur.js
# puis ouvrir http://localhost:8787</pre>
            <div class="input-hint">La clé peut aussi être mise dans un fichier .env à côté de serveur.js. Elle n’est jamais envoyée au navigateur.</div>
          </div></div>
      </div>
      <div class="panel"><div class="panel-head"><span class="panel-label"><span class="mdi mdi-alert-outline"></span>Zone sensible</span></div>
        <div class="panel-body row"><button class="btn btn-danger-text" id="rgReset"><span class="mdi mdi-delete-forever-outline"></span>Tout effacer et repartir de zéro</button>
          <span class="small muted">Les blocs de base et les fiches des apps existantes seront réinstallés.</span></div></div>
    </div>`;

    const tester = async () => {
      const e = await AB.ia.etat();
      root.querySelector('#rgEtat').innerHTML = !e.joignable ? '<span class="chip chip-danger">Injoignable</span>'
        : e.ia ? `<span class="chip chip-success">Prêt · IA ${esc(e.modele || '')}</span>` : '<span class="chip chip-warning">Joignable, sans clé IA</span>';
      AB.app.majPied();
    };
    root.querySelector('#rgUrl').onchange = async e => { await AB.db.setMeta('serveur_url', e.target.value.trim().replace(/\/$/, '')); tester(); };
    root.querySelector('#rgTest').onclick = tester;
    root.querySelector('#rgExport').onclick = async () => {
      U.download(`atelier-blocs-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await AB.db.exportAll(), null, 2), 'application/json');
    };
    root.querySelector('#rgImport').onclick = async () => {
      const f = await U.pickFile('.json');
      if (!f) return;
      try {
        const data = JSON.parse(f.texte);
        const remplacer = await U.confirm('Restaurer la sauvegarde', 'Remplacer tout le contenu actuel ? (Annuler = fusionner avec l’existant)', { okLabel: 'Tout remplacer', danger: true });
        await AB.db.importAll(data, remplacer);
        await AB.blocs.charger();
        U.toast('success', 'Sauvegarde restaurée', `${(data.apps || []).length} app(s), ${(data.blocs || []).length} version(s) de bloc.`);
      } catch (e) { U.toast('error', 'Restauration impossible', e.message, 8000); }
    };
    root.querySelector('#rgReset').onclick = async () => {
      if (!(await U.confirm('Tout effacer', 'Toutes les apps, tous les blocs créés et tout l’historique seront effacés de ce navigateur. Exporte une sauvegarde avant.', { danger: true, okLabel: 'Tout effacer' }))) return;
      for (const t of ['apps', 'blocs', 'kits', 'meta', 'audits']) await AB.db.clear(t);
      location.reload();
    };
    tester();
    return {};
  };
})();
