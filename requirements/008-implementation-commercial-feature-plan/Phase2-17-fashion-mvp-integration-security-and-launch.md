# Phase 2-17 Fashion MVP Integration, Security and Launch

**Status:** Proposed - Final MVP Gate

## 1. Launch Scope

- Thai small-merchant Fashion Selling
- One to five wearable clothing Products per Batch
- Ready/template/custom Model Profiles according to enabled Package
- One shared scene/style per initial Batch
- Three to four outputs per Product
- Approval and marketplace/social export
- Advanced Studio remains available

## 2. End-to-End Scenarios

Test at minimum:

1. Register, verify and create Fashion Project.
2. Purchase/receive credits and verify ledger.
3. Upload Products and optional paid analysis.
4. Select or create approved Model Profile.
5. Select scene, style and Shot Pack.
6. Quote, reserve and confirm.
7. Restart server during Batch and recover.
8. Approve, regenerate and export.
9. Exercise provider failure, safety rejection and refund.
10. Expire entitlement while preserving historical access policy.

## 3. Security Gate

- Authentication/session/CSRF/rate-limit review
- Object-level authorization tests for all owned IDs
- Upload validation and private asset delivery tests
- Payment webhook signature/idempotency tests
- Financial concurrency and reconciliation tests
- Secret and sensitive-log review
- Dependency and vulnerability review
- Admin/support audit review

## 4. Reliability Gate

- Database backup and restore drill
- Durable queue restart/lease recovery
- Provider timeout and degraded-mode behavior
- Idempotent Batch/payment/refund operations
- Storage lifecycle and missing-object handling
- Monitoring for queue depth, failures, webhook errors and ledger mismatch

## 5. UX and Accessibility Gate

- Thai-first copy review and English fallback
- Mobile small-screen workflow
- Keyboard/focus/screen-reader checks
- Reduced-motion and slow-network behavior
- Price and AI disclosure visibility
- First-time merchant usability test without prompt terminology

## 6. Business and Policy Gate

- Final Packages, included revisions and refund policy approved
- Terms, privacy notice and data retention published
- AI-generated image and product-accuracy disclosure approved
- Consent/rights policy for face and product uploads
- Customer support and financial dispute process
- Cost/margin monitoring with configurable provider rate card

## 7. Rollout

```text
internal -> invited alpha -> private beta -> limited paid beta -> public MVP
```

Use feature flags and entitlement cohorts. Define rollback criteria for financial mismatch, data loss, authorization defect, excessive failure rate or provider cost anomaly.

## 8. Launch Metrics

- Project creation completion
- Time to first successful approved image
- Quote-to-confirm conversion
- Batch completion and retry rates
- Approval/export rates
- Credits reserved vs settled vs refunded
- Product/model mismatch rejection reasons
- Repeat Project and credit purchase rates

## 9. Acceptance Criteria

- All mandatory phase acceptance criteria pass.
- No unresolved high-severity authorization, financial or data-loss issue.
- Backup restore and ledger reconciliation are demonstrated.
- Customer sees complete price before every paid process.
- Fashion module can be disabled without disabling core history/export access policy.
- Product Owner signs off private-beta scope before enabling paid users.

