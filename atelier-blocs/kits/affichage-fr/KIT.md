# Kit « Affichage France » — référence complète

> **Version du kit : 2.0** (2026-10-22). Pour toute app utilisée en France. Les modèles juridiques sont une base de
> travail, pas un conseil juridique : ils se font relire avant la mise en ligne.

## 1. Principes

- **Un seul endroit pour les formats** : `affichage.js`. Aucun écran ne formate un prix ou une date à la main.
- **Le serveur stocke, l'écran formate** : montants en centimes (entier) ou `numeric(12,2)`, dates en `timestamptz` (UTC) ou
  `date` ; la conversion au format français se fait à l'affichage seulement.
- **Ce que la loi impose est visible** : mentions légales, confidentialité, CGV, choix sur les cookies.

## 2. `affichage.js`

Chargé avant les écrans (`<script src="affichage.js">`), ou `const fr = require('./affichage.js')` côté Node.
Si `window.appli` existe déjà (socle PWA), il reçoit aussi `appli.prix`, `appli.date`, `appli.heure`, `appli.nombre`.

| Fonction | Exemple | Résultat |
| --- | --- | --- |
| `fr.prix(n, { centimes })` | `fr.prix(1234.5)` | `1 234,50 €` (`centimes: false` → `1 235 €`, `'auto'` → sans `,00`) |
| `fr.prixCentimes(c)` | `fr.prixCentimes(1250)` | `12,50 €` |
| `fr.ttc(ht, taux)` / `fr.ht(ttc, taux)` | `fr.ttc(10, 5.5)` | `10.55` (taux 20 par défaut, arrondi au centime) |
| `fr.arrondi(n)` | `fr.arrondi(1.005)` | `1.01` |
| `fr.lireMontant(texte)` | `fr.lireMontant('1 234,50 €')` | `1234.5` (`null` si illisible) |
| `fr.nombre(n, déc)` / `fr.pourcent(x)` | `fr.pourcent(0.205)` | `20,5 %` |
| `fr.date(d, format)` | `fr.date('2026-10-22', 'jour')` | `jeudi 22 octobre 2026` — formats `court` (22/10/2026), `long`, `jour`, `abrege`, `mois` |
| `fr.heure(d)` / `fr.dateHeure(d)` | `fr.dateHeure('2026-10-22T12:30:00Z')` | `22/10/2026 à 14:30` (heure de Paris) |
| `fr.relatif(d)` | | `à l'instant`, `hier`, `il y a 3 jours`, `dans 2 heures` |
| `fr.dateIso(d)` | | `2026-10-22`, pour un `<input type="date">` |
| `fr.telephone(t)` | `fr.telephone('0612345678')` | `06 12 34 56 78` |
| `fr.pluriel(n, sing, plur)` | `fr.pluriel(0, 'client')` | `0 client` (0 et 1 au singulier) |
| `fr.liste(tab, ou)` / `fr.taille(octets)` | | `a, b et c` / `1,2 Mo` |
| `fr.reglages({ devise, fuseau })` | | Devise `EUR` et fuseau `Europe/Paris` par défaut |

Une date sans heure (`'2026-10-22'`) reste ce jour-là quel que soit le fuseau du téléphone. Les espaces des nombres
sont des espaces insécables (le prix ne se coupe jamais en fin de ligne).

## 3. Textes

- Tout en français, sans faute : boutons, erreurs, courriels, notifications, titres d'onglet, `alt`, `placeholder`.
- **Vouvoiement ou tutoiement**, choisi une fois pour toute l'app.
- Boutons à l'infinitif ou au nom d'action : « Enregistrer », « Prendre rendez-vous » ; jamais « OK » seul pour une action importante.
- Messages d'erreur utiles : ce qui ne va pas et comment corriger (« L'email doit contenir un @ »).
- Ponctuation française : espace insécable avant `: ; ! ?` et dans `« … »` ; apostrophe typographique `’` dans les textes.
- Majuscules accentuées (« État », « À venir »).

## 4. Prix et facturation

- Particuliers : prix **TTC**, en euros, frais compris ou annoncés avant le paiement.
- Professionnels : HT accepté, avec la mention « HT » et le taux de TVA ; le total TTC est toujours montré au paiement.
- Abonnement : prix, périodicité, renouvellement et résiliation visibles avant de payer.
- Calculs côté serveur, en centimes ; l'écran ne fait qu'afficher.
- Factures : numérotation continue, mentions obligatoires, conservées 10 ans (souvent fournies par Stripe ou l'outil de facturation).

## 5. Pages légales

| Page | Quand | Modèle |
| --- | --- | --- |
| Mentions légales | Toujours (LCEN, art. 6-III) | `modele/mentions-legales.html` |
| Politique de confidentialité | Dès qu'une donnée personnelle est collectée (compte, formulaire, email) — RGPD art. 13 | `modele/confidentialite.html` |
| CGV | Dès que l'app fait payer ; acceptées par une case non pré-cochée avant le paiement | `modele/cgv.md` (à mettre en page) |
| CGU | Recommandé dès qu'il y a des comptes ou du contenu publié par les utilisateurs | — |

Lien vers chaque page depuis tous les écrans (pied de page `.pied-legal` ou écran « À propos » dans une app mobile).
Un ⟦…⟧ laissé dans une page publiée est une erreur : la liste des champs restant à remplir fait partie de la livraison.

## 6. Cookies et traceurs

- **Sans consentement** (exemptés) : session, panier, choix sur les cookies, sécurité, et mesure d'audience
  configurée en mode exempté (ex. Matomo avec les réglages recommandés par la CNIL). → Bandeau d'information (`window.COOKIES`
  sans finalité) ou simple mention dans la page de confidentialité.
- **Avec consentement** : Google Analytics, publicité, pixels (Meta, TikTok, LinkedIn), vidéos et cartes de tiers.
  → `bandeau-cookies.js` avec une finalité par usage ; **rien n'est chargé avant l'accord** :

```js
window.COOKIES = { finalites: { mesure: 'Mesure d’audience' } };   // avant bandeau-cookies.js
function lancerMesure() { if (consentement.a('mesure')) { /* charger le script de mesure ici */ } }
lancerMesure(); window.addEventListener('consentement', lancerMesure);
```

- « Tout refuser » et « Tout accepter » au même niveau, choix gardé 6 mois, lien « Gérer les cookies » (`data-cookies`) partout.

## 7. Formulaires

- `<input type="date">`, `type="tel"`, `type="email"`, `inputmode="decimal"` pour un montant (lu avec `fr.lireMontant`).
- Code postal : 5 chiffres (`pattern="\d{5}"`) ; téléphone affiché avec `fr.telephone`.
- Une case de consentement (newsletter, CGV) n'est jamais pré-cochée.

## 8. Recette

### 8.1 Outil `outils/verifier-affichage.js`

```bash
node outils/verifier-affichage.js .
```

| N° | Contrôle | Niveau |
| --- | --- | --- |
| 01 | Pages en `lang="fr"` | obligatoire |
| 02 | Aucun prix formaté à la main (`toFixed(2)`, `+ ' €'`, `${x} €`) | obligatoire |
| 03 | Aucun format anglais (`en-US`, `USD`, `MM/DD`) | obligatoire |
| 04 | Formats centralisés (`affichage.js` ou `Intl` en `fr`) | recommandé |
| 05 | Mentions légales accessibles | obligatoire |
| 06 | Confidentialité si données personnelles | obligatoire |
| 07 | CGV si paiement | obligatoire |
| 08 | Traceurs → bandeau avec refus | obligatoire |
| 09 | Aucun texte d'interface en anglais (Submit, Cancel, Loading…) | obligatoire |
| 10 | Prix TTC si « HT » apparaît | recommandé |
| 11 | Tutoiement ou vouvoiement constant | recommandé |
| 12 | Pluriels accordés plutôt que « élément(s) » | recommandé |

### 8.2 À la main

- Chaque écran relu en entier : fautes, anglais restant, ton constant.
- Un prix de 1 234,50 € et une date du 1er janvier s'affichent correctement ; un montant saisi « 12,5 » est accepté.
- Téléphone réglé sur un autre fuseau : les dates sans heure ne changent pas de jour.
- Bandeau : refuser, recharger (pas de bandeau), « Gérer les cookies », accepter ; aucun traceur chargé avant l'accord
  (onglet Réseau du navigateur).
- Pages légales : plus aucun ⟦…⟧.

## 9. Pièges connus

- `new Date('2026-10-22')` est minuit **UTC** : affiché à Paris c'est bon, à Montréal c'est la veille. Passer la chaîne à `fr.date`.
- `0.1 + 0.2` vaut `0.30000000000000004` : calculs en centimes, `fr.arrondi` pour un résultat en euros.
- `toLocaleString()` sans langue suit le téléphone de l'utilisateur : toujours `fr.…`.
- Google Fonts appelé depuis le navigateur transmet l'adresse IP à Google : héberger la police avec l'app.
- Un bandeau qui n'a que « Accepter » (ou un « Refuser » caché) est sanctionné par la CNIL.

## 10. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : `affichage.js` (formats français, 42 cas testés), `bandeau-cookies.js` + `affichage.css` (CNIL),
modèles de mentions légales, confidentialité et CGV, exemple, outil de recette `verifier-affichage.js` (12 contrôles).

### 1.1 — 2026-10-20

Texte pour le prompt (critère affichage).

### 1.0 — 2026-10-20

Première version : langue, devise, format de date, bandeau cookies dans l'Atelier.
