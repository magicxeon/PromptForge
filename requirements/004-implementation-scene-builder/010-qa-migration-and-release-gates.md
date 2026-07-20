# Scene-010 QA, Migration and Release Gates

**Status:** Proposed - Awaiting Review  
**Feature type:** QA, compatibility and launch gates  
**Depends on:** Scene-001 through Scene-009  
**Created:** 2026-07-18

## 1. Objective

Define quality gates for Scene Builder and community template reuse.

## 2. Migration Checks

- Existing Story/normal mode history still loads.
- Existing Headshot -> Character Sheet handoff still works.
- Character Sheet -> Scene Builder handoff attaches Character Reference.
- Existing prompt visibility behavior remains compatible.

## 3. Template Test Cases

Required MVP cases:

```text
TC-SCENE-001 Guided template with character reference replacement
TC-SCENE-002 Guided template with outfit color replacement
TC-SCENE-003 Guided template with outfit front/back replacement
TC-SCENE-004 Manual template with prompt and face reference slot
TC-SCENE-005 Remix Only template where prompt text is hidden but template works
TC-SCENE-006 Missing required replacement slot blocks generation
TC-SCENE-007 Old history record without template snapshot degrades gracefully
TC-SCENE-008 Provider/model unavailable fallback
```

## 4. Safety Checks

- Private references are not exposed in public template payloads.
- Prompt visibility is enforced on public APIs.
- User replacement text is validated like normal custom text.
- Upload metadata is stripped before public sharing.

## 5. UX Checks

- Guided/Manual switch does not erase user work unexpectedly.
- Required replacement checklist is understandable.
- `Use Template` does not require prompt typing for common Guided templates.
- Manual Mode still supports full prompt editing.

## 6. Release Gates

### Gate A: Local Prototype

- Scene Builder naming visible.
- Guided/Manual UI prototype exists.
- Template JSON can serialize and hydrate locally.

### Gate B: Private Template Beta

- Share preview works.
- Use Template opens Scene Builder with replacement slots.
- Remix events are recorded.

### Gate C: Community MVP

- Public posts can include Scene Template workflow snapshot.
- Prompt visibility and reference privacy are enforced.
- At least five official reusable templates pass QA.

## 7. Software Development Specification

### 7.1 Required Automated Checks

Add lightweight tests where possible:

- Scene template snapshot serialization.
- Template hydration with missing/stale fields.
- Variable required/missing validation.
- Reference slot privacy policy validation.
- Legacy history item fallback.

### 7.2 Manual QA Checklist

Manual QA must cover:

- Guided Mode generate.
- Manual Mode generate.
- Guided to Manual prompt copy.
- Manual to Guided without destructive parsing.
- Character Sheet to Scene Builder handoff.
- Share preview with private face reference.
- Use Template with required replacement slot.

### 7.3 Migration Data

Prepare sample records:

- Old normal/story history without scene snapshot.
- New guided scene history with snapshot.
- New manual scene history with snapshot.
- Community post using `Remix Only`.

## 8. Implementation Concerns

- Do not mark Scene Builder complete until legacy history and current handoff flows still work.
- QA must validate privacy through API responses, not only UI display.
- Missing replacement slots should block generation deterministically.
- Provider/model unavailable fallback must be tested with real catalog data.

## 9. Functional Technical Specification

### 9.1 Test Files

```text
test/sceneTemplateSnapshot.test.js
test/sceneTemplateHydrator.test.js
test/sceneTemplateVariables.test.js
test/sceneReferenceSlotPolicy.test.js
test/sceneBuilderMigration.test.js
test/sceneShareSanitizer.test.js
```

### 9.2 Required Test Helpers

```text
createMockGuidedSceneState()
createMockManualSceneState()
createMockPrivateReferenceSlots()
createMockPublicCommunityPost()
createLegacyNormalHistoryItem()
```

### 9.3 Test Coverage Map

- `sceneTemplateSnapshot.test.js`: snapshot minimum fields, version, no raw provider payload.
- `sceneTemplateHydrator.test.js`: hydrate valid template, stale field warning, missing replacement.
- `sceneTemplateVariables.test.js`: required variables, color variables, custom text cleanup.
- `sceneReferenceSlotPolicy.test.js`: private face default replacement, reusable style reference.
- `sceneBuilderMigration.test.js`: legacy normal/story history compatibility.
- `sceneShareSanitizer.test.js`: Full Prompt, Partial Prompt, Remix Only, Private Prompt filtering.

### 9.4 Concerns For Implementing Agents

- Do not rely only on visual/manual QA for privacy.
- Add tests before large refactors when touching persistence or template hydration.
- If a provider capability test requires live catalog data, keep it as manual QA unless a stable fixture exists.

## 10. Implementation Plan: QA Matrix, Migration Fixtures and Release Gates

This plan defines how Scene Builder QA should be implemented before calling the local template/share foundation ready. It is intentionally split between automated node tests and manual UI checks because some provider and browser interactions are not stable enough for pure automated coverage yet.

---

## User Review Required

> [!IMPORTANT]
> - **No live provider generation in automated tests**:
>   - Node tests should validate payloads, snapshots, sanitization, hydration and migration.
>   - Real image generation remains manual QA.
> - **Cross-user tests are mocked until real user/auth exists**:
>   - Use `username` as the temporary actor key.
>   - Mark true owner/viewer UI flows as blocked until user management is implemented.
> - **Community-public release is not part of Scene-010**:
>   - Scene-010 can gate local shared templates and mock remix events.
>   - Real Community public feed, creator profile and public gallery require the Community/User/Auth modules.
> - **Privacy must be tested through data, not screenshots**:
>   - Tests must inspect sanitized API payloads and stored JSON snapshots.
>   - UI hiding alone is not sufficient.

---

## Open Questions

> [!NOTE]
> None for MVP. If an implementation agent finds that a manual QA case requires user/auth, mark it as `Blocked until User/Auth module` instead of expanding Scene Builder scope.

---

## Proposed Changes

### Automated Test Layer

#### [NEW or EXTEND] `test/sceneQaFixtures.js`

Create shared fixture builders:

```text
createMockGuidedSceneState()
createMockManualSceneState()
createMockSceneTemplateSnapshot(overrides)
createMockPrivateReferenceSlots()
createMockPreviewOnlyReferenceSlot()
createMockReusableStyleReference()
createLegacyNormalHistoryItem()
createMockLocalCommunityPost()
```

Fixtures must avoid embedding large base64 image data.

#### [EXTEND] Existing Tests

```text
test/sceneTemplateSnapshot.test.js
test/sceneTemplateHydrator.test.js
test/sceneVariableResolver.test.js
test/sceneReferenceSlotPolicy.test.js
test/sceneBuilderMigration.test.js
test/sceneShareFlow.test.js
```

Minimum required coverage:

- Guided template serializes required fields.
- Manual template serializes prompt text and blocks Remix Only hiding when required by Scene-008.
- Missing required reference blocks generation.
- `required_user_replacement` strips private reference values.
- `shared_preview_only` is visible as preview but not used as generation reference.
- `shared_as_reusable_reference` remains reusable.
- Old history items without `sceneTemplateSnapshot` still render/open.
- Provider/model fallback produces a warning or fallback state instead of crashing.

### Migration Fixture Layer

#### [NEW] `test/fixtures/scene-history-legacy-normal.json`

Legacy normal/story image history without Scene Builder fields.

#### [NEW] `test/fixtures/scene-history-guided-template.json`

New guided Scene Builder history item with sanitized `sceneTemplateSnapshot`.

#### [NEW] `test/fixtures/scene-history-manual-template.json`

Manual Scene Builder history item with prompt visibility test data.

These fixtures should be small and should not point to real private user assets.

### Manual QA Layer

Add a manual checklist section to implementation notes or release documentation:

```text
Guided Scene generate
Manual Scene generate
Guided -> Manual prompt copy confirmation
Manual -> Guided without form reset
Headshot -> Character Builder handoff
Character Sheet -> Scene Builder handoff
Use Template from local shared templates
History image -> template slot picker
Required replacement blocks Generate button
Shared Preview Only does not become generation reference
```

---

## Release Gate Decisions

### Gate A: Local Prototype Ready

Required:

- Scene Builder name and navigation route are stable.
- Guided/Manual switching works without reset bugs.
- Snapshot serialize/hydrate tests pass.
- Manual QA confirms basic Guided and Manual generation.

### Gate B: Local Template Beta Ready

Required:

- Local share preview works.
- Local shared templates list works.
- `Use Template` opens Scene Builder replacement checklist.
- Reference slot privacy tests pass.
- Remix event mock logging works after successful generation.

### Gate C: Community MVP Ready Later

Blocked until:

- User/auth module exists.
- Creator profile and ownership records exist.
- Community gallery/feed endpoints exist.
- Public asset visibility policy exists.
- Cross-user permission UI tests are possible.

---

## Verification Plan

Ask the user to run relevant node checks after implementation:

```powershell
node --test test/sceneTemplateSnapshot.test.js
node --test test/sceneTemplateHydrator.test.js
node --test test/sceneVariableResolver.test.js
node --test test/sceneReferenceSlotPolicy.test.js
node --test test/sceneBuilderMigration.test.js
node --test test/sceneShareFlow.test.js
```

Manual smoke test:

1. Create a Guided Scene image.
2. Share it as a local template.
3. Use the local template.
4. Fill required references.
5. Generate from template.
6. Confirm history stores a sanitized `sceneTemplateSnapshot`.
7. Confirm old history items still open in lightbox.
