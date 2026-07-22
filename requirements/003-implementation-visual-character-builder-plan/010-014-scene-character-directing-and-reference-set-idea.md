# 010-014 Scene Character Directing and Reference Set

**Status:** In progress - Scene Direction MVP pilot implemented; Reference Set remains future scope  
**Parent:** 010 Character Sheet Builder  
**Depends on:** 010-007, 010-008, 010-013 and Scene Builder 001-010  
**Created:** 2026-07-20

## 1. Objective

Improve the workflow after a generated Character Sheet is used as a Character Reference in Scene Builder.

The user must be able to direct a familiar character into a new expression, natural pose and believable environment without unintentionally replacing the character's identity, body proportions, hairstyle or outfit.

This requirement also records a future `Reference Set` generation mode that produces four separate reusable character-reference images:

1. front view
2. side view
3. back view with the outfit clearly visible
4. freestyle three-quarter or natural hero view

## 2. Business Requirement

### 2.1 Expression Direction With Character Reference

When Character Reference is active in Scene Builder, the user must still be able to select a facial expression such as:

- neutral-friendly
- gentle smile
- broad natural smile
- soft laugh
- calm confidence
- thoughtful
- surprised
- serious/editorial

Expression is a scene performance instruction, not a replacement of facial identity.

The generated result should preserve the recognizable face while allowing natural movement around the eyes, cheeks, eyebrows and mouth. The UI must not require users to enable the broad `Advanced Character Overrides` switch merely to change expression.

### 2.2 Richer Environment Direction

Environment options must create a lived-in, spatially believable scene instead of only naming a location.

Each environment preset should describe a reviewed combination of:

- physical location and architectural identity
- foreground, subject plane and background depth
- key materials and surfaces
- practical light sources that naturally belong to the location
- restrained background activity
- atmosphere such as air, weather or time-of-day cues
- subject-to-environment interaction
- realistic imperfections or signs of use where appropriate

Environment options must not hardcode a complete photographic lighting setup when a separate Lighting selection is active. Environment owns practical/location light context; Lighting owns photographic treatment.

### 2.3 Richer Pose Direction

Pose options must describe natural body mechanics, not only a pose label.

Each pose preset should define the relevant combination of:

- weight distribution and center of gravity
- shoulder and hip relationship
- arm and hand placement
- leg and foot placement
- head direction and gaze intent
- interaction with a prop or surface when applicable
- natural asymmetry and relaxed joints
- garment visibility requirement
- camera-facing intent where necessary

Pose direction must avoid rigid wording such as `identical pose` unless an exact replication feature is explicitly selected. The normal behavior should preserve the visual intent of a pose while adapting it naturally to the character's anatomy, outfit and scene.

### 2.4 Future Reference Set Mode

Add a future generation mode named `Character Reference Set`.

This mode generates four separate images in one user action:

| Output | Direction | Primary purpose |
| --- | --- | --- |
| Front | straight full-body front view, neutral stance | face, silhouette and front outfit details |
| Side | full-body profile view | body proportions and side garment construction |
| Back | straight full-body back view | hairstyle back and rear outfit details |
| Freestyle | natural three-quarter or relaxed hero pose | a visually useful reference for Scene Builder |

All four outputs must preserve the same identity, hairstyle, body proportions and outfit. The first three views use a neutral expression and clean reference background. Freestyle may use a subtle friendly expression and natural stance but must not introduce a new outfit or environment.

The mode produces four independent history assets linked by one `referenceSetId`; it must not be implemented as a single contact-sheet image. Independent assets are easier to inspect, select, replace, share and send to providers with reference-count limits.

## 3. Scope

### MVP Enhancement Scope

- Allow Expression while Character Reference is active.
- Improve the semantic prompt detail of existing Scene Builder Pose options.
- Improve the semantic prompt detail of existing Environment options.
- Preserve Character Reference authority over identity, body, hair and outfit.
- Add conflict and prompt-cleanup rules for expression, pose and environment.

### Future Scope Recorded Here

- `Character Reference Set` mode with four separate generation jobs.
- Grouped progress and grouped history display.
- Select one or more images from a completed set as Scene Builder references.

### Out of Scope

- AI pose estimation or skeleton extraction.
- Provider-specific reference weighting.
- Exact deterministic pose replication across providers.
- Video or animation turnaround.
- Multi-character reference sets.
- One composite image containing all four set views.

## 4. Ownership and Conflict Rules

### 4.1 Character Reference Authority

With Character Reference active and advanced overrides disabled:

| Property | Owner | Editable in Scene Builder |
| --- | --- | --- |
| Facial identity and proportions | Character Reference | no |
| Body proportions and silhouette | Character Reference | no |
| Hairstyle and hair identity | Character Reference | no |
| Outfit design and construction | Character Reference | no |
| Facial expression | Scene direction | yes |
| Pose and gesture | Scene direction | yes |
| Environment | Scene direction | yes |
| Lighting, camera and framing | Scene direction | yes |

`Expression` must be removed from broad reference-owned lockout logic. Face-shape, eyes, eyebrows, nose and lips remain reference-owned; expression only directs temporary muscle movement and emotional performance.

### 4.2 Prompt Precedence

Compile in this order:

```text
character reference preservation
-> expression direction
-> pose/body action
-> scene interaction
-> environment and depth
-> lighting
-> camera/framing
-> quality
```

Conflict rules:

- A smiling expression must replace contradictory neutral/serious expression text.
- Direct eye contact must replace incompatible off-camera gaze text unless the selected pose explicitly owns gaze.
- A pose requiring a wall, chair or counter must require or supply a compatible scene support.
- Indoor and outdoor, day and night, and mutually exclusive location tags must not compile together.
- Environment practical lights must not duplicate or contradict selected Lighting controls.
- Character Reference outfit ownership must win over Style Match clothing language.

## 5. Attribute Data Contract

Do not create a second hardcoded list in the UI. Extend the current source files:

```text
attributes/019-expression.json
attributes/011-pose.json
attributes/012-environment.json
attributes/018-scene-story.json (only interaction/event text)
attributes/spec/ui-schema.json
```

Recommended optional metadata for Pose and Environment attributes:

```json
{
  "direction": {
    "weight": "left_leg",
    "hands": "relaxed_visible",
    "gaze": "camera",
    "requiredSupportTags": [],
    "garmentVisibility": "full"
  },
  "sceneDetail": {
    "depthLayers": true,
    "practicalLightTags": ["window_light"],
    "activityLevel": "restrained",
    "surfaceTags": ["wood", "glass"]
  }
}
```

These objects are metadata for validation and future UI. Existing `prompt.default` and provider-specific prompt values remain the runtime source for prompt text in the first implementation.

## 6. Reference Type Clarification

The current application exposes three match intents, but providers generally receive an ordered list of images rather than strongly typed native reference channels. The prompt compiler supplies most of the semantic difference.

| Reference | Intended ownership | Current behavior |
| --- | --- | --- |
| Face Match | facial identity | Uses dedicated face image slots, locks facial-structure controls and asks the model to preserve recognizable facial proportions while allowing natural expression/perspective changes. |
| Style Match | visual treatment, palette and styling intent | Uses shared style image slots and asks for style/colors; clothing matching is suppressed when Character Reference owns appearance. It should not replace identity. |
| Pose Match | pose and composition intent | Uses the same uploaded style image slots as Style Match, but changes Pose prompt language. It is image-guided imitation, not skeleton-level pose control. |
| Character Reference | whole character identity | Uses dedicated character slots and owns identity, body, hair and outfit while Scene Builder changes expression, pose and environment. |

Consequences:

- Match quality varies by provider/model.
- A model must declare `capabilities.imageReferences: true`.
- Reference count must remain within `maxReferenceImages`.
- Enabling Style Match and Pose Match on the same source image does not create two independent provider references; it adds two prompt intents to the same visual reference.
- UI must describe these as guidance, not guaranteed pixel-exact matching.

## 7. Functional Technical Specification

### 7.1 Client Modules

| File | Change |
| --- | --- |
| `client/core/referenceManager.js` | Split immutable character-owned fields from scene-directable expression; expose reference-intent summary and conflict state. |
| `client/core/promptCompiler.js` | Compile expression after character preservation and normalize pose/environment conflicts. |
| `client/core/formRenderer.js` | Keep Expression, Pose and Environment controls editable when Character Reference is active. |
| `client/core/studioState.js` | Add future `referenceSet` state contract and stable output view IDs. |
| `client/core/generationService.js` | Future: submit four linked jobs for Reference Set and retain per-view metadata. |
| `client/scene-builder/sceneBuilderState.js` | Own scene expression/pose/environment values without mutating canonical character metadata. |
| `client/scene-builder/sceneBuilderUi.js` | Present character-preserved and scene-editable states clearly. |
| `client/core/historyService.js` | Future: group four outputs by `referenceSetId`. |

Recommended new modules:

```text
client/scene-builder/sceneDirectionRules.js
client/character-sheet/characterReferenceSet.js
```

Suggested API:

```js
resolveSceneDirection({ selections, imageReferences })
  -> { expression, pose, environment, warnings, droppedFields }

getCharacterReferenceOwnership({ characterReferenceActive, advancedOverrides })
  -> { lockedFields, editableFields }

buildReferenceSetJobs({ baseRequest, characterConfig })
  -> GenerationRequest[4]
```

### 7.2 Server Modules

| File | Change |
| --- | --- |
| `server/domain/generation/promptCompiler.js` | Mirror client expression/pose/environment ordering and conflict cleanup. Server output remains authoritative. |
| `server/domain/generation/generationRequestService.js` | Validate reference capability/count and future Reference Set request contract. |
| `server/domain/generation/QueueManager.js` | Future: queue four linked jobs and expose group progress without coupling individual job completion. |
| `server/repositories/generation/` | Future: persist set lineage through repository interfaces rather than direct JSON access. |

Recommended new domain modules:

```text
server/domain/generation/sceneDirectionRules.js
server/domain/generation/characterReferenceSet.js
```

### 7.3 Reference Set Request Contract

```json
{
  "mode": "character-reference-set",
  "referenceSet": {
    "version": 1,
    "views": ["front", "side", "back", "freestyle"],
    "outputStrategy": "separate_jobs",
    "identityConsistency": "high",
    "outfitConsistency": "high"
  },
  "characterConfig": {},
  "imageReferences": {},
  "provider": "gemini",
  "submodel": "gemini-3.1-flash-lite-image"
}
```

Server output:

```json
{
  "referenceSetId": "refset_123",
  "jobs": [
    { "view": "front", "jobId": "job_1" },
    { "view": "side", "jobId": "job_2" },
    { "view": "back", "jobId": "job_3" },
    { "view": "freestyle", "jobId": "job_4" }
  ],
  "creditEstimate": 4
}
```

The server must calculate credits from the four actual model requests. The client must display the estimate before submission and must not represent the set as one-credit generation.

## 8. Input, Process and Output

### Scene Direction

Input:

- one or more Character Reference images
- selected Expression
- selected Pose
- selected Environment
- optional Style/Pose reference intent
- provider/model capability

Process:

1. Establish Character Reference ownership.
2. Keep Expression, Pose and Environment editable.
3. resolve conflicts and required supports
4. compile scene direction after identity preservation
5. validate total unique reference images
6. submit one generation request

Output:

- recognizable character identity and outfit
- selected facial expression
- anatomically natural pose
- layered, believable environment
- lineage recording all reference intents and selections

### Reference Set

Input:

- canonical character configuration
- optional face and outfit references
- provider/model and generation settings

Process:

1. Freeze identity, body, hair and outfit baseline.
2. Derive four view-specific prompt patches.
3. Create a `referenceSetId`.
4. enqueue four separately billable jobs
5. preserve shared lineage while tracking each job independently

Output:

- four individual history images
- grouped set metadata
- per-view retry without regenerating the complete set

## 9. Testing

### Automated Tests

Recommended files:

```text
test/sceneCharacterDirection.test.js
test/characterReferenceSet.test.js
test/referenceIntentContract.test.js
```

Required cases:

- Character Reference active + Smile selected keeps expression and removes contradictory neutral text.
- Character Reference active keeps face/body/hair/outfit fields locked but Expression editable.
- Rich Pose produces no contradictory gaze, hand or support instructions.
- Rich Environment does not compile indoor and outdoor locations together.
- Style Match cannot overwrite Character Reference outfit ownership.
- Pose Match uses the style image slot but compiles pose intent, not style ownership.
- A provider without image-reference support blocks reference generation before queueing.
- Reference Set creates exactly four unique jobs under one set ID.
- One failed set view can retry without charging or regenerating completed views.
- Credit estimate equals the sum of four selected-model requests.

### Manual Browser Verification

1. Use a Character Sheet result as Story/Scene Character.
2. Select `Broad natural smile`; verify the prompt includes the smile and still preserves character identity.
3. Select a standing or seated pose; verify hands, weight and support are coherent.
4. Select an environment; verify foreground/background depth and location detail are visible without duplicated lighting language.
5. Generate with at least two reference-capable providers and compare identity, expression and pose adherence.
6. Future: Generate Reference Set and verify four separate Front/Side/Back/Freestyle history items share one set ID.

## 10. Impact and Risks

- Longer prompt values can dilute identity instructions; use concise reviewed segments and deterministic ordering.
- A single character-sheet image containing several views may be interpreted inconsistently by some providers. Future Reference Set outputs reduce ambiguity but cost four generations.
- Face, Character, Style and Pose references may compete for provider attention. Show reference-count and intent warnings before generation.
- Pose and expression adherence is probabilistic. UI wording must use `guide` or `preserve intent`, not `exact match`.
- Grouped generation needs idempotent credit handling and per-job retry before production use.
- Client and server prompt compilers must share test fixtures to prevent preview/request drift.

## 11. Acceptance Criteria

### Scene Direction MVP

- [ ] Expression remains editable with Character Reference active.
- [ ] Selected expression is present once in final server prompt.
- [ ] Face identity fields remain reference-owned.
- [ ] Pose options contain reviewed body-mechanics detail and avoid unnecessarily rigid wording.
- [ ] Environment options contain reviewed spatial detail and avoid lighting conflicts.
- [ ] Character Reference outfit wins over Style Match clothing language.
- [ ] Reference intent and provider limitations are visible to the user.

### Future Reference Set

- [ ] One action creates Front, Side, Back and Freestyle as separate jobs.
- [ ] Four outputs share one `referenceSetId` and source lineage.
- [ ] Back output clearly exposes rear outfit details.
- [ ] Freestyle remains identity/outfit consistent.
- [ ] Credit estimate and final ledger reflect four provider requests.
- [ ] Individual failed views can be retried independently.

## 12. Implementation Sequence

1. Extract shared scene-direction conflict rules and tests.
2. Change Character Reference ownership so Expression remains editable.
3. Rewrite a small pilot set of Expression, Pose and Environment prompt values.
4. Validate the pilot across supported reference-capable providers.
5. Expand reviewed attribute content only after the pilot passes.
6. Implement Reference Set state/request contract behind a feature flag.
7. Add grouped queue/history/credit behavior.
8. Release Reference Set only after partial-failure and credit tests pass.
