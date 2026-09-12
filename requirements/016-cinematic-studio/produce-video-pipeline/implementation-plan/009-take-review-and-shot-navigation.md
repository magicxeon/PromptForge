# Take Review And Shot Navigation Delivery Plan

Status: implemented and isolated regression/build/UX gates passed 2026-09-12.
Live-provider pilot remains user-controlled. Binding conflict resolution:
../021-pilot-scope-reconciliation.md.
Primary: Product Requirement Architect.
Implementation reviews: UX and QA; Backend/security before approval or bulk Asset
access changes. Apply sequentially if independent reviewers are unavailable.

## Sources And Dependencies

- 014-shot-video-take-selection.md extends 005 approval lifecycle.
- 015-shot-card-selection-and-reference-preview.md extends 008 shared UI and
  013 optional First Frame without changing source authority.
- 016-clip-bundle-and-dialogue-discussion.md owns approved selected-clip ZIP scope.
- Existing owners: CinematicApplicationService, CinematicTimelineCompiler,
  CinematicDataLineageService; CinematicStageContent, StoryboardSequenceBoard,
  ProduceShotQueue, produceReadModel, shared media viewer and actor Query state.

## Ordered Tasks

Priority: F1-F3 foundations before T1-T4, then P1 packaging, T5 and final T6/020
closure. This avoids repeating mode, authoring and download integration.

- [x] F1 Implement 017 server capability switch and false environment default,
  effective reference-mode UI/quote/payload parity and explicit no-Cast route.
  Preserve old approved stills, Look fallback and active tasks. Test false/true,
  stale quotes, disguised opening references and non-Seedance providers first.
- [x] F2 Implement 018 multi-line Dialogue & Sound using existing cue arrays and
  field manifest. Start with normalization/round-trip tests, then the shared
  editor and all-lines packet compilation; preserve user wording and old cues.
- [x] F3 Finalize 019 opening-intent interpretation, then additive storage/JSON
  planning policy, explicit AI proposal/application and first-Scene checkbox.
  Test no-Cast opening through F1 before claiming pilot readiness.

- [x] D1 Inspect current contracts and separate confirmed requests from proposals.
- [x] D2 Write requirements, compatibility notes, task order and acceptance checks.
- [x] T1 Trace all video-attempt status/approval consumers. Define a bounded
  video-only history read model, stable Take labels and independent preview IDs.
  Test old approved/superseded selection, stale checks, version conflicts and
  downstream invalidation before adding UI. No new source-of-truth selection.
- [x] T2 Add Take list, preview selection and explicit Use this Take action.
  Reuse current approval API; keep latest active task observation separate.
  Test selecting B while viewing A, generation of C, refresh, >8 history items,
  missing files and queue/timeline agreement. Do not mutate billing behavior.
- [x] T3 Extend shared Shot summary with explicit video reference mode through
  both Storyboard and Produce adapters. Avoid guessing from image presence.
  Test persisted toggles, legacy defaults, Shot switches and controlled updates.
- [x] T4 Make full-card selection accessible and add the Look Sheet icon tile.
  Preserve reorder controls, drag actions, status feedback and focus restoration.
  Verify look-only and First Frame on/off with media retained.
- [x] T5 Add EN/TH strings and focused UI/browser regressions. Inspect screenshots
  at 390/820/1440px in both Storyboard and Produce plus representative themes.
  No blank loading surfaces, hidden actions or changed sibling workflows.
- [x] T6 Execute 020 professional UX and pilot flow closure last; review scoped
  diff and record actual evidence, responsive screenshots and remaining UAT risks.
- [x] P1 ZIP scope resolved in 021: finalize bounded packaging details,
  ownership, size/cleanup contracts, then implement isolated packaging tests and
  download UI through the owning facade. No paid generation needed for testing.
- [x] P2 Dialogue scope requested; superseded by F2 and requirement 018. This is
  scope resolution only, not completion of the editor implementation.

## Validation Entry Points

- `node scripts/test-cinematic-video.js pilot`: environment/frame guards,
  text-only packets, cue compilation/opening direction and isolated ZIP fixtures.
- `node scripts/test-cinematic-video.js references`: reference and packet rules.
- `node scripts/test-cinematic-video.js payload`: provider/catalog contracts.
- `node scripts/test-cinematic-video.js flow`: source/transport/task lifecycle.
- `node scripts/test-cinematic-video.js ui`: Takes, immediate processing,
  Scene/Shot controls, cue editing, schemas and authenticated Blob responses.
- `node scripts/test-cinematic-video.js full`: explicit aggregate including
  adjacent approval/version, pricing, timeline and lineage regressions.
- `node scripts/test-playground-video-references.mjs all`: adjacent Playground
  sources, Look Sheet fallback, actor drafts and type contracts.
- `node scripts/verify-cinematic-pilot.mjs`: actual React components in a browser
  with intercepted local fixture APIs. Requires installed Playwright Chromium and
  Vite at `http://127.0.0.1:6501`; override with `CINEMATIC_WEB_ORIGIN`. It aborts
  external/unrecognized API calls and does not create or download live Jobs.
- `node scripts/validate-i18n-catalogs.js`, `npm.cmd run build:web` and
  `git diff --check`: catalog parity, TypeScript/production build and whitespace.

All automated runs fail on error. They do not restart workers, call paid providers
or mutate live Projects. ZIP tests use tiny synthetic local files and inspect
archive bytes. The browser only opens the ZIP manifest and verifies partial
consent, without downloading any user clip.

## Task Evidence

- F1: cinematicPilotPolicy, videoCapabilityRegistry and CinematicProduceRuntime
  cover disabled/enabled policy, non-Seedance compatibility, no-Cast text route
  and retained approved still. Policy guards execute before provider dispatch.
- F2/F3: cinematicApplicationService covers cue/opening save-reload, invalid
  timing/speaker input and opening Scene order. cinematicStoryPlanService verifies
  configured opening guidance and unchanged source until explicit Apply.
  DialogueSoundEditor verifies middle-row editing/reorder without losing siblings;
  packet tests include every cue, delivery/name and unchanged legacy packet shape.
- T1/T2: server approval tests exercise old/new/reselected Take and stale timeline
  invalidation. UI tests preview an older Take while the latest task remains
  observed, explicitly approve it and load history beyond eight items. Pending
  submission shows the shared spinner before refreshed Project props arrive.
- T3/T4: shared card tests plus browser pointer checks prove full-body selection
  and independent reorder controls; Looks/text-only tiles omit saved stills.
- P1: videoClipBundleService covers selected-order manifest, gap consent, version
  conflict, owner/type/probe/hash/path/size checks and a readable ZIP archive.
  Cancellation closes without completing; a file disappearing after preparation
  aborts the archive with a sanitized error rather than serving a partial ZIP.
  No extra runtime storage directory or retained ZIP; limit 128 clips and
  128 MiB media plus bounded manifest/ZIP overhead. Browser Blob memory remains
  a capacity consideration for older mobile devices; individual downloads remain.
- T5: `test-cinematic-video.js ui` passed 50 tests. Browser verification passed
  EN/TH at 390/820/1440px for cards, Scene editor, Produce and partial ZIP consent;
  additional 820px fashion/creative Take screenshots were visually inspected.
  Screenshots: `C:/Users/punya/AppData/Local/Temp/mpf-cinematic-pilot-cbC1jc/`.
- T6: final full aggregate passed 153 backend and 50 UI tests. Adjacent Playground
  aggregate passed (including 55 UI checks). Catalog validation, TypeScript and
  production build passed; `git diff --check` passed. Existing Vite large-chunk
  and test-fixture i18n warnings remain non-fatal, not suppressed by this change.
  Requirement 020 records the conditional live-pilot decision and scoped review.

## Protected Behavior And Review

Retained approved stills, selected Takes on new generation, active task polling,
credit lifecycle/estimates, source ownership, existing Look Sheet fallback,
provider capabilities, actor drafts, card reorder, unrelated Setup/Cast controls
and existing Finish behavior. No file moves, destructive backfill or media deletion.
New owners/fields are mapped in requirements/099-technical-dept/000-master.md.

Product, Backend/security, Cinematic, UX and QA checks were applied sequentially
by one agent; independent reviewer execution was unavailable. Browser fixture
coverage is not a real-provider end-to-end test or a screen-reader audit.

## Live Pilot Follow-up

Backend port 6500 was unavailable during final browser verification; no backend
was started because startup can recover existing Jobs. Start normally with
`scripts/start-dev.bat` to load the changed server/configuration. The local
`.env` and `.env.example` set `SEEDANCE_FIRST_FRAME_ENABLED=false`.
With an existing Project, review effective Looks/text-only mode, author cues and
optional opening, then explicitly generate the chosen Shot at its quoted price.
Review two Takes, select one and download the selected-clip ZIP. Verify actual
speech accuracy, provider acceptance and creative continuity during that pilot.
No live generation or credit spending was performed by this implementation.

## Rollout And Non-goals

Use existing approvedVideoAttemptId and project/version contracts; no destructive
backfill or media deletion. Preserve selected Takes on rollback and old attempts.
Do not enable final assembly, silently rewrite dialogue, alter pricing policy,
change Look fallback rules or introduce automatic retries. Document any required
additive contract before implementation; update architecture for new owners/paths.
Season/Chapter was design-only for this delivery; the later explicit follow-up
is now owned by enhancement-core-engine/026-028, superseding 022's runtime deferral.
