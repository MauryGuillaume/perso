#!/bin/sh
# Lance l'Atelier de Blocs avec son serveur local (Linux) : ./lancer-atelier.sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js n'est pas installé : https://nodejs.org"; exit 1; }
(sleep 1.5 && xdg-open "http://localhost:8787/" >/dev/null 2>&1) &
exec node serveur.js
