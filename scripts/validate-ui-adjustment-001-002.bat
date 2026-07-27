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
echo UI Adjustment 001-002 Validation
echo Project: %PROJECT_ROOT%
echo ============================================================
echo.

echo [1/2] Checking JavaScript syntax...
for %%F in (
  "client\shell\navigationConfigService.js"
  "client\shell\navigationRegistry.js"
  "client\shell\navigationContext.js"
  "client\shell\router.js"
  "client\shell\breadcrumbService.js"
  "client\shell\applicationShell.js"
  "client\character-profiles\characterProfileHero.js"
  "client\character-profiles\characterProfileStats.js"
  "client\character-profiles\characterProfileWorks.js"
  "client\character-profiles\characterSharingPanel.js"
  "client\character-profiles\characterProfileViewMode.js"
  "client\character-profiles\characterProfilePage.js"
  "server\app\createApp.js"
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
echo [2/2] Running focused automated tests...
node --test ^
  test\navigationConfig.test.js ^
  test\navigationRegistry.test.js ^
  test\navigationContext.test.js ^
  test\characterProfileSharing.test.js ^
  test\characterProfileLifecycle.test.js ^
  test\characterDestinationHandoff.test.js ^
  test\i18nCatalogParity.test.js

if errorlevel 1 (
  echo.
  echo [FAILED] One or more automated tests failed.
  exit /b 1
)

echo.
echo ============================================================
echo [PASSED] All UI Adjustment 001-002 checks passed.
echo ============================================================
exit /b 0
