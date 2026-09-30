# Task Packet 014 - Continuity, Ordering And Portable Shots

Status: core implementation delivered; focused verification passed, UAT/qualification open.
Q1 confirmed and implemented: selected Chapter only.
Owner: [requirement 014](../014-authoring-continuity-and-portable-production.md).
This packet extends existing screen tasks, not a second product workflow.

## 1. Reuse And Ownership Map

| Responsibility | Existing owner / starting files |
|---|---|
| Chapter ordering/root vs child hierarchy | server/domain/cinematic/CinematicSeriesService.js; CinematicChapterAuthoring.js; existing actor workspace transaction |
| Scene ordering and text use cases | server/domain/cinematic/CinematicApplicationService.js; CinematicSceneAuthoring.js; existing project repository |
| Context and recipes | server/domain/generation/CinematicFullStoryService.js; server/config/prompt-recipes/cinematic/{full-story-chapters,chapter-scenes,scene-shots}.v1.json |
| Effective video text / stale keys | CinematicShotDocumentCompiler.js; CinematicVideoPacketCompiler.js; existing prompt preparation/budget/reference owners |
| Client contracts | web/src/features/cinematic/api/{cinematicApi,cinematicSeriesApi}.ts; schemas/cinematicSchemas.ts |
| Chapter/Scene controls | components/CinematicChapterWriter.tsx; CinematicSceneOverview.tsx |
| Shot handoff | components/CinematicShotWriter.tsx; existing GenerationResultSurface/media delivery and authenticated image infrastructure |
| Portraits | components/CinematicSharedCharactersPanel.tsx; authoring/SceneCastLookSelector.tsx; Cast cards and reference-strip consumers; web/src/components/media/AuthenticatedMediaImage.tsx |
| Look sheet | server/domain/character-profiles/CharacterLookService.js; server/config/prompt-recipes/character-looks/look-sheet.v5.json; v4 retained for old manifests; existing Profile Look dialog/crop consumers |
| Display/configuration | web/src/styles/cinematic.css; existing tokens/themes; client/i18n/locales/{th,en}/cinematic.json; server/config/cinematic/workflow-policy.v1.json |

Verify exact consumers before editing. New internal helpers, only if required, stay
under their owning capability. No root utility folder, direct cross-owner repository
writes, duplicate prompt compiler, provider client, image service or polling loop.

## 2. Small Ordered Tasks

| ID | Scope / dependency | Reviewable output and focused acceptance | State |
|---|---|---|---|
| AC01 | Baseline and contract audit | Q1 confirmed; Series transaction, immutable media, manifests and current writer owners audited | Verified |
| AC02 | Readability prototype; AC01 | Scoped 18px/1.8 prose, neutral theme surface, native editor retained; responsive TH/EN and three-theme Shot contrast | Implemented; broader accessibility UAT open |
| AC03 | Portrait alignment; AC01 | Centered avatar slots and contained selected sheets in current Cast/Scene/Shot views and picker | Implemented; source-image focal quality UAT open |
| AC04 | Chapter reorder backend; AC01 | Atomic complete-permutation command with actor/version checks, explicit stable story root | Verified |
| AC05 | Chapter reorder UI; AC04 | Accessible arrows, boundary states, saved dirty prose and stable selected ID | Verified |
| AC06 | Scene reorder backend/UI; AC04 conventions | Chapter-local command and orderKey parity; unsaved-work guard, existing references stay pinned and review notice | Verified |
| AC07 | Shared continuity-context builder; AC04/06 | Bounded predecessor tail/next opening and authored prior exit/prop states, unknown knowledge stays null; no hidden calls | Verified; prose fact extraction not added |
| AC08 | Chapter/Scene/Shot context wiring; AC07 | Existing text entry points receive shared context; proposals capture continuity/order fingerprints | Implemented; focused stale-context tests |
| AC09 | Explicit no-instruction continuity action; AC08 | Dynamic Chapter-only action and description, proposal/review/apply, preserves Season and child production | Verified |
| AC10 | Project video direction contract; AC01 | Root Setup field, inherited projection and configured limit; legacy Setup saves preserve it | Verified |
| AC11 | Compiler and UX integration; AC10 | Defaults appear once, survive prompt compaction and change fingerprints; inherited summary and explicit precedence | Verified; semantic conflict detector deferred |
| AC12 | Portable Shot handoff; AC11 | Saved creator prompt + actual reference order, owned originals, clipboard fallback, stale warnings, actor guards | Verified core; partial-reference export deferred |
| AC13 | Editorial Look template; AC03 | Recipe v5 + versioned three-quarter review/crops, optional accessories; pending v4 retained | Verified contracts; paid visual qualification open |
| AC14 | Close each slice and integrate | Two focused groups, typecheck, browser evidence, explicit residual risks below | In progress until UAT closes |

Suggested delivery: AC01 -> AC02/03 for quick visual review, then AC04-06 ordering,
AC07-09 continuity, AC10-12 portable production, AC13 template. AC10/13 can proceed
independently after their contracts are agreed. Do not delay all useful UI fixes
until every server task is finished. One task is reviewed before starting the next.

## 3. Configuration And Data Contract Work

- `server/config/cinematic/workflow-policy.v1.json`, `authoring`: implemented
  `continuityExcerptCharacters` (2400), `continuityHistoryDepth` (3), and
  `projectVideoDirectionMaximumCharacters` (2000). Server validation remains in
  `server/config/cinematicRewampConfiguration.js`; expose the input bound through
  the existing manifest. Reorder scope is a domain invariant, not a toggle.
- Existing text-model/prompt-budget policies own token/output/model constraints.
  Distinguish text-authoring input budgets from video provider character limits.
- Project data: root `setup.videoDirection` plus existing project version; stable
  `series.storyProjectId`; existing child membership/order keys; proposal context
  source versions/order fingerprint. Keep snapshots
  immutable; derive review status without rewriting historical generation receipts.
- Readability uses existing theme tokens without a new stored preference. Optional
  light reading surface/font controls remain deferred; no new browser cache.
- Look recipe: versioned grid/face/hairstyle/garment/accessory metadata. Never apply
  v5-style rectangles to v4 images; no automatic migration of approved assets.
- Additive defaults for old projects: empty shared direction; existing order; missing
  ledger facts unknown; old Look templates and media remain valid. Feature rollback
  hides new commands but must not discard saved text, assets or reorder persistence.

## 4. Test Groups And Evidence

Implemented selectors in `scripts/test-cinematic-video.js`:

| Command | Recorded result / scope |
|---|---|
| `node scripts/test-cinematic-video.js rewamp-authoring-order` | 16 backend + 15 UI passed; reorder, stable root, bounded continuity, selected Chapter proposal, stale context and existing adjacent contracts |
| `node scripts/test-cinematic-video.js rewamp-authoring-media` | 70 backend + 19 UI passed; Look v5/v4 compatibility, packet/reference contracts, direction, export and setup/Shot UI |
| `node scripts/test-cinematic-video.js rewamp-authoring-014` | Explicit task-only aggregate for later UAT; not run in this session to avoid duplicating the two groups |
| `node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false --pretty false` | Passed |
| `git diff --check` | Passed; existing CRLF normalization warnings only |

Browser runners use isolated fixtures, not live project mutations. Prerequisites:
installed dependencies and isolated Vite at `http://127.0.0.1:6502` (override with
`CINEMATIC_WEB_ORIGIN`); no backend/worker restart or paid provider request.

| Browser command | Evidence |
|---|---|
| `node scripts/verify-cinematic-story-import.mjs --scene-cast` | TH/EN, 390/820/1440; `%TEMP%/mpf-story-import-ui-IL0XWu` |
| `node scripts/verify-cinematic-story-import.mjs --cast-target` | TH/EN, 390/820/1440; `%TEMP%/mpf-story-import-ui-Rvmxwm` |
| `node scripts/verify-cinematic-shot-workspace.mjs` | TH/EN, 390/820/1440, save/reload; `%TEMP%/mpf-shot-workspace-chdQrm` |
| `node scripts/verify-cinematic-shot-workspace.mjs --authoring` | TH/EN, 390/820/1440, portable packet and inherited direction once; default/fashion/creative text contrast >= 4.5; `%TEMP%/mpf-shot-workspace-fdVXJO` |

Reuse existing CinematicSeries/ShotAuthoring/compiler/provider-recipe tests, UI
component tests and isolated browser runners. No separate all-in-one test framework.
Run one touched slice plus minimum affected contracts, not the entire suite.
Mock paid providers; never invoke live AI, alter real projects or restart workers
as part of automatic verification. A separately approved live Look/continuity trial
is required for visual quality/model compliance; do not claim it from prompt tests.

For reorder/continuity performance, capture current list/context build baseline;
target bounded sibling lookup and no per-item network waterfall. Do not invent a
performance gain without measurement. Avoid a new persistent summary cache; if
one becomes necessary, document actor key, limits, source revisions and invalidation.

Measured context-builder sample: 120 Chapters of 50,000 characters, 30 runs,
average 14.59 ms; 5,889-character context for the sample with no authored prior
facts. This is an isolated sample, not a before/after improvement claim or a
provider-token benchmark. No new persistent cache or polling loop was introduced.

## 5. Handoff And Open Decision

Each completed task records changed files/config, small commands, results, UI
screenshots, runtime gaps and remaining risk here. User-facing work is reviewed by
UX; cross-layer implementations add Backend/QA; private media export also gets
security/privacy review. Commercial review is required if a later slice changes
actual billable behavior, not merely exposes the unchanged existing cost.

Q1 confirmed: empty Chapter revision improves the selected Chapter only. Scene
processing remains a separate explicit action. Implementation approved.

## 6. Delivery Evidence And Remaining UAT

Primary role: Product Requirement Architect. UX/Cinematic and Backend/QA/security
checks were applied sequentially; no independent subagent review was available.
Triggered skills: review-product-ux, design-cinematic-experience,
review-generative-media-pipeline, implement-generation-workflow and
verify-release-regressions. This task does not change prices or settlement.

New files and ownership:
- Cinematic: `server/domain/cinematic/CinematicAuthoringContinuity.js` and
  `CinematicProjectVideoDirection.js`; invoked through existing application owners.
- Cinematic UI: `web/src/features/cinematic/components/CinematicPortableShot.tsx`
  and its focused test; `test/cinematicAuthoringContinuity.test.js`.
- Character Looks: `server/config/prompt-recipes/character-looks/look-sheet.v5.json`.
- Requirement 014 and this packet. Architecture registration is updated in
  `requirements/099-technical-dept/000-master.md`.

Extended owners: CinematicApplicationService/SeriesService, FullStoryService,
ShotDocumentCompiler/VideoPacketCompiler/VideoReferencePlanService, cinematic
routes/repository projections, API/Zod contracts, Chapter/Scene/Shot/Setup and
Character UI, CharacterLookService/Repository, scoped cinematic CSS, TH/EN catalogs
and existing focused runners. No files moved and no runtime storage paths changed.
Existing unrelated working-tree changes are outside this packet.

Remaining limits are explicit, not acceptance closure:
- Real generated Look layout/crop alignment and AI continuity quality require
  separately authorized live UAT; no paid generation was run.
- Native Thai IME, 200% zoom/text-spacing and broader assistive-technology checks
  remain open. Portrait centering does not detect off-center faces in source images.
- Prior facts use explicit exit/prop state plus bounded context excerpts. Automatic
  unresolved-fact extraction and semantic audio-conflict detection are deferred.
  Prompt direction does not independently switch provider audio controls.
- Portable packets require a saved Shot; normal draft prompt Copy remains usable.
  Partial export of remaining authorized references is now implemented in
  [task 015](015-cinematic-flow-hardening.md), with per-slot issues and unsafe-numbering
  protection. Clipboard support varies;
  per-image Download is the fallback. Export does not bypass paid-generation caps.
- Optional light reading/font preferences remain deferred. No full-suite run,
  production build or live-provider test is claimed. Existing unrelated duplicate
  locale keys were not cleaned up in this scoped change.
