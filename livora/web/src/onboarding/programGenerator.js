// Génère un programme complet à partir des réponses au questionnaire.
// Appelle réellement Claude si VITE_ANTHROPIC_API_KEY est définie (apps/livora/web/.env) ;
// sinon retombe sur un générateur par règles simples pour rester utilisable sans clé.
//
// La forme JSON produite correspond exactement à GeneratedProgramJson
// (apps/livora/api/src/program/program-generation.types.ts) pour que brancher le vrai backend
// plus tard n'implique aucun changement de forme de données.
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-5'

const JSON_SHAPE_INSTRUCTIONS = `Tu es un coach expert en sport et nutrition. Génère un programme personnalisé
au format JSON STRICT suivant (aucun texte hors JSON, pas de markdown, pas de \`\`\`) :

{
  "durationWeeks": number,
  "summary": {
    "seancesParSemaine": number,
    "repasParSemaine": number,
    "objectifHydratationL": number,
    "objectifSommeilH": number,
    "objectifPasQuotidien": number
  },
  "days": [
    {
      "dayIndex": number (0-6, 0 = lundi, 1 = mardi, … 6 = dimanche),
      "workouts": [
        {
          "nom": string,
          "dureeMin": number,
          "difficulte": "debutant" | "intermediaire" | "avance",
          "objectif": "force" | "hypertrophie" | "cardio" | "mobilite",
          "exercises": [
            { "nom": string, "groupeMusculaire": string, "series": number, "repetitions": string, "poidsKg": number|null, "reposSec": number, "consignes": string }
          ]
        }
      ],
      "meals": [
        {
          "type": "petit_dejeuner" | "dejeuner" | "collation" | "diner",
          "nom": string,
          "tempsPrepMin": number,
          "calories": number,
          "proteinesG": number,
          "glucidesG": number,
          "lipidesG": number,
          "ingredients": [ { "nom": string, "quantite": number, "unite": "g"|"kg"|"ml"|"L"|"piece"|"cas"|"cac", "categorie": "fruits_legumes"|"proteines"|"feculents"|"produits_laitiers"|"epicerie"|"autre" } ],
          "preparation": [string]
        }
      ],
      "habits": [string]
    }
  ]
}

Règles impératives :
- Ne mets des "workouts" que les jours effectivement disponibles indiqués par l'utilisateur (joursDisponibles : 1 = lundi … 7 = dimanche, donc dayIndex = jour - 1).
- Adapte le volume au niveau déclaré et à la durée de séance (dureeSeance) ; un débutant commence doucement.
- "durationWeeks" vaut 12 sauf raison particulière.
- Respecte STRICTEMENT les allergies et aliments détestés — ne les inclus jamais.
- Privilégie les aliments aimés quand c'est pertinent.
- Adapte les exercices au lieu et au matériel disponible.
- Génère exactement 7 jours (dayIndex 0 à 6), même les jours sans séance (repas + habitudes quand même).
- "days[].meals" doit contenir "nombreRepasSouhaite" repas par jour.
- Réponds uniquement avec le JSON, rien d'autre.`

function buildUserPrompt(answers) {
  return `Voici le profil de l'utilisateur, réponds uniquement avec le JSON demandé :\n${JSON.stringify(answers, null, 2)}`
}

function assertValidProgramJson(json) {
  if (!json || typeof json !== 'object') throw new Error('Réponse IA invalide : pas un objet')
  if (!Array.isArray(json.days) || json.days.length === 0) throw new Error('Réponse IA invalide : days manquant')
  if (!json.summary) throw new Error('Réponse IA invalide : summary manquant')
  return json
}

function extractJson(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : trimmed
  return JSON.parse(raw)
}

export function hasApiKey() {
  return Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY)
}

async function generateWithClaude(answers) {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: JSON_SHAPE_INSTRUCTIONS,
    messages: [{ role: 'user', content: buildUserPrompt(answers) }],
  })

  const text = message.content.find((b) => b.type === 'text')?.text ?? ''
  return assertValidProgramJson(extractJson(text))
}

// Repli sans IA : construit un programme simple mais cohérent à partir des réponses (jours,
// niveau, durée, lieu, régime, aliments détestés et allergies), pour que le flow reste
// utilisable sans clé API.
const MOCK_WORKOUTS = [
  { nom: 'Full body', objectif: 'force', exercises: [
    { nom: 'Squat', groupeMusculaire: 'Jambes', consignes: 'Dos droit, pousse dans les talons.' },
    { nom: 'Pompes', groupeMusculaire: 'Pectoraux', consignes: 'Corps aligné ; sur les genoux pour commencer.' },
    { nom: 'Rowing (élastique ou haltère)', groupeMusculaire: 'Dos', consignes: 'Tire les coudes vers l\'arrière, omoplates serrées.' },
    { nom: 'Fentes alternées', groupeMusculaire: 'Jambes', consignes: 'Genou avant aligné avec la cheville.' },
    { nom: 'Gainage', groupeMusculaire: 'Sangle abdominale', consignes: 'Ne laisse pas le bassin tomber.' },
  ] },
  { nom: 'Haut du corps', objectif: 'force', exercises: [
    { nom: 'Pompes', groupeMusculaire: 'Pectoraux', consignes: 'Contrôle la descente.' },
    { nom: 'Rowing (élastique ou haltère)', groupeMusculaire: 'Dos', consignes: 'Dos plat, mouvement lent.' },
    { nom: 'Élévations latérales', groupeMusculaire: 'Épaules', consignes: 'Coudes légèrement fléchis, jusqu\'à l\'horizontale.' },
    { nom: 'Dips sur chaise', groupeMusculaire: 'Triceps', consignes: 'Épaules basses, descends à 90°.' },
    { nom: 'Gainage latéral', groupeMusculaire: 'Sangle abdominale', consignes: 'Hanches hautes, corps aligné.' },
  ] },
  { nom: 'Bas du corps & mobilité', objectif: 'mobilite', exercises: [
    { nom: 'Squat', groupeMusculaire: 'Jambes', consignes: 'Rythme modéré, contrôle la remontée.' },
    { nom: 'Pont fessier', groupeMusculaire: 'Fessiers', consignes: 'Serre les fessiers en haut.' },
    { nom: 'Fentes arrière', groupeMusculaire: 'Jambes', consignes: 'Grand pas en arrière, buste droit.' },
    { nom: 'Mollets debout', groupeMusculaire: 'Mollets', consignes: 'Monte sur la pointe des pieds, descends lentement.' },
    { nom: 'Étirements dynamiques', groupeMusculaire: 'Mobilité', consignes: 'Mouvements amples et contrôlés.' },
  ] },
]
const VOLUME = {
  debutant: { series: 2, repetitions: '10', reposSec: 75 },
  intermediaire: { series: 3, repetitions: '12', reposSec: 60 },
  avance: { series: 4, repetitions: '12', reposSec: 45 },
}

const MOCK_MEALS = {
  petit_dejeuner: [
    { nom: 'Flocons d\'avoine, banane & yaourt', temps: 5, prep: ['Verse les flocons dans un bol avec le yaourt.', 'Ajoute la banane coupée en rondelles.', 'Laisse reposer 2 min, c\'est prêt.'], ingredients: [['Flocons d\'avoine', 50, 'g', 'feculents'], ['Banane', 1, 'piece', 'fruits_legumes'], ['Yaourt nature', 125, 'g', 'produits_laitiers']] },
    { nom: 'Tartines complètes & œufs', temps: 10, prep: ['Fais griller le pain.', 'Cuis les œufs au plat ou brouillés (5 min).', 'Ajoute la tomate en tranches.'], ingredients: [['Pain complet', 2, 'piece', 'feculents'], ['Œufs', 2, 'piece', 'proteines'], ['Tomate', 1, 'piece', 'fruits_legumes']] },
    { nom: 'Fromage blanc, fruits rouges & muesli', temps: 3, prep: ['Mets le fromage blanc dans un bol.', 'Ajoute les fruits rouges et le muesli.'], ingredients: [['Fromage blanc', 150, 'g', 'produits_laitiers'], ['Fruits rouges', 80, 'g', 'fruits_legumes'], ['Muesli', 40, 'g', 'feculents']] },
  ],
  dejeuner: [
    { nom: 'Poulet, riz & brocoli', temps: 25, prep: ['Lance la cuisson du riz (10-12 min).', 'Fais cuire le brocoli à la vapeur 8 min.', 'Saisis le poulet en dés à la poêle 6-7 min.'], ingredients: [['Blanc de poulet', 150, 'g', 'proteines'], ['Riz basmati', 80, 'g', 'feculents'], ['Brocoli', 150, 'g', 'fruits_legumes']] },
    { nom: 'Saumon, quinoa & haricots verts', temps: 20, prep: ['Rince le quinoa et cuis-le 12 min.', 'Cuis les haricots verts à la vapeur 10 min.', 'Poêle le saumon 4 min de chaque côté.'], ingredients: [['Pavé de saumon', 130, 'g', 'proteines'], ['Quinoa', 70, 'g', 'feculents'], ['Haricots verts', 150, 'g', 'fruits_legumes']] },
    { nom: 'Bowl lentilles, légumes rôtis & feta', temps: 30, prep: ['Rôtis la courgette en dés 20 min à 200 °C.', 'Cuis les lentilles 20 min dans l\'eau.', 'Assemble le bol et émiette la feta.'], ingredients: [['Lentilles vertes', 80, 'g', 'feculents'], ['Courgette', 150, 'g', 'fruits_legumes'], ['Feta', 40, 'g', 'produits_laitiers']] },
  ],
  collation: [
    { nom: 'Pomme & amandes', temps: 1, prep: ['Lave la pomme, prends une petite poignée d\'amandes.'], ingredients: [['Pomme', 1, 'piece', 'fruits_legumes'], ['Amandes', 20, 'g', 'epicerie']] },
    { nom: 'Yaourt grec & miel', temps: 1, prep: ['Verse le miel sur le yaourt.'], ingredients: [['Yaourt grec', 150, 'g', 'produits_laitiers'], ['Miel', 1, 'cac', 'epicerie']] },
  ],
  diner: [
    { nom: 'Omelette aux légumes & pain complet', temps: 15, prep: ['Fais revenir le poivron émincé 5 min.', 'Ajoute les œufs battus, cuis 3-4 min.', 'Sers avec le pain.'], ingredients: [['Œufs', 3, 'piece', 'proteines'], ['Poivron', 100, 'g', 'fruits_legumes'], ['Pain complet', 1, 'piece', 'feculents']] },
    { nom: 'Pâtes complètes, thon & tomate', temps: 15, prep: ['Cuis les pâtes (10 min).', 'Chauffe la sauce tomate avec le thon émietté.', 'Mélange et sers.'], ingredients: [['Pâtes complètes', 80, 'g', 'feculents'], ['Thon au naturel', 100, 'g', 'proteines'], ['Sauce tomate', 100, 'g', 'epicerie']] },
    { nom: 'Curry de pois chiches & riz', temps: 25, prep: ['Lance le riz.', 'Fais mijoter pois chiches, épinards et curry 10 min.', 'Sers sur le riz.'], ingredients: [['Pois chiches cuits', 150, 'g', 'proteines'], ['Riz basmati', 70, 'g', 'feculents'], ['Épinards', 100, 'g', 'fruits_legumes']] },
  ],
}
const CALORIES = { petit_dejeuner: 420, dejeuner: 600, collation: 200, diner: 520 }
const VEGE_SWAP = { 'Blanc de poulet': 'Tofu ferme', 'Pavé de saumon': 'Tempeh', 'Thon au naturel': 'Haricots rouges' }
const VEGAN_SWAP = { ...VEGE_SWAP, 'Œufs': 'Tofu soyeux', 'Yaourt nature': 'Yaourt de soja', 'Yaourt grec': 'Yaourt de soja', 'Fromage blanc': 'Skyr végétal', 'Feta': 'Avocat', 'Miel': 'Sirop d\'érable' }

// Mêmes remplacements, appliqués au nom du plat.
const NOM_VEGE = { Poulet: 'Tofu', Saumon: 'Tempeh', thon: 'haricots rouges' }
const NOM_VEGAN = { ...NOM_VEGE, 'œufs': 'tofu', Omelette: 'Brouillade de tofu', yaourt: 'yaourt de soja', 'Yaourt grec': 'Yaourt de soja', 'Fromage blanc': 'Skyr végétal', feta: 'avocat', miel: 'sirop d\'érable' }

function mealTypesFor(n) {
  if (n <= 2) return ['dejeuner', 'diner']
  if (n === 3) return ['petit_dejeuner', 'dejeuner', 'diner']
  return ['petit_dejeuner', 'dejeuner', 'diner', ...Array(n - 3).fill('collation')]
}

function buildMockMeal(type, variant, answers) {
  const exclus = [...(answers.alimentsDetestes || []), ...(answers.allergies || [])].map((a) => a.toLowerCase())
  const swap = answers.regimeAlimentaire === 'vegan' ? VEGAN_SWAP : answers.regimeAlimentaire === 'vegetarien' ? VEGE_SWAP : {}
  const options = MOCK_MEALS[type]
  // Premier repas de la rotation qui ne contient aucun aliment exclu (repli : le prévu).
  const ok = (m) => !m.ingredients.some(([nom]) => exclus.some((x) => (swap[nom] ?? nom).toLowerCase().includes(x)))
  const rapide = (m) => !answers.tempsCuisine || m.temps <= answers.tempsCuisine
  const rotation = [...options.slice(variant % options.length), ...options]
  const meal = rotation.find((m) => ok(m) && rapide(m)) ?? rotation.find(ok) ?? options[variant % options.length]
  const ingredients = meal.ingredients.map(([nom, quantite, unite, categorie]) => ({ nom: swap[nom] ?? nom, quantite, unite, categorie }))
  const motsRemplaces = answers.regimeAlimentaire === 'vegan' ? NOM_VEGAN : answers.regimeAlimentaire === 'vegetarien' ? NOM_VEGE : {}
  let nom = meal.nom
  for (const [from, to] of Object.entries(motsRemplaces)) nom = nom.replace(from, to)
  return {
    type, nom,
    tempsPrepMin: meal.temps,
    calories: CALORIES[type], proteinesG: type === 'collation' ? 8 : 28, glucidesG: type === 'collation' ? 20 : 55, lipidesG: type === 'collation' ? 9 : 15,
    ingredients,
    preparation: meal.prep,
  }
}

function generateMock(answers) {
  const jours = answers.joursDisponibles?.length ? answers.joursDisponibles : [1, 3, 5]
  const types = mealTypesFor(answers.nombreRepasSouhaite || 3)
  const volume = VOLUME[answers.niveauSport] ?? VOLUME.intermediaire
  const duree = answers.dureeSeance || 30
  // Une séance courte garde moins d'exercices (≈ 6 min par exercice).
  const nbExercices = Math.max(3, Math.min(5, Math.round(duree / 6)))
  let seance = 0

  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const aSeance = jours.includes(dayIndex + 1) // dayIndex 0 = lundi, joursDisponibles 1 = lundi
    const template = MOCK_WORKOUTS[seance % MOCK_WORKOUTS.length]
    if (aSeance) seance += 1
    return {
      dayIndex,
      workouts: aSeance ? [{
        nom: `${template.nom}${answers.lieu === 'salle' ? ' (salle)' : ''}`,
        dureeMin: duree,
        difficulte: answers.niveauSport || 'intermediaire',
        objectif: answers.objectifPrincipal === 'prendre_muscle' ? 'hypertrophie' : template.objectif,
        exercises: template.exercises.slice(0, nbExercices).map((ex) => ({
          ...ex, ...volume, poidsKg: null,
          repetitions: ex.groupeMusculaire === 'Sangle abdominale' ? `${volume.series * 10} sec` : volume.repetitions,
        })),
      }] : [],
      meals: types.map((type, i) => buildMockMeal(type, dayIndex + i, answers)),
      habits: ['Boire suffisamment', 'Routine du soir'],
    }
  })

  return {
    durationWeeks: 12,
    summary: {
      seancesParSemaine: jours.length,
      repasParSemaine: types.length * 7,
      objectifHydratationL: answers.poidsKg ? Math.round(Math.min(3.5, Math.max(1.8, answers.poidsKg * 0.033)) * 10) / 10 : 2.2,
      objectifSommeilH: 8,
      objectifPasQuotidien: 7000,
    },
    days,
  }
}

export async function generateProgram(answers) {
  if (hasApiKey()) {
    try {
      return { source: 'claude', program: await generateWithClaude(answers) }
    } catch (err) {
      console.error('Génération Claude échouée, repli sur le générateur mock :', err)
      return { source: 'mock', program: generateMock(answers), error: String(err?.message || err) }
    }
  }
  return { source: 'mock', program: generateMock(answers) }
}

// Génère 2-3 variantes de recette pour un repas donné, pour permettre à l'utilisateur de choisir.
async function suggestMealsWithClaude(meal, answers) {
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const system = `Tu proposes des variantes de recette. Réponds UNIQUEMENT avec un tableau JSON strict
(pas de markdown, pas de texte hors JSON) de 3 objets au format :
[{ "nom": string, "tempsPrepMin": number, "calories": number, "proteinesG": number, "glucidesG": number, "lipidesG": number,
   "ingredients": [{ "nom": string, "quantite": number, "unite": "g"|"kg"|"ml"|"L"|"piece"|"cas"|"cac", "categorie": "fruits_legumes"|"proteines"|"feculents"|"produits_laitiers"|"epicerie"|"autre" }],
   "preparation": [string] }]
Les 3 variantes doivent être différentes du repas actuel ("${meal.nom}") mais rester du même type de repas ("${meal.type}"),
respecter allergies/aliments détestés, et coller aux goûts de l'utilisateur.`

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: `Repas actuel : ${JSON.stringify(meal)}\nProfil utilisateur : ${JSON.stringify(answers)}` }],
  })
  const text = message.content.find((b) => b.type === 'text')?.text ?? ''
  return extractJson(text)
}

function suggestMealsMock(meal) {
  return [
    { nom: `${meal.nom} (variante légère)`, tempsPrepMin: meal.tempsPrepMin, calories: Math.round(meal.calories * 0.85), proteinesG: meal.proteinesG, glucidesG: Math.round(meal.glucidesG * 0.8), lipidesG: Math.round(meal.lipidesG * 0.8), ingredients: meal.ingredients, preparation: meal.preparation },
    { nom: `${meal.nom} (variante protéinée)`, tempsPrepMin: meal.tempsPrepMin + 5, calories: meal.calories + 60, proteinesG: meal.proteinesG + 15, glucidesG: meal.glucidesG, lipidesG: meal.lipidesG, ingredients: meal.ingredients, preparation: meal.preparation },
  ]
}

export async function suggestMealAlternatives(meal, answers) {
  if (hasApiKey()) {
    try {
      return { source: 'claude', options: await suggestMealsWithClaude(meal, answers) }
    } catch (err) {
      console.error('Suggestions Claude échouées, repli sur le générateur mock :', err)
      return { source: 'mock', options: suggestMealsMock(meal), error: String(err?.message || err) }
    }
  }
  return { source: 'mock', options: suggestMealsMock(meal) }
}
