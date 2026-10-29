# Prompt d'entrée — app PWA vanilla sur le socle

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit**. Remplace les éléments entre ⟦ ⟧.

---

Tu développes **⟦Nom de l'app⟧**, une app mobile (PWA) en HTML, CSS et JavaScript vanilla. ⟦Décris en 3 à 6 lignes le besoin.⟧

Tu pars du **socle PWA** joint (`modele/`) : routeur, écrans, appels à l'API, service worker, manifeste et icônes sont prêts et testés.

## Avant d'écrire la moindre ligne

1. Lis **intégralement** `KIT.md`, puis tout `modele/`.
2. Établis la liste des écrans (nom, onglet ou non, données affichées, actions), les appels à l'API et le modèle de données.
3. Présente-les-moi en une page et attends ma validation.

## Règles non négociables

- Vanilla : pas de framework, pas de build, pas de dépendance npm côté navigateur.
- Tu gardes la structure de `modele/` : écrans dans `ECRANS` de `app.js` (ou un fichier `ecran-<nom>.js` par écran), `appli.api` pour l'API (chemins relatifs `/api/…`), `appli.esc` pour toute valeur affichée.
- Aucune couleur en dur : les variables de `style.css` (charte).
- Utilisable à 390 px, zones tactiles de 44 px, focus visible, textes en français.
- `sw.js` : la version change à chaque livraison ; l'API n'est jamais mise en cache.

## Livraison

- L'app complète à plat, prête à héberger ; README (lancement, déploiement, mise à jour) ; tableau des variables.
- `node outils/verifier-pwa.js .` → **« Conforme »**, et le résultat des tests à la main du KIT.md § 7.

Commence par la lecture de `KIT.md`, puis présente-moi la liste des écrans.
