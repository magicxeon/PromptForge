# Cinematic Studio MVP Delivery And Validation Plan

**Primary role:** Product And Requirement Architect
**Reviewers:** Backend Platform Architect, QA And Release Engineer; UX/UI Product
Designer and Commercial Financial Integrity join their owned checkpoints
**Skills:** `design-cinematic-experience`, `review-product-ux`,
`implement-generation-workflow`, `review-commercial-integrity`,
`verify-release-regressions`

## 1. Delivery Principle

Build vertical slices through existing capability facades. Do not build all UI,
then all server code, then connect providers. Do not build provider adapters
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

### C2 - Private project and cast vertical slice

**Primary:** Backend Platform Architect
**Review:** UX/UI Product Designer, Cinematic Experience Director
**Skills:** `review-product-ux`, `design-cinematic-experience`

- Cinematic route/shell, Setup, Cast/Wardrobe and actor-scoped autosave.
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
- scene/shot editor, continuity ledger and storyboard stills;
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
- settlement/reconciliation and terminal error behavior;
- Admin provider/operation visibility, disable-new-submission control and
  Support trace lookup use the same owner contracts.

Exit: 3-6 shot film can be generated and one failed shot retried safely.

### C5 - Finish, export and recovery

**Primary:** Cinematic Experience Director
**Review:** Backend Platform Architect, QA And Release Engineer

- simple timeline, trim, transition, subtitle/music and final assembly;
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
- lifecycle tests for project, plan, Shot, attempt and export;
- actor/permission tests for private projects and shared Characters;
- idempotency tests for planning, generation, settlement and export;
- stale quote and stale downstream dependency tests;
- partial batch, cancellation, restart and orphan reconciliation tests;
- parameterized video pricing tests for duration, resolution, audio,
  input-video usage, returned completion tokens and rate-card version;
- Veo/Seedance capability matrix tests for references, first/last frame,
  person-asset eligibility and unsupported combinations;
- provider task persistence, bounded polling, temporary-media download and
  provider-retention recovery tests;
- shared component regressions for loader, queue, viewer, credit dialog and
  Character/outfit pickers;
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
Audio/subtitle sync /5
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
| 001 UX flow | C1/C2 | C6 visual/manual matrix |
| 002 domain/continuity | C2 | C5 |
| 003 Generation/Credit/media | C1 contract | C5 settlement/recovery |
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
