# 002 - Project Library

Screen: UX01. Status: Implemented and verified; awaiting user review. Parent tasks: T02.6.
Sources: [010 UX01](../010-complete-authoring-screen-redesign.md), [task index](000-task-index.md).
Owner: Cinematic project-entry UI; UX/QA review.
Depends on RW00.01-RW00.03 minimal list/context contracts. No Story AI or asset work
is required. A fixture-based layout can be reviewed before API integration.

## Scope And Ownership

Replace the existing `CinematicProjectList` presentation in
`web/src/features/cinematic/routes/CinematicStudioRoute.tsx` with a focused component
under the existing Cinematic components owner. Reuse `listCinematicProjects`, actor
queries, route builders, authorized thumbnails and shared loading/error controls.
Changes to route wiring/API schemas go through packet 001. No Render/Queue edits.

## Small Tasks

| ID | Work and output | Focused acceptance | Status |
|---|---|---|---|
| RW01.01 | Build compact project rows and New Project header using fixture summaries. | Name, real progress and resume context readable; no fabricated covers/progress | Verified |
| RW01.02 | Connect bounded owner-scoped list and explicit resume/open route. | Correct root/Chapter context; missing saved entity falls back to valid parent; no cross-actor cache | Verified |
| RW01.03 | Implement empty/loading/error/retry and mobile row behavior. Use supported menu commands only. | Entire row opens without nested controls; keyboard/focus works; no unsupported action | Verified |
| RW01.04 | Verify the page and record first review, then apply local feedback. | UX01/R01/R08, three widths and Thai/English; existing projects remain reachable | In review: automated and UX checks passed; user review pending |

## First Review And Closure

Demonstrate an empty library, a populated library and resuming a real fixture Project.
New Project opens the draft destination; list navigation does not start generation.
The page may be reviewed after RW01.01; it is usable only after RW01.02-RW01.03.
Planned focused group: `rewamp-projects`, registered through RW00.07. Cover resume,
owner switching, retry and a long Thai title. Check protected global Job Center still
appears. Do not run the full provider suite for library styling.

## Feedback And Evidence

### Project Rename Consistency Follow-up

Status: implemented and focused checks passed. Primary: Backend Platform Architect; QA review sequentially
by the same agent (no independent reviewer). Skill: verify-release-regressions.
Owner: CinematicApplicationService.updateSetup and CinematicSeriesService inside
the existing Cinematic capability; repository projections and actor-scoped React
queries remain canonical. No UI redesign, new storage or provider calls.

Observed causes: Setup updates Project.title while grouped library/workspace reads
Series.title; Setup success updates only the detail query, leaving the library's
20-second fresh cache intact. Modern Mini Series root is the whole-story Project,
not the most recently edited Chapter. Preserve legacy grouped standalone titles.

Ordered fix and acceptance:
1. Save Setup and its root Series display title atomically, retaining expected
   version/actor checks. Series rename also keeps the modern root name in sync.
   Child/Season renames must not rename the root; Chapter titles, story, media and
   IDs remain unchanged. Modern root title is authoritative in list/workspace
   projections so previously saved names display correctly without a data migration.
2. Centralize Setup-success detail publication and invalidate only this actor's
   project list/Series queries for autosave, explicit Save and save-before-navigation.
   No new polling/cache or cross-actor writes.
3. Add focused rename regressions: fresh repository reload, modern/legacy series,
   standalone, child/Season isolation, stale version rollback, actor rejection and
   fresh-cache return to the library. Register a small selectable runner group;
   no full suite, live mutations, AI requests or generated build artifacts.

Evidence: `node scripts/test-cinematic-video.js rewamp-project-rename` passed
5 backend and 3 route/cache tests. Direct TypeScript no-emit check and
`git diff --check` passed. Existing grouped legacy thumbnail/progress/resume
behavior remains covered. No layout/CSS change; responsive browser screenshots
were not repeated for this data-only fix, and live-project behavior awaits UAT.

Files: `CinematicApplicationService.js` delegates Setup persistence to the existing
`CinematicSeriesService.js` using one actor-scoped workspace transaction;
`CinematicProjectRepository.js` and Series workspace project the modern root's
`setup.format`/title (top-level `format` remains the legacy production-unit field).
`CinematicStudioRoute.tsx` shares Setup-success query publication across save paths.
Regression cases extend `test/cinematicSeries.test.js`, with a new owning route test
at `web/src/features/cinematic/routes/CinematicStudioRoute.test.tsx` and the existing
selectable runner. No new runtime data field/path or production data rewrite.

### 2026-09-19 - First implementation review

- Review URL: `http://localhost:5173/create/cinematic`.
- The route now uses `CinematicProjectLibrary`: a compact whole-row link with the
  Project title, Chapter/workspace resume context, actual approved/total clip count,
  status and last-edited date. It does not fabricate cover art or percentage progress.
- Series Chapters are grouped under their root Project. The most recently updated
  Chapter is the production unit opened by the row.
- Empty, loading, error/retry and populated states use shared controls. New Project
  remains visible in the empty state. No list interaction starts Generation.
- Focused validation passed: repository 5/5, React/schema 6/6, direct web TypeScript,
  localization parity and `i18n:validate`.
- Visual validation passed in Thai and English at 390, 820 and 1440 px with no
  horizontal overflow. Screenshots were written to
  `C:\Users\punya\AppData\Local\Temp\mpf-rewamp-projects-7DqMcV`.
- Existing global navigation, footer status, Engine, Render and Queue behavior were
  preserved. The next packet remains blocked on user review of this screen only.
