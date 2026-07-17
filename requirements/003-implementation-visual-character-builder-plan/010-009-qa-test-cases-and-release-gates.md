# 010-009 Character Sheet QA Test Cases and Release Gates

**Status:** Draft - Revised  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001 through 010-008

## Objective

Define QA for Character Sheet Builder and Story Mode reuse readiness.

## Test Cases

### CS-001 Baseline Sheet

Saved headshot plus Character Sheet Baseline outfit.

Expected:

- prompt includes front/side/back
- prompt preserves identity
- prompt uses clean sheet background

### CS-002 Outfit Preset Sheet

Saved headshot plus outfit preset.

Expected:

- prompt includes outfit preset
- no uploaded outfit reference text
- result is suitable as Story Mode reference

### CS-003 Outfit Front Upload

Saved headshot plus front outfit upload.

Expected:

- prompt references front outfit upload
- prompt does not promise exact unseen back details
- preset outfit text omitted

### CS-004 Outfit Front and Back Upload

Saved headshot plus front and back outfit uploads.

Expected:

- prompt references both views
- back-view sheet instruction is supported
- lineage records both uploads

### CS-005 Story Mode Handoff

Generated character sheet selected in Story Mode.

Expected:

- Story Mode receives sheet reference
- identity/outfit lock metadata preserved
- story prompt does not rebuild sheet instructions

## Release Gate

Do not release until:

- category reduction is complete
- prompt tests pass
- generated sheet is visually usable as Story reference
- at least one provider with reference-image support is tested
- unsupported provider path shows clear warning
- history handoff works

## Acceptance Criteria

- QA verifies sheet consistency, not only prompt syntax.
- Known issues are logged before release.
- Character Sheet Builder can be disabled independently if gate fails.
