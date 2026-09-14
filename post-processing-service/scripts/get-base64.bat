@echo off
chcp 65001 > nul
title Image to Base64 Converter - Momelo Post-Processing

echo =============================================================
echo    Image to Base64 Converter Utility
echo =============================================================

set "INPUT_FILE=%~1"

if "%INPUT_FILE%"=="" (
    set /p "INPUT_FILE=Please drag and drop your image file here and press Enter: "
)

:: Remove quotes if any
set "INPUT_FILE=%INPUT_FILE:"=%"

if not exist "%INPUT_FILE%" (
    echo Error: File "%INPUT_FILE%" does not exist.
    echo.
    pause
    exit /b 1
)

echo Processing file: "%INPUT_FILE%"...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$filePath = '%INPUT_FILE%'.Replace('\', '/'); " ^
    "$bytes = [System.IO.File]::ReadAllBytes($filePath); " ^
    "$b64 = [System.Convert]::ToBase64String($bytes); " ^
    "$b64 | Set-Clipboard; " ^
    "$outFile = $filePath + '.base64.txt'; " ^
    "[System.IO.File]::WriteAllText($outFile, $b64); " ^
    "Write-Host 'Base64 String Length:' $b64.Length 'characters'; " ^
    "Write-Host 'Status: Base64 successfully COPIED to Windows Clipboard!'; " ^
    "Write-Host 'Saved file:' $outFile; "

echo.
echo =============================================================
echo Done! Press Ctrl+V in Postman or your editor to paste.
echo =============================================================
echo.
pause
