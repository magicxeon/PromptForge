# Scene-009 Client Module Architecture

**Status:** Proposed - Awaiting Review  
**Feature type:** Frontend modularization and maintainability  
**Depends on:** Current client refactor, Visual Character Builder modules  
**Created:** 2026-07-18

## 1. Objective

Build Scene Builder without growing `client/app.js` into a large mixed-responsibility file again.

## 2. Proposed Modules

```text
client/scene-builder/
  sceneBuilderState.js
  sceneBuilderModeSwitcher.js
  sceneTemplateSerializer.js
  sceneTemplateHydrator.js
  sceneVariableControls.js
  sceneReferenceSlots.js
  sceneSharePreview.js
  sceneTemplateValidation.js
```

Shared functions should move to `client/core` only when they are used by multiple modules.

## 3. Server Modules

```text
server/sceneTemplates/
  SceneTemplateService.js
  SceneTemplateRepository.js
  SceneTemplateValidator.js
  sceneTemplateSnapshot.js
```

MVP may store JSON first, but the contract should be database-ready.

## 4. Boundaries

Scene Builder module owns:

- Guided/manual authoring state.
- Template serialization/hydration.
- Variable controls.
- Template share preview payload.

Reference Manager owns:

- Reference image state.
- Upload/clear/preview behavior.
- Slot policy enforcement shared with Scene Builder.

Prompt compiler owns:

- Final prompt assembly.
- Prompt preview text.

Community module owns:

- Public post records.
- Feed and post detail.
- Like/save/remix events.

## 5. Acceptance Criteria

- Scene Builder code is not added directly to `app.js` except minimal wiring.
- Template serialization can be unit tested without DOM.
- Hydration can restore a template into Studio state.
- Reference policy validation is testable.

## 6. Software Development Specification

### 6.1 Module Interfaces

```text
sceneBuilderState.getState()
sceneBuilderState.applyPatch(patch)
sceneTemplateSerializer.createSnapshot(context)
sceneTemplateHydrator.hydrate(snapshot, replacements)
sceneTemplateValidation.validate(snapshot)
sceneVariableControls.render(container, variables)
```

### 6.2 Dependency Direction

Allowed:

```text
app.js -> scene-builder modules
scene-builder -> core state/reference/prompt services
community -> scene template public contract
```

Not allowed:

```text
scene-builder -> community feed internals
scene-builder -> provider-specific request builders
scene-builder -> direct credit mutation
```

### 6.3 Test Strategy

- Serializer unit tests.
- Hydrator unit tests.
- Variable resolver unit tests.
- Reference slot policy tests.
- One browser/manual QA pass for Guided/Manual switching.

## 7. Implementation Concerns

- Keep DOM-heavy rendering separate from pure template logic.
- Avoid circular globals on `window`.
- Prefer explicit exported module functions over adding more one-off helpers to `app.js`.
- Keep JSON schema stable so later database migration is straightforward.

## 8. Functional Technical Specification

### 8.1 Client File Responsibilities

```text
sceneBuilderState.js
- owns Scene Builder authoring mode state
- exposes state getter/patch helpers

sceneBuilderModeSwitcher.js
- owns Guided/Manual switching behavior
- handles prompt copy confirmation

sceneTemplateSerializer.js
- creates pure Scene Template snapshots

sceneTemplateHydrator.js
- converts template snapshot plus replacements into Studio state patch

sceneVariableControls.js
- renders controls for variables

sceneReferenceSlots.js
- maps reference manager state to Scene Template slots

sceneTemplateValidation.js
- validates template, variables and required replacements

sceneBuilderUi.js
- mounts Scene Builder UI controls and delegates to modules
```

### 8.2 Server File Responsibilities

```text
SceneTemplateService.js
- orchestrates template draft/share/use operations

SceneTemplateRepository.js
- JSON-backed storage first, database-ready interface

SceneTemplateValidator.js
- validates snapshot and replacement input

sceneTemplateSnapshot.js
- pure snapshot construction and migration helpers

sceneTemplateSanitizer.js
- public/private field filtering
```

### 8.3 Wiring Rule

`client/app.js` may call:

```text
window.ModelPromptForgeSceneBuilder.init()
window.ModelPromptForgeSceneBuilder.createSnapshot()
window.ModelPromptForgeSceneBuilder.hydrateTemplate()
```

It must not own variable resolution, slot privacy or template serialization.

## 9. Implementation Plan: Scene Builder Modularization Pass

This plan defines the implementation boundary for the Scene Builder client/module architecture pass. The goal is to reduce future friction and prevent `client/app.js` from becoming the place where every new Scene Builder feature is implemented.

---

## User Review Required

> [!IMPORTANT]
> - **No broad rewrite in this phase**:
>   - Do not rewrite all existing Studio UI code.
>   - Move only Scene Builder-specific logic that has already stabilized or is needed by current requirements.
> - **`app.js` is wiring only**:
>   - `app.js` may initialize modules, pass shared dependencies and call public module methods.
>   - `app.js` must not implement template serialization, variable resolution, slot policy rules or share preview rendering.
> - **Keep browser-global compatibility for MVP**:
>   - Existing modules may continue exposing `window.ModelPromptForge...` namespaces.
>   - New modules should still keep pure functions internally so later ES module migration is straightforward.
> - **No Community production module in this phase**:
>   - Scene Builder may expose contracts consumed by Community later.
>   - Do not implement real community feed, creator profile or public permission screens under Scene-009.

---

## Open Questions

> [!NOTE]
> None for MVP. If an implementation agent finds a circular dependency, split the shared helper into `client/core` instead of importing Scene Builder internals across modules.

---

## Proposed Changes

### Client Module Layer

#### [NEW or EXTEND] `client/scene-builder/sceneBuilderController.js`

Optional aggregator module that exposes one stable public namespace:

```text
window.ModelPromptForgeSceneBuilder
- init(dependencies)
- getAuthoringMode()
- setAuthoringMode(mode, options)
- createSnapshot(context)
- hydrateTemplate(snapshot, replacements)
- startTemplateWorkflow(snapshot)
```

This file should delegate to smaller modules and should not contain heavy DOM rendering itself.

#### [MODIFY] `client/app.js`

- Replace direct Scene Builder logic with module calls.
- Keep only initialization, event binding delegation and payload integration points.
- Do not add new modal, template, variable or share rendering logic directly here.

#### [EXTEND] Existing Scene Builder Modules

```text
client/scene-builder/sceneBuilderState.js
client/scene-builder/sceneBuilderModeSwitcher.js
client/scene-builder/sceneBuilderUi.js
client/scene-builder/sceneTemplateSerializer.js
client/scene-builder/sceneTemplateHydrator.js
client/scene-builder/sceneVariableControls.js
client/scene-builder/sceneVariableResolver.js
client/scene-builder/sceneTemplateValidation.js
client/scene-builder/sceneReplacementChecklist.js
client/scene-builder/sceneHistorySlotPicker.js
client/scene-builder/sceneSharePreview.js
```

Expected responsibility:

- State modules manage data.
- UI modules render and bind controls.
- Serializer/hydrator/resolver modules stay pure enough for node tests.
- Checklist and share preview modules coordinate user workflow but delegate validation and policy logic.

### Server Module Layer

#### [EXTEND] `server/sceneTemplates/*`

Keep server-side template behavior grouped under `server/sceneTemplates`:

```text
SceneTemplateService.js
SceneTemplateValidator.js
sceneTemplateSnapshot.js
sceneTemplateSanitizer.js
sceneReferenceSlotPolicy.js
```

Server modules own final safety checks and must not rely on client-only validation.

---

## Verification Plan

### Automated Checks

Ask the user to run these after implementation:

```powershell
node --check client/app.js
node --check client/scene-builder/sceneBuilderState.js
node --check client/scene-builder/sceneTemplateSerializer.js
node --check client/scene-builder/sceneTemplateHydrator.js
node --check client/scene-builder/sceneVariableResolver.js
node --check client/scene-builder/sceneReplacementChecklist.js
node --test test/sceneBuilderMigration.test.js
node --test test/sceneTemplateHydrator.test.js
node --test test/sceneTemplateSnapshot.test.js
```

### Manual Verification

1. Open Studio.
2. Switch between Guided and Manual authoring modes.
3. Confirm switching mode does not reset Generation Mode or unrelated form selections.
4. Generate a Guided Scene image.
5. Generate a Manual Scene image.
6. Use a saved/shared template and confirm the replacement checklist still opens.
7. Confirm `app.js` changes are mostly wiring and no large new Scene Builder logic was added there.

### Review Checklist

- No new Scene Builder feature is implemented directly inside `app.js`.
- Pure modules can be tested without DOM where practical.
- UI modules do not own provider-specific generation request construction.
- No circular dependency is introduced between `client/core`, `client/scene-builder` and future `client/community`.
