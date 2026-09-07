@echo off
setlocal

cd /d "%~dp0.."

echo Stopping the previous ModelPromptForge development session...
node scripts\start-dev.mjs --stop-existing
if errorlevel 1 exit /b %errorlevel%

echo Backing up local server data...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\backup-server-data.ps1"
if errorlevel 1 exit /b %errorlevel%

echo Starting Re-build the package
call npm run build:web
if errorlevel 1 exit /b %errorlevel%

node scripts\start-dev.mjs
exit /b %errorlevel%
