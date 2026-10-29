# Kit « Base projet »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs.

Mes règles communes à **tous** mes projets : règles non négociables, démarche (questions, plan validé, petites étapes,
accord avant toute action irréversible), sécurité de base, recette et livraison. C'est le kit qui encadre les autres.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier ; dans l'Atelier, ce kit est inclus par défaut). |
| `KIT.md` | **Référence complète** : règles, démarche, sécurité, recette, livraison, format du ZIP, pièges. |
| `modeles/PLAN.md` | Plan d'une page à présenter avant de coder. |
| `modeles/README-app.md` | README de l'app livrée : lancement, variables, déploiement, mise à jour, données personnelles. |
| `modeles/RECETTE.md` | Grille de recette : outils, parcours, cas d'erreur, console. |
| `modeles/LIVRAISON.md` | Compte rendu joint à chaque ZIP : livré, changé, recette, **pas fait / pas testé**. |
| `modeles/atelier-app.json` | Manifeste lu par l'Atelier à l'import du ZIP (nom, version, schéma, variables…). |
| `outils/verifier-livraison.js` | Outil de recette (pas livré avec l'app) : 14 contrôles, sur un dossier **ou directement sur le ZIP**. |
| `exemples/app-livree/` | Une petite app livrée selon le kit (« Conforme »). |

## Essai rapide (Node 18+)

```bash
node outils/verifier-livraison.js exemples/app-livree     # → « Conforme »
node outils/verifier-livraison.js ~/Téléchargements/mon-app.zip
```

## Testé

`exemples/app-livree` : « Conforme », en dossier et en ZIP (un `.env` ajouté dans le ZIP est détecté). Sur 4 apps réelles
(PodoLogiciel, Livora, PostLocal, RelancePro) : `.env` livrés, dossier `.next` livré, README sans déploiement ni mise à
jour, variables lues par le code mais non documentées, absence de compte rendu.
