# 013 Guided Generation Prompt Parity and Mode Contract

**Status:** Implemented; validation pending  
**Depends on:** 009, 010, 011 and the canonical server generation pipeline

## 1. Business Requirement

React must preserve the output purpose of the three guided creation flows:

1. **Face Creation** creates a reusable facial identity reference, not an
   environmental portrait.
2. **Character Sheet** creates a consistent multi-view full-body reference on a
   white background.
3. **Scene Builder** creates a directed scene and must not inherit the fixed
   framing or white background of Face Creation or Character Sheet.

The migration must reuse the established Vanilla prompt policy and the
server-owned prompt compiler. React must not introduce a second final prompt
compiler.

## 2. Defect Summary

The React request carried `generationMode: "headshot"` but serialized the
legacy compiler field as `mode: "normal"`. The server therefore selected the
normal Scene template and generated an ordinary photograph.

Additional parity gaps:

- Scene Guided preview was compiled with the Headshot preview prefix;
- copying Guided Scene text into Manual could therefore introduce Headshot
  framing;
- Studio exposed Character and Style reference roles in modes where the server
  intentionally rejected them;
- the client preview did not describe the actual server-enforced white
  background, multi-view layout, or casting clothing policy.

## 3. Canonical Mode Mapping

The browser request must serialize both fields consistently:

| React `generationMode` | Server prompt `mode` | Purpose |
|---|---|---|
| `headshot` | `headshot` | Face identity reference |
| `character-sheet` | `character-sheet` | Multi-view Character reference |
| `scene` | `normal` | Guided/Manual Scene |
| `playground` | `normal` | Freeform generation |
| `fashion` | `normal` | Fashion destination generation |

`server/domain/generation/generationRequestService.js` must derive the canonical
prompt mode from `generationMode` again. This is a trust-boundary normalization
and protects the server from stale or contradictory clients.

## 4. Face Creation Output Contract

The final server prompt must enforce:

- head-and-shoulders reference portrait;
- straight front-facing head;
- direct camera gaze;
- level head with no tilt;
- solid pure white background;
- photorealistic identity detail;
- no Environment, Scene Story, Fashion Direction, clothing-scene, or
  uncontrolled location text.

Face Creation accepts `face_reference` only. Style, Pose, Character, and Outfit
references must not appear as usable controls because the server does not apply
those roles in Headshot mode.

## 5. Character Sheet Output Contract

### 5.1 Shared layout

Both Character types use a clean full-body multi-view sheet on a solid pure
white background with:

- the same identity and body proportions across views;
- complete head-to-feet framing with safe margins;
- neutral upright stance;
- even studio lighting and minimal perspective distortion.

The editable structured groups are `Character`, `Face`, `Hair`, `Skin`,
`Body`, `Camera`, and `Quality`. `Clothing` is additionally editable for a
Styled Character and is removed for a Reusable Model. The fixed sheet contract
owns `Pose` and `Lighting`; those groups must not be shown as editable controls
or retained in the request because their selected values would be ineffective.

The approved Vanilla/Casting layout remains
`character-casting-three-view-v2`: **front view, exact side profile and back
view**, arranged side by side.

The product description also mentioned an angled view. It is not substituted
for the back view in this parity task because the current profile schema,
Fashion garment inspection, public Character assets and QA fixtures depend on
the back view. A future front/side/three-quarter/back layout requires a new
versioned layout ID, migration rules and visual QA.

### 5.2 Reusable Model

- Clothing selections and Outfit references are absent from UI state and
  request payload.
- The server locks an opaque, modest, fitted white short-sleeve top and fitted
  white mid-thigh shorts.
- The uniform must never be underwear, lingerie, swimwear, transparent or
  sexualized.
- Output remains eligible for Character Profile/Fashion handoff.

### 5.3 Styled Character

- Selected or uploaded clothing remains part of the Character identity.
- Outfit Front is required before Outfit Back can be used.
- If no outfit is provided, the canonical modest reference-clothing fallback
  applies.
- Output remains on a solid pure white background.
- Styled Character remains Scene-oriented and does not silently become a
  replaceable Fashion model.

Character Sheet accepts:

```text
Reusable Model: face_reference
Styled Character: face_reference, outfit_front, outfit_back
```

Character, Style and Pose references belong to Scene Builder and must not be
displayed as functional Character Sheet inputs.

## 6. Scene Builder Contract

Guided Scene preview and Manual-copy source must use Scene selections:

```text
Character
Face (Expression is the Scene-facing field)
Hair
Skin
Body
Clothing
Fashion Direction
Scene Story
Photographic Context
Pose
Environment
Lighting
Camera
Quality
```

When no Character Reference owns identity, selected Hair, Skin, and Body values
must remain in the request and final server prompt. When a Character Reference
is active, reference-authority policy removes Character, Face except Expression,
Hair, Skin, and Body text because those properties come from the authorized
reference. A Reusable Model keeps Clothing editable; a Styled Character also
reference-locks Clothing.

It must not prepend `headshot portrait`, fixed front-facing framing, or a solid
white background.

Scene Builder retains explicit Face, Character, Style, Pose and Outfit roles,
subject to model capability and template slot policy. Final Guided compilation
continues on the server. Manual mode submits user-owned prompt text plus the
canonical reference-role directive.

## 6.1 Additional Direction Contract

All Guided Studio modes (`headshot`, `character-sheet`, and `scene`) provide one
optional **Additional Direction** field after the structured attribute controls.
It supports experienced creators who need a short private direction that is not
represented by the visual cards or dropdown catalog.

Rules:

- maximum length is 300 Unicode characters after trimming;
- the UI shows a live `current / 300` counter and does not accept additional
  characters after the limit;
- the field is actor-scoped and restored with the owning Studio or Scene draft;
- Reset Form clears the field while Surprise Me does not modify it;
- the value is submitted as `additionalDirection`, separate from `selections`,
  `manualPromptText`, and the client prompt preview;
- the server validates the same 300-character limit and returns the stable error
  code `additional_direction_too_long` for an invalid caller;
- the canonical server compiler applies it only in Guided authoring and only
  where compatible with locked mode framing, reference authority, safety, and
  provider constraints;
- Manual Scene and Playground do not use this field because their primary
  prompt is already directly editable.

Template behavior:

- `additionalDirectionSnapshot` is stored in the immutable private execution
  snapshot when the owner publishes a Guided Template;
- it is never added to `replaceableVariables` or `publicInputSchema`;
- it is removed from the public Template projection even when Prompt Visibility
  is `full`;
- a Template consumer cannot view, replace, clear, or override it;
- Template generation resolves the value from the server-owned immutable
  Template Version, never from a consumer request;
- changing it requires the owner to publish a new Template Version.

## 7. Software Design

### Client request boundary

`web/src/features/generation/api/generationApi.ts`

- map React workflow mode to canonical server prompt mode;
- keep pricing and generation `generationMode` identical;
- preserve current lightweight reference payload contract.

### Client preview

`web/src/features/studio/attributes/attributeModel.ts`

- provide mode-specific preview assembly for `headshot`,
  `character-sheet`, and `scene`;
- previews explain canonical behavior but do not replace server compilation.

### Studio reference policy

`web/src/features/studio/studioModePolicy.ts`

- filter selections and references by active Studio mode and Character type;
- remove stale incompatible references before estimate and submission.

`web/src/features/studio/routes/StudioRoute.tsx`

- render only reference slots that are effective for the active workflow;
- map Headshot result handoff to `face_reference`.
- persist and pass the actor-owned Additional Direction for Face Creation and
  Character Sheet.

`web/src/features/studio/components/AdditionalDirectionField.tsx`

- provide the reusable localized textarea, description, and character counter;
- remain presentation-only and receive value/change/disabled state from the
  owning route.

### Scene orchestration

`web/src/features/scene-builder/routes/SceneBuilderRoute.tsx`

- compile Guided preview using Scene mode;
- use that Scene preview when the user confirms copying Guided text into
  Manual.
- show Additional Direction only for normal Guided authoring and hide it while
  consuming a Template.

`web/src/features/templates/templateSerializer.ts`

- store `additionalDirectionSnapshot` in private execution snapshots;
- never infer a replaceable input from this field.

### Server trust boundary

`server/domain/generation/generationRequestService.js`

- normalize prompt mode from `generationMode`;
- keep the canonical server compiler authoritative.
- validate Additional Direction and pass it to the compiler only for Guided
  Studio execution.

`server/domain/templates/templateContracts.js`

- remove `additionalDirectionSnapshot` from every public projection;
- preserve the private field when applying allowed Template replacements.

`server/config/character-casting-policy.json`

- retain versioned three-view casting policy;
- explicitly require a solid pure white background.

## 8. Input, Process and Output

### Face Creation

```text
Input: compatible identity selections + optional Face reference
Process: mode normalization -> Headshot compiler -> provider request
Output: front-facing white-background facial reference
```

### Reusable Character

```text
Input: identity/body selections + optional Face reference
Process: prune Clothing -> lock casting policy -> Character Sheet compiler
Output: three-view full-body white-uniform casting reference
```

### Styled Character

```text
Input: identity/body + selected/uploaded outfit
Process: clothing ownership resolution -> Character Sheet compiler
Output: three-view full-body outfit-bound reference on white
```

### Scene

```text
Input: Guided selections or Manual prompt + role-mapped references
Process: normal Scene compiler/reference authority -> provider request
Output: directed scene without Character-reference framing leakage
```

## 9. Impact and Compatibility

- Existing API shape remains compatible.
- Old clients that send a contradictory `mode` are corrected by server
  `generationMode` normalization.
- Existing three-view Character assets remain valid.
- Credit estimates are unaffected because provider/model/resolution/reference
  count and output count are unchanged.
- Hiding ineffective Studio reference controls prevents users from believing an
  ignored reference was submitted.
- Scene templates and Manual prompts retain their current snapshot contracts.

## 10. Implementation Plan

1. Correct React `generationMode -> mode` serialization.
2. Add server-side defensive mode normalization.
3. Restore mode-specific client previews.
4. Compile Scene Guided preview with Scene rules.
5. Filter Studio reference roles to server-supported inputs.
6. Make the casting background explicitly pure white.
7. Add client request, preview, reference-policy and server integration tests.
8. Run quick React validation and focused Node prompt tests.
9. Add the shared Additional Direction field, actor-scoped persistence,
   request/compiler handling, and private Template snapshot policy.

## 11. Testing

### Automated

- Headshot request serializes `mode: "headshot"`.
- Headshot compiled prompt contains front-facing and pure-white directives and
  excludes Environment.
- Reusable Character prompt contains three views, fitted white uniform and pure
  white background while excluding selected Clothing.
- Styled Character prompt contains selected outfit and pure white background
  without casting-uniform text.
- Reusable and Styled Character prompts retain selected Skin and Body direction
  whenever those domains are not owned by an uploaded reference.
- Character Sheet does not expose ineffective Pose or Lighting controls because
  its canonical three-view contract fixes both.
- Scene prompt contains Environment and excludes Headshot/white-background
  directives.
- Scene without a Character Reference retains Hair, Skin, and Body in preview,
  payload, and final prompt; Character Reference mode removes those owned text
  values while retaining Expression and the correct Clothing policy.
- Face Reference compilation retains editable Expression while suppressing all
  other Face-shape text, and Character Reference directives explicitly preserve
  skin tone together with identity, hair, and body proportions.
- Studio reference policy strips ineffective Character/Style/Pose/Outfit roles
  according to mode.
- Additional Direction is included in estimate and generation requests as a
  separate field and is compiled in Face, Character Sheet, and Guided Scene.
- Additional Direction over 300 characters is rejected by the server.
- Template public projections omit `additionalDirectionSnapshot`, Template
  replacement schemas never expose it, and server-side Template execution keeps
  applying the immutable private value.

### Manual UI

1. Generate Face Creation and verify front-facing head-and-shoulders output on
   white.
2. Generate Reusable Model and verify three complete views with white casting
   clothing.
3. Generate Styled Character with an outfit and verify the outfit appears
   consistently across all views on white.
4. Generate Guided Scene and verify selected pose/environment appear without
   white reference-sheet framing.
5. Switch Guided Scene to Manual with copy confirmation and verify copied text
   is Scene-directed.

## 12. Exit Criteria

- All three flows resolve to the correct server compiler branch.
- UI reference controls match effective server behavior.
- Face and Character reference outputs meet their white-background contracts.
- Scene output remains independently directed.
- Focused prompt parity tests pass.

## 13. Custom Color and Character Sheet Parity Addendum (2026-07-29)

- Hair supports Base hair color plus optional Dimensional highlights.
- Active custom hair colors disable preset color swatches and replace their
  prompt phrase.
- Clothing supports Dominant garment tone plus Accent garment tone; the server
  harmonizes them as one outfit palette.
- `GenerationRequestDraft`, `GenerationExperience` and `generationPayload()`
  preserve `customColors`; a hard-coded empty object is a release blocker.
- Character Sheet prompts use the fixed left-to-right orientation and prohibit
  all visible typography and panel labels.
