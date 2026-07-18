# Scene Builder Template Master

**Status:** Proposed - Awaiting Review  
**Feature type:** Scene generation, reusable templates and community remix foundation  
**Depends on:** Visual Character Builder, Character Sheet handoff, generation history, Community-04 in requirements/005-implementation-community-plan, Community-05 in requirements/005-implementation-community-plan  
**Created:** 2026-07-18

## 1. Objective

Rename and evolve the current Story Mode direction into **Scene Builder**.

Scene Builder is the final image creation surface where users combine:

- Character identity from Headshot / Character Sheet.
- Face or character references.
- Outfit presets or outfit reference uploads.
- Scene, pose, camera, lighting and visual style.
- A generated prompt that can be shared, remixed and reused as a community template.

MVP must focus on **human model / character + clothing + scene**. Product-only workflows are intentionally deferred because the current foundation is built around human identity and clothing.

## 2. Product Decision

Scene Builder has two authoring modes on the same Studio surface:

```text
Guided Mode
Manual Mode
```

Guided Mode uses structured categories, options, visual controls and reference slots.

Manual Mode lets users write the prompt themselves and upload references manually. It must still save into the same Scene Template contract so it can later be shared, reused or upgraded with an AI Prompt Assistant.

## 3. Why This Matters For Community

Scene Builder is not only a generation UI. It becomes the template authoring system for Community.

Community posts should be able to share:

- Final prompt snapshot.
- Structured selections.
- Reference slot mapping.
- Replaceable variables.
- Provider/model/settings snapshot.
- Prompt visibility and remix policy.

The long-term commercial path is selling templates or workflow packs. MVP only needs free sharing and remix.

## 4. Requirement Sequence

| Phase | Requirement | Purpose |
|---|---|---|
| Scene-001 | Scene Mode Rename and Navigation Contract | Rename Story Mode to Scene Builder without breaking saved state |
| Scene-002 | Guided and Manual Authoring Modes | Define two mode UX and shared output contract |
| Scene-003 | Scene Template Data Contract | Define reusable template schema |
| Scene-004 | Replaceable Variables and Slot Mapping | Define what users can replace when using a template |
| Scene-005 | Reference Slot Ownership and Privacy | Define attach/share/replace behavior for images |
| Scene-006 | Community Share and Use Template Flow | Connect Scene Template to community sharing/remix |
| Scene-007 | Client Module Architecture | Keep Scene Builder modular and avoid app.js growth |
| Scene-008 | QA, Migration and Release Gates | Validate compatibility and MVP launch readiness |

## 5. MVP Scope

Included:

- Scene Builder naming and route/state compatibility.
- Guided / Manual tabs or segmented control in the same workspace.
- Template snapshot from generated Scene Builder output.
- Replaceable fields for face, character, outfit, style, color, text and selected options.
- Community share-ready template payload.
- Use Template flow that opens Scene Builder with required replacement slots.
- Prompt visibility policy aligned with Community-04 in requirements/005-implementation-community-plan.

Deferred:

- Product-only templates.
- Paid template marketplace.
- AI Prompt Assistant for Manual Mode.
- Multi-scene storyboards.
- Creator membership template libraries.
- Public template version marketplace.

## 6. Naming Guidance

Preferred product name:

```text
Scene Builder
```

Internal compatibility:

- Existing `normal` or `story` state names may remain internally during migration.
- Public UI should gradually replace `Story Mode` with `Scene Builder`.
- APIs and saved payloads should include a versioned compatibility layer so older records remain loadable.

## 7. Success Criteria

- A user can build a final model/fashion image without writing prompt text.
- A power user can switch to Manual Mode without losing reference slots.
- A generated Scene Builder result can produce a template snapshot.
- Another user can click `Use Template`, replace required images/options and generate.
- Community sharing does not expose private references unless explicitly allowed.

## 8. Software Development Specification

### 8.1 Target Modules

Recommended client modules:

```text
client/scene-builder/
  sceneBuilderState.js
  sceneBuilderModeSwitcher.js
  sceneTemplateSerializer.js
  sceneTemplateHydrator.js
  sceneVariableControls.js
  sceneReferenceSlots.js
  sceneTemplateValidation.js
```

Recommended server modules:

```text
server/sceneTemplates/
  SceneTemplateService.js
  SceneTemplateRepository.js
  SceneTemplateValidator.js
  sceneTemplateSnapshot.js
```

`client/app.js` should only wire lifecycle events and high-level actions.

### 8.2 Input, Process, Output

Input:

- Current Studio selections.
- Manual prompt text.
- Reference images and reference slot policy.
- Provider/model generation settings.
- Community share visibility intent.

Process:

- Normalize active authoring mode.
- Compile or preserve prompt.
- Serialize scene template snapshot.
- Validate required variables and reference slots.
- Send normal generation payload through existing provider gateway.

Output:

- Generated Scene Builder image.
- History entry with `sceneTemplateSnapshot`.
- Optional Community share draft.
- Reusable template payload for `Use Template`.

### 8.3 Storage Strategy

MVP can remain JSON-backed, but schema must be database-ready:

- Stable IDs.
- Version fields.
- Immutable published snapshot.
- No dependency on DOM labels as canonical keys.

## 9. Implementation Concerns

- Do not make Scene Builder depend on Community publishing to generate images.
- Do not expose private reference image URLs in template snapshots.
- Keep `normal` / legacy Story state compatible until migration is complete.
- Avoid adding Scene Builder logic directly into `app.js`.
- Manual Mode must not bypass safety, provider capability or reference privacy validation.
- Product-only workflows are deferred; avoid adding product-specific fields that confuse the first MVP.
