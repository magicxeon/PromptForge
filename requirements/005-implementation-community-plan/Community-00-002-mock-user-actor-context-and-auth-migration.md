# Community-00-002 Mock User, Actor Context and Auth Migration

**Status:** Proposed - Awaiting Review  
**Feature type:** Identity foundation and development user switcher  
**Depends on:** Application shell, server middleware, local JSON storage  
**Created:** 2026-07-19

## 1. Business Requirement

Community needs cross-user behavior before real authentication exists. We must be able to test:

- Alice owns a generated result.
- Alice shares a template.
- Bob remixes it.
- Bob cannot reuse Alice private face reference.
- Admin hides or removes a public post.

This requires a mock user system that acts like production auth from the domain-service point of view.

## 2. System Design

### 2.1 Actor Context Schema

```text
ActorContext
- userId: string
- username: string
- displayName: string
- role: user | creator | admin | support
- activeCreatorProfileId: string | null
- isMockActor: boolean
- authProvider: mock | supabase | system
- requestId: string
```

Rules:

- `userId` is the durable identity key.
- `username` is compatibility/display only.
- Server creates `ActorContext`; client never directly grants permissions.
- Services receive `ActorContext`, not raw headers.
- Background jobs use `system` actor plus original requester id.

### 2.2 Mock User JSON Schema

```text
MockUser
- schemaVersion: number
- id: string
- username: string
- displayName: string
- role: user | creator | admin | support
- activeCreatorProfileId: string | null
- creditBalanceSeed: number
- status: active | disabled
- createdAt: ISO string
- updatedAt: ISO string
```

Seed users:

```text
usr_demo
usr_alice
usr_bob
usr_admin
```

### 2.3 Auth Migration Rule

When Supabase Auth is added:

```text
Supabase session -> ActorContext -> same domain services
```

Do not rewrite Community services to know Supabase directly.

## 3. Software Development Specification

### Client Files

```text
client/core/actorContext.js
client/core/apiClient.js
client/community/communityMockUserSwitcher.js
client/shell/userMenu.js
client/index.html
client/app.js
```

### Server Files

```text
server/identity/mockUsers.json
server/identity/MockUserRepository.js
server/identity/mockActorContext.js
server/middleware/actorContextMiddleware.js
server/server.js
test/mockActorContext.test.js
```

### API Headers During Development

```text
x-mpf-user-id: usr_alice
x-mpf-request-id: optional-debug-request-id
```

## 4. Implementation Plan

1. Create mock user repository.
2. Add middleware that resolves `ActorContext`.
3. Add development-only user switcher in UI.
4. Update API client to send active mock user.
5. Update Community and Scene Builder share routes to read actor from middleware.

## 5. Testing

```text
TC-00-002-001 resolve Alice actor from header
TC-00-002-002 default to demo actor in development
TC-00-002-003 reject unknown user on mutating request
TC-00-002-004 admin actor can perform moderation action
TC-00-002-005 switching client user refreshes owner-sensitive panels
```

