// Définition déclarative des étapes du questionnaire — une seule source pour le
// composant OnboardingView et pour la validation. Les clés des réponses correspondent
// exactement aux champs de SubmitOnboardingDto côté backend (apps/livora/api/src/onboarding/onboarding.dto.ts).

export const ONBOARDING_STEPS = [
  {
    key: 'profil',
    title: 'Faisons connaissance',
    subtitle: 'Quelques infos de base pour personnaliser ton programme.',
    fields: [
      { key: 'prenom', label: 'Prénom', type: 'text', required: true, placeholder: 'Camille' },
      { key: 'age', label: 'Âge', type: 'number', min: 10, max: 120, placeholder: '32' },
      { key: 'sexe', label: 'Sexe', type: 'choice', options: [
        { value: 'femme', label: 'Femme' }, { value: 'homme', label: 'Homme' }, { value: 'autre', label: 'Autre' },
      ] },
      { key: 'tailleCm', label: 'Taille (cm)', type: 'number', min: 50, max: 250, placeholder: '170' },
      { key: 'poidsKg', label: 'Poids (kg)', type: 'number', min: 20, max: 300, placeholder: '68' },
    ],
  },
  {
    key: 'objectif',
    title: "Ton objectif principal",
    subtitle: 'Ce qui compte le plus pour toi en ce moment.',
    fields: [
      { key: 'objectifPrincipal', label: 'Objectif principal', type: 'choice', required: true, options: [
        { value: 'perdre_poids', label: 'Perdre du poids' },
        { value: 'prendre_muscle', label: 'Prendre du muscle' },
        { value: 'condition_physique', label: 'Améliorer ma condition physique' },
        { value: 'energie', label: "Avoir plus d'énergie" },
        { value: 'sommeil', label: 'Mieux dormir' },
        { value: 'alimentation', label: 'Mieux manger' },
        { value: 'autre', label: 'Autre' },
      ] },
      { key: 'objectifsSecondaires', label: 'Objectifs secondaires (optionnel)', type: 'multi', options: [
        { value: 'perdre_poids', label: 'Perdre du poids' },
        { value: 'prendre_muscle', label: 'Prendre du muscle' },
        { value: 'condition_physique', label: 'Condition physique' },
        { value: 'energie', label: 'Énergie' },
        { value: 'sommeil', label: 'Sommeil' },
        { value: 'alimentation', label: 'Alimentation' },
      ] },
    ],
  },
  {
    key: 'sport',
    title: 'Le sport',
    subtitle: 'Pour construire des séances réellement adaptées à ton niveau.',
    fields: [
      { key: 'niveauSport', label: 'Niveau actuel', type: 'choice', required: true, options: [
        { value: 'debutant', label: 'Débutant' }, { value: 'intermediaire', label: 'Intermédiaire' }, { value: 'avance', label: 'Avancé' },
      ] },
      { key: 'joursDisponibles', label: 'Jours disponibles', type: 'multi', required: true, options: [
        { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mer' }, { value: 4, label: 'Jeu' },
        { value: 5, label: 'Ven' }, { value: 6, label: 'Sam' }, { value: 7, label: 'Dim' },
      ] },
      { key: 'dureeSeance', label: 'Durée de séance souhaitée (min)', type: 'number', required: true, min: 10, max: 180, placeholder: '45' },
      { key: 'heureEntrainement', label: 'Heure habituelle d\'entraînement', type: 'time', required: true, placeholder: '18:30' },
      { key: 'lieu', label: 'Lieu de pratique', type: 'choice', required: true, options: [
        { value: 'maison', label: 'Maison' }, { value: 'salle', label: 'Salle' }, { value: 'exterieur', label: 'Extérieur' }, { value: 'mixte', label: 'Mixte' },
      ] },
      { key: 'materiel', label: 'Matériel disponible (optionnel)', type: 'multi', options: [
        { value: 'halteres', label: 'Haltères' }, { value: 'elastiques', label: 'Élastiques' }, { value: 'barre', label: 'Barre de traction' },
        { value: 'banc', label: 'Banc' }, { value: 'tapis', label: 'Tapis' }, { value: 'kettlebell', label: 'Kettlebell' },
      ] },
      { key: 'sportsPreferres', label: 'Sports que tu aimes (optionnel)', type: 'tags', placeholder: 'course à pied, natation…' },
    ],
  },
  {
    key: 'nutrition',
    title: 'La nutrition',
    subtitle: 'Pour proposer des repas que tu vas vraiment avoir envie de manger.',
    fields: [
      { key: 'nombreRepasSouhaite', label: 'Nombre de repas par jour', type: 'number', required: true, min: 2, max: 6, placeholder: '3' },
      { key: 'regimeAlimentaire', label: 'Régime alimentaire (optionnel)', type: 'choice', options: [
        { value: '', label: 'Aucun' }, { value: 'vegetarien', label: 'Végétarien' }, { value: 'vegan', label: 'Vegan' },
        { value: 'sans_gluten', label: 'Sans gluten' }, { value: 'sans_lactose', label: 'Sans lactose' },
      ] },
      { key: 'alimentsAimes', label: 'Aliments que tu aimes (optionnel)', type: 'tags', placeholder: 'poulet, riz, brocoli…' },
      { key: 'alimentsDetestes', label: "Aliments que tu détestes (optionnel)", type: 'tags', placeholder: 'champignons, coriandre…' },
      { key: 'allergies', label: 'Allergies (optionnel)', type: 'tags', placeholder: 'arachides, fruits de mer…' },
      { key: 'tempsCuisine', label: 'Temps de cuisine dispo par repas (min, optionnel)', type: 'number', min: 5, max: 180, placeholder: '30' },
      { key: 'budget', label: 'Budget courses (optionnel)', type: 'choice', options: [
        { value: 'serre', label: 'Serré' }, { value: 'moyen', label: 'Moyen' }, { value: 'confortable', label: 'Confortable' },
      ] },
    ],
  },
  {
    key: 'sommeil',
    title: 'Le sommeil',
    subtitle: 'Tes horaires actuels pour ajuster les objectifs de repos.',
    fields: [
      { key: 'heureCoucher', label: 'Heure de coucher habituelle', type: 'time', required: true, placeholder: '22:30' },
      { key: 'heureReveil', label: 'Heure de réveil habituelle', type: 'time', required: true, placeholder: '06:30' },
      { key: 'qualitePercue', label: 'Qualité perçue de ton sommeil (optionnel)', type: 'choice', options: [
        { value: 'mauvaise', label: 'Mauvaise' }, { value: 'moyenne', label: 'Moyenne' }, { value: 'bonne', label: 'Bonne' },
      ] },
      { key: 'contraintesHoraires', label: 'Contraintes horaires (optionnel)', type: 'text', placeholder: 'ex: travail de nuit un week-end sur deux' },
    ],
  },
  {
    key: 'organisation',
    title: 'Ton quotidien',
    subtitle: 'Dernier point pour caler le programme dans ta vraie vie.',
    fields: [
      { key: 'horairesTravail', label: 'Horaires de travail (optionnel)', type: 'text', placeholder: 'ex: 9h-18h en semaine' },
      { key: 'contraintes', label: 'Autres contraintes (optionnel)', type: 'text', placeholder: 'ex: enfants en bas âge, déplacements fréquents…' },
      { key: 'tempsQuotidien', label: 'Temps dispo par jour pour toi (min, optionnel)', type: 'number', min: 5, max: 600, placeholder: '60' },
    ],
  },
]

export function createEmptyAnswers() {
  return {
    prenom: '', age: null, sexe: '', tailleCm: null, poidsKg: null,
    objectifPrincipal: '', objectifsSecondaires: [],
    niveauSport: '', joursDisponibles: [], dureeSeance: null, heureEntrainement: '18:30', lieu: '', materiel: [], sportsPreferres: [],
    nombreRepasSouhaite: 3, regimeAlimentaire: '', alimentsAimes: [], alimentsDetestes: [], allergies: [], tempsCuisine: null, budget: '',
    heureCoucher: '', heureReveil: '', qualitePercue: '', contraintesHoraires: '',
    horairesTravail: '', contraintes: '', tempsQuotidien: null,
  }
}

export function isStepValid(step, answers) {
  return step.fields.every((field) => {
    if (!field.required) return true
    const value = answers[field.key]
    if (Array.isArray(value)) return value.length > 0
    return value !== '' && value !== null && value !== undefined
  })
}
