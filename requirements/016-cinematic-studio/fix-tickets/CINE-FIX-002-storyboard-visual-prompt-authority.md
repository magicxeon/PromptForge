# CINE-FIX-002 Storyboard Visual Prompt Authority

**Priority:** P0
**Status:** Implemented; live provider output pending
**Reported surface:** Scene Director to Storyboard generation

## Defect

The current Storyboard adapter omits material directing fields. In particular,
Scene `storyChange`, `emotionalStart`, `emotionalEnd`, `transitionIntent`,
`blocking` and `performance`, plus Shot `gaze`, are not compiled into the still
prompt. Project/Beat intent is also absent. Images can therefore be technically
valid while contradicting the authored emotional and dramatic direction.

## Provider-independent authority map

| Authority | Storyboard still | Later video |
|---|---|---|
| Project story brief, creative direction, genre and intended feeling | concise context | full context |
| Plan objective, logline and emotional arc | concise context | full context |
| Beat purpose, visible story change and emotional transition | required | required |
| Scene purpose, story change, location, time, emotional start/end | required | required |
| Scene blocking, lighting, performance and continuity | required | required |
| Scene transition intent | composition/continuity hint | temporal transition |
| Shot purpose, framing, angle, movement and lens | required visual framing | required motion plan |
| Shot blocking, performance, gaze, lighting and environment | required | required |
| Audio intent and duration | excluded from still pixels except visible performance implications | required |
| Character identity and approved Look | immutable references plus concise labels | immutable references |

## Required behavior

1. Compile labelled, deterministic sections rather than an unlabelled text
   concatenation.
2. Keep Character/Profile, Look and previous-approved-frame references as the
   higher authority; prompt text must not reinterpret identity or wardrobe.
3. Include only the Beat that owns the selected Scene and the active/working
   Plan context matching the current Scene IDs.
4. Convert emotional fields into observable face, posture, gaze and gesture
   direction. Do not ask a still image to depict time progression literally.
5. Exclude audio-only instructions from image prompts while preserving them for
   Produce/video contracts.
6. Use the identical compiler for manual single-Shot and Generate All quoting,
   submission and regression tests.

## Acceptance tests

- Emotional start/end, story change, Scene blocking/performance and Shot gaze
  appear in the compiled prompt when populated.
- Empty optional fields produce no empty labels or duplicated punctuation.
- Audio intent does not enter a still-image prompt.
- Character, Look and continuity sections remain present.
- Existing manual and batch generation call the same adapter.

## Evidence (2026-08-30)

- Adapter regression verifies Project/Plan/Beat/Scene/Shot emotional and visual
  fields, Character/Look continuity, and exclusion of Scene/Shot audio intent.
- Generate All regression verifies the shared compiler output enters the batch
  operation draft.
- Full Web regression: 94 test files, 334 tests passed.
- TypeScript and i18n catalog validation passed.
- Remaining gate: generate representative live Shots and record Job IDs plus
  identity, wardrobe, emotion and continuity review results.
