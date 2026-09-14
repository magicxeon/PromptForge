@echo off
title Momelo Post-Processing Service (Python FastAPI Mode)
cd /d "%~dp0\.."

set VENV_DIR=D:\applications\momelo-post-processing\venv

if not exist "%VENV_DIR%" (
    echo Creating Python Virtual Environment under %VENV_DIR%...
    mkdir "D:\applications\momelo-post-processing" 2>nul
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo Error: Python 3.10+ is required to create virtualenv.
        pause
        exit /b 1
    )
)

echo Activating Python Virtual Environment...
call "%VENV_DIR%\Scripts\activate.bat"

echo Installing/Verifying Python dependencies from requirements.txt...
pip install -r requirements.txt --quiet

echo Starting Post-Processing FastAPI Service...
python scripts/start_service.py
pause
