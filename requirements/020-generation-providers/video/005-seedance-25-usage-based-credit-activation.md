# Seedance 2.5 Usage-Based Credit Activation

Status: requirements recorded; implementation and activation deferred by the
user on 2026-09-13. No runtime configuration, price, billing or code change is
authorized by this documentation task.

Primary: Product Requirement Architect. Financial design follows Commercial
Integrity. Implementation requires Backend and QA gates, applied sequentially
if independent reviewers are unavailable. Owners: Credits and Generation;
provider configuration owns model rates and exposure. Finance consumes evidence.

## 1. Outcome And Scope

Replace the temporary one-Credit override for new Seedance 2.5 requests with
server-calculated, clearly quoted Credits, calibrated from existing successful
tasks. Reuse one pricing contract across Playground Video and Cinematic Studio,
including Simple/Advanced and each newly requested Take.

Initial model: `modelark / dreamina-seedance-2-5-260628`. Existing evidence is
sufficient to start calibration and scoped activation; do not require more paid
generations merely to collect samples. This does not prove all provider modes,
resolutions, durations or account-specific invoice costs.

Not in scope: retroactive charges/refunds, repricing accepted jobs, changing
other Seedance/Veo rates, changing media/reference policy, reopening blocked
1080p or video-input modes, new wallets, new Finance screens or full commercial
provider release. Implementation must not add customer-facing testing banners.

## 2. Recorded Evidence

Read-only local snapshot on 2026-09-13, from the VideoProviderTaskRepository
store resolved by `resolveDataFile('videoProviderTasks')`. Of 35 Seedance 2.5
attempts, 20 completed and all 20 contain provider-reported completion tokens.
The other 15 failed and must not be counted as successful token samples.

All rows below used 9:16 and `multimodal_reference`:

| Resolution | Seconds | Audio | Completed samples | Tokens per sample | Example Task |
|---|---:|---|---:|---:|---|
| 480p | 4 | generated | 10 | 38,830 | videotask_795fac2e4ce7e7d8d79f |
| 480p | 6 | generated | 1 | 58,045 | videotask_82c65d5789aceebc932b |
| 480p | 6 | none | 1 | 58,045 | videotask_870b30184737ab4cd825 |
| 480p | 8 | generated | 1 | 77,260 | videotask_8b46965893763594f9b0 |
| 720p | 4 | generated | 1 | 87,300 | videotask_d8bf4d4a451364cf7c69 |
| 720p | 6 | generated | 4 | 130,500 | videotask_17cece5c96fc705445df |
| 720p | 6 | none | 2 | 130,500 | videotask_1f4b7fb5c0f614a70c4a |

Current rates and conversion rules already exist in
`server/config/cinematic-video-models.json` and `credit-pricing-policy.json`.
The model remains `pricingStatus: research_only` with paid routing disabled.
VideoCapabilityRegistry and CreditReservationService apply the configured test
override; recent completed tasks record one estimated/captured Credit. Missing
successful samples are not the reason this override remains active.

These are usage observations, not BytePlus invoice totals or a fresh rate-card
verification. Audio equality in observed samples is not evidence that every
future audio/model combination costs the same.

## 3. Pricing Contract

1. Build a versioned calibration from existing sanitized task usage and actual
   submitted parameters. Record exact model, resolution, aspect ratio, input
   mode, duration, audio, output count and relevant output dimensions/FPS.
   Verify requested-versus-returned geometry and frame-count rounding before
   choosing a formula; do not blindly replace the current FPS assumption.
2. Keep estimate, measured usage-derived cost and invoice-reconciled cost
   distinct. Before Generate, estimate tokens and apply the applicable existing
   model rate plus the configured FX, safety buffer, margin and Credit rounding.
   Do not invent new commercial percentages or hard-code prices in React.
3. Provider cost estimate = estimated billable tokens / 1,000,000 * applicable
   USD token rate, with output count handled exactly once. Continue conversion
   through VideoPricingCalculator and the existing Credits policy.
4. Price the actual requested provider clip duration, including configured
   lead-in and provider duration normalization. A four-second usable Shot that
   requests five seconds must quote five seconds, not four or four-and-a-half.
5. Static Storyboard/Look references are not input video and must not select
   the lower video-input tariff. Keep video-input minimum-token floor guards.
   Do not invent an extra per-image fee unless the applicable rate requires it.
6. For supported combinations without direct samples, use an explicitly
   versioned conservative estimate with its evidence limits documented. Do not
   falsely label interpolated values as measured, unlock unsupported modes, or
   demand a paid test for every duration. Reject genuinely missing rates or an
   unrepresentable billing contract instead of issuing zero/free pricing.
7. Recheck applicable rate/account/service tier and promotion dates before
   activation. Existing dated evidence in 004 is a baseline, not a perpetual
   current-price guarantee. Invoice reconciliation can remain pending with a
   provisional cost basis; do not report that basis as settled invoice cost.

## 4. Quote, Charge And Cost Evidence

- The UI shows the server estimate before Generate. Any model, duration,
  resolution, audio, reference or count change requires a matching new quote.
- Pin estimator, provider rate, FX/retail policy versions and exact inputs in
  the accepted quote. Reserve and capture through the existing Credit lifecycle;
  prevent duplicate submit/capture and preserve insufficient-balance handling.
- Capture the accepted customer quote under existing success rules. Actual
  token usage must not trigger a supplemental debit or automatic usage-based
  refund. Explain this as quoted retail pricing, not token-by-token settlement.
- Preserve old one-Credit tasks, accepted quotes, reservations, ledger entries,
  media and Takes. Never regenerate old tasks or recalculate their customer debt.
- Record returned tokens and versioned usage-derived provider cost separately
  through the existing Generation/Finance ownership boundary. Missing usage is
  unknown, not zero cost. Failures/refunds may still have provider expenditure;
  preserve existing customer refund rules independently from cost evidence.
- Compare estimates with observed costs and later statements. Adjust only future
  pricing versions; keep discrepancies traceable to Task, quote and rate version.

## 5. Activation And Reconciliation

This document extends video/001 and 004 only for the planned Seedance 2.5
transition. Their instruction to preserve current test charges still applies
until implementation is requested and the scoped activation checks pass.
Pricing readiness must not silently override provider availability, reference
authority, access restrictions or unsupported-mode gates.

Activation must be explicitly scoped to the target model and supported product
operations through existing server configuration. It must remove the temporary
override for those new requests without enabling every research-only model.
An expired/stale estimate must be renewed, not silently switched in place.
Existing accepted work finishes under its original charge snapshot.

Rollback affects only future quotes/routing through the same configuration
owner. Do not rewrite in-flight reservations or completed ledger history.

## 6. Acceptance

- All 20 recorded successful samples can be audited offline and model/input
  coverage is reported without exposing prompts, faces, credentials or Base64.
- The chosen calibrated estimator is checked against each observed group;
  error, rounding and conservative treatment of uncovered inputs are documented.
- Playground and Cinematic request the same Credits for identical billable
  inputs; duration buffer, audio, references and output-count parity hold.
- The future activated target no longer quotes a one-Credit override; unrelated
  models and all pre-activation accepted charges remain unchanged.
- Normal success/failure, duplicate requests, stale quotes, insufficient funds,
  rate changes and rollback preserve existing authorization and ledger rules.
- Measured tokens/cost never change the accepted retail quote retrospectively.
- No additional paid generation or live data mutation is part of offline tests.

Ordered implementation and focused checks:
[006 Implementation Plan](006-seedance-25-credit-implementation-plan.md).
