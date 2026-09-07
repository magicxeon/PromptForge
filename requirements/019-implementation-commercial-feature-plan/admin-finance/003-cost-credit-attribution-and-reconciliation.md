# FIN-003 Cost, Credit Attribution And Reconciliation

**Status:** Planned; no historical actual-cost completeness is claimed

## 1. Cost Evidence Is Not A Credit Ledger

Each provider invocation can incur cost independently of the user-facing Job or
Credit settlement. Finance receives durable, idempotent observations from the
owning workflow, not browser-supplied amounts and not raw provider calls.

Required fields when available:

```text
costObservationId / sourceEventId / schemaVersion
operationId / attemptId / jobId or videoTaskId / groupId
actual providerId / modelId / accountScope / operation / workflow
actorUserId / payerClassification / purpose / environment
providerRequestId / correlationId
quoteId / reservationId / ledgerEventIds (nullable with missing reason)
usage quantities / units / dimensions / billingEventAt / recordedAt
quotedCostVersion / executionCostVersion / FX evidence / calculatorVersion
billingAccountId / billingAgreementVersionId / serviceBindingId (when evidenced)
amount / currency / evidenceLevel / reconciliationStatus / supersedesEvidenceId
```

Internal AI-text operations without an image Job still require an owning
operation/attempt ID. A provider fallback produces a separate actual-provider
attempt observation, not a cost attributed only to the originally selected
model. Do not infer payer from the actor's current role after the event.

## 2. Evidence Levels And Corrections

| Level | Meaning | UI treatment |
|---|---|---|
| unknown | Missing required rate, usage or billing evidence | Unknown amount/reason, excluded from known-cost subtotal but included in gap count |
| quote_estimate | Predicted units and reviewed rate | Estimated exposure, not incurred expense |
| usage_calculated | Provider-reported units or evidenced billable completion times applicable rate | Calculated incurred cost; not invoice-confirmed |
| reconciled | Matched provider charge/invoice or approved reconciliation evidence | Confirmed amount with evidence and as-of timestamp |

An HTTP success or reported token count alone does not prove the final invoice.
Failure/cancellation does not prove zero cost; a customer refund does not erase
provider expense. Zero requires positive evidence that no billable unit/charge
occurred. Retry attempts are retained and deduplicated by source/attempt/event.

Evidence upgrades and corrections append observations/adjustments, never edit
historical evidence or Credit ledger entries. The current projection selects
the authoritative evidence for each cost component without summing estimate +
usage calculation + invoice as three expenses. Invoice-level adjustments with
no exact Job mapping remain explicitly unallocated; do not fabricate allocation.

FIN-006 supplier top-ups, packs, pool drawdowns and invoice payments settle
funding; they do not become duplicate cost observations. An invoice can confirm
usage already recorded, and paying it later is cash movement, not another expense.
Keep funding settlement links separate from usage cost and customer Credits.

## 3. Totals And Credit Relationship

Keep these measures separate, with currency, filter range and evidence basis:

- gross payment receipts, payment refunds and fees from Payments when available;
- purchased/promotional/compensation Credits, captures, releases/refunds and
  outstanding balances from the canonical Credits owner;
- reserved maximum exposure vs usage-calculated/reconciled provider costs;
- customer-funded vs internal/admin/testing/unknown-payer costs;
- separately evidenced platform overhead (storage/compute/other), if entered;
- Template/creator allocation and any other liabilities from their owning
  snapshot/ledger, not assumed platform revenue.

Default cost totals exclude quote-only exposure. Show known incurred subtotal,
reconciled portion, unallocated adjustments and unknown/missing-cost count
together. Do not double-count mirrored Job/Group/Comparison/Fashion records:
cost is an attempt/component fact; grouping is only a reporting view.

Credits charged divided by a versioned `creditsPerThbAssumption` is a **retail
valuation**, not proven cash revenue. Discounts, free grants, refunds and unused
Credits prevent treating it as actual receipts. Retail valuation minus estimated
provider cost may be an explicitly labeled modeled contribution, not net profit.
Realized margin/profit stays unavailable until the approved allocation/revenue
policy and complete payment/cost/overhead sources exist. Never default absent
Payments, fees or hosting expenses to zero.

[FIN-007](007-monthly-yearly-generation-finance-reports.md) makes monthly/yearly
cash and generation usage reports mandatory. It defines period attribution,
late evidence, annual flow reconciliation and opening/closing balance treatment.
Provider/model revenue attribution still needs an approved paid-Credit allocation
policy; before that, show valuation and unallocated receipts explicitly.

## 4. Admin And Internal Expenditure

Snapshot the authorized payer classification at operation acceptance. Historical
records with no payer evidence remain unknown; a current admin role is not a
retroactive label. Internal cost must appear even when customer Credits are not
charged. Record equivalent retail Credits separately from customer revenue.

This contract supports the requested future staff-funded generation mode, but
does not implement unlimited balances or bypass quote, concurrency, dispatch,
Audit and duplicate safeguards. Eligibility, budgets and staff-use permissions
must be approved in a separate Credits/Generation change before enabling it.

## 5. Persistence, Reliability And Privacy

Finance owns cost observations, evidence/reconciliation metadata and derived
reports. Credits/Payments remain monetary settlement authorities. Proposed
Finance tables require reviewed DDL: cost observations/components, append-only
cost adjustments, reconciliation runs/links and bounded report projections.
Rates/publications remain in Admin Configuration tables from 018-010.
Supplier accounts/pools/funding and cash evidence extend Finance under FIN-006;
they are not a second customer wallet or payment gateway. FIN-007 reports are
derived and retain immutable as-of export manifests, not new ledger authority.

Production usage events must survive restart and support replay/checkpoints.
Do not fail a completed paid Job merely because a reporting projection is late;
record durable pending delivery and reconcile it. Detect missing events, orphan
links and duplicate sources. A process-only event callback is not sufficient.

No API keys, raw prompts, Base64, private references or full payment credentials
in cost rows/logs. Evidence access is staff-scoped and audited. Deleting or hiding
media/Jobs from presentation cannot erase financial traceability. Retention and
legal-hold rules require approval before destructive maintenance is implemented.

## 6. Acceptance

- `FIN-COST-01`: every tracked attempt contributes once, including partial
  multi-output success, failures, retries, fallbacks and internal AI calls.
- `FIN-COST-02`: unknown, estimated, calculated and reconciled evidence remain
  distinguishable; absent amounts never silently become zero.
- `FIN-COST-03`: ledger/reservation links match actual capture/refund without
  changing balances, customer prices or erasing provider cost.
- `FIN-COST-04`: evidence upgrade/correction changes the current projection
  once and preserves original history; unallocated invoices remain explicit.
- `FIN-COST-05`: Credits valuation is not labeled actual revenue/profit;
  unavailable payment/overhead data is visible.
- `FIN-COST-06`: actor/payer/environment/currency filters reconcile totals to
  paginated detail rows, with no Group/Job double count or cross-user leak.
- `FIN-COST-07`: replay after reporting outage/restart reconstructs totals
  without another paid call or financial mutation.
