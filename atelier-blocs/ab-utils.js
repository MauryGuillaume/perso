/* ==========================================================================
   ab-utils.js — petits outils partagés : échappement, identifiants, dates,
   toasts, dialogues, téléchargement.
   ========================================================================== */
window.AB = window.AB || {};
(function () {
  const U = AB.u = {};

  /** Échappe une valeur avant de l'insérer dans du HTML. À utiliser partout. */
  U.esc = function (v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  U.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  U.now = () => new Date().toISOString();

  /** Date lisible en français : « 20 oct. 2026, 14:05 ». */
  U.fmtDate = function (iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  /** Transforme un texte en identifiant : « Prise de RDV » → « prise-de-rdv ». */
  U.slug = function (s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  U.clone = obj => JSON.parse(JSON.stringify(obj));

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- Toasts ---------- */
  U.toast = function (type, titre, message, duree) {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `<b>${U.esc(titre)}</b>${message ? `<span class="muted">${U.esc(message)}</span>` : ''}`;
    box.appendChild(t);
    setTimeout(() => t.remove(), duree || 4000);
  };

  /* ---------- Dialogues ----------
     actions : [{ label, cls, icon, onClick: async ({ body, close }) => false pour garder ouvert }] */
  U.dialog = function ({ title, size, body, actions }) {
    const back = document.createElement('div');
    back.className = 'dlg-back';
    back.innerHTML = `<div class="dlg ${size || 'md'}" role="dialog" aria-modal="true">
      <div class="dlg-head">${U.esc(title)}<div class="spacer"></div><button class="btn btn-ghost btn-icon btn-sm" data-close><span class="mdi mdi-close"></span></button></div>
      <div class="dlg-body"></div>
      <div class="dlg-foot"></div></div>`;
    const bodyEl = back.querySelector('.dlg-body');
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape' && [...document.querySelectorAll('.dlg-back')].pop() === back) close(); };   // Échap ferme seulement le dialogue du dessus
    document.addEventListener('keydown', onKey);
    back.querySelector('[data-close]').onclick = close;
    const foot = back.querySelector('.dlg-foot');
    (actions || [{ label: 'Fermer', cls: 'btn-outline' }]).forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || 'btn-outline');
      b.innerHTML = (a.icon ? `<span class="mdi ${a.icon}"></span>` : '') + U.esc(a.label);
      b.onclick = async () => {
        const keep = a.onClick ? await a.onClick({ body: bodyEl, close }) : true;
        if (keep !== false) close();
      };
      foot.appendChild(b);
    });
    document.body.appendChild(back);
    const first = bodyEl.querySelector('input, textarea, select');
    if (first) first.focus();
    return { body: bodyEl, close };
  };

  U.confirm = function (titre, message, opts) {
    opts = opts || {};
    return new Promise(resolve => {
      U.dialog({
        title: titre, size: 'sm', body: `<p style="margin:0">${U.esc(message)}</p>`,
        actions: [
          { label: 'Annuler', cls: 'btn-outline', onClick: () => resolve(false) },
          { label: opts.okLabel || 'Confirmer', cls: opts.danger ? 'btn-danger' : 'btn-primary', onClick: () => resolve(true) }
        ]
      });
    });
  };

  /** Demande un texte court. Renvoie null si annulé. */
  U.prompt = function (titre, label, valeur) {
    return new Promise(resolve => {
      let ok = false;
      U.dialog({
        title: titre, size: 'sm',
        body: `<div class="input-group"><label class="input-label">${U.esc(label)}</label><input class="tv-input" id="dlgPrompt" value="${U.esc(valeur || '')}"></div>`,
        actions: [
          { label: 'Annuler', cls: 'btn-outline', onClick: () => resolve(null) },
          { label: 'Valider', cls: 'btn-primary', onClick: ({ body }) => { ok = true; resolve(body.querySelector('#dlgPrompt').value.trim()); } }
        ]
      });
    });
  };

  /* ---------- Fichiers ---------- */
  U.download = function (nom, contenu, type) {
    const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /** Ouvre le sélecteur de fichiers et renvoie le texte du fichier choisi. */
  U.pickFile = function (accept) {
    return new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = accept || '';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve({ nom: f.name, texte: r.result });
        r.readAsText(f);
      };
      inp.click();
    });
  };

  /* ---------- Versions (semver simple : 1.2.3) ---------- */
  U.cmpVersion = function (a, b) {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  };
  U.bumpVersion = function (v, niveau) {
    const p = String(v || '0.0.0').split('.').map(n => Number(n) || 0);
    if (niveau === 'majeure') return `${p[0] + 1}.0.0`;
    if (niveau === 'mineure') return `${p[0]}.${p[1] + 1}.0`;
    return `${p[0]}.${p[1]}.${p[2] + 1}`;
  };
})();
