$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$testRoot = Join-Path $projectRoot '_temp\test-server-data-backup'
$source = Join-Path $testRoot 'server\data'
$backup = Join-Path $testRoot 'backups'
$date = '2099-12-31'

try {
  $startDev = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'start-dev.bat') -Raw
  $backupIndex = $startDev.IndexOf('backup-server-data.ps1')
  $stopIndex = $startDev.IndexOf('start-dev.mjs --stop-existing')
  $buildIndex = $startDev.IndexOf('npm run build:web')
  $startIndex = $startDev.LastIndexOf('node scripts\start-dev.mjs')
  if ($backupIndex -lt 0 -or $backupIndex -le $stopIndex -or
    $backupIndex -gt $buildIndex -or $backupIndex -gt $startIndex) {
    throw 'start-dev.bat must run backup after stop and before build/start.'
  }

  New-Item -ItemType Directory -Path (Join-Path $source 'generation') -Force | Out-Null
  Set-Content -LiteralPath (Join-Path $source 'generation\history.json') -Value '[{"version":1}]' -Encoding utf8
  & (Join-Path $PSScriptRoot 'backup-server-data.ps1') -SourceDirectory $source -BackupDirectory $backup -Date $date

  $archive = Join-Path $backup "server-data-$date.zip"
  if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
    throw 'Daily archive is missing.'
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
  try {
    $entryNames = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
  } finally {
    $zip.Dispose()
  }
  if ($entryNames -notcontains 'data/generation/history.json') {
    throw 'Archive does not contain the expected data root and nested file.'
  }
  $firstWrite = (Get-Item -LiteralPath $archive).LastWriteTimeUtc

  Start-Sleep -Milliseconds 1100
  Set-Content -LiteralPath (Join-Path $source 'generation\history.json') -Value '[{"version":2}]' -Encoding utf8
  & (Join-Path $PSScriptRoot 'backup-server-data.ps1') -SourceDirectory $source -BackupDirectory $backup -Date $date
  $archives = @(Get-ChildItem -LiteralPath $backup -Filter '*.zip')
  if ($archives.Count -ne 1 -or $archives[0].LastWriteTimeUtc -le $firstWrite) {
    throw 'Same-date backup was not replaced.'
  }

  $failedAsExpected = $false
  try {
    & (Join-Path $PSScriptRoot 'backup-server-data.ps1') -SourceDirectory $source -BackupDirectory (Join-Path $source 'backups') -Date $date
  } catch {
    $failedAsExpected = $true
  }
  if (-not $failedAsExpected) {
    throw 'Backup directory inside server/data was not rejected.'
  }

  Write-Host 'Daily server data backup checks passed.'
} finally {
  if (Test-Path -LiteralPath $testRoot) {
    Remove-Item -LiteralPath $testRoot -Recurse -Force
  }
}
