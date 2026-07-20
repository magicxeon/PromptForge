# 010-008 Character Sheet Persistence, History and Story Handoff

**Status:** Implemented - Persistence Baseline  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-002, 010-005, 010-007

## Objective

Define how generated character sheets are saved and handed off to Story Mode.

## Saved Sheet Configuration

Store semantic IDs:

```json
{
  "version": 1,
  "mode": "character-sheet",
  "sourceHeadshotId": "history-or-saved-character-id",
  "identitySelectionIds": {},
  "bodySelectionIds": {},
  "outfitSource": {
    "type": "preset",
    "frontReferenceId": null,
    "backReferenceId": null
  },
  "outfitSelectionIds": {},
  "layout": {
    "type": "front-side-back"
  }
}
```

## History Metadata

Generated sheet result should record:

- source headshot/config ID
- identity selections
- body selections
- outfit source
- uploaded outfit reference IDs
- sheet layout
- provider/model
- final submitted prompt
- generated image URL
- Story Mode reusable reference flag

## Story Mode Handoff

Story Mode should be able to consume the generated sheet as:

```json
{
  "referenceType": "character-sheet",
  "sourceJobId": "job-id",
  "identityLocked": true,
  "outfitLocked": true
}
```

## Acceptance Criteria

- Generated sheet can be selected as Story Mode character reference.
- History reconstructs the sheet setup.
- Raw outfit uploads remain private inputs unless explicitly shared later.

## Implementation Log

### 2026-07-18 - Character Sheet History Snapshot

- Added server-side `characterSheetConfig` snapshot creation for Character Sheet generations.
- Snapshot stores semantic selection IDs only:
  - identity selection IDs
  - body selection IDs
  - outfit selection IDs
  - sheet layout ID
  - source headshot job IDs
  - outfit reference job IDs
  - source ownership summary
- Raw outfit upload image data is not copied into history metadata.
- Queue history entries now persist:
  - `characterSheetConfig`
  - `storyReferenceHandoff`
- `storyReferenceHandoff.sourceJobId` is filled with the completed generation job id.
- Lightbox lineage now includes outfit reference parents with an `O` badge.

Verified:

```bash
node --test test/characterSheetPersistence.test.js test/referenceUtils.test.js test/modeSpecificCharacterReference.test.js
```

Deferred:

- Dedicated "Use as Story Character Reference" action from Character Sheet history card.
- Saved named Character Sheet library.
- Sharing/public privacy controls for raw outfit uploads.
