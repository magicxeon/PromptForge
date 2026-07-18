# Scene-007 Client Module Architecture

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
