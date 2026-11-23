@echo off
setlocal
cd /d "%~dp0.."
node scripts\start-web-next.mjs --restart-api %*
if errorlevel 1 (
  echo.
  echo Frontend could not start. Review the message above.
  pause
  exit /b 1
)
