# 010-006 Visual Assets and Manifest Contract

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 002, 003, manual visual setup

## Objective

Define asset folders, manifest structure and QA rules for Character Reference body/clothing visuals.

## Folder Plan

Source assets:

```text
visual-assets/character-builder/source/character-reference-v1/
  body-silhouette/
  clothing-preset/
  garment-silhouette/
  material-surface/
```

Runtime assets:

```text
client/assets/visual-character-builder/character-reference-v1/
  manifest.index.json
  body-silhouette/
  clothing-preset/
  garment-silhouette/
  material-surface/
```

## Manifest Families

| Family | Control |
| --- | --- |
| Body Silhouette | visual-card-picker |
| Clothing Preset | visual-card-picker |
| Garment Silhouette | visual-card-picker |
| Material / Surface | visual-card-picker |
| Clothing Color | swatch-picker |

## Asset Style

- neutral illustration
- consistent canvas
- no detailed face
- no brand logos
- no copyrighted garment patterns
- silhouette readable at compact card size
- visually compatible with headshot builder style

## Manifest Item Shape

```json
{
  "optionId": "clothing.preset.casual_tshirt_jeans",
  "slug": "casual-tshirt-jeans",
  "assets": {
    "thumb": "./thumbs/casual-tshirt-jeans.png",
    "preview": "./preview/casual-tshirt-jeans.png"
  },
  "alt": {
    "en": "T-shirt and jeans clothing preset icon",
    "th": "T-shirt and jeans clothing preset icon"
  }
}
```

## QA Checklist

- card crop does not cut off important silhouette
- selected state remains visible
- dark/light theme contrast works
- missing asset fallback still allows selection
- labels fit on mobile
- swatches do not need raster images

## Acceptance Criteria

- Character Reference assets reuse the shared manifest pattern.
- New assets can be validated by existing or extended visual asset scripts.
- Missing or corrupt assets do not block prompt generation.
