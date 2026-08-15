@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

echo Checking Community-00-009 JavaScript files...
call :check "server\domain\community\CommunityFeaturePolicyService.js"
if errorlevel 1 goto :failed
call :check "server\app\routes\sceneTemplateRoutes.js"
if errorlevel 1 goto :failed
call :check "client\community\communityFeaturePolicy.js"
if errorlevel 1 goto :failed
call :check "client\shell\navigationRegistry.js"
if errorlevel 1 goto :failed
call :check "client\shell\router.js"
if errorlevel 1 goto :failed

echo.
echo Running Community-00-009 tests...
node --test test\communityFeaturePolicy.test.js test\communityFeatureGateRoutes.test.js test\communityClientFeaturePolicy.test.js
if errorlevel 1 goto :failed

echo.
echo [PASS] Community-00-009 validation completed successfully.
popd >nul
exit /b 0

:check
echo [CHECK] %~1
node --check "%~1"
if errorlevel 1 exit /b 1
exit /b 0

:failed
echo.
echo [FAIL] Community-00-009 validation failed.
popd >nul
exit /b 1
