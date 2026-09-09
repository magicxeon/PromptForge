# Editorial Pattern Implementation Plan

Status: implemented and isolated checks passed; paid visual UAT pending. Updated: 2026-09-09.
First deliver Provider image/005 API/catalog checks; paid rollout may stay pending.

## Ordered Tasks

- [x] L1a Add version 2 recipe with fixed section hierarchy and orientation variants.
- [x] L1b Extend canonical compiler/snapshot; preserve six form fields, adult and
  approved identity/outfit checks. Pin layout/text policy into the fingerprint.
- [x] L1c Accept both recipe versions in client boundaries. Preserve enhancement
  canonical layout and reject stale artifacts through existing fingerprint check.
- [x] L2a Version-aware export: no duplicated v2 heading, v1 still readable;
  original bytes, download-only branding and Comparison export unchanged.
- [x] L3a Focused deterministic recipe/identity/version tests, export pixel tests
  and schema compatibility checks; run existing adjacent prompt/credit tests.
- [x] L3b Sequential Backend/Commercial/QA review and record actual evidence.
- [ ] LIVE: human quality check on new portrait sheet with supplied description;
  check repeated generation, names/age/identity/feet/text and all seven sections.
  Separate user-authorized paid UAT; do not spend money in automation.

## Validation

`node scripts/test-look-sheet-exports.mjs editorial-domain`
`node scripts/test-look-sheet-exports.mjs editorial-export`
`node scripts/test-look-sheet-exports.mjs editorial-schema`
`node scripts/test-look-sheet-exports.mjs editorial-all`

Aggregate is explicit and fail-fast. It includes current definition, Generation,
Enhancement, export and client schema checks plus TypeScript. No live provider,
JSON mutation, build overwrite, new dev server or worker restart. Use existing
browser fixture checks if a visible control/result contract is changed.

## Release Limit

Automated checks prove prompt/metadata/export contracts, not generative visual
compliance. Exact fixed geometry remains deferred. No claim of provider visual
qualification or complete rollout until the LIVE checks have evidence.

## Evidence Ledger

2026-09-09 results:
- editorial-domain: 28 passed, including canonical queue/history, privacy,
  stale-source, Enhancement settlement/recovery and adult checks.
- editorial-export: 8 passed; pixel check confirms source begins at the top
  inset, v1 heading retained, v2 not duplicated, originals unchanged.
- editorial-schema: 3 passed; TypeScript passed.
- compatibility-prompt: 17 passed; ordinary Face/Character/Scene rules unchanged.
- Playwright fixture playground and studio: EN/TH at 1440, 820, 390 passed.
  Inspected desktop Playground and mobile Studio screenshots; no layout change.
  Evidence folders: `%TEMP%/mpf-look-sheet-playground-IZGjxK` and
  `%TEMP%/mpf-look-sheet-studio-Se12wM`. Fixture responses, not paid image quality.
- OpenAI provider aggregate: 20 checks passed. Syntax and diff checks passed.
- Backend/Commercial/QA review was sequential self-review. Financial invariants
  unchanged; unpriced models cannot reserve/dispatch, source-private metadata
  stays private, no migration or extra paid panel jobs introduced.

Rollout: deploy the v1/v2-capable frontend before activating the v2 backend recipe;
an old built frontend only understands v1. Existing source dev server is :5173.
Do not overwrite a user's dirty web/dist or restart a worker with active Jobs.
Restart backend in an idle window to load provider config/recipe; reload frontend.
No production build, worker restart, paid API call or live JSON mutation performed.
