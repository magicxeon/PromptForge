# Community-10 Local Mock User and Actor Switcher

**Status:** Proposed - Awaiting Review  
**Feature type:** Development identity foundation and cross-user test harness  
**Depends on:** Application shell, local JSON persistence, Community-04 through Community-09  
**Created:** 2026-07-19

## 1. Business Requirement

Community, gallery, template privacy and creator features require user ownership. The project does not yet have full user management, but the team needs to test cross-user behavior now:

- Alice publishes a template.
- Bob views and remixes it.
- Private face/character references are blocked for Bob.
- Public reusable style references can carry over.
- Creator gallery shows only the selected user's public items.

MVP development should therefore include a local mock user system that behaves like future authentication from the perspective of domain services.

## 2. Product Scope

Included:

- Development-only user switcher.
- Seed mock users such as `user_demo`, `user_alice`, `user_bob`, `admin_demo`.
- Actor context passed into Community, Scene Builder share, gallery, character and credit APIs.
- UI indicator showing active user.
- Local persistence of selected mock user.

Deferred:

- Password login.
- OAuth.
- Email verification.
- Real sessions and refresh tokens.
- Production roles and permission admin UI.

## 3. Actor Context Contract

```text
ActorContext
- userId
- username
- displayName
- role: user | creator | admin
- activeCreatorProfileId
- isMockActor
```

Rules:

- All mutating Community APIs must receive actor context.
- Client should not decide ownership by itself; server policies must validate actor/user ownership.
- Mock actor shape must be close enough to future auth so production migration is a service swap, not a rewrite.

## 4. UI Requirements

- Add a small development-only user switcher in the app shell or account area.
- Active user must be visible during local testing.
- Switching user must refresh Community, History, Gallery and Shared Template views that depend on actor context.
- Do not show the switcher in production mode.

## 5. Software Development Specification

### Client Files

```text
client/community/communityMockUserSwitcher.js
client/core/actorContext.js
client/core/apiClient.js
client/shell/navigationRegistry.js
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
```

### Process

1. Client stores active mock user id in localStorage.
2. API client sends `x-mpf-user-id` for development requests.
3. Server middleware resolves `ActorContext`.
4. Domain services receive `actorContext`, not raw headers.
5. Production auth later replaces middleware without changing Community services.

### Output

- Every API mutation can identify `actorContext.userId`.
- Public read APIs can compare viewer vs owner.
- Tests can simulate multiple users without full auth.

## 6. Impact

- Enables real testing for ownership/privacy before user management exists.
- Reduces rework because future auth can keep the same actor context contract.
- Must be clearly marked as development-only to avoid accidental production exposure.

## 7. Testing

Automated:

```text
TC-10-001 resolve mock actor from x-mpf-user-id
TC-10-002 default to user_demo when no mock header exists in dev
TC-10-003 reject unknown mock user for mutating endpoints
TC-10-004 admin_demo can perform support/admin moderation actions
TC-10-005 user_bob cannot mutate user_alice private records
```

Manual:

1. Switch to Alice and publish a local shared template.
2. Switch to Bob and open the shared template.
3. Confirm Bob sees required replacement for private face/character slots.
4. Switch back to Alice and confirm owner can edit or unpublish own draft.

## 8. Implementation Plan

### User Review Required

- This is not production authentication.
- Mock user selection exists only to unblock Community and privacy testing.
- Future auth should preserve `ActorContext` as the service boundary.

### Proposed Changes

- Add a mock user repository with seeded users.
- Add actor context middleware.
- Add a small UI switcher for development builds.
- Update Community and Scene Builder share endpoints to read actor from middleware.

### Release Gate

This module is complete when cross-user Community privacy can be manually tested without editing JSON files by hand.
