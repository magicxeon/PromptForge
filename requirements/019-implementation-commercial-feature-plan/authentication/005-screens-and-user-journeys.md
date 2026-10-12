# AUTH-005 Screens And User Journeys

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** Interaction specification; no screens implemented or visually verified
**Primary user:** Returning creator/customer entering their workspace; new users
complete minimal onboarding once.

## 1. Scope And Preservation

Own login/signup/OTP/reset/callback pages, account security settings, guest header
entry, logout actions and authentication interruption. Preserve Profile, Library,
Credits, Admin (when authorized), preferences/theme/language, Community browsing,
Generation result actions, queue, existing drafts and responsive navigation.
Do not redesign sibling screens, reassign publication or change Credit workflows.

Use the [canonical visual language](../../Knowledge/ui-design-system-and-visual-language.md)
and its referenced landing/logo images before UI implementation. Login is a
compact operational form in existing theme tokens, not a new marketing layout.
Images are visual references, not new publication/branding decisions.

## 2. Route And Screen Inventory

Proposed routes use React Router/routeRegistry; shared route guard consumes the
existing ActorProvider. Do not add a second global auth store.

| Route / surface | Content and actions | Successful destination |
|---|---|---|
| `/login` | Google/Facebook; email/password; show password; optional remember; OTP instead; forgot password; signup | Authorized saved return path, otherwise existing workspace/home |
| `/register` | Email or social entry; concise Terms/Privacy notice; no redundant profile form | Verification then onboarding |
| `/auth/verify` | Purpose-specific title, masked email, code, resend timer, edit email, back | Only server-authorized next step |
| `/auth/complete` | Display name, optional password/confirmation, Terms acceptance; missing social email step | Activate then safe return |
| `/forgot-password` | Email + generic acknowledgement; clear link to OTP login | Reset OTP challenge |
| `/reset-password` | Reset-only context, new/confirm password and guidance | Success then login, no auto-login |
| `/auth/callback` | Accessible processing, cancellation/failure/retry, no token display | Login, onboarding, link proof or workspace |
| `/account/security` | Verified email, linked methods, password add/change/remove, sessions/MFA/recovery help | Inline confirmed result |
| `/account/security/sessions` or section | Bounded device list, current marker, revoke one/all confirmation | Updated list or login if current revoked |
| Recovery help | Existing Support/help entry with safe guidance | Generic receipt, never automatic ownership change |
| Expired session interruption | Explain expiry, secure re-login and draft handling | Same owner's workspace only |
| Header/menu | Guest Login/Signup; authenticated account menu + logout/security | Preserve existing profile/preferences/Credits/Admin behavior |

OTP login to a new address reaches explicit signup completion after proof, not a
silent account creation. Registering an already owned email routes to safe
existing-account proof, never overwriting its password/name or granting benefits.

## 3. State Matrix

| State | Required behavior |
|---|---|
| Initial | Clear primary action and labels; no account-existence disclosure |
| Submitting/sending/verifying/callback | Shared ProcessingSpinner + localized accessible status, prevent duplicates; safe back/cancel |
| OTP input | Numeric keyboard, paste/autofill of entire code, stable focus, edit email invalidates old local context |
| Invalid password/OTP | Inline accessible error; preserve email; local password-policy/mismatch errors retain password in component memory, credential rejection clears rejected secret; termination clears secrets |
| Expired/superseded code | Explain unusable code and offer policy-controlled resend; no perpetual spinner |
| Cooldown/rate limit | Server-based remaining wait and alternate method/help; no fabricated progress |
| Delivery/provider outage | Retry/back/alternate method; no unintended account/method creation |
| Provider cancelled/popup blocked | Normal return; accessible fallback/redirect for chosen integration |
| Missing social email | Explain why email proof is needed; allow correction or email method |
| Link conflict / last-method removal | Explain safe next action after proof; no account merge or other-owner details |
| MFA required | Restricted next step; no workspace exposure before completion |
| Account unavailable | After adequate proof, status/help; before proof keep generic denial |
| Reset/email-change success | Explicit completion; login as required; never replay prior billable action |
| Loading security page | Accessible loading; stale credentials/actions hidden |
| Anonymous/security page or stale session | Login with safe return; no private flash while identity is unresolved |
| Enrollment/reset/reauth context expired | Explain restart, preserve entered email/safe destination only, clear old proofs; no widened authority |
| Mutation response lost | Outcome unknown; reconcile authorized operation state, no premature success/blind retry |
| 401 / 403 / connectivity failure | 401 requires re-login; proved restriction shows help; network outage offers retry without claiming logout/account switch; gate private content until identity confirmed |

Do not show unsupported methods or a Settings action leading to an empty screen.
Messages do not claim an email definitely arrived. A countdown is cooldown/expiry,
not delivery progress. Edit email/back cannot bypass challenge-purpose validation.

## 4. Shared Components And Infrastructure

| Existing owner | Reuse/extension |
|---|---|
| `web/src/components/ui/Button.tsx`, `Surface.tsx` | Consistent actions and form surface |
| `ProcessingSpinner.tsx`, `AsyncState.tsx`, `StatusNotice.tsx` | Pending/error/status feedback; reduced motion |
| `ConfirmDialog.tsx`, existing Toast | Logout-all/unlink/revoke confirmation; no toast-only form errors |
| `web/src/components/layout/AccountMenu.tsx` | Security/logout additions; preserve siblings |
| `web/src/lib/auth/ActorProvider.tsx` | Anonymous/authenticated/resolving/expired lifecycle |
| `web/src/lib/api/apiClient.ts`, query keys | Credentialed transport, CSRF, actor isolation; no feature raw fetch |
| `web/src/lib/persistence/` | Existing actor-owned draft contracts and cleanup |
| `web/src/app/routeRegistry/` | Route metadata and access policy |

Auth-specific form/OTP controls belong in the auth feature unless a real shared
consumer justifies promotion. UI emits intents; server owns status, limits and
proof. Safe config/method summaries are server state through TanStack Query.

## 5. Navigation, Drafts And Multiple Tabs

Return routes are sanitized on both server/client, same-origin and authorized.
Never accept arbitrary external `returnTo`, auth loops, privileged route grants,
or provider callback URLs from user input.

On expiry: cancel private in-flight reads, stop exposing stale private data and
pause new mutations. Keep unsaved work only in a temporary in-memory envelope
bound to the prior actor while a controlled re-login is pending. Clear persisted
actor drafts at the auth boundary per repository policy; no new durable secret/
prompt cache. Restore memory-held work only after the SAME actor authenticates.
A different actor, explicit logout, closed tab or reload discards the temporary
buffer; UI must explain when unsaved work will be lost. Saved server work remains.

Logout/account change: clear private Query state, actor-owned local drafts,
media blobs/object URLs and pending handoffs; cancel/ignore late responses.
Broadcast only invalidation signals across tabs, never tokens/prompts. Other tabs
clear private state and re-resolve identity. Browser Back must not reveal stale
private content. Do not auto-switch silently to another provider account.

Already accepted Generation work continues under its owner; re-login reads status
through the existing workflow. It never re-submits Generate, captures Credits,
cancels jobs or transfers draft/output ownership automatically.

## 6. Responsive, Accessibility, Theme And Locale

### Expert UX Review Corrections (2026-10-10)

**Entry hierarchy and handoffs.** Password login has one primary submit action.
Email me a sign-in code is a distinct alternative; Google/Facebook are grouped
separately. Forgot password sits with the password field; signup is secondary
navigation. Preserve entered email across method changes and follow AUTH-001's
server-authorized nextAction table. Existing-account registration never silently
logs in; new-email login never silently signs up. Reset always has neutral code-
login/back exits, including after errors. Use customer copy such as email code /
รหัสยืนยันทางอีเมล rather than requiring familiarity with the acronym OTP.

**Onboarding and forms.** Verified application email is required before activation;
authoritative social proof avoids unnecessary repeat verification. Onboarding
offers an explicit Set a password option; reveal password/confirmation only when
selected. Explain passwordless sign-in otherwise. Validate locally without erasing
a password-manager-generated value on mismatch/policy errors. Password controls
use appropriate current/new-password semantics; login identifier supports username
autocomplete with email input semantics. Visibility toggle preserves focus/value,
announces state and never persists the value. Termination/account change clears
secrets; no secret in URLs, analytics or durable browser storage.

**Email-code behavior.** Prefer one semantic text input, numeric input mode,
one-time-code autocomplete and leading-zero preservation. Full-code paste works;
submit once on the user's explicit action, without focus jumps. Resend explains
supersession and clears obsolete code without continuously announcing timer ticks.
Display the user-entered destination clearly enough to spot typos, never reveal a
server-resolved private address. Edit email cancels local obsolete context.

**Account security sections.** Separate application email/verification, optional
password, Google/Facebook methods, MFA, sessions and recovery help. Settings keeps
opening AccountPreferencesDialog; Account security is a separate menu entry.
Preserve Profile, Credits, Credit-confirmation preference and authorized Admin.
Provider state distinguishes linked, unlinked, unconfigured and temporarily down.
Show remaining usable methods before unlinking, plus clear last-method refusal.

| Security action | Confirmation/proof | Completion and session effect |
|---|---|---|
| Add password | Fresh action proof; no invented old password | Inline success after acknowledgement; method list updates |
| Change password | Fresh method/MFA proof; warn other sessions end | Rotate current, revoke others; update only after known success |
| Reset password | Reset-only proof; warn all sessions end | Success then login; no auto-login |
| Change email | Fresh old-method proof + new-email code; warn logout | Reconcile commit, notify both addresses, normal login |
| Link/unlink method | Fresh proof, explicit target/remaining-method confirmation | Update linked methods; explain affected sessions per AUTH-003 |
| Sign out this session | Explicit user action | Login/guest surface and private-state cleanup |
| Sign out another session | Show selected device; confirm | Current session remains; list reconciles |
| Sign out all sessions | Explicitly say including this one | Login/guest surface; all tabs clear private state |

**MFA screens.** Add restricted factor challenge, approved alternate/recovery-code
entry, staff bootstrap enrollment, authenticator setup/confirmation, one-time
recovery-code presentation, rotation, replacement and removal confirmation.
Enrollment/replacement follows D06: first staff enrollment uses approved bootstrap
proof rather than requiring a factor that does not yet exist. Show invalid,
expired, throttled, cancelled and unavailable-recovery states with safe exits;
never offer email-only bypass. No workspace before required confirmation.
Recovery secrets are transient and excluded from browser storage/telemetry;
explicit user copy/download and acknowledgement follow the chosen security policy.

**Reauthentication and draft continuity.** Prefer in-page email/password/code or
a supported popup/secondary-context social flow that leaves the original page's
memory buffer alive. Validate callback origin/state through the chosen protocol;
cross-window notification is only a completion signal, never an auth token or
draft transfer. Before a same-tab redirect fallback, warn that unsaved work will
be lost and offer in-page sign-in or Cancel. Do not promise preservation through
reload/redirect. Different-account completion discards the former actor's buffer;
same-account success returns to the interrupted workspace without submitting work.

**Pending and uncertain outcomes.** Caller-controlled confirmation state must stay
pending until the result is known, show failure/retry accessibly and prevent double
submit. Existing ConfirmDialog does not establish this async contract; extend it
only with explicit sibling regression coverage, or keep pending/error in the
owning section. Lost responses use authorized operation reconciliation from
AUTH-004; expired context offers safe re-login/restart, never blind replay.
When D07 recovery is unavailable, show honest static guidance and enabled methods,
not a dead Support button. Distinguish temporary network failure from server 401
and 403, clearing/gating private presentation without misreporting account status.

### Responsive And Accessibility Checks

- Verify approximately 390px, 768/820px and 1440px. Single-column mobile form;
  stable readable widths, keyboard-visible actions, no clipped OTP/long emails.
- Use form labels, semantic autocomplete (email/current-password/new-password/
  one-time-code), visible focus, Enter submission, keyboard navigation, accessible
  errors/live status. OTP is one semantic input or an equivalently accessible
  group; allow full-code paste and do not trap focus.
- Do not rely on color alone. Respect reduced motion and zoom; dialog focus
  restoration and status announcements follow shared contracts.
- Use existing Neon/Pearl/Electric tokens; provider buttons must meet provider
  branding requirements without recoloring unrelated components.
- All user-visible strings use react-i18next. Proposed `authentication`
  namespace must be registered in the manifest with key/interpolation parity
  for every enabled locale (currently Thai and English; re-read manifest).
  Disabled Japanese is not claimed verified. No OTP/password/prompt in catalogs.
- Validate long translated text, masked/full email handling, screen reader
  announcements and password-manager behavior on mobile/desktop.

## 7. Acceptance

For local automatic fixture entry, mode guidance, unavailable security actions
and mode/actor cache isolation, follow [AUTH-009](009-local-development-login-override.md).
It reuses ActorProvider/AccountMenu and preserves these sibling/responsive rules;
client state can never enable the override. Normal auth screens apply when off.

AUTH-AC16: All screen states have clear progress/error/recovery actions, keyboard
access and verified mobile/tablet/desktop layouts in supported themes/locales.
AUTH-AC17: Same-actor reauth preserves only permitted temporary work; logout,
actor change, cross-tab invalidation and late responses cannot leak private state.
AUTH-AC18: Public browsing and AccountMenu siblings remain usable; successful
login returns safely without automatically triggering paid work.
