# Produce Video Pipeline Execution Log

**Plan ID:** `016-PVP-IP-008`  
**Status:** Active  
**Purpose:** Append-only implementation checkpoint evidence

## 2026-09-04 - Package 001 Baseline

Primary role: Backend Platform Architect. Review gates: Generative Cinematic
Production, Commercial Integrity, UX/UI and QA.

Current workflow trace:

```text
CinematicStageContent
-> cinematicApi
-> cinematicRoutes
-> CinematicApplicationService.quoteVideoAttempt/createVideoAttempt
-> VideoGenerationApplicationService.quote/submit
-> CreditApplicationService
-> VideoProviderTaskService
-> VideoProviderAdapterRegistry/provider adapter
-> CinematicVideoAssetService
-> provider task and Cinematic attempt projections
```

Baseline server command:

```text
node --test test/cinematicVideoPacketCompiler.test.js test/videoCapabilityRegistry.test.js test/cinematicApplicationService.test.js test/videoGenerationApplicationService.test.js test/videoProviderTaskService.test.js test/cinematicTimelineCompiler.test.js test/generationGroup.test.js test/creditEstimateGenerationParity.test.js
```

Result: 65 passed, 0 failed.

Baseline Web command:

```text
npm.cmd run test --workspace web -- src/features/cinematic/components/CinematicUxPrototype.test.tsx src/features/cinematic/components/CinematicWorkspaceHeader.test.tsx src/features/cinematic/components/ProjectCostSummary.test.tsx src/features/cinematic/components/StoryboardGenerateAllDialog.test.tsx src/components/generation/VideoEngineTargetPanel.test.tsx
```

Result: 5 files, 68 tests passed. The first sandboxed run could not create
Vite's temporary config file; the approved unsandboxed rerun passed. The
`react-i18next` no-instance test warning was pre-existing and non-failing.

Baseline findings:

- Cinematic always sends `operation: image_to_video` while Seedance rows expose
  product operations, so capability validation rejects the intended route.
- `VideoGenerationApplicationService` derives one reference from `operation`
  and does not represent ordered semantic reference roles.
- Provider task lineage persists only the overloaded operation.
- The packet compiler is server-owned and versioned, providing a safe additive
  v2 migration point.
- Paid catalog exposure is empty and must remain unchanged in Package 001.

Next checkpoint at baseline: add failing characterization tests for normalized
commercial operation/input mode, legacy inference, quote-submit parity and task
lineage.

## 2026-09-04 - Package 001 Complete

Implemented:

- additive `commercialOperation` and `inputMode` normalization with legacy
  `operation` inference;
- catalog schema v3 capability separation without changing paid exposure;
- ordered, sanitized video reference plans and deterministic fingerprints;
- quote/submit request fingerprint parity and Credit reservation parity;
- video packet policy v2 plus provider-family prompt strategy configuration;
- ModelArk/Gemini provider prompt rendering from one immutable Cinematic packet;
- typed Web schemas and Produce selection filtering against the new capability
  fields.

Lineage now records commercial operation, input mode, packet, provider prompt,
reference-plan and prepared-request fingerprints. Private reference locators and
prompt bodies remain excluded from normal task projections.

Validation:

```text
node --test test/cinematicVideoPacketCompiler.test.js test/videoCapabilityRegistry.test.js test/cinematicApplicationService.test.js test/videoGenerationApplicationService.test.js test/videoProviderTaskService.test.js test/cinematicTimelineCompiler.test.js test/generationGroup.test.js test/creditEstimateGenerationParity.test.js
```

Result: 69 passed, 0 failed.

```text
npm.cmd run test --workspace web -- src/features/cinematic/schemas/cinematicCoreContracts.test.ts src/features/cinematic/components/CinematicUxPrototype.test.tsx src/components/generation/VideoEngineTargetPanel.test.tsx
```

Result: 3 files, 65 tests passed. Existing non-failing `react-i18next` test
warning remains.

`npm.cmd run build --workspace web`, JSON parsing and `git diff --check` passed.
No live provider request was made and no paid route was enabled. Package 002 is
now active.

## 2026-09-04 - Package 002 Complete

Implemented:

- a read-only Scene/Shot production queue that preserves Storyboard order and
  overlays the selected Job's live status without starting image polling;
- media-first keyframe/video comparison, concise Story context, bounded attempt
  history and a collapsed read-only compiled prompt;
- shared `VideoEngineTargetPanel` composition with catalog controls, quote,
  source readiness, yellow render signature and actor-scoped provider/model
  preference;
- a no-side-effect rough sequence reviewer that exposes unresolved gaps;
- a responsive readiness header and non-occluding Project cost summary;
- optional 300-character `additionalMotionDirection` persisted by Cinematic,
  compiled by the server and protected by packet-fingerprint staleness;
- scoped removal of the prototype badge from persisted Produce only.

The motion mutation preserves approved Storyboard authority, marks only that
Shot's existing video attempts/Timeline consumers `packet_changed`, unbinds an
old approved clip and prevents stale approval. It creates no provider, Queue or
Credit side effect.

Validation:

```text
node --test test/cinematicVideoPacketCompiler.test.js test/videoCapabilityRegistry.test.js test/cinematicApplicationService.test.js test/videoGenerationApplicationService.test.js test/videoProviderTaskService.test.js test/cinematicTimelineCompiler.test.js test/generationGroup.test.js test/creditEstimateGenerationParity.test.js
```

Result: 71 passed, 0 failed.

```text
npm.cmd run test --workspace web
```

Result before the additive motion substep: 104 files and 391 tests passed. The
motion substep then passed 3 focused files/7 tests plus the production build;
the additive optional schema preserves prior fixture compatibility.

`npm.cmd run build --workspace web`, all changed JSON parsing and
`git diff --check` passed. Browser evidence covered 390px, 820px and 1440px,
Thai content, and Default, Pearl Editorial and Electric Studio themes. No page
overlay or inaccessible render action was observed. The actual test Project is
correctly blocked by its stale keyframe contract until Storyboard recovery.

No live provider request was made and no paid route was enabled. Package 003 is
now active.

## 2026-09-04 - Package 003 Deterministic Gate Complete

Implemented:

- local Seedance/provider and actor-owned first-frame preflight before Credit
  authorization;
- explicit no-user-Credit qualification quotes and deterministic authorization
  IDs for research-only, testing-enabled, paid-disabled Cinematic requests;
- durable provider-task resumption, ambiguous-submit reconciliation and shared
  idempotent terminal settlement for browser and startup recovery;
- recoverable media persistence against the original provider task without a
  second generation request;
- Assets-owned structured ffprobe evidence plus passing-probe approval gates;
- complete sanitized quote/reservation-or-qualification/task/attempt/
  settlement/probe lineage;
- Seedance-compatible reference MIME, size, dimension and aspect-ratio limits;
- Produce review controls that expose approval only for a current, settled,
  technically verified output.

Protected deterministic server command:

```text
node --test test/cinematicVideoPacketCompiler.test.js test/videoCapabilityRegistry.test.js test/cinematicApplicationService.test.js test/cinematicDataLineageService.test.js test/videoGenerationApplicationService.test.js test/videoProviderTaskService.test.js test/videoMediaProbeService.test.js test/cinematicVideoAssetService.test.js test/modelArkSeedanceProvider.test.js test/videoGenerationRoutes.test.js test/cinematicTimelineCompiler.test.js test/generationGroup.test.js test/creditEstimateGenerationParity.test.js
```

Result: 102 passed, 0 failed. This includes transient provider-download
classification that retries durable copy against the original provider task
instead of starting a second generation.

Web validation:

```text
npm.cmd run test --workspace web
npm.cmd run build --workspace web
```

The complete Web suite passed 104 files and 392 tests. Responsive inspection
of the real Produce route passed at 390px, 820px and 1440px with no page error,
overlap or document-level horizontal overflow. The selected Project correctly
reports only one of five current Storyboard sources and blocks generation on
the stale keyframe contract rather than dispatching invalid work.

No live provider request was made and no user Credit changed. Package 003 stays
open at its explicit three-run live Seedance qualification gate. Package 004
has not started.
