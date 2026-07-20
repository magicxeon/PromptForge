# Scene-001 Scene Mode Rename and Navigation Contract

**Status:** Proposed - Awaiting Review  
**Feature type:** Naming, route and state compatibility  
**Depends on:** Application shell, Studio state, cross-mode handoff  
**Created:** 2026-07-18

## 1. Objective

Rename the user-facing Story Mode concept to **Scene Builder** while preserving compatibility with existing saved state, history and internal generation logic.

## 2. User-Facing Naming

Replace visible Story Mode naming with:

```text
Scene Builder
```

Recommended supporting labels:

- Guided Scene
- Manual Prompt
- Character Reference
- Outfit Reference
- Scene Template

Avoid naming that implies product-only generation in MVP.

## 3. Navigation

Scene Builder remains part of Studio in MVP.

Recommended Studio workflow:

```text
Headshot Grid -> Character Sheet -> Scene Builder -> Community Share
```

Routes may remain under `/studio` initially. A future route can be added:

```text
/studio/scene
/studio/scene/template/:templateId
```

## 4. Compatibility Rules

- Existing saved mode values must remain loadable.
- If current state uses `normal` for Story Mode behavior, do not break generation.
- Add a display-level mode label resolver before changing low-level enums.
- History items generated before the rename must still show correctly.
- Community templates should store `sceneTemplateVersion`, not only mode label text.

## 5. Handoff Rules

- Headshot result can hand off to Character Sheet.
- Character Sheet result can hand off to Scene Builder as Character Reference.
- Scene Builder result can be shared as a Scene Template.

## 6. Acceptance Criteria

- UI no longer shows Story Mode as the primary user-facing name.
- Older history records remain usable.
- Cross-mode handoff still works after the naming change.
- Template records use stable versioned fields instead of display strings.

## 7. Software Development Specification

### 7.1 Files To Review

- `client/core/studioState.js`
- `client/core/persistence.js`
- `client/core/promptCompiler.js`
- `client/core/generationService.js`
- `client/core/crossModeHandoff.js`
- `client/index.html`
- `client/style.css`

### 7.2 Implementation Steps

1. Add a display label resolver for legacy mode values.
2. Replace visible Story labels with Scene Builder labels.
3. Preserve existing internal `normal` mode behavior until a safe migration exists.
4. Add route/state compatibility for future `/studio/scene`.
5. Update handoff labels from Character Sheet to Scene Builder.

### 7.3 Input, Process, Output

Input: legacy mode value, current route, saved payload.

Process: resolve display mode, apply Scene Builder UI label, preserve compatible state.

Output: same generation behavior with updated user-facing naming.

## 8. Implementation Concerns

- Do not rename persisted enum values before migration tests exist.
- Do not break old history items or saved local storage payloads.
- Handoff copy should describe Character Reference clearly, not generic image reference.
- If route changes are introduced later, browser Back/Forward behavior must remain correct.

## 9. Functional Technical Specification

### 9.1 Client Files To Modify

```text
client/core/studioState.js
client/core/persistence.js
client/core/crossModeHandoff.js
client/shell/navigationRegistry.js
client/shell/router.js
client/index.html
client/style.css
```

### 9.2 New Client Files

```text
client/scene-builder/sceneModeLabels.js
client/scene-builder/sceneBuilderNavigation.js
```

### 9.3 Required Functions

```text
resolveSceneDisplayMode(mode) -> { id, label, legacyMode }
isSceneBuilderMode(mode) -> boolean
getSceneBuilderRouteState(route, state) -> SceneRouteState
applySceneBuilderNavigationState(routeState) -> void
normalizeLegacySceneMode(payload) -> NormalizedModePayload
```

### 9.4 Input, Process, Output

Input:

- Current `state.mode`.
- Saved local storage payload.
- History item mode.
- Router path.

Process:

- Detect legacy `normal` / `story` behavior.
- Render Scene Builder label for final-image workflow.
- Preserve internal mode value until migration is deliberate.

Output:

- UI label and active navigation state.
- Safe payload for current generation flow.
- Migration warnings only when data cannot be resolved.

### 9.5 Concerns For Implementing Agents

- Do not delete `normal` mode behavior.
- Do not update all mode strings globally with search/replace.
- Verify Character Sheet handoff still targets Scene Builder after label changes.
