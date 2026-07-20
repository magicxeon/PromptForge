# Character Sheet Builder for Story Mode

**Status:** Requirement Draft - Revised Concept  
**Sequence:** 010  
**Depends on:** Accepted Headshot MVP, 001-009 visual character builder contracts

## Concept Correction

This requirement is not a standalone clothing-reference or virtual try-on workflow.

The correct product goal is to build a **Character Sheet Builder** that creates a consistent multi-angle character model, such as front / side / back views, so the generated character can later be reused as a strong reference in Story Mode.

Clothing support exists because the character sheet needs a consistent outfit. The outfit workflow is a supporting input, not the main product.

## Product Goal

Users should be able to:

1. Start from a saved Headshot / visual character configuration.
2. Extend the character into a full-body character sheet.
3. Choose visual body/proportion attributes.
4. Choose or upload outfit references, especially front and back clothing views.
5. Generate a clean character sheet showing the same character from multiple angles.
6. Use that generated sheet as a character reference in Story Mode.

## Sub Requirements

| File | Subject | Purpose |
| --- | --- | --- |
| `010-001-scope-and-mode-contract.md` | Character Sheet scope and mode contract | Define MVP boundary and relationship to existing `character-sheet` mode |
| `010-002-canonical-identity-and-source-priority.md` | Canonical identity source priority | Define how Headshot identity, sheet outputs and outfit references interact |
| `010-003-body-silhouette-and-layout-controls.md` | Body/proportion and sheet layout | Define body visual attributes and front/side/back layout choices |
| `010-004-clothing-preset-inventory.md` | Outfit preset inventory | Define small outfit presets that support character sheet generation |
| `010-005-clothing-reference-upload-and-ownership.md` | Outfit reference front/back upload | Define uploaded clothing front/back reference behavior |
| `010-006-visual-assets-and-manifest-contract.md` | Character sheet visual assets | Define body/outfit asset folders, manifests and visual QA |
| `010-007-prompt-builder-and-provider-contract.md` | Character sheet prompt builder | Define prompt segments for consistent multi-angle sheet generation |
| `010-008-persistence-history-and-lineage.md` | Sheet persistence and Story handoff | Define saved sheet metadata and Story Mode reuse |
| `010-009-qa-test-cases-and-release-gates.md` | QA and release gates | Define deterministic/manual checks for sheet consistency |
| `010-010-future-admin-configuration-contract.md` | Future admin configuration | Define how visual sheet attributes can later become admin-managed |

## MVP Scope

### In Scope

- Use saved Headshot/visual character selections as identity base.
- Generate full-body character sheet.
- Support front/side/back or front/back sheet layouts.
- Add body/proportion visual controls.
- Add small outfit preset set.
- Support uploading outfit front image and optional back image.
- Keep only categories needed for character sheet creation.
- Save character sheet result for Story Mode reference reuse.

### Out of Scope

- Scene/story composition.
- Fashion/editorial posing.
- Environment/background selection.
- Marketplace/community sharing.
- Exact virtual try-on guarantee.
- Layer/mask garment editor.
- Product campaign workflow.
- Arbitrary multi-character sheets.

## Required Category Reduction

Character Sheet mode should show only categories that help build the reusable model.

Keep:

- Character
- Face
- Hair
- Skin
- Body
- Clothing / Outfit
- Camera/Quality only when needed for output consistency

Hide or defer:

- Scene Story
- Environment
- Fashion Direction
- Photographic Context
- Foreground Layer
- Background Activity
- Editorial Pose controls
- NSFW
- Complex lighting presets
- Commercial product context

## Future Story Mode Handoff

The generated character sheet should be usable as:

- Story Mode character reference
- identity anchor for future scenes
- outfit consistency source
- model profile asset for later commercial workflows

Story Mode should consume the generated sheet as a reference, not rebuild the sheet logic itself.

## Implementation Note

A previous baseline added a `character-reference` mode. The revised requirement direction is to focus on **Character Sheet Builder**. Future implementation should either:

- merge that baseline into the existing `character-sheet` mode, or
- rename/re-scope it so users understand it as a sheet-building workflow.

Do not expand `character-reference` as a separate clothing workflow.
