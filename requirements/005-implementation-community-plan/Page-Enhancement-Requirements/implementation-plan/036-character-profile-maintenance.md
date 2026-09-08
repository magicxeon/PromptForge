# Character Profile Maintenance Delivery

Master: ../038-character-profile-maintenance-master.md. Status: Implemented;
focused automated and responsive gates passed 2026-09-08. Live UAT separate.

## Existing Ownership

- `server/domain/character-profiles/CharacterProfileService.js`: owner facade,
  display projections and confirmed delete orchestration.
- `CharacterProfileSharingService.js`: cover eligibility/media/public projection.
- `characterProfilePolicy.js`: view/reuse denial.
- `CharacterLookService.js`: reauthorization of owned Look mutations/media.
- `CharacterUsageService.js`: completed accepted work can read a tombstone only
  for historical usage recording; all new usage authorization excludes it.
- `server/repositories/character-profiles/CharacterProfileRepository.js`: atomic
  tombstone in existing `server/data/character-profiles/profiles.json`.
- Existing Audit repository/event store: sanitized deletion request evidence.
- `server/app/routes/characterProfileRoutes.js`: HTTP adapters only.
- `web/src/features/profiles/`: typed API, owner route, focused deletion dialog.
- `web/src/components/profiles/CharacterFeaturedImagePicker.tsx`: presentation;
  existing Hero retains all handoff/sharing/statistics sections.
- `scripts/test-character-profile-maintenance.mjs`: focused groups and explicit
  aggregate; tests use temporary stores/mocks, never live data or paid generation.

## Ordered Steps

1. [x] IMG: change owner/public default URL/source and missing-cover fallback.
   Verify existing lifecycle/sharing tests and original/manual regression cases.
2. [x] DEL backend: atomic idempotent owner tombstone, read/write gates,
   projection cleanup, audit, HTTP confirmation. Verify policies/handoffs,
   retry after cleanup failure, foreign owners and no resurrection.
3. [x] DEL UI: Zod/API, owner Details dialog, typed DELETE, errors, route/cache
   recovery, actor-switch guard. Preserve existing tabs and controls.
4. [x] COV backend: bounded owner query, allow explicit unlinked cover,
   reauthorize candidate media and selected display without lineage mutation.
5. [x] COV UI: sources and cursor controls, confirmation/public-display consent,
   error/empty/retry states and selected/automatic status.
6. [x] QA: focused tests, TypeScript, i18n, scoped diff and responsive screenshots
   at 390/820/1440 across EN/TH and existing themes. Record evidence below.

## Commands And Gates

`node scripts/test-character-profile-maintenance.mjs display|delete|cover|ui|static|layout|all`

Each group is explicit and fails on errors. Layout requires a current Vite build;
aggregate is for later UAT/pre-production checks, not a default full-system run.
No backend restart, provider request, live deletion or data backfill is performed.
Local browser verification uses fixtures if localhost:6500 is unavailable.

Build: run `node ../node_modules/vite/bin/vite.js build` from `web/`.
Optional original-sheet visual evidence in PowerShell:

```powershell
$env:CHARACTER_PROFILE_LAYOUT_SHEET = 'client/outputs/job_1788790629892_lhgiw3l7n.png'
node scripts/test-character-profile-maintenance.mjs layout
```

The optional path is read-only, not a committed fixture or copied user asset.
Without it the layout runner uses the existing static sample image.

## Rollout And Risks

No live JSON migration. New tombstone fields are additive, but older code must
not be deployed over deleted records without lifecycle compatibility. Rollback
UI independently; retain backend tombstone guards and deletion evidence. Cover
rollback must preserve stored selection IDs. Original crop derivatives remain
available for generation. Legacy unlinked images require an explicit owner choice.

## Evidence

Display: 24 lifecycle/sharing tests passed. Added display-only sheet media
routes; reference image/face/thumbnail endpoints remain unchanged. Hero contains
sheet fallback, preserving cover styling.

Delete: 22 tests passed including lifecycle denial, exact confirmation, foreign
owner, repeated delete, stale writes, cleanup failure/retry, Look compatibility,
and usage accounting for completed work accepted before deletion.

Cover: 30 tests passed (9 owner-cover cases + 21 sharing compatibility cases).
Own-image pages use existing owner cursor with a profile-specific filter key;
filtered empty pages retain next/previous navigation. Manual unlinked covers
are resolved in one additional bounded batch, not one history read per card.
No new cache, persistence or polling owner. Revision URLs refresh changed covers.

UI: 15 tests passed. Confirmation/cancel/duplicate/retry/unmount, consent,
pagination and original neighboring Hero/actions/owner controls are covered.
TypeScript, both locale catalogs and scoped ESLint passed. Vite build passed
with the existing large vendor-chunk warning. `git diff --check` passed.

Read-only real-data check: the reported Character resolves to `/media/sheet`;
My images returned 10 eligible owned candidates on the first page, including
`job_1788791098499_qhhp3esiz` with `linkedToCharacter: false`. No data changed.

Responsive first pass: 18 combinations (390/820/1440, EN/TH, three themes), each
covering original sheet, owner controls, pagination, cover consent/save and typed
deletion/cancel. Screenshots under temporary `publication-profile-layout-D6j19g`.
Inspected desktop original three-view, mobile Thai delete and tablet light-theme
cover dialog. Final rerun includes improved focus restoration and button contrast.

Final responsive rerun: PASS, 18 combinations and four screenshots per combination,
under `C:/Users/punya/AppData/Local/Temp/publication-profile-layout-jTwkT8`.
Original image decoded, sheet object-fit is contain, no page horizontal overflow,
confirmation dialogs fit viewport, typed DELETE gate and consent/pagination/save
verified. No page errors or unexpected API calls. Inspected final mobile Thai
three-view sheet and delete dialog. Final UI tests, TypeScript/i18n, scoped ESLint
and rebuilt frontend also passed. No full-system aggregate or paid/live test run.

New files are the requirement package/plan, owning runner, two backend tests and
feature-owned DeleteCharacterDialog plus its UI test. No files moved. Runtime
changes are additive fields in existing profiles JSON and existing Audit events;
no live records were modified. Tests use temporary stores and mocked media/API.

Review was sequential by the implementing agent, not independent. Live deletion UAT must use a
disposable Character only and requires separate deliberate user action.
Backend localhost:6500 was unavailable; existing frontend 127.0.0.1:5173 returned
HTTP 200. No backend/worker was restarted, no provider generation was invoked.
