# TUT-006 Ordered Implementation Plan

**Status:** Increment A implemented and fixture-verified; remaining gates stay open.

## Active Increment A (2026-10-08)

First independently verifiable delivery: T02/T03/T04/T05 and the metadata portion
of T17. Implement Admin-only Tutorial and AI Cinema catalogs, draft editing,
ordered curriculum, per-title free counts, safe configuration and home entry.
Price fields describe draft offers only. T01's unresolved rights, refund and
actual-charge decisions keep billing disabled; no simulated purchases or revenue.
T06/T07 media and T09-T15 commerce/analytics follow this foundation and are not
claimed complete. Publication must refuse missing verified playable media.

Primary role: Backend Platform Architect for durable metadata/API boundaries;
UX designer reviews the new screens before editing; QA/security review follows
focused tests. Product scope is owned by this packet. No financial mutation is
authorized by choosing a draft price. Preserve all existing Generation behavior.

Acceptance for this increment: Admin can create/save/reload Tutorial/Film/Series
drafts with optimistic conflict detection; non-admin API and UI access is denied;
free N changes are validated; actor switching cannot leak drafts; separate menu
and landing entry work; no fake playable media, payments or report figures.

Do not mark the packet delivered from documents alone. Implement one task, record
focused evidence, then advance. Paid tasks cannot bypass unresolved policy gates.

## Small Task Batches

Progress: T02/T03 draft contracts delivered; T04 menu/home entry and T05 draft
editing delivered within Increment A. T17 metadata and T18 menu/management routes
partially delivered. T01 policy decisions remain open. T06-T16 media, commerce,
learner analytics and finance, T17 media publication, T18 watch screens and
T19-T20 cross-catalog commerce/release remain pending. No full task/packet closure
is implied. Detailed evidence and manual UAT are in 009.

| Task | Deliverable | Dependency / acceptance evidence |
|---|---|---|
| T01 | Confirm 007 decisions; sample files and data policy | Product approval; live billing remains off |
| T02 | Typed Tutorial/Cinema schemas, shared Content Access ownership, config and admin-only gates | Access matrix; cross-type isolation; config-boundary checks |
| T03 | Course/Chapter/Lesson repositories and facade | Stable IDs, revisions, publication/access validation |
| T04 | Separate menu/routes + landing course band | T02-T03; non-admin hidden/forbidden; preserve existing home |
| T05 | Teaching list/editor, ordered curriculum | T03; draft/save/conflict/publish checks |
| T06 | Private upload and media processing lifecycle | T03; bounded files, restart, malformed upload checks |
| T07 | Authorized local HLS playback sessions | T06; direct segment denial, seeking, expiry/revocation |
| T08 | Catalog/detail/My Learning/player | T04,T07; free/locked/resume states and responsive UX |
| T09 | Shared Content Access facade/repositories; extend Credits contracts + immutable typed quotes | T01,T03; Backend/Commercial/QA review before debit |
| T10 | Order/entitlement recovery and confirmation UI | T07,T09; crash/replay/race/refund and exact consent checks |
| T11 | Enrollment/progress/activity events | T08; deduplication, watch intervals, curriculum versions |
| T12 | Admin learner roster and monthly/yearly activity | T11; union counts, privacy, bounded queries/export |
| T13 | Funding evidence/allocation dependency in Credits/Finance | Approved policy + Payments evidence; unknown history explicit |
| T14 | Course financial projection and reconciliation | T10,T13; capture/refund/lot/entitlement reconciliation |
| T15 | Existing Admin Finance course filters and exports | T12,T14; same-as-of summary/detail/year totals |
| T16 | Isolated aggregate verification + local admin UAT | T02-T15; explicit approval for any real debit |
| T17 | Admin Cinema catalog/editor, Film/Series/Season/Episode and configurable free count | T02,T05-T07; reuse upload/streaming; enforce Admin publish |
| T18 | Separate AI Cinema menu/detail/watch and optional gated landing band | T08,T17; reusable player, episode access and responsive evidence |
| T19 | Connect cinema offers/purchases and Finance type/title filters | T09-T15,T17-T18; reuse shared access; category totals reconcile |
| T20 | Focused cross-catalog regression and Cinema UAT | T16-T19; no cross-type grants, duplicate charges or Studio regressions |

T13 can start in parallel with non-financial work after T01, but no independent
wallet/Payments implementation is authorized by this plan. T14 may first expose
Credit-only figures with cash unavailable; that is partial delivery, not closure
of the user's accurate course-money requirement.

## Proposed Files And Dependency Direction

- UI: `web/src/features/tutorials/{api,components,hooks,routes}/`; reuse shared
  media/UI/discovery. Add only cohesive modules needed by the current task.
- Server: `server/domain/tutorials/`, `server/repositories/tutorials/`,
  `server/app/routes/tutorialRoutes.js`; compose through existing `createApp.js`.
- Shared offers/orders/entitlements: proposed Content Access capability in 008;
  Tutorial and Cinema adapters call the same facade. Add planned Cinema paths
  only in T17-T19, not speculative copies during the Tutorial build.
- Metadata: `server/data/tutorials/` via `paths.js` and atomic JSON repository
  helper. Assets owns private byte storage; no media in source or public outputs.
- Config: feature exposure plus proposed `server/config/tutorial-policy.json`;
  secrets/paths through validated environment configuration. Prices/rights are
  versioned offers, not mutable client constants.
- Extend existing Credits, Finance, Assets public contracts and Admin Finance UI.
  Tutorials must not reach into their repositories or dispatch generation providers.
- Locales: `client/i18n/locales/<locale>/tutorials.json` plus manifest parity.
- Tests: existing owning test locations and bounded fixtures under
  `test/fixtures/tutorials/`. Private or paid user media is prohibited in fixtures.

Exact filenames other than existing consumers remain proposed until implementation
inspection. Register every new/moved module in the architecture master as delivered.

## Validation Groups

Owning runner delivered for Increment A:

```text
node scripts/verify-tutorials.mjs --group access
node scripts/verify-tutorials.mjs --group catalog
node scripts/verify-tutorials.mjs --group ux
node scripts/verify-tutorials.mjs --group types
node scripts/verify-tutorials.mjs --group layout
node scripts/verify-tutorials.mjs --all
```

Media/credits/analytics/finance groups are not implemented and are rejected, not
silently skipped. `--all` means all delivered Increment A groups, not all T01-T20.
Runner rejects unknown groups and fails nonzero on failed assertions. Extend
appropriate current runners when sufficient instead of creating duplicate suites.
Only explicit `--all` runs the aggregate. Prerequisites: repo Node toolchain and
dependencies; FFmpeg/ffprobe for media; browser binaries for UX; isolated temp
repositories and synthetic paid/promo/refund fixtures for financial tests.
No automatic live data mutation, real debits, cloud uploads, paid generation,
backend/worker restarts or downloads. Missing dependencies report unverified gates.

Each task logs command, result, fixture/screenshot location, as-of commit/diff,
affected viewports and residual gap in 007. Do not repeatedly run the whole suite.

## Review Gates

- Product owns requirement/policy closure; UX reviews each screen before edits.
- Backend owns durable state, repositories, streaming and recovery design.
- Commercial reviews quotes, lot allocation, refunds and reporting semantics.
- QA independently checks financial/permission failure cases where agents are
  available; security/privacy reviews video access, roster/export and retention.
- Use task-sized rounds with one primary and at most two reviewers. Document
  sequential/non-independent review when independent agents are unavailable.

## Rollout And Rollback

Default feature off; enable admin-only local fixtures first. Keep billing off
until consent/policy/recovery gates pass. Treat admin POC as test/internal evidence.
Disable new purchases separately from recovery, refunds and existing entitlement
lookup; turning the UI off must not abandon charged pending orders.
Rollback preserves originals, orders, ledger links and progress; do not delete
records to remove the menu. Public launch needs real authentication, approved
payment allocation, privacy/retention, backup, access security and capacity evidence.

## Manual UAT

Admin creates free, configurable-preview and paid Courses; uploads a synthetic clip;
publishes; finds it from menu and landing; watches/returns/seeks; tests locked
Chapter N+1 (including N=1,3,5); confirms purchase only in approved sandbox; retries submission; reopens
without another charge; checks roster and period totals; posts a test refund;
verifies revocation/recovery and month/year reporting. Non-admin deep links and
copied manifest/segment URLs must fail. Capture 390/820/1440px evidence and preserve
existing home, Gallery, Playground and Cinematic behavior.
