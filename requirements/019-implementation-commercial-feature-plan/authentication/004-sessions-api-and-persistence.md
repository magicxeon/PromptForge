# AUTH-004 Sessions, API And Persistence

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** Target HTTP/session contracts; SQL/private operation foundations implemented per AUTH-012, runtime endpoints pending

## 1. Session Contract

Use a supported implementation behind Identity; default browser contract is an
opaque server session in a host-only cookie with HttpOnly, Secure in production,
Path=/ and a reviewed SameSite policy (Lax default for same-site deployment).
Document cross-origin hosting and CORS/credential decisions in D03; no wildcard
credentialed CORS. Managed-auth refresh tokens, if needed, remain protected
server-side; no access/refresh/session token in localStorage or URL.

Store only a digest of an application session secret. Rotate after successful
login, privilege change and credential-changing actions. Preauth/enrollment/reset
contexts are separate restricted cookies/records, never accepted as normal
sessions. Protect unsafe requests and login/link initiation from CSRF; use exact
Origin checks and the AUTH-011 CSRF-token mechanism, without a Referer fallback. SameSite alone is
insufficient. Logout is a mutation, never a GET.

Frozen isolated implementation defaults (AUTH-010/011; real staff bootstrap D06
remains gated): customer idle 24 hours, absolute 7 days; explicit
Remember this device allows absolute 30 days with 7-day idle, no default opt-in.
Staff idle 30 minutes, absolute 12 hours, no remembered session. Reauthentication
is action-bound and at most 5 minutes old. Activity is authorized user activity,
not background polling keeping a session alive indefinitely.

The same explicit rememberDevice choice applies to password, OTP and social
customer flows. Bind it to the initiating challenge/social/enrollment context and
preserve it through MFA; final session issuance reads server-bound choice only,
never a callback override. Default false when absent; restarting a flow defaults
false unless the user explicitly selects it again. Staff policy always overrides
it to false. Signup completion can present the same control before activation.

Revoke current/all/by session ID; every private request checks authoritative
account status, expiry and revocation. No stale positive status cache may extend
access after revocation. If later caching is necessary, Identity must define
owner/key/TTL/invalidation/size and prove the same contract before adding it.
A status change revokes sessions and pending grants; Admin's current
`mock_actor_refresh_required` result cannot be production revocation evidence.

Session lists use opaque IDs, sanitized device/browser label, created/last-active/
expiry/current markers, cursor and maximum 50 rows. Raw tokens and precise
location are never returned. AUTH-011 freezes10 active customer sessions/3 staff;
when exceeded revoke oldest non-current and notify atomically. These fixture
limits do not approve a real staff bootstrap or deployment.

## 2. Actor And Authorization Boundary

Preserve the authenticated `/api/me` actor fields and internal owner IDs. Anonymous
response becomes explicit `null` (already permitted by route fallback, needs
client schema handling), not a fabricated customer identity. Role/permissions/
status are server-derived. Client-supplied user/role headers are never credentials.

Authentication middleware resolves optional real identity. Public Community
reads remain anonymous. Explicit registration/login/config/callback endpoints
must work without a session under their own CSRF/throttle rules. Private routes
require real active identity on reads AND writes; service/resource authorization
still rechecks owner/action. Invalid/expired supplied sessions return sanitized
401 on private routes. Proved-but-ineligible actions return safe 403.

Inventory all private surfaces, including assets, downloads, generated output
static paths, thumbnails, streaming/progress and Admin. Replace mock media query
credentials with session-authorized owning Asset routes or explicitly scoped
short-lived capabilities; no raw session in URL. A direct path cannot bypass
private media authorization. Existing public snapshots remain deliberately public.

Workers use scoped system actor + original requester, not browser cookies.
Logout does not cancel an accepted Generation Job, duplicate it or refund/capture
Credits. Suspension prevents new work; handling already accepted jobs remains the
Generation/Credits policy, explicitly tested and not redesigned in this packet.
No automatic retry of a billable mutation after re-login.

## 3. Planned HTTP Contract

Routes translate/validate and delegate to Identity. Client responses have owning
Zod schemas in the auth feature/shared actor contract. Schema/version freeze is
T02; exact naming changes require packet/caller updates before implementation.

| Method / path | Request / proof | Successful result |
|---|---|---|
| GET `/api/auth/config` | Anonymous | Available methods + public challenge/password policy, no secrets |
| POST `/api/auth/challenges` | Purpose, email when needed, operation context, idempotency key, rememberDevice for login/enrollment; CSRF | Generic 202, opaque challengeId, expiresAt/resendAt |
| POST `/api/auth/challenges/:id/verify` | Code + bound browser context | Purpose-specific nextAction; restricted context cookie or normal session only for login |
| POST `/api/auth/enrollment-intents` | Unknown-email enrollment offer + explicit Create account intent; CSRF | Same-email/browser registration-only context, no session; reject existing/colliding account |
| POST `/api/auth/register` | Enrollment context, displayName, optional password/confirmation, Terms version/acceptance, explicit rememberDevice choice | Idempotent activated account/session; requires fresh verified proof |
| POST `/api/auth/login` | Email/password, rememberDevice | Authenticated or MFA-required; generic denial otherwise |
| POST `/api/auth/social/:provider/start` | login/link intent, safe return route, rememberDevice for login, CSRF | Validated provider redirect URL; link requires active fresh proof |
| GET/POST `/api/auth/social/:provider/callback` | Exact provider-supported callback contract | Consume state/proof; redirect to safe completion, no secrets in URL |
| POST `/api/auth/password/reset` | Reset-only context, prepared operationId, exact password/confirmation and same Idempotency-Key; AUTH-011 frozen DTO | Minimal committed outcome; revoke sessions; normal login required |
| POST `/api/auth/operations/prepare` | Allowlisted action/target/final payload, independent fresh proof + CSRF | Pending operation and separate receipt issued before revoking commit; AUTH-011 bounded replacement |
| POST `/api/auth/reauthentication` | Existing durable method proof reference under immutable action context | Short-lived action assurance; incomplete MFA denied |
| POST `/api/auth/logout` | Session + CSRF | Idempotent 204; clear cookie |
| POST `/api/auth/logout-all` | Active session, confirmation, CSRF | Revoke all sessions including current |
| GET `/api/me` | Existing route; optional session | Existing authenticated actor shape or null |
| GET/PATCH `/api/me/preferences` | Existing routes; active session for owner | Existing preference DTO/policy |
| GET `/api/me/security` | Active session | Verified email, method summaries, MFA state; no secrets |
| POST/PATCH/DELETE `/api/me/password` | Fresh action assurance, credential proof as required | Add/change/remove; AUTH-003 revocation |
| POST `/api/me/email-changes` | Fresh assurance, proposed email | Pending change; OTP context |
| POST `/api/me/email-changes/:id/confirm` | Bound new-email proof | Commit, revoke, notify |
| POST `/api/me/login-methods/email` | Fresh assurance + link_email proof | Explicit email method enabled |
| DELETE `/api/me/login-methods/:id` | Fresh assurance + confirmation | Safe unlink or last-method conflict |
| GET `/api/me/sessions` | Active session + bounded cursor/limit | Paginated sanitized list |
| DELETE `/api/me/sessions/:id` | Owner session + CSRF | Revoke only owned session; unknown/foreign ID non-disclosing |
| POST `/api/auth/mfa/verify` | Restricted MFA context + factor proof | Finish auth; cannot choose a weaker factor |
| GET/POST/DELETE `/api/me/mfa/...` | Fresh stronger assurance or approved restricted first-enrollment bootstrap | Enrollment confirmation, management, recovery-code rotation; T02 contract freeze, T12 implementation |
| POST `/api/auth/recovery-requests` | Minimal help request, throttle/bot protection | Generic receipt via Support; no identity mutation |
| POST `/api/auth/provider-events/:provider` | Verified provider signature/protocol | Deduplicated deauthorization/data-deletion handling per approved policy |
| GET `/api/auth/operations/:id` | Bound owner or restricted operation context | Sanitized pending/succeeded/failed/expired result for this operation only; lost-response reconciliation |

Social linking completes only via the original authenticated, action-bound link
context. Verification success cannot substitute one nextAction for another.
Allowed entry outcomes include authenticate, mfa_required, offer_registration,
complete_registration, sign_in_existing and unavailable. AUTH-001 defines the
only purpose transition; the server issues fresh restricted enrollment context,
never converts registration proof to existing-account login.
AUTH-011 also freezes restricted OTP completion names: password_reset permits
reset_password, email_change_new permits confirm_email_change, link_email permits
complete_link, and reauthentication permits reauthenticated or mfa_required.
These are purpose-bound outcomes, not general session authority.
Browser sends no arbitrary target userId. Session/method/change IDs are rechecked
against the authenticated owner. Pending contexts are bounded and expire.

Errors: `auth_invalid_credentials`, `auth_challenge_invalid`,
`auth_rate_limited`, `auth_service_unavailable`, `auth_session_expired`,
`auth_reauthentication_required`, `auth_mfa_required`,
`auth_method_conflict`, `auth_last_method_required`, `auth_forbidden`.
Public pre-proof responses never expose account status/method presence. Retry
hints are bounded; messages localized; no raw provider error/stack.
Auth responses and callbacks use no-store; referrer policy prevents credential
leaks. Safe return paths are same-origin allowlisted relative routes, excluding
auth loops, scheme-relative URLs, encoded bypasses and staff paths without access.

## 4. Logical Persistence Contract

Logical entities below are DDL inputs, not a new JSON store or mandatory duplicate
of a managed Auth provider's tables. T01 identifies each authoritative owner;
T03 freezes constraints and Phase2-03 migration placement before DDL.

| Entity | Required fields/invariants |
|---|---|
| Account | internal ID, lifecycle status/version, display name, timestamps; no role from social data |
| Verified email binding | canonical/delivery email, userId, verifiedAt, enabled login/recovery flags; unique active binding |
| External identity | userId, provider, issuer/app scope, subject, linkedAt; unique external key |
| Password credential | userId, adaptive hash/algorithm/version/changedAt or provider reference; optional |
| Challenge/enrollment/reset grant | opaque ID, purpose, context/target binding, account security version, keyed digest, expiry, attempts, delivery/consumption/version; indexed expiry |
| Session | digest/reference, userId, auth method/assurance, created/last-active/idle/absolute expiry, revokedAt, credential/status version |
| Pending email/link operation | owner, proposed binding, proof/context IDs, expiry/version; no unbounded reservations |
| MFA | protected factor secret/provider reference, confirmedAt, replay marker, one-time recovery-code hashes, security-version-bound pending contexts; never public |
| Role membership | existing staff authorization vocabulary; separately authorized grants |
| Terms acceptance | userId, version, timestamp/source; separate optional marketing consent |
| Security event / delivery outbox | existing Audit contract plus reliable sanitized delivery; purpose-bound encrypted transient payload only if approved |

Transactions/unique constraints enforce signup, challenge use, reset + revocation,
email swap, link/unlink and status changes. Request IDs correlate work;
idempotency keys are scoped to operation/actor/context and reject changed payload
replay. Notification retry cannot roll back a completed security mutation.
If a mutation response is lost, reconcile its operation ID/idempotency key and
authoritative Identity state before retrying or showing success. Operation status
is context/owner-bound, expiry-limited, no-store and non-enumerating. Any bounded
refresh uses shared query infrastructure, stops on terminal state/context expiry/
logout/unmount, and has a fixed retry/size budget frozen in T02. Do not add an
unbounded feature-local polling service.
For reset/email-change that revokes the initiating session, an already-issued
short-lived restricted receipt may reveal only this operation's terminal state
and safe next action. It has separate protected browser binding, is not authorized
by the operation ID alone, cannot read account data or issue another mutation, and
does not restore revoked session/action grants. If that receipt is unavailable or
expired, require normal sign-in and reconcile authorized account state; never
infer success from the timeout. Final receipt mechanism is part of T02 freeze.
Issue the operation handle and separately protected receipt before committing a
session-revoking mutation, through the existing preparation/proof context. Persist
its outcome with the transaction or documented provider reconciliation. Forced
revocation by that mutation permits only the bounded receipt lookup; explicit
user logout/account switching clears receipt access as well. Terminal receipt
lookup ends refresh. Do not rely on a post-commit response to deliver the only
handle required to recover from losing that same response.
If provider/DB operations cannot be atomic, T03 specifies pending states,
idempotent retry, reconciliation and fail-closed exposure before schema approval.

No credentials in `server/data/identity/mockUsers.json`. Application identity and
audit projections use PostgreSQL; provider-managed secrets stay at the chosen
provider. Cleanup follows D05 with bounded batches, no live deletion in tests.
Sessions/challenges/rate limits must work across processes; no process-memory-only
production authority. Secret keys are supplied through server configuration and
secret management, never browser bundles or checked-in fixtures.

## 5. Cutover And Rollback

T15's [AUTH-013 inventory](013-private-surface-cutover-inventory.md) records current
actor/API/media/stream/transport consumers and explicitly unresolved mock-ID claims.
Preserve approved internal IDs; never convert all demo users or copy mock staff/
Credit seeds. Public routes, ownership checks and actor-scoped preferences retain
their owners. No generic Project migration is required to finish local auth.

Production cannot enable mock identity by config accident. Reject/ignore mock
headers/query credentials as proof, including valid, invalid and absent IDs;
private routes without a real session return 401. Non-production mock mode must
be explicit and visibly separate from real sessions. Missing production keys/DB
fail closed; no fallback to demo user, JSON auth or permissive anonymous access.

[AUTH-009](009-local-development-login-override.md) defines the only new automatic
fixture-entry mode: server-only `AUTH_DEV_BYPASS_ENABLED`, off by default, eligible
only in qualified isolated local development. T02 freezes its public mode
projection and actor schema. T19 validates config before composition side effects,
uses a fixed low-privilege actor and preserves ownership/CSRF/status gates. It
does not issue real sessions or security assurance. Disable plus restart removes
override authority; normal session validation then applies. AUTH-009 governs the
explicit local exception to real-session-only private access, not production.

Roll out behind explicit method/auth flags in isolated environments, preserve
old data until reconciliation and use compatible additive migrations. Rollback
may disable new login/methods and revoke sessions, not restore mock production
identity. Database rollback/data deletion/provisioning is separately authorized.
Authentication does not authorize exposing other unmigrated capabilities in
production; Phase2-20 gates remain.

## 6. Acceptance

AUTH-AC12: Rotation/revocation/idle/absolute expiry, CSRF and cookie policies work
across instances; status changes immediately deny private access.
AUTH-AC13: Every private read/write/media route enforces actor and resource
ownership; public reads retain explicit anonymous access.
AUTH-AC14: Production cannot accept mock identity injection or fallback, while
explicit isolated development fixtures remain usable.
AUTH-AC15: PostgreSQL/provider transactions and retries enforce uniqueness,
idempotency and secret hygiene; rollback never reopens a mock-auth bypass.
