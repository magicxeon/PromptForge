# AUTH-012 Incremental Implementation Evidence

### Customer Login source milestone — accepted 2026-10-12

Registration/email verification, password/OTP Login, explicit unknown-email
enrollment, forgot-access/reset, Google/Facebook callbacks and signup completion,
published legal links and received-only Facebook receipt are implemented through
the canonical Identity factory and application bootstrap. Native author-separated
Security/QA accepted T15C after correcting alternate username-only Job reads.
Actual createApp qualification passed seven tests (six scenarios and enclosing
test), wrapper one test; existing JobCenter/GenerationGroup regressions passed
13/13 under a separate confined fixture. Focused private-access aggregate passed
44/44 independently. Final React forms/ActorProvider/API checks passed 56/56.

Actual mounted HTTP covers OTP registration/Login/logout and preferences, exact
Origin/CSRF, cooldown429, original/thumbnail/poster/video/History media with
HEAD/Range/304, foreign/spoofed/ownerless History/status/JobCenter denial, initial
SSE owner denial and session revocation between frames, and sanitized published
Community visibility for guest/revoked sessions. The qualification found and fixed
cooldown errors previously projected as503, stable owner gaps in History/list/delete
and alternate Jobs/JobCenter, plus retired raw output/orphan static mounts.
No enqueue/provider/settlement work runs; the SSE fixture job lives only in memory.

The actual-app wrapper initializes temporary data/output paths before importing
private modules, excludes provider secrets, uses disposable random SQL schemas
and private mail fixtures, and denies external network/child processes. Node's JS
filesystem writes are limited to an owned temporary root. Trusted native addons
are enabled for existing imports; Node warns that `--allow-addons` can bypass its
permission model, so this is not a hardened native sandbox certification.
Owned test data/schema cleanup completed. No workspace runtime/.env/Git changes.

Native UX approved social/legal/receipt fixtures at390/768/1440; EN/TH92-key parity
passed. Not every inventoried route has positive runtime UAT. Live SMTP/provider
console callbacks, legal publication, production migration/configuration and
deployment remain unverified. T19B retains its conditional positive-progress/Blob
and two-tab/off-restart gaps; linking/account-security/staff MFA remain their
separate roadmap. The source milestone is not full AUTH-019 release readiness.
Setup and exact environment names: [AUTH-014](014-login-runtime-setup.md).
Final `node scripts/verify-authentication.mjs --login` passed exit0, all16 server
groups, against the owned disposable PostgreSQL target. Earlier aggregate runs
exposed stale reset/public-null and bootstrap/static-mount assertions; fixtures
were reconciled to the already accepted canonical behavior, without weakening
authorization checks. Focused reset10, cutover16 and development-bypass7 checks
passed; native author-separated Security/QA accepted the fixture deltas. Broader
`--all` remains intentionally incomplete.

Adjacent React EngineTargetPanel/Generation API checks passed28/28. The Generation
API fixture now explicitly publishes a resolved session before private requests;
application transport remains fail-closed while identity is unresolved.

### AUTH-T15G guarded stream delivery — accepted

Author-separated native Security/QA passed corrected focused stream/Cinematic
tests 22/22 and independent lifecycle probes 6/6. The review found and Root fixed
disconnect during initial Identity lookup and serialization failure leaving an
unfinished stream; regression checks now cover both. Every delivered frame has
fresh session validation. Queue bounds are 1MiB/32 waiting frames plus one active
frame of at most 1MiB; stalled drain closes after five seconds. Listener cleanup
uses the canonical handle and never cancels accepted work or changes settlement.
Actual private source/stream admission through createApp is final T15C.

### AUTH-T15B/H source gates — accepted

Native author-separated Security/QA passed bootstrap/mock/cutover/runtime 32/32
and public null-viewer plus adjacent Character/Community regressions 73/73.
An independent visibility probe verified anonymous direct unlisted access,
anonymous members-only denial, authenticated member access and retired-media
denial. Only public readers permit null; mutation/handoff/private candidates keep
actor assertions. Genuine runtime provenance and explicit recovery opt-in prevent
fixture/forged/closed composition from restarting billable work. Malformed cookies
and infrastructure failures deny; actual expired cookies allow fresh Login/public
null projection while private access denies. Full application output/stream
integration is T15C and was not qualified by these bounded source passes.

Native UX final legal/receipt delta PASS inspected all six Thai/Neon viewports and
verified 92-key EN/TH interpolation parity. Other theme/locale live renders and
actual screen-reader/password-manager interaction remain unverified.

### AUTH-T15F source-authorized private media — accepted

Native backend author and author-separated QA/Security reviewer passed the scoped
Assets/Generation transport. Independent isolated checks passed 34/34 including
binary owner/guest/wrong-owner/deletion checks, HEAD/Range/304, Windows junction
escape/traversal, descriptor pinning and between-chunk revocation. Exact recorded
URLs and stable source owner IDs authorize delivery; every 64KiB chunk revalidates.
New Generation completion records receive server-recorded ownerUserId only; Queue
settlement was source-reviewed and no worker/provider was executed. A broader
author normalization run observed unrelated Community template-version assertion
failure (`tmplv_spoofed` versus `tmplv_1`); no acceptance was weakened or unrelated
source changed. Final static-output removal and session integration remain T15C.

### Login legal documents and Facebook receipt UI delta

Registration 9 and receipt 3 focused tests passed. Author-separated native
Security/QA independently passed 27 checks including shared API/gate regressions
and EN/TH key/interpolation parity. Application TypeScript passed; scoped ESLint
has zero errors and two existing export warnings. Actual React/Chromium fixtures
at 390/768/1440 verified legal links and received-only acknowledgement with no
horizontal overflow; six PNGs are under `evidence/` as
`auth-t13c-legal-links-*` and `auth-t13b-facebook-receipt-*`. Root inspected mobile
consent and tablet receipt; final native UX delta review passed.
All API requests were intercepted into private fixtures and external requests
blocked. This verifies source UI, not live provider receipt/deletion processing.

### AUTH-T15D qualified runtime source — accepted

Native backend author and author-separated native QA/Security reviewer qualified
the canonical runtime factory, persistent separated keys, migration status-only
checks, bounded SMTP/provider/screening adapters and dispatcher lifecycle.
Independent checks passed 167/167: runtime 16 and unchanged owning regressions 151.
Google-only configuration without OTP delivery is rejected; twelve native fixture
Google logins verify the ten-session cap, old-session revocation, new-session
access and compiled revocation notices. No actual `.env`, workspace runtime data,
live SMTP/OAuth or paid providers were used. Security and QA roles were applied
sequentially by one author-separated reviewer. This closes T15D source only;
application cutover T15B/T15C and deployment inputs/live UAT remain separate.

## Login completion checkpoint (2026-10-11)

T15E native author-separated Security/QA passed: focused HTTP6/6 and independent
AUTH013 comparison50 public/optional expansions, allGET/HEAD allowed and POST
denied. Default private admission uses facade-issued actor proof, exact Origin/
CSRF for unsafe calls and sanitized denials. Reauthorization callback tested
after revocation; actual continuing-stream/source-media wiring remains T15C.

Final social UX native review passed all15 supplied screenshots and EN/TH86-key
parity. Reviewer found read-retry fetching feedback/duplicate guard; Root fixed
isFetching pending and deferred-response regression passed8/8. Author-separated
Security/QA then ran30/30 four form files and passed scoped delta. Connected
social browser, legal publication and full runtime remain distinct gates.

T09A independent native QA author-separated Security/QA review passed. Final
social group41/41 (Facebook24, Google17) and contracts22/22 passed. Durable
expected issuer_scope is immutable from start; foreign app pending reads/claims/
proofs deny. Facebook future timestamps deny before known-receipt lookup, while
the frozen exact known retry/24-hour TTL remains unchanged. Two new fixture
assertions were corrected to use trusted request-peer context and canonical
DatabaseError code/sqlState23514; no acceptance was weakened. Live provider
configuration and runtime deployment are unverified.

Root T13B social UI: four focused React files passed30/30 (Login7,
Registration8, Reset7, SocialCallback8). TypeScript app check passed after the
latest social remember/return-path changes. Scoped ESLint passed; EN/TH keys and
interpolation parity passed86 keys. Isolated intercepted Chromium captured
provider entry, missing-email, social signup completion, callback pending and
callback error at390/768/1440:15 PNGs under evidence/auth-t13b-social-*.png.
No horizontal overflow was measured. These are Thai/Momelo Neon fixtures;
other locale/theme visuals and connected social browser behavior remain gaps.

T19B independent Security source/HTTP review passed; QA remains conditional.
Actual Vite proxy qualification1/1 and bypass7/7 passed, but positive permitted
progress/Blob and two-tab/off-restart UI parity are unverified. T19B remains
review, not complete. No actual workspace .env or live data was changed.

Read-only runtime architecture review confirmed that server bootstrap still
selects unavailable composition when bypass is off. Fixture-only adapters cannot
activate real Login. AUTH-T15D now owns concrete qualified configuration/factory;
T15B/C own bootstrap/route/media cutover before full activation. Missing real
deployment credentials, sender/provider/legal/retention inputs and live UAT remain
explicit. Broader account-management/MFA packets remain open.

**Owner:** Lead; authoritative task status remains in task-plan.json.
**Boundary:** Isolated source/test evidence is distinct from live acceptance.

## AUTH-T03A: Isolated Harness

Implemented the selectable verification runner, fake clock/mail/provider adapters,
standard Node network restrictions, disposable-target validation and owned schema
cleanup. Contracts9/9 and actual disposable PostgreSQL persistence3/3 passed;
[raw output](evidence/auth-t03a.txt) retained. Reuses shared DB infrastructure;
no Identity schema or Login behavior is qualified by these bootstrap groups.

Security `/root/auth_decision_security` independently ran9/9 and confirmed the
Resolver-instance DNS gap correction. QA `/root/auth_requirement_qa_review`
independently ran9/9 and3/3, reviewed invalid-target rejection, owned cleanup and
sentinel preservation, and passed the task. No application/bootstrap/dotenv,
runtime JSON, existing worker or live email/provider was touched.

Network guard is cooperative test protection, not an OS security sandbox. A
forced process kill cannot guarantee JavaScript finally cleanup; disposable DB
isolation remains required. Missing/undelivered groups and incomplete `--all`
fail explicitly instead of reporting success. This is harness-only completion.
Source ownership is mapped in099. Remaining Auth tasks retain their own gates.

## AUTH-T03B: Identity Relational Primitives

Implemented 17 normalized Identity tables, explicit shared migration registration,
canonical-email/provider uniqueness, same-client repository mutations, guarded
security-version advancement and bounded non-secret idempotency outcomes.
Lead actual PostgreSQL persistence15/15 passed; [raw output](evidence/auth-t03b.txt).
No startup migration, mock conversion, application wiring or live records.

Initial independent Security and QA found missing link_email and contradictory
cross-account/context references; QA reproduced the invalid inserts on PostgreSQL.
Corrections add purpose mapping, immutable context/operation/child authority,
exact operation binding_context_id and account-result ownership constraints.
The final tests include 25 rejected authority updates, invalid scope inserts,
valid anonymous/account flows, concurrent unique winners, rollback/retry and
historical-version revocation. QA `/root/auth_requirement_qa_review` independently
passed15/15 persistence and9/9 harness contracts. Security
`/root/auth_decision_security` passed the final source/test scope, attributing
PostgreSQL execution to author/Lead/QA. A final transient-secret correction allows
only terminal erasure of OAuth verifier/nonce; early clearing, replacement and
restoration reject. QA independently reran15/15 after that delta, and Lead
refreshed the retained raw output. T03B is complete as persistence primitives.

These primitives do not qualify password/OTP/session/MFA/OAuth domain behavior.
T03C owns prepared receipts and delivery/reconciliation; future domain owners
compute keyed fingerprints and authorize mutations. No runtime Auth cutover.

## AUTH-T03D: Transactional Security Audit

Audit now owns a SQL security-event adapter/migration and public
`recordSecurityEvent(event, { transaction, actor, peerAddress })`. Explicit
`securityRepository`, 32-byte dedicated fingerprint key and key version are
required. Actors are `{type:'account', accountId}` for self-account events or
`{type:'system-security'}` for preauth fingerprints. Original peer fingerprints
may be reused for exact retries. Unknown/free-text/nested metadata rejects.
Legacy JSON `record()` retains its previous behavior; the new method never
falls back to it. SQL blocks UPDATE/DELETE/TRUNCATE and cascading account removal.

Lead passed18/18 shared DB contracts,11/11 Auth/legacy contracts and23/23 actual
PostgreSQL persistence; [raw persistence output](evidence/auth-t03d.txt). Security
found that separate database facades could nest and accept a borrowed transaction
handle. Root corrected shared current-transaction scope across facades and added
a two-facade regression, including valid independent concurrent transactions.
QA `/root/auth_requirement_qa_review` independently passed18/11/23 plus9 existing
Admin/Community regression tests under the offline guard. Security
`/root/auth_decision_security` reproduced the correction and reran18/18 database
contracts; it attributes PostgreSQL evidence to Lead/QA. Both passed the bounded
task. T03D is complete; T03C may integrate this public service.

No real-data retention/cleanup, deployment role grants, runtime startup integration
or Login qualification. The shared foundation's original16-test evidence remains
historical; the extra transaction-provenance coverage belongs to this task.

## AUTH-T03C: Prepared Operations And Delivery (Complete, 2026-10-11)

Internal operation/delivery services and additive Identity migration0003 are
implemented for isolated qualification. Lead latest checks passed13/13
contracts and45/45 PostgreSQL persistence; [raw output](evidence/auth-t03c.txt).
These passing tests do not close the task: independent Security reproduced
expiry-during-wait acceptance, sparse-array fingerprint collision, incomplete
durable social expiry cleanup and excess unresolved sends after timeout.
Those four findings were corrected; Security independently passed13/13 contracts
and its injected reproductions. QA independently passed13/13 contracts and43/43
PostgreSQL tests, then reproduced an additional dispatch expiry race: a timestamp
captured before an awaited eligibility query allowed a send1000ms after expiry.
Fresh-time checks after eligibility waits and immediately before dispatch now
cover delivery, lease, challenge and context deadlines. Lead also identified the
same wait pattern at acknowledgement; it now locks first and samples time before
checking its fence. Both have actual PostgreSQL regressions. Security passed the
delta with four independent offline deadline probes and an acknowledgement
lock-wait probe. Final independent QA `/root/auth_requirement_qa_review` reran
13/13 contracts and45/45 PostgreSQL persistence and reproduced zero sends after
expiry. Both reviewers passed the internal scope; T03C is complete. The 22
operation-test counts include idempotent mutation/Audit/logical delivery,
provider success followed by database failure without account exposure, and
durable interruption/reconciliation without repeating the mutation.

The concrete scope is private prepared-operation/receipt and delivery machinery,
not HTTP authentication. T05C must supply actual action-assurance/purpose-target
guards and session-authorized lookup. T04 must issue challenges and enqueue in
one transaction while retaining the pending challenge context. T08/T09 must
validate provider protocols. T11 must extend Audit's vocabulary for its new
password/email-management actions before wiring them. D02/D05 still block real
delivery/data activation; the delivery adapter currently accepts fixtures only.

## AUTH-T04A: Purpose-Bound Challenges (Complete, 2026-10-11)

Implemented internal issue/verification, strict email normalization, immutable
purpose/target/browser binding, atomic purpose-handler consumption and shared
SQL admission. Additive migration0004 records issue idempotency/target-key scope;
0001-0003 remain unchanged. Source/global verification admission commits before
binding resolution, followed by authorized target/account admission. Both survive
proof/handler failure; handler effects and consumption roll back together.

Lead passed15/15 actual PostgreSQL challenge tests; [raw output](evidence/auth-t04a.txt).
Author also passed15/15 contracts and45/45 affected persistence. Cases cover one
cross-instance winner, wrong purpose/browser, stale version, expiry after lock
wait, failed delivery, same-owner resend/supersession, atomic issue rollback,
counter persistence, key rotation, shared capacity and bounded cleanup. Lead's
email parser probe found URL-aware IDNA truncation; delimiters/percent/control
input now rejects and has regression coverage. Handler outcomes are allowlisted
by purpose, so incorrect registration-to-authenticate output also rolls back.

Security `/root/auth_decision_security` passed source review and independently
ran15/15 contracts; it attributes PostgreSQL evidence to Lead/author. QA
`/root/auth_requirement_qa_review` independently passed15/15 contracts and15/15
PostgreSQL challenges, mapped all three acceptance cases and passed. T04A is
complete. The architecture map now identifies implemented challenge/config owners.
No HTTP/session grant or normal Login has been implemented. T05 must persist
durable target/email and remembered-device authority before replacing the fixture
resolver. Delivery templates/callback/suppression belong to T04B; D02/D05 and live
qualification remain separate. No existing runtime records or application startup
were changed.

## AUTH-T04B: Local Mail And Delivery Events (Complete, 2026-10-11)

Inactive SMTP/MIME qualification, canonical flat English/Thai mail catalogs,
safe public-policy projection and additive migration0005 are implemented.
Verified event admission deduplicates provider-scope/event IDs, rejects changed
replays and records delivery observations without restoring OTP authority.
Suppression stores bounded recipient HMAC aliases across key versions, retaining
the first fixed24-hour expiry; missing historical keys fail closed. Explicit
cleanup is bounded and never starts an automatic worker.

Lead final checks passed19/19 contracts,28/28 PostgreSQL challenge/mail-event tests and45/45
affected persistence tests; [raw output](evidence/auth-t04b.txt). Catalog validation
initially rejected nested objects; the author changed them to the existing flat
key convention and Lead reran `npm.cmd run i18n:validate` successfully. Scoped
`git diff --check` passed. Independent Security reproduced a dispatch race:
an awaited suppression query could return an older false result after a bounce
had already failed the outbox, and the adapter still sent once. The correction
now combines delivery eligibility and suppression/key availability in the final
dispatch snapshot, after a separate row-lock statement. Quarantine is rechecked
after waits and immediately before dispatch. Both reviewers independently passed
the baseline19 contracts/25 PostgreSQL challenges and final28 challenge/45
persistence tests. Security's original probe now records zero sends; QA also
passed malformed-DTO, consumed-callback, notification/TLS and policy probes.
Security `/root/auth_mail_security_review` and QA `/root/auth_mail_qa_review`
passed the bounded source scope. T04B is complete. New regressions include
current/older-delivery callbacks during lookup, suppression during actual lock
wait and sibling timeout followed by real-promise settlement recovery.
The architecture map identifies the new private
mail/event/public-policy owners.

SMTP remains fixture-only with injected transport, `.invalid` recipients and
availability false. Real provider callback verification, sender configuration,
production retention and live qualification remain D02/D05/T17 work. No HTTP,
session, environment override or working Login is established by these checks.

## AUTH-T15A: Private-Surface Inventory (Complete, 2026-10-11)

[AUTH-013](013-private-surface-cutover-inventory.md) inventories31 registered route
modules/311 registration statements, explicit loop expansions/duplicates, static
media, downloads, HEAD/Range/304, native URLs and progress streams. It records
actor/status/mock/header/query/username gaps, all three browser transports,
public null-viewer adaptation gates, startup side effects and exact future scopes.
Current bootstrap dynamically imports composition after dotenv but before auth
qualification; earlier static-import assumptions are not current architecture.

Security `/root/auth_mail_security_review` and QA `/root/auth_mail_qa_review`
independently matched31/311 against current source with no omissions or incorrect
anchors. QA verified28 exact native consumers and87 existing qualified source/test
paths, and traced all three acceptance cases to the inventory's source matrices,
visibility/gap cases and scoped handoffs. Both passed the document scope.
Architecture map unchanged: this document stays inside the mapped auth boundary.
No runtime authorization, app startup, media exposure change, data claim or live
migration is established by this inventory. T05B/T15B/T15C must use its narrowed
file scopes and retain unknown-ownership/public-viewer gates.

## AUTH-T05A: Session/Context Primitives (Isolated Scope Complete)

Implemented durable browser records/encrypted purpose metadata and additive0006,
strict production/local cookie parsing and exact Origin/CSRF, private one-proof
transactional session issuance, server-bound remember/staff policy, expiry,
rotation, deterministic caps/atomic notifications, owned lists/revocation and
bounded logout retry tombstones. IdentityApplicationService and authRoutes exist
as private facade/unregistered thin handlers; createApp/bootstrap is unchanged.

Lead final groups passed14/14 sessions,20/20 contracts and45/45 affected
persistence. Raw evidence: [sessions](evidence/auth-t05a-sessions-authorization.txt),
[contracts](evidence/auth-t05a-contracts.txt), [persistence](evidence/auth-t05a-persistence.txt).
Both independent Security `/root/auth_mail_security_review` and QA
`/root/auth_mail_qa_review` passed14/14 sessions and20/20 contracts. Security
reproduced idle renewal crossing original expiry during an awaited write;
the author added original idle/absolute deadline checks afterward inside the
transaction. Actual PostgreSQL regression verifies rollback of timestamps;
authenticated revocation now has a final original-deadline guard too. QA also
passed metadata/AAD substitution, size, CSRF session/mode/generation isolation,
logout-only tombstone and exact Origin probes. All three task acceptance cases
are mapped to active-then-revoked resolution, restricted/foreign/CSRF denial and
idempotent logout/one-proof session issuance.

Architecture map identifies the implemented private session/context/facade and
SQL owners; no JSON/runtime data path or real migration. Creation currently
accepts account-bound login contexts with an injected durable fixture verifier.
Anonymous activation/MFA continuation, actual method verifiers and T04's private
post-commit cookie transport remain future integration, not working Login.
Captured handlers are not actual HTTP/browser qualification.

Both reviewers identified a mandatory integration gap: session_create,
session_revoke, logout and logout_all currently lack transactional Audit wiring.
It is assigned explicitly to T05B (including logout-owned transaction and
Audit-failure rollback) before runtime composition or Authentication closure.
Missing deployment/staff/real-retention qualification remains fail closed.

## AUTH-T05B Real Actor And Session Audit (Isolated Scope Complete)

SQL-derived real actors ignore browser mock selectors and return null for guests.
Preferences require the minted actor and recheck current session/status/version.
Session create/revoke/logout Audit is required in the same transaction with
socket-only AsyncLocalStorage peer identity; missing Audit/peer or Audit failure
denies/rolls back. Admin status uses the actual staff Audit actor and fingerprinted
target/reason, stable idempotency and version revocation. Reinstatement never
restores old sessions. Closed-account reopening is denied without approved policy.
All session-management authority uses the same role/MFA/bootstrap checks as actor
resolution, preserving the explicit logout-only tombstone exception.

Independent Security and QA (auth_mail_security_review/auth_mail_qa_review)
passed final contracts21/21, sessions17/17; QA additionally persistence45/45 and
existing preference tests8/8. Lead reran sessions17/17 after both Security fixes.
QA's extra probes covered immutable/cloned actor denial, stale preference writes
and concurrent socket-peer isolation. Test14 covers actor/null/preference success,
tests8/14/15 cover revoked/status/MFA denial and test15 covers reinstatement.
Migration0007 adds SQL preference/status-operation state through existing Identity
ownership; no real data migration or new JSON runtime path. Architecture map
updated. Runtime composition, private/media cutover and working Login remain
future tasks; no app startup, live email/provider or Git operation.

## AUTH-T19A Local Override Server (Isolated Scope Complete)

Strict server-only AUTH_DEV_BYPASS_ENABLED defaults false. Exact true requires
explicit development, loopback, a designated baseline fixture and positively
qualified isolated data/output target. Explicit setup creates a NEW
`.local-auth-fixture` tree with manifest and usr_auth_local; it neither copies
nor overwrites existing work. Bootstrap qualifies before capability imports.
Missing/false without real Identity composition uses a lightweight read-only
guest app, returning null actor/all unavailable methods/null CSRF and denying
private access; no legacy demo fallback or protected singleton import.

Independent Security/QA and Lead passed7/7 development-bypass tests. Security
found the original toggle-off path still imported Queue's immediate history
initializer against real paths; the new child-process bootstrap regression
prohibits protected imports and all filesystem mutation for missing/false.
Actual loopback HTTP fixtures cover local peer/Host/Origin, fixed identity,
CSRF/preferences, denied private/media/security actions and restart invalidation.
QA additionally passed18 offline boundary probes. Architecture ownership includes
the qualified development roots and lightweight unavailable composition.

Full true-mode app startup/browser is unverified. Current API admission is only
10 safe workspace reads plus own preference PATCH; other workspace/media/job/
paid/security operations are unavailable. Same-origin built server on
http://127.0.0.1:6500 only; Vite topology remains unqualified T19B. Full auth,
unrestricted workspace and production session restoration are not claimed.
No actual.env, existing JSON, live SMTP/provider, app worker or Git operation.

## AUTH-T06B Independent Password Prerequisite (Qualified; Task Incomplete)

Lead implemented a private fixture-only IdentityPasswordAdapter and explicit
offline native qualification. Exact Argon2id0.45.1 was installed with lifecycle
scripts disabled; its bundled Windows native binary worked. Creation preserves
Unicode/whitespace without normalization and requires explicit successful
screening. Only the reviewed bounded PHC19/64MiB/3/1 policy is accepted; invalid,
unknown or resource-excessive credentials execute a bounded dummy. Two process-
wide slots cover screening/native jobs without a queue and remain occupied until
actual settlement after timeout. No raw password/provider details are logged.

Lead passed6 functional tests plus1 native benchmark. Independent Security
`/root/auth_mail_security_review` and QA `/root/auth_mail_qa_review` each passed
the same7/7 offline tests and source review. QA also passed preparation, concurrent
prepare, unchanged screening/hash secret, hostile PHC/surrogate dummy and native
error probes. On Node22.22.3/Windows x64/i7-12700H, observed seven-sample hash+
verify median241..286ms and p95247..319ms. The two-job Argon memory bound is128MiB
per process, not total RSS or a production fleet budget. Benchmark values are
local observations rather than timing thresholds or account-enumeration claims.

New files stay in Identity's existing adapters, authentication tests and scripts
owners; architecture map unchanged. package.json/package-lock.json add only the
selected dependency. No runtime data path, application startup or Git operation.
 T05A's runner includes the separate offline passwords group; Lead ran it7/7.
T06B remains incomplete: enrollment/session integration, vetted production
compromised-password screening, approved legacy inventory/policy and actual Login
acceptance are still required. The adapter advertises availability false and
does not enable a real credential endpoint.

## AUTH-T13A Shared Frontend (Scoped Source And Review Complete)

The existing ActorProvider consumes nullable /api/me and versioned /api/auth/config;
cookie transport strips legacy actor selectors, uses canonical memory CSRF and
rejects stale JSON/Blob/SSE results. Focus/visibility and cross-tab invalidation
suspend private requests and hide/inert the last confirmed workspace. Same-owner
focus revalidation retains unsaved component state and existing Preferences;
confirmed actor/mode change, logout or error discards the workspace. Actor/mode
scopes separate cache keys, persisted drafts and handoffs. Guest discovery and
legacy public aliases retain routing; staff/auth/external return loops are denied.

Lead focused verification passed37/37 across8 frontend files, plus noEmit
TypeScript. Independent UX found and prompted fixes for focus draft loss, header
touch target and case-insensitive return loops; QA additionally identified header
portal suspension. Final independent Security/QA/UX closure is still pending.
Playwright against loopback frontend with fully intercepted fixture APIs inspected
guest and bypass layouts at390/768/1440: no horizontal overflow, no page errors,
guest Login target40px. Six screenshots live in this evidence folder using
auth-t13a-{guest,bypass}-{width}.png. These qualify frontend presentation only;
actual server bypass topology, working credential forms and real mail/providers
are unverified. Independent QA `/root/auth_mail_qa_review` passed the same37/37
tests and noEmit TypeScript, plus an actual Provider+Gate integrated probe proving
same-owner focus input/cache continuity and changed-owner remount/cleanup.
QA independently inspected all6 settled screenshots; the initial mobile drawer
animation captures were replaced after the existing CSS transition settled.
Independent Security `/root/auth_mail_security_review` passed scoped source review
and24/24 focused checks across5 frontend files. Independent UX
`/root/auth_shared_entry_ux_review` passed final source/test-assertion review and
all6 settled Thai/Neon screenshots. T13A scoped shared delivery is complete;
credential forms, other theme/locale visuals and deployed runtime remain future.
New files belong to existing Authentication feature/test owners;
no file moves or live runtime data changes. Architecture map updated for shared
Identity/transport/gate and the isolated local configuration paths.

## AUTH-T06A Connected Enrollment (Scoped Implementation And Review Complete)

Identity's public Application facade and authRoutes now connect registration
challenge creation, original-browser OTP verification and explicit signup
completion. New IdentityEnrollmentService and PostgresIdentityEnrollmentRepository
plus additive migration0008 own one-use proof and legal acceptance. The shared
Session entry independently verifies same-transaction new-account activation,
matching email, baseline roles, no MFA and no existing sessions before issuance.
Account/email/optional screened password/legal/session/Audit commit atomically;
only post-commit HttpOnly cookies leave the facade. Existing or concurrent email
ownership returns sign_in_existing without overwrite or authenticated authority.

Author `/root/auth_operations_implementation` passed enrollment10/10, session
authorization17/17, challenges28/28 and contracts21/21. Lead independently ran
`node scripts/verify-authentication.mjs --group enrollment`10/10 using only the
existing disposable PostgreSQL target and owned ephemeral loopback HTTP/fake mail.
Cases cover original proof replay/concurrency, optional password/consent, existing
disabled account, changed browser/purpose, Audit rollback and expiry after awaits.
Independent Security passed enrollment10/10 and sessions17/17 plus source;
independent QA passed enrollment10/10 and contracts21/21 plus source. Both reviews
confirmed the three task acceptance cases. Scoped T06A is complete. No live schema/data/mail/.env/Git changed;
real runtime credential composition and actual UI signup remain pending.

## AUTH-T06B Primary Password Login (Scoped Source And Review Complete)

POST /api/auth/login uses the canonical Identity facade plus new private
IdentityPrimaryAuthenticationService/PostgresIdentityPrimaryRepository and
additive0009. Shared SQL admission commits before expensive hash work, then
account-before-context locking rechecks exact current credential/security version.
One-use proof, Session and Audit commit together before cookie/CSRF rotation.
Unknown/wrong/absent/inactive/unqualified credentials receive the same401 with
dummy verification. Missing MFA/staff qualification never opens the workspace.
The exact Login denial is now exempt from client identity invalidation; private
401 retains its invalidation policy, covered by a new shared transport regression.

Author passed password-login11/11, enrollment10/10, contracts21/21. Independent
Security and QA each passed password-login11/11 and contracts21/21 plus source
review. Native credentials, actual owned loopback HTTP/disposable PostgreSQL,
cross-instance admission, one-browser concurrency, Audit rollback, PHC/version
changes during hashing and expiry are covered. Scoped primary source is complete;
no approved legacy inventory/upgrade is claimed, only qualified Argon policy.
Real deployment, MFA completion, reauthentication and frontend Login remain pending.

## AUTH-T07A OTP Login And Explicit Enrollment Exchange

Scoped server implementation and independent Security/QA review complete.
Author-separated reviewer `/root/auth_mail_security_review` applied Security
and QA sequentially; these are two role verdicts from one reviewer, not two
independent reviewers. Actual disposable PostgreSQL and owned loopback HTTP
checks passed: otp-login10/10, password-login11/11, enrollment10/10,
challenges28/28. Command: `node scripts/verify-authentication.mjs --group otp-login`
with the explicitly disposable test database variables described above.
Known-account verification commits consumed sent-code proof, Session and Audit
atomically before cookies. Unknown email offers signup only; explicit empty-body
enrollment-intents exchange creates an immutable separate registration context
with the original browser/expiry, without redundant email or synthetic challenge.
Replay, foreign browser/purpose, account races, MFA/version/status denial, Audit
rollback and original-expiry rollback passed. Migration0010 is additive.
Production composition, real mail/providers and integrated browser remain pending.

## AUTH-T13B/T13C Connected Credential Forms (Partial)

Root implemented LoginRoute and shared transient AuthenticationFlowProvider
under the Authentication feature. Password and OTP entry use the owning typed
API facade and verify confirmed session identity before navigating. Unknown OTP
email requires a separate Create account action then current-version consent;
password and code remain outside mutation variables and durable browser storage.
Abort guards prevent late unmounted forms from refreshing identity or navigating.
Focused frontend tests passed13/13 across LoginRoute6 and RegistrationRoute7.
Social, reset and callback acceptance, approved published legal links, actual
runtime composition and new browser qualification remain pending. Neither full
T13B nor full T13C is marked complete on this partial evidence.

### Connected Browser And Scoped Review

`scripts/authentication/qualify-browser-entry.mjs` uses actual React on the
frontend-only Vite5189 plus owning Auth/Identity Express routes, real isolated
SQL transactions and private example.invalid fake email. Explicit
`MPF_TEST_AUTH_BROWSER_FIXTURE=true` and disposable database variables are
required. Run `node --test scripts/authentication/qualify-browser-entry.mjs`.
Method projection is explicitly fixture-only, not a production qualification.
All API calls are intercepted; external origins and Vite's assets/outputs
proxy prefixes are blocked. No createApp, dotenv, workers or live data.

Lead and author-separated Security/QA reviewer passed5/5 (four journeys plus
parent): explicit signup/password optional/consent -> cookie SQL session;
wrong password then valid retry; known OTP Login with no password change;
unknown OTP offer -> explicit separate enrollment context, no account yet and
no redundant email. Shared email cooldown spans contexts; the fixture advances
its private clock61seconds rather than bypassing admission. Independent review
resolved proxy isolation/launch cleanup and confirmation redirect lifetime.

Latest focused frontend15/15 cover confirmation-only retry without replaying
committed signup/login, current consent, offer focus/shared pending spinner,
forgot access/email destination continuity and abort/duplicate protection.
Six latest Login/forgot and three offer screenshots at390/768/1440, plus three
refreshed verification screenshots, have no horizontal overflow or page errors.
Native UX independently inspected all six Login/forgot, three offer and three
latest verification visuals, and independently passed final15/15 focused tests
plus confirmation-only retry/offer focus/spinner/handoff source review.
These are Thai/Neon fixtures; other visual variants and
production runtime remain unverified.

## AUTH-T05C Action Assurance (Scoped Inactive Primitives Complete)

Additive0011 and IdentityActionService/PostgresIdentityActionRepository extend
existing context metadata with immutable action/target/account/version/session
scope and original proof/session/browser expiry. Durable private verifier
consumption and grant Audit share a live transaction. Required MFA needs
qualified stronger proof; password reset requires an existing credential and
cannot issue a session. Preparation is inert; commit consumes assurance with
mutation/outcome/Audit atomically. Separate bounded receipt lookup permits
minimal forced-revocation reconciliation; explicit logout denies it.
Operation guard now carries an authorized expiry through awaited mutation/Audit.

Author and author-separated single reviewer applying Security+QA independently
passed actions12/12, sessions17/17, persistence45/45 and contracts21/21.
Run `node scripts/verify-authentication.mjs --group actions` with disposable
database variables. Action routes here use captured transport contracts;
actual Action HTTP, production primary/factor composition and downstream reset
handlers are separate pending gates. No production data/runtime paths changed.

## AUTH-T07B Password Reset (Scoped Server Complete)

IdentityResetService and PostgresIdentityResetRepository implement explicit
reset verification and exact prepared password replacement through the owning
Action/Operation contracts. Native policy/hash checks precede consumption;
credential replacement, security-version advance, all-session/grant revocation,
Audit, encrypted notification and sanitized outcome share one transaction.
Unknown/passwordless/disabled/MFA accounts receive neutral denial. Reset never
creates a first password or a session. Receipt lookup survives forced revocation
within its original lifetime; explicit logout invalidates it.

Author and author-separated Security/QA reviewer passed reset10/10,
actions12/12 and contracts21/21. These are sequential role verdicts from one
reviewer. Run `node scripts/verify-authentication.mjs --group reset` using the
explicit disposable database settings. Production composition and real mail
remain unqualified.

## AUTH-T13D Reset UI (Scoped Complete)

Root added ResetPasswordRoute inside the existing Authentication entry flow.
Email verification, local password-policy feedback, the all-session revocation
warning and ordinary Login after success use the typed API owner. A lost commit
response triggers bounded receipt lookup without replaying password replacement.
Original operation expiry cancels lookup and ends the spinner, independently of
the ten-attempt cap. No password/code/proof is persisted in browser storage.

Root passed Reset7/7 focused regressions, including original expiry before the
attempt cap. Canonical React/SQL browser qualification passed7/7: signup,
password retry, known OTP Login, forgotten-password OTP Login without changing
the password, unknown-email explicit signup offer, and explicit reset followed
by ordinary Login. Native UX inspected all12 Thai/Neon reset email, verification,
password and success screenshots at390/768/1440 and passed21/21 earlier focused
tests; final UX correction review independently passed Reset7/7. Author-separated
Security and QA reviewer independently passed Reset7/7 and canonical browser7/7,
with no remaining scoped blocker. These are two role verdicts from one reviewer.
Production runtime remains pending. No full Authentication completion is claimed.

## AUTH-T08A Google (Scoped Inactive Server Complete)

IdentityGoogleService and private native-jose adapter extend the canonical
Context/Operation/Enrollment/Session/Action owners. Additive0012 social metadata
stores bounded exchange provenance. Durable one-use claim precedes outbound
token/JWKS work; fixed endpoints, state/nonce/PKCE, signature/issuer/audience and
bounded transport are validated. Known subjects use common Session policy;
authoritative-email signup requires explicit consent; matching existing email
never links automatically. Missing/untrusted email uses independent OTP bound
to the verified subject. Reauthentication grants only its exact original
Action/session/version and cannot issue a new session or satisfy stronger MFA.
The fixed provider callback hint carries no authority; recorded result lookup
cannot remint a session or renew its original deadline.

Author passed Google16/16, enrollment10/10, OTP10/10, actions12/12,
persistence45/45 and contracts21/21 sequentially. Author-separated single
Security/QA reviewer independently passed Google16/16 and contracts21/21 and
scoped source review. Run `node scripts/verify-authentication.mjs --group google`
with disposable database settings. Failed parallel runs hit Windows resource
exhaustion; successful sequential reruns supersede those infrastructure failures.
No actual Google/mail calls or production runtime activation occurred. Adapter
remains inactive and fixture-only; Facebook, social UI, linking and provider
deployment qualification are separately pending.

## AUTH-T19B Local Proxy Qualification (Review In Progress)

Vite binds127.0.0.1:5173 with strictPort and forwards to127.0.0.1:6500 with
changeOrigin while preserving browser Origin. Auth admits exactly the fixed
frontend Origin plus its own server Origin and retains socket loopback, backend
Host, same-site and CSRF checks. Hostile hosts/origins/ports remain denied.
Existing T13A shared Actor/Gate/API/mode presentation is unchanged.

Root passed developmentBypass7/7 and the new full isolated createApp/actual Vite
proxy qualifier1/1. Run `node --test test/authentication/developmentBypass.test.js`;
then set `MPF_TEST_AUTH_DEV_FIXTURE=true` and run
`node --test scripts/authentication/qualify-development-entry.mjs`. Qualification
uses a new temporary designated fixture, sanitized child environment, guarded
runtime writes, blocked actual runtime/.env reads and external network, and
no startup recovery. It covers actual proxy preferences/CSRF/hostile Origin/Host,
fixed actor, permitted history and denial for Progress/Blob authority; off-mode
denies old fixture headers/cookies across these transports. No actual workspace
fixture provisioning or .env edits occurred. Independent reviews and one-toggle
manual workspace UAT remain pending.
