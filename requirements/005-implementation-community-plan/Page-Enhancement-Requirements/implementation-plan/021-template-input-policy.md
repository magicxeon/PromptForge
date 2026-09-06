# Template Input Policy Implementation Plan

Master: 016. Domain: 017. UI: 018. Status: Implemented; focused gates passed.
Live-data smoke test remains pending; no paid generation requested or performed.

| Step | Deliverable | Focused gate | Status |
|---|---|---|---|
| TIP-01 | Requirements, authority/capability and gap review | Trace existing Share/Edit/Use | Done |
| TIP-02 | Pure server policy and safe owner DTO | Policy unit tests | Done |
| TIP-03 | Immutable policy edit and post/proxy linkage | Version/session/ownership tests | Done |
| TIP-04 | Shared Create/Edit fields and schema boundary | Component/mutation tests | Done |
| TIP-05 | Consumer and sibling regression checks | Scene/Core/Share focused groups | Done |
| TIP-06 | Build, EN/TH, responsive screenshots, QA | Read-only fixture scripts | Done |

## Gap Review

- Initial Share can expose arbitrary source fields; owner Edit cannot edit them.
- Current example has front required/back optional and original source includes
  Character. Existing snapshot/pose proxy must not be regenerated on edit.
- Use sessions already pin immutable version and price; use new schema versions
  rather than mutating active session inputs.
- Pose preparation currently keys by version, so policy-only versions need
  strictly verified inheritance instead of silently losing active readiness.
- Community post pointer/public snapshot must follow the new version; retain
  post ID, engagement, creations lineage and source image.
- Scope excludes working Gallery/Detail/Landing and existing dirty runtime files.
- Tests split into server, UI and compatibility scripts; optional combined runner.
  No live publication, paid calls, backend restart or automatic worker recovery.

## TIP-03 QA Corrections

TIP-06 visual correction: Edit modal's old fixed body-height subtraction clips
footer actions after the new fields expand the content. Use a bounded flex
header/form/body/footer layout with only the body scrolling; wrap footer actions
on small screens. Preserve every existing action. Assert footer/button bounds
in both modal visual checks, not just outer modal bounds.

Independent probes found cross-template owner preview access, explicit-old-version
new-session bypass, overlapping post-pointer writes and a partial-save retry gap.
Before closure: bind readiness reads to the requested template/version, reject
new sessions on obsolete adopted policy versions, serialize owner post updates
per template and guard post pointer writes atomically, and permit identical
schema retry only while that post still points at the immediate predecessor.
The in-flight queue belongs to CommunityShareService, max 256 keys/16 operations
per key, entries removed after completion; no persistent cache or media payload.
Per-process queue plus repository compare-and-set protects stale post writes;
multi-file writes still require documented reload/retry recovery, not a claimed
database transaction. Server tests must inject the failure and overlap states.

All four findings were corrected and independently rechecked with isolated
probes. No new blockers found. UI review and visual checks were performed by the
implementation agent, not claimed as independent browser review.

## Verification Evidence (2026-09-06)

- Server group: 16/16; UI group: 7/7; consumer group: 14/14.
- Additional communityOwnershipPolicy/communityMvpIntegration/
  templateExecutionBaseline tests: 5/5. Total focused tests: 42.
- Production web build, scoped ESLint, i18n validation and diff check passed.
- Browser fixtures: 18 cases per locale, 36 total. EN/TH, 390/820/1440 widths,
  default/fashion/creative themes. No page errors or unhandled requests.
- Final EN screenshots: `%TEMP%/template-input-policy-layout-BAOJTd`.
- Final TH screenshots: `%TEMP%/template-input-policy-layout-BcCsaY`.
- No live saves, provider calls, Credit writes, runtime migrations or new data
  directories. New version metadata is additive in the existing repository.

## Focused Commands

```shell
node scripts/test-template-input-policy.mjs --part=server
node scripts/test-template-input-policy.mjs --part=ui
node scripts/test-template-input-policy.mjs --part=compatibility
node scripts/verify-template-input-policy-layout.mjs --locale=en
node scripts/verify-template-input-policy-layout.mjs --locale=th
```

`--part=all` combines only these focused test groups, not the whole system.
Layout fixtures require a current web build and intercept all API requests.

## Remaining Live Check

Startup regression follow-up: duplicate templateInputOptions bindings in the
Scene Template publish route prevented ESM parsing. Remove both duplicate
entries and add node --check gates for the three related route modules to the
focused server runner. Domain-only tests did not cover route parsing; their
previous pass did not establish backend startup readiness.

Owner restarts the backend and reloads the browser when ready. Open an existing
post's Edit Share Template, inspect legacy fields to be locked, select optional
inputs and save. A new Use Template session should require outfit front and
expose only enabled optional Character/back. Old sessions retain their version.
Do not auto-restart workers or generate an image as part of verification.
