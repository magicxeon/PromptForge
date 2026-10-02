param(
    [ValidateSet('OpenVoice', 'Thai')][string]$Mode = 'OpenVoice',
    [string]$ModelRoot = 'D:\development\temp\momelo-models',
    [string]$PythonExe = 'D:\applications\momelo-post-processing\venv\Scripts\python.exe'
)

$ErrorActionPreference = 'Stop'
$modelPath = [System.IO.Path]::GetFullPath($ModelRoot)
$expectedRoot = [System.IO.Path]::GetFullPath('D:\development\temp')
if (-not $modelPath.StartsWith($expectedRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Model downloads must stay under D:\development\temp.'
}
if (-not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
    throw "Python environment is missing: $PythonExe"
}
New-Item -ItemType Directory -Force -Path $modelPath | Out-Null
$env:HF_HOME = Join-Path $modelPath 'huggingface'
$env:TORCH_HOME = Join-Path $modelPath 'torch'
$env:PIP_CACHE_DIR = Join-Path $modelPath 'pip-cache'
if ($Mode -eq 'Thai') {
    $thaiPath = Join-Path $modelPath 'thonburian-tts'
    New-Item -ItemType Directory -Force -Path $thaiPath | Out-Null
    $files = @(
        @{ Name = 'mega_vocab.txt'; Url = 'https://huggingface.co/biodatlab/ThonburianTTS/resolve/main/megaF5/mega_vocab.txt' },
        @{ Name = 'mega_f5_last.safetensors'; Url = 'https://huggingface.co/biodatlab/ThonburianTTS/resolve/main/megaF5/mega_f5_last.safetensors' }
    )
    foreach ($file in $files) {
        $target = Join-Path $thaiPath $file.Name
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            Invoke-WebRequest -Uri $file.Url -OutFile $target
        }
        Get-FileHash -LiteralPath $target -Algorithm SHA256 | Select-Object Path, Hash
    }
    & $PythonExe -m pip install f5-tts
    if ($LASTEXITCODE -ne 0) { throw 'F5-TTS dependency installation failed.' }
    Write-Output "Set POST_PROCESSING_THAI_MODEL_PATH=$thaiPath before starting the service."
    return
}
$sourcePath = Join-Path $modelPath 'openvoice'
if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
    git clone --depth 1 https://github.com/myshell-ai/OpenVoice.git $sourcePath
    if ($LASTEXITCODE -ne 0) { throw 'OpenVoice source download failed.' }
}
& $PythonExe -m pip install -e $sourcePath
if ($LASTEXITCODE -ne 0) { throw 'OpenVoice dependency installation failed.' }
$archive = Join-Path $modelPath 'checkpoints_v2_0417.zip'
if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
    Invoke-WebRequest -Uri 'https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip' -OutFile $archive
}
if (-not (Test-Path -LiteralPath (Join-Path $sourcePath 'checkpoints_v2\converter\checkpoint.pth'))) {
    Expand-Archive -LiteralPath $archive -DestinationPath $sourcePath
}
$checkpoint = Join-Path $sourcePath 'checkpoints_v2\converter'
if (-not (Test-Path -LiteralPath (Join-Path $checkpoint 'config.json')) -or
    -not (Test-Path -LiteralPath (Join-Path $checkpoint 'checkpoint.pth'))) {
    throw 'OpenVoice converter checkpoint was not found after extraction.'
}
Get-FileHash -LiteralPath $archive -Algorithm SHA256 | Select-Object Path, Hash
Write-Output "Set POST_PROCESSING_OPENVOICE_CHECKPOINT=$checkpoint before starting the service."
