@echo off
setlocal

cd /d "%~dp0.."

echo [1/6] Installing root workspace dependencies...
call npm install
if errorlevel 1 goto :failed

echo [2/6] Type-checking React workspace...
call npm run typecheck:web
if errorlevel 1 goto :failed

echo [3/6] Linting React workspace...
call npm run lint:web
if errorlevel 1 goto :failed

echo [4/6] Running React unit and component tests...
call npm run test:web
if errorlevel 1 goto :failed

echo [5/6] Testing server frontend route ownership...
node --test test/frontendRouteOwnership.test.js
if errorlevel 1 goto :failed

echo [6/6] Building the production React bundle...
call npm run build:web
if errorlevel 1 goto :failed

echo.
echo React foundation validation passed.
exit /b 0

:failed
echo.
echo React foundation validation failed. Review the first error above.
exit /b 1
