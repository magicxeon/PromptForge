# 010-012 Character Sheet Attribute Cleanup and Conflict Rules

**Status:** Implemented foundation cleanup  
**Parent:** 010 Character Sheet Builder  
**Depends on:** 010-001 through 010-011

## Objective

Clean up Character Sheet Builder attributes so the UI stays focused, non-confusing, and safe for character turnaround generation.

This requirement is for attribute/schema cleanup only. It does not add new visual assets.

## Current Audit Summary

Character Sheet mode is already limited by mode policy to:

- Character
- Face
- Hair
- Skin
- Body
- Clothing
- Camera
- Quality

The active policy correctly excludes Scene Story, Fashion Direction, Pose, Environment, Lighting, and NSFW from the Character Sheet Builder workspace.

However, some legacy fields and options still exist in the schema or attribute layer. They are mostly hidden or filtered in the current UI, but they should be cleaned up before production/admin configuration work.

## Cleanup Items

### 1. Remove Legacy Safety Controls From Active UI Contract

Legacy controls:

- NSFW Options
- GPT-Safe Mode

Required behavior:

- Do not show these controls in Engine / Target Output.
- Do not save user-editable state for these controls.
- Always compile character sheet prompts as safe, clothed, non-sensual content.
- Keep old saved values inert during migration.

Implementation note:

- `016-nsfw.json` may remain as archived legacy data temporarily, but Character Sheet Builder must not render or compile it.
- Prompt templates should eventually remove `{nsfw}` once all legacy flows no longer need it.

### 2. Deprecate `Outfit Preset` For Character Sheet

Current issue:

- `Outfit Base` is now the canonical clothing starting point.
- `Outfit Preset` still exists in schema and attributes.
- The visual asset gate still references `outfit.preset`, which creates stale warnings and future confusion.

Required behavior:

- Character Sheet Builder should use `Outfit Base`, not `Outfit Preset`.
- Existing saved `Outfit Preset` values should migrate to the closest `Outfit Base` value where possible.
- If no safe mapping exists, clear the old value and fall back to modest default clothing.
- Remove `outfit.preset` from Character Sheet visual gate once migration is complete.

Suggested migration:

| Legacy ID | Target |
| --- | --- |
| `outfit.preset.sheet_baseline` | modest default fallback |
| `outfit.preset.casual_tshirt_jeans` | nearest unisex or gendered T-shirt/jeans outfit base |
| `outfit.preset.simple_dress` | female simple day dress if Gender is female, otherwise clear |
| `outfit.preset.blazer_trousers` | nearest smart blazer outfit base |
| `outfit.preset.hoodie_pants` | nearest hoodie outfit base |

### 3. Deprecate Old Untagged `outfit.base.*` Options

Current issue:

- New outfit base options use gender-aware IDs:
  - `outfit.base.unisex.*`
  - `outfit.base.male.*`
  - `outfit.base.female.*`
- Older `outfit.base.*` options are still enabled and share the same `Outfit Base` subcategory.

Required behavior:

- Character Sheet visual selection should only show gender-aware outfit base options.
- Old untagged `outfit.base.*` IDs should be marked legacy or disabled for new Character Sheet selections.
- Saved old values should migrate to gender-aware options or modest fallback.

### 4. Convert Clothing Color Attributes To Legacy Metadata

Current issue:

- `Primary Color` and `Secondary Color` now use color picker values.
- Old `outfit.color.*` palette attributes still exist as enabled data.

Required behavior:

- Character Sheet Builder should not show preset color cards for Primary/Secondary Color.
- Color picker values are the canonical source.
- Old `outfit.color.*` selections should migrate to their hex value.
- Pattern and Material visual cards remain grayscale and selectable.

### 5. Resolve Body Shape vs Body Silhouette Naming

Current issue:

- Attribute data still uses `Body Shape` subcategory for both older body-shape options and new silhouette options.
- UI field name is `Body Silhouette`.

Required behavior:

- Character Sheet Builder should treat `Body Silhouette` as canonical.
- New silhouette options should stay gender-aware.
- Older body-shape options should be hidden from Character Sheet visual flow unless intentionally mapped.
- `Model Build` can remain as a secondary dropdown only if it adds useful prompt detail beyond silhouette.

### 6. Keep Direct-Camera Character Sheet Output

Current issue:

- Some global pose/expression/fashion attributes contain off-camera gaze wording.
- Character Sheet output must be front-facing and consistent for story-mode reuse.

Required behavior:

- Character Sheet prompt cleanup must reject or rewrite:
  - `off-camera`
  - `looking away`
  - side-gaze wording
- Sheet Layout may control angle/view count, but the canonical identity view should remain direct and clear.

### 7. Preserve MVP Gender Scope

Current rule:

- `Female` and `Male` remain supported.
- `Non-binary` is outside MVP scope and must not be selectable.

Required behavior:

- No non-binary option appears in Character Sheet Builder.
- Imported non-binary legacy values require reselection.
- Do not auto-map non-binary to androgynous appearance.

## Fields That Should Stay In Character Sheet MVP

Core identity:

- Gender
- Age
- Ethnicity / Visual Heritage
- Face Shape
- Eyes
- Eyebrows
- Nose
- Lips
- Expression
- Hair Length
- Hair Cut / Style
- Hair Texture
- Parting / Fringe
- Hair Color
- Hair Finish
- Skin Texture
- Makeup

Character sheet body:

- Height Impression
- Body Silhouette
- Model Build, only if it does not duplicate silhouette
- Sheet Layout

Clothing:

- Outfit Base
- Primary Color picker
- Secondary Color picker
- Pattern
- Material
- Outfit Front Reference upload
- Outfit Back Reference upload

Output quality:

- Camera basics needed for consistent character sheet rendering
- Quality settings needed for photorealistic output

## Fields That Should Not Appear In Character Sheet MVP

- NSFW
- GPT-Safe Mode
- Scene Story
- Fashion Direction
- Fashion Venue
- Pose Intent
- Fashion Hand Position
- Fashion Gaze
- Environment
- Lighting scene controls
- Product-only fashion commerce fields unless a future product shoot mode explicitly enables them
- Free-form sensual or revealing clothing controls

## Acceptance Criteria

- [x] Character Sheet UI shows only MVP-relevant categories.
- [x] No NSFW or GPT-Safe controls are visible or user-editable.
- [x] `Outfit Base` is the only preset-style clothing selector in Character Sheet.
- [x] Primary and Secondary Color use color picker values, not preset color option cards.
- [x] Gender-aware outfit and silhouette options are shown according to selected Gender.
- [x] Switching Gender clears incompatible outfit and body silhouette selections.
- [x] Prompt compiler output does not include off-camera gaze wording.
- [x] Saved legacy selections clear with a safe fallback for Character Sheet mode.
- [x] Character Sheet release gate no longer warns about intentionally deprecated `outfit.preset` visual fields.

## Implementation Sequence

1. Add migration map for legacy `Outfit Preset`, old `outfit.base.*`, and old `outfit.color.*`.
2. Mark deprecated attributes with explicit `legacy` tags or disable them for new Character Sheet selection.
3. Remove `Outfit Preset` from Character Sheet schema or hide it by mode-specific schema filtering.
4. Remove stale `outfit.preset` visual gate entries.
5. Keep `016-nsfw.json` inert, then remove it from active loading only after old modes are confirmed safe.
6. Add automated checks that validate Character Sheet visible fields and forbidden prompt phrases.

## Implementation Log

Implemented:

- Removed legacy `NSFW Options` and `GPT-Safe Mode` checkboxes from Engine / Target Output markup.
- Character Sheet form rendering now omits NSFW and hides clothing fields outside the MVP scope:
  - Outfit Preset
  - Product Type
  - Garment Silhouette
  - Material / Surface
  - Construction / Detail
  - Styling
- Character Sheet mode switching now re-renders the dynamic form so hidden fields do not remain from Story Mode.
- Character Sheet pruning removes:
  - NSFW selections
  - hidden clothing fields
  - old preset color selections for Primary/Secondary Color
  - old untagged `outfit.base.*` selections
- Client and server clothing compilers now require canonical gender-aware `Outfit Base` tags or a custom outfit base.
- Legacy `Outfit Preset` no longer compiles in Character Sheet mode and falls back to modest default clothing.
- Removed `outfit.preset` from the Character Sheet visual asset release gate.

Deferred:

- Physically removing `016-nsfw.json` from all active loading is deferred until old normal/story flows are reviewed.
- Legacy `outfit.preset.*`, old `outfit.base.*`, and `outfit.color.*` data can remain temporarily as migration/archive data.
