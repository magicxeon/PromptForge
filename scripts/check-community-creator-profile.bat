@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

echo Checking Community creator profile JavaScript files...
echo.

call :check "server\repositories\community\CreatorProfileRepository.js"
if errorlevel 1 goto :failed

call :check "server\repositories\community\CreatorFollowRepository.js"
if errorlevel 1 goto :failed

call :check "server\domain\community\CreatorProfileService.js"
if errorlevel 1 goto :failed

call :check "server\app\routes\communityCreatorRoutes.js"
if errorlevel 1 goto :failed

call :check "client\community\communityCreatorApi.js"
if errorlevel 1 goto :failed

call :check "client\community\followButton.js"
if errorlevel 1 goto :failed

call :check "client\community\creatorPortfolioGrid.js"
if errorlevel 1 goto :failed

call :check "client\community\creatorProfilePage.js"
if errorlevel 1 goto :failed

echo.
echo [PASS] All Community creator profile files passed node --check.
popd >nul
exit /b 0

:check
echo [CHECK] %~1
node --check "%~1"
if errorlevel 1 exit /b 1
exit /b 0

:failed
echo.
echo [FAIL] JavaScript syntax validation failed.
popd >nul
exit /b 1
