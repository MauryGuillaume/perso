# Kit « Affichage France »

**Version 2.0** (2026-10-22) — kit de l'Atelier de Blocs.

Tout ce qu'une app vendue ou utilisée en France doit afficher correctement : prix en euros TTC, dates, heures,
nombres, téléphones et pluriels au format français ; mentions légales, politique de confidentialité, CGV et bandeau
cookies conforme à la CNIL.

| Fichier | Pour qui |
|---|---|
| `PROMPT.md` | **Prompt d'entrée** pour Claude (hors Atelier). |
| `KIT.md` | **Référence complète** : formats, textes, obligations légales, cookies, recette, pièges. |
| `modele/affichage.js` | **Prêt et testé** : `fr.prix`, `fr.date`, `fr.heure`, `fr.relatif`, `fr.telephone`, `fr.pluriel`… (navigateur et Node). |
| `modele/bandeau-cookies.js` + `affichage.css` | **Prêt et testé** : bandeau d'information ou de consentement (accepter / refuser au même niveau), `consentement.a('mesure')`. |
| `modele/mentions-legales.html`, `confidentialite.html`, `cgv.md` | **Modèles** à remplir (⟦…⟧), puis à faire relire. |
| `modele/exemple.html` | Démonstration des formats et du bandeau. |
| `outils/verifier-affichage.js` | Outil de recette (pas livré avec l'app) : 12 contrôles. |

## Essai rapide (Node 18+)

```bash
node -e "const fr=require('./modele/affichage.js'); console.log(fr.prix(1234.5), fr.date('2026-10-22','jour'))"
node outils/verifier-affichage.js modele      # → « Conforme »
```

Ouvre `modele/exemple.html` dans un navigateur : formats et bandeau cookies.

## Testé

`affichage.js` : 42 cas (prix, arrondis TTC, saisie « 1 234,50 € », dates sans décalage de fuseau, y compris lancé à
New York, relatif, téléphones, pluriels, tailles). Bandeau dans Chrome à 390 px : refus, mémorisation, réouverture par
« Gérer les cookies », acceptation, aucune erreur. Sur une app piégée (lang="en", `toFixed(2) + ' €'`, `en-US`, Google
Analytics sans consentement, « Submit », paiement sans CGV) : 8 règles obligatoires signalées.
