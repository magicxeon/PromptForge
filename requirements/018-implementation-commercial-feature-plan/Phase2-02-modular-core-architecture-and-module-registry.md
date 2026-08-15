# Phase 2-02 Modular Core Architecture and Module Registry

**Status:** Capability boundaries and React route registry implemented; commercial entitlement/module exposure pending  
**Goal:** Extend the current stable boundaries without creating a second core tree.

## 1. Business Requirement

ModelPromptForge must support independently enabled solution modules without duplicating provider, queue, billing, asset or ownership logic. The existing generator remains available as Advanced Studio while Fashion Selling becomes an installable/disableable solution module.

## 2. Design Principles

- Start as a modular monolith, not microservices.
- Separate HTTP/UI adapters, application use cases, domain rules and infrastructure.
- Core services cannot import a Fashion-specific module.
- Solution modules can depend only on published core contracts.
- Module disablement preserves data and blocks new operations safely.
- Existing routes remain compatible during staged migration.

## 3. Canonical Current Structure

```text
server/
  app/routes/                 HTTP adapters
  domain/<capability>/        application/domain entry points
  repositories/<capability>/ persistence adapters
  providers/                  AI provider adapters
  middleware/                 actor/request/performance context
  config/                     server-owned configuration

web/src/
  app/routeRegistry/          route/navigation metadata
  features/<feature>/         route orchestration and feature UI
  components/                 reusable presentation/workflow components
  lib/                        shared client infrastructure
```

Do not introduce `server/core/`, `server/modules/` or a commercial-only frontend.
Capability ownership and single workflow entry points are governed by
`requirements/009-migration-to-react/016-capability-ownership-and-single-workflow-entry-points.md`.
The remaining Phase2-02 work is a server-owned exposure/entitlement catalog
consumed by the existing React route registry, not another application shell.

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
2. Reuse `GenerationApplicationService`, Credits, Assets and provider contracts;
   do not wrap them in parallel commercial services.
3. Extend the existing React route registry with server-owned exposure and
   entitlement metadata.
4. Replace mock exposure/actor adapters during Phase2-04 while preserving route
   IDs and deep links.
5. Register the already implemented Fashion feature without forking its route,
   plan, quote or run behavior.
6. Add dependency, disablement, authorization and route-exposure tests.

## 9. Acceptance Criteria

- A module can be enabled/disabled without editing unrelated module code.
- Solution modules cannot mutate credits or call providers directly.
- Every mutation includes actor and request context.
- Existing generation behavior remains operational during migration.
- Startup fails clearly for invalid or circular module dependencies.
- Module status is enforced server-side and covered by tests.

