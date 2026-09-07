param(
  [string]$SourceDirectory,
  [string]$BackupDirectory,
  [string]$Date = (Get-Date -Format 'yyyy-MM-dd')
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $SourceDirectory) {
  $SourceDirectory = Join-Path $projectRoot 'server\data'
}
if (-not $BackupDirectory) {
  $BackupDirectory = Join-Path $projectRoot '_temp\server-data-backups'
}

$sourcePath = [System.IO.Path]::GetFullPath($SourceDirectory)
$backupPath = [System.IO.Path]::GetFullPath($BackupDirectory)
$sourcePrefix = $sourcePath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
  throw "Server data directory does not exist: $sourcePath"
}
if ($backupPath.Equals($sourcePath, [System.StringComparison]::OrdinalIgnoreCase) -or
  $backupPath.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backup directory must remain outside server/data.'
}
if ($Date -notmatch '^\d{4}-\d{2}-\d{2}$') {
  throw 'Backup date must use YYYY-MM-DD.'
}

New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
$destination = Join-Path $backupPath "server-data-$Date.zip"
$temporary = Join-Path $backupPath "server-data-$Date.$PID.tmp.zip"

try {
  Compress-Archive -LiteralPath $sourcePath -DestinationPath $temporary -CompressionLevel Optimal -Force
  if (-not (Test-Path -LiteralPath $temporary -PathType Leaf)) {
    throw 'Server data backup archive was not created.'
  }
  Move-Item -LiteralPath $temporary -Destination $destination -Force
} finally {
  if (Test-Path -LiteralPath $temporary) {
    Remove-Item -LiteralPath $temporary -Force
  }
}

Write-Host "Server data backup: $destination"
