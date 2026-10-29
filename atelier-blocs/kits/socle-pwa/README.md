# Kit « Socle PWA »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs.

Base technique d'une app mobile en HTML, CSS et JavaScript **vanilla** (sans framework ni build), installable sur
l'écran d'accueil, qui s'ouvre hors ligne et qui peut devenir une app App Store / Google Play avec l'Atelier
(écran Apps mobiles) sans changer son serveur.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier). |
| `KIT.md` | **Référence complète** : structure, écrans, API, service worker, accessibilité, mobile, recette, pièges. |
| `modele/` | **Le socle, prêt et testé** : `index.html`, `style.css`, `app.js` (routeur, écrans, `appli.api`, `appli.esc`, toast), `sw.js`, `manifest.webmanifest`, icônes. À copier puis remplir. |
| `outils/verifier-pwa.js` | Outil de recette (pas livré avec l'app) : 21 contrôles. |
| `outils/servir.js` | Petit serveur local pour tester (le service worker ne marche pas en `file://`). |

## Essai rapide (Node 18+)

```bash
node outils/servir.js modele 8080        # puis http://localhost:8080 (sur téléphone : même réseau, adresse IP de l'ordinateur)
node outils/verifier-pwa.js modele       # → « Conforme »
```

## Testé

`modele/` : « Conforme » aux 21 contrôles ; dans Chrome à 390 px : navigation, toast, liste avec HTML échappé,
formulaire avec erreur, **réouverture hors ligne**, pas de défilement horizontal, console sans erreur.
