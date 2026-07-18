# 010-007 Character Sheet Prompt Builder and Provider Contract

**Status:** Implemented - Contract Baseline  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001 through 010-005

## Objective

Define prompt assembly for consistent multi-angle character sheet generation.

## Prompt Segment Order

1. sheet layout intent
2. same character identity
3. face/head/hair identity
4. body/proportion
5. outfit source
6. view instructions
7. neutral pose
8. clean background
9. camera/quality

## Example Prompt

```text
character model sheet, same recognizable character identity from the saved headshot configuration, front view, side view, and back view of the same character, full-body view, balanced natural adult body silhouette, wearing a plain white tank top and simple white shorts for clear character sheet visibility, standing straight in a neutral pose, on a solid pure white background, photorealistic character reference sheet, consistent lighting, crisp details
```

## Outfit Upload Prompt

Front/back references:

```text
matching the clothing outfit from the uploaded front and back outfit references, preserving garment silhouette, colors, and visible details across all sheet views
```

## Provider Rules

- Provider payload may differ, semantic prompt should remain stable.
- Reference image count must include headshot plus outfit front/back images.
- Unsupported references require clear warning/fallback.
- Output format/resolution rules remain provider-specific.

## Cleanup Rules

- no scene/environment language
- no fashion editorial posing
- no duplicate outfit phrases
- no hidden body-emphasis wording
- no conflict between preset outfit and uploaded outfit references

## Acceptance Criteria

- Prompt is optimized for reusable character sheet output.
- Prompt is not a Story Mode scene prompt.
- Admin can inspect/edit final prompt before generation.

## Implementation Log

### 2026-07-18 - Prompt Compiler Contract Baseline

- Aligned client and server Character Sheet prompt assembly.
- Character Sheet prompt now keeps identity-related skin details with face and hair identity.
- Server Character Sheet prompt no longer includes scene context:
  - Fashion Direction
  - Photographic Context
  - Scene Story
  - Environment
- Server Headshot prompt also matches the client by excluding scene context from the controlled headshot layout.
- Outfit references keep priority over outfit preset wording when Character Sheet outfit reference mode is active.
- Added regression coverage in `test/modeSpecificCharacterReference.test.js` to ensure Character Sheet output stays clean and reusable.

Verified:

```bash
node --test test/modeSpecificCharacterReference.test.js
npm run test:prompt-cleanup
```
