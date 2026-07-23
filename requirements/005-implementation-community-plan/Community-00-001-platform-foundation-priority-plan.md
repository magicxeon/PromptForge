# Community-00-001 Platform Foundation Priority Plan

**Status:** Proposed - Awaiting Review  
**Feature type:** Foundation sequencing and migration guardrails  
**Depends on:** Scene Builder contracts, current JSON repositories, generation queue  
**Created:** 2026-07-19

## 1. Business Requirement

Community cannot be built as only UI screens. It depends on user identity, ownership, visibility, credit accounting, audit and database-ready data contracts.

The first Step 5 work should therefore create a platform foundation while the app still uses JSON files. This prevents major rewrites when the project migrates to PostgreSQL/Supabase later.

## 2. Priority Order

Do Step 5 in this order:

```text
00-001 Foundation priority and module boundaries
00-002 Mock User / Actor Context
00-003 Repository interface and database-ready schema map
00-004 Ownership, visibility and public snapshot policy
00-005 Credit ledger mock and generation billing lifecycle
00-006 Localization and language extension foundation
00-007 Community-first shell, Playground and shared generation components
00-008 Admin/support audit and back-office foundation
01 Community Home and Workflow Launcher
02 Prompt Composer AI and Structured Freestyle
03 Taxonomy and Auto Classification
04 Share Generated Image and Prompt Snapshot
05 Community Explore, Post Detail and Remix
06 Creator Profile, Follow and Portfolio
07 Safety, Moderation and Reporting
08 MVP Integration and Launch
09 Gallery, Character Showcase and Scene Builder Handoff
```

This means Community screens may start as thin prototypes, but domain contracts must be stable first.

## 3. Foundation Principles

- JSON storage is allowed during MVP, but service interfaces must be database-ready.
- Use `userId` and `ownerUserId` as primary identity fields. `username` is display/compatibility only.
- Every write operation must receive `ActorContext`.
- Every public API must return sanitized public read models, not raw internal records.
- Every new user-facing Community string must use the shared localization contract.
- Credit deduction must live in a central credit service, not in Community UI or Scene Builder.
- Admin/support actions must be auditable from the beginning.
- Scene Builder snapshot, reference slot and template hydrator logic must be reused. Do not fork them inside Community.

## 4. System Design

### 4.1 Module Layers

```text
Client UI
  home, community, gallery, creator, admin-lite

Client Core
  actorContext, apiClient, route state, Scene Builder handoff

Server Routes
  identity, community, gallery, credits, admin, assets

Domain Services
  ownership policy, visibility policy, share policy, credit policy, audit policy

Repositories
  JSON-backed first, PostgreSQL-backed later

External Services
  AI providers, R2 storage, Supabase Auth later, payment gateway later
```

### 4.2 Required Foundation Files

```text
client/core/actorContext.js
client/core/apiClient.js
client/community/communityMockUserSwitcher.js
server/domain/identity/mockActorContext.js
server/repositories/identity/MockUserRepository.js
server/middleware/actorContextMiddleware.js
server/repositories/BaseRepositoryContract.md
server/domain/policies/OwnershipPolicyService.js
server/domain/policies/VisibilityPolicyService.js
server/repositories/credits/CreditLedgerRepository.js
server/domain/credits/CreditReservationService.js
server/repositories/audit/AuditLogRepository.js
server/domain/admin/AdminPolicyService.js
```

## 5. Migration Guardrails

For every JSON file introduced in Step 5:

- Keep records as arrays of typed objects, not arbitrary nested maps keyed by username.
- Use stable IDs such as `usr_`, `asset_`, `gen_`, `post_`, `tmpl_`, `ledger_`, `audit_`.
- Add `schemaVersion`.
- Add timestamps.
- Avoid large base64 data.
- Store references to assets/jobs by ID or URL token, not embedded binary data.
- Keep repository method names close to SQL use cases.

## 6. Implementation Plan

### User Review Required

- Foundation tasks should be implemented before building a rich Community feed.
- Mock user is temporary but the `ActorContext` shape is long-term.
- JSON storage is temporary but repository contracts are long-term.
- Payment checkout is deferred, but credit ledger and generation billing hooks start now.

### Proposed Changes

1. Add foundation requirement files 00-002 through 00-008.
2. Update Community master roadmap to show foundation work before feature work.
3. Use these contracts as acceptance criteria for later Community tasks.
4. Do not implement separate Community generation, template or credit logic.

### Testing

- Validate JSON fixtures have `id`, `schemaVersion`, `createdAt`, `updatedAt` where applicable.
- Validate each service receives `ActorContext`.
- Validate public read models are sanitized.
- Validate credits and audit events are append-only.

