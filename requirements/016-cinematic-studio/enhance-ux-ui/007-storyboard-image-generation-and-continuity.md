# 007 Storyboard Image Generation And Continuity

**Status:** Checkpoints A-B implemented; live provider and responsive visual
qualification remain open  
**Owners:** Cinematic orchestration, Generation execution, Credits pricing,
References authority and Assets approval  
**Depends on:** 005-006

## 1. Outcome

Make Storyboard still generation operational through the canonical Image
Generation lifecycle. Cinematic must not call a provider, Queue repository or
Credit repository directly. Reuse the shared `GenerationExperience`,
`EngineTargetPanel`, estimate, submit, Job/Group polling, result, viewer,
insufficient-Credit and terminal-state components through a Cinematic adapter.

## 2. Single-Shot request

The adapter compiles one provider-independent draft from the approved Story
Plan and selected Shot:

- generation mode `scene`, surface `cinematic`;
- Project/Story Plan/Scene/Shot stable IDs and versions as lineage;
- Shot prompt plus Scene purpose, location, time, blocking, lighting,
  performance, framing, camera and negative continuity constraints;
- authorized Character Profile context;
- authorized Character Look references;
- fixed Project aspect ratio and selected qualified image provider/model;
- output count and effective reference count used by both estimate and submit.

Checkpoint A supports one primary Character authority per generated image.
Shots requiring more Character identities than the active provider can preserve
must be blocked with an explicit qualification message; identities must never
be silently dropped.

## 3. Continuity policy

- The first Shot has no previous-Storyboard reference.
- A later Shot may use only the immediately preceding **approved, current**
  Storyboard source when Scene/time/location/Look continuity applies and the
  provider supports the resulting reference count.
- A new Scene does not inherit the prior image unless transition and continuity
  metadata explicitly require it.
- Canonical Character and Look authority outrank the previous frame.
- Never use an unapproved/latest attempt as continuity authority.
- If adding the previous frame exceeds provider limits, block or require the
  owner to disable continuity; never remove identity/wardrobe silently.

## 4. Result and approval

Generation completion does not auto-approve. The result viewer adds `Use as
Storyboard source`, which calls the existing idempotent Cinematic approval
endpoint with Project/Shot versions and Job ID. Approval stores the immutable
Asset version/fingerprint and refreshes the Project. Re-generation leaves the
current approved source intact until another result is explicitly approved.

The Shot modal must expose the current server-compiled Storyboard prompt as a
read-only preview. `Additional Shot direction` remains the only editable prompt
input and must be saved before the server recompiles the contract. The preview
must participate in the shared Generation `Go to Prompt` navigation, support
copying, and must not permit a browser-side final prompt override. Its
description must identify `Additional Shot direction` and `Save direction` as
the safe path for changing the next generated image.

The approval command is the primary post-generation action. It must use the
brand primary treatment, a Check icon, clear helper text explaining that Save
Direction does not approve media, and a stable action position. Save Direction
persists prompt/direction only. Closing without approval must not imply that the
generated attempt became the Storyboard source.

## 5. Credits and lifecycle

- Display the canonical exact estimate for the exact provider/model,
  resolution, aspect ratio, output count and effective references.
- Reserve before Queue visibility; capture/refund remains Generation/Credits
  owned and durable across navigation/restart.
- A changed prompt, source, model, output count or reference plan invalidates
  the displayed estimate.
- Insufficient Credit uses the shared dialog.

## 6. Auto Generate checkpoint B

Auto Generate is a durable server-owned batch of eligible Shots, not a browser
loop. Before confirmation show per-Shot quote, total, dependencies, blocked and
already-approved Shots. Independent Shots may run concurrently; continuity
chains run sequentially. Each Shot has its own reservation/idempotency and
terminal settlement so partial failure refunds only failed work.

### 6.1 Scope and selection

- One invocation targets every unapproved eligible Shot in the current Project.
- The dialog reports both Scene count and Shot count; generation is one image
  per eligible Shot, not one image per Scene.
- One provider/model/resolution/aspect-ratio contract applies to the full batch.
- Comparison and multiple provider selection are unavailable.
- Already-approved Shots are skipped by default and listed separately.
- Blocked Shots remain visible with a stable reason and are never submitted.

### 6.2 Quote and confirmation

- Resolve actor-authorized Character, Look and approved continuity references
  for every Shot before quoting.
- Produce one immutable canonical estimate per eligible Shot and sum only those
  estimates into the displayed total.
- Show available Credits, affordability, quote expiry and the number of queued
  Jobs before confirmation.
- Any provider/model/reference/Project-version change invalidates the complete
  quote.

### 6.3 Durable submission

- The browser submits one batch command with locked child estimate IDs and one
  idempotency key.
- The server validates current Project/Scene/Shot authority again and records
  the batch before enqueueing children.
- Before any child is enqueued, Cinematic records one pending Storyboard attempt
  for every child Job ID, including immutable batch, Scene and Shot lineage.
  A Project refresh or browser restart must therefore recover the same Job
  without relying on browser-local route pointers.
- Every child enters the canonical Generation application service and Queue;
  Cinematic must not dispatch providers or mutate Credits directly.
- The response identifies the batch and accepted/blocked/failed children.
- Job Center remains the durable progress surface after navigation.
- Storyboard cards and the Shot dialog poll those persisted Job IDs through the
  shared Generation status contract. A completed, unapproved output is shown as
  a review candidate; it must not be presented as the approved Storyboard
  source until the owner explicitly approves it.
- A later continuity-dependent Shot may use only an approved predecessor. The
  batch must not silently use an unapproved output as continuity authority.

### 6.4 Provider capability visibility

All configured image providers are sourced from the shared public provider
catalog. A provider may remain visible but unavailable for the current batch
when it is unpriced, unqualified, lacks the Project aspect ratio, or cannot
carry required Character/Look/continuity references. The UI must explain the
reason and must never remove references to make a provider fit.

## 7. Implementation order

1. Add `cinematic` as a supported shared generation surface and preserve other
   surfaces unchanged.
2. Build pure Cinematic prompt/reference/continuity adapter tests.
3. Mount shared Generation UI inside `StoryboardShotDialog`.
4. Wire completion review and explicit Storyboard-source approval.
5. Add Job Center resume metadata and durable Cinematic lineage where the
   current generic contract lacks it.
6. Qualify fixed single-Character Shots on each exposed provider.
7. Implement durable batch quote/submit/status through Generation and Job
   Center without a browser submission loop.

## 8. Regression gates

- Playground, Studio, Fashion, Comparison and normal History generation remain
  unchanged.
- estimate/submit reference parity, actor isolation, idempotency and terminal
  polling tests pass.
- Story Plan edits correctly mark affected approved Storyboard sources stale.
- Manual prompt save/reorder/approval remain operational.
- A completed Generate All batch restores previews in every bound Shot after
  refresh/restart, while keeping all generated candidates unapproved.
- Repairing lineage from an older completed batch never submits Generation,
  reserves Credits or changes an already-approved source.

## 9. Implementation record (2026-08-30)

- [x] Added `cinematic` to the shared Image Generation surface contract.
- [x] Reused `GenerationExperience` and therefore the canonical provider
  catalog, Engine & Target Output, exact estimate, Credit reservation,
  submit, polling, result, viewer and error handling.
- [x] Scoped durable browser Job pointers by actor, Project and Shot.
- [x] Added an actor-authorized Storyboard generation-context endpoint that
  resolves only owned Character Look Assets and the immediately preceding
  approved Shot source.
- [x] Fixed generation to the Project aspect ratio and one output authority
  contract while retaining provider/model selection.
- [x] Blocks unready identity, unlocked/unavailable Look media and unqualified
  multi-Character Shots rather than silently removing references.
- [x] Keeps generated results separate from the approved Storyboard source and
  uses the existing idempotent approval endpoint.
- [x] Added server, schema, scoped-persistence and Cinematic UI regression
  tests; Playground, Studio, Fashion and Produce contracts were not replaced.
- [ ] Run one paid/live single-Character Shot through estimate, generation,
  navigation/restart recovery, review and approval for each exposed provider.
- [x] Make the Storyboard approval action visually dominant and explain the
  distinction between saving direction and approving media.
- [x] Implement Checkpoint B as a server-owned batch with per-Shot estimate,
  reservation, idempotency and settlement.
- [x] Surface every configured image provider consistently while preserving
  pricing, qualification and reference capability gates.

## 10. Checkpoint B implementation record (2026-08-30)

- [x] Added one Generate All dialog using the shared Engine & Target Output
  component with one provider/model and one output per eligible Shot.
- [x] Quotes every eligible Shot through the canonical Credit estimate endpoint
  and shows Scene count, Shot count, approved skips, blocked work, available
  Credits and the exact aggregate before confirmation.
- [x] Added one server-owned heterogeneous Generation Group command. The group
  and child Job IDs are persisted before enqueue; every child re-enters
  GenerationApplicationService, reserves independently and appears in Queue
  and Job Center.
- [x] Revalidates Project version, Shot version, Character authority, Look and
  continuity references, fixed aspect ratio and one-engine parity at submit.
- [x] Added idempotent batch replay and duplicate-Shot guards.
- [x] Made Storyboard source approval the dominant generated-result action and
  clarified that Save Direction changes only prompt/direction.
- [x] Added catalog-visible/unavailable provider state. Meta Muse now appears
  consistently when configured but remains dispatch-disabled because pricing,
  general qualification, Fashion qualification and reference support are not
  yet approved.
- [x] Server focused regression: 71 tests passed.
- [x] Full Web regression: 94 files and 331 tests passed.
- [x] TypeScript, i18n validation and production build passed.
- [ ] Complete live paid single-Shot and Generate All qualification for each
  released provider.
- [ ] Record responsive visual evidence at mobile, tablet and desktop widths.

## 11. Checkpoint B lineage correction (2026-08-30)

- [x] Persist batch child Job bindings as Cinematic Storyboard attempts before
  provider enqueue.
- [x] Preserve operation, Scene and Shot lineage when Generation Group child
  lifecycle status is updated.
- [x] Show queued, processing, failed and completed-unapproved batch attempts on
  both the Storyboard board and Shot dialog.
- [x] Reconcile completed legacy batch records from immutable Credit ledger
  metadata without new Generation or Credit operations.

## 12. Storyboard generation presentation refinement

**Scope:** UI presentation only. Provider routing, model capability filtering,
reference authority, prompt compilation, estimates, Credits, Queue submission,
polling, result ownership and Storyboard approval remain unchanged.

- Extend the shared `EngineTargetPanel` with an explicit compact presentation;
  do not create a Cinematic-only provider/model selector.
- Opt only the Storyboard Shot dialog into the compact presentation. Preserve
  established Playground, Studio, Fashion and Character Look layouts.
- Apply the established yellow Render signature to the compact Storyboard
  Engine panel so its generation responsibility is visually recognizable.
- Keep Provider and Model as clear labeled controls, with stable dimensions and
  readable long names at desktop and mobile widths.
- Compress fixed output information so Provider/Model remain the primary
  decision. Preserve aspect ratio, dimensions and output-count values used by
  estimate and submission.
- Render a completed image as a bounded `contain` preview. Selecting the preview
  opens the existing shared `GenerationImageViewer`; do not create another
  lightbox or media state owner.
- Preserve Download, History detail, Collection, Share and the dominant
  `Use as Storyboard source` action.
- Leave an extension point in the shared Provider control for future catalog-
  owned Provider marks; this checkpoint does not introduce logo metadata.

Acceptance checks:

- Storyboard Provider/Model selection is compact and keyboard operable.
- The compact Engine panel carries the same theme-aware yellow border and
  restrained glow used by established Render surfaces.
- Unsupported models retain the canonical disabled reason.
- The preview never expands the dialog to the source image dimensions.
- The complete image is inspectable in the shared viewer by mouse and keyboard.
- No overlap or horizontal page overflow occurs at 1440px, 820px or 390px.

Validation: 73 focused server tests and 333 full Web tests passed; TypeScript,
i18n catalog validation and the production Web build passed. The reconciliation
added five missing attempts to the affected Project and was covered by an
idempotency/no-approved-source-replacement regression test.

## 12. Visual prompt authority correction (CINE-FIX-002, 2026-08-30)

- Manual Shot and Generate All now use the same labelled Storyboard still
  compiler even when a Shot already contains authored prompt text.
- The compiler carries Project intent, the matching Plan and owning Beat,
  Scene purpose/change/emotional direction/blocking/performance/lighting,
  Shot camera/blocking/performance/gaze, Character performance authority,
  approved Look summaries and continuity notes.
- Emotional transitions are expressed as observable face, posture, gesture and
  gaze direction for the selected still, not as literal multi-moment action.
- Audio-only intent and duration remain outside the still-image prompt and stay
  owned by Produce/video contracts.
- Live provider output still requires manual identity, wardrobe, emotion and
  continuity qualification before closing provider-specific quality gates.

## 13. Shot preview and realism correction (CINE-FIX-003/004, 2026-08-30)

- The Shot dialog keeps the shared Generation result and full-size viewer but
  constrains its inline result tile to a centered `360px` maximum width.
- A persisted authored Shot prompt is now compiled as one input section and can
  no longer bypass current Project, Plan, Beat, Scene, Cast, Look or continuity
  authority.
- Shot position resolves the observable emotional target: opening Shot uses the
  Scene start, final Shot uses the Scene end, and intermediate Shots receive a
  restrained transitional target. A one-Shot Scene uses one dominant end state
  with the complete Scene arc retained only as narrative context.
- `server/config/prompt-recipes/cinematic/storyboard-still.v1.json` owns the
  provider-independent realism policy consumed by final server compilation.
- Cinematic Scene compilation treats Character personality as a baseline and
  gives selected Shot emotion/performance/gaze authority over smiling and eye
  contact. Non-Cinematic generation retains its existing personality behavior.
- The production React bundle was rebuilt, and browser inspection against the
  affected Project confirmed `Tense and watchful` plus the no-smile authority
  in the live Shot prompt without submitting another paid Job.

Validation: 44 focused Web tests, 34 focused server Generation/Cinematic tests,
and the full Web suite of 94 files / 337 tests passed. TypeScript, i18n and the
production Web build passed. Root `npm test` remains red from unrelated existing
repository-wide gates (legacy prompt-cleanup expectations, missing agent
artifacts, and direct Node execution of Vitest TypeScript files); none of the
focused failures originated in this correction.
