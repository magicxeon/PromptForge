# Image 2.5 Development Testing

Superseded 2026-09-09 by [007 measured pricing](007-openai-image25-measured-pricing.md).
The 1-Credit contract below is historical. Four user-supplied jobs verify live
usage for the measured scope; unreserved test quotes now require new consent.

Date: 2026-09-09. Status: implemented and isolated checks passed; live UAT pending. Supersedes only the development/testing gate
in 005; production qualification and measured retail pricing remain pending.
Owner: Generation Providers and Credits. Primary: Product Requirement Architect.
Sequential Backend, Commercial and QA review; more than three roles are needed
because external dispatch and a billable test tariff cross ownership boundaries.
Reviews are not independent. Skills: implement-generation-workflow,
review-commercial-integrity, verify-release-regressions.

## Contract

- Enable Sunburst and Flare with the existing internal_testing catalog contract
  in development/test only. Preserve default model, adapter and other models.
- Charge an explicit temporary test tariff of 1 Credit per output, including
  references, through normal quote/reserve/capture/refund. This is NOT actual
  provider cost or a qualified retail price. OpenAI still charges actual usage.
- Display the test-price warning before Generate. No free or direct provider
  bypass. The locked quote matches provider/model/references/output count.
- Keep paidRoutingEnabled false; deny production catalog selection AND direct
  price lookup. Record testingOnly and the tariff version in pricing evidence.
- Preserve token rate evidence and usage; do not fabricate provider cost.
- No automatic paid UAT, API-key access, live data mutation or worker restart.

## Ordered Tasks

1. [x] Configure internal testing, version the test tariff, reject production.
2. [x] Add localized test-tariff notice without moving Engine controls.
3. [x] Test aliases, supported ratios, references, multi-output multiplication,
   production denial, and existing quote/reservation regressions.
4. [x] Run `node scripts/test-openai-image25.mjs all`; record evidence.
5. [ ] Manual: after idle backend restart/source frontend refresh, select
   OpenAI > either Image 2.5 > inspect 1-Credit quote > Generate once. Confirm
   usage and failure refund. Actual provider access/quality remains live UAT.

Rollback: disable testingRoutingEnabled for these entries. Do not delete usage,
ledger records or invalidate historical snapshots by rewriting them.

## Evidence

- 25 automated checks passed, including existing reservation/capture/refund
  regression groups and rejection of persisted development quotes in production.
- `node scripts/verify-look-sheet-exports.mjs image25` passed: both exact models
  are selectable, test notice visible, Generate enabled after the form/quote
  resolves. EN/TH at 390/820/1440. All API calls intercepted; no paid dispatch.
- Screenshots: temporary folder `mpf-look-sheet-image25-ZD0BL9`.
- Tariff policy: `mock-2026-09-09-image25-test-v1`; testingOnly and tariff version
  remain in the locked quote and reservation breakdown. No fabricated cost.
- Local backend 6500 was unavailable during checks. Rebuild/start with the
  existing development script before live testing. Provider account access,
  real output, actual usage and retail promotion are explicitly not verified.
