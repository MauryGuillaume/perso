// Données mock — remplacent le backend le temps de construire le frontend.
// La forme reflète exactement ce que l'API renverra (cf apps/livora/api/prisma/schema.prisma
// et program-generation.types.ts) pour que brancher le vrai backend plus tard soit un
// remplacement des fonctions de src/services/*, pas une réécriture des vues.
//
// Contenu construit à partir d'un questionnaire réel (export livoratest.json) : Guillaume,
// 30 ans, 186 cm, 105 kg, débutant, objectif perte de poids, maison avec élastiques + tapis,
// 30 min/séance, budget serré, handball club le mercredi et vendredi soir + match le week-end.
// Programme sur 12 semaines (3 mois) : renfo maison lundi/mardi/jeudi (les jours sans handball),
// repos actif le samedi (veille de match), match le dimanche.

export const mockUser = {
  prenom: 'Guillaume',
  objectifPrincipal: 'perdre_poids',
}

export const mockProgramSummary = {
  durationWeeks: 12,
  seancesParSemaine: 3,
  repasParSemaine: 21,
  objectifHydratationL: 2.8,
  objectifSommeilH: 8,
  objectifPasQuotidien: 8000,
}

// Un jour "aujourd'hui" complet, dans l'ordre chronologique — sert de source unique
// au Dashboard (timeline + "maintenant"/"ensuite") et à l'Agenda (vue jour).
// Jour type : mardi, jour de renfo maison (30 min, élastiques + tapis).
export const mockToday = {
  dayIndex: 15,
  dateLabel: "Aujourd'hui",
  items: [
    { id: 'wake', time: '07:00', icon: '🌅', title: 'Réveil', subtitle: '300 ml d\'eau', type: 'habit', status: 'termine' },
    { id: 'breakfast', time: '07:20', icon: '🥣', title: 'Petit-déjeuner', subtitle: 'Œufs, flocons d\'avoine, banane', type: 'meal', refId: 'meal-breakfast', status: 'termine' },
    { id: 'hydration-1', time: '10:00', icon: '💧', title: 'Hydratation', subtitle: '500 ml', type: 'hydration', status: 'termine' },
    { id: 'lunch', time: '12:30', icon: '🥗', title: 'Déjeuner', subtitle: 'Poulet, riz complet, haricots verts', type: 'meal', refId: 'meal-lunch', status: 'a_faire' },
    { id: 'hydration-2', time: '15:30', icon: '💧', title: 'Hydratation', subtitle: '500 ml', type: 'hydration', status: 'a_faire' },
    { id: 'workout', time: '18:30', icon: '🏋️', title: 'Renfo maison', subtitle: 'Full Body élastiques — 30 min', type: 'workout', refId: 'workout-1', status: 'a_faire' },
    { id: 'dinner', time: '20:00', icon: '🍽️', title: 'Dîner', subtitle: 'Œufs, lentilles, légumes rôtis', type: 'meal', refId: 'meal-dinner', status: 'a_faire' },
    { id: 'routine', time: '21:30', icon: '🌙', title: 'Routine sommeil', subtitle: 'Écrans coupés', type: 'habit', status: 'a_faire' },
    { id: 'sleep', time: '23:00', icon: '😴', title: 'Coucher', subtitle: '', type: 'sleep', status: 'a_faire' },
  ],
}

// Semaine type — lundi/mardi/jeudi renfo maison, mercredi/vendredi handball club (pas de
// séance perso ces soirs-là), samedi repos actif, dimanche match.
export const mockWeek = [
  { label: 'Lun', iso: '2026-09-14', workoutCount: 1, mealCount: 3, isToday: false },
  { label: 'Mar', iso: '2026-09-15', workoutCount: 1, mealCount: 3, isToday: true },
  { label: 'Mer', iso: '2026-09-16', workoutCount: 0, mealCount: 3, isToday: false },
  { label: 'Jeu', iso: '2026-09-17', workoutCount: 1, mealCount: 3, isToday: false },
  { label: 'Ven', iso: '2026-09-18', workoutCount: 0, mealCount: 3, isToday: false },
  { label: 'Sam', iso: '2026-09-19', workoutCount: 0, mealCount: 3, isToday: false },
  { label: 'Dim', iso: '2026-09-20', workoutCount: 1, mealCount: 3, isToday: false },
]

export const mockWorkouts = {
  'workout-1': {
    id: 'workout-1',
    nom: 'Full Body élastiques — Semaine 3',
    dureeMin: 30,
    difficulte: 'debutant',
    objectif: 'force',
    status: 'a_faire',
    exercises: [
      {
        id: 'ex-1', ordre: 1, nom: 'Squat au poids du corps', groupeMusculaire: 'Jambes',
        series: 3, repetitions: '12', poidsKg: null, reposSec: 60,
        consignes: 'Débutant : descends jusqu\'où c\'est confortable, dos droit, pousse dans les talons. Pas besoin de matériel.',
        status: 'a_faire',
      },
      {
        id: 'ex-2', ordre: 2, nom: 'Pompes sur genoux', groupeMusculaire: 'Pectoraux',
        series: 3, repetitions: '10', poidsKg: null, reposSec: 60,
        consignes: 'Corps aligné des genoux à la tête. Si trop dur au début, réduis l\'amplitude — la régularité compte plus que la perfection.',
        status: 'a_faire',
      },
      {
        id: 'ex-3', ordre: 3, nom: 'Tirage élastique dos', groupeMusculaire: 'Dos',
        series: 3, repetitions: '12', poidsKg: null, reposSec: 60,
        consignes: 'Fixe l\'élastique à une poignée de porte ou un point stable. Tire les coudes vers l\'arrière, omoplates serrées.',
        status: 'a_faire',
      },
      {
        id: 'ex-4', ordre: 4, nom: 'Fentes alternées', groupeMusculaire: 'Jambes',
        series: 2, repetitions: '10 / jambe', poidsKg: null, reposSec: 60,
        consignes: 'Genou avant aligné avec la cheville. Prends appui sur un mur si l\'équilibre est difficile au début.',
        status: 'a_faire',
      },
      {
        id: 'ex-5', ordre: 5, nom: 'Gainage sur tapis', groupeMusculaire: 'Sangle abdominale',
        series: 3, repetitions: '25 sec', poidsKg: null, reposSec: 45,
        consignes: 'Corps aligné de la tête aux talons. 25 sec suffisent pour débuter, la durée augmentera au fil des semaines.',
        status: 'a_faire',
      },
    ],
  },
  'workout-2': {
    id: 'workout-2',
    nom: 'Cardio léger + mobilité — pré-handball',
    dureeMin: 25,
    difficulte: 'debutant',
    objectif: 'mobilite',
    status: 'a_faire',
    exercises: [
      { id: 'ex-6', ordre: 1, nom: 'Marche rapide / montées de genoux', groupeMusculaire: 'Cardio', series: 1, repetitions: '8 min', poidsKg: null, reposSec: 0, consignes: 'Échauffement progressif, garde une intensité modérée.', status: 'a_faire' },
      { id: 'ex-7', ordre: 2, nom: 'Rotations chevilles & hanches', groupeMusculaire: 'Mobilité', series: 2, repetitions: '10 / côté', poidsKg: null, reposSec: 30, consignes: 'Prépare les articulations sollicitées au handball.', status: 'a_faire' },
      { id: 'ex-8', ordre: 3, nom: 'Étirements dynamiques ischio-jambiers', groupeMusculaire: 'Jambes', series: 2, repetitions: '30 sec / jambe', poidsKg: null, reposSec: 15, consignes: 'Étirement contrôlé, sans à-coups.', status: 'a_faire' },
    ],
  },
}

export const mockAlternativeExercises = {
  'ex-1': [
    { nom: 'Squat sumo', groupeMusculaire: 'Jambes', series: 3, repetitions: '12', reposSec: 60, consignes: 'Pieds plus larges, pointes légèrement écartées — cible aussi l\'intérieur des cuisses.' },
    { nom: 'Chaise contre un mur', groupeMusculaire: 'Jambes', series: 3, repetitions: '30 sec', reposSec: 60, consignes: 'Bon isométrique de secours si les genoux tirent sur le squat.' },
  ],
  'ex-2': [
    { nom: 'Pompes inclinées (mains sur chaise)', groupeMusculaire: 'Pectoraux', series: 3, repetitions: '12', reposSec: 60, consignes: 'Réduit la charge sur les épaules et pectoraux, bon point de départ.' },
  ],
}

export const mockMeals = {
  'meal-breakfast': {
    id: 'meal-breakfast', type: 'petit_dejeuner', nom: 'Œufs, flocons d\'avoine & banane',
    tempsPrepMin: 10, calories: 430, proteinesG: 24, glucidesG: 52, lipidesG: 13,
    status: 'termine',
    ingredients: [
      { nom: 'Œufs', quantite: 2, unite: 'piece', categorie: 'proteines' },
      { nom: 'Flocons d\'avoine', quantite: 50, unite: 'g', categorie: 'feculents' },
      { nom: 'Lait demi-écrémé', quantite: 150, unite: 'ml', categorie: 'produits_laitiers' },
      { nom: 'Banane', quantite: 1, unite: 'piece', categorie: 'fruits_legumes' },
      { nom: 'Cannelle', quantite: 1, unite: 'cac', categorie: 'epicerie' },
    ],
    preparation: [
      'Fais cuire les œufs à la poêle sans matière grasse ajoutée (ou à la coque).',
      'Fais chauffer le lait, ajoute les flocons d\'avoine, laisse cuire 4-5 min.',
      'Ajoute la banane coupée et une pincée de cannelle.',
    ],
  },
  'meal-lunch': {
    id: 'meal-lunch', type: 'dejeuner', nom: 'Poulet, riz complet & haricots verts',
    tempsPrepMin: 25, calories: 560, proteinesG: 45, glucidesG: 55, lipidesG: 14,
    status: 'a_faire',
    ingredients: [
      { nom: 'Blanc de poulet', quantite: 150, unite: 'g', categorie: 'proteines' },
      { nom: 'Riz complet', quantite: 70, unite: 'g', categorie: 'feculents' },
      { nom: 'Haricots verts', quantite: 200, unite: 'g', categorie: 'fruits_legumes' },
      { nom: 'Huile d\'olive', quantite: 1, unite: 'cas', categorie: 'epicerie' },
      { nom: 'Ail', quantite: 1, unite: 'piece', categorie: 'fruits_legumes' },
    ],
    preparation: [
      'Fais cuire le riz complet selon les instructions du paquet.',
      'Assaisonne le poulet (sel, poivre, ail émincé) et cuis-le à la poêle 6-7 min de chaque côté.',
      'Fais cuire les haricots verts à la vapeur 10 min.',
      'Dresse le tout avec un filet d\'huile d\'olive.',
    ],
  },
  'meal-dinner': {
    id: 'meal-dinner', type: 'diner', nom: 'Œufs, lentilles & légumes rôtis',
    tempsPrepMin: 25, calories: 480, proteinesG: 28, glucidesG: 46, lipidesG: 16,
    status: 'a_faire',
    ingredients: [
      { nom: 'Œufs', quantite: 2, unite: 'piece', categorie: 'proteines' },
      { nom: 'Lentilles vertes (cuites)', quantite: 150, unite: 'g', categorie: 'feculents' },
      { nom: 'Courgette', quantite: 150, unite: 'g', categorie: 'fruits_legumes' },
      { nom: 'Carotte', quantite: 100, unite: 'g', categorie: 'fruits_legumes' },
      { nom: 'Huile d\'olive', quantite: 1, unite: 'cas', categorie: 'epicerie' },
    ],
    preparation: [
      'Préchauffe le four à 200°C, coupe courgette et carotte en bâtonnets.',
      'Enfourne les légumes avec un filet d\'huile d\'olive pendant 20 min.',
      'Fais chauffer les lentilles et cuis les œufs au plat ou brouillés.',
      'Dresse le tout ensemble.',
    ],
  },
}

export const mockAlternativeMeals = {
  'meal-lunch': [
    { nom: 'Dinde, quinoa & brocoli', calories: 540, proteinesG: 44, glucidesG: 50, lipidesG: 13 },
    { nom: 'Thon, riz complet & poivrons', calories: 520, proteinesG: 40, glucidesG: 52, lipidesG: 15 },
  ],
  'meal-dinner': [
    { nom: 'Omelette, pois chiches & épinards', calories: 460, proteinesG: 26, glucidesG: 40, lipidesG: 18 },
  ],
}

export const mockShoppingList = {
  weekLabel: 'Semaine du 14 au 20 septembre',
  categories: [
    {
      key: 'fruits_legumes', label: 'Fruits & légumes',
      items: [
        { nom: 'Banane', quantite: '7 pièces', checked: false },
        { nom: 'Haricots verts', quantite: '1,4 kg', checked: false },
        { nom: 'Courgette', quantite: '1 kg', checked: false },
        { nom: 'Carotte', quantite: '700 g', checked: true },
        { nom: 'Ail', quantite: '1 tête', checked: true },
      ],
    },
    {
      key: 'proteines', label: 'Protéines',
      items: [
        { nom: 'Œufs', quantite: '28', checked: false },
        { nom: 'Blanc de poulet', quantite: '1,05 kg', checked: false },
        { nom: 'Lentilles vertes', quantite: '500 g sec', checked: true },
      ],
    },
    {
      key: 'feculents', label: 'Féculents',
      items: [
        { nom: 'Flocons d\'avoine', quantite: '500 g', checked: false },
        { nom: 'Riz complet', quantite: '1 kg', checked: false },
      ],
    },
    {
      key: 'produits_laitiers', label: 'Produits laitiers',
      items: [
        { nom: 'Lait demi-écrémé', quantite: '1 L', checked: false },
      ],
    },
    {
      key: 'epicerie', label: 'Épicerie',
      items: [
        { nom: 'Huile d\'olive', quantite: '1 bouteille', checked: true },
        { nom: 'Cannelle', quantite: '1 pot', checked: true },
      ],
    },
  ],
}

export const mockHydration = { currentMl: 1000, goalMl: 2800 }

export const mockSleep = {
  heureCoucher: '23:00',
  heureReveil: '08:00',
  dureeCibleH: 8,
  dureeReelleH: 7.6,
  tendance7j: [7.2, 7.8, 6.8, 7.5, 8.1, 7.6, 7.6],
}

export const mockHabits = [
  { id: 'h1', icone: '💧', libelle: 'Boire suffisamment', status: 'termine' },
  { id: 'h2', icone: '🏋️', libelle: 'Faire ma séance de renfo', status: 'a_faire' },
  { id: 'h3', icone: '🚶', libelle: 'Marcher 8 000 pas', status: 'a_faire' },
  { id: 'h4', icone: '🥦', libelle: 'Manger mes légumes', status: 'termine' },
  { id: 'h5', icone: '📵', libelle: 'Pas d\'écran avant le coucher', status: 'a_faire' },
]

export const mockProgress = {
  poidsKg: [
    { date: '2026-06-16', value: 105.0 },
    { date: '2026-07-01', value: 103.4 },
    { date: '2026-07-15', value: 101.9 },
    { date: '2026-08-01', value: 100.6 },
    { date: '2026-08-15', value: 99.3 },
    { date: '2026-09-01', value: 98.1 },
    { date: '2026-09-15', value: 97.2 },
  ],
  seancesRealisees: { faites: 22, prevues: 36 },
  habitudesTaux7j: 0.74,
  hydratationMoy7j: 2.4,
  sommeilMoy7j: 7.6,
}
