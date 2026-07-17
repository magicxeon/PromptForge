# 010-004 Outfit Preset Inventory

**Status:** Draft - Revised  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-001, 010-002

## Objective

Define a small outfit preset set for Character Sheet Builder when the user does not upload front/back outfit references.

## MVP Presets

| Preset ID Draft | Label | Purpose |
| --- | --- | --- |
| `outfit.preset.sheet_baseline` | Character Sheet Baseline | clear full-body model sheet |
| `outfit.preset.casual_tshirt_jeans` | T-shirt and Jeans | casual story baseline |
| `outfit.preset.simple_dress` | Simple Dress | simple fashion/story baseline |
| `outfit.preset.blazer_trousers` | Blazer and Trousers | commercial/professional |
| `outfit.preset.hoodie_pants` | Hoodie and Pants | street/casual |

## Character Sheet Baseline

Replace hidden fallback wording with a visible preset.

Preferred wording:

```text
wearing a plain white tank top and simple white shorts for clear character sheet visibility
```

Avoid:

```text
tight
to clearly show body shape and physique
```

## Outfit Fields

| Field | Control | Notes |
| --- | --- | --- |
| Outfit Preset | Visual card picker | main selector |
| Top Color | Swatch | only when preset has top |
| Bottom Color | Swatch | only when preset has bottom |
| Dress Color | Swatch | only when preset has dress |
| Material / Surface | Optional visual card | deferred if not needed |

## Rules

- Presets must be brand-free.
- Presets should be simple enough for multi-angle sheet consistency.
- Color overrides should not duplicate prompt phrases.
- Uploaded outfit references disable or override preset outfit text.

## Acceptance Criteria

- First preset set is small and practical.
- Every preset supports clean sheet generation.
- Presets support later Story Mode reuse.
