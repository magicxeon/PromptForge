@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"

cd /d "%PROJECT_ROOT%"
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  exit /b 1
)

echo.
echo ============================================================
echo UI Adjustment 003 - Playground Reference and Layout Validation
echo Project: %PROJECT_ROOT%
echo ============================================================
echo.

echo [1/3] Checking JavaScript syntax...
for %%F in (
  "client\core\generationService.js"
  "client\core\promptCompiler.js"
  "client\generation-controls\promptEditor.js"
  "client\generation-controls\referenceSlotManager.js"
  "client\playground\playgroundController.js"
  "client\playground\playgroundPage.js"
  "server\domain\generation\referenceRolePolicy.js"
  "server\domain\generation\generationRequestService.js"
  "server\domain\generation\QueueManager.js"
  "server\domain\generation\promptCompiler.js"
  "server\providers\GeminiProvider.js"
) do (
  echo   node --check %%~F
  node --check "%%~F"
  if errorlevel 1 (
    echo.
    echo [FAILED] Syntax check failed: %%~F
    exit /b 1
  )
)

echo.
echo [2/3] Validating localization catalogs...
node scripts\validate-i18n-catalogs.js
if errorlevel 1 (
  echo.
  echo [FAILED] Localization catalog validation failed.
  exit /b 1
)

echo.
echo [3/3] Running focused automated tests...
node --test ^
  test\playgroundReferenceRoles.test.js ^
  test\referenceValueNormalization.test.js ^
  test\i18nCatalogParity.test.js

if errorlevel 1 (
  echo.
  echo [FAILED] One or more automated tests failed.
  exit /b 1
)

echo.
echo ============================================================
echo [PASSED] All UI Adjustment 003 checks passed.
echo ============================================================
exit /b 0
