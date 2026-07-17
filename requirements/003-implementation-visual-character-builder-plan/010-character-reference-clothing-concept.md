# Character Reference and Clothing Concept

**Status:** Requirement Draft - Deferred After Headshot MVP  
**Sequence:** 010  
**Depends on:** Accepted Headshot MVP, 001-009 visual character builder contracts

## Sub Requirements

This requirement is split into implementation-sized sub requirements:

| File | Subject | Purpose |
| --- | --- | --- |
| `010-001-scope-and-mode-contract.md` | Scope and mode contract | Define MVP boundary and `character-reference` mode |
| `010-002-canonical-identity-and-source-priority.md` | Canonical identity and source priority | Define ownership between headshot, character reference, clothing reference and presets |
| `010-003-body-silhouette-and-layout-controls.md` | Body silhouette and layout controls | Define first-pass body controls and reference layouts |
| `010-004-clothing-preset-inventory.md` | Clothing preset inventory | Define MVP clothing presets and semantic fields |
| `010-005-clothing-reference-upload-and-ownership.md` | Clothing reference upload | Define uploaded clothing reference behavior and provider capability handling |
| `010-006-visual-assets-and-manifest-contract.md` | Visual assets and manifests | Define folders, manifest rules and asset QA |
| `010-007-prompt-builder-and-provider-contract.md` | Prompt builder and provider contract | Define prompt segments and provider-safe behavior |
| `010-008-persistence-history-and-lineage.md` | Persistence, history and lineage | Define saved config and generation metadata |
| `010-009-qa-test-cases-and-release-gates.md` | QA and release gates | Define deterministic and manual checks |
| `010-010-future-admin-configuration-contract.md` | Future admin configuration | Define how this can later move to admin-managed configuration |

## Objective

Define the next product layer after Headshot MVP: a reusable Character Reference workflow that turns a saved canonical headshot/character configuration into a fuller character reference or character sheet, with simple clothing presets and optional uploaded clothing references.

This requirement is intentionally a contract-first plan. It should not start a large implementation until the Headshot MVP is accepted and the first clothing/body option inventory is reviewed.

## Product Goal

Users should be able to:

1. Start from a saved canonical face or headshot configuration.
2. Choose a simple body silhouette.
3. Choose clothing from presets or upload a clothing reference.
4. Adjust supported clothing colors/patterns.
5. Generate a full character reference or character sheet without writing a prompt manually.

The experience should feel like extending the existing visual character builder, not a separate product.

## MVP Scope

### In Scope

- Start from saved Headshot configuration.
- Use canonical face/reference image as the character identity anchor.
- Select a basic adult body silhouette.
- Select basic clothing presets.
- Upload one clothing reference image.
- Choose basic garment color through swatches.
- Generate character reference / character sheet using existing provider pipeline.
- Save the semantic configuration used for generation.
- Store lineage metadata for uploaded references and generated outputs.

### Out of Scope

- Exact virtual try-on guarantee.
- Layer-based garment editor.
- Arbitrary mask painting.
- Fabric physics simulation.
- Unlimited user-generated patterns.
- Multi-character sheets.
- Marketplace licensing for paid presets.
- Advanced pose transfer beyond existing reference-image behavior.

## User Journey

```text
select saved canonical headshot
  -> choose character-reference mode
  -> choose body silhouette
  -> choose clothing source
      -> preset clothing
      -> uploaded clothing reference
  -> optionally choose supported garment color/pattern
  -> choose reference layout
      -> full-body reference
      -> front/side/back character sheet
  -> review generated prompt
  -> generate
  -> save generated character reference
```

## Source Priority Rules

The system must avoid unclear ownership between preset selections and uploaded references.

| Source | Priority | Rule |
| --- | ---: | --- |
| Canonical face/headshot | 1 | Owns identity, face structure and recognizable facial features |
| Character reference image | 2 | Owns full character identity if explicitly enabled |
| Uploaded clothing reference | 3 | Owns garment style/colors/details if enabled |
| Clothing preset | 4 | Used when no clothing reference owns the outfit |
| Color/pattern overrides | 5 | Apply only to supported preset garments or explicitly allowed reference edits |
| Free prompt/admin override | 6 | Admin-only, records manual override text |

If an uploaded clothing reference is active, clothing preset controls should either:

- become secondary hints, or
- be disabled with a visible explanation.

MVP recommendation: uploaded clothing reference owns clothing, preset clothing becomes disabled unless advanced override is enabled.

## Mode Contract

Add or formalize a mode:

```text
character-reference
```

Mode responsibilities:

- use canonical identity from saved Headshot configuration
- allow body and clothing controls
- support uploaded clothing reference
- generate full-body or character-sheet layouts
- keep prompt output inspectable in admin mode

Relationship to existing modes:

| Existing Mode | Relationship |
| --- | --- |
| `headshot` | Source of canonical face and identity |
| `character-sheet` | Existing layout behavior can be reused and tightened |
| `normal` / freestyle | Can consume saved character reference later |

## Data Contract

Saved character reference configuration should store semantic IDs, not labels or filenames as primary values.

```json
{
  "version": 1,
  "mode": "character-reference",
  "canonicalCharacterId": "saved-headshot-or-profile-id",
  "sourceHeadshotJobId": "optional-generation-job-id",
  "identitySelections": {
    "Gender": "character.001",
    "Age": "character.004_e20",
    "Ethnicity": "character.009",
    "Face Shape": "face.006"
  },
  "bodySelections": {
    "Body Silhouette": "body.silhouette_001",
    "Height Impression": "body.height_002"
  },
  "clothingSource": {
    "type": "preset",
    "presetId": "clothing.preset_001",
    "uploadedReferenceId": null
  },
  "clothingSelections": {
    "Top": "clothing.top_001",
    "Bottom": "clothing.bottom_001",
    "Material / Surface": "clothing.material_001"
  },
  "colorOverrides": {
    "Top": "#ffffff",
    "Bottom": "#222222"
  },
  "layout": {
    "type": "front-side-back",
    "background": "solid-white"
  }
}
```

## New Attribute Areas

The first implementation should keep the option inventory small.

### Body

First-pass fields:

- Height Impression
- Body Silhouette
- Build
- Shoulder/Waist/Hip impression only if visually necessary

Avoid body options that imply medical or sexualized judgment.

### Clothing

First-pass preset fields:

- Top
- Bottom
- Dress / One-piece
- Shoes
- Accessories
- Garment Silhouette
- Material / Surface
- Styling

MVP recommended preset set:

| Preset | Purpose |
| --- | --- |
| Plain T-shirt and jeans | Casual baseline |
| White tank top and shorts | Character-sheet anatomy clarity |
| Simple dress | Fashion/feminine baseline |
| Blazer and trousers | Commercial/professional |
| Hoodie and pants | Street/casual |
| Activewear set | Fitness/commercial |

## Visual Controls

Reuse the shared visual control system from `003`.

| Control Type | Use |
| --- | --- |
| Visual card picker | Body silhouette, clothing preset, garment type |
| Swatch picker | Clothing color |
| Upload/reference control | Clothing reference image |
| Toggle | Uploaded reference ownership, advanced override |
| Segmented control | Layout type |

Do not build a one-off clothing UI. Clothing controls should use the same manifest and mapping pattern as headshot visual options.

## Asset Plan

Clothing and body assets should start as simple illustrative silhouettes.

Recommended first assets:

```text
visual-assets/character-builder/source/character-reference-v1/
  body-silhouette/
  clothing-preset/
  garment-silhouette/
  material-surface/

client/assets/visual-character-builder/character-reference-v1/
  body-silhouette/
  clothing-preset/
  garment-silhouette/
  material-surface/
```

Asset style:

- monochrome or low-color illustration
- consistent canvas and line weight
- no detailed faces
- no brand logos
- no copyrighted clothing designs
- clear silhouette at small card size

## Prompt Contract

Character Reference prompt should be assembled in stable segments:

```text
character reference / character model sheet,
same recognizable character identity from canonical headshot,
body silhouette,
clothing,
layout,
background,
camera,
quality
```

Example:

```text
character model sheet, same recognizable female character identity from the saved canonical headshot, full-body view, balanced natural adult body silhouette, wearing a plain fitted white t-shirt and straight-leg dark denim jeans, front view, side view, and back view, standing straight in a neutral pose, on a solid pure white background, photorealistic commercial character reference, consistent lighting, crisp details
```

Prompt rules:

- Do not re-randomize face identity.
- Do not override uploaded clothing reference unless advanced override is enabled.
- Keep body wording descriptive, neutral and non-sexualized.
- If `audienceClass: minor`, remove adult fashion/beauty styling and restrict body/clothing language.
- Avoid promising exact garment reconstruction.

## Reference Upload Contract

Uploaded clothing reference must store:

- original upload filename
- normalized server asset path
- thumbnail path
- upload timestamp
- owning user/session
- source type: `clothing-reference`
- whether it was sent to provider
- generated job IDs that used it

If the active model does not support reference images:

- disable upload usage for that provider, or
- allow upload to be stored but not sent
- show a provider capability warning

## MVP UI Layout

Suggested section order:

1. Canonical Character
2. Body
3. Clothing Source
4. Clothing Preset
5. Clothing Color / Material
6. Reference Layout
7. Prompt Preview
8. Generate

The first screen should show the active canonical character preview and clear ownership status:

```text
Identity source: Saved Headshot
Clothing source: Preset / Uploaded Reference
Layout: Character Sheet
```

## QA Requirements

### Functional QA

- saved headshot can be selected as source
- switching clothing source updates disabled/enabled controls
- uploaded clothing reference appears in preview
- provider without references shows a clear limitation
- generated prompt includes identity, body, clothing and layout
- history stores source IDs and reference lineage

### Prompt QA

- no duplicate clothing phrases
- uploaded clothing reference does not conflict with preset text
- body wording stays neutral
- minor-safe cases do not include adult fashion/beauty wording
- admin prompt preview matches submitted prompt unless manually edited

### Visual QA

- body silhouette icons are readable at card size
- clothing presets are distinguishable
- swatch selection is visible
- mobile layout does not clip labels
- missing assets fall back to text selection

## Test Cases

### CR-001 Preset Casual Baseline

Goal: saved headshot + preset clothing generates a full-body character reference.

Expected:

- prompt preserves canonical identity
- prompt includes casual clothing preset
- no uploaded clothing reference text appears

### CR-002 Uploaded Clothing Reference Owns Outfit

Goal: uploaded clothing reference takes priority over preset clothing.

Expected:

- clothing preset controls are disabled or treated as secondary hints
- prompt says clothing is matched from uploaded reference
- lineage records uploaded reference ID

### CR-003 Provider Without References

Goal: model capability limitation is handled cleanly.

Expected:

- upload can be stored
- provider payload does not include unsupported references
- UI explains that selected provider cannot use reference images

### CR-004 Character Sheet Layout

Goal: front/side/back layout uses stable neutral pose language.

Expected:

- prompt includes front view, side view and back view
- prompt uses solid background
- pose is neutral and consistent

### CR-005 Minor-Safe Character Reference

Goal: child/minor character remains safe and non-commercial-glamour.

Expected:

- no sexualized body language
- no adult beauty/fashion model language
- simple age-appropriate clothing

## Migration Notes

Existing `character-sheet` behavior may already inject default tank top/shorts when clothing is empty. Future implementation should either:

- keep this as the default `character-sheet` baseline, or
- move it into a visible clothing preset called `Character Sheet Baseline`.

Avoid hidden prompt injection once visual clothing controls exist.

## Implementation Phases

### Phase 1 - Contract and Inventory

- approve body and clothing option inventory
- define IDs and prompt phrases
- define asset folders and manifest pattern
- decide uploaded-reference priority behavior

### Phase 2 - Visual Controls

- add body silhouette picker
- add clothing preset picker
- add clothing color swatches
- add missing asset fallback

### Phase 3 - Reference Ownership

- add clothing reference upload ownership state
- connect provider capability checks
- persist lineage metadata

### Phase 4 - Prompt and Generation

- add character-reference prompt segment builder
- connect admin prompt preview
- store generated history metadata

### Phase 5 - QA and Release Gate

- add deterministic prompt tests
- run manual provider tests
- verify mobile/accessibility
- collect product owner acceptance

## Acceptance Criteria

- The workflow extends Headshot without creating a second identity model.
- Uploaded and preset clothing can coexist under one clear ownership contract.
- Users can generate a basic full-body character reference without writing a prompt.
- The generated history can reconstruct source headshot, clothing source and selected semantic IDs.
- Missing assets and unsupported provider references fail gracefully.
- Implementation does not begin mass asset production before option inventory is approved.
