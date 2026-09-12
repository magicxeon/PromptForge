# Season And Chapter Delivery Plan

Status: implemented; isolated contract/UI/browser/build gates passed 2026-09-12.
Owner 026 contract and 027 UX.
Primary Product; Backend/security, UX and QA checks applied sequentially.
Skills: review-product-ux, verify-release-regressions. Generation lifecycle is
unchanged; copying authoring snapshots does not authorize a provider request.

## Ordered Tasks

- [x] S0 Reconcile 022 deferral and current Project ownership; freeze 026/027
  contracts. Preserve standalone and existing Cinematic pilot behavior.
- [x] S1 Reuse Project record factory; additive bounded Series store transaction,
  membership/version/ownership validation and snapshot-copy tests.
- [x] S2 Expose structure through canonical Cinematic facade/routes; validate
  actor and HTTP errors; additive Zod/API contracts. No new paid workflows.
- [x] S3 Add compact Series controls/manager and safe Setup flush/navigation;
  integrate existing workspace without moving sibling sections.
- [x] S4 EN/TH, responsive/theme/browser and component tests; actor/version,
  retry, empty Season and independent Chapter state coverage.
- [x] S5 Focused aggregate plus adjacent Cinematic tests, build, catalog/diff
  validation; record evidence and live-UAT gaps before closing requirements.

## Validation

Run `node scripts/test-cinematic-series.mjs backend`, `ui` or `full`. Backend uses
temp JSON only; UI mocks APIs; full also runs current Cinematic regression gate.
Run `node scripts/verify-cinematic-series.mjs` with local Vite (default 6501,
override CINEMATIC_WEB_ORIGIN), installed Playwright Chromium and intercepted APIs at
390/820/1440 EN/TH, with theme samples and no user Project writes or AI calls.
Run catalog validator, TypeScript/build and git diff --check. Do not restart live
workers. Record actual paths/results and distinguish fixture from live UAT.

## Rollout

S1/S2 evidence: `node --test test/cinematicSeries.test.js` passed 7 focused
contract/route groups; existing cinematicApplicationService tests passed 34.
Uses temp stores only. HTTP handler fixtures exercise actor context and 404/409.
No new dependency or provider call was needed.

S3/S4 evidence: Series UI aggregate passed 22 checks, including unchanged Setup,
stage navigation and project contracts. Browser runner passed actual React route
plus API interception backed by real domain/temp-JSON services: create Series,
add Season, add Chapter, edit Setup, switch back, reload, compare isolated briefs.
All 390/820/1440 EN/TH viewports passed. Fashion/creative dialog samples at 820px
were captured; visual review covered default desktop bar, mobile Setup/Chapter
form and the light dialog. Screenshots and synthetic stores only:
`C:/Users/punya/AppData/Local/Temp/mpf-cinematic-series-g7AlvX/`.
No user JSON, generated media or provider was accessed by the browser fixtures.

S5 evidence: `node scripts/test-cinematic-series.mjs full` passed 7 backend and
22 UI Series/adjacent checks plus existing Cinematic 153 backend and 50 UI checks
(the shared schema tests occur in both UI groups). `npm.cmd run typecheck:web`
and `npm.cmd run build:web` passed. Catalog validation and git diff --check passed.
The existing large vendor-chunk build warning and unrelated fixture i18n warning
were not suppressed or treated as failed behavior. Scoped diff review found no
blocking issue in this delivery. Review was sequential by the implementation
agent, not an independent external review.

## Scope And Remaining Validation

- New modules stay under Cinematic domain/feature/test owners named in 099 master.
  The existing Project factory was extracted into cinematicProjectRecord; no
  files moved and no new data path or dependency was introduced.
- Legacy Projects retain standalone behavior, URLs, stills, Takes, quotes and
  reference policy. Series membership is explicit; all new Chapter authoring is
  independent. Server presents legacy normalization without bulk rewriting media.
- Query ownership is actor/project scoped, no polling, zero stale time and 60s
  unused cache GC. Responses cap at 24 Seasons/120 summaries. Existing whole-JSON
  reads remain; production-scale storage performance is not claimed or tuned here.
- No live backend restart or paid AI/video generation. Browser writes only its
  generated temp fixture store. Real-provider continuity/expiry acceptance remains
  governed by existing generation validation, not Series creation.
- AI season arcs, editable shared Series Bible, cross-Series moves/deletion,
  cross-actor collaboration and combined-season movie export are explicitly out
  of this organizational scope. The original future design remains in 022.

No bulk migration. Legacy empty Series collection materializes only on explicit
mutation; existing project routes and runtime data path stay unchanged. Restart
server normally to load new handlers. Older code can keep reading existing Project
fields; new Series metadata must be retained on rollback. No automatic cleanup.
