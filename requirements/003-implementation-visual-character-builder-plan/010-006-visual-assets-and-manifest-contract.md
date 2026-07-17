# 010-006 Character Sheet Visual Assets and Manifest Contract

**Status:** Draft - Revised  
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
