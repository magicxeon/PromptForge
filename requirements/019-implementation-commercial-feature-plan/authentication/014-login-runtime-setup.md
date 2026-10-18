# Login Runtime Setup And Scoped Acceptance

Owner: Identity / AUTH-019. This guide covers customer Login, registration,
verification, password reset and Google/Facebook entry. Linking existing methods,
account-security management and staff MFA retain their separate task packets.
Implementation evidence and current completion status are in AUTH-012 and
task-plan.json; isolated test results do not assert live deployment readiness.

## Local Login Override

2026-10-12 startup repair plan (AUTH-DEV-START-01): the development launcher
must supply `NODE_ENV=development` only when neither process nor `.env` explicitly
sets an environment, and poll exact `127.0.0.1:6500/api/health`. Preserve explicit
production/test values and all existing bypass qualification. A health-ready
guest shell does not grant private authority. Provision the already selected
local fixture once through the existing setup command; never reset an existing
fixture or create real users/credentials. No `.env` edit or live API call.
Acceptance: default dev startup plus qualified fixture; unsafe explicit modes
still deny bypass; IPv4 health succeeds while404/invalid/unreachable fail.
Checks: owning development-bypass group, isolated full-app/Vite qualification,
and independent Security/QA review. Readiness proves listening only; an untracked
service on6500 is never automatically killed based on its public health response.
The launcher reports occupied-port instead. Existing owned-session shutdown
remains separate from this listening probe.

Evidence2026-10-12: development-bypass10/10 PASS; actual isolated createApp plus
Vite proxy1/1 PASS, now consuming the launcher defaults and checking bypass/off
guest health through owned ephemeral HTTP. Syntax check passes. The user's
explicitly selected absent `.local-auth-fixture/` was provisioned once with
`setup-development.mjs`; no production data copied or existing target reset.
Read-only qualification of the current effective configuration passes
development_bypass on127.0.0.1:6500 without importing app singletons or launching
services. Actual `.env` unchanged. Independent review disposition is recorded
in the adjacent startup task plan. Full user's launcher/batch, backup/build and
existing process termination are not executed during this qualification.

The toggle is `AUTH_DEV_BYPASS_ENABLED=true`. Set `NODE_ENV=development`,
`HOST=127.0.0.1` and restart the server. Before its first use run:

```powershell
node scripts/authentication/setup-development.mjs
```

The command creates a new `.local-auth-fixture/` and never overwrites an existing
target. Browse `http://localhost:6500` or `http://127.0.0.1:6500`; both exact
hostname aliases work with the existing local Vite port5173 too. The
mode is visibly identified in the UI and uses its own fixture account/data.
Paid generation requires the explicit local Admin opt-in below. Real account
credentials/security and private production media remain outside this mode.
Set the toggle to `false` and restart to return to real Login;
the fixture never grants access to a real account or its browser drafts.
Do not enable `AUTH_LOGIN_ENABLED` at the same time as bypass.

Local Admin testing: first run `node scripts/authentication/setup-development.mjs
--admin` once. It adds the fixed synthetic admin to the qualified fixture without
resetting existing data. Set `AUTH_DEV_BYPASS_ENABLED=true` and
`AUTH_DEV_BYPASS_ROLE=admin`, then restart and browse `/admin`. The requested
spelling `UTH_DEV_BYPASS_ROLE=admin` is accepted as an alias when the canonical
name is absent or equal; conflicting names and unsupported roles fail closed.
Default/`user` selects the original fixture. Role switching uses distinct IDs
and clears old browser state. Only local development/loopback is eligible;
production/staging/test cannot activate admin bypass. Nonbillable fixture Admin
commands use normal role policies and CSRF; financial commands,
financial publication and real security operations remain unavailable. See
[AUTH-016](016-local-admin-bypass.md) for exact scope and evidence.

Real image Generation/Compare as local Admin additionally requires:

```dotenv
AUTH_DEV_BYPASS_ENABLED=true
UTH_DEV_BYPASS_ROLE=admin
AUTH_DEV_BYPASS_GENERATION_ENABLED=true
```

Restart with `start-dev.bat`, open `http://localhost:6500`, and use the existing
Credits page **Add 100 mock credits** control before confirming Compare. The
isolated wallet starts at zero; virtual Credits do not pay real provider API
charges. Provider keys and prices use the normal server configuration. All
enabled slots reserve their total before dispatch, then capture/refund normally.
The opt-in defaults off and is restricted to qualified local development Admin;
Existing Video Playground is also admitted under [AUTH-018](018-local-admin-video-playground.md).
Real staff financial commands and production media remain unavailable.
See [AUTH-017](017-local-admin-live-comparison.md). Isolated automated validation:
`node scripts/verify-authentication.mjs --group local-comparison` mocks only the
provider response and never calls a paid API or modifies the actual wallet.

AUTH-DEV-HOST-01 evidence2026-10-12: user-confirmed `localhost:6500` was denied
by the prior IP-only Host allowlist. Canonical Auth policy now admits exact
localhost/IP API and frontend origins; it still binds/checks IPv4 loopback and
rejects suffix hostnames, wrong ports, external origins and forwarded authority.
Focused10/10 and actual isolated createApp/Vite1/1 pass: direct localhost actor,
config and valid-CSRF preference writes; localhost frontend proxy; hostile
requests and off/restart authority denial. No `.env`, existing runtime data or
user services changed. Restart is required for the frozen startup policy.
Independent native `/root/login_bypass_release_review` applied Security and QA
sequentially and passed: its focused10/10 and isolated actual createApp/Vite1/1
runs also passed. Disposition is tracked in the adjacent015 task plan. This closes
the localhost Host/Origin repair; broader T19B browser/transport gaps stay separate.

## Real Customer Login

Configure the server environment using the names in `.env.example`:

| Input | Contract |
|---|---|
| `AUTH_LOGIN_ENABLED` | `true`; default false |
| `AUTH_METHODS` | Explicit comma-separated subset of `password,emailOtp,google,facebook`; password/social also require emailOtp |
| `AUTH_ORIGINS_JSON` | Exact published HTTPS origins, no path/trailing slash |
| `AUTH_LEGAL_JSON` | Actual terms/privacy versions and published document URLs |
| `AUTH_APPROVALS_JSON` | Existing reviewed deployment/legal/retention/email references plus enabled provider/screening references |
| `AUTH_KEYRING_JSON` | Persistent 32-byte random server secret(s), encoded as 43 base64url characters; retain required prior versions across rotation |
| `AUTH_SMTP_*` | Real sender, TLS port 465 or 587 and sender credentials |
| `AUTH_PASSWORD_SCREENING` | `hibp`; range lookup sends only five SHA-1 prefix characters |
| `AUTH_GOOGLE_*` / `AUTH_FACEBOOK_*` | Enabled provider's registered client credentials and exact redirect URI |
| `DATABASE_URL` | Owning shared PostgreSQL database, with the existing `DATABASE_*` TLS/pool options |

Server startup validates inputs and checks schema status before importing private
application capabilities. It never auto-applies migrations or falls back to demo
accounts. Missing/unavailable configuration presents the guest shell and denies
private access. Secrets belong only in the server environment; do not paste them
into requirement files or browser configuration.

Google callback: `/api/auth/social/google/callback`.
Facebook callback: `/api/auth/social/facebook/callback`.
Register each complete URL under an allowed published origin in the respective
provider console. Facebook signup with missing email requires independent email
OTP. Matching an existing email never silently links another provider account.
Facebook deletion callback/status acknowledges request receipt; account-data
erasure processing remains separately governed.

For approved local HTTP qualification only, use exact `127.0.0.1` origins,
`NODE_ENV=development`, `AUTH_LOCAL_HTTP_APPROVED=true` and its reviewed
`localHttp` reference. Production requires HTTPS and Secure session cookies.
`AUTH_BILLABLE_RECOVERY_ENABLED` defaults false and is a separate intentional
recovery setting; enabling Login alone does not restart existing paid jobs.

## Migration And Validation Commands

Use the owning database migration process against an explicitly selected target.
The CLI reads the process environment; it does not load a local `.env` itself:

```powershell
node scripts/database/migrate.mjs --mode status --target-env DATABASE_URL
# Apply only through the approved target's normal migration procedure:
node scripts/database/migrate.mjs --mode apply --target-env DATABASE_URL
```

Automated tests require a disposable loopback PostgreSQL database whose name
starts `mpf_test_`, using `MPF_TEST_DATABASE_DISPOSABLE=true` and
`MPF_TEST_DATABASE_URL`. They use random schemas, fake native mail/provider
transports and owned temporary files; no real email/OAuth/generation occurs.

```powershell
node scripts/verify-authentication.mjs --group cutover
node scripts/verify-authentication.mjs --group private-access
node scripts/verify-authentication.mjs --group login-integration
node scripts/verify-authentication.mjs --login
npm.cmd run test --prefix web -- --configLoader runner src/features/authentication src/lib/auth/ActorProvider.test.tsx src/lib/auth/userPreferences.test.tsx src/lib/api/apiClient.test.ts
node node_modules/typescript/bin/tsc -p web/tsconfig.app.json --noEmit --incremental false
node scripts/verify-agent-orchestration.mjs --plan requirements/019-implementation-commercial-feature-plan/authentication/task-plan.json
```

`--login` is an explicit server milestone aggregate. `--all` remains the full
Authentication roadmap gate and intentionally fails until its remaining
linking/recovery/MFA/UI/integration requirements are delivered. Neither command
implicitly starts Vite, migrates a live database or invokes a paid provider.
Live SMTP delivery, provider-console callbacks, published legal documents and
deployment UAT require the actual deployment inputs and remain separately
reported in AUTH-012.
