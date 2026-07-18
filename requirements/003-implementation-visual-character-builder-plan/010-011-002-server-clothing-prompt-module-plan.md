# 010-011-002 Server Clothing Prompt Module Plan

**Status:** Draft  
**Parent:** 010-011  
**Depends on:** 010-004, 010-009

## Objective

Create a server-side clothing prompt helper so the server compiler remains canonical and testable.

## Proposed File

```text
server/clothing/clothingPromptParts.js
```

## Responsibilities

- normalize selected clothing fields
- apply source priority
- compile modest fallback
- compile modular clothing parts
- omit conflicting or duplicate fragments
- expose pure functions for tests

## Public Functions Draft

```js
compileClothingPromptParts(selections, referenceState)
getClothingSourceOwnership(selections, referenceState)
cleanupClothingPromptParts(parts)
```

## Acceptance Criteria

- Server compiler calls the helper instead of inline clothing branching.
- Helper has unit tests.
- Upload override behavior is covered.
- Fallback safety words are covered.
