# 002-001 Server Data Relocation And Path Resolver

## 1. Goal

Move runtime JSON files out of the `server/` root into `server/data/`, then make every module read paths from a central resolver instead of hardcoding file locations.

This phase should not move functional JavaScript files yet.

## 2. Business Requirement

Developers must be able to distinguish runtime state from application code immediately. This is important before Community, billing, and future database migration make the amount of runtime data much larger.

## 3. Current Data Files

```text
server/history.json
server/collections.json
server/database.json
server/communityPosts.json
server/remixEvents.json
server/comparisons.json
server/identity/mockUsers.json
server/migrations/backups/*
server/migrations/checkpoints/*
server/migrations/reports/*
```

## 4. Target Data Structure

```text
server/data/
  identity/
    mockUsers.json
  generation/
    history.json
  collections/
    collections.json
  credits/
    database.json
  community/
    communityPosts.json
    remixEvents.json
  comparisons/
    comparisons.json
  migrations/
    backups/
    checkpoints/
    reports/
```

## 5. File Mapping

| Current | Target |
| --- | --- |
| `server/history.json` | `server/data/generation/history.json` |
| `server/collections.json` | `server/data/collections/collections.json` |
| `server/database.json` | `server/data/credits/database.json` |
| `server/communityPosts.json` | `server/data/community/communityPosts.json` |
| `server/remixEvents.json` | `server/data/community/remixEvents.json` |
| `server/comparisons.json` | `server/data/comparisons/comparisons.json` |
| `server/identity/mockUsers.json` | `server/data/identity/mockUsers.json` |
| `server/migrations/backups/*` | `server/data/migrations/backups/*` |
| `server/migrations/checkpoints/*` | `server/data/migrations/checkpoints/*` |
| `server/migrations/reports/*` | `server/data/migrations/reports/*` |

## 6. Proposed New File

Create:

```text
server/config/paths.js
```

Required exports:

```text
PROJECT_ROOT
SERVER_ROOT
CLIENT_ROOT
OUTPUTS_DIR
DATA_ROOT
IDENTITY_DATA_DIR
GENERATION_DATA_DIR
COLLECTIONS_DATA_DIR
CREDITS_DATA_DIR
COMMUNITY_DATA_DIR
COMPARISONS_DATA_DIR
MIGRATIONS_DATA_DIR
DATA_FILES
resolveDataFile(name)
```

`DATA_FILES` must include:

```text
mockUsers
history
collections
database
communityPosts
remixEvents
comparisons
```

## 7. Compatibility Path Rule

During this phase, the path resolver should support old-path fallback:

```text
if new target file exists:
  use new target file
else if old root file exists:
  use old root file
else:
  create/use new target file
```

This prevents one missed move from breaking local development.

## 8. Modules To Update In This Phase

Update only path imports/constructor defaults in:

```text
server/historyRepository.js
server/queueManager.js
server/collectionManager.js
server/creditManager.js
server/communityServices.js
server/comparison/ComparisonRepository.js
server/identity/MockUserRepository.js
server/thumbnailService.js
```

Do not move these files yet.

## 9. Temporary Files

Files like:

```text
server/.comparisons.json.*.tmp
```

must not be silently deleted. Document them and ask for approval before deletion or archival.

## 10. Implementation Plan

1. Create `server/config/paths.js`.
2. Add folder structure under `server/data/`.
3. Move JSON data files to target folders.
4. Update modules to import `DATA_FILES` or `OUTPUTS_DIR`.
5. Keep old-path fallback temporarily.
6. Validate all JSON files.
7. Start server and smoke test manually.

## 11. Acceptance Checklist

```text
server/data/* exists.
Runtime JSON files are present under server/data.
Modules no longer hardcode root JSON paths.
Demo User history still loads.
Credit balance still loads.
Collections still load.
Community shared templates still load.
Comparisons still load.
Mock user switching still isolates history.
```

## 12. Suggested Verification

Ask the user to run:

```powershell
node --check server/server.js
node --check server/config/paths.js
node --check server/historyRepository.js
node --check server/queueManager.js
node --check server/collectionManager.js
```

PowerShell JSON validation:

```powershell
$files = Get-ChildItem server/data -Recurse -Filter *.json
foreach ($file in $files) {
  try {
    Get-Content -Raw $file.FullName | ConvertFrom-Json | Out-Null
    Write-Output "OK $($file.FullName)"
  } catch {
    Write-Output "BAD $($file.FullName) :: $($_.Exception.Message)"
  }
}
```

## 13. Rollback

If something fails:

1. Restore old root JSON files from backup.
2. Keep `paths.js` old-path fallback enabled.
3. Point affected module back to old file path.
4. Retry one data file at a time.
