# Phase 2-18 Production Support And Manual Recovery

**Status:** Proposed - Required before paid beta  
**Owner:** Platform Operations, Support, Credits and Durable Jobs  
**Dependencies:** Phase2-04, Phase2-07, Phase2-10, Phase2-15 and
`requirements/013-implementation-fashion-blueprint/012-platform-correlation-tracing-and-credit-recovery.md`

This requirement defines domain recovery commands. The staff-facing workflow,
Case lifecycle, approvals and command audit are owned by
`requirements/017-implementation-backend/`. Every production recovery starts
from a Support Case and invokes these commands through the owning capability;
do not build a second standalone recovery console.

## 1. Purpose

Production Support must be able to investigate and safely resolve customer
workflows that become inconsistent because of process restart, lost queue
state, provider timeout, partial batch completion or financial compensation
that completed without the owning run reaching a terminal state.

The motivating MVP incident is:

```text
Fashion run remains queued
-> child generation job is absent from the active queue and result history
-> reservation has already been refunded for technical_failure
-> customer UI continues polling a workflow that can never complete
```

Local development may require a one-time controlled data repair. Commercial
operation must provide authorized support commands and must never require an
operator to edit JSON, database rows, balances or ledger entries manually.

## 2. Support Outcomes

Starting from a customer-safe support reference or any known domain ID,
authorized Support/Admin staff must be able to:

- reconstruct the quote, run, operation, job, provider attempt and credit
  timeline;
- distinguish an active slow job from an orphaned or terminal job;
- see reservation, capture, release and refund state before taking action;
- close an unrecoverable orphan without creating a fake result;
- retry an eligible operation as a new attempt with a fresh estimate when
  required;
- refund an eligible captured charge exactly once;
- record resolution without financial action when compensation already
  completed;
- provide the customer a stable support reference and customer-safe outcome.

## 3. Incident Classification

Support tooling uses explicit reason codes:

```text
orphaned_after_restart
queue_lease_expired
provider_timeout
provider_failure
result_persistence_failed
credit_capture_incomplete
credit_refund_incomplete
partial_batch_failure
duplicate_submission
manual_investigation
```

An orphaned operation means all of the following are true:

- its persisted state is non-terminal;
- no valid active lease/heartbeat exists;
- no recoverable queue job or provider attempt owns it;
- no successful result exists in authoritative result storage;
- the configured recovery grace period has elapsed.

Absence from one process's memory is not sufficient proof in production.

## 4. Manual Recovery Commands

Support actions are server-side application commands, not generic record edit
endpoints:

```text
Diagnose workflow
Mark orphaned operation failed
Reconcile run aggregate state
Release/refund eligible reservation
Retry eligible operation
Resolve investigation without financial action
```

Every material command requires:

- authenticated Support/Admin actor and explicit permission;
- target correlation/run/operation ID;
- stable reason code and operator note;
- expected current version or state for optimistic concurrency;
- deterministic idempotency key;
- dry-run diagnosis before confirmation;
- append-only audit event and trace event;
- IDs of resulting run, attempt, reservation and ledger records.

The command must re-read authoritative Job, Result and Credit state inside the
same recovery workflow. It must reject stale operator screens and conflicting
concurrent recovery.

## 5. Financial Safety

- Never edit account balance or an existing ledger entry.
- Refund/release uses the canonical Credit domain and compensating ledger
  entries.
- A reservation already marked `refunded` is reported as financially resolved;
  closing the orphan performs no additional credit mutation.
- A captured operation can be refunded only up to its net captured amount.
- Retry creates a new attempt and obtains a current quote/estimate where policy
  requires it; it does not silently reactivate an expired reservation.
- Partial Fashion batches reconcile each operation independently and derive the
  aggregate run status from operation outcomes.
- Support grants are distinct from refunds and require a separately authorized
  adjustment reason.

## 6. State Repair Contract

For an orphan whose refund already completed, recovery records:

```json
{
  "operationStatus": "failed",
  "runStatus": "failed",
  "errorCode": "orphaned_after_restart",
  "financialAction": "refund_already_completed"
}
```

The original quote, reservation, job ID, failed attempt and error evidence are
retained. Recovery never deletes or rewrites historical attempts. Run aggregate
state must be recalculated from all operations, producing `completed`,
`partially_completed`, `failed` or `cancelled` as appropriate.

## 7. Support Console UX

Add a role-gated Production Support workspace under the existing Admin/Support
feature. It contains:

- lookup by correlation ID, run ID, operation ID, job ID, reservation ID,
  ledger entry ID or provider request ID;
- ordered status timeline and explicit `Active`, `Stalled`, `Orphaned`,
  `Compensated` and `Resolved` indicators;
- customer, ownership, workflow and provider summary without exposing private
  prompts or image payloads;
- credit panel showing reserved, captured, released, refunded and net amount;
- recommended actions with unavailable or unsafe actions hidden;
- dry-run impact summary and a confirmation dialog requiring reason/note;
- success receipt containing support reference, audit ID and financial action;
- customer-safe message that Support can relay without internal diagnostics.

Destructive-looking actions must name the exact effect, for example `Mark job
failed - no credit change`, rather than a generic `Fix` button.

## 8. Automatic Detection And Prevention

Manual Support is a fallback, not the normal recovery mechanism:

- durable workers use persisted jobs, leases and heartbeats;
- startup/background reconciliation scans expired non-terminal work;
- reconciler checks result and financial state before transition;
- eligible jobs retry automatically within policy limits;
- unrecoverable orphaned operations transition to terminal failure and trigger
  idempotent financial compensation;
- queue depth, oldest lease, orphan count, compensation failures and ledger
  mismatches emit alerts;
- the customer UI stops indefinite polling and shows a support reference once
  the authoritative state is terminal or investigation is required.

## 9. Architecture Ownership

Planned ownership follows existing capability boundaries:

```text
server/app/routes/supportRecoveryRoutes.js
server/domain/support/ProductionSupportRecoveryService.js
server/domain/generation/JobReconciliationService.js
server/repositories/audit/
server/domain/credits/
server/domain/observability/
web/src/features/admin/
```

The Support recovery service orchestrates existing Fashion, Generation,
Credits, Audit and Observability services. It does not own parallel queue,
ledger or result stores. PostgreSQL and durable task state replace local JSON
for commercial deployment.

## 10. Required Operational Runbook

For every incident:

1. Capture the customer's support reference and affected output expectation.
2. Run read-only diagnosis and verify actor ownership.
3. Verify queue lease, provider attempt, result storage and financial state.
4. Select the narrowest allowed recovery action.
5. Review dry-run financial and workflow effects.
6. Confirm with reason and operator note.
7. Verify terminal run state, ledger reconciliation, audit and trace timeline.
8. Send the customer-safe resolution and retain the support receipt.

Emergency direct data repair is restricted to non-production/local recovery,
requires a backup and written incident record, and must be followed by normal
domain reconciliation. It is never an advertised production procedure.

## 11. Acceptance Criteria

- Support can diagnose the complete Fashion orphan scenario from one ID.
- An already-refunded orphan closes as failed without issuing another refund.
- A captured failed operation can be refunded once through the Credit domain.
- Duplicate recovery commands return the original resolution receipt.
- Retry preserves the failed attempt and creates new attempt lineage.
- Partial runs retain successful outputs and reconcile failed operations.
- Unauthorized and cross-actor access is denied and audited.
- No support action edits balance, ledger history or provider evidence directly.
- Customer polling terminates with a useful status and support reference.
- Every recovery action is represented in domain state, trace and audit records.

## 12. Validation Scenarios

```text
restart after reservation but before provider dispatch
restart during provider execution with expired lease
provider completed but result persistence failed
result persisted but credit capture callback was interrupted
refund completed while run remained queued
one failed operation in a five-item Fashion batch
duplicate support refund/retry command
stale support screen concurrent with automatic reconciliation
cross-actor lookup and non-support command denial
audit/trace redaction and ledger reconciliation
```
