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

Commercial recovery policy remains under Requirement 018. This set defines the
staff product and Support orchestration boundary.

## 9. Global Acceptance

- Staff can trace a billed failed request from one safe support reference.
- Staff cannot execute a command outside their role or without required case
  evidence.
- Retrying a command cannot double-refund, double-credit or duplicate a Job.
- Customer balance and case outcome reconcile to immutable records.
- Sensitive media/prompts are hidden unless explicitly required and authorized.
- Every material read/action appears in Audit with correlation and case ID.
- Existing customer workflows remain available when the Admin console is down.
