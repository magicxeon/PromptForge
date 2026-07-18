# 010-011-001 Client Clothing Module Plan

**Status:** Draft  
**Parent:** 010-011  
**Depends on:** 010-004

## Objective

Move clothing-specific UI rules into dedicated client modules before adding more clothing controls.

## Proposed Files

```text
client/clothing/
  clothingOptionRules.js
  clothingVisualConfig.js
  clothingPromptParts.js
```

## Responsibilities

| File | Responsibility |
| --- | --- |
| `clothingOptionRules.js` | source priority, field visibility, invalid selection cleanup |
| `clothingVisualConfig.js` | visual/swatch definitions for outfit base, pattern, material, colors |
| `clothingPromptParts.js` | Live Prompt Preview helper only |

## Integration Rules

- `formRenderer.js` may call clothing helpers.
- `formRenderer.js` must not contain large clothing-specific branching.
- `visualOptionControls.js` should stay generic and consume config.
- `app.js` should not gain clothing feature logic.

## Acceptance Criteria

- Clothing UI dependency logic is isolated.
- Adding a new pattern/color/material does not require editing `app.js`.
- Existing Headshot controls are not affected.
