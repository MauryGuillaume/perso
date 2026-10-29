#!/bin/sh
# Lance l'API PodoLogiciel sur ce Mac (http://localhost:4517). Double-clic.
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Node.js n'est pas installé : https://nodejs.org (version LTS)"; read r; exit 1; }
[ -d node_modules ] || npm install --omit=dev || exit 1
[ -f .env ] || node outils/configurer.js
node serveur.js
