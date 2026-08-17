# Admin And Support Backend API And Data Contract

**Owner:** Support capability with Admin read models
**Primary role:** Backend Platform Architect
**Reviewers:** Commercial Financial Integrity, QA And Release Engineer
**Skill:** `verify-release-regressions`

The APIs in this requirement expose the stable validation and operation states
consumed by Requirement 017-005. Requirement 017-006 owns contract,
concurrency, restart, authorization and cross-capability validation evidence.
Requirement 017-009 owns adapter durability, implementation order and cutover.

## 1. Canonical Entry Points

- `AdminBackofficeService` remains the permission-aware read-model facade.
- A new `SupportApplicationService` owns Case commands and cross-capability
  orchestration.
- Identity, Generation, Credits, Payments, Community and Audit execute their own
  state changes behind public application services.

Routes validate HTTP input and invoke these facades. Support must not become a
large service containing foreign business rules.

## 2. Future Placement

```text
server/domain/support/
server/repositories/support/
server/data/support/             local adapter only
server/app/routes/supportRoutes.js
web/src/features/admin/
web/src/features/support/
```

The database adapter later replaces the local repository contract without
changing routes or use cases.

## 3. Support Records

### SupportCase

- `id`, `schemaVersion`, `version`;
- customer user ID, category, priority, status, owner team and assignee;
- subject, sanitized summary and customer-visible status;
- financial-impact flag and declared currency/Credit units;
- created/updated/resolved/closed timestamps.

### CaseLink

- case ID, capability, entity type and stable entity ID;
- relation: cause, affected, evidence, recovery, settlement;
- created actor/time.

### CaseNote

- internal or customer-visible visibility;
- text with length bound, author and timestamp;
- immutable revisions/redaction events; no silent overwrite.

### SupportCommand

- case, command type, target capability/entity;
- requested actor, reason, dry-run snapshot and expected version;
- risk tier, approval policy, idempotency key;
- status, owner operation ID, result summary and error;
- financial impact before/after and reconciliation result.

### SupportApproval

- command, approver, decision, reason and expiry;
- requester cannot approve their own two-person command.

## 4. API Shape

Queries:

```text
GET /api/admin/overview
GET /api/admin/users?cursor&limit&query&status
GET /api/admin/users/:userId
GET /api/support/cases?cursor&limit&filters
GET /api/support/cases/:caseId
GET /api/support/lookup?reference=...
GET /api/admin/finance/reconciliation?cursor&state
GET /api/admin/audit-events?cursor&filters
GET /api/admin/content/templates?cursor&query&lifecycle&moderationStatus&visibility
GET /api/admin/content/media?cursor&query&mediaType&moderationStatus&ownerId
GET /api/admin/content/media/:assetId/lineage
```

Commands:

```text
POST /api/support/cases
POST /api/support/cases/:caseId/transitions
POST /api/support/cases/:caseId/notes
POST /api/support/cases/:caseId/commands/preview
POST /api/support/cases/:caseId/commands
POST /api/support/commands/:commandId/approvals
POST /api/admin/users/:userId/status-commands
POST /api/admin/users/:userId/session-revocations
POST /api/admin/content/templates/:templateId/moderation-commands/preview
POST /api/admin/content/templates/:templateId/moderation-commands
POST /api/admin/content/media/:assetId/moderation-commands/preview
POST /api/admin/content/media/:assetId/moderation-commands
```

Do not expose generic PATCH endpoints for financial or lifecycle state.

## 5. Command Dispatch

Allowed command types map to one owning facade, for example:

- `generation.retry`, `generation.cancel`, `generation.recover_terminal`;
- `credits.refund_reservation`, `credits.compensate`, `credits.reconcile`;
- `payments.refund`, `payments.reconcile`, `payments.replay_webhook`;
- `identity.suspend`, `identity.reactivate`, `identity.revoke_sessions`;
- `community.moderate`.
- `templates.disable_reuse`, `templates.quarantine`, `templates.restore`,
  `templates.retire`;
- `assets.quarantine`, `assets.restore`, `assets.replace_presentation`.

The Support command stores an owner operation ID and observes its result. It
does not emulate the owner mutation.

## 6. Authorization

- Authentication establishes immutable staff actor and session.
- Policy checks role, command, target, case, risk tier and self-action rules.
- Customer-scope access is logged; bulk export is separately permissioned.
- Staff cannot alter their own role, approve their own high-risk command, or
  compensate their own customer account.
- Production impersonation is deferred. Any future implementation must be
  explicit, time-bound, read-only by default and prominently audited.

## 7. Idempotency And Concurrency

- Every mutating request requires an idempotency key.
- Case transitions and notes use expected `version`.
- Command uniqueness includes command type, target and idempotency key.
- Owner facade idempotency keys derive from Support command ID, not free text.
- Unknown network outcomes are reconciled by owner operation ID before retry.

## 8. Error Contract

Stable classes:

- `support_case_not_found`;
- `support_reference_not_found`;
- `support_command_not_allowed`;
- `support_approval_required`;
- `support_version_conflict`;
- `support_evidence_required`;
- `support_command_in_progress`;
- `support_command_outcome_unknown`;
- owner capability stable errors translated without leaking internals.

Responses include safe support reference and correlation ID.

## 9. Observability And Performance

- Propagate request/correlation/case/command/owner-operation IDs.
- Separate Support application, owner command, external provider and persistence
  durations.
- Lists are cursor-paginated, indexed by status/assignee/customer/created time.
- Customer 360 uses bounded summaries and dedicated queries, not full file/table
  scans.
- Trace events have retention and sanitization policy.
- Audit is append-only and queryable by actor, case, target and action.

## 10. Local And Production Adapters

Local JSON may support development through an owning Support repository and
atomic store. Production requires PostgreSQL transactions for Case, Command and
Approval state. No production command may rely on process memory.

## 11. API Acceptance

- Duplicate command request returns the same command/result.
- Concurrent case edit returns version conflict, never lost update.
- Owner command failure cannot mark the Case action successful.
- Every material command has matching Audit evidence.
- Cross-role and cross-customer access tests fail server-side.
- Routes contain no repository or financial mutation logic.
- Every acceptance rule maps to `QA-017-002` evidence in Requirement 017-006
  before this requirement can close.
