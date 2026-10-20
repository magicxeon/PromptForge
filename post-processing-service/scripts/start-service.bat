@echo off
setlocal
title Momelo Post-Processing Service (Python FastAPI Mode)
cd /d "%~dp0\.." || exit /b 1

if not defined POST_PROCESSING_BASE_PYTHON set "POST_PROCESSING_BASE_PYTHON=D:\Program Files\Python3\python.exe"
if not defined VENV_DIR set "VENV_DIR=D:\applications\momelo-post-processing\venv-py313"
if not defined PIP_CACHE_DIR set "PIP_CACHE_DIR=D:\applications\momelo-post-processing\pip-cache"
if not defined HF_HOME set "HF_HOME=D:\development\temp\momelo-models\huggingface"
if not defined HF_HUB_CACHE set "HF_HUB_CACHE=%HF_HOME%\hub"
if not defined HF_DATASETS_CACHE set "HF_DATASETS_CACHE=%HF_HOME%\datasets"
if not defined TORCH_HOME set "TORCH_HOME=D:\development\temp\momelo-models\torch"
if not defined XDG_CACHE_HOME set "XDG_CACHE_HOME=D:\development\temp\momelo-models\cache"
if not defined MPLCONFIGDIR set "MPLCONFIGDIR=D:\development\temp\momelo-models\matplotlib"
if not defined NUMBA_CACHE_DIR set "NUMBA_CACHE_DIR=D:\development\temp\momelo-models\numba"
if not defined CACHED_PATH_CACHE_ROOT set "CACHED_PATH_CACHE_ROOT=D:\development\temp\momelo-models\cached-path"
if not defined CUDA_CACHE_PATH set "CUDA_CACHE_PATH=D:\development\temp\momelo-models\cuda-cache"
if not defined TORCH_EXTENSIONS_DIR set "TORCH_EXTENSIONS_DIR=D:\development\temp\momelo-models\torch-extensions"
if not defined TORCHINDUCTOR_CACHE_DIR set "TORCHINDUCTOR_CACHE_DIR=D:\development\temp\momelo-models\torchinductor"
rem The old launcher leaked VENV_DIR into the caller's Command Prompt.
if /i "%VENV_DIR%"=="D:\applications\momelo-post-processing\venv" (
    "%VENV_DIR%\Scripts\python.exe" --version >nul 2>&1
    if errorlevel 1 (
        echo The legacy Python 3.10 environment is unavailable; using the separate Python 3.13 environment.
        set "VENV_DIR=D:\applications\momelo-post-processing\venv-py313"
    )
)
set "SERVICE_PYTHON=%VENV_DIR%\Scripts\python.exe"

if not exist "%POST_PROCESSING_BASE_PYTHON%" (
    echo Error: Base Python not found at "%POST_PROCESSING_BASE_PYTHON%".
    echo Set POST_PROCESSING_BASE_PYTHON to a working Python 3.10+ python.exe.
    exit /b 1
)
"%POST_PROCESSING_BASE_PYTHON%" -c "import sys; print('Base Python:', sys.executable, sys.version.split()[0]); sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 exit /b 1

if not exist "%SERVICE_PYTHON%" (
    if exist "%VENV_DIR%" (
        echo Error: Existing environment is incomplete: "%VENV_DIR%".
        echo Set VENV_DIR to a new directory. The existing environment was preserved.
        exit /b 1
    )
    echo Creating Python Virtual Environment under "%VENV_DIR%"...
    "%POST_PROCESSING_BASE_PYTHON%" -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo Error: Could not create the virtual environment.
        exit /b 1
    )
)

echo Checking Python Virtual Environment...
"%SERVICE_PYTHON%" -c "import sys; print('Service Python:', sys.executable, sys.version.split()[0]); sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if errorlevel 1 (
    echo Error: The selected virtual environment cannot start. Its files were preserved.
    echo Set VENV_DIR to a new directory to create a working environment.
    exit /b 1
)

echo Installing/Verifying Python dependencies from requirements.txt...
set "TMP=%PIP_CACHE_DIR%\tmp"
set "TEMP=%TMP%"
if not exist "%TMP%" mkdir "%TMP%"
if errorlevel 1 exit /b 1
"%SERVICE_PYTHON%" -m pip install -r "%CD%\requirements.txt" --disable-pip-version-check
if errorlevel 1 (
    echo Error: Dependency installation failed. Service startup cancelled.
    exit /b 1
)

rem Prefer the existing NVIDIA GPU; CPU-only machines keep the standard wheels.
nvidia-smi -L >nul 2>&1
if not errorlevel 1 (
    if not exist "%CUDA_CACHE_PATH%" mkdir "%CUDA_CACHE_PATH%"
    if errorlevel 1 exit /b 1
    "%SERVICE_PYTHON%" -c "import torch; raise SystemExit(0 if torch.cuda.is_available() else 1)" >nul 2>&1
    if errorlevel 1 (
        echo Installing CUDA-enabled PyTorch for the NVIDIA GPU on drive D...
        "%SERVICE_PYTHON%" -m pip install "torch==2.14.1+cu130" "torchaudio==2.11.0+cu130" --index-url https://download.pytorch.org/whl/cu130 --disable-pip-version-check
        if errorlevel 1 (
            echo Error: CUDA dependency installation failed. Service startup cancelled.
            exit /b 1
        )
    )
    "%SERVICE_PYTHON%" -c "import torch; print('TTS GPU:', torch.cuda.get_device_name(0)); assert torch.cuda.is_available()"
    if errorlevel 1 (
        echo Error: NVIDIA GPU could not be initialized. Service startup cancelled.
        exit /b 1
    )
)

echo Starting Post-Processing FastAPI Service...
"%SERVICE_PYTHON%" "%CD%\scripts\start_service.py"
exit /b %errorlevel%
