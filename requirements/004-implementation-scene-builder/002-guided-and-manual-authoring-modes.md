# Scene-002 Guided and Manual Authoring Modes

**Status:** Proposed - Awaiting Review  
**Feature type:** Scene Builder authoring UX  
**Depends on:** Visual controls, prompt compiler, reference manager  
**Created:** 2026-07-18

## 1. Objective

Split Scene Builder authoring into two clear modes:

```text
Guided Mode
Manual Mode
```

Both modes must generate through the same provider gateway and produce a compatible Scene Template snapshot.

## 2. Guided Mode

Guided Mode uses:

- Category sections.
- Dropdown or visual options.
- Custom write-in text where supported.
- Reference slots.
- Prompt preview.
- Provider/model settings.

Guided Mode is for users who do not want to write prompts from scratch.

## 3. Manual Mode

Manual Mode uses:

- Editable prompt textarea.
- Optional negative prompt textarea when supported by the app contract.
- Manual reference uploads.
- Provider/model settings.
- Optional template variables.

Manual Mode is for advanced users and template creators.

MVP does not include AI Prompt Assistant. Keep the contract ready for it later.

## 4. Shared Output Contract

Both modes must produce:

```text
SceneTemplateSnapshot
- authoringMode: guided | manual
- finalPrompt
- structuredSelections
- manualPromptText
- referenceSlotMapping
- replaceableVariables
- providerModelSnapshot
- generationSettings
```

Guided Mode may leave `manualPromptText` empty.

Manual Mode may leave `structuredSelections` empty but should still allow user-defined variables and reference slot mapping.

## 5. UI Direction

Use a segmented control near the Scene Builder header:

```text
[ Guided ] [ Manual ]
```

Rules:

- Switching from Guided to Manual should offer to copy generated prompt into Manual prompt.
- Switching from Manual to Guided should not attempt full parsing in MVP.
- Reference slots remain visible or accessible in both modes.
- Provider/model settings are shared.

## 6. Acceptance Criteria

- User can generate a Scene image from Guided Mode.
- User can generate a Scene image from Manual Mode.
- Both modes save enough metadata to become community templates.
- Switching modes does not erase references without user confirmation.

## 7. Software Development Specification

### 7.1 Client State

Create an authoring mode state layer:

```text
sceneBuilderState.authoringMode = guided | manual
sceneBuilderState.manualPromptText
sceneBuilderState.lastGuidedPromptSnapshot
```

Keep authoring mode separate from provider/model selection.

### 7.2 Guided Mode Pipeline

Input:

- Structured selections.
- Visual option controls.
- Reference slot state.

Process:

- Compile prompt using existing prompt compiler.
- Keep selections as canonical editable state.

Output:

- `finalPrompt`
- `structuredSelectionsSnapshot`
- `authoringMode: guided`

### 7.3 Manual Mode Pipeline

Input:

- Manual prompt textarea.
- Reference slot state.
- Optional user-defined variables.

Process:

- Validate prompt is not empty.
- Preserve manual text as canonical prompt source.
- Skip reverse-parsing into dropdown selections in MVP.

Output:

- `finalPrompt`
- `manualPromptSnapshot`
- `authoringMode: manual`

## 8. Implementation Concerns

- Switching Guided to Manual can copy current generated prompt, but Manual to Guided must not pretend parsing is reliable.
- Reference slots must not be cleared when switching tabs.
- Admin editable prompt behavior must be reconciled with Manual Mode to avoid duplicate prompt sources.
- Manual Mode still needs same moderation, provider capability and reference limits as Guided Mode.
