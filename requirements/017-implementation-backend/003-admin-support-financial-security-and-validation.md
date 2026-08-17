# Admin And Support Financial, Security And Validation Requirement

**Primary role:** Commercial Financial Integrity
**Reviewers:** Backend Platform Architect, QA And Release Engineer
**Skills:** `review-commercial-integrity`, `verify-release-regressions`

Requirement 017-005 owns the staff-facing dry-run, approval, confirmation,
Toast and durable outcome presentation. Requirement 017-006 owns the financial
and security evidence matrix and release recommendation. Requirement 017-007
owns the executable role/command/approval matrix; Requirement 017-009 prevents
financial exposure before durable prerequisites pass.

## 1. Risk Tiers

| Tier | Example | Approval |
|---|---|---|
| R0 read | sanitized lookup | role policy + audit |
| R1 operational | retry eligible failed Job | support lead policy |
| R2 customer state | session revoke, suspend | explicit confirmation + reason |
| R3 financial | refund/compensation within limit | case evidence + finance/support policy |
| R4 high financial/destructive | large refund, role change, irreversible action | two-person approval |

Threshold values are configuration, not client constants.

## 2. Financial Invariants

- Credit balance is a projection of immutable ledger entries in production.
- Refund references the original reservation/capture/payment; it is not a
  generic positive adjustment when provenance exists.
- Compensation is distinct from technical refund and has its own reason code.
- Money refund, Credit refund, creator liability and platform adjustment are
  separate events.
- A Support command can settle once only.
- Manual correction always records before/after projection, source transaction,
  case, actor, approver and idempotency key.
- Staff UI never submits an authoritative price or balance.

## 3. Recovery Decision Matrix

| Evidence | Default action |
|---|---|
| reserved, never dispatched | release/refund reservation |
| dispatched, provider failed, no durable output | technical refund |
| completed output, capture missing | reconcile capture after evidence |
| captured, durable output missing | investigate storage; refund or restore via policy |
| customer dislikes valid output | no automatic refund; compensation policy |
| duplicate capture | reverse duplicate through ledger command |
| payment succeeded, Credits not granted | payment reconciliation/grant once |
| payment uncertain | query payment provider before retry |

## 4. Security And Privacy

- Least privilege and deny by default.
- PII fields are masked in list/search results.
- Raw prompts and private media require purpose, reveal action and enhanced
  audit; secrets/provider credentials are never available.
- Notes reject secrets and have controlled redaction rather than deletion.
- Exports are permissioned, watermarked/attributed where appropriate and
  retention-limited.
- Repeated denied access, mass lookup and unusual compensation trigger alerts.
- Account suspension does not delete evidence or change financial history.

## 5. Approval And Execution

1. Dry-run validates current target/version and computes impact.
2. Requester confirms reason and evidence.
3. Policy determines required approval and expiry.
4. Approver sees the same immutable dry-run fingerprint.
5. Owner capability executes using Support command idempotency.
6. Reconciliation verifies both domain and financial result.
7. Case timeline records customer-visible resolution separately.

Any changed target/version invalidates approval and requires a new dry-run.

## 6. Automated Validation

Required suites:

- role/permission matrix for every route and command;
- self-approval and same-person two-step denial;
- duplicate/replay/unknown network outcome;
- concurrent Case and command version conflict;
- original transaction ownership and unit mismatch;
- insufficient evidence and expired approval;
- partial Generation group settlement;
- payment webhook duplicate/out-of-order event;
- balance/ledger/reservation reconciliation;
- Audit presence and private-data sanitization;
- pagination/query bounds and actor isolation.

## 7. Manual Support Scenarios

1. failed Generation before provider dispatch;
2. provider failure after dispatch;
3. completed result with stuck spinner/unknown client outcome;
4. captured Credits with missing Asset;
5. duplicate payment webhook;
6. successful payment with missing Credit grant;
7. unauthorized Character/Template access report;
8. user suspension and session revocation;
9. large compensation requiring a second approver;
10. reopened Case after failed recovery.
11. locate a disabled Template that is absent from public search and restore it;
12. quarantine an inappropriate original image and verify all public
    derivatives, featured placements and reuse entry points stop serving it;
13. search by Job ID/checksum and trace an image through Asset, post, Template,
    Character and Collection usage without revealing another customer's raw
    media to an unauthorized staff role.

For each record Case ID, support reference, linked entity IDs, dry-run,
approvals, command ID, audit ID, financial before/after and reconciliation.

## 8. Rollout

- Gate by staff role and environment.
- Start read-only overview/search, then Cases, then R1 commands, then financial
  commands.
- Keep high-risk commands disabled until database-backed Audit, idempotency and
  approval records are active.
- Emergency disable prevents new commands while preserving reads and in-flight
  reconciliation.

## 9. Definition Of Done

- All financial invariants have automated evidence.
- No high-risk command runs from local process memory or unaudited JSON edit.
- Support can explain and reconcile every tested customer outcome.
- Privacy review and least-privilege matrix pass.
- Phase2-18 recovery contracts are invoked through Cases, not duplicated.
- All `QA-017-003` evidence in Requirement 017-006 passes before financial
  commands are enabled.
