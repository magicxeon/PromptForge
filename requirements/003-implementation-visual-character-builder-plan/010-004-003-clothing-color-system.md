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

## MVP Palette

| Attribute ID | Label | Swatch | Prompt Phrase |
| --- | --- | --- | --- |
| `outfit.color.white` | White | `#f8fafc` | white |
| `outfit.color.light_gray` | Light Gray | `#cbd5e1` | light gray |
| `outfit.color.black` | Black | `#111827` | black |
| `outfit.color.navy` | Navy | `#1e3a8a` | navy |
| `outfit.color.beige` | Beige | `#c8ad7f` | beige |
| `outfit.color.denim_blue` | Denim Blue | `#315f8f` | denim blue |
| `outfit.color.soft_pink` | Soft Pink | `#f5a6c8` | soft pink |
| `outfit.color.red` | Red | `#b91c1c` | red |
| `outfit.color.forest_green` | Forest Green | `#166534` | forest green |
| `outfit.color.lavender` | Lavender | `#a78bfa` | lavender |
| `outfit.color.warm_brown` | Warm Brown | `#7c4a2d` | warm brown |

## Prompt Rules

Primary color:

```text
in navy as the primary garment color
```

Secondary color:

```text
with white trim accents
```

When pattern is selected:

```text
with white secondary color in the pattern
```

Rules:

- Do not add secondary color text if no secondary color is selected.
- Do not duplicate color already intrinsic to fallback clothing.
- If Outfit Base is `modest_reference`, colors may be locked or ignored in MVP to keep fallback safe.
- Color selections must not override uploaded outfit references.

## UI Recommendation

Use swatch picker only.

Do not generate image files for colors.

## Acceptance Criteria

- Primary color changes Live Prompt Preview.
- Secondary color is omitted when empty.
- Primary and secondary color text do not duplicate.
- Colors can be reused later by Free Style mode.
