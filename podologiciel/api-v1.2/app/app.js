/* app/app.js — API de PodoLogiciel (bilans podologiques, patients, agenda, comptabilité).
   Kit « App complète » : le noyau lit cette déclaration ; ne touche jamais aux fichiers de noyau/.

   L'écran de PodoLogiciel (Vue, dossier podology-web) appelle cette API avec des jetons (Authorization: Bearer) :
   son adresse d'API est VITE_API_BASE_URL = <adresse de cette app>/api. Les routes reprennent exactement le contrat
   attendu par l'écran (src/api.js) : app/comptes-podo.js (connexion, 2FA, profil, rôles) et app/metier.js
   (patients, bilans, agenda, dépenses), app/factures.js (factures et avoirs numérotés), app/documents.js (photos, PDF, textes
   des patients) et app/semelles.js (orthèses plantaires) et app/pennylane.js (envoi facultatif des factures à Pennylane). */
'use strict';

module.exports = {
  nom: 'PodoLogiciel',
  version: '1.2.0',

  variables: [
    { cle: 'DEUX_FACTEURS_CLE', type: 'texte', secret: true, min: 32, obligatoireEnProduction: true,
      role: 'Chiffrement des secrets de double authentification (32 caractères minimum). Ne plus la changer une fois des comptes en 2FA' },
    { cle: 'LIEN_REINITIALISATION', type: 'url',
      role: 'Adresse de la page « nouveau mot de passe » de l’écran (ex. https://app.podologiciel.fr/#/reset-password) ; le lien est écrit dans les journaux du serveur tant qu’aucun envoi d’email n’est branché' },
    { cle: 'PATIENTS_MAX_GRATUIT', type: 'entier', defaut: '10', role: 'Nombre de patients maximum pour un compte gratuit (contrôlé aussi par le serveur)' },
    ...require('./pennylane').variables
  ],

  // admin et utilisateur (= « Gratuit » dans l'écran) sont fournis par le socle
  roles: [{ id: 'premium', libelle: 'Pro' }, { id: 'vip', libelle: 'VIP' }],

  tables: {
    utilisateurs: { libelle: 'Podologues', affichage: 'email', colonnesMasquees: ['personnalisation'] },
    patients: { libelle: 'Patients', affichage: 'nom' },
    bilans: { libelle: 'Bilans', affichage: 'date', colonnesMasquees: ['donnees'] },
    rendez_vous: { libelle: 'Rendez-vous', affichage: 'patient_nom' },
    reglages_agenda: { libelle: 'Horaires d’agenda', affichage: 'utilisateur_id' },
    depenses: { libelle: 'Dépenses', affichage: 'libelle' },
    reinitialisations_mdp: { libelle: 'Mots de passe oubliés', affichage: 'expire_le', lectureSeule: true },
    factures: { libelle: 'Factures', affichage: 'numero', colonnesLectureSeule: ['numero', 'genre', 'actes', 'total', 'emise_le', 'annulee_le', 'avoir_de', 'patient_fige', 'pennylane_id', 'pennylane_envoye_le', 'pennylane_essai_le'] },
    factures_compteurs: { libelle: 'Numérotation des factures', affichage: 'annee', lectureSeule: true },
    reglages_facturation: { libelle: 'Réglages de facturation', affichage: 'utilisateur_id' },
    documents: { libelle: 'Documents des patients', affichage: 'nom', colonnesMasquees: ['contenu', 'apercu', 'texte', 'annotations'] },
    semelles: { libelle: 'Semelles', affichage: 'date_prescription' },
    pennylane_reglages: { libelle: 'Connexions Pennylane', affichage: 'entreprise', colonnesMasquees: ['jeton'], colonnesLectureSeule: ['jeton'] },
    pennylane_clients: { libelle: 'Clients Pennylane', affichage: 'pennylane_id', lectureSeule: true }
  },

  // Demande d'un patient (son email) : sa fiche est anonymisée. Départ d'un podologue (son compte) : ses données sont supprimées.
  // Les factures émises ne sont pas dans la liste : elles se gardent 10 ans (obligation comptable).
  rgpd: [
    { table: 'patients', colonne: 'email', action: 'anonymiser', colonnes: ['nom', 'prenom', 'date_naissance', 'telephone', 'email', 'adresse', 'medecin_traitant', 'notes_admin'], conservation: '20 ans après la dernière consultation (dossier de soins)' },
    { table: 'patients', colonne: 'utilisateur_id', action: 'supprimer', conservation: 'durée de l’abonnement du podologue' },
    { table: 'bilans', colonne: 'utilisateur_id', action: 'supprimer', conservation: 'durée de l’abonnement du podologue' },
    { table: 'rendez_vous', colonne: 'utilisateur_id', action: 'supprimer', conservation: 'durée de l’abonnement du podologue' },
    { table: 'documents', colonne: 'utilisateur_id', action: 'supprimer', conservation: 'durée de l’abonnement du podologue' },
    { table: 'semelles', colonne: 'utilisateur_id', action: 'supprimer', conservation: 'durée de l’abonnement du podologue' },
    { table: 'depenses', colonne: 'utilisateur_id', action: 'supprimer', conservation: '10 ans (pièces comptables), puis suppression' }
  ],

  reglages: [
    { cle: 'cabinet_reference', libelle: 'Mention en pied des bilans PDF', type: 'texte', defaut: '' }
  ],

  routes(r, ctx) {
    require('./comptes-podo').routes(r, ctx);
    require('./metier').routes(r, ctx);
    require('./factures').routes(r, ctx);
    require('./documents').routes(r, ctx);
    require('./semelles').routes(r, ctx);
    require('./pennylane').routes(r, ctx);
  }
};
