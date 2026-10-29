/* programme.js — HandFit : planning de la semaine et règles d'adaptation (sur le téléphone, sans IA ni serveur).
   appli.seanceDuJour(date, bilan, profil) → { jour, blocs: [{ cle, titre, items: [{ id, series, cible, note }] }], alertes } */
(function () {
  'use strict';
  const A = window.appli = window.appli || {};

  /* Planning (getDay : 0 = dimanche). Les listes sont rangées par priorité : la version 30 min garde les premiers. */
  A.SEMAINE = {
    1: { titre: 'Pectoraux + triceps', detail: 'Pompes, développé à l’élastique, triceps, pompes explosives',
      echauffement: ['ech-epaules', 'ech-pull-apart', 'ech-rotations'], explosif: ['pompes-explosives'],
      principal: ['pompes', 'presse-poitrine', 'ext-triceps', 'ecarte-elastique', 'dips-chaise', 'kickback'],
      complement: ['gainage', 'dead-bug'], tibias: 'renfo', cardio: true },
    2: { titre: 'Dos + biceps', detail: 'Tirages, rowing, curls et protection de l’épaule de tir',
      echauffement: ['ech-epaules', 'ech-pull-apart', 'ech-chat-vache'], explosif: ['rowing-explosif'],
      principal: ['rowing-elastique', 'tirage-vertical', 'face-pull', 'curl-elastique', 'rotation-externe', 'curl-marteau'],
      complement: ['superman', 'gainage-lateral'], tibias: 'mobilite', cardio: true },
    3: { titre: 'Jambes + fessiers', detail: 'Squats adaptés, pont fessier, ischios, détente selon les tibias',
      echauffement: ['ech-hanches', 'ech-chevilles', 'ech-pont'], explosif: ['squat-saute'],
      principal: ['squat-elastique', 'pont-fessier-elastique', 'fente-arriere', 'leg-curl-glisse', 'souleve-elastique', 'clamshell'],
      complement: ['copenhague', 'dead-bug'], tibias: 'renfo', cardio: false },
    4: { titre: 'Épaules + abdos', detail: 'Développé, élévations, gainage et geste de tir',
      echauffement: ['ech-epaules', 'ech-pull-apart', 'ech-rotations'], explosif: ['lancer-elastique', 'bucheron-elastique'],
      principal: ['dev-epaules', 'elev-laterales', 'rotation-externe', 'pallof', 'ytw-allonge', 'face-pull'],
      complement: ['gainage', 'hollow'], tibias: 'mobilite', cardio: true },
    5: { titre: 'Haut du corps complet', detail: 'Pectoraux, dos, épaules et bras, intensité modérée',
      echauffement: ['ech-epaules', 'ech-pull-apart', 'ech-rotations'], explosif: ['lancer-elastique'],
      principal: ['pompes', 'rowing-elastique', 'dev-epaules', 'tirage-vertical', 'curl-elastique', 'ext-triceps'],
      complement: ['gainage-lateral'], tibias: 'renfo', cardio: true, modere: true },
    6: { titre: 'Bas du corps adapté', detail: 'Fessiers, hanches, appuis latéraux selon la tolérance des tibias',
      echauffement: ['ech-hanches', 'ech-chevilles', 'ech-pont'], explosif: ['bonds-lateraux'],
      principal: ['hip-thrust', 'fente-laterale', 'pont-fessier-unilateral', 'marche-laterale-elastique', 'leg-curl-elastique', 'abduction-allonge'],
      complement: ['copenhague'], tibias: 'mobilite', cardio: false },
    0: { titre: 'Récupération active', detail: 'Mobilité douce, gainage léger, étirements',
      echauffement: ['ech-chat-vache', 'ech-hanches', 'ech-epaules'], explosif: [],
      principal: ['dead-bug', 'gainage-lateral-genoux', 'etirement-hanches', 'etirement-pecs', 'enfant', 'respiration'],
      complement: [], tibias: 'mobilite', cardio: false, recup: true }
  };
  A.NOMS_JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  A.PROFILS = {
    sensible: { nom: 'Sensible', aide: 'Tibias douloureux : mouvements confortables, moins de contraintes, pas de sauts.' },
    renfo: { nom: 'En renforcement', aide: 'Douleur faible et stable : exercices progressifs selon la tolérance, pas de sauts.' },
    reprise: { nom: 'Reprise sportive', aide: 'Après avis d’un professionnel : renforcement debout et petits sauts progressifs.' }
  };

  const TIBIAS = {
    mobilite: ['tib-mobilite', 'tib-pied-court', 'tib-orteils'],
    sensible: ['tib-mobilite', 'tib-dorsi-sans', 'tib-pied-court'],
    renfo: ['tib-ant-elastique', 'tib-talons-assis', 'tib-eversion', 'tib-mobilite', 'tib-inversion'],
    reprise: ['tib-talons-debout', 'tib-ant-elastique', 'tib-eversion', 'tib-mobilite', 'tib-marche-talons', 'tib-equilibre']
  };

  /** Date locale au format AAAA-MM-JJ. */
  A.cleDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  A.versDate = cle => { const [a, m, j] = cle.split('-').map(Number); return new Date(a, m - 1, j); };

  /** Texte de la cible : « 3 × 10–15 » ou « 2 × 40 s ». */
  A.cible = (e, series) => {
    const n = series || e.series;
    const c = e.duree ? `${e.duree} s` : (e.reps[0] === e.reps[1] ? `${e.reps[0]}` : `${e.reps[0]}–${e.reps[1]}`);
    return (n > 1 ? `${n} × ` : '') + c + (e.unilat ? ' par côté' : '') + (e.repos ? ` · repos ${e.repos} s` : '');
  };

  /**
   * Séance du jour selon le planning, la douleur au tibia (0–10), un signe d'alerte, le temps (30 | 45) et le profil.
   * Règles :
   * - signe d'alerte ou douleur ≥ 7 : rien en charge sur les jambes, pas de routine de renforcement, conseil de consulter ;
   * - douleur ≥ 4 : exercices debout en charge remplacés par des versions au sol ; routine tibias « sensible » ;
   * - douleur ≥ 3 : routine tibias au plus « en renforcement » ; douleur ≥ 5 : « sensible » ;
   * - sauts seulement en profil « reprise » avec une douleur ≤ 1, sinon remplacés par de l'explosivité sans impact ;
   * - routine tibias de renforcement un jour sur deux (lundi, mercredi, vendredi), mobilité les autres jours.
   */
  A.seanceDuJour = function (date, bilan, profil) {
    const jour = A.SEMAINE[date.getDay()];
    const douleur = Number(bilan.douleur) || 0, court = Number(bilan.duree) !== 45;
    const alerte = !!bilan.alerte || douleur >= 7;
    const alertes = [];
    const mots = [];

    const choisir = id => {
      let e = A.ex(id), garde = 0;
      while (e && garde++ < 4) {
        if (e.tibia === 2 && !(profil === 'reprise' && douleur <= 1 && !alerte)) { mots.push(`${e.nom} → ${A.ex(e.sansTibia).nom}`); e = A.ex(e.sansTibia); continue; }
        if (e.tibia === 1 && (douleur >= 4 || alerte) && e.sansTibia) { mots.push(`${e.nom} → ${A.ex(e.sansTibia).nom}`); e = A.ex(e.sansTibia); continue; }
        break;
      }
      return e;
    };
    const item = (e, series) => ({ id: e.id, series: series || e.series, cible: A.cible(e, series) });
    const vus = new Set();
    const liste = (ids, n, modere) => {
      const sortie = [];
      for (const id of ids) {
        const e = choisir(id);
        if (!e || vus.has(e.id) || (alerte && e.tibia > 0)) continue;
        vus.add(e.id);
        sortie.push(item(e, modere ? Math.min(e.series, court ? 2 : 3) : (court ? Math.min(e.series, 3) : e.series)));
        if (sortie.length >= n) break;
      }
      return sortie;
    };

    const blocs = [];
    blocs.push({ cle: 'echauffement', titre: 'Échauffement · 5 min', items: liste(jour.echauffement, 3) });
    if (jour.explosif.length) {
      const ex = liste(jour.explosif, court ? 1 : 2).map(i => court ? { ...i, series: 2, cible: A.cible(A.ex(i.id), 2) } : i);
      if (ex.length) blocs.push({ cle: 'explosif', titre: 'Explosivité · 5 min', aide: 'Juste après l’échauffement, frais. Vitesse maximale, arrêter la série dès que ça ralentit.', items: ex });
    }
    blocs.push({ cle: 'principal', titre: jour.recup ? 'Séance douce · 15 min' : 'Musculation · 20–25 min', items: liste(jour.principal, court ? 4 : 5, jour.modere) });
    if (jour.complement.length) blocs.push({ cle: 'complement', titre: 'Abdos / gainage · 3–5 min', items: liste(jour.complement, court ? 1 : 2) });
    if (jour.cardio && !court && douleur < 4 && !alerte) {
      blocs.push({ cle: 'cardio', titre: 'Finisher perte de poids · 5 min', aide: '30 s d’effort, 15 s de pause, en enchaînant les deux exercices. Aucun saut.',
        items: liste(['burpee-sans-saut', 'boxe-elastique'], 2) });
    }

    // Routine tibias
    let routine;
    if (alerte) routine = null;
    else if (douleur >= 4) routine = 'sensible';
    else {
      let p = profil;
      if (douleur >= 3 && p === 'reprise') p = 'renfo';
      routine = jour.tibias === 'renfo' ? p : (p === 'sensible' ? 'sensible' : 'mobilite');
    }
    if (routine) {
      const ids = TIBIAS[routine].slice(0, court ? 3 : 5);
      blocs.push({ cle: 'tibias', titre: 'Routine tibias · 5–10 min',
        aide: routine === 'mobilite' ? 'Jour de récupération pour les tibias : mobilité et contrôle seulement.'
          : 'Arrêter l’exercice si la douleur augmente pendant ou après.',
        items: liste(ids, 6) });
    }

    if (alerte) alertes.push({ niveau: 'danger', texte: 'Pas de travail des jambes ni de renforcement des tibias aujourd’hui. Une douleur au repos, la nuit, très localisée sur l’os ou qui s’aggrave n’est pas toujours une périostite (une fracture de fatigue peut y ressembler) : consulte un médecin ou un kiné avant de reprendre.' });
    else if (douleur >= 4) alertes.push({ niveau: 'attention', texte: `Douleur à ${douleur}/10 : exercices debout remplacés par des versions au sol, routine tibias douce, pas de sauts. Si la douleur dure plus de quelques jours, fais-la évaluer.` });
    if (!alerte && mots.length) alertes.push({ niveau: 'info', texte: 'Adapté pour tes tibias : ' + [...new Set(mots)].join(' ; ') + '.' });
    return { jour, blocs, alertes };
  };
})();
