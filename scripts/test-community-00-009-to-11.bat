@echo off
setlocal

echo Running Community feature-gate validation...
call scripts\test-community-00-009.bat
if errorlevel 1 exit /b 1

echo Running Community 09-11 contract validation...
call scripts\test-community-09-11.bat
if errorlevel 1 exit /b 1

echo Community 00-009 and Community 09-11 validation passed.
