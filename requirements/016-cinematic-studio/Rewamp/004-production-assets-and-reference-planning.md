# 004 - Production Assets And Reference Planning

## 2026-09-26 Scene Cast Layout Correction

Status: implemented; focused verification passed. Primary: Product Requirement Architect; UX/QA review is
sequential. Scope is Scene Cast and Looks and its shared selector only.
Missing/failed portrait currently removes a grid item and places identity text
inside the narrow image column. Use a stable portrait slot with a familiar person
placeholder for absent/unavailable media, consistent selected-Look previews and
a flexible text column. Keep names/roles readable, align Look selectors and preserve
checkbox selection in other consumers. Use local responsive constraints for one
column in narrow panels and two in wide panels. Preserve save/discard, unavailable
Looks, source labels, disabled/pending/error behavior and reference ownership.

Plan: update existing selector/scoped CSS; extend SceneLooks tests for missing
portrait and preview slots; verify TH/EN long names at 390/820/1440 with no overflow
or identity text squeezed into the thumbnail track. No provider or binding changes.

Evidence: `node scripts/test-cinematic-video.js rewamp-scene-layout-revision`
passed 2 backend and 12 UI tests covering this slice and Chapter validation.
`node scripts/verify-cinematic-story-import.mjs --scene-cast` passed TH/EN at
390/820/1440px with absent and HTTP-failed portraits, stable placeholder slots,
identity track wider than 150px and no horizontal overflow. Screenshots under
`%TEMP%/mpf-story-import-ui-K5XcZj`; representative mobile/desktop inspected.
TypeScript nonincremental check and scoped diff whitespace passed. Existing
selection, save, discard, disabled and unsaved-draft tests remain green.
Only isolated fixtures were used; no paid generation, live data changes or full
suite. Review was sequential, not independent. Provider image quality was not tested.

Status: planned. Owners: Cinematic bindings, Character Profiles, Assets,
Reference Processing and existing Generation entry points.
Depends on [002](002-project-contracts-and-configuration.md) and dossier IDs in [003](003-story-authoring-and-revisions.md).

## 1. Asset Binding Model

Project Assets is a bounded read projection over existing owned records, not a
second media store. Categories: Characters/Expressions, Environments, Props,
First Frames, Clips and Final outputs. Filter at the source before pagination.
The Look chooser must never include unrelated Scene/category images.

Each binding records role, root scope, Character/location/prop identity where
applicable, immutable Asset ID/version, source lineage and selection status.
Share root-level bindings across Chapters; explicitly override by Shot, Scene or
Chapter. Resolve exact IDs, never filename or latest-image similarity.

Media generation/browse/import uses existing authority validation and category
rules. Generated source eligibility follows configured providers and available
local originals. Do not reintroduce a blanket 30-day image-age lock; unavailable
transport, ownership and actual provider restrictions remain meaningful checks.

## 2. Character Looks

After Full Story confirmation, offer Revise Character, Select Existing Look,
Generate Look Sheet and Generate Expressions. Display the confirmed story/dossier
version used; warn when a changed Character needs review. Existing Profiles remain
reusable; a project-local generated Look does not force reusable Profile creation.

One named main/identity-bound Character has one explicit Look per visible Shot.
The Look controls face, authored apparent age, hair, proportions and wardrobe.
Multiple outfit Looks are allowed; inheritance resolves one unambiguous selection.

Background/supporting Characters may remain text-only. Recommend a Look if the
same role appears or speaks repeatedly, especially when visually important. The
recommendation is optional; user promotion to a main/identity-bound role makes the
normal main-Character binding rule apply. Do not silently promote a role because
the script uses its name twice.

## 3. Expression Sheet And Deterministic Crops

Generate one Character-bound 3-column x 4-row sheet with 12 configured slot IDs:
neutral, smile, shy, playful, serious, concerned, surprised, afraid, sad, teary,
angry and vulnerable. Slot names, intensity and normalized crop bounds belong in
the asset policy; UI labels belong in locale catalogs.

1. Generate through existing image workflow with the Character's approved Look.
2. Store the original sheet as an immutable parent Asset with Character/Look ID,
   template version and grid metadata.
3. Preview all slots. Deterministic cropping uses normalized rectangles excluding
   labels/gutters, via the existing Assets image-processing/export infrastructure.
4. A generated sheet may not follow the grid perfectly. Allow the user to adjust
   crop rectangles; do not assume template instructions prove crop correctness.
5. Store selected derivatives with parent ID/hash, slot ID, bounds and transform
   version; repeated requests for the same source/rectangle reuse the derivative.
6. Uploaded sheets need explicit Character binding and slot/crop mapping. Do not
   classify arbitrary faces automatically as a known Character.

Cropping invokes no Generative AI and no image-generation Credits. Derivative
processing must stay behind Assets with bounded image memory and ownership checks;
do not introduce a second image service if the existing processor is sufficient.

Recommend Expression only when framing, face visibility and emotion make it useful.
Use the start emotion for stills; video keeps its authored temporal emotional arc.
Missing Expression never blocks a valid Shot. Expression cannot replace identity.

## 4. Environment Pack: One Required Starting View, Optional More

One selected master environment image is sufficient when environment referencing
is enabled; the entire environment feature remains optional. Store a logical pack
with one or more individual views. A contact sheet may be a parent/source asset or
UI preview, but is not the default provider payload.

| View | Use | Default creation |
|---|---|---|
| Master establishing | Location geometry, exits/entrances, overall light | First selected/generated view |
| Primary action | Main performance area | Add only when needed |
| Reverse | Opposite camera direction/coverage | Add when planned Shots need it |
| Detail | Door, table or story-critical area | Optional |

Each view records view ID, master relationship, camera heading/position when known,
spatial anchors and environment-state ID. Day/night/weather are separate states
of a location, not unrelated location duplicates. Reuse is by explicit binding.

Prepare additional-view prompts from the approved master, floor/spatial notes and
the needed camera view; paid generation is explicit. Review consistent doors,
curb/road geometry, furniture and light before selecting the view. Multi-view AI
images do not constitute verified 3D geometry and may still drift.

Shot preparation suggests the closest approved view by scene state and camera
intent, displays it, and permits replacement/OFF. If no suitable reverse view
exists, propose its creation or use text direction; never invent an unseen approved
view. Bind only necessary view images, usually one, preserving reference capacity.

This is an engineering recommendation, not a provider promise: reference capacity
varies by model and mode. Technical background reviewed 2026-09-19:
[BytePlus multimodal inputs](https://docs.byteplus.com/en/docs/Byteplus_LAS/video_gen_enhanced)
and [Google reference-image guidance](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation).
Runtime catalogs remain authoritative for Momelo's actual adapter/account.

## 5. Hero Props

Create assets for objects important to the main story and repeatedly shown/handled,
such as the period story key, chest or jewel. Ordinary background decoration can
remain text. Store prop ID, physical description, scale/material, state variants
(closed/open, dry/wet, intact/broken) and approved images. Shot use records holder,
hand/contact, location and state so the same object does not reset between shots.

Resolve an explicitly required visual Prop after Character identities and before
optional Expression/Environment. This inserts story-critical Props into the
confirmed priority without lowering Character authority. For slots that cannot
fit a required Prop, offer baking it into the chosen composition, model change or
Shot split. Optional props use text and a visible omitted-reference notice.

## 6. Reference Plan

Preserve confirmed relative order: selected composition/First Frame, Character
Looks, Expression, Environment. Required Hero Props use the insertion rule above.
For direct video the composition slot is absent; number references contiguously.
First Frame image generation has no imaginary opening-frame reference: attach
Looks and only the actual selected scene/continuity/expression/prop assets.

Resolve visible main Looks in order: Shot override > Scene > Chapter > Project.
Each assigned image has one explicit semantic purpose. Reference Processing owns
adapter order, limits and final manifest; Cinematic supplies intent and bindings.

When capacity is exceeded:

1. Preserve required identity bindings and selected composition intent.
2. Propose omitting optional Expression/Environment image inputs, carrying their
   direction in text or an already prepared First Frame. Show actual attachment
   changes before quote/submit; do not silently delete selected assets.
3. If required inputs still exceed capacity, explain which role cannot fit and
   offer a compatible mode/model, prepared First Frame or Shot split.
4. Baking direction into a new image is a separate explicit generation action.
   It cannot be claimed as done merely because a prompt mentions the direction.
5. Submit exact manifest/order/count from the quote; never drop rejected images
   and automatically resubmit an altered request.

No-face stills use faceless or white-previs settings. Video restores complete
faces from each person's own Look and does not preserve mask/sketch treatment.
This is requested behavior whose actual quality still needs manual qualification.

## 7. Acceptance

- A01: Root asset reuse and Chapter/Scene/Shot overrides resolve deterministic IDs;
  category filtering and actor isolation hold before pagination.
- A02: Main Looks attach only for visible people; optional recurring extras and
  off-screen speakers do not cause unnecessary reference locks.
- A03: Twelve-slot parent/child lineage, crop edits and repeat reuse work without
  paid image calls; a bad crop can be corrected without regenerating the sheet.
- A04: One environment view works alone; optional additional views and day/night
  states can be selected/OFF without deleting images or changing another Scene.
- A05: Hero Prop state/holder/contact survives preparation and cross-shot handoff.
- A06: Capacity fallbacks are visible, keep identity authority and match quote/
  submit payload; direct-video reference numbering has no missing slot 1.

## 8. Character Look To Scene/Shot Delivery (2026-09-25)

Status: implementing; no paid generation or live-data migration in verification.
Primary: Product Requirement Architect. Reviewers: UX/UI Product Designer and QA.
Capability: Cinematic bindings via CinematicApplicationService; Character Profiles
continues owning approved Look versions, upload/review and generation planning.

### Scope And UX

- Extend only Character Look controls, Scene Look selection and Shot reference
  inspection. Preserve story/voice/revision controls, First Frame, Engine, Takes,
  Render and Queue. No new advanced mode or duplicate provider workflow.
- Character offers upload a complete Look Sheet, generate a Look from the selected
  Character, and reuse an existing approved Look. Use the existing CharacterLookDialog
  and Character Profile authority, rights confirmation and review lifecycle. A text
  dossier without visual identity offers the existing Character-library chooser
  first; do not invent or silently attach an unrelated face.
- Character Looks belong to the shared story Character. A Chapter/Scene selection
  pins the selected approved version; changing a default never overwrites existing
  Scene selections or previous media. Newly selecting one Look must not ambiguously
  attach all Looks of the same Character.
- Scene shows one compact Character row with selected Look thumbnail/name and a
  selector. Shot inherits these selections; visible Character filtering excludes
  off-screen-only speakers from face references. Existing explicit Shot selections
  remain respected and are labelled as overrides rather than silently replaced.
- Shot and First Frame reference inspection identify Character, Look, uploaded /
  generated / library source and Scene/Shot inheritance. Final numbered references
  must describe the actual preparation manifest, not a second guessed array.
- Missing Look and stale/unavailable references stay actionable and explicit.
  Keep provider count/authority validation; never silently omit selected references.
- New controls are localized TH/EN, keyboard accessible and usable at 390/820/1440px.
  Do not squeeze long Thai Character/Look names into the action column. Collapse
  secondary Look tools; display the selected thumbnail and status without expansion.

### Creative Style Option

Look generation offers realistic (default), semi-realistic and illustration as
creative rendering presets. Preset prompt instructions are configured, not UI
provider tables. New Looks/versions preserve the original identity/source; uploading
a sheet does not silently transform it. No automatic style fallback on rejection.
Do not claim a measurable five-percent transformation, add shadow to hide identity,
or promise moderation acceptance. Final Video style remains independently authored.

### Ordered Tasks And Acceptance

| Task | Work | Focused evidence | Status |
|---|---|---|---|
| LR01 | Reuse shared approved-Look binding and add versioned Scene selection | ownership/version/invalid Look/old media tests | implemented; focused checks passed |
| LR02 | Character upload/generate/reuse UI and configured creative styles | existing Look contract + targeted UI checks | implemented; focused checks passed |
| LR03 | Scene selectors and Shot/reference provenance | inheritance/visible filtering/actual manifest checks | implemented; focused checks passed |
| LR04 | UX/QA review and responsive isolated browser checks | 390/820/1440 + typecheck; no paid jobs | scoped checks passed; live provider UAT remains separate |

Extend the existing cinematic focused runner with a selectable look-reference group.
Run only this group and directly affected Character Look tests; the aggregate suite
is a later explicit UAT gate. Record exact commands, evidence and remaining gaps
below. No new runtime storage directory, pricing or provider dispatch is introduced.

UX review: independent UX/UI agent inspected the current components and recommended
a Look disclosure under each Character, an existing SceneCastLookSelector before
Environment, and actual selected-Look metadata in Shot rather than portrait-based
readiness. This changes only those sections. New CinematicCharacterLooks and
CinematicSceneLooks are focused feature components; existing CharacterLookDialog,
media/Buttons, Scene selector, preparation and Render contracts are reused.
QA independently reviewed identity replacement, version binding and dirty
Scene drafts; findings and fixes are recorded below. Character Profiles implementation was delegated as a focused owner,
not an additional product/reviewer role. Primary plus UX/QA reviewer routing stays
unchanged. Skills: review-product-ux, review-generative-media-pipeline and
verify-release-regressions; Generation dispatch and billing are not modified.

Character list data reuses the actor/Profile/version-scoped `character-looks`
TanStack Query key, 30-second freshness, no polling. Expand loads the existing
owner-filtered Profile list, explicit refresh or save invalidates it. Project mutations
refresh the actor-scoped root/current Chapter projection. No new media cache or
browser-persisted image buffers are introduced.
The pre-existing Profile Look list has no cursor/page contract; large-library
pagination remains a Character Profiles owner followup, not a new Cinematic cache.

### Integrated Delivery And Evidence

- Shared Look tools: `web/src/features/cinematic/components/CinematicCharacterLooks.tsx`
  (new), embedded by `CinematicSharedCharactersPanel.tsx`. Uses existing Profile
  complete-sheet upload, generation, review/approval and wardrobe suggestion.
  Text-only dossiers require explicit Character-library selection first; this
  slice does not silently create Profiles or turn prose into a face.
- Scene selection: `CinematicSceneLooks.tsx` (new), existing
  `authoring/SceneCastLookSelector.tsx`, `CinematicSceneOverview.tsx` and
  `api/cinematicSeriesApi.ts`. PATCH `/scenes/:sceneId/looks` checks project/Scene
  versions, membership, one approved Look per Character and owned generated sheets.
  Draft selections survive unrelated Scene prose saves. Navigation, generation and
  proposal Apply cannot discard a pending selection; local discard makes no request.
- Shot/reference presentation: `CinematicShotWriter.tsx`,
  `storyboardGenerationAdapter.ts`, `StoryboardShotDialog.tsx`,
  `produce/ProduceVideoReferences.tsx`, `schemas/cinematicSchemas.ts`, scoped
  `web/src/styles/cinematic.css`, and TH/EN cinematic catalogs. First Frame maps
  actual prepared slots; Video labels/order come from the existing quote manifest.
  Historical Take snapshots are not reconstructed from current Character settings.
- Binding/projection owner: `CinematicApplicationService.js`,
  `CinematicSeriesService.js`, `CinematicVideoReferencePlanService.js` and existing
  `cinematicRoutes.js`. Immutable version-specific binding IDs are also used by the
  existing CastStage consumer. Identity replacement clears incompatible current
  bindings/approvals and marks affected production for review while retaining media
  history. Binding, Scene, First Frame and Video preparation reject mismatched
  Character identity versions. A portrait alone is not a selected Look.
- Profile style owner: existing `CharacterLookService.js`,
  `CharacterLookRepository.js`, Profile API/schemas/dialogs and new
  `server/config/prompt-recipes/character-looks/look-sheet.v3.json`. The optional
  `generationStyle` field uses existing Character Look version storage. No runtime
  paths or files moved; no provider dispatch, price or Credit lifecycle changed.
- Focused tests: new `test/cinematicLookReferences.test.js`,
  `CinematicCharacterLooks.test.tsx`, `CinematicSceneLooks.test.tsx`, and extensions
  of the nearest existing Scene/Shot/reference/Profile tests.

Final validation, 2026-09-25:

1. `node scripts/test-cinematic-video.js rewamp-look-references`: 48 backend and
   63 frontend checks passed in 8.8 seconds. Includes actor/version rejection,
   generated-sheet compatibility, immutable old media, source lineage, style
   preservation, draft recovery and existing First Frame controls. Registered in
   the explicit `rewamp-all` aggregate; aggregate was not run.
2. From `web`: `node ../node_modules/vitest/vitest.mjs run --configLoader runner src/features/cinematic/components/CinematicUxPrototype.test.tsx -t "Look|look"`:
   6 existing Look workflow checks passed; 53 unrelated tests skipped.
3. From `web`: `node ../node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`:
   passed. Scoped `git diff --check` passed. New EN/TH catalog keys and interpolation
   variables are paired.
4. `node scripts/verify-cinematic-shot-workspace.mjs --looks`: isolated browser
   checks passed for Character/Scene/Shot and style dialog, TH/EN at 390/820/1440.
   Uses existing Vite (default localhost:6502, configurable CINEMATIC_WEB_ORIGIN),
   mocks API/media, writes only temporary screenshots, invokes no paid generation.
   Final artifacts: `%TEMP%/mpf-shot-workspace-MWzVwp`. Thumbnails loaded, no page
   overflow; actual screenshots inspected. UX Agent independently reviewed nine
   screenshots; its collapsed-preview finding was fixed and visually rechecked.
5. Independent QA closed all scoped findings after identity replacement/version
   guards, null-version review availability, preservation across prose saves and
   pending Scene-proposal Apply protection were fixed and covered.

Remaining UAT: real uploaded/generated image quality, provider acceptance and
photorealistic video identity retention require explicit user generation. No paid
job, live Project mutation or worker restart was performed. Full Render layout,
all theme combinations and whole-project regressions were not rerun; only scoped
new controls and protected adjacent Look/First Frame paths were checked. Creative
style selection does not guarantee policy acceptance or a numeric cartoon ratio.

### LR02 Character Profiles Implementation Packet

Scope: only Character Look service/repository/API/schema, source and Generation
dialogs, Look prompt configuration and focused Profile tests. Cinematic bindings,
caller integration, CSS and locale catalogs remain with their respective owners.
Primary Product Requirement Architect; sequential UX/QA review (not independent).
Skills: review-product-ux, review-generative-media-pipeline, verify-release-regressions.

1. Add optional generationStyle (realistic default, semi_realistic, illustration)
   to draft creation and persist it on new generation-source versions. Reject
   unknown presets. Complete-sheet uploads/imports do not transform their media.
2. Compile through CharacterLookService.getGenerationPlan using configured style
   instructions with no conflicting photorealistic base text. Preserve legacy
   recipe compatibility, source identity, owned references and explicit review.
   Include the preset in plan source lineage and validate it during adoption.
3. Reuse the source dialog for selection before creating a new Look; show the
   pinned choice in Generation. Add initialUploadKind with garment default and
   sheet opt-in. Do not update an existing Look/version when selecting a style.
4. Run focused backend and UI/schema checks only; preserve rights confirmation,
   upload/review, old records, actor checks, immutable sources and shared Generation.

Checks (installed root/web dependencies; isolated temp data and mocked APIs):
`node --test test/characterLookService.test.js` and
`npm.cmd --prefix web run test -- --configLoader runner src/features/profiles/components/CharacterLookDialog.test.tsx src/features/profiles/schemas/characterLookSchemas.test.ts src/features/profiles/routes/CharacterProfileRoute.test.tsx`.
No paid jobs or live mutations. Existing runner integration and responsive
390/820/1440 checks remain LR04 integration gates; locale keys are handed to the
catalog owner, not edited in this slice. Status: Profile implementation and focused
automated checks passed; LR02 integration/visual completion remains open.

Evidence (2026-09-25): 17 backend and 29 Profile frontend tests passed. Backend
checks include the existing final Generation compiler, configured styles, invalid
presets, actor isolation, original approved Look preservation, idempotent replay,
legacy pending-result adoption and mismatched-style rejection. UI checks cover
keyboard preset selection, sheet opt-in/reopening, unchanged default garment flow,
upload rights/review/approval, pinned Generation style and adjacent Profile actions.
Scoped diff whitespace check passed. Review was sequential, not independent.

Contract: draft POST accepts optional generationStyle; Look version and generation
plan/source expose it. Version wire schema remains optional for legacy UI fixtures;
server projections/defaults resolve missing style to realistic without writing old
records. New generation-source versions use look-sheet.v3.json; old versions retain
the unchanged v2 recipe and fingerprint. Sheet upload/import bytes are unchanged.
No routes, runtime data paths, dispatch, Credits, CSS or locale catalogs changed.

Catalog handoff, cinematic namespace under cinematic.lookDraft:
generationStyle = Rendering style; generationStyles.realistic = Realistic;
generationStyles.semi_realistic = Semi-realistic;
generationStyles.illustration = Illustration. EN/TH integration belongs to the
catalog owner. 390/820/1440 browser checks, full application typecheck and actual
provider image-quality qualification were not performed in this Profile-only run.

## 9. Portrait Editorial Look Sheet (2026-09-25)

Owner: Character Profiles, extending LR02 through its existing generation-plan and
review contracts. Primary: Product Requirement Architect; media-pipeline review
applied sequentially, QA checks the scoped implementation. Skills:
review-generative-media-pipeline, implement-generation-workflow and
verify-release-regressions. No authoring-screen redesign is needed.

### Design And Scope

- New generated Looks default to one clean vertical 9:16 sheet. A large front
  full-body view occupies the left; smaller side/back full-body views are stacked
  on the right. A lower band holds a clear face portrait and a separate accessory
  product-detail area. Use consistent white/cool-light-gray background, aligned
  margins, restrained contact shadows and whitespace, not decorative panel cards.
- Exactly one identity/outfit shown from three directions; the approved identity
  and wardrobe remain authoritative. Keep all heads, hands, footwear and hems
  inside their assigned bounds. Rendering presets remain supported independently.
- Accessory details depict only items actually specified or visibly authorized in
  wardrobe references, consistent with the worn items. No invented bags/jewelry,
  decorative props or duplicated objects. With no accessories, leave that region
  clean; do not invent filler. No generated labels, typography, logos or watermarks.
- Crop coordinates and output aspect ratio belong to the new versioned prompt
  recipe. Preserve old square v2/v3 recipes/fingerprints and manifests for existing
  source-ready Looks and pending results. Do not mutate uploads, approved sheets,
  historical jobs or pinned Scene/Shot references.

### Ordered Tasks

1. LS01: Add `server/config/prompt-recipes/character-looks/look-sheet.v4.json`
   under the existing recipe owner, with design instructions, style presets,
   9:16 output and normalized front/side/back/face crop regions.
2. LS02: Pin the recipe version on new generation-source Look versions through
   CharacterLookService/CharacterLookRepository. Plan output and adopted crop
   manifest come from that pinned recipe; preserve legacy fallback and explicit
   review. Existing GenerationExperience already passes plan.output.aspectRatio
   to its fixed-aspect-ratio control; reuse it without a second dispatch path.
3. LS03: Verify new plan ratio, prompt/accessory constraints, non-overlapping crops,
   actual adoption, immutable old v2/v3 pending-result compatibility and compiler
   ratio parity. Extend the existing focused runner. No paid generation implicit.

Acceptance is split: deterministic contract checks versus visual quality of the
next user-generated image. Prompt-based layout is not a pixel-exact guarantee;
the user still reviews the generated sheet. No automatic regeneration, changed
pricing, new upload transformation or face/wardrobe/reference ownership is allowed.

Status: LS01/LS02 implemented; LS03 focused automated checks passed. Existing drafts
retain their original layout; create a new Look to use the new portrait template.
No runtime path or API route is added. The optional internal
`versions[].generationRecipeVersion` is persisted in the existing Look repository;
uploaded sheets and pre-existing records are not rewritten.

Focused evidence: `node scripts/test-cinematic-video.js rewamp-look-template`
passed 19 Character Look backend tests and 19 existing Profile dialog tests in
7.9 seconds. This includes v2/v3 pending adoption, recipe fingerprint matching,
new normalized crop bounds/non-overlap, explicit review, all rendering presets,
9:16 compiler output and forwarding the fixed ratio to shared GenerationExperience.
The group participates in the later explicit `rewamp-all` aggregate; that aggregate
was not run. Scoped `git diff --check` passed.

Files: new `server/config/prompt-recipes/character-looks/look-sheet.v4.json`;
updated `server/domain/character-profiles/CharacterLookService.js`,
`server/repositories/character-profiles/CharacterLookRepository.js`,
`test/characterLookService.test.js`,
`web/src/features/profiles/components/CharacterLookDialog.test.tsx`,
`scripts/test-cinematic-video.js`, this requirement and the architecture master.
No UI source/layout, providers, Credits, reference-count rules or uploaded image
bytes changed. No files moved, paid request made or backend restarted. Human
visual quality remains unverified until an actual new sheet is generated; automated
tests do not prove the provider will follow layout or accessory instructions exactly.
Independent QA reran all 38 focused checks and found no scoped functional or binding
regression. Residual test gap: legacy adoption fixtures obtain fingerprints from
the preserved v2/v3 files, rather than frozen historical result snapshots; future
recipe retirement should add frozen snapshots before any compatibility removal.

### LS04: Resume Existing Look In Portrait Generation

User feedback found an existing source-ready styled Look without a recipe-version
pin. Returning its legacy plan kept Generate Character Look Sheet at 1:1. This
supersedes the instruction above to create a new Look for the portrait template.

1. Every newly requested generation plan for an eligible source-ready Look uses
   current v4 prompt, ratio and layout, including legacy v2/v3 drafts. Do not rewrite
   the old source record or dispatch a job while opening the modal.
2. Preserve adoption of previously generated square candidates: validate their
   snapshot against that source version's historical recipe. V4 candidates use
   v4 crops; legacy candidates use their original crops. A new v4-pinned draft
   must not accept a forged legacy recipe. Retain ownership, source identity,
   exact fingerprint and explicit review checks.
3. Reopening Generation refreshes the plan through the existing API instead of
   reusing stale dialog-local state. Keep existing result/history and no paid
   replay. Engine dimensions reflect the fixed ratio even before stored engine
   preferences finish updating.
4. Focused checks: existing draft -> new 9:16 plan -> modal reopen; adoption of old
   and new candidates; real engine fixed-ratio display. No full suite/paid request.

Owner/roles remain as above; scoped Profile, Generation presentation and QA review.
Status: implemented; focused verification passed. No runtime mutation or new API.

Evidence: read-only inspection found the latest source-ready Look was a styled
record without `generationRecipeVersion`, selecting the old square recipe. The
new-plan path now returns v4 without changing that record; result adoption chooses
the verified historical/current snapshot and its corresponding crop manifest.

- `node scripts/test-cinematic-video.js rewamp-look-template`: 20 backend plus
  30 UI tests passed. Coverage includes old draft/new plan, v2/v3 candidate adoption,
  v4 candidate adoption on old drafts, invalid fingerprint/legacy-on-new rejection,
  modal resume refreshing the API plan and actual EngineTargetPanel dimensions.
- `node scripts/verify-cinematic-shot-workspace.mjs --look-ratio`: isolated actual
  EngineTargetPanel at 390/820/1440 in TH/EN, deliberately keeping stored selection
  at 1:1 with fixed 9:16. Portrait dimensions/selected label verified, no overflow;
  screenshots `%TEMP%/mpf-shot-workspace-YvTEvl` inspected. This is a component
  fixture, not a claim of live provider generation or full-modal end-to-end UAT.
- Final EngineTargetPanel focused rerun: 10 passed; scoped diff whitespace passed.

Changed: CharacterLookService, CharacterLookDialog, EngineTargetPanel and their
existing tests, the focused runner/browser script, this requirement and architecture
master. No new files, stored images, jobs, credits or provider settings changed.
The backend must load the updated code; refresh the page/reopen Generation afterward.
Completed square images remain square; the next explicit Generate uses the new plan.
Independent scoped QA code review found no actionable regression/security finding.
Selected-ratio styling is additionally asserted by the post-change browser check;
the QA reviewer did not independently rerun the automated checks.
