# Cinematic Studio MVP Delivery And Validation Plan

**Status:** C0-C3 and the guarded C4-C6 foundations are implemented. Release is
conditional: live provider film qualification, Credits settlement integration,
final assembly qualification and the manual UX matrix are still required.
**Primary role:** Product And Requirement Architect
**Reviewers:** Backend Platform Architect, QA And Release Engineer; UX/UI Product
Designer and Commercial Financial Integrity join their owned checkpoints
**Skills:** `design-cinematic-experience`, `review-product-ux`,
`implement-generation-workflow`, `review-commercial-integrity`,
`verify-release-regressions`

## 1. Delivery Principle

After the C1.5 information architecture is approved, build functional vertical
slices through existing capability facades. The prototype may cover all six
stages, but it must not accumulate parallel business state or simulate accepted
financial/provider outcomes. Do not build provider adapters
before the normalized operation/Job/quote contracts, and do not build Admin
mutation paths before owner commands. Each checkpoint must preserve old Studio,
Scene Builder, Character, Fashion, Generation and Credit behavior.

Shared extraction follows characterize -> extract -> adapt existing consumer ->
add Cinematic consumer -> regression test. A later checkpoint cannot compensate
for missing tests or ownership in an earlier one.

## 2. Checkpoints

### C0 - Contract freeze

- Approve six-stage UX, operation names, IDs, state machines and owner map.
- Freeze the versioned Veo/Seedance capability candidates, rate-card sources
  and disabled-by-default launch state from
  `005-video-provider-pricing-and-credit-model.md` and
  `006-video-generation-provider-contract.md`.
- Confirm video provider qualification inputs, face/reference eligibility,
  asynchronous recovery and output/storage constraints.
- Confirm commercial pricing, estimate-versus-actual reconciliation and refund
  decisions.
- Add protected-behavior inventory for existing shared components.
- Approve Requirement 007 project structure, component reuse map, browser state
  boundaries and theme contract.
- Approve Requirement 008 Admin/Support read model, correlation IDs and owner
  command boundaries.

Exit: schemas and open decisions are recorded; no runtime implementation.

### C1 - Shared foundation without paid video

**Primary:** Backend Platform Architect
**Review:** UX/UI Product Designer, QA And Release Engineer

- Add typed provider-neutral video operation, capability and status schemas.
- Add Cinematic API/Zod boundaries and empty feature route behind the feature
  flag.
- Characterize current `EngineTargetPanel`, Generation estimate/action region,
  Queue, loader, result, viewer, actor storage and theme behavior.
- Extract or extend only the presentation contracts required by two consumers;
  image Studio remains the first compatibility adapter.
- Add versioned actor-scoped Cinematic draft schema and safe migration/fallback.
- Add correlation fields and structured lifecycle event schemas before Jobs
  exist.

Exit: an internal fixture can render the video Engine/estimate/Queue/result
states in all themes without provider dispatch or Credit mutation; existing
image/Fashion regressions pass.

#### C1 implementation checkpoint - 2026-08-17

Implemented:

- canonical `/create/cinematic` route family, breadcrumb and Create navigation
  item behind server-owned `cinematic.enabled`;
- provider-neutral video capability, lifecycle correlation, Project summary and
  list response schemas;
- API path/schema boundary without a runtime request or mutation;
- actor-scoped `cinematic-project:new` draft version with malformed-payload
  fallback, unknown media-field removal and actor isolation;
- shared `EngineTargetPanelFrame` extracted from the existing image Engine
  consumer and reused by the Cinematic video presentation adapter;
- internal ready, queued, completed and failed video presentation fixtures for
  all three application themes; Generate remains disabled and cannot dispatch a
  provider request or mutate Credits;
- local Setup shell for validating C1 navigation, theme and draft behavior.
  Committed Project routes remain explicitly unavailable until C2 rather than
  presenting browser state as server truth.

Validation evidence:

- Web TypeScript build passed;
- production Vite build passed;
- all 64 Web test files / 208 tests passed after the shared extraction;
- focused Cinematic schema, draft, route and three-theme presentation tests
  passed;
- Community compatibility feature-policy tests passed with the new Cinematic
  flag;
- `git diff --check` passed.

Remaining C1 manual evidence:

- visually inspect `/create/cinematic` and `/create/cinematic/new` at desktop
  and mobile widths in Momelo Neon, Pearl Editorial and Electric Studio. The
  automated semantic-theme fixture passed, but this manual screenshot matrix
  remains a release checkpoint.

Next checkpoint: C2 must introduce the private canonical Project service,
server commit/resume and Cast/Wardrobe integration. It must not enable the C1
Generate video button or add a provider adapter.

### C1.5 - Six-stage UX/UI prototype

**Primary:** UX/UI Product Designer
**Review:** Cinematic Experience Director, Generative Cinematic Production
Director, QA And Release Engineer
**Skills:** `review-product-ux`, `design-cinematic-experience`,
`direct-generative-cinematic-production`, `verify-release-regressions`

- make all six stable stages navigable from one private new-project workspace;
- show realistic Cast/continuity, beat plan, shot direction, production state
  and finish timeline fixtures without claiming backend truth;
- extract the image Studio's complete yellow Generation shell and reuse it for
  Cinematic `Engine & Target Output`;
- preserve theme tokens, localization, keyboard semantics and desktop/mobile;
- keep quote, provider dispatch, Generation, approval and export unavailable;
- characterize the existing image Studio consumer before shared extraction.
- remove the permanent Engine panel from passive Setup/Cast browsing and design
  contextual operation docks plus the persistent Project Cost Summary;
- design focused Character picker, Scene Director and Shot workspaces with
  desktop/mobile, keyboard, theme, empty, error and recovery states;

Exit: product owner can review the full workflow and the three-theme,
desktop/mobile QA matrix passes. C2 begins only after UX approval.

#### C1.5 requirement revision - contextual operations

The first fixture implementation is not approved for functional integration
until it is revised to this contract: no unused Engine panel in passive Setup,
non-destructive Story enhancement, filtered Character selection, focused Scene
and Shot workspaces, per-operation quote/progress, Credits-owned Project cost
summary, MVP-only Finish and explicit Complete/Continue-as-Series outcomes.

#### C1.5 implementation checkpoint - 2026-08-17

Implemented as local presentation state:

- all six stage workspaces and responsive stage navigation;
- non-destructive Story Enhance comparison dialog;
- filterable Character picker and a selected Character dossier containing the
  dramatic role, personality, objective, emotional baseline, performance
  direction and continuity notes needed by downstream Scenes;
- named Wardrobe Looks and all default, upload and AI-suggestion wardrobe
  sources live inside the owning Character dossier; there is no global or
  unassigned wardrobe upload surface;
- Simple mode exposes the minimum Character and Look decisions, while Advanced
  mode reveals pressure, relationship, dialogue style and per-Scene Look
  changes without creating a separate workflow;
- detailed Scene Director dialog;
- per-Shot Storyboard prompt, reset, provider/model and attempt presentation;
- per-Shot Produce provider/model/duration/resolution and attempt presentation;
- grouped Storyboard and Produce command surfaces containing scope, provider
  settings, estimate and Generate action, plus explicit selected-Shot versus
  all-eligible-set fixture estimates; prompt and media remain in the center
  focused editor;
- revised three-lane Storyboard/Produce prototype: Scene navigation left,
  sequence board plus selected Shot prompt/media center, and sticky generation
  command panel right; every Scene and Shot exposes reconciled duration;
- shared Momelo empty-state and amber Generation loading presentation in both
  result regions; real submission, scrolling and progress remain C3/C4 work;
- MVP Finish controls limited to trim, cut/dissolve, export and Project outcome;
- contextual disabled operation docks and persistent Project cost ledger.

Advertising, product campaigns and product-scale analysis are explicitly
deferred beyond MVP. They require a separate Campaign Brief and qualification
contract and must not be hidden inside the current Story genre control.

The Generative Cinematic Production Director role and
`direct-generative-cinematic-production` Skill now own provider-aware temporal
execution advice for approved Shots. They do not dispatch providers, reserve
Credits or replace the canonical Generation workflow.

No accepted quote, Credit mutation, provider dispatch, Queue Job, durable
Project command, generated media or export exists at this checkpoint. Manual
desktop/mobile and three-theme visual approval remains required before C2.

### C2 - Private project and cast vertical slice

**Primary:** Backend Platform Architect
**Review:** UX/UI Product Designer, Cinematic Experience Director
**Skills:** `review-product-ux`, `design-cinematic-experience`

- Cinematic route/shell, Setup, Cast/Wardrobe and actor-scoped autosave.
- Story Brief, optional Creative Direction and non-destructive Enhance Story
  compare/apply flow through a quoted text operation.
- filtered Character picker using canonical metadata and rights; wardrobe
  default/upload/manual selection remains free while AI suggestion/analysis is
  separately quoted.
- Credits-owned compact Project Cost Summary projection available in all stages.
- Use the canonical Project service. If the commercial Project capability is
  not yet implemented, first deliver its minimum private-owner local adapter in
  the Project capability; Cinematic must not create a substitute project store.
- Cinematic repository interface and local adapter for film-specific state.
- Character/Profile Version and Asset authorization through owners.
- Commit/resume/version-conflict behavior uses server truth plus recoverable
  local draft; actor switching is isolated.

Exit: restart and actor switch tests pass; no paid generation.

### C3 - Structured story, continuity and Storyboard vertical slice

**Primary:** Cinematic Experience Director
**Review:** Backend Platform Architect, UX/UI Product Designer

- text planning operation, validation and Story Plan versions;
- Scene-level quoted expand/rewrite operations and focused director dialog;
- scene/shot editor, continuity ledger and storyboard stills;
- Storyboard sequence/editor anchors with selected-Shot and scroll/focus return
  restoration across refresh, keyboard navigation and compact layouts;
- immutable Storyboard Asset approval and a Produce handoff DTO that identifies
  the exact approved source version;
- quote/reservation for planning/stills through canonical owners.
- use the existing image Generation/Credit path for Storyboard stills rather
  than a Cinematic image queue;
- expose the first Admin/Support read-only Project/Shot trace projection.

Exit: one approved storyboard is reproducible from stored structure.

### C4 - Qualified draft-video production

**Primary:** Backend Platform Architect
**Review:** Commercial Financial Integrity, QA And Release Engineer
**Skills:** `implement-generation-workflow`, `review-commercial-integrity`,
`review-generative-media-pipeline`

- implement one qualified sandbox provider path first; a second provider begins
  only after normalized dispatch, task persistence, bounded polling, durable
  media copy and terminal settlement pass with the first;
- fixed-fixture cost/latency/error and visual qualification evidence before
  promoting any paid route;
- qualified draft video operation and durable Generation Groups;
- result viewer, attempt history, selective regenerate and partial batch;
- Produce-to-Storyboard correction navigation that returns to the same Shot,
  plus source-version replacement, stale-attempt presentation and fresh-quote
  enforcement without deleting historical attempts;
- Project/Scene provider defaults with valid per-Shot overrides and refreshed
  quotes after any cost-bearing change;
- settlement/reconciliation and terminal error behavior;
- Admin provider/operation visibility, disable-new-submission control and
  Support trace lookup use the same owner contracts.

Exit: 3-6 shot film can be generated and one failed shot retried safely.

### C5 - Finish, export and recovery

**Primary:** Cinematic Experience Director
**Review:** Backend Platform Architect, QA And Release Engineer

- simple timeline, trim, cut/dissolve/fade and final assembly/export;
- defer subtitle, music, voice-over and advanced audio authoring beyond MVP;
- final quote, export Asset and download;
- support correlation, restart, media-copy recovery and export idempotency
  evidence;
- local draft cleanup preserves committed timeline/export state on the server.

Exit: complete 20-60 second film survives restart and exports once.

### C6 - Admin/Support completion and launch hardening

**Primary:** Backend Platform Architect
**Review:** Commercial Financial Integrity, QA And Release Engineer

- complete Requirement 008 bounded search, operational detail, command preview,
  reconciliation, retention and audit integration;
- complete provider qualification/rate-version administration without creating
  a Cinematic-local pricing store;
- accessibility, responsive, themes, i18n and performance budgets;
- customer-runtime isolation from Admin read-model outages;
- rollout, kill switch and rollback evidence.

Exit: Support can explain and recover every qualification scenario through
audited owner commands; no Severity 1/2 financial, privacy or orphaned-Job issue.

### C7 - Series-lite

**Primary:** Cinematic Experience Director
**Review:** Product And Requirement Architect, QA And Release Engineer

- Series Bible and episode linkage behind feature flag;
- cross-episode continuity and bounded list/query behavior;
- separate manual qualification after single-film C0-C6 acceptance.

Series-lite must not delay or destabilize the single-film MVP.

## 3. Automated Test Suites

- contract/schema tests for every API boundary;
- operation matrix tests proving free local edits never reserve Credits and each
  AI action uses its own immutable quote;
- Project Cost Summary reconciliation tests for spent, reserved, estimate,
  refund, partial batch, restart and actor isolation;
- lifecycle tests for project, plan, Shot, attempt and export;
- actor/permission tests for private projects and shared Characters;
- idempotency tests for planning, generation, settlement and export;
- stale quote and stale downstream dependency tests;
- Storyboard sequence/editor anchor tests for selected Shot, semantic focus,
  reduced motion, browser refresh and return-location restoration;
- Produce source-lineage tests proving only an approved immutable Storyboard
  Asset Version can be quoted/submitted and that quote, reference plan, Job and
  Asset provenance share its fingerprint;
- Storyboard replacement tests proving affected video approval is cleared,
  attempts/timeline entries become `source_changed`, stale clips cannot enter a
  new export, financial history is preserved and unrelated Shots stay current;
- command tests for actor ownership, Asset-to-attempt provenance, optimistic
  conflict, duplicate idempotency key and the four stable Storyboard source
  errors before reservation;
- partial batch, cancellation, restart and orphan reconciliation tests;
- parameterized video pricing tests for duration, resolution, audio,
  input-video usage, returned completion tokens and rate-card version;
- Veo/Seedance capability matrix tests for references, first/last frame,
  person-asset eligibility and unsupported combinations;
- provider task persistence, bounded polling, temporary-media download and
  provider-retention recovery tests;
- shared component regressions for loader, queue, viewer, credit dialog and
  Character/outfit pickers;
- Character picker filter, reuse-rights and unknown-metadata fallback tests;
- non-destructive Story enhancement compare/apply/discard tests;
- Storyboard prompt edit/reset and preserved attempt/history tests;
- shared Engine/estimate/result adapter tests proving image defaults and
  Cinematic video variants coexist;
- actor-scoped local-draft schema migration, malformed payload, storage quota,
  logout and actor-switch isolation;
- theme tests for Momelo Neon, Pearl Editorial and Electric Studio without a
  Cinematic route override;
- i18n key parity and route registry tests;
- repository adapter parity before database migration.
- Admin/Support read-model outage, role authorization, duplicate recovery
  command and sanitized-log tests from Requirement 008.

## 4. Manual Film Qualification

Use at least three films:

1. one Character, one wardrobe, daylight lifestyle;
2. two Characters, dialogue-like reaction sequence and wardrobe continuity;
3. one Character with a deliberate wardrobe/location change.

For each film record:

```text
Project and Job IDs
Provider/model per operation
Duration and aspect ratio
Character identity /5
Wardrobe continuity /5
Scene continuity /5
Motion/anatomy /5
Camera and performance /5
Export playback and transition quality /5
Commercial polish /5
Unexpected identity/wardrobe/prop leakage
Credits quoted/captured/refunded
Result: pass / conditional pass / fail
```

No provider is promoted when identity or wardrobe is below 4/5, when reference
authority leaks, when multi-person anatomy fails materially, or when two of
three runs error.

## 5. UX Manual Matrix

- desktop 1440px and mobile 360px;
- default, Pearl and dark themes;
- EN and TH locales;
- mouse and keyboard only;
- owner, unauthorized actor and insufficient-Credit actor;
- empty, loading, saving, stale, partial, failed and completed states.
- verify Setup has no unused Engine panel and every contextual dock names the
  actual operation, exact quote and post-action result;
- verify Project Cost Summary remains reachable without covering the primary
  mobile action and its drill-down never mixes estimates with captured spend;
- verify focused Character, Scene and Shot dialogs return focus and restore
  list/scroll context after close;
- verify a long Storyboard can jump from sequence to selected editor and back
  without losing the selected card, including keyboard-only and reduced-motion
  use at desktop and mobile widths;
- verify Produce displays the approved Storyboard source, returns to that exact
  Shot for correction, restores Produce context, explains `source_changed` and
  requires a fresh quote/regeneration before completion;

## 6. Performance Budgets To Baseline

Before tuning, capture:

- project summary/list p95 and payload size;
- stage load and autosave p95;
- story-plan application latency;
- queue wait, reference processing and provider duration separately;
- polling request rate per active project;
- storyboard/timeline render with 12 shots;
- retained browser memory and thumbnail payload.

Any cache requires owner, key, bound, TTL/terminal condition and invalidation.

## 7. Rollout And Rollback

- Ship behind `cinematicStudioEnabled` and operation-specific provider flags.
- Enable internal users, then limited creators, then launch cohort.
- Disable new submissions independently of read/review/export access.
- Rollback never deletes accepted Jobs, Assets or ledger entries.
- A provider flag can stop one operation while preserving completed projects.

## 8. Requirement-To-Checkpoint Traceability

| Requirement | First implementation | Completion gate |
|---|---|---|
| 000 Master | C0 | C6 |
| 001 UX flow | C1.5 revised prototype, then C2-C5 slices | C6 visual/manual matrix |
| 002 domain/continuity | C2 Story source and Cast, C3 Scene/Shot | C5 completion/Series proposal |
| 003 Generation/Credit/media | C2 text/wardrobe quote and Project cost projection | C5 settlement/recovery |
| 005 pricing | C0 fixtures | C4 paid qualification and C6 Admin rate control |
| 006 providers | C1 schemas | C4 first adapter; later provider separately qualified |
| 007 shared architecture/state | C1 | every checkpoint regression gate |
| 008 Admin/Support/observability | C1 event IDs, C3 read-only | C6 commands/recovery |

## 9. Definition Of Done

- C0-C6 acceptance passes with automated and manual evidence.
- No Severity 1/2 privacy, financial, orphaned Job or cross-actor defect remains.
- Existing Studio/Playground/Fashion shared-component suites remain green.
- Support can diagnose any billed project operation from a safe reference.
- Open provider-quality limitations are visible and assigned to a follow-up.

## 10. Implementation Evidence - 2026-08-17

### Implemented and automated

- C0-C1.5: route, six-stage shell, actor-scoped draft, schemas, shared async
  presentation and protected paid-operation controls.
- C2: private Project persistence, serialized Setup/stage mutations, immutable
  manual Story Source revisions, rights-aware Character picker with server
  gender/age/ethnicity facets, pinned Cast Assignment dossier updates and
  Character-owned Wardrobe Looks with owned-Asset authority snapshots.
- C3: versioned Story Plans, stable Scene/Shot IDs and duration reconciliation,
  per-Shot direction edit, sequence reorder, immutable approved Storyboard
  Asset source and selective downstream stale propagation.
- C4 foundation: disabled video capability catalog, parameterized pricing
  calculator, sandbox provider contract, durable provider-task lifecycle,
  idempotency, restart recovery, terminal states, usage reconciliation and
  durable private video Asset copy.
- C5 foundation: durable Timeline versions, trim/transition validation,
  current-source eligibility and qualification-blocked export manifest.
- C6 foundation: role-gated bounded Project/task/capability operational search
  and sanitized detail.

### Deliberately blocked, not silently simulated

- Quoted AI Story enhancement, Scene rewrite and embedded Storyboard image
  generation still require canonical text/image Credit operation integration.
- No Veo or Seedance model is customer-routable until three repeated visual
  qualification rounds, live account capability evidence, error/latency/cost
  evidence and Commercial approval are recorded.
- Project Cost Summary shows unavailable values until a Credits-owned Project
  projection exists; it does not display fixture financial totals.
- Final video assembly/export and audited Support recovery commands remain
  blocked by qualification and Requirement 017 command ownership.
- Series-lite remains behind the post-MVP gate.

### Current automated evidence

- Cinematic Project, Story Source, Cast/Wardrobe, Scene/Shot, Storyboard source,
  Timeline and operational authorization domain tests.
- Video capability, pricing, task restart/idempotency/reconciliation and durable
  Asset-copy tests.
- React schema, stage workflow, Character filter, Storyboard interaction,
  committed-project fixture isolation and Project Cost truth tests.
- TypeScript project build for `web`.

Validation recorded on 2026-08-17:

- Cinematic-focused server suites: 30 passed, 0 failed.
- Cinematic-focused React suites: 18 passed, 0 failed.
- Full React regression suite: 69 files and 241 tests passed.
- `web` TypeScript build and Cinematic EN/TH locale JSON parsing passed.
- Full server regression suite: 469 of 477 passed. The eight failures are the
  pre-existing Clothing prompt/Fashion taxonomy expectation group and no
  Cinematic test failed; they remain outside this capability's closeout.
- `git diff --check` passed.

The in-app browser connection was unavailable during this validation run, so
the desktop/mobile screenshot matrix remains explicitly open rather than being
inferred from component tests.

Manual desktop/mobile/theme/accessibility checks and live provider film
qualification remain mandatory before changing any blocked item above to
complete.
