# TUT-004 Credit Purchase And Course Finance

**Status:** Required financial contract; live POC charging and revenue allocation pending decisions.

## Single Financial Authority

TutorialApplicationService delegates buying access to the shared Content Access
facade (008); AI Cinema uses the same workflow. Extend Credits' public
facade for content quote/reserve/capture/refund/recovery; only Credits writes its
ledger. Finance consumes authorized immutable events/projections, not course-page
counters. Do not use an AI model price, fake provider ID, or writing reservation.

Content Access owns order/entitlement records; Finance owns revenue attribution reports.
Cross-repository atomicity is not assumed for current JSON storage. Use durable
operation states and replayable recovery at every boundary; a future database
transaction may strengthen this contract, never weaken idempotency.

## Quote And Purchase

Server quote includes quoteId, contentType, contentId (courseId for Tutorials),
offer/publication version, actorUserId,
priceCredits, entitlement scope/duration policy, expiration, environment and
currency/evidence basis where available. Snapshot exact price and consent.
Customer confirmation shows only valid published offers; reject stale quotes
and request fresh consent if price or rights changed.

Proposed state sequence:

`created -> reserved -> entitlement_pending -> captured -> fulfilled`

- Entitlement remains non-playable while pending. Only confirmed ledger capture
  and durable active entitlement produce purchase success.
- Insufficient funds, unpublished/unready course or invalid quote: no charge/access.
- Known failure before capture: release reservation and cancel pending entitlement.
- Capture succeeded but activation failed: mark recovery_pending, retry activation
  from durable receipt; never charge again or report a new purchase as the fix.
- Ambiguous Credit response: inspect by operation/idempotency key before retry or
  refund. Do not release a possibly captured charge based only on network timeout.
- Terminal unrecoverable delivery: audited compensating refund with explicit
  entitlement revocation, retryable until reconciled. No silent manual balance edit.
- Same actor/Course/offer purchase races from two tabs coalesce to one effective
  purchase; a second idempotency key cannot bypass the owned-course check.
- Server-side refunds cannot exceed captured minus already-refunded Credits.
  Preserve original order and append refund/correction events.

Permanent entitlement uniqueness and refund/repurchase policy depend on 007.
Store actor, payer classification (customer/admin_test/internal/unknown), Course,
order/quote/reservation/ledger/entitlement IDs, policy version, timestamps and
correlation ID. Classify at event time, not by the actor's later role.

## What 'This Course Earned' Means

Show separate measures, never one ambiguous money number:

| Measure | Source and formula |
|---|---|
| Gross charged Credits | Sum successful tutorial captures once by ledger event ID |
| Refunded Credits | Sum actual posted capture refunds; reservation release is not a sales refund |
| Net charged Credits | Gross captures minus posted capture refunds |
| Cash-backed Course value | Allocated paid-Credit value with payment/lot evidence, less linked value reversals |
| Promotional/test Credits | Separate non-cash usage; never customer cash revenue |
| Cash receipts | Payment owner receipts/refunds by payment date, not by Course playback date |
| Profit/contribution | Only labeled estimates or approved complete revenue/cost allocation; unknown otherwise |

Existing Finance reports do not yet prove cash revenue/profit. Extend the existing
FIN-003/FIN-007 allocation contract, not a competing tutorial cash ledger.
Do not multiply Credits by today's exchange rate and label it actual money.

To meet accurate per-Course monetary reporting, require immutable funding-lot
evidence: purchased/promotional/compensation origin, paymentId, currency, paid
amount in minor units, issued Credits, discount/tax/fee basis and policy version.
Credits owns allocation of spent Credits to funding lots; Payments owns receipt
truth. FIFO vs another allocation policy is an explicit approval gate.

Allocation conserves original paid value across partial consumption with a
documented integer rounding/remainder rule. Mixed paid/free balances remain
separable. Refund reverses the original allocated value, not the current price.
Paid top-up + Course consumption are not two cash receipts. Do not allocate the
whole wallet top-up to a Course just because it was purchased next.

Missing historic lot/payment evidence yields `unallocated`/`unknown` with coverage
counts, never zero or fabricated backfill. Credit-only POC can run with this gap
visible, but the monetary-accuracy requirement is NOT complete until attribution
and reconciliation pass. Accounting revenue recognition, taxes and instructor
liabilities remain separate approved policies; this is management reporting.

## Monthly, Yearly And Refund Basis

Default report timezone proposed Asia/Bangkok; persist UTC instants and use
half-open month boundaries. Credit captures belong to capture month; refunds to
posting month. A separate Course purchase-cohort view may attribute refund to the
original sale, but must not add both views together.
Annual financial flows equal 12 monthly flows under identical as-of/currency/
classification; a refund-only month may be negative. Do not sum currency amounts
without approved conversion evidence. Late evidence produces report revisions,
not edited ledger history. Preserve as-of/source watermarks for exports.

Example: synthetic100-Credit purchase in January,20-Credit refund in February.
Net movement January100, February-20, annual80. One learner, not two. A promotional
purchase contributes Credits but no fabricated cash. Replaying capture or refund
does not alter any total. Example numbers are fixtures, not proposed course prices.

## Admin And Reconciliation

Course filter in existing Admin Finance: Credit sales/refunds/net, paid allocation,
promo/test split, missing evidence, and authorized order/ledger drilldown.
Reconcile orders <-> captures/refunds <-> entitlements <-> paid allocations.
Flag captured-no-access, access-no-capture (unless free/audited grant), duplicates,
over-refund and unmatched funding. Report data lag must not charge again or disable
valid access. Recovery uses an audited owning workflow, not a report-page mutation.

Test/POC sales are visibly classified and excluded from customer-revenue totals by
default. Admin cannot generate real sales statistics by repeatedly previewing.
Creator revenue share/payable is pending; do not label gross sales instructor earnings.

## Financial Acceptance

Validate insufficient balance, quote expiry, price change, duplicate/racing keys,
restart after each state, ambiguous timeout, activation failure, duplicate/partial
refund, free course, promo-only and mixed funds, rounding, historic unknown source,
month/year boundary and unauthorized order access. All tests isolated, no live debits.
