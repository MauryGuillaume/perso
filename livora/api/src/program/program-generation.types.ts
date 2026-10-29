// Forme JSON stricte demandée à Claude pour générer un programme complet (une semaine type,
// dayIndex 0 = lundi … 6 = dimanche). Tout changement ici doit être répercuté dans le prompt et
// dans la validation (aujourd'hui côté front : web/src/onboarding/programGenerator.js, à
// déplacer dans l'API) — les trois doivent rester synchronisés.

export interface GeneratedProgramJson {
  durationWeeks: number;
  summary: {
    seancesParSemaine: number;
    repasParSemaine: number;
    objectifHydratationL: number;
    objectifSommeilH: number;
    objectifPasQuotidien: number;
  };
  days: GeneratedDayJson[];
}

export interface GeneratedDayJson {
  dayIndex: number;
  workouts: GeneratedWorkoutJson[];
  meals: GeneratedMealJson[];
  habits: string[]; // libellés d'habitudes actives ce jour-là
}

export interface GeneratedWorkoutJson {
  nom: string;
  dureeMin: number;
  difficulte: 'debutant' | 'intermediaire' | 'avance';
  objectif: 'force' | 'hypertrophie' | 'cardio' | 'mobilite';
  exercises: GeneratedExerciseJson[];
}

export interface GeneratedExerciseJson {
  nom: string;
  groupeMusculaire?: string;
  series: number;
  repetitions: string;
  poidsKg?: number;
  reposSec: number;
  consignes?: string;
}

export interface GeneratedMealJson {
  type: 'petit_dejeuner' | 'dejeuner' | 'collation' | 'diner';
  nom: string;
  tempsPrepMin?: number;
  calories?: number;
  proteinesG?: number;
  glucidesG?: number;
  lipidesG?: number;
  ingredients: GeneratedIngredientJson[];
  preparation: string[];
}

export interface GeneratedIngredientJson {
  nom: string;
  quantite: number;
  unite: 'g' | 'kg' | 'ml' | 'L' | 'piece' | 'cas' | 'cac';
  categorie: 'fruits_legumes' | 'proteines' | 'feculents' | 'produits_laitiers' | 'epicerie' | 'autre';
}
