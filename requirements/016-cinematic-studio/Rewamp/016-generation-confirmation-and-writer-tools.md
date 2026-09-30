# 016 - Writer Tools And Generation Confirmation

Status: implementation approved, 2026-09-27. Owner: Cinematic authoring;
shared credit consent belongs to Generation UI and account preferences to Identity.
Primary role: Product Requirement Architect. UX, Backend, Commercial/security and
QA reviews are sequential gates because this spans user preferences and spending
consent. No change to prices, reserves, settlement or provider dispatch contracts.

## Scope And Decisions

1. Keep native plain-text textareas. No rich editor, character highlight or HTML.
2. Full Story's right rail uses AI Assist / Characters tabs like Chapter Writer.
   Preserve text, pending operations and selections when switching tabs. History,
   chapter results, Build Chapters and all unrelated sections stay in place.
3. Regenerate-all Chapters, Scenes and Shots require a modal before requesting AI.
   Name the affected scope and explain proposal review versus applying replacement.
   Cancel/Escape must dispatch nothing. Reviewing an existing proposal is not
   regeneration and must not ask again. Regeneration confirmation cannot be opted
   out through a spending preference. Existing apply/ownership/version gates stay.
4. Billable generation asks before dispatch, shows the authoritative current
   Credit estimate and scope/provider/model where available. Never invent a price
   for currently unbilled writing proposals. No dispatch if estimate is unavailable.
5. Credit confirmation offers an unchecked 'Do not ask again' checkbox. Persist
   only on explicit confirmation to the active user's server-side preferences,
   never a shared localStorage flag. Default is ask. Failure to save the preference
   must be visible and must not silently imply it was saved. Allow restoring the
   preference from account settings. Opt-out does not remove visible estimates,
   credit sufficiency checks, duplicate prevention or destructive confirmations.
6. Confirmation belongs to the exact actor and request/estimate snapshot. Changing
   actor, scope, input or quote while open invalidates it. Double-clicks dispatch
   once. Never send an old confirmation using a new quote or another actor.
7. Reuse existing dialogs, i18n, apiClient, actor-scoped query keys and canonical
   generation mutations. Shared image GenerationExperience covers its consumers;
   Cinematic and Playground video use the same consent component/hook. No modal
   implemented by intercepting arbitrary HTTP requests or bypassing server rules.

## Ownership And Persistence

Identity owns GET/PATCH `/api/me/preferences`, scoped exclusively through
`req.actorContext.userId`. The current user repository preserves unrelated profile
fields and stores `preferences.confirmCreditUsage` (boolean, default true) using
the existing atomic JSON store. Reject unknown keys and identity/role injection.
Do not mutate live user data during automated tests or add a parallel user store.
Shared UI preference query is actor-scoped and invalidated on updates/switching;
no polling. New default requires no backfill; rollback leaves additive data readable.

## Financial And Failure Contract

- Consent is a UI guard, not financial authorization. Server-owned actor, signed
  estimate, affordability, expiry and request validation remain authoritative.
- Single images retain estimate IDs; comparisons retain the approved comparison
  quote; videos retain estimate ID/fingerprint and existing idempotency keys.
- Cancelling consent creates no generation/reservation. Retrying uncertain
  submissions must retain the original idempotency contract, not buy another Job.
- Look Sheet enhancement can complete before image rendering. If the later image
  price changes, stop image submission; do not claim the completed enhancement was
  free or silently refund it. Existing enhancement settlement/recovery still owns
  that result. No reserve, capture, refund, payout or support override is changed.
- Profile opt-out is not consent to changed prices during an open confirmation;
  stale request snapshots are rejected regardless of the preference.
- Frontend estimate expiry may still surface the server's existing expired-quote
  error; it must never silently reprice and purchase a different request.

## Ordered Tasks

| Task | Scope | Acceptance | Status |
|---|---|---|---|
| GC01 | Identity preferences contract, repository, security tests | Self-only boolean patch; defaults; preserves profile | Implemented; 8 tests passed |
| GC02 | Shared credit modal and restore setting | Cancel, opt-out persistence, stale scope, failure, accessibility | Implemented; 14 focused tests passed |
| GC03 | Wire canonical image/video submit controls | No submit before consent; exact estimate; unchanged settlement | Implemented; focused integration tests passed |
| GC04 | Regenerate guards and Full Story tabs | Scope-specific confirmation; drafts retained; no textarea change | Implemented; 42 tests passed |
| GC05 | Focused automated/browser verification and handoff | TH/EN parity, responsive modal, commands and limitations | Focused automated and isolated browser checks passed; live UAT pending |

Dependencies: GC01 -> GC02 -> GC03; GC04 independent after requirements. Reuse
`scripts/test-cinematic-video.js` for selectable test groups and explicit aggregate.
Do not run full suites, paid AI, live mutations or restart backend workers.

## Manual Acceptance

1. Full Story: switch Assist/Characters and back; typed instruction remains.
2. Regenerate All Chapters/Scenes/Shots: cancel, then confirm; only confirm sends
   one request. Existing proposal review does not generate a second proposal.
3. Generate image/video with spending confirmation enabled: check Credits, cancel
   and verify no Job/reservation; confirm and verify the existing submission path.
4. Confirm with opt-out checked, reopen/session reload and verify preference;
   switch actor and verify isolation. Restore confirmation through account settings.
5. Change input/quote/actor while modal is open; stale consent cannot dispatch.
6. Simulate preference-save failure; error is shown and no false saved state.
7. Check mobile/tablet/desktop, TH/EN, keyboard/Escape/focus. Live generation is
   separately user-initiated and may consume Credits.

## Delivery Evidence

### Files And Ownership

- Identity: new `server/domain/identity/UserPreferenceService.js` and
  `test/userPreferences.test.js`; extended `server/app/routes/identityRoutes.js`
  and `server/repositories/identity/MockUserRepository.js`.
- Shared UI: new `web/src/lib/auth/userPreferences.ts`,
  `web/src/components/generation/useCreditConfirmation.tsx` and its tests;
  new `web/src/components/layout/AccountPreferencesDialog.tsx`;
  AccountMenu/AppShell wire Settings and active actor.
- Image: `web/src/components/generation/GenerationExperience.tsx` and new tests;
  `web/src/features/generation/hooks/useLookSheetRender.ts` binds fresh estimates
  to the confirmed amount before/after enhancement. SceneEnvironmentControl and
  StoryboardShotDialog reuse the approved quote instead of silently requoting.
  StoryboardGenerateAllDialog uses the same consent with the sum of captured
  quotes; opting out never skips its batch selection/review. Twenty batch tests
  cover cancel, actor/input/price changes, closed-dialog invalidation and retries.
- Video: CinematicStageContent and PlaygroundVideoWorkspace retain immutable
  estimate IDs, expiry, fingerprint and canonical mutation checks after consent.
- Authoring: CinematicFullStoryWriter, CinematicChapterWriter and
  CinematicSceneOverview plus their existing tests. No editor format migration.
- Localization: EN/TH `react-ui.json` and `cinematic.json`; existing namespaces.
- Runner: `scripts/test-cinematic-video.js` has selectable task-only groups.
- No moved files, live data edits, new storage paths, worker restart or paid calls.

### Focused Verification

Installed repository dependencies are required. From the repository root:

```powershell
node scripts/test-cinematic-video.js rewamp-confirmation-profile
node scripts/test-cinematic-video.js rewamp-confirmation-authoring
node scripts/test-cinematic-video.js rewamp-confirmation-media
# Explicit task-only aggregate, not the full product suite:
node scripts/test-cinematic-video.js rewamp-confirmation-016
node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit
# Isolated Chromium fixtures; requires installed Playwright Chromium:
node scripts/verify-cinematic-shot-workspace.mjs --writer-confirmation --isolated
```

Final aggregate passed: 8 backend + 186 frontend tests (194 total); application
TypeScript check and scoped diff check passed. Includes cancellation, duplicates,
exact quote, input/actor change,
comparison, Look Sheet price drift, preference failure and late GET/PATCH races.
Initial npm/Vite bundled-config runs hit sandbox temporary-file permissions;
the owning runner uses `--configLoader runner` and passed without paid requests.

Review found two cache risks and resolved them: a late GET overwriting a saved
preference, and failed refresh retaining a cached opt-out. Backend implementation
and cross-scope read-only review were assigned separately; UX/media implementation
reviews are not independent release certification.

Browser evidence: TH/EN at 390/820/1440px, three themes, 950px viewport height.
Verified Full Story tabs/draft retention and unchanged adjacent sections;
Chapter/Scene/Shot Cancel/Escape/confirm; Credit modal sizing/focus, unchecked
opt-out default and preference-save failure recovery. No observed overlap or
clipping in representative inspected screenshots. 114 screenshots recorded at
`C:/Users/punya/AppData/Local/Temp/mpf-shot-workspace-hRhmzW` (temporary evidence).
The isolated Vite server was stopped and its port closure verified. No live
mutations. Successful preference persistence is API/hook-tested, not live-browser
tested; short landscape viewports and real provider billing remain UAT gaps.

Live provider generation, financial settlement and account reload against the
running application remain manual UAT. Writing operations currently unbilled
remain unbilled; this UI must not present advisory writing prices as real charges.
Opt-out applies to the integrated shared image/Cinematic/Playground video entry
points, not as a blanket authorization for future billable capabilities.
