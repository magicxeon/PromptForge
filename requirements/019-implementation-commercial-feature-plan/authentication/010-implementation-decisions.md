# AUTH-010 Implementation Decisions And Execution Evidence

**Date:** 2026-10-10
**Status:** T01A/T01B design decisions reviewed and complete; runtime qualification remains per task
**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)

## Authorization And Scope

The user authorized implementation after AUTH-009. This supersedes the prior
wait instruction for source work and isolated tests. It does not authorize live
provider spend, real email recipients, data migration or production deployment.
Execute the task DAG and record evidence before advancing. No Auth task is
complete merely because its dependency infrastructure exists.

## T01A Authority And Candidate Decision

Select server-owned Identity orchestration with PostgreSQL and maintained
cryptographic/protocol libraries. This avoids delegating purpose transitions,
account provisioning, implicit linking or role assignment to vendor defaults.
IdentityApplicationService remains the single use-case boundary; libraries are
private adapters, not parallel routes or a second user/session store.

| Concern | Selected authority / feasible implementation | Evidence / remaining proof |
|---|---|---|
| Numeric purpose-bound OTP, contexts and sessions | Identity transaction model; Node cryptographic randomness/HMAC; PostgreSQL atomic consumption | [Node crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html); implementation tests still required |
| Optional passwords | Identity absence/presence of credential; Argon2id via argon2 0.45.1 | [Maintainer API](https://github.com/ranisalt/node-argon2); native runtime compatibility and cost benchmark before password task |
| Google OIDC | Identity-owned one-time state/nonce/PKCE, jose 6.2.12 signature/issuer/audience verification | [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect), [jose](https://github.com/panva/jose); app credentials and staged qualification pending |
| Facebook | Graph API v26.0 manual server code flow, one-time state, exact redirect, app-token debug validation, app-scoped subject; native fetch with bounded timeout, no JWT assumption | [Meta manual flow](https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow), [official versions](https://developers.facebook.com/docs/graph-api/changelog/); direct read-only fetch recovered HTTP 200 and verified these contracts |
| Missing/untrusted social email | Restricted social enrollment retains verified provider subject, independent email proof, explicit Terms, then atomic binding | Application-owned transition in AUTH-001/002; fixture proof required before social adapter completion |
| Linking | Explicit owner + fresh action proof only; database unique subject/email bindings, no auto-link by email | Application contract; malicious email-match fixtures required |
| Revocation/MFA | Server session/status versions; otpauth 9.5.2 TOTP with database replay/attempt/recovery consumption | [OTPAuth API](https://hectorm.github.io/otpauth/); actual all-method enforcement remains T12 acceptance |
| Email | SMTP adapter using Nodemailer 10.1.0, injected fake delivery for tests | [SMTP transport](https://nodemailer.com/smtp); actual vendor/sender/budget remain D02, no live send selected |
| Persistence | pg 8.23.1, Phase2-03 shared infrastructure; Identity and Audit retain their repository owners | [pg transactions](https://node-postgres.com/features/transactions); disposable PostgreSQL qualification before T03 |

Alternative considered: Better Auth supplies email OTP and explicit-link controls
([OTP](https://better-auth.com/docs/plugins/email-otp),
[account linking](https://better-auth.com/docs/concepts/users-accounts)). It is
not selected because this packet needs an application-owned enrollment-offer
exchange, operation receipts, status-version invalidation and atomic cross-owner
Audit contracts that still require dedicated integration proof. This is a scope
fit decision, not a claim the library cannot implement them. A managed vendor
is not selected without equivalent proof and material residency/cost decisions.
No framework with mandatory implicit email linking may be substituted.

Versions above are npm metadata inspected on this date, not installation or
security-certification evidence. pg was installed for the independent foundation;
T04B subsequently installed exact Nodemailer10.1.0 with lifecycle scripts disabled
for inactive SMTP/MIME qualification. T06B prerequisite qualification subsequently
installed exact Argon2id0.45.1 with lifecycle scripts disabled and exercised the
bundled Windows native binary. jose/OTPAuth remain uninstalled.
Libraries must pass focused adapter tests before use.

## T01B Local Policy Freeze And External Gates

Reviewed T01B design values for isolated fixtures; these are not approved
real-data/production defaults:

- Email v1: trim outer whitespace, ASCII local part, IDNA-normalized lowercase
  domain, case-insensitive local binding key; preserve submitted spelling for
  delivery/display. Reject SMTPUTF8 local parts explicitly. Never strip dots or
  plus tags. No migration of existing real emails; collisions are errors.
- Password: 15-128 Unicode code points, no trim/normalization/truncation; vetted
  breached/common-password check required before credential creation acceptance.
  Argon2id initial candidate 64 MiB, 3 iterations, parallelism 1, 16-byte salt,
  32-byte output; T06B must benchmark before enabling any password path, with an
  explicit concurrency cap and reject-on-cap behavior. T06A/T06B cannot expose
  credential creation/login until vetted compromised-password screening and
  native library/parameter qualification pass; only isolated tests may run first.
- OTP: AUTH-002 six digits/5 minutes/5 attempts/60-second resend and shared limits.
  Server binds purpose, browser, owner/security version and action. No persistent
  plaintext code; transient encrypted delivery payload requires explicit TTL.
- Sessions: customer idle 24 hours/absolute 7 days; explicit remembered device
  idle 7 days/absolute 30 days. Staff idle 30 minutes/absolute 12 hours and no
  remember option. No opt-in default; staff limits override customer preference. Context/action/receipt TTL
  capped at 5 minutes, one-time consumption where specified, no-store outcomes.
- MFA: TOTP via maintained library, 30-second step, 6 digits, one adjacent step
  window; persist last accepted step and atomically consume recovery codes.
  No passwordless/email recovery downgrade. Staff remain unavailable until a
  separately reviewed protected bootstrap and all-method MFA tests pass.
- Manual account recovery disabled pending D07 evidence/operator policy. No
  mock-account ownership claims, staff promotions or financial provisioning.
- Local fixture persistence is disposable and separately namespaced. Do not
  infer production retention or residency from test cleanup. No real Identity
  collection/cleanup before D05 approval; automatic retention deletion stays off.
- Missing Terms/Privacy version or provider credentials prevents the affected
  real enrollment/method from being advertised. Test fixtures supply explicit
  fixture-only document versions; never ship placeholder legal acceptance.

D02 sender/vendor, D03 deployed origins/provider app approvals, D05 real-data
retention/residency, D06 protected staff bootstrap, D07 Support recovery and D08
legal versions/data claims remain named release or affected-runtime gates.
The SMTP question was sent to the user; no answer is inferred from elapsed time.
Unconfigured live adapters fail closed; independent isolated work may proceed.

## Current Prerequisite Evidence

### Independent Password Prerequisite Qualification

While T05A implements sessions, Lead qualifies only T06B's independent native
password adapter prerequisite. No enrollment/login endpoint or credential
persistence is activated, and T06B remains incomplete until its dependencies and
full acceptance pass. Write scope: package.json/package-lock.json,
server/domain/identity/adapters/IdentityPasswordAdapter.js,
test/authentication/passwords.test.js and
scripts/authentication/qualify-passwords.mjs. The owning runner's passwords group
will be integrated after T05A's non-overlapping runner edit.

Install exact Argon2id library with lifecycle scripts disabled; verify its bundled
native binary rather than compile/download helpers. Enforce the frozen15..128
Unicode-code-point creation policy without trimming, normalization or truncation.
Creation requires an explicitly qualified compromised-password screening adapter;
missing, unavailable or rejected screening denies. Tests use fixture screening,
never claim a vetted production corpus. Bound native jobs across adapter instances
to two with no queue, retain capacity until actual completion, and sanitize errors.
Verify only bounded PHC parameters; malformed/unsupported stored hashes must not
request unbounded memory. Preserve valid approved legacy hashes for verification
and report rehash need without changing credentials here. Focused acceptance:
actual native round-trip/wrong-secret/Unicode preservation, malformed/resource
hash rejection, screening denial, cross-instance capacity and cost benchmark.
Record CPU/platform/runtime, sample median/p95 and two-job memory budget; these
measure this workspace, not production sizing. Independent Security/QA review is
required before this adapter may be consumed by credential tasks.

The first sandbox Docker metadata call failed access; an approved read-only retry
confirmed Docker server 29.8.0. pg 8.23.1 installed with scripts disabled. A fresh
PostgreSQL 17 container qualified the foundation using disposable test schemas;
no application database or `.env` was used. See [DB foundation](../database-foundation.md).
No completed Auth runtime behavior is claimed here.

Independent Security `/root/auth_decision_security` found T01A selection closure
blocked by missing authoritative Facebook protocol/version evidence. Multiple
primary page fetches returned unavailable/429; no third-party description is
used as a substitute. A later direct read-only fetch of the official redirected
Meta manual flow and changelog succeeded (HTTP 200): v26.0 is documented,
including dialog state, code exchange and debug_token app_id/user_id validation.
The changelog dates v26.0 to 2026-07-29. Freeze v26.0 for this adapter; never accept
an arbitrary request-provided API host/version. Validate is_valid, app_id,
user_id, token type, expiry and granted identity scopes before subject use;
missing email enters the restricted enrollment path. Provider tokens remain
server-only and are discarded after proof. Staging still must qualify real app
configuration and deauthorization/data-deletion callbacks.

Final Backend `/root/auth_implementation_foundation`, Security
`/root/auth_decision_security` and QA `/root/auth_requirement_qa_review` passed
the bounded T01A/T01B design/policy scope. The protocol feasibility finding is
resolved; independent reviewers attribute successful Meta retrieval to Lead.
T01A/T01B are complete as design tasks, not runtime authentication evidence.
Dependent tasks activate only after their own prerequisites and review gates.
The policy-clarity finding is addressed above with explicit fixture
session values and password screening/benchmark enablement gates. The independent
Phase2-03 infrastructure prerequisite DB-F01/F02 is also complete with 16 contract
and 7 disposable PostgreSQL tests; its own evidence records reviewer boundaries.
