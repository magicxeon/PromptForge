# Cinematic Writing Credit Pricing Proposal

2026-10-02: [Phase2-23](Phase2-23-ai-credit-activation.md) supersedes charging
deferral and the hypothetical Full Story tariff below. Full Story with Characters
is free for now; separately requested Characters/Chapter/planning AI is paid.
Historical examples below remain research, not the active rate card.

2026-09-26 execution addendum: user authorized incremental implementation.
[Rewamp/013](../016-cinematic-studio/Rewamp/013-chapter-outline-and-writing-economics.md)
implements advisory outline/Chapter cost-plus-margin estimates and limited returned
usage evidence first. Charging, financial settlement and whole-pipeline failure
telemetry remain deferred. The trial tariffs below are not published prices.

Status: advisory outline/Chapter preview implemented; charging deferred, 2026-09-26. NOT a published rate card or authorization to
enable charging. Owner: Credits pricing and Cinematic authoring. Commercial
Financial Integrity review applies; reuse Phase2-07/08/10/15 for ledger, quotes,
durable jobs and refunds. Financial implementation remains deferred.

## Product And Trial Rates

Writing workspace use is free; explicit AI assistance uses the existing Credit
wallet. Writing (Brief -> Full Story -> Characters -> Chapters) is independent
of production planning (Scenes -> Shots/dialogue). Media is priced separately.
Do not promise a complete long novel within a bounded short-story/treatment plan.
Manual editing, import, save, revision browsing/restoration and deterministic
Character mapping/prompt assembly are free. Dossiers returned with Full Story
are included, not billed twice.

| Operation | Proposed Credits |
| --- | ---: |
| Brief generation/enhancement | 20-40 |
| Full Story with Character dossiers | 120-250 |
| Character extraction from imported story | 40-100 |
| Chapter batch, e.g. 6-8 short Chapters | 100-250 |
| Scene planning for one Chapter | 30-70 |
| Shots/dialogue for one Scene | 30-80 |
| Scoped AI revision | Quote from context and requested scope |
| Looks, Environment, First Frame, Video | Existing separate media quote |

These are experimental hypotheses, not measured profitable tariffs. Quotes must
bound source/context length and requested output. Larger requests can exceed these
ranges with new consent. Do not bill for extra Shots the AI independently invents.

Example: Brief 30 + Full Story/dossiers 180 + six Chapters 180 + six Scene-planning
operations at 50 + eighteen Shot-planning operations at 50 = 1,590 Credits.
Writing through Chapters alone is 390 Credits. At the existing assumption of
10 Credits/THB: THB159 and THB39, excluding revisions/media. This is not a price
for an arbitrary novel length; package discounts/tax/payment fees affect revenue.

## Cost Qualification

`server/config/credit-pricing-policy.json` currently assumes FX35 THB/USD, 15%
operating buffer, 70% target gross margin and 10 Credits/THB. These are assumptions,
not verified realized margins or a current exchange quote. Pricing baseline:
buffered cost / (1 - margin), converted using realized revenue per Credit, rounded
under a versioned policy. Account for payment fees/tax without double counting.

Official reference checked for the 2026-09-26 discussion:
https://developers.openai.com/api/docs/models/gpt-6-sol (Standard input USD2/M,
cached input USD0.20/M, output USD10/M). Reverify before publication; include cache
writes, long-context/service-tier premiums, retries/fallback, infrastructure and
failure overhead. Billed reasoning already included in output must not be counted
twice. Hypothetical 20k uncached input + 8k billable output = USD0.12; existing
assumptions yield about 165 Credits rounded to five, not measured job cost.

`CinematicFullStoryService` returns `qualification_no_charge`. Usage is not yet
consistently propagated/persisted for all operations, including Character extraction.
Collect 30-50 representative operations, including failures, before approving rates.
Record usage/model/outcome/latency/cost snapshots, not private story text in logs.

## Costed Scenario And Value Decision

Illustrative Standard-rate scenario, not measured usage or a published tariff.
Input/output tokens below include assumed billable reasoning in output once.
All THB costs include FX35 and a 15% buffer. Retail targets use 70% gross margin,
10 Credits/THB and round upward to five Credits; stage context can vary materially.

| Deliverable | Input / output tokens per call | Buffered cost THB | Cost-based Credits |
| --- | ---: | ---: | ---: |
| Brief | 2,000 / 1,000 | 0.56 | 20 |
| Full Story including dossiers | 4,000 / 8,000 | 3.54 | 120 |
| Reviewed Chapter outline | 20,000 / 4,000 | 3.22 | 110 |
| Chapter prose batch | 20,000 / 8,000 | 4.83 | 165 |
| Scene plan for one Chapter | 12,000 / 3,000 | 2.17 | 75 |
| Shots/dialogue for one Scene | 8,000 / 4,000 | 2.25 | 80 |

Writing through Chapters with one outline: 415 Credits / THB41.50, buffered cost
THB12.16, gross contribution THB29.34 before unqualified expenses. Adding six
Scene-planning calls and eighteen Shot/dialogue calls gives 2,305 Credits /
THB230.50, buffered cost THB65.77 and gross contribution THB164.73. These are
bounded short-form production assumptions, not a full-length novel promise.

The earlier 1,590-Credit example is a value hypothesis, not proof of 70% margin:
under this larger cost scenario it would leave about 58.6% gross margin instead.
Do not silently force all requests into the earlier experimental ranges.

User value to validate is an editable organized story with shared Characters,
reviewable Chapters and a path to production, not an opaque token charge. Avoid
charging twice for dossiers bundled with Full Story. Manual work and review stay
free; quote the agreed batch before starting rather than charging per surprise
Chapter/Shot invented by the model. A failed/unusable result is not a paid success.

Potential small-pilot package hypotheses: THB49 for a bounded writing bundle or
THB249 for the explicitly scoped writing/Scene/Shot planning bundle above, with
media and revisions separate. NOT implemented as SKUs or guaranteed prices.
First verify real p50/p95 costs, then measure purchase conversion, usable-result
acceptance, time saved, retry/support demand and repeat purchases. Compare a clear
bundle against transparent per-action quotes with the same scope; retain no raw
story text in commercial analytics. Do not promise unlimited revisions.

Current runtime preview covers only outline and Chapter prose. The other rows
remain planning assumptions until per-operation usage and failure evidence exists.

## Consent And Financial Invariants

- Server owns immutable expiring quote: actor/project/source versions, scope,
  model, bounded context/output, pricing version and fixed Credits. Client prices,
  balances and identities are not trusted. Scope changes require a new quote.
- Reserve on acceptance; capture once when a valid result is durably saved and
  available for review, not on Apply. Discarding a valid proposal is not a refund.
- Technical failure without a usable result releases/refunds once. Unknown
  provider outcome is reconciled; a browser timeout/reload cannot imply failure,
  duplicate charging or automatic paid replay.
- Correlate quoteId, operationId, providerRequestId, resultId and ledger
  reservation/capture/refund IDs. Stable idempotency protects concurrent retries.
- Batch quote fixes per-unit allocation and total cap. Charge successful agreed
  units, release the remainder. Internal repair/fallback cannot add an unapproved
  fee. Explicit user regeneration is a new quoted operation.
- Support adjustments require authorization and audit. No new creator earning,
  liability or revenue-sharing policy is introduced.

## Deferred Implementation Tasks

1. Instrument cost evidence through existing Cinematic/Generation adapters without
   charging. Measure Thai short/long stories and each operation separately.
2. Qualify output/context bounds, realized revenue and cost distribution; approve
   versioned rates under existing Credits configuration, not client tables.
3. Extend canonical quote/reserve/capture/refund and durable text-operation recovery.
   Do not create another wallet, queue or feature-local ledger.
4. Add fixed price/scope consent and pending/error/recovery UI for every paid action.
5. Test insufficient funds, stale quotes/sources, duplicate clicks/reloads, partial
   batches, invalid results, late success after timeout, save failure, duplicate
   settlement/refund, actor switching and ledger replay. Backend and QA sign-off
   are mandatory before financial implementation.
6. Separate limited paid UAT after production identity/ledger gates. Start with
   Credit packs and bounded trial allowance; unlimited/subscription plans deferred.
   Rollback disables new quotes without losing receipts or reconciliation.

The implementation addendum enables advisory estimates and explicit outline
generation only. Published rates, balances and billing status remain unchanged.
Charging requires completion and review of the deferred financial gates above.
