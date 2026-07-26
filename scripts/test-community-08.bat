@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

echo Checking Community-00-008 JavaScript files...
call :check "server\domain\admin\AdminPolicyService.js"
if errorlevel 1 goto :failed
call :check "server\domain\admin\AdminBackofficeService.js"
if errorlevel 1 goto :failed
call :check "server\domain\audit\AuditService.js"
if errorlevel 1 goto :failed
call :check "server\repositories\audit\AuditLogRepository.js"
if errorlevel 1 goto :failed
call :check "server\app\routes\adminRoutes.js"
if errorlevel 1 goto :failed
call :check "client\admin\adminApi.js"
if errorlevel 1 goto :failed
call :check "client\admin\adminPanel.js"
if errorlevel 1 goto :failed

echo.
echo Running Community-00-008 tests...
node --test test\adminBackoffice.test.js test\mockActorContext.test.js test\communityModerationReporting.test.js
if errorlevel 1 goto :failed

echo.
echo Validating localization catalogs...
node scripts\validate-i18n-catalogs.js
if errorlevel 1 goto :failed

echo.
echo [PASS] Community-00-008 validation completed successfully.
popd >nul
exit /b 0

:check
echo [CHECK] %~1
node --check "%~1"
if errorlevel 1 exit /b 1
exit /b 0

:failed
echo.
echo [FAIL] Community-00-008 validation failed.
popd >nul
exit /b 1
