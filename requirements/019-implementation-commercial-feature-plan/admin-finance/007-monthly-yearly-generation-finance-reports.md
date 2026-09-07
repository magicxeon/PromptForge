# FIN-007 Monthly And Yearly Generation Finance Reports

**Status:** Planned; management reporting, not statutory accounts

**Updated:** 2026-09-07

## 1. Required Report Views

Admin selects a calendar month, calendar year (12 monthly rows plus total),
year-to-date or an explicit bounded range. Default period/timezone/currency
must be visible and confirmed before implementation. Fiscal calendars and
statutory closing are not silently introduced as part of this MVP.

Provide distinct views with shared filters/drilldowns:

| View | Measures and time basis |
|---|---|
| Cash receipts/payments | Customer credit purchases received, customer cash refunds/fees, supplier top-ups/packs, postpaid invoice payments and supplier cash refunds by actual payment time |
| Generation usage | Count/output/workflow, linked Credit settlement/retail valuation, known incurred provider usage cost, reconciled portion and unknown count by billable usage time |
| Customer Credit movements | Grants/purchases, capture, release/refund and adjustments by the owning ledger event time; no provider funds mixed into this balance |
| Funding and payable balances | Opening/closing supplier balances by pool/unit/currency, funding added/used/expired, invoiced and unbilled obligations, payments and unreconciled amounts |

Cash movement is not profit. A provider top-up is not all consumed generation
cost in its purchase month; a later invoice payment is not a second usage cost.
Customer cash receipts from buying Credits are distinct from using them. Do not
assign a credit purchase to a provider/model before evidence supports that
allocation. Show unallocated receipts, not invented per-provider revenue.

## 2. Revenue And Expense Attribution

Use FIN-003 evidence and FIN-006 funding rules. Generation-attributed cash value
requires an approved paid/promotional Credit lot allocation/revenue policy; until
then label it retail valuation, not realized revenue. Internal/admin/test usage
has cost but no fabricated customer revenue.

Provider usage expense appears in the billable period once whether settled by
prepaid funds, resource pack or postpaid invoice. Show modeled/list-rate cost,
usage-calculated cost and reconciled allocated cost with their basis; select one
authoritative value per component in the selected view. Fees, overhead, expiry
losses and FX differences stay separate from generation usage cost.

Every amount retains original currency and optional approved reporting-currency
conversion. Historical cash FX and usage-valuation FX can differ; never revalue
all history using today's pricing FX or sum currencies/units without conversion.
Missing Payments, rates, allocation, billing dates or invoices produces partial/
unavailable status, not zero income/expense or a false profit total.

## 3. Period And Correction Rules

- Derive boundaries in the selected report timezone and use UTC half-open
  intervals. Payment date, billable usage date, invoice issue/due date and
  record-arrival date remain distinct.
- Use the provider-specific billable usage timestamp; submission time or file
  creation time is not automatically the expense date. Missing date is an
  exception to resolve, not silently assigned to the current month.
- Multi-day work uses evidenced dated usage segments where available; if only
  a final billed timestamp exists, disclose that basis without inventing splits.
- Latest reports can restate the original usage month after late evidence.
  Record an as-of timestamp/source watermark and revisions; preserve previously
  exported snapshots and show adjustments, never mutate raw historical events.
- Cash refund remains in the refund payment period, linked to the original
  payment. Usage-cost correction links the original cost and records arrival
  separately. Do not subtract it from both periods.
- A customer Credit refund uses its actual ledger event period for the Credit
  movement report. A generation-cohort view may link it back to the original
  Job, but must label that attribution separately rather than rewriting the
  ledger event date or counting the refund in both periods.
- Annual flow totals equal the included monthly flows under the same as-of,
  currency and evidence basis. Annual opening/closing balances are boundary
  snapshots, not the sum of 12 monthly closing balances.
- YTD includes only elapsed periods. A known-empty month is zero; missing-source
  and future periods have explicit states. Partial totals carry completeness
  counts/coverage and cannot look fully reconciled.

## 4. Compatibility Example (Synthetic USD, No Tax/FX/Fees)

| Event/measure | January | February |
|---|---:|---:|
| Supplier prepaid top-up paid | 100 | 0 |
| Evidenced generation usage drawn from that funding | 30 | 20 |
| Supplier closing prepaid balance, assuming no other movement | 70 | 50 |

Two-month cash outflow is 100; two-month generation usage cost is 50; ending
prepaid funds are 50. Do not report expense of 150 or add monthly balances to
produce an annual balance. A postpaid variant records 30 usage in January and
30 cash outflow in February when its invoice is paid; it is still 30 usage cost.

## 5. UI, API And Export

Add a Monthly/Yearly report view inside existing Admin Finance, not a second
dashboard. Filters include provider, model/service, workflow, account/pool,
billing mode at event time, payer, environment, currency and evidence state.
Reports link to usage attempts, Credit entries, invoices, funding and payment
evidence through their owning permission boundaries.

API returns explicit period boundaries/timezone, report basis, as-of/source
watermark, rows/totals and completeness. Aggregate server-side; detail queries
use bounded cursor pagination. Summary and detail reconcile at the same snapshot.
Yearly queries may span 12 months; a smaller daily-detail limit cannot make the
required year view impossible. Bound ranges/exports and benchmark queries before
adding a report cache; any cache key includes actor scope, basis and as-of.

The current partial Credit report supports XLSX export under
[FIN-010](010-monthly-yearly-excel-export.md), without waiting for actual cash/cost
sources. Its workbook explicitly records missing evidence and excludes paginated
ledger detail. Full financial exports below remain gated by FIN-009.

CSV export uses the same authorized filters/as-of, includes currency/units and
evidence labels, and neutralizes spreadsheet-formula content in user-supplied
labels. Export contains no secrets/private prompts/media. Large exports require
a bounded background/report workflow, not a new Generation queue. Immutable
export manifests allow a prior report to be compared with later corrections.

## 6. Acceptance

- `FIN-PERIOD-01`: monthly, full-year and YTD views render source-backed income,
  usage expense, cash movements and balances on their separate bases.
- `FIN-PERIOD-02`: prepaid and postpaid examples reconcile without top-up/usage/
  invoice double count or summing closing balances.
- `FIN-PERIOD-03`: annual totals equal monthly flows; timezone, year boundary,
  leap day, empty/missing/future months and late corrections are tested.
- `FIN-PERIOD-04`: changing billing mode or a rate version affects new bindings/
  evidence only; reports retain historical scope and correct period attribution.
- `FIN-PERIOD-05`: missing payment/usage/FX/allocation data is visible; internal
  costs and free Credits do not become fabricated income/profit.
- `FIN-PERIOD-06`: drilldown and authorized CSV match summary filters/as-of and
  reject cross-scope access, formula injection and unbounded exports.
