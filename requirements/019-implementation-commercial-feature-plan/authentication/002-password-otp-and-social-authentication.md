# AUTH-002 Password, OTP And Social Authentication

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** Implementation authorized; local policy frozen in AUTH-010/011, challenge and private mail primitives qualified in AUTH-012; session/runtime integration pending

## 1. Password Authentication

- Email/password authenticates an active account with that credential. Customers
  need no extra OTP every time; enrolled/required MFA still applies.
- Proposed policy: minimum 15 characters, maximum at least 128, spaces/Unicode
  and paste/password managers supported; no arbitrary uppercase/symbol mix or
  forced periodic rotation. Reject common/compromised passwords using a vetted
  check that never discloses the full password to third parties.
- Use maintained adaptive hashing (Argon2id preferred if application-owned),
  unique salts and benchmarked cost. Record upgrade policy. Never reversibly
  encrypt, log, silently trim or truncate passwords. Managed credentials remain
  provider-owned, never duplicated locally. Do not invent cryptography.
- Public failures have consistent shape for unknown email, wrong password,
  missing password and non-active accounts. Status-specific help follows adequate
  identity proof. Avoid timing leaks; rate limit before expensive hash work.
- Passwordless accounts add a password through authenticated setup (AUTH-003);
  unauthenticated reset cannot silently add one.

## 2. OTP Purposes And Defaults

| Purpose | Valid proof permits | Does not permit |
|---|---|---|
| `registration` | Unknown/pending enrollment context; existing-account sign-in handoff only | Existing-account login/link/reset |
| `login` | Existing-account auth/MFA, or unknown-email restricted enrollment offer with explicit server exchange (AUTH-001) | Silent signup or password/email/link mutations |
| `password_reset` | Reset-only context | General session or first-password setup |
| `email_change_new` | Specific pending replacement email proof | Login/overwrite another owner |
| `link_email` | Specific authenticated email-method link | Automatic merge or another owner's credential |
| `reauthentication` | Short-lived action-bound assurance | Enrollment or stronger-MFA bypass |

Frozen fixture defaults (AUTH-010/011): cryptographically random 6-digit code, 5-minute lifetime,
5 failures per challenge, 60-second resend cooldown. Initial send caps: 5/hour
and 10/day per canonical email across purposes; 20/hour per source IP as an abuse
threshold with shared-network accommodations. These are tunable server policies,
not guaranteed email delivery times.

Verification also has cross-challenge/account/IP budgets; resend and purpose
changes never reset brute-force protection. Limits are shared across server
instances, expire, are bounded, and do not permanently lock a victim's account.
Risk-based bot checks supplement limits. Provider/global budgets protect cost;
this packet does not authorize spend.

## 3. Challenge Lifecycle And Delivery

`created -> pending_delivery -> active -> consumed | exhausted | expired | superseded | delivery_failed`.

Delivery acknowledgement does not prove mailbox arrival/ownership. Server time
is authoritative; expiry/cooldown timestamps support UI only. Out-of-order or
duplicate delivery callbacks cannot revive a consumed/expired code.

Bind challenge to canonical email, purpose, opaque ID, initiating browser/
enrollment context and target user/change ID. Store a keyed digest or managed
equivalent; a plain fast hash of six digits is insufficient against offline
guessing. Keep keys outside the DB. Never persist plaintext OTP except a bounded
encrypted delivery payload if the chosen outbox requires it; its access/deletion/
TTL must pass D05. No codes in URLs, analytics, error logs or Support screens.

Consumption, attempt increments, supersession and resulting action must be
atomic. Only one concurrent redemption wins. Resend supersedes the earlier code
when replacement is accepted; later delivery failure offers retry without
reactivating old codes. The same idempotency key reuses a send operation and
does not produce extra email.

Public request/reset responses have a generic `202` shape and opaque context,
including unknown users, missing passwords and blocked accounts. Bound equivalent
dummy contexts/work as needed; never expose account existence, enabled methods,
delivery IDs or distinguishable success timings. Genuine delivery outages may
produce generic service failure without revealing existence. Verify messages
combine wrong/expired/superseded where necessary; UI can display locally known
expiry from its own context.

Emails identify Momelo, purpose, expiry, recipient and ignore-if-not-you advice,
never passwords/private prompts/balances. Templates use locale fallback.
Diagnostics contain correlation IDs/sanitized codes. Bounce/complaint callbacks
are authenticated, deduplicated and scoped; suppression never changes ownership.
Prevent delayed delivery from silently extending code validity.

## 4. Google And Facebook

Both enter the same Identity facade/session policy. Safe server configuration
controls method availability. Production hides unconfigured providers; staging
diagnostics must not expose secrets.

- Use supported Google Identity Services/OIDC and Facebook Login integrations.
  Freeze exact protocol/library in T01.
- Request identity/profile/email only; no contacts, posting, Pages, ads or other
  scopes. Cancellation is a normal terminal state, not a half-active account.
- Bind initiation/callback with one-time state and exact allowed redirects;
  use PKCE/OIDC nonce where supported/applicable. For Google credential-post
  flows, use their documented CSRF contract; do not assume identical protocols.
- Server verifies issuer/app/audience, expiry, signature or supported token
  introspection, state/nonce and replay. Facebook tokens are not Google JWTs.
- Google key: verified `sub`; Facebook: validated app-scoped ID + app scope.
  Ignore separately client-submitted provider IDs, roles or email claims.
- Google email authority follows Gmail/Workspace rules; `email_verified` alone
  on third-party email is insufficient for current mailbox ownership/linking.
- Facebook may omit email or the user may deny permission. Provide email proof
  completion or email-login fallback with a short-lived social enrollment context.
  If a managed service cannot safely resume missing-email enrollment, T01 must
  settle a tested fallback before selecting it.
- Callback retries cannot duplicate users/sessions. Never log tokens; discard
  social access tokens after login unless a separate approved use needs them.
- Authenticated, idempotent deauthorization events remove that method's authority
  and invalidate affected sessions. They do not transfer accounts or delete all
  product data. Provider data-deletion obligations are a separate launch gate.

## 5. MFA Boundary

OTP as a password alternative is not MFA. Enrolled/required MFA still applies
after password, OTP and social login. Ordinary social success does not prove
the application's required MFA.

Production staff access requires supported authenticator TOTP or phishing-
resistant MFA, protected enrollment/recovery and no email-only downgrade.
T01 selects the mechanism; T12 implements and qualifies it. Staff access stays
disabled until validated.
Enrollment/removal/recovery requires stronger existing assurance or approved
recovery, one-time hashed recovery codes and audited session invalidation.
First staff-factor enrollment uses the D06 approved bootstrap/identity-proof
procedure and a restricted enrollment session; it grants no staff access until
factor confirmation. Notify the verified owner on enrollment, replacement,
removal and recovery-code rotation; rotation invalidates all prior recovery codes.

MFA verification has its own shared per-account/context/IP attempt budgets and
short-lived restricted login context; proposed maximum 5 failures per context,
with cross-context throttles that survive a new primary login. Use server time
and the selected factor's bounded clock-skew window. Reject a previously accepted
TOTP time step for that factor; atomically consume recovery codes so concurrent
requests have one winner. Factor removal/re-enrollment invalidates older MFA,
recovery and action-assurance contexts. Test wrong/expired/replayed factors,
clock-skew boundaries, parallel code use, throttling and no primary-session
issuance before MFA completes. Never let an attacker permanently lock the account
merely by submitting failed proofs.

## 6. Acceptance

AUTH-AC04: Each method covers invalid/non-active identities, pending MFA,
cancellation/outage and replay rejection without account enumeration.
AUTH-AC05: OTP expires, is single-use, purpose/context-bound and atomically
limited across workers; resend/delivery retries never reset verification budgets.
AUTH-AC06: Missing/untrusted social email cannot bind existing accounts without
required proof; actual provider protocols are validated.
AUTH-AC07: Password policy/storage passes Security review; no password/code/
session/provider secret appears in logs, durable browser state or public DTOs.

## References

- [Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Facebook integration and missing email](https://supabase.com/docs/guides/auth/social-login/auth-facebook) (reference, not vendor selection)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

Recheck provider requirements during implementation/staging qualification.
No approved Meta app or configured credential is claimed here.
