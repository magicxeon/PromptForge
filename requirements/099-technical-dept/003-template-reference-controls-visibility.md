# Template Reference Controls Visibility

**Status:** Implemented - Validation Pending  
**Owner:** Client Scene Builder and generation payload boundary  
**Created:** 2026-07-23

## 1. Business Requirement

The Studio must not display controls that cannot affect the active workflow.
When a user loads a Scene Template, its replacement checklist is the only
reference-input surface. The standard Face Match, Style Match and Pose Match
checkboxes must be hidden so users do not believe they configure the template.

## 2. System Design

### Normal Scene Builder

- `Face Match` accepts the Face Match reference upload.
- `Style Match` and `Pose Match` use the standard Style Reference input.
- These controls are available only in `mode === "normal"` outside Template
  workflow.

### Template Workflow

- `referenceSlotMapping` is the source of truth.
- `face_reference` enables Face Match only after a replacement exists.
- `character_reference` enables Character Reference only after a replacement
  exists.
- `style_reference` enables Style Match only after a replacement exists.
- Pose is not inferred from a template until a future `pose_reference` slot
  contract is implemented.
- Prior checkbox state must not be inherited into a template generation.

## 3. Software Development Specification

### Owning Files

```text
client/scene-builder/sceneReplacementChecklist.js
client/core/generationService.js
client/app.js
```

### Input / Process / Output

1. `startTemplateWorkflow(snapshot)` receives a sanitized template snapshot.
2. It hides `.matching-options-row`, `#face-match-upload-container`, and
   `#image-upload-container` while the replacement panel is active.
3. `getGenerationRequestPayload()` creates a fresh reference flag object for
   Template workflow instead of copying `window.state.imageReferences`.
4. It enables only mappings that resolve to an actual template replacement.
5. `exitTemplateWorkflow()` restores normal reference-control visibility based
   on the current normal-mode state.

## 4. Acceptance Criteria

- Loading a template hides Face Match, Style Match, Pose Match and normal
  character reference upload UI.
- A previously checked Pose Match checkbox does not create a pose reference in
  the template generation payload.
- A template with `face_reference` enables Face Match only when that reference
  slot is resolved.
- Exiting Template workflow restores the normal Scene Builder controls without
  clearing the user's normal-mode reference selections.

## 5. Manual Verification

1. In normal Scene Builder, enable Pose Match and add a Style Reference.
2. Load a template with only `face_reference`.
3. Confirm normal matching controls are hidden and the template checklist is
   the only reference UI.
4. Generate from the template and inspect the request: `poseMatch` must be
   false and Style Reference fields must be absent.
5. Cancel Template workflow and confirm normal matching controls return.
