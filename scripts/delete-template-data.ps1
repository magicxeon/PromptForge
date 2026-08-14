[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Id,

  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $projectRoot 'server\data'
$backupRoot = Join-Path $projectRoot '_temp\manual-template-delete-backups'

$paths = [ordered]@{
  posts = Join-Path $dataRoot 'community\communityPosts.json'
  engagementDaily = Join-Path $dataRoot 'community\engagementDailyAggregates.json'
  engagementEvents = Join-Path $dataRoot 'community\engagementEvents.json'
  templates = Join-Path $dataRoot 'templates\templates.json'
  versions = Join-Path $dataRoot 'templates\versions.json'
  useSessions = Join-Path $dataRoot 'templates\useSessions.json'
  usageEvents = Join-Path $dataRoot 'templates\usageEvents.json'
  poseProxies = Join-Path $dataRoot 'template-pose-proxy\poseProxies.json'
}

function Read-JsonArray {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required data file was not found: $Path"
  }

  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    throw "Required data file is empty: $Path"
  }

  $parsed = ConvertFrom-Json -InputObject $raw
  return @($parsed)
}

function Write-JsonArrayAtomically {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][object[]]$Value
  )

  $json = ConvertTo-Json -InputObject @($Value) -Depth 100
  $tempPath = "$Path.tmp"
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($tempPath, "$json`r`n", $utf8WithoutBom)
  Move-Item -LiteralPath $tempPath -Destination $Path -Force
}

function New-StringSet {
  return New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::Ordinal)
}

function Add-NonEmptyValue {
  param(
    [Parameter(Mandatory = $true)]$Set,
    $Value
  )

  if (-not [string]::IsNullOrWhiteSpace([string]$Value)) {
    [void]$Set.Add([string]$Value)
  }
}

function Get-PropertyValue {
  param(
    $Object,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if ($null -eq $Object) {
    return $null
  }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return $null
  }
  return $property.Value
}

function Contains-Any {
  param(
    $Value,
    [Parameter(Mandatory = $true)]$Set
  )

  return -not [string]::IsNullOrWhiteSpace([string]$Value) -and $Set.Contains([string]$Value)
}

$records = @{}
foreach ($entry in $paths.GetEnumerator()) {
  $records[$entry.Key] = Read-JsonArray -Path $entry.Value
}

$postIds = New-StringSet
$templateIds = New-StringSet
$versionIds = New-StringSet

if ($Id.StartsWith('post_', [System.StringComparison]::Ordinal)) {
  $matchingPosts = @($records.posts | Where-Object { $_.id -eq $Id })
  if ($matchingPosts.Count -eq 0) {
    throw "Community post was not found: $Id"
  }
  Add-NonEmptyValue $postIds $Id
  foreach ($post in $matchingPosts) {
    Add-NonEmptyValue $templateIds (Get-PropertyValue $post 'templateId')
    Add-NonEmptyValue $versionIds (Get-PropertyValue $post 'templateVersionId')
  }
}
elseif ($Id.StartsWith('tmplv_', [System.StringComparison]::Ordinal)) {
  $matchingVersions = @($records.versions | Where-Object { $_.id -eq $Id })
  if ($matchingVersions.Count -eq 0) {
    throw "Template version was not found: $Id"
  }
  Add-NonEmptyValue $versionIds $Id
  foreach ($version in $matchingVersions) {
    Add-NonEmptyValue $templateIds (Get-PropertyValue $version 'templateId')
  }
}
elseif ($Id.StartsWith('tmpl_', [System.StringComparison]::Ordinal)) {
  $matchingTemplates = @($records.templates | Where-Object { $_.id -eq $Id })
  if ($matchingTemplates.Count -eq 0) {
    throw "Template was not found: $Id"
  }
  Add-NonEmptyValue $templateIds $Id
}
else {
  throw "Unsupported ID '$Id'. Use a post_, tmpl_, or tmplv_ ID."
}

# Expand the complete lineage before deciding what can be deleted.
foreach ($version in $records.versions) {
  if ((Contains-Any (Get-PropertyValue $version 'id') $versionIds) -or
      (Contains-Any (Get-PropertyValue $version 'templateId') $templateIds)) {
    Add-NonEmptyValue $versionIds (Get-PropertyValue $version 'id')
    Add-NonEmptyValue $templateIds (Get-PropertyValue $version 'templateId')
  }
}
foreach ($post in $records.posts) {
  if ((Contains-Any (Get-PropertyValue $post 'id') $postIds) -or
      (Contains-Any (Get-PropertyValue $post 'templateId') $templateIds) -or
      (Contains-Any (Get-PropertyValue $post 'templateVersionId') $versionIds)) {
    Add-NonEmptyValue $postIds (Get-PropertyValue $post 'id')
    Add-NonEmptyValue $templateIds (Get-PropertyValue $post 'templateId')
    Add-NonEmptyValue $versionIds (Get-PropertyValue $post 'templateVersionId')
  }
}

$matches = [ordered]@{}
$matches.posts = @($records.posts | Where-Object { Contains-Any (Get-PropertyValue $_ 'id') $postIds })
$matches.templates = @($records.templates | Where-Object { Contains-Any (Get-PropertyValue $_ 'id') $templateIds })
$matches.versions = @($records.versions | Where-Object {
  (Contains-Any (Get-PropertyValue $_ 'id') $versionIds) -or
  (Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds)
})
$matches.useSessions = @($records.useSessions | Where-Object {
  (Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds) -or
  (Contains-Any (Get-PropertyValue $_ 'templateVersionId') $versionIds) -or
  (Contains-Any (Get-PropertyValue $_ 'sourceCommunityPostId') $postIds)
})
$matches.usageEvents = @($records.usageEvents | Where-Object {
  (Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds) -or
  (Contains-Any (Get-PropertyValue $_ 'templateVersionId') $versionIds) -or
  (Contains-Any (Get-PropertyValue $_ 'sourceCommunityPostId') $postIds)
})
$matches.poseProxies = @($records.poseProxies | Where-Object {
  (Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds) -or
  (Contains-Any (Get-PropertyValue $_ 'templateVersionId') $versionIds)
})
$matches.engagementDaily = @($records.engagementDaily | Where-Object {
  Contains-Any (Get-PropertyValue $_ 'postId') $postIds
})
$matches.engagementEvents = @($records.engagementEvents | Where-Object {
  Contains-Any (Get-PropertyValue $_ 'postId') $postIds
})

Write-Host ''
Write-Host 'Template hard-delete plan' -ForegroundColor Yellow
Write-Host "Input ID: $Id"
Write-Host "Post IDs: $([string]::Join(', ', @($postIds)))"
Write-Host "Template IDs: $([string]::Join(', ', @($templateIds)))"
Write-Host "Version IDs: $([string]::Join(', ', @($versionIds)))"
Write-Host ''
Write-Host ('Community posts:       {0}' -f $matches.posts.Count)
Write-Host ('Templates:             {0}' -f $matches.templates.Count)
Write-Host ('Template versions:     {0}' -f $matches.versions.Count)
Write-Host ('Use sessions:          {0}' -f $matches.useSessions.Count)
Write-Host ('Pose proxies:          {0}' -f $matches.poseProxies.Count)
Write-Host ('Engagement aggregates: {0}' -f $matches.engagementDaily.Count)
Write-Host ('Engagement events:     {0}' -f $matches.engagementEvents.Count)
Write-Host ('Recorded usage events: {0}' -f $matches.usageEvents.Count)

if ($matches.posts.Count -eq 0 -or $matches.templates.Count -eq 0) {
  throw 'The resolved lineage is incomplete. No data was changed.'
}

if ($matches.usageEvents.Count -gt 0) {
  Write-Host ''
  Write-Host 'DELETE BLOCKED: this Template has recorded usage or revenue events.' -ForegroundColor Red
  Write-Host 'Retire the Template instead so Credit and creator earning history remains valid.' -ForegroundColor Red
  exit 2
}

if (-not $Apply) {
  Write-Host ''
  Write-Host 'Preview only. No files were changed.' -ForegroundColor Cyan
  exit 0
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$safeId = $Id -replace '[^A-Za-z0-9_-]', '_'
$backupDirectory = Join-Path $backupRoot "$timestamp-$safeId"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

$changedKeys = @(
  'posts',
  'templates',
  'versions',
  'useSessions',
  'poseProxies',
  'engagementDaily',
  'engagementEvents'
) | Where-Object { $matches[$_].Count -gt 0 }

foreach ($key in $changedKeys) {
  Copy-Item -LiteralPath $paths[$key] -Destination (Join-Path $backupDirectory (Split-Path $paths[$key] -Leaf))
}

$remaining = @{}
$remaining.posts = @($records.posts | Where-Object {
  -not (Contains-Any (Get-PropertyValue $_ 'id') $postIds)
})
$remaining.templates = @($records.templates | Where-Object {
  -not (Contains-Any (Get-PropertyValue $_ 'id') $templateIds)
})
$remaining.versions = @($records.versions | Where-Object {
  -not ((Contains-Any (Get-PropertyValue $_ 'id') $versionIds) -or
    (Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds))
})
$remaining.useSessions = @($records.useSessions | Where-Object {
  -not ((Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds) -or
    (Contains-Any (Get-PropertyValue $_ 'templateVersionId') $versionIds) -or
    (Contains-Any (Get-PropertyValue $_ 'sourceCommunityPostId') $postIds))
})
$remaining.poseProxies = @($records.poseProxies | Where-Object {
  -not ((Contains-Any (Get-PropertyValue $_ 'templateId') $templateIds) -or
    (Contains-Any (Get-PropertyValue $_ 'templateVersionId') $versionIds))
})
$remaining.engagementDaily = @($records.engagementDaily | Where-Object {
  -not (Contains-Any (Get-PropertyValue $_ 'postId') $postIds)
})
$remaining.engagementEvents = @($records.engagementEvents | Where-Object {
  -not (Contains-Any (Get-PropertyValue $_ 'postId') $postIds)
})

foreach ($key in $changedKeys) {
  Write-JsonArrayAtomically -Path $paths[$key] -Value $remaining[$key]
}

Write-Host ''
Write-Host 'Template data deleted successfully.' -ForegroundColor Green
Write-Host "Backup: $backupDirectory"
Write-Host 'Generated source images, Generation history, jobs, Credit ledger, and usage history were not deleted.'
