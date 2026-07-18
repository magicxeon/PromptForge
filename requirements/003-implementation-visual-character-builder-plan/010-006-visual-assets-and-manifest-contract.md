# 010-006 Character Sheet Visual Assets and Manifest Contract

**Status:** Implemented - Script Contract Baseline  
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
| Outfit Base | visual-card-picker |
| Outfit Pattern | visual-card-picker or swatch-pattern picker |
| Outfit Material | visual-card-picker or swatch-pattern picker |
| Outfit Color | swatch-picker |
| Sheet Layout | visual-card-picker or segmented control |

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
- runtime asset uses `thumb` only unless a shipped UI requires larger previews

## Clothing Visual Asset Scope

Clothing visual assets should show the user's choice quickly without becoming a detailed fashion illustration system.

### Outfit Base

Use simple front-facing outfit diagrams or simplified garment silhouettes.

MVP layout:

```text
2 columns x 3 rows or 3 columns x 2 rows
```

Initial options:

- modest reference wear
- T-shirt and jeans
- simple dress
- blazer and trousers
- hoodie and pants
- shirt and skirt
- activewear set if room allows

If there are more than six options, split into a second revision rather than crowding the first sheet.

### Pattern

Prefer swatch-pattern rendering instead of full generated images where possible.

MVP patterns:

- solid
- subtle stripe
- plaid
- floral
- geometric
- color block

Pattern swatches can be CSS-generated or small thumb PNGs. Choose CSS first if it stays readable.

### Material

Material can start as CSS swatches before image assets.

MVP materials:

- cotton
- denim
- knit
- satin
- wool
- leather-like

Material icons must be subtle and brand-free.

### Color

Color controls should use swatches, not image files.

Use shared color picker behavior so adding clothing colors does not create new runtime PNG assets.

## Runtime Optimization Rule

Character Sheet visual controls should publish only:

```text
client/assets/visual-character-builder/character-sheet-v1/.../manifest.json
client/assets/visual-character-builder/character-sheet-v1/.../thumb/*.png
```

Do not publish `master` or `preview` folders for Character Sheet controls unless a specific UI feature needs them.

Large source sheets and contact sheets remain authoring assets under:

```text
visual-assets/character-builder/source-sets/...
visual-assets/character-builder/reviews/...
```

## Acceptance Criteria

- Assets support sheet-building decisions, not scene/story styling.
- New assets reuse shared visual manifest structure.
- Missing assets do not block prompt generation.
- Clothing controls can be extended through data/config without adding large code blocks to `app.js`.

## Implementation Log

### 2026-07-18 - Character Sheet Script Contract

- Extended `scripts/slice-visual-assets.js` so Character Sheet manifest templates can be checked with the same pipeline as Headshot visual assets.
- Added supported Character Sheet field ids:
  - `body.silhouette`
  - `body.build`
  - `outfit.preset`
  - future `outfit.pattern`
  - future `outfit.material`
  - `sheet.layout`
- Added field-folder mappings so source sheets resolve to:
  - `visual-assets/character-builder/source-sets/character-sheet-v1/body/body-silhouette/`
  - `visual-assets/character-builder/source-sets/character-sheet-v1/body/body-build/`
  - `visual-assets/character-builder/source-sets/character-sheet-v1/outfit/outfit-preset/`
  - future `visual-assets/character-builder/source-sets/character-sheet-v1/outfit/outfit-pattern/`
  - future `visual-assets/character-builder/source-sets/character-sheet-v1/outfit/outfit-material/`
  - `visual-assets/character-builder/source-sets/character-sheet-v1/layout/sheet-layout/`
- Added runtime manifest registration for future Character Sheet publishing under:
  - `client/assets/visual-character-builder/character-sheet-v1/`
- Updated manifest index writing so the index uses the runtime manifest style version instead of hardcoding `headshot-illustrated-v1`.
- Added a publish-readiness guard:
  - `reviewStatus: planned` is allowed during `--check`.
  - `--slice` is blocked until every item is `approved`, `source-selected`, or `override-approved`.
  - This prevents unreviewed Character Sheet template assets from becoming runtime UI assets.
- Added `attributeId` support to the visual manifest contract:
  - Authoring templates can keep semantic visual `optionId` values.
  - `attributeId` maps the visual card to the real selectable attribute.
  - Runtime manifests preserve `attributeId` for UI wiring.
  - The visual picker falls back to `item.attributeId` when no hardcoded `optionMap` exists.
- Added validation that every supplied `attributeId` exists in the known attribute catalogs.
- Added missing neutral body attributes needed by the Character Sheet visual contract:
  - straight natural silhouette
  - inverted triangle silhouette
  - balanced build
  - broad structured build
  - soft natural build
- Added npm script:

```bash
npm run visual-assets:check:character-sheet
npm run visual-assets:slice:character-sheet
```

Current validation result:

- Template structure passes.
- Missing source sheets produce warnings only.
- Planned review statuses produce publish-block warnings.
- Runtime publishing remains blocked until source sheets are reviewed and sliced.

### 2026-07-18 - Body Silhouette Runtime Publish

- Moved accepted source sheet to:
  - `visual-assets/character-builder/source-sets/character-sheet-v1/body/body-silhouette/body-silhouette-set-r1.png`
- Updated `body-silhouette.manifest.template.json` review statuses to `source-selected`.
- Sliced `body.silhouette` into runtime assets under:
  - `client/assets/visual-character-builder/character-sheet-v1/body/body-silhouette/`
- Generated review contact sheet:
  - `visual-assets/character-builder/reviews/character-sheet-v1/body-silhouette/contact-sheet-r1.png`
- Runtime manifest index now includes only the published Body Silhouette manifest.

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

### 2026-07-18 - Runtime Asset Optimization

- Character Sheet runtime asset policy was updated to thumb-only by default.
- Existing Body Silhouette runtime assets were regenerated so browser manifests reference only `assets.thumb`.
- Obsolete generated `master` and `preview` runtime folders were removed for published Body Silhouette variants.
- Authoring source sheets and review contact sheets remain in `visual-assets/character-builder`.
- Clothing visual controls must follow the same thumb-only runtime policy.

### 2026-07-18 - Clothing Visual Scope Revision

- Expanded clothing visual scope beyond a single Outfit Preset card picker.
- Added planned visual/control families:
  - Outfit Base
  - Outfit Pattern
  - Outfit Material
  - Outfit Color swatches
- Pattern/material should prefer CSS or thumb-only swatches before generated image assets.
  This keeps the client runtime small and avoids unnecessary asset duplication.
