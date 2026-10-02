@echo off
setlocal
cd /d "%~dp0\.."

if not defined VENV_DIR set "VENV_DIR=D:\applications\momelo-post-processing\venv"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
set "MODEL_DOWNLOAD_ROOT=D:\development\temp\momelo-models"
set "HF_HOME=%MODEL_DOWNLOAD_ROOT%\huggingface"
set "TORCH_HOME=%MODEL_DOWNLOAD_ROOT%\torch"
set "PIP_CACHE_DIR=%MODEL_DOWNLOAD_ROOT%\pip-cache"
set "TMP=%MODEL_DOWNLOAD_ROOT%\tmp"
set "TEMP=%MODEL_DOWNLOAD_ROOT%\tmp"
set "HF_HUB_OFFLINE=1"
set "TRANSFORMERS_OFFLINE=1"
set "PYTHONDONTWRITEBYTECODE=1"
set "POST_PROCESSING_DIALOGUE_POC_ENABLED=true"
set "POST_PROCESSING_PILOT_ENABLED=false"
if not defined POST_PROCESSING_HOST set "POST_PROCESSING_HOST=127.0.0.1"
if not defined POST_PROCESSING_PORT set "POST_PROCESSING_PORT=6501"
if not defined POST_PROCESSING_OPENVOICE_CHECKPOINT set "POST_PROCESSING_OPENVOICE_CHECKPOINT=%MODEL_DOWNLOAD_ROOT%\openvoice\checkpoints_v2\converter"
if not defined POST_PROCESSING_THAI_MODEL_PATH if exist "%MODEL_DOWNLOAD_ROOT%\thonburian-tts\mega_f5_last.safetensors" set "POST_PROCESSING_THAI_MODEL_PATH=%MODEL_DOWNLOAD_ROOT%\thonburian-tts"

if not exist "%MODEL_DOWNLOAD_ROOT%" mkdir "%MODEL_DOWNLOAD_ROOT%"
if not exist "%TMP%" mkdir "%TMP%"

if /i "%~1"=="--repair-venv" goto repair_venv
if /i "%~1"=="--setup-openvoice" goto setup_openvoice
if /i "%~1"=="--setup-thai" goto setup_thai
if not "%~1"=="" (
    echo Unknown option: %~1
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo Python virtual environment not found at %VENV_DIR%.
    echo Set VENV_DIR to an existing working environment before starting the service.
    exit /b 1
)
echo Checking Python interpreter: %PYTHON_EXE%
"%PYTHON_EXE%" -c "import sys; print(sys.version); sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
    echo The venv launcher could not start Python 3.10 or newer. See the error above.
    echo Its installed packages have not been changed.
    echo Set VENV_DIR to another working venv, or set POST_PROCESSING_BASE_PYTHON to a working Python 3.10 python.exe and run this batch with --repair-venv.
    exit /b 1
)
echo Checking installed service packages...
"%PYTHON_EXE%" -c "import fastapi, uvicorn, numpy, soundfile, torch, mediapipe; print('Core packages ready')"
if errorlevel 1 (
    echo A package import failed. See the specific Python error above.
    echo Existing packages were not reinstalled. Install only the missing or broken dependency in %VENV_DIR%.
    exit /b 1
)
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo FFmpeg was not found on PATH.
    exit /b 1
)
ffprobe -version >nul 2>&1
if errorlevel 1 (
    echo FFprobe was not found on PATH.
    exit /b 1
)

echo Dialogue POC: http://127.0.0.1:%POST_PROCESSING_PORT%
echo Postman collection: post-processing-service.postman_collection.json
echo Model downloads and caches: %MODEL_DOWNLOAD_ROOT%
echo Press Ctrl+C to stop.
"%PYTHON_EXE%" -m uvicorn main:app --host 127.0.0.1 --port %POST_PROCESSING_PORT%
exit /b %errorlevel%

:repair_venv
if not defined POST_PROCESSING_BASE_PYTHON (
    echo Set POST_PROCESSING_BASE_PYTHON to a working Python 3.10 python.exe.
    echo The existing venv and installed packages will be preserved.
    exit /b 1
)
if not exist "%POST_PROCESSING_BASE_PYTHON%" (
    echo Base Python not found: %POST_PROCESSING_BASE_PYTHON%
    exit /b 1
)
"%POST_PROCESSING_BASE_PYTHON%" -c "import sys; print(sys.version); sys.exit(0 if sys.version_info[:2] == (3, 10) else 1)"
if errorlevel 1 (
    echo Repair requires a working Python 3.10 interpreter to keep the existing packages compatible.
    exit /b 1
)
"%POST_PROCESSING_BASE_PYTHON%" -m venv --upgrade "%VENV_DIR%"
if errorlevel 1 (
    echo Venv repair failed. The existing environment was not deleted.
    exit /b 1
)
"%PYTHON_EXE%" -c "import sys; print(sys.executable, sys.version); sys.exit(0 if sys.version_info[:2] == (3, 10) else 1)"
if errorlevel 1 (
    echo The repaired venv still cannot start. Check the base Python installation.
    exit /b 1
)
echo Venv launcher refreshed. Run this batch again without --repair-venv.
exit /b 0

:setup_openvoice
"%PYTHON_EXE%" -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
    echo Python must start successfully before downloading optional models.
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-dialogue-models.ps1" -Mode OpenVoice -ModelRoot "%MODEL_DOWNLOAD_ROOT%" -PythonExe "%PYTHON_EXE%"
exit /b %errorlevel%

:setup_thai
"%PYTHON_EXE%" -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
    echo Python must start successfully before downloading optional models.
    exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-dialogue-models.ps1" -Mode Thai -ModelRoot "%MODEL_DOWNLOAD_ROOT%" -PythonExe "%PYTHON_EXE%"
exit /b %errorlevel%
