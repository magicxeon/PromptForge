# Professional Guided Scene Builder Experience

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Related:** `../009-migration-to-react/013-guided-generation-prompt-parity-and-mode-contract.md`, `002-character-pose-and-environment-selection.md`, `../011-reference-processing-pipeline`  
**Required skill:** `skills/design-professional-scene-prompts/SKILL.md`  
**Status:** Requirement ready; implementation pending

## 1. Business Requirement

Scene Builder is the visual direction layer used to create attractive Scene
previews and reusable Templates. A customer with basic creative knowledge must
be able to select a small number of understandable controls and receive a
professional, natural and visually dynamic result without writing a complete
expert prompt.

The target user is neither a first-time user with no intent nor a professional
prompt engineer. The product supplies professional art direction while the
user controls the important creative decisions:

```text
who is shown
what they are doing
where they are
the intended visual mood/use
the important product or story detail
```

The system owns compatibility, photographic coherence, natural body mechanics,
camera suitability, lighting support and provider-safe prompt projection.

## 2. Current Category Assessment

The current Scene contract exposes all of these as independent accordion
groups:

```text
Fashion Direction
Scene Story
Photographic Context
Pose
Environment
Lighting
Camera
Quality
```

All three questioned groups affect the prompt, but they overlap with controls
below them:

| Group | Current purpose | Overlap/risk | MVP decision |
|---|---|---|---|
| Fashion Direction | Macro preset such as Marketplace, Social, Lookbook, Editorial or Runway; currently applies defaults to Context, Story, Pose, Venue and Lighting | Appears to be another independent choice even though it controls several later choices | Remove from the visible accordion; retain as hidden `SceneDirectionRecipe` metadata/default source |
| Scene Story | Micro-action or narrative moment such as conversation, contemplation, laughing or looking into the distance | Can conflict with Pose Intent, hand position, gaze and Expression | Remove as an independent user category; resolve a compatible story beat from Pose/Expression or the active recipe |
| Photographic Context | Photographic treatment such as candid lifestyle, documentary or editorial | Can conflict with Camera, Environment, Quality and Fashion Direction | Remove as an independent user category; resolve it from output purpose and the active recipe |

Do not delete the catalogs, historical selections or compiler support. Existing
Templates and History must continue to hydrate and reproduce their immutable
snapshots. The change is a new-authoring UX and recipe-resolution decision.

New Scene authoring must not ask the user to independently reconcile all three
hidden concepts. Their values remain inspectable in Admin/debug prompt data and
private Template execution snapshots.

## 3. Simplified User-Control Model

The visible Scene Builder groups are:

```text
Character / References
Expression
Hair, Skin and Body when identity is not reference-owned
Clothing when not reference-owned
Pose
Environment
Lighting
Camera
Quality
Additional Direction
```

Lighting and Camera may default automatically and remain optional/collapsed for
ordinary users. The minimum creative path is:

```text
Choose Character
-> choose Pose
-> choose Environment
-> Generate
```

The professional recipe fills compatible Expression nuance, story beat,
photographic context, lighting, camera and quality defaults. A user selection
always has higher authority than a recipe default unless a Reference or
Template contract owns that field.

## 4. Scene Direction Recipe

Replace the three visible overlapping categories with one internal, versioned
composition contract:

```text
SceneDirectionRecipe
- id
- schemaVersion
- version
- purpose: marketplace | social | lookbook | editorial | runway | lifestyle
- label
- compatiblePoseIds[]
- compatibleEnvironmentIds[]
- preferredExpressionIds[]
- storyBeatId
- photographicContextId
- defaultLightingId
- compatibleLightingIds[]
- defaultCameraId
- compatibleCameraIds[]
- defaultQualityId
- dynamicsPolicy
- garmentVisibilityPolicy
- compositionDirectives[]
- naturalismDirectives[]
- negativeConstraints[]
- providerOverrides
- enabled
```

The existing Fashion Direction entries are migration inputs for these recipes,
not a second source of truth. Their current `defaults` maps must be normalized
into recipe IDs and validated against the catalogs.

Resolution precedence:

```text
Reference/Template authority
> explicit user selection
> active Scene Direction Recipe default
> mode-safe platform fallback
```

The resolved prompt must contain one coherent direction for each semantic role.
It must not append contradictory Context, Story, Pose, Environment, Lighting or
Camera phrases merely because each field has a value.

## 5. Professional Output Standard

Every enabled recipe and selectable Pose/Environment combination must be
reviewed using `skills/design-professional-scene-prompts/SKILL.md`.

Professional does not mean adding more adjectives. A qualified scene must:

- establish a clear subject and visual purpose;
- use plausible weight distribution, balance and joint relationships;
- give hands a deliberate, anatomically plausible action or relaxed position;
- align gaze and Expression with the action;
- preserve garment/product visibility where Fashion is the purpose;
- use foreground, middle ground and background intentionally where suitable;
- select a camera distance and angle that support the pose and environment;
- select lighting motivated by the environment and desired mood;
- include controlled asymmetry or movement where it improves naturalism;
- avoid a rigid catalog stance unless the user intentionally selected one;
- avoid conflicting actions, duplicate gestures and impossible contact points;
- remain reproducible enough to publish as a Template preview.

### 5.1 Dynamic Variation Boundaries

The system may add bounded professional variation without taking away the
user's main control:

```text
allowed:
  subtle weight shift
  natural hand relaxation
  small shoulder/hip counter-rotation
  gaze refinement
  garment-safe movement
  scene-supported depth and framing

not allowed:
  changing selected pose intent
  changing the selected environment
  changing Character identity/body
  hiding the featured garment
  adding unrequested props or accessories
  changing front/rear garment-view intent
```

Random prompt assembly is prohibited. Any variation must resolve from a
versioned recipe, compatibility rule and optional deterministic seed.

## 6. Accordion Interaction Contract

Scene Builder uses one-open-section accordion behavior:

- At most one visible category is expanded at a time.
- Opening a category closes the previously open category.
- A collapsed category shows selection count and a concise selected-value
  summary.
- Each category contains a primary `Next` action after its controls.
- `Next` commits pending input, closes the current category, opens the next
  relevant category and smoothly scrolls/focuses its heading.
- Skip hidden, disabled, reference-owned or non-applicable categories.
- The final category action is `Review generation settings`, not another
  ambiguous `Next`.
- Browser Back must not step through accordion changes; accordion state is
  local UI state.
- Restored drafts reopen the first incomplete category, or the last user-opened
  category when all required choices are complete.
- Keyboard activation, focus visibility and reduced-motion behavior are
  required.

The category sequence is mode-policy data, not hard-coded separately in each
accordion component.

## 7. Custom Write-In State

Each field that supports Custom Write-In has mutually exclusive sources:

```text
source: none | catalog | custom
```

Behavior:

1. Typing does not immediately replace the active catalog selection.
2. On `Tab`, blur or explicit `Use`, trim and validate the text.
3. A non-empty valid value commits `source: custom`.
4. The `Use` control and field status change to the theme success state and
   expose `Custom direction applied` accessibly.
5. Selecting a catalog option commits `source: catalog`, clears/deactivates the
   custom override for prompt compilation and changes the custom control to an
   inactive neutral state.
6. Returning to Custom may restore the actor's last draft text, but that text
   has no prompt authority until recommitted.
7. Empty blur does not create a selection.
8. Validation errors use the shared warning/error surface and focus the field.

Only one source value per field reaches the canonical request. The client must
not submit both a dropdown prompt and a Custom prompt and ask the compiler to
guess precedence.

## 8. Scene Action Simplification

For Scene Builder:

- Remove `Surprise Me` from the configurator actions.
- Remove `Export Config` from the configurator actions.
- Retain `Reset Form` with confirmation only when meaningful work would be
  lost.
- Retain the prominent Generate action and locked credit estimate.
- Retain Admin/debug prompt display under the existing runtime policy.

This requirement does not remove Surprise or Export from another surface
unless that surface's owning requirement also removes it.

## 9. State and Compatibility Contract

Proposed draft state additions:

```text
sceneDirectionRecipeId
sceneDirectionRecipeVersion
openSceneGroupId
fieldInputSources
  [fieldName]: none | catalog | custom
customDraftValues
resolvedProfessionalDefaults
resolutionWarnings[]
```

Persist semantic IDs, not labels or generated prompt text. Recipe resolution
occurs canonically on the server. React may compute a preview for UX but the
server validates and resolves again before generation.

Existing snapshots containing Fashion Direction, Scene Story or Photographic
Context remain readable. New authoring stores the resolved recipe version and
the final immutable execution snapshot so old outputs remain reproducible after
catalog evolution.

## 10. UX Copy

Avoid expert prompt terminology in normal UI. Suggested category descriptions:

```text
Pose
Choose the main action. We refine balance, hands and natural movement.

Environment
Choose where the image takes place. Lighting and camera defaults adapt to it.

Lighting
Optional. Keep Recommended or choose a specific mood.

Camera
Optional. Keep Recommended or control framing and perspective.
```

Do not display internal hidden recipe fields as missing required selections.

## 11. Implementation Plan

### Phase A - Recipe and policy

1. Add versioned Scene Direction recipe JSON and schema under `server/config/`.
2. Migrate enabled Fashion Direction defaults into recipes and validate every
   referenced catalog ID.
3. Add a Scene recipe resolver under the existing generation/prompt domain;
   do not put it in provider adapters.
4. Define compatibility and precedence tests for Pose, Environment, Lighting,
   Camera, Expression and reference authority.
5. Keep historical direct fields supported for snapshot hydration.

### Phase B - React interaction

1. Update `studioModePolicy.ts` so Fashion Direction, Scene Story and
   Photographic Context are hidden from new Scene accordion authoring.
2. Refactor the shared visual option accordion to accept controlled
   `openGroupId`, ordered relevant groups and `onNext` behavior.
3. Implement smooth scroll/focus with reduced-motion support.
4. Add selected summaries and completion states to collapsed headers.
5. Implement explicit catalog/custom source state in the shared field control.
6. Remove Scene-only Surprise and Export actions through component parameters,
   not duplicated markup.
7. Keep the same components reusable by Face Creator and Character Sheet with
   their own mode parameters.

### Phase C - Professional catalog review

1. Audit every Scene Pose, Environment, Lighting and Camera entry with the
   required skill.
2. Replace rigid or generic prompt fragments with concrete body mechanics,
   spatial composition and environment-motivated detail.
3. Add compatibility tags and reject combinations that cannot remain coherent.
4. Build curated professional defaults for each recipe and provider projection.
5. Test multiple Character body types and front/rear garment-view intents.

### Phase D - Prompt and regression validation

1. Verify client preview and canonical server prompt resolve the same semantic
   recipe and explicit selections.
2. Verify hidden groups do not disappear from historical snapshots.
3. Verify references continue to disable identity/clothing conflicts.
4. Verify Custom/catalog source exclusivity in request and prompt.
5. Run fixed visual review fixtures for professional quality, natural pose,
   garment visibility and dynamic composition.

## 12. Expected File Ownership

```text
server/config/scene-direction-recipes.json
server/config/scene-direction-recipes.schema.json
server/domain/generation/SceneDirectionRecipeService.js
server/domain/generation/promptCompiler.js
web/src/features/studio/studioModePolicy.ts
web/src/features/studio/attributes/attributeModel.ts
web/src/features/studio/components/VisualAttributeBuilder.tsx
web/src/features/studio/components/StudioConfiguratorActions.tsx
attributes/011-pose.json
attributes/012-environment.json
attributes/013-lighting.json
attributes/014-camera.json
attributes/017-photographic-context.json
attributes/018-scene-story.json
attributes/024-fashion-commerce.json
```

Use actual repository names discovered during implementation if a listed
component differs. Do not create a parallel prompt compiler or form renderer.

## 13. Verification Plan

Automated coverage:

- only one accordion group is open;
- Next opens/focuses the next relevant group and skips locked groups;
- reduced motion avoids animated scrolling;
- custom blur/Tab commits one custom source;
- selecting a catalog value deactivates custom prompt authority;
- Scene actions omit Surprise and Export;
- new Scene authoring omits the three overlapping visible groups;
- historical snapshots containing those groups still compile;
- recipe defaults never override explicit or reference-owned values;
- incompatible combinations return stable reason codes;
- server prompt contains one coherent context/story/pose direction.

Manual visual review:

1. Complete a Scene using only Character, Pose and Environment.
2. Confirm Recommended Lighting/Camera produce a professional result.
3. Complete another Scene with explicit Lighting and Camera.
4. Test a dynamic pose, rear garment view and natural hand interaction.
5. Test catalog-to-custom and custom-to-catalog transitions.
6. Confirm the page remains compact throughout the one-open accordion flow.
7. Confirm a generated Scene is attractive and stable enough to become a
   Template preview.

## 14. Acceptance Criteria

- Fashion Direction, Scene Story and Photographic Context are not independent
  accordion decisions for new Scene authoring.
- Their professional value is retained through one versioned recipe resolver.
- Users can complete the main path with Character, Pose and Environment.
- Only one category is expanded and Next provides predictable progression.
- Custom Write-In has a clear committed state and cannot conflict with a
  catalog selection.
- Scene Builder no longer shows Surprise Me or Export Config.
- Every released recipe passes professional pose/environment/camera/lighting
  review.
- The server remains authoritative for prompt compilation and reference
  ownership.
- Existing History and Template snapshots remain reproducible.
