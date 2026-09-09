# 004 BytePlus Pricing Reconciliation (2026-09-08)

Status: scoped implementation verified (2026-09-08); commercial qualification
and the explicit pending items below are NOT complete. Image details in ../image/004.
Primary: Commercial Financial Integrity. Reviewers: Backend and QA (sequential,
not independent). Skills: review-commercial-integrity, implement-generation-workflow,
verify-release-regressions. Capability owners: Credits and provider configuration;
Finance consumes inventory only. No new pricing editor, scheduler or ledger.

## Evidence And Rates

Official https://docs.byteplus.com/en/docs/ModelArk/1544106, updated September 4,
read through browser September 8, 2026. Units below are USD/million completion
tokens, not USD/thousand or USD/second. Console per-K figures can be rounded.

| Model | Resolution | No video input | Video input |
|---|---|---:|---:|
| 2.5 | 480p/720p | 10.7 | 6.4 |
| 2.5 | 1080p | 11.7 | 7.0 |
| 2.0 | 480p/720p | 7.0 | 4.3 |
| 2.0 | 1080p | 7.7 | 4.7 |
| 2.0 | 4K | 4.0 | 2.4 |
| 2.0 Fast | 480p/720p | 5.6 | 3.3 |
| 2.0 Mini | 480p/720p | 3.5 | 2.1 |

Promotions use UTC [start,end): 2.5 1080p multiplier 0.72 from Aug14 06:00
through Sep17 06:00; Fast multiplier 0.75 and Mini multiplier 0.40 from Aug7
06:00 through Oct7 06:00. The latter expiry supersedes the older September7
snapshot in requirement 001. First-frame images do NOT select video-input rates.

## Implementation Steps

- [x] B1 Image: implement image/004 using canonical provider size resolution.
  Verified image group: 20 tests passed.
- [x] B2 Video: keep list rates and dated promotions separately in the existing
  catalog. Extend VideoPricingCalculator, preserving Veo/audio/legacy adapters.
  Pin effective rate/version/discount/window/tokens/dimensions in estimate
  breakdown; cap new discounted estimate validity at the discount end. Existing
  accepted reservations retain their original snapshot. Never use client time.
  Verified video group: 17 tests passed; qualification gates unchanged.
- [x] B3 Inventory: Finance lists new image cost tiers, reference costs and video
  input-mode rates with evidence dates. Public capability DTO omits raw rate data.
- [x] B4 Verify focused image/video/integration groups and existing reservation,
  parity, provider and Finance tests. Script scripts/test-byteplus-pricing.mjs
  exposes image|video|integration|all; aggregate is explicit, isolated and unpaid.

## Financial And Compatibility Rules

Current flow: Generation estimate -> CreditApplicationService -> pricing/
reservation services -> stored estimate -> existing actor/input parity -> reserve
-> provider -> existing capture/refund. Do not change terminal settlement rules,
balances, grants, creator shares, POC charges, qualification or runtime gates.
Cost estimates are not invoices or realized Finance costs. No automatic customer
refund based on provider usage is added. No backfill of old quotes or Jobs.

Validate finite positive duration/fps/count/rates; no NaN/free quote for absent
rate. Reject unsupported offline pricing instead of using online silently.
Minimum token floors are required for Seedance 2.x VIDEO input. Exact tables at
https://bytedance.larkoffice.com/wiki/H0fUwHPxtiHayOk6CVpcZzKqnHJ are pending
verified import. Current normalized execution has no input-video upload path;
retain it. Fail closed on video-input estimates lacking a matching server-owned
floor; do not invent one from duration heuristics. Static-image references still
work. Model 2.5 1080p remains qualification-blocked even though research pricing
exists. Offline dispatch, layer decomposition, promotions for retail Credits,
account-specific packs/taxes and billing reconciliation remain pending.

## Acceptance And Evidence

Expanded owner-prompt-first evidence inventory (Seedance versions, Seedream and
Muse): ../qualification/002-byteplus-muse-cost-evidence-plan.md. This adds pending
manual evidence gates, not paid-route authorization or new model integration.

Tests: before/start/end promotion boundaries; 480p unaffected by 1080p promotion;
first frame uses no-video rate; missing floor/rate fails; no mutation of models;
reference cost/pixel thresholds/counts; immutable stored discounted quote; POC
and paid-route gates unchanged. Billing examples still needed from owner.
Integration group: 14 tests passed, including exact expiry rejection, immutable
stored estimate evidence, public DTO rate exclusion, Finance inventory and
existing one-Credit POC/parity/reservation checks. Total: 51 passing tests.
Malformed discount windows and zero image output costs fail closed.

Commands (Node 22; isolated fixtures; no credentials or running server required):
```text
node scripts/test-byteplus-pricing.mjs image
node scripts/test-byteplus-pricing.mjs video
node scripts/test-byteplus-pricing.mjs integration
```
Optional explicit aggregate for later UAT preparation:
`node scripts/test-byteplus-pricing.mjs all`.
`git diff --check` passed. Review applied sequentially by the same agent, not
independently. No full-system suite, paid provider request, browser layout test,
live data mutation or worker restart was performed. No UI layout was changed.
Restart the backend when active Jobs have finished to reload cached policy and
catalog configuration; request a new estimate. Existing accepted reservations
are not repriced. Runtime billing reconciliation still requires provider evidence.
