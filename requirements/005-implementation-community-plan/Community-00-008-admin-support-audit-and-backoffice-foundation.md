# Community-00-008 Admin, Support Audit and Backoffice Foundation

**Status:** Implemented - Pending validation
**Feature type:** Internal operations, moderation and audit foundation  
**Depends on:** Actor Context, ownership policy, repository interface  
**Created:** 2026-07-19

## 1. Business Requirement

Once Community content, credits and public gallery exist, the product needs basic back-office controls. MVP does not need a full admin portal, but support/admin actions must be possible and auditable.

## 2. System Design

### 2.1 MVP Backoffice Scope

Included:

- View user summary.
- View generation job summary.
- View community post summary.
- Hide/remove community post.
- View credit ledger for a user.
- Add manual credit adjustment with reason.
- View audit events.

Deferred:

- Full BI dashboard.
- Refund payment gateway workflow.
- Creator payout management.
- Automated moderation queues.
- Role management UI.

### 2.2 Audit Event Schema

```text
AuditEvent
- id
- schemaVersion
- actorUserId
- actorRole
- action
- targetType
- targetId
- reason
- beforeSnapshot
- afterSnapshot
- requestId
- ipHash
- createdAt
```

Actions:

```text
community.post.hide
community.post.remove
community.taxonomy.correct
credit.adjust
asset.visibility.change
user.status.change
```

### 2.3 Admin Policy

Rules:

- Admin/support actions require `role: admin | support`.
- Destructive or financial actions require reason.
- Credit balance must not be edited directly; use ledger adjustment.
- Public content removal must update feed visibility and audit log.
- Audit records are append-only.

## 3. Software Development Specification

### Server Files

```text
server/domain/admin/AdminPolicyService.js
server/domain/audit/AuditService.js
server/domain/community/CommunityModerationService.js
server/domain/credits/CreditAdjustmentService.js
server/repositories/audit/AuditLogRepository.js
server/repositories/credits/CreditAccountRepository.js
server/repositories/community/CommunityPostRepository.js
server/app/routes/adminRoutes.js
server/domain/admin/AdminBackofficeService.js
```

### Client Files

```text
client/admin/adminPanel.js
client/admin/adminApi.js
client/shell/navigationRegistry.js
client/shell/applicationShell.js
```

MVP provides a minimal internal-only `/admin` route. It is visible only when the mock actor role is `admin` or `support`; credit adjustment controls are visible and accepted only for `admin`.

### 3.1 HTTP Contract

```text
GET  /api/admin/overview
GET  /api/admin/users
GET  /api/admin/generations?cursor&limit
GET  /api/admin/community/posts?cursor&limit&status&ownerUserId
POST /api/admin/community/posts/:postId/moderation
GET  /api/admin/credits/:userId/ledger?cursor&limit
POST /api/admin/credits/:userId/adjustments
GET  /api/admin/audit-events?cursor&limit&action&targetType&targetId
```

Every route consumes the resolved `req.actorContext` from `actorContextMiddleware`; client-supplied username values never grant access. `admin | support` can read and moderate. Only `admin` can create a credit adjustment. Mutation payloads must include a meaningful `reason`; credit adjustment also requires integer `deltaCredits` that cannot reduce `availableCredits` below zero.

```text
POST /api/admin/community/posts/:postId/moderation
{ action: "hide" | "remove", reason: string }

POST /api/admin/credits/:userId/adjustments
{ deltaCredits: integer_non_zero, reason: string, idempotencyKey?: string }
```

The server returns `{ error: { code, message } }` on policy, validation, or repository errors. A successful credit adjustment returns the updated account, one `manual_adjustment` ledger entry, and one `credit.adjust` audit event. Repeating the same idempotency key returns the original result without applying the adjustment again.

## 4. Implementation Plan

1. Add audit repository/service with append-only event records and hashed request IP metadata.
2. Add admin policy checks: `admin | support` can read backoffice and moderate; only `admin` can adjust credits.
3. Add minimal admin routes under `/api/admin/*`; all route behavior receives `req.actorContext` from the common middleware.
4. Add moderation action audit and use repository mutation only through `CommunityModerationService`.
5. Add credit adjustment audit and a dedicated `CreditAccountRepository.adjustCredits` operation. It validates integer non-zero delta, prevents a negative available balance and writes one ledger entry atomically with the account change.
6. Add internal `/admin` UI. It must never be the authorization boundary; the server policy remains authoritative.

## 5. Testing

```text
TC-00-008-001 non-admin cannot hide post
TC-00-008-002 admin hide post creates audit event
TC-00-008-003 credit adjustment creates ledger and audit event
TC-00-008-004 removed post is unavailable to public viewer
TC-00-008-005 audit event cannot be edited through normal repository update
TC-00-008-006 support actor can inspect, but cannot submit a credit adjustment
TC-00-008-007 adjustment idempotency key cannot deduct or grant twice
```
