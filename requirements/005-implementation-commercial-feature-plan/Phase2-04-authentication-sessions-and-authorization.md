# Phase 2-04 Authentication, Sessions and Authorization

**Status:** Proposed - Awaiting Review  
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
support: limited diagnostic access, no financial mutation by default
admin: controlled administrative actions with mandatory audit reason
system: background jobs with scoped service identity
```

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

## 6. Prototype Adapter

Before authentication is implemented, a development-only identity adapter may return `user_demo_001`. It must:

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

