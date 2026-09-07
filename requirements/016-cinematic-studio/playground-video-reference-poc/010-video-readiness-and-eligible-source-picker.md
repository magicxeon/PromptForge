# 010 Video Readiness And Eligible Source Picker

Status: implemented and deterministically verified; paid provider qualification remains pending.
Parent: [000-master.md](000-master.md).
Owning capabilities: Playground presentation, Generation validation, Credits pricing.

## Outcome

A newly captured eligible Seedream 5 source must produce a locked Seedance POC
quote and enable Generate without weakening source, Credit, idempotency or active
task protection. The generated-image picker must contain only currently eligible
owned sources and present the minimum information needed to choose one.

## Business Rules

1. The development POC environment flag exposes the testing model; it does not
   bypass quote, ownership, source verification or Credit reservation.
2. A Seedance model marked `developmentPocUnverified` quotes and reserves its
   server-owned `developmentPocCredits` for both `playground_video` and
   `cinematic_video`. Provider cost remains in the breakdown for Finance evidence.
3. The displayed POC amount, locked quote, submitted request and reservation must
   agree. A normal 830-Credit quote must never be shown or reserved for a one-Credit
   POC attempt.
4. Generate remains disabled until prompt, source, model, quote, affordability and
   active-task conditions pass, but the button must name the first real blocker.
5. The picker requests eligible-only data from the server. Filtering must occur
   before pagination so an ineligible first history page cannot hide usable rows.
6. Picker cards show preview, friendly model family, generation type and remaining
   trust window. Raw provider URLs, full timestamps and redundant eligibility copy
   are omitted. The selected-source summary may retain expiry detail.

## State Matrix

| Condition | Primary action state |
|---|---|
| prompt empty | disabled; request prompt |
| first frame missing/expired | disabled; request eligible image |
| quote loading | disabled; calculating estimate |
| quote failed | disabled; show sanitized error and retry |
| insufficient Credits | disabled; show required Credits |
| active non-terminal task | disabled; direct user to current task |
| all gates pass | enabled; show exact locked Credits |

## Implementation Steps

1. Add a focused failing Credit test for Playground POC quote/reservation parity.
2. Extend the existing server-owned POC pricing guard to Playground Video.
3. Add eligible-only source listing through the existing route/service contract.
4. Add a pure readiness projection and bind button copy to its reason.
5. Compact the trusted-source dialog and preserve keyboard/pagination behavior.
6. Run Video/Credit domain tests, trusted-source UI tests and TypeScript checks.

## Acceptance

- The current eligible source can be quoted without generating another image.
- Quote returns one Credit with `development_poc_credit`; provider estimated cost
  remains auditable.
- No provider task is created by readiness or picker tests.
- Existing unrestricted upload, Cinematic and production paid-routing behavior is
  unchanged.

## Verification Evidence

- Runtime quote for `job_1788775282631_z43cb7jjw` returned one Credit with
  `development_poc_credit`; provider estimate 830 remained in the cost breakdown.
- The quote stopped before task submission and no paid provider call was made.
- Focused trusted-source, reference-contract, Credit/Generation regression, UI,
  TypeScript, i18n and responsive layout checks passed on 2026-09-07.
