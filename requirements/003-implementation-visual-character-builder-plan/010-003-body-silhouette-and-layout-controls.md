# 010-003 Body Proportion and Sheet Layout Controls

**Status:** Implemented - Baseline  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001, 010-002

## Objective

Define visual body/proportion attributes and sheet layout controls for generating a reusable multi-angle character model.

## MVP Body Fields

| Field | Control | Purpose |
| --- | --- | --- |
| Height Impression | Visual card / simple selector | petite, average, tall impression |
| Body Silhouette | Visual card picker | broad full-body silhouette |
| Build | Visual card picker | slim, average, athletic, plus-size; respectful wording |
| Shoulder/Waist/Hip Balance | Deferred or advanced | only if needed after first sheet tests |

## Body Wording Rules

- Use neutral, descriptive language.
- Avoid sexualized body descriptors.
- Avoid medical or judgmental labels.
- For minors, use only age-safe neutral body wording.

## MVP Layout Fields

| Layout | Use |
| --- | --- |
| Front / Side / Back | default character sheet |
| Front / Back | simpler outfit reference sheet |
| Front Only Full Body | fallback/test mode |

Default:

```text
front view, side view, and back view of the same character
```

## Prompt Phrase Examples

```text
balanced natural adult body silhouette
average height impression
standing straight in a neutral pose
front view, side view, and back view of the same character
```

## Visual Asset Requirements

- generic body diagrams
- no detailed face
- no distracting clothing detail
- consistent scale across cards
- readable on mobile

## Acceptance Criteria

- User can choose body/proportion without anatomy expertise.
- Sheet layout is explicit in prompt.
- Body controls support Story Mode consistency.

## Implementation Log

### 2026-07-18 - Layout Control Baseline

- Added `Sheet Layout` to the Body section as a selectable Character Sheet control.
- Added MVP layout options:
  - `Front / Side / Back`
  - `Front / Back`
  - `Front Only Full Body`
- Updated the client prompt compiler so `Sheet Layout` controls the opening Character Sheet layout phrase.
- Updated the server prompt compiler with the same layout behavior so submitted generation prompts match Live Prompt Preview.
- Kept `Sheet Layout` out of the body/proportion subject segment to avoid duplicated or awkward body wording.
- Updated Character Sheet source ownership summary so it reports the selected layout instead of a hardcoded default.

Deferred:

- Body silhouette/build visual-card assets are not generated in this step.
- Before slicing or wiring body diagram images, create a source-sheet preview and wait for review approval.

### 2026-07-18 - Visual Contract Attribute Alignment

- Added missing neutral body attributes required by Character Sheet visual manifests:
  - `body.011` Straight natural silhouette
  - `body.012` Inverted triangle silhouette
  - `body.build_03` Balanced build
  - `body.build_04` Broad structured build
  - `body.build_05` Soft natural build
- Kept wording descriptive and non-judgmental so the visual cards can map cleanly into prompts.

### 2026-07-18 - Body Silhouette Visual Pilot

- Accepted the first 2x3 Body Silhouette source sheet.
- Published runtime visual assets for:
  - straight natural silhouette
  - curvy natural silhouette
  - hourglass silhouette
  - pear-shaped silhouette
  - inverted triangle silhouette
  - full-figured / plus natural silhouette
- Wired `Body > Body Silhouette` to the shared visual-card picker.
- Added Body field subcategory aliases so `Body Silhouette` resolves existing `Body Shape` options.
