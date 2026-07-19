# Community-00-006 Admin, Support Audit and Backoffice Foundation

**Status:** Proposed - Awaiting Review  
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
server/admin/AdminPolicyService.js
server/admin/adminRoutes.js
server/audit/AuditLogRepository.js
server/audit/AuditService.js
server/community/CommunityModerationService.js
server/credits/CreditAdjustmentService.js
```

### Client Files

```text
client/admin/adminPanel.js
client/admin/adminCommunityModeration.js
client/admin/adminCreditLedgerView.js
client/admin/adminAuditLogView.js
```

MVP may keep client admin UI minimal or internal-only.

## 4. Implementation Plan

1. Add audit repository/service.
2. Add admin policy checks.
3. Add minimal admin routes.
4. Add moderation action audit.
5. Add credit adjustment audit.
6. Add internal admin UI only if needed for manual testing.

## 5. Testing

```text
TC-00-006-001 non-admin cannot hide post
TC-00-006-002 admin hide post creates audit event
TC-00-006-003 credit adjustment creates ledger and audit event
TC-00-006-004 removed post is unavailable to public viewer
TC-00-006-005 audit event cannot be edited through normal repository update
```
