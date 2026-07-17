# 010-006 Character Sheet Visual Assets and Manifest Contract

**Status:** Implemented - Contract Baseline  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 002, 003, manual visual setup

## Objective

Define visual assets for body/proportion, outfit presets and sheet layout controls.

## Folder Plan

```text
visual-assets/character-builder/source/character-sheet-v1/
  body-silhouette/
  body-build/
  outfit-preset/
  sheet-layout/

client/assets/visual-character-builder/character-sheet-v1/
  manifest.index.json
  body-silhouette/
  body-build/
  outfit-preset/
  sheet-layout/
```

## Asset Families

| Family | Control |
| --- | --- |
| Body Silhouette | visual-card-picker |
| Body Build | visual-card-picker |
| Outfit Preset | visual-card-picker |
| Sheet Layout | visual-card-picker or segmented control |
| Outfit Color | swatch-picker |

## Style Rules

- consistent with Headshot visual builder
- simple, clean silhouettes
- no detailed face
- no brand logos
- no copyrighted outfit designs
- readable at compact UI size

## QA Checklist

- icon communicates the option
- selected state is visible
- label fits on mobile
- asset crop is centered
- missing asset fallback works
- visual option maps to a semantic ID

## Acceptance Criteria

- Assets support sheet-building decisions, not scene/story styling.
- New assets reuse shared visual manifest structure.
- Missing assets do not block prompt generation.

## Implementation Log

### 2026-07-18 - Manifest Contract Baseline

- Added authoring manifest templates for:
  - `Body Silhouette`
  - `Body Build`
  - `Outfit Preset`
  - `Sheet Layout`
- Added a Character Sheet manifest index template under:
  - `visual-assets/character-builder/manifests/character-sheet/manifest.index.template.json`
- Added source/review/prompt workspace folders for `character-sheet-v1`.
- Added prompt briefs for each planned source sheet.
- Kept runtime wiring disabled until real source sheets are reviewed and sliced.

Runtime publishing guard:

- Do not add Character Sheet manifest URLs to `client/visual-controls/visualOptionControls.js` yet.
- Do not publish runtime manifests under `client/assets/visual-character-builder/character-sheet-v1/` until every item has real `master`, `preview`, and `thumb` assets.
- This prevents missing-asset cards from showing `?` in the UI.

Deferred:

- Source image generation.
- Contact sheet review.
- Runtime slice generation.
- Visual picker wiring for Character Sheet controls.
