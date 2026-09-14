@echo off
title Post-Processing Service (Isolated Mode)
cd /d "%~dp0"
node start-service.mjs
pause
