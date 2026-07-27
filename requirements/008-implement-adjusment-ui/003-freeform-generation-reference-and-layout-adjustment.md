# UI Adjustment 003 - Freeform Generation References and Layout

**Status:** Implemented, pending automated and visual validation  
**Owning capability:** Playground and shared generation controls  
**Knowledge contract:** `requirements/Knowledge/reference-image-role-and-precedence.md`

## 1. Visual Reference

Use [`003-freeform-generation.png`](./003-freeform-generation.png) as the
directional reference for:

- a focused two-column authoring workspace
- Prompt, negative prompt, idea assistance, and Reference inputs on the left
- Latest Render, recent renders, Engine & Output, credit estimate, and Generate
  action on the right
- a compact grid of clearly named Reference roles
- a result image large enough for an initial visual check before Lightbox

The mockup is not pixel-perfect instruction. Existing application shell,
navigation, shared generation components, localization, provider capability
contracts, and accessibility rules take precedence.

### Required Visual Differences

- Do not copy the mockup's page-level sidebar or header. Use the existing
  application shell.
- Do not apply a strong cyan/magenta glow to the whole Prompt panel.
- Make the editable `textarea` the visual focus using a clear border and a
  restrained focus ring.
- Increase Latest Render media size by approximately 15-25% relative to the
  current Playground presentation while preserving `object-fit: contain`.
- Keep Lightbox as the detailed inspection surface.

## 2. Business Requirement

Playground is the lowest-friction generation surface. A user must be able to:

1. write a prompt
2. optionally describe unwanted content
3. attach references with an understandable purpose
4. see whether the selected model can use those references
5. review estimated credits
6. generate
7. inspect the latest image and recent results

The system must not show a successful attachment while silently removing or
misclassifying that reference from the generation request.

## 3. Functional Reference Contract

Implement the role definitions and precedence in:

`requirements/Knowledge/reference-image-role-and-precedence.md`.

### 3.1 Playground Rules

- Face and Character are mutually exclusive in the standard Playground UI.
- Outfit Back is unavailable until Outfit Front exists.
- Style controls visual treatment only.
- Pose controls body arrangement and composition only.
- Outfit overrides clothing visible in an uploaded Character reference.
- Character must be transmitted from Playground when selected.
- Manual prompt mode must receive server-owned reference-role directives.
- The provider image order must match the role manifest in the directive.

### 3.2 Model Capability Rules

The Reference component must receive:

```js
{
  imageReferences: boolean,
  maxReferenceImages: number
}
```

It must display:

```text
References 3 / 6
```

and an actionable message when:

- references are unsupported
- the maximum has been reached
- Face conflicts with Character
- Outfit Back lacks Outfit Front

Unsupported controls are disabled. Attached values remain in the actor-scoped
draft when switching models, but Generate is blocked until the model and active
references are compatible.

### 3.3 Server Validation

Server validation is authoritative. For `generationSurface: "playground"`:

- reject Face + Character with `reference_role_conflict`
- reject Outfit Back without Outfit Front with `outfit_front_required`
- rely on Provider Registry for text-only and maximum-reference validation
- compile role directives for manual prompts before queueing

## 4. Layout Specification

### 4.1 Page Header

Render a compact Playground heading and an `Open Guided Studio` command. Avoid a
large marketing hero.

### 4.2 Desktop

Use a stable two-column layout:

```text
Left:  minmax(0, 1.35fr)
Right: minmax(360px, 0.85fr)
```

Left order:

1. Prompt and negative prompt
2. optional idea/prompt composer
3. Reference Images

Right order:

1. Latest Render and recent renders
2. Engine & Target Output
3. credit estimate and Generate
4. Comparison workspace when active

The right column may be sticky when viewport height allows it, but must not
trap scrolling or overlap the application header.

### 4.3 Prompt Editor

- Primary Prompt minimum height: 150px desktop, 130px mobile.
- Negative Prompt minimum height: 64px.
- Use a 1px neutral border at rest.
- Use a 1-2px cyan focus border and subtle focus shadow.
- No permanent neon outer glow.
- Add character counters and Copy controls without resizing the editor.
- Labels and descriptions must remain visually subordinate to entered text.

### 4.4 Reference Grid

- Three columns on wide desktop.
- Two columns on tablet.
- One column on narrow mobile.
- Each card has stable preview dimensions.
- Selected image preview uses `object-fit: cover`.
- Role name, short scope, status, upload/replace, and remove action must fit
  without overlap.
- Disabled cards explain why they are unavailable.

### 4.5 Result Surface

- Remain collapsed when there is no result, queue, comparison, or error state.
- Expand and scroll into view after Generate.
- Latest image uses a stable stage with `min-height: 380px` on desktop and
  responsive `max-height`.
- Entire image is clickable to open Lightbox.
- Keep Download, Detail, Copy Prompt, and recent renders in the shared
  `generationResultSurface`.
- Recent thumbnails clearly show the selected/latest item.

### 4.6 Responsive Order

Below 1024px, stack:

```text
Prompt
Latest Render when active
Idea assistance
References
Engine & Output
Generate
```

Do not use viewport-width font scaling. Controls must retain stable tap targets
and text must not clip.

## 5. Shared Component Contract

### `client/generation-controls/referenceSlotManager.js`

Extend the existing component. Do not create a Playground-only reference grid.

Inputs:

```js
{
  mount,
  value,
  capabilities,
  onChange,
  onValidationChange
}
```

Public methods:

```js
getValue()
getValidation()
setValue(patch)
setCapabilities(capabilities)
focusFirstInvalid()
```

### `client/generation-controls/promptEditor.js`

Keep this as the shared manual Prompt editor. Add structured classes, counters,
copy commands, and accessible descriptions without embedding Playground state.

### `client/generation-controls/generationResultSurface.js`

Reuse the current component. Layout changes must be option/class driven and
must not fork result handling in Playground.

## 6. Software Design

### Client Process

```text
Playground State
  -> PromptEditor
  -> ReferenceSlotManager validates role combination and model capability
  -> Engine panel changes active capability
  -> PlaygroundController updates ReferenceSlotManager capability
  -> Generate validates references
  -> canonical generation payload builder receives explicit Playground state
```

The implementation may continue using the existing compatibility state bridge
for this phase, but the bridge must:

- preserve Reference values until payload creation is complete
- include Playground in Character-reference activation
- never let a DOM checkbox become the source of truth

### Server Process

```text
POST /api/generate
  -> normalizeGenerationContext
  -> validate Playground role conflicts
  -> create canonical reference role manifest
  -> prepend role directive to manual prompt
  -> Provider Registry validates capability/count
  -> QueueManager resolves owned references
  -> provider adapter sends images in canonical order
```

## 7. File-Level Implementation Plan

### Requirements and knowledge

- Add `requirements/Knowledge/reference-image-role-and-precedence.md`.
- Add this requirement and retain
  `requirements/008-implement-adjusment-ui/003-freeform-generation.png`.

### Client modifications

- `client/playground/playgroundPage.js`
  - compose the two-column layout and correct section order
- `client/playground/playgroundController.js`
  - pass model capabilities and block invalid references
- `client/generation-controls/referenceSlotManager.js`
  - implement roles, validation, count, disabled states, and responsive markup
- `client/generation-controls/promptEditor.js`
  - add editor structure, counters, and Copy controls
- `client/core/generationService.js`
  - include Playground Character references in canonical payload
- `client/style.css`
  - implement layout without duplicating component behavior
- `client/i18n/locales/*/playground.json`
  - add all visible labels, role scopes, validation, counters, and commands

### Server modifications

- `server/domain/generation/generationRequestService.js`
  - validate role conflicts and compile manual reference directives
- `server/domain/generation/QueueManager.js`
  - persist the sanitized role manifest with generation history
- `server/domain/generation/referenceRolePolicy.js`
  - own canonical role order and directive generation
- `server/providers/GeminiProvider.js`
  - align image transport order with the canonical manifest

### Tests

- `test/playgroundReferenceRoles.test.js`
  - Face and Character conflict
  - Character survives normalization
  - Outfit Back requires Front
  - manual prompt receives role directive
  - Style directive excludes identity/outfit/pose authority
  - canonical role order remains stable

## 8. Acceptance Tests

### TC-003-001 Face Reference

Attach Face only and Generate. Payload and queue options contain Face, and the
compiled prompt instructs facial identity preservation only.

### TC-003-002 Character Reference

Attach Character only and Generate. Character reaches the queue from
Playground, and the directive preserves identity/body while allowing
destination pose and style.

### TC-003-003 Conflict

Attach Character, then attempt Face. UI requires removing Character first.
Direct API submission with both returns `reference_role_conflict`.

### TC-003-004 Style and Pose

Attach distinct Style and Pose images. The manifest lists Style before Pose and
the directive gives each image a non-overlapping role.

### TC-003-005 Outfit Pair

Outfit Back is disabled without Front. Front-only is valid. Front plus Back is
valid and sent in order.

### TC-003-006 Capabilities

Switch from a reference-capable model to a text-only model. Uploads become
disabled, values remain in the draft, and Generate is blocked.

### TC-003-007 Responsive Layout

At desktop and mobile widths:

- no controls overlap
- Prompt text remains readable
- Reference cards fit their labels
- Latest Render is not clipped
- Generate remains reachable

## 9. Release Gate

Do not mark this requirement complete until:

- all six Reference roles have deterministic payload behavior
- manual prompts receive role semantics
- provider ordering matches the manifest
- capability and maximum-count states are visible
- desktop and mobile layouts are visually verified
- required Node tests pass
