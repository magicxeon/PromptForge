# 001 - Shared Foundation

Screen: shared. Status: In progress; the UX01 list/context slice is verified while
the remaining shell, hierarchy and Shot contracts stay pending.
Parent tasks: T00.1, T00.2, T00.3, T00.4, T00.5, T01.1, T01.2, T01.3, T01.4,
T01.5, T01.6, T02.1, T02.3, T02.5.
Sources: [002 contracts](../002-project-contracts-and-configuration.md),
[010 boundary](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic platform/UI integration; Backend/UX/QA reviews per affected task.

## Scope And Entry

Prepare only the contracts needed by the next screen. RW00.01-RW00.03 unblock the
Project library. Chapter mutation, Shot schema and migration work can follow before
their respective consumers; they must not hold up an isolated layout preview.
Prior implemented config/hierarchy work is inspected and extended, not rebuilt.

Integration owns `web/src/features/cinematic/routes/`, `api/`, `schemas/`, shared
workspace header/navigation, `server/domain/cinematic/` facade, existing Cinematic
repository and `server/config/cinematic/`. New visual page modules stay with their
page owners. Config loader/API/schema changes are serialized through this packet.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW00.01 | Inventory active callers, existing verified foundations and protected Engine/Render/Queue/Final UI; capture source/Shot/Take and request baselines. | Same stable IDs; completed/pending/failed screenshots at three widths; R04 baseline | In progress: Project-list callers and protected boundaries inspected; broader Shot/Take baseline remains |
| RW00.02 | Agree minimal Project summary, route context and actor-scoped selection/draft DTOs. Reuse root/Chapter projection and safe config manifest. | Existing/new/standalone IDs resolve; false overrides retained; no private asset payload in summary | Verified for Project Library and additive New Project draft/create contracts; later DTOs follow their consumers |
| RW00.03 | Create one-mode project shell/header, Story/Production/Final navigation and return-context contract. | Old links resolve; actor switch clears drafts; normal users cannot see diagnostics; global Job Center unchanged | Planned |
| RW00.04 | Complete Chapter/Season versioned commands and bounded detail projections when Story needs them. | Conflict/cross-owner rejection and atomic membership; optional Season; no media movement | Planned |
| RW00.05 | Define canonical Shot document, asset binding, derived projection and expected-version contracts before Scene/Shot integration. | One editable authoring truth; provider/quote state remains derived; historical receipts readable | Planned |
| RW00.06 | Prepare dry-run and additive migration/rollback on fixture copies with mapping/version evidence. | Rerun idempotent; no lost media/IDs; no live migration from a test | Planned |
| RW00.07 | Register focused page test groups incrementally in the existing runner, keeping the aggregate explicit and deduplicated. | Unknown groups fail; help lists only implemented groups; no paid calls or process restarts | In progress: `rewamp-projects` and `rewamp-new-project` registered and passing |
| RW00.08 | Standardize pending Button feedback through the shared Button/ProcessingSpinner contract. | `loading` disables duplicate submission, sets `aria-busy` and uses the Momelo warning-yellow spinner without changing button dimensions | Verified locally |

## Review And Verification

Reviewable first slice: shared shell plus project-list DTO ready for UX01. No need
to wait for RW00.04-RW00.06 to inspect that screen. Shell changes preserve global
navigation and current Render/Queue dimensions.
Use `rewamp-config`, `rewamp-hierarchy` and `rewamp-ui` only for changed contracts;
register page selectors before use. Migration fixture checks belong to
`rewamp-migration`. Record missing tests as gaps, not proof from group names.
Closure: C01-C05 and shell portions of U01/U04/U06/U07/R04/R05 as consumers land.

## Feedback And Evidence

### 2026-09-19 - UX01 foundation slice

- Role: UX/UI Product Designer with product UX review; Backend contract changes were
  limited to the existing Cinematic repository and list projection.
- `CinematicProjectRepository.listForActor` now returns a bounded Project-library
  projection. Series Chapters group under one Project row and retain the latest
  valid Chapter as `resumeContext`; standalone Projects remain standalone.
- The projection exposes identifiers, safe local thumbnail, actual approved-Take
  clip counts and resume stage only. It does not embed prompts, attempts, Base64 or
  private provider payloads.
- Actor-scoped Project list/detail query keys are centralized in `queryKeys.ts`.
- Protected Engine, Render and Queue modules were inspected and not modified.
- Focused runner: `node scripts/test-cinematic-video.js rewamp-projects` passed.
- Remaining foundation work: complete the one-mode shell/navigation contract,
  actor-owned draft clearing, Chapter mutation, canonical Shot and migration tasks.

### 2026-09-20 - UX02 foundation slice

- Added server-owned Project creation formats, aspect ratios and Story periods with
  fail-closed configuration validation and matching public schemas.
- New Mini Series creation uses the existing Series workspace repository transaction
  to create its root, Season 1 and Chapter 1 atomically. Standalone Movie persistence
  remains on the existing Project repository path.
- Story preparation provenance is bounded by the Cinematic application service and
  stored on the initial Story Source; it is not accepted as editable setup state.
- `rewamp-new-project` is registered as a focused, no-provider-call verification group.

### 2026-09-20 - Shared pending Button feedback

- The shared `Button` accepts a `loading` state, prevents duplicate submission,
  exposes `aria-busy` and renders the existing `ProcessingSpinner` without changing
  the control dimensions.
- The Momelo warning-yellow spinner remains visible at full opacity while its Button
  is disabled. Feature-local pending icons were removed from the changed Story flow.
- Focused unit coverage passed through `node scripts/test-cinematic-video.js
  rewamp-chapters`; targeted ESLint and TypeScript no-emit also passed.
