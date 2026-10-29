# PodoLogiciel – Application PWA pour Podologues

Application web progressive (PWA) destinée aux podologues pour réaliser, gérer et exporter des bilans podologiques complets. Conçue pour une utilisation en consultation sur tablette (avec stylet) ou ordinateur.

---

## Installation et lancement

### Prérequis

- Node.js 18+ ([nodejs.org](https://nodejs.org))
- npm 9+

### Installation

```bash
# 1. Aller dans le dossier
cd "podo logiciel"

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev
```

L'application est disponible sur `http://localhost:5173`

### Production

```bash
npm run build       # génère le dossier dist/
npm run preview     # prévisualise le build
```

### Tests qualité

```bash
npm test
# ou directement :
node src/tests/quality.js
```

---

## Structure du projet

```
podo logiciel/
├── index.html                    # Point d'entrée HTML
├── vite.config.js                # Config Vite + PWA
├── package.json                  # Dépendances
├── public/
│   └── sw.js                     # Service Worker (offline)
└── src/
    ├── main.js                   # Bootstrap Vue app
    ├── App.vue                   # Composant racine + layout
    ├── styles/
    │   └── global.css            # Design system complet
    ├── router/
    │   └── index.js              # Routes Vue Router
    ├── store/
    │   ├── patients.js           # Store Pinia – patients
    │   ├── bilans.js             # Store Pinia – bilans
    │   └── ui.js                 # Store Pinia – UI / notifications
    ├── views/
    │   ├── Dashboard.vue         # Tableau de bord + statistiques
    │   ├── PatientList.vue       # Liste et recherche patients
    │   ├── PatientDetail.vue     # Fiche patient + historique bilans
    │   └── BilanEditor.vue       # Éditeur de bilan (tabs)
    ├── components/
    │   ├── layout/
    │   │   ├── AppHeader.vue     # En-tête navigation
    │   │   ├── AppSidebar.vue    # Sidebar + état connexion
    │   │   └── HUD.vue           # Notifications overlay + spinner
    │   └── bilan/
    │       ├── Interrogatoire.vue      # Tab interrogatoire + EVA + questions perso
    │       ├── MotriciteSection.vue    # Tab préférences motrices
    │       ├── BarometrieSection.vue   # Tab baromètrie + import image
    │       ├── SchemaCorpsSection.vue  # Tab schéma corps SVG interactif
    │       ├── ChainesGDSSection.vue   # Tab chaînes musculaires GDS
    │       ├── AnnotationCanvas.vue    # Tab canvas libre (stylet)
    │       ├── NotesGenerales.vue      # Tab notes libres
    │       └── PDFTemplate.vue         # Template de rendu PDF (caché)
    └── utils/
        ├── uuid.js               # Génération d'identifiants uniques
        ├── storage.js            # Abstraction localStorage
        ├── pdf.js                # Export PDF (jsPDF + html2canvas)
        └── tests/
            └── quality.js        # Suite de tests qualité (23 tests)
```

---

## Fonctionnalités

### Gestion patient
- Création / édition / suppression de dossiers patients
- Champs : nom, prénom, date de naissance, taille, poids (avec calcul IMC automatique), médecin traitant, téléphone, email, adresse
- Historique complet des bilans par patient
- Recherche rapide par nom/prénom

### Bilan podologique (7 onglets)

**1. Interrogatoire**
- Motif de consultation
- Antécédents médicaux et familiaux
- Maladies et traitements en cours
- Évaluation EVA (slider visuel 0-10 avec codage couleur)
- Facteurs aggravants / atténuants
- Questions personnalisées ajoutables en live

**2. Préférences motrices**
- Latéralité (droitier / gaucher / ambidextre)
- Jambe motrice, œil moteur, point mobile
- Récapitulatif visuel avec indicateur d'homogénéité

**3. Baromètrie**
- Import d'image (Winpod ou autre, drag & drop)
- Saisie manuelle par zones (talon, médio-pied, métatarses, orteils)
- Barres de progression colorées par intensité

**4. Schéma corporel**
- Silhouette SVG interactive complète
- Flèches prédéfinies : épaules, bassin, genoux, chevilles
- Ajout de points personnalisés au clic
- Commentaire + sévérité (légère / modérée / sévère) par annotation

**5. Chaînes musculaires GDS**
- 8 chaînes avec sélection multiple
- Résumé des chaînes sélectionnées avec notes

**6. Annotations libres (canvas)**
- Dessin au stylet / souris / tactile
- Outils : stylo, gomme
- Sélecteur de couleur (7 couleurs), épaisseur variable
- Annuler / Tout effacer / Sauvegarder

**7. Notes générales**
- Zone de texte libre pour observations, plan de traitement, suivi

### Export PDF
- Génération PDF complète (jsPDF + html2canvas)
- Inclut : données patient, tous les onglets, annotations, images
- Mise en page professionnelle
- Nommage automatique du fichier

### Fonctionnalités transverses
- **Auto-sauvegarde** dans localStorage (pas de perte de données)
- **Finalisation** du bilan (statut brouillon / finalisé)
- **Export JSON** de toutes les données (sauvegarde)
- **Import JSON** (restauration)
- **Mode sombre / clair** (persistant)
- **PWA** : installable sur tablette/mobile, fonctionne hors ligne
- **HUD** : notifications légères et feedback visuel

---

## Stack technique

| Composant | Outil |
|-----------|-------|
| Framework | Vue 3 (Composition API) |
| Build | Vite 5 |
| State | Pinia |
| Routing | Vue Router 4 |
| PWA | vite-plugin-pwa + Workbox |
| PDF | jsPDF + html2canvas |
| Stockage | localStorage (offline-first) |
| CSS | Custom Design System (pas de Tailwind) |

---

## Évolutions possibles

### Court terme (V1.1)
- Synchronisation Firebase pour multi-appareils
- Authentification (Firebase Auth)
- Photos des pieds du patient
- Templates de bilan (rapide / complet)
- Impression directe depuis l'app

### Moyen terme (V1.5)
- Connexion directe Winpod via API ou fichier d'import
- Graphiques d'évolution (EVA, poids, IMC)
- Calendrier de consultation intégré
- Signature électronique du bilan
- Envoi PDF par email au patient

### Long terme (V2)
- Multi-cabinet / multi-praticien
- Backend cloud dédié (PostgreSQL + Node.js API)
- Application mobile native (Capacitor)
- Intégration RPPS (identifiant praticien)
- Module de facturation

---

## Business

### Proposition de valeur

> "Le premier outil de bilan podologique conçu par et pour les podologues : rapide, professionnel, utilisable en consultation, sans installation."

**Problème résolu** : Les podologues utilisent papier + Excel + Word disparates → perte de temps, pas de traçabilité, bilans non professionnels.

**Solution** : Application tout-en-un, utilisable sur tablette en consultation, qui génère un bilan PDF professionnel en 1 clic.

**Avantage concurrentiel** :
- Optimisé tactile / stylet
- Fonctionne hors ligne
- Export PDF immédiat
- Prix accessible (SaaS)

---

### Trouver des clients rapidement

**Canaux directs :**
1. **Groupes Facebook podologues** (5-6 groupes avec 10 000+ membres) → post de présentation + démo vidéo courte
2. **LinkedIn** → cibler "podologue" + "cabinet podologie" en France (~12 000 professionnels)
3. **Forums spécialisés** : podologiste.com, forum.podologie.fr
4. **Partenariats** avec écoles podologie (IFMK, écoles privées) → accès aux étudiants + réseau

**Démonstration terrain :**
- Congrès Podologie France (CNPP, FFMKR)
- Démo gratuite sur tablette dans les cabinets → 1 RDV = 1 conversion si produit bon

**Contenu :**
- Vidéo démo de 2 minutes (TikTok, Instagram, YouTube) → "comment je fais un bilan en 5 min avec l'app"
- Article blog "Arrêtez le papier pour vos bilans podologiques"

---

### Génération de revenus rapides

**Modèle SaaS par abonnement :**

| Plan | Prix | Fonctionnalités |
|------|------|-----------------|
| Starter | 19€/mois | 1 praticien, 50 patients, export PDF |
| Pro | 39€/mois | 1 praticien, patients illimités, sync cloud, support |
| Cabinet | 79€/mois | 3 praticiens, multi-appareils, sauvegarde auto |

**Objectif réaliste :**
- 50 abonnés Pro = 1 950€/mois
- 200 abonnés = 7 800€/mois (rentabilité confortable)

**Démarrer simplement :**
1. Version gratuite 30 jours → conversion payante
2. Paiement via Stripe (intégration 2h)
3. Hébergement : Vercel (gratuit) + Firebase Spark (gratuit jusqu'à 50k utilisateurs)

---

### Limiter à 1h/jour de gestion

**Automatisations à mettre en place :**

| Tâche | Outil | Temps |
|-------|-------|-------|
| Onboarding client | Email séquence (Brevo/Mailchimp) | 0 min |
| Support niveau 1 | FAQ + chatbot | 10 min |
| Facturation | Stripe auto | 0 min |
| Déploiement | GitHub Actions → Vercel | 0 min |
| Monitoring | Vercel Analytics + Sentry | 5 min |
| Newsletter mensuelle | Brevo template | 30 min |
| Réponse support | Template réponses types | 15 min |

**Total : ~1h/jour max** pour 50-200 clients.

---

## Déploiement

### Vercel (recommandé, gratuit)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Drag & drop le dossier dist/ sur netlify.com
```

### Hébergement classique
```bash
npm run build
# Upload dist/ sur votre hébergeur via FTP
```

---

## Licence

Propriétaire – © 2025 Guillaume Maury. Tous droits réservés.
