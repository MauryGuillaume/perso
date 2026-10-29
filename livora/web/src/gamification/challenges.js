// Défis absurdes/surprises (section 10) — courts, amusants, optionnels. Ne remplacent jamais
// les recommandations principales de l'IA (cf section 10 : "Ils ne doivent jamais remplacer
// les recommandations principales"). La sélection réelle (lequel proposer, quand) est mockée
// dans gameMaster.js — ce fichier n'est que la bibliothèque de contenu.
//
// `steps` détaille concrètement quoi faire (exercices/actions listés) — un défi ne doit jamais
// se contenter d'une description vague type "fais ta routine mobilité" sans dire QUOI faire.
export const CHALLENGE_TEMPLATES = [
  {
    key: 'defi_canard', titre: 'DÉFI DU CANARD', icon: '🦆',
    description: 'Routine mobilité express (5 min).',
    raisonAbsurde: 'Parce que le canard l\'exige.',
    steps: [
      'Rotations des chevilles — 10 tours dans chaque sens, chaque pied',
      'Cercles de bras — 15 en avant, 15 en arrière',
      'Rotations de hanches — 10 tours dans chaque sens',
      'Étirement des ischio-jambiers — 30 sec par jambe, penché en avant',
      'Chat-vache (dos) — 10 répétitions à quatre pattes',
    ],
    rewardXp: 250, rewardChestKey: 'quotidien',
  },
  {
    key: 'mode_tortue', titre: 'MODE TORTUE', icon: '🐢',
    description: '10 minutes de marche tranquille, sans objectif de vitesse.',
    raisonAbsurde: 'La tortue n\'est jamais pressée, et elle finit toujours par arriver.',
    steps: [
      'Marche à allure confortable pendant 10 minutes',
      'Dehors si possible, sinon fais des allers-retours chez toi',
      'Pas de chrono à battre — le but est juste de bouger sans pression',
    ],
    rewardXp: 150, rewardChestKey: 'quotidien',
  },
  {
    key: 'mode_super_heros', titre: 'MODE SUPER-HÉROS', icon: '🦸',
    description: 'Termine la séance de sport prévue aujourd\'hui dans le programme.',
    raisonAbsurde: 'Un pouvoir non utilisé, c\'est du gâchis.',
    steps: [
      'Ouvre l\'onglet Sport pour voir la séance du jour',
      'Fais tous les exercices prévus, dans l\'ordre',
      'Coche chaque exercice au fur et à mesure',
    ],
    rewardXp: 250, rewardChestKey: 'quete',
  },
  {
    key: 'mission_hydratation', titre: 'MISSION HYDRATATION', icon: '🥤',
    description: 'Atteins ton objectif d\'eau du jour avant 20h.',
    raisonAbsurde: 'Les plantes n\'attendent pas, toi non plus.',
    steps: [
      'Va sur l\'onglet Hydratation',
      'Ajoute de l\'eau au fil de la journée (+250 ml / +500 ml / +750 ml)',
      'Vérifie que la jauge est pleine avant 20h',
    ],
    rewardXp: 200, rewardChestKey: 'quotidien',
  },
  {
    key: 'ennemi_canape', titre: 'ENNEMI DU CANAPÉ', icon: '🛋️',
    description: '15 minutes d\'activité physique, peu importe laquelle.',
    raisonAbsurde: 'Le canapé complote depuis trop longtemps.',
    steps: [
      'Choisis une activité : marche, vélo, étirements, jeu actif, ménage énergique…',
      'Fais-la pendant 15 minutes d\'affilée',
      'Pas besoin que ce soit dans le programme — l\'important est de bouger',
    ],
    rewardXp: 200, rewardChestKey: 'quotidien',
  },
  {
    key: 'dragon_a_faim', titre: 'LE DRAGON A FAIM', icon: '🐉',
    description: 'Prépare toi-même le repas prévu au programme, sans commander.',
    raisonAbsurde: 'Un dragon affamé, c\'est jamais une bonne idée.',
    steps: [
      'Va sur l\'onglet Nutrition pour voir le repas prévu',
      'Suis la liste d\'ingrédients et les étapes de préparation',
      'Coche le repas comme fait une fois préparé et mangé',
    ],
    rewardXp: 250, rewardChestKey: 'quete',
  },
]
