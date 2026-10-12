# AUTH-012 Incremental Implementation Evidence

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
