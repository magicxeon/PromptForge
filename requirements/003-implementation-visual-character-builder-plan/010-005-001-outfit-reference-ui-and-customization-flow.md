# 010-005-001 Outfit Reference UI and Customization Flow

**Status:** Implemented - Awaiting Browser Verification
**Parent:** `010-005-clothing-reference-upload-and-ownership.md`
**Depends on:** 010-004-003, 010-004-005, 010-005, 010-007, provider capability catalog
**Impacts:** Character Sheet Clothing UI, reference state, prompt compilation, generation payload, provider validation, persistence and QA

## 1. Business Requirement

Character Sheet users must be able to upload front and optional back views of an outfit and trust that those images are actually attached to generation. The current control is visually secondary, its browse input is difficult to scan, and the active clothing options do not clearly communicate whether the uploaded outfit or modular presets own the result.

The revised experience must:

- Present Outfit Reference before Outfit Base and other Clothing controls.
- Make Front and Back slots understandable without prompt terminology.
- Activate outfit-reference state automatically after a valid Front upload.
- Preserve the uploaded garment as the primary clothing source.
- Hide controls that conflict with the uploaded garment.
- Allow only explicit, reference-safe customization overrides.
- Never silently omit uploaded references because of state, model capability, or reference-count limits.

The feature remains part of Character Sheet Builder. It does not add a new top-level mode.

## 2. MVP Scope

### 2.1 Slot Contract

| Slot | Requirement | Role |
| --- | --- | --- |
| Outfit Front | Required only when Outfit Reference is used | Primary garment shape, visible construction, color and styling source |
| Outfit Back | Optional | Back construction and details that cannot be inferred from Front |

The Outfit Reference group itself is optional. If the user does not use it, the existing modular Outfit Base flow remains available.

Back-only state is incomplete and must not activate generation reference ownership. The UI must ask the user to add Front or remove Back.

Side reference remains deferred.

### 2.2 Supported Reference States

```text
empty
  -> modular clothing controls

front_ready
  -> front reference owns outfit
  -> back details may be inferred

front_back_ready
  -> front and back references own outfit

back_only_invalid
  -> generation blocked until Front is supplied or Back is removed

unsupported_model
  -> uploads remain stored and visible
  -> generation blocked with a model capability explanation

reference_limit_conflict
  -> generation blocked with the conflicting slots listed
  -> no silent reference removal
```

## 3. UX and Layout Specification

### 3.1 Placement

Inside the expanded `Clothing` section, render controls in this order:

```text
Clothing
  Outfit Reference (Front / Back)
  Reference status / capability warning
  Outfit customization overrides, only when reference is active
  Outfit Base, only when no reference is active
  Modular colors / pattern / material, only when Outfit Base owns clothing
```

The upload panel must be the first interactive control after the Clothing section heading. It must not remain below Outfit Base or at the end of the section.

### 3.2 Upload Component

Render two stable dropzone cards in one responsive row:

```text
[ Front - Main ] [ Back - Optional ]
```

Each card must support:

- Click to browse.
- Drag and drop.
- Keyboard activation.
- Image preview using `object-fit: contain` so garment edges are visible.
- Replace action after upload.
- Remove action after upload.
- Loading and invalid-file states.
- Clear label identifying Front or Back.

On narrow mobile layouts the cards stack vertically. Their dimensions must remain stable while loading or replacing an image.

Use familiar icon actions for Upload, Replace and Remove. Prefer the application's icon library and Lucide equivalents when available. Do not introduce a network CDN only for this control and do not place emoji in the production control. Icon-only actions require tooltips and accessible labels.

### 3.3 Status Copy

Required user-facing states:

| State | Message intent |
| --- | --- |
| Empty | Front is the main outfit reference; Back is optional |
| Front ready | Front attached; unseen back details will be inferred |
| Front + Back ready | Front and Back attached |
| Back only | Add Front to use this outfit reference |
| Unsupported provider/model | Selected model cannot use image references |
| Reference limit exceeded | Selected model cannot accept all active references; identify the conflicting slots |

Do not claim that a reference is attached merely because a preview exists. The status must derive from the same canonical state used by the payload builder.

## 4. Clothing Source and Customization Rules

### 4.1 No Active Outfit Reference

Preserve the current modular flow:

- Show Outfit Base.
- Show Primary Color, Secondary Color, Pattern and Material only when a canonical Outfit Base is selected.
- Use Modest Reference Wear when no valid clothing source exists.

### 4.2 Active Outfit Reference

The uploaded reference owns garment form and default appearance.

Required UI behavior:

- Hide Outfit Base because changing garment type conflicts with the reference.
- Hide modular fallback controls by default.
- Show a compact `Customize uploaded outfit` control.
- Keep every override disabled and set to `Preserve original` until the user explicitly enables it.

Reference-safe override fields:

| Override | MVP behavior |
| --- | --- |
| Primary Color | Supported; optional explicit override |
| Secondary Color | Supported; optional explicit override |
| Pattern | Supported; optional explicit override |
| Material | Supported as an advanced override with a consistency warning |
| Outfit Base | Never available while an outfit reference is active |

Material is lower-confidence because changing material may alter drape, construction or silhouette. The UI must communicate this and must not enable Material automatically.

### 4.3 Override Data Contract

Add a dedicated state object rather than inferring override intent from stale selections:

```json
{
  "enabled": false,
  "primaryColor": false,
  "secondaryColor": false,
  "pattern": false,
  "material": false
}
```

Canonical state key:

```text
state.outfitReferenceOverrides
```

Rules:

- Uploading Front activates `imageReferences.outfitReference` but does not activate any customization override.
- Removing Front clears active outfit-reference ownership. Back may remain previewed only as an invalid/incomplete state until removed or Front is restored.
- Disabling an override omits that field from prompt compilation but may retain its last value for UI restoration.
- Clearing all outfit references restores modular clothing controls and their prior selections.
- Imported legacy state without `outfitReferenceOverrides` defaults all overrides to false.

## 5. Prompt Composition Contract

### 5.1 Reference Without Overrides

Front only:

```text
matching the garment silhouette, colors, pattern, material appearance, and visible styling from the uploaded front outfit reference, inferring unseen back details naturally
```

Front and Back:

```text
matching the clothing outfit from the uploaded front and back outfit references, preserving garment silhouette, colors, pattern, material appearance, construction, and visible details across all character sheet views
```

### 5.2 Reference With Explicit Overrides

Compile in this order:

```text
Outfit reference ownership phrase
+ explicitly enabled Primary Color override
+ explicitly enabled Secondary Color override
+ explicitly enabled Pattern override
+ explicitly enabled Material override
```

Example:

```text
matching the garment silhouette and construction from the uploaded front outfit reference, changing the primary garment color to navy, applying a subtle white pinstripe pattern while preserving all other outfit details
```

Rules:

- Do not compile Outfit Base while reference ownership is active.
- Do not compile disabled override values.
- Add `while preserving all other outfit details` when at least one override is enabled.
- Avoid contradictory phrases such as preserving original color while requesting a new color.
- Client Live Prompt Preview and server compiler must produce equivalent clothing intent.

## 6. Generation Payload Contract

When Front is valid and Character Sheet mode is active, the outgoing request must include:

```text
imageReferences.outfitReference = true
outfitReferenceImageFront = <normalized reference value>
outfitReferenceImageBack = <normalized reference value or null>
outfitReferenceJobIds = <history ids when references came from History>
outfitReferenceOverrides = <explicit override flags>
```

Invariants:

- A valid Front upload must never coexist with `imageReferences.outfitReference = false` at submission.
- Back must not be sent without Front.
- Removed slots must not remain in payload, persistence or preview state.
- Stored snapshots should use job ids or `/outputs/...` references when available and must not duplicate large Base64 data unnecessarily.
- The server must derive canonical reference truth from normalized payload fields and must not trust a UI-only label.

## 7. Provider Capability and Reference Budget

Before submission calculate total active reference images across:

```text
Face references
Character references
Style references
Outfit Front
Outfit Back
```

Required behavior:

- If the selected model does not support image references, retain the upload but block generation.
- If the selected model cannot accept all active references, list the active slots and the model limit.
- Do not silently remove Outfit Back or another user-selected reference.
- Front has higher outfit priority than Back, but any removal requires explicit user action.
- Model switching must re-run the capability and reference-budget check immediately.

## 8. Ownership, Persistence and Handoff

- Outfit reference owns clothing only; it does not own face, hair, body identity or scene style.
- Persist Front, Back, associated history job ids, and override flags in the Character Sheet user-scoped state.
- Generated history must retain `referencedOutfitJobIds` and source ownership metadata.
- Cross-mode handoff to Scene Builder uses the generated Character Sheet as Character Reference; raw outfit uploads are not automatically exposed as reusable public assets.
- Public/community sharing continues to follow reference-slot privacy and replacement policy.

## 9. Software Development Specification

### 9.1 Client Files

#### New: `client/clothing/outfitReferenceController.js`

Own the outfit-reference UI lifecycle:

```text
initOutfitReferenceController()
setOutfitReference(slot, value, metadata)
clearOutfitReference(slot)
getOutfitReferenceState()
validateOutfitReferenceState(modelConfig, activeReferences)
renderOutfitReferencePanel()
```

Inputs:

```text
active mode
Front/Back file or history reference
provider model capabilities
state.outfitReferenceOverrides
```

Outputs:

```text
canonical outfit reference state
preview/status UI
validation result
state-change event for prompt/payload refresh
```

The controller owns upload/drop/browse/remove behavior. `client/app.js` must only initialize it and must not retain outfit-specific file event branches.

#### Modify: `client/clothing/clothingOptionRules.js`

- Add a pure `resolveClothingControlState(state)` function.
- Distinguish modular, reference, invalid and unsupported states.
- Hide Outfit Base whenever reference ownership is active.
- Return visibility/enabled state for each override field.
- Keep DOM mutation inside `applyClothingVisibilityRules()`.

#### Modify: `client/core/formRenderer.js`

- Mount the Outfit Reference component first inside Clothing.
- Keep generic form rendering separate from upload business rules.
- Render an override container that `clothingOptionRules.js` controls.

#### Modify: `client/core/referenceManager.js`

- Reuse canonical slot clearing and preview normalization.
- Keep source ownership output synchronized with Front/Back readiness.
- Do not duplicate upload event handling owned by the new controller.

#### Modify: `client/core/generationService.js`

- Validate Front/Back invariants before creating payload.
- Include `outfitReferenceOverrides`.
- Guarantee automatic `imageReferences.outfitReference = true` when valid Front exists.
- Include only explicitly enabled override selections in the reference-driven payload intent.

#### Modify: `client/core/persistence.js`

- Persist override flags and slot metadata under user-scoped mode state.
- Migrate missing override state to all-false defaults.
- Remove stale Back payload when Front is absent during normalization.

#### Modify: `client/index.html` and `client/style.css`

- Register the controller before `app.js`.
- Add responsive dropzone, preview, icon action, invalid, disabled and capability-warning styles.
- Remove feature-specific inline styles from newly rendered Outfit Reference markup.

### 9.2 Server Files

#### Modify: `server/domain/generation/generationRequestService.js`

- Normalize the override contract.
- Reject Back-only payloads.
- Count Front/Back against the provider reference budget.
- Pass normalized override state to queue options and history lineage.

#### Modify: `server/domain/generation/promptCompiler.js`

- Apply uploaded-reference source priority.
- Compile only explicitly enabled overrides.
- Preserve all non-overridden garment details.
- Keep deterministic prompt order and cleanup.

#### Modify: `server/domain/generation/QueueManager.js`

- Continue resolving Front/Back references through the canonical reference resolver.
- Persist normalized outfit-reference lineage and override metadata.
- No new raw JSON access is permitted.

#### Modify: `server/domain/generation/referenceUtils.js`

- Preserve MIME-aware Base64 data URLs produced by the upload controller.
- Normalize legacy raw Base64 outfit uploads into provider-ready data URLs.
- Keep `/outputs/...` and history job-id ownership checks unchanged.

### 9.3 Expected Test Files

```text
test/outfitReferenceState.test.js
test/outfitReferencePrompt.test.js
test/generationRequestService.test.js
```

Prefer pure exported state/prompt functions so tests do not require a browser DOM for every rule.

## 10. Implementation Sequence

1. Add override defaults and migration normalization to studio state/persistence.
2. Extract existing outfit upload handlers from `client/app.js` into `outfitReferenceController.js` without changing behavior.
3. Move the component to the top of Clothing and apply modern dropzone styling.
4. Add Front-required and Back-optional state validation.
5. Add conditional modular/reference control visibility.
6. Add explicit override controls and prompt behavior.
7. Enforce payload invariants and provider reference-budget validation on client and server.
8. Persist lineage and override metadata in history/snapshots.
9. Add automated tests followed by browser smoke testing across supported providers.

Do not combine this work with unrelated form renderer refactoring or new image-asset production.

## 11. Impact and Risks

### Positive Impact

- Users can see immediately whether outfit images will be used.
- Uploaded references and preset clothing no longer compete silently.
- Clothing customization remains useful without requiring prompt writing.
- Payload and history lineage become testable and reusable by Scene Builder.

### Risks

- Existing saved modular clothing selections may appear to disappear while reference mode is active.
- Base64 Front and Back uploads can increase request size.
- Multiple reference types can exceed provider limits.
- Material overrides can reduce outfit fidelity.
- Moving handlers out of `app.js` can introduce duplicate event binding if old listeners remain.

### Mitigations

- Preserve modular selections and restore them after references are cleared.
- Reuse the existing reference payload optimization contract.
- Validate the total reference budget before submission.
- Keep Material behind an explicit advanced override.
- Mark controller initialization as idempotent and remove old `app.js` listeners in the same change.

## 12. Testing

### 12.1 Automated Cases

```text
TC-010-005-001 empty slots -> modular controls visible, outfit reference false
TC-010-005-002 Front upload -> reference true, Outfit Base hidden, all overrides false
TC-010-005-003 Front + Back -> both values attached and counted as two references
TC-010-005-004 Back only -> invalid and generation blocked
TC-010-005-005 clear Front/Back -> modular controls and prior selections restored
TC-010-005-006 color override enabled -> color prompt included
TC-010-005-007 color value retained but override disabled -> color prompt omitted
TC-010-005-008 reference + Outfit Base legacy selection -> Outfit Base omitted
TC-010-005-009 unsupported model -> upload retained and generation blocked
TC-010-005-010 reference count exceeds model limit -> no silent slot removal
TC-010-005-011 payload contains Front/Back and reference flag consistently
TC-010-005-012 imported legacy state -> override flags default false
```

### 12.2 Browser Smoke Test

1. Open Character Sheet Builder and expand Clothing.
2. Confirm Outfit Reference appears before Outfit Base.
3. Upload Front and verify preview, status and automatic reference activation.
4. Confirm Outfit Base disappears and customization defaults to Preserve original.
5. Enable only Primary Color override and verify Live Prompt Preview changes without changing garment type.
6. Add Back and verify both references are listed in payload.
7. Remove Front while Back remains and verify Generate is blocked.
8. Restore Front, choose a model without reference support, and verify a clear capability warning.
9. Clear both slots and verify modular clothing controls return with prior selections.
10. Generate with a supported model and verify history records `referencedOutfitJobIds` and outfit source ownership.

## 13. Acceptance Criteria

- Outfit Reference is the first control in Clothing.
- Front and Back use clear modern browse/dropzone controls with accessible actions.
- Front upload automatically activates outfit-reference payload state.
- Back is optional but cannot be submitted without Front.
- Outfit Base is unavailable while outfit reference owns clothing.
- Overrides are opt-in and default to Preserve original.
- Disabled overrides never enter the prompt.
- Unsupported models and reference-limit conflicts block generation with actionable feedback.
- Front/Back values reach server queue options and provider reference resolution.
- Clearing references restores modular clothing behavior without losing prior selections.
- Implementation keeps clothing-specific logic out of `client/app.js` and generic visual controls.

## 14. Implementation Log

### 2026-07-20 - Front/Back Reference UI and Payload Invariants

- Added `client/clothing/outfitReferenceController.js` as the owner of browse, drag/drop, preview, replace, remove, state synchronization and provider validation.
- Moved Outfit Reference to the first position inside Clothing and replaced raw file inputs with stable Front and Back dropzones.
- Added client-side image resizing and JPEG normalization before persistence/submission to reduce Base64 request size.
- Made Outfit Front canonical: Front activates reference ownership, Back remains optional, and Back-only generation is blocked.
- Added opt-in Primary Color, Secondary Color, Pattern and Material override flags; Outfit Base remains hidden while Front owns clothing.
- Persisted `outfitReferenceOverrides` in user-scoped mode state and portable configurations with all-false legacy defaults.
- Updated client and server prompt compilers to include only explicitly enabled overrides and preserve all other outfit details.
- Updated generation payload normalization, queue options and history lineage so Front/Back and override metadata reach provider execution consistently.
- Added server-side Back-only rejection and tests for canonical activation, queue forwarding and deterministic override compilation.

Browser verification remains required for responsive layout, drag/drop interaction, provider capability messages and a real generation using Front/Back references.
