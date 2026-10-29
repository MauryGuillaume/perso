@echo off
rem Lance l'Atelier de Blocs avec son serveur local (Windows) : double-clic.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n'est pas installe : https://nodejs.org & pause & exit /b 1)
start "" /min cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8787/"
node serveur.js
pause
