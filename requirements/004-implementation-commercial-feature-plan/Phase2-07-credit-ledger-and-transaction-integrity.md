# Phase 2-07 Credit Ledger and Transaction Integrity

**Status:** Proposed - Awaiting Review

## 1. Business Requirement

Credits must be auditable, resistant to duplicate charging and safe during retries, failures and concurrent jobs. No module may edit a user's balance directly.

## 2. Accounting Model

Maintain an immutable ledger and transactional reservations:

```text
available = granted + purchased + refunded + adjustments
            - settled_usage - active_reservations - expired_credits
```

Ledger types include purchase, subscription grant, promotional grant, reservation, settlement, release, refund, expiry and admin adjustment. Corrections use compensating entries, never row edits.

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

