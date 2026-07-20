# 002-005 Cleanup Documentation And Final Validation

## 1. Goal

Remove temporary compatibility files and old path fallbacks after the server folder reorganization is stable.

This phase is cleanup only. Do not start it until phases `002-001` through `002-004` are complete and verified.

## 2. Cleanup Scope

Remove:

```text
old root JSON runtime files
temporary compatibility re-export files
old path fallback logic in server/config/paths.js
duplicate JSON write helpers
unused imports from old paths
documented obsolete temp files after user approval
```

Do not remove:

```text
server/data/*
client/outputs/*
provider config files
migration backup files without user approval
```

## 3. Documentation Updates

Update or create:

```text
server/data/README.md
server/domain/README.md
server/repositories/README.md
requirements/requirements.md
requirements/007-technical-dept/000-master.md
```

## 4. `server/data/README.md` Must Explain

```text
which JSON files are runtime state
which files are safe to seed
which files should be backed up
which files are local-only mocks
how paths map to future DB tables
```

## 5. `server/domain/README.md` Must Explain

```text
domain modules contain business behavior
domain modules do not read JSON directly unless documented legacy bridge
domain modules should depend on repository contracts
```

## 6. `server/repositories/README.md` Must Explain

```text
repositories isolate storage
JSON repository adapters are temporary local storage
future DB adapters should preserve method contracts
```

## 7. Final Validation Checklist

```text
No runtime JSON remains directly under server/.
No module imports old moved functional paths except approved compatibility files.
No approved compatibility files remain by the end.
No duplicate safeWriteJson helper remains.
server/server.js is mostly bootstrap.
Mock user switching still isolates history/collections.
Generation still works.
Credits still deduct/refund.
Scene Template sharing still works.
Community shared templates still list/use.
Comparisons still work.
```

## 8. Suggested Search Commands

```powershell
rg -n "history\\.json|database\\.json|collections\\.json|communityPosts\\.json|remixEvents\\.json|comparisons\\.json|mockUsers\\.json" server
rg -n "safeWriteJson|fs\\.writeFile\\(|fs\\.rename\\(" server
rg -n "from './queueManager|from './historyRepository|from './collectionManager|from './creditManager" server
```

Use the output to find leftovers. Some references inside `server/config/paths.js` and documentation are expected.

## 9. Suggested Checks

Ask the user to run:

```powershell
node --check server/server.js
node --test test/mockActorContext.test.js
node --test test/referenceValueNormalization.test.js
node --test test/sceneTemplateSnapshot.test.js
node --test test/sceneVariableResolver.test.js
```

## 10. Manual Final Smoke Test

```text
1. Start server.
2. Open app.
3. Switch to Demo User.
4. Confirm history appears.
5. Switch to Alice/Bob.
6. Confirm Demo history disappears.
7. Generate one image.
8. Confirm active queue completes.
9. Confirm generated image writes under client/outputs and its metadata writes under server/data/generation.
10. Create collection and add image.
11. Open image lightbox.
12. Share as Scene Template.
13. Use shared template.
14. Confirm credits changed correctly.
```

## 11. Rollback

Cleanup rollback should be simple:

```text
restore compatibility re-export files
restore old-path fallback in paths.js
restore documentation-only changes if confusing
```

Do not move data back to root unless the app cannot start and the issue cannot be fixed in path config.

## 12. Implementation Record

Completed cleanup actions:

```text
server/data/README.md created.
server/domain/README.md created.
server/repositories/README.md created.
requirements/requirements.md updated with the current server architecture.
requirements/007-technical-dept/000-master.md updated with the final Step 2 structure.
server/config/paths.js now resolves canonical server/data/* files only.
temporary root compatibility re-export files were removed.
server/app/* imports now point to domain/repository modules directly.
tests that imported removed wrappers were updated to direct domain/repository paths.
maintenance scripts now resolve canonical data files through server/config/paths.js.
QueueManager history JSON mutations now go through HistoryRepository.
```

Removed compatibility wrapper files:

```text
server/collectionManager.js
server/communityServices.js
server/creditManager.js
server/generationRequestService.js
server/historyRepository.js
server/imageUtils.js
server/promptCompiler.js
server/queueManager.js
server/referenceUtils.js
server/thumbnailService.js
server/identity/MockUserRepository.js
server/identity/mockActorContext.js
server/comparison/*
server/sceneTemplates/*
```

Expected remaining direct filesystem writes:

```text
server/repositories/json/jsonFileStore.js
server/domain/generation/QueueManager.js output image binary writes
server/domain/generation/thumbnailService.js thumbnail binary writes
```

These are allowed because JSON state is centralized through repositories, while generated images and thumbnails are static output assets.

## 13. Static Validation Record

Validation date: 2026-07-20

Completed without executing Node:

```text
PASS: server root contains only server.js as a regular source file.
PASS: no runtime JSON file remains directly under server/.
PASS: stale .comparisons.*.tmp file from the previous EPERM rename failure was removed.
PASS: compatibility re-export files no longer exist.
PASS: server, test, and maintenance-script imports point to domain/repository modules.
PASS: migration scripts resolve history, comparisons, and migration storage through server/config/paths.js.
PASS: oldPath fallback and duplicate safeWriteJson helpers are absent.
PASS: remaining fs.writeFile/fs.rename calls are limited to the shared atomic JSON store and image/thumbnail asset writes.
PASS: git diff --check reports no whitespace errors.
```

Pending user-executed validation:

```text
node syntax checks
targeted repository/domain tests
manual application smoke test
```
