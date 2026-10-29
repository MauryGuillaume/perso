/* ==========================================================================
   ab-veille.js — veille technologique : une idée d'app par jour
   - un catalogue de fiches complètes (fonctionne hors ligne) : problème, écrans,
     données, API, stack, kits de l'Atelier, services, mise en production,
     monétisation, risques, version minimale ;
   - l'idée du jour est tirée du catalogue selon la date (même idée toute la
     journée, ordre mélangé une fois pour toutes) ; une idée générée par l'IA
     pour ce jour-là passe devant ;
   - génération par l'IA via le serveur local (ou prompt à copier dans Claude) ;
   - état gardé dans le réglage « veille » : favoris, idées réalisées, idées IA,
     génération automatique.
   Uniquement des apps grand public (comme une calculatrice ou une météo), jamais pour un type d'entreprise.
   Une fiche (catalogue ou IA) :
   { id, titre, accroche, niveau: simple|intermediaire|avance, serveur: bool, categorie, icone,
     duree, cible, probleme, solution, pourquoi, fonctionnalites[], ecrans[],
     donnees[], api[], roles, stack[], kits[], services[], etapes[],
     monetisation: { modele, prix, objectif }, couts, risques[], mvp, evolutions[] }
   ========================================================================== */
(function () {
  const U = AB.u;
  const V = AB.veille = {};

  V.NIVEAUX = {
    simple: { label: 'Simple', chip: 'chip-success', icone: 'mdi-signal-cellular-1' },
    intermediaire: { label: 'Intermédiaire', chip: 'chip-warning', icone: 'mdi-signal-cellular-2' },
    avance: { label: 'Plus complexe', chip: 'chip-danger', icone: 'mdi-signal-cellular-3' }
  };

  const STACK = ['Node.js 20 + PostgreSQL 16 (kit App complète)', 'Front : HTML/CSS/JS servi par l’app, installable (PWA)', 'Hébergement : Render, Railway, Scalingo ou Clever Cloud (France) + PostgreSQL managé'];
  const KITS_BASE = ['app-complete', 'securite-renforcee', 'base-projet', 'affichage-fr'];
  /* Apps sans serveur : tout tourne sur l'appareil, publiées sur le web et sur les stores. */
  const STACK_PWA = ['HTML/CSS/JS sans framework (kit Socle PWA), installable et hors ligne', 'Données sur l’appareil : IndexedDB / localStorage', 'Hébergement statique gratuit : Netlify, Cloudflare Pages ou GitHub Pages', 'App iOS et Android : Capacitor, préparé dans Atelier › Apps mobiles'];
  const KITS_PWA = ['socle-pwa', 'charte-base', 'affichage-fr', 'securite-base'];

  /* ---------------------------------------------------------------- catalogue */
  V.CATALOGUE = [
    {
      id: 'calculatrice-plus', titre: 'Calculatrice avec historique et conversions', icone: 'mdi-calculator-variant-outline', niveau: 'simple', categorie: 'Utilitaires', duree: '1 à 2 jours', serveur: false,
      accroche: 'Une calculatrice claire qui garde l’historique, comprend les pourcentages et convertit en un geste.',
      cible: 'Tout le monde : courses, soldes, devoirs, bricolage.',
      probleme: 'La calculatrice du téléphone oublie tout, gère mal les pourcentages (« 80 € moins 30 % ») et ne permet pas de corriger une saisie.',
      solution: 'Une ligne de saisie modifiable (on voit toute l’expression), le résultat en direct, un historique réutilisable, les pourcentages comme on les dit, un mode scientifique et un panneau de conversions rapides.',
      pourquoi: 'Application installée par tous et rarement soignée : une calculatrice agréable et sans publicité envahissante se garde à vie.',
      fonctionnalites: ['Expression complète modifiable, résultat en direct', 'Pourcentages naturels (80 − 30 %, TVA, remise)', 'Historique avec étiquettes, réutiliser un résultat', 'Mode scientifique (parenthèses, puissances, trigonométrie)', 'Conversions rapides (longueurs, poids, températures)', 'Thème clair/sombre, grands chiffres, retour haptique', 'Fonctionne hors ligne'],
      ecrans: ['Calculatrice', 'Mode scientifique (téléphone tourné)', 'Historique', 'Conversions', 'Réglages'],
      donnees: ['historique (IndexedDB) : expression, résultat, étiquette, date', 'réglages (localStorage) : thème, précision, séparateur décimal'],
      api: ['Aucune : tout est calculé sur l’appareil (analyseur d’expressions maison, jamais eval)'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Tester les arrondis (0,1 + 0,2 doit afficher 0,3) : calcul en décimal (bibliothèque decimal.js)'],
      monetisation: { modele: 'Gratuit avec achat unique', prix: 'Gratuit ; 2,99 € une fois pour le mode scientifique, les thèmes et l’historique illimité', objectif: 'Volume sur les stores' },
      couts: '0 € (hébergement statique gratuit) + comptes développeur des stores',
      risques: ['Marché très encombré : soigner la fiche store (captures, mot-clé « pourcentage »)'],
      mvp: 'Calcul avec expression modifiable, pourcentages, historique.',
      evolutions: ['Widget écran d’accueil (via Capacitor)', 'Calcul à partir d’une photo de ticket']
    },
    {
      id: 'meteo-pluie', titre: 'Météo : va-t-il pleuvoir dans l’heure ?', icone: 'mdi-weather-pouring', niveau: 'simple', categorie: 'Météo', duree: '2 à 3 jours', serveur: false,
      accroche: 'Une météo qui répond d’abord à la seule question du matin : faut-il prendre un parapluie ?',
      cible: 'Tout le monde, surtout cyclistes, piétons, parents.',
      probleme: 'Les apps météo sont chargées de publicités et de chiffres ; on veut une réponse en une seconde.',
      solution: 'À l’ouverture, une phrase (« Pas de pluie avant 17 h », « Pluie faible dans 20 min ») avec la courbe des précipitations des 2 prochaines heures, puis la journée et 7 jours. Plusieurs lieux favoris, conseils tenue (veste, parapluie, crème solaire).',
      pourquoi: 'Données météo ouvertes de qualité (API Open-Meteo, API publiques de Météo-France) faciles à appeler directement depuis le téléphone.',
      fonctionnalites: ['Phrase de synthèse pluie à 2 h', 'Courbe de précipitations au quart d’heure', 'Prévisions heure par heure et 7 jours', 'Lieux favoris + position actuelle', 'Conseil tenue (pluie, froid, UV)', 'Vigilance météo de la région', 'Hors ligne : dernières prévisions gardées'],
      ecrans: ['Maintenant (phrase + courbe 2 h)', 'Aujourd’hui heure par heure', '7 jours', 'Mes lieux', 'Réglages (unités, conseils)'],
      donnees: ['lieux (localStorage) : nom, latitude, longitude, ordre', 'cache des prévisions (IndexedDB) : lieu, date, réponse'],
      api: ['GET api.open-meteo.com/v1/forecast : minutely_15, hourly, daily (sans clé)', 'GET geocoding-api.open-meteo.com/v1/search : recherche de ville', 'Géolocalisation du navigateur (avec accord)'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Open-Meteo : gratuit pour un usage non commercial, abonnement si l’app gagne de l’argent', 'Alternative : API publiques de Météo-France (portail-api.meteofrance.fr, clé gratuite)'],
      etapes: ['Lire les conditions d’Open-Meteo et choisir l’offre adaptée avant d’ajouter de la publicité', 'Mettre les réponses en cache 10 minutes pour limiter les appels', 'Citer la source des données dans l’app'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit avec une bannière discrète ; 1,99 €/an sans publicité, avec plus de lieux', objectif: '≈ 5 000 € à 15 000 €/an selon l’audience' },
      couts: '0 à 30 €/mois selon l’offre de données',
      risques: ['Prévision fausse = avis négatifs : afficher le niveau de confiance', 'Concurrence forte : se distinguer par la phrase immédiate et la sobriété'],
      mvp: 'Position actuelle, phrase pluie à 2 h, courbe, 7 jours.',
      evolutions: ['Notification « pluie dans 15 min » (demande un serveur d’envoi)', 'Widget écran d’accueil']
    },
    {
      id: 'convertisseur', titre: 'Convertisseur d’unités et de devises', icone: 'mdi-swap-horizontal-circle-outline', niveau: 'simple', categorie: 'Utilitaires', duree: '1 à 2 jours', serveur: false,
      accroche: 'Devises au taux du jour, cuisine, tailles de vêtements, températures : tout se convertit en tapant.',
      cible: 'Voyageurs, cuisiniers, acheteurs en ligne à l’étranger, étudiants.',
      probleme: 'Chaque conversion demande une recherche web différente, et hors ligne en voyage on n’a plus rien.',
      solution: 'Un champ unique : on tape « 3 cups », « 75 °F » ou « 120 USD » et le résultat s’affiche dans les unités utiles. Les taux de change de la BCE sont gardés pour le hors ligne.',
      pourquoi: 'Voyages et achats internationaux en hausse ; les taux officiels de la BCE sont publiés gratuitement chaque jour.',
      fonctionnalites: ['Saisie libre (« 120 usd », « 5 oz ») ou par catégories', 'Devises : taux BCE du jour, hors ligne', 'Cuisine (tasses, cuillères, onces, grammes selon l’ingrédient)', 'Tailles de vêtements et chaussures (UE/US/UK)', 'Favoris et conversions récentes', 'Calcul direct dans le champ (« 3 × 250 g »)'],
      ecrans: ['Convertir (champ unique)', 'Catégories', 'Devises', 'Favoris', 'Réglages'],
      donnees: ['taux (IndexedDB) : devise, taux, date', 'favoris et récents (localStorage)'],
      api: ['GET api.frankfurter.app/latest?from=EUR : taux de la BCE (sans clé)', 'Tables d’unités embarquées dans l’app'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Frankfurter (taux BCE, gratuit)'],
      etapes: ['Rafraîchir les taux au plus une fois par jour et afficher leur date'],
      monetisation: { modele: 'Publicité + achat unique', prix: 'Gratuit avec bannière ; 1,99 € pour retirer la publicité', objectif: '≈ 3 000 à 8 000 €/an' },
      couts: '0 €',
      risques: ['Taux de change indicatifs : le préciser (pas de taux bancaire)'],
      mvp: 'Champ unique, 6 catégories, devises.',
      evolutions: ['Conversion par la caméra (prix d’une étiquette)', 'Montre connectée']
    },
    {
      id: 'minuteurs-cuisine', titre: 'Minuteurs multiples pour la cuisine', icone: 'mdi-timer-sand', niveau: 'simple', categorie: 'Cuisine', duree: '1 à 2 jours', serveur: false,
      accroche: 'Pâtes 9 min, four 25 min, œufs 6 min : plusieurs minuteurs nommés qui sonnent même écran éteint.',
      cible: 'Cuisiniers du quotidien, pâtissiers, parents.',
      probleme: 'Le minuteur du téléphone n’en lance qu’un à la fois et sans nom ; on ne sait plus ce qui sonne.',
      solution: 'Des minuteurs nommés en parallèle, des préréglages (œufs mollets, riz, pâtes…), une vue en grand lisible de loin et une alarme différente par minuteur.',
      pourquoi: 'Cuisine maison en hausse ; un outil simple et sans compte se partage vite.',
      fonctionnalites: ['Plusieurs minuteurs simultanés nommés', 'Préréglages modifiables (40 aliments)', 'Sons différents, vibration', 'Mode plein écran lisible de loin, écran maintenu allumé', 'Enchaînements (« saisir 3 min puis four 20 min »)', 'Commande vocale « lance pâtes »'],
      ecrans: ['Minuteurs en cours', 'Nouveau minuteur', 'Préréglages', 'Plein écran', 'Réglages'],
      donnees: ['préréglages (IndexedDB) : nom, durée, son, étapes', 'minuteurs en cours (localStorage) : fin prévue (heure absolue)'],
      api: ['API Wake Lock (écran allumé), Vibration, Web Speech (commande vocale)', 'Notifications locales via Capacitor pour sonner écran éteint'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Version mobile obligatoire pour sonner écran verrouillé (plugin Capacitor Local Notifications)', 'Calculer le temps restant à partir de l’heure de fin (pas d’un compteur qui dérive)'],
      monetisation: { modele: 'Achat unique', prix: 'Gratuit 2 minuteurs ; 1,99 € pour illimité, sons et enchaînements', objectif: '≈ 3 000 €/an' },
      couts: '0 €',
      risques: ['Le navigateur endort les onglets : la version store est la vraie version'],
      mvp: 'Minuteurs nommés en parallèle, préréglages, alarme.',
      evolutions: ['Montre connectée', 'Lien avec les recettes']
    },
    {
      id: 'boite-a-outils', titre: 'Boîte à outils du téléphone', icone: 'mdi-toolbox-outline', niveau: 'simple', categorie: 'Utilitaires', duree: '2 à 3 jours', serveur: false,
      accroche: 'Niveau à bulle, règle, rapporteur, sonomètre et loupe dans une seule app légère.',
      cible: 'Bricoleurs, locataires qui accrochent un cadre, curieux.',
      probleme: 'On installe cinq apps pleines de publicités pour des outils qui servent deux minutes.',
      solution: 'Une seule app avec les outils qui exploitent les capteurs du téléphone : inclinaison, caméra, micro. Gros boutons, aucune inscription.',
      pourquoi: 'Les capteurs sont accessibles depuis le web et Capacitor ; le bricolage maison reste très populaire.',
      fonctionnalites: ['Niveau à bulle (surface et bord) avec calibrage', 'Règle à l’écran (calibrée selon le modèle)', 'Rapporteur avec la caméra', 'Sonomètre approximatif (dB)', 'Loupe avec lampe', 'Lampe torche'],
      ecrans: ['Accueil des outils', 'Niveau', 'Règle', 'Rapporteur', 'Sonomètre', 'Loupe'],
      donnees: ['calibrages (localStorage) : décalage du niveau, densité d’écran'],
      api: ['DeviceOrientation (niveau), getUserMedia caméra et micro, Web Audio (sonomètre)', 'Plugins Capacitor : lampe torche'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['iPhone : demander l’accès aux capteurs de mouvement (DeviceOrientationEvent.requestPermission)', 'Indiquer que le sonomètre est indicatif'],
      monetisation: { modele: 'Publicité + achat unique', prix: 'Gratuit avec bannière, 1,99 € sans publicité', objectif: '≈ 3 000 à 6 000 €/an' },
      couts: '0 €',
      risques: ['Précision variable selon les téléphones : calibrage'],
      mvp: 'Niveau à bulle et règle.',
      evolutions: ['Mesure de distance en réalité augmentée', 'Détecteur de métal (magnétomètre)']
    },
    {
      id: 'habitudes-series', titre: 'Suivi d’habitudes et séries', icone: 'mdi-fire', niveau: 'simple', categorie: 'Bien-être', duree: '2 jours', serveur: false,
      accroche: 'Cocher ses habitudes chaque jour et voir sa série grandir, sans compte ni réseau social.',
      cible: 'Tous ceux qui veulent tenir une résolution : lire, marcher, boire de l’eau, ne pas fumer.',
      probleme: 'Les apps d’habitudes demandent un compte, envoient trop de notifications ou sont payantes dès la troisième habitude.',
      solution: 'Des habitudes avec fréquence (tous les jours, 3 fois par semaine), une coche par jour, la série en cours, un calendrier façon « heatmap » et un rappel à l’heure choisie. Données sur l’appareil, export possible.',
      pourquoi: 'Le « bien-être numérique » est un des premiers usages des stores, et le respect de la vie privée devient un argument.',
      fonctionnalites: ['Habitudes avec icône, couleur, fréquence', 'Coche du jour en un geste', 'Séries, records, calendrier annuel', 'Rappel quotidien', 'Jours de repos (sans casser la série)', 'Export/import JSON'],
      ecrans: ['Aujourd’hui', 'Habitude (calendrier, statistiques)', 'Nouvelle habitude', 'Réglages'],
      donnees: ['habitudes (IndexedDB) : nom, icône, couleur, fréquence, rappel', 'coches (IndexedDB) : habitude, date'],
      api: ['Notifications locales (Capacitor) pour les rappels'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Gérer le changement de fuseau et d’heure d’été (dates locales AAAA-MM-JJ)'],
      monetisation: { modele: 'Achat unique', prix: 'Gratuit 3 habitudes, 3,99 € à vie illimité', objectif: '≈ 5 000 €/an' },
      couts: '0 €',
      risques: ['Abandon après 2 semaines : rappels bien dosés et petites récompenses'],
      mvp: 'Habitudes, coche, série, rappel.',
      evolutions: ['Widget', 'Synchronisation entre appareils (avec serveur)']
    },
    {
      id: 'notes-vocales', titre: 'Notes vocales transformées en texte', icone: 'mdi-microphone-outline', niveau: 'simple', categorie: 'Productivité', duree: '2 à 3 jours', serveur: false,
      accroche: 'Parler au lieu de taper : la note s’écrit pendant qu’on parle et se range toute seule.',
      cible: 'Tout le monde : idées en marchant, listes, souvenirs, personnes qui tapent difficilement.',
      probleme: 'Les mémos vocaux s’accumulent sans qu’on les réécoute ; taper en marchant est pénible.',
      solution: 'Un gros bouton micro, la dictée transcrite en direct par le téléphone, des notes recherchables, des mots-clés (« courses », « idée ») qui classent la note.',
      pourquoi: 'La reconnaissance vocale intégrée aux téléphones est devenue précise en français.',
      fonctionnalites: ['Dictée en direct (reconnaissance vocale de l’appareil)', 'Ponctuation à la voix (« virgule », « à la ligne »)', 'Classement par mots-clés', 'Recherche plein texte', 'Partage (messages, e-mail)', 'Épingler, archiver'],
      ecrans: ['Enregistrer', 'Notes', 'Note', 'Dossiers', 'Réglages'],
      donnees: ['notes (IndexedDB) : texte, dossier, date, épinglée'],
      api: ['Web Speech API (SpeechRecognition), plugin Capacitor Speech Recognition en version mobile'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun (reconnaissance sur l’appareil)'],
      etapes: ['Vérifier la prise en charge : Chrome et Safari oui, Firefox non (afficher un message)', 'Demander l’accès au micro avec une explication claire'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit ; 2,49 €/mois pour le résumé et le classement par IA (avec serveur)', objectif: '≈ 5 000 €/an' },
      couts: '0 € (version de base)',
      risques: ['Qualité selon le bruit ambiant', 'Envoi audio éventuel vers un service : le dire clairement'],
      mvp: 'Dictée, liste des notes, recherche.',
      evolutions: ['Résumé et tâches extraites par l’IA', 'Rappels datés (« demain 9 h »)']
    },
    {
      id: 'mots-de-passe', titre: 'Générateur de mots de passe et phrases secrètes', icone: 'mdi-form-textbox-password', niveau: 'simple', categorie: 'Sécurité', duree: '1 jour', serveur: false,
      accroche: 'Créer un mot de passe solide et mémorisable, et vérifier s’il a déjà fuité.',
      cible: 'Tout le monde, en particulier les personnes peu à l’aise avec le numérique.',
      probleme: 'On réutilise le même mot de passe faute de savoir en inventer un bon.',
      solution: 'Génération de phrases secrètes en français (« cheval-lampe-orage-42 ») ou de mots de passe aléatoires, jauge de solidité expliquée, et vérification anonyme dans la base des fuites connues.',
      pourquoi: 'Fuites de données à répétition en France ; les recommandations de l’ANSSI et de la CNIL poussent les phrases de passe.',
      fonctionnalites: ['Phrases secrètes en français (liste de mots embarquée)', 'Mots de passe aléatoires (longueur, symboles)', 'Jauge de solidité (temps estimé pour le casser)', 'Vérification « a-t-il fuité ? » sans envoyer le mot de passe (k-anonymat)', 'Conseils simples', 'Copie avec effacement du presse-papiers'],
      ecrans: ['Générer', 'Vérifier', 'Conseils', 'Réglages'],
      donnees: ['Rien n’est stocké (réglages seulement)'],
      api: ['crypto.getRandomValues (aléa sûr)', 'GET api.pwnedpasswords.com/range/<5 premiers caractères du SHA-1> (le mot de passe ne quitte pas l’appareil)'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Have I Been Pwned – Pwned Passwords (gratuit)'],
      etapes: ['Ne jamais journaliser ni stocker un mot de passe', 'CSP stricte : aucun script externe'],
      monetisation: { modele: 'Gratuit / don', prix: 'Gratuit, bouton de soutien ; ou affiliation vers un gestionnaire de mots de passe', objectif: 'Image de marque, revenus d’affiliation' },
      couts: '0 €',
      risques: ['Confiance : code simple, fonctionnement expliqué, aucune collecte'],
      mvp: 'Générateur de phrases et jauge.',
      evolutions: ['Extension navigateur', 'Vérification de l’adresse e-mail dans les fuites']
    },
    {
      id: 'qr-codes', titre: 'Scanner et créateur de QR codes', icone: 'mdi-qrcode-scan', niveau: 'simple', categorie: 'Utilitaires', duree: '1 à 2 jours', serveur: false,
      accroche: 'Scanner un QR code en sécurité et en créer un pour son wifi, sa carte de visite ou un lien.',
      cible: 'Tout le monde.',
      probleme: 'Les QR codes frauduleux (« quishing ») se multiplient et les générateurs gratuits ajoutent des redirections payantes.',
      solution: 'Un scanner qui montre l’adresse réelle avant de l’ouvrir et signale les liens douteux, et un créateur de QR codes statiques (sans redirection, valables pour toujours) : wifi, contact, lien, texte, événement.',
      pourquoi: 'Arnaques au faux QR code sur les horodateurs et dans les e-mails ; méfiance envers les générateurs à abonnement.',
      fonctionnalites: ['Scan caméra et depuis une image', 'Aperçu de l’adresse, alerte sur raccourcisseurs et domaines suspects', 'Création : lien, wifi, contact (vCard), texte, événement', 'Couleurs et logo, export PNG/SVG', 'Historique local'],
      ecrans: ['Scanner', 'Résultat', 'Créer', 'Historique'],
      donnees: ['historique (IndexedDB) : contenu, type, date'],
      api: ['BarcodeDetector (repli bibliothèque jsQR)', 'Génération : bibliothèque qrcode embarquée'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Ne jamais ouvrir un lien automatiquement après le scan'],
      monetisation: { modele: 'Publicité + achat unique', prix: 'Gratuit ; 2,99 € pour logo, couleurs, export SVG', objectif: '≈ 4 000 €/an' },
      couts: '0 €',
      risques: ['Détection de liens douteux imparfaite : toujours montrer l’adresse complète'],
      mvp: 'Scanner avec aperçu d’adresse, créateur lien et wifi.',
      evolutions: ['Vérification des liens avec Google Safe Browsing (serveur)', 'Scan de codes-barres produits']
    },
    {
      id: 'compte-a-rebours', titre: 'Comptes à rebours des grands moments', icone: 'mdi-calendar-heart', niveau: 'simple', categorie: 'Loisirs', duree: '1 à 2 jours', serveur: false,
      accroche: 'J-12 avant les vacances, J-45 avant le mariage : des comptes à rebours jolis, à partager.',
      cible: 'Tout le monde : vacances, anniversaires, concerts, naissance, retraite.',
      probleme: 'On compte les jours sur un calendrier, sans plaisir et sans partage.',
      solution: 'Des cartes de compte à rebours avec photo de fond, jours/heures restants, anniversaires qui se répètent chaque année, et une image prête à partager en story.',
      pourquoi: 'Format très partagé sur les réseaux ; widgets d’écran d’accueil désormais courants.',
      fonctionnalites: ['Événements avec date, photo, couleur', 'Répétition annuelle (anniversaires)', 'Affichage jours, heures, semaines', 'Image à partager (format story)', 'Rappel la veille', 'Comptes « depuis » (jours sans fumer, âge du bébé)'],
      ecrans: ['Mes comptes à rebours', 'Détail plein écran', 'Créer / modifier', 'Partager'],
      donnees: ['evenements (IndexedDB) : titre, date, photo (blob), couleur, répétition'],
      api: ['Canvas pour l’image à partager, Web Share API'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Réduire les photos à 1080 px avant stockage'],
      monetisation: { modele: 'Achat unique', prix: 'Gratuit 3 événements ; 2,49 € illimité, thèmes et widgets', objectif: '≈ 3 000 €/an' },
      couts: '0 €',
      risques: ['Usage ponctuel : les anniversaires récurrents ramènent l’utilisateur'],
      mvp: 'Événements, photo, compte à rebours, partage.',
      evolutions: ['Widget écran d’accueil', 'Compte à rebours partagé à plusieurs (serveur)']
    },
    {
      id: 'hydratation', titre: 'Rappels pour boire de l’eau', icone: 'mdi-cup-water', niveau: 'simple', categorie: 'Bien-être', duree: '1 à 2 jours', serveur: false,
      accroche: 'Un objectif d’eau adapté au poids et à la chaleur du jour, et des rappels doux.',
      cible: 'Adultes actifs, sportifs, personnes âgées et leurs proches, épisodes de canicule.',
      probleme: 'On oublie de boire, surtout en période de forte chaleur.',
      solution: 'Objectif calculé (poids, activité, température du jour), ajout d’un verre en un geste, rappels espacés aux heures éveillées, plus fréquents en cas de canicule.',
      pourquoi: 'Vagues de chaleur plus fréquentes, messages de santé publique sur l’hydratation.',
      fonctionnalites: ['Objectif personnalisé', 'Ajout rapide (verre, gourde, tasse)', 'Rappels entre heure de lever et de coucher', 'Mode canicule (température via Open-Meteo)', 'Historique de la semaine'],
      ecrans: ['Aujourd’hui (jauge)', 'Historique', 'Profil et objectif', 'Rappels'],
      donnees: ['prises (IndexedDB) : date, quantité', 'profil (localStorage) : poids, activité, horaires'],
      api: ['Open-Meteo : température du jour (sans clé)', 'Notifications locales (Capacitor)'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Open-Meteo'],
      etapes: ['Mention : conseils généraux, pas un avis médical'],
      monetisation: { modele: 'Publicité + achat unique', prix: 'Gratuit, 1,99 € sans publicité avec thèmes', objectif: '≈ 3 000 €/an' },
      couts: '0 €',
      risques: ['Notifications jugées envahissantes : réglage fin de la fréquence'],
      mvp: 'Objectif, ajout rapide, rappels.',
      evolutions: ['Montres connectées', 'Mode aidant (suivre un parent âgé, avec serveur)']
    },
    {
      id: 'respiration', titre: 'Respiration et cohérence cardiaque', icone: 'mdi-weather-windy', niveau: 'simple', categorie: 'Bien-être', duree: '1 à 2 jours', serveur: false,
      accroche: 'Trois minutes guidées pour se calmer : une bulle qui gonfle et dégonfle au bon rythme.',
      cible: 'Personnes stressées, étudiants avant examen, insomniaques.',
      probleme: 'Les apps de méditation sont des abonnements chers pour un exercice qui tient en une animation.',
      solution: 'Exercices de respiration guidés (cohérence cardiaque 5-5, carré 4-4-4-4, 4-7-8) avec animation, son doux et vibration, rappels trois fois par jour et suivi des séances.',
      pourquoi: 'Santé mentale très présente dans les usages ; la cohérence cardiaque est connue du grand public.',
      fonctionnalites: ['Exercices avec rythmes réglables', 'Animation, sons, vibration (yeux fermés)', 'Durées 1 à 10 min', 'Rappels', 'Historique et série'],
      ecrans: ['Choisir un exercice', 'Séance', 'Fin de séance', 'Historique', 'Réglages'],
      donnees: ['séances (IndexedDB) : exercice, durée, date'],
      api: ['Web Audio (sons générés), Vibration, Notifications locales'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Respecter « réduire les animations » du système'],
      monetisation: { modele: 'Achat unique', prix: 'Gratuit 2 exercices ; 3,99 € à vie pour tous les exercices, sons et statistiques', objectif: '≈ 5 000 €/an' },
      couts: '0 €',
      risques: ['Pas d’allégation médicale'],
      mvp: 'Cohérence cardiaque 5 min avec animation.',
      evolutions: ['Mesure du pouls avec la caméra', 'Montre connectée']
    },
    {
      id: 'tirage-au-sort', titre: 'Tirage au sort et décisions', icone: 'mdi-dice-multiple-outline', niveau: 'simple', categorie: 'Loisirs', duree: '1 jour', serveur: false,
      accroche: 'Roue de la fortune, pile ou face, dés, équipes équilibrées : on décide en s’amusant.',
      cible: 'Familles, groupes d’amis, enseignants, animateurs.',
      probleme: 'Qui fait la vaisselle, quel resto, quelles équipes : on perd du temps et on se dispute.',
      solution: 'Une app de tirage : roue personnalisable, pile ou face, dés, tirage de noms sans remise, création d’équipes équilibrées, avec animations et sons.',
      pourquoi: 'Format viral, facile à partager en vidéo ; utile en classe et en soirée.',
      fonctionnalites: ['Roue personnalisable et listes enregistrées', 'Pile ou face, dés (D4 à D20)', 'Tirage de noms sans remise', 'Équipes équilibrées', 'Animations, sons, secousse du téléphone pour lancer'],
      ecrans: ['Accueil des outils', 'Roue', 'Dés', 'Tirage de noms', 'Équipes', 'Mes listes'],
      donnees: ['listes (IndexedDB) : nom, éléments'],
      api: ['crypto.getRandomValues, DeviceMotion (secousse)'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Aléa équitable (rejet des valeurs biaisées)'],
      monetisation: { modele: 'Publicité', prix: 'Gratuit avec publicité, 1,99 € sans', objectif: '≈ 3 000 €/an' },
      couts: '0 €',
      risques: ['Peu de rétention : miser sur les listes enregistrées'],
      mvp: 'Roue et pile ou face.',
      evolutions: ['Mode projection en classe', 'Roue partagée en direct (serveur)']
    },
    {
      id: 'potager-calendrier', titre: 'Calendrier du potager', icone: 'mdi-sprout-outline', niveau: 'simple', categorie: 'Maison', duree: '2 à 3 jours', serveur: false,
      accroche: 'Quoi semer, planter et récolter ce mois-ci, selon sa région, avec les rappels d’arrosage.',
      cible: 'Jardiniers amateurs, balcons, jardins partagés.',
      probleme: 'Les calendriers papier sont génériques et on oublie les semis ; les associations de plantes sont mal connues.',
      solution: 'Une base de 80 légumes et aromates (périodes par zone climatique, espacements, associations), un plan simple de ses bacs, et des rappels de semis, repiquage et récolte. Alerte gel selon la météo locale.',
      pourquoi: 'Le potager familial s’est démocratisé, y compris sur les balcons.',
      fonctionnalites: ['Calendrier du mois par zone', 'Fiches légumes (semis, récolte, associations)', 'Mon potager : bacs et plantations', 'Rappels', 'Alerte gel (prévisions)', 'Journal des récoltes'],
      ecrans: ['Ce mois-ci', 'Fiche légume', 'Mon potager', 'Rappels', 'Journal'],
      donnees: ['légumes (embarqué, JSON)', 'plantations (IndexedDB) : légume, bac, date semis, date prévue récolte', 'journal (IndexedDB)'],
      api: ['Open-Meteo : températures minimales des prochains jours'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Open-Meteo'],
      etapes: ['Faire relire les données de culture par un jardinier'],
      monetisation: { modele: 'Achat unique', prix: 'Gratuit ; 4,99 € pour le plan du potager, les rappels et les alertes gel', objectif: '≈ 6 000 €/an (saisonnier)' },
      couts: '0 €',
      risques: ['Saisonnalité forte : lancer en février'],
      mvp: 'Calendrier du mois et fiches.',
      evolutions: ['Reconnaissance des maladies par photo (IA)', 'Échange de graines entre voisins']
    },
    {
      id: 'qualite-air-pollen', titre: 'Qualité de l’air et pollens', icone: 'mdi-flower-pollen-outline', niveau: 'intermediaire', categorie: 'Santé et environnement', duree: '3 à 4 jours', serveur: false,
      accroche: 'Savoir le matin si l’air est bon pour courir et si les pollens vont faire éternuer.',
      cible: 'Allergiques (une personne sur quatre environ), asthmatiques, sportifs, parents.',
      probleme: 'Les informations pollens et pollution sont éparpillées et peu lisibles.',
      solution: 'Indice du jour et des 3 prochains jours pour la pollution (particules, ozone, dioxyde d’azote) et les pollens (graminées, bouleau, ambroisie…), avec un conseil simple et un suivi de ses symptômes pour repérer ses déclencheurs.',
      pourquoi: 'Saisons polliniques plus longues, épisodes d’ozone l’été ; données européennes ouvertes (Copernicus via Open-Meteo).',
      fonctionnalites: ['Indice air et pollens à la position', 'Prévisions 3 jours', 'Pollens à surveiller (choix de ses allergies)', 'Conseils (sport, aération, traitement à prendre)', 'Journal des symptômes et corrélation', 'Plusieurs lieux'],
      ecrans: ['Aujourd’hui', 'Prévisions', 'Mes allergies', 'Journal', 'Lieux'],
      donnees: ['profil (localStorage) : pollens suivis, seuils', 'journal (IndexedDB) : date, symptômes (0-3), note'],
      api: ['GET air-quality-api.open-meteo.com/v1/air-quality : pm10, pm2_5, ozone, pollens (Europe)', 'Données régionales des AASQA (Atmo) en complément'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Open-Meteo Air Quality (données Copernicus)'],
      etapes: ['Expliquer la source et la précision des données', 'Données de santé saisies (symptômes) gardées sur l’appareil uniquement'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit ; 1,99 €/an pour les alertes et le journal', objectif: '≈ 6 000 €/an' },
      couts: '0 à 30 €/mois selon l’offre de données',
      risques: ['Pas de conseil médical : renvoyer vers le médecin'],
      mvp: 'Indice du jour air + pollens, prévisions.',
      evolutions: ['Alerte le matin (serveur de notifications)', 'Carte des capteurs']
    },
    {
      id: 'traducteur-photo', titre: 'Traduire un menu ou une étiquette en photo', icone: 'mdi-translate', niveau: 'avance', categorie: 'Voyage', duree: '1 semaine', serveur: true,
      accroche: 'Photographier un menu au Japon ou une étiquette en Pologne et comprendre ce qu’on va manger.',
      cible: 'Voyageurs, expatriés, personnes allergiques en voyage.',
      probleme: 'Les traducteurs donnent le mot à mot (« viande de printemps ») sans expliquer le plat ni les allergènes.',
      solution: 'Photo du menu ou de l’étiquette ; l’IA (Claude, vision) lit le texte, traduit, explique chaque plat en une phrase, signale les allergènes et les ingrédients à éviter selon le profil de l’utilisateur.',
      pourquoi: 'Les modèles d’IA multimodaux lisent désormais les menus manuscrits et expliquent le contexte culinaire.',
      fonctionnalites: ['Photo ou import', 'Traduction plat par plat avec explication', 'Allergènes et régime (végétarien, halal, sans porc…) mis en évidence', 'Prononciation pour commander', 'Historique des menus', 'Phrases utiles (« je suis allergique à… »)'],
      ecrans: ['Prendre une photo', 'Résultat (plats)', 'Mon profil alimentaire', 'Historique', 'Phrases utiles', 'Crédits'],
      donnees: ['comptes(id, email, credits)', 'traductions(id, compte, langue_source, resultat jsonb, cree_le)', 'côté appareil : profil alimentaire, historique'],
      api: ['POST /api/traduire : image réduite + profil → Claude (vision) → JSON des plats', 'GET /api/credits', 'POST /api/achats/verifier : validation des achats intégrés'],
      roles: 'utilisateur, admin.',
      stack: ['Node.js + PostgreSQL (kit App complète) pour garder la clé de l’IA côté serveur et compter les crédits', 'Front PWA + Capacitor (caméra)', 'API Claude (vision, sortie JSON)'], kits: ['app-complete', 'securite-renforcee', 'socle-pwa', 'affichage-fr'],
      services: ['API Claude : ≈ 1 à 3 centimes par photo', 'Achats intégrés App Store / Google Play (RevenueCat pour simplifier)'],
      etapes: ['Mettre ANTHROPIC_API_KEY dans les variables du serveur (jamais dans l’app)', 'Réduire l’image à 1 500 px côté téléphone avant l’envoi', 'Limiter le nombre de traductions par compte et par heure', 'Ne pas garder les photos sur le serveur'],
      monetisation: { modele: 'Crédits', prix: '10 traductions offertes, puis 4,99 € les 50 ou 2,99 €/mois illimité raisonnable', objectif: '≈ 15 000 €/an' },
      couts: '≈ 15 €/mois + IA (couverte par les crédits)',
      risques: ['Allergènes : avertissement « vérifiez auprès du restaurant »', 'Coût IA : crédits et limites'],
      mvp: 'Photo → plats traduits et expliqués, 10 essais gratuits.',
      evolutions: ['Mode hors ligne partiel', 'Conversation traduite avec le serveur']
    },
    {
      id: 'course-a-pied', titre: 'Coach course à pied « de 0 à 5 km »', icone: 'mdi-run-fast', niveau: 'avance', categorie: 'Sport', duree: '1 à 2 semaines', serveur: true,
      accroche: 'Un plan de 8 semaines guidé à la voix pour passer du canapé à 5 km sans se blesser.',
      cible: 'Débutants, reprises après une pause, personnes en surpoids.',
      probleme: 'On commence trop vite, on se fait mal et on abandonne la deuxième semaine.',
      solution: 'Un plan progressif (alternance marche/course), une voix qui annonce « courez 90 secondes », le suivi GPS de la séance (distance, allure, parcours), la séance suivante adaptée au ressenti.',
      pourquoi: 'La course à pied est le premier sport des Français ; les débutants veulent de l’accompagnement simple.',
      fonctionnalites: ['Plans 0-5 km, 5-10 km', 'Guidage vocal des intervalles', 'GPS : distance, allure, carte', 'Ressenti après séance → adaptation du plan', 'Historique et records', 'Sauvegarde du compte (changement de téléphone)', 'Musique de l’utilisateur en fond'],
      ecrans: ['Mon plan (semaine)', 'Séance en cours', 'Fin de séance (ressenti)', 'Historique', 'Carte d’une sortie', 'Profil'],
      donnees: ['comptes(id, email, plan, semaine)', 'seances(id, compte, date, duree_s, distance_m, ressenti, trace jsonb)', 'plans(id, nom, semaines jsonb)'],
      api: ['GET /api/plan', 'POST /api/seances (trace simplifiée)', 'GET /api/seances', 'POST /api/achats/verifier'],
      roles: 'coureur, admin.',
      stack: ['Node.js + PostgreSQL (kit App complète) pour la sauvegarde', 'App mobile Capacitor obligatoire (GPS en arrière-plan : plugin Background Geolocation)', 'Synthèse vocale : plugin Text-to-Speech', 'Carte : Leaflet + OpenStreetMap'], kits: ['app-complete', 'securite-renforcee', 'socle-pwa', 'affichage-fr'],
      services: ['Achats intégrés (RevenueCat)', 'Tuiles de carte OpenStreetMap ou IGN (respecter les conditions d’usage)'],
      etapes: ['Déclarer l’usage de la localisation en arrière-plan dans les fiches stores (justification exigée par Apple et Google)', 'Simplifier les traces GPS avant l’envoi (algorithme de Douglas-Peucker)', 'Tester en vraie sortie, écran verrouillé'],
      monetisation: { modele: 'Abonnement ou achat du plan', prix: '2 premières semaines gratuites ; 9,99 € le plan complet ou 3,99 €/mois tous plans', objectif: '≈ 20 000 €/an' },
      couts: '≈ 15 €/mois',
      risques: ['GPS en arrière-plan délicat sur iPhone : prévoir du temps de test', 'Blessures : conseils d’échauffement, avertissement santé'],
      mvp: 'Plan 0-5 km avec guidage vocal et chronomètre (sans GPS).',
      evolutions: ['Défis entre amis', 'Lien avec Apple Santé / Health Connect']
    },
    {
      id: 'plantes-arrosage', titre: 'Reconnaître ses plantes et ne plus oublier l’arrosage', icone: 'mdi-flower-tulip-outline', niveau: 'avance', categorie: 'Maison', duree: '1 semaine', serveur: true,
      accroche: 'Photographier une plante, connaître son nom et recevoir le bon rappel d’arrosage.',
      cible: 'Amateurs de plantes d’intérieur, débutants qui « tuent tout ».',
      probleme: 'On ne connaît pas le nom de ses plantes ni leurs besoins, et on arrose trop ou pas assez.',
      solution: 'Identification par photo, fiche d’entretien (lumière, arrosage, rempotage), calendrier d’arrosage par plante ajusté selon la saison, et diagnostic d’une feuille malade par l’IA.',
      pourquoi: 'Plantes d’intérieur très populaires ; API de reconnaissance botanique accessibles (Pl@ntNet, développée par des instituts de recherche français).',
      fonctionnalites: ['Identification par photo', 'Fiche d’entretien', 'Mes plantes (photo, pièce, date d’arrivée)', 'Rappels d’arrosage et d’engrais selon la saison', 'Diagnostic d’une feuille (IA)', 'Journal photo de croissance'],
      ecrans: ['Mes plantes', 'Identifier', 'Fiche plante', 'Aujourd’hui (à arroser)', 'Diagnostic', 'Journal'],
      donnees: ['comptes(id, email)', 'plantes(id, compte, espece, surnom, piece, photo, arrosage_jours, dernier_arrosage)', 'arrosages(id, plante, date)', 'especes(id, nom_latin, nom_commun, besoins jsonb)'],
      api: ['POST /api/identifier : image → Pl@ntNet', 'POST /api/diagnostic : image → Claude (vision)', 'CRUD /api/plantes', 'POST /api/plantes/:id/arroser'],
      roles: 'utilisateur, admin.',
      stack: ['Node.js + PostgreSQL (kit App complète) : clés des API côté serveur, sauvegarde', 'Front PWA + Capacitor (caméra, notifications locales)'], kits: ['app-complete', 'securite-renforcee', 'socle-pwa', 'affichage-fr'],
      services: ['API Pl@ntNet (quota gratuit quotidien, offre payante au-delà)', 'API Claude : diagnostic (quelques centimes)', 'Achats intégrés'],
      etapes: ['Clés PLANTNET_API_KEY et ANTHROPIC_API_KEY dans les variables du serveur', 'Mettre en cache les identifications d’une même espèce', 'Limiter les diagnostics IA pour la version gratuite'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit 5 plantes ; 2,99 €/mois ou 19,99 €/an : plantes illimitées, diagnostic IA', objectif: '≈ 15 000 €/an' },
      couts: '≈ 15 €/mois + API',
      risques: ['Identification erronée : proposer 3 espèces avec probabilité', 'Plantes toxiques pour les animaux : avertissement sur la fiche'],
      mvp: 'Identification, fiche, rappel d’arrosage.',
      evolutions: ['Capteur d’humidité connecté', 'Échange de boutures']
    },
    {
      id: 'budget-perso', titre: 'Budget du mois sans prise de tête', icone: 'mdi-wallet-outline', niveau: 'intermediaire', categorie: 'Argent', duree: '4 à 5 jours', serveur: false,
      accroche: 'Savoir chaque jour combien on peut encore dépenser jusqu’à la fin du mois.',
      cible: 'Jeunes actifs, étudiants, familles qui veulent finir le mois sans découvert.',
      probleme: 'Les apps de budget demandent l’accès à la banque ou trop de catégories ; on abandonne.',
      solution: 'On indique ses revenus et charges fixes ; l’app calcule « reste à dépenser par jour ». On ajoute une dépense en 3 secondes (montant + emoji), ou on importe le relevé CSV de sa banque. Tout reste sur le téléphone.',
      pourquoi: 'Pouvoir d’achat sous tension ; méfiance croissante envers le partage des données bancaires.',
      fonctionnalites: ['Revenus et charges fixes du mois', '« Reste par jour » recalculé en direct', 'Saisie rapide d’une dépense', 'Import CSV d’un relevé (format des principales banques)', 'Enveloppes (courses, sorties)', 'Graphique du mois, comparaison avec le précédent', 'Verrouillage par code ou biométrie', 'Export/sauvegarde chiffrée'],
      ecrans: ['Aujourd’hui (reste par jour)', 'Ajouter', 'Dépenses du mois', 'Enveloppes', 'Importer', 'Bilan', 'Réglages et sécurité'],
      donnees: ['mois (IndexedDB) : revenus, charges fixes', 'depenses (IndexedDB) : montant_cts, emoji, catégorie, date, note', 'enveloppes (IndexedDB) : nom, plafond'],
      api: ['Aucune : calcul et import CSV sur l’appareil', 'WebCrypto (sauvegarde chiffrée AES-GCM)'],
      roles: 'aucun compte.',
      stack: STACK_PWA, kits: KITS_PWA,
      services: ['Aucun'],
      etapes: ['Tester l’import CSV avec les relevés de 5 banques différentes', 'Montants en centimes entiers'],
      monetisation: { modele: 'Achat unique', prix: 'Gratuit ; 5,99 € à vie pour enveloppes, import CSV, bilans', objectif: '≈ 10 000 €/an' },
      couts: '0 €',
      risques: ['Perte des données si le téléphone est perdu : rappeler l’export chiffré', 'Connexion bancaire automatique = agrément obligatoire : rester sur l’import'],
      mvp: 'Revenus, charges, reste par jour, saisie rapide.',
      evolutions: ['Synchronisation chiffrée de bout en bout entre conjoints (serveur)', 'Objectifs d’épargne']
    },
    {
      id: 'carnet-entretien-auto', titre: 'Carnet d’entretien auto', icone: 'mdi-car-wrench', serveur: true, niveau: 'simple', categorie: 'Auto', duree: '2 à 3 jours',
      accroche: 'Tous les entretiens de la voiture au même endroit, avec un rappel avant chaque échéance.',
      cible: 'Tous les conducteurs : voiture, moto, scooter, camping-car.',
      probleme: 'On oublie la date du contrôle technique, la vidange ou les pneus hiver ; les factures sont dans la boîte à gants et se perdent à la revente.',
      solution: 'Une PWA où l’on enregistre chaque véhicule, ses interventions (date, kilométrage, garage, prix, photo de facture) et des échéances calculées (date ou kilométrage). Un e-mail part 30 jours et 7 jours avant.',
      pourquoi: 'Contrôle technique obligatoire pour les deux-roues depuis 2024, voitures gardées plus longtemps : le suivi d’entretien devient un argument de revente.',
      fonctionnalites: ['Véhicules (marque, modèle, immatriculation, mise en circulation, kilométrage)', 'Interventions avec photo de facture', 'Échéances par date ou par kilométrage, recalculées à chaque intervention', 'Rappels e-mail J-30 et J-7', 'Export PDF « historique d’entretien » pour la revente', 'Partage en lecture à un proche ou à l’acheteur par lien'],
      ecrans: ['Connexion / inscription', 'Mes véhicules : carte par véhicule avec la prochaine échéance', 'Fiche véhicule : historique, échéances, kilométrage actuel', 'Nouvelle intervention : formulaire + photo', 'Réglages des rappels', 'Page publique d’historique (lien partagé)'],
      donnees: ['vehicules(id, compte, marque, modele, immatriculation, mise_en_circulation, km_actuel)', 'interventions(id, vehicule, type, date, km, garage, montant_cts, fichier)', 'echeances(id, vehicule, type, date_limite, km_limite, rappel_envoye_le)', 'partages(id, vehicule, jeton, expire_le)'],
      api: ['GET/POST /api/vehicules', 'GET/POST /api/vehicules/:id/interventions', 'GET /api/vehicules/:id/echeances', 'POST /api/vehicules/:id/partage : crée un lien de lecture', 'GET /p/:jeton : historique public', 'Tâche quotidienne : rappels des échéances'],
      roles: 'utilisateur (ses véhicules), admin.',
      stack: STACK, kits: KITS_BASE.concat(['socle-pwa']),
      services: ['Brevo ou Resend : e-mails de rappel (gratuit jusqu’à 300/jour)', 'Stockage des photos : disque de l’hébergeur ou S3 (Scaleway Object Storage)'],
      etapes: ['Programmer la tâche quotidienne des rappels (cron de l’hébergeur à 7 h)', 'Limiter les photos à 5 Mo, en JPEG/PNG/PDF'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit pour 1 véhicule, 2,99 €/mois ou 19 €/an jusqu’à 5 véhicules', objectif: '300 abonnés = ≈ 6 000 €/an' },
      couts: '≈ 10 €/mois (hébergement + base)',
      risques: ['Saisie fastidieuse : proposer les échéances types dès la création du véhicule', 'Rétention : le rappel e-mail est la vraie valeur'],
      mvp: 'Véhicules, interventions sans photo, échéances par date, rappel e-mail J-7.',
      evolutions: ['Lecture de la facture par l’IA (montant, date, garage)', 'Lecture du kilométrage sur photo du compteur']
    },
    {
      id: 'inventaire-assurance', titre: 'Inventaire du logement pour l’assurance', icone: 'mdi-sofa-outline', serveur: true, niveau: 'simple', categorie: 'Maison', duree: '2 à 3 jours',
      accroche: 'Photographier ses biens pièce par pièce et sortir un inventaire chiffré en cas de sinistre.',
      cible: 'Locataires, propriétaires, personnes qui déménagent.',
      probleme: 'Après un cambriolage ou un dégât des eaux, l’assureur demande des preuves d’achat et de valeur que personne n’a rassemblées.',
      solution: 'Une app où l’on crée les pièces, ajoute chaque objet (photo, valeur, date d’achat, facture) et obtient un total par pièce et un PDF d’inventaire daté à transmettre à l’assureur.',
      pourquoi: 'Hausse des sinistres climatiques et des cambriolages ; les assureurs encouragent l’inventaire mais ne fournissent pas l’outil.',
      fonctionnalites: ['Pièces et objets avec photo, valeur, date, numéro de série, facture', 'Total par pièce et total général, valeur à neuf / vétusté simple', 'PDF d’inventaire horodaté', 'Export ZIP (PDF + photos + factures)', 'Mode hors ligne (PWA), synchronisation au retour du réseau'],
      ecrans: ['Connexion', 'Logement : pièces avec total', 'Pièce : grille de photos des objets', 'Objet : formulaire', 'Export (PDF, ZIP)'],
      donnees: ['logements(id, compte, nom, adresse)', 'pieces(id, logement, nom, ordre)', 'objets(id, piece, nom, categorie, valeur_cts, date_achat, numero_serie)', 'fichiers(id, objet, type, chemin, taille)'],
      api: ['CRUD /api/logements, /api/pieces, /api/objets', 'POST /api/objets/:id/fichiers (photo, facture)', 'GET /api/logements/:id/inventaire.pdf', 'GET /api/logements/:id/export.zip'],
      roles: 'utilisateur, admin.',
      stack: STACK.concat(['PDF : pdfkit côté serveur']), kits: KITS_BASE.concat(['socle-pwa']),
      services: ['Stockage objet S3 (Scaleway, OVHcloud) pour les photos', 'Aucun service payant obligatoire'],
      etapes: ['Compresser les photos côté navigateur (1600 px max) avant l’envoi', 'Chiffrer le stockage des photos (option du fournisseur S3)'],
      monetisation: { modele: 'Achat unique ou partenariat', prix: 'Gratuit jusqu’à 30 objets ; 4,99 € à vie pour objets illimités et export PDF', objectif: '≈ 8 000 €/an' },
      couts: '≈ 10 €/mois',
      risques: ['Données sensibles (adresse + liste d’objets de valeur) : chiffrement et double authentification conseillée', 'Usage ponctuel : relance annuelle « mettez à jour votre inventaire »'],
      mvp: 'Pièces, objets avec une photo, total, PDF.',
      evolutions: ['Reconnaissance de l’objet sur la photo par l’IA (nom, catégorie, prix estimé)', 'Rappel des fins de garantie']
    },
    {
      id: 'garanties-factures', titre: 'Coffre à garanties et factures', icone: 'mdi-shield-check-outline', serveur: true, niveau: 'simple', categorie: 'Argent', duree: '2 à 4 jours',
      accroche: 'Envoyer une facture par photo ou par e-mail, et être prévenu avant la fin de la garantie.',
      cible: 'Ménages, étudiants, tous ceux qui achètent de l’électroménager ou du high-tech.',
      probleme: 'La garantie légale de 2 ans s’applique, mais la facture est introuvable le jour où l’appareil tombe en panne.',
      solution: 'Chaque utilisateur reçoit une adresse e-mail personnelle (ex. factures+abc@domaine) : il y transfère ses factures. L’app range le fichier, lit la date et le montant (saisie assistée), calcule la fin de garantie et envoie un rappel 1 mois avant.',
      pourquoi: 'Indice de réparabilité, garantie légale prolongée de 6 mois en cas de réparation : garder ses factures rapporte.',
      fonctionnalites: ['Ajout par photo, PDF ou transfert d’e-mail', 'Date d’achat, magasin, montant, durée de garantie (légale + commerciale)', 'Rappel avant la fin de garantie', 'Recherche plein texte', 'Lettre type de mise en jeu de la garantie légale (générée en PDF)'],
      ecrans: ['Connexion', 'Mes achats : liste triée par fin de garantie', 'Ajouter (photo, fichier)', 'Fiche achat', 'Lettre de réclamation', 'Mon adresse de transfert'],
      donnees: ['achats(id, compte, produit, magasin, date_achat, montant_cts, garantie_mois, fin_garantie, rappel_envoye_le)', 'fichiers(id, achat, chemin, type, texte_extrait)', 'adresses_entree(id, compte, alias)'],
      api: ['CRUD /api/achats', 'POST /api/achats/:id/fichiers', 'POST /api/entrant : webhook e-mail entrant (signature du fournisseur)', 'GET /api/achats/:id/lettre.pdf', 'Tâche quotidienne : rappels'],
      roles: 'utilisateur, admin.',
      stack: STACK, kits: KITS_BASE.concat(['socle-pwa']),
      services: ['E-mail entrant : Postmark Inbound, Brevo Inbound Parsing ou Mailgun Routes', 'Brevo : rappels'],
      etapes: ['Configurer le domaine e-mail (MX du fournisseur entrant, SPF, DKIM)', 'Vérifier la signature du webhook entrant ; refuser les pièces jointes non PDF/image et > 10 Mo'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit jusqu’à 20 achats, 1,99 €/mois au-delà', objectif: '500 abonnés = 12 000 €/an' },
      couts: '≈ 12 €/mois',
      risques: ['Pièces jointes malveillantes : jamais exécutées, servies en téléchargement avec le bon type', 'Saisie manuelle de la date si la lecture échoue'],
      mvp: 'Ajout par fichier, saisie de la date et de la durée, rappel e-mail.',
      evolutions: ['Lecture automatique de la facture par l’IA', 'Extension navigateur qui capte les confirmations de commande']
    },
    {
      id: 'frais-colocation', titre: 'Comptes de colocation', icone: 'mdi-account-group-outline', serveur: true, niveau: 'simple', categorie: 'Argent', duree: '2 à 3 jours',
      accroche: 'Qui doit combien à qui : les dépenses communes partagées et soldées en un minimum de virements.',
      cible: 'Colocations, couples, groupes d’amis en voyage ou en week-end.',
      probleme: 'Les tableurs partagés se perdent, on ne sait plus qui a payé les courses et les remboursements créent des tensions.',
      solution: 'Un groupe, des membres invités par lien, des dépenses avec répartition (égale, parts, montants) ; l’app calcule les soldes et propose le plus petit nombre de virements, avec lien de paiement (IBAN ou Lydia/Wero).',
      pourquoi: 'Wero (paiement entre particuliers européen) se généralise : un lien de paiement direct simplifie le remboursement.',
      fonctionnalites: ['Groupes et invitations par lien', 'Dépenses : payeur, montant, répartition, catégorie, photo du ticket', 'Dépenses récurrentes (loyer, internet)', 'Soldes et règlement optimisé', 'Marquer un remboursement comme fait', 'Export CSV'],
      ecrans: ['Mes groupes', 'Groupe : fil des dépenses + soldes', 'Ajouter une dépense', 'Équilibrer', 'Membres et invitation', 'Statistiques par catégorie'],
      donnees: ['groupes(id, nom, devise, cree_par)', 'membres(id, groupe, compte, nom_affiche, iban_chiffre)', 'depenses(id, groupe, payeur, montant_cts, libelle, categorie, date, recurrence)', 'parts(id, depense, membre, montant_cts)', 'remboursements(id, groupe, de, a, montant_cts, fait_le)'],
      api: ['CRUD /api/groupes, /api/depenses', 'POST /api/groupes/:id/invitation (jeton)', 'GET /api/groupes/:id/soldes', 'GET /api/groupes/:id/reglement : virements minimaux', 'POST /api/remboursements'],
      roles: 'membre du groupe (tous égaux), admin.',
      stack: STACK, kits: KITS_BASE.concat(['socle-pwa']),
      services: ['Aucun service payant'],
      etapes: ['Montants en centimes entiers partout, arrondi réparti sur le dernier membre'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit ; 2,49 €/mois pour dépenses récurrentes, photos et export', objectif: 'Volume + bouche-à-oreille' },
      couts: '≈ 8 €/mois',
      risques: ['Marché occupé (Tricount, Splitwise) : viser un public précis (colocations) avec loyer et charges récurrents'],
      mvp: 'Groupe, dépenses égales, soldes, règlement.',
      evolutions: ['Lecture du ticket par l’IA', 'Inventaire des courses communes']
    },
    {
      id: 'chasse-abonnements', titre: 'Chasseur d’abonnements', icone: 'mdi-cash-remove', serveur: true, niveau: 'simple', categorie: 'Argent', duree: '3 jours',
      accroche: 'Lister ses abonnements, voir le total annuel et être prévenu avant chaque renouvellement.',
      cible: 'Tout le monde : streaming, musique, box, téléphone, salle de sport.',
      probleme: 'Streaming, applis, salles de sport : les abonnements s’accumulent et se renouvellent sans qu’on y pense.',
      solution: 'L’utilisateur ajoute ses abonnements (catalogue de services connus pré-rempli) ou importe un relevé bancaire CSV ; l’app détecte les prélèvements récurrents, calcule le coût mensuel et annuel, rappelle avant chaque échéance et génère la lettre de résiliation.',
      pourquoi: 'Loi « résiliation en trois clics » (2023) : le bouton de résiliation est obligatoire, l’app peut y renvoyer directement.',
      fonctionnalites: ['Catalogue des services connus (prix, lien de résiliation)', 'Import CSV de relevé : détection des montants récurrents', 'Total mensuel/annuel, graphique par catégorie', 'Rappel avant renouvellement et fin d’essai gratuit', 'Lettre de résiliation PDF ou lien direct'],
      ecrans: ['Tableau de bord (total, prochains prélèvements)', 'Abonnements', 'Ajouter (catalogue)', 'Importer un relevé', 'Résilier'],
      donnees: ['services(id, nom, categorie, prix_type_cts, lien_resiliation)', 'abonnements(id, compte, service, libelle, montant_cts, periodicite, prochaine_echeance, essai_fin)', 'imports(id, compte, cree_le, lignes)'],
      api: ['CRUD /api/abonnements', 'GET /api/services?q=', 'POST /api/imports (CSV analysé côté serveur, fichier non gardé)', 'GET /api/abonnements/:id/lettre.pdf', 'Tâche quotidienne : rappels'],
      roles: 'utilisateur, admin (catalogue).',
      stack: STACK, kits: KITS_BASE.concat(['socle-pwa']),
      services: ['Brevo : rappels'],
      etapes: ['Remplir le catalogue avec 100 services courants (script de migration)', 'Ne jamais conserver le relevé bancaire importé, seulement les abonnements détectés'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit jusqu’à 5 abonnements, 1,99 €/mois ; affiliation vers offres moins chères', objectif: '≈ 10 000 €/an' },
      couts: '≈ 8 €/mois',
      risques: ['L’agrégation bancaire automatique demande un agrément (DSP2) : rester sur l’import CSV ou passer par un agrégateur (Bridge, Powens)'],
      mvp: 'Saisie manuelle avec catalogue, total, rappels.',
      evolutions: ['Connexion bancaire via un agrégateur agréé', 'Comparateur box/mobile']
    },
    {
      id: 'carnet-animaux', titre: 'Carnet de santé des animaux', icone: 'mdi-paw', serveur: true, niveau: 'simple', categorie: 'Animaux', duree: '2 à 3 jours',
      accroche: 'Vaccins, vermifuges, poids et rendez-vous vétérinaires de chaque animal, avec rappels.',
      cible: 'Propriétaires de chiens, chats et NAC (plus d’un foyer sur deux a un animal en France).',
      probleme: 'Le carnet papier est chez le vétérinaire ou perdu, on oublie le rappel de vaccin et le vermifuge.',
      solution: 'Une fiche par animal avec traitements récurrents, vaccins, courbe de poids, documents (ordonnances), rappels automatiques, et un partage temporaire à la pension ou au pet-sitter.',
      pourquoi: 'Dépenses vétérinaires en hausse, assurances animaux en plein essor : historique utile pour les remboursements.',
      fonctionnalites: ['Animaux (espèce, race, naissance, identification)', 'Vaccins et traitements avec périodicité', 'Rappels e-mail / notification', 'Courbe de poids', 'Documents (ordonnances, factures)', 'Fiche à partager (gardien, pension) avec date d’expiration'],
      ecrans: ['Mes animaux', 'Fiche animal', 'Ajouter un soin', 'Poids', 'Documents', 'Partage'],
      donnees: ['animaux(id, compte, nom, espece, race, naissance, puce)', 'soins(id, animal, type, produit, date, prochain_le)', 'pesees(id, animal, date, poids_g)', 'documents(id, animal, chemin, type)', 'partages(id, animal, jeton, expire_le)'],
      api: ['CRUD /api/animaux, /api/soins, /api/pesees', 'POST /api/animaux/:id/documents', 'POST /api/animaux/:id/partage', 'GET /a/:jeton', 'Tâche quotidienne : rappels'],
      roles: 'propriétaire, admin.',
      stack: STACK, kits: KITS_BASE.concat(['socle-pwa', 'charte-base']),
      services: ['Brevo : rappels', 'Notifications web push'],
      etapes: ['Préremplir les protocoles courants (vaccins chien/chat, vermifuge trimestriel)'],
      monetisation: { modele: 'Freemium + affiliation', prix: 'Gratuit 1 animal, 1,99 €/mois illimité ; affiliation assurance animaux', objectif: '≈ 10 000 €/an' },
      couts: '≈ 8 €/mois',
      risques: ['Ne pas donner de conseil médical : l’app rappelle, le vétérinaire prescrit'],
      mvp: 'Animaux, soins avec rappel, poids.',
      evolutions: ['Partage du carnet entre membres de la famille', 'Chatières connectées']
    },
    {
      id: 'repas-courses', titre: 'Menus de la semaine et liste de courses', icone: 'mdi-food-variant', serveur: true, niveau: 'intermediaire', categorie: 'Cuisine', duree: '1 semaine',
      accroche: 'Choisir ses menus en 5 minutes le dimanche et obtenir la liste de courses rangée par rayon.',
      cible: 'Familles, couples actifs, étudiants.',
      probleme: 'La question « on mange quoi ? » chaque soir, le gaspillage et les courses en plusieurs fois.',
      solution: 'Une bibliothèque de recettes (les siennes + suggestions), un planning de la semaine glissé-déposé, une liste de courses consolidée (quantités additionnées, rayons) partagée en direct avec le foyer, et des suggestions par l’IA selon le frigo et le budget.',
      pourquoi: 'Inflation alimentaire, lutte anti-gaspillage, et l’IA rend les suggestions personnalisées crédibles.',
      fonctionnalites: ['Recettes : ingrédients, étapes, portions, temps, photo', 'Import d’une recette depuis une adresse web (lecture des données structurées schema.org)', 'Planning semaine (midi/soir)', 'Liste de courses consolidée par rayon, cochable à plusieurs en direct', 'Ajustement des portions', 'Suggestions IA : « avec ce qu’il reste dans le frigo »', 'Foyer partagé'],
      ecrans: ['Semaine', 'Recettes', 'Fiche recette', 'Importer une recette', 'Liste de courses (mode magasin)', 'Frigo et suggestions', 'Foyer'],
      donnees: ['foyers(id, nom)', 'membres(id, foyer, compte)', 'recettes(id, foyer, titre, portions, temps_min, etapes text[], source_url, photo)', 'ingredients(id, recette, nom, quantite, unite, rayon)', 'planning(id, foyer, date, moment, recette, portions)', 'courses(id, foyer, nom, quantite, unite, rayon, coche, ajoute_par)'],
      api: ['CRUD /api/recettes', 'POST /api/recettes/import {url}', 'PUT /api/planning/:semaine', 'POST /api/courses/generer?semaine=', 'GET /api/courses/flux (SSE)', 'POST /api/suggestions {frigo, budget}'],
      roles: 'membre du foyer, admin.',
      stack: STACK.concat(['API Claude : suggestions et normalisation des ingrédients']), kits: KITS_BASE.concat(['socle-pwa', 'charte-base']),
      services: ['API Claude (suggestions) : quelques centimes par semaine et par foyer'],
      etapes: ['Limiter l’import d’URL (pas d’adresses internes : protection SSRF)', 'Table de conversion d’unités et d’ingrédients usuels'],
      monetisation: { modele: 'Freemium', prix: 'Gratuit (recettes + liste), 3,99 €/mois pour IA et foyer partagé', objectif: '400 abonnés = ≈ 19 000 €/an' },
      couts: '≈ 12 €/mois + IA',
      risques: ['Marché grand public difficile : viser un créneau (batch cooking, petits budgets, régimes)'],
      mvp: 'Recettes, planning, liste de courses consolidée.',
      evolutions: ['Envoi du panier au drive', 'Calcul du coût des repas']
    },
    {
      id: 'prix-carburants', titre: 'Alerte prix des carburants', icone: 'mdi-gas-station-outline', serveur: true, niveau: 'intermediaire', categorie: 'Auto', duree: '4 à 5 jours',
      accroche: 'La station la moins chère sur mon trajet, et une alerte quand le prix passe sous mon seuil.',
      cible: 'Tous les automobilistes, surtout ceux qui roulent beaucoup.',
      probleme: 'Les écarts de prix entre stations proches dépassent souvent 15 centimes par litre, mais personne ne compare avant de faire le plein.',
      solution: 'L’app télécharge le flux officiel des prix (données ouvertes, mises à jour toutes les 10 minutes), garde l’historique, affiche les stations autour de soi ou le long d’un trajet, et envoie une alerte quand une station favorite passe sous un seuil.',
      pourquoi: 'Données publiques gratuites et fraîches (flux instantané des prix des carburants sur data.economie.gouv.fr), prix volatils.',
      fonctionnalites: ['Carte et liste des stations proches, triées par prix', 'Filtre carburant (SP95-E10, Gazole, E85, GPL…)', 'Le long d’un trajet (détour maximal)', 'Stations favorites et seuils d’alerte', 'Historique et tendance par station', 'Économie estimée sur un plein'],
      ecrans: ['Autour de moi (carte + liste)', 'Fiche station (prix, historique, services, horaires)', 'Trajet', 'Mes alertes', 'Mon véhicule (carburant, réservoir)'],
      donnees: ['stations(id, adresse, ville, cp, lat, lon, services text[], horaires jsonb)', 'prix(id, station, carburant, prix_milli, maj_le)', 'historique_prix(station, carburant, jour, min, max)', 'alertes(id, compte, station, carburant, seuil_milli, derniere_le)'],
      api: ['Tâche toutes les 10 min : import du flux (XML ou JSON) et mise à jour', 'GET /api/stations?lat=&lon=&rayon=&carburant=', 'GET /api/stations/:id/historique', 'POST /api/trajet {depart, arrivee}', 'CRUD /api/alertes'],
      roles: 'visiteur, utilisateur (alertes), admin.',
      stack: STACK.concat(['PostGIS (recherche par distance)', 'Carte : Leaflet + OpenStreetMap']), kits: KITS_BASE.concat(['socle-pwa', 'bases-donnees']),
      services: ['Flux officiel des prix des carburants (gratuit, licence ouverte)', 'Itinéraire : Géoplateforme IGN ou OSRM', 'Notifications web push'],
      etapes: ['Activer PostGIS', 'Import idempotent et rapide (≈ 10 000 stations) : COPY dans une table temporaire puis fusion', 'Agréger l’historique par jour pour limiter la taille de la base', 'Citer la source des données (licence ouverte Etalab)'],
      monetisation: { modele: 'Publicité discrète + premium', prix: 'Gratuit avec publicité, 0,99 €/mois sans publicité et avec alertes illimitées', objectif: '≈ 12 000 €/an' },
      couts: '≈ 15 €/mois',
      risques: ['Applications concurrentes existantes : se différencier par le trajet et les alertes', 'Format du flux qui change : surveiller l’import et alerter en cas d’échec'],
      mvp: 'Import du flux, stations proches triées par prix, fiche station.',
      evolutions: ['Bornes de recharge électrique (données ouvertes IRVE)', 'Carnet de pleins et consommation réelle du véhicule']
    },
    {
      id: 'suivi-candidatures', titre: 'Suivi des candidatures', icone: 'mdi-briefcase-search-outline', serveur: true, niveau: 'simple', categorie: 'Emploi', duree: '2 à 3 jours',
      accroche: 'Un tableau Kanban de ses candidatures, avec relances et lettres adaptées par l’IA.',
      cible: 'Demandeurs d’emploi, étudiants en recherche de stage ou d’alternance, freelances.',
      probleme: 'On postule à 30 offres, on ne sait plus qui relancer, et chaque lettre prend une heure.',
      solution: 'Chaque candidature est une carte (à envoyer, envoyée, entretien, offre, refus) avec l’annonce, le contact, les dates et les documents ; l’app rappelle de relancer après 7 jours et propose une lettre adaptée à l’annonce à partir du CV.',
      pourquoi: 'Marché de l’alternance très actif, recherche d’emploi plus longue ; l’IA aide à personnaliser vite.',
      fonctionnalites: ['Tableau Kanban glisser-déposer', 'Ajout depuis une adresse d’annonce (titre, entreprise récupérés)', 'Contacts et notes d’entretien', 'Rappels de relance', 'Lettre de motivation et e-mail de relance proposés par l’IA', 'Statistiques (taux de réponse)'],
      ecrans: ['Tableau', 'Fiche candidature', 'Mon CV (texte)', 'Générer une lettre', 'Statistiques'],
      donnees: ['candidatures(id, compte, entreprise, poste, url, statut, envoyee_le, relance_le, notes)', 'contacts(id, candidature, nom, email, role)', 'documents(id, compte, type, contenu)', 'evenements(id, candidature, type, date, notes)'],
      api: ['CRUD /api/candidatures', 'POST /api/candidatures/depuis-url', 'POST /api/candidatures/:id/lettre', 'Tâche quotidienne : rappels de relance'],
      roles: 'utilisateur, admin.',
      stack: STACK.concat(['API Claude (lettres)']), kits: KITS_BASE.concat(['socle-pwa']),
      services: ['API Claude : ≈ 0,01 € par lettre', 'Brevo : rappels'],
      etapes: ['Protection SSRF sur la lecture d’URL', 'Limiter les générations IA par compte et par jour'],
      monetisation: { modele: 'Freemium / partenariat', prix: 'Gratuit ; 4,99 €/mois pour les lettres IA, sans engagement', objectif: '≈ 10 000 €/an' },
      couts: '≈ 10 €/mois + IA',
      risques: ['Usage court (quelques mois) : prix mensuel sans engagement'],
      mvp: 'Kanban, fiches, rappels.',
      evolutions: ['Import d’offres France Travail (API)', 'Préparation d’entretien par l’IA']
    },
    {
      id: 'album-evenement', titre: 'Album photo partagé par QR code', icone: 'mdi-image-multiple-outline', serveur: true, niveau: 'intermediaire', categorie: 'Événements', duree: '4 à 6 jours',
      accroche: 'Les invités d’un mariage scannent un QR code et déposent leurs photos dans un album commun, sans appli à installer.',
      cible: 'Mariés, familles (anniversaires, baptêmes), groupes d’amis, voyages.',
      probleme: 'Les photos des invités restent dans leurs téléphones ou se perdent dans des groupes de messagerie compressés.',
      solution: 'L’organisateur crée un événement, imprime le QR code sur les tables ; les invités envoient leurs photos et vidéos en qualité originale depuis le navigateur ; un diaporama en direct peut tourner sur un écran ; l’album complet se télécharge en ZIP.',
      pourquoi: 'Habitude du QR, qualité photo des téléphones, et forte demande pour les mariages (≈ 240 000 par an en France).',
      fonctionnalites: ['Événement avec code ou QR, nom d’invité facultatif', 'Envoi multiple en qualité originale (reprise si coupure)', 'Diaporama en direct (écran ou vidéoprojecteur)', 'Modération par l’organisateur', 'Téléchargement de l’album complet (ZIP)', 'Livre d’or (messages)', 'Album privé, expiration après X mois'],
      ecrans: ['Page invité : envoyer', 'Galerie', 'Diaporama plein écran', 'Organisateur : événement, QR à imprimer', 'Modération', 'Téléchargement'],
      donnees: ['evenements(id, compte, titre, date, slug, code, expire_le, offre)', 'medias(id, evenement, invite_nom, chemin, type, taille, largeur, hauteur, masque)', 'messages(id, evenement, auteur, texte)'],
      api: ['POST /api/e/:slug/upload-url : URL d’envoi direct présignée S3', 'POST /api/e/:slug/medias : enregistre après envoi', 'GET /api/e/:slug/medias?apres= (galerie, diaporama)', 'PATCH /api/medias/:id (masquer)', 'POST /api/evenements/:id/export : ZIP en tâche de fond'],
      roles: 'invité (code), organisateur, admin.',
      stack: STACK.concat(['Envoi direct vers S3 (URL présignées)', 'Vignettes : sharp']), kits: KITS_BASE.concat(['socle-pwa', 'charte-base']),
      services: ['Stockage objet S3 (Scaleway, Cloudflare R2 sans frais de sortie)', 'Stripe : paiement de l’événement'],
      etapes: ['Créer le bucket et ses règles CORS (envoi depuis le navigateur)', 'Limiter la taille (photo 25 Mo, vidéo 500 Mo) et le nombre par invité', 'Supprimer automatiquement les fichiers à l’expiration'],
      monetisation: { modele: 'Paiement par événement', prix: '29 € (6 mois, 500 photos), 59 € (1 an, illimité + diaporama)', objectif: '800 événements/an = ≈ 30 000 €' },
      couts: '≈ 15 €/mois + stockage (≈ 1 à 2 € par mariage)',
      risques: ['Contenus inappropriés : modération et signalement', 'Pic d’envois le soir même : envois directs vers S3 (le serveur ne porte pas les fichiers)'],
      mvp: 'Événement, envoi de photos, galerie, ZIP.',
      evolutions: ['Sélection des meilleures photos par l’IA', 'Livre photo imprimé']
    },
    {
      id: 'tableau-energie', titre: 'Tableau de bord énergie de la maison', icone: 'mdi-flash-outline', serveur: true, niveau: 'intermediaire', categorie: 'Maison', duree: '1 semaine',
      accroche: 'Suivre sa consommation d’électricité, d’eau et de gaz, et savoir quel tarif ou quel geste fait vraiment économiser.',
      cible: 'Tous les foyers, en particulier avec pompe à chaleur, voiture électrique ou panneaux solaires.',
      probleme: 'Les factures arrivent trop tard pour corriger les habitudes ; on ne sait pas si l’option heures creuses ou Tempo est rentable.',
      solution: 'Saisie rapide des relevés de compteurs (ou import du fichier de consommation téléchargé depuis l’espace client), graphiques par jour et par mois, comparaison avec l’an dernier corrigée de la météo, simulateur de tarifs (base, heures creuses, Tempo) et alertes de surconsommation.',
      pourquoi: 'Prix de l’électricité élevés, nouvelles plages d’heures creuses, autoconsommation solaire en hausse.',
      fonctionnalites: ['Compteurs (électricité, gaz, eau, production solaire)', 'Relevés manuels avec rappel mensuel ; import CSV de la courbe de charge', 'Graphiques, comparaison année N-1, degrés-jours (météo)', 'Simulateur d’options tarifaires', 'Alertes (consommation anormale, fuite d’eau suspectée la nuit)', 'Objectifs et économies réalisées'],
      ecrans: ['Tableau de bord', 'Compteurs', 'Saisir un relevé', 'Importer un fichier', 'Comparer les tarifs', 'Alertes', 'Logement (surface, chauffage)'],
      donnees: ['logements(id, compte, surface, chauffage, code_postal)', 'compteurs(id, logement, type, unite, option_tarifaire)', 'releves(id, compteur, horodatage, valeur)', 'tarifs(id, fournisseur, option, plages jsonb, prix jsonb, valide_du)', 'meteo(code_postal, jour, temperature_moy)'],
      api: ['CRUD /api/compteurs, /api/releves', 'POST /api/compteurs/:id/import (CSV)', 'GET /api/conso?compteur=&pas=jour|mois', 'GET /api/simulation?compteur=', 'Tâche quotidienne : météo et alertes'],
      roles: 'utilisateur, admin (tarifs).',
      stack: STACK.concat(['Graphiques : Chart.js', 'Météo : API Open-Meteo (gratuite)']), kits: KITS_BASE.concat(['socle-pwa', 'bases-donnees']),
      services: ['Open-Meteo (gratuit)', 'Option : accès aux données de comptage via un partenaire agréé (consentement du client)'],
      etapes: ['Mettre à jour la table des tarifs réglementés à chaque changement (février, août)', 'Index sur (compteur, horodatage), agrégation par jour'],
      monetisation: { modele: 'Freemium + affiliation', prix: 'Gratuit, 2,99 €/mois pour simulateur et alertes ; affiliation vers fournisseurs ou installateurs', objectif: '≈ 15 000 €/an' },
      couts: '≈ 10 €/mois',
      risques: ['Accès automatique aux données des compteurs encadré : commencer par la saisie et l’import CSV'],
      mvp: 'Relevés manuels, graphiques, simulateur heures creuses.',
      evolutions: ['Module solaire (autoconsommation, revente)', 'Conseils d’économies personnalisés par l’IA']
    }
  ];

  /* ------------------------------------------------------------------ état */
  const ETAT_DEFAUT = () => ({ favoris: [], faites: [], ia: [], auto: false, derniereAuto: '' });
  V.etat = async () => Object.assign(ETAT_DEFAUT(), await AB.db.getMeta('veille', null) || {});
  V.garder = etat => AB.db.setMeta('veille', etat);

  /** Date du jour au format AAAA-MM-JJ (heure locale). */
  V.jour = function (d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const numeroJour = jour => Math.floor(Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10)) / 86400000);

  /** Ordre du catalogue mélangé une fois pour toutes (graine fixe), pour alterner les niveaux et les sujets. */
  const ORDRE = (function () {
    const ids = V.CATALOGUE.map(i => i.id);
    let graine = 20261023;
    const alea = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids;
  })();

  /** Toutes les idées : catalogue puis idées de l'IA. */
  V.toutes = etat => V.CATALOGUE.map(i => Object.assign({ source: 'catalogue' }, i)).concat((etat.ia || []).map(i => Object.assign({ source: 'ia' }, i)));
  V.trouver = (etat, id) => V.toutes(etat).find(i => i.id === id);

  /** Idée d'un jour : celle générée par l'IA ce jour-là, sinon celle du catalogue. */
  V.ideeDu = function (etat, jour) {
    const ia = (etat.ia || []).filter(i => i.jour === jour).pop();
    if (ia) return Object.assign({ source: 'ia' }, ia);
    const id = ORDRE[((numeroJour(jour) % ORDRE.length) + ORDRE.length) % ORDRE.length];
    return Object.assign({ source: 'catalogue' }, V.CATALOGUE.find(i => i.id === id));
  };

  /* ------------------------------------------------- étapes de mise en production */
  /** Étapes communes à toute app construite sur le kit App complète, avec les étapes propres à l'idée au bon endroit. */
  V.etapesProduction = function (idee) {
    const stores = [
      'Atelier › Apps mobiles : choisir le ZIP construit, diagnostic des règles des stores, icônes et écran de démarrage, projet Capacitor ; tester dans l’émulateur',
      'Comptes développeur : Apple (99 $/an) et Google Play (25 $ une fois) ; publicité (AdMob) ou achats intégrés si l’app en a',
      'Fiches des stores : nom, description, 5 captures, politique de confidentialité en ligne, questionnaire sur les données collectées',
      'Envoi en test (TestFlight, test interne Google Play) à 5 à 10 proches, corrections, puis publication'
    ];
    if (!idee.serveur) return [
      'Atelier › Veille › « Créer cette app » : le prompt du kit Socle PWA est rempli ; ajouter dans Prompt et pack les kits listés ci-dessus',
      'Dans Claude : coller le prompt, joindre le pack ; demander d’abord la version minimale (voir « Version minimale »)',
      'Atelier › Mes apps › Importer le ZIP livré, puis Aperçu (ordinateur, iPhone, iPad) et Audit sécurité'
    ].concat(idee.etapes || []).concat([
      'En local : node outils/verifier-pwa.js (doit afficher « Conforme »), essai hors ligne (mode avion)',
      'Mise en ligne gratuite : Netlify, Cloudflare Pages ou GitHub Pages (glisser le dossier ou relier le dépôt) ; nom de domaine en option',
      'Mentions légales, politique de confidentialité et bandeau cookies si publicité ou mesure d’audience (kit Affichage France)'
    ]).concat(stores);
    return [
      'Atelier › Veille › « Créer cette app » : le prompt du kit App complète est rempli ; ajouter dans Prompt et pack les kits listés ci-dessus',
      'Dans Claude : coller le prompt, joindre le pack ; demander d’abord la version minimale (voir « Version minimale »)',
      'Atelier › Mes apps › Importer le ZIP livré ; vérifier la base (onglet Base de données) et lancer l’audit de sécurité',
      'En local : npm install, copier .env.example en .env, node outils/verifier-app.js puis node outils/recette-app.js (doit afficher « Conforme »)',
      'Créer la base PostgreSQL managée et le service web chez l’hébergeur (Render, Railway, Scalingo ou Clever Cloud, région UE), relier le dépôt Git',
      'Renseigner les variables d’environnement (DATABASE_URL, SESSION_SECRET, ORIGINES avec capacitor://localhost, ADMIN_API_KEY, clés des services) ; les migrations s’appliquent au démarrage'
    ].concat(idee.etapes || []).concat([
      'Nom de domaine + HTTPS (certificat automatique de l’hébergeur), puis audit de sécurité sur l’adresse en ligne',
      'Se connecter avec admin / adminadmin et changer le mot de passe tout de suite ; brancher l’onglet Gestion de l’Atelier (adresse + clé)',
      'Mentions légales, politique de confidentialité, CGU/CGV, bandeau cookies (kit Affichage France) ; suppression de compte depuis l’app (exigée par les stores)',
      'Sauvegardes quotidiennes de la base activées et restauration testée une fois'
    ]).concat(stores);
  };

  /* ----------------------------------------------------------- textes de sortie */
  const liste = t => (t || []).map(x => `- ${x}`).join('\n');
  const nomKit = id => { const k = AB.kits && AB.kits.derniers().find(x => x.id === id); return k ? `${k.nom} (${id})` : id; };

  /** Fiche complète en Markdown. */
  V.versMarkdown = function (i) {
    const m = i.monetisation || {};
    return `# ${i.titre}

> ${i.accroche}

Niveau : ${(V.NIVEAUX[i.niveau] || {}).label || i.niveau} · ${i.serveur ? 'Avec serveur' : 'Sans serveur (tout sur l’appareil)'} · Catégorie : ${i.categorie || '—'} · Durée estimée : ${i.duree || '—'}${i.source === 'ia' ? ' · Générée par l’IA' : ''}

## Pour qui
${i.cible || ''}

## Le problème
${i.probleme || ''}

## La solution
${i.solution || ''}

## Pourquoi maintenant
${i.pourquoi || ''}

## Fonctionnalités
${liste(i.fonctionnalites)}

## Écrans
${liste(i.ecrans)}

## Données ${i.serveur ? '(tables)' : '(sur l’appareil)'}
${liste(i.donnees)}

## API et sources de données
${liste(i.api)}

## Rôles
${i.roles || ''}

## Stack technique
${liste(i.stack)}

## Kits de l’Atelier
${liste((i.kits || []).map(nomKit))}

## Services externes
${liste(i.services)}

## Mise en production
${V.etapesProduction(i).map((e, n) => `${n + 1}. ${e}`).join('\n')}

## Monétisation
- Modèle : ${m.modele || '—'}
- Prix : ${m.prix || '—'}
- Objectif : ${m.objectif || '—'}
- Coûts de fonctionnement : ${i.couts || '—'}

## Risques et parades
${liste(i.risques)}

## Version minimale (à sortir d’abord)
${i.mvp || ''}

## Évolutions
${liste(i.evolutions)}
`;
  };

  /** Consigne métier pour le prompt « Nouvelle app » du kit App complète. */
  V.consigne = function (i) {
    const j = l => (l || []).join(' ; ');
    return [i.solution || i.accroche, ['Utilisateurs', i.cible], ['Fonctionnalités de la première version', i.mvp], ['Fonctionnalités prévues', j(i.fonctionnalites)],
      ['Écrans', j(i.ecrans)], ['Données', j(i.donnees)], ['API', j(i.api)], ['Services externes', j(i.services)], ['Points d’attention', j(i.risques)]]
      .map(x => Array.isArray(x) ? (x[1] ? `${x[0]} : ${x[1]}` : '') : x || '').filter(Boolean).join('\n');
  };

  /** Pré-remplit « Créer une app › Nouvelle app » avec l'idée, puis y va. */
  V.creerApp = async function (i) {
    const id = i.serveur ? 'app-complete' : 'socle-pwa';
    const kit = AB.kits.derniers().find(k => k.id === id);
    const valeurs = i.serveur
      ? { 'nom de l\'application': i.titre, code: U.slug(i.titre), consigne: V.consigne(i), 'rôles': i.roles || '' }
      : { 'nom de l\'app': i.titre, 'décris en 3 à 6 lignes le besoin.': V.consigne(i) };
    const brouillon = await AB.db.getMeta('brouillonNouvelleApp', null) || {};
    // identite.auto : la page propose tout de suite des noms et des logos (avec Claude s'il est joignable)
    await AB.db.setMeta('brouillonNouvelleApp', { kit: kit ? kit.id : brouillon.kit, version: kit ? kit.version : brouillon.version, valeurs, identite: { auto: true } });
    AB.app.go('creer/prompt');
  };

  /* -------------------------------------------------------------- génération IA */
  const CLES = ['titre', 'accroche', 'niveau', 'serveur', 'categorie', 'icone', 'duree', 'cible', 'probleme', 'solution', 'pourquoi', 'fonctionnalites', 'ecrans', 'donnees', 'api', 'roles', 'stack', 'kits', 'services', 'etapes', 'monetisation', 'couts', 'risques', 'mvp', 'evolutions'];

  V.systeme = function (etat, consigne) {
    const kits = (AB.kits ? AB.kits.derniers() : []).map(k => `${k.id} : ${k.nom}`).join('\n');
    const deja = V.toutes(etat).map(i => i.titre).join(' ; ');
    return `Tu fais de la veille technologique pour un créateur d'apps français qui met en production vite.
Propose UNE idée d'app GRAND PUBLIC (pour tout le monde, comme une calculatrice, une météo, un suivi d'habitudes), réalisable et rentable, différente de celles-ci : ${deja}.
Ne cible jamais un type d'entreprise ou de profession (pas de B2B, pas d'app pour commerçants, artisans, associations, PME).
${consigne ? `Contrainte de l'utilisateur : ${consigne}\n` : ''}Elle doit s'appuyer sur un besoin réel du quotidien en France aujourd'hui (tendance, capteurs du téléphone, données ouvertes, IA…), être publiable sur l'App Store et Google Play, et se construire avec les kits de l'Atelier :
- sans serveur ("serveur": false, préféré quand c'est possible) : kit Socle PWA, données sur l'appareil, API publiques appelées directement ;
- avec serveur ("serveur": true, si comptes, partage, clé d'API secrète ou IA) : kit App complète (Node.js + PostgreSQL).
Kits disponibles (id : nom) :
${kits}

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, avec exactement ces clés :
{
  "titre": "…", "accroche": "une phrase",
  "niveau": "simple" | "intermediaire" | "avance", "serveur": true | false,
  "categorie": "…", "icone": "mdi-…", "duree": "ex. 1 semaine",
  "cible": "…", "probleme": "…", "solution": "…", "pourquoi": "pourquoi maintenant",
  "fonctionnalites": ["…"], "ecrans": ["Nom : contenu"],
  "donnees": ["table(colonne…) ou stockage sur l'appareil"], "api": ["MÉTHODE /api/… ou API publique : rôle"],
  "roles": "…", "stack": ["…"], "kits": ["id de kit"], "services": ["service : usage et coût"],
  "etapes": ["étapes de mise en production propres à cette app"],
  "monetisation": { "modele": "publicité, achat unique, abonnement…", "prix": "…", "objectif": "…" },
  "couts": "coût mensuel estimé", "risques": ["risque : parade"],
  "mvp": "la version minimale à sortir d'abord", "evolutions": ["…"]
}
Sois concret et exact (noms de services, prix approximatifs, obligations légales réelles). Textes en français.`;
  };

  /** Nettoie une proposition de l'IA en fiche. */
  V.normaliser = function (prop, jour) {
    const i = {};
    CLES.forEach(c => { i[c] = prop[c] == null ? '' : prop[c]; });
    ['fonctionnalites', 'ecrans', 'donnees', 'api', 'stack', 'kits', 'services', 'etapes', 'risques', 'evolutions'].forEach(c => {
      i[c] = (Array.isArray(i[c]) ? i[c] : i[c] ? [i[c]] : []).map(x => typeof x === 'string' ? x : JSON.stringify(x));
    });
    if (!i.titre) throw new Error('La réponse n’a pas de titre.');
    if (!V.NIVEAUX[i.niveau]) i.niveau = 'intermediaire';
    i.serveur = i.serveur === true || i.serveur === 'true';
    if (!/^mdi-[\w-]+$/.test(i.icone || '')) i.icone = 'mdi-lightbulb-on-outline';
    i.monetisation = Object.assign({ modele: '', prix: '', objectif: '' }, typeof i.monetisation === 'object' && i.monetisation ? i.monetisation : {});
    i.kits = i.kits.filter(k => /^[\w-]+$/.test(k));
    i.id = 'ia-' + U.slug(i.titre).slice(0, 40) + '-' + U.uuid().slice(0, 4);
    i.jour = jour || V.jour();
    i.cree = U.now();
    return i;
  };

  /** Demande une idée au serveur local. */
  V.generer = async function (etat, consigne) {
    const base = await AB.ia.adresse();
    const r = await fetch(base + '/api/ia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systeme: V.systeme(etat, consigne), message: 'Propose l’idée d’app du ' + V.jour() + '.' })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.erreur || `Le serveur local a répondu ${r.status}.`);
    return V.normaliser(AB.ia.lireReponse(data.texte));
  };
})();
