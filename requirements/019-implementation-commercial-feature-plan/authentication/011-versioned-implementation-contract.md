# AUTH-011 Identity Contract V1

## Qualified runtime composition (Login completion, 2026-10-11)

Identity owns the planned `server/config/identityRuntime.js` and
`server/domain/identity/createIdentityRuntime.js`. Runtime qualification is a
server-composition contract, distinct from every existing fixture gate. A real
factory must not pass `fixtureOnly: true`. It consumes validated persistent,
versioned, purpose-separated keys, exact trusted origins, PostgreSQL readiness,
enabled-method credentials and explicit legal/retention/sender/provider approval
references. Missing inputs deny affected methods; no random runtime keys,
example.invalid runtime sender, mock actor or fixture screening fallback.

The factory reuses Context, Session, Enrollment, Primary, Challenge, Action,
Reset, Social, Operation, Delivery and Audit with one PostgreSQL facade. Pending
migrations/checksum mismatch block startup: startup performs status only; the
explicit migration tool alone applies approved migrations. Native SMTP/fetch
transports are created only in qualified composition. Delivery has one bounded
non-overlapping dispatcher, explicit start/stop and sanitized errors. External
mail-event verification remains vendor-owned and disabled without its verifier.
Password creation requires a vetted screening adapter; it never silently accepts
all passwords. Social callbacks and password/OTP preserve MFA denial.

Identity readiness and billable recovery readiness are separate. Constructing
Login cannot start Credit reconciliation, provider dispatch or video recovery.
T15B/C remain required before the full application is activated: guest/null
identity, private-route ownership and private media cannot fall back to mock IDs,
user-supplied usernames or raw output-directory serving. Existing public snapshot
visibility remains source-owned. Unmapped media denies rather than exposing files.

AUTH-T15D delivers the runtime configuration/factory and qualified adapter gates;
AUTH-T15B wires bootstrap and HTTP cutover; AUTH-T15C owns private media/public
snapshot parity. Focused runtime checks use disposable PostgreSQL and injected
transports; no workspace .env/data, live SMTP/OAuth or paid generation is used.

**Status:** T02A/T02B reviewed and frozen; not a runtime API claim
**Owner:** Identity; Backend/Security/QA review before implementation
**Inputs:** AUTH-001..005/009/010; Phase2-03 qualified infrastructure

## 1. Transport, Mode And Browser Context

Use AUTH-004 endpoint inventory. JSON success DTOs carry `contractVersion: 1`
except preserved `/api/me`, preferences and empty204 responses. Errors are
`{error: <localized-safe fallback>, code: <stable AUTH-004 code>, requestId}`;
only rate errors add bounded retryAfterSeconds. Unknown fields, invalid types,
oversized inputs and unsupported purposes fail before domain work. Body limit
for Auth is32KiB; identifiers max128 ASCII characters, email max254 bytes,
display name1..80 Unicode characters and return path max1024 characters.
An opaque ID never substitutes for its separate context proof.

Public config: `{contractVersion, authMode, methods:{password,emailOtp,google,
facebook}, csrfToken, policy:{otpDigits,otpExpiresSeconds,resendSeconds,
passwordMinLength,passwordMaxLength}, legal:{termsVersion,privacyVersion}}`.
`authMode` is `session` or `development_bypass`, computed server-side. No actor
enumeration, credential/config secrets or vendor-specific tokens. Methods are
false until their required configuration/adapters qualify; unavailable methods
reject direct calls with auth_service_unavailable. Bypass exposes all methods
false and a fixture mode label; `/api/me` still supplies the fixture actor.
An explicitly unavailable ordinary-runtime composition may project a null CSRF
token only with every method false and no private authority. The client disables
all unsafe requests until a browser-bound token is available. Bypass or any
enabled method requires a nonempty browser-bound token; null never exempts CSRF.

`/api/me` is null for guests or the existing actor projection plus `authMode`;
its opaque userId, roles and status come from Identity only. requestId remains
per request. No browser-supplied role/user header is proof. Shared schema must
accept null, and mode joins actor identity in cache/persistence namespaces.

Production cookie names use `__Host-mpf_session`, `__Host-mpf_context` (browser/
CSRF binding) and `__Host-mpf_flow` (restricted purpose proof);
HttpOnly, Secure, SameSite=Lax, Path=/, no Domain. Explicit local development
HTTP may use distinct `mpf_local_session`/`mpf_local_context`/`mpf_local_flow` cookies, never
accepted in production. Use32-byte CSPRNG secrets encoded base64url. Store only
keyed digests in PostgreSQL. Session expiry is bounded by AUTH-010; preauth
browser context expires after5 minutes and supplies no private access.
Challenge and restricted grant lifetimes remain5 minutes within that context.
Reject duplicate same-name cookies and malformed/oversized cookie values.

GET config issues/refreshes a bounded preauth cookie when needed. Its csrfToken
is a keyed, domain-separated HMAC bound to that cookie and current auth mode.
Every browser unsafe request (including Login/logout) requires exact allowed
Origin plus matching X-CSRF-Token and browser cookie. Constant-time comparisons,
no wildcard credentialed CORS, no proxy-derived origin authority. Production
origin is explicit HTTPS configuration; local development allowlist contains
only selected loopback server/Vite origins and ports. Never infer trusted origin
from an incoming Host. Local bypass additionally validates socket/Host and Vite
binding per AUTH-009. Safe callback endpoints use their verified state/nonce or
provider signature exemption; no general CSRF exemption for `/api/auth/*`.

Successful session rotation also rotates browser context/CSRF and invalidates
prior action grants. Each normal request checks account lifecycle/security
version, session expiry/revocation; no positive authentication cache. Worker
identity and public routes retain explicit separate contracts. Client re-fetches
config after session/mode changes; never retries an unsafe request automatically.

## 2. Purpose State And DTO Boundaries

### T07A Code Login And Explicit Signup Offer (2026-10-11)

POST /api/auth/challenges also accepts purpose login with the same202 DTO.
Verification still accepts only code; the flow cookie determines purpose.
Outcomes are authenticated+safe returnPath with private post-commit cookies,
offer_registration+contextId or unavailable. POST /api/auth/enrollment-intents
accepts an empty body only after an explicit Create account action. Original
browser/flow proof decides the sole offer; exchange returns complete_registration
with replacement restricted flow cookie, or sign_in_existing requiring fresh
independent sign-in. No redundant OTP, synthetic challenge or mutable source
purpose. Typed0010 proof/exchange keeps original TTL and one-use provenance.
Action assurance reservation advances0011. Feature UI retains only one bounded
in-memory email/purpose/challenge/next-step form context; authority remains in
server HttpOnly cookies, not route params, localStorage or that presentation state.

### T06B Primary Password Input (2026-10-11)

POST /api/auth/login accepts only email, password, optional rememberDevice and
safe returnPath, with exact Origin/browser/CSRF binding. Success returns
{contractVersion:1,nextAction:authenticated,returnPath} and private post-commit
cookies. Unknown, wrong, absent, inactive or unqualified credentials share
auth_invalid_credentials/401 and bounded dummy hash work; genuine private401
still invalidates client identity, while this exact Login denial preserves email.
Shared SQL source/target/global admission precedes expensive hashing. Immutable
0009 primary proof is bounded under the original context and consumed in the
same live transaction as session/Audit, with account-before-context locks and
exact credential/security-version revalidation after hashing. Missing MFA/staff
qualification denies workspace; reauthentication and MFA completion remain later.
Runtime adapters remain inactive until real qualification; fixtures are not
production activation. Action assurance reserves0011 after code-login/offer.

### T06A Activation Input (2026-10-11)

Enrollment extends IdentityApplicationService and authRoutes, not another public
identity owner. Registration verification stores a durable one-use proof under
the exact original browser/context/purpose/target/expiry. Its public response
contains only nextAction/contextId; secrets and the post-commit cookie envelope
remain private. Completion rechecks proof and unique email under one transaction,
records current legal consent, creates only a new baseline account/email/optional
credential, and uses a separate verified-enrollment Session entry point sharing
the existing policy/rotation/Audit internals. It never changes the immutable
registration context into an existing-account login. Existing or concurrent
email ownership produces a fresh-independent-sign-in handoff without overwrite.
Missing method/MFA/legal/screening qualification fails closed. Replays must not
create another account or session; Audit failure rolls back the whole activation.
The additive enrollment migration may use0008; the unimplemented action-grant
migration reservation advances to0011 after0009 primary login and0010 code login. Registration does not wait for action
assurance, while reset explicitly does. Staff roles/bootstrap are never created.

Challenge creation accepts purpose, email, safe returnPath, optional existing
operationId and rememberDevice only for Login/registration. Require an opaque
Idempotency-Key (16..128 safe ASCII chars); owner/context+operation scope, plus
keyed canonical request fingerprint as specified below. Generic202 returns `{contractVersion,challengeId,
expiresAt,resendAt}` for active, missing-method, absent and blocked identities.
Verification accepts exactly challengeId in path and code string preserving
leading zeros; server-bound purpose/target decides nextAction, never client input.

Allowed nextAction values follow AUTH-004. Every return contains only the
minimum relevant context ID, safe returnPath and expiry; secrets remain in
separate HttpOnly context cookies, never JSON, URL or localStorage. A verified
unknown-email Login grant can only offer enrollment. POST enrollment-intents
requires that grant and explicit acceptance of enrollment intent, consumes it,
and creates a registration-only grant. Completing registration rechecks unique
email/status/security version, explicit current Terms and Privacy versions,
display name and optional password. A concurrently-created account returns a
fresh-sign-in-required result; no overwrite or automatic linking.

Reset proof grants only reset; absent password cannot become first-password
setup through reset. Login purpose cannot authorize credential mutation, and
registration purpose cannot authorize an existing-account session. Enrolled or
required MFA yields a restricted MFA context, never a normal session first.
Provider missing-email completion binds verified subject to that enrollment
context; client email/subject fields cannot replace its subject/app scope.

Social start accepts fixed provider enum and login/link intent. Link binds the
current actor, security version and fresh action assurance. State expires in5
minutes and is one-use; Google also binds nonce/PKCE verifier. Callback consumes
state atomically before final binding/session result; retries reconcile the
recorded terminal state without new users or sessions. Secret tokens never enter
return URLs/logs. AUTH-010 pins protocol hosts/version. Provider HTTP timeout10s,
response limit256KiB, redirects disabled; failed proof grants no access.
State progresses initiated -> exchange_claimed -> succeeded/failed/interrupted,
with claim expiry and operationId recorded before outbound exchange. Exactly one
claim wins. The final account/session result and succeeded outcome commit together.
A retry may read that terminal result under the original browser binding but
cannot mint another session. A timeout/crash/unknown exchange or failed final
transaction terminalizes as interrupted on bounded lease expiry; require fresh
provider initiation rather than replaying the old code or unpersisted proof.
No distributed provider transaction is claimed and no pending operation grants
private access. Existing successfully committed sessions remain authoritative.

Security mutations accept only target IDs owned by the resolved actor and require
fresh5-minute action+target-bound assurance. MFA-required actors need stronger
proof. Password reset and email commit revoke sessions/grants as AUTH-003 states.
Session listing preserves AUTH-004 bounds; role changes never originate in Auth.

## 3. Operation Preparation And Reconciliation

Before any session-revoking mutation, the successful preparation/proof response
issues an operationId and separate operation-receipt cookie. Receipt cookie uses
the same host-only/HttpOnly/Secure/SameSite rules and a separate digest,5-minute
TTL, browser binding and operation scope. This occurs before the mutation POST,
so a lost commit response cannot be the only source of the recovery handle.
Mutation requires its intended proof independently; receipt alone never mutates.

Preparation occurs after the final mutation payload is available. The planned
`POST /api/auth/operations/prepare` accepts an allowlisted action, its target and
the final payload under independent action proof/CSRF; Identity computes the
immutable keyed fingerprint. It persists the pending operation and receipt,
returns the handle/cookie, then the existing mutation endpoint commits the same
payload with that operationId and independent still-valid proof. The UI can
perform these two requests in one form submission. OTP verification alone cannot
prepare an unknown future password. T03C implements internal preparation; T05C
and route owners expose it without accepting arbitrary operation names/functions.

If the preparation response is lost, valid proof plus the same fingerprint may
issue a replacement receipt at most three times total for that operation.
Revoke earlier receipts, retain original expiry and reject after that bound or
after terminal commit; restart with a fresh context when preparation cannot be
recovered. Never persist receipt plaintext or mutate the immutable fingerprint.
Replacement inserts a fresh immutable receipt row and revokes the former one in
the same transaction. A partial unique index permits one unrevoked receipt per
operation/browser, and a durable operation counter bounds issuance. Concurrent
preparations serialize; a delayed response with the previous secret only fails
lookup and cannot authorize mutation.
Rollback during commit leaves the prepared operation pending for an authorized
retry; neither a receipt nor a pending operation grants mutation/session access.

Commit records terminal operation state in the same transaction as Identity
mutation/revocation; asynchronous notification state is separate. GET operations
accepts owner session+scope or the separately bound receipt and returns only
`{contractVersion,operationId,status,nextAction}` where status is
pending/succeeded/failed/expired. It returns no email/account/method details.
Foreign/expired/guessed IDs use one non-enumerating denial. Forced revocation
allows bounded receipt lookup; explicit logout clears context/receipt/session
cookies and invalidates their server grants, including from restricted context.
Operation reconciliation uses null nextAction while pending. A failed/interrupted
social operation returns `fresh_sign_in_required`, which directs to a fresh Login
initiation without replaying the old code; completed revoking mutations may use
`sign_in`. These operation outcomes do not widen challenge proof purposes.

Client uses shared Query owner, max10 polls at2-second intervals, one operation
per active form and no background persistence. Stop on terminal/expiry/logout,
actor/mode change or unmount. Exhaustion says outcome unknown and provides
normal Login/reconciliation, never a success guess or mutation replay.

## 4. Persistence, Transactions And Audit Boundary

Phase2-03 migration registry explicitly imports owning migration definitions;
Identity DDL belongs in `server/repositories/identity/identityMigrations.js`.
No independent migration framework. All table names are owned/namespaced by
Identity and account IDs remain opaque application-generated text. No mock seed
conversion. IDs use CSPRNG and uniqueness constraints, not email/time-based keys.

Normalize accounts, email bindings, external identities, optional credentials,
sessions, challenges, contexts/grants, MFA factors/recovery codes, operation
receipts/outcomes, shared rate buckets and notification outbox. Use explicit
status/purpose/owner/security-version/expiry columns, UTC timestamptz, FK/unique
constraints and bounded indexes for actual owner/expiry lookups. Do not hide
queryable ownership or authorization in JSON snapshots. At most bounded immutable
operation metadata (4KiB) belongs in JSONB. AUTH-004 logical fields still apply.

Persistence review requires immutable issued context scope (owner, security
version, browser and purpose) and operation scope/fingerprint fields. Child
challenge, pending-binding, social-exchange and receipt references must match
their context/operation owner and historical version on both insert and update.
Historical versions are retained across revocation. Challenge `link_email` maps
only to the explicit `link` context, never login/reset proof. Account operations
retain their account idempotency scope and may carry a separate immutable
`binding_context_id` for their exact proof/browser context. This field is required
when a pending binding, social link or receipt references an account operation;
matching account alone does not authorize another context. Non-browser account
operations may omit it. Account-scoped results cannot name a different account;
anonymous context enrollment may produce a new account.
Transient OAuth verifier/nonce material is an erasure exception: terminal
succeeded/failed/interrupted exchanges may clear it to NULL. Replacement,
restoration and early erasure are rejected; owner/context/state authority stays
immutable. This permits bounded secret disposal while retaining reconciliation.

Email canonical key unique across retained bindings; provider binding unique
on provider+issuer/app scope+subject. Status changes lock account row, increment
security version and invalidate sessions/grants atomically. Challenge attempts,
resend supersession and consumption use row locks/conditional mutation; shared
rate counters use atomic PostgreSQL operations with TTL. Lock account first,
then target grant/method/operation rows in deterministic ID order. Cross-account
locks follow lexicographic userId order. Serialization/deadlock outcomes are
sanitized retryable results, never unbounded retries of external side effects.

Idempotency is unique on actor-or-preauth-context+operation+key; compare canonical
request fingerprint and reject conflict. Fingerprints use HMAC-SHA-256 with a
domain separator, operation/version and canonical input, using a dedicated
random32-byte key outside PostgreSQL; never an unkeyed password/code digest.
Persist key version with the fingerprint and retain prior keys only for the
bounded idempotency-record lifetime. Key rotation must either verify that old
version during its window or invalidate its records and require a fresh context;
never treat a missing key as a matching payload. Never retain raw canonical
secret-bearing bodies in metadata/outcomes/logs. Commit domain state and outcome together.
External email is outbox work after commit, with stable send IDs and bounded
leases/retries; no provider network while holding a DB transaction. Notification
failure cannot undo successful credential changes or reactivate old grants.

Audit remains Audit-owned. Before T03C, extend its public service to accept a
transaction context and implement its PostgreSQL adapter/migration through its
own owner. Identity calls that public method inside the same transaction, never
writes Audit tables/repositories directly. Preauth events use an explicit system
security actor and hashed target fingerprint; never fake a real user, email in
logs or trust x-forwarded-for without configured proxy trust. Transactional Audit
and encrypted outbox retention are upstream T03C gates, not permission to use
the existing JSON Audit as a durability substitute.

No real data or automatic cleanup before D05 approval. Isolated tests use unique
schemas in an explicitly disposable DB; fake email/provider adapters only.

### T03C Fixture-Only Transient Delivery Policy

This local implementation contract permits only disposable fixture qualification;
it does not approve D05 retention/residency or activate collection/delivery for
real users. Runtime composition must retain that separate activation gate.

- Delivery payloads are at most 2KiB and expire no later than their originating
  proof, with a maximum five-minute lifetime. Use authenticated AES-256-GCM with
  random 12-byte IV, 16-byte tag and a dedicated random 32-byte external key;
  authenticated associated data binds record ID, operation, purpose, key version
  and expiry. Never reuse the OTP/idempotency/Audit key for encryption.
  The bound measures UTF-8 plaintext bytes. Encode AAD as the fixed ordered JSON
  array `[recordId, operationId, purpose, keyVersion, expiresAtISO]`; no arbitrary
  object serialization or request-provided algorithm/nonce.
- Terminal sent/failed/expired work erases its encrypted payload; an explicit
  bounded fixture cleanup also erases expired work. Preserve only the minimal
  non-secret logical outcome. The schema must support erasure without deleting
  the operation; use an additive Identity migration after the reviewed foundation.
- Each worker claim has a bounded lease and attempt generation used as a fencing
  token. Only its current unexpired claimant can acknowledge. Retry uses a stable
  logical delivery ID, maximum four attempts, bounded backoff and proof expiry;
  external send runs outside SQL transactions with a ten-second timeout.
  Fixture execution claims at most two items concurrently, lease at most fifteen
  seconds, and backoff is 1/2/4 seconds after attempts one/two/three. Every duration
  is capped by the original expiry; less than one second remaining expires the
  work. One invocation processes at most ten items; expiry cleanup at most fifty.
  Claim generation fences late acknowledgements; an abandoned expired lease never
  blocks cleanup. T03C starts no automatic worker or production cleanup loop.
- Recheck current claim and originating proof eligibility before decrypt/send.
  Superseded/revoked/expired challenges cannot dispatch a code. Non-code security
  notifications bind a committed operation and have their own explicit purpose.
  Prepared security commits consume their action context. Challenge-issue commits
  retain the pending challenge context and enqueue through the same internal
  delivery service/transaction; consuming that context during issue would prevent
  valid OTP delivery. Intended grant revocation does not invalidate a committed
  security notification, but its original delivery expiry still applies.
  Authentication/missing-key failures terminalize and erase payload without
  resetting attempts. A timeout aborts the adapter; it cannot recall an email
  already accepted externally, and never extends proof validity.
- A crash after physical send may cause repeat delivery with an SMTP adapter.
  Guarantee one logical outbox item and no repeated Identity mutation, not
  exactly-once physical email. A provider idempotency facility may reduce repeats.
- Fake mail accepts `.invalid` fixtures only. Tests cover tampering, wrong key/AAD,
  lease expiry/stale acknowledgement, retry exhaustion and terminal erasure.
  Key rotation requires an explicitly available prior key only during the bounded
  payload lifetime; missing keys fail closed and never expose ciphertext/errors.

T03C requires independent Security/QA review of these bounds and their source
implementation. Real delivery remains unavailable until D02/D05 are settled.

### T04A Challenge And Rate Contract (Implementation Policy, 2026-10-11)

The internal challenge owner accepts a trusted browser/context binding, canonical
email and purpose; HTTP must obtain those bindings through Identity, never from
untrusted account IDs. Codes use `crypto.randomInt(0, 1000000)` padded to six
digits, a dedicated external HMAC key and a domain separator including challenge
ID, purpose, target and browser. No raw code in a public result. Issue and its
encrypted delivery work commit together. Exact request replay returns the same
opaque challenge without another send or a renewed lifetime.
An accepted replacement supersedes pending challenges for the same canonical
target, purpose and exact account authority (including anonymous/null), across
browser contexts and retained target-key versions. Different owners proposing
the same replacement/link email do not supersede each other's challenges. Global
email cooldown/budgets still apply across all owners and purposes.
The email parser accepts unquoted ASCII dot-atoms (local part at most64 bytes)
and valid IDNA DNS labels; quoted addresses, comments and SMTPUTF8 local parts
are explicitly unsupported. Reject URL delimiters, percent escapes and embedded
whitespace/control characters before IDNA conversion; conversion must not silently
drop a path/query/fragment or decode a different mailbox domain. Preserve submitted
spelling for display, local-part spelling with ASCII domain for SMTP, and a
lowercase binding key without stripping plus tags or dots.

The following limits are frozen for disposable implementation tests. They do not
approve live sending cost or D05 data collection. Every bucket is shared in SQL,
keyed with a dedicated external HMAC key (not a raw email/IP/account identifier),
and measured across purposes and fresh browser contexts:

| Operation | Scope | Limit / rolling-from-first-event window |
|---|---|---|
| Send | Canonical email | 5 / hour and 10 / day |
| Send | Source IP | 20 / hour |
| Send | All fixture sends | 100 / hour |
| Verify | Canonical email and account, when present, independently | 10 / 15 minutes and 30 / hour |
| Verify | Source IP | 60 / 15 minutes and 200 / hour |
| Verify | All fixture verification | 1000 / hour |

A bucket window starts at its first accepted event and does not move on retries;
it resets only once expired. This permits a boundary burst up to two windows'
allowance; it is not advertised as a sliding-window algorithm. Five failures
still exhaust one challenge. Send cooldown is 60 seconds per canonical email,
across purposes/contexts, so opening a new tab cannot bypass it. Budget rejection
does not extend the window or permanently change account status. Rejected proof
attempts commit their counters; throwing inside a rolled-back transaction must
not erase brute-force accounting. Verification uses two short committed admission
stages: source/global first, then resolve/validate the browser binding outside
the admission lock, then target/account only for an exact authorized binding.
Each stage's bucket set is atomic; rejection at a later stage never refunds the
earlier charge. Both finish before the proof/action transaction. Handler failure rolls back consumption and effects,
but retains that admission charge; a retry requires new admission. Never refund
verification charges on a failed purpose handler or database/action rollback.
Malformed/foreign challenge requests remain
subject to source/global limits without charging an unrelated victim's target.

Store at most 10000 rate rows for this fixture policy; bounded cleanup removes
at most 50 expired rows per invocation. Capacity exhaustion rejects new work;
do not evict live buckets or fall back to process memory. Retained key rotation
must preserve the active windows or deliberately block work until they expire,
never give fresh budgets simply by switching keys. A schema-scoped advisory
transaction lock serializes rate admission, bounded expiry cleanup, capacity
checks and counter updates; acquire it first, then bucket rows in digest order.
Release verification admission before account/context/action locks or adapters.
For send, admission, idempotency, cooldown, challenge supersession and new outbox
insertion share one transaction, starting with the same rate lock. Exact send
replay creates no send charge. No transaction holding account/context/challenge
locks may subsequently request the shared admission lock. No provider call may
hold either transaction.

After committed rate admission, lock order is account (if bound), context,
challenge, then operation/outbox. The existing delivery acknowledgement locks
outbox then challenge, so challenge code must never lock/update an existing
outbox row while holding a challenge lock. Supersession only terminalizes the
challenge; the delivery owner's eligibility/cleanup later discards its payload.
New outbox insertion is safe because no worker can claim it before commit.
Challenge issue/verification must use this consistent order and
check fresh server time after awaited locks and before consumption. Successful
verification consumes the challenge and invokes only a composition-owned
purpose handler in the same transaction; handler failure rolls back both. A
request cannot supply its own callback or exchange registration/reset proof for
login. Later tasks supply actual enrollment/reset/session transitions. Pending
or failed delivery cannot authenticate; acknowledgement only activates the
current pending challenge and never changes its original expiry.

The composition-owned handler returns only `nextAction` and an optional opaque
`contextId`. Its allowed outcomes are purpose-specific; an invalid output rolls
back challenge consumption and handler effects:

| Challenge purpose | Allowed nextAction (all also permit `unavailable`) |
|---|---|
| registration | complete_registration, sign_in_existing |
| login | authenticate, mfa_required, offer_registration |
| password_reset | reset_password |
| email_change_new | confirm_email_change |
| link_email | complete_link |
| reauthentication | reauthenticated, mfa_required |

Names express the permitted transition only. A string or context ID is not a
session/grant; the later owning handler must atomically create the corresponding
restricted authority or qualified session and pass all method/MFA checks.

The private composition contract is
`resolveBinding({contextProof,browserProof}, {stage:'issue'|'verify'})`, returning
verified `contextId`, `browserDigest`, `purpose`, `targetId`, nullable `accountId`
and `securityVersion`, `canonicalEmail` and `deliveryEmail`. It must derive all
authority from server persistence, never a request email/account/purpose. The
challenge service rechecks the stored context target/browser/purpose and current
account version. The purpose handler receives this immutable binding,
`challengeId`, the shared transaction and the bound Identity repository; it must
perform only its named transition and no provider network inside that transaction.

T04 fixture resolvers are not production context storage. T05's context owner
must persist the purpose/target-to-email binding and explicit remembered-device
choice (including anonymous enrollment) before runtime composition. An encrypted
outbox that is erased after delivery is not a durable target registry, and a
process-local fixture Map is not an authorized replacement. Raw caller email
cannot restore that authority after a restart.

Independent Security/QA must qualify these policies and implementation before
T04A closes. Public method projection, localized mail, delivery callbacks and
suppression remain T04B; real SMTP activation remains T17/D02/D05.

### T04B Local Mail And Event Contract (2026-10-11)

T04B qualifies private delivery adapters and state transitions with injected
transport/verification. It does not enable a real sender, provider callback,
production collection or background dispatch. Keep the current fixture-only
delivery composition gate. Nodemailer10.1.0 is the selected inactive SMTP
implementation; qualify its constructed options and message output using a fake
transport, without network or an Ethereal/external test account.

- SMTP uses explicit configuration, verified TLS (implicit TLS or required
  STARTTLS), bounded connect/greeting/socket/DNS waits, disabled filesystem/URL
  content access and disabled debug/logger output. Only the intended recipient
  is accepted. Its stable Message-ID derives from the outbox ID; this does not
  promise exactly-once physical SMTP delivery. These options follow the
  [official SMTP transport contract](https://nodemailer.com/smtp).
  Installed10.1.0 unpooled `SMTPTransport.close()` does not terminate its active
  per-send connection. Reject already-aborted work and keep native timeouts;
  an abort does not claim recall/cancellation of accepted mail. Preserve the
  actual unsettled send promise so delivery quarantine still bounds capacity.
- Add immutable outbox recipient HMAC and key version using another dedicated
  external ring. Store the authoritative template purpose from the originating
  challenge or allowlisted notification kind, locale `en`/`th` (fallback `en`)
  and a callback expiry of original creation plus24 hours. This metadata survives
  ciphertext erasure only for bounded fixture callback qualification. Neither a
  caller-supplied email in an event nor an outbox's erased payload restores
  target authority. Prior key versions must remain available for all live callback
  metadata and suppression records; missing historical keys fail closed until
  those records expire. Recipient rings retain at most8 versions. Each outbox
  captures at most8 immutable digest/version aliases for its one canonical
  recipient, erased with its24-hour metadata. Suppression uses one logical group
  with the original first-suppression expiry and at most8 aliases; a newer-key
  callback may add a previously unseen alias but cannot extend that expiry.
  Old/new callbacks must work in either order. Ambiguous matching groups reject
  instead of merging identities or extending retention. Cap suppression groups
  at10000 and their alias rows at80000; no plaintext email directory is created.
- Purpose-specific messages use canonical English/Thai authentication catalogs,
  with code, original expiry, recipient and ignore-if-not-you guidance. No raw
  user subject/HTML/template selection. Add the namespace through the existing
  manifest; preserve key/interpolation parity. An optional internal enqueue
  locale is presentation metadata, never authority or an expiry extension.
- `IdentityEmailEventService` requires a composition-owned `verifyEvent`
  callback with a fixed provider scope. Only its verified DTO
  `{eventId,deliveryId,type,occurredAt}` may enter persistence; type is exactly
  `delivered`, `bounce` or `complaint`. IDs/time/body are bounded, and no supplied
  email/account may choose a suppression target. The actual provider protocol
  remains D02/T17; an injected fixture verifier is not provider authentication.
- Deduplicate on provider scope plus event ID; reuse with changed immutable
  content rejects. `delivered` is observational only: it never activates proof,
  reverses failure, unsuppresses a recipient or extends expiry. Bounce/complaint
  may fail pending delivery and suppress its stored recipient, but never change
  consumed/superseded/revoked/expired proof into usable proof. A later failure of
  replacement delivery never reactivates an old code.
- Fixture event and suppression records each have fixed24-hour retention,
  measured from first accepted event/first suppression respectively, with no
  retry-based extension. Each table caps at10000 rows. Explicit cleanup deletes
  at most50 expired rows per table per invocation; no automatic cleanup loop,
  live eviction or real-data retention approval is implied. Concurrent admission,
  dedupe and capacity decisions share a schema lock. Missing capacity rejects
  atomically; no unbounded event ledger.
  Removing at most50 expired suppression groups also removes their at-most400
  child aliases. A new callback matching an expired group that bounded cleanup
  has not reached must reject/retry, not be accepted without active suppression.
  The same explicit cleanup may erase expired outbox recipient/version/template/
  locale metadata in a separate batch of at most50. Erasure is one-way and keeps
  the original callback expiry and minimal logical outcome; it never restores
  ciphertext or extends retention. Real cleanup remains D05-gated.
- Callback mutation order is admission, outbox, then challenge. Delivery only
  reads suppression and never requests its admission lock while holding outbox;
  it rechecks current eligibility and deadlines before sending. Final dispatch
  admission uses one SQL snapshot of delivery/proof/account eligibility,
  recipient suppression and historical-key availability, taken after a separate
  outbox-lock acquisition statement. This prevents stale reads across lock waits
  and callbacks for older deliveries to the same recipient. Fresh clocks and
  shared adapter-quarantine checks run after awaits and immediately before send.
  A callback committed after that admission point cannot recall already-admitted
  SMTP work; physical exactly-once delivery is not promised. Retain existing
  fencing, timeout/quarantine, ciphertext erasure and logical idempotency tests.
  Use an additive0005 migration and qualify cumulative schemas for current
  delivery/challenge source; earlier reviewed migration text stays immutable.
- Public policy projection accepts explicit qualified configuration and exposes
  only method booleans, public password/OTP policy and approved legal versions.
  Defaults and development bypass disable all methods. Fixture mail alone never
  makes a production method available. HTTP browser/CSRF context composition
  remains T05; SMTP credentials, provider IDs, keys and raw errors never appear.

The fixed fixture retention above is a test lifecycle, not D05 approval for real
people. Full runtime activation must separately qualify actual SMTP/provider
configuration, durable context targets, real data lifecycle and deployment gates.

### T05A Session Implementation Inputs (2026-10-11; Runtime Pending)

Freeze the proposed AUTH-004 active-session limits at10 customer/3 staff. Count
only unrevoked, unexpired sessions at the account's current security version;
serialize issuance under the account row lock. A new session replaces the oldest
non-current session when the cap is reached, with deterministic createdAt/ID
ordering and an atomic notification outbox item. Staff classification is derived
from persisted protected role memberships, never a request flag. Staff issuance
requires qualified MFA and still rejects until D06 bootstrap qualification; its
remembered-device choice is always false. No staff account is created by this task.

Session policy remains AUTH-010's24-hour/7-day ordinary customer and7-day/30-day
explicit remembered customer idle/absolute limits; staff30-minute/12-hour limits.
Persist the selected idle duration, remembered choice and a sanitized allowlisted
device label at issuance. Ordinary resolution/listing/background polling never
updates activity. An owning user-activity command may extend idle expiry only
after checking current account/version/session, bounded by original absolute
expiry. Responses contain no raw credential or precise location. Lists use an
opaque deterministic cursor, a default20 and maximum50 rows, with owner predicates
in every query; an unknown or foreign revocation target returns the same result.

T05 must replace fixture Maps with durable purpose/target/email and explicit
remembered-device metadata bound to the immutable context. Anonymous pending
email metadata uses a dedicated protected payload with original context expiry;
it is not restored from erased delivery ciphertext or caller email. Context
issuance, consumption/rotation, revocation and bounded expiry cleanup must work
across service instances. The private session issuance boundary accepts only an
owning verified authentication transition and performs account/context/MFA checks
inside the same shared transaction; no HTTP caller supplies account/method/MFA
authority to mint a session. Missing real proof/factor adapters reject.

Keep D03 actual deployment origins and D06 actual staff bootstrap separate from
isolated source qualification. Fixture origins are explicit loopback HTTP values;
production policy accepts only explicit HTTPS origins and protected cookie names.
No inferred Host/proxy origin, permissive CORS or implicit demo identity is added.
Concrete browser/context cookie composition and exact task write scopes must be
recorded before T05A implementation, then independently reviewed with its source.

#### T05A Concrete Composition Freeze

Use the three cookie names above with strict duplicate, malformed, mixed-mode
and size rejection. Browser and flow proofs expire within five minutes; a flow
never extends its browser's expiry. Remembered sessions set Max-Age bounded by
their original absolute expiry; ordinary sessions use a browser-session cookie
and still enforce server-side expiry. CSRF binds the live browser generation,
current session digest or anonymous scope, mode and key version. Exact explicit
Origin and CSRF are required for unsafe requests. Config, listing and resolution
never touch session activity.

Add migration0006 for durable browser records and protected purpose metadata.
Use distinct external session, browser, CSRF and metadata-protection keys;
retained rings contain at most eight versions and missing historical keys deny.
Protected metadata uses AES-256-GCM with fixed associated data and at most2KiB
plaintext. Bind original purpose/target/account/version, canonical/delivery email,
remember choice and safe return path to the original context and browser generation.
Only a composition-owned target resolver derives that authority from persistence;
caller account IDs, erased outbox data and fixture Maps cannot restore it.

Cap retained browser rows at10000 and retained protected metadata at eight rows
per browser (80000 total), including expired rows until explicit cleanup. Capacity
denies new work without eviction or renewed lifetimes. Bootstrap admission is a
standalone transaction; no account/context/proof mutation acquires its admission
lock afterward. Cleanup removes at most50 expired browsers and their at-most400
metadata rows, erases terminal protected payloads and preserves referenced
historical contexts/operations/sessions/Audit. No real-data retention is approved.
Rotation reuses a browser row with a fresh generation; old flow/receipt expiry is
immutable. Preserve a bounded browser-to-context mapping for explicit logout.

For mutations lock account, existing purpose contexts in ID order, challenge/
proof, browser, then sessions in ID order, followed by new outbox insertion.
Account-bound context creation follows account-before-browser order. Bootstrap
and cleanup must not acquire historical account/context locks while holding
browser/admission locks. Qualify foreign-key and concurrent cleanup/issuance
behavior in PostgreSQL; sanitization is not evidence of deadlock freedom.

Private finishVerifiedAuthentication receives only an opaque proof reference
and browser/context proofs. Its mandatory transaction-bound verifier checks the
durable one-use proof, exact purpose/account/version/method and required factor.
The service independently rechecks stored account/context/browser/roles, remember
choice and fresh expiry after awaited work. Reuse the live T04 transaction;
nested transactions are forbidden. Persisted admin/support memberships classify
staff; unsupported roles deny. Missing proof/MFA/bootstrap qualification denies.
Exactly one session may result from a proof. Private cookie material leaves only
through a post-commit transport result, never public challenge JSON, URLs, logs
or replay storage. Lost success does not permit another issuance.

Serialize caps under the account lock; replace the initiating session, then evict
the oldest non-current session when needed. Revocation/eviction and the qualified
notification commit together; a missing notification target denies issuance.
Forced credential/status revocation preserves originally bounded read-only
operation receipts. Explicit logout/account switch invalidates grants and receipts;
logout-all applies only to the resolved owner. These actions do not cancel Jobs,
dispatch providers or mutate Credits. A logout-only tombstone may validate an
exact Origin/CSRF retry until the original five-minute browser expiry; it grants
no config refresh, access or other mutation and never extends its lifetime.

T05A exposes unregistered thin config/session-list/revoke/logout handlers through
IdentityApplicationService. No createApp/bootstrap or global middleware cutover.
Captured request/response fixtures qualify handler contracts only; actual Express
body-limit, HTTP cookie and browser behavior remain transport/UAT checks. The
future Auth mount must enforce32KiB rather than inherit the existing20MiB parser.

### T05B Actor And Audit Integration Inputs (2026-10-11)

T05A is qualified as isolated private primitives; it does not yet emit session
Audit events. T05B must wire session_create/session_revoke/logout/logout_all
through Audit's public transactional facade before any real composition or
Authentication closure. Missing qualified Audit/peer binding denies mutation;
Audit failure rolls back Identity changes. Creation reuses its caller's live
transaction; logout/revocation must pass their own transaction, never a later
after-commit event. Trusted peer comes from the qualified request adapter, not
request body or forwarded headers. Keep event metadata typed and allowlisted.
Privileged status events must retain the verified staff actor and fingerprinted
target semantics through an explicit Audit-owned helper if necessary; do not
mislabel another account as self or access the Audit repository from Identity.

Resolve optional real actors from the session cookie only; guests are null.
Read current SQL account/status/version and protected roles with no positive
cache. Staff requires qualified MFA/bootstrap and persisted admin/support;
missing qualification denies. Request mock headers/query IDs are not credentials.
New-account compatibility username is its server-derived opaque account ID,
never a claimed mock username or email. No existing work, roles or Credits are
transferred. Preserve preference confirmCreditUsage boolean semantics, adding
an Identity-owned SQL column/migration if needed. Preference writes recheck active
account/current session inside their transaction. Status changes/reinstatement
advance securityVersion and revoke pending authority; only a newly verified
session restores access. Forced revocation preserves read-only receipt TTL.
Admin approval/reason/self-status restrictions remain authoritative.

T05B's new middleware/facade can be fixture-qualified with optional composition
injection; production mock exclusion and all private surface gates stay with
T15B/T15C. Do not start createApp, workers or live adapters to run isolated tests.

### T08A Google Start, Callback And Result Contract (2026-10-11)

`POST /api/auth/social/google/start` accepts login intent, optional
rememberDevice and safe returnPath; returns version1 authorizationUrl,
operationId and expiresAt with private HttpOnly flow/receipt cookies. A
reauthentication intent instead binds the existing actor/security version,
original Action context/target/initiating session and original expiry from
protected server state. Link completion remains T10A-gated.

`GET /api/auth/social/google/callback` accepts bounded scalar code/state or
error/state only. Provider callback has no application Origin/CSRF token;
original browser/flow plus one-use state and Google nonce/PKCE bind it instead.
Claim the durable SQL exchange before outbound token/JWKS work. After terminal
handling redirect only to fixed `/auth/callback?provider=google` without secrets.
The constant provider enum is a presentation hint for selecting the result
endpoint; it grants no authority and cannot substitute for protected server
flow/session binding. Bounded
read-only `GET /api/auth/social/google/result` returns recorded typed nextAction
and minimal safe returnPath/rememberDevice/contextId when required. The safe
rememberDevice presentation boolean is derived only from encrypted original
context metadata; it preserves the initial proposal across full-page callback
and registration resend, without creating proof or renewing original expiry.
Read binds actual original
restricted browser/flow or exact recorded resulting-session relationship after
rotation, never URL flags or caller provider claims. Reading cannot remint a
session, grant assurance, link or create an account.

Known subject enters common account-bound Login/session policy through a
separate immutable child context. Unknown authoritative Google email receives
registration-only social proof and requires explicit Terms/account creation.
Untrusted/missing email preserves the actual verified subject in restricted
enrollment; `POST /api/auth/social/google/email` accepts email only and issues
normal independent registration OTP. Existing email never auto-links or logs in.

Additive0012 may extend bounded exchange intent/provenance metadata.
Reauthentication uses internal Operation action social_login with separately
typed reauthentication purpose; Login requires Login purpose. The provider
exchange child references the immutable original Action and initiating session.
Callback verifies an already-linked subject owned by that actor and consumes
durable one-use proof in the same transaction that grants the original Action.
It does not consume the original Action as a provider-operation context or issue
a new session. Result nextAction is reauthenticated; single-factor Google proof
cannot satisfy required stronger MFA. No enabled link completion before T10A.
Actual provider/sender/runtime qualification remains outside isolated fixtures.

### T09A Facebook Fixture Contract Reconciliation (2026-10-11)

Facebook start/callback/result/email mirror the Google DTOs and protected
state/flow/session authority under `/api/auth/social/facebook/`. Fixed callback
presentation hint is `/auth/callback?provider=facebook`, never proof. Graph email
is not authoritative mailbox ownership; unknown subjects always require
`verify_email` and independent application OTP before explicit consent/signup.
The shared Social owner scopes every repository/proof read to exact provider
and expected issuer/app durably bound before exchange; verified issuer remains
separate provenance. Additive0013 may own the immutable expected scope. Every
pending state/context/claim/result lookup denies a different same-provider app.

Signed POST deauthorization/deletion accepts only `signed_request` through a
bounded32KiB urlencoded or JSON body. Verify native HMAC, wellformed bounded
issued-time and no-future timestamp before receipt lookup. NEW events additionally
require freshness5minutes. Exact previously authenticated retries may return
their unchanged receipt until its original24hour expiry, even after5minutes;
they cannot replay a mutation or renew authority. Unknown old/future events deny.
Capacity10000, bounded cleanup; retain sanitized private digest/outcome, never
raw tokens or signed payload logs. Account-version/session/pending-authority
revocation and Audit commit atomically once. Bounded hashed-subject provenance
blocks pre-event exchange/enrollment; a genuinely fresh later start is allowed.
Deletion returns only the D03 obligation receipt, never blanket product deletion.
Receipt URL derives a qualified fixed composition origin/path, never request
Host/query or signed subject. These fixture values do not approve production
retention, origins or provider launch.

Valid original-browser/flow/state-bound provider cancellation records the neutral
terminal result then uses its fixed callback hint, with no provider exchange,
account or session. Malformed, forged and expired callbacks remain denied.

### T07B Reset-Only HTTP Contract (2026-10-11)

Extend the existing challenge endpoint with `purpose: 'password_reset'` and
email only; rememberDevice and login/enrollment returnPath do not apply.
Verification submits only code under the original browser/flow cookie and
returns `reset_password` only for the exact eligible existing credential;
otherwise `unavailable`. It issues action-only assurance and never a session.
Action grant may reuse an explicitly supplied live transaction so consumed
sent-challenge provenance, immutable reset proof and assurance Audit share it.

`POST /api/auth/operations/prepare` for this flow accepts only
`{action:'password_reset',payload:{password,passwordConfirmation}}` plus the
Idempotency-Key header. The reset target is derived from protected immutable
flow metadata; no public account or credential ID is accepted. Preparation
returns `{contractVersion:1,operationId,expiresAt}` and separate HttpOnly
receipt cookie before commit. It does not consume assurance.

The existing canonical `POST /api/auth/password/reset` accepts
`{operationId,password,passwordConfirmation}` plus the same Idempotency-Key.
It commits the exact prepared payload through the owning Operation service.
Policy, mismatch, breach screening and native hash qualification run before
assurance consumption. Password replacement, security-version advance,
all-session/reset-grant revocation, sanitized outcome and Audit are atomic.
The minimal versioned operation outcome has `nextAction:'sign_in'`; preserve
browser/receipt for bounded reconciliation and clear restricted flow only.
No activation, enrollment, first password, session issuance or MFA bypass.
Lost success is reconciled by the existing minimal operation lookup rather
than replaying a mutation. Explicit logout invalidates that receipt.
The consumed sent-challenge provenance and additive0011 immutable Action
metadata own the reset proof; no additional reset migration is required.
Historical migrations stay immutable. Real runtime/verifier/mail qualification
remains a separate gate.

### T05C Action Assurance Implementation Inputs

T05C may proceed alongside T05B using completed T04A/T05A contracts and explicitly
non-overlapping write scopes. Root owns Action/Context/Operation changes; T05B
owns Session/Audit/Actor/Preferences and runner/registry/facade until handoff.
Use canonical sessions.resolveBound(transaction, secret); no second resolver.

Add migration0011 assurance columns to existing bounded context metadata, not
another unbounded proof ledger. The composition-owned context target resolver
binds immutable action/target for reauthentication or password_reset. Encrypt
those fields with the existing metadata and persist matching typed columns.
An exact durable one-use method proof in the same transaction records verified
time, assurance and initiating session only once, with original context/browser
expiry unchanged. Required MFA needs qualified stronger proof. Reset grants
require an existing password credential and never set a first password or mint
a session. Unsupported/missing actual verifiers deny; fixtures are not runtime.

Preparation and commit use the existing OperationService and its transaction-bound
proof guard, matching action/target/owner/version/browser and current initiating
session. Preparation does not consume assurance; commit consumes it atomically
with the existing mutation/outcome/Audit. Failure rolls back proof consumption.
Grant Audit uses Audit's public method with a qualified peerProvider, never a
request-supplied peer or foreign repository write. Maintain account/context/proof,
browser, then metadata/session order and fresh expiry checks after awaits.

Operation lookup either resolves a current owner session and exact owned operation
or verifies its pre-issued receipt under the active original browser in the same
live transaction. Return only operationId/status/nextAction/version. Unknown,
foreign, expired and revoked scopes have one denial. Forced credential/status
revocation leaves bounded receipt lookup; explicit logout/browser rotation denies
old grants/receipts. A receipt cannot authenticate, grant assurance or mutate.
Runtime facade/routes and runner/registry integration follow T05B's ownership
release; the whole T05C task remains incomplete until integrated and reviewed.

## 5. T02B Interaction Contract Freeze

AUTH-005 route/state matrix and AUTH-007 nine dispositions remain authoritative;
AUTH-009 adds local mode guidance. Forms route only by server nextAction.
All pending states use ProcessingSpinner, localized status and duplicate guards;
no UI implies an unconfigured method works. All errors distinguish retry/back,
expired proof, unavailable account after proof and unknown mutation outcome.

Preserve AccountPreferencesDialog Settings/Credit confirmation and all existing
Profile/Credits/Admin/navigation siblings. Reauth keeps permitted memory-only
drafts only for the same actor/mode; warn before redirect loss. Cancellation and
401/network errors gate stale private content. Clear open account/security
dialogs even on same-ID mode transitions. Exact responsive/theme/localization
evidence remains implementation/UAT, not a consequence of this freeze.

## 6. Acceptance Evidence

Prepared from T01 reviewed decisions and current Identity/Audit/API/actor sources.
T02A passed Backend `/root/auth_implementation_foundation`, Security
`/root/auth_decision_security` and QA `/root/auth_requirement_qa_review` after
aligning context TTL, specifying keyed idempotency fingerprints and interrupted
OAuth claim handling. QA mapped the three acceptance cases to concrete purpose,
foreign-operation and pre-issued-receipt checks. No runtime evidence is claimed.

T02B UX `/root/auth_dev_override_ux` passed route/state/recovery and preservation
contracts; QA `/root/auth_requirement_qa_review` also passed the interaction
acceptance traceability. Backend `/root/auth_implementation_foundation` explicitly
confirmed T02B nextAction/actor/mode/recovery consistency with server contracts.
No endpoints, domain tables or forms are
implemented by this file. DB-F01/F02 prerequisites have their own recorded evidence.
