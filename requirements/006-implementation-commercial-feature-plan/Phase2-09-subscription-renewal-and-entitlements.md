# Phase 2-09 Subscription, Renewal and Entitlements

**Status:** Proposed - Awaiting Review

## 1. Business Requirement

Subscriptions control feature access and recurring credit grants without embedding plan checks throughout UI or solution modules. One-time credit packages remain supported.

## 2. Separation of Concerns

- Payment records money movement.
- Subscription records customer lifecycle.
- Entitlement grants capabilities and limits.
- Credit ledger records usable credit units.

A paid subscription may grant entitlements and periodic credits, but these remain separate records.

## 3. Subscription States

```text
trialing -> active -> past_due -> grace_period -> suspended
active -> cancel_at_period_end -> expired
active/past_due -> cancelled
```

Transitions follow verified gateway events and scheduled reconciliation. Out-of-order events must not move state backward incorrectly.

## 4. Entitlement Examples

- `advanced_studio`
- `fashion_studio`
- `fashion_batch_limit`
- `custom_model_creation`
- `product_analysis`
- `priority_queue`
- storage and Project limits

Server-side `EntitlementService` is authoritative. UI uses entitlement data only to explain availability.

## 5. Renewal Rules

- Display renewal date, amount and included benefits.
- Define whether recurring credits expire, roll over or are capped.
- Avoid granting renewal credits twice during webhook retries.
- Cancellation clearly states end-of-access date.
- Failed renewal enters documented grace policy before suspension.
- Existing paid jobs and exports remain accessible according to retention policy after expiry.

## 6. Acceptance Criteria

- Entitlement decisions are enforced server-side.
- Renewal and credit grant are idempotent.
- Cancellation, expiry, past due and reactivation are tested.
- One-time packages work without subscription.
- Module registry can expose availability and reason from entitlements.
- Historical Project data is not deleted solely because subscription expires.

