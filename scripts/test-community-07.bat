@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

echo Checking Community-07 JavaScript files...
call :check "server\repositories\community\CommunityReportRepository.js"
if errorlevel 1 goto :failed
call :check "server\domain\community\CommunityModerationService.js"
if errorlevel 1 goto :failed
call :check "server\app\routes\communityModerationRoutes.js"
if errorlevel 1 goto :failed
call :check "client\community\communityModerationApi.js"
if errorlevel 1 goto :failed
call :check "client\community\reportPostDialog.js"
if errorlevel 1 goto :failed
call :check "client\community\moderationBanner.js"
if errorlevel 1 goto :failed

echo.
echo Running Community-07 tests...
node --test test\communityModerationReporting.test.js test\communityOwnershipPolicy.test.js test\adminBackoffice.test.js test\communityFeaturePolicy.test.js test\communityPublicSnapshot.test.js test\communityGeneratedShare.test.js
if errorlevel 1 goto :failed

echo.
echo Validating localization catalogs...
node scripts\validate-i18n-catalogs.js
if errorlevel 1 goto :failed

echo.
echo [PASS] Community-07 validation completed successfully.
popd >nul
exit /b 0

:check
echo [CHECK] %~1
node --check "%~1"
if errorlevel 1 exit /b 1
exit /b 0

:failed
echo.
echo [FAIL] Community-07 validation failed.
popd >nul
exit /b 1
