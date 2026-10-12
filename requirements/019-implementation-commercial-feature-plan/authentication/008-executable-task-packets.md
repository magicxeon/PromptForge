# AUTH-008 Executable Task Packets

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Requirement inputs:** [AUTH-001](001-account-lifecycle-and-boundaries.md), [AUTH-002](002-password-otp-and-social-authentication.md), [AUTH-003](003-account-linking-and-recovery.md), [AUTH-004](004-sessions-api-and-persistence.md), [AUTH-005](005-screens-and-user-journeys.md)
**Procedure and evidence policy:** [AUTH-006](006-delivery-and-verification.md)
**Authority:** [task-plan.json](task-plan.json) owns executable IDs, dependencies, scopes, statuses, acceptance, evidence and reviews.
**Status:** 47 executable children; 19 parent milestones are rollups only. Implementation authorized; current status lives in JSON.

## 1. Analysis And Execution Boundary

The user requested reviewed Auth requirements and small verifiable tasks. The
native business-system-analyst profile was unavailable in this running session:
direct dispatch reported an unknown agent type. An existing Product custom agent
applied the BSA charter as an explicitly disclosed fallback. This is not native
execution of the newly created BSA profile or independent implementation review.

BSA decomposes reviewed scope; Product owns scope/approval, UX owns interaction,
Backend owns architecture, QA owns independent verdicts and the Lead integrates
status. The latest AUTH-001 through AUTH-005 UX/Security/Backend corrections are
inputs. This packet does not change prices, retention, rights or live authority.

The user has authorized implementation; activate only tasks with satisfied
dependencies. The plan is not a scheduler. Read repository/server/web instructions, owning
requirements, completed dependency handoffs and nearby code/tests before coding.
Load only triggered Skills. Do not spawn child agents. Execute one task at a time;
overlapping capability scopes are deliberate sequential ownership, never parallel
permission. The JSON keeps an empty parallelBatches list and empty evidence/reviews.

Each child has one output and one write owner. Common rules below are part of
every packet. Its dependency list below is a reading snapshot of JSON, not a
second status/approval authority. If scope changes, reconcile JSON and this
packet before dispatch; do not silently absorb another capability's work.

## 2. Milestone Rollup And Dependency Order

| Parent milestone | Navigation outcome | Executable children |
|---|---|---|
| AUTH-T01 | Provider/security decisions | [AUTH-T01A](#auth-t01a), [AUTH-T01B](#auth-t01b) |
| AUTH-T02 | Frozen API/data/UX contracts | [AUTH-T02A](#auth-t02a), [AUTH-T02B](#auth-t02b) |
| AUTH-T03 | Identity persistence, isolated harness and Audit prerequisite | [AUTH-T03A](#auth-t03a), [AUTH-T03B](#auth-t03b), [AUTH-T03D](#auth-t03d), [AUTH-T03C](#auth-t03c) |
| AUTH-T04 | Challenges and delivery | [AUTH-T04A](#auth-t04a), [AUTH-T04B](#auth-t04b) |
| AUTH-T05 | Sessions, actors and assurance | [AUTH-T05A](#auth-t05a), [AUTH-T05B](#auth-t05b), [AUTH-T05C](#auth-t05c) |
| AUTH-T06 | Enrollment and password login | [AUTH-T06A](#auth-t06a), [AUTH-T06B](#auth-t06b) |
| AUTH-T07 | Code login and reset | [AUTH-T07A](#auth-t07a), [AUTH-T07B](#auth-t07b) |
| AUTH-T08 | Google | [AUTH-T08A](#auth-t08a) |
| AUTH-T09 | Facebook | [AUTH-T09A](#auth-t09a) |
| AUTH-T10 | Link/unlink | [AUTH-T10A](#auth-t10a), [AUTH-T10B](#auth-t10b) |
| AUTH-T11 | Credential/email/recovery | [AUTH-T11A](#auth-t11a), [AUTH-T11B](#auth-t11b), [AUTH-T11C](#auth-t11c) |
| AUTH-T12 | MFA | [AUTH-T12A](#auth-t12a), [AUTH-T12B](#auth-t12b) |
| AUTH-T13 | Entry screens and shared actor lifecycle | [AUTH-T13A](#auth-t13a), [AUTH-T13B](#auth-t13b), [AUTH-T13C](#auth-t13c), [AUTH-T13D](#auth-t13d), [AUTH-T13E](#auth-t13e) |
| AUTH-T14 | Account security screens | [AUTH-T14A](#auth-t14a), [AUTH-T14B](#auth-t14b), [AUTH-T14C](#auth-t14c), [AUTH-T14D](#auth-t14d), [AUTH-T14E](#auth-t14e), [AUTH-T14F](#auth-t14f) |
| AUTH-T15 | Inventory and bounded cutover | [AUTH-T15A](#auth-t15a), [AUTH-T15B](#auth-t15b), [AUTH-T15C](#auth-t15c) |
| AUTH-T16 | Isolated acceptance/regressions | [AUTH-T16A](#auth-t16a), [AUTH-T16B](#auth-t16b) |
| AUTH-T17 | Staging qualification | [AUTH-T17A](#auth-t17a), [AUTH-T17B](#auth-t17b) |
| AUTH-T18 | Readiness handoff | [AUTH-T18A](#auth-t18a) |
| AUTH-T19 | Local development Login override | [AUTH-T19A](#auth-t19a), [AUTH-T19B](#auth-t19b) |

Milestone numbers preserve the original plan's references; they are not a forced
numerical execution order. T15A follows T02A early so middleware/cutover consume
a reviewed route/file inventory. T05C provides assurance primitives using
fail-closed adapters; T06-T09 wire actual primary proof and T12A/T12B qualify MFA
before T10/T11 sensitive mutations. No circular first-factor enrollment
dependency is permitted. T03A waits for the external Phase2-03 foundation.
T16A joins all delivered UI/security/cutover outcomes before aggregate verification.
T17 live qualification remains separate from all isolated runner commands.

## 3. Scope Families And Preserved Owners

JSON expands the scope families to repository-relative paths; those arrays are
the coordination write boundary, not filesystem permissions. Within a
directory scope, edit only modules needed for the named output; no unrelated
formatting/refactor. Paths not yet implemented are planned names, not evidence.

| Family | Bounded responsibility |
|---|---|
| D | Owning authentication requirement/task documents only. |
| H | scripts/verify-authentication.mjs, scripts/authentication/ and test/authentication/; isolated harness/fixtures. |
| R | Identity repository adapters plus H; Phase2-03 owns shared DB infrastructure/migration placement. |
| I | Identity domain/repository internals and authRoutes.js/identityRoutes.js transport plus H; no other capability repository writes. |
| IC | I plus server/config/authPolicy.js; configuration never contains checked-in secrets. |
| M | I plus actorContextMiddleware.js, createApp.js and existing mock actor regression test. |
| U | Authentication feature, authentication.css, auth namespace/manifest keys and H. Re-read enabled locales before implementation. |
| P | U plus existing shared auth/API/persistence, router/routeRegistry and AppShell integration owners. |
| N | U plus AccountMenu and its regression test/AppShell; AccountPreferencesDialog behavior is preserved. |
| C | Candidate cutover scope; T15A must replace broad route/Asset candidates with exact affected files in JSON before T15B/T15C become ready. |
| Q | Harness plus exact listed test files and requirement evidence; no application source edits. |
| LIVE | Empty write scope; controlled manual execution only after recorded staging authority; return redacted evidence for Lead integration. |
| DM | Auth documents, parent requirement and affected architecture-map rows for readiness handoff. |

Runtime implementation scopes include the architecture master for same-change
updates of affected canonical ownership rows, public entry points/config/data
locations. If an implementation stays inside the existing mapped boundary, record
"architecture map unchanged" instead of artificial map edits. New supporting
documentation here stays inside the mapped authentication requirements capability;
this decomposition introduces no runtime path.

Identity owns credential/challenge/session/operation data; Audit owns durable
audit persistence; Support owns Cases. Generation, Credits, Assets, Community and
preferences keep their current public contracts. Private media fixes use the
owning facade. Tests may simulate adjacent financial behavior but never change
live balances or the settlement contract.

## 4. Common Work, Checks And Handoff

For every task:

1. Read JSON dependencies and actual passed handoffs, then confirm the packet's
   input/version and external prerequisites. Narrow candidate scopes before
   changing source. Do not infer readiness from milestone order.
2. Follow the task-specific numbered work below and preserve the named adjacent
   behavior. Add focused tests as each behavior is implemented; do not defer them
   all to T16.
3. Execute the owning focused groups and collect raw output/fixtures or redacted
   manual evidence. Check success, negative and recovery cases plus adjacent
   behavior. A packet's checks are required work, not claims of current results.
4. Return changed files, public/data/config contract implications, actual checks,
   failed/unrun cases, risks and exact next action. Lead integrates and updates
   JSON; workers do not independently mark completion.

The three acceptance strings in each JSON task are its observable success,
negative and recovery checks, prefixed with owning AUTH-AC IDs. Their wording
must map exactly to passed evidence entries when completed. The statements below
supply the same Given/When/Then cases. Raw evidence must substantiate every part,
including parent AUTH requirements and common preservation checks; passing a
narrow fixture is not permission to weaken broader acceptance.

**Isolated evidence.** Use the focused runner groups in AUTH-006 with a disposable
DB, fake clock/mail/providers and fixture IDs. No live networking, server/data
mutation, real email, existing-worker restart, paid generation or live Credits.
Each packet lists intended commands; the runner is not yet implemented.
Missing prerequisites/groups fail nonzero. Only T16A explicitly runs --all.

**Frontend evidence.** Every U/P/N task additionally runs appropriate focused
React tests, typecheck:web, lint:web and i18n:validate using confirmed repository
script arguments. Capture affected screens/states at approximately 390px,
768/820px and 1440px, in enabled locales and supported themes. Verify keyboard,
full-code paste/leading zeros, password manager, Enter/primary action, focus,
accessible error/status and no overlap/overflow. Record unverified browser/manual
cases for T17B, never claim visual verification from DOM tests alone.

**Independent gates.** JSON names Security and QA for all sensitive tasks; UX
also reviews user-facing work. T01/T02 add Backend feasibility review. More than
two reviewers are justified by different security, UX and shared-contract
responsibilities and run in waves. QA-owned tasks require a different QA agent.
An implementer cannot supply independent approval by switching roles; record
distinct identities at completion per AGENT-ORCH-009.

**Global stops.** Missing implementation instruction, required credentials,
unresolved material policy, upstream ownership conflict or out-of-scope
destructive action stops dependent execution. Continue only unrelated authorized
work. Do not invent approvals. T17 additionally requires explicit controlled
staging/send/test-account authority and budget; T18 authorizes no deployment.

## 5. External Inputs And Decisions Still Required

| Input or boundary | Required gate / handling |
|---|---|
| Phase2-03 DB pool, transaction helper, migration framework and disposable target | External prerequisite to T03A. T03B must obtain exact Identity DDL placement and amend its scope before DDL; no parallel framework or broad DB roadmap implementation. |
| D01-D04 vendor, email delivery, callback/origin and canonicalization choices | T01A/B before affected implementation. Current packet selects no vendor or credential owner. |
| D05 retention/residency/cleanup and transient delivery payload | Product/privacy owner before affected persistent payload/production cleanup; no manufactured retention approval. |
| D06 factor/bootstrap, session limits and recovery secret handling | T01B/T02A before MFA; first enrollment uses approved restricted bootstrap, later changes require stronger assurance. |
| D07 manual recovery and closed-email reuse | Manual ownership change remains disabled without approved policy and Support public command; safe help still has a task. |
| D08 Terms/legal versions and account claims | Approved versions before activation/qualification; live ID claims are separate authority, never copy all demo users. |
| Operation lookup across forced revocation | T02A freezes handle/receipt before commit, bounded owner/context authority, TTL and minimal result; T03C persists outcome with commit/reconciliation; T05C exposes read-only lookup. Explicit logout/account switch clears receipts. |
| Durable Audit and Support public adapters | Verify upstream availability in T03C/T11C; return missing owner dependency rather than directly editing another repository. |
| Exact private surfaces and cutover file list | T15A runs early; C-family candidate folders must be narrowed before implementation. |
| Current Google/Meta/sender launch obligations | Recheck at T17A with authorized real staging evidence; fixture protocol success does not certify provider availability. |

## 6. Executable Packets

<a id="auth-t01a"></a>

### AUTH-T01A: Select feasible authentication and delivery approach

**Parent:** AUTH-T01. **Owner:** product-requirement-architect. **Scope family:** D; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T01A.dependsOn` is empty; future implementation instruction is still required.
**Coverage:** AUTH-AC03, AUTH-AC20.

**Inputs:** AUTH-001 D01-D04 and required methods; current Identity facade anchors.
**Output:** Reviewed vendor/library feasibility and authority matrix with unresolved choices named.

1. Compare candidates against numeric codes, optional passwords, explicit linking, revocation, provider protocols and MFA; document supported missing-email continuation.
2. Record selected implementation authority and email/provider prerequisites, then obtain Backend/Security feasibility review.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a candidate supports every mandatory workflow, when selection is recorded, then each claim has an attributable feasibility reference and an identified owner.
- **Negative:** Given automatic email linking cannot be disabled, when evaluating that candidate, then it cannot pass selection.
- **Recovery:** Given a vendor prerequisite is unavailable, when handing off, then the decision remains unresolved and dependent implementation stays gated.

**Evidence:** Reviewed document/contract matrix and attributable source inspection; offline plan validation and mapped contract cases. Runtime groups (contracts) are future consumer checks, not evidence of documentation implementation.
**Preserve / non-goal:** No provisioning, installation, email sending or invented vendor approval.
**Stop:** Stop dependent selection work if vendor capability or material cost/region remains undecided.

<a id="auth-t01b"></a>

### AUTH-T01B: Freeze security policy and external decision gates

**Parent:** AUTH-T01. **Owner:** product-requirement-architect. **Scope family:** D; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T01B.dependsOn` (AUTH-T01A).
**Coverage:** AUTH-AC03, AUTH-AC20.

**Inputs:** T01A authority matrix; AUTH-001 D01-D08 and selected mechanism constraints.
**Output:** Versioned local implementation policy and explicit separate production/staging gates.

1. Resolve canonicalization, sessions, challenge budgets, staff MFA/bootstrap and manual-recovery policy needed by the first slice.
2. Record retention/residency, Terms, provider callbacks, budget and approved-ID decision owners; classify unresolved release-only gates without pretending they are approved.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an implementation-critical choice is settled, when freezing policy, then its value, owner and applicability are explicit.
- **Negative:** Given retention, spend or test-account claims lack approval, when documenting readiness, then they are not represented as authorized.
- **Recovery:** Given an unresolved production-only prerequisite, when continuing isolated design, then it remains a named release blocker rather than an invented implementation default.

**Evidence:** Reviewed document/contract matrix and attributable source inspection; offline plan validation and mapped contract cases. Runtime groups (contracts) are future consumer checks, not evidence of documentation implementation.
**Preserve / non-goal:** User-selected password, email code, Google and Facebook scope remains intact.
**Stop:** Stop affected implementation where unresolved policy changes persisted data, assurance or destructive scope.

<a id="auth-t02a"></a>

### AUTH-T02A: Freeze Identity DTOs, state transitions and persistence boundaries

**Parent:** AUTH-T02. **Owner:** product-requirement-architect. **Scope family:** D; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T02A.dependsOn` (AUTH-T01B).
**Coverage:** AUTH-AC01, AUTH-AC02, AUTH-AC05, AUTH-AC09, AUTH-AC12, AUTH-AC15.

**Inputs:** AUTH-001 through AUTH-004; T01 policy; existing routes, actor shape and provider authority.
**Output:** Versioned endpoint/context/operation contract and logical repository transaction map.

1. Specify purpose-safe nextAction/enrollment-offer exchange, security versions, non-enumerating errors, safe return and remembered-device propagation.
2. Freeze operation handle/read-only receipt issuance in the existing preparation/proof context before a session-revoking commit; define TTL/minimal result, terminal persistence/reconciliation and forced-revocation versus explicit logout/account-switch cleanup.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given valid entry proof, when evaluating its nextAction, then only the documented server-issued purpose transition is possible.
- **Negative:** Given a foreign or guessed operation ID, when requesting reconciliation, then account existence, secrets and other-owner results are not disclosed.
- **Recovery:** Given a mutation response is lost after session revocation, when its valid restricted operation receipt is used, then only that operation's bounded result is recoverable.

**Evidence:** Reviewed document/contract matrix and attributable source inspection; offline plan validation and mapped contract cases. Runtime groups (contracts) are future consumer checks, not evidence of documentation implementation.
**Preserve / non-goal:** Preserve /api/me preferences, owning capability facades and provider-owned secrets.
**Stop:** Stop if operation authority/TTL or upstream DB transaction ownership is unspecified; no arbitrary public status endpoint.

<a id="auth-t02b"></a>

### AUTH-T02B: Freeze reviewed interaction and preservation contracts

**Parent:** AUTH-T02. **Owner:** product-requirement-architect. **Scope family:** D; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T02B.dependsOn` (AUTH-T02A).
**Coverage:** AUTH-AC16, AUTH-AC17, AUTH-AC18.

**Inputs:** Latest AUTH-005 UX corrections, T02A DTOs and existing AccountMenu/preferences behavior.
**Output:** Screen/state/form matrix and acceptance traceability for entry, security and interruptions.

1. Map every route, primary action, code/password field rule, async result, MFA state and neutral reset exit to server outcomes.
2. Record same-actor in-memory restoration, redirect-loss warning, supported viewports/locales/themes and sibling-preservation assertions; obtain UX review.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given reviewed screen requirements, when task contracts are frozen, then every success, error, expired and pending state has an actionable destination.
- **Negative:** Given a registration-existing or unknown-email login handoff, when specifying UI, then no client field can widen the proof's purpose.
- **Recovery:** Given popup failure or an uncertain mutation result, when specifying recovery, then warning/cancel or authorized reconciliation replaces silent loss/blind retry.

**Evidence:** Reviewed document/contract matrix and attributable source inspection; offline plan validation and mapped contract cases. Runtime groups (contracts) are future consumer checks, not evidence of documentation implementation.
**Preserve / non-goal:** Settings opens AccountPreferencesDialog; Profile, Credits, Admin, preferences and public browsing retain ownership.
**Stop:** Stop if a material flow differs from reviewed AUTH-005; resolve through Product/UX, not implementation guesswork.

<a id="auth-t03a"></a>

### AUTH-T03A: Bootstrap isolated authentication verification harness

**Parent:** AUTH-T03. **Owner:** backend-platform-architect. **Scope family:** H; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T03A.dependsOn` (AUTH-T02A).
**Coverage:** AUTH-AC15, AUTH-AC20.

**Inputs:** T02A contracts; completed Phase2-03 pool/transaction/migration foundation; explicitly disposable database.
**Output:** Selectable fail-fast runner with fake clock/mail/providers and fixture lifecycle.

1. Create contracts/persistence groups and fixture IDs with explicit disposable-target checks; reject default networking and runtime data roots.
2. Bound group timeouts and fixture cleanup; make missing prerequisites, unsupported groups and bare aggregate invocation fail clearly.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an explicitly disposable configured fixture target, when a supported group runs, then it reports actual assertions and cleans only owned fixture resources.
- **Negative:** Given live/unknown database targets or absent prerequisites, when the runner starts, then it fails before writes or network calls.
- **Recovery:** Given a fixture process fails, when cleanup runs, then only the process/resources created by that run are stopped or cleaned.

**Evidence:** `node scripts/verify-authentication.mjs --group contracts`; `node scripts/verify-authentication.mjs --group persistence`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Never restart existing workers, touch server/data records or send real email/provider requests.
**Stop:** Stop until Phase2-03 delivers reviewed DB foundation and disposable credentials via approved configuration.

<a id="auth-t03b"></a>

### AUTH-T03B: Implement Identity persistence and atomic constraints

**Parent:** AUTH-T03. **Owner:** backend-platform-architect. **Scope family:** R; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T03B.dependsOn` (AUTH-T03A).
**Coverage:** AUTH-AC01, AUTH-AC02, AUTH-AC15.

**Inputs:** T02A entity/transaction map; T03A fixture harness; Phase2-03 approved migration placement.
**Output:** Identity repository adapters, constraints and security-version/idempotency primitives.

1. Implement authoritative account/email/subject/credential/challenge/session/operation contracts without duplicating managed-provider secrets.
2. Exercise uniqueness, compare-and-swap security versions, changed-payload idempotency rejection, rollback and simultaneous writes through separate connections.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given concurrent same-email or provider-subject writes, when both commit, then only one durable identity binding succeeds.
- **Negative:** Given an idempotency key reused with changed payload or stale security version, when committing, then the repository rejects it without partial mutation.
- **Recovery:** Given a transaction aborts, when retried with the same valid operation, then one consistent result and no duplicate provision remain.

**Evidence:** `node scripts/verify-authentication.mjs --group persistence`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Internal user IDs remain stable; no financial grants, mock-user conversion or runtime JSON credentials.
**Stop:** Stop before DDL until Phase2-03 assigns exact migration files; narrow JSON scope first and never create a parallel migration framework.

<a id="auth-t03c"></a>

### AUTH-T03C: Persist security events, delivery work and reconciliation state

**Parent:** AUTH-T03. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T03C.dependsOn` (AUTH-T03D).
**Coverage:** AUTH-AC07, AUTH-AC15.

**Inputs:** T03B operation/idempotency repository; approved Audit public contract and durable adapter; D05 transient-payload policy.
**Output:** Identity-owned durable operation/outbox integration with sanitized Audit and retry states.

1. Implement pre-issued operation handles and pending/terminal outcomes persisted with the mutation commit or provider reconciliation; integrate deduplicated event/delivery work through Identity/Audit public contracts.
2. Inject provider/database and notification failures; prove safe retry, bounded payload retention and no secret-bearing diagnostics.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a committed identity mutation, when event/notification delivery succeeds twice, then deduplication yields one logical side effect.
- **Negative:** Given provider success followed by database failure, when inspecting account exposure, then unresolved state cannot grant access.
- **Recovery:** Given delivery or reconciliation resumes after interruption, when the worker retries, then it reaches the recorded result without repeating the identity mutation.

**Evidence:** `node scripts/verify-authentication.mjs --group persistence`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Audit never substitutes for authorization; no direct Support/Audit repository writes or unapproved OTP storage.
**Stop:** Stop if the required durable Audit adapter/public method or approved transient-payload policy is absent; return an upstream dependency.

<a id="auth-t04a"></a>

### AUTH-T04A: Implement purpose-bound challenges and shared attempt budgets

**Parent:** AUTH-T04. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T04A.dependsOn` (AUTH-T03C).
**Coverage:** AUTH-AC02, AUTH-AC05, AUTH-AC07.

**Inputs:** T02A challenge contract; T03 repositories; frozen D06 limits and digest authority.
**Output:** Atomic challenge issue/verify/consume lifecycle and cross-worker rate limits.

1. Bind challenge to purpose, browser/target and security version; implement expiry, supersession, attempt increments and generic public contexts.
2. Test fake-clock boundaries, parallel consumption, wrong-purpose/browser attempts and budgets that survive resend/new contexts.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a valid active bound code, when consumed concurrently, then exactly one caller receives its permitted next action.
- **Negative:** Given expired, wrong-purpose, foreign-browser or stale-version proof, when verified, then no action/session is granted.
- **Recovery:** Given repeated new challenges after failed verification, when retrying, then shared budgets still throttle without permanently locking the account.

**Evidence:** `node scripts/verify-authentication.mjs --group challenges`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No plaintext code logs/URLs or process-memory-only production authority.
**Stop:** Stop if managed-provider semantics cannot meet atomic purpose/attempt guarantees.

<a id="auth-t04b"></a>

### AUTH-T04B: Implement email delivery, resend and public challenge policy

**Parent:** AUTH-T04. **Owner:** backend-platform-architect. **Scope family:** IC; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T04B.dependsOn` (AUTH-T04A).
**Coverage:** AUTH-AC04, AUTH-AC05, AUTH-AC07.

**Inputs:** T04A lifecycle; selected mail adapter and sanitized public-config contract; fake mail.
**Output:** Purpose-specific templates, delivery states, resend/suppression handling and safe policy projection.

1. Implement localized templates, sender adapter and authenticated deduplicated delivery callbacks; expose configured method/password/challenge policy without secrets.
2. Exercise idempotent send, resend supersession, delayed callbacks, delivery failure, bounce and provider/global budgets using fake mail.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a repeated send idempotency key, when requests arrive concurrently, then only one logical email send is recorded.
- **Negative:** Given a consumed or superseded challenge, when a late delivery callback arrives, then its authority never revives.
- **Recovery:** Given accepted replacement delivery later fails, when the user retries, then safe recovery respects cooldown/budgets and never reactivates the old code.

**Evidence:** `node scripts/verify-authentication.mjs --group challenges`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Delivery acknowledgement never claims mailbox arrival; public responses remain non-enumerating.
**Stop:** Stop before any live send or provider registration; operational sender prerequisites belong to T17A.

<a id="auth-t05a"></a>

### AUTH-T05A: Implement session transport and owned session management

**Parent:** AUTH-T05. **Owner:** backend-platform-architect. **Scope family:** IC; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T05A.dependsOn` (AUTH-T03B).
**Coverage:** AUTH-AC02, AUTH-AC12.

**Inputs:** T02A session/CSRF contract; repository adapter; frozen D03/D06 deployment policy.
**Output:** Cookie/session lifecycle, owned list/revoke APIs and restricted-context separation.

1. Implement host-only protected cookies, CSRF/origin validation, login rotation, idle/absolute timeout, remember-device binding and capped session lists.
2. Implement current/other/all revocation with pagination and test expiry/fixation/revocation across isolated instances.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a valid active session, when an authorized request and later logout occur, then access works before revocation and fails afterward on every instance.
- **Negative:** Given reset/enrollment cookie, invalid CSRF or foreign session ID, when used for private access/revocation, then it grants no authority or owner detail.
- **Recovery:** Given repeated logout or loss of its response, when reconciling, then revocation stays idempotent and no extra session is created.

**Evidence:** `node scripts/verify-authentication.mjs --group sessions-authorization`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Background polling cannot extend sessions; worker system actors and accepted Jobs retain existing ownership.
**Stop:** Stop if deployment origins/cookie/CSRF decisions or authoritative revocation store are unresolved.

<a id="auth-t05b"></a>

### AUTH-T05B: Resolve real actors and enforce account status

**Parent:** AUTH-T05. **Owner:** backend-platform-architect. **Scope family:** M; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T05B.dependsOn` (AUTH-T05A, AUTH-T15A).
**Coverage:** AUTH-AC02, AUTH-AC12, AUTH-AC13.

**Inputs:** T15A route/status inventory; T05A session authority; existing AdminIdentityService and preferences contracts.
**Output:** Session-derived actor middleware and immediate status/grant revocation integration.

1. Map disabled/accountStatus/status consistently; resolve optional anonymous identity and protect inventoried private reads/writes.
2. Preserve /api/me authenticated DTO/null and preference ownership; connect guarded Admin restriction commands to security-version/session invalidation.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an active real session, when /api/me or own preferences is requested, then the existing owner DTO/policy is preserved.
- **Negative:** Given suspension/disable/closure or a revoked session, when any protected read/write follows, then access is denied without stale positive cache.
- **Recovery:** Given an authorized reinstatement, when the owner signs in again, then only a new valid session restores access; login never reinstates status.

**Evidence:** `node scripts/verify-authentication.mjs --group sessions-authorization`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Public Community stays anonymous; Admin approval/reason and resource checks remain authoritative.
**Stop:** Stop on unknown status mapping or unowned route; do not weaken private-route checks.

<a id="auth-t05c"></a>

### AUTH-T05C: Implement action assurance and operation-status authorization

**Parent:** AUTH-T05. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T05C.dependsOn` (AUTH-T04A, AUTH-T05A).
**Coverage:** AUTH-AC02, AUTH-AC09, AUTH-AC12, AUTH-AC15.

**Inputs:** T02A action/operation DTOs; T04A proof primitives; T05A session/context boundary.
**Output:** Action-bound assurance/security-version checks and authorized operation lookup facade.

1. Implement action/target/owner/version-bound grants through injectable primary/factor verifiers; production paths reject unavailable verification adapters.
2. Implement GET operation reconciliation for pre-issued owner/restricted receipts; forced mutation revocation permits bounded read-only lookup, while explicit logout/account switching clears receipts; test foreign/expired receipts and non-auth authority.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given fresh valid method proof for action A, when assurance is consumed for A on its bound target, then the authorized operation proceeds once.
- **Negative:** Given a foreign/expired operation receipt, stale action grant or required but incomplete MFA, when lookup/login/mutation is attempted, then lookup is non-disclosing and a receipt grants no authentication or mutation authority.
- **Recovery:** Given a committed mutation's response was lost, when its still-valid operation receipt is queried after session revocation, then only the sanitized recorded outcome is returned.

**Evidence:** `node scripts/verify-authentication.mjs --group sessions-authorization`; `node scripts/verify-authentication.mjs --group linking-recovery`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Proof adapters are internal to Identity; no generic account lookup, secret response or MFA bypass.
**Stop:** Stop if receipt lifetime/authority is unfrozen; T06-T09 wire real primary verifiers and T12 qualifies factors before sensitive consumers.

<a id="auth-t06a"></a>

### AUTH-T06A: Implement explicit verified enrollment and existing-account handoff

**Parent:** AUTH-T06. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T06A.dependsOn` (AUTH-T04B, AUTH-T05B, AUTH-T05C).
**Coverage:** AUTH-AC01, AUTH-AC02, AUTH-AC03, AUTH-AC07.

**Inputs:** Verified registration context, frozen Terms version and T05 session/assurance primitives.
**Output:** Idempotent enrollment completion with optional credential and purpose-safe existing-account result.

1. Implement verified-email/display-name/Terms completion and optional password validation; keep pending contexts unable to access private resources.
2. Recheck uniqueness/status at activation and issue only safe sign-in handoff for existing accounts; preserve baseline role and provider authority.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given fresh verified enrollment and explicit Terms acceptance, when completed twice, then one active account/session result is produced without bonuses or public publication.
- **Negative:** Given registration proof for an existing/non-active account or a concurrent email claim, when completed, then no password/name overwrite or normal login occurs.
- **Recovery:** Given incomplete or expired onboarding, when returning, then valid pending state resumes or proof safely restarts without duplicate users.

**Evidence:** `node scripts/verify-authentication.mjs --group passwords`; `node scripts/verify-authentication.mjs --group integration`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No required password for code/social accounts, no marketing preselection, no Creator/KYC side effects.
**Stop:** Stop if Terms version, provider credential authority or transactional activation contract is unresolved.

<a id="auth-t06b"></a>

### AUTH-T06B: Implement password policy and primary authentication

**Parent:** AUTH-T06. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T06B.dependsOn` (AUTH-T06A).
**Coverage:** AUTH-AC02, AUTH-AC04, AUTH-AC07.

**Inputs:** T06A optional-credential enrollment; selected password library/provider; T05C verifier interface.
**Output:** Password authentication verifier with generic errors and required-MFA restricted result.

1. Implement approved hashing/check/upgrade policy and rate-limit before expensive verification; never trim/truncate secrets.
2. Wire password login and enabled-method reauthentication; preserve server-bound remember-device choice and return restricted MFA context when required.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an active account and valid password, when login completes, then the normal policy or required-MFA pipeline is entered with the chosen session duration.
- **Negative:** Given unknown, wrong, absent-password or non-active credentials, when login fails, then public error shape does not reveal the account state.
- **Recovery:** Given valid legacy hash policy or transient provider failure, when retrying through the approved path, then upgrade/retry is safe and never logs credentials.

**Evidence:** `node scripts/verify-authentication.mjs --group passwords`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Passwords support paste/managers and optional absence; no periodic rotation or secret duplication.
**Stop:** Stop if password-policy/hash benchmark or managed credential ownership lacks Security review.

<a id="auth-t07a"></a>

### AUTH-T07A: Implement code login and explicit enrollment-offer exchange

**Parent:** AUTH-T07. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T07A.dependsOn` (AUTH-T06A).
**Coverage:** AUTH-AC01, AUTH-AC02, AUTH-AC05, AUTH-AC09.

**Inputs:** T04 login challenge; T06A enrollment service; T05C proof-verifier interface.
**Output:** Code-login verifier and restricted unknown-email registration-offer exchange.

1. Implement existing-account code authentication with unchanged credential and required-MFA routing.
2. For unknown email issue offer_registration; exchange only after explicit Create account for a registration-only context bound to email/browser/version.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given valid login code for an active account, when verified, then login/MFA proceeds and password state remains unchanged.
- **Negative:** Given a replayed/substituted enrollment offer, changed browser/purpose or concurrent email creation, when exchange/completion is attempted, then no proof promotion occurs and an existing account requires fresh enabled-method proof.
- **Recovery:** Given an unknown-email login offer, when explicitly accepted before expiry, then onboarding continues without a redundant code; expired/mismatched offers restart proof.

**Evidence:** `node scripts/verify-authentication.mjs --group challenges`; `node scripts/verify-authentication.mjs --group passwords`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Unknown-email login never silently signs up; Terms and uniqueness are rechecked before activation.
**Stop:** Stop if the selected provider cannot enforce the explicit restricted exchange.

<a id="auth-t07b"></a>

### AUTH-T07B: Implement reset-only password replacement

**Parent:** AUTH-T07. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T07B.dependsOn` (AUTH-T06B, AUTH-T07A).
**Coverage:** AUTH-AC02, AUTH-AC05, AUTH-AC09.

**Inputs:** T04 reset challenge, optional-credential policy, security versions and operation receipts.
**Output:** Single-use reset workflow with atomic password change and all-session revocation.

1. Implement generic request/verification and short-lived reset-only context; validate new password before consuming the grant.
2. Commit replacement/revocation/version update together; wire safe receipt reconciliation and notification retry without automatic login.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given valid reset-only proof for an existing credential, when reset succeeds, then all old sessions/reset grants fail and normal login is required.
- **Negative:** Given passwordless, blocked, wrong-purpose or stale proof, when reset is attempted, then it cannot create a credential, enroll, reactivate or bypass MFA.
- **Recovery:** Given policy mismatch or a lost success response, when correcting/reconciling, then valid proof is not wasted by validation and a completed reset cannot run twice.

**Evidence:** `node scripts/verify-authentication.mjs --group passwords`; `node scripts/verify-authentication.mjs --group linking-recovery`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Code-login remains a separate flow and does not change passwords.
**Stop:** Stop on any inability to atomically invalidate grants/sessions or safely reconcile a revoked-session result.

<a id="auth-t08a"></a>

### AUTH-T08A: Implement Google authentication protocol and email assurance

**Parent:** AUTH-T08. **Owner:** backend-platform-architect. **Scope family:** IC; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T08A.dependsOn` (AUTH-T07A).
**Coverage:** AUTH-AC02, AUTH-AC04, AUTH-AC06.

**Inputs:** T01 selected Google flow, exact redirect policy, primary-verifier contract and enrollment service.
**Output:** Google adapter with validated subject, callback replay controls and restricted completion states.

1. Implement exact supported protocol validation and server-bound state/nonce/CSRF/remember-device/return handling; wire reauthentication to the same verifier.
2. Distinguish linked return, new verified-email enrollment, untrusted-email proof and existing-email pending link; keep link completion gated to T10A.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a valid known Google subject, when callback completes, then the owning account enters the common session/MFA pipeline.
- **Negative:** Given wrong issuer/audience/signature/state, replay or matching email without existing-account proof, when callback is submitted, then it grants no account binding/access.
- **Recovery:** Given cancellation, outage or untrusted application email, when recovering, then the flow ends safely or resumes restricted email verification before activation.

**Evidence:** `node scripts/verify-authentication.mjs --group social`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No provider role/publication import, automatic email linking or token retention/logging.
**Stop:** Stop if callback/proof semantics differ from the frozen protocol; real provider execution belongs to T17A.

<a id="auth-t09a"></a>

### AUTH-T09A: Implement Facebook authentication and provider-event handling

**Parent:** AUTH-T09. **Owner:** backend-platform-architect. **Scope family:** IC; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T09A.dependsOn` (AUTH-T08A).
**Coverage:** AUTH-AC02, AUTH-AC04, AUTH-AC06.

**Inputs:** Facebook app-scope protocol, email-denial policy, T08 common provider contracts and D03 event policy.
**Output:** Facebook adapter, resumable missing-email enrollment and idempotent authenticated provider events.

1. Validate app-scoped subject/token with the actual provider protocol; support missing/denied email and explicit existing-account proof handoff.
2. Implement selected providers' authenticated deauthorization/event transport, affected-authority invalidation and approved deletion-obligation response without product-wide deletion.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a validated Facebook subject with completed application-email assurance, when onboarding completes, then one account uses the shared session/MFA policy.
- **Negative:** Given a foreign app token, fabricated subject or forged provider event, when processed, then no binding/session mutation occurs.
- **Recovery:** Given denied email or repeated valid deauthorization, when completing email proof/retrying the event, then enrollment stays restricted until proof and deauthorization applies once.

**Evidence:** `node scripts/verify-authentication.mjs --group social`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Do not interpret Facebook tokens as Google JWTs or convert provider deletion events into blanket product deletion.
**Stop:** Stop if provider event/deletion obligations are undefined; record launch gate without inventing retention/deletion approval.

<a id="auth-t10a"></a>

### AUTH-T10A: Implement both-side email and social method linking

**Parent:** AUTH-T10. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T10A.dependsOn` (AUTH-T05C, AUTH-T08A, AUTH-T09A, AUTH-T12B).
**Coverage:** AUTH-AC01, AUTH-AC02, AUTH-AC06, AUTH-AC08.

**Inputs:** Qualified primary/factor assurance, pending provider-link state and method uniqueness.
**Output:** Explicit authenticated link commands through the Identity facade.

1. Require fresh action-bound owner proof/MFA and independent proof of the new provider/email method; confirm exact target.
2. Consume proofs atomically with unique binding, security-version invalidation, idempotent event/notification and operation result.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given proof of the existing account and unbound new method, when linking is confirmed, then the original userId and owned work remain unchanged.
- **Negative:** Given subject already owned elsewhere, equal email alone or stale assurance, when linking is attempted, then no merge/transfer occurs.
- **Recovery:** Given callback or commit response repeats, when reconciling the original operation, then one method binding/result is returned.

**Evidence:** `node scripts/verify-authentication.mjs --group linking-recovery`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No duplicate provisioning, Credit grants, role changes or Support repository edits.
**Stop:** Stop if provider defaults auto-link by email or either proof is missing.

<a id="auth-t10b"></a>

### AUTH-T10B: Implement safe unlink and account security projection

**Parent:** AUTH-T10. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T10B.dependsOn` (AUTH-T10A).
**Coverage:** AUTH-AC01, AUTH-AC07, AUTH-AC08.

**Inputs:** T10A usable-method authority; current password/email/MFA/session metadata contracts.
**Output:** Sanitized /api/me/security projection and atomic method unlink.

1. Project verified application email, credential presence, provider availability/links and factor summaries without secrets.
2. Require fresh confirmed unlink; enforce at least one usable verified method atomically and invalidate affected sessions/pending grants.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given several usable methods, when one is safely unlinked, then security summary and affected-session policy reflect the committed result.
- **Negative:** Given simultaneous last-method removals or stale/unverified method badges, when commands commit, then at least one real usable method remains.
- **Recovery:** Given provider outage or lost unlink response, when refreshing/reconciling, then availability is distinct from binding and no blind second mutation occurs.

**Evidence:** `node scripts/verify-authentication.mjs --group linking-recovery`; `node scripts/verify-authentication.mjs --group persistence`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Factor/recovery removal is not ordinary unlink; internal userId and ownership remain stable.
**Stop:** Stop if usable-method rules or retained-current-session assurance is ambiguous.

<a id="auth-t11a"></a>

### AUTH-T11A: Implement authenticated password setup, change and removal

**Parent:** AUTH-T11. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T11A.dependsOn` (AUTH-T10B).
**Coverage:** AUTH-AC07, AUTH-AC08, AUTH-AC09, AUTH-AC12.

**Inputs:** T10B last-method contract, qualified action assurance and password policy.
**Output:** Optional-password management with version invalidation and session effects.

1. Implement add without old-password fiction, change with existing-method/MFA proof and removal through last-method protection.
2. Apply credential/security-version update, current rotation/other revocation, notifications and operation receipts; test change-versus-reset races.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given passwordless active account with fresh proof, when adding a valid password, then the credential is added without requiring an old password.
- **Negative:** Given stale reset grant or removal of the final usable method, when submitted after change/removal races, then the prohibited mutation fails.
- **Recovery:** Given change committed but response/notification failed, when reconciliation/retry occurs, then the credential changes once and durable notification retries safely.

**Evidence:** `node scripts/verify-authentication.mjs --group passwords`; `node scripts/verify-authentication.mjs --group linking-recovery`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Reported compromise revokes all; ordinary change preserves only freshly rotated current session.
**Stop:** Stop if fresh-proof verification or credential replacement cannot share security-version enforcement.

<a id="auth-t11b"></a>

### AUTH-T11B: Implement verified application-email replacement

**Parent:** AUTH-T11. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T11B.dependsOn` (AUTH-T11A).
**Coverage:** AUTH-AC02, AUTH-AC10, AUTH-AC12.

**Inputs:** Fresh existing-method/MFA assurance, email_change_new challenge and uniqueness/version repository.
**Output:** Pending email change, bound confirmation, revocation and notification/reconciliation.

1. Keep current email active while verifying the proposed address; bind code to owner/change and avoid indefinite reservation.
2. Commit unique verified binding, version/grant invalidation and all-session revocation; notify both addresses through retryable delivery.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given fresh owner proof and valid new-email code, when change commits, then social subjects/userId remain and normal login is required.
- **Negative:** Given collision, foreign change ID, stale code or simultaneous link/change, when committing, then the old valid ownership is never overwritten.
- **Recovery:** Given commit succeeded before the connection failed, when the restricted operation receipt is reconciled, then completion is known without replay; failed notifications retry separately.

**Evidence:** `node scripts/verify-authentication.mjs --group linking-recovery`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Provider email claims cannot overwrite application email; no wallet/ownership transfer.
**Stop:** Stop on unresolved closed-email reuse policy or unsafe post-revocation reconciliation.

<a id="auth-t11c"></a>

### AUTH-T11C: Implement bounded recovery-help integration

**Parent:** AUTH-T11. **Owner:** backend-platform-architect. **Scope family:** I; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T11C.dependsOn` (AUTH-T11B).
**Coverage:** AUTH-AC02, AUTH-AC11.

**Inputs:** D07 enabled/disabled policy and existing Support Case public methods.
**Output:** Rate-limited neutral recovery guidance/request boundary with no unapproved identity mutation.

1. Use approved minimal Support request contract or honest unavailable/manual-disabled guidance; retain safe alternative-method/provider-recovery help.
2. Require Case/reason/approval references for any approved future Identity recovery command; otherwise reject mutations and document upstream missing contracts.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given available approved help intake, when a request is accepted, then the caller receives a generic receipt without account details.
- **Negative:** Given absent D07 approval or Support-only ownership claim, when recovery mutation is requested, then identity/MFA remains unchanged.
- **Recovery:** Given Support unavailable or duplicate intake, when seeking help again, then safe guidance/deduplication avoids a dead control or disclosure.

**Evidence:** `node scripts/verify-authentication.mjs --group linking-recovery`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No identity-document collection, credential-repository editing, Credit grant or account merge.
**Stop:** Stop any ownership-changing recovery until evidence/operators/approval/retention policy and public command exist.

<a id="auth-t12a"></a>

### AUTH-T12A: Implement restricted MFA completion and replay controls

**Parent:** AUTH-T12. **Owner:** backend-platform-architect. **Scope family:** IC; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T12A.dependsOn` (AUTH-T05C, AUTH-T06B, AUTH-T07A, AUTH-T08A, AUTH-T09A).
**Coverage:** AUTH-AC02, AUTH-AC04, AUTH-AC11, AUTH-AC12.

**Inputs:** Selected D06 factor mechanism, all primary verifiers and security-version primitives.
**Output:** Common MFA completion gate with cross-context budgets and atomic factor/recovery-code replay rejection.

1. Wire every password/code/social primary result to the required factor gate before normal session issuance.
2. Implement server-time/skew limits, factor replay markers, recovery-code one-winner consumption and bounded shared throttles; preserve remember-device restrictions.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given valid primary proof and required factor, when factor confirmation succeeds, then the correct session policy is issued once.
- **Negative:** Given wrong/expired/replayed factor, parallel recovery-code use or stale security version, when verified, then no normal session/MFA downgrade occurs.
- **Recovery:** Given a new primary login after failed factors, when retrying, then cross-context budgets persist with bounded recovery rather than permanent lockout.

**Evidence:** `node scripts/verify-authentication.mjs --group mfa`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** Email code and ordinary social success never satisfy application MFA; production staff remains gated.
**Stop:** Stop if chosen mechanism cannot enforce required assurance and replay/budget policy.

<a id="auth-t12b"></a>

### AUTH-T12B: Implement protected MFA enrollment and management

**Parent:** AUTH-T12. **Owner:** backend-platform-architect. **Scope family:** IC; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T12B.dependsOn` (AUTH-T12A).
**Coverage:** AUTH-AC02, AUTH-AC11, AUTH-AC12.

**Inputs:** Approved D06 first-staff bootstrap and factor-management policy; T12A verifier.
**Output:** Restricted bootstrap, confirmed enrollment, replacement/removal and recovery-code rotation.

1. Implement first enrollment with approved bootstrap proof and no staff access before confirmation; later changes require stronger existing assurance/approved recovery.
2. Invalidate old factors/recovery codes/action contexts on rotation/change; revoke affected sessions and send deduplicated owner notifications.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given approved staff bootstrap proof, when setup is confirmed, then staff eligibility can proceed only through the selected factor policy.
- **Negative:** Given bootstrap without confirmation or email-only proof for removal, when requesting staff access/factor downgrade, then it is denied.
- **Recovery:** Given interrupted setup or recovery-code rotation, when resuming/reconciling, then only the valid current factor/codes remain authoritative and older contexts fail.

**Evidence:** `node scripts/verify-authentication.mjs --group mfa`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No role grant from domain/email; no circular demand for a nonexistent first factor.
**Stop:** Stop if D06 bootstrap/recovery policy or independent Security qualification is missing.

<a id="auth-t13a"></a>

### AUTH-T13A: Implement shared actor lifecycle, transport and route guards

**Parent:** AUTH-T13. **Owner:** frontend-engineer. **Scope family:** P; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T13A.dependsOn` (AUTH-T02B, AUTH-T05B, AUTH-T12B).
**Coverage:** AUTH-AC12, AUTH-AC13, AUTH-AC14, AUTH-AC17, AUTH-AC18.

**Inputs:** Frozen actor/null/error DTOs, real-session middleware and reviewed auth route metadata.
**Output:** Existing ActorProvider/apiClient extended for real sessions, no second actor store.

1. Handle resolving/anonymous/authenticated/expired/error actor states and nullable /api/me; decouple production refresh from mock-user listing.
2. Apply credentials/CSRF/error parity to apiRequest, apiRequestWithProgress and apiMediaBlob; register protected auth/security routes with no private flash.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given real authentication or anonymous /api/me null, when resolving actor, then the existing provider exposes the correct state and allowed routes.
- **Negative:** Given expired session or foreign mock header, when JSON/progress/Blob requests run, then each respects real authorization and never falls back to a demo actor.
- **Recovery:** Given transient connectivity failure, when identity is retried, then private presentation stays gated without falsely reporting account switch/logout.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`; `node scripts/verify-authentication.mjs --group sessions-authorization`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Existing shared query/persistence and transport owners remain canonical; no feature raw fetch/token store.
**Stop:** Stop if response schemas or exact shared-route owners differ from inventory; update contract before broad edits.

<a id="auth-t13b"></a>

### AUTH-T13B: Implement sign-in and provider-callback screens

**Parent:** AUTH-T13. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T13B.dependsOn` (AUTH-T13A, AUTH-T06B, AUTH-T07A, AUTH-T08A, AUTH-T09A).
**Coverage:** AUTH-AC04, AUTH-AC16, AUTH-AC18.

**Inputs:** AUTH-005 entry hierarchy, safe config, primary login/callback DTOs and shared actor lifecycle.
**Output:** Password/code/social entry and callback states with explicit remembered-device choice.

1. Build one primary password submit, separate code/provider actions and accessible password show/autocomplete/retention behavior; preserve entered email.
2. Implement pending/cancel/outage/callback and safe return states; honor server nextAction, MFA restriction and server-bound remember choice.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given enabled methods and valid login, when explicit submit completes, then the authorized next step/safe destination appears without resubmitting work.
- **Negative:** Given credential rejection, unsupported provider or unsafe return path, when rendered, then rejected secrets clear, unavailable methods hide and navigation stays safe.
- **Recovery:** Given popup blocked/cancelled or connectivity failure, when recovery is selected, then accessible retry/alternative/back ends the spinner without accidental account creation.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Primary/form/paste/password-manager behavior follows AUTH-005; MFA-required results cannot expose workspace before T14E.
**Stop:** Stop if real provider fallback contradicts reviewed draft-loss behavior; no live provider tests in this task.

<a id="auth-t13c"></a>

### AUTH-T13C: Implement verification and explicit signup completion screens

**Parent:** AUTH-T13. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T13C.dependsOn` (AUTH-T13B, AUTH-T06A).
**Coverage:** AUTH-AC01, AUTH-AC03, AUTH-AC05, AUTH-AC16.

**Inputs:** Purpose-safe nextAction/enrollment exchange, optional-password/Terms rules and code policy.
**Output:** Registration, code verification, social email completion and onboarding routes.

1. Implement semantic text code input with numeric keyboard, leading zeros, full paste and explicit single submit; resend clears obsolete code and email edit abandons context.
2. Render registration-existing handoff, OTP-new explicit Create account, missing social email proof and optional Set a password fields with required Terms.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given valid unknown-email proof, when Create account and Terms are explicitly accepted, then completion follows the authorized enrollment context.
- **Negative:** Given existing-email registration, changed local purpose or denied social email, when continuing, then UI requires the proper proof and never silently activates.
- **Recovery:** Given expiry/resend or password mismatch, when correcting, then email/safe route and allowed component-memory password persist appropriately while old proof/code is cleared.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** No extra marketing/profile form; authoritative social email avoids redundant verification; secrets never persist.
**Stop:** Stop if UI would need to infer account existence or promote proof client-side.

<a id="auth-t13d"></a>

### AUTH-T13D: Implement reset and neutral recovery-help screens

**Parent:** AUTH-T13. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T13D.dependsOn` (AUTH-T13C, AUTH-T07B, AUTH-T11C).
**Coverage:** AUTH-AC09, AUTH-AC11, AUTH-AC16.

**Inputs:** Reset-only endpoints, operation receipt contract and D07 recovery availability.
**Output:** Forgot/reset success/error/expiry screens and honest recovery-help entry.

1. Implement password-reset proof/new-password states with explicit all-session warning and no auto-login.
2. Expose unconditional code-login/back exits on every public reset state, preserve entered email and start a fresh login-purpose context; show real available help.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a successful reset, when confirmed, then normal login is offered and no authenticated workspace is opened automatically.
- **Negative:** Given unknown/passwordless/blocked account, when any reset response or error appears, then neutral exit/help treatment reveals no credential presence.
- **Recovery:** Given expired reset proof or unavailable help, when exiting/restarting, then local reset authority is discarded and the user has a usable code-login/back path.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Policy/mismatch retains generated password only in component memory; rejection/termination clears secrets.
**Stop:** Stop if help control has no approved destination or reset outcome cannot be reconciled safely.

<a id="auth-t13e"></a>

### AUTH-T13E: Implement session interruption, draft isolation and uncertain outcomes

**Parent:** AUTH-T13. **Owner:** frontend-engineer. **Scope family:** P; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T13E.dependsOn` (AUTH-T13D, AUTH-T05C).
**Coverage:** AUTH-AC16, AUTH-AC17, AUTH-AC18.

**Inputs:** Shared actor lifecycle, AUTH-005 draft policy, popup protocol and operation lookup.
**Output:** In-page reauthentication, bounded temporary actor buffer and cross-tab private cleanup.

1. Implement same-actor-only temporary memory restoration, logout/different-actor cleanup, late-response rejection and invalidation-only cross-tab signals.
2. Support in-page/popup proof and warned same-tab fallback; retain only bounded pre-issued reconciliation receipts across forced mutation revocation, clear them on explicit logout/account switching, and reconcile before another submit.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given actor A's unsaved temporary work and expiry, when A reauthenticates in-page/popup, then only permitted A work restores without submission.
- **Negative:** Given actor B, reload, logout, late response or browser Back, when the auth boundary changes, then A's private state cannot reappear.
- **Recovery:** Given blocked popup or lost mutation response, when recovering, then redirect warns of loss/cancel and operation reconciliation precedes any new submit.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`; `node scripts/verify-authentication.mjs --group integration`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Accepted Jobs continue under their owner; no automatic Generate, capture/refund, cancellation or durable prompt cache.
**Stop:** Stop if a provider requires destructive redirect without warning or a mutation lacks an owning reconciliation contract.

<a id="auth-t14a"></a>

### AUTH-T14A: Implement Account security sections and menu integration

**Parent:** AUTH-T14. **Owner:** frontend-engineer. **Scope family:** N; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T14A.dependsOn` (AUTH-T13E, AUTH-T10B, AUTH-T11B, AUTH-T12B).
**Coverage:** AUTH-AC16, AUTH-AC18.

**Inputs:** Reviewed security-summary DTO and current AccountMenu/AppShell/AccountPreferencesDialog tests.
**Output:** Security page shell with separate email/password/provider/MFA/session/help regions and dedicated menu action.

1. Compose accessible loading/error/anonymous guards and distinct sections backed by the canonical query/actor owner.
2. Add security/logout and guest actions without replacing Settings; assert existing Profile, Credits, Admin and preference behavior.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given authenticated account, when opening Account security, then all distinct authorized sections have clear loading/ready/error states.
- **Negative:** Given unresolved/anonymous identity, when security route is requested, then private details/actions never flash.
- **Recovery:** Given Settings or sibling navigation after auth integration, when selected, then AccountPreferencesDialog and its Credit-confirmation preference still work unchanged.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** No sibling redesign, shared polling/cache or changes to Credit consent workflow.
**Stop:** Stop if page integration requires removing/relocating an unrelated action or changing shared dialog contract.

<a id="auth-t14b"></a>

### AUTH-T14B: Implement password-management section

**Parent:** AUTH-T14. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T14B.dependsOn` (AUTH-T14A, AUTH-T11A).
**Coverage:** AUTH-AC07, AUTH-AC08, AUTH-AC09, AUTH-AC16.

**Inputs:** Credential-presence projection, action assurance and password command outcomes.
**Output:** Add/change/remove forms with local validation, session-effect warnings and safe async confirmation.

1. Render Add without old-password field for passwordless accounts; use correct password-manager semantics and local retention rules.
2. Implement fresh-proof/confirmation, duplicate prevention, inline pending/error and operation reconciliation; refresh summary only after known success.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given passwordless account and valid fresh proof, when adding a valid password, then success updates credential presence without an old-password demand.
- **Negative:** Given mismatch/policy error or last-method removal refusal, when submitting, then policy-local secrets retain only permitted component memory and no false success appears.
- **Recovery:** Given response loss or expired assurance, when recovering, then operation result is reconciled or fresh proof requested before another mutation.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Provider/email/MFA/session sections and current-session policy remain unchanged.
**Stop:** Stop if pending confirmation would close before outcome or secret retention differs from AUTH-005.

<a id="auth-t14c"></a>

### AUTH-T14C: Implement verified-email management section

**Parent:** AUTH-T14. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T14C.dependsOn` (AUTH-T14A, AUTH-T11B).
**Coverage:** AUTH-AC10, AUTH-AC16.

**Inputs:** Email-change proof/state/result contract and safe operation receipt.
**Output:** Clearly separated active/pending email flow with logout warning and known completion.

1. Render application email independently from provider claims and verify proposed new email under fresh existing proof.
2. Show collision/expiry/retry states and logout effect; reconcile lost commit response before reporting success or offering restart.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given verified new address and authorized change, when commit is acknowledged, then the UI explains completion and requires normal login.
- **Negative:** Given collision or foreign/stale change context, when confirmation fails, then active email remains displayed accurately and no merge is offered.
- **Recovery:** Given the session is revoked before response arrives, when the operation receipt is checked, then completion is shown only from authoritative result.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Social methods remain linked; notifications do not claim guaranteed arrival.
**Stop:** Stop if receipt expired/invalid; show safe sign-in/recheck instead of inferring mutation success.

<a id="auth-t14d"></a>

### AUTH-T14D: Implement provider and email-method management section

**Parent:** AUTH-T14. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T14D.dependsOn` (AUTH-T14A, AUTH-T10B).
**Coverage:** AUTH-AC06, AUTH-AC08, AUTH-AC16.

**Inputs:** Usable-method summary, configured/down provider states and link/unlink commands.
**Output:** Explicit link/unlink journeys with both-side proof and remaining-method confirmation.

1. Distinguish linked/unlinked/unconfigured/temporarily-down states and display remaining usable methods before removal.
2. Implement fresh proof, provider return/cancel/conflict and async confirmation/reconciliation without replacing another account.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an available unlinked method and completed owner/new-method proof, when confirmed, then the linked summary updates after known success.
- **Negative:** Given last usable method or foreign subject, when removal/link is attempted, then safe refusal exposes no other-owner data.
- **Recovery:** Given provider cancellation/outage or lost unlink response, when returning, then bindings remain authoritative and recovery does not blindly repeat the mutation.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** Security email/password/MFA regions remain separate; no automatic merge or profile publication.
**Stop:** Stop if availability is mistaken for proof/binding or the provider callback loses its original action context.

<a id="auth-t14e"></a>

### AUTH-T14E: Implement complete MFA authentication and management screens

**Parent:** AUTH-T14. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T14E.dependsOn` (AUTH-T14A, AUTH-T12B).
**Coverage:** AUTH-AC04, AUTH-AC11, AUTH-AC16.

**Inputs:** Selected factor/bootstrap/recovery policy, restricted MFA contexts and management DTOs.
**Output:** Factor challenge, bootstrap/setup/confirmation and recovery-code/rotation/replacement/removal screens.

1. Build restricted challenge and approved alternate/recovery-code entry with invalid/expired/throttled/cancelled/help states.
2. Build first enrollment and management journeys with one-time transient recovery-code presentation, approved copy/download/acknowledgement and fresh-proof confirmations.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given required MFA and valid factor, when confirmation completes, then access proceeds only after server-authorized session issuance.
- **Negative:** Given email-only bypass attempt, unconfirmed staff bootstrap or stale recovery code, when continuing, then no workspace or weakened factor state appears.
- **Recovery:** Given interrupted enrollment, unavailable recovery or lost rotation response, when recovering, then safe restart/reconciliation preserves only current authoritative factor state.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`; `node scripts/verify-authentication.mjs --group mfa`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** No recovery secret in telemetry/durable browser storage; no factor enrollment requirement that assumes an existing first factor.
**Stop:** Stop if D06 does not define secret-display/copy/download or recovery policy; do not invent weaker fallback.

<a id="auth-t14f"></a>

### AUTH-T14F: Implement device-session list and revocation screens

**Parent:** AUTH-T14. **Owner:** frontend-engineer. **Scope family:** U; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T14F.dependsOn` (AUTH-T14A, AUTH-T05A).
**Coverage:** AUTH-AC12, AUTH-AC16, AUTH-AC17.

**Inputs:** Bounded session DTO/cursor and current/other/all revocation policy.
**Output:** Accessible paginated device list and clear per-device/all-session confirmations.

1. Display sanitized device labels/current marker and bounded pagination; label sign-out scope accurately.
2. Keep confirmation pending until known result; reconcile list after remote revoke and clear all private tabs when current/all sessions end.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given a selected other device, when revocation succeeds, then its session disappears while the current session stays valid.
- **Negative:** Given unknown/foreign ID or repeated clicks, when revoking, then no owner data leaks and one intended operation occurs.
- **Recovery:** Given connection loss during sign-out-all, when identity/list is re-resolved, then current/private state clears according to actual revocation without false success.

**Evidence:** `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; apply all common frontend checks and visual evidence.
**Preserve / non-goal:** No precise location/token display; existing preferences and owned Jobs are unaffected.
**Stop:** Stop if UI cannot distinguish sign out this device from all devices or hides failed revocation.

<a id="auth-t15a"></a>

### AUTH-T15A: Inventory private surfaces and bounded cutover files

**Parent:** AUTH-T15. **Owner:** backend-platform-architect. **Scope family:** D; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T15A.dependsOn` (AUTH-T02A).
**Coverage:** AUTH-AC13, AUTH-AC14, AUTH-AC15.

**Inputs:** Current real/mock actor consumers, media/static/download/progress paths and Phase2-03 ownership.
**Output:** Read-only route/consumer/status matrix with exact edit owners/files and approved-ID questions.

1. Trace public versus private reads/writes/assets/streams/Admin and JSON/progress/Blob transport consumers; map actor/resource checks and current status semantics.
2. Assign exact affected middleware/routes/Asset facade files, regression fixtures and additive rollout/rollback boundaries; identify unapproved mock-ID claims.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given every inventoried surface, when the matrix is reviewed, then its public/private rule, owner and verification case are explicit.
- **Negative:** Given static media or legacy mock query credential, when tracing access, then it cannot be omitted because normal API routes are protected.
- **Recovery:** Given unknown ownership or stale path, when reconciling inventory, then current canonical owner is identified or dependent cutover stays gated.

**Evidence:** Reviewed document/contract matrix and attributable source inspection; offline plan validation and mapped contract cases. Runtime groups (contracts) are future consumer checks, not evidence of documentation implementation.
**Preserve / non-goal:** Source inspection only; no private-media policy redesign, live migration or automatic demo-account claims.
**Stop:** Stop dispatch of T05B/T15B/T15C until their exact file inventory and ownership are reviewed; inventory may begin before UI work.

<a id="auth-t15b"></a>

### AUTH-T15B: Enforce production mock exclusion and fail-closed cutover

**Parent:** AUTH-T15. **Owner:** backend-platform-architect. **Scope family:** C; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T15B.dependsOn` (AUTH-T15A, AUTH-T05B, AUTH-T13A).
**Coverage:** AUTH-AC02, AUTH-AC14, AUTH-AC15.

**Inputs:** T15A exact inventory, real middleware/transport, D08 approved ID mapping if any.
**Output:** Production identity gating, isolated mock-mode separation and reviewable secure rollback.

1. Replace production mock credential/fallback acceptance in inventoried composition/config/middleware; retain explicit isolated development fixture mode.
2. Exercise missing DB/keys, valid/invalid/absent mock header/query IDs, real-session precedence and compatible rollback with disposable fixtures.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given production configuration and a valid real session, when mock IDs differ, then real actor ownership alone applies.
- **Negative:** Given no real session, any mock credential or missing required production infrastructure, when private access starts, then it fails closed.
- **Recovery:** Given login/method rollout is disabled or rolled back, when access is retried, then no demo/JSON/anonymous fallback becomes available.

**Evidence:** `node scripts/verify-authentication.mjs --group sessions-authorization`; `node scripts/verify-authentication.mjs --group integration`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No live ID claims, copied staff/Credit seeds or changes to unrelated capability data.
**Stop:** Stop before edits until inventory narrows task writeScope to exact files; migrations/claims require separate approved mapping and scope.

<a id="auth-t15c"></a>

### AUTH-T15C: Close inventoried private API and media authorization gaps

**Parent:** AUTH-T15. **Owner:** backend-platform-architect. **Scope family:** C; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T15C.dependsOn` (AUTH-T15B).
**Coverage:** AUTH-AC13, AUTH-AC14, AUTH-AC18.

**Inputs:** T15A exact private-surface matrix, T15B real identity gate and existing Asset/source facades.
**Output:** Owner-enforced private reads/writes/downloads/static outputs/thumbnails/streams.

1. Route inventoried private media/access through existing owning authorization facade or approved scoped capability; remove mock query credentials as proof.
2. Run anonymous, wrong-owner, suspended, revoked and public-snapshot fixtures for each inventory row; update exact consumers without broad route refactor.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an authorized owner session, when requesting each private API/media surface, then existing result behavior remains available.
- **Negative:** Given anonymous/wrong-owner/revoked session and direct file/stream URL, when accessed, then no bypass exposes private content.
- **Recovery:** Given an explicitly public Community snapshot after cutover, when requested anonymously, then its existing sanitized publication remains accessible.

**Evidence:** `node scripts/verify-authentication.mjs --group sessions-authorization`; `node scripts/verify-authentication.mjs --group integration`. Retain raw output, fixture configuration and scenario results; cross-instance/race tests where the packet changes authority or atomic state.
**Preserve / non-goal:** No new media owner, broad migration, Generation lifecycle change or financial mutation.
**Stop:** Stop if inventory crosses an unapproved capability boundary; assign a bounded owning task instead of editing arbitrary route folders.

<a id="auth-t16a"></a>

### AUTH-T16A: Complete isolated acceptance integration and aggregate checks

**Parent:** AUTH-T16. **Owner:** qa-release-engineer. **Scope family:** Q; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T16A.dependsOn` (AUTH-T07B, AUTH-T11C, AUTH-T13E, AUTH-T14B, AUTH-T14C, AUTH-T14D, AUTH-T14E, AUTH-T14F, AUTH-T15C, AUTH-T19B).
**Coverage:** AUTH-AC01, AUTH-AC02, AUTH-AC03, AUTH-AC04, AUTH-AC05, AUTH-AC06, AUTH-AC07, AUTH-AC08, AUTH-AC09, AUTH-AC10, AUTH-AC11, AUTH-AC12, AUTH-AC13, AUTH-AC14, AUTH-AC15, AUTH-AC16, AUTH-AC17, AUTH-AC18, AUTH-AC21, AUTH-AC22, AUTH-AC23.

**Inputs:** All dependency raw focused results and implemented runner groups; disposable fixtures and browser harness.
**Output:** Executed acceptance-to-evidence matrix and explicit aggregate verdict, not implementation fixes.

1. Trace each AUTH acceptance and UX correction to raw tests; add missing adversarial integration fixtures within test-only scope.
2. Run the explicit aggregate with missing-prerequisite/live-network guards; record failures without weakening criteria or marking incomplete groups passed.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given completed focused groups and isolated prerequisites, when explicit aggregate runs, then every AC01-AC18 and AC21-AC23 scenario maps to actual raw results.
- **Negative:** Given unsupported group, production target, missing fixture or network escape, when execution starts, then the runner fails rather than passing/skipping.
- **Recovery:** Given failed integration assertion, when handing off, then the defect returns to its implementation owner and affected acceptance stays failed/pending.

**Evidence:** `node scripts/verify-authentication.mjs --group integration`; `node scripts/verify-authentication.mjs --all`. Retain raw output, fixture configuration and scenario results; test-only scope and distinct independent QA peer review apply.
**Preserve / non-goal:** QA edits tests/runner/evidence only; no application fix hidden in review scope.
**Stop:** Stop live/paid/destructive execution; independent QA peer plus Security/UX must review raw evidence before closure.

<a id="auth-t16b"></a>

### AUTH-T16B: Verify adjacent workflows and authentication-boundary regressions

**Parent:** AUTH-T16. **Owner:** qa-release-engineer. **Scope family:** Q; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T16B.dependsOn` (AUTH-T16A).
**Coverage:** AUTH-AC13, AUTH-AC17, AUTH-AC18.

**Inputs:** T16A results, existing AccountMenu/preferences/actor persistence tests and Generation/Assets public contracts.
**Output:** Cross-capability regression evidence without changed workflow ownership.

1. Exercise settings/profile/Credits/Admin/public browse, actor-scoped drafts, media ownership and multi-tab/late-response/back behavior.
2. Interrupt accepted and outcome-unknown Generation requests at auth boundaries; use existing status/idempotency contract and assert no automatic resubmit/cancel/settlement side effect.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given an accepted owned Job during session expiry, when the same actor returns, then status/result resumes through the existing workflow without a new Job.
- **Negative:** Given another actor or late prior response, when navigation/cache refresh occurs, then no prior private draft/output is exposed.
- **Recovery:** Given uncertain submission outcome, when authentication resumes, then the owning workflow reconciles status before an explicit further action; no automatic billable retry occurs.

**Evidence:** `node scripts/verify-authentication.mjs --group integration`; `node scripts/verify-authentication.mjs --group ui`. Retain raw output, fixture configuration and scenario results; test-only scope and distinct independent QA peer review apply.
**Preserve / non-goal:** Settings still restores Credit confirmation; no real Credits/provider operations or repository bypass.
**Stop:** Stop if a discovered issue requires Generation/Credits behavior change; return separate owning scope and mandatory reviews.

<a id="auth-t17a"></a>

### AUTH-T17A: Qualify controlled staging email and provider behavior

**Parent:** AUTH-T17. **Owner:** user-journey-tester. **Scope family:** LIVE; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T17A.dependsOn` (AUTH-T16B).
**Coverage:** AUTH-AC04, AUTH-AC06, AUTH-AC19.

**Inputs:** Explicit staging/send/test-account authorization, approved budget, TLS/origins, isolated DB/mailboxes and configured provider apps.
**Output:** Redacted real delivery/provider qualification results and outstanding external gates.

1. Verify actual email sender/delivery and Google/Facebook new/returning/cancel/denied-email flows with controlled accounts.
2. Qualify callback/deauthorization and current provider app/privacy/deletion obligations; record correlation IDs and failures without secrets.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given authorized controlled staging prerequisites, when real provider/email flows run, then actual end-to-end results demonstrate AC19.
- **Negative:** Given absent app approval, incorrect callback or unavailable send authorization, when qualifying, then the case remains blocked rather than inferred from mocks.
- **Recovery:** Given provider outage/cancel/late mail, when using recovery, then the account remains consistent and safe retry is demonstrated within budget.

**Evidence:** Redacted manual staging results, screenshots/accessibility notes and correlation IDs; Lead records actual results. No mocks substitute for AC19.
**Preserve / non-goal:** No production accounts, broad deletion, paid generation or uncontrolled email recipients.
**Stop:** Stop immediately outside authorized environment/budget; missing credentials are supplied through secret management, never chat.

<a id="auth-t17b"></a>

### AUTH-T17B: Qualify responsive and accessibility user journeys

**Parent:** AUTH-T17. **Owner:** user-journey-tester. **Scope family:** LIVE; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T17B.dependsOn` (AUTH-T17A).
**Coverage:** AUTH-AC16, AUTH-AC17, AUTH-AC18, AUTH-AC19.

**Inputs:** T17A working staged methods; AUTH-005 state matrix and controlled browser/account fixtures.
**Output:** Redacted manual journey evidence across supported viewports/themes/locales and input methods.

1. Run new/returning enrollment, neutral passwordless reset exit, link/unlink/email/password/session/MFA journeys at 390, 768/820 and 1440 widths.
2. Verify keyboard/screen-reader/password-manager/code-paste, long text, cross-tab same/different actor and warned redirect-loss paths; record device/browser limits.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given supported viewport/theme/locale, when completing each auth/security journey, then controls, errors and primary actions remain readable and operable.
- **Negative:** Given throttled/expired code, unconfirmed MFA, actor mismatch or revoked device, when continuing, then the user receives safe recovery without private flash.
- **Recovery:** Given popup blocked, network interruption or uncertain mutation, when recovering manually, then loss warnings/reconciliation and sibling workflows behave as specified.

**Evidence:** Redacted manual staging results, screenshots/accessibility notes and correlation IDs; Lead records actual results. No mocks substitute for AC19.
**Preserve / non-goal:** No secret-bearing screenshots; all untested browsers/viewports remain explicit gaps.
**Stop:** Stop before claiming visual/accessibility completion if any required state or viewport lacks evidence; Lead records results.

<a id="auth-t18a"></a>

### AUTH-T18A: Review readiness and controlled rollout handoff

**Parent:** AUTH-T18. **Owner:** product-requirement-architect. **Scope family:** DM; exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T18A.dependsOn` (AUTH-T17B).
**Coverage:** AUTH-AC19, AUTH-AC20.

**Inputs:** All acceptance/reviewer evidence, D01-D08 decisions, external provider/retention gates and secure rollback rehearsal.
**Output:** Concrete launch readiness verdict and separate controlled rollout proposal.

1. Reconcile every acceptance/open decision with independent Security/QA and UX evidence; confirm durable audit/cleanup, provider prerequisites and unaffected commercial gates.
2. Prepare rollout/rollback ownership, monitoring and remaining limitations; update only relevant requirement/architecture rows with actual implemented boundaries.
3. Run the evidence checks below; return unresolved cases and scoped handoff under the common contract.

- **Success:** Given complete passing evidence and resolved release prerequisites, when readiness is reviewed, then the verdict names exact supported scope and review references.
- **Negative:** Given missing live qualification, retention decision or security acceptance, when closure is requested, then affected release stays blocked and implementation is not overstated.
- **Recovery:** Given rollback rehearsal, when login/methods are disabled, then owned data stays intact and mock production identity never returns.

**Evidence:** Reviewed document/contract matrix and attributable source inspection; all dependency raw evidence and independent readiness verdicts. Runtime groups (readiness) are future consumer checks, not evidence of documentation implementation.
**Preserve / non-goal:** No deployment, live migration, account claim, data deletion or paid workflow is authorized by this review.
**Stop:** Stop at the reviewable handoff; production execution needs the separately authorized scope and current prerequisite checks.

<a id="auth-t19a"></a>

### AUTH-T19A: Implement isolated local Login override policy and actor resolution

**Parent:** AUTH-T19. **Owner:** backend-platform-architect. **Scope:** Exact paths/reviewers in JSON; AUTH-009 owns the exception.
**Dependencies:** JSON `AUTH-T19A.dependsOn` (AUTH-T02A, AUTH-T05B).
**Coverage:** AUTH-AC14, AUTH-AC21, AUTH-AC22.

**Inputs:** T02A mode contract, T05B actor middleware and AUTH-009 configuration/fixture rules.
**Output:** One server toggle with qualified local fixture resolution and fail-closed startup/request behavior.

1. Freeze AUTH-009 config, isolated data/fixture designation, API mode schema and pre-composition validation; document one-toggle restart instructions in .env.example with default false.
2. Implement server-owned fixture resolution and local request validation through Identity; gate startup hooks via existing composition owners and deny real authentication/security mutations in this mode.
3. Extend development-bypass runner tests for config matrix, startup side effects, hostile requests, status/ownership, cookies and off/restart; leave live .env and runtime records untouched.

- **Success:** Given exact true and qualified isolated local development, when startup and requests resolve identity, then the fixed active baseline fixture enters without credentials while ownership and CSRF remain enforced.
- **Negative:** Given unsafe environment, binding, data target, config, request or fixture, when enabling bypass, then startup or request fails closed before unauthorized access or live startup side effects.
- **Recovery:** Given bypass is disabled and the server restarts, when old fixture headers, mode state or real cookies are presented, then only ordinary valid real-session checks can authorize private access.

**Evidence:** Future focused `node scripts/verify-authentication.mjs --group development-bypass` plus owning contract/UI checks and redacted local manual evidence; never live providers.
**Preserve / non-goal:** No real session assurance, staff elevation, paid dispatch, financial-rule changes or production-data access.
**Stop:** If positive fixture isolation or pre-startup gating cannot be established, stop and return the missing owning contract; do not broaden configuration or mutate live fixtures.

<a id="auth-t19b"></a>

### AUTH-T19B: Integrate development mode presentation and isolated transport transitions

**Parent:** AUTH-T19. **Owner:** frontend-engineer. **Scope:** Exact paths/reviewers in JSON; AUTH-009 owns the exception.
**Dependencies:** JSON `AUTH-T19B.dependsOn` (AUTH-T19A, AUTH-T13A).
**Coverage:** AUTH-AC16, AUTH-AC17, AUTH-AC18, AUTH-AC21, AUTH-AC22, AUTH-AC23.

**Inputs:** T19A mode contract and fixture endpoint, T13A shared actor/transport lifecycle, AUTH-005/009 UI rules.
**Output:** Clear development entry and mode transitions across existing shared owners, with isolated local proxy and regression evidence.

1. Reuse ActorProvider, API and persistence owners; server mode drives routing and mode-plus-actor namespaces, with bounded loading/error/retry states.
2. Reuse AccountMenu/AppShell for localized fixture identity and bypass label, disable misleading Login/Logout/security actions and show off/restart guidance; preserve sibling actions.
3. Qualify the selected loopback-only local Vite topology and Host/Origin checks; test all transports, cross-tab/late responses and responsive/theme/locale behavior using isolated fixtures.

- **Success:** Given the server confirms eligible development mode, when opening a permitted workspace through JSON, progress or Blob transports, then the fixed fixture and visible localized bypass label agree without a Login prompt.
- **Negative:** Given unresolved mode, hostile local-proxy access or unavailable authentication actions, when rendering or requesting, then no client-only bypass, real security mutation or private-data flash occurs.
- **Recovery:** Given mode changes with equal or different actor IDs and late responses, when restarting off and refreshing across tabs, then mode-scoped caches and draft presentation clear before normal Identity resolves without transferring fixture work.

**Evidence:** Future focused `node scripts/verify-authentication.mjs --group development-bypass` plus owning contract/UI checks and redacted local manual evidence; never live providers.
**Preserve / non-goal:** Profile/Credits/Settings/navigation remain; no new actor store/polling or automatic billable action.
**Stop:** If a proxy exposes the fixture outside the qualified local boundary or any transport cannot invalidate mode authority, keep the mode unavailable and return the gap.

## 7. Audit Prerequisite Packet

<a id="auth-t03d"></a>

### AUTH-T03D: Provide Audit-owned transactional security events

**Parent:** AUTH-T03. **Owner:** backend-platform-architect. **Scope:** Exact paths/reviewers in JSON.
**Dependencies:** JSON `AUTH-T03D.dependsOn` (AUTH-T03B).
**Coverage:** AUTH-AC07, AUTH-AC15.

**Inputs:** T03B schema/transaction primitives, AUTH-011 Audit boundary and the
[Phase2-03 prerequisite](../database-foundation.md#bounded-audit-prerequisite-for-auth-t03c).
**Output:** Audit-owned SQL security events through its public service.

1. Add the explicit same-client Audit method and SQL security adapter/migration; preserve existing JSON record callers and reject unavailable SQL authority.
2. Enforce append-only, stable-ID deduplication, valid system/account actors, safe metadata and atomic rollback with Identity.
3. Extend isolated persistence checks and obtain Security/QA review before T03C.

- **Success:** Given an Identity transaction and sanitized security event, when both commit or roll back, then the Audit public contract shares that same atomic outcome.
- **Negative:** Given forbidden secret metadata, an invalid actor or a reused event ID with different payload, when recording, then the operation rejects without partial writes or secret-bearing errors.
- **Recovery:** Given an exact retry of a committed event, when recording through Audit again, then one logical event remains and existing JSON Audit callers retain their behavior.

**Evidence:** Focused persistence group and legacy Audit regression; retained raw output and independent review.
**Preserve / non-goal:** No direct Identity writes to Audit, financial Audit change, production retention/cleanup or broad Admin migration.
**Stop:** Missing transactional public contract or real-data policy blocks dependent T03C activation; no JSON durability substitution.

## 8. Documentation Verification Boundary

Authoring these packets supplied documentation, not runtime acceptance.
Structural plan/link checks remain separate from implementation verification.
Following the subsequent implementation instruction, actual source/test evidence
is recorded in AUTH-012 and the JSON task records as each task is reviewed.
Proposed tasks retain empty evidence/reviews until their work occurs; neither
this packet nor a completed predecessor establishes dependent behavior.
