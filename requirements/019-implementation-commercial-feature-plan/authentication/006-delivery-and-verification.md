# AUTH-006 Delivery And Verification

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** Implementation authorized; foundation, T01/T02, T03A/B/C/D, T04A/B and T15A complete; T05A session implementation in progress; runtime integration pending
**Task authority:** [task-plan.json](task-plan.json); child packets live in
[AUTH-008](008-executable-task-packets.md). This page supplies milestone context
and acceptance coverage; milestone rows are not executable tasks or status copies.

## 1. Execution Rules

The main thread acts as Lead; one domain primary owns each task. Security and QA
review sensitive work; UX also reviews material screens. T01/T02 also need Backend
feasibility/contract review. More than two reviewer charters are justified by the
independent security, UX, persistence and testability responsibilities; apply them in waves:
main plus at most two agents, no child delegation. An implementer is not its own
independent reviewer. Same-role QA peer review needs distinct agent identity.

User authorization received after AUTH-009. Resolve T01 decisions, then move
eligible tasks to ready. Execute one task at a time and
record evidence/reviewer result before advancing. Shared folder scopes in the
JSON are sequential, not permission for parallel writes or unrelated refactoring.
Before delegation narrow migration/cutover inventory scopes to exact files and
update the architecture map for any new foundation path.

Implementation Skills activate only for their matching work: database migration
Skill for T03/T15; UX for T02/T13/T14; QA for review. Credits/Generation rules are
preserved, not changed; if future scope alters settlement/job lifecycle, stop that
task, add its owning requirement and mandatory Commercial/Backend review rather
than hiding the change inside Authentication.

## 2. Milestones And Executable Child Tasks

Execution decisions/evidence: [AUTH-010](010-implementation-decisions.md). Earlier
documentation evidence below is historical; JSON records current task status.

The original 18 broad tasks are retained as milestone IDs only. BSA decomposition
created 44 bounded executable children; AUTH-009 adds two children under T19,
making 46 children across 19 milestones. Implementation inventory added the
bounded Audit prerequisite T03D, bringing the current total to47. Its owning
Phase2-03 scope is documented in database-foundation.md. Their dependency DAG, owner, write scope,
acceptance and status live only in JSON, with detailed work/check packets in
AUTH-008. A milestone is complete only when all its children have accepted
evidence; it has no separate executable row. Execute dependency order, not numeric
milestone order. In particular T15A inventory precedes actor/cutover changes and
T12 MFA precedes T10/T11 sensitive management.

| Task | Deliverable | Depends on | Exit evidence |
|---|---|---|---|
| T01 | Auth/email/provider/security decision record D01-D08 | User instruction | Feasibility, explicit unresolved release gates, no vendor assumptions |
| T02 | Frozen API/data/UX contract and error/state matrix | T01 | Backend/Security/UX/QA review of interfaces and acceptance |
| T03 | Identity/Audit adapters, isolated schema and focused-runner bootstrap | T02 + Phase2-03 foundation | DB concurrency/uniqueness/rollback; provider reconciliation; contracts/persistence groups |
| T04 | Challenge engine, delivery adapter, limits and outbox | T03 | Fake clock/mail, replay/resend/multi-instance limits |
| T05 | Sessions, actor/status enforcement and action assurance | T03; T15A before actor integration; child DAG | Cookie/CSRF/expiry/private read/write/action-bound evidence |
| T06 | Explicit enrollment and password login | T04,T05 | Verification, optional password, one-account provisioning |
| T07 | OTP login and restricted password reset | T06 | Purpose separation, reset revocation, no automatic login |
| T08 | Google adapter | T07 | Actual-protocol fixture validation and email assurance |
| T09 | Facebook adapter | T08 | App-scoped identity, missing email, callback/provider events |
| T10 | Link/unlink existing methods | T05C,T08A,T09A,T12B | Both-side proof, uniqueness and last-method concurrency |
| T11 | Email/password changes and Support recovery boundary | T10 | Fresh proof, collision/revocation, notification/idempotency |
| T12 | Staff MFA and protected factor recovery | T05C,T06B,T07A,T08A,T09A | No OTP/social/reset downgrade; staff bootstrap controls |
| T13 | Transport/actor lifecycle, login/signup/reset UI and interruption | T02B,T05B,T12B plus owning backend children | Forms, JSON/progress/blob parity, safe return and draft isolation |
| T14 | Account security/session UI and menu integration | T13 | Method management, confirmations and sibling preservation |
| T15 | Early private-route inventory, later mock cutover and media isolation | Inventory after T02A; cutover after T05B,T13A | Exact affected files/private surfaces; fail-closed rollback |
| T16 | Complete existing runner, integration and aggregate regressions | T15 | Each acceptance maps to raw isolated checks |
| T17 | Staging provider/email and manual user journeys | T16 + live-test authorization | Controlled delivery/social evidence and responsive journeys |
| T18 | Readiness review and rollout handoff | T17 | Decisions/evidence reviewed; no deployment implied |
| T19 | Local development Login override | T19A after T02A/T05B; T19B after T19A/T13A; before T16A | Server toggle, isolated fixture, local boundary, visible mode and off/restart transitions |

T03 does not authorize implementing the whole Phase2-03 roadmap. If its DB pool/
transaction/migration foundation is absent, record the upstream dependency and
resolve that owning task first. Local identity completion does not open other
unmigrated product capabilities to production.

All tasks carry precise role, risk, dependency, write scope, acceptance and
handoff in JSON. All evidence/reviews are empty until performed. Task completion
must map each acceptance string to actual passed evidence; never weaken it.

Before dispatch, read the applicable child packet, its dependency outputs, D01-D08
and [UX dispositions](007-expert-ux-review.md). Folder scopes allow only the child's
specified outcome, not unrelated files or concurrent edits. An unresolved provider,
DB, privacy or live-test prerequisite blocks that child without inventing approval.

## 3. Focused Validation Runner Contract

Proposed future runner: `scripts/verify-authentication.mjs`, support modules in
`scripts/authentication/`, fixtures/tests in `test/authentication/` plus owning
frontend tests. These files are NOT created by this documentation change.

T03 creates the runner/fixture harness with contracts and persistence groups.
T04-T15 extend their owning groups as behavior is delivered; they own the needed
runner/test write scopes in JSON. T16 integrates the completed groups and runs
the explicit aggregate. Before a group exists, the runner reports unsupported/
incomplete with nonzero exit rather than a pass/skip. Do not defer all testing
until T16; each task also runs its focused owning tests during implementation.

Prerequisites: repository Node dependencies, disposable PostgreSQL database/schema
from Phase2-03, isolated fixture IDs, fake mail/provider adapters, fake clock,
separate test configuration, and browser fixture server for UI. The runner must
verify the DB is explicitly designated disposable; reject production hosts/data
roots and absent prerequisites rather than silently skip. Tests cannot touch
`server/data/` runtime records. No default live networking.

Commands to implement and run after each owning task:

```text
node scripts/verify-authentication.mjs --group contracts
node scripts/verify-authentication.mjs --group persistence
node scripts/verify-authentication.mjs --group challenges
node scripts/verify-authentication.mjs --group passwords
node scripts/verify-authentication.mjs --group social
node scripts/verify-authentication.mjs --group linking-recovery
node scripts/verify-authentication.mjs --group sessions-authorization
node scripts/verify-authentication.mjs --group mfa
node scripts/verify-authentication.mjs --group ui
node scripts/verify-authentication.mjs --group integration
node scripts/verify-authentication.mjs --group development-bypass
node scripts/verify-authentication.mjs --all
```

`--all` is explicit, isolated, non-interactive and fails on any group failure or
missing prerequisite. It must not send live email, call Google/Facebook, create
provider apps, run migrations on live data, restart existing workers or spend
Credits. Bound test groups and timeouts, clean only verified fixture resources.
A runner may start/stop its own isolated fixture process, never an existing worker.
No bare invocation runs the aggregate.

Frontend task checks additionally use existing `npm run typecheck:web`,
`npm run lint:web`, focused `npm run test:web -- ...` and
`npm run i18n:validate` after confirming actual script arguments. Production
build is a later explicit gate, not an automatic requirement-document action.

## 4. Acceptance-To-Evidence Matrix

| Acceptance | Required scenarios | Owner tasks / focused groups |
|---|---|---|
| AC01 | Same email/provider concurrency, provisioning retries, stable userId and no duplicate Credits | T03,T06,T10 / persistence,integration |
| AC02 | Pending/suspended/disabled/closed, every method, reset and stale sessions | T05-T12 / passwords,social,sessions-authorization |
| AC03 | Terms explicit; no marketing/public profile/staff/bonus side effect | T06,T13 / contracts,ui,integration |
| AC04 | Valid/invalid, cancellation/outage, required MFA, generic pre-proof response | T06-T09,T12 / passwords,social,mfa |
| AC05 | Boundary expiry, resend, delayed mail, concurrent consume, cross-purpose/context, cross-worker limits | T04,T07 / challenges |
| AC06 | Wrong issuer/app/audience, missing email, denied permission, OAuth CSRF/state/nonce/replay, no email auto-link | T08-T10 / social,linking-recovery |
| AC07 | Hash policy/upgrade, optional password, secrets absent in DTO/log/browser fixtures | T04,T06,T11 / passwords,contracts |
| AC08 | Existing account proof, provider conflict, last-method race, revoked proof | T10 / linking-recovery,persistence |
| AC09 | OTP login unchanged password, reset-only authority, old sessions/grants fail, change-versus-reset race | T07,T11 / linking-recovery,sessions-authorization |
| AC10 | Existing/new email proof, collision/race, old code failure, delivery retry | T11 / linking-recovery |
| AC11 | No unsupported recovery/MFA downgrade/Support bypass; factor replay, clock skew, recovery-code races and stale contexts | T11,T12 / linking-recovery,mfa |
| AC12 | Rotation, fixation, CSRF, idle/absolute timeout, multi-instance revoke, status change | T05,T12 / sessions-authorization |
| AC13 | Cross-owner GET/mutation/media/download/static/stream paths and explicit public reads | T15 / sessions-authorization,integration |
| AC14 | Production mock valid/invalid/absent header/query; real session independent of supplied mock ID | T15 / sessions-authorization |
| AC15 | DB constraints, provider partial failure, idempotency payload conflict, rollback cannot enable mock | T03,T15 / persistence,integration |
| AC16 | Every UI state, three viewports/themes, enabled locales, keyboard/autofill/screen reader | T13,T14,T17 / ui + manual |
| AC17 | Same-actor temporary draft, different actor, reload/logout, multi-tab, late response, browser Back | T13,T16 / ui,integration |
| AC18 | Public browse, Profile/Credits/preferences/Admin siblings, return path, no Generate replay | T13-T16 / ui,integration |
| AC19 | Real staging email and Google/Facebook, app permissions/deletion/deauthorization obligations | T17 / separate manual evidence |
| AC20 | D01-D08, independent reviews, retention/rollout/rollback and remaining commercial gates | T18 / readiness handoff |
| AC21 | Single-toggle qualified fixture entry and normal authentication when absent/off | T19 / development-bypass |
| AC22 | Unsafe startup/request/fixture rejection, isolated data and unchanged authorization | T19 / development-bypass,sessions-authorization |
| AC23 | Visible mode, three transports, restart/off and mode-scoped private-state cleanup | T19 / development-bypass,ui,integration |

AUTH-AC19: Live staging qualification proves provider/email delivery and relevant
app configuration with controlled test accounts; mocks alone cannot pass it.
AUTH-AC20: Release requires resolved decisions and independent evidence, with
fail-closed rollback; documentation and local auth do not certify whole-platform launch.

Adjacent regression cases include AccountMenu navigation, preferences, anonymous
Community, actor-owned private media, Generation status/result access, no duplicate
submission/settlement, and no abandoned/mis-owned browser drafts. Use existing
canonical tests plus new isolated cases, not only assertions mirroring new code.

## 5. Manual Staging And Release Gates

T17 needs approved staging origins, TLS, disposable accounts/mailboxes, provider
app credentials via secret management, bounded send budget, isolated DB and
provider configuration. Never ask for raw secrets in chat or logs. If unavailable,
record blocked live cases; deterministic tests still have value but cannot close
live acceptance.

Manual cases: new/repeat signup each method; social email missing/denied; cancel/
popup-blocked; OTP arriving late/resend; password manager; lost-password reset;
link then alternate login; unlink conflict; email change; remote session logout;
MFA fallback/recovery refusal; same/different actor after session expiry; mobile
keyboard and responsive states. Collect redacted screenshots and correlation IDs,
never tokens/codes/private references. Real test email/providers require that
future authorization; not enabled by `--all`.

Production checklist: enforce mock exclusion and all private routes; secure sender/
provider setup including current Meta review/privacy/data-deletion obligations;
revocation and staff MFA; decisions D01-D08; durable audit/cleanup; operational
alerts for delivery failure, throttling and callback failure; capacity baseline
before tuning; rollback rehearsal; independent Security/QA with UX evidence.
No numeric latency claim without baseline. Domain statuses cannot be cached into
stale access. Identity endpoints and metadata lists are bounded.

Production rollback disables affected login methods or entry, preserves owned
records, revokes affected sessions and restores only a compatible secure version.
It never falls back to demo IDs. Live deployment, account claims, data deletion
and broad DB migration need separate explicit instruction.

## Documentation Evidence

2026-10-10: source inspection completed; this packet specifies planned behavior,
not implementation. Existing unrelated edits to agent-orchestration verification
documentation are outside this task.

- Plan validation passed: `node scripts/verify-agent-orchestration.mjs --plan
  requirements/019-implementation-commercial-feature-plan/authentication/task-plan.json`.
  Confirms structure, role gates, scopes and dependency DAG only. All 18 tasks
  remain proposed with empty implementation evidence/reviews and no parallel batch.
- Local packet Markdown link/anchor checks passed (7 Markdown documents, 19 local
  links). Scoped `git diff --check` passed. Added canonical map/crosswalk links and
  new-file whitespace are included in the final documentation check. Proposed
  runtime paths are intentionally not claimed to exist.
- Independent Security review by `/root/auth_requirement_security_review`: pass
  for documentation after adding explicit MFA attempt/replay/concurrency tests,
  protected bootstrap/notifications and invalidation of stale security proofs.
- Independent QA review by `/root/auth_requirement_qa_review`: pass for
  documentation after moving runner bootstrap to T03, assigning incremental test
  scopes, adding Backend contract review, completing remember-device transport
  and reconciling MFA selection timing. QA independently reran plan validation.
- Reviewer verdicts assess the requirements only; they do not close any future
  implementation task or certify production security/runtime behavior.
- UX: requirement perspective applied in the main thread; no implemented screen
  or independent visual acceptance is claimed.
- No application tests, real email, OAuth login, UI/browser acceptance, database
  migration or production deployment performed for this documentation-only task.
- Runtime architecture unchanged; planned ownership rows and requirement
  cross-references updated. No application files or runtime data introduced.

### Subsequent Expert UX And BSA Revision

The initial evidence above describes the first 18-task draft. At the user's
request, independent Custom UX review identified nine required corrections before
freeze; AUTH-007 records dispositions and re-review. BSA analysis decomposes those
milestones into 44 children in AUTH-008/JSON, including early route inventory,
qualified MFA before management, every API transport and outcome reconciliation.
All children remain proposed; earlier validation counts are historical, not a
claim that this revised packet or any application code has already passed UAT.

Final revised-packet validation: passed. Independent QA verified 44 unique
packets, all 18 rollups, exact JSON/Markdown dependency and GWT parity, complete
AC01-AC20/UX01-UX09 coverage, early route inventory and MFA prerequisites. Both
task-plan validators and inventory passed; contracts 24/24 and legacy 10/10
passed. BSA also checked packet anchors, local links and new-file whitespace.
UX, Security and Backend passed their revised-document scopes; AUTH-007 records
each verdict and boundary. No implementation, browser or live acceptance is
claimed. Those 44 children remained proposed; the subsequent addition below
does not change their implementation status.

### Local Development Override Addition

AUTH-009 adds user-requested `AUTH_DEV_BYPASS_ENABLED` and AC21-AC23. T19A/T19B
bring the total to 46 proposed children and 19 milestone rollups. T16A depends
on T19B, so aggregate/readiness cannot omit this exception. Previous review
counts above describe the earlier packet; AUTH-009 records this addition's
independent review and structural checks. No runtime or actual `.env` edit.
