// Données de démonstration pour Movyx — chargement via AdminHUD (admin uniquement)

export const MOCK_PATIENTS = [
  {
    id: 'mock_p1',
    nom: 'Dupont',
    prenom: 'Marie',
    dateNaissance: '1978-04-12',
    taille: '165',
    poids: '62',
    medecinTraitant: 'Dr. Bernard',
    telephone: '06 12 34 56 78',
    email: 'marie.dupont@email.fr',
    adresse: '12 rue des Lilas, 75011 Paris',
    notesAdmin: 'Patiente régulière, suivi semestriel.',
    createdAt: '2024-01-15T09:00:00.000Z',
    updatedAt: '2024-09-10T11:30:00.000Z',
  },
  {
    id: 'mock_p2',
    nom: 'Martin',
    prenom: 'Jean-Pierre',
    dateNaissance: '1955-09-03',
    taille: '178',
    poids: '84',
    medecinTraitant: 'Dr. Lemoine',
    telephone: '07 65 43 21 09',
    email: 'jp.martin@email.fr',
    adresse: '5 allée des Roses, 69003 Lyon',
    notesAdmin: 'Diabète de type 2. Suivi podologique renforcé.',
    createdAt: '2024-02-20T14:00:00.000Z',
    updatedAt: '2024-10-05T09:15:00.000Z',
  },
  {
    id: 'mock_p3',
    nom: 'Leblanc',
    prenom: 'Sophie',
    dateNaissance: '1990-07-25',
    taille: '160',
    poids: '55',
    medecinTraitant: 'Dr. Petit',
    telephone: '06 98 76 54 32',
    email: 'sophie.leblanc@email.fr',
    adresse: '8 place de la Mairie, 33000 Bordeaux',
    notesAdmin: 'Sportive, marathon. Douleurs plantaires récurrentes.',
    createdAt: '2024-03-10T10:00:00.000Z',
    updatedAt: '2024-11-01T16:00:00.000Z',
  },
  {
    id: 'mock_p4',
    nom: 'Moreau',
    prenom: 'Éric',
    dateNaissance: '1968-12-18',
    taille: '175',
    poids: '91',
    medecinTraitant: 'Dr. Faure',
    telephone: '06 11 22 33 44',
    email: 'eric.moreau@email.fr',
    adresse: '20 boulevard Victor Hugo, 13008 Marseille',
    notesAdmin: 'Hallux valgus bilatéral. Suivi orthopédique associé.',
    createdAt: '2024-04-05T08:30:00.000Z',
    updatedAt: '2024-11-20T14:00:00.000Z',
  },
  {
    id: 'mock_p5',
    nom: 'Girard',
    prenom: 'Isabelle',
    dateNaissance: '1985-02-14',
    taille: '168',
    poids: '67',
    medecinTraitant: 'Dr. Rousseau',
    telephone: '07 33 44 55 66',
    email: 'isabelle.girard@email.fr',
    adresse: '3 impasse du Moulin, 44000 Nantes',
    notesAdmin: '',
    createdAt: '2024-05-18T11:00:00.000Z',
    updatedAt: '2025-01-08T10:30:00.000Z',
  },
  {
    id: 'mock_p6',
    nom: 'Roux',
    prenom: 'Thomas',
    dateNaissance: '2005-06-30',
    taille: '172',
    poids: '65',
    medecinTraitant: 'Dr. Simon',
    telephone: '06 77 88 99 00',
    email: 'thomas.roux@email.fr',
    adresse: '14 rue du Château, 67000 Strasbourg',
    notesAdmin: 'Mineur à la création. Pied plat sévère.',
    createdAt: '2024-06-01T09:00:00.000Z',
    updatedAt: '2025-02-14T15:00:00.000Z',
  },
]

export const MOCK_BILANS = [
  // ── Bilan podologique complet – Marie Dupont ────────────────────────────────
  {
    id: 'mock_b1',
    patientId: 'mock_p1',
    date: '2024-09-10',
    createdAt: '2024-09-10T11:00:00.000Z',
    updatedAt: '2024-09-10T11:30:00.000Z',
    typeBilan: 'bilan',
    statut: 'finalise',

    motifConsultation: 'Douleurs plantaires bilatérales, accentuées à la marche prolongée. Sensation de brûlure le matin au lever.',
    antecedentsMedicaux: 'Entorse de la cheville gauche (2019). Aucune chirurgie.',
    antecedentsFamiliaux: 'Mère suivie pour pied plat.',
    maladies: 'Aucune maladie chronique déclarée.',
    traitementsEnCours: 'Aucun traitement médicamenteux en cours.',
    circumstancesApparition: 'Apparition progressive sur 6 mois, aggravée par port de talons hauts.',
    douleurScore: 6,
    facteursAggravants: 'Station debout prolongée, chaussures plates ou à talons hauts.',
    facteursAttenuants: 'Repos, bain de pied froid.',

    questionsPersonnalisees: [
      { id: 'qp1', question: 'Pratiquez-vous un sport régulièrement ?', reponse: 'Yoga 2x par semaine.' },
      { id: 'qp2', question: 'Type de sol principalement fréquenté ?', reponse: 'Parquet à la maison, bitume en ville.' },
    ],

    pointMobile:   'gauche',
    jambemotrice:  'droite',
    oeilMoteur:    'droit',
    lateralite:    'droitier',
    notesMotrices: 'Dominance droite confirmée. Légère asymétrie posturale.',

    barometrieData:  null,
    barometrieImage: null,
    barometrieNotes: 'Appui plantaire asymétrique, surcharge talonière gauche observée.',

    schemaAnnotations: [
      { id: 'sa1', x: 48, y: 82, commentaire: 'Douleur fascia plantaire', severite: 'modere' },
      { id: 'sa2', x: 52, y: 78, commentaire: 'Inflammation légère', severite: 'leger' },
    ],
    schemaImageData: null,

    chainesGDS: ['FL', 'AM'],
    chainesNotes: 'Chaîne postérieure tendue. Déséquilibre antéro-postérieur.',

    canvasData: null,
    notesGenerales: 'Prescription d\'orthèses plantaires semi-rigides. Conseils chaussage. Revoir dans 3 mois.',

    customData: {},

    piedAnnotations: {
      plantaire_gauche: [
        { id: 'pa1', x: 50, y: 70, commentaire: 'Cor plantaire', severite: 'modere' },
      ],
      plantaire_droit: [],
      dorsal_gauche: [],
      dorsal_droit: [],
    },
  },

  // ── Soin de pédicurie – Marie Dupont ────────────────────────────────────────
  {
    id: 'mock_b2',
    patientId: 'mock_p1',
    date: '2025-01-15',
    createdAt: '2025-01-15T09:30:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
    typeBilan: 'soin',
    statut: 'finalise',

    motifConsultation: 'Soins de routine. Cors et hyperkératoses.',
    antecedentsMedicaux: '',
    antecedentsFamiliaux: '',
    maladies: '',
    traitementsEnCours: '',
    circumstancesApparition: '',
    douleurScore: 2,
    facteursAggravants: '',
    facteursAttenuants: '',
    questionsPersonnalisees: [],

    pointMobile: '', jambemotrice: '', oeilMoteur: '', lateralite: '', notesMotrices: '',
    barometrieData: null, barometrieImage: null, barometrieNotes: '',
    schemaAnnotations: [], schemaImageData: null,
    chainesGDS: [], chainesNotes: '',
    canvasData: null,
    notesGenerales: 'Soins effectués. Cors retirés 2e et 3e orteil pied gauche. Prochaine séance dans 2 mois.',
    customData: {},

    piedAnnotations: {
      plantaire_gauche: [
        { id: 'pa2', x: 35, y: 40, commentaire: 'Cor 2e orteil retiré', severite: 'leger' },
      ],
      plantaire_droit: [
        { id: 'pa3', x: 40, y: 38, commentaire: 'Hyperkératose traitée', severite: 'leger' },
      ],
      dorsal_gauche: [],
      dorsal_droit: [],
    },
  },

  // ── Bilan complet – Jean-Pierre Martin ─────────────────────────────────────
  {
    id: 'mock_b3',
    patientId: 'mock_p2',
    date: '2024-10-05',
    createdAt: '2024-10-05T09:00:00.000Z',
    updatedAt: '2024-10-05T09:45:00.000Z',
    typeBilan: 'bilan',
    statut: 'finalise',

    motifConsultation: 'Contrôle annuel pieds diabétiques. Perte de sensibilité signalée.',
    antecedentsMedicaux: 'Diabète type 2 depuis 2010. HTA traitée.',
    antecedentsFamiliaux: 'Père amputé (complications diabétiques).',
    maladies: 'Diabète type 2, hypertension artérielle.',
    traitementsEnCours: 'Metformine 1000mg, Ramipril 5mg.',
    circumstancesApparition: 'Perte progressive de sensibilité plantaire sur 2 ans.',
    douleurScore: 3,
    facteursAggravants: 'Déséquilibre glycémique.',
    facteursAttenuants: 'Bonne hygiène podologique.',

    questionsPersonnalisees: [
      { id: 'qp3', question: 'Contrôlez-vous votre glycémie régulièrement ?', reponse: 'Oui, 2x par jour.' },
      { id: 'qp4', question: 'Avez-vous eu des plaies récentes ?', reponse: 'Non, aucune plaie.' },
    ],

    pointMobile: 'droit',
    jambemotrice: 'droite',
    oeilMoteur: 'droit',
    lateralite: 'droitier',
    notesMotrices: 'Légère ataxie proprioceptive.',

    barometrieData: null,
    barometrieImage: null,
    barometrieNotes: 'Surcharge métatarsienne. Points de pression anormaux détectés.',

    schemaAnnotations: [
      { id: 'sa3', x: 50, y: 90, commentaire: 'Zone à risque neuropathique', severite: 'severe' },
    ],
    schemaImageData: null,

    chainesGDS: ['PL'],
    chainesNotes: '',

    canvasData: null,
    notesGenerales: 'Grade 0 Wagner. Orthèses plantaires de décharge prescrites. Surveillance renforcée. RDV dans 3 mois.',
    customData: {},

    piedAnnotations: {
      plantaire_gauche: [
        { id: 'pa4', x: 45, y: 55, commentaire: 'Callosité métatarsienne', severite: 'modere' },
      ],
      plantaire_droit: [
        { id: 'pa5', x: 48, y: 53, commentaire: 'Durillon 1er métatarse', severite: 'leger' },
      ],
      dorsal_gauche: [],
      dorsal_droit: [],
    },
  },

  // ── Bilan – Sophie Leblanc (sportive) ───────────────────────────────────────
  {
    id: 'mock_b4',
    patientId: 'mock_p3',
    date: '2024-11-01',
    createdAt: '2024-11-01T15:30:00.000Z',
    updatedAt: '2024-11-01T16:00:00.000Z',
    typeBilan: 'bilan',
    statut: 'finalise',

    motifConsultation: 'Fasciite plantaire. Douleur au talon depuis 3 semaines, contexte de préparation marathon.',
    antecedentsMedicaux: 'Tendinite achilléenne (2022), traitée par kinésithérapie.',
    antecedentsFamiliaux: 'Aucun.',
    maladies: 'Aucune.',
    traitementsEnCours: 'Ibuprofène 400mg en cas de douleur aiguë.',
    circumstancesApparition: 'Augmentation brutale du kilométrage hebdomadaire (40 → 70 km/semaine).',
    douleurScore: 7,
    facteursAggravants: 'Premiers pas le matin, course longue distance.',
    facteursAttenuants: 'Étirements, glace, repos.',

    questionsPersonnalisees: [
      { id: 'qp5', question: 'Fréquence et type de chaussures de running ?', reponse: 'Changement toutes les 600km, marque Asics.' },
    ],

    pointMobile: 'gauche',
    jambemotrice: 'droite',
    oeilMoteur: 'droit',
    lateralite: 'droitière',
    notesMotrices: 'Hyperpronation gauche confirmée à la course.',

    barometrieData: null,
    barometrieImage: null,
    barometrieNotes: 'Surcharge talonière marquée. Affaissement de la voûte longitudinale interne.',

    schemaAnnotations: [
      { id: 'sa4', x: 50, y: 95, commentaire: 'Fasciite plantaire – talon', severite: 'severe' },
    ],
    schemaImageData: null,

    chainesGDS: ['PL', 'FL'],
    chainesNotes: 'Chaînes postérieures et latérales impliquées.',

    canvasData: null,
    notesGenerales: 'Orthèses sport avec talonnette amortissante. Arrêt course 3 semaines. Kinésithérapie prescrite. Conseils renforcement musculaire.',
    customData: {},

    piedAnnotations: {
      plantaire_gauche: [
        { id: 'pa6', x: 50, y: 85, commentaire: 'Point douloureux fascia', severite: 'severe' },
      ],
      plantaire_droit: [],
      dorsal_gauche: [],
      dorsal_droit: [],
    },
  },

  // ── Bilan – Éric Moreau (hallux valgus) ────────────────────────────────────
  {
    id: 'mock_b5',
    patientId: 'mock_p4',
    date: '2024-11-20',
    createdAt: '2024-11-20T13:30:00.000Z',
    updatedAt: '2024-11-20T14:00:00.000Z',
    typeBilan: 'bilan',
    statut: 'brouillon',

    motifConsultation: 'Hallux valgus bilatéral progressif. Difficultés à se chausser.',
    antecedentsMedicaux: 'Surpoids (IMC 29). Aucune chirurgie du pied.',
    antecedentsFamiliaux: 'Mère opérée d\'un hallux valgus.',
    maladies: 'Aucune maladie chronique.',
    traitementsEnCours: 'Paracétamol si douleur.',
    circumstancesApparition: 'Aggravation progressive depuis 5 ans.',
    douleurScore: 5,
    facteursAggravants: 'Chaussures étroites, piétinement prolongé.',
    facteursAttenuants: 'Chaussures larges, repos.',

    questionsPersonnalisees: [],

    pointMobile: 'droit',
    jambemotrice: 'droite',
    oeilMoteur: 'droit',
    lateralite: 'droitier',
    notesMotrices: '',

    barometrieData: null,
    barometrieImage: null,
    barometrieNotes: '',

    schemaAnnotations: [],
    schemaImageData: null,

    chainesGDS: [],
    chainesNotes: '',

    canvasData: null,
    notesGenerales: 'Bilan en cours. Orthèses de correction à l\'étude. Discussion chirurgie avec l\'orthopédiste.',
    customData: {},

    piedAnnotations: {
      plantaire_gauche: [],
      plantaire_droit: [],
      dorsal_gauche: [
        { id: 'pa7', x: 20, y: 30, commentaire: 'Hallux valgus – saillie articulaire', severite: 'modere' },
      ],
      dorsal_droit: [
        { id: 'pa8', x: 20, y: 30, commentaire: 'Hallux valgus – saillie articulaire', severite: 'modere' },
      ],
    },
  },

  // ── Bilan – Thomas Roux (pied plat) ────────────────────────────────────────
  {
    id: 'mock_b6',
    patientId: 'mock_p6',
    date: '2025-02-14',
    createdAt: '2025-02-14T14:30:00.000Z',
    updatedAt: '2025-02-14T15:00:00.000Z',
    typeBilan: 'bilan',
    statut: 'finalise',

    motifConsultation: 'Pied plat sévère bilatéral. Douleurs aux chevilles et genoux.',
    antecedentsMedicaux: 'Aucun.',
    antecedentsFamiliaux: 'Père pied plat.',
    maladies: 'Aucune.',
    traitementsEnCours: 'Aucun.',
    circumstancesApparition: 'Douleurs apparues à la croissance rapide (dernier trimestre).',
    douleurScore: 4,
    facteursAggravants: 'Sport intensif (foot), long piétinement.',
    facteursAttenuants: 'Repos, chaussures de sport adaptées.',

    questionsPersonnalisees: [
      { id: 'qp6', question: 'Activité sportive principale ?', reponse: 'Football en club, 3 entraînements/semaine + match.' },
    ],

    pointMobile: 'gauche',
    jambemotrice: 'droite',
    oeilMoteur: 'droit',
    lateralite: 'droitier',
    notesMotrices: 'Genu valgum bilatéral associé.',

    barometrieData: null,
    barometrieImage: null,
    barometrieNotes: 'Effondrement voûte plantaire bilatéral. Hyperpronation marquée.',

    schemaAnnotations: [
      { id: 'sa5', x: 48, y: 85, commentaire: 'Affaissement voûte', severite: 'severe' },
    ],
    schemaImageData: null,

    chainesGDS: ['AM', 'PL'],
    chainesNotes: 'Perturbation chaînes antéro-médiane et postéro-latérale.',

    canvasData: null,
    notesGenerales: 'Orthèses plantaires correctrices sur mesure. Kinésithérapie de renforcement musculaire. Contrôle dans 4 mois.',
    customData: {},

    piedAnnotations: {
      plantaire_gauche: [
        { id: 'pa9', x: 50, y: 60, commentaire: 'Voûte effondrée', severite: 'severe' },
      ],
      plantaire_droit: [
        { id: 'pa10', x: 50, y: 60, commentaire: 'Voûte effondrée', severite: 'severe' },
      ],
      dorsal_gauche: [],
      dorsal_droit: [],
    },
  },
]

// ── Factures ─────────────────────────────────────────────────────────────────
// Couvre jan 2024 → mai 2025, tous modes de paiement, statuts variés
export const MOCK_FACTURES = [
  // 2024 – T1
  { id:'mock_f1',  patientId:'mock_p1', date:'2024-01-18', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'cb',          statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-01-18T10:00:00.000Z', updatedAt:'2024-01-18T10:00:00.000Z' },
  { id:'mock_f2',  patientId:'mock_p2', date:'2024-02-06', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-02-06T09:00:00.000Z', updatedAt:'2024-02-06T09:00:00.000Z' },
  { id:'mock_f3',  patientId:'mock_p3', date:'2024-03-12', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'cheque',      statut:'paye',       notes:'Chèque encaissé le 15/03.', signatureOption:null, createdAt:'2024-03-12T11:00:00.000Z', updatedAt:'2024-03-12T11:00:00.000Z' },
  // 2024 – T2
  { id:'mock_f4',  patientId:'mock_p4', date:'2024-04-03', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 }],                                                                                    total:60,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-04-03T09:30:00.000Z', updatedAt:'2024-04-03T09:30:00.000Z' },
  { id:'mock_f5',  patientId:'mock_p5', date:'2024-04-22', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'cb',          statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-04-22T14:00:00.000Z', updatedAt:'2024-04-22T14:00:00.000Z' },
  { id:'mock_f6',  patientId:'mock_p1', date:'2024-05-14', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-05-14T10:00:00.000Z', updatedAt:'2024-05-14T10:00:00.000Z' },
  { id:'mock_f7',  patientId:'mock_p6', date:'2024-05-28', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'virement',    statut:'paye',       notes:'Virement reçu le 02/06.', signatureOption:null, createdAt:'2024-05-28T15:00:00.000Z', updatedAt:'2024-05-28T15:00:00.000Z' },
  { id:'mock_f8',  patientId:'mock_p2', date:'2024-06-10', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'tiers-payant',statut:'paye',       notes:'Tiers payant MGEN.', signatureOption:null, createdAt:'2024-06-10T09:00:00.000Z', updatedAt:'2024-06-10T09:00:00.000Z' },
  // 2024 – T3
  { id:'mock_f9',  patientId:'mock_p3', date:'2024-07-08', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-07-08T10:00:00.000Z', updatedAt:'2024-07-08T10:00:00.000Z' },
  { id:'mock_f10', patientId:'mock_p4', date:'2024-07-23', actes:[{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }],                                                                                    total:150, modePaiement:'cb',          statut:'paye',       notes:'Remise orthèses définitives.', signatureOption:null, createdAt:'2024-07-23T14:00:00.000Z', updatedAt:'2024-07-23T14:00:00.000Z' },
  { id:'mock_f11', patientId:'mock_p5', date:'2024-08-05', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 }],                                                                                    total:60,  modePaiement:'cheque',      statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-08-05T11:00:00.000Z', updatedAt:'2024-08-05T11:00:00.000Z' },
  { id:'mock_f12', patientId:'mock_p1', date:'2024-09-10', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'cb',          statut:'paye',       notes:'Contrôle annuel + nouvelles orthèses.', signatureOption:null, createdAt:'2024-09-10T11:30:00.000Z', updatedAt:'2024-09-10T11:30:00.000Z' },
  // 2024 – T4
  { id:'mock_f13', patientId:'mock_p2', date:'2024-10-05', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'tiers-payant',statut:'paye',       notes:'Prise en charge mutuelle.', signatureOption:null, createdAt:'2024-10-05T09:45:00.000Z', updatedAt:'2024-10-05T09:45:00.000Z' },
  { id:'mock_f14', patientId:'mock_p6', date:'2024-10-18', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-10-18T10:00:00.000Z', updatedAt:'2024-10-18T10:00:00.000Z' },
  { id:'mock_f15', patientId:'mock_p3', date:'2024-11-01', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'cheque',      statut:'en_attente', notes:'Attente remise orthèses.', signatureOption:null, createdAt:'2024-11-01T16:00:00.000Z', updatedAt:'2024-11-01T16:00:00.000Z' },
  { id:'mock_f16', patientId:'mock_p4', date:'2024-11-20', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 }],                                                                                    total:60,  modePaiement:'especes',     statut:'en_attente', notes:'', signatureOption:null, createdAt:'2024-11-20T14:00:00.000Z', updatedAt:'2024-11-20T14:00:00.000Z' },
  { id:'mock_f17', patientId:'mock_p1', date:'2024-12-03', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'cb',          statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-12-03T10:00:00.000Z', updatedAt:'2024-12-03T10:00:00.000Z' },
  { id:'mock_f18', patientId:'mock_p5', date:'2024-12-17', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2024-12-17T09:00:00.000Z', updatedAt:'2024-12-17T09:00:00.000Z' },
  // 2025 – T1
  { id:'mock_f19', patientId:'mock_p1', date:'2025-01-15', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-01-15T10:00:00.000Z', updatedAt:'2025-01-15T10:00:00.000Z' },
  { id:'mock_f20', patientId:'mock_p2', date:'2025-01-28', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'tiers-payant',statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-01-28T09:00:00.000Z', updatedAt:'2025-01-28T09:00:00.000Z' },
  { id:'mock_f21', patientId:'mock_p6', date:'2025-02-14', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'virement',    statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-02-14T15:00:00.000Z', updatedAt:'2025-02-14T15:00:00.000Z' },
  { id:'mock_f22', patientId:'mock_p3', date:'2025-02-26', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'cb',          statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-02-26T10:00:00.000Z', updatedAt:'2025-02-26T10:00:00.000Z' },
  { id:'mock_f23', patientId:'mock_p4', date:'2025-03-11', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 }],                                                                                    total:60,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-03-11T11:00:00.000Z', updatedAt:'2025-03-11T11:00:00.000Z' },
  { id:'mock_f24', patientId:'mock_p5', date:'2025-03-25', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'cheque',      statut:'paye',       notes:'Premier bilan complet.', signatureOption:null, createdAt:'2025-03-25T14:00:00.000Z', updatedAt:'2025-03-25T14:00:00.000Z' },
  // 2025 – T2 (partiel, avec factures en attente)
  { id:'mock_f25', patientId:'mock_p1', date:'2025-04-08', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'especes',     statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-04-08T09:00:00.000Z', updatedAt:'2025-04-08T09:00:00.000Z' },
  { id:'mock_f26', patientId:'mock_p2', date:'2025-04-22', actes:[{ id:'bilan-podologique',   label:'Bilan podologique',   prix:60,  quantite:1 },{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }], total:210, modePaiement:'tiers-payant',statut:'en_attente', notes:'En attente remboursement mutuelle.', signatureOption:null, createdAt:'2025-04-22T10:00:00.000Z', updatedAt:'2025-04-22T10:00:00.000Z' },
  { id:'mock_f27', patientId:'mock_p6', date:'2025-05-02', actes:[{ id:'soin-pedicurie',       label:'Soin de pédicurie',   prix:35,  quantite:1 }],                                                                                    total:35,  modePaiement:'cb',          statut:'paye',       notes:'', signatureOption:null, createdAt:'2025-05-02T11:00:00.000Z', updatedAt:'2025-05-02T11:00:00.000Z' },
  { id:'mock_f28', patientId:'mock_p3', date:'2025-05-06', actes:[{ id:'ortheses-plantaires', label:'Orthèses plantaires', prix:150, quantite:1 }],                                                                                    total:150, modePaiement:'virement',    statut:'en_attente', notes:'Remise orthèses sport prévue cette semaine.', signatureOption:null, createdAt:'2025-05-06T09:00:00.000Z', updatedAt:'2025-05-06T09:00:00.000Z' },
]

// ── Dépenses ─────────────────────────────────────────────────────────────────
// Couvre jan 2024 → mai 2025
// Types : standard, kilométrique, récurrente (recurrenceGroupId)
// Catégories : toutes les catégories définies dans CATEGORIES_DEPENSES

const LOYER_GROUP = 'recur_loyer_2024'
const MOVYX_GROUP = 'recur_movyx_2024'

export const MOCK_DEPENSES = [
  // ── Loyer mensuel récurrent (jan–déc 2024) ─────────────────────────────────
  { id:'mock_d_loyer_01', date:'2024-01-02', libelle:'Loyer cabinet janvier',    categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-01-02T08:00:00.000Z', updatedAt:'2024-01-02T08:00:00.000Z' },
  { id:'mock_d_loyer_02', date:'2024-02-01', libelle:'Loyer cabinet février',    categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-02-01T08:00:00.000Z', updatedAt:'2024-02-01T08:00:00.000Z' },
  { id:'mock_d_loyer_03', date:'2024-03-01', libelle:'Loyer cabinet mars',       categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-03-01T08:00:00.000Z', updatedAt:'2024-03-01T08:00:00.000Z' },
  { id:'mock_d_loyer_04', date:'2024-04-02', libelle:'Loyer cabinet avril',      categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-04-02T08:00:00.000Z', updatedAt:'2024-04-02T08:00:00.000Z' },
  { id:'mock_d_loyer_05', date:'2024-05-02', libelle:'Loyer cabinet mai',        categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-05-02T08:00:00.000Z', updatedAt:'2024-05-02T08:00:00.000Z' },
  { id:'mock_d_loyer_06', date:'2024-06-03', libelle:'Loyer cabinet juin',       categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-06-03T08:00:00.000Z', updatedAt:'2024-06-03T08:00:00.000Z' },
  { id:'mock_d_loyer_07', date:'2024-07-01', libelle:'Loyer cabinet juillet',    categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-07-01T08:00:00.000Z', updatedAt:'2024-07-01T08:00:00.000Z' },
  { id:'mock_d_loyer_08', date:'2024-08-01', libelle:'Loyer cabinet août',       categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-08-01T08:00:00.000Z', updatedAt:'2024-08-01T08:00:00.000Z' },
  { id:'mock_d_loyer_09', date:'2024-09-02', libelle:'Loyer cabinet septembre',  categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-09-02T08:00:00.000Z', updatedAt:'2024-09-02T08:00:00.000Z' },
  { id:'mock_d_loyer_10', date:'2024-10-01', libelle:'Loyer cabinet octobre',    categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-10-01T08:00:00.000Z', updatedAt:'2024-10-01T08:00:00.000Z' },
  { id:'mock_d_loyer_11', date:'2024-11-04', libelle:'Loyer cabinet novembre',   categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-11-04T08:00:00.000Z', updatedAt:'2024-11-04T08:00:00.000Z' },
  { id:'mock_d_loyer_12', date:'2024-12-02', libelle:'Loyer cabinet décembre',   categorie:'loyer', montant:850, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-12-02T08:00:00.000Z', updatedAt:'2024-12-02T08:00:00.000Z' },
  { id:'mock_d_loyer_13', date:'2025-01-02', libelle:'Loyer cabinet janvier',    categorie:'loyer', montant:870, typeDepense:'standard', notes:'Augmentation indexation loyer +2,4%.', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-01-02T08:00:00.000Z', updatedAt:'2025-01-02T08:00:00.000Z' },
  { id:'mock_d_loyer_14', date:'2025-02-03', libelle:'Loyer cabinet février',    categorie:'loyer', montant:870, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-02-03T08:00:00.000Z', updatedAt:'2025-02-03T08:00:00.000Z' },
  { id:'mock_d_loyer_15', date:'2025-03-03', libelle:'Loyer cabinet mars',       categorie:'loyer', montant:870, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-03-03T08:00:00.000Z', updatedAt:'2025-03-03T08:00:00.000Z' },
  { id:'mock_d_loyer_16', date:'2025-04-01', libelle:'Loyer cabinet avril',      categorie:'loyer', montant:870, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-04-01T08:00:00.000Z', updatedAt:'2025-04-01T08:00:00.000Z' },
  { id:'mock_d_loyer_17', date:'2025-05-02', libelle:'Loyer cabinet mai',        categorie:'loyer', montant:870, typeDepense:'standard', notes:'', recurrenceGroupId:LOYER_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-05-02T08:00:00.000Z', updatedAt:'2025-05-02T08:00:00.000Z' },

  // ── Abonnement Movyx mensuel récurrent ─────────────────────────────────────
  { id:'mock_d_movyx_01', date:'2024-01-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-01-05T08:00:00.000Z', updatedAt:'2024-01-05T08:00:00.000Z' },
  { id:'mock_d_movyx_02', date:'2024-02-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-02-05T08:00:00.000Z', updatedAt:'2024-02-05T08:00:00.000Z' },
  { id:'mock_d_movyx_03', date:'2024-03-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-03-05T08:00:00.000Z', updatedAt:'2024-03-05T08:00:00.000Z' },
  { id:'mock_d_movyx_04', date:'2024-04-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-04-05T08:00:00.000Z', updatedAt:'2024-04-05T08:00:00.000Z' },
  { id:'mock_d_movyx_05', date:'2024-05-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-05-05T08:00:00.000Z', updatedAt:'2024-05-05T08:00:00.000Z' },
  { id:'mock_d_movyx_06', date:'2024-06-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-06-05T08:00:00.000Z', updatedAt:'2024-06-05T08:00:00.000Z' },
  { id:'mock_d_movyx_07', date:'2024-07-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-07-05T08:00:00.000Z', updatedAt:'2024-07-05T08:00:00.000Z' },
  { id:'mock_d_movyx_08', date:'2024-08-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-08-05T08:00:00.000Z', updatedAt:'2024-08-05T08:00:00.000Z' },
  { id:'mock_d_movyx_09', date:'2024-09-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-09-05T08:00:00.000Z', updatedAt:'2024-09-05T08:00:00.000Z' },
  { id:'mock_d_movyx_10', date:'2024-10-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-10-05T08:00:00.000Z', updatedAt:'2024-10-05T08:00:00.000Z' },
  { id:'mock_d_movyx_11', date:'2024-11-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-11-05T08:00:00.000Z', updatedAt:'2024-11-05T08:00:00.000Z' },
  { id:'mock_d_movyx_12', date:'2024-12-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2024-12-05T08:00:00.000Z', updatedAt:'2024-12-05T08:00:00.000Z' },
  { id:'mock_d_movyx_13', date:'2025-01-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-01-05T08:00:00.000Z', updatedAt:'2025-01-05T08:00:00.000Z' },
  { id:'mock_d_movyx_14', date:'2025-02-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-02-05T08:00:00.000Z', updatedAt:'2025-02-05T08:00:00.000Z' },
  { id:'mock_d_movyx_15', date:'2025-03-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-03-05T08:00:00.000Z', updatedAt:'2025-03-05T08:00:00.000Z' },
  { id:'mock_d_movyx_16', date:'2025-04-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-04-05T08:00:00.000Z', updatedAt:'2025-04-05T08:00:00.000Z' },
  { id:'mock_d_movyx_17', date:'2025-05-05', libelle:'Abonnement Movyx Pro',  categorie:'logiciel', montant:29, typeDepense:'standard', notes:'', recurrenceGroupId:MOVYX_GROUP, recurrenceFreq:'mensuelle', createdAt:'2025-05-05T08:00:00.000Z', updatedAt:'2025-05-05T08:00:00.000Z' },

  // ── Charges sociales trimestrielles ────────────────────────────────────────
  { id:'mock_d_cs1', date:'2024-01-31', libelle:'Charges sociales URSSAF T4-2023', categorie:'charges-sociales', montant:1180, typeDepense:'standard', notes:'Régularisation annuelle incluse.', createdAt:'2024-01-31T10:00:00.000Z', updatedAt:'2024-01-31T10:00:00.000Z' },
  { id:'mock_d_cs2', date:'2024-04-30', libelle:'Charges sociales URSSAF T1-2024', categorie:'charges-sociales', montant:1240, typeDepense:'standard', notes:'', createdAt:'2024-04-30T10:00:00.000Z', updatedAt:'2024-04-30T10:00:00.000Z' },
  { id:'mock_d_cs3', date:'2024-07-31', libelle:'Charges sociales URSSAF T2-2024', categorie:'charges-sociales', montant:1240, typeDepense:'standard', notes:'', createdAt:'2024-07-31T10:00:00.000Z', updatedAt:'2024-07-31T10:00:00.000Z' },
  { id:'mock_d_cs4', date:'2024-10-31', libelle:'Charges sociales URSSAF T3-2024', categorie:'charges-sociales', montant:1300, typeDepense:'standard', notes:'Légère hausse suite révision assiette.', createdAt:'2024-10-31T10:00:00.000Z', updatedAt:'2024-10-31T10:00:00.000Z' },
  { id:'mock_d_cs5', date:'2025-01-31', libelle:'Charges sociales URSSAF T4-2024', categorie:'charges-sociales', montant:1300, typeDepense:'standard', notes:'', createdAt:'2025-01-31T10:00:00.000Z', updatedAt:'2025-01-31T10:00:00.000Z' },
  { id:'mock_d_cs6', date:'2025-04-30', libelle:'Charges sociales URSSAF T1-2025', categorie:'charges-sociales', montant:1320, typeDepense:'standard', notes:'', createdAt:'2025-04-30T10:00:00.000Z', updatedAt:'2025-04-30T10:00:00.000Z' },

  // ── Matériel & fournitures ─────────────────────────────────────────────────
  { id:'mock_d_mat1', date:'2024-01-15', libelle:'Consommables (compresses, sparadraps, fraises)',  categorie:'materiel',    montant:120,  typeDepense:'standard', notes:'Commande fournisseur podologie.', createdAt:'2024-01-15T09:00:00.000Z', updatedAt:'2024-01-15T09:00:00.000Z' },
  { id:'mock_d_mat2', date:'2024-03-22', libelle:'Nouvelles fraises podologiques (lot 20)',          categorie:'materiel',    montant:85,   typeDepense:'standard', notes:'', createdAt:'2024-03-22T09:00:00.000Z', updatedAt:'2024-03-22T09:00:00.000Z' },
  { id:'mock_d_mat3', date:'2024-05-15', libelle:'Podoscope lumineux (remplacement)',                categorie:'materiel',    montant:380,  typeDepense:'standard', notes:'Ancien podoscope hors service.', createdAt:'2024-05-15T09:00:00.000Z', updatedAt:'2024-05-15T09:00:00.000Z' },
  { id:'mock_d_mat4', date:'2024-07-10', libelle:'Consommables été (protection, désinfectant)',      categorie:'materiel',    montant:95,   typeDepense:'standard', notes:'', createdAt:'2024-07-10T09:00:00.000Z', updatedAt:'2024-07-10T09:00:00.000Z' },
  { id:'mock_d_mat5', date:'2024-09-18', libelle:'Semelles brutes thermoformables (lot 50 paires)',  categorie:'fournitures', montant:210,  typeDepense:'standard', notes:'Stock atelier orthèses.', createdAt:'2024-09-18T09:00:00.000Z', updatedAt:'2024-09-18T09:00:00.000Z' },
  { id:'mock_d_mat6', date:'2024-11-08', libelle:'Gants d\'examen nitrile (boîte × 10)',             categorie:'fournitures', montant:48,   typeDepense:'standard', notes:'', createdAt:'2024-11-08T09:00:00.000Z', updatedAt:'2024-11-08T09:00:00.000Z' },
  { id:'mock_d_mat7', date:'2025-01-20', libelle:'Lampe UV nail curing (remplacement)',              categorie:'materiel',    montant:120,  typeDepense:'standard', notes:'', createdAt:'2025-01-20T09:00:00.000Z', updatedAt:'2025-01-20T09:00:00.000Z' },
  { id:'mock_d_mat8', date:'2025-03-14', libelle:'Lot résines et enduits orthoplastie',              categorie:'fournitures', montant:165,  typeDepense:'standard', notes:'', createdAt:'2025-03-14T09:00:00.000Z', updatedAt:'2025-03-14T09:00:00.000Z' },
  { id:'mock_d_mat9', date:'2025-04-28', libelle:'Recharge consommables cabinet',                   categorie:'materiel',    montant:78,   typeDepense:'standard', notes:'', createdAt:'2025-04-28T09:00:00.000Z', updatedAt:'2025-04-28T09:00:00.000Z' },

  // ── Formation & communication ──────────────────────────────────────────────
  { id:'mock_d_form1', date:'2024-03-10', libelle:'Formation – Podologie du sport (2 jours Paris)',   categorie:'formation',      montant:490,  typeDepense:'standard', notes:'DPC validé.', createdAt:'2024-03-10T08:00:00.000Z', updatedAt:'2024-03-10T08:00:00.000Z' },
  { id:'mock_d_form2', date:'2024-10-25', libelle:'Congrès podologie Bordeaux – inscription',         categorie:'formation',      montant:280,  typeDepense:'standard', notes:'', createdAt:'2024-10-25T08:00:00.000Z', updatedAt:'2024-10-25T08:00:00.000Z' },
  { id:'mock_d_form3', date:'2025-02-18', libelle:'Formation en ligne – Baromérie numérique',         categorie:'formation',      montant:150,  typeDepense:'standard', notes:'Accès 1 an.', createdAt:'2025-02-18T08:00:00.000Z', updatedAt:'2025-02-18T08:00:00.000Z' },
  { id:'mock_d_com1',  date:'2024-04-15', libelle:'Refonte site internet cabinet',                    categorie:'communication',  montant:600,  typeDepense:'standard', notes:'Prestataire web local.', createdAt:'2024-04-15T08:00:00.000Z', updatedAt:'2024-04-15T08:00:00.000Z' },
  { id:'mock_d_com2',  date:'2024-09-01', libelle:'Cartes de visite (500 ex.)',                       categorie:'communication',  montant:55,   typeDepense:'standard', notes:'', createdAt:'2024-09-01T08:00:00.000Z', updatedAt:'2024-09-01T08:00:00.000Z' },
  { id:'mock_d_com3',  date:'2025-01-10', libelle:'Abonnement hébergement + domaine web',             categorie:'communication',  montant:96,   typeDepense:'standard', notes:'Annuel.', createdAt:'2025-01-10T08:00:00.000Z', updatedAt:'2025-01-10T08:00:00.000Z' },

  // ── Assurance & comptabilité ───────────────────────────────────────────────
  { id:'mock_d_ass1', date:'2024-06-01', libelle:'Assurance RCP annuelle',                           categorie:'assurance',      montant:310,  typeDepense:'standard', notes:'Couvre 2024.', createdAt:'2024-06-01T08:00:00.000Z', updatedAt:'2024-06-01T08:00:00.000Z' },
  { id:'mock_d_ass2', date:'2024-06-01', libelle:'Mutuelle TNS mensuelle (juin)',                    categorie:'assurance',      montant:185,  typeDepense:'standard', notes:'', createdAt:'2024-06-01T08:00:00.000Z', updatedAt:'2024-06-01T08:00:00.000Z' },
  { id:'mock_d_ass3', date:'2025-01-15', libelle:'Renouvellement assurance RCP 2025',                categorie:'assurance',      montant:320,  typeDepense:'standard', notes:'+3,2% par rapport à 2024.', createdAt:'2025-01-15T08:00:00.000Z', updatedAt:'2025-01-15T08:00:00.000Z' },
  { id:'mock_d_cpt1', date:'2024-05-20', libelle:'Honoraires comptable – bilan annuel 2023',         categorie:'comptabilite',   montant:450,  typeDepense:'standard', notes:'', createdAt:'2024-05-20T08:00:00.000Z', updatedAt:'2024-05-20T08:00:00.000Z' },
  { id:'mock_d_cpt2', date:'2025-03-28', libelle:'Honoraires comptable – bilan annuel 2024',         categorie:'comptabilite',   montant:470,  typeDepense:'standard', notes:'', createdAt:'2025-03-28T08:00:00.000Z', updatedAt:'2025-03-28T08:00:00.000Z' },

  // ── Frais kilométriques ────────────────────────────────────────────────────
  // Déplacements patients à domicile + formations
  { id:'mock_d_km1', date:'2024-02-14', libelle:'Déplacement patient domicile – Dupont',  categorie:'transport', montant:7.63,  typeDepense:'kilometrique', kmDistance:6,  kmNbTrajets:1, kmAllerRetour:true,  kmTaux:0.636, notes:'Visite à domicile exception.', createdAt:'2024-02-14T08:00:00.000Z', updatedAt:'2024-02-14T08:00:00.000Z' },
  { id:'mock_d_km2', date:'2024-03-10', libelle:'Trajet formation podologie du sport',    categorie:'transport', montant:57.87, typeDepense:'kilometrique', kmDistance:91, kmNbTrajets:1, kmAllerRetour:true,  kmTaux:0.636, notes:'Paris A/R.', createdAt:'2024-03-10T08:00:00.000Z', updatedAt:'2024-03-10T08:00:00.000Z' },
  { id:'mock_d_km3', date:'2024-06-05', libelle:'Déplacement patient domicile – Martin',  categorie:'transport', montant:5.09,  typeDepense:'kilometrique', kmDistance:4,  kmNbTrajets:2, kmAllerRetour:false, kmTaux:0.636, notes:'2 passages dans la semaine.', createdAt:'2024-06-05T08:00:00.000Z', updatedAt:'2024-06-05T08:00:00.000Z' },
  { id:'mock_d_km4', date:'2024-10-25', libelle:'Trajet congrès podologie Bordeaux',      categorie:'transport', montant:25.44, typeDepense:'kilometrique', kmDistance:40, kmNbTrajets:1, kmAllerRetour:true,  kmTaux:0.636, notes:'', createdAt:'2024-10-25T08:00:00.000Z', updatedAt:'2024-10-25T08:00:00.000Z' },
  { id:'mock_d_km5', date:'2025-02-18', libelle:'Déplacement patient domicile – Roux',    categorie:'transport', montant:8.27,  typeDepense:'kilometrique', kmDistance:6,  kmNbTrajets:1, kmAllerRetour:true,  kmTaux:0.679, notes:'Taux 2025.', createdAt:'2025-02-18T08:00:00.000Z', updatedAt:'2025-02-18T08:00:00.000Z' },
  { id:'mock_d_km6', date:'2025-04-10', libelle:'Déplacement patient domicile – Girard',  categorie:'transport', montant:11.56, typeDepense:'kilometrique', kmDistance:8,  kmNbTrajets:1, kmAllerRetour:true,  kmTaux:0.722, notes:'', createdAt:'2025-04-10T08:00:00.000Z', updatedAt:'2025-04-10T08:00:00.000Z' },

  // ── Divers ─────────────────────────────────────────────────────────────────
  { id:'mock_d_div1', date:'2024-08-20', libelle:'Renouvellement ordre podologues',  categorie:'autre',  montant:120, typeDepense:'standard', notes:'Cotisation annuelle.', createdAt:'2024-08-20T08:00:00.000Z', updatedAt:'2024-08-20T08:00:00.000Z' },
  { id:'mock_d_div2', date:'2024-12-10', libelle:'Fournitures bureau (papier, encre)', categorie:'fournitures', montant:42, typeDepense:'standard', notes:'', createdAt:'2024-12-10T08:00:00.000Z', updatedAt:'2024-12-10T08:00:00.000Z' },
  { id:'mock_d_div3', date:'2025-04-15', libelle:'Nettoyage et entretien cabinet',    categorie:'autre',  montant:180, typeDepense:'standard', notes:'Prestataire ménage semestriel.', createdAt:'2025-04-15T08:00:00.000Z', updatedAt:'2025-04-15T08:00:00.000Z' },
]

export const MOCK_AGENDA = [
  {
    id: 'mock_a1',
    patientId: 'mock_p1',
    title: 'Marie Dupont – Bilan podologique',
    start: '2025-05-07T09:00:00',
    end:   '2025-05-07T10:00:00',
    type: 'bilan',
    notes: 'Contrôle orthèses.',
    createdAt: '2025-04-20T08:00:00.000Z',
  },
  {
    id: 'mock_a2',
    patientId: 'mock_p2',
    title: 'Jean-Pierre Martin – Contrôle pieds diabétiques',
    start: '2025-05-07T10:30:00',
    end:   '2025-05-07T11:00:00',
    type: 'controle',
    notes: 'Vérification état cutané.',
    createdAt: '2025-04-20T08:00:00.000Z',
  },
  {
    id: 'mock_a3',
    patientId: 'mock_p3',
    title: 'Sophie Leblanc – Soin de pédicurie',
    start: '2025-05-08T14:00:00',
    end:   '2025-05-08T14:30:00',
    type: 'soin',
    notes: '',
    createdAt: '2025-04-21T08:00:00.000Z',
  },
  {
    id: 'mock_a4',
    patientId: 'mock_p5',
    title: 'Isabelle Girard – Premier bilan',
    start: '2025-05-09T11:00:00',
    end:   '2025-05-09T12:00:00',
    type: 'bilan',
    notes: 'Nouvelle patiente.',
    createdAt: '2025-04-22T08:00:00.000Z',
  },
  {
    id: 'mock_a5',
    patientId: 'mock_p4',
    title: 'Éric Moreau – Remise orthèses',
    start: '2025-05-12T15:00:00',
    end:   '2025-05-12T15:30:00',
    type: 'remise',
    notes: 'Remise et essayage orthèses plantaires.',
    createdAt: '2025-04-23T08:00:00.000Z',
  },
  {
    id: 'mock_a6',
    patientId: 'mock_p6',
    title: 'Thomas Roux – Contrôle orthèses',
    start: '2025-05-14T09:30:00',
    end:   '2025-05-14T10:00:00',
    type: 'controle',
    notes: '',
    createdAt: '2025-04-24T08:00:00.000Z',
  },
]
