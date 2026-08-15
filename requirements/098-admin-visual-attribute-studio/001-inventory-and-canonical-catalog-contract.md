# 001 - Inventory and Canonical Catalog Contract

**Status:** Planned  
**Depends on:** Existing Attribute bundle and visual manifests

## Objective

Create a complete machine-readable inventory and a canonical schema before an
Admin editor is allowed to mutate anything.

## Required Work

1. Inventory all files under `attributes/` and `attributes/spec/`.
2. Inventory both visual manifest families and every asset state.
3. Inventory hard-coded mappings in React and prompt compiler assumptions.
4. Classify each group as customer Attribute, system policy, recipe-owned field,
   incomplete placeholder or legacy compatibility data.
5. Record all consumers by Face Creator, Character Sheet and Scene Builder.
6. Define Zod/JSON schemas and stable enum values.

## Canonical Option Contract

Each option must support:

- stable ID and revision
- category ID, field ID and ordering
- localized label, short description and search aliases
- control kind: image, swatch, select, segmented, toggle, numeric or text
- default and provider-specific prompt contributions
- negative constraints and prompt priority
- tags and search metadata
- mode exposure and character-type exposure
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

- All 24 source files are accounted for, including empty placeholders.
- Every current visual asset maps to an option or is reported as orphaned.
- Duplicate IDs and field-name collisions are reported deterministically.
- Current bundle can round-trip through the new contract without semantic loss.
- No Admin mutation endpoint exists before this gate passes.

