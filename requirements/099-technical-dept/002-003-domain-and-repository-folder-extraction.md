# 002-003 Domain And Repository Folder Extraction

## 1. Goal

Move functional server modules into clear domain and repository folders without changing runtime behavior.

This phase should happen after data paths and shared JSON writes are stable.

## 2. Business Requirement

Developers should be able to locate generation, credits, collections, community, identity, scene-template, and comparison logic by folder. This also prepares for future repository swaps during DB migration.

## 3. Target Functional Folders

```text
server/domain/
server/repositories/
```

## 4. Generation Mapping

| Current | Target |
| --- | --- |
| `server/queueManager.js` | `server/domain/generation/QueueManager.js` |
| `server/generationRequestService.js` | `server/domain/generation/generationRequestService.js` |
| `server/promptCompiler.js` | `server/domain/generation/promptCompiler.js` |
| `server/referenceUtils.js` | `server/domain/generation/referenceUtils.js` |
| `server/imageUtils.js` | `server/domain/generation/imageUtils.js` |
| `server/thumbnailService.js` | `server/domain/generation/thumbnailService.js` |
| `server/historyRepository.js` | `server/repositories/generation/HistoryRepository.js` |

## 5. Collections And Credits Mapping

| Current | Target |
| --- | --- |
| `server/collectionManager.js` | `server/domain/collections/CollectionManager.js` |
| `server/creditManager.js` | `server/domain/credits/CreditManager.js` |

Future split, not required immediately:

```text
server/repositories/collections/CollectionRepository.js
server/repositories/credits/CreditAccountRepository.js
server/repositories/credits/CreditLedgerRepository.js
```

## 6. Community Mapping

Split later only if tests are ready:

| Current | Target |
| --- | --- |
| `server/communityServices.js` | `server/domain/community/CommunityShareService.js` |
| local post repository in `communityServices.js` | `server/repositories/community/CommunityPostRepository.js` |
| local remix repository in `communityServices.js` | `server/repositories/community/RemixEventRepository.js` |

## 7. Scene Template Mapping

| Current | Target |
| --- | --- |
| `server/sceneTemplates/*` | `server/domain/scene-templates/*` |

## 8. Comparison Mapping

| Current | Target |
| --- | --- |
| `server/comparison/ComparisonOrchestrator.js` | `server/domain/comparisons/ComparisonOrchestrator.js` |
| `server/comparison/ComparisonValidator.js` | `server/domain/comparisons/ComparisonValidator.js` |
| `server/comparison/ComparisonRepository.js` | `server/repositories/comparisons/ComparisonRepository.js` |

## 9. Identity Mapping

| Current | Target |
| --- | --- |
| `server/identity/mockActorContext.js` | `server/domain/identity/mockActorContext.js` |
| `server/identity/MockUserRepository.js` | `server/repositories/identity/MockUserRepository.js` |

## 10. Compatibility Re-Export Rule

When moving a high-impact file, keep a temporary re-export in the old location:

```js
export * from './domain/generation/QueueManager.js';
export { queueManager } from './domain/generation/QueueManager.js';
```

Use this for one phase only. Remove in `002-005`.

## 11. Implementation Plan

Move one module group at a time:

1. Move identity repository/domain helpers.
2. Move history repository.
3. Move generation helpers.
4. Move queue manager.
5. Move scene template modules.
6. Move comparison modules.
7. Move collections and credits.
8. Split community service only after prior moves are stable.

After each group:

```text
update imports
add temporary re-export if needed
ask user to run node --check
manual smoke test affected feature
```

## 12. Acceptance Checklist

```text
Server starts without import errors.
No duplicate functional source of truth exists.
Old compatibility files are marked temporary.
Providers still generate.
History still loads.
Credits still deduct.
Collections still work.
Scene Template tests still pass.
Mock actor tests still pass.
```

## 13. Suggested Checks

Ask the user to run checks based on moved modules:

```powershell
node --check server/domain/generation/QueueManager.js
node --check server/repositories/generation/HistoryRepository.js
node --check server/domain/scene-templates/SceneTemplateValidator.js
node --test test/mockActorContext.test.js
node --test test/sceneTemplateSnapshot.test.js
```

## 14. Rollback

If an import move fails:

1. Restore temporary re-export file.
2. Point broken imports to old path.
3. Move a smaller group next time.
