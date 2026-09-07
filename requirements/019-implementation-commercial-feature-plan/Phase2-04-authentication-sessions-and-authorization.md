# Phase 2-04 Authentication, Sessions and Authorization

**Status:** Next DB/Auth foundation slice; real authentication not implemented (2026-09-07)
**Target:** Secure accounts for Thai small merchants with future team support.

## 1. MVP Scope

- Email/password registration and login
- Email verification
- Logout current session and logout all sessions
- Forgot/reset password
- Persistent secure sessions
- User profile and preferred language
- Admin/support role with audited access
- One Project owner initially; team membership schema retained for later

Social login and organization invitations are deferred unless separately approved.

## 1.1 Current Boundary And Safe First Slice

- `server/middleware/actorContextMiddleware.js` currently resolves mock users
  from `x-mpf-user-id` or `mpfUserId`/`mpf_user_id`. A valid supplied mock ID is
  still accepted in production mode. This is a launch blocker, not real login.
- `server/app/routes/identityRoutes.js` already owns `GET /api/me`; replace its
  identity source and preserve the response contract rather than adding a
  second current-user endpoint.
- Preserve `web/src/lib/auth/ActorProvider.tsx`, actor-scoped persistence and
  query invalidation. Logout, expiry and account changes clear private state.
- Build the first slice on PostgreSQL identity/Audit adapters, not passwords
  stored in the mock JSON repository. No provider call or payment is required.
- Mock users are migration identities only. Preserve IDs for explicitly
  approved account claims; never infer ownership or grant staff roles from a
  matching username/email or automatically activate demo accounts.
- Choose credential/session implementation and email-delivery integration in
  a recorded decision before coding. The account lifecycle above remains the
  requirement; GCP hosting does not itself select an authentication provider.

## 2. Security Requirements

- Passwords use a current adaptive password hash; never encryption or plain text.
- Session tokens are random, revocable and stored hashed server-side.
- Browser session cookie is `HttpOnly`, `Secure` in production and uses an appropriate `SameSite` policy.
- Rotate session after login and privilege changes.
- Rate-limit login, registration and password reset.
- Use generic responses to reduce account enumeration.
- Reset and verification tokens are single-use and expire.
- State-changing cookie-authenticated requests require CSRF protection.
- Record security events without logging passwords or raw tokens.

## 3. Authorization Model

Roles do not replace resource ownership checks.

```text
user: own profile and owned/member Projects
support_agent: Case/search and limited diagnostic access
support_lead: approved operational recovery and bounded compensation
finance_ops: payment/refund/reconciliation commands
moderator: Community moderation
admin: controlled identity/configuration actions with mandatory audit reason
system: background jobs with scoped service identity
```

The complete staff permission and two-person approval contract is owned by
`requirements/018-implementation-backend/007-permission-command-and-approval-matrix.md`,
coordinated by the Requirement 018 Master.
This phase supplies authenticated staff identity and authorization primitives;
it must not duplicate Support Case or financial command policy.

Every Project/Collection/Asset/Batch endpoint verifies both authentication and action-level authorization.

## 4. Core Data

- `users`
- `user_credentials`
- `sessions`
- `email_verification_tokens`
- `password_reset_tokens`
- `roles`, `user_roles`
- `security_events`

Account state:

```text
pending_verification -> active -> suspended -> closed
```

## 5. API Surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/me`
- `PATCH /api/me`

Use stable machine-readable error codes and localized user messages.
All `/api/auth/*` and `PATCH /api/me` entries here are target work, not existing
endpoints. Public Community reads retain deliberate anonymous access.

## 6. Prototype Adapter

The existing development adapter defaults to `usr_demo`. Its production
isolation requirements below are still pending. It must:

- Be impossible to enable accidentally in production.
- Still populate normal actor context.
- Never bypass authorization service calls.

## 7. Acceptance Criteria

- Unauthorized users cannot access another user's resources by changing IDs.
- Password/session/reset data is stored safely.
- Sessions can be revoked immediately.
- Suspended accounts cannot start billable operations.
- Authentication and authorization decisions are tested separately.
- Admin/support actions include actor, target, reason and timestamp in audit events.
- Production rejects mock identity injection through both headers and query
  parameters, whether the supplied mock ID is valid, invalid or absent. Hiding
  the switcher or disabling `/api/mock-users` alone does not satisfy this gate.
- Revoked, expired and disabled accounts cannot read another private record;
  test ownership on reads and writes, independently of UI filtering.
- Focused tests cover session rotation/revocation, CSRF, token expiry/replay,
  reset/verification, cross-actor media access and client cache clearing before
  broader launch tests. State mapping from local `disabled` users to the target
  lifecycle is explicit and never upgrades privileges implicitly.
