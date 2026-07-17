# 010-003 Body Silhouette and Layout Controls

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001, 010-002

## Objective

Define the first body and layout controls for full-body character reference generation.

## MVP Body Fields

Keep body controls neutral and visual.

| Field | Control | Notes |
| --- | --- | --- |
| Body Silhouette | Visual card picker | broad, non-sexualized silhouette |
| Height Impression | Visual card picker or dropdown | petite, average, tall impression |
| Build | Visual card picker | slim, average, athletic, plus-size; wording must be respectful |
| Posture Baseline | Segmented control | neutral standing, relaxed standing |

Avoid:

- medical body-type labels
- sexualized descriptors
- weight-judgment language
- unrealistic anatomy promises

## MVP Layout Fields

| Layout | Prompt Meaning |
| --- | --- |
| Full-body single view | one full character reference image |
| Front/side/back sheet | character sheet with three views |
| Front/back sheet | simpler production-friendly sheet |

Default:

```text
front/side/back character sheet
```

## Prompt Phrase Examples

```text
balanced natural adult body silhouette
average height impression
standing straight in a neutral pose
front view, side view, and back view
```

## Asset Requirements

- body icons should not include detailed face or outfit
- silhouette differences should be visible at card size
- use neutral clothing or outline-only diagrams
- support text fallback if asset is missing

## Safety Rules

- If audience class is minor, body wording must be minimal and age-safe.
- Body controls should not produce glamour, sensual or adult fashion wording by themselves.

## Acceptance Criteria

- The user can choose a body silhouette without reading technical anatomy terms.
- Prompt output remains respectful and neutral.
- Layout controls produce predictable prompt segments.
