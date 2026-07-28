@echo off
setlocal

cd /d "%~dp0.."

echo [1/9] Installing workspace dependencies...
call npm install
if errorlevel 1 goto :failed

echo [2/9] Checking the Playwright test runtime...
call npx playwright --version
if errorlevel 1 goto :failed

echo [3/9] Validating localization catalogs...
node scripts/validate-i18n-catalogs.js
if errorlevel 1 goto :failed

echo [4/9] Type-checking the React application...
call npm run typecheck:web
if errorlevel 1 goto :failed

echo [5/9] Linting the React application...
call npm run lint:web
if errorlevel 1 goto :failed

echo [6/9] Running React unit and component tests...
call npm run test:web
if errorlevel 1 goto :failed

echo [7/9] Running the complete server regression suite...
node scripts/test-character-sheet-release-gate.js
if errorlevel 1 goto :failed
node --test "test/**/*.test.js"
if errorlevel 1 goto :failed

echo [8/9] Building the production React bundle...
call npm run build:web
if errorlevel 1 goto :failed

echo [9/9] Running desktop and mobile browser smoke tests...
call npm run test:web:e2e
if errorlevel 1 goto :failed

echo.
echo Full React migration validation passed.
exit /b 0

:failed
echo.
echo React migration validation failed. Review the first error above.
exit /b 1
