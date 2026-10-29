import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitOnboardingDto {
  // Étape 1 — Profil
  @IsString()
  prenom!: string;

  @IsOptional() @IsInt() @Min(10) @Max(120) age?: number;
  @IsOptional() @IsIn(['homme', 'femme', 'autre']) sexe?: string;
  @IsOptional() @IsInt() @Min(50) @Max(250) tailleCm?: number;
  @IsOptional() @IsInt() @Min(20) @Max(300) poidsKg?: number;

  // Étape 2 — Objectif
  @IsIn(['perdre_poids', 'prendre_muscle', 'condition_physique', 'energie', 'sommeil', 'alimentation', 'autre'])
  objectifPrincipal!: string;

  @IsOptional() @IsArray() objectifsSecondaires?: string[];

  // Étape 3 — Sport
  @IsIn(['debutant', 'intermediaire', 'avance'])
  niveauSport!: string;

  @IsArray()
  joursDisponibles!: number[];

  @IsInt() @Min(10) @Max(180)
  dureeSeance!: number;

  @IsString()
  heureEntrainement!: string; // "HH:MM"

  @IsIn(['maison', 'salle', 'exterieur', 'mixte'])
  lieu!: string;

  @IsOptional() @IsArray() materiel?: string[];
  @IsOptional() @IsArray() sportsPreferres?: string[];

  // Étape 4 — Nutrition
  @IsOptional() @IsString() habitudesAlimentaires?: string;
  @IsOptional() @IsArray() alimentsAimes?: string[];
  @IsOptional() @IsArray() alimentsDetestes?: string[];
  @IsOptional() @IsString() regimeAlimentaire?: string;
  @IsOptional() @IsArray() allergies?: string[];
  @IsInt() @Min(2) @Max(6) nombreRepasSouhaite!: number;
  @IsOptional() @IsInt() @Min(5) @Max(180) tempsCuisine?: number;
  @IsOptional() @IsIn(['serre', 'moyen', 'confortable']) budget?: string;

  // Étape 5 — Sommeil
  @IsString() heureCoucher!: string;
  @IsString() heureReveil!: string;
  @IsOptional() @IsIn(['mauvaise', 'moyenne', 'bonne']) qualitePercue?: string;
  @IsOptional() @IsString() contraintesHoraires?: string;

  // Étape 6 — Organisation
  @IsOptional() @IsString() horairesTravail?: string;
  @IsOptional() @IsString() contraintes?: string;
  @IsOptional() @IsInt() @Min(5) @Max(600) tempsQuotidien?: number;
}
