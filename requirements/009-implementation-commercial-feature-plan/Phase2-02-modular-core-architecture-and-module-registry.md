# Phase 2-02 Modular Core Architecture and Module Registry

**Status:** Proposed - Awaiting Review  
**Goal:** Create stable boundaries before commercial modules are implemented.

## 1. Business Requirement

ModelPromptForge must support independently enabled solution modules without duplicating provider, queue, billing, asset or ownership logic. The existing generator remains available as Advanced Studio while Fashion Selling becomes an installable/disableable solution module.

## 2. Design Principles

- Start as a modular monolith, not microservices.
- Separate HTTP/UI adapters, application use cases, domain rules and infrastructure.
- Core services cannot import a Fashion-specific module.
- Solution modules can depend only on published core contracts.
- Module disablement preserves data and blocks new operations safely.
- Existing routes remain compatible during staged migration.

## 3. Proposed Structure

```text
server/
  core/
    identity/
    projects/
    assets/
    collections/
    billing/
    jobs/
    providers/
    audit/
  modules/
    registry/
    advanced-studio/
    fashion-selling/
  shared/
    errors/
    validation/
    events/
    clock/
```

Do not move all existing files at once. Introduce application-service boundaries and migrate one vertical path at a time.

## 4. Module Manifest

```json
{
  "id": "fashion-selling",
  "version": "1.0.0",
  "displayName": { "en": "Fashion Selling", "th": "สร้างภาพขายแฟชั่น" },
  "requiredEntitlements": ["fashion_studio"],
  "dependencies": ["projects", "assets", "billing", "jobs"],
  "routes": ["/api/modules/fashion-selling"],
  "enabledByDefault": false
}
```

## 5. Core Contracts

All mutating use cases receive an execution context:

```js
{
  actorUserId,
  requestId,
  idempotencyKey,
  locale,
  now
}
```

Required application contracts:

- `IdentityContext.getActor()`
- `AuthorizationService.require(action, resource)`
- `ProjectService`
- `AssetService`
- `CollectionService`
- `PricingService.quote(plan)`
- `LedgerService.reserve/settle/release`
- `JobOrchestrator.submit(plan)`
- `EntitlementService.require(feature)`
- `AuditService.record(event)`

## 6. Module Lifecycle

```text
registered -> enabled -> disabled -> archived
```

- Disabled modules reject new write operations with a stable error code.
- Existing Project data remains readable/exportable according to policy.
- Disabling a module cannot silently cancel billable running jobs.
- Database migrations are owned by core domains or versioned module migrations.

## 7. UX Requirement

- Solution Home reads enabled modules from a server-provided catalog.
- Unauthorized modules are marked unavailable with a clear reason.
- Advanced Studio remains reachable.
- Feature flags support internal, beta and public audiences.

## 8. Migration Steps

1. Define contracts and shared error format.
2. Wrap existing provider and queue calls behind core interfaces.
3. Add registry with Advanced Studio as the first registered module.
4. Add demo identity and mock entitlement adapters for prototype use only.
5. Introduce Fashion manifest without implementing Fashion behavior.
6. Add contract and dependency tests.

## 9. Acceptance Criteria

- A module can be enabled/disabled without editing unrelated module code.
- Solution modules cannot mutate credits or call providers directly.
- Every mutation includes actor and request context.
- Existing generation behavior remains operational during migration.
- Startup fails clearly for invalid or circular module dependencies.
- Module status is enforced server-side and covered by tests.

