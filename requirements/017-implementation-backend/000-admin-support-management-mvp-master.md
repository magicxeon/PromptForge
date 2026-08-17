# Admin And Support Management MVP Master

**Status:** Requirement ready for implementation planning
**Primary role:** Backend Platform Architect
**Reviewers:** Commercial Financial Integrity, QA And Release Engineer
**Skills:** `review-commercial-integrity`, `verify-release-regressions`
**Implementation in this change:** None

## 1. Outcome

Momelo shall provide authorized staff one auditable place to find a customer,
trace a request across Jobs and Credits, manage a support case, perform approved
recovery and explain the final financial outcome. Staff must never repair a
customer by editing JSON/database rows directly.

## 2. Current Baseline

The repository already has:

- `server/domain/admin/AdminBackofficeService.js` for overview and read models;
- `server/domain/admin/AdminPolicyService.js` for current admin access;
- read endpoints for users, generations, community posts, ledgers and audit;
- Community moderation and a Credit adjustment command;
- Audit and Observability capabilities;
- Generation/Credit recovery concepts in Commercial Phase2-18.

These are foundations, not the final Support workflow. The MVP extends them;
it does not create alternate Credit, Generation or moderation implementations.

## 3. Scope

### Included

- role-based Admin and Support access;
- operational overview and bounded search;
- customer 360 summary with privacy controls;
- Support Case creation, assignment, notes, evidence and lifecycle;
- correlation/request/Job/Generation Group/Fashion Run lookup;
- payment, Credit reservation and ledger investigation;
- canonical retry, cancellation, refund, compensation and reconciliation
  commands;
- user status/session controls;
- Community moderation handoff;
- cross-status Template and media discovery, quarantine and restoration;
- audit, two-person approval for high-risk actions and reports;
- queues for unresolved financial, orphaned Job and provider incidents.

### Deferred

- enterprise CRM, call center and live chat;
- tax, accounting general ledger and regulatory reporting;
- automated fraud scoring or chargeback representation;
- creator payout execution beyond the commercial requirements;
- arbitrary SQL console, unrestricted impersonation and bulk destructive tools.

## 4. Capability Model

| Capability | Owns | Support/Admin role |
|---|---|---|
| Admin | dashboards, policy-aware read models | compose summaries only |
| Support | cases, assignments, notes, command requests | canonical case workflow |
| Identity | users, sessions, roles, status | executes user/session commands |
| Observability | correlation and trace lookup | supplies sanitized evidence |
| Generation | Job diagnosis/recovery/cancellation | executes operation commands |
| Credits | accounts, reservations, ledger, adjustments | executes Credit commands |
| Payments | checkout, payment, refund/reconciliation | executes money commands |
| Community | public-post moderation and visibility | executes post moderation commands |
| Templates | Template lifecycle, versions and reuse eligibility | executes disable/restore commands |
| Assets | originals, derivatives, lineage and media quarantine | executes media moderation commands |
| Audit | append-only staff action evidence | records all material access/action |

Support may coordinate a case command through public facades. It may not mutate
foreign repositories.

## 5. Staff Roles

MVP roles are additive and least-privilege:

- `support_agent`: case/search, safe diagnosis, customer communication notes;
- `support_lead`: assignment, approved Generation recovery, small compensation;
- `finance_ops`: payment/refund/reconciliation, no content access by default;
- `moderator`: Community moderation, no financial mutation;
- `admin`: user/session/config oversight, no automatic finance approval;
- `super_admin`: emergency/bootstrap role; use is separately audited.

Role does not imply unrestricted access. Each command has an explicit policy,
reason and risk tier.

## 6. Core Flow

```mermaid
flowchart LR
  A[Search or alert] --> B[Open/Create Case]
  B --> C[Collect sanitized evidence]
  C --> D[Classify root cause]
  D --> E[Preview allowed command]
  E --> F{Approval required?}
  F -- yes --> G[Second approver]
  F -- no --> H[Execute owner command]
  G --> H
  H --> I[Reconcile and audit]
  I --> J[Resolve or monitor]
```

## 7. Case Lifecycle

```text
open -> triaged -> investigating -> action_pending
action_pending -> waiting_approval | executing
waiting_approval -> executing | rejected
executing -> monitoring | action_failed
monitoring -> resolved
any non-closed -> waiting_customer | escalated
resolved -> closed -> reopened
```

Every transition records actor, reason, timestamp and expected case version.

## 8. Requirement Set

- `001-admin-support-console-screen-and-function-contract.md`
- `002-admin-support-backend-api-and-data-contract.md`
- `003-admin-support-financial-security-and-validation.md`
- `004-template-content-and-media-moderation.md`
- `005-admin-support-ux-screen-state-and-notification-contract.md`
- `006-admin-support-qa-validation-and-release-gates.md`
- `007-permission-command-and-approval-matrix.md`
- `008-ux-wireframes-and-responsive-screen-blueprints.md`
- `009-implementation-sequence-data-durability-and-rollout.md`

Commercial recovery policy remains under Requirement 018. This set defines the
staff product and Support orchestration boundary.

## 8.1 Cross-Role Coordination Contract

- Requirement 017-001 owns route inventory and product functions.
- Requirement 017-005 owns information hierarchy, interaction, validation,
  Toast, durable async state, accessibility, responsive and theme behavior.
- Requirement 017-002 owns API, domain, repository, idempotency, concurrency and
  observability contracts required by those screens.
- Requirement 017-003 owns financial, approval, privacy and security invariants.
- Requirement 017-004 owns Template and Asset moderation/containment semantics.
- Requirement 017-006 owns acceptance traceability, protected behavior,
  evidence and phase release gates for every requirement in this set.
- Requirement 017-007 owns staff permission, command, risk and approval policy.
- Requirement 017-008 owns low-fidelity route layouts and responsive handoff.
- Requirement 017-009 owns capability readiness, durable data, implementation
  order, migration, feature exposure, rollout and rollback.

Implementation may be phased, but a phase must not invent a local UI state or
mutation path that conflicts with these owners. UX and QA use the same stable
server error/status vocabulary; QA returns failed behavior to its owning
requirement rather than changing acceptance criteria.

## 8.2 Implementation Readiness

- Phase 0 characterization and Gate A read-only implementation may begin from
  Requirement 017-009.
- Case mutation begins only after the Support repository and lifecycle contract
  are implemented and pass Gate B.
- Generation, content and financial commands remain independently gated by
  their owner-capability and durability prerequisites.
- Gate E financial commands are intentionally blocked until authenticated staff
  roles, PostgreSQL Support/Audit/Credit records, approval policy and Payment
  contracts are available.

## 9. Global Acceptance

- Staff can trace a billed failed request from one safe support reference.
- Staff cannot execute a command outside their role or without required case
  evidence.
- Retrying a command cannot double-refund, double-credit or duplicate a Job.
- Customer balance and case outcome reconcile to immutable records.
- Sensitive media/prompts are hidden unless explicitly required and authorized.
- Every material read/action appears in Audit with correlation and case ID.
- Existing customer workflows remain available when the Admin console is down.
