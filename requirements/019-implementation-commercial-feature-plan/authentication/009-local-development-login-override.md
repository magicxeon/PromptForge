# AUTH-009 Local Development Login Override

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)
**Status:** AUTH-T19A isolated source and security/QA checks complete (7/7).
Full application and browser qualification remain pending AUTH-T19B.
**Owner:** Identity; Product primary, Security/QA review, UX for mode presentation
**Date:** 2026-10-10

## 1. Requested Outcome And Scope

The developer can edit one server `.env` toggle and restart the local server to
enter the workspace without repeatedly entering a password, OTP or social login.
This is a local development convenience, not a production authentication method.
The toggle, eligibility checks, fixed isolated actor and guest fallback are now
implemented. The actual local `.env` and existing accounts/data were not edited.
The current bypass permits the documented workspace reads and own preferences;
additional workspace operations require AUTH-T19B qualification.

```dotenv
# Server-side setting; default in .env.example remains false.
AUTH_DEV_BYPASS_ENABLED=false
# Set true in the developer's local .env, then restart the server, to skip Login.
```

Only exact `true` enables the mode; absent or exact `false` disables it. Any other
value is a configuration error. No VITE-prefixed copy, browser storage toggle,
URL, header, cookie or UI control may enable it. Read once through
`server/config/authPolicy.js`; environment changes require server restart.

## 2. Eligibility And Failure Matrix

| Configuration / request | Required behavior |
|---|---|
| Missing / false | Normal authentication; private access requires a valid session, public routes remain public |
| True, explicit NODE_ENV=development, isolated local fixtures and loopback deployment | Resolve the fixed development actor without credential input |
| True in production, staging, test, unset or unknown environment | Fail startup before accepting requests; never silently enable or ignore unsafe configuration |
| True with non-loopback listener, unqualified data target or shared deployment | Fail startup with a sanitized configuration error |
| Invalid toggle value | Fail startup; never interpret truthy strings such as 1 or yes |
| Eligible startup but fixture absent, inactive, unqualified or unexpectedly privileged | Fail closed; no fallback to first user or automatic creation/role change |
| Request does not satisfy local Origin/Host/peer checks | Deny; never substitute another actor or trust forwarded headers |

Validate eligibility before `createApp()` or any startup side effects, not just
before listen: existing composition starts recovery/Credit reconciliation.
Override startup must not start live provider dispatch, financial reconciliation
or background recovery against real state. Use owning fixture adapters/disabled
startup hooks; do not change Credits/Generation business rules. The override must
bind the server to loopback. The current `app.listen(PORT)`
does not establish that boundary and must be changed by the scoped task. Validate
socket peer plus exact local Host/Origin allowlists, normal CSRF protection and
bounded allowed local ports; an attacker-supplied Host, X-Forwarded-For or Origin
is not proof by itself. Do not expose this mode through tunnels, external reverse
proxies, LAN binding or shared staging. A local Vite development proxy may be
supported only with a documented same-machine configuration, loopback-only Vite
binding and validated Host, preserved Origin checks and no forwarded-header
trust. T02/T19 freeze and test that topology and exact CORS allowlist; current
permissive CORS is not sufficient.

Use an explicitly designated isolated development data target. Localhost alone
does not prove the database, mounted files or service credentials are disposable.
T19 must document the positive fixture/data-target check through existing config
owners; if isolation cannot be established, refuse startup. Unit tests may inject
a development config into isolated fixtures, not enable bypass on a test server.

## 3. Actor, Permission And Session Contract

- Identity resolves one fixed server-owned development fixture ID, using the
  existing mock adapter and public Identity boundary. Qualify existing `usr_demo`
  only if it meets this fixture contract; otherwise explicitly provision a local
  fixture through the owning setup task. There is no arbitrary user-ID env input
  or request-driven actor switch in this mode.
- The actor must be active, baseline customer and explicitly fixture-designated.
  Never select an Admin, Support, staff or real customer account; no automatic
  role elevation, email verification, Terms acceptance or account provisioning.
- The server supplies `authMode=development_bypass` separately from real session
  assurance. Never mint a production-valid session, credential proof, MFA grant,
  reauthentication grant or operation receipt from this override.
- During the mode, the fixed fixture is the only eligible interactive actor.
  Existing real cookies and mock headers/query IDs cannot select another user or
  silently take precedence. Auth mutation/provider-start/callback routes do not
  perform login, signup, recovery, linking or credential/MFA changes in this mode;
  return a stable sanitized mode-unavailable outcome with no side effects.
- Account status, resource ownership, role/feature authorization and CSRF remain
  enforced on private reads, writes, streams, downloads and media. Disabled or
  suspended fixtures lose access; never translate bypass into allow-all access.
- Fixtures use a distinct storage namespace; query and browser persistence keys
  include the auth mode as well as actor identity so equal IDs cannot collide
  with real-account work. Preferences and local draft work remain actor-scoped. Credits, pricing,
  confirmations and Generation authorization retain existing owning workflows.
  The toggle grants no free Credits, provider dispatch, live spending or permission
  to access production services. Existing isolated development gates still apply.
- Mode metadata is returned through the existing public auth-config projection
  and actor schema, with no secrets or extra account enumeration. All JSON,
  progress-stream and Blob transports use the same server-resolved mode/actor.
- Emit a clear sanitized startup warning and mode label in audit/diagnostics;
  never log credentials or misreport development activity as verified login.

## 4. Entry, Switching Off And UI States

Reuse ActorProvider, shared API/query/persistence owners and AccountMenu/AppShell.
No separate browser actor store or client-only route bypass. While the mode/actor
is loading, gate private content; resolution/network errors show retry/help and
never guess a fixture identity. Success opens the requested permitted workspace
without a Login form and without automatically starting paid work.

Show persistent, localized text such as "Development mode: Login bypassed" plus
the fixture identity in the existing account area. Use semantic theme tokens,
accessible text (not color alone), keyboard access and readable layouts at 390,
768/820 and 1440 widths. Preserve Profile, Credits, Settings, navigation and
preference actions. Explain unavailable Account security/authentication actions
and how to disable the server option; no nonfunctional password/OTP controls.

Normal Login/Logout/account-switch actions cannot imply genuine authentication
while bypass is active. Replace the auth-specific action with concise guidance:
"To test Login, set AUTH_DEV_BYPASS_ENABLED=false and restart the server."
Do not show a successful logout followed by silent fixture re-entry. Direct auth
routes show the same mode guidance instead of initiating a provider or mutation.

On restart with the option disabled, override access ends on the next server
request for every transport. Old fixture headers, local state or mode metadata
are not credentials. Return normal unauthenticated status when no valid real
session exists; the legacy non-production implicit `usr_demo` fallback must be
removed from this path, not restored when the toggle is false. A still-valid real
session may resume only after the ordinary
server checks. The client cancels requests, clears actor/mode-scoped queries and
draft presentation, ignores late responses and re-resolves Identity before
showing any new actor's private content, even if an ID happens to match.
Close/reset open account Preferences/security dialogs on a mode transition even
when actorId is unchanged; an actor refresh error must gate previously rendered
private content rather than leave the stale actor visible behind an error.
Cross-tab notifications and refresh/focus revalidation use the existing owner;
no new polling loop. Existing real credentials are never converted or revoked
merely by toggling development mode. Data remains stored under its original
fixture owner; it is never merged or claimed by a later real account.

## 5. Tasks, Acceptance And Verification

T02 includes this mode in the policy/API/schema freeze. [AUTH-008](008-executable-task-packets.md)
and [task-plan.json](task-plan.json) add milestone AUTH-T19 with two executable
children: T19A server/configuration/fixture boundary, then T19B UI/transport/mode
transition. T16A aggregate depends on T19B; milestone numbering is not execution
order. Both remain proposed. Extend the existing planned runner with a short
`development-bypass` group; include it in explicit isolated `--all`.

AUTH-AC21: A single enabled server toggle in a qualified local development setup
opens the workspace as the fixed fixture without password, email, OTP or OAuth;
disabled/missing toggle retains normal Login and explicit public access.

AUTH-AC22: Production/staging/unknown environment, unsafe binding/data target,
invalid config, foreign request and invalid/privileged fixture cannot activate
the override. Client identity injection, real-cookie precedence, credential/MFA
operations and cross-owner read/write/media access do not bypass authorization.

AUTH-AC23: Mode is clearly presented, all three transports agree, and disabling
plus restart removes override authority. Mode/actor changes clear private UI and
discard late responses without transferring fixture work or auto-running actions.

Automated cases: configuration matrix; actual loopback bind and local-proxy
Origin/Host checks; positive data isolation; inactive/foreign/privileged fixtures;
header/query/cookie tampering; auth mutation denial; CSRF; cross-owner media;
mode switch with old cookies/requests across tabs and all three transports.
Use disposable fixtures/fake providers. No real email, OAuth or paid calls.
Manual future checks: one-toggle start and restart/off flow, visible mode/error
states and neighboring actions across required widths/themes/locales.

## 6. Documentation Evidence

### T19B Local Proxy Implementation Plan (2026-10-11)

Retain the reviewed T13A shared Identity/Gate/API/mode presentation. Root owns
the remaining local proxy configuration and qualification: bind Vite to
127.0.0.1:5173 with strictPort, forward to 127.0.0.1:6500 with changeOrigin while
preserving the browser Origin, and admit only this exact frontend Origin plus
the owning backend Origin. Actual socket loopback, backend Host and CSRF checks
remain mandatory; forwarded headers cannot establish authority. A foreign
Origin, hostname or frontend port remains denied. No CORS wildcard is added.

Run the focused development-bypass group and an isolated entry qualifier using
temporary designated fixture data, sanitized environment and blocked outbound
network. Exercise permitted reads/preferences, hostile proxy requests and
restart-off denial. Full createApp must write only its temporary runtime roots
and must not start recovery workers/provider calls. Record any unqualified
transport or runtime explicitly. UX evidence from T13A remains scoped to its
reviewed guest/bypass presentation; no full T19B completion is inferred.

Source anchors inspected: actorContextMiddleware, ActorProvider, server bootstrap
and existing mock-actor tests. Identity/authPolicy and shared React owners already
cover the addition; architecture map unchanged. No new runtime data location or
credential store is proposed. Independent review and structural validation are
recorded below; runtime behavior remains unverified.

- Independent Security `/root/auth_dev_override_security`: passed this addition;
  pre-composition gates, local topology, fixture qualification, no real assurance
  and disabled-mode behavior are specified. Exact data-target qualification and
  local proxy/CORS implementation still require runtime evidence.
- Independent UX `/root/auth_dev_override_ux`: passed requirement flow/states and
  scoped reuse. Added explicit same-ID open-dialog cleanup and refresh-error
  gating from its implementation reminders; no visual acceptance claimed.
- Independent QA `/root/auth_requirement_qa_review`: passed scoped docs, plan and
  packet assertions. Its optional aggregate traceability improvement is included:
  T16A now explicitly names AC21-AC23 alongside AC01-AC18.
- Plan validator passed; all 46 child packets match JSON dependencies and GWT
  checks; all 45 predecessors feed final T18A readiness. All remain proposed
  with empty implementation evidence/reviews. Local Markdown links/anchors (87)
  and scoped whitespace checks passed.
- No application/.env/.env.example edits, runtime tests, browser tests, real
  email/OAuth/provider calls or production operations. Await implementation
  instruction; no future runner is claimed to exist.
