# AUTH-003 Account Linking And Recovery

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** Specified; implementation not started

## 1. Linking And Unlinking

Active session -> fresh action-bound reauthentication (including required MFA)
-> prove new provider/email method -> confirm link -> atomic unique binding ->
notification/audit. A stale browser session alone cannot link a method.

When a first social login email matches a local account, hold a restricted
pending-link context. Authenticate the existing account with an already enabled
method and complete MFA before attaching the new subject. No automatic link from
email equality, including a managed service's automatic-link default. T01 must
prove the service can enforce this or reject the option.

A subject linked to another internal user is a conflict, not merge/transfer.
Show safe help without revealing the other owner's data. Linking preserves
`userId`, Credits, entitlements, ownership and roles; no registration bonuses.

Unlink requires fresh proof, explicit confirmation and at least one remaining
usable verified method. Count real usable methods, not stale badges/unverified
email; enforce atomically against concurrent unlinks. Invalidate pending flows
and affected sessions for the removed method; rotate/revoke the initiating session
according to remaining assurance. Notify the owner. Factor/recovery removal is
not ordinary unlink and cannot weaken MFA.

## 2. OTP Login Versus Password Reset

Distinct login-screen actions:

- Use OTP instead: `login` proof -> normal authentication -> MFA if required ->
  enter account. Password stays unchanged.
- Forgot password: generic request -> `password_reset` proof -> reset-only
  context -> new password/confirmation -> revoke sessions/reset contexts ->
  confirmation -> normal login. No normal session from reset proof.

Reset context: proposed 5-minute lifetime, single purpose/use, bound to user/
browser/challenge. Validate new password before atomically consuming final grant.
Retry after success cannot reset twice. Concurrent resets have one winning
credential version; older grants become stale. Password-policy errors must not
disclose existing credentials.

Revoke every prior session server-side, including any initiating session. Send
notification without secrets. Do not auto-login. Next normal login still requires
enrolled MFA; reset never removes staff protection or reactivates a suspended
account. Account-compromise recovery follows the stronger recovery policy.

Passwordless users log in by OTP/social, then explicitly Add password with fresh
action-bound proof. Generic reset responses disclose neither credential presence
nor an alternative means of silently creating credentials.

Every reset request/code/error/expiry screen offers unconditional Email me a
sign-in code and Back to sign in exits. Neutral guidance explains that users who
have not set a password can sign in first and add one in Account security. Preserve
entered email; switching creates a new login-purpose context and abandons the
local reset context. Never promise delivery for every request or leave users in
an endless resend loop. This guidance does not disclose credential presence.

## 3. Password Setup And Authenticated Change

Add: active session + fresh enabled-method proof/MFA -> policy-valid password ->
create credential/notify. Never require an invented old password.
Change: fresh current-method proof/MFA -> replace credential -> revoke other
sessions, rotate current session and notify. Reported compromise revokes all.
Removing a password follows last-usable-method protection.

Every credential replacement/removal/reset, email binding change, MFA change and
account-status restriction advances an account security version. Invalidate older
reset/enrollment/link/email-change grants, incomplete MFA login contexts and
action-reauthentication grants for that account. All pending proofs carry the
version they were issued against; recheck it atomically at consumption/commit,
not only when the first proof succeeds. A successful password change must make a
previously issued reset grant unusable. A retained current session receives a
new version only after the completed authorized action, never by copying a stale
grant. Test change-versus-reset, factor-change-versus-MFA and email-change-versus-
link races across workers.

## 4. Change Login Email

1. Require active account and fresh action-bound existing-method proof/MFA.
   An already linked method may work if old email is lost; otherwise recovery.
2. Enter new email; create pending change without modifying account.
3. Verify `email_change_new` OTP bound to change and initiating user.
4. Atomically check uniqueness/proof, commit email, invalidate old email
   challenges/reset grants, revoke sessions and require login.
5. Notify both old/new addresses. Notification failure becomes an operational
   retry, not a half-committed identity mutation.

Do not reserve email indefinitely from an unverified request. Existing social
subjects remain linked; their email claims never overwrite the application email.
An email owned by another user cannot trigger merging, wallet transfer or
ownership replacement. Return safe conflict help after adequate proof.
Closed-account email reuse remains D07.

## 5. All Methods Lost

Recovery help routes to the existing Support Case workflow where available,
with rate limiting and non-enumerating acknowledgement; no exposure of account
existence, balances, private media or email addresses.

Manual ownership changes stay disabled until D07 defines evidence, operators,
approval separation, notification/cooldown and audit retention. Display name,
public profile, screenshot, claimed email, payment screenshot or Support role
alone is insufficient. No identity-document collection without an approved
collection/retention policy.

Staff/high-risk recovery requires independent approval under Backend 007.
Support cannot edit credentials/session repositories, bypass MFA, grant Credits
or merge users. If enabled later, it issues an approved Identity command with
Case/reason/approval references; Identity rechecks policy. Lost social credentials
can be recovered at the provider; linked alternatives still follow account status.

## 6. Events And Idempotency

Audit link/unlink, password setup/change/reset, email change, recovery request/
decision and denial: actor, target internal ID, operation, timestamp, request/
Case correlation, outcome; no secrets/private work. Notifications/audit delivery
use deduplication keys; replay cannot mutate twice or send unlimited messages.
Durable failures remain observable and retryable. Audit never substitutes for
transactional identity/session enforcement.

## 7. Acceptance

AUTH-AC08: Link/unlink prove both sides, reject conflicts/concurrent last-method
removal, preserve owner IDs and never duplicate financial/provisioning state.
AUTH-AC09: OTP login leaves password unchanged; reset proof cannot login/link/
change email; successful reset revokes all previous sessions/reset grants.
AUTH-AC10: Email change requires fresh existing proof plus new-email proof,
preserves social subjects and blocks collisions/replay/old-email authentication.
AUTH-AC11: Recovery cannot transfer ownership or bypass MFA; without D07 manual
identity recovery remains unavailable.

Reference: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
