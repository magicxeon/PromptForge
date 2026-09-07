# FIN-009 Remaining Production Flow Tasks

Status: Pending. Dependency plan, not implemented functionality.
Owner: existing FIN-001..007 and Backend 018-007/010, Commercial Phase2-03/07/08.
No duplicate Finance identity, wallet, publisher or provider adapter is allowed.

## 1. Identity And Transactional Publication

| Task | Owner / output | Focused proof |
|---|---|---|
| P01 | Identity: trusted sessions and explicit finance.read/configuration.author grants; replace local-only gate | Forged actor header, revoked staff, Support scope |
| P02 | Admin Configuration: DB revision, source snapshot, active-pointer, approval and Audit/outbox tables | Migration dry-run, unique scope/version, rollback boundary |
| P03 | Typed cost drafts -> complete normalized rate revision; unit quantity, dimensions, coverage and account scope | Image vs per-million token rates; ambiguous scope rejected |
| P04 | Separate provider cost, retail Credit and FX revision identities | Cost-only change leaves current Credit quote unchanged |
| P05 | Draft validate/diff -> approval bound to revision fingerprint; stale edits invalidate approvals | Concurrent editors, self-approval denial, explicit reason |
| P06 | Atomic publish + active pointer + Audit/outbox + consumer invalidation | Crash before/after commit, stale cache, idempotent retry |
| P07 | Existing Credits adapter consumes pinned accepted price snapshots | Old quote across boundary; Comparison, reference and Template fee parity |
| P08 | Durable UTC scheduler, one approved pending schedule per scope; cancel/revalidate and forward rollback | Restart, exact boundary, late activation, duplicate delivery |
| P09 | Enable Finance publish/schedule UI only after capability gate is backed by real implementation | Direct API permission denial and persistent error/recovery states |

## 2. Actual Usage And Cost Evidence

| Task | Owner / output | Focused proof |
|---|---|---|
| C01 | Inventory all actual image/video/text/internal AI call sites beyond provider-control catalog | Manifest maps caller -> canonical execution owner -> evidence writer |
| C02 | Generation/AI owners emit stable attempt ID, actual fallback model and sanitized usage | Retry vs duplicate, multi-output partial success; no prompt/media leakage |
| C03 | Durable Finance observation inbox with unique source-event ID and replay | Projection failure never changes Job/Credit outcome |
| C04 | Cost resolver uses evidenced units and billable-time rate, separate from customer quote rate | Token cache categories, bundled image tools, failed but charged request |
| C05 | Append-only estimate/usage/invoice corrections, one selected evidence basis per component | Evidence upgrades cannot triple-count one expense |
| C06 | Event-time payer classification and approved internal expense mode | No historic role inference; no implicit unlimited Admin Credits |
| C07 | Usage/evidence/reconciliation detail UI with bounded filters and owning source links | Overview/detail reconciliation, missing evidence never zero |

## 3. Supplier Accounts And Funding

| Task | Owner / output | Focused proof |
|---|---|---|
| B01 | Approve stable billing-account and shared-pool IDs; API secrets remain outside Finance | Multiple models share one balance, separate service bindings |
| B02 | Agreement drafts use shared revision lifecycle; external confirmation separate | Prepaid/postpaid/hybrid transition retains old funds/payables |
| B03 | Supplier funding/cash/invoice/opening-balance records with source IDs and Audit | Duplicate import, permission, currency and as-of checks |
| B04 | Purchased/promo/resource-pack lots and evidenced eligibility/expiry order | Token/image units never summed as money; expiry not cash payment |
| B05 | Settlement links usage to pool or payable; unallocated/outside-app charges explicit | Split invoices, partial settlement, negative/stale balance |
| B06 | Reconciliation form and review action, no external top-up or billing-plan mutation | Unauthorized edits, immutable corrections, explicit reason |

## 4. Period Finance Completion

| Task | Owner / output | Focused proof |
|---|---|---|
| R01 | Payments receipts/refunds/fees and paid-Credit allocation facade | Credits do not imply purchase income; no arbitrary per-model sales |
| R02 | Period cash vs incurred cost vs Credit movement bases | Prepaid Jan top-up 100/use30, Feb use20 -> cash100/cost50/balance50 |
| R03 | Postpaid invoice/payment timing and late corrections, immutable report as-of | Jan use30/Feb pay30 -> cost30, not60; refund dates remain explicit |
| R04 | Historical FX policy per report currency; unknown FX stays unavailable | Never value historic activity with today's mutable rate |
| R05 | Monthly/yearly/YTD flows and opening/closing balances; exact decimal aggregation | Yearly flow sum, boundary balances rather than sum of balances |
| R06 | Permission-aware CSV with identical as-of/filters and formula neutralization | Totals/detail/export parity and large-range bound |
| R07 | Reconciled expense/income/gross contribution labels; net profit only with approved overhead policy | Missing components prevent a false completed/profit label |

## 5. Cutover And Verification

Execute P01-P04 before financial publication. C01-C03 can proceed as isolated
contract work before that cutover; they may not introduce live dual writes.
Execute B03 only after transactional permissions/Audit ownership is operational.
R01 depends on Payments; R02-R06 can use isolated fixtures first, never invented
production purchases or invoices.

Extend `scripts/test-admin-finance.mjs` with publication, schedule, costs,
funding and period-finance groups when their runtime behavior exists. Keep the
existing read-report group for compatibility. Before enabling production, run
all groups plus isolated SQL integration/restart tests and manual financial UAT.
Do not treat the current implemented-slice `all` as this production release gate.
