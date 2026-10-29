# Legumly 1.0.0

> Votre quotidien, en plus simple.

App mobile (PWA) pour jardiniers amateurs, balcons et jardins partagés : calendrier du mois par zone, fiches de
80 légumes et aromates, plan de ses bacs, rappels de repiquage et de récolte, alerte gel et journal des récoltes.

HTML, CSS et JavaScript **vanilla**, sur le kit « Socle PWA » 2.0 de l'Atelier de Blocs : sans framework, sans build,
sans dépendance. L'app est **100 % statique** : pas de serveur à elle, pas de compte. Les données de l'utilisateur
restent sur son téléphone (IndexedDB).

## Lancer en local

Le service worker ne fonctionne pas en `file://` : il faut un petit serveur.

```bash
node outils/servir.js . 8080      # outil du kit Socle PWA, puis http://localhost:8080
# ou : python3 -m http.server 8080
```

Sur un téléphone : même réseau Wi-Fi, adresse IP de l'ordinateur (`http://192.168.x.x:8080`). L'installation sur
l'écran d'accueil et le service worker demandent du **https** (sauf `localhost`).

## Déployer

Copier **tout le dossier tel quel** sur un hébergement statique en https : Netlify, Vercel, GitHub Pages, Cloudflare
Pages, OVH… Aucun réglage serveur n'est nécessaire. Le fichier `README.md` peut rester, il n'est pas chargé par l'app.

Conseillé chez l'hébergeur : `Cache-Control: no-cache` sur `sw.js` (la plupart des hébergeurs le font déjà).

## Mettre à jour

1. Modifier les fichiers.
2. **Changer `VERSION` dans `sw.js`** (ex. `legumly-v1.0.1`), sinon les téléphones gardent l'ancienne app.
3. Si un fichier est ajouté, l'ajouter aussi à la liste `FICHIERS` de `sw.js` et dans `index.html`.
4. Mettre à jour `VERSION_APP` dans `ecran-reglages.js` (affichée dans Réglages).
5. Redéployer. Les utilisateurs voient la nouvelle version à la réouverture suivante de l'app.

Pour modifier la base des légumes, éditer `legumes.json` (ou le générateur `outils/generer-legumes.js` livré à
part, qui vérifie les voisins inconnus et complète les associations dans les deux sens).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Coquille : barre (retour, réglages), zone `#vue`, onglets, toast, CSP |
| `style.css` | Charte (variables) et composants |
| `app.js` | Socle : `appli.esc`, `appli.api`, `appli.toast`, `appli.badge`, routeur et onglets |
| `db.js` | `appli.db` : IndexedDB (bacs, plantations, journal, rappels faits, réglages), sauvegarde et restauration |
| `donnees.js` | Base des légumes, zones climatiques, dates, rappels, calculs du potager |
| `meteo.js` | `appli.meteo` : Open-Meteo (prévisions de gel, recherche de commune) |
| `ecran-mois.js` | Ce mois-ci (accueil) |
| `ecran-legumes.js` | Tous les légumes, fiche légume |
| `ecran-potager.js` | Mon potager, bac, formulaires de bac et de plantation |
| `ecran-rappels.js` | Rappels |
| `ecran-journal.js` | Journal des récoltes, formulaire de récolte |
| `ecran-reglages.js` | Commune, zone, seuil de gel, sauvegarde, effacement |
| `legumes.json` | 80 entrées (62 légumes, 18 aromates) |
| `sw.js`, `manifest.webmanifest`, `icone*.{svg,png}` | Hors ligne, installation, icônes |

## Écrans et adresses

| Écran | Adresse | Onglet |
| --- | --- | --- |
| Ce mois-ci | `#/mois/<1-12>` | Ce mois |
| Tous les légumes | `#/legumes` | — |
| Fiche légume | `#/fiche/<id>` | — |
| Mon potager | `#/potager` | Potager |
| Bac | `#/bac/<id>` ; formulaire `#/bac-modifier/<id ou nouveau>` | — |
| Plantation | `#/plantation/<id ou nouvelle>/<légume>/<bac>` | — |
| Rappels | `#/rappels` | Rappels |
| Journal | `#/journal/<année>` ; récolte `#/recolte/<id ou nouvelle>/<plantation>` | Journal |
| Réglages | `#/reglages` (roue dentée en haut à droite) | — |

## Variables

L'app n'a **ni variable d'environnement ni clé secrète** (aucun serveur, Open-Meteo sans clé). Les réglages se font
dans le code :

| Variable | Fichier | Valeur | Rôle |
| --- | --- | --- | --- |
| `VERSION` | `sw.js` | `legumly-v1.0.0` | Nom du cache : à changer à chaque livraison |
| `FICHIERS` | `sw.js` | liste | Fichiers disponibles hors ligne |
| `VERSION_APP` | `ecran-reglages.js` | `1.0.0` | Version affichée dans Réglages |
| `URL_PREVISIONS` | `meteo.js` | `https://api.open-meteo.com/v1/forecast` | Prévisions (minimales sur 7 jours) |
| `URL_COMMUNES` | `meteo.js` | `https://geocoding-api.open-meteo.com/v1/search` | Recherche de commune |
| `FRAICHEUR_MS` | `meteo.js` | 3 h | Délai avant de redemander la météo |
| `SEUIL_DEFAUT` | `meteo.js` | `2` °C | Seuil d'alerte gel par défaut (modifiable dans Réglages) |
| `ZONES` | `donnees.js` | 4 zones | Décalages du calendrier par zone (mois) |
| `connect-src` | `index.html` (CSP) | `'self'` + 2 domaines Open-Meteo | Domaines que l'app peut appeler |
| `--primaire`, `--primaire-fonce`, `--claire`, `--accent`, `--accent-fonce` | `style.css` | `#4D7C0F`, `#3F6212`, `#84CC16`, `#F97316`, `#C2410C` | Charte |
| `--fond`, `--texte`, `--carte`, `--bordure`, `--doux` | `style.css` | | Fonds et textes |
| `--c-abri`, `--c-terre`, `--c-plant`, `--c-recolte` | `style.css` | | Couleurs du calendrier |
| `theme_color`, `background_color` | `manifest.webmanifest` | `#4D7C0F`, `#f7f8f2` | Couleurs à l'installation |

Les boutons utilisent `--primaire` (contraste 5:1 avec le blanc) : l'orange `--accent` (2,8:1 sur blanc) sert aux
bordures et pastilles, jamais à un texte blanc.

## Données et confidentialité

- Tout est stocké sur le téléphone (IndexedDB `legumly`) ; rien dans `localStorage`, rien envoyé à un serveur Legumly.
- Seuls appels externes : Open-Meteo, avec le nom tapé pour chercher une commune, puis des coordonnées arrondies à
  0,01° (environ 1 km). Ils ne passent jamais par le cache du service worker ; la dernière prévision est gardée en
  IndexedDB pour l'affichage hors ligne.
- Réglages → « Sauvegarder » télécharge un fichier JSON ; « Restaurer » le recharge (changement de téléphone).
- **Open-Meteo gratuit = usage non commercial.** Si Legumly devient payant ou affiche de la publicité, prendre leur
  offre commerciale (clé à ajouter alors côté serveur, jamais dans le navigateur). Attribution « Open-Meteo.com
  (CC BY 4.0) » affichée dans Réglages.

## Choix fonctionnels

- **Zones** : calendrier de référence océanique. Méditerranéenne : plein air 1 mois plus tôt au printemps et 1 mois
  plus tard à l'automne. Continentale : 1 mois plus tard au printemps pour les légumes qui craignent le gel. Montagne :
  1 mois plus tard au printemps, 1 mois plus tôt à l'automne. Les semis à l'abri ne bougent pas. La zone est suggérée
  à partir de la commune (altitude, position) et reste modifiable.
- **Plan des bacs** : rectangle aux proportions du bac, une bande par plantation selon la place occupée (espacement
  entre plants × ¾ de l'écart entre rangs), taux de remplissage, alerte « trop serré » et mauvais voisins.
- **Rappels** : repiquage (semis à l'abri + délai) et début de récolte, calculés depuis les plantations ; pastille sur
  l'onglet pour ce qui tombe dans les 7 jours. Pas de notification quand l'app est fermée (il faudrait un serveur
  d'envoi Web Push).
- **Alerte gel** : bandeau sur Ce mois et Mon potager si une minimale prévue sur 7 jours passe sous le seuil, avec les
  légumes frileux en place.

## Recette

`node outils/verifier-pwa.js .` (outil du kit) → **Conforme**, 21 contrôles sur 21.

Parcours automatisé dans Chromium à 390 px (Open-Meteo simulé) : 47 vérifications, toutes au vert, console sans
erreur. Détail dans `RECETTE.md` livré à côté de l'archive.

**Reste à faire à la main avant le lancement** (KIT.md § 7.2) : parcours sur un vrai iPhone et un vrai Android,
installation sur l'écran d'accueil, appel réel à Open-Meteo depuis le site en https, et relecture des 80 fiches par
un jardinier.
