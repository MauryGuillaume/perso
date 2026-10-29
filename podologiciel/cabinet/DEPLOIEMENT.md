# Mettre PodoLogiciel en ligne chez un hébergeur HDS

Les dossiers patients sont des données de santé : en France, leur hébergement pour le compte d'un
cabinet doit se faire chez un **hébergeur certifié HDS** (article L.1111-8 du Code de la santé publique).
Ce guide suppose une machine virtuelle Linux louée chez un tel hébergeur. Compte une demi-journée.

## 1. Choisir l'hébergeur et la machine

- Vérifie la certification sur la liste officielle de l'Agence du numérique en santé (esante.gouv.fr,
  « Hébergeurs certifiés »). Plusieurs grands hébergeurs proposent une offre HDS (OVHcloud, Outscale,
  Microsoft Azure, AWS, Google Cloud…) : prends bien l'offre **HDS**, pas l'offre standard.
- Signe le contrat d'hébergement de données de santé (il fixe qui fait quoi : sauvegardes, accès,
  incidents) et garde-le avec ton registre RGPD.
- Machine : Debian 12 ou Ubuntu 24.04, 2 vCPU, 4 Go de mémoire, 40 Go de disque **chiffré**,
  dans un datacenter en France ou dans l'Union européenne.
- Un nom de domaine, par exemple `podo.mon-cabinet.fr`, avec un enregistrement DNS A vers l'adresse IP
  de la machine.

## 2. Préparer la machine

```bash
# connexion SSH avec une clé (pas de mot de passe), puis :
sudo apt update && sudo apt -y upgrade
sudo apt -y install ca-certificates curl ufw unattended-upgrades openssl
sudo dpkg-reconfigure -plow unattended-upgrades          # mises à jour de sécurité automatiques
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
curl -fsSL https://get.docker.com | sudo sh               # Docker et Docker Compose
```

Dans `/etc/ssh/sshd_config` : `PasswordAuthentication no` et `PermitRootLogin no`, puis
`sudo systemctl restart ssh`.

## 3. Installer PodoLogiciel

```bash
sudo mkdir -p /opt/podologiciel && sudo chown $USER /opt/podologiciel
# copie le contenu du ZIP dans /opt/podologiciel (scp, sftp…), puis :
cd /opt/podologiciel
cp .env.example .env && chmod 600 .env
openssl rand -hex 24      # → POSTGRES_PASSWORD dans .env
openssl rand -base64 32   # → PODO_CLE dans .env
nano .env                 # PODO_DOMAINE, POSTGRES_PASSWORD, PODO_CLE
docker compose up -d --build
docker compose logs -f api   # attendre « API prête », puis Ctrl+C
```

**Copie tout de suite `PODO_CLE` dans un coffre-fort de mots de passe**, hors du serveur.
Sans elle, aucune donnée ni aucune sauvegarde n'est lisible.

Caddy obtient le certificat HTTPS tout seul. Vérifie `https://podo.mon-cabinet.fr/api/sante`
(réponse `{"ok":true}`).

## 4. Premier compte et équipe

```bash
docker compose exec api node outils/creer-admin.js toi@cabinet.fr "Nom Prénom" AB
```

- Le script affiche un mot de passe provisoire. Ouvre l'app, connecte-toi : l'app affiche une clé à
  ajouter dans une application d'authentification (Google Authenticator, Microsoft Authenticator,
  FreeOTP…), puis demande le code à 6 chiffres et ton nouveau mot de passe.
- Onglet **Mon compte** : remplis l'en-tête de tes factures (cabinet, adresse, RPPS, SIRET, mention TVA).
- Onglet **Équipe** : crée les comptes des praticiens (avec leurs initiales, qui numérotent leurs
  factures) et du secrétariat. Remets chaque mot de passe provisoire en main propre.
- Téléphone perdu ou mot de passe oublié : Équipe › Réinitialiser.

## 5. Sauvegardes (obligatoire)

```bash
cd /opt/podologiciel
openssl rand -base64 24 > .sauvegarde-mdp && chmod 600 .sauvegarde-mdp   # à copier aussi dans le coffre-fort
sh outils/sauvegarde.sh                                                   # premier essai
crontab -e    # ajouter : 0 3 * * * cd /opt/podologiciel && sh outils/sauvegarde.sh >> sauvegardes/journal.log 2>&1
```

- Copie chaque nuit le dossier `sauvegardes/` hors de la machine, sur un stockage **HDS** (stockage
  objet de l'hébergeur, dans l'offre HDS). Les fichiers sont chiffrés, et les données de santé à
  l'intérieur le sont une seconde fois par la clé `PODO_CLE`.
- Teste une restauration une fois par trimestre sur une machine de test (commande en tête de
  `outils/sauvegarde.sh`, dans une base vide).

## 6. Mises à jour

Nouvelle version de l'app ou de l'API : remplace les fichiers (sauf `.env` et `.sauvegarde-mdp`), puis
`docker compose up -d --build`. Les migrations de la base s'appliquent toutes seules au démarrage.
Fais une sauvegarde juste avant.

## 7. Ce qui reste à ta charge (RGPD et santé)

- **Registre des traitements** et information des patients (affiche en salle d'attente, mention sur le
  site) ; le consentement est noté dans chaque dossier.
- **Durée de conservation** : 20 ans après le dernier passage pour les dossiers (archive plutôt que
  supprimer) ; 10 ans pour les factures.
- **Analyse d'impact (AIPD)** : vérifie avec le guide de la CNIL si ton cabinet y est soumis (selon le
  nombre de praticiens et de patients).
- **Journal d'accès** : l'administrateur le consulte régulièrement (onglet Journal) et l'exporte en CSV.
- **Violation de données** : notification à la CNIL sous 72 h ; l'hébergeur doit te prévenir (contrat HDS).
- **Télétransmission (SESAM-Vitale)** : ce logiciel ne fait pas de feuille de soins électronique. Elle
  passe par un logiciel agréé par le GIE SESAM-Vitale ou par un partenaire certifié (API de
  facturation agréée) ; on peut ensuite relier PodoLogiciel à ce partenaire.

## Dépannage

| Problème | Que faire |
| --- | --- |
| `docker compose up` refuse de démarrer | Un réglage manque dans `.env` (le message dit lequel) |
| Pas de certificat HTTPS | Le DNS ne pointe pas encore vers la machine, ou les ports 80/443 sont fermés |
| « Code incorrect » à chaque fois | L'heure du téléphone ou du serveur est fausse : active l'heure automatique (`timedatectl`) |
| Compte bloqué | 15 minutes d'attente après 5 essais ratés, ou Équipe › Réinitialiser |
| `PODO_CLE doit contenir 32 octets` | Regénère la clé avec `openssl rand -base64 32` (seulement avant toute saisie de données) |
