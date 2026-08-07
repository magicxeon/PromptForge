# Admin Visual Attribute Studio Master Plan

**ID:** `098-admin-visual-attribute-studio`  
**Status:** Planned  
**Capability owner:** Attribute Catalog  
**Primary route:** `/admin/attributes`  
**Audience:** Admin; Support is read-only unless explicitly granted

## 1. Product Goal

Provide one professional Admin tool for creating, illustrating, validating,
publishing, disabling and retiring every guided generation Attribute used by
Face Creator, Character Sheet and Scene Builder.

An Admin enters structured Attribute information and may ask AI to generate a
consistent visual option such as a face diagram, body silhouette, hairstyle,
garment illustration or material swatch. The tool must preserve the existing
Visual Character Builder experience while removing the need to edit scattered
JSON files, manifests and React mappings manually.

## 2. Why This Is a Separate Capability

This work owns more than an Admin page. It owns:

- Attribute taxonomy and stable semantic IDs
- field and option lifecycle
- prompt contributions and provider adaptations
- Visual Option assets and manifests
- enable/disable and mode exposure
- compatibility, dependency and Reference override rules
- validation, versioning, publishing and rollback
- migration of existing Attribute files and hard-coded visual mappings

The Admin UI is a client of the Attribute Catalog capability. Generation,
Credits, Assets and Reference Processing remain separate capability owners.

## 3. Existing System Baseline

The current runtime loads:

- 24 Attribute files under `attributes/`
- UI schema, prompt order, templates and presets under `attributes/spec/`
- visual manifests under `client/assets/visual-character-builder/`
- visual presentation mappings in
  `web/src/features/studio/visual-options/visualOptionRegistry.ts`
- runtime compilation through the existing Generation prompt compiler

These sources cannot be replaced in one release. The implementation must first
create a canonical catalog contract, import existing data, prove compiled bundle
parity, then switch the public bundle reader.

## 4. Complete Category Coverage

The inventory must include every existing source file and classify it as a user
Attribute, system policy or reserved placeholder:

| Current source | Catalog family | Notes |
|---|---|---|
| Character | Identity foundation | Gender/presentation, age, heritage and related controls |
| Face, Eyes, Eyebrows, Nose, Lips | Facial structure | Visual and text fallback options |
| Skin | Appearance | Tone, texture, makeup and related swatches |
| Hair, Hair Extra | Hair | Length, cut/style, texture, fringe, base and highlight color |
| Body | Body direction | Height, build, silhouette and sheet layout |
| Clothing | Garment direction | Base outfit, scope, color tone, pattern, material and surface |
| Pose | Direction | Pose intent, hands and gaze |
| Expression | Direction | Face and performance direction |
| Environment, Architecture | Scene | Physical setting and architecture |
| Lighting | Photography | Source, direction, quality and contrast |
| Camera, Camera Framing | Photography | Shot, angle, lens and composition |
| Quality | Output treatment | Capture and realism controls |
| Photographic Context | Guided context | May be hidden or recipe-owned by mode |
| Scene Story | Guided context | May be hidden or recipe-owned by mode |
| Fashion Commerce | Commercial direction | Fashion presets and advanced direction |
| Accessories | Styling | Reserved/incomplete source must remain explicit |
| NSFW | Safety policy | Never exposed as an ordinary customer Attribute |

Empty placeholder sources must remain visible to Admin as incomplete catalog
families, not silently disappear.

## 5. Core Admin Workflows

### 5.1 Browse and Audit

```text
Admin -> Attributes menu
  -> filter by category, mode, visual state, lifecycle and validation status
  -> inspect field or option
  -> see current release usage and affected workflows
```

### 5.2 Create an Attribute Option

```text
Choose category/field
  -> define stable ID, labels and description
  -> select control and mode exposure
  -> define prompt contribution and rules
  -> choose visual type
  -> generate/upload visual variants
  -> validate against fixtures
  -> review impact
  -> publish a new catalog release
```

### 5.3 Edit Existing Content

Published semantic IDs are immutable. Editing creates a draft revision. Label,
asset and safe prompt corrections may be released through a new version. A
semantic meaning change requires a new option ID plus an explicit migration.

### 5.4 Disable and Retire

- Disable removes the option from new selections without breaking saved work.
- Retire marks the option unavailable and identifies its replacement/fallback.
- Published options are never hard-deleted while referenced by saved work.
- Re-enable and rollback actions are audited.

## 6. Required Entities

- `CatalogRelease`
- `CategoryDefinition`
- `FieldDefinition`
- `OptionDefinition`
- `PromptContribution`
- `VisualAssetSet`
- `CompatibilityRule`
- `ModeExposurePolicy`
- `ValidationResult`
- `GenerationFixtureResult`
- `MigrationRule`
- `AuditEvent`

Every entity requires schema version, stable ID, revision, lifecycle status,
creator/updater actor, timestamps and release provenance.

## 7. Lifecycle

```text
draft
  -> asset_generating (optional)
  -> validation_failed | review_ready
  -> approved
  -> published
  -> disabled
  -> retired
```

Generation errors return the draft to an editable state and preserve a safe
support reference. Publication is an explicit atomic release operation.

## 8. UI Direction

The Admin tool is a dense work surface, not a marketing page:

- left: catalog tree and saved filters
- center: field/option editor and rule editor
- right: visual preview, prompt impact and validation status
- lower workspace: generated variants, fixture comparison and release history

Use existing Momelo themes and shared controls. Visual cards must show hover,
selected, disabled, missing-asset and retired states exactly as customers will
see them. All user-visible strings use i18n.

## 9. Capability Boundaries

- Attribute Catalog owns definitions, releases and compatibility metadata.
- Generation owns AI dispatch and final prompt compilation.
- Assets owns uploads, derivatives and secure media URLs.
- Credits owns any budget reservation; Admin generation may use a separately
  audited system budget but cannot bypass Credit contracts.
- Reference Processing owns reference authority and override behavior.
- Audit owns material Admin activity records.

The Admin route must not write JSON files or call providers directly.

## 10. Implementation Sequence

| Step | Requirement | Outcome |
|---:|---|---|
| 001 | Inventory and Canonical Contract | Complete source map and versioned schemas |
| 002 | Server Domain, Repository and Releases | Canonical Attribute Catalog workflow |
| 003 | AI Visual Asset Authoring Pipeline | Generate/upload/review visual variants |
| 004 | React Admin Authoring Experience | `/admin/attributes` and left navigation |
| 005 | Compatibility, Prompt and Safety Validation | Prevent invalid/conflicting publication |
| 006 | Migration, Publishing and Runtime Integration | Parity switch and rollback |
| 007 | QA, Security, Observability and Release | Production acceptance gate |

## 11. Success Criteria

- Every current category is inventoried and represented.
- Admin can create, revise, generate visuals for, validate and publish an option.
- Enable/disable works by option, field, category and generation mode.
- Existing saved configurations continue to compile.
- Customer Visual Option UI no longer depends on manual React option maps.
- Invalid prompt/rule combinations cannot be published.
- Every publication, disable, retirement and rollback is auditable.
- Runtime can rollback to the previous immutable release.

## 12. Related Requirements

- `requirements/003-implementation-visual-character-builder-plan/`
- `requirements/009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md`
- `requirements/011-reference-processing-pipeline/`
- `requirements/015-lab-finetune-prompt/`
- `requirements/099-technical-dept/000-master.md`

