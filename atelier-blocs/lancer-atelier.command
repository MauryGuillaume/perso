#!/bin/bash
# Lance l'Atelier de Blocs avec son serveur local (Mac) : double-clic.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé : https://nodejs.org (version LTS), puis relance ce fichier."
  read -r -p "Entrée pour fermer" _; exit 1
fi
(sleep 1.5 && open "http://localhost:8787/") &
node serveur.js
