# Kit « Base projet » — référence complète

> **Version du kit : 2.0** (2026-10-22). S'applique à tous les projets, avec les autres kits (sécurité, base de
> données, socle, charte, affichage). En cas de contradiction, la règle la plus stricte l'emporte.

## 1. Rôle du kit

Il fixe **comment on travaille** : ce qui ne se discute pas, dans quel ordre on avance, comment on teste et ce qu'on
livre. Les autres kits disent **quoi** faire dans leur domaine.

## 2. Règles non négociables

| Règle | Détail |
| --- | --- |
| Aucun secret exposé | Clés secrètes uniquement côté serveur ; jamais dans le navigateur, le dépôt, un ZIP ou un journal |
| Questions avant le code | Compréhension du besoin inférieure à 90 % → questions d'abord, en QCM quand c'est possible |
| Accord avant l'irréversible | Pousser, merger, ouvrir une PR, déployer, supprimer des données : on demande d'abord |
| Simple et lisible | Noms clairs, fonctions courtes, pas de dépendance pour trois lignes de code |
| Français | Textes de l'app en français, sans faute (détail : kit « Affichage France ») |
| Pas de contournement | Une règle qui bloque → on s'arrête et on propose une solution conforme |

## 3. Démarche

1. **Lire** tout le prompt et tous les fichiers joints (le `KIT.md` de chaque kit en entier).
2. **Questionner** si la compréhension est inférieure à 90 %.
3. **Planifier** sur une page (`modeles/PLAN.md`) : écrans, modèle de données, fonctions serveur (qui a le droit,
   entrées validées, ce qui fuit en cas d'erreur), services et variables, étapes, hors périmètre. Attendre la validation.
4. **Avancer par petites étapes** testables ; à chaque étape : ce qui est fait, ce qui reste, ce qui bloque.
5. **Tester** soi-même avant de livrer (§ 5).
6. **Livrer** (§ 6) et dire honnêtement ce qui n'est pas fait.

## 4. Sécurité de base (rappel)

Le navigateur ne reçoit que des valeurs publiques ; toute entrée est validée côté serveur et échappée à l'affichage ;
un montant, un droit ou un statut est recalculé côté serveur ; chaque table a des règles d'accès ; HTTPS partout ;
mots de passe d'au moins 10 caractères, jamais stockés en clair ; webhooks signés ; données personnelles limitées au
nécessaire avec une durée de conservation. Détail : kit « Cybersécurité renforcée » (ou « de base »).

## 5. Recette

Grille : `modeles/RECETTE.md`. Chaque point est **fait**, **échoué** (avec la raison) ou **non testé** (avec la raison).

- Les outils de recette de chaque kit utilisé : `verifier-livraison.js` (ce kit), `verifier-securite.js`,
  `verifier-base.js` ou `schema-doc.js`, `verifier-pwa.js`, `verifier-charte.js`, `verifier-affichage.js`.
- Chaque parcours principal de bout en bout, sur téléphone (390 px) et sur ordinateur.
- Les cas d'erreur : champ vide, mauvais mot de passe, réseau coupé, accès refusé, données d'un autre utilisateur.
- Aucune erreur dans la console du navigateur.

## 6. Livraison

### 6.1 Contenu du ZIP

| Élément | Obligatoire | Modèle |
| --- | --- | --- |
| Le code complet, à plat, prêt à lancer | oui | |
| `README.md` : à quoi sert l'app, lancement, variables, **déploiement**, **mise à jour**, données personnelles | oui | `modeles/README-app.md` |
| `.env.example` : toutes les variables lues par le code, **sans valeur secrète** | oui si variables | |
| `atelier-app.json` : manifeste pour l'Atelier | oui | `modeles/atelier-app.json` |
| `LIVRAISON.md` : livré, changé, recette, **pas fait / pas testé**, à faire avant la mise en ligne | oui | `modeles/LIVRAISON.md` |
| `RECETTE.md` détaillée | recommandé | `modeles/RECETTE.md` |
| Fichier de verrouillage (`package-lock.json`) | recommandé | |

**Jamais dans le ZIP** : `.env` (et `.env.local`…), `node_modules`, `.git`, `.next` et autres dossiers de build, dumps de
base, clés (`.pem`, `.key`), journaux.

### 6.2 `atelier-app.json`

```json
{
  "nom": "Cabinet Démo", "description": "Prise de rendez-vous…", "version": "1.0.0", "icone": "mdi-calendar-account",
  "stack": "HTML, CSS, JavaScript + Node.js + PostgreSQL", "web": "public", "schema": ["db/migrations"],
  "env": [{ "cle": "DATABASE_URL", "role": "Connexion à la base", "secret": true }],
  "fonctionnalites": [["Prise de rendez-vous", "agenda"]], "notes": ""
}
```

L'Atelier s'en sert à l'import du ZIP : fiche de l'app, onglet Base de données (`schema` : fichiers ou dossiers SQL, dans
l'ordre), variables, version, aperçu mobile (`web`). Une nouvelle livraison = `version` augmentée.

## 7. Outil `outils/verifier-livraison.js`

```bash
node outils/verifier-livraison.js mon-app/       # dossier
node outils/verifier-livraison.js mon-app.zip    # ZIP livré (un dossier racine unique est accepté)
```

| N° | Contrôle | Niveau |
| --- | --- | --- |
| 01 | README à la racine | obligatoire |
| 02 | README : lancement, déploiement, mise à jour (titres) | obligatoire |
| 03 | `.env.example` livré si le code lit des variables | obligatoire |
| 04 | `.env.example` sans valeur secrète (une adresse `localhost` est acceptée) | obligatoire |
| 05 | Chaque variable lue par le code est documentée | obligatoire |
| 06 | Aucun fichier à ne pas livrer | obligatoire |
| 07 | `atelier-app.json` valide (nom, version `x.y.z`, description) | obligatoire |
| 08 | Chemins `schema` et `web` présents | obligatoire |
| 09 | Compte rendu : résultat de la recette | obligatoire |
| 10 | Compte rendu : pas fait / pas testé | obligatoire |
| 11 | Aucun `⟦…⟧` laissé | obligatoire |
| 12 | Dépendances verrouillées | recommandé |
| 13 | Aucun TODO / FIXME | recommandé |
| 14 | Aucun fichier de plus de 10 Mo | recommandé |

## 8. Pièges connus

- Un `.env.local` dans le ZIP : tous les secrets partent avec (trouvé sur plusieurs apps réelles).
- Le dossier `.next` livré : des centaines de fichiers inutiles et parfois des valeurs d'environnement compilées.
- Un README qui explique le lancement mais pas le déploiement ni la mise à jour : personne ne peut reprendre l'app.
- « Tout est fait et testé » sans détail : la liste de ce qui n'est pas fait est obligatoire, même courte.
- Une variable lue par le code mais absente de `.env.example` : l'app plante au premier démarrage chez l'hébergeur.

## 9. Historique des versions du kit

### 2.0 — 2026-10-22

Format complet : README, PROMPT, KIT en sections numérotées, modèles (PLAN, README-app, RECETTE, LIVRAISON,
atelier-app.json), outil `verifier-livraison.js` (14 contrôles, dossier ou ZIP), exemple d'app livrée.

### 1.0 — 2026-10-20

Première version : règles, démarche, recette et livraison dans l'Atelier (22 règles).
