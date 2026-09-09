# Dynamic Render Implementation Plan

Parent: 017. Status: approved scope verified; Studio paid exposure and live UAT pending.

## Ordered Tasks

- [x] D1: adult validation in document normalization and approved identity acceptance;
  keep draft/history readable. Tests: 17/18/120/121, null, selected 15-19 vs 20-23.
- [x] D2: dynamic engine transitions using catalog-supported ratio fallback; preserve
  fixed-ratio consumers. Canonical prompt carries selected layout. Unit checks.
- [x] U1: reconcile mockup and form, localized age errors, result-first workspace.
- [x] G1: reusable Generation-owned enhanced-submit controller over existing APIs;
  free quotes, fee consent, loading, failure/recovery and bounded image submission.
- [x] G2: persist operation/request IDs, reuse valid artifact, guard concurrent click,
  actor switch and draft changes; preserve existing service idempotency/refunds.
- [x] V1: focused domain/UI/API/type checks; isolated commercial and recovery tests.
- [x] V2: fixture-only browser checks at 390/820/1440 EN/TH; shared sibling regression.

## Verification

Extend scripts/test-look-sheet-exports.mjs with dynamic-domain, dynamic-ui,
dynamic-types and dynamic-all. Aggregate explicit; no paid calls/live data mutation.
Browser: scripts/verify-look-sheet-exports.mjs playground/studio with source Vite
server, intercepted APIs and multiple provider fixtures. Live provider UAT separate.

## Evidence And Gaps

Approved scope implemented and verified on 2026-09-09. Paid Studio Enhancement
exposure remains pending explicit approval; the existing Playground-only server
gate is preserved. No real provider image quality or paid execution claim.

- dynamic-domain: 26 tests passed (adult policy, orientation fingerprint, existing
  enhancement settlement/refund/privacy/recovery and normal Generation contracts).
- dynamic-ui: 51 tests passed (engine aliases/fallback, fixed-ratio/reference gates,
  controlled form, shared result/workspace, explicit API request ID and 12 enhanced
  render scenarios including insufficient funds, lost responses and actor switch).
- dynamic-types passed; generation group passed 10 parity/regression tests;
  compatibility-ui passed 31 tests. node --check on changed server domain passed.
- Fixture browser: playground, studio and enhancement groups passed EN/TH at
  390/820/1440. Enhancement also passed default/fashion/creative themes. Provider
  selection persists after async rerender; under-18 submission disabled; result
  precedes configuration; reload performs no new text/image call; no overflow.
- Screenshot folders under Windows temp: mpf-look-sheet-enhancement-IHiZpy,
  mpf-look-sheet-studio-5Jyrvl, mpf-look-sheet-playground-hgCXGK. Desktop/full-page
  and mobile viewport evidence inspected. Earlier failures exposed inaccessible
  select labels and an incomplete share-status fixture, both corrected.
- Sequential Backend/Commercial/UX/QA review; no independent reviewer available.
  Source server is http://127.0.0.1:5173. No paid call, live data mutation, worker
  restart or web/dist overwrite. git diff --check passed.

## Runtime And Manual UAT

No file moves or server data paths added. Existing document snapshots now bind
aspectRatio; old rendered History remains readable but old enhancement artifacts
can require explicit refresh against the updated prompt/layout fingerprint.
Actor draft v1 additionally preserves the image request/estimate IDs before submit.
Free text quotes reuse TanStack actor/input keys (20s stale, 60s unused GC), use
the existing 320ms draft debounce, and never execute AI. Existing server quote
expiry cleanup and 5,000-record bound remain; single-writer JSON production risk
and Finance text-cost projection remain deferred from 016.

Manual UAT: after active jobs finish, restart the normal development stack to load
server validation/prompt changes. In Playground Look Sheet choose an eligible
model/ratio, enter age >=18, enable Enhancement and review both fees. Generate
once; verify refinement status, image status and actual provider output layout.
Do not infer exact visual age, fixed panel placement or provider approval from
automated fixtures. Studio keeps age/layout changes without enabling a new paid
Enhancement feature until the pending exposure decision is approved.
