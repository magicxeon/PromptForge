@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 exit /b 1

echo Previewing Video poster migration and missing-file records...
node scripts\reconcile-video-media.js
if errorlevel 1 goto :failed

echo.
echo Stop the backend before applying this maintenance operation.
echo APPLY creates missing posters. CLEANUP also removes records whose Video file is missing.
set /p "MODE=Type APPLY or CLEANUP to continue, or press Enter to cancel: "

if /i "%MODE%"=="APPLY" node scripts\reconcile-video-media.js --apply
if /i "%MODE%"=="CLEANUP" node scripts\reconcile-video-media.js --apply --cleanup-missing
if not defined MODE echo [CANCELLED] No files were changed.

if errorlevel 1 goto :failed
popd >nul
exit /b 0

:failed
echo [ERROR] Video media reconciliation did not complete. Review the report before retrying.
popd >nul
exit /b 1
