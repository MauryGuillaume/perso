/* ==========================================================================
   ab-ia.js — assistant « Décris ton app »
   La clé de l'IA ne passe JAMAIS par le navigateur :
   - si le serveur local (serveur.js) tourne, la demande passe par lui ;
   - sinon, l'assistant affiche un prompt à copier dans Claude et un champ
     pour coller la réponse.
   ========================================================================== */
(function () {
  const U = AB.u;
  const IA = AB.ia = {};

  /** Adresse du serveur local. Vide = même origine (page servie par serveur.js). */
  IA.adresse = async function () {
    if (/^https?:/.test(location.protocol) && location.port === '8787') return '';
    return AB.db.getMeta('serveur_url', 'http://localhost:8787');
  };

  /** Le serveur local répond-il, et a-t-il une clé d'IA ? */
  IA.etat = async function () {
    try {
      const base = await IA.adresse();
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch(base + '/api/sante', { signal: ctrl.signal });
      if (!r.ok) return { joignable: false };
      return Object.assign({ joignable: true }, await r.json());
    } catch (e) {
      return { joignable: false };
    }
  };

  /** Consigne donnée à l'IA : le catalogue des blocs et le format de réponse attendu. */
  IA.systeme = function () {
    const catalogue = AB.blocs.derniers().map(b => ({
      id: b.id, nom: b.nom, description: b.description,
      reglages: b.reglages.map(r => ({ cle: r.cle, type: r.type, label: r.label }))
    }));
    return `Tu aides à composer une app mobile (PWA) à partir de blocs réutilisables.
Voici le catalogue des blocs disponibles (JSON) :
${JSON.stringify(catalogue, null, 1)}

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :
{
  "nom": "Nom de l'app",
  "icone": "mdi-...",                       // une icône Material Design Icons
  "theme": { "primaire": "#hex", "accent": "#hex" },
  "blocs": [ { "bloc": "<id du catalogue>", "reglages": { "<cle>": "valeur" }, "protege": false } ],
  "blocs_a_creer": [ { "nom": "...", "description": "ce que ce bloc manquant devrait faire" } ]
}
Utilise seulement des id du catalogue dans "blocs", dans l'ordre des écrans de l'app.
Mets "protege": true sur les blocs qui affichent des données personnelles (et ajoute alors le bloc "connexion" s'il existe).
Ne mets "theme" que si l'app a besoin de couleurs différentes de la charte commune.
Un même bloc peut apparaître plusieurs fois avec des réglages différents.
Pour un réglage de type "liste", mets une ligne par élément, séparées par \\n.
Mets dans "blocs_a_creer" les fonctions demandées qu'aucun bloc ne couvre. Textes en français.`;
  };

  /** Envoie la description au serveur local et renvoie la proposition (objet). */
  IA.demander = async function (description) {
    const base = await IA.adresse();
    const r = await fetch(base + '/api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systeme: IA.systeme(), message: description })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erreur || `Le serveur local a répondu ${r.status}.`);
    return IA.lireReponse(data.texte);
  };

  /** Extrait l'objet JSON d'une réponse de l'IA (tolère du texte autour). */
  IA.lireReponse = function (texte) {
    const t = String(texte || '');
    const debut = t.indexOf('{'), fin = t.lastIndexOf('}');
    if (debut < 0 || fin < debut) throw new Error('La réponse ne contient pas de JSON.');
    return JSON.parse(t.slice(debut, fin + 1));
  };

  /** Transforme une proposition de l'IA en app de la plateforme. */
  IA.versApp = function (prop) {
    const ignores = [];
    const blocs = [];
    (prop.blocs || []).forEach(x => {
      const def = AB.blocs.dernier(x.bloc);
      if (!def) { ignores.push(x.bloc); return; }
      const reglages = Object.assign(AB.blocs.reglagesParDefaut(def), x.reglages || {});
      blocs.push({ uid: U.uuid().slice(0, 8), bloc: def.id, version: def.version, reglages, protege: !!x.protege && def.id !== 'connexion' });
    });
    const aCreer = (prop.blocs_a_creer || []).map(b => `- ${b.nom} : ${b.description}`).concat(ignores.map(id => `- ${id} (proposé par l'IA, absent du catalogue)`));
    return {
      nom: prop.nom || 'Nouvelle app',
      icone: prop.icone || 'mdi-cellphone',
      surcharges: prop.theme || {},   // couleurs propres à l'app, par-dessus la charte
      blocs,
      notes: aCreer.length ? `Blocs à créer (proposés par l'assistant) :\n${aCreer.join('\n')}` : ''
    };
  };
})();
