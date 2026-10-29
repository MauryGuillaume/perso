/* ==========================================================================
   ab-fichiers.js — fichiers joints, gardés dans le navigateur (table « fichiers »)
   - les documents d'un kit (KIT.md, exemples de code, images, PDF…) :
     propriétaire « kit:<id>@<version> » ;
   - le code d'une app (le ZIP livré par Claude, une ligne par version) :
     propriétaire « app:<id> ».
   Une ligne : { id, proprio, chemin, type, taille, date, blob }.
   Aussi : lecture d'un ZIP (fichiers binaires compris) et panneau de gestion
   (ajouter des fichiers, un dossier ou un ZIP ; voir, télécharger, supprimer).
   ========================================================================== */
(function () {
  const U = AB.u, esc = U.esc;
  const F = AB.fichiers = {};

  const TYPES = {
    md: 'text/markdown', markdown: 'text/markdown', txt: 'text/plain', json: 'application/json', js: 'text/javascript', mjs: 'text/javascript',
    ts: 'text/plain', tsx: 'text/plain', jsx: 'text/plain', vue: 'text/plain', css: 'text/css', html: 'text/html', htm: 'text/html',
    sql: 'text/plain', prisma: 'text/plain', csv: 'text/csv', yml: 'text/plain', yaml: 'text/plain', xml: 'text/xml', svg: 'image/svg+xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf', zip: 'application/zip'
  };
  const ext = chemin => (String(chemin).split('.').pop() || '').toLowerCase();
  F.type = chemin => TYPES[ext(chemin)] || 'application/octet-stream';
  /** Fichier lisible comme du texte (aperçu, inclus dans le prompt). */
  F.estTexte = chemin => /^(text\/|application\/json|image\/svg)/.test(F.type(chemin)) || /^(\.env\.example|dockerfile|makefile|license|readme)$/i.test(String(chemin).split('/').pop());
  F.estImage = chemin => /^image\//.test(F.type(chemin));
  F.taille = n => n < 1024 ? `${n} o` : n < 1048576 ? `${Math.round(n / 1024)} Ko` : `${(n / 1048576).toFixed(1)} Mo`;
  /** Fichiers système à ne jamais garder. */
  const PARASITE = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/;

  /* ---------- Stockage ---------- */
  F.lister = async proprio => (await AB.db.parIndex('fichiers', 'proprio', proprio)).sort((a, b) => a.chemin.localeCompare(b.chemin, 'fr'));

  /** Ajoute (ou remplace, même chemin) un fichier. donnees : Blob, Uint8Array ou texte. */
  F.ajouter = async function (proprio, chemin, donnees, existants) {
    chemin = String(chemin).replace(/\\/g, '/').replace(/^\/+/, '');
    const blob = donnees instanceof Blob ? donnees : new Blob([donnees], { type: F.type(chemin) });
    const deja = (existants || await F.lister(proprio)).find(f => f.chemin === chemin);
    const rec = { id: deja ? deja.id : U.uuid(), proprio, chemin, type: F.type(chemin), taille: blob.size, date: U.now(), blob };
    await AB.db.put('fichiers', rec);
    return rec;
  };
  F.supprimer = id => AB.db.remove('fichiers', id);
  F.vider = async proprio => { for (const f of await F.lister(proprio)) await F.supprimer(f.id); };
  /** Copie tous les fichiers d'un propriétaire vers un autre (nouvelle version d'un kit). */
  F.copier = async function (de, vers) {
    for (const f of await F.lister(de)) await AB.db.put('fichiers', Object.assign({}, f, { id: U.uuid(), proprio: vers, date: U.now() }));
  };
  F.texte = async f => (f.blob || f).text();
  F.octets = async f => new Uint8Array(await (f.blob || f).arrayBuffer());

  /* ---------- Sauvegarde (JSON) : le contenu passe en base64 ---------- */
  F.versSauvegarde = async function () {
    const tous = await AB.db.list('fichiers');
    const sortie = [];
    for (const f of tous) {
      const data = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1] || ''); r.readAsDataURL(f.blob); });
      sortie.push(Object.assign({}, f, { blob: undefined, base64: data }));
    }
    return sortie;
  };
  F.depuisSauvegarde = function (f) {
    const bin = atob(f.base64 || ''), octets = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) octets[i] = bin.charCodeAt(i);
    const rec = Object.assign({}, f, { blob: new Blob([octets], { type: f.type || F.type(f.chemin) }) });
    delete rec.base64;
    return rec;
  };

  /* ---------- Lecture d'un ZIP (stocké ou deflate), fichiers binaires compris ---------- */
  /** Renvoie { fichiers: { chemin: Uint8Array }, racine } ; le dossier racine commun (projet/…) est retiré. */
  F.lireZip = async function (blob) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let fin = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
    if (fin < 0) throw new Error('Ce fichier n’est pas un ZIP valide.');
    const n = dv.getUint16(fin + 10, true);
    let p = dv.getUint32(fin + 16, true);
    if (p === 0xffffffff || n === 0xffff) throw new Error('ZIP trop volumineux (ZIP64) : recompresse-le sans node_modules.');
    const dec = new TextDecoder('utf-8');
    const entrees = [];
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const methode = dv.getUint16(p + 10, true), taille = dv.getUint32(p + 20, true);
      const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
      const chemin = dec.decode(buf.subarray(p + 46, p + 46 + ln));
      p += 46 + ln + le + lc;
      if (chemin.endsWith('/') || PARASITE.test(chemin)) continue;
      entrees.push({ chemin, methode, taille, local });
    }
    const premier = entrees.length ? entrees[0].chemin.split('/')[0] : '';
    const racine = entrees.length && entrees.every(e => e.chemin.includes('/') && e.chemin.split('/')[0] === premier) ? premier + '/' : '';
    const fichiers = {};
    for (const e of entrees) {
      if (e.methode !== 0 && e.methode !== 8) throw new Error(`Compression non prise en charge pour ${e.chemin}.`);
      const debut = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
      let octets = buf.slice(debut, debut + e.taille);
      if (e.methode === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien pour lire un ZIP (Chrome, Edge, Firefox ou Safari récents).');
        octets = new Uint8Array(await new Response(new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      }
      fichiers[e.chemin.slice(racine.length)] = octets;
    }
    return { fichiers, racine: racine.replace(/\/$/, '') };
  };
  F.decoder = octets => new TextDecoder('utf-8').decode(octets);

  /** Fichiers choisis avec un <input type="file">. dossier=true : un dossier entier. */
  F.choisir = function ({ accept, multiple, dossier } = {}) {
    return new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file';
      if (accept) inp.accept = accept;
      if (multiple) inp.multiple = true;
      if (dossier) { inp.webkitdirectory = true; inp.multiple = true; }
      inp.onchange = () => resolve([...inp.files]);
      inp.click();
    });
  };

  /* ---------- Panneau de gestion des fichiers d'un propriétaire ----------
     opts : { titre, aide, lectureSeule, ignorer: RegExp, apres() } */
  F.panneau = function (conteneur, proprio, opts = {}) {
    let liste = [];
    const dessiner = async () => {
      liste = await F.lister(proprio);
      const total = liste.reduce((t, f) => t + f.taille, 0);
      conteneur.innerHTML = `<div class="stack">
        ${opts.aide ? `<p class="muted" style="margin:0">${opts.aide}</p>` : ''}
        ${opts.lectureSeule ? '' : `<div class="row"><button class="btn btn-outline btn-sm" data-fi="fichiers"><span class="mdi mdi-file-plus-outline"></span>Ajouter des fichiers</button>
          <button class="btn btn-outline btn-sm" data-fi="dossier"><span class="mdi mdi-folder-plus-outline"></span>Ajouter un dossier</button>
          <button class="btn btn-outline btn-sm" data-fi="zip"><span class="mdi mdi-folder-zip-outline"></span>Ajouter le contenu d’un ZIP</button>
          <button class="btn btn-outline btn-sm" data-fi="texte"><span class="mdi mdi-file-document-edit-outline"></span>Nouveau fichier texte</button>
          <span class="spacer"></span><span class="small muted">${liste.length} fichier(s) · ${F.taille(total)}</span></div>`}
        ${liste.length ? `<div class="table-wrap"><table class="tv-table"><thead><tr><th>Fichier</th><th>Taille</th><th></th></tr></thead><tbody>
          ${liste.map(f => {
            const parts = f.chemin.split('/'), nom = parts.pop();
            return `<tr><td><span class="mdi ${F.estImage(f.chemin) ? 'mdi-file-image-outline' : F.estTexte(f.chemin) ? 'mdi-file-document-outline' : 'mdi-file-outline'}"></span>
              ${parts.length ? `<span class="muted">${esc(parts.join('/'))}/</span>` : ''}<b>${esc(nom)}</b></td>
              <td class="small muted" style="white-space:nowrap">${F.taille(f.taille)}</td>
              <td class="actions" style="white-space:nowrap">
                ${F.estTexte(f.chemin) || F.estImage(f.chemin) ? `<button class="btn btn-ghost btn-icon btn-sm" data-voir="${esc(f.id)}" title="${opts.lectureSeule ? 'Voir' : 'Voir ou modifier'}"><span class="mdi mdi-eye-outline"></span></button>` : ''}
                <button class="btn btn-ghost btn-icon btn-sm" data-dl="${esc(f.id)}" title="Télécharger"><span class="mdi mdi-download"></span></button>
                ${opts.lectureSeule ? '' : `<button class="btn btn-ghost btn-icon btn-sm" data-sup="${esc(f.id)}" title="Supprimer"><span class="mdi mdi-close"></span></button>`}</td></tr>`;
          }).join('')}</tbody></table></div>`
          : `<div class="empty" style="padding:16px"><span class="mdi mdi-folder-open-outline"></span>Aucun fichier pour l’instant.</div>`}</div>`;
      const trouver = id => liste.find(f => f.id === id);
      conteneur.querySelectorAll('[data-dl]').forEach(b => b.onclick = () => { const f = trouver(b.dataset.dl); U.download(f.chemin.split('/').pop(), f.blob); });
      conteneur.querySelectorAll('[data-sup]').forEach(b => b.onclick = async () => {
        const f = trouver(b.dataset.sup);
        if (!(await U.confirm('Supprimer le fichier', `${f.chemin} sera supprimé.`, { danger: true, okLabel: 'Supprimer' }))) return;
        await F.supprimer(f.id); await dessiner(); if (opts.apres) opts.apres();
      });
      conteneur.querySelectorAll('[data-voir]').forEach(b => b.onclick = () => voir(trouver(b.dataset.voir)));
      conteneur.querySelectorAll('[data-fi]').forEach(b => b.onclick = () => ajouter(b.dataset.fi));
    };

    async function voir(f) {
      if (F.estImage(f.chemin) && !/svg/.test(f.type)) {
        const url = URL.createObjectURL(f.blob);
        U.dialog({ title: f.chemin, size: 'lg', body: `<div style="text-align:center"><img src="${url}" alt="" style="max-width:100%;max-height:70vh"></div>` });
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      const texte = await F.texte(f);
      U.dialog({
        title: f.chemin, size: 'lg',
        body: `<textarea class="tv-textarea code" id="fiTexte" spellcheck="false" style="min-height:60vh;white-space:pre" ${opts.lectureSeule ? 'readonly' : ''}>${esc(texte)}</textarea>`,
        actions: opts.lectureSeule ? [{ label: 'Fermer' }] : [{ label: 'Fermer' }, { label: 'Enregistrer', cls: 'btn-primary', onClick: async ({ body }) => {
          await F.ajouter(proprio, f.chemin, body.querySelector('#fiTexte').value, liste);
          await dessiner(); if (opts.apres) opts.apres();
        } }]
      });
    }

    async function ajouter(mode) {
      let n = 0;
      try {
        if (mode === 'texte') {
          const chemin = await U.prompt('Nouveau fichier', 'Nom du fichier (avec un dossier si besoin, ex. exemples/accueil.md)', 'notes.md');
          if (!chemin) return;
          await F.ajouter(proprio, chemin, '', liste); n = 1;
        } else if (mode === 'zip') {
          const [z] = await F.choisir({ accept: '.zip' });
          if (!z) return;
          const { fichiers } = await F.lireZip(z);
          for (const [chemin, octets] of Object.entries(fichiers)) { if (opts.ignorer && opts.ignorer.test(chemin)) continue; await F.ajouter(proprio, chemin, octets, liste); n++; }
        } else {
          const choisis = await F.choisir({ multiple: true, dossier: mode === 'dossier' });
          for (const f of choisis) {
            const chemin = mode === 'dossier' ? (f.webkitRelativePath || f.name).replace(/^[^/]+\//, '') : f.name;
            if (PARASITE.test(chemin) || /(^|\/)(node_modules|\.git)\//.test(chemin) || (opts.ignorer && opts.ignorer.test(chemin))) continue;
            await F.ajouter(proprio, chemin, f, liste); n++;
          }
        }
      } catch (e) { return U.toast('error', 'Ajout impossible', e.message, 8000); }
      if (n) U.toast('success', `${n} fichier(s) ajouté(s)`);
      await dessiner();
      if (n && opts.apres) opts.apres();
    }

    dessiner();
    return { rafraichir: dessiner };
  };
})();
