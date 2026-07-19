# 002-002 Shared JSON Store And Repository Write Contract

## 1. Goal

Create one shared JSON read/write utility for all runtime JSON repositories and managers.

This phase reduces duplicated file write code and prevents Windows `EPERM` rename issues from appearing in each module separately.

## 2. Business Requirement

Community, credit ledger, remix events, comparisons, and collections all mutate JSON during local development. These writes must be consistent, atomic, and testable.

## 3. Proposed File

```text
server/repositories/json/jsonFileStore.js
```

## 4. Required API

```text
ensureJsonFile(filePath, fallbackValue) -> Promise<void>
readJsonFile(filePath, fallbackValue) -> Promise<any>
writeJsonFileAtomic(filePath, data, options?) -> Promise<void>
mutateJsonFile(filePath, fallbackValue, operation) -> Promise<any>
```

## 5. Write Contract

`writeJsonFileAtomic` must:

```text
mkdir parent folder
write temp file in same folder
rename temp file to target
retry EPERM / EBUSY on Windows
write formatted JSON with trailing newline
remove temp file after unrecoverable failure if safe
```

## 6. Modules To Refactor

Refactor write logic in:

```text
server/collectionManager.js
server/creditManager.js
server/communityServices.js
server/comparison/ComparisonRepository.js
```

Optional if touched:

```text
server/queueManager.js
server/historyRepository.js
```

## 7. Do Not Change

- Do not change API response shapes.
- Do not move functional files yet.
- Do not introduce a database dependency.
- Do not introduce a build step.

## 8. Implementation Plan

1. Create `server/repositories/json/jsonFileStore.js`.
2. Add tests using temporary JSON files.
3. Refactor `communityServices.js` first because it already has a local `safeWriteJson`.
4. Refactor `ComparisonRepository.js`.
5. Refactor `collectionManager.js`.
6. Refactor `creditManager.js`.
7. Re-run JSON validation.

## 9. Acceptance Checklist

```text
Only one JSON atomic writer exists.
No duplicate safeWriteJson helper remains in community/comparison modules.
Repeated writes preserve valid JSON.
EPERM/EBUSY retry is covered.
Repository and manager public APIs still work.
```

## 10. Suggested Tests

```text
test/jsonFileStore.test.js
TC-002-002-001 read missing file returns fallback.
TC-002-002-002 write creates parent folder.
TC-002-002-003 mutate updates data and returns operation result.
TC-002-002-004 repeated writes keep valid JSON.
```

Ask the user to run:

```powershell
node --test test/jsonFileStore.test.js
node --check server/repositories/json/jsonFileStore.js
```

## 11. Rollback

If the shared writer causes issues, revert only the affected module to its previous writer and keep `jsonFileStore.js` for isolated testing.
