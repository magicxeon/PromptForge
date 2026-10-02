# Seedance 2.5 Credit Implementation Plan

## 2026-10-02 Backend Delivery Addendum

Phase2-23 authorizes the bounded backend implementation and supersedes the parked
status and fixed-quote settlement assumptions below for newly qualified paid work.
Scoped development/test Seedance 2.5 activation is now authorized by the user;
production publication remains gated. Main
owns text operations, shared product consent and the Phase2-23 task index.

Ordered backend tasks and evidence:

1. Policy/calculation: implemented. Independent text/image/video markup defaults
   to 30%, with numeric validation from 0 through 1000 percent. Fixed image tariffs
   and legacy minimum-margin helper behavior remain unchanged. New video estimates
   pin the rate, retail assumptions, estimator and actual-usage policy version.
   Reserve a 1.10 cost allowance distinct from the 15% operating buffer; settlement
   does not charge the unused allowance. The observed Seedance portrait profile
   includes one extra frame. Discounts fail closed without eligibility evidence.
2. Settlement/dispatch: implemented. Credits captures from the immutable reservation
   snapshot, using returned completion tokens or the documented seconds metric.
   Partial capture and a separate `release` ledger entry commit atomically. Capture
   defaults to full amount for legacy/text callers. Missing/malformed and above-cap
   usage retain the hold, durable output and reconciliation state. Atomic dispatch
   claims prevent duplicate effects in the existing single-process JSON runtime.
3. Admin policy: implemented for bounded local manual publication through the
   existing pricing revision owner, not a second publisher. Drafts require three
   percentages, command, reason and active baseline; publication requires expected
   version, active baseline, command and reason. Support and production mutations
   are denied; the existing publish feature gate still applies. Audit intent is
   recorded before activation; immutable activation evidence commits with the
   active pointer. Credits reads the active snapshot through Admin Configuration's
   public facade per policy load, without a polling loop or stale active cache.
4. Consumer integration: backend and scoped Control Plane Pricing UI implemented;
    Main owns remaining product/Finance integration. Existing
   configuration revision list adds `activePricing` with `pricingPolicyVersion`,
   `profitMarkupPercentByMedia` and nullable `revisionId`. Public Video task projection
   adds nullable `capturedCredits`, `releasedCredits` and `chargeMode`. Finance hold
   projections must count the new release event; this is reported to Main rather
   than changing the separate Finance report owner in this slice.
5. Scoped activation: implemented a catalog-owned runtime overlay for Seedance 2.5
    only in development/test, without requiring the old POC switch. Its paid profile
    allows portrait 24fps, online, one output, still-image multimodal references,
    and only recorded resolution/duration/audio/reference-count combinations.
    Keep source-authority and first-frame gates, 1080p exclusion and missing video
    token floors. Pin configured September 10.7 USD/M rate as provisional evidence;
    do not claim fresh provider/account price verification or invoice finality.
    Acceptance: resolved catalog, paid quote and actual capture/release work for all
    seven measured groups; other models, environments and unmeasured combinations
    stay blocked for NEW paid quotes; historical reservations remain unchanged.
6. Validation: focused isolated checks below; no paid requests, worker restart,
    live data mutation or backfill. Commercial/Backend/QA review
   is sequential in one agent, not independent certification.

Final integration addendum: a separate QA reviewer was added by the coordinating
owner. Its preflight-refund finding was fixed with definite-dispatch evidence,
no-task checks, actor/idempotency-scoped bounded coalescing and a terminal-
reservation guard, including missing/empty status. Unknown/unreadable state retains
the hold. Final settlement checks passed82, focused Video40 and recovery13;
Finance release totals passed6.
The existing read-only Finance report now includes unused-reservation `release`
events in returned Credits. No ledger backfill, cash/profit inference or paid
provider request was introduced. Final QA verdict is recorded in Phase2-23 task007.

New source ownership: `videoPaidActivation.js` under server provider configuration;
`CostPlusPricing.js` under Credits; `PricingConfigurationService.js`
and `pricingDraftValidation.js` under Admin Configuration. New tests are
`test/videoActualCreditSettlement.test.js` and `test/adminPricingPublication.test.js`.
Admin UI ownership: `web/src/features/admin/components/AdminPricingConfiguration.tsx`,
its colocated test, `schemas/adminPricingSchemas.test.ts`, existing Admin API/schema
and Control Plane route/tests; only Admin namespace keys under en/th/ja are added.
`scripts/verify-admin-pricing-ui.mjs` owns isolated intercepted visual verification.
No files moved or runtime paths introduced. Existing Credits database, Video task
store and Admin Configuration revisions store retain ownership and location.

Commands (Node 22+, temporary repositories, stub providers, no credentials/server):

```text
node scripts/test-byteplus-pricing.mjs settlement
node scripts/test-byteplus-pricing.mjs admin
node scripts/test-byteplus-pricing.mjs video
node scripts/test-byteplus-pricing.mjs integration
node scripts/test-byteplus-pricing.mjs image
node scripts/test-byteplus-pricing.mjs frontend
```

The existing explicit `all` command includes the new selectable groups and remains
fail-fast and offline. Do not automatically run it or activate providers.
Final focused evidence: settlement 64/64, Admin 21/21, video 17/17,
integration 14/14 and image 20/20 passed. Catalog-backed fixtures quote and settle
every measured case with real temporary Credits repositories and no POC switch;
an offline adapter verifies one dispatch and settlement after activation rollback.
Historical catalog fixtures retain the old POC/source contracts. No paid UAT was run.
Scoped source syntax, configuration JSON parsing and whitespace validation accompany
the handoff. Independent review and live runtime behavior are not certified.

Remaining activation gaps: production identity/transactional storage and deployment;
unmeasured requests (including five-second lead-in renders, landscape, text-only,
first/last frame, additional reference-count/audio combinations and 480p 30s);
fresh account-effective provider rates and invoice reconciliation; Main's remaining
public DTO handling and Finance release-event integration. Existing fixed image
tariffs remain explicit exceptions to the category markup setting. Other models
require their own qualification. No worker restart or live configuration publication
was performed; a running process may retain the earlier static catalog until reload.

Parent: [005 Usage-Based Credit Activation](005-seedance-25-usage-based-credit-activation.md).
### Scoped Admin Pricing UX Pre-Review (2026-10-02)

The user reassigned only the existing Control Plane configuration Pricing editor,
its API/schema and Admin locale keys. Preserve other tabs, generic non-pricing
draft forms, revision history and Finance screens. Backend remains primary;
UX pre-review is sequential alongside the mandatory Commercial and QA gates
because this slice adds a financial screen interaction. No independent Bohr review
is available here. Skill: `review-product-ux`; canonical visual-language references
and existing Button, AsyncState, Surface and ConfirmDialog contracts were reviewed.

Admin path: select Pricing, inspect active percentages/version, edit three numeric
0..1000 markup fields and reason, save immutable draft, review its current-versus-
draft values, explicitly confirm publication. Draft save must never change active
values. Publish uses draft version, original active baseline, stable command ID
and reason through the existing Admin Configuration endpoint, not Finance.
Show fixed image tariffs as exceptions, markup on buffered provider cost rather
than gross margin or realized profit, and new-quotes-only scope in financial copy.

States: loading/error with retry; missing active contract read-only; Support and
production read-only; server publication feature gate disabled; stale baseline
disabled; pending save/publish with shared spinner; persistent save/publish error
and success. Draft and publication retries retain the command ID for identical
input. Query keys include actor ID; do not add polling or durable browser drafts.
At 390/820/1440px, constrain long revision IDs and wrap labels/actions; semantic
form labels, browser numeric bounds, dialog focus/cancel and English/Thai keys
are acceptance gates. Reuse existing route shell without moving sibling sections.

Focused frontend checks: existing Admin Control Plane tests plus owning pricing
component/schema tests under `web/src/features/admin/`; intercepted browser checks
with no backend mutations, and `npm --prefix web run typecheck`. Report any unavailable
viewport verification rather than claiming UI closure.

### Admin UI Delivery Evidence

The scoped form is implemented with three numeric markup inputs, active values,
saved-draft comparison and confirmed manual publication. Non-pricing forms and
sibling tabs remain. Active response fields and mutation responses have owning
Zod schemas, including the repository's `publishedAt: null` draft contract.
The publication switch remains server-gated by default; no environment override
or live publication was performed. EN/TH/JA pricing-key parity passed (19 keys).

`node scripts/test-byteplus-pricing.mjs frontend`: 17/17 passed. Browser verification
passed EN/TH at 390/820/1440px with reduced motion: numeric controls and confirmation
fit, no page overflow, save leaves active percentages unchanged, confirmed publish
refreshes active values. All API traffic was intercepted; zero backend mutations.
Full-page, editor and confirmation screenshots were recorded under
`C:\Users\punya\AppData\Local\Temp\mpf-admin-pricing-visual-NuY6th` and reviewed.
Existing mobile shell/tab label wrapping is preserved, not redesigned in this slice.

Reproduce with a local Vite preview (no backend startup needed for interception):
`node scripts/verify-admin-pricing-ui.mjs http://127.0.0.1:5188`.
Frontend dependencies and installed Playwright Chromium are required. The visual
runner is separate from the explicit aggregate and cannot dispatch paid generation.
The preview was started at that URL using temporary Vite cache storage.

Read-only TypeScript check:
`node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false`.
It reports no Admin errors but is blocked by the concurrently owned
`CinematicCharacterLooks.tsx:138` and `CinematicStageContent.tsx:563`
`CharacterLookSuggestion.billingStatus` mismatch. Those sources are not edited here;
Bohr/Main must finish their contract alignment before a global typecheck passes.

## Historical 2026-09-13 Plan (Superseded Above)

Historical status: parked; every implementation task below was pending. The user requested
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
