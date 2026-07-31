@echo off
setlocal

cd /d "%~dp0.."

echo Starting Re-build the package
call npm run build:web
if errorlevel 1 exit /b %errorlevel%

node scripts\start-dev.mjs
exit /b %errorlevel%
