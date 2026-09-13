# Seedance 2.5 Credit Implementation Plan

Parent: [005 Usage-Based Credit Activation](005-seedance-25-usage-based-credit-activation.md).
Status: parked; every implementation task below is pending. The user requested
documentation only on 2026-09-13. Do not execute this plan until instructed.

## Ordered Tasks

1. Evidence audit and reconciliation.
   - Read existing Seedance 2.5 tasks through the owning repository; deduplicate
     by Task and separate completed usage from failed/missing observations.
   - Build sanitized fixture groups matching the seven observed combinations.
   - Check dimensions/FPS, actual duration, input mode, audio and reference count;
     record coverage and estimator error before tuning.
   - Reconcile 001/004 and Finance attribution; no additional paid samples.
2. Versioned estimator and rate policy.
   - Extend existing VideoPricingCalculator/configuration, not another estimator.
   - Calibrate measured groups and document conservative estimates for supported
     but unmeasured durations, including five-second buffered render requests.
   - Pin applicable rate, discount window and retail conversion versions; verify
     account/rate evidence and do not substitute an invoice claim for an estimate.
   - Add focused deterministic calculation/rounding/invalid-input tests first.
3. Immutable quote and internal cost evidence.
   - Trace CreditApplicationService/CreditReservationService through Generation
     quote, submit, reservation, completion and capture/refund consumers.
   - Preserve existing customer settlement; store actual usage-derived cost
     separately with basis, rate version and Task correlation.
   - Verify no retroactive debit/refund, double count or historical rate overwrite.
4. Scoped override removal.
   - Trace VideoCapabilityRegistry and the temporary charge override precedence.
   - Prepare a target-model activation configuration with an explicit effective
     boundary; leave other models, access and media capability gates unchanged.
   - Ensure accepted pre-change quotes/reservations keep their original terms;
     changed-input/expired quotes must be renewed visibly.
   - Document rollback for future requests without modifying accepted work.
5. Shared consumer parity.
   - Verify Playground Video and Cinematic Simple/Advanced use the same server
     quote and actual provider duration, with optional audio and reference modes.
   - Preserve existing estimate loading/error and insufficient-Credit controls;
     do not add new testing banners or redesign working screens.
6. Focused validation, review and handoff.
   - Backend and QA review are required; apply Commercial Integrity and Generation
     Workflow checks for the billable cutover. Disclose non-independent review.
   - Record commands, input coverage, evidence limits and configuration diff.
   - Mark implemented only after scoped checks pass. Provider invoice match stays
     a separately reported reconciliation item, not a claimed completed test.

## Validation Plan

Extend `scripts/test-byteplus-pricing.mjs`, the owning offline runner, with small
selectable Seedance estimator, settlement and consumer-parity groups. Preserve
its existing groups and explicit fail-fast aggregate; do not run the aggregate
automatically for each edit. Final command names must be documented when added.

Reuse nearest owning tests under `test/` for VideoPricingCalculator,
CreditReservationService, VideoGenerationApplicationService and capability
configuration. Use temporary repositories/fixtures, never the live wallet.

Required cases: each recorded token group, conservative unmeasured duration,
White Previs lead-in, output count, audio, still references versus video input,
missing rate/usage, expired promotion, quote/input mismatch, duplicate submit,
insufficient funds, success capture, failure/refund, old one-Credit reservation,
rate change while queued, target-only activation and rollback.

If visible price controls change, add the relevant existing React consumer tests
and intercepted browser checks only for those controls. No paid AI calls, live
Project/ledger rewrites, worker restart or provider activation inside test runners.

## Ownership And Deferred State

Known owners: `server/config/cinematic-video-models.json`,
`server/config/credit-pricing-policy.json`,
`server/domain/credits/VideoPricingCalculator.js`,
`server/domain/credits/CreditReservationService.js`,
`server/domain/generation/VideoCapabilityRegistry.js`,
`server/domain/generation/VideoGenerationApplicationService.js` and
`server/domain/generation/VideoProviderTaskService.js`.

Read task history via `server/repositories/generation/VideoProviderTaskRepository.js`.
Use existing configuration publication, Generation, Credits and Finance facades;
do not introduce a root-level file, parallel balance or raw data mutation path.
No new runtime store is planned. If an implementation needs a new location,
update the architecture map before creating it.

Documentation delivery evidence: owning requirements/code and local usage were
read, links and whitespace checked. No implementation, tests, build, billing
configuration edits or activation performed for this parked requirement.
