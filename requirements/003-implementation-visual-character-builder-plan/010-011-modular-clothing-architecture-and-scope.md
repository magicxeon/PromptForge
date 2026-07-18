# 010-011 Modular Clothing Architecture and Scope

**Status:** Draft - Ready for Implementation Planning  
**Parent:** `010-character-reference-clothing-concept.md`  
**Depends on:** 010-004, 010-005, 010-006, 010-009

## Objective

Define the implementation architecture for Character Sheet clothing so the product can support outfit base, pattern, color, material and outfit references without bloating the existing client and prompt compiler files.

## Sub Requirements

| File | Purpose |
| --- | --- |
| `010-011-001-client-clothing-module-plan.md` | client module boundaries |
| `010-011-002-server-clothing-prompt-module-plan.md` | server compiler helper |
| `010-011-003-shared-clothing-data-contract.md` | data and attribute contract |
| `010-011-004-clothing-implementation-sequence.md` | implementation order |

## Problem

Clothing is more complex than body silhouette because one user intent may combine multiple dimensions:

```text
outfit form + color + pattern + material + uploaded reference
```

If implemented as one-off conditions in `app.js`, `formRenderer.js`, or the prompt compiler, this will become difficult to maintain before Free Style mode and user/community systems are added.

## MVP User Goal

The user should be able to create an understandable character outfit without writing a prompt.

MVP choices:

- What type of outfit is worn?
- What color is it?
- Does it have a pattern?
- What material or surface does it feel like?
- If no outfit is selected, use modest neutral reference clothing.
- If outfit front/back references are uploaded, uploaded references own clothing.

## Source Priority

Clothing ownership priority:

| Priority | Source | Behavior |
| --- | --- | --- |
| 1 | Outfit Front/Back Upload | overrides modular clothing text |
| 2 | Outfit Base + options | compiles semantic clothing prompt |
| 3 | Modest Default Clothing | safe fallback when no clothing source exists |

Rules:

- Outfit uploads own garment shape, color, pattern and visible styling.
- Modular clothing selections should not compete with uploaded outfit references.
- The fallback must never be revealing or erotic.

## Proposed Data Model

Use semantic attributes for each clothing dimension.

| Dimension | Category | Subcategory | Example ID |
| --- | --- | --- | --- |
| Outfit Base | `clothing` | `Outfit Base` | `outfit.base.tshirt_jeans` |
| Pattern | `clothing` | `Pattern` | `outfit.pattern.plaid` |
| Material | `clothing` | `Material` | `outfit.material.cotton` |
| Primary Color | `clothing` | `Primary Color` | `outfit.color.primary.navy` |
| Secondary Color | `clothing` | `Secondary Color` | `outfit.color.secondary.white` |

Color can share swatch UI behavior, but selected color values should still compile as semantic selections.

## Prompt Composition Contract

The canonical clothing prompt should be built by a clothing-specific helper.

Order:

```text
Outfit Base + Primary Color + Secondary Color + Pattern + Material
```

Rules:

- If no Outfit Base exists, use fallback clothing.
- If Pattern is empty or solid, omit pattern language unless needed for clarity.
- If Secondary Color is empty, omit secondary color language.
- Material is optional.
- Avoid duplicate garment names and duplicate colors.
- Do not include modular clothing text when outfit upload reference text is active.

## Modest Default Fallback

Canonical fallback:

```text
wearing modest neutral fitted reference clothing, opaque light gray top and mid-thigh shorts, non-revealing
```

Expanded fallback for providers that handle longer descriptions well:

```text
wearing modest neutral character reference clothing, an opaque light gray fitted top and matching mid-thigh shorts, non-revealing, clean and practical for character sheet visibility
```

Do not use:

- underwear as a visual/marketing label in the UI
- lingerie
- bikini
- sexy
- revealing
- transparent
- lace
- tight to show body

UI label should be:

```text
Modest Reference Wear
```

## Client Module Plan

Create clothing-specific modules before adding UI behavior.

```text
client/clothing/
  clothingOptionRules.js
  clothingPromptParts.js
  clothingVisualConfig.js
```

Responsibilities:

| Module | Responsibility |
| --- | --- |
| `clothingOptionRules.js` | visibility, source priority, invalid selection cleanup |
| `clothingPromptParts.js` | Live Prompt Preview helper only |
| `clothingVisualConfig.js` | visual/swatch config for outfit base, pattern, material, colors |

Rules:

- `formRenderer.js` may call clothing helpers but should not contain large clothing-specific decision trees.
- `visualOptionControls.js` should remain generic and config-driven.
- `app.js` should not gain clothing feature logic.

## Server Module Plan

Create server-side canonical prompt helper.

```text
server/clothing/
  clothingPromptParts.js
```

Responsibilities:

- normalize selected clothing fields
- apply source priority
- compile fallback clothing
- produce deterministic prompt parts
- expose functions for unit tests

The server compiler remains the source of truth. Client helper is only for preview parity.

## Asset Plan

Runtime assets:

```text
client/assets/visual-character-builder/character-sheet-v1/outfit/.../manifest.json
client/assets/visual-character-builder/character-sheet-v1/outfit/.../thumb/*.png
```

Authoring assets:

```text
visual-assets/character-builder/source-sets/character-sheet-v1/outfit/...
visual-assets/character-builder/reviews/character-sheet-v1/...
```

No Character Sheet clothing asset should publish `master` or `preview` runtime folders in MVP.

## Implementation Steps

1. Add clothing attributes for Outfit Base, Pattern and Material.
2. Add swatch configuration for Primary and Secondary Color.
3. Add server clothing prompt helper and unit tests.
4. Add client preview helper and wire it without expanding `app.js`.
5. Add UI dependency rules:
   - upload overrides modular clothing
   - solid/no pattern is omitted
   - no outfit uses Modest Reference Wear fallback
6. Add visual assets only for Outfit Base first.
7. Use CSS swatches for Pattern/Material first if readable.
8. Run release gate and browser QA.

## Acceptance Criteria

- User can build a simple outfit without typing a prompt.
- No clothing selection produces safe modest reference clothing.
- Uploaded outfit references override modular clothing.
- Prompt output is deterministic and not duplicated.
- Runtime assets remain thumb-only.
- Clothing logic is isolated into clothing modules.
- Free Style mode can later reuse clothing modules instead of rebuilding the feature.
