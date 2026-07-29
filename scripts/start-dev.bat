@echo off
setlocal

cd /d "%~dp0.."

echo Starting Re-build the package
call npm run build:web

echo Starting ModelPromptForge API on http://localhost:6500...
start "ModelPromptForge API Server" /min cmd /k "npm run dev:server"

echo Waiting for the API server...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$deadline = (Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:6500/api/community/features' -TimeoutSec 1; if ($response.StatusCode -ge 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; exit 1"
if errorlevel 1 goto :server_failed


echo Starting React development server on http://localhost:5173...
call npm run dev:web
exit /b %errorlevel%

:server_failed
echo.
echo API server did not become ready on port 6500.
echo Check the minimized "ModelPromptForge API Server" window for the first error.
exit /b 1
