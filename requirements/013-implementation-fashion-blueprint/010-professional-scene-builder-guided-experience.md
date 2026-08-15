# Professional Guided Scene Builder Experience

**Parent:** `000-master-fashion-blueprint-roadmap.md`  
**Related:** `../009-migration-to-react/013-guided-generation-prompt-parity-and-mode-contract.md`, `002-character-pose-and-environment-selection.md`, `009-fashion-model-qualification-and-routing-optimization.md`, `../011-reference-processing-pipeline`, `../008-implement-adjusment-ui/014-global-route-inventory-and-target-information-architecture.md`, `../014-implementation-commercial-feature-plan/Phase2-19-fashion-routing-qualification-and-promotion.md`  
**Required skill:** `skills/design-professional-scene-prompts/SKILL.md`  
**Status:** Complete for the local MVP (2026-08-15); commercial qualification,
durability and support follow-ups are transferred to Requirement 014

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

This was the initial implementation checkpoint. The remaining MVP visual,
compatibility, readiness and Credit presentation gates were completed in the
closure checkpoint in Section 26.

### Runtime recovery checkpoint (2026-08-14)

- Scene Builder must normalize actor drafts and Template handoff selections at
  the browser persistence boundary before compiling prompts or rendering
  attribute controls.
- A malformed or legacy selection without a canonical string `id`, prompt
  value or owning group is discarded instead of crashing the route.
- Expired Template use handoffs are cleared and ignored when Scene Builder is
  opened. Manual runtime cleanup of a Template must not leave the route trapped
  behind a stale browser handoff.
- Attribute reconciliation and prompt preview retain defensive normalization so
  malformed restored state cannot reach `startsWith` or other string-only
  operations.
- Regression coverage must prove malformed restored selections are removed and
  that catalog reconciliation, applicability reconciliation and Scene prompt
  compilation remain available.

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
- clear recipe-exclusive fields that are not owned by the newly selected setup;
  specifically, switching away from Color-light Editorial must remove its
  `Lighting Accent` before prompt compilation so red/blue separation cannot
  leak into Street Walk or another natural-light setup;
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
body: relaxed standing or cross-leg stance with credible balance; torso remains within 30 degrees of camera
hands: restrained interaction with a bag, drink or garment edge
gaze: both eyes visible; facial plane remains 0-30 degrees from camera and never becomes a side profile
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
environment: real glass-and-steel commercial high-rises with glazed facades and visible sky; never an isolated concrete slab or blank pillar
camera: close campaign framing, camera around knee-to-low-waist height and tilted 15-25 degrees upward
composition: dominant nearby subject occupying about 86-92% of frame height with converging high-rise lines and controlled sky space
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
lighting: split-color key/rim relationship visibly shapes the subject's face, skin and garment as well as the background; never color only the set
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
- After a category heading is activated, inspect the resulting accordion
  state. Only when that category finishes expanded should the UI scroll its
  heading to the start of the viewport and move keyboard focus to the heading.
  Collapsing an already expanded category must not scroll or move focus. The
  expanded path uses the same shared progression routine as `Next`;
  reduced-motion preference changes smooth scrolling to immediate scrolling.
- The shared `GuidedAttributeForm` regression suite must cover both navigation
  paths: advancing with `Next` and directly selecting a collapsed category.

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

The shared configurator action contract uses explicit `standard` and `scene`
variants instead of unrelated visibility flags. Hiding a retired Scene action
must never hide Reset or reveal another retired action accidentally. Component
regression coverage must assert both inventories: standard Studio retains all
actions owned by its requirements, while Scene Builder retains Reset and omits
Surprise and Export.

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

A generated Scene may be published immediately as ordinary Community work. If
the creator chooses a reusable Template, its canonical Template/version is
saved as an owner-only setup draft and is not public until Fashion readiness is
approved:

```text
Scene output
-> reusable Template version
-> calculate one-time preparation estimate
-> prepare private identity-neutral Pose Proxy
-> creator review and approval
-> publish the same Community post
-> Fashion-ready
```

Only a Template version with an active compatible Pose Proxy may be selected in
Fashion Blueprint. Preparing, failed, rejected, retired and stale versions may
remain visible to their owner with clear status, but must not appear as usable
Fashion choices. The preparation operation and final customer generation use
separate quotes and must not be merged into one unexplained credit amount.
The owner resumes an incomplete setup through `/me/templates`; viewers cannot
discover or invoke its public use contract before activation.

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
- Scene Builder continues to show a working Reset Form action; shared action
  visibility cannot substitute one button for another.
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

### 19.1 Window Shadow editorial pose qualification

Catalog `2026-08-professional-7` upgrades `Window Shadow Lookbook` to recipe
version 3 after manual verification confirmed that its physical shadow was
coherent but its former symmetrical weight shift and both-hands-behind direction
did not create a strong fashion silhouette.

The recipe now owns a stable editorial contrapposto: one long supporting leg,
one softly crossed free leg, restrained pelvis/ribcage counter-rotation, an
elongated asymmetric S-curve and a slight head return. Its dedicated asymmetric
hand direction places one hand at the high hip or waist side seam and the other
low beside or slightly behind the outer thigh. Hands cannot mirror each other or
cover the garment front, closure, waist construction or principal product
detail. Environment, camera and the qualified physical Window Shadow lighting
contract remain unchanged.

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

## 21. Attribute Composition Audit and Production Prompt Architecture

This section records the current attribute surface and the deterministic logic
required to turn user selections into one natural, commercially usable
direction. It is an architecture requirement, not evidence that every rule
below is implemented yet.

### 21.1 Audited sources and current inventory

The audit uses the current runtime sources rather than legacy UI assumptions:

- `attributes/spec/ui-schema.json` defines the field surface;
- `attributes/001-character.json` through
  `attributes/024-fashion-commerce.json` provide 776 enabled option records;
- `server/config/scene-pose-recipes.json` defines compatible Simple-mode
  starting points;
- `web/src/features/studio/studioModePolicy.ts` owns mode visibility;
- `web/src/features/studio/referenceAuthorityPolicy.ts` removes fields owned by
  an attached reference; and
- `server/domain/generation/promptCompiler.js` is the canonical final compiler.

The normalized bundle currently exposes 68 effective fields. `Face > Smile`
exists in the UI schema but has no matching option subcategory and is therefore
not an effective runtime field. Expression is the canonical smile/emotion
control until that stale schema field is either populated or removed.

| Group | Effective attributes |
|---|---|
| Character | Gender, Age, Ethnicity, Beauty |
| Fashion Direction | Fashion Direction |
| Scene Story | Fashion Story |
| Photographic Context | Fashion Photography Context |
| Face | Face Shape, Eyes, Eyebrows, Nose, Lips, Expression |
| Hair | Length, Cut / Style, Texture, Parting / Fringe, Color, Finish |
| Skin | Tone, Skin Texture, Makeup, Freckles |
| Body | Height Impression, Model Build, Body Silhouette, Sheet Layout |
| Clothing | Outfit Base, Primary Color, Secondary Color, Pattern, Material, Outfit Preset, Product Type, Garment Silhouette, Material / Surface, Construction / Detail, Styling |
| Pose | Pose Intent, Fashion Hand Position, Fashion Gaze |
| Environment | Fashion Venue, Set Design, Atmosphere |
| Lighting | Lighting Setup, Contrast, Color Temperature, Shadow Character, Lighting Accent |
| Camera | Brand, Lens, Focal Length, Aperture, Framing, ISO, White Balance, Perspective, Composition, Motion Blur, Camera Imperfections |
| Quality | Resolution, Sharpness, Photorealism, Color Grading, Film Look, Output Frame |
| NSFW | Nudity Level, Sensual Pose |

Current mode projection is:

| Workflow | Effective attribute surface |
|---|---|
| Face Creator | Character, Face, Hair, Skin, Lighting, Camera and Quality |
| Styled Character Sheet | Character, Face, Hair, Skin, Body, Clothing, Camera and Quality |
| Reusable Character Sheet | The same Character Sheet surface except Clothing, because the casting-uniform contract owns clothing |
| Scene Builder | 58 direct fields: Character, Expression, Hair, Skin, Body, Clothing, Pose, Environment, Lighting, Camera and Quality |
| Scene Recipe internals | Fashion Direction, Fashion Story and Fashion Photography Context remain recipe/compiler inputs but are hidden from direct Scene authoring |
| Customer generation | NSFW controls are excluded from the current Studio and Scene UI |

### 21.2 Existing behavior and production gaps

The current system already provides useful foundations:

1. stable option IDs and prompt phrases;
2. mode-specific field visibility;
3. reference authority that suppresses identity or outfit controls owned by an
   uploaded reference;
4. versioned Scene Recipes with `fieldSelections` and `clearFields`;
5. custom color compilation;
6. fixed Headshot and Character Sheet composition contracts;
7. prompt ordering and exact-phrase deduplication; and
8. a small tag-conflict resolver for pairs such as indoor/outdoor, day/night
   and direct gaze/look away.

These mechanisms do not yet form a complete production constraint model:

- conflict tags cannot express pose mechanics, crop boundaries, subject contact
  with architecture, light-source geometry or lens/framing relationships;
- exact-phrase deduplication cannot reconcile two differently worded commands
  that mean opposite things;
- field priority alone cannot decide which instruction owns a body part,
  garment, camera axis or light source;
- recipe fields can be changed later into an incoherent combination unless a
  recipe explicitly clears a known stale field;
- broad options can describe a mood without defining the physical information
  needed to reproduce the preview; and
- the final compiler currently produces prose directly rather than validating
  one normalized semantic plan first.

### 21.3 Canonical semantic ownership

Every selected field must project into exactly one primary semantic section.
This prevents several controls from independently describing the same decision.

| Semantic section | Owning inputs | Required behavior |
|---|---|---|
| Identity | Character, Face, Hair, Skin, Body or identity references | Preserve one recognizable person; reference authority wins over conflicting manual appearance fields |
| Wardrobe | Clothing or Outfit References | Define garment identity, construction, color and styling; an explicit Outfit Reference wins over textual clothing |
| Expression | Expression | May alter emotion and gaze-compatible facial behavior without replacing identity |
| Pose mechanics | Pose Intent, Fashion Hand Position, Fashion Gaze | Resolve head, torso, arms, hands, pelvis, legs, balance, contact points and gaze into one anatomically coherent action |
| Camera geometry | Framing, Perspective, Composition, Focal Length, Lens, Aperture | Resolve camera axis, height, pitch, distance, crop and depth behavior; structured Framing is crop authority |
| Environment | Fashion Venue, Set Design, Atmosphere | Produce one physically plausible location with restrained supporting objects |
| Lighting | Lighting Setup, Contrast, Color Temperature, Shadow Character, Lighting Accent | Produce one motivated source hierarchy with a traceable path, fill ratio and physically related shadows |
| Capture character | Brand, ISO, White Balance, Motion Blur, Camera Imperfections | Describe restrained photographic behavior without overriding geometry or lighting |
| Output finish | Quality fields and aspect ratio | Define output treatment without changing identity, pose, clothing, framing or scene structure |

Authority order for conflicts is:

```text
safety and workflow invariants
  > Template/Reference authority projection
  > selected versioned Recipe invariants
  > explicit user-editable selections
  > compatibility defaults
  > optional fallback prose
```

A lower authority may enrich a higher authority but must not contradict or
replace it. Provider adapters may translate syntax but must not change this
semantic authority order.

### 21.4 Attribute compatibility contract

Attributes need machine-readable relationships in addition to labels, tags and
prompt prose. The eventual schema should support the following concepts without
embedding route-specific conditions in React:

```json
{
  "id": "pose.fashion.soft-character-portrait",
  "semanticRole": "pose_mechanics",
  "contributesTo": ["pose", "crop_boundary"],
  "requires": [
    { "field": "Framing", "oneOf": ["camera.framing_03"] }
  ],
  "compatibleWith": [
    { "field": "Fashion Venue", "family": "portrait_background" }
  ],
  "conflictsWith": [
    { "field": "Motion Blur", "family": "visible_motion" },
    { "field": "Lighting Accent", "family": "colored_effect" }
  ],
  "locks": ["crop_boundary"],
  "fallbacks": {
    "Lighting Setup": "lighting.fashion.soft-character"
  }
}
```

The final property names may change during schema implementation, but the
contract must express:

- prerequisites;
- compatible option families;
- hard conflicts;
- semantic ownership/locks;
- deterministic fallbacks;
- whether a conflict blocks generation, replaces a lower-authority option or
  only raises a warning; and
- provider/model restrictions where the option depends on a capability.

Recipes should declare a coherent baseline and an explicit editable surface.
They must not rely on hidden prose to repair arbitrary combinations after the
fact.

### 21.5 Deterministic production pipeline

The canonical Generation capability remains the single owner. UI routes must
not compose a parallel final prompt. The required pipeline is:

1. **Normalize input**: resolve option IDs, custom values, colors, mode and
   aspect ratio into typed selections.
2. **Apply authority**: remove fields controlled by Template, Character, Face,
   Outfit, Pose or Style References.
3. **Apply recipe baseline**: load the exact recipe version, clear declared
   stale fields and apply its invariant/default selections.
4. **Apply permitted user edits**: accept only fields exposed by the workflow
   or Template version.
5. **Resolve constraints**: evaluate prerequisites, families, semantic locks
   and hard conflicts. Never infer the winner from prose order.
6. **Build a semantic direction plan**: create structured Identity, Wardrobe,
   Expression, Pose, Camera, Environment, Lighting, Capture and Output sections.
7. **Run the Prompt Quality Gate**: block impossible combinations and report
   actionable field-level errors or warnings.
8. **Compile provider-neutral prose**: emit one ordered direction from the
   validated semantic plan and remove semantic duplication.
9. **Apply provider/model adapter**: translate reference ordering, supported
   parameters and model-specific syntax without changing intent.
10. **Freeze execution evidence**: persist recipe version, selected option IDs,
    normalized plan fingerprint, compiler version, provider adapter version and
    final prompt with the Job trace.

Suggested implementation ownership:

```text
attributes/*.json
  option phrases and compatibility metadata

server/config/scene-pose-recipes.json
  versioned coherent recipe baselines

server/domain/generation/
  canonical normalization, constraint resolution, quality gate,
  semantic plan and final compilation

server/providers/
  provider/model request translation only

web/src/features/studio/ and scene-builder/
  selection UX, compatibility feedback and field-level correction actions
```

Focused internal modules may be extracted under Generation, but they remain
behind its canonical application workflow and must not become a second prompt
pipeline.

### 21.6 Prompt Quality Gate

Before estimate lock and queue submission, validation must inspect structured
meaning rather than search the final prose alone.

Blocking checks:

- reference authority or Template policy is violated;
- selected framing contradicts a recipe crop invariant;
- pose requests impossible or mutually exclusive body mechanics;
- hand interaction references an absent garment, prop or surface;
- full-body output lacks complete silhouette safety or produces a portrait-only
  camera combination;
- lighting has no plausible source or requests physically contradictory shadow
  behavior;
- provider/model cannot accept the selected references or output capability;
  or
- required structured sections for the selected recipe are absent.

Warning checks with deterministic repair where safe:

- footwear is unspecified in a full-body fashion image;
- environment includes unnecessary competing props;
- several fields repeat the same aesthetic treatment;
- optical/film effects weaken an identity-first or product-fidelity recipe; or
- a custom field approaches its length/specificity budget.

Validation output must identify the owning field and suggested correction. It
must not silently rewrite a user-owned creative decision when more than one
valid resolution exists.

### 21.7 Production qualification

Each discoverable recipe requires golden-case qualification using fixed
Character, Outfit and provider/model fixtures. Record at minimum:

- identity and body fidelity;
- outfit fidelity;
- pose mechanics and hand correctness;
- camera/crop parity with the preview;
- environment and lighting plausibility;
- commercial polish;
- provider/model, duration, credits and failure code; and
- recipe, semantic-plan, compiler and adapter versions.

Automated tests should validate constraint decisions and compiled semantic
sections. Visual approval remains provider-specific and requires generated
samples; prompt-text assertions alone are insufficient evidence of production
quality.

### 21.8 Optional Luna AI Prompt Director MVP

Requirement
`014-luna-ai-prompt-refinement-provider.md` activates the first controlled
Prompt Director using `gpt-5.6-luna`. The deterministic pipeline must still
produce a valid production prompt without an AI rewrite call.

The Engine & Target Output panel exposes an actor-scoped opt-in toggle only when
the server enables refinement. When enabled, Generate compiles the canonical
prompt first, sends that prompt plus sanitized workflow structure to Luna, then
queues the validated refined prompt. Single and Comparison generation use the
same Generation-owned method; Comparison refines once before its slots fan out.

Luna may improve instruction order, physical relationships, natural language
and photographic realism, but it may not change reference authority, selected
identity, wardrobe, pose intent, framing, environment, lighting or output
constraints. Invalid output, refusal, timeout or provider failure falls back to
the deterministic prompt without failing image generation.

During non-production qualification, `LOG_AI_PROMPT_REFINE=true` may emit the
before/after prompt pair for manual tuning. Production logs must never contain
raw private prompts. Model, latency, status and fingerprints remain traceable.

The MVP accepts the compiled prompt and sanitized context until the semantic
direction plan from Sections 21.3-21.6 is implemented. It must then migrate to
that structure without moving provider calls out of Generation.

### 21.9 Delivery sequence

Implementation should minimize repeated migration work:

1. define and validate compatibility metadata plus semantic-plan schemas;
2. extract the current compiler into normalize, authority, constraint, plan,
   validate and compose stages behind the existing Generation entry point;
3. migrate one recipe at a time, starting with Soft Character Portrait and
   Sunlit Storefront because they expose crop/light conflicts clearly;
4. add field-level UI feedback using server-owned validation results;
5. qualify every discoverable recipe across supported production models; and
6. remove compatibility tag/prose fallbacks only after parity coverage proves
   the structured replacement.

Luna refinement is optional and is not a blocker for deterministic steps 1-6.

## 21.1 Street Walk Editorial reference calibration

The eight-sample calibration documented by
`requirements/015-lab-finetune-prompt/001-street-walk-editorial-calibration-and-promotion.md`
upgrades `Street Walk Editorial` to Recipe version 2 in catalog
`2026-08-professional-8`.

The recipe now treats the central horizontal movement corridor, complete
head-to-foot silhouette and visible ground beneath both pieces of footwear as
hard composition invariants. A real layered city route and physically motivated
directional daylight replace the former generic quiet street and open-shade-only
directions. Hand and gaze behavior remain controlled variations: a real pocket
may be used when present, otherwise the arms swing naturally, and the face may
connect near camera or follow movement without an extreme neck turn.

The recipe must not reintroduce rule-of-thirds placement, generic environmental
portrait framing, invented accessories or a competing background figure. Manual
three-run qualification remains required before the Lab candidate is marked
final.

## 21.2 Catalog v9 Visual Qualification Corrections

Owner visual review on 2026-08-08 accepts `Street Walk Editorial` version 2 for
lighting and pose and accepts `Soft Character Portrait` version 2 for its
evaluated fixture. These results qualify the intended Simple Mode behavior but
do not claim cross-provider parity.

Catalog `2026-08-professional-9` promotes three corrected candidates:

- `Sunlit Storefront` version 3 keeps torso and facial plane within 30 degrees
  of the camera axis, both eyes visible and the garment front readable;
- `Low-angle Campaign Hero` version 2 replaces generic environmental framing,
  a slight low angle and ambiguous Brutalist context with dedicated close hero
  framing, pronounced upward perspective, rising composition and a real
  glass-high-rise district with visible sky; and
- `Color-light Editorial` version 2 requires cyan/blue and magenta/red sources
  to shape the subject's face, skin and garment as well as the set.

These behaviors remain canonical Attribute selections. Simple Mode applies the
qualified bundle, while Pro Mode can select the same individual options. No
parallel prompt compiler or provider path is introduced. Requirement
`../015-lab-finetune-prompt/002-scene-recipe-visual-qualification-and-v9-corrections.md`
owns the evidence and the next three-run visual review gate.

Owner review on 2026-08-08 accepts `Sunlit Storefront` version 3 for the
evaluated fixture. `Low-angle Campaign Hero` version 2 and `Color-light
Editorial` version 2 remain pending visual qualification.

### 21.3 Catalog v10 Hot-versus-cool Color Separation

Owner review on 2026-08-08 accepts `Low-angle Campaign Hero` version 2 for the
MVP, with weaker-run consistency retained as a later optimization item.
`Color-light Editorial` version 2 composes successfully but does not provide
enough chromatic contrast because cyan and magenta can converge into one purple
family.

Catalog `2026-08-professional-10` advances `Color-light Editorial` to version 3.
The Recipe now combines a dedicated matte-charcoal studio, clear atmosphere, a
deep cobalt-blue key and a saturated scarlet-red opposing source. The two color
fields must remain spatially separate across the subject and set with only a
narrow neutral transition. Neutral detail fill remains at least 2.5 stops below
the colored sources. Magenta, violet, purple, pink, pastel and low-saturation
wash outcomes are explicit failures.

The lighting setup, separation accent and studio venue are canonical
Attributes available to Pro Mode. Simple Mode selects the qualified bundle;
it does not introduce another compiler or provider path. Visual acceptance
remains pending three-run owner review with the same Character, Outfit,
provider, model, aspect ratio and resolution.

## 22. Simple Mode Pose Style Modifier

Simple Mode exposes one compact `Pose Style` selector after Scene Direction.
It changes the body-language interpretation of the selected recipe without
replacing its action, crop, camera, lighting, environment, Character identity,
Outfit authority or garment-safety constraints.

The server-owned recipe catalog defines five localized choices:

1. `Auto Match` adds no modifier and preserves the recipe's qualified pose;
2. `Soft & Natural` releases unnecessary joint tension and adds restrained
   human asymmetry;
3. `Clean Minimal` favors quiet geometry and a garment-first silhouette;
4. `Confident Editorial` strengthens plausible pelvis, ribcage, shoulder and
   hand counter-direction; and
5. `Dynamic Fashion` adds one controlled instant of movement with credible
   weight transfer.

The selector uses compact icon cards with stable dimensions, clear selected and
disabled states, theme tokens and responsive wrapping. `Auto Match` is the
default. Styles whose movement or asymmetry conflicts with an e-commerce,
rear-garment, seated or identity-portrait recipe are disabled by catalog
compatibility metadata. Changing to an incompatible recipe clears the modifier
back to Auto rather than retaining a hidden conflicting prompt. Entering
Advanced Mode also clears the Simple modifier so granular Pose controls remain
the only pose authority.

`Pose Style` is a normal structured attribute selection. Existing actor-scoped
Scene draft persistence, Template snapshots and the canonical Generation prompt
compiler therefore carry it without another workflow or storage key. The
modifier is not inferred from ethnicity. Character ethnicity remains identity
data; users may choose any available fashion body language independently.

Acceptance criteria:

- Simple Mode shows all five localized choices and selects Auto initially;
- selecting a compatible style adds exactly one `Pose Style` attribute;
- Auto, Advanced Mode and incompatible recipe transitions remove that attribute;
- recipe-owned pose, hands, gaze, camera and lighting remain intact;
- server catalog validation rejects malformed or duplicate style definitions;
- desktop and mobile layouts contain no clipped or overlapping labels; and
- model, prompt-policy, localization and TypeScript validation pass.

## 23. Recipe-exclusive Lighting Cleanup

Job `job_1786268515117_nr6o25dli` exposed a state transition defect: Street
Walk Editorial correctly selected natural street daylight, but retained
`lighting.accent.hot-cool-separation` from the previously selected Color-light
Editorial recipe. The stale accent reached the final prompt and produced blue
and red light on the subject.

Catalog `2026-08-professional-11` makes ownership explicit. Color-light
Editorial remains the only Simple recipe that sets `Lighting Accent`; every
other Simple recipe declares `Lighting Accent` in `clearFields`. Recipe
versions advance where needed so restored actor-scoped drafts reapply the
cleanup automatically. Regression coverage verifies both the catalog-wide
invariant and the Color-light Editorial to Street Walk transition.

## 24. Personality-led Professional Character Profiles

Catalog `2026-08-professional-12` advances `Soft Character Portrait` to version
3. The setup produces one close professional model Character profile rather
than one fixed softly smiling window portrait. It remains identity-first and
keeps the face and both eyes as the dominant visual anchors, but permits the
active image provider to art-direct one coherent variation within bounded
portrait rules.

When an authorized Character Profile is used, Generation may consume its
server-issued `personalitySummarySnapshot`. The summary is descriptive data,
not an instruction channel. For this Recipe only, Generation projects it into:

- a restrained micro-expression and natural eye energy;
- subtle shoulder, neck and head asymmetry within the close-profile crop;
- one professional portrait-lighting mood; and
- one quiet studio, textured-wall or shallow-depth interior background that
  remains subordinate to the face.

The image provider chooses those nuances dynamically. The deterministic prompt
must not prescribe one fixed smile, fixed camera-left window or fixed plaster
wall. It must still enforce one person shown once, an upper-chest or
shoulder-line crop, margin around all hair, a facial plane within 30 degrees of
camera and no half-body, full-body, multi-view or environmental composition.

Personality may not alter Character identity, age, ethnicity, skin tone, body
proportions, hair identity or wardrobe authority. It may not be literalized as
text, symbols, props, costumes, fantasy effects, caricature or exaggerated
acting. Instructions embedded in personality prose are treated as descriptive
traits and cannot override reference, output or safety authority.

This behavior uses the selected image provider's existing generation call. It
does not add a Text AI request, Credit item, Queue stage, cache or persistence
record. Non-portrait Recipes retain their existing general personality
directive for compatibility.

Manual visual qualification uses the same Character, provider, model, aspect
ratio and resolution with these three personality fixtures:

1. male: `Quietly confident, observant, and warm once comfortable; composed
   rather than stern.`;
2. male: `Energetic, witty, sociable, and optimistic; expressive but polished
   in professional settings.`; and
3. female: `Independent, thoughtful, creatively curious, and gently elegant;
   calm with a subtle sense of humor.`

Acceptance requires a recognizable unchanged Character in all three runs,
close professional profile framing, visible but restrained variation in
expression/light/mood, realistic skin and no invented symbolic prop or costume.

## 25. Manual Verification - Mutable Draft Prompt Reconciliation

Owner verification on 2026-08-11 passed the stale Attribute Prompt scenario.
An actor-scoped Scene Builder draft retained its selected option IDs while the
authoring prompt was automatically refreshed from the current Attribute
Catalog. The user did not need to Reset Form, stale literal prompt text was not
dispatched, and immutable published Template snapshots remained outside this
mutable-draft reconciliation contract.

## 26. MVP Closure Checkpoint (2026-08-15)

Requirement 010 is complete for the current React/local-persistence MVP. The
owner accepted the guided Scene Builder path after implementation and manual
verification of these contracts:

- Simple and Pro mode share one canonical Attribute catalog and Generation
  compiler; recipes do not create a parallel prompt or provider path;
- one-open accordion behavior, relevant-category `Next`, expanded-header focus,
  Custom input limits, Reset Form and actor-scoped draft reconciliation work
  without dropping existing Visual Character controls;
- Character, canonical Face, Outfit and Template reference authority remains
  explicit, and mutable draft prompts reconcile against current catalog text;
- the discoverable professional set covers Architectural Lean, Street Walk
  Editorial v2, Window Shadow Lookbook, Cafe Seated Lifestyle, Soft Character
  Portrait, Sunlit Storefront v3, Low-angle Campaign Hero v2 and Color-light
  Editorial v3;
- full-body margin, footwear fallback, portrait crop precedence, grounded
  sunlight/shadow and recipe-exclusive color-light cleanup are protected by
  prompt-policy regression coverage;
- Scene estimates and Fashion readiness use server-owned Credit contracts;
  preparation is charged once, cache hits are free, insufficient Credit uses
  the shared dialog, and prepared Templates expose no preparation charge;
- Fashion quote presentation separates Generation and Template access Credit;
  accepted Template use sessions retain their pricing snapshot while a new
  session receives the creator's current access price; and
- completed, failed and stale workflows stop their active presentation instead
  of leaving indefinite progress UI.

Recorded owner verification includes the female and male Face -> Character ->
Scene chains, stale Attribute Prompt reconciliation, Fashion readiness review,
Pose Proxy cache reuse, insufficient preparation Credit and Fashion quote
separation. The detailed Credit evidence remains in `.tmp/credit-validation.md`.

The following work is deliberately not a blocker for this closed MVP
requirement:

- repeated cross-provider and Premium Fashion qualification is owned by
  `../014-implementation-commercial-feature-plan/Phase2-19-fashion-routing-qualification-and-promotion.md`;
- durable queue/restart recovery and authorized support repair are owned by
  Phase2-10 and Phase2-18 in the commercial plan;
- PostgreSQL, production authentication, Cloud Storage, payment-backed Credit
  and package economics are owned by Phase2-03 through Phase2-10; and
- the structured semantic Prompt Director architecture in Section 21 remains a
  future quality evolution behind the existing Generation entry point, not a
  reason to reopen the accepted Scene Builder MVP.

No required MVP behavior remains open in this file. A later regression must be
recorded as a new scoped requirement or bug and must preserve these accepted
contracts.
