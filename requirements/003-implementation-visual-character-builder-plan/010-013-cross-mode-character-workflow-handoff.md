# 010-013 Cross-Mode Character Workflow Handoff

**Status:** Draft  
**Parent:** 010 Character Sheet Builder  
**Depends on:** 008, 009, 010-001 through 010-012

## Objective

Create a continuous user workflow across generation modes:

```text
Headshot Grid -> Character Sheet Builder -> Story Mode
```

The user should not need to manually download, re-upload, or reselect the same character data after each successful generation. Each generated result should offer the next natural action based on the current mode.

## Product Intent

The builder should feel like a character creation pipeline:

1. Design the face and identity.
2. Build a reusable character sheet.
3. Use that character consistently in story or scene generation.

This makes the system easier for non-prompt users and turns generated images into reusable character assets instead of isolated outputs.

## Mode Handoff Flow

### 1. Headshot Grid to Character Sheet Builder

When a Headshot Grid image is generated successfully, show a next-step action:

- `Build Character`

On click:

- switch mode to `Character Sheet Builder`
- put the selected headshot result into Face Match
- enable the Face Match reference state
- open the Character Sheet Builder form section
- scroll to the Character Sheet / Character controls
- preserve compatible headshot attributes by default
- clear incompatible non-character fields

The user should be offered a small confirmation dialog or handoff panel with options:

| Option | Default | Behavior |
| --- | --- | --- |
| Use face image as Face Match | on | send generated headshot as face reference |
| Carry compatible attributes | on | keep Character, Face, Hair, Skin where valid |
| Start fresh body/clothing | on | Body and Clothing start from Character Sheet defaults |

### 2. Character Sheet Builder to Story Mode

When a Character Sheet image is generated successfully, show a next-step action:

- `Use as Story Character`

On click:

- switch mode to `Story Mode`
- put the generated character sheet into Story Character Reference
- enable `Use Character Sheet Reference`
- preserve character identity through reference ownership rules
- open Story Mode controls
- scroll to scene/story configuration
- keep story-specific fields empty unless the user has already selected them

The Character Sheet output should become the canonical character reference for subsequent Story Mode generations.

### 3. Story Mode Result Actions

When a Story Mode image is generated successfully, show actions focused on iteration:

- `Create Variant`
- `Use as Style Reference`
- `Save to Collection`
- future: `Share Prompt / Workflow`

Story Mode should not automatically overwrite the canonical character sheet unless the user explicitly chooses a future action such as `Update Character Reference`.

## Action Naming

Current reference buttons should be renamed or contextualized so users understand the next step.

Recommended labels:

| Current / Generic Action | New Contextual Label | Mode |
| --- | --- | --- |
| Use Face Ref | Build Character | Headshot result |
| Use Character Ref | Use as Story Character | Character Sheet result |
| Use Style Ref | Use as Style Reference | Story/normal result |
| Use Face Match | Use as Face Match | manual face reference |

Button labels should be contextual to the generated image mode, not global.

## Reference Ownership Rules

### Headshot Handoff

Source:

- generated headshot image
- compatible structured selections

Target:

- Character Sheet Face Match reference
- Character Sheet identity and appearance selections

Rules:

- Headshot image controls facial identity.
- Structured attributes remain editable.
- Body and Clothing are not inferred from the headshot.
- If the provider does not support image references, the handoff action should still switch mode and carry attributes, but show Face Match as unavailable.

### Character Sheet Handoff

Source:

- generated character sheet image
- character sheet metadata
- source selection lineage

Target:

- Story Mode Character Reference

Rules:

- Character sheet image owns character identity, proportions, hairstyle, and outfit unless advanced overrides are enabled.
- Story Mode controls should focus on scene, pose, environment, lighting, framing, and commercial direction.
- Face Match remains optional and can be used together only if future provider behavior is validated.

## Attribute Handoff Rules

### Carry From Headshot to Character Sheet

Carry:

- Gender
- Age
- Ethnicity / Visual Heritage
- Beauty
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
- Freckles

Do not carry:

- Lighting
- Scene Story
- Fashion Direction
- Pose
- Environment
- NSFW
- provider-specific output settings unless compatible

### Carry From Character Sheet to Story Mode

Carry as reference metadata:

- character sheet image ID
- source headshot IDs
- source outfit reference IDs
- source selection IDs
- mode lineage

Do not force-copy into editable Story Mode fields unless explicitly needed:

- Body
- Clothing
- Face
- Hair
- Skin

These are owned by the Character Sheet Reference by default.

## UI Requirements

- Next-step actions appear near the active render screen after generation completes.
- Actions should be visible without opening the lightbox.
- Lightbox should show the same contextual actions.
- Handoff should show a concise confirmation panel if it changes mode or carries data.
- After confirmation, the page should scroll to the target workspace.
- The target mode chip should become active.
- Reference slot previews should update immediately.
- Prompt preview should update after handoff.

## Persistence and Lineage

Each handoff should record:

- source mode
- target mode
- source job ID
- source image URL
- carried selection IDs
- reference slot assignment
- timestamp
- user ID

This metadata is needed for:

- history dashboard
- future collections
- future prompt/workflow sharing
- marketplace attribution

## Application Technical Design

### Files To Update

Client:

| File | Responsibility |
| --- | --- |
| `client/index.html` | Add/prepare contextual handoff action buttons near viewport and lightbox action areas if existing buttons are insufficient. |
| `client/app.js` | Wire generation completion metadata, contextual viewport actions, mode switching, scroll behavior, and reference assignment calls. |
| `client/core/referenceManager.js` | Add reusable reference assignment helpers for headshot-to-character and character-sheet-to-story handoff. |
| `client/core/studioState.js` | Add handoff constants, allowed carry field sets, and optional in-memory handoff state. |
| `client/core/persistence.js` | Persist handoff lineage in saved configs and restore compatible reference metadata. |
| `client/core/generationService.js` | Include source mode, generated job metadata, and handoff-ready metadata in generation request/response handling if needed. |
| `client/core/historyService.js` | Surface handoff metadata in history items when available. |
| `client/style.css` | Style contextual action buttons and optional confirmation panel. |

Server:

| File | Responsibility |
| --- | --- |
| `server/generationRequestService.js` | Normalize and store handoff lineage metadata in generation context. |
| `server/comparison/ComparisonOrchestrator.js` | Ensure comparison-generated results do not accidentally trigger single-image handoff unless explicitly selected. |
| `server/comparisons.json` / future DB | Store lineage metadata when comparison results become reusable references. |

Tests:

| File | Responsibility |
| --- | --- |
| `test/modeSpecificCharacterReference.test.js` | Add reference ownership tests for Character Sheet to Story Mode handoff. |
| `test/characterSheetPersistence.test.js` | Add persistence tests for handoff metadata. |
| future `test/crossModeHandoff.test.js` | Dedicated unit test for carry/prune rules and state transitions. |

### New Client Module Recommendation

Create:

```text
client/core/crossModeHandoff.js
```

Purpose:

- keep handoff logic out of `client/app.js`
- make Headshot -> Character Sheet and Character Sheet -> Story Mode behavior testable
- avoid adding more branching to generation completion handlers

Suggested export surface:

```js
window.ModelPromptForgeCrossModeHandoff = {
  getHandoffActionForResult,
  buildHandoffContext,
  carrySelectionsForHandoff,
  applyHeadshotToCharacterSheet,
  applyCharacterSheetToStoryMode,
  renderViewportHandoffActions,
  clearViewportHandoffActions
};
```

### Data Shapes

#### Generated Result Metadata

Input from generation completion:

```js
{
  jobId: "job_123",
  imageUrl: "/outputs/job_123.png",
  mode: "headshot",
  provider: "openai",
  submodel: "gpt-image-1-mini",
  prompt: "...",
  selections: { ... },
  customColors: { ... },
  imageReferences: { ... },
  sourceOwnership: { ... },
  timestamp: 1780000000000
}
```

Process:

- normalize source mode
- check whether image URL exists
- check whether current provider supports image references
- decide contextual next action
- prepare carryable selections

Output:

```js
{
  sourceMode: "headshot",
  targetMode: "character-sheet",
  actionId: "build-character",
  actionLabel: "Build Character",
  sourceJobId: "job_123",
  sourceImageUrl: "/outputs/job_123.png",
  canAttachImageReference: true,
  carriedSelections: { ... },
  droppedFields: ["Lighting Setup", "Fashion Story"],
  referenceAssignment: {
    type: "face-match",
    slot: "faceA"
  }
}
```

#### Handoff Lineage

Persisted structure:

```js
{
  handoff: {
    version: 1,
    sourceMode: "headshot",
    targetMode: "character-sheet",
    sourceJobId: "job_123",
    sourceImageUrl: "/outputs/job_123.png",
    actionId: "build-character",
    carriedSelectionIds: {
      Gender: "character.001",
      "Face Shape": "face.shape.oval"
    },
    droppedFields: ["Lighting Setup"],
    referenceAssignment: {
      type: "face-match",
      slot: "faceA"
    },
    createdAt: "2026-07-18T10:00:00.000Z"
  }
}
```

### Function Design

#### `getHandoffActionForResult(result)`

Input:

- generated result metadata

Process:

- inspect `result.mode`
- verify `result.imageUrl`
- return correct action by source mode

Output:

```js
{
  id: "build-character",
  label: "Build Character",
  targetMode: "character-sheet",
  enabled: true,
  reason: ""
}
```

Rules:

- `headshot` -> `Build Character`
- `character-sheet` -> `Use as Story Character`
- `normal` -> `Use as Style Reference` / `Create Variant`
- missing image URL -> disabled action

#### `buildHandoffContext(result, options)`

Input:

- generated result metadata
- user-selected handoff options

Process:

- call `carrySelectionsForHandoff`
- check provider reference capability
- create lineage metadata

Output:

- normalized handoff context ready to apply

#### `carrySelectionsForHandoff(sourceSelections, sourceMode, targetMode)`

Input:

- source selections
- source mode
- target mode

Process:

- keep only fields allowed by the target mode
- apply explicit carry field allowlist
- remove NSFW, scene, pose, environment, lighting for Headshot -> Character Sheet
- do not duplicate character-owned fields for Character Sheet -> Story Mode

Output:

```js
{
  carriedSelections: { ... },
  droppedFields: ["Pose Intent", "Lighting Setup"],
  warnings: []
}
```

#### `applyHeadshotToCharacterSheet(handoffContext)`

Input:

- handoff context from a headshot result

Process:

1. save current mode state
2. set `state.mode = "character-sheet"`
3. activate Character Sheet mode chip
4. copy carried selections into `state.selections`
5. set `state.imageReferences.faceMatch = true`
6. assign source image to `state.faceReferenceImageA`
7. set `state.faceReferenceJobIds[0] = sourceJobId`
8. clear body/clothing fields unless explicitly carried later
9. call existing reference/UI refresh helpers
10. scroll to Character Sheet form section

Output:

- updated app state
- updated reference slot preview
- updated prompt preview

#### `applyCharacterSheetToStoryMode(handoffContext)`

Input:

- handoff context from a character sheet result

Process:

1. save current mode state
2. set `state.mode = "normal"`
3. activate Story Mode chip
4. set `state.imageReferences.characterReference = true`
5. assign source image to `state.characterReferenceImageA`
6. set `state.characterReferenceJobIds[0] = sourceJobId`
7. preserve existing Story Mode scene fields if present
8. clear character override flag by default
9. call existing reference/UI refresh helpers
10. scroll to Story Mode controls

Output:

- Story Mode becomes active
- Character Sheet Reference preview is visible
- prompt uses character reference ownership rules

#### `renderViewportHandoffActions(result)`

Input:

- generated result metadata

Process:

- clear old contextual handoff actions
- determine action with `getHandoffActionForResult`
- render button near `#viewport-loopback-actions`
- attach click handler

Output:

- visible contextual button after generation completes

#### `clearViewportHandoffActions()`

Input:

- none

Process:

- remove or hide contextual handoff action buttons
- reset stale result metadata

Output:

- viewport has no stale handoff actions while a new generation is running

### Event Flow

#### Headshot -> Character Sheet

```text
Generate completes
-> app.js creates jobMeta
-> renderViewportHandoffActions(jobMeta)
-> user clicks Build Character
-> buildHandoffContext(jobMeta, options)
-> applyHeadshotToCharacterSheet(context)
-> rerenderDynamicForm()
-> restoreSelectionsToUI()
-> updateReferencePreviewsUI()
-> updatePromptPreview()
-> scrollToActiveRenderScreen or target form section
```

#### Character Sheet -> Story Mode

```text
Generate completes
-> app.js creates jobMeta
-> renderViewportHandoffActions(jobMeta)
-> user clicks Use as Story Character
-> buildHandoffContext(jobMeta, options)
-> applyCharacterSheetToStoryMode(context)
-> rerenderDynamicForm()
-> restoreSelectionsToUI()
-> updateReferencePreviewsUI()
-> refreshReferenceAuthorityUI()
-> updatePromptPreview()
-> scroll to Story Mode scene controls
```

### Integration Points With Existing Functions

Reuse existing functions where possible:

- `saveCurrentModeState()`
- `restoreCurrentModeState()`
- `rerenderDynamicForm()`
- `restoreSelectionsToUI()`
- `updateReferencePreviewsUI()`
- `refreshReferenceAuthorityUI()`
- `updatePromptPreview()`
- `toggleUIForMode()`
- `scrollToActiveRenderScreen()`
- `assignCharacterReference()` if it can be safely generalized

Avoid:

- duplicating reference image assignment logic in multiple files
- direct DOM mutation from server response handling beyond calling handoff render helpers
- storing raw base64 reference images in long-term lineage metadata

### Provider Capability Handling

Input:

- active provider/model capability from `state.providerCatalog`

Process:

- if `model.capabilities.imageReferences === true`, enable image handoff
- otherwise allow attribute handoff only

Output:

- enabled contextual action with warning text, or disabled image reference attachment

Example UI copy:

```text
This model cannot use image references. Character attributes will be carried, but the generated image cannot be attached as Face Match.
```

### Testing Plan

Unit tests:

- Headshot carry rules keep only allowed fields.
- Headshot handoff assigns Face Match and switches to Character Sheet.
- Character Sheet handoff assigns Story Character Reference and switches to Story Mode.
- Missing image URL disables handoff action.
- Unsupported provider carries attributes but does not attach image reference.
- Legacy NSFW or hidden clothing fields are not carried.

Manual tests:

1. Generate Headshot.
2. Click `Build Character`.
3. Confirm Face Match slot shows generated image.
4. Confirm Character Sheet mode is active.
5. Confirm compatible attributes remain selected.
6. Generate Character Sheet.
7. Click `Use as Story Character`.
8. Confirm Story Mode is active.
9. Confirm Character Sheet Reference slot shows generated sheet.
10. Generate Story Mode image using same character reference.

## Failure and Fallback States

| Case | Behavior |
| --- | --- |
| generated image missing URL | disable handoff action |
| provider does not support image reference | carry attributes only and show reference unavailable |
| source image is deleted | keep selection metadata but mark reference unavailable |
| mode switch fails | keep current mode and show error |
| user cancels confirmation | no state changes |

## MVP Scope

Implement first:

1. Headshot result -> `Build Character`
2. Character Sheet result -> `Use as Story Character`
3. Contextual action labels in viewport and lightbox
4. Attribute pruning/carry rules
5. Reference slot assignment
6. Smooth scroll to target mode section

Defer:

- advanced handoff editor
- multi-character story handoff
- updating canonical character from Story Mode
- marketplace/workflow publishing
- public sharing

## Acceptance Criteria

- A successful Headshot Grid generation can be sent to Character Sheet Builder without manual upload.
- A successful Character Sheet generation can be sent to Story Mode without manual upload.
- Compatible attributes carry from Headshot to Character Sheet.
- Character Sheet to Story Mode uses reference ownership instead of duplicating all character fields.
- Contextual actions are clear and mode-specific.
- Handoff updates mode, references, prompt preview, and scroll position.
- Unsupported image-reference providers do not break the workflow.
- Handoff metadata is available in history or generation metadata for future lineage features.
