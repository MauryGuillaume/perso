/* ==========================================================================
   bloc-avatar.js — bloc « Coach avatar » (motivation par le jeu)
   Le joueur a un personnage qui évolue avec son niveau (5 stades), gagne
   des skins en progressant, est accompagné d'un compagnon qui évolue lui
   aussi, et voit chaque exercice animé dans sa tenue.
   Les dessins viennent du moteur ab-design.js, embarqué dans l'app (init).
   La progression est gardée sur l'appareil (appli.stockage).
   ========================================================================== */
AB.blocs.declarer({
  id: 'coach-avatar', nom: 'Coach avatar', version: '1.2.0', categorie: 'Motivation', icone: 'mdi-account-star-outline', panneau: 'design',
  description: 'Ajoute aussi un Studio design dans l’espace de l’app (personnages, skins, compagnons, images IA propres à l’app). Personnage évolutif (5 stades), skins à débloquer, compagnon qui grandit (8 espèces, 4 paliers) et exercices animés dans la tenue du joueur. Style manga, dessins SVG animés.',
  reglages: [
    { cle: 'onglet', label: 'Nom de l’onglet', type: 'texte', defaut: 'Mon perso' },
    { cle: 'titre', label: 'Titre', type: 'texte', defaut: 'Ton personnage' },
    { cle: 'compagnon', label: 'Compagnon de départ', type: 'choix', options: 'dragon\nchien\nchat\nrenard\npanda\ngrenouille\nkoala\nparesseux', defaut: 'dragon' },
    { cle: 'xp_seance', label: 'XP gagnés par séance terminée', type: 'nombre', defaut: 250 },
    { cle: 'exercices', label: 'Exercices montrés (un par ligne)', type: 'liste', defaut: 'squat\nfentes\npompes\ngainage\nburpees\nmarche' },
    { cle: 'bouton', label: 'Texte du bouton de séance', type: 'texte', defaut: 'J’ai terminé ma séance' }
  ],
  init: `// Moteur de dessin (personnages, skins, compagnons, mouvements), partagé avec les écrans
appli.fournir('design', (${typeof moteurDesign === 'function' ? moteurDesign.toString() : 'function () { return null; }'})());`,
  ecrans: [{
    id: 'perso', titre: '{{onglet}}', icone: 'mdi-account-star-outline',
    html: `<h1 class="titre">{{titre}}</h1>
<div class="carte av-scene"><div data-avatar></div><div class="av-niveau" data-niveau></div>
  <div class="av-barre"><span data-barre></span></div><p class="discret" data-xp></p>
  <button class="btn large" data-seance>{{bouton}}</button></div>
<h2 class="sous-titre">Garde-robe</h2><div class="carte"><div class="av-tabs" data-emplacements></div><div class="av-grille" data-skins></div></div>
<h2 class="sous-titre">Compagnon</h2><div class="carte av-compagnon"><div data-compagnon></div><div><b data-comp-nom></b><p class="discret" data-comp-txt></p><select class="champ" data-comp-choix aria-label="Choisir le compagnon"></select></div></div>
<h2 class="sous-titre">Mouvements</h2><div class="av-grille av-mvts" data-mvts></div>`,
    css: `.av-scene { text-align: center; }
.av-scene img { width: 220px; max-width: 100%; height: auto; }
.av-niveau { font-weight: 800; font-size: 18px; letter-spacing: .5px; margin: 4px 0 8px; }
.av-barre { height: 12px; border: 2px solid #131217; border-radius: 999px; overflow: hidden; background: #fff; margin: 0 auto 6px; max-width: 320px; }
.av-barre span { display: block; height: 100%; background: var(--accent); transition: width .5s; }
.av-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 10px; }
.av-tabs button { font: inherit; font-size: 13px; padding: 6px 10px; border-radius: 999px; border: 1px solid var(--bordure); background: var(--carte); cursor: pointer; white-space: nowrap; }
.av-tabs button.actif { background: #131217; color: #fff; border-color: #131217; }
.av-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.av-skin { position: relative; border: 2px solid var(--bordure); border-radius: 8px; background: #EFEDE6; padding: 4px; font: inherit; font-size: 12px; cursor: pointer; text-align: center; }
.av-skin img { width: 100%; height: auto; display: block; }
.av-skin.porte { border-color: var(--accent); box-shadow: 2px 2px 0 #131217; }
.av-skin[disabled] { cursor: default; }
.av-skin[disabled] img { filter: grayscale(1) brightness(.6); opacity: .5; }
.av-skin .av-cadenas { position: absolute; top: 30%; left: 0; right: 0; font-weight: 700; color: #131217; }
.av-compagnon { display: flex; gap: 12px; align-items: center; }
.av-compagnon img { width: 120px; height: auto; flex: none; }
.av-mvts img { width: 100%; height: auto; border: 2px solid #131217; border-radius: 6px; background: #fff; }
.av-mvts { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); margin-bottom: 16px; }`,
    js: `// Progression gardée sur l'appareil ; dessins fournis par le moteur de design
appli.attendre('design').then(D => {
  if (!D) return;
  const RANG = { commun: 1, peu_commun: 5, rare: 10, epique: 15, legendaire: 25 };
  const cle = 'avatar-' + (reglages.titre || 'perso');
  const e = Object.assign({ xp: 0, xpCompagnon: 0, compagnon: reglages.compagnon || 'dragon', tenue: {}, emplacement: 'vetement' }, appli.stockage.get(cle) || {});
  const sauver = () => appli.stockage.set(cle, e);
  const esc = v => String(v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  // Image seule : créée par le DOM (src et alt ne sont jamais interprétés comme du HTML)
  const poser = (el, svg, alt) => { const i = document.createElement('img'); i.src = D.url(svg); i.alt = alt; el.replaceChildren(i); };
  const img = (svg, alt) => '<img alt="' + esc(alt) + '" src="' + esc(D.url(svg)) + '">';
  // Niveau : 1 + racine(XP / 120), plafonné à 30
  const niveau = xp => Math.min(30, Math.floor(1 + Math.sqrt(xp / 120)));
  const seuil = n => 120 * (n - 1) * (n - 1);
  const niveauComp = xp => Math.min(30, 1 + Math.floor(xp / 300));
  // Catalogue : objets fournis + skins créés dans le Studio design de cette app
  const CATALOGUE = D.SKINS_LIVORA.concat(Array.isArray(reglages.__skins) ? reglages.__skins : []);
  const skin = k => CATALOGUE.find(s => s.cle === k);
  const tenue = () => { const t = {}; Object.keys(e.tenue).forEach(x => { const s = skin(e.tenue[x]); if (s) t[x] = s; }); return t; };
  const $ = s => racine.querySelector(s);

  function dessiner() {
    const n = niveau(e.xp), stade = D.STADES[D.stadeDuNiveau(n) - 1];
    poser($('[data-avatar]'), D.avatar({ niveau: n, tenue: tenue() }), 'Ton personnage');
    $('[data-niveau]').textContent = 'Niveau ' + n + ' · ' + stade.nom;
    const bas = seuil(n), haut = seuil(n + 1);
    $('[data-barre]').style.width = (n >= 30 ? 100 : Math.round(100 * (e.xp - bas) / (haut - bas))) + '%';
    const prochain = D.STADES.find(s => s.niveau > n);
    $('[data-xp]').textContent = e.xp + ' XP' + (n < 30 ? ' · encore ' + (haut - e.xp) + ' XP pour le niveau ' + (n + 1) : '') + (prochain ? ' · stade « ' + prochain.nom + ' » au niveau ' + prochain.niveau : '');
    $('[data-emplacements]').innerHTML = Object.keys(D.EMPLACEMENTS).map(x => '<button type="button" data-emp="' + esc(x) + '" class="' + (x === e.emplacement ? 'actif' : '') + '">' + esc(D.EMPLACEMENTS[x]) + '</button>').join('');
    $('[data-skins]').innerHTML = CATALOGUE.filter(s => s.emplacement === e.emplacement).map(s => {
      const libre = n >= RANG[s.rarete];
      return '<button type="button" class="av-skin ' + (e.tenue[s.emplacement] === s.cle ? 'porte' : '') + '" data-skin="' + esc(s.cle) + '"' + (libre ? '' : ' disabled') + '>' + img(D.vignette(s), s.nom) + esc(s.nom) + (libre ? '' : '<span class="av-cadenas">Niveau ' + RANG[s.rarete] + '</span>') + '</button>';
    }).join('');
    const nc = niveauComp(e.xpCompagnon), palier = D.PALIERS.filter(p => nc >= p).pop(), esp = D.ESPECES[e.compagnon];
    poser($('[data-compagnon]'), D.compagnon(e.compagnon, palier), esp.nom);
    $('[data-comp-nom]').textContent = esp.nom + ' · ' + D.NOMS_PALIERS[D.PALIERS.indexOf(palier)] + ' (niveau ' + nc + ')';
    const suivant = D.PALIERS.find(p => p > nc);
    $('[data-comp-txt]').textContent = suivant ? 'Il évolue au niveau ' + suivant + ' : chaque séance le fait grandir.' : 'Évolution maximale atteinte !';
    $('[data-comp-choix]').innerHTML = Object.keys(D.ESPECES).map(k => '<option value="' + esc(k) + '"' + (k === e.compagnon ? ' selected' : '') + '>' + esc(D.ESPECES[k].nom) + '</option>').join('');
    $('[data-mvts]').innerHTML = (Array.isArray(reglages.exercices) ? reglages.exercices : String(reglages.exercices || '').split('\\n')).map(k => k.trim()).filter(k => D.MOUVEMENTS[k]).map(k => img(D.mouvement(k, { niveau: n, tenue: tenue() }), D.MOUVEMENTS[k].nom)).join('');
  }

  racine.addEventListener('click', ev => {
    const emp = ev.target.closest('[data-emp]'), sk = ev.target.closest('[data-skin]');
    if (emp) { e.emplacement = emp.dataset.emp; sauver(); dessiner(); }
    if (sk && !sk.disabled) {
      const s = skin(sk.dataset.skin);
      if (e.tenue[s.emplacement] === s.cle) delete e.tenue[s.emplacement]; else e.tenue[s.emplacement] = s.cle;
      sauver(); dessiner();
    }
  });
  $('[data-comp-choix]').addEventListener('change', ev => { e.compagnon = ev.target.value; sauver(); dessiner(); });
  $('[data-seance]').addEventListener('click', () => {
    const avant = niveau(e.xp), stadeAvant = D.stadeDuNiveau(avant), paliersAvant = D.PALIERS.filter(p => niveauComp(e.xpCompagnon) >= p).length;
    e.xp += Number(reglages.xp_seance) || 250;
    e.xpCompagnon += Math.round((Number(reglages.xp_seance) || 250) / 2);
    sauver(); dessiner();
    const apres = niveau(e.xp);
    if (D.stadeDuNiveau(apres) > stadeAvant) appli.toast('Ton personnage évolue : ' + D.STADES[D.stadeDuNiveau(apres) - 1].nom + ' !');
    else if (apres > avant) appli.toast('Niveau ' + apres + ' atteint !');
    else if (D.PALIERS.filter(p => niveauComp(e.xpCompagnon) >= p).length > paliersAvant) appli.toast('Ton compagnon évolue !');
    else appli.toast('+' + (Number(reglages.xp_seance) || 250) + ' XP, bravo !');
  });
  dessiner();
});`
  }],
  journal: [{ version: '1.2.0', date: '2026-10-21', texte: 'Panneau Studio design dans l’espace de l’app ; skins propres à l’app dans la garde-robe' }, { version: '1.1.0', date: '2026-10-21', texte: 'Graphismes manga : vraie musculature qui se développe à chaque stade, exercices animés avec la silhouette du joueur' }, { version: '1.0.0', date: '2026-10-21', texte: 'Première version : personnage évolutif, skins, compagnons, mouvements animés' }]
});
