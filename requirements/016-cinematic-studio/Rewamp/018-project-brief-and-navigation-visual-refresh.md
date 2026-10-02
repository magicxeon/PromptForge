# 018 - Project Brief And Navigation Visual Refresh

Date: 2026-10-01. Owner: Cinematic Studio presentation.
Primary: UX/UI Product Designer. Reviewers: UX Expert subagent and QA.
Status: implemented; isolated component/browser checks passed. Live app-shell UAT pending.
Extends task 003 and requirement 017 without changing their business contracts.

## Scope And Acceptance

1. Story / Characters remain separate React Router destinations. The user-approved
   compact Project Header replaces the 75/25 tab bar entirely (including 017's
   earlier ratio requirement). Left: project title and localized current location.
   Right: one content-width Characters link; on Characters, Back to story restores
   the actor/project-scoped route and search context. No selected-tab styling or
   aria-current on a link to another destination. Keep visible keyboard focus and
   a 44px minimum target; on mobile wrap the link below the title, left-aligned.
   Long titles wrap without overflow. Existing child headings/status/actions stay.
2. New Project and saved Project Brief share the same composer. Group title,
   import controls and native Story idea editor in one rounded authoring surface.
   Keep Essentials and Settings as existing collapsible sections. Use 8px maximum
   radii, quiet borders and consistent label/icon spacing, not nested cards.
3. Format and Orientation use clearly separated native radio choices with icons,
   readable text and an explicit checked marker. Keep configured options and
   current values. Arrow-key selection, labels, pending disablement and focus must
   work. Do not restyle the shared file-import destination controls accidentally.
4. Keep imported-file attribution and collapse/edit behavior, genre maximum/order,
   duration/Season/Chapter controls, textarea content, offline/errors/save feedback,
   manual Draft, explicit AI consent and Full Story continuation unchanged.
5. Check TH/EN, default/fashion/creative themes and 390/820/1440 widths. No clipped
   labels, overlap, horizontal overflow or color-only selected state. Preserve
   reduced-motion support and native textarea editing.

Protected: Full Story/Chapter/Scene/Shot content, Characters page interiors,
Engine, Render, Queue, Credits, provider contracts and live runtime data.
No new API, persistence, dependencies, pricing or generation paths.

## Implementation Plan

| Task | Scope | Acceptance | Status |
|---|---|---|---|
| BV01 | UX review before changes | Concrete design for navigation, brief and selectors; preserve adjacent behavior | Reviewed by UX Expert Russell before source edits |
| BV02 | Navigation and composer presentation | Existing components/CSS, shared labels and tokens; no duplicated workflow | Implemented |
| BV03 | Focused regression and browser checks | Composer/import/navigation tests; responsive/theme screenshots and keyboard checks | Passed |
| BV04 | QA review and handoff | Document evidence, affected files and live-UAT limitations | UX visual pass; QA conditional pass, live app-shell UAT pending |
| BV05 | Replace tabs with compact project header | UX Expert Bohr reviewed before edits; single-link round trip, locale/theme/mobile and long-title checks | Implemented; focused automated/browser checks passed |

Canonical implementation: existing `CinematicProjectNavigation.tsx` (unchanged
route logic), `CinematicNewProjectComposer.tsx` under
`web/src/features/cinematic/components/` and `web/src/styles/cinematic.css`.
Reuse current translation keys.
Test ownership: adjacent component tests and
`scripts/verify-cinematic-rewamp-new-project.mjs`; isolated browser mode must not
call real API/providers, mutate live data or restart workers.

Focused component command:
`node scripts/test-cinematic-video.js rewamp-brief-018`

The existing runner includes this group in explicit `rewamp-all` for later UAT;
the aggregate was not run for this focused presentation change.

Browser command (Playwright Chromium required):
`node scripts/verify-cinematic-rewamp-new-project.mjs --isolated`

Supporting checks: `npm --prefix web run typecheck`, scoped ESLint and
`git diff --check`. These groups are explicit; do not run the full cinematic suite.

## Evidence

BV05 supersedes the previous tab sizing/visual evidence below. Reuse the existing
navigation component, router return state and focused runners. Add localized Back
to story copy in TH/EN, remove dead tab CSS, update navigation/route tests and both
browser harness consumers. No new source module, persistence or API is needed.

### BV05 Verification

- `node scripts/test-cinematic-video.js rewamp-brief-018`: 33 tests passed,
  including route integration and prior actor/project return-context checks.
- `node scripts/verify-cinematic-rewamp-new-project.mjs --isolated`: passed
  TH/EN x three themes x 390/820/1440; one compact link, keyboard activation,
  visible focus, long project title, import/settings and responsive checks.
  Evidence: `C:/Users/punya/AppData/Local/Temp/mpf-rewamp-new-project-77n7Pw/`.
- `node scripts/verify-cinematic-shot-workspace.mjs --project-header --isolated`:
  passed the same matrix with real Full Story and Characters components;
  entered Characters, returned to Story and restored the unsaved draft using
  the existing recovery action. This flag skips unrelated Look/First Frame work.
  Evidence: `C:/Users/punya/AppData/Local/Temp/mpf-shot-workspace-kiR2Ph/`.
- Typecheck, scoped navigation/route ESLint and diff whitespace checks passed.
- Changes: navigation component/test, route test, scoped CSS, TH/EN back-link key,
  both existing browser runners and existing focused test group. No files moved,
  no new runtime paths, no provider calls or live Project mutations.
- Existing frontend still listens at 6502; backend 6500 remains unavailable.
  Complete production-shell/persisted-data UAT remains pending. All child page
  headings, status indicators, document controls and Story Assistant are unchanged.

UX Expert reviewed all three sections before source changes, recommending native
radio choices, neutral readable labels, scoped selectors, 8px framing and preserved
75/25 route controls. The import preview is flattened inside the authoring surface
to avoid nested decorative frames. No translation text or runtime schema changed.

### Verification Results

- Focused group: 24 tests passed (12 Composer, 7 project-navigation and 5 import).
  Existing import/edit, offline, genre/duration and navigation isolation coverage
  remained green. Added native-radio grouping and pending disablement coverage.
- TypeScript, scoped ESLint and `git diff --check` passed.
- Isolated browser: TH/EN x 390/820/1440 x default/fashion/creative, both create
  and saved Brief variants. Verified body overflow, 75/25 controls, single-line
  navigation labels, 48px targets, keyboard selection for both radio groups,
  visible focus, pending/offline state and disclosure behavior.
- Real browser File input read a fixture `.md`, rendered its preview, switched
  destinations and applied a replacement Brief while preserving file attribution
  and collapse/edit behavior. Runtime/provider APIs and external traffic blocked;
  static flags served from repository assets. Reduced-motion preference enabled.
- Screenshot evidence (48 files):
  `C:/Users/punya/AppData/Local/Temp/mpf-rewamp-new-project-3T5qdo/`.
  Visual review caught and fixed mobile English Characters wrapping, then reran
  the matrix with an explicit one-line-label assertion.
- Independent QA found no confirmed scoped code regression; conditional pass
  retains the live app-shell gap. UX Expert reviewed the design before editing
  and inspected the final mobile/tab/tablet/import screenshots: visual pass with
  no blocking issues. Browser interaction runs were performed by the main agent.

### Changed Files And Ownership

- `web/src/features/cinematic/components/CinematicNewProjectComposer.tsx`:
  framed authoring section, label icons and native exclusive choices.
- Its existing `.test.tsx`: radio semantics and pending controls.
- `web/src/styles/cinematic.css`: scoped Brief/selection/navigation treatments;
  preserve shared import selector styling and sibling writer layouts.
- `scripts/verify-cinematic-rewamp-new-project.mjs`: isolated visual/interaction
  mode; `scripts/test-cinematic-video.js`: selectable `rewamp-brief-018` group.
- This requirement, Rewamp master and task index: scope, plan and evidence.

No source files moved. No runtime data paths, localization keys, API contracts,
dependencies, provider calls or Credit behavior changed.

### Remaining Manual Check

The frontend dev server is available at `http://localhost:6502/create/cinematic/new`.
At verification time API port 6500 was not listening. Therefore persisted save,
live Project reopening and the complete production app shell remain unverified in
this run. No workers were restarted. With the normal backend running, open a saved
Project Brief, switch Story/Characters and return, edit/import a Brief and save,
then reopen it. Verify sidebar-constrained tablet layout and existing consent.
