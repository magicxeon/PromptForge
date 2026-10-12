# AUTH-001 Account Lifecycle And Boundaries

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** Implementation authorized; lifecycle/runtime flows pending, foundations recorded in AUTH-012

## 1. Scope And Actors

Actors: anonymous visitor, pending registrant, active customer/creator,
suspended/disabled account, staff, system worker and Support within a Case.

In scope: email/password registration/login, passwordless email OTP login,
email verification, Google/Facebook login, optional password setup, link/unlink,
forgot/reset password, email change, session/device management, secure return
navigation, status enforcement, security notifications and gated recovery.
Local development also supports the explicitly enabled server-side
[AUTH-009 Login override](009-local-development-login-override.md); it supplies
an isolated fixture identity, not account verification or elevated permissions.

Out of scope: new payment/bonus-Credit policy, wallet merging, automatic mock
account claims, organization invitations, SMS/phone login, additional social
providers, customer KYC, public verified badges, broad database migration and
self-service deletion of all product data. Closed-account enforcement is in
scope; a new deletion/retention product is not. Customer passkeys are a later
extension; strong staff MFA is a prerequisite to production staff access.

## 2. Canonical Ownership And Planned Placement

| Concern | Owner and public boundary | Planned extension |
|---|---|---|
| Account, methods, challenges, sessions | Identity: `server/domain/identity/` | `IdentityApplicationService.js` facade with focused internal services |
| Identity persistence | `server/repositories/identity/` | PostgreSQL adapters; shared DB infrastructure stays in Phase2-03 |
| Account status | existing `AdminIdentityService.js` | Identity session invalidation; preserve Admin permissions and audit reason |
| HTTP | `server/app/routes/identityRoutes.js` and existing composition | Proposed `authRoutes.js`; transport calls Identity |
| Actor resolution | `server/middleware/actorContextMiddleware.js` | Verified server session; explicit non-production mock adapter |
| Auth/email provider integration | Identity-internal `server/domain/identity/adapters/` | Protocol/delivery adapters; no AI registry or Generation dependency |
| Auth configuration | `server/config/` | Proposed `authPolicy.js`; public projection omits secrets |
| Forms and security settings | proposed `web/src/features/authentication/` | API/Zod schemas, routes, form hooks; no second actor store |
| Shared actor/transport/persistence | existing `web/src/lib/auth/`, `lib/api/`, `lib/persistence/` | Extend existing owners |
| Shared account menu | `web/src/components/layout/AccountMenu.tsx` | Auth actions without moving Profile/Credits/Admin siblings |
| Audit | `server/domain/audit/AuditService.js` | Sanitized events; durable adapter coordinated with Phase2-03 |

The table names capability boundaries. Implemented private persistence/operation
services are recorded in AUTH-012 and099; public facade/routes/forms remain planned.
Dependency: React feature -> apiClient -> HTTP -> Identity facade -> Identity
repository/adapters; Identity -> Audit/Support public contracts when needed.
No other capability reads credentials/challenges/session repositories directly.

## 3. Identity Invariants

- One internal opaque `userId` owns work and survives email/method changes.
- External identity key is `(provider, issuer/app scope, subject)`; never an
  email, display name, avatar, username or client-supplied role.
- A verified email used for login belongs to at most one active identity binding.
  Provider subjects also have database uniqueness, including concurrent requests.
- Freeze one versioned email canonicalization policy before indexing: trim input,
  canonicalize domain, preserve submitted address for display/delivery; never
  strip dots or plus tags. Resolve local-part casing/SMTPUTF8 and collisions in
  T01/T03 before DDL; UI and server share the rule.
- Methods never create extra balances for the same account. Provisioning retries
  are idempotent. No free Credit grant is introduced. Existing provisioning, if
  needed, is invoked only through its owning facade.
- Login email is private. Display name is distinct and not identity proof.
  Social avatar/name are suggestions, not automatic public publication.
- Signup grants the baseline customer role only. No demo/staff role, ownership
  claim or activation is inferred from matching email/name.

## 4. Registration And Onboarding

Email: email -> registration OTP -> short-lived enrollment context -> name,
optional password and required Terms acceptance -> transactional activation ->
normal session (MFA first when applicable) -> safe return route. The user may
omit a password and use OTP, or explicitly choose password signup. For password
signup, enter/confirm the password at completion, after email proof. Never persist
a pre-verification password draft in browser storage.

Social: validate callback -> resolve external identity -> if new, complete email
assurance and minimal onboarding -> activate. Missing/untrusted email requires
independent OTP before account activation. Every new active account has a verified
application email; authoritative provider proof may satisfy it without a second
email code. Onboarding explains that this address is the default email-code
sign-in/recovery method. A provisional provider
context is not an active account. Email conflicts use AUTH-003 linking; do not
create an orphan account or reveal enabled methods before adequate proof.

Returning linked-provider users do not repeat signup or replace application email
from provider claims. New social enrollment with missing/denied email offers email
entry and verification; collision offers existing-account proof; cancellation
returns to sign-in; expired context restarts provider proof, retaining only
non-sensitive form input.

OTP login to an unknown email does not silently create an account: after email
proof show explicit signup completion with Terms. Reset requests never enroll.
Pending contexts confer no private access, wallet, entitlement, public profile,
staff role or billable capability.

Record Terms version, acceptance timestamp and source. Show Privacy notice
separately; optional marketing consent is unselected and not a login gate.
Legal copy/version/retention needs the existing policy owner before launch.
Do not collect birth date, phone, postal address or government documents here.

### Purpose-Safe Entry Handoffs

| Entry after valid proof | Server-authorized next action | User continuity |
|---|---|---|
| Login code, active existing account | Authenticate, then required MFA | Safe return; no onboarding |
| Login code, unknown email | Restricted enrollment offer, no session; explicit Create account exchanges it for registration-only context | Preserve email/return path; Terms before activation |
| Registration code, unknown/pending enrollment | Registration-only completion/resumption | Continue incomplete fields; no duplicate user |
| Registration code, existing account | Sign-in handoff only; require a fresh enabled login method | Explain after proof, preserve email; no repeated profile form |
| Either entry, unavailable account after adequate proof | Safe status/help | No alternate-method activation or automatic recreation |

Enrollment-offer exchange is scoped to the same verified email/browser and
account-security version if present. It cannot be selected by changing a client
purpose field, reused for an existing account or bypass Terms. Recheck uniqueness
and status at completion; a concurrent new account requires existing-account
proof, never overwrite. Do not reveal existence/methods before mailbox proof.
Registration proof never logs into an existing account. No second code is needed
solely for explicit unknown-email enrollment; expired/mismatched contexts restart.

## 5. State And Assurance

| State | Allowed behavior | Transition |
|---|---|---|
| Pending proof/onboarding | Complete enrollment only | Verified proof + required onboarding -> active |
| Active | Own authorized resources; feature gates still apply | Guarded status command |
| Suspended | No normal session/private reads/new billable commands | Authorized reinstatement; login never reinstates |
| Disabled | Same denial; preserve administrative distinction | Explicit lifecycle mapping/reinstatement |
| Closed | Deny login, linking and automatic recreation/claim | Separate retention/recovery policy |

Email verification, status, method presence, MFA and session assurance are
separate fields. Session expiry does not suspend an account. Provider email
changes never overwrite the application email. Freeze existing
`disabled`/`accountStatus`/`status` mappings in T03/T05. Pending contexts may be
separate records rather than rows in the active user table.

## 6. Decision Register

User-selected scope: password + OTP fallback/login + Google + Facebook.
The user's subsequent implementation instruction authorizes source and isolated
qualification. AUTH-010 records settled local choices; remaining decisions below
gate the affected live activation or migration, not independent fixture work.

| ID | Decision | Owner / gate |
|---|---|---|
| D01 | Managed Auth versus maintained library/server-owned auth; numeric OTP, optional passwords, explicit linking, revocation, MFA, provider support | Backend + Security, T01 before dependencies/code |
| D02 | Email vendor, sender domain, region, bounce handling, SPF/DKIM/DMARC, sandbox mailbox and cost cap | Product/Backend; user decides material spend/region, T01 before live send |
| D03 | Hosting/cookie origins, provider apps, callback/deauthorization/deletion URLs, Meta permissions/review requirements | Backend/Security, T01 then staging T17; no secrets in docs |
| D04 | Email canonicalization and conflicts; provider-owned versus application-owned credential/session storage | Backend/Security, T01/T03 |
| D05 | Audit/security/session metadata and abandoned-enrollment retention, residency and cleanup | Product/privacy owner before production persistence/cleanup; no invented retention approval |
| D06 | Challenge/session defaults, MFA mechanism and staff recovery/bootstrap | Backend/Security, T01; product reviews remembered-device duration |
| D07 | Recovery evidence/operators, two-person approval for staff/high-risk accounts, closed-email reuse | Product/Security/Support, T01; otherwise manual recovery disabled |
| D08 | Terms/Privacy versions and any approved test-account data claims | Product; explicit migration approval only, T15/T17 |

## 7. Acceptance

AUTH-AC01: Each method maps to one durable account and owner ID; concurrency
cannot duplicate identity bindings/provisioning.
AUTH-AC02: Pending/suspended/disabled/closed identities never gain access through
another method, recovery, mock header or matching email.
AUTH-AC03: No public profile, marketing subscription, role elevation or financial
grant is a hidden signup/link side effect; unresolved decisions remain explicit.
