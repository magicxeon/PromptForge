# 010-009 QA Test Cases and Release Gates

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001 through 010-008

## Objective

Define the QA matrix and release gate for Character Reference MVP.

## Deterministic Test Cases

### CR-001 Preset Casual Baseline

Saved headshot plus T-shirt and jeans preset.

Expected:

- preserves canonical identity
- includes casual preset clothing
- no uploaded clothing reference text

### CR-002 Uploaded Clothing Reference Owns Outfit

Saved headshot plus uploaded clothing image.

Expected:

- clothing upload ownership visible
- preset outfit text omitted unless advanced override active
- reference lineage stored

### CR-003 Provider Without References

Current provider does not support image references.

Expected:

- upload stored but not sent
- UI warning visible
- generation either blocked or proceeds without reference only after explicit acknowledgement

### CR-004 Front Side Back Sheet

Character sheet layout selected.

Expected:

- prompt includes front view, side view, back view
- neutral pose
- solid background

### CR-005 Minor-Safe Character Reference

Child/minor source selected.

Expected:

- no adult glamour/fashion model language
- no sexualized body language
- age-safe outfit wording

## Manual QA Matrix

- desktop
- mobile
- Thai and English
- mouse/touch/keyboard
- reduced motion
- missing/corrupt visual asset
- provider with references
- provider without references
- saved config restore
- uploaded reference remove/replace
- admin prompt override

## Release Gate

Do not release until:

- source ownership labels are clear
- prompt tests pass
- at least one provider with references is manually tested
- one provider without references is manually tested
- history reconstruction works
- product owner accepts first body/clothing option inventory

## Acceptance Criteria

- QA cases cover source priority, prompt output, provider capability and history lineage.
- Known issues are logged before release.
- Character Reference can be disabled independently if release gate fails.
