# Template-Derived Sharing Implementation Plan

Master 019, domain 020, UI 021, duplicate policy 022.
Status: Implemented; isolated gates passed. Live owner UAT pending.

| Step | Task | Focused gate | Status |
|---|---|---|---|
| TDS-01 | AGENTS delivery pattern, requirements and gap review | Owner/entry point trace | Done |
| TDS-02 | Persisted origin guard, private prompt, publish recheck | Domain and route tests | Implemented; focused pass |
| TDS-02B | Single-share status, domain serialization, atomic uniqueness (req 022) | Duplicate/concurrency tests | Implemented; focused pass |
| TDS-03 | Shared dialog eligibility and prompt choices | Component tests | Implemented; 7/7 pass |
| TDS-04 | Existing lineage/ordinary publication compatibility | Focused existing groups | Done; 35 tests passed |
| TDS-05 | Syntax/build, visual fixtures and QA | Per-group scripts and evidence | Done; 18 visual cases passed |

## Gap Review

Queue persists templateUseContext from canonical Studio, Fashion and Comparison
execution. Community currently checks only Scene snapshot input support. Draft
eligibility is not a publish authorization check. Existing TemplateDetail joins
generation provenance and public posts and already renders Made with Template.
No new lineage storage or UI page is needed. Existing source privacy must not
leak through the generated-image draft while hiding only the checkbox.

User update supersedes the source visibility facade: all derived results use
private prompt with no selector. No TemplateCore visibility API is needed.
Single-image share status uses one bounded DTO per source, actor scoped, 30s
freshness/60s GC and no polling. JSON scans remain repository-owned; paged/batched
status enrichment is future tuning if representative loaded grids justify it.

## Verification Plan

Add scripts/test-template-derived-sharing.mjs with --part=server|ui|compatibility|
visual|all. Small groups by default; all is explicit aggregate for pre-build/UAT
automation, not live UAT. Include route syntax gates to prevent the previous
startup regression. Browser fixtures intercept all APIs and use current build.
Record tests, screenshot paths, unsupported checks and outcome after each step.

## Pending

Independent QA found a metadata-edit privacy policy bypass and unsanitized
unexpected errors in the new status endpoint. Correct both before closure:
revalidate image-post provenance on non-private edits (persist a derived flag on
new posts for missing-history safety); sanitize unexpected status failures to
500. Add focused regression assertions and request a QA recheck.

Compatibility fixture correction: sceneShareFlow still assumed optional Expression
and no outfit-front capability before requirement 016. Update only fixture source
capability and assertions to the accepted Character/outfit policy; retain original
tests for manual remix rejection, image-only sharing and approval activation.

- Live owner smoke after backend reload; no automatic restart/paid render.
- Historical Templates already republished and results missing origin metadata:
  audit only after a separate requirement; never delete or infer origin by image.
- Character display-image selection/centering remains separate from this guard.

## Final Evidence (2026-09-06)

- Aggregate runner --part=all exited 0: server 18/18, UI 7/7, compatibility
  server 27/27 and UI 8/8. Total 60 tests. Build (tsc + Vite) passed.
- Visual: 18 cases EN/TH x 390/820/1440 x default/fashion/creative. Checks hidden
  prompt/reusable controls, private payload, disabled Share after fixture publish
  and after reload, viewport/footer bounds, no page errors/unmapped API requests.
- Screenshots: `%TEMP%/derived-sharing-layout-sqloDj`. Inspected desktop/mobile
  dark theme and tablet light theme. Existing unrelated form colors unchanged.
- Independent server/privacy QA initially found two issues; both corrected and
  rechecked, with 9/9 domain tests plus additional isolated probes passing.
  UI/visual review is by the implementation agent, not independent browser QA.
- Scoped ESLint, i18n validation and git diff --check passed.
- No source images, existing posts, Credits or generation references modified.
  New persisted templateDerived flag uses existing Community post storage; no
  migration/new runtime path. No live saves or backend/worker restart performed.

## Commands

```shell
node scripts/test-template-derived-sharing.mjs --part=server
node scripts/test-template-derived-sharing.mjs --part=ui
node scripts/test-template-derived-sharing.mjs --part=compatibility
node scripts/test-template-derived-sharing.mjs --part=build
node scripts/test-template-derived-sharing.mjs --part=visual
node scripts/test-template-derived-sharing.mjs --part=all
```

Default is server only. Visual needs a current web build; all performs the build
before fixture browser checks. Requires installed dependencies and Playwright
Chromium. Tests do not require a live backend; all network is intercepted in
browser fixtures. Live UAT is deliberately not automated.

Owner UAT: restart backend and refresh, open an unshared Template-derived result
from Recent, confirm no Prompt visibility/reusable checkbox, publish the image,
confirm Shared remains disabled after reload. Inspect Made with Template link
when its origin is public. Existing shared results should already show Shared.
