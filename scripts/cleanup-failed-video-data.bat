@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "VIDEO_TASK_ID=%~1"

if not defined VIDEO_TASK_ID (
  echo Enter the failed Video Task ID to clean up.
  echo Example: videotask_...
  set /p "VIDEO_TASK_ID=Task ID: "
)

if not defined VIDEO_TASK_ID (
  echo [CANCELLED] No Video Task ID was provided.
  exit /b 1
)

pushd "%PROJECT_ROOT%" >nul
if errorlevel 1 (
  echo [ERROR] Cannot open project root: %PROJECT_ROOT%
  exit /b 1
)

echo.
echo Previewing failed Video cleanup for %VIDEO_TASK_ID%...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0cleanup-failed-video-data.ps1" -Id "%VIDEO_TASK_ID%"
if errorlevel 1 goto :failed

echo.
echo Stop the backend before applying cleanup.
echo Only terminal failed/cancelled/expired tasks without output and without unsettled Credit can be removed.
set /p "CONFIRM=Type DELETE to continue: "
if /i not "%CONFIRM%"=="DELETE" (
  echo [CANCELLED] No files were changed.
  popd >nul
  exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0cleanup-failed-video-data.ps1" -Id "%VIDEO_TASK_ID%" -Apply
if errorlevel 1 goto :failed

popd >nul
exit /b 0

:failed
echo.
echo [ERROR] Video cleanup did not complete. Review the message above.
popd >nul
exit /b 1
