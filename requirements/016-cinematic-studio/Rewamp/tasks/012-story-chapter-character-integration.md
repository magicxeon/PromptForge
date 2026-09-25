# 012 - Story, Chapter And Character Integration Plan

Status: Core flow and the 2026-09-21 feedback iteration are implemented. Focused
checks and responsive browser verification passed; deferred items remain explicit.
Owner: Cinematic Studio; primary Product Requirement Architect; UX and Backend/QA
reviews are applied at their implementation gates.
Requirement: [011](../011-story-chapters-and-shared-characters.md).
Extends packets 001, 004, 005 and 006; does not repeat completed foundation work.

## Ordered Tasks

The original SC-T tasks and evidence below describe the earlier delivery. For the
next iteration use SC-F01-SC-F07 below, which supersede T04/T06 initial-generation
navigation, T09 Full Story tabs and the optional-only generated Character behavior
in T10/T12. Other incomplete work retains its original owner/status.

Each row is one independently reviewable task. Finish its focused evidence before
advancing to a dependent row.

| ID | Task and concrete output | Dependencies | Acceptance / focused check |
|---|---|---|---|
| SC-T01 | Inspect affected Project read-only; classify Chapter records/prose/provenance and available saved results; document recovery evidence and absence of evidence | None | Verified: no recoverable generated content; evidence below |
| SC-T02 | Define additive revision, proposal, mapping and operation-status DTOs; explicit server eligibility/recovery reasons; reconcile configuration bounds | T01 | SC02/SC09; Zod/domain parity; invalid input and owner checks |
| SC-T03 | Add per-Chapter revision save/read/restore through Series owner; migrate existing prose into one baseline on controlled write | T02 | SC05; 10/11 rotation, retry, pinning, stale version and empty legacy Chapter fixtures |
| SC-T04 | Split initial create and explicit regeneration into proposal/apply contracts; reuse text execution and persisted operation recovery | T02,T03 | SC02/SC09; preflight before provider; no overwrite on generation failure; retry Apply idempotent |
| SC-T05 | Implement stable-ID Chapter mapping and atomic regeneration Apply; preserve excluded Chapters and media reachability | T04 | SC03; changed count/order, repeated titles, production-bearing and unmatched Chapters |
| SC-T06 | Update Chapter page empty state, regeneration review, Apply navigation and history panel | T03,T05 | SC01/SC02/SC08; empty versus generated, reload, focus, failed apply |
| SC-T07 | Add selected-Chapter AI proposal using current draft, saved base, Full Story and bounded adjacent context; preview and scoped Apply | T03,T04,T06 | SC04; long prompt, conflict, wrong-Chapter result, dirty draft and failure retention |
| SC-T08 | Add Project Character authority and Chapter usage contracts; additive lineage mapping for legacy Cast copies | T02 | SC06/SC09; stable ID, no name-based merge, ambiguous-copy preservation, atomic add-and-link |
| SC-T09 | Build shared Characters panel and edit surface on Full Story/Chapter; preserve writing state across panel navigation | T06,T08 | SC06/SC08; add from either page, select existing, return focus and unsaved draft |
| SC-T10 | Connect Analyze Characters proposals and explicit create/link/update acceptance using existing role analysis | T07,T09 | SC06; duplicates/aliases, uncertain mentions, stale proposal, no silent prose edits |
| SC-T11 | Connect Look selection, full-sheet preview and existing image generation; show current/review-needed Look and keep production pins | T09 | SC07; asset ownership, no image requirement for prose, existing quote/dispatch parity |
| SC-T12 | Wire Character context into Chapter/Full Story proposals; add optional incorporation proposal and targeted cache refresh | T07,T10,T11 | SC04/SC06; new Chapter Character visible in Full Story but prose changes only on Apply |
| SC-T13 | Responsive/theme/localization review, migration rehearsal, focused integration and obsolete duplicate-control cleanup | T01-T12 | SC01-SC09; 390/820/1440px TH/EN, keyboard, one-Chapter Movie, multi-Chapter Series, existing media |

## Implementation Boundaries

1. T01 delivers a diagnosis, not an assumption that earlier generation succeeded.
   If content exists, propose a traceable repair through the owner; if absent, the
   empty state and explicit generation are the recovery path.
2. T02-T05 land domain/API/schema/config together. Existing shared mutation facade
   and Series transaction own atomic changes. A proposal pins its input revisions;
   response arrival does not authorize overwriting newer edits.
3. T06 delivers the first visible Chapter improvement before Character UI is built.
4. T07 completes scoped Chapter assistance using existing Character context; T12
   connects the expanded shared library without rebuilding the AI workflow.
5. T08 requires a documented canonical Project root resolution for both Series and
   standalone Movies. A copied legacy Cast record is not automatically a shared ID.
6. T09-T11 reuse asset/picker/generation controls. If billable behavior changes,
   Backend, Commercial and QA gates apply; do not invent pricing or quote bypasses.
7. T13 deletes only obsolete agent-owned controls after callers and compatibility
   tests prove replacement. No original Draw.io, historical documents or media deletion.

## Verification Plan

`scripts/test-cinematic-video.js` retains `rewamp-chapters` and `rewamp-full-story`
and now exposes `rewamp-chapter-revisions`, `rewamp-chapter-proposals` and
`rewamp-shared-characters` as selectable focused groups. The explicit Rewamp UI
aggregate includes the Full Story and Chapter writer checks.

Use fixture repositories and mocked text/image adapters. Run only the changed
group after each task. Check schema, locale parity and affected TypeScript contracts
when their inputs change. No automatic full-suite run, paid generation, live-data
mutation or worker restart as part of tests.

Extend `scripts/verify-cinematic-rewamp-story-writer.mjs` for the new panel and
proposal states using intercepted APIs. Capture desktop/mobile/tablet screenshots,
overflow/focus checks, empty/error/pending states and protected sibling controls.
Live UAT later covers one initial generation, one all-Chapter regeneration, one
scoped revision, one restore and one Character added from Chapter with a Look.

## Per-Task Evidence

Record task ID, changed owner/modules, acceptance IDs, commands/results, screenshots,
remaining gaps and next task. Schema/fixture tests do not prove live AI quality.
Current evidence is recorded below. No paid generation or live-data repair was run.

### 2026-09-20 - SC-T01 affected Project diagnosis

- Read-only inspection of Series `cineseries_1789887754253_9ozywfyl` found two
  active Chapter Projects. Both have empty `chapterTitle`/`chapterStory`, no
  `chapterGeneration`, no Scenes, no Attempts and no Cast.
- The confirmed Full Story belongs to Chapter 1
  `cineproj_1789887754253_6diarucv`: two Full Story revisions exist and revision 2
  is active/confirmed. The route reported by the user points to Chapter 2
  `cineproj_1789898986375_68ud7may`, whose `chapterOrigin.projectId` correctly
  points to Chapter 1 but which has no local Full Story revisions.
- The prior 409 occurred before text-provider dispatch because the initial-create
  guard treated the second empty Chapter as existing work. There is no persisted AI
  Chapter proposal or generated prose to recover. The correct recovery is an explicit
  proposal from Chapter 1's confirmed Full Story, mapped onto the two existing IDs.
- No runtime record or provider operation was changed during diagnosis.

### 2026-09-20 - SC-T02 through SC-T09 and SC-T12 core implementation

- `CinematicChapterAuthoring.js` owns bounded active-plus-ten revision rotation,
  restore-as-new-head, proposal snapshots and projections. Project normalization is
  additive; current `chapterTitle/chapterStory` remain the compatibility projection.
- Chapter generation now returns a persisted review proposal. Apply validates pinned
  Full Story/Chapter revisions, maps by stable Project ID, preserves unmatched and
  production-bearing Chapters, and is idempotent on retry. Selected-Chapter AI uses
  bounded Full Story, current/adjacent Chapter and Character context.
- Full Story and Chapter writers expose Generate/Regenerate, preview, Apply/Discard,
  History/Restore and the shared Character panel. UI checks cover 390/820/1440px in
  Thai and English without horizontal overflow.
- Shared Character add/link is one Series transaction. Selecting an existing reusable
  Character uses the current Character Library and server authorization, pins its
  Profile version on the Story Project, links the Chapter stable ID, and projects the
  canonical assignment into Chapter reads without durable duplication.
- Focused evidence: `node --test test/cinematicFullStory.test.js test/cinematicSeries.test.js`
  passed 17/17; targeted Vitest passed 10/10; app TypeScript no-emit check and locale
  parity passed. Browser verification passed at all six locale/viewport combinations.

### Remaining ordered work

- SC-T04 partial: proposal persistence is complete; a provider request interrupted
  before response still needs the shared durable text-operation recovery contract.
- SC-T08 partial: canonical root/stable Chapter links are complete; ambiguous copied
  legacy Cast lineage remains review-only and is not auto-merged.
- SC-T10 remains: Analyze Characters must persist create/link/update proposals with
  mention evidence and explicit acceptance.
- SC-T11 partial: current selected images and Profile selection are available. Full
  approved-Look picker/preview and billable generation orchestration remain with the
  existing Profile Look workflow and have not been embedded in this panel.
- SC-T13 partial: responsive, localization and focused regression checks passed;
  migration rehearsal and obsolete-control cleanup remain pending.

## 2026-09-21 Feedback Iteration

Primary: Product Requirement Architect. UX reviewer: `review-product-ux` and the
UX/UI Product Designer charter, applied sequentially by the same agent. No
independent-agent review is claimed. QA is required when implementation lands.
Source of truth: requirement 011 sections 3, 4, 6, 7 and 10, SC10-SC16.

### Ordered Delivery Tasks

| ID | Work | Dependencies | Focused acceptance | Status |
|---|---|---|---|---|
| SC-F01 | Define persisted Season/Chapter targets, derived totals and server-owned bounds; update Setup/create/read DTOs and defaults together. Targets do not eagerly create Chapters. | Existing hierarchy/config owners | SC15: off/on Seasons, counts, duration <=120s, legacy reopen and invalid totals | Complete |
| SC-F02 | Generate Full Story with structured Character dossiers; validate references, map existing IDs, atomically save accepted story/Character revision context. Pass canonical Character fields and Setup targets to AI inputs. | F01 | SC11: first generation, edit/discard, retry, reload, stale versions, relationships and uncertain matches | Complete |
| SC-F03 | Add shared Character change/detach/remove commands and row actions; retain narrative names/dossiers, library sources and production evidence. Update Chapter links and actor-scoped caches. | F02 contracts | SC12: detach vs Project remove vs Chapter unlink, missing/foreign source, used Character and retained Look pins | Complete |
| SC-F04 | Implement first-time Generate All as complete validation + atomic initial commit + result navigation; reuse existing proposal/commit internals. Keep explicit Regenerate review, Continue existing work and Manual separate. | F01,F02 | SC13/SC14: all Seasons/Chapters, exact configured totals, partial provider response, retry, concurrent edits, Manual with pending proposals | Complete |
| SC-F05 | Render Setup count controls and Full Story AI Assist/Characters/Build Chapters as sibling right-rail sections; keep History separately collapsible below the workspace. Initial Assist has no revision textbox. Wire both save modes and navigation. | F01-F04 | SC10/SC15: saved values, no competing hidden Apply for initial creation, accessible Character actions, responsive TH/EN | Complete |
| SC-F06 | Reinspect and clear eligible Chapter-only data for the named Project through the repository owner; record counts and verify API reads and cache invalidation. | F04 reset/read contracts | SC16: preserve Full Story/Brief/Characters/root/settings; stop deletion of any newly production-bearing record | Complete |
| SC-F07 | Run only changed test groups, review affected mobile/tablet/desktop states, record limitations and remove replaced Full Story tab controls after callers are updated. | F01-F06 | SC10-SC16 and preserved sibling interactions | Complete |
| SC-F08 | Give Full Story/Chapter long-form output and provider duration separate configured budgets; harden the shared OpenAI structured-output adapter for multiple text blocks, a single JSON fence, incomplete responses and truthful timeout status without automatic replay or raw-content logging. Require an instruction for existing-story revision at both client and server boundaries. | Existing Full Story provider contract | SC17: empty revision cannot submit; initial generation still works; complete wrapped/multi-block JSON parses; token-limit truncation returns sanitized 502 diagnostics; the long-form deadline returns 504; malformed JSON remains distinct | Complete |

Do not block F02's required Character dossiers on a separate optional Analyze button
or image-generation embedding from SC-T11. Standalone Analyze, generated Look UI,
durable interrupted-provider recovery and legacy lineage migration remain tracked
follow-ups; do not silently relabel them completed in this iteration.

### Planned Code Touchpoints

These are future implementation targets, not files changed by this documentation task.
Reinspect current ownership before editing and extend existing contracts.

| Area | Canonical files | Purpose |
|---|---|---|
| Setup configuration | `server/config/cinematic/workflow-policy.v1.json`, `server/config/cinematicRewampConfiguration.js` | Publish defaults/bounds for planned counts; retain configured duration options. |
| Setup UI/contracts | `web/src/features/cinematic/components/CinematicNewProjectComposer.tsx`, `web/src/features/cinematic/schemas/cinematicSchemas.ts`, `web/src/features/cinematic/state/cinematicDraftStorage.ts` | Same inputs for new/saved Project; actor-scoped recovery and DTO parity. |
| Cinematic use cases | `server/domain/cinematic/CinematicApplicationService.js`, `server/domain/cinematic/CinematicSeriesService.js`, `server/domain/cinematic/CinematicChapterAuthoring.js` | Initial complete generation, versioned Character commands, stable identity, atomic acceptance, reuse existing regeneration logic. |
| Persistence | `server/repositories/cinematic/cinematicProjectRecord.js`, `server/repositories/cinematic/CinematicProjectRepository.js` | Additive target/revision normalization and owning transactions; no parallel store. |
| AI text | `server/domain/generation/CinematicFullStoryService.js`, `server/providers/OpenAITextProvider.js`, `server/config/prompt-recipes/cinematic/full-story.v1.json`, `server/config/prompt-recipes/cinematic/full-story-chapters.v1.json` | Structured dossiers plus prose, full configured plan, bounded context and complete-count validation. |
| HTTP/client boundaries | `server/app/routes/cinematicRoutes.js`, `web/src/features/cinematic/api/cinematicApi.ts`, `web/src/features/cinematic/api/cinematicSeriesApi.ts`, `web/src/features/cinematic/schemas/cinematicSeriesSchemas.ts` | Extend actor/version/idempotency and response contracts; keep provider calls off the UI. |
| Writer UI | `web/src/features/cinematic/components/CinematicFullStoryWriter.tsx`, `web/src/features/cinematic/components/CinematicSharedCharactersPanel.tsx`, `web/src/features/cinematic/components/CinematicChapterWriter.tsx` | Separate sections, dossier preview/save, Character actions, complete navigation, explicit pending-proposal review. |
| Presentation | `web/src/styles/cinematic.css`, `client/i18n/locales/en/cinematic.json`, `client/i18n/locales/th/cinematic.json` | Scoped layout, shared Momelo controls, labels and locale parity. |
| Focused verification | `test/cinematicFullStory.test.js`, `test/cinematicFullStoryService.test.js`, `test/cinematicSeries.test.js`, colocated writer/Setup tests, `scripts/test-cinematic-video.js`, `scripts/verify-cinematic-rewamp-story-writer.mjs` | Real behavioral assertions for changed groups; intercepted responsive checks, no paid provider calls. |

### Verification And Recovery Notes

- Run `rewamp-new-project`, `rewamp-full-story`, `rewamp-chapter-proposals` or
  `rewamp-shared-characters` only when their corresponding code changes. Avoid
  rerunning equivalent groups where they cover the same files; inspect runner
  membership before execution. Do not run the full suite for this iteration.
- Verify total/count metadata against actual persisted Chapter content and IDs;
  opening Chapter 1 is not proof that all Chapters were created.
- Verify generated Character fields use the current Cast schema (`displayName`,
  `storyRole`, dossier fields). The inspected Chapter context builder references
  older names; correct that mapping before asserting Character continuity.
- Inspect 390/820/1440px and TH/EN with initial, generated, saved, pending, failed,
  Manual and removal states. Reuse shared Button, ProcessingSpinner, StatusNotice
  and Character pickers. Keep keyboard focus/unsaved story through panel actions.
- Project reset is live maintenance separate from automated tests. Read back from
  the API, invalidate affected actor-scoped caches, and record only counts/IDs and
  preservation checks. No raw story or private image payload in the evidence log.
- Rollback of presentation must retain additive Character/revision mappings,
  existing Chapter current-text projections and old media evidence. Do not replay
  generation or reset data as part of rollback.

### Implementation Evidence (2026-09-21)

- Setup now persists bounded Season and Chapter targets. Full Story generation
  returns provisional Character dossiers; accepted prose and Character mappings
  are stored in one Project repository transaction.
- Initial Generate All rejects partial provider results, commits the complete planned
  Season/Chapter set in one Series transaction and opens Chapter authoring. Existing
  work shows Continue; regeneration remains an explicit Chapter-page review flow.
- Character change preserves the narrative name. Detach returns to a dossier without
  deleting the external library source; remove archives the Project assignment and
  unlinks Chapters while production evidence remains retained.
- Project `cineproj_1789887754253_6diarucv` was reinspected immediately before reset:
  no Scene or Attempt existed. Three pending Chapter proposals were removed; zero
  Chapter revisions/children were removed. Read-back preserved one Full Story
  revision, one active Character and the Project Brief.
- Focused server checks passed 22/22. Focused React checks passed 14/14. App and Node
  TypeScript no-emit checks, JSON parsing and TH/EN locale parity passed. Browser
  verification passed TH/EN at 390/820/1440px with no horizontal overflow.
- The browser review and QA review were applied sequentially by the same agent; no
  independent parallel reviewer is claimed. No paid generation request was made.
