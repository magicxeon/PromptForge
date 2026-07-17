# 010-008 Persistence, History and Lineage

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-002, 010-005, 010-007

## Objective

Define how Character Reference configurations and generated outputs are saved and reconstructed.

## Saved Configuration

Store semantic IDs:

```json
{
  "version": 1,
  "mode": "character-reference",
  "canonicalCharacterId": "saved-headshot-id",
  "identitySelectionIds": {},
  "bodySelectionIds": {},
  "clothingSelectionIds": {},
  "clothingSource": {
    "type": "preset",
    "uploadedReferenceId": null
  },
  "layout": {
    "type": "front-side-back"
  },
  "colorOverrides": {}
}
```

Avoid storing labels as source of truth.

## History Metadata

Each generated result should record:

- mode
- source headshot/history ID
- selected canonical character ID
- selected semantic IDs
- uploaded clothing reference ID
- provider/model
- provider reference payload summary
- final submitted prompt
- admin override flag
- generation duration/status

## Lineage Rules

- A generated Character Reference should link back to source headshot.
- Uploaded clothing reference should list generated jobs that used it.
- Future community/marketplace sharing should be able to include or exclude uploaded private references.

## Migration Rules

- Legacy character-sheet results without visible clothing preset should map to `Character Sheet Baseline` when possible.
- Missing attributes should restore as text fallback, not crash.
- Deprecated IDs should migrate through explicit mapping.

## Acceptance Criteria

- History can reconstruct the visible Character Reference setup.
- Private uploaded references are not exposed accidentally in future sharing.
- Saved configurations survive option label changes.
