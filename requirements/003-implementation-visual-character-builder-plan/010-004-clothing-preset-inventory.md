# 010-004 Clothing Preset Inventory

**Status:** Draft  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001, 010-002

## Objective

Define the first small clothing preset inventory for Character Reference MVP.

## MVP Presets

| Preset ID Draft | Label | Purpose |
| --- | --- | --- |
| `clothing.preset.casual_tshirt_jeans` | T-shirt and Jeans | casual baseline |
| `clothing.preset.sheet_tank_shorts` | Tank Top and Shorts | character sheet clarity |
| `clothing.preset.simple_dress` | Simple Dress | fashion/feminine baseline |
| `clothing.preset.blazer_trousers` | Blazer and Trousers | commercial/professional |
| `clothing.preset.hoodie_pants` | Hoodie and Pants | street/casual |
| `clothing.preset.activewear` | Activewear Set | fitness/commercial |

## MVP Clothing Fields

| Field | Control | Notes |
| --- | --- | --- |
| Clothing Preset | Visual card picker | primary MVP outfit selector |
| Top Color | Swatch picker | only if preset includes top |
| Bottom Color | Swatch picker | only if preset includes bottom |
| Dress Color | Swatch picker | only if preset includes dress |
| Material / Surface | Visual card picker | optional first pass |
| Styling | Dropdown or visual card | tucked, oversized, fitted; deferred if not needed |

## Prompt Phrase Examples

```text
wearing a plain fitted white t-shirt and straight-leg dark denim jeans
wearing a simple knee-length dress
wearing a clean blazer with tailored trousers
wearing a casual hoodie and relaxed pants
```

## Preset Rules

- Presets should be generic and brand-free.
- Presets should not imply copyrighted designs.
- Presets should not require exact garment reconstruction.
- Color overrides should replace or augment preset colors cleanly.

## Character Sheet Baseline

The current hidden fallback:

```text
wearing a tight white tank top and white shorts to clearly show the model's body shape and physique
```

should become a visible preset:

```text
Character Sheet Baseline
```

The wording should be revised to be less body-emphasizing:

```text
wearing a plain white tank top and simple white shorts for clear character sheet visibility
```

## Acceptance Criteria

- MVP can launch with 4-6 clothing presets.
- Every preset has a concise prompt phrase.
- Preset labels are understandable without fashion expertise.
- Color swatches do not create duplicate or contradictory prompt phrases.
