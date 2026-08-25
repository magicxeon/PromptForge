# Admin And Support QA Validation And Release Gates

**Status:** Validation plan ready; execution waits for implementation  
**Owner:** QA And Release Engineering  
**Primary role:** QA And Release Engineer  
**Reviewers:** Backend Platform Architect, Commercial Financial Integrity  
**Skill:** `verify-release-regressions`  
**Implementation in this change:** None

## 1. Outcome

Every Requirement 018 acceptance rule shall have repeatable evidence before a
staff capability is released. QA protects current customer Generation, Credit,
Template, Character, Community and media behavior while validating the new
Admin/Support workflow.

No requirement is complete because a screen exists or a happy-path test passes.
Financial, authorization, moderation, concurrency, recovery and Audit behavior
must be proven independently.

## 2. Validation Governance

- Product/UX defines intended workflow and observable states.
- Backend defines capability owner, API, lifecycle, authorization,
  idempotency, observability and persistence contracts.
- Commercial review defines financial invariants and approval thresholds.
- QA maps each acceptance ID to automated, contract, manual or visual evidence.
- An implementation owner may add tests, but QA must inspect raw results and
  protected behavior rather than accepting the implementer's conclusion.
- Provider/media quality is separate from deterministic correctness and
  requires human evidence when it affects acceptance.

## 3. Evidence Record

Record this block for every validation run:

```text
Requirement / Acceptance ID:
Build / Commit:
Environment:
Actor / Role:
Case ID:
Request / Correlation ID:
Command / Owner Operation ID:
Target IDs:
Automated command and result:
Manual steps and result:
Screenshot / log / audit evidence:
Financial before / after / reconciliation:
Result: pass / conditional pass / fail / blocked
Finding / residual risk:
Reviewer and date:
```

Secrets, raw private prompts, Base64 media and signed URLs must not be copied
into validation evidence.

## 4. Protected Behavior Inventory

Before each implementation phase, QA records and protects:

- customer Generation enqueue, Queue, polling and terminal behavior;
- durable Video provider tasks, restart recovery and Unified Job Center resume;
- Generation Group aggregation and multi-output results;
- Credit estimate, reservation, capture, refund and idempotency;
- actor-scoped history, Characters, Templates and private references;
- Template publication, preparation, Fashion-ready and reuse eligibility;
- Community visibility and existing moderation;
- original/thumbnail/presentation media delivery authorization;
- Video Asset/poster reconciliation, Community video publication and verified
  Character attribution;
- Cinematic Project/Scene/Shot/attempt/source-version continuity;
- Attribute Catalog category publication and runtime compatibility;
- active provider capability/rate-card parity while drafts remain inert;
- existing Audit and Observability correlation propagation;
- actor switching, theme, localization and shared component behavior.

A Support/Admin change fails release if it creates a parallel mutation path or
breaks a protected customer workflow.

## 5. Requirement Traceability

### 5.1 Requirement 018-000 - Master Workflow

Required evidence:

- `QA-018-000-01`: one safe support reference traces a billed failed request to
  Job, reservation, ledger and Case.
- `QA-018-000-02`: staff outside policy cannot view or execute the command.
- `QA-018-000-03`: duplicate command submission does not duplicate Job, refund
  or compensation.
- `QA-018-000-04`: final customer balance reconciles with immutable records.
- `QA-018-000-05`: sensitive prompt/media remains hidden without authorized
  reveal and reason.
- `QA-018-000-06`: every material read/action contains Case, actor, correlation
  and Audit evidence.
- `QA-018-000-07`: customer product remains usable while Admin/Support UI is
  unavailable.

Validation type: server integration, cross-capability contract, manual
end-to-end and failure injection.

### 5.2 Requirement 018-001 - Console Screens And Functions

Required evidence:

- all declared routes render only for permitted roles;
- Operations navigation hides unavailable capabilities while direct route/API
  access still fails server-side;
- Overview queue counts link to the matching filtered data set;
- User Search and Customer 360 use bounded, masked responses;
- Case Inbox filters, pagination, selection and SLA state remain stable;
- Case Workspace persists commands and outcomes after drawer/modal close;
- Trace Lookup distinguishes malformed, not found, partial, expired and
  unauthorized;
- Finance columns do not combine Money, Credits, creator liability or platform
  adjustment;
- Content search returns requested disabled/quarantined records;
- desktop/mobile, keyboard, focus, reduced motion, themes and EN/TH pass.

Validation type: React unit/integration, API schema, accessibility automation,
desktop/mobile browser evidence and permission matrix.

### 5.3 Requirement 018-002 - Backend API And Data Contract

Required evidence:

- route handlers delegate to canonical application facades and contain no
  repository/financial mutation;
- Support Case, Link, Note, Command and Approval schemas reject invalid data;
- list endpoints enforce cursor/limit bounds and stable ordering;
- mutation endpoints require idempotency and expected version;
- concurrent Case edit returns `support_version_conflict` with no lost update;
- replay returns the original command/result;
- unknown network outcome reconciles by owner operation ID before retry;
- owner command failure cannot mark Support command successful;
- stable errors are sanitized and include safe support/correlation references;
- restart does not lose durable command state;
- cross-capability mutation occurs through owner facades only.

Validation type: unit, repository contract, route integration, restart,
concurrency, architecture inspection and data migration compatibility.

### 5.4 Requirement 018-003 - Financial And Security

Required evidence:

- full route/command role matrix, including deny-by-default;
- requester cannot approve their own two-person command;
- staff cannot compensate their own customer account or alter their own role;
- dry-run fingerprint changes invalidate approval;
- refund references original transaction/reservation when provenance exists;
- technical refund and compensation use separate reason/event types;
- Money, Credit, creator liability and platform adjustments reconcile
  separately;
- duplicate/out-of-order payment webhook settles once;
- partial Generation Group settlement follows policy;
- expired approval, missing evidence and unit mismatch block execution;
- raw prompt/private media reveal requires purpose and enhanced Audit;
- repeated denial, unusual lookup and unusual compensation are observable;
- emergency command disable preserves reads and in-flight reconciliation.

Validation type: financial invariant tests, security integration, replay,
concurrency, approval, privacy review and manual Support scenarios.

High-risk financial commands cannot pass while backed only by process memory or
unaudited production JSON mutation.

### 5.5 Requirement 018-004 - Template, Content And Media Moderation

Required evidence:

- staff search can explicitly return draft, preparing, ready, disabled, failed,
  retired, quarantined and tombstoned Templates;
- ordinary users cannot invoke staff include-disabled search;
- exact Asset, Job, post, Template, Character and checksum lookup resolves
  authorized canonical lineage;
- quarantine blocks original, every known derivative, featured placement,
  reuse, reference selection and export;
- linked unsafe Templates/posts become unavailable without deleting Credit,
  Audit or usage history;
- cache/projection failure remains fail-closed and enters reconciliation;
- restore is blocked while any required dependency remains quarantined;
- concurrent moderation conflicts safely and replay is idempotent;
- Support can see sanitized private-media metadata but cannot reveal bytes
  without elevated permission and reason;
- future video/audio/poster/frame derivatives follow the same Asset contract.

Validation type: owner-domain integration, delivery authorization, lineage,
cache failure injection, actor/role security and manual moderation.

### 5.6 Requirement 018-005 - UX Screen And State Contract

Map `UX-018-01` through `UX-018-09` directly to evidence:

- primary goal/action review per route;
- URL-restorable filter tests that preserve compatible Category/Field context;
- loading, empty, partial, stale, error and unauthorized stories/tests;
- Preview -> Confirm -> Execute -> Monitor -> Reconcile state tests;
- Toast plus durable timeline/queue evidence tests;
- financial-unit visual and schema assertions;
- reasoned reveal, focus restoration and Audit assertions;
- desktop `1440px`, mobile `390px`, keyboard, EN/TH and all themes;
- Admin outage/customer-runtime isolation test.

Validation type: React integration, accessibility, visual/manual browser review
and end-to-end workflow.

### 5.7 Requirement 018-006 - QA Plan Completeness

Required evidence before each phase begins:

- every new or changed acceptance rule has an automated, contract, manual,
  visual or explicitly blocked evidence owner;
- no acceptance ID is orphaned and no test silently validates a superseded
  requirement;
- protected customer behavior is updated before implementation changes shared
  components or owner facades;
- exact commands, fixtures and environment prerequisites are recorded when the
  implementation introduces the corresponding modules;
- unavailable QA independence, paid-provider access or production-only proof is
  disclosed as a release risk rather than reported as passed.

### 5.8 Requirement 018-007 - Permission, Command And Approval Matrix

Map `POL-018-01` through `POL-018-09` to:

- complete route/query/reveal/command role matrix tests;
- current `admin`/`support` compatibility and production-disable tests;
- owner-facade dispatch and foreign-repository architecture checks;
- self-action, self-approval, stale/expired dry-run and threshold tests;
- replay/idempotency and separate financial-unit reconciliation;
- direct API denial in addition to hidden/disabled UI evidence.

### 5.9 Requirement 018-008 - UX Wireframes

Map `UI-018-01` through `UI-018-07` to:

- route/component review against the accepted low-fidelity blueprint;
- desktop `1440px` and mobile `390px` browser screenshots;
- list/detail, filter retention, Back navigation and post-action focus tests;
- Case command drawer and persistent operation-state tests;
- Trace timeline, Finance unit separation and Content lineage evidence;
- all themes, EN/TH, keyboard, reduced motion and accessibility checks.

### 5.10 Requirement 018-009 - Implementation, Durability And Rollout

Map `IMP-018-01` through `IMP-018-10` to:

- phase prerequisite and feature-exposure tests;
- canonical entry-point/dependency inspection;
- JSON/PostgreSQL repository contract parity during migration;
- restart, concurrency, replay, backup/restore and reconciliation drills;
- production fail-closed tests for mock roles, JSON financial state and
  process-memory commands;
- retention/legal-hold configuration, pagination and performance evidence;
- per-phase rollout, observation, rollback and compatibility deletion record.

### 5.11 Requirement 018-011 - Dashboard And Shared Workspace

Map `DASH-018-01` through `DASH-018-08` to:

- role-filtered dashboard source and restricted-count leakage tests;
- each tile/queue row opening the exact URL-filtered owner workspace;
- Image/Video, Cinematic, Credit, poster/media, Community video, Attribute and
  configuration fixture coverage;
- partial/stale source, bounded refresh and dashboard-cache invalidation tests;
- shared component contract tests proving no provider, Credit or repository
  mutation occurs in presentation components;
- desktop/mobile, all themes, EN/TH, keyboard and accessibility evidence;
- local/PostgreSQL repository contract parity for dashboard projections.

## 6. Cross-Requirement Test Suites

### 6.1 Role And Permission Matrix

Test `support_agent`, `support_lead`, `finance_ops`, `moderator`, `admin`,
`configuration_publisher`, `security_auditor`, `super_admin` and ordinary user
across every route, query, reveal and command.
Check both hidden UI and direct API denial. Role possession alone must not grant
unrelated finance or private-media access.

### 6.2 Lifecycle And Concurrency

Test every valid Case transition plus invalid transition, stale expected
version, simultaneous assignment, approval expiry, owner command failure,
unknown outcome, reconciliation failure, resolve and reopen.

### 6.3 Idempotency And Replay

Repeat each material command with:

- same key and same payload;
- same key and conflicting payload;
- new key after known success;
- timeout before response;
- restart between owner execution and Support observation.

No path may double-execute or silently lose the owner operation.

### 6.4 Privacy And Data Hygiene

Validate masking, reveal reason, Audit, retention, role separation and response
sanitization. Search/log/Toast/error output must not include secrets, Base64,
signed URL, local path or raw provider body.

### 6.5 Pagination And Performance

For each list/search endpoint validate maximum limit, cursor stability, exact-ID
lookup priority, no full file/table/media-byte scan, bounded Customer 360
payload and separate timing for Support, owner operation, provider and
persistence. Record baseline and slow-request evidence before tuning.

### 6.6 Accessibility And Visual Regression

Validate accessible names, focus order/restoration, error summary, live async
announcements, keyboard-only command flow, contrast, status without color-only
meaning, reduced motion, no clipping/overlap and responsive labeled records.

## 7. Manual End-To-End Scenarios

Execute and record all scenarios before full Requirement 018 closure:

1. Generation failed before provider dispatch; release reservation.
2. Provider failed after dispatch; issue one technical refund.
3. Durable result exists but client showed a stuck spinner; reconcile without
   duplicate generation or refund.
4. Credits captured but Asset is missing; restore or refund by policy.
5. Duplicate payment webhook; grant Credits once.
6. Payment succeeded but Credit grant is missing; reconcile once.
7. Unauthorized Character/Template access report; trace and contain.
8. Suspend a user and revoke sessions without deleting evidence/history.
9. Large compensation; requester and second approver are different actors.
10. Recovery fails; Case moves to action_failed/escalated and later reopens.
11. Find a disabled Template absent from public search and restore only after
    dependencies pass.
12. Quarantine an inappropriate original and confirm every derivative,
    featured placement and reuse entry point stops serving it.
13. Search by Job ID/checksum and trace Asset, post, Template, Character and
    Collection lineage without unauthorized raw-media reveal.
14. Simulate projection/cache invalidation failure; customer delivery remains
    blocked while reconciliation is queued.
15. Disable Admin command execution; reads and in-flight reconciliation remain
    available and customer workflows continue.
16. Restart with an active Video Task; reservation remains valid, Job Center
    resumes and the dashboard does not create a duplicate recovery command.
17. Complete a Video without a poster, reconcile the poster and verify Library,
    Profile, Community and Character placements update through Assets.
18. Trace a Cinematic Shot from approved Storyboard source to provider attempt,
    Video Asset and Credit settlement; reject stale-source retry.
19. Publish and roll back one Attribute category while unrelated categories and
    existing prompts remain unchanged.
20. Save a provider/rate-card draft, schedule publication, restart the worker
    and prove one atomic activation with accepted Quote immutability.

## 8. Phase Release Gates

### Gate A - Read Only

- overview, bounded search, Customer 360, Trace and sanitized evidence;
- current-capability dashboard covers Image/Video, Cinematic, provider,
  media/poster, Content, Attribute and configuration projections;
- every summary opens an exact URL-filtered owner workspace and partial source
  failure remains visible;
- role/permission and Audit-read tests pass;
- no mutation endpoint exposed.

### Gate B - Cases

- Case, Link, Note, assignment and lifecycle persistence pass;
- concurrency, actor isolation, restart and Audit pass.

### Gate C - R1 Operational Commands

- command Preview, idempotency, owner operation observation and reconciliation
  pass for eligible Generation recovery;
- emergency disable and unknown-outcome recovery pass.

### Gate D - Content Commands

- Template/Asset search, lineage, quarantine, restore, cache invalidation and
  fail-closed reconciliation pass.

### Gate E - Financial Commands

- production-grade durable Command/Approval/Audit records are active;
- all financial invariants, two-person approval and replay tests pass;
- Commercial Financial Integrity reviewer signs off.

## 9. Release Decision

QA reports findings by severity, traceability, automated evidence,
manual/visual evidence and residual risk. Final decision is exactly one of:

- `pass`: all required gates and evidence pass;
- `conditional pass`: only documented non-safety residual risk remains with
  owner and deadline;
- `fail`: deterministic, authorization, financial, privacy or protected
  behavior does not meet contract;
- `blocked`: required environment, credentials, paid provider or production
  evidence is unavailable.

No child requirement or the Master may be marked complete while its mapped
acceptance IDs lack evidence.
