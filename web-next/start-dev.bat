@echo off
setlocal
cd /d "%~dp0.."
call scripts\start-web-next.bat %*
exit /b %errorlevel%
