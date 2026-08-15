---
name: review-commercial-integrity
description: Review ModelPromptForge pricing, Credits, payment, creator earnings, payout, refund, reconciliation, and support-recovery workflows for immutable pricing, authorization, idempotency, auditability, and customer protection. Use whenever billable or financial state changes. Do not use for price-label styling or copy when calculation, consent, and submitted contracts are unchanged.
---

# Review Commercial Integrity

## Workflow

1. Identify customer action, actor, monetary/Credit units and authoritative
   pricing source.
2. Trace estimate, immutable confirmation, reservation, side effect, settlement
   and reconciliation.
3. Verify authorization and idempotency at every retryable boundary.
4. Separate customer charge, platform revenue and creator liability.
5. Define failure, refund, compensation and manual support behavior.
6. Require correlation and audit evidence for material changes.
7. Build replay, duplicate, insufficient-funds and partial-failure tests.

## Required Output

```text
Financial invariants
Price and consent snapshot
Idempotency and reconciliation map
Settlement/refund/support rules
Authorization and audit requirements
Acceptance and abuse cases
```

## Guardrails

- Do not trust client price, actor or balance.
- Do not treat a mutable balance as the production ledger.
- Do not permit unaudited manual corrections.
- Do not weaken authorization or idempotency for support convenience.
- Load the Generation Workflow Skill when Credit lifecycle and Queue execution
  cross multiple stages.
