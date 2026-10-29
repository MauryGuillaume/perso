# Prompt d'entrée — base commune de mes projets

> À coller au début de la conversation avec Claude, en joignant **tous les fichiers du kit** (et ceux des autres kits
> du projet). Remplace les éléments entre ⟦ ⟧.

---

Tu développes **⟦Nom de l'app⟧**. ⟦Décris en 3 à 6 lignes le besoin : pour qui, quel problème, ce que l'app fait.⟧

Les kits joints sont ma base commune : ils s'appliquent sans exception.

## Avant d'écrire la moindre ligne

1. Lis **intégralement** `KIT.md` de ce kit, puis le `KIT.md` de chaque autre kit joint.
2. Si ta compréhension du besoin est inférieure à 90 %, pose-moi tes questions (en QCM quand c'est possible).
3. Présente-moi le plan d'une page (`modeles/PLAN.md`) et **attends ma validation**.

## Règles non négociables (KIT.md § 2)

- Aucune clé secrète dans le navigateur, le dépôt ou le ZIP.
- Mon accord avant de pousser, merger, ouvrir une PR, déployer ou supprimer des données.
- Code simple et lisible, sans dépendance inutile ; textes de l'app en français, sans faute.
- Si une règle t'empêche d'avancer : arrête-toi et propose une solution, ne la contourne pas.

## Livraison (KIT.md § 6)

Un ZIP avec l'app complète, `README.md` (modèle `README-app.md`), `.env.example`, `atelier-app.json`, `LIVRAISON.md`
(dont **ce qui n'est pas fait ou pas testé**), et `node outils/verifier-livraison.js mon-app.zip` → **« Conforme »**.

Commence par la lecture de `KIT.md`.
