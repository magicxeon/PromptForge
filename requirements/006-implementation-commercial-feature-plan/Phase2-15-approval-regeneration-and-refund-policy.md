# Phase 2-15 Approval, Regeneration and Refund Policy

**Status:** Proposed - Business/Legal Review Required

## 1. Business Requirement

Users need a clear workflow to approve useful outputs, reject unsuitable results and understand when retry/regeneration costs additional credits.

## 2. Result States

```text
generated -> reviewing -> approved -> exported
                     -> rejected
generated/rejected -> regeneration_requested
```

State changes do not delete original result or lineage.

## 3. Approval UX

- Compare result with Product and canonical Model references.
- Zoom and inspect product details.
- Approve/reject individually or by Product.
- Optional rejection reasons: product mismatch, model mismatch, anatomy, composition, safety, other.
- Only approved results enter final export by default.

## 4. Retry and Charging Policy

- Provider/infrastructure failure: automatic eligible retry; no duplicate customer charge.
- Eligible safety rejection: follow provider and product refund policy; show whether credit was released/refunded.
- Invalid user input detected before provider call: no generation settlement.
- User preference rejection: regeneration is newly billable unless Package includes revision allowance.
- Product fidelity defect is not automatically classified as provider failure; policy and included revisions must be explicit.

The initial Package should state revision allowance as configurable data rather than hardcoded UI logic.

## 5. Regeneration

- Regenerate from immutable prior configuration/profile snapshot.
- User may create a controlled variation; changed fields are recorded.
- New quote is shown when operation is billable.
- Result lineage links original and regenerated attempts.

## 6. Refund Operations

- Refund uses compensating ledger entry.
- Automated refund is idempotent.
- Manual refund requires permission, reason and audit event.
- Customer-facing transaction history shows status without provider-sensitive diagnostics.

## 7. Acceptance Criteria

- Users know the charge before billable regeneration.
- Retry cannot double-charge.
- Approved output is traceable to Product, Batch, job, profile and references.
- Refund and release reconcile with ledger and reservation.
- Package revision allowance is versioned with accepted quote.
- Bulk approval remains usable on mobile and desktop.

