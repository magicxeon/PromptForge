# Professional Guided Scene Builder Experience

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Related:** `../009-migration-to-react/013-guided-generation-prompt-parity-and-mode-contract.md`, `002-character-pose-and-environment-selection.md`, `009-fashion-model-qualification-and-routing-optimization.md`, `../011-reference-processing-pipeline`, `../008-implement-adjusment-ui/014-global-route-inventory-and-target-information-architecture.md`, `../014-implementation-commercial-feature-plan/Phase2-19-fashion-routing-qualification-and-promotion.md`  
**Required skill:** `skills/design-professional-scene-prompts/SKILL.md`  
**Status:** Partially implemented; Simple/Pro recipe and accordion experience completed 2026-08-04, credit-presentation and visual qualification remain

**Implementation checkpoint (2026-08-04):**

- server-owned recipe catalog: `server/config/scene-pose-recipes.json`;
- public catalog delivery: `/api/attributes/bundle.scenePoseRecipes`;
- canonical client resolver: `web/src/features/scene-builder/scenePoseRecipeModel.ts`;
- reusable mode/recipe UI: `web/src/features/scene-builder/components/ScenePoseControlPanel.tsx`;
- one-open accordion and Next behavior: shared `GuidedAttributeForm` parameters;
- Face Creator and Character Sheet opt into the same one-open accordion and
  Next behavior so all three Studio flows use one interaction pattern;
- actor draft schema: version 2 with version 1 migration;
- Template snapshots retain `poseControlMode`, recipe ID and recipe version;
- Scene-only Surprise and Export actions are hidden through shared component flags;
- all six MVP recipes resolve to enabled canonical attribute IDs.
- History reference selection filters generated work by reference semantics,
  synchronizes invalid role state and hides Template-locked reference roles.
- Simple Scene recipe catalog version `2026-08-mvp-2` replaces vague pose labels
  with six explicit single-subject biomechanical directions covering body angle,
  weight transfer, head direction, hands, feet and garment visibility.
- Scene generation now adds one shared output-composition guard: Character
  casting sheets supply identity and proportions only and can never cause a
  duplicated person, multi-view layout, contact sheet or split-screen output.
- actor-scoped Scene drafts persist the applied recipe version and automatically
  refresh stale Simple recipe selections without mutating immutable Templates.

This checkpoint does not mark the full requirement complete. Phase C visual
qualification, compatibility warning reason codes and Phase E credit
presentation remain open.

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

### 3.1 Simple and Pro Controls

Guided Scene authoring has two pose-control levels backed by the same canonical
selection, recipe and generation pipeline:

```text
Simple
-> select a visual professional setup
-> apply compatible pose, hands, gaze, environment, lighting and camera
-> generate immediately

Pro Controls
-> begin with the same setup
-> expose bounded attribute controls for detailed refinement
-> resolve through the same canonical prompt compiler
```

The runtime values are `simple | advanced`. Customer-facing English copy uses
`Simple` and `Pro Controls`; Thai copy must communicate the same distinction
without implying that Simple produces lower-quality output.

Simple is the default for new Scene drafts. It must:

- present a compact segmented mode control and visual professional setup cards;
- describe the commercial purpose, recommended subject/product and framing of
  each setup in plain language;
- apply a versioned setup containing Fashion purpose, Pose Intent, hand
  placement, gaze, Environment, Lighting and Camera defaults together;
- keep identity, Character, Outfit and Template/Reference authority outside the
  setup and never overwrite them;
- apply only fields the active Template allows the customer to replace;
- show when retained Pro adjustments make the current values differ from the
  selected setup;
- permit generation without opening raw biomechanics or camera controls.

Pro Controls must:

- start from the currently selected Simple setup rather than an empty form;
- expose the relevant Character, styling, Pose, Environment, Lighting, Camera,
  Quality and Additional Direction controls;
- keep internal mechanics such as exact joint angles, center of mass and pelvis
  rotation inside the recipe/resolver for MVP;
- retain user changes when switching back to Simple;
- show a compatibility warning instead of silently replacing a meaningful
  explicit choice when a later resolver adjustment is required.

Switching Simple to Pro expands the resolved selections without changing them.
Switching Pro to Simple does not reset advanced values. If the active selections
no longer match the base setup, the UI identifies them as retained professional
adjustments. Selecting a setup card again explicitly reapplies that setup.

The two control levels terminate in one contract:

```text
Simple setup selection -> ScenePoseRecipe + selections -> ResolvedPoseSpec
Pro refinements         -> ScenePoseRecipe + overrides  -> ResolvedPoseSpec
```

They must not create separate credit estimates, queues, prompt compilers,
provider calls or Template serializers.

### 3.2 Pose and Camera Setup Contract

Simple setups combine pose and camera because a professional pose is not
independent of framing and viewpoint. The versioned public setup data contains:

```text
id
schemaVersion
version
purpose
label and description
bestFor[]
fieldSelections
  Fashion Direction
  Pose Intent
  Fashion Hand Position
  Fashion Gaze
  Fashion Venue
  Lighting Setup
  Framing
  Focal Length
  Perspective
  Composition
enabled
```

Setup values reference canonical Attribute option IDs. They do not copy prompt
fragments into React. The server-owned Attribute Bundle publishes the setup
catalog, React resolves IDs against the loaded Attribute library, and the
canonical server compiler remains authoritative.

Initial MVP setups:

```text
Clean Front Display
Relaxed Three-quarter
Natural Creator Reveal
Refined Lookbook Pause
Back Garment View
Editorial Fabric Motion
```

### 3.2.1 Reference-derived Simple Shot Recipe expansion

The initial MVP setups above are functional selling views but do not yet cover
the visual direction demonstrated by the approved references under
`_temp/sample-fashion/`. The next Simple catalog revision must add the following
eight customer-facing Shot Recipes. These are coherent direction bundles, not
independent pose labels and not free-form Custom Prompt presets.

Each recipe must resolve canonical Attribute IDs for body direction, hand and
environment interaction, gaze, venue, lighting, framing, focal length,
perspective and composition. Recipe-owned directives may carry exact mechanics
that should not become visible customer controls. A recipe is not complete
until its resolved prompt and generated samples pass visual qualification.

#### Street Walk Editorial

Reference family:
`02-male-fashion-casual.jpg`, `03-male-fashion-casual.jpg` and
`08-Thai-male-summer-fashion-casual.jpg`.

```text
purpose: street-style lookbook / casual campaign
body: natural mid-stride with credible weight transfer and separated legs
hands: one hand may rest naturally in a pocket; the other remains relaxed
gaze: direct or slightly off-camera according to the walking direction
environment: quiet city street with architectural leading lines
camera: eye level, natural 50-70mm perspective, full-body or environmental portrait
composition: subject aligned with street depth; movement space remains ahead
lighting: open shade or restrained daylight with realistic street contrast
garment policy: complete silhouette readable; hands and accessories cannot hide key construction
```

#### Architectural Lean

Reference family:
`08-Korean-male-summer-fashion-with-car.jpg` and
`09-Japanese-male-summer-fashion-restaurant-background.jpg`.

```text
purpose: polished lifestyle / menswear or structured-look campaign
body: shoulder, upper back or hip supported naturally by architecture or a vehicle
legs: ankles may cross or one foot may rest with a relaxed knee
hands: one hand in pocket or relaxed at the side; no duplicated gestures
gaze: deliberate off-camera gaze with head direction coordinated to the torso
environment: one clear support surface with plausible contact and scale
camera: eye to chest height, mild three-quarter viewpoint, full or three-quarter body
composition: support object anchors one side while the subject remains dominant
lighting: clean open shade or motivated storefront light
garment policy: support contact must not deform or conceal the principal garment
```

#### Window Shadow Lookbook

Reference family:
`05-female-korean-fashion-plain-lighting-background.jpg`,
`06-female-chinese-with-texture-backdrop.jpg` and
`12-female-fashion-pose-with-shadow-lighting.jpg`.

```text
purpose: refined brand lookbook
body: stable weight shift with elongated torso and controlled asymmetry
hands: behind the body, in pockets or resting clear of the garment front
gaze: quiet camera connection or subtle off-camera direction
environment: minimal wall or textured backdrop
camera: eye level, 70-85mm, full-body or medium portrait according to garment scope
composition: restrained negative space with a clean silhouette
lighting: hard or semi-hard directional window pattern with intentional graphic shadow
garment policy: shadow may add depth but cannot erase material, color or construction
```

#### Cafe Seated Lifestyle

Reference family: `07-female-chinese-sitting-with-travel-location.jpg`.

```text
purpose: social-commerce lifestyle / travel fashion
body: compact anatomically stable seated pose with clear support and leg placement
hands: resting together or interacting with one bounded prop
gaze: candid or soft camera connection
environment: cafe frontage, bench or seating surface with foreground context
camera: seated eye level, 50-85mm, medium-full composition
composition: foreground prop and background storefront create depth without clutter
lighting: soft exterior daylight with practical interior accents where appropriate
garment policy: seated folds remain plausible and the outfit silhouette stays understandable
```

#### Sunlit Storefront

Reference family:
`04-female-korean-fashion.jpg` and
`11-female-fashion-pose-with-lighting-and-background.jpg`.

```text
purpose: approachable street lookbook / creator campaign
body: relaxed standing or cross-leg stance with credible balance
hands: restrained interaction with a bag, drink or garment edge
gaze: looking toward street activity or softly back toward the camera
environment: storefront or cafe facade with one recognizable architectural anchor
camera: eye level, 50-85mm, medium-full or full-body framing
composition: subject offset from center with environmental context and clean escape space
lighting: direct or dappled sunlight with controlled highlight and shadow detail
garment policy: accessories remain subordinate and must not replace uploaded product details
```

#### Low-angle Campaign Hero

Reference family: `19-character-profile-post-female.jpg`.

```text
purpose: premium campaign hero / character presence
body: strong elongated line with shoulders and torso deliberately directed
hands: pockets or a restrained confident position outside the primary crop
gaze: commanding off-camera or near-camera connection
environment: modern architecture or city light with vertical scale
camera: clearly low but anatomically safe angle, environmental portrait framing
composition: dominant subject with intentional upper-frame negative space and converging architecture
lighting: cinematic environmental color contrast with preserved face and garment detail
garment policy: suitable for campaign identity; not presented as a strict catalog-fidelity view
```

#### Soft Character Portrait

Reference family:
`15-character-profile-post-female.jpg`,
`16-character-profile-post-female.jpg`,
`17-character-profile-post-male.jpg` and
`18-character-profile-post-male.jpg`.

```text
purpose: Character profile / creator identity image
body: natural shoulder angle and subtle neck turn rather than a front passport pose
hands: normally outside crop unless a deliberate restrained gesture is included
gaze: gentle direct connection, over-shoulder connection or natural candid glance
environment: unobtrusive wall, daylight street or intimate indoor context
camera: eye level or slightly high, 70-105mm portrait perspective, close or medium close-up
composition: face and eyes are the visual anchor with safe hair and chin margins
lighting: soft daylight, subtle flash or restrained editorial shadow
garment policy: identity-first recipe; not eligible as the only garment-selling output
```

#### Color-light Editorial

Reference family:
`13-female-fashion-pose-with-shadow-colo-lighting.jpg` and
`14-character-profile-post-female.jpg`.

```text
purpose: editorial campaign / striking Character feature
body: strong torso angle and controlled asymmetrical line
hands: pockets or one deliberate editorial position; never ambiguous extra gestures
gaze: intense editorial connection without sexualized wording
environment: dark studio, haze or minimal graphic background
camera: eye to slightly low level, 70-85mm, medium or medium-full framing
composition: strong silhouette and controlled negative space
lighting: split-color key/rim relationship or hard graphic shadow with intentional color separation
garment policy: preserve garment color recognizability unless the user explicitly accepts editorial color shift
```

Simple cards must show a representative visual preview, plain-language purpose,
recommended garment use and expected framing. Selecting a card applies the
whole recipe once. Users do not separately assemble these mechanics in Simple
Mode. Pro Controls expose only bounded refinements while retaining the selected
recipe as the base direction.

These eight recipes are implemented in catalog version
`2026-08-professional-3`. Their canonical Attribute IDs, schema validation,
prompt-resolution regression tests and fixed visual preview assets are present.
The existing six MVP recipes remain enabled but non-discoverable during
migration, so historical drafts and immutable Template versions continue to
resolve without crowding the current Simple selection experience.

Every full-body setup uses full-body-safe framing, complete footwear visibility
and margin appropriate to stillness or movement. A back-view setup must not
claim direct facial visibility. Editorial setups may use stronger asymmetry but
must continue to preserve Character identity, garment construction and anatomy.

### 3.3 Persistence and Template Compatibility

Actor-scoped Scene drafts persist:

```text
poseControlMode: simple | advanced
scenePoseRecipeId
scenePoseRecipeVersion
```

Reusable Scene snapshots persist the same metadata alongside their immutable
resolved structured selections. Historical snapshots without these fields
hydrate as Pro Controls with no selected setup and preserve their existing
selections. A loaded Template never becomes editable merely because the user
changes control level.

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

### 5.1 Full-body framing and footwear completion

When an explicit Pose or Camera selection requests a full-body Scene, the
canonical compiler must add a provider-neutral framing guard that:

- keeps the complete subject visible from the top of the hair through both
  feet;
- prohibits cropping the head, hair, hands, arms, legs, ankles, footwear or
  any other body part;
- reserves visible safety margin above the hair, below the feet and on both
  sides of the silhouette;
- does not weaken the selected pose, camera perspective or Environment.

Footwear is part of a complete full-body fashion result. When neither the
selected Clothing direction nor an Outfit reference specifies footwear, the
compiler must direct the provider to select simple coherent footwear suitable
for the outfit, Environment and action. It must not add unrelated accessories.
An explicit footwear selection, visibly supplied Outfit footwear, or an
explicit barefoot direction has higher authority and suppresses this fallback.

### 5.2 Dynamic Variation Boundaries

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

Length policy:

- each Custom Attribute accepts at most `1,000` Unicode characters;
- all active Custom Attributes together accept at most `2,000` Unicode
  characters per generation request;
- Additional Direction retains its separate `300`-character limit and is not
  included in the Custom Attribute budget;
- the UI must show both per-field and combined usage;
- input must never be truncated silently; over-limit text remains visible for
  correction, the `Use` action is disabled and an accessible error explains
  which limit was exceeded;
- the server trims surrounding whitespace and enforces both limits again before
  prompt compilation, estimate use or queue submission;
- stable server errors are `custom_attribute_too_long` and
  `custom_attribute_total_too_long`.

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
- The Admin/debug prompt surface includes a familiar Copy icon action that
  copies the current canonical compiled prompt from the read-only text area.

This requirement does not remove Surprise or Export from another surface
unless that surface's owning requirement also removes it.

### 8.1 Credit presentation contract

Scene Builder and the Template-preparation handoff must present credits as a
customer decision, not as raw provider accounting.

For the Thai beginner-facing experience:

- keep the primary number visually compact and easy to compare;
- label it as an estimated maximum before generation;
- show the available balance next to the action when it helps the decision;
- keep provider cost, reference multipliers and internal ledger units out of
  the primary Simple UI;
- provide an expandable breakdown for generation, Template access and one-time
  Fashion-ready preparation when those operations apply;
- show a valid Pose Proxy cache hit as no additional preparation charge;
- use the shared insufficient-credit dialog rather than a small inline error;
- never advertise a cheaper tier by routing to an unqualified model.

The exact denomination and conversion are versioned server-owned pricing
policy. React must not divide, round or remap credit values independently. If
commercial pricing introduces a smaller customer-facing display unit, the
quote/API must return both the authoritative ledger amount and fields such as:

```text
displayCredits
displayCreditUnitVersion
displayCreditLabel
```

The accepted quote binds the display-unit version with the underlying immutable
ledger amount. Historical transactions retain the unit version used when the
customer confirmed them. Phase2-07 owns ledger integrity and Phase2-08 owns
packages, money and final denomination economics.

Draft/Proof means one qualified proof output. Selling Quality uses the fixed
qualified MVP route. Premium must not appear to promise a superior model while
it resolves to the same unproven route; hide it or describe a materially
different service scope until Phase2-19 approves it.

### 8.2 Scene-to-Template Fashion readiness

A generated Scene may be published as ordinary Community work without becoming
a Fashion-ready Template. Fashion readiness is a separate owner-controlled
state:

```text
Scene output
-> reusable Template version
-> calculate one-time preparation estimate
-> prepare private identity-neutral Pose Proxy
-> creator review and approval
-> Fashion-ready
```

Only a Template version with an active compatible Pose Proxy may be selected in
Fashion Blueprint. Preparing, failed, rejected, retired and stale versions may
remain visible to their owner with clear status, but must not appear as usable
Fashion choices. The preparation operation and final customer generation use
separate quotes and must not be merged into one unexplained credit amount.

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
6. Load the public Custom Attribute limits from the Attribute Bundle and apply
   them in the shared field control used by Studio and Scene Builder.
7. Remove Scene-only Surprise and Export actions through component parameters,
   not duplicated markup.
8. Keep the same components reusable by Face Creator and Character Sheet with
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
5. Verify full-body Scene prompts protect all body parts, reserve safe margins
   and add footwear fallback only when footwear is otherwise unspecified.
6. Verify the Admin/debug Copy action copies the canonical compiled prompt.
7. Run fixed visual review fixtures for professional quality, natural pose,
   garment visibility and dynamic composition.

### Phase E - Readiness and credit presentation

1. Reuse the shared quote, insufficient-credit dialog and estimate status
   components; do not create a Scene-owned credit pipeline.
2. Add server-returned display-credit metadata only through the central pricing
   contract and bind its version to accepted quotes.
3. Keep generation, Template access and Pose Proxy preparation visible as
   separate breakdown rows while presenting one confirmed maximum.
4. Connect reusable Scene publication to owner-visible Pose Proxy readiness
   without making ordinary Community publication depend on Fashion readiness.
5. Filter the Fashion Template picker to active compatible ready versions.
6. Hide Premium until its route or service scope passes Phase2-19 promotion.

## 12. Expected File Ownership

```text
server/config/scene-direction-recipes.json
server/config/scene-direction-recipes.schema.json
server/config/generationInputPolicy.js
server/domain/generation/SceneDirectionRecipeService.js
server/domain/generation/customAttributeInputPolicy.js
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
- server prompt contains one coherent context/story/pose direction;
- displayed credits come from the accepted server quote and retain the display
  unit version;
- a cached compatible Pose Proxy adds no preparation charge;
- a non-ready Template cannot be selected for Fashion generation;
- Simple UI cannot expose an experimental provider through a quality label.

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
- Credit presentation is compact and understandable without changing or hiding
  the authoritative maximum amount.
- React does not calculate a display denomination or duplicate provider pricing.
- Scene publication and Fashion-ready preparation are distinct, understandable
  states.
- Premium is hidden or honestly differentiated until Phase2-19 promotion
  succeeds.

## 15. Attribute Simplification Decision

The next Scene direction revision must reduce visible technical decisions while
preserving stable IDs for existing History, drafts and Template snapshots. An
attribute removed from the current UI must first be hidden, merged or marked as
deprecated; it must not be physically deleted while a persisted snapshot can
still reference it.

### 15.1 Hide from direct Scene selection

- `Fashion Direction`, `Fashion Photography Context` and `Fashion Story` remain
  recipe-owned metadata rather than separate user decisions.
- Camera Brand, ISO and White Balance should move behind semantic Shot Recipe or
  Photography Finish choices because their effects overlap focal, lighting,
  color-temperature and finish direction.
- Set Design should become recipe-owned when Fashion Venue already establishes
  the location and visual purpose.
- Lens Type may be recipe-owned while Focal Length remains available to Pro
  Controls.

### 15.2 Merge or curate

- Merge general Hand Position and Fashion Hand Position into one bounded
  `Hand & Interaction` contract.
- Merge Eye Contact and Fashion Gaze into one `Gaze Direction` contract.
- Curate the overlapping Motion Blur catalog into a small set of predictable
  outcomes: frozen sharp, background motion, panning motion and atmospheric
  foreground motion.
- Remove misleading or unsafe customer-facing wording. In particular,
  `Intense Seductive Gaze` becomes `Intense Editorial Gaze`; ambiguous anatomy
  directions such as `Arching Back Subtly` require professional review before
  remaining selectable.
- `Laying Down Side View` must not remain categorized as Sitting and should be
  recipe-only or deprecated until it has a qualified fashion use case.
- Extreme shallow-depth options such as `Dreamy f/0.95` are not suitable for a
  garment-fidelity Simple recipe and should be Pro-only or deprecated there.

### 15.3 Camera Imperfections exception

`Camera Imperfections` remains available in the catalog for the next revision.
Do not remove it and do not merge it into Photography Finish yet. Its current
options can continue to support deliberate optical character, sensor texture,
halation and handheld realism. A later visual qualification pass must determine
which options belong in Pro Controls and which should be applied only by Shot
Recipes.

### 15.4 Intended control levels

Simple Mode should primarily expose Shot Recipe, Character, Outfit, a bounded
location family and mood. Pro Controls may expose Focal Length, Framing,
Perspective, Composition, semantic Depth of Field, lighting contrast,
temperature, shadow, accent, atmosphere and background activity. Both levels
must resolve through the same canonical attributes and prompt compiler.

## 16. Implementation Checkpoint - Simple Progression and Character Outfit Authority

Implemented behavior:

1. Simple-mode `Next settings` resolves the next accordion category from the
   same reference-authority policy used by the controls. Categories whose
   fields are all controlled by Face, Character, Outfit or Template references
   are skipped instead of opening a category the user cannot edit.
2. A Reusable Model selected from Character History keeps identity, skin, hair
   and body authority while Clothing and Accessories remain editable through
   structured options or Custom Write-In prompt direction.
3. A Styled Character retains its authored clothing by default. Historical
   Character outputs without explicit type metadata use the replaceable MVP
   fallback so legacy Reusable Models do not become permanently locked.
4. A directly uploaded Character Reference defaults to replaceable clothing.
   Character Profile handoffs with an explicit outfit behavior continue to use
   that authoritative behavior.
5. `outfit_front` or `outfit_back` remains the highest clothing authority. When
   either is present, Clothing and Accessories prompt selections are suppressed
   and the uploaded garment reference controls generation.

Validation coverage:

- Simple progression skips consecutive Character-controlled groups and opens
  the next editable group.
- Character type metadata maps Reusable/legacy output to `replaceable` and
  Styled Character to `preserve`.
- Existing server regression coverage verifies replaceable Character clothing
  reaches the canonical prompt and explicit Outfit Reference removes the
  conflicting clothing prompt.

## 17. Implementation Checkpoint - Professional Shot Recipe Catalog

Implemented behavior:

1. Catalog `2026-08-professional-3` adds the eight reference-derived Shot
   Recipes from section 3.2.1. Each recipe resolves one coherent set of Pose,
   Hand and Interaction, Gaze, Venue, Atmosphere, Lighting, Framing, Focal
   Length, Aperture, Perspective, Composition, Motion and Camera Imperfection
   Attribute IDs before the canonical prompt compiler runs.
2. Simple Mode shows visual recipe cards backed by stable runtime assets under
   `client/assets/scene-builder/shot-recipes/`. The approved references are
   presentation aids only; generated prompts remain owned by canonical
   attributes.
3. The six previous MVP recipes remain enabled and resolvable for historical
   drafts and immutable Templates. They are non-discoverable in new Simple
   sessions, while a restored legacy selection remains visible until changed.
4. Pro Controls hide recipe-owned Camera Brand, Lens, ISO, White Balance and
   Set Design choices without deleting their stable IDs. Focal Length,
   Framing, Perspective, Composition and Camera Imperfections remain editable.
5. Scene Motion Blur is curated in the UI to frozen sharp, panning,
   background motion and atmospheric foreground motion. Historical values
   remain valid in persisted selections and canonical prompt compilation.

Automated validation:

- every recipe field selection resolves to a current canonical Attribute ID;
- each recipe Pose prompt contains explicit single-subject mechanics;
- exactly eight recipes are discoverable and each owns a stable preview asset;
- legacy non-discoverable recipes remain selectable when restored from draft;
- server prompt regression still rejects Character Sheet multi-view layout in
  Scene generation.

Manual visual verification:

- verify the eight cards at desktop and mobile widths with no clipped text;
- generate at least one identity/reference-controlled sample for each recipe;
- score body mechanics, hands, gaze, framing, garment visibility and
  environment plausibility against the approved reference family;
- treat visual qualification as provider-specific evidence, not proof from the
  prompt text alone.

## 18. Implementation Checkpoint - Deterministic Photographic Realism Recipes

Scene Builder must first produce believable fashion photography from canonical
structured attributes without calling an AI prompt-rewrite service. Broad mood
labels such as `soft daylight`, `fashion photography` or `eye-level` are not
sufficient where a Shot Recipe depends on a specific physical relationship.

The deterministic recipe contract should describe, where relevant:

1. subject contact points and distance from the environment;
2. subject rotation relative to the environment and camera;
3. camera side, view axis, height, pitch, distance and focal behavior;
4. the direction in which architectural planes recede through the frame;
5. key-light source, lateral angle, elevation and hardness;
6. key-to-fill relationship and shadow-side exposure;
7. contact shadows, highlight boundaries and garment-color preservation; and
8. explicit exclusions for flat frontal fill or conflicting optical effects.

Implemented MVP refinement:

- Catalog `2026-08-professional-4` upgrades `Sunlit Storefront` to version 2.
- `fashion.social` explicitly establishes photorealistic on-location fashion
  photography rather than generic social content.
- The Storefront pose owns wall contact, body-to-wall rotation, face return,
  oblique camera axis and receding architectural depth.
- Storefront lighting owns a single motivated late-afternoon source, measurable
  direction, a defined light patch, cooler lower-level fill and physical contact
  shadows.
- Gentle halation is removed from this recipe because it obscures light-shape
  qualification. Slight handheld framing supplies restrained photographic
  irregularity without weakening the directional-light contract.

The same physical review method should be applied to the other seven
discoverable Shot Recipes only after provider-specific visual samples expose a
repeatable failure. Avoid adding generic realism prose globally because studio,
catalog, portrait and color-light recipes require different physical behavior.

### 18.1 Optional AI-assisted authoring fallback

If deterministic recipes still cannot produce natural results consistently,
AI may assist during recipe authoring or an explicit optimization workflow, but
must not be called for every customer generation by default. A successful
rewrite becomes a reviewed, versioned recipe projection keyed by a stable
fingerprint of:

```text
recipe version
provider and model family
editable camera and lighting selections
environment family
garment scope
```

Cached projections contain prompt text and provenance only, never private
reference images or actor data. Cache ownership remains with Scene prompt
authoring/configuration; the canonical Generation compiler and Reference
Processing authority order remain unchanged. A cache miss falls back to the
deterministic canonical recipe until a separately authorized optimizer exists.

Automated validation verifies that the Storefront recipe compiles its fashion
photography context, wall contact, oblique camera axis, physical key/fill model,
contact shadows and flat-light exclusions, while no longer compiling gentle
halation.

## 19. Implementation Checkpoint - Physical Shadow and Grounded Environment

Catalog `2026-08-professional-5` upgrades `Window Shadow Lookbook` to recipe
version 2 and formalizes the physical-light and real-location review gates in
`skills/design-professional-scene-prompts/SKILL.md`.

Implemented behavior:

1. Window Shadow uses one traceable source path: semi-hard late-morning sun
   enters through a real tall gallery window, directly illuminates substantial
   face, body and garment surfaces, forms mullion shadow bands on the subject,
   then continues with aligned geometry onto the receiving wall and floor.
2. Ambient fill remains below the direct sunlight so the subject cannot remain
   evenly lit while a decorative shadow appears only behind them.
3. Face identity, garment color, material and construction remain readable,
   while flat frontal fill, background-only patterns and invented neon or
   floating sources are explicitly excluded.
4. Minimalist Gallery now resolves to a real contemporary fashion-shoot
   location with plausible materials, floor/wall junction, architectural depth,
   a source window and restrained production-relevant context. Abstract voids,
   impossible architecture and random decorative props are excluded.
5. The environment contract applies as an authoring quality gate to subsequent
   Shot Recipe revisions. Existing theatrical and Color-light recipes may keep
   deliberate art direction only when the recipe explicitly owns it.

Automated validation checks direct light on the subject, shadow continuity,
non-flat fill, grounded gallery structure and abstract-environment exclusions.
Manual qualification must still generate Window Shadow samples per provider and
score light-path coherence, face/garment readability and location plausibility.

## 20. Implementation Checkpoint - Soft Character Portrait Parity

Catalog `2026-08-professional-6` upgrades `Soft Character Portrait` to recipe
version 2 after manual output showed that the former recipe produced a wide
environmental Gallery portrait rather than the close identity portrait shown by
its preview.

Root causes:

1. the shared Minimalist Gallery direction requested floor/wall structure,
   corridor depth, a window and furniture, which encouraged a wider camera;
2. `medium close-up` competed with lower-garment descriptions and an ambiguous
   lower crop boundary;
3. persisted Lighting Accent, Film Look and Color Grading selections compiled
   neon, halation, film and cinematic color instructions beside soft daylight;
4. Social Commerce language prioritized mobile environmental content rather
   than the face and eyes; and
5. lighting direction did not define source position, light ratio or explicit
   exclusions strongly enough.

Implemented behavior:

- The recipe resolves the dedicated `Identity Portrait` direction, `Quiet
  Window Wall` environment and physically described `Soft Character Daylight`.
- Pose direction locks one head-and-shoulders image cropped from the upper chest
  upward. Waist, hips, hands and lower garments remain outside frame even when
  clothing selections describe them.
- Shoulders turn 30-40 degrees, the neck returns to camera and the head receives
  a restrained natural tilt while both eyes and Character identity remain clear.
- The environment contains only a real warm-white wall behind the portrait and
  an off-frame camera-left window. Gallery depth, floor, furniture, props, neon
  and competing architecture are excluded.
- Window light is one large diffused source above camera-left with a one-stop
  cheek-to-cheek falloff, natural catchlights, skin texture and chin shadow.
- Gentle Halation is replaced by Slight Handheld Movement.

### 20.1 Recipe conflict-clearing contract

Scene Pose Recipes may declare `clearFields` for stale visual selections whose
meaning conflicts with a recipe's defining composition. The React Scene recipe
model clears those fields through the same canonical apply operation before it
sets recipe fields; it does not add route-specific prompt manipulation.

Soft Character Portrait clears only:

```text
Lighting Accent
Film Look
Color Grading
```

Character, Face, Hair, Body and Clothing ownership remains unchanged. Template
editable-field policy and Pose Reference blocking continue to take precedence.
The selected recipe is reported as adjusted if a cleared field is subsequently
reintroduced in Pro Controls.

Automated validation covers catalog resolution, exact portrait crop, dedicated
wall and window light, absence of Gallery/Halation conflicts, and clearing of
stale recipe-conflicting fields. Manual qualification must compare at least one
Character Reference result per provider against the recipe preview for crop,
shoulder/head direction, identity, catchlights and background restraint.

### 20.2 Canonical framing precedence fix

Regression testing exposed that the canonical Scene compiler previously
searched raw Pose and Camera prose for the token `full-body`. A portrait
exclusion such as `never widen to a ... full-body portrait` therefore
incorrectly enabled the global complete-silhouette and footwear directives,
overriding the selected Medium Close-up framing.

The compiler now treats the structured `Framing` selection as authoritative:

1. when Framing exists, full-body policy is enabled only when that selection
   itself requests full-body/head-to-feet output;
2. Pose/Camera text scanning remains a compatibility fallback only when no
   structured Framing selection exists; and
3. portrait framing never receives complete-feet margins or footwear fallback.

Regression coverage preserves full-body Scene safety while proving that
negative full-body wording inside a close portrait cannot activate it.
