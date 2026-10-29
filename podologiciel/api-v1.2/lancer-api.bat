@echo off
setlocal
chcp 65001 >nul
title API PodoLogiciel
rem Lance l'API PodoLogiciel sur ce PC : http://localhost:4517 . Double-clic, apres avoir dezippe le dossier.
cd /d "%~dp0"
echo.
echo  API PodoLogiciel
echo  Dossier : %CD%
echo.

where node >nul 2>nul
if errorlevel 1 goto pas_de_node
for /f "delims=" %%v in ('node -v') do echo  Node.js %%v

if exist "node_modules\pg" goto modules_ok
echo  Installation des modules, une minute...
call npm install --omit=dev
if errorlevel 1 goto erreur_npm
:modules_ok

if exist ".env" goto config_ok
node outils\configurer.js
if errorlevel 1 goto erreur
:config_ok

echo.
echo  Demarrage. Laisse cette fenetre ouverte tant que tu utilises l'app ; ferme-la pour arreter l'API.
echo.
node serveur.js
echo.
echo  L'API s'est arretee. Lis le message au-dessus.
echo  Si c'est un mot de passe PostgreSQL refuse : supprime le fichier .env de ce dossier et relance.
echo  Si PostgreSQL n'est pas installe : https://www.postgresql.org/download/windows/
pause
exit /b 0

:pas_de_node
echo  Node.js n'est pas installe.
echo  Installe la version LTS depuis https://nodejs.org puis relance ce fichier.
pause
exit /b 1

:erreur_npm
echo  L'installation des modules a echoue : verifie la connexion internet puis relance.
pause
exit /b 1

:erreur
echo  La configuration a echoue.
pause
exit /b 1
