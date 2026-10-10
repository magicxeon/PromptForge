# Increment A: Admin Draft Catalog Handoff

**Date:** 2026-10-08  
**Status:** Draft-authoring foundation implemented and isolated-check verified.
**Not complete:** Full TUT-022 product, streaming, purchases and financial reporting.

## Delivered

- Separate Admin-only Tutorial and AI Cinema menu/route entries, route ownership
  and breadcrumbs. Tutorial home band replaces only the eligible Admin's static
  sample band; existing public home content stays unchanged.
- Published catalog and separate Teaching/Manage views with bounded search/list.
  No fake published titles, counts or playable videos.
- Create/save/reload Course, Film and Series drafts; chapters/lessons/episodes,
  episode Season numbers, title/description/language and draft Credit price.
- Free, paid and first N free access authoring. N is per title, not fixed at3.
  Film disallows partial access; all title metadata is validated server-side.
- Keyboard reorder, remove confirmation, dirty-navigation confirmation, access
  change confirmation and revision-conflict recovery. Failed saves retain edits.
- Admin/owner checks on API, type isolation, safe errors, atomic revision checks,
  bounded JSON stores and exact config gating. Member/support access is denied.
- Publication requires unavailable verified media and is blocked; purchase endpoints
  return `learning_billing_unavailable` (503) for eligible Admins. No Credit writes.

## Configuration And Start

Configuration owner: `server/config/learningPolicy.js`.

```text
LEARNING_ENABLED=true
```

Set this in the existing local server environment when deliberately enabling POC.
Default is off; production remains off even with this flag. `adminOnly=true`,
`billingEnabled=false` and `publicationEnabled=false` cannot be enabled through a
client request. `defaultFreeCount` and bounded metadata limits live in the same
configuration module. No `.env`, startup script or worker was changed by this task.

Use the project's normal backend startup on port6500 with that environment and
the Vite frontend on an available port. Do not run the full backend automatically
as a test: its existing startup performs Credit/Job reconciliation.
Routes: `/tutorials`, `/tutorials/teach`, `/tutorials/teach/new`,
`/tutorials/teach/:contentId/edit`; equivalent Cinema routes use `/ai-cinema/manage`.

No live backend was restarted. A port6500 HTTP check timed out during validation;
full application-shell integration remains manual UAT. Isolated browser tests do
not imply production authentication or live server verification.
Frontend-only Vite was started in a hidden process on `http://127.0.0.1:5173/`;
`/tutorials` returned HTTP200. The normal backend still must be started by the
operator with the POC flag before the live application can load its identity,
localizations and catalog API. No backend startup was performed by this task.

## Code Ownership And Storage

- `web/src/features/content-catalog/`: API Zod schemas, actor-keyed config query,
  catalog/editor orchestration and controlled outline UI. Shared by thin
  `features/tutorials/routes/TutorialRoute.tsx` and
  `features/ai-cinema/routes/AICinemaRoute.tsx`.
- `web/src/styles/content-catalog.css`: scoped layout; Thai/English `tutorials`
  namespace plus shell navigation labels and manifest registration.
- `server/app/routes/learningRoutes.js`: thin HTTP composition, no-store responses.
- `server/domain/tutorials/TutorialApplicationService.js` and
  `server/domain/ai-cinema/AICinemaApplicationService.js`: separate typed facades.
- `server/domain/content-access/LearningAccessPolicy.js` and `catalogContract.js`:
  shared gate and pure metadata rules only; no implemented paid entitlement engine.
- Matching Tutorial/Cinema repositories use `jsonFileStore` with configured
  `server/data/tutorials/catalog.json` and `server/data/ai-cinema/catalog.json`.
  Files are created only on actual successful saves; tests use OS temporary roots.
- Identity repository now projects accountStatus into the actor context so
  inactive Admin accounts cannot bypass the new access policy.
- No file moved, no new media storage, wallet, payment ledger or provider dispatch.

The config Query cache is actor-keyed, stale after30 seconds, uses default bounded
Query lifecycle and no polling; actor switching clears cache. Lists are keyed by
actor/kind/filter/page and invalidated after save. Late mutation completions check
both mounted state and active actor before cache writes/navigation. This is a
single-process local JSON POC, not a distributed database guarantee.

## Validation Evidence

```text
node scripts/verify-tutorials.mjs --group access
node scripts/verify-tutorials.mjs --group catalog
node scripts/verify-tutorials.mjs --group ux
node scripts/verify-tutorials.mjs --group types
node scripts/verify-tutorials.mjs --group layout
node --test test/frontendRouteOwnership.test.js test/mockActorContext.test.js
```

- Access:9 passed. Catalog/contracts/persistence:18 passed.
- Frontend:38 passed across the scoped catalog, navigation, sidebar and home suites.
- Adjacent identity/frontend route ownership:11 passed.
- TypeScript application check passed without writing build artifacts.
- Browser:12 combinations of Tutorial/Cinema, TH/EN and390/820/1440px; real
  isolated API save, published-vs-draft list and non-admin denial. Default theme
  checked at390, Pearl at820, Electric at1440; not every theme/size cross-product.
- Screenshots manually inspected at mobile and desktop. Evidence directory:
  `C:/Users/punya/AppData/Local/Temp/mpf-tutorial-layout-JpCC9t`.
- QA Planck conditionally cleared both findings after fixes; focused frontend
  tests and browser smoke subsequently passed. UX James reviewed before UI edits.
- `--all` is explicit and covers only implemented Increment A groups. No aggregate
  run or full-project test suite was needed. No real billing/provider calls.

## Manual Test Steps

1. Enable local flag, start the normal server deliberately, choose Admin.
2. Confirm Tutorial/AI Cinema appear; disabled flag/member/support hides both.
3. Create Tutorial, fill details, add four Chapters and Lessons; save and reload.
4. Choose partial access with N=1 then3; confirm changes and verify free/locked list.
5. Reject N=0, fractions and N equal to total. Reorder/rename and retain stable IDs.
6. Open the same draft twice; save one then save the stale copy. Conflict must
   preserve input and offer explicit reload, not overwrite silently.
7. Edit then navigate away: cancel retains work; confirm discards. Delay a save
   and switch actors: no old draft cache or late redirect may return.
8. Create Cinema Film (Free/Paid only), then Series with ordered episodes/Seasons.
9. Confirm Publish disabled; no Upload/Watch/Purchase success is suggested. Verify
   no Credit balance change. Home has an honest empty publication state.
10. Repeat keyboard/long Thai title checks on mobile, tablet and desktop; verify
    unrelated home, Playground, Cinematic and existing sidebar actions remain intact.

## Next Ordered Work

1. T06-T07: Assets-owned private upload, durable conversion and authorized playback.
2. Finish publication/catalog/player (T05/T08/T17/T18); previews need real ready assets.
3. Resolve purchase duration/refunds/POC debit consent, then T09-T10 Credit-backed
   entitlement and recovery. Do not remove the billing guard to simulate completion.
4. T11-T15 learner events/roster and reconciled monthly/yearly money evidence;
   paid-Credit lot allocation must precede claims of actual Course/Film revenue.
