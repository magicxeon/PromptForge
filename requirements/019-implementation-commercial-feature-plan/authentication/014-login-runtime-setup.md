# Login Runtime Setup And Scoped Acceptance

Owner: Identity / AUTH-019. This guide covers customer Login, registration,
verification, password reset and Google/Facebook entry. Linking existing methods,
account-security management and staff MFA retain their separate task packets.
Implementation evidence and current completion status are in AUTH-012 and
task-plan.json; isolated test results do not assert live deployment readiness.

## Local Login Override

The toggle is `AUTH_DEV_BYPASS_ENABLED=true`. Set `NODE_ENV=development`,
`HOST=127.0.0.1` and restart the server. Before its first use run:

```powershell
node scripts/authentication/setup-development.mjs
```

The command creates a new `.local-auth-fixture/` and never overwrites an existing
target. Browse `http://127.0.0.1:6500` or the existing local Vite port 5173. The
mode is visibly identified in the UI and uses its own fixture account/data.
Paid generation, staff/security management and private production media remain
outside this mode. Set the toggle to `false` and restart to return to real Login;
the fixture never grants access to a real account or its browser drafts.
Do not enable `AUTH_LOGIN_ENABLED` at the same time as bypass.

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
