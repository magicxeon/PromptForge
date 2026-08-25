[CmdletBinding()]
param(
  [string]$Id,
  [string]$OwnerUserId,
  [ValidateRange(0, 87600)]
  [int]$OlderThanHours = 0,
  [switch]$Apply,
  [string]$DataRoot,
  [string]$BackupRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($DataRoot)) {
  $DataRoot = Join-Path $projectRoot 'server\data'
}
$tasksPath = Join-Path $DataRoot 'generation\videoProviderTasks.json'
$projectsPath = Join-Path $DataRoot 'cinematic\projects.json'
if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
  $BackupRoot = Join-Path $projectRoot '_temp\manual-video-cleanup-backups'
}
$terminalFailureStatuses = @('failed', 'cancelled', 'expired')

if ([string]::IsNullOrWhiteSpace($Id) -and $OlderThanHours -le 0) {
  throw 'Provide -Id for one Video Task or -OlderThanHours for a bounded bulk cleanup.'
}

function Read-JsonObject {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { throw "Required data file was not found: $Path" }
  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) { throw "Required data file is empty: $Path" }
  return ConvertFrom-Json -InputObject $raw
}

function Write-JsonObjectAtomically {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)]$Value)
  $json = ConvertTo-Json -InputObject $Value -Depth 100
  $tempPath = "$Path.tmp"
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($tempPath, "$json`r`n", $utf8WithoutBom)
  Move-Item -LiteralPath $tempPath -Destination $Path -Force
}

function Get-Value {
  param($Object, [Parameter(Mandatory = $true)][string]$Name)
  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Has-VideoOutput {
  param($Task)
  $asset = Get-Value $Task 'outputAsset'
  if ($null -eq $asset) { return $false }
  return -not [string]::IsNullOrWhiteSpace([string](Get-Value $asset 'publicUrl'))
}

function Get-BlockReason {
  param($Task, $Projects)
  $status = [string](Get-Value $Task 'status')
  if ($terminalFailureStatuses -notcontains $status) { return "status '$status' is not a removable terminal failure" }
  if (Has-VideoOutput $Task) { return 'a durable Video output exists' }
  $reservationId = [string](Get-Value $Task 'reservationId')
  $billingStatus = [string](Get-Value $Task 'billingStatus')
  if (-not [string]::IsNullOrWhiteSpace($reservationId) -and $billingStatus -ne 'refunded') {
    return "Credit reservation '$reservationId' is not refunded (billingStatus='$billingStatus')"
  }
  $taskId = [string](Get-Value $Task 'id')
  foreach ($project in @($Projects)) {
    foreach ($attempt in @((Get-Value $project 'generationAttempts'))) {
      if ([string](Get-Value $attempt 'generationJobId') -ne $taskId) { continue }
      $attemptId = [string](Get-Value $attempt 'id')
      if ([string](Get-Value $attempt 'status') -eq 'approved') { return "Cinematic Attempt '$attemptId' is approved" }
      foreach ($scene in @((Get-Value $project 'scenes'))) {
        foreach ($shot in @((Get-Value $scene 'shots'))) {
          if ([string](Get-Value $shot 'approvedVideoAttemptId') -eq $attemptId) {
            return "Cinematic Shot '$([string](Get-Value $shot 'id'))' approves Attempt '$attemptId'"
          }
        }
      }
    }
  }
  return $null
}

$taskStore = Read-JsonObject -Path $tasksPath
$projectStore = Read-JsonObject -Path $projectsPath
$allTasks = @((Get-Value $taskStore 'tasks'))
$allProjects = @((Get-Value $projectStore 'projects'))
$cutoff = if ($OlderThanHours -gt 0) { (Get-Date).ToUniversalTime().AddHours(-$OlderThanHours) } else { $null }

$selected = @($allTasks | Where-Object {
  $matchesId = [string]::IsNullOrWhiteSpace($Id) -or [string](Get-Value $_ 'id') -eq $Id
  $matchesOwner = [string]::IsNullOrWhiteSpace($OwnerUserId) -or [string](Get-Value $_ 'ownerUserId') -eq $OwnerUserId
  $updatedAt = Get-Value $_ 'updatedAt'
  $matchesAge = $null -eq $cutoff -or (-not [string]::IsNullOrWhiteSpace([string]$updatedAt) -and ([DateTime]$updatedAt).ToUniversalTime() -le $cutoff)
  $matchesId -and $matchesOwner -and $matchesAge
})

if (-not [string]::IsNullOrWhiteSpace($Id) -and $selected.Count -eq 0) {
  throw "Video Task was not found or did not match the owner filter: $Id"
}

$eligible = @()
$blocked = @()
foreach ($task in $selected) {
  $reason = Get-BlockReason -Task $task -Projects $allProjects
  if ($null -eq $reason) { $eligible += $task }
  else { $blocked += [PSCustomObject]@{ id = [string](Get-Value $task 'id'); reason = $reason } }
}

Write-Host ''
Write-Host 'Failed Video cleanup plan' -ForegroundColor Yellow
Write-Host "Data root: $DataRoot"
if (-not [string]::IsNullOrWhiteSpace($Id)) { Write-Host "Task ID: $Id" }
if (-not [string]::IsNullOrWhiteSpace($OwnerUserId)) { Write-Host "Owner: $OwnerUserId" }
if ($OlderThanHours -gt 0) { Write-Host "Older than: $OlderThanHours hour(s)" }
Write-Host "Selected: $($selected.Count)"
Write-Host "Eligible: $($eligible.Count)"
Write-Host "Blocked: $($blocked.Count)"
foreach ($item in $eligible) { Write-Host "  REMOVE $([string](Get-Value $item 'id'))" -ForegroundColor Green }
foreach ($item in $blocked) { Write-Host "  KEEP   $($item.id) - $($item.reason)" -ForegroundColor Red }

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Preview only. No files were changed.' -ForegroundColor Cyan
  exit 0
}
if ($eligible.Count -eq 0) {
  Write-Host ''
  Write-Host 'No eligible Video Tasks. No files were changed.' -ForegroundColor Cyan
  exit 0
}

$eligibleIds = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
foreach ($task in $eligible) { [void]$eligibleIds.Add([string](Get-Value $task 'id')) }

$changedProjects = 0
foreach ($project in $allProjects) {
  $attempts = @((Get-Value $project 'generationAttempts'))
  $keptAttempts = @($attempts | Where-Object { -not $eligibleIds.Contains([string](Get-Value $_ 'generationJobId')) })
  if ($keptAttempts.Count -eq $attempts.Count) { continue }
  $project.generationAttempts = $keptAttempts
  $project.version = [int](Get-Value $project 'version') + 1
  $project.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  if ([string](Get-Value $project 'status') -eq 'failed_recoverable') {
    $remainingFailure = @($keptAttempts | Where-Object { [string](Get-Value $_ 'status') -eq 'failed' }).Count -gt 0
    if (-not $remainingFailure) { $project.status = 'storyboard_ready' }
  }
  $changedProjects += 1
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDirectory = Join-Path $BackupRoot $timestamp
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
Copy-Item -LiteralPath $tasksPath -Destination (Join-Path $backupDirectory 'videoProviderTasks.json')
Copy-Item -LiteralPath $projectsPath -Destination (Join-Path $backupDirectory 'cinematicProjects.json')

$taskStore.tasks = @($allTasks | Where-Object { -not $eligibleIds.Contains([string](Get-Value $_ 'id')) })
$projectStore.projects = $allProjects
Write-JsonObjectAtomically -Path $projectsPath -Value $projectStore
Write-JsonObjectAtomically -Path $tasksPath -Value $taskStore

Write-Host ''
Write-Host "Removed $($eligible.Count) failed Video Task(s)." -ForegroundColor Green
Write-Host "Updated $changedProjects Cinematic Project(s)."
Write-Host "Backup: $backupDirectory"
Write-Host 'Credit estimates, reservations and ledger entries were preserved.'
