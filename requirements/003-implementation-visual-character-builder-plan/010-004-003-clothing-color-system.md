# 010-004-003 Clothing Color System

**Status:** Draft  
**Parent:** 010-004  
**Depends on:** 010-004-001

## Objective

Define a simple color system for modular Character Sheet clothing that supports outfit variety without adding image assets.

## Fields

| Field | Purpose |
| --- | --- |
| Primary Color | dominant garment color |
| Secondary Color | trim, accent, or pattern color |

## MVP Control

Use native color picker controls, not preset color swatches.

Default picker values:

| Field | Default |
| --- | --- |
| Primary Color | `#111827` |
| Secondary Color | `#e5e7eb` |

Rules:

- Picking a color should enable that color field automatically.
- The color picker is the source of truth for modular clothing colors.
- Preset color attributes may remain in legacy data for migration, but must not be shown as visual swatch cards in the MVP UI.
- Pattern and Material remain visual swatches, but their UI thumbnails should use grayscale tones so users understand that color comes from the color picker.

## Prompt Rules

Primary color:

```text
in #111827 as the primary garment color
```

Secondary color:

```text
with #e5e7eb trim accents
```

When pattern is selected:

```text
with #e5e7eb secondary color in the pattern
```

Rules:

- Do not add secondary color text if no secondary color is selected.
- Do not duplicate color already intrinsic to fallback clothing.
- If Outfit Base is `modest_reference`, colors may be locked or ignored in MVP to keep fallback safe.
- Color selections must not override uploaded outfit references.

## UI Recommendation

Use color picker controls only for Primary Color and Secondary Color.

Do not generate image files for colors.

Do not register Primary Color or Secondary Color as visual option swatches.

## Acceptance Criteria

- Primary color changes Live Prompt Preview.
- Secondary color is omitted when empty.
- Primary and secondary color text do not duplicate.
- Colors can be reused later by Free Style mode.
