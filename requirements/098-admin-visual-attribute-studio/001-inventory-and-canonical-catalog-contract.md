# 001 - Inventory and Canonical Catalog Contract

**Status:** Implemented and baseline-tested 2026-08-15
**Depends on:** Existing Attribute bundle and visual manifests

## Objective

Create a complete machine-readable inventory and a canonical schema before an
Admin editor is allowed to mutate anything.

## Required Work

1. Inventory all 25 files under `attributes/` and all five files under
   `attributes/spec/`.
2. Inventory both visual manifest families, both indexes, all 19 current field
   manifests, authoring manifests/extensions and every asset state.
3. Inventory hard-coded mappings and swatches in
   `visualOptionRegistry.ts`, loader assumptions in `attributesRoutes.js` and
   direct Attribute/spec fallback reads in `promptCompiler.js`.
4. Classify each group as customer Attribute, system policy, recipe-owned field,
   incomplete placeholder or legacy compatibility data.
5. Record all consumers by Face Creator, Character Sheet and Scene Builder.
6. Inventory bundled non-Attribute supplements: Scene Pose recipes and public
   Generation input limits. Keep their owning capabilities separate even when
   they are delivered in the public bundle.
7. Define Zod/JSON schemas and stable enum values.

## Canonical Option Contract

Each option must support:

- stable ID and revision
- category ID, field ID and ordering
- localized label, short description and search aliases
- control kind: image, swatch, select, segmented, toggle, numeric or text
- stable field order and option sort policy; Age keeps semantic order while
  ordinary option labels currently sort alphabetically
- default and provider-specific prompt contributions
- negative constraints and prompt priority
- tags and search metadata
- mode exposure and character-type exposure
- presentation applicability tags and gender-specific manifest variant
- visual manifest ID, visual style version, asset revision, focal point,
  recolor mode and text-only fallback state
- audience/safety policy classification
- enabled state and lifecycle status
- visual asset set or explicit text fallback
- dependencies, exclusions and replacement target

## Compatibility Requirements

- Existing saved semantic IDs remain readable.
- IDs must not derive from labels, filenames or array positions.
- A provider adaptation cannot change semantic meaning.
- Unknown legacy values surface as a visible fallback warning.
- NSFW/safety policy remains server-owned and cannot become a customer option.

## Deliverables

- inventory report with duplicate, missing and unused entries
- catalog and release schemas
- import mapping from current files
- bundle parity fixture
- dependency graph for current consumers

## Acceptance Criteria

- All 25 source files are accounted for, including empty placeholders.
- Every current visual asset maps to an option or is reported as orphaned.
- Duplicate IDs and field-name collisions are reported deterministically.
- Current bundle can round-trip through the new contract without semantic loss.
- No Admin mutation endpoint exists before this gate passes.
- Existing Age ordering, alphabetical option ordering, adult/presentation
  filtering, Facial Hair visibility, Outfit Base filtering and custom-input
  limits are represented as protected fixtures before migration.
