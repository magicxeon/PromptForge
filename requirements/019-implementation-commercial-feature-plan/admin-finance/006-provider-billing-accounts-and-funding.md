# FIN-006 Provider Billing Accounts And Funding

**Status:** Requirement extension; no account, payment or runtime changes

**Updated:** 2026-09-07

## 1. Compatibility Principle

Billing mode controls how Momelo funds/settles its supplier account, not the
customer's Credit price or the measured cost of a generation. Extend Finance
with supplier accounts and settlement evidence; preserve FIN-001/002 pricing,
FIN-003 cost observations and the canonical customer Credit ledger.

Model the following separately:

```text
provider/model/operation -> effective billing-account/service binding
provider billing account -> funding pools and versioned billing agreement
generation attempt -> usage cost -> settlement allocation to pool/invoice
supplier cash payment -> top-up/resource pack/invoice payment evidence
```

An API key is not a billing-account primary key. Multiple keys/projects/models
can share one balance, while services of the same provider can have different
terms. Keep an opaque account reference; never store secret keys in Finance.

## 2. User Context And Primary Evidence

Treat these as user-reported account expectations, not universal provider rules
or permission to change external account settings:

| User-reported service | Intended configuration candidate | Required before activation |
|---|---|---|
| ChatGPT / OpenAI | Prepaid for the API account used by this app | Confirm API billing scope; do not combine a ChatGPT subscription with API funding |
| BytePlus Seedance | Prepaid | Confirm exact model/resource-pack and account terms; do not force all ModelArk models to prepaid |
| BytePlus Seedream | Postpaid remains possible | Confirm the applicable account/service binding independently from Seedance |
| Gemini API | Transition toward prepaid | Record the actual account notice/cutover date and eligibility, not a guessed global date |

Reviewed official documentation on 2026-09-07 supports a configurable design:

- OpenAI describes prepaid API credits, advance credits against monthly billing
  and delayed balance reporting. Do not assume every balance is current or an
  instantaneous spending cutoff. [OpenAI prepaid API billing](https://help.openai.com/en/articles/8264644-how-can-i-set-up-prepaid-billing)
- Google documents Prepay/Postpay, shared billing-account scope and migration
  notices for Gemini API separately from other Cloud services. Account terms
  and notices must determine configuration. [Gemini API billing](https://ai.google.dev/gemini-api/docs/billing)
- BytePlus's cited Seedance 2.0 resource-pack guide describes model-specific
  packs and pay-as-you-go fallback. It is not proof of identical terms for
  Seedance 2.5 or this user's account. [ModelArk resource-pack guide](https://docs.byteplus.com/api/docs/ModelArk/2191775)

No exact top-up minimum, expiry period, pricing or switchover date is hard-coded
from these examples. Record source version/review time with approved account
terms. This package does not re-test or change pending BytePlus video routing.

## 3. Versioned Account And Service Contract

Logical entities (proposed, DDL pending):

| Entity | Required data and invariant |
|---|---|
| provider_billing_accounts | Stable supplier/account reference, currency, environment, masked label, evidence/access scope; no customer wallet |
| provider_billing_agreement_versions | Mode `prepaid`, `postpaid` or `hybrid`, service eligibility, validity, billing cycle, settlement priority, fallback and source evidence |
| provider_billing_bindings | Account/service/provider/model/operation mapping with non-overlapping effective intervals; exact authorized resolution |
| provider_funding_pools / lots | Monetary or resource-unit pool, eligible models, purchased/promotional components, expiry and quantity/currency; shared balance represented once |
| provider_funding_events | Top-up, purchase, grant, usage drawdown, expiry, refund, adjustment or transfer, with source ID and evidence |
| provider_cash_transactions | Actual external payments/refunds/fees with unique source IDs and payment time; linked to their funding or invoice purpose |
| provider_invoices / settlement_allocations | Accrued usage/invoice relation, partial payments and pool/invoice allocation; never an extra copy of usage expense |
| provider_balance_observations | Reported amount/units, as-of/recorded time, source and completeness; distinguish from locally projected balance |

Finance owns these supplier funding/evidence records; customer receipts remain
in Payments and customer Credits remain in Credits. Agreement/binding versions
reuse Admin Configuration draft/validate/publish/schedule/Audit, not a second
scheduler. Immutable funding/cash events are Finance records, not config edits.
The logical agreement-version entity is a typed payload/reference in the shared
runtime-configuration revision system, not another independent version table or
active pointer. Account/service bindings reference that published revision.

`hybrid` means an evidenced within-account funding priority (such as eligible
pack, then account balance, then permitted postpay), never automatic fallback
to another AI provider. Unknown rules remain unconfigured, not unlimited funds.
An account cannot claim a shared pool twice by creating one balance per model.

## 4. Cash, Usage And Balance Rules

- A supplier top-up/resource-pack purchase is cash outflow and funding acquired.
  Usage is a separate expense observation. Do not sum both as generation cost.
- Postpaid usage belongs to its billable usage period; invoice payment belongs
  to its cash settlement period. Paying the invoice does not add usage expense.
- Monetary balance projection: evidenced opening + top-ups/grants/adjustments
  - drawdowns/expiry/refunds, under the pool's explicit sign/type rules. Keep
  purchased, promotional and restricted amounts distinguishable.
- Resource packs retain unit quantity, effective purchase cost, eligibility and
  expiry. Do not add tokens/images to currency. Effective per-unit cost follows
  an approved pack allocation rule; list-rate estimates remain distinct.
- Consumption allocation to lots must follow evidenced supplier priority or
  stay unallocated/provisional; do not guess FIFO across unrelated services.
- Balance drawdown references the same usage/cost item. It settles funding and
  must not create a second expense. Invoice/payment/bank imports link duplicate
  representations of one transfer instead of counting them twice.
- Supplier refunds, promotional grants and customer Credit refunds are distinct
  event types. Expiry/write-off is not successful generation usage and must
  appear separately with an approved valuation basis.
- Usage outside Momelo may consume a shared account. Preserve external/unallocated
  drawdowns and discrepancies; never assert Momelo's logs equal supplier balance.
- Negative reported balances and processing lag remain visible. Store as-of
  evidence; do not clamp to zero or infer fresh funds from a stale observation.

## 5. Prepaid/Postpaid Transition

1. Create a new agreement/binding revision with evidence and effective date.
2. Validate eligible pools, existing commitments, source dates, account scope,
   unchanged retail Credits and projected cash/usage effects.
3. Record external account-change confirmation or an explicitly pending status.
   Publishing this record does not switch the supplier account or buy credits.
4. Schedule through the shared publisher; preserve the prior agreement and all
   pre-cutover unpaid invoices/unused lots. No synthetic zeroing or transfer.
5. Pin agreement/binding at the applicable external billable event. Work queued
   before a switch may execute after it; preserve accepted customer retail price
   but record the evidenced execution funding basis. Late billing corrections
   are appended, not retroactive edits of old quotes.
6. Reconcile opening/closing pools and liabilities around cutover. If remaining
   funds transfer/refund/expire, require actual evidence and corresponding events.

Rollback changes future application metadata through a new revision. It cannot
undo an external billing-mode change, restore spent funds, cancel an invoice
or reprice completed Jobs. External status disagreements remain actionable.

## 6. Input, Alerts And Safety

MVP supports authorized manual evidence entry/import; provider sync is optional
only where a documented permitted API exists. Do not scrape a billing console,
assume an available balance endpoint or persist payment credentials.

Show low balance, expiring packs, unpaid invoices, stale observations and
reconciliation discrepancies by account/pool. Any runway estimate declares
its usage window and uncertainty. Provider auto-reload settings can be recorded
as externally managed, but this requirement does not authorize top-ups, enabling
auto-reload, changing provider accounts or calling payment APIs.

Finance alerts are advisory by default. Automatic dispatch blocking based on
funds requires a separately approved Generation/availability policy and fresh
evidence; do not disable a working model from a guessed/stale zero balance.
Provider-confirmed insufficient-funds errors retain canonical failure/refund/
support handling. Customer Credits do not guarantee supplier funds, and internal
Admin usage does not bypass real provider costs or budgets.

## 7. Acceptance

- `FIN-FUND-01`: one provider supports distinct service modes and multiple
  models share one pool without double-counted balances.
- `FIN-FUND-02`: prepaid, postpaid and evidenced hybrid allocation work without
  changing customer pricing or existing provider routing.
- `FIN-FUND-03`: top-up/usage/invoice/payment are distinct; import/replay/partial
  allocation does not duplicate cash, expense or ledger movements.
- `FIN-FUND-04`: a scheduled mode change preserves old funds/payables, queued
  quote prices and immutable agreement/evidence history.
- `FIN-FUND-05`: unknown/stale/negative balances, outside-app consumption,
  expiry and promotional/resource-unit funding are reported truthfully.
- `FIN-FUND-06`: unauthorized mutations fail; recording funding settings does
  not perform a top-up or change supplier billing. No secret disclosure.
- `FIN-FUND-07`: seeded user-reported service modes remain pending verification,
  with no universal model-wide or provider-wide prepaid assumption.
