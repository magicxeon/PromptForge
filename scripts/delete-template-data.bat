@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "TEMPLATE_ID=%~1"

if not defined TEMPLATE_ID (
  echo Enter a Community Post ID, Template ID, or Template Version ID.
  echo Examples: post_...  tmpl_...  tmplv_...
  set /p "TEMPLATE_ID=ID: "
)

if not defined TEMPLATE_ID (
  echo [CANCELLED] No ID was provided.
  exit /b 1
)

pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

echo.
echo Previewing records linked to %TEMPLATE_ID%...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0delete-template-data.ps1" -Id "%TEMPLATE_ID%"
if errorlevel 1 goto :failed

echo.
echo Stop the backend before continuing. This operation permanently removes local runtime records.
set /p "CONFIRM=Type DELETE to continue: "
if /i not "%CONFIRM%"=="DELETE" (
  echo [CANCELLED] No files were changed.
  popd >nul
  exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0delete-template-data.ps1" -Id "%TEMPLATE_ID%" -Apply
if errorlevel 1 goto :failed

popd >nul
exit /b 0

:failed
echo.
echo [ERROR] Template cleanup did not complete. Review the message above.
popd >nul
exit /b 1

