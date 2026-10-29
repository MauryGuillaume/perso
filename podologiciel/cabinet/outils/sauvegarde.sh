#!/bin/sh
# Sauvegarde chiffrée de la base PodoLogiciel, à lancer chaque nuit (cron), depuis le dossier du projet.
#   Prérequis : un fichier .sauvegarde-mdp (une ligne, 20 caractères au moins), copié aussi dans ton coffre-fort.
#   Exemple de cron (3 h du matin) : 0 3 * * * cd /opt/podologiciel && sh outils/sauvegarde.sh >> sauvegardes/journal.log 2>&1
# Restaurer :
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:./.sauvegarde-mdp -in podo-AAAAMMJJ-HHMM.sql.gz.enc | gunzip \
#     | docker compose exec -T db psql -U podo -d podo
set -eu
cd "$(dirname "$0")/.."
[ -s .sauvegarde-mdp ] || { echo "Crée d'abord .sauvegarde-mdp (openssl rand -base64 24 > .sauvegarde-mdp)"; exit 1; }
DEST="${SAUVEGARDE_DOSSIER:-./sauvegardes}"
mkdir -p "$DEST"
F="$DEST/podo-$(date +%Y%m%d-%H%M).sql.gz.enc"
docker compose exec -T db pg_dump -U podo -d podo --no-owner \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass file:./.sauvegarde-mdp -out "$F"
echo "$(date -Iseconds) sauvegarde : $F ($(du -h "$F" | cut -f1))"
# On garde 30 jours sur le serveur ; copie aussi chaque fichier hors du serveur (stockage HDS de l'hébergeur).
find "$DEST" -name 'podo-*.sql.gz.enc' -mtime +30 -delete
