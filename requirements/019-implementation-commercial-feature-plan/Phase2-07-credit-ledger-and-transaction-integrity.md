# Phase 2-07 Credit Ledger and Transaction Integrity

**Status:** Local lifecycle and focused tests exist; PostgreSQL concurrency/settlement proof pending (2026-09-07)

The current Credit owner is `server/domain/credits/` with repositories under
`server/repositories/credits/`. Estimate, reservation, capture, release/refund,
idempotency, Template access pricing and Fashion quote separation are working
local-MVP contracts. This phase migrates those contracts to transactional
production storage and adds concurrency/financial operations; it must not
introduce a second balance or Fashion-specific ledger.

Canonical facade: `server/domain/credits/CreditApplicationService.js`.
Persistence includes `CreditAccountRepository.js` and `CreditLedgerRepository.js`
under `server/repositories/credits/`, backed by local JSON. Existing financial
tests are evidence to preserve, not a new production certification in this
documentation review. Comparison enabled-slot totals, multi-output settlement,
Template use-session fees and provider-controlled availability remain intact.

## 1. Business Requirement

Credits must be auditable, resistant to duplicate charging and safe during retries, failures and concurrent jobs. No module may edit a user's balance directly.

### Admin Finance Consumer (2026-09-07)

[Admin Finance](admin-finance/000-master.md) owns provider-expense evidence and
management reporting linked to this ledger, not a second wallet. It consumes
Credit quotes/captures/refunds through the canonical facade. Its rate editor
uses Backend 018-010 publication; Credits remains the calculation authority.
Cost-only changes do not automatically change retail Credits. Versioned quote
pinning, proposed execution-cost evidence and future effective dates follow
FIN-002/003 without rewriting settled history.

## 2. Accounting Model

Maintain an immutable ledger and transactional reservations:

```text
available = granted + purchased + refunded + adjustments
            - settled_usage - active_reservations - expired_credits
```

Ledger types include purchase, subscription grant, promotional grant, reservation, settlement, release, refund, expiry and admin adjustment. Corrections use compensating entries, never row edits.

The list/formula describes target accounting responsibilities, not a migration
rename of current event types. Freeze an explicit source-to-target taxonomy and
balance/reservation reconciliation before DDL; do not double-count a reservation
as both spend and a hold. Subscription entries remain deferred with Phase2-09.

## 3. Operation Lifecycle

```text
quote -> reserve maximum -> execute operations
-> settle actual eligible usage -> release unused reservation
```

- Reservation has expiry and owning operation/batch.
- Settlement cannot exceed reservation without a new explicit authorization.
- Duplicate callbacks and retries reuse an idempotency key.
- Provider/system failures follow policy and do not silently consume customer credits.

## 4. Data and Transaction Rules

- `credit_accounts`
- `credit_quotes` (mapping current estimates and immutable quote references)
- `credit_ledger_entries`
- `credit_reservations`
- `billable_operations`
- `idempotency_records`

Use database transactions and appropriate account locking. Store units as integers. Every entry records actor, source, reason, Project/batch/job references and price version.

## 5. Administration

- Admin adjustment requires reason and elevated permission.
- Adjustment creates ledger entry and audit event.
- Support users cannot alter credits by default.
- Financial exports reconcile purchases, grants, usage and refunds.

## 6. UX

- Show available, reserved and expiring credits separately when relevant.
- Show package quote before confirmation.
- Show final charged and released amounts after completion.
- Use localized, non-technical failure messages with transaction reference.

## 7. Acceptance Criteria

- Concurrent jobs cannot overspend an account.
- Retried requests cannot charge twice.
- Ledger sum and account balance reconcile exactly.
- Failed/refunded operations follow documented policy.
- No Fashion or provider module can mutate balance directly.
- Financial invariants have unit, integration and concurrency tests.
